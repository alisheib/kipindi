# Patch 3 — `src/app/globals.css` : the `.chip-new` badge

The NEW badge must read **fresh/inviting but NOT gold** (gold = earned money only —
`colour.md` even calls out a gold "NEW" chip as a law break). Brand blue is the
right tone: it's chrome, not a betting semantic. Add beside the other `.chip-*`
rules (search for `.chip-signal` / `.chip-hot-rose` and put it there):

```css
/* NEW market badge — brand-blue, neutral chrome tone (never gold, never a
   betting semantic). Signals "just opened", not a contest. */
.chip-new {
  color: var(--brand-300);
  background: oklch(63% 0.18 262 / 0.16);
  border: 1px solid oklch(63% 0.18 262 / 0.40);
}
```

If you'd rather keep NEW fully neutral (grey), use the existing `chip-pending`
instead of `chip-new` in `market-card.tsx` and skip this patch — both are
law-safe. The brand-blue version matches the design target mockup.

> After this, run `npm run test:bridge` (every colour utility class resolves) and
> `npm run test:contrast` — the brand-300 ink on the elevated card surface is the
> same pairing already used by `chip-signal`, so it should pass unchanged.
