/**
 * MASWALI MILLIONEA — THE WEEK VOID'S REFUNDS (MASWALI-BUILD R1; MASWALI-PLAN MR-18, §5b "Week void").
 *
 *   `voidWeek` stamps the week VOIDED, once  ──▶  `refundVoidedWeek` refunds every LIVE ticket, once, at any size
 *
 * ⭐ ONE TRUTH THAT THE REFUNDS LANDED: the week's market carries its `settledAt`, written in the SAME transaction as every
 *    refund (`voidRefundsLanded`). A VOIDED week whose market has none is owed its refunds: `voidWeek` on it resumes them,
 *    the tick and the heal retry it until they land (`maswali-scheduler.ts`), and the console raises it as critical
 *    (`maswali-console.ts`). The positions' VOID and the tickets' REFUNDED are written beside that stamp and agree with
 *    it; nothing decides on them.
 * ⭐ ONE TRANSACTION AT ANY SIZE, under `maswali:chain` → `market:<id>`: one credit per player for the sum of their
 *    stakes, in bulk (`db.wallet.creditMany`: one statement per distinct amount and per 5,000 players), the positions VOID
 *    in one statement, one BET_REFUND row per ticket in bulk, one ledger group POOL → each player, the tickets REFUNDED in
 *    bulk, the market stamped settled. `settleMarket`'s VOID arm, which this replaces for a week, made about six round
 *    trips per ticket inside the lock's 30 s, so a week of a few thousand tickets timed out on every attempt and could
 *    never refund (R1); here the statements grow with the chunks, not with the tickets or the players.
 * ⛔ NO `wallet:<id>` LOCK: a credit needs no guard, and a concurrent debit's own conditional update waits on the row.
 *    Taking one while holding `market:` would invert the platform's order (wallet → market). The push after the commit
 *    runs outside every lock.
 * ⭐ EVERY REFUSAL BEFORE THE FIRST WRITE (the memory store has no transaction): the market, each ticket's own position,
 *    and the stakes agreed three ways — the market's pool, `POOL:<id>` and the live tickets — so the pool ends at EXACTLY 0
 *    (MR-26). Each player's wallet is the first write's own check: `creditMany` refuses a missing one whole, before it
 *    writes on the memory store and by a rollback on Postgres. A disagreement refunds nothing and stays owed, in the
 *    alert, for a person to read.
 * ⛔ R IS UNTOUCHED (MR-18): no jackpot, no guarantee, no fee, no levy. ⛔ No poll notice (muted on every Millionea path;
 *    S6 writes Millionea's own, MB-68) and no wagering reversal (a ticket accrued none, OD-27). After the commit, each
 *    refunded player's new balance is pushed to their open page (R10d), as `settleMarket` pushes a voided poll's.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { afterCommit, withLock } from "./locks";
import { acct, refundEntries, withMoneyTx, type LedgerLine } from "./ledger";
import { ticketStore, weekStore, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { marketStore, positionStore } from "./market-dal";
import { MASWALI_MONEY_LOCK, maswaliAccountBalance, postMaswaliLines } from "./maswali-money-service";
import { emitWalletBalances, type StoredPosition } from "./market-service";
import { db, type StoredTxn } from "./store";

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });
const SYSTEM = "system_maswali";

/** A voided week's ticket refund, in the words the wallet history shows ("<these> · \"<the week's title>\""). */
export const MASWALI_VOID_REFUND = "Refund · Millionea week voided, ticket refunded in full";

/** Ledger lines per post: two per ticket and nine binds a line, so 2,000 lines stay far below Postgres's ceiling. */
const LINES_PER_POST = 2_000;

/** ⭐ R1 · THE ONE TRUTH: did this VOIDED week's refunds land? Its market's settled stamp, written with the money. */
export async function voidRefundsLanded(week: Pick<StoredWeek, "marketId">): Promise<boolean> {
  if (!week.marketId) return false;
  const market = await marketStore.get(week.marketId);
  return market?.settledAt != null;
}

/** Every VOIDED week whose refunds have not landed — what the tick and the heal retry, and the console raises. */
export async function unrefundedVoids(): Promise<StoredWeek[]> {
  const owed: StoredWeek[] = [];
  for (const w of await weekStore.list({ states: ["VOIDED"] })) if (!(await voidRefundsLanded(w))) owed.push(w);
  return owed;
}

