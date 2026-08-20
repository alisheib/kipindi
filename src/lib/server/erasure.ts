/**
 * ERASURE — what a closed account leaves behind, and what it must not.
 *
 * PDPA 2022 §31 (right of erasure) · GDPR Art. 17 · against POCA Cap 423 §16 and FATF R.11,
 * which require the opposite for part of the same record. `docs/DATA-RETENTION.md` is the
 * authority for every period quoted here; `docs/COMPLIANCE-DECISIONS.md` (2026-08-21) is the
 * owner record for the two decisions this file implements.
 *
 * ══ 🔴 THE TRAP, FIRST, BECAUSE IT IS THE REASON THIS FILE TOOK A SESSION ═══════════════
 *
 * Since the NIDA contract migration the partial unique index on `(idType, idNumber)` is the
 * SOLE enforcement of one-document-one-account — a P0 AML control. **Nulling `idNumber`
 * frees that slot, so one human could open a second account.** Ali's decision (2026-08-21,
 * item 3) is therefore that the number is replaced by a KEYED HMAC OF ITSELF, never NULL,
 * "so the same document still hashes to the same value and the index still rejects the
 * second account".
 *
 * ⛔ THAT LAST CLAUSE DOES NOT FOLLOW, AND BELIEVING IT WOULD HAVE SHIPPED THE SAME HOLE.
 * A unique index compares STORED STRINGS. After erasure the row holds `a3f9…`; the next
 * person presenting that same document writes the RAW number, `19900101…`; the two are
 * different strings and the index sees no duplicate. Hashing in place repeals the control
 * exactly as nulling does — it just looks safe while doing it. Measured, not reasoned:
 * `scripts/erasure.test.mts` §5 drives the raw-only variant and gets a SECOND ACCOUNT.
 *
 * So the collision has to happen on a value BOTH rows carry. `KycSubmission.idFingerprint`
 * (added 20260821140000) is written at the identity step for every submission, carried
 * past erasure untouched, and unique-indexed with the tuple index's exact predicate. The
 * decision is honoured to the letter — `idNumber` becomes its keyed HMAC and is never NULL
 * — and the property the decision was reaching for is now actually true.
 *
 * ══ WHAT IS DESTROYED NOW, AND WHAT IS HELD ════════════════════════════════════════════
 *
 * Two tiers, because two statutes want opposite things and only one of them is negotiable.
 * `/admin/retention` already publishes this posture to the Gaming Board in these words:
 * *"where a player invokes erasure and we hold AML records subject to POCA Cap 423 §16
 * (7-year minimum), we PARTIALLY FULFIL — PII fields pseudonymised, financial record
 * retained for the statutory period."*
 *
 *   ① IMMEDIATE — everything that is not a customer-due-diligence or money record.
 *      Contact details, credentials, avatar, in-app notifications, push endpoints, the
 *      comment thread's frozen author masks, the identity NUMBER and NAME.
 *
 *   ② HELD FOR 7 YEARS FROM CLOSURE — the identity IMAGES and the extra documents an
 *      officer asked for, plus the source-of-funds declaration.
 *      ⚠️ THIS IS A DEPARTURE FROM THE LETTER OF THE 2026-08-21 DECISION, WHICH SAYS THE
 *      IMAGES ARE "DELETED OUTRIGHT", AND IT IS FLAGGED FOR ALI RATHER THAN DECIDED
 *      QUIETLY. The decision answered *how* an identity is erased, not *when* a CDD record
 *      may be destroyed — and `docs/DATA-RETENTION.md` §1 has said since 2026-08-20 that
 *      identity documents are kept "7 years, from account closure, POCA Cap 423 §16; FATF
 *      R.11, never deleted by any automated path". Deleting a passport scan in year 1 is
 *      irreversible and would breach that; holding it is a one-constant change if Ali
 *      wants it sooner. When two readings differ, take the recoverable one.
 *      `KYC_DOCUMENT_HOLD_YEARS` is that constant.
 *
 *   ⛔ NEVER — `Wallet`, `Transaction`, `LedgerEntry`, `Position`, `AuditLog`. Not "not
 *      today": this module cannot reach them. It names what it writes.
 *
 * ══ IDEMPOTENT, AND WHY THAT MATTERS ═══════════════════════════════════════════════════
 *
 * An erasure that cannot be re-run is an erasure nobody dares re-run after a half-failed
 * one. Every step here is safe to repeat, the second pass reports zeroes, and the routine
 * is the SAME function for both tiers — you call it again after the hold expires and it
 * finishes the job.
 */
