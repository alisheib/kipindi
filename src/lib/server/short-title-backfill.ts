/**
 * THE SHORT-TITLE BACKFILL — AI drafts for the open markets that have none, approved by an officer one by one
 * (the Vodacom plan S2, 2026-09-30; `docs/VODACOM-PLAN.md` §0c; COMPLIANCE §6 "An admin approves every backfilled
 * short title").
 *
 * WHAT IT DOES. `draftShortTitles` asks the AI provider for short titles for each OPEN long-form market (LIVE, not
 * selection-closed, `productLine` MARKET) that lacks one in at least one language and has no draft waiting. Every
 * value goes through the ONE rule module strictly (`lib/markets/short-title.ts`): a failing language is NULL in the
 * draft, with its issues and the refused words kept for the officer to read. The sentinel then reads the drafted
 * titles against the full question (`checkShortTitleAgreement`) and its verdict is stored with the draft. Nothing
 * reaches a market until an officer approves the draft — `applyShortTitles` (`via: "backfill"`), the one write path.
 *
 * ⛔ THE FOUR GATES OF A PAID AI RUN, all INSIDE the function (a gate on one of two doors is not a gate):
 *   1. the AI kill switch — `isPollGenEnabled()`, before anything else;
 *   2. the spend gate — `assertAiBudget("polls")` before EACH call, so a run stops at the ceiling mid-way;
 *   3. the batch clamp — never more markets than `getAIPollConfig().maxBatchPerRun` in one run;
 *   4. the meter — `recordAiUsage({ feature: "polls", subjectType: "market", subjectId })`, once per call, on both
 *      the success and the failure path. (The provider does NOT meter this call, so it is counted exactly once.)
 * The officer's own gates (trading act rights, the per-officer "ai.batch" rate rule) sit on the server action.
 *
 * WHERE DRAFTS LIVE. `SystemConfig`, one row per market (`shortTitle.draft.<marketId>`) plus an index row
 * (`shortTitle.draft.index`) that is the AUTHORITY on which drafts are waiting — a draft row the index does not name
 * is inert. Approval-critical writes use `saveConfigOrThrow`, so a write that did not land is reported, never
 * assumed. With no database (the dev server, the suites) the same keys live in a `globalThis` map, the
 * `ai-ops-config` pattern, so drafts survive a hot reload and every suite sees them.
 *
 * ⛔ AN APPROVED SHORT TITLE IS NEVER OVERWRITTEN BY A DRAFT. A draft records the languages the market LACKED when
 * it was drafted (`missing`); approving it writes only those (unless the officer typed a value in the edit). The
 * sentinel's verdict never approves anything — "not checked" is stored as not checked, never as agreement.
 */
import type { Locale } from "@/lib/i18n-dict";
import { SHORT_TITLE_LOCALES, cleanShortTitle, normaliseShortTitleSet, shortTitleFor, type ShortTitleIssue } from "@/lib/markets/short-title";
import { normaliseCompetition, type Competition } from "@/lib/markets/competitions";
import { hasDatabase } from "./prisma";
import { loadConfigResult, saveConfigOrThrow, deleteConfig } from "./config-store";
import { withLock } from "./locks";
import { audit } from "./audit";
import { getAIProvider, type ShortTitleDraftGeneration, type ShortTitleDraftResponse } from "./ai-provider";
import { getAIPollConfig } from "./ai-poll-config";
import { assertAiBudget, describeAiBudgetBlock, aiBudgetRefusal, recordAiUsage, costOf } from "./ai-usage";
import { listMarkets, isClosedByTime, isSelectionClosed, type StoredMarket } from "./market-service";
import { marketStore } from "./market-dal";
import { applyShortTitles, type ShortTitleEditInput, type ShortTitleEditResult, type ShortTitleField } from "./short-title-service";
import { checkShortTitleAgreement, type ShortTitleAgreement } from "./market-sentinel";
import type { OperatorRefusal } from "./safe-error";

