> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Avatar & TierBadge — spec (GIVEN)

Avatar { initials, size: sm|md|lg, src?, hue=215 } — initials on linear-gradient(135deg, oklch(55% 0.10 h), oklch(35% 0.08 h)); src swaps to cover image.
TierBadge { tier: bronze|silver|gold|diamond } — single letter. The gold tier badge is rank identity, an allowed gold exception alongside earned money.

## Authoritative CSS
```css
/* ---------- Avatar ---------- */
.avatar {
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--pearl-50);
  background: linear-gradient(135deg, var(--royal-500), var(--royal-800));
  flex-shrink: 0;
}

/* ---------- Tier badge ---------- */
.tier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-display);
  border: 1.5px solid;
}

/* ---------------------------------------------------------------------------
   §2  BADGES & ACHIEVEMENTS  (sibling system to .tier-*)
   --------------------------------------------------------------------------- */

/* The badge "coin": a round heraldic medallion on royal, gilt rim, line-art
   icon inside. Mirrors how .tier-badge is structured but larger, since these
   are display objects on the profile shelf — not inline rank pips. */
.badge {
  position: relative;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: var(--gilt);                          /* drives the line-art stroke via currentColor */
  background:
    radial-gradient(circle at 50% 32%, oklch(30% 0.165 268) 0%, oklch(20% 0.140 268) 70%, oklch(15% 0.130 268) 100%);
  border: 1.5px solid var(--border-gold);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--gilt) 26%, transparent) inset,
    var(--shadow-3);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
```
