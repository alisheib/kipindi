/**
 * GOVERNMENT TAX REPORT — the reader. Every figure the page, the PDF, the workbook and the CSV
 * print comes out of `buildTaxReportData`, and nowhere else (`docs/TAX-REPORT.md` §3).
 *
 * ── THREE SOURCES, ON PURPOSE ────────────────────────────────────────────────────────────────
 *
 *  MONEY RECORDS (Transaction, CONFIRMED)  Sales · Payout · Refunds — what each wallet was actually
 *                                          debited and credited, by the record's own timestamp.
 *  BETS (Position)                         On hold at the cut-off · On hold brought forward — the
 *                                          only record of what was still waiting at an instant.
 *  ROUNDS (PredictionMarket, frozen rates) The platform fee each resulted round kept, recomputed by
 *                                          `chargedFee` — the very call settlement debits, pinned
 *                                          against real settlement by `test:charged-fee`.
 *
 * ⭐ So the check `Sales + On hold brought forward = Payout + Refunds + Platform fee kept + On hold`
 * compares independent records. On clean books it closes to the cent; when it does not, every
 * shilling of the difference is attributed below to a named bet, round or money record.
 *
 * ── HOW THE DIFFERENCE IS ATTRIBUTED (and why the list always adds up) ────────────────────────
 *
 * Write the difference D as a sum of terms, one per bet (its stake entering or leaving "on hold"),
 * one per money record (± its amount) and one per resulted round (− the fee it kept). Regroup the
 * SAME terms by key:
 *   · a bet's own terms + its money records       → zero on clean books for an open, voided or
 *                                                   exited bet; stake − winnings for a resulted one
 *   · a resulted round: Σ its bets' (stake − winnings) − the fee it kept → zero on clean books
 *   · a money record whose bet cannot be found    → its own amount
 * Each non-zero group is an exception, and the groups are a REGROUPING of D — so Σ of the
 * exceptions' contributions equals D exactly, by construction. `test:tax-report` §12 proves it on
 * seeded books; `explainedCents` carries it to the page so a reader can see it close.
 *
 * ⛔ NO HOUSE-BOT FILTER, SPLIT OR MEMO (owner rulings D20a/D21b): a house stake is an ordinary
 * player stake in every report. Nothing here reads the marker.
 * ⛔ NO `listMarkets()` — it defaults to polls only and drops Up & Down, three quarters of the book.
 * Rounds are read by id (`bookByIds`), which takes no product filter by design.
 *
 * ── MILLIONEA (MASWALI-BUILD S6, OD-08; MB-65) ────────────────────────────────────────────────
 *
 * A Maswali Millionea week is a round of its own model. Its tickets are bets (money records and positions,
 * as every bet), and when it settles its pool also takes money in that is not Sales — the carried jackpot
 * R and the house's floor top-up U — and sends money out that is not Payout: a no-winner week's whole sales,
 * or a paying week's rounding, carried to the jackpot for a later week. Those three amounts and the fee the
 * week booked come from the WEEK'S OWN SETTLEMENT RECORD (`MaswaliCycle`, the columns its settlement wrote in
 * the same transaction as its ledger group — the memory store keeps no ledger, so this is the one record both
 * stores answer from). Its fee kept is recomputed by `chargedFee` from the week's frozen rate and its jackpot,
 * the way the settlement took it, so the check still compares independent records:
 *   Sales + On hold brought forward + Jackpot brought forward + House floor top-up
 *     = Payout + Refunds + Platform fee kept + On hold + Carried to the jackpot
 * Report 2 files the fee the week's settlement BOOKED (a share of J), never 13% × its winners' Payout. A view
 * that holds no week reads nothing more and prints exactly what it always did.
 */
import { db } from "./store";
import type { StoredTxn } from "./store";
import { positionStore, marketStore, type MarketBook } from "./market-dal";
import type { StoredPosition } from "./market-service";
import { snapshotOrLegacy } from "./market-config";
import { readTaxRates } from "./tax-config";
import { weekStore, type StoredWeek } from "./maswali-dal";
import { lacksText, settledWeekGaps } from "./maswali-week-record";
import { chargedFee } from "@/lib/payout";
import { eatDayKey } from "@/lib/eat-day";
import {
  BP_WHOLE,
  REFUND_REASON_ORDER,
  classifyRefund,
  cutoffOf,
  dayEdges,
  formatCents,
  rateSegments,
  reconcile,
  taxForSegments,
  toCents,
  type DifferenceParts,
  type ExceptionKind,
  type JackpotTaxPart,
  type ProductFilter,
  type RateVersion,
  type Reconciliation,
  type ReconException,
  type RefundReasonCode,
  type Report1,
  type TaxPeriod,
  type TaxTotals,
} from "@/lib/tax-report";

/** The money-record types this report reads. Withdrawals, deposits, bonuses and adjustments are
 *  wallet movements, never Sales, Payout or Refunds (plan FR-3) — they are simply not read. */
