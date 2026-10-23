/**
 * THE PARTS EVERY MILLIONEA LOADING DRAWING IS MADE OF (MASWALI-BUILD S5 composition; `components/ui/page-loader.tsx`'s
 * rule: a ghost opens on the bands its page opens on, with the page's own parts, in the page's own rhythm).
 *
 * ⛔ NO WORD OF ITS OWN, AND NO WORD AT ALL FOR A READER MILLIONEA IS HIDDEN FROM (the S5 review of 24ec0d33, HIGH 2; the
 *    lead's ruling of 2026-10-23, MASWALI-BUILD S5-R3-FIX 7). A loading drawing streams before any gate has answered: the
 *    journey's root loading state picks its picture by the ADDRESS (`route-ghost.tsx`), and a route's own loading file
 *    renders before its page's `notFound()`. So a signed-in reader the edge passes to the tickets' gate (L5) while
 *    Millionea is dark got HTTP 200 with the ghost in the document — and words "set and not shown" (`GhostText`'s
 *    transparent letters) are still words in it. A hidden product is a missing page (MR-2: never "coming soon"). So a
 *    drawing draws a line of words as a bar inside that line's own element (`GhostLine`), the geometry the page's — save a
 *    STATIC paragraph's words, which it sets unseen through the kit's ONE part for them, `GhostWords`
 *    (`maswali-ghost-words.tsx`), from its page's words module: that part sets them only inside the shell's provider,
 *    which is handed only while Millionea is visible to the request, and draws a plain bar otherwise. The one word left
 *    that is always drawn is the platform's own "Loading" for a screen reader, which names nothing. `test:maswali-ui` 1.3
 *    holds every Millionea loading and ghost file to it.
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

/** One line of words in the page's own type — `text` names the classes of the element those words sit in — as its bar
 *  inside that line's own box: a band of such lines is the page's height, never a bar of a guessed one (the hub's drawing's
 *  rule, S5-DESIGN-HUB L7, where it was drawn first as its own `Line`). `width` is the bar's. */
export function GhostTextLine({ text = "", width, className }: { text?: string; width: string; className?: string }) {
  return <span className={cn("block", text, className)}><GhostLine className={width} /></span>;
}

/** A page's head, as `PageHeader` draws it — its eyebrow and its title as bars of the given widths, never their words.
 *  The eyebrow's bar stands in its own line box (`GhostTextLine`): PageHeader's eyebrow is a flex row, where a bare bar was
 *  a flex item of its own 0.85em (9.35px) against the page's 15px line (16px in Millionea's Chinese) — every drawing under
 *  this head stood 6px high (measured by `qa:maswali-register-shots`' how-ghost hop, S5-R2-REGISTER 20). */
export function MaswaliGhostHead({ eyebrowWidth, titleWidth }: { eyebrowWidth?: string; titleWidth: string }) {
  return (
    <div aria-hidden>
      <PageHeader eyebrow={eyebrowWidth ? <GhostTextLine width={eyebrowWidth} /> : undefined} title={<GhostLine className={titleWidth} />} />
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
