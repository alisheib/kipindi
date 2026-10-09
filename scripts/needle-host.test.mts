/**
 * needle-host — THE NEEDLE'S REST RULES, PROVED WITHOUT A BROWSER (R3-B, the Vodacom visual pass, round 3).
 *
 *   npx tsx scripts/needle-host.test.mts      (npm run test:needle-host)
 *
 * The host in `components/layout/needle.tsx` reads the page and hands boxes to `lib/needle-rest.ts`, which decides
 * where the parked disc rests and what a viewport change does to a disc on its way to a rest. This suite drives that
 * module on synthetic boxes, and its viewport rule on the VENDORED ENGINE ITSELF, replaying the capture drive that made
 * round 3's tiles — so each rule is shown to fix the defect the tiles measured, and each section carries a PLANT: the
 * rule taken away in memory, run on the same input, must show the defect again. A section whose plant cannot fail
 * proves nothing. `test:needle-rest` proves the same rules on the real page, in a browser.
 *
 *   §1 the module's constants agree with the files they restate (the engine, needle.css, the host's halo).
 *   §2 ① A VIEWPORT CHANGE RE-SEATS A DISC ON ITS WAY TO A REST — tiles 295 296 299 304 307 315.
 *   §3 ② THE CLEARANCE TIERS — tiles 194 257 265 273 296 301 309 310; ③ AN OPEN SURFACE IS A KEEP-OUT — tile 321.
 *   §4 the host wires the rules in (source, comments stripped): the census, the triggers, the probe.
 *   §5 M7 · A REST GLIDE'S FRAMES — `test:needle-rest` §1's change-of-step measure, replayed on the engine under real
 *      frame timing (50–144 Hz, jitter, a dropped frame): the host before M7 is the plant.
 *   §6 R4-B ④ THE CHAT BUBBLE IS A KEEP-OUT AT EVERY TIER, SHOWN OR FADED — tile 313 (the bubble drawn over the disc),
 *      314 and 315 (rests that cleared its box, not its ring): the tiles' own rests replayed, the bubble dropped from
 *      the obstacle set as the plant, and the host's census of it read from source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { NeedleBody, CONST } from "../src/lib/needle-physics.js";
import {
  EDGE_MARGIN, ENGINE_MAX_SUBSTEPS, ENGINE_SUBSTEP, HALO_BREATHE, GLOW_GAP, RIM_CLEARANCE, FLOOR_CLEARANCE, REST_TIERS,
  BUBBLE_RING_BREATHE, BUBBLE_RING_OUTSET,
  abovePad, bubbleInk, censusPad, decideRest, glideFrame, glowReach, hugs, newGlideClock, paintsNothing, railRange, reseat, restReach,
  type Box, type Geometry, type RestInput, type RestTier,
} from "../src/lib/needle-rest.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const rd = (p: string) => readFileSync(join(ROOT, p), "utf8");
/** Comments blanked (block comments that start at a boundary, and line comments), as `test:stacking` reads code. */
// Source is read through the shared scanner (scripts/lib/decomment.mts): every newline survives, so nothing that
// reads a line moves, and test:decomment's private-stripper ratchet stays where it was.
const code = decomment;

let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

// ── The host's own geometry, restated (needle.tsx `diameter`, `haloInset`; §1 holds the source to these) ─────────────
const diameter = (w: number, h: number) => Math.round(Math.min(64, Math.max(56, Math.min(w, h) * 0.155)));
const haloFraction = (w: number, h: number) => {
  const t = Math.min(1, Math.max(0, (Math.min(w, h) - 360) / (900 - 360)));
  return (14 + t * 20) / 100;
};
/** The capture drive's viewports (qa-journey-shell.mjs `viewport`). */
const vh = (w: number) => (w < 1024 ? 780 : 900);

console.log("\n§1 · the module's constants agree with the files they restate");
{
  ok("1.1 EDGE_MARGIN is the engine's CONST.EDGE_MARGIN", EDGE_MARGIN === CONST.EDGE_MARGIN, `${EDGE_MARGIN} vs ${CONST.EDGE_MARGIN}`);
  ok("1.1b ENGINE_SUBSTEP and ENGINE_MAX_SUBSTEPS are the engine's CONST.SUBSTEP and CONST.MAX_SUBSTEPS",
    ENGINE_SUBSTEP === CONST.SUBSTEP && ENGINE_MAX_SUBSTEPS === CONST.MAX_SUBSTEPS,
    `${ENGINE_SUBSTEP} / ${CONST.SUBSTEP} · ${ENGINE_MAX_SUBSTEPS} / ${CONST.MAX_SUBSTEPS}`);
  const css = rd("src/components/layout/needle.css");
  const breathe = /@keyframes needle-wake-breathe \{[\s\S]*?50%[^}]*scale\(([\d.]+)\)/.exec(css);
  ok("1.2 HALO_BREATHE is the peak of needle.css's `needle-wake-breathe` (its 50% scale)",
    !!breathe && Number(breathe[1]) === HALO_BREATHE, breathe ? `css ${breathe[1]} vs ${HALO_BREATHE}` : "keyframe not found");
  const host = code(rd("src/components/layout/needle.tsx"));
  ok("1.3 the host's halo and diameter are the ones restated here",
    host.includes("const t = clampN((Math.min(v.w, v.h) - 360) / (900 - 360), 0, 1);") && host.includes("return -(14 + t * 20).toFixed(1);")
    && host.includes("return Math.round(clampN(Math.min(v.w, v.h) * 0.155, 56, 64));"));
  // The glow, against the tiles: the aqua tint measured past the disc's box.
  const g390 = glowReach(diameter(390, 780), haloFraction(390, 780));
  const g1024 = glowReach(diameter(1024, 900), haloFraction(1024, 900));
  ok("1.4 the glow reaches 11.4px past the box at 390 — tile 254 measured the tint from x349 to the box at x360 (11px)",
    Math.abs(g390 - 11.4) < 0.15, g390.toFixed(2));
  ok("1.5 …and 25px at 1024 — tile 257 measured the faint tint from x975/976 at 18px under the centre (the halo's circle there: 24.7px out)",
    Math.abs(g1024 - 25) < 0.1, g1024.toFixed(2));
  ok("1.6 the tiers are the documented five, best first, and the census reaches the widest pad",
    REST_TIERS.length === 5
    && REST_TIERS[0].pad(10) === 10 + GLOW_GAP && REST_TIERS[0].frames && REST_TIERS[0].text
    && REST_TIERS[1].pad(10) === 10 + GLOW_GAP && !REST_TIERS[1].frames && REST_TIERS[1].text
    && REST_TIERS[2].pad(10) === RIM_CLEARANCE && !REST_TIERS[2].frames && REST_TIERS[2].text
    && REST_TIERS[3].pad(10) === FLOOR_CLEARANCE && !REST_TIERS[3].frames && REST_TIERS[3].text
    && REST_TIERS[4].pad(10) === FLOOR_CLEARANCE && !REST_TIERS[4].frames && !REST_TIERS[4].text
    && censusPad(g1024) === g1024 + GLOW_GAP && censusPad(1) === RIM_CLEARANCE);
}

// ── §2 · the engine, driven the way the host drives it ─────────────────────────────────────────────────────────────────
type Frame = { x: number; y: number; cx: number; size: number; parked: boolean; parking: boolean; edge: string; w: number };
type Body = InstanceType<typeof NeedleBody>;
const DT = 1000 / 60;
const NO_INS = { top: 0, right: 0, bottom: 0, left: 0 };
const geometryOf = (b: Body): Geometry => { const L = b.limits(); return { minX: L.minX, maxX: L.maxX, minY: L.minY, maxY: L.maxY, size: b.size }; };

