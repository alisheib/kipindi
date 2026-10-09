// Frame-locked rest glide: while the host's glide is in flight, each displayed frame advances the engine by WHOLE
// substeps, n = round(dt / SUBSTEP) (1..6), from a centred phase. Compared under jitter, drift, dropped frames and
// other refresh rates.
import { NeedleBody, CONST } from "file:///F:/kipindi-r3b/src/lib/needle-physics.js";

const W = 360, H = 740, S = CONST.SUBSTEP;
const size = Math.round(Math.min(64, Math.max(56, Math.min(W, H) * 0.155)));
const locked = (dt: number, prev: number) => Math.min(6, Math.max(1, Math.round(Math.min(dt, prev) / S))) * S;
function run(d: number, period: number, jitter: number, seed: number, drop = -1) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const b = new NeedleBody({ size, bounds: () => ({ w: W, h: H, insets: { top: 0, right: 0, bottom: 0, left: 0 } }) });
  b.y = 117.75; b.snapPark("right");
  b.parked = false; b.parking = true; b.target = { x: b.x, y: 117.75 + d };
  let gliding = true;
  const t0 = 1000 + rnd() * period;
  let last = t0, frameT = Math.ceil(t0 / period) * period;
  const ys = [b.y], ts = [frameT];
  let first = true, k = 0, prev = 1000 / 60;
  while (b.parking && k < 400) {
    if (k === drop) frameT += period;                       // one frame never drawn
    const t = frameT + (rnd() * 2 - 1) * jitter;
    let dt = t - last; last = t; if (dt > 50) dt = 50;
    if (first) { dt = 0; b.acc = S / 2; first = false; }    // the glide's first frame: time base + centred phase
    else if (gliding) { const raw = dt; dt = locked(raw, prev); prev = raw; }
    b.advance(dt);
    if (!b.parking) gliding = false;
    ys.push(b.y); ts.push(t); k++;
    frameT += period;
  }
  const steps = ys.slice(1).map((y, i) => y - ys[i]);
  const jerks = steps.slice(1).map((x, i) => Math.abs(x - steps[i]));
  const rest = ys[ys.length - 1];
  const over = Math.max(0, ...ys.map((y) => (y - rest) * Math.sign(d)));
  return { maxJerk: Math.max(...jerks), maxStep: Math.max(...steps.map(Math.abs)), dur: ts[ts.length - 1] - ts[0], over, end: rest };
}
for (const d of [40, 158, 246]) for (const [period, label] of [[1000 / 60, "60Hz"], [2200 / 133, "M7's 16.54ms"], [16.8, "16.80ms"], [1000 / 90, "90Hz"], [1000 / 120, "120Hz"], [1000 / 144, "144Hz"], [20, "50Hz"]] as Array<[number, string]>) {
  for (const jitter of [0.3, 1.0, 2.0]) {
    let worst = 0, worstStep = 0, over6 = 0, maxDur = 0, maxOver = 0, endErr = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const r = run(d, period, jitter, seed * 7919);
      worst = Math.max(worst, r.maxJerk); worstStep = Math.max(worstStep, r.maxStep); maxDur = Math.max(maxDur, r.dur);
      maxOver = Math.max(maxOver, r.over); endErr = Math.max(endErr, Math.abs(r.end - (117.75 + d)));
      if (r.maxJerk > 6) over6++;
    }
    console.log(`${String(d).padStart(3)}px Â· ${label.padEnd(12)} Â±${jitter}ms: worst change ${worst.toFixed(2)} (over 6: ${over6}/1000) Â· worst step ${worstStep.toFixed(2)} Â· longest ${maxDur.toFixed(0)}ms Â· overshoot ${maxOver.toFixed(2)} Â· lands ${endErr.toFixed(3)}px off`);
  }
}
// A dropped frame mid-glide (the screen shows nothing new for 33ms): the step it catches up with, by frame position.
let worstDrop = 0;
for (let drop = 1; drop < 45; drop++) worstDrop = Math.max(worstDrop, run(158, 1000 / 60, 0.3, 11, drop).maxJerk);
console.log(`158px at 60Hz with one dropped frame anywhere: worst change ${worstDrop.toFixed(2)}`);
let worstDrop246 = 0;
for (let drop = 1; drop < 50; drop++) worstDrop246 = Math.max(worstDrop246, run(246, 1000 / 60, 0.3, 11, drop).maxJerk);
console.log(`246px at 60Hz with one dropped frame anywhere: worst change ${worstDrop246.toFixed(2)}`);


for (let drop = 1; drop < 50; drop++) { const r = run(246, 1000 / 60, 0.3, 11, drop); if (r.maxJerk > 4) console.log('  246 drop at frame ' + drop + ': ' + r.maxJerk.toFixed(2)); }

