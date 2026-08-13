/**
 * Does the board's GRID render a page of the set its bar promised?
 *
 * ⛔ This has to be a browser, not a regex over the response body. React streams the Suspense
 * boundary, so the byte order of the HTML is not the DOM order: on production, of the fifteen
 * market questions on the page, six land before the "recently resolved" strip's bytes and nine
 * after it — a regex slice reads 6 where the DOM holds 12. A count taken from streamed bytes is
 * not a measurement of what a player sees.
 *
 * Run: npm run qa:discovery-board -- [baseUrl]        (default http://localhost:3009)
 *      npm run qa:discovery-board -- https://50pick.tz   — read-only, safe against production
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || "http://localhost:3009";
const PAGE_SIZE = 12;

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  PASS ${label}`);
  else { console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function read(qs = "") {
  await page.goto(`${BASE}/markets${qs}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const grid = document.querySelector('[data-board="grid"]');
    const bar = document.querySelector("[data-result-count]");
    return {
      cards: grid ? grid.querySelectorAll("h3.mcardp-q").length : -1,
      promised: bar ? Number(bar.getAttribute("data-result-count")) : NaN,
      // Everything on the page, so the resolved strip is visibly excluded from `cards`.
      allQuestions: document.querySelectorAll("h3.mcardp-q").length,
      barHeight: Math.round(document.querySelector(".kp-discovery-bar")?.getBoundingClientRect().height ?? -1),
    };
  });
}

console.log(`\ncounting cards in the DOM at ${BASE}\n`);

for (const [label, qs] of [
  ["default board", ""],
  ["pool=50k", "?pool=50k"],
  ["status=all", "?status=all"],
  ["odds=cont", "?odds=cont"],
  ["page 2", "?page=2"],
]) {
  const r = await read(qs);
  const expected = qs === "?page=2"
    ? Math.max(0, Math.min(PAGE_SIZE, r.promised - PAGE_SIZE))
    : Math.min(r.promised, PAGE_SIZE);
  ok(`${label}: grid draws ${r.cards}, promised ${r.promised} → expected ${expected}`,
    r.cards === expected, `all questions on page = ${r.allQuestions}`);
}

// The mobile regression this batch fixed: the bar was 448px tall at 360 in sw/zh.
// 🔴 This block used to set a cookie named `locale`, which the product does not read — so it
// measured ENGLISH while reporting "in Swahili", and English is the easy case (Swahili short
// labels run 1.74× p90 / 2.25× p95 longer). Both languages are measured now, and `assertLang`
// refuses to report a number taken in the wrong one. See `scripts/qa-locale.mjs`.
for (const loc of ["sw", "zh"]) {
  const m = await localisedContext(browser, { locale: loc, width: 360, height: 780, baseUrl: BASE });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await assertLang(mp, loc);
  await mp.waitForTimeout(300);
  const h = await mp.evaluate(() => Math.round(document.querySelector(".kp-discovery-bar")?.getBoundingClientRect().height ?? -1));
  ok(`[${loc}] the sticky bar stays under a third of a 780px phone viewport (${h}px)`,
    h > 0 && h < 260, `${h}px — it was 448px when the rows wrapped instead of scrolling`);
  await m.close();
}

/**
 * 🔴 A CONTROL THAT OPENS INTO A 4-PIXEL SLIVER IS NOT A CONTROL — found on production
 * 2026-08-13, after the bar had been signed off.
 *
 * The sort and topic menus are `<details>` whose listbox is absolutely positioned. They sat inside
 * the row that scrolls horizontally below `lg`, and CSS coerces `overflow-y: visible` to `auto` as
 * soon as one axis scrolls — so a 274px sort panel and a 362px topic panel were clipped by a 62px
 * strip to **4px, or 1%**. Zero of six sort options and zero of eight topics could be reached at
 * 360px, on the width most of this audience uses.
 *
 * ⛔ NOTHING CAUGHT IT. The page had no horizontal overflow, every tap target measured 44px, no
 * element overflowed its own box, and a screenshot of a CLOSED menu looks perfect. The defect only
 * exists once the control is opened, so the check has to open it.
 */
{
  const m = await localisedContext(browser, { locale: "sw", width: 360, height: 780, baseUrl: BASE });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await assertLang(mp, "sw");
  await mp.waitForTimeout(300);

  const summaries = mp.locator(".kp-discovery-bar details.kp-menu > summary");
  const count = await summaries.count();
  // Refuse to pass on an absent premise: no menus found means the selector rotted, not that the
  // menus are fine (50pick-standards §5b rule 5).
  ok(`the bar still has its two menu controls (found ${count})`, count === 2, "selector may have rotted");

  for (let i = 0; i < count; i++) {
    await summaries.nth(i).scrollIntoViewIfNeeded();
    await summaries.nth(i).click();
    await mp.waitForTimeout(250);
    const r = await mp.evaluate((idx) => {
      const det = [...document.querySelectorAll(".kp-discovery-bar details.kp-menu")][idx];
      const panel = det.querySelector('[role="listbox"]');
      const pb = panel.getBoundingClientRect();
      let node = panel.parentElement, box = null;
      while (node && node !== document.body) {
        const st = getComputedStyle(node);
        if (["auto", "scroll", "hidden", "clip"].includes(st.overflowX) || ["auto", "scroll", "hidden", "clip"].includes(st.overflowY)) {
          box = node.getBoundingClientRect();
          break;
        }
        node = node.parentElement;
      }
      const visible = box ? Math.max(0, Math.min(pb.bottom, box.bottom) - Math.max(pb.top, box.top)) : pb.height;
      return {
        label: det.querySelector("summary")?.innerText.replace(/\s+/g, " ").trim().slice(0, 24),
        options: panel.querySelectorAll('[role="option"]').length,
        panelH: Math.round(pb.height),
        visibleH: Math.round(visible),
      };
    }, i);
    const pct = r.panelH ? Math.round((r.visibleH / r.panelH) * 100) : 0;
    ok(
      `[360 sw] the "${r.label}" menu opens fully — ${r.options} options, ${r.visibleH}/${r.panelH}px visible (${pct}%)`,
      r.options > 0 && pct >= 90,
      `${pct}% visible — it was 1% when the menu sat inside the horizontally scrolling strip`,
    );
    await mp.keyboard.press("Escape");
    await mp.waitForTimeout(120);
  }
  await m.close();
}

await browser.close();
console.log(fail === 0 ? "\n✅ the grid draws what the bar promised\n" : `\n❌ ${fail} failure(s)\n`);
process.exit(fail === 0 ? 0 : 1);
