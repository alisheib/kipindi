> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Empty states — spec

GIVEN — EmptyState { illustration, title, body, action? }: dashed border 1px --border-strong, radius --r-lg, pad 32px (40-44px on full pages), centred, bg --bg-elevated; title --font-display 16px/600; body 13px --text-muted lh 1.5; ghost or gold action button. Illustrations are line-art SVG, 1.5px stroke, brand-tinted with a single gold accent dot — never emoji, never mascots.
Note: kit specimens draw the art in --teal-400 (legacy hue); 2026-06/07 surfaces use --brand-400 for the same role.
INVENTED (2026-07) — paused-chain variant: dashed price-path glyph, copy states rounds resume automatically and money is untouched; calm, no error tone.
