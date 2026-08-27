/**
 * Bonus-wallet service — the money-safe core of the bonus feature.
 *
 * A BonusGrant is one promotional credit that lives in Wallet.bonusBalance and
 * is NOT withdrawable until its wagering requirement is met. The invariant this
 * module preserves at all times:
 *
 *     wallet.bonusBalance == Σ remainingTzs over the wallet's ACTIVE grants
 *
 * ⛔ E-224 (2026-08-27) — READ THIS BEFORE TOUCHING remainingTzs. The invariant above is
 * unchanged and still exact, but the FIELD now outlives ACTIVE status: fulfilment DELIBERATELY
 * does not zero `remainingTzs`, so a FULFILLED grant retains the figure it converted to real
 * cash. That figure is the only record of the conversion and it is what `reverseWageringCore`
 * moves back when a refund shows the wager never really happened. The invariant survives
 * because it is scoped to ACTIVE grants and a FULFILLED grant is outside the sum.
 * ⚠️ Therefore: any NEW reader of `remainingTzs` MUST filter by status, or it will report
 * converted cash as locked bonus. Expiry and cancellation still zero it — the remainder is
 * REMOVED there, not converted, and only a conversion is reversible.
 *
 * Every mutation runs under `withLock("wallet:<userId>")` — the SAME key the
 * wallet/deposit/withdraw/bet paths use — so bonus credits, spends, wagering and
 * fulfilment serialize against ordinary wallet movements and against each other.
 * Balance moves go through db.wallet.adjust (atomic increment/decrement with
 * overdraw guards), never a read-modify-write of an absolute balance.
 *
 * WAGERING MODEL (turnover):
 *   `recordWagering(userId, stakeTzs)` accrues TURNOVER toward the oldest ACTIVE
 *   grant (FIFO, cascading overflow to the next grant). Phase 4 calls it with the
 *   full bet stake on every bet, so a 5× bonus clears when the player has played
 *   5× its value — matching "play TZS 50,000 to unlock TZS 10,000". (The plan's
 *   literal "only bonus-funded stake counts" rule is mathematically unclearable
 *   for a 5× bonus, since winnings go to real balance; turnover is the standard,
 *   clearable interpretation. Flagged to Ali.)
 *
 * Per Ali (2026-06-26): grants ACCUMULATE (no one-at-a-time limit); withdrawing
 * real balance leaves active bonuses untouched (coexist) — so there is no
 * forfeit-on-withdrawal path here.
 */
import { db, type StoredBonusGrant, type BonusSource } from "./store";
import type { Prisma } from "@prisma/client";
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { audit } from "./audit";
import { getBonusConfig } from "./bonus-config";
import { notifyBonusCredited, notifyBonusFulfilled, notifyBonusExpired } from "./notification-service";
import { sendEmailToUser, bonusCreditedHtml, bonusFulfilledHtml } from "./email";
import { postLedgerEntries, bonusGrantEntries, bonusCreditEntries, bonusExpireEntries, bonusRelockEntries } from "./ledger";
import { isLockedOut } from "./responsible-gambling";
import { formatTzs } from "@/lib/utils";

const BONUS_SOURCE_EMAIL_LABEL: Record<string, string> = {
  CASHBACK: "Cash back bonus",
  INVITE: "Invite bonus",
  REFERRAL: "Referral bonus",
  PROPOSAL: "Proposal prize",
  PROMOTION: "Promotion",
  ADMIN: "Bonus credit",
};

const tzs = (n: number) => Math.round(n);

/** A bonus allocation drawn from a specific grant (returned by spendBonus so the
 *  exact same grants can be refunded on a void). */
export type BonusAllocation = { grantId: string; amount: number };

export type CreditBonusInput = {
  amountTzs: number;
  source: BonusSource;
  /** Idempotency key — a second credit with the same ref returns the first grant. */
  sourceRef?: string | null;
  /** Override the config default turnover multiplier for this grant. */
  wagerMultiplier?: number;
  /** Override the config default validity window. 0 = never expires. */
  expiryDays?: number;
  note?: string | null;
  /** When false, skip the generic "Bonus added" in-app notification + email —
   *  for callers that send their own, more contextual player message (e.g. the
   *  proposal-approved notice) and would otherwise double-notify. Default true.
   *  Note: a QUEUED grant that later activates still notifies from activateNextQueued. */
  notifyPlayer?: boolean;
};

export type CreditBonusResult =
  | { ok: true; grant: StoredBonusGrant; deduped: boolean }
  | { ok: false; error: string; code: "DISABLED" | "INVALID" | "NOT_FOUND" | "RG_LOCKED" };

/**
 * Credit a bonus grant to a player's bonus wallet. Idempotent by `sourceRef`.
 * Creates the grant ACTIVE and increases bonusBalance atomically under the
 * wallet lock. Returns the grant (deduped=true if it already existed).
 */
