/**
 * SCREENSHOTS FOR SCAN #1 — the six surfaces this session changed, at the §A6 matrix.
 *
 * ⛔ A GREEN SUITE IS NOT A READABLE SCREEN. Every fix in scan #1 was proven by an assertion;
 * this proves the pixels. 360 / 768 / 1280 / 1920, which is the matrix the design system
 * measures against.
 *
 * ⚠️ RUN AGAINST `next start`, NOT `npm start`. The `start` script begins with
 * `prisma migrate deploy`, and this session authored a migration it must NOT apply — the
 * prisma lane belongs to the money-ops session. Boot the server with `npx next start -p 3001`.
 *
 * ⚠️ FULL PAGE, and that is the point of it. `rendered is not visible` — a card 119px below the
 * fold was "shipped" for a day because a viewport-only capture cannot see it. Each shot is the
 * whole document, and the harness also REPORTS the document height so a surface that collapsed
 * to nothing cannot be mistaken for a clean one.
 *
 *   BASE=http://localhost:3001 node scripts/scan-fix-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3001";
const OUT = join(process.cwd(), "docs", "shots-scan-2026-08-28");

/** The six the work order names, each carrying at least one of this session's fixes. */
const PAGES = [
  { name: "admin",       url: "/admin",            why: "S-03/S-12 provider ramp + ink · S-13 no-op strips" },
  { name: "compliance",  url: "/admin/compliance",  why: "S-04/S-15 the bar painted from zero data" },
  { name: "ai-polls",    url: "/admin/ai-polls",    why: "S-07 filter rails · S-08 `other` category" },
  { name: "candidates",  url: "/admin/candidates",  why: "S-06 the deleted Search button · S-07 · S-08 VERIFYING" },
  { name: "config",      url: "/admin/config",      why: "S-05 the Infinity% explainer" },
  { name: "retention",   url: "/admin/retention",   why: "§B the purge ceremony" },
];

const WIDTHS = [360, 768, 1280, 1920];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });

/* Boot a demo session and promote it to ADMIN — without this every /admin/* route redirects to
   the public site and the run captures the homepage six times while reporting success. */
const boot = await ctx.newPage();
/* ⚠️ NOT networkidle. In dev the HMR websocket never goes idle, so networkidle waits out its
   full timeout on every navigation and the run dies before the first shot. */
await boot.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60000 });
/* ⚠️ Dev compiles an API route on FIRST HIT, and that first compile can exceed the default
   30s request timeout — so the promotion silently times out and every /admin/* capture then
   redirects to the public site while the run still reports six good screenshots. Warm it,
   then post with a real budget. */
await boot.request.get(`${BASE}/api/dev-test/promote-admin`, { timeout: 120000 }).catch(() => {});
const promoted = await boot.request.post(`${BASE}/api/dev-test/promote-admin`, {
  data: { phone: "+255700000000" }, timeout: 120000,
});
if (!promoted.ok()) throw new Error(`promote-admin failed: HTTP ${promoted.status()} — every shot would be the public site`);
await boot.close();

mkdirSync(OUT, { recursive: true });
const report = [];

for (const w of WIDTHS) {
  const c = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: "dark", storageState: await ctx.storageState() });
  for (const p of PAGES) {
    const page = await c.newPage();
    let height = 0, title = "", err = null;
    try {
      const res = await page.goto(`${BASE}${p.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      /* Dev compiles a route on first hit, so the first paint can be a skeleton. Wait for the
         network to settle for a beat rather than for a state that never arrives. */
      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500);
      height = await page.evaluate(() => document.documentElement.scrollHeight);
      title = await page.title();
      /* ⛔ THE REDIRECT CHECK. A capture that silently landed on the public site looks like a
         perfectly good screenshot of the wrong thing — the exact failure the admin harness
         documents. The URL is asserted, not assumed. */
      const landed = page.url().replace(BASE, "");
      if (!landed.startsWith(p.url)) err = `REDIRECTED to ${landed}`;
      if ((res?.status() ?? 0) >= 400) err = `HTTP ${res?.status()}`;
      await page.screenshot({ path: join(OUT, `${p.name}-${w}.png`), fullPage: true });
    } catch (e) {
      err = String(e?.message ?? e).slice(0, 120);
    }
    report.push({ w, name: p.name, height, title: title.slice(0, 40), err });
    await page.close();
  }
  await c.close();
}

await browser.close();

console.log(`\n${"width".padEnd(7)}${"page".padEnd(14)}${"docHeight".padEnd(11)}title`);
console.log("─".repeat(70));
let bad = 0;
for (const r of report) {
  /* A document shorter than ~400px on an admin page is not a page, it is an error card or a
     redirect that happened to render. Reported rather than left for the eye to catch. */
  const thin = r.height > 0 && r.height < 400;
  if (r.err || thin) bad++;
  console.log(
    `${String(r.w).padEnd(7)}${r.name.padEnd(14)}${String(r.height).padEnd(11)}${r.title}` +
    (r.err ? `  🔴 ${r.err}` : thin ? "  ⚠️ suspiciously short" : ""),
  );
}
console.log(`\n${report.length} shots → docs/shots-scan-2026-08-28/`);
console.log(bad === 0 ? "✅ every route rendered a real admin page" : `🔴 ${bad} shot(s) need looking at`);
process.exit(bad === 0 ? 0 : 1);
