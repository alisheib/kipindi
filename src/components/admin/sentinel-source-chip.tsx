import { Fragment } from "react";
import { Chip } from "@/components/ui/chip";

/**
 * Did the AI read the market's OWN approved source? One chip, used everywhere an officer
 * sees the AI's cited link.
 *
 * ⛔ WHY THIS IS SHOWN RATHER THAN ENFORCED HERE. The cited URL used to be rendered as a
 * plain clickable link with nothing saying whether it was the approved source — no host
 * check anywhere. In AUTO mode that is now a hard gate (`decideAutoResolve`), because no
 * officer is in the path. In HUMAN mode it must NOT suppress anything: the officer is about
 * to open the link themselves, and hiding a read from the wrong site is precisely what would
 * let them seal on it unaware. So the officer is told, plainly, and decides.
 *
 * The verdict is DERIVED at render time (`sentinelSourceVerdict`), never stored, so it
 * cannot go stale against an edited market.
 *
 * ⚠️ PV-13c (2026-09-03) — was four raw `className="chip chip-*"` spans, the legacy CSS
 * family the kit's <Chip> component was built to replace (chip.tsx's own header). Same
 * tones, through the kit: `chip-yes`→`variant="yes"`, `chip-hot-rose`→`variant="hot"`
 * (both share the ROSE object and the taller "status" metrics), `chip-pending`→`variant="pending"`.
 */
export function SentinelSourceChip({
  verdict,
  approved,
}: {
  verdict: "match" | "different-domain" | "none-cited" | "no-approved-source";
  approved?: string | null;
}) {
  if (verdict === "match") {
    return (
      <Chip variant="yes" title="The AI read this market's approved source.">
        approved source
      </Chip>
    );
  }

  let approvedHost = approved ?? "";
  try {
    if (approved) approvedHost = new URL(approved).hostname;
  } catch {
    /* show the raw string rather than nothing */
  }

  if (verdict === "different-domain") {
    return (
      <Fragment>
        <Chip
          variant="hot"
          title={`This market's approved source is ${approvedHost}. Open both before sealing.`}
        >
          not the approved source
        </Chip>
        <span className="font-mono text-[10.5px] text-text-subtle">
          approved: {approvedHost}
        </span>
      </Fragment>
    );
  }

  if (verdict === "none-cited") {
    return (
      <Chip variant="pending" title="The AI returned no source URL for this assessment.">
        no source cited
      </Chip>
    );
  }

  return (
    <Chip variant="pending" title="This market has no approved source to compare against.">
      no approved source
    </Chip>
  );
}
