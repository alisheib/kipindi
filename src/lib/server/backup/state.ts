/**
 * Last-backup state — the ONE thing `/admin/compliance` and `/admin/retention` are
 * allowed to read when they say anything about backups.
 *
 * 🔴 THE HISTORY THIS EXISTS TO PREVENT. Until 2026-07-29 the compliance page
 * rendered a hardcoded green ✓ reading "Auto-snapshot on every mutation ·
 * HMAC-signed · last 12 retained · disk-backed". None of it was real: no script, no
 * snapshot writer, nothing reading `STORE_BACKUP_DIR`. It sat beside the audit-chain
 * card, which DOES read live state, so the fabricated tick borrowed real credibility
 * — on the one screen where an officer, or a regulator over their shoulder, decides
 * whether player balances and the settlement ledger are recoverable.
 *
 * The rule that replaces it: **a backup claim is rendered from a row a script wrote,
 * or it is not rendered.** There is no third option and no static fallback. If
 * nothing has ever run, the card says so — an honest ✗ is a true statement and a
 * green tick is not.
 *
 * Only `scripts/db-verify-backup.mts` writes here, and only AFTER the backup has
 * been restored into a scratch database and its money invariants checked. Taking a
 * dump is not evidence; restoring one is. That is why `verified` exists as a
 * separate field from `ok` — a dump that was written but never proven must never
 * present as a healthy backup.
 */
import { loadConfig, saveConfig } from "../config-store";

export const BACKUP_STATE_KEY = "__BACKUP_LAST_RUN__";

/**
 * How old a verified backup may be before the card stops calling it healthy.
 * The schedule is nightly, so 36 h tolerates one missed run plus clock drift and
 * then goes amber — it does not quietly keep showing green for a week.
 */
export const BACKUP_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export type BackupRun = {
  /** ISO timestamp the run finished. */
  finishedAt: string;
  /** The dump itself completed and passed its own sanity gate. */
  ok: boolean;
  /** It was restored into a scratch database and every invariant held. */
  verified: boolean;
  /** Bytes of the sealed artifact. */
  sizeBytes: number;
  /** Total rows across every table. */
  rows: number;
  /** sha256 of the sealed artifact, so an operator can match a file to this run. */
  sha256: string;
  /** Where the artifact went, e.g. "github-artifact" / "r2://50pick-backups/…". */
  destination: string;
  /** Whether the artifact is encrypted at rest. */
  sealed: boolean;
  /** Populated only on failure; rendered verbatim so nobody has to guess. */
  error?: string;
  /**
   * Problems found in the SOURCE database while verifying — a drifting wallet, a broken
   * audit link — as opposed to problems with the backup.
   *
   * 🔴 These two must never be confused. The first real verification run reported four
   * failures and concluded "DO NOT TRUST THIS BACKUP"; production reported the same four.
   * The artifact was perfect. A backup that faithfully reproduces an unhealthy database
   * is a GOOD backup and a BAD situation, and an operator has to be told which is which —
   * so the run stays `verified: true` and the source's condition is carried here, where
   * `/admin/compliance` renders it as its own warning.
   */
  sourceWarnings?: string[];
};

export type BackupHealth =
  | { kind: "none" }
  | { kind: "failed"; run: BackupRun }
  | { kind: "unverified"; run: BackupRun }
  | { kind: "stale"; run: BackupRun; ageMs: number }
  | { kind: "ok"; run: BackupRun; ageMs: number };

/** Read the last recorded run. Returns null when no backup has ever run. */
export async function loadBackupRun(): Promise<BackupRun | null> {
  return await loadConfig<BackupRun>(BACKUP_STATE_KEY);
}

export async function saveBackupRun(run: BackupRun): Promise<void> {
  await saveConfig(BACKUP_STATE_KEY, run);
}

/**
 * Classify the run for display. `now` is injectable so the gate can test the
 * staleness boundary without waiting 36 hours.
 */
export function backupHealth(run: BackupRun | null, now = Date.now()): BackupHealth {
  if (!run) return { kind: "none" };
  if (!run.ok) return { kind: "failed", run };
  // A dump nobody restored is not a backup. It reports as its own state rather
  // than as either healthy or failed, because both would be lies.
  if (!run.verified) return { kind: "unverified", run };
  const ageMs = now - Date.parse(run.finishedAt);
  if (!Number.isFinite(ageMs) || ageMs > BACKUP_STALE_AFTER_MS) {
    return { kind: "stale", run, ageMs: Number.isFinite(ageMs) ? ageMs : 0 };
  }
  return { kind: "ok", run, ageMs };
}
