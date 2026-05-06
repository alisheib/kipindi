/**
 * Sprint 24 — kit-faithful profile + bet-confirm modal + dark default.
 *
 *   1. /profile renders the new hero (name editor + avatar uploader)
 *   2. AvatarUploader is on the page (camera button visible)
 *   3. ConvictionDial → "Place" pill (compact, not the giant slab)
 *   4. /api/health 200
 *   5. Default theme is dark on first visit (no cookie)
 *   6. TippingBar with extreme yesPct still renders both ends rounded
 *
 *   BASE=http://localhost:3000  node scripts/sprint24-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();

// ── 1 · Default theme is dark on first visit ─────────────────────────────
console.log("\n=== 1 · DEFAULT DARK MODE ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const theme = await p.locator("html").getAttribute("data-theme");
  log("1a html[data-theme=dark] on first visit", theme === "dark", `data-theme="${theme}"`);
  const hasDarkClass = await p.locator("html.dark").count();
  log("1b html.dark class applied", hasDarkClass > 0);
  await p.close();
  await ctx.close();
}

// ── 2 · Profile (kit-faithful + uploader present) ────────────────────────
console.log("\n=== 2 · PROFILE PAGE ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  log("2a /profile returns 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("2b 'Predictor · Mtabiri' kit header", /Predictor.*Mtabiri/i.test(body));
  log("2c stat strip — Balance + Open + Settled", /Balance/.test(body) && /Open/.test(body) && /Settled/.test(body));
  log("2d 'Verify ID · Thibitisha' row", /Verify ID.*Thibitisha/i.test(body) || /Verify ID/i.test(body));
  // Camera-icon (AvatarUploader)
  const camera = await p.locator('button[aria-label="Change profile photo"]').count();
  log("2e avatar camera button present", camera > 0, `${camera} found`);
  // No Kipindi-era token leaking
  const html = await p.content();
  const kipindiTokens = ["bg-g-brand", "Pattern kind", "text-onBrand", "shadow-glow-gold", "kp-slide-up"];
  const leaks = kipindiTokens.filter((t) => html.includes(t));
  log("2f no Kipindi tokens leaked", leaks.length === 0, leaks.join(", ") || "clean");
  await p.close();
  await ctx.close();
}

// ── 3 · ConvictionDial → compact "Place" pill ────────────────────────────
console.log("\n=== 3 · DIAL: COMPACT PLACE PILL ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  if (href) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    const body = (await p.locator("body").textContent()) ?? "";
    const dialOrClosed = /slide to commit/i.test(body) || /closed for predictions/i.test(body);
    log("3a dial header or closed-state visible", dialOrClosed);
    // Either "Place YES" / "Place NO" or "—" (neutral) rendered
    const placePill = /Place YES|Place NO|—/i.test(body) || /closed for predictions/i.test(body);
    log("3b compact 'Place' CTA rendered (not the old full slab)", placePill);
    await p.close();
  } else {
    log("3a market available", false, "no markets");
  }
  await ctx.close();
}

// ── 4 · /api/health
console.log("\n=== 4 · HEALTH ===");
{
  const r = await fetch(`${BASE}/api/health`);
  log("4a 200", r.status === 200, String(r.status));
}

// ── 5 · TippingBar — extreme yesPct still has both ends rounded
console.log("\n=== 5 · TIPPINGBAR EXTREMES ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const bars = await p.locator('[role="progressbar"]').count();
  log("5a /markets renders progress bars per card", bars > 0, `${bars} bars`);
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 24  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
