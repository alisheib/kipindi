/**
 * S11 — cross-instance AUDIT-CHAIN fork safety (audit C6).
 *
 * Companion to s10 (which proves the wallet advisory lock is DB-global). This
 * proves the same for the append-only audit chain: two separate OS processes
 * (each its own PrismaClient + pool = a Railway container) each fire N audit()
 * writes at the SAME database, aligned to start simultaneously. 2N appends race
 * for the single chain head.
 *
 * PASS  = every prevHash is unique (no fork), exactly one GENESIS root, one
 *         chain tail, the DB chain re-verifies end-to-end (verifyChainFull), and
 *         the row count is exactly start + 2N. The advisory lock +
 *         @@unique([prevHash]) serialized two processes onto one linear chain.
 * FAIL  = any duplicate prevHash, >1 genesis/tail, a broken chain, or a wrong
 *         count => the chain forked across instances (horizontal scaling would
 *         make the compliance log un-verifiable).
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/s11-audit-cross-instance.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

const client = new PrismaClient({ datasources: { db: { url: BASE } } });
(globalThis as any).__50PICK_PRISMA = client;

{
  const r: any = await client.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n"); process.exit(2);
  }
}

const N = 100;
const startRow: any = await client.$queryRawUnsafe(`SELECT COUNT(*)::int c FROM "AuditLog"`);
const startCount = startRow[0].c;

console.log(`\n  S11 — cross-instance audit-chain fork safety`);
console.log(`  2 separate OS processes × ${N} audit writes = ${2 * N} appends racing one chain head`);
console.log(`  (starting from ${startCount} existing entries)\n`);

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, "s11-audit-worker.mts");

function runWorker(id: string): Promise<{ worker: string; ok: number; err: number }> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, LOAD_WORKER_ID: id, LOAD_N: String(N), LOAD_POOL: "10" };
    const child = spawn("npx", ["tsx", worker], { env, shell: true });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", () => { /* audit console noise */ });
    child.on("close", () => {
      const line = out.split("\n").find((l) => l.includes("__S11_RESULT__"));
      if (!line) return reject(new Error(`worker ${id} produced no result:\n${out.slice(-400)}`));
      resolve(JSON.parse(line.replace("__S11_RESULT__", "").trim()));
    });
  });
}

const [a, b] = await Promise.all([runWorker("A"), runWorker("B")]);
console.log(`   worker A: ${a.ok} ok, ${a.err} err`);
console.log(`   worker B: ${b.ok} ok, ${b.err} err`);

/* ── Verdict, straight from SQL + the real verifier ───────────────────────── */
const total: any = await client.$queryRawUnsafe(`SELECT COUNT(*)::int c FROM "AuditLog"`);
const dup: any = await client.$queryRawUnsafe(
  `SELECT COUNT(*)::int c FROM (SELECT "prevHash" FROM "AuditLog" GROUP BY "prevHash" HAVING COUNT(*) > 1) d`);
const genesis: any = await client.$queryRawUnsafe(
  `SELECT COUNT(*)::int c FROM "AuditLog" WHERE "prevHash" = 'GENESIS'`);
// tails = rows nothing links onto; a linear chain has exactly one.
const tails: any = await client.$queryRawUnsafe(
  `SELECT COUNT(*)::int c FROM "AuditLog" a WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" b WHERE b."prevHash" = a."entryHash")`);

const { verifyChainFull } = await import("../../src/lib/server/audit.ts");
const chain = await verifyChainFull();

const totalCount = total[0].c;
const dupCount = dup[0].c;
const genesisCount = genesis[0].c;
const tailCount = tails[0].c;
const expected = startCount + 2 * N;

console.log("\n  ── verdict (from the database) ─────────────────────────────────");
console.log(`     total entries        : ${totalCount}   (must be exactly ${expected})`);
console.log(`     duplicate prevHash    : ${dupCount}   (must be 0 — a dup == a fork)`);
console.log(`     GENESIS roots         : ${genesisCount}   (must be exactly 1)`);
console.log(`     chain tails           : ${tailCount}   (must be exactly 1 — linear)`);
console.log(`     verifyChainFull       : ${chain.valid ? "VALID" : "BROKEN"} (${chain.total} verified)`);

const pass =
  totalCount === expected && dupCount === 0 && genesisCount === 1 &&
  tailCount === 1 && chain.valid && chain.total === totalCount &&
  a.err === 0 && b.err === 0;

console.log("\n  ═════════════════════════════════════════════════════════════════");
if (pass) {
  console.log(`   PASS — the audit chain is DB-AUTHORITATIVE and FORK-PROOF.`);
  console.log(`   ${2 * N} appends from two processes produced one linear chain,`);
  console.log(`   no shared prevHash, and it re-verifies end-to-end. Horizontal`);
  console.log(`   scaling keeps the compliance log provable.`);
} else {
  console.log(`   FAIL — the audit chain FORKED (or did not verify) across two`);
  console.log(`   processes. The compliance chain is not multi-instance safe.`);
}
console.log("  ═════════════════════════════════════════════════════════════════\n");
await client.$disconnect();
process.exit(pass ? 0 : 1);
