/**
 * AI poll generation service — validation, filtering, storage, and admin workflow.
 *
 * This service sits between the AI provider and the admin UI. It:
 *   1. Calls the provider to generate a poll candidate
 *   2. Validates + sanitises the response
 *   3. Applies quality filters (duplicates, policy, length, confidence)
 *   4. Stores the result with full audit trail
 *   5. Exposes CRUD for admin review/edit/approve/reject/regenerate
 *
 * State machine:
 *   GENERATING → VALIDATION_FAILED | FILTERED | PENDING_REVIEW
 *   PENDING_REVIEW → APPROVED | REJECTED | EDITING
 *   EDITING → PENDING_REVIEW
 *   APPROVED → PUBLISHED
 *   REJECTED (terminal)
 *   FILTERED (terminal — admin can still view reason)
 *   VALIDATION_FAILED (terminal — admin can view raw response)
 */

import { randomId } from "./crypto";
import { audit } from "./audit";
import { getAIProvider, type AIPollGeneration, type AIProviderResponse } from "./ai-provider";
import { getAIPollConfig } from "./ai-poll-config";
import { listMarkets } from "./market-service";
import { listSources, seedDefaultSources } from "./source-registry";
import { prisma, hasDatabase } from "./prisma";

/* ─── Types ─── */

export type AIPollState =
  | "GENERATING"
  | "VALIDATION_FAILED"
  | "FILTERED"
  | "PENDING_REVIEW"
  | "EDITING"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export type FilterReason =
  | "empty_title"
  | "empty_criterion"
  | "invalid_date"
  | "past_date"
  | "resolution_too_soon"
  | "resolution_too_far"
  | "no_options"
  | "duplicate_options"
  | "too_few_options"
  | "invalid_category"
  | "banned_category"
  | "low_confidence"
  | "title_too_long"
  | "criterion_too_long"
  | "xss_detected"
  | "null_bytes"
  | "duplicate_poll"
  | "no_sources"
  | "invalid_source_url"
  | "malformed_response"
  | "provider_error";

export type QualityIndicator = {
  label: string;
  score: number;        // 0..100
  status: "good" | "warning" | "bad";
};

export type StoredAIPoll = {
  id: string;
  state: AIPollState;
  // Generation request
  requestCategory: string;
  requestPrompt: string;
  // AI response (raw + parsed)
  generation: AIPollGeneration | null;
  rawResponse: string | null;
  // Validation / filter results
  filterReasons: FilterReason[];
  qualityIndicators: QualityIndicator[];
  overallQuality: number;  // 0..100
  // Admin-editable fields (initially copied from generation)
  titleEn: string;
  titleSw: string;
  category: string;
  resolutionCriterion: string;
  resolutionAt: string;
  options: Array<{ label: string; descriptionEn?: string; descriptionSw?: string }>;
  sources: Array<{ url: string; publisher: string }>;
  confidence: number;
  reasoning: string;
  // Admin review
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectReasons: FilterReason[];
  // Publication
  publishedMarketId: string | null;
  publishedCandidateId: string | null;
  // Cost / perf
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  // Regeneration tracking
  regenerationOf: string | null;   // parent poll ID if this is a regeneration
  regenerationCount: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
};

/* ─── In-memory store ─── */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_POLLS: Map<string, StoredAIPoll> | undefined;
}
const polls: Map<string, StoredAIPoll> =
  globalThis.__50PICK_AI_POLLS ?? (globalThis.__50PICK_AI_POLLS = new Map());

// ---------------------------------------------------------------------------
// DAL interface + implementations
// ---------------------------------------------------------------------------

interface AIPollStore {
  get(id: string): Promise<StoredAIPoll | null>;
  set(poll: StoredAIPoll): Promise<void>;
  delete(id: string): Promise<boolean>;
  values(): Promise<StoredAIPoll[]>;
  size(): Promise<number>;
}

const memoryStore: AIPollStore = {
  async get(id) { return polls.get(id) ?? null; },
  async set(poll) { polls.set(poll.id, poll); },
  async delete(id) { return polls.delete(id); },
  async values() { return Array.from(polls.values()); },
  async size() { return polls.size; },
};

