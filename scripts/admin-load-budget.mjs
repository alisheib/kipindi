/**
 * PROVE the slow admin pages load inside a budget — DG-A-01.
 *
 * 🔴 WHAT THIS EXISTS TO CATCH. `/admin/reports` took **~88 seconds** and timed out at 60/90/240 s
 * during the 2026-08-28 design-gate drive. The cause filed in the register — *"its settlement-fee
 * / report-pack reads render 12,882 rows' aggregates"* — was **wrong**: the report pack is a
 * single period read and `getAuditPage` is an in-memory ring-buffer slice. The real defect was a
 * textbook N+1 in `categoryBreakdown()` (`src/lib/server/report-money.ts`): an `await` inside a
 * loop over every market row, i.e. **~13,000 sequential Prisma round-trips** at ~6-7 ms each.
 *
 * ⛔ AND IT WAS NEVER ONE PAGE. `/admin/insights` calls the same function, so it paid the same
 * 13,000 queries. A fix verified on one route would have left the other slow with nothing
 * watching it — which is the same mistake, one size down, as watching three routes and calling
 * the console covered. **Every admin route is measured now**; see the note on ROUTES below.
 *
 * ⭐ THE FLOOR IS THE POINT, and it is why this is not just a timer. `/admin/roles` is a
 * shell-only admin page — layout, sidebar, CSS, JS and almost no data. If the budget fails on
 * the real pages AND on the floor, the run measured the NETWORK, not the pages — a cold
 * container, a bad link, a Railway restart — and reporting that as a page regression would be a
 * confident lie. The floor has its own, much tighter budget and is asserted separately.
 *
 * ⚠️ `load`, NOT first-byte. These are server-rendered pages; the number the register quoted, and
 * the number an officer actually waits through, is `loadEventEnd`.
 *
 * ⚠️ THE ADMIN SESSION DIES MID-DRIVE, NON-DETERMINISTICALLY (see the programme door's trap list).
 * It cost this script its CONTROL on its second run — `/admin/finance` measured the sign-in page,
 * so the run could not say whether the server was warm. A guard that loses its control has lost
 * the thing that makes its other numbers mean anything, so it re-signs-in and retries.
 *
 *   node scripts/admin-load-budget.mjs [baseUrl]      (default: production)
 */
import { chromium } from "playwright";
import { loginOnce, BASE as DEFAULT_BASE } from "./live/harness.mjs";
import { ADMIN_ROUTES } from "./design-gate/routes.mjs";

const BASE = process.argv[2] || DEFAULT_BASE;

/** The register's own target for DG-A-01: "GREEN when `load` < 5 s". Every admin route is
 *  held to it — an operator's console page that takes longer is a defect wherever it lives. */
const BUDGET_MS = 5_000;

/**
 * 🔴 THE POPULATION WAS HAND-PICKED, AND THAT IS WHY IT PASSED (corrected 2026-08-29).
 *
 * This gate used to time exactly three routes — `/admin/reports`, `/admin/insights` and
 * `/admin/finance` — and reported PASS. Driving the real admin list the same afternoon found
 * **`/admin/updown` at 13,325 ms**, 2.7× the route this gate was written to watch, on a page
 * no instrument looked at. ⛔ A guard that chooses its own population cannot fail. It now
 * imports the SAME list the render drive uses (`design-gate/routes.mjs`), so a route added
 * there is measured here without anybody remembering to add it.
 *
 * ⚠️ AND THE OLD "CONTROL" WAS NOT A CONTROL. `/admin/finance` was described here as
 * "comparable money aggregates, never slow" and given a TIGHTER 4,000 ms budget. Measured
 * best-of-three on production 2026-08-29 it is **2,701 ms** — against **292 ms** for
 * `/admin/roles`, a shell-only admin page. It was never fast; it was 9× the floor and inside
 * a budget chosen to fit it. A control has to be a page that does almost nothing, or it
 * cannot tell "the pages are slow" from "the network is slow".
 */
const FLOOR_ROUTE = "/admin/roles";
/** The floor is the shell: layout, sidebar badges, CSS, JS. Measured 292 ms; 2,000 ms is
 *  generous, and a floor that misses it means the run measured the network, not the pages. */
const FLOOR_BUDGET_MS = 2_000;