import { db } from "./store";
import { audit } from "./audit";
import { identityFingerprint } from "./crypto";
import { deleteKycDocument } from "./storage";
import { anonymiseAuthorComments } from "./comments-store";
import { maskName } from "./affiliate-service";
import { removeTotp } from "./totp";
import { clearBackupCodes } from "./backup-codes";
import { revokeUserSessions } from "./session-registry";
import type { KycExtraRequest } from "./store";

/**
 * How long an identity document is held after account closure before erasure may destroy
 * it. POCA Cap 423 §16 / FATF R.11, and the figure already published on
 * `/admin/retention` and in `docs/DATA-RETENTION.md` §1.
 *
 * ⛔ Lowering this is a compliance decision with an owner's name on it, not a tidy-up.
 * `test:erasure` asserts it matches the published schedule.
 */
export const KYC_DOCUMENT_HOLD_YEARS = 7;

/** What replaces a frozen author mask in a public comment thread. Carries no fragment. */
export const ERASED_AUTHOR_NAME = "Former member";

/** What replaces the free text of a comment written by an erased account. */
export const ERASED_COMMENT_BODY = "[removed at the author's request]";

/** What replaces an officer's free-text description of a requested extra document. */
export const ERASED_REQUEST_DESCRIPTION = "[erased]";

/**
 * The tombstone written into `User.phoneE164`.
 *
 * ⛔ NOT NULL AND UNIQUE, so the column must hold something and that something must be
 * unique per account. Keyed on the user id, which is a cuid we generated and which the
 * audit chain already names on every row about this account — so the tombstone reveals
 * nothing the chain does not already have to.
 */
export function erasedPhoneTombstone(userId: string): string {
  return `erased:${userId}`;
}

/** True for a value this module has already written. Makes the routine re-runnable. */
export function isErasedPhone(phoneE164: string): boolean {
  return phoneE164.startsWith("erased:");
}

export type AnonymizeOutcome =
  | { ok: false; error: string; reason: "not_found" | "not_closed" }
  | {
      ok: true;
      /** Already-erased input: every counter is 0 and nothing was written. */
      alreadyErased: boolean;
      /** Tier ② ran (the 7-year hold had expired). */
      documentsReleased: boolean;
      /** ISO date tier ② becomes available, or null once it has run. */
      documentsHeldUntil: string | null;
      counts: {
        kycSubmissions: number;
        idNumbersHashed: number;
        documentsDeleted: number;
        documentObjectsFailed: number;
        extraRequestsCleared: number;
        comments: number;
        notificationsDeleted: number;
        notificationsRedacted: number;
        otps: number;
        pushSubscriptions: number;
        watchlistEntries: number;
      };
    };

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString();
}

/**
 * Erase a CLOSED account.
 *
 * @param userId the account to erase
 * @param opts.now injectable clock — the 7-year hold is the only thing that reads it, and
 *                 a test that cannot move time cannot prove tier ② at all.
 *
 * ⛔ REFUSES ANYTHING THAT IS NOT `status === "CLOSED"`. The right of erasure attaches to a
 * closed relationship, the 7-year clock is measured from closure, and a routine that will
 * erase a LIVE account is one mis-typed id away from destroying a paying player's sign-in.
 * The guard is the cheap half of that trade.
 */
