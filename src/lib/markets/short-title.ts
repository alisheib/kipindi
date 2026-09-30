/**
 * THE SHORT TITLE — its rules, in ONE pure module (the Vodacom plan S2, 2026-09-30; ruling SJ-8; COMPLIANCE
 * 2026-09-29 §6 "Short titles and competition labels").
 *
 * A market's short title is the question a card shows: at most two lines at 360 px, in the reader's language. It
 * is an AID to reading the market, never the market: the full question, the resolution criterion and the source
 * stay on the market's page unchanged, and resolution is judged against the English criterion as before.
 *
 * The rules, and every writer reads them from here (the AI generator, the admin edit, the backfill, the fit test):
 *   · LENGTH — `SHORT_TITLE_MAX`, counted in CODE POINTS (`Array.from`), not UTF-16 units: sw/en ≤ 56, zh ≤ 28.
 *   · FORM — Swahili "Je, …?" (the deck's own form); English ends in "?"; Chinese ends in "？" (or "?").
 *   · GSM-7 — sw and en only, after `foldToGsm7`: the short title travels in SMS and push as well as on cards.
 *     Chinese is UCS-2 by definition and is never held to it.
 *   · NOT ENGLISH IN DISGUISE — a Swahili or Chinese short title equal to the English one is refused (the F8
 *     rule: a copy would make "nobody wrote this" and "this is the translation" indistinguishable).
 *   · NUMBERS — every digit run in the short title must appear in the full title (a cheap drift check, before the
 *     sentinel's agreement check). A WARNING: shown to the officer, never silently stored by the AI.
 *
 * ⛔ NULL MEANS "NO SHORT TITLE" — never a copy of the full title. The card then shows the reader's OWN full title
 * (`cardTitle`), clamped to two lines by its CSS. ⛔ `pickLocalized` is the wrong helper for short titles: it falls
 * back to ENGLISH, and a Swahili reader must never be shown the English short question.
 *
 * Pure: its imports are pure modules too (`localized.ts` is type-only plus one function; `sms-compose.ts` is
 * zero-import). Pinned in `test:client-graph-safe`.
 */
import type { Locale } from "@/lib/i18n-dict";
import { pickLocalized } from "@/lib/localized";
import { encodingFor, foldToGsm7 } from "@/lib/sms-compose";

/** The ONE budget. ⛔ Written nowhere else — the generator's prompt, the admin counter and the fit test read it. */
export const SHORT_TITLE_MAX: Readonly<Record<Locale, number>> = { en: 56, sw: 56, zh: 28 };

export const SHORT_TITLE_LOCALES: readonly Locale[] = ["en", "sw", "zh"] as const;

export type ShortTitleIssue =
  | "too_long"      // over SHORT_TITLE_MAX in code points
  | "not_gsm7"      // sw/en: a character with no GSM-7 twin survived the fold
  | "form"          // sw not "Je, …?"; en not ending "?"; zh not ending "？"/"?"
  | "copied_english"// sw/zh equal to the English full or short title
  | "number_drift"; // a digit run the full title does not contain (WARNING)

/** Issues that REFUSE a value. `number_drift` is a warning an officer may accept after reading it. */
export const HARD_ISSUES: ReadonlySet<ShortTitleIssue> = new Set(["too_long", "not_gsm7", "form", "copied_english"]);

/** Length in code points — what a reader and the budget count, not `String.length`. */
export function codePoints(s: string): number {
  return Array.from(s).length;
}

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Trim, collapse inner whitespace, drop zero-width characters, and fold sw/en onto GSM-7. Never throws. */
export function cleanShortTitle(locale: Locale, raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tidy = raw.replace(ZERO_WIDTH, "").replace(/\s+/g, " ").trim();
  return locale === "zh" ? tidy : foldToGsm7(tidy).replace(/\s+/g, " ").trim();
}

/** What the value is checked against: the full title in the SAME language, and the English full and short titles. */
export type ShortTitleContext = {
  full: string;
  englishFull: string;
  englishShort?: string | null;
};

const digitRuns = (s: string) => s.match(/\d+(?:[.,]\d+)*/g) ?? [];

