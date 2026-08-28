/**
 * Block reason → the words an officer reads, and the tone they read them in.
 *
 * ⛔ THE WORDS ARE NOT HERE. Every string below is a reference into
 * `BULK_VERDICT` in `admin-status-lexicon.ts` — this file only says which entry a
 * reason maps to and which chip tone it wears. A private table of sentences beside a
 * status enum is exactly the drift the lexicon exists to stop (the two-officer note
 * once read two different ways on two screens), and `.replace(/_/g, " ")` on an enum
 * is how "source-different-domain" ends up on a settlement surface looking like a
 * database column.
 *
 * ⛔ AND THE COLOUR IS NOT HAND-TYPED EITHER. `variant` names a kit `Chip` variant;
 * nothing here types a colour.
 */
import { BULK_VERDICT } from "@/lib/admin-status-lexicon";
import type { BulkBlockReason } from "@/lib/server/bulk-resolve-eligibility";

type ChipVariant = "danger" | "warning" | "neutral";

/**
 * ⚠️ TONE IS A CLAIM, SO IT IS ASSIGNED ON WHAT THE ROW ACTUALLY NEEDS.
 *
 *   · `danger`  — the platform's own money gate refused this row. An officer sealing it
 *                 is overriding a control, and the chip should look like it.
 *   · `warning` — the row is not sealable right now for a reason that will pass on its
 *                 own (a running check, betting still open, another officer's turn).
 *   · `neutral` — nothing is wrong; there is simply nothing to do.
 */
export const BULK_REASON: Record<BulkBlockReason, { label: string; variant: ChipVariant }> = {
  "internal-disagreement":   { label: BULK_VERDICT.internalDisagreement.en,  variant: "danger" },
  "already-resolved":        { label: BULK_VERDICT.alreadyResolved.en,       variant: "neutral" },
  "awaiting-countersignature": { label: BULK_VERDICT.awaitingCountersignature.en, variant: "warning" },
  "still-live":              { label: BULK_VERDICT.stillLive.en,             variant: "warning" },
  "claimed-elsewhere":       { label: BULK_VERDICT.claimedElsewhere.en,      variant: "warning" },
  "no-assessment":           { label: BULK_VERDICT.noAssessment.en,          variant: "danger" },
  "outcome-unknown":         { label: BULK_VERDICT.outcomeUnknown.en,        variant: "danger" },
  "not-determined":          { label: BULK_VERDICT.notDetermined.en,         variant: "danger" },
  "determined-not-recorded": { label: BULK_VERDICT.determinedNotRecorded.en, variant: "danger" },
  "source-none-cited":       { label: BULK_VERDICT.sourceNoneCited.en,       variant: "danger" },
  "source-different-domain": { label: BULK_VERDICT.sourceDifferentDomain.en, variant: "danger" },
  "source-untrusted":        { label: BULK_VERDICT.sourceUntrusted.en,       variant: "danger" },
  "thin-evidence":           { label: BULK_VERDICT.thinEvidence.en,          variant: "danger" },
  "below-threshold":         { label: BULK_VERDICT.belowThreshold.en,        variant: "danger" },
};

/**
 * The market-specific half of the sentence — the facts no dictionary can hold.
 * ⛔ Returns `null` rather than a vague filler when there is nothing specific to add: a
 * sentence that says less than the chip already said is noise on a money surface.
 */
export function bulkReasonDetail(v: {
  reason: BulkBlockReason | null;
  citedHost: string | null;
  approvedHost: string | null;
  confidence: number | null;
  threshold: number;
}): string | null {
  switch (v.reason) {
    case "source-different-domain":
      return `cited ${v.citedHost ?? "another site"} · approved ${v.approvedHost ?? "unset"}`;
    case "source-untrusted":
      return `cited ${v.citedHost ?? "an unlisted site"} · this market names no approved source`;
    case "below-threshold":
      return v.confidence == null ? null : `${v.confidence}% · floor ${v.threshold}%`;
    default:
      return null;
  }
}
