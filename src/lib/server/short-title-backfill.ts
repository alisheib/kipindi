/**
 * THE SHORT-TITLE BACKFILL — AI drafts for the open markets that have none, approved by an officer one by one
 * (the Vodacom plan S2, 2026-09-30; `docs/VODACOM-PLAN.md` §0c/§0d; COMPLIANCE §6 "An admin approves every backfilled
 * short title").
 *
 * WHAT IT DOES. `draftShortTitles` asks the AI provider for short titles for each OPEN long-form market (LIVE, not
 * selection-closed, `productLine` MARKET) that lacks one in a language no officer has declined, and has no draft
 * waiting. Every value goes through the ONE rule module strictly (`lib/markets/short-title.ts`): a failing language is
 * NULL in the draft, with its issues and the refused words kept for the officer to read. The sentinel then reads the
 * drafted titles against the full question (`checkShortTitleAgreement`) and its verdict is stored with the draft.
 * Nothing reaches a market until an officer approves the draft — `applyShortTitles` (`via: "backfill"`), the one
 * write path.
 *
 * ⛔ THE GATES OF A PAID AI RUN, all INSIDE the function (a gate on one of two doors is not a gate):
 *   1. the AI kill switch — `isPollGenEnabled()`, before anything else, AGAIN at the top of every market, and AGAIN
 *      just before the sentinel's call: an operator who switches AI off mid-run stops the very next paid call;
 *   2. the spend gate — `assertAiBudget("polls")` before EACH call, so a run stops at the ceiling mid-way;
 *   3. the batch clamp — never more markets than `getAIPollConfig().maxBatchPerRun` in one run;
 *   4. the meter — `recordAiUsage({ feature: "polls", subjectType: "market", subjectId })`, once per call, on both
 *      the success and the failure path. (The provider does NOT meter this call, so it is counted exactly once.)
 *   5. ONE RUN AT A TIME — a run claims `shortTitle.draft.run` under the drafts lock (renewed before every market,
 *      lapsing after `DRAFT_RUN_TTL_MS`), and a second run is refused while it stands: two runs at once would draft,
 *      and pay for, the same markets twice.
 * The officer's own gates (trading act rights, the per-officer "ai.batch" rate rule) sit on the server action.
 *
 * WHERE DRAFTS LIVE. `SystemConfig`, one row per market (`shortTitle.draft.<marketId>`) plus an index row
 * (`shortTitle.draft.index`) that is the AUTHORITY on which drafts are waiting — a draft row the index does not name
 * is inert. Two more rows: the run's claim (`shortTitle.draft.run`) and the languages officers DECLINED
 * (`shortTitle.draft.declined`). Approval-critical writes use `saveConfigOrThrow`, so a write that did not land is
 * reported, never assumed. With no database (the dev server, the suites) the same keys live in a `globalThis` map,
 * the `ai-ops-config` pattern, so drafts survive a hot reload and every suite sees them.
 *
 * ⛔ AN OFFICER'S DECISION STANDS. A rejected draft, and a language an approval leaves empty (the rules refused the
 * AI's words, or the officer cleared them), is recorded as DECLINED for that market: no later run drafts — or pays
 * for — it again. Its short titles can still be set by hand on the market's page. Declines for markets that are no
 * longer open are pruned.
 *
 * ⛔ AN APPROVED SHORT TITLE IS NEVER OVERWRITTEN BY A DRAFT. A plain approval writes each drafted value only if the
 * market still has none when the market lock is taken (`onlyIfEmpty`); an edited approval is refused, naming the
 * field, when the market changed since the officer's page loaded (`expectedBefore`). The sentinel's verdict never
 * approves anything — "not checked" is stored as not checked, never as agreement.
 */
import { randomUUID } from "node:crypto";
import type { Locale } from "@/lib/i18n-dict";
import { SHORT_TITLE_LOCALES, cleanShortTitle, normaliseShortTitleSet, shortTitleFor, type ShortTitleIssue } from "@/lib/markets/short-title";
import { normaliseCompetition, type Competition } from "@/lib/markets/competitions";
import { cleanReason } from "@/lib/affiliate-rules";
import { formatDateTimeSafe } from "@/lib/utils";
import { hasDatabase } from "./prisma";
import { loadConfigResult, saveConfigOrThrow, deleteConfig } from "./config-store";
import { withLock, runOutsideLock } from "./locks";
import { audit } from "./audit";
import { getAIProvider, type ShortTitleDraftGeneration, type ShortTitleDraftResponse } from "./ai-provider";
import { getAIPollConfig } from "./ai-poll-config";
import { assertAiBudget, describeAiBudgetBlock, aiBudgetRefusal, recordAiUsage, costOf } from "./ai-usage";
import { listMarkets, isClosedByTime, isSelectionClosed, type StoredMarket } from "./market-service";
import { marketStore } from "./market-dal";
import {
  applyShortTitles,
  type ShortTitleAgreementRecord,
  type ShortTitleEditInput,
  type ShortTitleEditResult,
  type ShortTitleField,
} from "./short-title-service";
import { agreementLine, checkShortTitleAgreement, type ShortTitleAgreement } from "./market-sentinel";
import type { OperatorRefusal } from "./safe-error";

