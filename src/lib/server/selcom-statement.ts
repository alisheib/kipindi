/**
 * THE SELCOM STATEMENT — Jay's #7, and the one mistake this page must not make.
 *
 * The Gaming Board asked for the Selcom page to show both balances and one statement
 * covering deposits *and* withdrawals. `scripts/live/ops/README.md` states the trap in one
 * line: separate `BET_PAYOUT` (an internal wallet credit) from `WITHDRAWAL` (money actually
 * leaving to Selcom) — *"conflating them reads as 'payouts work' when the rail is untested."*
 * Adding a ledger movement to a rail movement produces a number true of nothing, on a page
 * built for the regulator.
 *
 * ⭐ THE CONFLATION HAS A MEASURED SIZE, so nobody has to take the warning on trust.
 * On production, 2026-08-25: the rail moved **TZS 70,000** out (12 confirmed `WITHDRAWAL`);
 * the internal wallet credited **TZS 2,077,191** (289 `BET_PAYOUT`). Reporting the second
 * as the first overstates what left the platform by **29.7×**.
 *
 * ⛔ AND SELCOM EXPOSES NO COLLECTIONS BALANCE AT ALL. Measured on production three
 * independent ways (session 62, `docs/SESSION-PROMPT-JAY-COMMENTS.md` §3 ▶ I): the only
 * balance endpoint is `POST /v1/vendor/balance`, its `data` array has length 1, and the
 * drawdown proves the account it reads is the DISBURSEMENT float — it fell ~73,615 against
 * 70,000 of confirmed payouts while 646,000 of confirmed collections passed through and
 * never touched it. Collections settle elsewhere. So the page **says so**; it does not
 * compute a number from our ledger and label it a Selcom balance (A-5).
 *
 * ═══ WHY PROVENANCE IS A TYPE AND NOT A COMMENT ═══════════════════════════════════════
 *
 * "A guard that fails if a ledger figure is ever labelled a rail figure" cannot be a check
 * on wording — this campaign has counted a thing by its spelling and been wrong three
 * separate times. So every figure that reaches the page carries its OWN provenance, and the
 * renderer prints the provenance label out of the same object as the number. A ledger total
 * cannot appear under a rail heading because the heading is not written by hand.
 *
 *   · `source: "rail"`   — Selcom's own API said this. Only `railFloat()` can mint one.
 *   · `source: "ledger"` — our database said this. It is labelled as ours, always.
 *
 * ⚠️ AND THE STATEMENT DELIBERATELY CARRIES THE NUMBER IT IS NOT. `internalCredits` is on
 * the page, beside the rail figure, marked as money that never left the platform. Hiding it
 * would leave an officer to wonder where the other 2M went; showing it under the wrong
 * heading is the defect. Naming it is the only honest third option.
 *
 * ⚠️ SCALE. `tallyRailTotals` exists for the in-memory store and for the guard; production
 * reads the same three numbers through a DB-side aggregate (`db.txn.totalsByType`), because
 * this page must not walk a 20,000-row ledger. `report-money.ts` records what that costs:
 * 3,176 ms and 333 MB of heap. The two are twins on purpose and the guard asserts they agree.
 */
import type { StoredTxn } from "./store";

/** Where a number came from. There is no third value, and no way to change one. */
export type Provenance = "rail" | "ledger";

/** A figure that knows its own origin. The renderer reads the label off `source`. */
export type SourcedAmount = {
  readonly amount: number;
  readonly count: number;
  readonly source: Provenance;
};

/**
 * ⛔ THE ONE PLACE THAT DECIDES WHAT "CROSSED THE RAIL" MEANS.
 *
 * `DEPOSIT` and `WITHDRAWAL` are the only two transaction types that correspond to money
 * moving between a player's mobile wallet and ours. Everything else — `BET_PLACED`,
 * `BET_PAYOUT`, `BET_REFUND`, `BONUS_CREDIT`, `CASHOUT`, `HOUSE_FEE`, both `ADJUSTMENT_*` —
 * moves value *inside* the platform and never reaches Selcom.
 */
export const RAIL_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const;

/**
 * ⛔ CARRIED ON THE STATEMENT SO IT CAN BE SHOWN AS WHAT IT IS, never added to the rail.
 * A winner's credit lands in their 50pick wallet; nothing about it touches Selcom.
 */
export const INTERNAL_CREDIT_TYPE = "BET_PAYOUT" as const;

/** The three tallies the statement is built from. Counted once, in the database. */
export type RailTotals = {
  readonly DEPOSIT: { readonly amount: number; readonly count: number };
  readonly WITHDRAWAL: { readonly amount: number; readonly count: number };
  readonly BET_PAYOUT: { readonly amount: number; readonly count: number };
};

export const TALLY_TYPES = [...RAIL_TYPES, INTERNAL_CREDIT_TYPE] as const;

/**
 * The in-memory twin of `db.txn.totalsByType`'s SQL. Same rule, so a statement cannot
 * produce different numbers depending on which store it ran against.
 *
 * ⚠️ `Math.abs` — withdrawals are stored NEGATIVE (the live census reads
 * `WITHDRAWAL CONFIRMED n=12 total=-70000`). A statement that summed them raw would print a
 * negative "money out" and, worse, a `net` that ADDED when it should have subtracted.
 */
