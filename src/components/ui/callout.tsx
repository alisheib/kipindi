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
import { IconPlate } from "@/components/ui/icon-plate";
import { cn } from "@/lib/utils";

/**
 * ⭐ THE ONE MAINTENANCE AMBER (stage 9, 2026-08-21).
 *
 * "Temporarily unavailable" was painted in THREE different ambers, none of which
 * knew about the others:
 *   • maintenance-badge.tsx    16% fill / 42% edge, over transparent
 *   • proposals-state-views.tsx 14% fill / 38% edge, over --bg-elevated
 *   • this file's `warning` tone  --warning-bg / --warning-border (18% / 36%)
 *
 * The token pair wins: it is the only one of the three that is already named in
 * globals.css, which is where a paint value belongs (DESIGN_AUTHORITY §0a). The
 * other two were literals written twice.
 *
 * ⚠️ The two forms are NOT interchangeable and both are needed. `bg`/`border`
 * composite over whatever is behind them; `panelBg`/`panelBorder` are OPAQUE,
 * mixed against `--bg-elevated`, which is what a full-width banner on the page
 * ground needs — swapping one for the other is a visible change, not a tidy-up.
 */
export const MAINTENANCE_AMBER = {
  bg: "var(--warning-bg)",
  border: "var(--warning-border)",
  panelBg: "color-mix(in oklab, var(--warning-500) 18%, var(--bg-elevated))",
  panelBorder: "color-mix(in oklab, var(--warning-500) 36%, var(--border))",
  fg: "var(--warning-500)",
} as const;

export type CalloutTone =
  | "warning" | "info" | "brand" | "danger" | "success"
  /* ⭐ ADDED 2026-08-21. `gold` is the HONEST name for what `brand` already was —
   * a gilt box, not a royal one — so the two share one object and `brand` stays
   * as a documented alias; renaming the call sites is a separate, reviewable
   * change. `maintenance` and `neutral` arrive from proposals-state-views. */
  | "gold" | "maintenance" | "neutral";

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
// (`--gold-500`, `--danger-500`, `--success`), so their modifiers are correct.
//
// `panel` is the OPAQUE form of the same tone — the tint mixed against
// `--bg-elevated` instead of composited over whatever happens to be behind. A
// full-bleed banner sitting on the page ground needs it; an inline note inside a
// panel does not. ⛔ It is a separate rendering, not a second definition of the
// colour: both forms name the same source token at the same percentage.
// `fg` is the raw colour for the stacked layout's icon plate, where the glyph is
// painted by inline `color` rather than by a Tailwind class.
type ToneSpec = {
  box: string;
  strongBox: string;
  icon: string;
  glyph: GlyphKey;
  panel: { bg: string; border: string };
  fg: string;
};

// The gilt box. `brand` and `gold` are ONE object so the alias can never drift
// from the name it aliases.
const GILT: ToneSpec = {
  box: "border-gold-500/30 bg-gold-500/10", strongBox: "border-gold-400 bg-gold-500/15", icon: "text-gold-300", glyph: "shieldcheck",
  panel: { bg: "color-mix(in oklab, var(--gold-500) 10%, var(--bg-elevated))", border: "color-mix(in oklab, var(--gold-500) 30%, var(--border))" },
  fg: "var(--gold-300)",
};

