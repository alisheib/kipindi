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
 *   · FORM — Swahili "Je, …?" (the deck's own form); English ends in "?"; Chinese ends in the full-width "？" only
 *     (`cleanShortTitle` turns a Chinese value's trailing ASCII "?" into it, so a typed "?" is never a refusal).
 *   · GSM-7 — sw and en only, after `foldToGsm7`: the short title travels in SMS and push as well as on cards.
 *     Chinese is UCS-2 by definition and is never held to it.
 *   · NOT ENGLISH IN DISGUISE — a Swahili or Chinese short title that IS the English full or short title is refused
 *     (the F8 rule: a copy would make "nobody wrote this" and "this is the translation" indistinguishable). Compared
 *     on a KEY, not byte for byte, so a change of case, spacing, curly quotes, the closing mark or a Swahili "Je, "
 *     in front is still a copy; and a Chinese one with no Chinese character in it at all is refused the same way.
 *   · NUMBERS — every number in the short title must be a number of the full title (whole numbers, not substrings:
 *     "5" is not in "2.5", "10,000" is not in "110,000"; "2,700" and "2700" are the same number). A cheap drift
 *     check before the sentinel's agreement check, and a WARNING: shown to the officer; a machine's own drift is
 *     refused (`strict`) — except where the language has no full title of its own and the English one stands in.
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
import { encodingFor, foldToGsm7, offendingChars } from "@/lib/sms-compose";

/** The ONE budget. ⛔ Written nowhere else — the generator's prompt, the admin counter and the fit test read it. */
export const SHORT_TITLE_MAX: Readonly<Record<Locale, number>> = { en: 56, sw: 56, zh: 28 };

export const SHORT_TITLE_LOCALES: readonly Locale[] = ["en", "sw", "zh"] as const;

export type ShortTitleIssue =
  | "too_long"      // over SHORT_TITLE_MAX in code points
  | "not_gsm7"      // sw/en: a character with no GSM-7 twin survived the fold
  | "form"          // sw not "Je, …?"; en not ending "?"; zh not ending "？"
  | "copied_english"// sw/zh: the English full or short title under a thin disguise; zh: no Chinese character at all
  | "number_drift"; // a number the full title does not have (WARNING)

/** Issues that REFUSE a value. `number_drift` is a warning an officer may accept after reading it. */
export const HARD_ISSUES: ReadonlySet<ShortTitleIssue> = new Set(["too_long", "not_gsm7", "form", "copied_english"]);

/** Length in code points — what a reader and the budget count, not `String.length`. */
export function codePoints(s: string): number {
  return Array.from(s).length;
}

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

/**
 * The full-width question mark a Chinese short title closes with. BUILT, never pasted: an editor can quietly turn a
 * pasted one into its ASCII twin, and the rule would then test nothing.
 */
const FW_QUESTION = String.fromCharCode(0xff1f);
/** Any Han (Chinese) character — what makes a Chinese short title Chinese. */
const HAN = /\p{Script=Han}/u;
/** A Chinese value's closing mark — ASCII or full-width, one or a run of them — with any space typed before it. */
const ZH_CLOSE = new RegExp(`\\s*[?${FW_QUESTION}]+$`, "u");

/** True when the text has at least one Chinese (Han) character. */
export function hasHan(s: string): boolean {
  return HAN.test(s);
}

/**
 * Trim, collapse inner whitespace, drop zero-width characters, and fold sw/en onto GSM-7. A CHINESE value with a
 * Chinese character in it closes with ONE full-width "？": a typed ASCII "?" becomes it, a doubled mark becomes one,
 * and a space before the mark goes. Only then — a value with no Chinese in it is left as typed, so the rule refuses
 * it for what it is (not Chinese), never for its punctuation. Never throws.
 */
export function cleanShortTitle(locale: Locale, raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tidy = raw.replace(ZERO_WIDTH, "").replace(/\s+/g, " ").trim();
  if (locale !== "zh") return foldToGsm7(tidy).replace(/\s+/g, " ").trim();
  return HAN.test(tidy) ? tidy.replace(ZH_CLOSE, FW_QUESTION) : tidy;
}

/** What the value is checked against: the full title in the SAME language, and the English full and short titles. */
export type ShortTitleContext = {
  full: string;
  englishFull: string;
  englishShort?: string | null;
  /**
   * True when this language has no full title of its own and the ENGLISH one stands in (a market with a blank
   * `titleSw`, or no `titleZh`). The number check then holds a translation to English digits — a correct Chinese
   * title writes "$150,000" as "15万" — so `strict` keeps a number drift a WARNING here instead of refusing it.
   */
  fullIsFallback?: boolean;
};

/**
 * The key the copy rule compares on — never the bytes. Compatibility forms unified (a full-width letter or mark is its
 * plain twin), folded onto GSM-7 on BOTH sides, Chinese included, for the comparison only (curly quotes, dashes, the
 * ellipsis), lower case, one space, no closing question mark, and — for Swahili — no leading "Je, ".
 */
function copyKey(s: string, stripJe: boolean): string {
  const k = foldToGsm7(s.normalize("NFKC")).toLowerCase().replace(/\s+/g, " ").trim().replace(/\s*\?+$/, "");
  return stripJe ? k.replace(/^je\s*,\s*/, "") : k;
}

/*
 * NUMBERS — whole numbers, compared as a SET, never as substrings ("5" is not in "2.5"; "10,000" is not in
 * "110,000"). Each shape is tried in this order; a thousands group is exactly three digits after a first group of one
 * to three that does not start with 0.
 */
const THOUSANDS_COMMA = /^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?$/; // 110,000 · 1,234.5
const THOUSANDS_DOT = /^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/;   // 110.000 · 1.234,5
const PLAIN = /^\d+(?:[.,]\d+)?$/;                              // 12 · 2.5 · 2,5 (a decimal comma)

/** A number with "." as its only separator → no leading zeros, no trailing decimal zeros ("2.50" is "2.5"). */
function canonicalNumber(n: string): string {
  const [int, frac = ""] = n.split(".");
  const i = int.replace(/^0+(?=\d)/, "");
  const f = frac.replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
}

/** One run of digits and separators → its number's key; a run that is no single number ("12.10.2026") → each group. */
function numberKeys(run: string): string[] {
  if (THOUSANDS_COMMA.test(run)) return [canonicalNumber(run.replace(/,/g, ""))];
  if (THOUSANDS_DOT.test(run)) return [canonicalNumber(run.replace(/\./g, "").replace(",", "."))];
  if (PLAIN.test(run)) return [canonicalNumber(run.replace(",", "."))];
  return run.split(/[.,]/).map(canonicalNumber);
}

/** Every number a text writes, as keys. Full-width digits count (compatibility forms are unified first). */
function numberSet(s: string): Set<string> {
  return new Set((s.normalize("NFKC").match(/\d+(?:[.,]\d+)*/g) ?? []).flatMap(numberKeys));
}

/**
 * Every issue with an already-cleaned value. An empty value has none — it is simply "no short title".
 *
 * ⭐ ORDER IS MEANING: callers show the FIRST hard issue, so the copy rule comes first — a value that is not in its
 * language at all has one thing to fix, and its length or punctuation is beside the point.
 */
export function shortTitleIssues(locale: Locale, value: string, ctx: ShortTitleContext): ShortTitleIssue[] {
  const out: ShortTitleIssue[] = [];
  if (!value) return out;
  if (locale !== "en") {
    const stripJe = locale === "sw";
    const key = copyKey(value, stripJe);
    const english = [ctx.englishFull, ctx.englishShort ?? ""].map((x) => copyKey(x, stripJe)).filter(Boolean);
    if ((key !== "" && english.includes(key)) || (locale === "zh" && !HAN.test(value))) out.push("copied_english");
  }
  if (codePoints(value) > SHORT_TITLE_MAX[locale]) out.push("too_long");
  if (locale !== "zh" && encodingFor(value) !== "GSM7") out.push("not_gsm7");
  const formOk = locale === "sw" ? /^Je, \S[\s\S]*\?$/u.test(value) : locale === "en" ? /\?$/.test(value) : value.endsWith(FW_QUESTION);
  if (!formOk) out.push("form");
  const known = numberSet(`${ctx.full} ${ctx.englishFull}`);
  if ([...numberSet(value)].some((n) => !known.has(n))) out.push("number_drift");
  return out;
}

/** The result of normalising one value: what to STORE (null when absent or refused) and every issue found. */
export type NormalisedShortTitle = { value: string | null; issues: ShortTitleIssue[]; hard: boolean };

/**
 * Clean, check, decide. `value` is null for an empty input, and for any HARD issue — so a caller that skipped the
 * check still cannot store a bad short title. `strict` (the AI and the backfill) also refuses on a warning: a
 * machine does not get to accept its own number drift; an officer does. ONE exception: a drift measured against the
 * English title standing in for a missing one (`ctx.fullIsFallback`) stays a warning even in strict — a correct
 * translation writes its numbers its own way, and refusing it would leave that language with no short title at all.
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
  const strictRefuses = opts.strict === true
    && issues.some((i) => !HARD_ISSUES.has(i) && !(i === "number_drift" && ctx.fullIsFallback === true));
  const hard = issues.some((i) => HARD_ISSUES.has(i)) || strictRefuses;
  return { value: hard ? null : v, issues, hard };
}

/**
 * ⭐ ALL THREE LANGUAGES AT ONCE — what `createMarket` and every writer store. The Swahili and Chinese checks refuse a
 * copy of the English SHORT title as well as of the full one — the English short title as TYPED (cleaned), whether or
 * not it passed its own rules: a copy of English is a copy either way. Each language's full title falls back to the
 * English one only where the market has none in that language (the card does the same), and says so
 * (`fullIsFallback`), so strict does not refuse a translation for writing its numbers its own way.
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
  const englishShort = cleanShortTitle("en", m.shortTitleEn) || null;
  const swFull = m.titleSw?.trim() ? m.titleSw : null;
  const zhFull = m.titleZh?.trim() ? m.titleZh : null;
  const en = normaliseShortTitle("en", m.shortTitleEn, { full: m.titleEn, englishFull: m.titleEn }, opts);
  const sw = normaliseShortTitle("sw", m.shortTitleSw, { full: swFull ?? m.titleEn, englishFull: m.titleEn, englishShort, fullIsFallback: swFull === null }, opts);
  const zh = normaliseShortTitle("zh", m.shortTitleZh, { full: zhFull ?? m.titleEn, englishFull: m.titleEn, englishShort, fullIsFallback: zhFull === null }, opts);
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
 * can clamp only the fallback. `titleSw` may be NULL (the position projection's): `pickLocalized` reads it as absent.
 */
export function cardTitle(
  locale: Locale,
  m: ShortTitleFields & { titleEn: string; titleSw: string | null; titleZh: string | null },
): { text: string; short: boolean } {
  const short = shortTitleFor(locale, m);
  return short ? { text: short, short: true } : { text: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), short: false };
}

/* ─── THE WORDS — one wording for every surface ─────────────────────────────────────────────────────────────────────
 * The market page's control, the wizard, the drafts tab and the server's refusals all say these rules in the SAME
 * words, so the words live beside the rules (client-safe) and every surface imports them. Admin copy is English only.
 */

const LANGUAGE_NAME: Readonly<Record<Locale, string>> = { en: "English", sw: "Swahili", zh: "Chinese" };

/** Each short-title field's name, the same on the market page and the drafts tab. */
export const SHORT_TITLE_LABEL: Readonly<Record<Locale, string>> = {
  en: "English short title",
  sw: "Swahili short title",
  zh: "Chinese short title · 中文",
};

/** The rule every surface states before a short title is typed or approved — a note's title and its body. */
export const SHORT_TITLE_RULE_TITLE = "Cards show the short title instead of the full question.";
export const SHORT_TITLE_RULE_BODY =
  "The full question, the resolution criterion and the source stay unchanged on the market's page — the short title must say exactly the same thing. Leave a language empty and its card shows the full question.";

/**
 * The Swahili form as the officer copies it — “Je, …?” — with a NO-BREAK space after the comma, so the pattern never
 * breaks across two lines (it did, at 1280 and at 390). BUILT, never pasted: an invisible character is invisible in
 * review too.
 */
export const SHORT_TITLE_SW_FORM = `“Je,${String.fromCharCode(0xa0)}…?”`;

/** What the officer is told when an act landed and its audit record did not — one recipient, one noun, everywhere. */
export function shortTitleAuditMissed(what: "change" | "rejection"): string {
  return `The ${what} is saved, but its audit record was not written. Tell the Owner so the record can be completed.`;
}

/**
 * One sentence per issue, in the console's plain English — what every surface prints (the server's refusals, the
 * market page, the drafts tab, the wizard while the officer types). Each one says what to DO.
 *
 * ⭐ IT CLEANS THE VALUE ITSELF (`cleanShortTitle`: trimmed, zero-width characters dropped, sw/en folded onto GSM-7)
 * before counting or listing characters — the exact value the rule judged. So "it has N" is the count the rule
 * refused, and the characters a text message cannot carry are only those that survived the fold, whichever form of the
 * value a caller hands in (the raw text typed, or the value stored).
 */
export function shortTitleIssueSentence(locale: Locale, issue: ShortTitleIssue, value: unknown): string {
  const v = cleanShortTitle(locale, value);
  const lang = LANGUAGE_NAME[locale];
  switch (issue) {
    case "too_long":
      return `Keep the ${lang} short title to ${SHORT_TITLE_MAX[locale]} characters — it has ${codePoints(v)}.`;
    case "not_gsm7":
      return `The ${lang} short title has characters a text message cannot carry: ${offendingChars(v).join(" ")}.`;
    case "form":
      return locale === "sw"
        ? `Write the Swahili short title as a question in the form ${SHORT_TITLE_SW_FORM}.`
        : locale === "en"
          ? "Write the English short title as a question ending in “?”."
          : `Write the Chinese short title as a question ending in ${FW_QUESTION}.`;
    case "copied_english":
      // For Chinese the rule also refuses ANY value with no Chinese character, copy or not — so it says that.
      return locale === "zh"
        ? "The Chinese short title is not written in Chinese. Write it in Chinese, or leave it empty so the card shows the full question."
        : `The ${lang} short title is the English one. Write it in ${lang}, or leave it empty so the card shows the full question.`;
    case "number_drift":
      return `The ${lang} short title has a number the full question does not. Check it says the same thing.`;
  }
}
