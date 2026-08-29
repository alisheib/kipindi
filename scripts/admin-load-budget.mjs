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
 * 13,000 queries. Both are measured here, because a fix verified on one route would have left the
 * other slow with nothing watching it.
 *
 * ⭐ THE CONTROL IS THE POINT, and it is why this is not just a timer. `/admin/finance` renders
 * comparable money aggregates and was never slow. If the budget fails on the two suspects AND on
 * the control, the run measured the NETWORK, not the pages — a cold container, a bad link, a
 * Railway restart — and reporting that as a page regression would be a confident lie. The control
 * has its own, tighter budget and is asserted separately.
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

const BASE = process.argv[2] || DEFAULT_BASE;

/** The register's own target for DG-A-01: "GREEN when `load` < 5 s". */
const BUDGET_MS = 5_000;
/** The control was always fast; hold it to a tighter number so a slow network cannot hide in it. */
const CONTROL_BUDGET_MS = 4_000;

const ROUTES = [
  { path: "/admin/reports", budget: BUDGET_MS, why: "THE P0 — 88 s on 2026-08-28, the N+1 in categoryBreakdown()" },
  { path: "/admin/insights", budget: BUDGET_MS, why: "calls the SAME categoryBreakdown() — one fix, two routes" },
  { path: "/admin/finance", budget: CONTROL_BUDGET_MS, control: true, why: "CONTROL — comparable money aggregates, never slow" },
];

/** Two samples per route, and the BETTER one counts. A single cold-start sample is not the page. */
const SAMPLES = 2;

const b = await chromium.launch();
const MAX_SIGNINS = 6;
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
  console.log(`${r.path.padEnd(18)} ${String(best).padStart(6)} ms  budget ${String(r.budget).padStart(5)}  ${ok ? "✓" : "✗ OVER"}${r.control ? "  [CONTROL]" : ""}  — ${r.why}`);
}
await b.close();

// ⭐ THE CONTROL'S VERDICT CHANGES WHAT A FAILURE MEANS. Say so out loud rather than leaving the
// reader to infer it from three numbers.
const control = rows.find((r) => r.control);
const suspects = rows.filter((r) => !r.control);
if (control && !control.ok && suspects.some((s) => !s.ok)) {
  console.log("\n⚠️  THE CONTROL IS ALSO OVER BUDGET — this run measured the network or a cold");
  console.log("    container, not the pages. Re-run against a warm server before believing it.");
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
