/**
 * MASWALI MILLIONEA — SETTLING A WEEK (MASWALI-BUILD S3; MASWALI-PLAN §3 MR-20…MR-26 and MR-30, §5b, §7b S3 item 4).
 *
 *   the system PREPARES the settlement (`previewMaswaliSettlement`)  ──ONE accounting officer RELEASES it (OD-06)──▶  SETTLED
 *
 * The release recomputes every figure inside the locks and pays only if they are the figures the officer saw (`digest`).
 *
 * ⭐ ONE WEEK, ONE GROUP, ONE TRANSACTION (MB-31). Inside `maswali:chain` (the line of weeks: the carry, the guarantee's
 *    ceremonies and every other settlement wait) and `market:<id>` (the week's market), and ONE `withMoneyTx`: the carry's
 *    claim (R3); every winner's WIN mark in bulk, one credit per winning player and one BET_PAYOUT row per ticket (R9);
 *    every loser in one statement; every ticket's grade in bulk; the ledger group; the week's mirrored columns. A failure
 *    rolls the whole week back, the claim with it, and the release can run again.
 * ⭐ THE CHAIN (MR-3, R3): a week settles only once every earlier week of its line is terminal, its claim is written only
 *    after every refusal has been decided, and the money transaction re-reads the jackpot and pays nothing unless it
 *    holds the R being claimed.
 * ⭐ S IS READ THREE WAYS AND MUST AGREE (MB-08): the market's pool, the `POOL:<id>` ledger account, and the live tickets
 *    at their frozen price — and the week's own live count and its sales at close. One that differs refuses the week.
 * ⭐ EVERY REFUSAL COMES BEFORE THE FIRST WRITE, the guarantee's included (MB-03): a guarantee below the top-up refuses the
 *    week with a CRITICAL record and never pays less (acceptance (f): no partial write, on either store). Every read the
 *    payout needs (positions, wallets) comes before it too.
 * ⚠️ THE TRIPWIRES AFTER IT (CARRY, WINNERS, WALLET, LOSERS, TICKETS, STAMP) are conditional writes re-proving what the
 *    locked reads already proved: an unclaimed RESOLVING week, OPEN positions, readable wallets, LIVE tickets, and no OPEN
 *    position outside the live tickets (S agreed three ways). On Postgres a tripped one rolls the whole week back. The
 *    memory store (tests and dev only) has no transaction, so one tripped there leaves the writes before it: they fire
 *    only on a store that broke mid-release, never on a path the product takes.
 * ⛔ A WINNER WHOSE ACCOUNT CHANGED IS STILL PAID, AND HELD (MB-43, OD-07): roles are re-checked at settlement; a staff
 *    role, a live desk designation, a suspended or closed account — the share is credited, the ticket carries the reason,
 *    and the wallet is held for Compliance (`MILLIONEA_SHARE`) BEFORE the credit. Never a re-run, never a smaller share.
 *    ⭐ R6 · every hold and every lift of that reason runs under `maswali:chain`, so a lift can never read "nothing held"
 *    while a held share is landing; a release that does not complete lifts the holds it placed where none is held.
 *    ⭐ S7-F8 · that lock is a transaction with a 30-second budget, and every hold is its own committed write: S16 measured
 *    7,000 held winners overrunning the budget, so the holds take SECTIONS of the lock (`HOLD_SECTION_MS` each), every
 *    section re-reads the week and the holds the sections before it placed, and the money runs in a section that reached
 *    it inside its share — with few holds, the one section it always was. Every lift goes through ONE lifter in the same
 *    sections (`liftHoldsIfClear`): each re-reads its accounts' holds and held shares under the lock, a hold already gone
 *    writes nothing, and a lift stopped midway leaves each account lifted or held, for the next attempt or the heal.
 * ⛔ NO NOTICE, EMAIL OR PUSH FROM HERE (S6 writes Millionea's own), and no wagering, recruit or house accrual (OD-20/27).
 */
import { createHash } from "node:crypto";
import { audit, getAuditForTargetsDurable } from "./audit";
import { afterCommit, runOutsideLock, withLock } from "./locks";
import { invalidateMillioneaRegisterWeek } from "./maswali-register-cache";
import { acct, maswaliForfeitReturnEntries, maswaliJackpotOf, maswaliRolloverEntries, maswaliSettlementEntries, maswaliSunsetEntries, withMoneyTx, type LedgerLine } from "./ledger";
import { questionStore, ticketStore, weekStore, type SettledTicketRow, type StoredTicket, type StoredWeek, type WeekSettlementStamp } from "./maswali-dal";
import { marketStore, positionStore } from "./market-dal";
import type { StoredPosition } from "./market-service";
import { snapshotOrLegacy } from "./market-config";
import { houseBotStore } from "./house-bot-dal";
import { isStaffRole } from "./roles";
import { randomId } from "./crypto";
import { db, type StoredTxn, type StoredUser } from "./store";
import { prisma, hasDatabase } from "./prisma";
import { currentFreezeReasons } from "@/lib/wallet-freeze-reasons";
import { addWalletFreeze, removeWalletFreeze } from "./wallet-freeze";
import { MASWALI_CHAIN_LOCK, carryBlocker, frozenRules, gradable } from "./maswali-service";
import { maswaliAccountBalance, postMaswaliLines, readJackpotOf } from "./maswali-money-service";
import { settleArithmetic, type WeekArithmetic } from "@/lib/maswali-money";
import { canonicalPicks, grade, MAIN_COUNT, settlementGate, topScore } from "@/lib/maswali-score";
import { formatTzs } from "@/lib/utils";

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });
const SYSTEM = "system_maswali";
/** Ledger entries are emitted as balanced pairs; keep each insert bounded inside the one money transaction. */
const LINES_PER_POST = 2_000;
/**
 * ⭐ S7-F8 · THE HOLDS' SHARE OF ONE SECTION OF THE CHAIN LOCK. On Postgres `maswali:chain` is a transaction with the lock's
 * 30-second budget (`locks.ts`), and every hold is its own committed write with its own audit row (`holdWallet`): S16
 * measured 7,000 held winners overrunning that budget, so the release rolled back and nothing was paid. A section places
 * holds for at most this long (and at least one), counted from the moment it asked for the lock, then lets the lock go; the
 * next re-reads the week and every hold placed so far, and carries on. The money runs only in a section that reached it
 * inside this share — one whose holds took longer lets the lock go too, and the next, with every hold standing, pays with
 * the rest of its budget. A release with few holds is one section, exactly as before.
 */
const HOLD_SECTION_MS = 5_000;

/** Why a winning share is held for Compliance (MB-43), or null when it is paid free. */
export type HoldReason = "staff account" | "house desk account" | "desk check unreadable" | "account suspended" | "account closed" | "deposit under review" | "deposit check unreadable";

/** One graded winning ticket, as the release pays it. */
type Winner = { ticket: StoredTicket; score: number; hold: HoldReason | null };

/**
 * ⭐ WHAT THE OFFICER SEES, AND WHAT THE RELEASE PAYS. No player's identity is in it: counts and figures only.
 * `basis` says how k was found — the 10-of-10 tickets (MR-23), or, in the final week with no 10 of 10, the highest
 * score (MR-30, the only place a score decides money).
 */
export type MaswaliSettlementPreview = {
  weekId: string;
  code: string;
  marketId: string;
  isFinal: boolean;
  /** S, agreed three ways. */
  sales: number;
  liveTickets: number;
  /** R — the carry this week has claimed, or (`carryClaimed` false) what the claim would read now. */
  rolloverIn: number;
  carryClaimed: boolean;
  basis: "TEN_OF_TEN" | "TOP_SCORE";
  /** The winning score: 10, or the final week's top score. Null when nothing was graded. */
  winningScore: number | null;
  winners: number;
  arithmetic: WeekArithmetic;
  /** The guarantee's balance as read for this preview, and what the week draws from it. */
  guaranteeHeld: number;
  guaranteeNeeded: number;
  /** Winners whose share is credited and held for Compliance (MB-43). */
  held: number;
  /** The figures, hashed: the release refuses unless it recomputes the same. */
  digest: string;
};