const BET_TYPES = new Set(["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "CASHOUT"]);

/** How many exceptions travel with the report; the count and the explained total cover them all. */
export const EXCEPTION_LIST_CAP = 200;

/** Round ids per `bookByIds` call — under Postgres's bind-parameter ceiling with room to spare. */
const BOOK_CHUNK = 5_000;

export type Product = Exclude<ProductFilter, "ALL">;

/** Everything one product filter's reports need. All money is integer cents; tax lines whole TZS. */
export type ProductFigures = {
  product: ProductFilter;
  report1: Report1;
  reconciliation: Reconciliation;
  parts: DifferenceParts;
  tax: TaxTotals;
  feeDetail: {
    /** Our fee booked on each resulted round — a share of the losing side at the round's frozen rate (floor of the fee, as booked). */
    settlementFeeCents: number;
    /** The shilling a fractional fee leaves in a resulted pool (pool − floor(net) − floor(fee)). */
    roundingCents: number;
    /** Fees on legacy paid early exits (the CASHOUT record's own fee). */
    exitFeeCents: number;
  };
  counts: {
    betsPlaced: number;
    betsBroughtForward: number;
    betsOnHold: number;
    stakeRecords: number;
    payoutRecords: number;
    /** Refunded tickets: one per refund money record (BET_REFUND, CASHOUT), plus a bet staked wholly from bonus and
     *  voided, which has none. The name predates that second case; it is stored in every lock, so it stays. */
    refundRecords: number;
    roundsResulted: number;
  };
  refundsByReason: Array<{ code: RefundReasonCode; count: number; cents: number }>;
  bonus: { placedCents: number; refundedCents: number };
};

/**
 * One day of a window longer than a day — that day's OWN report: the same reader, cut at the day's edges, so a row is
 * the day opened on its own (`daySlice(...).period`), never a second arithmetic. Its flows (Sales, Payout, Refunds,
 * the fee kept) add up to the window's; On hold is the day's closing balance and the next day's opening one; its tax
 * is computed on its own Payout and rounded at each step, as the plan rounds any period.
 */
export type DayFigures = {
  dayKey: string;
  /** The slice: the EAT day, or the part of it inside the window (and, for a running window, before its cut-off). */
  startMs: number;
  endMs: number;
  report1: Report1;
  differenceCents: number;
  balanced: boolean;
  counts: { betsPlaced: number; payoutRecords: number; refundRecords: number; betsOnHold: number };
  tax: { commission: number; tra: number; gbt: number; total: number };
};

export type TaxReportData = {
  version: 1;
  period: TaxPeriod;
  product: ProductFilter;
  /** Where the figures stop: the period's end, or a minute before generation for a running period (`RUNNING_MARGIN_MS`). */
  cutoffMs: number;
  inProgress: boolean;
  notStarted: boolean;
  generatedAtMs: number;
  /** The rate versions in force over the window, one per segment, oldest first. */
  rateVersions: RateVersion[];
  main: ProductFigures;
  /** Polls and Up & Down side by side — and Millionea beside them when the period holds a week (S6) — only on the
   *  All-products view. */
  byProduct: ProductFigures[] | null;
  /** Money records in the window whose bet (or round) cannot be found, so no product can be named. They are
   *  counted under All products only — on every view, so a single-product view can say they exist. */
  unattributedRecords: number;
  /**
   * ⛔ THE WHOLE BOOK'S CHECK, on a single-product view (null on the All view, whose `main` IS the whole book).
   * A difference that belongs to no product (a winnings record with no bet) is invisible to Polls and to Up & Down
   * alike — both would read balanced while the book is not. Sign-off reads this too, so a period cannot be
   * locked product by product around a difference the plan says must block it.
   */
  wholeBook: { differenceCents: number; balanced: boolean } | null;
  /**
   * Day by day, oldest first, for a window that crosses an EAT midnight: `[]` before it has read anything (not started,
   * or opened less than a minute ago), each day so far while it runs. null when the window lies inside one EAT day —
   * the period IS the day.
   * ⚠️ OPTIONAL BECAUSE A LOCK IS DATA: a snapshot locked before 2026-10-04 holds no such field. Absent means "this
   * filing recorded no daily figures", never "no days" — every reader says so rather than printing an empty table.
   */
  byDay?: DayFigures[] | null;
  /** The largest exceptions first, at most `EXCEPTION_LIST_CAP`. */
  exceptions: ReconException[];
  exceptionCount: number;
  /** Σ of EVERY exception's contribution — equals `main.reconciliation.differenceCents` by construction. */
  explainedCents: number;
};

type Loaded = {
  S: number;
  E: number;
  records: StoredTxn[];
  bets: Map<string, StoredPosition>;
  books: Map<string, MarketBook>;
  /** ⭐ S6 · each Millionea week the window's bets belong to, by its market id — its own settlement record. */
  weeks: Map<string, StoredWeek>;
  /** The window holds a Millionea week (its rounds are among `books`): All products then carries Millionea's lines. */
  hasWeek: boolean;
  segments: ReturnType<typeof rateSegments>;
};

const ms = (iso: string | null | undefined): number | null => (iso ? Date.parse(iso) : null);

function productOfBet(p: StoredPosition | undefined, books: Map<string, MarketBook>): Product | null {
  if (!p) return null;
  return books.get(p.marketId)?.productLine ?? null;
}

function inScope(prod: Product | null, filter: ProductFilter): boolean {
  return filter === "ALL" || prod === filter;
}

/** The instant a bet LEFT "on hold", or null while it has not. A bet whose status is still OPEN has
 *  not left, whatever a stray stamp says; a terminal status with no stamp is treated as still open
 *  (and its money record then surfaces as an exception, which is what it is). */
function leftOpenAt(p: StoredPosition): number | null {
  if (p.status === "OPEN") return null;
  return ms(p.settledAt);
}

function openAt(p: StoredPosition, t: number): boolean {
  const placed = Date.parse(p.placedAt);
  if (!(placed < t)) return false;
  const left = leftOpenAt(p);
  return left === null || left >= t;
}

/** What settlement kept from a resulted round, from the round's own frozen rates. */
function roundKeep(b: MarketBook): { keepCents: number; bookedFeeTzs: number; roundingCents: number; expectedWinningsTzs: number } | null {
  const verdict = b.resolvedOutcome;
  if (verdict !== "YES" && verdict !== "NO" && verdict !== "VOID") return null;
  const fee = chargedFee({ yesPool: b.yesPool, noPool: b.noPool, resolvedOutcome: verdict, productLine: b.productLine }, snapshotOrLegacy(b.feeSnapshot));
  if (fee.refunded) return { keepCents: 0, bookedFeeTzs: 0, roundingCents: 0, expectedWinningsTzs: 0 };
  const poolCents = toCents(b.yesPool) + toCents(b.noPool);
  // ⭐ Exactly settlement's arithmetic: winners share floor(netPool) (`allocateWinnerPayouts`), the
  // fee is booked as floor(fee) (`allocateFeeShares`), and what neither took stays in the pool.
  const expectedWinningsTzs = Math.floor(fee.netPool);
  const bookedFeeTzs = Math.max(0, Math.floor(fee.fee));
  const keepCents = poolCents - expectedWinningsTzs * 100;
  return { keepCents, bookedFeeTzs, roundingCents: keepCents - bookedFeeTzs * 100, expectedWinningsTzs };
}

async function load(period: TaxPeriod, nowMs: number, versions: RateVersion[]): Promise<Loaded & { inProgress: boolean; notStarted: boolean }> {
  const { cutoffMs, inProgress, notStarted } = cutoffOf(period, nowMs);
  const S = period.startMs;
  const E = cutoffMs;
  if (notStarted || !(E > S)) {
    return { S, E: S, records: [], bets: new Map(), books: new Map(), weeks: new Map(), hasWeek: false, segments: [], inProgress, notStarted };
  }
  // One windowed read of the money records (half-open [S, E), the store's own bounds), then the
  // bets live in the window, then any bet a record names that the live read did not return.
  const records = (await db.txn.listInRange(S, E)).filter((t) => t.status === "CONFIRMED" && BET_TYPES.has(t.type));
  const live = await positionStore.listLiveDuring(S, E);
  const bets = new Map<string, StoredPosition>(live.map((p) => [p.id, p]));
  const missing = [...new Set(records.map((r) => r.positionId).filter((id): id is string => !!id && !bets.has(id)))];
  if (missing.length) for (const p of await positionStore.getMany(missing)) bets.set(p.id, p);
  // ⛔ CHUNKED. `bookByIds` binds every id in one `IN (…)`; Up & Down settles a round every few minutes, so a
  // year-long custom window names ~100,000 rounds — past Postgres's 32,767 bind parameters. 5,000 at a time,
  // the same chunk `attribution(ids)` and `getMany` use.
  const marketIds = [...new Set([...bets.values()].map((p) => p.marketId))];
  const books = new Map<string, MarketBook>();
  for (let i = 0; i < marketIds.length; i += BOOK_CHUNK) {
    for (const [id, b] of await marketStore.bookByIds(marketIds.slice(i, i + BOOK_CHUNK))) books.set(id, b);
  }
  // ⭐ S6 · OD-08 — each Millionea week the window's bets belong to, read by its market: one read per week (a month
  // holds four or five), and none at all for a window that holds no week. A week whose record cannot be found is left
  // out of the map, and its round then names that, never a guessed figure.
  const weeks = new Map<string, StoredWeek>();
  let hasWeek = false;
  for (const b of books.values()) {
    if (b.productLine !== "MASWALI") continue;
    hasWeek = true;
    const w = await weekStore.getByMarketId(b.id);
    if (w) weeks.set(b.id, w);
  }
  return { S, E, records, bets, books, weeks, hasWeek, segments: rateSegments(S, E, versions), inProgress, notStarted };
}

/** What a resulted Millionea week's pool took in and sent out besides its stakes and its winnings (`weekKeep`). */
type WeekKeep = {
  /** The fee it kept, in cents — `chargedFee`'s recompute from its frozen rate and its jackpot. */
  keepCents: number;
  /** R, when the week paid (a no-winner week claims its carry but moves none of it — MR-21). */
  inCents: number;
  /** U, the guarantee's top-up. */
  topUpCents: number;
  /** What it carried to the jackpot: S for a no-winner week, the rounding for a paying one. */
  carriedCents: number;
  /** Report 2's part, when the week paid: the instant, J and the fee its settlement booked. */
  paid: { atMs: number; jackpotCents: number; bookedFee: number; feeRateBp: number | null } | null;
  /** Why the week's own record could not supply its figures, or null. */
  problem: string | null;
};

/**
 * ⭐ S6 · OD-08 — a resulted Millionea week's own figures, from its settlement record. Exactly the settlement's own
 * reading of a week (MASWALI-PLAN §5b): R entered the pool only when a ticket won (`MASWALI_ROLLOVER_IN`, or the final
 * week's `MASWALI_SUNSET`); a no-winner week claims its carry but moves none of it, and rolls its whole S out
 * (`carryOut` = S). The fee kept is `chargedFee`'s recompute — `round(rate × J)` from the frozen rate — so a week whose
 * booked figures disagree with its own rate surfaces as a difference rather than being copied in.
 * ⛔ A week whose record is missing, or not SETTLED although its tickets resulted, supplies nothing and says why.
 */
function weekKeep(b: MarketBook, w: StoredWeek | undefined): WeekKeep {
  const none = (problem: string): WeekKeep => ({ keepCents: 0, inCents: 0, topUpCents: 0, carriedCents: 0, paid: null, problem });
  if (!w) return none("The week's own record is missing, so its fee and its jackpot lines cannot be read.");
  if (w.state !== "SETTLED") return none(`The week's tickets resulted, but week ${w.code} is ${w.state}: its settlement is not on record.`);
  // ⛔ A null where a settled week must hold a figure is a fault in its record, never a zero (`settledWeekGaps`) — of the
  // figures this report reads, and only those (round 5): its levies are priced from the fee, never read from the record.
  const paidWeek = (w.winningTickets ?? 0) > 0;
  const gaps = settledWeekGaps(w, ["winningTickets", "topUp", "carryOut", ...(paidWeek ? (["rolloverIn", "settledAt", "fee", "jackpot"] as const) : [])]);
  if (gaps.length) return none(`Week ${w.code} is settled, but its settlement record lacks ${lacksText(gaps)}: its fee and its jackpot lines cannot be read.`);
  const rates = snapshotOrLegacy(b.feeSnapshot);
  // Every column below was checked present just above: these are the record's own figures, never a default.
  const k = w.winningTickets as number;
  const fee = chargedFee({ yesPool: b.yesPool, noPool: b.noPool, productLine: "MASWALI", week: { state: "SETTLED", jackpot: w.jackpot, winningTickets: k } }, rates).fee;
  const rate = rates.jackpotFeeRate;
  return {
    keepCents: fee * 100,
    inCents: k > 0 ? toCents(w.rolloverIn as number) : 0,
    topUpCents: toCents(w.topUp as number),
    carriedCents: toCents(w.carryOut as number),
    paid: k > 0
      ? { atMs: Date.parse(w.settledAt as string), jackpotCents: toCents(w.jackpot as number), bookedFee: Math.round(w.fee as number), feeRateBp: typeof rate === "number" ? Math.round(rate * BP_WHOLE) : null }
      : null,
    problem: null,
  };
}

/** One product filter's figures and its exceptions — a pure function of what `load` read. */
function figuresFor(L: Loaded, filter: ProductFilter): { fig: ProductFigures; exceptions: ReconException[] } {
  const { S, E, books } = L;
  const counts = { betsPlaced: 0, betsBroughtForward: 0, betsOnHold: 0, stakeRecords: 0, payoutRecords: 0, refundRecords: 0, roundsResulted: 0 };
  const exceptions: ReconException[] = [];
  const reasons = new Map<RefundReasonCode, { count: number; cents: number }>(REFUND_REASON_ORDER.map((c) => [c, { count: 0, cents: 0 }]));
  let salesCents = 0, payoutCents = 0, refundsCents = 0, exitFeeCents = 0, onHoldCents = 0, broughtForwardCents = 0;
  let bonusPlaced = 0, bonusRefunded = 0;

  // ⭐ S6 · OD-08 — Millionea's three reconciling lines, on a view that holds Millionea; Report 2's part per stretch.
  const jackpotLines = filter === "MASWALI" || (filter === "ALL" && L.hasWeek);
  let jackpotInCents = 0, topUpCents = 0, carriedCents = 0;
  const segJackpot: Array<JackpotTaxPart | null> = L.segments.map(() => null);

  // ── Money records, grouped by the bet they belong to ───────────────────────────────────────
  type BetMoney = { stakeRec: number; winnings: number; refund: number; exitPaid: number; exitFee: number; payoutRecs: StoredTxn[] };
  const byBet = new Map<string, BetMoney>();
  const segPayout = L.segments.map(() => 0);
  const orphan: Array<{ r: StoredTxn; contribution: number }> = [];
  for (const r of L.records) {
    const bet = r.positionId ? L.bets.get(r.positionId) : undefined;
    const prod = productOfBet(bet, books);
    if (!inScope(prod, filter)) continue;
    const amountCents = toCents(r.amount);
    const feeCents = toCents(r.fee);
    let contribution = 0;
    if (r.type === "BET_PLACED") { salesCents += Math.abs(amountCents); counts.stakeRecords++; contribution = Math.abs(amountCents); }
    else if (r.type === "BET_PAYOUT") {
      payoutCents += amountCents; counts.payoutRecords++; contribution = -amountCents;
      const at = Date.parse(r.createdAt);
      const i = L.segments.findIndex((s) => at >= s.startMs && at < s.endMs);
      // ⭐ S6 · OD-08 — a Millionea share is Payout, never the taxable reference: Report 2 files the fee its week BOOKED.
      if (prod !== "MASWALI") segPayout[i < 0 ? Math.max(0, L.segments.length - 1) : i] += amountCents;
    } else if (r.type === "BET_REFUND") { refundsCents += amountCents; counts.refundRecords++; contribution = -amountCents; }
    else { refundsCents += amountCents; exitFeeCents += feeCents; counts.refundRecords++; contribution = -(amountCents + feeCents); }

    if (r.type === "BET_REFUND" || r.type === "CASHOUT") {
      const b = bet ? books.get(bet.marketId) : undefined;
      const v = b?.resolvedOutcome;
      const code = classifyRefund({ type: r.type, roundFound: !!b, verdict: v === "YES" || v === "NO" || v === "VOID" ? v : null });
      const slot = reasons.get(code)!; slot.count++; slot.cents += amountCents;
    }

    if (!bet) { orphan.push({ r, contribution }); continue; }
    const m = byBet.get(bet.id) ?? { stakeRec: 0, winnings: 0, refund: 0, exitPaid: 0, exitFee: 0, payoutRecs: [] };
    if (r.type === "BET_PLACED") m.stakeRec += Math.abs(amountCents);
    else if (r.type === "BET_PAYOUT") { m.winnings += amountCents; m.payoutRecs.push(r); }
    else if (r.type === "BET_REFUND") m.refund += amountCents;
    else { m.exitPaid += amountCents; m.exitFee += feeCents; }
    byBet.set(bet.id, m);
  }

  // ── The bets: on-hold balances, and each bet's own group ────────────────────────────────────
  type RoundAcc = { stakes: number; winnings: number; bets: number };
  const rounds = new Map<string, RoundAcc>();
  const parts: DifferenceParts = { stakeCents: 0, resultCents: 0, refundCents: 0, exitCents: 0 };
  const push = (e: ReconException, part: keyof DifferenceParts) => { exceptions.push(e); parts[part] += e.contributionCents; };

  for (const p of L.bets.values()) {
    const prod = productOfBet(p, books);
    if (!inScope(prod, filter)) continue;
    const stake = toCents(p.stake);
    const bonus = toCents(p.bonusStakeTzs ?? 0);
    const placed = Date.parse(p.placedAt);
    const left = leftOpenAt(p);
    const placedIn = placed >= S && placed < E;
    const bf = openAt(p, S) && placed < S;
    const holdAtE = openAt(p, E);
    const settledIn = left !== null && left >= S && left < E && placed < E;
    const money = byBet.get(p.id) ?? { stakeRec: 0, winnings: 0, refund: 0, exitPaid: 0, exitFee: 0, payoutRecs: [] };

    if (placedIn) { counts.betsPlaced++; bonusPlaced += bonus; salesCents += bonus; }
    if (bf) { counts.betsBroughtForward++; broughtForwardCents += stake; }
    if (holdAtE) { counts.betsOnHold++; onHoldCents += stake; }
    const voidedIn = settledIn && p.status === "VOID";
    if (voidedIn && bonus > 0) {
      bonusRefunded += bonus; refundsCents += bonus;
      const b = books.get(p.marketId); const v = b?.resolvedOutcome;
      const code = classifyRefund({ type: "BET_REFUND", roundFound: !!b, verdict: v === "YES" || v === "NO" || v === "VOID" ? v : null });
      const slot = reasons.get(code)!; slot.cents += bonus;
      // A bet staked wholly from bonus is refunded with no money record (every refund writer books only a real-money
      // part above zero): it is still ONE refunded ticket — counted once, here, as the reasons count it, so Report 1's
      // refunds, the reasons' total and Report 2's tickets agree (`test:tax-report` §15.16).
      if (money.refund === 0) { slot.count++; counts.refundRecords++; }
    }

    // (1) The stake: what the wallet was debited (+ the bonus-funded part) against the bet's stake.
    const stakeMismatch = money.stakeRec + (placedIn ? bonus - stake : 0);
    if (stakeMismatch !== 0) {
      push({
        kind: placedIn ? "STAKE_MISMATCH" : "STAKE_RECORD_WITHOUT_BET",
        ref: p.id, roundId: p.marketId, product: prod,
        expectedCents: placedIn ? stake - bonus : 0, recordedCents: money.stakeRec, contributionCents: stakeMismatch,
        note: placedIn
          ? `The bet's stake is ${fmt(stake)}; its wallet was debited ${fmt(money.stakeRec)}${bonus ? ` plus ${fmt(bonus)} bonus` : ""}.`
          : `A stake was debited in this period for a bet placed ${placed < S ? "before" : "after"} it.`,
      }, "stakeCents");
    }

    // (2) The rest of the bet's terms: the stake that was on hold in the window, less what is still
    //     on hold at the cut-off, less what came back out.
    const inflow = placedIn || bf ? stake : 0;
    const hold = holdAtE ? stake : 0;
    const returned = money.winnings + money.refund + money.exitPaid + money.exitFee + (voidedIn ? bonus : 0);
    const rest = inflow - hold - returned;
    const resulted = settledIn && (p.status === "WIN" || p.status === "LOSS");
    if (resulted) {
      const acc = rounds.get(p.marketId) ?? { stakes: 0, winnings: 0, bets: 0 };
      acc.stakes += inflow; acc.winnings += money.winnings + money.refund + money.exitPaid + money.exitFee; acc.bets++;
      rounds.set(p.marketId, acc);
      continue;
    }
    if (rest === 0) continue;
    let kind: ExceptionKind; let part: keyof DifferenceParts; let note: string;
    if (settledIn && p.status === "VOID") {
      kind = "REFUND_MISMATCH"; part = "refundCents";
      note = `Voided bet of ${fmt(stake)}; ${fmt(returned)} came back.`;
    } else if (settledIn && p.status === "CASHED_OUT") {
      kind = "EXIT_MISMATCH"; part = "exitCents";
      note = `Exited bet of ${fmt(stake)}; the exit paid ${fmt(money.exitPaid)} with a fee of ${fmt(money.exitFee)}.`;
    } else if (money.winnings !== 0) {
      kind = "PAYOUT_WITHOUT_RESULT"; part = "resultCents";
      note = `Winnings of ${fmt(money.winnings)} were paid in this period on a bet that ${left === null ? "is still open" : "did not result in it"}.`;
    } else if (money.refund !== 0 || money.exitPaid !== 0 || money.exitFee !== 0) {
      kind = "REFUND_WITHOUT_VOID"; part = "refundCents";
      note = `Money came back in this period on a bet that ${left === null ? "is still open" : "was not voided or exited in it"}.`;
    } else {
      kind = "BET_STATE"; part = "resultCents";
      note = left !== null && left < placed
        ? "The bet is recorded as settled before it was placed."
        : `The bet left "on hold" in this period as ${p.status} with no money record.`;
    }
    push({ kind, ref: p.id, roundId: p.marketId, product: prod, expectedCents: inflow - hold, recordedCents: returned, contributionCents: rest, note }, part);
  }

  // ── Resulted rounds: what their pools held, against winnings paid + the fee they kept ──────
  let settlementFeeCents = 0, roundingCents = 0, feeKeptRounds = 0;
  for (const [marketId, acc] of rounds) {
    counts.roundsResulted++;
    const b = books.get(marketId);
    // ⭐ S6 · OD-08 — A MILLIONEA WEEK closes with its own lines: stakes + R + U = winnings + fee + carried (§5b).
    if (b?.productLine === "MASWALI") {
      const wk = weekKeep(b, L.weeks.get(marketId));
      feeKeptRounds += wk.keepCents;
      settlementFeeCents += wk.keepCents;
      jackpotInCents += wk.inCents; topUpCents += wk.topUpCents; carriedCents += wk.carriedCents;
      const paid = wk.paid;
      if (paid) {
        const i = L.segments.findIndex((s) => paid.atMs >= s.startMs && paid.atMs < s.endMs);
        const slot = i < 0 ? Math.max(0, L.segments.length - 1) : i;
        const prev = segJackpot[slot];
        segJackpot[slot] = prev
          ? { jackpotCents: prev.jackpotCents + paid.jackpotCents, bookedFee: prev.bookedFee + paid.bookedFee, feeRateBp: prev.feeRateBp === paid.feeRateBp ? prev.feeRateBp : null, weeks: prev.weeks + 1 }
          : { jackpotCents: paid.jackpotCents, bookedFee: paid.bookedFee, feeRateBp: paid.feeRateBp, weeks: 1 };
      }
      const into = wk.inCents + wk.topUpCents;
      const contribution = acc.stakes + into - acc.winnings - wk.keepCents - wk.carriedCents;
      // A week whose record cannot supply its lines is named even where its money happens to net to nothing.
      if (contribution !== 0 || wk.problem) {
        push({
          kind: "RESULT_MISMATCH", ref: marketId, roundId: marketId, product: "MASWALI",
          expectedCents: acc.stakes + into - wk.keepCents - wk.carriedCents, recordedCents: acc.winnings, contributionCents: contribution,
          note: wk.problem
            ?? `The week's tickets staked ${fmt(acc.stakes)} and its pool took ${fmt(into)} in from the jackpot and the guarantee; winnings paid ${fmt(acc.winnings)}, the fee kept ${fmt(wk.keepCents)} and ${fmt(wk.carriedCents)} carried to the jackpot should take exactly that out of it.`,
        }, "resultCents");
      }
      continue;
    }
    const keep = b ? roundKeep(b) : null;
    const keepCents = keep?.keepCents ?? 0;
    feeKeptRounds += keepCents;
    settlementFeeCents += (keep?.bookedFeeTzs ?? 0) * 100;
    roundingCents += keep?.roundingCents ?? 0;
    const contribution = acc.stakes - acc.winnings - keepCents;
    if (contribution !== 0) {
      push({
        kind: "RESULT_MISMATCH", ref: marketId, roundId: marketId, product: b?.productLine ?? null,
        expectedCents: acc.stakes - keepCents, recordedCents: acc.winnings, contributionCents: contribution,
        note: !b
          ? "The round's record is missing, so the fee it kept cannot be recomputed."
          : `The round's bets staked ${fmt(acc.stakes)}; winnings paid ${fmt(acc.winnings)} and the fee kept ${fmt(keepCents)} should take exactly that out of the pool.`,
      }, "resultCents");
    }
  }

  // ── Money records with no bet to stand behind them ──────────────────────────────────────────
  for (const { r, contribution } of orphan) {
    if (contribution === 0) continue;
    const kind: ExceptionKind = r.type === "BET_PLACED" ? "STAKE_RECORD_WITHOUT_BET" : r.type === "BET_PAYOUT" ? "PAYOUT_WITHOUT_RESULT" : r.type === "CASHOUT" ? "EXIT_MISMATCH" : "REFUND_WITHOUT_VOID";
    const part: keyof DifferenceParts = r.type === "BET_PLACED" ? "stakeCents" : r.type === "BET_PAYOUT" ? "resultCents" : r.type === "CASHOUT" ? "exitCents" : "refundCents";
    push({
      kind, ref: r.id, roundId: null, product: null,
      expectedCents: 0, recordedCents: Math.abs(contribution), contributionCents: contribution,
      note: r.positionId ? "The money record names a bet that cannot be found." : "The money record names no bet.",
    }, part);
  }

  const report1: Report1 = {
    salesCents,
    payoutCents,
    onHoldCents,
    refundsCents,
    feeKeptCents: feeKeptRounds + exitFeeCents,
    broughtForwardCents,
    // ⭐ S6 · OD-08 — only on a view that holds Millionea: every other view's Report 1 keeps its six lines, key for key.
    ...(jackpotLines ? { jackpotBroughtForwardCents: jackpotInCents, floorTopUpCents: topUpCents, carriedToJackpotCents: carriedCents } : {}),
  };
  const tax = taxForSegments(L.segments.map((segment, i) => ({ segment, payoutCents: segPayout[i], jackpot: segJackpot[i] })));
  return {
    fig: {
      product: filter,
      report1,
      reconciliation: reconcile(report1),
      parts,
      tax,
      feeDetail: { settlementFeeCents, roundingCents, exitFeeCents },
      counts,
      refundsByReason: REFUND_REASON_ORDER.map((code) => ({ code, ...reasons.get(code)! })),
      bonus: { placedCents: bonusPlaced, refundedCents: bonusRefunded },
    },
    exceptions,
  };
}

/**
 * DAY BY DAY — every EAT day of the window as its own report, from what `load` already read.
 * ⭐ THE SAME READER, CUT AT THE DAY'S EDGES: a day gets the money records stamped inside it, the bets live in it by
 * `listLiveDuring`'s own rule (placed before the day ended; open, unstamped, or left at or after the day began), and
 * every bet its records name — exactly what `load` reads for that day opened on its own, so a row equals the Day view
 * of the same day. `load`'s read of the whole window holds all of it: each day's bets are a subset of the window's.
 * Records are dealt by a binary search over the edges, and a bet only to the days it was live in — a year-long window
 * costs the bets' live days, never days × bets.
 */
function dayBreakdown(L: Loaded, period: TaxPeriod, filter: ProductFilter, versions: RateVersion[]): DayFigures[] | null {
  // Measured on the WINDOW, not the cut-off: a month on its first morning shows its one day so far, one not started none.
  // A window crossing a midnight has days even when it is shorter than one (23:00 → 01:00 is two part-days).
  if (dayEdges(period.startMs, period.endMs).length <= 2) return null;
  if (!(L.E > L.S)) return [];
  const edges = dayEdges(L.S, L.E);
  const n = edges.length - 1;
  const sliceOf = (t: number): number => {
    let lo = 0, hi = n - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (edges[mid] <= t) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const records: StoredTxn[][] = Array.from({ length: n }, () => []);
  for (const r of L.records) {
    const t = Date.parse(r.createdAt);
    if (t >= L.S && t < L.E) records[sliceOf(t)].push(r);
  }
  const bets: Array<Map<string, StoredPosition>> = Array.from({ length: n }, () => new Map());
  for (const p of L.bets.values()) {
    const placed = Date.parse(p.placedAt);
    if (!(placed < L.E)) continue;
    const left = leftOpenAt(p);
    if (left !== null && !(left >= L.S)) continue;
    const first = placed < L.S ? 0 : sliceOf(placed);
    const last = left === null || left >= L.E ? n - 1 : sliceOf(left);
    for (let i = first; i <= last; i++) bets[i].set(p.id, p);
  }
  for (let i = 0; i < n; i++) {
    for (const r of records[i]) {
      const p = r.positionId ? L.bets.get(r.positionId) : undefined;
      if (p) bets[i].set(p.id, p);
    }
  }
  return edges.slice(0, n).map((a, i) => {
    const b = edges[i + 1];
    const { fig } = figuresFor({ S: a, E: b, records: records[i], bets: bets[i], books: L.books, weeks: L.weeks, hasWeek: L.hasWeek, segments: rateSegments(a, b, versions) }, filter);
    return {
      dayKey: eatDayKey(a),
      startMs: a,
      endMs: b,
      report1: fig.report1,
      differenceCents: fig.reconciliation.differenceCents,
      balanced: fig.reconciliation.balanced,
      counts: { betsPlaced: fig.counts.betsPlaced, payoutRecords: fig.counts.payoutRecords, refundRecords: fig.counts.refundRecords, betsOnHold: fig.counts.betsOnHold },
      tax: { commission: fig.tax.commission, tra: fig.tax.tra, gbt: fig.tax.gbt, total: fig.tax.total },
    };
  });
}

/** "TZS 1,234" / "TZS −1,110.60" — the engine's formatter, so a note and a table cell never disagree. */
function fmt(cents: number): string {
  return `TZS ${formatCents(cents)}`;
}

/**
 * Build the whole report for one period and one product filter.
 * ⛔ Fails CLOSED when the rates cannot be read — a tax line on a stale or default rate is worse
 * than no tax line. A failed money read throws, and the page renders its load error, never a zero.
 */
export async function buildTaxReportData(opts: {
  period: TaxPeriod;
  product: ProductFilter;
  nowMs: number;
}): Promise<{
  ok: true;
  data: TaxReportData;
  /** ⭐ S6 · the period holds a Millionea week (its money is in the window), on any product's view. Handed BESIDE the data,
   *  never into it, so no lock snapshot or fingerprint carries it: the page offers the Millionea pill on this alone. */
  hasWeek: boolean;
} | { ok: false; error: string }> {
  const rates = await readTaxRates();
  if (!rates.ok) return { ok: false, error: `The tax rates could not be read (${rates.error}). No figure was computed.` };
  const L = await load(opts.period, opts.nowMs, rates.versions);
  // ⭐ S6 · OD-08 — the S0.5 fence that refused a period holding a Millionea week is replaced by the week's own
  // treatment (`weekKeep`): its three reconciling lines and Report 2's booked fee. A period that holds none reads exactly
  // as it did, and Polls and Up & Down read exactly as they did whatever else the period holds.
  const main = figuresFor(L, opts.product);
  // Millionea stands beside Polls and Up & Down only where the period holds a week, so every other period's parts are the
  // same two (and its lock fingerprint the same). Polls + Up & Down + Millionea = All on every Report 1 line.
  const products: readonly Product[] = L.hasWeek ? ["MARKET", "UPDOWN", "MASWALI"] : ["MARKET", "UPDOWN"];
  const byProduct = opts.product === "ALL" ? products.map((p) => figuresFor(L, p).fig) : null;
  const unattributedRecords = L.records.filter((r) => productOfBet(r.positionId ? L.bets.get(r.positionId) : undefined, L.books) === null).length;
  const whole = opts.product === "ALL" ? null : figuresFor(L, "ALL").fig.reconciliation;
  const all = main.exceptions;
  const explainedCents = all.reduce((t, e) => t + e.contributionCents, 0);
  // A TOTAL order — the lock's fingerprint (`seenFingerprint`) hashes this list, so two reads of unchanged books must list it alike.
  const sorted = [...all].sort((a, b) => Math.abs(b.contributionCents) - Math.abs(a.contributionCents) || a.ref.localeCompare(b.ref)
    || a.kind.localeCompare(b.kind) || a.contributionCents - b.contributionCents || a.note.localeCompare(b.note));
  const usedVersionIds = new Set(L.segments.map((s) => s.version.id));
  return {
    ok: true,
    data: {
      version: 1,
      period: opts.period,
      product: opts.product,
      cutoffMs: L.E,
      inProgress: L.inProgress,
      notStarted: L.notStarted,
      generatedAtMs: opts.nowMs,
      rateVersions: rates.versions.filter((v) => usedVersionIds.has(v.id)),
      main: main.fig,
      byProduct,
      unattributedRecords,
      wholeBook: whole ? { differenceCents: whole.differenceCents, balanced: whole.balanced } : null,
      byDay: dayBreakdown(L, opts.period, opts.product, rates.versions),
      exceptions: sorted.slice(0, EXCEPTION_LIST_CAP),
      exceptionCount: all.length,
      explainedCents,
    },
    hasWeek: L.hasWeek,
  };
}
