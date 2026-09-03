/**
 * Chip — kit-faithful (kit50.jsx Chip). THE one chip definition.
 * Pill-shaped, height-based sizing, 700 weight, 0.06em tracking, uppercase.
 * Optional pulsing live-dot for live markets.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). A chip had TWO definitions: this
 * component and the `.chip` / `.chip-*` family in globals.css. They were
 * byte-similar, which is exactly why they drifted without anyone noticing:
 *
 *   • The G-7 overflow fix (min-height + wrap, see the long note in the body)
 *     was applied ONLY here. The CSS `.chip` is still a fixed 21px, and
 *     `.mcardp .chip` re-adds `white-space: nowrap` — so a Swahili label (~35–40%
 *     longer than the English) still overflows every raw-class market-card chip.
 *   • This component emits NO `chip` class, so `.mcardp .chip`'s 9px treatment
 *     never reached a `<Chip>`. Two chips on one card could render at 9px and
 *     10.5px depending on which definition their author happened to use.
 *   • Each side carried variants the other lacked: CSS had signal/new/hot-rose,
 *     this had brand/gold/active/paused/claret/warning/danger/info/success.
 *
 * ⭐ THE COMPONENT WINS AND THE CSS FAMILY GOES — deliberately the reverse of
 * "consume the CSS classes", for four reasons:
 *   1. `.mcardp .chip` is a per-surface descendant override, i.e. a second
 *      definition of one truth by construction. The fix is a PROP (`size="xs"`,
 *      added below), and props cannot live in a stylesheet.
 *   2. Converging on CSS means writing 9 new rules; converging here meant 3 new
 *      variants — and these are TYPED. A typo'd `chip-lve` is silent; a typo'd
 *      `variant="lve"` fails the build.
 *   3. G-7 is already correct here and still broken there. Migrating toward the
 *      broken copy is the wrong direction.
 *   4. `selected`, `dot` and size scaling have no CSS expression without yet
 *      more classes.
 * ⛔ Nothing is deleted from globals.css by this file — the raw-class call sites
 * must migrate FIRST. The exact CSS deletions are reported with this change.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "neutral" | "cat"
  | "yes" | "no"
  | "live" | "resolved" | "pending" | "objection"
  | "active" | "paused" | "claret"
  | "brand" | "gold" | "success" | "warning" | "danger" | "info"
  /* ⭐ ADDED 2026-08-21 (stage 9 consolidation) — the three variants that existed
   * ONLY as CSS classes (`.chip-signal`, `.chip-new`, `.chip-hot-rose`). They are
   * ported byte-for-byte so the raw-class call sites can migrate onto this
   * component without a repaint; see the header note below for why the CSS family
   * is the copy that goes, not this one. */
  | "signal" | "new" | "hot";

type Size = "xs" | "sm" | "md" | "lg";

/* kit50.jsx Chip — [fg, bg, border].
 *
 * DOCUMENTED VARIANT SET (grouped by hue). Several variant NAMES are visually
 * identical but kept distinct because they carry different call-site intent —
 * they share ONE style object below so the pair can never drift apart:
 *   • slate  — neutral (default) · cat (category tag)
 *   • green  — yes (betting YES) ONLY. ⭐ `success` was SPLIT OFF on 2026-08-31 (Ali's
 *     sign-off, DG-A-21): it now paints `--success-*`, the app-state family, because §B2a
 *     forbids the betting ink on a non-money meaning and every console APPROVED/LIVE chip
 *     was wearing it. ⚠️ `yes` now has ZERO call sites and is kept only as the betting name.
 *   • royal  — brand (brand accent) · active (enabled/on state)
 *   • gilt   — gold (earned/emphasis) · objection (objection window)
 *   • rose   — no (betting NO) · hot (the board's "hot" signal flag)
 * Distinct one-offs: live, resolved, pending, paused, claret, warning,
 * danger, info, signal, new. (`pending`/`info` are royal-adjacent but intentionally differ
 * in alpha/hue, so they are NOT merged.) ✅ The green pair was collapsed on 2026-08-31 with
 * Ali's sign-off (see below). ⚠️ The ROSE pair (`no` / `hot`) is UNCHANGED and both have zero
 * call sites; splitting it was offered and not taken, so it stays one object. */
