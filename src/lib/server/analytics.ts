/**
 * Aggregation queries for the admin dashboard.
 *
 * Each window is read with one SQL range query (`db.txn.listInRange`, or its in-memory twin)
 * and aggregated here; the money figures delegate to `report-money`.
 *
 * All money values are in TZS (integer minor units would normally be cents,
 * but TZS has no fractional unit in practice, so we keep integers).
 */
import { db } from "./store";
import type { StoredTxn, StoredUser } from "./store";
import { tallyHeldForUnverified, type UnverifiedHeld } from "../kyc-stage";
import { tallyWalletLiability, type WalletLiability } from "../wallet-liability";
import { readKycMoneySnapshot } from "./kyc-money";
import { moneyForWindow, EAT_OFFSET_MS } from "./report-money";
import { listMarkets, ratesFor } from "./market-service";
import { poolFee, levySplit, type FeeModel } from "../payout";

/**
 * 🔴 `"today"` AND `"qtd"` ARE GONE FROM THIS UNION, AND THAT IS THE FIX — not re-pointing them.
 *
 * `periodToMs("today")` returned a ROLLING 24 HOURS while `resolveRange("today")` and
 * `query/windows.inWindow("today")` return the EAT CALENDAR DAY (as `report-money.periodBounds("today")`
 * did, until that unused arm was deleted on 2026-09-25). One word, two spans, on a platform that
 * keeps one clock.
 *
 * ⛔ THE OBVIOUS FIX — make this one the EAT day too — IS THE WRONG ONE, and it was measured
 * before being rejected. Every caller of the rolling window is on `/admin` and `/admin/live`, and
 * every one of them is already LABELLED honestly: "GGR · 24h", "NGR · 24h", `delta="last 24h"`,
 * "24-hour money flow"; the variable is even called `active24h`. Nothing anywhere says "Today"
 * over it, so there was no user-visible lie to repair — only a misnamed argument. Re-pointing it
 * would have turned six correct captions into six wrong ones at a stroke, and it would have
 * broken `moneyFlowSeries(…, 24)` structurally: the bucket is `(end − start) / 24`, so under the
 * EAT day it is 12.5s at 00:05, 150s at 01:00 and NEVER reaches an hour at any instant of any
 * day, beneath a card that says "TZS net per hour" — and at EAT midnight `bucketMs` is 0, giving
 * 24 zero points with 24 identical labels, the fabricated flat zero those files forbid.
 * ⭐ `src/lib/query/windows.ts` already rules on exactly this: calendar names are calendar
 * windows, rolling names are rolling windows, and "do not regularise one into the other".
 * So the rolling callers now ask for what they mean — `resolveRange({ range: "24h" })` — and
 * `"today"` means the EAT calendar day everywhere in this repo, without exception.
 * ⚠️ `"qtd"` goes for the same reason: it meant 91 ROLLING days here and the calendar quarter in
 * `resolveRange`, up to 91 days apart. It had no string callers; `resolveRange` owns that id.
 */
export type Period = "7d" | "28d";
/** Either a rolling window (Period, ending now) OR explicit epoch bounds
 *  [start, end) — the latter lets callers ask for a fixed calendar month
 *  (e.g. the statutory GBT monthly pack), or any window `resolveRange` produced. */
export type Window = Period | { start: number; end: number };

function periodToMs(p: Period): number {
  switch (p) {
    case "7d":    return 7 * 24 * 3600_000;
    case "28d":   return 28 * 24 * 3600_000;
  }
}

function windowBounds(w: Window): { start: number; end: number } {
  if (typeof w === "object") return w;
  const end = Date.now();
  return { start: end - periodToMs(w), end };
}

async function txnsInPeriod(w: Window) {
  const { start, end } = windowBounds(w);
  // The window is a WHERE clause, not a JS filter. Walking the whole table cost 3,176 ms
  // and 333 MB of heap at 1,000 users × 100 transactions; the same window in SQL is 48 ms
  // (scripts/load/s13-scale-ceilings.mts). Identical bounds: >= start, < end.
  return db.txn.listInRange(start, end);
}

