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
  // ⭐ Named for what an officer must DO about it, not for a fraction. A partially fulfilled
  // erasure is still open work: the PII is gone and the statutory documents are held to a
  // date, and the request stays in the queue because nothing else remembers that date.
  dsarPartial:        { en: "Partly done · docs held" },
  dsarFulfilled:      { en: "Fulfilled" },
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
 * "Pumzika kidogo" its `coolingOff`, "Imesitishwa" its `errSuspended`. PENDING_KYC
 * has no shipped Swahili and is therefore EN-only rather than translated here —
 * fabricating one would break the rule at the top of this file.
 */
export const ACCOUNT = {
  active:       { en: "Active",        sw: "Hai" },
  pendingKyc:   { en: "Pending KYC" },
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
