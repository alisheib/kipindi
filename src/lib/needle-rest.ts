/**
 * THE NEEDLE'S REST, AS GEOMETRY: the pure half of the host's rest logic in `components/layout/needle.tsx`.
 *
 * The host reads the page (the controls, the open floating surfaces and the visible text near the rail) and hands
 * the boxes here; this decides where the parked disc should rest, and what a viewport change does to a disc on its
 * way to a rest. No DOM, no engine import: `test:needle-host` drives it on synthetic boxes and on the vendored engine
 * itself, so every rule below is proved without a browser (`test:needle-rest` proves the same rules on the real page).
 *
 * ⭐ 2026-10-09 · R3-B (round 3 of the Vodacom visual pass: tiles 194 257 265 273 295 296 299 301 304 307 309 310 315
 * 321). Three defects, each measured on the tiles before it was changed:
 *   ① A VIEWPORT CHANGE STRANDED A TARGET. A rest glide aims at an absolute pose (the tuck x of the width it started
 *     at), and so does the engine's own park and a tap's peek. On a resize the engine's `reclamp()` only clamps a
 *     body that is not parked into the travel box; the target stayed. The glide landed on the OLD width's tuck x,
 *     which the engine then saw as "not tucked": clamped to the wall (wholly inside, 295 296 304 307 315) or, after
 *     `nearestEdge` judged it by its centre, parked on the LEFT (299, caught mid-way at x≈241) — and `save()` kept
 *     the left edge for every later page (300–317). `reseat` below re-derives the rest at the new geometry.
 *   ② 0–2 px READ AS TOUCHING. The rest kept 4px from the disc's box, but the parked disc's ink does not stop at its
 *     box: the wake halo glows past it. Measured on the tiles — the aqua tint runs 11px past the box at 390 (254:
 *     x349 to the box at 360, +12 to +28 on green) and to 25px at 1024 (257: from x975, faint). The tiers below
 *     clear the GLOW first, then the rim — and the best of them clears a card's FRAME too: at 360–390 the half-off
 *     rest shows 28–30px of disc past a 16px gutter, so beside a full-width card it lies over the card's right end
 *     (296: borders at x373), which E-400 accepts only when no rest over nothing at all is within reach.
 *   ③ A PANEL WAS NOT A KEEP-OUT AT REST. An open floating surface (the channels panel, 321) was an obstacle to a
 *     thrown disc and nothing to a parked one. The host now hands open surfaces in with the controls, whole.
 */

/** A box in viewport px (the DOMRect fields the rules read). */
export type Box = { left: number; right: number; top: number; bottom: number };
/** The engine's travel box (`NeedleBody.limits()`), the fields read here, with the diameter it was computed for. */
export type Geometry = { minX: number; maxX: number; minY: number; maxY: number; size: number };
export type Pose = { x: number; y: number };

/** = the engine's `CONST.EDGE_MARGIN`: a parked disc keeps this far inside the travel box's top and bottom.
 *  Restated, not imported: the engine is a lazy chunk (needle.tsx loads it on mount) and this module is not.
 *  `test:needle-host` holds the two equal. */
export const EDGE_MARGIN = 14;
/** = the engine's `CONST.SUBSTEP` (it integrates in fixed 1000/120 ms steps) and `CONST.MAX_SUBSTEPS`, restated for
 *  the same reason; `test:needle-host` holds both equal. */
export const ENGINE_SUBSTEP = 1000 / 120;
export const ENGINE_MAX_SUBSTEPS = 6;

/** The peak of the wake halo's breathe — `needle.css`, `@keyframes needle-wake-breathe`, 50%: `scale(1.06)`.
 *  `test:needle-host` reads it out of needle.css. */
export const HALO_BREATHE = 1.06;

/**
 * How far the parked disc's GLOW reaches past the disc's box, in px. The wake halo (`#wake`, needle.css) is a circle
 * `size × (1 + 2·halo)` across, centred on the disc, breathing to `HALO_BREATHE` of that: so it reaches
 * `(HALO_BREATHE·(½ + halo) − ½)·size` past the box. `halo` is `--halo` as a positive fraction (needle.tsx
 * `haloInset()`: 0.14 at a 360 short side, rising to 0.34 from 900). 11.4px at 390 and 25px at 1024 — the two
 * tints measured on tiles 254 and 257. The rim itself is drawn inside the box (r = 48.05 of 100: 1.2px in).
 */