/* ─── Storage ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const SHORT_TITLE_DRAFT_PREFIX = "shortTitle.draft.";
export const SHORT_TITLE_DRAFT_INDEX_KEY = "shortTitle.draft.index";
export const shortTitleDraftKey = (marketId: string) => `${SHORT_TITLE_DRAFT_PREFIX}${marketId}`;
/** Every write to the drafts (store, approve, reject, prune) is serialised on this one key. */
const DRAFTS_LOCK = "shortTitle:drafts";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SHORT_TITLE_DRAFTS: Map<string, unknown> | undefined;
}
const memKv = (): Map<string, unknown> =>
  globalThis.__50PICK_SHORT_TITLE_DRAFTS ?? (globalThis.__50PICK_SHORT_TITLE_DRAFTS = new Map());
/** A JSON round trip, as the database would do it — so no caller ever holds the stored object itself. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type Read<T> = { ok: true; value: T | null } | { ok: false; error: string };

async function kvRead<T>(key: string): Promise<Read<T>> {
  if (!hasDatabase()) {
    const m = memKv();
    return { ok: true, value: m.has(key) ? clone(m.get(key) as T) : null };
  }
  return loadConfigResult<T>(key);
}
/** Throws when the write did not land. */
async function kvWrite(key: string, value: unknown): Promise<void> {
  if (!hasDatabase()) { memKv().set(key, clone(value)); return; }
  await saveConfigOrThrow(key, value);
}
/** Best-effort: the index is the authority, so a draft row left behind by a failed delete is inert. */
async function kvDelete(key: string): Promise<void> {
  if (!hasDatabase()) { memKv().delete(key); return; }
  await deleteConfig(key);
}

async function readIndex(): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const r = await kvRead<{ marketIds?: unknown }>(SHORT_TITLE_DRAFT_INDEX_KEY);
  if (!r.ok) return r;
  const ids = Array.isArray(r.value?.marketIds) ? (r.value!.marketIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  return { ok: true, ids: Array.from(new Set(ids)) };
}
const writeIndex = (ids: string[]) => kvWrite(SHORT_TITLE_DRAFT_INDEX_KEY, { marketIds: ids });

/* ─── The draft ───────────────────────────────────────────────────────────────────────────────────────────── */

export type ShortTitleDraft = {
  marketId: string;
  /** What an approval would write per language — the STRICT rule's verdict; null = none (or refused). */
  en: string | null;
  sw: string | null;
  zh: string | null;
  /** A proposed competition, only when the market has none. */
  competition: Competition | null;
  /** The languages the market LACKED when this was drafted — the only ones an approval writes by default. */
  missing: Locale[];
  /** Every issue the rules found, per language (a refused language keeps its issues here). */
  issues: Record<Locale, ShortTitleIssue[]>;
  /** What the model wrote for a language the rules refused — shown to the officer, never stored on a market. */
  refused: Partial<Record<Locale, string>>;
  /** The sentinel's verdict on the drafted titles. ⛔ "unchecked" is never agreement. */
  agreement: ShortTitleAgreement;
  model: string;
  costUsd: number;
  draftedAt: string;
  draftedBy: string;
};

const FIELD: Record<Locale, "shortTitleEn" | "shortTitleSw" | "shortTitleZh"> = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };

