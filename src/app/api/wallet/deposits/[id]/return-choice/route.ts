import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getMarket, getSimilarMarkets, isClosedByTime, isSelectionClosed, stakeBoundsForMarket } from "@/lib/server/market-service";
import { cardTitle } from "@/lib/markets/short-title";
import { getServerT } from "@/lib/i18n-server";
import { trustedDepositBet } from "@/lib/journey/deposit-state";
import { parseBetParam } from "@/lib/journey/pending-bet";
import type { ReturnChoice } from "@/lib/journey/return-choice";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { storedProductLine } from "@/lib/product-line";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRIVATE = { "Cache-Control": "private, no-store" };

/** The closed-return read cannot invent a market card or infer funds from a payment callback. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: PRIVATE });
  const limit = await rateCheckAsync(session.userId, "deposit.status");
  if (!limit.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: PRIVATE });
  const { id } = await ctx.params;
  const marketId = new URL(req.url).searchParams.get("market") ?? "";
  if (!/^[a-z0-9_-]{1,128}$/i.test(id) || !/^mkt_[A-Za-z0-9]{1,64}$/.test(marketId))
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: PRIVATE });
  try {
    const deposit = await db.txn.findById(id);
    const saved = trustedDepositBet(session.userId, null, null, { kind: "owned-deposit", row: deposit }, Date.now());
    const bet = saved && parseBetParam(saved.bet);
    if (!bet || bet.kind !== "market" || bet.id !== marketId)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: PRIVATE });
    const [market, wallet, { locale }] = await Promise.all([
      getMarket(marketId), Promise.resolve().then(() => db.wallet.findByUserId(session.userId)).catch(() => null), getServerT(),
    ]);
    const walletBalance = wallet && wallet.currency === "TZS" && Number.isFinite(wallet.balance) && wallet.balance >= 0
      ? wallet.balance : null;
    // Only a poll is a saved deposit bet (S0.5): a round never was, and a Millionea ticket is never placed from a saved
    // bet — it needs fifteen picks the player makes on its own slip (MASWALI-PLAN S3 item 1).
    if (!market || storedProductLine(market.productLine) !== "MARKET") {
      const answer: ReturnChoice = { state: "missing", seed: null, title: "", walletBalance, similar: [] };
      return NextResponse.json(answer, { headers: PRIVATE });
    }
    // An open question remains owned by the ordinary sheet reader, which rereads all betting gates.
    if (market.status === "LIVE" && !isClosedByTime(market) && !isSelectionClosed(market))
      return NextResponse.json({ error: "OPEN" }, { status: 409, headers: PRIVATE });
    const [bounds, similar] = await Promise.all([stakeBoundsForMarket(market), getSimilarMarkets(market, 3).catch(() => [])]);
    const answer: ReturnChoice = {
      state: "closed",
      // A closed frame never prices a stake. The remaining fields are real market data for the shared sheet geometry.
      seed: { v: 1, id: market.id, bettable: false, yesPool: market.yesPool, noPool: market.noPool,
        rates: null, feePct: null, min: bounds.min, max: bounds.max,
        closesAt: market.selectionClosedAt ?? market.resolutionAt, serverNow: Date.now() },
      title: cardTitle(locale, market).text, walletBalance,
      similar: similar.map((row) => ({ id: row.id, title: cardTitle(locale, row).text })),
    };
    return NextResponse.json(answer, { headers: PRIVATE });
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers: PRIVATE });
  }
}
