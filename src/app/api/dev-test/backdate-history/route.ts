/**
 * /api/dev-test/backdate-history — dev-only: moves a market's IN-MEMORY price history back in time, so a
 * local drive can show a real 24-hour move (landing v3 WP3, the featured card's 24h mark and delta).
 *
 * ⭐ WHY A DRIVE NEEDS IT. A market's first reading is always one-sided — the first bet — and C1 measures no
 * move from a baseline that had no price (`cardChartFrom`). So a market seeded a minute ago can never draw
 * the mark, and a local run would "verify" the mark by never seeing it. Moving the readings a day back puts
 * them where a day of real trading would have left them; the bets placed after it are the day's move.
 * Nothing is invented: every reading is one the product recorded, only its timestamp moves.
 *
 * ⛔ 404 in production — never reachable on a live deployment (checked before anything else is read).
 * ⛔ 409 when the durable MarketSnapshot table is in use: a drive rewrites the process's own Map, never a
 *    database.
 *
 *   POST { marketId: "mkt_xxx", hours?: number }  →  { ok, marketId, points, oldest, newest }
 *   `hours` defaults to 30 (outside the 24h window); it must be a positive number of hours up to 30 days.
 */
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/server/prisma";
import type { MarketSnapshot } from "@/lib/server/market-history";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (hasDatabase() && process.env.USE_PRISMA_DAL !== "false") {
    return NextResponse.json({ ok: false, error: "history is durable (a database is configured); this drive only moves the in-memory store" }, { status: 409 });
  }
  const body = (await req.json().catch(() => null)) as { marketId?: string; hours?: number } | null;
  if (!body?.marketId) return NextResponse.json({ ok: false, error: "marketId required" }, { status: 400 });
  const hours = typeof body.hours === "number" && Number.isFinite(body.hours) ? body.hours : 30;
  if (hours <= 0 || hours > 720) return NextResponse.json({ ok: false, error: "hours must be in (0, 720]" }, { status: 400 });
  const store = (globalThis as { __50PICK_MARKET_HISTORY?: Map<string, MarketSnapshot[]> }).__50PICK_MARKET_HISTORY;
  const points = store?.get(body.marketId);
  if (!points?.length) return NextResponse.json({ ok: false, error: "no history for that market" }, { status: 404 });
  const shift = hours * 3600_000;
  for (const s of points) s.t = new Date(Date.parse(s.t) - shift).toISOString();
  return NextResponse.json({ ok: true, marketId: body.marketId, points: points.length, oldest: points[0].t, newest: points[points.length - 1].t });
}
