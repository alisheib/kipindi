/**
 * The admin console's enum → human lookup layer. The WORDS live in
 * `@/lib/admin-status-lexicon`; this module owns the other half — which enum value
 * maps to which word, and which chip variant carries it — for every status family
 * the console renders. Split that way because the lexicon is deliberately
 * import-free (see its header) while these maps must be exhaustive over enums that
 * only the server modules declare; the `import type` lines below are erased at
 * build, so nothing server-side reaches a bundle.
 *
 * ⛔ A NEW STATUS COLUMN GOES HERE, NOT AT ITS CALL SITE. Every raw-enum leak this
 * module has closed began as one page rendering `<Chip>{row.status}</Chip>` because
 * a one-line map "was not worth a module".
 *
 * MarketStatusBadge — the ONE way the admin console renders a market's lifecycle
 * status as a chip. Owns both halves of what used to be hand-duplicated at every
 * call site: the enum → chip-variant mapping and the enum → human label (via the
 * `LIFECYCLE` group in the status lexicon).
 *
 * Before this, /admin/markets rendered the raw enum (`<Chip>{m.status}</Chip>` →
 * "LIVE") while /admin/markets/[id] rendered a title-cased label from a local
 * `STATUS_LABEL` map ("Live"), and each file re-typed the same variant ternary.
 * The Chip atom upper-cases via CSS, so the two labels looked identical on screen
 * but were a maintenance trap — a new status (or a variant tweak) had to be
 * remembered in every file. Now there is one source.
 *
 * Server-safe: pure presentational, no hooks, and `MarketStatus` is a type-only
 * import (erased at build) so no server code is pulled into the bundle.
 */
import { Chip } from "@/components/ui/chip";
import { LIFECYCLE, REVIEW, OBJECTION, ACCOUNT, MONEY, PIPELINE, UPDOWN, AUDIT } from "@/lib/admin-status-lexicon";
import { STATUS_TONE, TONE_CHIP, type StatusChipVariant } from "@/lib/status-tone";
import { refundReasonFor, type RefundReason } from "@/lib/updown-refund-reason";
import type { MarketStatus } from "@/lib/server/market-service";
import type { StoredKyc, StoredTxn, ObjectionStatus } from "@/lib/server/store";
import type { DsarStatus, DsarType } from "@/lib/server/privacy";
import type { CandidateState } from "@/lib/server/market-candidate";
import type { AIPollState } from "@/lib/server/ai-poll-generation";
import type { UpDownProposalState } from "@/lib/server/updown-proposal";
import type { ChainState, ObservationState } from "@/lib/server/updown-dal";
import type { AuditCategory } from "@/lib/server/audit";

/**
 * ⭐ D4 — THE COLOUR COMES FROM THE DICTIONARY, NOT FROM THIS FILE.
 *
 * The words already had one definition site (`admin-status-lexicon.ts`); their COLOURS
 * did not, so the same word was a different colour depending on which file rendered it
 * — LIVE was red to a player and green here, CLOSED was royal to a player and amber
 * here — and none of it was written down. `@/lib/status-tone` is now that one site, and
 * DESIGN_AUTHORITY §B11 is the law. ⛔ Do not re-type a variant below; add the word to
 * the dictionary.
 */
const VARIANT: Record<MarketStatus, StatusChipVariant> = {
  /** ⛔ GREEN, NOT THE PLAYER'S RED — the ONE kept split, and it is deliberate:
   *  `STATUS_TONE_EXCEPTIONS.LIVE`. Red in a column beside DRAFT and VOIDED reads as
   *  an incident; here LIVE means "this market is up". */
  LIVE: TONE_CHIP[STATUS_TONE.LIVE.admin],
  /** Soft gilt, not the player's struck seal: an officer reading a hundred rows is not
   *  being congratulated (§M3/§M7). */
  RESOLVED: TONE_CHIP[STATUS_TONE.RESOLVED.admin],
  /** 🔴 WAS AMBER (Ali's ruling, 2026-08-21). Betting is shut and the market is waiting
   *  to be resolved — nothing is wrong, and amber told an officer otherwise while the
   *  player's own card called the same state royal. */
  CLOSED: TONE_CHIP[STATUS_TONE.CLOSED.admin],
  /** Terminal / not yet begun. Slate is the "inert" tone and is not in the dictionary
   *  because no other surface disagrees about it. */
  VOIDED: "neutral",
  DRAFT: "neutral",
};