/** A stored draft, read back defensively — a malformed row is treated as no draft (and pruned), never trusted. */
function parseDraft(raw: unknown, marketId: string): ShortTitleDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<ShortTitleDraft>;
  if (d.marketId !== marketId) return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  const issues = (v: unknown): ShortTitleIssue[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as ShortTitleIssue[]) : []);
  const agreement: ShortTitleAgreement =
    d.agreement && typeof d.agreement === "object" && (d.agreement as { status?: unknown }).status === "checked"
      ? (d.agreement as ShortTitleAgreement)
      : { status: "unchecked", reason: d.agreement && typeof (d.agreement as { reason?: unknown }).reason === "string" ? (d.agreement as { reason: string }).reason : "not checked" };
  return {
    marketId,
    en: str(d.en), sw: str(d.sw), zh: str(d.zh),
    competition: normaliseCompetition(d.competition),
    missing: Array.isArray(d.missing) ? SHORT_TITLE_LOCALES.filter((l) => (d.missing as unknown[]).includes(l)) : [...SHORT_TITLE_LOCALES],
    issues: { en: issues(d.issues?.en), sw: issues(d.issues?.sw), zh: issues(d.issues?.zh) },
    refused: d.refused && typeof d.refused === "object" ? d.refused : {},
    agreement,
    model: typeof d.model === "string" ? d.model : "",
    costUsd: typeof d.costUsd === "number" && Number.isFinite(d.costUsd) ? d.costUsd : 0,
    draftedAt: typeof d.draftedAt === "string" ? d.draftedAt : "",
    draftedBy: typeof d.draftedBy === "string" ? d.draftedBy : "",
  };
}

async function readDraft(marketId: string): Promise<Read<ShortTitleDraft>> {
  const r = await kvRead<unknown>(shortTitleDraftKey(marketId));
  if (!r.ok) return r;
  return { ok: true, value: parseDraft(r.value, marketId) };
}

/* ─── Which markets ───────────────────────────────────────────────────────────────────────────────────────── */

/** OPEN and LONG-FORM: live, still taking bets, never an Up & Down round. */
export function isOpenLongForm(m: StoredMarket): boolean {
  return m.status === "LIVE" && (m.productLine ?? "MARKET") === "MARKET" && !isClosedByTime(m) && !isSelectionClosed(m);
}

/** The languages a market has no short title in (whitespace is none, exactly as the card reads it). */
export function missingShortTitles(m: StoredMarket): Locale[] {
  return SHORT_TITLE_LOCALES.filter((loc) => !shortTitleFor(loc, m));
}

async function openLongFormMarkets(): Promise<StoredMarket[]> {
  return (await listMarkets({ status: "LIVE" })).filter(isOpenLongForm);
}

/** Selections closing soonest first — the cards a player will see go first. */
const byCloseSoonest = (a: StoredMarket, b: StoredMarket) =>
  (a.selectionClosedAt ?? a.resolutionAt).localeCompare(b.selectionClosedAt ?? b.resolutionAt);

/* ─── Drafting ────────────────────────────────────────────────────────────────────────────────────────────── */

/** Build a draft from the model's answer: strict rules per missing language, the refused words kept. */
function buildDraft(
  m: StoredMarket,
  g: ShortTitleDraftGeneration,
  missing: Locale[],
): Pick<ShortTitleDraft, "en" | "sw" | "zh" | "issues" | "refused" | "competition"> {
  const raw: Record<Locale, unknown> = { en: g.en?.shortTitle, sw: g.sw?.shortTitle, zh: g.zh?.shortTitle };
  // A language the market already has keeps its APPROVED value in the set, so the Swahili and Chinese checks
  // compare against the real English short title rather than a draft nobody approved.
  const set = normaliseShortTitleSet({
    titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
    shortTitleEn: missing.includes("en") ? raw.en : m.shortTitleEn,
    shortTitleSw: missing.includes("sw") ? raw.sw : m.shortTitleSw,
    shortTitleZh: missing.includes("zh") ? raw.zh : m.shortTitleZh,
  }, { strict: true });
  const value: Record<Locale, string | null> = { en: set.shortTitleEn, sw: set.shortTitleSw, zh: set.shortTitleZh };
  const out: Pick<ShortTitleDraft, "en" | "sw" | "zh" | "issues" | "refused" | "competition"> = {
    en: null, sw: null, zh: null,
    issues: { en: [], sw: [], zh: [] },
    refused: {},
    competition: m.competition ? null : normaliseCompetition(g.competition),
  };
  for (const loc of missing) {
    out[loc] = value[loc];
    out.issues[loc] = set.issues[loc];
    const cleaned = cleanShortTitle(loc, raw[loc]);
    if (value[loc] === null && cleaned) out.refused[loc] = cleaned.slice(0, 200);
  }
  return out;
}

