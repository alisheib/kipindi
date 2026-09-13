/**
 * Admin status-label lexicon — the ONE source of truth for the bilingual
 * (English · Kiswahili) status vocabulary rendered across the operator console.
 *
 * WHY THIS EXISTS
 * ---------------
 * The admin console renders its status labels as inline bilingual literals
 * ("English · Kiswahili" in a single span, or as an `AdminCard title=/sw=` pair)
 * rather than through the trilingual player dict (`i18n-dict.ts`). Because those
 * literals were hand-typed at ~12 call sites, the same concept drifted into
 * divergent wordings — e.g. the two-officer note read "Afisa wa pili anahitajika"
 * in the resolver ceremony but a truncated "Afisa wa pili" on the report-pack
 * controls. This module makes each concept a single named constant so the drift
 * cannot recur: change the word once here, every surface follows.
 *
 * SWAHILI PROVENANCE (never fabricated)
 * -------------------------------------
 * Every `sw` string is lifted verbatim from an existing, already-shipped source
 * — the admin surfaces themselves (the most complete variant wins) or the blessed
 * player dict (`i18n-dict.ts`). No new translations are invented here.
 *
 * SHAPE
 * -----
 * Each entry is `{ en, sw? }`. Surfaces that render one language only (uppercase
 * chips, toast titles, server-action error messages) use `.en`; surfaces that show
 * both languages use `bi()` for the "English · Kiswahili" join or the `.en`/`.sw`
 * pair directly (e.g. `AdminCard title={x.en} sw={x.sw}`).
 *
 * Plain constants only — no server-only imports — so it is safe to import from
 * server components, "use client" components, and server actions alike.
 *
 * Families are migrated one per verified push (see docs/status-lexicon-inventory.md).
 * Family 3 (two-officer resolution ceremony) is first.
 */

import { PAYMENT_METHODS } from "@/lib/payment-providers";

export type AdminLabel = { en: string; sw?: string };

/** Bilingual inline join: `"English · Kiswahili"` (falls back to English alone
 *  when the label carries no Swahili). Matches the console's existing " · " form. */
export function bi(label: AdminLabel): string {
  return label.sw ? `${label.en} · ${label.sw}` : label.en;
}

/**
 * ⭐ THE WORDS ARE HERE. THE COLOURS ARE NOT — THEY ARE IN `@/lib/status-tone` (D4).
 *
 * This module gave a status WORD one definition site. Nothing did the same for its
 * COLOUR, so the same word was painted differently depending on which file happened
 * to render it — LIVE was red to a player and green in this console, CLOSED and
 * PENDING were royal to a player and amber here, APPROVED was green in the KYC queue
 * and a solid gold gradient on /proposals — and not one of the divergences was written
 * down, so a reader could not tell a decision from a drift.
 *
 * `src/lib/status-tone.ts` is now the one home for word × surface × tone, and
 * DESIGN_AUTHORITY §B11 is the law. ⛔ Do not hand-type a chip variant beside a label
 * from this file: add the word to that dictionary, and let both surfaces read it.
 */
/**
 * FAMILY 3 — two-officer resolution ceremony.
 * Spans ADM1 regulator packs (maker-checker), ADM2 resolver queue + ceremony,
 * and the KYC/AML co-sign gates. All share the same "one officer stages, a
 * different officer countersigns" vocabulary.
 */
