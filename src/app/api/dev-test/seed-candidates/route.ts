/**
 * /api/dev-test/seed-candidates — dev-only fixture loader for the AI
 * market-candidate pipeline. Creates a representative spread across
 * every state of the state machine so the /admin/candidates page can
 * be exercised end-to-end without spending real Claude API tokens.
 *
 * Returns 404 in production. POST with no body.
 */
import { NextResponse } from "next/server";
import {
  ingestCandidate,
  filterCandidate,
  attachVerification,
  scoreCandidate,
  type CandidateCategory,
} from "@/lib/server/market-candidate";
import { seedDefaultSources } from "@/lib/server/source-registry";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  await seedDefaultSources();

  const now = Date.now();
  const inDays = (d: number) => new Date(now + d * 24 * 3600_000).toISOString();
  const fixtures: Array<{
    category: CandidateCategory;
    proposedTitleEn: string;
    proposedTitleSw: string;
    resolutionCriterion: string;
    resolutionAt: string;
    sources: { url: string; publisher: string }[];
    /** Pipeline endpoint to leave this fixture in. */
    landAt: "FILTERED_OUT_LAYER2" | "FILTERED_OUT_LAYER4" | "PENDING_REVIEW";
    confidence?: number;
    rejectReason?: "politics" | "ambiguous_outcome" | "low_confidence";
  }> = [
    {
      category: "sports",
      proposedTitleEn: "Simba SC wins the NBC Premier League 2026-27",
      proposedTitleSw: "Simba SC inashinda Ligi Kuu ya NBC 2026-27",
      resolutionCriterion: "Resolves YES if Simba SC is crowned champion per the official TFF / NBC Premier League final table.",
      resolutionAt: inDays(60),
      sources: [
        { url: "https://nbc.co.tz/premier-league/standings", publisher: "NBC Premier League" },
        { url: "https://tff.or.tz/results", publisher: "Tanzania Football Federation" },
      ],
      landAt: "PENDING_REVIEW",
      confidence: 88,
    },
    {
      category: "macro",
      proposedTitleEn: "USD/TZS daily close < 2,650 on 30 June 2026",
      proposedTitleSw: "USD/TZS itafungwa chini ya 2,650 mnamo 30 Juni 2026",
      resolutionCriterion: "Resolves YES if the BoT daily closing rate published on 30 Jun 2026 is strictly less than TZS 2,650 per USD.",
      resolutionAt: inDays(45),
      sources: [
        { url: "https://bot.go.tz/Statistics/exchange-rate", publisher: "Bank of Tanzania" },
      ],
      landAt: "PENDING_REVIEW",
      confidence: 82,
    },
    {
      category: "weather",
      proposedTitleEn: "Long rains begin in Dar es Salaam before 15 Apr 2026",
      proposedTitleSw: "Mvua za masika zaanza Dar es Salaam kabla ya 15 Apr 2026",
      resolutionCriterion: "Resolves YES if the official TMA bulletin records the start of the masika season at any Dar es Salaam station before 15 Apr 2026.",
      resolutionAt: inDays(20),
      sources: [
        { url: "https://meteo.go.tz/bulletins/masika-2026", publisher: "Tanzania Meteorological Authority" },
      ],
      landAt: "PENDING_REVIEW",
      confidence: 91,
    },
    {
      category: "crypto",
      proposedTitleEn: "Bitcoin closes above $100,000 on 1 July 2026",
      proposedTitleSw: "Bitcoin yafungwa juu ya $100,000 mnamo 1 Julai 2026",
      resolutionCriterion: "Resolves YES if CoinGecko's official BTC USD close on 1 Jul 2026 is strictly above $100,000.",
      resolutionAt: inDays(46),
      sources: [
        { url: "https://www.coingecko.com/en/coins/bitcoin", publisher: "CoinGecko" },
      ],
      landAt: "PENDING_REVIEW",
      confidence: 76,
    },
    {
      category: "sports",
      proposedTitleEn: "Politician X wins the by-election in Mwanza",
      proposedTitleSw: "Mwanasiasa X anashinda kura ya marudio Mwanza",
      resolutionCriterion: "Resolves YES if official NEC results show Politician X winning the constituency.",
      resolutionAt: inDays(14),
      sources: [
        { url: "https://www.nec.go.tz/results/mwanza-by-election", publisher: "National Electoral Commission" },
      ],
      // Should hard-reject at Layer 2: politics
      landAt: "FILTERED_OUT_LAYER2",
      rejectReason: "politics",
    },
    {
      category: "culture",
      proposedTitleEn: "A popular Bongo Movie premieres before mid-year",
      proposedTitleSw: "Filamu maarufu ya Bongo yaonyeshwa kabla ya katikati ya mwaka",
      resolutionCriterion: "Resolves YES if a popular Bongo movie has a premiere before 30 Jun 2026.",
      resolutionAt: inDays(40),
      sources: [
        { url: "https://itv.co.tz/entertainment", publisher: "ITV Tanzania" },
      ],
      // Should auto-reject at Layer 4 below the 75 threshold
      landAt: "FILTERED_OUT_LAYER4",
      confidence: 42,
    },
  ];

  const seeded: Array<{ id: string; state: string; title: string }> = [];

  for (const f of fixtures) {
    // Layer 1 — extract
    const c = await ingestCandidate({
      category: f.category,
      proposedTitleEn: f.proposedTitleEn,
      proposedTitleSw: f.proposedTitleSw,
      resolutionCriterion: f.resolutionCriterion,
      resolutionAt: f.resolutionAt,
      sources: f.sources.map((s) => ({ ...s, retrievedAt: new Date().toISOString() })),
      tokensSpent: 480,
      costUsd: 0.012,
      actorId: "system_ai",
    });

    if (f.landAt === "FILTERED_OUT_LAYER2") {
      await filterCandidate(c.id, { passes: false, reason: f.rejectReason, note: "Layer 2 hard reject" });
      seeded.push({ id: c.id, state: "FILTERED_OUT", title: c.proposedTitleEn });
      continue;
    }

    // Layer 2 — pass
    await filterCandidate(c.id, { passes: true });

    // Layer 3 — cross-verify (always single confirming source for fixtures)
    await attachVerification(c.id, {
      confirmingSources: [
        { url: f.sources[0].url, publisher: f.sources[0].publisher, retrievedAt: new Date().toISOString() },
      ],
      tokensSpent: 1_200,
      costUsd: 0.030,
    });

    // Layer 4 — score
    await scoreCandidate(c.id, {
      confidence: f.confidence ?? 80,
      tokensSpent: 320,
      costUsd: 0.008,
      rubric: { sources: 2, clarity: 3, jurisdiction: 3 },
    });

    seeded.push({
      id: c.id,
      state: f.landAt === "FILTERED_OUT_LAYER4" ? "FILTERED_OUT" : "PENDING_REVIEW",
      title: c.proposedTitleEn,
    });
  }

  return NextResponse.json({ ok: true, seeded: seeded.length, candidates: seeded });
}