/**
 * GGR = Stakes − Payouts − Refunds — a TURNOVER measure, NOT the operator's commission (it still
 * holds stakes on positions that have not settled; see report-money's header). This is the
 * normative definition shared with the reports console — delegates to
 * `report-money.moneyForWindow` so every admin surface shows ONE GGR figure.
 * (Previously this returned Stakes/turnover only, mislabelled "GGR"; reconciled.)
 */
export async function grossGamingRevenue(period: Window = "28d") {
  const { start, end } = windowBounds(period);
  return (await moneyForWindow(start, end)).ggr;
}

/**
 * NGR = GGR − bonus cost − agent commission − payment-processing fees — the pre-tax operator
 * bottom line. Delegates to the same `report-money` core as GGR so the definitions can
 * never drift. (Previously this returned Stakes − Payouts, i.e. the value that is
 * actually GGR; reconciled to the normative NGR.)
 */
export async function netGamingRevenue(period: Window = "28d") {
  const { start, end } = windowBounds(period);
  return (await moneyForWindow(start, end)).ngr;
}

export type PollFeeRow = {
  marketId: string;
  title: string;
  settledAt: string;
  outcome: "YES" | "NO";
  feeModel: FeeModel;
  pool: number;
  fee: number;
  operatorNet: number;
};
export type SettlementFeesByPoll = {
  rows: PollFeeRow[];
  byModel: Record<FeeModel, { count: number; fee: number }>;
  totalFee: number;
};

/**
 * Per-poll settlement commission for the period, WITH the fee model each poll used
 * — so an accountant can see, poll by poll, whether it was `loser-share` (a % of the
 * losing side) or `capped-commission`, and reconcile the fee. The fee is recomputed
 * from the poll's OWN frozen snapshot + declared outcome via `poolFee` — the exact
 * function and inputs settlement used (a legacy snapshot where none was stored — see
 * MONEY-GATE-REMEDIATION §3.3). The BOOKED figure is `HOUSE:COMMISSION` movement plus the levies
 * debited out of it; this is a reconstruction for the per-poll view, not the ledger. Read-only; moves no money. Only YES/NO settlements bear a fee (VOID /
 * one-sided are full refunds at 0 fee and are omitted).
 */
export async function settlementFeesByPoll(period: Window = "28d"): Promise<SettlementFeesByPoll> {
  const { start, end } = windowBounds(period);
  // MONEY READ → productLine "ALL". This is the per-poll commission breakdown, split
  // by fee model — and Up & Down rounds are the ONLY polls on `capped-commission @
  // 13%`, so omitting them would leave that model's row permanently empty and
  // understate settlement fees. Guarded by test:product-line.
  // ⭐ THE WINDOW IS IN THE QUERY (2026-09-26). This read every RESOLVED market on the platform —
  // 6,689 on production, one per Up & Down round, growing ~360 a day — to keep the ones settled in
  // the window. The `settledAt` bounds below are the same ones the loop re-checks, so the rows kept
  // are identical (`test:report-window-reads` §5).
  const markets = await listMarkets({ status: "RESOLVED", productLine: "ALL", settledFrom: start, settledTo: end }).catch(() => []);
  const rows: PollFeeRow[] = [];
  const byModel: Record<FeeModel, { count: number; fee: number }> = {
    "loser-share": { count: 0, fee: 0 },
    "capped-commission": { count: 0, fee: 0 },
  };
  for (const m of markets) {
    if (!m.settledAt) continue; // adjudicated but not yet settled → no fee booked
    const ts = new Date(m.settledAt).getTime();
    if (ts < start || ts >= end) continue;
    if (m.resolvedOutcome !== "YES" && m.resolvedOutcome !== "NO") continue; // VOID = refund, 0 fee
    const rates = ratesFor(m);
    const fb = poolFee(m.yesPool, m.noPool, rates, m.resolvedOutcome);
    const fee = Math.round(fb.fee);
    const { operatorNet } = levySplit(fee, rates);
    const model = rates.feeModel;
    rows.push({
      marketId: m.id,
      title: m.titleEn,
      settledAt: m.settledAt,
      outcome: m.resolvedOutcome,
      feeModel: model,
      pool: m.yesPool + m.noPool,
      fee,
      operatorNet,
    });
    byModel[model].count += 1;
    byModel[model].fee += fee;
  }
  rows.sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime());
  return { rows, byModel, totalFee: rows.reduce((s, r) => s + r.fee, 0) };
}