/** A hold an account carries at settlement, re-checked from the stored rows (MB-43). */
function holdFor(user: StoredUser | null, desk: "designated" | "clear" | "unreadable" | undefined): HoldReason | null {
  if (!user) return "account closed";
  if (isStaffRole(user.role)) return "staff account";
  // R10b · fail CLOSED: a desk check that cannot be read holds the share (Compliance releases it), never pays it free
  // because the lookup failed — and says so in its own words, never as a desk designation the account may not have.
  if (desk === "unreadable" || desk === undefined) return "desk check unreadable";
  if (desk === "designated") return "house desk account";
  if (user.status === "SUSPENDED") return "account suspended";
  if (user.status === "CLOSED") return "account closed";
  return null;
}

type Computed = {
  preview: MaswaliSettlementPreview; week: StoredWeek; winners: Winner[]; losers: Array<{ ticket: StoredTicket; score: number }>;
  /** Every live ticket's position, each checked against its ticket: the payout rows are written from these (R9). */
  positions: Map<string, StoredPosition>;
};

/**
 * Every figure of one week's settlement, read fresh — or the reason it cannot settle. Writes NOTHING. `R` is the claimed
 * carry when the week has one, else the jackpot as a claim would read it now (the preview's case).
 */
async function computeSettlement(weekId: string, nowMs: number): Promise<{ ok: true; c: Computed } | Refused> {
  const week = await weekStore.get(weekId);
  if (!week) return refuse("No such week.");
  if (week.state !== "RESOLVING") return refuse(`Week ${week.code} is ${week.state}; only a week whose results are sealed (RESOLVING) settles.`);
  if (!week.marketId) return refuse(`Week ${week.code} has no market.`);
  const rules = frozenRules(week);
  if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
  const market = await marketStore.get(week.marketId);
  if (!market) return refuse(`Week ${week.code}'s market is missing.`);
  const fees = snapshotOrLegacy(market.feeSnapshot);
  const feeRate = fees.jackpotFeeRate;
  if (fees.feeModel !== "jackpot-payout" || typeof feeRate !== "number" || !Number.isFinite(feeRate)) {
    return refuse(`Week ${week.code}'s market did not freeze the jackpot fee, so it cannot be priced.`);
  }

  // ── The record (MR-17): the gate ready, the graded set final, the window closed, no objection standing.
  const questions = gradable(await questionStore.listForWeek(week.id));
  const gate = settlementGate(questions);
  if (!gate.ready) return refuse(`Week ${week.code} still needs ${gate.needs.length} question(s) sealed before it can settle.`);
  if (gate.weekVoid) return refuse(`Week ${week.code} voids whole (MR-18): refund it with the week void, never a settlement.`);
  if (!week.gradedSetFinalAt || !week.objectionsCloseAt) return refuse(`Week ${week.code}'s graded set is not final yet.`);
  if (Date.parse(week.objectionsCloseAt) > nowMs) return refuse(`Week ${week.code}'s objection window is still open.`);
  const { countOpenObjections } = await import("./objections-service");
  if ((await countOpenObjections(week.marketId)) > 0) return refuse(`An objection is standing against week ${week.code}; it settles once every objection is decided.`);

  // ── S, three ways (MB-08), and the week's own count and close stamp.
  const live = await ticketStore.listForWeek(week.id, { status: "LIVE" });
  const price = rules.ticketPriceTzs;
  const byTickets = live.length * price;
  const byLedger = await maswaliAccountBalance(acct.pool(week.marketId));
  const byPool = market.yesPool;
  if (byLedger === null) return refuse(`Week ${week.code}'s pool could not be read from the ledger, so nothing was settled.`);
  if (market.noPool !== 0 || byPool !== byTickets || byLedger !== byTickets || week.ticketCount !== live.length || week.salesAtClose !== byTickets) {
    return refuse(`Week ${week.code}'s sales do not agree: market pool ${byPool} (other side ${market.noPool}), ledger ${byLedger}, `
      + `live tickets ${live.length} × ${price} = ${byTickets}, week count ${week.ticketCount}, sales at close ${week.salesAtClose}. Nothing was settled.`);
  }
  const positions = new Map((await positionStore.getMany(live.map((t) => t.positionId))).map((p) => [p.id, p]));
  for (const t of live) {
    const p = positions.get(t.positionId);
    if (!p || p.status !== "OPEN" || p.stake !== price || p.marketId !== week.marketId || p.userId !== t.userId) {
      return refuse(`Ticket ${t.serial}'s position does not match its ticket, so nothing was settled.`);
    }
  }

  // ── The grades (MR-17), and who wins: the 10-of-10 tickets, or in the final week without one, the top score (MR-30).
  const graded = live.map((ticket) => {
    const g = grade(questions, canonicalPicks(ticket.selections));
    if (g.kind !== "GRADED") throw new Error(`[maswali-settlement] ticket ${ticket.serial} could not be graded on a ready gate`);
    return { ticket, score: g.score };
  });
  let basis: MaswaliSettlementPreview["basis"] = "TEN_OF_TEN";
  let winningScore: number | null = graded.length > 0 ? MAIN_COUNT : null;
  let isWin: (score: number) => boolean = (score) => score === MAIN_COUNT;
  if (week.isFinal && graded.length > 0 && !graded.some((g) => g.score === MAIN_COUNT)) {
    const top = topScore(graded.map((g) => g.score))!;
    basis = "TOP_SCORE";
    winningScore = top.score;
    isWin = (score: number) => score === top.score;
  }
  const winnersGraded = graded.filter((g) => isWin(g.score));
  const losers = graded.filter((g) => !isWin(g.score));

  // ── R: the claimed carry, or the claim's reading now.
  let rolloverIn = week.rolloverIn;
  const carryClaimed = rolloverIn != null;
  if (rolloverIn == null) {
    const j = await readJackpotOf(week.visibility)();
    if (j === null || !Number.isSafeInteger(j) || j < 0) return refuse("The jackpot balance could not be read, so the settlement could not be prepared.");
    rolloverIn = j;
  }

  // ── The arithmetic (MR-20…MR-26). The sunset's top-score payout has no floor and no top-up (OD-03).
  const arithmetic = settleArithmetic({
    rolloverIn, sales: byTickets, winners: winnersGraded.length,
    floor: basis === "TOP_SCORE" ? 0 : rules.floorTzs, feeRate,
    rates: { traTaxOnCommissionRate: fees.traTaxOnCommissionRate, gbtLevyOnCommissionRate: fees.gbtLevyOnCommissionRate },
  });
  const guaranteeNeeded = arithmetic.kind === "PAYOUT" ? arithmetic.U : 0;
  const guaranteeHeld = await maswaliAccountBalance(acct.maswaliGuarantee);
  if (guaranteeHeld === null) return refuse("The guarantee balance could not be read, so the settlement could not be prepared.");

  const winnerIds = [...new Set(winnersGraded.map((g) => g.ticket.userId))];
  const users: StoredUser[] = [];
  for (let i = 0; i < winnerIds.length; i += 5_000) users.push(...await db.user.findByIds(winnerIds.slice(i, i + 5_000)));
  const userOf = new Map(users.map((user) => [user.id, user]));
  const deskOutcomes = await houseBotStore.findLiveByUserIds(winnerIds).catch((err: unknown) => {
    console.error("[maswali-settlement] winner desk checks could not be read, so their shares are held:", (err as Error)?.message ?? err);
    return winnerIds.map((userId) => ({ userId, outcome: "unreadable" as const }));
  });
  const deskOf = new Map(deskOutcomes.map((r) => [r.userId, r.outcome]));
  const disputed = await depositHolds(winnerIds);
  const winners: Winner[] = winnersGraded.map((g) => ({
    ...g, hold: holdFor(userOf.get(g.ticket.userId) ?? null, deskOf.get(g.ticket.userId)) ?? disputed(g.ticket.userId),
  }));

  const figures = {
    weekId: week.id, sales: byTickets, liveTickets: live.length, rolloverIn, basis, winningScore, arithmetic,
    winners: winners.map((w) => `${w.ticket.id}:${w.hold ?? ""}`).sort(),
  };
  const digest = createHash("sha256").update(JSON.stringify(figures)).digest("hex").slice(0, 32);
  return {
    ok: true,
    c: {
      week, winners, losers, positions,
      preview: {
        weekId: week.id, code: week.code, marketId: week.marketId, isFinal: week.isFinal,
        sales: byTickets, liveTickets: live.length, rolloverIn, carryClaimed, basis, winningScore,
        winners: winners.length, arithmetic, guaranteeHeld, guaranteeNeeded, held: winners.filter((w) => w.hold).length, digest,
      },
    },
  };
}

