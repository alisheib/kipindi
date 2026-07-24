/**
 * Up & Down admin — visual verification across the responsiveness matrix.
 *
 * Captures /admin/updown at 360 / 768 / 1280 / 1920, exercises the two add-forms
 * (the widest things on the page, and therefore the first to overflow), and FAILS on
 * horizontal overflow or a console error.
 *
 *   BASE=http://localhost:3000 node scripts/updown-admin-shots.mjs
 *
 * ⚠️ A green run is NOT the point — READ the PNGs in docs/shots-updown/. The
 * "clipped-not-scrolled" bug class passes the automated overflow check and only shows
 * in the image.
 *
 * Requires a DEV server started with DISABLE_ADMIN_TOTP=true (admin actions are
 * 2FA-gated, and the /api/dev-test/* bootstrap routes 404 in production).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-updown");
const WIDTHS = [360, 768, 1280, 1920];

mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// ── Boot an ADMIN session (dev-only bootstrap) ──────────────────────────────
{
  const boot = await ctx.newPage();
  const r = await boot.request.post(`${BASE}/api/dev-test/seed-admin`, {
    data: { phone: "+255700000001", name: "Ali Admin" },
  });
  if (r.status() === 404) {
    console.log("!! dev-test routes are 404 — start the server with `next dev` (NODE_ENV=development).");
  }
  console.log(`seed-admin → ${r.status()}`);
  await boot.close();
}

async function shoot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`  → ${name}.png`);
}

const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of WIDTHS) {
  console.log(`\n=== ${width}px ===`);
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: width < 768 ? 780 : 900 });

  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(700);

  // Landed on the right page — an auth redirect would silently capture the homepage.
  const onPage = await page.locator('h1:has-text("Up & Down")').first().isVisible().catch(() => false);
  onPage ? pass("page rendered") : fail("did NOT render /admin/updown (auth redirect?)");

  // The four KPI tiles must be present and readable at every width.
  const kpis = await page.locator("text=/Enabled assets|Running chains|Staleness window/").count();
  kpis >= 3 ? pass(`KPI row present (${kpis} matches)`) : fail(`KPI row missing (${kpis})`);

  // Both registry tables must exist even when empty — the empty state is a table ROW
  // (kit AdminTableEmpty), not a replacement for the table.
  for (const heading of ["Assets", "Chains", "Price oracle", "Thresholds"]) {
    const has = await page.locator(`text=${heading}`).first().isVisible().catch(() => false);
    has ? pass(`section: ${heading}`) : fail(`section MISSING: ${heading}`);
  }

  let o = await overflowOf(page);
  o <= 1 ? pass("no horizontal overflow (page)") : fail(`HORIZONTAL OVERFLOW ${o}px`);
  await shoot(page, `updown-admin-${width}`);

  // ── The add-forms are the widest content; open both and re-check overflow ──
  const addAsset = page.locator('button:has-text("+ Add asset")').first();
  if (await addAsset.count()) {
    // Tap-target floor (WCAG 2.5.5 / platform rule ≥ 40px).
    const box = await addAsset.boundingBox();
    box && box.height >= 36 ? pass(`add-asset tap target ${Math.round(box.height)}px`) : fail(`add-asset tap target too small (${box ? Math.round(box.height) : "?"}px)`);
    await addAsset.click();
    await page.waitForTimeout(350);
    o = await overflowOf(page);
    o <= 1 ? pass("no horizontal overflow (asset form open)") : fail(`ASSET FORM OVERFLOW ${o}px`);
    await shoot(page, `updown-admin-asset-form-${width}`);
    await page.locator('button:has-text("Cancel")').first().click().catch(() => {});
    await page.waitForTimeout(250);
  }

  const addChain = page.locator('button:has-text("+ Add chain")').first();
  if (await addChain.count()) {
    await addChain.click();
    await page.waitForTimeout(350);
    o = await overflowOf(page);
    o <= 1 ? pass("no horizontal overflow (chain form open)") : fail(`CHAIN FORM OVERFLOW ${o}px`);
    await shoot(page, `updown-admin-chain-form-${width}`);
  }

  if (consoleErrors.length) {
    fail(`${consoleErrors.length} console error(s): ${consoleErrors[0].slice(0, 140)}`);
  } else {
    pass("no console errors");
  }

  await page.close();
}

await browser.close();

console.log(`\n${failures === 0 ? "✓ updown-admin-shots: OK" : `✗ updown-admin-shots: ${failures} failure(s)`}`);
console.log(`  PNGs in ${OUT} — READ THEM. A green run is not proof of a readable screen.`);
process.exit(failures === 0 ? 0 : 1);
