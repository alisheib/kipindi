# Colour — every colour, its job, and what it must never do

Source of truth: `tokens.css` (values below are verbatim). Grouped by role. "NEVER" lines are binding law (06-patterns-and-rules/).

## Canvas & surfaces (royal indigo, hue 268 — anchored to #060a50)
| Token | Value | For | Never |
|---|---|---|---|
| --bg | oklch(15% 0.130 268) | page canvas | lightened into a "light mode" |
| --bg-elevated | oklch(22% 0.140 268) | cards | — |
| --bg-elevated2 | oklch(26% 0.150 268) | second-elevation card | — |
| --bg-overlay / --bg-inset / --bg-sunken | oklch(11% 0.110 268) | sunken wells, inputs, hover-down | — |
| --bg-royal-soft | oklch(30% 0.165 268) | modal / hero highlight | — |
| --panel | oklch(20% 0.130 268) | nav & sidebar chrome | — |
| --border | oklch(34% 0.130 268) | default 1px hairline | — |
| --border-strong | oklch(44% 0.150 268) | emphasis borders, dashed empties | — |
| --border-royal | oklch(56% 0.170 268) | decorated royal edges | — |
| --border-gold | oklch(78% 0.13 80) | gold-context edges only | decorative borders |

## Text (on the royal canvas)
| Token | Value | For |
|---|---|---|
| --text | oklch(98% 0.012 268) | primary ink |
| --text-muted | oklch(86% 0.040 268) | secondary |
| --text-subtle | oklch(70% 0.080 268) | labels, captions |
| --text-faint | oklch(60% 0.090 268) | micro-labels, footers |
| --text-link / --text-link-hover | var(--aqua-300) / var(--aqua-200) | links — the ONLY default link colour |

## YES — emerald, hue 152. Semantic, untouchable.
Ramp --yes-50…--yes-950 (see tokens.css). Working values: --yes-300 oklch(80% 0.14 152) for text/labels; --yes-500 oklch(62% 0.17 152) for fills; .btn-yes solid oklch(57% 0.155 150).
**For:** YES/UP betting actions, pool splits, market-direction read-outs, up-price ticks.
**NEVER:** navigation, decoration, success-toast-only meaning without a word/arrow, re-hued, inverted, used as the only signal.

## NO — rose, hue 22. Semantic, untouchable.
Ramp --no-50…--no-950. Working: --no-300 oklch(80% 0.14 22) text; --no-500 oklch(62% 0.20 22) fills; .btn-no solid oklch(56% 0.200 25).
**For:** NO/DOWN betting actions, down-price ticks, settled losses (calm ink), final-30s countdown urgency.
**NEVER:** as above; also never an "error" synonym — errors use --danger-500.

## Gold — champagne, hues 76–82. EARNED MONEY ONLY.
Ramp --gold-50…--gold-950; working aliases --gold var(--gold-500) oklch(72% 0.14 78), --gold-fg oklch(20% 0.05 80), --gilt oklch(86% 0.13 82), --gilt-strong oklch(80% 0.14 80).
**For:** wins, payouts, settled profit ink, the money-commit button (.btn-gold), chip-resolved, the gilt needle (brand signature), gilt-eyebrow/rule chrome, gold tier badge.
**NEVER:** nav items, chips (other than resolved), decoration, unrealised/projected amounts, chart lines, asset identity (the D1 gold-asset icon tint is flagged as a deliberate, documented exception for asset artwork placeholders — see 02-components/updown-card spec §New values).

## Aqua — cyan, hue 195. Finishing pass, ≤8% surface coverage.
--aqua-50…--aqua-950; aliases --aqua var(--aqua-300) oklch(80% 0.100 195), --aqua-glow, --aqua-edge; chrome aliases --accent-300…600.
**For:** links, active bottom-nav, live pips, sparkline end-dot halo, focus-ring tint, VIEW-ALL links.
**NEVER:** semantic meaning, chips, button labels, body text.

## Brand blue — hue 262
--brand-300 oklch(82% 0.120 262) · --brand-400 72%/0.160 · --brand-500 63%/0.180 · --brand-600 54%/0.165 · --brand-soft 34%/0.120.
**For:** nav-active pill, focus ring (--border-focus), card-hover glow, tab-active ring, neutral chart lines (P&L), line-art illustrations.

## Claret — heraldic burgundy, hue 15. Editorial weight only.
--claret-*; aliases --claret var(--claret-600), --claret-soft, --claret-edge. For politics chips and editorial accents. Never semantic, never money.

## Status (system, not betting)
--danger-500 oklch(60% 0.22 25) · --warning-500 oklch(78% 0.13 86) · --info-500 oklch(64% 0.17 268), each with -bg/-border/-fg color-mix recipes. Errors/payment failures use danger — never the NO rose.

## Live
--live-400 oklch(64% 0.20 25) — the red LIVE dot only.

## Neutrals
--slate-50…950 and --pearl-* (see tokens.json) — royal-axis neutrals behind all of the above. --dial-neutral oklch(56% 0.030 268) for dormant dial states.

## Legacy teal (hue ~200, --teal-*, --royal aliases)
Present in tokens.css for compat with the first-generation concept kit. **Superseded for new work** by brand-blue + royal indigo — see 07-provenance/SUPERSEDED.md. Do not introduce new teal surfaces.

## Example of the law being broken (do not repeat)
- A gold "NEW" nav chip → breaks *gold = earned money*. Correct: neutral chip.
- Rose empty-state border because "nothing here feels negative" → breaks *rose = betting/NO*. Correct: --border-strong dashed.
- A green price with no arrow → breaks *colour never the only signal*. Correct: arrow + sign.