export async function depositsTotal(period: Window = "28d") {
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + t.amount, 0), count: ts.length };
}

export async function withdrawalsTotal(period: Window = "28d") {
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "WITHDRAWAL" && t.status === "CONFIRMED");
  return { amount: ts.reduce((s, t) => s + Math.abs(t.amount), 0), count: ts.length };
}

/** Per-provider deposit/withdrawal totals with fees + net. */
export async function providerSummary(period: Window = "28d") {
  const ts = await txnsInPeriod(period);
  const map: Record<string, { deposits: number; depositCount: number; withdrawals: number; withdrawalCount: number }> = {};
  for (const t of ts) {
    const key = t.provider ?? "OTHER";
    if (key === "INTERNAL") continue; // skip internal bet payouts
    const e = (map[key] ??= { deposits: 0, depositCount: 0, withdrawals: 0, withdrawalCount: 0 });
    if (t.type === "DEPOSIT" && t.status === "CONFIRMED") {
      e.deposits += t.amount;
      e.depositCount++;
    } else if (t.type === "WITHDRAWAL" && t.status === "CONFIRMED") {
      e.withdrawals += Math.abs(t.amount);
      e.withdrawalCount++;
    }
  }
  return Object.entries(map)
    .map(([provider, e]) => ({
      provider,
      deposits: e.deposits,
      depositCount: e.depositCount,
      withdrawals: e.withdrawals,
      withdrawalCount: e.withdrawalCount,
      net: e.deposits - e.withdrawals,
    }))
    .sort((a, b) => b.deposits - a.deposits);
}

/**
 * Active players in the period — distinct players whose money actually moved (CONFIRMED only).
 *
 * 🔴 THIS WAS A SECOND, DIVERGENT DEFINITION AND IT WAS WRONG IN TWO WAYS. Its docstring said
 * "at least one bet or deposit" while the code filtered neither TYPE nor STATUS: `txnsInPeriod`
 * is a bare `listInRange`, so a player whose only activity was a DECLINED deposit counted, and
 * so did PENDING, AML_REVIEW, REVERSED and CANCELLED rows. The prose and the code disagreed, and
 * both disagreed with `summarise()`.
 * ⭐ IT NOW DELEGATES, exactly as `grossGamingRevenue` and `netGamingRevenue` above already do.
 * That deletes the duplicate definition rather than fixing it twice — two functions answering
 * "how many players were active" cannot drift apart if only one of them decides.
 */
export async function activePlayers(period: Window = "28d") {
  const { start, end } = windowBounds(period);
  return (await moneyForWindow(start, end)).activePlayers;
}

/** Real money owed to players = spendable balance PLUS funds on hold (in-flight
 *  and AML-held withdrawals). Held funds are still the operator's liability until
 *  they actually leave the platform, so excluding them understated the regulator-
 *  facing "wallet liability" figure. Bonus balances are non-withdrawable and so
 *  are tracked separately, not here. Single-pass over wallets.
 *
 *  ⚠️ ACTIVE WALLETS ONLY — the activity figure /admin/finance shows. `readPlayerLiability`
 *  (house-ledger.ts) is the SOLVENCY line and counts every wallet, because a freeze does not
 *  discharge a debt; the two differ by exactly the frozen and closed balances.
 *  ⭐ The per-wallet sum is `walletHeldTzs` (src/lib/kyc-stage.ts) since 2026-09-13 — the SAME
 *  arithmetic as before, now shared with `unverifiedLiability()` below, so the two tiles on the
 *  finance page are on one basis by construction rather than by two copies agreeing.
 *  ⭐ 2026-09-14 (E-400 ⑦e): the sum is `tallyWalletLiability` (src/lib/wallet-liability.ts), which reads the
 *  same snapshot once and also reports the frozen and closed money this basis leaves out, for the tile's caption. */
export async function walletLiabilityTotal() {
  return (await walletLiabilityByStatus()).activeTzs;
}

