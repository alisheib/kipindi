/**
 * APPLYING SHORT TITLES TO A MARKET — the ONE write path after creation (the Vodacom plan S2, 2026-09-30).
 *
 * Two callers, one function: the admin edit on `/admin/markets/[id]` ("via: edit") and the approval of a backfill draft
 * ("via: backfill"). Both need the same four guarantees, so neither spells them itself:
 *   1. THE RULES — every value goes through `normaliseShortTitleSet` (`lib/markets/short-title.ts`) against the market's
 *      OWN full titles, read inside the lock. A hard issue refuses the whole act and names the field; a warning (a
 *      number the full question does not contain) is returned so the officer sees it, and does not refuse.
 *   2. THE LOCK — `withLock(market:<id>)`, the lock the bet path holds, with a fresh read inside it and the narrow
 *      `marketStore.setShortTitles` write (four columns, never the full-row `set`, never `stamp`). A stake that lands
 *      at the same moment is never overwritten.
 *   3. THE RECORD — an ADMIN audit row carrying the values BEFORE and AFTER (`market.short_title_edited` or
 *      `market.short_title_approved`). ⛔ `audit()` never rejects: `recorded` says whether the row is on file.
 *   4. SCOPE — a long-form market only. An Up & Down round is never a card and is out of S2.
 *
 * `undefined` for a field means "leave it as it is"; `null` or "" means "clear it" (the card then shows the full title).
 */
import type { Locale } from "@/lib/i18n-dict";
import { audit } from "./audit";
import { withLock } from "./locks";
import { marketStore, type MarketShortTitleFields } from "./market-dal";
import { SHORT_TITLE_MAX, codePoints, normaliseShortTitleSet, type ShortTitleIssue } from "@/lib/markets/short-title";
import { isCompetition, type Competition } from "@/lib/markets/competitions";
import { offendingChars } from "@/lib/sms-compose";

export type ShortTitleField = "shortTitleEn" | "shortTitleSw" | "shortTitleZh" | "competition";

export type ShortTitleEditInput = {
  shortTitleEn?: string | null;
  shortTitleSw?: string | null;
  shortTitleZh?: string | null;
  competition?: string | null;
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
  }
  | { ok: false; error: string; field?: ShortTitleField };

const LANG: Record<Locale, string> = { en: "English", sw: "Swahili", zh: "Chinese" };
const FIELD: Record<Locale, ShortTitleField> = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };

/** One sentence per refusal, in the console's plain English. Exported for the admin control and the suites. */
export function shortTitleIssueSentence(locale: Locale, issue: ShortTitleIssue, value: string): string {
  switch (issue) {
    case "too_long":
      return `Keep the ${LANG[locale]} short title to ${SHORT_TITLE_MAX[locale]} characters — it has ${codePoints(value)}.`;
    case "not_gsm7":
      return `The ${LANG[locale]} short title has characters a text message cannot carry: ${offendingChars(value).join(" ")}.`;
    case "form":
      return locale === "sw"
        ? "A Swahili short title is a question in the form “Je, …?”."
        : locale === "en"
          ? "An English short title is a question ending in “?”."
          : "A Chinese short title is a question ending in “？”.";
    case "copied_english":
      return `The ${LANG[locale]} short title is the English one. Write it in ${LANG[locale]}, or leave it empty so the card shows the full question.`;
    case "number_drift":
      return `The ${LANG[locale]} short title has a number the full question does not. Check it says the same thing.`;
  }
}

const same = (a: MarketShortTitleFields, b: MarketShortTitleFields) =>
  a.shortTitleEn === b.shortTitleEn && a.shortTitleSw === b.shortTitleSw && a.shortTitleZh === b.shortTitleZh && a.competition === b.competition;

/**
 * ⭐ APPLY SHORT TITLES (and/or the competition) TO ONE MARKET. Never throws on a refusal — every refusal is a value.
 * @param opts.via       "edit" (an officer's edit) or "backfill" (an approved draft) — only the audit action differs.
 * @param opts.draftRef  optional: the draft this came from, carried into the audit row.
 */
