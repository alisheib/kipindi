/**
 * Measure spot-check — proves the page width caps are real at wide viewports.
 *
 * A throwaway-grade harness deliberately kept in the repo: it is the fastest way
 * to answer "is the console actually capped?" without booting the whole responsive
 * sweep. The permanent, two-sided assertion lives in scripts/responsive-audit.mjs
 * (the `[data-measure]` upper-bound check); this one prints the numbers so a human
 * can read them, and writes screenshots to .50pick-shots/measure/.
 *
 *   BASE=http://localhost:3010 node scripts/measure-check.mjs
 *   WIDTHS=1280,1920,2560 ONLY=/admin/finance node scripts/measure-check.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3010";
const WIDTHS = (process.env.WIDTHS || "1280,1920,2560").split(",").map(Number);
const ROUTES = (process.env.ONLY ||
  "/admin,/admin/finance,/admin/players,/admin/markets/new,/admin/transactions,/markets,/wallet,/profile"
).split(",");

const OUT = ".50pick-shots/measure";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.request.get(`${BASE}/auth/demo`).catch(() => {});
await ctx.request.post(`${BASE}/api/dev-test/seed-admin`).catch(() => {});

console.log(`\nMeasure spot-check — ${BASE}\n`);
console.log("  route                     width   measure-root      content-w   widest-block   fields>600px");
console.log("  " + "-".repeat(94));

let problems = 0;
for (const w of WIDTHS) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: 1000 });
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(300);
    } catch {
      console.log(`  ${route.padEnd(26)}${String(w).padEnd(8)}(did not load)`);
      continue;
    }
    const r = await page.evaluate(() => {
      const roots = [...document.querySelectorAll("[data-measure]")].map((el) => ({
        tier: el.getAttribute("data-measure"),
        w: Math.round(el.getBoundingClientRect().width),
      }));
      // Widest non-scrolling block directly under main — the backstop for anything
      // that escapes the data-measure net.
      let widest = 0;
      for (const el of document.querySelectorAll("main > *, main > * > *")) {
        const cs = getComputedStyle(el);
        if (/auto|scroll/.test(cs.overflowX)) continue;
        widest = Math.max(widest, Math.round(el.getBoundingClientRect().width));
      }
      // Any text-entry control wider than a readable measure.
      const fields = [...document.querySelectorAll("input,textarea,select")]
        .map((el) => Math.round(el.getBoundingClientRect().width))
        .filter((x) => x > 600);
      return { roots, widest, fields };
    });
    const root = r.roots[0];
    const flagField = r.fields.length ? `** ${r.fields.length} (max ${Math.max(...r.fields)}px)` : "0";
    if (r.fields.length) problems++;
    if (!root) problems++;
    console.log(
      `  ${route.padEnd(26)}${String(w).padEnd(8)}${String(root ? `${root.tier}` : "** NONE").padEnd(18)}` +
      `${String(root ? root.w : "-").padEnd(12)}${String(r.widest).padEnd(15)}${flagField}`);
    const tag = `${route.replace(/\//g, "_") || "_root"}@${w}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
  }
  await page.close();
}
await browser.close();
console.log(`\n  screenshots -> ${OUT}/`);
console.log(problems === 0 ? "  all routes capped, no oversized fields\n" : `  ${problems} flag(s) above — read the shots\n`);
