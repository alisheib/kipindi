/**
 * qa:millionea-preview-bar — MILLIONEA'S STAFF PREVIEW IS ONE BAR ABOVE THE PAGE, ON ITS PAGES ALONE, FOR STAFF ALONE
 * (MASWALI-BUILD S5-FIX-PLATFORM D12, 2026-10-21; `test:millionea-shell` §1 holds the source).
 *
 *   FEATURE_MILLIONEA=STAFF_PREVIEW on a running DEV server (in-memory store), then:
 *   BASE=http://localhost:3501 node scripts/qa-millionea-preview-bar.mjs [outDir]
 *
 * 1. A guest: /millionea is the unknown page (404) and no page wears the bar (/results included).
 * 2. A staff session (`/api/dev-test/seed-admin`, dev only) at 320 and 1280, in en and sw: on /millionea, its slip, how-to and
 *    tickets pages and on /results (whose Millionea section wore the old callout) exactly ONE `millionea-preview-mark` bar,
 *    with the existing words, standing directly under the header and above the page's <main>, full width, and nothing in
 *    the page's column; /markets and / wear none; a client move /markets → /millionea brings the bar without a reload (the
 *    shell is the root layout's, which a move does not render again) and Back takes it away. Shots of /millionea and
 *    /results at both widths go to outDir (default .qa-artifacts/millionea-preview-bar/).
 * Read-only on the site but for the dev endpoint that seeds the staff account.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "millionea-preview-bar"));
mkdirSync(OUT, { recursive: true });
/** The existing preview key (`millionea.previewMark`), in the two languages driven. */
const WORDS = { en: "Preview — Millionea is visible to staff only.", sw: "Onyesho la awali — Millionea inaonekana kwa watumishi tu." };
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
  await page.waitForTimeout(350);
};
/** The bars on the page, where the first stands against the header and <main>, and whether <main> holds the words. */
const bars = (page, words) => page.evaluate((w) => {
  const list = [...document.querySelectorAll('[data-testid="millionea-preview-mark"]')];
  const header = document.querySelector("header.app-topbar, header[data-testid='journey-top-bar']");
  const main = document.querySelector("main");
  const inMain = main ? [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && (e.textContent ?? "").includes(w)).length : -1;
  const box = list[0]?.getBoundingClientRect();
  return {
    n: list.length,
    text: list[0]?.textContent?.trim() ?? null,
    top: box ? Math.round(box.top) : null,
    bottom: box ? Math.round(box.bottom) : null,
    headerBottom: header ? Math.round(header.getBoundingClientRect().bottom) : null,
    mainTop: main ? Math.round(main.getBoundingClientRect().top) : null,
    width: box ? Math.round(box.width) : null,
    inMain,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
}, words);

const browser = await chromium.launch();
try {
  // ── 1 · a guest ──
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const page = await ctx.newPage();
    const r = await page.goto(`${BASE}/millionea`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(page);
    const b = await bars(page, WORDS.en);
    ok("1.1 · a guest's /millionea is the unknown page (404) and wears no bar", r?.status() === 404 && b.n === 0, `(status ${r?.status()}, bars ${b.n})`);
    await page.goto(`${BASE}/results`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(page);
    ok("1.2 · a guest's /results wears no bar", (await bars(page, WORDS.en)).n === 0);
    await ctx.close();
  }
  // ── 2 · a staff session ──
  for (const l of ["en", "sw"]) {
    for (const w of [320, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 640 ? 780 : 900 } });
      await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
      const page = await ctx.newPage();
      const seeded = await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
      ok(`PREMISE ${l} ${w} · a staff session (seed-admin)`, seeded.ok(), `(${seeded.status()})`);
      for (const path of ["/millionea", "/millionea/slip", "/millionea/how", "/millionea/tickets", "/results"]) {
        const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await settle(page);
        const b = await bars(page, WORDS[l]);
        rows.push({ l, w, path, status: r?.status(), ...b });
        const under = b.headerBottom !== null && b.top !== null && Math.abs(b.top - b.headerBottom) <= 1 && b.mainTop !== null && b.bottom <= b.mainTop + 1;
        ok(`2.1 ${l} ${w} ${path} · one bar, the words, directly under the header and above the page, full width, none in the column`,
          r?.status() === 200 && b.n === 1 && b.text === WORDS[l] && under && b.width === w && b.inMain === 0 && !b.overflowX, JSON.stringify(b));
        if (path === "/millionea" || path === "/results") {
          await page.screenshot({ path: join(OUT, `${path === "/results" ? "results" : "millionea"}-${l}-${w}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(420, (b.bottom ?? 0) + 240) } });
        }
      }
      for (const path of ["/markets", "/"]) {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await settle(page);
        ok(`2.2 ${l} ${w} ${path} · no bar off Millionea's pages`, (await bars(page, WORDS[l])).n === 0);
      }
      // A client move in and out (the shell is the root layout's: no server render of it on a move).
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await settle(page);
      const link = page.locator('a[href="/millionea"]').first();
      if (await link.count()) {
        if (await link.isVisible()) await link.click(); else await link.evaluate((a) => a.click());
        await page.waitForURL(/\/millionea$/, { timeout: 60_000 });
        await page.waitForTimeout(600);
        const inn = await bars(page, WORDS[l]);
        await page.goBack();
        await page.waitForURL(/\/markets$/, { timeout: 60_000 });
        await page.waitForTimeout(600);
        const out = await bars(page, WORDS[l]);
        ok(`2.3 ${l} ${w} · a client move to /millionea brings the bar, and Back takes it away`, inn.n === 1 && out.n === 0, `(in ${inn.n}, back ${out.n})`);
      } else {
        ok(`2.3 ${l} ${w} · a Millionea door to move by`, false, "(no a[href=/millionea] on /markets)");
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
console.log(`\nqa:millionea-preview-bar: ${pass} passed, ${fails.length} failed (shots in ${OUT})`);
process.exitCode = fails.length ? 1 : 0;