/* ─── Storage ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const SHORT_TITLE_DRAFT_PREFIX = "shortTitle.draft.";
export const SHORT_TITLE_DRAFT_INDEX_KEY = "shortTitle.draft.index";
/** The one run in progress: `{ by, at, token }`. */
export const SHORT_TITLE_DRAFT_RUN_KEY = "shortTitle.draft.run";
/** The languages officers declined, per market: `{ byMarket: { [marketId]: { locales, at, by } } }`. */
export const SHORT_TITLE_DRAFT_DECLINED_KEY = "shortTitle.draft.declined";
export const shortTitleDraftKey = (marketId: string) => `${SHORT_TITLE_DRAFT_PREFIX}${marketId}`;
/** Every write to the drafts (store, approve, reject, prune, the run's claim, the declines) is serialised on this key. */
export const SHORT_TITLE_DRAFTS_LOCK = "shortTitle:drafts";
const DRAFTS_LOCK = SHORT_TITLE_DRAFTS_LOCK;
/** A run's claim lapses after this, so a run that died mid-way (a crash, a deploy) never blocks the next one for
 *  long. A live run renews it before every market, so a long run never lapses while it is still working. */
export const DRAFT_RUN_TTL_MS = 15 * 60_000;

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

/* ─── One run at a time ───────────────────────────────────────────────────────────────────────────────────── */

type RunClaim = { by: string; at: string; token: string };

/** A claim that still stands, or null (none, malformed, or lapsed — a claim dated in the far future is lapsed too). */
function liveClaim(v: unknown, now = Date.now()): RunClaim | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Partial<RunClaim>;
  if (typeof c.token !== "string" || !c.token || typeof c.at !== "string") return null;
  const age = now - Date.parse(c.at);
  if (!Number.isFinite(age) || Math.abs(age) >= DRAFT_RUN_TTL_MS) return null;
  return { by: typeof c.by === "string" ? c.by : "", at: c.at, token: c.token };
}

type Claim = { ok: true; token: string } | { ok: false; error: string };

/** ⛔ SINGLE FLIGHT: claim the run, or say who holds it. Never throws. */
async function claimDraftRun(officerId: string): Promise<Claim> {
  try {
    return await withLock(DRAFTS_LOCK, async (): Promise<Claim> => {
      const r = await kvRead<unknown>(SHORT_TITLE_DRAFT_RUN_KEY);
      if (!r.ok) {
        return { ok: false, error: "Whether another draft run is in progress could not be read, so nothing was drafted (two runs at once would pay twice). Try again." };
      }
      const cur = liveClaim(r.value);
      if (cur) {
        return { ok: false, error: `A draft run is already in progress (started ${formatDateTimeSafe(cur.at)}). Nothing was drafted — reload the page when it has finished.` };
      }
      const token = randomUUID();
      const claim: RunClaim = { by: officerId, at: new Date().toISOString(), token };
      await kvWrite(SHORT_TITLE_DRAFT_RUN_KEY, claim);
      return { ok: true, token };
    });
  } catch {
    return { ok: false, error: "The draft run could not be registered, so nothing was drafted (two runs at once would pay twice). Try again." };
  }
}

/** Renew OUR claim before the next market. "lost" when another run holds it now; "unknown" when it could not be read. */
async function renewDraftRun(token: string): Promise<"held" | "lost" | "unknown"> {
  try {
    return await withLock(DRAFTS_LOCK, async (): Promise<"held" | "lost" | "unknown"> => {
      const r = await kvRead<unknown>(SHORT_TITLE_DRAFT_RUN_KEY);
      if (!r.ok) return "unknown";
      const cur = r.value && typeof r.value === "object" ? (r.value as Partial<RunClaim>) : null;
      if (!cur || cur.token !== token) return "lost";
      await kvWrite(SHORT_TITLE_DRAFT_RUN_KEY, { ...cur, at: new Date().toISOString() });
      return "held";
    });
  } catch {
    return "unknown";
  }
}

