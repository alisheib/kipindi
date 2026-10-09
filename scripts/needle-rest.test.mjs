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
 *      under 1.5 s, travels at most a third of the viewport, ends with nothing under it and no control within 4px,
 *      vibrates nothing, and does not move again on the next scroll-idle. (M7: the change-of-step detail names the two
 *      frame intervals around its worst value, so a dropped frame reads apart from uneven stepping.)
 *   §2 LEAVE IT ALONE — clear of everything by the glow's 4px (a clean room): a scroll-idle does not move it.
 *   §3 REDUCED MOTION — the same move is a one-frame snap, with no parking frames.
 *   §4 THE SWEEP — five pages × four scroll positions at 360 and 768, the session-96 population: after scroll-idle,
 *      count the samples where the footprint covers a control.
 *   ⭐ 2026-10-09 · R3-B (the Vodacom visual pass, round 3 — `lib/needle-rest.ts` has the measurements). In a CLEAN
 *   ROOM (every element of the page hidden but the Needle and what the section plants, so the only thing near the
 *   rail is the thing under test), at 390 × 780 and 1024 × 900:
 *   §5 THE CLEARANCE — a control 2px from the disc (257), a line of text 1px from it (194), a painted roundel whose
 *      ring is inside the clearance while its glyphs are not (301 309 310) and a 16px icon each move it, to a rest
 *      clear of the GLOW by 4px; CONTROLS: the control just past that clearance, and the roundel without its paint,
 *      leave it where it is.
 *   §6 AN OPEN SURFACE — a floating panel (role=dialog, data-needle-keepout) appearing over the parked disc, with no
 *      scroll at all, moves it off the panel's whole box by the glow's 4px (321); CONTROL: one on the far half of the
 *      viewport does not.
 *   §7 A RESIZE MID-GLIDE — 390 → 1024, 1024 → 390, and on the left rail: from the resize on, EVERY frame is tucked
 *      half off its own edge (the centre on the viewport's edge), it rests there, and the stored edge is that edge
 *      (295 296 299 304 307 315: wholly inside, mid-page, and parked on the left).
 *   §8 A SCROLL MID-GLIDE — the page moves under a glide so that its target is no longer clear: the landing re-checks
 *      and the disc ends clear (257 265 273); then no further glide. `window.needle.resting()` is false while the
 *      glide is in flight and true once it has landed.
 *   ⭐ 2026-10-09 · R4-B (round 4, tile 313: the chat bubble drawn over the parked disc's lower-left). At 320 × 780,
 *   390 × 780 and 1024 × 900, the clean room with the chat bubble let back in (ChatRoot's own; a stand-in with its
 *   markup and box where the chatbot is off):
 *   §9 THE CHAT BUBBLE — a disc parked 17px into the bubble's ink (313's overlap) moves to a rest clear of the bubble's
 *      ink — its box where it stands SHOWN, grown by the pulse ring at its widest — by the glow's 4px, with the bubble
 *      SHOWN, FADED AT REST (D75, `data-fab-idle`) and FADED MID-SCROLL (D3, `data-scrolling`): both fades are
 *      `pointer-events: none`, which the control census skips, and a faded bubble returns on any touch. Then no further
 *      glide. A bubble ARRIVING over a parked disc moves it with no scroll at all (ChatRoot is a lazy overlay).
 *      CONTROLS: a disc clear of the ink by the clearance and 2px stays; a disc on the LEFT rail at the same height stays.
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

/** In-page helpers, installed once per page: the same footprint and census the host uses. */
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
  // 2026-10-08 · G1 [193] · the host's SECOND rule, restated the same way: visible text outside any control (the
  // /markets stat line the disc rested on) is under it too, measured with the host's own 4px floor. The host
  // prunes its walk for speed; this walks every text node, so it can only find MORE than the host does.
  const textCovered = () => {
    const f = fp(); const C = 4; const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      const p = t.parentElement;
      if (!p || !(t.textContent || "").trim() || root.contains(p) || p.closest(`svg,script,style,noscript,template,${INTERACTIVE}`)) continue;
      range.selectNodeContents(t);
      const rects = [...range.getClientRects()].filter((x) => x.width > 1 && x.height > 1
        && x.left < f.right + C && x.right > f.left - C && x.top < f.bottom + C && x.bottom > f.top - C);
      const seen = p.checkVisibility
        ? p.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })
        : getComputedStyle(p).visibility === "visible";
      if (rects.length && seen) out.push(t.textContent.trim().slice(0, 30));
    }
    return out;
  };
  // ⭐ R3-B · the host's glow, restated: the wake halo is a circle `size·(1 + 2h)` across, breathing to 1.06 of it
  // (needle.css), h = −`--halo`/100 — so it reaches (1.06·(½ + h) − ½)·size past the disc's box.
  const glow = () => {
    const b = window.__needle;
    const v = parseFloat(document.querySelector("#needle-root #needle").style.getPropertyValue("--halo"));
    return Math.max(0, (1.06 * (0.5 + -v / 100) - 0.5) * b.size);
  };
  /** The gap from the footprint to a box, along the axis that separates them (negative = they overlap). */
  const gapOf = (r) => { const f = fp(); return Math.max(r.left - f.right, f.left - r.right, r.top - f.bottom, f.top - r.bottom); };
  window.__nr = {
    fp,
    glow,
    covered: () => { const f = fp(); return controls().filter(({ n }) => contentRects(n).some((x) => hitsFp(x, f))).map(({ n }) => (n.textContent || n.getAttribute("aria-label") || n.tagName).trim().slice(0, 30)); },
    /** Controls whose content (or whole small box) is within `pad` of the footprint — every tier keeps 4px. */
    nearControls: (pad) => controls().filter(({ n }) => contentRects(n).some((x) => x.width > 0 && gapOf(x) < pad)).map(({ n }) => (n.textContent || n.tagName).trim().slice(0, 30)),
    textCovered,
    /** Content of a control reaching the strip the parked disc occupies, away from the top and bottom bars. */
    rightControl: () => {
      const f = fp();
      for (const { n } of controls()) for (const x of contentRects(n)) {
        if (x.right > f.left + 2 && x.left < f.right && x.top > 90 && x.bottom < innerHeight - 110) return { top: x.top, bottom: x.bottom, label: (n.textContent || "").trim().slice(0, 30) };
      }
      return null;
    },
    placeAt: (cy, edge = "right") => { const b = window.__needle; b.y = cy - b.size / 2; b.snapPark(edge); },
    record: (ms) => new Promise((res) => {
      const out = []; const t0 = performance.now(); const b = window.__needle;
      const step = (t) => { out.push({ t: t - t0, x: b.x, y: b.y, size: b.size, vw: innerWidth, edge: b.edge, parked: b.parked, parking: b.parking, resting: window.needle?.resting?.() ?? null }); if (t - t0 < ms) requestAnimationFrame(step); else res(out); };
      requestAnimationFrame(step);
    }),
    /** ⭐ R3-B · THE CLEAN ROOM: every element hidden (visibility — the layout stays) but the Needle and the plants. */
    clean: () => {
      const s = document.createElement("style");
      s.id = "nr-clean";
      s.textContent = "body * { visibility: hidden !important; } #needle-root, #needle-root *, .nr-plant, .nr-plant * { visibility: visible !important; }";
      document.head.appendChild(s);
    },
    /** A fixed element from `html`, styled by `css`, marked as a plant. */
    plant: (html, css) => {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const el = holder.firstElementChild;
      el.classList.add("nr-plant");
      Object.assign(el.style, { position: "fixed", zIndex: "10", margin: "0", boxSizing: "border-box" }, css);
      document.body.appendChild(el);
      return el.getBoundingClientRect().toJSON();
    },
    unplant: () => { for (const e of document.querySelectorAll(".nr-plant")) e.remove(); },
    move: (sel, css) => { Object.assign(document.querySelector(sel).style, css); return document.querySelector(sel).getBoundingClientRect().toJSON(); },
    /** The gap from the footprint to a plant's box, or to its text's own box (`text`). */
    gap: (sel, mode = "box") => {
      const el = document.querySelector(sel);
      if (mode === "text") { const rg = document.createRange(); rg.selectNodeContents(el); return gapOf(rg.getBoundingClientRect()); }
      return gapOf(el.getBoundingClientRect());
    },
    textRight: (sel) => { const rg = document.createRange(); rg.selectNodeContents(document.querySelector(sel)); return rg.getBoundingClientRect().right; },
    /** The gap from the footprint to a box handed in (R4-B: the bubble's ink where it stands shown). */
    gapBox: (r) => gapOf(r),
    storedEdge: () => { try { return JSON.parse(localStorage.getItem("50pick.needle.pos") || "null")?.edge ?? null; } catch { return null; } },
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
/** Until `window.needle.resting()` (needle.tsx): tucked, no check pending, no glide, the loop asleep. */
const waitRest = (page, ms = 4000) => page.waitForFunction(() => !!window.needle && window.needle.resting() === true, null, { timeout: ms, polling: 50 }).then(() => true, () => false);
/** A scroll-idle, as the host hears one (it listens to scroll events in capture), then its rest. */
const kick = async (page) => { await page.evaluate(() => document.dispatchEvent(new Event("scroll"))); await wait(60); return waitRest(page); };
/** A clean room at `w × h` on /markets, the Needle placed at `cy`. */
async function cleanRoom(w, h) {
  const { ctx, page } = await openNeedlePage(w, h, "/markets");
  await page.evaluate(() => scrollTo(0, 0)); await wait(400);
  await page.evaluate(() => window.__nr.clean());
  await wait(300);
  return { ctx, page };
}
const place = async (page, cy, edge = "right") => { await page.evaluate(([c, e]) => window.__nr.placeAt(c, e), [cy, edge]); await page.evaluate(() => window.__nr.record(40)); return page.evaluate(() => window.__nr.fp()); };

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
    const jerks = steps.slice(1).map((s, i) => Math.abs(s - steps[i]));
    const maxJerk = Math.max(...jerks);
    // M7 (2026-10-09): the limit is unchanged; the detail now names the two steps and the two frame intervals around the
    // worst change, so a frame the browser dropped (an interval near 33 ms) reads apart from uneven stepping on even
    // frames (the 3-substeps-then-1 the host's glide had before M7; `test:needle-host` §5 replays both).
    const at = jerks.indexOf(maxJerk);
    const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t);
    ok("§1 no frame jumps (per-frame step ≤ 24 px)", maxStep <= 24, `max=${maxStep.toFixed(2)}`);
    ok("§1 no teleport (change of step between frames ≤ 6 px)", maxJerk <= 6,
      `max=${maxJerk.toFixed(2)} (steps ${steps[at]?.toFixed(2)} → ${steps[at + 1]?.toFixed(2)} px over frames of ${gaps[at]?.toFixed(1)} → ${gaps[at + 1]?.toFixed(1)} ms)`);
    const rest = frames[frames.length - 1].y;
    const dir = Math.sign(rest - before.y);
    const overshoot = Math.max(0, ...frames.map((f) => (f.y - rest) * dir));
    ok("§1 overshoot past the rest position ≤ 3 px", overshoot <= 3, `overshoot=${overshoot.toFixed(2)}`);
    ok("§1 it travels at most a third of the viewport", Math.abs(rest - before.y) <= 740 / 3 + 1, `moved=${(rest - before.y).toFixed(1)}`);
    const after = await page.evaluate(() => ({ covered: window.__nr.covered(), near: window.__nr.nearControls(4), vib: window.__vib() }));
    ok("§1 at rest nothing interactive is under the footprint", after.covered.length === 0, JSON.stringify(after.covered));
    ok("§1 …and no control within 4px of it (every tier keeps 4px off a control — R3-B)", after.near.length === 0, JSON.stringify(after.near));
    ok("§1 the glide vibrates nothing (the player did nothing)", after.vib === before.vib, `${before.vib} → ${after.vib}`);
    ok("§1 frames were really recorded (≥ 60 across the glide window)", frames.length >= 60 && moving.length >= 10, `${frames.length} frames, ${moving.length} moving`);
    // Stability: the next scroll-idle leaves it alone.
    const y1 = await page.evaluate(() => window.__needle.y);
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const again = await page.evaluate(() => window.__nr.record(900));
    ok("§1 the next scroll-idle does not move it again (no chained glide)", again.every((f) => Math.abs(f.y - y1) < 0.5 && !f.parking));
  }
  await ctx.close();
}

