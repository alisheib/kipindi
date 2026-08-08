> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Live indicators — spec

GIVEN — .live-dot: 6px, --live-400 red, live-pulse breathe (opacity 0.3↔1) — brightness pulse only, safe inside overflow:hidden. Reduced motion: global clamp stops the pulse; the dot stays visible.
INVENTED (2026-06) — aqua live pip: 6px circle --aqua-300 + glow 0 0 8px --aqua-glow, label mono 10px ls 0.08em uppercase --text-subtle. Aqua is a finishing pass (≤8% coverage), never semantic.

## Authoritative CSS
```css
/* ---------- LiveDot + animations ---------- */
/* Bright red-orange pulsing dot. Uses opacity animation so it works
   inside overflow:hidden containers (market cards). The dot itself
   is always visible; the pulse is a brightness/opacity breathe. */
.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--live-400);
  flex-shrink: 0;
  animation: live-pulse 1.4s ease-in-out infinite;
}

/* Same technique as .live-dot but in the brand gold — used for the
   notification-bell unread indicator. The earlier dot used Tailwind's
   `animate-ping`, which scales a translucent ring to 0 opacity. At a
   6px size that rendered as a fuzzy smudge rather than a crisp
   pulsing circle. The box-shadow approach keeps a real halo around
   the dot at all times, so it always reads as a circle, and only the
   outer ring breathes. */
.gold-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: oklch(82% 0.15 86);
  box-shadow:
    0 0 0 0 color-mix(in oklab, oklch(82% 0.15 86) 70%, transparent),
    0 0 10px 1px color-mix(in oklab, oklch(82% 0.15 86) 55%, transparent);
  animation: gold-pulse 1.6s ease-in-out infinite;
}

[data-motion="reduced"] .live-dot,
[data-motion="reduced"] .cm-status-dot { animation: dot-pulse-soft 1.6s ease-in-out infinite !important; box-shadow: none !important;
}

.mcardp .chip .live-dot { width: 5px; height: 5px;
}

(no dedicated CSS block — inline recipe, see preview source)
```