/** Release OUR claim. ⛔ Only our own: a claim that lapsed and was taken by another run is theirs to release. */
async function releaseDraftRun(token: string): Promise<void> {
  try {
    await withLock(DRAFTS_LOCK, async () => {
      const r = await kvRead<unknown>(SHORT_TITLE_DRAFT_RUN_KEY);
      if (r.ok && r.value && typeof r.value === "object" && (r.value as Partial<RunClaim>).token === token) {
        await kvDelete(SHORT_TITLE_DRAFT_RUN_KEY);
      }
    });
  } catch { /* the claim lapses by itself after DRAFT_RUN_TTL_MS */ }
}

/* ─── What officers declined ──────────────────────────────────────────────────────────────────────────────── */

export type DeclinedMap = Record<string, { locales: Locale[]; at: string; by: string }>;

async function readDeclined(): Promise<{ ok: true; map: DeclinedMap } | { ok: false; error: string }> {
  const r = await kvRead<{ byMarket?: unknown }>(SHORT_TITLE_DRAFT_DECLINED_KEY);
  if (!r.ok) return r;
  const raw = r.value?.byMarket;
  const map: DeclinedMap = {};
  if (raw && typeof raw === "object") {
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!id || !v || typeof v !== "object") continue;
      const e = v as { locales?: unknown; at?: unknown; by?: unknown };
      const locales = Array.isArray(e.locales) ? SHORT_TITLE_LOCALES.filter((l) => (e.locales as unknown[]).includes(l)) : [];
      if (locales.length) map[id] = { locales, at: typeof e.at === "string" ? e.at : "", by: typeof e.by === "string" ? e.by : "" };
    }
  }
  return { ok: true, map };
}
const writeDeclined = (map: DeclinedMap) => kvWrite(SHORT_TITLE_DRAFT_DECLINED_KEY, { byMarket: map });

/** Record languages an officer declined for a market. Call INSIDE `DRAFTS_LOCK`. Throws when the write did not land. */
async function addDeclined(marketId: string, locales: readonly Locale[], officerId: string): Promise<void> {
  if (locales.length === 0) return;
  const cur = await readDeclined();
  if (!cur.ok) throw new Error("the declined languages could not be read");
  const prev = cur.map[marketId]?.locales ?? [];
  cur.map[marketId] = { locales: SHORT_TITLE_LOCALES.filter((l) => prev.includes(l) || locales.includes(l)), at: new Date().toISOString(), by: officerId };
  await writeDeclined(cur.map);
}

/** Drop the declines of markets that are no longer open. Best-effort; the next read tries again. */
async function pruneDeclined(seen: DeclinedMap, open: StoredMarket[]): Promise<void> {
  const openIds = new Set(open.map((m) => m.id));
  if (Object.keys(seen).every((id) => openIds.has(id))) return;
  try {
    await withLock(DRAFTS_LOCK, async () => {
      const cur = await readDeclined();
      if (!cur.ok) return;
      const keep: DeclinedMap = {};
      for (const [id, v] of Object.entries(cur.map)) if (openIds.has(id)) keep[id] = v;
      if (Object.keys(keep).length !== Object.keys(cur.map).length) await writeDeclined(keep);
    });
  } catch { /* the next read tries again */ }
}

/* ─── The draft ───────────────────────────────────────────────────────────────────────────────────────────── */

