# Chips — spec (GIVEN)

Contract: Chip { variant: neutral|yes|no|live|resolved|pending|objection|politics|signal|hot-rose, dot? }
Uppercase, 700 weight, ~0.06em tracking. chip-resolved is a legal gold surface (a paid-out result). VOID uses the neutral chip — never an error treatment.

## Authoritative CSS
```css
/* ---------- Chip ---------- */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 21px;
  padding: 0 8px;
  border-radius: var(--r-pill);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  background: oklch(34% 0.09 268 / 0.5);
  color: var(--text-muted);
}

.mcardp .chip { font-size: 9px; padding: 2px 6px; gap: 3px; letter-spacing: 0.02em; white-space: nowrap; flex-shrink: 0;
}

.mcardp .chip .live-dot { width: 5px; height: 5px;
}
```

---

## `.chip-new` — the NEW market badge (added 2026-07-29)

```css
.chip-new {
  height: 23px; padding: 0 9px; font-size: 11px;
  color: var(--brand-300);
  background: oklch(63% 0.18 262 / 0.16);
  border-color: oklch(63% 0.18 262 / 0.40);
}
.chip-strong { font-weight: 700; }   /* signal chips carry the card's one loud word */
```

Marks a LIVE market with no activity yet (see `02-components/market-card/spec.md`
→ COLD-START).

**Why brand blue and not gold.** NEW is *chrome* — "this just opened" — not a
betting semantic. `01-foundations/colour.md` names a gold "NEW" chip explicitly as
a law break: gold must mean *money you have earned* the instant it is seen
(RULES law 3), and on a market nobody has touched, nobody has earned anything.

**Why it is not just `.chip-pending`.** `.chip-pending` (SOON) is already
brand-blue, so this is a close neighbour rather than a new colour — deliberately,
since both are chrome. `.chip-new` runs at a lighter fill (0.16 vs 0.26) and a
lighter border (0.40 vs 0.55) so NEW and SOON stay tellable apart across a board.
They can never collide on a single card: `getSignalBadge` short-circuits to NEW
for a fresh market before SOON is ever considered.
