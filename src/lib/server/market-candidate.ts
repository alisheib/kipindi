/**
 * Market-candidate pipeline — the AI-validated market generator.
 *
 * Architecture (per the system diagram):
 *   News article → Layer 1 extraction → Layer 2 filter → Layer 3
 *   cross-verify → Layer 4 confidence score → human approval → publish.
 *
 * This module defines the schema + DAL store + state machine.
 * The actual Claude-API calls live in `market-candidate-ai.ts` so this
 * stays unit-testable without network access. An admin officer is the
 * final authority — no candidate becomes a live market without a human
 * signing off, even if the AI confidence is 100. That's the production
 * standard: AI accelerates, never decides.
 */

import { randomId } from "./crypto";
import { audit } from "./audit";
import { prisma, hasDatabase } from "./prisma";

export type CandidateState =
  | "EXTRACTED"      // Layer 1 done — title, outcome, dates parsed
  | "FILTERED_OUT"   // Layer 2 hard-rejected (politics, ambiguity, etc.)
  | "VERIFYING"      // Layer 3 in flight — web search + cross-ref
  | "SCORED"         // Layer 4 confidence assigned
  | "PENDING_REVIEW" // Awaiting human officer approval
  | "APPROVED"       // Officer signed off — ready to publish as a Market
  | "REJECTED"       // Officer rejected
  | "PUBLISHED";     // Created as a live Market

export type RejectReason =
  | "politics"
  | "ambiguous_outcome"
  | "no_official_source"
  | "duplicate"
  | "past_resolution"
  | "outside_jurisdiction"
  | "low_confidence"
  | "officer_decision";

export type CandidateCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure";

export type Source = {
  url: string;
  publisher: string;
  publishedAt?: string;
  retrievedAt: string;
};