const SLATE: React.CSSProperties = { background: "oklch(34% 0.09 268 / 0.5)",  color: "var(--text-muted)", borderColor: "var(--border)" };
const GREEN: React.CSSProperties = { background: "oklch(52% 0.15 150 / 0.22)", color: "var(--yes-300)",    borderColor: "oklch(61% 0.16 150 / 0.5)" };
/* ⭐ SPLIT FROM `GREEN` — Ali's sign-off, 2026-08-31 (DG-A-21). The note above deferred this,
   arguing the pair "share ONE style object so the pair can never drift apart". Re-derived at
   HEAD that argument had lost its ground: `variant="success"` has 13 call sites and
   `variant="yes"` has **zero**, so the pairing was protecting a drift between a live variant
   and a dead one — while every console APPROVED/LIVE chip painted `var(--yes-300)`, the ink
   that means *a player's money is on this side of a market*. §B2a beneath §B11.
   ⛔ AND IT ONLY BECAME WRITEABLE TODAY: `--success-500` existed at `globals.css:188` but was
   not exposed as a utility, so nothing could spell the app-state green (fixed in the same
   commit, held by `test:bridge` §9). The trio below is the SANCTIONED one — `globals.css:185`
   records `--success-fg` on an 18% `--success` tint at **9.23:1**, well over §A1's 4.5 floor. */
const SUCCESS: React.CSSProperties = { background: "var(--success-bg)", color: "var(--success-fg)", borderColor: "var(--success-border)" };
const ROYAL: React.CSSProperties = { background: "oklch(54% 0.165 262 / 0.20)", color: "var(--brand-300)", borderColor: "oklch(63% 0.18 262 / 0.45)" };
const GILT:  React.CSSProperties = { background: "oklch(72% 0.13 80 / 0.22)",  color: "var(--gold-300)",   borderColor: "oklch(80% 0.13 80 / 0.5)" };
/* ROSE is `.chip-no`'s ink exactly. `.chip-hot-rose` was a byte-identical copy of
 * `.chip-no` that differed ONLY in taking the taller status metrics — so `hot`
 * shares this object with `no` and earns its height from `isStatus` instead. */
const ROSE:  React.CSSProperties = { background: "oklch(50% 0.19 25 / 0.22)",  color: "var(--no-300)",     borderColor: "oklch(58% 0.2 25 / 0.5)" };

const variantStyle: Record<Variant, React.CSSProperties> = {
  neutral:   SLATE,
  cat:       SLATE,
  yes:       GREEN,
  success:   SUCCESS,
  brand:     ROYAL,
  active:    ROYAL,
  gold:      GILT,
  objection: GILT,
  no:        ROSE,
  hot:       ROSE,
  live:      { background: "oklch(55% 0.20 25 / 0.30)",                    color: "oklch(96% 0.04 25)", borderColor: "oklch(62% 0.20 25 / 0.6)" },
  resolved:  { background: "linear-gradient(180deg, var(--gold-300), var(--gold-500))", color: "oklch(24% 0.06 80)", borderColor: "oklch(60% 0.10 78)" },
  pending:   { background: "oklch(54% 0.165 262 / 0.26)",                  color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.55)" },
  paused:    { background: "oklch(72% 0.13 80 / 0.18)",                    color: "oklch(82% 0.16 80)", borderColor: "oklch(80% 0.13 80 / 0.4)" },
  claret:    { background: "var(--claret-soft)",                            color: "var(--claret-200)",  borderColor: "var(--claret-edge)" },
  warning:   { background: "oklch(72% 0.13 80 / 0.22)",                    color: "oklch(82% 0.16 80)", borderColor: "oklch(80% 0.13 80 / 0.5)" },
  danger:    { background: "oklch(55% 0.20 25 / 0.22)",                    color: "oklch(80% 0.18 25)", borderColor: "oklch(62% 0.20 25 / 0.5)" },
  info:      { background: "oklch(54% 0.165 262 / 0.22)",                  color: "oklch(78% 0.13 240)",borderColor: "oklch(63% 0.18 262 / 0.5)" },
  /* Ported from `.chip-signal` — the tipping-point flag. Base metrics: the CSS
   * rule set no height/padding/font-size, so it inherited plain `.chip`.
   * ⚠️ PV-13c (2026-09-03) — D6's RULING AND ITS MEASURED FIGURES, carried here from the
   * globals.css rule this variant replaced, because they are the reason for the value and the
   * CSS comment that held them is deleted. 🔴 TIPPING WAS AQUA AND §B4 BANS AQUA on "a chip, a
   * button label, or anything semantic" — aqua is a ≤8% finishing pass. Owner ruling
   * 2026-08-21 moved it to ROYAL, the family `new` also argues for, because "this market is at
   * its tipping point" is CHROME, a fact about the board. It takes the family's BRIGHTEST step
   * (`--brand-200` ink on a 22% fill) so the three royal chips stay tellable apart on one
   * board: `new` quietest (16%), `pending`/SOON in the middle (26% on `--brand-300`), TIPPING
   * the brightest. Measured: `--brand-200` on the fill = 8.88:1 over `--wash-raised`, 9.39
   * over `--bg-elevated`, 10.71 over `--bg`. ⛔ It reads through `color-mix()` on the brand
   * ramp rather than re-typing an oklch, so a brand retune carries it along. */
  signal:    { background: "color-mix(in oklab, var(--brand-500) 22%, transparent)", color: "var(--brand-200)", borderColor: "color-mix(in oklab, var(--brand-400) 50%, transparent)" },
  /* Ported from `.chip-new`. Brand blue because "this just opened" is CHROME,
   * never money earned — a gold NEW chip is named as a law break in
   * 01-foundations/colour.md. Sits a stop lighter than `pending` so NEW and SOON
   * stay distinguishable on one board. */
  new:       { background: "oklch(63% 0.18 262 / 0.16)",                   color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.40)" },
};

