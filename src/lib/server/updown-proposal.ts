/**
 * UP & DOWN — AI CHAIN PROPOSALS, WITH AN OFFICER IN THE MIDDLE.
 *
 * Ali's ask, in his words: *the AI proposes the round with the link it used, so when it
 * resolves it goes back to that same source — if Claude knows where he got the info from,
 * he knows where to get it again.* This module is the "proposes" half; the source-capture
 * work in `updown-service.ts` is the "goes back to" half.
 *
 * ⛔ WHAT THIS MODULE MAY NOT DO, and the reason each line exists:
 *
 *  1. **It may not arm anything by itself.** `generate` only ever leaves a proposal in
 *     PENDING_REVIEW (or a terminal refusal state). `armProposal` is the ONLY writer of
 *     `armedChainId`, it refuses any state but APPROVED, and it is called from an officer
 *     action — never from a generation path. Guarded structurally by `test:updown-source`.
 *  2. **It may not invent an asset or a source.** The asset must already be registered,
 *     and the proposed link must pass `isSourceTrusted` for that asset's category — the
 *     operator's one allowlist, the same one the poll pipeline and the price gates use.
 *  3. **It may not put its observed price into a round.** `observedPrice` is evidence the
 *     link is readable, nothing more. An armed chain reads its own boundary through the
 *     observation ledger, because a price captured at proposal time is minutes or hours
 *     old and was chosen by the same party proposing the market.
 *  4. **It may not spend while the operator has AI off.** It calls the same
 *     `isPollGenEnabled()` switch the poll generator does — one switch, both generators —
 *     before `assertAiBudget`, because a disabled feature should not consult the meter.
 *
 * Everything else — the dual store, the metering, the audit trail, the officer queue shape
 * — is deliberately the poll pipeline's, reused rather than re-invented.
 */

import { prisma, hasDatabase } from "./prisma";
import { audit } from "./audit";
import { assertAiBudget } from "./ai-usage";
import { getAIProvider } from "./ai-provider";
import { isSourceTrusted, normalizeDomain } from "./source-registry";
import type { MarketCategory } from "./market-service";
import {
  getAsset, listChains, createChain, updateChain, setChainState, updateAsset,
  getUpDownConfig, checkMarginBps, ALLOWED_DURATIONS, resolveScheduledMarginBps,
  type Duration, type UpDownConfig,
} from "./updown-config";
import { hostMatchesDomain } from "./updown-feed";

/**
 * The margin a NEW proposal should carry — the E-32 ladder for this asset's class and the
 * requested duration, falling back to the flat product default only for a duration no rung
 * covers. Local because a proposal has an asset and a duration in hand but no chain yet, so
 * it cannot use `marginBpsForChain`.
 */
