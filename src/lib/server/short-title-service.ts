/**
 * APPLYING SHORT TITLES TO A MARKET — the ONE write path after creation (the Vodacom plan S2, 2026-09-30).
 *
 * Two callers, one function: the admin edit on `/admin/markets/[id]` ("via: edit") and the approval of a backfill draft
 * ("via: backfill"). Both need the same guarantees, so neither spells them itself:
 *   1. THE RULES — every value the act WRITES goes through `normaliseShortTitleSet` (`lib/markets/short-title.ts`)
 *      against the market's OWN full titles, read inside the lock. A hard issue refuses the whole act and names the
 *      field; a warning (a number the full question does not contain) is returned so the officer sees it, and does not
 *      refuse. ⛔ A field the act does NOT touch is kept EXACTLY as stored — never re-normalised, never rewritten — and
 *      refuses the act only when THIS act gives it a hard issue it did not already have (a Swahili title that becomes a
 *      copy of the English one the act just wrote). So a stored value a later rule would refuse never blocks an edit to
 *      a different field.
 *   2. THE LOCK — `withLock(market:<id>)`, the lock the bet path holds, with a fresh read inside it and the narrow
 *      `marketStore.setShortTitles` write (four columns, never the full-row `set`, never `stamp`). A stake that lands
 *      at the same moment is never overwritten. `expectedBefore` and `onlyIfEmpty` are judged on THAT read.
 *   3. THE RECORD — an ADMIN audit row carrying the values BEFORE and AFTER (`market.short_title_edited` or
 *      `market.short_title_approved`). ⛔ `audit()` never rejects: `recorded` says whether the row is on file.
 *   4. THE SENTINEL (COMPLIANCE-DECISIONS §6, "every officer write is checked") — AFTER the write has landed and AFTER
 *      its audit row, OUTSIDE the lock, `recordShortTitleAgreement` asks the sentinel whether each new short title says
 *      what the full question says, and records the verdict as its own row, `market.short_title_checked`. It never
 *      blocks, fails or undoes the write, and anything it could not do reads "not checked" — never "agrees".
 *   5. SCOPE — a long-form market only. An Up & Down round is never a card and is out of S2.
 *
 * `undefined` for a field means "leave it as it is"; `null` or "" means "clear it" (the card then shows the full title).
 *
 * ⛔ THE COMPETITION IS STORED AND READ RAW. A key a later build dropped from `COMPETITIONS` survives every read and
 * every write of the OTHER fields untouched; it is validated only where a NEW value is written (here, the wizard, the
 * AI output, a draft's approval) and coerced only where it is DISPLAYED (`normaliseCompetition` before
 * `competitionLabel`).
 */
import type { Locale } from "@/lib/i18n-dict";
import { audit } from "./audit";
import { withLock } from "./locks";
import { marketStore, type MarketShortTitleFields } from "./market-dal";
import { checkShortTitleAgreement, type ShortTitleAgreement } from "./market-sentinel";
import {
  HARD_ISSUES, SHORT_TITLE_LOCALES, SHORT_TITLE_MAX, cleanShortTitle, codePoints, normaliseShortTitleSet, shortTitleFor,
  type ShortTitleIssue,
} from "@/lib/markets/short-title";
import { isCompetition } from "@/lib/markets/competitions";
import { offendingChars } from "@/lib/sms-compose";

export type ShortTitleField = "shortTitleEn" | "shortTitleSw" | "shortTitleZh" | "competition";
type TitleField = Exclude<ShortTitleField, "competition">;

/** The four fields, in the order a refusal is looked for and an audit row lists them. */
export const SHORT_TITLE_FIELDS: readonly ShortTitleField[] = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];

export type ShortTitleEditInput = {
  shortTitleEn?: string | null;
  shortTitleSw?: string | null;
  shortTitleZh?: string | null;
  competition?: string | null;
};

