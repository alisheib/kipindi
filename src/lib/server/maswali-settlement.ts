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
 * ⛔ NO NOTICE, EMAIL OR PUSH FROM HERE (S6 writes Millionea's own), and no wagering, recruit or house accrual (OD-20/27).
 */
import { createHash } from "node:crypto";
import { audit } from "./audit";
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
import { db } from "./store";
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

/** Why a winning share is held for Compliance (MB-43), or null when it is paid free. */
export type HoldReason = "staff account" | "house desk account" | "desk check unreadable" | "account suspended" | "account closed";

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
async function holdFor(userId: string): Promise<HoldReason | null> {
  const user = await db.user.findById(userId);
  if (!user) return "account closed";
  if (isStaffRole(user.role)) return "staff account";
  // R10b · fail CLOSED: a desk check that cannot be read holds the share (Compliance releases it), never pays it free
  // because the lookup failed — and says so in its own words, never as a desk designation the account may not have.
  const desk = await houseBotStore.findLiveByUserId(userId).catch((err: unknown) => {
    console.error("[maswali-settlement] a winner's desk check could not be read, so the share is held:", (err as Error)?.message ?? err);
    return "unreadable" as const;
  });
  if (desk === "unreadable") return "desk check unreadable";
  if (desk) return "house desk account";
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

  const winners: Winner[] = [];
  for (const g of winnersGraded) winners.push({ ...g, hold: await holdFor(g.ticket.userId) });

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
  /** A forfeit, committed, before its lift. */
  beforeLift?: () => Promise<void>;
  /** The last statement of a release's, a forfeit's or a hold's transaction. */
  beforeCommit?: (act: "release" | "forfeit" | "hold") => Promise<void>;
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
  // R6 · the accounts this release holds: one that does not complete lifts each hold no held share stands behind.
  const heldAccounts = pre.c.winners.filter((w) => w.hold).map((w) => w.ticket.userId);
  await seams.beforeChain?.();

  try {
    const out = await withLock(MASWALI_CHAIN_LOCK, async (): Promise<{ ok: true; week: StoredWeek; already?: boolean } | Refused> => {
      // ⛔ R6 · THE WEEK IS RE-READ UNDER THE CHAIN LOCK BEFORE ANY HOLD: a release that waited behind another finds the
      //    week it read RESOLVING already settled, and answers `already` without placing a hold no share would stand behind.
      const current = await weekStore.get(input.weekId);
      if (current?.state === "SETTLED") return { ok: true, week: current, already: true };
      // MR-3 · strictly in order: a week settles, and claims its carry, only once every earlier week of its line is terminal.
      const blocking = await carryBlocker(first);
      if (blocking) return refuse(`Week ${blocking.code} is not settled yet; the carry is claimed strictly in order (MR-3).`);
      // ⛔ THE HOLDS COME FIRST (MB-43), before any credit: a held winner's money is never spendable for an instant.
      //    ⭐ R6 · under the chain lock, which every lift of this reason takes too (`liftHoldIfClear`), so no lift can read
      //    "nothing held" between a hold and the commit of its held share; and before `market:`. Each hold commits on its
      //    own (`holdWallet`), so a release that then refuses or rolls back lifts it again (`liftHoldsIfClear`, below).
      for (const w of pre.c.winners) {
        if (!w.hold) continue;
        const f = await holdWallet(w.ticket.userId, {
          actorId: null, note: `Millionea ${first.code} · ${w.ticket.serial} · ${w.hold}`, ref: { ticketId: w.ticket.id, weekId: first.id },
        });
        if (!f.ok) return refuse(`A winner's wallet could not be held (${f.error}), so nothing was paid.`);
      }
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
            for (const userId of shares.keys()) {
              const wallet = await db.wallet.findByUserId(userId, mtx);
              if (!wallet) throw new SettleAbort(`MISSING:${userId}`);
              payees.set(userId, { id: wallet.id, balance: wallet.balance });
            }
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
            for (const [userId, n] of shares) {
              const wallet = payees.get(userId);
              const updated = wallet && a.share > 0 ? await db.wallet.adjust(wallet.id, { balance: n * a.share }, undefined, mtx) : null;
              if (!wallet || (a.share > 0 && !updated)) throw new SettleAbort(`WALLET:${userId}`);
              // The balance before this week's shares, read back from the credit itself (the row is locked by now).
              if (updated) wallet.balance = updated.balance - n * a.share;
            }
            const paid: Array<{ userId: string; txnId: string; share: number }> = [];
            for (const w of winners) {
              const p = positions.get(w.ticket.positionId);
              const wallet = payees.get(w.ticket.userId);
              if (!p || !wallet) throw new SettleAbort(`MISSING:${w.ticket.serial}`);
              wallet.balance += a.share;
              const txnId = `txn_${randomId(12)}`;
              await db.txn.create({
                id: txnId, walletId: wallet.id, userId: p.userId, type: "BET_PAYOUT", status: "CONFIRMED",
                amount: a.share, fee: 0, taxWithheld: 0, balanceAfter: wallet.balance, currency: "TZS",
                provider: "INTERNAL", providerRef: null, msisdn: null,
                description: `Millionea ${week.code} · ${w.ticket.serial} · ${f.basis === "TOP_SCORE" ? `top score ${w.score} of ${MAIN_COUNT}` : `${MAIN_COUNT} of ${MAIN_COUNT}`}${w.hold ? " · held for review" : ""}`,
                positionId: p.id,
                // SEAM:markerMaswaliWin — a desk account's share is held above, never marked as the house's stake.
                ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
                amlReason: null, createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
              }, mtx);
              paid.push({ userId: p.userId, txnId, share: a.share });
              ticketRows.push({ id: w.ticket.id, score: w.score, won: true, payout: a.share, frozenReason: w.hold });
            }
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
          await postMaswaliLines(groupId, lines, mtx);
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
    });
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
const FLOAT_ALERT_BUFFER_TZS = 500_000;

/**
 * MB-11 · after a payout, is the disbursement float deep enough for the winners to withdraw? A read, never a block (the
 * shares are credited; the float is topped up by Finance). Records an alert when Σ shares exceeds the float minus the
 * buffer; silent when the float cannot be read (the payments console already shows that). ⭐ R4c · `paid` is the total
 * the settlement committed, handed over after the commit — never a week row read inside the lock.
 */
async function floatCheck(week: { weekId: string; code: string; paid: number }, readFloat?: () => Promise<{ balance: number } | null>): Promise<void> {
  try {
    const paid = week.paid;
    if (paid <= 0) return;
    const float = readFloat ? await readFloat() : await (await import("./payments")).getFloatBalance();
    if (!float) return;
    if (paid > float.balance - FLOAT_ALERT_BUFFER_TZS) {
      console.error(`[maswali-settlement] week ${week.code} paid ${paid}; the payout float holds ${float.balance}.`);
      audit({ category: "COMPLIANCE", action: "maswali.settlement.float_low", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.weekId,
        payload: { code: week.code, paid, float: float.balance, buffer: FLOAT_ALERT_BUFFER_TZS } });
    }
  } catch { /* a read about money already paid never surfaces as the payment failing */ }
}

// ── A HELD SHARE (MB-43, MB-74, OD-07): Compliance holds, releases or forfeits it ────────────────────

export const FORFEIT_SHARE_WORD = "FORFEIT SHARE";
const FORFEITED = "forfeited · ";
const isHeld = (t: StoredTicket) => t.frozenReason != null && !t.frozenReason.startsWith(FORFEITED);

/** A settled winning ticket, or the reason the act cannot apply to it. */
async function winningTicket(ticketId: string): Promise<{ ok: true; ticket: StoredTicket; week: StoredWeek } | Refused> {
  const ticket = await ticketStore.get(ticketId);
  if (!ticket) return refuse("No such ticket.");
  if (ticket.status !== "SETTLED" || ticket.won !== true || !(ticket.payout && ticket.payout > 0)) return refuse(`Ticket ${ticket.serial} is not a paid winning ticket.`);
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
 * whose own ticket write is still uncommitted lifts after its commit. True when it lifted a hold.
 */
async function liftHoldIfClear(userId: string, actorId: string | null, note: string): Promise<boolean> {
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const still = (await ticketStore.listForUser(userId)).some(isHeld);
    if (still) return false;
    const r = await removeWalletFreeze(userId, "MILLIONEA_SHARE", { actorId, note });
    return r.ok && r.changed;
  });
}

/** Every account whose wallet carries Millionea's hold — the heal's candidates, read where the hold is stored. */
async function accountsHeldForMillionea(): Promise<string[]> {
  const c = hasDatabase() && process.env.USE_PRISMA_DAL !== "false" ? prisma() : null;
  if (c) return (await c.wallet.findMany({ where: { freezeReasons: { has: "MILLIONEA_SHARE" } }, select: { userId: true } })).map((w) => w.userId);
  return (await db.wallet.listAll()).filter((w) => currentFreezeReasons(w).includes("MILLIONEA_SHARE")).map((w) => w.userId);
}

/**
 * ⭐ R6 · THE HEAL FOR A STRAY HOLD: every wallet carrying `MILLIONEA_SHARE` with no held share behind it has the hold lifted
 * — each under the chain lock (`liftHoldIfClear`, recorded as `wallet.freeze_removed`) — and a lift is recorded for the
 * heal as a whole. A stray hold is what a stopped process leaves between a hold and its commit, or between an un-hold and
 * its lift; no Millionea act can lift it, because release and forfeit both need a held ticket. A hold with a held share
 * behind it is never touched, and a wallet it cannot re-check stays held (the safe side) until the next run.
 */
export async function healStrayMillioneaHolds(): Promise<{ checked: number; lifted: string[] }> {
  const candidates = await accountsHeldForMillionea();
  const lifted: string[] = [];
  for (const userId of candidates) {
    try {
      if (await liftHoldIfClear(userId, null, "Millionea · a hold with no held share behind it, lifted by the heal")) lifted.push(userId);
    } catch (err) {
      console.error(`[maswali-settlement] the heal could not re-check the Millionea hold on ${userId}: ${(err as Error)?.message ?? err}`);
    }
  }
  if (lifted.length > 0) {
    audit({ category: "COMPLIANCE", action: "maswali.share.stray_holds_lifted", actorId: SYSTEM, targetType: "MaswaliHold", targetId: "stray",
      payload: { checked: candidates.length, lifted } });
  }
  return { checked: candidates.length, lifted };
}

/** R6 · after an act that refused or rolled back: each account it held is lifted again where no held share stands behind it. */
async function liftHoldsIfClear(userIds: readonly string[], note: string): Promise<void> {
  for (const userId of new Set(userIds)) {
    try {
      await liftHoldIfClear(userId, null, note);
    } catch (err) {
      // The hold stays — the safe side: the money cannot move. The act's next attempt re-checks it.
      console.error(`[maswali-settlement] the Millionea hold on ${userId} could not be re-checked: ${(err as Error)?.message ?? err}`);
    }
  }
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
 * failed commit leaves neither half). Refused when the wallet no longer holds the share (it was held too late): that is a
 * recovery for Compliance outside this act, never a negative balance. Under `maswali:chain` (the jackpot moves, so no
 * carry is claimed mid-forfeit) and then `wallet:<id>`; the hold is lifted after the commit, under the chain lock again.
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
    const amount = Math.round(w.ticket.payout ?? 0);
    const p = (await positionStore.getMany([w.ticket.positionId]))[0];
    const wallet = await db.wallet.findByUserId(userId);
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
