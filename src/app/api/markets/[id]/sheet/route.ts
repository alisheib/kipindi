/**
 * GET /api/markets/[id]/sheet — what the journey's bet sheet reads (the Vodacom plan S3, `docs/VODACOM-PLAN.md` §3.1).
 * The reads live in `lib/server/journey-sheet.ts`; this is the door.
 *
 *   GET /api/markets/<id>/sheet        the PUBLIC half — bettable, pools, frozen rates, {pct}, stake bounds, when betting
 *                                      closes, the server's clock, the card figure per side. The same for everyone, so
 *                                      it is shared-cacheable for 5 seconds (`s-maxage=5`), on success only.
 *   GET /api/markets/<id>/sheet?me=1   the public half PLUS the signed-in viewer's own (`me`: spendable, the sides they
 *                                      hold, the bonus warning) — `private, no-store`, and 401 without a session.
 *
 * ⛔ 404 for a missing market, an Up & Down round, or a market that is not LIVE. ⛔ GET only: nothing here writes.
 * ⛔ A store failure is a 503 with no-store — never a cached 200 that says something false.
 * Rate-limited per IP (`sheet.ip`): generous, because many Tanzanian phones share one carrier address.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { sheetForUser, sheetPublic } from "@/lib/server/journey-sheet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const PUBLIC = { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" };
const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateCheckAsync(ip, "sheet.ip")).allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: NO_STORE });
  }
  const { id } = await ctx.params;
  const me = new URL(req.url).searchParams.get("me") === "1";
  try {
    const session = me ? await getSession() : null;
    if (me && !session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: NO_STORE });
    const pub = await sheetPublic(id);
    if (!pub) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: NO_STORE });
    if (!me || !session) return NextResponse.json(pub, { headers: PUBLIC });
    return NextResponse.json({ ...pub, me: await sheetForUser(pub.id, session.userId) }, { headers: PRIVATE });
  } catch (err) {
    console.error("[markets/sheet] read failed", { id, err });
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 503, headers: NO_STORE });
  }
}
