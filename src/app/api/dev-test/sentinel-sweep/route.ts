/**
 * /api/dev-test/sentinel-sweep — dev-only. Manually triggers one sentinel
 * sweep and returns the results so the operator can verify the AI's
 * judgment on live markets.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST {}  →  { ok: true, results: SentinelResult[] }
 */
import { NextResponse } from "next/server";
import { runSentinelSweep } from "@/lib/server/market-sentinel";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const results = await runSentinelSweep();
  return NextResponse.json({ ok: true, results, count: results.length });
}
