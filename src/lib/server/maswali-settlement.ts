/**
 * MASWALI MILLIONEA — SETTLING A WEEK (MASWALI-BUILD S3; MASWALI-PLAN §3 MR-20…MR-26 and MR-30, §5b, §7b S3 item 4).
 *
 *   the system PREPARES the settlement (`previewMaswaliSettlement`)  ──ONE accounting officer RELEASES it (OD-06)──▶  SETTLED
 *
 * The release recomputes every figure inside the locks and pays only if they are the figures the officer saw (`digest`).
 *
 * ⭐ ONE WEEK, ONE GROUP, ONE TRANSACTION (MB-31). Inside `maswali:chain` (the line of weeks: the carry, the guarantee's
 *    ceremonies and every other settlement wait) and `market:<id>` (the week's market), and ONE `withMoneyTx`: every
 *    winner's wallet credit, BET_PAYOUT row and WIN mark; every loser in one statement; every ticket's grade in bulk; the
 *    ledger group; the week's mirrored columns. A failure rolls the whole week back, and the release can run again.
 * ⭐ S IS READ THREE WAYS AND MUST AGREE (MB-08): the market's pool, the `POOL:<id>` ledger account, and the live tickets
 *    at their frozen price — and the week's own live count and its sales at close. One that differs refuses the week.
 * ⭐ EVERY REFUSAL COMES BEFORE THE FIRST WRITE, the guarantee's included (MB-03): a guarantee below the top-up refuses the
 *    week with a CRITICAL record and never pays less (acceptance (f): no partial write, on either store).
 * ⛔ A WINNER WHOSE ACCOUNT CHANGED IS STILL PAID, AND HELD (MB-43, OD-07): roles are re-checked at settlement; a staff
 *    role, a live desk designation, a suspended or closed account — the share is credited, the ticket carries the reason,
 *    and the wallet is held for Compliance (`MILLIONEA_SHARE`) BEFORE the credit. Never a re-run, never a smaller share.
 * ⛔ NO NOTICE, EMAIL OR PUSH FROM HERE (S6 writes Millionea's own), and no wagering, recruit or house accrual (OD-20/27).
 */
import { createHash } from "node:crypto";
import { audit } from "./audit";
import { afterCommit, withLock } from "./locks";
import { acct, maswaliForfeitReturnEntries, maswaliJackpotOf, maswaliRolloverEntries, maswaliSettlementEntries, maswaliSunsetEntries, withMoneyTx, type LedgerLine } from "./ledger";
import { questionStore, ticketStore, weekStore, type SettledTicketRow, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { marketStore, positionStore } from "./market-dal";
import { snapshotOrLegacy } from "./market-config";
import { houseBotStore } from "./house-bot-dal";
import { isStaffRole } from "./roles";
import { randomId } from "./crypto";
import { db } from "./store";
import { addWalletFreeze, removeWalletFreeze } from "./wallet-freeze";
import { MASWALI_CHAIN_LOCK, claimCarry, frozenRules, gradable } from "./maswali-service";
import { maswaliAccountBalance, postMaswaliLines, readJackpotOf } from "./maswali-money-service";
import { settleArithmetic, type WeekArithmetic } from "@/lib/maswali-money";
import { canonicalPicks, grade, MAIN_COUNT, settlementGate, topScore } from "@/lib/maswali-score";

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });
const SYSTEM = "system_maswali";

/** Why a winning share is held for Compliance (MB-43), or null when it is paid free. */
export type HoldReason = "staff account" | "house desk account" | "account suspended" | "account closed";

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
  // R10b · fail CLOSED: a desk check that cannot be read holds the share as a desk account's (Compliance releases it),
  // never pays it free because the lookup failed.
  const desk = await houseBotStore.findLiveByUserId(userId).catch((err: unknown) => {
    console.error("[maswali-settlement] a winner's desk check could not be read, so the share is held:", (err as Error)?.message ?? err);
    return "unreadable" as const;
  });
  if (desk) return "house desk account";
  if (user.status === "SUSPENDED") return "account suspended";
  if (user.status === "CLOSED") return "account closed";
  return null;
}

type Computed = { preview: MaswaliSettlementPreview; week: StoredWeek; winners: Winner[]; losers: Array<{ ticket: StoredTicket; score: number }> };

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
      week, winners, losers,
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

/**
 * ⭐ RELEASE ONE WEEK'S SETTLEMENT — once (OD-06: one accounting officer; the caller's action checks the role). `digest` is
 * the preview the officer read: the release recomputes everything inside the locks and refuses unless it matches.
 * Idempotent: a SETTLED week answers `already`.
 */