export type DraftRunResult =
  | {
    ok: true;
    /** Drafts stored this run. */
    drafted: number;
    /** Markets this run looked at (at most `clampedTo`). */
    considered: number;
    /** The batch ceiling this run obeyed (`maxBatchPerRun`, or the smaller limit asked for). */
    clampedTo: number;
    /** Open markets still lacking a short title and a draft after this run. */
    remaining: number;
    failures: Array<{ marketId: string; error: string }>;
    /** Why the run stopped early (the spend ceiling mid-run), or null. */
    stopped: string | null;
  }
  | { ok: false; error: string; refusal?: OperatorRefusal };

/**
 * ⭐ DRAFT SHORT TITLES FOR OPEN MARKETS. Never throws on a refusal; a provider or storage failure for one market is
 * reported in `failures` and the run moves on.
 */
export async function draftShortTitles(opts: { officerId: string; limit?: number }): Promise<DraftRunResult> {
  if (typeof opts.officerId !== "string" || !opts.officerId) {
    return { ok: false, error: "Your session ended — sign in again. Nothing was drafted." };
  }
  // ⛔ GATE 1 — THE KILL SWITCH, here and not only at the button. Before the budget gate: a feature the operator has
  // switched off must not consult the credit meter, let alone spend against it.
  const { isPollGenEnabled, pollGenDisabledRefusal } = await import("./ai-controls");
  if (!(await isPollGenEnabled())) {
    return { ok: false, error: "AI generation is switched off in the AI toolkit. Nothing was drafted.", refusal: pollGenDisabledRefusal() };
  }
  const provider = getAIProvider();
  const draftFn = typeof provider.draftShortTitles === "function" ? provider.draftShortTitles.bind(provider) : null;
  if (!draftFn) {
    return { ok: false, error: `The AI provider "${provider.name}" cannot draft short titles. Nothing was drafted.` };
  }
  // ⛔ GATE 3 — THE CLAMP. The operator's per-run ceiling, whatever the caller asked for.
  const cap = Math.max(1, Math.floor(getAIPollConfig().maxBatchPerRun) || 1);
  const asked = typeof opts.limit === "number" && Number.isFinite(opts.limit) ? Math.floor(opts.limit) : cap;
  const clampedTo = Math.max(1, Math.min(cap, asked));

  const index = await readIndex();
  if (!index.ok) {
    return { ok: false, error: "The drafts already waiting could not be read, so nothing was drafted (it could have duplicated one). Try again." };
  }
  const waiting = new Set(index.ids);
  const candidates = (await openLongFormMarkets())
    .filter((m) => missingShortTitles(m).length > 0 && !waiting.has(m.id))
    .sort(byCloseSoonest);
  const batch = candidates.slice(0, clampedTo);

  let drafted = 0;
  const failures: Array<{ marketId: string; error: string }> = [];
  const draftedIds: string[] = [];
  let stopped: string | null = null;

  for (const m of batch) {
    // ⛔ GATE 2 — THE SPEND GATE, before EACH call.
    const budget = await assertAiBudget("polls");
    if (!budget.ok) {
      if (drafted === 0 && failures.length === 0) {
        return { ok: false, error: `${describeAiBudgetBlock(budget)} Nothing was drafted.`, refusal: aiBudgetRefusal(budget) };
      }
      stopped = describeAiBudgetBlock(budget);
      break;
    }
    const missing = missingShortTitles(m);
    const started = Date.now();
    let resp: ShortTitleDraftResponse;
    try {
      resp = await draftFn({
        marketId: m.id, titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
        category: m.category, resolutionCriterion: m.resolutionCriterion,
      });
    } catch (err) {
      const { getConfiguredModel } = await import("./ai-config");
      resp = { ok: false, error: String((err as Error)?.message ?? err), model: await getConfiguredModel(), inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started };
    }
    // ⛔ GATE 4 — THE METER, once per call, whatever happened.
    await recordAiUsage({
      feature: "polls", model: resp.model,
      inputTokens: resp.inputTokens, outputTokens: resp.outputTokens, webSearches: 0,
      ok: resp.ok, errorType: resp.ok ? null : (resp.error ?? "error").slice(0, 200),
      latencyMs: resp.latencyMs, detail: `short titles · ${m.titleEn.slice(0, 70)}`,
      subjectType: "market", subjectId: m.id,
    });
    if (!resp.ok || !resp.draft) {
      failures.push({ marketId: m.id, error: (resp.error ?? "The AI returned no draft.").slice(0, 200) });
      continue;
    }

    const built = buildDraft(m, resp.draft, missing);
    const shorts: Partial<Record<Locale, string>> = {};
    for (const loc of missing) { const v = built[loc]; if (v) shorts[loc] = v; }
    // The sentinel's separate, budgeted read of the drafted words. It never approves; "unchecked" stays unchecked.
    const agreement: ShortTitleAgreement = Object.keys(shorts).length === 0
      ? { status: "unchecked", reason: "no drafted short title passed the rules, so there was nothing to check" }
      : await checkShortTitleAgreement({
        market: { id: m.id, titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh, category: m.category, resolutionCriterion: m.resolutionCriterion },
        shorts,
        subject: { type: "market", id: m.id },
      }).catch((err: unknown): ShortTitleAgreement => ({ status: "unchecked", reason: `the check failed (${String((err as Error)?.message ?? err).slice(0, 120)})` }));

    const draft: ShortTitleDraft = {
      marketId: m.id,
      ...built,
      missing,
      agreement,
      model: resp.model,
      costUsd: costOf(resp.model, resp.inputTokens, resp.outputTokens, 0),
      draftedAt: new Date().toISOString(),
      draftedBy: opts.officerId,
    };
    try {
      const stored = await withLock(DRAFTS_LOCK, async () => {
        const idx = await readIndex();
        if (!idx.ok) throw new Error("the list of waiting drafts could not be read");
        if (idx.ids.includes(m.id)) return false; // another run drafted it meanwhile — theirs stands
        await kvWrite(shortTitleDraftKey(m.id), draft);
        await writeIndex([...idx.ids, m.id]);
        return true;
      });
      if (stored) { drafted++; draftedIds.push(m.id); }
    } catch (err) {
      failures.push({ marketId: m.id, error: `The draft could not be saved: ${String((err as Error)?.message ?? err).slice(0, 160)}` });
    }
  }

  await audit({
    category: "ADMIN",
    action: "market.short_titles_drafted",
    actorId: opts.officerId,
    targetType: "System",
    targetId: "short-title-backfill",
    payload: { drafted, marketIds: draftedIds, considered: batch.length, clampedTo, failures, stopped, provider: provider.name },
  });
  return { ok: true, drafted, considered: batch.length, clampedTo, remaining: Math.max(0, candidates.length - drafted), failures, stopped };
}