export function glowReach(size: number, halo: number): number {
  return Math.max(0, (HALO_BREATHE * (0.5 + halo) - 0.5) * size);
}

/** Air beyond the glow at the best tier. */
export const GLOW_GAP = 4;
/** What the rim keeps from every control and line of text when the page has no room for the glow: four times the
 *  2px the round-3 readers measured as touching (257 265 273 194 301 309 310), and twice the 4px the rest kept before. */
export const RIM_CLEARANCE = 8;
/** The old 4px — the floor tiers below keep it, so no page rests worse than it did. */
export const FLOOR_CLEARANCE = 4;

/**
 * THE TIERS, BEST FIRST. A rest is taken at the best tier within reach; each one says what it gives up.
 * `pad` is measured from the disc's box (= the rim's ink to 1.2px), in px, on all four sides. Always counted: a
 * control's content (its text, icon or field), a small control (≤ 64px either way) whole, and an open floating
 * surface whole. `frames` adds a big control's WHOLE box (a full-width card's border and padding); `text` adds visible
 * text (a painted badge's whole box) and small media.
 *   0 · NOTHING under the glow, not even a card's frame, and GLOW_GAP of air beyond it  — the rest the design means
 *   1 · every control's content and every line of text clear of the glow by GLOW_GAP     — E-400's card rule: the
 *       tucked half (28–30px visible at 360–390, past a 16px page gutter) may lie over a big card's frame and padding
 *   2 · the rim clears that content and text by RIM_CLEARANCE                           — the glow may wash over it
 *   3 · …by FLOOR_CLEARANCE                                                             — G1's rule, for a dense page
 *   4 · off every control by FLOOR_CLEARANCE, text accepted                             — E-413's floor, unchanged
 * Nothing at any tier within reach: it stays where it is (E-400 ①, as before).
 */
export type RestTier = { readonly name: string; readonly frames: boolean; readonly text: boolean; readonly pad: (glow: number) => number };
export const REST_TIERS: readonly RestTier[] = [
  { name: "nothing under the glow", frames: true, text: true, pad: (glow) => glow + GLOW_GAP },
  { name: "content clear of the glow", frames: false, text: true, pad: (glow) => glow + GLOW_GAP },
  { name: "rim clear of all content", frames: false, text: true, pad: () => RIM_CLEARANCE },
  { name: "4px clear of all content", frames: false, text: true, pad: () => FLOOR_CLEARANCE },
  { name: "off every control", frames: false, text: false, pad: () => FLOOR_CLEARANCE },
];
/** The widest pad any tier asks for — how far the host's census must reach past the disc. */
export const censusPad = (glow: number, tiers: readonly RestTier[] = REST_TIERS) => Math.max(...tiers.map((t) => t.pad(glow)));

export type RestInput = {
  /** The disc's box now, clipped to the viewport. */
  fp: Box;
  /** Controls' content, small controls whole, and every open floating surface whole. */
  controls: readonly Box[];
  /** The whole box of every big control (> 64px both ways): its frame and padding, which only tier 0 counts. */
  frames: readonly Box[];
  /** Visible text (a painted badge's whole box) and small media. */
  text: readonly Box[];
  glow: number;
  /** How far a rest may be from where it is, in px (the host: a third of the viewport). */
  reach: number;
  /** The `y` range a rest may take on the rail. */
  minY: number;
  maxY: number;
  /** The disc's `y` now. */
  y: number;
  /** The tier a rest was already taken at HERE (same y, same scroll), or null. A rest taken at tier k is not
   *  re-decided until the page moves under it or gets worse than k: E-413's rule against a chained glide. */
  accepted: number | null;
};
/** `y` null: stay. `tier`: the tier of the rest it ends at (`tiers.length` = none of them). */
export type RestOutput = { y: number | null; tier: number };