const LABEL: Record<MarketStatus, string> = {
  DRAFT: LIFECYCLE.draft.en,
  LIVE: LIFECYCLE.live.en,
  CLOSED: LIFECYCLE.closed.en,
  RESOLVED: LIFECYCLE.resolved.en,
  VOIDED: LIFECYCLE.voided.en,
};

export function MarketStatusBadge({
  status,
  size = "sm",
}: {
  status: MarketStatus;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Chip size={size} variant={VARIANT[status] ?? "neutral"}>
      {LABEL[status] ?? status}
    </Chip>
  );
}

/* ── KYC review status (Family 4) ────────────────────────────────────────── */

type KycStatus = StoredKyc["status"];

/**
 * D4. APPROVED → green and REJECTED → rose come from the dictionary; the officer's
 * decision on a person reads the same word and the same colour everywhere.
 *
 * 🔴 `PENDING_REVIEW` WAS AMBER AND IS NOW ROYAL (Ali's ruling, 2026-08-21). A file
 * sitting in the queue is not a warning — it is the normal state of a queue, and the
 * player's own KYC card had always called it royal.
 *
 * ⚠️ AMBER SURVIVES for the other three, and that is the distinction the ruling draws:
 * amber now means "an officer must DO something that is not simply waiting" —
 * `ADDITIONAL_INFO_REQUIRED` (go and ask), `IN_PROGRESS` / `NOT_STARTED` (the player
 * has not finished, so nothing is queued for review at all).
 */
export function kycStatusVariant(status: KycStatus): StatusChipVariant {
  return status === "APPROVED" ? TONE_CHIP[STATUS_TONE.APPROVED.admin]
    : status === "REJECTED" ? TONE_CHIP[STATUS_TONE.REJECTED.admin]
    : status === "PENDING_REVIEW" ? TONE_CHIP[STATUS_TONE.PENDING.admin]
    : "warning";
}

/** Human label for a KYC status (replaces the raw screaming enum). */
export function kycStatusLabel(status: KycStatus): string {
  const L: Record<KycStatus, string> = {
    NOT_STARTED: REVIEW.kycNotStarted.en,
    IN_PROGRESS: REVIEW.kycInProgress.en,
    PENDING_REVIEW: REVIEW.kycPendingReview.en,
    APPROVED: REVIEW.kycApproved.en,
    REJECTED: REVIEW.kycRejected.en,
    ADDITIONAL_INFO_REQUIRED: REVIEW.kycAdditionalInfo.en,
  };
  return L[status] ?? status;
}

export function KycStatusBadge({ status, size = "sm" }: { status: KycStatus; size?: "sm" | "md" | "lg" }) {
  return <Chip size={size} variant={kycStatusVariant(status)}>{kycStatusLabel(status)}</Chip>;
}

/* ── Player account status (players list + player detail) ────────────────── */

/** Canonical variant per player account status, shared by `players/page` and
 *  `players/[id]`. The two call sites still render their own label (the detail page
 *  prefixes a ● dot), so only the variant map is shared.
 *
 *  🔴 `PENDING_KYC` WAS AMBER AND IS NOW ROYAL (D4, Ali's ruling 2026-08-21) — the
 *  console painted a PENDING word amber while every player surface painted it royal,
 *  and amber made a perfectly ordinary un-verified account look like a problem.
 *
 *  ⛔ `CLOSED` STAYS SLATE and is NOT swept into "CLOSED is royal": that clause is
 *  about the market lifecycle stage. A closed ACCOUNT is terminal and inert, and royal
 *  would give a dead account the tone of a live one — `STATUS_TONE_EXCEPTIONS.CLOSED`.
 *  `COOLED_OFF` keeps amber: a cooling-off period is a restriction an officer must
 *  honour, not a queue position. */
export function playerStatusVariant(status: string): StatusChipVariant {
  return status === "ACTIVE" ? "success"
    : status === "PENDING_KYC" ? TONE_CHIP[STATUS_TONE.PENDING.admin]
    : status === "COOLED_OFF" ? "warning"
    : status === "SUSPENDED" || status === "SELF_EXCLUDED" ? "danger"
    : "neutral";
}

/* ── DSAR / privacy-request status (Family 4) ────────────────────────────── */

/** 🔴 `PENDING` WAS AMBER AND IS NOW ROYAL (D4, Ali's ruling 2026-08-21) — the same
 *  correction as the KYC queue, for the same reason: a request waiting its turn is the
 *  normal state of a queue, not a warning. FULFILLED→green and REJECTED→rose come from
 *  the dictionary. */
