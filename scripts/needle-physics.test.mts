/**
 * The Needle — physics torture gauntlet.
 *
 * The engine (src/lib/needle-physics.js) is a pure, deterministic, DOM-free rigid-disc
 * simulator, so it can be hammered head-less. This does not sample the behaviour — it
 * tries to BREAK it: every wall, every corner, interior/overlapping/enclosing obstacles,
 * the full spin range with every callback, restitution/energy laws, adversarial inputs
 * (NaN / Infinity / huge dt / degenerate viewports / inset overflow), resize storms, and
 * callback hygiene. Above all it proves THE signature invariant: however hard it is
 * thrown or spun, it comes to rest as the logo, exactly (rest angle a multiple of 360°).
 *
 * Run: npx tsx scripts/needle-physics.test.mts   (or: npm run test:needle)
 */
import { NeedleBody, CONST } from "../src/lib/needle-physics.js";

let failures = 0;
const fail = (m: string) => { failures++; console.log("  FAIL " + m); };
const pass = (m: string) => console.log("  PASS " + m);

let seed = 0x50f1c;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const rr = (a: number, b: number) => a + (b - a) * rnd();
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

const DT = 1000 / 60;
type Insets = { top: number; right: number; bottom: number; left: number };
type VP = { w: number; h: number; insets?: Insets };
const NO_INS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const VIEWPORTS: VP[] = [
  { w: 360, h: 640 }, { w: 390, h: 844 }, { w: 414, h: 896 }, { w: 768, h: 1024 },
  { w: 1024, h: 768 }, { w: 1280, h: 800 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
const EDGES = ["left", "right", "top", "bottom"];

type Rect = { x: number; y: number; w: number; h: number };
type Counts = { impact: number; cross: number; park: number; sleep: number; trued: number; detent: number; quarters: number; caught: number; interaction: number; record: number };
type Body = InstanceType<typeof NeedleBody>;

function diameterFor(vp: VP) { return Math.round(Math.max(56, Math.min(88, Math.min(vp.w, vp.h) * 0.155))); }

function make(vp: VP, obstacles?: Rect[] | (() => Rect[])) {
  const counts: Counts = { impact: 0, cross: 0, park: 0, sleep: 0, trued: 0, detent: 0, quarters: 0, caught: 0, interaction: 0, record: 0 };
  const impacts: Array<{ speed: number; nx: number; ny: number }> = [];
  const b: Body = new NeedleBody({
    size: 80,
    bounds: () => ({ w: vp.w, h: vp.h, insets: vp.insets ?? NO_INS }),
    obstacles: obstacles ? (typeof obstacles === "function" ? obstacles : () => obstacles) : null,
    onImpact: (i) => { counts.impact++; impacts.push({ speed: i.speed, nx: i.nx, ny: i.ny }); },
    onCross: () => counts.cross++,
    onPark: () => counts.park++,
    onSleep: () => counts.sleep++,
    onTrue: () => counts.trued++,
    onDetent: (s, q) => { counts.detent++; counts.quarters += q; void s; },
    onCatch: () => counts.caught++,
    onInteraction: () => counts.interaction++,
    onRecord: () => counts.record++,
  });
  b.setSize(diameterFor(vp));
  return { b, counts, impacts };
}

/** Inject free motion directly (a release), with no obstacle-free drag first. */
function launch(b: Body, vx: number, vy: number, w = 0) {
  b.held = null; b.parking = false; b.parked = false; b.target = null;
  b.vx = vx; b.vy = vy; b.w = w; b.settling = false; b.stillFor = 0;
  b.startRun();
}

function frameOk(b: Body, ctx: string): boolean {
  for (const [k, v] of Object.entries({ x: b.x, y: b.y, a: b.a, w: b.w, vx: b.vx, vy: b.vy })) {
    if (!Number.isFinite(v)) { fail(`${ctx}: non-finite ${k}=${v}`); return false; }
  }
  if (Math.abs(b.w) > CONST.MAX_ANG + 1e-9) { fail(`${ctx}: |w|=${b.w} > MAX_ANG`); return false; }
  return true;
}

function settle(b: Body, ctx: string, cap = 9000): number {
  let f = 0;
  for (; f < cap; f++) { b.advance(DT); if (!frameOk(b, ctx)) return f; if (!b.awake) break; }
  return f;
}

const restIsLogo = (b: Body) => Math.abs(((b.a % 360) + 360) % 360) < 1e-6;
const speed = (b: Body) => Math.hypot(b.vx, b.vy);
const nearestDist = (b: Body, r: Rect) => {
  const px = Math.max(r.x, Math.min(b.cx, r.x + r.w));
  const py = Math.max(r.y, Math.min(b.cy, r.y + r.h));
  return Math.hypot(b.cx - px, b.cy - py);
};

console.log("Needle physics torture gauntlet\n");

// ═══ 1. THE signature invariant, at scale: any throw/spin rests as the logo, exactly.
{
  let runs = 0, notParked = 0, notLogo = 0, frameFail = 0;
  for (let i = 0; i < 15000; i++) {
    const vp = pick(VIEWPORTS);
    const { b } = make(vp);
    b.calm = rnd() < 0.15 ? 0.34 : 1;             // exercise reduced-motion path too
    b.snapPark(pick(EDGES)); b.unpark();
    b.place(rr(0, vp.w - b.size), rr(0, vp.h - b.size));
    switch (Math.floor(rnd() * 5)) {
      case 0: launch(b, rr(-9, 9), rr(-9, 9)); break;
      case 1: launch(b, 0, 0, rr(-CONST.MAX_ANG, CONST.MAX_ANG)); break;
      case 2: launch(b, rr(-9, 9), rr(-9, 9), rr(-CONST.MAX_ANG, CONST.MAX_ANG)); break;
      case 3: b.flick(rr(1.2, 2.8) * (rnd() < 0.5 ? 1 : -1)); break;
      case 4: b.acknowledge(); break;
    }
    const before = failures;
    settle(b, "signature");
    if (failures > before) { frameFail++; continue; }
    runs++;
    if (!b.parked) notParked++;
    if (!restIsLogo(b)) notLogo++;
  }
  if (frameFail) fail(`${frameFail} runs hit a non-finite/limit error mid-flight`);
  if (notParked) fail(`${notParked}/${runs} did not come to rest (parked)`); else pass(`${runs} runs all came to rest, parked`);
  if (notLogo) fail(`${notLogo}/${runs} did NOT rest as the logo`); else pass(`${runs} runs all rest as the logo exactly (a % 360 === 0)`);
}

// ═══ 2. Determinism — identical inputs, identical final state.
{
  const run = () => {
    const { b } = make({ w: 1280, h: 800 });
    b.snapPark("right"); b.unpark(); b.place(400, 300);
    launch(b, 5, -3, 2.1); settle(b, "determinism");
    return `${b.x.toFixed(5)},${b.y.toFixed(5)},${b.a.toFixed(6)},${b.edge}`;
  };
  const a = run(), c = run();
  if (a === c) pass(`deterministic (${a})`); else fail(`non-deterministic: "${a}" vs "${c}"`);
}

// ═══ 3. EVERY wall: head-on bounce fires the right normal, never tunnels, never gains speed.
{
  const vp = { w: 1280, h: 800 };
  const targets: Record<string, { vx: number; vy: number; normal: [number, number] }> = {
    right:  { vx:  8, vy: 0, normal: [-1, 0] },
    left:   { vx: -8, vy: 0, normal: [ 1, 0] },
    bottom: { vx: 0, vy:  8, normal: [0, -1] },
    top:    { vx: 0, vy: -8, normal: [0,  1] },
  };
  let bad = 0;
  for (const [name, t] of Object.entries(targets)) {
    const { b, impacts } = make(vp);
    b.autoPark = false;
    b.place(vp.w / 2 - b.radius, vp.h / 2 - b.radius);
    let maxSpeed = 0, before = 0, after = -1;
    launch(b, t.vx, t.vy);
    before = speed(b);
    for (let f = 0; f < 500; f++) {
      const pre = speed(b);
      b.advance(DT);
      if (!frameOk(b, `wall-${name}`)) { bad++; break; }
      maxSpeed = Math.max(maxSpeed, speed(b));
      // capture speed just after the first registered impact
      if (impacts.length && after < 0) after = speed(b);
      // no tunnel: centre never leaves the travel box by more than a hair
      const L = b.limits();
      if (b.cx < L.minX + b.radius - 2 || b.cx > L.maxX + b.radius + 2 || b.cy < L.minY + b.radius - 2 || b.cy > L.maxY + b.radius + 2) { bad++; fail(`wall-${name}: escaped the box (cx=${b.cx.toFixed(1)}, cy=${b.cy.toFixed(1)})`); break; }
      if (!b.awake) break;
    }
    if (!impacts.length) { bad++; fail(`wall-${name}: no impact registered on a head-on throw`); continue; }
    const n = impacts[0];
    if (n.nx !== t.normal[0] || n.ny !== t.normal[1]) { bad++; fail(`wall-${name}: wrong normal (${n.nx},${n.ny}) expected (${t.normal})`); }
    if (after > before * CONST.RESTITUTION + 0.02) { bad++; fail(`wall-${name}: bounce gained energy (${before.toFixed(3)}→${after.toFixed(3)}, e=${CONST.RESTITUTION})`); }
    if (maxSpeed > b.maxLin() + 1e-6) { bad++; fail(`wall-${name}: speed exceeded maxLin`); }
  }
  if (bad === 0) pass("every wall: correct normal, no tunnel, restitution ≤ e, speed capped");
}

// ═══ 4. EVERY corner: diagonal slam resolves both axes and stays contained.
{
  const vp = { w: 1200, h: 760 };
  const corners: Array<[number, number]> = [[-9, -9], [9, -9], [-9, 9], [9, 9]];
  let bad = 0;
  for (const [vx, vy] of corners) {
    const { b } = make(vp); b.autoPark = false;
    b.place(vp.w / 2, vp.h / 2);
    launch(b, vx, vy);
    for (let f = 0; f < 700; f++) {
      b.advance(DT);
      if (!frameOk(b, "corner")) { bad++; break; }
      const L = b.limits();
      if (b.x < L.minX - 2 || b.x > L.maxX + 2 || b.y < L.minY - 2 || b.y > L.maxY + 2) { bad++; fail(`corner (${vx},${vy}): escaped`); break; }
      if (!b.awake) break;
    }
  }
  if (bad === 0) pass("every corner: both axes resolved, stays contained");
}

// ═══ 5. Interior obstacle: approached from all sides at max speed, never penetrates, never tunnels.
{
  const vp = { w: 1280, h: 800 };
  const obstacle: Rect = { x: 560, y: 340, w: 160, h: 120 };
  let worst = 0, tunnels = 0, nanRuns = 0, tested = 0;
  for (let i = 0; i < 1500; i++) {
    const { b } = make(vp, [obstacle]); b.autoPark = false;
    // start on a random side, aim through the obstacle centre at high speed
    const side = Math.floor(rnd() * 4);
    const cx = obstacle.x + obstacle.w / 2, cy = obstacle.y + obstacle.h / 2;
    let sx = cx, sy = cy;
    if (side === 0) sx = 120; else if (side === 1) sx = vp.w - 120; else if (side === 2) sy = 120; else sy = vp.h - 120;
    b.place(sx - b.radius, sy - b.radius);
    const dx = cx - b.cx, dy = cy - b.cy, d = Math.hypot(dx, dy) || 1;
    launch(b, (dx / d) * 8.5, (dy / d) * 8.5);
    tested++;
    let bad = false;
    for (let f = 0; f < 700; f++) {
      b.advance(DT);
      if (!frameOk(b, "obstacle")) { nanRuns++; bad = true; break; }
      const pen = b.radius - nearestDist(b, obstacle);   // >0 means overlapping
      if (pen > worst) worst = pen;
      if (pen > 4) { tunnels++; bad = true; break; }      // deep penetration = a swept failure
      if (!b.awake) break;
    }
    void bad;
  }
  if (nanRuns) fail(`interior obstacle: ${nanRuns} runs went non-finite`);
  if (tunnels) fail(`interior obstacle: ${tunnels}/${tested} penetrated > 4px (worst ${worst.toFixed(2)}px)`);
  else pass(`interior obstacle: ${tested} approaches, max penetration ${worst.toFixed(2)}px (≤ 4px), no tunnels`);
}

// ═══ 6. Overlapping / multiple obstacles + a disc SPAWNED INSIDE one: it escapes cleanly.
{
  const vp = { w: 1280, h: 800 };
  const field: Rect[] = [
    { x: 300, y: 200, w: 200, h: 160 }, { x: 420, y: 300, w: 180, h: 200 }, // overlapping pair
    { x: 800, y: 150, w: 120, h: 400 }, { x: 700, y: 500, w: 300, h: 90 },
  ];
  let bad = 0, escapes = 0, escapeFail = 0;
  for (let i = 0; i < 800; i++) {
    const { b } = make(vp, field); b.autoPark = false;
    if (rnd() < 0.5) {
      // spawn INSIDE a random obstacle — it must push itself out
      const o = pick(field);
      b.place(o.x + o.w / 2 - b.radius, o.y + o.h / 2 - b.radius);
      launch(b, rr(-2, 2), rr(-2, 2));
      escapes++;
      let out = false;
      for (let f = 0; f < 400; f++) {
        b.advance(DT); if (!frameOk(b, "field-inside")) { bad++; break; }
        if (field.every((r) => nearestDist(b, r) >= b.radius - 4)) { out = true; break; }
        if (!b.awake) break;
      }
      if (!out) escapeFail++;
    } else {
      // hurl it across the whole field
      b.place(rr(0, vp.w - b.size), rr(0, vp.h - b.size));
      launch(b, rr(-9, 9), rr(-9, 9), rr(-2, 2));
      for (let f = 0; f < 600; f++) {
        b.advance(DT); if (!frameOk(b, "field-cross")) { bad++; break; }
        for (const r of field) if (b.radius - nearestDist(b, r) > 5) { bad++; break; }
        if (!b.awake) break;
      }
    }
  }
  if (bad) fail(`overlapping field: ${bad} penetration/NaN failures`);
  else if (escapeFail) fail(`spawn-inside: ${escapeFail}/${escapes} failed to escape the obstacle`);
  else pass(`overlapping field + ${escapes} spawn-inside escapes: clean, no deep penetration`);
}

// ═══ 7. EVERY spin: full angular range → always rests on the logo; |w| never exceeds cap.
{
  let bad = 0, capBreach = 0;
  for (let k = 0; k <= 240; k++) {
    const w0 = -CONST.MAX_ANG + (2 * CONST.MAX_ANG) * (k / 240);
    const { b } = make(pick(VIEWPORTS));
    b.snapPark(pick(EDGES)); b.unpark(); b.place(500, 320);
    launch(b, 0, 0, w0);
    let breached = false;
    for (let f = 0; f < 9000; f++) { b.advance(DT); if (Math.abs(b.w) > CONST.MAX_ANG + 1e-9) breached = true; if (!frameOk(b, "spin")) { bad++; break; } if (!b.awake) break; }
    if (breached) capBreach++;
    if (!restIsLogo(b) || !b.parked) bad++;
  }
  if (capBreach) fail(`${capBreach} spins exceeded MAX_ANG`);
  if (bad === 0) pass("every spin across the full ±MAX_ANG range rests on the logo, cap respected");
  else fail(`${bad} spins failed to rest on the logo`);
}

// ═══ 8. Spin callbacks: cross at true, detents per quarter, correction fires onTrue, catch mid-spin.
{
  // Big spin → many crossings + many detents; ends corrected onto true.
  const { b, counts } = make({ w: 1280, h: 800 });
  b.snapPark("right"); b.unpark(); b.place(600, 380);
  launch(b, 0, 0, 2.6);
  const total0 = b.a;
  settle(b, "spin-cb");
  const totalRot = Math.abs(b.a - total0);
  if (counts.cross >= 1) pass(`onCross fired ${counts.cross}× through true during a long spin`); else fail("onCross never fired on a multi-turn spin");
  const expectQuarters = Math.floor(totalRot / 90);
  if (counts.quarters >= expectQuarters - 2 && counts.detent >= 1) pass(`onDetent fired per quarter (${counts.quarters} vs ~${expectQuarters} quarters)`); else fail(`onDetent miscounted: ${counts.quarters} vs ~${expectQuarters}`);
  if (restIsLogo(b)) pass("spin corrected exactly onto true (onTrue path)"); else fail("spin did not correct onto true");

  // Catch mid-spin fires onCatch; grabbing at rest does not.
  const s1 = make({ w: 1280, h: 800 }); s1.b.unpark(); s1.b.place(500, 300); launch(s1.b, 0, 0, 2.2); s1.b.advance(DT);
  s1.b.hold("spin");
  if (s1.counts.caught === 1) pass("catch mid-spin fires onCatch once"); else fail(`catch mid-spin: onCatch fired ${s1.counts.caught}×`);
  const s2 = make({ w: 1280, h: 800 }); s2.b.snapPark("right"); s2.b.hold("move");
  if (s2.counts.caught === 0) pass("grab at rest does NOT fire onCatch"); else fail("grab at rest wrongly fired onCatch");
  // small |w| never fires cross
  const s3 = make({ w: 1280, h: 800 }); s3.b.unpark(); s3.b.place(500, 300); launch(s3.b, 0, 0, 0.1); settle(s3.b, "slowspin");
  if (s3.counts.cross === 0) pass("a sub-threshold spin never fires onCross"); else fail(`slow spin wrongly fired onCross ${s3.counts.cross}×`);
}

// ═══ 9. Glancing wall hit converts tangential momentum into spin.
{
  let gained = 0, tested = 0;
  for (let i = 0; i < 200; i++) {
    const { b } = make({ w: 1280, h: 800 }); b.autoPark = false;
    b.place(1000, 380);
    launch(b, 7, rr(2, 6), 0);      // moving right + down, no initial spin, into the right wall
    tested++;
    let sawSpin = false;
    for (let f = 0; f < 200; f++) { b.advance(DT); if (Math.abs(b.w) > 0.05) sawSpin = true; if (!frameOk(b, "glance")) break; if (!b.awake) break; }
    if (sawSpin) gained++;
  }
  if (gained > tested * 0.8) pass(`glancing wall hits impart spin (${gained}/${tested})`); else fail(`glancing hits rarely imparted spin (${gained}/${tested})`);
}

// ═══ 10. Free body: angular speed only ever DECAYS without input (no spontaneous energy).
{
  let bad = 0;
  for (let i = 0; i < 200; i++) {
    const { b } = make({ w: 1280, h: 800 }); b.autoPark = false;
    b.place(600, 380); launch(b, 0, 0, rr(0.5, 2.6));
    let prev = Math.abs(b.w);
    for (let f = 0; f < 400; f++) {
      b.advance(DT);
      if (!frameOk(b, "decay")) break;
      // The critically-damped settle spring legitimately re-accelerates the needle onto
      // true (that correction is what lands it as the logo) — so the "no spontaneous
      // energy" law applies only to the FREE spin phase, before settling engages.
      if (b.settling) break;
      const cur = Math.abs(b.w);
      if (cur > prev + 1e-6) { bad++; break; }
      prev = cur;
      if (cur < 1e-4) break;
    }
  }
  if (bad === 0) pass("free angular speed monotonically decays (no spontaneous spin-up)"); else fail(`${bad} runs saw angular speed grow without input`);
}

// ═══ 11. Adversarial inputs: NaN/Infinity/huge-dt/zero-dt are sanitised, never propagate to rest.
{
  let bad = 0;
  const poisons = [NaN, Infinity, -Infinity, 1e30, -1e30];
  for (const p of poisons) {
    const { b } = make({ w: 1280, h: 800 });
    b.place(500, 300); launch(b, 3, -2, 1.5);
    b.x = p; b.y = p; b.a = p; b.w = p; b.vx = p; b.vy = p;   // poison every field
    for (let f = 0; f < 60; f++) b.advance(DT);
    if (!frameOk(b, `poison-${p}`)) { bad++; continue; }
    settle(b, `poison-settle-${p}`);
    if (!restIsLogo(b)) { bad++; fail(`poison ${p}: did not recover to the logo`); }
  }
  // huge / zero / negative frame dt
  for (const dt of [10000, 0, -50, 1e9]) {
    const { b } = make({ w: 1280, h: 800 });
    b.place(500, 300); launch(b, 8, 8, 2.5);
    for (let f = 0; f < 200; f++) b.advance(dt);
    if (!frameOk(b, `dt-${dt}`)) { bad++; continue; }
    settle(b, `dt-settle-${dt}`);
    if (!restIsLogo(b)) { bad++; fail(`dt ${dt}: did not settle to the logo`); }
  }
  if (bad === 0) pass("adversarial state/dt (NaN, ∞, 1e30, huge/zero/negative dt) all sanitise & recover");
  else fail(`${bad} adversarial cases failed to recover`);
}

// ═══ 12. Degenerate viewports & inset overflow never NaN or hang.
{
  let bad = 0;
  const degenerate: VP[] = [
    { w: 1, h: 1 }, { w: 0, h: 0 }, { w: 320, h: 100 }, { w: 100, h: 900 },
    { w: 400, h: 400, insets: { top: 500, right: 500, bottom: 500, left: 500 } }, // insets > viewport
    { w: 360, h: 640, insets: { top: 300, right: 200, bottom: 300, left: 200 } },
  ];
  for (const vp of degenerate) {
    const { b } = make(vp);
    b.snapPark(pick(EDGES)); b.unpark(); b.place(rr(0, Math.max(0, vp.w)), rr(0, Math.max(0, vp.h)));
    launch(b, rr(-9, 9), rr(-9, 9), rr(-2.8, 2.8));
    const before = failures; settle(b, `degenerate-${vp.w}x${vp.h}`, 3000);
    if (failures > before) { bad++; continue; }
    // limits must stay coherent: maxX ≥ minX
    const L = b.limits();
    if (!(L.maxX >= L.minX && L.maxY >= L.minY)) { bad++; fail(`degenerate ${vp.w}x${vp.h}: incoherent limits`); }
  }
  // hostile setSize values
  const { b } = make({ w: 1280, h: 800 });
  for (const s of [0, -10, NaN, Infinity, 1e9]) b.setSize(s as number);
  if (Number.isFinite(b.size) && b.size > 0) pass("degenerate viewports, inset overflow & hostile setSize stay finite & coherent");
  else { bad++; }
  if (bad) fail(`${bad} degenerate cases failed`);
}

// ═══ 13. Responsiveness: a resize STORM mid-flight keeps it clamped and still ends on the logo.
{
  let bad = 0;
  for (let i = 0; i < 400; i++) {
    let vp: VP = pick(VIEWPORTS);
    const b = new NeedleBody({ size: diameterFor(vp), bounds: () => ({ w: vp.w, h: vp.h, insets: vp.insets ?? NO_INS }) });
    b.snapPark(pick(EDGES)); b.unpark(); b.place(rr(0, vp.w - b.size), rr(0, vp.h - b.size));
    launch(b, rr(-9, 9), rr(-9, 9), rr(-2.8, 2.8));
    for (let f = 0; f < 2500; f++) {
      // A realistic resize/orientation BURST (rapid events for ~1s) then quiet — real
      // browsers fire a flurry during a drag/rotate and then stop. The object must stay
      // finite and clamped throughout and converge onto the logo once the burst ends.
      if (f < 300 && f % 7 === 0) { vp = pick(VIEWPORTS); b.setSize(diameterFor(vp)); b.reclamp(); }
      b.advance(DT);
      if (!frameOk(b, "resize-storm")) { bad++; break; }
      if (!b.awake) break;
    }
    if (!restIsLogo(b) || !b.parked) { bad++; }
  }
  if (bad === 0) pass("resize storm mid-flight: stays finite, clamped, and rests on the logo");
  else fail(`${bad} resize-storm runs failed`);
}

// ═══ 14. Callback hygiene: onInteraction fires ONCE per interaction (the 342× double-count bug).
{
  let bad = 0;
  for (let i = 0; i < 300; i++) {
    const { b, counts } = make(pick(VIEWPORTS));
    b.snapPark("right"); b.unpark(); b.place(400, 300);
    launch(b, rr(3, 9), rr(-9, 9), rr(0.5, 2.6));   // a real interaction (turns/bounces)
    settle(b, "interaction-count");
    if (counts.interaction > 1) { bad++; fail(`onInteraction fired ${counts.interaction}× for ONE interaction`); break; }
    if (counts.sleep < 1) { bad++; fail("onSleep never fired after settling"); break; }
  }
  if (bad === 0) pass("onInteraction fires exactly once per interaction; onSleep fires on rest");
}

// ═══ 15. Soak: 5,000 interleaved operations on ONE body never corrupt state; ends on the logo.
{
  const { b } = make({ w: 1440, h: 900 });
  let corrupt = false;
  for (let i = 0; i < 5000 && !corrupt; i++) {
    switch (Math.floor(rnd() * 6)) {
      case 0: b.unpark(); b.place(rr(0, 1360), rr(0, 820)); launch(b, rr(-9, 9), rr(-9, 9)); break;
      case 1: b.unpark(); b.flick(rr(-CONST.MAX_ANG, CONST.MAX_ANG)); break;
      case 2: b.hold(pick(["move", "spin"])); b.dragBy(rr(-200, 200), rr(-200, 200)); b.release([], b.held ?? "move"); break;
      case 3: b.acknowledge(); break;
      case 4: b.setSize(pick([56, 60, 72, 80, 88])); break;
      case 5: b.parkTo(pick(EDGES)); break;
    }
    const runFor = Math.floor(rr(1, 120));
    for (let f = 0; f < runFor; f++) { b.advance(DT); if (!frameOk(b, "soak")) { corrupt = true; break; } if (!b.awake) break; }
  }
  if (!corrupt) { settle(b, "soak-final"); if (restIsLogo(b) && b.parked) pass("5,000 interleaved operations: never corrupted, ended on the logo"); else fail("soak ended in a non-logo/unparked state"); }
  else fail("soak corrupted state");
}

// ═══ 16. App-chrome insets + sides-only parking: it NEVER rests under the top bar/bottom nav.
//    Mirrors the host (needle.tsx): a phone with a 56px top bar + 96px bottom nav fed as
//    insets, and nearestEdge overridden to left/right only. From any throw/spin it must park
//    on a side rail with the WHOLE disc inside the content band (clear of both bars).
{
  const vp = { w: 390, h: 844, insets: { top: 56, right: 0, bottom: 96, left: 0 } };
  let bad = 0, topBottom = 0, underChrome = 0;
  for (let i = 0; i < 2500; i++) {
    const { b } = make(vp);
    b.nearestEdge = () => { const L = b.limits(); return (b.cx - L.minX) <= ((L.maxX + b.size) - b.cx) ? "left" : "right"; };
    b.snapPark(pick(["left", "right"])); b.unpark();
    b.place(rr(0, vp.w - b.size), rr(0, vp.h - b.size));
    launch(b, rr(-9, 9), rr(-9, 9), rr(-2.8, 2.8));
    settle(b, "chrome");
    if (!b.parked) { bad++; continue; }
    if (b.edge === "top" || b.edge === "bottom") topBottom++;
    // whole disc (cy ± radius) must sit inside [insetTop, h - insetBottom]
    if (b.cy - b.radius < vp.insets.top - 1 || b.cy + b.radius > vp.h - vp.insets.bottom + 1) underChrome++;
  }
  if (bad) fail(`chrome: ${bad} did not park`);
  if (topBottom) fail(`chrome: ${topBottom} parked on top/bottom (must be sides only)`);
  else pass("app-chrome: always parks on a side rail, never top/bottom");
  if (underChrome) fail(`chrome: ${underChrome} rested with the disc under the top bar / bottom nav`);
  else pass("app-chrome: the whole disc always rests inside the content band (never under a bar)");

  // Free motion must also never cross into the chrome bands (it bounces off them like walls).
  let breach = 0;
  for (let i = 0; i < 400; i++) {
    const { b } = make(vp); b.autoPark = false;
    b.place(rr(0, vp.w - b.size), rr(vp.insets.top, vp.h - vp.insets.bottom - b.size));
    launch(b, rr(-9, 9), rr(-9, 9), rr(-2.8, 2.8));
    for (let f = 0; f < 900; f++) {
      b.advance(DT); if (!frameOk(b, "chrome-free")) { breach++; break; }
      if (!b.held && !b.parking && !b.parked && (b.y < vp.insets.top - 1 || b.y + b.size > vp.h - vp.insets.bottom + 1)) { breach++; break; }
      if (!b.awake) break;
    }
  }
  if (breach === 0) pass("app-chrome: free motion never crosses into the top-bar / bottom-nav bands"); else fail(`${breach} runs crossed into a chrome band while free`);
}

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