/** The host's rest half, minus the DOM: one body, its glide, and `applyViewport` with or without the reseat. */
class HostSim {
  vp: { w: number; h: number };
  b: Body;
  gliding = false;
  laidOut: Geometry;
  frames: Frame[] = [];
  constructor(w: number, h: number, edge: "left" | "right", y: number, readonly withReseat: boolean) {
    this.vp = { w, h };
    this.b = new NeedleBody({
      size: diameter(w, h),
      bounds: () => ({ w: this.vp.w, h: this.vp.h, insets: NO_INS }),
      onPark: () => { this.gliding = false; },
    });
    // The host's side-rail override (needle.tsx `body.nearestEdge`).
    this.b.nearestEdge = () => { const L = this.b.limits(); return (this.b.cx - L.minX) <= ((L.maxX + this.b.size) - this.b.cx) ? "left" : "right"; };
    this.b.y = y;
    this.b.snapPark(edge);
    this.laidOut = geometryOf(this.b);
  }
  /** settleClear's glide: the engine's own park spring, aimed at the same x. */
  glideTo(y: number) { this.gliding = true; this.b.parked = false; this.b.parking = true; this.b.target = { x: this.b.x, y }; }
  /** A tap on the parked disc (needle.tsx `release`: `body.wake(true)`). */
  tap() { this.b.wake(true); }
  /** needle.tsx `applyViewport`, with the R3-B reseat or (the PLANT) without it — what the host did before: an
   *  unconditional `reclamp()` and nothing else. */
  resize(w: number, h: number) {
    const before = this.laidOut;
    const x0 = this.b.x, y0 = this.b.y;
    this.vp = { w, h };
    const d = diameter(w, h);
    if (d !== this.b.size) this.b.setSize(d);
    const after = geometryOf(this.b);
    if (!this.withReseat) this.b.reclamp();
    else {
      const changed = before.minX !== after.minX || before.maxX !== after.maxX || before.minY !== after.minY
        || before.maxY !== after.maxY || before.size !== after.size;
      if (changed) {
        this.b.reclamp();
        const r = reseat({ before, after, edge: this.b.edge, parked: this.b.parked, parking: this.b.parking, held: !!this.b.held,
          moving: this.b.moving, x: x0, y: y0, target: this.b.target });
        if (r.kind === "rest") { this.b.y = r.y; this.b.snapPark(this.b.edge); this.gliding = false; }
        else if (r.kind === "aim") { this.b.x = r.x; this.b.target = r.target; }
      }
    }
    this.laidOut = after;
    this.frames = [];
  }
  run(n: number) {
    for (let i = 0; i < n; i++) {
      this.b.advance(DT);
      const b = this.b;
      this.frames.push({ x: b.x, y: b.y, cx: b.cx, size: b.size, parked: b.parked, parking: b.parking, edge: b.edge, w: this.vp.w });
    }
  }
  /** Until the engine sleeps (a wake's linger is 2.6 s, then the park). */
  settle() { for (let i = 0; i < 900; i++) { this.run(1); if (!this.b.awake) break; } }
}
/** Tucked half off its edge: the centre ON the viewport's edge. */
const halfOff = (f: Frame) => (f.edge === "right" ? Math.abs(f.cx - f.w) < 0.5 : Math.abs(f.cx) < 0.5);
const offRail = (fs: Frame[]) => fs.filter((f) => !halfOff(f));
const wholly = (fs: Frame[]) => fs.filter((f) => f.x >= -0.5 && f.x + f.size <= f.w + 0.5);
const describe = (f: Frame | undefined) => (f ? `x=${f.x.toFixed(1)} cx=${f.cx.toFixed(1)} of ${f.w}, edge ${f.edge}, parked ${f.parked}` : "none");

