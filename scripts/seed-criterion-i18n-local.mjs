#!/usr/bin/env node
/**
 * seed-criterion-i18n-local.mjs — two polls that make F6's BOTH ARMS visible.
 *
 * ⛔ LOCALHOST ONLY, AND IT REFUSES ANYTHING ELSE. This writes markets. It exists so a
 * human can LOOK at the translated arm of the resolution criterion, which cannot be
 * photographed on production until the writers (F6b/F6c) land and an officer fills one
 * in — i.e. the arm that would otherwise ship having only ever been unit-tested.
 *
 * Usage (local disposable cluster only):
 *   DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public' \
 *     node scripts/seed-criterion-i18n-local.mjs
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
// Three gates, same shape as scripts/load/: a hostname denylist, a localhost
// requirement, and a refusal to run with no target at all. A seeder that can reach
// production is a seeder that eventually does.
if (!url) { console.error("DATABASE_URL is required."); process.exit(1); }
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production."); process.exit(1);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — localhost only."); process.exit(1);
}

const db = new PrismaClient();
const day = 86_400_000;

const EN = "Resolves YES if the Bank of Tanzania official daily mid-rate published on the last business day of the month is strictly below the rate published on the first business day. Source: BoT daily mid-rate.";
const SW = "Inatatuliwa NDIYO iwapo kiwango rasmi cha katikati cha Benki Kuu ya Tanzania kilichochapishwa siku ya mwisho ya kazi ya mwezi kiko chini kabisa ya kiwango cha siku ya kwanza ya kazi. Chanzo: kiwango cha katikati cha kila siku cha BoT.";
const ZH = "若坦桑尼亚银行在当月最后一个营业日公布的官方每日中间价严格低于第一个营业日公布的价格，则结算为“是”。来源：坦桑尼亚银行每日中间价。";

const common = {
  category: "macro",
  sourceUrl: "https://www.bot.go.tz",
  resolutionAt: new Date(Date.now() + 30 * day),
  selectionClosedAt: new Date(Date.now() + 25 * day),
  status: "LIVE",
  yesPool: 240000,
  noPool: 160000,
  predictorCount: 7,
  productLine: "MARKET",
  proposedBy: "system",
};

const rows = [
  {
    id: "mkt_f6_translated",
    titleEn: "Will the Tanzanian shilling strengthen against the US dollar by month-end?",
    titleSw: "Je, shilingi ya Tanzania itaimarika dhidi ya dola ya Marekani ifikapo mwisho wa mwezi?",
    titleZh: "坦桑尼亚先令会在月底前对美元走强吗？",
    resolutionCriterion: EN,
    resolutionCriterionSw: SW,
    resolutionCriterionZh: ZH,
  },
  {
    id: "mkt_f6_untranslated",
    titleEn: "Will the Bank of Tanzania hold the policy rate at the next MPC meeting?",
    titleSw: "Je, Benki Kuu ya Tanzania itaishikilia riba kuu kwenye mkutano ujao wa MPC?",
    titleZh: "坦桑尼亚银行会在下次货币政策会议上维持政策利率吗？",
    resolutionCriterion: EN,
    // ⭐ NULL, not "". This is the state EVERY market on production is in today, and
    // it is the arm the player surface has to DISCLOSE rather than paper over.
    resolutionCriterionSw: null,
    resolutionCriterionZh: null,
  },
];

for (const r of rows) {
  const data = { ...common, ...r };
  await db.predictionMarket.upsert({ where: { id: r.id }, create: data, update: data });
  console.log(`seeded ${r.id} — sw:${r.resolutionCriterionSw ? "yes" : "NULL"} zh:${r.resolutionCriterionZh ? "yes" : "NULL"}`);
}

// ⚠️ READ IT BACK. An upsert that silently dropped a column would print "seeded"
// above and leave the visual driver photographing the wrong arm — which is how a
// screenshot becomes evidence for a claim it does not support.
for (const r of rows) {
  const got = await db.predictionMarket.findUnique({
    where: { id: r.id },
    select: { resolutionCriterionSw: true, resolutionCriterionZh: true },
  });
  const okSw = (got?.resolutionCriterionSw ?? null) === r.resolutionCriterionSw;
  const okZh = (got?.resolutionCriterionZh ?? null) === r.resolutionCriterionZh;
  console.log(`verify ${r.id} — sw ${okSw ? "OK" : "MISMATCH"} · zh ${okZh ? "OK" : "MISMATCH"}`);
  if (!okSw || !okZh) { await db.$disconnect(); process.exit(1); }
}

// ── F6c · an AI poll awaiting review, one translated and one not ────────────
// So the OFFICER's surfaces can be photographed too. A generated translation that
// nobody can read before publish is a write-only field, and this is the sentence
// the payout turns on — the review page and the edit panel both have to show it.
const polls = [
  { id: "aip_f6_translated", sw: SW, zh: ZH, titleEn: "Will the shilling strengthen against the dollar by month-end?" },
  { id: "aip_f6_untranslated", sw: null, zh: null, titleEn: "Will the Bank of Tanzania hold the policy rate at the next meeting?" },
];
for (const p of polls) {
  const data = {
    state: "PENDING_REVIEW",
    requestCategory: "macro",
    requestPrompt: "seed",
    rawResponse: null,
    filterReasons: [],
    qualityIndicators: [],
    overallQuality: 85,
    titleEn: p.titleEn,
    titleSw: "Je, shilingi itaimarika dhidi ya dola ifikapo mwisho wa mwezi?",
    titleZh: "坦桑尼亚先令会在月底前对美元走强吗？",
    category: "macro",
    resolutionCriterion: EN,
    resolutionCriterionSw: p.sw,
    resolutionCriterionZh: p.zh,
    resolutionAt: new Date(Date.now() + 30 * day),
    selectionClosedAt: new Date(Date.now() + 25 * day),
    options: [],
    sources: [{ url: "https://www.bot.go.tz", publisher: "Bank of Tanzania" }],
    confidence: 80,
    reasoning: "Seeded for F6c visual verification.",
    rejectReasons: [],
  };
  await db.aIPoll.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
  const got = await db.aIPoll.findUnique({
    where: { id: p.id },
    select: { resolutionCriterionSw: true, resolutionCriterionZh: true },
  });
  const okSw = (got?.resolutionCriterionSw ?? null) === p.sw;
  const okZh = (got?.resolutionCriterionZh ?? null) === p.zh;
  console.log(`seeded ${p.id} — sw ${okSw ? "OK" : "MISMATCH"} · zh ${okZh ? "OK" : "MISMATCH"}`);
  if (!okSw || !okZh) { await db.$disconnect(); process.exit(1); }
}

await db.$disconnect();
console.log("\n/markets/mkt_f6_translated   — the TRANSLATED arm (player)");
console.log("/markets/mkt_f6_untranslated — the FALLBACK arm (player)");
console.log("/admin/ai-polls/aip_f6_translated   — the officer's review, translated");
console.log("/admin/ai-polls/aip_f6_untranslated — the officer's review, untranslated");
