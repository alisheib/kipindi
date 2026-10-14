/** Execute independent compiled copies of the real lock module against one process registry. */
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { transform } from "esbuild";
import { hashKey64 } from "../src/lib/server/lock-key";

if (process.env.DATABASE_URL) throw new Error("This duplicate-module proof uses the memory store and an explicit transaction stand-in");
const source = readFileSync(new URL("../src/lib/server/locks.ts", import.meta.url), "utf8");
type API = {
  withLock: <T>(key: string, fn: (tx: unknown) => Promise<T>) => Promise<T>;
  drainLock: (key: string, options: { timeout: string }) => Promise<"busy" | "drained">;
  inLock: () => boolean;
  currentLockTx: () => unknown;
  runOutsideLock: <T>(fn: () => T) => T;
  afterCommit: (tx: unknown, fn: () => void) => void;
};
async function copy(code: string, registry: object, db: object | null = null): Promise<API> {
  const module = { exports: {} };
  const built = await transform(code, { loader: "ts", format: "cjs" });
  const imports: Record<string, unknown> = {
    "node:async_hooks": { AsyncLocalStorage }, "./lock-key": { hashKey64 },
    "./prisma": { hasDatabase: () => db !== null, prisma: () => db },
  };
  new Function("require", "module", "exports", "globalThis", built.code)(
    (name: string) => { if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`); return imports[name]; },
    module, module.exports, registry,
  );
  return module.exports as API;
}
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function checks(code: string): Promise<Record<string, boolean>> {
  const registry = {}, a = await copy(code, registry), b = await copy(code, registry);
  const key = `copies:${randomUUID()}`;
  let release!: () => void, acquired!: () => void;
  const ready = new Promise<void>(resolve => { acquired = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const first = a.withLock(key, async () => { acquired(); await held; });
  await ready;
  let entered = false;
  const second = b.withLock(key, async () => { entered = true; return "second"; });
  const busyAcrossCopies = await b.drainLock(key, { timeout: "20ms" }) === "busy";
  await wait(10);
  const serialized = !entered;
  release();
  const settled = await Promise.all([first, second]);
  const drained = await a.drainLock(key, { timeout: "20ms" }) === "drained" && settled[1] === "second";

  let context = false, escaped = false, reentered = false;
  await a.withLock(key, async () => {
    context = b.inLock() && b.currentLockTx() === null;
    escaped = b.runOutsideLock(() => !a.inLock() && !b.inLock());
    reentered = await Promise.race([b.withLock(key, async () => true), wait(80).then(() => false)]);
  });
  // The failure control can leave a queued re-entry; allow it to drain before the next case.
  const nestedDrained = await a.drainLock(key, { timeout: "50ms" }) === "drained";
  let afterThrow = false;
  try { await a.withLock(key, async () => { throw new Error("expected fixture fault"); }); } catch { /* expected */ }
  await b.withLock(key, async () => { afterThrow = true; });

  // This stand-in proves ambient transaction propagation, not real PostgreSQL settlement.
  let transactions = 0, commits = 0, notifications = 0;
  const tx = { $executeRaw: async () => 1 };
  const db = { $transaction: async (fn: (value: object) => Promise<unknown>) => { transactions++; const out = await fn(tx); commits++; return out; } };
  const pgRegistry = {}, p = await copy(code, pgRegistry, db), q = await copy(code, pgRegistry, db);
  let sameTx = false, queued = false;
  await p.withLock(`${key}:outer`, async actual => {
    await q.withLock(`${key}:inner`, async nested => {
      sameTx = actual === tx && nested === tx && q.currentLockTx() === tx;
      q.afterCommit(nested, () => { notifications++; });
      queued = notifications === 0;
    });
  });
  const committedOnce = transactions === 1 && commits === 1 && notifications === 1;
  let rolledBack = false;
  const failingDb = { $transaction: async (fn: (value: object) => Promise<unknown>) => { await fn(tx); throw new Error("rollback fixture"); } };
  const rollbackRegistry = {}, r = await copy(code, rollbackRegistry, failingDb), s = await copy(code, rollbackRegistry, failingDb);
  try {
    await r.withLock(`${key}:rollback`, async actual => { s.afterCommit(actual, () => { rolledBack = true; }); });
  } catch { /* expected */ }
  return { "mutex.shared-busy": busyAcrossCopies, "mutex.serialized": serialized, "mutex.release": drained,
    "context.shared": context, "context.escape": escaped, "context.reentry": reentered && nestedDrained,
    "mutex.throw-release": afterThrow, "transaction.shared": sameTx, "transaction.queued": queued,
    "transaction.one-commit": committedOnce, "transaction.rollback-discards": !rolledBack };
}
let failed = 0;
for (const [name, pass] of Object.entries(await checks(source))) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`); if (!pass) failed++;
}
const mutants = [
  ["module-local memory chain", "const memLocks = lockRuntime.memory;", "const memLocks = new Map<string, Promise<unknown>>();", "mutex.shared-busy"],
  ["module-local ambient context", "const lockStore = lockRuntime.context;", "const lockStore = new AsyncLocalStorage<LockCtx>();", "context.reentry"],
  ["second copy replaces process registry", "lockGlobal.__50pickLocks ??=", "lockGlobal.__50pickLocks =", "mutex.serialized"],
] as const;
for (const [name, from, to, target] of mutants) {
  const unique = source.split(from).length === 2;
  const caught = unique && (await checks(source.replace(from, to)))[target] === false;
  console.log(`${caught ? "PASS" : "FAIL"} PLANT ${name} on ${target}`); if (!caught) failed++;
}
console.log(`lock-module-copies: 11 actual-module controls, 3 defect plants, ${failed} failures`);
const raw = process.env.VERIFY_DATABASE_URL;
if (!raw) {
  console.error("PostgreSQL duplicate-module controls NOT MEASURED: run the package script through db:scratch.");
  process.exit(failed ? 1 : 3);
}
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(raw).hostname)) throw new Error("PostgreSQL proof requires the local scratch cluster");
const { PrismaClient } = await import("@prisma/client");
const client = new PrismaClient({ datasources: { db: { url: raw } } });
const table = `lock_copy_probe_${process.pid}_${randomUUID().replaceAll("-", "")}`;
let tableCreated = false;
const ok = (name: string, pass: boolean) => { console.log(`${pass ? "PASS" : "FAIL"} postgres.${name}`); if (!pass) failed++; };
try {
  const directories = await client.$queryRawUnsafe<{ data_directory: string }[]>("SHOW data_directory");
  const normalize = (path: string) => resolve(path).replace(/\\/g, "/").toLowerCase();
  if (normalize(directories[0]?.data_directory ?? "") !== normalize(resolve(process.cwd(), ".pgscratch"))) throw new Error("Connected database is not this checkout's scratch data directory");
  await client.$executeRawUnsafe(`CREATE TABLE "${table}" (n integer NOT NULL)`);
  tableCreated = true;
  let transactions = 0, notices = 0, queued = false, sameTx = false, sameConnection = false;
  const db = { $transaction: (...args: unknown[]) => { transactions++; return (client.$transaction as Function).apply(client, args); } };
  const registry = {}, a = await copy(source, registry, db), b = await copy(source, registry, db);
  const key = `pg-copies:${randomUUID()}`;
  await a.withLock(key, async value => {
    const tx = value as typeof client;
    const first = await tx.$queryRawUnsafe<{ pid: number }[]>("SELECT pg_backend_pid() AS pid");
    await tx.$executeRawUnsafe(`INSERT INTO "${table}" VALUES (1)`);
    await b.withLock(`${key}:inner`, async nested => {
      const inner = nested as typeof client;
      const second = await inner.$queryRawUnsafe<{ pid: number }[]>("SELECT pg_backend_pid() AS pid");
      sameTx = value === nested && b.currentLockTx() === value;
      sameConnection = first[0].pid === second[0].pid;
      await inner.$executeRawUnsafe(`INSERT INTO "${table}" VALUES (2)`);
      b.afterCommit(nested, () => { notices++; }); queued = notices === 0;
    });
  });
  ok("one-real-transaction", transactions === 1);
  ok("same-client-and-connection", sameTx && sameConnection);
  ok("notification-waits-for-real-commit", queued && notices === 1);
  const committed = await client.$queryRawUnsafe<{ n: number }[]>(`SELECT n FROM "${table}" ORDER BY n`);
  ok("both-copy-writes-committed", JSON.stringify(committed) === '[{"n":1},{"n":2}]');
  let rollbackNotice = false, caught = false;
  try {
    await a.withLock(`${key}:rollback`, async value => {
      await b.withLock(`${key}:rollback-inner`, async nested => {
        await (nested as typeof client).$executeRawUnsafe(`INSERT INTO "${table}" VALUES (3)`);
        b.afterCommit(nested, () => { rollbackNotice = true; });
      });
      throw new Error("expected rollback across copies");
    });
  } catch (error) { caught = error instanceof Error && error.message === "expected rollback across copies"; }
  const after = await client.$queryRawUnsafe<{ n: number }[]>(`SELECT n FROM "${table}" ORDER BY n`);
  ok("both-copy-writes-rollback", caught && JSON.stringify(after) === '[{"n":1},{"n":2}]' && !rollbackNotice);
  let release!: () => void, acquired!: () => void;
  const ready = new Promise<void>(resolve => { acquired = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
  const holding = a.withLock(`${key}:held`, async () => { acquired(); await gate; });
  await ready;
  try { ok("other-copy-sees-real-advisory-lock", await b.drainLock(`${key}:held`, { timeout: "50ms" }) === "busy"); }
  finally { release(); await holding; }
  ok("real-advisory-lock-released", await b.drainLock(`${key}:held`, { timeout: "50ms" }) === "drained");
} finally {
  try { if (tableCreated) await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}"`); }
  finally { await client.$disconnect(); }
}
console.log(`lock-module-copies: memory and real PostgreSQL complete; ${failed} failures`);
process.exitCode = failed ? 1 : 0;
