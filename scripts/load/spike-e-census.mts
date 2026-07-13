/**
 * SPIKE E — the per-bet query census (the POOL SHARE metric).
 *
 * SPIKE D showed one market tops out ~180 bets/s and the market LOCK is not the
 * bottleneck — the per-bet PATH COST is. This counts the DB round-trips of ONE
 * buyPosition and splits them into MONEY PATH vs FIRE-AND-FORGET background
 * writes (audit x3, ledger, notification, email). If most of the round-trips are
 * background, "you need a job queue / outbox" stops being an opinion and becomes
 * arithmetic: it is the % of pool-seconds spent on work that is not the bet.
 *
 * Usage:
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/spike-e-census.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }

{
  const probe = new PrismaClient();
  const r: any = await probe.$queryRawUnsafe(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  await probe.$disconnect();
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n"); process.exit(2);
  }
}

const url = new URL(BASE);
url.searchParams.set("connection_limit", "20");
const client = new PrismaClient({
  datasources: { db: { url: url.toString() } },
  log: [{ emit: "event", level: "query" }],
});
(globalThis as any).__50PICK_PRISMA = client;

// Capture every SQL statement, normalized, with a capture window we control.
let capturing = false;
const seen: string[] = [];
(client as any).$on("query", (e: any) => {
  if (!capturing) return;
  // Normalize: collapse whitespace, strip the parameter list, keep verb+table.
  const q = String(e.query).replace(/\s+/g, " ").trim();
  seen.push(q);
});

const { prisma } = await import("../../src/lib/server/prisma.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");
if (prisma() !== client) { console.error("ABORT — hook did not take."); process.exit(1); }

const now = () => new Date().toISOString();
const rid = Math.random().toString(36).slice(2, 8);

await db.user.create({
  id: `${rid}_u`, phoneE164: `+255700000009`, passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);
await db.wallet.create({
  id: `${rid}_w`, userId: `${rid}_u`, balance: 1_000_000, pending: 0, hold: 0,
  currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
} as never);
const mk = await createMarket({
  titleEn: "Census market", titleSw: "Soko la majaribio", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "load",
} as never);

// Warm up (first bet after boot hydrates the audit chain — see Finding "cold start").
await buyPosition(`${rid}_u`, { marketId: mk.id, side: "YES", stake: 1000 });

// Give fire-and-forget writes from the warmup a moment to drain, then census ONE bet.
await new Promise((r) => setTimeout(r, 500));
seen.length = 0;
capturing = true;
await buyPosition(`${rid}_u`, { marketId: mk.id, side: "YES", stake: 1000 });
// buyPosition returns before its fire-and-forget audit/ledger/email writes finish.
// Wait for them so the census counts the TRUE cost a bet imposes on the pool.
await new Promise((r) => setTimeout(r, 1500));
capturing = false;

/* ── Classify each statement ──────────────────────────────────────────────── */
// Prisma logs tables as "public"."Wallet". Also handle unqualified "Wallet".
// BEGIN/COMMIT/DEALLOCATE and the advisory-lock SELECT are pure control.
const classify = (q: string): { table: string; kind: "money" | "background" | "control" } => {
  if (/^(BEGIN|COMMIT|ROLLBACK|DEALLOCATE|SET )/i.test(q)) return { table: "(txn control)", kind: "control" };
  if (/pg_advisory/i.test(q)) return { table: "(advisory lock)", kind: "control" };
  // grab the model table: "public"."Foo"  OR  from "Foo"
  let m = q.match(/(?:from|into|update)\s+"public"\."(\w+)"/i);
  if (!m) m = q.match(/(?:from|into|update)\s+"(\w+)"/i);
  const table = m?.[1] ?? "(other)";
  const money = ["Wallet", "Position", "PredictionMarket", "Transaction", "BonusGrant", "ResponsibleGambling", "User", "SystemConfig"];
  const background = ["AuditLog", "LedgerEntry", "Notification", "HousePoolLedger"];
  if (background.includes(table)) return { table, kind: "background" };
  if (money.includes(table)) return { table, kind: "money" };
  return { table, kind: "control" };
};

const byTable = new Map<string, { n: number; kind: string }>();
let money = 0, background = 0, control = 0;
for (const q of seen) {
  const { table, kind } = classify(q);
  const cur = byTable.get(table) ?? { n: 0, kind };
  cur.n++; byTable.set(table, cur);
  if (kind === "money") money++; else if (kind === "background") background++; else control++;
}

console.log(`\n  SPIKE E — per-bet query census  (ONE buyPosition, incl. fire-and-forget)\n`);
console.log(`   total DB round-trips for one bet: ${seen.length}\n`);
console.log("   table                    count   class");
console.log("  ────────────────────────────────────────────");
for (const [t, v] of [...byTable].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`   ${t.padEnd(24)} ${String(v.n).padStart(4)}   ${v.kind}`);
}
const total = seen.length || 1;
console.log("\n  ── POOL SHARE ─────────────────────────────────────────────────");
console.log(`   money path (wallet/position/pool/txn) : ${money}  (${(money / total * 100).toFixed(0)}%)`);
console.log(`   background (audit/ledger/notify)       : ${background}  (${(background / total * 100).toFixed(0)}%)`);
console.log(`   control (BEGIN/COMMIT/advisory lock)   : ${control}  (${(control / total * 100).toFixed(0)}%)`);
console.log(`\n   => ${(background / total * 100).toFixed(0)}% of every bet's DB round-trips are FIRE-AND-FORGET`);
console.log(`      background writes done inline on the request. Moving them to an`);
console.log(`      outbox/job queue would cut per-bet pool time by ~${(background / total * 100).toFixed(0)}%.`);
console.log();
await client.$disconnect();
