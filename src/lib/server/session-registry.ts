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
 */
import { hasDatabase, prisma } from "./prisma";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_ACTIVE_SESSIONS: Map<string, string> | undefined;
}
const cache: Map<string, string> =
  globalThis.__50PICK_ACTIVE_SESSIONS ?? (globalThis.__50PICK_ACTIVE_SESSIONS = new Map());

async function dbGet(userId: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  const client = prisma();
  if (!client) return null;
  try {
    const row = await client.activeSession.findUnique({ where: { userId } });
    return row?.sessionId ?? null;
  } catch (err) {
    console.error(`[session-registry] get failed for ${userId.slice(0, 14)}…:`, (err as Error)?.message ?? err);
    return null;
  }
}

async function dbSet(userId: string, sessionId: string): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) return;
  try {
    await client.activeSession.upsert({
      where: { userId },
      create: { userId, sessionId },
      update: { sessionId },
    });
  } catch (err) {
    console.error(`[session-registry] set failed for ${userId.slice(0, 14)}…:`, (err as Error)?.message ?? err);
  }
}

async function dbDelete(userId: string): Promise<void> {
  if (!hasDatabase()) return;
  const client = prisma();
  if (!client) return;
  try {
    await client.activeSession.delete({ where: { userId } });
  } catch {
    // Row may not exist — fine; a missing row already means "no active session".
  }
}

/** The user's current active sessionId, or null if none. Cache-then-DB read. */
export async function getActiveSessionId(userId: string): Promise<string | null> {
  if (cache.has(userId)) return cache.get(userId)!;
  const fromDb = await dbGet(userId);
  if (fromDb) cache.set(userId, fromDb);
  return fromDb;
}

/**
 * Make `sessionId` the user's sole active session (called on login). Returns the
 * sessionId it replaced (for the audit trail), or null if there was none.
 */
export async function setActiveSessionId(userId: string, sessionId: string): Promise<string | null> {
  const previous = cache.get(userId) ?? (await dbGet(userId));
  cache.set(userId, sessionId);
  await dbSet(userId, sessionId);
  return previous ?? null;
}

/** Clear the active session ONLY if it's still `expectedSessionId` (logout). */
export async function clearActiveSession(userId: string, expectedSessionId: string): Promise<void> {
  const current = cache.get(userId) ?? (await dbGet(userId));
  if (current === expectedSessionId) {
    cache.delete(userId);
    await dbDelete(userId);
  }
}

/**
 * Force-revoke the user's session regardless of which device holds it — used by
 * self-exclusion / suspend / close so the block takes effect immediately rather
 * than waiting for idle/absolute timeout.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  cache.delete(userId);
  await dbDelete(userId);
}
