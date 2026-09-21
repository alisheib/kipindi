/**
 * THE HOLE, AND THE LIE — driven end to end on a real Postgres with the real appender.
 *
 *   npm run rehearse:audit-hole
 *
 * ⛔ WHAT CAME BEFORE. `rehearse:audit-loss-window` established that a queued append dies with the
 * process. `rehearse:audit-drain` made the process WAIT for the queue. `rehearse:audit-gap` proved a
 * lost BET row can be declared against the durable `Position` anchor. Three things were left, and
 * this drill is about the two that matter most:
 *
 *   ① THE CHAIN STILL CANNOT SEE A HOLE. A lost append consumes no `seq` and leaves no dangling
 *      `prevHash`, so `verifyChainFull()` reports a perfect log over a chain that is missing rows.
 *      And the rows with NO anchor — `player.record_viewed`, `kyc_doc.viewed`,
 *      `privacy.dsar.exported`, `transactions.exported`, the ISO 27001 A.12.4 access-logging class
 *      — cannot be reconciled against anything, so `audit-reconcile.ts` can never find them.
 *   ② `valid:true` OVER A TAMPERED ROW. Only a link break made `valid` false, so an in-place EDIT
 *      left the platform telling an officer the log was sound.
 *
 * ⛔ THE HOLE IS BUILT, NOT RACED, and that is a correction of this programme's own mistake:
 * `rehearse:audit-loss-window` §5 once passed VACUOUSLY over a hole of zero on a quiet machine and
 * failed its own positive control on a loaded one. Here the parent holds the audit chain's own
 * advisory lock — the same key `appendPersisted` takes — with `statement_timeout` set on the child's
 * connection, so the child's appends abort the lock wait, roll back, and take the fail-open branch
 * in `audit()`. Same hole, every run, through the shipped code.
 *
 * ⛔ EVERY ASSERTION HAS A CONTROL. A planted shape the real code could contain, which must be
 * FLAGGED; and for every refusal a positive control — something that must still be ALLOWED.
 *
 * ⚠️ Lanes share the loopback cluster. This run creates ONE database named for its own pid and drops
 * only that one. The count is reported at open and at close.
 */
