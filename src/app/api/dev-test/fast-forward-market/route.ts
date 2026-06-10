/**
 * /api/dev-test/fast-forward-market — dev-only endpoint that pulls a
 * market's resolutionAt to "1 hour from now", which makes it appear in
 * the resolver queue (which only lists LIVE markets within 24h of
 * resolution + every CLOSED market awaiting stage 2).
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { marketId: "mkt_xxx", seconds?: number } → { ok, resolutionAt }
 *   `seconds` defaults to +3600 (1h). Negative pulls the market into
 *   the past (useful for testing the auto-resolve path).
 */
import { NextResponse } from "next/server";
import { getMarket } from "@/lib/server/market-service";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { marketId?: string; seconds?: number } | null;
  if (!body?.marketId) {
    return NextResponse.json({ ok: false, error: "marketId required" }, { status: 400 });
  }
  const m = await getMarket(body.marketId);
  if (!m) return NextResponse.json({ ok: false, error: "market not found" }, { status: 404 });
  const offsetSec = typeof body.seconds === "number" && Number.isFinite(body.seconds) ? body.seconds : 3600;
  m.resolutionAt = new Date(Date.now() + offsetSec * 1000).toISOString();
  audit({
    category: "ADMIN",
    action: "dev_test.market_fast_forwarded",
    actorId: null,
    targetType: "Market",
    targetId: m.id,
    payload: { newResolutionAt: m.resolutionAt, by: "dev-test-endpoint" },
  });
  return NextResponse.json({ ok: true, marketId: m.id, resolutionAt: m.resolutionAt });
}