export type ShortTitleDraft = {
  marketId: string;
  /** What an approval would write per language — the STRICT rule's verdict; null = none (or refused). */
  en: string | null;
  sw: string | null;
  zh: string | null;
  /** A proposed competition, only when the market has none. */
  competition: Competition | null;
  /** The languages this draft is FOR: the market lacked them when drafted and no officer had declined them. The
   *  only languages an approval writes by default. */
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
const LANGUAGE: Record<Locale, string> = { en: "English", sw: "Swahili", zh: "Chinese" };

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

/** The languages a run would draft for a market: the ones it lacks that no officer has declined. */
export function draftableLanguages(m: StoredMarket, declined: DeclinedMap): Locale[] {
  const no = declined[m.id]?.locales ?? [];
  return missingShortTitles(m).filter((loc) => !no.includes(loc));
}

async function openLongFormMarkets(): Promise<StoredMarket[]> {
  return (await listMarkets({ status: "LIVE" })).filter(isOpenLongForm);
}

/** Selections closing soonest first — the cards a player will see go first. */
const byCloseSoonest = (a: StoredMarket, b: StoredMarket) =>
  (a.selectionClosedAt ?? a.resolutionAt).localeCompare(b.selectionClosedAt ?? b.resolutionAt);

/**
 * ⭐ THE ONE CANDIDATE FILTER — open, long-form, no draft waiting, and at least one language to draft that no officer
 * declined. The run and the page's "still to draft" count both read THIS, so they cannot disagree.
 */
export function draftCandidates(markets: StoredMarket[], waiting: ReadonlySet<string>, declined: DeclinedMap): StoredMarket[] {
  return markets
    .filter((m) => isOpenLongForm(m) && !waiting.has(m.id) && draftableLanguages(m, declined).length > 0)
    .sort(byCloseSoonest);
}

/** A waiting draft that can no longer be approved usefully: its market is gone, closed, or has every language it was for. */
function isStaleDraft(draft: ShortTitleDraft, m: StoredMarket): boolean {
  return !isOpenLongForm(m) || !draft.missing.some((loc) => !shortTitleFor(loc, m));
}

/* ─── Drafting ────────────────────────────────────────────────────────────────────────────────────────────── */

/** Build a draft from the model's answer: strict rules per language the draft is for, the refused words kept. */
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
    /** Open markets still lacking a short title (in a language nobody declined) and a draft after this run. */
    remaining: number;
    failures: Array<{ marketId: string; error: string }>;
    /** Why the run stopped early (the spend ceiling, the kill switch, a lost claim), or null. */
    stopped: string | null;
  }
  | { ok: false; error: string; refusal?: OperatorRefusal };

/** How a run that was switched off mid-way says so. */
export const DRAFT_RUN_SWITCHED_OFF = "AI generation was switched off in the AI toolkit during the run.";

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

  // ⛔ GATE 5 — ONE RUN AT A TIME. Released in `finally`, whatever happens below.
  const claim = await claimDraftRun(opts.officerId);
  if (!claim.ok) return { ok: false, error: claim.error };
  try {
    const index = await readIndex();
    if (!index.ok) {
      return { ok: false, error: "The drafts already waiting could not be read, so nothing was drafted (it could have duplicated one). Try again." };
    }
    const declined = await readDeclined();
    if (!declined.ok) {
      return { ok: false, error: "The languages officers declined could not be read, so nothing was drafted (it could have paid for one again). Try again." };
    }
    const candidates = draftCandidates(await openLongFormMarkets(), new Set(index.ids), declined.map);
    const batch = candidates.slice(0, clampedTo);

    let drafted = 0;
    const failures: Array<{ marketId: string; error: string }> = [];
    const draftedIds: string[] = [];
    let stopped: string | null = null;

    for (const m of batch) {
      // ⛔ GATE 1 AGAIN, before EACH paid call — switching AI off mid-run stops the next call, not the next run.
      if (!(await isPollGenEnabled())) {
        if (drafted === 0 && failures.length === 0) {
          return { ok: false, error: `${DRAFT_RUN_SWITCHED_OFF} Nothing was drafted.`, refusal: pollGenDisabledRefusal() };
        }
        stopped = DRAFT_RUN_SWITCHED_OFF;
        break;
      }
      // ⛔ GATE 2 — THE SPEND GATE, before EACH call.
      const budget = await assertAiBudget("polls");
      if (!budget.ok) {
        if (drafted === 0 && failures.length === 0) {
          return { ok: false, error: `${describeAiBudgetBlock(budget)} Nothing was drafted.`, refusal: aiBudgetRefusal(budget) };
        }
        stopped = describeAiBudgetBlock(budget);
        break;
      }
      // ⛔ GATE 5 — the claim, renewed; a run that lost it (it outlived the time limit and another run took over) stops.
      if ((await renewDraftRun(claim.token)) === "lost") {
        stopped = "Another draft run took over — this one had run past its time limit.";
        break;
      }
      const missing = draftableLanguages(m, declined.map);
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
      let agreement: ShortTitleAgreement;
      let switchedOff = false;
      if (Object.keys(shorts).length === 0) {
        agreement = { status: "unchecked", reason: "no drafted short title passed the rules, so there was nothing to check" };
      } else if (!(await isPollGenEnabled())) {
        // ⛔ GATE 1 AGAIN, just before the sentinel's paid call. The draft already paid for is kept, unchecked.
        switchedOff = true;
        agreement = { status: "unchecked", reason: "AI generation was switched off before the sentinel's check" };
      } else {
        agreement = await checkShortTitleAgreement({
          market: { id: m.id, titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh, category: m.category, resolutionCriterion: m.resolutionCriterion },
          shorts,
          subject: { type: "market", id: m.id },
        }).catch((err: unknown): ShortTitleAgreement => ({ status: "unchecked", reason: `the check failed (${String((err as Error)?.message ?? err).slice(0, 120)})` }));
      }

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
          if (idx.ids.includes(m.id)) return false; // drafted meanwhile — the waiting draft stands
          await kvWrite(shortTitleDraftKey(m.id), draft);
          await writeIndex([...idx.ids, m.id]);
          return true;
        });
        if (stored) { drafted++; draftedIds.push(m.id); }
      } catch (err) {
        failures.push({ marketId: m.id, error: `The draft could not be saved: ${String((err as Error)?.message ?? err).slice(0, 160)}` });
      }
      if (switchedOff) { stopped = DRAFT_RUN_SWITCHED_OFF; break; }
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
  } finally {
    await releaseDraftRun(claim.token);
  }
}

