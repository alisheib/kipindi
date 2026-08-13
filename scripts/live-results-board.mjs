/**
 * Does /results deliver what its category rail promises — WITH and WITHOUT a search?
 *
 * 🔴 WHY THIS EXISTS. Measured on production 2026-08-13: `/results?q=bitcoin` returned the same
 * four cards under `cat=crypto`, `cat=sports` and `cat=weather`, while the rail painted the chosen
 * category as selected. The page dropped the category whenever a search was active
 * (`searching ? undefined : …`), so the control said it was applied and was not — the 2026-08-10
 * failure shape on a second surface. Nothing guarded /results at all; this is that guard.
 *
 * ⛔ Counted in a real browser DOM, not by a regex over the response: React streams Suspense, so
 * the byte order of the HTML is not the DOM order, and /results renders a featured carousel whose
 * cards are excluded from the grid. A byte count cannot tell those apart.
 *
 * Run: npm run qa:results-board -- [baseUrl]        (default http://localhost:3009)
 *      npm run qa:results-board -- https://50pick.tz   — read-only, safe against production
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || "http://localhost:3009";
const PER_PAGE = 12;

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  PASS ${label}`);
  else { console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
};

const browser = await chromium.launch();
const ctx = await localisedContext(browser, { locale: "en", width: 1280, height: 900, baseUrl: BASE });
const page = await ctx.newPage();

async function read(qs = "") {
  await page.goto(`${BASE}/results${qs}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const promised = {};
    for (const el of document.querySelectorAll("[data-chip^='cat:']")) {
      promised[el.getAttribute("data-chip").slice(4)] = Number(el.getAttribute("data-count"));
    }
    // ⛔ COUNT BY MARKET LINK, NOT BY CARD HEADING. This first counted `h3.mcardp-q`, which is the
    // grid card's heading — and /results lifts its top markets OUT of the grid into a featured
    // carousel whose card is an `<h2>`. The guard reported "promised 2, delivered 1" against a
    // page that was rendering both. Every card of either kind links to its market, so a unique
    // count of those hrefs is the one measure that sees the whole set.
    const hrefs = new Set(
      [...document.querySelectorAll('a[href^="/markets/"]')]
        .map((a) => (a.getAttribute("href") || "").split("?")[0])
        .filter((h) => h.length > "/markets/".length),
    );
    const grid = document.querySelector(".market-grid");
    const gridCards = grid ? grid.querySelectorAll("h3.mcardp-q").length : 0;
    const countEl = document.querySelector("[data-result-count]");
    return {
      promised,
      gridCards,
      allCards: hrefs.size,
      // The page's own stated total for the active filters. `null` (not NaN) when absent, so a
      // missing attribute reads as "this page does not publish a total" rather than as a number.
      resultCount: countEl ? Number(countEl.getAttribute("data-result-count")) : null,
    };
  });
}

console.log(`\nchecking /results at ${BASE}\n`);

const base = await read();
const cats = Object.keys(base.promised);
ok(`the category rail exposes per-control counts (${cats.length} controls)`, cats.length >= 2, "no [data-chip=cat:*] found — selector may have rotted");
console.log(`  promised: ${JSON.stringify(base.promised)}\n`);

/**
 * Press a control and check the page keeps the promise it advertised.
 *
 * ⛔ THIS CANNOT BE `delivered === min(promised, PER_PAGE)`, and assuming it could made this guard
 * fail twice against a CORRECT production page. Page 1 lifts up to three markets out of the grid
 * into the notable carousel, and `NotableCarousel` renders only `slides[current]` — so two of those
 * three are not in the document at all. The DOM card count is therefore
 * `(pageSize − liftedIntoCarousel) + 1`, which no caller can predict.
 *
 * So the strong assertion is made against the number the PAGE publishes (`data-result-count`,
 * which is the pager total), and the DOM is held to what is genuinely knowable: never more than a
 * page, never more than the promise, non-empty whenever the promise is non-empty — and EXACT when
 * the set is small enough that no multi-slide carousel exists to lift anything out.
 */
const CAROUSEL_MULTI_FROM = 8; // `all.length >= 8` is when /results lifts three instead of one

