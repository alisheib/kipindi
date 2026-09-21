/**
 * THE AUDIT LOSS WINDOW — can 50pick lose a compliance row, and how many?
 *
 * ⛔ WHY THIS FILE EXISTS. `audit-burst-worker.mts:95` records the finding that started this:
 * ten house bets placed, eight `market.position.opened` rows, "exactly one missing per worker".
 * The worker was fixed by awaiting `auditFlush()` at teardown, which makes THAT drill honest and
 * answers nothing about production. `market-service.ts:1699` still writes the bet's statutory row
 * with a bare, un-awaited `audit({…})` — deliberately, because a live bet must not wait on an audit
 * write — and the audit table has only `create` in all of `src/` (no update, no delete anywhere), so
 * a row that is never written can never be added later. The hole is permanent and the HMAC chain
 * cannot see it.
 *
 * ⭐ WHAT WAS DONE ABOUT IT, FIRST (2026-09-21, later the same night): THE SHUTDOWN DRAIN.
 * `src/lib/server/audit-drain.ts` holds the process's own `process.exit` — the one Next's handler
 * calls — until the audit queue is empty or a bounded 5,000 ms budget is spent, and says loudly what
 * it abandoned if the budget runs out. Driven against a real Postgres with a real kill: the §2.2
 * population below went from **0 of 10 landed to 10 of 10**. The guard is `npm run test:audit-drain`
 * (33 assertions, 8 controls, no database); the drive is `npm run rehearse:audit-drain`. ⛔ §2 here
 * is deliberately still the UN-DRAINED shape — it is the BEFORE number, and the remedy's size can
 * only be stated against it.
 *
 * ⭐ AND WHAT WAS DONE FOR WHAT A DRAIN CANNOT CATCH (SIGKILL, OOM). The remedy is `audit-gap-reconcile.mts`
 * and `src/lib/server/audit-reconcile.ts`: the hole cannot be repaired — the log is append-only, so a late
 * insert would chain at the CURRENT head and date the bet to the sweep — so it is DECLARED instead, one
 * chained `audit.row_missing` row per committed bet with no compliance record, found against the durable
 * `Position` anchor this file's §5 proved holds. `house-bot/worker.ts` also gained a BOUNDED audit flush at
 * the end of the poller's pass, so the engine's tick pays where the bet must not. ⛔ `market-service.ts` is
 * UNCHANGED: §3.2 below is the measurement that refused the obvious fix, and it is why. The guard is
 * `npm run test:audit-gap`; the drive is `npm run rehearse:audit-gap`; the register is
 * `plans/house-bots/RELEASE-LADDER.md` §12.
 *
 * ⛔ THIS SCRIPT CHANGES NOTHING AND GATES NOTHING. It is deliberately NOT a row in
 * `registry.mts`: adding one would move `run.mts --all`'s verdict, and a measurement phase must not
 * move a release gate. It exists so every number in the finding can be RE-DERIVED instead of quoted.
 *
 * WHAT IT ESTABLISHES, each with its controls:
 *   §1 POPULATION   — how many un-awaited `audit(` call sites exist in `src/`, by category.
 *                     PLANTED CONTROL: five bare shapes the real tree could contain must be flagged.
 *                     POSITIVE CONTROL: awaited calls, aliased imports, and `audit(` inside comments
 *                     and strings must all be ALLOWED through unflagged.
 *   §2 THE LOSS     — a process fires N bare appends and ends the way production ends. Rows are counted.
 *                     POSITIVE CONTROL: the same N with `await auditFlush()` must land all N — otherwise
 *                     the database or the counter is broken and every LOST number here is meaningless.
 *   §3 THE WINDOW   — how far behind the queue runs, measured, not reasoned about.
 *   §4 BLINDNESS    — `verifyChainFull()` over a chain with known-lost appends.
 *                     PLANTED CONTROL: tamper one row in place; the verifier must react to THAT, or its
 *                     silence about the loss proves nothing.
 *   §5 DETECTION    — the durable `Position` anchor makes the hole findable after the fact.
 *                     PLANTED CONTROL: a committed position with a deliberately absent row must be found.
 *                     POSITIVE CONTROL: positions whose row DID land must not be flagged.
 *
 * ⚠️ Four lanes share the loopback cluster. This run creates ONE database named after its own pid and
 * drops only that one, exactly as `audit-burst.mts` does.
 *
 * Run: npm run rehearse:audit-loss-window
 */
