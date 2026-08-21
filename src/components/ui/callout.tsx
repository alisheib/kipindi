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

export type CalloutTone = "warning" | "info" | "brand" | "danger" | "success";

// `strongBox` is NOT just "the same but 2px". The normal borders are deliberately
// low-opacity so an inline note sits quietly inside content — and at 2px that
// same 30–40% alpha reads as a pale grey frame, which is the opposite of alarm.
// Strong callouts therefore take the tone at full opacity.
//
// ⚠️ The warning/info FILLS carry no `/NN` (2026-08-21). `--warning-bg` and
// `--info-bg` are already `color-mix(… 18%, transparent)` in globals.css, so a
// modifier multiplies against that 18% — a `/30` on it meant 5.4%, below any
// usable contrast, and it was never what the author meant. What renders now is
// the designed 18% tint on both emphases; the box/strongBox distinction is
// carried by the BORDER (`-border` vs `-fg`), which is what the note above
// already argues. ⛔ Never re-add a modifier to a pre-mixed token — reach for a
// second token instead. brand/danger/success below sit on OPAQUE tokens
// (`--gold-500`, `--no-500`, `--yes-500`), so their modifiers are correct.
const TONE: Record<CalloutTone, { box: string; strongBox: string; icon: string; glyph: GlyphKey }> = {
  warning: { box: "border-warning-border bg-warning-bg", strongBox: "border-warning-fg bg-warning-bg", icon: "text-warning-fg", glyph: "warning" },
  info: { box: "border-info-border bg-info-bg", strongBox: "border-info-fg bg-info-bg", icon: "text-info", glyph: "info" },
  brand: { box: "border-gold-500/30 bg-gold-500/10", strongBox: "border-gold-400 bg-gold-500/15", icon: "text-gold-300", glyph: "shieldcheck" },
  danger: { box: "border-no-500/40 bg-no-500/10", strongBox: "border-no-500 bg-no-500/15", icon: "text-no-300", glyph: "alertCircle" },
  // DS sweep (2026-08-08) — the confirmation family. Several pages hand-rolled
  // this exact green box (RG "limits saved" was the flagged one); one home now.
  success: { box: "border-yes-700 bg-yes-500/10", strongBox: "border-yes-500 bg-yes-500/15", icon: "text-yes-300", glyph: "checkCircle" },
};

export function Callout({
  tone = "info",
  title,
  children,
  glyph,
  className,
  emphasis = "normal",
  live = false,
}: {
  tone?: CalloutTone;
  /** Optional bold lead line. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Override the tone's default glyph. */
  glyph?: GlyphKey;
  className?: string;
  /**
   * `strong` = a heavier border and a display-sized title. For the small number
   * of callouts describing a condition that is actively costing something right
   * now (e.g. /admin/payments: "every deposit is being refused"), where normal
   * weight reads as a footnote and gets skimmed past.
   */
  emphasis?: "normal" | "strong";
  /**
   * Announce to assistive tech as an ALERT rather than a note. Reserve for a
   * live failure the operator must act on — a note that interrupts on every
   * page load is worse than no note at all.
   */
  live?: boolean;
}) {
  const tk = TONE[tone];
  const Glyph = I[glyph ?? tk.glyph];
  const strong = emphasis === "strong";
  return (
    <div
      role={live ? "alert" : "note"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5",
        strong && "border-2 rounded-lg p-3",
        strong ? tk.strongBox : tk.box,
        className,
      )}
    >
      <span aria-hidden className={cn("shrink-0 mt-[1px]", tk.icon)}>
        <Glyph s={strong ? 18 : 14} />
      </span>
      <div className="text-caption leading-snug text-text-secondary">
        {title
          ? <p className={cn("font-bold text-text", strong && "font-display text-[15px] mb-1.5")}>{title}</p>
          : null}
        {children}
      </div>
    </div>
  );
}