export function tallyRailTotals(txns: StoredTxn[]): RailTotals {
  const zero = () => ({ amount: 0, count: 0 });
  const acc: Record<string, { amount: number; count: number }> = {
    DEPOSIT: zero(), WITHDRAWAL: zero(), BET_PAYOUT: zero(),
  };
  for (const t of txns) {
    if (t.status !== "CONFIRMED") continue;
    const slot = acc[t.type];
    if (!slot) continue;
    slot.amount += Math.abs(t.amount);
    slot.count += 1;
  }
  return acc as RailTotals;
}

/**
 * A balance Selcom either told us, or does not publish. ⛔ There is deliberately no
 * `{ available: false, fallback: number }` shape — an "unavailable" balance with a number
 * attached is how a ledger figure gets read as a rail figure by the next person to edit
 * the renderer.
 */
export type RailBalance =
  | { readonly available: true; readonly balance: number; readonly source: "rail" }
  | { readonly available: false; readonly reason: string };

export type SelcomStatement = {
  /** What Selcom's own API answered. */
  readonly rail: {
    /** The disbursement float — the ONE balance the vendor API exposes. */
    readonly disbursementFloat: RailBalance;
    /**
     * ⛔ ALWAYS UNAVAILABLE, and that is a fact about Selcom's contract rather than a gap
     * in this code. `pushussd` / `query-status` / the three callbacks are all
     * per-transaction; there is no per-account collections balance to read.
     */
    readonly collectionsBalance: { readonly available: false; readonly reason: string };
  };
  /** What OUR ledger says crossed the rail. Every figure is `source: "ledger"`. */
  readonly statement: {
    /** Confirmed `DEPOSIT` — money that arrived from a player's mobile wallet. */
    readonly in: SourcedAmount;
    /** Confirmed `WITHDRAWAL` — money that actually left to Selcom. */
    readonly out: SourcedAmount;
    /** in − out. Positive means more arrived than left. */
    readonly net: SourcedAmount;
  };
  /**
   * ⛔ THE FIGURE THAT IS NOT A RAIL FIGURE, carried explicitly so it can be shown as what
   * it is. Confirmed `BET_PAYOUT` — winnings credited inside the player's wallet. None of
   * this money touched Selcom.
   */
  readonly internalCredits: SourcedAmount;
  /** How far out a reader would be if they quoted `internalCredits` as money paid out. */
  readonly conflationRatio: number | null;
};

/**
 * Narrow the DAL's open-ended `Record` into the three tallies the statement needs.
 *
 * ⚠️ IT SEEDS THE MISSING KEYS AT ZERO, and that is not defensive noise. A SQL `GROUP BY`
 * omits a type that has no confirmed rows entirely, so a platform that has never paid a
 * withdrawal would hand back an object with no `WITHDRAWAL` key — and `undefined.amount`
 * renders as a crashed card, or worse, as a silently missing section. A true zero must look
 * like a zero.
 */
export function asRailTotals(raw: Record<string, { amount: number; count: number }>): RailTotals {
  const zero = { amount: 0, count: 0 } as const;
  return {
    DEPOSIT: raw.DEPOSIT ?? zero,
    WITHDRAWAL: raw.WITHDRAWAL ?? zero,
    BET_PAYOUT: raw.BET_PAYOUT ?? zero,
  };
}

/** ⛔ The ONLY constructor for a `rail`-sourced figure. */
export function railFloat(balance: number | null): RailBalance {
  return balance === null
    ? { available: false, reason: "Selcom is not the active provider, or the float PIN is not set." }
    : { available: true, balance, source: "rail" };
}

const ledgerFigure = (t: { amount: number; count: number }): SourcedAmount =>
  ({ amount: t.amount, count: t.count, source: "ledger" });

/**
 * Build the statement. `floatBalance` is the live Selcom read (or `null` if it could not be
 * read); `totals` are the three confirmed tallies.
 *
 * ⚠️ PURE, and exported for that reason — the guard drives this function against real
 * totals rather than scanning the page for a heading.
 */
export function buildSelcomStatement(totals: RailTotals, floatBalance: number | null): SelcomStatement {
  const moneyIn = ledgerFigure(totals.DEPOSIT);
  const moneyOut = ledgerFigure(totals.WITHDRAWAL);
  const internalCredits = ledgerFigure(totals.BET_PAYOUT);

  return {
    rail: {
      disbursementFloat: railFloat(floatBalance),
      // ⛔ NEVER derived, never conditional, and never given a number. See the header.
      collectionsBalance: {
        available: false,
        reason: "Selcom publishes no collections balance — the C2B contract is per-transaction. Collections settle to the bank account, not to a float we can read.",
      },
    },
    statement: {
      in: moneyIn,
      out: moneyOut,
      net: { amount: moneyIn.amount - moneyOut.amount, count: moneyIn.count + moneyOut.count, source: "ledger" },
    },
    internalCredits,
    conflationRatio: moneyOut.amount > 0 ? internalCredits.amount / moneyOut.amount : null,
  };
}

/**
 * The label a figure is allowed to carry, derived from the figure itself. The renderer
 * calls this rather than writing a heading, so the two cannot drift apart.
 */
export function provenanceLabel(source: Provenance): { short: string; sw: string; long: string } {
  return source === "rail"
    ? {
        short: "from Selcom",
        sw: "kutoka Selcom",
        long: "Read live from Selcom's vendor API.",
      }
    : {
        short: "from our ledger",
        sw: "kutoka daftari letu",
        long: "Counted from our own confirmed transactions — not a figure Selcom reported.",
      };
}
