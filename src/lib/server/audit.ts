/**
 * Append-only audit log — every state change is recorded.
 *
 * Compliance:
 *  - GBT inspection, FIU AML reporting, ISO 27001 A.12.4
 *  - Each entry is HMAC-chained to the previous entry's signature, forming a
 *    Merkle-style chain. A regulator can verify the entire log is intact by
 *    walking the chain from genesis. Any deletion or in-place edit breaks the
 *    chain at and after the tampered entry — surfacing immediately on
 *    `verifyChain()`.
 *  - Secret used for chaining is `AUDIT_CHAIN_SECRET` (or SESSION_SECRET fallback).
 *    In production, rotate independently of session secret on a published cadence.
 *
 * Storage:
 *  - With a DATABASE_URL the Postgres `AuditLog` table is AUTHORITATIVE: every
 *    append reads the true chain head from the DB and inserts durably before it
 *    resolves. The in-memory ring (10k entries) is a per-instance READ CACHE for
 *    synchronous reads (admin dashboards, DSAR export), rehydrated on boot.
 *  - With no DATABASE_URL (local dev / unit tests) the ring is the sole store
 *    and the chain simply roots at GENESIS each process.
 *
 * Ordering & integrity guarantees (audit C6):
 *  - Each append takes a DB-global advisory lock (pg_advisory_xact_lock), reads
 *    the head straight from the table, and inserts — so no two callers, even on
 *    separate Railway instances, can stamp against the same head and fork.
 *  - `@@unique([prevHash])` is the hard backstop: two rows physically cannot
 *    share a predecessor, so a fork is impossible even if a write ever skipped
 *    the lock (the loser gets a unique violation and retries against the head).
 *  - Per-process writes still funnel through a serialized queue, which throttles
 *    each instance to one open append transaction at a time.
 *  - Payload hashing is canonical (keys sorted) so the HMAC survives the jsonb
 *    round-trip and the persisted chain re-verifies exactly (see canonicalize).
 *  - NOTE: a per-instance ring can miss entries written by OTHER instances after
 *    boot, so `verifyChain()` (ring) is a fast local check only — the
 *    authoritative, cross-instance verification is `verifyChainFull()` (walks
 *    the DB). Admin's on-demand "verify chain" uses the full DB walk.
 */
import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { hasDatabase, prisma } from "./prisma";
// From ./lock-key, NOT ./locks: audit is reachable from the client module graph
// (utils.ts → platform-config → audit), and locks.ts pulls in node:async_hooks,
// which cannot be bundled into a browser chunk.
import { hashKey64 } from "./lock-key";

export type AuditCategory = "AUTH" | "KYC" | "WALLET" | "BET" | "ADMIN" | "COMPLIANCE" | "SECURITY" | "SYSTEM";

export type AuditEntry = {
  id: string;
  category: AuditCategory;
  action: string;            // verb-noun: "user.login", "kyc.approved"
  actorId: string | null;    // null for system events
  targetType: string | null; // "User" | "Bet" | ...
  targetId: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;         // ISO 8601
  prevHash: string;          // HMAC of the previous entry's row, "GENESIS" for the first
  entryHash: string;         // HMAC over (id + prevHash + serialized row)
};

const MAX_IN_MEM = 10_000;
const GENESIS = "GENESIS";

// The single DB-global lock the whole chain serializes on (audit C6). Every
// append across every Railway instance takes pg_advisory_xact_lock(this) before
// reading the head and inserting, so two instances can never stamp against the
// same head and fork the chain. hashKey64 lives in ./locks (the same 64-bit
// SHA-256 keyspace as the wallet/market locks — collision ~2^-64).
const AUDIT_CHAIN_LOCK_KEY = "audit:chain";

/**
 * The audit ring, write queue, and hydration flag live on globalThis so they
 * survive Next.js module re-imports (HMR + serverless module reloads).
 */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_RING: AuditEntry[] | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_QUEUE: Promise<unknown> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_HYDRATED: boolean | undefined;
}
const ring: AuditEntry[] = globalThis.__50PICK_AUDIT_RING ?? (globalThis.__50PICK_AUDIT_RING = []);

