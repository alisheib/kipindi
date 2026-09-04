"use client";

/**
 * The token → canvas ink bridge — ONE implementation for every chart that
 * renders through the lightweight-charts engine (the terminal, the market
 * curve). Extracted from terminal-chart.tsx when the market curve became the
 * second consumer (CHART-SPRINT-2 final; a second private copy of this bridge
 * is exactly the drift §B12 exists to prevent).
 *
 * ⚠️ WHY A CANVAS READBACK: the platform's tokens are oklch() and the engine's
 * color parser THROWS on them (executed proof in the adversarial review). Each
 * token is painted through a 1×1 canvas — the same engine that renders the
 * chart — and read back as sRGB bytes; alpha variants are computed numerically
 * so no color-mix() string ever reaches a canvas gradient.
 *
 * ⚠️ THE TWO-SENTINEL PROBE: a token that is EMPTY or PRESENT-BUT-UNPARSEABLE
 * paints transparent and console.errors its own name — an invisible series is
 * the honest face of a token typo, and the screenshot pass sees it. Painting
 * the sentinel's own black silently was the checks-that-lie class.
 *
 * The tokens keep their single definition site (globals.css).
 */

export function makeInkResolver(): (name: string, alpha?: number) => string {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (canvas) { canvas.width = 1; canvas.height = 1; }
  const ctx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
  const cache = new Map<string, [number, number, number, number]>();
  return (name: string, alpha?: number) => {
    if (!ctx) return "rgba(0,0,0,0)";
    let rgba = cache.get(name);
    if (!rgba) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const probe = (sentinel: string): [number, number, number, number] => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = sentinel;
        ctx.fillStyle = raw || sentinel;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const overBlack = probe("#000");
      const overWhite = probe("#fff");
      const parsed = !(overBlack[0] === 0 && overBlack[1] === 0 && overBlack[2] === 0
        && overWhite[0] === 255 && overWhite[1] === 255 && overWhite[2] === 255);
      rgba = overBlack;
      if (!raw || !parsed) {
        console.error(`[chart-ink] token ${name} ${raw ? "did not parse" : "is empty"} — painting transparent`);
        rgba = [0, 0, 0, 0];
      }
      cache.set(name, rgba);
    }
    const a = alpha != null ? rgba[3] * alpha : rgba[3];
    return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${a.toFixed(3)})`;
  };
}

/** Non-color token read (font family, type-ladder rungs for canvas numbers). */
export function tokRaw(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
