/**
 * Up & Down admin — END-TO-END through the real UI, then visual capture of the
 * POPULATED state.
 *
 * The empty page tells you almost nothing. This drives the actual forms — add an
 * asset, enable it, add a chain, start it, pause it — asserting the real server
 * refusals along the way, and captures what an operator actually sees once there is
 * data in front of them.
 *
 *   BASE=http://localhost:3000 node scripts/updown-admin-e2e-shots.mjs
 *
 * Needs a DEV server with DISABLE_ADMIN_TOTP=true.
 * ⚠️ READ the PNGs in docs/shots-updown/. A green run is not a readable screen.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-updown");
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali Admin" } });

const go = async () => {
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(700);
};
const shoot = async (n) => { await page.screenshot({ path: join(OUT, `${n}.png`), fullPage: true }); console.log(`  → ${n}.png`); };
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

await go();

// ── 1 · An UNTRUSTED source must be refused, verbatim ────────────────────────
console.log("\n=== 1 · untrusted source is refused ===");
{
  await page.locator('button:has-text("+ Add asset")').first().click();
  await page.waitForTimeout(300);
  await page.fill('input[name="key"]', "BAD");
  await page.fill('input[name="symbol"]', "BAD/USD");
  await page.fill('input[name="nameEn"]', "Bad Asset");
  await page.fill('input[name="nameSw"]', "Mbaya");
  await page.fill('input[name="priceSourceUrl"]', "https://random-blog.example.com/price");
  await page.locator('button[type="submit"]:has-text("Add asset")').click();
  await page.waitForTimeout(1500);
  const toast = await page.locator('text=/not permitted|No enabled trusted source|Add the domain/i').first().isVisible().catch(() => false);
  toast ? pass("untrusted source refused, with the reason shown") : fail("untrusted source was NOT refused (or reason hidden)");
  await shoot("updown-e2e-1-untrusted-refused");
  await page.locator('button:has-text("Cancel")').first().click().catch(() => {});
  await page.waitForTimeout(300);
}

// ── 2 · A TRUSTED source is accepted, and starts DISABLED ────────────────────
console.log("\n=== 2 · trusted source accepted, starts disabled ===");
{
  await page.locator('button:has-text("+ Add asset")').first().click();
  await page.waitForTimeout(300);
  await page.fill('input[name="key"]', "XAU");
  await page.fill('input[name="symbol"]', "XAU/USD");
  await page.fill('input[name="nameEn"]', "Gold");
  await page.fill('input[name="nameSw"]', "Dhahabu");
  // bot.go.tz is seeded as a trusted `macro` source by seedDefaultSources().
  await page.fill('input[name="priceSourceUrl"]', "https://www.bot.go.tz/FinancialMarkets/gold");
  await page.locator('button[type="submit"]:has-text("Add asset")').click();
  await page.waitForTimeout(2000);
  await go();
  const row = await page.locator('td:has-text("XAU")').first().isVisible().catch(() => false);
  row ? pass("asset row rendered") : fail("asset row did NOT render");
  const off = await page.locator('[role="switch"][aria-label*="XAU"]').first().getAttribute("aria-checked").catch(() => null);
  off === "false" ? pass("new asset starts DISABLED") : fail(`new asset aria-checked=${off}, expected "false"`);
  await shoot("updown-e2e-2-asset-added");
}

// ── 3 · Enable the asset ─────────────────────────────────────────────────────
console.log("\n=== 3 · enable ===");
{
  await page.locator('[role="switch"][aria-label*="XAU"]').first().click();
  await page.waitForTimeout(1800);
  await go();
  const on = await page.locator('[role="switch"][aria-label*="XAU"]').first().getAttribute("aria-checked").catch(() => null);
  on === "true" ? pass("asset enabled") : fail(`asset aria-checked=${on}, expected "true"`);
}

// ── 4 · Add a chain — starts STOPPED ─────────────────────────────────────────
console.log("\n=== 4 · chain added, starts stopped ===");
{
  await page.locator('button:has-text("+ Add chain")').first().click();
  await page.waitForTimeout(400);
  await page.locator('button[type="submit"]:has-text("Add chain")').click();
  await page.waitForTimeout(2000);
  await go();
  const stopped = await page.locator('text=STOPPED').first().isVisible().catch(() => false);
  stopped ? pass("new chain starts STOPPED") : fail("chain did not render as STOPPED");
  await shoot("updown-e2e-4-chain-added");
}

// ── 5 · Start it — a next boundary must appear ───────────────────────────────
console.log("\n=== 5 · start the chain ===");
{
  await page.locator('button:has-text("Start")').first().click();
  await page.waitForTimeout(2000);
  await go();
  const runningChip = await page.locator('text=RUNNING').first().isVisible().catch(() => false);
  runningChip ? pass("chain RUNNING") : fail("chain did not enter RUNNING");
  // The boundary cell must show a real time, never an em-dash, once running.
  const boundary = await page.locator("td").filter({ hasText: /\d\d:\d\d:\d\d UTC/ }).first().isVisible().catch(() => false);
  boundary ? pass("next boundary shows a real time") : fail("next boundary is empty while RUNNING");
  const o = await overflow();
  o <= 1 ? pass("no horizontal overflow (populated)") : fail(`POPULATED OVERFLOW ${o}px`);
  await shoot("updown-e2e-5-chain-running-1280");
}

// ── 6 · The asset cannot be disabled while a chain runs ──────────────────────
console.log("\n=== 6 · asset locked while a chain runs ===");
{
  await page.locator('[role="switch"][aria-label*="XAU"]').first().click();
  await page.waitForTimeout(1800);
  const refused = await page.locator('text=/running chain/i').first().isVisible().catch(() => false);
  refused ? pass("disable refused while a chain is running, reason shown") : fail("disable was NOT refused");
  await shoot("updown-e2e-6-disable-refused");
}

// ── 7 · The populated state at every width ───────────────────────────────────
console.log("\n=== 7 · populated, all widths ===");
for (const width of [360, 768, 1280, 1920]) {
  await page.setViewportSize({ width, height: width < 768 ? 800 : 1000 });
  await go();
  const o = await overflow();
  o <= 1 ? pass(`${width}px · no overflow`) : fail(`${width}px · OVERFLOW ${o}px`);
  await shoot(`updown-e2e-populated-${width}`);
}

// ── 8 · Stop confirm dialog (kit ConfirmDialog, never native confirm) ────────
console.log("\n=== 8 · stop confirmation ===");
{
  await page.setViewportSize({ width: 1280, height: 1000 });
  await go();
  await page.locator('button:has-text("Stop")').first().click();
  await page.waitForTimeout(500);
  const dlg = await page.locator('[role="alertdialog"], [role="dialog"]').first().isVisible().catch(() => false);
  dlg ? pass("kit confirm dialog opened") : fail("confirm dialog did NOT open");
  const o = await overflow();
  o <= 1 ? pass("confirm: no overflow") : fail(`confirm OVERFLOW ${o}px`);
  await shoot("updown-e2e-8-stop-confirm");
  await page.keyboard.press("Escape");
}

consoleErrors.length
  ? fail(`${consoleErrors.length} console error(s): ${consoleErrors[0].slice(0, 160)}`)
  : pass("no console errors across the whole run");

await browser.close();
console.log(`\n${failures === 0 ? "✓ updown-admin-e2e-shots: OK" : `✗ ${failures} failure(s)`}`);
console.log(`  PNGs in ${OUT} — READ THEM.`);
process.exit(failures === 0 ? 0 : 1);
