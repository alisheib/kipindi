/**
 * S11 worker — one simulated Railway CONTAINER (its own OS process + pool).
 *
 * Fires N concurrent audit() writes at the SHARED database. Two of these run at
 * once: if the audit chain is genuinely DB-authoritative (advisory lock + DB
 * head-select + @@unique([prevHash])), the two processes serialize and the chain
 * stays linear — no two rows share a prevHash, nothing forks. Pre-C6, each
 * process chained off its own in-memory ring and they would fork.
 *
 * Not run directly — spawned by s11-audit-cross-instance.mts.
 * Env: LOAD_WORKER_ID, LOAD_N, LOAD_POOL
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL!;
const WID = process.env.LOAD_WORKER_ID ?? "?";
const N = Number(process.env.LOAD_N ?? "100");
const POOL = Number(process.env.LOAD_POOL ?? "10");

const url = new URL(BASE);
url.searchParams.set("connection_limit", String(POOL));
url.searchParams.set("pool_timeout", "20");
url.searchParams.set("application_name", `s11_worker_${WID}`);
const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(globalThis as any).__50PICK_PRISMA = client;

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { audit, auditFlush } = await import("../../src/lib/server/audit.ts");
if (prisma() !== client) { console.error(`W${WID} ABORT — hook did not take`); process.exit(1); }

// Barrier: align both workers to the next 500ms boundary so they contend hardest.
const target = Math.ceil((Date.now() + 300) / 500) * 500;
while (Date.now() < target) { /* spin briefly to align */ }

let ok = 0, err = 0;
await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    try {
      // Multi-key, out-of-jsonb-order payload — also exercises canonical hashing
      // under cross-instance concurrency.
      await audit({
        category: "SYSTEM",
        action: `s11.${WID}.${i}`,
        actorId: `w${WID}`,
        targetType: "Load",
        targetId: `${WID}-${i}`,
        payload: { zebra: i, worker: WID, amount: i * 10, apple: true },
      });
      ok++;
    } catch (e: any) {
      err++;
      console.error(`W${WID} write ${i} failed:`, e?.message ?? e);
    }
  }),
);
await auditFlush();

console.log(`__S11_RESULT__ ${JSON.stringify({ worker: WID, ok, err })}`);
await client.$disconnect();
