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
import { createHash, createHmac, randomBytes } from "node:crypto";
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
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_PENDING: number | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_BOOT: string | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_TICKET: number | undefined;
}
const ring: AuditEntry[] = globalThis.__50PICK_AUDIT_RING ?? (globalThis.__50PICK_AUDIT_RING = []);

/**
 * HOW MANY APPENDS ARE QUEUED AND NOT YET WRITTEN, right now.
 *
 * ⛔ WHY A COUNTER AND NOT `auditFlush()`. `auditFlush()` resolves when the queue tail resolves; it
 * can say "the queue is empty now", never "N rows are about to be lost". The shutdown drain
 * (`audit-drain.ts`) has to report the SIZE of what it saved and the size of what it abandoned, and a
 * process that is dying has no other channel than its own log — so the number has to exist before the
 * process ends, not be reconstructed afterwards. `rehearse:audit-loss-window` measured that the loss
 * is exactly "the queue depth at the instant of exit"; this is that depth, readable.
 *
 * ⛔ IT IS INCREMENTED SYNCHRONOUSLY INSIDE `audit()`, before the promise chain is extended. A
 * counter bumped inside the `.then` would read zero for everything still waiting its turn — i.e. for
 * precisely the rows a shutdown loses.
 */
function bumpPending(delta: number): void {
  globalThis.__50PICK_AUDIT_PENDING = Math.max(0, (globalThis.__50PICK_AUDIT_PENDING ?? 0) + delta);
}

/** Appends queued and not yet stamped. 0 means nothing would be lost by ending the process now. */
export function auditPending(): number {
  return globalThis.__50PICK_AUDIT_PENDING ?? 0;
}

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
 * Keys a hash may legitimately have been WRITTEN with, newest first.
 *
 * New entries are always signed with `chainSecret()`. Verification, though, has to
 * cope with the chain's own history: entries written before `AUDIT_CHAIN_SECRET`
 * existed were signed with the `SESSION_SECRET` fallback above. Introducing the
 * dedicated secret therefore made every earlier entry fail to recompute, and
 * `verifyChainFull` reported the whole chain BROKEN — which on a regulator-facing
 * artifact reads as "someone tampered with the audit log".
 *
 * ⛔ The alternative — recomputing historical hashes under the current key — is
 * NEVER acceptable. It makes the chain "verify" by rewriting the very artifact whose
 * purpose is to prove nothing was rewritten, and afterwards nobody can distinguish a
 * key rotation from a cover-up. Verify each era under the key it was signed with; do
 * not rewrite history to match today's key.
 *
 * Set `AUDIT_CHAIN_SECRET_PREVIOUS` when rotating. Reading with a retired key is safe
 * — it only ever proves an old row still matches what it said; it can never mint a
 * new one, because writes use `chainSecret()` alone.
 */
function verificationSecrets(): string[] {
  const keys = [chainSecret()];
  const prev = process.env.AUDIT_CHAIN_SECRET_PREVIOUS;
  if (prev && !keys.includes(prev)) keys.push(prev);
  // The pre-rotation fallback this platform actually used. Only consulted for
  // verification, never for signing.
  const legacy = process.env.SESSION_SECRET;
  if (legacy && !keys.includes(legacy)) keys.push(legacy);
  return keys;
}

/** Does `entry` recompute to `expected` under ANY key it could legitimately have
 *  been signed with? Returns the key index (0 = current) or -1 for no match. */
function matchesAnySecret(entry: Omit<AuditEntry, "entryHash">, expected: string): number {
  const keys = verificationSecrets();
  for (let i = 0; i < keys.length; i++) {
    if (hashEntryWith(entry, keys[i]) === expected) return i;
  }
  return -1;
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
  return hashEntryWith(entry, chainSecret());
}

/**
 * The exact bytes an entry is signed over. Extracted so the SIGNATURE and the `rowFingerprint`
 * below cannot drift apart — a baseline digest taken over a different serialisation than the one
 * the chain signs would attest to something the chain does not.
 */
