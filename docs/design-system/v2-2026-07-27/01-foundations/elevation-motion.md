> 📑 **RECORD, NOT RULE.** The design rulebook is **`docs/DESIGN_AUTHORITY.md`** — every
> law, floor and threshold is there, and nothing else is required to build correctly.
> This file is kept as the delivered elevation/motion reasoning.
> ⚠️ **Values written here are a snapshot and some have drifted.** The live values are in
> `src/app/globals.css` / `src/app/motion.css`, which outrank every document.
> (Consolidated 2026-08-08 — nine files used to claim to be the place to start.)

# Elevation, glass & motion

## Shadows (tokens, verbatim)

**The ladder is FROZEN (DESIGN_AUTHORITY B10, 2026-07-29).** Every shadow in the
product comes from a rung below. No component types its own `box-shadow`; guarded
by `npm run test:design-frozen`.

### Surfaces that sit ON the page
- --shadow-card: 0 1px 2px oklch(6% 0.06 268 / 0.55), 0 10px 28px -10px oklch(4% 0.04 268 / 0.70) — default card
- --shadow-royal: 0 14px 44px -14px oklch(4% 0.04 268 / 0.78) — framed page mocks, heavy panels
- --shadow-card-top: inset 0 1px 0 oklch(98% 0.01 268 / 0.08) — the 1px lit top edge that makes an elevated surface read as lit from above. **Compose it, never retype it:** `box-shadow: var(--shadow-card-top), var(--shadow-4)`
- Numbered scale --shadow-1…5 (see tokens.json) for legacy components

### Surfaces that FLOAT above the page (added 2026-07-29)
Before this, seven surfaces each typed their own drop-shadow — the Modal, the
avatar menu, the notifications panel, the needle drawer, the date picker, the
nav-more menu and the market-card popover. Same visual job, seven answers, none
of them a token, several of them neutral `rgba(0,0,0,…)` — which on an indigo
canvas reads grey and dead, and is why they never quite matched.

- --shadow-modal: 0 30px 80px oklch(5% 0.05 268 / 0.65), inset 0 1px 0 oklch(100% 0 0 / 0.06) — the centred dialog. Deepest cast; it owns the screen behind a scrim.
- --shadow-overlay: 0 24px 56px -16px oklch(5% 0.05 268 / 0.62), + the same lit edge — menus, popovers, dropdowns, calendars. **Shallower than a modal on purpose:** it is attached to a trigger, not a scrim, so it must not claim a dialog's depth.
- --shadow-overlay-up: the same rung cast UPWARD — for a surface docked to the bottom edge (the needle drawer). A downward cast there throws the shadow off-screen and the panel reads as pasted onto the viewport.

Tailwind: `shadow-card` · `shadow-royal` · `shadow-modal` · `shadow-overlay` ·
`shadow-overlay-up` · `shadow-card-top` · `shadow-e1…e5`.
(`shadow-card`/`shadow-royal` had existed as CSS vars since the beginning but were
never bridged, so the utilities were dead — a B8 trap; bridged 2026-07-29.)

