/**
 * LANE M · MONEY — trial balance, settlement and the fleet's P&L over everything lanes A and B placed.
 *
 * ── WHAT IT CLOSES ──────────────────────────────────────────────────────────────────────────────────────────
 * The drive's own header names the two gaps: "4. Money conservation over an engine-driven session (the drive
 * runs no trial balance at all)" and "5. Settlement and the fleet's own P&L". Nothing in the repository joins an
 * ENGINE-driven placement to a trial balance or to a settled book — `house-bot-money-cases.mts` §5 and §7 do
 * both over intents they inserted by hand. This lane takes the positions the REAL planner decided and the REAL
 * poller fired (`prior.placed`, re-read off the durable rows), settles their markets through the real services
 * (`resolveMarket` then `settleMarket({ force: true })` — `force` is mandatory or the call returns TOO_EARLY),
 * and asserts every money artefact against the literals derived by hand below.
 *
 * ── THE ORACLE RULE, AND THE TWO THINGS THIS FILE LOADS FROM `src/` ────────────────────────────────────────
 * ⛔ NO EXPECTATION HERE COMES FROM `src/`. Every fee, payout, levy, wallet and book figure is a hand derivation
 * over the stakes the roster fixed (A1 32,000 · B1 7,000 · B2 25,000) and A2's jittered stake `j`, which is read
 * off its own durable row where it is needed and CANCELS out of every fleet-wide figure. The harness's only
 * computation is `===`. `poolFee`, `allocateWinnerPayouts`, `levySplit` and `foldDayBook` are never called to
 * produce an expectation — that would be checking `payout.ts` with `payout.ts`.
 * ⚠️ TWO SUBJECTS ARE LOADED INSIDE `run`, NOT IMPORTED AT THE TOP: `ledger.ts#trialBalance` and
 * `book.ts#houseDayBook/houseDayBooks/houseOpenExposure`. They are WHAT IS MEASURED, never what is expected,
 * and the drive's `env` does not carry them (it carries `w.svc` for settlement and `S` for the stores). They sit
 * in one labelled block and nothing else from `src/` is touched. The shared change that would remove even that
 * is one line in the drive's `laneEnv` (`LEDGER`, `BOOK`); it is described in the build record, not made here.
 *
 * ── WHAT `trialBalance()` CANNOT SEE, and why this lane adds a per-market residual ──────────────────────────
 * `LedgerEntry` has no `houseBotId` column (`prisma/schema.prisma`, `model LedgerEntry`): the double-entry ledger
 * cannot tell house money from player money at all, so the trial balance is a check on the LEDGER, not on the
 * fleet. Its `ok` is three conditions (`ledger.ts` `computeTrialBalance`): every wallet ties to its PLAYER account
 * within 0.5 TZS, Σ every entry ≈ 0, and no group is off by more than 0.005. It proves NOTHING per account: a
 * `POOL:<market>` left at −1 by an over-collected commission is cancelled INSIDE the same global sum by
 * `HOUSE:COMMISSION` +1 — the exact defect `allocateFeeShares` (`payout.ts`) was written for, when 7 production
 * pools closed NEGATIVE while `test:trial-balance` stayed green. It is also `ok: true` on an EMPTY database
 * (`checkedWallets: 0`). So this lane asserts, for each fleet market, Σ `POOL:<marketId>` = yesPool + noPool
 * before settlement and = 0 after; asserts the COMMISSION, TRA and GBT columns each against a hand figure (a levy
 * group sums to zero even when the levy is wrong — 43 of 203 production markets, per the docblock at
 * `settlementPayoutEntries`); floors `checkedWallets`; and PLANTS the cancelling pair once to MEASURE the
 * blindness rather than assert it from a comment (M.21).
 *
 * ── HOW EVERY ASSERTION CAN GO RED ──────────────────────────────────────────────────────────────────────────
 * Each planned desk has a PREMISE (M.0): exactly one OPEN marked position of the expected stake on the expected
 * side, on a market whose pools are the ones the literals were derived from — read off the durable rows, never
 * off `prior.placed`. ⛔ `prior.placed` is NOT evidence: the counter lanes push a row for every desk that was
 * meant to fire, with `stake: undefined` and `side: undefined` when nothing did, so under `KP_FLEET_SILENT=1` it
 * still holds four keys and four market ids. Every later assertion for a desk is AND-ed with that desk's premise,
 * so with no engine (no house position) every one of them is red with the premise named in its detail: settling
 * a market that holds no house money measures nothing about the fleet, and is reported as measuring nothing.
 * The literals are the mutation detectors; M.15 names the figure each wrong fee model would have paid instead.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "M";

/** M designates NO desk of its own: its subject is what lanes A and B placed, and every category is another lane's. */
export const roster: readonly FleetBot[] = [];

/**
 * THE MONEY LITERALS, each beside its derivation. ⛔ Read the arithmetic before changing a number.
 *
 * Rates the world runs under — asserted as a FIXTURE premise (M.0r) from each market's own frozen snapshot,
 * because a seeded config that differs would make every figure below wrong, and it must say so first:
 *   feeModel loser-share · platformFeeRate 0.03 + operatorFeeRate 0.10 = 0.13 of the LOSING pool (outcome-dependent)
 *   TRA 0.10 and GBT 0.05 of the fee, each `Math.round`ed — ties go UP · operatorNet = fee − tra − gbt
 * Settlement (`settleMarket`): netPool = gross − fee · winners share netPool by stake, largest remainder, Σ = floor(netPool)
 * exactly · the fee, then TRA and GBT, are split across winners the same way · a loser's position is LOSS with
 * finalPayout 0 and NO settlement transaction · VOID refunds every stake in full at 0% fee.
 * Ledger (`settlementPayoutEntries`): POOL −(payout + feeShare) · PLAYER +payout · COMMISSION +feeShare −tra −gbt · TRA +tra · GBT +gbt.
 * Book (`foldDayBook`): realisedLoss = settledStake − returned, where returned = Σ marked CONFIRMED BET_PAYOUT|BET_REFUND|CASHOUT
 * (⛔ not net: BET_PLACED is excluded by construction) · projected = realised + open. Negative = profit, never clamped.
 */
