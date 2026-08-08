> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Buttons — spec (GIVEN)

Contract (kit/atoms.jsx): Btn { variant: primary|yes|no|gold|ghost|danger|claret|outline|aqua-ghost, size: sm|md|lg|xl, loading?, leadingIcon?, trailingIcon?, disabled? }
Sizes: sm 30px h / 12px pad / 13px text · md 38/16/14 · lg 46/20/15 · xl 56/24/16.5 + r-lg radius. Tap floor 40px means betting actions use lg/xl.
Rules: yes/no only inside betting actions; gold only on the money-commit; hover translateY(-1px); active translateY(1px) scale(0.97); disabled opacity 0.45.
INVENTED (2026-07, D1): the mono "× 1.4 est." payout marker inside the label — mono 12.5px/600 at 85% opacity.

## Authoritative CSS (verbatim from tokens.css)
```css
/* ===========================================================================
   Atoms — kit classes (button, chip, live-dot, pbar, input, avatar, tier,
   skeleton, toast, tooltip)
   =========================================================================== */

.btn {
  font-family: var(--font-body);
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform .1s var(--ease-micro), box-shadow .16s var(--ease-micro), filter .12s, background .16s;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
}

/* Kit per-size horizontal padding (kit/tokens.css) — sm12/md16/lg20/xl24; xl gets --r-lg. */
.btn-sm { height: 30px; padding: 0 12px; font-size: 13px;
}

.btn-primary {
  background: linear-gradient(180deg, oklch(60% 0.20 268) 0%, oklch(48% 0.20 268) 100%);
  color: var(--pearl-50);
  border-color: oklch(40% 0.20 268);
  box-shadow:
    0 1px 0 oklch(74% 0.16 268) inset,
    0 -1px 0 oklch(36% 0.18 268) inset,
    0 2px 8px -2px oklch(20% 0.10 268 / 0.50),
    0 8px 22px -10px oklch(48% 0.20 268 / 0.55);
  letter-spacing: 0.005em;
  text-shadow: 0 1px 0 oklch(20% 0.10 268 / 0.40);
}

/* v2 kit: one flat-solid family — YES/NO/gold are SOLID fills (not gradients),
   with a 1px inset top-highlight + soft shadow. (primary keeps its gradient.) */
.btn-yes {
  background: oklch(57% 0.155 150);
  color: var(--pearl-50);
  font-weight: 700;
  letter-spacing: 0.06em;
  border-color: transparent;
  box-shadow: inset 0 1px 0 oklch(80% 0.14 152 / 0.4), 0 1px 2px oklch(10% 0.05 264 / 0.35);
  text-shadow: 0 1px 1px oklch(20% 0.1 264 / 0.32);
}

.btn-no {
  background: oklch(56% 0.200 25);
  color: var(--pearl-50);
  font-weight: 700;
  letter-spacing: 0.06em;
  border-color: transparent;
  box-shadow: inset 0 1px 0 oklch(80% 0.15 25 / 0.4), 0 1px 2px oklch(10% 0.05 264 / 0.35);
  text-shadow: 0 1px 1px oklch(20% 0.1 264 / 0.32);
}

.btn-ghost {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
}

.btn-danger {
  background: var(--danger-500);
  color: var(--pearl-50);
  border-color: transparent;
  box-shadow: inset 0 1px 0 oklch(80% 0.15 25 / 0.3), 0 1px 2px oklch(10% 0.05 264 / 0.35);
}

.btn-gold {
  background: var(--gold-500);
  color: var(--gold-fg);
  font-weight: 700;
  border-color: transparent;
  box-shadow: inset 0 1px 0 oklch(95% 0.06 86 / 0.55), 0 1px 2px oklch(10% 0.05 262 / 0.35);
  letter-spacing: 0.02em;
}

.btn-claret {
  background: linear-gradient(180deg, var(--claret-500) 0%, var(--claret-700) 100%);
  color: var(--claret-50);
  font-weight: 700;
  border: 1px solid var(--claret-800);
  box-shadow:
    0 1px 0 var(--claret-300) inset,
    0 -1px 0 var(--claret-900) inset,
    0 2px 8px -2px oklch(20% 0.10 268 / 0.50),
    0 10px 28px -10px oklch(38% 0.14 15 / 0.55);
  text-shadow: 0 1px 0 oklch(15% 0.06 15 / 0.45);
}

.btn-outline {
  background: transparent;
  color: var(--brand-300);
  border: 1px solid var(--brand-500);
}

.btn-aqua-ghost {
  background: color-mix(in oklab, var(--aqua-300) 12%, transparent);
  color: var(--aqua-200);
  border: 1px solid var(--aqua-edge);
}

/* Defensive baseline — any keyboard-focusable element that doesn't
   set its own focus-visible style still gets an aqua ring. The kit's
   .btn / .input / link patterns override locally; this catches the
   long tail (custom <a>, <details>, [role="..."], etc.) so a keyboard
   user can never lose focus on the page.

   :where() keeps specificity at 0,0,0 so component-level overrides
   still win without !important. */
:where(a, button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])):focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
  transition: outline-offset 120ms ease-out;
}

/* Smooth anchor hover transitions for all text links */
:where(a):not(.btn):not([class*="mcardp"]) {
  transition: color 150ms ease-out, opacity 150ms ease-out;
}

/* =====================================================================
   APPENDED: Claude Design — haptics-paired micro-motion + achievement badges
   (design_request_haptics_motion_badges). On-token; reduced-motion branches
   below intentionally override earlier keyframes for reduce users.
   ===================================================================== */
/* ===========================================================================
   50pick — globals.css ADDITIONS
   Haptics-paired micro-motion + achievement badges.
   Drop-in extension. Uses ONLY existing tokens (--ease-*, --dur-*, --gold-*,
   --royal-*, --claret-*, --aqua-*, --yes-*, --no-*, --r-*, --shadow-*).
   No new colors / fonts / radii / shadow scales. No new motion tokens.
   Every @keyframes ships a prefers-reduced-motion branch.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   §1  MICRO-ANIMATIONS
   --------------------------------------------------------------------------- */

/* 1.1 — Button / chip press pop. Layers on the kit's existing
   `.btn:active { translateY(1px)
}

.mcardp-actions .btn { height: 36px; font-size: 13px; font-weight: 600; min-width: 0; padding: 0 10px; letter-spacing: 0.04em; border-radius: var(--r-md); transition: transform .12s ease-out, box-shadow .16s ease-out, filter .12s;
}

.mcardp-actions .btn:active:not(:disabled) { transform: translateY(1px) scale(0.96);
}
```
