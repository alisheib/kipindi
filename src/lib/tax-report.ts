/**
 * GOVERNMENT TAX REPORT — the arithmetic, pure.
 *
 * The owner's project plan (`docs/TAX-REPORT.md` §1, "Government Tax Reporting System" v1.0,
 * 2026-10-03) asks for two documents per reporting period:
 *
 *   Report 1 · TOTAL REPORTING SYSTEM   Sales · Payout · On hold · Refunds, and the hard check
 *                                       "Payout + On hold + Refunds = Sales".
 *   Report 2 · TAXATION                 Commission = 13% × Payout · TRA = 10% × Commission ·
 *                                       GBT = 5% × Commission · Total tax = TRA + GBT, every line
 *                                       rounded to the nearest whole shilling AT EACH STEP.
 *
 * This module is the whole of that arithmetic and nothing else — no Prisma, no React, no clock —
 * so `npm run test:tax-report` EXECUTES it rather than reading it, and `red:tax-report` proves
 * every check in that suite can fail.
 *
 * ── THE TWO RECONCILING ITEMS, AND WHY THE PLAN'S EQUATION NEEDS THEM ON REAL MONEY ─────────
 *
 * ⭐ The plan's golden rule is exactly right for the period it describes — one where nothing was
 * already waiting for a result when the period opened, and where the whole of every resulted
 * pool went to the winners. On 50pick neither is ever true, so the rule is carried here in its
 * GENERAL form, which reduces to the plan's own equation whenever the two extra terms are zero
 * (the plan's worked example: both are zero, and this module reproduces it to the shilling):
 *
 *     Sales + On hold brought forward = Payout + Refunds + Platform fee kept + On hold
 *
 *  · ON HOLD BROUGHT FORWARD. A poll runs for days and an Up & Down round straddles midnight, so
 *    a period opens holding stakes placed BEFORE it. Those stakes are not this period's Sales, yet
 *    when their rounds result inside it their winnings are this period's Payout — which is the
 *    plan's own acceptance test 3 ("a round resulted after the cut-off stays in On hold for the
 *    closed period and reclassifies in the NEXT period"). A period-flow report that reclassifies
 *    must bring the opening balance forward or every period after the first fails its check.
 *  · PLATFORM FEE KEPT. Our fee is 13% of the LOSING side (`payout.ts`, `docs/RULES.md` §1),
 *    taken out of the pool before the winners are paid. So a resulted pool leaves "On hold" as
 *    winnings PLUS that fee, and a check without the fee is short by exactly the fee, every
 *    period. It is printed as its own line — never folded into Payout — because Payout must stay
 *    what the plan says it is: "winnings paid out after each round is completed".
 *
 * ⛔ THE CHECK IS A REAL RECONCILIATION, NOT AN IDENTITY. The reader (`server/tax-report-data.ts`)
 * takes Sales, Payout and Refunds from the MONEY RECORDS (the Transaction table — what each wallet
 * was actually debited and credited), the two On-hold balances from the BETS (Position rows, the
 * only record of what was still open at an instant), and the fee from the double-entry LEDGER.
 * Three independent sources: when they disagree the difference is real, and `differenceParts`
 * below splits it — to the shilling — into the items that cause it.
 *
 * ── UNITS ─────────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ MONEY IS CARRIED IN INTEGER CENTS. The columns are `Decimal(18, 2)` and a legacy paid early
 * exit can carry cents (a 10% fee on 1,234 is 123.40). A JavaScript double cannot hold 0.1, so a
 * sum of shillings-with-cents can drift by a cent — and a reconciliation that is off by a cent of
 * floating-point error would block a filing over nothing. Every figure is an integer number of
 * cents (exact up to ±9·10^15, i.e. ±90 trillion shillings); TAX LINES are whole shillings, as the
 * plan requires. Rates are integer BASIS POINTS (1300 = 13.00%), so no rate is ever a binary
 * fraction either.
 */

import { EAT_OFFSET_MS, eatDayKey, eatDayStartMs } from "@/lib/eat-day";

// ════════════════════════════════════════════════════════════════════════════════════════════
// 1 · RATES
// ════════════════════════════════════════════════════════════════════════════════════════════

/** Rates in basis points of a percent: 1300 = 13.00%. Integers only — see the UNITS note. */
export type RateSet = {
  /** Commission as a share of Payout. The plan: 13%. */
  commissionBp: number;
  /** TRA tax as a share of Commission. The plan: 10%. */
  traBp: number;
  /** GBT tax as a share of Commission. The plan: 5%. */
  gbtBp: number;
};

