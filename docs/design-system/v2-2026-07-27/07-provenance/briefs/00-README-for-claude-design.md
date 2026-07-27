# Kipindi / 50pick — Design handoff to Claude Design

This bundle gives you everything needed to design a new component that drops into
our live app **perfectly on-theme**. Please read this file first.

## The one golden rule
**Consume our existing tokens and class conventions. Introduce ZERO new colors,
fonts, radii, or shadows.** Every value you need already exists in `theme/globals.css`.
If you reach for a hex code or a new color, something is wrong — use a token instead.

## What's in here
- `theme/globals.css` — **THE source of truth.** The `:root` block at the top defines
  every design token (OKLCH color ramps, type scale, spacing, radius, motion easings,
  surfaces, shadows). Below it are the real component classes already shipped
  (`.btn`, `.chip`, `.input`, `.mcardp`, `.tpanel`, etc.). Match these.
- `theme/tailwind.config.ts` — how tokens map to Tailwind utilities.
- `kit-specimens/` — the original design-kit React specimens (`atoms.jsx`, `markets.jsx`,
  `microstructure.jsx`, `brand.jsx`, `specimens.jsx`, `palette.jsx`, `tokens.css`).
  These show the *pattern language* — proportions, composition, idioms — to match.
- `current-state/` — the ACTUAL live code you're designing next to / replacing.
  `EXAMPLE-resolution-panel.tsx` is a recent component built to these rules — use it as
  a reference for the house style and honesty conventions.
- `01-RULES-and-invariants.md` — the brand/UX invariants that are NOT in the code.
- `02-BRIEF-*.md` — the specific component to design this round.

## Output we need back
On-theme JSX (React) + any CSS, written against these tokens/classes, with all
states/variants, mobile-first (390px) and desktop (1440px). No external assets or
webfonts (mobile-data-sensitive market). Respect `prefers-reduced-motion`.

## Non-negotiables
Read `01-RULES-and-invariants.md` — gold is reserved for earned-money moments,
YES=green/NO=red only inside betting actions, no emojis, the gilt "Needle" is the
brand signature, and any motion must be genuinely polished (real easing/physics).
