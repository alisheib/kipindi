"use client";

/**
 * StatusBadge — a proposal's status (+ the Hot flag) as a kit Chip + kit glyph.
 *
 * ⭐ D4 — THE COLOUR COMES FROM THE DICTIONARY (`@/lib/status-tone`), NOT FROM HERE.
 * The words are already trilingual through `i18n-dict`; their colours were hand-typed
 * in this file and disagreed with every other surface that renders the same word.
 * DESIGN_AUTHORITY §B11 is the law. Two things changed on 2026-08-21 (Ali's ruling):
 *
 *   1. 🔴 **APPROVED lost its gold gradient and is now success-green** — the same green
 *      the KYC queue and all three AI queues already used. §M3: struck gold means money
 *      that was EARNED, and an approval is not money. This chip was the last surface on
 *      the platform painting an approval gold.
 *   2. 🔴 **HOT lost the same gold gradient and is now the rose/flame chip.** "Hot" is a
 *      crowd signal, not a payout; the gold budget in CLAUDE.md has named `chip-hot-rose`
 *      as its tone for months and this file had not followed. The kit's `hot` variant is
 *      `no`-rose exactly, so the flame reads as heat rather than as winnings.
 *
 * ⛔ What deliberately did NOT change: RESOLVED keeps the struck gilt (that one IS
 * settled money — §M3/§M7), DECLINED keeps claret (editorial refusal, §B4), and LISTED
 * keeps royal rather than borrowing the player board's red LIVE pill — a listed proposal
 * is a lifecycle step reached, not a market broadcasting that it is taking money.
 * Recorded at `STATUS_TONE_EXCEPTIONS.LIVE`; never betting green/red on this surface.
 */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { useT } from "@/lib/i18n";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import type { ProposalStatus } from "@/lib/server/store";

type Variant = React.ComponentProps<typeof Chip>["variant"];

export function StatusBadge({ status, isHot }: { status: ProposalStatus; isHot?: boolean }) {
  const { t } = useT();
  let variant: Variant = "neutral";
  let icon: GlyphKey = "clock";
  let label: string = t.common.underReview;

  if (isHot && (status === "REVIEW" || status === "CHANGES_REQUESTED")) {
    // A crowd signal, not a payout — rose/flame, never the struck gilt.
    variant = "hot"; icon = "flame2"; label = t.common.hot;
  } else if (status === "REVIEW") {
    variant = TONE_CHIP[STATUS_TONE.PENDING.proposals]; icon = "clock"; label = t.common.underReview;
  } else if (status === "CHANGES_REQUESTED") {
    variant = TONE_CHIP[STATUS_TONE.PENDING.proposals]; icon = "edit"; label = t.common.changesRequested;
  } else if (status === "APPROVED") {
    variant = TONE_CHIP[STATUS_TONE.APPROVED.proposals]; icon = "checkCircle"; label = t.common.approved;
  } else if (status === "LISTED") {
    // Royal — `active` is the royal variant this chip has always worn. See the header.
    variant = "active"; icon = "check"; label = t.common.live;
  } else if (status === "RESOLVED") {
    variant = TONE_CHIP[STATUS_TONE.RESOLVED.proposals]; icon = "trophy"; label = t.market.statusResolved;
  } else if (status === "DECLINED") {
    variant = TONE_CHIP[STATUS_TONE.REJECTED.proposals]; icon = "x"; label = t.common.declined;
  }

  const Icon = I[icon];
  return (
    <Chip variant={variant} aria-label={label}>
      <Icon s={12} />
      {label}
    </Chip>
  );
}