/* ─── Reading ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type ShortTitleDraftRow = { draft: ShortTitleDraft; market: StoredMarket };

/** How many drafts are waiting — the index alone, no pruning (the tab badge off the tab). Null when it could not be read. */
export async function countShortTitleDrafts(): Promise<number | null> {
  const idx = await readIndex();
  return idx.ok ? idx.ids.length : null;
}

/**
 * ⛔ THE PRUNE RE-CHECKS INSIDE THE LOCK. A draft that looked stale on the unlocked read is deleted only if, read again
 * under `DRAFTS_LOCK`, it is still the SAME draft (its `draftedAt`) and still stale against its market read NOW — so a
 * market reopened, or a draft replaced, between the read and the lock is never pruned on old evidence.
 * Returns the ids actually pruned.
 */
async function pruneStaleDrafts(stale: Array<{ id: string; draftedAt: string | null }>): Promise<string[]> {
  const pruned: string[] = [];
  try {
    await withLock(DRAFTS_LOCK, async () => {
      const cur = await readIndex();
      if (!cur.ok) return;
      const drop: string[] = [];
      for (const s of stale) {
        if (!cur.ids.includes(s.id)) continue; // gone already
        const d = await readDraft(s.id);
        if (!d.ok) continue; // cannot confirm — keep it
        if ((d.value?.draftedAt ?? null) !== s.draftedAt) continue; // a different draft now — judged on the next read
        const m = await marketStore.get(s.id);
        if (d.value && m && !isStaleDraft(d.value, m)) continue; // no longer stale
        drop.push(s.id);
      }
      if (drop.length === 0) return;
      await writeIndex(cur.ids.filter((x) => !drop.includes(x)));
      pruned.push(...drop);
      for (const id of drop) await kvDelete(shortTitleDraftKey(id));
    });
  } catch { /* the index still names them; the next read tries again */ }
  if (pruned.length) {
    void audit({
      category: "SYSTEM",
      action: "market.short_title_drafts_pruned",
      actorId: "system",
      targetType: "System",
      targetId: "short-title-backfill",
      payload: { marketIds: pruned, why: "the market closed, is gone, or already has the short titles the draft was for" },
    });
  }
  return pruned;
}

/**
 * The drafts waiting for an officer, each with its market as it is NOW. A draft whose market is no longer open, is
 * gone, or no longer lacks any language the draft was for, is PRUNED here (it can never be approved usefully).
 * `needing` counts what the next run would draft — the ONE candidate filter, over the index AFTER the prune.
 */
export async function listShortTitleDrafts(): Promise<{ rows: ShortTitleDraftRow[]; readError: string | null; needing: number }> {
  const idx = await readIndex();
  if (!idx.ok) return { rows: [], readError: "The drafts could not be read. Reload the page.", needing: 0 };
  const rows: ShortTitleDraftRow[] = [];
  const stale: Array<{ id: string; draftedAt: string | null }> = [];
  let readError: string | null = null;
  for (const id of idx.ids) {
    const d = await readDraft(id);
    if (!d.ok) { readError = "Some drafts could not be read. Reload the page."; continue; }
    const m = await marketStore.get(id);
    const draft = d.value;
    if (!draft || !m || isStaleDraft(draft, m)) {
      stale.push({ id, draftedAt: draft?.draftedAt ?? null });
      continue;
    }
    rows.push({ draft, market: m });
  }
  const pruned = stale.length ? await pruneStaleDrafts(stale) : [];
  const open = await openLongFormMarkets();
  const declined = await readDeclined();
  if (declined.ok) await pruneDeclined(declined.map, open);
  else readError ??= "The languages officers declined could not be read, so the count of markets still to draft may be too high. Reload the page.";
  const waiting = new Set(idx.ids.filter((id) => !pruned.includes(id)));
  const needing = draftCandidates(open, waiting, declined.ok ? declined.map : {}).length;
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

/** What the officer's page showed as the market's CURRENT value, per field (null: none) — sent with an edit. */
export type DraftBaseline = Partial<Record<ShortTitleField, string | null>>;

export type DraftApproveResult =
  | (Extract<ShortTitleEditResult, { ok: true }> & {
    draftCleared: boolean;
    /** Languages this draft was for that are still empty after it — recorded so no later run drafts (or pays for) them. */
    declined: Locale[];
    /** False when `declined` could not be recorded: a later run may draft those languages again. */
    declineSaved: boolean;
  })
  | { ok: false; error: string; field?: ShortTitleField };

const GONE = "This draft is no longer waiting — it was approved, rejected or cleared. Reload the page. Nothing changed.";
const SHORT_FIELDS: readonly ShortTitleField[] = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];

