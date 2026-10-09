/**
 * THE OLD BET DIAL'S SCALE — which detents carry a figure, and at what size (the visual pass, round 4, helper R4-I,
 * 2026-10-09; edges E18 · E53, tiles 034 038 042 067 071 075 100 104 108).
 *
 * 🔴 WHAT THE TILES SHOWED. Every detent from 2K to 500K was labelled, at `fontSize="7.5"` in an SVG whose viewBox is
 * the track plus 40 units each side, drawn into the track's own width — so the type rendered at 7.5 × width/(width + 80):
 * 5.8px on a 360 phone, 5.9px at 1280. On the sqrt scale the inner detents crowd the centre: "100K" and "50K" stood 11
 * units apart with labels 18 units wide (overlapping), and everything inside 250K sat under the resting thumb. At 55%
 * opacity in the muted ink they read at about 1.4:1.
 * ⭐ NOW: a label is drawn at 10px RENDERED (the micro rung — its viewBox size is 10 ÷ the scale), in the subtle ink at
 * full strength, and only where it can be read: clear of the resting thumb and its ring (|x − centre| − half its width ≥
 * knobR + 6 + 4), and clear of the label drawn outside it (walking in from the edge, a 6px rendered gap). The edge — the
 * maximum stake — is labelled too when it fits in the viewBox's margin. Every detent keeps its TICK, labelled or not, so
 * the scale's shape is unchanged; what goes is only the figures that could not be read. On a wider panel more of them fit.
 * ⛔ The figure grammar is unchanged (S-14): %-exact, uppercase K and M — a label names a stake the player can select.
 * Pure, so `test:visual-pass-r4i` drives the very selection the dial draws.
 */

/** The rendered size of a scale figure: the micro rung, 10px. */
export const DIAL_LABEL_PX = 10;
/** JetBrains Mono's advance (0.6em) plus the label's 0.04em tracking. */
const LABEL_EM = 0.64;
/** Rendered gap kept between two figures. */
const LABEL_GAP_PX = 6;

/** A detent's figure: %-exact, uppercase K / M (S-14). */
export function dialTickLabel(tzs: number): string {
  return tzs >= 1_000_000
    ? `${tzs % 1_000_000 === 0 ? tzs / 1_000_000 : (tzs / 1_000_000).toFixed(1)}M`
    : tzs >= 1_000
      ? `${tzs % 1_000 === 0 ? tzs / 1_000 : (tzs / 1_000).toFixed(1)}K`
      : String(tzs);
}

/** The detents — derived from the live [baseStake, maxStake] (admin-tunable), the max edge always the last. */
export function dialDetents(baseStake: number, maxMultiplier: number): number[] {
  const nice = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const set = nice.map((k) => k * baseStake).filter((t) => t >= baseStake && t <= baseStake * maxMultiplier);
  const edge = Math.round(baseStake * maxMultiplier);
  if (!set.includes(edge)) set.push(edge);
  return set;
}

export type DialTick = {
  tzs: number;
  side: "YES" | "NO";
  /** x inside the track group (0 … width), in viewBox units. */
  x: number;
  isEdge: boolean;
  /** The figure drawn over the tick, or null where it could not be read. */
  label: string | null;
};

/**
 * Every tick of the scale, each with its figure or none, and the figures' size in viewBox units.
 * @param width the track's width in px — also its width in viewBox units (the SVG is `width + 2·pad` wide).
 */
export function dialScale(o: { width: number; pad: number; knobR: number; baseStake: number; maxMultiplier: number }): { ticks: DialTick[]; fontSize: number } {
  const { width, pad, knobR, baseStake, maxMultiplier } = o;
  const scale = width > 0 ? width / (width + 2 * pad) : 1;
  const fontSize = DIAL_LABEL_PX / scale;
  const gap = LABEL_GAP_PX / scale;
  const half = (s: string) => (s.length * LABEL_EM * fontSize) / 2;
  const edgeTzs = Math.round(baseStake * maxMultiplier);
  // The resting thumb: centred on the track, its breathing ring knobR + 6, and 4 units of air.
  const thumbClear = knobR + 6 + 4;
  const detents = dialDetents(baseStake, maxMultiplier);
  const ticks: DialTick[] = [];
  for (const side of ["YES", "NO"] as const) {
    // Walk from the edge inward, so the outermost figures win a contest for room.
    const outward = [...detents].sort((a, b) => b - a);
    let lastX: number | null = null;
    let lastHalf = 0;
    for (const tzs of outward) {
      const m = tzs / baseStake;
      const dist = Math.sqrt(Math.max(0, (m - 1) / Math.max(1e-9, maxMultiplier - 1)));
      const x = side === "YES" ? (0.5 - 0.5 * dist) * width : (0.5 + 0.5 * dist) * width;
      const isEdge = tzs === edgeTzs;
      const text = dialTickLabel(tzs);
      const h = half(text);
      const fromCentre = Math.abs(x - width / 2);
      const clearOfThumb = fromCentre - h >= thumbClear;
      const insideView = x - h >= -pad && x + h <= width + pad;
      const clearOfNeighbour = lastX === null || Math.abs(x - lastX) >= h + lastHalf + gap;
      const label = tzs > baseStake && clearOfThumb && insideView && clearOfNeighbour ? text : null;
      if (label) { lastX = x; lastHalf = h; }
      ticks.push({ tzs, side, x, isEdge, label });
    }
  }
  return { ticks, fontSize };
}
