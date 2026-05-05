/**
 * Public attestation feed for resolved markets.
 * Each item carries the market id, the outcome, the source URL, and the
 * two-officer signatures. Anyone can scrape this and verify against the source.
 */
import { NextResponse } from "next/server";
import { listMarkets } from "@/lib/server/market-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const resolved = listMarkets({ status: "RESOLVED" }).slice(0, 50);
  return NextResponse.json({
    attestations: resolved.map((m) => ({
      marketId: m.id,
      titleEn: m.titleEn,
      titleSw: m.titleSw,
      category: m.category,
      sourceUrl: m.sourceUrl,
      resolvedOutcome: m.resolvedOutcome,
      stage1By: m.resolutionStage1By,
      stage1At: m.resolutionStage1At,
      stage2By: m.resolutionStage2By,
      stage2At: m.resolutionStage2At,
      objectionsClosedAt: m.objectionsClosedAt,
      yesPool: m.yesPool,
      noPool: m.noPool,
    })),
  });
}
