/**
 * Single-active-session registry — durable backing for the "one valid session
 * per account" invariant (regulatory: concurrent logins on one account →
 * balance confusion / shared betting / accountability gaps).
 *
 * Was a `globalThis` Map: lost on every deploy/restart and never shared across
 * instances, so after a restart a revoked session could silently re-validate
 * and logout/suspend couldn't be enforced server-side. Now write-through to the
 * `ActiveSession` Postgres table.
 *
 * Model:
 *  - The in-process Map is a read-through CACHE of the DB row, so the hot path
 *    (getSession on every request) stays a memory hit in steady state and only
 *    touches the DB on a cache miss (first request per user after a restart).
 *  - DB is AUTHORITATIVE: no row ⇒ no active session (strict). That's what makes
 *    server-side revocation real — delete the row and the next request is signed
 *    out. (A signed cookie minted before this table existed has no row and will
 *    require one fresh login. Acceptable: pre-launch rows are test data.)
 *  - No DATABASE_URL (local dev / unit tests) ⇒ the Map alone is the source of
 *    truth, exactly as before. DB calls no-op and never throw.
 *
 * 🔴 E-381 (2026-09-14) — TWO SILENT FAILURES THAT SIGNED PLAYERS OUT, BOTH FIXED HERE.
 *  ① A READ FAILURE AND "NO ROW" WERE THE SAME `null`. `dbGet` caught every Prisma error and
 *    returned null, and `session.ts` read null as "not an active session" — so one pool timeout
 *    (P2024, and `pool_timeout=10` means one costs 10 s) signed out every player not warm in this
 *    instance's Map, and told each of them they had signed in on another device.
 *    `readActiveSession` now answers THREE states, and "unavailable" is never "absent".
 *  ② THE WRITE WAS SWALLOWED AFTER THE CACHE WAS WRITTEN. A login whose row never persisted
 *    looked completely successful on this instance; the next deploy, restart or other instance
 *    found no row and revoked it. The row is now written FIRST, the cache only after it lands,
 *    and a failed write THROWS, so `createSession` never hands out a cookie the registry does
 *    not hold. `docs/SESSION-REVOKED-DEADEND.md` §6 items 2–3.
 * ⭐ No retry on the READ, on purpose: once a failed read no longer revokes, a retry could only
 *    buy latency on the one query every request makes (4 attempts × a 10 s pool timeout was the
 *    audit's costing). The WRITE is a login, rare and idempotent (an upsert of one value), so it
 *    gets one retry on a transient code before it gives up.
 */
import { hasDatabase, prisma } from "./prisma";
import { isTransient } from "./retry";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_ACTIVE_SESSIONS: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_ACTIVE_SESSIONS_AT: Map<string, number> | undefined;
}
const cache: Map<string, string> =
  globalThis.__50PICK_ACTIVE_SESSIONS ?? (globalThis.__50PICK_ACTIVE_SESSIONS = new Map());
/**
 * 🔴 E-381 §6 item 12 (2026-09-14) · WHEN each cache entry was last confirmed by the database.
 * The Map was never invalidated and never evicted: a suspension, self-exclusion or sign-out handled by ANOTHER
 * container deleted the row there, while this container kept answering "active" from memory for as long as it
 * lived — the stated purpose of `revokeUserSessions` did not hold across instances. An agreeing hit is now trusted
 * for CACHE_TTL_MS only, then re-read; and the Map is capped so it cannot grow with the lifetime user count.
 * ⚠️ Without a database the Map IS the registry (local dev, unit tests): no TTL applies there.
 */
const cacheAt: Map<string, number> =
  globalThis.__50PICK_ACTIVE_SESSIONS_AT ?? (globalThis.__50PICK_ACTIVE_SESSIONS_AT = new Map());
export const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 20_000;
function remember(userId: string, sessionId: string) {
  if (hasDatabase() && cache.size >= CACHE_MAX && !cache.has(userId)) { cache.clear(); cacheAt.clear(); }
  cache.set(userId, sessionId);
  cacheAt.set(userId, Date.now());
}
function forget(userId: string) { cache.delete(userId); cacheAt.delete(userId); }

/** What the registry says about one user. ⛔ `unavailable` means UNKNOWN — never treat it as `absent`. */
export type RegistryRead =
  | { state: "active"; sessionId: string }
  | { state: "absent" }
  | { state: "unavailable" };