export async function settleMaswaliWeek(input: { weekId: string; releasedBy: string; digest: string; now?: Date }): Promise<
  { ok: true; week: StoredWeek; already?: boolean } | Refused
> {
  const nowMs = (input.now ?? new Date()).getTime();
  const first = await weekStore.get(input.weekId);
  if (!first) return refuse("No such week.");
  if (first.state === "SETTLED") return { ok: true, week: first, already: true };
  if (!first.marketId) return refuse(`Week ${first.code} has no market.`);
  const marketId = first.marketId;

  // ⛔ THE HOLDS COME FIRST (MB-43), outside every lock (a hold takes `wallet:`, which never nests inside `market:`), and
  //    before any credit: a held winner's money is never spendable for an instant. A hold the release then refuses
  //    to pay stays — conservative, audited, and lifted by Compliance.
  const pre = await computeSettlement(input.weekId, nowMs);
  if (!pre.ok) return pre;
  if (pre.c.preview.digest !== input.digest) return refuse("The settlement changed since it was prepared. Prepare it again and read the new figures.");
  for (const w of pre.c.winners) {
    if (!w.hold) continue;
    const f = await addWalletFreeze(w.ticket.userId, "MILLIONEA_SHARE", {
      actorId: null, note: `Millionea ${first.code} · ${w.ticket.serial} · ${w.hold}`, ref: { ticketId: w.ticket.id, weekId: first.id },
    });
    if (!f.ok) return refuse(`A winner's wallet could not be held (${f.error}), so nothing was paid.`);
  }

  let settledWeek: StoredWeek | null = null;
  try {
    const out = await withLock(MASWALI_CHAIN_LOCK, async (): Promise<{ ok: true; week: StoredWeek; already?: boolean } | Refused> => {
      // MR-21 · the carry, claimed in chain order (re-entrant: the same lock). A k = 0 week claims too, so the line of
      // weeks always advances in `seq` order (MR-3; §5 worked example A, week 4).
      const claim = await claimCarry({ weekId: input.weekId, readJackpot: readJackpotOf(first.visibility) });
      if (!claim.ok) return claim;
      return withLock(`market:${marketId}`, async (tx): Promise<{ ok: true; week: StoredWeek; already?: boolean } | Refused> => {
        const again = await weekStore.get(input.weekId);
        if (again?.state === "SETTLED") return { ok: true, week: again, already: true };
        const r = await computeSettlement(input.weekId, nowMs);
        if (!r.ok) return r;
        const { preview: f, week, winners, losers } = r.c;
        // The digest was taken with R as the claim WOULD read; now it is claimed, and must be that same R.
        if (!f.carryClaimed || f.digest !== input.digest) {
          return refuse("The settlement changed since it was prepared. Prepare it again and read the new figures.");
        }
        const a = f.arithmetic;
        const settledAt = new Date().toISOString();
        const groupId = `maswali_settle_${week.id}`;
        const jackpot = maswaliJackpotOf(week.visibility);

        await withMoneyTx(async (mtx) => {
          // ⛔ THE GUARANTEE, READ IN THE TRANSACTION, BEFORE ANY WRITE (MB-03): below the top-up, refuse — never pay less.
          if (a.kind === "PAYOUT" && a.U > 0) {
            const held = await maswaliAccountBalance(acct.maswaliGuarantee, mtx);
            if (held === null || held < a.U) throw new SettleAbort(`GUARANTEE:${held ?? "unreadable"}:${a.U}`);
          }
          const lines: LedgerLine[] = [];
          const ticketRows: SettledTicketRow[] = [];
          const winnerPositionIds: string[] = [];
          if (a.kind === "ROLLOVER") {
            lines.push(...maswaliRolloverEntries({ marketId, sales: f.sales, jackpot }));
          } else {
            const paid: Array<{ userId: string; txnId: string; share: number }> = [];
            for (const w of winners) {
              const p = (await positionStore.getMany([w.ticket.positionId]))[0];
              const wallet = await db.wallet.findByUserId(w.ticket.userId, mtx);
              if (!p || !wallet) throw new SettleAbort(`MISSING:${w.ticket.serial}`);
              const txnId = `txn_${randomId(12)}`;
              const updated = a.share > 0 ? await db.wallet.adjust(wallet.id, { balance: a.share }, undefined, mtx) : wallet;
              if (!updated) throw new SettleAbort(`WALLET:${w.ticket.serial}`);
              p.status = "WIN"; p.finalPayout = a.share; p.settledAt = settledAt;
              await positionStore.set(p, mtx);
              await db.txn.create({
                id: txnId, walletId: wallet.id, userId: p.userId, type: "BET_PAYOUT", status: "CONFIRMED",
                amount: a.share, fee: 0, taxWithheld: 0, balanceAfter: updated.balance, currency: "TZS",
                provider: "INTERNAL", providerRef: null, msisdn: null,
                description: `Millionea ${week.code} · ${w.ticket.serial} · ${f.basis === "TOP_SCORE" ? `top score ${w.score} of ${MAIN_COUNT}` : `${MAIN_COUNT} of ${MAIN_COUNT}`}${w.hold ? " · held for review" : ""}`,
                positionId: p.id,
                // SEAM:markerMaswaliWin — a desk account's share is held above, never marked as the house's stake.
                ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
                amlReason: null, createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
              }, mtx);
              paid.push({ userId: p.userId, txnId, share: a.share });
              winnerPositionIds.push(p.id);
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
          const lost = await positionStore.settleMaswaliLosers(marketId, winnerPositionIds, settledAt, mtx);
          if (lost !== losers.length) throw new SettleAbort(`LOSERS:${lost}:${losers.length}`);
          const graded = await ticketStore.settleWeekTickets(week.id, ticketRows, mtx ?? undefined);
          if (graded !== ticketRows.length) throw new SettleAbort(`TICKETS:${graded}:${ticketRows.length}`);
          await postMaswaliLines(groupId, lines, mtx);
          const stamped = await weekStore.stampSettlement(week.id, {
            state: "SETTLED",
            jackpot: a.kind === "PAYOUT" ? a.J : null, fee: a.kind === "PAYOUT" ? a.F : 0,
            traLevy: a.kind === "PAYOUT" ? a.tra : 0, gbtLevy: a.kind === "PAYOUT" ? a.gbt : 0, topUp: a.kind === "PAYOUT" ? a.U : 0,
            winningTickets: a.k, sharePerTicket: a.kind === "PAYOUT" ? a.share : null, paidTotal: a.kind === "PAYOUT" ? a.paid : 0,
            carryOut: a.kind === "PAYOUT" ? a.carryOut : f.sales, dustCarried: a.kind === "PAYOUT" ? a.carryOut : 0,
            settlementGroupId: groupId, settledAt, releasedBy: input.releasedBy,
          }, mtx ?? undefined);
          if (!stamped) throw new SettleAbort("STAMP");
          await marketStore.stamp(marketId, {
            status: "RESOLVED", settledAt, updatedAt: settledAt,
            resolutionEvidence: `Maswali Millionea week ${week.code} settled: ${a.k} winning ticket(s)${f.basis === "TOP_SCORE" ? ` at the top score ${f.winningScore} of ${MAIN_COUNT} (the final week)` : ""}.`,
          } as never, mtx);
          afterCommit(mtx, () => {
            audit({ category: "WALLET", action: "maswali.week.settled", actorId: input.releasedBy, targetType: "MaswaliCycle", targetId: week.id, payload: {
              code: week.code, marketId, groupId, basis: f.basis, winningScore: f.winningScore, sales: f.sales, rolloverIn: f.rolloverIn, arithmetic: a,
              held: f.held, digest: f.digest,
            } });
          });
        });
        settledWeek = await weekStore.get(input.weekId);
        return { ok: true, week: settledWeek! };
      });
    });
    if (out.ok && !out.already) void floatCheck(settledWeek ?? out.week);
    return out;
  } catch (err) {
    if (err instanceof SettleAbort) {
      if (err.why.startsWith("GUARANTEE:")) {
        const [, held, need] = err.why.split(":");
        // ⛔ CRITICAL: the floor cannot be paid. Nothing moved; the Owner funds the guarantee and accounting releases again.
        console.error(`[maswali-settlement] CRITICAL week ${first.code}: the guarantee holds ${held} and the top-up needs ${need}. Nothing was paid.`);
        audit({ category: "COMPLIANCE", action: "maswali.settlement.guarantee_short", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: first.id,
          payload: { code: first.code, held, need, severity: "CRITICAL" } });
        return refuse(`The guarantee holds less than this week's top-up (TZS ${need}). Nothing was paid: the Owner funds the guarantee, then release again.`);
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
 * buffer; silent when the float cannot be read (the payments console already shows that).
 */
async function floatCheck(week: StoredWeek): Promise<void> {
  try {
    const paid = week.paidTotal ?? 0;
    if (paid <= 0) return;
    const { getFloatBalance } = await import("./payments");
    const float = await getFloatBalance();
    if (!float) return;
    if (paid > float.balance - FLOAT_ALERT_BUFFER_TZS) {
      console.error(`[maswali-settlement] week ${week.code} paid ${paid}; the payout float holds ${float.balance}.`);
      audit({ category: "COMPLIANCE", action: "maswali.settlement.float_low", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
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

/** After a release or a forfeit: the wallet's Millionea hold is lifted only when none of the player's shares is still held. */
async function liftHoldIfClear(userId: string, officerId: string, note: string): Promise<void> {
  const still = (await ticketStore.listForUser(userId)).some(isHeld);
  if (!still) await removeWalletFreeze(userId, "MILLIONEA_SHARE", { actorId: officerId, note });
}

/**
 * Compliance HOLDS a paid share found to need review after settlement — a reversed deposit funded the ticket (MB-74), or
 * a disqualification surfaced late (MB-43). The wallet is held (`MILLIONEA_SHARE`); nothing moves. ⛔ Never a re-run.
 */
export async function holdMaswaliShare(input: { ticketId: string; officerId: string; reason: string }): Promise<{ ok: true } | Refused> {
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 300) return refuse("Write why the share is held (5–300 characters).");
  const w = await winningTicket(input.ticketId);
  if (!w.ok) return w;
  if (w.ticket.frozenReason) return refuse(`Ticket ${w.ticket.serial} is already ${isHeld(w.ticket) ? "held" : "forfeited"}.`);
  const f = await addWalletFreeze(w.ticket.userId, "MILLIONEA_SHARE", { actorId: input.officerId, note: `Millionea ${w.week.code} · ${w.ticket.serial} · ${reason}`, ref: { ticketId: w.ticket.id } });
  if (!f.ok) return refuse(f.error);
  await ticketStore.patch(w.ticket.id, { frozenReason: `compliance · ${reason}` });
  audit({ category: "COMPLIANCE", action: "maswali.share.held", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
    payload: { code: w.week.code, serial: w.ticket.serial, payout: w.ticket.payout, reason } });
  return { ok: true };
}

/** Compliance RELEASES a held share: the player keeps it, and the wallet hold lifts once no other share is held. */
export async function releaseMaswaliShare(input: { ticketId: string; officerId: string; note: string }): Promise<{ ok: true } | Refused> {
  const note = input.note.trim();
  if (note.length < 5 || note.length > 300) return refuse("Write the decision (5–300 characters).");
  const w = await winningTicket(input.ticketId);
  if (!w.ok) return w;
  if (!isHeld(w.ticket)) return refuse(`Ticket ${w.ticket.serial} is not held.`);
  await ticketStore.patch(w.ticket.id, { frozenReason: null });
  await liftHoldIfClear(w.ticket.userId, input.officerId, `Millionea ${w.week.code} · ${w.ticket.serial} released · ${note}`);
  audit({ category: "COMPLIANCE", action: "maswali.share.released", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
    payload: { code: w.week.code, serial: w.ticket.serial, payout: w.ticket.payout, note } });
  return { ok: true };
}

/**
 * ⭐ Compliance FORFEITS a held share (OD-07): the whole share leaves the player's wallet and goes back to the JACKPOT,
 * for the players of the next winning week — ⛔ never to the house; the fee and levies stay as booked; no other winner is
 * re-paid. One transaction: the debit, its ADJUSTMENT_DEBIT row, the ledger group. Refused when the wallet no longer holds
 * the share (it was held too late): that is a recovery for Compliance outside this act, never a negative balance.
 * Under `maswali:chain` (the jackpot moves, so no carry is claimed mid-forfeit) and then `wallet:<id>`.
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
    if (wallet.balance < amount) return refuse(`The wallet holds TZS ${wallet.balance.toLocaleString("en")}, less than the share; nothing was forfeited.`);
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
      });
    } catch (err) {
      if (err instanceof SettleAbort) return refuse("The wallet no longer holds the share; nothing was forfeited.");
      throw err;
    }
    await ticketStore.patch(w.ticket.id, { frozenReason: `${FORFEITED}${reason}` });
    audit({ category: "COMPLIANCE", action: "maswali.share.forfeited", actorId: input.officerId, targetType: "MaswaliTicket", targetId: w.ticket.id,
      payload: { code: w.week.code, serial: w.ticket.serial, amount, txnId, reason } });
    return { ok: true, amount };
  }));
  if (!out.ok) return out;
  await liftHoldIfClear(userId, input.officerId, `Millionea ${first.week.code} · ${first.ticket.serial} forfeited`);
  return { ok: true };
}
