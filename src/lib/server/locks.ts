/**
 * Per-key serialization mutex.
 * In-memory dev: prevents race conditions on the same wallet / round / user.
 * Production: this becomes a Postgres `SELECT FOR UPDATE` row lock or Redis Redlock.
 *
 * Compliance:
 *  - Without this, two concurrent bets debit the same balance twice (double-spend).
 *  - Without this, two concurrent round settlements pay winners twice.
 */

const locks = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  // chain: when prev finishes, our turn begins; we release `next` when done.
  const tail = prev.then(() => next);
  locks.set(key, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    // garbage-collect: only delete if our `tail` is still the latest entry.
    // (Previous code called `.then()` again, creating a new Promise that
    // could never === the stored one — locks were never cleaned up.)
    if (locks.get(key) === tail) locks.delete(key);
  }
}
