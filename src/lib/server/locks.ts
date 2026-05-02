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
  locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    // garbage-collect: only delete if our `next` is still the tail
    if (locks.get(key) === prev.then(() => next)) locks.delete(key);
  }
}
