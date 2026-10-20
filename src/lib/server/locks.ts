/**
 * Per-key serialization mutex.
 *
 * Production (DATABASE_URL set): Postgres advisory locks via pg_advisory_xact_lock.
 * The lock is held for the duration of fn() inside a $transaction that pins to a
 * single DB connection. Auto-released on commit/rollback — no leak on crash.
 * Safe across multiple Railway instances — prevents double-spend and double-settlement.
 *
 * Dev (no DATABASE_URL): In-memory Promise-chain mutex (single-process only).
 *
 * Compliance:
 *  - Without this, two concurrent bets debit the same balance twice (double-spend).
 *  - Without this, two concurrent round settlements pay winners twice.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "./prisma";
import { hashKey64 } from "./lock-key";

// Re-exported for the existing callers/tests that import it from here. The
// implementation lives in ./lock-key so modules needing only the pure hash
// (audit.ts, which is reachable from the CLIENT graph) never pull in this
// file's `node:async_hooks` runtime — Turbopack cannot bundle that for a browser
// chunk, and doing so broke `npm run build`.
export { hashKey64 };

/* ── The ambient lock context (audit: 3 connections per bet → 1) ─────── */

/**
 * The transaction the innermost enclosing withLock() is holding, plus the set of
 * keys already locked on it.
 *
 * Why this exists: withAdvisoryLock used to open a $transaction PURELY to hold
 * pg_advisory_xact_lock, and passed nothing down — so a bet that nests
 * wallet:→market:→withMoneyTx pinned THREE pool connections and ran 8
 * BEGIN/COMMIT pairs. The ceiling was pool÷3, and past it P2024/P2028 surfaced
 * raw to the player. Carrying the tx here lets a nested withLock take its
 * advisory lock on the SAME transaction, and lets withMoneyTx join it, so a bet
 * costs ONE connection and one BEGIN/COMMIT.
 *
 * `tx` is null in the in-memory dev store — currentLockTx() then returns null and
 * every caller falls back to its existing no-database path unchanged.
 *
 * `committed` is what `afterCommit` queued on this transaction: run once it has COMMITTED,
 * by the outermost lock — the one that opened it — and dropped if it rolls back.
 */
type LockCtx = { tx: Prisma.TransactionClient | null; held: Set<string>; committed: Array<() => void> };
// Next can compile the same server module into separate route and action bundles. They must serialize the same
// in-memory rows and inherit the same ambient context, including same-key re-entry and transaction joining.
const lockGlobal = globalThis as typeof globalThis & {
  __50pickLocks?: { context: AsyncLocalStorage<LockCtx>; memory: Map<string, Promise<unknown>> };
};
const lockRuntime = lockGlobal.__50pickLocks ??= {
  context: new AsyncLocalStorage<LockCtx>(), memory: new Map<string, Promise<unknown>>(),
};
const lockStore = lockRuntime.context;

/**
 * The transaction of the enclosing withLock(), or null when there is none (or
 * when running on the in-memory store). `withMoneyTx` uses this to JOIN the
 * lock's transaction instead of opening a second one.
 */
export function currentLockTx(): Prisma.TransactionClient | null {
  return lockStore.getStore()?.tx ?? null;
}

/** True when any withLock() is currently held on this async context. */
export function inLock(): boolean {
  return lockStore.getStore() !== undefined;
}

/**
 * Run `fn` OUTSIDE every enclosing withLock(): nothing `fn` starts can see that lock's transaction.
 *
 * ⛔ WHY (house bots, plans/house-bots/C4-SPEC.md §2). AsyncLocalStorage is inherited by every promise started
 * inside a lock callback — including a fire-and-forget hook kicked off after the write. That hook's own
 * withLock would then JOIN a transaction that may already have committed, or that does not yet hold the row
 * the hook reacts to. A hook started from inside a lock goes through this, or runs after the outermost lock
 * returns.
 *
 * On the in-memory store the escaped callback is a top-level lock again, so it waits for a key the outer
 * lock still holds — the same wait Postgres gives a second transaction.
 */
export function runOutsideLock<T>(fn: () => T): T {
  return lockStore.exit(fn);
}

