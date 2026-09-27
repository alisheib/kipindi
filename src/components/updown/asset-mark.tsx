/**
 * The asset mark — a round glyph chip carrying which asset this is ("₿", "Au", "Ag"…).
 *
 * ⭐ HOISTED 2026-09-27 (landing v3, R5) out of `updown-card.tsx`, which is a `"use client"` module: the
 * landing's Up & Down band is a server component and must not reach into a client module for a helper.
 * Hook-free and directive-free, so the board card, the round page and the band all render the one mark.
 * `updown-card.tsx` re-exports it, so its existing importers are unchanged.
 *
 * ⛔ ZERO STYLE LITERALS. Every length, radius and ink lives on `.ud-mark` in `globals.css`. The size is
 * the `--mark` custom property: from the caller's class (the band: `.kp-udmatch__mark`), or inline only
 * when a `size` prop is passed (a custom property is not a design literal — design-frozen skips `--*`);
 * with neither, the card's 40px. `data-lg` keeps the card's 14px figure at 44px and up.
 *
 * ⭐ Q5, RESOLVED 2026-08-10: **GOLD IS MONEY, AND NOTHING ELSE.** This chip used to tint itself with
 * `--gold-*` when the asset happened to be gold — spending the product's most meaningful ink on a label.
 * The `Au`/`Ag` lettermarks are FINAL (Ali, 2026-08-10) and there is no artwork coming, so the tint is not
 * temporary and lost on its merits. Identity still shows: a precious metal takes a brighter NEUTRAL
 * metallic chip (`.ud-mark--metal`: lightness and rim weight, never hue).
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The two-character mark for an asset.
 *
 * ⚠️ NOT `ticker.slice(0, 2)` — XAU and XAG both start "XA", so every metal rendered an identical chip
 * and Gold was visually indistinguishable from Silver on the board. These are the real element symbols,
 * which is also what the design spec asked for.
 */
export const ASSET_MARKS: Record<string, string> = {
  gold: "Au", silver: "Ag", platinum: "Pt", copper: "Cu", oil: "Oil", fx: "FX", crypto: "₿",
};

export function markFor(icon: string, ticker: string): string {
  return ASSET_MARKS[icon] ?? ticker.slice(-2).toUpperCase();
}

export function AssetMark({ icon, ticker, size, className }: {
  icon: string;
  ticker: string;
  /** Edge in px. Omit it to take the size from `className` (`--mark`), or the card's 40px. */
  size?: number;
  className?: string;
}) {
  const metal = icon === "gold" || icon === "silver" || icon === "platinum";
  return (
    <span
      aria-hidden
      className={cn("ud-mark", metal && "ud-mark--metal", className)}
      data-lg={size != null && size >= 44 ? "" : undefined}
      style={size != null ? ({ "--mark": `${size}px` } as CSSProperties) : undefined}
    >
      {markFor(icon, ticker)}
    </span>
  );
}
