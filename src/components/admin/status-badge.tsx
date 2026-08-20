/**
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
import { LIFECYCLE, REVIEW, OBJECTION } from "@/lib/admin-status-lexicon";
import type { MarketStatus } from "@/lib/server/market-service";
import type { StoredKyc, ObjectionStatus } from "@/lib/server/store";
import type { DsarStatus } from "@/lib/server/privacy";

type ChipVariant = "success" | "gold" | "warning" | "neutral";

/** Canonical variant per lifecycle state (byte-identical to the prior inline
 *  ternary: LIVE→success, RESOLVED→gold, CLOSED→warning, DRAFT/VOIDED→neutral). */
const VARIANT: Record<MarketStatus, ChipVariant> = {
  LIVE: "success",
  RESOLVED: "gold",
  CLOSED: "warning",
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

/** Byte-identical to the prior inline ternary: APPROVED→success, REJECTED→danger,
 *  everything mid-review→warning. */
export function kycStatusVariant(status: KycStatus): "success" | "danger" | "warning" {
  return status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";
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

/** Canonical variant per player account status — byte-identical to the map that
 *  was duplicated in `players/page` and `players/[id]`: ACTIVE→success,
 *  PENDING_KYC/COOLED_OFF→warning, SUSPENDED/SELF_EXCLUDED→danger, CLOSED (and any
 *  unknown) → neutral. The two call sites still render their own label (the detail
 *  page prefixes a ● dot), so only the variant map is shared. */
export function playerStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  return status === "ACTIVE" ? "success"
    : status === "PENDING_KYC" || status === "COOLED_OFF" ? "warning"
    : status === "SUSPENDED" || status === "SELF_EXCLUDED" ? "danger"
    : "neutral";
}

/* ── DSAR / privacy-request status (Family 4) ────────────────────────────── */

/** Byte-identical to privacy/page's prior ternary: PENDING→warning,
 *  FULFILLED→success, REJECTED→danger. */
export function DsarStatusBadge({ status, size = "sm" }: { status: DsarStatus; size?: "sm" | "md" | "lg" }) {
  // ⛔ `PARTIAL` HAD TO BE ADDED HERE IN THE SAME COMMIT AS THE STATUS ITSELF. This chain
  // ended in a bare `: "danger"` / `: REVIEW.dsarRejected.en`, so a request the platform had
  // partially fulfilled would have rendered as **Rejected** — telling an officer the opposite
  // of what happened, on the compliance queue, in the one colour that means refused.
  const variant =
    status === "PENDING" ? "warning"
    : status === "PARTIAL" ? "warning"
    : status === "FULFILLED" ? "success"
    : "danger";
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
 *  is earned money only. */
export function ObjectionStatusBadge({ status, size = "sm" }: { status: ObjectionStatus; size?: "sm" | "md" | "lg" }) {
  const variant =
    status === "OPEN" ? "claret"
    : status === "UPHELD" ? "success"
    : "neutral";
  const label =
    status === "OPEN" ? OBJECTION.open.en
    : status === "UPHELD" ? OBJECTION.upheld.en
    : OBJECTION.rejected.en;
  return <Chip size={size} variant={variant}>{label}</Chip>;
}