export type Candidate = {
  id: string;
  state: CandidateState;
  category: CandidateCategory;
  proposedTitleEn: string;
  proposedTitleSw?: string;
  resolutionCriterion: string;
  resolutionAt: string;
  sources: Source[];               // primary + cross-verification sources
  confidence: number;              // 0..100
  rejectReason?: RejectReason;
  rejectNote?: string;
  // Audit trail of layer decisions (small)
  trace: Array<{ layer: 1 | 2 | 3 | 4; outcome: string; at: string }>;
  // Officer review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  // Publication link
  publishedMarketId?: string;
  // Cost tracking
  tokensSpent: number;             // sum of input + output tokens
  costUsd: number;                 // running USD estimate
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Globals — same Map as before, accessed through the DAL
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CANDIDATES: Map<string, Candidate> | undefined;
}
const candidates: Map<string, Candidate> =
  globalThis.__50PICK_CANDIDATES ?? (globalThis.__50PICK_CANDIDATES = new Map());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCandidate(r: any): Candidate {
  return {
    id: r.id,
    state: r.state as CandidateState,
    category: r.category as CandidateCategory,
    proposedTitleEn: r.proposedTitleEn,
    proposedTitleSw: r.proposedTitleSw ?? undefined,
    resolutionCriterion: r.resolutionCriterion,
    resolutionAt: iso(r.resolutionAt)!,
    sources: (r.sources ?? []) as Source[],
    confidence: r.confidence,
    rejectReason: (r.rejectReason as RejectReason) ?? undefined,
    rejectNote: r.rejectNote ?? undefined,
    trace: (r.trace ?? []) as Candidate["trace"],
    reviewedBy: r.reviewedBy ?? undefined,
    reviewedAt: iso(r.reviewedAt) ?? undefined,
    reviewNote: r.reviewNote ?? undefined,
    publishedMarketId: r.publishedMarketId ?? undefined,
    tokensSpent: r.tokensSpent,
    costUsd: num(r.costUsd),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

// ---------------------------------------------------------------------------
// CandidateStore interface
// ---------------------------------------------------------------------------

export interface CandidateStore {
  get(id: string): Promise<Candidate | null>;
  set(c: Candidate): Promise<void>;
  delete(id: string): Promise<boolean>;
  values(): Promise<Candidate[]>;
  size(): Promise<number>;
}

// ---------------------------------------------------------------------------
// Memory implementation (current behavior, sync but wrapped in Promise)
// ---------------------------------------------------------------------------

const memoryCandidates: CandidateStore = {
  async get(id) { return candidates.get(id) ?? null; },
  async set(c) { candidates.set(c.id, c); },
  async delete(id) { return candidates.delete(id); },
  async values() { return Array.from(candidates.values()); },
  async size() { return candidates.size; },
};

// ---------------------------------------------------------------------------
// Prisma implementation
// ---------------------------------------------------------------------------

function pc() {
  const c = prisma();
  if (!c) throw new Error("market-candidate: DATABASE_URL required");
  return c;
}

const prismaCandidates: CandidateStore = {
  async get(id) {
    const r = await pc().marketCandidate.findUnique({ where: { id } });
    return r ? toCandidate(r) : null;
  },
  async set(c) {
    await pc().marketCandidate.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        state: c.state,
        category: c.category,
        proposedTitleEn: c.proposedTitleEn,
        proposedTitleSw: c.proposedTitleSw ?? null,
        resolutionCriterion: c.resolutionCriterion,
        resolutionAt: new Date(c.resolutionAt),
        sources: c.sources as unknown as import("@prisma/client").Prisma.JsonArray,
        confidence: c.confidence,
        rejectReason: c.rejectReason ?? null,
        rejectNote: c.rejectNote ?? null,
        trace: c.trace as unknown as import("@prisma/client").Prisma.JsonArray,
        reviewedBy: c.reviewedBy ?? null,
        reviewedAt: c.reviewedAt ? new Date(c.reviewedAt) : null,
        reviewNote: c.reviewNote ?? null,
        publishedMarketId: c.publishedMarketId ?? null,
        tokensSpent: c.tokensSpent,
        costUsd: c.costUsd,
        createdAt: new Date(c.createdAt),
      },
      update: {
        state: c.state,
        category: c.category,
        proposedTitleEn: c.proposedTitleEn,
        proposedTitleSw: c.proposedTitleSw ?? null,
        resolutionCriterion: c.resolutionCriterion,
        resolutionAt: new Date(c.resolutionAt),
        sources: c.sources as unknown as import("@prisma/client").Prisma.JsonArray,
        confidence: c.confidence,
        rejectReason: c.rejectReason ?? null,
        rejectNote: c.rejectNote ?? null,
        trace: c.trace as unknown as import("@prisma/client").Prisma.JsonArray,
        reviewedBy: c.reviewedBy ?? null,
        reviewedAt: c.reviewedAt ? new Date(c.reviewedAt) : null,
        reviewNote: c.reviewNote ?? null,
        publishedMarketId: c.publishedMarketId ?? null,
        tokensSpent: c.tokensSpent,
        costUsd: c.costUsd,
      },
    });
  },
  async delete(id) {
    try {
      await pc().marketCandidate.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
  async values() {
    const rows = await pc().marketCandidate.findMany();
    return rows.map(toCandidate);
  },
  async size() {
    return await pc().marketCandidate.count();
  },
};

// ---------------------------------------------------------------------------
// Feature-flagged switch
// ---------------------------------------------------------------------------

const usePrisma = process.env.USE_PRISMA_DAL === "true" && hasDatabase();
export const candidateStore: CandidateStore = usePrisma ? prismaCandidates : memoryCandidates;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIDENCE_PUBLISH_THRESHOLD = 75;

export type CandidateFilter = {
  state?: CandidateState;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function listCandidates(filter?: CandidateFilter): Promise<Candidate[]> {
  const q = filter?.search?.trim().toLowerCase();
  const all = await candidateStore.values();
  return all
    .filter((c) => {
      if (filter?.state && c.state !== filter.state) return false;
      if (filter?.category && c.category !== filter.category) return false;
      if (filter?.dateFrom && c.createdAt < filter.dateFrom) return false;
      if (filter?.dateTo && c.createdAt > filter.dateTo) return false;
      if (q) {
        const hay = [c.proposedTitleEn, c.proposedTitleSw, c.category, c.id, c.resolutionCriterion]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countCandidatesTotal(): Promise<number> {
  return candidateStore.size();
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  return candidateStore.get(id);
}

export async function countByState(): Promise<Record<CandidateState, number>> {
  const out: Record<CandidateState, number> = {
    EXTRACTED: 0, FILTERED_OUT: 0, VERIFYING: 0, SCORED: 0,
    PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  const all = await candidateStore.values();
  for (const c of all) out[c.state]++;
  return out;
}

export async function recordSpend(): Promise<{ dailyTokens: number; dailyUsd: number; runCount: number }> {
  const cutoff = Date.now() - 24 * 3600_000;
  let tokens = 0, usd = 0, runs = 0;
  const all = await candidateStore.values();
  for (const c of all) {
    if (Date.parse(c.createdAt) >= cutoff) {
      tokens += c.tokensSpent;
      usd += c.costUsd;
      runs++;
    }
  }
  return { dailyTokens: tokens, dailyUsd: Math.round(usd * 100) / 100, runCount: runs };
}

/** Insert a fresh candidate at the EXTRACTED state (Layer 1 completed). */
export async function ingestCandidate(input: {
  category: CandidateCategory;
  proposedTitleEn: string;
  proposedTitleSw?: string;
  resolutionCriterion: string;
  resolutionAt: string;
  sources: Source[];
  tokensSpent?: number;
  costUsd?: number;
  actorId?: string;
}): Promise<Candidate> {
  const now = new Date().toISOString();
  const c: Candidate = {
    id: `cand_${randomId(12)}`,
    state: "EXTRACTED",
    category: input.category,
    proposedTitleEn: input.proposedTitleEn,
    proposedTitleSw: input.proposedTitleSw,
    resolutionCriterion: input.resolutionCriterion,
    resolutionAt: input.resolutionAt,
    sources: input.sources,
    confidence: 0,
    trace: [{ layer: 1, outcome: "extracted", at: now }],
    tokensSpent: input.tokensSpent ?? 0,
    costUsd: input.costUsd ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  await candidateStore.set(c);

  audit({
    category: "ADMIN", action: "candidate.extracted",
    actorId: input.actorId ?? "system_ai",
    targetType: "Candidate", targetId: c.id,
    payload: { category: c.category, sources: c.sources.length },
  });
  return c;
}

/** Layer 2 — strict, deterministic filtering. Hard rejects with a reason. */
export async function filterCandidate(id: string, opts: { passes: boolean; reason?: RejectReason; note?: string }): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c) return null;
  const now = new Date().toISOString();
  if (!opts.passes) {
    c.state = "FILTERED_OUT";
    c.rejectReason = opts.reason;
    c.rejectNote = opts.note;
    c.trace.push({ layer: 2, outcome: `rejected:${opts.reason ?? "unspecified"}`, at: now });
  } else {
    c.state = "VERIFYING";
    c.trace.push({ layer: 2, outcome: "passes", at: now });
  }
  c.updatedAt = now;
  await candidateStore.set(c);

  audit({
    category: "ADMIN",
    action: opts.passes ? "candidate.filter_pass" : "candidate.filter_reject",
    actorId: "system_ai", targetType: "Candidate", targetId: c.id,
    payload: { reason: opts.reason, note: opts.note },
  });
  return c;
}

/** Layer 3 — cross-verification result. Adds sources, sets state to SCORED. */
export async function attachVerification(id: string, opts: { confirmingSources: Source[]; tokensSpent: number; costUsd: number }): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c) return null;
  const now = new Date().toISOString();
  c.sources = [...c.sources, ...opts.confirmingSources];
  c.tokensSpent += opts.tokensSpent;
  c.costUsd += opts.costUsd;
  c.state = "SCORED";
  c.trace.push({ layer: 3, outcome: `verified:${opts.confirmingSources.length}`, at: now });
  c.updatedAt = now;
  await candidateStore.set(c);

  return c;
}

/** Layer 4 — assign confidence. Routes to PENDING_REVIEW or FILTERED_OUT. */
export async function scoreCandidate(id: string, opts: { confidence: number; tokensSpent: number; costUsd: number; rubric: Record<string, number> }): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c) return null;
  const now = new Date().toISOString();
  c.confidence = Math.max(0, Math.min(100, Math.round(opts.confidence)));
  c.tokensSpent += opts.tokensSpent;
  c.costUsd += opts.costUsd;
  c.updatedAt = now;
  if (c.confidence < CONFIDENCE_PUBLISH_THRESHOLD) {
    c.state = "FILTERED_OUT";
    c.rejectReason = "low_confidence";
    c.rejectNote = `Confidence ${c.confidence} below threshold ${CONFIDENCE_PUBLISH_THRESHOLD}`;
    c.trace.push({ layer: 4, outcome: `low_confidence:${c.confidence}`, at: now });
  } else {
    c.state = "PENDING_REVIEW";
    c.trace.push({ layer: 4, outcome: `scored:${c.confidence}:${JSON.stringify(opts.rubric)}`, at: now });
  }
  await candidateStore.set(c);

  return c;
}

/** Human officer approves a SCORED / PENDING_REVIEW candidate. */
export async function approveCandidate(id: string, opts: { officerId: string; note?: string }): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c) return null;
  if (c.state !== "PENDING_REVIEW") return null;
  const now = new Date().toISOString();
  c.state = "APPROVED";
  c.reviewedBy = opts.officerId;
  c.reviewedAt = now;
  c.reviewNote = opts.note;
  c.updatedAt = now;
  await candidateStore.set(c);

  audit({
    category: "ADMIN", action: "candidate.approved",
    actorId: opts.officerId, targetType: "Candidate", targetId: c.id,
    payload: { confidence: c.confidence, sources: c.sources.length },
  });
  return c;
}

