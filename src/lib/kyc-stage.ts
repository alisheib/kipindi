/**
 * THE ROSTER'S KYC STAGE — one derived word per player, from four scalars.
 *
 * ⭐ WHY IT EXISTS, IN THE OWNER'S OWN WORDS (2026-09-11): *"in roster i can see
 * players as admin but those who uploaded kyc can i have a unique tag for them …
 * because it says pending kyc always how i know who uploaded and how not,
 * especially with so many users coming in daily."*
 *
 * He is right, and the cause is not cosmetic. `/admin/players` renders
 * `<AccountStatusBadge status={u.status} />` — the ACCOUNT column — so four
 * different people read one identical word:
 *
 *   · registered, never opened KYC        → no KycSubmission row AT ALL
 *   · opened it, uploaded nothing          → IN_PROGRESS, 0 documents
 *   · uploaded everything, never submitted → IN_PROGRESS, documents > 0   ⭐
 *   · submitted, waiting on US             → PENDING_REVIEW               ⭐
 *
 * The two starred rows are the request. Nothing in the console showed them
 * apart, and the third is invisible platform-wide: `listPendingKyc`
 * (kyc-service.ts:608) reads only PENDING_REVIEW + ADDITIONAL_INFO_REQUIRED, so
 * a player who uploaded every photo and never pressed Confirm is in no queue,
 * on no screen, and nobody chases them.
 *
 * ⛔ THIS MODULE IS PURE, IMPORTS NOTHING, AND CARRIES NO "use client".
 * It is called from src/app/admin/players/page.tsx (a SERVER component) and
 * imported type-only by src/components/admin/status-badge.tsx, which client
 * components reach. A "use client" helper called from a server component takes
 * down every page that imports it while BOTH `tsc` and `next build` stay green —
 * the client/server boundary is a RUNTIME contract. The status union below is
 * declared structurally rather than imported from @/lib/server/store for the same
 * reason, and it lets the derivation be unit-tested without booting a store.
 *
 * ⛔ WHY NOT `KycSubmission.status` ALONE — this is the whole point.
 * `attachDocument` (kyc-service.ts:449-473) spreads `...k` and NEVER writes
 * status; its only guard refuses PENDING_REVIEW / APPROVED (:459-461). Submit is
 * a separate explicit button. So IN_PROGRESS spans "opened the page and did
 * nothing" through "attached every required photo and never pressed Confirm".
 *
 * ⛔ WHY NOT `User.status`, IN EITHER DIRECTION. Nothing demotes it on REJECT
 * (kyc-service.ts:838) or on force-reverify (:672), and responsible-gambling.ts
 * overwrites it with no KYC precondition — so ACTIVE+REJECTED and
 * SELF_EXCLUDED+IN_PROGRESS are both reachable. An ACCOUNT fact cannot answer an
 * IDENTITY question, which is exactly why the roster has been wrong.
 */

/** The six arms of the `KycStatus` enum in prisma/schema.prisma. Declared
 *  structurally, not imported — see the header. `test:kyc-stage` parses the enum
 *  out of the schema and asserts this union is exhaustive over it, so a seventh
 *  arm goes red there as well as failing to compile in `kycStage` below. */
export type KycStatusToken =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ADDITIONAL_INFO_REQUIRED";

/**
 * The four facts the tag is allowed to read.
 *
 * ⛔ `idVerifiedAt` IS DELIBERATELY ABSENT. It means "format accepted and
 * unique", never "an authority confirmed this identity" (prisma/schema.prisma,
 * docs/IDENTITY-POLICY.md), and scripts/kyc-status-honesty.test.mts exists
 * because a green "ID verified" pill was once bound to that exact field and was
 * false in all three languages. Splitting "opened it" from "typed their number"
 * also gives an officer no different action.
 *
 * ⛔ `extraRequests` IS ABSENT, AND NOT FOR TIDINESS. It is a `Json?` column whose
 * entries carry a `storageKey` that is a FULL base64 data URL under inline
 * storage — selecting it for a whole population pulls image bytes through a
 * roster render. All three ADDITIONAL_INFO_REQUIRED sub-states mean the same
 * thing to a roster scanner ("with the player"), so the column loses nothing;
 * they stay on /admin/players/[id], which reads one row at a time.
 */