// ── §2 LEAVE IT ALONE ────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §2 a rest clear of everything is left alone (clean room, 360×740)");
{
  // R3-B: the host's best tier is clear of the GLOW by 4px, and it prefers that over a 4px rest within reach — so "already
  // clear" is now measured in a clean room, where nothing is near the rail but the page's hidden layout.
  const { ctx, page } = await cleanRoom(360, 740);
  await place(page, 360);
  const y0 = await page.evaluate(() => window.__needle.y);
  const recP = page.evaluate(() => window.__nr.record(900));
  await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
  const fr = await recP;
  ok("§2 already clear: a scroll-idle does not move it", fr.every((f) => Math.abs(f.y - y0) < 0.5 && !f.parking));
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

// ── §5 THE CLEARANCE ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §5 the clearance: what touches the disc moves it clear of the glow (clean room)");
for (const [W, H] of [[390, 780], [1024, 900]]) {
  const { ctx, page } = await cleanRoom(W, H);
  const pad = (await page.evaluate(() => window.__nr.glow())) + 4;
  console.log(`  · ${W}×${H}: the glow reaches ${(pad - 4).toFixed(1)}px past the disc; the clearance is ${pad.toFixed(1)}px`);
  /** Place at 400, plant, scroll-idle, rest: where it ended, and the plant's gap. */
  const trial = async (label, html, css, { mode = "box", expect }) => {
    const f = await place(page, 400);
    const planted = await page.evaluate(([h, c]) => window.__nr.plant(h, c), [html, css(f)]);
    await wait(80);
    const y0 = await page.evaluate(() => window.__needle.y);
    const rested = await kick(page);
    const end = await page.evaluate((m) => ({ y: window.__needle.y, parked: window.__needle.parked, gap: window.__nr.gap(".nr-plant", m) }), mode);
    const moved = Math.abs(end.y - y0) > 1;
    if (expect === "move") ok(`§5 ${W} · ${label} moves it, to a rest whose gap is ≥ ${pad.toFixed(1)}px`, rested && end.parked && moved && end.gap >= pad - 0.5, JSON.stringify({ planted, ...end }));
    else ok(`§5 ${W} · CONTROL · ${label} leaves it where it is`, rested && !moved, JSON.stringify({ planted, ...end }));
    await page.evaluate(() => window.__nr.unplant());
  };
  const midOf = (f) => `${f.top + (f.bottom - f.top) / 2 - 20}px`;
  await trial("a control 2px from the disc (257: the preview pill)", '<button type="button">Toka kwenye onyesho</button>',
    (f) => ({ left: `${f.left - 2 - 160}px`, top: midOf(f), width: "160px", height: "40px" }), { expect: "move" });
  await trial("a control just past the clearance", '<button type="button">Toka kwenye onyesho</button>',
    (f) => ({ left: `${f.left - pad - 1 - 160}px`, top: midOf(f), width: "160px", height: "40px" }), { expect: "stay" });
  await trial("a line of text 1px from the disc (194: the stat line)", "<p>40 hai · TZS 49K katika mchezo</p>",
    (f) => ({ right: `${W - (f.left - 1)}px`, top: midOf(f), whiteSpace: "nowrap", font: "13px sans-serif" }), { mode: "text", expect: "move" });
  // The roundel: its ring 2px inside the clearance, its glyphs outside it — the painted box is the ink (301 309 310).
  const roundel = (paint) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px",
    borderRadius: "50%", font: "600 11px sans-serif", border: paint ? "1.5px solid rgb(150, 160, 190)" : "0" });
  for (const paint of [true, false]) {
    const f = await place(page, 400);
    await page.evaluate(([c]) => window.__nr.plant("<span>18+</span>", c), [{ ...roundel(paint), left: `${f.left - pad + 2 - 28}px`, top: midOf(f) }]);
    const glyphsOut = await page.evaluate(([l, p]) => window.__nr.textRight(".nr-plant") < l - p, [f.left, pad]);
    ok(`§5 ${W} · precondition · the roundel's glyphs sit outside the clearance (only its ${paint ? "ring" : "box"} reaches in)`, glyphsOut);
    const y0 = await page.evaluate(() => window.__needle.y);
    const rested = await kick(page);
    const y1 = await page.evaluate(() => window.__needle.y);
    if (paint) ok(`§5 ${W} · a painted roundel whose ring is inside the clearance moves it (its ring is its ink)`, rested && Math.abs(y1 - y0) > 1, `${y0} → ${y1}`);
    else ok(`§5 ${W} · CONTROL · the same text in an unpainted box leaves it where it is`, rested && Math.abs(y1 - y0) <= 1, `${y0} → ${y1}`);
    await page.evaluate(() => window.__nr.unplant());
  }
  await trial("a 16px icon 2px from the disc (small media are content)", '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="rgb(150,160,190)"></circle></svg>',
    (f) => ({ left: `${f.left - 2 - 16}px`, top: `${f.top + 20}px`, width: "16px", height: "16px" }), { expect: "move" });
  await ctx.close();
}

