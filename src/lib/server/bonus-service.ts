/**
 * Bonus-wallet service — the money-safe core of the bonus feature.
 *
 * A BonusGrant is one promotional credit that lives in Wallet.bonusBalance and
 * is NOT withdrawable until its wagering requirement is met. The invariant this
 * module preserves at all times:
 *
 *     wallet.bonusBalance == Σ remainingTzs over the wallet's ACTIVE grants
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
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { audit } from "./audit";
import { getBonusConfig } from "./bonus-config";
import { notifyBonusCredited, notifyBonusFulfilled, notifyBonusExpired } from "./notification-service";
import { sendEmailToUser, bonusCreditedHtml, bonusFulfilledHtml } from "./email";
import { postLedgerEntries, bonusGrantEntries, bonusCreditEntries, bonusExpireEntries } from "./ledger";
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
export async function recordWageringLocked(userId: string, stakeTzs: number): Promise<WageringResult> {
  const amount = tzs(stakeTzs);
  if (!(amount > 0)) return { fulfilled: [], creditedToRealTzs: 0 };
  return recordWageringCore(userId, amount);
}

async function recordWageringCore(userId: string, amount: number): Promise<WageringResult> {
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
        const updatedWallet = await db.wallet.adjust(g.walletId, { bonusBalance: -moved, balance: moved }, { requireBonusBalanceGte: moved });
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
        });
        // Dual-write: bonus unlock to double-entry ledger (fire-and-forget).
        postLedgerEntries(`bfulfill_${bonusTxnId}`, bonusCreditEntries({ txnId: bonusTxnId, userId, amount: moved })).catch(() => {});
        creditedToReal += moved;
      }
      const done = await db.bonusGrant.update(g.id, { wageredTzs: newWagered, remainingTzs: 0, status: "FULFILLED", fulfilledAt: new Date().toISOString() });
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
      await activateNextQueued(userId);
    } else if (applied > 0) {
      await db.bonusGrant.update(g.id, { wageredTzs: newWagered });
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
  return withLock(`wallet:${userId}`, async () => {
    let toReverse = amount;
    let reversed = 0;
    const active = (await db.bonusGrant.listActiveByUser(userId)).reverse(); // newest-first
    for (const g of active) {
      if (toReverse <= 0) break;
      const take = Math.min(toReverse, g.wageredTzs);
      if (take <= 0) continue;
      await db.bonusGrant.update(g.id, { wageredTzs: g.wageredTzs - take });
      reversed += take;
      toReverse -= take;
    }
    if (reversed > 0) audit({ category: "WALLET", action: "bonus.wagering_reversed", actorId: userId, targetType: "Wallet", targetId: userId, payload: { requested: amount, reversed } });
    return reversed;
  });
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
 */
export async function spendBonusLocked(userId: string, amountTzs: number): Promise<{ spent: number; allocations: BonusAllocation[] }> {
  const amount = tzs(amountTzs);
  if (!(amount > 0)) return { spent: 0, allocations: [] };
  return spendBonusCore(userId, amount);
}

async function spendBonusCore(userId: string, amount: number): Promise<{ spent: number; allocations: BonusAllocation[] }> {
  const wallet = await db.wallet.findByUserId(userId);
  if (!wallet) return { spent: 0, allocations: [] };
  let toSpend = Math.min(amount, wallet.bonusBalance ?? 0);
  if (toSpend <= 0) return { spent: 0, allocations: [] };

  const allocations: BonusAllocation[] = [];
  let spent = 0;
  const active = await db.bonusGrant.listActiveByUser(userId); // FIFO
  for (const g of active) {
    if (toSpend <= 0) break;
    const take = Math.min(toSpend, g.remainingTzs);
    if (take <= 0) continue;
    await db.bonusGrant.update(g.id, { remainingTzs: g.remainingTzs - take });
    allocations.push({ grantId: g.id, amount: take });
    spent += take;
    toSpend -= take;
  }
  if (spent > 0) {
    // Guarded debit (defense-in-depth): never drive bonusBalance negative even if
    // a future caller forgets the wallet lock. On a guard miss, roll back the
    // per-grant remaining decrements we just made and report nothing spent.
    const adjusted = await db.wallet.adjust(wallet.id, { bonusBalance: -spent }, { requireBonusBalanceGte: spent });
    if (!adjusted) {
      for (const a of allocations) {
        const g = await db.bonusGrant.findById(a.grantId);
        if (g) await db.bonusGrant.update(a.grantId, { remainingTzs: g.remainingTzs + a.amount });
      }
      return { spent: 0, allocations: [] };
    }
    audit({ category: "WALLET", action: "bonus.spent", actorId: userId, targetType: "Wallet", targetId: wallet.id, payload: { spent, allocations } });
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
    const target = active[0];
    if (!target) return { refundedToBonus: 0 };
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
async function activateNextQueued(userId: string): Promise<void> {
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

  await db.bonusGrant.update(nextQueued.id, { status: "ACTIVE" });
  await db.wallet.adjust(wallet.id, { bonusBalance: nextQueued.remainingTzs });
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

export type BonusGrantView = StoredBonusGrant & {
  /** Wagering completion 0–100 (rounded). */
  progressPct: number;
  /** Turnover still required before this grant unlocks. */
  remainingWagerTzs: number;
};

export function toGrantView(g: StoredBonusGrant): BonusGrantView {
  const progressPct = g.wagerRequiredTzs > 0 ? Math.min(100, Math.round((g.wageredTzs / g.wagerRequiredTzs) * 100)) : 100;
  return { ...g, progressPct, remainingWagerTzs: Math.max(0, g.wagerRequiredTzs - g.wageredTzs) };
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
  remainingTzs: number;
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
      remainingTzs: g.remainingTzs,
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
