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
import { LIFECYCLE } from "@/lib/admin-status-lexicon";
import type { MarketStatus } from "@/lib/server/market-service";

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