// ── §6 AN OPEN SURFACE ───────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §6 an open surface over the parked disc moves it, with no scroll at all (clean room, 390×780)");
{
  const { ctx, page } = await cleanRoom(390, 780);
  const pad = (await page.evaluate(() => window.__nr.glow())) + 4;
  for (const far of [false, true]) {
    const f = await place(page, 400);
    await wait(1200);   // the placement's own checks are long done
    const y0 = await page.evaluate(() => window.__needle.y);
    await page.evaluate(([c]) => window.__nr.plant('<div role="dialog" aria-modal="false" data-needle-keepout="">Fuata 50pick</div>', c),
      [{ left: "12px", right: far ? "50%" : "12px", top: `${f.top - 100}px`, height: "220px", background: "rgb(20, 22, 70)" }]);
    await wait(120);
    const rested = await waitRest(page, 4000);
    const end = await page.evaluate(() => ({ y: window.__needle.y, gap: window.__nr.gap(".nr-plant") }));
    if (!far) ok(`§6 321 · a panel opening over the disc moves it off the panel's whole box, gap ≥ ${pad.toFixed(1)}px — no scroll was dispatched`,
      rested && Math.abs(end.y - y0) > 1 && end.gap >= pad - 0.5, JSON.stringify({ y0, ...end }));
    else ok("§6 CONTROL · a panel on the far half of the viewport leaves it where it is", rested && Math.abs(end.y - y0) <= 1, JSON.stringify({ y0, ...end }));
    await page.evaluate(() => window.__nr.unplant());
    await wait(600);
  }
  await ctx.close();
}