function scheduledMarginFor(
  cfg: UpDownConfig,
  asset: { category: string },
  durationMinutes: number,
): number {
  return resolveScheduledMarginBps(cfg, asset.category, durationMinutes) ?? cfg.defaultMarginBps;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type UpDownProposalState =
  | "GENERATING"
  | "VALIDATION_FAILED"
  | "FILTERED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARMED";

/**
 * Why a proposal was refused. A CLOSED set, validated server-side on reject — an officer's
 * free-text note is separate. The poll pipeline learned this the hard way: a client-supplied
 * reason string ends up in reports and cannot be counted.
 */
export type ProposalRejectReason =
  | "source_not_trusted"
  | "source_unreadable"
  | "duration_not_allowed"
  | "margin_out_of_range"
  | "duplicate_chain"
  | "framing_unclear"
  | "asset_disabled"
  | "provider_error"
  | "officer_judgement";

export const PROPOSAL_REJECT_REASONS: readonly ProposalRejectReason[] = [
  "source_not_trusted",
  "source_unreadable",
  "duration_not_allowed",
  "margin_out_of_range",
  "duplicate_chain",
  "framing_unclear",
  "asset_disabled",
  "provider_error",
  "officer_judgement",
] as const;

export type QualityIndicator = { label: string; score: number; status: "good" | "warn" | "bad" };

export type StoredProposal = {
  id: string;
  state: UpDownProposalState;
  requestAssetId: string;
  requestPrompt: string;
  durationMinutes: number;
  marginBps: number;
  sourceUrl: string;
  sourceDomain: string;
  framingEn: string;
  framingSw: string;
  framingZh: string;
  reasoning: string;
  observedPrice: number | null;
  observedQuotedAt: string | null;
  generation: unknown;
  rawResponse: string | null;
  filterReasons: ProposalRejectReason[];
  qualityIndicators: QualityIndicator[];
  overallQuality: number;
  confidence: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectReasons: ProposalRejectReason[];
  armedChainId: string | null;
  armedAt: string | null;
  armedBy: string | null;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  regenerationOf: string | null;
  regenerationCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * The SAME shape `updown-config.ts` uses (`data`, not `value`), re-declared here only to add
 * the optional `warn` this pipeline needs for "saved, but still not ready". A second result
 * shape on one subsystem would mean every caller has to remember which module it came from.
 */
export type ServiceResult<T> =
  | { ok: true; data: T; warn?: string }
  | { ok: false; error: string };

// ── Store — the same dual-store switch the rest of the subsystem uses ────────

type ProposalStore = {
  list(filter?: { state?: UpDownProposalState; assetId?: string }): Promise<StoredProposal[]>;
  get(id: string): Promise<StoredProposal | null>;
  set(p: StoredProposal): Promise<void>;
  remove(id: string): Promise<boolean>;
};

const mem = new Map<string, StoredProposal>();

const memoryStore: ProposalStore = {
  async list(filter) {
    let all = [...mem.values()];
    if (filter?.state) all = all.filter((p) => p.state === filter.state);
    if (filter?.assetId) all = all.filter((p) => p.requestAssetId === filter.assetId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) { return mem.get(id) ?? null; },
  async set(p) { mem.set(p.id, { ...p }); },
  async remove(id) { return mem.delete(id); },
};

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "object" && v !== null && "toNumber" in v
    ? (v as { toNumber(): number }).toNumber()
    : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toStored(r: any): StoredProposal {
  return {
    id: r.id,
    state: r.state,
    requestAssetId: r.requestAssetId,
    requestPrompt: r.requestPrompt ?? "",
    durationMinutes: r.durationMinutes ?? 15,
    marginBps: r.marginBps ?? 50,
    sourceUrl: r.sourceUrl ?? "",
    sourceDomain: r.sourceDomain ?? "",
    framingEn: r.framingEn ?? "",
    framingSw: r.framingSw ?? "",
    framingZh: r.framingZh ?? "",
    reasoning: r.reasoning ?? "",
    observedPrice: r.observedPrice == null ? null : num(r.observedPrice),
    observedQuotedAt: r.observedQuotedAt ? new Date(r.observedQuotedAt).toISOString() : null,
    generation: r.generation ?? null,
    rawResponse: r.rawResponse ?? null,
    filterReasons: arr<ProposalRejectReason>(r.filterReasons),
    qualityIndicators: arr<QualityIndicator>(r.qualityIndicators),
    overallQuality: r.overallQuality ?? 0,
    confidence: r.confidence ?? 0,
    reviewedBy: r.reviewedBy ?? null,
    reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null,
    reviewNote: r.reviewNote ?? null,
    rejectReasons: arr<ProposalRejectReason>(r.rejectReasons),
    armedChainId: r.armedChainId ?? null,
    armedAt: r.armedAt ? new Date(r.armedAt).toISOString() : null,
    armedBy: r.armedBy ?? null,
    tokensUsed: r.tokensUsed ?? 0,
    costUsd: num(r.costUsd),
    latencyMs: r.latencyMs ?? 0,
    regenerationOf: r.regenerationOf ?? null,
    regenerationCount: r.regenerationCount ?? 0,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

function toPrisma(p: StoredProposal): any {
  return {
    id: p.id,
    state: p.state,
    requestAssetId: p.requestAssetId,
    requestPrompt: p.requestPrompt,
    durationMinutes: p.durationMinutes,
    marginBps: p.marginBps,
    sourceUrl: p.sourceUrl,
    sourceDomain: p.sourceDomain,
    framingEn: p.framingEn,
    framingSw: p.framingSw,
    framingZh: p.framingZh,
    reasoning: p.reasoning,
    observedPrice: p.observedPrice,
    observedQuotedAt: p.observedQuotedAt ? new Date(p.observedQuotedAt) : null,
    generation: p.generation ?? undefined,
    rawResponse: p.rawResponse,
    filterReasons: p.filterReasons,
    qualityIndicators: p.qualityIndicators,
    overallQuality: p.overallQuality,
    confidence: p.confidence,
    reviewedBy: p.reviewedBy,
    reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : null,
    reviewNote: p.reviewNote,
    rejectReasons: p.rejectReasons,
    armedChainId: p.armedChainId,
    armedAt: p.armedAt ? new Date(p.armedAt) : null,
    armedBy: p.armedBy,
    tokensUsed: p.tokensUsed,
    costUsd: p.costUsd,
    latencyMs: p.latencyMs,
    regenerationOf: p.regenerationOf,
    regenerationCount: p.regenerationCount,
  };
}

/**
 * The `UpDownProposal` delegate.
 *
 * 🔴 `prisma` IS A FUNCTION (`prisma.ts` exports `prisma(): PrismaClient | null`), not a
 * client. This read used to be `(prisma as any).upDownProposal` — a property of the
 * FUNCTION OBJECT, which is `undefined` — so every call became
 * `undefined.upsert(...)` → *"Cannot read properties of undefined (reading 'upsert')"*.
 * The whole module was dead on production from the day it shipped: generation threw
 * before writing its first row, and `listProposals`/`countProposalsByState` are called
 * behind `.catch(() => [])` on the queue page, so the reads failed **silently** and the
 * page rendered "No proposals yet" — indistinguishable from an unused feature. Found only
 * when Jaykishan Kaba pressed the button on 2026-08-02 (campaign finding E-40).
 *
 * ⛔ The `as any` is what let this through: `prisma` genuinely has no `upDownProposal`
 * property, and the cast erased the one check that would have failed the build. Cast the
 * RESULT of the call, never the function. Guarded by `npm run test:prisma-delegate`.
 */
function pc(): any {
  const c = prisma();
  if (!c) throw new Error("Up & Down proposals need a database (DATABASE_URL is unset).");
  return (c as unknown as Record<string, any>).upDownProposal;
}

const prismaStore: ProposalStore = {
  async list(filter) {
    const rows = await pc().findMany({
      where: {
        ...(filter?.state ? { state: filter.state } : {}),
        ...(filter?.assetId ? { requestAssetId: filter.assetId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toStored);
  },
  async get(id) {
    const r = await pc().findUnique({ where: { id } });
    return r ? toStored(r) : null;
  },
  async set(p) {
    const data = toPrisma(p);
    await pc().upsert({ where: { id: p.id }, create: data, update: data });
  },
  async remove(id) {
    try { await pc().delete({ where: { id } }); return true; } catch { return false; }
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const store: ProposalStore = usePrisma ? prismaStore : memoryStore;

/** Test seam — the in-memory store, so a suite can run without a database. */
export function __resetProposalsForTest() {
  mem.clear();
}

function randomId(n: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listProposals(filter?: { state?: UpDownProposalState; assetId?: string }): Promise<StoredProposal[]> {
  return store.list(filter);
}

export async function getProposal(id: string): Promise<StoredProposal | null> {
  return store.get(id);
}

export async function countProposalsByState(): Promise<Record<UpDownProposalState, number>> {
  const all = await store.list();
  const out: Record<UpDownProposalState, number> = {
    GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0, PENDING_REVIEW: 0,
    APPROVED: 0, REJECTED: 0, ARMED: 0,
  };
  for (const p of all) out[p.state]++;
  return out;
}

// ── Validation — the same rules the console enforces, in one place ───────────

/**
 * Everything that can be checked without spending a token or touching a chain. Returns the
 * reasons a proposal is not fit to arm; an empty array means an officer may approve it.
 *
 * Deliberately returns ALL failures rather than the first: an officer reviewing a proposal
 * wants to know it has three problems, not to discover them one regeneration at a time.
 */
export async function validateProposal(p: StoredProposal): Promise<{
  reasons: ProposalRejectReason[];
  indicators: QualityIndicator[];
}> {
  const reasons: ProposalRejectReason[] = [];
  const indicators: QualityIndicator[] = [];

  const asset = await getAsset(p.requestAssetId);
  if (!asset) {
    return {
      reasons: ["asset_disabled"],
      indicators: [{ label: "Asset no longer exists", score: 0, status: "bad" }],
    };
  }
  if (!asset.enabled) {
    reasons.push("asset_disabled");
    indicators.push({ label: `${asset.key} is disabled`, score: 0, status: "bad" });
  } else {
    indicators.push({ label: `Asset ${asset.key} enabled`, score: 100, status: "good" });
  }

  // Duration must land on the 5-minute grid — that is what lets rounds share observations.
  if (!ALLOWED_DURATIONS.includes(p.durationMinutes as Duration)) {
    reasons.push("duration_not_allowed");
    indicators.push({ label: `${p.durationMinutes}m is not a grid duration`, score: 0, status: "bad" });
  } else {
    indicators.push({ label: `${p.durationMinutes}-minute rounds`, score: 100, status: "good" });
  }

  // The SAME margin rule the admin form uses (exported, not copied).
  const marginErr = checkMarginBps(p.marginBps);
  if (marginErr) {
    reasons.push("margin_out_of_range");
    indicators.push({ label: "Margin out of range", score: 0, status: "bad" });
  } else {
    indicators.push({ label: `Margin ${(p.marginBps / 100).toFixed(2)}%`, score: 100, status: "good" });
  }

  // The operator's ONE allowlist. An AI-chosen link that is not on it is not reviewable —
  // it is outside the world the operator said they can resolve against.
  if (!p.sourceUrl) {
    reasons.push("source_not_trusted");
    indicators.push({ label: "No source link proposed", score: 0, status: "bad" });
  } else {
    const trusted = await isSourceTrusted(p.sourceUrl, asset.category as MarketCategory);
    if (!trusted.ok) {
      reasons.push("source_not_trusted");
      indicators.push({ label: trusted.reason ?? "Source not on the allowlist", score: 0, status: "bad" });
    } else {
      indicators.push({ label: `Source trusted (${p.sourceDomain})`, score: 100, status: "good" });
    }
    // The stored domain must actually be the link's host, or the round's capture would pin
    // a domain the link does not belong to and every reading would look like a mismatch.
    if (p.sourceDomain && !hostMatchesDomain(p.sourceUrl, p.sourceDomain)) {
      reasons.push("source_not_trusted");
      indicators.push({ label: "Link host does not match its stated domain", score: 0, status: "bad" });
    }
  }

  // Readability is the whole reason this pipeline exists: most price pages render in
  // JavaScript and yield nothing usable. A proposal with no observed quote is a guess.
  const cfg = await getUpDownConfig();
  if (p.observedPrice == null || !p.observedQuotedAt) {
    reasons.push("source_unreadable");
    indicators.push({ label: "No price was actually read from the link", score: 0, status: "bad" });
  } else {
    const age = Math.abs(Date.now() - new Date(p.observedQuotedAt).getTime()) / 1000;
    if (!Number.isFinite(age)) {
      reasons.push("source_unreadable");
      indicators.push({ label: "Quote timestamp unusable", score: 0, status: "bad" });
    } else if (age > cfg.maxStalenessSeconds) {
      // NOT a rejection: a proposal is reviewed minutes after it is generated, so its
      // evidence is legitimately older than a round's 90-second window. It is a WARNING,
      // because a page that was already stale when read will not get fresher at a boundary.
      indicators.push({
        label: `Quote was ${Math.round(age)}s old when read (round window is ${cfg.maxStalenessSeconds}s)`,
        score: 40,
        status: "warn",
      });
    } else {
      indicators.push({ label: `Read a live quote, ${Math.round(age)}s old`, score: 100, status: "good" });
    }
  }

  // A chain already exists for this (asset, duration) — arming would collide with the
  // @@unique, so say so now rather than at the arm click.
  const chains = await listChains({ assetId: p.requestAssetId });
  const clash = chains.find((c) => c.durationMinutes === p.durationMinutes);
  if (clash && clash.state === "RUNNING") {
    reasons.push("duplicate_chain");
    indicators.push({ label: `${asset.key} ${p.durationMinutes}m is already running`, score: 0, status: "bad" });
  }

  if (!p.framingEn.trim() || !p.framingSw.trim()) {
    reasons.push("framing_unclear");
    indicators.push({ label: "Framing missing English or Swahili", score: 0, status: "bad" });
  }

  return { reasons, indicators };
}

function scoreOf(indicators: QualityIndicator[]): number {
  if (indicators.length === 0) return 0;
  return Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
}

// ── Generate ────────────────────────────────────────────────────────────────

export async function generateProposal(opts: {
  assetId: string;
  durationMinutes: Duration;
  prompt?: string;
  actorId: string;
  regenerationOf?: string;
}): Promise<ServiceResult<StoredProposal>> {
  // ⛔ THE PAUSE SWITCH — the same one the poll generator obeys, checked here rather than
  // only in the action, because a gate on one of two doors is not a gate. Before the budget
  // gate: a feature the operator has switched off should not consult the credit meter.
  const { isPollGenEnabled } = await import("./ai-controls");
  if (!(await isPollGenEnabled())) {
    return { ok: false, error: "AI generation is disabled (AI toolkit). Turn it back on to propose." };
  }

  const budget = await assertAiBudget("updown");
  if (!budget.ok) {
    return {
      ok: false,
      error: `AI credit limit reached ($${budget.spentUsd.toFixed(2)} of $${budget.limitUsd.toFixed(2)} this cycle). ` +
        `Raise the limit or start a new cycle under Admin → AI usage.`,
    };
  }

  const asset = await getAsset(opts.assetId);
  if (!asset) return { ok: false, error: "Asset not found. Register it under Admin → Up & Down first." };
  if (!asset.enabled) {
    return { ok: false, error: `${asset.key} is disabled. Enable it before proposing a chain — a disabled asset cannot emit rounds.` };
  }
  if (!ALLOWED_DURATIONS.includes(opts.durationMinutes)) {
    return { ok: false, error: `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes.` };
  }

  const cfg = await getUpDownConfig();
  const parent = opts.regenerationOf ? await store.get(opts.regenerationOf) : null;
  const now = new Date().toISOString();

  const p: StoredProposal = {
    id: `udprop_${randomId(12)}`,
    state: "GENERATING",
    requestAssetId: asset.id,
    requestPrompt: opts.prompt ?? "",
    durationMinutes: opts.durationMinutes,
    // E-32 — the scheduled margin for THIS asset class and duration, never the flat
    // product default. A proposal that arrives pre-filled with 0.50% is a proposal an
    // officer approves into a chain that voids every round.
    marginBps: scheduledMarginFor(cfg, asset, opts.durationMinutes),
    sourceUrl: "",
    sourceDomain: "",
    framingEn: "",
    framingSw: "",
    framingZh: "",
    reasoning: "",
    observedPrice: null,
    observedQuotedAt: null,
    generation: null,
    rawResponse: null,
    filterReasons: [],
    qualityIndicators: [],
    overallQuality: 0,
    confidence: 0,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    rejectReasons: [],
    armedChainId: null,
    armedAt: null,
    armedBy: null,
    tokensUsed: 0,
    costUsd: 0,
    latencyMs: 0,
    regenerationOf: opts.regenerationOf ?? null,
    regenerationCount: parent ? parent.regenerationCount + 1 : 0,
    createdAt: now,
    updatedAt: now,
  };
  await store.set(p);

  audit({
    category: "ADMIN",
    action: "updown_proposal.generate_started",
    actorId: opts.actorId,
    targetType: "UpDownProposal",
    targetId: p.id,
    payload: { assetKey: asset.key, durationMinutes: opts.durationMinutes, prompt: opts.prompt, regenerationOf: opts.regenerationOf },
  });

  const provider = getAIProvider();
  if (!provider.proposeUpDown) {
    p.state = "VALIDATION_FAILED";
    p.filterReasons = ["provider_error"];
    p.rawResponse = "The configured AI provider cannot produce Up & Down proposals.";
    p.updatedAt = new Date().toISOString();
    await store.set(p);
    return { ok: false, error: p.rawResponse };
  }

  let resp;
  try {
    resp = await provider.proposeUpDown({
      assetKey: asset.key,
      assetSymbol: asset.symbol,
      category: asset.category,
      approvedDomain: asset.sourceDomain,
      currentSourceUrl: asset.priceSourceUrl,
      durationMinutes: opts.durationMinutes,
      decimals: asset.decimals,
      // What the AI is told to treat as the house default — the scheduled value, so its
      // own suggestion is anchored to something that can actually resolve (E-32).
      defaultMarginBps: scheduledMarginFor(cfg, asset, opts.durationMinutes),
      maxStalenessSeconds: cfg.maxStalenessSeconds,
      prompt: opts.prompt,
    });
  } catch (err) {
    p.state = "VALIDATION_FAILED";
    p.filterReasons = ["provider_error"];
    p.rawResponse = String(err).slice(0, 4000);
    p.updatedAt = new Date().toISOString();
    await store.set(p);
    audit({
      category: "ADMIN", action: "updown_proposal.provider_error", actorId: opts.actorId,
      targetType: "UpDownProposal", targetId: p.id, payload: { error: String(err).slice(0, 500) },
    });
    return { ok: false, error: `The AI provider failed: ${String(err).slice(0, 200)}` };
  }

  p.tokensUsed = resp.tokensUsed;
  p.costUsd = resp.costUsd;
  p.latencyMs = resp.latencyMs;
  p.rawResponse = (resp.rawResponse ?? resp.error ?? null)?.slice(0, 8000) ?? null;

  if (!resp.ok || !resp.proposal) {
    p.state = "VALIDATION_FAILED";
    p.filterReasons = ["provider_error"];
    p.updatedAt = new Date().toISOString();
    await store.set(p);
    audit({
      category: "ADMIN", action: "updown_proposal.generation_failed", actorId: opts.actorId,
      targetType: "UpDownProposal", targetId: p.id, payload: { error: resp.error?.slice(0, 500) },
    });
    return { ok: false, error: resp.error ?? "The AI returned no usable proposal." };
  }

  const g = resp.proposal;
  p.generation = g;
  p.sourceUrl = String(g.sourceUrl ?? "").trim();
  p.sourceDomain = p.sourceUrl ? normalizeDomain(p.sourceUrl) : "";
  p.framingEn = String(g.framingEn ?? "").trim().slice(0, 300);
  p.framingSw = String(g.framingSw ?? "").trim().slice(0, 300);
  p.framingZh = String(g.framingZh ?? "").trim().slice(0, 300);
  p.reasoning = String(g.reasoning ?? "").trim().slice(0, 4000);
  p.confidence = Number.isFinite(g.confidence) ? Math.max(0, Math.min(100, Math.round(g.confidence))) : 0;
  const proposedMargin = Number(g.marginBps);
  p.marginBps = Number.isInteger(proposedMargin) ? proposedMargin : scheduledMarginFor(cfg, asset, opts.durationMinutes);
  const price = Number(g.observedPrice);
  p.observedPrice = Number.isFinite(price) && price > 0 ? price : null;
  const quoted = g.observedQuotedAt ? new Date(String(g.observedQuotedAt)) : null;
  p.observedQuotedAt = quoted && Number.isFinite(quoted.getTime()) ? quoted.toISOString() : null;

  const { reasons, indicators } = await validateProposal(p);
  p.qualityIndicators = indicators;
  p.overallQuality = scoreOf(indicators);
  p.filterReasons = reasons;
  // FILTERED, not PENDING_REVIEW, when it already fails a rule the console would refuse —
  // so the officer queue is a queue of REVIEWABLE proposals, not a slush pile.
  p.state = reasons.length > 0 ? "FILTERED" : "PENDING_REVIEW";
  p.updatedAt = new Date().toISOString();
  await store.set(p);

  audit({
    category: "ADMIN",
    action: reasons.length > 0 ? "updown_proposal.filtered" : "updown_proposal.pending_review",
    actorId: opts.actorId,
    targetType: "UpDownProposal",
    targetId: p.id,
    payload: { assetKey: asset.key, reasons, quality: p.overallQuality, sourceUrl: p.sourceUrl, costUsd: p.costUsd },
  });

  return { ok: true, data: p, warn: reasons.length > 0 ? `Filtered: ${reasons.join(", ")}` : undefined };
}

// ── Officer decisions ───────────────────────────────────────────────────────

/**
 * An officer edits the proposal before approving. The AI's suggestion is a draft, not a
 * commitment — and the officer is the party accountable for what goes live.
 *
 * Re-validates after the edit rather than trusting the edit: an officer can just as easily
 * paste a link that is not on the allowlist.
 */
export async function editProposal(id: string, patch: {
  durationMinutes?: number;
  marginBps?: number;
  sourceUrl?: string;
  framingEn?: string;
  framingSw?: string;
  framingZh?: string;
}, officerId: string): Promise<ServiceResult<StoredProposal>> {
  const p = await store.get(id);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.state === "ARMED") {
    return { ok: false, error: "This proposal has already armed a chain. Edit the chain itself under Admin → Up & Down." };
  }
  if (p.state === "REJECTED") return { ok: false, error: "This proposal was rejected. Regenerate instead of editing it." };

  const before = { durationMinutes: p.durationMinutes, marginBps: p.marginBps, sourceUrl: p.sourceUrl };

  if (patch.durationMinutes !== undefined) p.durationMinutes = patch.durationMinutes;
  if (patch.marginBps !== undefined) p.marginBps = patch.marginBps;
  if (patch.sourceUrl !== undefined) {
    p.sourceUrl = patch.sourceUrl.trim();
    p.sourceDomain = p.sourceUrl ? normalizeDomain(p.sourceUrl) : "";
    // An edited link invalidates the AI's readability evidence — it read the OLD page. Say
    // so by clearing it, so validation reports "no price was read" rather than carrying a
    // reassuring number that belongs to a different URL.
    if (p.sourceUrl !== before.sourceUrl) {
      p.observedPrice = null;
      p.observedQuotedAt = null;
    }
  }
  if (patch.framingEn !== undefined) p.framingEn = patch.framingEn.trim().slice(0, 300);
  if (patch.framingSw !== undefined) p.framingSw = patch.framingSw.trim().slice(0, 300);
  if (patch.framingZh !== undefined) p.framingZh = patch.framingZh.trim().slice(0, 300);

  const { reasons, indicators } = await validateProposal(p);
  p.filterReasons = reasons;
  p.qualityIndicators = indicators;
  p.overallQuality = scoreOf(indicators);
  if (p.state === "FILTERED" && reasons.length === 0) p.state = "PENDING_REVIEW";
  if (p.state === "PENDING_REVIEW" && reasons.length > 0) p.state = "FILTERED";
  // An APPROVED proposal edited back into a failing state must lose its approval, or the
  // arm gate would pass on an approval granted for different terms.
  if (p.state === "APPROVED" && reasons.length > 0) {
    p.state = "FILTERED";
    p.reviewedBy = null;
    p.reviewedAt = null;
  }
  p.updatedAt = new Date().toISOString();
  await store.set(p);

  audit({
    category: "ADMIN", action: "updown_proposal.edited", actorId: officerId,
    targetType: "UpDownProposal", targetId: p.id,
    payload: { before, after: { durationMinutes: p.durationMinutes, marginBps: p.marginBps, sourceUrl: p.sourceUrl }, reasons },
  });

  return {
    ok: true,
    data: p,
    warn: reasons.length > 0 ? `Still not ready: ${reasons.join(", ")}` : undefined,
  };
}

export async function approveProposal(id: string, opts: { officerId: string; note?: string }): Promise<ServiceResult<StoredProposal>> {
  const p = await store.get(id);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.state === "ARMED") return { ok: false, error: "This proposal has already armed a chain." };
  if (p.state !== "PENDING_REVIEW" && p.state !== "FILTERED") {
    return { ok: false, error: `A proposal in ${p.state} cannot be approved.` };
  }

  // DEFENCE IN DEPTH, copied from the poll pipeline for the same reason: the UI does not
  // offer Approve on a filtered proposal, but the action is reachable by a crafted POST, and
  // approving one would arm a chain the console itself would have refused to create.
  const { reasons } = await validateProposal(p);
  if (reasons.length > 0) {
    return {
      ok: false,
      error: `Cannot approve — this proposal still fails: ${reasons.join(", ")}. Edit it, or regenerate.`,
    };
  }

  p.state = "APPROVED";
  p.reviewedBy = opts.officerId;
  p.reviewedAt = new Date().toISOString();
  p.reviewNote = opts.note?.trim() || null;
  p.filterReasons = [];
  p.updatedAt = p.reviewedAt;
  await store.set(p);

  audit({
    category: "ADMIN", action: "updown_proposal.approved", actorId: opts.officerId,
    targetType: "UpDownProposal", targetId: p.id,
    payload: { assetId: p.requestAssetId, durationMinutes: p.durationMinutes, marginBps: p.marginBps, sourceUrl: p.sourceUrl, note: p.reviewNote },
  });

  return { ok: true, data: p };
}

export async function rejectProposal(id: string, opts: {
  officerId: string;
  reasons: ProposalRejectReason[];
  note?: string;
}): Promise<ServiceResult<StoredProposal>> {
  const p = await store.get(id);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.state === "ARMED") return { ok: false, error: "This proposal has already armed a chain. Stop the chain instead." };

  // Validate against the CLOSED set server-side. A client-supplied reason string would end
  // up in reports and could never be counted.
  const clean = opts.reasons.filter((r): r is ProposalRejectReason => PROPOSAL_REJECT_REASONS.includes(r));
  if (clean.length === 0) {
    return { ok: false, error: "Choose at least one reason so the rejection can be counted." };
  }

  p.state = "REJECTED";
  p.rejectReasons = clean;
  p.reviewedBy = opts.officerId;
  p.reviewedAt = new Date().toISOString();
  p.reviewNote = opts.note?.trim() || null;
  p.updatedAt = p.reviewedAt;
  await store.set(p);

  audit({
    category: "ADMIN", action: "updown_proposal.rejected", actorId: opts.officerId,
    targetType: "UpDownProposal", targetId: p.id,
    payload: { reasons: clean, note: p.reviewNote },
  });

  return { ok: true, data: p };
}

// ── Arm — the terminal act, and the only writer of armedChainId ─────────────

/**
 * Turn an APPROVED proposal into a running chain.
 *
 * ⛔ EVERY WRITE HERE GOES THROUGH THE EXISTING SERVICE FUNCTIONS — `updateAsset`,
 * `createChain`/`updateChain`, `setChainState`. Not one field is written directly. That is
 * deliberate: those functions carry the refusals the console depends on (the source lock,
 * the trusted-source re-check, the duration grid rule, the margin range, the running-chain
 * guard), and an arm path that wrote its own rows would be a second door into the same
 * money surface with none of them.
 *
 * In particular the SOURCE LOCK applies: if the proposal moves the asset's source and any
 * round on that asset is still unresolved, `updateAsset` refuses — and this returns that
 * refusal verbatim, because it names the count, the money at risk and the way out.
 */
export async function armProposal(id: string, opts: { officerId: string }): Promise<ServiceResult<{ proposal: StoredProposal; chainId: string }>> {
  const p = await store.get(id);
  if (!p) return { ok: false, error: "Proposal not found." };

  // ⛔ THE OFFICER GATE. The only state that may arm. A generation path cannot reach this
  // function at all (structurally asserted), and even if it could, this refuses.
  if (p.state !== "APPROVED") {
    return {
      ok: false,
      error: p.state === "ARMED"
        ? "This proposal has already armed a chain."
        : `Only an APPROVED proposal can arm a chain — this one is ${p.state}. An officer must review it first.`,
    };
  }

  const asset = await getAsset(p.requestAssetId);
  if (!asset) return { ok: false, error: "The asset no longer exists." };

  // Re-validate at the moment of arming. An approval can be minutes old, and in that time a
  // chain may have started, the asset may have been disabled, or the source may have been
  // removed from the allowlist. Approving is not a licence to arm a stale proposal.
  const { reasons } = await validateProposal(p);
  if (reasons.length > 0) {
    return { ok: false, error: `Cannot arm — this is no longer valid: ${reasons.join(", ")}.` };
  }

  // 1 · Point the asset at the link the AI verified, if it differs. Through updateAsset, so
  //     the source lock and the trusted-source check both apply.
  if (p.sourceUrl && p.sourceUrl !== asset.priceSourceUrl) {
    const moved = await updateAsset(asset.id, { priceSourceUrl: p.sourceUrl }, opts.officerId);
    if (!moved.ok) return { ok: false, error: moved.error };
  }

  // 2 · Create or update the chain, carrying the approved margin.
  const chains = await listChains({ assetId: asset.id });
  const existing = chains.find((c) => c.durationMinutes === p.durationMinutes);
  let chainId: string;
  if (existing) {
    const upd = await updateChain(existing.id, { marginBps: p.marginBps }, opts.officerId);
    if (!upd.ok) return { ok: false, error: upd.error };
    chainId = existing.id;
  } else {
    const created = await createChain(
      { assetId: asset.id, durationMinutes: p.durationMinutes as Duration, marginBps: p.marginBps },
      opts.officerId,
    );
    if (!created.ok) return { ok: false, error: created.error };
    chainId = created.data.id;
  }

  // 3 · Start it — the same call the console's Start button makes.
  const started = await setChainState(chainId, "RUNNING", opts.officerId);
  if (!started.ok) {
    // The chain exists but is not running. Say exactly that: half-done is worse to hide
    // than to report, because the operator can finish it from the console in one click.
    return {
      ok: false,
      error: `The chain was configured but could not start: ${started.error} — start it from Admin → Up & Down.`,
    };
  }

  p.state = "ARMED";
  p.armedChainId = chainId;
  p.armedAt = new Date().toISOString();
  p.armedBy = opts.officerId;
  p.updatedAt = p.armedAt;
  await store.set(p);

  audit({
    category: "ADMIN", action: "updown_proposal.armed", actorId: opts.officerId,
    targetType: "UpDownProposal", targetId: p.id,
    payload: {
      chainId, assetKey: asset.key, durationMinutes: p.durationMinutes,
      marginBps: p.marginBps, sourceUrl: p.sourceUrl,
    },
  });

  return { ok: true, data: { proposal: p, chainId } };
}

export async function deleteProposal(id: string, officerId: string): Promise<ServiceResult<true>> {
  const p = await store.get(id);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.state === "ARMED") {
    return { ok: false, error: "An armed proposal is the record of why a live chain exists. Stop the chain instead of deleting its proposal." };
  }
  const gone = await store.remove(id);
  if (!gone) return { ok: false, error: "Could not delete the proposal." };
  audit({
    category: "ADMIN", action: "updown_proposal.deleted", actorId: officerId,
    targetType: "UpDownProposal", targetId: id, payload: { state: p.state },
  });
  return { ok: true, data: true };
}
