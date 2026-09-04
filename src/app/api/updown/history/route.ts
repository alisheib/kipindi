/**
 * GET /api/updown/history?asset=btc&range=1H — the terminal chart's history feed
 * (CHART-SPRINT-2). Public, read-only market data: exactly the confirmed reads
 * the board page itself renders, one asset, one bounded window (see
 * `getAssetTerminalSeries` — index-served, capped, cadence-derived gaps and
 * candle floors decided SERVER-side so every client draws the same truth).
 *
 * ⛔ No session and no writes, ever. Anything answered here is already on the
 * public board; the route exists so a range switch costs one small JSON read
 * instead of a page render. 10s shared cache on SUCCESS ONLY.
 *
 * ⛔ A store failure is a 503 with no-store — NEVER a 200 "no data" or a 404
 * (review finding F9: a swallowed read rendered a DB blip as a fabricated-empty
 * window, publicly cached 30s, with the client asserting "no reads" as fact —
 * the exact class B-1 polices). 404 means the ASSET read succeeded and the key
 * is genuinely unknown.
 *
 * Load posture: bounded params, one indexed query, shared cache in front; a
 * deliberate flood hits Railway's edge before it hits Postgres. No per-IP
 * limiter here — the board page itself is the heavier read.
 */
import { NextResponse } from "next/server";
import { getAssetTerminalSeries, type TerminalRange, type TerminalStyle } from "@/lib/server/updown-board";

export const dynamic = "force-dynamic";

const RANGES: TerminalRange[] = ["30M", "1H", "4H", "1D"];
const STYLES: TerminalStyle[] = ["auto", "line", "candles"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asset = (url.searchParams.get("asset") ?? "").slice(0, 32);
  const range = (url.searchParams.get("range") ?? "") as TerminalRange;
  const style = (url.searchParams.get("style") || "auto") as TerminalStyle;
  if (!asset || !RANGES.includes(range) || !STYLES.includes(style)) {
    return NextResponse.json(
      { error: "asset and range (30M|1H|4H|1D) are required; style is line|candles|auto" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const data = await getAssetTerminalSeries(asset, range, style);
    if (!data) {
      return NextResponse.json({ error: "unknown asset" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { ...data, serverNow: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } },
    );
  } catch (err) {
    console.error("[updown/history] read failed", { asset, range, err });
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
