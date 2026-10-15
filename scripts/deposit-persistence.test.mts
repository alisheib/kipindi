/** S9 WP2: real two-store metadata/history proof, plus executed source controls. No provider or money action. */
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import pgLib from "pg";
import { MOBILE_MONEY_METHODS, isMobileMoneyMethodId } from "../src/lib/payment-providers.ts";
import { parseSavedDepositBet, sameDepositFunding } from "../src/lib/journey/deposit-state.ts";
import { injectDefect, resolveAnchor } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/deposit-persistence.anchors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const MIGRATION = "prisma/migrations/20261013160000_deposit_return_intent/migration.sql";
const paths = ["src/lib/server/store.ts", "src/lib/server/prisma-dal.ts", "src/lib/server/market-dal.ts", MIGRATION];
const sources = Object.fromEntries(paths.map(p => [p, readFileSync(join(ROOT, p), "utf8")]));
const A = { v: 1, bet: "mkt_saved01.YES.5000", returnPath: "/live" }, B = { v: 1, bet: "mkt_saved01.NO.6000", returnPath: "/watchlist" };
type Check = { name: string; pass: boolean };
const PG = process.argv.includes("--pg");
if (process.env.NODE_ENV === "production" || (!!process.env.DATABASE_URL !== PG)) throw new Error("Use memory without DATABASE_URL or explicit --pg on this checkout's scratch cluster");
if (PG) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) || url.port !== String(process.env.KP_SCRATCH_PORT ?? 5433)) throw new Error("Refusing an unrelated PostgreSQL target");
}
const { db } = await import("../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");
if (PG) {
  const rows = await prisma()!.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory");
  const normal = (p: string) => realpathSync(p).replace(/\\/g, "/").toLowerCase();
  if (normal(rows[0]?.data_directory ?? "") !== normal(join(ROOT, ".pgscratch"))) throw new Error("Refusing another checkout's data directory");
}
const json = (v: unknown) => JSON.stringify(v), eq = (a: unknown, b: unknown) => json(a) === json(b);
const now = () => new Date().toISOString();
let sequence = 0;
async function account() {
  const n = String(++sequence).padStart(7, "0"), id = `s9_persist_${n}`;
  await db.user.create({ id, phoneE164: `+25573${n}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Synthetic persistence fixture", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
  return id;
}
async function transaction(userId: string, patch: Record<string, unknown> = {}) {
  const id = `txn_s9_persist_${String(++sequence).padStart(7, "0")}`;
  return db.txn.create({ id, walletId: `wal_${userId}`, userId, type: "DEPOSIT", status: "CONFIRMED", amount: 5000, fee: 0, taxWithheld: 0,
    balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: "+255712345678", description: "Synthetic persistence fixture",
    positionId: null, amlReason: null, createdAt: "2026-10-13T12:00:00.000Z", updatedAt: now(), completedAt: null, origin: "low_balance", ...patch } as never);
}
async function realChecks(): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: boolean) => checks.push({ name, pass });
  const me = await account(), other = await account(), row = await transaction(me, { pendingBet: A });
  ok("real.intent-create-read", eq(parseSavedDepositBet((await db.txn.findById(row.id))?.pendingBet), A));
  await db.txn.update(row.id, { pendingBet: B, origin: "changed", houseBotId: "changed", description: "Ordinary update" });
  const preserved = await db.txn.findById(row.id);
  ok("real.intent-update-retained", eq(preserved?.pendingBet, A) && preserved?.origin === "low_balance" && preserved.houseBotId == null && preserved.description === "Ordinary update");
  const legacy = await transaction(me), malformed = await transaction(me, { pendingBet: { ...A, phone: "forbidden" } });
  ok("real.legacy-null", legacy.pendingBet == null && (await db.txn.findById(legacy.id))?.pendingBet == null);
  const invalid = await db.txn.findById(malformed.id);
  ok("real.malformed-not-chosen", invalid?.pendingBet != null && parseSavedDepositBet(invalid.pendingBet) === null && !sameDepositFunding({ ...invalid, pendingBet: null }, invalid));
  const marketId = "mkt_s9persist01";
  await marketStore.set({ id: marketId, titleEn: "Synthetic persistence question", titleSw: "Swali", titleZh: null, category: "weather", sourceUrl: "https://example.test",
    resolutionCriterion: "Synthetic", resolutionCriterionSw: null, resolutionCriterionZh: null, status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0,
    feeSnapshot: null, resolvedOutcome: null, productLine: "MARKET", proposedBy: me, resolutionAt: "2026-11-01T12:00:00.000Z", selectionClosedAt: null, createdAt: now(), updatedAt: now() } as never);
  const position = { id: "pos_s9persist01", userId: me, marketId, side: "YES" as const, stake: 5000, potentialPayout: 5000, status: "OPEN" as const,
    finalPayout: null, placedAt: now(), settledAt: null, houseBotId: null, origin: "deposit_return" };
  await positionStore.set(position);
  ok("real.origin-create-read", (await positionStore.get(position.id))?.origin === "deposit_return");
  for (const status of ["CASHED_OUT", "VOID", "WIN"] as const) {
    await positionStore.set({ ...position, status, origin: status === "VOID" ? undefined : "changed", settledAt: now() });
    ok(`real.origin-${status.toLowerCase()}-retained`, (await positionStore.get(position.id))?.origin === "deposit_return");
  }
  const direct = { ...position, id: "pos_s9persist02", origin: undefined };
  await positionStore.set(direct); await positionStore.set({ ...direct, origin: "deposit_return" });
  ok("real.no-backfill-origin", (await positionStore.get(direct.id))?.origin == null);

  for (const [i, rail] of MOBILE_MONEY_METHODS.entries()) await transaction(me, { provider: rail.id, createdAt: new Date(Date.UTC(2026, 9, 13, 13, i)).toISOString() });
  const tieA = await transaction(me, { provider: "HALO_PESA", createdAt: "2026-10-13T14:00:00.000Z" });
  const tieB = await transaction(me, { provider: "MIXX", createdAt: "2026-10-13T17:00:00.000+03:00" });
  ok("real.latest-time-id", (await db.txn.latestConfirmedMobileDeposit(me))?.id === tieB.id && tieB.id > tieA.id);
  const excluded = [{ userId: other, walletId: `wal_${other}` }, { type: "WITHDRAWAL" }, { status: "PROCESSING" }, { status: "FAILED" },
    { provider: "CARD" }, { provider: "INTERNAL" }, { provider: "TIGO_PESA" }, { provider: "TTCL_PESA" }, { houseBotId: "house" }, { currency: "USD" }];
  for (const [i, patch] of excluded.entries()) {
    await transaction(me, { ...patch, createdAt: new Date(Date.UTC(2026, 9, 13, 15, i)).toISOString() });
    ok(`real.latest-excludes-${i}`, (await db.txn.latestConfirmedMobileDeposit(me))?.id === tieB.id);
  }
  ok("real.latest-empty", await db.txn.latestConfirmedMobileDeposit("s9_persist_missing") === null);
  if (PG) {
    // Actual rerunnable migration against two TEMP legacy tables, on a connection already proved local/owned.
    const client = new pgLib.Client({ connectionString: process.env.DATABASE_URL }); await client.connect();
    try {
      await client.query('CREATE TEMP TABLE "Transaction" (id text PRIMARY KEY, legacy text); CREATE TEMP TABLE "Position" (id text PRIMARY KEY, legacy text)');
      await client.query('INSERT INTO "Transaction" VALUES (\'legacy\', \'kept\'); INSERT INTO "Position" VALUES (\'legacy\', \'kept\')');
      await client.query(sources[MIGRATION]); await client.query(sources[MIGRATION]);
      const oldTxn = (await client.query('SELECT legacy, "pendingBet" FROM "Transaction"')).rows[0];
      const oldPosition = (await client.query('SELECT legacy, origin FROM "Position"')).rows[0];
      ok("real.migration-twice-old-rows", oldTxn.legacy === "kept" && oldTxn.pendingBet === null && oldPosition.legacy === "kept" && oldPosition.origin === null);
    } finally { await client.end(); }
    // The real unmodified migration must recover from a timed-out lock, not just mention a retry in its source.
    const blocker = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    const retry = new pgLib.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 15_000 });
    await blocker.connect(); await retry.connect();
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await blocker.query('BEGIN; LOCK TABLE "Transaction" IN ACCESS SHARE MODE');
      const release = new Promise<void>((done, reject) => { releaseTimer = setTimeout(() => { void blocker.query("ROLLBACK").then(() => done(), reject); }, 3_250); });
      const began = performance.now();
      await retry.query(sources[MIGRATION]); await release;
      const elapsed = performance.now() - began;
      ok("real.migration-lock-timeout-retries", elapsed >= 4_300 && elapsed < 15_000);
    } finally { if (releaseTimer) clearTimeout(releaseTimer); await blocker.query("ROLLBACK").catch(() => {}); await blocker.end(); await retry.end(); }
    // M1 (S9 root review): a REAL deadlock that the migration loses is retried, never a failed boot migration. A
    // daily-loss-limit bet reads "Transaction" (ACCESS SHARE), then writes "Position" (ROW EXCLUSIVE); the migration,
    // already holding "Position", is the first waiter, so the detector aborts it after deadlock_timeout and it retries.
    // Two fresh tables in a private schema, reached by both sessions through search_path, keep the real schema untouched.
    const bet = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    const migration = new pgLib.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 30_000 });
    await bet.connect(); await migration.connect();
    try {
      await bet.query('DROP SCHEMA IF EXISTS s9_deadlock_probe CASCADE; CREATE SCHEMA s9_deadlock_probe;'
        + ' CREATE TABLE s9_deadlock_probe."Transaction" (id text PRIMARY KEY); CREATE TABLE s9_deadlock_probe."Position" (id text PRIMARY KEY)');
      for (const c of [bet, migration]) await c.query("SET search_path TO s9_deadlock_probe");
      await bet.query("BEGIN"); await bet.query('SELECT count(*) FROM "Transaction"');
      const began = performance.now();
      const applied = migration.query(sources[MIGRATION]).then(() => "committed", (e: { code?: string }) => `error ${e.code}`);
      await new Promise(r => setTimeout(r, 400));
      const wrote = bet.query('LOCK TABLE "Position" IN ROW EXCLUSIVE MODE').then(() => bet.query("COMMIT")).then(() => "committed",
        async (e: { code?: string }) => { await bet.query("ROLLBACK").catch(() => {}); return `error ${e.code}`; });
      const [m, b] = await Promise.all([applied, wrote]);
      const elapsed = performance.now() - began;
      const added = await migration.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 's9_deadlock_probe' AND column_name IN ('origin', 'pendingBet')");
      ok("real.migration-deadlock-retried", m === "committed" && b === "committed" && added.rows.length === 2 && elapsed >= 2_000);
    } finally {
      await bet.query("ROLLBACK").catch(() => {});
      await bet.query("DROP SCHEMA IF EXISTS s9_deadlock_probe CASCADE").catch(() => {});
      await bet.end(); await migration.end();
    }
  }
  return checks;
}
function member(source: string, variable: string, namespace: string | null, name: string): string {
  const file = ts.createSourceFile("dal.ts", source, ts.ScriptTarget.Latest, true);
  let object: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(file) === variable && node.initializer && ts.isObjectLiteralExpression(node.initializer)) object = node.initializer; ts.forEachChild(node, visit); };
  visit(file);
  if (namespace) { const part = object?.properties.find(p => p.name?.getText(file) === namespace); object = part && ts.isPropertyAssignment(part) && ts.isObjectLiteralExpression(part.initializer) ? part.initializer : undefined; }
  const value = object?.properties.find(p => p.name?.getText(file) === name);
  if (!value) throw new Error(`Missing ${variable}.${namespace ?? ""}.${name}`);
  return value.getText(file);
}
function method(source: string, variable: string, namespace: string | null, name: string, dependencies: Record<string, unknown>): any {
  const js = ts.transpileModule(`const subject = { ${member(source, variable, namespace, name)} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(dependencies), `${js}\nreturn subject[${JSON.stringify(name)}];`)(...Object.values(dependencies));
}
function mapper(source: string, name: string): any {
  const file = ts.createSourceFile("dal.ts", source, ts.ScriptTarget.Latest, true);
  const fn = file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  if (!fn) throw new Error(`Missing mapper ${name}`);
  const js = ts.transpileModule(fn.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function("num", "numOrNull", "iso", `${js}\nreturn ${name};`)(Number, (n: unknown) => n == null ? null : Number(n), (d: Date | null) => d?.toISOString() ?? null);
}
async function sourceChecks(world: Record<string, string>): Promise<Check[]> {
  const checks: Check[] = [], ok = (name: string, pass: boolean) => checks.push({ name, pass });
  const mem = world[paths[0]], pri = world[paths[1]], markets = world[paths[2]], row: any = { id: "fixture", pendingBet: A, origin: "low_balance", houseBotId: null };
  const txns = new Map([[row.id, row]]);
  const memoryUpdate = method(mem, "memoryDb", "txn", "update", { store: { txns } });
  memoryUpdate(row.id, { pendingBet: B, origin: "changed", description: "changed" });
  ok("source.memory-intent-update", eq(txns.get(row.id)?.pendingBet, A) && txns.get(row.id)?.origin === "low_balance" && txns.get(row.id)?.description === "changed");
  const prismaUpdate = method(pri, "prismaDb", "txn", "update", { pc: () => ({ transaction: { update: async ({ data }: any) => ({ ...row, ...data }) } }), toStoredTxn: (r: any) => r });
  const updated = await prismaUpdate(row.id, { pendingBet: B, origin: "changed" });
  ok("source.prisma-intent-update", eq(updated.pendingBet, A) && updated.origin === "low_balance");
  const prismaCreate = method(pri, "prismaDb", "txn", "create", { pc: () => ({ transaction: { create: async ({ data }: any) => data } }), toStoredTxn: (r: any) => r, PrismaRuntime: { DbNull: null } });
  ok("source.prisma-intent-create", eq((await prismaCreate({ ...row, createdAt: now() })).pendingBet, A));
  const raw = { ...row, createdAt: new Date(), updatedAt: new Date(), completedAt: null, placedAt: new Date(), settledAt: null };
  ok("source.prisma-intent-read", eq(mapper(pri, "toStoredTxn")(raw).pendingBet, A));
  ok("source.prisma-position-read", mapper(markets, "toStoredPosition")({ ...raw, origin: "deposit_return" }).origin === "deposit_return");
  const positions = new Map([[row.id, { ...row, origin: "deposit_return" }]]);
  const memoryPosition = method(markets, "memoryPositions", null, "set", { positions });
  await memoryPosition({ ...row, origin: "changed" });
  ok("source.memory-position-origin", positions.get(row.id)?.origin === "deposit_return");
  let saved: any = { ...row, origin: "deposit_return" };
  const prismaPosition = method(markets, "prismaPositions", null, "set", { pc: () => ({ position: { upsert: async ({ create, update }: any) => { saved = saved ? { ...saved, ...update } : create; } } }) });
  await prismaPosition({ ...row, origin: "changed", placedAt: now() });
  ok("source.prisma-position-origin", saved.origin === "deposit_return");
  saved = null; await prismaPosition({ ...row, origin: "deposit_return", placedAt: now() });
  ok("source.prisma-position-create", saved.origin === "deposit_return");

  const history: any[] = [{ id: "base", userId: "me", type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", provider: "MPESA", houseBotId: null, createdAt: "2026-10-13T12:00:00Z" },
    { id: "tieA", userId: "me", type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", provider: "HALO_PESA", houseBotId: null, createdAt: "2026-10-13T13:00:00Z" },
    { id: "tieB", userId: "me", type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", provider: "MIXX", houseBotId: null, createdAt: "2026-10-13T16:00:00+03:00" }];
  for (const [i, patch] of [{ userId: "foreign" }, { type: "WITHDRAWAL" }, { status: "PROCESSING" }, { provider: "CARD" }, { houseBotId: "house" }, { currency: "USD" }].entries()) history.push({ ...history[0], id: `bad${i}`, createdAt: `2026-10-13T14:0${i}:00Z`, ...patch });
  const memoryLatest = method(mem, "memoryDb", "txn", "latestConfirmedMobileDeposit", { store: { txns: new Map(history.map(r => [r.id, r])) }, isMobileMoneyMethodId });
  ok("source.memory-history", memoryLatest("me")?.id === "tieB" && memoryLatest("missing") === null);
  const findFirst = async ({ where, orderBy }: any) => {
    const rows = history.filter(r => Object.entries(where).every(([k, v]: any) => v && typeof v === "object" ? v.in?.includes(r[k]) : r[k] === v));
    rows.sort((a, b) => { for (const order of orderBy ?? []) { const [key, direction] = Object.entries(order)[0]; const delta = key === "createdAt" ? Date.parse(a[key]) - Date.parse(b[key]) : a[key].localeCompare(b[key]); if (delta) return direction === "desc" ? -delta : delta; } return 0; });
    return rows[0] ?? null;
  };
  const prismaLatest = method(pri, "prismaDb", "txn", "latestConfirmedMobileDeposit", { pc: () => ({ transaction: { findFirst } }), MOBILE_MONEY_METHODS, toStoredTxn: (r: any) => r });
  ok("source.prisma-history", (await prismaLatest("me"))?.id === "tieB" && await prismaLatest("missing") === null);
  const sql = world[MIGRATION].replace(/\r\n/g, "\n").replace(/--[^\n]*/g, "");
  const additions = [...sql.matchAll(/ALTER TABLE "(?:Transaction|Position)"\s+ADD COLUMN IF NOT EXISTS "(?:pendingBet|origin)" (?:JSONB|TEXT);/g)].map(m => m[0].replace(/\s+/g, " "));
  ok("source.additive-migration", additions.length === 2 && additions.includes('ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;')
    && additions.includes('ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;')
    && (sql.match(/\bALTER TABLE\b/g)?.length ?? 0) === 2 && !/\b(?:DROP|UPDATE|DELETE|INSERT|TRUNCATE|CREATE|EXECUTE|DEFAULT|NOT NULL)\b/.test(sql)
    && sql.includes("PERFORM set_config('lock_timeout', '3s', true);")
    && /EXCEPTION WHEN lock_not_available(?: OR deadlock_detected)? THEN[\s\S]*attempt >= 20[\s\S]*RAISE;[\s\S]*pg_sleep\(1\.5\)/.test(sql));
  // M1 (S9 root review): the bet path writes "Position" before "Transaction"; the file takes its locks in that order, so a
  // bet holding "Position" never waits on a migration that holds "Transaction" while it waits for "Position".
  ok("source.migration-bet-lock-order", eq(additions, ['ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;', 'ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;']));
  // ...and the deadlock it can still lose (a loss-limit read holds "Transaction" first) is retried like a lock timeout.
  ok("source.migration-deadlock-retried", sql.includes("EXCEPTION WHEN lock_not_available OR deadlock_detected THEN"));
  return checks;
}
try {
  for (const m of MUTATIONS) { const anchor = resolveAnchor(sources[m.file], m.from); if (!anchor.ok) throw new Error(`${m.name}: ${anchor.reason}`); }
  const green = [...await realChecks(), ...await sourceChecks(sources)];
  for (const c of green) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}`);
  if (green.some(c => !c.pass)) throw new Error("Persistence/history proof failed");
  if (process.argv.includes("--prove-red")) {
    if (PG) throw new Error("Red plants run only in memory");
    for (const m of MUTATIONS) {
      const planted = await sourceChecks({ ...sources, [m.file]: injectDefect(sources[m.file], m.from, m.to) });
      if (!planted.some(c => c.name === m.expect && !c.pass)) throw new Error(`SURVIVED ${m.name}: ${m.expect}`);
      console.log(`PASS PLANT ${m.name}`);
    }
    console.log(`${MUTATIONS.length} in-process plants caught; no disk changes`);
  }
  console.log(`deposit-persistence ${PG ? "Postgres" : "memory"}: ${green.length}/${green.length}; no payment or money-action claim`);
} finally { if (PG) await prisma()?.$disconnect(); }