/**
 * ⭐ OD-06 · THE SETTLEMENT, PREPARED: every figure the release would pay, and its digest. Writes nothing.
 * `now` is the week's clock (the objection window), injectable like every week act; money is stamped on the real clock.
 */
export async function previewMaswaliSettlement(weekId: string, now?: Date): Promise<{ ok: true; preview: MaswaliSettlementPreview } | Refused> {
  const r = await computeSettlement(weekId, (now ?? new Date()).getTime());
  return r.ok ? { ok: true, preview: r.c.preview } : r;
}

/** Thrown inside the money transaction so it rolls back; mapped to a refusal outside the locks. */
class SettleAbort extends Error { constructor(readonly why: string) { super(why); } }

/** Where the suites stop a release or a share act part-way (R6's interleaves, R8's failed commit). Empty outside them. */
type SettleSeams = {
  /** A release, past its own refusals, before it waits for the chain lock (the duplicate that arrives late). */
  beforeChain?: () => Promise<void>;
  /** A release, under the chain lock, between its holds and the money transaction. */
  afterHolds?: () => Promise<void>;
  /** S7-F8 · a release whose holds outlast a section, after that section let the chain lock go and before it asks again. */
  betweenHoldSections?: (section: number) => Promise<void>;
  /** S7-F8 · the holds' share of a section, in ms, in place of `HOLD_SECTION_MS` (0: one hold a section, the money in its own;
   *  for the lifts, one account a section). */
  holdSectionMs?: number;
  /** S7-F8 · the lifts (`liftHoldsIfClear`), after a section let the chain lock go with accounts still to re-check. */
  betweenLiftSections?: (section: number) => Promise<void>;
  /** A forfeit, committed, before its lift. */
  beforeLift?: () => Promise<void>;
  /** The last statement of a release's, a forfeit's or a hold's transaction; "money": the FIRST of a release's money one. */
  beforeCommit?: (act: "release" | "forfeit" | "hold" | "money") => Promise<void>;
};
let seams: SettleSeams = {};
/** ⚠️ TEST SEAM ONLY — never call this from application code. Each seam is awaited at its point; `null` clears them. */
export function __setMaswaliSettleSeamsForTests(s: SettleSeams | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setMaswaliSettleSeamsForTests is a test seam and refuses to run in production.");
  seams = s ?? {};
}

/**
 * ⭐ RELEASE ONE WEEK'S SETTLEMENT — once (OD-06: one accounting officer; the caller's action checks the role). `digest` is
 * the preview the officer read: the release recomputes everything inside the locks and refuses unless it matches.
 * Idempotent: a SETTLED week answers `already`. The week it returns is read after the commit (R4c).
 */
export async function settleMaswaliWeek(input: {
  weekId: string; releasedBy: string; digest: string; now?: Date;
  /** Tests only: the payout float's read (MB-11). */
  readFloat?: () => Promise<{ balance: number } | null>;
}): Promise<
  { ok: true; week: StoredWeek; already?: boolean } | Refused