export async function creditBonus(userId: string, input: CreditBonusInput): Promise<CreditBonusResult> {
  const cfg = getBonusConfig();
  if (!cfg.enabled) return { ok: false, error: "Bonus program is currently disabled.", code: "DISABLED" };

  const amount = tzs(input.amountTzs);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Bonus amount must be a positive whole number.", code: "INVALID" };

  const multiplier = input.wagerMultiplier ?? cfg.defaultWagerMultiplier;
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 100) return { ok: false, error: "Wagering multiplier must be 1–100×.", code: "INVALID" };

  const expiryDays = input.expiryDays ?? cfg.defaultExpiryDays;
  if (!Number.isInteger(expiryDays) || expiryDays < 0 || expiryDays > 365) return { ok: false, error: "Expiry must be 0–365 days.", code: "INVALID" };

  // Responsible-gambling suppression (GLI-19 / LCCP SR 3.4): never grant a
  // promotional bonus to a self-excluded or cooling-off player. Every incentive
  // path (cashback, invite, referral, proposal, promotion, admin) routes through
  // creditBonus, so this one gate suppresses all bonus marketing for the whole
  // exclusion. Audited so the block is provable at certification.
  const rgLock = await isLockedOut(userId);
  if (rgLock.locked) {
    audit({
      category: "COMPLIANCE",
      action: "bonus.suppressed.rg_lockout",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      payload: { reason: rgLock.reason, until: rgLock.until, amountTzs: amount, source: input.source, sourceRef: input.sourceRef ?? null },
    });
    return { ok: false, error: "Bonuses are unavailable while your account is excluded.", code: "RG_LOCKED" };
  }

  const result = await withLock(`wallet:${userId}`, async (): Promise<CreditBonusResult> => {
    if (input.sourceRef) {
      const existing = await db.bonusGrant.findBySourceRef(input.sourceRef);
      if (existing) return { ok: true, grant: existing, deduped: true };
    }
    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
    if (wallet.status !== "ACTIVE") return { ok: false, error: "Wallet is not active.", code: "NOT_FOUND" };

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = expiryDays > 0 ? new Date(now.getTime() + expiryDays * 86_400_000).toISOString() : null;

    // Sequential enforcement (Management Bonus Rules §6): if enabled, check whether
    // the player already has an ACTIVE grant. If so, the new grant enters QUEUED
    // status — it activates automatically when the current one fulfills/expires.
    const activeGrants = (await db.bonusGrant.listByUser(userId)).filter((g) => g.status === "ACTIVE");
    const shouldQueue = cfg.sequentialBonuses && activeGrants.length > 0;

    const grant: StoredBonusGrant = {
      id: `bg_${randomId(12)}`,
      userId,
      walletId: wallet.id,
      amountTzs: amount,
      remainingTzs: amount,
      wagerMultiplier: multiplier,
      wagerRequiredTzs: tzs(amount * multiplier),
      wageredTzs: 0,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      status: shouldQueue ? "QUEUED" : "ACTIVE",
      expiresAt,
      fulfilledAt: null,
      note: input.note ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    try {
      await db.bonusGrant.create(grant);
    } catch {
      // A concurrent insert with the same sourceRef (another instance) tripped the
      // DB unique constraint — return the winning grant rather than double-credit.
      if (input.sourceRef) {
        const existing = await db.bonusGrant.findBySourceRef(input.sourceRef);
        if (existing) return { ok: true, grant: existing, deduped: true };
      }
      return { ok: false, error: "Could not create bonus grant.", code: "INVALID" };
    }
    // Only add to bonusBalance when ACTIVE — QUEUED grants don't touch the wallet
    // until they activate. This keeps the invariant: bonusBalance == Σ ACTIVE remainingTzs.
    if (!shouldQueue) {
      await db.wallet.adjust(wallet.id, { bonusBalance: amount });
      // Dual-write: bonus grant to double-entry ledger (fire-and-forget).
      postLedgerEntries(`bonus_${grant.id}`, bonusGrantEntries({ groupId: `bonus_${grant.id}`, userId, amount })).catch(() => {});
    }
    audit({
      category: "WALLET",
      action: shouldQueue ? "bonus.queued" : "bonus.credited",
      actorId: userId,
      targetType: "BonusGrant",
      targetId: grant.id,
      payload: { amountTzs: amount, source: input.source, sourceRef: input.sourceRef ?? null, wagerMultiplier: multiplier, wagerRequiredTzs: grant.wagerRequiredTzs, expiresAt, queued: shouldQueue },
    });
    return { ok: true, grant, deduped: false };
  });

  if (result.ok && !result.deduped && input.notifyPlayer !== false) {
    const g = result.grant;
    if (g.status === "QUEUED") {
      // Notify player their bonus is queued (sequential mode §6)
      notifyBonusCredited(userId, { amountTzs: g.amountTzs, wagerRequiredTzs: g.wagerRequiredTzs, queued: true }).catch(() => {});
    } else {
      notifyBonusCredited(userId, { amountTzs: g.amountTzs, wagerRequiredTzs: g.wagerRequiredTzs }).catch(() => {});
      // Dual-channel: money events email the player too (matches deposits/wins).
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: `Bonus added · ${formatTzs(g.amountTzs)}`,
        html: bonusCreditedHtml({ amountTzs: g.amountTzs, wagerRequiredTzs: g.wagerRequiredTzs, sourceLabel: BONUS_SOURCE_EMAIL_LABEL[g.source] }),
        tag: "bonus",
      })).catch(() => {});
    }
  }
  return result;
}

export type WageringResult = { fulfilled: StoredBonusGrant[]; creditedToRealTzs: number };

/**
 * Accrue `stakeTzs` of turnover toward the player's ACTIVE grants (FIFO, oldest
 * first; overflow cascades to the next grant). When a grant's wageredTzs reaches
 * its requirement, its remaining bonus is converted to real, withdrawable balance
 * (a CONFIRMED BONUS_CREDIT transaction) and the grant is marked FULFILLED.
 * No-op if the player has no active grants. Safe to call on every bet.
 */
