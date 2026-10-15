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
/**
 * ⚠️ DATED, like every other document under `/legal` — not marketing's "Version 1.0". A dated
 * version is the only kind that signals when the binding text last moved, and `/legal/terms:22-25`
 * makes bumping it in the same commit a rule rather than a habit.
 * ⛔ BUMPED 2026-10-12 (owner ruling, docs/COMPLIANCE-DECISIONS.md 2026-10-12): the minimum stake this document quotes
 * from the live config went from TZS 1,000 to TZS 500 — the binding text a player reads moved, so the date moved.
 * ⛔ BUMPED 2026-10-14 (S12 WP2): the Swahili text moved, so the date moved, in all three languages. §1 spelt the side
 * "NDIYO" where every screen says "NDIO" — it now reads the product's word (`{w.sw.yes}/{w.sw.no}`) — and §4, §6 and
 * §7 give "dau" its class-6 plural, "madau" (S4-COPY-AUDIT review 2's rule). Spelling and grammar only: no right, rate
 * or rule changed, and the English is untouched; the release files its COMPLIANCE-DECISIONS entry. Correcting it now,
 * with a new version rather than at S11's flip-time one, is S12-PLAN's Point for Ali 6 — accepted by Ali, 2026-10-14.
 */
const META: Record<Locale, string> = {
  en: "Version 2026-10-14 · Effective on entering a market.",
  sw: "Toleo 2026-10-14 · Yanaanza kutumika unapoingia sokoni.",
  zh: "版本 2026-10-14 · 自进入市场时生效。",
};

export default async function YesNoRulesPage() {
  // `t` for the subtitle, the tagline's one home `auth.railTagline` (the Vodacom plan S11 WP7): the three strings this page
  // typed until then, read from the key, so the S15 flip moves it with every other reader.
  const { t, locale } = await getServerT();
  const r = ratesFrom(await getGlobalConfig());

  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE(locale)}
        subtitle={t.auth.railTagline}
        meta={META[locale]}
        glyph="listChecks"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {yesNoContent(r)[locale]}
    </>
  );
}