> {
  const nowMs = (input.now ?? new Date()).getTime();
  const first = await weekStore.get(input.weekId);
  if (!first) return refuse("No such week.");
  if (first.state === "SETTLED") return { ok: true, week: first, already: true };
  if (!first.marketId) return refuse(`Week ${first.code} has no market.`);
  const marketId = first.marketId;

  const pre = await computeSettlement(input.weekId, nowMs);
  if (!pre.ok) return pre;
  if (pre.c.preview.digest !== input.digest) return refuse("The settlement changed since it was prepared. Prepare it again and read the new figures.");
  // R6 · ONE HOLD PER HELD ACCOUNT, named by its first held ticket (a second hold of the same reason writes nothing); and
  //    the accounts a release that does not complete lifts again, each where no held share stands behind it.
  const toHold = new Map<string, Winner>();
  for (const w of pre.c.winners) if (w.hold && !toHold.has(w.ticket.userId)) toHold.set(w.ticket.userId, w);
  const heldAccounts = [...toHold.keys()];
  await seams.beforeChain?.();

  type Out = { ok: true; week: StoredWeek; already?: boolean } | Refused;
  try {
    /** The holds still to place, in the winners' order, and the accounts held by a section before this one. */
    let queue = [...toHold.values()];
    const placed = new Set<string>();
    /** One section of `maswali:chain`, `asked` the instant it asked for the lock: "MORE" when it let the lock go with
     *  holds still to place (S7-F8); otherwise the release's answer, its money included. */
    const inSection = async (asked: number): Promise<Out | "MORE"> => {
      // ⛔ R6 · THE WEEK IS RE-READ UNDER THE CHAIN LOCK BEFORE ANY HOLD, in every section: a release that waited behind
      //    another finds the week it read RESOLVING already settled, and answers `already` without placing a hold no share
      //    would stand behind.
      const current = await weekStore.get(input.weekId);
      if (current?.state === "SETTLED") return { ok: true, week: current, already: true };
      // MR-3 · strictly in order: a week settles, and claims its carry, only once every earlier week of its line is terminal.
      const blocking = await carryBlocker(first);
      if (blocking) return refuse(`Week ${blocking.code} is not settled yet; the carry is claimed strictly in order (MR-3).`);
      // ⭐ S7-F8 · THE HOLDS AN EARLIER SECTION PLACED, READ AGAIN UNDER THIS LOCK: while the lock was let go a lift may have
      //    run (it found no held share — none has landed yet) and lifted one. Each one gone goes back to the queue's front,
      //    to be held again here, before any money; from here to the commit no lift can run (it needs this lock).
      if (placed.size > 0) {
        const standing = new Set((await db.wallet.findByUserIds([...placed]))
          .filter((wallet) => currentFreezeReasons(wallet).includes("MILLIONEA_SHARE")).map((wallet) => wallet.userId));
        const lifted = [...placed].filter((userId) => !standing.has(userId));
        for (const userId of lifted) placed.delete(userId);
        if (lifted.length > 0) queue = [...lifted.map((userId) => toHold.get(userId)!), ...queue];
      }
      // ⛔ THE HOLDS COME FIRST (MB-43), before any credit: a held winner's money is never spendable for an instant.
      //    ⭐ R6 · under the chain lock, which every lift of this reason takes too (`liftHoldIfClear`), so no lift can read
      //    "nothing held" between a hold and the commit of its held share; and before `market:`. Each hold commits on its
      //    own (`holdWallet`), so a release that then refuses or rolls back lifts it again (`liftHoldsIfClear`, below).
      //    ⭐ S7-F8 · at least one hold a section, then no more once the section's share of the lock's budget is spent; and
      //    a section that placed holds pays only if it is still inside that share — otherwise the next section pays.
      const share = seams.holdSectionMs ?? HOLD_SECTION_MS;
      let heldHere = 0;
      while (queue.length > 0) {
        if (heldHere > 0 && Date.now() - asked >= share) return "MORE";
        const w = queue[0];
        const f = await holdWallet(w.ticket.userId, {
          actorId: null, note: `Millionea ${first.code} · ${w.ticket.serial} · ${w.hold}`, ref: { ticketId: w.ticket.id, weekId: first.id },
        });
        if (!f.ok) return refuse(`A winner's wallet could not be held (${f.error}), so nothing was paid.`);
        queue.shift();
        placed.add(w.ticket.userId);
        heldHere++;
      }
      if (heldHere > 0 && Date.now() - asked >= share) return "MORE";
      await seams.afterHolds?.();
      return withLock(`market:${marketId}`, async (tx): Promise<{ ok: true; week: StoredWeek; already?: boolean } | Refused> => {
        const again = await weekStore.get(input.weekId);
        if (again?.state === "SETTLED") return { ok: true, week: again, already: true };
        const r = await computeSettlement(input.weekId, nowMs);
        if (!r.ok) return r;
        const { preview: f, week, winners, losers, positions } = r.c;
        // The digest was taken with R as the claim WOULD read; unclaimed, R is the jackpot as this lock reads it — the
        // same R, claimed below in the money transaction (R3).
        if (f.digest !== input.digest) {
          return refuse("The settlement changed since it was prepared. Prepare it again and read the new figures.");
        }
        const a = f.arithmetic;
        const settledAt = new Date().toISOString();
        const groupId = `maswali_settle_${week.id}`;
        const jackpot = maswaliJackpotOf(week.visibility);
        // The week's one settlement write (the ledger group's mirror), and the week as this release leaves it.
        const stamp: WeekSettlementStamp = {
          state: "SETTLED",
          jackpot: a.kind === "PAYOUT" ? a.J : null, fee: a.kind === "PAYOUT" ? a.F : 0,
          traLevy: a.kind === "PAYOUT" ? a.tra : 0, gbtLevy: a.kind === "PAYOUT" ? a.gbt : 0, topUp: a.kind === "PAYOUT" ? a.U : 0,
          winningTickets: a.k, sharePerTicket: a.kind === "PAYOUT" ? a.share : null, paidTotal: a.kind === "PAYOUT" ? a.paid : 0,
          carryOut: a.kind === "PAYOUT" ? a.carryOut : f.sales, dustCarried: a.kind === "PAYOUT" ? a.carryOut : 0,
          settlementGroupId: groupId, settledAt, releasedBy: input.releasedBy,
        };
        await seams.beforeCommit?.("money"); // a test seam (S7-F9 · RD.10): past the deposits' last read, before any write
        await withMoneyTx(async (mtx) => {
          // ⛔ R3 · THE JACKPOT COVERS R, read in the transaction before any write: a carry above what the jackpot holds (a
          //    claim gone stale, a ledger fault) is never drawn, and the week pays nothing until the two agree.
          if (f.rolloverIn > 0) {
            const inJackpot = await maswaliAccountBalance(jackpot, mtx);
            if (inJackpot === null || inJackpot < f.rolloverIn) throw new SettleAbort(`JACKPOT:${inJackpot ?? "unreadable"}:${f.rolloverIn}`);
          }
          // Every read the payout needs, before the first write: each winner's position, and each winning player's wallet
          // with the number of shares it takes (the memory store cannot undo a write an abort comes after).
          const shares = new Map<string, number>();
          const payees = new Map<string, { id: string; balance: number }>();
          if (a.kind === "PAYOUT") {
            for (const w of winners) {
              if (!positions.has(w.ticket.positionId)) throw new SettleAbort(`MISSING:${w.ticket.serial}`);
              shares.set(w.ticket.userId, (shares.get(w.ticket.userId) ?? 0) + 1);
            }
            const wallets = await db.wallet.findByUserIds([...shares.keys()], mtx);
            for (const wallet of wallets) payees.set(wallet.userId, { id: wallet.id, balance: wallet.balance });
            for (const userId of shares.keys()) if (!payees.has(userId)) throw new SettleAbort(`MISSING:${userId}`);
            if (payees.size !== shares.size) throw new SettleAbort(`WALLETS:${payees.size}:${shares.size}`);
          }
          // ⭐ R3 · MR-21's CLAIM JOINS THE MONEY: written right after the last refusal (the guarantee's, next) and inside this
          //    transaction, so it commits with the payout or not at all — a claim can never stand for a week that did not
          //    settle. A k = 0 week claims too, so the line of weeks always advances in calendar order (MR-3; §5 worked
          //    example A, week 4).
          // ⛔ THE GUARANTEE, READ IN THE TRANSACTION, BEFORE ANY WRITE (MB-03): below the top-up, refuse — never pay less.
          if (a.kind === "PAYOUT" && a.U > 0) {
            const held = await maswaliAccountBalance(acct.maswaliGuarantee, mtx);
            if (held === null || held < a.U) throw new SettleAbort(`GUARANTEE:${held ?? "unreadable"}:${a.U}`);
          }
          if (!f.carryClaimed && !(await weekStore.claimCarry(week.id, f.rolloverIn, mtx ?? undefined))) throw new SettleAbort("CARRY");
          const lines: LedgerLine[] = [];
          const ticketRows: SettledTicketRow[] = [];
          if (a.kind === "ROLLOVER") {
            lines.push(...maswaliRolloverEntries({ marketId, sales: f.sales, jackpot }));
          } else {
            // ⭐ R9 · THE WINNERS IN BULK, as the losers: every WIN mark in one statement per batch, one credit per winning
            //    PLAYER (the share times their winning tickets), and then one BET_PAYOUT row per ticket — each marked from
            //    its own position, the literal Ruling 232 reads. Each row tells the balance after its own share.
            const won = await positionStore.settleMaswaliWinners(marketId, winners.map((w) => w.ticket.positionId), a.share, settledAt, mtx);
            if (won !== winners.length) throw new SettleAbort(`WINNERS:${won}:${winners.length}`);
            if (a.share > 0) {
              const credited = await db.wallet.creditMany([...shares].map(([userId, n]) => ({ userId, amount: n * a.share })), mtx);
              const creditedOf = new Map((credited ?? []).map((wallet) => [wallet.userId, wallet]));
              if (!credited || credited.length !== shares.size || creditedOf.size !== shares.size) throw new SettleAbort("WALLETS:CREDIT");
              for (const [userId, n] of shares) {
                const wallet = creditedOf.get(userId);
                if (!wallet || !payees.has(userId)) throw new SettleAbort(`WALLET:${userId}`);
                // `creditMany` returns the locked post-credit balance. Walk the tickets below from its pre-credit value.
                payees.set(userId, { id: wallet.id, balance: wallet.balance - n * a.share });
              }
            }
            const paid: Array<{ userId: string; txnId: string; share: number }> = [];
            const payouts: Array<{ w: Winner; p: StoredPosition; walletId: string; txnId: string; balanceAfter: number }> = [];
            for (const w of winners) {
              const p = positions.get(w.ticket.positionId);
              const wallet = payees.get(w.ticket.userId);
              if (!p || !wallet) throw new SettleAbort(`MISSING:${w.ticket.serial}`);
              wallet.balance += a.share;
              const txnId = `txn_${randomId(12)}`;
              payouts.push({ w, p, walletId: wallet.id, txnId, balanceAfter: wallet.balance });
              paid.push({ userId: p.userId, txnId, share: a.share });
              ticketRows.push({ id: w.ticket.id, score: w.score, won: true, payout: a.share, frozenReason: w.hold });
            }
            const written = await db.txn.createMany(payouts.map(({ w, p, walletId, txnId, balanceAfter }): StoredTxn => ({
                id: txnId, walletId, userId: p.userId, type: "BET_PAYOUT", status: "CONFIRMED",
                amount: a.share, fee: 0, taxWithheld: 0, balanceAfter, currency: "TZS",
                provider: "INTERNAL", providerRef: null, msisdn: null,
                description: `Millionea ${week.code} · ${w.ticket.serial} · ${f.basis === "TOP_SCORE" ? `top score ${w.score} of ${MAIN_COUNT}` : `${MAIN_COUNT} of ${MAIN_COUNT}`}${w.hold ? " · held for review" : ""}`,
                positionId: p.id,
                // SEAM:markerMaswaliWin — a desk account's share is held above, never marked as the house's stake.
                ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
                amlReason: null, createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
              })), mtx);
            if (written !== payouts.length) throw new SettleAbort(`TXNS:${written}:${payouts.length}`);
            if (f.basis === "TOP_SCORE") {
              // MR-30 · the sunset: the whole jackpot into the final week's pool, then a settlement with nothing to claim.
              lines.push(...maswaliSunsetEntries({ marketId, amount: f.rolloverIn }));
              lines.push(...maswaliSettlementEntries({ marketId, sales: f.sales + f.rolloverIn, rolloverIn: 0, topUp: a.U, fee: a.F,
                traLevy: a.tra, gbtLevy: a.gbt, winners: paid, carryOut: a.carryOut, jackpot }));
            } else {
              lines.push(...maswaliSettlementEntries({ marketId, sales: f.sales, rolloverIn: f.rolloverIn, topUp: a.U, fee: a.F,
                traLevy: a.tra, gbtLevy: a.gbt, winners: paid, carryOut: a.carryOut, jackpot }));
            }
          }
          for (const l of losers) ticketRows.push({ id: l.ticket.id, score: l.score, won: false, payout: 0 });
          // Every winner is WIN by now, so the positions still OPEN are exactly the losers (R9: no list to exclude).
          const lost = await positionStore.settleMaswaliLosers(marketId, settledAt, mtx);
          if (lost !== losers.length) throw new SettleAbort(`LOSERS:${lost}:${losers.length}`);
          const graded = await ticketStore.settleWeekTickets(week.id, ticketRows, mtx ?? undefined);
          if (graded !== ticketRows.length) throw new SettleAbort(`TICKETS:${graded}:${ticketRows.length}`);
          for (let i = 0; i < lines.length; i += LINES_PER_POST) await postMaswaliLines(groupId, lines.slice(i, i + LINES_PER_POST), mtx);
          const stamped = await weekStore.stampSettlement(week.id, stamp, mtx ?? undefined);
          if (!stamped) throw new SettleAbort("STAMP");
          // ⛔ The market write takes the market lock's OWN transaction — the one `afterCommit` waits for (results-freshness C.4).
          await marketStore.stamp(marketId, {
            status: "RESOLVED", settledAt, updatedAt: settledAt,
            resolutionEvidence: `Maswali Millionea week ${week.code} settled: ${a.k} winning ticket(s)${f.basis === "TOP_SCORE" ? ` at the top score ${f.winningScore} of ${MAIN_COUNT} (the final week)` : ""}.`,
          } as never, tx);
          await seams.beforeCommit?.("release");
          afterCommit(tx, () => {
            if (!f.carryClaimed) {
              audit({ category: "ADMIN", action: "maswali.week.carry_claimed", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
                payload: { code: week.code, rolloverIn: f.rolloverIn } });
            }
            audit({ category: "WALLET", action: "maswali.week.settled", actorId: input.releasedBy, targetType: "MaswaliCycle", targetId: week.id, payload: {
              code: week.code, marketId, groupId, basis: f.basis, winningScore: f.winningScore, sales: f.sales, rolloverIn: f.rolloverIn, arithmetic: a,
              held: f.held, digest: f.digest,
            } });
          });
        });
        // The week as this transaction wrote it: the stand-in should the read after the commit fail (R4c).
        return { ok: true, week: { ...week, ...stamp, rolloverIn: f.rolloverIn } };
      });
    };
    // ⭐ S7-F8 · section after section until one answers: each its own transaction of the lock, inside its own budget.
    const out = await (async (): Promise<Out> => {
      for (let section = 0; ; section++) {
        if (section > 0) await seams.betweenHoldSections?.(section);
        const asked = Date.now();
        const r = await withLock(MASWALI_CHAIN_LOCK, () => inSection(asked));
        if (r !== "MORE") return r;
      }
    })();
    if (!out.ok) {
      await liftHoldsIfClear(heldAccounts, `Millionea ${first.code} · the release did not complete`);
      return out;
    }
    if (out.already) {
      // R6 · belt and braces: an `already` answer lifts each of this week's held winners' holds that no held share stands
      // behind — one placed before the week was found settled, or one a stopped process left — exactly as a refusal does.
      await liftHoldsIfClear(heldAccounts, `Millionea ${first.code} · already settled`);
      return out;
    }
    invalidateMillioneaRegisterWeek(first.code); // The money transaction has committed; a read begun earlier cannot refill it.
    // ⭐ R4c · AFTER THE COMMIT. Read inside the lock, Postgres answers the week as it was before this transaction (still
    //    RESOLVING, its figures empty) — so the week is read here, and the float check is handed the paid total the
    //    settlement committed (the figure `stampSettlement` wrote), never a row from inside the lock. Nothing after the
    //    commit may report the release as failed: a read that fails here leaves the written figures standing in.
    let settled = out.week;
    try {
      settled = (await weekStore.get(input.weekId)) ?? out.week;
    } catch (err) {
      console.error(`[maswali-settlement] week ${first.code} settled, but its row could not be re-read: ${(err as Error)?.message ?? err}`);
    }
    void floatCheck({ weekId: first.id, code: first.code, paid: out.week.paidTotal ?? 0 }, input.readFloat);
    return { ok: true, week: settled };
  } catch (err) {
    // R6 · rolled back, and the holds above committed on their own: each is lifted where no held share stands behind it.
    await liftHoldsIfClear(heldAccounts, `Millionea ${first.code} · the release rolled back`);
    if (err instanceof SettleAbort) {
      if (err.why.startsWith("GUARANTEE:")) {
        const [, held, need] = err.why.split(":");
        // ⛔ CRITICAL: the floor cannot be paid. Nothing moved; the Owner funds the guarantee and accounting releases again.
        console.error(`[maswali-settlement] CRITICAL week ${first.code}: the guarantee holds ${held} and the top-up needs ${need}. Nothing was paid.`);
        audit({ category: "COMPLIANCE", action: "maswali.settlement.guarantee_short", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: first.id,
          payload: { code: first.code, held, need, severity: "CRITICAL" } });
        return refuse(`The guarantee holds less than this week's top-up (TZS ${need}). Nothing was paid: the Owner funds the guarantee, then release again.`);
      }
      if (err.why.startsWith("JACKPOT:")) {
        const [, holds, claimed] = err.why.split(":");
        // ⛔ CRITICAL (R3): the jackpot holds less than the carry this week would draw. Nothing moved; the ledger and the
        //    week's carry are reconciled before it releases again.
        console.error(`[maswali-settlement] CRITICAL week ${first.code}: the jackpot holds ${holds}, below the carry of ${claimed}. Nothing was paid.`);
        audit({ category: "COMPLIANCE", action: "maswali.settlement.jackpot_short", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: first.id,
          payload: { code: first.code, jackpot: holds, rolloverIn: claimed, severity: "CRITICAL" } });
        return refuse(`The jackpot holds less than the carry this week claims (TZS ${claimed}); nothing was paid.`);
      }
      console.error(`[maswali-settlement] week ${first.code} rolled back: ${err.why}`);
      return refuse(`The settlement rolled back (${err.why}); nothing was paid. Prepare it again.`);
    }
    throw err;
  }
}

