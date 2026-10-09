import type { CSSProperties, ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

/**
 * THE GHOST KIT — the parts a loading ghost draws its page's boxes with (round 5's follow-up, R5-L).
 *
 * ⛔ ONE HELPER, AND IT IS R5-K's. `components/ui/ghost-text.tsx` (R5-K, on vodacom-visual since 6f5b24c0 — not on this
 * worktree's base, 9677a3f5) is the convention for a loading ghost's words: `GhostText` lays the page's own words out
 * in the page's own type classes and draws them as a bar on every line they take (`box-decoration-clone`), letters
 * transparent; `ghostShape` stands a datum in as its digits made zeros; `ChipGhost` is the kit Chip with its ink and edge
 * cleared. The first four exports below ARE those, verbatim, so every R5-L ghost draws exactly what R5-K's draw.
 * `ButtonGhost` is the one part R5-K's file lacks.
 * ⭐ ON THE MERGE (S/r5l/r5l-on-6f5b24c0.patch, built by S/r5l/merge/build.cjs): `ButtonGhost` and its `glyphRoom` move
 * to the end of `ghost-text.tsx`, every `@/components/ui/ghost-kit` import reads `@/components/ui/ghost-text`, and this
 * file is deleted.
 * ⛔ Only for words that SIZE a box. A page's own header — its eyebrow, title and subtitle — is printed in a ghost, as the
 *    page prints it: it is the page's name and waits for no data (R5-H's /agent and /leaderboard; R5-K's rule too).
 */
export const GHOST_TEXT_CLASS = "select-none rounded-sm bg-bg-overlay text-transparent box-decoration-clone";

export function GhostText({ children, className }: { children: ReactNode; className?: string }) {
  return <span aria-hidden className={cn(GHOST_TEXT_CLASS, className)}>{children}</span>;
}

/** A datum's shape: its digits as zeros (a monospaced digit is one width) — "TZS 10,000" → "TZS 00,000". */
export const ghostShape = (s: string) => s.replace(/\d/g, "0");

/**
 * THE KIT CHIP WHILE ITS PAGE LOADS — the very `<Chip>` the page draws (its size row, its metrics, its padding and its
 * wrap), its ink and edge cleared and its words set and not shown, with the glyph's box where the page puts one. So the
 * pill is the page's pill to the pixel, in every language.
 */
const GHOST_CHIP: CSSProperties = { background: "var(--bg-overlay)", borderColor: "transparent", color: "transparent" };
export function ChipGhost({
  size = "md",
  metrics,
  glyph,
  nowrap,
  children,
}: {
  size?: "sm" | "md" | "lg";
  metrics?: "status" | "base";
  /** The page's glyph, in px — drawn as an empty box of that size. */
  glyph?: number;
  /** The page's `whiteSpace: "nowrap"` (a chip that never breaks). */
  nowrap?: boolean;
  children: ReactNode;
}) {
  return (
    <Chip aria-hidden size={size} metrics={metrics ?? "base"} className="select-none" style={nowrap ? { ...GHOST_CHIP, whiteSpace: "nowrap" } : GHOST_CHIP}>
      {glyph ? <span className="inline-block shrink-0" style={{ width: glyph, height: glyph }} /> : null}
      {children}
    </Chip>
  );
}

/** The glyph's room a button keeps beside its label (the page passes a 14–16px glyph as `leading` / `trailing`). */
const glyphRoom = (s: number) => <span className="shrink-0" style={{ width: s, height: s }} />;

/**
 * THE KIT BUTTON WHILE ITS PAGE LOADS (R5-L) — the button's own box: `.btn` and its size rung (height, padding, gap,
 * type, radius, the 1px border) with its label set and not shown and its glyph's room, so a row of inline buttons wraps
 * where the page's row does (/live's "Open market" beside the dots, /agent's CTA, the invitation's actions). A
 * full-width button's height is its rung alone, so a box of that height stands for it as well.
 */
export function ButtonGhost({ size, children, leading, trailing, className }: {
  size: "md" | "lg";
  children: ReactNode;
  /** The px size of the glyph the page's button leads with (`leading={<I.x s={16} />}`), if any. */
  leading?: number;
  trailing?: number;
  className?: string;
}) {
  return (
    <span className={cn("btn", size === "lg" ? "btn-lg" : "btn-md", "pointer-events-none select-none bg-bg-overlay text-transparent kp-shimmer-track", className)} aria-hidden>
      {leading ? glyphRoom(leading) : null}
      {children}
      {trailing ? glyphRoom(trailing) : null}
    </span>
  );
}