/**
 * Run `fn` once the work written on `tx` is COMMITTED — at once when there is nothing to wait for.
 *
 * ⭐ WHY (R9-D, 2026-10-11). A memo over the market table (`market-change-log.ts`) must hear about a write only when
 * every other connection can read it. A write on a lock's transaction is invisible to them until the outermost lock
 * commits, and settlement, the emergency void and a re-categorisation all write that way; noted at the write, a page
 * rendered in that gap re-reads the row as it was and keeps it as current.
 *
 * `tx` null or absent: the write auto-committed (or the in-memory store, which has no transaction) — `fn` runs now.
 * `tx` the enclosing lock's transaction: queued, and run by that lock after its `$transaction` resolves; a rollback
 * drops it, which is right, because nothing it describes happened. ⚠️ A transaction this module did not open cannot be
 * waited for, so `fn` runs now; no market write in src passes one (`test:results-freshness` holds that census).
 * ⛔ `fn` must not throw and must not take a lock: it runs after the money committed, and a failure here may not undo it.
 */
export function afterCommit(tx: Prisma.TransactionClient | null | undefined, fn: () => void): void {
  const ctx = lockStore.getStore();
  if (tx && ctx && ctx.tx === tx) {
    ctx.committed.push(fn);
    return;
  }
  runCommitted([fn]);
}

/** Each queued callback once, none able to stop the rest — they describe a write that has already committed. */
function runCommitted(fns: ReadonlyArray<() => void>): void {
  for (const fn of fns) {
    try { fn(); } catch { /* a notice about a committed write must never surface as that write failing */ }
  }
}

/* ── In-memory fallback (dev without Postgres) ──────────────────────── */

const memLocks = lockRuntime.memory;

async function withMemoryLock<T>(key: string, fn: (tx: null) => Promise<T>): Promise<T> {
  const parent = lockStore.getStore();
  // Re-entrancy parity with Postgres: a session that already holds an advisory
  // lock re-acquires it for free, so the same key nested inside itself must NOT
  // self-deadlock here either. Without this the in-memory store would deadlock
  // on a path Postgres runs happily — the exact class of dev/prod divergence
  // that hid four money bugs (see docs/LOAD_DAY1_FINDINGS.md).
  if (parent?.held.has(key)) return fn(null);
  if (parent) {
    parent.held.add(key);
    try { return await withMemoryLockInner(key, fn); }
    finally { parent.held.delete(key); }
  }
  return lockStore.run({ tx: null, held: new Set([key]), committed: [] }, () => withMemoryLockInner(key, fn));
}

async function withMemoryLockInner<T>(key: string, fn: (tx: null) => Promise<T>): Promise<T> {
  const prev = memLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const tail = prev.then(() => next);
  memLocks.set(key, tail);
  await prev;
  try {
    return await fn(null);
  } finally {
    release();
    if (memLocks.get(key) === tail) memLocks.delete(key);
  }
}

/* ── Postgres advisory lock (production) ────────────────────────────── */

async function withAdvisoryLock<T>(key: string, fn: (tx: Prisma.TransactionClient) => Promise<T>, timeoutMs = 30000): Promise<T> {
  const db = prisma()!;
  const lockId = hashKey64(key);

  // ── Nested lock: JOIN the parent's transaction, do NOT open a second one ──
  // A bet nests wallet:<user> → market:<id>. Opening a fresh $transaction here
  // took a SECOND pool connection while the first was still pinned, which is
  // what capped concurrency at pool÷3 and made bets fail under load.
  // pg_advisory_xact_lock is transaction-scoped, so taking it on the parent tx
  // gives the same mutual exclusion — it is simply held until the OUTER lock
  // ends rather than the inner one. That is safe here because lock order is
  // globally wallet→market (never the reverse), so a longer hold cannot create
  // a cycle; it only extends the market lock across the outer callback's tail.
  const parent = lockStore.getStore();
  if (parent?.tx) {
    // Already held on this transaction — Postgres would re-acquire it for free,
    // so skip the round-trip entirely.
    if (parent.held.has(key)) return fn(parent.tx);
    await parent.tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId}::bigint)`;
    parent.held.add(key);
    // No release here: an xact lock lives until the transaction ends. The key
    // stays in `held` so a later re-entry is still a no-op.
    return fn(parent.tx);
  }

  // $transaction pins to one connection. pg_advisory_xact_lock blocks until
  // the lock is free, then holds it until the transaction ends (commit/rollback).
  // `committed` gathers what `afterCommit` queues inside, nested locks included (they
  // join this transaction); it runs only once the `$transaction` below has resolved,
  // i.e. COMMITTED — a throw rolls back and skips it.
  const committed: Array<() => void> = [];
  const out = await db.$transaction(async (tx) => {
    // Two Postgres gotchas, both of which only surface against real PG
    // (dev uses the in-memory mutex, so neither is caught by local tests):
    //  1. Use the single-arg pg_advisory_xact_lock(bigint) with our 64-bit key
    //     (audit M1). Prisma binds a JS BigInt as int8, and the ::bigint cast
    //     resolves the overload; a missing cast → SQLSTATE 42883.
    //  2. Use $executeRaw, NOT $queryRaw — pg_advisory_xact_lock returns
    //     `void`, which $queryRaw cannot deserialize ("Failed to deserialize
    //     column of type 'void'"). $executeRaw runs the statement and returns
    //     an affected-row count without reading result columns.
    // Together these took down login/register/betting/deposit/withdraw.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId}::bigint)`;
    // Publish the tx so nested withLock() calls and withMoneyTx() join THIS
    // transaction instead of each opening their own.
    return await lockStore.run({ tx, held: new Set([key]), committed }, () => fn(tx));
  }, {
    timeout: timeoutMs,  // emergency market-wide restitution can need a measured larger budget
    maxWait: 10000,  // 10s — queue time waiting for a pool connection
  });
  runCommitted(committed);
  return out;
}