console.log("\n§2 · ① a viewport change re-seats a disc on its way to a rest (the capture drive's resizes, on the engine)");
{
  // 2.1 · tile 295. The staff hub at 320 (294), a glide in flight to the staff card's clear height, then 360.
  const case295 = (withReseat: boolean) => {
    const s = new HostSim(320, vh(320), "right", 376, withReseat);
    s.glideTo(455); s.run(8);
    s.resize(360, vh(360)); s.settle();
    return s;
  };
  const fixed295 = case295(true), old295 = case295(false);
  ok("2.1 295 · a glide in flight at 320 → 360: from the resize on, every frame is tucked half off the RIGHT edge at 360 (cx = 360), never wholly inside",
    offRail(fixed295.frames).length === 0 && fixed295.b.parked && fixed295.b.edge === "right",
    `${fixed295.frames.length} frames; first off the rail: ${describe(offRail(fixed295.frames)[0])}`);
  ok("2.1 PLANT · without the reseat (the host before R3-B) the same drive puts the disc wholly inside at the 320 tuck x — the x≈293 tile 295 measured",
    wholly(old295.frames).some((f) => Math.abs(f.x - 292) < 1.5), `first wholly inside: ${describe(wholly(old295.frames)[0])}`);

  // 2.2 · tiles 299 → 300–317. 390 → 1024 with a glide in flight.
  const case299 = (withReseat: boolean) => {
    const s = new HostSim(390, vh(390), "right", 455, withReseat);
    s.glideTo(504); s.run(8);
    s.resize(1024, vh(1024)); s.settle();
    return s;
  };
  const fixed299 = case299(true), old299 = case299(false);
  ok("2.2 299 · a glide in flight at 390 → 1024: every frame tucked half off the RIGHT edge at 1024, and it rests there",
    offRail(fixed299.frames).length === 0 && fixed299.b.parked && fixed299.b.edge === "right",
    `rest: ${describe(fixed299.frames.at(-1))}`);
  ok("2.2 PLANT · without the reseat it crosses mid-page and parks on the LEFT — tile 299's x≈241 on the way, and the left edge every later tile kept",
    old299.b.edge === "left" && old299.frames.some((f) => f.x > 100 && f.x < 800), `ended ${describe(old299.frames.at(-1))}`);

  // 2.3 · tiles 304 307 315: on the LEFT rail (a player's throw put it there), the same resize.
  const caseLeft = (withReseat: boolean) => {
    const s = new HostSim(390, vh(390), "left", 437, withReseat);
    s.glideTo(500); s.run(8);
    s.resize(1024, vh(1024)); s.settle();
    return s;
  };
  const fixedLeft = caseLeft(true), oldLeft = caseLeft(false);
  ok("2.3 304 307 · on the left rail, a glide in flight at 390 → 1024: every frame tucked half off the LEFT edge, never at the wall",
    offRail(fixedLeft.frames).length === 0 && fixedLeft.b.parked && fixedLeft.b.edge === "left", `rest: ${describe(fixedLeft.frames.at(-1))}`);
  ok("2.3 PLANT · without the reseat it sits wholly inside at the left wall, x = 0 — the x≈0 tiles 304 and 307 measured",
    wholly(oldLeft.frames).some((f) => Math.abs(f.x) < 0.5), `first wholly inside: ${describe(wholly(oldLeft.frames)[0])}`);

  // 2.4 · a height-only change mid-glide (a phone's URL bar): the glide goes on, its end kept in the box.
  const caseBar = (withReseat: boolean) => {
    const s = new HostSim(390, 780, "right", 600, withReseat);
    s.glideTo(700); s.run(6);
    const y0 = s.b.y;
    s.resize(390, 700); s.settle();
    return { s, y0 };
  };
  const bar = caseBar(true), oldBar = caseBar(false);
  const steps = bar.s.frames.slice(1).map((f, i) => Math.abs(f.y - bar.s.frames[i].y));
  const railMax = railRange(geometryOf(bar.s.b)).maxY;
  ok("2.4 a height-only change mid-glide does not snap: the glide goes on (no frame steps over 24px, x never moves) and ends tucked at the box's lowest rest",
    Math.max(...steps) <= 24 && offRail(bar.s.frames).length === 0 && bar.s.b.parked && Math.abs(bar.s.b.y - railMax) < 0.5,
    `from y=${bar.y0.toFixed(1)}: max step ${Math.max(...steps).toFixed(1)}px, rest y=${bar.s.b.y.toFixed(1)} (rail max ${railMax})`);
  ok("2.4 PLANT · without the reseat the disc pops 30px into the box (reclamp: x = 330, wholly inside) and the glide runs on past the new viewport's bottom",
    Math.abs(oldBar.s.frames[0].x - 330) < 1.5 && oldBar.s.frames.some((f) => f.y + f.size > 700 + 0.5),
    `first x ${oldBar.s.frames[0].x.toFixed(1)}, lowest box bottom ${Math.max(...oldBar.s.frames.map((f) => f.y + f.size)).toFixed(1)} in 700`);

  // 2.5 · a tap's peek interrupted by a width change goes home, on its own edge.
  const casePeek = (withReseat: boolean, landFirst: boolean) => {
    const s = new HostSim(390, vh(390), "right", 455, withReseat);
    s.tap(); s.run(landFirst ? 90 : 8);
    s.resize(1024, vh(1024)); s.settle();
    return s;
  };
  const peek = casePeek(true, false), oldPeek = casePeek(false, false);
  ok("2.5 a peek (a tap) cut by 390 → 1024 goes home: tucked half off the RIGHT edge on every frame after",
    offRail(peek.frames).length === 0 && peek.b.parked && peek.b.edge === "right", `rest: ${describe(peek.frames.at(-1))}`);
  ok("2.5 PLANT · without the reseat the peek lands mid-page at the 390 peek x and parks LEFT",
    oldPeek.b.edge === "left", `ended ${describe(oldPeek.frames.at(-1))}`);
  const linger = casePeek(true, true), oldLinger = casePeek(false, true);
  ok("2.6 lingering at the peek (landed, waiting out the 2.6 s linger) when 390 → 1024 comes: home on the RIGHT, every frame",
    offRail(linger.frames).length === 0 && linger.b.parked && linger.b.edge === "right", `rest: ${describe(linger.frames.at(-1))}`);
  ok("2.6 PLANT · without the reseat it waits mid-page and parks LEFT", oldLinger.b.edge === "left", `ended ${describe(oldLinger.frames.at(-1))}`);

  // 2.7 · CONTROLS: what is not on its way to a rest is left to the engine.
  const g = (w: number, size: number): Geometry => ({ minX: 0, maxX: w - size, minY: 0, maxY: 780 - size, size });
  const base = { before: g(390, 60), after: g(1024, 64), edge: "right", x: 360, y: 400, target: null };
  ok("2.7 CONTROL · a parked disc, a held one, a flying one and a still one mid-screen are kept (the engine re-tucks, the player and physics own the rest)",
    reseat({ ...base, parked: true, parking: false, held: false, moving: false }).kind === "keep"
    && reseat({ ...base, parked: false, parking: false, held: true, moving: false }).kind === "keep"
    && reseat({ ...base, parked: false, parking: false, held: false, moving: true, x: 200 }).kind === "keep"
    && reseat({ ...base, parked: false, parking: false, held: false, moving: false, x: 200 }).kind === "keep"
    && reseat({ ...base, after: base.before, parked: false, parking: true, held: false, moving: false, target: { x: 360, y: 300 } }).kind === "keep");
  const parked = new HostSim(390, vh(390), "right", 300, true);
  parked.resize(1024, vh(1024)); parked.run(30);
  ok("2.7 CONTROL · a disc at rest through 390 → 1024 is tucked half off the right edge by the engine itself",
    offRail(parked.frames).length === 0 && parked.b.edge === "right");

  // 2.8 · a viewport event that changes nothing (a visualViewport scroll, a repeated resize) mid-glide.
  const same = (withReseat: boolean) => {
    const s = new HostSim(390, vh(390), "right", 300, withReseat);
    s.glideTo(380); s.run(6);
    s.resize(390, vh(390)); s.run(6);
    return s;
  };
  ok("2.8 a viewport event that changes nothing leaves a glide on its rail: no reclamp, every frame half off the right edge",
    offRail(same(true).frames).length === 0, describe(offRail(same(true).frames)[0]));
  ok("2.8 PLANT · the old unconditional reclamp pulls the gliding disc into the box — wholly inside at the wall, x = 330",
    wholly(same(false).frames).some((f) => Math.abs(f.x - 330) < 1.5), describe(same(false).frames[0]));
}