/**
 * The sentinel's reading of an act's short titles, as the act reports it. ⛔ "unchecked" is never agreement: a
 * switched-off sentinel, a missing key, a blocked budget, a failed call and an answer that does not cover every language
 * asked about are all "unchecked", with the reason.
 */
export type ShortTitleAgreementRecord = {
  status: "checked" | "unchecked";
  /** Why nothing was checked — set when `status` is "unchecked". */
  reason?: string;
  /** One verdict per language asked about — filled when `status` is "checked", empty otherwise. */
  perLocale: Partial<Record<Locale, { agrees: boolean; issue: string | null }>>;
};

export type ShortTitleEditResult =
  | {
    ok: true;
    changed: boolean;
    before: MarketShortTitleFields;
    after: MarketShortTitleFields;
    /** Warnings the officer should read (never a refusal): per language. */
    warnings: Record<Locale, ShortTitleIssue[]>;
    /** False only when the act LANDED and its audit row could not be written. */
    recorded: boolean;
    /** The fields `onlyIfEmpty` left alone because the market already had a value when the lock was taken. */
    skipped: ShortTitleField[];
    /** The sentinel's verdict on the short titles this act wrote; null when nothing was checked. */
    agreement: ShortTitleAgreementRecord | null;
  }
  | { ok: false; error: string; field?: ShortTitleField };

const LANG: Record<Locale, string> = { en: "English", sw: "Swahili", zh: "Chinese" };
const FIELD: Record<Locale, TitleField> = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };
const FIELD_LABEL: Record<ShortTitleField, string> = {
  shortTitleEn: "The English short title",
  shortTitleSw: "The Swahili short title",
  shortTitleZh: "The Chinese short title",
  competition: "The competition",
};

/**
 * One sentence per issue, in the console's plain English. Exported for the admin control, the wizard's action, the AI
 * generator, the backfill panel and the suites.
 *
 * ⭐ IT CLEANS THE VALUE ITSELF (`cleanShortTitle`: trimmed, zero-width characters dropped, sw/en folded onto GSM-7)
 * before counting or listing characters — the exact value the rule judged. So "it has N" is the count the rule
 * refused, and the characters a text message cannot carry are only those that survived the fold, whichever form of the
 * value a caller hands in (the raw text typed, or the value stored).
 */
export function shortTitleIssueSentence(locale: Locale, issue: ShortTitleIssue, value: unknown): string {
  const v = cleanShortTitle(locale, value);
  switch (issue) {
    case "too_long":
      return `Keep the ${LANG[locale]} short title to ${SHORT_TITLE_MAX[locale]} characters — it has ${codePoints(v)}.`;
    case "not_gsm7":
      return `The ${LANG[locale]} short title has characters a text message cannot carry: ${offendingChars(v).join(" ")}.`;
    case "form":
      return locale === "sw"
        ? "A Swahili short title is a question in the form “Je, …?”."
        : locale === "en"
          ? "An English short title is a question ending in “?”."
          : "A Chinese short title is a question ending in “？”.";
    case "copied_english":
      // For Chinese the rule also refuses ANY value with no Chinese character, copy or not — so it says that.
      return locale === "zh"
        ? "The Chinese short title is not written in Chinese. Write it in Chinese, or leave it empty so the card shows the full question."
        : `The ${LANG[locale]} short title is the English one. Write it in ${LANG[locale]}, or leave it empty so the card shows the full question.`;
    case "number_drift":
      return `The ${LANG[locale]} short title has a number the full question does not. Check it says the same thing.`;
  }
}

/** A stored value that counts as "none": null, or only whitespace — exactly how a card reads it (`shortTitleFor`). */
const isEmpty = (v: string | null | undefined): boolean => typeof v !== "string" || v.trim() === "";
/** A value as a page showed it: "" and whitespace are "none", as they are everywhere else. */
const asShown = (v: string | null | undefined): string | null => (isEmpty(v) ? null : (v as string));

const same = (a: MarketShortTitleFields, b: MarketShortTitleFields) => SHORT_TITLE_FIELDS.every((k) => a[k] === b[k]);