/* ── The bounded drain (04 A9 step 2) ───────────────────────────────── */

/** "3s" / "250ms" → milliseconds. One home for the bound: the constant the caller passes. */
function timeoutMs(timeout: string): number {
  const m = /^(\d+)(ms|s)$/.exec(timeout.trim());
  if (!m) throw new Error(`drainLock: bad timeout ${timeout}`);
  return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
}

/**
 * Wait, bounded, for a key to come free, then let it go again — the kill switch's drain (04 A9 step 2).
 *
 * The OFF write lands BEFORE this, with no lock, and is already binding; the drain only answers whether a bet that
 * was already inside the lock has finished, so the operator is told the truth. "busy" is an answer, never a failure.
 *
 * ⛔ It must not run inside a lock: a drain that joined its caller's transaction would take a lock the caller
 * already holds and answer "drained" about itself.
 */
export async function drainLock(key: string, o: { timeout: string }): Promise<"drained" | "busy"> {
  if (inLock() || currentLockTx() !== null) throw new Error(`drainLock(${key}) must not run inside a lock`);
  const ms = timeoutMs(o.timeout);
  if (!hasDatabase()) {
    // The memory twin: the chain's tail resolves when the holder lets go.
    const prev = memLocks.get(key);
    if (!prev) return "drained";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<"busy">((resolve) => { timer = setTimeout(() => resolve("busy"), ms); });
    try {
      return await Promise.race([prev.then(() => "drained" as const).catch(() => "drained" as const), expired]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  const db = prisma()!;
  const lockId = hashKey64(key);
  try {
    await db.$transaction(async (tx) => {
      // SET LOCAL lives for this transaction only, and the lock is released the moment it ends.
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${o.timeout}'`);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId}::bigint)`;
    }, { timeout: ms + 15_000, maxWait: 10_000 });
    return "drained";
  } catch (e) {
    // 55P03 lock_not_available: somebody is still inside. Anything else is a real failure.
    const err = e as { code?: unknown; meta?: { code?: unknown }; message?: unknown };
    const busy = err?.code === "55P03" || err?.meta?.code === "55P03" || (typeof err?.message === "string" && err.message.includes("55P03"));
    if (busy) return "busy";
    throw e;
  }
}

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Run `fn` holding the named lock.
 *
 * `fn` now RECEIVES the lock's transaction (null on the in-memory store). The
 * parameter is optional to the caller: TypeScript accepts a zero-argument
 * function wherever one taking a parameter is expected, so all existing call
 * sites keep compiling untouched — only the money paths that want to enrol
 * their reads in the lock's transaction need to name it.
 *
 * Everything inside ONE withLock now shares ONE transaction, so a throw rolls
 * back every write made under the lock. Callers that relied on an inner
 * withMoneyTx rolling back INDEPENDENTLY of the surrounding lock must let the
 * error escape the lock rather than swallowing it inside (see buyPosition's
 * BetAbort, which is caught outside withLock for exactly this reason).
 */
export async function withLock<T>(key: string, fn: (tx: Prisma.TransactionClient | null) => Promise<T>, options?: { timeoutMs?: number }): Promise<T> {
  if (hasDatabase()) {
    const timeoutMs = options?.timeoutMs ?? 30000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 30000 || timeoutMs > 600000) {
      throw new Error("withLock timeout must be an integer from 30s through 10min");
    }
    return withAdvisoryLock(key, fn, timeoutMs);
  }
  return withMemoryLock(key, fn);
}