/**
 * What an approval writes: the officer's edit where they typed one, else the drafted value for the languages the draft
 * is for (and its competition). Whether a drafted value may land is judged inside the market lock (`approvalPlan`).
 * Exported for the suites.
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

export type ApprovalPlan = {
  input: ShortTitleEditInput;
  /** Drafted values (not typed by the officer): written only if the market still has none at write time. */
  onlyIfEmpty: ShortTitleField[];
  /** Typed values: refused, naming the field, when the market no longer shows what the officer's page showed. */
  expectedBefore: Partial<Record<ShortTitleField, string | null>>;
  /** Languages approved with words the officer changed from the draft (typed, or cleared). */
  editedByOfficer: Locale[];
  /** Languages approved exactly as drafted — the draft's sentinel verdict is about THESE words. */
  asDrafted: Locale[];
  /** Which languages the sentinel reads after the write: the officer's new words only; never the drafted ones again. */
  sentinelLocales: Locale[] | "none";
  auditExtra: Record<string, unknown>;
};

/**
 * ⭐ THE APPROVAL, PLANNED — pure, exported for the suites.
 *   · A drafted value is written ONLY IF EMPTY: another officer's value set meanwhile is kept, and reported.
 *   · A typed value carries the page's baseline as `expectedBefore`: a stale page is refused, naming the field.
 *   · The audit carries the draft's sentinel verdict for the languages approved AS DRAFTED, and `editedByOfficer` for
 *     the rest, which get a fresh sentinel check of their own (the old verdict was about different words).
 */
export function approvalPlan(draft: ShortTitleDraft, edited?: DraftEdit, baseline?: DraftBaseline): ApprovalPlan {
  const input = approvalInput(draft, edited);
  const typed = (f: ShortTitleField) => !!edited && edited[f] !== undefined;
  const onlyIfEmpty: ShortTitleField[] = [];
  const expectedBefore: Partial<Record<ShortTitleField, string | null>> = {};
  for (const f of SHORT_FIELDS) {
    if (input[f] === undefined) continue;
    if (!typed(f)) onlyIfEmpty.push(f);
    else if (baseline && Object.prototype.hasOwnProperty.call(baseline, f)) expectedBefore[f] = baseline[f] ?? null;
  }
  const editedByOfficer: Locale[] = [];
  const asDrafted: Locale[] = [];
  for (const loc of SHORT_TITLE_LOCALES) {
    const v = input[FIELD[loc]];
    if (v === undefined) continue;
    const drafted = draft.missing.includes(loc) ? draft[loc] : null;
    if (drafted !== null && cleanShortTitle(loc, v) === drafted) asDrafted.push(loc);
    else editedByOfficer.push(loc);
  }
  const fresh = editedByOfficer.filter((loc) => cleanShortTitle(loc, input[FIELD[loc]]) !== "");
  const draftAgreement: Partial<Record<Locale, { kind: string; text: string }>> = {};
  for (const loc of asDrafted) draftAgreement[loc] = agreementLine(draft.agreement, loc);
  // The languages this approval leaves empty — the officer's decision not to have them drafted again (unless another
  // officer sets one meanwhile), put on the record with the approval itself.
  const leftEmpty = draft.missing.filter((loc) => cleanShortTitle(loc, input[FIELD[loc]]) === "");
  return {
    input,
    onlyIfEmpty,
    expectedBefore,
    editedByOfficer,
    asDrafted,
    sentinelLocales: fresh.length ? fresh : "none",
    auditExtra: {
      draftAgreement,
      ...(draft.agreement.status === "checked"
        ? { draftCheckedBy: draft.agreement.model, draftCheckedAt: draft.agreement.checkedAt }
        : { draftUncheckedReason: draft.agreement.reason }),
      editedByOfficer,
      draftedBy: draft.draftedBy,
      draftModel: draft.model,
      ...(leftEmpty.length ? { leftEmptyNotDraftedAgain: leftEmpty } : {}),
    },
  };
}

