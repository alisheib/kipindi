/**
 * WHAT THE BET SHEET READS — `GET /api/markets/[id]/sheet` (the Vodacom plan S3, `docs/VODACOM-PLAN.md` §3.1). The
 * route is a thin door; the two reads live here so a suite can drive them without HTTP.
 *
 *   · `sheetPublic` — the market's public facts: whether it takes bets now, its pools, its FROZEN rates (the ones a
 *     bet placed now is priced at, `ratesFor`), the loser-share `{pct}`, the stake bounds (`stakeBoundsForMarket`, the
 *     one resolver the bet path enforces), when betting closes, the server's clock, and the card's figure for each
 *     side (`cardEstimate`). Identical for every viewer, so the route may cache it for a few seconds.
 *   · `sheetForUser` — the signed-in viewer's own: what they can spend (balance + bonus, the figure `buyPosition`
 *     refuses against), the sides they already hold on this market (OPEN positions), and whether a stake could draw on
 *     bonus money. Never cached.
 *
 * ⛔ AN UP & DOWN ROUND, OR A MARKET THAT IS NOT LIVE, IS NOT A SHEET: `sheetPublic` returns null and the route
 * answers 404. "Bettable" mirrors the bet path exactly: not `isSelectionClosed`, and before `resolutionAt`.
 */
import { getMarket, isSelectionClosed, ratesFor, stakeBoundsForMarket } from "./market-service";
import { positionStore } from "./market-dal";
import { db } from "./store";
import { cardEstimate, pickEstimateRates, type Estimate, type EstimateRates } from "@/lib/markets/estimate";
import { cardClosesAtMs } from "@/lib/markets/card-close-label";
import { loserSharePct } from "@/lib/payout";

export type SheetPublic = {
  id: string;
  /** The market takes a bet at this moment (the bet path's own test). */
  bettable: boolean;
  yesPool: number;
  noPool: number;
  /** The frozen rates the estimate reads — nothing more (`EstimateRates`). */
  rates: EstimateRates | null;
  /** `{pct}` — the frozen loser-share total; null under capped-commission. */
  feePct: number | null;
  min: number;
  max: number;
  /** When betting closes (`selectionClosedAt ?? resolutionAt`), ISO; null when the market carries neither. */
  closesAt: string | null;
  /** The server's clock, so a sheet counts down against it rather than the phone's. */
  serverNow: number;
  /** The card's figure for each side (stake 0, SJ-1). */
  estimates: { YES: Estimate | null; NO: Estimate | null };
};

export type SheetForUser = {
  /** balance + bonus — null when the wallet could not be read (the sheet shows "Salio lako —"). */
  spendable: number | null;
  balance: number | null;
  bonusBalance: number;
  /** The sides this viewer already holds OPEN positions on, on this market. */
  heldSides: Array<"YES" | "NO">;
  /** A stake above the cash balance would draw on bonus money (bonus bets cannot be cashed out). */
  bonusWarning: boolean;
};

/** The public half, or null for a missing market, an Up & Down round, or a market that is not LIVE. */
export async function sheetPublic(marketId: string, nowMs: number = Date.now()): Promise<SheetPublic | null> {
  if (typeof marketId !== "string" || !/^mkt_[A-Za-z0-9]{1,64}$/.test(marketId)) return null;
  const m = await getMarket(marketId);
  if (!m || m.productLine === "UPDOWN" || m.status !== "LIVE") return null;
  const bettable = !isSelectionClosed(m) && Date.parse(m.resolutionAt) > nowMs;
  const rates = pickEstimateRates(ratesFor(m));
  const bounds = await stakeBoundsForMarket(m);
  const closes = cardClosesAtMs(m);
  return {
    id: m.id,
    bettable,
    yesPool: m.yesPool,
    noPool: m.noPool,
    rates,
    feePct: rates ? loserSharePct(rates) : null,
    min: bounds.min,
    max: bounds.max,
    closesAt: closes === null ? null : new Date(closes).toISOString(),
    serverNow: nowMs,
    estimates: {
      YES: cardEstimate(m, rates, "YES", bettable),
      NO: cardEstimate(m, rates, "NO", bettable),
    },
  };
}

/** The signed-in half, for `userId` only — the caller names the market, never the user or a position. */
export async function sheetForUser(marketId: string, userId: string): Promise<SheetForUser> {
  // ⚠️ try/catch, not `.catch()`: the in-memory twin answers synchronously, and a read that fails is "unknown", not 0.
  let wallet: Awaited<ReturnType<typeof db.wallet.findByUserId>> | null = null;
  try { wallet = await db.wallet.findByUserId(userId); } catch { wallet = null; }
  const balance = wallet && Number.isFinite(wallet.balance) ? wallet.balance : null;
  const bonusBalance = Math.max(0, wallet?.bonusBalance ?? 0);
  let positions: Awaited<ReturnType<typeof positionStore.listForUserAndMarket>> = [];
  try { positions = await positionStore.listForUserAndMarket(userId, marketId); } catch { positions = []; }
  const held = new Set<"YES" | "NO">();
  for (const p of positions) if (p.status === "OPEN" && (p.side === "YES" || p.side === "NO")) held.add(p.side);
  return {
    spendable: balance === null ? null : Math.max(0, balance) + bonusBalance,
    balance,
    bonusBalance,
    heldSides: (["YES", "NO"] as const).filter((s) => held.has(s)),
    bonusWarning: bonusBalance > 0,
  };
}
