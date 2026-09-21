/**
 * THE COMPLIANCE-ROW GUARD — the remedy for a lost audit row, pinned so it cannot quietly leave.
 *
 *   npm run test:audit-gap
 *
 * ⛔ WHAT THIS GUARDS, AND WHY THE REMEDY LOOKS LIKE THIS.
 *
 * `market-service.ts:1699` writes the bet's statutory `market.position.opened` row with a BARE,
 * un-awaited `audit({…})`. The append is queued on one process-wide promise chain, and a process
 * that ENDS takes the queue with it. Driven on a scratch cluster (`npm run rehearse:audit-loss-window`
 * and `npm run rehearse:audit-gap`, both re-runnable — no number here is quoted from a report):
 *
 *   · a SIGTERM lost every queued append, because Next's own handler calls `process.exit(143)`
 *     about 30 ms in, long before any grace period matters;
 *   · the HMAC chain cannot see the hole — a lost append consumes no `seq` and breaks no link, so
 *     `verifyChainFull()` returns valid over a chain that is missing rows;
 *   · `auditLog` has only `create` in all of `src/` — no update, no delete — so the row can NEVER
 *     be added later. The hole is permanent.
 *
 * THE REMEDY IS THREE THINGS, AND THIS FILE PINS ALL THREE:
 *   ① `audit-reconcile.ts` — DECLARE what was lost. It cannot restore a row (a late insert would
 *      chain at the current head and date the bet to the sweep), so it appends a chained
 *      `audit.row_missing` register entry instead. §1, §2.
 *   ② the lifecycle chore — run ① on the leader, every five minutes. §3.
 *   ③ the house-bot poller's BOUNDED flush — the engine's tick pays for its own compliance rows so
 *      a deploy mid-fire does not leave a house bet with no record. §4.
 *
 * ⛔ AND ONE REFUSAL, RECORDED HERE ON PURPOSE (§5): the bet's own append stays un-awaited.
 * Awaiting it was MEASURED, not assumed — 50 concurrent bettors would each pay p99 158 ms on an
 * idle loopback cluster with no network and no other traffic, and 283 ms at 100-way concurrency,
 * because the append serialises on a DB-global advisory lock so the wait grows with ALL audit
 * traffic and not just bets. That is a worse defect than the one it closes.
 *
 * ⛔ EVERY ASSERTION HAS A PLANTED CONTROL — a shape the REAL code could contain, which the very
 * same checker must FLAG — and every refusal has a POSITIVE CONTROL: something that must still be
 * ALLOWED. A checker that can only pass is decoration.
 *
 * Exit 1 on any failure; exit 3 if no assertion ran at all.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const code = (rel: string) => decomment(read(rel));

let pass = 0, fail = 0;
const emitted: string[] = [];
function ok(label: string, cond: boolean, detail = ""): boolean {
  emitted.push(label);
  if (cond) { pass++; console.log(`PASS ${label}`); } else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
}
const section = (t: string) => console.log(`\n${t}`);

const RECONCILE = "src/lib/server/audit-reconcile.ts";
const LIFECYCLE = "src/lib/server/lifecycle.ts";
const WORKER = "src/lib/server/house-bot/worker.ts";
const MARKET = "src/lib/server/market-service.ts";

/* ═══ The checkers. Every one is a pure function of source text, so the planted controls below
 *     run the SAME code the real assertions run — never a second, laxer copy. ═══════════════ */

/** The anti-join must exclude BOTH the statutory row and the standing declaration. Checking only
 *  the first would re-declare every known hole on every sweep. */
export const antiJoinsBothActions = (src: string): boolean =>
  /NOT\s+EXISTS/i.test(src)
  && /a\."targetId"\s*=\s*p\."id"/.test(src)
  && /a\."action"\s+IN\s*\(\s*\$\{BET_AUDIT_ACTION\}\s*,\s*\$\{GAP_DECLARED_ACTION\}\s*\)/.test(src);

/** Every `audit(` call in a file must be awaited. Used on the reconciler, where a fire-and-forget
 *  declaration would be the defect declaring itself away. */
export function bareAuditCalls(src: string): number {
  let n = 0;
  const re = /(^|[^\w.$])audit\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index + m[1].length).trimEnd();
    if (/\b(?:export\s+)?function$/.test(before)) continue;   // a declaration, not a call
    if (/\b(?:await|return)$/.test(before)) continue;
    n += 1;
  }
  return n;
}

/** A declaration must go through the chained appender, never straight at the table. */
export const writesTableDirectly = (src: string): boolean => /auditLog\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/.test(src);

/** The chore must be called from the pass AND carry its own catch, like every other chore there. */
export const choreWiredWithOwnCatch = (src: string, fn: string): boolean =>
  new RegExp(`await\\s+${fn}\\(\\)\\s*\\.catch\\(`).test(src);

