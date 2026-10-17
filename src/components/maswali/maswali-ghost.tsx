/**
 * THE PARTS EVERY MILLIONEA LOADING DRAWING IS MADE OF (MASWALI-BUILD S5 composition; `components/ui/page-loader.tsx`'s
 * rule: a ghost opens on the bands its page opens on, with the page's own parts, in the page's own rhythm).
 *
 * ⛔ NO WORDS AT ALL — BARS AND SHAPES ONLY (the S5 review of 24ec0d33, HIGH 2). A loading drawing streams before any gate
 *    has answered: the journey's root loading state picks its picture by the ADDRESS (`route-ghost.tsx`), and a route's own
 *    loading file renders before its page's `notFound()`. So a signed-in reader the edge passes to the tickets' gate (L5)
 *    while Millionea is dark got HTTP 200 with the ghost in the document — and words "set and not shown" (`GhostText`'s
 *    transparent letters) are still words in it. A hidden product is a missing page (MR-2: never "coming soon"), so every
 *    Millionea drawing is wordless: a line of words is a bar inside that line's own element (`GhostLine`), so the geometry
 *    stays the page's, and the one word left is the platform's own "Loading" for a screen reader, which names nothing.
 *    `test:maswali-ui` 1.3 holds every Millionea loading and ghost file to it.
 * ⛔ No directive and no read: client drawings load it.
 */
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/** A line of words the drawing may not state, as a bar inside the line's own element: the line box is that element's own
 *  (its face, size and line height), so the band under it lands where the page's will. `className` is its width. */
export function GhostLine({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block h-[0.85em] max-w-full rounded-sm bg-bg-overlay align-middle", className)} />;
}

/** A page's head, as `PageHeader` draws it — its eyebrow and its title as bars of the given widths, never their words. */
export function MaswaliGhostHead({ eyebrowWidth, titleWidth }: { eyebrowWidth?: string; titleWidth: string }) {
  return (
    <div aria-hidden>
      <PageHeader eyebrow={eyebrowWidth ? <GhostLine className={eyebrowWidth} /> : undefined} title={<GhostLine className={titleWidth} />} />
    </div>
  );
}

/** A bar where a line of text will be. */
export function GhostBar({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block rounded bg-bg-elevated kp-shimmer-track", className)} />;
}

/** A surface where a card will be, on the card's own rung. */
export function GhostCard({ className, children }: { className?: string; children?: ReactNode }) {
  return <div aria-hidden className={cn("mat-raised rounded-card kp-shimmer-track", className)}>{children}</div>;
}
