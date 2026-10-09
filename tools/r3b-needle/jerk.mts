// What a 158px rest glide does per 60fps frame, on the vendored engine driven exactly as needle.tsx's tick drives it.
import { NeedleBody, CONST } from "file:///F:/kipindi-r3b/src/lib/needle-physics.js";

const W = 360, H = 740;
const size = Math.round(Math.min(64, Math.max(56, Math.min(W, H) * 0.155)));
function glide(from: number, to: number, intervals: (k: number) => number, firstDt = 0) {
  const b = new NeedleBody({ size, bounds: () => ({ w: W, h: H, insets: { top: 0, right: 0, bottom: 0, left: 0 } }) });
  b.y = from; b.snapPark("right");
  b.parked = false; b.parking = true; b.target = { x: b.x, y: to };   // settleClear
  const ys = [b.y]; const subs: number[] = []; const dts: number[] = [];
  let k = 0;
  // tick(): dt = t - last, clamped at 50; the first dt is rAF's frame timestamp minus performance.now() at start().
  let dt = firstDt;
  while (b.parking && k < 400) {
    const acc0 = b.acc;
    b.advance(dt);
    subs.push(Math.round((acc0 + Math.min(Math.max(dt, 0), 50) - b.acc) / CONST.SUBSTEP));
    ys.push(b.y); dts.push(dt);
    k++; dt = intervals(k);
  }
  const steps = ys.slice(1).map((y, i) => y - ys[i]);
  const jerks = steps.slice(1).map((s, i) => Math.abs(s - steps[i]));
  return { steps, jerks, subs, dts, frames: k, dur: dts.reduce((a, c) => a + c, 0), end: b.y };
}
const fmt = (r: ReturnType<typeof glide>, label: string) => {
  const maxStep = Math.max(...r.steps.map(Math.abs)), maxJerk = Math.max(...r.jerks);
  const at = r.jerks.indexOf(maxJerk);
  console.log(`${label}: frames ${r.frames}, ${r.dur.toFixed(0)}ms, max step ${maxStep.toFixed(2)}, max change of step ${maxJerk.toFixed(2)}`
    + ` (frames ${at}->${at + 1}: steps ${r.steps[at].toFixed(2)} -> ${r.steps[at + 1].toFixed(2)}, substeps ${r.subs[at]} -> ${r.subs[at + 1]}, dt ${r.dts[at].toFixed(2)} -> ${r.dts[at + 1].toFixed(2)})`);
};
const F = 1000 / 60;
console.log(`size ${size}, SUBSTEP ${CONST.SUBSTEP.toFixed(3)}ms, PARK_K ${CONST.PARK_K}, PARK_Z ${CONST.PARK_Z}`);
// 1 · the motion profile itself: perfectly even frames, two substeps each.
const even = glide(117.75, 275.75, () => F, F);
fmt(even, "even 60fps, 158px");
console.log("  per-frame steps:", even.steps.slice(0, 26).map((s) => s.toFixed(2)).join(" "));
// The peak velocity in px per substep (what one substep more or less in a frame is worth).
console.log(`  peak step per substep ${(Math.max(...even.steps) / 2).toFixed(2)}px`);
// 2 · the same frames, with the accumulator sitting on a substep boundary: real rAF deltas jitter by ±0.1–0.3ms.
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let worst = { jerk: 0, label: "" };
for (const jit of [0.05, 0.1, 0.2, 0.3, 0.5]) for (let s = 1; s <= 200; s++) {
  seed = s * 7919;
  const first = rnd() * F;
  const r = glide(117.75, 275.75, () => F + (rnd() * 2 - 1) * jit, first);
  const j = Math.max(...r.jerks);
  if (j > worst.jerk) worst = { jerk: j, label: `jitter ±${jit}ms seed ${s} first dt ${first.toFixed(2)}` };
  if (s === 1) fmt(r, `jitter ±${jit}ms (seed 1)`);
}
console.log(`worst over 1000 jittered runs: change of step ${worst.jerk.toFixed(2)} (${worst.label})`);
// 3 · one late frame (a 33ms gap) at peak speed: a dropped frame.
const late = glide(117.75, 275.75, (k) => (k === 12 ? 2 * F : F), F);
fmt(late, "even 60fps with frame 12 dropped (33ms)");
// 4 · glide length vs the boundary-jitter artefact: twice the substep displacement at peak.
for (const d of [40, 60, 80, 100, 120, 158, 200, 246]) {
  const e = glide(300, 300 + d, () => F, F);
  console.log(`  ${d}px glide: even-frame max step ${Math.max(...e.steps).toFixed(2)}, max change ${Math.max(...e.jerks).toFixed(2)}, one-substep swing at peak ${(Math.max(...e.steps)).toFixed(2)}`);
}