export async function applyShortTitles(opts: {
  marketId: string;
  officerId: string;
  input: ShortTitleEditInput;
  via: "edit" | "backfill";
  draftRef?: string | null;
}): Promise<ShortTitleEditResult> {
  const { marketId, officerId, input } = opts;
  if (typeof marketId !== "string" || !marketId) return { ok: false, error: "No market was named." };
  if (typeof officerId !== "string" || !officerId) return { ok: false, error: "Your session ended — sign in again. Nothing changed." };

  type Landed = { changed: boolean; before: MarketShortTitleFields; after: MarketShortTitleFields; warnings: Record<Locale, ShortTitleIssue[]>; titleEn: string };
  const inLock = await withLock(`market:${marketId}`, async (tx): Promise<Landed | { ok: false; error: string; field?: ShortTitleField }> => {
    const m = await marketStore.get(marketId, tx);
    if (!m) return { ok: false, error: "Market not found." };
    if (m.productLine === "UPDOWN") return { ok: false, error: "An Up & Down round has no short title — its round card is built from the asset." };
    const before: MarketShortTitleFields = {
      shortTitleEn: m.shortTitleEn ?? null,
      shortTitleSw: m.shortTitleSw ?? null,
      shortTitleZh: m.shortTitleZh ?? null,
      competition: m.competition ?? null,
    };
    const pick = (k: "shortTitleEn" | "shortTitleSw" | "shortTitleZh") => (input[k] === undefined ? before[k] : input[k]);
    const set = normaliseShortTitleSet({
      titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
      shortTitleEn: pick("shortTitleEn"), shortTitleSw: pick("shortTitleSw"), shortTitleZh: pick("shortTitleZh"),
    });
    for (const loc of ["en", "sw", "zh"] as const) {
      if (!set.hard[loc]) continue;
      const raw = pick(FIELD[loc] as "shortTitleEn" | "shortTitleSw" | "shortTitleZh");
      const firstHard = set.issues[loc].find((i) => i !== "number_drift") ?? set.issues[loc][0];
      return { ok: false, error: `${shortTitleIssueSentence(loc, firstHard, typeof raw === "string" ? raw : "")} Nothing changed.`, field: FIELD[loc] };
    }
    let competition: Competition | null = before.competition;
    if (input.competition !== undefined) {
      const raw = typeof input.competition === "string" ? input.competition.trim() : "";
      if (raw === "") competition = null;
      else if (isCompetition(raw)) competition = raw;
      else return { ok: false, error: `"${raw}" is not a competition this build knows. Nothing changed.`, field: "competition" };
    }
    const after: MarketShortTitleFields = { shortTitleEn: set.shortTitleEn, shortTitleSw: set.shortTitleSw, shortTitleZh: set.shortTitleZh, competition };
    const warnings = { en: set.issues.en, sw: set.issues.sw, zh: set.issues.zh };
    if (same(before, after)) return { changed: false, before, after, warnings, titleEn: m.titleEn };
    await marketStore.setShortTitles(marketId, after, tx);
    return { changed: true, before, after, warnings, titleEn: m.titleEn };
  });

  if ("ok" in inLock) return inLock;
  if (!inLock.changed) return { ok: true, changed: false, before: inLock.before, after: inLock.after, warnings: inLock.warnings, recorded: true };
  const row = await audit({
    category: "ADMIN",
    action: opts.via === "backfill" ? "market.short_title_approved" : "market.short_title_edited",
    actorId: officerId,
    targetType: "Market",
    targetId: marketId,
    payload: {
      before: inLock.before,
      after: inLock.after,
      titleEn: inLock.titleEn,
      warnings: inLock.warnings,
      ...(opts.draftRef ? { draft: opts.draftRef } : {}),
      note: "Card wording only — the full question, the criterion, the source, pools and stakes are untouched.",
    },
  });
  return { ok: true, changed: true, before: inLock.before, after: inLock.after, warnings: inLock.warnings, recorded: row.recorded };
}