/** The ACTIVE-basis liability AND what that basis leaves out (frozen, closed), from ONE wallet read — so the
 *  finance tile's caption can never describe a different snapshot from the figure above it. */
export async function walletLiabilityByStatus(): Promise<WalletLiability> {
  return tallyWalletLiability(await db.wallet.listAll());
}

/** A failed read is its OWN arm — never `{ ok: true, tzs: 0 }`. */
export type UnverifiedLiability =
  | ({ ok: true } & UnverifiedHeld)
  | { ok: false; failed: "kyc" | "wallets" };

/**
 * ⭐ HELD FOR UNVERIFIED — what we owe accounts whose identity has NEVER been approved (2026-09-13).
 *
 * WHY IT EXISTS. From 2026-09-13 identity is asked before a withdrawal and before nothing else
 * (docs/COMPLIANCE-DECISIONS.md), so any account can hold real money we hold no identity for. The
 * regulator's first question about that ruling is "how much?", and until this function the console
 * could not answer it in any form.
 *
 * ⛔ THE SAME BASIS AS `walletLiabilityTotal()` — ACTIVE wallets, `balance + hold`, via the one shared
 * `walletHeldTzs` — so the figure is a SUBSET of "Wallet liability" and reconciles against it.
 * `basisTotalTzs` is that liability recomputed from the same snapshot, which makes
 * `tzs <= basisTotalTzs` checkable. Frozen and closed never-approved balances are returned BESIDE
 * it (`frozen`, `closed`), not folded in: a final identity refusal freezes the wallet, so that is
 * exactly the S1 money the ACTIVE basis leaves out, and it must not vanish from the page.
 * ⛔ "Never approved" is `approvedEver` — the withdrawal gate's predicate, over the newest submission
 * per user, which is the row the gate reads.
 * ⛔ `listStageFacts` + `wallet.listAll` only — never `db.kyc.list()` (base64 document images).
 * ⛔ NEVER THROWS, and a failed read is `{ ok: false }`: "TZS 0 held for unverified accounts" after
 * a database blip would be a false compliance all-clear.
 * ⚠️ Includes staff wallets, as `walletLiabilityTotal` does. The withdrawal gate asks staff the same
 * question, so an unapproved staff balance is genuinely unverified money.
 */
export async function unverifiedLiability(): Promise<UnverifiedLiability> {
  const read = await readKycMoneySnapshot();
  if (!read.ok) return { ok: false, failed: read.failed };
  return { ok: true, ...tallyHeldForUnverified(read.facts, read.wallets) };
}

/**
 * KYC funnel — count of users at each step.
 * registered → started → pending → approved.
 */
export async function kycFunnel() {
  const users = await db.user.list();
  const registered = users.length;
  let started = 0;
  let pending = 0;
  let approved = 0;
  for (const u of users) {
    const k = await db.kyc.findByUserId(u.id);
    if (!k || k.status === "NOT_STARTED") continue;
    started++;
    if (k.status === "PENDING_REVIEW") pending++;
    else if (k.status === "APPROVED") approved++;
  }
  return { registered, started, pending, approved };
}

/** Self-exclusion + cooling-off counts (currently active). */
export async function rgRosterCounts() {
  const now = Date.now();
  const oneWeek = now + 7 * 24 * 3600_000;
  let selfExcluded = 0;
  let cooledOff = 0;
  let expiringThisWeek = 0;
  let pendingLimitIncrease = 0;
  for (const u of await db.user.list()) {
    const r = await db.responsible.get(u.id);
    if (!r) continue;
    const sxAt = r.selfExclusionUntil ? new Date(r.selfExclusionUntil).getTime() : 0;
    const coAt = r.coolingOffUntil ? new Date(r.coolingOffUntil).getTime() : 0;
    if (sxAt > now) {
      selfExcluded++;
      if (sxAt < oneWeek) expiringThisWeek++;
    }
    if (coAt > now) cooledOff++;
    // E-408 — keyed on the effective time: a pending REMOVAL carries `to = null`.
    if (r.pendingIncreaseEffectiveAt || r.pendingWeeklyIncreaseEffectiveAt || r.pendingMonthlyIncreaseEffectiveAt || r.pendingLossLimitEffectiveAt || r.pendingSessionLimitEffectiveAt) pendingLimitIncrease++;
  }
  return { selfExcluded, cooledOff, expiringThisWeek, pendingLimitIncrease };
}

