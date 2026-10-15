import { withLock } from "./locks";
import { db } from "./store";

/** A refused form may release its tab key only when no payment with that key was reserved.
 * Read under the same wallet lock that reserves and settles the deposit. Any read fault
 * stays uncertain; a foreign or non-deposit row must not reveal its receipt. */
export async function depositRefusalDisposition(ownerId: string, key: string): Promise<"release" | "recover" | "conflict"> {
  return withLock(`wallet:${ownerId}`, async (tx) => {
    const row = await db.txn.findByIdempotencyKey(key, tx);
    if (!row) return "release";
    return row.userId === ownerId && row.type === "DEPOSIT" ? "recover" : "conflict";
  });
}
