/**
 * qa:hover-touch — A TAP LEAVES NO LIFT AND PLAYS NO SHEEN; A MOUSE HOVER STILL DOES (MASWALI-BUILD S5-FIX-PLATFORM D11;
 * the motion critic's M1 and L6, 2026-10-21; `test:hover-touch` holds the CSS).
 *
 *   BASE=http://localhost:3501 node scripts/qa-hover-touch.mjs
 *
 * On a page of the running site it places the kit's own controls — a `.btn btn-primary` and a struck-gilt `.btn gilt-metal`
 * — so the app's real stylesheets answer, then:
 *   1. TOUCH (a phone: hasTouch, isMobile, 360×780): taps each; the button rests (no transform) and no `shimmer-gilt`
 *      animation runs at the tap or after it — on touch a `:hover` sticks to the tapped element, which kept a tapped
 *      answer lifted 2px and played the commit's sheen at the press;
 *   2. MOUSE (1280×900): hovers each; the button lifts (`--m-lift`) and the gilt plays its once-only sheen — the pointer's
 *      hover is untouched;
 *   3. PLANT: the lift written as it stood (outside `@media (hover: hover)`) is injected on the touch page, and the tap's
 *      lift is seen — so check 1 can fail.
 * ⭐ ROUND 2 (2026-10-22): the same for the three tints D11 had left out — a `.btn-ghost`, a `.btn-claret` and a
 * `.btn-aqua-ghost`: on touch a tapped one keeps the face it has at rest (its fill, edge, glow and filter), with a mouse
 * a hover still tints it, and the ghost's tint written as it stood is seen on a tap (so the touch check can fail).
 * Read-only: it changes nothing on the site; the controls live in that page alone.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0;
const fails = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};

/** The two kit controls, fixed at the top left so a pointer can reach them over the page. */
async function placeControls(page) {
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "kp-qa-hover";
    host.style.cssText = "position:fixed;left:16px;top:120px;z-index:2147483647;display:flex;flex-direction:column;gap:16px";
    host.innerHTML = '<button type="button" class="btn btn-primary btn-md" id="kp-qa-btn">Lift</button>'
      + '<button type="button" class="btn gilt-metal btn-md" id="kp-qa-gilt">Sheen</button>'
      + '<button type="button" class="btn btn-ghost btn-md" id="kp-qa-ghost">Ghost</button>'
      + '<button type="button" class="btn btn-claret btn-md" id="kp-qa-claret">Claret</button>'
      + '<button type="button" class="btn btn-aqua-ghost btn-md" id="kp-qa-aqua">Aqua</button>';
    document.body.appendChild(host);
  });
}
/** What the control shows now: its computed transform, whether it stands LIFTED (moved up: the matrix's ty below 0; the
 *  press's scale is the tap's own answer and is not a lift) and whether the gilt sheen animation is running on it. */