/** ⚠️ Git Bash rewrites a lone `/` in an env list — `export MSYS_NO_PATHCONV=1` before ONLY=. */
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()).filter(Boolean) : null;

const ROUTES = [
  { path: FLOOR_ROUTE, budget: FLOOR_BUDGET_MS, floor: true, why: "FLOOR — a shell-only admin page; if THIS is slow the run measured the network" },
  ...ADMIN_ROUTES.filter((p) => p !== FLOOR_ROUTE).map((path) => ({ path, budget: BUDGET_MS, why: "admin console route" })),
].filter((r) => !ONLY || ONLY.includes(r.path));

/** Two samples per route, and the BETTER one counts. A single cold-start sample is not the page. */
const SAMPLES = 2;

const b = await chromium.launch();
// 38 routes × 2 samples is ~76 page loads, and the admin session dies mid-drive
// non-deterministically (see the programme door's trap list). Allow more recoveries than the
// 3-route version needed, but keep a ceiling: a drive that re-authenticates without limit is
// hiding a platform finding as housekeeping.
const MAX_SIGNINS = 12;
let ctx = null;
let p = null;
let signins = 0;
let resignins = 0;
async function freshSession() {
  if (ctx) await ctx.close().catch(() => {});
  if (signins >= MAX_SIGNINS) throw new Error(`refusing sign-in #${signins + 1}`);
  signins++;
  const state = await loginOnce(b, "admin");
  ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  p = await ctx.newPage();
}
await freshSession();

const failures = [];
const rows = [];
let measured = 0;

for (const r of ROUTES) {
  const times = [];
  for (let i = 0; i < SAMPLES; i++) {
    try {
      await p.goto(`${BASE}${r.path}`, { waitUntil: "load", timeout: 180_000 });
      // ⛔ A revoked session renders the sign-in page at HTTP 200 — and it is FAST, so it would
      // read as a spectacular improvement. Never score it.
      if (/\/auth\//.test(p.url())) {
        // ⛔ Never score it: the sign-in page is FAST, so a revoked session reads as a
        // spectacular improvement. Re-sign-in and take this sample again.
        if (resignins < MAX_SIGNINS - 1) { resignins++; await freshSession(); i--; continue; }
        failures.push(`${r.path}: SESSION REVOKED — measured the sign-in page`);
        break;
      }
      const ms = await p.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return nav ? Math.round(nav.loadEventEnd) : null;
      });
      if (ms != null) times.push(ms);
    } catch (e) {
      // A timeout IS the finding here, not an error to swallow.
      failures.push(`${r.path}: ${e.message.slice(0, 80)}`);
    }
  }
  if (!times.length) continue;
  measured++;
  const best = Math.min(...times);
  const ok = best <= r.budget;
  rows.push({ ...r, best, times, ok });
  if (!ok) failures.push(`${r.path}: load ${best} ms over its ${r.budget} ms budget (samples ${times.join(", ")})`);
  console.log(`${r.path.padEnd(26)} ${String(best).padStart(6)} ms  budget ${String(r.budget).padStart(5)}  ${ok ? "✓" : "✗ OVER"}${r.floor ? "  [FLOOR]" : ""}${ok ? "" : `  — ${r.why}`}`);
}
await b.close();

// ⭐ THE FLOOR'S VERDICT CHANGES WHAT EVERY OTHER FAILURE MEANS. Say so out loud rather than
// leaving the reader to infer it from a column of numbers.
const floor = rows.find((r) => r.floor);
if (floor && !floor.ok) {
  console.log("\n⚠️  THE FLOOR ROUTE IS OVER BUDGET — this run measured the network or a cold");
  console.log("    container, not the pages. Re-run against a warm server before believing any row.");
} else if (floor) {
  const over = rows.filter((r) => !r.ok);
  console.log(`\nfloor ${floor.path} = ${floor.best} ms, so the shell is warm; ${over.length} route(s) carry their own cost past budget.`);
}

console.log(`\nadmin-load: ${measured} of ${ROUTES.length} routes measured, ${SAMPLES} samples each (best counts)`);
// ⛔ ZERO MEASUREMENTS IS A SKIPPED RUN, NEVER A GREEN ONE.
if (measured === 0) { console.error("FAIL — timed 0 routes. That is a broken drive, not a pass."); process.exit(1); }
if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log("PASS — every admin route measured is inside its load budget, and the control is fast.");