/**
 * The languages an act gave a NEW, present short title — what the sentinel reads by default after a write. A language
 * cleared by the act has nothing to check. Exported so the admin action labels the same languages the service checked.
 */
export function changedShortTitleLocales(before: MarketShortTitleFields, after: MarketShortTitleFields): Locale[] {
  return SHORT_TITLE_LOCALES.filter((loc) => after[FIELD[loc]] !== before[FIELD[loc]] && shortTitleFor(loc, after) !== null);
}

export type ShortTitleVerdictLine = { kind: "agrees" | "disagrees" | "unchecked"; text: string };

/**
 * ONE LINE PER LANGUAGE, IN WORDS — "agrees", "does not agree: <issue>" or "not checked: <reason>", for the languages
 * the act checked. ⛔ Three outcomes and only three, and anything unreadable is the third. Nothing checked, no lines.
 */
export function agreementVerdictLines(
  record: ShortTitleAgreementRecord | null | undefined,
  locales: readonly Locale[],
): Partial<Record<Locale, ShortTitleVerdictLine>> {
  const out: Partial<Record<Locale, ShortTitleVerdictLine>> = {};
  if (!record) return out;
  for (const loc of locales) {
    if (record.status !== "checked") {
      out[loc] = { kind: "unchecked", text: `not checked: ${record.reason?.trim() || "the sentinel gave no reason"}` };
      continue;
    }
    const v = record.perLocale[loc];
    if (!v || typeof v.agrees !== "boolean") continue; // not asked about (cleared meanwhile) — no line, never "agrees"
    out[loc] = v.agrees ? { kind: "agrees", text: "agrees" } : { kind: "disagrees", text: `does not agree: ${v.issue ?? "The sentinel gave no reason."}` };
  }
  return out;
}

/* ─── The sentinel, and its one test seam ─────────────────────────────────────────────────────────────────────── */

type AgreementChecker = (input: Parameters<typeof checkShortTitleAgreement>[0]) => Promise<ShortTitleAgreement>;
const REAL_CHECKER: AgreementChecker = (input) => checkShortTitleAgreement(input);
let agreementChecker: AgreementChecker = REAL_CHECKER;

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code. Stands a fake in for the sentinel's
 * `checkShortTitleAgreement` (so a suite can drive "agrees", "does not agree", "not checked" and a throw without a key
 * or a network), or puts the real one back (`null`). Refuses in production.
 */
export function __setShortTitleSentinelForTests(fn: AgreementChecker | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setShortTitleSentinelForTests is a test seam and refuses to run in production.");
  agreementChecker = fn ?? REAL_CHECKER;
}

const errText = (err: unknown) => String((err as Error)?.message ?? err).slice(0, 160);

/** The sentinel's answer → the record. ⛔ STRICT, like `parseAgreementVerdict`: a language asked about and not answered
 *  with a real yes or no makes the WHOLE answer unread — "not checked", never a partial "agrees". */
function toRecord(answer: unknown, asked: readonly Locale[]): ShortTitleAgreementRecord {
  if (!answer || typeof answer !== "object") return { status: "unchecked", reason: "the sentinel's answer could not be read", perLocale: {} };
  const a = answer as { status?: unknown; reason?: unknown; languages?: unknown };
  if (a.status !== "checked") {
    return { status: "unchecked", reason: typeof a.reason === "string" && a.reason.trim() ? a.reason.trim() : "the sentinel gave no reason", perLocale: {} };
  }
  const langs = (a.languages && typeof a.languages === "object" ? a.languages : {}) as Record<string, unknown>;
  const perLocale: ShortTitleAgreementRecord["perLocale"] = {};
  for (const loc of asked) {
    const v = langs[loc] as { agrees?: unknown; issue?: unknown } | null | undefined;
    if (!v || typeof v !== "object" || typeof v.agrees !== "boolean") {
      return { status: "unchecked", reason: `the sentinel's answer left out the ${LANG[loc]} short title`, perLocale: {} };
    }
    const issue = typeof v.issue === "string" && v.issue.trim() ? v.issue.trim() : null;
    perLocale[loc] = { agrees: v.agrees, issue: v.agrees ? null : (issue ?? "The sentinel gave no reason.") };
  }
  return { status: "checked", perLocale };
}

