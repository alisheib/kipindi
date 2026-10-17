/**
 * THE PARTS EVERY MILLIONEA LOADING DRAWING IS MADE OF (MASWALI-BUILD S5 composition; `components/ui/page-loader.tsx`'s
 * rule: a ghost opens on the bands its page opens on, with the page's own parts, in the page's own rhythm).
 *
 * ⭐ ITS WORDS ARE SET AND NOT SHOWN (`GhostText`) — a deliberate departure from the loader rule that prints a page's name
 *    while it waits. The journey's root loading state picks its picture by the ADDRESS before any gate has answered
 *    (`route-ghost.tsx`), so a picture that printed "Maswali Millionea" would name a product the rollout hides from that
 *    reader for the moment before the not-found page lands (MR-2: a hidden product is a missing page, never "coming soon").
 *    The geometry is the page's; the words wait for the gate.
 * ⛔ No directive and no read: client drawings load it, each handing in its words.
 */
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { GhostText } from "@/components/ui/ghost-text";
import { cn } from "@/lib/utils";

/** A page's head, as `PageHeader` draws it, its words set and not shown. */
export function MaswaliGhostHead({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div aria-hidden>
      <PageHeader eyebrow={eyebrow ? <GhostText>{eyebrow}</GhostText> : undefined} title={<GhostText>{title}</GhostText>} />
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
