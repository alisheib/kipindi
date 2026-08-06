# 50pick material system — delivery manifest + what comes next
2026-08-06 · Claude Design · final for this commission.

## In this package
- `material.css` — the mergeable source. §A tokens → law/tokens.css · §B
  keyframes → law/keyframes.css · §C utilities → law/motion.css · §D migration
  map (comment only). Every value oklch except the trademark's delivered hexes.
- `EXTEND.md` — M1–M8, written to merge into DESIGN_AUTHORITY.md.
- `Material System.dc.html` + `support.js` + `uploads/tokens.css,motion.css` —
  the live spec, self-contained; open in a browser.
- `DESIGNER-QUESTIONS-R2.md` — answered 2026-08-06; decisions folded into the
  files above. Kept as the record of why.

## Decisions of record
- One gold, re-derived from #E3BC66 (91 / 79→72 / 65 @ hue 84). Earned money only.
- One lamp at −14° (13.998° measured); even royal-tinted edge rings; five rungs.
- Win: impress + 2px recoil → cascade → needle-sweep → count-up strikes gilt →
  mark-flip on the needle (--t-move) → one band of light. Bloom removed.
- Loss: strict silence (M7). Pending: .mark-pending ±2° breath, never a spin.
- Seal carries the trademark verbatim, single-ink relief, 76px ceiling
  (clear-space law) on the 114px face.
- Icons: 24px grid, stroke 2.0, round caps.

## Open items — not blocking, needed for perfect
1. **React/TSX drop-ins** — win-celebration, toast, market-card as components
   matching your existing props, so engineering pastes rather than translates.
2. **Icon-set restyle pass** — apply stroke 2.0 + 2px live-area margin +
   0.75px join radius across all 185 glyphs (designer R2 Q10); needs the set.
3. ~~Loss needle-settle motion~~ — DELIVERED: `needle-settle` keyframe +
   `.needle-settle-loss` utility (--t-move · --m-settle), demoed in §3.
4. **`--shadow-card-top` flag** — confirm whether globals.css defines it;
   delete §A2's alias if so (flagged in material.css §A0).
5. **D-0 celebration font row** — authority table says --font-display for the
   amount; mono won here (M4). Amend the table when merging EXTEND.md.
6. **SW/ZH full-product proof** — celebration verified in three languages;
   toasts/cards/menus still EN-only in the spec. Verify at merge.
7. **`m-axis-sweep` duplication** — the one place −14° is written twice
   (documented); if the axis ever changes, change both.
8. **Crest chief-band opacity** — 0.26 recommended and demoed; ship decision
   is yours (Tweaks dial on the spec page).
