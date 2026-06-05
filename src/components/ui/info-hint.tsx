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

export function InfoHint({
  label,
  size = 11,
  className,
}: {
  label: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <Tooltip label={label} className={className}>
      <Info
        size={size}
        aria-hidden
        className="inline-block align-[-0.1em] text-text-subtle hover:text-text-muted ml-1 cursor-help transition-colors"
      />
      <span className="sr-only">{typeof label === "string" ? label : "Info"}</span>
    </Tooltip>
  );
}