export const CEREMONY = {
  /** The gate note shown to the officer who staged/prepared and therefore cannot
   *  also seal. Canonical SW = the complete "…anahitajika" form (resolver ceremony);
   *  the report-pack controls previously truncated it to "Afisa wa pili". */
  secondOfficerRequired:  { en: "Second officer required", sw: "Afisa wa pili anahitajika" },
  /** The rule itself, as a section/attestation header. SW from i18n-dict resTwoOfficer. */
  twoOfficerRule:         { en: "Two-officer rule",        sw: "Kanuni ya maofisa wawili" },
  twoOfficerAttestation:  { en: "Two-officer attestation", sw: "Uthibitisho wa maafisa wawili" },
  /** Stage labels. SW from i18n-dict step1/step2. */
  stage1:                 { en: "Stage 1",                 sw: "Hatua ya 1" },
  stage2:                 { en: "Stage 2",                 sw: "Hatua ya 2" },
  /** Queue/KPI state: a staged item waiting for the countersignature. */
  awaitingSecondSignature:{ en: "Awaiting 2nd signature",  sw: "Inasubiri saini" },
  /** Short EN-only state labels (uppercase chips / muted captions). */
  awaitingSecondOfficer:  { en: "Awaiting 2nd officer" },
  awaitingStage1:         { en: "Awaiting Stage 1" },
  awaitingSignature:      { en: "awaiting signature" },
  coSignRequired:         { en: "Co-sign required" },
  /** The objection window that opens on seal — its LENGTH is live config and is never restated
   *  here. SW from resolver page. */
  objectionWindow:        { en: "Objection window",        sw: "Dirisha la pingamizi" },
  /** Officer evidence captured at Stage 1. SW = "Ushahidi" (evidence). */
  recordedEvidence:       { en: "Recorded evidence",       sw: "Ushahidi" },
  evidenceExcerpt:        { en: "Evidence excerpt",        sw: "Ushahidi" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 2 — selection / betting-close.
 * One underlying state ("new predictions are no longer accepted; the market is
 * waiting to be resolved") that had drifted into many admin wordings — the same
 * bilingual field label appeared as both "Selection Close" and "Selection close"
 * in a single file, and the ai-poll config help text quoted a title-cased
 * "Selection Closed — Waiting for Results" that no longer matched the sentence-
 * cased string players actually see.
 */
export const SELECTION = {
  /** The close-time field label (form input). Canonical case = sentence case,
   *  matching the dict's "Selection closes" style; SW from i18n-dict
   *  selectionCloseDate. Fixes the "Selection Close" vs "Selection close" drift. */
  selectionClose:         { en: "Selection close",  sw: "Kufunga uchaguzi" },
  /** Read-only header showing WHEN selections close (a date value follows).
   *  SW from i18n-dict selectionCloseDate. */
  selectionCloses:        { en: "Selection closes", sw: "Uchaguzi unafungwa" },
  /** Present tense — "when betting closes"; used where the close-time may be
   *  future (markets list/detail, AI-poll cards). A timestamp follows. EN-only. */
  betsClose:              { en: "Bets close" },
  /** Past tense — betting HAS ended (resolver queue, always past selection-close).
   *  A close-time follows. EN-only surface. */
  betsClosed:             { en: "Bets closed" },
  /** The exact player-facing post-cutoff string, quoted in admin help text so the
   *  operator sees the real wording. SW from i18n-dict selectionClosedWaiting. */
  selectionClosedWaiting: { en: "Selection closed — waiting for results", sw: "Uchaguzi umefungwa — tunasubiri matokeo" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 1 — market-lifecycle enum.
 * The canonical human label for each `MarketStatus` value
 * (`src/lib/server/market-service.ts`). Rendered through the shared
 * `<MarketStatusBadge>` (src/components/admin/status-badge.tsx), which owns the
 * chip-variant mapping — replacing the raw `<Chip>{m.status}</Chip>` + the
 * per-file `STATUS_LABEL` map that had one surface show the raw enum ("LIVE")
 * and another a title-cased label ("Live"). Keys are the enum values lower-cased.
 * EN-only: chips render a single token (the Chip atom upper-cases via CSS).
 */
export const LIFECYCLE = {
  draft:    { en: "Draft" },
  live:     { en: "Live" },
  closed:   { en: "Closed" },
  resolved: { en: "Resolved" },
  voided:   { en: "Voided" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 4 — review-workflow states (KYC + DSAR).
 * Human labels for the review enums that were being rendered raw to officers —
 * `<Chip>{kyc.status}</Chip>` printed the screaming enum "PENDING_REVIEW" /
 * "ADDITIONAL_INFO_REQUIRED" (underscores and all), and the DSAR chip printed
 * "FULFILLED". Rendered through `<KycStatusBadge>` / `<DsarStatusBadge>`
 * (src/components/admin/status-badge.tsx), which own the enum→variant mapping.
 * EN-only (officer console). "additional-info" reuses the player dict wording
 * ("More information needed", i18n-dict `kycMoreInfo`).
 *
 * Proposal review states are NOT here — they already flow through the trilingual
 * dict via `<StatusBadge>` (src/components/proposals/status-badge.tsx).
 * Withdrawal/AML txn states render no raw-enum chip in the admin UI today.
 */
export const REVIEW = {
  // KYC (StoredKyc.status)
  kycNotStarted:      { en: "Not started" },
  kycInProgress:      { en: "In progress" },
  kycPendingReview:   { en: "Pending review" },
  kycApproved:        { en: "Approved" },
  kycRejected:        { en: "Rejected" },
  /** ⭐ 2026-09-13 — a REJECTED row on a FINAL code (`isFinalRefusal`, src/lib/kyc-refusal.ts). "Rejected" alone
   *  read as retryable, while a final refusal freezes the wallet and the player cannot resubmit. The word is
   *  /admin/kyc/refused's own ("Finally refused accounts"). Chosen by `kycStatusLabel(status, rejectReason)`. */
  kycRefusedFinal:    { en: "Finally refused" },
  kycAdditionalInfo:  { en: "More information needed" },
  // DSAR / privacy request status
  dsarPending:        { en: "Pending" },
  // ⭐ Named for what an officer must DO about it, not for a fraction. A partially fulfilled
  // erasure is still open work: the PII is gone and the statutory documents are held to a
  // date, and the request stays in the queue because nothing else remembers that date.
  dsarPartial:        { en: "Partly done · docs held" },
  dsarFulfilled:      { en: "Fulfilled" },
  // Agent programme (StoredAgentApplication.status) — the officer's words. The applicant's
  // words live in `dict.agent.status*` in three languages; these are console English.
  agentDraft:          { en: "Draft" },
  agentInvited:        { en: "Invited · awaiting acceptance" },
  agentKycSubmitted:   { en: "Documents attached" },
  agentPaymentPending: { en: "Ready to submit" },
  agentUnderReview:    { en: "Awaiting approval" },
  agentInfoRequired:   { en: "More information requested" },
  agentApproved:       { en: "Approved" },
  agentRejected:       { en: "Rejected" },
  agentDeclined:       { en: "Declined" },
  agentExpired:        { en: "Expired" },
  agentRevoked:        { en: "Revoked" },

  // Agent invitation (StoredAgentInvitation.status) — console English.
  agentInviteIssued:   { en: "Issued" },
  agentInviteAccepted: { en: "Accepted" },
  agentInviteDeclined: { en: "Declined" },
  agentInviteRevoked:  { en: "Withdrawn" },
  agentInviteExpired:  { en: "Expired" },
  dsarRejected:       { en: "Rejected" },
  // DSAR request TYPE — what the subject asked for. Added because the queue's Type
  // column printed the raw `DsarType`, and "ERASURE" in database spelling is the
  // one word on that page an officer must not misread: it is the irreversible one.
  dsarTypeAccess:      { en: "Access" },
  dsarTypeErasure:     { en: "Erasure" },
  dsarTypeCorrection:  { en: "Correction" },
  dsarTypePortability: { en: "Portability" },
} satisfies Record<string, AdminLabel>;

/**
 * The roster's DERIVED KYC stage (src/lib/kyc-stage.ts) — 2026-09-11, Ali's request:
 * *"those who uploaded kyc can i have a unique tag for them … because it says pending
 * kyc always how i know who uploaded and how not."*
 *
 * ⛔ A NEW FAMILY, NOT AN EDIT OF `REVIEW.kyc*` ABOVE. Those six are the RAW
 * `KycStatus`, and `kycStatusLabel` lower-cases them into the running sentence
 * "Identity verification is …" at admin/agents/[id]/page.tsx — which "Uploaded · not
 * sent" does not fit. These eight answer a different question: has this person given
 * us their documents, and whose move is it now.
 *
 * ⭐ THE FIRST WORD SAYS WHOSE MOVE IT IS, because that is the only decision an officer
 * scanning 500 rows actually makes. Exactly ONE of the eight is ours. The two-part
 * `X · Y` form is this family's existing idiom — `REVIEW.agentInvited` ("Invited ·
 * awaiting acceptance"), `REVIEW.dsarPartial` ("Partly done · docs held").
 *
 * ⭐ THE EIGHTH (2026-09-13) IS "Funded · nothing sent" — the money dimension of
 * src/lib/kyc-stage.ts. From that date identity is asked before a withdrawal and before
 * nothing else, so a player can hold real money with no file at all, and that person was
 * reading "Nothing yet" beside the dormant majority. ⛔ "Funded", never "Unverified": the
 * first reads a balance, the second reads like an officer's finding about a person.
 *
 * ⛔ "SUBMITTED" APPEARS ON EXACTLY ONE ENTRY, and it is the one where `submittedAt` is
 * non-null by construction (kyc-service.ts:533 writes the status and the timestamp
 * together). `uploaded` is a player who attached every required photo and never pressed
 * the button; calling that "Submitted" would be the same lie in a new colour — and
 * NOTHING in the suite would catch it, because `test:kyc-copy-truth` matches three phrase
 * rules (deny∧money∧identity, identity bound to the entrance, a Gaming Board attribution)
 * over dict leaves and legal paragraphs and never compares a word to a state, while `kyc-status-honesty.test.mts` is hardcoded to
 * src/app/profile/kyc/page.tsx. `test:kyc-stage` §2a-§2d is written to close that hole.
 *
 * ⛔ NO ENTRY CONTAINS "verified". `idVerifiedAt` means FORMAT ACCEPTED AND UNIQUE,
 * never "an authority confirmed this identity" (docs/IDENTITY-POLICY.md) — and
 * `kyc-status-honesty.test.mts` exists because that exact word was once bound to that
 * exact field, in all three languages. `approved` reuses `REVIEW.kycApproved`, which
 * names what a human officer actually did.
 * ⛔ NO ENTRY CONTAINS "Pending". Until 2026-09-13 the Account column on the SAME ROW
 * read "Pending KYC" and both render upper-cased — "PENDING KYC" beside "PENDING REVIEW"
 * two cells apart was the complaint relocated, not answered. From 2026-09-13 that column
 * presents a `PENDING_KYC` straggler as Active (status-badge.tsx `presentedAccountStatus`),
 * and the ban STAYS for a stronger reason: under the new ladder nothing is pending on an
 * unverified account — depositing and playing are open — so "Pending" would now be false
 * on its own terms, not merely confusing.
 *
 * EN-only, like every family on this console. ⛔ No `sw`: the provenance rule at the top
 * of this file forbids inventing Swahili, and five of these eight have no shipped source
 * to lift from. Glossing three of eight because a source happens to exist for those
 * three IS the inconsistency.
 * ⚠️ All eight read correctly in CAPS — the Chip atom upper-cases via CSS.
 * ⚠️ NON-BREAKING SPACES AROUND EACH MIDDLE DOT (2026-09-13). A narrow roster column wrapped
 * "Rejected · after upload" AT the dot, leaving it orphaned at the start or end of a line. The
 * two-part words still wrapped between the words after the dot, never around the dot itself.
 * ⛔ AND, FROM A LATER RE-INSPECTION THE SAME DAY, BETWEEN EVERY WORD. At 1280 the roster chip still
 * split inside its capsule ("REJECTED · AFTER" / "UPLOAD"). The Chip atom sets its white-space to
 * normal INLINE (its G-7 fix), so a nowrap class on the table cell cannot reach the label; the phrase
 * itself has to be unbreakable. Every entry below is one unbreakable phrase, and the roster table
 * scrolls sideways (ScrollX) rather than splitting a status in two.
 */
export const KYC_STAGE = {
  nothingYet:          { en: "Nothing\u00a0yet" },
  /** ⭐ 2026-09-13 — nothing sent AND holding money (`walletHeldTzs > 0`, never approved).
   *  ⛔ Only ever rendered to a viewer with money rights: "holding money" is a standing-
   *  balance fact, and SUPPORT reads `money.figures` masked. To that viewer the same person
   *  reads "Nothing yet", which claims only what it always claimed — nothing sent. */
  fundedNothingYet:    { en: "Funded\u00a0·\u00a0nothing\u00a0sent" },
  uploaded:            { en: "Uploaded\u00a0·\u00a0not\u00a0sent" },
  withUs:              { en: "Submitted\u00a0·\u00a0with\u00a0us" },
  moreNeeded:          { en: "More\u00a0needed\u00a0·\u00a0player" },
  rejectedAfterUpload: { en: "Rejected\u00a0·\u00a0after\u00a0upload" },
  rejectedNoDocs:      { en: "Rejected\u00a0·\u00a0nothing\u00a0sent" },
  /** A failed READ is its own labelled state, never a fabricated fact — the same line
   *  the roster already draws for a failed wallet read. The in-file precedent for
   *  wording an absence is `UPDOWN.readingNone`. */
  unreadable:          { en: "Not\u00a0available" },
} satisfies Record<string, AdminLabel>;

/**
 * The roster's MONEY axis — `?funded=` (src/lib/kyc-stage.ts `FUNDED_AXIS`), 2026-09-13.
 *
 * ⭐ A SECOND AXIS, NOT MORE STAGE WORDS. "Holding money" is independent of where the identity
 * file stands, and the combination is the question an officer now asks: `?kyc=with_us&funded=held`
 * is "submitted, and money is waiting on our review", which no single stage word can say.
 *
 * ⛔ ONLY RENDERED TO A VIEWER WITH MONEY RIGHTS (`canView(role, "accounting")`). Whether an
 * account holds money is a standing-balance fact, and SUPPORT reads `money.figures` masked —
 * movements yes, totals no (roles.ts DEFAULT_READ_GRANTS).
 * ⛔ EN-only, no `sw` — the provenance rule at the top of this file; no shipped source exists.
 */
export const FUNDED = {
  held:       { en: "Holding money" },
  none:       { en: "No money held" },
  /** The wallet read FAILED. ⛔ Never "No money held": that is a claim about the account, and
   *  a broken read is a fact about our database. */
  unreadable: { en: "Not available" },
} satisfies Record<string, AdminLabel>;

/**
 * F11 — player objections to a market verdict (StoredObjection.status + remedy).
 *
 * The Swahili here is lifted from already-shipped surfaces, per the rule at the
 * top of this file: "Dirisha la pingamizi" is CEREMONY.objectionWindow, and the
 * player-facing dict already ships "Pinga matokeo haya" / "pingamizi".
 */
export const OBJECTION = {
  // Status. OPEN is the one that matters: it FREEZES the market's settlement.
  open:      { en: "Open · settlement frozen", sw: "Wazi · malipo yamesimamishwa" },
  upheld:    { en: "Upheld", sw: "Limekubaliwa" },
  rejected:  { en: "Rejected", sw: "Limekataliwa" },
  // Remedies available ONLY while the market is unsettled.
  remedyVoid:    { en: "Void & refund every stake", sw: "Batilisha na urejeshe dau zote" },
  remedyReverse: { en: "Reverse the verdict", sw: "Geuza uamuzi" },
  // Reasons a player can give.
  reasonWrongOutcome:      { en: "Result is wrong" },
  reasonSourceContradicts: { en: "Source contradicts the verdict" },
  reasonAmbiguousCriterion:{ en: "Criterion does not decide it" },
  reasonResolvedEarly:     { en: "Resolved before the event finished" },
  reasonOther:             { en: "Other" },
  // The thing an officer must understand before they act.
  frozenNotice: { en: "This market's money is frozen while this objection is open", sw: "Fedha za soko hili zimesimamishwa wakati pingamizi hili liko wazi" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 6 — account status (players AND staff share one enum).
 *
 * The EN words are not invented here either: they are lifted from the two places
 * /admin/players had ALREADY written them — the status `<Select>` options and the
 * `MIX_ORDER` legend of the population bar — which is precisely the two-homes-for-
 * one-word drift §L2 is about. The chips beside them, meanwhile, printed the raw
 * column: "SELF_EXCLUDED" and "PENDING_KYC" reached an officer verbatim on the
 * player list, the player detail, the DSAR export list and both staff surfaces.
 *
 * SW provenance: "Hai" is the Active KPI on this very page (and /admin/markets),
 * "Kujitenga" is the dict's `selfExclusion`, "Imefungwa" its `accountClosed`,
 * "Pumzika kidogo" its `coolingOff`, "Imesitishwa" its `errSuspended`.
 *
 * ⛔ `pendingKyc` ("Pending KYC") WAS HERE AND IS GONE — 2026-09-13, deliberately, not tidied.
 * `User.status = "PENDING_KYC"` was written at registration and GATED NOTHING (sign-in refuses only
 * suspended, closed and self-excluded accounts). Once identity moved to withdrawal only, the word
 * labelled every ordinary, happily-playing customer as pending something, and the roster told an
 * officer the whole population "needs review". New accounts are created ACTIVE and the migration
 * `20260913120000_kyc_at_withdrawal` normalises the existing rows. A straggler that reaches a screen
 * anyway (a row written by a container still on the old code mid-deploy) is PRESENTED as `active`
 * — see `presentedAccountStatus` in src/components/admin/status-badge.tsx, which keeps the lookup
 * total over the enum. ⛔ Do not restore the word: it would be a false statement about the account,
 * and the enum member stays only because removing one is a migration.
 */
export const ACCOUNT = {
  active:       { en: "Active",        sw: "Hai" },
  suspended:    { en: "Suspended",     sw: "Imesitishwa" },
  selfExcluded: { en: "Self-excluded", sw: "Kujitenga" },
  cooledOff:    { en: "Cooled off",    sw: "Pumzika kidogo" },
  closed:       { en: "Closed",        sw: "Imefungwa" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 7 — money movement: what a transaction IS, where it stands, and which
 * rail carried it (`StoredTxn.type` / `.status` / `.provider`).
 *
 * ⚠️ REAL MONEY, so this is the family that mattered most. /admin/transactions
 * rendered all three columns as `value.replace(/_/g, " ")` — an officer reconciling
 * against a Selcom statement read "ADJUSTMENT DEBIT", "AML REVIEW" and "TIGO PESA",
 * and the three filter dropdowns offered the same de-underscored enums as choices.
 * /admin/payments printed a bare `DEPOSIT` / `WITHDRAWAL` chip on its retry queue.
 *
 * ⛔ The provider words are BRAND names, not enum members: they are spelled the way
 * the brand spells itself ("M-Pesa", "HaloPesa", "Mixx by Yas"). ⚠️ They used to be
 * COPIED here from `payment-ops.ts`'s MNO list and the confirmed rail comments in
 * `selcom.ts` — one of eight such copies. They are now READ from the one catalogue,
 * `@/lib/payment-providers`. `.replace(/_/g, " ")` on a brand is a misspelling, not
 * a label.
 *
 * ⭐ ADJUSTMENT_CREDIT/DEBIT keep the accounting word rather than an in/out word:
 * the sign lives in the amount column beside them (`wallet-service.ts` picks the
 * type from `amount >= 0`), and two different words for one direction is how a
 * balance-adjust audit stops being readable.
 */
/** `StoredAgentApplication.status` → the officer's word. ONE definition site, typed against the
 *  enum so a new status is a compile error rather than an underscore on a screen. */
export const AGENT_STATUS: Record<
  "DRAFT" | "INVITED" | "KYC_SUBMITTED" | "PAYMENT_PENDING" | "UNDER_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "APPROVED" | "REJECTED" | "DECLINED" | "EXPIRED" | "REVOKED",
  { en: string }
> = {
  DRAFT: REVIEW.agentDraft,
  INVITED: REVIEW.agentInvited,
  KYC_SUBMITTED: REVIEW.agentKycSubmitted,
  PAYMENT_PENDING: REVIEW.agentPaymentPending,
  UNDER_REVIEW: REVIEW.agentUnderReview,
  ADDITIONAL_INFO_REQUIRED: REVIEW.agentInfoRequired,
  APPROVED: REVIEW.agentApproved,
  REJECTED: REVIEW.agentRejected,
  DECLINED: REVIEW.agentDeclined,
  EXPIRED: REVIEW.agentExpired,
  REVOKED: REVIEW.agentRevoked,
};

/** Officer-facing words for an agent invitation's state. */
/** What happened to the registration fee — the officer's words, one home for both console pages. */
export const AGENT_FEE_DISPOSITION: Record<"NONE" | "WAIVED" | "COLLECTED" | "REFUND_DUE" | "REFUNDED", { en: string }> = {
  NONE: { en: "Unreconciled" },
  WAIVED: { en: "Waived" },
  COLLECTED: { en: "Collected" },
  REFUND_DUE: { en: "Refund owed" },
  REFUNDED: { en: "Refunded" },
};

export const AGENT_INVITATION_STATUS: Record<"ISSUED" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED", { en: string }> = {
  ISSUED: REVIEW.agentInviteIssued,
  ACCEPTED: REVIEW.agentInviteAccepted,
  DECLINED: REVIEW.agentInviteDeclined,
  REVOKED: REVIEW.agentInviteRevoked,
  EXPIRED: REVIEW.agentInviteExpired,
};

/** `AgentRejectReason` → the sentence a person reads, EN + SW (emails are bilingual; the
 *  in-app three-language copy is `dict.agent.reason*`). ⛔ The three terminal reasons are
 *  deliberately uninformative — a sanctioned or fraudulent applicant is not told what we know. */
/**
 * ⭐ THE AUDITED ACTIONS ON AN AGENT APPLICATION, IN WORDS — the workstation's History panel.
 *
 * ⛔ AN OFFICER READS A SENTENCE, NOT AN ENUM (labels §L2). The audit chain stores dotted
 * machine names (`agent.fee.amount_mismatch`), and `/admin/players` renders those raw; on a
 * case file that is the difference between "Fee reconciled" and `agent.fee.reconciled`.
 *
 * ⚠️ AND AN UNKNOWN ACTION IS HUMANISED, NEVER HIDDEN. `auditActionLabel` falls back to the
 * raw action rather than to "—" or to nothing: a new audited action that nobody has added
 * here must still APPEAR in the history, because a decision that is invisible on the case file
 * is worse than one that is spelled awkwardly. ⛔ Never make the fallback empty.
 */
export const AGENT_AUDIT_ACTION: Record<string, string> = {
  "agent.application.document_uploaded": "Document attached",
  "agent.application.expired": "Application expired",
  "agent.application.info_requested": "More information requested",
  "agent.application.referees_set": "Referees recorded",
  "agent.application.rejected": "Rejected",
  "agent.application.started": "Application started",
  "agent.application.submitted": "Submitted for review",
  "agent.approve.refused": "Approval refused",
  "agent.approve.write_failed": "Approval failed to write — investigate",
  "agent.approved": "Approved",
  "agent.deactivated": "Agent paused",
  "agent.fee.amount_mismatch": "Fee refused — amount did not match",
  "agent.fee.duplicate_reference": "Fee refused — receipt reference already in use",
  /** ⭐ The rail since 2026-09-10: the applicant paid from their own wallet balance. Written by
   *  `wallet-service` when the MONEY moves — category WALLET, target the Wallet. */
  "agent.fee.paid_from_wallet": "Fee paid from the applicant's wallet",
  /** The same movement seen from the APPLICATION: the disposition became COLLECTED and the
   *  funding source was stamped. ⚠️ Deliberately a second row, not a duplicate — one is the
   *  money leaving a wallet, the other is a compliance fact about a case file, and they carry
   *  different categories and different target types. `reconcileFee` already works this way. */
  "agent.fee.paid_from_wallet_recorded": "Fee recorded as paid from the wallet",
  /** ⭐ The refund of a WALLET-funded fee, as MONEY — the mirror of the debit. Written by
   *  `wallet-service` when the balance actually moves back. */
  "agent.fee.refunded_to_wallet": "Fee refunded to the applicant's wallet",
  /** ⛔ The refund was REFUSED and nothing was changed — the row stays `REFUND_DUE` so an
   *  officer can retry. A `REFUNDED` row whose money never moved would drop a person we owe
   *  off the worklist entirely, which is why this is an audited event and not a silent retry. */
  "agent.fee.refund_failed": "Fee refund could not be paid — nothing changed",
  /** ⚠️ The stored funding source disagrees with what the collection's ledger group shows.
   *  The stamp wins and the refund still goes to the stamped destination — this row says the
   *  collection needs investigating, not that the refund was wrong. */
  "agent.fee.funding_source_mismatch": "Fee funding source disagrees with the ledger",
  "agent.fee.reconciled": "Fee reconciled",
  "agent.fee.reference_recorded": "Receipt reference recorded",
  "agent.fee.refunded": "Fee refunded",
  "agent.fee.waived": "Fee waived",
  "agent.invitation.accepted": "Invitation accepted",
  "agent.invitation.declined": "Invitation declined",
  "agent.invitation.expired": "Invitation expired",
  "agent.invitation.identity_mismatch": "Acceptance refused — wrong account",
  "agent.invitation.issued": "Invitation issued",
  "agent.invitation.otp_failed": "Invitation code refused",
  "agent.invitation.revoked": "Invitation withdrawn",
  "agent.payable.settled": "Payable settled out of band",
  "agent.rate.changed": "Commission rate changed",
  "agent.reactivated": "Agent reactivated",
  "agent.review.self_blocked": "Self-review blocked",
  "agent.revoked": "Agent status revoked",
};

/** The action in words, or the raw action when it has no entry — never nothing. */
export function auditActionLabel(action: string): string {
  return AGENT_AUDIT_ACTION[action] ?? action;
}

export const AGENT_REJECT_REASON: Record<
  "INCOMPLETE_DOCUMENTS" | "DOCUMENT_NOT_LEGIBLE" | "UNSATISFACTORY_REFEREE" | "DETAILS_MISMATCH" | "FEE_NOT_RECONCILED" | "STAFF_CONFLICT" | "OTHER" | "SANCTIONED" | "IDENTITY_MISMATCH" | "FRAUD",
  { en: string; sw: string }
> = {
  INCOMPLETE_DOCUMENTS:   { en: "the documents were incomplete", sw: "nyaraka hazikukamilika" },
  DOCUMENT_NOT_LEGIBLE:   { en: "a document could not be read clearly", sw: "nyaraka moja haikuweza kusomeka vizuri" },
  UNSATISFACTORY_REFEREE: { en: "a referee could not be accepted", sw: "mdhamini mmoja hakuweza kukubaliwa" },
  DETAILS_MISMATCH:       { en: "details did not match across the documents", sw: "taarifa hazikulingana kati ya nyaraka" },
  FEE_NOT_RECONCILED:     { en: "the fee payment could not be matched", sw: "malipo ya ada hayakuweza kulinganishwa" },
  STAFF_CONFLICT:         { en: "staff accounts cannot be agents", sw: "akaunti za wafanyakazi haziwezi kuwa mawakala" },
  OTHER:                  { en: "the application did not meet the requirements", sw: "maombi hayakukidhi mahitaji" },
  SANCTIONED:             { en: "the application cannot be accepted", sw: "maombi hayawezi kukubaliwa" },
  IDENTITY_MISMATCH:      { en: "the identity could not be verified", sw: "utambulisho haukuweza kuthibitishwa" },
  FRAUD:                  { en: "the application cannot be accepted", sw: "maombi hayawezi kukubaliwa" },
};

export const MONEY = {
  // ── Movement type ────────────────────────────────────────────────────────
  typeDeposit:          { en: "Deposit",    sw: "Amana" },
  typeWithdrawal:       { en: "Withdrawal", sw: "Utoaji" },
  typeBetPlaced:        { en: "Bet placed" },
  typeBetPayout:        { en: "Bet payout" },
  typeBetRefund:        { en: "Bet refund" },
  typeBonusCredit:      { en: "Bonus credit" },
  typeAdjustmentCredit: { en: "Adjustment · credit" },
  typeAdjustmentDebit:  { en: "Adjustment · debit" },
  typeCashout:          { en: "Cash-out" },
  typeHouseFee:         { en: "House fee" },
  /** Contracted income for a vetted agent — a share of the fee the house kept. */
  typeAgentCommission:  { en: "Agent commission" },
  /** The clawback leg: the market that produced the commission was voided. */
  typeAgentCommissionReversal: { en: "Agent commission · reversed" },
  /** ⭐ An applicant paying the TZS 100,000 registration fee out of their own wallet (Ali,
   *  2026-09-10). ⛔ Not an adjustment and not a withdrawal — registration income the owner's
   *  book must be able to see on its own line. */
  typeAgentRegistrationFee: { en: "Agent registration fee" },
  // ── Movement status ──────────────────────────────────────────────────────
  statusPending:    { en: "Pending", sw: "Inasubiri" },
  statusProcessing: { en: "Processing" },
  /** Held by the anti-money-laundering queue. Kept as the initialism an officer
   *  actually uses — "AML" is the name of the queue, not an unexpanded enum. */
  statusAmlReview:  { en: "AML review" },
  statusConfirmed:  { en: "Confirmed" },
  statusFailed:     { en: "Failed" },
  statusReversed:   { en: "Reversed" },
  statusCancelled:  { en: "Cancelled" },
  // ── Rail / provider (brand spellings) ────────────────────────────────────
  // ⛔ READ, NOT RETYPED. The nine spellings live in `@/lib/payment-providers`,
  // which the wallet, the receipt and the choosers import too — a brand rename
  // (Tigo Pesa → Mixx by Yas already happened once) is now ONE edit. The keys stay
  // so every existing call site is untouched, and the strings are byte-identical.
  providerMpesa:        { en: PAYMENT_METHODS.MPESA.name },
  providerTigoPesa:     { en: PAYMENT_METHODS.TIGO_PESA.name },
  providerAirtelMoney:  { en: PAYMENT_METHODS.AIRTEL_MONEY.name },
  providerHaloPesa:     { en: PAYMENT_METHODS.HALO_PESA.name },
  providerMixx:         { en: PAYMENT_METHODS.MIXX.name },
  providerTtclPesa:     { en: PAYMENT_METHODS.TTCL_PESA.name },
  providerCard:         { en: PAYMENT_METHODS.CARD.name },
  providerBankTransfer: { en: PAYMENT_METHODS.BANK_TRANSFER.name },
  /** Not a gateway at all — a movement that never left 50pick (stake, payout,
   *  bonus, adjustment). "Internal" is what the ledger calls it. */
  providerInternal:     { en: PAYMENT_METHODS.INTERNAL.name },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 8 — the AI content pipeline, and the ONE family in this file that proves
 * why §L2 says a definition site must be PRODUCT-AWARE.
 *
 * THREE products run a generate → filter → review → publish machine, and their
 * state enums OVERLAP without agreeing:
 *
 *   · market candidates      (`CandidateState`,        /admin/candidates)
 *   · AI polls               (`AIPollState`,           /admin/ai-polls)
 *   · Up & Down proposals    (`UpDownProposalState`,   /admin/updown/proposals)
 *
 * `APPROVED` is the tell. On a poll it means "cleared, publish when you like"; on
 * an Up & Down proposal it means "cleared, and the next step is ARMING A CHAIN
 * THAT WILL TAKE REAL MONEY". One word for both would be the §L2 defect, so there
 * are two words below and the lookup — not the lexicon — picks per product.
 * `PENDING_REVIEW` is the same shape against a fourth product: it is "Ready for
 * review" here and "Pending review" in `REVIEW.kycPendingReview`, because a KYC
 * queue and a content queue are not the same waiting.
 *
 * The words themselves are lifted verbatim from the local `STATE_LABEL` maps that
 * /admin/ai-polls and /admin/updown/proposals had each re-typed (three copies, and
 * they had already drifted on the apostrophe); /admin/candidates had no map at all
 * and printed `EXTRACTED` / `FILTERED_OUT` raw in both its table and its card.
 * EN-only: these are chips, and the Chip atom upper-cases via CSS.
 */
export const PIPELINE = {
  // ── Shared across the three products ─────────────────────────────────────
  generating:       { en: "Generating…" },
  validationFailed: { en: "Failed" },
  /** The model produced something the filters would not pass. Deliberately NOT
   *  "Rejected": no officer decided it, so it must not read like one did. */
  filtered:         { en: "Didn’t pass checks" },
  pendingReview:    { en: "Ready for review" },
  editing:          { en: "Editing" },
  approved:         { en: "Approved" },
  rejected:         { en: "Rejected" },
  published:        { en: "Published" },
  // ── Market candidates only — the four-layer pipeline's working states ────
  extracted:        { en: "Extracted" },
  verifying:        { en: "Verifying" },
  scored:           { en: "Scored" },
  // ── Up & Down proposals only — see the APPROVED note above ───────────────
  approvedReadyToArm: { en: "Approved · ready to arm" },
  armed:              { en: "Armed · chain running" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 9 — Up & Down operations: a chain's state and a price reading's state.
 *
 * ⛔ THE ROUND'S OWN VOID REASON IS NOT HERE, AND MUST NOT BE ADDED. A refund
 * explanation has exactly one home — `src/lib/updown-refund-reason.ts` — because
 * the player card, the round page, the settlement proof, the inbox and this
 * console all have to give the same answer about the same money. The round
 * explorer used to bypass it and print the stored token (`· source-failed`);
 * it now calls `refundReasonFor()` like every other surface, and the officer-facing
 * SHORT form of each reason lives below, keyed by that module's `RefundReason`.
 * Adding a second decision here would recreate E-65 in the operator console.
 */
export const UPDOWN = {
  // ── Chain state (`ChainState`) ───────────────────────────────────────────
  chainRunning: { en: "Running" },
  chainPaused:  { en: "Paused" },
  chainStopped: { en: "Stopped" },
  /** ⭐ ARCHIVED is a resting state, not a deletion — the chain leaves the operator's working
   *  list and every round it ever ran is kept. "Archived" says that; "Removed" would not. */
  chainArchived: { en: "Archived" },
  // ── Price-reading state (`ObservationState`) ─────────────────────────────
  readingPending:   { en: "Awaiting read" },
  readingConfirmed: { en: "Confirmed" },
  readingFailed:    { en: "Read failed" },
  /** ⭐ §C2 — no reading is an ABSENCE, not a state. It gets its own words so the
   *  cell never borrows a real state's chip and reads as data we do not have. */
  readingNone:      { en: "No readings yet" },
  // ── Round outcome, when there is not one yet ─────────────────────────────
  outcomePending: { en: "Pending" },
  // ── Officer-side SHORT form of each `RefundReason` (long player copy lives
  //    in the dict under REFUND_REASON_KEY; this is a table cell) ───────────
  refundNoMove:         { en: "No move" },
  refundSourceFailed:   { en: "Price unread" },
  refundSourceMismatch: { en: "Wrong source" },
  refundOperator:       { en: "Operator void" },
  /** A decided round that still refunded: nobody took the other side. NOT a void,
   *  and the word must never suggest one. */
  refundUnmatched:      { en: "One-sided" },
  /** ⛔ Never folded into "No move" — an unrecognised stored reason is the one an
   *  officer must actually go and look at. */
  refundUnexplained:    { en: "Reason unrecognised" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 10 — audit-log categories (`AuditCategory`).
 * The filter row rendered the raw token as its chip label, so an officer picked
 * between "COMPLIANCE" and "SYSTEM" in database spelling. Sentence-case words;
 * the Chip atom upper-cases them for display, so the row looks unchanged and only
 * the underlying string stops being an enum.
 */
export const AUDIT = {
  auth:       { en: "Auth" },
  kyc:        { en: "KYC" },
  wallet:     { en: "Wallet" },
  bet:        { en: "Bet" },
  admin:      { en: "Admin" },
  compliance: { en: "Compliance" },
  security:   { en: "Security" },
  system:     { en: "System" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 11 — player proposals, as an officer reads them.
 *
 * The chip on this queue already flows through the trilingual player dict
 * (`components/proposals/status-badge.tsx`), so the STATUS WORD is not redefined
 * here. What is here is the one place the console put a status into PROSE:
 * *"This proposal is {status.toLowerCase().replace("_", " ")} — no further
 * action."* — §L3's exact prohibition, and its `replace` was missing the `/g` flag
 * so a two-underscore token would have kept the second one.
 *
 * ⭐ The fix is not a better word for the enum, it is a sentence per terminal
 * state. "This proposal is listed" told an officer nothing; the market being LIVE
 * and taking money is the fact they need. Only three states reach that branch
 * (LISTED · RESOLVED · DECLINED) — REVIEW/CHANGES_REQUESTED are the actionable
 * branch above it and APPROVED has its own panel.
 */
export const PROPOSAL = {
  sentenceListed:   { en: "This proposal is live as a market and taking predictions — no further action here." },
  sentenceResolved: { en: "This proposal’s market has been resolved and paid — no further action." },
  sentenceDeclined: { en: "This proposal was declined — no further action." },
  /** Fallback for a state that should not reach the branch. Says what it knows and
   *  claims nothing more, rather than guessing which of the three it is. */
  sentenceClosed:   { en: "This proposal is closed — no further action." },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 12 — the resolver queue's AUTO-RESOLVE VERDICT: why a market is still sitting
 * there, and what the bulk bar will and will not do about it.
 *
 * 🔴 THE WORDS EXIST BECAUSE THEIR ABSENCE WAS THE BUG. Ali reported the AI auto-resolver
 * as broken with auto-resolve on and 90%+ confidence. Measured on production 2026-08-28:
 * 12 markets at confidence ≥ 90 and the AI cited the market's approved source on NONE of
 * them, so `decideAutoResolve` refused every one — correctly, and in total silence. The
 * queue rendered the number and said nothing about the citation. These are the sentences
 * it should have been saying.
 *
 * ⛔ ONE PLACE. A block reason is an enum an OFFICER reads, and the console's own law is
 * that such a word gets a lexicon entry rather than a `.replace(/_/g, " ")` at the render
 * site — which is how "not_determined" reaches a settlement screen looking like a database
 * column. The market-specific facts (which host, which number) are NOT here: no dictionary
 * can hold them, and the action composes them onto these.
 *
 * ⛔ EN ONLY, deliberately and consistently with the rest of this console. `short` is the
 * chip (uppercased by CSS, so it must read correctly in caps); `en` is the sentence.
 */
export const BULK_VERDICT = {
  eligible:                 { en: "Clears the auto-resolve floor — this one will seal" },
  eligibleAuto:             { en: "Would auto-seal" },
  alreadyResolved:          { en: "Already resolved — the verdict is sealed" },
  awaitingCountersignature: { en: "Staged already — countersign it on the market's own card, not in bulk" },
  stillLive:                { en: "Betting is still open — seal this one from its own card" },
  claimedElsewhere:         { en: "An AI check is running on this market right now" },
  noAssessment:             { en: "No AI reading recorded for this market" },
  outcomeUnknown:           { en: "The AI returned no YES/NO outcome" },
  notDetermined:            { en: "The AI says the outcome is not locked yet" },
  determinedNotRecorded:    { en: "Assessed before this platform recorded the locked flag — re-check to refresh it" },
  sourceNoneCited:          { en: "The AI cited no source at all" },
  sourceDifferentDomain:    { en: "The AI read a different site from this market's approved source" },
  sourceUntrusted:          { en: "The cited site is not a trusted source for this category" },
  thinEvidence:             { en: "No real evidence excerpt behind the reading" },
  belowThreshold:           { en: "Confidence is below the configured floor" },
  internalDisagreement:     { en: "The eligibility check disagreed with itself — refused" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 12b — the bulk bar's own chrome. Short, EN-only, and here rather than inline so
 * the bar, the confirmation dialog and the result panel cannot drift into three wordings
 * for the same act — which is exactly what happened to the two-officer note (Family 3).
 */
export const BULK_BAR = {
  selectAllOnPage:   { en: "Select all on this page" },
  selectionPageOnly: { en: "Selection covers this page only" },
  nSelected:         { en: "selected" },
  resolveSelected:   { en: "Resolve selected" },
  stageSelected:     { en: "Stage selected" },
  clear:             { en: "Clear" },
  overrideNeeded:    { en: "Override reason required" },
  overrideLocked:    { en: "Override needs compliance access" },
  /**
   * ⛔ "LISTED ABOVE", NOT "SELECTED" — the figure beneath this label is
   * `willSeal.reduce(…)`, the money on the markets the batch will actually act on, NOT on
   * everything ticked. The two differ whenever any row will be skipped, and the same screen
   * already carries a second, larger figure ("20 selected · TZS 480,000 held") over the
   * WHOLE selection. Two different totals, one saying "selected" and the other also saying
   * "selected", on the last screen before real player money is sealed.
   *
   * The number was right and the sentence was wrong, which is the more dangerous direction:
   * an officer reconciling the dialog against the bar sees a shortfall and has to guess
   * whether the batch or the label is lying.
   */
  moneyAtStake:      { en: "Player money held on the markets listed above" },
  nothingSelected:   { en: "Select at least one market" },
} satisfies Record<string, AdminLabel>;

/**
 * FAMILY 13 — SURVEILLANCE: what the suspicious-bet detector flagged, in words.
 *
 * `SuspiciousFlag.type` (`src/lib/server/analytics.ts`) is a TypeScript union —
 * `"STAKE_SPIKE" | "VELOCITY"` — and NOT a Prisma enum, so nothing that reads the
 * schema could ever have caught it. It reached /admin/aml's flags table raw: the chip
 * on that page printed the database token `STAKE_SPIKE` at an officer, on the queue
 * that decides whether a Suspicious Activity Report is filed (POCA Cap 423 §16).
 *
 * ⛔ NO `sw` HERE, ON PURPOSE. This file's provenance rule is that every Swahili string
 * is lifted verbatim from an already-shipped surface and never invented. /admin/aml
 * ships "Bendera za shaka" for the flags COLLECTIVELY and nothing at all for the two
 * arms, so there is no source to lift — and these render in a `Chip`, which is one of
 * the EN-only surfaces named at the top of this file.
 */
export const SURVEILLANCE = {
  /** A stake more than 10× the player's own 30-day median. */
  stakeSpike: { en: "Stake spike" },
  /** More than 100 confirmed stakes in 24h — possible automation. */
  velocity:   { en: "Velocity" },
} satisfies Record<string, AdminLabel>;