// ── §3 · the tiers, on boxes ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · ② the clearance tiers and ③ open surfaces, on the boxes the host would hand in (390 × 780, right rail)");
{
  const SIZE = diameter(390, 780);                       // 60
  const GLOW = glowReach(SIZE, haloFraction(390, 780));  // 11.4
  const fpAt = (y: number): Box => ({ left: 390 - SIZE / 2, right: 390, top: y, bottom: y + SIZE });
  const { minY, maxY } = railRange({ minX: 0, maxX: 390 - SIZE, minY: 0, maxY: 780 - SIZE, size: SIZE });
  const q = (y: number, controls: Box[], text: Box[], accepted: number | null = null, frames: Box[] = []): RestInput =>
    ({ fp: fpAt(y), controls, frames, text, above: [], glow: GLOW, reach: 780 / 3, minY, maxY, y, accepted });
  /** The gap from the disc's box at `y` to a box, along the axis that separates them (negative = they overlap). */
  const gap = (y: number, r: Box) => {
    const f = fpAt(y);
    return Math.max(r.left - f.right, f.left - r.right, r.top - f.bottom, f.top - r.bottom);
  };
  const box = (left: number, right: number, top: number, bottom: number): Box => ({ left, right, top, bottom });

  // 3.1 · 257 265 273: a pill whose right end is 2px from the disc's box.
  const pill = box(250, 358, 300, 344);
  const r1 = decideRest(q(290, [pill], []));
  ok("3.1 257 · a control 2px from the disc moves it, to the nearest rest clear of the GLOW by 4px (tier 0)",
    r1.y !== null && r1.tier === 0 && gap(r1.y, pill) >= GLOW + GLOW_GAP, `rest y=${r1.y} tier ${r1.tier}, gap ${r1.y === null ? "-" : gap(r1.y, pill).toFixed(1)}`);
  const OLD: RestTier[] = [{ name: "the old 4px", frames: false, text: true, pad: () => 4 }, { name: "the old floor", frames: false, text: false, pad: () => 4 }];
  const pill6 = box(250, 354, 300, 344);
  ok("3.1 PLANT · the pre-R3-B rule (4px from the box) reads a 6px gap as clear and leaves the disc there; the tiers move it",
    decideRest(q(290, [pill6], []), OLD).y === null && decideRest(q(290, [pill6], [])).y !== null);
  ok("3.1 PLANT · and with no clearance at all, the 2px pill reads as clear — the clearance is what sees a touch",
    decideRest(q(290, [pill], []), [{ name: "the box only", frames: false, text: true, pad: () => 0 }]).y === null);

  // 3.2 · CONTROL: clear of the glow by its 4px → it stays.
  const far = box(250, 390 - SIZE / 2 - GLOW - GLOW_GAP - 0.5, 300, 344);
  const r2 = decideRest(q(290, [far], []));
  ok("3.2 CONTROL · a control clear of the glow by 4px leaves the disc where it is", r2.y === null && r2.tier === 0, JSON.stringify(r2));

  // 3.3 · 194: the /markets stat line's last glyph 1px from the ring.
  const stat = box(200, 359, 305, 319);
  const r3 = decideRest(q(290, [], [stat]));
  ok("3.3 194 · a line of text 1px from the disc moves it clear of the glow (text counts at tiers 0–3)",
    r3.y !== null && r3.tier === 0 && gap(r3.y, stat) >= GLOW + GLOW_GAP, `rest y=${r3.y}`);

  // 3.4 · a page too dense for the glow: lines every 90px leave 76px gaps — room for the rim's 8px, not the glow's 15.4.
  const lines = Array.from({ length: 9 }, (_, i) => box(300, 359, 20 + 90 * i, 34 + 90 * i));
  const r4 = decideRest(q(290, [], lines));
  ok("3.4 a page with no room for the glow rests at tier 2: the rim 8px clear of every line, the nearest such rest",
    r4.y === 312 && r4.tier === 2 && Math.min(...lines.map((l) => gap(312, l))) >= RIM_CLEARANCE, JSON.stringify(r4));
  ok("3.4 …and does not move again where it rests (accepted at tier 2 — no chained glide, E-413)",
    decideRest(q(312, [], lines, 2)).y === null);
  ok("3.4 …nor when the record is gone (the page moved) and nothing better is within reach",
    decideRest(q(312, [], lines, null)).y === null);
  ok("3.4 CONTROL · with a tier-0 gap in reach (one line removed) it takes the glow-clear rest instead",
    decideRest(q(290, [], lines.filter((_, i) => i !== 4))).tier === 0);

  // 3.5 · E-413's floor: text every 30px (no gap anywhere), a control under the disc.
  const dense = Array.from({ length: 26 }, (_, i) => box(300, 380, 10 + 30 * i, 24 + 30 * i));
  const cta = box(250, 380, 300, 340);
  const r5 = decideRest(q(290, [cta], dense));
  ok("3.5 a dense page with a control under the disc: off the control by 4px, text accepted (tier 4, E-413's floor)",
    r5.y === 236 && r5.tier === 4 && gap(236, cta) >= FLOOR_CLEARANCE, JSON.stringify(r5));
  ok("3.5 …and it stays there (no chain)", decideRest(q(236, [cta], dense, 4)).y === null);
  ok("3.5 …but a CONTROL appearing under the accepted rest is re-decided (worse than its tier)",
    decideRest(q(236, [cta, box(250, 380, 250, 280)], dense, 4)).y !== null);

  // 3.6 · nothing anywhere: it stays (E-400 ①).
  const wall = box(0, 390, 0, 780);
  const r6 = decideRest(q(290, [wall], []));
  ok("3.6 nothing clear within reach: it stays where it is", r6.y === null && r6.tier === REST_TIERS.length, JSON.stringify(r6));

  // 3.7 · 321: the open channels panel (x 12–378, y 180–366 at 390) over the disc at y≈290.
  const panel = box(12, 378, 180, 366);
  const r7 = decideRest(q(290, [panel], []));
  ok("3.7 321 · an open panel over the disc moves it off the panel, clear of its whole box by the glow's 4px",
    r7.y !== null && r7.tier === 0 && gap(r7.y, panel) >= GLOW + GLOW_GAP, `rest y=${r7.y}, gap ${r7.y === null ? "-" : gap(r7.y, panel).toFixed(1)}`);
  ok("3.7 PLANT · with the panel's box out of the census (the host before R3-B: its content alone, here none in the band) it stays on the panel",
    decideRest(q(290, [], [])).y === null);

  // 3.8 · the reach is kept: E-400 ①'s third of the viewport.
  const r8 = decideRest(q(290, [box(0, 390, 0, 650)], []));
  ok("3.8 a clear rest beyond a third of the viewport is not taken (it stays)", r8.y === null, JSON.stringify(r8));

  // 3.9 · 296: beside a full-width card (x 16–374) the half-off disc (x ≥ 360) lies over the card's frame. Its content
  // is clear (tier 1), so the old rules left it there; a rest over nothing at all within reach is taken instead.
  const card = box(16, 374, 300, 500);
  const r9 = decideRest(q(370, [], [], null, [card]));
  ok("3.9 296 · over a big card's frame, with a rest over nothing within reach: it moves there, the frame clear of the glow by 4px (tier 0)",
    r9.y === 224 && r9.tier === 0 && gap(224, card) >= GLOW + GLOW_GAP, JSON.stringify(r9));
  ok("3.9 PLANT · without the frame tier (E-400's content rule alone) it stays over the card",
    decideRest(q(370, [], [], null, [card]), REST_TIERS.slice(1)).y === null);
  const longCard = box(16, 374, 0, 780);
  const r9b = decideRest(q(370, [], [], null, [longCard]));
  ok("3.9 CONTROL · where cards fill the reach it stays, content clear (tier 1, E-400's rule: 14px of a card's frame and padding)",
    r9b.y === null && r9b.tier === 1, JSON.stringify(r9b));

  // 3.10 · the painted box that stands in for text (301 309 310's roundel): what paints, and what hugs.
  const clear = ["transparent", "rgba(0, 0, 0, 0)", "rgba(255, 255, 255, 0.0)", "oklch(0.5 0.1 268 / 0)", "rgb(0 0 0 / 0%)", ""];
  const ink = ["rgb(0, 0, 0)", "rgba(0, 0, 0, 0.5)", "rgb(150, 160, 190)", "oklch(0.5 0.1 268)", "rgba(10, 20, 30, 0.04)", "rgb(0 0 0 / 0.3)"];
  ok("3.10 a colour paints nothing only when its alpha is 0 (or it is transparent)",
    clear.every(paintsNothing) && !ink.some(paintsNothing), JSON.stringify({ clear: clear.map(paintsNothing), ink: ink.map(paintsNothing) }));
  const trailingZero = (c: string) => !c || c === "transparent" || /[,/]\s*0(?:\.0*)?\s*\)$/.test(c);
  ok("3.10 PLANT · a 'trailing 0' rule (this host's first draft) reads opaque black, rgb(0, 0, 0), as unpainted — the cases above catch it",
    trailingZero("rgb(0, 0, 0)") && !paintsNothing("rgb(0, 0, 0)"));
  ok("3.10 a 28px roundel hugs its 17×13 '18+'; a 358×86 card does not hug an 80×17 name in it",
    hugs(box(33, 61, 571, 599), box(38.5, 55.5, 578, 591)) && !hugs(box(16, 374, 252, 338), box(97, 177, 270, 287)));
}

