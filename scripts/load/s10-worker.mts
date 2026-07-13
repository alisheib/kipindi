/**
 * S10 worker — one simulated Railway CONTAINER (its own OS process, own pool).
 *
 * Reads a job from env and fires N concurrent buyPosition calls at ONE shared
 * wallet + market, then prints a JSON result line the parent collects. The point
 * is that TWO of these run at once against the SAME database: if the Postgres
 * advisory lock (`wallet:<id>`) is genuinely DB-global, the two processes
 * serialize and the wallet cannot be double-spent across instances.
 *
 * Not run directly — spawned by s10-cross-instance.mts.
 *
 * Env: LOAD_WORKER_ID, LOAD_USER, LOAD_MARKET, LOAD_BETS, LOAD_STAKE, LOAD_POOL
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL!;
const WID = process.env.LOAD_WORKER_ID ?? "?";
const USER = process.env.LOAD_USER!;
const MARKET = process.env.LOAD_MARKET!;
const BETS = Number(process.env.LOAD_BETS ?? "10");
const STAKE = Number(process.env.LOAD_STAKE ?? "1000");
const POOL = Number(process.env.LOAD_POOL ?? "10");

const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "20");
url.searchParams.set("application_name", `s10_worker_${WID}`);
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { buyPosition } = await import("../../src/lib/server/market-service.ts");
if (prisma() !== client) { console.error(`W${WID} ABORT — hook did not take`); process.exit(1); }

// Barrier: wait until the top of the next 500ms boundary so both workers fire
// as simultaneously as two processes can. (No Date.now in workflow scripts, but
// this is a plain tsx process — Date.now is fine here.)
const target = Math.ceil((Date.now() + 300) / 500) * 500;
while (Date.now() < target) { /* spin briefly to align */ }

const results = await Promise.all(
  Array.from({ length: BETS }, async (_, i) => {
    try {
      const r: any = await buyPosition(USER, { marketId: MARKET, side: i % 2 ? "YES" : "NO", stake: STAKE });
      return { ok: !!r.ok, code: r.ok ? "OK" : (r.code ?? "?") };
    } catch (e: any) {
      return { ok: false, code: e?.code ?? "THROW" };
    }
  }),
);

const ok = results.filter((r) => r.ok).length;
const codes: Record<string, number> = {};
for (const r of results) if (!r.ok) codes[r.code] = (codes[r.code] ?? 0) + 1;

// The parent parses this exact line.
console.log(`__S10_RESULT__ ${JSON.stringify({ worker: WID, ok, fail: BETS - ok, codes })}`);
await client.$disconnect();
