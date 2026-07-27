# Elevation, glass & motion

## Shadows (tokens, verbatim)
- --shadow-card: 0 1px 2px oklch(6% 0.06 268 / 0.55), 0 10px 28px -10px oklch(4% 0.04 268 / 0.70) — default card
- --shadow-royal: 0 14px 44px -14px oklch(4% 0.04 268 / 0.78) — framed page mocks, heavy panels
- Numbered scale --shadow-1…5 (see tokens.json) for legacy components
- Glows: --glow-gold / --glow-blue / --glow-win / --glow-jackpot (color-mix recipes); button hover glows are per-variant box-shadows (see buttons spec)

## Glass
.glass-panel (tokens.css) — the ledger/hero surface: translucent royal fill + blur + 1px border (exact recipe extracted verbatim in 02-components/stat-tiles/spec.md). Dialog scrims animate backdrop-filter blur(0→8px) via scrim-fade.

## Easing & duration tokens
- --ease-micro 100ms cubic-bezier(0.2,0.8,0.2,1) — hovers, toggles
- --ease-stage 240ms cubic-bezier(0.4,0,0.2,1) — bars, layout shifts
- --ease-celebrate 600ms cubic-bezier(0.2,0.8,0.2,1) — win moments
- Curves: --ease-glide (0.22,1,0.36,1) default · --ease-arrive (0.34,1.56,0.64,1) entries · --ease-sink (0.4,0,0.2,1) exits · --ease-conduct (0.65,0,0.35,1) breathing
- Durations: --dur-flick 120 · --dur-quick 220 · --dur-glide 360 · --dur-arrive 520 · --dur-stage 820 (ms)

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
| tb-shimmer (brand.jsx) | TippingBar resolved gold sweep, one-shot 1.6s | clamped |
| ud-count-pulse (INVENTED 2026-07) | D1 final-30s digits opacity 1→0.55, 1s --ease-conduct | explicit animation:none |

## The two motion laws
1. Global clamp: `@media (prefers-reduced-motion: reduce)` forces all animation/transition durations to 0.01ms, plus the explicit calm branches above; mirrored by the in-app `html.kp-reduce-motion` switch and `[data-motion]` attributes.
2. Celebration ≠ casino: wins breathe or fade (win-aura-breathe), never rotate infinitely, never confetti. The old spinning sunburst was replaced for exactly this reason (SUPERSEDED.md).
