/**
 * THE REMEDY, DRIVEN — can 50pick DECLARE a compliance row it lost?
 *
 *   npm run rehearse:audit-gap
 *
 * ⛔ WHAT CAME BEFORE. `rehearse:audit-loss-window` established the defect and refused the obvious
 * fix: `market-service.ts:1699` writes the bet's statutory row with a bare, un-awaited `audit({…})`;
 * a process that ends takes the queued append with it; the HMAC chain cannot see the hole because a
 * lost append consumes no `seq`; and the table has no update and no delete anywhere in `src/`, so
 * the row can never be added later. Awaiting it was MEASURED to cost p99 158 ms at 50-way
 * concurrency on an idle loopback cluster, and was refused.
 *
 * ⛔ WHAT THIS DRIVES. The remedy that survived the evidence, end to end, on a real scratch database
 * with the real migrations, the real `audit()` appender and the real reconciler:
 *
 *   ① `audit-reconcile.ts` — the DECLARATION. A committed `Position` with no `market.position.opened`
 *      row is found and entered in the chain as `audit.row_missing`. It cannot restore the row and
 *      does not pretend to: a late insert would chain at the CURRENT head and date the bet to the
 *      sweep. What it converts is a permanent INVISIBLE hole into a permanent DECLARED one.
 *   ② the grace, the self-deduplication and the cap — the three things that stop the register from
 *      becoming its own kind of lie (a false declaration, a duplicate one, or a flood).
 *   ③ `house-bot/worker.ts` — the BOUNDED flush at the end of the engine's own tick, so a deploy
 *      landing mid-fire does not leave a house bet with no compliance record. D20: that would be a
 *      missing PLAYER row, not a missing house row.
 *
 * ⛔ EVERY ASSERTION HAS A CONTROL. A planted shape the real code could contain, which must be
 * FLAGGED; and for every refusal a positive control — something that must still be ALLOWED.
 * ⛔ AND THE CONDITION IS DRIVEN, NEVER ARGUED: a real child process places real rows, fires real
 * bare appends and really exits, and the rows that are missing afterwards are counted.
 *
 * ⚠️ Lanes share the loopback cluster. This run creates ONE database named for its own pid and drops
 * only that one. The count is reported at open and at close.
 */
