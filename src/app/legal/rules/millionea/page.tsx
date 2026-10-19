import { LegalHeader, LEGAL_BINDING_LANGUAGE as BINDING } from "../../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaBindingFigures } from "@/lib/server/millionea-legal";
import { MILLIONEA_RULES_VERSION } from "@/lib/millionea-rules-version";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { MillioneaPreviewMark } from "@/app/millionea/millionea-parts";
import { millioneaContent } from "../_content-millionea";

/**
 * /legal/rules/millionea — THE MASWALI MILLIONEA GAME RULES, BINDING (MASWALI-BUILD S6 item 10; MASWALI-PLAN §8 MB-69,
 * MB-70; the law is `docs/RULES.md` §2.12).
 *
 * ⛔ THE GATE FIRST (MR-2): a hidden product is a missing page — `millioneaGate()` in the page AND in its metadata, so a
 *    WITHDRAWN rollout answers this address exactly as an address that does not exist, tab title included.
 * ⛔ `force-dynamic`, for the reason the twin pages give: the figures are the reader's week's frozen rules (or the next
 *    week's), read per request — a built page would freeze a binding promise at the figures of the day it was built.
 * ⭐ NOT IN `LEGAL_NAV`, like its two siblings: `/legal/rules` is the one entry, and the chooser names this document only
 *    to a reader the rollout admits.
 * ⭐ THE VERSION IS `MILLIONEA_RULES_VERSION`, the one constant `src/lib/millionea-rules-version.ts` pins against this
 *    document's text hash — never a date typed here.
 * ⭐ AT STAFF_PREVIEW IT WEARS THE PREVIEW MARK, as every S5 page does (`gate.preview`).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  // The title obeys the gate the body obeys, and asking never rejects (`test:visual-pass-r5d` 1.4″): a hidden product's
  // address is titled as the identical 404 is — S5's Millionea pages' precedent, `millioneaDoor`.
  try {
    await millioneaGate();
  } catch {
    return notFoundMetadata();
  }
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Game Rules", sw: "Kanuni za Michezo", zh: "游戏规则" };
const TITLE: Record<Locale, string> = {
  en: "Maswali Millionea Rules",
  sw: "Kanuni za Maswali Millionea",
  zh: "Maswali Millionea 规则",
};
const SUBTITLE: Record<Locale, string> = {
  en: "Fifteen answers, one fixed-price ticket, a weekly jackpot.",
  sw: "Majibu kumi na tano, tiketi ya bei moja, jackpot ya kila wiki.",
  zh: "十五个答案，一张固定价格的彩票，每周一期大奖。",
};
const META: Record<Locale, string> = {
  en: `Version ${MILLIONEA_RULES_VERSION} · Effective on buying a ticket.`,
  sw: `Toleo ${MILLIONEA_RULES_VERSION} · Zinaanza kutumika unaponunua tiketi.`,
  zh: `版本 ${MILLIONEA_RULES_VERSION} · 自购买彩票时生效。`,
};

export default async function MillioneaRulesPage() {
  const gate = await millioneaGate();
  const { t, locale } = await getServerT();
  // B-1 · no swallow: a figure that cannot be read throws to the error boundary — a binding rulebook never prints a guess.
  const figures = await millioneaBindingFigures({ userId: gate.userId, state: gate.state });

  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        subtitle={SUBTITLE[locale]}
        meta={META[locale]}
        glyph="millionea"
      />
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {millioneaContent(figures)[locale]}
    </>
  );
}
