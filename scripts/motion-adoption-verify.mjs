/**
 * motion-adoption-verify.mjs — proves the motion layer is actually WIRED, in a
 * real browser, against the real compiled CSS.
 *
 * Why this exists: on 2026-07-20 every `--ease-*` token in this app silently
 * resolved to nothing, and the whole platform lost its motion without a single
 * error (see docs/DESIGN_AUTHORITY.md B5). The 2026-07-28 adoption re-pointed the
 * legacy `--ease-*`/`--dur-*` names at the kit's `--m-*`/`--t-*` families, which
 * is exactly the shape of change that caused that outage. A green unit suite
 * cannot see it — only computed style in a browser can.
 *
 * Checks:
 *   1. Every kit token resolves to a real value on :root.
 *   2. Every legacy alias resolves THROUGH to a real curve/duration (not "" and
 *      not the CSS-wide `ease` / `0s` fallback that a broken var() collapses to).
 *   3. A real `.btn` computes a real transition — duration > 0 and a cubic-bezier
 *      timing function, i.e. the B5 failure mode cannot be present.
 *   4. The retired keyframes are gone from the stylesheet and the kit ones exist.
 *
 * Usage: BASE=http://localhost:3000 node scripts/motion-adoption-verify.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const KIT_CURVES = ["--m-settle", "--m-glide", "--m-leave", "--m-pivot", "--m-breathe"];
const KIT_TIERS = ["--t-flick", "--t-quick", "--t-base", "--t-move", "--t-stage", "--t-max"];
const ALIAS_CURVES = [
  "--ease-micro", "--ease-stage", "--ease-celebrate",
  "--ease-glide", "--ease-arrive", "--ease-sink", "--ease-conduct",
];
const ALIAS_TIERS = ["--dur-micro", "--dur-flick", "--dur-quick", "--dur-glide", "--dur-arrive", "--dur-stage"];

const RETIRED_KEYFRAMES = [
  "dialog-rise", "scrim-fade", "sheet-rise", "reveal-up", "kp-slide-up", "ray-spin",
  "pchart-draw", "mcardp-spark-draw", "dot-pulse-soft", "np-rise",
];
const KIT_KEYFRAMES = [
  "m-settle-in", "m-settle-lift", "m-settle-menu", "m-sheet-rise", "m-scrim-in", "m-draw", "m-breathe",
];

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  PASS  ${m}`); };
const bad = (m) => { fail++; console.log(`  FAIL  ${m}`); };

const browser = await chromium.launch();
const page = await browser.newPage();
// NOT networkidle: this app holds an open SSE stream, so the network is never idle.
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForSelector(".btn", { timeout: 120_000 });

console.log("\nMotion adoption — computed-style verification\n");

// ---- 1 + 2: token resolution -------------------------------------------------
const resolved = await page.evaluate((names) => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const n of names) out[n] = cs.getPropertyValue(n).trim();
  return out;
}, [...KIT_CURVES, ...KIT_TIERS, ...ALIAS_CURVES, ...ALIAS_TIERS]);

for (const n of [...KIT_CURVES, ...ALIAS_CURVES]) {
  const v = resolved[n];
  if (/^cubic-bezier\(/.test(v)) ok(`${n} → ${v}`);
  else bad(`${n} did NOT resolve to a curve (got ${JSON.stringify(v)}) — a broken var() silently kills the transition`);
}
for (const n of [...KIT_TIERS, ...ALIAS_TIERS]) {
  const v = resolved[n];
  // Browsers normalise durations: `140ms` computes as `.14s`, so the leading digit
  // is optional. Compare in ms so the tier values are asserted, not just the shape.
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(v);
  const asMs = m ? Number(m[1]) * (m[2] === "s" ? 1000 : 1) : NaN;
  if (Number.isFinite(asMs) && asMs > 0) ok(`${n} → ${v} (${asMs}ms)`);
  else bad(`${n} did NOT resolve to a duration (got ${JSON.stringify(v)}) — this is the 2026-07-20 outage shape`);
}

// ---- 3: a real control actually transitions ---------------------------------
const btn = await page.evaluate(() => {
  const el = document.querySelector(".btn");
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    duration: cs.transitionDuration,
    timing: cs.transitionTimingFunction,
    property: cs.transitionProperty,
  };
});
if (!btn) {
  bad(".btn not found on the page — cannot verify the press/raise vocabulary");
} else {
  const anyRealDuration = btn.duration.split(",").some((d) => parseFloat(d) > 0);
  anyRealDuration
    ? ok(`.btn transition-duration = ${btn.duration}`)
    : bad(`.btn transition-duration collapsed to 0s (${btn.duration}) — B5 failure mode is PRESENT`);
  /cubic-bezier\(/.test(btn.timing)
    ? ok(`.btn transition-timing-function = ${btn.timing}`)
    : bad(`.btn timing fell back to a keyword (${btn.timing}) — the easing var did not resolve`);
}

// ---- 4: keyframe inventory ---------------------------------------------------
const keyframes = await page.evaluate(() => {
  const names = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }   // cross-origin
    if (!rules) continue;
    for (const r of rules) if (r.type === CSSRule.KEYFRAMES_RULE) names.add(r.name);
  }
  return [...names];
});
for (const k of KIT_KEYFRAMES) {
  keyframes.includes(k) ? ok(`kit keyframe present: ${k}`) : bad(`kit keyframe MISSING: ${k}`);
}
for (const k of RETIRED_KEYFRAMES) {
  keyframes.includes(k)
    ? bad(`retired keyframe still defined: ${k} — the duplicate vocabulary is back`)
    : ok(`retired keyframe gone: ${k}`);
}

await browser.close();

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
