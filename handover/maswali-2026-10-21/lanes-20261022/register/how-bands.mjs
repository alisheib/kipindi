// Scratch probe (not committed): (a) How to play's bands as the PAGE draws them at every width and language — the data its
// loading drawing must match; (b) each of the lane's three loading drawings (How, the register index, a week's page)
// caught on a throttled client hop, every top-level band of the drawing beside the landed page's. Read-only.
import { chromium } from "file:///C:/50pick-ssd/kipindi-mln-dreg/node_modules/playwright/index.mjs";
import { premise, demoSession, LOCALE_COOKIE } from "file:///C:/50pick-ssd/kipindi-mln-dreg/scripts/live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3581";
const pre = await premise(BASE);
if (pre.refuse) { console.error(pre.refuse); process.exit(2); }
const browser = await chromium.launch();
const api = await browser.newContext();
const seed = await api.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { scenario: "sunset" }, timeout: 600_000 });
const weeks = (await seed.json().catch(() => ({}))).weeks ?? {};
console.log(`seed ${seed.status()} ${JSON.stringify(weeks)}`);
await api.close();
const session = await demoSession(browser, BASE);
const ctxFor = async (locale, width) => {
  const ctx = await browser.newContext({ viewport: { width, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  return ctx;
};
const settle = async (page) => {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await page.waitForTimeout(300);
};

// (a) How's page bands.
const ONLY = (process.env.PARTS ?? "a,b").split(",");
if (ONLY.includes("a")) for (const locale of ["en", "sw", "zh"]) {
  const ctx = await ctxFor(locale, 360);
  const page = await ctx.newPage();
  for (const width of [320, 360, 390, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto(`${BASE}/millionea/how`, { waitUntil: "load", timeout: 180_000 });
    await settle(page);
    const b = await page.evaluate(() => {
      const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.height * 10) / 10]; };
      const lines = (el) => (el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null);
      const root = document.querySelector('[data-testid="millionea-how"]');
      const steps = root?.querySelector(":scope > ol");
      const tl = document.querySelector('section[aria-labelledby="mln-how-timeline"]');
      const strip = tl?.querySelector("ol");
      const ex = document.querySelector('section[aria-labelledby="mln-how-examples"]');
      const swap = document.querySelector('article[aria-labelledby="mln-how-ex-swap"]');
      const inner = swap?.children[1];
      return {
        lang: document.documentElement.lang, head: box(root?.children[0]),
        steps: box(steps), stepH: [...(steps?.children ?? [])].map((li) => box(li)[1]), stepLines: [...(steps?.children ?? [])].map((li) => lines(li.children[1])),
        timeline: box(tl), strip: box(strip), stripH: [...(strip?.children ?? [])].map((li) => box(li)[1]),
        examples: box(ex), swap: box(swap), swapH3: box(swap?.querySelector("h3")), seal: box(inner?.children[0]), caption: box(inner?.children[1]),
        captionLines: lines(inner?.children[1]), buttonRow: box(inner?.children[2]),
      };
    });
    console.log(`BANDS ${locale}-${width} ${JSON.stringify(b)}`);
  }
  await ctx.close();
}

// (b) each drawing caught on the way in, beside the landed page: every top-level band [y, h].
const bandsOf = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  return [...root.children].filter((c) => c.getClientRects().length > 0).map((c) => {
    const r = c.getBoundingClientRect();
    return [c.tagName.toLowerCase(), Math.round(r.top + scrollY), Math.round(r.height * 10) / 10];
  });
};
const ROUTES = [
  ["how", "/millionea/register", "/millionea/how", '[data-testid="millionea-how"]'],
  ["index", "/millionea/how", "/millionea/register", '[data-testid="millionea-register"]'],
  ["week", "/millionea/register", `/millionea/register/${encodeURIComponent(weeks.beforeFinal ?? "")}`, '[data-testid="millionea-register-week"]'],
];
if (ONLY.includes("b")) for (const [name, from, to, ready] of ROUTES) {
  for (const locale of ["en", "sw", "zh"]) {
    for (const width of [360, 1280]) {
      const ctx = await ctxFor(locale, width);
      const page = await ctx.newPage();
      await page.goto(`${BASE}${from}`, { waitUntil: "load", timeout: 180_000 });
      await settle(page);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 });
      await page.evaluate((to) => { window.next?.router?.push(to); }, to);
      const drawn = await page.waitForSelector('[aria-busy="true"]', { timeout: 20_000 }).then(() => true).catch(() => false);
      const ghost = drawn ? await page.evaluate(bandsOf, '[aria-busy="true"]') : null;
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await page.waitForSelector(ready, { timeout: 60_000 }).catch(() => {});
      await settle(page);
      const real = await page.evaluate(bandsOf, ready);
      console.log(`HOP ${name}-${locale}-${width} drawn=${drawn}\n  ghost ${JSON.stringify(ghost)}\n  page  ${JSON.stringify(real)}`);
      await ctx.close();
    }
  }
}
await browser.close();