function chainSecret(): string {
  // In production the audit chain MUST have its own dedicated secret. Falling back
  // to SESSION_SECRET would let anyone able to mint sessions also forge audit
  // hashes (the chain would no longer be independently tamper-evident), and the
  // dev placeholder must never anchor a real chain.
  if (process.env.NODE_ENV === "production") {
    const s = process.env.AUDIT_CHAIN_SECRET;
    if (!s || s === process.env.SESSION_SECRET) {
      throw new Error("AUDIT_CHAIN_SECRET must be set in production and distinct from SESSION_SECRET");
    }
    return s;
  }
  return process.env.AUDIT_CHAIN_SECRET ?? process.env.SESSION_SECRET ?? "dev-only-audit-chain-secret";
}

/**
 * Recursively sort every object's keys so the serialization is invariant to key
 * ORDER. This is load-bearing for DB verifiability: `payload` is stored in a
 * Postgres `jsonb` column, which normalizes key order on write (shorter keys
 * first, then bytewise) — so a payload hashed in insertion order at write time
 * comes back in a DIFFERENT order after a round-trip. Without canonicalization,
 * `verifyChainFull()` (and any in-memory verify after a restart rehydrates the
 * ring from the DB) would recompute a different HMAC and falsely report the
 * chain BROKEN for every entry with a multi-key payload. Sorting both at write
 * and at verify makes the hash independent of how the store reorders keys.
 * Arrays keep their order (semantic); primitives pass through.
 */
function canonicalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src).sort()) out[k] = canonicalize(src[k]);
  return out;
}

/**
 * Normalise a payload to exactly what will be PERSISTED, before it is hashed.
 *
 * The bug this fixes: `JSON.stringify` DROPS keys whose value is `undefined`, but
 * Prisma persists them as `null`. So an entry logged with `{ warn: undefined }`
 * was hashed over an object with no `warn` key, and stored as `{"warn": null}` —
 * and could never re-verify. Confirmed on production entry
 * `aud_mrq93f08_18lx2r` (config.global.updated), and it accounts for the
 * scattered unverifiable rows across the log rather than any tampering.
 *
 * Round-tripping through JSON here makes the hashed object and the stored object
 * byte-identical by construction: undefined keys disappear on BOTH sides.
 */
function normalizePayload(p: unknown): Record<string, unknown> | undefined {
  if (p == null) return undefined;
  try {
    return JSON.parse(JSON.stringify(p)) as Record<string, unknown>;
  } catch {
    // Unserialisable payload (cycles, BigInt). Never let an audit write fail on it.
    return { unserializable: true };
  }
}

function hashEntry(entry: Omit<AuditEntry, "entryHash">): string {
  const stable = JSON.stringify({
    id:         entry.id,
    category:   entry.category,
    action:     entry.action,
    actorId:    entry.actorId,
    targetType: entry.targetType,
    targetId:   entry.targetId,
    payload:    canonicalize(entry.payload ?? null),
    ip:         entry.ip ?? null,
    userAgent:  entry.userAgent ?? null,
    createdAt:  entry.createdAt,
    prevHash:   entry.prevHash,
  });
  return createHmac("sha256", chainSecret()).update(stable).digest("hex");
}

// ---------------------------------------------------------------------------
// Persistence (Postgres `AuditLog`)
// ---------------------------------------------------------------------------

/**
 * Reconstruct the exact insertion order of a set of persisted rows by walking
 * the prevHash → entryHash links. This is order-correct regardless of
 * createdAt millisecond ties or the order rows came back from the DB.
 *
 * The "head" of the loaded window is the row whose prevHash is NOT itself one
 * of the loaded entryHashes (its predecessor is either GENESIS or older than
 * the window). We walk forward from there. If the chain has a gap or fork
 * (e.g. a prior failed write), the walk stops early; we then fall back to a
 * createdAt sort for any rows the walk didn't reach, so nothing is dropped.
 *
 * Exported for unit testing.
 */
export function reconstructChainOrder<
  T extends { entryHash: string; prevHash: string; createdAt: Date | string },
