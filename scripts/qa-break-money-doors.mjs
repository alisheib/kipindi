/**
 * qa:break-money-doors — ON A BREAK THE CLASSIC SHELL OFFERS NO DEPOSIT DOOR (MASWALI-BUILD S5 round 2 · PLATFORM,
 * 2026-10-22; the hub lane's reader finding, the lead's approval; `test:millionea-shell` §5 holds the source and renders
 * the two navs).
 *
 *   A fresh in-memory DEV server (the journey at its shipped level, so a player is served the classic shell), then:
 *   BASE=http://localhost:3500 node scripts/qa-break-money-doors.mjs [outDir]
 *
 * The demo player (`/auth/demo`, dev only) is the CONTROL first, at 1280 and 360: the bar's deposit pill
 * (`deposit-header`), the capsule's Wallet with its Deposit (`wallet-sheet-deposit`) and Withdraw, and the rail's centre
 * coin at `/wallet/deposit` (`deposit-rail`). Then the player takes a break through the real form
 * (/profile/responsible-gambling → the break → confirm; the session ends and the login page says so) and signs in again
 * (a break stops betting and deposits, not access). On the break: no deposit pill in the bar; the capsule's Wallet offers
 * Withdraw alone (no Deposit, the pair one wide); the rail's coin is the Wallet door (`/wallet`, the Wallet's name, the
 * mark's hub instead of the deposit arrow). Shots go to outDir (default .qa-artifacts/break-money-doors/).
 * ⚠️ It starts a real break on the dev store's demo account (one hour): run it on a fresh in-memory server.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "break-money-doors"));
mkdirSync(OUT, { recursive: true });
let pass = 0;
const fails = [];
const rows = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};
// A signed-in page holds its event stream open, so it never goes network-idle: settle on load, the fonts and a beat.
const settle = async (page) => {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
};
/** The bar's money-in doors at 1280, and what the capsule's Wallet offers once opened. */
async function barDoors(page, tag) {
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const lang = await page.evaluate(() => document.documentElement.lang);
  const pill = await page.locator('[data-testid="deposit-header"]').count();
  await page.screenshot({ path: join(OUT, `${tag}-bar-1280.png`), clip: { x: 0, y: 0, width: 1280, height: 72 } });
  await page.locator('[data-testid="wallet-balance-capsule"]').first().click();
  // `wallet-sheet` names the balance block only; the Wallet's doors are its siblings in the same dialog panel.
  await page.locator('[data-testid="wallet-sheet"]').first().waitFor({ timeout: 15_000 });
  const sheet = page.locator('[role="dialog"]').filter({ has: page.locator('[data-testid="wallet-sheet"]') }).first();
  await page.waitForTimeout(400);
  const deposit = await sheet.locator('[data-testid="wallet-sheet-deposit"]').count();
  const withdraw = await sheet.locator('[data-testid="wallet-sheet-withdraw"]').count();
  const oneWide = await sheet.locator(".kp-wsheet__pair--one").count();
  const box = await sheet.boundingBox().catch(() => null);
  if (box) await page.screenshot({ path: join(OUT, `${tag}-sheet-1280.png`), clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.min(1280, box.width + 16), height: box.height + 16 } });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  return { lang, pill, deposit, withdraw, oneWide };
}
/** The rail's centre coin at 360. */
async function coin(page, tag) {
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const c = await page.evaluate(() => {
    const a = document.querySelector('[data-testid="deposit-rail"]');
    return a ? { href: a.getAttribute("href"), label: a.getAttribute("aria-label"), arrow: !!a.querySelector(".kp-coin__verb"), hub: !!a.querySelector(".kp-coin__hub") } : null;
  });
  const box = await page.locator("nav.kp-rail").first().boundingBox().catch(() => null);
  if (box) await page.screenshot({ path: join(OUT, `${tag}-rail-360.png`), clip: { x: 0, y: Math.max(0, box.y - 24), width: 360, height: box.height + 28 } });
  return c;
}

const browser = await chromium.launch();
try {
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await desk.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const page = await desk.newPage();
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const before = await barDoors(page, "before");
  ok("PREMISE · the page is English (kp-locale) and the classic bar is served", before.lang === "en", JSON.stringify(before));
  ok("CONTROL · before the break, the bar draws its deposit pill and the capsule's Wallet offers Deposit and Withdraw",
    before.pill === 1 && before.deposit === 1 && before.withdraw === 1 && before.oneWide === 0, JSON.stringify(before));
  const phone0 = await browser.newContext({ viewport: { width: 360, height: 780 }, storageState: await desk.storageState() });
  const coinBefore = await coin(await phone0.newPage(), "before");
  await phone0.close();
  ok("CONTROL · before the break, the rail's coin is the deposit door", coinBefore?.href === "/wallet/deposit" && coinBefore.arrow && !coinBefore.hub, JSON.stringify(coinBefore));
  // The break, through the real form.
  await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const form = page.locator("form").filter({ has: page.locator('[name="period"]') }).first();
  const trigger = form.locator("button[type=button]").last();
  const label = ((await trigger.textContent()) ?? "").trim();
  await trigger.click();
  const dialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
  await dialog.waitFor({ timeout: 15_000 });
  await dialog.locator("button", { hasText: label }).last().click();
  await page.waitForURL(/\/auth\/login/, { timeout: 60_000 });
  ok("PREMISE · the break was taken through the form (the session ends, the login page says so)", /cooled=1/.test(page.url()), page.url());
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page);
  const after = await barDoors(page, "break");
  rows.push({ before, coinBefore, after });
  ok("1280 · on the break the bar draws no deposit pill", after.pill === 0, JSON.stringify(after));
  ok("1280 · on the break the capsule's Wallet offers Withdraw alone, one wide — no Deposit",
    after.deposit === 0 && after.withdraw === 1 && after.oneWide === 1, JSON.stringify(after));
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, storageState: await desk.storageState() });
  const coinAfter = await coin(await phone.newPage(), "break");
  await phone.close();
  rows.push({ coinAfter });
  ok("360 · on the break the rail's coin is the Wallet door (the Wallet's name, the mark's hub, no deposit arrow)",
    coinAfter?.href === "/wallet" && coinAfter.label === "Wallet" && !coinAfter.arrow && coinAfter.hub, JSON.stringify(coinAfter));
  await desk.close();
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
console.log(`\nqa:break-money-doors: ${pass} passed, ${fails.length} failed (shots in ${OUT})`);
process.exitCode = fails.length ? 1 : 0;