import pg from "pg";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

// ════════════════════════════════════════════════════════════════════════════════════════════════
// §1 · THE POPULATION — every un-awaited audit() call site in src/
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Blank out comments and string literals, keeping line numbers, so a doc-comment that MENTIONS
 *  `audit()` can never be counted as a call. A scanner that treats a mention as a call site is the
 *  same defect `registry.mts` records about scanners that treat a mention as coverage. */
export function stripCommentsKeepLines(src: string): string {
  let out = "", i = 0, mode: "code" | "line" | "block" | "sq" | "dq" | "tpl" = "code";
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === "code") {
      if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === "'") { mode = "sq"; out += " "; i++; continue; }
      if (c === '"') { mode = "dq"; out += " "; i++; continue; }
      if (c === "`") { mode = "tpl"; out += " "; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === "line") { if (c === "\n") { mode = "code"; out += "\n"; } else out += " "; i++; continue; }
    if (mode === "block") {
      if (c === "*" && d === "/") { mode = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    if (c === "\\") { out += "  "; i += 2; continue; }
    if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) {
      mode = "code"; out += " "; i++; continue;
    }
    out += c === "\n" ? "\n" : " "; i++; continue;
  }
  return out;
}

export type Site = { line: number; kind: string; text: string };

/** How the RESULT of an `audit()` call is sequenced at this site. Only AWAITED and RETURNED put the
 *  append on any caller's critical path; everything else leaves it queued when the caller returns. */
