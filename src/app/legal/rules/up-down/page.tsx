import { LegalHeader, LEGAL_BINDING_LANGUAGE as BINDING } from "../../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { getGlobalConfig } from "@/lib/server/market-config";
import { upDownContent } from "../_content-up-down";
import { ratesFrom } from "../_shared";

/** ⛔ `force-dynamic` — live config is quoted in binding text. See the twin page's note. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await getServerT();
  return { title: TITLE[locale] };
}

const EYEBROW: Record<Locale, string> = { en: "Game Rules", sw: "Kanuni za Michezo", zh: "游戏规则" };
const TITLE: Record<Locale, string> = {
  en: "Up & Down Rules",
  sw: "Kanuni za Juu & Chini",
  zh: "涨跌规则",
};
const SUBTITLE: Record<Locale, string> = {
  en: "Higher or lower, when the clock runs out.",
  sw: "Juu au chini, saa inapoisha.",
  zh: "计时结束时，更高还是更低。",
};
const META: Record<Locale, string> = {
  en: "Version 2026-09-10 · Effective on entering a round.",
  sw: "Toleo 2026-09-10 · Zinaanza kutumika unapoingia raundi.",
  zh: "版本 2026-09-10 · 自进入回合时生效。",
};

export default async function UpDownRulesPage() {
  const { locale } = await getServerT();
  const r = ratesFrom(await getGlobalConfig());

  return (
    <>
      <LegalHeader
        eyebrow={EYEBROW[locale]}
        title={TITLE[locale]}
        subtitle={SUBTITLE[locale]}
        meta={META[locale]}
        glyph="trendingUp"
      />
      <p className="text-body-sm italic text-text-subtle">{BINDING[locale]}</p>
      {upDownContent(r)[locale]}
    </>
  );
}
