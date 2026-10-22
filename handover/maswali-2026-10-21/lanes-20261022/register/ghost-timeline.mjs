// Scratch probe (not committed): which loading drawing is on screen, frame by frame, during a client hop between
// Millionea pages — the hub's (`[data-ghost="strip"]`), How's (`[data-ghost="steps"]`), or another — and when the page
// lands. Read-only. Screenshots of the first frame of each drawing seen.
import { chromium } from "file:///C:/50pick-ssd/kipindi-mln-dreg/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "file:///C:/50pick-ssd/kipindi-mln-dreg/scripts/live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3582";
const OUT = process.env.OUT;
mkdirSync(OUT, { recursive: true });
const pre = await premise(BASE);
if (pre.refuse) { console.error(pre.refuse); process.exit(2); }
const browser = await chromium.launch();
const api = await browser.newContext();
const seed = await api.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { scenario: "sunset" }, timeout: 600_000 });
const weeks = (await seed.json().catch(() => ({}))).weeks ?? {};
console.log(`seed ${seed.status()} ${JSON.stringify(weeks)}`);
await api.close();
const session = await demoSession(browser, BASE);
const HOPS = [
  ["register→how", "/millionea/register", "/millionea/how", '[data-testid="millionea-how"]'],
  ["how→register", "/millionea/how", "/millionea/register", '[data-testid="millionea-register"]'],
  ["register→week", "/millionea/register", `/millionea/register/${encodeURIComponent(weeks.beforeFinal ?? "")}`, '[data-testid="millionea-register-week"]'],
  ["hub→how", "/millionea", "/millionea/how", '[data-testid="millionea-how"]'],
];
for (const [name, from, to, ready] of HOPS) {
  for (const [label, throttle] of [["throttled", true], ["fast", false]]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${from}`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForTimeout(800);
    const cdp = await ctx.newCDPSession(page);
    if (throttle) {
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 });
    }
    // Record in the page itself, every animation frame: which drawing is up.
    await page.evaluate((ready) => {
      window.__seen = [];
      const t0 = performance.now();
      const tick = () => {
        const busy = [...document.querySelectorAll('[aria-busy="true"]')];
        const kinds = busy.map((b) => (b.querySelector('[data-ghost="strip"]') ? "HUB" : b.querySelector('[data-ghost="steps"]') ? "HOW" : `other:${b.children.length}:${Math.round(b.getBoundingClientRect().height)}`));
        const landed = !!document.querySelector(ready);
        const state = `${kinds.join("+") || "-"}${landed ? " PAGE" : ""}`;
        const last = window.__seen[window.__seen.length - 1];
        if (!last || last.state !== state) window.__seen.push({ at: Math.round(performance.now() - t0), state });
        if (performance.now() - t0 < 30_000 && !(landed && busy.length === 0)) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, ready);
    let shot = 0;
    const seenShots = new Set();
    await page.evaluate((to) => { window.next?.router?.push(to); }, to);
    const t0 = Date.now();
    while (Date.now() - t0 < 30_000) {
      const now = await page.evaluate(() => window.__seen[window.__seen.length - 1]?.state ?? "");
      const kind = now.split(" ")[0];
      if (kind !== "-" && !seenShots.has(kind)) { seenShots.add(kind); await page.screenshot({ path: `${OUT}/${name.replace("→", "-to-")}-${label}-${shot++}-${kind.replace(/[^A-Za-z0-9]+/g, "_")}.png` }); }
      if (now.endsWith("PAGE") && !now.includes("HUB") && !now.includes("HOW") && !now.includes("other")) break;
      await page.waitForTimeout(40);
    }
    const seen = await page.evaluate(() => window.__seen);
    console.log(`TIMELINE ${name} (${label}) ${seen.map((s) => `${s.at}ms ${s.state}`).join(" → ")}`);
    await ctx.close();
  }
}
await browser.close();
