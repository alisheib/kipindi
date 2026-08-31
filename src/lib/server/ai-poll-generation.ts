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

import { parseQuery, matchesQuery, fieldNames, POLL_SEARCH } from "@/lib/search";
import { randomId } from "./crypto";
// The ONE storage rule for a criterion translation — shared with the admin wizard
// and `createMarket`, so the AI cannot enter something an officer would be refused.
import { normaliseCriterionTranslation } from "@/lib/localized";
import { AI_POLL_CATEGORIES } from "@/lib/ai/poll-vocabulary";
import { audit } from "./audit";
import { getAIProvider, type AIPollGeneration, type AIProviderResponse, type PollIdea } from "./ai-provider";
import { getAIPollConfig, computeSelectionClosedAt } from "./ai-poll-config";
import { assertAiBudget, describeAiBudgetBlock } from "./ai-usage";
import { OperatorError } from "./safe-error";
import { listMarkets, resolvePublishCategory } from "./market-service";
import { seedDefaultSources, getGeneratableCategories, isSourceTrusted } from "./source-registry";
import { prisma, hasDatabase } from "./prisma";
// `Prisma.DbNull` writes a real SQL NULL into a nullable Json column. ⛔ Plain `null` is
// ambiguous there — Prisma reads it as the JSON value `null`, which is a 4-byte payload rather
// than an absent one, so the prune would report success and free nothing.
import { Prisma } from "@prisma/client";

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
  | "source_not_trusted"
  | "malformed_response"
  | "provider_error"
  | "missing_translation";

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
  titleZh: string;
  category: string;
  resolutionCriterion: string;
  /** F6c · SW / ZH translations of the criterion. `null` = none, which the player
   *  surface DISCLOSES rather than hiding. Officer-editable before publish, like
   *  every other field on this record. */
  resolutionCriterionSw: string | null;
  resolutionCriterionZh: string | null;
  resolutionAt: string;
  /** When selections (bets) close. Computed from resolutionAt - category lead
   *  time, or explicitly set in controlled mode. */
  selectionClosedAt: string | null;
  options: Array<{ label: string; descriptionEn?: string; descriptionSw?: string; descriptionZh?: string }>;
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

export interface AIPollStore {
  get(id: string): Promise<StoredAIPoll | null>;
  set(poll: StoredAIPoll): Promise<void>;
  delete(id: string): Promise<boolean>;
  values(): Promise<StoredAIPoll[]>;
  size(): Promise<number>;
  /** Retention: blank the two bulk payload columns on rows older than `beforeIso`.
   *  ⛔ Deletes no row and touches no decision field — see `prunePayloadsOlderThan`. */
  prunePayloads(beforeIso: string): Promise<AIPollPruneResult>;
}

/** What a payload prune actually did. Two numbers because they are two columns and a row
 *  can legitimately have one and not the other — reporting a single total would double-count
 *  the rows that had both and hide the ones that had neither. */
export type AIPollPruneResult = { rawResponses: number; generations: number };

/**
 * 🔴 THE TOMBSTONE, AND WHY IT IS NOT A NULL.
 *
 * `rawResponse` is rendered on `/admin/ai-polls` for a VALIDATION_FAILED or FILTERED poll —
 * it is the reviewer's only view of what the provider actually said. Nulling it makes that
 * section VANISH, and a reviewer looking at a 40-day-old failure then cannot tell "there was
 * never a raw response" from "it aged out". That is the same silent-absence defect this whole
 * audit is about, so the column keeps a sentence instead of nothing: ~60 bytes against the
 * ~7 kB average it replaces.
 *
 * ⛔ It is written ONLY where a payload actually existed. A row whose `rawResponse` was always
 * null keeps its null — stamping "pruned" over a column that never held anything would be a
 * false statement, which is the defect wearing the other hat.
 */
export const AIPOLL_PAYLOAD_PRUNED = "[raw response pruned by retention — docs/DATA-RETENTION.md]";

