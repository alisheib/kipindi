import { listPositionsForUser, positionCardMarkets } from "@/lib/server/market-service";

/**
 * THE SIGNED-IN HERO'S "YOUR PICKS" (landing v3 · WP14 part 2 — the delivery's wallet scenario §4a).
 *
 * ⭐ ONE READING WITH /positions. The same read (the MARKET line, the 5,000 newest), the same market
 * join (`positionCardMarkets`) and the same drop of a row whose market is missing — so `open +
 * awaiting` IS the Open count on /positions, split by one question: is the market still taking picks?
 * Two surfaces that disagree about someone's position is the defect DESIGN_AUTHORITY B6 exists for.
 *
 *   · open      — an OPEN position on a market still taking picks;
 *   · awaiting  — an OPEN position on a market whose betting has closed (closed, or past its cut-off),
 *                 waiting for the result;
 *   · paid      — what settled positions PAID this week: a win's payout and a cash-out's proceeds, the
 *                 same two kinds the landing's "paid out to players" figure sums (BET_PAYOUT, CASHOUT).
 *                 A refund is money returned, not paid, and is not counted — as on the platform figure.
 *
 * "This week" is the EAT calendar week: Monday 00:00 in Dar es Salaam, the product's one clock.
 * ⛔ A FAILED READ THROWS: the caller turns it into "show nothing", never into three zeros (B-1).
 */
export type LandingPicks = { open: number; awaiting: number; paidThisWeekTzs: number };

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 EAT of the week containing `nowMs`, as epoch ms. Pure. */
export function eatWeekStartMs(nowMs: number): number {
  const eat = new Date(nowMs + EAT_OFFSET_MS);
  const sinceMonday = (eat.getUTCDay() + 6) % 7;
  const eatMidnight = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate());
  return eatMidnight - sinceMonday * DAY_MS - EAT_OFFSET_MS;
}

type PickRow = { marketId: string; status: string; finalPayout: number | null; settledAt: string | null };
type PickMarket = { status: string; selectionClosedAt: string | null; resolutionAt: string };

/** The rule, pure — so the split and the week are tested without a database. */
export function tallyPicks(rows: readonly PickRow[], markets: ReadonlyMap<string, PickMarket>, nowMs: number): LandingPicks {
  const weekStart = eatWeekStartMs(nowMs);
  let open = 0, awaiting = 0, paid = 0;
  for (const p of rows) {
    const m = markets.get(p.marketId);
    if (!m) continue; // /positions drops it too — a row that cannot render is not counted
    if (p.status === "OPEN") {
      const cutoff = Date.parse(m.selectionClosedAt ?? m.resolutionAt);
      const closed = m.status === "CLOSED" || m.status === "RESOLVED" || m.status === "VOIDED" || !(cutoff > nowMs);
      if (closed) awaiting++; else open++;
    } else if ((p.status === "WIN" || p.status === "CASHED_OUT") && p.settledAt && Date.parse(p.settledAt) >= weekStart) {
      paid += p.finalPayout ?? 0;
    }
  }
  return { open, awaiting, paidThisWeekTzs: paid };
}

export async function landingPicks(userId: string, nowMs: number): Promise<LandingPicks> {
  const positions = await listPositionsForUser(userId, 5_000, "MARKET");
  const weekStart = eatWeekStartMs(nowMs);
  const relevant = positions.filter((p) =>
    p.status === "OPEN" ||
    ((p.status === "WIN" || p.status === "CASHED_OUT") && !!p.settledAt && Date.parse(p.settledAt) >= weekStart));
  const markets = await positionCardMarkets([...new Set(relevant.map((p) => p.marketId))]);
  return tallyPicks(relevant, markets, nowMs);
}
