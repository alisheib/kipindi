/**
 * Browser proof for the closed-week seal table's own horizontal scroll.
 * Run against a disposable localhost dev server with FEATURE_MILLIONEA=ACTIVE.
 * Its seed routes are unavailable in production. No seal or void action is submitted.
 * --prove-red removes the paint containment in the live DOM and requires the root overflow to return.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3410";
assert.match(BASE, /^http:\/\/localhost:\d+$/, "local dev server only");
const red = process.argv.includes("--prove-red");
const OUT = ".50pick-shots/maswali/seal-scroll";
mkdirSync(OUT, { recursive: true });
const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
assert.equal(health.database?.configured, false, "disposable memory store required");
assert.equal(health.millionea?.state, "ACTIVE", "local ACTIVE fixture required");

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } });
  await context.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  const admin = await context.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
  assert.equal(admin.status(), 200, "local Owner seed");
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(180000);
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const findClosed = async () => {
    const response = await page.goto(`${BASE}/admin/maswali`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await page.waitForLoadState("networkidle").catch(() => {});
    const row = page.getByRole("region", { name: "Millionea weeks" }).locator("tbody tr").filter({ hasText: "Closed" }).first();
    if ((await row.count()) === 0) return null;
    return row.locator("td:first-child a").getAttribute("href");
  };
  let closed = await findClosed();
  if (!closed) {
    const seed = await context.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300000 });
    assert.equal(seed.status(), 200, "local all-state fixture");
    closed = await findClosed();
  }
  assert.ok(closed?.startsWith("/admin/maswali/"), "a seeded CLOSED week must exist");

  for (const width of red ? [360] : [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${BASE}${closed}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await page.waitForLoadState("networkidle").catch(() => {});
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    const region = page.getByRole("region", { name: "Millionea results to seal" });
    assert.equal(await region.count(), 1, "the exact named seal table is present");
    const before = await region.evaluate((el) => ({
      root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      client: el.clientWidth,
      scroll: el.scrollWidth,
      named: el.getAttribute("aria-label"),
      tabIndex: el.tabIndex,
      contain: getComputedStyle(el).contain,
    }));
    assert.equal(before.named, "Millionea results to seal");
    assert.ok(before.tabIndex >= 0, "the named region must be keyboard reachable");
    assert.ok(before.scroll > before.client + 1, "the 1040px seal table must scroll within its region");

    if (red) {
      assert.ok(before.root <= 1, "the baseline must be sound before mutation");
      await region.evaluate((el) => { el.style.contain = ""; });
      const undone = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(undone > 1, `mutation must expose document overflow; measured ${undone}px`);
      console.log(`maswali-seal-scroll red: caught ${undone}px root overflow when paint containment was removed`);
      continue;
    }

    assert.ok(before.root <= 1, `closed-week document overflow at ${width}: ${before.root}px`);
    assert.equal(before.contain, "paint", "scroll region must contain its table's paint");
    const far = await region.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
      const box = el.getBoundingClientRect();
      const last = el.querySelector("tbody tr td:last-child")?.getBoundingClientRect();
      return {
        reached: el.scrollLeft >= el.scrollWidth - el.clientWidth - 1,
        lastVisible: !!last && last.left >= box.left - 1 && last.right <= box.right + 1,
        root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.ok(far.reached && far.lastVisible, `far-right Act column must be readable at ${width}`);
    assert.ok(far.root <= 1, `scrolling table must not scroll the page at ${width}`);
    await region.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 180));
    await page.screenshot({ path: `${OUT}/closed-far-right-${width}.png`, caret: "initial" });

    await region.getByRole("button", { name: "Void…" }).first().click();
    const modal = page.getByRole("alertdialog", { name: /Void M1/ });
    await modal.waitFor();
    const box = await modal.boundingBox();
    assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, `void confirmation must fit at ${width}`);
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1,
      `the void overlay must not cause root overflow at ${width}`);
    await page.screenshot({ path: `${OUT}/closed-void-dialog-${width}.png`, caret: "initial" });
    await modal.locator('form button[type="button"]').last().click();
    console.log(`PASS closed-week seal scroll @${width}: root=0, region ${before.client}/${before.scroll}, far-right Act and dialog reachable`);
  }
  assert.deepEqual(errors, [], "browser console errors");
  if (!red) console.log("maswali-seal-scroll: 360/1280 passed, 0 failed · 4 PNG");
} finally {
  await browser.close();
}
