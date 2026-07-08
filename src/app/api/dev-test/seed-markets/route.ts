/**
 * /api/dev-test/seed-markets — dev-only fixture loader for the market board.
 * Triggers the real market catalog seed (seedDemoMarkets — ~25 live markets
 * across every category, each with a seeded 16-point YES% history so the card
 * sparkline + probability chart render). Idempotent: no-op once ≥25 live.
 *
 * Returns 404 in production. POST with no body.
 * Returns the live market ids so a caller can drive stress-bulk-bet against one
 * to populate positions (the trader-crest stack).
 */
import { NextResponse } from "next/server";
import { seedDemoMarkets, listMarkets } from "@/lib/server/market-service";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  await seedDemoMarkets();
  const live = (await listMarkets({ status: "LIVE" }).catch(() => [])).slice(0, 30);
  return NextResponse.json({
    ok: true,
    live: live.length,
    ids: live.map((m) => ({ id: m.id, category: m.category, titleEn: m.titleEn })),
  });
}
