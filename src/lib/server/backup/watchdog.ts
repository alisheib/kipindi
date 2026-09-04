/**
 * Backup watchdog — the alert that ARRIVES, closing the eleven-nights hole.
 *
 * 🔴 THE HISTORY. The nightly backup failed eleven consecutive nights
 * (2026-08-14 → 24). `/admin/compliance` showed the amber `stale` state for ten
 * of them, exactly as designed — and nobody was looking. The fix shipped then
 * was `ops:backup-status`, a tool an operator must REMEMBER TO RUN, so the
 * failure mode was structurally unchanged (docs/BACKUP-RUNBOOK.md "THE ELEVEN
 * NIGHTS").
 *
 * This module is the other half: once a day, on the leader-leased lifecycle
 * pass, it reads the same `backupHealth()` the compliance card renders and, if
 * the answer is anything but `ok`, tells every ADMIN/COMPLIANCE officer through
 * the same bell + Postmark path the Market Sentinel already uses.
 *
 * ⭐ Why in-app rather than a CI `if: failure()` step: a workflow step can only
 * report a job that RAN and failed. GitHub delays schedules (the 00:15 UTC job
 * has finished at 04:36) and silently disables them after 60 days of repo
 * inactivity — the job that never runs never reports. This watchdog fires on
 * the ABSENCE of a good run, which covers failure, throttling and silent
 * disablement alike.
 *
 * Injectable clock / run / notifier so the suite can prove the RED path without
 * waiting 36 hours or seeding a database (50pick-standards §5b: assert the
 * value; prove the gate can fail before trusting its green).
 */
import { loadBackupRun, backupHealth, type BackupHealth, type BackupRun } from "./state";
import { hasDatabase } from "../prisma";

export type BackupAlertDecision = {
  alert: boolean;
  /** Machine-readable kind, mirrors BackupHealth["kind"]. */
  kind: BackupHealth["kind"];
  /** One operator-facing sentence saying what is wrong (empty when healthy). */
  reason: string;
  /** Age of the last verified run in whole hours, when one exists. */
  ageHours: number | null;
};

/** Pure classification → alert decision. Everything but `ok` alerts: a missing,
 *  failed, unverified or stale backup are four different sentences and the same
 *  operator action — go look, tonight, not at month-end. */
export function describeBackupAlert(h: BackupHealth): BackupAlertDecision {
  switch (h.kind) {
    case "ok":
      return { alert: false, kind: h.kind, reason: "", ageHours: Math.round(h.ageMs / 3_600_000) };
    case "none":
      return { alert: true, kind: h.kind, reason: "No backup has ever been recorded — the nightly has never completed against this database.", ageHours: null };
    case "failed":
      return { alert: true, kind: h.kind, reason: `The last backup run FAILED${h.run.error ? ` — ${h.run.error.slice(0, 160)}` : ""}.`, ageHours: null };
    case "unverified":
      return { alert: true, kind: h.kind, reason: "The last backup was written but never restore-verified — a dump nobody restored is not a backup.", ageHours: null };
    case "stale": {
      const hours = Math.round(h.ageMs / 3_600_000);
      return { alert: true, kind: h.kind, reason: `The last verified backup is ${hours} hours old — the nightly has not completed since. GitHub may be delaying, failing, or silently no longer running the schedule.`, ageHours: hours };
    }
  }
}

export type BackupWatchdogResult = { kind: BackupHealth["kind"] | "skipped"; alerted: boolean };

/**
 * Read the last recorded run, classify it, and alert the officers when it is
 * anything but healthy. Called once a day from the lifecycle pass (leader-leased,
 * so exactly one container speaks).
 *
 * Overrides exist for the test suite only; production callers pass nothing.
 */
export async function runBackupWatchdog(overrides?: {
  now?: number;
  run?: BackupRun | null;
  notify?: (opts: { kind: string; reason: string; ageHours: number | null; destination: string | null }) => Promise<void>;
  /** Test seam — production always requires a real database. */
  requireDatabase?: boolean;
}): Promise<BackupWatchdogResult> {
  // The in-memory dev store has no nightly and no officers to wake — a watchdog
  // barking in dev teaches everyone to ignore it in production.
  if ((overrides?.requireDatabase ?? true) && !hasDatabase()) return { kind: "skipped", alerted: false };

  const run = overrides?.run !== undefined ? overrides.run : await loadBackupRun();
  const health = backupHealth(run, overrides?.now ?? Date.now());
  const decision = describeBackupAlert(health);
  if (!decision.alert) return { kind: health.kind, alerted: false };

  const notify = overrides?.notify ?? (async (opts) => {
    const { notifyAdminsBackupUnhealthy } = await import("../notification-service");
    await notifyAdminsBackupUnhealthy(opts);
  });
  await notify({
    kind: decision.kind,
    reason: decision.reason,
    ageHours: decision.ageHours,
    destination: run && "destination" in (run as BackupRun) ? (run as BackupRun).destination : null,
  });
  console.error(`[backup-watchdog] ${decision.kind.toUpperCase()} — ${decision.reason}`);
  return { kind: health.kind, alerted: true };
}
