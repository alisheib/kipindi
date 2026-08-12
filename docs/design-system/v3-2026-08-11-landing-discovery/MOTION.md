# MOTION.md

Motion inside frozen components is frozen. Nothing below respecs the needle sweep, the card hover,
the live-dot pulse or the YES/NO press-pop. This covers **entry, layout transitions, filter changes
and state changes** only.

Curves, written once:

| Name | Value | Job |
|---|---|---|
| glide | `cubic-bezier(.22, 1, .36, 1)` | anything arriving |
| ease-out | `cubic-bezier(0, 0, .2, 1)` | hover and press |
| settle | `cubic-bezier(.34, 1.56, .64, 1)` | a token appearing |
| linear | — | opacity-only, and the ticker |

`tokens-LOCKED.css` aliases `--ease-*` / `--dur-*` to `--m-*` / `--t-*`, which live in
`motion.css` and are **not** in the token file these layouts link. So the layouts carry literal ms
and literal curves. In the codebase, use the tokens: glide = `--m-glide`, 140ms = `--t-quick`,
220ms = `--t-base`, 340ms = `--t-move`.

---

## 1. The table

| Element | Trigger | Property | From → To | Duration | Curve | Delay |
|---|---|---|---|---|---|---|
| Header | page load | `opacity` | 0 → 1 | 220ms | linear | 0 |
| Live ticker strip | page load | `opacity` | 0 → 1 | 220ms | linear | 0 |
| Hero eyebrow + headline | page load | `opacity`, `translateY` | 0, 16px → 1, 0 | 340ms | glide | 0 |
| Hero lede + CTA row | page load | `opacity`, `translateY` | 0, 16px → 1, 0 | 340ms | glide | 60ms |
| Hero proof rail | page load | `opacity`, `translateY` | 0, 16px → 1, 0 | 340ms | glide | 120ms |
| Hero market card | page load | `opacity`, `translateY` | 0, 16px → 1, 0 | 340ms | glide | 180ms |
| Section below the fold | first intersection (once) | `opacity`, `translateY` | 0, 12px → 1, 0 | 340ms | glide | 0 |
| Nav item | hover | `background`, `color` | transparent → `--bg-overlay` | 140ms | ease-out | 0 |
| Primary button | hover | `translateY`, `box-shadow` | 0 → −1px; `--edge-lit` → `--edge-lit-strong`,`--glow-selected` | 140ms | ease-out | 0 |
| Filter chip | hover | `background`, `border-color`, `color` | → `--bg-overlay`, `--border-royal`, `--text` | 140ms | ease-out | 0 |
| Filter chip | press | `background`, `translateY` | → `--bg-inset`, 1px | 140ms | ease-out | 0 |
| Filter chip | select | `background`, `border-color`, `box-shadow` | → `--pill-active`, `--brand-400`, `--glow-selected` | 140ms | ease-out | 0 |
| Segmented thumb | select | `background`, `box-shadow` | → `--pill-active`, `--edge-lit` | 140ms | ease-out | 0 |
| Topic tile | hover | `translateY`, `border-color`, `background` | 0 → −1px; → `--border-royal`, `--bg-elevated` | 140ms | ease-out | 0 |
| Sort / topic / language menu | open | `opacity`, `translateY` | 0, −6px → 1, 0 | 160ms | glide | 0 |
| Sort / topic / language menu | close | `opacity` | 1 → 0 | 120ms | ease-out | 0 |
| Result grid | any filter or sort change | `opacity` (whole grid, one fade — **no per-card stagger**) | 1 → .45 → 1 | 180ms | ease-out | 0 |
| Result count | filter change | none — the number swaps on the same frame as the grid | 0 | — | — |
| Filter token | added | `opacity`, `scale` | 0, .96 → 1, 1 | 160ms | settle | 0 |
| Filter token | removed | `opacity`, `max-width` | 1, 240px → 0, 0 | 140ms | ease-out | 0 |
| Empty state | becomes visible | `opacity`, `translateY` | 0, 8px → 1, 0 | 220ms | glide | 60ms |
| Skeleton shimmer | while loading | `translateX` | −100% → 100% | 1200ms | ease-in-out | loop while the request is open |
| Live ticker run | always | `translateX` | 0 → −50% | **64s** | linear | infinite |
| Live ticker run | hover / focus-within | `animation-play-state` | running → paused | 0 | — | 0 |
| Filter sheet (390) | open | `translateY` | 100% → 0 | 260ms | glide | 0 |
| Filter sheet scrim | open | `opacity` | 0 → .72 | 200ms | linear | 0 |
| Filter sheet (390) | close | `translateY` | 0 → 100% | 200ms | ease-out | 0 |
| Header cast | crossing scrollTop 0 | `box-shadow` | none → `--shadow-2` | 140ms | ease-out | 0 |

