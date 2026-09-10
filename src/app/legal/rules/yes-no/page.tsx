import { LegalHeader, LEGAL_BINDING_LANGUAGE as BINDING } from "../../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { sideWordIn } from "@/lib/side-label";
import { getGlobalConfig } from "@/lib/server/market-config";
import { yesNoContent } from "../_content-yes-no";
import { ratesFrom } from "../_shared";

/**
 * ⛔ `force-dynamic`, for the reason `/legal/terms` gives: this page quotes LIVE config in
 * binding text. Baking it would freeze a legal promise at whatever the rates were on the day of
 * the last build — and the document would go on looking internally consistent while being false.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE(locale) };
}

const EYEBROW: Record<Locale, string> = { en: "Game Rules", sw: "Kanuni za Michezo", zh: "游戏规则" };

/**
 * ⛔ THE TITLE NAMES THE TWO SIDES, SO IT READS THEM FROM THE PRODUCT TOO.
 *
 * Hand-typing them here is how the tab title and the document body come to disagree: my first
 * draft had the Swahili title say **NDIYO** while `t.common.yes` says **NDIO**, and the Chinese
 * title say `YES/NO` while the body — once `test:labels` §3b had its say — says 是/否. A reader
 * would have seen one word in the browser tab and a different one in the first sentence.
 * Deriving both from `sideWordIn` makes that disagreement unrepresentable.
 */
const TITLE = (locale: Locale): string => {
  const yes = sideWordIn(locale, "YES", "MARKET");
  const no = sideWordIn(locale, "NO", "MARKET");
  switch (locale) {
    case "sw": return `Kanuni za Masoko ya ${yes}/${no}`;
    case "zh": return `${yes}/${no} 市场规则`;
    default:   return `${yes}/${no} Market Rules`;
  }
};
const SUBTITLE: Record<Locale, string> = {
  en: "Predict events. Not chance.",
  sw: "Tabiri matukio. Si bahati.",
  zh: "预测事件，而非运气。",
};
/**
 * ⚠️ DATED, like every other document under `/legal` — not marketing's "Version 1.0". A dated
 * version is the only kind that signals when the binding text last moved, and `/legal/terms:22-25`
 * makes bumping it in the same commit a rule rather than a habit.
 */
const META: Record<Locale, string> = {
  en: "Version 2026-09-10 · Effective on entering a market.",
  sw: "Toleo 2026-09-10 · Yanaanza kutumika unapoingia sokoni.",
  zh: "版本 2026-09-10 · 自进入市场时生效。",
};

export default async function YesNoRulesPage() {
  const { locale } = await getServerT();
  const r = ratesFrom(await getGlobalConfig());

  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE(locale)}
        subtitle={SUBTITLE[locale]}
        meta={META[locale]}
        glyph="listChecks"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {yesNoContent(r)[locale]}
    </>
  );
}