/** The headroom the payout float keeps after a week's shares, below which accounting is told before players withdraw. */
export const FLOAT_ALERT_BUFFER_TZS = 500_000;

/**
 * MB-11 · after a payout, is the disbursement float deep enough for the winners to withdraw? A read, never a block (the
 * shares are credited; the float is topped up by Finance). Records an alert when Σ shares exceeds the float minus the
 * buffer, and ⭐ S7-F2 its own when the float cannot be read (fail closed: never silence; the console raises both).
 * ⭐ R4c · `paid` is the total the settlement committed, handed over after the commit — never a row read in the lock.
 */
async function floatCheck(week: { weekId: string; code: string; paid: number }, readFloat?: () => Promise<{ balance: number } | null>): Promise<void> {
  try {
    const paid = week.paid;
    if (paid <= 0) return;
    const float = await (readFloat ?? (async () => (await import("./payments")).getFloatBalance()))().catch(() => null);
    const action = !float ? "maswali.settlement.float_unread" : paid > float.balance - FLOAT_ALERT_BUFFER_TZS ? "maswali.settlement.float_low" : null;
    if (action) {
      console.error(`[maswali-settlement] week ${week.code} paid ${paid}; the payout float ${float ? `holds ${float.balance}` : "could not be read"}.`);
      audit({ category: "COMPLIANCE", action, actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.weekId,
        payload: { code: week.code, paid, float: float?.balance ?? null, buffer: FLOAT_ALERT_BUFFER_TZS } });
    }
  } catch { /* a read about money already paid never surfaces as the payment failing */ }
}

// ── A HELD SHARE (MB-43, MB-74, OD-07): Compliance holds, releases or forfeits it ────────────────────

export const FORFEIT_SHARE_WORD = "FORFEIT SHARE";
const FORFEITED = "forfeited · ";
const isHeld = (t: StoredTicket) => t.frozenReason != null && !t.frozenReason.startsWith(FORFEITED);

/** A settled winning ticket, or the reason the act cannot apply to it. S7-F9 · one whose share its record lacks is still PAID. */
async function winningTicket(ticketId: string): Promise<{ ok: true; ticket: StoredTicket; week: StoredWeek } | Refused> {
  const ticket = await ticketStore.get(ticketId);
  if (!ticket) return refuse("No such ticket.");
  if (ticket.status !== "SETTLED" || ticket.won !== true || (Number.isFinite(ticket.payout) && !((ticket.payout as number) > 0))) return refuse(`Ticket ${ticket.serial} is not a paid winning ticket.`);
  const week = await weekStore.get(ticket.cycleId);
  if (!week) return refuse("The ticket's week is missing.");
  return { ok: true, ticket, week };
}

