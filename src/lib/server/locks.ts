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
 */
type LockCtx = { tx: Prisma.TransactionClient | null; held: Set<string> };
const lockStore = new AsyncLocalStorage<LockCtx>();

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

/* ── In-memory fallback (dev without Postgres) ──────────────────────── */

const memLocks = new Map<string, Promise<unknown>>();

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
  return lockStore.run({ tx: null, held: new Set([key]) }, () => withMemoryLockInner(key, fn));
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

async function withAdvisoryLock<T>(key: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
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
  return db.$transaction(async (tx) => {
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
    return await lockStore.run({ tx, held: new Set([key]) }, () => fn(tx));
  }, {
    timeout: 30000,  // 30s — covers worst-case resolution payouts
    maxWait: 10000,  // 10s — queue time waiting for a pool connection
  });
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
export async function withLock<T>(key: string, fn: (tx: Prisma.TransactionClient | null) => Promise<T>): Promise<T> {
  if (hasDatabase()) {
    return withAdvisoryLock(key, fn);
  }
  return withMemoryLock(key, fn);
}