export async function recordWagering(userId: string, stakeTzs: number): Promise<WageringResult> {
  const amount = tzs(stakeTzs);
  if (!(amount > 0)) return { fulfilled: [], creditedToRealTzs: 0 };
  const result = await withLock(`wallet:${userId}`, () => recordWageringCore(userId, amount));
  for (const g of result.fulfilled) {
    notifyBonusFulfilled(userId, { amountTzs: g.amountTzs }).catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bonus unlocked · ${formatTzs(g.amountTzs)}`,
      html: bonusFulfilledHtml({ amountTzs: g.amountTzs }),
      tag: "bonus",
    })).catch(() => {});
  }
  return result;
}

/**
 * Lock-free variant for callers ALREADY holding `withLock("wallet:<userId>")`
 * (bet placement records turnover inside its own wallet lock so spend + wagering
 * + fulfilment are one atomic unit — re-acquiring the key would deadlock). The
 * caller must fire notifyBonusFulfilled for the returned grants after the lock.
 */
export async function recordWageringLocked(userId: string, stakeTzs: number, tx?: Prisma.TransactionClient | null): Promise<WageringResult> {
  const amount = tzs(stakeTzs);
  if (!(amount > 0)) return { fulfilled: [], creditedToRealTzs: 0 };
  return recordWageringCore(userId, amount, tx);
}

/**
 * `tx` is REQUIRED for correctness when the caller already holds an open
 * transaction that has written this wallet (the bet path does — it debits the
 * wallet, then accrues turnover here). Postgres row locks are held to commit, so
 * issuing these UPDATEs on a SEPARATE pool connection blocks on the caller's own
 * uncommitted row and self-deadlocks until the transaction times out (P2028 at
 * 30s). Reads are left un-threaded on purpose: MVCC means a SELECT never blocks
 * on an uncommitted writer, so they cost a transient connection but cannot hang.
 */
async function recordWageringCore(userId: string, amount: number, tx?: Prisma.TransactionClient | null): Promise<WageringResult> {
  const fulfilled: StoredBonusGrant[] = [];
  let creditedToReal = 0;
  let remainingTurnover = amount;
  const active = await db.bonusGrant.listActiveByUser(userId); // FIFO oldest-first
  for (const g of active) {
    if (remainingTurnover <= 0) break;
    if (g.status !== "ACTIVE") continue; // robustness: never double-touch a closed grant
    const need = Math.max(0, g.wagerRequiredTzs - g.wageredTzs);
    const applied = Math.min(remainingTurnover, need);
    const newWagered = g.wageredTzs + applied;
    remainingTurnover -= applied;

    if (newWagered >= g.wagerRequiredTzs) {
      // Fulfilled — convert the unspent remainder to real, withdrawable balance.
      const moved = g.remainingTzs;
      if (moved > 0) {
        // Guarded (defense-in-depth): never remove more bonus than exists. Without
        // the guard, if the bonus invariant ever drifts so bonusBalance < moved, the
        // Postgres bonusBalance>=0 CHECK rejects the (atomic) adjust and returns null
        // — and the old code proceeded anyway, crediting real withdrawable balance
        // while the bonus was NOT debited (minting cash). On a guard miss, abort this
        // grant and leave it ACTIVE for a later reconcile.
        const updatedWallet = await db.wallet.adjust(g.walletId, { bonusBalance: -moved, balance: moved }, { requireBonusBalanceGte: moved }, tx);
        if (!updatedWallet) {
          audit({ category: "WALLET", action: "bonus.fulfill_aborted_guard", actorId: userId, targetType: "BonusGrant", targetId: g.id, payload: { moved, reason: "bonusBalance<remainder" } });
          continue;
        }
        const now = new Date().toISOString();
        const bonusTxnId = `txn_${randomId(12)}`;
        await db.txn.create({
          id: bonusTxnId,
          walletId: g.walletId,
          userId,
          type: "BONUS_CREDIT",
          status: "CONFIRMED",
          amount: moved,
          fee: 0,
          taxWithheld: 0,
          balanceAfter: updatedWallet?.balance ?? null,
          currency: "TZS",
          provider: "INTERNAL",
          providerRef: null,
          msisdn: null,
          description: "Bonus unlocked — wagering completed",
          positionId: null,
          amlReason: null,
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        }, tx);
        // Dual-write: bonus unlock to double-entry ledger. In tx mode this joins
        // the caller's transaction (so it rolls back with the unlock); otherwise
        // it stays fire-and-forget as before.
        if (tx) await postLedgerEntries(`bfulfill_${bonusTxnId}`, bonusCreditEntries({ txnId: bonusTxnId, userId, amount: moved }), tx);
        else postLedgerEntries(`bfulfill_${bonusTxnId}`, bonusCreditEntries({ txnId: bonusTxnId, userId, amount: moved })).catch(() => {});
        creditedToReal += moved;
      }
      // ⛔ E-224 · `remainingTzs` IS DELIBERATELY NOT ZEROED HERE, AND THAT IS THE WHOLE FIX.
      // It keeps `moved` — the figure this fulfilment converted from locked bonus into real,
      // withdrawable cash — because that is the ONLY record of it, and the re-lock path needs a
      // number to move back. `amountTzs` is NOT a substitute: spendBonus and refundBonus move
      // `remainingTzs` up and down before fulfilment, so the converted figure is generally
      // smaller. The field meaning widens to: "the portion of this grant that is locked bonus
      // money, OR that WAS converted to real and returns to bonus if the grant is re-locked."
      // ⚠️ THE ASYMMETRY IS THE POINT, AND EXPIRY/CANCELLATION STILL ZERO IT: on expiry or
      // cancellation the remainder is REMOVED from the player; on fulfilment it is CONVERTED —
      // and only a conversion is reversible. See expireActiveGrants and cancelGrant.
      // ✅ SAFE, VERIFIED BY READING EVERY READER RATHER THAN BY REASONING ABOUT IT. All of
      // them are ACTIVE-scoped: the ledger reconciler (ledger.ts, WHERE status = ACTIVE), the
      // bonusBalance invariant, spendBonusCore, refundBonusToActive, listExpired, and the
      // player wallet page (filters ACTIVE||QUEUED). The one UNFILTERED reader is the admin
      // grant ledger AND the player-facing summary — and BOTH suppress the field at their own
      // source in this same commit (getAdminBonusStats, and toGrantView).
      // ⚠️ THE FIRST DRAFT OF THIS COMMENT SAID "the ONE unfiltered reader" AND WAS WRONG.
      // `getBonusSummary` maps `listByUser` (no status filter) through `toGrantView`, which spread
      // the field straight through; the only thing between that and the player was a filter in a
      // DIFFERENT FILE. An adversarial re-read of this diff found it. A claim of "verified by
      // reading every reader" is worth exactly as much as the grep behind it.
      const done = await db.bonusGrant.update(g.id, { wageredTzs: newWagered, remainingTzs: moved, status: "FULFILLED", fulfilledAt: new Date().toISOString() }, tx);
      if (done) fulfilled.push(done);
      audit({
        category: "WALLET",
        action: "bonus.fulfilled",
        actorId: userId,
        targetType: "BonusGrant",
        targetId: g.id,
        payload: { amountTzs: g.amountTzs, movedToRealTzs: moved, wageredTzs: newWagered, wagerRequiredTzs: g.wagerRequiredTzs },
      });
      // Sequential: activate the next queued grant now that this one is done.
      await activateNextQueued(userId, tx);
    } else if (applied > 0) {
      await db.bonusGrant.update(g.id, { wageredTzs: newWagered }, tx);
    }
  }
  return { fulfilled, creditedToRealTzs: creditedToReal };
}

/**
 * Reverse `stakeTzs` of previously-credited turnover (used when a bet is REFUNDED
 * — void / one-sided / emergency / orphan). Without this, a player could place a
 * bonus- or real-funded bet (turnover counted toward wagering), have it refunded,
 * keep the turnover credit, and clear the bonus to withdrawable cash with no risk.
 * Decrements `wageredTzs` on the user's ACTIVE grants, newest-first, never below 0.
 * A grant that already FULFILLED from legitimate turnover is left untouched (its
 * cash is real) — but the per-bet reversal prevents turnover from ever
 * accumulating across refunded bets. Returns the amount of turnover reversed.
 */
export async function reverseWagering(userId: string, stakeTzs: number): Promise<number> {
  const amount = tzs(stakeTzs);
  if (!(amount > 0)) return 0;
  return withLock(`wallet:${userId}`, () => reverseWageringCore(userId, amount));
}

/**
 * Lock-free variant for callers ALREADY holding `withLock("wallet:<userId>")` —
 * `cashOutPosition` does, and takes the market lock inside it.
 *
 * 🔴 WHY THIS EXISTS (B1b, found 2026-08-14 and NOT in the work order). `cashOutPosition`
 * never reversed anything. A player could bet, cancel FREE inside the 5-minute grace, get
 * the whole stake back — **and keep the turnover credit**. That is a second, entirely
 * independent zero-cost route to clearing a bonus, repeatable as fast as the rate limiter
 * allows, and it is larger than the hedge it sat beside because cancellation costs nothing
 * at all rather than the fee on one leg. Every OTHER refund path (void, one-sided,
 * emergency, orphan) already called `reverseWagering`; the exit a player uses most did not.
 *
 * ⚠️ NOT `reverseWagering` DIRECTLY. `withLock` IS re-entrant on both stores today, so the
 * call would happen to work — but relying on that makes a money guarantee depend on a
 * property nothing in this file states. The explicit variant says what it needs.
 *
 * ⚠️ AND NO `tx` FROM THE CASH-OUT PATH. Every write in `cashOutPosition` is
 * self-committing (`db.wallet.adjust`, `positionStore.set`, `db.txn.create` all run without
 * the lock's transaction). Threading the reversal alone would make it the ONE write that
 * rolls back with the lock while the payout stood — a worse asymmetry than the one it fixes.
 * The parameter exists for a caller that IS inside a money transaction.
 */
export async function reverseWageringLocked(userId: string, stakeTzs: number, tx?: Prisma.TransactionClient | null): Promise<number> {
  const amount = tzs(stakeTzs);
  if (!(amount > 0)) return 0;
  return reverseWageringCore(userId, amount, tx);
}

async function reverseWageringCore(userId: string, amount: number, tx?: Prisma.TransactionClient | null): Promise<number> {
  let toReverse = amount;
  let reversed = 0;
  let relockedGrants = 0;
  let relockedTzs = 0;
  let shortfallTzs = 0;
  // ⛔ E-224 · THE POPULATION IS ACTIVE **AND FULFILLED**, NOT ACTIVE. This line used to read
  // `listActiveByUser`, whose DAL filter is literally `status: "ACTIVE"` — so a FULFILLED grant
  // was not skipped by a condition anyone could see, it was INVISIBLE TO THE QUERY. The
  // docstring above once claimed a fulfilled grant is "left untouched (its cash is real)", and
  // that is exactly the assumption that failed: the bet which COMPLETED the wagering may be the
  // very one later refunded, and then the player cleared the bonus having risked nothing.
  // ⭐ ACTIVE grants are reversed FIRST — same set, same newest-first order, behaviour identical
  // to before — so an ordinary refund against a running grant is unchanged, and only leftover
  // turnover can ever reach the re-lock path below.
  const reversible = await db.bonusGrant.listReversibleByUser(userId);
  const running = reversible.filter((g) => g.status === "ACTIVE").reverse();    // newest-first
  const cleared = reversible.filter((g) => g.status === "FULFILLED").reverse(); // newest-first
  for (const g of [...running, ...cleared]) {
    if (toReverse <= 0) break;
    const take = Math.min(toReverse, g.wageredTzs);
    if (take <= 0) continue;
    const newWagered = g.wageredTzs - take;
    reversed += take;
    toReverse -= take;

    // An ACTIVE grant only ever loses progress — it holds no converted cash. A FULFILLED grant
    // whose turnover is STILL at or above the requirement stays fulfilled: the obligation is met
    // even after the reversal, so nothing re-locks.
    if (g.status === "ACTIVE" || newWagered >= g.wagerRequiredTzs) {
      await db.bonusGrant.update(g.id, { wageredTzs: newWagered }, tx);
      continue;
    }

    // ── THE RE-LOCK ────────────────────────────────────────────────────────────────────────
    // ⭐ ALI RULED, 2026-08-26: "A RETURNED STAKE DOES NOT DISCHARGE A WAGERING OBLIGATION — AND
    // NOTHING IS EVER CLAWED BACK. THE BONUS IS RE-LOCKED, NOT TAKEN." The player keeps every
    // shilling; only the WITHDRAWABLE portion moves back into the locked bonus wallet, so total
    // holdings are unchanged to the shilling. The terms require the bonus to be WAGERED before
    // withdrawal, and a refunded bet was not, in the end, a wager — the money came back.
    // ⛔ The status it returns to is ACTIVE. There is no IN_PROGRESS in BonusGrantStatus
    // (ACTIVE|QUEUED|FULFILLED|EXPIRED|CANCELLED|FORFEITED), and a guard written against that
    // word would stay green for ever.
    // ⚠️ Under sequentialBonuses this can leave two ACTIVE grants for a moment, if a QUEUED one
    // was promoted when this grant fulfilled. That is correct and transient: the invariant is a
    // SUM over ACTIVE grants, recordWageringCore walks them oldest-first so the re-locked grant
    // clears first, and the alternative — demoting the promoted grant — would move money that
    // the ruling says must not move.
    const owed = g.remainingTzs;
    // ⚠️ THE SHORT RE-LOCK, NAMED RATHER THAN ROUNDED AWAY. If the player already spent or
    // withdrew the unlocked cash, `balance < owed`. Re-lock what EXISTS, never drive the balance
    // negative, and record the gap explicitly BY NAME — the ruling forbids a clawback, so the
    // shortfall must be VISIBLE rather than silently absorbed. ⛔ No obligation field and no
    // migration (ruled out 2026-08-27): the audit row IS the record. A re-lock that quietly
    // moved less than it claimed would be the same class of defect as the one being fixed.
    const wallet = await db.wallet.findByUserId(userId, tx);
    const available = Math.max(0, wallet?.balance ?? 0);
    const relock = Math.min(owed, available);
    const shortfall = owed - relock;

    if (relock > 0) {
      const moved = await db.wallet.adjust(g.walletId, { balance: -relock, bonusBalance: relock }, { requireBalanceGte: relock }, tx);
      if (!moved) {
        // Guard miss — a concurrent debit landed between the read and the atomic adjust. Leave
        // the grant FULFILLED and the money untouched rather than half-applying it. The turnover
        // reversal above still stands, so a later refund re-attempts this.
        audit({ category: "WALLET", action: "bonus.relock_aborted_guard", actorId: userId, targetType: "BonusGrant", targetId: g.id, payload: { userId, owedTzs: owed, attemptedTzs: relock, reason: "balance<relock" } });
        continue;
      }
      const nowIso = new Date().toISOString();
      const relockTxnId = `txn_${randomId(12)}`;
      await db.txn.create({
        id: relockTxnId,
        walletId: g.walletId,
        userId,
        // ⛔ NOT a negative BONUS_CREDIT, and the reason is measured rather than stylistic:
        // wallet/page.tsx maps BONUS_CREDIT to "deposit" (an INCOMING row), and report-money.ts
        // sums the ABSOLUTE value of every BONUS_CREDIT into bonus cost — so a negative one
        // would paint a debit as a credit to the player AND inflate the very cost it should
        // reduce. ADJUSTMENT_DEBIT paints as outgoing and sits in no GGR/NGR bucket, which
        // leaves the books untouched.
        type: "ADJUSTMENT_DEBIT",
        status: "CONFIRMED",
        amount: -relock,
        fee: 0,
        taxWithheld: 0,
        balanceAfter: moved.balance,
        currency: "TZS",
        provider: "INTERNAL",
        providerRef: null,
        msisdn: null,
        // The player reads THIS — wallet-client renders `tx.description ?? tx.type`.
        description: "Bonus re-locked — the refunded bet did not complete the wagering",
        positionId: null,
        amlReason: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: nowIso,
      }, tx);
      if (tx) await postLedgerEntries(`brelock_${relockTxnId}`, bonusRelockEntries({ txnId: relockTxnId, userId, amount: relock }), tx);
      else postLedgerEntries(`brelock_${relockTxnId}`, bonusRelockEntries({ txnId: relockTxnId, userId, amount: relock })).catch(() => {});
    }

    // ⛔ E-224 · THE EXPIRY TRAP, AND IT IS A CLAWBACK BY THE BACK DOOR — found by an
    // adversarial re-read of this very change, not by the design. A grant carries
    // `expiresAt = createdAt + defaultExpiryDays` (30 by config). If it FULFILS near that date
    // and a refund re-locks it AFTER the date has passed, the grant returns to ACTIVE carrying
    // an expiry already behind it — and `expireActiveGrants` selects exactly
    // `status = ACTIVE AND expiresAt < now`, so the very next sweep would REMOVE the re-locked
    // money from bonusBalance. The player would end with NEITHER the cash NOR the bonus.
    // ⭐ SO THE RE-LOCK RESTARTS THE CLOCK. The player did not choose this — the platform voided
    // the market — and a restored obligation that cannot be cleared is a confiscation wearing a
    // re-lock's clothes. The window becomes at least one full default period from the moment of
    // the re-lock, and never shorter than what was already there. It leans deliberately in the
    // PLAYER's direction: the obligation itself is restored in full so nothing is given away,
    // and the alternative is taking money over a void that was not their doing.
    // ⚠️ A grant that never had an expiry keeps none.
    const relockExpiryDays = getBonusConfig().defaultExpiryDays;
    const relockExpiresAt = g.expiresAt
      ? new Date(Math.max(Date.parse(g.expiresAt), Date.now() + relockExpiryDays * 86_400_000)).toISOString()
      : null;

    // `remainingTzs: relock`, NOT `owed` — the invariant is bonusBalance == the SUM of
    // remainingTzs over ACTIVE grants, and only `relock` actually reached bonusBalance. Setting
    // `owed` here would break the reconciler by exactly the shortfall.
    await db.bonusGrant.update(g.id, { wageredTzs: newWagered, remainingTzs: relock, status: "ACTIVE", fulfilledAt: null, expiresAt: relockExpiresAt }, tx);
    relockedGrants++;
    relockedTzs += relock;
    shortfallTzs += shortfall;
    audit({
      category: "WALLET",
      action: "bonus.relocked",
      actorId: userId,
      targetType: "BonusGrant",
      targetId: g.id,
      payload: {
        userId,
        owedTzs: owed,
        relockedTzs: relock,
        // ⚠️ NAMED, never rounded away: the part of the unlocked cash that was already gone.
        // Nothing is clawed back — the obligation simply is not discharged.
        shortfallTzs: shortfall,
        wageredTzs: newWagered,
        wagerRequiredTzs: g.wagerRequiredTzs,
        // ⚠️ Recorded because it MOVED: a re-lock that inherited a dead expiry would be swept
        // away by expireActiveGrants on the next pass — a clawback by the back door.
        expiresAtWas: g.expiresAt,
        expiresAtNow: relockExpiresAt,
        note: "re-locked, not taken: total holdings unchanged, only the withdrawable portion moved",
      },
    });
  }
  if (reversed > 0) audit({ category: "WALLET", action: "bonus.wagering_reversed", actorId: userId, targetType: "Wallet", targetId: userId, payload: { requested: amount, reversed, relockedGrants, relockedTzs, shortfallTzs } });
  return reversed;
}

/**
 * Spend up to `amountTzs` of bonus funds (FIFO across ACTIVE grants), reducing
 * each grant's remainingTzs and the wallet's bonusBalance atomically. Returns the
 * total actually spent (capped at available bonus) and the per-grant allocations,
 * so a later void can refund the exact same grants. Does NOT record wagering —
 * the caller records turnover separately. Intended for the bonus-funded portion
 * of a bet (Phase 4).
 */
export async function spendBonus(userId: string, amountTzs: number): Promise<{ spent: number; allocations: BonusAllocation[] }> {
  const amount = tzs(amountTzs);
  if (!(amount > 0)) return { spent: 0, allocations: [] };
  return withLock(`wallet:${userId}`, () => spendBonusCore(userId, amount));
}

/**
 * Lock-free variant of spendBonus for callers that ALREADY hold
 * `withLock("wallet:<userId>")` — e.g. bet placement, which must debit real +
 * bonus atomically inside its own wallet lock (re-acquiring the same key would
 * deadlock). Do NOT call this without holding the wallet lock.
 *
 * tx (bet-stake single-tx): pass the caller's open money `$transaction` client
 * to run EVERY read and write in that transaction — a mid-bet failure then rolls
 * the grant decrements + bonusBalance debit back with the rest of the movement.
 * In tx mode the `bonus.spent` audit is NOT raised here (the tx may still roll
 * back); the caller raises it after commit. Guard-miss compensation is also
 * skipped in tx mode — the caller aborts the tx and rollback undoes the grants.
 */
export async function spendBonusLocked(userId: string, amountTzs: number, tx?: Prisma.TransactionClient | null): Promise<{ spent: number; allocations: BonusAllocation[] }> {
  const amount = tzs(amountTzs);
  if (!(amount > 0)) return { spent: 0, allocations: [] };
  return spendBonusCore(userId, amount, tx);
}

async function spendBonusCore(userId: string, amount: number, tx?: Prisma.TransactionClient | null): Promise<{ spent: number; allocations: BonusAllocation[] }> {
  const wallet = await db.wallet.findByUserId(userId, tx);
  if (!wallet) return { spent: 0, allocations: [] };
  let toSpend = Math.min(amount, wallet.bonusBalance ?? 0);
  if (toSpend <= 0) return { spent: 0, allocations: [] };

  const allocations: BonusAllocation[] = [];
  let spent = 0;
  const active = await db.bonusGrant.listActiveByUser(userId, tx); // FIFO
  for (const g of active) {
    if (toSpend <= 0) break;
    const take = Math.min(toSpend, g.remainingTzs);
    if (take <= 0) continue;
    await db.bonusGrant.update(g.id, { remainingTzs: g.remainingTzs - take }, tx);
    allocations.push({ grantId: g.id, amount: take });
    spent += take;
    toSpend -= take;
  }
  if (spent > 0) {
    // Guarded debit (defense-in-depth): never drive bonusBalance negative even if
    // a future caller forgets the wallet lock. On a guard miss, roll back the
    // per-grant remaining decrements we just made and report nothing spent.
    // In tx mode the caller aborts the whole transaction on an under-spend, so
    // the manual re-increment (which would double-apply after rollback) is skipped.
    const adjusted = await db.wallet.adjust(wallet.id, { bonusBalance: -spent }, { requireBonusBalanceGte: spent }, tx);
    if (!adjusted) {
      if (!tx) {
        for (const a of allocations) {
          const g = await db.bonusGrant.findById(a.grantId);
          if (g) await db.bonusGrant.update(a.grantId, { remainingTzs: g.remainingTzs + a.amount });
        }
      }
      return { spent: 0, allocations: [] };
    }
    // Deferred in tx mode: an audit raised here would survive a later rollback
    // and narrate a spend that never happened. The caller audits after commit.
    if (!tx) audit({ category: "WALLET", action: "bonus.spent", actorId: userId, targetType: "Wallet", targetId: wallet.id, payload: { spent, allocations } });
  }
  return { spent, allocations };
}

/**
 * Refund `amountTzs` of bonus stake back into the bonus wallet on a market void
 * (the bonus portion of a refunded bet returns to bonus, not real). Adds it to
 * the player's oldest ACTIVE grant and bumps bonusBalance, under the wallet lock.
 * Wagering progress is NOT reversed. Returns how much landed in the bonus wallet;
 * if the player has no ACTIVE grant left to hold it, returns 0 so the caller can
 * refund that remainder to real balance instead (player never loses money).
 */
export async function refundBonusToActive(userId: string, amountTzs: number): Promise<{ refundedToBonus: number }> {
  const amount = tzs(amountTzs);
  if (!(amount > 0)) return { refundedToBonus: 0 };
  return withLock(`wallet:${userId}`, async () => {
    const active = await db.bonusGrant.listActiveByUser(userId); // oldest first
    let target = active[0];
    if (!target) {
      // Money must never evaporate (audit C2). A voided bet means the player took
      // no risk, so the bonus stake must come back. If no ACTIVE grant remains to
      // hold it (the original was fulfilled or expired), mint a zero-wagering
      // restitution grant — zero is correct because the original turnover was
      // already served — so the refund lands in the bonus wallet instead of being
      // silently forfeited. This is restitution of the player's own stake, NOT a
      // promotional incentive, so it deliberately does NOT route through
      // creditBonus (whose RG-lockout suppression must never block a refund).
      const wallet = await db.wallet.findByUserId(userId);
      if (!wallet) return { refundedToBonus: 0 }; // no wallet — nothing safe to do
      const nowIso = new Date().toISOString();
      target = {
        id: `bg_${randomId(12)}`,
        userId,
        walletId: wallet.id,
        amountTzs: amount,
        remainingTzs: 0, // the update below adds `amount`
        wagerMultiplier: 1,
        wagerRequiredTzs: 0, // zero wagering — turnover already served
        wageredTzs: 0,
        source: "ADMIN",
        sourceRef: `void-restitution:${randomId(8)}`,
        status: "ACTIVE",
        expiresAt: null,
        fulfilledAt: null,
        note: "Void restitution — bonus stake returned after market void",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.bonusGrant.create(target);
      audit({ category: "WALLET", action: "bonus.void_restitution_grant", actorId: userId, targetType: "BonusGrant", targetId: target.id, payload: { amount, reason: "no active grant to hold voided bonus refund" } });
    }
    await db.bonusGrant.update(target.id, { remainingTzs: target.remainingTzs + amount });
    await db.wallet.adjust(target.walletId, { bonusBalance: amount });
    audit({ category: "WALLET", action: "bonus.refund_to_active", actorId: userId, targetType: "BonusGrant", targetId: target.id, payload: { amount } });
    return { refundedToBonus: amount };
  });
}

/**
 * Refund previously-spent bonus allocations back into their grants and the bonus
 * wallet (used when a bonus-funded bet's market is voided). Wagering progress is
 * NOT reversed (industry standard). Allocations whose grant is no longer ACTIVE
 * are skipped (the bonus principal is already settled). Returns the total refunded.
 */
export async function refundBonus(userId: string, allocations: BonusAllocation[]): Promise<number> {
  if (!allocations.length) return 0;
  return withLock(`wallet:${userId}`, () => refundBonusLocked(userId, allocations));
}

/**
 * Lock-free variant of {@link refundBonus} — the caller MUST already hold
 * `wallet:{userId}`. Used by buyPosition's in-flight abort (a stake spent from
 * the bonus wallet for a bet that then hit a just-closed market) to return the
 * exact allocations without re-acquiring the wallet lock (which would deadlock).
 */
export async function refundBonusLocked(userId: string, allocations: BonusAllocation[]): Promise<number> {
  if (!allocations.length) return 0;
  const wallet = await db.wallet.findByUserId(userId);
  if (!wallet) return 0;
  let refunded = 0;
  for (const a of allocations) {
    const amt = tzs(a.amount);
    if (!(amt > 0)) continue;
    const g = await db.bonusGrant.findById(a.grantId);
    if (!g || g.status !== "ACTIVE") continue;
    await db.bonusGrant.update(g.id, { remainingTzs: g.remainingTzs + amt });
    await db.wallet.adjust(wallet.id, { bonusBalance: amt });
    refunded += amt;
  }
  if (refunded > 0) {
    audit({ category: "WALLET", action: "bonus.refunded", actorId: userId, targetType: "Wallet", targetId: wallet.id, payload: { refunded, allocations } });
  }
  return refunded;
}

/**
 * Expire every ACTIVE grant past its expiresAt: remove the unspent remainder from
 * bonusBalance and mark the grant EXPIRED. Intended for a scheduled sweep (Phase 8).
 */
export async function expireActiveGrants(): Promise<{ expired: number; removedTzs: number }> {
  const nowIso = new Date().toISOString();
  const due = await db.bonusGrant.listExpired(nowIso);
  let expired = 0;
  let removedTzs = 0;
  for (const g of due) {
    const outcome = await withLock(`wallet:${g.userId}`, async (): Promise<{ removed: number; amountTzs: number } | null> => {
      const fresh = await db.bonusGrant.findById(g.id);
      if (!fresh || (fresh.status !== "ACTIVE" && fresh.status !== "QUEUED")) return null;
      const rem = fresh.remainingTzs;
      // Only deduct from bonusBalance if the grant was ACTIVE (QUEUED grants haven't touched bonusBalance).
      // Guarded so a drifted invariant can't drive bonusBalance below 0 (CHECK 23514) — log a miss instead of throwing.
      if (rem > 0 && fresh.status === "ACTIVE") {
        const ok = await db.wallet.adjust(fresh.walletId, { bonusBalance: -rem }, { requireBonusBalanceGte: rem });
        if (!ok) audit({ category: "WALLET", action: "bonus.expire_guard_miss", actorId: null, targetType: "BonusGrant", targetId: fresh.id, payload: { rem, userId: fresh.userId } });
        else postLedgerEntries(`bexpire_${fresh.id}`, bonusExpireEntries({ userId: fresh.userId, amount: rem })).catch(() => {});
      }
      // ⛔ E-224 · EXPIRY STILL ZEROES remainingTzs, AND THE ASYMMETRY IS DELIBERATE.
      // Fulfilment preserves the field (see recordWageringCore) because the remainder was
      // CONVERTED to real cash and a re-lock can send it back. On expiry the remainder is
      // REMOVED from the player entirely — there is nothing to return and nothing to reverse.
      // Only a conversion is reversible.
      await db.bonusGrant.update(fresh.id, { status: "EXPIRED", remainingTzs: 0 });
      audit({ category: "WALLET", action: "bonus.expired", actorId: null, targetType: "BonusGrant", targetId: fresh.id, payload: { userId: fresh.userId, removedTzs: fresh.status === "ACTIVE" ? rem : 0, amountTzs: fresh.amountTzs, wasQueued: fresh.status === "QUEUED" } });
      return { removed: fresh.status === "ACTIVE" ? rem : 0, amountTzs: fresh.amountTzs };
    });
    if (outcome) {
      expired++;
      removedTzs += outcome.removed;
      notifyBonusExpired(g.userId, { amountTzs: outcome.amountTzs }).catch(() => {});
      // Sequential: activate next queued grant for this user.
      try { await withLock(`wallet:${g.userId}`, () => activateNextQueued(g.userId)); } catch { /* best-effort */ }
    }
  }
  return { expired, removedTzs };
}

/**
 * Admin/player cancel of an ACTIVE grant: remove the unspent remainder from the
 * bonus wallet and mark CANCELLED. Wagering progress is discarded.
 */
export async function cancelGrant(grantId: string, actorId: string, reason?: string):
  | Promise<{ ok: true; removedTzs: number } | { ok: false; error: string }> {
  return withLock(`wallet:bonus-cancel:${grantId}`, async () => {
    const g = await db.bonusGrant.findById(grantId);
    if (!g) return { ok: false as const, error: "Bonus grant not found." };
    if (g.status !== "ACTIVE") return { ok: false as const, error: `Grant is ${g.status.toLowerCase()}, not active.` };
    return withLock(`wallet:${g.userId}`, async () => {
      const fresh = await db.bonusGrant.findById(grantId);
      if (!fresh || fresh.status !== "ACTIVE") return { ok: false as const, error: "Grant is no longer active." };
      const rem = fresh.remainingTzs;
      // Guarded so a drifted invariant can't drive bonusBalance below 0 (CHECK 23514).
      if (rem > 0) {
        const ok = await db.wallet.adjust(fresh.walletId, { bonusBalance: -rem }, { requireBonusBalanceGte: rem });
        if (!ok) audit({ category: "ADMIN", action: "bonus.cancel_guard_miss", actorId, targetType: "BonusGrant", targetId: fresh.id, payload: { rem, userId: fresh.userId } });
        else postLedgerEntries(`bcancel_${fresh.id}`, bonusExpireEntries({ userId: fresh.userId, amount: rem })).catch(() => {});
      }
      // ⛔ E-224 · CANCELLATION STILL ZEROES remainingTzs — same asymmetry as expiry above:
      // the remainder is REMOVED, not converted, so nothing can be re-locked later.
      await db.bonusGrant.update(fresh.id, { status: "CANCELLED", remainingTzs: 0, note: reason ?? fresh.note });
      audit({ category: "ADMIN", action: "bonus.cancelled", actorId, targetType: "BonusGrant", targetId: fresh.id, payload: { userId: fresh.userId, removedTzs: rem, reason: reason ?? null } });
      // Sequential: activate next queued grant now that this one is cancelled.
      await activateNextQueued(fresh.userId);
      return { ok: true as const, removedTzs: rem };
    });
  });
}

/**
 * Sequential bonus queue: after a grant finishes (fulfilled/expired/cancelled),
 * activate the next QUEUED grant for that user (oldest first). Adds its amount
 * to bonusBalance and marks it ACTIVE. Called automatically from the fulfillment,
 * expiry, and cancellation paths. No-op when sequential mode is off or no grants
 * are queued. Must run INSIDE the wallet lock for the user.
 */
async function activateNextQueued(userId: string, tx?: Prisma.TransactionClient | null): Promise<void> {
  const cfg = getBonusConfig();
  if (!cfg.sequentialBonuses) return;

  // Check if there's still an active grant — don't promote if one is running.
  const all = await db.bonusGrant.listByUser(userId);
  const hasActive = all.some((g) => g.status === "ACTIVE");
  if (hasActive) return;

  const nextQueued = all
    .filter((g) => g.status === "QUEUED")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!nextQueued) return;

  const wallet = await db.wallet.findByUserId(userId);
  if (!wallet || wallet.status !== "ACTIVE") return;

  await db.bonusGrant.update(nextQueued.id, { status: "ACTIVE" }, tx);
  await db.wallet.adjust(wallet.id, { bonusBalance: nextQueued.remainingTzs }, undefined, tx);
  // Dual-write: queued bonus activation to double-entry ledger (fire-and-forget).
  postLedgerEntries(`bonus_${nextQueued.id}`, bonusGrantEntries({ groupId: `bonus_${nextQueued.id}`, userId, amount: nextQueued.remainingTzs })).catch(() => {});
  audit({
    category: "WALLET",
    action: "bonus.activated_from_queue",
    actorId: userId,
    targetType: "BonusGrant",
    targetId: nextQueued.id,
    payload: { amountTzs: nextQueued.amountTzs, source: nextQueued.source },
  });

  // Notify + email player that their queued bonus is now active.
  notifyBonusCredited(userId, { amountTzs: nextQueued.amountTzs, wagerRequiredTzs: nextQueued.wagerRequiredTzs }).catch(() => {});
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: `Bonus activated · ${formatTzs(nextQueued.amountTzs)}`,
    html: bonusCreditedHtml({ amountTzs: nextQueued.amountTzs, wagerRequiredTzs: nextQueued.wagerRequiredTzs, sourceLabel: BONUS_SOURCE_EMAIL_LABEL[nextQueued.source] ?? "Bonus" }),
    tag: "bonus",
  })).catch(() => {});
}

export type BonusGrantView = Omit<StoredBonusGrant, "remainingTzs"> & {
  /** ⛔ E-224 · NULLABLE, and `null` means "this figure is not locked bonus money". See
   *  toGrantView below — the field is suppressed at the SOURCE for any status where the number
   *  would be a false statement about the player's bonus wallet. */
  remainingTzs: number | null;
  /** Wagering completion 0–100 (rounded). */
  progressPct: number;
  /** Turnover still required before this grant unlocks. */
  remainingWagerTzs: number;
};

export function toGrantView(g: StoredBonusGrant): BonusGrantView {
  const progressPct = g.wagerRequiredTzs > 0 ? Math.min(100, Math.round((g.wageredTzs / g.wagerRequiredTzs) * 100)) : 100;
  return {
    ...g,
    // ⛔ E-224 · SUPPRESSED HERE, AT THE VIEW BOUNDARY, NOT IN A TEMPLATE. `getBonusSummary`
    // builds its `grants` array from `listByUser`, which has NO status filter, and this mapper
    // used to spread `remainingTzs` straight through — so a FULFILLED grant (which now KEEPS
    // the figure it converted to real cash) would report already-withdrawable money as locked
    // bonus. The only thing standing between that and the player was a
    // `.filter(status === "ACTIVE" || "QUEUED")` in a DIFFERENT FILE (app/wallet/page.tsx),
    // which is precisely the arrangement this commit rejected for the admin ledger row:
    // deleting one line there would have shipped the defect with tsc and every bonus suite
    // green. ⭐ Nulled at the source, a future renderer cannot reintroduce it.
    remainingTzs: g.status === "ACTIVE" || g.status === "QUEUED" ? g.remainingTzs : null,
    progressPct,
    remainingWagerTzs: Math.max(0, g.wagerRequiredTzs - g.wageredTzs),
  };
}

/**
 * Player-facing summary: current bonus balance + each grant with its wagering
 * progress. Used by the wallet UI and the admin player view.
 */
export async function getBonusSummary(userId: string): Promise<{
  bonusBalance: number;
  activeCount: number;
  activeWagerRemainingTzs: number;
  grants: BonusGrantView[];
}> {
  const wallet = await db.wallet.findByUserId(userId);
  const grants = (await db.bonusGrant.listByUser(userId)).map(toGrantView);
  const active = grants.filter((g) => g.status === "ACTIVE");
  return {
    bonusBalance: wallet?.bonusBalance ?? 0,
    activeCount: active.length,
    activeWagerRemainingTzs: active.reduce((s, g) => s + g.remainingWagerTzs, 0),
    grants,
  };
}

/** Mask a player for the operator ledger: prefer display name, else +255•••123.
 *  Inlined (not imported from affiliate-service) to keep this module free of a
 *  future circular dependency when affiliate routing calls into bonus-service. */
function maskHandle(displayName: string | null, phoneE164: string): string {
  const name = (displayName ?? "").trim();
  if (name) return name;
  const digits = (phoneE164 ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? `+${digits.slice(0, 3)}•••${digits.slice(-3)}` : (phoneE164 || "—");
}

export type AdminBonusLedgerRow = {
  id: string;
  userId: string;
  playerHandle: string;
  amountTzs: number;
  /** ⛔ E-224 · `null` renders as an em dash. This is the ONE reader of `remainingTzs` in the
   *  codebase with no status filter, and since fulfilment now PRESERVES the field (see
   *  recordWageringCore) an unsuppressed value would show a "remaining bonus" figure against a
   *  grant whose money is already real. It is honest only where it means "locked bonus money
   *  right now" — ACTIVE and QUEUED. Everything else is nulled at the source rather than in the
   *  template, so a future renderer cannot reintroduce the defect by reading the field. */
  remainingTzs: number | null;
  wageredTzs: number;
  wagerRequiredTzs: number;
  progressPct: number;
  source: BonusSource;
  status: StoredBonusGrant["status"];
  createdAt: string;
  expiresAt: string | null;
};

/**
 * Operator dashboard data for /admin/bonuses: outstanding liability, counts, and
 * the recent grant ledger with masked player handles.
 */
export async function getAdminBonusStats(limit = 200): Promise<{
  outstandingTzs: number;
  activeGrants: number;
  totalGrantedTzs: number;
  totalFulfilledTzs: number;
  ledger: AdminBonusLedgerRow[];
}> {
  const wallets = await db.wallet.listAll();
  const outstandingTzs = wallets.reduce((s, w) => s + (w.bonusBalance ?? 0), 0);

  const all = await db.bonusGrant.listAll(5000);
  const activeGrants = all.filter((g) => g.status === "ACTIVE").length;
  const totalGrantedTzs = all.reduce((s, g) => s + g.amountTzs, 0);
  const totalFulfilledTzs = all.filter((g) => g.status === "FULFILLED").reduce((s, g) => s + g.amountTzs, 0);

  const recent = all.slice(0, limit);
  const userIds = Array.from(new Set(recent.map((g) => g.userId)));
  const users = new Map<string, { displayName: string | null; phoneE164: string }>();
  for (const id of userIds) {
    const u = await db.user.findById(id);
    if (u) users.set(id, { displayName: u.displayName, phoneE164: u.phoneE164 });
  }

  const ledger: AdminBonusLedgerRow[] = recent.map((g) => {
    const v = toGrantView(g);
    const u = users.get(g.userId);
    return {
      id: g.id,
      userId: g.userId,
      playerHandle: maskHandle(u?.displayName ?? null, u?.phoneE164 ?? ""),
      amountTzs: g.amountTzs,
      // ⛔ E-224 · suppressed unless the number is CURRENTLY locked bonus money. A FULFILLED
      // grant keeps `remainingTzs` so the re-lock has a figure to move, and painting that as
      // "remaining" to an operator would be a false money statement.
      // ⚠️ QUEUED is included deliberately, which is a hair wider than the audit note that said
      // "non-ACTIVE": a QUEUED grant genuinely holds its full amount pending activation, so the
      // figure is true there. This matches the filter the player wallet page already uses, and
      // the only status the change actually suppresses is FULFILLED. Flagged for Ali.
      remainingTzs: g.status === "ACTIVE" || g.status === "QUEUED" ? g.remainingTzs : null,
      wageredTzs: g.wageredTzs,
      wagerRequiredTzs: g.wagerRequiredTzs,
      progressPct: v.progressPct,
      source: g.source,
      status: g.status,
      createdAt: g.createdAt,
      expiresAt: g.expiresAt,
    };
  });

  return { outstandingTzs, activeGrants, totalGrantedTzs, totalFulfilledTzs, ledger };
}
