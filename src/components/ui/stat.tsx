/**
 * Stat — the kit's label/value pair. THE one label-over-value definition.
 *
 * ⚠️ THIS HEADER USED TO OVERSTATE ITS OWN SUCCESS, and that is worth keeping on
 * the record. It said the component had been "re-implemented three separate
 * times" and was "promoted here so the fee/payout figures this change adds are a
 * fourth USE rather than a fourth COPY" — written in the past tense, as though
 * the problem were closed. It was not. SIX more re-implementations appeared
 * afterwards, one of them a local `Stat` that SHADOWS this file's own export:
 *
 *   src/components/ui/stat.tsx        label 9    / value 13.5 mono
 *   wallet-client.tsx      SubStat    label 9.5  / value 14   mono   · boxed
 *   admin/payments         Stat       label 9.5  / value 15   mono
 *   admin/payments         Metric     label 9    / value inherits mono
 *   profile/activity       MoneyTile  label 10   / value 17   SORA   · boxed · <Cash>
 *   profile/page           Stat       label 10   / value 18   SORA
 *   positions/performance  Stat       label 9.5  / value 18   mono   · boxed  ← shadows the kit name
 *   positions/performance  Kpi        label 9.5  / value 21   mono
 *   profile/invite         Cap + Kpi  label 9.5  / value 24   mono   · boxed
 *   markets/[id]           KPI        label 10   / value 18 SORA or 13 mono · boxed
 *
 * Seven value sizes, eight label styles, two faces. A promotion is not finished
 * when the component exists — it is finished when the copies are gone, and this
 * file's own header is why nobody noticed the difference.
 *
 * ⭐ SO THE VARIANTS ARE PROPS, NOT PROSE. `size` and `label` are two independent
 * dictionaries below; every one of the ten dialects above is a (size, label,
 * boxed) triple, so the migration is a mapping and repaints nothing.
 *
 * ⛔ TWO RULES THE COPIES DROPPED. Both are enforced here and neither is optional:
 *
 *   1. MONEY GOES THROUGH `money` → <Cash>, which honours the balance-privacy
 *      blur. A bare money numeral bypasses it and leaks the player's figures on a
 *      shoulder-surfed screen. `MoneyTile` was the only copy that kept it.
 *   2. §M4 — money is MONO and NEVER letter-spaced. `money` therefore forces the
 *      mono face and clears tracking whatever the rung says, so a caller cannot
 *      reach a display-face or tracked money figure by picking a size. Two copies
 *      would have failed this: `MoneyTile` paints money in Sora, and invite's
 *      `Kpi` tracks its value at -0.02em.
 *
 * ⚠️ §S2 / B10.2 note for whoever collapses `boxed`: the six boxes below carry
 * FOUR radii (8 / 12 / 16px and one unbordered). B10.2 says a stat tile takes
 * `--r-md`. Collapsing them to one radius is right and is a VISIBLE change on
 * five surfaces, so it is Ali's call, not a refactor's. They are catalogued
 * faithfully here first; the collapse is a separate, reviewable diff.
 */

import { Cash } from "@/components/ui/cash";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "gold" | "yes" | "no" | "muted";

const TONE: Record<StatTone, string> = {
  default: "text-text",
  gold: "text-gold-300",
  yes: "text-yes-300",
  no: "text-no-300",
  muted: "text-text-muted",
};

/* ── The VALUE dictionary ──────────────────────────────────────────────────
 * `face` is the DEFAULT face for the rung; `money` overrides it to mono (M4).
 * `gap` is the space between label and value — part of the rung because the
 * dialects that grew a bigger value also grew the gap under the label. */
export type StatSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

/**
 * ⭐ DG-A-12/DG-P-05, RULED 2026-08-31 (Ali's call). Two of these seven rungs are now NAMED and
 * five are hand-typed ON PURPOSE. The reasoning, so nobody sweeps them later:
 *   · `sm` 14 → `text-body` and `xl` 18 → `text-title-sm` are the SAME px, so no figure moved.
 *   · `md` 15, `lg` 17 and `3xl` 24 are `--type-body`, `--type-h4` and `--type-h2` — rungs of
 *     the OTHER ladder (§T7), reached from a `.tsx` file that cannot reach it. Moving them to
 *     the nearest Tailwind rung would break alignment with everything `globals.css` sizes from
 *     those tokens, and 15 and 17 are each EQUIDISTANT from two rungs — a tie is not a design
 *     call. They stay.
 *   · `xs` 13.5 and `2xl` 21 are off BOTH ladders and are the only real open sizes. `xs` is the
 *     DEFAULT rung and 35 of this component's 65 call sites pass money, so moving it repaints
 *     money across wallet, admin/finance and positions/performance at once. Left, deliberately,
 *     as a named exception rather than swept.
 * ⚠️ A rung is a TUPLE — it also sets letter-spacing and line-height. `lead` overrides the
 * line-height below, and `money` forces `letterSpacing: normal` (§M4), so the two renames above
 * are inert on money figures and cost -0.05px/-0.36px of tracking on non-money ones.
 */