/* ─── Reading ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type ShortTitleDraftRow = { draft: ShortTitleDraft; market: StoredMarket };

/** How many drafts are waiting — the index alone, no pruning (the tab badge). Null when it could not be read. */
export async function countShortTitleDrafts(): Promise<number | null> {
  const idx = await readIndex();
  return idx.ok ? idx.ids.length : null;
}

/**
 * The drafts waiting for an officer, each with its market as it is NOW. A draft whose market is no longer open, is
 * gone, or no longer lacks any language the draft was for, is PRUNED here (it can never be approved usefully).
 * `needing` counts the open markets that still lack a short title and have no draft — what the next run would do.
 */
export async function listShortTitleDrafts(): Promise<{ rows: ShortTitleDraftRow[]; readError: string | null; needing: number }> {
  const idx = await readIndex();
  if (!idx.ok) return { rows: [], readError: "The drafts could not be read. Reload the page.", needing: 0 };
  const rows: ShortTitleDraftRow[] = [];
  const stale: string[] = [];
  let readError: string | null = null;
  for (const id of idx.ids) {
    const d = await readDraft(id);
    if (!d.ok) { readError = "Some drafts could not be read. Reload the page."; continue; }
    const m = await marketStore.get(id);
    if (!d.value || !m || !isOpenLongForm(m) || !d.value.missing.some((loc) => !shortTitleFor(loc, m))) {
      stale.push(id);
      continue;
    }
    rows.push({ draft: d.value, market: m });
  }
  if (stale.length) {
    try {
      await withLock(DRAFTS_LOCK, async () => {
        const cur = await readIndex();
        if (!cur.ok) return;
        await writeIndex(cur.ids.filter((x) => !stale.includes(x)));
        for (const id of stale) await kvDelete(shortTitleDraftKey(id));
      });
      void audit({
        category: "SYSTEM",
        action: "market.short_title_drafts_pruned",
        actorId: "system",
        targetType: "System",
        targetId: "short-title-backfill",
        payload: { marketIds: stale, why: "the market closed, is gone, or already has the short titles the draft was for" },
      });
    } catch { /* the index still names them; the next read tries again */ }
  }
  const waiting = new Set(idx.ids);
  const needing = (await openLongFormMarkets()).filter((m) => missingShortTitles(m).length > 0 && !waiting.has(m.id)).length;
  rows.sort((a, b) => a.draft.draftedAt.localeCompare(b.draft.draftedAt));
  return { rows, readError, needing };
}