// 🔴 `amlStats()` DELETED 2026-09-07 — zero callers anywhere in the repo, and it returned
// HARDCODED ZEROS for `approved`, `rejected` and `avgTimeToDecisionMin`, with its own comments
// admitting it ("populated when audit-by-action exists"). ⛔ Wired to any compliance surface it
// would have reported "0 rejected, 0 minutes to decision" as fact — a fabricated number on an
// AML metric, which A-5 forbids. Dead is safer than a stub that lies when someone finds it.

/** Active player counts grouped by wallet status — used by /admin/players summary chips. */
export async function userStatusCounts() {
  const all = await db.user.list();
  return all.reduce(
    (acc, u) => {
      acc[u.status] = (acc[u.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StoredUser["status"], number>,
  );
}

/** Top-N players by lifetime GROSS gaming margin (stakes − payouts), anonymised.
 *  NOTE: this is per-user GROSS margin, NOT full NGR — it excludes bonus cost,
 *  fees and refunds, which are not attributable per player. The `ngr` field name
 *  is kept for its single consumer (finance "Top-10 player concentration", which
 *  is NOT labelled NGR in the UI); read it as "gross margin contribution".
 *  Single-pass over all transactions, grouped by userId. */
export async function topNgrContributors(n = 10) {
  // Genuinely all-time — there is no window to push down — so it is a GROUP BY rather
  // than a smaller scan, and `n` is what bounds it. Previously this walked the whole
  // transactions table into memory to produce ten rows.
  const rows = await db.txn.topContributors(n);
  return rows.map((r) => ({
    userId: r.userId,
    lifetimeStakes: r.stakes,
    lifetimePayouts: r.payouts,
    ngr: r.stakes - r.payouts,
  }));
}

/** Operator margin = hold % over the period. Delegates to the CANONICAL
 *  report-money summary so it EQUALS the GGR shown beside it on /admin/finance:
 *  holdPct = (stakes − payouts − refunds) / stakes. (Previously it omitted
 *  refunds, so a voided/one-sided poll made this tile disagree with GGR — a
 *  figure that couldn't be reconciled to the canonical source.) */
export async function operatorMarginPct(period: Window = "28d") {
  const { start, end } = windowBounds(period);
  const { holdPct } = await moneyForWindow(start, end);
  return holdPct;
}

// 🔴 `amlThresholdBreaches()` DELETED 2026-09-07 — zero callers, and it inlined a THIRD copy
// of the 1,000,000 TZS AML threshold (see `AML_REVIEW_THRESHOLD_TZS` in payments.ts — a reporting
// line only since the owner ruling of 2026-09-13 switched the withdrawal hold it triggered off).
/**
 * 🔴 EVERY CHART LABEL ON THIS PAGE WAS IN THE CONTAINER'S TIMEZONE, NOT THE PLATFORM'S.
 * The three series below each built their x-labels with `new Date(bucketStart).getHours()` /
 * `.getDate()` / `.getMonth()` — and those read whatever zone the process runs in. Railway runs
 * UTC; this platform keeps ONE clock, EAT (UTC+3). So every bucket on the Trends tab was
 * labelled three hours behind the data it plotted, and a bucket that began at 00:30 EAT
 * announced itself as 21:30 the previous day.
 * ⭐ This is the SAME defect, two cards away, that the settlement-fee table's `settledAt`
 * column already carries a dated note about — it was fixed there with `eatDayKey` and left
 * standing in the charts. One formatter now, used by all three.
 * ⛔ It reads the UTC fields of `ms + EAT_OFFSET_MS`, exactly as `date-range.fmtEat` and
 * `reports/brand.fmtDate` do — never a local-zone getter.
 */
function eatBucketLabel(ms: number, intraday: boolean): string {
  const d = new Date(ms + EAT_OFFSET_MS);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return intraday
    ? `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
    : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/**
 * ⭐ WHAT A BUCKET ACTUALLY IS, SO A CARD CAN STOP GUESSING. The series below slice the
 * SELECTED window into N buckets (`bucketMs = totalMs / buckets`) — they do NOT plot N days.
 * The finance cards nonetheless carried hard-typed subtitles ("28-day daily series",
 * "14-day daily"), so at the 7-day default an officer read six-hour buckets as days.
 * A card renders its subtitle from this instead of from a remembered number.
 */
export function bucketGrain(start: number, end: number, buckets: number): { buckets: number; bucketMs: number; grain: string } {
  const bucketMs = (end - start) / Math.max(1, buckets);
  const grain =
    bucketMs >= 86_400_000 ? (bucketMs >= 2 * 86_400_000 ? `${Math.round(bucketMs / 86_400_000)}-day` : "daily")
    : bucketMs >= 3_600_000 ? `${Math.max(1, Math.round(bucketMs / 3_600_000))}-hour`
    : `${Math.max(1, Math.round(bucketMs / 60_000))}-minute`;
  return { buckets, bucketMs, grain };
}

/**
 * Time-bucketed series for charting. Returns evenly-spaced buckets covering
 * the period. Each bucket has the net flow (deposits + bets stake) − (payouts +
 * cashouts + withdrawals). Useful for the money-flow area chart.
 */
export async function moneyFlowSeries(period: Window = "28d", buckets = 24) {
  const { start, end } = windowBounds(period);
  const totalMs = end - start;
  const bucketMs = totalMs / buckets;
  const intraday = totalMs <= 36 * 3600_000; // ≤ ~1.5 days → hour:minute labels
  const ts = await txnsInPeriod(period);
  const out: Array<{ x: number; y: number; label: string }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = start + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    let inflow = 0;
    let outflow = 0;
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      if (t.status !== "CONFIRMED") continue;
      if (t.type === "DEPOSIT") inflow += t.amount;
      else if (t.type === "BET_PLACED") inflow += Math.abs(t.amount);
      else if (t.type === "WITHDRAWAL") outflow += Math.abs(t.amount);
      else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") outflow += Math.abs(t.amount);
    }
    const net = inflow - outflow;
    out.push({ x: i, y: net, label: eatBucketLabel(bucketStart, intraday) });
  }
  return out;
}

/**
 * Operator margin over time — **CUMULATIVE TO DATE**, not per bucket.
 *
 * Margin = hold %, the same definition as the canonical report-money summary
 * (report-money.ts `summarise`): `(stakes − payouts − refunds) / stakes × 100`.
 *
 * 🔴 THIS WAS PER-BUCKET AND IT WAS NOT A MARGIN (finding A6, 2026-08-11). Every term was
 * bucketed by the day the money MOVED, and in a prediction market a payout or a refund
 * happens days after the stake that earned it — so the numerator and the denominator
 * described **different bets** and no bucket compared like with like. Measured on the live
 * database across 23 days:
 *
 *   · 2026-07-20 · stakes 4,000 · payouts 0 · refunds 0        → **100.0%**
 *   · 2026-07-28 · stakes 13,000 · payouts 58,097              → **−346.9%**
 *   · 2026-07-30 · stakes 7,500 · refunds 96,250               → **−1183.3%**
 *
 * ⛔ **FIVE OF THE TWENTY-THREE DAYS READ EXACTLY 100.0%**, because nothing had settled yet.
 * A 100% operator margin is impossible in a pari-mutuel, where the operator takes a
 * commission and the rest of the pool belongs to the winners — the chart stated it as fact
 * five times, under a card subtitled "band 7–10%".
 *
 * ⭐ CUMULATIVE FIXES IT WITHOUT CHANGING THE DEFINITION. Each point is the margin over
 * `[window start → this bucket's end]`, which is a real period with its own settled stakes
 * and payouts. It cannot print 100% once anything has settled, it cannot swing to −1183%
 * because one day's refunds dwarf that day's stakes, and **its last point equals
 * `operatorMarginPct(period)` by construction** — so the chart and the KPI tile beside it,
 * which are both labelled "Operator margin", can no longer disagree.
 *
 * ⚠️ The alternative remains open and is a bigger change: attribute each settlement to the
 * bucket of its ORIGINATING bet, which would give a true per-day margin at the cost of
 * leaving the most recent buckets provisional until their markets resolve. Recorded in
 * `docs/ADMIN-CONSOLE-FINDINGS.md` as option ① of A6.
 */
export async function marginSeries(period: Window = "28d", buckets = 28) {
  const { start, end } = windowBounds(period);
  const totalMs = end - start;
  const bucketMs = totalMs / buckets;
  const ts = await txnsInPeriod(period);
  const out: Array<{ x: number; y: number; label: string }> = [];
  // Running totals — the whole point: every bucket's margin is computed over everything
  // seen SO FAR, so the settlement lag that makes a per-day figure meaningless averages out.
  let stakes = 0;
  let payouts = 0;
  let refunds = 0;
  for (let i = 0; i < buckets; i++) {
    const bucketStart = start + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      if (t.status !== "CONFIRMED") continue;
      if (t.type === "BET_PLACED") stakes += Math.abs(t.amount);
      else if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") payouts += Math.abs(t.amount);
      else if (t.type === "BET_REFUND") refunds += Math.abs(t.amount);
    }
    const margin = stakes === 0 ? 0 : ((stakes - payouts - refunds) / stakes) * 100;
    out.push({ x: i, y: margin, label: eatBucketLabel(bucketStart, false) });
  }
  return out;
}

/**
 * Per-day provider deposit volume — for the stacked-bar provider chart.
 *
 * 🔴 THE LEGEND AND THE BARS USED TO BE TWO DIFFERENT QUERIES, AND A CHART THAT NAMES ITS OWN
 * SWATCHES WRONG IS WORSE THAN NO CHART. The finance page drew the stacks from this function and
 * the legend from a separate `listProvidersInPeriod`, then relied on segment *i* meaning
 * `legend[i]`. The two derivations never agreed on a population OR an order:
 *   · this one binned CONFIRMED DEPOSITs; the legend listed EVERY type and EVERY status, so a
 *     provider seen only on a withdrawal — or only on a FAILED deposit — took a swatch with no
 *     stack behind it, and every colour after it named the wrong provider;
 *   · the legend dropped `INTERNAL`, this one did not;
 *   · both cut with `.slice(0, 5)` over FIRST-SEEN order, so "top 5" actually meant "first five
 *     that happened to appear" and the largest provider could be cut while a one-deposit
 *     provider kept a colour.
 * ⭐ The fix is not to align the two lists — it is to stop having two. The binner now returns the
 * keys it actually binned by, so the legend cannot be built from anything else. `otherCount` is
 * what the cap left out, because a capped view has to say so.
 * ⛔ The keys stay RAW ENUM VALUES — they are the bin keys. Only the caller's legend maps them
 * through the display lexicon.
 */
export async function providerStackedSeries(period: Window = "28d", buckets = 14) {
  const { start, end } = windowBounds(period);
  const totalMs = end - start;
  const bucketMs = totalMs / buckets;
  const ts = (await txnsInPeriod(period)).filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
  /* ⛔ `INTERNAL` is excluded here for the same reason `providerSummary` excludes it: it is a
     bookkeeping leg (bonus credits, adjustments), not a payment provider, and the Provider
     summary table on this very page already refuses it. Two panels on one screen must not
     disagree about who counts as a provider. */
  const volumes = new Map<string, number>();
  for (const t of ts) {
    const key = t.provider ?? "OTHER";
    if (key === "INTERNAL") continue;
    volumes.set(key, (volumes.get(key) ?? 0) + t.amount);
  }
  /* ⭐ ORDERED BY DEPOSIT VOLUME, THEN CAPPED — so "top 5" is true. First-seen order made the cap
     arbitrary. Ties break on the key so the order is stable between renders. */
  const ranked = [...volumes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const providers = ranked.slice(0, 5);
  const otherCount = Math.max(0, ranked.length - providers.length);
  const index = new Map(providers.map((k, i) => [k, i]));
  const bars: Array<{ label: string; segments: number[] }> = [];
  for (let i = 0; i < buckets; i++) {
    const bucketStart = start + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const segments = providers.map(() => 0);
    for (const t of ts) {
      const at = new Date(t.createdAt).getTime();
      if (at < bucketStart || at >= bucketEnd) continue;
      const idx = index.get(t.provider ?? "OTHER");
      if (idx !== undefined) segments[idx] += t.amount;
    }
    bars.push({ label: eatBucketLabel(bucketStart, false), segments });
  }
  return { providers, bars, otherCount };
}

/**
 * Suspicious-bet pattern detector.
 *
 * Flags any BET_PLACED in the last 7 days whose stake is more than `multiple`
 * times the user's 30-day median stake (default 10×). Also flags users whose
 * 24-hour stake count exceeds `velocityThreshold` (default 100 — possible
 * automated activity).
 *
 * Aligns with FATF Recommendation 10 (CDD ongoing monitoring) + Tanzania POCA
 * Cap 423 §16 (suspicious activity reporting). Output feeds /admin/aml so a
 * compliance officer can investigate before a SAR window closes.
 */
export type SuspiciousFlag = {
  userId: string;
  txnId: string;
  positionId: string | null;
  type: "STAKE_SPIKE" | "VELOCITY";
  detectedAt: string;
  detail: string;
  stake: number;
  median: number;
  multiple: number;
};

/** Single-pass suspicious-bet detection — groups by userId first, then analyses. */
export async function detectSuspiciousBets(opts: { multiple?: number; velocityThreshold?: number } = {}) {
  const multiple = opts.multiple ?? 10;
  const velocityThreshold = opts.velocityThreshold ?? 100;
  const now = Date.now();
  const recentCutoff = now - 7 * 24 * 3600_000;
  const baselineCutoff = now - 30 * 24 * 3600_000;

  // Windowed at the BASELINE cutoff, not the whole table: every use of `userTxns` below
  // filters to >= baselineCutoff (the 30-day median), >= recentCutoff (7d) or the last
  // 24h, so a row older than 30 days could never affect a flag. Loading all of history to
  // then discard it was 3,321 ms and 385 MB at 100,000 rows.
  const byUser = new Map<string, StoredTxn[]>();
  for (const t of await db.txn.listInRange(baselineCutoff, now + 1)) {
    if (t.type !== "BET_PLACED" || t.status !== "CONFIRMED") continue;
    const arr = byUser.get(t.userId) ?? [];
    arr.push(t);
    byUser.set(t.userId, arr);
  }

  const flags: SuspiciousFlag[] = [];
  for (const [userId, userTxns] of byUser) {
    const baseline = userTxns
      .filter((t) => new Date(t.createdAt).getTime() >= baselineCutoff)
      .map((t) => Math.abs(t.amount))
      .sort((a, b) => a - b);
    if (baseline.length < 3) continue;
    const median = baseline[Math.floor(baseline.length / 2)] || 1;
    for (const t of userTxns) {
      const at = new Date(t.createdAt).getTime();
      if (at < recentCutoff) continue;
      const stake = Math.abs(t.amount);
      const ratio = stake / median;
      if (ratio >= multiple) {
        flags.push({
          userId,
          txnId: t.id,
          positionId: t.positionId ?? null,
          type: "STAKE_SPIKE",
          detectedAt: new Date().toISOString(),
          detail: `Stake ${stake.toLocaleString()} is ${ratio.toFixed(1)}× the 30-day median of ${median.toLocaleString()}`,
          stake,
          median,
          multiple: Math.round(ratio * 10) / 10,
        });
      }
    }

    const last24h = userTxns.filter((t) => new Date(t.createdAt).getTime() >= now - 24 * 3600_000);
    if (last24h.length >= velocityThreshold) {
      flags.push({
        userId,
        txnId: last24h[0].id,
        positionId: last24h[0].positionId ?? null,
        type: "VELOCITY",
        detectedAt: new Date().toISOString(),
        detail: `${last24h.length} bets in the last 24h (threshold ${velocityThreshold})`,
        stake: last24h.reduce((s, t) => s + Math.abs(t.amount), 0),
        median,
        multiple: Math.round((last24h.length / Math.max(1, velocityThreshold)) * 10) / 10,
      });
    }
  }
  return flags.sort((a, b) => b.multiple - a.multiple);
}
