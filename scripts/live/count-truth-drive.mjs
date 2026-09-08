#!/usr/bin/env node
/**
 * `npm run qa:count-truth` — is the number on a pill what pressing it actually shows?
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, AND IT IS NOT HYPOTHETICAL. A board once printed *"40 live ·
 * TZS 1,659k in play"* above ZERO cards, at nine of nine viewport × locale combinations. The
 * number was true. The board was still a lie. ⛔ A count and its rows are TWO computations of one
 * fact — the count is folded from a patched state, the rows are filtered from the real one — so
 * they can disagree while each is internally consistent, and nothing looks broken.
 *
 * ⭐ IT GENERALISES THE `/markets`-ONLY PROBE. `qa:discovery-probe` checked one board's numbers;
 * this campaign puts a rail on fifteen more routes, each folding its own counts, so the check has
 * to be about the CONTRACT rather than about one page.
 *
 * ── WHAT IT ASSERTS, PER PILL ────────────────────────────────────────────────────────────────
 *   1 · THE PILL'S PROMISE IS DELIVERED — `data-count` equals the rows that arrive at its href,
 *       walked across EVERY page. ⚠️ Comparing one page's worth would make the check vacuous the
 *       moment a result set outgrows a page, which is `qa:admin-filters`' own recorded first-run
 *       false finding.
 *   2 · THE DESTINATION AGREES WITH ITSELF — the page it lands on publishes the SAME number in
 *       its own `data-result-count`. A pill can be right about a page that is wrong about itself.
 *   3 · NO ROW IS COUNTED TWICE — `data-row-id` is distinct across the walk. ⛔ This is the arm
 *       that earned the driver its place: `/results` promoted the archive's three
 *       highest-volume markets into a page-1 carousel but subtracted them only from page 1's
 *       grid, so two of them rendered again on page 2. Measured before the fix: page 1 carried
 *       14 rows against page 2's 8, and paging the archive showed the same two settlements
 *       twice. ⭐ Neither `data-result-count` nor any lens assertion could see it — the total was
 *       right and every survivor belonged to its lens; only the PARTITION across pages was broken.
 *
 * ⛔ LOCALHOST ONLY, and it needs a populated fixture — see §0 of `docs/PLAYER-QUERY-CAMPAIGN.md`.
 * A rail with no rows behind it makes every count 0 and every arm vacuously true, so a surface
 * that reaches zero pills is a FAILURE here rather than a quiet pass.
 *
 *   node scripts/live/count-truth-drive.mjs [baseUrl] [--only=/watchlist]
 */
