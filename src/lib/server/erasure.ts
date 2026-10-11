/**
 * ERASURE — what a closed account leaves behind, and what it must not.
 *
 * PDPA 2022 §31 (right of erasure) · GDPR Art. 17 · against POCA Cap 423 §16 and FATF R.11,
 * which require the opposite for part of the same record. `docs/DATA-RETENTION.md` is the
 * authority for every period quoted here; `docs/COMPLIANCE-DECISIONS.md` (2026-08-21) is the
 * owner record for the two decisions this file implements, and its "Privacy v2026-10-11"
 * entry the owner's record of the typed identity's 7-year hold (Part C).
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
 * `scripts/erasure.test.mts` §7b (after the 7-year release) drives the raw-only variant and
 * gets a SECOND ACCOUNT.
 *
 * So the collision has to happen on a value BOTH rows carry. `KycSubmission.idFingerprint`
 * (added 20260821140000) is written at the identity step for every submission, carried
 * past erasure untouched, and unique-indexed with the tuple index's exact predicate. The
 * decision is honoured to the letter — `idNumber` becomes its keyed HMAC and is never NULL
 * — and the property the decision was reaching for is now actually true.
 *
 * ⭐ SINCE 2026-10-11 (Part C) THE NUMBER STAYS RAW THROUGH THE 7-YEAR HOLD, and the two
 * indexes take turns: during the hold the TUPLE index refuses the document exactly as it
 * did while the account was open, and the fingerprint — written at erasure for any row
 * that lacks one, while the raw number is certainly there to derive it from — is already in
 * place for the day the number becomes its HMAC. ⛔ So the fingerprint write is IMMEDIATE,
 * never under the hold: both of the platform's uniqueness reads (`findActiveByIdNumber`,
 * `findActiveByFingerprint`) answer for an erased document from the first run on.
 *
 * ══ WHAT IS DESTROYED NOW, AND WHAT IS HELD ════════════════════════════════════════════
 *
 * Two tiers, because two statutes want opposite things and only one of them is negotiable.
 * `/admin/retention` publishes this posture to the Gaming Board: where a player invokes erasure
 * and we hold AML records subject to POCA Cap 423 §16 (7-year minimum), *"we partially fulfil"*,
 * and its note goes on to say what is erased at once and what is held until the release.
 *
 *   ① IMMEDIATE — everything that is not a customer-due-diligence or money record.
 *      Contact details, credentials, avatar, in-app notifications, push endpoints, the
 *      comment thread's frozen author masks, every sentence an officer typed on the identity
 *      record (the refusal note, the request descriptions) — and the account LINK on every
 *      campaign recipient row (U16a), whose number, status and trail stay as the 7-year
 *      record that we messaged that number. Plus one WRITE that is not an erasure: the
 *      identity fingerprint, for every submission that lacks one (above).
 *
 *   ② HELD FOR 7 YEARS FROM CLOSURE — the TYPED IDENTITY (document number, full name and date
 *      of birth, on every submission and on every `priorIdentities` entry), the identity
 *      IMAGES, the extra documents an officer asked for and every other object in the
 *      account's own KYC folder in R2, plus the source-of-funds declaration.
 *      ⭐ THE TYPED IDENTITY JOINED THIS TIER ON 2026-10-11 (Part C) — the owner's ruling of
 *      2026-10-10, in his words: *"keep 7 years but no notice — we have our licence to do
 *      this, it's ok"* (`docs/COMPLIANCE-DECISIONS.md`, "Privacy v2026-10-11"). From that day a
 *      player sends no image, so the typed details ARE the identification record a CDD file
 *      is kept for. Until Part C the number and the name were pseudonymised at once; at the
 *      release they now are, by exactly that rule (`pseudonymiseIdentity`).
 *      ⚠️ THE IMAGES' HOLD WAS A DEPARTURE FROM THE LETTER OF THE 2026-08-21 DECISION, WHICH
 *      SAYS THE IMAGES ARE "DELETED OUTRIGHT", AND IT WAS FLAGGED FOR ALI RATHER THAN DECIDED
 *      QUIETLY. The decision answered *how* an identity is erased, not *when* a CDD record
 *      may be destroyed — and `docs/DATA-RETENTION.md` §1 has said since 2026-08-20 that
 *      identity documents are kept "7 years, from account closure, POCA Cap 423 §16; FATF
 *      R.11, never deleted by any automated path". Deleting a passport scan in year 1 is
 *      irreversible and would breach that; holding it is a one-constant change if Ali
 *      wants it sooner. When two readings differ, take the recoverable one.
 *      `KYC_DOCUMENT_HOLD_YEARS` is that constant — and since Part C it is the typed
 *      identity's clock too, by the owner's own ruling rather than by this file's reading.
 *
 *   ⛔ NEVER — `Wallet`, `Transaction`, `LedgerEntry`, `Position`, `AuditLog`. Not "not
 *      today": this module cannot reach them. It names what it writes.
 *
 * ══ IDEMPOTENT, AND WHY THAT MATTERS ═══════════════════════════════════════════════════
 *
 * An erasure that cannot be re-run is an erasure nobody dares re-run after a half-failed
 * one. Every step here is safe to repeat, the second pass reports zeroes for the work the
 * first one did (`identitiesHeld` is a state, not work: a re-run during the hold reports
 * the same figure), and the routine is the SAME function for both tiers — you call it
 * again after the hold expires and it finishes the job.
 */