const TONE: Record<CalloutTone, ToneSpec> = {
  warning: {
    box: "border-warning-border bg-warning-bg", strongBox: "border-warning-fg bg-warning-bg", icon: "text-warning-fg", glyph: "warning",
    panel: { bg: MAINTENANCE_AMBER.panelBg, border: MAINTENANCE_AMBER.panelBorder }, fg: "var(--warning-fg)",
  },
  info: {
    box: "border-info-border bg-info-bg", strongBox: "border-info-fg bg-info-bg", icon: "text-info", glyph: "info",
    panel: { bg: "color-mix(in oklab, var(--info-500) 18%, var(--bg-elevated))", border: "color-mix(in oklab, var(--info-500) 36%, var(--border))" },
    fg: "var(--info)",
  },
  brand: GILT,
  gold: GILT,
  // 🔴 D2 (2026-08-21, owner ruling) — THESE TWO USED TO BE THE BETTING PAIR.
  // `danger` was `--no-500` and `success` was `--yes-500`, so a Callout reading
  // "We couldn't verify that document" was painted in the ink that means A LOST
  // BET, and "Limits saved" in the ink that means money is riding on YES. §B2
  // forbids reusing the betting pair for a non-money meaning; the kit's own
  // notice component was the widest breach of it in the product.
  // ⛔ Both now read the SEMANTIC families, which is what every other tone here
  // already did (`warning` → `--warning-*`, `info` → `--info-*`). The rose stays
  // rose and the green is a jade at hue 166, not the betting 152 — the change a
  // player SEES is a calmer, cooler confirmation box; an error box barely moves.
  // ⛔ A Callout is never the right home for a betting outcome. If you need to
  // say "your YES bet won", that is a money surface and it keeps `--yes-*`.
  // Border alphas were picked to HOLD the old weights, not inherited blindly:
  // `border-success/60` reads 2.47:1 against `--bg-elevated` where the old
  // opaque `border-yes-700` read 2.53; `border-danger-500/50` holds the old
  // `border-no-500/40`. Ink on the tint: success 9.23:1 worst, danger 7.68:1.
  danger: {
    box: "border-danger-500/50 bg-danger-500/10", strongBox: "border-danger-500 bg-danger-500/15", icon: "text-danger-fg", glyph: "alertCircle",
    panel: { bg: "color-mix(in oklab, var(--danger-500) 10%, var(--bg-elevated))", border: "color-mix(in oklab, var(--danger-500) 40%, var(--border))" },
    fg: "var(--danger-fg)",
  },
  // DS sweep (2026-08-08) — the confirmation family. Several pages hand-rolled
  // this exact green box (RG "limits saved" was the flagged one); one home now.
  success: {
    box: "border-success/60 bg-success/10", strongBox: "border-success bg-success/15", icon: "text-success-fg", glyph: "checkCircle",
    panel: { bg: "color-mix(in oklab, var(--success) 10%, var(--bg-elevated))", border: "color-mix(in oklab, var(--success) 40%, var(--border))" },
    fg: "var(--success-fg)",
  },
  // "Back shortly" — deliberately amber and NEVER the NO-rose danger hue, so a
  // player cannot read a scheduled pause as a failure. The pause glyph (not a
  // gear, not a warning triangle) carries the same promise.
  maintenance: {
    box: "border-warning-border bg-warning-bg", strongBox: "border-warning-fg bg-warning-bg", icon: "text-warning-fg", glyph: "pause",
    panel: { bg: MAINTENANCE_AMBER.panelBg, border: MAINTENANCE_AMBER.panelBorder }, fg: MAINTENANCE_AMBER.fg,
  },
  // Honest "not available", guided elsewhere. Dashed edge because B10.3 makes
  // dashed the empty-state border, and that is exactly what this state is.
  neutral: {
    box: "border-dashed border-border bg-bg-elevated/40", strongBox: "border-dashed border-border-strong bg-bg-elevated/40", icon: "text-text-subtle", glyph: "info",
    panel: { bg: "var(--bg-overlay)", border: "var(--border)" },
    fg: "var(--text-subtle)",
  },
};