export async function anonymizeClosedAccount(
  userId: string,
  opts?: { now?: number },
): Promise<AnonymizeOutcome> {
  const now = opts?.now ?? Date.now();
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "No such account.", reason: "not_found" };
  if (user.status !== "CLOSED") {
    return {
      ok: false,
      reason: "not_closed",
      error: "Erasure applies to a CLOSED account. Close the account first — the 7-year "
        + "retention clock is measured from closure.",
    };
  }

  const counts = {
    kycSubmissions: 0, idNumbersHashed: 0, documentsDeleted: 0, documentObjectsFailed: 0,
    extraRequestsCleared: 0, comments: 0, notificationsDeleted: 0, notificationsRedacted: 0,
    otps: 0, pushSubscriptions: 0, watchlistEntries: 0,
  };

  // The clock runs from closure. A CLOSED row with no `closedAt` predates that column being
  // written; treat the account as closed NOW rather than as eligible, which is the
  // conservative reading and the only one that cannot destroy a document early.
  const closedAt = user.closedAt ?? new Date(now).toISOString();
  const releaseAt = addYears(closedAt, KYC_DOCUMENT_HOLD_YEARS);
  const documentsReleased = now >= Date.parse(releaseAt);

  // ── 0 · ALREADY DONE? ────────────────────────────────────────────────────────────────
  // Re-running must be safe AND must be visible as a no-op, so an officer re-running after
  // a partial failure can tell "nothing left to do" from "it did not run".
  const wasErased = isErasedPhone(user.phoneE164);

  /**
   * The masks as they were FROZEN into other people's rows, computed before anything
   * changes.
   *
   * ⚠️ Must be read off the PRE-erasure user or they match nothing — `maskName(null,
   * "erased:usr_x")` is not what `notifyReferralJoined` wrote months ago.
   *
   * ⛔ BOTH FORMS, and that is not belt-and-braces. `maskName` returns a fragment of the
   * DISPLAY NAME when there is one and a fragment of the PHONE NUMBER when there is not —
   * so which of the two got frozen into a row depends on whether the player had set a name
   * on the day it was written. A player who signed up, was referred, and named themselves
   * a week later has the phone form sitting in their referrer's notification and the name
   * form in every comment since. Redacting only the current one leaves the other.
   */
  const frozenMasks = wasErased
    ? []
    : Array.from(new Set([
      maskName(user.displayName, user.phoneE164),
      maskName(null, user.phoneE164),
    ]));

  // ── 1 · IDENTITY — the number, the name, the fingerprint that outlives them ──────────
  //
  // ⛔ EVERY SUBMISSION, NOT `findByUserId`. That returns the NEWEST one only, and a
  // resubmission after a rejection is the ordinary case — erasing the newest would leave
  // the national ID, the full name and the date of birth sitting on every earlier row.
  const submissions = await db.kyc.listByUser(userId);
  counts.kycSubmissions = submissions.length;

  for (const k of submissions) {
    const patch = { ...k };
    let touched = false;

    // The fingerprint FIRST, computed from the raw number while it is still readable.
    // Rows written before 20260821140000 have none; this is where they get one, at the
    // one moment the platform still knows what to derive it from.
    if (k.idType && k.idNumber && !/^[0-9a-f]{64}$/.test(k.idNumber)) {
      const fp = k.idFingerprint || identityFingerprint(k.idType, k.idNumber);
      patch.idFingerprint = fp;
      // 🔴 THE DECISION, LITERALLY: the number becomes its keyed HMAC and is never NULL.
      // Uniqueness does not rest on this value (it rests on `idFingerprint`, which the
      // index can still collide against a raw submission) — but writing the hash keeps the
      // tuple slot occupied, keeps `idNumber IS NOT NULL` true for the partial index, and
      // means no reader ever sees an identity column that is simply empty and assumes the
      // player never provided one.
      patch.idNumber = fp;
      touched = true;
      counts.idNumbersHashed++;
    }

    // `hashed-NIDA replaces full name` — the exact wording already published to the Board
    // on /admin/retention. A fixed string would collapse every erased submission into one
    // indistinguishable row; the fingerprint prefix keeps them tellable apart by an officer
    // reading the table without telling them anything about the person.
    if (k.fullName !== null && !k.fullName.startsWith("Erased")) {
      patch.fullName = patch.idFingerprint
        ? `Erased ${String(patch.idFingerprint).slice(0, 12)}`
        : "Erased";
      touched = true;
    }
    if (k.dob !== null) { patch.dob = null; touched = true; }

    /**
     * ⭐ THE OFFICER'S OWN WORDS, WHICH THE SWEEP FOUND AND NO CHECKLIST HAD.
     *
     * `extraRequests[].description` is free text an officer typed while asking for another
     * document, and officers write the obvious thing: *"Proof of address for Asha Mwangi"*.
     * So the player's name survives erasure inside a JSON column, on a row whose name
     * column was carefully pseudonymised one line above.
     *
     * ⛔ IMMEDIATE, and deliberately NOT inside the 7-year gate below. A description is not
     * a document: no statute requires the sentence, only the file it asked for. And an
     * entry whose object could not be destroyed KEEPS its `storageKey` for a later retry —
     * so gating the text on the bytes would leave the name behind for years because a
     * bucket was briefly unreachable.
     */
    const described: KycExtraRequest[] = k.extraRequests ?? [];
    if (described.some((e) => e.description !== ERASED_REQUEST_DESCRIPTION)) {
      patch.extraRequests = described.map((e) => ({ ...e, description: ERASED_REQUEST_DESCRIPTION }));
      touched = true;
    }

    // ── TIER ② · the images, and the officer-requested extras that are a second store ──
    if (documentsReleased) {
      /**
       * 🔴 THE ROW ONLY GOES IF THE BYTES WENT. `deleteKycDocument` deliberately returns
       * `false` rather than throwing, so a sweep can record what it could not remove and
       * carry on — and the obvious loop then deletes the row anyway. That produces exactly
       * the outcome `storage.ts` was written to prevent, in its own words: *"the record
       * says erased, the data is not."* Worse, it destroys the only pointer to the object,
       * so nothing can ever retry.
       *
       * ⛔ So a failed object KEEPS its row. The routine is idempotent; an officer re-runs
       * it once R2 is reachable and it finishes. `documentObjectsFailed > 0` in the result
       * and in the audit payload is the signal that a re-run is owed.
       */
      const docs = k.documents ?? [];
      const survivors: typeof docs = [];
      for (const doc of docs) {
        const gone = await deleteKycDocument(doc.storageKey);
        if (gone) counts.documentsDeleted++;
        else { counts.documentObjectsFailed++; survivors.push(doc); }
      }
      if (docs.length !== survivors.length) {
        // `deleteDocuments` clears the set; the upsert below re-creates the survivors, so
        // the two together are a replace rather than a partial delete the DAL cannot do.
        await db.kyc.deleteDocuments(k.id);
        patch.documents = survivors;
        touched = true;
      }
      // ⚠️ `extraRequests` IS A SECOND DOCUMENT STORE and the acceptance query for the R2
      // migration never looked at it (audit F-02 scope note). Each entry carries a
      // `storageKey` — inline base64 on older rows, `r2:<key>` on newer — and an officer's
      // free-text description of what was asked for.
      // ⚠️ Read from `patch`, not `k` — the description redaction above already rewrote
      // this array, and reading the original row would put the officer's sentence back.
      const extras: KycExtraRequest[] = patch.extraRequests ?? k.extraRequests ?? [];
      const extraSurvivors: KycExtraRequest[] = [];
      for (const e of extras) {
        // An entry with no `storageKey` is a request the player never answered: nothing to
        // destroy, so it clears with the rest.
        const gone = e.storageKey ? await deleteKycDocument(e.storageKey) : true;
        if (gone) { if (e.storageKey) counts.documentsDeleted++; }
        else { counts.documentObjectsFailed++; extraSurvivors.push(e); }
      }
      if (extras.length !== extraSurvivors.length) {
        patch.extraRequests = extraSurvivors;
        counts.extraRequestsCleared += extras.length - extraSurvivors.length;
        touched = true;
      }
    }

    if (touched) await db.kyc.upsert({ ...patch, updatedAt: new Date(now).toISOString() });
  }

  // ── 2 · SOURCE OF FUNDS — a CDD record, so it moves on the SAME clock as the images ──
  // Occupation and employer are the player's, not the platform's, and nothing but AML
  // retention argues for keeping them.
  if (documentsReleased) {
    const sof = await db.sourceOfFunds.get(userId);
    if (sof && (sof.declaredOccupation || sof.declaredEmployer || sof.declaredOther)) {
      await db.sourceOfFunds.upsert({
        ...sof,
        declaredOccupation: "",
        declaredEmployer: null,
        declaredOther: null,
      });
    }
  }

  // ── 3 · THE PUBLIC THREAD — a frozen mask is still a fragment of a phone number ──────
  const commentResult = await anonymiseAuthorComments(userId, {
    authorName: ERASED_AUTHOR_NAME,
    body: ERASED_COMMENT_BODY,
  });
  counts.comments = commentResult.comments;

  // ── 4 · NOTIFICATIONS — theirs deleted, and the mask frozen into SOMEBODY ELSE'S ─────
  counts.notificationsDeleted = await db.notification.deleteAllForUser(userId);
  for (const mask of frozenMasks) {
    counts.notificationsRedacted += await db.notification.redactFragment(mask, ERASED_AUTHOR_NAME);
  }

  // ── 5 · CREDENTIALS AND DEVICE STATE ────────────────────────────────────────────────
  counts.otps = await db.otp.deleteAllForPhone(user.phoneE164);
  const subs = await db.pushSub.listForUser(userId);
  for (const sub of subs) await db.pushSub.deleteByEndpoint(sub.endpoint);
  counts.pushSubscriptions = subs.length;
  const watched = await db.watchlist.listMarketIdsForUser(userId);
  for (const marketId of watched) await db.watchlist.remove(marketId, userId);
  counts.watchlistEntries = watched.length;
  await removeTotp(userId);
  await clearBackupCodes(userId);
  await revokeUserSessions(userId);

  // ── 6 · THE USER ROW ────────────────────────────────────────────────────────────────
  //
  // ⛔ THE ROW CANNOT BE DELETED. `Comment.user` is a REQUIRED relation with no
  // `onDelete`, so removing it would fail — and if it succeeded it would take the market
  // discussion, the affiliate ledger and every FK that names this account with it. Erasure
  // empties the row; it does not remove it.
  if (!wasErased) {
    await db.user.update(userId, {
      phoneE164: erasedPhoneTombstone(userId),
      email: null,
      emailVerifiedAt: null,
      passwordHash: null,
      passwordSalt: null,
      displayName: null,
      dob: null,
      region: null,
      avatarDataUrl: null,
      lastLoginAt: null,
      // ⭐ NOT on the brief's "leave" list, and it should not have been. `marketingOptIn`
      // is a CONSENT record; an account that has invoked erasure has withdrawn it by
      // definition, and leaving it `true` means an erased account still reads as marketable
      // to anything that queries the flag.
      marketingOptIn: false,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }

  // ── 7 · THE RECORD THAT IT HAPPENED ─────────────────────────────────────────────────
  //
  // ⛔ NOT ONE FIELD OF THE ERASED DATA IN THE PAYLOAD. The audit chain is append-only and
  // kept 7 years, so a payload naming the phone number would make the log the last place
  // the erased number survives — an erasure routine that writes the data into the one
  // table that cannot be pruned.
  audit({
    category: "COMPLIANCE",
    action: "privacy.erasure.completed",
    actorId: null,
    targetType: "User",
    targetId: userId,
    payload: {
      alreadyErased: wasErased,
      documentsReleased,
      documentsHeldUntil: documentsReleased ? null : releaseAt.slice(0, 10),
      holdYears: KYC_DOCUMENT_HOLD_YEARS,
      ...counts,
    },
  });

  return {
    ok: true,
    alreadyErased: wasErased,
    documentsReleased,
    documentsHeldUntil: documentsReleased ? null : releaseAt.slice(0, 10),
    counts,
  };
}