/** `tiers` is a seam for `test:needle-host`, which plants the old rules in memory to show they read a touch as clear. */
export function decideRest(q: RestInput, tiers: readonly RestTier[] = REST_TIERS): RestOutput {
  const hits = (rects: readonly Box[], pad: number, dy: number) => rects.some((r) =>
    r.left < q.fp.right + pad && r.right > q.fp.left - pad
    && r.top < q.fp.bottom + dy + pad && r.bottom > q.fp.top + dy - pad);
  const holds = (t: number, dy: number) => {
    const tier = tiers[t];
    const pad = tier.pad(q.glow);
    return !hits(q.controls, pad, dy) && !(tier.text && hits(q.text, pad, dy)) && !(tier.frames && hits(q.frames, pad, dy));
  };
  let now = tiers.length;
  for (let t = 0; t < tiers.length; t++) if (holds(t, 0)) { now = t; break; }
  if (now === 0) return { y: null, tier: 0 };
  if (q.accepted !== null && now <= q.accepted) return { y: null, tier: now };
  // The nearest rest at the best tier within reach — up before down at the same distance, 2px steps (as E-400 ①).
  for (let t = 0; t < now; t++) {
    for (let d = 2; d <= q.reach; d += 2) {
      for (const sign of [-1, 1]) {
        const y = q.y + sign * d;
        if (y < q.minY || y > q.maxY) continue;
        if (holds(t, y - q.y)) return { y, tier: t };
      }
    }
  }
  return { y: null, tier: now };
}

/** A computed colour that paints nothing: `transparent`, `rgba(…, 0)`, or any colour function whose `/ alpha` is 0.
 *  ⚠️ A trailing 0 alone is not enough: `rgb(0, 0, 0)` is black. */
export function paintsNothing(c: string): boolean {
  if (!c || c === "transparent" || /\/\s*0(?:\.0*)?%?\s*\)$/.test(c)) return true;
  const rgba = /^rgba\(([^)]*)\)$/.exec(c)?.[1].split(",");
  return !!rgba && rgba.length === 4 && /^\s*0(?:\.0*)?\s*$/.test(rgba[3]);
}

/** Whether an element's box HUGS a line of its text — at most 24px taller and 48px wider: a roundel, a pill, a chip,
 *  a badge. When such a box is painted, the text's ink is the box (301 309 310: the 18+ roundel). A card or a
 *  paragraph's own box does not hug its text, so it never stands in for it. */
export function hugs(box: Box, text: Box): boolean {
  return box.bottom - box.top <= text.bottom - text.top + 24 && box.right - box.left <= text.right - text.left + 48;
}

/**
 * ⭐ M7 (2026-10-09) · A REST GLIDE ADVANCES BY WHOLE SUBSTEPS PER DISPLAYED FRAME.
 * The engine integrates in fixed 8.33 ms substeps and carries the remainder in an accumulator, and the host fed it each
 * frame's real interval. At 60 fps that is two substeps a frame ON AVERAGE — but when the accumulator's phase sits on a
 * substep boundary, an interval a few tenths of a millisecond long or short tips one frame to THREE substeps and the
 * next to ONE. At a glide's peak speed (3.34 px a substep for the 158 px glide M7 drove) the step jumps 3.3 → 10.0 px:
 * `test:needle-rest` §1 read a change of step of 6.50 against its 6, beside a max step of 10.03 — exactly three
 * substeps at peak. An even 60 fps stream gives that glide 2.96 at most (the spring's start, and its ≤ 3.6 px landing
 * snap), and the artefact grows with the glide — twice a substep's travel at peak, past 6 px from about 142 px on — so
 * the longer rests R3-B's clearance asks for crossed it where the old 4px rests did not. `test:needle-host` §5 replays
 * both on the engine.
 * So for the HOST'S OWN glide only (a player's throw keeps the engine's real-time stepping, untouched): its first frame
 * is the time base — nothing simulated, the accumulator set to half a substep — and every frame after it advances
 * `round(min(this interval, the last one) / SUBSTEP)` whole substeps: two at 60 fps, one at 120, whatever the jitter.
 * The `min` keeps a single dropped frame from being caught up in one jump; the glide takes a frame longer instead.
 * ⚠️ Cost: where the display's rate is not a multiple of 60 the glide's duration bends (90 Hz: one substep a frame, so
 * a 246 px glide takes 1.11 s instead of 0.83 s) — still smooth, still inside `test:needle-rest`'s 1.5 s.
 */
