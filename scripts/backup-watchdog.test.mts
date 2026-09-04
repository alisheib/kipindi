/**
 * Backup watchdog — proof the alert fires when it must and stays silent when it
 * must not. The discrimination IS the control: a watchdog that alerts on a
 * fresh backup cries wolf and gets filtered; one that stays quiet on a stale
 * backup is THE ELEVEN NIGHTS again (docs/BACKUP-RUNBOOK.md). Both directions
 * are asserted here with an injected clock — nobody waits 36 hours.
 */
import { backupHealth, type BackupRun } from "../src/lib/server/backup/state.ts";
import { describeBackupAlert, runBackupWatchdog } from "../src/lib/server/backup/watchdog.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const T0 = Date.parse("2026-09-01T00:00:00.000Z");
const H = 3_600_000;
function mkRun(over: Partial<BackupRun> = {}): BackupRun {
  return {
    finishedAt: new Date(T0).toISOString(),
    ok: true, verified: true, sizeBytes: 32_000_000, rows: 360_000,
    sha256: "deadbeef", destination: "r2://50pick-backups/test", sealed: true,
    ...over,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// A · classification boundaries — the 36 h line, both sides of it.
// ════════════════════════════════════════════════════════════════════════════
{
  ok("A: 35h old is ok", backupHealth(mkRun(), T0 + 35 * H).kind === "ok");
  ok("A: 37h old is stale", backupHealth(mkRun(), T0 + 37 * H).kind === "stale");
  ok("A: ok:false is failed", backupHealth(mkRun({ ok: false }), T0 + H).kind === "failed");
  ok("A: verified:false is unverified", backupHealth(mkRun({ verified: false }), T0 + H).kind === "unverified");
  ok("A: no run ever is none", backupHealth(null, T0).kind === "none");
}

// ════════════════════════════════════════════════════════════════════════════
// B · decision — everything but ok alerts, with a sentence that says why.
// ════════════════════════════════════════════════════════════════════════════
{
  const okD = describeBackupAlert(backupHealth(mkRun(), T0 + H));
  ok("B: healthy does NOT alert", okD.alert === false);
  const stale = describeBackupAlert(backupHealth(mkRun(), T0 + 37 * H));
  ok("B: stale alerts", stale.alert === true);
  ok("B: stale carries the age in hours", stale.ageHours === 37, `ageHours=${stale.ageHours}`);
  ok("B: stale reason names the hours", stale.reason.includes("37 hours"), stale.reason);
  for (const [label, h] of [
    ["failed", backupHealth(mkRun({ ok: false, error: "pg_dump exited 1" }), T0 + H)],
    ["unverified", backupHealth(mkRun({ verified: false }), T0 + H)],
    ["none", backupHealth(null, T0)],
  ] as const) {
    const d = describeBackupAlert(h);
    ok(`B: ${label} alerts with a reason`, d.alert === true && d.reason.length > 10, d.reason);
  }
  const failedD = describeBackupAlert(backupHealth(mkRun({ ok: false, error: "pg_dump exited 1" }), T0 + H));
  ok("B: failed reason carries the recorded error", failedD.reason.includes("pg_dump exited 1"), failedD.reason);
}

// ════════════════════════════════════════════════════════════════════════════
// C · the watchdog end-to-end with a spy notifier — fires stale, silent fresh.
// ════════════════════════════════════════════════════════════════════════════
{
  const calls: Array<{ kind: string; reason: string; ageHours: number | null; destination: string | null }> = [];
  const spy = async (o: (typeof calls)[number]) => { calls.push(o); };

  const stale = await runBackupWatchdog({ now: T0 + 40 * H, run: mkRun(), notify: spy, requireDatabase: false });
  ok("C: stale run → alerted", stale.alerted === true && stale.kind === "stale");
  ok("C: notifier called exactly once", calls.length === 1, `calls=${calls.length}`);
  ok("C: notifier told the kind", calls[0]?.kind === "stale");
  ok("C: notifier told the age", calls[0]?.ageHours === 40, `ageHours=${calls[0]?.ageHours}`);
  ok("C: notifier told the destination", calls[0]?.destination === "r2://50pick-backups/test");

  const fresh = await runBackupWatchdog({ now: T0 + 2 * H, run: mkRun(), notify: spy, requireDatabase: false });
  ok("C: fresh run → silent", fresh.alerted === false && fresh.kind === "ok");
  ok("C: notifier NOT called again on healthy", calls.length === 1, `calls=${calls.length}`);

  const never = await runBackupWatchdog({ now: T0, run: null, notify: spy, requireDatabase: false });
  ok("C: no run ever → alerted none", never.alerted === true && never.kind === "none");
  ok("C: notifier called for none", calls.length === 2);
}

// ════════════════════════════════════════════════════════════════════════════
// D · dev-boot guard — with no real database the watchdog stays out of the way
//     (this test env has no DATABASE_URL, which is exactly the state under test).
// ════════════════════════════════════════════════════════════════════════════
{
  if (process.env.DATABASE_URL) {
    console.log("D: SKIPPED — DATABASE_URL present in this environment, the skip branch is not drivable");
  } else {
    const calls: unknown[] = [];
    const r = await runBackupWatchdog({ now: T0 + 40 * H, run: mkRun(), notify: async (o) => { calls.push(o); } });
    ok("D: no database → skipped, even with a stale run in hand", r.kind === "skipped" && r.alerted === false);
    ok("D: notifier untouched", calls.length === 0);
  }
}

console.log(`SUMMARY: ${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