// ── §7 A RESIZE MID-GLIDE ────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §7 a resize mid-glide re-seats the disc on its own edge, every frame (clean room)");
for (const [from, to, edge] of [[[390, 780], [1024, 900], "right"], [[1024, 900], [390, 780], "right"], [[390, 780], [1024, 900], "left"]]) {
  const { ctx, page } = await cleanRoom(from[0], from[1]);
  const f = await place(page, 400, edge);
  // A control touching the disc on the inner side, so a scroll-idle starts a glide.
  const innerX = edge === "right" ? f.left - 2 - 120 : f.right + 2;
  await page.evaluate(([c]) => window.__nr.plant('<button type="button">Toka</button>', c), [{ left: `${innerX}px`, top: `${f.top + 10}px`, width: "120px", height: "40px" }]);
  await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
  await wait(330);
  const inFlight = await page.evaluate(() => window.__needle.parking);
  ok(`§7 ${edge} ${from[0]} → ${to[0]} · precondition · a glide is in flight when the viewport changes`, inFlight);
  const recP = page.evaluate(() => window.__nr.record(2500));
  await wait(50);
  await page.setViewportSize({ width: to[0], height: to[1] });
  const frames = (await recP).filter((fr) => fr.vw === to[0]);
  const off = frames.filter((fr) => (edge === "right" ? Math.abs(fr.x + fr.size / 2 - fr.vw) >= 0.5 : Math.abs(fr.x + fr.size / 2) >= 0.5));
  ok(`§7 ${edge} ${from[0]} → ${to[0]} · from the resize on, every frame is tucked half off the ${edge.toUpperCase()} edge (295 296 299 304 307)`,
    frames.length >= 30 && off.length === 0, `${frames.length} frames; first off: ${JSON.stringify(off[0] ?? null)}`);
  const rested = await waitRest(page);
  const end = await page.evaluate(() => ({ parked: window.__needle.parked, edge: window.__needle.edge, stored: window.__nr.storedEdge() }));
  ok(`§7 ${edge} ${from[0]} → ${to[0]} · it rests there, and the stored edge is ${edge} (no later page opens it on the other side)`,
    rested && end.parked && end.edge === edge && end.stored === edge, JSON.stringify(end));
  await ctx.close();
}

