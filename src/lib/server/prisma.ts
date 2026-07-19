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
 * Explicit connection-pool sizing.
 *
 * Prisma's default pool is `cpu_count * 2 + 1` — on a 2-vCPU Railway container
 * that is **5**. The load harness (`scripts/load/spike-a-proof.mts`) measures
 * the safe ceiling at almost exactly **pool ÷ 2** concurrent bets, because a bet
 * holds one connection for its wallet work and needs a second for the market:
 *
 *     pool= 5 → 2 concurrent bets   pool=20 → 9 concurrent bets
 *     pool=10 → 4 concurrent bets   pool=40 → 19 concurrent bets
 *
 * So the shipped default let just TWO players bet simultaneously before the
 * rest started failing on "Timed out fetching a new connection from the pool".
 *
 * ⚠️ This is a CAPACITY ceiling, not a money-safety one — the same harness
 * measures **0 TZS leaked at every pool size**, because the bet path is a single
 * `$transaction` (audit C3): under pool pressure a bet is rejected cleanly
 * rather than debiting a wallet with no position. Raising this buys throughput
 * and a better error rate; it is not load-bearing for correctness.
 *
 * 20 is deliberately conservative against Postgres' own `max_connections`
 * (Railway's default is 100) so a second app instance still fits.
 * Override with PRISMA_CONNECTION_LIMIT if the instance size changes.
 */
function pooledDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const limit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 20);
  try {
    const u = new URL(raw);
    // Never override an explicit operator setting already on the URL.
    if (!u.searchParams.has("connection_limit") && Number.isFinite(limit) && limit > 0) {
      u.searchParams.set("connection_limit", String(limit));
    }
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
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