const memoryStore: AIPollStore = {
  async get(id) { return polls.get(id) ?? null; },
  async set(poll) { polls.set(poll.id, poll); },
  async delete(id) { return polls.delete(id); },
  async values() { return Array.from(polls.values()); },
  async size() { return polls.size; },
  async prunePayloads(beforeIso) {
    const cutoff = Date.parse(beforeIso);
    let rawResponses = 0, generations = 0;
    for (const [id, poll] of polls) {
      if (Date.parse(poll.createdAt) >= cutoff) continue;
      let touched = false;
      if (poll.rawResponse !== null && poll.rawResponse !== AIPOLL_PAYLOAD_PRUNED) {
        poll.rawResponse = AIPOLL_PAYLOAD_PRUNED; rawResponses++; touched = true;
      }
      if (poll.generation != null) { poll.generation = null; generations++; touched = true; }
      if (touched) polls.set(id, poll);
    }
    return { rawResponses, generations };
  },
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
    titleZh: r.titleZh ?? "",
    category: r.category,
    resolutionCriterion: r.resolutionCriterion,
    resolutionCriterionSw: r.resolutionCriterionSw ?? null,
    resolutionCriterionZh: r.resolutionCriterionZh ?? null,
    resolutionAt: r.resolutionAt instanceof Date ? r.resolutionAt.toISOString() : String(r.resolutionAt ?? ""),
    selectionClosedAt: r.selectionClosedAt instanceof Date ? r.selectionClosedAt.toISOString() : (r.selectionClosedAt ?? null),
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
    titleZh: p.titleZh || null,
    category: p.category,
    resolutionCriterion: p.resolutionCriterion,
    // ⚠️ ONE payload, used by BOTH create and update here — unlike marketStore.set,
    // whose two arms duplicate their column list and can drift apart.
    resolutionCriterionSw: p.resolutionCriterionSw,
    resolutionCriterionZh: p.resolutionCriterionZh,
    resolutionAt: p.resolutionAt ? new Date(p.resolutionAt) : new Date(0),
    selectionClosedAt: p.selectionClosedAt ? new Date(p.selectionClosedAt) : null,
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
  /**
   * ⛔ TWO `updateMany` PASSES, NOT ONE `OR`. A single statement with
   * `OR: [rawResponse not pruned, generation not null]` would qualify a row on the GENERATION
   * arm and then stamp the tombstone over a `rawResponse` that was always null — telling a
   * reviewer a payload was pruned when there never was one. Each column is filtered on its own
   * emptiness, so each write is true of the column it touches.
   *
   * ⚠️ `NOT: { rawResponse: … }` does not match NULLs, and that is wanted here: SQL's
   * `NULL <> 'x'` is NULL, so a row with no raw response is left alone rather than tombstoned.
   * It also makes the pass IDEMPOTENT — a second run matches nothing.
   */
  async prunePayloads(beforeIso) {
    const createdAt = { lt: new Date(beforeIso) };
    const raw = await pc().aIPoll.updateMany({
      where: { createdAt, NOT: { rawResponse: AIPOLL_PAYLOAD_PRUNED } },
      data: { rawResponse: AIPOLL_PAYLOAD_PRUNED },
    });
    const gen = await pc().aIPoll.updateMany({
      where: { createdAt, NOT: { generation: { equals: Prisma.DbNull } } },
      data: { generation: Prisma.DbNull },
    });
    return { rawResponses: raw.count, generations: gen.count };
  },
};

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
/**
 * The DAL, exported for the same reason `market-candidate.ts` exports `candidateStore`:
 * an AIPoll row is otherwise unreachable except through `generateAIPoll`, which calls a
 * provider and picks its own confidence — so the ONE state that matters to
 * `test:aipoll-publish` (APPROVED, confidence below the autopilot threshold) could not be
 * constructed, and the chain that puts a LIVE market on the board would stay untested.
 * It is the same store the service uses; there is no separate test path.
 */
export const aiPollStore: AIPollStore = usePrisma ? prismaStore : memoryStore;
const store: AIPollStore = aiPollStore;

/* ─── Constants ─── */

/* ⭐ ONE LIST (S-08). This was a private Set with the eight ids typed out; the same eight were
   typed out again in ai-provider-claude.ts and twice more on the admin rails, and they had
   already drifted. Membership is what this file wants, so the Set is REBUILT from the canonical
   order rather than replaced by it. */
const VALID_CATEGORIES = new Set<string>(AI_POLL_CATEGORIES);
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

/* ─── Validation + filtering ─── */

type ValidationResult = {
  passes: boolean;
  reasons: FilterReason[];
  quality: QualityIndicator[];
  overallQuality: number;
  sanitised: AIPollGeneration | null;
};