// ── §8 A SCROLL MID-GLIDE ────────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §8 the page moves under a glide: the landing re-checks (clean room, 390×780)");
{
  const { ctx, page } = await cleanRoom(390, 780);
  const pad = (await page.evaluate(() => window.__nr.glow())) + 4;
  const f = await place(page, 400);
  await page.evaluate(([c]) => window.__nr.plant('<button type="button" id="nr-p">Toka kwenye onyesho</button>', c), [{ left: `${f.left - 2 - 160}px`, top: `${f.top + 10}px`, width: "160px", height: "40px" }]);
  await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
  await wait(300);
  const flight = await page.evaluate(() => ({ parking: window.__needle.parking, resting: window.needle.resting(), target: window.__needle.target }));
  ok("§8 precondition · a glide is in flight, and `resting()` says so", flight.parking && flight.resting === false && !!flight.target, JSON.stringify(flight));
  if (flight.target) {
    // The page moves under it: the control now stands where the glide is heading, and the scroll is heard mid-glide.
    await page.evaluate(([y]) => window.__nr.move("#nr-p", { top: `${y + 10}px` }), [flight.target.y]);
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const rested = await waitRest(page, 6000);
    const end = await page.evaluate(() => ({ y: window.__needle.y, gap: window.__nr.gap("#nr-p"), resting: window.needle.resting() }));
    ok(`§8 257 · it does not stay where the old page sent it: at rest it clears the control by ≥ ${pad.toFixed(1)}px, and resting() is true`,
      rested && end.resting === true && end.gap >= pad - 0.5, JSON.stringify({ target: flight.target.y, ...end }));
    const y1 = end.y;
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const again = await page.evaluate(() => window.__nr.record(900));
    ok("§8 …and the next scroll-idle does not move it again (no chain)", again.every((fr) => Math.abs(fr.y - y1) < 0.5 && !fr.parking));
  }
  await ctx.close();
}