import { db } from "./store";
import { audit } from "./audit";
import { erasedPhoneTombstone, isErasedPhone } from "./erased-phone";
import { identityFingerprint } from "./crypto";
import { deleteKycDocument, kycUserKeyPrefix, listKycDocumentKeys } from "./storage";
import { anonymiseAuthorComments } from "./comments-store";
import { maskName } from "./affiliate-service";
import { removeTotp } from "./totp";
import { clearBackupCodes } from "./backup-codes";
import { revokeUserSessions } from "./session-registry";
import type { KycExtraRequest, KycPriorIdentity, StoredUser } from "./store";
import { hasUnpurgedAgentDocuments, pseudonymiseAgentApplications, purgeAgentDocumentsForUser } from "./agent-application-service";
import { houseBotAlertOnceStore, houseBotStore } from "./house-bot-dal";
import { withLock } from "./locks";
import { ALERT_KEY } from "@/lib/house-bot/constants";
import { eraseMarketingFor, unlinkCampaignRecipients } from "./marketing/erase";
import type { MarketingErasureCounts } from "./marketing/erase";

/**
 * How long the identity record is held after account closure before erasure may destroy
 * it — the images, and since 2026-10-11 (Part C, the owner's ruling) the typed identity
 * too: the document number, the full name and the date of birth. POCA Cap 423 §16 /
 * FATF R.11, and the figure already published on `/admin/retention`, in
 * `docs/DATA-RETENTION.md` §1 and, from v2026-10-11, in Privacy §5.
 *
 * ⛔ Lowering this is a compliance decision with an owner's name on it, not a tidy-up.
 * `test:erasure` asserts it matches the published schedule, and `test:privacy-notice`
 * that §5 states it in all three languages.
 */
export const KYC_DOCUMENT_HOLD_YEARS = 7;

/** What replaces a frozen author mask in a public comment thread. Carries no fragment. */
export const ERASED_AUTHOR_NAME = "Former member";

/** What replaces the free text of a comment written by an erased account. */
export const ERASED_COMMENT_BODY = "[removed at the author's request]";

/** What replaces an officer's free-text description of a requested extra document. */
export const ERASED_REQUEST_DESCRIPTION = "[erased]";

/**
 * The tombstone written into `User.phoneE164`, and its recogniser — defined in `erased-phone.ts` since 2026-10-11, so
 * an admin page can recognise an erased account without importing this routine (`test:house-bot-surfaces` §3).
 * Re-exported here: every caller that imported them from this module is unchanged.
 */
export { erasedPhoneTombstone, isErasedPhone };

/** A number already in its erased form — the 64-hex keyed HMAC `identityFingerprint` writes. */
const HASHED_ID = /^[0-9a-f]{64}$/;

/** The typed identity a submission carries — and every entry of its `priorIdentities`, which carries the same facts. */
type TypedIdentity = {
  idType?: string | null;
  idNumber?: string | null;
  idFingerprint?: string | null;
  fullName: string | null;
  dob: string | null;
};

/**
 * ⭐ ONE RULE, FOR THE ROW AND FOR EVERY IDENTITY IT REPLACED (2026-10-10 reviews R2.3/R4.1; ONE function since Part C,
 * 2026-10-11). The number becomes its keyed fingerprint (never null — the header's decision), the full name becomes
 * "Erased <fingerprint prefix>" (a fixed string would
 * collapse every erased submission into one indistinguishable row, the prefix keeps them tellable apart without telling
 * anyone anything about the person), and the date of birth is removed. Type, expiry, status, the approvals, the deciding
 * officer, the cause and when an entry was replaced are not this rule's — they are what the row keeps.
 * ⛔ Until Part C the row's three columns carried their own inline copy of this rule and `erasePriorIdentity` restated
 * it for the history, field for field — two copies of one rule is how one of them drifts. Both now call this.
 * It is PURE: it returns the erased facts and writes nothing, so the hold can ask what the release WOULD change
 * (`identitiesHeld`, `listHeldIdentities`) without changing anything — an identity is "held" exactly while this would
 * still touch it. Idempotent: an identity already erased comes back untouched.
 * ⚠️ Defensive about shape: a prior identity is JSON, so a field may be missing rather than null.
 */