>(rows: T[]): T[] {
  if (rows.length === 0) return rows;
  const byPrev = new Map<string, T>();
  const haveHash = new Set(rows.map((r) => r.entryHash));
  for (const r of rows) byPrev.set(r.prevHash, r);

  const head = rows.find((r) => !haveHash.has(r.prevHash));
  const ordered: T[] = [];
  const seen = new Set<string>();
  let cur = head;
  while (cur && !seen.has(cur.entryHash)) {
    ordered.push(cur);
    seen.add(cur.entryHash);
    cur = byPrev.get(cur.entryHash);
  }
  if (ordered.length < rows.length) {
    // Gap/fork: append whatever the walk missed, oldest-first, so we never
    // silently drop persisted entries.
    const ts = (v: Date | string) => (typeof v === "string" ? Date.parse(v) : v.getTime());
    const leftovers = rows.filter((r) => !seen.has(r.entryHash)).sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    ordered.push(...leftovers);
  }
  return ordered;
}

/**
 * Load the most recent persisted entries into the ring (in chain order) so the
 * chain continues across restarts. Runs at most once per process; guarded so
 * concurrent first-writes don't double-load.
 */
async function hydrate(): Promise<void> {
  if (globalThis.__50PICK_AUDIT_HYDRATED) return;
  globalThis.__50PICK_AUDIT_HYDRATED = true; // claim first — idempotent even under races
  const db = prisma();
  if (!db) return; // no DB: ring is the sole store, chain roots at GENESIS
  if (ring.length > 0) return; // already has runtime entries; don't clobber
  try {
    const rows = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: MAX_IN_MEM,
      select: {
        id: true, category: true, action: true, actorId: true, targetType: true,
        targetId: true, payload: true, ip: true, userAgent: true, createdAt: true,
        prevHash: true, entryHash: true,
      },
    });
    const ordered = reconstructChainOrder(rows);
    for (const r of ordered) {
      ring.push({
        id: r.id,
        category: r.category as AuditCategory,
        action: r.action,
        actorId: r.actorId,
        targetType: r.targetType,
        targetId: r.targetId,
        payload: (r.payload as Record<string, unknown> | null) ?? undefined,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
        prevHash: r.prevHash,
        entryHash: r.entryHash,
      });
    }
  } catch (err) {
    // Never let a hydration failure take down the request path. The chain will
    // continue from an empty ring (rooting at GENESIS); worst case is a visible
    // chain discontinuity, not a crash or data loss in the DB.
    console.error("[audit] hydrate failed:", (err as Error)?.message ?? err);
  }
}

