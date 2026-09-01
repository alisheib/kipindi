/**
 * `npm run qa:tab-candidates` — WHICH ADMIN PAGES EARN AN INTERNAL SECTION RAIL.
 *
 * ⭐ IT DOES NOT DECIDE. It measures the ONE test of §K rule 7a that is mechanical —
 * test ① *"the height must come from the SECTION COUNT, not from ROW DENSITY: if one panel is
 * more than ~40% of the page's docH, that panel IS the length and a rail moves nothing"* — and
 * it prints the numbers a human needs for tests ② and ③, which are judgement and cannot be
 * automated:
 *   ② the bands must be alternative TASKS, read one at a time — not one document read together
 *     (this is why `/admin/finance` does not qualify: wallet liability is read AGAINST house
 *     accounts, and tabs would put the two compared things on different screens);
 *   ③ nothing load-bearing may be left behind a click (7d).
 *
 * ⛔ LENGTH ALONE DOES NOT QUALIFY A PAGE. A tab is a REACHABILITY change, never a rhythm
 * change. A page that is 8,000px of ONE paginated table is not a tab candidate; it is a
 * pagination or density question, and tabbing it yields a small landing tab and a tab that is
 * still 8,000px.
 *
 * ⚠️ THE PANEL IS `.glass-panel` — the root `AdminCard` renders (`admin-shell.tsx:525`). Only
 * TOP-LEVEL panels are measured: a card nested inside another card is part of its parent's
 * height, and counting it separately would report a page as having many small sections when it
 * has one big one — the exact misread that would qualify a page that must not be tabbed.
 *
 * ⛔ IT REPORTS WHAT IT COULD NOT SEE. A route that redirects, renders no panel, or fails to
 * load is listed as UNMEASURED, never silently skipped — a candidate list with a hole in it is
 * worse than a short one.
 *
 *   npm run qa:tab-candidates                  # every admin route
 *   ONLY=/admin/system,/admin/config npm run qa:tab-candidates
 *   ⚠️ On Git Bash prefix MSYS_NO_PATHCONV=1 when passing ONLY, or a leading slash is rewritten.
 */
import { chromium } from "playwright";
import { login, BASE } from "../live/harness.mjs";
import { ADMIN_ROUTES } from "./routes.mjs";

const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
/** §K rule 7a ①. A page whose tallest panel exceeds this share IS that panel. */
const DOMINANT = 0.40;
/** "More than three screens" — the length at which 7a is worth asking at all. */
const TALL = H * 3;

const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const routes = ONLY ?? ADMIN_ROUTES;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(120_000);
page.setDefaultTimeout(60_000);

await login(page, "admin");

const rows = [];
const unmeasured = [];

for (const route of routes) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const landed = new URL(page.url()).pathname;
    /* ⛔ A REDIRECT IS NOT A MEASUREMENT. `/admin/totp-verify` bounces an already-verified
       officer to `/admin`; measuring the landing page and filing it under the route asked for
       is how a drive reports a number for a page it never opened. */
    if (landed !== route.split("?")[0]) { unmeasured.push(`${route} → redirected to ${landed}`); continue; }

    const m = await page.evaluate((sel) => {
      const doc = document.documentElement;
      const docH = Math.max(doc.scrollHeight, document.body.scrollHeight);
      const all = [...document.querySelectorAll(sel)];
      // Top-level only: drop any panel that sits inside another panel.
      const top = all.filter((el) => !all.some((o) => o !== el && o.contains(el)));
      const heights = top.map((el) => Math.round(el.getBoundingClientRect().height));
      const titles = top.map((el) => (el.querySelector("p")?.textContent || "").trim().slice(0, 34));
      return {
        docH: Math.round(docH),
        panels: top.length,
        heights,
        titles,
        hasRail: !!document.querySelector("[data-section-rail]"),
      };
    }, ".glass-panel");

    if (!m.panels) { unmeasured.push(`${route} — no .glass-panel rendered (docH ${m.docH})`); continue; }

    const tallest = Math.max(...m.heights);
    const share = m.docH ? tallest / m.docH : 0;
    const idx = m.heights.indexOf(tallest);
    rows.push({ route, ...m, tallest, share, tallestTitle: m.titles[idx] || "(untitled)" });
  } catch (e) {
    unmeasured.push(`${route} — ${String(e).slice(0, 90)}`);
  }
}
await browser.close();

rows.sort((a, b) => b.docH - a.docH);

console.log(`\n§K rule 7a ① — admin pages by height, ${W}×${H}  (three screens = ${TALL}px)`);
console.log("─".repeat(112));
console.log("  route                          docH   panels  tallest  share   rail   7a① verdict");
console.log("─".repeat(112));

let candidates = 0, alreadyRailed = 0;
for (const r of rows) {
  const tall = r.docH > TALL;
  const dominated = r.share > DOMINANT;
  let verdict;
  if (r.hasRail) { verdict = "✅ ALREADY A RAIL"; alreadyRailed++; }
  else if (!tall) verdict = "·  under 3 screens";
  else if (dominated) verdict = `⛔ ONE PANEL IS ${(r.share * 100).toFixed(0)}% — "${r.tallestTitle}"`;
  else { verdict = "⭐ PASSES ① — judge ② and ③"; candidates++; }
  console.log(
    `  ${r.route.padEnd(30)} ${String(r.docH).padStart(5)}  ${String(r.panels).padStart(5)}  ${String(r.tallest).padStart(6)}  ${(r.share * 100).toFixed(0).padStart(4)}%  ${(r.hasRail ? "yes" : "—").padStart(4)}   ${verdict}`,
  );
}

console.log("─".repeat(112));
console.log(`  ${rows.length} route(s) measured · ${rows.filter((r) => r.docH > TALL).length} over three screens · ${alreadyRailed} already railed · ⭐ ${candidates} pass 7a ①`);

if (unmeasured.length) {
  console.log(`\n⚠️  ${unmeasured.length} route(s) UNMEASURED — a candidate list with a hole in it is worse than a short one:`);
  for (const u of unmeasured) console.log(`   · ${u}`);
}

console.log(
  `\n⛔ PASSING ① IS NOT QUALIFYING. 7a needs all THREE: ② the bands must be alternative TASKS` +
  `\n   read one at a time (not one document compared against itself), and ③ nothing load-bearing` +
  `\n   behind a click (7d). Read the page before you tab it.`,
);
