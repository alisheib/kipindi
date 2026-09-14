/**
 * needle-rest — E-400 ①: the parked Needle comes to rest where no control is under it, and the glide that takes it
 * there is reviewed FRAME BY FRAME, not photographed.
 *
 * Measured before (2026-09-14, session 96): at 360 and 768 the parked disc + tap pad covered a 12–16px strip of the
 * right edge at one fixed height, and sat on an interactive control in 6 of 40 samples. The fix glides it on the
 * engine's own park spring to the nearest clear rail position (snap under reduced motion). This drives the real
 * component and records `window.__needle` (the engine instance the host exposes) on every animation frame.
 *
 *   §1 GLIDE, frame by frame — placed over a control, a scroll-idle starts a glide that: stays on the rail (x fixed),
 *      never jumps (per-frame step and step-change bounded), never overshoots its rest by more than 3px, settles in
 *      under 1.5 s, travels at most a third of the viewport, ends with nothing under it, vibrates nothing, and does
 *      not move again on the next scroll-idle.
 *   §2 LEAVE IT ALONE — already clear: a scroll-idle does not move it. Held: no glide.
 *   §3 REDUCED MOTION — the same move is a one-frame snap, with no parking frames.
 *   §4 THE SWEEP — five pages × four scroll positions at 360 and 768, the session-96 population: after scroll-idle,
 *      count the samples where the footprint covers a control.
 *
 * Local only (drives /auth/demo).   BASE=http://localhost:3009 node scripts/needle-rest.test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}${extra ? ` ${extra}` : ""}`); } else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

for (let i = 0; i < 30; i++) { if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break; await wait(1500); }
const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});

/** In-page helpers, installed once per page: the same footprint and control census the host uses. */
const HELPERS = () => {
  const INTERACTIVE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="link"],[role="tab"],[role="switch"],[role="checkbox"],[role="menuitem"],[tabindex]:not([tabindex="-1"])';
  const root = document.getElementById("needle-root");
  // The footprint at the ENGINE's pose — the disc box, clipped to the viewport (the tap pad sits inside it on a side
  // rail). Not the DOM: a harness that moves the engine directly is ahead of the paint, and under reduced motion the
  // app's transition clamp makes a just-painted rect lag a frame.
  const fp = () => { const b = window.__needle; return { left: Math.max(0, b.x), right: Math.min(innerWidth, b.x + b.size), top: b.y, bottom: b.y + b.size }; };
  // The host's rule, restated here on purpose (a guard must not import the thing it checks): a control's CONTENT —
  // its text, icon or field — or the whole box of a small control (≤ 64px either way).
  const contentRects = (n) => {
    const r = n.getBoundingClientRect();
    if (r.width <= 64 || r.height <= 64 || n.matches("input,select,textarea")) return [r];
    const out = [];
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (!(t.textContent || "").trim() || t.parentElement?.closest("svg")) continue;
      range.selectNodeContents(t);
      for (const x of range.getClientRects()) if (x.width > 0) out.push(x);
    }
    for (const e of n.querySelectorAll("svg,img,video,canvas,input,select,textarea")) { if (!e.parentElement?.closest("svg")) out.push(e.getBoundingClientRect()); }
    return out;
  };
  const controls = () => [...document.querySelectorAll(INTERACTIVE)].filter((n) => !root.contains(n)).map((n) => ({ n, r: n.getBoundingClientRect(), cs: getComputedStyle(n) }))
    .filter(({ r, cs }) => r.width >= 1 && r.height >= 1 && cs.visibility !== "hidden" && cs.pointerEvents !== "none" && r.bottom > 0 && r.top < innerHeight);
  const hitsFp = (x, f) => x.width > 0 && x.left < f.right && x.right > f.left && x.top < f.bottom && x.bottom > f.top;
  window.__nr = {
    fp,
    covered: () => { const f = fp(); return controls().filter(({ n }) => contentRects(n).some((x) => hitsFp(x, f))).map(({ n }) => (n.textContent || n.getAttribute("aria-label") || n.tagName).trim().slice(0, 30)); },
    /** Content of a control reaching the strip the parked disc occupies, away from the top and bottom bars. */
    rightControl: () => {
      const f = fp();
      for (const { n } of controls()) for (const x of contentRects(n)) {
        if (x.right > f.left + 2 && x.left < f.right && x.top > 90 && x.bottom < innerHeight - 110) return { top: x.top, bottom: x.bottom, label: (n.textContent || "").trim().slice(0, 30) };
      }
      return null;
    },
    placeAt: (cy) => { const b = window.__needle; b.y = cy - b.size / 2; b.snapPark("right"); },
    record: (ms) => new Promise((res) => {
      const out = []; const t0 = performance.now(); const b = window.__needle;
      const step = (t) => { out.push({ t: t - t0, x: b.x, y: b.y, parked: b.parked, parking: b.parking }); if (t - t0 < ms) requestAnimationFrame(step); else res(out); };
      requestAnimationFrame(step);
    }),
  };
  let vib = 0; const orig = navigator.vibrate?.bind(navigator);
  navigator.vibrate = (...a) => { vib++; return orig ? orig(...a) : true; };
  window.__vib = () => vib;
};