/**
 * ⭐ A MILLIONEA HOLD (`MILLIONEA_SHARE`), placed by a caller that holds `maswali:chain`. It runs OUTSIDE that lock's
 * transaction (`runOutsideLock`): the freeze takes `wallet:<id>` in a transaction of its own and lets it go once the hold
 * is written, so a winner's wallet is never locked for the rest of a settlement. The order is still chain → wallet (the
 * caller waits for it under the chain lock), and nothing takes the chain lock while it holds a wallet lock, so the wait
 * cannot deadlock. The hold commits on its own either way (`addWalletFreeze` writes without a transaction), which is why
 * a caller that then refuses or rolls back lifts it again.
 */
function holdWallet(userId: string, meta: Parameters<typeof addWalletFreeze>[2]): ReturnType<typeof addWalletFreeze> {
  return runOutsideLock(() => addWalletFreeze(userId, "MILLIONEA_SHARE", meta));
}

/**
 * The wallet's Millionea hold is lifted only when none of the player's shares is still held — after a release or a
 * forfeit, after a settlement or a hold that did not complete, and by the heal. ⛔ R6 · UNDER `maswali:chain` (re-entrant
 * for a caller that holds it): every hold of this reason is placed under that lock and keeps it until its held share
 * commits, so a lift can never read "nothing held" while a held share is landing. It reads COMMITTED tickets, so a caller
 * whose own ticket write is still uncommitted lifts after its commit. True when it lifted a hold. S7-F8 · one account
 * through the one lifter (`liftHoldsIfClear`), so a single lift and thousands follow the same rule.
 */
async function liftHoldIfClear(userId: string, actorId: string | null, note: string): Promise<boolean> {
  return (await liftHoldsIfClear([userId], note, actorId)).includes(userId);
}

/** S7-F8 · accounts the lift reads at a time: ONE wallet read and ONE held-share read for each this many. */
const LIFT_BATCH = 500;

/**
 * S7-F8 · of `userIds`, the accounts with a share still held (`isHeld`): one read per 5,000 on Postgres, the same rule as
 * `isHeld` in SQL (a reason, and not a forfeit's). A read that fails THROWS: a lift that cannot see the held shares lifts
 * nothing (the safe side).
 */
async function heldShareHolders(userIds: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const c = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? prisma() : null;
  if (c) {
    for (let i = 0; i < userIds.length; i += 5_000) {
      const rows = await c.maswaliTicket.findMany({
        where: { userId: { in: userIds.slice(i, i + 5_000) }, frozenReason: { not: null }, NOT: { frozenReason: { startsWith: FORFEITED } } },
        select: { userId: true }, distinct: ["userId"],
      });
      for (const r of rows) out.add(r.userId);
    }
    return out;
  }
  for (const userId of userIds) if ((await ticketStore.listForUser(userId)).some(isHeld)) out.add(userId);
  return out;
}

/** Every account whose wallet carries Millionea's hold — the heal's candidates, read where the hold is stored. */
async function accountsHeldForMillionea(): Promise<string[]> {
  const c = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? prisma() : null;
  if (c) return (await c.wallet.findMany({ where: { freezeReasons: { has: "MILLIONEA_SHARE" } }, select: { userId: true } })).map((w) => w.userId);
  return (await db.wallet.listAll()).filter((w) => currentFreezeReasons(w).includes("MILLIONEA_SHARE")).map((w) => w.userId);
}

/**
 * ⭐ R6 · THE HEAL FOR A STRAY HOLD: every wallet carrying `MILLIONEA_SHARE` with no held share behind it has the hold lifted
 * — under the chain lock, in its sections (`liftHoldsIfClear`, each lift recorded as `wallet.freeze_removed`) — and a lift
 * is recorded for the heal as a whole. A stray hold is what a stopped process leaves between a hold and its commit, between
 * an un-hold and its lift, or in the middle of a release's lifts; no Millionea act can lift it, because release and forfeit
 * both need a held ticket. A hold with a held share behind it is never touched, and a wallet it cannot re-check stays held
 * (the safe side) until the next run.
 */
export async function healStrayMillioneaHolds(): Promise<{ checked: number; lifted: string[] }> {
  const candidates = await accountsHeldForMillionea();
  const lifted = await liftHoldsIfClear(candidates, "Millionea · a hold with no held share behind it, lifted by the heal");
  if (lifted.length > 0) {
    audit({ category: "COMPLIANCE", action: "maswali.share.stray_holds_lifted", actorId: SYSTEM, targetType: "MaswaliHold", targetId: "stray",
      payload: { checked: candidates.length, lifted } });
  }
  return { checked: candidates.length, lifted };
}

/**
 * ⭐ R6 · S7-F8 · THE ONE LIFTER, IN SECTIONS OF THE CHAIN LOCK — the holds' twin. After an act that refused or rolled back,
 * in the heal, and for a single share's act: every account of `userIds` whose wallet carries the Millionea hold with no held
 * share behind it has the hold lifted. Each section holds `maswali:chain` (as every hold and lift of this reason does) and
 * works through the accounts in batches: ONE read of the batch's wallets (one without the hold is passed by) and ONE of its
 * held shares (a held share keeps its hold), both under this lock, where no hold, lift or held share can change; then each
 * hold lifted (`removeWalletFreeze`: it records each lift once, and a hold already gone writes and records nothing). Its
 * `wallet:` lock JOINS the section's transaction, as the one-account lift always did — no transaction of its own per
 * account (S16 measured the lift that opened one per account at 44 ms an account behind a release's 7,000 holds), and no
 * wallet stays locked longer than the section's own HOLD_SECTION_MS. A section lifts for at most that long (at least one
 * account), then lets the lock go, and the next reads again. A stop between sections leaves each account lifted (written
 * and recorded) or still held, never half; running it again — the act's next attempt, or the heal — lifts only what is
 * left, each once. A failed read stops the lift with the rest held (the safe side); a failed lift is logged and the next
 * goes on. Returns the accounts it lifted.
 */
async function liftHoldsIfClear(userIds: readonly string[], note: string, actorId: string | null = null): Promise<string[]> {
  const queue = [...new Set(userIds)];
  const lifted: string[] = [];
  let at = 0;
  try {
    for (let section = 0; at < queue.length; section++) {
      if (section > 0) await seams.betweenLiftSections?.(section);
      const asked = Date.now();
      await withLock(MASWALI_CHAIN_LOCK, async () => {
        const share = seams.holdSectionMs ?? HOLD_SECTION_MS;
        let doneHere = 0;
        while (at < queue.length) {
          const batch = queue.slice(at, at + LIFT_BATCH);
          const carrying = new Set((await db.wallet.findByUserIds(batch))
            .filter((wallet) => currentFreezeReasons(wallet).includes("MILLIONEA_SHARE")).map((wallet) => wallet.userId));
          const keep = await heldShareHolders([...carrying]);
          for (const userId of batch) {
            if (doneHere > 0 && Date.now() - asked >= share) return;
            at++;
            doneHere++;
            if (!carrying.has(userId) || keep.has(userId)) continue;
            try {
              const r = await removeWalletFreeze(userId, "MILLIONEA_SHARE", { actorId, note });
              if (r.ok && r.changed) lifted.push(userId);
            } catch (err) {
              // The hold stays — the safe side: the money cannot move. The act's next attempt, or the heal, re-checks it.
              console.error(`[maswali-settlement] the Millionea hold on ${userId} could not be lifted: ${(err as Error)?.message ?? err}`);
            }
          }
        }
      });
    }
  } catch (err) {
    // A section's reads or its lock failed, or a stop arrived between sections: every hold not yet lifted stays (the safe
    // side) for the act's next attempt or the heal.
    console.error(`[maswali-settlement] ${queue.length - at} Millionea hold(s) were not re-checked: ${(err as Error)?.message ?? err}`);
  }
  return lifted;
}

/**
 * Compliance HOLDS a paid share found to need review after settlement — a reversed deposit funded the ticket (MB-74), or
 * a disqualification surfaced late (MB-43). The wallet is held (`MILLIONEA_SHARE`); nothing moves. ⛔ Never a re-run.
 * ⭐ R6 · under `maswali:chain`, as every hold and lift of this reason. ⭐ R8 · the ticket's mark joins the lock's
 * transaction, so a failed commit leaves the ticket unheld — and the hold placed for it (which commits on its own) is
 * lifted again where no other share is held.
 */