/* ─── Approving and rejecting ─────────────────────────────────────────────────────────────────────────────── */

export type DraftEdit = {
  shortTitleEn?: string | null;
  shortTitleSw?: string | null;
  shortTitleZh?: string | null;
  competition?: string | null;
};

export type DraftApproveResult =
  | (Extract<ShortTitleEditResult, { ok: true }> & { draftCleared: boolean })
  | { ok: false; error: string; field?: ShortTitleField };

const GONE = "This draft is no longer waiting — it was approved, rejected or cleared. Reload the page. Nothing changed.";

/**
 * What an approval writes: the officer's edit where they typed one, else the drafted value — for the languages the
 * market LACKED only, so an approved short title is never overwritten by a draft. Exported for the suites.
 */
export function approvalInput(draft: ShortTitleDraft, edited?: DraftEdit): ShortTitleEditInput {
  const input: ShortTitleEditInput = {};
  for (const loc of SHORT_TITLE_LOCALES) {
    const f = FIELD[loc];
    if (edited && edited[f] !== undefined) input[f] = edited[f];
    else if (draft.missing.includes(loc) && draft[loc]) input[f] = draft[loc];
  }
  if (edited && edited.competition !== undefined) input.competition = edited.competition;
  else if (draft.competition) input.competition = draft.competition;
  return input;
}

/** Take a market out of the waiting list and drop its draft row. Throws when the index write does not land. */
async function clearDraft(marketId: string): Promise<void> {
  const idx = await readIndex();
  if (!idx.ok) throw new Error("the list of waiting drafts could not be read");
  await writeIndex(idx.ids.filter((x) => x !== marketId));
  await kvDelete(shortTitleDraftKey(marketId));
}

/**
 * ⭐ APPROVE ONE DRAFT — through `applyShortTitles` (`via: "backfill"`): the rules again, against the market's
 * titles read inside the market lock, the narrow write, and the audit row with before/after. A refusal leaves the
 * draft waiting. Never throws on a refusal.
 */