async function openNeedlePage(width, height, path) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1024 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  // The Needle is on by default for a signed-in player; make sure a stored preference cannot hide it.
  await page.evaluate(() => { try { const k = "50pick.prefs"; const p = JSON.parse(localStorage.getItem(k) || "{}"); p.needleHidden = false; localStorage.setItem(k, JSON.stringify(p)); } catch {} });
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__needle)); i++) await wait(250);
  await wait(1500);
  await page.evaluate(HELPERS);
  return { ctx, page };
}

// ── §1 THE GLIDE, FRAME BY FRAME ─────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §1 the glide, frame by frame (360×740)");
{
  const { ctx, page } = await openNeedlePage(360, 740, "/markets");
  ok("precondition · the Needle is mounted", await page.evaluate(() => !!window.__needle));
  // Find a control under the rail at some scroll position.
  let target = null;
  for (const sy of [0, 200, 400, 700, 1000]) {
    await page.evaluate((y) => scrollTo(0, y), sy); await wait(900);
    target = await page.evaluate(() => window.__nr.rightControl());
    if (target) break;
  }
  ok("precondition · a control reaches the rail's strip", !!target, JSON.stringify(target));
  if (target) {
    const cy = (target.top + target.bottom) / 2;
    await page.evaluate((c) => { window.__nr.placeAt(c); }, cy);
    await wait(60);
    // Paint the placement without triggering the rest logic: a zero-length record frame is enough.
    await page.evaluate(() => window.__nr.record(40));
    const before = await page.evaluate(() => ({ covered: window.__nr.covered(), y: window.__needle.y, vib: window.__vib() }));
    ok("§1 precondition · placed, the footprint covers a control", before.covered.length > 0, JSON.stringify(before));
    // Scroll-idle: the host listens to scroll events in capture.
    const recP = page.evaluate(() => window.__nr.record(2200));
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const frames = await recP;
    const moving = frames.filter((f) => f.parking);
    const startIdx = frames.findIndex((f) => f.parking);
    const endIdx = frames.findIndex((f, i) => i > startIdx && startIdx >= 0 && f.parked && !f.parking);
    ok("§1 a glide starts within 400 ms of the scroll going idle", startIdx >= 0 && frames[startIdx].t < 400, `start=${frames[startIdx]?.t?.toFixed(0)}`);
    ok("§1 it settles back to parked in under 1.5 s", endIdx > startIdx && frames[endIdx].t - frames[startIdx].t < 1500, `dur=${endIdx > 0 ? (frames[endIdx].t - frames[startIdx].t).toFixed(0) : "never"}`);
    const x0 = frames[0].x;
    ok("§1 it stays on the rail (x never changes)", frames.every((f) => Math.abs(f.x - x0) < 0.5), `dx max=${Math.max(...frames.map((f) => Math.abs(f.x - x0))).toFixed(2)}`);
    const steps = frames.slice(1).map((f, i) => f.y - frames[i].y);
    const maxStep = Math.max(...steps.map(Math.abs));
    const maxJerk = Math.max(...steps.slice(1).map((s, i) => Math.abs(s - steps[i])));
    ok("§1 no frame jumps (per-frame step ≤ 24 px)", maxStep <= 24, `max=${maxStep.toFixed(2)}`);
    ok("§1 no teleport (change of step between frames ≤ 6 px)", maxJerk <= 6, `max=${maxJerk.toFixed(2)}`);
    const rest = frames[frames.length - 1].y;
    const dir = Math.sign(rest - before.y);
    const overshoot = Math.max(0, ...frames.map((f) => (f.y - rest) * dir));
    ok("§1 overshoot past the rest position ≤ 3 px", overshoot <= 3, `overshoot=${overshoot.toFixed(2)}`);
    ok("§1 it travels at most a third of the viewport", Math.abs(rest - before.y) <= 740 / 3 + 1, `moved=${(rest - before.y).toFixed(1)}`);
    const after = await page.evaluate(() => ({ covered: window.__nr.covered(), vib: window.__vib() }));
    ok("§1 at rest nothing interactive is under the footprint", after.covered.length === 0, JSON.stringify(after.covered));
    ok("§1 the glide vibrates nothing (the player did nothing)", after.vib === before.vib, `${before.vib} → ${after.vib}`);
    ok("§1 frames were really recorded (≥ 60 across the glide window)", frames.length >= 60 && moving.length >= 10, `${frames.length} frames, ${moving.length} moving`);
    // Stability: the next scroll-idle leaves it alone.
    const y1 = await page.evaluate(() => window.__needle.y);
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const again = await page.evaluate(() => window.__nr.record(900));
    ok("§1 the next scroll-idle does not move it again (no chained glide)", again.every((f) => Math.abs(f.y - y1) < 0.5 && !f.parking));
  }

  // ── §2 LEAVE IT ALONE ────────────────────────────────────────────────────────────────────────────────
  console.log("\n[needle-rest] §2 a clear rest and a held disc are left alone");
  await page.evaluate(() => scrollTo(0, 0)); await wait(900);
  let clearY = null;
  for (let cy = 140; cy < 600; cy += 20) {
    await page.evaluate((c) => window.__nr.placeAt(c), cy);
    await page.evaluate(() => window.__nr.record(40));
    if ((await page.evaluate(() => window.__nr.covered())).length === 0) { clearY = cy; break; }
  }
  ok("precondition · a clear rest position exists at the top of /markets", clearY !== null);
  if (clearY !== null) {
    const y0 = await page.evaluate(() => window.__needle.y);
    const recP = page.evaluate(() => window.__nr.record(900));
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const fr = await recP;
    ok("§2 already clear: a scroll-idle does not move it", fr.every((f) => Math.abs(f.y - y0) < 0.5 && !f.parking));
  }
  await ctx.close();
}

