> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Toasts & tooltips — spec (GIVEN)

Toast contract: { kind: success|warning|danger|info, title, body }. Icon glyphs are typographic (✓ ! × i), never emoji. Entrance toast-slide + 5s auto-dismiss hairline (toast-bar), both reduced-motion clamped.
Tooltip contract: { label, children } — .tooltip wrapper + .tooltip-popover.

## Authoritative CSS
```css
/* ---------- Toast (kit class) ---------- */
/* v2 Dark Glass: frosted translucent panel with a 1px top light-edge.
   backdrop-filter is GPU-accelerated and degrades gracefully (solid fill)
   on the few engines without support. */
.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-lg);
  border: 1px solid var(--border-strong);
  background: color-mix(in oklab, var(--bg-elevated) 80%, transparent);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  box-shadow: 0 1px 0 oklch(98% 0.01 268 / 0.08) inset, var(--shadow-4);
  min-width: 280px;
  max-width: 360px;
}

.toast-success .toast-icon { background: color-mix(in oklab, var(--yes-500) 22%, transparent); color: var(--yes-300);
}

.toast-warning .toast-icon { background: color-mix(in oklab, var(--warning-500) 22%, transparent); color: oklch(82% 0.16 80);
}

.toast-danger  .toast-icon { background: color-mix(in oklab, var(--danger-500) 22%, transparent); color: oklch(80% 0.18 25);
}

.toast-info    .toast-icon { background: color-mix(in oklab, var(--info-500) 22%, transparent); color: oklch(78% 0.13 268);
}

/* ---------- Animated toast (entrance + auto-dismiss progress hairline) ---------- */
.toast-anim {
  animation: toast-slide var(--dur-arrive) var(--ease-arrive) both;
  position: relative;
  overflow: hidden;
}

/* ===========================================================================
   Legacy tooltip (kp-tooltip) — kept because existing components use it.
   The new kit's `.tooltip` class also resolves correctly above.
   =========================================================================== */
.kp-tooltip { position: relative; display: inline-flex;
}

/* ---------- Tooltip refinement (kit `.tooltip-popover` — kp-tooltip stays for compat) ---------- */
.tooltip-popover {
  transition: opacity var(--dur-quick) var(--ease-glide), transform var(--dur-quick) var(--ease-glide);
  transform: translateX(-50%) translateY(4px);
  opacity: 0;
}

.tooltip:hover .tooltip-popover { transform: translateX(-50%) translateY(0); opacity: 1;
}
```
