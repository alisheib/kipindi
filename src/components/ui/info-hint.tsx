"use client";

/**
 * InfoHint — small (i) glyph that reveals a kit-faithful tooltip on
 * hover/focus/tap. Sized to sit inline next to a label without
 * disrupting baseline.
 *
 * Usage:
 *   <span className="font-mono ...">
 *     Conviction
 *     <InfoHint label="Multiplier 1×–5× — distance from centre scales your stake. Mara ya kuongezeka kwa dau." />
 *   </span>
 *
 * Wraps the existing kit Tooltip atom so all hover/focus delay +
 * arrow styling stays consistent with the rest of the surface.
 */

import { Tooltip } from "./tooltip";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function InfoHint({
  label,
  size = 11,
  className,
}: {
  label: React.ReactNode;
  size?: number;
  className?: string;
}) {
  const { t } = useT();
  return (
    <Tooltip label={label} className={className}>
      <span
        aria-hidden
        className="inline-block align-[-0.1em] text-text-subtle hover:text-text-muted ml-1 cursor-help transition-colors"
      >
        <I.info s={size} />
      </span>
      <span className="sr-only">{typeof label === "string" ? label : t.common.info}</span>
    </Tooltip>
  );
}
