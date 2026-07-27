# Probability / progress bars — spec

GIVEN (kit/atoms.jsx):
- ProbabilityBar { yesPct, size: micro|large, resolved?, showLabels?, variant: split|segmented|minimal|lean } — the market read-out; yes/no colour is legal here (it summarises betting positions).
- ProgressBar { value, max=100, tone: teal|yes|no|gold|warning|danger|info, size: sm(4px)|md(8px)|lg(12px), label?, showValue? } — track --bg-overlay + 1px --border, r-pill, gradient fill + soft glow.
- SteppedProgress { steps, current } — 4px segments, teal-400 done / teal-500 current / --bg-overlay todo.
- CircularProgress { value, size=56, stroke=5, tone, label? }.

INVENTED (2026-07, D1) — pool split: 5px track, r-pill, 2px gap, fills --yes-500 / --no-500; labels mono 9.5px/700 ls 0.06em in --yes-300 / --no-300 with the words UP/DOWN (colour never the only signal).

## Authoritative CSS
```css
/* ---------- Probability bar ---------- */
.pbar {
  position: relative;
  width: 100%;
  background: var(--bg-inset);
  border-radius: var(--r-pill);
  overflow: hidden;
  border: 1px solid var(--border);
}

.pbar-large .pbar-label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 12px;
  color: var(--pearl-50);
  text-shadow: 0 1px 2px oklch(10% 0.05 264 / 0.4);
}

/* ---------------------------------------------------------------------------
   §6  data-motion THROTTLE (mid-tier Android)
   Set via JS: `document.documentElement.setAttribute("data-motion", level)`.
   "full" = all animations (default). "reduced" = loops off, enters kept.
   "minimal" = same as kp-reduce-motion (near-instant everything).
   --------------------------------------------------------------------------- */
/* B4 (Claude Design): at the `reduced` tier, stop ALL decorative loops EXCEPT
   the live status-dot — which keeps a cheap OPACITY-ONLY pulse (no box-shadow).
   "minimal" stops everything (handled by the universal clamp below). */
[data-motion="reduced"] .cm-bubble::after,
[data-motion="reduced"] .wc-rays,
[data-motion="reduced"] .win-aura-anim,
[data-motion="reduced"] .hm-halo-pulse,
[data-motion="reduced"] .ticker-track,
[data-motion="reduced"] .prog-sweep::after,
[data-motion="reduced"] .pbar-resolved::after,
[data-motion="reduced"] .mark-breathe,
[data-motion="reduced"] .gold-dot,
[data-motion="reduced"] .pchart-dot-halo,
[data-motion="reduced"] .settling-bar::before { animation: none !important;
}
```
