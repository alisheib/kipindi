/**
 * GET /api/markets/[id]/sheet — what the journey's bet sheet reads (the Vodacom plan S3, `docs/VODACOM-PLAN.md` §3.1;
 * S8 WP3). The reads live in `lib/server/journey-sheet.ts`; this is the door.
 *
 *   GET /api/markets/<id>/sheet        the PUBLIC half — bettable, pools, frozen rates, {pct}, stake bounds, when betting
 *                                      closes, the server's clock, the card figure per side. The same for everyone, so
 *                                      it is shared-cacheable for 5 seconds (`s-maxage=5`), on success only. It names
 *                                      no viewer.
 *   GET /api/markets/<id>/sheet?me=1   the public half PLUS the signed-in viewer's own (`me`: spendable, balance, bonus,
 *                                      the sides they hold, the bonus line, the viewer's facts, and the key's position)
 *                                      — `private, no-store`, and 401 without a session. It also takes:
 *        &side=YES|NO                  the sheet's side, for the bonus line (the market page's B2);
 *        &key=<uuid>                   a bet's key: `me.keyPosition` names the position it placed, if it is the
 *                                      session's own (S8-PLAN A2);
 *        &open=1                       the ONE read each open makes (S8-PLAN A4).
 *
 * ⛔ 404 for a missing market, an Up & Down round, or a market that is not LIVE. ⛔ GET only. ⛔ NOTHING HERE WRITES,
 * EXCEPT THE OPEN'S READ OF A BLOCKED VIEWER, WHICH WRITES WHAT A REFUSED TAP WRITES (S8-PLAN A4): the session limit's
 * sitting and its `rg.session_limit.enforced` row, `bet.account_blocked`, or `bet.loss_limit_blocked` — and nothing else.
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
  const q = new URL(req.url).searchParams;
  const me = q.get("me") === "1";
  try {
    const session = me ? await getSession() : null;
    if (me && !session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: NO_STORE });
    const pub = await sheetPublic(id);
    if (!pub) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: NO_STORE });
    if (!me || !session) return NextResponse.json(pub, { headers: PUBLIC });
    const side = q.get("side");
    const mine = await sheetForUser(pub.id, session.userId, {
      playStartedAt: session.playStartedAt ?? null,
      side: side === "YES" || side === "NO" ? side : null,
      key: q.get("key"),
      open: q.get("open") === "1" ? pub : null,
    });
    return NextResponse.json({ ...pub, me: mine }, { headers: PRIVATE });
  } catch (err) {
    console.error("[markets/sheet] read failed", { id, err });
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 503, headers: NO_STORE });
  }
}
