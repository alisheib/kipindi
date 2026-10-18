"use client";

/**
 * GlyphSwap — M5's state-morph primitive (`.g-swap-in`) as a component, so a
 * toggled glyph pair (bell→ringing, eye→eye-off, watch→watching) inherits the
 * one swap vocabulary by taking a class instead of hand-rolling motion.
 *
 * M5 (DESIGN_AUTHORITY §M5): a glyph moves for a reason, and all 178
 * move the same way — four primitives, triggered by mount, data change or state
 * change, NEVER hover. This wrapper fires `glyph-swap-in` only when `state`
 * CHANGES: the first render is an arrival, not a morph, so it renders static.
 *
 * The outgoing glyph is not kept alive for `.g-swap-out`: React unmounts it in
 * the same commit, and holding a ghost copy would need a timer (this codebase
 * bans setTimeout choreography) plus an `onAnimationEnd` that never fires under
 * any of the three reduced-motion gates — the stacked pair would then render
 * PERMANENTLY under `animation: none`. The swap-in half alone reads as the
 * morph; the reduced-motion branches in motion.css render its end frame.
 *
 * `onlyOn` morphs only a change INTO a truthy state, and cuts the change out of
 * it: a destination becoming the current one morphs to its Fill, and the one it
 * leaves is back to Line at once (`NavGlyph`, PHOSPHOR-MIGRATION W3), so one
 * destination is lit in every frame.
 */

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlyphSwap({
  state,
  onlyOn = false,
  className,
  children,
}: {
  /** The value whose CHANGE constitutes the state morph (e.g. `watching`). */
  state: string | number | boolean;
  /** Morph only into a truthy `state`; a change back is a cut. */
  onlyOn?: boolean;
  className?: string;
  /** The glyph currently representing `state` — render exactly one. */
  children: ReactNode;
}) {
  const initial = useRef(state);
  const changed = useRef(false);
  if (state !== initial.current) changed.current = true;
  return (
    <span
      key={String(state)}
      aria-hidden
      className={cn("inline-flex shrink-0", changed.current && (!onlyOn || Boolean(state)) && "g-swap-in", className)}
    >
      {children}
    </span>
  );
}
