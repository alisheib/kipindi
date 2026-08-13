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
{
  const m = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await m.addCookies([{ name: "locale", value: "sw", url: BASE }]);
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await mp.waitForTimeout(300);
  const h = await mp.evaluate(() => Math.round(document.querySelector(".kp-discovery-bar")?.getBoundingClientRect().height ?? -1));
  ok(`the sticky bar stays under a third of a 780px phone viewport in Swahili (${h}px)`,
    h > 0 && h < 260, `${h}px — it was 448px when the rows wrapped instead of scrolling`);
  await m.close();
}

await browser.close();
console.log(fail === 0 ? "\n✅ the grid draws what the bar promised\n" : `\n❌ ${fail} failure(s)\n`);
process.exit(fail === 0 ? 0 : 1);
