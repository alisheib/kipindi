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
 *  - The in-memory ring (10k entries) is the runtime working set and serves all
 *    synchronous reads (admin dashboards, DSAR export, chain verification).
 *  - In production it is a WRITE-THROUGH CACHE over the Postgres `AuditLog`
 *    table: every entry is also persisted (async, fire-and-forget), and on boot
 *    the ring is rehydrated from the table by walking the prevHash links — so
 *    the chain continues seamlessly across restarts/deploys instead of being
 *    lost. With no DATABASE_URL (local dev / unit tests) the ring is the sole
 *    store and the chain simply roots at GENESIS each process.
 *
 * Ordering & integrity guarantees:
 *  - All writes funnel through a serialized promise queue, so the chain head is
 *    always read and advanced atomically — concurrent callers can never
 *    interleave and fork the chain.
 *  - Hydration is the first link in that queue, so no entry is ever stamped
 *    against an un-hydrated (empty) ring at boot.
 */
import { createHmac } from "node:crypto";
import { hasDatabase, prisma } from "./prisma";

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

function hashEntry(entry: Omit<AuditEntry, "entryHash">): string {
  const stable = JSON.stringify({
    id:         entry.id,
    category:   entry.category,
    action:     entry.action,
    actorId:    entry.actorId,
    targetType: entry.targetType,
    targetId:   entry.targetId,
    payload:    entry.payload ?? null,
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

/** Persist one entry to Postgres. Fire-and-forget: never throws, retries once. */
async function persist(e: AuditEntry, attempt = 0): Promise<void> {
  const db = prisma();
  if (!db) return;
  try {
    await db.auditLog.create({
      data: {
        id: e.id,
        category: e.category,
        action: e.action,
        actorId: e.actorId ?? null,
        targetType: e.targetType ?? null,
        targetId: e.targetId ?? null,
        payload: (e.payload ?? undefined) as never,
        ip: e.ip ?? null,
        userAgent: e.userAgent ?? null,
        createdAt: new Date(e.createdAt),
        prevHash: e.prevHash,
        entryHash: e.entryHash,
      },
    });
  } catch (err) {
    // P2002 = unique violation on entryHash → already persisted; idempotent, ignore.
    if ((err as { code?: string })?.code === "P2002") return;
    if (attempt < 1) return persist(e, attempt + 1);
    console.error("[audit] persist failed (entry kept in ring only):", e.id, (err as Error)?.message ?? err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record an audit entry. Resolves to the stamped entry. Callers may `await` it
 * (e.g. to guarantee the entry is chained before continuing) or fire-and-forget
 * — it never rejects. All writes are serialized so the HMAC chain head is read
 * and advanced atomically.
 */
export function audit(
  entry: Omit<AuditEntry, "id" | "createdAt" | "prevHash" | "entryHash">,
): Promise<AuditEntry> {
  const run = (globalThis.__50PICK_AUDIT_QUEUE ?? Promise.resolve())
    .catch(() => {}) // isolate from any prior task's failure
    .then(async () => {
      await hydrate();
      const prev = ring[ring.length - 1];
      const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const partial: Omit<AuditEntry, "entryHash"> = {
        ...entry,
        id,
        createdAt: new Date().toISOString(),
        prevHash: prev?.entryHash ?? GENESIS,
      };
      const stamped: AuditEntry = { ...partial, entryHash: hashEntry(partial) };
      ring.push(stamped);
      if (ring.length > MAX_IN_MEM) ring.shift();
      if (process.env.NODE_ENV !== "production") {
        console.log("[audit]", stamped.category, stamped.action, stamped.actorId ?? "system", stamped.targetType ? `${stamped.targetType}#${stamped.targetId}` : "");
      }
      void persist(stamped); // durable mirror — fire-and-forget, never blocks the chain
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
