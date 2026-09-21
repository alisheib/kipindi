/**
 * THE PURGE'S NEVER LIST, DRIVEN AGAINST A REAL PRISMA CLIENT — because the half that would
 * break the product had never executed.
 *
 * ⛔ WHY A SOURCE SCAN AND A FAKE CLIENT ARE NOT ENOUGH HERE, and this is the whole reason the
 * file exists. `test:chain-purge` §9 drives `guardProtectedModels` against a recording fake, with
 * no `DATABASE_URL`. That proves the REFUSALS. It cannot prove the thing a proxy over a Prisma
 * client is most likely to break:
 *
 *   🔴 `$transaction([...])` INSPECTS THE PROMISES IT IS GIVEN. A delegate proxy that returned a
 *      wrapped result — an `async` shim, a `Promise.resolve`, anything but the original
 *      `PrismaPromise` — would throw or silently run the batch outside the transaction, and the
 *      purge's ONLY write path is exactly that array. Every assertion in §9 would still pass: the
 *      fake client's `$transaction` is a stub that returns its argument.
 *
 * This drive therefore does five things a memory run structurally cannot: it takes a REAL
 * `PrismaClient`, wraps it, commits a real batch through it, reads real rows back, refuses a real
 * write to a real house table, and runs the live-intent precondition's Postgres branch — the
 * indexed `count` that the memory walk stands in for in `test:chain-purge` §11.
 *
 * ⛔ NEVER PRODUCTION. Loopback only, and it CREATEs and DROPs its own database.
 *
 * Run: npm run qa:purge-protected   (boots its own scratch cluster on 127.0.0.1:5433)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error("!! NOT MEASURED — this drive needs a local cluster. Run `npm run qa:purge-protected`, which boots one.");
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this drive CREATEs and DROPs a database. "${host}" is not a loopback host.`);
  process.exit(2);
}

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `purge_protected_${process.pid}`;
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();

// ⚠️ `connect_timeout=30` for the same reason every house suite carries it: PostgreSQL on Windows
// forks a backend per connection, and under load that fork can exceed Prisma's 5 s default. It
// changes nothing about what is tested — a cluster that is down still fails, 25 s later.
const url = `${BASE}/${DB}?connect_timeout=30`;
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8",
    shell: process.platform === "win32", timeout: 10 * 60_000,
  });
  ok("0 · prisma migrate deploy applies every migration to the scratch database", mig.status === 0,
     (mig.stderr ?? "").split("\n").slice(-3).join(" "));
  if (mig.status !== 0) throw new Error("migrations failed");

  // ⛔ SET BEFORE THE IMPORTS. `house-bot-dal` picks its backend at module load
  // (`hasDatabase() && USE_PRISMA_DAL !== "false"`), so a later assignment would drive the memory
  // store while every line of output claimed Postgres — a suite that measures the wrong thing and
  // says the right one.
  process.env.DATABASE_URL = url;
  process.env.USE_PRISMA_DAL = "true";
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

  const { PrismaClient } = await import("@prisma/client");
  const raw = new PrismaClient({ datasources: { db: { url } } });
  const { guardProtectedModels, PurgeProtectedTableError } = await import("../src/lib/server/purge-protected.ts");
  const guarded = guardProtectedModels(raw);

  const iso = (n: number) => new Date(Date.UTC(2026, 7, 1, 0, n));
  const MKT = "mkt_guard_1";

  /* The FK neighbours the fixtures need: `Comment.userId` and `HouseBot.userId` are real foreign
     keys (the house one ON DELETE RESTRICT), so the rows below cannot exist without them. */
  await raw.user.createMany({
    data: [
      { id: "usr_x", phoneE164: "+255700000001", updatedAt: iso(0) },
      { id: "usr_bot", phoneE164: "+255700000002", updatedAt: iso(0) },
    ] as never,
  });
  await raw.predictionMarket.create({
    data: {
      id: MKT, titleEn: "Guard 1", titleSw: "Guard 1", category: "other",
      sourceUrl: "https://example.test/guard", resolutionCriterion: "n/a",
      selectionClosedAt: iso(10), resolutionAt: iso(20), proposedBy: "usr_x",
    } as never,
  });
  await raw.comment.create({
    data: { id: "cmt_guard_1", marketId: MKT, userId: "usr_x", authorName: "x", body: "x" } as never,
  });

  // ── 1 · A REAL BATCH STILL COMMITS THROUGH THE PROXY ───────────────────────
  /* 🔴 THE ASSERTION THIS FILE WAS WRITTEN FOR. If the delegate proxy wrapped its return value,
     this line throws "Invalid `prisma.$transaction()` invocation" — or worse, runs the writes
     outside the transaction — and the purge's only write path is gone. */
  let batchError = "";
  try {
    await guarded.$transaction([
      guarded.comment.deleteMany({ where: { marketId: MKT } }),
      guarded.predictionMarket.updateMany({ where: { id: MKT }, data: { titleEn: "REDACTED" } }),
    ]);
  } catch (e) { batchError = String((e as Error)?.message ?? e); }
  ok("1 · 🔴 $transaction([…]) still commits through the guard — the purge's ONLY write path",
     batchError === "", batchError.split("\n")[0]);
  ok("1 · …and it really committed: the chaff is gone and the market is redacted",
     (await raw.comment.count({ where: { marketId: MKT } })) === 0
     && (await raw.predictionMarket.findUnique({ where: { id: MKT } }))?.titleEn === "REDACTED");

  // ── 2 · A REAL HOUSE WRITE IS REFUSED ──────────────────────────────────────
  const hb = {
    id: "hb_guard", userId: "usr_bot", label: "Guard Bot", labelKey: "guard bot", status: "ACTIVE",
    passwordFingerprint: "fp", verifiedAt: iso(0), verifiedById: "usr_officer",
    designatedAt: iso(0), designatedById: "usr_officer", rules: {},
  } as never;
  const refused = (fn: () => unknown): string => {
    try { void fn(); return "ALLOWED"; }
    catch (e) { return e instanceof PurgeProtectedTableError ? "refused" : `wrong error: ${String((e as Error)?.message)}`; }
  };
  ok("2 · 🔴 houseBotIntent.deleteMany is refused on a REAL client", refused(() => guarded.houseBotIntent.deleteMany({})) === "refused");
  ok("2 · 🔴 houseBot.create is refused", refused(() => guarded.houseBot.create({ data: hb })) === "refused");
  ok("2 · 🔴 auditLog.deleteMany is refused", refused(() => guarded.auditLog.deleteMany({})) === "refused");
  ok("2 · 🔴 ledgerEntry.updateMany is refused", refused(() => guarded.ledgerEntry.updateMany({ data: {} })) === "refused");
  ok("2 · ⛔ $queryRawUnsafe is refused — a SQL string walks past a per-model guard",
     refused(() => (guarded as unknown as { $queryRawUnsafe: (s: string) => unknown }).$queryRawUnsafe(`DELETE FROM "HouseBotIntent"`)) === "refused");

  // ── 3 · READS STILL REACH POSTGRES ─────────────────────────────────────────
  /* ⭐ THE CONTROL THAT MAKES §2 MEAN SOMETHING. A guard that refused EVERYTHING would pass every
     assertion above and break the cost panel and the new precondition — both of which COUNT the
     statutory record they may not touch. This is the "refuses everything" shape `red:chain-purge`
     already keeps a case for, one layer down. */
  const ledgerRead = await guarded.ledgerEntry.count({});
  const intentRead = await guarded.houseBotIntent.count({ where: { marketId: MKT } });
  ok("3 · ⭐ CONTROL — reads still reach the database through the guard", ledgerRead === 0 && intentRead === 0,
     `ledger ${ledgerRead} · intents ${intentRead}`);

  // ── 4 · THE LIVE-INTENT PRECONDITION'S POSTGRES BRANCH ─────────────────────
  /* ⚠️ `test:chain-purge` §11 drives the MEMORY walk, because it runs with no DATABASE_URL. The
     indexed `count` over every market at once — the branch production actually executes — is
     measured only here. Two implementations of one refusal, and only one of them was driven. */
  const { assetStore, chainStore, roundStore } = await import("../src/lib/server/updown-dal.ts");
  const { checkPreconditions } = await import("../src/lib/server/chain-purge.ts");
  const { houseBotIntentStore } = await import("../src/lib/server/house-bot-dal.ts");

  await assetStore.upsert({
    id: "ast_g", key: "GGG", symbol: "G/USD", nameEn: "G", nameSw: "G", nameZh: null, iconKey: "gold",
    priceSourceUrl: "https://api.twelvedata.com/quote", sourceDomain: "api.twelvedata.com",
    category: "crypto", decimals: 2, minMoveTicks: 2, enabled: true, sortOrder: 0,
    createdBy: "test", createdAt: iso(0).toISOString(), updatedAt: iso(0).toISOString(),
  } as never);
  await chainStore.upsert({
    id: "chn_g", assetId: "ast_g", durationMinutes: 5, state: "ARCHIVED", gridAnchorAt: iso(0).toISOString(),
    nextBoundaryAt: null, currentRoundId: null, minStake: null, maxStake: null,
    rateProfile: null, marginBps: null, createdBy: "test", createdAt: iso(0).toISOString(), updatedAt: iso(0).toISOString(),
  } as never);
  await roundStore.create({
    id: "udr_g_0", chainId: "chn_g", marketId: MKT, roundNumber: 1,
    opensAt: iso(0).toISOString(), closesAt: iso(1).toISOString(), boundaryAt: iso(1).toISOString(),
    openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
    marginBps: null, upTarget: null, downTarget: null,
    capturedSourceUrl: null, capturedSourceDomain: null,
    outcome: "UP", voidReason: null,
    resolvedAt: iso(2).toISOString(), settledAt: iso(3).toISOString(),
    createdAt: iso(0).toISOString(), updatedAt: iso(0).toISOString(),
  } as never);

  const clean = await checkPreconditions("chn_g");
  ok("4 · ⭐ CONTROL — a settled, archived chain with no live intent IS allowed", clean.ok, clean.ok ? "" : clean.error);

  await raw.houseBot.create({ data: hb });
  await houseBotIntentStore.insert({
    id: "hbi_g", houseBotId: "hb_guard", botUserId: "usr_bot", kind: "COUNTER", anchorKey: "pos_g",
    marketId: MKT, productLine: "UPDOWN", triggerPositionId: "pos_g", triggerUserId: "usr_p",
    targetId: null, requestedById: null, entryCondition: null, side: "YES", stakeTzs: 1000,
    dueAt: iso(1).toISOString(), deadlineAt: iso(9).toISOString(), staleAt: iso(9).toISOString(),
    status: "PENDING", reasonCode: null, why: null, decision: {}, attempts: 0, transientAttempts: 0,
    nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null,
    finishedAt: null, alertedAt: null,
  } as never);

  const blocked = await checkPreconditions("chn_g");
  ok("4 · 🔴 the Postgres branch REFUSES while a house intent is PENDING",
     !blocked.ok && /house intents are still live/.test(blocked.error), blocked.ok ? "(allowed)" : blocked.error);
  ok("4 · …and it counted the real row, not a constant", !blocked.ok && /^1 house intents/.test(blocked.error),
     blocked.ok ? "" : blocked.error);

  /* CRA-15 names this case itself: "after the intent expires the purge proceeds and the intent
     count is unchanged". ⭐ THE SECOND HALF IS THE ONE WORTH HAVING — the precondition must block
     the purge, never tidy the intents away. */
  await raw.houseBotIntent.updateMany({ where: { id: "hbi_g" }, data: { status: "CANCELLED", finishedAt: iso(4) } });
  const after = await checkPreconditions("chn_g");
  ok("4 · ⭐ …and once it is terminal the SAME chain is allowed", after.ok, after.ok ? "" : after.error);
  ok("4 · ⛔ …with the intent row still there — a precondition refuses, it never tidies",
     (await raw.houseBotIntent.count({})) === 1);

  /* ⚠️ BOTH CLIENTS. `checkPreconditions` goes through the module singleton in `prisma.ts`, not
     through `raw`, and a pool still holding connections when the database is dropped WITH (FORCE)
     prints a FATAL "terminating connection" line after the verdict — noise that reads like a
     failure in a guard whose whole job is to be believed. */
  const { prisma: singleton } = await import("../src/lib/server/prisma.ts");
  await singleton()?.$disconnect();
  await raw.$disconnect();
} finally {
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  await drop.end();
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — purge-protected: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
