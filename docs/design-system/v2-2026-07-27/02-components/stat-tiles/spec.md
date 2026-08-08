> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Stat tiles & ledger cells — spec (INVENTED 2026-06, Positions work)

Tile: border 1px --border, bg --bg-elevated, radius --r-md, pad 14px 16px. Label mono 9.5px/600 ls 0.10em uppercase --text-subtle; value mono 18px/700 tabular (19px inside the ledger strip); sub mono 10.5px --text-muted, single-line ellipsis.
Ledger strip: .glass-panel (GIVEN) + .gilt-eyebrow + .gilt-rule header; cells divided by border-left 1px color-mix(--border 60%, transparent), pad 2px 14px 0; grid repeat(auto-fit, minmax(158px, 1fr)).
Ink rule: --gilt only on settled/earned money; --no-300 on settled loss; neutral --text for anything unrealised.
Admin variant (D4, NOT yet designed): same tile, tighter (pad 10px 12px, value 16px) — flagged in OPEN-GAPS.

## glass-panel / gilt chrome (GIVEN, verbatim)
```css
/* ---------------------------------------------------------------------------
   3 · Market card — YES probability as hero
   --------------------------------------------------------------------------- */

/* v2 Dark Glass — reusable frosted royal panel for prominent at-rest section
   surfaces. Swap a flat `border border-border bg-bg-elevated` box for
   `glass-panel` (it brings its own border + gradient + soft elevation + 1px
   inner light-edge). No backdrop-filter: these sit on the page canvas, so the
   top-lit gradient + light-edge carry the depth without GPU cost on big panels. */
.glass-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px -6px oklch(6% 0.08 268 / 0.45), inset 0 1px 0 oklch(100% 0 0 / 0.08);
  border-radius: var(--r-lg);
}

.gilt-eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gilt);
}

.gilt-rule {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gilt) 8%, var(--gilt) 92%, transparent);
  margin-block: 16px;
  opacity: 0.85;
}
```