export const expect = {
  "M-RATES": { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 },

  /**
   * M-A1-WIN · lane A1's market, resolved YES — the house WINS as the only YES.
   *   pools    YES 32,000 (house) · NO 60,000 (seed 20,000 + trigger 40,000) · gross 92,000
   *   fee      = 0.13 × losing NO 60,000                        = 7,800
   *   netPool  = 92,000 − 7,800                                = 84,200
   *   payout   = floor(32,000 / 32,000 × 84,200)               = 84,200   (one winner: floor(netPool), remainder 0)
   *   levies   tra = round(7,800 × 0.10) = 780 · gbt = round(7,800 × 0.05) = 390 · operatorNet = 7,800 − 780 − 390 = 6,630
   *   ledger   settle_<txn>: POOL −(84,200 + 7,800) = −92,000 · PLAYER:holder +84,200 · COMMISSION +7,800 −780 −390 · TRA +780 · GBT +390
   *            → POOL:<A1> = 32,000 + 60,000 − 92,000 = 0 · COMMISSION 6,630 · TRA 780 · GBT 390 · Σ = 7,800 = fee
   *   holder   5,000,000 − 32,000 = 4,968,000 before · + 84,200 = 5,052,200 after
   *   players  seed NO 20,000 → LOSS, wallet 980,000 · trigger NO 40,000 → LOSS, wallet 960,000 · Σ paid to players 0
   *   book     bets 1 · staked 32,000 · open 0 · settled 32,000 · returned 84,200 · realisedLoss 32,000 − 84,200 = −52,200 · projected −52,200
   *   ⭐ the runs that make the payout red (M.15): fee 0 → 92,000 · fee on the WINNING pool (0.13 × 32,000 = 4,160) → 87,840
   *      · fee on the WHOLE pool (0.13 × 92,000 = 11,960) → 80,040 · legacy capped-commission min(0.10 × 92,000 = 9,200, ⅓ × 32,000) = 9,200 → 82,800
   */
  "M-A1-WIN": {
    key: "A1-PCT", outcome: "YES", side: "YES", stake: 32_000, pools: { yes: 32_000, no: 60_000 }, gross: 92_000,
    fee: 7_800, netPool: 84_200, tra: 780, gbt: 390, operatorNet: 6_630,
    status: "WIN", payout: 84_200, holderBefore: 4_968_000, holderAfter: 5_052_200,
    winnersPaid: 84_200, positionsSettled: 3, playersPaid: 0,
    players: [{ stake: 20_000, status: "LOSS", payout: 0, wallet: 980_000 }, { stake: 40_000, status: "LOSS", payout: 0, wallet: 960_000 }],
    book: { bets: 1, staked: 32_000, open: 0, settled: 32_000, returned: 84_200, realisedLoss: -52_200, projected: -52_200 },
    wrongModels: { feeZero: 92_000, feeOnWinningPool: 87_840, feeOnWholePool: 80_040, legacyCapped: 82_800 },
  },

  /**
   * M-B2-WIN · lane B2's market, resolved YES — the house WINS as the only YES, on the biggest losing pool.
   *   pools    YES 25,000 (house) · NO 155,000 (seed 5,000 + trigger 150,000) · gross 180,000
   *   fee      = 0.13 × 155,000                                = 20,150
   *   netPool  = 180,000 − 20,150                              = 159,850
   *   payout   = floor(25,000 / 25,000 × 159,850)              = 159,850
   *   levies   tra = round(2,015) = 2,015 · gbt = round(1,007.5) = 1,008 ⭐ a TIE, and `Math.round` breaks it UP — floor or
   *            round-half-even would book 1,007 · operatorNet = 20,150 − 2,015 − 1,008 = 17,127
   *   ledger   POOL −(159,850 + 20,150) = −180,000 → POOL:<B2> = 0 · COMMISSION 17,127 · TRA 2,015 · GBT 1,008 · Σ 20,150 = fee
   *   holder   5,000,000 − 25,000 = 4,975,000 before · + 159,850 = 5,134,850 after
   *   players  seed NO 5,000 → LOSS, 995,000 · trigger NO 150,000 → LOSS, 850,000 · Σ paid to players 0
   *   book     bets 1 · staked 25,000 · open 0 · settled 25,000 · returned 159,850 · realisedLoss −134,850 · projected −134,850
   *   ⭐ wrong models: fee 0 → 180,000 · on the winning pool (0.13 × 25,000 = 3,250) → 176,750
   *      · on the whole pool (0.13 × 180,000 = 23,400) → 156,600 · legacy capped min(18,000, ⅓ × 25,000 = 8,333.33) → floor(171,666.67) = 171,666
   */
  "M-B2-WIN": {
    key: "B2-CAPPED", outcome: "YES", side: "YES", stake: 25_000, pools: { yes: 25_000, no: 155_000 }, gross: 180_000,
    fee: 20_150, netPool: 159_850, tra: 2_015, gbt: 1_008, operatorNet: 17_127,
    status: "WIN", payout: 159_850, holderBefore: 4_975_000, holderAfter: 5_134_850,
    winnersPaid: 159_850, positionsSettled: 3, playersPaid: 0,
    players: [{ stake: 5_000, status: "LOSS", payout: 0, wallet: 995_000 }, { stake: 150_000, status: "LOSS", payout: 0, wallet: 850_000 }],
    book: { bets: 1, staked: 25_000, open: 0, settled: 25_000, returned: 159_850, realisedLoss: -134_850, projected: -134_850 },
    wrongModels: { feeZero: 180_000, feeOnWinningPool: 176_750, feeOnWholePool: 156_600, legacyCapped: 171_666 },
  },

  /**
   * M-B1-LOSS · lane B1's market, resolved NO — the house LOSES; the two players split the pot.
   *   pools    YES 7,000 (house) · NO 45,000 (seed 5,000 + trigger 40,000) · gross 52,000
   *   fee      = 0.13 × losing YES 7,000                        = 910
   *   netPool  = 52,000 − 910                                  = 51,090
   *   payouts  seed    5,000 / 45,000 × 51,090 = 5,676.67 → 5,676, +1 (largest remainder .67)  = 5,677
   *            trigger 40,000 / 45,000 × 51,090 = 45,413.33 → 45,413                            = 45,413   · Σ 51,090 = netPool, no dust
   *   fee split  seed 101.11 → 101 · trigger 808.89 → 808 +1 = 809 · Σ 910
   *   levies   levySplit(910): tra = round(91) = 91 · gbt = round(45.5) = 46 (tie, UP) · operatorNet = 910 − 91 − 46 = 773
   *            tra by winner over fee shares (101, 809 of 910), total 91: 10.1 → 10 · 80.9 → 80 +1 = 81 · Σ 91
   *            gbt total 46: 5.105 → 5 · 40.895 → 40 +1 = 41 · Σ 46
   *   ledger   two settle_ groups: POOL −(5,677 + 101) −(45,413 + 809) = −52,000 → POOL:<B1> = 0
   *            COMMISSION (101 − 10 − 5) + (809 − 81 − 41) = 86 + 687 = 773 · TRA 91 · GBT 46 · Σ 910 = fee
   *   house    LOSS · finalPayout 0 · NO settlement transaction — the ONLY money row is the BET_PLACED −7,000
   *   holder   5,000,000 − 7,000 = 4,993,000 before AND after (a loser's money left at placement)
   *   players  seed → WIN 5,677, wallet 1,000,000 − 5,000 + 5,677 = 1,000,677 · trigger → WIN 45,413, wallet 1,000,000 − 40,000 + 45,413 = 1,005,413
   *   book     bets 1 · staked 7,000 · open 0 · settled 7,000 · returned 0 · realisedLoss +7,000 · projected +7,000
   *   ⚠️ with TWO winners whose fractions sum to 1, largest remainder and independent `Math.round` coincide (5,677 / 45,413 either
   *      way) — this desk does NOT discriminate the allocator; it discriminates the fee, the losing pool it is taken from, the
   *      LOSS shape (no txn, wallet unmoved, realisedLoss POSITIVE) and the levy columns.
   */
  "M-B1-LOSS": {
    key: "B1-FIXED", outcome: "NO", side: "YES", stake: 7_000, pools: { yes: 7_000, no: 45_000 }, gross: 52_000,
    fee: 910, netPool: 51_090, tra: 91, gbt: 46, operatorNet: 773,
    status: "LOSS", payout: 0, holderBefore: 4_993_000, holderAfter: 4_993_000,
    winnersPaid: 51_090, positionsSettled: 3, playersPaid: 51_090,
    players: [{ stake: 5_000, status: "WIN", payout: 5_677, wallet: 1_000_677 }, { stake: 40_000, status: "WIN", payout: 45_413, wallet: 1_005_413 }],
    book: { bets: 1, staked: 7_000, open: 0, settled: 7_000, returned: 0, realisedLoss: 7_000, projected: 7_000 },
  },

  /**
   * M-A2-VOID · lane A2's market, resolved VOID — the fourth shape, and the one desk whose stake is not a literal.
   *   A2's stake `j` is jittered inside [36,000, 44,000] (lane A asserts the interval); it is read off the durable row and used
   *   ONLY where the identity is refund = stake. Everything else here is a literal: the players' 20,000 and 50,000 come back in
   *   full, the holder's wallet returns to EXACTLY 5,000,000, no fee, no levy, POOL:<A2> = j + 70,000 before and 0 after.
   *   house    VOID · finalPayout j · BET_REFUND +j carrying the marker · realisedLoss j − j = 0 with bets 1 (⛔ never 0 − 0)
   */
  "M-A2-VOID": {
    key: "A2-JITTER", outcome: "VOID", side: "YES", stake: null, stakeLo: 36_000, stakeHi: 44_000, pools: { yes: null, no: 70_000 }, gross: null,
    fee: 0, netPool: null, tra: 0, gbt: 0, operatorNet: 0,
    status: "VOID", payout: null, holderBefore: null, holderAfter: 5_000_000,
    winnersPaid: 0, positionsSettled: 3, playersPaid: 70_000,
    players: [{ stake: 20_000, status: "VOID", payout: 20_000, wallet: 1_000_000 }, { stake: 50_000, status: "VOID", payout: 50_000, wallet: 1_000_000 }],
    book: { bets: 1, staked: null, open: 0, settled: null, returned: null, realisedLoss: 0, projected: 0 },
  },

  /**
   * M-FLEET · the fleet's P&L: the FOUR desks' own rows of `houseDayBooks(day)` summed, each on its own EAT day of
   *   placement — never `houseDayBook(day, null)`, which also carries every OTHER lane's stake of that day (M.17n
   *   asserts that reader as the sum of every row it returns; M.18 asserts `houseOpenExposure(null)` against the
   *   other desks' OPEN rows read by hand).
   *   bets 4 · staked 32,000 + 25,000 + 7,000 + j = 64,000 + j · returned 84,200 + 159,850 + 0 + j = 244,050 + j
   *   realisedLoss = (64,000 + j) − (244,050 + j) = −180,050 ⭐ a LITERAL: the jittered stake cancels.
   *   fees booked over the four markets: 7,800 + 20,150 + 910 + 0 = 28,860 = COMMISSION 24,530 + TRA 2,886 + GBT 1,444
   */
  "M-FLEET": { bets: 4, realisedLoss: -180_050, stakedLessJ: 64_000, returnedLessJ: 244_050, feeTotal: 28_860, commissionTotal: 24_530, traTotal: 2_886, gbtTotal: 1_444 },
} as const;