/** Every issue with an already-cleaned value. An empty value has none — it is simply "no short title". */
export function shortTitleIssues(locale: Locale, value: string, ctx: ShortTitleContext): ShortTitleIssue[] {
  const out: ShortTitleIssue[] = [];
  if (!value) return out;
  if (codePoints(value) > SHORT_TITLE_MAX[locale]) out.push("too_long");
  if (locale !== "zh" && encodingFor(value) !== "GSM7") out.push("not_gsm7");
  const formOk = locale === "sw" ? /^Je, \S[\s\S]*\?$/u.test(value) : locale === "en" ? /\?$/.test(value) : /[？?]$/u.test(value);
  if (!formOk) out.push("form");
  if (locale !== "en") {
    const en = [ctx.englishFull, ctx.englishShort ?? ""].map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (en.includes(value)) out.push("copied_english");
  }
  const full = `${ctx.full} ${ctx.englishFull}`;
  if (digitRuns(value).some((d) => !full.includes(d))) out.push("number_drift");
  return out;
}

/** The result of normalising one value: what to STORE (null when absent or refused) and every issue found. */
export type NormalisedShortTitle = { value: string | null; issues: ShortTitleIssue[]; hard: boolean };

/**
 * Clean, check, decide. `value` is null for an empty input, and for any HARD issue — so a caller that skipped the
 * check still cannot store a bad short title. `strict` (the AI and the backfill) also refuses on a warning: a
 * machine does not get to accept its own number drift; an officer does.
 */
export function normaliseShortTitle(
  locale: Locale,
  raw: unknown,
  ctx: ShortTitleContext,
  opts: { strict?: boolean } = {},
): NormalisedShortTitle {
  const v = cleanShortTitle(locale, raw);
  if (!v) return { value: null, issues: [], hard: false };
  const issues = shortTitleIssues(locale, v, ctx);
  const hard = issues.some((i) => HARD_ISSUES.has(i)) || (opts.strict === true && issues.length > 0);
  return { value: hard ? null : v, issues, hard };
}

/**
 * ⭐ ALL THREE LANGUAGES AT ONCE — what `createMarket` and every writer store. English first, so the Swahili and
 * Chinese checks can refuse a copy of the English SHORT title as well as of the full one. Each language's full title
 * falls back to the English one only where the market has none in that language (the card does the same).
 */
export function normaliseShortTitleSet(
  m: { titleEn: string; titleSw?: string | null; titleZh?: string | null; shortTitleEn?: unknown; shortTitleSw?: unknown; shortTitleZh?: unknown },
  opts: { strict?: boolean } = {},
): {
  shortTitleEn: string | null;
  shortTitleSw: string | null;
  shortTitleZh: string | null;
  issues: Record<Locale, ShortTitleIssue[]>;
  hard: Record<Locale, boolean>;
} {
  const en = normaliseShortTitle("en", m.shortTitleEn, { full: m.titleEn, englishFull: m.titleEn }, opts);
  const sw = normaliseShortTitle("sw", m.shortTitleSw, { full: m.titleSw?.trim() ? m.titleSw : m.titleEn, englishFull: m.titleEn, englishShort: en.value }, opts);
  const zh = normaliseShortTitle("zh", m.shortTitleZh, { full: m.titleZh?.trim() ? m.titleZh : m.titleEn, englishFull: m.titleEn, englishShort: en.value }, opts);
  return {
    shortTitleEn: en.value,
    shortTitleSw: sw.value,
    shortTitleZh: zh.value,
    issues: { en: en.issues, sw: sw.issues, zh: zh.issues },
    hard: { en: en.hard, sw: sw.hard, zh: zh.hard },
  };
}

/** The four fields a market carries. Optional, because rows read before the columns existed have none. */
export type ShortTitleFields = {
  shortTitleEn?: string | null;
  shortTitleSw?: string | null;
  shortTitleZh?: string | null;
};

/** The short title in EXACTLY this language, or null. ⛔ No cross-language fallback. */
export function shortTitleFor(locale: Locale, m: ShortTitleFields): string | null {
  const v = locale === "sw" ? m.shortTitleSw : locale === "zh" ? m.shortTitleZh : m.shortTitleEn;
  return typeof v === "string" && v.trim() ? v : null;
}

/**
 * ⭐ WHAT A CARD SHOWS: the reader's short title, or the reader's FULL title (the same one every card shows today —
 * `pickLocalized` over the FULL titles, which is where its English fallback belongs). `short` says which, so a card
 * can clamp only the fallback.
 */
export function cardTitle(
  locale: Locale,
  m: ShortTitleFields & { titleEn: string; titleSw: string; titleZh: string | null },
): { text: string; short: boolean } {
  const short = shortTitleFor(locale, m);
  return short ? { text: short, short: true } : { text: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), short: false };
}