export function DsarStatusBadge({ status, size = "sm" }: { status: DsarStatus; size?: "sm" | "md" | "lg" }) {
  // ⚠️ MERGE RESOLUTION 2026-08-22 — TWO LANES WERE BOTH RIGHT AND NEITHER WAS COMPLETE.
  //
  // The design-perfection lane moved this chain onto the status lexicon (D4: PENDING is
  // ROYAL, not amber — "waiting is not a warning"). The data lane added the `PARTIAL`
  // status. Each was written without the other, and taking either side alone breaks
  // something real:
  //
  //  · design side alone — `PARTIAL` is not in its chain, so it falls through to the final
  //    branch and a partially-fulfilled request renders **rose/REJECTED** while the label
  //    two lines below correctly reads "Partially fulfilled". A chip that says refused over
  //    a label that says partly done, on the compliance queue, is a false statement about a
  //    statutory decision — the exact defect the data lane's comment was added to prevent.
  //  · data side alone — reverts Ali's D4 ruling and puts amber back on a queue.
  //
  // Resolved as: the LEXICON is the mechanism (design lane), and `PARTIAL` keeps a branch
  // (data lane). ⛔ `PARTIAL` takes PENDING's tone deliberately — there is no `PARTIAL` key
  // in `STATUS_TONE` and it should not be minted for one call site. A partially-fulfilled
  // DSAR **stays in the queue** (COMPLIANCE-DECISIONS 2026-08-21, item 4), and PENDING is
  // defined as exactly that: "waiting on a queue".
  const variant: StatusChipVariant =
    status === "PENDING" ? TONE_CHIP[STATUS_TONE.PENDING.admin]
    : status === "PARTIAL" ? TONE_CHIP[STATUS_TONE.PENDING.admin]
    : status === "FULFILLED" ? TONE_CHIP[STATUS_TONE.APPROVED.admin]
    : TONE_CHIP[STATUS_TONE.REJECTED.admin];
  const label =
    status === "PENDING" ? REVIEW.dsarPending.en
    : status === "PARTIAL" ? REVIEW.dsarPartial.en
    : status === "FULFILLED" ? REVIEW.dsarFulfilled.en
    : REVIEW.dsarRejected.en;
  return <Chip size={size} variant={variant}>{label}</Chip>;
}

/* ── Objection status (F11, Family 5) ────────────────────────────────────── */

/** OPEN is claret, not neutral: an open objection is FREEZING a market's money,
 *  and the queue must read that way at a glance. Never `objection` (gold) — gold
 *  is earned money only.
 *
 *  ⛔ REJECTED IS SLATE HERE AND ROSE IN THE KYC/DSAR QUEUES, AND THAT IS DELIBERATE —
 *  `STATUS_TONE_EXCEPTIONS.REJECTED`. A rejected objection is a closed file; rose would
 *  read as though the player had done something wrong by objecting. Do not "harmonise"
 *  it without reading that entry first. */
export function ObjectionStatusBadge({ status, size = "sm" }: { status: ObjectionStatus; size?: "sm" | "md" | "lg" }) {
  const variant: StatusChipVariant =
    status === "OPEN" ? TONE_CHIP[STATUS_TONE.OPEN.admin]
    : status === "UPHELD" ? TONE_CHIP[STATUS_TONE.APPROVED.admin]
    : "neutral";
  const label =
    status === "OPEN" ? OBJECTION.open.en
    : status === "UPHELD" ? OBJECTION.upheld.en
    : OBJECTION.rejected.en;
  return <Chip size={size} variant={variant}>{label}</Chip>;
}

/* ── Account status — players AND staff (Family 6) ───────────────────────── */

/** The account-status enum in words. Used by the player list, the player detail,
 *  the DSAR export list and both staff surfaces, all of which printed the stored
 *  column ("SELF_EXCLUDED", "PENDING_KYC") straight into a chip.
 *
 *  Typed `string` rather than the store's union on purpose: three of those five
 *  call sites read a projection that has already widened the field, and the whole
 *  point is that an unmapped value must still not reach an officer as a raw token
 *  — so the fallback de-underscores and title-cases rather than passing it through. */
export function accountStatusLabel(status: string): string {
  const L: Record<string, string> = {
    ACTIVE: ACCOUNT.active.en,
    PENDING_KYC: ACCOUNT.pendingKyc.en,
    SUSPENDED: ACCOUNT.suspended.en,
    SELF_EXCLUDED: ACCOUNT.selfExcluded.en,
    COOLED_OFF: ACCOUNT.cooledOff.en,
    CLOSED: ACCOUNT.closed.en,
  };
  return L[status] ?? humanise(status);
}