// ⚠️ SIZE IS THE NOTICE'S WEIGHT, NOT ITS ALARM — `emphasis` is the alarm.
// `sm` is the inline note this component was born as. `md` is the standing
// page-level notice (payout-status, feature banners): a bigger box, a display
// title and a body one step lighter, because at `sm` a notice that must be read
// before money moves reads as a footnote and gets skimmed past.
const SIZE = {
  sm: { box: "gap-2.5 rounded-md px-3 py-2.5", icon: 14, title: "font-bold text-text", body: "text-caption leading-snug text-text-secondary", titleGap: "" },
  md: { box: "gap-3 rounded-xl px-4 py-3.5", icon: 17, title: "font-display font-semibold text-text text-[13.5px]", body: "text-body-sm leading-snug text-text-muted", titleGap: "mt-1" },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
  glyph,
  className,
  emphasis = "normal",
  live = false,
  size = "sm",
  surface = "tint",
  layout = "row",
  meta,
  badge,
  action,
  role,
  titleAs: TitleTag = "p",
}: {
  tone?: CalloutTone;
  /** Optional bold lead line. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Override the tone's default glyph. */
  glyph?: GlyphKey;
  className?: string;
  /**
   * `sm` (default) = the inline note. `md` = the standing page-level notice —
   * bigger box, display title, lighter body. See the note on `SIZE` above.
   */
  size?: "sm" | "md";
  /**
   * `tint` (default) composites the tone over whatever is behind the box.
   * `panel` paints it OPAQUE, mixed against `--bg-elevated`.
   * ⛔ Not interchangeable: a full-width banner on the page ground needs `panel`
   * or the tint reads at the wrong strength against an un-elevated surface.
   */
  surface?: "tint" | "panel";
  /**
   * `row` (default) = glyph beside the text. `stack` = the centred BLOCK form:
   * an <IconPlate>, an optional badge, a display title, body, and an action — the
   * shape a page uses when the notice IS the page (a blocked composer, a feature
   * that is switched off). It is the same tone system, not a second component.
   */
  layout?: "row" | "stack";
  /** Mono uppercase sub-line under the body — e.g. "Since 29 Jul, 14:20". */
  meta?: React.ReactNode;
  /** `stack` only — a flag between the plate and the title (e.g. a state badge). */
  badge?: React.ReactNode;
  /** `stack` only — the way forward. A notice that is a dead end is a defect. */
  action?: React.ReactNode;
  /**
   * Announce as `note` (default), `status` (a passive state change), or `alert`.
   * Overrides whatever `live` would have chosen; `live` is kept for the callers
   * that already use it.
   */
  role?: "note" | "status" | "alert";
  /** Heading level for `title`. A page-level `stack` should be a real heading. */
  titleAs?: "p" | "h1" | "h2" | "h3";
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
  const sz = SIZE[size];
  const panel = surface === "panel";
  // ⛔ On `panel` the tone's colour arrives as INLINE style, so the class-based
  // box must not also be applied — a flat class background would sit under the
  // inline one and the two would disagree the moment either is edited.
  const panelStyle = panel ? { background: tk.panel.bg, borderColor: tk.panel.border } : undefined;
  const resolvedRole = role ?? (live ? "alert" : "note");

  const metaLine = meta
    ? <p className="mt-1.5 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">{meta}</p>
    : null;

  if (layout === "stack") {
    return (
      <div
        role={resolvedRole}
        className={cn(
          "flex flex-col items-center rounded-card border p-6 text-center sm:p-8",
          panel ? null : strong ? tk.strongBox : tk.box,
          className,
        )}
        style={panelStyle}
      >
        <IconPlate
          size={56}
          fg={tk.fg}
          bg="color-mix(in oklab, var(--bg-base) 55%, transparent)"
          border={`1px solid ${panel ? tk.panel.border : "currentColor"}`}
          aria-hidden
        >
          <Glyph s={26} />
        </IconPlate>
        {badge ? <div className="mt-3.5">{badge}</div> : null}
        {title ? (
          <TitleTag className="mt-3 font-display text-[18px] font-bold leading-snug text-text">{title}</TitleTag>
        ) : null}
        {children ? (
          <div className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed text-text-muted">{children}</div>
        ) : null}
        {metaLine}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      role={resolvedRole}
      className={cn(
        "flex items-start border",
        sz.box,
        strong && "border-2 rounded-lg p-3",
        panel ? null : strong ? tk.strongBox : tk.box,
        className,
      )}
      style={panelStyle}
    >
      <span aria-hidden className={cn("shrink-0", size === "md" ? "mt-0.5" : "mt-[1px]", tk.icon)}>
        <Glyph s={strong ? 18 : sz.icon} />
      </span>
      <div className={cn(sz.body, size === "md" && "min-w-0")}>
        {title
          ? <TitleTag className={cn(sz.title, strong && "font-display text-[15px] mb-1.5")}>{title}</TitleTag>
          : null}
        {title && sz.titleGap ? <div className={sz.titleGap}>{children}</div> : children}
        {metaLine}
      </div>
    </div>
  );
}