/* Status chips are slightly taller per kit. `new` and `hot` join the set because
 * their CSS originals (`.chip-new`, `.chip-hot-rose`) both carried the status
 * metrics (23px / 0 9px / 11px) inline in the rule. */
const isStatus = (v: Variant) =>
  v === "live" || v === "resolved" || v === "pending" || v === "objection" || v === "new" || v === "hot";

/* `gap` / `dot` / `tracking` are per-SIZE, not per-variant. They used to be one
 * hard-coded value each (gap-1 · 6px dot · 0.06em) which is why the market card
 * had to reach around the component with a descendant selector to get its own. */
const sizeStyles: Record<Size, {
  base: React.CSSProperties;
  status: React.CSSProperties;
  gap: number;
  dot: number;
  tracking: string;
}> = {
  /* ⭐ `xs` IS the market card's treatment, promoted from `.mcardp .chip` — the
   * per-surface override the consolidation exists to delete. Ported exactly:
   * 9px type, 0 6px inline padding, 3px gap, 0.02em tracking, 5px live-dot.
   *
   * ⚠️ Its HEIGHTS are md's on purpose and that is not an oversight. The CSS
   * override set font-size/padding/gap/tracking and NOT height, so a card chip
   * has always drawn in a 21px (23px status) box with 9px type inside it. `xs`
   * therefore shrinks the TYPE, not the pill. Changing that here would repaint
   * every board, which is a redesign, not a consolidation.
   *
   * ⛔ What `xs` deliberately does NOT port is `white-space: nowrap`. That one
   * property is the live G-7 defect: it is what makes a Swahili card label draw
   * outside its column instead of wrapping. `flexShrink: 0` IS ported (below) so
   * the card's `.mcardp-top` row keeps its geometry. */
  xs: {
    base:   { height: 21, padding: "0 6px", fontSize: 9 },
    status: { height: 23, padding: "0 6px", fontSize: 9 },
    gap: 3, dot: 5, tracking: "0.02em",
  },
  sm: {
    base:   { height: 18, padding: "0 6px", fontSize: 9.5 },
    status: { height: 20, padding: "0 7px", fontSize: 10 },
    gap: 4, dot: 6, tracking: "0.06em",
  },
  md: {
    base:   { height: 21, padding: "0 8px", fontSize: 10.5 },
    status: { height: 23, padding: "0 9px", fontSize: 11 },
    gap: 4, dot: 6, tracking: "0.06em",
  },
  lg: {
    base:   { height: 25, padding: "0 10px", fontSize: 12 },
    status: { height: 27, padding: "0 11px", fontSize: 12.5 },
    gap: 4, dot: 6, tracking: "0.06em",
  },
};

