/**
 * motion-adoption-shots.mjs — visual evidence for the 2026-07-28 motion adoption.
 *
 * Motion cannot be judged from a settled screenshot, so this captures the states
 * that actually changed, INCLUDING mid-flight frames of the dialog arrival (the
 * biggest change: the Modal primitive moved off its own inline keyframes onto the
 * kit's .m-dialog-in / .m-scrim).
 *
 * Usage: BASE=http://localhost:3000 node scripts/motion-adoption-shots.mjs
 * Writes to docs/shots-motion/ (gitignored). LOOK AT THEM.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "docs/shots-motion";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Seed + sign in the same way the platform sweep does.
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali" } });
await page.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} });
await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 });

const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log(`  shot  ${name}.png`);
};

const visit = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1200);   // let the route-enter settle
};

console.log("\nMotion adoption — visual evidence\n");

// ---- resting states at two widths -------------------------------------------
for (const [w, h, tag] of [[1280, 900, "1280"], [360, 780, "360"]]) {
  await page.setViewportSize({ width: w, height: h });
  await visit("/");
  await shot(`home-${tag}`);
  await visit("/markets");
  await shot(`markets-${tag}`);
}

// ---- the dialog arrival, mid-flight -----------------------------------------
// Renders the kit's dialog + scrim exactly as the Modal primitive composes them,
// then samples the animation while it is still travelling. A settled screenshot
// would prove nothing about the curve.
await page.setViewportSize({ width: 1280, height: 900 });
await visit("/");
await page.evaluate(() => {
  const host = document.createElement("div");
  host.id = "motion-probe";
  host.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center";
  host.innerHTML = `
    <div class="m-scrim" style="position:fixed;inset:0;background:rgba(0,0,0,.6)"></div>
    <div class="m-dialog-in" style="position:relative;width:360px;padding:20px;border-radius:16px;
         border:1px solid var(--border-strong);background:var(--bg-elevated);
         box-shadow:0 30px 80px oklch(5% .05 264 / .65)">
      <p style="font-family:var(--font-mono);font-size:10px;letter-spacing:.16em;
                text-transform:uppercase;color:var(--text-subtle);font-weight:700">Confirm</p>
      <h2 style="font-family:var(--font-display);font-size:18px;font-weight:700;
                 color:var(--text);margin-top:2px">Place this wager?</h2>
      <p style="font-size:13.5px;color:var(--text-muted);margin-top:10px">
        The kit dialog + scrim, composed exactly as the Modal primitive does.</p>
      <button class="btn btn-primary btn-md" style="width:100%;margin-top:16px">Confirm</button>
    </div>`;
  document.body.appendChild(host);
});
// Sampling by wall-clock is useless here: a screenshot round-trip costs more than
// the 340ms arrival, so every frame lands post-settle. Pause the animations and
// scrub them by `currentTime` instead — deterministic, exact frames of the curve.
const probeInfo = await page.evaluate(() => {
  const anims = document.getElementById("motion-probe").getAnimations({ subtree: true });
  anims.forEach((a) => a.pause());
  return anims.map((a) => ({
    name: a.animationName ?? "(unnamed)",
    duration: a.effect.getTiming().duration,
    easing: a.effect.getTiming().easing,
  }));
});
console.log("  probe animations:", JSON.stringify(probeInfo));
if (probeInfo.length === 0) {
  console.log("  ⚠️  NO animations on the probe — .m-dialog-in/.m-scrim are not animating!");
}
for (const t of [0, 85, 170, 340]) {
  await page.evaluate((ms) => {
    document.getElementById("motion-probe")
      .getAnimations({ subtree: true })
      .forEach((a) => { a.currentTime = ms; });
  }, t);
  await shot(`dialog-t${String(t).padStart(3, "0")}`);
}
await page.evaluate(() => document.getElementById("motion-probe")?.remove());

// ---- button hover / press ----------------------------------------------------
await visit("/");
const btn = page.locator(".btn").first();
if (await btn.count()) {
  await btn.hover();
  await page.waitForTimeout(220);
  await shot("btn-hover", { clip: await btn.boundingBox().then((b) => b && {
    x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 24), width: b.width + 48, height: b.height + 48 }) });
}

await browser.close();
console.log(`\nWrote ${OUT}/ — open the PNGs.\n`);
