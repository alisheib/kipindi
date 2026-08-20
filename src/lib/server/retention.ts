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
import { aiPollStore } from "./ai-poll-generation";

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

/**
 * AI poll PAYLOADS. 30 days from generation — audit F-09.
 *
 * ⛔ THIS ONE DELETES NO ROW, AND THE DISTINCTION IS THE WHOLE DESIGN. An `AIPoll` row is a
 * DECISION record: which category was asked for, what was generated, what an officer approved
 * or rejected and why, what it cost, and whether it became a live market. None of that goes.
 * What goes is the two bulk columns nothing reads after the fact — `rawResponse` (the
 * provider's verbatim reply) and `generation` (the parsed object it was built from).
 *
 * 📏 Measured read-only on production 2026-08-21: 621 rows / 8,432 kB, of which `rawResponse`
 * is 4.45 MB and `generation` 1.19 MB. **494 rows are already older than 30 days and carry
 * 4.41 MB between them** — a little over half the table, for two columns that answer a
 * question nobody asks about a month-old generation.
 *
 * ⚠️ 30 days, not 180 like the notifications, because the audience is different: `rawResponse`
 * exists so a reviewer can see why a generation FAILED, and that review happens within days or
 * never. `docs/DATA-RETENTION.md` §1 carries the row.
 */
export const AIPOLL_PAYLOAD_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionResult = {
  notifications: number;
  otps: number;
  /** Rows whose `rawResponse` was replaced by the tombstone. */
  aiPollRawResponses: number;
  /** Rows whose `generation` was nulled. */
  aiPollGenerations: number;
};

/**
 * Delete what has aged out. Idempotent, and safe to run as often as the caller likes.
 *
 * ⛔ IT TOUCHES NOTHING FINANCIAL AND NOTHING IN THE AUDIT CHAIN. Transactions, LedgerEntry,
 * Position, Wallet, KycSubmission, KycDocument and AuditLog are all outside its reach by
 * construction — it names the three classes it touches and cannot reach a fourth. Money and
 * identity records are kept for 7 years under POCA Cap 423 §16, and the audit chain is
 * append-only: pruning it would break the HMAC links that make it evidence.
 *
 * ⚠️ TWO OF THE THREE DELETE ROWS; THE THIRD DOES NOT. The AI-poll pass blanks two payload
 * COLUMNS and leaves every row and every decision field in place. That difference is reported
 * separately in the result and in the audit payload rather than folded into one "pruned"
 * number, because "we deleted 494 AI polls" and "we blanked a column on 494 AI polls" are very
 * different sentences to have to say to somebody.
 */
export async function runRetentionPass(now = Date.now()): Promise<RetentionResult> {
  const notifBefore = new Date(now - NOTIFICATION_RETENTION_DAYS * DAY_MS).toISOString();
  const otpBefore = new Date(now - OTP_RETENTION_DAYS * DAY_MS).toISOString();

  const aiPollBefore = new Date(now - AIPOLL_PAYLOAD_RETENTION_DAYS * DAY_MS).toISOString();

  const notifications = await db.notification.pruneOlderThan(notifBefore);
  const otps = await db.otp.pruneOlderThan(otpBefore);
  // ⛔ Best-effort, and deliberately last. A failure here must not stop the two classes above
  // from being pruned — those are the ones with a published period against them.
  const aiPolls = await aiPollStore.prunePayloads(aiPollBefore)
    .catch((err) => {
      console.error("[retention] AI poll payload prune failed:", (err as Error)?.message ?? err);
      return { rawResponses: 0, generations: 0 };
    });

  // One SYSTEM row per run, under the name the product already published. A retention pass
  // that leaves no trace cannot be shown to have run — which is the question an inspector
  // asks about a retention schedule.
  //
  // ⚠️ Only when it actually deleted something. A daily no-op entry would add ~365 rows a
  // year to an unprunable chain to record that nothing happened (audit F-10).
  if (notifications > 0 || otps > 0 || aiPolls.rawResponses > 0 || aiPolls.generations > 0) {
    audit({
      category: "SYSTEM",
      action: "retention.purge.daily",
      actorId: null,
      targetType: "Retention",
      targetId: "daily",
      payload: {
        notifications, notificationRetentionDays: NOTIFICATION_RETENTION_DAYS,
        otps, otpRetentionDays: OTP_RETENTION_DAYS,
        // Named for what happened to them. `aiPollsDeleted` would be a lie: no row went.
        aiPollRawResponsesBlanked: aiPolls.rawResponses,
        aiPollGenerationsBlanked: aiPolls.generations,
        aiPollPayloadRetentionDays: AIPOLL_PAYLOAD_RETENTION_DAYS,
      },
    });
  }
  return {
    notifications, otps,
    aiPollRawResponses: aiPolls.rawResponses,
    aiPollGenerations: aiPolls.generations,
  };
}