function pc() {
  const c = prisma();
  if (!c) throw new Error("ai-poll-generation: DATABASE_URL required");
  return c;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAIPoll(r: any): StoredAIPoll {
  return {
    id: r.id,
    state: r.state as AIPollState,
    requestCategory: r.requestCategory,
    requestPrompt: r.requestPrompt,
    generation: r.generation as AIPollGeneration | null,
    rawResponse: r.rawResponse ?? null,
    filterReasons: (r.filterReasons ?? []) as FilterReason[],
    qualityIndicators: (r.qualityIndicators ?? []) as QualityIndicator[],
    overallQuality: r.overallQuality,
    titleEn: r.titleEn,
    titleSw: r.titleSw,
    category: r.category,
    resolutionCriterion: r.resolutionCriterion,
    resolutionAt: r.resolutionAt instanceof Date ? r.resolutionAt.toISOString() : String(r.resolutionAt ?? ""),
    options: (r.options ?? []) as StoredAIPoll["options"],
    sources: (r.sources ?? []) as StoredAIPoll["sources"],
    confidence: r.confidence,
    reasoning: r.reasoning,
    reviewedBy: r.reviewedBy ?? null,
    reviewedAt: r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : (r.reviewedAt ?? null),
    reviewNote: r.reviewNote ?? null,
    rejectReasons: (r.rejectReasons ?? []) as FilterReason[],
    publishedMarketId: r.publishedMarketId ?? null,
    publishedCandidateId: r.publishedCandidateId ?? null,
    tokensUsed: r.tokensUsed,
    costUsd: Number(r.costUsd),
    latencyMs: r.latencyMs,
    regenerationOf: r.regenerationOf ?? null,
    regenerationCount: r.regenerationCount,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPrismaData(p: StoredAIPoll): any {
  return {
    id: p.id,
    state: p.state as "GENERATING" | "VALIDATION_FAILED" | "FILTERED" | "PENDING_REVIEW" | "EDITING" | "APPROVED" | "REJECTED" | "PUBLISHED",
    requestCategory: p.requestCategory,
    requestPrompt: p.requestPrompt,
    generation: p.generation ?? undefined,
    rawResponse: p.rawResponse,
    filterReasons: p.filterReasons,
    qualityIndicators: p.qualityIndicators,
    overallQuality: p.overallQuality,
    titleEn: p.titleEn,
    titleSw: p.titleSw,
    category: p.category,
    resolutionCriterion: p.resolutionCriterion,
    resolutionAt: p.resolutionAt ? new Date(p.resolutionAt) : new Date(0),
    options: p.options,
    sources: p.sources,
    confidence: p.confidence,
    reasoning: p.reasoning,
    reviewedBy: p.reviewedBy,
    reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : null,
    reviewNote: p.reviewNote,
    rejectReasons: p.rejectReasons,
    publishedMarketId: p.publishedMarketId,
    publishedCandidateId: p.publishedCandidateId,
    tokensUsed: p.tokensUsed,
    costUsd: p.costUsd,
    latencyMs: p.latencyMs,
    regenerationOf: p.regenerationOf,
    regenerationCount: p.regenerationCount,
    createdAt: new Date(p.createdAt),
  };
}

const prismaStore: AIPollStore = {
  async get(id) {
    const r = await pc().aIPoll.findUnique({ where: { id } });
    return r ? toStoredAIPoll(r) : null;
  },
  async set(poll) {
    const data = toPrismaData(poll);
    const { id: _id, ...updateData } = data;
    await pc().aIPoll.upsert({
      where: { id: poll.id },
      create: data,
      update: updateData,
    });
  },
  async delete(id) {
    try {
      await pc().aIPoll.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
  async values() {
    const rows = await pc().aIPoll.findMany();
    return rows.map(toStoredAIPoll);
  },
  async size() {
    return pc().aIPoll.count();
  },
};

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const store: AIPollStore = usePrisma ? prismaStore : memoryStore;

/* ─── Constants ─── */

const VALID_CATEGORIES = new Set(["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "other"]);
const BANNED_CATEGORIES = new Set(["politics", "religion", "adult", "violence"]);
const MAX_TITLE_LENGTH = 200;
const MAX_CRITERION_LENGTH = 1000;
const CONFIDENCE_AUTO_APPROVE_HINT = 85; // shows green in UI, admin still must approve

/* ─── Sanitisation ─── */

function sanitise(s: unknown): string {
  // Coerce non-strings \u2014 a hostile/broken model response can put numbers,
  // objects, arrays or null where a string belongs; we must never throw.
  const str = typeof s === "string" ? s : s == null ? "" : String(s);
  return str
    .replace(/\0/g, "")                              // null bytes
    .replace(/[\u200B-\u200D\uFEFF]/g, "")           // zero-width chars
    .replace(/<[^>]*>/g, "")                          // strip HTML tags
    .replace(/javascript:/gi, "")                     // strip JS protocol
    .replace(/[\r\n\t]+/g, " ")                       // normalise whitespace
    .trim();
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/** Fingerprint a title for duplicate detection: lower-case, strip everything
 *  but letters/digits/spaces, collapse runs of whitespace. So "Will Simba SC
 *  win?" and "will simba sc win" collapse to the same key. */
function normaliseTitle(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Is this URL's host on the operator's enabled trusted-source registry (any
 *  category)? Soft accuracy signal only — the officer curates the registry. */
async function isOnTrustedRegistry(url: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  await seedDefaultSources();
  return (await listSources({ enabledOnly: true })).some(
    (src) => host === src.domain || host.endsWith(`.${src.domain}`),
  );
}

/* ─── Validation + filtering ─── */

type ValidationResult = {
  passes: boolean;
  reasons: FilterReason[];
  quality: QualityIndicator[];
  overallQuality: number;
  sanitised: AIPollGeneration | null;
};

async function validateAndFilter(gen: AIPollGeneration | null | undefined, rawResponse: string | null): Promise<ValidationResult> {
  const reasons: FilterReason[] = [];
  const quality: QualityIndicator[] = [];

  if (!gen) {
    return { passes: false, reasons: ["malformed_response"], quality: [], overallQuality: 0, sanitised: null };
  }

  // Sanitise all text fields
  const sanitised: AIPollGeneration = {
    titleEn: sanitise(gen.titleEn ?? ""),
    titleSw: gen.titleSw ? sanitise(gen.titleSw) : undefined,
    category: sanitise(gen.category ?? "").toLowerCase(),
    resolutionCriterion: sanitise(gen.resolutionCriterion ?? ""),
    resolutionAt: typeof gen.resolutionAt === "string" ? gen.resolutionAt : "",
    // Array fields may arrive as non-arrays, or hold strings/null instead of
    // objects — coerce defensively so a malformed shape filters, never throws.
    options: (Array.isArray(gen.options) ? gen.options : []).map((o) => {
      const opt = (o ?? {}) as { label?: unknown; descriptionEn?: unknown; descriptionSw?: unknown };
      return {
        label: sanitise(typeof o === "string" ? o : opt.label),
        descriptionEn: opt.descriptionEn != null ? sanitise(opt.descriptionEn) : undefined,
        descriptionSw: opt.descriptionSw != null ? sanitise(opt.descriptionSw) : undefined,
      };
    }),
    sources: (Array.isArray(gen.sources) ? gen.sources : []).map((s) => {
      const src = (s ?? {}) as { url?: unknown; publisher?: unknown };
      return {
        url: sanitise(typeof s === "string" ? s : src.url),
        publisher: sanitise(src.publisher),
      };
    }),
    confidence: typeof gen.confidence === "number" ? Math.max(0, Math.min(100, Math.round(gen.confidence))) : 0,
    reasoning: sanitise(gen.reasoning ?? ""),
  };

  // Check for null bytes / XSS in the ORIGINAL string values. We walk the raw
  // field values rather than JSON.stringify(gen) because JSON escapes control
  // chars ( → the 6-char text ""), which would hide a real null
  // byte from a /\0/ test. Walking values catches it in titles, options, and
  // sources alike.
  const rawValues: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === "string") rawValues.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(gen);
  const joined = rawValues.join("\n");
  if (joined.includes("\0")) reasons.push("null_bytes");
  if (
    /<script/i.test(joined) ||
    /javascript:/i.test(joined) ||
    /on(error|load|click|mouseover|mouseenter|focus|submit|change|toggle)\s*=/i.test(joined)
  ) {
    reasons.push("xss_detected");
  }

  // Title validation
  if (!sanitised.titleEn || sanitised.titleEn.length < 5) {
    reasons.push("empty_title");
    quality.push({ label: "Title", score: 0, status: "bad" });
  } else if (sanitised.titleEn.length > MAX_TITLE_LENGTH) {
    reasons.push("title_too_long");
    quality.push({ label: "Title length", score: 20, status: "bad" });
  } else {
    quality.push({ label: "Title", score: 95, status: "good" });
  }

  // Resolution criterion
  if (!sanitised.resolutionCriterion || sanitised.resolutionCriterion.length < 10) {
    reasons.push("empty_criterion");
    quality.push({ label: "Resolution criterion", score: 0, status: "bad" });
  } else if (sanitised.resolutionCriterion.length > MAX_CRITERION_LENGTH) {
    reasons.push("criterion_too_long");
    quality.push({ label: "Criterion length", score: 30, status: "warning" });
  } else {
    quality.push({ label: "Resolution criterion", score: 90, status: "good" });
  }

  // Date validation — must be a valid date, in the future, and inside the
  // operator-configured lead-time window (not resolving in an hour, not in
  // three years). This is the core "never an expired poll" guarantee.
  const cfg = getAIPollConfig();
  if (!isValidDate(sanitised.resolutionAt)) {
    reasons.push("invalid_date");
    quality.push({ label: "Resolution date", score: 0, status: "bad" });
  } else {
    const resTime = new Date(sanitised.resolutionAt).getTime();
    const now = Date.now();
    const minTime = now + cfg.minLeadTimeHours * 3_600_000;
    const maxTime = now + cfg.maxLeadTimeDays * 86_400_000;
    if (resTime < now) {
      reasons.push("past_date");
      quality.push({ label: "Resolution date (in the past)", score: 0, status: "bad" });
    } else if (resTime < minTime) {
      reasons.push("resolution_too_soon");
      quality.push({ label: `Resolution date (under ${cfg.minLeadTimeHours}h away)`, score: 15, status: "bad" });
    } else if (resTime > maxTime) {
      reasons.push("resolution_too_far");
      quality.push({ label: `Resolution date (over ${cfg.maxLeadTimeDays}d away)`, score: 35, status: "warning" });
    } else {
      quality.push({ label: "Resolution date", score: 100, status: "good" });
    }
  }

  // Options validation
  const validOptions = sanitised.options.filter((o) => o.label.length > 0);
  const uniqueLabels = new Set(validOptions.map((o) => o.label.toUpperCase()));
  if (validOptions.length === 0) {
    reasons.push("no_options");
    quality.push({ label: "Options", score: 0, status: "bad" });
  } else if (validOptions.length < 2) {
    reasons.push("too_few_options");
    quality.push({ label: "Options", score: 20, status: "bad" });
  } else if (uniqueLabels.size < validOptions.length) {
    reasons.push("duplicate_options");
    quality.push({ label: "Options (duplicates detected)", score: 40, status: "warning" });
    // Deduplicate
    const seen = new Set<string>();
    sanitised.options = validOptions.filter((o) => {
      const key = o.label.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else {
    sanitised.options = validOptions;
    quality.push({ label: "Options", score: 100, status: "good" });
  }

  // Category validation
  if (BANNED_CATEGORIES.has(sanitised.category)) {
    reasons.push("banned_category");
    quality.push({ label: "Category (policy violation)", score: 0, status: "bad" });
  } else if (!VALID_CATEGORIES.has(sanitised.category)) {
    reasons.push("invalid_category");
    quality.push({ label: "Category (unknown)", score: 30, status: "warning" });
  } else {
    quality.push({ label: "Category", score: 100, status: "good" });
  }

  // Source validation
  const validSources = sanitised.sources.filter((s) => isValidUrl(s.url) && s.publisher.length > 0);
  if (validSources.length === 0) {
    reasons.push("no_sources");
    quality.push({ label: "Sources", score: 0, status: "bad" });
  } else {
    sanitised.sources = validSources;
    quality.push({ label: "Sources", score: Math.min(100, validSources.length * 50), status: validSources.length >= 2 ? "good" : "warning" });
    // Trusted-source signal — soft (officer curates the registry). A source on
    // the operator's enabled trusted-source list is a strong accuracy signal;
    // an unknown domain is a flag to scrutinise, not an automatic reject.
    const trustedFlags = await Promise.all(validSources.map((s) => isOnTrustedRegistry(s.url)));
    const trustedCount = trustedFlags.filter(Boolean).length;
    quality.push({
      label: trustedCount > 0 ? "Trusted source" : "Source not on trusted registry",
      score: trustedCount > 0 ? 100 : 45,
      status: trustedCount > 0 ? "good" : "warning",
    });
  }

  // Invalid source URLs in original
  const badUrls = (Array.isArray(gen.sources) ? gen.sources : []).filter(
    (s) => !isValidUrl(typeof s === "string" ? s : (s as { url?: unknown })?.url as string),
  );
  if (badUrls.length > 0) reasons.push("invalid_source_url");

  // Confidence — threshold is operator-controlled (stricter = fewer, cleaner polls).
  if (sanitised.confidence < cfg.minConfidence) {
    reasons.push("low_confidence");
    quality.push({ label: "AI confidence", score: sanitised.confidence, status: "bad" });
  } else {
    quality.push({
      label: "AI confidence",
      score: sanitised.confidence,
      status: sanitised.confidence >= CONFIDENCE_AUTO_APPROVE_HINT ? "good" : "warning",
    });
  }

  // Duplicate check — normalised (case / punctuation / whitespace insensitive)
  // against both prior polls (still in play) AND already-live markets, so the
  // board never carries two near-identical questions.
  const fingerprint = normaliseTitle(sanitised.titleEn);
  if (fingerprint) {
    const allPolls = await store.values();
    const dupPoll = allPolls.some(
      (existing) =>
        existing.state !== "VALIDATION_FAILED" &&
        existing.state !== "FILTERED" &&
        existing.state !== "REJECTED" &&
        normaliseTitle(existing.titleEn) === fingerprint,
    );
    const dupMarket = !dupPoll && (await listMarkets()).some((m) => normaliseTitle(m.titleEn) === fingerprint);
    if (dupPoll || dupMarket) {
      reasons.push("duplicate_poll");
      quality.push({
        label: dupMarket ? "Uniqueness (duplicates a live market)" : "Uniqueness (duplicate detected)",
        score: 0,
        status: "bad",
      });
    }
  }

  // Calculate overall quality. Hard fails can NEVER reach review regardless
  // of how the other indicators score — these are integrity / policy / "this
  // poll is unbettable" violations. Expired or too-soon dates are hard fails:
  // a poll that has already resolved or resolves in minutes must never list.
  const HARD_FAIL_REASONS: FilterReason[] = [
    "empty_title",
    "empty_criterion",
    "malformed_response",
    "banned_category",
    "null_bytes",
    "xss_detected",
    "invalid_date",
    "past_date",
    "resolution_too_soon",
    "resolution_too_far",
    "no_options",
    "too_few_options",
    "no_sources",
    "duplicate_poll",
    "low_confidence",
    "title_too_long",
    "criterion_too_long",
  ];
  const hardFails = reasons.filter((r) => HARD_FAIL_REASONS.includes(r));
  const overallQuality = hardFails.length > 0
    ? 0
    : quality.length > 0
      ? Math.round(quality.reduce((sum, q) => sum + q.score, 0) / quality.length)
      : 0;

  // Determine pass/fail
  const passes = hardFails.length === 0 && overallQuality >= 40;

  return { passes, reasons, quality, overallQuality, sanitised };
}

/* ─── Public API ─── */

export type AIPollFilter = {
  state?: AIPollState;
  category?: string;
  search?: string;
  dateFrom?: string;   // ISO date string
  dateTo?: string;     // ISO date string
};

export async function listAIPolls(filter?: AIPollFilter): Promise<StoredAIPoll[]> {
  const q = filter?.search?.trim().toLowerCase();
  const all = await store.values();
  return all
    .filter((p) => {
      if (filter?.state && p.state !== filter.state) return false;
      if (filter?.category && p.category !== filter.category) return false;
      if (filter?.dateFrom && p.createdAt < filter.dateFrom) return false;
      if (filter?.dateTo && p.createdAt > filter.dateTo) return false;
      if (q) {
        const hay = [p.titleEn, p.titleSw, p.category, p.id, p.resolutionCriterion, p.reasoning]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countAIPollsTotal(): Promise<number> {
  return store.size();
}

export async function getAIPoll(id: string): Promise<StoredAIPoll | null> {
  return store.get(id);
}

export async function countAIPollsByState(): Promise<Record<AIPollState, number>> {
  const out: Record<AIPollState, number> = {
    GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0,
    PENDING_REVIEW: 0, EDITING: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  const all = await store.values();
  for (const p of all) out[p.state]++;
  return out;
}

export async function aiPollSpend(): Promise<{ totalTokens: number; totalUsd: number; totalGenerations: number }> {
  let tokens = 0, usd = 0, gens = 0;
  const all = await store.values();
  for (const p of all) {
    tokens += p.tokensUsed;
    usd += p.costUsd;
    gens++;
  }
  return { totalTokens: tokens, totalUsd: Math.round(usd * 100) / 100, totalGenerations: gens };
}

/** Generate a new AI poll. Returns immediately with GENERATING state, then updates in-place. */
/** Titles the model should NOT re-propose: in-play polls (not terminal) + live
 *  markets — the exact set the duplicate filter rejects against. Feeding these
 *  into the prompt prevents paying to generate a near-duplicate that would just
 *  be filtered. Best-effort; capped in the prompt builder. */
async function gatherExistingTitles(): Promise<string[]> {
  const titles: string[] = [];
  try {
    for (const p of await store.values()) {
      if (p.titleEn && p.state !== "VALIDATION_FAILED" && p.state !== "FILTERED" && p.state !== "REJECTED") titles.push(p.titleEn);
    }
    for (const m of await listMarkets()) if (m.titleEn) titles.push(m.titleEn);
  } catch { /* steering is best-effort — never block generation */ }
  return Array.from(new Set(titles)).slice(-80);
}

export async function generateAIPoll(opts: {
  category: string;
  prompt?: string;
  actorId: string;
  regenerationOf?: string;
  /** Pre-gathered avoid-list (batch path passes one shared list so it isn't
   *  re-queried per poll). Falls back to gathering when omitted. */
  avoidTitles?: string[];
}): Promise<StoredAIPoll> {
  const now = new Date().toISOString();
  const parentPoll = opts.regenerationOf ? await store.get(opts.regenerationOf) : null;

  const poll: StoredAIPoll = {
    id: `aipoll_${randomId(12)}`,
    state: "GENERATING",
    requestCategory: opts.category,
    requestPrompt: opts.prompt ?? "",
    generation: null,
    rawResponse: null,
    filterReasons: [],
    qualityIndicators: [],
    overallQuality: 0,
    titleEn: "",
    titleSw: "",
    category: opts.category,
    resolutionCriterion: "",
    resolutionAt: "",
    options: [],
    sources: [],
    confidence: 0,
    reasoning: "",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    rejectReasons: [],
    publishedMarketId: null,
    publishedCandidateId: null,
    tokensUsed: 0,
    costUsd: 0,
    latencyMs: 0,
    regenerationOf: opts.regenerationOf ?? null,
    regenerationCount: parentPoll ? parentPoll.regenerationCount + 1 : 0,
    createdAt: now,
    updatedAt: now,
  };
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.generate_started",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { category: opts.category, prompt: opts.prompt, regenerationOf: opts.regenerationOf },
  });

  // Call the AI provider — steer away from existing questions so we don't pay
  // to generate a duplicate that the filter would reject post-hoc.
  const avoidTitles = opts.avoidTitles ?? (await gatherExistingTitles());
  const provider = getAIProvider();
  let response: AIProviderResponse;
  try {
    response = await provider.generate({ category: opts.category, prompt: opts.prompt, avoidTitles });
  } catch (err) {
    poll.state = "VALIDATION_FAILED";
    poll.filterReasons = ["provider_error"];
    poll.rawResponse = String(err);
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);


    audit({
      category: "ADMIN",
      action: "aipoll.provider_error",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { error: String(err) },
    });
    return poll;
  }

  poll.tokensUsed = response.tokensUsed;
  poll.costUsd = response.costUsd;
  poll.latencyMs = response.latencyMs;
  poll.rawResponse = response.rawResponse ?? response.error ?? null;

  if (!response.ok || !response.generation) {
    poll.state = "VALIDATION_FAILED";
    poll.filterReasons = ["provider_error"];
    poll.rawResponse = response.error ?? response.rawResponse ?? "Unknown provider error";
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);


    audit({
      category: "ADMIN",
      action: "aipoll.generation_failed",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { error: response.error },
    });
    return poll;
  }

  // Store raw generation
  poll.generation = response.generation;

  // Validate + filter. Belt-and-braces: validation already coerces every
  // hostile shape, but if anything unforeseen throws we degrade to
  // VALIDATION_FAILED rather than letting the server action crash.
  let validation: ValidationResult;
  try {
    validation = await validateAndFilter(response.generation, response.rawResponse ?? null);
  } catch (err) {
    poll.state = "VALIDATION_FAILED";
    poll.filterReasons = ["malformed_response"];
    poll.rawResponse = `Validation error: ${String(err)}`;
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);

    audit({
      category: "ADMIN",
      action: "aipoll.generation_failed",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { error: String(err) },
    });
    return poll;
  }
  poll.filterReasons = validation.reasons;
  poll.qualityIndicators = validation.quality;
  poll.overallQuality = validation.overallQuality;

  if (!validation.passes || !validation.sanitised) {
    poll.state = "FILTERED";
    // Still copy whatever we got for admin review
    if (validation.sanitised) {
      copyGenerationToPoll(poll, validation.sanitised);
    }
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);


    audit({
      category: "ADMIN",
      action: "aipoll.filtered",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { reasons: validation.reasons, quality: validation.overallQuality },
    });
    return poll;
  }

  // Passes validation — move to PENDING_REVIEW
  poll.state = "PENDING_REVIEW";
  copyGenerationToPoll(poll, validation.sanitised);
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.pending_review",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { quality: validation.overallQuality, confidence: poll.confidence },
  });
  return poll;
}

function copyGenerationToPoll(poll: StoredAIPoll, gen: AIPollGeneration) {
  poll.titleEn = gen.titleEn;
  poll.titleSw = gen.titleSw ?? "";
  poll.category = gen.category;
  poll.resolutionCriterion = gen.resolutionCriterion;
  poll.resolutionAt = gen.resolutionAt;
  poll.options = gen.options;
  poll.sources = gen.sources;
  poll.confidence = gen.confidence;
  poll.reasoning = gen.reasoning;
}

const BATCH_CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech"];

/**
 * Generate a batch of polls in one operator action. Count is clamped to the
 * configured `maxBatchPerRun` ceiling (runaway / accidental-100k-burn guard).
 * Runs sequentially so in-batch duplicates are caught (each poll sees the ones
 * generated before it) and the API isn't hammered in parallel.
 */
export async function generateAIPollBatch(opts: {
  count: number;
  categories?: string[];
  prompt?: string;
  actorId: string;
}): Promise<{ generated: StoredAIPoll[]; summary: Record<AIPollState, number> }> {
  const cfg = getAIPollConfig();
  const requested = Number.isFinite(opts.count) ? Math.floor(opts.count) : 1;
  const n = Math.max(1, Math.min(cfg.maxBatchPerRun, requested));
  const cats = opts.categories && opts.categories.length > 0 ? opts.categories : BATCH_CATEGORIES;

  audit({
    category: "ADMIN",
    action: "aipoll.batch_started",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: "batch",
    payload: { requested, clampedTo: n, categories: cats },
  });

  const generated: StoredAIPoll[] = [];
  const summary: Record<AIPollState, number> = {
    GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0,
    PENDING_REVIEW: 0, EDITING: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  // Gather the avoid-list ONCE for the whole batch (not per poll), and grow it
  // as the batch produces keepers so later polls don't duplicate earlier ones
  // in the same run.
  const avoidTitles = await gatherExistingTitles();
  for (let i = 0; i < n; i++) {
    const category = cats[i % cats.length];
    const poll = await generateAIPoll({ category, prompt: opts.prompt, actorId: opts.actorId, avoidTitles });
    generated.push(poll);
    summary[poll.state]++;
    if (poll.titleEn && (poll.state === "PENDING_REVIEW" || poll.state === "EDITING")) avoidTitles.push(poll.titleEn);
  }
  return { generated, summary };
}

/** Progress toward today's poll target — drives the admin KPI + "batch to
 *  target" button. "Today" is UTC-day based on createdAt. */
export async function aiPollDailyProgress(): Promise<{
  target: number;
  createdToday: number;
  reachedReviewToday: number;
  publishedToday: number;
  remaining: number;
}> {
  const cfg = getAIPollConfig();
  const today = new Date().toISOString().slice(0, 10);
  let createdToday = 0;
  let reachedReviewToday = 0;
  let publishedToday = 0;
  const all = await store.values();
  for (const p of all) {
    if (p.createdAt.slice(0, 10) !== today) continue;
    createdToday++;
    if (["PENDING_REVIEW", "EDITING", "APPROVED", "PUBLISHED"].includes(p.state)) reachedReviewToday++;
    if (p.state === "PUBLISHED") publishedToday++;
  }
  return {
    target: cfg.dailyTarget,
    createdToday,
    reachedReviewToday,
    publishedToday,
    remaining: Math.max(0, cfg.dailyTarget - publishedToday),
  };
}

/** Admin approves a PENDING_REVIEW poll. */
export async function approveAIPoll(id: string, opts: { officerId: string; note?: string }): Promise<StoredAIPoll | null> {
  const poll = await store.get(id);
  if (!poll || poll.state !== "PENDING_REVIEW") return null;

  poll.state = "APPROVED";
  poll.reviewedBy = opts.officerId;
  poll.reviewedAt = new Date().toISOString();
  poll.reviewNote = opts.note ?? null;
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.approved",
    actorId: opts.officerId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { note: opts.note },
  });
  return poll;
}

/** Admin rejects a poll (from PENDING_REVIEW or EDITING). */
export async function rejectAIPoll(id: string, opts: { officerId: string; reasons: FilterReason[]; note?: string }): Promise<StoredAIPoll | null> {
  const poll = await store.get(id);
  if (!poll || (poll.state !== "PENDING_REVIEW" && poll.state !== "EDITING")) return null;

  poll.state = "REJECTED";
  poll.reviewedBy = opts.officerId;
  poll.reviewedAt = new Date().toISOString();
  poll.reviewNote = opts.note ?? null;
  poll.rejectReasons = opts.reasons;
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.rejected",
    actorId: opts.officerId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { reasons: opts.reasons, note: opts.note },
  });
  return poll;
}

/** Admin edits a PENDING_REVIEW poll — moves to EDITING then back to PENDING_REVIEW. */
export async function editAIPoll(id: string, opts: {
  officerId: string;
  titleEn?: string;
  titleSw?: string;
  category?: string;
  resolutionCriterion?: string;
  resolutionAt?: string;
  options?: Array<{ label: string; descriptionEn?: string; descriptionSw?: string }>;
}): Promise<StoredAIPoll | null> {
  const poll = await store.get(id);
  if (!poll || (poll.state !== "PENDING_REVIEW" && poll.state !== "EDITING")) return null;

  if (opts.titleEn !== undefined) poll.titleEn = sanitise(opts.titleEn);
  if (opts.titleSw !== undefined) poll.titleSw = sanitise(opts.titleSw);
  if (opts.category !== undefined) poll.category = sanitise(opts.category).toLowerCase();
  if (opts.resolutionCriterion !== undefined) poll.resolutionCriterion = sanitise(opts.resolutionCriterion);
  if (opts.resolutionAt !== undefined) poll.resolutionAt = opts.resolutionAt;
  if (opts.options !== undefined) {
    poll.options = opts.options.map((o) => ({
      label: sanitise(o.label),
      descriptionEn: o.descriptionEn ? sanitise(o.descriptionEn) : undefined,
      descriptionSw: o.descriptionSw ? sanitise(o.descriptionSw) : undefined,
    }));
  }

  // Re-validate after edit
  const revalidation = await validateAndFilter({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || undefined,
    category: poll.category,
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    options: poll.options,
    sources: poll.sources,
    confidence: poll.confidence,
    reasoning: poll.reasoning,
  }, null);

  poll.qualityIndicators = revalidation.quality;
  poll.overallQuality = revalidation.overallQuality;
  poll.filterReasons = revalidation.reasons;
  poll.state = "PENDING_REVIEW";
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.edited",
    actorId: opts.officerId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { fields: Object.keys(opts).filter((k) => k !== "officerId") },
  });
  return poll;
}

/** Mark an APPROVED poll as PUBLISHED — links to a market candidate. */
export async function markAIPollPublished(id: string, opts: { candidateId: string; marketId: string; officerId: string }): Promise<StoredAIPoll | null> {
  const poll = await store.get(id);
  if (!poll || poll.state !== "APPROVED") return null;

  poll.state = "PUBLISHED";
  poll.publishedCandidateId = opts.candidateId;
  poll.publishedMarketId = opts.marketId;
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: "aipoll.published",
    actorId: opts.officerId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { candidateId: opts.candidateId, marketId: opts.marketId },
  });
  return poll;
}

/** Delete a poll (only FILTERED / VALIDATION_FAILED / REJECTED). */
export async function deleteAIPoll(id: string, officerId: string): Promise<boolean> {
  const poll = await store.get(id);
  if (!poll) return false;
  if (!["FILTERED", "VALIDATION_FAILED", "REJECTED", "PENDING_REVIEW", "EDITING", "APPROVED", "PUBLISHED"].includes(poll.state)) return false;

  await store.delete(id);

  audit({
    category: "ADMIN",
    action: "aipoll.deleted",
    actorId: officerId,
    targetType: "AIPoll",
    targetId: id,
    payload: {},
  });
  return true;
}

/**
 * Bulk-delete all polls that are not currently in-flight (GENERATING).
 *
 * PUBLISHED polls are returned separately so the caller can void their live
 * markets via emergencyVoidMarket before deleting them. All other deletable
 * states are removed immediately.
 *
 * Returns:
 *   deleted        — count of non-PUBLISHED polls deleted
 *   skipped        — count of GENERATING polls left untouched
 *   publishedPolls — list of PUBLISHED polls (marketId + pollId) the caller
 *                    must handle with emergencyVoidMarket first
 */
export async function deleteAllAIPolls(officerId: string): Promise<{
  deleted: number;
  skipped: number;
  publishedPolls: Array<{ pollId: string; marketId: string }>;
}> {
  const all = await store.values();
  let deleted = 0;
  let skipped = 0;
  const publishedPolls: Array<{ pollId: string; marketId: string }> = [];

  for (const poll of all) {
    if (poll.state === "GENERATING") {
      skipped++;
      continue;
    }
    if (poll.state === "PUBLISHED") {
      publishedPolls.push({ pollId: poll.id, marketId: poll.publishedMarketId ?? "" });
      continue;
    }
    await store.delete(poll.id);
    audit({
      category: "ADMIN",
      action: "aipoll.bulk_deleted",
      actorId: officerId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { state: poll.state },
    });
    deleted++;
  }
  return { deleted, skipped, publishedPolls };
}

/** Seed fixture polls for testing — covers all states and edge cases. */
export async function seedAIPollFixtures(): Promise<StoredAIPoll[]> {
  const now = new Date().toISOString();
  const seeded: StoredAIPoll[] = [];

  const fixtures: Array<Partial<StoredAIPoll> & { id: string; state: AIPollState }> = [
    {
      id: `aipoll_fixture_pending1`,
      state: "PENDING_REVIEW",
      requestCategory: "sports",
      titleEn: "Will Simba SC win the Tanzanian Premier League 2026?",
      titleSw: "Je, Simba SC itashinda Ligi Kuu ya Tanzania 2026?",
      category: "sports",
      resolutionCriterion: "Official TFF announcement of 2026 TPL champion.",
      resolutionAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Simba SC wins" },
        { label: "NO", descriptionEn: "Another team wins" },
      ],
      sources: [{ url: "https://www.tff.or.tz/", publisher: "TFF Official" }],
      confidence: 88,
      reasoning: "High-profile domestic league question with clear binary outcome.",
      overallQuality: 92,
      qualityIndicators: [
        { label: "Title", score: 95, status: "good" },
        { label: "Resolution criterion", score: 90, status: "good" },
        { label: "AI confidence", score: 88, status: "good" },
      ],
    },
    {
      id: `aipoll_fixture_pending2`,
      state: "PENDING_REVIEW",
      requestCategory: "crypto",
      titleEn: "Will Bitcoin exceed $150,000 by end of August 2026?",
      titleSw: "Je, bei ya Bitcoin itazidi $150,000 Agosti 2026?",
      category: "crypto",
      resolutionCriterion: "CoinGecko BTC/USD price at 23:59 UTC on August 31, 2026.",
      resolutionAt: new Date(Date.now() + 90 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "BTC > $150K" },
        { label: "NO", descriptionEn: "BTC <= $150K" },
      ],
      sources: [{ url: "https://www.coingecko.com/en/coins/bitcoin", publisher: "CoinGecko" }],
      confidence: 85,
      reasoning: "Clear price threshold with widely-accepted data source.",
      overallQuality: 89,
      qualityIndicators: [
        { label: "Title", score: 95, status: "good" },
        { label: "AI confidence", score: 85, status: "good" },
      ],
    },
    {
      id: `aipoll_fixture_approved`,
      state: "APPROVED",
      requestCategory: "weather",
      titleEn: "Will Dar es Salaam receive over 200mm rainfall in July 2026?",
      titleSw: "Je, Dar itapokea mvua zaidi ya 200mm Julai 2026?",
      category: "weather",
      resolutionCriterion: "TMA official monthly rainfall report for Dar es Salaam, July 2026.",
      resolutionAt: new Date(Date.now() + 60 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Over 200mm" },
        { label: "NO", descriptionEn: "200mm or less" },
      ],
      sources: [{ url: "https://www.meteo.go.tz/", publisher: "TMA" }],
      confidence: 76,
      reasoning: "Weather prediction with official meteorological authority.",
      overallQuality: 82,
      reviewedBy: "fixture_officer",
      reviewedAt: now,
      reviewNote: "Good question, approved for publication.",
    },
    {
      id: `aipoll_fixture_filtered`,
      state: "FILTERED",
      requestCategory: "culture",
      titleEn: "",
      category: "culture",
      resolutionCriterion: "",
      resolutionAt: "",
      filterReasons: ["empty_title", "empty_criterion", "invalid_date"],
      overallQuality: 0,
      reasoning: "Model returned an empty response.",
      rawResponse: "{}",
    },
    {
      id: `aipoll_fixture_rejected`,
      state: "REJECTED",
      requestCategory: "macro",
      titleEn: "Will the president resign?",
      category: "politics",
      resolutionCriterion: "Official announcement.",
      resolutionAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      options: [{ label: "YES" }, { label: "NO" }],
      sources: [],
      confidence: 90,
      filterReasons: ["banned_category"],
      rejectReasons: ["banned_category"],
      overallQuality: 0,
      reviewedBy: "fixture_officer",
      reviewedAt: now,
      reviewNote: "Politics banned under GBT license.",
    },
    {
      id: `aipoll_fixture_valfail`,
      state: "VALIDATION_FAILED",
      requestCategory: "sports",
      titleEn: "{{UNTERMINATED TEMPLATE",
      category: "???",
      filterReasons: ["malformed_response", "xss_detected"],
      overallQuality: 0,
      rawResponse: '{"error": "partial parse"}',
    },
  ];

  for (const f of fixtures) {
    const existing = await store.get(f.id);
    if (existing) continue;
    const poll: StoredAIPoll = {
      id: f.id,
      state: f.state,
      requestCategory: f.requestCategory ?? "",
      requestPrompt: f.requestPrompt ?? "",
      generation: null,
      rawResponse: f.rawResponse ?? null,
      filterReasons: f.filterReasons ?? [],
      qualityIndicators: f.qualityIndicators ?? [],
      overallQuality: f.overallQuality ?? 0,
      titleEn: f.titleEn ?? "",
      titleSw: f.titleSw ?? "",
      category: f.category ?? "",
      resolutionCriterion: f.resolutionCriterion ?? "",
      resolutionAt: f.resolutionAt ?? "",
      options: f.options ?? [],
      sources: f.sources ?? [],
      confidence: f.confidence ?? 0,
      reasoning: f.reasoning ?? "",
      reviewedBy: f.reviewedBy ?? null,
      reviewedAt: f.reviewedAt ?? null,
      reviewNote: f.reviewNote ?? null,
      rejectReasons: f.rejectReasons ?? [],
      publishedMarketId: null,
      publishedCandidateId: null,
      tokensUsed: Math.floor(Math.random() * 3000) + 500,
      costUsd: Math.round(Math.random() * 5) / 100,
      latencyMs: Math.floor(Math.random() * 3000) + 500,
      regenerationOf: null,
      regenerationCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await store.set(poll);

    seeded.push(poll);
  }
  return seeded;
}