function pseudonymiseIdentity(e: TypedIdentity): {
  erased: { idNumber: string | null; idFingerprint: string | null; fullName: string | null; dob: string | null };
  touched: boolean;
  hashed: boolean;
} {
  const erased = {
    idNumber: e.idNumber ?? null,
    idFingerprint: e.idFingerprint ?? null,
    fullName: e.fullName ?? null,
    dob: e.dob ?? null,
  };
  let touched = false;
  let hashed = false;
  if (e.idType && e.idNumber && !HASHED_ID.test(e.idNumber)) {
    const fp = e.idFingerprint || identityFingerprint(e.idType, e.idNumber);
    erased.idFingerprint = fp;
    erased.idNumber = fp;
    touched = true;
    hashed = true;
  }
  if (e.fullName != null && !String(e.fullName).startsWith("Erased")) {
    erased.fullName = erased.idFingerprint ? `Erased ${String(erased.idFingerprint).slice(0, 12)}` : "Erased";
    touched = true;
  }
  if (e.dob != null) { erased.dob = null; touched = true; }
  return { erased, touched, hashed };
}

export type AnonymizeOutcome =
  /** `house_bot_live`: the account is still a house bot (04 A5, R6) — nothing was written, the request stays open. */
  | { ok: false; error: string; reason: "not_found" | "not_closed" | "house_bot_live" | "error" }
  | {
      ok: true;
      /** Already-erased input: only the steps keyed on the account id run again — step 4c's campaign unlink among
       *  them, and tier ② once its hold has run — so their counters say what a re-run still found
       *  (`campaignRecipientsUnlinked` above 0 is a row an enqueue linked after the first pass). A step keyed on the
       *  number finds nothing: the tombstone holds no number. */
      alreadyErased: boolean;
      /** Tier ② ran: the 7-year hold had expired, so the typed identity was pseudonymised and the images, the extras and
       *  the account's own KYC folder were destroyed. ⚠️ The name is 2026-08-21's, kept because `privacy.ts`, the suites
       *  and the audit chain read it; since 2026-10-11 (Part C) the typed identity is part of what it releases. */
      documentsReleased: boolean;
      /** ISO date the hold ends — the day the identity record (typed details and images) may be erased — or null once
       *  tier ② has run. `privacy.ts` keeps it on the PARTIAL request as `erasureHeldUntil`. */
      documentsHeldUntil: string | null;
      counts: {
        kycSubmissions: number;
        /** Numbers turned into their keyed HMAC BY THIS RUN — on the rows and on their prior identities. 0 during the
         *  hold, and 0 on any re-run once they are hashed. */
        idNumbersHashed: number;
        /** ⭐ Part C · identities this run KEPT because the 7-year hold is running — each submission's own and each prior
         *  identity still carrying a readable number, name or date of birth. A state, not work: a re-run during the hold
         *  reports the same figure, and the release reports 0. */
        identitiesHeld: number;
        documentsDeleted: number;
        /** Objects R2 refused, or the account's KYC folder that could not be listed — every row keeps its key, and a
         *  re-run is owed while this is above 0. */
        documentObjectsFailed: number;
        /** ⭐ Part C · objects in the account's own KYC folder that no row named any more (a restart dropped the row's
         *  pointer), destroyed at the release. */
        orphanObjectsDeleted: number;
        extraRequestsCleared: number;
        comments: number;
        notificationsDeleted: number;
        notificationsRedacted: number;
        otps: number;
        pushSubscriptions: number;
        /** Agent applications whose referee names and officer notes were pseudonymised (immediate). */
        agentApplicationsRedacted: number;
        /** Agent documents destroyed under tier ② (the 7-year hold). */
        agentDocumentsDeleted: number;
        /** Agent objects R2 refused — their rows keep the key for a re-run. */
        agentDocumentObjectsFailed: number;
        watchlistEntries: number;
        /** House-bot rows of the account pseudonymised: label "Erased <TAIL6>", notes and reasons "[erased]" (04 A5). */
        houseBots: number;
        /** Notification rows whose quoted bot label was replaced (04 R6) — admin inboxes included. */
        houseBotNotificationsRedacted: number;
      } & MarketingErasureCounts;
    };

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString();
}

/**
 * The day the 7-year hold on an erased account's identity ends (ISO `YYYY-MM-DD`), counted from closure — the date
 * `anonymizeClosedAccount` reports as `documentsHeldUntil`. Null when the account carries no readable closure date: the
 * routine then counts from the day it runs (the conservative reading), so no release date can be read from the data.
 */
export function identityHeldUntil(closedAt: string | null | undefined): string | null {
  if (!closedAt || !Number.isFinite(Date.parse(closedAt))) return null;
  return addYears(closedAt, KYC_DOCUMENT_HOLD_YEARS).slice(0, 10);
}

