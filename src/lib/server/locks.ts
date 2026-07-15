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

import { createHash } from "node:crypto";
import { prisma, hasDatabase } from "./prisma";

/**
 * Hash a lock key to a 64-bit signed integer for pg_advisory_xact_lock(bigint)
 * (audit M1). The old 32-bit Java-hashCode collided across namespaces — over
 * 100k realistic cuid keys, `wallet:X` and `market:Y` mapped to the same lock id,
 * so a wallet op could block an unrelated market op (correctness was preserved by
 * over-serializing, but it was an undiagnosable latency bug). The full key string
 * already carries its namespace (`wallet:` / `market:`), so hashing it into the
 * full 64-bit advisory-lock space makes a cross-namespace collision ~2^-64.
 */
export function hashKey64(key: string): bigint {
  const digest = createHash("sha256").update(key).digest();
  // First 8 bytes as an unsigned 64-bit, reinterpreted as signed for PG bigint.
  return BigInt.asIntN(64, digest.readBigUInt64BE(0));
}

/* ── In-memory fallback (dev without Postgres) ──────────────────────── */

const memLocks = new Map<string, Promise<unknown>>();

async function withMemoryLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = memLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const tail = prev.then(() => next);
  memLocks.set(key, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (memLocks.get(key) === tail) memLocks.delete(key);
  }
}

/* ── Postgres advisory lock (production) ────────────────────────────── */

async function withAdvisoryLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const db = prisma()!;
  const lockId = hashKey64(key);
  // $transaction pins to one connection. pg_advisory_xact_lock blocks until
  // the lock is free, then holds it until the transaction ends (commit/rollback).
  // fn() runs its own queries on OTHER pool connections — the advisory lock is
  // a coordination semaphore, not a data-consistency wrapper.
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
    return await fn();
  }, {
    timeout: 30000,  // 30s — covers worst-case resolution payouts
    maxWait: 10000,  // 10s — queue time waiting for a pool connection
  });
}

/* ── Public API (unchanged signature) ───────────────────────────────── */

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (hasDatabase()) {
    return withAdvisoryLock(key, fn);
  }
  return withMemoryLock(key, fn);
}