export async function approveShortTitleDraft(opts: { officerId: string; marketId: string; edited?: DraftEdit }): Promise<DraftApproveResult> {
  const { officerId, marketId } = opts;
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named. Nothing changed." };
  return withLock(DRAFTS_LOCK, async (): Promise<DraftApproveResult> => {
    const idx = await readIndex();
    if (!idx.ok) return { ok: false, error: "The drafts could not be read. Nothing changed. Try again." };
    if (!idx.ids.includes(marketId)) return { ok: false, error: GONE };
    const d = await readDraft(marketId);
    if (!d.ok) return { ok: false, error: "This draft could not be read. Nothing changed. Try again." };
    if (!d.value) return { ok: false, error: GONE };
    const m = await marketStore.get(marketId);
    if (!m) return { ok: false, error: "Market not found. Nothing changed." };
    // ⛔ What the market has NOW, not what it lacked when drafted: a language (or competition) an officer has set
    // since the draft was made is never overwritten by the draft — only by a value typed into this approval's edit.
    const input = approvalInput(
      { ...d.value, missing: d.value.missing.filter((loc) => !shortTitleFor(loc, m)), competition: m.competition ? null : d.value.competition },
      opts.edited,
    );
    if (Object.values(input).every((v) => v === undefined)) {
      return { ok: false, error: "This draft has no short title to approve. Type one in with Edit, or reject it. Nothing changed." };
    }
    const r = await applyShortTitles({
      marketId, officerId, input, via: "backfill",
      draftRef: `${shortTitleDraftKey(marketId)}@${d.value.draftedAt}`,
    });
    if (!r.ok) return r;
    let draftCleared = true;
    try { await clearDraft(marketId); } catch { draftCleared = false; }
    return { ...r, draftCleared };
  });
}

export type DraftRejectResult = { ok: true; recorded: boolean } | { ok: false; error: string; field?: "reason" };

export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 500;

/**
 * ⭐ REJECT ONE DRAFT — an ADMIN audit row carrying the draft and the reason, THEN the draft is removed. The market
 * is untouched (its card keeps showing the full question); a later run may draft it again.
 */
export async function rejectShortTitleDraft(opts: { officerId: string; marketId: string; reason: string }): Promise<DraftRejectResult> {
  const { officerId, marketId } = opts;
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named. Nothing changed." };
  const why = typeof opts.reason === "string" ? opts.reason.replace(/\s+/g, " ").trim() : "";
  if (why.length < REJECT_REASON_MIN) return { ok: false, error: "Say why the draft is rejected — a few words are enough. Nothing changed.", field: "reason" };
  if (why.length > REJECT_REASON_MAX) return { ok: false, error: `Keep the reason to ${REJECT_REASON_MAX} characters. Nothing changed.`, field: "reason" };
  return withLock(DRAFTS_LOCK, async (): Promise<DraftRejectResult> => {
    const idx = await readIndex();
    if (!idx.ok) return { ok: false, error: "The drafts could not be read. Nothing changed. Try again." };
    if (!idx.ids.includes(marketId)) return { ok: false, error: GONE };
    const d = await readDraft(marketId);
    if (!d.ok) return { ok: false, error: "This draft could not be read. Nothing changed. Try again." };
    const draft = d.value;
    const row = await audit({
      category: "ADMIN",
      action: "market.short_title_draft_rejected",
      actorId: officerId,
      targetType: "Market",
      targetId: marketId,
      payload: {
        reason: why,
        draft: draft
          ? { en: draft.en, sw: draft.sw, zh: draft.zh, competition: draft.competition, issues: draft.issues, refused: draft.refused, agreement: draft.agreement.status, draftedAt: draft.draftedAt, draftedBy: draft.draftedBy }
          : null,
        note: "Card wording only — the market is untouched.",
      },
    });
    try { await clearDraft(marketId); } catch {
      return { ok: false, error: "The rejection is on record, but the draft could not be removed. Reload the page and reject it again." };
    }
    return { ok: true, recorded: row.recorded };
  });
}
