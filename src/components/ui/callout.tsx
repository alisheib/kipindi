/**
 * Callout — the kit's inline notice box.
 *
 * The bordered/tinted "here is something you should know" panel was hand-rolled
 * in at least four places (house-lean-warning, sell-confirm-modal, the market
 * page's one-sided disclaimer and its hedge warning), each with its own copy of
 * `border-… bg-…/30 px-3 py-2.5 rounded-md` and its own glyph choice. They had
 * already drifted — different paddings, different tints, different icon sizes.
 * This is the one implementation.
 *
 * Tones map to the existing OKLCH token set in globals.css. No new colours.
 *
 *   warning — the poll is lopsided, your upside is thin. NOT "you may lose".
 *   info    — neutral explanation (how the fee works, one-sided refunds)
 *   brand   — a promise we're making (the winner floor, the free-exit window)
 *   danger  — an actual problem/failure
 *
 * Usage:
 *   <Callout tone="warning">Upside is thin — the other side is small.</Callout>
 *   <Callout tone="brand" title="You can't lose on a correct call">…</Callout>
 */

import { I, type GlyphKey } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export type CalloutTone = "warning" | "info" | "brand" | "danger";

const TONE: Record<CalloutTone, { box: string; icon: string; glyph: GlyphKey }> = {
  warning: { box: "border-warning-border bg-warning-bg/30", icon: "text-warning-fg", glyph: "warning" },
  info: { box: "border-info-border bg-info-bg/20", icon: "text-info", glyph: "info" },
  brand: { box: "border-gold-500/30 bg-gold-500/10", icon: "text-gold-300", glyph: "shieldcheck" },
  danger: { box: "border-no-500/40 bg-no-500/10", icon: "text-no-300", glyph: "alertCircle" },
};

export function Callout({
  tone = "info",
  title,
  children,
  glyph,
  className,
}: {
  tone?: CalloutTone;
  /** Optional bold lead line. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Override the tone's default glyph. */
  glyph?: GlyphKey;
  className?: string;
}) {
  const tk = TONE[tone];
  const Glyph = I[glyph ?? tk.glyph];
  return (
    <div
      role="note"
      className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5", tk.box, className)}
    >
      <span aria-hidden className={cn("shrink-0 mt-[1px]", tk.icon)}>
        <Glyph s={14} />
      </span>
      <div className="text-caption leading-snug text-text-secondary">
        {title ? <p className="font-bold text-text">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
