/**
 * Market-candidate pipeline — the AI-validated market generator.
 *
 * Architecture (per the system diagram):
 *   News article → Layer 1 extraction → Layer 2 filter → Layer 3
 *   cross-verify → Layer 4 confidence score → human approval → publish.
 *
 * This module defines the schema + in-memory store + state machine.
 * The actual Claude-API calls live in `market-candidate-ai.ts` so this
 * stays unit-testable without network access. An admin officer is the
 * final authority — no candidate becomes a live market without a human
 * signing off, even if the AI confidence is 100. That's the production
 * standard: AI accelerates, never decides.
 */

import { randomId } from "./crypto";
import { audit } from "./audit";

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

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CANDIDATES: Map<string, Candidate> | undefined;
}
const candidates: Map<string, Candidate> =
  globalThis.__50PICK_CANDIDATES ?? (globalThis.__50PICK_CANDIDATES = new Map());

const CONFIDENCE_PUBLISH_THRESHOLD = 75;

export function listCandidates(filter?: { state?: CandidateState }): Candidate[] {
  return Array.from(candidates.values())
    .filter((c) => !filter?.state || c.state === filter.state)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCandidate(id: string): Candidate | null {
  return candidates.get(id) ?? null;
}

export function countByState(): Record<CandidateState, number> {
  const out: Record<CandidateState, number> = {
    EXTRACTED: 0, FILTERED_OUT: 0, VERIFYING: 0, SCORED: 0,
    PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  for (const c of candidates.values()) out[c.state]++;
  return out;
}

export function recordSpend(): { dailyTokens: number; dailyUsd: number; runCount: number } {
  const cutoff = Date.now() - 24 * 3600_000;
  let tokens = 0, usd = 0, runs = 0;
  for (const c of candidates.values()) {
    if (Date.parse(c.createdAt) >= cutoff) {
      tokens += c.tokensSpent;
      usd += c.costUsd;
      runs++;
    }
  }
  return { dailyTokens: tokens, dailyUsd: Math.round(usd * 100) / 100, runCount: runs };
}

/** Insert a fresh candidate at the EXTRACTED state (Layer 1 completed). */
export function ingestCandidate(input: {
  category: CandidateCategory;
  proposedTitleEn: string;
  proposedTitleSw?: string;
  resolutionCriterion: string;
  resolutionAt: string;
  sources: Source[];
  tokensSpent?: number;
  costUsd?: number;
  actorId?: string;
}): Candidate {
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
  candidates.set(c.id, c);
  audit({
    category: "ADMIN", action: "candidate.extracted",
    actorId: input.actorId ?? "system_ai",
    targetType: "Candidate", targetId: c.id,
    payload: { category: c.category, sources: c.sources.length },
  });
  return c;
}

/** Layer 2 — strict, deterministic filtering. Hard rejects with a reason. */
export function filterCandidate(id: string, opts: { passes: boolean; reason?: RejectReason; note?: string }): Candidate | null {
  const c = candidates.get(id);
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
  candidates.set(c.id, c);
  audit({
    category: "ADMIN",
    action: opts.passes ? "candidate.filter_pass" : "candidate.filter_reject",
    actorId: "system_ai", targetType: "Candidate", targetId: c.id,
    payload: { reason: opts.reason, note: opts.note },
  });
  return c;
}

/** Layer 3 — cross-verification result. Adds sources, sets state to SCORED. */
export function attachVerification(id: string, opts: { confirmingSources: Source[]; tokensSpent: number; costUsd: number }): Candidate | null {
  const c = candidates.get(id);
  if (!c) return null;
  const now = new Date().toISOString();
  c.sources = [...c.sources, ...opts.confirmingSources];
  c.tokensSpent += opts.tokensSpent;
  c.costUsd += opts.costUsd;
  c.state = "SCORED";
  c.trace.push({ layer: 3, outcome: `verified:${opts.confirmingSources.length}`, at: now });
  c.updatedAt = now;
  candidates.set(c.id, c);
  return c;
}

/** Layer 4 — assign confidence. Routes to PENDING_REVIEW or FILTERED_OUT. */
export function scoreCandidate(id: string, opts: { confidence: number; tokensSpent: number; costUsd: number; rubric: Record<string, number> }): Candidate | null {
  const c = candidates.get(id);
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
  candidates.set(c.id, c);
  return c;
}

/** Human officer approves a SCORED / PENDING_REVIEW candidate. */
export function approveCandidate(id: string, opts: { officerId: string; note?: string }): Candidate | null {
  const c = candidates.get(id);
  if (!c) return null;
  if (c.state !== "PENDING_REVIEW") return null;
  const now = new Date().toISOString();
  c.state = "APPROVED";
  c.reviewedBy = opts.officerId;
  c.reviewedAt = now;
  c.reviewNote = opts.note;
  c.updatedAt = now;
  candidates.set(c.id, c);
  audit({
    category: "ADMIN", action: "candidate.approved",
    actorId: opts.officerId, targetType: "Candidate", targetId: c.id,
    payload: { confidence: c.confidence, sources: c.sources.length },
  });
  return c;
}

/** Human officer rejects (any non-terminal state). */
export function rejectCandidate(id: string, opts: { officerId: string; reason: RejectReason; note?: string }): Candidate | null {
  const c = candidates.get(id);
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
  candidates.set(c.id, c);
  audit({
    category: "ADMIN", action: "candidate.rejected",
    actorId: opts.officerId, targetType: "Candidate", targetId: c.id,
    payload: { reason: opts.reason, note: opts.note },
  });
  return c;
}

/** Mark APPROVED candidate as PUBLISHED — called after createMarket succeeds. */
export function markPublished(id: string, marketId: string, officerId: string): Candidate | null {
  const c = candidates.get(id);
  if (!c || c.state !== "APPROVED") return null;
  const now = new Date().toISOString();
  c.state = "PUBLISHED";
  c.publishedMarketId = marketId;
  c.updatedAt = now;
  candidates.set(c.id, c);
  audit({
    category: "ADMIN", action: "candidate.published",
    actorId: officerId, targetType: "Candidate", targetId: c.id,
    payload: { marketId },
  });
  return c;
}
