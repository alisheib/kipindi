# GEOMETRY-AUDIT.md

Measured in the browser, not read off the CSS. Re-run these before you call a screen done.

## What was checked, and what it found

| Check | Method | Result |
|---|---|---|
| Horizontal overflow | `documentElement.scrollWidth - innerWidth` at 390 / 560 / 768 / 820 / 1024 / 1200 / 1440 / 1920 | **0 at every width.** The only element crossing the edge is the ticker run inside its masked container, which is intended |
| Element wider than its own box | `scrollWidth > clientWidth` on every `.wrap` descendant with `overflow: visible` | **1 found, fixed.** `.shead` hung 12px past the column — the `.tlink`'s negative margin (hanging padding for optical alignment) had no matching padding on the row. Fixed with `padding-right: var(--sp-3)` on `.shead`, which keeps the optical alignment and lands the hang flush |
| Sibling overlap | for each row, `next.left < prev.right` where the two share a line | **0** across `.qrow`, `.topic`, `.strow`, `.rgline`, `.proof`, `.ctas`, `.shead` |
| Column alignment | left edge and width of every main content column | **all identical** — one `--w-board` column, one gutter |
| Tap targets | every `a, button, input, [role=option], [role=radio]` outside the frozen card | **0 under 44 × 44** |
| Section rhythm | content-edge to content-edge between consecutive section inners | **144 · 96 · 96 · 144** at 1440, plus one internal 48. Compresses to 122 · 97 · 96 · 123 at ≤1024 |
| Colour literals | `grep -E '#\|rgba?\(\|oklch\(\|hsla?\('` over every stylesheet and inline style | **0** |
| Type below 11px | `grep -E 'type-(label\|nano)'` outside the frozen block | **0** |

## Three reported overflows that are correct and must stay

1. **`.tbar` reports ~5px of horizontal overflow at high percentages.** The needle is
   `translate(-50%)` at `left: <pct>%`, so at 100% half its width plus its glow sits past the track.
   `needle.css` sets `overflow: visible` on the track deliberately — the needle is meant to
   overhang vertically too. The card's own `overflow: hidden` clips it safely. **Frozen; do not
   "fix" it.**

2. **The ticker run is far wider than its viewport.** That is the mechanism: a duplicated run
   translated `0 → -50%`, with both edges masked rather than clipped. If you make it fit, the
   ticker stops working.

3. **An open dropdown is wider than its trigger.** The sort menu is `min-width: 300px` inside a
   217px `.fgroup`. It is `position: absolute`, so it floats and nothing clips or shifts — but a
   naive `scrollWidth > clientWidth` test reports the parent as overflowing. **The audit script
   below excludes absolutely-positioned subtrees for exactly this reason.** If you widen a menu and
   the audit stays quiet, that is correct.

## The script

Paste into the console on any screen:

```js
(() => {
  const R = e => e.getBoundingClientRect();
  const nm = e => (e.tagName.toLowerCase() +
    (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')).slice(0, 30);
  const out = { hOverflow: document.documentElement.scrollWidth - window.innerWidth, boxOverflow: [], overlap: [], subTap: [] };

  const floats = new Set();
  document.querySelectorAll('*').forEach(e => {
    const p = getComputedStyle(e).position;
    if (p === 'absolute' || p === 'fixed') floats.add(e);
  });
  const inFloat = e => { for (let n = e; n; n = n.parentElement) if (floats.has(n)) return true; return false; };

  document.querySelectorAll('main *, .filterbar *').forEach(e => {
    if (e.closest('[data-market-card]') || e.closest('.ticker')) return;
    if ([...e.children].some(c => floats.has(c))) return;   // a parent of a floating menu
    if (inFloat(e)) return;
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === 'visible' && e.clientWidth > 0)
      out.boxOverflow.push(nm(e) + ' ' + e.scrollWidth + '>' + e.clientWidth);
  });

  document.querySelectorAll('[data-row]').forEach(row => {
    const k = [...row.children].filter(c => R(c).width > 0);
    for (let i = 0; i < k.length - 1; i++) {
      const a = R(k[i]), b = R(k[i + 1]);
      if (Math.abs(a.top - b.top) < a.height * 0.7 && b.left < a.right - 1)
        out.overlap.push(nm(k[i]) + '|' + nm(k[i + 1]) + ' ' + Math.round(b.left - a.right));
    }
  });

  document.querySelectorAll('a,button,input,[role=option],[role=radio]').forEach(e => {
    if (e.closest('[data-market-card]')) return;
    const r = R(e);
    if (r.width > 0 && (r.width < 44 || r.height < 44))
      out.subTap.push(nm(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });

  return out;
})()
```

**All four values must be 0 / empty at every breakpoint.**
