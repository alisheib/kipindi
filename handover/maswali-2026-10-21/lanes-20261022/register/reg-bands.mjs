// Scratch probe (not committed): the register index's and a week page's first bands as the PAGES draw them, at the AGENTS
// widths in three languages — the data their loading drawings must match. Read-only (seeds the register's sunset weeks).
import { chromium } from "file:///C:/50pick-ssd/kipindi-mln-dreg/node_modules/playwright/index.mjs";
import { premise, demoSession, LOCALE_COOKIE } from "file:///C:/50pick-ssd/kipindi-mln-dreg/scripts/live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3584";
const pre = await premise(BASE);
if (pre.refuse) { console.error(pre.refuse); process.exit(2); }
const browser = await chromium.launch();
const api = await browser.newContext();
const seed = await api.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { scenario: process.env.SCEN || "states" }, timeout: 600_000 });
const weeks = (await seed.json().catch(() => ({}))).weeks ?? {};
console.log(`seed ${seed.status()} ${JSON.stringify(weeks)}`);
await api.close();
const session = await demoSession(browser, BASE);
const WEEKS = [["rolled", weeks.rolled], ["won", weeks.won], ["selling", weeks.selling]].filter(([, c]) => !!c);
for (const locale of ["en", "sw", "zh"]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  for (const width of [320, 360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 780 });
    const targets = [["index", "/millionea/register", '[data-testid="millionea-register"]'],
      ...WEEKS.map(([k, c]) => [`week-${k}`, `/millionea/register/${encodeURIComponent(c)}`, '[data-testid="millionea-register-week"]'])];
    for (const [name, path, sel] of targets) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
      await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
      await page.waitForTimeout(300);
      const b = await page.evaluate((sel) => {
        const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.height * 10) / 10]; };
        const lines = (el) => (el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null);
        const root = document.querySelector(sel);
        const kids = [...(root?.children ?? [])].map((c) => [c.tagName.toLowerCase(), ...box(c)]);
        const intro = document.querySelector('[data-testid="millionea-register-intro"]');
        const rows = [...document.querySelectorAll('[data-testid="millionea-register"] ul > li')].slice(0, 6).map((li) => box(li)[1]);
        const head = root?.querySelector(":scope > div:nth-child(2)");
        const headKids = head ? [...head.children].map((c) => [c.tagName.toLowerCase(), ...box(c), lines(c)]) : null;
        const sections = [...(root?.querySelectorAll(":scope > section") ?? [])].map((s) => [s.getAttribute("aria-labelledby"), ...box(s), box(s.querySelector("h2"))?.[1] ?? null, box(s.querySelector("h2 + *"))]);
        const ledgerRows = [...document.querySelectorAll('[data-testid="millionea-ledger"] > *')].map((el) => box(el)[1]);
        const later = document.querySelector('section[aria-labelledby="mln-reg-ledger"] p');
        return { lang: document.documentElement.lang, kids, intro: box(intro), introLines: lines(intro), rows, headKids, sections, ledgerRows, later: box(later) };
      }, sel);
      console.log(`BANDS ${name}-${locale}-${width} ${JSON.stringify(b)}`);
    }
  }
  await ctx.close();
}
await browser.close();