// ── §3 REDUCED MOTION ────────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §3 reduced motion: a snap, not a glide");
{
  const { ctx, page } = await openNeedlePage(360, 740, "/markets");
  await page.evaluate(() => document.documentElement.classList.add("kp-reduce-motion"));
  await wait(200);
  let target = null;
  for (const sy of [0, 200, 400, 700, 1000]) {
    await page.evaluate((y) => scrollTo(0, y), sy); await wait(900);
    target = await page.evaluate(() => window.__nr.rightControl());
    if (target) break;
  }
  if (target) {
    await page.evaluate((c) => window.__nr.placeAt(c), (target.top + target.bottom) / 2);
    await page.evaluate(() => window.__nr.record(40));
    const y0 = await page.evaluate(() => window.__needle.y);
    const recP = page.evaluate(() => window.__nr.record(900));
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const fr = await recP;
    const changed = fr.filter((f, i) => i > 0 && Math.abs(f.y - fr[i - 1].y) > 0.5);
    ok("§3 the move happens in ONE frame, with no parking frames", changed.length === 1 && fr.every((f) => !f.parking), `changes=${changed.length}`);
    ok("§3 …and ends clear", (await page.evaluate(() => window.__nr.covered())).length === 0 && Math.abs(fr[fr.length - 1].y - y0) > 1);
  } else ok("precondition · a control reaches the rail's strip (reduced motion)", false);
  await ctx.close();
}

// ── §4 THE SWEEP ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §4 the session-96 sweep: pages × scroll positions, after scroll-idle");
for (const [w, h] of [[360, 740], [768, 1024]]) {
  let samples = 0, covered = 0; const where = [];
  for (const path of ["/", "/markets", "/updown", "/live", "/results"]) {
    const { ctx, page } = await openNeedlePage(w, h, path);
    const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (const frac of [0, 0.33, 0.66, 1]) {
      await page.evaluate((y) => scrollTo(0, y), Math.round(maxY * frac));
      await wait(1900);  // scroll-idle (180 ms) + a glide (< 1.5 s)
      samples++;
      const c = await page.evaluate(() => window.__nr.covered());
      if (c.length) { covered++; where.push(`${path}@${Math.round(frac * 100)}%: ${c.join("|")}`); }
    }
    await ctx.close();
  }
  ok(`§4 ${w}px · no sample rests on a control (was 6 of 40 across 360 and 768)`, covered === 0, `${covered}/${samples} · ${where.join(" ; ")}`);
}

await browser.close();
console.log(`\n[needle-rest] ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILURES:"); for (const f of failures) console.log("  · " + f); process.exit(1); }