/** A login's registry row could not be written. The session must not be handed out. */
export class SessionRegistryWriteError extends Error {
  constructor(cause: unknown) {
    super("The sign-in could not be recorded. Try again.");
    this.name = "SessionRegistryWriteError";
    (this as { cause?: unknown }).cause = cause;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function dbGet(userId: string): Promise<RegistryRead> {
  if (!hasDatabase()) return { state: "absent" };
  const client = prisma();
  if (!client) return { state: "absent" };
  try {
    const row = await client.activeSession.findUnique({ where: { userId } });
    return row?.sessionId ? { state: "active", sessionId: row.sessionId } : { state: "absent" };
  } catch (err) {
    console.error(`[session-registry] get failed for ${userId.slice(0, 14)}… — treated as UNKNOWN, not as signed out:`, (err as Error)?.message ?? err);
    return { state: "unavailable" };
  }
}

async function dbSet(userId: string, sessionId: string): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) return;
  const write = () => client.activeSession.upsert({
    where: { userId },
    create: { userId, sessionId },
    update: { sessionId },
  });
  try {
    await write();
  } catch (err) {
    if (isTransient(err)) {
      await sleep(120);
      try { await write(); return; } catch (err2) { err = err2; }
    }
    console.error(`[session-registry] set failed for ${userId.slice(0, 14)}…:`, (err as Error)?.message ?? err);
    throw new SessionRegistryWriteError(err);
  }
}

async function dbDelete(userId: string): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) return;
  try {
    // deleteMany: a missing row is not an error (it already means "no active session").
    await client.activeSession.deleteMany({ where: { userId } });
  } catch (err) {
    console.error(`[session-registry] delete failed for ${userId.slice(0, 14)}…:`, (err as Error)?.message ?? err);
  }
}

/**
 * The registry's answer for this user, cache first. A failed DB read is `unavailable`, never cached.
 *
 * ⚠️ `expectedSessionId` — pass the cookie's session. A cache hit that DISAGREES with it is
 * re-read from the database before it is believed: this Map is never invalidated across
 * instances, so a newer sign-in handled by another container leaves the OLD id here, and without
 * the re-read this instance would call the newest session "displaced". A disagreement is rare
 * (it is a sign-out or a second device), so the read costs nothing on the hot path.
 */
export async function readActiveSession(userId: string, expectedSessionId?: string): Promise<RegistryRead> {
  const hit = cache.get(userId);
  const fresh = !hasDatabase() || Date.now() - (cacheAt.get(userId) ?? 0) < CACHE_TTL_MS;
  if (hit && fresh && (expectedSessionId === undefined || hit === expectedSessionId || !hasDatabase())) {
    return { state: "active", sessionId: hit };
  }
  const fromDb = await dbGet(userId);
  if (fromDb.state === "active") remember(userId, fromDb.sessionId);
  else if (fromDb.state === "absent" && hasDatabase()) forget(userId);
  return fromDb;
}

/** The user's current active sessionId, or null if none OR UNKNOWN. ⛔ Never decide a sign-out on this; use `readActiveSession`. */
export async function getActiveSessionId(userId: string): Promise<string | null> {
  const r = await readActiveSession(userId);
  return r.state === "active" ? r.sessionId : null;
}

/**
 * Make `sessionId` the user's sole active session (called on login). Returns the
 * sessionId it replaced (for the audit trail), or null if there was none.
 * ⛔ THROWS `SessionRegistryWriteError` when the row cannot be written — and the cache is then
 * left untouched, so this instance does not believe in a session no other instance can see.
 */
export async function setActiveSessionId(userId: string, sessionId: string): Promise<string | null> {
  const previous = await getActiveSessionId(userId);
  await dbSet(userId, sessionId);
  remember(userId, sessionId);
  return previous ?? null;
}

/** Clear the active session ONLY if it's still `expectedSessionId` (logout). */
export async function clearActiveSession(userId: string, expectedSessionId: string): Promise<void> {
  const current = await getActiveSessionId(userId);
  if (current === expectedSessionId) {
    forget(userId);
    await dbDelete(userId);
  }
}

/**
 * Force-revoke the user's session regardless of which device holds it — used by
 * self-exclusion / suspend / close so the block takes effect immediately rather
 * than waiting for idle/absolute timeout.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  forget(userId);
  await dbDelete(userId);
}

/**
 * E-381 §6 item 12 · delete registry rows that can only belong to a dead session. A session lives at most 7 days from
 * the sign-in that wrote its row (`SESSION_TTL_MS`), and the row's `updatedAt` is that sign-in, so a row older than
 * `beforeIso` (the retention pass passes 8 days) names a session `getSession()` already refuses as expired. Returns the
 * count. No database → nothing to do.
 */
export async function pruneStaleActiveSessions(beforeIso: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const client = prisma();
  if (!client) return 0;
  const r = await client.activeSession.deleteMany({ where: { updatedAt: { lt: new Date(beforeIso) } } });
  return r.count;
}