/** The poller must drain the audit queue before it returns — and never without a deadline. */
export function pollerFlush(src: string): { flushes: boolean; bounded: boolean } {
  const body = src.slice(src.indexOf("export async function pollerPass("));
  const end = body.indexOf("\n}\n");
  const pass = end === -1 ? body : body.slice(0, end);
  const bounded = /await\s+flushAuditWithin\s*\(\s*[A-Za-z0-9_]+\s*\)/.test(pass);
  return { flushes: bounded || /auditFlush\s*\(/.test(pass), bounded };
}

/** The refusal: nothing on the committed-bet path may await its audit append. */
export function awaitedAuditOnBetPath(src: string): boolean {
  const i = src.indexOf("market.position.opened");
  if (i === -1) return false;
  // Look back over the call that contains it — an `await audit({` opening this entry.
  const window = src.slice(Math.max(0, i - 400), i);
  return /await\s+audit\s*\(\s*\{[^}]*$/.test(window);
}

/* ═══ §1 · THE DETECTOR EXISTS AND ASKS THE RIGHT QUESTION ═══════════════════════════════════ */
section("§1 · the detector");
const rec = code(RECONCILE);
console.log(`  POPULATION: ${RECONCILE} — ${rec.split("\n").length} lines of code after comments are stripped`);

ok("1.1 · the reconciler anti-joins the durable Position anchor against BOTH the statutory row and its declaration",
  antiJoinsBothActions(rec));
ok("1.c1 · PLANTED CONTROL — an anti-join that forgets the declaration (and would re-declare every known hole forever) is FLAGGED",
  !antiJoinsBothActions(rec.replace(/a\."action"\s+IN\s*\([^)]*\)/, `a."action" = \${BET_AUDIT_ACTION}`)));

ok("1.2 · the window ends at a GRACE, so an append still in flight is never declared missing",
  /const until = new Date\(nowMs - graceMs\)/.test(rec) && /p\."placedAt"\s+<\s+\$\{untilUtc\}/.test(rec));
ok("1.c2 · PLANTED CONTROL — a window that runs to `now` (declaring bets whose row is merely still queued) is FLAGGED",
  !(/const until = new Date\(nowMs - graceMs\)/.test(rec.replace("new Date(nowMs - graceMs)", "new Date(nowMs)"))));

/** ⛔ THE GRACE IS ONLY A GRACE IF THE COMPARISON IS UTC-ANCHORED. `Position.placedAt` is
 *  `TIMESTAMP(3)` without a time zone and the app writes UTC into it; a bound Date is resolved in
 *  the SESSION's timezone, so on a +03:00 session the ten-minute grace silently became NEGATIVE and
 *  bets whose append was still in flight were reported missing. Measured on a scratch cluster set to
 *  Asia/Beirut, 2026-09-21 — the first run of `rehearse:audit-gap` failed on exactly this. */
const utcAnchored = (src: string): boolean =>
  (src.match(/::timestamptz AT TIME ZONE 'UTC'/g) ?? []).length >= 4
  && /const fromUtc = from\.toISOString\(\)/.test(src) && /const untilUtc = until\.toISOString\(\)/.test(src);
ok("1.2b · every bound instant is anchored to UTC, not to whatever timezone the database session happens to be in",
  utcAnchored(rec));
ok("1.c2b · PLANTED CONTROL — binding the Date straight into the predicate (the shape that made the grace negative on a +03:00 session) is FLAGGED",
  !utcAnchored(rec.replace(/\$\{untilUtc\}::timestamptz AT TIME ZONE 'UTC'/g, "${until}")));

const grace = /RECONCILE_GRACE_MS = ([\d _*]+);/.exec(rec)?.[1] ?? "0";
const graceMs = Function(`"use strict";return (${grace})`)() as number;
ok("1.3 · THE FLOOR — the grace is at least a minute (measured drain of a 50-append burst was ~200 ms on loopback; this is three orders clear)",
  graceMs >= 60_000, `RECONCILE_GRACE_MS = ${graceMs}`);
ok("1.c3 · PLANTED CONTROL — a grace of zero is FLAGGED by the same floor",
  !(0 >= 60_000));

const cap = Number(/RECONCILE_DECLARE_CAP = (\d+);/.exec(rec)?.[1] ?? "0");
ok("1.4 · the per-sweep declaration cap is finite and at least one — a pathological hour cannot flood the chain the bet path shares",
  Number.isFinite(cap) && cap >= 1, `RECONCILE_DECLARE_CAP = ${cap}`);
ok("1.5 · the scan reports its POPULATION, so a sweep over zero positions cannot read as a clean one",
  /scanned: number/.test(rec) && /count\(\*\)::int AS n FROM "Position"/.test(rec));

/* ═══ §2 · THE DECLARATION IS CHAINED, AWAITED, AND HONEST ═══════════════════════════════════ */
section("§2 · the declaration");
ok("2.1 · every audit() call in the reconciler is AWAITED — a fire-and-forget declaration would be lost to the very defect it declares",
  bareAuditCalls(rec) === 0, `${bareAuditCalls(rec)} bare call(s)`);
const plantedBare = rec.replace(/await audit\(\{/, "audit({");
ok("2.c1 · PLANTED CONTROL — a bare `audit({` in the reconciler is FLAGGED",
  bareAuditCalls(plantedBare) === 1, `${bareAuditCalls(plantedBare)} flagged`);
ok("2.c2 · POSITIVE CONTROL — the read-only scan holds no audit call at all, and that is ALLOWED (the checker is not 'one call per file')",
  bareAuditCalls(rec.slice(rec.indexOf("export async function findBetAuditGaps"), rec.indexOf("export async function declareBetAuditGaps"))) === 0);

ok("2.2 · the declaration goes through the chained appender, never straight at the table",
  !writesTableDirectly(rec));
ok("2.c3 · PLANTED CONTROL — an unchained `auditLog.create(` in the reconciler is FLAGGED",
  writesTableDirectly(`${rec}\nawait db.auditLog.create({ data: {} });`));

ok("2.3 · the declaration is recorded as a RECORD OF A MISSING ROW and never as the row itself",
  /action: GAP_DECLARED_ACTION/.test(rec) && /missingAction: BET_AUDIT_ACTION/.test(rec)
  && /not the row/i.test(read(RECONCILE)));
ok("2.4 · it is filed against the bet it names, which is also what makes the sweep self-deduplicating",
  /targetType: "Position"/.test(rec) && /targetId: g\.positionId/.test(rec));

/* ═══ §3 · IT ACTUALLY RUNS — a gate that is not in the pipeline is not a gate ═══════════════ */
section("§3 · the chore runs");
const life = code(LIFECYCLE);
ok("3.1 · the lifecycle pass calls the reconciler, with its own catch, on the per-chore contract",
  choreWiredWithOwnCatch(life, "maybeReconcileBetAudit"));
ok("3.c1 · PLANTED CONTROL — the chore called WITHOUT its own catch (one throw taking the whole ticker down) is FLAGGED",
  !choreWiredWithOwnCatch(life.replace(/await maybeReconcileBetAudit\(\)\s*\.catch\(/, "await maybeReconcileBetAudit("), "maybeReconcileBetAudit"));
ok("3.c2 · POSITIVE CONTROL — the neighbouring chores satisfy the same checker, so §3.1 is reading the real contract and not a spelling",
  choreWiredWithOwnCatch(life, "maybeRunBackupWatchdog") && choreWiredWithOwnCatch(life, "maybeRunRetention"));
ok("3.2 · the chore imports the reconciler and declares (not merely counts)",
  /import\("\.\/audit-reconcile"\)/.test(life) && /declareBetAuditGaps\(/.test(life));
/** The CALL, never the declaration — an empty parameter list makes `maybeX()` a substring of
 *  `maybeX(): Promise<void>`, and reading the declaration would pass this check upside down. */
const leasedChore = (src: string, fn: string): boolean => {
  const lease = src.indexOf("acquireLeadership(LIFECYCLE_TASK)");
  const call = src.indexOf(`await ${fn}().catch(`);
  return lease !== -1 && call !== -1 && lease < call;
};
ok("3.3 · it is leader-leased by construction — the CALL sits inside runLifecyclePass, after the lease that returns early without it",
  leasedChore(life, "maybeReconcileBetAudit"));
ok("3.c3 · PLANTED CONTROL — the same call hoisted ABOVE the lease (every replica declaring at once) is FLAGGED",
  !leasedChore(
    life.replace(/await maybeReconcileBetAudit\(\)\.catch\([^\n]*\n/, "")
        .replace("if (!(await acquireLeadership(LIFECYCLE_TASK)))", "await maybeReconcileBetAudit().catch(() => {});\n  if (!(await acquireLeadership(LIFECYCLE_TASK)))"),
    "maybeReconcileBetAudit"));
ok("3.4 · a quiet sweep still says so on a heartbeat — a silent sweep and a sweep that stopped running must not read alike",
  /AUDIT_GAP_HEARTBEAT_EVERY/.test(life) && /scanned, every one has its compliance row/.test(read(LIFECYCLE)));

/* ═══ §4 · THE HOUSE-BOT TICK PAYS FOR ITS OWN COMPLIANCE ROWS ═══════════════════════════════ */
section("§4 · the bounded flush");
const wk = code(WORKER);
const flush = pollerFlush(wk);
ok("4.1 · the poller's pass drains the audit queue before it returns — the fire runs on a timer inside the container a deploy is about to end",
  flush.flushes);
ok("4.2 · and the drain is BOUNDED — an unbounded wait on a wedged queue would stall claiming, which is the one failure A24 exists to surface",
  flush.bounded);
ok("4.c1 · PLANTED CONTROL — a pass with no flush at all is FLAGGED",
  !pollerFlush(wk.replace(/await flushAuditWithin\([^)]*\);/, "")).flushes);
ok("4.c2 · PLANTED CONTROL — an UNBOUNDED `await auditFlush()` in the pass is flagged as unbounded",
  !pollerFlush(wk.replace(/await flushAuditWithin\([^)]*\);/, "await auditFlush();")).bounded);
ok("4.3 · the budget is a named constant, finite, and no longer than one poller interval",
  /AUDIT_FLUSH_BUDGET_MS = ([\d_]+)/.test(wk)
  && Number(/AUDIT_FLUSH_BUDGET_MS = ([\d_]+)/.exec(wk)![1].replace(/_/g, "")) > 0
  && Number(/AUDIT_FLUSH_BUDGET_MS = ([\d_]+)/.exec(wk)![1].replace(/_/g, "")) <= 2_000);
ok("4.4 · the flush never rejects — a throw here would abort a pass that has already fired real money",
  /auditFlush\(\)\.then\(\(\) => true, \(\) => true\)/.test(wk));
ok("4.5 · the deadline timer is unref'd, so the flush can never hold a finished process open",
  /unref\?\.\(\)/.test(wk));

/* ═══ §5 · THE REFUSAL, AND WHAT MUST STILL BE ALLOWED ═══════════════════════════════════════ */
section("§5 · the refusal — the bet's own append stays un-awaited");
const mkt = code(MARKET);
ok("5.1 · the committed-bet path still writes market.position.opened WITHOUT awaiting it (measured: awaiting costs p99 158 ms at 50-way, 283 ms at 100-way, on idle loopback)",
  !awaitedAuditOnBetPath(mkt));
ok("5.c1 · PLANTED CONTROL — an `await` added to that append is FLAGGED, so §5.1 is reading the real call and not the absence of one",
  awaitedAuditOnBetPath(`const x = 1;\n    await audit({\n      category: "BET",\n      action: "market.position.opened",\n      targetId: c.positionId,`));
ok("5.c2 · POSITIVE CONTROL — an awaited audit() elsewhere is ALLOWED: the reconciler's own declaration must stay awaited, and §5 must not forbid it",
  !awaitedAuditOnBetPath(rec) && bareAuditCalls(rec) === 0);
ok("5.2 · the row is still WRITTEN on the committed path — the refusal is about latency, never about dropping the record",
  /action: "market\.position\.opened"/.test(mkt) && /result\.ok && committed/.test(mkt));
console.log("  ⭐ To retire §5.1 honestly, do not delete it: replace it with a measurement showing the awaited");
console.log("     append's p99 on the bet path, taken the way `rehearse:audit-loss-window` §3.2 takes it.");

/* ═══ §6 · WHY A DECLARATION IS THE ONLY REMEDY AVAILABLE ════════════════════════════════════ */
section("§6 · the hole is permanent");
const srcFiles = (function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
})(join(root, "src"));
console.log(`  POPULATION: ${srcFiles.length} .ts/.tsx file(s) under src/`);
const mutators = srcFiles.filter((f) => /auditLog\.(update|updateMany|upsert|delete|deleteMany)\b/.test(decomment(readFileSync(f, "utf8"))));
ok("6.1 · the audit table is still append-only across every file in src/ — which is WHY a lost row can never be added and a declaration is the only honest remedy",
  mutators.length === 0, mutators.join(", "));
ok("6.c1 · PLANTED CONTROL — an `auditLog.updateMany(` anywhere in that population is FLAGGED",
  /auditLog\.(update|updateMany|upsert|delete|deleteMany)\b/.test(decomment('await prisma()!.auditLog.updateMany({ where: {}, data: {} });')));
ok("6.2 · the detector is reachable by hand for the backfill the periodic sweep cannot reach",
  /findBetAuditGaps/.test(read("scripts/audit-gap-sweep.mts")) && /DRY RUN/.test(read("scripts/audit-gap-sweep.mts")));

/* ═══ ROLL-CALL ═════════════════════════════════════════════════════════════════════════════ */
console.log(`\n${"─".repeat(78)}`);
console.log(`  audit-gap: ${pass} passed, ${fail} failed, ${emitted.length} assertion(s) emitted`);
console.log(`  controls among them: ${emitted.filter((l) => /CONTROL/.test(l)).length}`);
console.log(`${"─".repeat(78)}`);
if (emitted.length === 0) { console.error("!! no assertion ran — a suite over zero passes."); process.exit(3); }
process.exit(fail > 0 ? 1 : 0);