/** The order the markets are settled in: both WINs, then the LOSS, then the VOID. */
const PLAN = ["M-A1-WIN", "M-B2-WIN", "M-B1-LOSS", "M-A2-VOID"] as const;

export async function run(env: Any, prior: Any): Promise<Any> {
  const { ok, section, until, j, w, S, fleet, EXPECT, FLEET, OFFICER, passes, calls, laneWanted } = env;
  if (!laneWanted("M")) return null;

  section("lane M · MONEY — trial balance, settlement and the fleet's P&L over what lanes A and B placed");
  /* ⛔ Alerts are counted from THIS lane's start. `seen()` counts every lane's, and under the full lane set lane G's
     G5 pauses a desk ON PURPOSE (one botStopped · RULES_INVALID) — measured: M.19 red for that alone in a full run
     with everything else in it green. A stop or a switch-off DURING lane M is still a red here. */
  const callsStart: number = calls.length;
  const inWindow = (fn: string): number => calls.slice(callsStart).filter((c: Any) => c.fn === fn).length;

  /* ═══ THE TWO SUBJECTS (see the header) — loaded to be MEASURED, never consulted for an expectation ═══════ */
  const LEDGER: Any = await import("../../src/lib/server/ledger.ts");
  const BOOK: Any = await import("../../src/lib/server/house-bot/book.ts");
  const pc: Any = w.onPostgres ? w.prisma?.() : null;
  if (!pc) { console.log("   lane M needs the Postgres world (raw ledger reads) — NOT MEASURED"); return null; }

  /** EAT is UTC+3 with no DST (`src/lib/eat-day.ts`) — a fixture clock, not the arithmetic under test. */
  const eatDay = (ms: number): string => new Date(ms + 3 * 3_600_000).toISOString().slice(0, 10);

  /** The per-market ledger columns, exactly as money-cases 5.3c reads them — the check the trial balance cannot make. */
  const ledgerOf = async (marketId: string, holderId: string): Promise<Any> => {
    const rows: Any[] = await pc.$queryRawUnsafe(
      `SELECT coalesce(sum("amount") FILTER (WHERE "account" = $1), 0)::text AS "pool",`
      + ` coalesce(sum("amount") FILTER (WHERE "account" = 'HOUSE:COMMISSION'), 0)::text AS "commission",`
      + ` coalesce(sum("amount") FILTER (WHERE "account" = 'HOUSE:TRA_LEVY'), 0)::text AS "tra",`
      + ` coalesce(sum("amount") FILTER (WHERE "account" = 'HOUSE:GBT_LEVY'), 0)::text AS "gbt",`
      + ` coalesce(sum("amount") FILTER (WHERE "account" = $3 AND "entryType"::text IN ('PAYOUT_CREDIT', 'REFUND')), 0)::text AS "holderReturn",`
      + ` count(*) FILTER (WHERE "account" = $3 AND "entryType"::text IN ('PAYOUT_CREDIT', 'REFUND'))::int AS "holderReturnRows"`
      + ` FROM "LedgerEntry" WHERE "marketId" = $2`, `POOL:${marketId}`, marketId, `PLAYER:${holderId}`);
    const r = rows[0] ?? {};
    return { pool: Number(r.pool), commission: Number(r.commission), tra: Number(r.tra), gbt: Number(r.gbt), holderReturn: Number(r.holderReturn), holderReturnRows: Number(r.holderReturnRows) };
  };
  /** The stake group a house placement posts under its BET_PLACED txn: POOL +stake, PLAYER:holder −stake. */
  const stakeGroupOf = async (txnId: string, marketId: string, holderId: string): Promise<Any> => {
    const rows: Any[] = await pc.$queryRawUnsafe(
      `SELECT coalesce(sum("amount") FILTER (WHERE "account" = $2), 0)::text AS "pool",`
      + ` coalesce(sum("amount") FILTER (WHERE "account" = $3), 0)::text AS "holder", count(*)::int AS "rows"`
      + ` FROM "LedgerEntry" WHERE "txnId" = $1`, txnId, `POOL:${marketId}`, `PLAYER:${holderId}`);
    const r = rows[0] ?? {};
    return { pool: Number(r.pool), holder: Number(r.holder), rows: Number(r.rows) };
  };
  const balOf = async (userId: string | null | undefined): Promise<number | null> =>
    userId ? ((await w.bal(userId))?.balance ?? null) : null;

  /* ═══ THE PREMISES — read off the durable rows; `prior.placed` only says WHICH market to look at ═════════ */
  const placed: Any[] = Array.isArray(prior?.placed) ? prior.placed : [];
  const P: Record<string, boolean> = {};
  const why: Record<string, string> = {};
  /** Every desk-scoped assertion is AND-ed with its desk's premise, and says so when the premise failed. */
  const okP = (expKey: string, name: string, pass: boolean, detail: Any = ""): void =>
    ok(name, P[expKey] === true && pass, P[expKey] ? detail : j({ PREMISE_FAILED: why[expKey], detail }));

  const desks: Any[] = [];
  for (const expKey of PLAN) {
    const exp: Any = EXPECT[expKey];
    const rec = placed.find((p) => p?.key === exp.key) ?? null;
    const bot = fleet[exp.key] ?? null;
    const marketId: string | null = rec?.market ?? null;
    const m: Any = marketId ? await w.svc.getMarket(marketId) : null;
    const all: Any[] = marketId ? await w.positionsOf(marketId) : [];
    const house = all.filter((p) => p.houseBotId != null);
    const mine = house.filter((p) => p.houseBotId === bot?.botId);
    const pos = mine.length === 1 ? mine[0] : null;
    const stakeOk = !!pos && (exp.stake != null ? pos.stake === exp.stake : pos.stake >= exp.stakeLo && pos.stake <= exp.stakeHi);
    const yesExpected = exp.pools.yes ?? pos?.stake ?? NaN;
    const poolsOk = !!m && m.yesPool === yesExpected && m.noPool === exp.pools.no;
    const players = all.filter((p) => p.houseBotId == null);
    const playersOk = players.length === exp.players.length
      && exp.players.every((pe: Any) => players.filter((p) => p.stake === pe.stake && p.side === "NO" && p.status === "OPEN").length === 1);
    const premise = !!bot && !!m && !!pos && house.length === 1 && pos.status === "OPEN" && pos.side === exp.side && stakeOk && poolsOk && playersOk
      && m.settledAt == null && m.resolvedOutcome == null;
    P[expKey] = premise;
    why[expKey] = premise ? "" : `no OPEN marked position of the expected stake on ${exp.key}'s market with the expected pools — nothing here measures the fleet`;
    const stakeWord = exp.stake != null ? String(exp.stake) : `[${exp.stakeLo}, ${exp.stakeHi}]`;
    ok(`M.0 · ${exp.key} · PREMISE · exactly one OPEN marked position, ${stakeWord} on ${exp.side}, pools YES ${exp.pools.yes ?? "= its stake"} / NO ${exp.pools.no}, two OPEN player NOs — read off the durable rows, not off prior.placed`,
      premise, j({ market: marketId, marked: house.length, status: pos?.status, side: pos?.side, stake: pos?.stake, yesPool: m?.yesPool, noPool: m?.noPool, players: players.map((p) => `${p.side} ${p.stake} ${p.status}`) }));
    desks.push({ expKey, exp, bot, marketId, m, pos, players, stake: pos?.stake ?? null });
  }
  const allPremises = desks.length === PLAN.length && desks.every((d) => P[d.expKey]);
  if (!desks.some((d) => d.marketId)) {
    console.log("   lane M · no market from lanes A/B to settle — run with --only A,B,M");
    return { placed: [], lane: "M", measured: false };
  }

  {
    /* The FIXTURE premise: the rates every literal was derived from are the rates each market froze. */
    const R: Any = EXPECT["M-RATES"];
    const got = desks.map((d) => (d.m ? w.svc.ratesFor(d.m) : null));
    const same = got.every((r) => !!r && r.feeModel === R.feeModel && r.platformFeeRate === R.platformFeeRate && r.operatorFeeRate === R.operatorFeeRate
      && r.traTaxOnCommissionRate === R.traTaxOnCommissionRate && r.gbtLevyOnCommissionRate === R.gbtLevyOnCommissionRate);
    ok("M.0r · FIXTURE · every fleet market FROZE the rates the literals were derived from (loser-share 0.03 + 0.10 · TRA 0.10 · GBT 0.05) — a seeded config that differs makes every fee literal below wrong, and says so here first",
      allPremises && same, j({ got: got.map((r) => r && { feeModel: r.feeModel, platform: r.platformFeeRate, operator: r.operatorFeeRate, tra: r.traTaxOnCommissionRate, gbt: r.gbtLevyOnCommissionRate }), expected: R }));
  }

  /* ═══ BEFORE SETTLEMENT — wallet, stake group, POOL residual, book ═════════════════════════════════════ */
  for (const d of desks) {
    const { expKey, exp, bot, marketId, pos } = d;
    d.before = await balOf(bot?.userId);
    const holderBefore = exp.holderBefore ?? (typeof d.stake === "number" ? FLEET.holderBalance - d.stake : NaN);
    okP(expKey, `M.1 · ${exp.key} · the holder's wallet before settlement is exactly ${exp.holderBefore ?? "5,000,000 − its stake"} (5,000,000 − stake)`,
      d.before === holderBefore, j({ before: d.before, expected: holderBefore }));

    const txns0: Any[] = pos ? await w.txnsFor(pos.id) : [];
    const bet = txns0.find((t) => t.type === "BET_PLACED") ?? null;
    const grp = bet && marketId && bot ? await stakeGroupOf(bet.id, marketId, bot.userId) : null;
    okP(expKey, `M.2 · ${exp.key} · the stake is in the LEDGER as an UNMARKED pair under its BET_PLACED txn — POOL +stake, PLAYER:holder −stake, 2 rows; the marker stops at the Transaction (LedgerEntry has no houseBotId), which is the blindness M.5 and M.20 inherit`,
      txns0.length === 1 && bet?.status === "CONFIRMED" && bet?.amount === -d.stake && bet?.houseBotId === bot?.botId && grp?.rows === 2 && grp?.pool === d.stake && grp?.holder === -d.stake,
      j({ txns: txns0.length, bet: bet && { amount: bet.amount, status: bet.status, marked: bet.houseBotId === bot?.botId }, group: grp }));

    const gross = exp.gross ?? (typeof d.stake === "number" ? d.stake + exp.pools.no : NaN);
    const led0 = marketId && bot ? await ledgerOf(marketId, bot.userId) : null;
    okP(expKey, `M.3 · ${exp.key} · before settlement Σ POOL:<market> = yesPool + noPool = ${exp.gross ?? "its stake + 70,000"}, and no COMMISSION/TRA/GBT yet — the per-account residual trialBalance() cannot see, at a gross a dead engine cannot supply`,
      !!led0 && !!d.m && led0.pool === d.m.yesPool + d.m.noPool && led0.pool === gross && led0.commission === 0 && led0.tra === 0 && led0.gbt === 0 && led0.holderReturnRows === 0,
      j({ ledger: led0, yes: d.m?.yesPool, no: d.m?.noPool, gross }));

    /**
     * Each desk keeps ITS OWN EAT day of placement: four placements minutes apart can straddle 21:00 UTC.
     *
     * ⚠️ **M10 DID NOT REPRODUCE, and the note is kept so nobody re-opens it** (register E, 2026-09-23). It was
     * recorded as "`dayKey` goes null when placements straddle 21:00 UTC", which fuses two adjacent and
     * unrelated things: the sentence above, and the `: null` on the line below.
     * · A STRADDLE NEVER PRODUCES A NULL. `eatDay` is total — it returns a `YYYY-MM-DD` for every finite input.
     *   EAT midnight IS 21:00 UTC, and straddling it makes `days` (below) hold TWO day strings instead of one,
     *   which is exactly what the per-desk key, `booksByDay` and the per-day loop are built for.
     * · THE `: null` IS A MISSING-`placedAt` GUARD, and it is unreachable on any run whose premises hold:
     *   `pos` is `null` only when this desk has no single marked OPEN position, which is the M.0 premise — so
     *   `P[expKey]` is false, every `okP` on the desk is RED (`okP` AND-s the premise; it does not skip), and
     *   `allPremises` reddens M.5, M.17, M.17n, M.17b and M.18-M.20 besides. `Position.placedAt` is
     *   non-nullable with a default, so the other route does not exist.
     * · The guard still EARNS its place: `houseDayBook` throws on a malformed day key, so this stops a crash,
     *   not a false green.
     */
    d.dayKey = pos?.placedAt ? eatDay(Date.parse(pos.placedAt)) : null;
    const b0 = d.dayKey && bot ? await BOOK.houseDayBook(d.dayKey, bot.botId) : null;
    const x0 = bot ? await BOOK.houseOpenExposure(bot.botId) : null;
    okP(expKey, `M.4 · ${exp.key} · the day book BEFORE settlement (EAT day of placedAt): bets 1 · staked = open = projected = the stake · settled 0 · returned 0 · realisedLoss 0 — and open exposure = the stake`,
      !!b0 && b0.bets === 1 && b0.stakedTzs === d.stake && b0.openStakeTzs === d.stake && b0.settledStakeTzs === 0 && b0.returnedTzs === 0 && b0.realisedLossTzs === 0 && b0.projectedLossTzs === d.stake && x0 === d.stake,
      j({ dayKey: d.dayKey, book: b0, exposure: x0 }));
  }

  const walletFloor = 3 * desks.length; // one holder and two players per planned desk
  const tb0: Any = await LEDGER.trialBalance();
  ok(`M.5 · trialBalance() BEFORE settlement ties (ok · global Σ 0 · no imbalanced group) over ≥ ${walletFloor} wallets — over a ledger M.2 proved holds every fleet stake; on its own it is ok:true on an empty database, so the premises are part of this verdict`,
    allPremises && tb0?.ok === true && tb0?.globalBalanced === true && tb0?.imbalancedGroups?.length === 0 && tb0?.checkedWallets >= walletFloor,
    j({ ok: tb0?.ok, wallets: tb0?.checkedWallets, globalSum: tb0?.globalSum, drifting: tb0?.driftingWallets, worst: tb0?.worst, premises: allPremises }));

  /* ═══ SETTLEMENT — through the real services, with the two controls that prove what moved the money ═══ */
  for (const d of desks) {
    const { expKey, exp, bot, marketId } = d;
    if (!marketId) {
      for (const n of ["M.6", "M.7", "M.8", "M.9"]) okP(expKey, `${n} · ${exp.key} · no market to settle`, false, "");
      continue;
    }
    const sealed = exp.outcome === "VOID" ? "VOIDED" : "RESOLVED";
    const res = await w.svc.resolveMarket({ marketId, outcome: exp.outcome, officerId: OFFICER });
    const mr: Any = await w.svc.getMarket(marketId);
    const balR = await balOf(bot?.userId);
    okP(expKey, `M.6 · ${exp.key} · resolveMarket(${exp.outcome}) seals in one call (single-admin): status ${sealed}, outcome recorded, settledAt still null, and NO money moved — the holder's wallet is unchanged`,
      res?.ok === true && res?.data?.stage === "complete" && mr?.status === sealed && mr?.resolvedOutcome === exp.outcome && mr?.settledAt == null && balR === d.before,
      j({ res, status: mr?.status, outcome: mr?.resolvedOutcome, settledAt: mr?.settledAt, holder: balR }));

    const st0 = await w.svc.settleMarket(marketId, {});
    const m0: Any = await w.svc.getMarket(marketId);
    const bal0 = await balOf(bot?.userId);
    okP(expKey, `M.7 · ${exp.key} · CONTROL · settleMarket WITHOUT force refuses TOO_EARLY (objection window 1 h) and moves nothing — so force, below, is what moves the money`,
      st0?.ok === false && st0?.code === "TOO_EARLY" && m0?.settledAt == null && bal0 === d.before, j({ st0, settledAt: m0?.settledAt, holder: bal0 }));

    const st = await w.svc.settleMarket(marketId, { force: true });
    const m1: Any = await w.svc.getMarket(marketId);
    d.m1 = m1;
    d.st = st;
    d.after = await balOf(bot?.userId);
    okP(expKey, `M.8 · ${exp.key} · settleMarket({ force: true }) commits: ok, settledAt stamped, status ${sealed}, outcome ${exp.outcome} (the totals it REPORTS are M.8r, at the end)`,
      st?.ok === true && !!m1?.settledAt && m1?.resolvedOutcome === exp.outcome && m1?.status === sealed,
      j({ st, settledAt: m1?.settledAt, status: m1?.status }));

    const st2 = await w.svc.settleMarket(marketId, { force: true });
    const after2 = await balOf(bot?.userId);
    okP(expKey, `M.9 · ${exp.key} · CONTROL · a second forced settle is refused ("already settled") and pays nobody twice — the holder's wallet does not move`,
      st2?.ok === false && /already settled/i.test(String(st2?.error ?? "")) && typeof d.after === "number" && after2 === d.after, j({ st2, after: d.after, after2 }));
  }

  /* ═══ AFTER SETTLEMENT — position, money rows, wallets, players, ledger columns ═════════════════════════ */
  for (const d of desks) {
    const { expKey, exp, bot, marketId, pos } = d;
    const all1: Any[] = marketId ? await w.positionsOf(marketId) : [];
    const p1 = pos ? all1.find((p) => p.id === pos.id) ?? null : null;
    const payout: number | null = exp.payout ?? (exp.status === "VOID" ? d.stake : null);
    const payoutWord = exp.payout ?? (exp.status === "VOID" ? "its stake (a VOID refund)" : "?");
    okP(expKey, `M.10 · ${exp.key} · the house position is ${exp.status} with finalPayout ${payoutWord}, settledAt stamped, and its marker survived settlement's full-row write`,
      !!p1 && p1.status === exp.status && p1.finalPayout === payout && !!p1.settledAt && p1.houseBotId === bot?.botId,
      j({ status: p1?.status, finalPayout: p1?.finalPayout, settledAt: p1?.settledAt, marked: p1?.houseBotId === bot?.botId, expected: { status: exp.status, payout } }));

    const txns: Any[] = pos ? await w.txnsFor(pos.id) : [];
    const settleTxn = txns.find((t) => t.type === "BET_PAYOUT" || t.type === "BET_REFUND") ?? null;
    const wantType = exp.status === "WIN" ? "BET_PAYOUT" : exp.status === "VOID" ? "BET_REFUND" : null;
    const rows = txns.map((t) => ({ type: t.type, amount: t.amount, status: t.status, marked: t.houseBotId === bot?.botId, balanceAfter: t.balanceAfter }));
    if (wantType) {
      okP(expKey, `M.11 · ${exp.key} · exactly TWO money rows — BET_PLACED −stake and ${wantType} +${payoutWord}, both CONFIRMED, both carrying the marker (D20), the ${wantType}'s balanceAfter = ${exp.holderAfter}`,
        txns.length === 2 && settleTxn?.type === wantType && settleTxn?.amount === payout && settleTxn?.status === "CONFIRMED" && settleTxn?.houseBotId === bot?.botId
          && settleTxn?.balanceAfter === exp.holderAfter && txns.every((t) => t.houseBotId === bot?.botId),
        j({ n: txns.length, rows }));
    } else {
      okP(expKey, `M.11 · ${exp.key} · exactly ONE money row — the BET_PLACED −${exp.stake} and nothing else: a loser writes no settlement txn (the WIN and VOID desks show the row that appears when one is due), so the COUNT is asserted, never an absence`,
        txns.length === 1 && txns[0]?.type === "BET_PLACED" && txns[0]?.amount === -d.stake && txns[0]?.houseBotId === bot?.botId && !settleTxn,
        j({ n: txns.length, rows }));
    }

    okP(expKey, `M.12 · ${exp.key} · the holder's wallet is exactly ${exp.holderAfter} — moved by exactly ${payoutWord} from ${exp.holderBefore ?? "5,000,000 − its stake"}`,
      d.after === exp.holderAfter && typeof d.before === "number" && typeof payout === "number" && d.after - d.before === payout,
      j({ before: d.before, after: d.after, delta: typeof d.after === "number" && typeof d.before === "number" ? d.after - d.before : null, payout }));

    /* D20: the house is a normal player in every report — and the players on the other side are settled as players. */
    const pl = exp.players.map((pe: Any) => ({ pe, p: all1.find((x) => x.houseBotId == null && x.stake === pe.stake) ?? null }));
    const wallets = await Promise.all(pl.map(async ({ p }: Any) => balOf(p?.userId)));
    const playersPaid = pl.reduce((s: number, { p }: Any) => s + (p?.status === "WIN" || p?.status === "VOID" ? (p?.finalPayout ?? 0) : 0), 0);
    okP(expKey, `M.13 · ${exp.key} · the two players are settled as players: ${exp.players.map((pe: Any) => `NO ${pe.stake} → ${pe.status} ${pe.payout}, wallet ${pe.wallet}`).join(" · ")} — Σ paid to players ${exp.playersPaid}${exp.status === "LOSS" ? " = netPool exactly, no dust" : ""}`,
      pl.every(({ pe, p }: Any, i: number) => !!p && p.status === pe.status && p.finalPayout === pe.payout && wallets[i] === pe.wallet && !p.houseBotId) && playersPaid === exp.playersPaid,
      j({ players: pl.map(({ pe, p }: Any, i: number) => ({ stake: pe.stake, status: p?.status, finalPayout: p?.finalPayout, wallet: wallets[i] })), playersPaid }));

    const led1 = marketId && bot ? await ledgerOf(marketId, bot.userId) : null;
    d.led1 = led1;
    okP(expKey, `M.14a · ${exp.key} · after settlement Σ POOL:<market> = 0 and COMMISSION + TRA + GBT = fee ${exp.fee} — the per-market identity the trial balance cannot make; the holder's PLAYER account received exactly ${payoutWord} in ${typeof payout === "number" && payout > 0 ? 1 : 0} ${exp.status === "VOID" ? "REFUND" : "PAYOUT_CREDIT"} row(s)`,
      !!led1 && led1.pool === 0 && led1.commission + led1.tra + led1.gbt === exp.fee && led1.holderReturn === payout && led1.holderReturnRows === (typeof payout === "number" && payout > 0 ? 1 : 0),
      j({ ledger: led1, fee: exp.fee, payout }));
    okP(expKey, `M.14b · ${exp.key} · the levy COLUMNS, each on its own: HOUSE:COMMISSION ${exp.operatorNet} · HOUSE:TRA_LEVY ${exp.tra} · HOUSE:GBT_LEVY ${exp.gbt} — a levy group sums to zero even when the levy is wrong, so M.14a's sum is not this check`,
      !!led1 && led1.commission === exp.operatorNet && led1.tra === exp.tra && led1.gbt === exp.gbt,
      j({ got: led1 && { commission: led1.commission, tra: led1.tra, gbt: led1.gbt }, expected: { commission: exp.operatorNet, tra: exp.tra, gbt: exp.gbt } }));

    if (exp.wrongModels) {
      const wm: Any = exp.wrongModels;
      const wrong = [wm.feeZero, wm.feeOnWinningPool, wm.feeOnWholePool, wm.legacyCapped];
      okP(expKey, `M.15 · ${exp.key} · CONTROL · the payout ${exp.payout} is NONE of the figures a wrong fee model pays — fee 0 → ${wm.feeZero} · fee on the winning pool → ${wm.feeOnWinningPool} · fee on the whole pool → ${wm.feeOnWholePool} · legacy capped → ${wm.legacyCapped}: these are the runs that make M.10–M.14 red`,
        typeof p1?.finalPayout === "number" && p1.finalPayout === exp.payout && !wrong.includes(p1.finalPayout) && new Set([exp.payout, ...wrong]).size === 5,
        j({ paid: p1?.finalPayout, wrong: wm }));
    }
  }

  /* ═══ THE FLEET'S P&L — book.ts over the EAT day(s) of placement ════════════════════════════════════════
     ⛔ NOT PINNED TO A LANE SET, AND NOT TO ONE DAY. `houseDayBook(day, null)` and `houseOpenExposure(null)` sum
     EVERY marked position of the day / every OPEN marked position, whichever lane placed it (book.ts:96-104;
     dal:4256-4283). Under any lane set that places and never settles — C1 fires 40,000 in lane C, D/E/F/G all
     place — those readers carry the other lanes' money too (measured with --only A,B,C,M: bets 5, openStake
     40,000, exposure 40,000 — a fixture red, not a product one). So the fleet LITERAL is asserted over THESE FOUR
     desks' rows of `houseDayBooks(day)`, on each desk's own EAT day (four placements minutes apart can straddle
     21:00 UTC), the null reader is asserted as the sum of every row it returns for that day (M.17n), and the
     fleet's open exposure is asserted against the OTHER desks' OPEN rows read by hand (M.18). */
  for (const d of desks) {
    const { expKey, exp, bot } = d;
    const B: Any = exp.book;
    const want = { bets: B.bets, staked: B.staked ?? d.stake, open: B.open, settled: B.settled ?? d.stake, returned: B.returned ?? d.stake, realisedLoss: B.realisedLoss, projected: B.projected };
    const b1 = d.dayKey && bot ? await BOOK.houseDayBook(d.dayKey, bot.botId) : null;
    okP(expKey, `M.16 · ${exp.key} · houseDayBook(its own EAT day of placement, desk) = { bets 1 · staked ${want.staked ?? "j"} · open 0 · settled ${want.settled ?? "j"} · returned ${want.returned ?? "j"} · realisedLoss ${want.realisedLoss} · projected ${want.projected} } — settledStake − returned, NEGATIVE is profit, never clamped`,
      !!b1 && typeof want.staked === "number" && b1.bets === want.bets && b1.stakedTzs === want.staked && b1.openStakeTzs === want.open && b1.settledStakeTzs === want.settled
        && b1.returnedTzs === want.returned && b1.realisedLossTzs === want.realisedLoss && b1.projectedLossTzs === want.projected,
      j({ dayKey: d.dayKey, book: b1, want }));
  }
  {
    const F: Any = EXPECT["M-FLEET"];
    const jStake: number = desks.find((d) => d.expKey === "M-A2-VOID")?.stake ?? NaN;
    const days = [...new Set(desks.map((d) => d.dayKey).filter(Boolean))] as string[];
    const booksByDay = new Map<string, Map<string, Any>>();
    for (const day of days) booksByDay.set(day, await BOOK.houseDayBooks(day));
    /* The four desks' own rows, each off the day it placed on — a per-desk figure summed, never a per-day one. */
    const mine: Any[] = desks.map((d) => (d.dayKey && d.bot ? booksByDay.get(d.dayKey)?.get(d.bot.botId) ?? null : null));
    const sumOf = (list: Any[], k: string): number => list.reduce((s: number, b: Any) => s + (typeof b?.[k] === "number" ? b[k] : NaN), 0);
    const fleetOk = mine.length === PLAN.length && mine.every(Boolean) && sumOf(mine, "bets") === F.bets && sumOf(mine, "realisedLossTzs") === F.realisedLoss
      && sumOf(mine, "stakedTzs") === F.stakedLessJ + jStake && sumOf(mine, "returnedTzs") === F.returnedLessJ + jStake && sumOf(mine, "openStakeTzs") === 0
      && sumOf(mine, "settledStakeTzs") === F.stakedLessJ + jStake && sumOf(mine, "projectedLossTzs") === F.realisedLoss;
    ok(`M.17 · the FLEET's P&L over the four desks' rows of houseDayBooks(day) — bets ${F.bets} · realisedLoss ${F.realisedLoss}, a LITERAL because A2's jittered stake j cancels: (${F.stakedLessJ} + j) − (${F.returnedLessJ} + j) · open 0 · settled = staked · projected = realised — summed over the DESKS, so another lane's OPEN stake on the same day cannot move it`,
      allPremises && Number.isFinite(jStake) && fleetOk,
      j({ days, j: jStake, books: mine.map((b) => (b ? { bets: b.bets, staked: b.stakedTzs, open: b.openStakeTzs, settled: b.settledStakeTzs, returned: b.returnedTzs, realised: b.realisedLossTzs } : null)) }));
    /* The null reader — "every bot together" — against the sum of every per-desk row of the same day, field by
       field: the aggregation identity that makes it a fleet figure, on whatever lane set is running. */
    const nullOk: Any[] = [];
    for (const day of days) {
      const all = [...(booksByDay.get(day)?.values() ?? [])];
      const bf = await BOOK.houseDayBook(day, null);
      const same = !!bf && bf.bets === sumOf(all, "bets") && bf.stakedTzs === sumOf(all, "stakedTzs") && bf.openStakeTzs === sumOf(all, "openStakeTzs")
        && bf.settledStakeTzs === sumOf(all, "settledStakeTzs") && bf.returnedTzs === sumOf(all, "returnedTzs")
        && bf.realisedLossTzs === sumOf(all, "realisedLossTzs") && bf.projectedLossTzs === sumOf(all, "projectedLossTzs");
      nullOk.push({ day, rows: all.length, mDesks: desks.filter((d) => d.dayKey === day).length, same, bets: bf?.bets, open: bf?.openStakeTzs, realised: bf?.realisedLossTzs });
    }
    ok(`M.17n · houseDayBook(day, null) equals the SUM of every per-desk row houseDayBooks(day) returns for that day, field by field, on each day a fleet placement fell on (${days.length}) — and those rows hold all four M desks (⚠️ an aggregation identity: the sign mutation at book.ts:53 flips both sides alike and is caught by M.16/M.17, not here)`,
      /* ⛔ `desks.every((d) => d.dayKey)` IS THE ONE THING M10's RE-DERIVATION DID CHANGE. A desk whose day key
         were null would be dropped from `days` by the `.filter(Boolean)` above AND under-counted in `mDesks`,
         so the `n.rows >= n.mDesks` limb would go SLACK in exactly the state where it should be strictest. It
         can only ever weaken an assertion the two conjuncts beside it have already turned red — which is why
         this is belt-and-braces and not a defect — but a limb that loosens itself is worth one token. */
      allPremises && desks.every((d) => d.dayKey) && days.length >= 1 && mine.every(Boolean) && nullOk.every((n) => n.same && n.rows >= n.mDesks),
      j({ days: nullOk }));

    const fees = desks.map((d) => d.led1).filter(Boolean);
    const sum = (k: string) => fees.reduce((s, l) => s + l[k], 0);
    ok(`M.17b · over the four fleet markets the ledger booked COMMISSION ${F.commissionTotal} + TRA ${F.traTotal} + GBT ${F.gbtTotal} = ${F.feeTotal} = 7,800 + 20,150 + 910 + 0`,
      allPremises && fees.length === PLAN.length && sum("commission") === F.commissionTotal && sum("tra") === F.traTotal && sum("gbt") === F.gbtTotal && sum("commission") + sum("tra") + sum("gbt") === F.feeTotal,
      j({ commission: sum("commission"), tra: sum("tra"), gbt: sum("gbt"), markets: fees.length }));

    const x1 = await BOOK.houseOpenExposure(null);
    const xs = await Promise.all(desks.map((d) => (d.bot ? BOOK.houseOpenExposure(d.bot.botId) : Promise.resolve(null))));
    /* The OPEN marked money of every OTHER desk, read off the Position rows by hand — not through the reader under test. */
    const mIds: string[] = desks.map((d) => d.bot?.botId).filter(Boolean);
    const notMine = mIds.map((_, i) => `$${i + 1}`).join(", ");
    const otherRows: Any[] = mIds.length > 0 ? await pc.$queryRawUnsafe(
      `SELECT coalesce(sum("stake"), 0)::text AS "open", count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN' AND "houseBotId" NOT IN (${notMine})`, ...mIds) : [];
    const others = { n: Number(otherRows[0]?.n ?? NaN), open: Number(otherRows[0]?.open ?? NaN) };
    ok(`M.18 · houseOpenExposure is 0 for EACH of the four desks after settlement — it was the full stake before (M.4): the discriminator that settlement actually ran — and for the fleet (null) it equals EXACTLY the OPEN marked stake of every OTHER desk, read off the Position rows by hand (${others.n} position(s), ${others.open}): 0 in an A,B,M run, another lane's open money in a full one`,
      allPremises && xs.length === PLAN.length && xs.every((x) => x === 0) && Number.isFinite(others.open) && x1 === others.open, j({ fleet: x1, desks: xs, others }));
  }

  /* ═══ THE STOPS READ THE SAME BOOK — a settled LOSS must not pause a desk whose cap is 900,000,000 ═══════ */
  {
    const t0 = Date.now();
    /* A pass whose passNow (DB clock) is AFTER the last settledAt — one that read the SETTLED book, not one that
       was mid-flight while the markets settled. Budget 40 s against a 15 s planner interval — the wait is printed
       so the margin is a measurement, not a hope. */
    const lastSettledMs = Math.max(...desks.map((d) => (d.m1?.settledAt ? Date.parse(d.m1.settledAt) : NaN)));
    const pass: Any = Number.isFinite(lastSettledMs)
      ? await until("a planner pass that STARTED after the last settlement", 40_000, async () =>
          passes.planner.find((p: Any) => Date.parse(p?.passNowIso) > lastSettledMs) ?? null)
      : null;
    const waitedMs = Date.now() - t0;
    console.log(`   … M.19 · planner pass after the settlements: ${pass ? `seen after ${waitedMs} ms (passNow ${pass.passNowIso})` : "none"} (budget 40,000 ms · interval 15,000 ms)`);
    const bots = await Promise.all(desks.map((d) => (d.bot ? S.houseBotStore.get(d.bot.botId) : Promise.resolve(null))));
    const ctl = await S.houseBotControlStore.get();
    /* ⛔ THE DUTY'S OWN VERDICT, not only its absence of effect: PlannerPass carries duties.lossStops ("ok" | "skipped" |
       "failed: …") and counts.lossStoppedBots / counts.globalLossStop (planner.ts:84-90, 177-181). A lossStops that
       threw, or was deleted, leaves every desk ACTIVE too — the happy path of "nothing stopped" lives in the absence
       branch unless the duty is read. */
    ok("M.19 · a planner pass that STARTED after the last settlement ran duty lossStops \"ok\" over the settled book and counted lossStoppedBots 0 / globalLossStop 0 (a realised LOSS of 7,000 against caps of 900,000,000): every M desk still ACTIVE, no botStopped and no switchedOff in THIS lane's window (an earlier lane's pause is that lane's finding), the master switch still on",
      allPremises && !!pass && pass.duties?.lossStops === "ok" && pass.counts?.lossStoppedBots === 0 && pass.counts?.globalLossStop === 0
        && bots.length === PLAN.length && bots.every((b) => b?.status === "ACTIVE") && inWindow("botStopped") === 0 && inWindow("switchedOff") === 0 && ctl?.enabled === true,
      j({ plannerPasses: passes.planner.length, waitedMs, pass: pass ? { at: pass.passNowIso, lossStops: pass.duties?.lossStops, lossStoppedBots: pass.counts?.lossStoppedBots, globalLossStop: pass.counts?.globalLossStop } : null,
        lastSettledAt: Number.isFinite(lastSettledMs) ? new Date(lastSettledMs).toISOString() : null, statuses: bots.map((b) => b?.status), stoppedInWindow: inWindow("botStopped"), offInWindow: inWindow("switchedOff"), enabled: ctl?.enabled }));
  }

  /* ═══ WHAT SETTLEMENT REPORTED — the in-process return and the tamper-evident chain, against the rows ════
     Read HERE, after the planner-pass wait above, because `audit()` appends through a serialized queue and the
     rows land a moment after `settleMarket` returns. */
  {
    const auditPayload = async (action: string, targetId: string | null): Promise<Any> => {
      if (!targetId) return null;
      const rows: Any[] = await pc.$queryRawUnsafe(
        `SELECT "payload" FROM "AuditLog" WHERE "action" = $1 AND "targetId" = $2 ORDER BY "createdAt" DESC LIMIT 1`, action, targetId);
      const p = rows[0]?.payload ?? null;
      return typeof p === "string" ? JSON.parse(p) : p;
    };
    for (const d of desks) {
      const { expKey, exp, marketId } = d;
      const settled = await auditPayload("market.settled", marketId);
      const resolved = await auditPayload("market.resolved", marketId);
      /**
       * 🔴 A FINDING, NOT A FIXTURE FAULT — measured on the first run of this lane and left red on purpose.
       * `settleMarket` promises (its own L2 note) to "report the FULL settled totals from the authoritative
       * position rows … the number a regulator reconciles", and computes them by re-reading
       * `listPositionsForMarket(m.id)` INSIDE the lock's transaction — but the Prisma `listForMarket` takes no
       * `tx` and reads on the singleton client (`market-dal.ts`, `pc().position.findMany`), which cannot see the
       * uncommitted WIN/LOSS/VOID writes. Every position still reads OPEN, so the service returns
       * `{ winnersPaid: 0, positionsSettled: 0 }` while M.10–M.14 show 84,200 paid and 3 settled — and the same
       * zeros are stamped into the `market.settled` audit payload and rendered to the officer by the admin
       * settlement action ("0 positions settled · TZS 0 paid to winners"). Money-neutral; reporting only. The
       * two suites that assert `winnersPaid` (`two-admin-policy.test.mts`; `concurrency.test.mts` case C, the
       * natural home for a Postgres re-run of this) both run on the in-memory store, which has no transaction
       * isolation, so neither could ever see this. It goes green when the totals are taken from the
       * in-scope, already-mutated `allMarketPositions` (or a read threaded through `lockTx`) — a product change
       * this lane does not make.
       */
      okP(expKey, `M.8r · ${exp.key} · settleMarket REPORTS what it did — return value AND the market.settled audit payload both say positionsSettled ${exp.positionsSettled}, winnersPaid ${exp.winnersPaid}: the totals the durable rows show (M.10, M.13) and a regulator reconciles`,
        d.st?.data?.positionsSettled === exp.positionsSettled && d.st?.data?.winnersPaid === exp.winnersPaid
          && settled?.positionsSettled === exp.positionsSettled && settled?.winnersPaid === exp.winnersPaid,
        j({ returned: d.st?.data ?? null, audited: settled ? { positionsSettled: settled.positionsSettled, winnersPaid: settled.winnersPaid, forced: settled.forced } : null, expected: { positionsSettled: exp.positionsSettled, winnersPaid: exp.winnersPaid } }));
      const lev = resolved?.levies ?? null;
      const netPool = exp.netPool ?? (typeof d.stake === "number" ? d.stake + exp.pools.no : NaN);
      okP(expKey, `M.8a · ${exp.key} · the tamper-evident chain's market.resolved payload records the fee arithmetic a dispute would be re-computed from: loser-share · fee ${exp.fee} · netPool ${exp.netPool ?? "stake + 70,000"} · levies TRA ${exp.tra} / GBT ${exp.gbt} / operatorNet ${exp.operatorNet} · outcome ${exp.outcome}`,
        !!resolved && resolved.outcome === exp.outcome && resolved.rates?.feeModel === "loser-share" && resolved.fee === exp.fee && resolved.netPool === netPool
          && !!lev && lev.fee === exp.fee && lev.traLevy === exp.tra && lev.gbtLevy === exp.gbt && lev.operatorNet === exp.operatorNet,
        j({ audited: resolved ? { outcome: resolved.outcome, model: resolved.rates?.feeModel, fee: resolved.fee, netPool: resolved.netPool, levies: lev } : null, expected: { fee: exp.fee, netPool, tra: exp.tra, gbt: exp.gbt, operatorNet: exp.operatorNet } }));
    }
  }

  /* ═══ TRIAL BALANCE AFTER — and the control that measures its blindness instead of asserting it ═════════ */
  const tb1: Any = await LEDGER.trialBalance();
  ok(`M.20 · trialBalance() AFTER settlement ties (ok · global Σ 0 · no imbalanced group) over ≥ ${walletFloor} wallets — over a ledger M.14 proved holds every fleet payout, refund, commission and levy row`,
    allPremises && tb1?.ok === true && tb1?.globalBalanced === true && tb1?.imbalancedGroups?.length === 0 && tb1?.checkedWallets >= walletFloor,
    j({ ok: tb1?.ok, wallets: tb1?.checkedWallets, globalSum: tb1?.globalSum, drifting: tb1?.driftingWallets, worst: tb1?.worst }));

  {
    const d = desks.find((x) => x.expKey === "M-A1-WIN");
    const A1: Any = EXPECT["M-A1-WIN"];
    const grp = `ctl_leak_${process.pid}`;
    let tbX: Any = null, leak: Any = null, restored: Any = null, deleted = -1;
    if (d?.marketId && d.bot) {
      /* The pair `allocateFeeShares` was written to prevent, planted by hand on a settled fleet market, then removed by its group id. */
      await pc.$executeRawUnsafe(
        `INSERT INTO "LedgerEntry" ("id", "groupId", "account", "entryType", "amount", "currency", "memo", "marketId") VALUES`
        + ` ($1, $2, $3, 'SETTLEMENT_COMMISSION'::"LedgerEntryType", -1, 'TZS', 'lane M control: planted over-collection', $4),`
        + ` ($5, $2, 'HOUSE:COMMISSION', 'SETTLEMENT_COMMISSION'::"LedgerEntryType", 1, 'TZS', 'lane M control: planted over-collection', $4)`,
        `le_${grp}_pool`, grp, `POOL:${d.marketId}`, d.marketId, `le_${grp}_comm`);
      tbX = await LEDGER.trialBalance();
      leak = await ledgerOf(d.marketId, d.bot.userId);
      deleted = await pc.$executeRawUnsafe(`DELETE FROM "LedgerEntry" WHERE "groupId" = $1`, grp);
      restored = await ledgerOf(d.marketId, d.bot.userId);
    }
    okP("M-A1-WIN", "M.21 · CONTROL · a planted POOL −1 / HOUSE:COMMISSION +1 pair on A1's settled market leaves trialBalance() ok:true — it is BLIND to it, the pair cancels inside its global sum and the group sums to zero — while the per-market residual reads −1 (M.14a would be red); the pair is removed and the residual reads 0 again",
      tbX?.ok === true && tbX?.globalBalanced === true && tbX?.imbalancedGroups?.length === 0 && leak?.pool === -1 && leak?.commission === A1.operatorNet + 1
        && deleted === 2 && restored?.pool === 0 && restored?.commission === A1.operatorNet,
      j({ tbOk: tbX?.ok, globalSum: tbX?.globalSum, leak, deleted, restored }));
  }

  return { placed: [], lane: "M", measured: allPremises, settled: desks.map((d) => ({ key: d.exp.key, market: d.marketId, outcome: d.exp.outcome })) };
}