import { chromium } from "playwright";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got ${BASE}`);
  process.exit(1);
}
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = arg("only", null);

/**
 * The surfaces, and the FLOOR each must clear.
 *
 * ⚠️ `minPills` IS THE PER-ROUTE VACUITY CONTROL, exactly as `qa:filter-scan`'s `rails` count is.
 * A route that suddenly offers three pills instead of twelve has lost a rail, and without a floor
 * this driver would report a cheerful "3/3 agree". ⛔ Re-derive it by counting the DISTINCT
 * destinations the bar renders, not the pills — the sheet and the desktop nav render the same
 * pill twice and this driver de-duplicates by href.
 */
const SURFACES = [
  { id: "/markets", path: "/markets", minPills: 8 },
  { id: "/results", path: "/results", minPills: 12 },
  { id: "/positions", path: "/positions", minPills: 10 },
  { id: "/wallet", path: "/wallet", minPills: 12 },
  { id: "/updown/history", path: "/updown/history", minPills: 8 },
  { id: "/proposals", path: "/proposals", minPills: 14 },
  // ⚠️ FIVE, NOT MORE. This route's rail is lenses only — its sort is a MENU, not pills, so it
  // publishes no `data-count` and is correctly outside this driver's population.
  { id: "/notifications", path: "/notifications", minPills: 5 },
  { id: "/watchlist", path: "/watchlist", minPills: 10 },
  /* DECLARED 2026-09-08 (PLAYER QUERY, task 4.6).
     ⛔ THIS LIST IS THE DECLARATION PLACE §6 OF THE CAMPAIGN DOC DOES NOT NAME. §6 names four —
     the hook, `filter-language.test.mts`, `filter-language-scan.mjs` and `responsive-audit.mjs` —
     and this driver, `bar-geometry-drive.mjs`, `player-filter-drive.mjs` and
     `player-query-shots.mjs` each carry their own hand-typed SURFACES on top of those. None of the
     four fails loudly when a route is missing: an absent route is simply never visited, and the
     run reports a cheerful pass over a surface it never opened. §6 has been corrected.

     ⚠️ `minPills: 7` IS A FLOOR OVER A VARIABLE RAIL, which no other row here has to be. The lens
     population is the player's OWN audit categories, so it is `all` + however many kinds of event
     that persona has produced — not a module constant. The floor is therefore the smallest honest
     bar: `all` + at least one category (2) + the five window pills (5). ⛔ Do not raise it to match
     whatever a particular fixture happens to render; that would make a correct page red for a
     player with a short history. */
  { id: "/profile/account", path: "/profile/account", minPills: 7 },
  /* DECLARED 2026-09-08 (PLAYER QUERY, task 4.7). ⭐ Unlike its neighbours this route's lens
     population is FIXED — four outcome arms — so the floor can be exact rather than conservative:
     4 outcome pills + 5 window pills = 9 distinct destinations. */
  { id: "/fairness", path: "/fairness", minPills: 9 },
];

const surfaces = ONLY ? SURFACES.filter((s) => s.id === ONLY || s.path === ONLY) : SURFACES;
if (surfaces.length === 0) {
  console.error(`🔴 --only=${ONLY} matched no surface — refusing to report a clean run over nothing.`);
  process.exit(3);
}

let pass = 0;
/** ⛔ Counted and printed — a run that quietly retried its way to green is a vacuous pass. */
let retries = 0;
const fails = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

const auth = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
if (!auth || auth.status() >= 400) {
  console.error("🔴 could not sign in at /auth/demo — REFUSING to continue. A run that was asked to sign in and could not has measured nothing.");
  await browser.close();
  process.exit(2);
}

/** Walk EVERY page of a URL; return the row ids in order plus the page's own promised total. */
async function walk(url) {
  const ids = [];
  let promised = null;
  let prevPage = null;
  for (let pg = 1; pg <= 40; pg++) {
    const u = new URL(url, BASE);
    if (pg > 1) u.searchParams.set("page", String(pg));
    await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 40_000 });
    await page.waitForTimeout(220);
    if (promised === null) {
      const t = await page.getAttribute("[data-result-count]", "data-result-count").catch(() => null);
      promised = t === null ? null : Number(t);
    }
    /**
     * ⛔ SCOPE THE COUNT, OR IT COUNTS THE WRONG BOARD — and this driver made the mistake this
     * repo has already paid for TWICE before adopting the rule verbatim rather than re-deriving
     * it. `/markets` renders a three-card "recently resolved" strip BELOW the board; those are
     * real markets with real row ids, correctly excluded from `data-result-count`. Counting
     * page-wide reported eighteen failures on a correct page, every one of them "delivered =
     * promised + 3". `filter-stress.mjs:59-61` records the identical finding ("promised 0,
     * delivered 2 against a correct page") and `discovery-board-probe.mjs` records batch 1's
     * ("15 of 40" on production, green locally only because the in-memory store held no resolved
     * markets, so the strip never rendered).
     *
     * ⚠️ `?? document` IS THE CORRECT FALLBACK, NOT A SHRUG. A surface with no second strip IS
     * its own scope — and on `/results` that is load-bearing, because its featured carousel holds
     * cards LIFTED OUT of the grid, so they belong to the count and must be inside the scope.
     */
    const here = await page.evaluate(() => {
      const scope = document.querySelector('[data-board="grid"]') ?? document;
      return [...scope.querySelectorAll("[data-row-id]")].map((e) => e.getAttribute("data-row-id"));
    });
    if (here.length === 0) break;
    /**
     * ⛔ STOP WHEN THE PAGES RUN OUT, NOT WHEN THE COUNT IS SATISFIED — and this was a REAL HOLE
     * in this driver, found by its own RED control. The loop used to break on
     * `ids.length >= promised`, which is the very number under test: a page that renders MORE
     * rows than it should ends the walk early, and whatever it double-counted on a later page is
     * never fetched. The `pages-overlap` mutation slipped through exactly there — page 1
     * over-rendered to the promised total, so page 2, which held the duplicate, was never
     * visited. ⭐ A stop condition derived from the thing being measured cannot measure it.
     *
     * ⚠️ THE END IS DETECTED FROM THE PRODUCT'S OWN CLAMP. `safePage = min(page, totalPages)`, so
     * asking for a page past the end re-serves the LAST one — an identical id sequence. That, not
     * an arithmetic guess, is what "no more pages" looks like from outside.
     */
    const same = prevPage !== null && prevPage.length === here.length && prevPage.every((v, k) => v === here[k]);
    if (same) break;
    prevPage = here;
    ids.push(...here);
  }
  return { ids, promised };
}

for (const s of surfaces) {
  console.log(`\n── ${s.id} ${"─".repeat(Math.max(0, 56 - s.id.length))}`);
  await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 40_000 });
  const rail = await page.waitForSelector("[data-filter-rail]", { timeout: 20_000 }).catch(() => null);
  if (!rail) { fails.push(`${s.id} · NO [data-filter-rail] — the instrument, or the page`); continue; }
  await page.waitForTimeout(300);

  const pills = await page.$$eval("[data-filter-rail] [data-chip]", (els) =>
    els.map((e) => ({ chip: e.getAttribute("data-chip"), count: e.getAttribute("data-count"), href: e.getAttribute("href") })),
  );
  // The sheet and the desktop nav render the same pill twice — one destination, one check.
  const dests = new Map();
  for (const p of pills) if (p.href && !dests.has(p.href)) dests.set(p.href, p);

  if (dests.size < s.minPills) {
    fails.push(`${s.id} · only ${dests.size} distinct pill destinations, floor is ${s.minPills} — a rail is missing, and every count below would agree vacuously`);
    continue;
  }
  console.log(`  ${pills.length} pills · ${dests.size} distinct destinations (floor ${s.minPills})`);

  /**
   * ⚠️ A DISAGREEMENT IS RE-MEASURED BEFORE IT IS REPORTED, AND THIS IS NOT LENIENCY.
   *
   * The pill's promise is read at one instant and its rows are walked at another — two page loads
   * — and some of these pages are LIVE. `/wallet?when=30d` is a window ending at *now*, and the
   * ledger gains rows continuously while the fixture's markets settle; measured 2026-09-08, one
   * run reported *"promised 57, delivered 58"* and two immediate re-runs were clean. ⛔ Reporting
   * that as a defect is a false finding about correct arithmetic.
   *
   * ⭐ THE TWO CASES HAVE DIFFERENT SIGNATURES, AND THAT IS WHAT SEPARATES THEM. A race gives a
   * DIFFERENT answer next time; a broken fold gives the SAME wrong answer every time. So a
   * mismatch is measured again from scratch — both sides — and only a repeat is a failure.
   * ⛔ Every retry is COUNTED AND PRINTED. A run that quietly retried its way to green would be
   * exactly the vacuous pass this driver exists to refuse.
   */
  for (const [href, p] of dests) {
    if (p.count === null) { fails.push(`${s.id} · "${p.chip}" carries no data-count`); continue; }

    let promisedByPill = Number(p.count);
    let { ids, promised } = await walk(href);
    let distinct = new Set(ids).size;
    let retried = false;

    if (distinct !== promisedByPill || (promised !== null && promised !== promisedByPill)) {
      // Re-read the PROMISE as well as the rows — the origin page may itself have moved on.
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 40_000 });
      await page.waitForSelector("[data-filter-rail]", { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(300);
      const again = await page.$$eval("[data-filter-rail] [data-chip]", (els) =>
        els.map((e) => ({ count: e.getAttribute("data-count"), href: e.getAttribute("href") })),
      );
      const re = again.find((x) => x.href === href);
      if (re && re.count !== null) promisedByPill = Number(re.count);
      ({ ids, promised } = await walk(href));
      distinct = new Set(ids).size;
      retried = true;
      retries++;
    }

    if (ids.length !== distinct) {
      fails.push(`${s.id} · "${p.chip}" · ${ids.length - distinct} DUPLICATE data-row-id across pages of ${href} — the pages are not a partition`);
    } else if (distinct !== promisedByPill) {
      fails.push(`${s.id} · "${p.chip}" · promised ${promisedByPill}, ${href} delivered ${distinct}${retried ? " (twice — not a race)" : ""}`);
    } else if (promised !== null && promised !== promisedByPill) {
      fails.push(`${s.id} · "${p.chip}" · promised ${promisedByPill} but the destination's own bar says ${promised}${retried ? " (twice — not a race)" : ""}`);
    } else {
      pass++;
    }
  }
  console.log(`  ${dests.size} destinations checked`);
}

await browser.close();

console.log(`\n${pass} pill${pass === 1 ? "" : "s"} verified · ${fails.length} failed · ${retries} re-measured after a disagreement\n`);
for (const f of fails) console.log(`  ✗ ${f}`);
if (fails.length) {
  console.log("\n🔴 A COUNT THAT DISAGREES WITH ITS OWN PAGE. Either the fold and the filter apply different rules, or the pages overlap. Both are visible to a player as a number that lies.");
  process.exit(1);
}
if (pass === 0) {
  console.log("🔴 ZERO pills verified — a green run over nothing is not a pass.");
  process.exit(1);
}
console.log("✅ every count on every rail is what pressing it actually shows.");
