# Countdown — spec

GIVEN — .countdown-ring: .ring-num in --font-display 600; .ring-cap 10px uppercase ls 0.18em --text-muted. Keyframes pulse-urgent (opacity 1↔0.65) / pulse-critical (opacity+scale) for long-form market deadlines.
INVENTED (2026-07, D1) — countdown band: container --bg-inset, border 1px color-mix(--border 70%, transparent), r-md, pad 9px 12px; label mono 8.5px/600 ls 0.12em uppercase --text-faint ("CLOSES IN" / "SELECTIONS CLOSED" / "ROUND SETTLED"); digits mono 28px/700 tabular ls 0.05em lh 1 in --text. Final 30 s: digits --no-300 + ud-count-pulse (opacity 1→0.55, 1s, --ease-conduct), animation:none under prefers-reduced-motion. After close: 00:00 in --text-subtle + .chip-pending status chip. The countdown is the ONLY manufactured urgency permitted in Up & Down.

## Authoritative CSS
```css
/* ---------- Countdown ring ---------- */
.countdown-ring { position: relative; display: inline-grid; place-items: center;
}

(no dedicated CSS block — inline recipe, see preview source)
```