/** Human officer rejects (any non-terminal state). */
export async function rejectCandidate(id: string, opts: { officerId: string; reason: RejectReason; note?: string }): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c) return null;
  if (c.state === "PUBLISHED" || c.state === "REJECTED") return null;
  const now = new Date().toISOString();
  c.state = "REJECTED";
  c.reviewedBy = opts.officerId;
  c.reviewedAt = now;
  c.reviewNote = opts.note;
  c.rejectReason = opts.reason;
  c.rejectNote = opts.note;
  c.updatedAt = now;
  await candidateStore.set(c);

  audit({
    category: "ADMIN", action: "candidate.rejected",
    actorId: opts.officerId, targetType: "Candidate", targetId: c.id,
    payload: { reason: opts.reason, note: opts.note },
  });
  return c;
}

/** Mark APPROVED candidate as PUBLISHED — called after createMarket succeeds. */
export async function markPublished(id: string, marketId: string, officerId: string): Promise<Candidate | null> {
  const c = await candidateStore.get(id);
  if (!c || c.state !== "APPROVED") return null;
  const now = new Date().toISOString();
  c.state = "PUBLISHED";
  c.publishedMarketId = marketId;
  c.updatedAt = now;
  await candidateStore.set(c);

  audit({
    category: "ADMIN", action: "candidate.published",
    actorId: officerId, targetType: "Candidate", targetId: c.id,
    payload: { marketId },
  });
  return c;
}
