import { withLock } from "./locks";
import { db } from "./store";

/** Claim before any asynchronous form gate. The global unique key arbitrates
 * cross-worker requests; an interrupted claimant remains uncertain, never fresh. */
export async function beginDepositActionClaim(ownerId: string, key: string): Promise<"claimed" | "existing" | "refused" | "uncertain" | "conflict"> {
  try {
    return await withLock(`wallet:${ownerId}`, async (tx) => {
      const row = await db.txn.findByIdempotencyKey(key, tx);
      if (row) return row.userId === ownerId && row.type === "DEPOSIT" ? "existing" : "conflict";
      const prior = await db.depositFundingClaim.findByKey(key, tx);
      if (prior) {
        if (prior.userId !== ownerId) return "conflict";
        return prior.state === "REFUSED" ? "refused" : "uncertain";
      }
      await db.depositFundingClaim.create(key, ownerId, tx);
      return "claimed";
    });
  } catch {
    // Includes a concurrent global-unique insert by another owner. Never dispatch on an unknown claim.
    return "uncertain";
  }
}

/** A refused form may release its tab key only when its original durable claim
 * is terminal and no payment row exists. Mark REFUSED under the same wallet lock
 * used by reservation, so a late same-key request cannot reserve afterwards. */
export async function depositRefusalDisposition(ownerId: string, key: string): Promise<"release" | "recover" | "conflict"> {
  return withLock(`wallet:${ownerId}`, async (tx) => {
    const row = await db.txn.findByIdempotencyKey(key, tx);
    if (row) return row.userId === ownerId && row.type === "DEPOSIT" ? "recover" : "conflict";
    const claim = await db.depositFundingClaim.findByKey(key, tx);
    if (!claim || claim.userId !== ownerId) return "conflict";
    if (claim.state === "REFUSED") return "release";
    return await db.depositFundingClaim.markRefused(key, ownerId, tx) ? "release" : "recover";
  });
}