/**
 * ⭐ ASK THE SENTINEL ABOUT A MARKET'S CURRENT SHORT TITLES, AND PUT ITS ANSWER ON THE RECORD.
 *
 * Reads the market FRESH (no lock — this runs after a write has landed, never inside one), sends the named languages'
 * current short titles to `checkShortTitleAgreement` (budgeted, metered, never approves), and writes an ADMIN audit row
 * `market.short_title_checked` with the words checked and, per language, the verdict — or "unchecked" and the reason.
 *
 * ⛔ NEVER THROWS and never blocks: every failure is an "unchecked" record. Null when there was nothing to check (no
 * language named, no such market, an Up & Down round, or none of the named languages has a short title).
 */
export async function recordShortTitleAgreement(opts: {
  marketId: string;
  officerId: string;
  locales: readonly Locale[];
  via: "edit" | "backfill" | "create";
}): Promise<ShortTitleAgreementRecord | null> {
  const wanted = SHORT_TITLE_LOCALES.filter((loc) => Array.isArray(opts.locales) && opts.locales.includes(loc));
  if (wanted.length === 0 || typeof opts.marketId !== "string" || !opts.marketId) return null;
  const actorId = typeof opts.officerId === "string" && opts.officerId ? opts.officerId : null;
  const note = "The sentinel's reading of the card wording only — it never approves or changes anything.";
  try {
    const m = await marketStore.get(opts.marketId);
    if (!m || m.productLine === "UPDOWN") return null;
    const shorts: Partial<Record<Locale, string>> = {};
    for (const loc of wanted) {
      const v = shortTitleFor(loc, m);
      if (v) shorts[loc] = v;
    }
    const languages = wanted.filter((loc) => shorts[loc] !== undefined);
    if (languages.length === 0) return null;

    let answer: unknown;
    try {
      answer = await agreementChecker({
        market: { id: m.id, titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh, category: m.category, resolutionCriterion: m.resolutionCriterion },
        shorts,
        subject: { type: "market", id: m.id },
      });
    } catch (err) {
      answer = { status: "unchecked", reason: `the sentinel's check failed (${errText(err)})` };
    }
    const record = toRecord(answer, languages);
    const verdicts: Partial<Record<Locale, { agrees: boolean; issue: string | null } | { unchecked: true; reason: string }>> = {};
    for (const loc of languages) {
      const v = record.perLocale[loc];
      verdicts[loc] = record.status === "checked" && v ? v : { unchecked: true, reason: record.reason ?? "the sentinel gave no reason" };
    }
    const model = (answer as { model?: unknown } | null)?.model;
    await audit({
      category: "ADMIN",
      action: "market.short_title_checked",
      actorId,
      targetType: "Market",
      targetId: m.id,
      payload: {
        via: opts.via,
        languages,
        checked: shorts,
        status: record.status,
        verdicts,
        ...(record.status === "unchecked" ? { reason: record.reason } : {}),
        ...(record.status === "checked" && typeof model === "string" ? { model } : {}),
        note,
      },
    });
    return record;
  } catch (err) {
    const record: ShortTitleAgreementRecord = { status: "unchecked", reason: `the check could not run (${errText(err)})`, perLocale: {} };
    try {
      await audit({
        category: "ADMIN",
        action: "market.short_title_checked",
        actorId,
        targetType: "Market",
        targetId: opts.marketId,
        payload: { via: opts.via, languages: wanted, status: "unchecked", reason: record.reason, note },
      });
    } catch { /* `audit()` never rejects; this is the belt to that */ }
    return record;
  }
}