/** Thrown inside the money transaction so it rolls back; mapped to a refusal outside the locks (`said`, when it has one). */
class VoidAbort extends Error { constructor(readonly why: string, readonly said?: string) { super(why); } }

export type VoidRefund =
  | { ok: true; already: boolean; tickets: number; players: number; refunded: number }
  | Refused;

/**
 * ⭐ REFUND A VOIDED WEEK, ONCE (MR-18): every LIVE ticket in full, no fee, R untouched — see the header. Idempotent: a week
 * whose market is settled answers `already` and changes nothing; a week whose refund refused or rolled back is refunded
 * whole by the next call. `voidWeek` is the caller (it stamps the week VOIDED first, and resumes a VOIDED week here).
 */
export async function refundVoidedWeek(weekId: string): Promise<VoidRefund> {
  const first = await weekStore.get(weekId);
  if (!first) return refuse("No such week.");
  if (first.state !== "VOIDED") return refuse(`Week ${first.code} is ${first.state}; only a VOIDED week is refunded.`);
  if (!first.marketId) return refuse(`Week ${first.code} has no market.`);
  const marketId = first.marketId;
  /** Whose balance moved, and by how much: the push after the commit (R10d), never before it. */
  const credited: Array<{ userId: string; amount: number }> = [];

  let out: VoidRefund;
  try {
    out = await withLock(MASWALI_MONEY_LOCK, () => withLock(`market:${marketId}`, async (lockTx): Promise<VoidRefund> => {
      const week = await weekStore.get(weekId);
      const market = await marketStore.get(marketId, lockTx);
      if (!week || week.state !== "VOIDED") return refuse(`Week ${first.code} is no longer VOIDED; nothing was refunded.`);
      if (!market) return refuse(`Week ${week.code}'s market is missing, so nothing was refunded.`);
      // ⭐ THE ONE TRUTH, read inside the lock: a settled market has had its refunds, and a second run changes nothing.
      if (market.settledAt) return { ok: true, already: true, tickets: 0, players: 0, refunded: 0 };

      // ── Every read and every refusal, before the first write.
      const live = await ticketStore.listForWeek(week.id, { status: "LIVE", tx: lockTx ?? undefined });
      const open = new Map((await positionStore.listForMarket(marketId)).filter((p) => p.status === "OPEN").map((p) => [p.id, p]));
      if (open.size !== live.length) {
        return refuse(`Week ${week.code} has ${open.size} open position(s) for ${live.length} live ticket(s), so nothing was refunded.`);
      }
      const plan: Array<{ ticket: StoredTicket; p: StoredPosition }> = [];
      for (const ticket of live) {
        const p = open.get(ticket.positionId);
        // A ticket is bought from the real balance only (MR-10): a bonus part would be a position this refund cannot read.
        if (!p || p.userId !== ticket.userId || !Number.isSafeInteger(p.stake) || p.stake <= 0 || (p.bonusStakeTzs ?? 0) !== 0) {
          return refuse(`Ticket ${ticket.serial}'s position does not match its ticket, so nothing was refunded.`);
        }
        plan.push({ ticket, p });
      }
      const total = plan.reduce((s, x) => s + x.p.stake, 0);
      const byLedger = await maswaliAccountBalance(acct.pool(marketId), lockTx);
      if (byLedger === null) return refuse(`Week ${week.code}'s pool could not be read from the ledger, so nothing was refunded.`);
      if (market.noPool !== 0 || market.yesPool !== total || byLedger !== total || week.ticketCount !== live.length) {
        return refuse(`Week ${week.code}'s stakes do not agree: market pool ${market.yesPool} (other side ${market.noPool}), ledger ${byLedger}, `
          + `live tickets ${live.length} staking ${total}, week count ${week.ticketCount}. Nothing was refunded.`);
      }
      // One credit per player, for the sum of their stakes.
      const owed = new Map<string, number>();
      for (const { p } of plan) owed.set(p.userId, (owed.get(p.userId) ?? 0) + p.stake);

      // ⚠️ The money's stamps read the platform clock, never a week's injected one (the old VOID arm's rule).
      const at = new Date().toISOString();
      const groupId = `maswali_void_${week.id}`;
      await withMoneyTx(async (mtx) => {
        // ⭐ THE FIRST WRITE, AND EACH WALLET'S CHECK: ⛔ a missing wallet refuses the week whole, never skips a ticket.
        const wallets = await db.wallet.creditMany([...owed].map(([userId, amount]) => ({ userId, amount })), mtx);
        const walletOf = new Map((wallets ?? []).map((w) => [w.userId, w]));
        if (!wallets || [...owed.keys()].some((userId) => !walletOf.has(userId))) {
          throw new VoidAbort("WALLET", `A ticket holder's wallet is missing in week ${week.code}, so nothing was refunded.`);
        }
        const voided = await positionStore.voidMaswaliPositions(marketId, plan.map((x) => x.p.id), at, mtx);
        if (voided !== plan.length) throw new VoidAbort(`POSITIONS:${voided}:${plan.length}`);
        // Each row's balance runs up, ticket by ticket, to the player's credited balance (the purchase writes it down so).
        const still = new Map(owed);
        const refunds = plan.map(({ p }) => {
          const w = walletOf.get(p.userId)!;
          const after = still.get(p.userId)! - p.stake;
          still.set(p.userId, after);
          return { p, walletId: w.id, txnId: `txn_${randomId(12)}`, balanceAfter: w.balance - after };
        });
        const written = await db.txn.createMany(refunds.map(({ p, walletId, txnId, balanceAfter }): StoredTxn => ({
          id: txnId,
          walletId, userId: p.userId,
          type: "BET_REFUND", status: "CONFIRMED",
          amount: p.stake, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `${MASWALI_VOID_REFUND} · "${market.titleEn.slice(0, 60)}"`,
          positionId: p.id,
          // SEAM:markerMaswaliVoid — a desk account never holds a ticket (refused at the purchase), kept so Ruling 232 has no exception.
          ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
          amlReason: null,
          createdAt: at, updatedAt: at, completedAt: at,
        })), mtx);
        if (written !== refunds.length) throw new VoidAbort(`TXNS:${written}:${refunds.length}`);
        // ONE group, POOL → each player, ticket by ticket: posted in balanced chunks of whole refunds, all under one id.
        const lines: LedgerLine[] = refunds.flatMap(({ p, txnId }) => refundEntries({ txnId, userId: p.userId, marketId, realPart: p.stake, bonusPart: 0 }));
        for (let i = 0; i < lines.length; i += LINES_PER_POST) await postMaswaliLines(groupId, lines.slice(i, i + LINES_PER_POST), mtx);
        const refunded = await ticketStore.refundWeekTickets(week.id, plan.map((x) => x.ticket.id), mtx ?? undefined);
        if (refunded !== plan.length) throw new VoidAbort(`TICKETS:${refunded}:${plan.length}`);
        // ⭐ THE ONE TRUTH, stamped with the money. A market an earlier attempt already stamped VOID keeps its own stamps.
        await marketStore.stamp(marketId, {
          status: "VOIDED", resolvedOutcome: "VOID",
          resolutionStage1By: market.resolutionStage1By ?? SYSTEM, resolutionStage1At: market.resolutionStage1At ?? at,
          resolutionStage2By: market.resolutionStage2By ?? SYSTEM, resolutionStage2At: market.resolutionStage2At ?? at,
          resolutionEvidence: market.resolutionEvidence ?? `Maswali Millionea week ${week.code} voided whole (MR-18): voided main questions outnumbered the usable reserves. Every ticket is refunded in full.`,
          objectionsClosedAt: market.objectionsClosedAt ?? at, resolutionNotifiedAt: market.resolutionNotifiedAt ?? at,
          settledAt: at, updatedAt: at,
        }, lockTx);
        afterCommit(mtx, () => {
          audit({ category: "WALLET", action: "maswali.week.refunded", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
            payload: { code: week.code, marketId, groupId, tickets: plan.length, players: owed.size, refunded: total } });
        });
      });
      for (const [userId, amount] of owed) credited.push({ userId, amount });
      return { ok: true, already: false, tickets: plan.length, players: owed.size, refunded: total };
    }));
  } catch (err) {
    if (err instanceof VoidAbort) {
      console.error(`[maswali-void] week ${first.code} rolled back: ${err.why}`);
      return refuse(err.said ?? `The refunds rolled back (${err.why}); nothing was refunded.`);
    }
    throw err;
  }
  // R10d · every refunded player's new balance reaches their open page, once the refunds have committed.
  if (out.ok && !out.already) await emitWalletBalances(credited.map((c) => c.userId));
  return out;
}