async function promiseEqualsDelivery(label, qs, promisedFrom, id) {
  const r = await read(qs);
  const promised = promisedFrom[id];
  const stated = r.resultCount;

  // Refuse on an absent premise rather than comparing against NaN.
  ok(`${label} — the page publishes a total`, stated !== null, "no [data-result-count] on the page");
  // The contract that matters: the rail's number and the page's own total are the same value.
  ok(`${label} — the rail promised ${promised} and the page states ${stated}`, stated === promised,
    "the count beside a control disagrees with the page's own total");

  ok(`${label} delivers no more than one page (${r.allCards} ≤ ${PER_PAGE})`, r.allCards <= PER_PAGE);
  ok(`${label} delivers no more than it promised (${r.allCards} ≤ ${promised})`, r.allCards <= promised);
  if (promised > 0) {
    ok(`${label} promised ${promised} and delivered something (${r.allCards})`, r.allCards > 0,
      "a control advertised results and the board came back empty");
  }
  if (promised > 0 && promised < CAROUSEL_MULTI_FROM) {
    ok(`${label} delivers EXACTLY its promise (${r.allCards} === ${promised}, no carousel lift)`,
      r.allCards === promised, `grid heading count=${r.gridCards}`);
  }
}

console.log("── promise == delivery, category by category ──");
for (const id of cats) {
  await promiseEqualsDelivery(`cat=${id}`, id === "all" ? "" : `?cat=${id}`, base.promised, id);
}

/**
 * The regression itself: with a search active, the counts must be cross-filtered BY that search,
 * and pressing a category must still narrow the set. Before the fix every category delivered an
 * identical board here.
 */
console.log("\n── a search and a category must COMPOSE (the production defect) ──");
const term = "a";
const searched = await read(`?q=${term}`);
console.log(`  promised under q="${term}": ${JSON.stringify(searched.promised)}`);

/**
 * ⛔ THIS USED TO ASSERT "the counts changed when the search was applied", AND THAT DEMANDED A
 * FALSE STATEMENT. On a fixture where every title contains the query, the counts are correctly
 * identical and a correct product failed. The invariant that is true for EVERY query is
 * monotonicity: a search can only ever narrow a category, never widen it.
 */
for (const id of cats) {
  ok(
    `q="${term}" cannot widen cat=${id} (${searched.promised[id]} ≤ ${base.promised[id]})`,
    searched.promised[id] <= base.promised[id],
    "a search made a category count go UP, which no filter may do",
  );
}
for (const id of cats) {
  await promiseEqualsDelivery(`q="${term}" cat=${id}`, id === "all" ? `?q=${term}` : `?q=${term}&cat=${id}`, searched.promised, id);
}

// The other half of "cross-filtered, not census": a query that matches nothing must zero EVERY
// category. Under the production defect the categories kept advertising the whole archive.
{
  const none = "zzqqxxnothingmatchesthis";
  const r = await read(`?q=${none}`);
  const nonZero = cats.filter((c) => r.promised[c] !== 0);
  ok(
    `a query matching nothing zeroes every category count (${cats.length} controls)`,
    nonZero.length === 0,
    `still advertising: ${nonZero.map((c) => `${c}=${r.promised[c]}`).join(", ")}`,
  );
  ok(`a query matching nothing delivers an empty board`, r.allCards === 0, `delivered ${r.allCards}`);
  ok(`a query matching nothing states a total of 0`, r.resultCount === 0, `states ${r.resultCount}`);
}

// A category whose promise is 0 must not be reachable-but-lying: pressing it delivers 0 AND the
// page offers a way out that leads somewhere non-empty.
console.log("\n── a category that promises 0 offers a real way out ──");
const zero = cats.find((c) => c !== "all" && searched.promised[c] === 0);
if (zero && searched.promised.all > 0) {
  await page.goto(`${BASE}/results?q=${term}&cat=${zero}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(300);
  const exit = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a[href*='/results']")].find((el) => {
      const h = el.getAttribute("href") || "";
      return !h.includes("cat=") && h.includes("q=");
    });
    return a ? { href: a.getAttribute("href"), text: a.innerText.replace(/\s+/g, " ").trim() } : null;
  });
  ok(`cat=${zero} promises 0 and offers an exit back to every category`, !!exit, "no exit rendered on an empty filtered search");
  if (exit) console.log(`     exit -> ${exit.href}  "${exit.text}"`);
} else {
  console.log(`  (skipped: no zero-count category under q="${term}" on this dataset)`);
}

await assertLang(page, "en");
await browser.close();
console.log(fail === 0 ? "\n✅ /results delivers what its rail promises\n" : `\n❌ ${fail} failure(s)\n`);
process.exit(fail === 0 ? 0 : 1);
