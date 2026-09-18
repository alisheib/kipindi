/**
 * qa:house-bots-visual — the desk's own visual gate (C7-SPEC rulings 318, 374, 404, 407, 419; §5's capture list).
 *
 *   KP_BASE=http://127.0.0.1:3021 npm run qa:house-bots-visual
 *   KP_BASE=… KP_ROUTES=/admin/desk KP_WIDTHS=360,1280 npm run qa:house-bots-visual
 *
 * ⛔ IT DRIVES A LOCAL `next start` AND NOTHING ELSE. `scripts/live/harness.mjs` defaults to production and holds
 * Ali's own console password; signing in with it would revoke his live session (50pick keeps ONE live session per
 * account) and would point a house-bot instrument at the live platform. So this script takes a local base URL, signs
 * in with `seed-admin-local.mts`'s LOCALHOST-ONLY credentials, and REFUSES any base that is not a loopback address.
 *
 * ⛔ IT IS NOT A SCREENSHOT SCRIPT. §5 names what is being LOOKED FOR, and each of those is asserted here, per width,
 * because a tile nobody reads is not a measurement:
 *   1. no node whose text starts "TZS" is clipped, ellipsised or wrapped (§A5: never clip money or a timestamp);
 *   2. at 360, every table's first THREE columns — the account and both money answers — are inside the visible strip
 *      without scrolling (the defect measured on /admin/house: 4 of 6 money cells out of view);
 *   3. no tile carries two amounts, and no KPI delta carries a currency-prefixed figure (ruling 404);
 *   4. every interactive control is at least 44px tall (§tap-min), at every width;
 *   5. every empty-state message box is inside the viewport;
 *   6. ⛔ no house-vocabulary word anywhere in the rendered body — the shared vocabulary, never a new regex.
 *
 * ⛔ NO POSTGRES OR NO SERVER IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED) — a visual gate that skips silently is
 * the "not applicable" verdict this programme has paid for twice.
 *
 * Tiles are VIEWPORT tiles, never `fullPage`, written under `KP_SHOTS` (default `.qa-house-bots/`, gitignored by the
 * `.qa-` prefix rule). Evidence is regenerable and stays out of the tracked tree (W20).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { houseHits } from "./lib/house-bot-vocabulary.mjs";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — qa:house-bots-visual drives a LOCAL next start only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const WIDTHS = (process.env.KP_WIDTHS ?? "360,640,768,1024,1280,1920").split(",").map((n) => Number(n.trim())).filter(Boolean);
const ROUTES = (process.env.KP_ROUTES ?? "/admin/desk").split(",").map((s) => s.trim()).filter(Boolean);
const SHOTS = process.env.KP_SHOTS ?? ".qa-house-bots";
const PHONE = "+255700000000";
const PASSWORD = process.env.KP_ADMIN_PASSWORD ?? "QaAdmin2026!";

mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0, notMeasured = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const nm = (l, why) => { notMeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
try {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="tel"], input[name="phone"]', PHONE.replace("+255", ""));
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  // ⛔ HTTP 200 PROVES NOTHING: a refused request lands on /auth/ and renders perfectly. Only the final URL tells it.
  if (/\/auth\//.test(page.url())) {
    nm("sign-in", `the local admin could not sign in at ${BASE} (seed with scripts/seed-admin-local.mts and set DISABLE_ADMIN_TOTP=true)`);
    console.log(`\nqa:house-bots-visual: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED`);
    process.exit(3);
  }
  await page.close();

  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width, height: 900 });
      const resp = await p.goto(BASE + route, { waitUntil: "networkidle", timeout: 60_000 });
      if (!resp || /\/auth\//.test(p.url())) { nm(`${route} @${width}`, `landed on ${p.url()}`); await p.close(); continue; }
      // The dev overlay is never part of a tile.
      await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      const tag = `${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root"}-${width}`;
      writeFileSync(join(SHOTS, `${tag}.png`), await p.screenshot({ fullPage: false }));

      const facts = await p.evaluate(() => {
        const vis = (el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && el.closest("[hidden]") === null;
        };
        const money = [...document.querySelectorAll(".amount, [class*='amount']")].filter(vis);
        const clipped = money
          .filter((el) => (el.textContent ?? "").trim().startsWith("TZS"))
          .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getClientRects().length > 1)
          .map((el) => (el.textContent ?? "").trim());
        const tiles = [...document.querySelectorAll(".admin-kpi")].filter(vis).map((t) => ({
          text: (t.textContent ?? "").trim(),
          amounts: ((t.textContent ?? "").match(/TZS/g) ?? []).length,
          delta: (t.querySelector("span[title]")?.textContent ?? "").trim(),
        }));
        const shortControls = [...document.querySelectorAll("button, a[href], [role='switch'], input, select")]
          .filter(vis)
          .filter((el) => el.getBoundingClientRect().height < 44 - 0.5 && !el.closest("thead"))
          .map((el) => `${el.tagName.toLowerCase()}:${Math.round(el.getBoundingClientRect().height)}px:${(el.textContent ?? "").trim().slice(0, 24)}`);
        const firstCells = [...document.querySelectorAll("table.admin-tbl tbody tr")].slice(0, 1).flatMap((tr) =>
          [...tr.children].slice(0, 3).map((td) => {
            const r = td.getBoundingClientRect();
            return { text: (td.textContent ?? "").trim().slice(0, 24), left: Math.round(r.left), right: Math.round(r.right) };
          }));
        const emptyBoxes = [...document.querySelectorAll("table.admin-tbl tbody td[colspan]")].filter(vis).map((td) => {
          const r = td.querySelector("div")?.getBoundingClientRect() ?? td.getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right) };
        });
        return { clipped, tiles, shortControls, firstCells, emptyBoxes, body: document.body.innerText, vw: window.innerWidth };
      });

      ok(`§5.1 ${route} @${width} · no TZS figure is clipped, ellipsised or wrapped`, facts.clipped.length === 0, facts.clipped.join(" | "));
      ok(`§5.3 ${route} @${width} · no tile carries two amounts`, facts.tiles.every((t) => t.amounts <= 1), facts.tiles.filter((t) => t.amounts > 1).map((t) => t.text).join(" | "));
      ok(`§5.3 ${route} @${width} · no KPI delta carries a currency-prefixed figure`, facts.tiles.every((t) => !/TZS\s*[\d,]/.test(t.delta)), facts.tiles.map((t) => t.delta).filter((d) => /TZS\s*[\d,]/.test(d)).join(" | "));
      ok(`§5.4 ${route} @${width} · every interactive control is at least 44px tall`, facts.shortControls.length === 0, facts.shortControls.join(" | "));
      ok(`§5.6 ${route} @${width} · no house-vocabulary word anywhere in the rendered body`, houseHits(facts.body).length === 0, houseHits(facts.body).slice(0, 6).join(","));
      if (facts.firstCells.length) {
        const inView = facts.firstCells.every((c) => c.left >= -1 && c.right <= facts.vw + 1);
        ok(`§5.2 ${route} @${width} · the account and BOTH money answers are inside the visible strip without scrolling`, inView, JSON.stringify(facts.firstCells));
      } else {
        nm(`§5.2 ${route} @${width}`, "no roster row was rendered, so the money columns' position was not measured");
      }
      if (facts.emptyBoxes.length) {
        ok(`§5.5 ${route} @${width} · every empty-state message box is inside the viewport`,
          facts.emptyBoxes.every((b) => b.left >= -1 && b.right <= facts.vw + 1), JSON.stringify(facts.emptyBoxes));
      }
      await p.close();
    }
  }
} finally {
  await ctx.close();
  await browser.close();
}
console.log(`\nqa:house-bots-visual: ${pass} passed, ${fail} failed, ${notMeasured} NOT MEASURED — tiles in ${SHOTS}`);
process.exit(fail > 0 ? 1 : notMeasured > 0 ? 3 : 0);
