> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# TippingBar & dials — spec

GIVEN — TippingBar { yesPct, height=28, animate=true, showLabels=true, resolved?, recastOnHover?, empty?, emptyLabel? }:
- `.tipbar-rail` — track --bar-track + inset ring 1px --bar-track-border, radius = height/2
- `.tipbar-yes` fill --bar-fill-yes + --bar-glow-yes; `.tipbar-no` mirrored on hue 22 (--bar-fill-no / --bar-glow-no)
- `.tipbar-needle` 3px wide, --bar-needle, radius 2, extends 6px past the track, transform-origin 50% 100%, glow 0 0 12px --bar-needle-glow
- **tilt = ((clamp(yes,6,94) − 50) / 44) × 14°.** The clamp to the inner 6..94 band is deliberate: at the extremes there is no "tipping" any more, so the needle stands upright instead of pivoting into the rounded corner. 14° is `--m-tilt` — the same angle as the divider in the brand mark.
- **full-pill radius** (`.tipbar-fill[data-full]`) when one side owns the whole rail, keyed off the TARGET, never the animated value. Border-radius is not transitionable, so deriving it from the animated value made the corners snap in and out mid-recast — the "edges appear and fade incorrectly" glitch.
- `resolved` adds a one-shot gold shimmer (`.tipbar-shimmer`, tb-shimmer at --t-max)
- `recastOnHover` — the kit recast gesture: collapse to 50/50, re-expand to the true split, gilt hairline sweep (`.tipbar-sweep`). Motion is --m-pivot at --t-stage (`--m-pivot` is reserved for needle & dials ONLY). Disable on order books, depth charts, and any list of >10 bars in view.
- `animate` gates the transitions via `.tipbar-anim`, so a static bar in a card grid does no compositing work.
- labels (`.tipbar-labels`) mono 11px ls 0.05em: YES in --bar-label-yes (+strong at 700 when leading), lean word `.tipbar-lean` italic **10.5px** uppercase ls 0.10em --bar-label-tipping, NO mirrored.

**`empty` — the cold-start state (2026-07-29).** A LIVE market with no activity has
no crowd price, so the bar must NOT render a centred 50/50: that would be a
fabricated number on a money surface (RULES law 5). `empty` renders
`.tipbar-empty` — a neutral dashed rail (--bar-empty-track) at 0.55 opacity, no
split, no needle, no labels. `emptyLabel` supplies the accessible name so the
component stays locale-agnostic.
It is a **prop on this bar, not a second component** (B9): an `EmptyTippingBar`
would be two bars to keep in sync forever.

GIVEN — ConfidenceDial { yesPct, size=92, label? }: r 44, tilt ±22°, wedges oklch(50% 0.14 152) / oklch(52% 0.16 22) at 0.92 opacity, divider 2.2px oklch(96% 0.005 240), value mono 22px/700 centred.

INVENTED (2026-06) — NeedleDial (win rate): 36-44px; ring 1.5px --border-strong on --bg-overlay; gilt needle 2.4px from (22,34) to (22,7), tilt = ((rate-50)/50) x 26deg about (22,34); pivot dot r 2.4 --gilt; drop-shadow 0 0 4px --bar-needle-glow. Static — no motion to gate.

## Tipping-bar tokens (verbatim)

Until 2026-07-29 this section read *"no dedicated CSS block — inline recipe, see
preview source"* — the kit honestly recording that the bar's design lived inside
the component. Worse, the `--bar-*` tokens below **already existed** and
`brand.tsx` used none of them; it re-typed their values by hand, byte for byte.
Editing a token changed nothing on screen. That is now closed: the bar is a
`.tipbar-*` family in `globals.css` reading these tokens.

```css
--bar-track:        oklch(50% 0.20 268);
--bar-track-border: oklch(58% 0.17 268);
--bar-needle:       var(--gilt);
--bar-needle-glow:  color-mix(in oklab, var(--gilt) 55%, transparent);
--bar-fill-yes:     linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%);
--bar-fill-no:      linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%);
--bar-glow-yes:     0 0 18px oklch(58% 0.16 152 / 0.35);
--bar-glow-no:      0 0 18px oklch(60% 0.18 22 / 0.35);
--bar-shimmer:      /* resolved gold sweep */
--bar-sweep:        /* hover-recast gilt hairline */
--bar-empty-track:  repeating-linear-gradient(90deg, var(--border-strong) 0 8px, transparent 8px 15px);
--bar-label-yes / -yes-strong / -no / -no-strong / -tipping
```

**The one inline value, and the rule behind it.** `height` is a caller prop, so it
arrives as a single custom property `--tb-h`, and every derived measurement (pill
radius, needle overhang) is computed from it in CSS. `width` / `left` / `rotate`
also stay inline — those are the live crowd split, i.e. **data**. The line: a
value the CALLER or the DATA chooses comes in as a variable; a value the DESIGN
chooses lives in globals.css.
