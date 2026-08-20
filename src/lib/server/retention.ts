/**
 * DATA RETENTION — the periods, and the one chore that enforces them.
 *
 * `docs/DATA-RETENTION.md` is the authority for the whole schedule, including the classes
 * this file does NOT touch (money, audit, KYC decisions — all 7 years under POCA Cap 423
 * §16, all deliberately never deleted). This module holds only the classes that are
 * enforced BY CODE, so a reader can tell enforcement from policy at a glance.
 *
 * ── WHY IT EXISTS (audit F-01, 2026-08-20) ────────────────────────────────────────────
 *
 * `/admin/retention` has published a named nightly chore — `retention.purge.daily` — to
 * whoever reads that page, describing it as purging OTP hashes and sessions on a schedule.
 * The page also said, in smaller type, *"This job is not wired in the current build."*
 * Nothing pruned anything. `Notification` held 2,450 rows going back to 2026-05-30 on
 * production and had no upper bound at all.
 *
 * A published retention schedule that no code enforces is the same class of defect as a
 * privacy policy describing collection that does not happen: the document is not wrong
 * about what we intend, it is wrong about what we do.
 */
import { db } from "./store";
import { audit } from "./audit";

/**
 * 🔴 NOTIFICATION RETENTION IS COUPLED TO THE UP & DOWN DIGEST. Read this before changing it.
 *
 * `db.notification.existsWithHref()` is deliberately unbounded in time — its own comment
 * says the answer "must not become false again simply because time passed" — because it is
 * the ONLY idempotency key for the Up & Down daily digest (E-37). The digest keys on
 * `/updown/history?day=YYYY-MM-DD`, so the day is in the href and the sweep can re-run as
 * often as it likes without telling a player about their day twice.
 *
 * A retention prune deletes exactly the rows that answer is read from. So the period here is
 * not a free choice: it must comfortably exceed the largest window an operator could ask the
 * digest to replay. `runUpDownDailyDigest` defaults to `daysBack = 1`, but the parameter
 * exists precisely so a missed day can be re-sent — and if the notification for that day has
 * been pruned, the replay tells every affected player twice.
 *
 * 180 days, not the 90 the audit proposed, for that reason: it is six months of replay
 * headroom on a parameter whose whole purpose is catching up after an outage. `test:retention`
 * asserts this constant stays greater than `MAX_DIGEST_REPLAY_DAYS`, so the coupling cannot
 * be broken silently by someone tightening the period for disk.
 */
export const NOTIFICATION_RETENTION_DAYS = 180;

/**
 * The largest `daysBack` an operator could reasonably pass to `runUpDownDailyDigest` when
 * replaying missed days after an outage. Not a limit the digest enforces — a bound this
 * module promises to stay clear of.
 */
export const MAX_DIGEST_REPLAY_DAYS = 90;

/**
 * OTP hashes. 30 days from issue — the number already published to the Gaming Board on
 * `/admin/retention`, so this is the figure that makes an existing statement true rather
 * than a new one someone has to be told about.
 *
 * ⚠️ Production has never issued an OTP (`SMS_PROVIDER=console`, zero rows, zero `otp.%`
 * audit actions ever), so this prune deletes nothing today. It is wired anyway: the day SMS
 * is switched on is the wrong day to discover that nothing expires a credential hash.
 */
export const OTP_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionResult = { notifications: number; otps: number };

/**
 * Delete what has aged out. Idempotent, and safe to run as often as the caller likes.
 *
 * ⛔ IT TOUCHES NOTHING FINANCIAL AND NOTHING IN THE AUDIT CHAIN. Transactions, LedgerEntry,
 * Position, Wallet, KycSubmission, KycDocument and AuditLog are all outside its reach by
 * construction — it names the two classes it deletes and cannot reach a third. Money and
 * identity records are kept for 7 years under POCA Cap 423 §16, and the audit chain is
 * append-only: pruning it would break the HMAC links that make it evidence.
 */
export async function runRetentionPass(now = Date.now()): Promise<RetentionResult> {
  const notifBefore = new Date(now - NOTIFICATION_RETENTION_DAYS * DAY_MS).toISOString();
  const otpBefore = new Date(now - OTP_RETENTION_DAYS * DAY_MS).toISOString();

  const notifications = await db.notification.pruneOlderThan(notifBefore);
  const otps = await db.otp.pruneOlderThan(otpBefore);

  // One SYSTEM row per run, under the name the product already published. A retention pass
  // that leaves no trace cannot be shown to have run — which is the question an inspector
  // asks about a retention schedule.
  //
  // ⚠️ Only when it actually deleted something. A daily no-op entry would add ~365 rows a
  // year to an unprunable chain to record that nothing happened (audit F-10).
  if (notifications > 0 || otps > 0) {
    audit({
      category: "SYSTEM",
      action: "retention.purge.daily",
      actorId: null,
      targetType: "Retention",
      targetId: "daily",
      payload: {
        notifications, notificationRetentionDays: NOTIFICATION_RETENTION_DAYS,
        otps, otpRetentionDays: OTP_RETENTION_DAYS,
      },
    });
  }
  return { notifications, otps };
}
