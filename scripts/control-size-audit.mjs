/**
 * MEASURE EVERY CONTROL ON AN ADMIN SCREEN — rectangles, not class names.
 *
 * ⛔ A CLASS NAME IS NOT A HEIGHT on this repo, and that is the whole reason this exists.
 * `tailwind.config.ts` overrides the spacing scale, so `h-8` is 48px and `h-10` is 80px — a
 * control can read as "small" in the source and paint large. The only honest instrument is
 * `getBoundingClientRect` on the rendered element.
 *
 * Reports every button, input, select and combobox grouped by ROW (elements sharing a y-band),
 * because inconsistency is a property of what sits NEXT TO what — two controls 8px apart in
 * height are invisible apart and obvious side by side.
 *
 *   BASE=http://localhost:3001 node scripts/control-size-audit.mjs /admin/resolver-queue
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3001";
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : ["/admin/resolver-queue"];
const WIDTH = Number(process.env.W || 1280);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.request.get(BASE + "/api/dev-test/promote-admin", { timeout: 120000 }).catch(() => {});
await page.request.post(BASE + "/api/dev-test/promote-admin", { data: { phone: "+255700000000" }, timeout: 120000 });

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const controls = await page.evaluate(() => {
    const sel = 'button, input:not([type="hidden"]), select, [role="combobox"], a[class*="btn"]';
    return [...document.querySelectorAll(sel)]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().slice(0, 26),
          w: Math.round(r.width), h: Math.round(r.height),
          top: Math.round(r.top + window.scrollY),
          disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
          fs: cs.fontSize,
        };
      })
      .filter((c) => c.w > 0 && c.h > 0);
  });

  console.log(`\n══ ${route}  @${WIDTH}  ${controls.length} controls ══`);

  /* Group into visual ROWS — anything whose top is within 16px shares a band. */
  const rows = [];
  for (const c of controls.sort((a, b) => a.top - b.top)) {
    const row = rows.find((r) => Math.abs(r.top - c.top) <= 16);
    if (row) { row.items.push(c); row.top = Math.min(row.top, c.top); }
    else rows.push({ top: c.top, items: [c] });
  }

  let flagged = 0;
  for (const row of rows) {
    if (row.items.length < 2) continue;
    const hs = [...new Set(row.items.map((i) => i.h))].sort((a, b) => a - b);
    /* ⚠️ 4px is the threshold, not 0. Controls of different KINDS legitimately differ a little;
       a gap wider than that reads as two different vocabularies sitting side by side. */
    const spread = hs[hs.length - 1] - hs[0];
    if (spread <= 4) continue;
    flagged++;
    console.log(`\n  y≈${row.top}  heights ${hs.join(" / ")}px  (spread ${spread}px)`);
    for (const i of row.items.sort((a, b) => b.h - a.h)) {
      console.log(`     ${String(i.h).padStart(3)}px ${String(i.w).padStart(4)}w  ${i.fs.padEnd(7)} ${i.disabled ? "[disabled] " : ""}${i.tag}  ${JSON.stringify(i.text)}`);
    }
  }
  if (flagged === 0) console.log("  ✅ every multi-control row is within 4px");
  else console.log(`\n  🔴 ${flagged} row(s) mix control heights by more than 4px`);
}

await browser.close();