export function Chip({
  variant = "neutral",
  size = "md",
  selected,
  dot,
  className,
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  size?: Size;
  selected?: boolean;
  dot?: boolean;
}) {
  const sz = sizeStyles[size];
  const { height, ...szRest } = isStatus(variant) ? sz.status : sz.base;
  return (
    <span
      /**
       * ⭐ INSTRUMENT HOOKS, ADDED PV-13c (2026-09-03) — and they are DATA ATTRIBUTES, not
       * classes, deliberately.
       *
       * 🔴 WHY THEY EXIST. Two live instruments found chips by CSS class: `design-gate/
       * measure.mjs`'s control census (`.chip` in `CONTROL_SEL`) and `glitch-hunter.mjs`'s
       * exemption for the kit-intentional live pulse (`classList.contains("chip-live")`).
       * Neither ever matched a `<Chip>` — this component emits no `chip` class, as its own
       * header notes — so both were silently measuring ONLY the raw `.chip` call sites. PV-13c
       * migrated the last twelve of those and deleted the CSS family, which would have taken
       * both instruments to zero reach while they kept printing a clean result. ⛔ An
       * instrument that stops finding its subject and says nothing is worse than one that
       * fails.
       * ⛔ NOT CLASSES: `test:bridge`'s rule is that a class must RESOLVE to something. A
       * `chip-live` class with no CSS rule behind it (the styles are inline, per stage 9's
       * ruling that the component wins) is exactly the "class that resolves to nothing" that
       * guard exists to catch. A `data-` hook carries the same information and is honest about
       * being a hook rather than a style — the same shape as `data-on`, `data-open` and
       * `data-motion` already used across this kit.
       */
      /* ⛔ `data-kit-chip`, NOT `data-chip` — NAMESPACED BECAUSE THE SHORT NAME IS TAKEN, and
         it was measured, not guessed. `filter-pill.tsx:188` already emits `data-chip={testId}`,
         and `filter-language-scan.mjs` parses that attribute with a REGEX that expects it to
         carry a value and be immediately followed by `data-count`. A bare `data-chip=""` here
         made `[data-chip]` match all 39 filter pills on `/markets` as if they were chips —
         caught by rendering it and counting, before either instrument was believed. */
      data-kit-chip=""
      data-kit-chip-variant={variant}
      data-kit-chip-size={size}
      className={cn(
        // ⛔ G-7 — `max-w-full` is load-bearing, not decoration. Without it the chip lays
        //    out at max-content and is simply drawn OUTSIDE its column.
        "inline-flex items-center rounded-pill font-bold border uppercase max-w-full",
        selected && "ring-1 ring-[var(--brand-400)] ring-offset-1 ring-offset-bg-elevated",
        className,
      )}
      style={{
        ...szRest,
        // ⭐ G-7 (live QA campaign, measured on production 2026-08-02).
        //
        // This used to be a fixed `height` plus `whitespace-nowrap`. Both are right for a
        // short status pill and both are wrong for a phrase: the chip could neither wrap
        // nor grow, so a long label was drawn outside its container with NO ellipsis and
        // no overflow anywhere for a document-level check to notice.
        //
        // Reproduced on live production by giving a REAL chip a real call site's label:
        // "Sportradar + GBT integrity unit" rendered **206x18 inside a 198px column — 8px
        // outside it**. A survey could not have found it: session 9 had already patched
        // the one known offender AT ITS CALL SITE, so all 84 live chips measured clean
        // while the shared component stayed broken for the next long label.
        //
        // `minHeight` + `height: auto` is a NO-OP for every one-line chip — a one-line
        // chip's content box is shorter than the min, so it renders at exactly the same
        // height it always did (verified: all 84 measured chips unchanged at 18px). What
        // changes is only the case that was previously broken: the label now wraps and
        // the pill grows to fit it.
        //
        // ⚠️ `lineHeight` must leave 1 for the one-line case or every existing chip
        // shifts; the padding below only applies once the text actually wraps, which is
        // why it is expressed as `paddingBlock` rather than a taller box.
        minHeight: height,
        height: "auto",
        paddingBlock: 2,
        whiteSpace: "normal",
        gap: sz.gap,
        // `xs` is the market board's dense row: the card lays its chips out in a
        // `flex-wrap: nowrap` strip, so a shrinkable chip would be squeezed to
        // nothing rather than wrapping. `max-w-full` above still caps it.
        ...(size === "xs" ? { flexShrink: 0 } : null),
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        letterSpacing: sz.tracking,
        lineHeight: 1.15,
        ...variantStyle[variant],
        ...style,
      }}
      {...rest}
    >
      {dot && <span className="live-dot shrink-0" style={{ width: sz.dot, height: sz.dot }} />}
      {children}
    </span>
  );
}