function mkId(): string {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Select the current chain tail's entryHash straight from the DB (audit C6) —
 * the head is DB-authoritative, never read from a per-instance ring. Runs while
 * the caller holds the chain advisory lock, so the tail it returns cannot move
 * before the caller inserts against it.
 *
 * Fast path: the greatest-`seq` row. Because `seq` (BIGSERIAL) is assigned under
 * the same advisory lock in which we insert, for every append THIS code makes
 * the max-seq row is the tail — an O(log n) index read. The guard exists only
 * for pre-C6 legacy rows, where BIGSERIAL backfilled in arbitrary heap order (so
 * max-seq may be mid-chain) or an old multi-instance write left a fork: then we
 * fall back to the authoritative anti-join for the true tail (the row nothing
 * links onto). After the first append the new row is both max-seq and a true
 * tail, so the fast path holds from then on.
 */
async function selectHead(tx: Prisma.TransactionClient): Promise<string> {
  const top = await tx.$queryRaw<Array<{ entryHash: string }>>`
    SELECT "entryHash" FROM "AuditLog" ORDER BY "seq" DESC LIMIT 1`;
  if (top.length === 0) return GENESIS;
  const candidate = top[0].entryHash;
  const succ = await tx.$queryRaw<Array<{ one: number }>>`
    SELECT 1 AS one FROM "AuditLog" WHERE "prevHash" = ${candidate} LIMIT 1`;
  if (succ.length === 0) return candidate;
  const tail = await tx.$queryRaw<Array<{ entryHash: string }>>`
    SELECT a."entryHash" FROM "AuditLog" a
    WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" b WHERE b."prevHash" = a."entryHash")
    ORDER BY a."seq" DESC LIMIT 1`;
  return tail[0]?.entryHash ?? GENESIS;
}

/**
 * DB-authoritative, fork-proof append (audit C6). One transaction:
 *   1. pg_advisory_xact_lock — serialize the chain head across ALL instances.
 *   2. selectHead — read the true tail from the DB (not a local ring).
 *   3. stamp + INSERT — durably persisted BEFORE this resolves (the awaited
 *      "persist" the audit demanded: the next append's head-select is guaranteed
 *      to see this row, and an awaiting money/compliance caller has a durable
 *      record before it proceeds).
 * The @@unique([prevHash]) index is the hard backstop: even if a code path ever
 * skipped the lock, two rows physically cannot share a prevHash — the loser gets
 * P2002 and we retry against the new head. Throws only after exhausting retries;
 * audit() turns that into a fail-open in-memory entry so the request never dies.
 */
async function appendPersisted(
  entry: Omit<AuditEntry, "id" | "createdAt" | "prevHash" | "entryHash">,
): Promise<AuditEntry> {
  const db = prisma()!;
  const lockId = hashKey64(AUDIT_CHAIN_LOCK_KEY);
  const MAX_ATTEMPTS = 5;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId}::bigint)`;
          const prevHash = await selectHead(tx);
          const partial: Omit<AuditEntry, "entryHash"> = {
            ...entry,
            id: mkId(),
            createdAt: new Date().toISOString(),
            prevHash,
          };
          const stamped: AuditEntry = { ...partial, entryHash: hashEntry(partial) };
          await tx.auditLog.create({
            data: {
              id: stamped.id,
              category: stamped.category,
              action: stamped.action,
              actorId: stamped.actorId ?? null,
              targetType: stamped.targetType ?? null,
              targetId: stamped.targetId ?? null,
              payload: (stamped.payload ?? undefined) as never,
              ip: stamped.ip ?? null,
              userAgent: stamped.userAgent ?? null,
              createdAt: new Date(stamped.createdAt),
              prevHash: stamped.prevHash,
              entryHash: stamped.entryHash,
            },
          });
          return stamped;
        },
        { timeout: 30000, maxWait: 10000 },
      );
    } catch (err) {
      lastErr = err;
      // P2002 = unique violation. On prevHash: a concurrent fork was blocked by
      // the unique index — re-read the head and retry. On entryHash: idempotent
      // (id is fresh each attempt, so this is vanishingly unlikely) — retry too.
      if ((err as { code?: string })?.code === "P2002") continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("audit append: exhausted retries");
}

/** In-memory stamp (dev / tests, no DATABASE_URL): the ring is the sole store
 *  and the chain roots at GENESIS each process. */
function appendInMemory(
  entry: Omit<AuditEntry, "id" | "createdAt" | "prevHash" | "entryHash">,
): AuditEntry {
  const prev = ring[ring.length - 1];
  const partial: Omit<AuditEntry, "entryHash"> = {
    ...entry,
    id: mkId(),
    createdAt: new Date().toISOString(),
    prevHash: prev?.entryHash ?? GENESIS,
  };
  return { ...partial, entryHash: hashEntry(partial) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record an audit entry. Resolves to the stamped entry. Callers may `await` it
 * (money/compliance events do, to guarantee the entry is durably chained before
 * they proceed) or fire-and-forget — it never rejects. All writes are serialized
 * through a per-process queue, and with a DB the head is read and advanced under
 * a DB-global advisory lock (audit C6), so no two callers — even across Railway
 * instances — can interleave and fork the chain.
 */
export function audit(
  entry: Omit<AuditEntry, "id" | "createdAt" | "prevHash" | "entryHash">,
): Promise<AuditEntry> {
  const run = (globalThis.__50PICK_AUDIT_QUEUE ?? Promise.resolve())
    .catch(() => {}) // isolate from any prior task's failure
    .then(async () => {
      await hydrate(); // warm the read-cache ring once per process (no-op without a DB)
      // Normalise BEFORE hashing or storing, so the hashed bytes and the stored
      // bytes cannot diverge. See normalizePayload — undefined keys used to be
      // dropped by the hash and persisted as null, making the entry permanently
      // unverifiable.
      entry = { ...entry, payload: normalizePayload(entry.payload) };
      let stamped: AuditEntry;
      if (hasDatabase()) {
        try {
          // DB-authoritative + durably persisted before this resolves.
          stamped = await appendPersisted(entry);
        } catch (err) {
          // Fail open: a DB outage must never break the request path. Keep a
          // best-effort in-memory entry (not durable) and log loudly — the same
          // posture as the rest of the platform (enforce at runtime, never crash).
          console.error("[audit] persist failed (entry kept in ring only):", (err as Error)?.message ?? err);
          stamped = appendInMemory(entry);
        }
      } else {
        stamped = appendInMemory(entry);
      }
      ring.push(stamped);
      if (ring.length > MAX_IN_MEM) ring.shift();
      if (process.env.NODE_ENV !== "production") {
        console.log("[audit]", stamped.category, stamped.action, stamped.actorId ?? "system", stamped.targetType ? `${stamped.targetType}#${stamped.targetId}` : "");
      }
      return stamped;
    });
  // Keep the queue resolved-only so the next write always proceeds.
  globalThis.__50PICK_AUDIT_QUEUE = run.catch(() => {});
  return run;
}