/* ─── The one write ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ⭐ APPLY SHORT TITLES (and/or the competition) TO ONE MARKET. Never throws on a refusal — every refusal is a value.
 * @param opts.via             "edit" (an officer's edit) or "backfill" (an approved draft) — the audit action differs.
 * @param opts.draftRef        optional: the draft this came from, carried into the audit row.
 * @param opts.onlyIfEmpty     these fields are written ONLY if the market still has none when the lock is taken (judged
 *                             on the fresh read inside it); otherwise they are left alone and listed in `skipped`.
 * @param opts.expectedBefore  what the officer's page showed for these fields. If the fresh read inside the lock differs
 *                             from any of them, the act is refused, naming the field, and nothing changes.
 * @param opts.auditExtra      merged into the audit row's payload (it can never overwrite what the act itself records).
 * @param opts.sentinelLocales which languages the sentinel reads after the write lands: "changed" (default — every
 *                             language this act gave a new short title), a list, or "none".
 */
export async function applyShortTitles(opts: {
  marketId: string;
  officerId: string;
  input: ShortTitleEditInput;
  via: "edit" | "backfill";
  draftRef?: string | null;
  onlyIfEmpty?: ShortTitleField[];
  expectedBefore?: Partial<Record<ShortTitleField, string | null>>;
  auditExtra?: Record<string, unknown>;
  sentinelLocales?: Locale[] | "changed" | "none";
}): Promise<ShortTitleEditResult> {
  const { marketId, officerId } = opts;
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named." };
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };
  const input: ShortTitleEditInput = opts.input ?? {};
  const onlyIfEmpty = new Set<ShortTitleField>(Array.isArray(opts.onlyIfEmpty) ? opts.onlyIfEmpty : []);
  const expected: Partial<Record<ShortTitleField, string | null>> =
    opts.expectedBefore && typeof opts.expectedBefore === "object" ? opts.expectedBefore : {};

  type Refusal = { ok: false; error: string; field?: ShortTitleField };
  type Landed = {
    changed: boolean;
    before: MarketShortTitleFields;
    after: MarketShortTitleFields;
    warnings: Record<Locale, ShortTitleIssue[]>;
    skipped: ShortTitleField[];
    titleEn: string;
  };
  const inLock = await withLock(`market:${marketId}`, async (tx): Promise<Landed | Refusal> => {
    const m = await marketStore.get(marketId, tx);
    if (!m) return { ok: false, error: "Market not found." };
    if (m.productLine === "UPDOWN") return { ok: false, error: "An Up & Down round has no short title — its round card is built from the asset." };
    const before: MarketShortTitleFields = {
      shortTitleEn: m.shortTitleEn ?? null,
      shortTitleSw: m.shortTitleSw ?? null,
      shortTitleZh: m.shortTitleZh ?? null,
      competition: m.competition ?? null, // RAW — see the header
    };

    // ⭐ EXPECTED BEFORE — judged on THIS read. Another officer's words are never silently overwritten.
    for (const f of SHORT_TITLE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(expected, f) || expected[f] === undefined) continue;
      if (asShown(expected[f]) !== asShown(before[f])) {
        return { ok: false, field: f, error: `${FIELD_LABEL[f]} was changed by someone else since this page loaded. Reload to see it. Nothing changed.` };
      }
    }

    // ⭐ ONLY IF EMPTY — judged on THIS read, so a value set a moment ago is never overwritten by a stale proposal.
    const eff: ShortTitleEditInput = {
      shortTitleEn: input.shortTitleEn, shortTitleSw: input.shortTitleSw, shortTitleZh: input.shortTitleZh, competition: input.competition,
    };
    const skipped: ShortTitleField[] = [];
    for (const f of SHORT_TITLE_FIELDS) {
      if (eff[f] === undefined || !onlyIfEmpty.has(f) || isEmpty(before[f])) continue;
      eff[f] = undefined;
      skipped.push(f);
    }

    // THE RULES — on what the act writes; an untouched field keeps its stored value, and refuses only what THIS act made.
    const touched = (k: TitleField) => eff[k] !== undefined;
    const pick = (k: TitleField) => (touched(k) ? eff[k] : before[k]);
    const titles = { titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh };
    const set = normaliseShortTitleSet({ ...titles, shortTitleEn: pick("shortTitleEn"), shortTitleSw: pick("shortTitleSw"), shortTitleZh: pick("shortTitleZh") });
    const stored = normaliseShortTitleSet({ ...titles, shortTitleEn: before.shortTitleEn, shortTitleSw: before.shortTitleSw, shortTitleZh: before.shortTitleZh });
    for (const loc of SHORT_TITLE_LOCALES) {
      if (!set.hard[loc]) continue;
      const k = FIELD[loc];
      const hardNow = set.issues[loc].filter((i) => HARD_ISSUES.has(i));
      const made = touched(k) ? hardNow : hardNow.filter((i) => !stored.issues[loc].includes(i));
      if (made.length === 0) continue; // a problem the stored value already had — not this act's to refuse
      return { ok: false, error: `${shortTitleIssueSentence(loc, made[0], pick(k))} Nothing changed.`, field: k };
    }

    let competition: string | null = before.competition;
    if (eff.competition !== undefined) {
      const raw = typeof eff.competition === "string" ? eff.competition.trim() : "";
      if (raw === "") competition = null;
      else if (isCompetition(raw) || raw === before.competition) competition = raw; // re-sending the stored key is not a new value
      else return { ok: false, error: `"${raw}" is not a competition this build knows. Nothing changed.`, field: "competition" };
    }
    const after: MarketShortTitleFields = {
      shortTitleEn: touched("shortTitleEn") ? set.shortTitleEn : before.shortTitleEn,
      shortTitleSw: touched("shortTitleSw") ? set.shortTitleSw : before.shortTitleSw,
      shortTitleZh: touched("shortTitleZh") ? set.shortTitleZh : before.shortTitleZh,
      competition,
    };
    const warnings = { en: set.issues.en, sw: set.issues.sw, zh: set.issues.zh };
    if (same(before, after)) return { changed: false, before, after, warnings, skipped, titleEn: m.titleEn };
    await marketStore.setShortTitles(marketId, after, tx);
    return { changed: true, before, after, warnings, skipped, titleEn: m.titleEn };
  });

  if ("ok" in inLock) return inLock;
  const landed = { before: inLock.before, after: inLock.after, warnings: inLock.warnings, skipped: inLock.skipped };
  if (!inLock.changed) return { ok: true, changed: false, ...landed, recorded: true, agreement: null };
  const row = await audit({
    category: "ADMIN",
    action: opts.via === "backfill" ? "market.short_title_approved" : "market.short_title_edited",
    actorId: officerId,
    targetType: "Market",
    targetId: marketId,
    payload: {
      // FIRST, so an extra can add to the record and never overwrite what the act itself says it did.
      ...(opts.auditExtra && typeof opts.auditExtra === "object" ? opts.auditExtra : {}),
      before: inLock.before,
      after: inLock.after,
      titleEn: inLock.titleEn,
      warnings: inLock.warnings,
      ...(inLock.skipped.length ? { skipped: inLock.skipped } : {}),
      ...(opts.draftRef ? { draft: opts.draftRef } : {}),
      note: "Card wording only — the full question, the criterion, the source, pools and stakes are untouched.",
    },
  });

  // ⭐ THE SENTINEL — after the write landed and after its record, OUTSIDE the lock. Never blocks, never fails the act.
  const spec = opts.sentinelLocales ?? "changed";
  const locales: Locale[] = spec === "none" ? [] : Array.isArray(spec) ? spec : changedShortTitleLocales(inLock.before, inLock.after);
  const agreement = locales.length > 0
    ? await recordShortTitleAgreement({ marketId, officerId, locales, via: opts.via })
    : null;
  return { ok: true, changed: true, ...landed, recorded: row.recorded, agreement };
}