import pg from "pg";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
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
  nm("the whole rehearsal", "needs a local Postgres — run `npm run rehearse:audit-hole`, which boots one.");
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
const DB = `rel_audit_hole_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;
/** ⛔ THE CHILD'S CONNECTION, AND THE ONLY DIFFERENCE IS A STATEMENT TIMEOUT. That is what turns the
 *  parent's advisory lock into a write FAILURE rather than a write that waits — i.e. into the
 *  fail-open branch `audit()` takes against a sick database in production. */
const STATEMENT_TIMEOUT_MS = 900;
const URL_CHILD = `${BASE}/${DB}?connect_timeout=30&options=${encodeURIComponent(`-c statement_timeout=${STATEMENT_TIMEOUT_MS}`)}`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
const dbCountAtOpen = Number((await admin.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
console.log(`\n  scratch cluster database count at open: ${dbCountAtOpen}`);
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`  scratch database: ${DB} (created by this run, dropped at the end)`);

const CHILD = join(import.meta.dirname, "audit-hole-child.mts");
const CHILD_ENV = { DATABASE_URL: URL_CHILD, NODE_ENV: "test", AUDIT_CHAIN_SECRET: "audit-hole-rehearsal" };

/** A line-driven child. The parent must be able to take the lock BETWEEN two batches of appends,
 *  which a fire-and-forget child cannot express. */
function startChild(): { proc: ChildProcessWithoutNullStreams; next: (want: string) => Promise<string[]>; send: (s: string) => void } {
  const proc = spawn(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), CHILD], {
    cwd: ROOT, env: { ...process.env, ...CHILD_ENV },
  }) as ChildProcessWithoutNullStreams;
  let buf = "";
  const lines: string[] = [];
  const waiters: Array<{ want: string; resolve: (v: string[]) => void; from: number }> = [];
  const pump = () => {
    for (const w of [...waiters]) {
      const at = lines.findIndex((l, i) => i >= w.from && l.startsWith(w.want));
      if (at >= 0) { waiters.splice(waiters.indexOf(w), 1); w.resolve(lines.slice(w.from, at + 1)); }
    }
  };
  // ⚠️ ONLY PROTOCOL LINES ARE KEPT. `audit()` logs every append to stdout outside production, so
  // the child's own compliance chatter is interleaved with the protocol — and the first version of
  // this drill parsed one of those log lines as a reply. Anything that is not a protocol token is
  // the child talking to the operator, not to the parent.
  const PROTOCOL = /^(READY|DONE|IDS |BOOT |ISSUED )/;
  proc.stdout.on("data", (d) => {
    buf += String(d);
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const p of parts) if (PROTOCOL.test(p.trim())) lines.push(p.trim());
    pump();
  });
  proc.stderr.on("data", () => { /* prisma noise */ });
  let cursor = 0;
  return {
    proc,
    send: (s: string) => proc.stdin.write(`${s}\n`),
    next: (want: string) => new Promise<string[]>((resolve) => {
      const w = { want, resolve: (v: string[]) => { cursor += v.length; resolve(v); }, from: cursor };
      waiters.push(w);
      pump();
    }),
  };
}

/** ⛔ THE `IDS` LINE IS FOUND BY NAME, never by position. The child's own audit logging shares the
 *  stream, so "the first line of the reply" is not a safe address for the reply's content. */
const idsFrom = (reply: string[]): string[] => {
  const line = reply.find((l) => l.startsWith("IDS "));
  if (!line) throw new Error(`the child replied without an IDS line: ${JSON.stringify(reply)}`);
  return JSON.parse(line.slice("IDS ".length)) as string[];
};

const ticketOf = (id: string): number | null => {
  const m = /^aud_b[0-9a-z]+_([0-9]{9})$/.exec(id);
  return m ? Number(m[1]) : null;
};

let cli: pg.Client | null = null;
let locker: pg.Client | null = null;
let child: ReturnType<typeof startChild> | null = null;
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
  Object.assign(process.env, { DATABASE_URL: URL_DB, NODE_ENV: "test", AUDIT_CHAIN_SECRET: "audit-hole-rehearsal" });
  const AUD = await import("@/lib/server/audit") as typeof import("@/lib/server/audit");
  const TIX = await import("@/lib/server/audit-ticket") as typeof import("@/lib/server/audit-ticket");
  const { hashKey64 } = await import("@/lib/server/lock-key") as typeof import("@/lib/server/lock-key");

  // ══ §1 · THE HOLE IS BUILT ═══════════════════════════════════════════════════════════════════
  section("═══ §1 · A PROCESS KEEPS RUNNING AND ITS COMPLIANCE ROWS ARE GONE ══════════════════");
  child = startChild();
  await child.next("READY");

  child.send("append 3 pre");
  const preIds: string[] = idsFrom(await child.next("DONE"));

  // ⛔ THE LOCK IS THE CHAIN'S OWN. Same key, same keyspace, taken at SESSION scope so it outlives
  // the parent's statement — which is what `appendPersisted`'s `pg_advisory_xact_lock` will wait on.
  locker = new pg.Client({ connectionString: URL_DB });
  await locker.connect();
  const lockId = hashKey64("audit:chain");
  await locker.query(`SELECT pg_advisory_lock($1::bigint)`, [lockId.toString()]);

  child.send("append 5 hole");
  const holeIds: string[] = idsFrom(await child.next("DONE"));

  await locker.query(`SELECT pg_advisory_unlock($1::bigint)`, [lockId.toString()]);
  await locker.end(); locker = null;

  child.send("append 4 post");
  const postIds: string[] = idsFrom(await child.next("DONE"));

  child.send("exit");
  const tail = await child.next("ISSUED");
  const bootId = tail.find((l) => l.startsWith("BOOT "))!.slice("BOOT ".length);
  const issued = Number(tail.find((l) => l.startsWith("ISSUED "))!.slice("ISSUED ".length));
  child = null;

  const allIds = [...preIds, ...holeIds, ...postIds];
  const landedRows = await cli.query(`SELECT "id" FROM "AuditLog"`);
  const landed = new Set<string>(landedRows.rows.map((r: Any) => r.id));
  const lost = allIds.filter((id) => !landed.has(id));
  const lostTickets = lost.map(ticketOf).filter((t): t is number => t !== null).sort((a, b) => a - b);

  console.log(`  POPULATION: boot ${bootId} issued ${issued} ticket(s); ${allIds.length} appends made by the drill`);
  console.log(`  LANDED    : ${allIds.filter((id) => landed.has(id)).length}   LOST: ${lost.length}  (tickets ${lostTickets.join(", ") || "none"})`);
  ok("1.1 · the fail-open is REAL — a durable write that cannot take the chain lock keeps the entry in memory only, and the row is gone",
    lost.length > 0, `${lost.length} lost of ${allIds.length}`);
  ok("1.2 · and it is an INTERIOR hole by construction: appends landed before it and after it, so this is not a tail loss dressed up as one",
    preIds.every((id) => landed.has(id)) && postIds.every((id) => landed.has(id)) && lost.length === holeIds.length,
    `pre ${preIds.filter((i) => landed.has(i)).length}/${preIds.length}, hole ${lost.length}/${holeIds.length}, post ${postIds.filter((i) => landed.has(i)).length}/${postIds.length}`);
  ok("1.3 · the lost rows are the ACCESS-LOG class — player.record_viewed, which has no durable anchor anywhere, so audit-reconcile.ts can never find them",
    lost.length > 0 && Number((await cli.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='player.record_viewed'`)).rows[0].n) === allIds.length - lost.length);

  // ══ §2 · THE CHAIN CANNOT SEE IT — AND THAT IS STILL TRUE ════════════════════════════════════
  section("═══ §2 · THE CHAIN REPORTS A PERFECT LOG OVER A CHAIN THAT IS MISSING ROWS ═════════");
  const v1 = await AUD.verifyChainFull();
  console.log(`  verifyChainFull() = ${JSON.stringify({ valid: v1.valid, total: v1.total, verified: v1.verified, unattested: v1.unattested, linkBroken: v1.linkBroken })}`);
  ok("2.1 · with rows KNOWN to be missing, the chain's own link check still reports nothing wrong — a lost append consumes no seq and breaks no link",
    v1.linkBroken === false && v1.valid === true,
    `linkBroken=${v1.linkBroken} valid=${v1.valid} over a chain missing ${lost.length} row(s)`);
  const seqGaps = Number((await cli.query(
    `SELECT (max("seq") - min("seq") + 1 - count(*))::int AS n FROM "AuditLog"`)).rows[0].n);
  ok("2.2 · and there is no gap in seq either — the loss is invisible to every ordering property the table has",
    seqGaps === 0, `${seqGaps} seq gap(s)`);

  // ══ §3 · THE TICKET DETECTOR ═════════════════════════════════════════════════════════════════
  section("═══ §3 · THE TICKET MAKES THE HOLE VISIBLE ═════════════════════════════════════════");
  const t0 = Date.now();
  const scan = await TIX.findAuditTicketGaps({ windowRows: 0 });
  const scanMs = Date.now() - t0;
  console.log(`  POPULATION scanned: ${scan.scannedTicketed} ticketed row(s) of ${scan.scannedRows} across ${scan.boots} boot(s) (${scanMs}ms)`);
  const foundTickets: number[] = [];
  for (const g of scan.gaps) for (let t = g.from; t <= g.to; t++) foundTickets.push(t);
  foundTickets.sort((a, b) => a - b);
  // ⛔ THE EXPECTED SET MUST BE NON-EMPTY, AND THIS LINE IS HERE BECAUSE THE DRILL FAILED IT.
  // Under a mutation that removed the ticket from the id entirely, `lostTickets` and `foundTickets`
  // were BOTH empty and §3.1 passed — a vacuous pass over a detector that had been deleted. An
  // equality between two empty sets proves nothing; the population has to be established first.
  ok("3.0 · the drill has a real expected set to compare against — an equality over two empty sets is not a measurement",
    lostTickets.length > 0 && lost.length === lostTickets.length,
    `${lostTickets.length} lost ticket(s) parsed from ${lost.length} lost id(s)`);
  ok("3.1 · the detector finds EXACTLY the tickets that were lost — no more, no fewer",
    lostTickets.length > 0 && foundTickets.length === lostTickets.length && foundTickets.every((t, i) => t === lostTickets[i]),
    `found [${foundTickets.join(",")}] vs lost [${lostTickets.join(",")}]`);
  ok("3.2 · and it names the boot that lost them, so the finding is attributable to one container",
    scan.gaps.length > 0 && scan.gaps.every((g) => g.boot === bootId), `boots ${scan.gaps.map((g) => g.boot).join(",")} vs ${bootId}`);
  ok("3.3 · it reports the POPULATION it scanned, so a pass over nothing can never read as a clean bill of health",
    scan.scannedTicketed > 0 && scan.scannedRows >= scan.scannedTicketed);
  ok("3.4 · the loss window is bounded by the two rows either side of it, which is the only timing a lost row can ever be given",
    scan.gaps.every((g) => Date.parse(g.afterAt) <= Date.parse(g.beforeAt)));

  // POSITIVE CONTROL — a healthy boot must not be flagged. Written by the PARENT, whose appends all
  // land, so it is a different boot with a complete ticket run.
  for (let i = 0; i < 6; i++) {
    await AUD.audit({ category: "COMPLIANCE", action: "kyc_doc.viewed", actorId: "officer_control",
      targetType: "User", targetId: `usr_ctl_${i}`, payload: { drill: "positive-control", i } });
  }
  const scanC = await TIX.findAuditTicketGaps({ windowRows: 0 });
  const parentBoot = AUD.auditBootId();
  ok("3.c1 · POSITIVE CONTROL — a boot whose every append landed is ALLOWED through, so the detector is not simply flagging every boot",
    scanC.gaps.every((g) => g.boot !== parentBoot) && scanC.boots >= 2,
    `parent boot ${parentBoot} flagged=${scanC.gaps.some((g) => g.boot === parentBoot)}, boots=${scanC.boots}`);

  // PLANTED CONTROL — a second, independent hole in a DIFFERENT boot must be found too, so §3.1 is
  // not passing because it memorised one shape.
  const plantBoot = `b${Date.now().toString(36)}plant`;
  const headRow = (await cli.query(`SELECT "entryHash" FROM "AuditLog" ORDER BY "seq" DESC LIMIT 1`)).rows[0];
  await cli.query(
    `INSERT INTO "AuditLog" ("id","category","action","actorId","targetType","targetId","payload","createdAt","prevHash","entryHash")
     VALUES ($1,'SYSTEM','planted.one',NULL,NULL,NULL,'{}'::jsonb, now(), $2, $3),
            ($4,'SYSTEM','planted.two',NULL,NULL,NULL,'{}'::jsonb, now(), $3, $5)`,
    [`aud_${plantBoot}_000000001`, headRow.entryHash, `planted_head_${process.pid}_a`,
     `aud_${plantBoot}_000000009`, `planted_head_${process.pid}_b`]);
  const scanP = await TIX.findAuditTicketGaps({ windowRows: 0 });
  const planted = scanP.gaps.find((g) => g.boot === plantBoot);
  ok("3.c2 · PLANTED CONTROL — a second boot missing tickets 2..8 is FOUND, with the right range and the right count",
    !!planted && planted.from === 2 && planted.to === 8 && planted.missing === 7,
    planted ? `${planted.from}..${planted.to} (${planted.missing})` : "not found");

  // ══ §4 · THE DECLARATION ═════════════════════════════════════════════════════════════════════
  section("═══ §4 · A PERMANENT INVISIBLE HOLE BECOMES A PERMANENT DECLARED ONE ═══════════════");
  const dec = await TIX.declareAuditTicketGaps({ windowRows: 0 });
  const declaredRows = await cli.query(
    `SELECT "targetId", "payload" FROM "AuditLog" WHERE action='audit.rows_missing' ORDER BY "seq"`);
  console.log(`  declared ${dec.declared} range(s), ${dec.declaredAppends} append(s); ${declaredRows.rows.length} row(s) in the chain`);
  // ⛔ `> 0` ON BOTH SIDES, for the same reason as §3.0: "0 declared of 0 found" is an identity, not
  // a finding, and it is what a deleted detector produces.
  ok("4.1 · every range found is declared — one chained audit.rows_missing row per contiguous run of lost appends",
    scanP.gaps.length > 0 && dec.declared === scanP.gaps.length && declaredRows.rows.length === dec.declared,
    `${dec.declared} declared / ${scanP.gaps.length} found / ${declaredRows.rows.length} rows`);
  const mine = declaredRows.rows.find((r: Any) => r.targetId.startsWith(`${bootId}#`));
  ok("4.2 · the declaration names the boot, the ticket range and the count, and says in its own text that the rows are NOT recoverable",
    !!mine && mine.payload.boot === bootId && mine.payload.missing === lostTickets.length
      && /not recoverable/i.test(String(mine.payload.note)),
    mine ? JSON.stringify(mine.payload).slice(0, 180) : "no declaration for the child's boot");
  const dec2 = await TIX.declareAuditTicketGaps({ windowRows: 0 });
  ok("4.3 · a second sweep declares NOTHING — a declared gap is no longer a gap, so the register is a count and not a pile of duplicates",
    dec.declared > 0 && dec2.declared === 0 && dec2.gaps.length === 0,
    `${dec.declared} declared first, ${dec2.declared} re-declared`);
  // PLANTED CONTROL — a NEW hole after a clean sweep must still be found, so §4.3 is dedup and not
  // a detector that has switched itself off.
  const plant2 = `b${Date.now().toString(36)}pl2`;
  const head2 = (await cli.query(`SELECT "entryHash" FROM "AuditLog" ORDER BY "seq" DESC LIMIT 1`)).rows[0];
  await cli.query(
    `INSERT INTO "AuditLog" ("id","category","action","actorId","targetType","targetId","payload","createdAt","prevHash","entryHash")
     VALUES ($1,'SYSTEM','planted.three',NULL,NULL,NULL,'{}'::jsonb, now(), $2, $3),
            ($4,'SYSTEM','planted.four',NULL,NULL,NULL,'{}'::jsonb, now(), $3, $5)`,
    [`aud_${plant2}_000000001`, head2.entryHash, `planted_head_${process.pid}_c`,
     `aud_${plant2}_000000004`, `planted_head_${process.pid}_d`]);
  const dec3 = await TIX.findAuditTicketGaps({ windowRows: 0 });
  ok("4.c1 · PLANTED CONTROL — a NEW hole after a clean sweep is still FOUND, so the dedup above is deduplication and not a dead check",
    dec3.gaps.some((g) => g.boot === plant2 && g.from === 2 && g.to === 3));
  ok("4.c2 · PLANTED CONTROL — the already-declared range is NOT re-reported in the same scan",
    !dec3.gaps.some((g) => g.boot === bootId));

  // ══ §5 · AR-3 — `valid:true` OVER A TAMPERED ROW ═════════════════════════════════════════════
  section("═══ §5 · AN EDITED ROW STOPS BEING CALLED A SOUND LOG ══════════════════════════════");
  // The planted rows above cannot recompute (they were inserted with a fabricated entryHash), so the
  // chain is deliberately brought to a KNOWN state first: they are the legacy-shaped population this
  // section baselines, and §5.1 measures the verdict over them.
  const v2 = await AUD.verifyChainFull();
  console.log(`  before any baseline: ${JSON.stringify({ valid: v2.valid, unattested: v2.unattested, baselined: v2.baselined, linkBroken: v2.linkBroken })}`);
  ok("5.1 · rows that recompute under no key and are covered by NO declaration make `valid` FALSE — the old code returned true here",
    v2.valid === false && (v2.unattested ?? 0) > 0 && v2.linkBroken === false,
    JSON.stringify({ valid: v2.valid, unattested: v2.unattested, linkBroken: v2.linkBroken }));
  ok("5.c1 · and it is false for the RIGHT REASON — the links are intact, so nothing here is being mistaken for an insertion or a removal",
    v2.linkBroken === false && !/link/i.test(String(v2.firstBreakAt ?? "")));

  const census = await AUD.censusUnverifiable();
  const baselineEntry = await AUD.audit({
    category: "COMPLIANCE", action: AUD.UNVERIFIABLE_BASELINE_ACTION, actorId: "officer_drill",
    targetType: null, targetId: null,
    payload: { frontierSeq: census.frontierSeq, count: census.count, digest: census.digest, scanned: census.scanned },
  });
  const v3 = await AUD.verifyChainFull();
  console.log(`  after the baseline (${census.count} row(s), seq <= ${census.frontierSeq}): ${JSON.stringify({ valid: v3.valid, baselined: v3.baselined, unattested: v3.unattested })}`);
  ok("5.2 · a DECLARED, dated, digested legacy population restores `valid` — the mechanism accounts for history instead of ignoring it",
    v3.valid === true && v3.baselined === census.count && (v3.unattested ?? 0) === 0,
    JSON.stringify({ valid: v3.valid, baselined: v3.baselined, unattested: v3.unattested }));
  ok("5.c2 · POSITIVE CONTROL — the baseline row itself verifies and is NOT counted as legacy; the declaration is an ordinary attested row",
    !!baselineEntry.id && (v3.verified ?? 0) > 0 && v3.baseline?.entryId === baselineEntry.id);

  // PLANTED CONTROL — the tamper. An in-place edit ABOVE the frontier.
  // ⛔ THE VICTIM MUST BE WRITTEN AFTER THE BASELINE, and the first version of this drill got that
  // wrong: it edited a row that the baseline had already swallowed, so the finding came back as a
  // DIGEST mismatch and §5.3 measured §5.5's mechanism instead of its own. These six rows are
  // appended now, so every one of them sits above the declared frontier.
  for (let i = 0; i < 6; i++) {
    await AUD.audit({ category: "COMPLIANCE", action: "privacy.dsar.exported", actorId: "officer_after",
      targetType: "User", targetId: `usr_post_${i}`, payload: { drill: "above-the-frontier", i } });
  }
  const victim = (await cli.query(
    `SELECT "id","payload","seq" FROM "AuditLog" WHERE action='privacy.dsar.exported' ORDER BY "seq" DESC LIMIT 1`)).rows[0];
  ok("5.c2b · the row about to be edited really is ABOVE the declared era, or §5.3 would be measuring the digest and not the attestation",
    Number(victim.seq) > census.frontierSeq, `seq ${victim.seq} vs frontier ${census.frontierSeq}`);
  await cli.query(`UPDATE "AuditLog" SET "payload" = jsonb_set("payload", '{i}', '999') WHERE "id" = $1`, [victim.id]);
  const v4 = await AUD.verifyChainFull();
  console.log(`  with one row edited in place: ${JSON.stringify({ valid: v4.valid, unattested: v4.unattested, linkBroken: v4.linkBroken })}`);
  ok("5.3 · PLANTED CONTROL — ONE row edited in place makes `valid` FALSE. This is the exact shape that returned {\"valid\":true,\"unverifiable\":1} before tonight",
    v4.valid === false && v4.unattested === 1 && v4.linkBroken === false,
    JSON.stringify({ valid: v4.valid, unattested: v4.unattested, linkBroken: v4.linkBroken }));
  ok("5.4 · and the verdict SAYS it is an edit, not a removal — an officer must not be told entries were deleted when one was rewritten",
    /do not match|recompute under no known/i.test(String(v4.firstBreakAt ?? "")) && !/removed/i.test(String(v4.firstBreakAt ?? "")),
    String(v4.firstBreakAt ?? ""));
  await cli.query(`UPDATE "AuditLog" SET "payload" = $2::jsonb WHERE "id" = $1`, [victim.id, JSON.stringify(victim.payload)]);
  const v5 = await AUD.verifyChainFull();
  ok("5.c3 · POSITIVE CONTROL — restoring the row's exact bytes makes it valid again, so §5.3 measured the EDIT and not some standing defect",
    v5.valid === true && (v5.unattested ?? 0) === 0, JSON.stringify({ valid: v5.valid, unattested: v5.unattested }));

  // PLANTED CONTROL — an edit BELOW the frontier, inside the baselined set. A count alone cannot see
  // this: the row was already unverifiable.
  const below = (await cli.query(
    `SELECT "id","payload","seq" FROM "AuditLog" WHERE action='planted.one' LIMIT 1`)).rows[0];
  ok("5.c4 · the row about to be edited really is INSIDE the declared era, or the control would be testing the wrong thing",
    Number(below.seq) <= census.frontierSeq, `seq ${below.seq} vs frontier ${census.frontierSeq}`);
  await cli.query(`UPDATE "AuditLog" SET "payload" = '{"tampered":true}'::jsonb WHERE "id" = $1`, [below.id]);
  const v6 = await AUD.verifyChainFull();
  console.log(`  with an ALREADY-unverifiable row edited: ${JSON.stringify({ valid: v6.valid, baselineMismatch: v6.baselineMismatch, baselined: v6.baselined })}`);
  ok("5.5 · PLANTED CONTROL — editing a row that was ALREADY unverifiable is caught by the DIGEST, which a count could never have seen",
    v6.valid === false && v6.baselineMismatch === true && v6.baselined === census.count,
    JSON.stringify({ valid: v6.valid, baselineMismatch: v6.baselineMismatch, baselined: v6.baselined }));
  await cli.query(`UPDATE "AuditLog" SET "payload" = $2::jsonb WHERE "id" = $1`, [below.id, JSON.stringify(below.payload)]);
  ok("5.c5 · POSITIVE CONTROL — restored, the digest matches again",
    (await AUD.verifyChainFull()).valid === true);

  // PLANTED CONTROL — editing the DECLARATION itself, the obvious attack on this design.
  await cli.query(
    `UPDATE "AuditLog" SET "payload" = jsonb_set("payload", '{frontierSeq}', '99999999') WHERE "id" = $1`,
    [baselineEntry.id]);
  const v7 = await AUD.verifyChainFull();
  console.log(`  with the DECLARATION widened by hand: ${JSON.stringify({ valid: v7.valid, unattested: v7.unattested, baselineMismatch: v7.baselineMismatch })}`);
  // ⭐ AND IT CANNOT BE REPAIRED BY RECOMPUTING THE CENSUS, which is the obvious next move for
  // anyone with write access — the digest is keyless on purpose, so that an external auditor can
  // reproduce it. A widened declaration falls INSIDE its own frontier, so its own fingerprint joins
  // the digest it is trying to state: the forger needs a payload whose digest field equals a hash
  // computed over that same payload. That is a preimage loop, not an arithmetic problem.
  ok("5.6 · PLANTED CONTROL — widening the declaration to swallow everything makes the chain INVALID, and the edited declaration cannot vouch for itself",
    v7.valid === false && ((v7.unattested ?? 0) > 0 || v7.baselineMismatch === true),
    JSON.stringify({ valid: v7.valid, unattested: v7.unattested, baselineMismatch: v7.baselineMismatch }));
  await cli.query(`UPDATE "AuditLog" SET "payload" = $2::jsonb WHERE "id" = $1`,
    [baselineEntry.id, JSON.stringify({ frontierSeq: census.frontierSeq, count: census.count, digest: census.digest, scanned: census.scanned })]);
  ok("5.c6 · POSITIVE CONTROL — restored, the declaration is honoured again",
    (await AUD.verifyChainFull()).valid === true);

  // ══ §6 · THE RESIDUAL, STATED ════════════════════════════════════════════════════════════════
  section("═══ §6 · WHAT IS STILL INVISIBLE, MEASURED RATHER THAN CLAIMED ═════════════════════");
  const preTicket = `aud_${Date.now().toString(36)}_zzabcd`;
  const head3 = (await cli.query(`SELECT "entryHash" FROM "AuditLog" ORDER BY "seq" DESC LIMIT 1`)).rows[0];
  await cli.query(
    `INSERT INTO "AuditLog" ("id","category","action","actorId","targetType","targetId","payload","createdAt","prevHash","entryHash")
     VALUES ($1,'SYSTEM','legacy.shape',NULL,NULL,NULL,'{}'::jsonb, now(), $2, $3)`,
    [preTicket, head3.entryHash, `planted_head_${process.pid}_e`]);
  const scanR = await TIX.findAuditTicketGaps({ windowRows: 0 });
  ok("6.1 · a PRE-TICKET row is excluded from the population rather than counted as gap-free — the exclusion is reported, not hidden",
    scanR.scannedRows > scanR.scannedTicketed,
    `${scanR.scannedRows} rows, ${scanR.scannedTicketed} ticketed`);
  console.log(`  ⛔ A TAIL LOSS REMAINS INVISIBLE TO THIS DETECTOR, by construction: a process that dies with`);
  console.log(`     its queue non-empty leaves no ticket above the hole. The mark of that is the ABSENCE of a`);
  console.log(`     system.shutdown_drain row for the boot (audit-drain.ts), and nothing here changes it.`);
  nm("the size of a tail loss", "no durable record of 'N were issued' can exist — the record would itself be in the queue that was lost.");
} finally {
  try { child?.proc.kill(); } catch { /* already gone */ }
  try { if (locker) await locker.end(); } catch { /* already gone */ }
  try { if (cli) await cli.end(); } catch { /* already closed */ }
  // ⚠️ PRISMA LAST AND EXPLICITLY. `DROP DATABASE … WITH (FORCE)` terminates whatever is still
  // attached, and Prisma reports that as a FATAL connection error on the way out — which reads, in
  // a drill's output, exactly like a failure of the thing under test.
  try { (await import("@/lib/server/prisma")).prisma()?.$disconnect(); } catch { /* never connected */ }
  const a2 = new pg.Client({ connectionString: RAW });
  await a2.connect();
  await a2.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  const dbCountAtClose = Number((await a2.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
  await a2.end();
  console.log(`\n  scratch cluster database count at close: ${dbCountAtClose} (was ${dbCountAtOpen} at open)`);
  if (dbCountAtClose !== dbCountAtOpen) {
    console.log(`  ⚠️ the count moved — another lane created or dropped a database while this ran, or this run leaked one.`);
  }
}

console.log(`\n──────────────────────────────────────────────────────────────────────────────`);
console.log(`  audit-hole: ${pass} passed, ${fail} failed${notMeasured ? `, ${notMeasured} NOT MEASURED` : ""}`);
console.log(`──────────────────────────────────────────────────────────────────────────────\n`);
process.exit(fail === 0 ? 0 : 1);