/** The plan's approved model (§3.3) — the rates in force until an admin records another version. */
export const APPROVED_RATES: Readonly<RateSet> = Object.freeze({ commissionBp: 1300, traBp: 1000, gbtBp: 500 });

/** 100.00% in basis points — the ceiling of every rate. */
export const BP_WHOLE = 10_000;

/**
 * ONE RATE VERSION, in force from the first instant of an EAT calendar day until the next
 * version's. ⭐ Rates are EFFECTIVE-DATED, never overwritten: a rate changed today must not
 * re-price September, and a filed period must reproduce from the rates it was filed under.
 */
export type RateVersion = {
  id: string;
  /** The EAT day (`YYYY-MM-DD`) this version takes effect, at 00:00 EAT. */
  effectiveFrom: string;
  rates: RateSet;
  /** Who recorded it and when (ISO) — null for the built-in approved version. */
  recordedBy: string | null;
  recordedAt: string | null;
  /** Why it changed — the gazette notice, the letter, the decision. Null for the built-in one. */
  note: string | null;
};

/** The version every installation starts with: the plan's approved rates, in force from the beginning. */
export const GENESIS_DAY = "2026-01-01";
export const APPROVED_VERSION: Readonly<RateVersion> = Object.freeze({
  id: "approved-2026",
  effectiveFrom: GENESIS_DAY,
  rates: APPROVED_RATES,
  recordedBy: null,
  recordedAt: null,
  note: "The approved model of the Government Tax Reporting System plan v1.0 (03 Oct 2026), §3.3.",
});

/** Is this a usable rate — an integer number of basis points between 0% and 100%? */
export function isValidBp(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= BP_WHOLE;
}

/**
 * Parse a percentage typed by an officer ("13", "12.5", "13.25", " 10 % ") into basis points.
 * ⛔ Returns null — never a guess — for anything that is not a plain percentage with at most two
 * decimals between 0 and 100: a rate of "1,3" or "13.333" must be refused at the form, because
 * the alternative is a tax figure computed on a rate nobody typed.
 */
