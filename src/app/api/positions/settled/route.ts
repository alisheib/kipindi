/**
 * GET /api/positions/settled?markets=<id,id,…>
 *
 * The viewer's OWN settled positions on the named markets — the source of truth the
 * long-form win celebration reads (DA-5 / E-115).
 *
 * 🔴 WHY THIS EXISTS. The celebration used to headline `payoutIfWin` from `localStorage`,
 * written at PLACE TIME by `conviction-dial.tsx`, and it decided a player had won by
 * comparing the market's public outcome to a side kept in the same browser. On a
 * pari-mutuel pool the place-time projection is a different number from the realised
 * payout, because the pool keeps moving after the bet — so the figure struck in gilt in
 * front of the player was, by construction, not the figure they were paid. Four things
 * followed from that one shortcut, and all four are closed by reading the row instead:
 *
 *   1. **The amount was a projection, not the payment.** `finalPayout` is written inside
 *      the settlement transaction, in the same commit as the wallet credit and the
 *      `BET_PAYOUT` ledger row (`market-service.ts:2443-2468`).
 *   2. **It could fire before the money existed.** The old trigger was `stage2At`
 *      (adjudication). `settleMarket` refuses to move money until the objection window
 *      closes — 24h by default — so a real poll could celebrate a full day before a
 *      shilling moved, and an objection could still void it. Requiring `settledAt` here
 *      makes that impossible rather than unlikely.
 *   3. **A CASHED_OUT player got the seal.** Nothing cleared the browser key on sell, so
 *      a player who had already exited was celebrated for a payout they never received.
 *      A row carries its own status, so `CASHED_OUT` simply is not `WIN`.
 *   4. **Two bets on one market collapsed into one.** The key was per market; positions
 *      are per position.
 *
 * ⛔ OWNERSHIP IS THE WHOLE SECURITY MODEL HERE. Every row is read for
 * `session.userId` — the caller names MARKETS, never positions or users, so there is no
 * identifier a client can tamper with to see somebody else's money. The public
 * `/api/fairness/recent` feed still detects that a resolution happened; this route is the
 * only thing that says what it meant for *you*.
 *
 * ⚠️ MARKET product line only. Up & Down already reads its own settled rows through
 * `updown-board.ts` → `UpDownResultAnnouncer`, which is the precedent this follows; a
 * second announcer for the same rounds would double-fire.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { listPositionsForUser } from "@/lib/server/market-service";
import { getMarket } from "@/lib/server/market-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cap the fan-out. A watch list is small; a hand-crafted query string is not. */
const MAX_MARKETS = 40;

export async function GET(req: Request) {
  const session = await getSession();
  // 401 rather than an empty list: "you are signed out" and "you have no settled
  // positions" are different answers, and a poller that cannot tell them apart will
  // silently stop celebrating for a player whose session lapsed.
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const url = new URL(req.url);
  const wanted = (url.searchParams.get("markets") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_MARKETS);
  if (wanted.length === 0) return NextResponse.json({ positions: [] });

  const want = new Set(wanted);
  // ⛔ Read the viewer's own rows and filter in memory rather than trusting the caller's
  // ids as a lookup key. `listForUser` is already scoped to the session user, so the
  // worst a tampered `markets=` can do is name a market the player never bet on, which
  // matches nothing.
  const mine = await listPositionsForUser(session.userId, 200, "MARKET");

  const settled = mine.filter(
    (p) =>
      want.has(p.marketId) &&
      p.settledAt != null &&                                   // the money has MOVED
      (p.status === "WIN" || p.status === "LOSS" || p.status === "VOID"),
  );

  // Titles come from the market, one read per distinct market actually matched.
  const titles = new Map<string, string>();
  for (const id of new Set(settled.map((p) => p.marketId))) {
    try {
      const m = await getMarket(id);
      if (m) titles.set(id, m.titleEn ?? "");
    } catch { /* a missing title must not cost the player their celebration */ }
  }

  return NextResponse.json({
    positions: settled.map((p) => ({
      positionId: p.id,
      marketId: p.marketId,
      status: p.status,
      side: p.side,
      stake: p.stake,
      // ⛔ `finalPayout`, never `potentialPayout`. The first is what settlement paid; the
      // second is the projection this whole atom exists to stop showing. A VOID refund
      // also carries its returned stake here, which is what a refund's payout IS.
      payout: p.finalPayout ?? 0,
      settledAt: p.settledAt,
      title: titles.get(p.marketId) ?? "",
    })),
  });
}