---

## 2. Entry budget

**520ms** from first paint to the hero at rest.

```
  0ms ─ header + ticker fade                      220ms
  0ms ─ eyebrow + headline rise                   340ms
 60ms ─ lede + CTAs rise                          340ms   ends  400ms
120ms ─ proof rail rise                           340ms   ends  460ms
180ms ─ market card rise                          340ms   ends  520ms
                                          TOTAL   520ms
```

Four steps of 60ms, one duration for all four. The stagger is short on purpose: this is a mid-range
Android on a Tanzanian mobile network, and an entry sequence that outlives the connection is a
liability, not polish. Nothing below the fold participates — sections animate on first intersection,
once, and never again.

---

## 3. `prefers-reduced-motion: reduce`

The stylesheet carries one global block:

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:1ms !important;
    animation-iteration-count:1 !important;
    transition-duration:1ms !important;
  }
  .ticker .run{animation:none;transform:none}
  .skel::after{display:none}
}
```

Row by row:

| Row | Behaviour under reduced motion |
|---|---|
| Header / ticker fade | **Nothing.** Rendered opaque on frame 1 |
| All four hero rises | **Nothing.** Final position, full opacity, no transform |
| Section-on-scroll | **Nothing.** Rendered visible; the observer is not attached |
| Hover — nav, chip, button, tile | Colour still changes, instantly. `translateY` is dropped |
| Chip press | Colour only. No 1px shift |
| Menus open / close | Appear and disappear instantly. No slide |
| Grid on filter change | **Nothing.** The grid swaps content on the frame |
| Token add / remove | Instant |
| Empty state | Instant |
| Skeleton shimmer | **Removed.** The blocks are a flat `--bg-inset` fill |
| **Live ticker** | **Stops.** `animation: none`, `transform: none`. The strip becomes a static line reading from item 1, with both edge masks still applied so it never hard-clips mid-word |
| Filter sheet | Appears in place. Scrim still fades — opacity-only, 200ms, no vestibular load |
| Header cast on scroll | Applied instantly |

Nothing that conveys information relies on motion. The ticker's content is legible stopped; the
live pip is a colour and a glow, not a pulse; the result count is text.

---

## 4. Infinite loops

**One perpetual. One transient. Down from eight, one of which currently ignores reduced motion.**

| # | Loop | Duration | Justification |
|---|---|---|---|
| 1 | **Live ticker run** | 64s linear | This is the loop the budget is for. It is the only element on either page whose entire job is to say *something is happening right now*, and it is the one the findings record as broken — a `ticker-scroll` keyframe is declared and the element computes to `animation: none`, so the strip is static and hard-clips mid-word at 390 (A10). 64s is deliberately slow: a full pass takes about a minute, so it reads as a wire feed rather than as a carousel demanding attention. Pauses on hover and on focus-within, so a keyboard user can read it. Stops dead under reduced motion. |
| 2 | **Skeleton shimmer** | 1200ms | Bounded by the request, not by time — it cannot outlive the fetch, and on a slow connection it is the only signal distinguishing "loading" from "broken". Removed entirely under reduced motion, where the flat fill carries the same meaning. Counted here for honesty; if the budget is literally one, cut this and the skeletons still work. |

The eight loops running today are not replaced by eight quieter ones. `m-breathe 1.6s infinite` on
eight elements is ambient anxiety on a gambling product, and the one that ignores
`prefers-reduced-motion` is a defect rather than a taste question.

---

## 5. The 895

895 elements currently compute to `transition: all 0s ease` — that is, no transition at all, on
almost everything. Most of the "looks nice but feels unfinished" impression is this.

The fix is not to animate 895 things. It is one rule per interactive family, and there are five:

| Family | Rule |
|---|---|
| Nav / link / tile | `transition: background 140ms ease-out, color 140ms ease-out` |
| Button | `+ box-shadow 140ms ease-out, transform 140ms ease-out` |
| Chip / segmented | `+ border-color 140ms ease-out` |
| Menu / sheet | `opacity` + `transform`, per the table |
| Everything else | **nothing** — a transition on a non-interactive element is noise |

`transition: all` never appears. It is what produced the 895 in the first place.