export function parsePercentToBp(input: string): number | null {
  const s = input.trim().replace(/\s*%$/, "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const bp = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return isValidBp(bp) ? bp : null;
}

/** "13%", "12.5%", "13.25%" — the label printed beside every rate. Never a float's binary tail. */
export function percentLabel(bp: number): string {
  const whole = Math.trunc(bp / 100);
  const frac = Math.abs(bp % 100);
  if (frac === 0) return `${whole}%`;
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}%`;
}

/** Validate a whole version as stored (the config reader refuses a malformed one rather than using it). */
export function isValidRateSet(r: unknown): r is RateSet {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return isValidBp(o.commissionBp) && isValidBp(o.traBp) && isValidBp(o.gbtBp);
}

/** Is `key` a real `YYYY-MM-DD` calendar date (not 2026-02-30)? */
export function isDayKey(key: unknown): key is string {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === key;
}

/**
 * The versions in force, sorted, with the approved version always first. A version whose day is
 * not a real date, or whose rates are malformed, is DROPPED rather than half-used — the caller
 * (`server/tax-config.ts`) validates on write, so a dropped row here is a corrupted store, and the
 * reader must not invent a rate to fill it.
 */
export function normaliseVersions(versions: readonly RateVersion[]): RateVersion[] {
  const valid = versions.filter((v) =>
    isDayKey(v.effectiveFrom) && v.effectiveFrom >= GENESIS_DAY && isValidRateSet(v.rates) && v.id !== APPROVED_VERSION.id);
  // One version per day: the LAST recorded for a day wins (a correction of that day's entry). The
  // approved version is seeded first, so an officer's version for the genesis day itself replaces
  // it — "GBT was 4% from the start" is a correction an admin must be able to make (owner rule
  // 2026-10-03: admins can change everything; safety by validation and audit, never a locked box).
  const byDay = new Map<string, RateVersion>([[APPROVED_VERSION.effectiveFrom, APPROVED_VERSION as RateVersion]]);
  for (const v of [...valid].sort((a, b) => (a.recordedAt ?? "").localeCompare(b.recordedAt ?? ""))) byDay.set(v.effectiveFrom, v);
  return [...byDay.values()].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

/** The version in force at instant `atMs`. */
export function versionAt(atMs: number, versions: readonly RateVersion[]): RateVersion {
  const sorted = normaliseVersions(versions);
  let current = sorted[0];
  for (const v of sorted) if (eatDayStartMs(v.effectiveFrom) <= atMs) current = v;
  return current;
}

/** A stretch of the reporting window over which ONE rate version applies. */
export type RateSegment = { startMs: number; endMs: number; version: RateVersion };

/**
 * Split `[startMs, endMs)` at every version boundary inside it. One segment in the ordinary case;
 * two when an admin recorded a new rate effective mid-period — and then each stretch is taxed at
 * its own rate, because a payout made under 13% does not become a 12% payout when the rate falls.
 */
export function rateSegments(startMs: number, endMs: number, versions: readonly RateVersion[]): RateSegment[] {
  if (!(endMs > startMs)) return [];
  const sorted = normaliseVersions(versions);
  const cuts = sorted.map((v) => eatDayStartMs(v.effectiveFrom)).filter((t) => t > startMs && t < endMs);
  const edges = [startMs, ...cuts, endMs];
  const out: RateSegment[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const version = versionAt(edges[i], sorted);
    const prev = out[out.length - 1];
    // ⛔ A version that changes NO rate does not split the period: each segment rounds on its own, so a split
    // with identical rates could move the tax by a shilling for nothing. The earlier version names the stretch.
    if (prev && sameRates(prev.version.rates, version.rates)) { prev.endMs = edges[i + 1]; continue; }
    out.push({ startMs: edges[i], endMs: edges[i + 1], version });
  }
  return out;
}

function sameRates(a: RateSet, b: RateSet): boolean {
  return a.commissionBp === b.commissionBp && a.traBp === b.traBp && a.gbtBp === b.gbtBp;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 2 · ROUNDING AND THE TAX LINES
// ════════════════════════════════════════════════════════════════════════════════════════════

/**
 * num / den rounded to the nearest integer, a half rounding AWAY FROM ZERO — "standard rounding"
 * as the plan says (6.5 → 7, −6.5 → −7). In BigInt: a cents figure times a basis-point rate
 * passes 2^53 at about 9 billion shillings, so a Number product would round before we do.
 */
export function roundHalfAwayFromZero(num: bigint, den: bigint): bigint {
  if (den <= BigInt(0)) throw new RangeError("roundHalfAwayFromZero: denominator must be positive");
  const neg = num < BigInt(0);
  const a = neg ? -num : num;
  let q = a / den;
  if ((a % den) * BigInt(2) >= den) q += BigInt(1);
  return neg ? -q : q;
}

/** Report 2 for ONE rate segment: every line a whole shilling, each rounded from the line above it. */
export type TaxLines = {
  /** The taxable reference, in cents (Payout from Report 1). */
  payoutCents: number;
  rates: RateSet;
  /** Commission = Payout × commission rate, rounded to whole TZS. */
  commission: number;
  /** TRA = Commission (already rounded) × TRA rate, rounded to whole TZS. */
  tra: number;
  /** GBT = Commission (already rounded) × GBT rate, rounded to whole TZS. */
  gbt: number;
  /** TRA + GBT — a sum of whole shillings, so no rounding of its own. */
  total: number;
};

/**
 * ⭐ THE PLAN'S FORMULA, §3.3, EXACTLY. Rounding is applied AT EACH STEP: TRA and GBT are taken on
 * the ROUNDED commission, never on the unrounded product — "rounding must be applied at each step,
 * not only at the end." Worked example: Payout 570,000 → 74,100 · 7,410 · 3,705 · 11,115.
 */
export function taxOnPayout(payoutCents: number, rates: RateSet): TaxLines {
  if (!Number.isSafeInteger(payoutCents)) throw new RangeError(`taxOnPayout: payoutCents must be a safe integer, got ${payoutCents}`);
  if (!isValidRateSet(rates)) throw new RangeError("taxOnPayout: rates must be integer basis points between 0 and 10000");
  // cents × bp / (100 cents × 10,000 bp) → whole shillings.
  const commission = Number(roundHalfAwayFromZero(BigInt(payoutCents) * BigInt(rates.commissionBp), BigInt(100 * BP_WHOLE)));
  const tra = Number(roundHalfAwayFromZero(BigInt(commission) * BigInt(rates.traBp), BigInt(BP_WHOLE)));
  const gbt = Number(roundHalfAwayFromZero(BigInt(commission) * BigInt(rates.gbtBp), BigInt(BP_WHOLE)));
  return { payoutCents, rates: { ...rates }, commission, tra, gbt, total: tra + gbt };
}

/** One taxed segment, with its bounds and the version it was priced under. */
export type TaxSegment = TaxLines & { startMs: number; endMs: number; versionId: string; effectiveFrom: string };

/** Report 2 for the whole period. */
export type TaxTotals = {
  segments: TaxSegment[];
  payoutCents: number;
  commission: number;
  tra: number;
  gbt: number;
  total: number;
};

/**
 * Report 2 across rate segments. Each segment is taxed and rounded on its own; the period's totals
 * are the SUMS of those whole-shilling lines — rounding once per step per segment, never again on
 * the total (which would create or destroy a shilling the segment lines do not show).
 */
export function taxForSegments(parts: ReadonlyArray<{ segment: RateSegment; payoutCents: number }>): TaxTotals {
  const segments: TaxSegment[] = parts.map(({ segment, payoutCents }) => ({
    ...taxOnPayout(payoutCents, segment.version.rates),
    startMs: segment.startMs,
    endMs: segment.endMs,
    versionId: segment.version.id,
    effectiveFrom: segment.version.effectiveFrom,
  }));
  const sum = (k: "payoutCents" | "commission" | "tra" | "gbt" | "total") => segments.reduce((t, s) => t + s[k], 0);
  return { segments, payoutCents: sum("payoutCents"), commission: sum("commission"), tra: sum("tra"), gbt: sum("gbt"), total: sum("total") };
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 3 · REPORT 1 AND ITS CHECK
// ════════════════════════════════════════════════════════════════════════════════════════════

/** Report 1, in cents. The first four are the plan's lines; the last two are the reconciling items. */
export type Report1 = {
  /** Every stake placed in the period (money in). */
  salesCents: number;
  /** Winnings paid on rounds resulted in the period. Never a withdrawal, never a refund. */
  payoutCents: number;
  /** Stakes still waiting for a result at the period's cut-off. */
  onHoldCents: number;
  /** Stakes returned in the period: one-sided bets, cancelled rounds, players' free exits. */
  refundsCents: number;
  /** Our fee on resulted rounds at each round's frozen rates (13% of the losing side on current rounds) — and any early-exit fee. */
  feeKeptCents: number;
  /** Stakes already waiting for a result when the period opened (placed before it). */
  broughtForwardCents: number;
};

export type Reconciliation = {
  /** Payout + On hold + Refunds + Platform fee kept − On hold brought forward: what Sales must equal. */
  accountedCents: number;
  /** Sales − accounted. Zero, or the period is blocked. */
  differenceCents: number;
  balanced: boolean;
};

/** The hard check. ⛔ Exact — a difference of one cent is a difference. */
export function reconcile(r: Report1): Reconciliation {
  for (const [k, v] of Object.entries(r)) {
    if (!Number.isSafeInteger(v)) throw new RangeError(`reconcile: ${k} must be a safe integer number of cents, got ${v}`);
  }
  const accountedCents = r.payoutCents + r.onHoldCents + r.refundsCents + r.feeKeptCents - r.broughtForwardCents;
  const differenceCents = r.salesCents - accountedCents;
  return { accountedCents, differenceCents, balanced: differenceCents === 0 };
}

/**
 * ⭐ WHERE A DIFFERENCE COMES FROM — the exact decomposition the exception list is built on.
 *
 * With `B` brought forward, `C` on hold at the cut-off and `S_pos` the stakes of bets placed in the
 * period, every bet that was open at any moment of the period is counted once on each side of
 *     B + S_pos = X + C        (X = stakes of bets that left "on hold" inside the period)
 * so the check's difference is EXACTLY the sum of four independently measurable parts:
 *   stake   = (stake money records + bonus-funded stake) − S_pos       records vs the bets themselves
 *   result  = X(won + lost) − Payout records − settlement fee booked   resulted pools vs what left them
 *   refund  = X(voided) − refund records − bonus refunded              voided bets vs what came back
 *   exit    = X(cashed out) − exit records − early-exit fee booked      players' exits vs what left
 * The reader computes each part per bet/round; `test:tax-report` §12.9–§12.11 prove the four always sum to
 * `reconcile().differenceCents`, so an exception list can never "explain" a figure it does not add up to.
 */
export type DifferenceParts = { stakeCents: number; resultCents: number; refundCents: number; exitCents: number };

export function differenceTotal(p: DifferenceParts): number {
  return p.stakeCents + p.resultCents + p.refundCents + p.exitCents;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 4 · REFUND REASONS
// ════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Every refund carries a reason (plan FR-5). 50pick never writes a refund by hand — each one is
 * produced by a rule or an officer's recorded decision — so the reason is DERIVED from the round's
 * own record, never from a free-text field someone could word differently tomorrow.
 */
export type RefundReasonCode = "ONE_SIDED_BET" | "ROUND_CANCELLED" | "PLAYER_EXIT" | "OTHER";

/** The plan's three codes (§5: ONE_SIDED_BET | CANCELLED | OTHER) — ours map onto them exactly. */
export type PlanRefundCode = "ONE_SIDED_BET" | "CANCELLED" | "OTHER";

export const REFUND_REASONS: Readonly<Record<RefundReasonCode, { label: string; planCode: PlanRefundCode; approval: string }>> = Object.freeze({
  ONE_SIDED_BET: {
    label: "One-sided bet — nobody took the other side",
    planCode: "ONE_SIDED_BET",
    approval: "Automatic platform rule: a round with no opposing stakes refunds every stake at 0% fee",
  },
  ROUND_CANCELLED: {
    label: "Round cancelled or voided",
    planCode: "CANCELLED",
    approval: "The round's recorded void decision (officer resolution, emergency void, or the Up & Down void rule)",
  },
  PLAYER_EXIT: {
    label: "Bet cancelled by the player (early exit)",
    planCode: "CANCELLED",
    approval: "The player's own request inside the exit window",
  },
  OTHER: {
    label: "Other — a refund whose bet or round record is missing",
    planCode: "OTHER",
    approval: "The platform's start-up repair of a bet whose round is gone — or a record to investigate",
  },
});

/** Display order — the plan's order, then ours. */
export const REFUND_REASON_ORDER: readonly RefundReasonCode[] = ["ONE_SIDED_BET", "ROUND_CANCELLED", "PLAYER_EXIT", "OTHER"];

/**
 * ⭐ THE REASON, FROM THE ROUND'S OWN VERDICT. A BET_REFUND exists only because a round was voided
 * (verdict VOID — an officer's resolution, an emergency void, or the Up & Down void rule) or because
 * it resulted with nobody on the other side (verdict YES/NO, one-sided — `settleMarket`'s refund
 * branch); a CASHOUT is a player's exit; a refund whose round no longer exists is the start-up
 * repair (`repairOrphanedPositions`).
 */
export function classifyRefund(input: {
  type: "BET_REFUND" | "CASHOUT";
  /** False when the bet's round row cannot be found. */
  roundFound: boolean;
  /** The round's recorded verdict, if any. */
  verdict: "YES" | "NO" | "VOID" | null;
}): RefundReasonCode {
  if (input.type === "CASHOUT") return "PLAYER_EXIT";
  if (!input.roundFound) return "OTHER";
  if (input.verdict === "VOID") return "ROUND_CANCELLED";
  if (input.verdict === "YES" || input.verdict === "NO") return "ONE_SIDED_BET";
  return "OTHER";
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 5 · PRODUCTS AND EXCEPTIONS
// ════════════════════════════════════════════════════════════════════════════════════════════

/** The product filter. `MARKET` is a poll; `UPDOWN` an Up & Down round (PredictionMarket.productLine). */
export type ProductFilter = "ALL" | "MARKET" | "UPDOWN";
export const PRODUCT_LABEL: Readonly<Record<ProductFilter, string>> = Object.freeze({ ALL: "All products", MARKET: "Polls", UPDOWN: "Up & Down" });

export function parseProduct(v: unknown): ProductFilter {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return s === "MARKET" || s === "POLLS" ? "MARKET" : s === "UPDOWN" ? "UPDOWN" : "ALL";
}

/** What kind of disagreement an exception records. */
export type ExceptionKind =
  | "STAKE_RECORD_WITHOUT_BET"   // a stake debited with no bet behind it in this period
  | "STAKE_MISMATCH"             // a bet whose stake differs from what its wallet was debited
  | "RESULT_MISMATCH"            // a resulted round whose stakes ≠ winnings paid + fee booked
  | "PAYOUT_WITHOUT_RESULT"      // winnings paid on a bet that did not result in this period
  | "REFUND_MISMATCH"            // a voided bet whose stake ≠ what was refunded
  | "REFUND_WITHOUT_VOID"        // a refund for a bet that was not voided in this period
  | "EXIT_MISMATCH"              // a player's exit whose stake ≠ exit money + exit fee
  | "BET_STATE";                 // a bet whose own record is inconsistent (e.g. settled before placed)

export const EXCEPTION_LABEL: Readonly<Record<ExceptionKind, string>> = Object.freeze({
  STAKE_RECORD_WITHOUT_BET: "Stake debited with no matching bet",
  STAKE_MISMATCH: "Bet stake differs from the amount debited",
  RESULT_MISMATCH: "Resulted round does not close (stakes differ from winnings + fee)",
  PAYOUT_WITHOUT_RESULT: "Winnings paid on a bet with no result in this period",
  REFUND_MISMATCH: "Voided bet not refunded in full",
  REFUND_WITHOUT_VOID: "Refund for a bet that was not voided in this period",
  EXIT_MISMATCH: "Early exit does not close (stake differs from exit money + fee)",
  BET_STATE: "Bet record is internally inconsistent",
});

/** One offending item. `contributionCents` is its share of the check's difference — they sum to it. */
export type ReconException = {
  kind: ExceptionKind;
  /** The record the officer opens first: a transaction id, a bet (position) id or a round (market) id. */
  ref: string;
  roundId: string | null;
  product: Exclude<ProductFilter, "ALL"> | null;
  expectedCents: number;
  recordedCents: number;
  contributionCents: number;
  note: string;
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// 6 · REPORTING PERIODS (East Africa Time)
// ════════════════════════════════════════════════════════════════════════════════════════════

export type PeriodKind = "day" | "week" | "month" | "custom";

export type TaxPeriod = {
  kind: PeriodKind;
  /** Stable identity: `2026-09` · `2026-09-14` (a week's Monday) · `2026-09-14` · `2026-09-14T08:00~2026-09-20T18:00`. */
  key: string;
  /** Half-open UTC window [startMs, endMs). */
  startMs: number;
  endMs: number;
  /** "September 2026", "Week 38 · 14–20 Sep 2026", "Mon 14 Sep 2026", "14 Sep 2026 08:00 → 20 Sep 2026 18:00". */
  label: string;
};

const DAY_MS = 86_400_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON3 = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The EAT wall-clock parts of an instant. */
function eatParts(ms: number) {
  const d = new Date(ms + EAT_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mi: d.getUTCMinutes() };
}

/** "14 Sep 2026" for an EAT day key. */
export function dayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return `${d} ${MON3[m - 1]} ${y}`;
}

/** "14 Sep 2026 08:00" for an instant, in EAT. */
export function eatDateTimeLabel(ms: number): string {
  const p = eatParts(ms);
  return `${p.d} ${MON3[p.m]} ${p.y} ${String(p.hh).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** The month containing an instant, as `YYYY-MM` (EAT). */
export function monthKeyOf(ms: number): string {
  const p = eatParts(ms);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}`;
}

export function monthPeriod(key: string): TaxPeriod | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return null;
  const [y, m] = key.split("-").map(Number);
  const startMs = Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS;
  const endMs = Date.UTC(y, m, 1) - EAT_OFFSET_MS;
  return { kind: "month", key, startMs, endMs, label: `${MONTHS[m - 1]} ${y}` };
}

/** The ISO-8601 week number of the week starting on the Monday `mondayKey`. */
function isoWeekNumber(mondayKey: string): { week: number; isoYear: number } {
  const monday = Date.parse(`${mondayKey}T00:00:00.000Z`);
  const thursday = monday + 3 * DAY_MS; // the ISO week belongs to the year of its Thursday
  const isoYear = new Date(thursday).getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  return { week: Math.floor((thursday - jan1) / DAY_MS / 7) + 1, isoYear };
}

/** The Monday-to-Sunday EAT week containing `dayKey` (any day of it). */
export function weekPeriod(dayKey: string): TaxPeriod | null {
  if (!isDayKey(dayKey)) return null;
  const dayStart = eatDayStartMs(dayKey);
  const wd = eatParts(dayStart).wd; // 0 = Sunday
  const startMs = dayStart - ((wd + 6) % 7) * DAY_MS;
  const endMs = startMs + 7 * DAY_MS;
  const mondayKey = eatDayKey(startMs);
  const sundayKey = eatDayKey(endMs - 1);
  const { week } = isoWeekNumber(mondayKey);
  const [y1, m1, d1] = mondayKey.split("-").map(Number);
  const [y2, m2, d2] = sundayKey.split("-").map(Number);
  const span = y1 !== y2
    ? `${d1} ${MON3[m1 - 1]} ${y1} – ${d2} ${MON3[m2 - 1]} ${y2}`
    : m1 !== m2
      ? `${d1} ${MON3[m1 - 1]} – ${d2} ${MON3[m2 - 1]} ${y2}`
      : `${d1}–${d2} ${MON3[m2 - 1]} ${y2}`;
  return { kind: "week", key: mondayKey, startMs, endMs, label: `Week ${week} · ${span}` };
}

export function dayPeriod(dayKey: string): TaxPeriod | null {
  if (!isDayKey(dayKey)) return null;
  const startMs = eatDayStartMs(dayKey);
  return { kind: "day", key: dayKey, startMs, endMs: startMs + DAY_MS, label: `${WEEKDAY3[eatParts(startMs).wd]} ${dayLabel(dayKey)}` };
}

/** The longest custom window the report will read — a year and a day, so a typo cannot ask for a decade. */
export const CUSTOM_MAX_DAYS = 366;

/** Parse `YYYY-MM-DDTHH:mm` as an EAT wall-clock instant. */
export function parseEatLocal(v: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  if (!isDayKey(v.slice(0, 10))) return null;
  const [hh, mi] = v.slice(11).split(":").map(Number);
  if (hh > 23 || mi > 59) return null;
  return Date.parse(`${v}:00.000Z`) - EAT_OFFSET_MS;
}

/** `YYYY-MM-DDTHH:mm` (EAT) for an instant — the inverse of `parseEatLocal`. */
export function toEatLocal(ms: number): string {
  return new Date(ms + EAT_OFFSET_MS).toISOString().slice(0, 16);
}

export function customPeriod(fromLocal: string, toLocal: string): TaxPeriod | null {
  const startMs = parseEatLocal(fromLocal);
  const endMs = parseEatLocal(toLocal);
  if (startMs === null || endMs === null || !(endMs > startMs)) return null;
  if (endMs - startMs > CUSTOM_MAX_DAYS * DAY_MS) return null;
  return { kind: "custom", key: `${fromLocal}~${toLocal}`, startMs, endMs, label: `${eatDateTimeLabel(startMs)} → ${eatDateTimeLabel(endMs)}` };
}

/** The last COMPLETE calendar month before `nowMs` — the default view, because filing is monthly. */
export function lastCompleteMonth(nowMs: number): TaxPeriod {
  const p = eatParts(nowMs);
  const prev = p.m === 0 ? `${p.y - 1}-12` : `${p.y}-${String(p.m).padStart(2, "0")}`;
  return monthPeriod(prev)!;
}

/**
 * The period a URL names. ⛔ An unreadable parameter falls back to the DEFAULT period and says so
 * (`fellBack`), rather than to "today" or to a half-parsed window: a tax figure for a period the
 * officer did not ask for is the worst thing this page could print.
 */
export function periodFromParams(
  params: { period?: string; month?: string; week?: string; day?: string; from?: string; to?: string },
  nowMs: number,
): { period: TaxPeriod; fellBack: boolean } {
  // ⭐ A link that names a week, a day or a window but no `period` means THAT — never silently the default month.
  const kind = (params.period ?? "").trim().toLowerCase()
    || (params.week ? "week" : params.day ? "day" : params.from || params.to ? "custom" : "");
  let p: TaxPeriod | null = null;
  if (kind === "" || kind === "month") p = params.month ? monthPeriod(params.month) : lastCompleteMonth(nowMs);
  else if (kind === "week") p = params.week ? weekPeriod(params.week) : null;
  else if (kind === "day") p = params.day ? dayPeriod(params.day) : null;
  else if (kind === "custom") p = params.from && params.to ? customPeriod(params.from, params.to) : null;
  if (p) return { period: p, fellBack: false };
  return { period: lastCompleteMonth(nowMs), fellBack: true };
}

/** The neighbouring period of the same kind (custom periods have none). */
export function shiftPeriod(p: TaxPeriod, dir: -1 | 1): TaxPeriod | null {
  if (p.kind === "month") {
    const [y, m] = p.key.split("-").map(Number);
    const idx = y * 12 + (m - 1) + dir;
    return monthPeriod(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`);
  }
  if (p.kind === "week") return weekPeriod(eatDayKey(p.startMs + dir * 7 * DAY_MS));
  if (p.kind === "day") return dayPeriod(eatDayKey(p.startMs + dir * DAY_MS));
  return null;
}