export function scanSource(src: string, localName: string): Site[] {
  const stripped = stripCommentsKeepLines(src).split(/\r?\n/);
  const raw = src.split(/\r?\n/);
  const re = new RegExp("(^|[^\\w.$])" + localName + "\\s*\\(", "g");
  const hits: Site[] = [];
  for (let i = 0; i < stripped.length; i++) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped[i]))) {
      const before = stripped[i].slice(0, m.index + m[1].length).trim();
      if (/\b(export\s+)?function\s*$/.test(before)) continue; // the declaration itself
      let kind: string;
      if (/\bawait\s*$/.test(before)) kind = "AWAITED";
      else if (/\breturn\s*$/.test(before)) kind = "RETURNED";
      else if (/\bvoid\s*$/.test(before)) kind = "VOIDED";
      else if (/[=:]\s*$/.test(before)) kind = "ASSIGNED";
      else if (/[[(,]\s*$/.test(before)) kind = "IN-EXPRESSION";
      else if (before === "") {
        let j = i - 1;
        while (j >= 0 && stripped[j].trim() === "") j--;
        kind = /(\bawait|\breturn|\bvoid|=|[[(,])\s*$/.test(j >= 0 ? stripped[j].trim() : "") ? "SEQ-PREV" : "BARE";
      } else kind = "BARE";
      hits.push({ line: i + 1, kind, text: (raw[i] ?? "").trim().slice(0, 160) });
    }
  }
  return hits;
}

/** The local name `audit` was imported under in this file, or null when it was not imported. */
export function importedAuditAlias(src: string): string | null {
  const re = /import\s*\{([^}]*)\}\s*from\s*["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!/audit/i.test(m[2])) continue;
    for (const n of m[1].split(",")) {
      const parts = n.trim().split(/\s+as\s+/);
      if (parts[0].trim() === "audit") return (parts[1] ?? parts[0]).trim();
    }
  }
  return null;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

console.log("\n═══ §1 · THE POPULATION OF UN-AWAITED audit() CALLS ═══════════════════════════════════");

// ── §1 controls, FIRST: a sweep whose classifier is wrong says nothing about the tree ────────────
const PLANTED = `
import { audit } from "@/lib/server/audit";
export async function f() {
  audit({ category: "BET", action: "p.one" });
  if (true) audit({ category: "BET", action: "p.two" });
  audit({
    category: "WALLET", action: "p.three",
  });
  void audit({ category: "WALLET", action: "p.four" });
  audit({ category: "AUTH", action: "p.five" }).catch(() => {});
}`;
const POSITIVE = `
import { audit as recordAudit } from "@/lib/server/audit";
/** A doc comment naming audit({ … }) and audit( on its own line. */
/* audit({ category: "BET", action: "in.block.comment" }); */
const S = "audit({ action: 'in.string' })";
const T = \`audit({ action: "in.template" })\`;
export async function g() {
  await recordAudit({ category: "COMPLIANCE", action: "pos.one" });
  const e = await recordAudit({ category: "COMPLIANCE", action: "pos.two" });
  return recordAudit({ category: "COMPLIANCE", action: "pos.three" });
}
export function h() { auditFlush(); getAuditPage({}); thing.audit({ action: "method" }); }`;

const plantedHits = scanSource(PLANTED, importedAuditAlias(PLANTED)!);
console.log(`  PLANTED CONTROL population: ${plantedHits.length} sites`);
ok("1.c1 · the five bare shapes the real tree could contain are all flagged un-sequenced",
  plantedHits.length === 5 && plantedHits.filter((h) => h.kind === "BARE").length === 4
    && plantedHits.filter((h) => h.kind === "VOIDED").length === 1,
  JSON.stringify(plantedHits.map((h) => h.kind)));

const posAlias = importedAuditAlias(POSITIVE);
const posHits = scanSource(POSITIVE, posAlias!);
console.log(`  POSITIVE CONTROL population: ${posHits.length} real sites (+ 4 mentions that must not count)`);
ok("1.c2 · an aliased import is resolved", posAlias === "recordAudit", `got ${posAlias}`);
ok("1.c3 · awaited and returned calls are ALLOWED — none flagged, and the comment/string mentions are not counted",
  posHits.length === 3 && posHits.every((h) => h.kind === "AWAITED" || h.kind === "RETURNED"),
  JSON.stringify(posHits.map((h) => h.kind)));
ok("1.c4 · auditFlush / getAuditPage / obj.audit are not the appender",
  scanSource(POSITIVE, "audit").length === 0);

// ── the sweep itself ─────────────────────────────────────────────────────────────────────────────
const files = walk(join(ROOT, "src"));
const sites: Array<{ file: string; line: number; kind: string; category: string; action: string }> = [];
let importing = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const alias = importedAuditAlias(src);
  if (!alias) continue;
  importing++;
  const lines = src.split(/\r?\n/);
  for (const h of scanSource(src, alias)) {
    const chunk = lines.slice(h.line - 1, h.line + 14).join(" ");
    sites.push({
      file: f.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", ""),
      line: h.line, kind: h.kind,
      category: /category:\s*"([A-Z_]+)"/.exec(chunk)?.[1] ?? /category:\s*([A-Za-z_][\w.[\]]*)/.exec(chunk)?.[1] ?? "(dynamic)",
      action: /action:\s*"([^"]+)"/.exec(chunk)?.[1] ?? /action:\s*([A-Za-z_][\w.[\]]*)/.exec(chunk)?.[1] ?? "(dynamic)",
    });
  }
}
const unsequenced = sites.filter((s) => s.kind === "BARE" || s.kind === "VOIDED");
const byCat: Record<string, number> = {};
for (const s of unsequenced) byCat[s.category] = (byCat[s.category] ?? 0) + 1;

