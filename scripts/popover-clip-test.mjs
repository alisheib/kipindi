/**
 * PROVE the "How to search" popover is actually ON SCREEN — DG-A-03 / DG-P-02.
 *
 * ⛔ WHY A HIT TEST AND NOT A MEASUREMENT. A clipped popover has a perfectly healthy
 * `getBoundingClientRect()`: `overflow: hidden` on an ancestor removes the PAINT, not the box.
 * DG-A-03 took THREE corrections and a bounding box saw NONE of them —
 *   ① clipped invisible by `.search-box`'s own input group,
 *   ② opened below the fold,
 *   ③ opened off the TOP of the viewport,
 *   ④ opened inside a card that clipped it again.
 * `document.elementFromPoint` is the only instrument that separates "laid out" from "visible",
 * and it answers ②/③ for free: a point outside the viewport returns `null`, so an off-screen
 * panel fails the same assertion that catches a clipped one.
 * ⛔ DO NOT "simplify" this to a rect check. That is the exact regression this file exists to stop.
 *
 * Three probe points per panel — top edge, centre, bottom edge — because a partial clip is the
 * failure mode that a single centre probe would call a pass (correction ④ clipped only the tail).
 *
 * ⛔ A ROUTE WITH NO TRIGGER IS A FAILURE, NOT A SKIP. Every route below carries a SearchBox
 * today; if one stops carrying it, this gate must go red and a human must re-choose the
 * population. A gate that quietly shrinks its own population cannot fail.
 *
 *   node scripts/popover-clip-test.mjs [baseUrl]      (default: production)
 */
import { chromium } from "playwright";
import { loginOnce, BASE as DEFAULT_BASE } from "./live/harness.mjs";

const BASE = process.argv[2] || DEFAULT_BASE;

/** Both surfaces in ONE run — the popover is one shared component (DG-A-03 == DG-P-02). */
const SURFACES = [
  {
    name: "admin",
    authed: true,
    routes: [
      { path: "/admin/transactions", why: "the deepest filter row — the panel opens under a dense rail" },
      { path: "/admin/candidates", why: "search sits inside a card that clipped correction ④" },
      { path: "/admin/ai-polls", why: "list toolbar" },
      { path: "/admin/proposals", why: "updown proposals toolbar" },
    ],
  },
  {
    name: "player",
    // ⭐ ANON ON PURPOSE. These three are public routes and the search box is present
    // signed-out, so this half needs no password — which is what kept DG-A-03 measurable
    // while all six player QA secrets were being rejected by production (session 76).
    authed: false,
    routes: [
      { path: "/markets", why: "the board — the busiest SearchBox on the platform" },
      { path: "/live", why: "live board" },
      { path: "/results", why: "results board" },
    ],
  },
];

/** Is the panel PAINTED where its own box says it is? */
const probe = () => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return { found: false };
  const q = d.getBoundingClientRect();
  const cx = Math.round((q.left + q.right) / 2);
  // top edge · centre · bottom edge — inset 6px so a 1px border never decides the answer.
  const hits = [q.top + 6, (q.top + q.bottom) / 2, q.bottom - 6].map((y) => {
    const el = document.elementFromPoint(cx, Math.round(y));
    return !!el && (el === d || d.contains(el));
  });
  return {
    found: true,
    w: Math.round(q.width), h: Math.round(q.height),
    top: Math.round(q.top), bottom: Math.round(q.bottom),
    inViewport: q.top >= 0 && q.bottom <= innerHeight,
    hits,
    visible: hits.every(Boolean),
  };
};

const b = await chromium.launch();
const failures = [];
let checked = 0;

for (const surface of SURFACES) {
  const state = surface.authed ? await loginOnce(b, "admin") : undefined;
  // ⚠️ ONE CONTEXT PER SURFACE, NOT ONE PER ROUTE. A fresh context per cell, seeded from a saved
  // `storageState`, stops being accepted partway through a long admin drive — measured on
  // `qa:chart-axis`, which read the SIGN-IN PAGE (at HTTP 200) for its last 8 of 15 cells.
  const ctx = await b.newContext({
    ...(state ? { storageState: state } : {}),
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const p = await ctx.newPage();
  for (const { path, why } of surface.routes) {
    {
    try {
      await p.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90_000 });
      // ⛔ NEVER `networkidle` as the wait condition — player pages hold an SSE stream open.
      await p.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
      await p.waitForTimeout(900);
      // ⛔ A revoked session renders the sign-in page at HTTP 200. Say so; never score it 0/0 green.
      if (/\/auth\//.test(p.url())) {
        failures.push(`${path}: SESSION REVOKED — measured the sign-in page`);
        continue;
      }
      const help = p.locator('.search-box-wrap button[aria-expanded]').first();
      if (!(await help.count())) {
        failures.push(`${path}: no SearchHelp trigger — the population shrank, re-choose it deliberately`);
        continue;
      }
      await help.click();
      await p.waitForTimeout(500);
      const r = await p.evaluate(probe);
      checked++;
      const ok = r.found && r.visible;
      if (!ok) {
        failures.push(
          `${path}: ${r.found ? `${r.w}×${r.h} top=${r.top} bottom=${r.bottom} hits=[${r.hits}] inViewport=${r.inViewport}` : "the panel never entered the DOM"}`,
        );
      }
      console.log(
        `${surface.name.padEnd(6)} ${path.padEnd(22)} ${ok ? "✓ PAINTED+HITTABLE" : "✗ FAIL"}  ` +
          `${r.found ? `${r.w}×${r.h} top=${r.top} hits=[${r.hits}]` : "no dialog"}  — ${why}`,
      );
    } catch (e) {
      failures.push(`${path}: ${e.message.slice(0, 90)}`);
    }
    }
  }
  await ctx.close();
}
await b.close();

const expected = SURFACES.reduce((n, s) => n + s.routes.length, 0);
console.log(`\npopover-clip: ${checked} of ${expected} SearchBox surfaces probed at three points each`);
// ⛔ ZERO PROBES IS A SKIPPED RUN, NEVER A GREEN ONE. This campaign has twice closed a gate that
// measured nothing at all; a guard that cannot fail is not a guard.
if (checked === 0) {
  console.error("FAIL — opened 0 popovers. That is a broken drive, not a pass.");
  process.exit(1);
}
if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log("PASS — every SearchHelp panel is painted and hittable at its top, centre and bottom.");