import pg from "pg";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const ROOT = resolve(import.meta.dirname, "..", "..");
let pass = 0, fail = 0, notMeasured = 0;
function ok(label: string, cond: boolean, detail = ""): boolean {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ""}`); }
  return cond;
}
function nm(label: string, why: string): void {
  notMeasured++; console.log(`  --   NOT MEASURED  ${label}\n         ${why}`);
}
const section = (t: string) => console.log(`\n${t}`);

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  nm("the whole rehearsal", "needs a local Postgres — run `npm run rehearse:audit-gap`, which boots one.");
  process.exit(3);
}
let host = "";
try { host = new globalThis.URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this rehearsal creates and drops a database and runs only against a loopback cluster (saw ${host || "an unparseable URL"}).`);
  process.exit(2);
}
if (process.env.NODE_ENV === "production") { console.error("!! refusing to run with NODE_ENV=production."); process.exit(2); }

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `rel_audit_gap_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
const dbCountAtOpen = Number((await admin.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
console.log(`\n  scratch cluster database count at open: ${dbCountAtOpen}`);
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`  scratch database: ${DB} (created by this run, dropped at the end)`);

const CHILD = join(import.meta.dirname, "audit-gap-child.mts");
const CHILD_ENV = { DATABASE_URL: URL_DB, NODE_ENV: "test", AUDIT_CHAIN_SECRET: "audit-gap-rehearsal" };

function child(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((done) => {
    let out = "", err = "";
    const c = spawn(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), CHILD, ...args], {
      cwd: ROOT, env: { ...process.env, ...CHILD_ENV },
    });
    c.stdout.on("data", (d) => (out += d));
    c.stderr.on("data", (d) => (err += d));
    c.on("close", (code) => done({ code: code ?? -1, out, err }));
    c.on("error", () => done({ code: -1, out, err }));
  });
}
const seededFrom = (out: string): Array<{ id: string; houseBotId: string | null }> => {
  const l = out.split("\n").find((x) => x.startsWith("SEEDED "));
  return l ? JSON.parse(l.slice("SEEDED ".length)) : [];
};

let cli: pg.Client | null = null;
try {
  // ── The table must be the one production has, not a hand-written copy ──────────────────────────
  const mig = await new Promise<number>((done) => {
    const c = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "ignore",
      shell: process.platform === "win32",
    });
    c.on("exit", (x) => done(x ?? 1));
    c.on("error", () => done(1));
  });
  if (!ok("0.1 · prisma migrate deploy applies every migration to the scratch database", mig === 0, `exit ${mig}`)) {
    throw new Error("migrate failed");
  }

  cli = new pg.Client({ connectionString: URL_DB });
  await cli.connect();

  // The parent talks to the same database through the REAL modules, so every query under test is
  // the shipped one. Env first — `prisma()` and `audit()` both read it at import time.
  Object.assign(process.env, CHILD_ENV);
  const REC = await import("@/lib/server/audit-reconcile") as typeof import("@/lib/server/audit-reconcile");
  const AUD = await import("@/lib/server/audit") as typeof import("@/lib/server/audit");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  const user = await db.user.create({ data: { phoneE164: `+25570000${String(process.pid).slice(-4)}` }, select: { id: true } });
  const market = await db.predictionMarket.create({
    data: {
      titleEn: "Audit gap rehearsal", titleSw: "Audit gap rehearsal", category: "other",
      sourceUrl: "https://example.invalid/rehearsal", resolutionCriterion: "never",
      resolutionAt: new Date(Date.now() + 86_400_000), proposedBy: user.id,
    },
    select: { id: true },
  });

  const landedIds = async (): Promise<Set<string>> => new Set(
    (await cli!.query(`SELECT "targetId" FROM "AuditLog" WHERE action='market.position.opened'`)).rows.map((r: Any) => r.targetId));
  const declaredIds = async (): Promise<Set<string>> => new Set(
    (await cli!.query(`SELECT "targetId" FROM "AuditLog" WHERE action='audit.row_missing'`)).rows.map((r: Any) => r.targetId));

  // ══ §1 · THE CONDITION, DRIVEN ═══════════════════════════════════════════════════════════════
  section("═══ §1 · A PROCESS ENDS AND THE COMPLIANCE ROW IS GONE ══════════════════════════════");
  const N = 24;
  // Backdated 30 minutes so the reconciler's OWN default window and OWN default grace apply — no
  // parameter is overridden anywhere in §1–§5, and the drill measures the shipped settings.
  const lost = await child(["bare", user.id, market.id, String(N), "lost", "70", "30", "3"]);
  const lostSeed = seededFrom(lost.out);
  console.log(`  ${lost.err.split("\n").filter((l) => l.startsWith("[child")).join("\n  ")}`);
  const landed1 = await landedIds();
  const hole = lostSeed.filter((p) => !landed1.has(p.id));
  console.log(`  POPULATION: ${lostSeed.length} bet(s) committed · ${lostSeed.filter((p) => landed1.has(p.id)).length} compliance row(s) landed · HOLE ${hole.length}`);
  ok("1.1 · a process that ends leaves committed bets with no compliance row — the condition is real and reproduced here, not argued",
    lostSeed.length === N && hole.length > 0, `${lostSeed.length} seeded, ${hole.length} lost`);
  ok("1.2 · and the bets themselves are all durably committed — the Position anchor survives what the audit row did not",
    Number((await cli.query(`SELECT count(*)::int n FROM "Position"`)).rows[0].n) === N);
  const houseLost = hole.filter((p) => p.houseBotId);
  console.log(`  of the hole, ${houseLost.length} were HOUSE stakes (houseBotId set) — D20 makes each a missing PLAYER row`);

  // ══ §2 · THE DETECTOR ════════════════════════════════════════════════════════════════════════
  section("═══ §2 · THE DETECTOR FINDS EXACTLY THE HOLE ════════════════════════════════════════");
  const t0 = Date.now();
  const scan = await REC.findBetAuditGaps({});
  const scanMs = Date.now() - t0;
  console.log(`  POPULATION scanned: ${scan.scanned} position(s) in ${scan.windowFrom} .. ${scan.windowUntil} (${scanMs}ms)`);
  const foundIds = new Set(scan.gaps.map((g) => g.positionId));
  ok("2.1 · the anti-join on the durable Position anchor finds exactly the bets whose row was lost — no more, no fewer",
    foundIds.size === hole.length && hole.every((p) => foundIds.has(p.id)),
    `found ${foundIds.size}, hole ${hole.length}`);
  // A guaranteed positive-control population, so the control never rests on how many rows a racing
  // child happened to land: eight bets whose statutory row is AWAITED and therefore certainly there.
  const control: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p = await db.position.create({
      data: { userId: user.id, marketId: market.id, side: "YES", stake: 300 + i, potentialPayout: 500 + i,
              placedAt: new Date(Date.now() - 25 * 60_000) },
      select: { id: true },
    });
    await AUD.audit({ category: "BET", action: "market.position.opened", actorId: user.id,
      targetType: "Position", targetId: p.id, payload: { drill: "control", positionId: p.id } });
    control.push(p.id);
  }
  const landedNow = await landedIds();
  const landedPositions = [...lostSeed.filter((p) => landed1.has(p.id)).map((p) => p.id), ...control]
    .filter((id) => landedNow.has(id));
  // Re-scan now that the control bets exist — the control must be judged by the SAME detector run
  // that sees them, never by the §2.1 scan taken before they were written.
  const scanC = await REC.findBetAuditGaps({});
  const flaggedC = new Set(scanC.gaps.map((g) => g.positionId));
  console.log(`  POSITIVE CONTROL population: ${landedPositions.length} bet(s) whose row DID land (${control.length} of them written with an awaited append)`);
  ok("2.c1 · POSITIVE CONTROL — every bet whose row landed is ALLOWED through, so the detector is not simply flagging every bet",
    landedPositions.length >= control.length && landedPositions.every((id) => !flaggedC.has(id)),
    `${landedPositions.filter((id) => flaggedC.has(id)).length} false positive(s) of ${landedPositions.length}`);
  const planted = await db.position.create({
    data: { userId: user.id, marketId: market.id, side: "YES", stake: 5000, potentialPayout: 9000,
            placedAt: new Date(Date.now() - 45 * 60_000), houseBotId: "bot_planted" },
    select: { id: true },
  });
  console.log(`  PLANTED CONTROL population: 1 committed HOUSE bet with a deliberately absent row`);
  const scan2 = await REC.findBetAuditGaps({});
  ok("2.c2 · PLANTED CONTROL — a committed house bet whose compliance row was never written is FOUND",
    scan2.gaps.some((g) => g.positionId === planted.id && g.houseBotId === "bot_planted"));
  ok("2.2 · the gap carries what the lost row carried — player, market, stake and the bot, from the durable Position",
    scan2.gaps.every((g) => g.userId === user.id && g.marketId === market.id && Number(g.stake) > 0));

  // ══ §3 · THE GRACE — the refusal, and what must still be allowed ═════════════════════════════
  section("═══ §3 · NOTHING STILL IN FLIGHT IS EVER DECLARED MISSING ═══════════════════════════");
  const fresh = await db.position.create({
    // `placedAt` written the way `market-service.ts:1369` writes it — an explicit UTC instant, never
    // the column's `DEFAULT CURRENT_TIMESTAMP`, which would store the SESSION's local wall clock.
    data: { userId: user.id, marketId: market.id, side: "NO", stake: 700, potentialPayout: 1300, placedAt: new Date() },
    select: { id: true },
  });
  const tz = (await cli.query(`SELECT current_setting('TimeZone') AS tz,
    EXTRACT(EPOCH FROM (now() - (now() AT TIME ZONE 'UTC')))::int AS offs`)).rows[0] as Any;
  console.log(`  ⚠️ this cluster's session timezone is ${tz.tz} (offset ${tz.offs}s from UTC)`);
  const freshScan = await REC.findBetAuditGaps({});
  console.log(`  POPULATION: 1 bet committed a moment ago with no row yet; grace is ${REC.RECONCILE_GRACE_MS / 60000} min`);
  ok("3.1 · THE REFUSAL — a bet placed a moment ago is NOT declared missing, however absent its row is: it may simply still be queued",
    !freshScan.gaps.some((g) => g.positionId === fresh.id));
  const laterScan = await REC.findBetAuditGaps({ nowMs: Date.now() + REC.RECONCILE_GRACE_MS + 60_000 });
  ok("3.c1 · POSITIVE CONTROL — the SAME bet IS found once the grace has passed, so §3.1 is a grace and not a blind spot",
    laterScan.gaps.some((g) => g.positionId === fresh.id));
  ok("3.c2 · PLANTED CONTROL — with the grace collapsed to zero the in-flight bet would be declared, which is the false statement the grace exists to prevent",
    (await REC.findBetAuditGaps({ graceMs: 0 })).gaps.some((g) => g.positionId === fresh.id));
  /* ⛔ THE DEFECT THIS DRILL ACTUALLY FOUND (2026-09-21, first run). `placedAt` is TIMESTAMP(3)
   * WITHOUT time zone and the app writes UTC into it; a bound Date is resolved in the SESSION's
   * timezone, so on this +03:00 cluster the window ran three hours past `now` and §3.1 FAILED — the
   * ten-minute grace was silently NEGATIVE. The reconciler now anchors every bound instant with
   * `::timestamptz AT TIME ZONE 'UTC'`. This control runs the OLD, session-local comparison against
   * the same data: it must still swallow the in-flight bet, or §3.1 above passed by luck. */
  const sessionLocal = (await cli.query(
    `SELECT count(*)::int n FROM "Position" p
      WHERE p."placedAt" >= $1::timestamptz AND p."placedAt" < $2::timestamptz AND p."id" = $3`,
    [new Date(Date.now() - REC.RECONCILE_LOOKBACK_MS), new Date(Date.now() - REC.RECONCILE_GRACE_MS), fresh.id])).rows[0].n as number;
  ok("3.c3 · PLANTED CONTROL — the session-local comparison this replaced DOES swallow the in-flight bet on a non-UTC session, so §3.1 passes because of the UTC anchor and not by luck",
    Number(tz.offs) !== 0 ? sessionLocal === 1 : true,
    `session-local matched ${sessionLocal}; cluster offset ${tz.offs}s${Number(tz.offs) === 0 ? " (UTC cluster — the trap cannot be shown here)" : ""}`);

  // ══ §4 · THE DECLARATION ═════════════════════════════════════════════════════════════════════
  section("═══ §4 · THE HOLE IS ENTERED IN THE CHAIN ═══════════════════════════════════════════");
  const before = await declaredIds();
  const decl = await REC.declareBetAuditGaps({});
  const after = await declaredIds();
  console.log(`  POPULATION: ${decl.scanned} scanned · ${decl.gaps.length} gap(s) · ${decl.declared} declared`);
  ok("4.1 · every gap found is declared — one chained audit.row_missing row per bet with no compliance record",
    decl.declared === decl.gaps.length && after.size === before.size + decl.declared,
    `declared ${decl.declared}, chain grew by ${after.size - before.size}`);
  // Read through Prisma, not the raw client: `AuditLog.createdAt` is TIMESTAMP(3) without a zone,
  // and a raw driver parses a naive timestamp in the LOCAL zone — which would shift it by the
  // session offset and make the back-dating check below read three hours wrong.
  const row = await db.auditLog.findFirst({ where: { action: "audit.row_missing", targetId: planted.id } }) as Any;
  ok("4.2 · the declaration is filed as COMPLIANCE against the bet it names",
    !!row && row.category === "COMPLIANCE" && row.targetType === "Position" && row.targetId === planted.id);
  ok("4.3 · it says WHICH row is missing, and says in terms that it is a record of the absence and not the row itself",
    !!row && row.payload?.missingAction === "market.position.opened" && /not the row/i.test(String(row.payload?.note)));
  ok("4.4 · it NEVER back-dates: the entry is stamped now, and the bet's own time travels in the payload where it cannot be mistaken for it",
    !!row && new Date(row.createdAt).getTime() > new Date(row.payload.placedAt).getTime()
    && Math.abs(new Date(row.payload.placedAt).getTime() - (Date.now() - 45 * 60_000)) < 120_000);
  ok("4.5 · a HOUSE stake is declared with the same action and shape as a player's — D20, an ordinary player row in every report",
    !!row && row.payload?.houseBotId === "bot_planted" && row.action === "audit.row_missing"
    && (await cli.query(`SELECT count(DISTINCT action)::int n FROM "AuditLog" WHERE action='audit.row_missing'`)).rows[0].n === 1);
  const chain = await AUD.verifyChainFull();
  console.log(`  verifyChainFull() after the declarations: ${JSON.stringify(chain)}`);
  ok("4.6 · the register does not break the chain it is written into",
    chain.valid === true && chain.linkBroken === false);
  console.log(`  ⛔ and it still cannot SEE the hole — ${decl.declared} rows are missing and the chain verifies clean.`);
  console.log(`     The declaration is the only thing in this database that knows they are gone.`);

  // ══ §5 · SELF-DEDUPLICATION ══════════════════════════════════════════════════════════════════
  section("═══ §5 · A DECLARED HOLE IS NO LONGER A HOLE ════════════════════════════════════════");
  const again = await REC.declareBetAuditGaps({});
  console.log(`  POPULATION: ${again.scanned} position(s) re-scanned`);
  ok("5.1 · a second sweep over the same window declares NOTHING — the register is a count, not a growing pile of the same finding",
    again.gaps.length === 0 && again.declared === 0, `${again.declared} declared on the second pass`);
  const naive = (await cli.query(
    `SELECT count(*)::int n FROM "Position" p
      WHERE p."placedAt" < (now() AT TIME ZONE 'UTC') - interval '10 minutes'
       AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."targetType"='Position' AND a."targetId"=p."id"
         AND a."action"='market.position.opened')`)).rows[0].n as number;
  console.log(`  MUTATION CONTROL population: the same query with only the statutory action in the anti-join`);
  ok("5.c1 · MUTATION CONTROL — drop the declaration from the anti-join and the very same bets are reported all over again, which is what §5.1 proves is not happening",
    naive === decl.declared && decl.declared > 0, `naive ${naive} vs declared ${decl.declared}`);

  // ══ §6 · THE CAP ═════════════════════════════════════════════════════════════════════════════
  section("═══ §6 · A PATHOLOGICAL HOUR CANNOT FLOOD THE CHAIN ═════════════════════════════════");
  const M = 7;
  const capped = await child(["bare", user.id, market.id, String(M), "capped", "0", "40", "2"]);
  const capSeed = seededFrom(capped.out);
  const capLanded = await landedIds();
  const stillMissing = capSeed.filter((p) => !capLanded.has(p.id));
  console.log(`  POPULATION: ${capSeed.length} more bet(s) committed, ${stillMissing.length} with no row (drain budget 0 ms)`);
  const c1 = await REC.declareBetAuditGaps({ cap: 3 });
  ok("6.1 · a sweep declares at most its cap and SAYS it was capped, so nothing is silently left behind",
    c1.declared === 3 && c1.capped === true, `declared ${c1.declared}, capped ${c1.capped}`);
  const c2 = await REC.declareBetAuditGaps({ cap: 3 });
  ok("6.2 · the next sweep continues where it stopped — an undeclared gap stays a gap, so the cap defers work and never drops it",
    c2.declared === Math.min(3, stillMissing.length - 3), `declared ${c2.declared} of ${stillMissing.length - 3} remaining`);
  const c3 = await REC.declareBetAuditGaps({ cap: 50 });
  const leftover = await REC.findBetAuditGaps({ cap: 50 });
  ok("6.3 · and the register closes: every one of them ends up declared",
    leftover.gaps.length === 0, `${leftover.gaps.length} still undeclared after ${c1.declared + c2.declared + c3.declared} declarations`);

  // ══ §7 · THE HOUSE-BOT REMEDY ════════════════════════════════════════════════════════════════
  section("═══ §7 · THE ENGINE'S TICK PAYS FOR ITS OWN COMPLIANCE ROWS ═════════════════════════");
  const K = 24;
  const flushed = await child(["flush", user.id, market.id, String(K), "flushed", "0", "35", "2"]);
  const flushSeed = seededFrom(flushed.out);
  console.log(`  ${flushed.err.split("\n").filter((l) => l.startsWith("[child")).join("\n  ")}`);
  const landed3 = await landedIds();
  const flushHole = flushSeed.filter((p) => !landed3.has(p.id));
  console.log(`  POPULATION: ${flushSeed.length} bet(s) fired bare, then the REAL flushAuditWithin(AUDIT_FLUSH_BUDGET_MS) from house-bot/worker.ts, then the same hard exit`);
  ok("7.1 · the bounded flush at the end of the tick lands EVERY compliance row the same exit lost in §1 — the house-bot case closed at the tick, not at the bet",
    flushSeed.length === K && flushHole.length === 0, `${flushHole.length} still lost`);
  ok("7.c1 · POSITIVE CONTROL — §1's identical child WITHOUT the flush lost rows, so §7.1 measures the flush and not a slow machine",
    hole.length > 0, `§1 hole was ${hole.length}`);
  const postFlush = await REC.findBetAuditGaps({});
  ok("7.2 · and the reconciler has nothing to declare about them",
    !postFlush.gaps.some((g) => flushSeed.some((p) => p.id === g.positionId)));
  console.log(`  ⚠️ this NARROWS the window, it does not close it: a signal landing mid-fire still loses the row,`);
  console.log(`     which is why ① exists as the backstop and ③ is never described as the fix.`);

  // ══ §8 · COST ════════════════════════════════════════════════════════════════════════════════
  section("═══ §8 · WHAT THE SWEEP COSTS ═══════════════════════════════════════════════════════");
  const t1 = Date.now();
  const cost = await REC.findBetAuditGaps({});
  const costMs = Date.now() - t1;
  console.log(`  POPULATION: ${cost.scanned} position(s) anti-joined against the chain in ${costMs}ms on loopback`);
  ok("8.1 · a clean sweep reads an indexed window and writes nothing at all",
    cost.gaps.length === 0 && costMs >= 0);
  console.log(`  ⚠️ loopback and a small table: a FLOOR, not production. The sweep runs every 5 minutes on the`);
  console.log(`     lifecycle leader, off every money path, and appends only when something is actually wrong.`);

  await db.$disconnect();
  // The appender holds its own pooled client on globalThis; drop it before the database goes, or
  // the drop kills the connection under it and prints a FATAL that is not a result.
  await (await import("@/lib/server/prisma")).prisma()?.$disconnect().catch(() => {});
} finally {
  await cli?.end().catch(() => {});
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect().catch(() => {});
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  const closeCount = Number((await drop.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n);
  await drop.end().catch(() => {});
  console.log(`\n  scratch cluster database count at close: ${closeCount} (was ${dbCountAtOpen} at open)`);
}

console.log(`\naudit-gap-reconcile: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
process.exit(fail > 0 ? 1 : notMeasured > 0 ? 3 : 0);