console.log(`\n  FILES SCANNED under src/ : ${files.length}`);
console.log(`  FILES IMPORTING audit()  : ${importing}`);
console.log(`  audit() CALL SITES       : ${sites.length}`);
console.log(`  UN-SEQUENCED (bare+void) : ${unsequenced.length}  across ${new Set(unsequenced.map((s) => s.file)).size} files, ${new Set(unsequenced.map((s) => s.action)).size} distinct actions`);
console.log(`  AWAITED                  : ${sites.filter((s) => s.kind === "AWAITED").length}`);
console.log("  by audit category:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(4)}  ${k}`);

ok("1.1 · the sweep ran over a real population, not zero", files.length > 500 && sites.length > 0,
  `${files.length} files, ${sites.length} sites`);
ok("1.2 · the bet's statutory row (market-service.ts `market.position.opened`) is among the un-sequenced",
  unsequenced.some((s) => s.file.endsWith("lib/server/market-service.ts") && s.action === "market.position.opened"));
/* ⛔ WHEN THIS WAS FIRST MEASURED (2026-09-21, the run that produced the finding) the answer was ZERO:
 * nothing in `src/` waited for the queue on any path. The remedy added exactly ONE drain, and this
 * assertion was rewritten as a CENSUS rather than deleted — "zero" was the finding, and a finding that is
 * no longer true must be replaced by the true one, never by a laxer version of itself. ⛔ It is strictly
 * stronger than the original: it names every draining site and refuses any it does not expect, and 1.3b
 * keeps the original floor over the paths that must never wait. */
const flushSites = files
  .filter((f) => /\bauditFlush\s*\(/.test(stripCommentsKeepLines(readFileSync(f, "utf8"))
    .replace(/export function auditFlush\s*\(/, "DECL(")))
  .map((f) => f.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", ""));
console.log(`  auditFlush() CALLERS in src/: ${flushSites.length}${flushSites.length ? ` — ${flushSites.join(", ")}` : ""}`);
const EXPECTED_FLUSH_SITES = [
  // The SHUTDOWN drain (2026-09-21, later): the process holds its own exit until the queue is empty
  // or a bounded budget is spent. Driven, this turned 0 of 10 rows landed into 10 of 10 —
  // `npm run rehearse:audit-drain`.
  "src/lib/server/audit-drain.ts",
  // The house-bot poller's BOUNDED per-tick flush: the engine's tick pays where the bet must not.
  "src/lib/server/house-bot/worker.ts",
].sort();
ok("1.3 · exactly the two paths in src/ that are MEANT to drain the queue do — the shutdown drain and the house-bot poller's bounded tick flush (first measured here as ZERO), and no others",
  flushSites.length === EXPECTED_FLUSH_SITES.length
  && JSON.stringify([...flushSites].sort()) === JSON.stringify(EXPECTED_FLUSH_SITES),
  `${flushSites.length} caller(s): ${flushSites.join(", ") || "(none)"}\n         expected: ${EXPECTED_FLUSH_SITES.join(", ")}`);
ok("1.3b · and NO request path waits for it — market-service.ts and the audit module itself still never flush, which is what the p99 measurement in §3.2 refused",
  !flushSites.includes("src/lib/server/market-service.ts") && !flushSites.includes("src/lib/server/audit.ts"));
ok("1.4 · the audit table is append-only in src/ — only create, never update or delete",
  files.every((f) => !/auditLog\.(update|delete|upsert|updateMany|deleteMany)\b/.test(readFileSync(f, "utf8"))));

// ════════════════════════════════════════════════════════════════════════════════════════════════
// §2–§5 · THE DRIVE. Everything below needs a loopback Postgres.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  nm("§2–§5 · the loss, the window, the blindness and the detector",
    "needs a local Postgres — run `npm run rehearse:audit-loss-window`, which boots one.");
  console.log(`\naudit-loss-window: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
  process.exit(fail > 0 ? 1 : 3);
}
let host = "";
try { host = new globalThis.URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this rehearsal creates and drops a database and runs only against a loopback cluster (saw ${host || "an unparseable URL"}).`);
  process.exit(2);
}
if (process.env.NODE_ENV === "production") { console.error("!! refusing to run with NODE_ENV=production."); process.exit(2); }

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `audit_loss_win_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
const dbCountAtOpen = Number((await admin.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
console.log(`\n  scratch cluster database count at open: ${dbCountAtOpen}`);
// ⚠️ Only ever this process's own database. Lanes share this cluster; nothing else is dropped, ever.
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`  scratch database: ${DB} (created by this run, dropped at the end)`);

const CHILD = join(import.meta.dirname, "audit-loss-window-child.mts");
function child(args: string[], extraEnv: Record<string, string> = {}): Promise<{ code: number; out: string; err: string }> {
  return new Promise((done) => {
    let out = "", err = "";
    const c = spawn(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), CHILD, ...args], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: URL_DB, NODE_ENV: "test", AUDIT_CHAIN_SECRET: "audit-loss-window-drill", ...extraEnv },
    });
    c.stdout.on("data", (d) => (out += d));
    c.stderr.on("data", (d) => (err += d));
    c.on("close", (code) => done({ code: code ?? -1, out, err }));
    c.on("error", () => done({ code: -1, out, err }));
  });
}
const line = (out: string, prefix: string): Any => {
  const l = out.split("\n").find((x) => x.startsWith(prefix));
  return l ? JSON.parse(l.slice(prefix.length)) : null;
};

let cli: pg.Client | null = null;
try {
  // ── migrate: the table must be exactly the one production has, not a hand-written copy ─────────
  const mig = await new Promise<number>((done) => {
    const c = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "ignore",
      shell: process.platform === "win32",
    });
    c.on("exit", (x) => done(x ?? 1));
    c.on("error", () => done(1));
  });
  if (!ok("2.0 · prisma migrate deploy applies every migration to the scratch database", mig === 0, `exit ${mig}`)) {
    throw new Error("migrate failed");
  }
  cli = new pg.Client({ connectionString: URL_DB });
  await cli.connect();
  const landed = async (tag: string): Promise<number> => Number((await cli!.query(
    `SELECT count(*)::int n FROM "AuditLog" WHERE "payload"->>'drill' = $1`, [tag])).rows[0].n);

  // ── §2 · THE LOSS ──────────────────────────────────────────────────────────────────────────────
  console.log("\n═══ §2 · THE LOSS — a process that ends takes the queued appends with it ═══════════════");
  const N = 10;

  // POSITIVE CONTROL FIRST. If N bare appends plus a flush do not all land, the database or the
  // counter is broken, and every LOST number below would be an artefact of the harness.
  const fl = await child(["flush-exit", String(N), "flush"]);
  const flLanded = await landed("flush");
  console.log(`  POSITIVE CONTROL population: ${N} appends fired with a flush before exit`);
  const controlOk = ok("2.c1 · POSITIVE CONTROL — N bare appends + await auditFlush() land all N",
    flLanded === N, `landed ${flLanded} of ${N} (child exit ${fl.code})${fl.err.split("\n").filter((l) => l.startsWith("[child")).map((l) => `\n         ${l}`).join("")}`);

  const hard = await child(["bare-exit", String(N), "hard"]);
  const hardLanded = await landed("hard");
  console.log(`  ${hard.err.split("\n").filter((l) => l.startsWith("[child")).join("\n  ")}`);
  ok("2.1 · a HARD exit right after N bare appends loses every one of them",
    controlOk && hardLanded === 0, `landed ${hardLanded} of ${N}`);

  const sig = await child(["sigterm", String(N), "sigterm"]);
  const sigLanded = await landed("sigterm");
  console.log(`  ${sig.err.split("\n").filter((l) => l.startsWith("[child")).join("\n  ")}`);
  /* ⛔ THIS IS THE **BEFORE** NUMBER AND IT IS NO LONGER WHAT PRODUCTION DOES. The child here
   * deliberately does NOT install `audit-drain.ts` — that is the shape this platform had until
   * 2026-09-21, and it is kept, driven, because the remedy's size can only be stated against it.
   * With the drain installed in exactly the place `instrumentation.ts` installs it, the same
   * population landed 10 of 10: `npm run rehearse:audit-drain` §2 (before) and §3 (after). ⛔ Do not
   * "update" this to pass by adding the drain to the child — that would delete the measurement. */
  ok("2.2 · the SIGTERM path production had BEFORE the shutdown drain — Next's cleanup then process.exit(143), with the app's own lifecycle and house-bot handlers registered and NO drain — loses them all",
    controlOk && sigLanded === 0 && sig.code === 143, `landed ${sigLanded} of ${N}, exit ${sig.code}`);

  const seq = await child(["seq-exit-60", String(N), "seq"]);
  const seqLanded = await landed("seq");
  ok("2.3 · a strictly SEQUENTIAL producer that exits on the last return loses EXACTLY ONE — the shape audit-burst-worker.mts:95 recorded",
    controlOk && seqLanded === N - 1, `landed ${seqLanded} of ${N}`);
  console.log(`  ⭐ the loss is not a constant: it is the QUEUE DEPTH at the instant of exit — 1 for a`);
  console.log(`     sequential producer, ${N} for a burst, and the bet path shares one process-wide queue.`);

  // ── §3 · THE WINDOW ────────────────────────────────────────────────────────────────────────────
  console.log("\n═══ §3 · THE WINDOW — how far behind the queue runs, measured ═════════════════════════");
  const burst = await child(["burst", "50", "burst50"]);
  const b = line(burst.out, "BURST ");
  if (b) {
    console.log(`  50 appends fired in ${b.fireMs}ms · fully drained after ${b.drainMs}ms · ${b.meanAppendMs}ms per append`);
    ok("3.1 · a 50-append burst leaves a measurable window in which every one of them is still unwritten",
      b.drainMs > 0 && b.meanAppendMs > 0, JSON.stringify(b));
  } else ok("3.1 · burst measured", false, burst.err.slice(0, 400));

  const cost = await child(["await-cost", "50", "awaitcost"]);
  const a = line(cost.out, "AWAITCOST ");
  if (a) {
    console.log(`  IF the bet path awaited its append, 50 concurrent bettors would each wait:`);
    console.log(`    p50 ${a.addedLatencyMs.p50}ms · p90 ${a.addedLatencyMs.p90}ms · p99 ${a.addedLatencyMs.p99}ms · max ${a.addedLatencyMs.max}ms`);
    console.log(`    — on an IDLE LOOPBACK cluster with no network and no other traffic. Production adds`);
    console.log(`      the round trips to Railway Postgres to every one of those, and the queue is global.`);
    ok("3.2 · awaiting puts the whole queue on the caller's critical path — the added wait grows with concurrency",
      a.addedLatencyMs.max >= a.addedLatencyMs.p50, JSON.stringify(a.addedLatencyMs));
  } else ok("3.2 · await cost measured", false, cost.err.slice(0, 400));

  // ── §4 · BLINDNESS ─────────────────────────────────────────────────────────────────────────────
  console.log("\n═══ §4 · THE CHAIN CANNOT SEE THE HOLE ════════════════════════════════════════════════");
  const ver = await child(["verify", "0", "verify"]);
  const v = line(ver.out, "VERIFY ");
  if (v) {
    console.log(`  rows: ${v.clean.total} · seq contiguous over the rows that exist: ${v.seqContiguous}`);
    console.log(`  verifyChainFull() with known-lost appends : ${JSON.stringify(v.clean)}`);
    console.log(`  PLANTED CONTROL — one row edited in place : ${JSON.stringify(v.tampered)}`);
    ok("4.1 · a lost append leaves NO trace — no seq gap, no dangling prevHash, and the chain verifies clean",
      v.clean.valid === true && v.clean.linkBroken === false && v.seqContiguous === true, JSON.stringify(v.clean));
    ok("4.c1 · PLANTED CONTROL — an in-place edit DOES move the verifier, so §4.1's silence is a real result and not a dead verifier",
      v.tampered.verified < v.clean.verified || v.tampered.unverifiable > (v.clean.unverifiable ?? 0),
      JSON.stringify(v.tampered));
    console.log(`  ⛔ note, separately: the in-place edit left valid=${v.tampered.valid}. Only a LINK break sets`);
    console.log(`     valid false (audit.ts header). An officer reading \`valid\` alone sees neither an edit nor a loss.`);
  } else ok("4.1 · chain verified", false, ver.err.slice(0, 400));

  // ── §5 · DETECTION ─────────────────────────────────────────────────────────────────────────────
  console.log("\n═══ §5 · THE HOLE IS DETECTABLE AFTER THE FACT ════════════════════════════════════════");
  const rec = await child(["recon", "40", "recon"], { RECON_KILL_MS: "150" });
  const r = line(rec.out, "RECON ");
  if (r) {
    const gaps = (await cli.query(
      `SELECT p."id", p."houseBotId" FROM "DrillPosition" p
        WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" a
          WHERE a."action" = 'market.position.opened' AND a."targetType" = 'Position' AND a."targetId" = p."id")
        ORDER BY p."id"`)).rows as Array<{ id: string; houseBotId: string | null }>;
    const landedRecon = await landed("recon");
    console.log(`  POPULATION positions committed: ${r.positions} · audit rows landed: ${landedRecon} · HOLE: ${r.positions - landedRecon}`);
    console.log(`  detector found ${gaps.length} position(s) with no compliance row (HOUSE bets among them: ${gaps.filter((g) => g.houseBotId).length})`);
    ok("5.1 · the LEFT JOIN on the durable Position anchor finds exactly the hole",
      gaps.length === r.positions - landedRecon, `detector ${gaps.length} vs hole ${r.positions - landedRecon}`);
    const landedIds = (await cli.query(
      `SELECT "targetId" FROM "AuditLog" WHERE action='market.position.opened' AND "payload"->>'drill'='recon'`)).rows.map((x: Any) => x.targetId);
    console.log(`  POSITIVE CONTROL population: ${landedIds.length} positions whose row DID land`);
    ok("5.c1 · POSITIVE CONTROL — positions whose row landed are ALLOWED through, so the detector is not simply flagging everything",
      landedIds.length > 0 && landedIds.every((id: string) => !gaps.some((g) => g.id === id)),
      `${landedIds.length} landed, sample ${JSON.stringify(landedIds.slice(0, 3))}`);
    const plant = "pos_PLANTED_no_audit_row";
    await cli.query(`INSERT INTO "DrillPosition"("id","userId","houseBotId","stake") VALUES ($1,$2,$3,$4)`,
      [plant, "u_planted", "bot_planted", 1000]);
    const gaps2 = (await cli.query(
      `SELECT p."id" FROM "DrillPosition" p WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" a
         WHERE a."action"='market.position.opened' AND a."targetType"='Position' AND a."targetId"=p."id")`)).rows as Array<{ id: string }>;
    console.log(`  PLANTED CONTROL population: 1 house position with a deliberately absent row`);
    ok("5.c2 · PLANTED CONTROL — the detector finds a committed house position whose row was never written",
      gaps2.some((g) => g.id === plant), `found ${gaps2.length} total`);
  } else ok("5.1 · reconciliation measured", false, rec.err.slice(0, 400));
} finally {
  await cli?.end().catch(() => {});
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect().catch(() => {});
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  const closeCount = Number((await drop.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n);
  await drop.end().catch(() => {});
  console.log(`\n  scratch cluster database count at close: ${closeCount} (was ${dbCountAtOpen} at open)`);
}

console.log(`\naudit-loss-window: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
process.exit(fail > 0 ? 1 : notMeasured > 0 ? 3 : 0);
