# Design tokens — cheat-sheet

Everything below is defined as CSS custom properties in `globals.css` `:root`.
This is a readable map; **`globals.css` is the source of truth**. All colors are
**OKLCH** `oklch(L C H)` — L = lightness %, C = chroma, H = hue angle.

## Color ramps (each 50→950)

| Ramp | Hue | Role |
|---|---|---|
| `--royal-*` / `--teal-*` (aliased) | 268 | Primary chrome. Sovereign, financial. Canvas + buttons + structure. |
| `--yes-*` | 152 (emerald) | **YES** outcome. Semantic, untouchable. |
| `--no-*` | 22 (rose) | **NO** outcome. Semantic, untouchable. |
| `--gold-*` | 76–82 | Gilt soloist — champagne tuned for the royal canvas. Accents only. |
| `--claret-*` | 15 | Heraldic burgundy. Editorial only (Politics, Sovereign tier, crest). Never near NO-rose. |
| `--aqua-*` | 195 | Patina cyan. Finishing pass only (live glow, sparkline, focus, "new" pip). ≤8% coverage. |
| `--slate-*` | 268 | Neutral ramp on the royal axis (50→950, incl. 150/750/850). |
| `--pearl-*` | 268 | Pearl ink for text. |

Semantic singles: `--danger-500` (25), `--info-500` (268), `--warning-500` (86).

## Surfaces & text (the ones you'll use most)

| Token | Value / meaning |
|---|---|
| `--bg` | Canvas — deep midnight indigo `oklch(15% 0.130 268)` |
| `--bg-elevated` | Elevated card `oklch(22% 0.140 268)` |
| `--bg-overlay` | Sunken / hover-down `oklch(11% 0.110 268)` |
| `--bg-royal-soft` | Highlighted surface (modal, hero) |
| `--border` / `--border-strong` / `--border-royal` / `--border-gold` | Hairlines, ascending strength |
| `--text` / `--text-muted` / `--text-subtle` | Pearl ink, descending emphasis |
| `--gilt` / `--gilt-strong` | The gold accent ink |

Semantic aliases map onto these for legacy code: `--surface`, `--bg-base`,
`--text-primary/secondary`, `--success/warning/danger/info` (+ `-bg/-border/-fg`
variants), `--royal*`, `--gold*`, and a `--bet-*` set (win/lose/pool/stake/
jackpot/streak/hot/cold) for money surfaces.

## Typography

- Fonts: `--font-display` **Sora**, `--font-body` **Inter**, `--font-mono` **JetBrains Mono**.
- Scale: `--type-hero 72` · `display-1 60` · `display-2 44` · `h1 32` · `h2 24` · `h3 20` · `h4 17` · `body 15` · `small 13` · `micro 11` (px).

## Spacing — `--sp-*`
`1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64` (px).

## Radius — additive +4 rhythm — `--r-*`
`xs=4 · sm=8 · md=12 · lg=16 · xl=24 · pill=999` (px).

## Motion — `--ease-*`
- `--ease-micro` 100ms — taps, hovers, micro feedback.
- `--ease-stage` 240ms — entrances, staged reveals.
- `--ease-celebrate` 600ms — win moments.
- (Extended motion/haptics tokens were added for the haptics brief — search
  `globals.css` for the relevant block.)
- **Always pair with a `prefers-reduced-motion: reduce` branch.**

## Shadows & glows
`--shadow-1..5` (ascending elevation), `--shadow-card`, `--shadow-royal`,
and `--glow-gold` / `--glow-blue` / `--glow-win` for focal emphasis.

## Component CSS in `globals.css`
Beyond tokens, `globals.css` carries hand-written component classes. The ones
worth knowing: `.mcard*` (market card), `.pchart` / `.spark` (probability chart
+ sparkline), `.chip`, plus the chat surface styles (imported from
`src/styles/chat/`). Search by name.
