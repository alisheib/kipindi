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
