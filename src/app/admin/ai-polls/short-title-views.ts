/**
 * The server half of /admin/ai-polls → "Short titles": turns the waiting drafts into the finished rows the client
 * panel paints (the Vodacom plan S2). Every sentence is decided HERE, on the server, from the one rule module and
 * the sentinel's one verdict reader — so the panel prints words and never judges them. (The panel decides only WHEN:
 * for instance, that a language's words no longer match the ones the sentinel read.)
 *
 * ⛔ English only (admin copy), and neutral vocabulary only.
 */
import { dict, type Locale } from "@/lib/i18n-dict";
import { formatDateTimeSafe } from "@/lib/utils";
import { SHORT_TITLE_LOCALES, shortTitleFor } from "@/lib/markets/short-title";
import { COMPETITIONS, normaliseCompetition } from "@/lib/markets/competitions";
import { competitionLabel } from "@/lib/markets/competition-label";
import { shortTitleIssueSentence } from "@/lib/server/short-title-service";
import { agreementLine } from "@/lib/server/market-sentinel";
import type { ShortTitleDraftRow } from "@/lib/server/short-title-backfill";
import type { ShortTitleDraftView, CompetitionOption } from "./short-title-drafts";

const LANGUAGE: Record<Locale, string> = { en: "English", sw: "Swahili", zh: "Chinese" };

/** ⛔ What the edit form's verdict line says once a language's words differ from the ones the sentinel read — the old
 *  verdict was about different words, so it is never shown against the new ones. */
export const EDITED_AFTER_CHECK = "not checked — edited after the check";

/** The competition choices, in the ONE list's order, with the dictionary's English labels. */
export function competitionOptions(): CompetitionOption[] {
  return COMPETITIONS.map((c) => ({ value: c, label: competitionLabel(dict.en, c) }));
}

/** A competition as the officer reads it. Coerced only HERE, for display: a stored key this build no longer knows is
 *  shown as it is stored, and said to be unknown — never shown as "none", which would hide a value the market has. */
const label = (c: string | null | undefined): string | null => {
  const k = normaliseCompetition(c);
  if (k) return competitionLabel(dict.en, k);
  return typeof c === "string" && c.trim() ? `${c.trim()} (not a competition this build knows)` : null;
};

/** One waiting draft → the row the panel paints. */
export function draftView(row: ShortTitleDraftRow): ShortTitleDraftView {
  const { draft, market } = row;
  return {
    marketId: market.id,
    question: market.titleEn,
    questionSw: market.titleSw,
    questionZh: market.titleZh ?? null,
    draftedAtLabel: formatDateTimeSafe(draft.draftedAt),
    languages: SHORT_TITLE_LOCALES.map((loc) => {
      const missing = draft.missing.includes(loc) && !shortTitleFor(loc, market);
      const drafted = missing ? draft[loc] : null;
      const refused = missing ? (draft.refused[loc] ?? null) : null;
      return {
        loc,
        language: LANGUAGE[loc],
        current: shortTitleFor(loc, market),
        missing,
        drafted,
        refused,
        issues: missing ? draft.issues[loc].map((i) => shortTitleIssueSentence(loc, i, refused ?? drafted ?? "")) : [],
        verdict: drafted ? agreementLine(draft.agreement, loc) : null,
      };
    }),
    competition: {
      current: market.competition ?? null,
      currentLabel: label(market.competition),
      drafted: market.competition ? null : draft.competition,
      draftedLabel: market.competition ? null : label(draft.competition),
    },
    uncheckedReason: draft.agreement.status === "unchecked" ? draft.agreement.reason : null,
    editedVerdictText: EDITED_AFTER_CHECK,
  };
}
