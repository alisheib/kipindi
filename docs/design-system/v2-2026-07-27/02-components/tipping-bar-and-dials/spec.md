# TippingBar & dials — spec

GIVEN — TippingBar { yesPct, height=28, animate=true, showLabels=true, resolved? }:
- track --bar-track + inset ring 1px --bar-track-border
- YES fill linear-gradient(90deg, oklch(50% 0.14 152), oklch(58% 0.16 152)) + 18px glow at 35%; NO mirrored on hue 22
- needle 3px wide, --bar-needle, radius 2, extends 6px past track, tilt = ((yes-50)/50) x 18deg, transform-origin 50% 100%, glow 0 0 10px --bar-needle-glow
- resolved adds a one-shot gold shimmer (tb-shimmer 1.6s ease-out)
- labels mono 11px ls 0.05em: YES in --bar-label-yes (+strong), lean word italic 9px uppercase --bar-label-tipping, NO mirrored.

GIVEN — ConfidenceDial { yesPct, size=92, label? }: r 44, tilt ±22°, wedges oklch(50% 0.14 152) / oklch(52% 0.16 22) at 0.92 opacity, divider 2.2px oklch(96% 0.005 240), value mono 22px/700 centred.

INVENTED (2026-06) — NeedleDial (win rate): 36-44px; ring 1.5px --border-strong on --bg-overlay; gilt needle 2.4px from (22,34) to (22,7), tilt = ((rate-50)/50) x 26deg about (22,34); pivot dot r 2.4 --gilt; drop-shadow 0 0 4px --bar-needle-glow. Static — no motion to gate.

## Tipping-bar tokens (verbatim)
```css
(no dedicated CSS block — inline recipe, see preview source)
```