/**
 * Where the period's figures stop. A finished period is read to its end; a period still running is
 * read to NOW and is PARTIAL — it can be viewed, never locked or filed (the same rule the statutory
 * monthly pack follows). A period entirely in the future has nothing to read.
 */
export function cutoffOf(p: TaxPeriod, nowMs: number): { cutoffMs: number; inProgress: boolean; notStarted: boolean } {
  if (p.startMs >= nowMs) return { cutoffMs: p.startMs, inProgress: false, notStarted: true };
  // ⭐ A RUNNING period is read to a minute BEFORE now, never to now: a bet or a settlement stamped in the last
  // moments may still be committing (up to a lock transaction's 30 s), and the money records and the bets are two
  // reads — cut at the very edge, one could see a row the other has not, and a correct book would show a false
  // exception. Floored at the period's start.
  if (p.endMs > nowMs) return { cutoffMs: Math.max(p.startMs, nowMs - RUNNING_MARGIN_MS), inProgress: true, notStarted: false };
  return { cutoffMs: p.endMs, inProgress: false, notStarted: false };
}

/** How far behind now a running period is read (see `cutoffOf`). */
export const RUNNING_MARGIN_MS = 60_000;

/**
 * Only a finished day, week or month can be locked and filed — never a custom window, never a
 * partial one — and only once `LOCK_GRACE_MS` has passed since it closed, so every bet stamped
 * inside it has committed.
 */
