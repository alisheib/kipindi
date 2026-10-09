import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * THE GHOST KIT — the parts a loading ghost draws its page's boxes with, in one place (round 5's follow-up, R5-L).
 *
 * A ghost's job is to land where its page lands, box for box (`components/ui/page-loader.tsx` has the convention). Where a
 * box's size is set by WORDS — a panel's sentences, a step's label, a button's name — a typed bar can only be right in one
 * language at one width: the page's sentence wraps differently in Swahili, English and Chinese and at every breakpoint,
 * and the bar does not. So a ghost sets the page's own words, in the page's own type and box, and shows them as a bar
 * instead of as ink: they wrap exactly where the page's will. The home ghost (R4-J, `.kp-hghost`), the SMS opt-out ghost
 * (`s/[token]/loading.tsx`) and the money books' bar ghost (R5-H, now `query-bar-ghost.tsx`) already held words this way;
 * this is the one spelling for every other ghost.
 *   · `Words` — `box-decoration-clone` gives every wrapped line its own rounded bar, and a background changes nothing
 *     about where a line breaks. `ink` is the bar's tone on what it sits on: `title` for a heading's line, `line` for a
 *     sentence's (the agent ghosts' two tones), `ground` on the page's own ground, where an overlay tint is not seen (the
 *     opt-out ghost's measured 1.01:1). No sheen on a bar: `kp-shimmer-track` sweeps the box it is given, and an inline
 *     box that wraps would carry it across the gaps between its lines — the sheen stays on the ghost's blocks.
 *   · `ButtonGhost` — the button's own box: `.btn` and its size rung (height, padding, gap, type, radius, the 1px border)
 *     with its label and its glyph's room, so a row of buttons wraps where the page's row does.
 *   · `CHIP_GHOST` — the style a `Chip` is drawn with in a ghost: the kit chip's own box (its size and status metrics)
 *     in the ghost's tint, its words not shown.
 * ⛔ Only for words that SIZE a box. A page's own header — its eyebrow, title and subtitle — is printed in a ghost, as the
 *    page prints it: it is the page's name and waits for no data (R5-H's /agent, the leaderboard's).
 * ⛔ A figure the ghost cannot know is a placeholder of the page's digit count ("00"), never a number.
 */
export const GHOST_WORDS = "rounded-sm text-transparent box-decoration-clone";

const INK = {
  title: "bg-bg-overlay/60",
  line: "bg-bg-overlay/40",
  ground: "bg-bg-elevated",
} as const;

export function Words({ children, ink = "line", className }: { children: ReactNode; ink?: keyof typeof INK; className?: string }) {
  return <span className={cn(GHOST_WORDS, INK[ink], className)}>{children}</span>;
}

/** The glyph's room a button keeps beside its label (the page passes a 14–16px glyph as `leading` / `trailing`). */
const glyphRoom = (s: number) => <span className="shrink-0" style={{ width: s, height: s }} />;

export function ButtonGhost({ size, children, leading, trailing, className }: {
  size: "md" | "lg";
  children: ReactNode;
  /** The px size of the glyph the page's button leads with (`leading={<I.x s={16} />}`), if any. */
  leading?: number;
  trailing?: number;
  className?: string;
}) {
  return (
    <span className={cn("btn", size === "lg" ? "btn-lg" : "btn-md", "pointer-events-none bg-bg-overlay text-transparent kp-shimmer-track", className)}>
      {leading ? glyphRoom(leading) : null}
      {children}
      {trailing ? glyphRoom(trailing) : null}
    </span>
  );
}

export const CHIP_GHOST: CSSProperties = { color: "transparent", background: "var(--bg-overlay)", borderColor: "transparent" };