### Glows
- --glow-gold / --glow-blue / --glow-win / --glow-jackpot (color-mix recipes)
- --glow-selected: 0 0 12px -1px color-mix(in oklab, var(--brand-500) 45%, transparent) — "this one is selected" (calendar's chosen day, active pager button). Was typed two ways in two hues before 2026-07-29. Mixed off `--brand-500`, so it tracks the brand instead of pinning a raw hue.
- Button hover glows are per-variant box-shadows (see buttons spec)

## Radii — the semantic scale (added 2026-07-29)
`rounded-card` (--r-lg) · `rounded-control` (--r-md) · `rounded-chip` (--r-pill) ·
`rounded-modal` (--r-lg). These are the canonical radii for new design: they read
at the call site and each resolves through the one definition site in globals.css.

⚠️ **Known open gap, deliberately left open.** The numeric Tailwind scale
(`rounded-xs…2xl` = 2/4/8/12/16/24px) does **not** match `--r-xs…--r-xl`
(4/8/12/16/24px), so `rounded-md` renders 8px while `--r-md` is 12px. Bridging
them would shift every corner in the product; Ali deferred it on 2026-07-29. The
numeric scale is frozen as legacy — do not renumber it. See
`docs/DESIGN_AUTHORITY.md` (B9/B10).

## Glass
.glass-panel (tokens.css) — the ledger/hero surface: translucent royal fill + blur + 1px border (exact recipe extracted verbatim in 02-components/stat-tiles/spec.md). Dialog scrims animate backdrop-filter blur(0→8px) via scrim-fade.

## Easing & duration tokens

> 🔴 **DELETED 2026-08-08 — THIS BLOCK WAS DANGEROUS, NOT MERELY STALE.**
>
> It published three easing tokens with **durations baked into them**
> (`--ease-micro: 100ms cubic-bezier(…)`). That exact form once **zeroed transitions
> platform-wide**, because every `transition: … var(--ease-micro)` then carried two
> durations and the browser discarded the declaration. It is the defect
> `DESIGN_AUTHORITY.md` §B5 exists to prevent, and `npm run test:tokens` now FAILS on a
> duration-bearing easing token — so a session that pasted this block back in would
> break the build, and a session that only *read* it would reintroduce the outage by hand.
>
> The live easings are bare curves aliased onto the `--m-*` materials, and the live
> ladder is `--t-flick / --t-quick / --t-base / --t-move / --t-stage / --t-max`.
> **Both live in `src/app/motion.css`, which is the only definition site.**
> The law is `DESIGN_AUTHORITY.md` §B5 and §E.

## Animation inventory (every @keyframes in tokens.css)
| Keyframe | What / where | Reduced-motion behaviour |
|---|---|---|
| live-pulse | LIVE dot opacity breathe 0.3↔1 | clamped by global rule; dot stays visible |
| gold-pulse | gold attention breathe | clamped |
| aqua-pulse | aqua pip halo | clamped |
| ticker-scroll | price-tape marquee track | animation-play-state: paused |
| gold-shimmer / shimmer-gilt | gilt sweep highlights | clamped |
| skel / kp-shimmer | skeleton sweeps | clamped (kp-shimmer: explicit animation:none) |
| pulse-urgent / pulse-critical | countdown urgency (opacity / +scale) | clamped |
| toast-slide / toast-bar | toast entrance + 5s dismiss hairline | clamped |
| spin | Spinner atom 0.7s linear | clamped |
| ray-spin / celebrate-pop / count-up-flash | win celebration | explicit calm branches: celebrate-pop→fade only; count-up-flash→colour only |
| gavel-strike / seal-impress | resolution seal | seal-impress→fade only |
| settling-sweep | settling bar sweep | .settling-bar::before animation:none |
| odds-flash-up/-down | odds change flash (600ms --ease-sink) | clamped |
| mark-breathe | idle brand mark, 6s ±0.6°/1.015 | clamped |
| seal-place / press-pop / vote-pop | bet placement + presses (transform-only) | explicit from,to transform:none |
| toggle-glow | toggle ON gold ring | box-shadow:none |
| dialog-rise / scrim-fade / sheet-rise / np-rise / kp-slide-up / reveal-up(-d1..d4) | entrances | stagger collapsed, clamped |
| value-delta-fade / check-draw / check-pop / content-fade-in | value ticks, checkmarks, skeleton cross-fade | clamped |
| badge-seal-rays / streak-tick / win-aura-breathe | badges & wins (breathe, never spin) | rays/halo animation:none at 0.4 opacity |
| poll-flash | admin row ring after regen | clamped |
| tb-shimmer | TippingBar resolved gold sweep, one-shot --t-max. Moved out of a `<style>` tag inside brand.tsx into globals.css, 2026-07-29 | clamped |
| tb-sweep | TippingBar hover-recast gilt sweep (was `tb-pbar-sweep`, also inline) | clamped |
| ud-count-pulse (INVENTED 2026-07) | D1 final-30s digits opacity 1→0.55, 1s --ease-conduct | explicit animation:none |

## The two motion laws
1. Global clamp: `@media (prefers-reduced-motion: reduce)` forces all animation/transition durations to 0.01ms, plus the explicit calm branches above; mirrored by the in-app `html.kp-reduce-motion` switch and `[data-motion]` attributes.
2. Celebration ≠ casino: wins breathe or fade (win-aura-breathe), never rotate infinitely, never confetti. The old spinning sunburst was replaced for exactly this reason (SUPERSEDED.md).