/**
 * Take THIS draft off the waiting list. Call INSIDE `DRAFTS_LOCK`. A draft already off the list (pruned, or taken by
 * a second press) is success; a NEWER draft for the same market (another `draftedAt`) is left alone. Throws when the
 * index could not be read or rewritten.
 */
async function clearDraft(marketId: string, draftedAt?: string): Promise<void> {
  const idx = await readIndex();
  if (!idx.ok) throw new Error("the list of waiting drafts could not be read");
  if (!idx.ids.includes(marketId)) return;
  if (draftedAt !== undefined) {
    const d = await readDraft(marketId);
    if (d.ok && d.value && d.value.draftedAt !== draftedAt) return;
  }
  await writeIndex(idx.ids.filter((x) => x !== marketId));
  await kvDelete(shortTitleDraftKey(marketId));
}

/**
 * ⭐ APPROVE ONE DRAFT — in three steps, and ⛔ the market lock is NEVER taken inside the drafts lock:
 *   ① under `DRAFTS_LOCK`, only confirm the draft is still waiting and read it;
 *   ② OUTSIDE it (`runOutsideLock`), `applyShortTitles` (`via: "backfill"`): the rules again, against the market's
 *      titles read inside the MARKET lock, the narrow write, which commits and releases before the audit row;
 *   ③ under `DRAFTS_LOCK` again, record the languages left empty as declined and clear THIS draft — one already
 *      cleared meanwhile is success.
 * A refusal leaves the draft waiting. Never throws on a refusal.
 */
export async function approveShortTitleDraft(opts: { officerId: string; marketId: string; edited?: DraftEdit; baseline?: DraftBaseline }): Promise<DraftApproveResult> {
  const { officerId, marketId } = opts;
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named. Nothing changed." };

  // ① Read the draft under the drafts lock — nothing else.
  const seen = await withLock(DRAFTS_LOCK, async (): Promise<{ ok: true; draft: ShortTitleDraft } | { ok: false; error: string }> => {
    const idx = await readIndex();
    if (!idx.ok) return { ok: false, error: "The drafts could not be read. Nothing changed. Try again." };
    if (!idx.ids.includes(marketId)) return { ok: false, error: GONE };
    const d = await readDraft(marketId);
    if (!d.ok) return { ok: false, error: "This draft could not be read. Nothing changed. Try again." };
    if (!d.value) return { ok: false, error: GONE };
    return { ok: true, draft: d.value };
  });
  if (!seen.ok) return seen;
  const draft = seen.draft;
  const plan = approvalPlan(draft, opts.edited, opts.baseline);
  if (Object.values(plan.input).every((v) => v === undefined)) {
    return { ok: false, error: "This draft has no short title to approve. Type one in with Edit, or reject it. Nothing changed." };
  }

  // ② The market write, OUTSIDE the drafts lock.
  const r = await runOutsideLock(() => applyShortTitles({
    marketId, officerId, input: plan.input, via: "backfill",
    draftRef: `${shortTitleDraftKey(marketId)}@${draft.draftedAt}`,
    onlyIfEmpty: plan.onlyIfEmpty,
    expectedBefore: plan.expectedBefore,
    auditExtra: plan.auditExtra,
    sentinelLocales: plan.sentinelLocales,
  }));
  if (!r.ok) return r;

  // ③ The officer's decision on record, then this draft off the list.
  const declined = draft.missing.filter((loc) => !shortTitleFor(loc, r.after));
  let declineSaved = true;
  let draftCleared = true;
  try {
    await withLock(DRAFTS_LOCK, async () => {
      try { await addDeclined(marketId, declined, officerId); } catch { declineSaved = false; }
      await clearDraft(marketId, draft.draftedAt);
    });
  } catch {
    draftCleared = false;
  }
  return { ...r, draftCleared, declined, declineSaved };
}

const listWords = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export type DecisionNote = { tone: "ok" | "warn"; text: string };