async function validateAndFilter(
  gen: AIPollGeneration | null | undefined,
  rawResponse: string | null,
  /** Controlled-mode overrides. When the operator supplies an explicit title or
   *  resolution date, THOSE are the values that ship — so they (not the AI's
   *  throwaway values) must be the ones the date-window / title checks run on.
   *  Without this, a controlled poll was validated against the AI's date and a
   *  bad operator date sailed through unchecked. */
  overrides?: { resolutionAt?: string; titleEn?: string; excludeId?: string },
): Promise<ValidationResult> {
  const reasons: FilterReason[] = [];
  const quality: QualityIndicator[] = [];

  if (!gen) {
    return { passes: false, reasons: ["malformed_response"], quality: [], overallQuality: 0, sanitised: null };
  }

  // Sanitise all text fields
  const sanitised: AIPollGeneration = {
    titleEn: sanitise(gen.titleEn ?? ""),
    titleSw: gen.titleSw ? sanitise(gen.titleSw) : undefined,
    titleZh: gen.titleZh ? sanitise(gen.titleZh) : undefined,
    category: sanitise(gen.category ?? "").toLowerCase(),
    resolutionCriterion: sanitise(gen.resolutionCriterion ?? ""),
    // F6c · same absent-or-nothing treatment as titleSw/titleZh two lines up.
    // ⛔ A model that copies the English into these is not translating, and storing
    // that would make "untranslated" indistinguishable from "translated identically"
    // (F8) — `normaliseCriterionTranslation` drops it at the storage boundary below.
    resolutionCriterionSw: gen.resolutionCriterionSw ? sanitise(gen.resolutionCriterionSw) : undefined,
    resolutionCriterionZh: gen.resolutionCriterionZh ? sanitise(gen.resolutionCriterionZh) : undefined,
    resolutionAt: typeof gen.resolutionAt === "string" ? gen.resolutionAt : "",
    // Array fields may arrive as non-arrays, or hold strings/null instead of
    // objects — coerce defensively so a malformed shape filters, never throws.
    options: (Array.isArray(gen.options) ? gen.options : []).map((o) => {
      const opt = (o ?? {}) as { label?: unknown; descriptionEn?: unknown; descriptionSw?: unknown; descriptionZh?: unknown };
      return {
        label: sanitise(typeof o === "string" ? o : opt.label),
        descriptionEn: opt.descriptionEn != null ? sanitise(opt.descriptionEn) : undefined,
        descriptionSw: opt.descriptionSw != null ? sanitise(opt.descriptionSw) : undefined,
        descriptionZh: opt.descriptionZh != null ? sanitise(opt.descriptionZh) : undefined,
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

  // Controlled-mode overrides take precedence over the AI's values for the
  // checks below, so the title/date that will actually ship are the validated
  // ones. (copyGenerationToPoll re-applies these after validation too.)
  if (overrides?.titleEn) sanitised.titleEn = sanitise(overrides.titleEn);
  if (typeof overrides?.resolutionAt === "string" && overrides.resolutionAt) {
    sanitised.resolutionAt = overrides.resolutionAt;
  }

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

  // Translated titles share the English length cap. Without this a runaway
  // model (or a pasted blob) could store a multi-KB Swahili/Chinese title that
  // breaks layout / is an abuse vector — titleEn was the only field bounded.
  if (!sanitised.titleSw || sanitised.titleSw.length < 5) {
    reasons.push("missing_translation");
    quality.push({ label: "Swahili title", score: 0, status: "bad" });
  } else if (sanitised.titleSw.length > MAX_TITLE_LENGTH) {
    reasons.push("title_too_long");
    quality.push({ label: "Swahili title length", score: 20, status: "bad" });
  } else {
    quality.push({ label: "Swahili title", score: 90, status: "good" });
  }
  if (!sanitised.titleZh || sanitised.titleZh.length < 2) {
    reasons.push("missing_translation");
    quality.push({ label: "Chinese title", score: 0, status: "bad" });
  } else if (sanitised.titleZh.length > MAX_TITLE_LENGTH) {
    reasons.push("title_too_long");
    quality.push({ label: "Chinese title length", score: 20, status: "bad" });
  } else {
    quality.push({ label: "Chinese title", score: 90, status: "good" });
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
    // HARD trusted-source gate (category-specific). The poll's primary source MUST
    // sit on an ENABLED trusted domain for the category it will publish as — the
    // SAME resolvePublishCategory + isSourceTrusted the publish action enforces.
    // This is the "never generate outside our sources/categories" guarantee: a
    // poll that fails here is FILTERED and never reaches review, so it can never
    // surprise an officer at publish (the "www.african-markets.com not permitted"
    // failure). We reorder so a trusted source is primary, because the publish
    // gate checks sources[0]; without this, a trusted 2nd source wouldn't save a
    // poll whose 1st source is untrusted.
    await seedDefaultSources();
    const resolvedCat = resolvePublishCategory(sanitised.category);
    const trustFlags = await Promise.all(validSources.map((s) => isSourceTrusted(s.url, resolvedCat)));
    const trustedPositions = trustFlags.map((t, i) => (t.ok ? i : -1)).filter((i) => i >= 0);
    if (trustedPositions.length === 0) {
      reasons.push("source_not_trusted");
      quality.push({ label: "Source not on the trusted registry for this category", score: 0, status: "bad" });
    } else {
      if (trustedPositions[0] !== 0) {
        const trusted = trustedPositions.map((i) => validSources[i]);
        const rest = validSources.filter((_, i) => !trustedPositions.includes(i));
        sanitised.sources = [...trusted, ...rest];
      }
      quality.push({ label: "Trusted source", score: 100, status: "good" });
    }
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
        // Never match the poll against ITSELF. It's already in the store (state
        // GENERATING during generation, PENDING_REVIEW/EDITING during an edit)
        // with its title set, so without this a controlled-title poll or any
        // re-validated edit would always flag as its own duplicate.
        existing.id !== overrides?.excludeId &&
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
    "source_not_trusted",
    "duplicate_poll",
    "low_confidence",
    "title_too_long",
    "criterion_too_long",
    "missing_translation",
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
  // `allowRegex` because this surface ADVERTISES regex — poll-filters.tsx passes it
  // to SearchBox, which renders the regex row in SearchHelp and echoes "pattern" as
  // the operator types. Without it here the pattern was matched as literal text and
  // the zero rows were reported as the answer. Safe: this is the JS executor over an
  // already-loaded list, not SQL `~*` — no pooled connection, and isSafeRegex plus
  // the 4,000-char haystack cap bound it. Guarded by test:search-adoption §5.
  // ⛔ NOT pre-lowercased. parseQuery lowercases term values itself, so doing it here
  // was redundant for terms and destructive for regex: `/[A-Z]+/` arriving as
  // `/[a-z]+/` is a DIFFERENT pattern that still compiles and still returns rows.
  const q = filter?.search?.trim();
  const parsedQ = parseQuery(q, { allowRegex: true, fields: fieldNames(POLL_SEARCH) });
  const all = await store.values();
  return all
    .filter((p) => {
      if (filter?.state && p.state !== filter.state) return false;
      if (filter?.category && p.category !== filter.category) return false;
      if (filter?.dateFrom && p.createdAt < filter.dateFrom) return false;
      if (filter?.dateTo && p.createdAt > filter.dateTo) return false;
      // Shared grammar (src/lib/search) — was one contiguous `.includes()` over a
      // joined haystack, which also let a "phrase" match across a field boundary.
      return matchesQuery(parsedQ, p as unknown as Record<string, string | null | undefined>, POLL_SEARCH);
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
  /** Controlled mode: explicit selection close + resolution dates from admin. */
  controlledResolutionAt?: string;
  controlledSelectionClosedAt?: string;
  /** Controlled mode: admin-provided title (AI won't generate one). */
  controlledTitle?: string;
}): Promise<StoredAIPoll> {
  // ⛔ THE PAUSE SWITCH — enforced HERE, not at the call sites.
  //
  // It used to live ONLY in `admin/ai-polls/actions.ts`, so `generateFromEventAction`
  // (`admin/events/actions.ts`) generated polls with the operator's switch OFF. A gate on
  // one of two doors is not a gate — and the AI-toolkit dropdown presents that switch as
  // the single place generation is turned off, which was therefore untrue.
  //
  // Placed BEFORE the budget gate on purpose: a feature the operator has disabled should
  // not consult the credit meter, let alone spend against it.
  const { isPollGenEnabled } = await import("./ai-controls");
  if (!(await isPollGenEnabled())) {
    throw new Error("AI generation is disabled (AI toolkit). Turn it back on to generate.");
  }

  // HARD BUDGET GATE — refuse BEFORE spending. The credit meter used to only
  // alert after the fact; the sole real cost cap was "a human clicks Generate",
  // which a calendar-driven generator (F8) removes. Now spend is enforced.
  const budget = await assertAiBudget("polls");
  if (!budget.ok) throw new OperatorError(describeAiBudgetBlock(budget));

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
    titleZh: "",
    category: opts.category,
    resolutionCriterion: "",
    resolutionCriterionSw: null,
    resolutionCriterionZh: null,
    resolutionAt: "",
    selectionClosedAt: null,
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

  // Controlled mode: pre-set admin-provided dates and title so they take
  // precedence over whatever the AI generates.
  if (opts.controlledSelectionClosedAt) poll.selectionClosedAt = opts.controlledSelectionClosedAt;
  if (opts.controlledResolutionAt) poll.resolutionAt = opts.controlledResolutionAt;
  if (opts.controlledTitle) poll.titleEn = opts.controlledTitle;

  await store.set(poll);

  audit({
    category: "ADMIN",
    action: "aipoll.generate_started",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { category: opts.category, prompt: opts.prompt, regenerationOf: opts.regenerationOf, controlled: !!(opts.controlledResolutionAt || opts.controlledSelectionClosedAt || opts.controlledTitle) },
  });

  // ── SOURCE-DRIVEN GENERATION GATE ────────────────────────────────────────
  // Constrain the generator to what the operator can actually resolve BEFORE we
  // spend a token: the category must have ≥1 enabled trusted source (and not be
  // disabled). If it doesn't, refuse now with a clear reason instead of paying
  // to generate a poll that would be filtered — and tell the operator exactly
  // where to fix it. This is the "AI never generates outside our sources /
  // categories" guarantee, enforced at the earliest possible point.
  // A banned category is refused precisely (and before spend), not lumped into
  // the generic source failure — it's a policy violation, not a missing source.
  const rawReqCat = (opts.category ?? "").trim().toLowerCase();
  if (BANNED_CATEGORIES.has(rawReqCat)) {
    poll.state = "FILTERED";
    poll.filterReasons = ["banned_category"];
    poll.qualityIndicators = [{ label: "Category (policy violation)", score: 0, status: "bad" }];
    poll.overallQuality = 0;
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);
    audit({
      category: "ADMIN",
      action: "aipoll.filtered",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { reasons: ["banned_category"], category: rawReqCat },
    });
    return poll;
  }

  const generatable = await getGeneratableCategories();
  const resolvedReqCat = resolvePublishCategory(opts.category);
  const allowedForCat = generatable.find((g) => g.category === resolvedReqCat);
  if (!allowedForCat) {
    poll.state = "FILTERED";
    poll.category = resolvedReqCat;
    poll.filterReasons = ["source_not_trusted"];
    poll.qualityIndicators = [{ label: `No enabled trusted source for ${resolvedReqCat}`, score: 0, status: "bad" }];
    poll.overallQuality = 0;
    poll.rawResponse = `No enabled trusted source for category "${resolvedReqCat}". Add or enable one under Admin → Sources & categories, then generate again.`;
    poll.updatedAt = new Date().toISOString();
    await store.set(poll);
    audit({
      category: "ADMIN",
      action: "aipoll.filtered",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: poll.id,
      payload: { reasons: ["source_not_trusted"], category: resolvedReqCat, reason: "no_enabled_source_for_category" },
    });
    return poll;
  }

  // Call the AI provider — steer away from existing questions so we don't pay
  // to generate a duplicate that the filter would reject post-hoc, and hand it
  // the operator's allowlist so it only ever cites approved domains.
  const avoidTitles = opts.avoidTitles ?? (await gatherExistingTitles());
  const provider = getAIProvider();
  let response: AIProviderResponse;
  try {
    response = await provider.generate({ category: resolvedReqCat, prompt: opts.prompt, controlledTitle: opts.controlledTitle, avoidTitles, allowedSources: generatable });
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
    validation = await validateAndFilter(response.generation, response.rawResponse ?? null, {
      titleEn: opts.controlledTitle,
      resolutionAt: opts.controlledResolutionAt,
      excludeId: poll.id,
    });
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
  // Controlled mode: if the operator pre-set a title (non-empty before gen),
  // it WINS — the AI must not silently overwrite an explicitly chosen title.
  // Only borrow the AI's title when the operator left it blank.
  if (!poll.titleEn) poll.titleEn = gen.titleEn;
  poll.titleSw = gen.titleSw ?? "";
  poll.titleZh = gen.titleZh ?? "";
  poll.category = gen.category;
  poll.resolutionCriterion = gen.resolutionCriterion;
  // ⛔ THROUGH THE NORMALISER, NOT STRAIGHT ACROSS. A model that copies the English
  // into a translation field is not translating, and storing that would make
  // "untranslated" indistinguishable from "translated identically" — F8 arriving from
  // the AI instead of from an officer. One rule, one function, every writer.
  poll.resolutionCriterionSw = normaliseCriterionTranslation(gen.resolutionCriterionSw, gen.resolutionCriterion);
  poll.resolutionCriterionZh = normaliseCriterionTranslation(gen.resolutionCriterionZh, gen.resolutionCriterion);
  // In controlled mode, admin may have pre-set resolutionAt — keep it.
  if (!poll.resolutionAt) poll.resolutionAt = gen.resolutionAt;
  // Compute selectionClosedAt from the category's default lead time, unless
  // the poll already has one set (controlled mode).
  const effectiveResAt = poll.resolutionAt || gen.resolutionAt;
  if (!poll.selectionClosedAt && effectiveResAt) {
    poll.selectionClosedAt = computeSelectionClosedAt(effectiveResAt, gen.category);
  }
  // Backstop: selection close must be strictly before resolution. A controlled
  // value that isn't (operator slip / client bypass) falls back to the category
  // default lead time rather than shipping an impossible betting window.
  if (poll.selectionClosedAt && effectiveResAt &&
      Date.parse(poll.selectionClosedAt) >= Date.parse(effectiveResAt)) {
    poll.selectionClosedAt = computeSelectionClosedAt(effectiveResAt, gen.category);
  }
  poll.options = gen.options;
  poll.sources = gen.sources;
  poll.confidence = gen.confidence;
  poll.reasoning = gen.reasoning;
}

/**
 * Generate a batch of polls in one operator action. Count is clamped to the
 * configured `maxBatchPerRun` ceiling (runaway / accidental-100k-burn guard).
 * Runs sequentially so in-batch duplicates are caught (each poll sees the ones
 * generated before it) and the API isn't hammered in parallel.
 */
export type IdeaFilterResult = { kept: PollIdea[]; dropped: Array<{ idea: PollIdea; reason: string }> };

/**
 * Tier-1.5 — FREE code-side filter of brainstormed ideas before paying for the
 * expensive Tier-2 enrichment. Drops ideas with an invalid/banned category, an
 * unparseable/out-of-window date, an empty title, or a duplicate (vs the existing
 * board AND earlier ideas in the same batch). Pure + deterministic so it's unit
 * tested. Uses the SAME normaliseTitle + VALID_CATEGORIES as the post-hoc filter,
 * with a 24h grace on the lower date bound (the guess is day-granular; Tier 2 +
 * validateAndFilter enforce the real window).
 */
export function filterIdeas(
  ideas: PollIdea[],
  opts: {
    minLeadHours: number;
    maxLeadDays: number;
    avoidTitles: string[];
    now: number;
    /** When supplied, drop any idea whose resolved category is NOT in this set
     *  (no enabled trusted source / disabled category) — the free, Tier-1.5
     *  half of the "never generate outside our sources" rule. Kept ideas are
     *  re-keyed to their resolved MarketCategory so Tier-2 generates in a
     *  category we can actually resolve. */
    generatableCategories?: Set<string>;
  },
): IdeaFilterResult {
  const earliest = opts.now + opts.minLeadHours * 3_600_000 - 86_400_000; // 24h grace
  const latest = opts.now + opts.maxLeadDays * 86_400_000;
  const seen = new Set(opts.avoidTitles.map(normaliseTitle).filter(Boolean));
  const kept: PollIdea[] = [];
  const dropped: Array<{ idea: PollIdea; reason: string }> = [];
  for (const idea of ideas) {
    const cat = (idea.category || "").toLowerCase();
    if (!VALID_CATEGORIES.has(cat)) { dropped.push({ idea, reason: "invalid_category" }); continue; }
    const outCat = opts.generatableCategories ? resolvePublishCategory(cat) : cat;
    if (opts.generatableCategories && !opts.generatableCategories.has(outCat)) {
      dropped.push({ idea, reason: "not_generatable" }); continue;
    }
    const fp = normaliseTitle(idea.titleEn || "");
    if (!fp) { dropped.push({ idea, reason: "empty_title" }); continue; }
    const t = Date.parse(idea.resolutionDateGuess);
    if (!Number.isFinite(t)) { dropped.push({ idea, reason: "invalid_date" }); continue; }
    if (t < earliest) { dropped.push({ idea, reason: "resolution_too_soon" }); continue; }
    if (t > latest) { dropped.push({ idea, reason: "resolution_too_far" }); continue; }
    if (seen.has(fp)) { dropped.push({ idea, reason: "duplicate" }); continue; }
    seen.add(fp);
    kept.push({ ...idea, category: outCat });
  }
  return { kept, dropped };
}

/** Seed prompt that pins Tier-2 (Sonnet + web search) to a specific idea. */
function ideaSteer(idea: PollIdea, operatorPrompt?: string): string {
  return `Build the prediction market for THIS specific idea (refine the wording but keep the same subject — do not invent a different market):
Idea: ${idea.titleEn}
Why it's bettable: ${idea.why}
Target resolution around: ${idea.resolutionDateGuess}.
Find the exact publicly-verifiable resolution criterion + real source URLs, set an accurate resolutionAt, and translate the title into both Swahili (titleSw) and Simplified Chinese (titleZh).${operatorPrompt ? `\nOperator guidance (priority): ${operatorPrompt}` : ""}`;
}

export async function generateAIPollBatch(opts: {
  count: number;
  categories?: string[];
  prompt?: string;
  actorId: string;
}): Promise<{ generated: StoredAIPoll[]; summary: Record<AIPollState, number> }> {
  // Budget gate before the (expensive) ideation call too — a batch is the most
  // costly path, so it must not even start when the cycle is exhausted.
  const batchBudget = await assertAiBudget("polls");
  if (!batchBudget.ok) throw new OperatorError(describeAiBudgetBlock(batchBudget));

  const cfg = getAIPollConfig();
  const requested = Number.isFinite(opts.count) ? Math.floor(opts.count) : 1;
  const n = Math.max(1, Math.min(cfg.maxBatchPerRun, requested));

  const summary: Record<AIPollState, number> = {
    GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0,
    PENDING_REVIEW: 0, EDITING: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0,
  };
  const generated: StoredAIPoll[] = [];

  // Categories are DERIVED from the operator's registry — a batch only ever
  // generates in categories that currently have an enabled trusted source.
  // "mixed" = every generatable category. A requested category with no source
  // is dropped here (logged), so we never spend on a doomed generation.
  const generatable = await getGeneratableCategories();
  const generatableCats = generatable.map((g) => g.category);
  const generatableSet = new Set<string>(generatableCats);
  if (generatableCats.length === 0) {
    audit({
      category: "ADMIN",
      action: "aipoll.batch_no_sources",
      actorId: opts.actorId,
      targetType: "AIPoll",
      targetId: "batch",
      payload: { requested: n, reason: "no_generatable_categories" },
    });
    return { generated, summary };
  }
  const rawCats = opts.categories && opts.categories.length > 0 ? opts.categories : generatableCats;
  const expanded = rawCats.includes("mixed")
    ? generatableCats
    : rawCats.map(resolvePublishCategory).filter((c) => generatableSet.has(c));
  const cats = expanded.length > 0 ? Array.from(new Set(expanded)) : generatableCats;

  audit({
    category: "ADMIN",
    action: "aipoll.batch_started",
    actorId: opts.actorId,
    targetType: "AIPoll",
    targetId: "batch",
    payload: { requested, clampedTo: n, categories: cats, generatable: generatableCats },
  });
  // Two-tier: cheap Haiku ideation + free code filter, then Sonnet+web-search
  // enrichment ONLY on the survivors — so we stop paying full price for polls
  // that would be filtered for date/category/duplicate reasons. The avoid-list
  // grows intra-batch so a run never duplicates its own picks. Falls back to
  // free-choice generation if ideation yields too few (see top-up below).
  const liveAvoid = await gatherExistingTitles();
  const provider = getAIProvider();

  // ── Tier 1: ideate (over-generate ~2n, bounded by maxBatchPerRun*2) ──
  const poolSize = Math.min(cfg.maxBatchPerRun * 2, n * 2 + 4);
  let ideas: PollIdea[] = [];
  try {
    const res = await provider.ideate({ categories: cats, count: poolSize, prompt: opts.prompt, avoidTitles: liveAvoid, allowedSources: generatable });
    if (res.ok) ideas = res.ideas;
  } catch { /* ideation is best-effort — top-up below covers a total failure */ }

  // ── Tier 1.5: free filter (also drops any idea in a non-generatable category) ──
  const { kept } = filterIdeas(ideas, { minLeadHours: cfg.minLeadTimeHours, maxLeadDays: cfg.maxLeadTimeDays, avoidTitles: liveAvoid, now: Date.now(), generatableCategories: generatableSet });
  audit({ category: "ADMIN", action: "aipoll.batch_ideated", actorId: opts.actorId, targetType: "AIPoll", targetId: "batch", payload: { ideasReturned: ideas.length, keptAfterFilter: kept.length, requested: n } });

  // ── Tier 2: enrich survivors (up to n), each pinned to its idea ──
  for (const idea of kept.slice(0, n)) {
    const poll = await generateAIPoll({ category: idea.category, prompt: ideaSteer(idea, opts.prompt), actorId: opts.actorId, avoidTitles: liveAvoid });
    generated.push(poll);
    summary[poll.state]++;
    if (poll.titleEn && (poll.state === "PENDING_REVIEW" || poll.state === "EDITING")) liveAvoid.push(poll.titleEn);
  }

  // ── Top-up / fallback: if ideation produced fewer than requested (or failed),
  //    fill the remainder with free-choice generation so volume is still met. ──
  for (let i = 0; generated.length < n && i < n; i++) {
    const category = cats[i % cats.length];
    const poll = await generateAIPoll({ category, prompt: opts.prompt, actorId: opts.actorId, avoidTitles: liveAvoid });
    generated.push(poll);
    summary[poll.state]++;
    if (poll.titleEn && (poll.state === "PENDING_REVIEW" || poll.state === "EDITING")) liveAvoid.push(poll.titleEn);
  }
  return { generated, summary };
}

/**
 * E-60 · REAP GENERATIONS THAT DIED MID-FLIGHT.
 *
 * A generation writes its row as `GENERATING` and moves it on when the provider answers.
 * If the process never gets that far — the request was aborted, the connection dropped, the
 * container restarted, an operator navigated away — **nothing ever moves the row again**.
 * There was no timeout, no failure state and no reaper, so on production SEVEN rows sat in
 * `GENERATING`, the oldest for 878 hours (36 days, since 27 June), every one with
 * `costUsd = 0` because the attempt died before it ever billed.
 *
 * ⭐ THE REAL COST IS NOT THE ROWS, IT IS THAT THE CONSOLE CANNOT TELL LIVE FROM DEAD.
 * `/admin/ai-polls` renders a corpse exactly like a job in flight — "generating … in-flight"
 * — so the operator's own count is permanently inflated and a genuinely stuck run today is
 * indistinguishable from one that died five weeks ago.
 *
 * ⛔ THE CUTOFF IS DELIBERATELY GENEROUS. A healthy single generation completes in ~25–90s
 * (measured on production: `generate_started` 10:13:23 → `pending_review` 10:13:47). Ten
 * minutes is an order of magnitude beyond that, so this can only ever catch something that
 * is genuinely dead — reaping a live generation would be a far worse defect than the one it
 * fixes.
 *
 * Terminal state is `VALIDATION_FAILED`, which the console already surfaces as "didn't
 * pass", rather than a new state nothing renders.
 */
export const STUCK_GENERATION_MINUTES = 10;

export async function reapStuckGenerations(now = Date.now()): Promise<number> {
  const cutoff = now - STUCK_GENERATION_MINUTES * 60_000;
  let reaped = 0;
  try {
    for (const p of await store.values()) {
      if (p.state !== "GENERATING") continue;
      if (Date.parse(p.createdAt) > cutoff) continue;     // still plausibly alive
      // ⛔ THE REASON GOES IN THE AUDIT ROW, NOT IN `rejectReasons`.
      // `rejectReasons` is a typed `FilterReason` union with its own label map per locale.
      // Inventing a member for it is exactly how E-1 shipped: a reason key with no
      // translation renders raw enum text to a Swahili or Chinese reader. The audit entry
      // below carries the explanation, and the console already renders this state
      // truthfully as "didn't pass".
      await store.set({ ...p, state: "VALIDATION_FAILED" });
      audit({
        category: "SYSTEM",
        action: "aipoll.generation_reaped",
        actorId: null,
        targetType: "AIPoll",
        targetId: p.id,
        payload: { category: p.category, ageMinutes: Math.round((now - Date.parse(p.createdAt)) / 60_000) },
      });
      reaped++;
    }
  } catch (e) {
    console.error("[aipoll] reap:", (e as Error)?.message ?? e);
  }
  if (reaped) console.log(`[aipoll] reaped ${reaped} abandoned generation(s)`);
  return reaped;
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
  // Defence in depth: never approve a poll that still carries quality/integrity
  // filter reasons (e.g. a past date). A clean PENDING_REVIEW poll has none;
  // this blocks any tampered/forged approve on a poll that failed validation.
  if (poll.filterReasons && poll.filterReasons.length > 0) return null;

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
  titleZh?: string;
  category?: string;
  resolutionCriterion?: string;
  resolutionCriterionSw?: string | null;
  resolutionCriterionZh?: string | null;
  resolutionAt?: string;
  selectionClosedAt?: string | null;
  options?: Array<{ label: string; descriptionEn?: string; descriptionSw?: string; descriptionZh?: string }>;
}): Promise<StoredAIPoll | null> {
  const poll = await store.get(id);
  if (!poll || (poll.state !== "PENDING_REVIEW" && poll.state !== "EDITING")) return null;

  if (opts.titleEn !== undefined) poll.titleEn = sanitise(opts.titleEn);
  if (opts.titleSw !== undefined) poll.titleSw = sanitise(opts.titleSw);
  if (opts.titleZh !== undefined) poll.titleZh = sanitise(opts.titleZh);
  if (opts.category !== undefined) poll.category = sanitise(opts.category).toLowerCase();
  if (opts.resolutionCriterion !== undefined) poll.resolutionCriterion = sanitise(opts.resolutionCriterion);
  // ⚠️ AFTER the English, deliberately: the rule compares against `poll.resolutionCriterion`,
  // so an officer editing both in one submit is checked against the NEW English, not the old.
  if (opts.resolutionCriterionSw !== undefined) {
    poll.resolutionCriterionSw = normaliseCriterionTranslation(sanitise(opts.resolutionCriterionSw ?? ""), poll.resolutionCriterion);
  }
  if (opts.resolutionCriterionZh !== undefined) {
    poll.resolutionCriterionZh = normaliseCriterionTranslation(sanitise(opts.resolutionCriterionZh ?? ""), poll.resolutionCriterion);
  }
  if (opts.resolutionAt !== undefined) {
    poll.resolutionAt = opts.resolutionAt;
    // Recompute selectionClosedAt when resolutionAt changes (unless explicitly overridden)
    if (opts.selectionClosedAt === undefined) {
      poll.selectionClosedAt = computeSelectionClosedAt(opts.resolutionAt, poll.category);
    }
  }
  if (opts.selectionClosedAt !== undefined) poll.selectionClosedAt = opts.selectionClosedAt;
  // If selectionClosedAt was cleared (set to null), auto-compute from category lead time
  if (!poll.selectionClosedAt && poll.resolutionAt) {
    poll.selectionClosedAt = computeSelectionClosedAt(poll.resolutionAt, poll.category);
  }
  // Guard: selectionClosedAt must be before resolutionAt
  if (poll.selectionClosedAt && poll.resolutionAt && Date.parse(poll.selectionClosedAt) >= Date.parse(poll.resolutionAt)) {
    poll.selectionClosedAt = computeSelectionClosedAt(poll.resolutionAt, poll.category);
  }
  if (opts.options !== undefined) {
    poll.options = opts.options.map((o) => ({
      label: sanitise(o.label),
      descriptionEn: o.descriptionEn ? sanitise(o.descriptionEn) : undefined,
      descriptionSw: o.descriptionSw ? sanitise(o.descriptionSw) : undefined,
      descriptionZh: o.descriptionZh ? sanitise(o.descriptionZh) : undefined,
    }));
  }

  // Re-validate after edit
  const revalidation = await validateAndFilter({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || undefined,
    titleZh: poll.titleZh || undefined,
    category: poll.category,
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    options: poll.options,
    sources: poll.sources,
    confidence: poll.confidence,
    reasoning: poll.reasoning,
  }, null, { excludeId: poll.id });

  poll.qualityIndicators = revalidation.quality;
  poll.overallQuality = revalidation.overallQuality;
  poll.filterReasons = revalidation.reasons;
  // Respect the re-validation verdict. Previously this ALWAYS set PENDING_REVIEW
  // — so an edit that introduced a hard fail (e.g. a past resolution date) left
  // the poll approvable/publishable with quality 0. An edit that fails quality
  // now lands in FILTERED, exactly like a failed generation, and cannot be
  // approved (approveAIPoll requires PENDING_REVIEW + no filter reasons).
  poll.state = revalidation.passes ? "PENDING_REVIEW" : "FILTERED";
  poll.updatedAt = new Date().toISOString();
  await store.set(poll);


  audit({
    category: "ADMIN",
    action: revalidation.passes ? "aipoll.edited" : "aipoll.edited_filtered",
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
      titleZh: "Simba SC能否赢得2026年坦桑尼亚超级联赛？",
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
      titleZh: "比特币能否在2026年8月底前超过15万美元？",
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
      titleZh: "达累斯萨拉姆2026年7月降雨量能否超过200毫米？",
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
      titleZh: f.titleZh ?? "",
      category: f.category ?? "",
      resolutionCriterion: f.resolutionCriterion ?? "",
      // Seed fixtures carry no translations on purpose: an untranslated poll is the
      // state a fresh store should reproduce, and it exercises the disclosing arm.
      resolutionCriterionSw: null,
      resolutionCriterionZh: null,
      resolutionAt: f.resolutionAt ?? "",
      selectionClosedAt: (f as Record<string, unknown>).selectionClosedAt as string | null ?? null,
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