/** Last-resort de-enum for a value no map knows: `SELF_EXCLUDED` → `Self excluded`.
 *  ⛔ NOT a substitute for a lexicon entry — it produces a readable string, never a
 *  correct one ("AML_REVIEW" → "Aml review"). It exists so an unmapped row degrades
 *  to something an officer can read instead of shouting database spelling at them. */
function humanise(token: string): string {
  const flat = token.replace(/_/g, " ").toLowerCase();
  return flat.charAt(0).toUpperCase() + flat.slice(1);
}

export function AccountStatusBadge({ status, size = "sm", dot }: { status: string; size?: "sm" | "md" | "lg"; dot?: boolean }) {
  return <Chip size={size} variant={playerStatusVariant(status)}>{dot ? "● " : ""}{accountStatusLabel(status)}</Chip>;
}

/* ── DSAR request TYPE (Family 4) ────────────────────────────────────────── */

export function dsarTypeLabel(type: DsarType): string {
  const L: Record<DsarType, string> = {
    ACCESS: REVIEW.dsarTypeAccess.en,
    ERASURE: REVIEW.dsarTypeErasure.en,
    CORRECTION: REVIEW.dsarTypeCorrection.en,
    PORTABILITY: REVIEW.dsarTypePortability.en,
  };
  return L[type] ?? humanise(type);
}

/* ── Money movement — type · status · rail (Family 7) ────────────────────── */

export function txnTypeLabel(type: StoredTxn["type"]): string {
  const L: Record<StoredTxn["type"], string> = {
    DEPOSIT: MONEY.typeDeposit.en,
    WITHDRAWAL: MONEY.typeWithdrawal.en,
    BET_PLACED: MONEY.typeBetPlaced.en,
    BET_PAYOUT: MONEY.typeBetPayout.en,
    BET_REFUND: MONEY.typeBetRefund.en,
    BONUS_CREDIT: MONEY.typeBonusCredit.en,
    ADJUSTMENT_DEBIT: MONEY.typeAdjustmentDebit.en,
    ADJUSTMENT_CREDIT: MONEY.typeAdjustmentCredit.en,
    CASHOUT: MONEY.typeCashout.en,
    HOUSE_FEE: MONEY.typeHouseFee.en,
  };
  return L[type] ?? humanise(type);
}

export function txnStatusLabel(status: StoredTxn["status"]): string {
  const L: Record<StoredTxn["status"], string> = {
    PENDING: MONEY.statusPending.en,
    PROCESSING: MONEY.statusProcessing.en,
    AML_REVIEW: MONEY.statusAmlReview.en,
    CONFIRMED: MONEY.statusConfirmed.en,
    FAILED: MONEY.statusFailed.en,
    REVERSED: MONEY.statusReversed.en,
    CANCELLED: MONEY.statusCancelled.en,
  };
  return L[status] ?? humanise(status);
}

/** The rail a movement travelled, spelled the way its owner spells it. ⛔ Never
 *  `.replace(/_/g, " ")`: "TIGO PESA" and "HALO PESA" are misspellings of two real
 *  Tanzanian brands, on the page an operator reconciles against their statements. */
export function txnProviderLabel(provider: string): string {
  const L: Record<string, string> = {
    MPESA: MONEY.providerMpesa.en,
    TIGO_PESA: MONEY.providerTigoPesa.en,
    AIRTEL_MONEY: MONEY.providerAirtelMoney.en,
    HALO_PESA: MONEY.providerHaloPesa.en,
    MIXX: MONEY.providerMixx.en,
    TTCL_PESA: MONEY.providerTtclPesa.en,
    CARD: MONEY.providerCard.en,
    BANK_TRANSFER: MONEY.providerBankTransfer.en,
    INTERNAL: MONEY.providerInternal.en,
  };
  return L[provider] ?? humanise(provider);
}

/* ── AI content pipeline — product-aware (Family 8) ──────────────────────── */
//
// ⭐ THREE functions, not one, and that is the §L2 point: `APPROVED` and
// `PENDING_REVIEW` are shared tokens whose right word depends on which product's
// queue the officer is standing in. A single `pipelineStateLabel(state)` could not
// tell a poll from an Up & Down proposal, and would have to guess.

export function candidateStateLabel(state: CandidateState): string {
  const L: Record<CandidateState, string> = {
    EXTRACTED: PIPELINE.extracted.en,
    FILTERED_OUT: PIPELINE.filtered.en,
    VERIFYING: PIPELINE.verifying.en,
    SCORED: PIPELINE.scored.en,
    PENDING_REVIEW: PIPELINE.pendingReview.en,
    APPROVED: PIPELINE.approved.en,
    REJECTED: PIPELINE.rejected.en,
    PUBLISHED: PIPELINE.published.en,
  };
  return L[state] ?? humanise(state);
}