export async function holdMaswaliShare(input: { ticketId: string; officerId: string; reason: string }): Promise<{ ok: true } | Refused> {
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 300) return refuse("Write why the share is held (5–300 characters).");
  const first = await winningTicket(input.ticketId);
  if (!first.ok) return first;
  const userId = first.ticket.userId;
  try {
    return await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<{ ok: true } | Refused> => {
      const w = await winningTicket(input.ticketId);
      if (!w.ok) return w;
      if (w.ticket.frozenReason) return refuse(`Ticket ${w.ticket.serial} is already ${isHeld(w.ticket) ? "held" : "forfeited"}.`);
      const f = await holdWallet(userId, { actorId: input.officerId, note: `Millionea ${w.week.code} · ${w.ticket.serial} · ${reason}`, ref: { ticketId: w.ticket.id } });
      if (!f.ok) return refuse(f.error);
      await ticketStore.patch(w.ticket.id, { frozenReason: `compliance · ${reason}` }, tx ?? undefined);
      await seams.beforeCommit?.("hold");
      afterCommit(tx, () => {
        audit({ category: "COMPLIANCE", action: "maswali.share.held", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
          payload: { code: w.week.code, serial: w.ticket.serial, payout: w.ticket.payout, reason } });
      });
      return { ok: true };
    });
  } catch (err) {
    await liftHoldsIfClear([userId], `Millionea ${first.week.code} · ${first.ticket.serial} · the hold did not commit`);
    throw err;
  }
}

/**
 * Compliance RELEASES a held share: the player keeps it, and the wallet hold lifts once no other share is held.
 * ⭐ R6 · under `maswali:chain`, so the lift never runs while a settlement is landing another held share for the same
 * player. The un-hold commits on its own before the lift reads it; a lift that then fails leaves the wallet held.
 */
export async function releaseMaswaliShare(input: { ticketId: string; officerId: string; note: string }): Promise<{ ok: true } | Refused> {
  const note = input.note.trim();
  if (note.length < 5 || note.length > 300) return refuse("Write the decision (5–300 characters).");
  return withLock(MASWALI_CHAIN_LOCK, async (): Promise<{ ok: true } | Refused> => {
    const w = await winningTicket(input.ticketId);
    if (!w.ok) return w;
    if (!isHeld(w.ticket)) return refuse(`Ticket ${w.ticket.serial} is not held.`);
    await ticketStore.patch(w.ticket.id, { frozenReason: null });
    await liftHoldIfClear(w.ticket.userId, input.officerId, `Millionea ${w.week.code} · ${w.ticket.serial} released · ${note}`);
    audit({ category: "COMPLIANCE", action: "maswali.share.released", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
      payload: { code: w.week.code, serial: w.ticket.serial, payout: w.ticket.payout, note } });
    return { ok: true };
  });
}

/**
 * ⭐ Compliance FORFEITS a held share (OD-07): the whole share leaves the player's wallet and goes back to the JACKPOT,
 * for the players of the next winning week — ⛔ never to the house; the fee and levies stay as booked; no other winner is
 * re-paid. One transaction: the debit, its ADJUSTMENT_DEBIT row, the ledger group and the ticket's forfeited mark (R8: a
 * failed commit leaves neither half). Refused when the share is not on record (S7-F9: never as 0), or when the wallet no
 * longer holds it (held too late: Compliance's recovery outside this act, never a negative balance). Under `maswali:chain`
 * (the jackpot moves, so no carry is claimed mid-forfeit), then `wallet:<id>`; the hold lifts after the commit, chain-locked.
 */
export async function forfeitMaswaliShare(input: { ticketId: string; officerId: string; typed: string; reason: string }): Promise<{ ok: true } | Refused> {
  if (input.typed.trim() !== FORFEIT_SHARE_WORD) return refuse(`Type ${FORFEIT_SHARE_WORD} to forfeit the share.`);
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 300) return refuse("Write the decision (5–300 characters).");
  const first = await winningTicket(input.ticketId);
  if (!first.ok) return first;
  const userId = first.ticket.userId;
  const out = await withLock(MASWALI_CHAIN_LOCK, () => withLock(`wallet:${userId}`, async (): Promise<{ ok: true; amount: number } | Refused> => {
    const w = await winningTicket(input.ticketId);
    if (!w.ok) return w;
    if (!isHeld(w.ticket)) return refuse(`Ticket ${w.ticket.serial} is not held; only a held share is forfeited.`);
    const amount = Number.isFinite(w.ticket.payout) ? Math.round(w.ticket.payout as number) : null; // S7-F9 · never read as 0
    if (amount === null) return refuse(`Ticket ${w.ticket.serial}'s share is not on record; nothing was forfeited.`);
    const [p, wallet] = [(await positionStore.getMany([w.ticket.positionId]))[0], await db.wallet.findByUserId(userId)];
    if (!p || !wallet) return refuse("The ticket's position or wallet is missing.");
    if (wallet.balance < amount) return refuse(`The wallet holds ${formatTzs(wallet.balance)}, less than the share; nothing was forfeited.`);
    const txnId = `txn_${randomId(12)}`;
    const at = new Date().toISOString();
    try {
      await withMoneyTx(async (tx) => {
        const debited = await db.wallet.adjust(wallet.id, { balance: -amount }, { requireBalanceGte: amount }, tx);
        if (!debited) throw new SettleAbort("FORFEIT_FUNDS");
        await db.txn.create({
          id: txnId, walletId: wallet.id, userId, type: "ADJUSTMENT_DEBIT", status: "CONFIRMED", amount: -amount, fee: 0, taxWithheld: 0,
          balanceAfter: debited.balance, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `Millionea share forfeited · ${w.week.code} · ${w.ticket.serial} · returned to the jackpot`,
          positionId: p.id,
          // SEAM:markerMaswaliForfeit — a ticket position is never a house stake, kept so Ruling 232 has no exception.
          ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
          amlReason: null, createdAt: at, updatedAt: at, completedAt: at,
        }, tx);
        await postMaswaliLines(`maswali_forfeit_${txnId}`, maswaliForfeitReturnEntries({ marketId: p.marketId, userId, txnId, amount, jackpot: maswaliJackpotOf(w.week.visibility) }), tx);
        // ⭐ R8 · the mark joins the debit's transaction: a commit that fails leaves the share held and the wallet whole.
        await ticketStore.patch(w.ticket.id, { frozenReason: `${FORFEITED}${reason}` }, tx ?? undefined);
        await seams.beforeCommit?.("forfeit");
        afterCommit(tx, () => {
          audit({ category: "COMPLIANCE", action: "maswali.share.forfeited", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
            payload: { code: w.week.code, serial: w.ticket.serial, amount, txnId, reason } });
        });
      });
    } catch (err) {
      if (err instanceof SettleAbort) return refuse("The wallet no longer holds the share; nothing was forfeited.");
      throw err;
    }
    return { ok: true, amount };
  }));
  if (!out.ok) return out;
  // After the commit, so the lift reads the forfeited mark it has to see (R6: under the chain lock again).
  await seams.beforeLift?.();
  await liftHoldIfClear(userId, input.officerId, `Millionea ${first.week.code} · ${first.ticket.serial} forfeited`);
  return { ok: true };
}

// ── MB-74 · A WINNER WHOSE DEPOSIT THE PROVIDER CONTRADICTED ────────────────────────────────────────

/**
 * ⭐ MB-74 · the winners whose accounts carry a credited deposit the payment provider has since contradicted — a reversal,
 * or another amount, which the webhook marks for review and leaves in the wallet (`settlePaymentWebhook`). Their shares
 * are credited in full and HELD for Compliance (OD-07: frozen, then released or forfeited to the jackpot), never paid free:
 * the contradicted money may be what bought the ticket, and money is not traced shilling by shilling.
 * ONE read for every winner, never one per winner (R9's settlement budget), answered as a lookup. ⛔ Fails CLOSED, as the
 * desk check does (R10b): a read that fails holds every winner's share in its own words, and Compliance releases them.
 * The ticket's grade, the commitment and the sales are untouched: the ticket stays in the week (MB-74).
 */