export type KycStageFacts = {
  status: KycStatusToken;
  /**
   * How many document slots this submission holds.
   *
   * ⛔ ONLY EVER COMPARED TO ZERO — never to a required total, and the
   * restriction is a ruling, not an oversight. kyc-service.ts:503-506 puts it in
   * those words: *"`documents.length >= 3` was true of a NIDA and is a lie about
   * a passport"* — a NIDA needs 3 slots, a passport / licence / voter card 2.
   * Completeness is `missingSlots`' job inside `submitForReview`, and its OUTPUT
   * is `submittedAt`, which is a separate witness below.
   */
  documentCount: number;
  /** Written in exactly ONE place — kyc-service.ts:533, the transition INTO
   *  PENDING_REVIEW, which `missingSlots` gates — and cleared in exactly one,
   *  `startKyc`. Proof that a COMPLETE file once reached us. */
  submittedAt: string | null;
  /** 🔴 SET ONCE, NEVER CLEARED — `startKyc` explicitly carries it through a
   *  reset ("THE ONE FIELD THIS RESET MUST NOT CLEAR"). The only witness that
   *  survives both a restart and erasure. */
  approvedAt: string | null;
};

/** Where this person's identity file stands. ⛔ NOT a re-spelling of KycStatus —
 *  REJECTED splits in two and IN_PROGRESS splits in two, which is the request. */
export type KycStage =
  | "nothing_yet"
  | "uploaded"
  | "with_us"
  | "more_needed"
  | "rejected_after_upload"
  | "rejected_no_docs"
  | "approved";

/**
 * ⭐ A SEPARATE TYPE, SO `tsc` PROVES `kycStage()` CANNOT EMIT IT. "The read
 * failed" is the PAGE's state, never the data's — the A-5 rule: a failed read
 * must never render as a fact, the same line players/page.tsx already draws for
 * wallets. ⛔ It is also NOT a filter value: a failed read is not a population,
 * and offering it would promise rows that do not exist.
 */
export type KycCell = KycStage | "unreadable";

/** Scan order = workflow order: what has not started, what is with the player,
 *  what is with US, then the decided. ONE exported constant — the column, the
 *  filter's options, the guards and the live driver all read it, so the "three
 *  renderings of one enum" defect players/page.tsx records paying for cannot
 *  recur here. */
export const KYC_STAGES = [
  "nothing_yet",
  "uploaded",
  "with_us",
  "more_needed",
  "rejected_after_upload",
  "rejected_no_docs",
  "approved",
] as const satisfies readonly KycStage[];

/** URL-token guard for `?kyc=`. An unrecognised value falls back to "" at the
 *  call site and matches everything, exactly as an unvalidated `?status=` does. */
export function isKycStage(v: string | undefined): v is KycStage {
  return !!v && (KYC_STAGES as readonly string[]).includes(v);
}

/**
 * EVIDENCE THAT A COMPLETE FILE ONCE REACHED US.
 *
 * ⛔ USED ON THE `REJECTED` ARM ONLY, AND THAT RESTRICTION IS THE WHOLE POINT.
 * `startKyc` clears `documents` and `submittedAt` but EXPLICITLY PRESERVES
 * `approvedAt`. So on the IN_PROGRESS / NOT_STARTED arm `approvedAt` is a fact
 * about the PAST, not about this attempt: applying this helper there would paint
 * "Uploaded · not sent" over a once-approved player who has uploaded nothing
 * since restarting. That path is entirely shipped code — APPROVED →
 * `forceReverifyKyc` → officer REJECT → the player taps "start again", which
 * `startKyc` permits because the status is REJECTED.
 *
 * ⭐ On the REJECTED arm all three witnesses are honest AND the extra two are
 * load-bearing: erasure destroys document rows from ANY status, so
 * `documentCount` alone would call an officer-refused complete file "nothing
 * sent" once the retention window released its images.
 */
export function kycFileEverArrived(f: KycStageFacts): boolean {
  return f.documentCount > 0 || f.submittedAt !== null || f.approvedAt !== null;
}

