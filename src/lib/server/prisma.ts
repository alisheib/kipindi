/**
 * Prisma client singleton.
 *
 * Lazy-loaded — DATABASE_URL is the gate. When unset (local dev without
 * Postgres) every consumer gracefully no-ops and the disk snapshot path
 * remains the source of truth. With DATABASE_URL set (Railway), the
 * snapshot is mirrored into the StoreSnapshot table so data survives
 * container restarts.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PRISMA: PrismaClient | undefined;
}

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

export function prisma(): PrismaClient | null {
  if (!hasDatabase()) return null;
  if (globalThis.__50PICK_PRISMA) return globalThis.__50PICK_PRISMA;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });
  // Cache the singleton in EVERY environment. The previous code only cached
  // in dev (to survive HMR) — in production it returned a brand-new client on
  // every call, and each client opens its OWN connection pool. Under load that
  // exhausts Postgres: "FATAL: sorry, too many clients already", which surfaces
  // to users as the "page hit a snag" error boundary (intermittently, since a
  // refresh sometimes lands when a connection has freed up). One shared client
  // = one bounded pool for the life of the container.
  globalThis.__50PICK_PRISMA = client;
  return client;
}

/**
 * Active connectivity check — runs SELECT 1 to verify the database is
 * actually reachable, then attempts a StoreSnapshot.findFirst() to
 * verify the schema migration has been applied. Returns a structured
 * verdict with latency so the operator can spot a slow/dropped link
 * without waiting for the next mutation.
 *
 * Cheap (~5–50 ms on a healthy connection); safe to call on every
 * /admin/system render. Never throws — always returns a verdict the
 * UI can render.
 */
export async function pingDatabase(): Promise<{
  envSet: boolean;
  reachable: boolean;
  tableExists: boolean;
  latencyMs: number | null;
  error: string | null;
  hostHint: string | null;
}> {
  const envSet = hasDatabase();
  if (!envSet) {
    return { envSet: false, reachable: false, tableExists: false, latencyMs: null, error: null, hostHint: null };
  }
  // Mask the URL down to host + port so the operator can confirm WHICH
  // database they're pointing at without leaking the password.
  let hostHint: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    hostHint = `${u.hostname}:${u.port || "5432"}`;
  } catch { /* malformed URL */ }

  const client = prisma();
  if (!client) {
    return { envSet, reachable: false, tableExists: false, latencyMs: null, error: "Prisma client failed to instantiate", hostHint };
  }

  const t0 = Date.now();
  try {
    // 1. raw SELECT 1 — proves the connection itself works
    await client.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - t0;
    // 2. table probe — proves the migration has been applied
    let tableExists = false;
    try {
      await client.storeSnapshot.findFirst({ select: { id: true } });
      tableExists = true;
    } catch (tableErr) {
      // Connection is up but the table is missing — the most common
      // production state when DATABASE_URL is set but migrate deploy
      // hasn't run yet. Surface this cleanly.
      return {
        envSet, reachable: true, tableExists: false, latencyMs,
        error: `StoreSnapshot table not found — run \`prisma migrate deploy\`. (${String((tableErr as Error)?.message ?? tableErr).slice(0, 200)})`,
        hostHint,
      };
    }
    return { envSet, reachable: true, tableExists, latencyMs, error: null, hostHint };
  } catch (err) {
    return {
      envSet, reachable: false, tableExists: false,
      latencyMs: Date.now() - t0,
      error: String((err as Error)?.message ?? err).slice(0, 280),
      hostHint,
    };
  }
}