const stateOf = (page, id) => page.evaluate((sel) => {
  const el = document.getElementById(sel);
  const cs = getComputedStyle(el);
  const sheen = el.getAnimations().some((a) => a.animationName === "shimmer-gilt" && a.playState !== "finished");
  const m = /^matrix\(([^)]+)\)$/.exec(cs.transform);
  const ty = m ? Number(m[1].split(",")[5]) : 0;
  return { transform: cs.transform, sheen, lifted: ty < -0.5 };
}, id);
const settle = (page, ms) => page.waitForTimeout(ms);
const TINTS = ["kp-qa-ghost", "kp-qa-claret", "kp-qa-aqua"];
/** A tint's face: what its hover changes (fill, edge, glow, filter). */
const faceOf = (page, id) => page.evaluate((sel) => {
  const cs = getComputedStyle(document.getElementById(sel));
  return { bg: cs.backgroundColor, border: cs.borderTopColor, shadow: cs.boxShadow, filter: cs.filter };
}, id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const browser = await chromium.launch();
try {
  // ── 1 · touch ──
  const touch = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const tp = await touch.newPage();
  await tp.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await tp.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  const hoverMedia = await tp.evaluate(() => matchMedia("(hover: hover)").matches);
  ok("PREMISE · the touch page reports no hover-capable pointer", hoverMedia === false, `(hover: hover) = ${hoverMedia}`);
  await placeControls(tp);
  const touchSeen = {};
  for (const id of ["kp-qa-btn", "kp-qa-gilt"]) {
    await tp.tap(`#${id}`);
    await settle(tp, 60);
    const early = await stateOf(tp, id);
    await settle(tp, 400);
    const late = await stateOf(tp, id);
    touchSeen[id] = { early, late };
  }
  ok("1.1 · a tapped button rests: no lift at the tap or after it", !touchSeen["kp-qa-btn"].early.lifted && !touchSeen["kp-qa-btn"].late.lifted, JSON.stringify(touchSeen["kp-qa-btn"]));
  ok("1.2 · a tapped struck-gilt control rests and plays no sheen", !touchSeen["kp-qa-gilt"].early.lifted && !touchSeen["kp-qa-gilt"].late.lifted
    && !touchSeen["kp-qa-gilt"].early.sheen && !touchSeen["kp-qa-gilt"].late.sheen, JSON.stringify(touchSeen["kp-qa-gilt"]));
  for (const id of TINTS) {
    const rest = await faceOf(tp, id);
    await tp.tap(`#${id}`);
    await settle(tp, 400);
    const after = await faceOf(tp, id);
    ok(`1.3 · a tapped ${id.replace("kp-qa-", "")} button keeps its face at rest: no fill, edge or glow sticks to it`, same(rest, after), JSON.stringify({ rest, after }));
  }
  // ── 3 · plant: the lift as it stood ──
  await tp.addStyleTag({ content: ".btn:hover:not(:disabled) { transform: translateY(var(--m-lift)); }" });
  await tp.tap("#kp-qa-gilt"); // move the sticky hover away, then back
  await tp.tap("#kp-qa-btn");
  await settle(tp, 400);
  const planted = await stateOf(tp, "kp-qa-btn");
  ok("3.1 · PLANT · the ungated lift injected, the tap's lift is seen (so 1.1 can fail)", planted.lifted, JSON.stringify(planted));
  {
    await tp.tap("#kp-qa-btn"); // the sticky hover off the ghost first
    await settle(tp, 300);
    const rest = await faceOf(tp, "kp-qa-ghost");
    await tp.addStyleTag({ content: ".btn-ghost:hover:not(:disabled) { background: oklch(40% 0.07 264 / 0.35); border-color: var(--border-strong); }" });
    await tp.tap("#kp-qa-ghost");
    await settle(tp, 400);
    const after = await faceOf(tp, "kp-qa-ghost");
    ok("3.2 · PLANT · the ghost's tint injected as it stood, a tap leaves the fill on it (so 1.3 can fail)", !same(rest, after), JSON.stringify({ rest, after }));
  }
  await touch.close();

  // ── 2 · mouse ──
  const mouse = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mp = await mouse.newPage();
  await mp.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await mp.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  ok("PREMISE · the mouse page reports a hover-capable pointer", await mp.evaluate(() => matchMedia("(hover: hover)").matches));
  await placeControls(mp);
  await mp.hover("#kp-qa-btn");
  await settle(mp, 300);
  const liftOnHover = await stateOf(mp, "kp-qa-btn");
  await mp.hover("#kp-qa-gilt");
  await settle(mp, 80);
  const giltOnHover = await stateOf(mp, "kp-qa-gilt");
  ok("2.1 · a mouse hover still lifts the button", liftOnHover.lifted, JSON.stringify(liftOnHover));
  ok("2.2 · a mouse hover still lifts struck gilt and plays its sheen", giltOnHover.lifted && giltOnHover.sheen, JSON.stringify(giltOnHover));
  for (const id of TINTS) {
    await mp.mouse.move(1200, 860);
    await settle(mp, 300);
    const rest = await faceOf(mp, id);
    await mp.hover(`#${id}`);
    await settle(mp, 300);
    const hovered = await faceOf(mp, id);
    ok(`2.3 · a mouse hover still tints the ${id.replace("kp-qa-", "")} button`, !same(rest, hovered), JSON.stringify({ rest, hovered }));
  }
  await mouse.close();
} finally {
  await browser.close();
}
console.log(`\nqa:hover-touch: ${pass} passed, ${fails.length} failed`);
process.exitCode = fails.length ? 1 : 0;
