/**
 * /api/dev-test/fast-forward-market — dev-only endpoint that pulls a
 * market's resolutionAt to "1 hour from now", which makes it appear in
 * the resolver queue (which only lists LIVE markets within 24h of
 * resolution + every CLOSED market awaiting stage 2).
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { marketId: "mkt_xxx" } → { ok, resolutionAt }
 */
import { NextResponse } from "next/server";
import { getMarket } from "@/lib/server/market-service";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { marketId?: string } | null;
  if (!body?.marketId) {
    return NextResponse.json({ ok: false, error: "marketId required" }, { status: 400 });
  }
  const m = getMarket(body.marketId);
  if (!m) return NextResponse.json({ ok: false, error: "market not found" }, { status: 404 });
  // Mutate in place — markets is a singleton Map keyed by id.
  m.resolutionAt = new Date(Date.now() + 60 * 60_000).toISOString();
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
