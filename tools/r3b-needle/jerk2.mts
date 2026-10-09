// The rest glide under real frame timing: the host as it is (the first dt is arbitrary, so the accumulator's phase is
// arbitrary) against the host with the phase centred at the glide's first frame (acc = SUBSTEP/2, first dt 0).
import { NeedleBody, CONST } from "file:///F:/kipindi-r3b/src/lib/needle-physics.js";

const W = 360, H = 740, S = CONST.SUBSTEP;
const size = Math.round(Math.min(64, Math.max(56, Math.min(W, H) * 0.155)));
function run(d: number, period: number, jitter: number, seed: number, centred: boolean) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const b = new NeedleBody({ size, bounds: () => ({ w: W, h: H, insets: { top: 0, right: 0, bottom: 0, left: 0 } }) });
  b.y = 117.75; b.snapPark("right");
  b.parked = false; b.parking = true; b.target = { x: b.x, y: 117.75 + d };
  // The rAF stream: timestamps on a `period` grid with jitter; start() lands at a random point inside a frame.
  const t0 = 1000 + rnd() * period;
  let last = t0;                       // start(): last = performance.now()
  let frameT = Math.ceil(t0 / period) * period;
  const ys = [b.y], ts = [frameT];
  let first = true, k = 0;
  while (b.parking && k < 300) {
    const t = frameT + (rnd() * 2 - 1) * jitter;
    let dt = t - last; last = t; if (dt > 50) dt = 50;
    if (first && centred) { dt = 0; b.acc = S / 2; }
    first = false;
    b.advance(dt);
    ys.push(b.y); ts.push(t); k++;
    frameT += period;
  }
  const steps = ys.slice(1).map((y, i) => y - ys[i]);
  const jerks = steps.slice(1).map((x, i) => Math.abs(x - steps[i]));
  return { maxJerk: Math.max(...jerks), maxStep: Math.max(...steps.map(Math.abs)), dur: ts[ts.length - 1] - ts[0], frames: k };
}
for (const centred of [false, true]) {
  console.log(centred ? "\nCENTRED at the glide's first frame" : "AS SHIPPED (phase arbitrary)");
  for (const d of [158, 246]) for (const period of [1000 / 60, 2200 / 133, 16.8]) for (const jitter of [0.1, 0.3, 0.6, 1.0]) {
    let worst = 0, worstStep = 0, over = 0, maxDur = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const r = run(d, period, jitter, seed * 7919, centred);
      worst = Math.max(worst, r.maxJerk); worstStep = Math.max(worstStep, r.maxStep); maxDur = Math.max(maxDur, r.dur);
      if (r.maxJerk > 6) over++;
    }
    console.log(`  ${d}px · frames every ${period.toFixed(2)}ms ±${jitter}: worst change of step ${worst.toFixed(2)} · runs over 6px ${over}/2000 · worst step ${worstStep.toFixed(2)} · longest ${maxDur.toFixed(0)}ms`);
  }
}
