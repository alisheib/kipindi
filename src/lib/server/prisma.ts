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

/**
 * The canonical Prisma connection-pool size — the SINGLE SOURCE OF TRUTH.
 *
 * `admission.ts` sizes the bet gate off the SAME number, so this must not live in
 * two places (it did, as two `?? 20` literals that could silently drift). Both read
 * `PRISMA_CONNECTION_LIMIT` and fall back to this. Override the env in Railway to
 * retune without a deploy.
 */
export const DEFAULT_PRISMA_CONNECTION_LIMIT = 40;

/** The resolved connection limit: env override → the canonical default. */
export function connectionLimit(): number {
  const n = Number(process.env.PRISMA_CONNECTION_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PRISMA_CONNECTION_LIMIT;
}

/**
 * Explicit connection-pool sizing.
 *
 * Prisma's default pool is `cpu_count * 2 + 1` — tiny on a Railway container. A bet
 * holds ONE pooled connection for its whole `$transaction` (the audit-C3 single-tx
 * path: the nested wallet→market advisory locks and withMoneyTx all JOIN that one
 * transaction — see locks.ts), so the safe concurrent-bet ceiling is roughly the
 * pool minus a few slots kept for non-bet traffic. That is exactly how admission.ts
 * sizes the gate (`maxInFlight = pool − 4`, hard-capped at `pool − 2`).
 *
 * SIZING (measured on prod, 2026-07-24): Postgres `max_connections = 100`,
 * `superuser_reserved = 3` → 97 usable; steady-state ~15 connections in use; ONE app
 * instance. At the old limit of 20, ~16 concurrent bets saturated the pool while 80+
 * connections sat idle — a self-imposed ceiling. 40 roughly doubles the safe
 * concurrency and still fits comfortably: even the brief old+new overlap of a rolling
 * deploy is 2 × 40 = 80 < 97. If you ever run >2 permanent instances, drop
 * `PRISMA_CONNECTION_LIMIT` so N × limit stays under ~90.
 *
 * ⚠️ CAPACITY, not money-safety — the load harness measures **0 TZS leaked at every
 * pool size**, because a bet under pool pressure is rejected cleanly (admission
 * queues it; a true exhaustion rejects rather than half-writing). Raising this buys
 * throughput and a better error rate; it is not load-bearing for correctness.
 *
 * `pool_timeout = 10` (Prisma's own default): the ceiling on how long a query waits
 * for a free slot before erroring. Lowered from 20 so a DB-unreachable blip surfaces
 * and recovers in ~10s instead of hanging every request for 20s (observed 2026-07-24:
 * a Railway internal-network blip made all pooled connections hang, cascading into
 * P2024s — the pool was fine, the DB was briefly gone). The gate keeps bets queued
 * rather than racing for this slot, so a shorter wait costs no legitimate throughput.
 */
function pooledDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const limit = connectionLimit();
  try {
    const u = new URL(raw);
    // Never override an explicit operator setting already on the URL.
    if (!u.searchParams.has("connection_limit") && Number.isFinite(limit) && limit > 0) {
      u.searchParams.set("connection_limit", String(limit));
    }
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "10");
    return u.toString();
  } catch {
    // A URL we can't parse is left EXACTLY as-is: connecting with the operator's
    // original string is always better than failing to connect at all.
    return raw;
  }
}

export function prisma(): PrismaClient | null {
  if (!hasDatabase()) return null;
  if (globalThis.__50PICK_PRISMA) return globalThis.__50PICK_PRISMA;
  const url = pooledDatabaseUrl();
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    ...(url ? { datasources: { db: { url } } } : {}),
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
 * actually reachable, then attempts a SystemConfig table probe to
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
      await client.systemConfig.findFirst({ select: { key: true } });
      tableExists = true;
    } catch (tableErr) {
      // Connection is up but the table is missing — the most common
      // production state when DATABASE_URL is set but migrate deploy
      // hasn't run yet. Surface this cleanly.
      return {
        envSet, reachable: true, tableExists: false, latencyMs,
        error: `Schema tables not found — run \`prisma migrate deploy\`. (${String((tableErr as Error)?.message ?? tableErr).slice(0, 200)})`,
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