/** One erased account whose typed identity the 7-year hold still keeps — a row of `/admin/privacy`'s held list. */
export type HeldIdentity = {
  userId: string;
  closedAt: string | null;
  /** `identityHeldUntil(closedAt)` — null when no closure date is on file. */
  heldUntil: string | null;
  /** Identities (submissions and their prior identities) still carrying a readable number, name or date of birth. */
  identities: number;
};

/**
 * ⭐ THE HELD IDENTITIES, READ FROM THE DATA ITSELF (Part C, 2026-10-11) — `/admin/privacy`'s durable list.
 *
 * The PARTIAL request in the data-rights queue carries the release date, but that queue is ONE SystemConfig blob, and a
 * seven-year reminder that lives in one blob is a reminder one bad write forgets. This asks the accounts instead: every
 * CLOSED account whose phone is the erasure tombstone (`isErasedPhone`) and whose submissions still carry a readable
 * typed identity, on a row or on a prior identity. ⛔ THE SAME PREDICATE THE RELEASE APPLIES — `pseudonymiseIdentity`
 * would still change it — so an account leaves this list exactly when its release has run, never before and never after.
 * Scalars out only: the account id, the closure date, the release date and a count — never a name or a number.
 * ⚠️ A read that fails THROWS: the page then says the list could not be loaded, never "none held".
 */
export async function listHeldIdentities(
  users: ReadonlyArray<Pick<StoredUser, "id" | "status" | "phoneE164" | "closedAt">>,
): Promise<HeldIdentity[]> {
  const out: HeldIdentity[] = [];
  for (const u of users) {
    if (u.status !== "CLOSED" || !isErasedPhone(u.phoneE164)) continue;
    let identities = 0;
    for (const k of await db.kyc.listByUser(u.id)) {
      if (pseudonymiseIdentity(k).touched) identities++;
      for (const e of Array.isArray(k.priorIdentities) ? k.priorIdentities : []) {
        if (e && typeof e === "object" && pseudonymiseIdentity(e).touched) identities++;
      }
    }
    if (identities > 0) {
      out.push({ userId: u.id, closedAt: u.closedAt ?? null, heldUntil: identityHeldUntil(u.closedAt), identities });
    }
  }
  // The soonest release first; an account with no closure date on file last ("~" sorts after every digit).
  return out.sort((a, b) => (a.heldUntil ?? "~").localeCompare(b.heldUntil ?? "~") || a.userId.localeCompare(b.userId));
}

/**
 * Erase a CLOSED account.
 *
 * @param userId the account to erase
 * @param opts.now injectable clock — the 7-year hold is the only thing that reads it, and
 *                 a test that cannot move time cannot prove tier ② at all.
 * @param opts.officerId the officer fulfilling the request — named as `recordedBy` on the marketing
 *                 stop and the ledger row (U18b), the way an OPERATOR suppression is documented.
 *
 * ⛔ REFUSES ANYTHING THAT IS NOT `status === "CLOSED"`. The right of erasure attaches to a
 * closed relationship, the 7-year clock is measured from closure, and a routine that will
 * erase a LIVE account is one mis-typed id away from destroying a paying player's sign-in.
 * The guard is the cheap half of that trade.
 */