export function isLockable(p: TaxPeriod, nowMs: number): boolean {
  return p.kind !== "custom" && p.endMs + LOCK_GRACE_MS <= nowMs;
}

/**
 * A period re-anchored to another kind, on the same first day: September → the week of 1 Sep, its
 * first day, or a custom window spanning exactly September. What the kind pills link to.
 */
export function periodOfKind(p: TaxPeriod, kind: PeriodKind): TaxPeriod {
  const day = eatDayKey(p.startMs);
  if (kind === "month") return monthPeriod(monthKeyOf(p.startMs))!;
  if (kind === "week") return weekPeriod(day)!;
  if (kind === "day") return dayPeriod(day)!;
  if (p.kind === "custom") return p;
  return customPeriod(toEatLocal(p.startMs), toEatLocal(p.endMs)) ?? p;
}

/** The minutes a FINISHED period waits before it may be locked — a bet stamped at 23:59:59.9 can
 *  commit up to a lock transaction's 30-second timeout later, and a lock must not race it. */
export const LOCK_GRACE_MS = 10 * 60_000;

// ════════════════════════════════════════════════════════════════════════════════════════════
// 7 · URLS — one builder for the page, the picker and the export, so they name the same period
// ════════════════════════════════════════════════════════════════════════════════════════════