/** ⭐ WHAT THE OFFICER IS TOLD after an approval landed — every sentence decided here, on the server. */
export function approvalNotes(r: Extract<DraftApproveResult, { ok: true }>): DecisionNote[] {
  const notes: DecisionNote[] = [];
  for (const f of r.skipped) {
    notes.push({
      tone: "warn",
      text: f === "competition"
        ? "The competition was already set by someone else — kept."
        : `${LANGUAGE[f === "shortTitleEn" ? "en" : f === "shortTitleSw" ? "sw" : "zh"]} was already set by someone else — kept.`,
    });
  }
  if (r.declined.length) {
    const names = listWords(r.declined.map((l) => LANGUAGE[l]));
    const one = r.declined.length === 1;
    notes.push(r.declineSaved
      ? { tone: "ok", text: `${names} ${one ? "was" : "were"} left empty and will not be drafted again — set ${one ? "it" : "them"} by hand on the market's page if you want one.` }
      : { tone: "warn", text: `${names} ${one ? "was" : "were"} left empty, but the note that stops ${one ? "it" : "them"} being drafted again could not be saved — a later run may draft ${one ? "it" : "them"} again.` });
  }
  const a: ShortTitleAgreementRecord | null = r.agreement;
  if (a) {
    if (a.status !== "checked") {
      notes.push({ tone: "warn", text: `The sentinel did not check your edit — ${a.reason?.trim() || "it gave no reason"}.` });
    } else {
      for (const loc of SHORT_TITLE_LOCALES) {
        const v = a.perLocale[loc];
        if (!v) continue;
        notes.push(v.agrees
          ? { tone: "ok", text: `Sentinel check of your ${LANGUAGE[loc]} edit: agrees.` }
          : { tone: "warn", text: `Sentinel check of your ${LANGUAGE[loc]} edit: does not agree — ${v.issue ?? "it gave no reason"}. Correct it on the market's page.` });
      }
    }
  }
  if (!r.changed && r.skipped.length === 0) notes.push({ tone: "warn", text: "The market already had these words — nothing changed." });
  if (!r.recorded) notes.push({ tone: "warn", text: "The change landed but its audit row was not written — tell the Owner." });
  if (!r.draftCleared) notes.push({ tone: "warn", text: "The draft could not be cleared — reload the page." });
  return notes;
}

export type DraftRejectResult = { ok: true; recorded: boolean; declineSaved: boolean } | { ok: false; error: string; field?: "reason" };

export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 500;

/** ⭐ WHAT THE OFFICER IS TOLD after a rejection landed. */
export function rejectNotes(r: Extract<DraftRejectResult, { ok: true }>): DecisionNote[] {
  const notes: DecisionNote[] = [
    r.declineSaved
      ? { tone: "ok", text: "It will not be drafted again. Its short titles can still be set by hand on the market's page." }
      : { tone: "warn", text: "The note that stops this market being drafted again could not be saved — a later run may draft it again." },
  ];
  if (!r.recorded) notes.push({ tone: "warn", text: "The rejection landed but its audit row was not written — tell the Owner." });
  return notes;
}

/**
 * ⭐ REJECT ONE DRAFT — the reason cleaned of invisible characters (`cleanReason`, what the S1 ceremony uses) and
 * measured AS CLEANED; an ADMIN audit row carrying the draft and that reason; the languages it was for recorded as
 * DECLINED (no later run drafts or pays for them again); THEN the draft is removed. The market is untouched: its card
 * keeps showing the full question, and its short titles can still be set by hand on the market's page.
 */
export async function rejectShortTitleDraft(opts: { officerId: string; marketId: string; reason: string }): Promise<DraftRejectResult> {
  const { officerId, marketId } = opts;
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named. Nothing changed." };
  const why = cleanReason(opts.reason);
  if (why.length < REJECT_REASON_MIN) return { ok: false, error: "Say why the draft is rejected — a few words are enough. Nothing changed.", field: "reason" };
  if (why.length > REJECT_REASON_MAX) return { ok: false, error: `Keep the reason to ${REJECT_REASON_MAX} characters. Nothing changed.`, field: "reason" };
  return withLock(DRAFTS_LOCK, async (): Promise<DraftRejectResult> => {
    const idx = await readIndex();
    if (!idx.ok) return { ok: false, error: "The drafts could not be read. Nothing changed. Try again." };
    if (!idx.ids.includes(marketId)) return { ok: false, error: GONE };
    const d = await readDraft(marketId);
    if (!d.ok) return { ok: false, error: "This draft could not be read. Nothing changed. Try again." };
    const draft = d.value;
    const market = draft ? null : await marketStore.get(marketId);
    const declined = draft ? draft.missing : market ? missingShortTitles(market) : [];
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
        declined,
        note: "Card wording only — the market is untouched. It is not drafted again; its short titles can still be set by hand on the market's page.",
      },
    });
    let declineSaved = true;
    try { await addDeclined(marketId, declined, officerId); } catch { declineSaved = false; }
    try { await clearDraft(marketId); } catch {
      return { ok: false, error: "The rejection is on record, but the draft could not be removed. Reload the page and reject it again." };
    }
    return { ok: true, recorded: row.recorded, declineSaved };
  });
}
