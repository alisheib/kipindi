/**
 * 50pick brand mark — the ONE definition (audit C11).
 *
 * Both the React component (`src/components/brand.tsx` → FiftyMark) and the
 * asset generator (`scripts/build-brand-assets.mts`) source the mark geometry
 * and colours from here, so the in-app mark and the exported SVG/PNG assets can
 * never drift apart again (which is how the PWA icon + every email ended up
 * shipping the superseded round-1 logo).
 *
 * The mark ("mark-a", delivered 2026-07-09): a circle split YES-emerald LEFT ·
 * NO-rose RIGHT by a diagonal chord, the gilt NEEDLE riding the seam past the
 * rim, over a gilt hub with a navy pivot. No ring, no numerals. Ali restored
 * the delivered gold centre as a signature of the 50pick mark on 2026-10-20.
 */

export const MARK = {
  green: "#1EA362",
  red: "#B03A3E",
  gold: "#E3BC66",
  pivot: "#1A2140",
  whiteInk: "#F7F8FC",
  darkInk: "#1A2140",
  greenPath: "M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z",
  redPath: "M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z",
  n: { x1: 38.39, y1: 3.43, x2: 61.61, y2: 96.57 },
} as const;

/** Deep-royal tile background for opaque app icons (matches FiftyTile's
 *  oklch(19% 0.14 268), expressed as a hex so SVG rasterisers accept it). */
export const TILE_BG = "#0A0B50";

export type FiftyMarkVariant = "color" | "white" | "dark";

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The four resolved colours for a given variant. `simple` drops the pivot dot. */
export function markColors(variant: FiftyMarkVariant, simple: boolean) {
  const mono = variant !== "color";
  const ink = variant === "white" ? MARK.whiteInk : MARK.darkInk;
  return {
    green: mono ? hexA(ink, variant === "white" ? 0.3 : 0.26) : MARK.green,
    red: mono ? hexA(ink, variant === "white" ? 0.14 : 0.11) : MARK.red,
    needle: mono ? ink : MARK.gold,
    hub: mono ? ink : MARK.gold,
    pivot: !simple && !mono ? MARK.pivot : null,
  };
}

/** Inner SVG elements of the mark, in the 0..100 viewBox. Shared by the flat
 *  SVG export and the tile/maskable compositions. */
export function markInnerSvg(variant: FiftyMarkVariant, simple: boolean): string {
  const c = markColors(variant, simple);
  return [
    `<path d="${MARK.greenPath}" fill="${c.green}"/>`,
    `<path d="${MARK.redPath}" fill="${c.red}"/>`,
    `<line x1="${MARK.n.x1}" y1="${MARK.n.y1}" x2="${MARK.n.x2}" y2="${MARK.n.y2}" stroke="${c.needle}" stroke-width="${simple ? 5 : 3.5}" stroke-linecap="round"/>`,
    `<circle cx="50" cy="50" r="${simple ? 6 : 5}" fill="${c.hub}"/>`,
    c.pivot ? `<circle cx="50" cy="50" r="1.7" fill="${c.pivot}"/>` : "",
  ]
    .filter(Boolean)
    .join("\n  ");
}

/** A standalone flat SVG of the mark (transparent background). */
export function markSvg(opts: { variant?: FiftyMarkVariant; simplified?: boolean } = {}): string {
  const variant = opts.variant ?? "color";
  const simple = opts.simplified ?? false;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="50pick">
  ${markInnerSvg(variant, simple)}
</svg>`;
}

/** The shipped wordmark lockups, with their mark taken from this same source. */
export function lockupSvg(layout: "horizontal" | "stacked"): string {
  const wide = layout === "horizontal";
  const viewBox = wide ? "0 0 292 64" : "0 0 220 178";
  const transform = wide ? "translate(4,4) scale(0.56)" : "translate(62,4) scale(0.96)";
  const text = wide
    ? '<text x="77" y="48" font-family="Sora, ui-sans-serif, sans-serif" font-weight="700" font-size="46" letter-spacing="-0.025em" fill="#F7F8FC">50pick<tspan dx="4" font-family="&#39;JetBrains Mono&#39;, ui-monospace, monospace" font-weight="500" font-size="24" fill="#F7F8FC" fill-opacity="0.62" letter-spacing="0">.tz</tspan></text>'
    : '<text x="110" y="158" text-anchor="middle" font-family="Sora, ui-sans-serif, sans-serif" font-weight="700" font-size="38" letter-spacing="-0.025em" fill="#F7F8FC">50pick<tspan dx="3" font-family="&#39;JetBrains Mono&#39;, ui-monospace, monospace" font-weight="500" font-size="20" fill="#F7F8FC" fill-opacity="0.62" letter-spacing="0">.tz</tspan></text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <g transform="${transform}">
  ${markInnerSvg("color", false)}
  </g>
  ${text}
</svg>`;
}

/** Full-bleed royal square with the colour mark centred at ~60% — the Android
 *  maskable safe zone. */
export function maskableSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${TILE_BG}"/>
  <g transform="translate(20 20) scale(0.6)">
  ${markInnerSvg("color", false)}
  </g>
</svg>`;
}

/** Rounded royal tile with the colour mark centred at ~72% — installed-app icon. */
export function tileSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22.5" fill="${TILE_BG}"/>
  <g transform="translate(14 14) scale(0.72)">
  ${markInnerSvg("color", false)}
  </g>
</svg>`;
}
