/**
 * Live retest of the proposals UI — languages (EN/SW/ZH), responsiveness (no
 * horizontal overflow at mobile widths), and console cleanliness. Drives the real
 * dev server on :3000 with a demo session. Uses domcontentloaded (not networkidle)
 * because the app holds live SSE connections.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const LOCALES = [
  { code: "en", label: "Betting closes" },
  { code: "sw", label: "Kuweka dau kunafungwa" },
  { code: "zh", label: "投注截止" },
];
const WIDTHS = [320, 360, 393, 768, 1280];

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log(`FAIL ${name}${extra ? ` — ${extra}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Mint a local demo session (dev-only) so /proposals/new (authed) renders the form.
await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
// Warm up the route so the first measured locale doesn't race Next dev's cold compile.
await page.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=/Resolution date|Tarehe ya utatuzi|结算日期/", { timeout: 30000 }).catch(() => {});

for (const { code, label } of LOCALES) {
  await ctx.addCookies([{ name: "kp-locale", value: code, url: BASE }]);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`text=${label}`, { timeout: 15000 }).catch(() => {});
  // Serialized HTML (SSR content) — robust vs post-hydration innerText timing.
  const html = await page.content();
  ok(`[${code}] /proposals/new betting-close label present`, html.includes(label), `expected "${label}"`);
  ok(`[${code}] /proposals/new resolution label present`, /Resolution date|Tarehe ya utatuzi|结算日期/.test(html));
  ok(`[${code}] /proposals/new no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
}

// Responsiveness — no horizontal overflow on proposal pages across widths.
for (const path of ["/proposals", "/proposals/new"]) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${path} @${w}w no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);
  }
}

await browser.close();
console.log(`\nproposals-retest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
