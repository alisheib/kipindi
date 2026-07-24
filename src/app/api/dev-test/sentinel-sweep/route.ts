/**
 * /api/dev-test/sentinel-sweep — dev-only. Runs the AI resolution check on ONE
 * market and returns the assessment, so an operator/tester can verify the AI's
 * judgment without waiting for the market's scheduled resolve time.
 *
 * The global sentinel SWEEP is gone (markets are checked per-market at their own
 * resolve time). This endpoint is now a single-market probe.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { marketId }  →  { ok: true, result: SentinelResult | null }
 */
import { NextResponse } from "next/server";
import { sentinelCheckOne } from "@/lib/server/market-sentinel";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  let marketId = "";
  try {
    const body = (await req.json()) as { marketId?: string };
    marketId = String(body?.marketId ?? "").trim();
  } catch { /* empty / invalid body → handled below */ }
  if (!marketId) {
    return NextResponse.json({ ok: false, error: "marketId is required" }, { status: 400 });
  }
  const result = await sentinelCheckOne(marketId);
  return NextResponse.json({ ok: true, result });
}