export async function anonymizeClosedAccount(
  userId: string,
  opts?: { now?: number; officerId?: string | null },
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

  /**
   * ⛔ A LIVE HOUSE BOT REFUSES, BEFORE ANY DESTRUCTIVE WRITE (04 A5, R6). An erased account could no longer
   * be verified, paused for a cause or recognised by its owner, while stakes kept landing in its name. The
   * owner removes the bot, then the officer re-runs this — the request stays PENDING meanwhile. Every owner is
   * told once per bot (AlertOnce `erasure-blocked:<botId>`), by bell and email.
   * A read that throws escapes this function, which is also a refusal: nothing below has run.
   */
  // ⛔ UNDER `wallet:<userId>`, the lock designation writes its bot under (review MC-4): a designate that holds it
  // first has committed its bot before this read; one that takes it after sees the account CLOSED and refuses.
  const liveBot = await withLock(`wallet:${userId}`, () => houseBotStore.findLiveByUserId(userId));
  if (liveBot) {
    const key = ALERT_KEY.erasureBlocked(liveBot.id);
    let claimed = false;
    try {
      claimed = await houseBotAlertOnceStore.claim(key);
      if (claimed) {
        const { notifyAdminsHouseBotErasureBlocked } = await import("./notification-service");
        // A send that reached nobody gives the claim back, so the next attempt still tells an owner (review LI-8).
        if ((await notifyAdminsHouseBotErasureBlocked({ botId: liveBot.id, holderUserId: userId })) === 0) await houseBotAlertOnceStore.release(key);
      }
    } catch (err) {
      console.error("[erasure] house-bot owner alert failed:", (err as Error)?.message ?? err);
      if (claimed) await houseBotAlertOnceStore.release(key).catch(() => {});
    }
    /* ⛔ THE OFFICER-FACING SENTENCE NAMES NOTHING (⛔ D19; rulings 301, 393, 453, 548, 551(a); C7 step 7 review
       d19-hunt-01). It used to read "This account is still house bot hb_… The owner must remove it at
       /admin/desk/hb_…", and `privacy.ts` hands this string straight to `/admin/privacy` — a COMPLIANCE-domain
       route. So a COMPLIANCE officer, who is outside this feature's audience on both belts and whom
       `OWNER_ONLY_PREFIXES` forbids to open `/admin/desk` at all, was shown the feature's name, the bounded id and
       the console path in one sentence, from a control they are entitled to use. The three identifying facts stay
       on the channel that already has the right audience: `notifyAdminsHouseBotErasureBlocked`, ADMIN-only.
       ⛔ The REASON CODE is unchanged — `house_bot_live` is server-only and `HOUSE_REASON_EXPORTED_AS` already
       maps it to `not_erasable` for the releasable door — so nothing that reads the outcome changes. */
    return {
      ok: false,
      reason: "house_bot_live",
      error: "This account is still in use by an owner-managed account and cannot be erased yet. An owner has been told; the request stays open and can be run again once it is released.",
    };
  }

  const counts = {
    kycSubmissions: 0, idNumbersHashed: 0, identitiesHeld: 0, documentsDeleted: 0, documentObjectsFailed: 0,
    orphanObjectsDeleted: 0,
    agentApplicationsRedacted: 0, agentDocumentsDeleted: 0, agentDocumentObjectsFailed: 0,
    extraRequestsCleared: 0, comments: 0, notificationsDeleted: 0, notificationsRedacted: 0,
    otps: 0, pushSubscriptions: 0, watchlistEntries: 0, houseBots: 0, houseBotNotificationsRedacted: 0,
    marketingConsentWithdrawn: 0, marketingContactsEmptied: 0, marketingListMembershipsDeleted: 0, marketingStagedRowsDeleted: 0,
    campaignRecipientsUnlinked: 0,
  };

  // The clock runs from closure. A CLOSED row with no `closedAt` predates that column being
  // written; treat the account as closed NOW rather than as eligible, which is the
  // conservative reading and the only one that cannot destroy a document early.
  // ⭐ ONE GATE FOR ALL OF TIER ② — named for what it now mostly releases (Part C, 2026-10-11): the
  // typed identity, and with it the images, the extras, the account's KYC folder, the source-of-funds
  // declaration and the agent programme's documents. (It was `documentsReleased`; the outcome field
  // and the audit key keep that name for their readers.)
  const closedAt = user.closedAt ?? new Date(now).toISOString();
  const releaseAt = addYears(closedAt, KYC_DOCUMENT_HOLD_YEARS);
  const identityReleased = now >= Date.parse(releaseAt);
  // ⭐ …and when it had to be assumed, step 6 WRITES it with the rest of the row (2026-10-11, reviews PC-1/PC-3).

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

  // ── 1 · IDENTITY — the fingerprint and the officers' words now; the identity itself at the release ──
  //
  // ⛔ EVERY SUBMISSION, NOT `findByUserId`. That returns the NEWEST one only, and a
  // resubmission after a rejection is the ordinary case — erasing the newest would leave
  // the national ID, the full name and the date of birth sitting on every earlier row.
  const submissions = await db.kyc.listByUser(userId);
  counts.kycSubmissions = submissions.length;
  /** Every `storageKey` this run already asked R2 to destroy — step 1b never tries one twice in a run. */
  const triedKeys = new Set<string>();
  /**
   * ⭐ WHETHER THE HOLD HOLDS ANYTHING BESIDES THE TYPED IDENTITY (2026-10-11, Part C review PC-1 MAJOR-2): a stored
   * image or extra, a declared source of funds, an agent-programme document, an object in the account's folder.
   * With `identitiesHeld` it decides whether this run reports a release date at all (`heldUntil`, step 2c).
   */
  let holdsMore = false;

  for (const k of submissions) {
    let patch = { ...k };
    let touched = false;

    // ① THE FINGERPRINT, AT ONCE — computed from the raw number while it is certainly readable.
    // Rows written before 20260821140000 have none; this is where they get one. ⛔ NOT under the
    // 7-year hold (Part C): the number stays raw until the release and the tuple index keeps
    // refusing the document meanwhile, but the fingerprint is the value that refuses it AFTER the
    // release, and the uniqueness control may not depend on a write seven years away. With it on
    // the row, both uniqueness reads answer for an erased document from the first run on.
    if (k.idType && k.idNumber && !k.idFingerprint && !HASHED_ID.test(k.idNumber)) {
      patch.idFingerprint = identityFingerprint(k.idType, k.idNumber);
      touched = true;
    }

    // ① THE OFFICER'S REFUSAL NOTE, AT ONCE (Part C, 2026-10-11). `rejectNote` is free text an officer
    // typed — "Name on the ID does not match: Asha Mwangi" — and it is not the identity record: the
    // refusal itself stays (`rejectReason`, a code), the sentence goes, exactly as the request
    // descriptions below. Held seven years it would keep the person's name on the row for a statutory
    // reason the sentence does not share.
    if (k.rejectNote && k.rejectNote !== ERASED_REQUEST_DESCRIPTION) {
      patch.rejectNote = ERASED_REQUEST_DESCRIPTION;
      touched = true;
    }

    /**
     * ⭐ THE OFFICER'S OWN WORDS, WHICH THE SWEEP FOUND AND NO CHECKLIST HAD.
     *
     * `extraRequests[].description` is free text an officer typed while asking for another
     * document, and officers write the obvious thing: *"Proof of address for Asha Mwangi"*.
     * So the player's name survived erasure inside a JSON column, on a row whose name
     * column was carefully pseudonymised — and since Part C, on a row whose name the hold
     * keeps for a statutory reason the sentence does not share.
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

    /**
     * ② THE TYPED IDENTITY — HELD 7 YEARS FROM CLOSURE, THEN PSEUDONYMISED BY ONE RULE (Part C, 2026-10-11).
     *
     * The owner's ruling of 2026-10-10: *"keep 7 years but no notice — we have our licence to do this, it's ok"*. A
     * player sends no image since that day, so the typed details — number, full name, date of birth — ARE the
     * identification record a CDD file is kept for (POCA Cap 423 §16 / FATF R.11), on this row and on every identity it
     * replaced (`priorIdentities`: a restart, a correction, a re-open). During the hold none of it is written; at the
     * release all of it goes, through `pseudonymiseIdentity` — ONE function for the row and for every entry, so the
     * history can never be erased by a second rule (reviews R2.3/R4.1: the patch is a spread of the row, so an entry the
     * rule missed would be written straight back). Nothing re-runs this at year seven: the PARTIAL request and the held
     * list on `/admin/privacy` are the reminder.
     */
    const priors: KycPriorIdentity[] = Array.isArray(k.priorIdentities) ? k.priorIdentities : [];
    if (identityReleased) {
      const own = pseudonymiseIdentity(patch);
      if (own.touched) { patch = { ...patch, ...own.erased }; touched = true; }
      if (own.hashed) counts.idNumbersHashed++;
      if (priors.length > 0) {
        let priorsTouched = false;
        const erasedPriors = priors.map((e) => {
          if (!e || typeof e !== "object") return e;
          const r = pseudonymiseIdentity(e);
          if (r.hashed) counts.idNumbersHashed++;
          if (!r.touched) return e;
          priorsTouched = true;
          return { ...e, ...r.erased };
        });
        if (priorsTouched) { patch.priorIdentities = erasedPriors; touched = true; }
      }
    } else {
      // HELD: the run writes none of it, and SAYS how many identities it kept back — an officer reads the
      // hold in the result and on the audit row instead of inferring it from a date.
      if (pseudonymiseIdentity(patch).touched) counts.identitiesHeld++;
      for (const e of priors) if (e && typeof e === "object" && pseudonymiseIdentity(e).touched) counts.identitiesHeld++;
      // …and whether the row keeps a stored file the release would destroy (an image, or an extra with its file).
      if ((k.documents ?? []).length > 0 || (k.extraRequests ?? []).some((e) => !!e.storageKey)) holdsMore = true;
    }

    // ── TIER ② · the images, and the officer-requested extras that are a second store ──
    if (identityReleased) {
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
        triedKeys.add(doc.storageKey);
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
        if (e.storageKey) triedKeys.add(e.storageKey);
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

  // ── 1b · TIER ② · THE ACCOUNT'S OWN KYC FOLDER IN R2 — what no row points at any more ──────────
  /**
   * ⭐ Part C, 2026-10-11. The loop above destroys the objects a row NAMES. An object no row names any
   * more — a photo a restart dropped from its row without destroying it, an extra an old flow replaced —
   * sits in the same folder (`kyc/<userId>/`, where `putKycDocument` writes this account's own documents)
   * and nothing else will ever reach it: a FULFILLED request over it would say "erased" while it is not.
   * So at the release the folder is listed and every object in it destroyed, on the loop's own rule: a
   * failure is COUNTED in `documentObjectsFailed` and the object waits for the re-run, and a key the loop
   * already tried this run (`triedKeys`) is not tried twice.
   * ⛔ THIS ACCOUNT'S FOLDER ONLY: `kycUserKeyPrefix` refuses an id that could name any other — the agent
   * programme's `kyc/agentapp/…` (other people's documents, `purgeAgentDocumentsForUser`'s) among them —
   * and a refusal counts as a failure, never as an empty folder. ⛔ SO DOES A LISTING THAT FAILS.
   */
  if (identityReleased) {
    const folder = kycUserKeyPrefix(userId);
    let keys: string[] = [];
    let listed = folder !== null;
    if (folder !== null) {
      try {
        keys = await listKycDocumentKeys(folder);
      } catch (err) {
        listed = false;
        console.error("[erasure] the account's KYC folder could not be listed:", (err as Error)?.message ?? err);
      }
    }
    if (!listed) counts.documentObjectsFailed++;
    for (const key of keys) {
      if (triedKeys.has(`r2:${key}`)) continue;
      if (await deleteKycDocument(`r2:${key}`)) counts.orphanObjectsDeleted++;
      else counts.documentObjectsFailed++;
    }
  }

  // ── 2 · SOURCE OF FUNDS — a CDD record, so it moves on the SAME clock as the images ──
  // Occupation and employer are the player's, not the platform's, and nothing but AML
  // retention argues for keeping them.
  // ⭐ Read on BOTH sides of the release (2026-10-11, review PC-1): during the hold a declared source of funds is
  // something the hold holds, so the request stays open for it.
  const sof = await db.sourceOfFunds.get(userId);
  const sofDeclared = !!sof && !!(sof.declaredOccupation || sof.declaredEmployer || sof.declaredOther);
  if (sof && sofDeclared && identityReleased) {
    await db.sourceOfFunds.upsert({
      ...sof,
      declaredOccupation: "",
      declaredEmployer: null,
      declaredOther: null,
    });
  } else if (sofDeclared) holdsMore = true;

  // ── 2b · THE AGENT PROGRAMME — a third-party's documents, and the applicant's own ─────
  // 🔴 A table erasure does not NAME is a table erasure does not reach. `AgentApplication`
  // carries two referees' names and contacts (people who never used 50pick) plus every
  // sentence an officer typed; `AgentApplicationDocument` carries their ID scans and the
  // applicant's CV and residence letter. The words go NOW — no statute keeps a name — and
  // the bytes go under the same 7-year gate as the KYC images, with the same "the row only
  // goes if the bytes went" retry shape (`purgeAgentDocumentsForUser`).
  // ⛔ U33r · `AgentRefereeKey` IS NAMED HERE AND KEPT, on purpose: before the contacts go, each
  // promised referee's number they lead to is keyed (a coded form of the number and nothing else —
  // no number, no instant, no name, no application id, and no column linking it to this person), because the promise
  // "we never contact you for marketing" was made to the REFEREE and must outlive the applicant's
  // erasure (docs/DATA-RETENTION.md). Nothing of the erased person is in that table, so nothing there
  // is theirs to erase.
  counts.agentApplicationsRedacted = await pseudonymiseAgentApplications(userId);
  if (identityReleased) {
    const agentDocs = await purgeAgentDocumentsForUser(userId);
    counts.agentDocumentsDeleted = agentDocs.deleted;
    counts.agentDocumentObjectsFailed = agentDocs.failed;
  } else if (await hasUnpurgedAgentDocuments(userId)) holdsMore = true;

  // ── 2c · DOES THE HOLD HOLD ANYTHING? (2026-10-11, Part C review PC-1 MAJOR-2) ─────────────────────
  // A release date is a promise that something waits for it. Identity is asked only before a withdrawal, so most
  // closed accounts never gave one: no typed identity, no image, no declaration, no agent file. For them the hold
  // holds NOTHING, and a PARTIAL "identity held" with a date seven years out would be a false statement in the
  // compliance queue for all seven. So the run reports a release date only while tier ② still holds something —
  // and when every row says "nothing", it asks the account's folder too (an object no row names), counting a folder
  // it cannot read as held: never FULFILLED on an answer the storage did not give.
  if (!identityReleased && counts.identitiesHeld === 0 && !holdsMore) {
    const folder = kycUserKeyPrefix(userId);
    try {
      if (folder === null || (await listKycDocumentKeys(folder)).length > 0) holdsMore = true;
    } catch (err) {
      holdsMore = true;
      console.error("[erasure] the account's KYC folder could not be listed during the hold:", (err as Error)?.message ?? err);
    }
  }
  const heldAnything = counts.identitiesHeld > 0 || holdsMore;
  const heldUntil = identityReleased || !heldAnything ? null : releaseAt.slice(0, 10);

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

  // ── 4b · HOUSE BOTS — a label can be the holder's name (04 A5, R6) ──────────────────────────────
  // ⚠️ The labels are read BEFORE the rows are pseudonymised: afterwards they read "Erased <TAIL6>" and would
  // match nothing already written into an admin's inbox. Ids, markers, intents and amounts are kept.
  // A re-run reports zero, like every other step: a bot already reading "Erased <TAIL6>" is not counted again.
  for (const bot of await houseBotStore.listByUserId(userId)) {
    const tail = bot.id.slice(-6).toUpperCase();
    if (bot.label === `Erased ${tail}`) continue;
    counts.houseBots++;
    // ⛔ SCOPED to this bot's own notices (review LI-9): a removed label is free for another holder's live bot, and
    // an unscoped rewrite would rename that bot in every officer's inbox. HOUSE_BOT rows that link to this bot, or
    // were written while it was designated (live labels are unique, so no other bot bore it then).
    counts.houseBotNotificationsRedacted += await db.notification.redactFragment(`"${bot.label}"`, `"Erased bot ${tail}"`, {
      kind: "HOUSE_BOT", hrefIncludes: bot.id, createdFrom: bot.designatedAt, createdTo: bot.removedAt ?? new Date().toISOString(),
    });
  }
  const house = await houseBotStore.pseudonymiseForUser(userId);
  // A bot designated between the refusal above and here cannot happen (designation refuses a CLOSED account),
  // but the DAL refuses again under its row locks — surface it rather than report a complete erasure.
  if (!house.ok) throw new Error(`erasure: ${userId} became house bot ${house.botId} during erasure — re-run after removing it`);

  // ── 4c · MARKETING — the consent withdrawn, the book emptied (U18b) ───────────────────────────────
  // 🔴 Before this, erasure touched no marketing store: on Postgres the tombstoned phone hid the player
  // from the gate, which then read the LEDGER and found their old GIVEN. ⛔ It must run BEFORE step 6
  // tombstones the phone — the number is the only key the ledger and the book share — so a re-run (phone
  // already tombstoned) has nothing to key on and skips it; every write in it is idempotent, so a first
  // pass that died part-way is finished by the next. ⛔ No stop-list row: `marketing/erase.ts` says why.
  // ⭐ U16a · ITS LAST STEP KEYS ON THE ACCOUNT ID, which the tombstone does not touch — so a RE-RUN still reaches the
  // campaign records: a recipient row linked to this account since the first pass (an enqueue that walked the account
  // before its number was tombstoned) loses its link now, through the same helper, and a re-run with nothing new
  // reports 0 (the AnonymizeOutcome contract above).
  if (!wasErased) {
    Object.assign(counts, await eraseMarketingFor({ userId, phoneE164: user.phoneE164, officerId: opts?.officerId ?? null }));
  } else {
    counts.campaignRecipientsUnlinked = await unlinkCampaignRecipients(userId);
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
      // ⭐ THE ASSUMED CLOCK, WRITTEN (2026-10-11, reviews PC-1/PC-3): a CLOSED account with no closure date is counted from
      // this first run, and only a written date stops every re-run restarting it — the release would move seven years
      // each time and the identity would never be released. In this existing row write, not a write of its own: a new
      // writer of an account fact is `test:house-bot-holder-lifecycle` §1's ratchet to raise, and this needs none.
      ...(user.closedAt ? {} : { closedAt }),
    });
  }

  // ── 7 · THE RECORD THAT IT HAPPENED ─────────────────────────────────────────────────
  //
  // ⛔ NOT ONE FIELD OF THE ERASED DATA IN THE PAYLOAD. The audit chain is append-only and
  // kept 7 years, so a payload naming the phone number would make the log the last place
  // the erased number survives — an erasure routine that writes the data into the one
  // table that cannot be pruned.
  // ⚠️ The two hold keys keep their 2026-08-21 names (`documentsReleased`, `documentsHeldUntil`) because the
  // chain's readers query them; since Part C they speak for the typed identity too, and the counts say what
  // the run held back (`identitiesHeld`) and what it swept from the folder (`orphanObjectsDeleted`).
  audit({
    category: "COMPLIANCE",
    action: "privacy.erasure.completed",
    actorId: null,
    targetType: "User",
    targetId: userId,
    payload: {
      alreadyErased: wasErased,
      documentsReleased: identityReleased,
      documentsHeldUntil: heldUntil,
      nothingHeld: !identityReleased && !heldAnything,
      holdYears: KYC_DOCUMENT_HOLD_YEARS,
      ...counts,
    },
  });

  return {
    ok: true,
    alreadyErased: wasErased,
    documentsReleased: identityReleased,
    // Null when released OR when nothing was held (step 2c) — the request is then FULFILLED, not "held".
    documentsHeldUntil: heldUntil,
    counts,
  };
}