// ── §9 THE CHAT BUBBLE ───────────────────────────────────────────────────────────────────────────────
console.log("\n[needle-rest] §9 the chat bubble is cleared by the glow's 4px, shown or faded (clean room, the bubble let back in)");
for (const [W, H] of [[320, 780], [390, 780], [1024, 900]]) {
  const { ctx, page } = await cleanRoom(W, H);
  const pad = (await page.evaluate(() => window.__nr.glow())) + 4;
  const size = await page.evaluate(() => window.__needle.size);
  // D75's own nap (3s untouched) must have come first: from then on nothing here rouses the bubble (a synthetic scroll
  // on `document` never reaches scroll-cast's window listeners), so the states set below are the only ones in play.
  const napped = await page.waitForFunction(() => document.documentElement.hasAttribute("data-fab-idle"), null, { timeout: 6000, polling: 100 }).then(() => true, () => false);
  ok(`§9 ${W} · precondition · D75's fade came on its own after 3s untouched, so its timer is spent`, napped);
  const setFades = (attrs) => page.evaluate(async (a) => {
    const html = document.documentElement;
    for (const k of ["data-fab-idle", "data-scrolling"]) html.toggleAttribute(k, a.includes(k));
    await new Promise((r) => setTimeout(r, 400));   // past the fade's --t-quick transition
    const fab = document.querySelector(".cm-fab");
    if (!fab) return null;
    const s = getComputedStyle(fab);
    return { opacity: s.opacity, pointerEvents: s.pointerEvents };
  }, attrs);
  await setFades([]);
  // Where the bubble stands SHOWN — ChatRoot's own, measured with neither fade on <html>; or, where the chatbot is off,
  // ChatRoot's numbers (16px from the right, 80 above a phone's rail / 16 on a desktop; 44px / 56px) for a stand-in.
  const house = await page.evaluate(() => !!document.querySelector(".cm-fab .cm-bubble"));
  const side = W < 1024 ? 44 : 56, lift = W < 1024 ? 80 : 16;
  const box = house
    ? await page.evaluate(() => document.querySelector(".cm-fab .cm-bubble").getBoundingClientRect().toJSON())
    : { left: W - 16 - side, right: W - 16, top: H - lift - side, bottom: H - lift };
  // Its ink, restated here (a guard must not import what it checks): the pulse ring (chat-styles.css, `.cm-bubble::after`,
  // inset −3px) at the peak of `cm-bubble-ring` (scale 1.08) — 5px round the 44px bubble, 5.5 round the 56px one.
  const past = (s) => (s / 2 + 3) * 1.08 - s / 2;
  const ink = { left: box.left - past(box.right - box.left), right: box.right + past(box.right - box.left), top: box.top - past(box.bottom - box.top), bottom: box.bottom + past(box.bottom - box.top) };
  console.log(`  · ${W}×${H}: ${house ? "ChatRoot's bubble" : "a stand-in for the bubble (the chatbot is off here)"} at x${box.left}–${box.right} y${box.top}–${box.bottom}, its ink from y${ink.top.toFixed(1)}; the clearance is ${pad.toFixed(1)}px`);
  const standIn = `<div class="cm-fab"><button type="button" class="cm-bubble${W < 1024 ? " cm-bubble-mobile" : ""}" aria-label="Help"></button></div>`;
  const standInCss = { right: "16px", bottom: `${lift}px`, zIndex: "60" };
  // 313's overlap: the disc's box from 17px above the ink's top edge, 39px into it at 320.
  const under = ink.top - 17 + size / 2;

  // A BUBBLE ARRIVING over a parked disc (the clean room still hides ChatRoot's, so the census sees none until it lands).
  {
    const f = await place(page, under);
    await wait(1200);
    const y0 = await page.evaluate(() => window.__needle.y);
    ok(`§9 ${W} · precondition · with no bubble to see, the disc stays where it was put, 17px above the ink's top edge`, Math.abs(y0 - f.top) < 0.5, JSON.stringify({ placed: f.top, y0 }));
    await page.evaluate(([h, c]) => window.__nr.plant(h, c), [standIn, standInCss]);
    await wait(120);
    const rested = await waitRest(page, 4000);
    const end = await page.evaluate((b) => ({ y: window.__needle.y, gap: window.__nr.gapBox(b) }), ink);
    ok(`§9 ${W} · a bubble ARRIVING over the parked disc moves it — no scroll dispatched — clear of its ink by ≥ ${pad.toFixed(1)}px`,
      rested && Math.abs(end.y - y0) > 1 && end.gap >= pad - 0.5, JSON.stringify({ y0, ...end }));
    await page.evaluate(() => window.__nr.unplant());
    await wait(600);
  }

  // The bubble in view for the rest of the section: ChatRoot's let back in, or the stand-in kept.
  if (house) await page.evaluate(() => { const s = document.createElement("style"); s.id = "nr-bubble-in"; s.textContent = ".cm-fab, .cm-fab * { visibility: visible !important; }"; document.head.appendChild(s); });
  else await page.evaluate(([h, c]) => window.__nr.plant(h, c), [standIn, standInCss]);

  for (const [label, attrs] of [["SHOWN", []], ["FADED AT REST (D75, data-fab-idle)", ["data-fab-idle"]], ["FADED MID-SCROLL (D3, data-scrolling)", ["data-scrolling"]]]) {
    const look = await setFades(attrs);
    const faded = attrs.length > 0;
    ok(`§9 ${W} · precondition · the bubble is ${label}`,
      !!look && (faded ? look.opacity === "0" && look.pointerEvents === "none" : look.opacity === "1" && look.pointerEvents !== "none"), JSON.stringify(look));
    const f = await place(page, under);
    await wait(80);
    const y0 = await page.evaluate(() => window.__needle.y);
    const rested = await kick(page);
    const end = await page.evaluate((b) => ({ y: window.__needle.y, parked: window.__needle.parked, gap: window.__nr.gapBox(b) }), ink);
    ok(`§9 ${W} · ${label} · a disc 17px above the bubble's ink edge, overlapping it (313), moves to a rest clear of the ink where it stands shown by ≥ ${pad.toFixed(1)}px`,
      rested && end.parked && Math.abs(end.y - y0) > 1 && end.gap >= pad - 0.5, JSON.stringify({ placed: f.top, y0, ...end }));
    await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
    const again = await page.evaluate(() => window.__nr.record(900));
    ok(`§9 ${W} · ${label} · …and the next scroll-idle does not move it again (no chain)`, again.every((fr) => Math.abs(fr.y - end.y) < 0.5 && !fr.parking));
  }

  await setFades([]);
  {
    const f = await place(page, ink.top - pad - 2 - size / 2);
    const y0 = await page.evaluate(() => window.__needle.y);
    const rested = await kick(page);
    const end = await page.evaluate((b) => ({ y: window.__needle.y, gap: window.__nr.gapBox(b) }), ink);
    ok(`§9 ${W} · CONTROL · a disc clear of the bubble's ink by ${(pad + 2).toFixed(1)}px stays where it is`, rested && Math.abs(end.y - y0) <= 1, JSON.stringify({ placed: f.top, y0, ...end }));
  }
  {
    await place(page, under, "left");
    const y0 = await page.evaluate(() => window.__needle.y);
    const rested = await kick(page);
    const y1 = await page.evaluate(() => window.__needle.y);
    ok(`§9 ${W} · CONTROL · on the LEFT rail at the same height the bubble is nothing to the disc: it stays`, rested && Math.abs(y1 - y0) <= 1, `${y0} → ${y1}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n[needle-rest] ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILURES:"); for (const f of failures) console.log("  · " + f); process.exit(1); }