export const TAX_PAGE_PATH = "/admin/tax";

/** The query that names a period: `period=month&month=2026-09`, `period=custom&from=…&to=…`. */
export function periodQuery(p: TaxPeriod): Record<string, string> {
  if (p.kind === "month") return { period: "month", month: p.key };
  if (p.kind === "week") return { period: "week", week: p.key };
  if (p.kind === "day") return { period: "day", day: p.key };
  const [from, to] = p.key.split("~");
  return { period: "custom", from, to };
}

/** `period=month&month=2026-09&product=UPDOWN` — "All products" is the default and is left out. */
export function taxQueryString(p: TaxPeriod, product: ProductFilter, extra: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams(periodQuery(p));
  if (product !== "ALL") q.set("product", product);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") q.set(k, v);
  return q.toString();
}

export function taxPageHref(p: TaxPeriod, product: ProductFilter, extra: Record<string, string | undefined> = {}): string {
  return `${TAX_PAGE_PATH}?${taxQueryString(p, product, extra)}`;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 8 · FORMATTING
// ════════════════════════════════════════════════════════════════════════════════════════════

const GROUPED = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * A cents figure as the page prints it: "1,000,000", or "1,110.60" when cents exist — ⛔ never a
 * rounded whole number standing in for one that has cents, because then the four printed lines
 * would not add up to the printed Sales and the check would look wrong on a page where it is right.
 * Negative figures carry a real minus sign (U+2212), as every money figure on this platform does.
 */
export function formatCents(cents: number): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  const whole = Math.trunc(a / 100);
  const frac = a % 100;
  const body = GROUPED.format(whole) + (frac ? `.${String(frac).padStart(2, "0")}` : "");
  return `${neg ? "−" : ""}${body}`;
}

/** Whole shillings, grouped — for the tax lines, which are whole by definition. */
export function formatWhole(tzs: number): string {
  return `${tzs < 0 ? "−" : ""}${GROUPED.format(Math.abs(tzs))}`;
}

/** Cents → a JS number of shillings for renderers that need one (XLSX number cells). Exact for whole shillings. */
export function centsToTzs(cents: number): number {
  return cents / 100;
}

/** A Decimal-ish value (Prisma Decimal, string or number) → integer cents, exactly. */
export function toCents(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? v.toFixed(2) : String(v).trim();
  const m = /^(-)?(\d+)(?:\.(\d{1,}))?$/.exec(s);
  if (!m) {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new RangeError(`toCents: not a number: ${s}`);
    return Math.round(n * 100);
  }
  const [, sign, whole, frac = ""] = m;
  // Round half away from zero at the cent (a Decimal(18,2) never has a third digit; a float might).
  const f3 = (frac + "000").slice(0, 3);
  let cents = Number(whole) * 100 + Number(f3.slice(0, 2));
  if (Number(f3[2]) >= 5) cents += 1;
  return sign ? -cents : cents;
}