async function depositHolds(userIds: readonly string[]): Promise<(userId: string) => HoldReason | null> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return () => null;
  try {
    const { DEPOSIT_STATUS_REVIEW_MARK, hasDepositStatusReview } = await import("../wallet/deposit-review");
    const flagged = new Set<string>();
    const c = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? prisma() : null;
    if (c) {
      for (let i = 0; i < unique.length; i += 5_000) {
        const rows = await c.transaction.findMany({
          where: { userId: { in: unique.slice(i, i + 5_000) }, type: "DEPOSIT", status: "CONFIRMED", providerStatus: DEPOSIT_STATUS_REVIEW_MARK },
          select: { userId: true }, distinct: ["userId"],
        });
        for (const r of rows) flagged.add(r.userId);
      }
    } else {
      for (const userId of unique) {
        const deposits = await db.txn.findByUserTypes(userId, ["DEPOSIT"], 10_000);
        if (deposits.some((t) => t.status === "CONFIRMED" && hasDepositStatusReview(t))) flagged.add(userId);
      }
    }
    return (userId) => (flagged.has(userId) ? "deposit under review" : null);
  } catch (err) {
    console.error("[maswali-settlement] the winners' deposits could not be checked, so every share is held:", (err as Error)?.message ?? err);
    return () => "deposit check unreadable";
  }
}

// ── MB-74 · RD.5 · A DEPOSIT CONTRADICTED AFTER ITS WINNER WAS PAID ─────────────────────────────────────

/** A share's hold record — Compliance's and this one's: on a reversal hold its payload names the deposit it holds for. */
const SHARE_HELD_ACTION = "maswali.share.held";
const DEPOSIT_HOLD: HoldReason = "deposit under review";

/**
 * ⭐ MB-74 · RD.5 (MASWALI-BUILD S7-F9; the lead's ruling of 2026-10-22). A credited deposit the provider contradicts AFTER a
 * week paid its winner: every PAID winning share of that account whose ticket was bought at or after the deposit was
 * credited — what that money may have bought — and that is not held or forfeited already is HELD for Compliance at once,
 * in the release's own words ("deposit under review"), as a winner whose deposit was contradicted BEFORE the release is
 * held there (`depositHolds`). A share whose ticket was bought before the deposit was credited is left alone: that money
 * cannot have bought it. A credit time that cannot be read holds every paid share (the safe side).
 * ⭐ The reversal is the trigger: `settlePaymentWebhook` calls this where it first marks a credited deposit for review, and
 *    the nightly heal (`healReversedDepositHolds`) offers it every marked deposit again, so a stop between the mark and the
 *    hold is made good. IDEMPOTENT: a held share is passed by, and a share held once FOR THIS DEPOSIT — whatever Compliance
 *    decided since — is never held for it again. A read of those records that fails or stops short holds anyway (the safe
 *    side: Compliance releases it again).
 * ⛔ NOTHING MOVES. The wallet takes the Millionea hold and the ticket its mark; release or forfeit is Compliance's (OD-07),
 *    and a forfeit is refused where the wallet no longer holds the share — never a negative balance.
 * ⭐ R6 · under `maswali:chain`, as every hold of this reason: the tickets' marks join the lock's transaction, each hold is
 *    recorded after the commit with the deposit's id, and a hold placed for marks that did not commit is lifted again where
 *    no other share is held (R8, as `holdMaswaliShare`). Returns the tickets it held.
 */
export async function holdSharesForReversedDeposit(depositTxnId: string): Promise<{ held: string[] }> {
  const { hasDepositStatusReview } = await import("../wallet/deposit-review");
  const d = await db.txn.findById(depositTxnId);
  if (!d || d.type !== "DEPOSIT" || d.status !== "CONFIRMED" || !hasDepositStatusReview(d)) return { held: [] };
  const credited = Date.parse(d.completedAt ?? d.createdAt);
  const creditMs = Number.isFinite(credited) ? credited : -Infinity;
  /** A paid, unheld winning share whose ticket this deposit's money may have bought (a purchase time unread: it may have).
   *  ⛔ S7-F9 · a share its record lacks counts as paid — held, never passed over as 0; only a record of 0 paid is passed. */
  const mayHaveBought = (t: StoredTicket) => t.status === "SETTLED" && t.won === true && !t.frozenReason
    && !(Number.isFinite(t.payout) && (t.payout as number) <= 0)
    && !(Date.parse(t.createdAt) < creditMs);
  const userId = d.userId;
  const held: string[] = [];
  try {
    // ⛔ THE SHARES ARE READ UNDER THE CHAIN LOCK, never before it: a release in flight either committed before this lock was
    //    taken — its shares are read here, paid, and held — or runs after it and reads this deposit's mark itself
    //    (`depositHolds`). Read before the lock, a release landing in between paid the share free and nothing held it.
    await withLock(MASWALI_CHAIN_LOCK, async (tx) => {
      const candidates = (await ticketStore.listForUser(userId)).filter(mayHaveBought);
      if (candidates.length === 0) return;
      let done = new Set<string>();
      try {
        const before = await getAuditForTargetsDurable({ targetType: "MaswaliTicket", targetIds: candidates.map((t) => t.id),
          actions: [SHARE_HELD_ACTION], sinceIso: new Date(Number.isFinite(creditMs) ? creditMs : 0).toISOString(), limit: 1_000 });
        if (!before.truncated) {
          done = new Set(before.entries.filter((e) => (e.payload as { deposit?: unknown } | undefined)?.deposit === depositTxnId)
            .map((e) => e.targetId ?? ""));
        }
      } catch (err) {
        console.error(`[maswali-settlement] deposit ${depositTxnId}'s earlier holds could not be read, so every share it may have bought is held:`, (err as Error)?.message ?? err);
      }
      const todo = candidates.filter((t) => !done.has(t.id));
      const codes = new Map<string, string>();
      for (const t of todo) {
        if (!codes.has(t.cycleId)) codes.set(t.cycleId, (await weekStore.get(t.cycleId))?.code ?? t.cycleId);
        const code = codes.get(t.cycleId) ?? t.cycleId;
        const f = await holdWallet(userId, { actorId: SYSTEM, note: `Millionea ${code} · ${t.serial} · ${DEPOSIT_HOLD} (deposit ${depositTxnId}, contradicted after the payout)`, ref: { ticketId: t.id } });
        if (!f.ok) throw new Error(f.error);
        await ticketStore.patch(t.id, { frozenReason: DEPOSIT_HOLD }, tx ?? undefined);
        held.push(t.id);
        afterCommit(tx, () => {
          audit({ category: "COMPLIANCE", action: SHARE_HELD_ACTION, actorId: SYSTEM, targetType: "MaswaliTicket", targetId: t.id,
            payload: { code, serial: t.serial, payout: t.payout, reason: DEPOSIT_HOLD, deposit: depositTxnId, trigger: "deposit contradicted after the payout" } });
        });
      }
      await seams.beforeCommit?.("hold");
    });
  } catch (err) {
    await liftHoldsIfClear([userId], `Millionea · the holds for deposit ${depositTxnId} did not commit`);
    throw err;
  }
  return { held };
}

/**
 * ⭐ RD.5's HEAL (S7-F9): every credited deposit marked for review is offered to `holdSharesForReversedDeposit` again — a
 * share a stopped process left unheld between the mark and its hold is held, once; a share already held for that deposit is
 * never held again. Nightly, before the stray-hold heal (`lifecycle.ts`). A deposit that fails is logged; the rest go on.
 */
export async function healReversedDepositHolds(): Promise<{ deposits: number; held: string[] }> {
  const { DEPOSIT_STATUS_REVIEW_MARK, hasDepositStatusReview } = await import("../wallet/deposit-review");
  const c = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? prisma() : null;
  const ids = c
    ? (await c.transaction.findMany({ where: { type: "DEPOSIT", status: "CONFIRMED", providerStatus: DEPOSIT_STATUS_REVIEW_MARK }, select: { id: true } })).map((r) => r.id)
    : (await db.txn.listByStatus("CONFIRMED")).filter((t) => t.type === "DEPOSIT" && hasDepositStatusReview(t)).map((t) => t.id);
  const held: string[] = [];
  for (const id of ids) {
    try { held.push(...(await holdSharesForReversedDeposit(id)).held); }
    catch (err) { console.error(`[maswali-settlement] the heal could not hold deposit ${id}'s shares:`, (err as Error)?.message ?? err); }
  }
  if (held.length > 0) {
    audit({ category: "COMPLIANCE", action: "maswali.share.reversal_holds_healed", actorId: SYSTEM, targetType: "MaswaliHold", targetId: "reversal",
      payload: { deposits: ids.length, held } });
  }
  return { deposits: ids.length, held };
}
