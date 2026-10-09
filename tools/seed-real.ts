/**
 * /api/dev-test/seed-real-markets — create a handful of REAL (non-demo) live markets
 * across categories, so the board, the market detail page and the "Similar markets"
 * rail can be exercised. `seedDemoMarkets` only makes "Demo ·" rows, which
 * `listMarkets` filters out, so those never populate the player board.
 *
 * ⚠️ 404 in production, double-gated at the edge by proxy.ts. Idempotent-ish: it
 * skips a title that already exists so a re-run does not pile up duplicates.
 */
import { NextResponse } from "next/server";
import { createMarket, listMarkets, type MarketCategory } from "@/lib/server/market-service";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const existing = new Set((await listMarkets({ productLine: "ALL" }).catch(() => [])).map((m) => m.titleEn));
  const now = Date.now();
  const H = 3600_000;
  const seed: Array<{ en: string; sw: string; zh: string; cat: MarketCategory; hours: number; src: string }> = [
    { en: "Simba SC wins the NBC Premier League 2026-27", sw: "Simba SC yashinda NBC Premier League 2026-27", zh: "辛巴俱乐部赢得2026-27赛季NBC超级联赛", cat: "sports", hours: 30 * 24, src: "https://nbc.co.tz/table" },
    { en: "Young Africans qualify for the CAF group stage", sw: "Yanga wafuzu hatua ya makundi CAF", zh: "扬加晋级非洲冠军联赛小组赛", cat: "sports", hours: 20 * 24, src: "https://tff.or.tz/results" },
    { en: "USD/TZS closes below 2,650 at end of Q2", sw: "USD/TZS yafunga chini ya 2,650 mwisho wa robo ya pili", zh: "美元兑坦桑尼亚先令二季度末收于2,650以下", cat: "macro", hours: 6, src: "https://bot.go.tz/rates" },
    { en: "Bank of Tanzania holds the rate at the next MPC", sw: "Benki Kuu yashikilia riba kikao kijacho", zh: "坦桑尼亚央行下次会议维持利率", cat: "macro", hours: 12, src: "https://bot.go.tz/mpc" },
    { en: "Dar es Salaam rainfall exceeds 200mm in July", sw: "Mvua Dar es Salaam yazidi 200mm Julai", zh: "达累斯萨拉姆七月降雨超过200毫米", cat: "weather", hours: 2, src: "https://meteo.go.tz/bulletin" },
    { en: "Bitcoin closes above $100,000 on 1 August", sw: "Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti", zh: "比特币8月1日收于10万美元以上", cat: "crypto", hours: 48, src: "https://coingecko.com/bitcoin" },
  ];

  let created = 0;
  const errors: string[] = [];
  for (const s of seed) {
    if (existing.has(s.en)) continue;
    try {
      await createMarket({
        titleEn: s.en, titleSw: s.sw, titleZh: s.zh,
        category: s.cat,
        sourceUrl: s.src,
        resolutionCriterion: `Resolved from the official source on the stated date.`,
        resolutionAt: new Date(now + s.hours * H).toISOString(),
        selectionClosedAt: null,
        proposedBy: "dev_seed_real",
      });
      created++;
    } catch (e) {
      errors.push(`${s.en}: ${(e as Error).message}`);
    }
  }

  const live = (await listMarkets({ status: "LIVE" }).catch(() => [])).map((m) => ({ id: m.id, cat: m.category, title: m.titleEn }));
  return NextResponse.json({ ok: true, created, live, errors });
}