function stableString(entry: Omit<AuditEntry, "entryHash">): string {
  return JSON.stringify({
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
}

/** The hash function, with the signing key made explicit so verification can try a
 *  retired key without any chance of that key being used to WRITE. */
function hashEntryWith(entry: Omit<AuditEntry, "entryHash">, secret: string): string {
  return createHmac("sha256", secret).update(stableString(entry)).digest("hex");
}

/**
 * A KEYLESS digest of a row exactly as it is stored — content AND stored signature.
 *
 * ⭐ WHAT IT IS FOR, and it is the whole of the baseline mechanism below. Rows that recompute under
 * no known key cannot be attested by the chain, so the only honest thing an operator can do is
 * DECLARE them: "these N rows, with this digest, predate the current signing regime; I accept them
 * as they stand". That declaration is worth nothing unless a later edit to one of those rows changes
 * the digest — so the digest must cover the row's CONTENT, not merely its identity. It folds in
 * `entryHash` too, so altering the stored signature alone is caught as well.
 *
 * ⛔ NOT AN HMAC, DELIBERATELY. A key would only prove who computed the digest, and the digest is
 * published inside the chain itself, where the chain's own HMAC already proves that. A plain
 * SHA-256 keeps it reproducible by an external auditor holding nothing but the table.
 */
function rowFingerprint(entry: Omit<AuditEntry, "entryHash">, entryHash: string): string {
  return createHash("sha256").update(stableString(entry)).update("|").update(entryHash).digest("hex");
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

// ---------------------------------------------------------------------------
// THE TICKET — the number is allocated when the append is CALLED, not when it is written
// ---------------------------------------------------------------------------
//
// 🔴 THE DEFECT THIS EXISTS FOR, and it is the one the chain cannot see. `seq` is a BIGSERIAL handed
// out by Postgres at INSERT. An append that is queued and never written consumes no `seq`, leaves no
// dangling `prevHash`, and therefore leaves the log PERFECTLY CONTIGUOUS — `verifyChainFull()`
// returned `{valid:true, verified:663, linkBroken:false}` over a chain with 40 known-lost appends
// (`rehearse:audit-loss-window`). A regulator walking the chain sees no hole because, in the chain's
// own terms, there is none.
//
// ⭐ SO THE NUMBER IS TAKEN EARLIER THAN THE WRITE. `audit()` allocates a per-process ticket
// SYNCHRONOUSLY, before the append joins the queue, and stamps it into the row's own `id`:
//
//        aud_<boot>_<ticket>            e.g.  aud_bmrq93f08a1c2e3_000000042
//
// The queue is strictly FIFO and each append is awaited inside it, so landed rows carry CONTIGUOUS
// tickets by construction. A ticket missing BELOW the highest landed ticket for a boot is therefore
// a row that was allocated and never written — a hole, named, countable, and as permanent as the
// loss itself. `audit-ticket.ts` is the detector; this is the number it reads.
//
// ⛔ WHAT IT CANNOT SEE, stated so it is not mistaken for more. A loss at the TAIL — the process died
// with the queue non-empty — leaves no ticket above it to prove the hole, and nothing durable can
// record "N were issued" except a row, which is itself in the queue. The only mark of a tail loss is
// the ABSENCE of the drain's `system.shutdown_drain` row (audit-drain.ts). ⭐ The two combine into a
// proof this platform did not have: that marker is queued behind everything else, so if it landed
// carrying ticket T and tickets 1..T are all present for that boot, then every append that process
// ever issued is in the table. Complete, not merely unbroken.
//
// ⛔ WHY IN THE `id` AND NOT IN `payload` OR A NEW COLUMN. A column is the natural home and it is not
// available: a migration needs `prisma generate`, which this lane may not run, and a nullable column
// would in any case be invisible to every artefact already exported. `payload` is rendered verbatim
// in the ISO 27001 hand-off and in DSAR exports, so a reserved internal key there would put plumbing
// in front of a regulator. The `id` is already opaque, already exported, already the primary key,
// already covered by the row's own HMAC — and nothing in `src/` or `scripts/` parses it (checked at
// `09398014`). It costs one integer increment on the calling thread and no bytes.
//
// ⚠️ OLDER ROWS ARE NOT TICKETED and never can be. Every id written before this shipped has the shape
// `aud_<time36>_<rand6>`; the detector matches only the ticketed shape and reports the population it
// actually scanned, so the un-ticketed era is EXCLUDED rather than silently counted as gap-free.
// ⛔ That exclusion is the whole of "we cannot see holes older than this change".
const TICKET_DIGITS = 9;

/** This process's audit-boot identity. Stable for the life of the process (on globalThis, so an HMR
 *  re-import or a serverless module reload cannot mint a second identity mid-life). */
export function auditBootId(): string {
  return (globalThis.__50PICK_AUDIT_BOOT ??= `b${Date.now().toString(36)}${randomBytes(3).toString("hex")}`);
}

/** How many appends this process has ISSUED. The next ticket is this + 1. ⚠️ Issued, not landed —
 *  the difference between the two is the loss this module exists to make countable. */
export function auditTicketsIssued(): number {
  return globalThis.__50PICK_AUDIT_TICKET ?? 0;
}

/**
 * Take the next ticket and build the row id from it.
 *
 * ⛔ CALLED EXACTLY ONCE PER `audit()` CALL, never once per write ATTEMPT. `appendPersisted` retries
 * on a P2002, and a fresh ticket per attempt would BURN the abandoned one — manufacturing a phantom
 * gap in a chain that lost nothing. Reusing the id across attempts is also idempotent: the losing
 * attempt's transaction rolled back, so nothing of it survives to collide with.
 */
function allocateAuditId(): string {
  let n = (globalThis.__50PICK_AUDIT_TICKET ?? 0) + 1;
  // A ticket that outgrew its padding would stop matching the detector's shape, and the rows would
  // quietly leave the ticketed population — a silent loss of the very thing this provides. Roll the
  // boot identity instead: the counter restarts, the old boot's run is closed and complete, and the
  // id stays well-formed. At this platform's ~11.5k rows/day one process would need ~238 years to
  // reach it; the branch exists so the failure mode is "a new boot id", never "un-ticketed".
  if (n > 10 ** TICKET_DIGITS - 1) {
    globalThis.__50PICK_AUDIT_BOOT = undefined;
    auditBootId();
    n = 1;
  }
  globalThis.__50PICK_AUDIT_TICKET = n;
  return `aud_${auditBootId()}_${String(n).padStart(TICKET_DIGITS, "0")}`;
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
  id: string,
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
            // ⛔ The CALLER's ticketed id, reused across every retry of this loop. See
            // allocateAuditId: minting a fresh one per attempt would burn the abandoned ticket and
            // manufacture a phantom gap in a chain that lost nothing.
            id,
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
  id: string,
): AuditEntry {
  const prev = ring[ring.length - 1];
  const partial: Omit<AuditEntry, "entryHash"> = {
    ...entry,
    // ⚠️ The SAME ticketed id the durable path would have used, and on the fail-open branch in
    // `audit()` that is load-bearing: the ticket is consumed either way, so a persist failure shows
    // up in the table as a MISSING ticket — which is exactly what it is, and was otherwise invisible.
    id,
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
  // ⛔ COUNTED HERE, SYNCHRONOUSLY, BEFORE THE CHAIN IS EXTENDED. See bumpPending: the rows a dying
  // process loses are the ones still WAITING their turn, and a counter bumped inside the `.then`
  // below would not have counted a single one of them.
  bumpPending(1);
  /* ⛔ THE TICKET IS TAKEN HERE, SYNCHRONOUSLY, BEFORE THE APPEND JOINS THE QUEUE — the whole point
   * of allocateAuditId. Taken inside the `.then` below it would be allocated at WRITE time, which is
   * what `seq` already does and is exactly why a lost append leaves no trace today. */
  const id = allocateAuditId();
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
          stamped = await appendPersisted(entry, id);
        } catch (err) {
          // Fail open: a DB outage must never break the request path. Keep a
          // best-effort in-memory entry (not durable) and log loudly — the same
          // posture as the rest of the platform (enforce at runtime, never crash).
          console.error("[audit] persist failed (entry kept in ring only):", (err as Error)?.message ?? err);
          stamped = appendInMemory(entry, id);
        }
      } else {
        stamped = appendInMemory(entry, id);
      }
      ring.push(stamped);
      if (ring.length > MAX_IN_MEM) ring.shift();
      if (process.env.NODE_ENV !== "production") {
        console.log("[audit]", stamped.category, stamped.action, stamped.actorId ?? "system", stamped.targetType ? `${stamped.targetType}#${stamped.targetId}` : "");
      }
      return stamped;
    });
  // ⛔ DECREMENTED WHETHER IT LANDED OR THREW, and registered BEFORE the queue is re-pointed below,
  // so this microtask runs ahead of the next append's body. `audit()` is documented never to reject,
  // but a counter that leaks on a rejection would make every later shutdown report a permanent
  // phantom backlog — and a drain that always says "rows were lost" is a drain nobody reads.
  run.then(() => bumpPending(-1), () => bumpPending(-1));
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
 * ⭐ EVERY AUDITED EVENT AGAINST ONE TARGET, NEWEST FIRST — the decision history a
 * case-file surface shows.
 *
 * 🔴 WHY IT IS DURABLE AND NOT `getAuditPage`. The ring is capped at MAX_IN_MEM, is
 * per-container, and EMPTIES ON EVERY DEPLOY. A "who did what, when" panel served from it
 * would show a full history on a warm instance and an empty one an hour later, which is worse
 * than showing nothing: an officer reading a blank history concludes nothing happened. This
 * file already records that exact class of defect against the ISO 27001 export.
 *
 * ⚠️ `truncated` IS RETURNED AND CALLERS MUST RENDER IT. `limit` is a real bound, and a
 * history that quietly stops at N reads as a complete one — the silent-truncation failure
 * `counts.ts` and the Decided table were both bitten by.
 *
 * ⚠️ AND THE NAME IS THE FILE'S OWN CONVENTION, not a second version of one thing. This
 * module already pairs `getAuditPage` (the ring) with `getAuditPageDurable` (the table) and
 * explains at length why both are legitimate: the ring is right for a recent-activity view and
 * wrong for anything claiming completeness. `getAuditForTarget` below is the ring reader two
 * player/staff surfaces use synchronously; this is its durable twin, and ⛔ neither is a copy
 * of the other — they read different stores and answer different questions.
 */
export async function getAuditForTargetDurable(
  targetType: string,
  targetId: string,
  opts: { limit?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number; truncated: boolean }> {
  const limit = opts.limit ?? 50;
  const db = prisma();
  if (!db) {
    // No database (tests, local no-DB runs) — the ring is all there is. Report honestly
    // rather than implying completeness.
    const all = [...ring].filter((e) => e.targetType === targetType && e.targetId === targetId).reverse();
    return { entries: all.slice(0, limit), total: all.length, truncated: all.length > limit };
  }
  const where = { targetType, targetId };
  const total = await db.auditLog.count({ where });
  const rows = await db.auditLog.findMany({
    where,
    // ⛔ NEWEST FIRST here, unlike the export — an officer opens a case file to see what
    // happened LAST, not what happened at the beginning.
    orderBy: { createdAt: "desc" },
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
 * ⭐ EVERY EVENT OF THE NAMED ACTIONS, NEWEST FIRST — the durable read a REPORT is built from.
 *
 * Added 2026-09-13 for the refused-funds report (`refused-funds.ts`): *every* decision an officer
 * took about a refused player's balance, handed to an inspector as one list. A report that claims
 * completeness must never come from the ring — it is per-container and empties on every deploy (the
 * rule `getAuditPageDurable` above records against the ISO 27001 export).
 *
 * ⭐ PASS THE CATEGORY. `AuditLog` has no index on `action`, but it has `@@index([category, createdAt])`,
 * so naming the category turns a scan of the whole chain into a range scan of one category — and the
 * actions a compliance report reads are COMPLIANCE-category by design.
 *
 * ⚠️ `truncated` IS RETURNED AND CALLERS MUST RENDER IT, for the reason the two twins below give.
 */
export async function getAuditByActionsDurable(
  actions: readonly string[],
  opts: { category?: AuditCategory; limit?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number; truncated: boolean }> {
  const limit = opts.limit ?? 500;
  const wanted = new Set(actions);
  const db = prisma();
  if (!db) {
    const all = [...ring]
      .filter((e) => wanted.has(e.action) && (!opts.category || e.category === opts.category))
      .reverse();
    return { entries: all.slice(0, limit), total: all.length, truncated: all.length > limit };
  }
  const where = { action: { in: [...wanted] }, ...(opts.category ? { category: opts.category } : {}) };
  const total = await db.auditLog.count({ where });
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
 * ⭐ THE NAMED ACTIONS ON A SET OF TARGETS SINCE A TIME, NEWEST FIRST — the house oversight read (04 N1 §4.5,
 * C4-SPEC ruling 79): "was a market holding a staff-chosen stake decided, voided or reopened, and by whom?"
 *
 * One indexed read over `@@index([targetType, targetId])`. Same durable contract as the readers above: without a
 * database the ring is all there is, and `truncated` says when the limit bit.
 */
export async function getAuditForTargetsDurable(input: {
  targetType: string;
  targetIds: readonly string[];
  actions: readonly string[];
  sinceIso: string;
  limit?: number;
}): Promise<{ entries: AuditEntry[]; truncated: boolean }> {
  const limit = input.limit ?? 500;
  const ids = [...new Set(input.targetIds)];
  const actions = [...new Set(input.actions)];
  if (ids.length === 0 || actions.length === 0) return { entries: [], truncated: false };
  const since = new Date(input.sinceIso);
  const db = prisma();
  if (!db) {
    const all = [...ring]
      .filter((e) => e.targetType === input.targetType && e.targetId != null && ids.includes(e.targetId) && actions.includes(e.action) && Date.parse(e.createdAt) >= since.getTime())
      .reverse();
    return { entries: all.slice(0, limit), truncated: all.length > limit };
  }
  const rows = await db.auditLog.findMany({
    where: { targetType: input.targetType, targetId: { in: ids }, action: { in: actions }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true, category: true, action: true, actorId: true, targetType: true,
      targetId: true, payload: true, ip: true, userAgent: true, createdAt: true,
      prevHash: true, entryHash: true,
    },
  });
  const entries: AuditEntry[] = rows.slice(0, limit).map((r) => ({
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
  return { entries, truncated: rows.length > limit };
}

/**
 * ⭐ EVERY AUDITED EVENT AN ACTOR PERFORMED, NEWEST FIRST — the durable twin of
 * `getAuditForActor`, and what the player's own activity feed reads.
 *
 * 🔴 WHY IT HAD TO EXIST. `getAuditForActor` serves the ring, and its own doc line names its
 * caller: *"used by the user's self-service activity feed."* But this file had ALREADY ruled on
 * exactly that shape, twenty lines above `getAuditForTargetDurable`: *"The ring is capped at
 * MAX_IN_MEM, is per-container, and EMPTIES ON EVERY DEPLOY. A 'who did what, when' panel served
 * from it would show a full history on a warm instance and an empty one an hour later, which is
 * worse than showing nothing."* A player's activity feed IS that panel — the file argued against
 * its own caller and the player-facing door was left on the ring.
 *
 * ⛔ AND THE CAMPAIGN IS WHAT MADE IT INTOLERABLE RATHER THAN MERELY WRONG. `/profile/account`
 * now puts a CROSS-FILTERED COUNT on every category pill. Served from the ring those numbers are
 * an accident of uptime: the same player, in the same minute, reads `WALLET 40` on a warm
 * container and `WALLET 3` on one that restarted — and `MAX_IN_MEM` is 10,000 GLOBALLY, across
 * every user, so a busy hour evicts a quiet player's whole history. A count that is honest about
 * its filter and dishonest about its population is not an improvement on having no count.
 *
 * ⚠️ `total` IS A REAL `COUNT`, NOT `entries.length`, so a caller can state the cap when it bites
 * without the `CAP + 1` trick — and `truncated` is returned because a history that quietly stops
 * at N reads as a complete one. Same contract as `getAuditForTargetDurable`; ⛔ neither is a copy
 * of the other, they answer different questions against the same table.
 *
 * ⭐ ONE INDEXED READ. `@@index([actorId, createdAt])` already exists on `AuditLog`
 * (`prisma/schema.prisma:882`), so this is a covered range scan rather than the full scan of a
 * 10,000-element in-memory array that the page performed on every request.
 */
export async function getAuditForActorDurable(
  actorId: string,
  opts: {
    limit?: number;
    /**
     * Actions this read never returns, applied IN THE READ on both branches — before the limit, and `total` counts over
     * the same filter — so rows the caller must not show can neither crowd its window nor inflate its count. An exact
     * list, never a prefix: `_` is a LIKE wildcard. The caller owns the list; this module names no feature's actions.
     */
    excludeActions?: readonly string[];
  } = {},
): Promise<{ entries: AuditEntry[]; total: number; truncated: boolean }> {
  const limit = opts.limit ?? 200;
  const excluded = new Set(opts.excludeActions ?? []);
  const db = prisma();
  if (!db) {
    // No database (tests, local no-DB runs) — the ring is all there is. Report honestly rather
    // than implying completeness, exactly as the target-side twin does.
    const all = [...ring].filter((e) => e.actorId === actorId && !excluded.has(e.action)).reverse();
    return { entries: all.slice(0, limit), total: all.length, truncated: all.length > limit };
  }
  const where = excluded.size > 0 ? { actorId, NOT: { action: { in: [...excluded] } } } : { actorId };
  const total = await db.auditLog.count({ where });
  const rows = await db.auditLog.findMany({
    where,
    // ⛔ NEWEST FIRST — a player opens their own history to see what happened last. The page then
    //    re-orders it through the shared comparator, but the READ must still be newest-first or
    //    `take` would keep the oldest N rows and call them a recent-activity feed.
    orderBy: { createdAt: "desc" },
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
/**
 * Decide whether the chain's LINKS are intact, from four counts.
 *
 * Split out of `verifyChainFull` so the decision is unit-testable without a database —
 * the SQL that produces the counts is four plain aggregates, but the judgement it feeds is
 * the thing that once cried tamper on a healthy chain, and that judgement is what needs
 * pinning. Each failure names WHICH kind of damage it is; "broken" on its own tells an
 * operator nothing they can act on.
 *
 * Given `@@unique([prevHash])` (no two rows may share a predecessor, so the chain cannot
 * fork), an intact chain is exactly: one root, nothing missing, one tail.
 */
export function classifyChainLinks(counts: {
  /** Rows in the table. */
  total: number;
  /** Rows whose `prevHash` is GENESIS. Exactly one, ever. */
  genesisRows: number;
  /** Rows whose `prevHash` names an `entryHash` that is not present — proof of REMOVAL. */
  dangling: number;
  /** Entries no row points back to. Exactly one: the tail. */
  unreferenced: number;
}): { linkBroken: boolean; reason?: string } {
  // An empty table is not a broken chain — it is a chain that has not started. Saying
  // otherwise would make every fresh environment look tampered with.
  if (counts.total === 0) return { linkBroken: false };
  if (counts.genesisRows !== 1) {
    return {
      linkBroken: true,
      reason: `chain has ${counts.genesisRows} GENESIS roots, expected exactly 1`,
    };
  }
  if (counts.dangling > 0) {
    return {
      linkBroken: true,
      reason: `${counts.dangling} row(s) reference a prevHash that no longer exists — entries were REMOVED`,
    };
  }
  if (counts.unreferenced !== 1) {
    return {
      linkBroken: true,
      reason: `${counts.unreferenced} entries are referenced by nothing, expected exactly 1 (the tail) — an entry was SPLICED IN or the chain forked`,
    };
  }
  return { linkBroken: false };
}

/**
 * THE ATTESTATION BASELINE — the recorded, dated set of rows the chain admits it cannot re-verify.
 *
 * 🔴 THE DEFECT IT CLOSES (`docs/COMPLIANCE-DECISIONS.md` AR-3, 2026-09-21). Until this shipped,
 * `verifyChainFull()` set `valid:false` ONLY on a link break. An in-place edit of a single row
 * returned `{"valid":true,"verified":120,"unverifiable":1,"linkBroken":false}` — driven, with the
 * tamper planted and restored — so an officer or a regulator reading `valid` alone was told a
 * TAMPERED log was sound. The one field that did move, `unverifiable`, is not the field anyone reads
 * first, and it was indistinguishable from the platform's genuine legacy rows (see
 * verificationSecrets and normalizePayload for why those exist).
 *
 * ⛔ THE TWO THINGS THAT USED TO BE ONE NUMBER, and separating them is the whole fix:
 *   · rows that predate the current signing regime — a real, bounded, historical population that can
 *     never be made to recompute, and that it would be a LIE to report as tampering;
 *   · rows that do not recompute and are NOT in that population — which is what tampering looks
 *     like, and which must make `valid` false.
 * Nothing in a row itself distinguishes them. What distinguishes them is a DECLARATION: an operator
 * runs `npm run audit:baseline`, which counts the unverifiable rows, digests their exact stored
 * content, and appends that census to the chain itself. Rows at or below the declared frontier are
 * ATTESTED-AS-LEGACY; anything unverifiable above it is UNATTESTED and fails the check.
 *
 * ⭐ AND THE DECLARATION PROTECTS ITSELF. It is an ordinary chained row, appended AFTER the frontier
 * it names — so editing it to widen the era makes that row unverifiable ABOVE its own frontier,
 * which is exactly the condition that sets `valid:false`. There is no self-consistent forgery of it
 * without the chain secret.
 *
 * ⛔ AND IT CATCHES AN EDIT TO A ROW THAT WAS ALREADY UNVERIFIABLE, which a count alone never could:
 * the digest covers every baselined row's stored bytes AND its stored `entryHash` (rowFingerprint),
 * folded in `seq` order. Tampering below the frontier moves the digest; tampering a row that used to
 * verify moves the count as well.
 *
 * ⚠️ WITH NO BASELINE DECLARED, every unverifiable row is UNATTESTED and `valid` is false. That is
 * not a cry of wolf — it is the true statement that the log holds rows whose integrity nothing can
 * vouch for — and the remedy is one command. ⛔ A database with no unverifiable rows is unaffected
 * either way, which is why this does not turn a healthy environment red.
 */
export const UNVERIFIABLE_BASELINE_ACTION = "audit.unverifiable_baseline";

export type UnverifiableBaseline = {
  /** The audit row that declares it. */
  entryId: string;
  /** Rows with `seq` at or below this are inside the declared legacy era. */
  frontierSeq: number;
  /** How many rows at or below the frontier were unverifiable when it was declared. */
  count: number;
  /** SHA-256 fold of `rowFingerprint` over those rows, in `seq` order. */
  digest: string;
  declaredAt: string;
  declaredBy: string | null;
};

/** The fold's identity element — the digest of an EMPTY baselined set. Named, so "nothing was
 *  unverifiable" is a stated value and not an empty string that could also mean "unset". */
const EMPTY_BASELINE_DIGEST = createHash("sha256").update("50pick-audit-baseline-v1").digest("hex");

/** The newest declared baseline, or null. ⚠️ NEWEST WINS, and every older one stays in the chain
 *  forever — a re-baseline is a visible, dated act, never an erasure of the one before it. */
export async function readUnverifiableBaseline(): Promise<UnverifiableBaseline | null> {
  const db = prisma();
  if (!db) return null;
  const rows = await db.auditLog.findMany({
    where: { action: UNVERIFIABLE_BASELINE_ACTION },
    orderBy: { seq: "desc" },
    take: 1,
    select: { id: true, payload: true, createdAt: true, actorId: true },
  });
  const r = rows[0];
  if (!r) return null;
  const p = (r.payload ?? {}) as Record<string, unknown>;
  const frontierSeq = Number(p.frontierSeq);
  const count = Number(p.count);
  const digest = typeof p.digest === "string" ? p.digest : "";
  // ⛔ A MALFORMED DECLARATION IS TREATED AS NO DECLARATION. It must never be able to widen the
  // attested era by being unreadable — "I could not parse the excuse" has to fail CLOSED.
  if (!Number.isFinite(frontierSeq) || !Number.isFinite(count) || count < 0 || !digest) return null;
  return {
    entryId: r.id, frontierSeq, count, digest,
    declaredAt: r.createdAt.toISOString(),
    declaredBy: r.actorId ?? null,
  };
}

/**
 * One pass over the persisted rows: recompute every hash, and fold the ones that recompute under no
 * key into the baseline digest when they sit at or below `frontierSeq`.
 *
 * ⛔ SHARED by `censusUnverifiable()` (which DECLARES a baseline) and `verifyChainFull()` (which
 * CHECKS one), so the two can never disagree about what the digest covers. A census computed by a
 * second implementation would attest to whatever that implementation happened to do.
 *
 * Each row's hash covers its OWN stored `prevHash`, so recomputing it needs no knowledge of any
 * neighbour — which is why this may page in any order it likes. It pages by `seq`, which is
 * `@unique`, so unlike `createdAt` it is a stable key; keyset pagination (`seq > last`) rather than
 * `skip`, so the cost does not climb with offset. That `seq` order is also the digest's fold order.
 */
async function walkHashes(
  db: NonNullable<ReturnType<typeof prisma>>,
  frontierSeq: bigint,
): Promise<{
  total: number; verified: number; baselined: number; unattested: number;
  baselineDigest: string; firstUnattested: string | null;
}> {
  const BATCH = 1000;
  // `seq` is a BIGSERIAL starting at 1, so a cursor of 0 selects the whole table on the first pass.
  // Kept as a plain bigint rather than `bigint | null` so the query args do not depend on a value
  // inferred from the query's own result (TS7022).
  let lastSeq = BigInt(0);
  let total = 0, verified = 0, baselined = 0, unattested = 0;
  let firstUnattested: string | null = null;
  const fold = createHash("sha256").update("50pick-audit-baseline-v1");
  let foldedAny = false;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await db.auditLog.findMany({
      where: { seq: { gt: lastSeq } },
      orderBy: { seq: "asc" },
      take: BATCH,
      select: {
        id: true, category: true, action: true, actorId: true, targetType: true,
        targetId: true, payload: true, ip: true, userAgent: true, createdAt: true,
        prevHash: true, entryHash: true, seq: true,
      },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      lastSeq = r.seq;
      const partial = {
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
      };
      total++;
      // A HASH mismatch is NOT automatically tampering. Try every key this entry could legitimately
      // have been signed with (see verificationSecrets): the platform ran on the SESSION_SECRET
      // fallback before AUDIT_CHAIN_SECRET existed, so historical rows are signed with a retired key.
      if (hashEntry(partial) === r.entryHash || matchesAnySecret(partial, r.entryHash) >= 0) {
        verified++;
        continue;
      }
      // ⛔ THE FORK THAT IS THE WHOLE OF AR-3. Inside the declared legacy era this row is a KNOWN,
      // accounted-for, digested member of a dated census. Outside it, it is a row that will not
      // recompute and that nobody has ever accounted for — which is what an in-place edit looks
      // like, and which must never be reported as a sound log.
      if (r.seq <= frontierSeq) {
        baselined++;
        foldedAny = true;
        fold.update(rowFingerprint(partial, r.entryHash));
      } else {
        unattested++;
        if (!firstUnattested) firstUnattested = r.id;
      }
    }
    if (rows.length < BATCH) break;
  }
  return {
    total, verified, baselined, unattested,
    baselineDigest: foldedAny ? fold.digest("hex") : EMPTY_BASELINE_DIGEST,
    firstUnattested,
  };
}

/**
 * The census a baseline declaration is made of: how many rows cannot be re-verified at or below the
 * current chain head, and the digest of their exact stored content. ⚠️ Read-only — it writes nothing
 * and declares nothing; `scripts/audit-baseline.mts` is what appends the declaration.
 */
export async function censusUnverifiable(opts: { upToSeq?: bigint } = {}): Promise<{
  frontierSeq: number; count: number; digest: string; scanned: number;
}> {
  const db = prisma();
  if (!db) return { frontierSeq: 0, count: 0, digest: EMPTY_BASELINE_DIGEST, scanned: 0 };
  const top = await db.auditLog.findMany({ orderBy: { seq: "desc" }, take: 1, select: { seq: true } });
  const frontier = opts.upToSeq ?? top[0]?.seq ?? BigInt(0);
  const walk = await walkHashes(db, frontier);
  return { frontierSeq: Number(frontier), count: walk.baselined, digest: walk.baselineDigest, scanned: walk.total };
}

export async function verifyChainFull(): Promise<{
  valid: boolean; firstBreakAt?: string; index?: number; total: number;
  /** Rows that recompute under one of the keys they could have been signed with. */
  verified?: number;
  /** Rows that recompute under NO known key. ⚠️ KEPT AS THE SUM of `baselined` + `unattested`, so
   *  every reader that already looks at it keeps meaning what it meant; the two halves are new. */
  unverifiable?: number;
  /** Unverifiable rows INSIDE the declared legacy era — accounted for, digested, dated. */
  baselined?: number;
  /** ⛔ Unverifiable rows OUTSIDE it. Any of these makes `valid` false: nothing accounts for them. */
  unattested?: number;
  /** True when the baselined set no longer matches the census declared over it — a row at or below
   *  the frontier was edited. Also makes `valid` false. */
  baselineMismatch?: boolean;
  /** The declaration in force, or null when none has ever been made. */
  baseline?: UnverifiableBaseline | null;
  /** True only when the chain LINKS broke — a row inserted, removed or reordered. */
  linkBroken?: boolean;
}> {
  const db = prisma();
  if (!db) return { ...verifyChain(), total: ring.length };

  // ── THE LINK CHECK IS A GRAPH PROPERTY, NOT AN ORDERING ─────────────────────────────
  //
  // 🔴 THIS USED TO REPORT A TAMPER ALARM ON A PERFECTLY HEALTHY CHAIN (fixed 2026-08-20).
  //
  // The old walk paged `orderBy: { createdAt: "asc" }` with skip/take, held a running
  // `prevHash`, and declared `linkBroken: true` the moment a row's `prevHash` did not equal
  // the previous row's `entryHash`. Two things were wrong with that, and both fired on
  // production:
  //
  //  1. IT ASSUMED INSERTION ORDER EQUALS LINK ORDER. It does not. An append picks its
  //     predecessor, hashes, and only then INSERTs — so under concurrent writers the row
  //     that committed second can carry the earlier `prevHash`. Measured on production
  //     2026-08-20: link order differs from `seq` order for 4,978 of 114,379 rows (3,393 in
  //     June, 1,585 in July, 0 in August — the concurrency that caused it was later fixed,
  //     but the history is permanent). `reconstructChainOrder` was applied to the FIRST
  //     batch only (`offset === 0 ? … : rows`), so the walk recovered the true order for
  //     1,000 rows and then tripped over the rest.
  //  2. `createdAt` IS NOT UNIQUE, so `skip`/`take` over it is not a stable pagination —
  //     rows sharing a millisecond (the Up & Down machinery writes 6 per round in a tight
  //     loop) can be returned twice or skipped entirely between batches, independent of
  //     any link question.
  //
  // The consequence was worse than a wrong boolean. Every `db-backup` and
  // `db-verify-backup` artifact printed "SOURCE INTEGRITY WARNING — the audit chain has a
  // BROKEN LINK" about a chain that was completely intact. A control that cries wolf is a
  // control that has been switched off: a REAL tamper event would have been
  // indistinguishable from the everyday false alarm, and the warning is on a document an
  // operator may hand to a regulator.
  //
  // What "nothing was inserted, removed or reordered" actually means is a property of the
  // GRAPH, and it needs no ordering at all. With `@@unique([prevHash])` making the chain
  // physically fork-proof (no two rows may share a predecessor), the chain is one unbroken
  // list exactly when:
  //
  //   (a) exactly ONE row roots at GENESIS,
  //   (b) NO row's `prevHash` points at an `entryHash` that does not exist  — nothing removed,
  //   (c) exactly ONE `entryHash` is referenced by no row                   — one tail, so
  //       nothing was spliced in and no second list exists.
  //
  // Verified against production the day this was written: 1 genesis, 0 dangling, 1 tail,
  // 0 gaps in `seq` across 114,379 rows, and a recursive walk from GENESIS reaching all
  // 114,379. The chain was sound the whole time.
  //
  // ⛔ These three checks do not exclude a DISJOINT CYCLE (a closed ring of rows off to the
  // side would contribute no genesis, no dangling and no tail). That is deliberate and it is
  // not a gap worth paying for: every `entryHash` is an HMAC over the row INCLUDING its
  // `prevHash`, so building a cycle means finding a hash preimage loop under a secret nobody
  // outside the platform holds. Checking it would mean either walking the links in
  // application memory — a map of every hash, which is ~25 MB today and grows with a table
  // adding ~11.5k rows a day — or a recursive CTE over the whole table on every backup. The
  // three aggregates below are index-assisted and stay flat forever.
  const [linkAudit] = await db.$queryRaw<Array<{
    total: number; genesis_rows: number; dangling: number; unreferenced: number;
  }>>`
    SELECT
      (SELECT count(*)::int FROM "AuditLog")                                       AS total,
      (SELECT count(*)::int FROM "AuditLog" WHERE "prevHash" = ${GENESIS})         AS genesis_rows,
      (SELECT count(*)::int FROM "AuditLog" a
         WHERE a."prevHash" <> ${GENESIS}
           AND NOT EXISTS (SELECT 1 FROM "AuditLog" b WHERE b."entryHash" = a."prevHash"))
                                                                                  AS dangling,
      (SELECT count(*)::int FROM "AuditLog" a
         WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" b WHERE b."prevHash" = a."entryHash"))
                                                                                  AS unreferenced
  `;
  const chainTotal = Number(linkAudit?.total ?? 0);
  const linkVerdict = classifyChainLinks({
    total: chainTotal,
    genesisRows: Number(linkAudit?.genesis_rows ?? 0),
    dangling: Number(linkAudit?.dangling ?? 0),
    unreferenced: Number(linkAudit?.unreferenced ?? 0),
  });
  if (linkVerdict.linkBroken) {
    return {
      valid: false, firstBreakAt: linkVerdict.reason, index: chainTotal,
      total: chainTotal, linkBroken: true,
    };
  }

  // ── The per-row HASH recompute, and the ATTESTATION verdict ──────────────────────────
  //
  // 🔴 WHAT CHANGED HERE AND WHY (AR-3, 2026-09-21). This used to count every row that would not
  // recompute as `unverifiable` and then return `valid: true` regardless — so a single edited row
  // returned `{"valid":true,"verified":120,"unverifiable":1,"linkBroken":false}`, measured with the
  // tamper planted and restored. An officer reading `valid` alone was told a tampered log was sound.
  //
  // ⚠️ The rows that genuinely predate the signing regime are STILL not called tampering, and that
  // restraint is the whole reason the old code was written this way: reporting them as a break says
  // "someone tampered with the log", which is false and worse than saying "these cannot be
  // re-verified". What changed is that "cannot be re-verified" now has to be DECLARED — counted,
  // digested and chained (see UNVERIFIABLE_BASELINE_ACTION) — instead of being assumed.
  const baseline = await readUnverifiableBaseline();
  const frontier = baseline ? BigInt(baseline.frontierSeq) : BigInt(0);
  const walk = await walkHashes(db, frontier);
  const { total, verified, baselined, unattested } = walk;
  const unverifiable = baselined + unattested;

  // ⚠️ A baseline that no longer describes what is beneath it is itself a finding. The COUNT moves
  // when a row that used to verify stops verifying; the DIGEST moves when a row that was already
  // unverifiable is edited — which a count alone can never see.
  const baselineMismatch = !!baseline
    && (baselined !== baseline.count || walk.baselineDigest !== baseline.digest);

  const base = { total, verified, unverifiable, baselined, unattested, baseline, linkBroken: false as const };

  if (unattested > 0) {
    return {
      ...base,
      valid: false,
      baselineMismatch,
      // ⚠️ `firstBreakAt` is what every existing caller renders, so it carries a SENTENCE here
      // rather than a link-break reason: the two failures are not the same failure, and a reader
      // must not be told rows were REMOVED when rows were EDITED.
      firstBreakAt:
        `${unattested} row(s) recompute under no known signing key and are not covered by a declared `
        + `baseline — first at ${walk.firstUnattested ?? "unknown"}. `
        + (baseline
          ? `The baseline in force (${baseline.entryId}, declared ${baseline.declaredAt}) covers seq <= ${baseline.frontierSeq}.`
          : "No baseline has ever been declared — run `npm run audit:baseline` to record the legacy era, "
            + "after which anything left here is an in-place EDIT."),
      index: total,
    };
  }
  if (baselineMismatch && baseline) {
    return {
      ...base,
      valid: false,
      baselineMismatch,
      firstBreakAt:
        "the declared unverifiable baseline no longer matches the rows beneath it — declared "
        + `${baseline.count} row(s) with digest ${baseline.digest.slice(0, 16)}..., found ${baselined} `
        + `with ${walk.baselineDigest.slice(0, 16)}.... A row at or below seq ${baseline.frontierSeq} was EDITED.`,
      index: total,
    };
  }
  // The links join up, and every row either recomputes or sits inside a dated, digested, chained
  // declaration. ⚠️ `unverifiable` is still reported and still means what it meant — it is now the
  // sum of a number that is accounted for and a number that is zero.
  return { ...base, valid: true, baselineMismatch: false };
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