export function aiPollStateLabel(state: AIPollState): string {
  const L: Record<AIPollState, string> = {
    GENERATING: PIPELINE.generating.en,
    VALIDATION_FAILED: PIPELINE.validationFailed.en,
    FILTERED: PIPELINE.filtered.en,
    PENDING_REVIEW: PIPELINE.pendingReview.en,
    EDITING: PIPELINE.editing.en,
    APPROVED: PIPELINE.approved.en,
    REJECTED: PIPELINE.rejected.en,
    PUBLISHED: PIPELINE.published.en,
  };
  return L[state] ?? humanise(state);
}

/** ⛔ `APPROVED` here is NOT the poll queue's "Approved": the next step is arming a
 *  chain that opens rounds and takes real stakes, so the word says so. */
export function updownProposalStateLabel(state: UpDownProposalState): string {
  const L: Record<UpDownProposalState, string> = {
    GENERATING: PIPELINE.generating.en,
    VALIDATION_FAILED: PIPELINE.validationFailed.en,
    FILTERED: PIPELINE.filtered.en,
    PENDING_REVIEW: PIPELINE.pendingReview.en,
    APPROVED: PIPELINE.approvedReadyToArm.en,
    REJECTED: PIPELINE.rejected.en,
    ARMED: PIPELINE.armed.en,
  };
  return L[state] ?? humanise(state);
}

/* ── Up & Down operations (Family 9) ─────────────────────────────────────── */

export function chainStateLabel(state: ChainState): string {
  const L: Record<ChainState, string> = {
    RUNNING: UPDOWN.chainRunning.en,
    PAUSED: UPDOWN.chainPaused.en,
    STOPPED: UPDOWN.chainStopped.en,
    ARCHIVED: UPDOWN.chainArchived.en,
  };
  return L[state] ?? humanise(state);
}

/** A price reading's state — or, for `null`, the ABSENCE of any reading, which §C2
 *  says is its own labelled state and never a fabricated one. */
export function readingStateLabel(state: ObservationState | null | undefined): string {
  if (!state) return UPDOWN.readingNone.en;
  const L: Record<ObservationState, string> = {
    PENDING: UPDOWN.readingPending.en,
    CONFIRMED: UPDOWN.readingConfirmed.en,
    FAILED: UPDOWN.readingFailed.en,
  };
  return L[state] ?? humanise(state);
}

/**
 * 🔴 WHY A ROUND REFUNDED, IN THE OFFICER'S SHORT FORM.
 *
 * The round explorer used to append the STORED TOKEN to its outcome chip
 * (`VOID · source-failed`) and so bypassed `updown-refund-reason.ts` — the module
 * that exists because five surfaces were each deciding for themselves why someone
 * got their money back, and one of them told a player the price had not moved on a
 * round that had decided against them (E-65).
 *
 * ⛔ This function does not re-decide anything. `refundReasonFor()` makes the call,
 * exactly as the player card, the round page, the settlement proof and the inbox
 * do; all this adds is the two-word form that fits a table cell, while the player
 * keeps the full sentence from the dict. If the reason ever needs a new branch it
 * is added THERE, once, and every surface including this one follows.
 *
 * Returns `null` when there is nothing to explain — a round that decided and paid.
 */
export function updownVoidReasonLabel(outcome: "UP" | "DOWN" | "VOID" | null, voidReason: string | null): string | null {
  const reason = refundReasonFor({ outcome, voidReason });
  if (!reason) return null;
  const L: Record<RefundReason, string> = {
    "no-move": UPDOWN.refundNoMove.en,
    "source-failed": UPDOWN.refundSourceFailed.en,
    "source-mismatch": UPDOWN.refundSourceMismatch.en,
    operator: UPDOWN.refundOperator.en,
    unmatched: UPDOWN.refundUnmatched.en,
    unexplained: UPDOWN.refundUnexplained.en,
  };
  return L[reason];
}

/* ── Audit-log category (Family 10) ──────────────────────────────────────── */

export function auditCategoryLabel(category: AuditCategory): string {
  const L: Record<AuditCategory, string> = {
    AUTH: AUDIT.auth.en,
    KYC: AUDIT.kyc.en,
    WALLET: AUDIT.wallet.en,
    BET: AUDIT.bet.en,
    ADMIN: AUDIT.admin.en,
    COMPLIANCE: AUDIT.compliance.en,
    SECURITY: AUDIT.security.en,
    SYSTEM: AUDIT.system.en,
  };
  return L[category] ?? humanise(category);
}