/** Resolves once all queued audit writes so far have been stamped. Test/flush aid. */
export function auditFlush(): Promise<unknown> {
  return (globalThis.__50PICK_AUDIT_QUEUE ?? Promise.resolve()).catch(() => {});
}

/** Live size of the audit ring. Exposed as a function (not a number)
 *  so callers always read through the same module instance — avoiding
 *  HMR-stale globalThis snapshots that the previous direct-read pattern
 *  in /api/health was hitting. */
export function auditRingSize(): number {
  return ring.length;
}

/** Read-only access for admin dashboards. */
export function getAuditPage(opts: { limit?: number; category?: AuditCategory; actorId?: string } = {}): AuditEntry[] {
  const limit = opts.limit ?? 100;
  let result = [...ring];
  if (opts.category) result = result.filter((e) => e.category === opts.category);
  if (opts.actorId) result = result.filter((e) => e.actorId === opts.actorId);
  return result.slice(-limit).reverse();
}

export function getAuditById(id: string): AuditEntry | undefined {
  return ring.find((e) => e.id === id);
}

/**
 * Durable page reader — reads the AUDIT TABLE, not the in-memory ring.
 *
 * `getAuditPage` above serves the ring, which is capped at MAX_IN_MEM (10,000)
 * and is per-container: it cannot see entries written by another instance, and
 * it empties on every deploy. That is fine for the admin console's recent-activity
 * view, and wrong for an export that claims to cover the log.
 *
 * The ISO 27001 export used `getAuditPage({ limit: 100_000 })` and described itself
 * as "genesis → now". It returned at most 10,000 rows from one container, while the
 * same page printed `verifyChainFull()`'s full-database total beside it — so the
 * header could read "Total entries: 10,000" next to "487,332 entries verified".
 *
 * Returns oldest-first so the chain reads in order, and includes prevHash/entryHash
 * so an external auditor can walk it from the artifact itself.
 */
export async function getAuditPageDurable(
  opts: { limit?: number; category?: AuditCategory } = {},
): Promise<{ entries: AuditEntry[]; total: number; truncated: boolean }> {
  const limit = opts.limit ?? 10_000;
  const db = prisma();
  if (!db) {
    // No database (tests, local no-DB runs) — the ring is all there is. Report
    // honestly rather than implying completeness.
    const entries = getAuditPage({ limit, category: opts.category }).reverse();
    return { entries, total: ring.length, truncated: ring.length > entries.length };
  }
  const where = opts.category ? { category: opts.category } : {};
  const total = await db.auditLog.count({ where });
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true, category: true, action: true, actorId: true, targetType: true,
      targetId: true, payload: true, ip: true, userAgent: true, createdAt: true,
      prevHash: true, entryHash: true,
    },
  });
  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    category: r.category as AuditCategory,
    action: r.action,
    actorId: r.actorId,
    targetType: r.targetType,
    targetId: r.targetId,
    payload: (r.payload ?? undefined) as Record<string, unknown> | undefined,
    ip: r.ip,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
    prevHash: r.prevHash,
    entryHash: r.entryHash,
  }));
  return { entries, total, truncated: total > entries.length };
}