const SIZE: Record<StatSize, { text: string; face: "mono" | "display"; lead: string; gap: string; hint: string }> = {
  /* the kit's own rung */                    xs:    { text: "text-[13.5px]", face: "mono",    lead: "leading-tight",   gap: "",        hint: "text-body-sm" },
  /* wallet SubStat */                        sm:    { text: "text-body",     face: "mono",    lead: "leading-tight",   gap: "",        hint: "text-body-sm" },
  /* admin/payments Stat */                   md:    { text: "text-[15px]",   face: "mono",    lead: "leading-tight",   gap: "",        hint: "text-body-sm" },
  /* activity MoneyTile */                    lg:    { text: "text-[17px]",   face: "display", lead: "leading-tight",   gap: "mt-1",    hint: "text-[10px]" },
  /* profile Stat · markets KPI · perf Stat */xl:    { text: "text-title-sm", face: "display", lead: "leading-tight",   gap: "mt-1",    hint: "text-[10px]" },
  /* performance Kpi */                       "2xl": { text: "text-[21px]",   face: "mono",    lead: "leading-none",    gap: "mt-1.5",  hint: "text-[10px]" },
  /* invite Kpi */                            "3xl": { text: "text-[24px]",   face: "mono",    lead: "leading-none",    gap: "mt-1.5",  hint: "text-body-sm" },
};

/* ── The LABEL dictionary ──────────────────────────────────────────────────
 * Independent of `size` on purpose: the dialects mixed and matched (a 9.5px
 * label sat over values of 14, 18, 21 and 24 in four different weights). Named
 * for the metrics, not for the page, so a new caller picks by look. */
export type StatLabel = "micro" | "tiny" | "faint" | "quiet" | "caps" | "strong" | "wide" | "widest";

const LABEL: Record<StatLabel, string> = {
  micro:  "text-[9px] tracking-[0.10em] text-text-faint",                   // the kit's own
  tiny:   "text-[9px] tracking-[0.12em] text-text-subtle",                  // admin/payments Metric
  faint:  "text-[9.5px] tracking-[0.10em] text-text-faint",                 // wallet SubStat
  quiet:  "text-[9.5px] tracking-[0.12em] text-text-subtle",                // admin/payments Stat
  caps:   "text-[9.5px] font-semibold tracking-[0.10em] text-text-subtle",  // performance Kpi + Stat
  strong: "text-[9.5px] font-bold tracking-[0.1em] text-text-subtle",       // invite Cap
  wide:   "text-[10px] font-semibold tracking-[0.12em] text-text-subtle",   // activity MoneyTile
  widest: "text-[10px] font-semibold tracking-[0.14em] text-text-subtle",   // profile Stat · markets KPI
};

/* ── The BOX dictionary ────────────────────────────────────────────────────
 * `false` (default) is no container at all — the kit's original shape. */
export type StatBox = "inset" | "tile" | "panel" | "card" | "glass" | "pad";

const BOX: Record<StatBox, string> = {
  inset: "rounded-md border border-border/60 bg-bg-overlay/40 px-3 py-2.5 backdrop-blur-md", // wallet SubStat
  tile:  "rounded-lg border border-border/60 bg-bg-overlay/40 px-3.5 py-3",                  // activity MoneyTile
  panel: "rounded-xl border border-border bg-bg-elevated px-4 py-3.5",                       // performance Stat
  card:  "rounded-md border border-border bg-bg-elevated p-3",                               // markets KPI
  glass: "rounded-xl glass-panel p-3.5",                                                     // invite Kpi
  pad:   "px-4 py-3.5",                                                                      // profile Stat — pad only, no edge
};

