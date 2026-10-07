import { LegalHeader, LEGAL_BINDING_LANGUAGE as BINDING } from "../../_components";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { getGlobalConfig } from "@/lib/server/market-config";
import { getUpDownConfig } from "@/lib/server/updown-config";
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
  sw: "Kanuni za Juu na Chini",
  zh: "涨跌规则",
};
const SUBTITLE: Record<Locale, string> = {
  en: "Higher or lower, when the clock runs out.",
  sw: "Juu au chini, saa inapoisha.",
  zh: "计时结束时，更高还是更低。",
};
/**
 * ⛔ BUMPED 2026-09-14 (docs/COMPLIANCE-DECISIONS.md 2026-09-14, second). §9 told players an Up & Down round has an
 * objection window of the YES/NO markets' configured hours "while the payout is still on hold". It has none:
 * `closeRound` stamps `objectionsClosedAt` to now and settles in the same call (updown-service.ts, owner decision
 * 2026-07-24). The binding English moved, so the date moved with it. Same version: the Swahili game name reads
 * "Juu na Chini", as every screen says.
 */
const META: Record<Locale, string> = {
  en: "Version 2026-09-14 · Effective on entering a round.",
  sw: "Toleo 2026-09-14 · Zinaanza kutumika unapoingia raundi.",
  zh: "版本 2026-09-14 · 自进入回合时生效。",
};

export default async function UpDownRulesPage() {
  const { locale } = await getServerT();
  /* ⭐ THE STAKE BOUNDS ARE UP & DOWN'S OWN (2026-10-07). They quoted the polls' global config — the same TZS 1,000 by rule,
     but set in a different place (`updown-config.ts`, the product default every chain inherits and `stakeBoundsFor`
     floors at). A binding document states the bounds of the game it governs; both reads are floored at the platform
     minimum on read. The fee and the rest still come from the shared rates. */
  const [cfg, ud] = await Promise.all([getGlobalConfig(), getUpDownConfig()]);
  const r = { ...ratesFrom(cfg), minStake: ud.defaultMinStake, maxStake: ud.defaultMaxStake };

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