/**
 * Verify the entire chain end-to-end. Returns the first tamper point, or null
 * if the chain is fully intact. Used by the admin dashboard's "verify chain"
 * action and by automated tests.
 */
export function verifyChain(): { valid: boolean; firstBreakAt?: string; index?: number } {
  // The ring is a sliding window: once total entries exceed MAX_IN_MEM the
  // oldest are evicted, so the window's first entry legitimately links to an
  // entry we can no longer see. Anchor verification to that first prevHash
  // (which equals GENESIS exactly when the whole chain still fits the window)
  // and validate internal linkage + each entryHash from there.
  let prevHash = ring.length > 0 ? ring[0].prevHash : GENESIS;
  for (let i = 0; i < ring.length; i++) {
    const e = ring[i];
    if (e.prevHash !== prevHash) {
      return { valid: false, firstBreakAt: e.id, index: i };
    }
    const recomputed = hashEntry({
      id:         e.id,
      category:   e.category,
      action:     e.action,
      actorId:    e.actorId,
      targetType: e.targetType,
      targetId:   e.targetId,
      payload:    e.payload,
      ip:         e.ip,
      userAgent:  e.userAgent,
      createdAt:  e.createdAt,
      prevHash:   e.prevHash,
    });
    if (recomputed !== e.entryHash) {
      return { valid: false, firstBreakAt: e.id, index: i };
    }
    prevHash = e.entryHash;
  }
  return { valid: true };
}

/**
 * Full-chain verification against the persisted Postgres `AuditLog` table.
 * Unlike `verifyChain()` (which validates the in-memory 10k ring only), this
 * walks the entire persisted log in batches and validates every HMAC link.
 * Used by the regulator-facing ISO integrity report (catalogue.ts).
 *
 * Returns:
 *  - `{ valid: true, total }` if the entire chain is intact
 *  - `{ valid: false, firstBreakAt, index, total }` at the first tamper point
 *  - Falls back to `verifyChain()` (in-memory) when no DB is available
 */
export async function verifyChainFull(): Promise<{ valid: boolean; firstBreakAt?: string; index?: number; total: number }> {
  const db = prisma();
  if (!db) return { ...verifyChain(), total: ring.length };
  const BATCH = 1000;
  let offset = 0;
  let prevHash = GENESIS;
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await db.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: BATCH,
      select: {
        id: true, category: true, action: true, actorId: true, targetType: true,
        targetId: true, payload: true, ip: true, userAgent: true, createdAt: true,
        prevHash: true, entryHash: true,
      },
    });
    if (rows.length === 0) break;
    const ordered = offset === 0 ? reconstructChainOrder(rows) : rows;
    for (const r of ordered) {
      if (r.prevHash !== prevHash) {
        return { valid: false, firstBreakAt: r.id, index: total, total };
      }
      const recomputed = hashEntry({
        id:         r.id,
        category:   r.category as AuditCategory,
        action:     r.action,
        actorId:    r.actorId,
        targetType: r.targetType,
        targetId:   r.targetId,
        payload:    (r.payload as Record<string, unknown> | null) ?? undefined,
        ip:         r.ip,
        userAgent:  r.userAgent,
        createdAt:  r.createdAt.toISOString(),
        prevHash:   r.prevHash,
      });
      if (recomputed !== r.entryHash) {
        return { valid: false, firstBreakAt: r.id, index: total, total };
      }
      prevHash = r.entryHash;
      total++;
    }
    offset += rows.length;
    if (rows.length < BATCH) break;
  }
  return { valid: true, total };
}

/** All entries for a specific user — used by the user's self-service activity feed. */
export function getAuditForActor(actorId: string, limit = 200): AuditEntry[] {
  return ring.filter((e) => e.actorId === actorId).slice(-limit).reverse();
}

/** All entries TARGETING an entity (e.g. admin actions taken AGAINST a player) —
 *  the counterpart to getAuditForActor. An officer reviewing a player needs to
 *  see who suspended / reset / emailed the account, which are stamped with the
 *  officer as actor and the player as target. */
export function getAuditForTarget(targetType: string, targetId: string, limit = 200): AuditEntry[] {
  return ring.filter((e) => e.targetType === targetType && e.targetId === targetId).slice(-limit).reverse();
}
