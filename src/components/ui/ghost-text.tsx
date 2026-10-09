import type { CSSProperties, ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

/**
 * WORDS SET AND NOT SHOWN — the line a loading ghost draws where its page will put a line of words (round 5 of the
 * Vodacom visual pass, follow-up R5-K, 2026-10-09). Inside an element that wears the PAGE's own type classes it is laid
 * out exactly as those words will be — the same face, size, line and wrap, in every language at every width — and drawn
 * as a bar on each line it takes (`box-decoration-clone`), its letters transparent. So a block that wraps on the page
 * wraps in its ghost, and the band under it lands where the ghost promised.
 * ⭐ THE ONE RULE OF THE R5-K GHOSTS (/wallet/receipt, /wallet/deposit and its return, /wallet/withdraw, /profile,
 * /positions, /positions/performance): a ghost SHOWS its page's name where the drawing knows it (the PageHeader's words,
 * as every ghost did) and nothing else. Every other line is the page's own words — or, where the page prints data the
 * ghost cannot have (an amount, an id, a date, a name), the SHAPE of that data (`ghostShape`: its digits as zeros, in
 * the page's own face) — set and not shown. A line that cannot wrap (a truncated title, a one-line figure) may instead
 * be a box of the page's line height, as the receipts list's ghost draws its rows (R5-H).
 * ⛔ A shape, never text: hidden from a screen reader, never selectable, nothing to press — and nothing a player could
 * read is a fact the ghost does not have (§C; the provider's return says nothing of the outcome, RULES law 5).
 * Siblings that set their words the same way: the home ghost's intro (`.kp-hghost`, R4-J), the money books' bar ghost
 * (`app/wallet/money-bar-ghost.tsx`, R5-H) and the opt-out page's loading state (`app/s/[token]/loading.tsx`).
 */
export const GHOST_TEXT_CLASS = "select-none rounded-sm bg-bg-overlay text-transparent box-decoration-clone";

export function GhostText({ children, className }: { children: ReactNode; className?: string }) {
  return <span aria-hidden className={cn(GHOST_TEXT_CLASS, className)}>{children}</span>;
}

/** A datum's shape: its digits as zeros (a monospaced digit is one width) — "TZS 10,000" → "TZS 00,000". */
export const ghostShape = (s: string) => s.replace(/\d/g, "0");

/** The money a ghost stands a figure in for: a five-figure amount, the common deposit (`formatTzs(10_000)`). */
export const AMOUNT_SHAPE = "TZS 00,000";

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