export function Stat({
  label,
  value,
  tone = "default",
  money,
  struck,
  hint,
  size = "xs",
  labelStyle = "micro",
  labelTone,
  boxed,
  font,
  icon,
  iconAlign = "label",
  className,
  labelClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: StatTone;
  /**
   * Wrap the value in <Cash> (balance-privacy blur). Use for every TZS figure.
   * ⛔ Also FORCES mono + tabular + no tracking, per §M4. That is not a style
   * default you can talk the component out of — see rule 2 in the header.
   */
  money?: boolean;
  /**
   * DA-7 · strike this figure as gold TYPE (`.gilt-ink`) rather than colour it gold.
   *
   * ⛔ OPT-IN, AND DELIBERATELY NOT A CHANGE TO `tone="gold"`. M3 reserves struck gold for
   * money that was EARNED — a payout, a celebration, a resolved seal. Three of `gold`'s
   * call sites are not that: `position-card.tsx:111` paints `payoutIfWin` at betting-close
   * (frozen arithmetic, not yet earned) and the admin fee simulator paints a simulation.
   * Blanket-striking the tone would put earned-money ink on figures nobody has won, which
   * is precisely the violation M3 exists to prevent. So the caller opts in per figure.
   *
   * ⚠️ It also has a measurement cost worth knowing: `.gilt-ink` paints via
   * `background-clip: text` with a transparent fill, and `contrast-rendered.mjs:200-205`
   * SKIPS such nodes (their `color` reads as the canvas, which would measure 1:1 against
   * itself). So every figure struck here leaves that probe's corpus. The modelled pairs in
   * `contrast-audit.mts` are what keeps it measured — they are not optional garnish.
   */
  struck?: boolean;
  /** Optional sub-line under the value — e.g. "33% of the losing side". */
  hint?: React.ReactNode;
  /** Value metrics. See the SIZE dictionary. Default `xs` = the kit's original. */
  size?: StatSize;
  /** Label metrics. See the LABEL dictionary. Default `micro` = the kit's original. */
  labelStyle?: StatLabel;
  /**
   * Recolour the whole label ROW (label + icon) — the treatment `MoneyTile` used
   * to flag an inflow green and an outflow rose. Overrides the label style's own
   * colour; leave unset for the dictionary's.
   */
  labelTone?: "yes" | "no";
  /** Container. Omit for the kit's bare pair. See the BOX dictionary. */
  boxed?: StatBox;
  /** Override the rung's default face. ⛔ Ignored when `money` — M4 outranks it. */
  font?: "mono" | "display";
  /** Small glyph beside the label (or opposite it — see `iconAlign`). */
  icon?: React.ReactNode;
  /** `label` (default) puts the icon before the label; `end` pushes it to the far edge. */
  iconAlign?: "label" | "end";
  className?: string;
  /**
   * ⛔ ESCAPE HATCH for a migrating call site whose label matches none of the
   * eight styles. Prefer adding a style to the dictionary over using this — a
   * per-call-site label is how the eight became eight.
   */
  labelClassName?: string;
}) {
  const sz = SIZE[size];
  // §M4 — money is mono and never letter-spaced. Enforced here, not asked for.
  const face = money ? "mono" : (font ?? sz.face);
  const labelRow = (
    <p
      className={cn(
        "font-mono uppercase",
        LABEL[labelStyle],
        labelTone === "yes" ? "text-yes-300" : labelTone === "no" ? "text-no-300" : null,
        labelClassName,
      )}
    >
      {label}
    </p>
  );

  return (
    <div className={cn(boxed ? BOX[boxed] : null, className)}>
      {icon ? (
        <div
          className={cn(
            "flex items-center gap-1.5",
            iconAlign === "end" && "justify-between",
            labelTone === "yes" ? "text-yes-300" : labelTone === "no" ? "text-no-300" : "text-text-subtle",
          )}
        >
          {iconAlign === "end" ? <>{labelRow}<span className="shrink-0">{icon}</span></> : <>{icon}{labelRow}</>}
        </div>
      ) : labelRow}

      {/* `.gilt-ink` carries its own font-family, tabular-nums and letter-spacing (M4), and
          supplies the colour as a gradient — so the tone class must NOT also be applied, or
          a flat `color` sits under a transparent fill and the two disagree. */}
      <p
        className={cn(
          face === "mono" ? "font-mono" : "font-display",
          "font-bold tabular-nums",
          sz.text,
          sz.lead,
          sz.gap,
          struck ? "gilt-ink" : TONE[tone],
        )}
        // ⛔ M4 again, belt-and-braces: a `className` from the call site cannot
        // sneak tracking back onto a money figure.
        style={money ? { letterSpacing: "normal" } : undefined}
      >
        {money ? <Cash>{value}</Cash> : value}
      </p>

      {hint ? (
        <p className={cn("mt-0.5 font-mono leading-tight text-text-subtle", sz.hint)}>{hint}</p>
      ) : null}
    </div>
  );
}