// ── §4 · the host wires the rules in ───────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the host wires the rules in (needle.tsx, comments stripped)");
{
  const host = code(rd("src/components/layout/needle.tsx"));
  const between = (from: string, to: string) => { const i = host.indexOf(from); const j = i < 0 ? -1 : host.indexOf(to, i + from.length); return i < 0 || j < 0 ? "" : host.slice(i, j); };
  const settle = between("function settleClear() {", "function scheduleClear(");
  const park = between("onPark: () => {", "onSleep:");
  const view = between("function applyViewport() {", "applyViewport();");
  const rest = between("function clearRestY(): number | null {", "function settleClear() {");
  ok("4.0 CONTROL · the four bodies this section reads were found (a reader that finds nothing proves nothing)",
    settle.length > 40 && park.length > 40 && view.length > 40 && rest.length > 40);
  ok("4.1 a check that comes due mid-glide is kept for the landing, BEFORE anything is decided (257 265 273)",
    /clearTimer = null;\s*if \(gliding\) \{ recheckOnLand = true; return; \}\s*const y = clearRestY\(\);/.test(settle));
  ok("4.2 …and the glide's landing runs it, while a landing with nothing asked for asks for nothing (no chain)",
    /if \(gliding\) \{[^}]*save\(\);\s*if \(recheckOnLand\) \{ recheckOnLand = false; scheduleClear\(\); \}\s*return;/.test(park));
  ok("4.3 the decision is the module's: the census hands controls AND open surfaces, big controls' frames, the text, the glow and the record",
    /const census = controlsInBand\(band\);/.test(rest) && /controls: \[\.\.\.census\.content, \.\.\.surfacesInBand\(band\)\]/.test(rest)
    && /frames: census\.frames,/.test(rest) && /text: textInBand\(band,/.test(rest)
    && /decideRest\(\{/.test(rest) && /const g = glowPx\(\);/.test(rest) && host.includes("const glowPx = () => glowReach(body.size, -haloInset() / 100);"));
  ok("4.4 the old 4px constant is gone from the host (one home for a clearance: needle-rest.ts)", !/\bCLEARANCE\b/.test(host));
  ok("4.5 a viewport change re-seats: applyViewport reads the old geometry, asks `reseat`, and a rest is tucked on the same edge",
    /const before = laidOut;/.test(view) && /reseat\(\{ before, after,/.test(view)
    && /if \(r\.kind === "rest"\) \{ body\.y = r\.y; body\.snapPark\(body\.edge\); endGlide\(\); save\(\); \}/.test(view)
    && /else if \(r\.kind === "aim"\) \{ body\.x = r\.x; body\.target = r\.target; \}/.test(view) && /laidOut = after;/.test(view));
  ok("4.5b …and reclamps only when the geometry changed (2.8: a no-change event left the glide alone)",
    /const changed = !before \|\| /.test(view) && /if \(changed\) \{\s*body\.reclamp\(\);/.test(view) && (view.match(/body\.reclamp\(\)/g) ?? []).length === 1);
  const surfaces = /const SURFACES = "([^"]+)";/.exec(host)?.[1] ?? "";
  ok("4.6 the surfaces are the house's two markers and the popup roles",
    ["[data-needle-keepout]", "[data-invitation]", "[role=dialog]", "[role=alertdialog]", "[role=menu]", "[role=listbox]", "dialog[open]"].every((s) => surfaces.split(",").includes(s)), surfaces);
  ok("4.7 a surface opening or going asks for a check: an observer on the body's subtree, disconnected on cleanup",
    /new MutationObserver\(/.test(host) && /surfaceObserver\.observe\(document\.body, \{\s*subtree: true, childList: true, attributes: true/.test(host)
    && /scheduleClear\(SURFACE_SETTLE\)/.test(host) && /surfaceObserver\.disconnect\(\);/.test(host));
  ok("4.8 text counts its painted box (a roundel, a pill) and small media (301 309 310's 18+ ring)",
    /const ink = inks\.get\(parent\) \?\? boxOf\(t\);/.test(host) && /MEDIA\.has\(el\.tagName\)/.test(host)
    && /if \(!hugs\(r, t\)\) return null;/.test(host) && /!paintsNothing\(s\.backgroundColor\)/.test(host));
  ok("4.9 drives can wait for the rest: `window.needle.resting()`",
    /resting: \(\) => isSuppressed\(\) \|\| \(body\.parked && !body\.held && !gliding && clearTimer === null && raf === null\),/.test(host));
  // The three floating cards carry the marker the census reads (their rung over the Needle is test:stacking's).
  const cards = ["src/components/social/channels-panel.tsx", "src/components/pwa/install-invite.tsx", "src/components/analytics/consent-prompt.tsx"];
  const unmarked = cards.filter((f) => !/data-invitation="[a-z-]+"/.test(code(rd(f))));
  ok("4.10 every floating invitation card carries `data-invitation`, so an open one is a keep-out at rest", unmarked.length === 0, unmarked.join(", "));
  // PLANT for 4.1: the deferral moved below the decision (a glide would be decided over) reads as missing.
  const planted = settle.replace("if (gliding) { recheckOnLand = true; return; }", "").replace("const y = clearRestY();", "const y = clearRestY();\n    if (gliding) { recheckOnLand = true; return; }");
  ok("4.1 PLANT · the deferral planted AFTER the decision is not read as the rule",
    !/clearTimer = null;\s*if \(gliding\) \{ recheckOnLand = true; return; \}\s*const y = clearRestY\(\);/.test(planted));
}

// ── §5 · a rest glide's frames ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · M7 · a rest glide's frames, on the engine, under real frame timing (test:needle-rest §1's measure)");
{
  type Mode = "real-time" | "frame-locked";
  /** One rest glide of `d` px at 360 × 740 (§1's viewport) shown on a rAF stream of `period` ms ± `jitter`, recorded as
   *  §1 records it: the engine's y once per displayed frame. `real-time` is the host before M7 (each frame's real
   *  interval, the accumulator's phase wherever start() left it); `frame-locked` is `glideFrame`. */
  const glide = (d: number, period: number, jitter: number, seed: number, mode: Mode, drop = -1) => {
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const b = new NeedleBody({ size: diameter(360, 740), bounds: () => ({ w: 360, h: 740, insets: NO_INS }) });
    b.y = 117.75; b.snapPark("right");
    b.parked = false; b.parking = true; b.target = { x: b.x, y: 117.75 + d };   // settleClear
    const clock = newGlideClock();
    const t0 = 1000 + rnd() * period;                   // start(): last = performance.now(), somewhere inside a frame
    let last = t0, frameT = Math.ceil(t0 / period) * period, k = 0;
    const ys = [b.y], ts = [frameT];
    while (b.parking && k < 400) {
      if (k === drop) frameT += period;                 // a frame the browser never drew
      const t = frameT + (rnd() * 2 - 1) * jitter;
      let dt = t - last; last = t; if (dt > 50) dt = 50;
      if (mode === "frame-locked") { const f = glideFrame(clock, dt); if (f.acc !== null) b.acc = f.acc; dt = f.dt; }
      b.advance(dt);
      ys.push(b.y); ts.push(t); k++; frameT += period;
    }
    const steps = ys.slice(1).map((y, i) => y - ys[i]);
    const changes = steps.slice(1).map((x, i) => Math.abs(x - steps[i]));
    const end = ys[ys.length - 1];
    return {
      change: Math.max(...changes), step: Math.max(...steps.map(Math.abs)), ms: ts[ts.length - 1] - ts[0],
      overshoot: Math.max(0, ...ys.map((y) => (y - end) * Math.sign(d))), off: Math.abs(end - (117.75 + d)),
    };
  };
  const RATES: Array<[number, string]> = [[1000 / 60, "60 Hz"], [2200 / 133, "M7's 16.54 ms"], [16.8, "16.80 ms"], [1000 / 90, "90 Hz"],
    [1000 / 120, "120 Hz"], [1000 / 144, "144 Hz"], [20, "50 Hz"]];
  const sweep = (mode: Mode, d: number) => {
    let change = 0, step = 0, ms = 0, overshoot = 0, off = 0, over = 0, runs = 0, where = "";
    for (const [period, label] of RATES) for (const jitter of [0.3, 1, 2]) for (let seed = 1; seed <= 120; seed++) {
      const r = glide(d, period, jitter, seed * 7919, mode);
      runs++;
      if (r.change > change) { change = r.change; where = `${label} ±${jitter} ms, seed ${seed}`; }
      step = Math.max(step, r.step); ms = Math.max(ms, r.ms); overshoot = Math.max(overshoot, r.overshoot); off = Math.max(off, r.off);
      if (r.change > 6) over++;
    }
    return { change, step, ms, overshoot, off, over, runs, where };
  };
  // 5.1 · the motion profile itself: an even 60 fps stream.
  const even = glide(158, 1000 / 60, 0, 1, "real-time");
  ok("5.1 the spring's own profile: on an even 60 fps stream a 158px glide's step changes by ≤ 3px (its start, and its ≤ 3.6px landing snap)",
    even.change <= 3, `change ${even.change.toFixed(2)}, peak step ${even.step.toFixed(2)} (two substeps), ${even.ms.toFixed(0)} ms`);
  // 5.2 · PLANT: the host before M7, on M7's glide.
  const old = sweep("real-time", 158);
  ok("5.2 PLANT · the host before M7 (each frame's real interval): some 158px glides change step by over 6px — M7's 6.50, beside a step of three substeps at peak (10.03)",
    old.over > 0 && Math.abs(old.step - 1.5 * even.step) < 0.2,
    `${old.over}/${old.runs} runs over 6px, worst ${old.change.toFixed(2)} (${old.where}), worst step ${old.step.toFixed(2)}`);
  // 5.3 · the fix, across rates, jitter and the longest glide §1 allows (a third of 740).
  for (const d of [158, 246]) {
    const r = sweep("frame-locked", d);
    ok(`5.3 ${d}px · frame-locked: no change of step over 6px at 50–144 Hz with up to ±2 ms jitter (§1's limit)`, r.over === 0 && r.change <= 6,
      `worst ${r.change.toFixed(2)} (${r.where}) over ${r.runs} runs`);
    ok(`5.3 ${d}px · …and §1's other limits hold: settles under 1.5 s, overshoot ≤ 3px, lands on its rest`,
      r.ms < 1500 && r.overshoot <= 3 && r.off < 0.5, `longest ${r.ms.toFixed(0)} ms, overshoot ${r.overshoot.toFixed(2)}, ${r.off.toFixed(3)}px off`);
  }
  // 5.4 · one dropped frame, anywhere in the glide.
  let dropped = 0, droppedOld = 0;
  for (const d of [158, 246]) for (let at = 1; at < 48; at++) {
    dropped = Math.max(dropped, glide(d, 1000 / 60, 0.3, 11, "frame-locked", at).change);
    droppedOld = Math.max(droppedOld, glide(d, 1000 / 60, 0.3, 11, "real-time", at).change);
  }
  ok("5.4 a dropped frame is not caught up in one jump: the step changes by ≤ 6px wherever the frame is lost",
    dropped <= 6, `frame-locked worst ${dropped.toFixed(2)} · the host before M7 ${droppedOld.toFixed(2)}`);
  // 5.5 · the host wires it in.
  const host = code(rd("src/components/layout/needle.tsx"));
  ok("5.5 the host's tick steps ONLY its own glide by `glideFrame` (gliding, parking, not held), and each glide starts a fresh clock",
    /if \(gliding && glideClock && body\.parking && !body\.held\) \{\s*const f = glideFrame\(glideClock, dt\);\s*if \(f\.acc !== null\) body\.acc = f\.acc;\s*dt = f\.dt;\s*\}\s*if \(body\.held\) applyDrag\(\);\s*body\.advance\(dt\);/.test(host)
    && /gliding = true;\s*glideClock = newGlideClock\(\);/.test(host));
  ok("5.6 the player taking the disc ends the host's glide (a grab, a bounce tap, Escape, Space/Enter, the arrows), so a throw is never frame-locked",
    /pid = e\.pointerId;\s*endGlide\(\);/.test(host) && /function bounceFrom\(px: number, py: number\) \{\s*endGlide\(\);/.test(host)
    && (host.match(/e\.preventDefault\(\); endGlide\(\);/g) ?? []).length === 2
    && /e\.preventDefault\(\);\s*endGlide\(\);\s*if \(body\.parked \|\| body\.parking\) body\.wake\(\)/.test(host));
  // PLANT for 5.5: the lock widened to every frame (a throw frame-locked too) no longer reads as the rule.
  const widened = host.replace("if (gliding && glideClock && body.parking && !body.held) {", "if (glideClock) {");
  ok("5.5 PLANT · the lock widened to every frame is not read as the rule",
    !/if \(gliding && glideClock && body\.parking && !body\.held\) \{/.test(widened));
}

// ── §6 · ④ the chat bubble ─────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · ④ R4-B · the chat bubble is a keep-out at every tier, shown or faded (tiles 313 314 315 305)");
{
  // 6.1 · the restated numbers agree with the files they come from.
  const chatCss = rd("src/styles/chat/chat-styles.css");
  const ringInset = /\.cm-bubble::after \{[^}]*\binset: -([\d.]+)px;/.exec(chatCss);
  const ringPeak = /@keyframes cm-bubble-ring \{[\s\S]*?50%[^}]*scale\(([\d.]+)\)/.exec(chatCss);
  ok("6.1 BUBBLE_RING_OUTSET and BUBBLE_RING_BREATHE are chat-styles.css's (`.cm-bubble::after` inset, `cm-bubble-ring` at 50%)",
    !!ringInset && Number(ringInset[1]) === BUBBLE_RING_OUTSET && !!ringPeak && Number(ringPeak[1]) === BUBBLE_RING_BREATHE,
    `css ${ringInset?.[1]} / ${ringPeak?.[1]} vs ${BUBBLE_RING_OUTSET} / ${BUBBLE_RING_BREATHE}`);
  const phoneSide = /\.cm-bubble\.cm-bubble-mobile \{ width: (\d+)px; height: (\d+)px; \}/.exec(chatCss);
  const deskSide = /\.cm-bubble \{[^}]*?width: (\d+)px;\s*height: (\d+)px;/.exec(chatCss);
  const chatRoot = code(rd("src/components/chat/ChatRoot.tsx"));
  ok("6.1b the bubble's box restated below is the house's: 44px on a phone, 56 on a desktop (chat-styles.css), 16px from the right, 80 above the phone rail below 1024 and 16 from 1024 (ChatRoot)",
    phoneSide?.[1] === "44" && phoneSide?.[2] === "44" && deskSide?.[1] === "56" && deskSide?.[2] === "56"
    && /right: 16,/.test(chatRoot) && /bottom: isMobile \? 80 : 16,/.test(chatRoot) && /const MOBILE_BREAKPOINT = 1024;/.test(chatRoot));
  const bubbleBox = (w: number, h: number): Box => {
    const side = w < 1024 ? 44 : 56, lift = w < 1024 ? 80 : 16;
    return { left: w - 16 - side, right: w - 16, top: h - lift - side, bottom: h - lift };
  };
  const ink320 = bubbleInk(bubbleBox(320, 780));
  // Tile 305 (en 320, the disc 50px away): the ring's ink x256–307 × y652–703 (edges 256 / 308 / 652 / 704).
  ok("6.2 the bubble's ink is its box grown by the ring at its widest — 5px round the 44px phone bubble — and holds the ring tile 305 measured (x256–307 × y652–703), within 1.5px of it",
    ink320.left <= 256 && ink320.right >= 308 && ink320.top <= 652 && ink320.bottom >= 704
    && ink320.left >= 254.5 && ink320.right <= 309.5 && ink320.top >= 650.5 && ink320.bottom <= 705.5
    && Math.abs(bubbleInk(bubbleBox(1280, 900)).left - (1280 - 72 - 5.48)) < 0.01,
    JSON.stringify(ink320));
  ok("6.2b every tier keeps the glow and its 4px from the bubble, and the census reaches that far",
    abovePad(10) === 10 + GLOW_GAP && censusPad(25, REST_TIERS.slice(2)) === 25 + GLOW_GAP);

  /** The right rail at `w × h` (or the left, for 6.9), the disc's box at `y`, the gap to a box, the bubble there. */
  const cell = (w: number, h: number) => {
    const size = diameter(w, h);
    const glow = glowReach(size, haloFraction(w, h));
    const { minY, maxY } = railRange({ minX: 0, maxX: w - size, minY: 0, maxY: h - size, size });
    const fpAt = (y: number, edge: "left" | "right" = "right"): Box =>
      (edge === "right" ? { left: w - size / 2, right: w, top: y, bottom: y + size } : { left: 0, right: size / 2, top: y, bottom: y + size });
    const gap = (y: number, r: Box, edge: "left" | "right" = "right") => {
      const f = fpAt(y, edge);
      return Math.max(r.left - f.right, f.left - r.right, r.top - f.bottom, f.top - r.bottom);
    };
    const box = bubbleBox(w, h), ink = bubbleInk(box);
    const q = (y: number, o: { controls?: Box[]; text?: Box[]; above?: Box[]; reach?: number; edge?: "left" | "right" } = {}): RestInput => ({
      fp: fpAt(y, o.edge), controls: o.controls ?? [], frames: [], text: o.text ?? [], above: o.above ?? [ink],
      glow, reach: o.reach ?? h / 3, minY, maxY, y, accepted: null,
    });
    return { size, glow, pad: abovePad(glow), minY, maxY, fpAt, gap, box, ink, q };
  };
  /** The phone rail's last tab under the rail at 320–390 (80px wide, 64 tall: a small control, counted whole). */
  const tab = (w: number): Box => ({ left: w - 80, right: w, top: 716, bottom: 780 });

  // 6.3 · tile 313 (zh 320): the disc restored at y634 (the box the previous locale's 1280 walk saved), nothing else in
  // the band — the Chinese licence line ends at x188, the band starts at 278 — and the bubble below-left of it.
  const c320 = cell(320, 780);
  const r313 = decideRest(c320.q(634, { controls: [tab(320)] }));
  ok(`6.3 313 · the disc at y634 under the bubble moves, at tier 0, to the nearest height clear of its ink by the glow's ${c320.pad.toFixed(2)}px — y580`,
    r313.y === 580 && r313.tier === 0 && c320.gap(580, c320.ink) >= c320.pad,
    `${JSON.stringify(r313)}, gap to the ink ${r313.y === null ? "-" : c320.gap(r313.y, c320.ink).toFixed(2)}`);
  const old313 = decideRest(c320.q(634, { controls: [tab(320)], above: [] }));
  const over = c320.fpAt(634);
  ok("6.3 PLANT · the bubble dropped from the obstacle set (the host before R4-B, the bubble faded when the check ran): it stays at y634, the bubble's ink over its box by 17 × 39px — the tile's 136 px of hidden ink, x293–303 y659–682",
    old313.y === null && old313.tier === 0
    && Math.abs(Math.min(over.right, c320.ink.right) - Math.max(over.left, c320.ink.left) - 17) < 0.01
    && Math.abs(Math.min(over.bottom, c320.ink.bottom) - Math.max(over.top, c320.ink.top) - 39) < 0.01,
    JSON.stringify(old313));
  const r313b = decideRest(c320.q(580, { controls: [tab(320)] }));
  ok("6.3 …and it stays at y580 on the next check (no chain)", r313b.y === null && r313b.tier === 0, JSON.stringify(r313b));

  // 6.4 · tile 314 (zh 360): the same y634 through 320 → 360 (56px both). Shown at that check, the bubble counted as an
  // ordinary control — its 44px box, no ring — and the tile's rest is exactly that rule's: y586.
  const c360 = cell(360, 780);
  const boxOnly360 = decideRest(c360.q(634, { controls: [tab(360), c360.box], above: [] }));
  ok("6.4 PLANT · 314 · the bubble as an ordinary control (its box at the tier's pad) gives y586, the tile's rest — and its ring 9px from the disc's box, inside the 14px",
    boxOnly360.y === 586 && Math.abs(c360.gap(586, c360.ink) - 9) < 0.01 && c360.gap(586, c360.ink) < c360.pad,
    `${JSON.stringify(boxOnly360)}, ring gap ${boxOnly360.y === null ? "-" : c360.gap(boxOnly360.y, c360.ink).toFixed(2)}`);
  const r314 = decideRest(c360.q(634, { controls: [tab(360), c360.box] }));
  ok("6.4 314 · with the bubble's ink in, y580 — the ring clear by the glow's 14px", r314.y === 580 && c360.gap(580, c360.ink) >= c360.pad, JSON.stringify(r314));

  // 6.5 · tile 315 (zh 390): 360's y586 re-centred on the 60px disc is y584; the box-only rule gives the tile's y580.
  const c390 = cell(390, 780);
  const boxOnly390 = decideRest(c390.q(584, { controls: [tab(390), c390.box], above: [] }));
  ok("6.5 PLANT · 315–317 · the box-only rule at 390 gives y580, the tiles' rest — its ring 11px from the disc's box, inside the 15.4px",
    boxOnly390.y === 580 && Math.abs(c390.gap(580, c390.ink) - 11) < 0.01 && c390.gap(580, c390.ink) < c390.pad,
    `${JSON.stringify(boxOnly390)}, ring gap ${boxOnly390.y === null ? "-" : c390.gap(boxOnly390.y, c390.ink).toFixed(2)}`);
  const r315 = decideRest(c390.q(584, { controls: [tab(390), c390.box] }));
  ok(`6.5 315 · with the ink in, y574 — the ring clear by ${c390.pad.toFixed(2)}px`, r315.y === 574 && c390.gap(574, c390.ink) >= c390.pad, JSON.stringify(r315));

  // 6.6 · CONTROL · tile 305 (en 320), from the same y634: the English licence line runs to x280, inside the band, and
  // binds first. Its rest is the tile's y546 with the bubble in or out — the en/zh difference is the text, not the rule.
  const licence: Box = { left: 16, right: 280, top: 617, bottom: 637 };
  const en = decideRest(c320.q(634, { controls: [tab(320)], text: [licence] }));
  const enOld = decideRest(c320.q(634, { controls: [tab(320)], text: [licence], above: [] }));
  ok("6.6 CONTROL · 305 · the English licence line moves the disc to y546 (the tile's rest), with the bubble in the set or out of it",
    en.y === 546 && enOld.y === 546 && en.tier === 0 && c320.gap(546, licence) >= c320.pad && c320.gap(546, c320.ink) >= c320.pad,
    `${JSON.stringify(en)} / without the bubble ${JSON.stringify(enOld)}`);

  // 6.7 · every tier: a page too dense for any text tier (a line every 30px down the band) still keeps the glow's
  // clearance from the bubble at the floor tier, where the box-only rule rests 4px from the box, on the ring.
  const lines = Array.from({ length: 14 }, (_, i) => ({ left: 200, right: 300, top: 290 + 30 * i, bottom: 304 + 30 * i }));
  const dense = decideRest(c320.q(634, { controls: [tab(320)], text: lines }));
  ok("6.7 a page too dense for the text tiers rests at tier 4 (text accepted) and STILL keeps the bubble's ink the glow's 14px away — y580",
    dense.y === 580 && dense.tier === 4 && c320.gap(580, c320.ink) >= c320.pad, JSON.stringify(dense));
  const denseOld = decideRest(c320.q(634, { controls: [tab(320), c320.box], text: lines, above: [] }));
  ok("6.7 PLANT · the box-only rule at tier 4 rests 4px from the bubble's box — y596, the rim 1px into its ring",
    denseOld.y === 596 && denseOld.tier === 4 && c320.gap(596, c320.ink) < 0, `${JSON.stringify(denseOld)}, ring gap ${denseOld.y === null ? "-" : c320.gap(denseOld.y, c320.ink).toFixed(2)}`);

  // 6.8 · the reach: a phone on its side, 740 × 360. The bubble's ink is y231–285; a disc at its lowest rest is under it.
  const land = cell(740, 360);
  const low = land.maxY;
  const reachLow = restReach({ fp: land.fpAt(low), y: low, minY: land.minY, maxY: land.maxY, above: [land.ink], glow: land.glow }, 360 / 3);
  const rLand = decideRest(land.q(low, { reach: reachLow }));
  ok("6.8 740 × 360 · a disc at its lowest rest (y290) under the bubble reaches past the third (120) to the nearest height clear of it: reach 130, rest y160",
    low === 290 && reachLow === 130 && rLand.y === 160 && land.gap(160, land.ink) >= land.pad, `reach ${reachLow}, ${JSON.stringify(rLand)}`);
  ok("6.8 PLANT · held to the third, nothing within reach clears it and it stays under the bubble",
    decideRest(land.q(low, { reach: 360 / 3 })).y === null);
  ok("6.8 CONTROL · a disc clear of the bubble keeps the third (y100), and so does one with no bubble at all",
    restReach({ fp: land.fpAt(100), y: 100, minY: land.minY, maxY: land.maxY, above: [land.ink], glow: land.glow }, 120) === 120
    && restReach({ fp: land.fpAt(low), y: low, minY: land.minY, maxY: land.maxY, above: [], glow: land.glow }, 120) === 120);

  // 6.9 · CONTROL · the bubble is an obstacle where it is: the left rail at 313's height is far from it.
  const left = decideRest(c320.q(634, { edge: "left" }));
  ok("6.9 CONTROL · on the LEFT rail at y634 the right-hand bubble is nothing to the disc: it stays", left.y === null && left.tier === 0, JSON.stringify(left));

  // 6.10 · the host wires it in (source, comments stripped).
  const host = code(rd("src/components/layout/needle.tsx"));
  const between = (src: string, from: string, to: string) => { const i = src.indexOf(from); const j = i < 0 ? -1 : src.indexOf(to, i + from.length); return i < 0 || j < 0 ? "" : src.slice(i, j); };
  const restOf = (src: string) => between(src, "function clearRestY(): number | null {", "function settleClear() {");
  const bubblesOf = (src: string) => between(src, "function bubblesInBand(band: Band) {", "const TEXT_SKIP = ");
  const wired = (rest: string) =>
    /const above = bubblesInBand\(band\);\s*const reach = restReach\(\{ fp, y: body\.y, minY, maxY, above, glow: g \}, viewport\(\)\.h \/ 3\);/.test(rest)
    && /text: textInBand\(band, \{ top: fp\.top - reach - pad, bottom: fp\.bottom \+ reach \+ pad \}\),\s*above,\s*glow: g, reach,/.test(rest)
    && !/viewport\(\)\.h \/ 3;/.test(rest);
  const reads = (b: string) =>
    /for \(const fab of document\.querySelectorAll<HTMLElement>\(BUBBLE\)\) \{/.test(b)
    && /const n = fab\.querySelector<HTMLElement>\("\.cm-bubble"\) \?\? fab;/.test(b)
    && /getComputedStyle\(n\)\.visibility === "hidden"/.test(b)
    && /const t = getComputedStyle\(fab\)\.transform;/.test(b) && /new DOMMatrixReadOnly\(t\)/.test(b)
    && /bubbleInk\(\{ left: r\.left - dx, right: r\.right - dx, top: r\.top - dy, bottom: r\.bottom - dy \}\)/.test(b)
    && !/pointerEvents|pointer-events|opacity|seen\(/.test(b);
  const rest = restOf(host), bubbles = bubblesOf(host);
  ok("6.10 CONTROL · the two bodies this reads were found", rest.length > 40 && bubbles.length > 40);
  ok("6.10 clearRestY hands the bubble in (`above`), takes its reach from `restReach`, and reads the page's text over that reach",
    wired(rest));
  ok("6.11 the bubble's census reads it SHOWN OR FADED: every `.cm-fab`, at its `.cm-bubble`, skipped only when `visibility: hidden`, its fade's translate taken back off, grown by its ring — never a pointer-events, opacity or `seen` test",
    host.includes('const BUBBLE = ".cm-fab";') && reads(bubbles));
  ok("6.12 the bubble's arrival or going asks for a check (ChatRoot is a lazy overlay that can land after the first one)",
    host.includes("const LOOK_AGAIN = `${SURFACES},${BUBBLE}`;") && /if \(e\.matches\(LOOK_AGAIN\) \|\| e\.querySelector\(LOOK_AGAIN\)\) \{ scheduleClear\(SURFACE_SETTLE\); return; \}/.test(host));
  // The names the census reads are the bubble's own, and its fades are the ones that blinded the control census.
  const bubbleTsx = code(rd("src/components/chat/ChatBubble.tsx"));
  const globals = rd("src/app/globals.css");
  const fades = ["html[data-scrolling] .cm-fab:not(.cm-fab--open):not(:focus-within) {", "html[data-fab-idle] .cm-fab:not(.cm-fab--open):not(:focus-within) {"]
    .map((sel) => { const i = globals.indexOf(sel); return i < 0 ? "" : globals.slice(i, globals.indexOf("}", i)); });
  ok("6.13 `.cm-fab` and `.cm-bubble` are ChatRoot's wrapper and ChatBubble's button, and both of globals.css's fades set `pointer-events: none` on the wrapper (why the control census, which skips that, could not hold it)",
    chatRoot.includes('className={open ? "cm-fab cm-fab--open" : "cm-fab"}') && /className=\{`cm-bubble /.test(bubbleTsx)
    && fades.every((f) => /pointer-events: none;/.test(f) && /transform: translateY\(8px\);/.test(f)) && /if \(cs\.visibility === "hidden" \|\| cs\.pointerEvents === "none"\) continue;/.test(host));
  // PLANTS: the bubble dropped from the call; the control census's filter planted into the bubble's.
  const dropped = host.replace("const above = bubblesInBand(band);", "const above: Box[] = [];");
  ok("6.10 PLANT · the bubble dropped from clearRestY's obstacle set is not read as wired", dropped !== host && !wired(restOf(dropped)));
  const blind = host.replace('if (r.width < 1 || r.height < 1 || getComputedStyle(n).visibility === "hidden") continue;',
    'const cs = getComputedStyle(n);\n      if (r.width < 1 || r.height < 1 || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;');
  ok("6.11 PLANT · the control census's `pointer-events: none` skip planted into the bubble's census (a faded bubble invisible again) is not read as the rule",
    blind !== host && !reads(bubblesOf(blind)));
  const thirdOnly = host.replace("const reach = restReach({ fp, y: body.y, minY, maxY, above, glow: g }, viewport().h / 3);", "const reach = viewport().h / 3;");
  ok("6.10 PLANT · the reach held to a third (no way out from under the bubble on a short screen) is not read as wired",
    thirdOnly !== host && !wired(restOf(thirdOnly)));
}

console.log(`\n[needle-host] ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILURES:"); for (const f of failures) console.log("  · " + f); process.exit(1); }
