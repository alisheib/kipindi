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
import { getAIProvider, type AIPollGeneration, type AIProviderResponse, type GenerateRequest } from "./ai-provider";

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

/* ─── Constants ─── */

const VALID_CATEGORIES = new Set(["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "other"]);
const BANNED_CATEGORIES = new Set(["politics", "religion", "adult", "violence"]);
const MAX_TITLE_LENGTH = 200;
const MAX_CRITERION_LENGTH = 1000;
const MIN_CONFIDENCE_THRESHOLD = 50;
const CONFIDENCE_AUTO_APPROVE_HINT = 85; // shows green in UI, admin still must approve

/* ─── Sanitisation ─── */

function sanitise(s: string): string {
  return s
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

/* ─── Validation + filtering ─── */

type ValidationResult = {
  passes: boolean;
  reasons: FilterReason[];
  quality: QualityIndicator[];
  overallQuality: number;
  sanitised: AIPollGeneration | null;
};

function validateAndFilter(gen: AIPollGeneration | null | undefined, rawResponse: string | null): ValidationResult {
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
    resolutionAt: gen.resolutionAt ?? "",
    options: (gen.options ?? []).map((o) => ({
      label: sanitise(o.label ?? ""),
      descriptionEn: o.descriptionEn ? sanitise(o.descriptionEn) : undefined,
      descriptionSw: o.descriptionSw ? sanitise(o.descriptionSw) : undefined,
    })),
    sources: (gen.sources ?? []).map((s) => ({
      url: sanitise(s.url ?? ""),
      publisher: sanitise(s.publisher ?? ""),
    })),
    confidence: typeof gen.confidence === "number" ? Math.max(0, Math.min(100, Math.round(gen.confidence))) : 0,
    reasoning: sanitise(gen.reasoning ?? ""),
  };

  // Check for null bytes / XSS in original
  const rawStr = JSON.stringify(gen);
  if (/\0/.test(rawStr)) reasons.push("null_bytes");
  if (/<script/i.test(rawStr) || /javascript:/i.test(rawStr) || /onerror/i.test(rawStr)) reasons.push("xss_detected");

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

  // Date validation
  if (!isValidDate(sanitised.resolutionAt)) {
    reasons.push("invalid_date");
    quality.push({ label: "Resolution date", score: 0, status: "bad" });
  } else if (new Date(sanitised.resolutionAt).getTime() < Date.now()) {
    reasons.push("past_date");
    quality.push({ label: "Resolution date", score: 10, status: "bad" });
  } else {
    quality.push({ label: "Resolution date", score: 100, status: "good" });
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
  }

  // Invalid source URLs in original
  const badUrls = (gen.sources ?? []).filter((s) => !isValidUrl(s.url));
  if (badUrls.length > 0) reasons.push("invalid_source_url");

  // Confidence
  if (sanitised.confidence < MIN_CONFIDENCE_THRESHOLD) {
    reasons.push("low_confidence");
    quality.push({ label: "AI confidence", score: sanitised.confidence, status: "bad" });
  } else {
    quality.push({
      label: "AI confidence",
      score: sanitised.confidence,
      status: sanitised.confidence >= CONFIDENCE_AUTO_APPROVE_HINT ? "good" : "warning",
    });
  }

  // Duplicate check against existing polls
  for (const existing of polls.values()) {
    if (
      existing.state !== "VALIDATION_FAILED" &&
      existing.state !== "FILTERED" &&
      existing.state !== "REJECTED" &&
      existing.titleEn.toLowerCase() === sanitised.titleEn.toLowerCase()
    ) {
      reasons.push("duplicate_poll");
      quality.push({ label: "Uniqueness (duplicate detected)", score: 0, status: "bad" });
      break;
    }
  }

  // Calculate overall quality
  const hardFails = reasons.filter((r) =>
    ["empty_title", "malformed_response", "banned_category", "null_bytes", "xss_detected"].includes(r)
  );
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

export function listAIPolls(filter?: { state?: AIPollState }): StoredAIPoll[] {
  return Array.from(polls.values())
    .filter((p) => !filter?.state || p.state === filter.state)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAIPoll(id: string): StoredAIPoll | null {
  return polls.get(id) ?? null;
}

export function countAIPollsByState(): Record<AIPollState, number> {
  const out: Record<AIPollState, number> = {
    GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0,
    PENDING_REVIEW: 0, EDITING: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  for (const p of polls.values()) out[p.state]++;
  return out;
}

export function aiPollSpend(): { totalTokens: number; totalUsd: number; totalGenerations: number } {
  let tokens = 0, usd = 0, gens = 0;
  for (const p of polls.values()) {
    tokens += p.tokensUsed;
    usd += p.costUsd;
    gens++;
  }
  return { totalTokens: tokens, totalUsd: Math.round(usd * 100) / 100, totalGenerations: gens };
}

/** Generate a new AI poll. Returns immediately with GENERATING state, then updates in-place. */
export async function generateAIPoll(opts: {
  category: string;
  prompt?: string;
  actorId: string;
  regenerationOf?: string;
}): Promise<StoredAIPoll> {
  const now = new Date().toISOString();
  const parentPoll = opts.regenerationOf ? polls.get(opts.regenerationOf) : null;

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
  polls.set(poll.id, poll);

  audit({
    category: "ADMIN",
    action: "aipoll.generate_started",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { category: opts.category, prompt: opts.prompt, regenerationOf: opts.regenerationOf },
  });

  // Call the AI provider
  const provider = getAIProvider();
  let response: AIProviderResponse;
  try {
    response = await provider.generate({ category: opts.category, prompt: opts.prompt });
  } catch (err) {
    poll.state = "VALIDATION_FAILED";
    poll.filterReasons = ["provider_error"];
    poll.rawResponse = String(err);
    poll.updatedAt = new Date().toISOString();
    polls.set(poll.id, poll);

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
    polls.set(poll.id, poll);

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

  // Validate + filter
  const validation = validateAndFilter(response.generation, response.rawResponse ?? null);
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
    polls.set(poll.id, poll);

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
  polls.set(poll.id, poll);

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

/** Admin approves a PENDING_REVIEW poll. */
export function approveAIPoll(id: string, opts: { officerId: string; note?: string }): StoredAIPoll | null {
  const poll = polls.get(id);
  if (!poll || poll.state !== "PENDING_REVIEW") return null;

  poll.state = "APPROVED";
  poll.reviewedBy = opts.officerId;
  poll.reviewedAt = new Date().toISOString();
  poll.reviewNote = opts.note ?? null;
  poll.updatedAt = new Date().toISOString();
  polls.set(poll.id, poll);

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
export function rejectAIPoll(id: string, opts: { officerId: string; reasons: FilterReason[]; note?: string }): StoredAIPoll | null {
  const poll = polls.get(id);
  if (!poll || (poll.state !== "PENDING_REVIEW" && poll.state !== "EDITING")) return null;

  poll.state = "REJECTED";
  poll.reviewedBy = opts.officerId;
  poll.reviewedAt = new Date().toISOString();
  poll.reviewNote = opts.note ?? null;
  poll.rejectReasons = opts.reasons;
  poll.updatedAt = new Date().toISOString();
  polls.set(poll.id, poll);

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
export function editAIPoll(id: string, opts: {
  officerId: string;
  titleEn?: string;
  titleSw?: string;
  category?: string;
  resolutionCriterion?: string;
  resolutionAt?: string;
  options?: Array<{ label: string; descriptionEn?: string; descriptionSw?: string }>;
}): StoredAIPoll | null {
  const poll = polls.get(id);
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
  const revalidation = validateAndFilter({
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
  polls.set(poll.id, poll);

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
export function markAIPollPublished(id: string, opts: { candidateId: string; marketId: string; officerId: string }): StoredAIPoll | null {
  const poll = polls.get(id);
  if (!poll || poll.state !== "APPROVED") return null;

  poll.state = "PUBLISHED";
  poll.publishedCandidateId = opts.candidateId;
  poll.publishedMarketId = opts.marketId;
  poll.updatedAt = new Date().toISOString();
  polls.set(poll.id, poll);

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
export function deleteAIPoll(id: string, officerId: string): boolean {
  const poll = polls.get(id);
  if (!poll) return false;
  if (!["FILTERED", "VALIDATION_FAILED", "REJECTED"].includes(poll.state)) return false;

  polls.delete(id);
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

/** Seed fixture polls for testing — covers all states and edge cases. */
export function seedAIPollFixtures(): StoredAIPoll[] {
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
    if (polls.has(f.id)) continue;
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
    polls.set(poll.id, poll);
    seeded.push(poll);
  }
  return seeded;
}