export type GlideClock = { first: boolean; prev: number };
export const newGlideClock = (): GlideClock => ({ first: true, prev: 1000 / 60 });
/** The engine time to advance for one displayed frame of a rest glide, and (its first frame only) the accumulator. */
export function glideFrame(clock: GlideClock, rawDt: number): { dt: number; acc: number | null } {
  if (clock.first) {
    clock.first = false;
    return { dt: 0, acc: ENGINE_SUBSTEP / 2 };
  }
  const n = Math.min(ENGINE_MAX_SUBSTEPS, Math.max(1, Math.round(Math.min(rawDt, clock.prev) / ENGINE_SUBSTEP)));
  clock.prev = rawDt;
  return { dt: n * ENGINE_SUBSTEP, acc: null };
}

/** The `y` range a parked disc may take on the rail of a travel box (the engine's `parkPose` clamp). */
export function railRange(g: Geometry): { minY: number; maxY: number } {
  const minY = g.minY + EDGE_MARGIN;
  return { minY, maxY: Math.max(minY, g.maxY - EDGE_MARGIN) };
}

export type ReseatInput = {
  /** The geometry the body's pose and target were set in (the last layout), and the one it is in now. */
  before: Geometry;
  after: Geometry;
  edge: string;
  parked: boolean;
  parking: boolean;
  held: boolean;
  moving: boolean;
  /** The pose BEFORE the change (before `setSize` re-centred it). */
  x: number;
  y: number;
  target: Pose | null;
};
export type ReseatOutput = { kind: "keep" } | { kind: "rest"; y: number } | { kind: "aim"; target: Pose; x: number };

/**
 * WHAT A VIEWPORT CHANGE DOES TO A DISC ON ITS WAY TO A REST (① above).
 *  · parked — the engine re-tucks it itself (`setSize`/`reclamp` → `snapPark`): keep.
 *  · held, or flying free — the player's, and physics': keep (the engine clamps a free body into the new box).
 *  · heading for a rest (a rest glide, the engine's park, a tap's peek) or lingering at its peek after a tap:
 *      a HEIGHT-only change (the rail did not move — a phone's URL bar) keeps the move, its end clamped into the
 *      new box, and its x where it was: `aim`. ⚠️ The x matters: `reclamp()` clamps any body that is not parked into
 *      the travel box, and a disc gliding along its rail is OUTSIDE the box on purpose (tucked) — `test:needle-host`
 *      2.4 measured the pop, 30px inward at 390 and back out over half a second, on a height-only change.
 *      A change that moves the rail (a width or a diameter) ends the move AT ITS REST: tucked half off the SAME
 *      edge, at the height it was heading for, centre kept as `setSize` keeps it: `rest`. A peek a resize
 *      interrupts goes home, rather than being re-aimed across a re-laid page.
 * The host asks only when the geometry changed: with none, it does not `reclamp()` at all (a visualViewport scroll
 * would otherwise pop a gliding disc the same way).
 */
export function reseat(q: ReseatInput): ReseatOutput {
  if (q.held || q.parked || (q.edge !== "left" && q.edge !== "right")) return { kind: "keep" };
  const sameRail = q.after.minX === q.before.minX && q.after.maxX === q.before.maxX && q.after.size === q.before.size;
  if (sameRail && q.after.minY === q.before.minY && q.after.maxY === q.before.maxY) return { kind: "keep" };
  const { minY, maxY } = railRange(q.after);
  const clampY = (y: number) => Math.min(maxY, Math.max(minY, y));
  const centred = (y: number) => y + (q.before.size - q.after.size) / 2;
  if (q.parking && q.target) {
    if (sameRail) return { kind: "aim", target: { x: q.target.x, y: clampY(q.target.y) }, x: q.x };
    return { kind: "rest", y: clampY(centred(q.target.y)) };
  }
  // Lingering at its peek (the wake pose of the OLD geometry), waiting out the wake's linger before it parks.
  const peekX = q.edge === "right" ? Math.max(q.before.minX, q.before.maxX - EDGE_MARGIN) : q.before.minX + EDGE_MARGIN;
  if (!sameRail && !q.parking && !q.moving && Math.abs(q.x - peekX) < 1.5) return { kind: "rest", y: clampY(centred(q.y)) };
  return { kind: "keep" };
}
