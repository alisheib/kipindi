/**
 * S14 local frame matrix. Disposable localhost, in-memory store and mock rail only.
 * Captures viewport tiles; the human read of those tiles is recorded separately.
 * No payment is submitted. Synthetic identities, cookies and URLs stay out of the report.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { premise, mintStaffPass, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { freshPlayer, pageIn, post, asCookie } from "./live/bet-sheet-gates.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3054";
const OUT = resolve(process.env.KP_SHOTS ?? ".qa-shots/s14-frame-matrix");
const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440];
const LOCALES = ["sw", "en", "zh"];
const HEIGHT = 844;
const REPORT = { sourceCommit: process.env.KP_SOURCE_SHA ?? null, generatedAt: new Date().toISOString(),
  premise: "local in-memory staff preview; synthetic player; mock rail; no payment submitted",
  widths: WIDTHS, locales: LOCALES, tiles: [], errors: [] };

const pre = await premise(BASE);
if (pre.refuse) throw new Error(`INVALID local premise: ${pre.refuse}`);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [];

async function chooseFirstYes(page) {
  const pick = page.locator('[data-sheet] a[data-bet-side="YES"]').first();
  await pick.waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => {
    const a = document.querySelector('[data-sheet] a[data-bet-side="YES"]');
    return !!a && Object.keys(a).some((key) => key.startsWith("__reactFiber$"));
  }, null, { timeout: 120_000 });
  await pick.click();
  await page.locator('[data-testid="journey-bet-sheet"]').waitFor({ state: "visible", timeout: 120_000 });
}

async function capture(page, frame, role, locale, widths = WIDTHS, height = HEIGHT) {
  for (const width of widths) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    const name = `${frame}-${role}-${locale}-${width}x${height}`;
    const image = resolve(OUT, `${name}.png`);
    await page.screenshot({ path: image, animations: "disabled", fullPage: false,
      style: "nextjs-portal{display:none!important}" });
    const read = await page.evaluate((frame) => {
      const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
      const rect = (el) => { const r = el.getBoundingClientRect(); return {
        x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height),
        right: Math.round(r.right), bottom: Math.round(r.bottom),
      }; };
      const selectors = {
        home: ["[data-testid=journey-top-bar]", "[data-testid=journey-howto-card]", ".kp-jhome__title", ".kp-jhome__chips", "[data-testid=journey-card]", "[data-testid=journey-tabs]"],
        howto: ["[data-testid=journey-howto-sheet]", ".kp-howto__sheet h2", ".kp-howto__steps", ".kp-howto__ex", ".kp-wsheet__act", ".kp-howto__foot a"],
        guestSheet: ["[data-testid=journey-bet-sheet]", ".kp-bsheet__header", ".kp-bsheet__title", "[data-testid=journey-sheet-stake]", ".kp-bsheet__chips", "[data-testid=journey-sheet-signup]", "[data-testid=journey-sheet-signin]"],
        editSheet: ["[data-testid=journey-bet-sheet]", ".kp-bsheet__header", ".kp-bsheet__title", "[data-testid=journey-sheet-stake]", ".kp-bsheet__chips", ".kp-bsheet__estimate", ".kp-bsheet__balance", "[data-testid=journey-sheet-place]"],
        lowSheet: ["[data-testid=journey-bet-sheet]", ".kp-bsheet__header", ".kp-bsheet__title", "[data-testid=journey-sheet-stake]", "[data-testid=journey-sheet-deposit]", "[data-testid=journey-sheet-place]"],
        deposit: ["[data-testid=journey-deposit-form]", "[data-testid=journey-deposit-bet-strip]", "input[name=amount]", "fieldset", "#msisdn", "[data-testid=journey-deposit-form] button[type=submit]"],
      }[frame] ?? [];
      const elements = selectors.map((selector) => {
        const el = document.querySelector(selector);
        if (!el) return { selector, present: false };
        const cs = getComputedStyle(el);
        return { selector, present: true, visible: cs.display !== "none" && cs.visibility !== "hidden" && el.getBoundingClientRect().width > 0,
          rect: rect(el), text: el instanceof HTMLInputElement ? "[input redacted]" : norm(el.textContent).slice(0, 350),
          scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });
      const root = document.documentElement;
      const modal = document.querySelector('[role="dialog"]');
      const active = document.activeElement;
      return { viewport: { width: innerWidth, height: innerHeight },
        documentOverflowX: Math.max(document.body.scrollWidth, root.scrollWidth) - root.clientWidth,
        modal: modal ? { rect: rect(modal), scrollHeight: modal.scrollHeight, clientHeight: modal.clientHeight } : null,
        active: active?.getAttribute("data-testid") ?? active?.tagName ?? null,
        elements };
    }, frame);
    const sha256 = createHash("sha256").update(readFileSync(image)).digest("hex");
    REPORT.tiles.push({ frame, role, locale, width, height, image: `${name}.png`, sha256, read });
    const missing = read.elements.filter((e) => !e.present).map((e) => e.selector);
    console.log(`${read.documentOverflowX > 1 || missing.length ? "WARN" : "CAPTURE"} ${name} overflowX=${read.documentOverflowX}${missing.length ? ` missing=${missing.join(",")}` : ""}`);
  }
}

// Chromium's DevTools Runtime changes the visual viewport in the same way the
// established qa:bet-sheet keyboard drive does. The PNG is clipped to the
// visible 340px; it does not depict an OS keyboard.
async function captureKeyboard(page, frame, locale) {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.locator('[data-testid="journey-sheet-stake"]').focus();
  const cdp = await page.context().newCDPSession(page);
  const expression = `Object.defineProperty(window.visualViewport,'height',{configurable:true,value:340});
    Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,value:0});
    window.visualViewport.dispatchEvent(new Event('resize'));`;
  try {
    await cdp.send("Runtime.evaluate", { expression });
    await page.waitForTimeout(300);
    const name = `${frame}-keyboard-cdp-${locale}-360x340`;
    const path = resolve(OUT, `${name}.png`);
    await page.screenshot({ path, clip: { x: 0, y: 0, width: 360, height: 340 }, animations: "disabled",
      style: "nextjs-portal{display:none!important}" });
    const read = await page.evaluate(() => {
      const box = (s) => { const r = document.querySelector(s)?.getBoundingClientRect();
        return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } : null; };
      return { visualHeight: visualViewport?.height ?? null, innerHeight,
        root: box('[data-testid="journey-bet-sheet"]'),
        stake: box('[data-testid="journey-sheet-stake"]'),
        action: box('[data-testid="journey-sheet-place"]'),
        focused: document.activeElement?.getAttribute("data-testid") === "journey-sheet-stake",
        viewportOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    REPORT.tiles.push({ frame, role: "signed-keyboard-cdp", locale, width: 360, height: 340, image: `${name}.png`,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"), read });
    console.log(`${read.visualHeight === 340 && read.focused && read.stake?.bottom <= 340 && read.action?.bottom <= 340 ? "CAPTURE" : "WARN"} ${name} ${JSON.stringify(read)}`);
  } finally {
    await cdp.send("Runtime.evaluate", { expression: "delete window.visualViewport.height;delete window.visualViewport.offsetTop;window.visualViewport.dispatchEvent(new Event('resize'));" }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

try {
  const operator = await browser.newContext(); contexts.push(operator);
  await post(BASE, operator, "seed-admin", { role: "ADMIN", phone: "+255700009054", name: "S14 Frame Operator", balance: 0 });
  await post(BASE, operator, "seed-markets");
  const pass = await mintStaffPass(browser, BASE, { phone: "+255700009055", name: "S14 Frame Support" });

  for (const locale of LOCALES) {
    // A guest preview pass shows the new frame, but has no player session.
    const guest = await browser.newContext({ viewport: { width: 390, height: HEIGHT }, serviceWorkers: "block" });
    contexts.push(guest);
    await guest.addCookies([asCookie(BASE, pass), { name: LOCALE_COOKIE, value: locale, url: BASE }]);
    const gp = await pageIn(BASE, guest, "/", REPORT.errors);
    await gp.locator('[data-testid="journey-home"]').waitFor();
    await gp.locator('[data-testid="journey-howto-card"]').waitFor();
    await capture(gp, "home", "guest", locale);
    await gp.locator('[data-testid="journey-howto-card"]').click();
    await gp.locator('[data-testid="journey-howto-sheet"]').waitFor({ state: "visible" });
    await capture(gp, "howto", "guest", locale);
    await capture(gp, "howto", "guest-short", locale, [320], 640);
    await gp.locator('.kp-howto__sheet .kp-wsheet__act').click();
    await gp.locator('[data-testid="journey-howto-sheet"]').waitFor({ state: "hidden" });
    // The S8 host attaches on the /markets document path, which redirects a pass
    // holder back to the journey board. The home capture alone does not arm it.
    await gp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await gp.waitForTimeout(1200);
    await chooseFirstYes(gp);
    await capture(gp, "guestSheet", "guest", locale);
    await capture(gp, "guestSheet", "guest-short", locale, [320], 640);
    await gp.close();
    await guest.close();

    const short = await freshPlayer(browser, BASE, pass, { balance: 0, locale,
      viewport: { width: 390, height: HEIGHT }, controlledNetwork: true });
    contexts.push(short.ctx);
    const sp = await pageIn(BASE, short.ctx, "/", REPORT.errors);
    await sp.locator('[data-testid="journey-home"]').waitFor();
    await capture(sp, "home", "signed", locale);
    await sp.locator('[data-testid="journey-howto-card"]').click();
    await sp.locator('[data-testid="journey-howto-sheet"]').waitFor({ state: "visible" });
    await capture(sp, "howto", "signed", locale);
    await capture(sp, "howto", "signed-short", locale, [320], 640);
    await sp.locator('.kp-howto__sheet .kp-wsheet__act').click();
    await sp.locator('[data-testid="journey-howto-sheet"]').waitFor({ state: "hidden" });
    await sp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await sp.waitForTimeout(1200);
    await chooseFirstYes(sp);
    await sp.locator('[data-testid="journey-bet-sheet"][data-frame="low"]').waitFor();
    await capture(sp, "lowSheet", "signed", locale);
    await capture(sp, "lowSheet", "signed-short", locale, [320], 640);
    await captureKeyboard(sp, "lowSheet", locale);
    await sp.setViewportSize({ width: 360, height: 640 });
    await sp.locator('[data-testid="journey-sheet-stake"]').focus();
    await capture(sp, "lowSheet", "focused-short", locale, [360], 400);
    await sp.setViewportSize({ width: 390, height: HEIGHT });
    await sp.locator('[data-testid="journey-sheet-deposit"]').click();
    await sp.waitForURL(/\/wallet\/deposit\?/);
    await sp.locator('[data-testid="journey-deposit-form"]').waitFor();
    await capture(sp, "deposit", "signed", locale);
    await capture(sp, "deposit", "signed-short", locale, [320], 640);
    await sp.setViewportSize({ width: 360, height: 400 });
    await sp.locator('input[name="amount"]').focus();
    await capture(sp, "deposit", "focused-short", locale, [360], 400);
    await sp.close(); await short.ctx.close();

    const funded = await freshPlayer(browser, BASE, pass, { balance: 100_000, locale,
      viewport: { width: 390, height: HEIGHT }, controlledNetwork: true });
    contexts.push(funded.ctx);
    const fp = await pageIn(BASE, funded.ctx, "/markets", REPORT.errors);
    await chooseFirstYes(fp);
    await fp.locator('[data-testid="journey-bet-sheet"][data-frame="edit"]').waitFor();
    await capture(fp, "editSheet", "signed", locale);
    await capture(fp, "editSheet", "signed-short", locale, [320], 640);
    await captureKeyboard(fp, "editSheet", locale);
    await fp.setViewportSize({ width: 360, height: 400 });
    await fp.locator('[data-testid="journey-sheet-stake"]').focus();
    await capture(fp, "editSheet", "focused-short", locale, [360], 400);
    await fp.close(); await funded.ctx.close();
  }
} finally {
  REPORT.tileCount = REPORT.tiles.length;
  REPORT.overflowX = REPORT.tiles.filter((t) => (t.read.documentOverflowX ?? t.read.viewportOverflowX) > 1).map((t) => t.image);
  REPORT.missing = REPORT.tiles.flatMap((t) => (t.read.elements ?? []).filter((e) => !e.present).map((e) => `${t.image}: ${e.selector}`));
  writeFileSync(resolve(OUT, "manifest.json"), JSON.stringify(REPORT, null, 2));
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
}
if (REPORT.overflowX.length || REPORT.errors.some((e) => e.type === "pageerror")) process.exitCode = 1;
