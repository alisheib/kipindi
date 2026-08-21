import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IconPlate — the rounded square a glyph sits on.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). This micro-pattern was retyped in
 * eight places, always the same four lines (`grid h-[N] w-[N] shrink-0
 * place-items-center rounded-[…]` + an inline background/colour pair) and never
 * the same radius:
 *
 *   36px → rounded-[9px]    admin/affiliate · admin/bonuses
 *   40px → rounded-[10px]   admin/proposals
 *   40px → rounded-[11px]   auth/register            ← already disagreed with the 40 above
 *   42px → rounded-[11px]   ui/propose-promo
 *   44px → rounded-[11px]   admin/affiliate · admin/bonuses
 *   56px → rounded-control  proposals-state-views (×2)
 *
 * Two of those files argue in a code comment that the radius is "a quarter of the
 * size". That reading is what produced four radii — and DESIGN_AUTHORITY B10.2
 * says the opposite in as many words: *each family has ONE radius*, and "⛔ no
 * one-off `rounded-[…]`; an arbitrary radius is a second definition site."
 *
 * ⭐ SO THE FAMILY TAKES ONE RADIUS: `--r-md` (12px) via `rounded-control`, the
 * rung B10.2 assigns to inputs, stat tiles and ledger containers — i.e. to small
 * boxed containers, which is what a plate is. The 56px sites already use it.
 *
 * ⚠️ AND THAT IS A RENDERED CHANGE on the other six: 9/10/11 → 12px — one to three
 * pixels of radius on a 36-44px box.
 *
 * ⭐ THE DECISION IS TAKEN (2026-08-21): there is NO `radius` prop. This file briefly
 * carried one as a migration bridge, and `test:design-frozen` was right to fail it —
 * an escape hatch on the atom built to END four arbitrary radii is a second definition
 * site with a comment apologising for itself. No call site ever passed it. B10.2 says
 * each family has ONE radius; this family's is `--r-md`.
 */
export function IconPlate({
  size = 40,
  bg,
  fg,
  border,
  className,
  style,
  children,
  ...rest
}: Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> & {
  /** Plate edge in px. The glyph inside is the caller's — it is NOT scaled here. */
  size?: number;
  /** Plate fill. Any CSS background — token, `color-mix`, or a gradient. */
  bg?: string;
  /** Glyph colour. Applied as `color`, so the glyph's `currentColor` picks it up. */
  fg?: string;
  /** Full CSS border shorthand, e.g. `1px solid var(--border)`. */
  border?: string;
}) {
  return (
    <span
      {...rest}
      className={cn(
        // ⚠️ The size is an inline literal, never `h-9 w-9`. `theme.extend.spacing`
        // is OVERRIDDEN (tailwind.config.ts:200-215), so `h-9` renders 64px, not 36.
        // Every one of the eight originals carries this same warning in a comment.
        "grid shrink-0 place-items-center rounded-control",
        className,
      )}
      style={{
        width: size,
        height: size,
        ...(bg === undefined ? null : { background: bg }),
        ...(fg === undefined ? null : { color: fg }),
        ...(border === undefined ? null : { border }),
        ...style,
      }}
    >
      {children}
    </span>
  );
}
