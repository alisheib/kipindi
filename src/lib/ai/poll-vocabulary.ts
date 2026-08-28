/**
 * ⭐ THE CANONICAL VOCABULARIES for the AI pipeline's admin rails (S-08, scan #1, 2026-08-28).
 *
 * 🔴 WHAT THIS REPLACES. The same category list was hand-copied FOUR times — the validator's
 * private `Set` in `ai-poll-generation.ts`, the model tool-schema's private array in
 * `ai-provider-claude.ts`, and one list per admin rail — and they had already drifted:
 *
 *   · `/admin/ai-polls` offered 7 of the 8 poll categories. `other` was missing, and `other` is
 *     the documented FALLBACK the validator assigns when nothing else fits — so the one
 *     category a poll lands in by default could not be filtered for.
 *   · `/admin/candidates` was missing the `VERIFYING` state, which is precisely the state a
 *     candidate sits in when verification hangs or fails: the one an officer most needs to find.
 *
 * ⛔ AND THE TWO CATEGORY SETS ARE GENUINELY DIFFERENT, WHICH IS WHY THIS FILE HAS TWO.
 * The scan proposed deriving BOTH rails from the poll categories. That would be wrong: a
 * `MarketCandidate` can only ever hold the six in `CANDIDATE_CATEGORIES` (its own type says so),
 * so adding `tech` and `other` there would create two filter options that always return zero
 * rows — a narrowing control that cannot narrow, which is worse than a missing one. One list per
 * vocabulary; neither is the other's subset by accident.
 *
 * ⚠️ THIS MODULE HAS NO IMPORTS, ON PURPOSE. The rails are `"use client"`, and the lists used to
 * live in `ai-poll-generation.ts` — a heavy server module that pulls the prisma store, the audit
 * chain and node crypto. Importing a VALUE (not a type) from there into a client component drags
 * that whole graph into the browser bundle. A leaf module is what makes derivation possible at
 * all, rather than just tidier.
 *
 * ⛔ THE ORDER IS THE UI ORDER, so these are arrays and not Sets. The validator's copy was a
 * `Set`, which has no meaningful order — a rail derived from it would look nondeterministic.
 * Rebuild the Set from the array where membership is what is wanted.
 *
 * The STATES are checked against `prisma/schema.prisma` by `test:ai-vocabulary`, which reads the
 * enum out of the schema text: the database is the source of truth for a state, and a list of
 * states that cannot be reconciled against it is a fourth copy waiting to drift.
 */

/** The 8 categories an AI poll may hold. `other` is the validator's documented fallback. */
export const AI_POLL_CATEGORIES = [
  "sports",
  "macro",
  "weather",
  "crypto",
  "culture",
  "infrastructure",
  "tech",
  "other",
] as const;
export type AIPollCategory = (typeof AI_POLL_CATEGORIES)[number];

/**
 * The 6 a `MarketCandidate` may hold — NARROWER than the poll set, and deliberately so.
 * ⛔ Not a subset to be tidied into one list: `tech` and `other` are reachable for a generated
 * poll and unreachable for a candidate, so a shared list would offer dead filters on one rail.
 */
export const CANDIDATE_CATEGORIES = [
  "sports",
  "macro",
  "weather",
  "crypto",
  "culture",
  "infrastructure",
] as const;
export type CandidateCategoryId = (typeof CANDIDATE_CATEGORIES)[number];

/** Short admin labels. Admin copy is English-only by convention — these are not player-facing. */
export const CATEGORY_LABEL: Record<string, string> = {
  sports: "Sports",
  macro: "Macro",
  weather: "Weather",
  crypto: "Crypto",
  culture: "Culture",
  infrastructure: "Infra",
  tech: "Tech",
  other: "Other",
};

/**
 * The candidate states an officer may filter for — every arm of `CandidateState`.
 *
 * ⭐ `VERIFYING` IS HERE NOW, and its absence was the finding. Unlike `AIPollState.EDITING`
 * below, nothing documents it as unreachable, and `candidateStateLabel` carries a real word for
 * it — so it was simply missing from the rail, and it is the state a candidate sits in when
 * verification hangs.
 */
export const CANDIDATE_STATES = [
  "EXTRACTED",
  "SCORED",
  "VERIFYING",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "FILTERED_OUT",
  "REJECTED",
] as const;

/**
 * The poll states an officer may filter for.
 *
 * ⛔ `EDITING` IS DELIBERATELY EXCLUDED and that is the ONE justified omission on either rail.
 * `prisma/schema.prisma` records that no path enters it, so offering it would be a control that
 * can only ever return nothing. `test:ai-vocabulary` asserts this exclusion BY NAME rather than
 * allowing a subset, so a second silent omission cannot hide behind it.
 */
export const AI_POLL_STATES = [
  "GENERATING",
  "VALIDATION_FAILED",
  "FILTERED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
] as const;

/** States present in the schema enum but deliberately not offered, with the reason. */
export const STATE_EXCLUSIONS: Record<string, string> = {
  EDITING: "no path enters it — prisma/schema.prisma records this; offering it would be a filter that can only return nothing",
};

/** Short admin labels for the state rails. */
export const STATE_LABEL: Record<string, string> = {
  GENERATING: "Generating",
  VALIDATION_FAILED: "Failed",
  FILTERED: "Didn't pass",
  FILTERED_OUT: "Filtered",
  PENDING_REVIEW: "Pending",
  EDITING: "Editing",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
  EXTRACTED: "Extracted",
  SCORED: "Scored",
  VERIFYING: "Verifying",
};