/**
 * THE DERIVATION. Total over `KycStageFacts | null`, deterministic, side-effect
 * free, and exhaustive by construction: the `switch` covers all six enum arms and
 * the `default` assigns `status` to `never`, so a seventh arm in
 * prisma/schema.prisma is a COMPILE ERROR here rather than a silent fall-through
 * to whichever word happens to be last.
 *
 * ⛔ `null` IS A REAL PRODUCTION INPUT, NOT AN ERROR — and it is the single most
 * common one on a young platform. No registration path writes a KycSubmission;
 * the row is created LAZILY on the first render of /profile/kyc (page.tsx:61),
 * inside a `try {} catch {}` that swallows failure. A player who registers and
 * never opens that page has NO ROW, and "no row" is the truest possible
 * "nothing yet".
 * ⛔ A FAILED READ IS NOT THIS. The caller renders "unreadable" — see the page.
 */
export function kycStage(facts: KycStageFacts | null): KycStage {
  if (facts === null) return "nothing_yet";
  const { status, documentCount } = facts;

  switch (status) {
    // Decided, and the only stage that needs no further reading. `reviewKyc`
    // APPROVE also stamps `approvedAt`.
    case "APPROVED":
      return "approved";

    // ⭐ THE ONLY STAGE WHERE THE BALL IS IN OUR COURT — which is the question an
    // officer actually opens this page to answer. It is also the only status that
    // GUARANTEES a complete document set: `submitForReview` refuses unless
    // identity is accepted, `missingSlots` is empty, the document is unexpired
    // and every officer-requested extra is filled.
    case "PENDING_REVIEW":
      return "with_us";

    // Two writers, one word: `reviewKyc` REQUEST_INFO and `forceReverifyKyc`.
    // All three sub-states mean the same thing to a roster scanner — waiting on
    // the PLAYER (`attachExtraDocument` never changes status, so "extras in, not
    // resubmitted" is still this).
    case "ADDITIONAL_INFO_REQUIRED":
      return "more_needed";

    // 🔴 THE SPLIT THAT ANSWERS THE OWNER DIRECTLY. REJECTED conflates two
    // opposite realities: `submitIdentityStep` refusing an underage or unmatched
    // applicant BEFORE any upload is possible, and an officer refusing a COMPLETE
    // file. One word for both would repeat, inside the rejection bucket, the very
    // defect being fixed — and would make every rejected applicant invisible to
    // the question "who has not given us their documents".
    case "REJECTED":
      return kycFileEverArrived(facts) ? "rejected_after_upload" : "rejected_no_docs";

    // NOT_STARTED is schema-legal and effectively unreachable as a STORED value
    // in production (the column default is IN_PROGRESS and `startKyc` writes
    // IN_PROGRESS). It is handled as a live arm anyway: a migrated row can carry
    // it, and /auth/demo?kyc=none writes `{...existing, status:"NOT_STARTED"}`
    // which PRESERVES documents — so the pair (NOT_STARTED, documentCount > 0) is
    // constructible and must not fall through to a wrong word.
    case "NOT_STARTED":
    case "IN_PROGRESS":
      // ⛔ `documentCount` ALONE — NOT `kycFileEverArrived`. See that helper's
      // header: `startKyc` clears documents and `submittedAt` but preserves
      // `approvedAt`, so the three-witness rule HERE would falsely read a
      // restarted, once-approved player as having uploaded something.
      //
      // ⚠️ THIS ARM IS ONLY HONEST BECAUSE OF A FIX SHIPPED WITH IT. Until
      // 2026-09-11 `prisma-dal.ts`'s `kyc.upsert` guarded its document delete
      // with `if (k.documents?.length)`, so a restart left the previous attempt's
      // images attached in Postgres while the in-memory half cleared them. The
      // tag would have read "Uploaded · not sent" for a player who had uploaded
      // nothing. The two halves now agree; `test:kyc-stage-service` is the
      // regression guard and it must pass on BOTH backends.
      return documentCount > 0 ? "uploaded" : "nothing_yet";

    default: {
      // ⭐ EXHAUSTIVENESS, ENFORCED BY tsc. A seventh KycStatus arm stops
      // compiling here instead of quietly reading "Nothing yet" at runtime.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
