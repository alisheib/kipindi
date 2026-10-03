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
 */
import { db } from "./store";
import type { StoredTxn } from "./store";
import { positionStore, marketStore, type MarketBook } from "./market-dal";
import type { StoredPosition } from "./market-service";
import { snapshotOrLegacy } from "./market-config";
import { readTaxRates } from "./tax-config";
import { chargedFee } from "@/lib/payout";
import {
  REFUND_REASON_ORDER,
  classifyRefund,
  cutoffOf,
  formatCents,
  rateSegments,
  reconcile,
  taxForSegments,
  toCents,
  type DifferenceParts,
  type ExceptionKind,
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
    refundRecords: number;
    roundsResulted: number;
  };
  refundsByReason: Array<{ code: RefundReasonCode; count: number; cents: number }>;
  bonus: { placedCents: number; refundedCents: number };
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
  /** Polls and Up & Down side by side — only on the All-products view. */
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
  const fee = chargedFee({ yesPool: b.yesPool, noPool: b.noPool, resolvedOutcome: verdict }, snapshotOrLegacy(b.feeSnapshot));
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
    return { S, E: S, records: [], bets: new Map(), books: new Map(), segments: [], inProgress, notStarted };
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
  return { S, E, records, bets, books, segments: rateSegments(S, E, versions), inProgress, notStarted };
}

/** One product filter's figures and its exceptions — a pure function of what `load` read. */
function figuresFor(L: Loaded, filter: ProductFilter): { fig: ProductFigures; exceptions: ReconException[] } {
  const { S, E, books } = L;
  const counts = { betsPlaced: 0, betsBroughtForward: 0, betsOnHold: 0, stakeRecords: 0, payoutRecords: 0, refundRecords: 0, roundsResulted: 0 };
  const exceptions: ReconException[] = [];
  const reasons = new Map<RefundReasonCode, { count: number; cents: number }>(REFUND_REASON_ORDER.map((c) => [c, { count: 0, cents: 0 }]));
  let salesCents = 0, payoutCents = 0, refundsCents = 0, exitFeeCents = 0, onHoldCents = 0, broughtForwardCents = 0;
  let bonusPlaced = 0, bonusRefunded = 0;

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
      segPayout[i < 0 ? Math.max(0, L.segments.length - 1) : i] += amountCents;
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
      const slot = reasons.get(code)!; slot.cents += bonus; if (money.refund === 0) slot.count++;
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
  };
  const tax = taxForSegments(L.segments.map((segment, i) => ({ segment, payoutCents: segPayout[i] })));
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
}): Promise<{ ok: true; data: TaxReportData } | { ok: false; error: string }> {
  const rates = await readTaxRates();
  if (!rates.ok) return { ok: false, error: `The tax rates could not be read (${rates.error}). No figure was computed.` };
  const L = await load(opts.period, opts.nowMs, rates.versions);
  const main = figuresFor(L, opts.product);
  const byProduct = opts.product === "ALL" ? (["MARKET", "UPDOWN"] as const).map((p) => figuresFor(L, p).fig) : null;
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
      exceptions: sorted.slice(0, EXCEPTION_LIST_CAP),
      exceptionCount: all.length,
      explainedCents,
    },
  };
}
