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

export type AdminLabel = { en: string; sw?: string };

/** Bilingual inline join: `"English · Kiswahili"` (falls back to English alone
 *  when the label carries no Swahili). Matches the console's existing " · " form. */
export function bi(label: AdminLabel): string {
  return label.sw ? `${label.en} · ${label.sw}` : label.en;
}

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
  /** The 24-hour objection window that opens on seal. SW from resolver page. */
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
  kycAdditionalInfo:  { en: "More information needed" },
  // DSAR / privacy request status
  dsarPending:        { en: "Pending" },
  dsarFulfilled:      { en: "Fulfilled" },
  dsarRejected:       { en: "Rejected" },
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
  withdrawn: { en: "Withdrawn", sw: "Limeondolewa" },
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
