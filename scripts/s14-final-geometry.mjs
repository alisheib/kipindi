/**
 * Source-pinned local geometry read for S14/S15. Synthetic preview only.
 * Nothing here submits a deposit or a bet.
 *
 * KP_BASE=http://localhost:3054 KP_SOURCE_TREE=<checkout> KP_SOURCE_SHA=<40 hex>
 * KP_GEOMETRY_OUT=<absolute directory> node scripts/s14-final-geometry.mjs
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.env.KP_BASE ?? "http://localhost:3054";
const TREE = resolve(process.env.KP_SOURCE_TREE ?? ".");
const SHA = process.env.KP_SOURCE_SHA;
const OUT = resolve(process.env.KP_GEOMETRY_OUT ?? ".qa-shots/s14-final-geometry");
if (!/^http:\/\/localhost:\d+$/.test(BASE) || !/^[a-f0-9]{40}$/.test(SHA ?? "")) {
  throw new Error("localhost:PORT and a 40-hex KP_SOURCE_SHA are required");
}
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: TREE, encoding: "utf8" }).trim();
if (head !== SHA) throw new Error(`source HEAD ${head} differs from ${SHA}`);
const { premise, mintStaffPass, LOCALE_COOKIE } = await import(pathToFileURL(resolve(TREE, "scripts/live/journey-pass.mjs")).href);
const { freshPlayer, post, asCookie } = await import(pathToFileURL(resolve(TREE, "scripts/live/bet-sheet-gates.mjs")).href);
const pre = await premise(BASE);
if (pre.refuse || pre.health?.security?.adminTotp !== "DISABLED") throw new Error(`unsafe local premise: ${pre.refuse ?? "TOTP enabled"}`);
mkdirSync(OUT, { recursive: true });
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const browser = await chromium.launch({ headless: true });
const report = { kind: "S14-final-local-geometry", sourceCommit: SHA, generatedAt: new Date().toISOString(),
  premise: "localhost in-memory STAFF_PREVIEW; synthetic player; no deposit/bet submitted", home: [], deposit: null, errors: [] };

async function open(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 180_000 });
  await page.locator("main").first().waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector("main");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber$"));
  }, null, { timeout: 120_000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.fonts.ready);
}
async function screenshot(page, name) {
  const image = `${name}.png`;
  const path = resolve(OUT, image);
  await page.screenshot({ path, animations: "disabled", style: "nextjs-portal{display:none!important}" });
  return { image, sha256: sha(path) };
}
function rect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
}
async function homeRead(page, role) {
  await page.locator('[data-testid="journey-card"] .kp-jcard__picks').first().waitFor({ state: "visible", timeout: 120_000 });
  const read = await page.evaluate(() => {
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }; };
    const first = document.querySelector('[data-testid="journey-card"]');
    const picks = first?.querySelectorAll('.kp-jcard__pick') ?? [];
    const rail = document.querySelector('[data-testid="journey-tabs"]');
    const tabs = [...(rail?.querySelectorAll('li') ?? [])].map((li) => ({ name: li.textContent?.replace(/\s+/g, " ").trim() ?? "", rect: box(li) }));
    const pickRows = [...picks].map((el) => ({ text: el.textContent?.replace(/\s+/g, " ").trim().slice(0, 90) ?? "", rect: box(el) }));
    return { viewport: { width: innerWidth, height: innerHeight }, firstCard: box(first),
      firstPicks: box(first?.querySelector('.kp-jcard__picks')), pickRows,
      firstCardText: first?.textContent?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "",
      rail: box(rail), tabs, railListCount: tabs.length,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const frame = await screenshot(page, `home-${role}-en-360x740`);
  report.home.push({ role, ...read, ...frame, picksClearRail: !!read.firstPicks && !!read.rail && read.firstPicks.bottom < read.rail.top });
}

try {
  const admin = await browser.newContext();
  await post(BASE, admin, "seed-admin", { role: "ADMIN", phone: "+255700009078", name: "S14 Geometry Operator" });
  await post(BASE, admin, "seed-markets");
  await admin.close();
  const pass = await mintStaffPass(browser, BASE, { phone: "+255700009079", name: "S14 Geometry Support" });
  const guest = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "block" });
  await guest.addCookies([asCookie(BASE, pass), { name: LOCALE_COOKIE, value: "en", url: BASE }]);
  const gp = await guest.newPage();
  gp.on("pageerror", (e) => report.errors.push(`guest: ${String(e).slice(0, 200)}`));
  await open(gp, "/");
  await homeRead(gp, "guest");
  await guest.close();

  const signed = await freshPlayer(browser, BASE, pass, { balance: 0, locale: "en",
    viewport: { width: 360, height: 740 }, controlledNetwork: true });
  const sp = await signed.ctx.newPage();
  sp.on("pageerror", (e) => report.errors.push(`signed: ${String(e).slice(0, 200)}`));
  await open(sp, "/");
  await homeRead(sp, "signed");
  await sp.setViewportSize({ width: 360, height: 640 });
  await open(sp, "/wallet/deposit");
  await sp.locator('[data-testid="journey-deposit-form"]').waitFor({ state: "visible", timeout: 120_000 });
  const selectors = ["input[name=amount]", "fieldset", "#msisdn", '[data-testid="journey-deposit-form"] button[type=submit]', '[data-testid="journey-deposit-form"] a[href*="card"]'];
  const fields = [];
  for (const selector of selectors) {
    const loc = sp.locator(selector).first();
    await loc.waitFor({ state: "visible", timeout: 30_000 });
    await loc.scrollIntoViewIfNeeded();
    fields.push({ selector, afterScroll: await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(scrollY), fullyInViewport: r.top >= 0 && r.bottom <= innerHeight };
    }) });
  }
  const note = await sp.locator('[data-testid="journey-deposit-form"] p').allTextContents();
  const paymentRows = await sp.locator('[data-testid="journey-deposit-form"] input[name="provider"]').count();
  const finalRead = await sp.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollY: Math.round(scrollY), scrollHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight }));
  const frame = await screenshot(sp, "deposit-signed-en-360x640-scrolled");
  report.deposit = { fields, providerRows: paymentRows, pinNotePresent: note.some((x) => /PIN/i.test(x)), ...finalRead, ...frame };
  await signed.ctx.close();
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "manifest.json"), JSON.stringify(report, null, 2), "utf8");
}
if (report.errors.length || report.home.length !== 2 || report.home.some((x) => x.overflowX > 1 || x.railListCount !== 4 || !x.picksClearRail)
    || !report.deposit || report.deposit.overflowX > 1 || report.deposit.fields.some((x) => !x.afterScroll.fullyInViewport)
    || !report.deposit.pinNotePresent || report.deposit.providerRows < 1) process.exitCode = 1;
