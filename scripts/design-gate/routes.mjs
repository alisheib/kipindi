/**
 * THE ROUTE POPULATION every design-gate instrument measures — ONE definition site.
 *
 * 🔴 WHY THIS FILE EXISTS (DG-A-01, 2026-08-29). `scripts/admin-load-budget.mjs` timed a
 * HAND-PICKED list of three admin routes and passed. Driving the real list found
 * `/admin/updown` at **13,325 ms** — 2.7× the route the gate was built to watch, on a page
 * nothing was watching. A guard that chooses its own population cannot fail, and this
 * programme has now paid for that shape five times.
 *
 * ⛔ So the list lives here and nowhere else. `measure.mjs` imports it; the load budget
 * imports it; anything added for one is measured by both. Copying it into a second file
 * would re-create the divergence (DESIGN_AUTHORITY §0a — one fact, one home).
 */

/** Every admin console route the drive visits. */
export const ADMIN_ROUTES = [
  "/admin", "/admin/live", "/admin/finance", "/admin/reports", "/admin/players", "/admin/players/cohorts",
  "/admin/markets", "/admin/markets/new", "/admin/resolver-queue", "/admin/settlement", "/admin/objections",
  "/admin/proposals", "/admin/candidates", "/admin/ai-polls", "/admin/ai-usage", "/admin/sources",
  "/admin/updown", "/admin/updown/rounds", "/admin/updown/proposals",
  "/admin/payments", "/admin/transactions", "/admin/approvals", "/admin/bonuses", "/admin/affiliate", "/admin/invites",
  "/admin/compliance", "/admin/aml", "/admin/self-exclusions", "/admin/privacy", "/admin/retention", "/admin/moderation",
  "/admin/audit", "/admin/events", "/admin/system", "/admin/config", "/admin/insights", "/admin/staff", "/admin/roles",
];

/** Public player routes — reachable signed OUT, which is how they are driven while the
 *  player QA credentials are rejected by production. */
export const PLAYER_PUBLIC = [
  "/", "/markets", "/updown", "/live", "/results", "/leaderboard", "/proposals", "/fairness", "/help",
  "/legal/terms", "/legal/privacy", "/legal/responsible-gambling", "/legal/aml",
  "/auth/login", "/auth/register", "/auth/forgot-password",
];

/** Player routes that need a session. */
export const PLAYER_AUTHED = [
  "/wallet", "/wallet/deposit", "/wallet/withdraw", "/positions", "/positions/performance", "/watchlist",
  "/notifications", "/updown/history", "/proposals/new",
  "/profile", "/profile/account", "/profile/activity", "/profile/invite", "/profile/kyc",
  "/profile/notifications", "/profile/responsible-gambling", "/profile/security", "/profile/sessions",
  "/profile/source-of-funds",
];

/**
 * ⭐ THE SECTION-RAIL EXPANDER (§K rule 7f, DG-S-07 2026-08-31).
 *
 * A tabbed console is a NEW POPULATION for every instrument that walks these lists: the panels
 * behind the rail are not rendered until their tab is in force, so a drive that only ever
 * visits `/admin/roles` has never seen `read-tiers-matrix.tsx` — including its own hard
 * confirm — even though `/admin/roles` is `qa:admin-load`'s floor route.
 *
 * ⛔ THE TAB SET IS READ OFF THE RENDERED RAIL, NEVER TYPED HERE AS `?` ENTRIES, and that is
 * two rulings rather than a preference:
 *   ① §0a — the tab set's home is the page's own definition. A hand-typed copy in this file is
 *     a second home that goes stale the first time a tab is renamed, and goes stale SILENTLY.
 *   ② It is mechanically broken anyway. `admin-shell-seal.mjs` compares a query-stripped
 *     landing against the route as written, so every `?tab=` entry filed as REDIRECTED and was
 *     never probed — while `probed` stayed non-zero, so the "zero probes is a skipped run"
 *     guard never fired. (That comparison is fixed in the same commit as this expander; the
 *     ruling stands regardless, because it is about where the fact LIVES.)
 *
 * Usage: after a drive has loaded `route`, call this with the live page. It returns the
 * SIBLING tab URLs — the rail's own hrefs, minus the one already on screen.
 */
export async function expandSectionRail(page, route) {
  const hrefs = await page.evaluate(() => {
    const rail = document.querySelector("[data-section-rail]");
    if (!rail) return [];
    return [...rail.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter(Boolean);
  }).catch(() => []);

  const seen = new Set();
  const out = [];
  const here = route.replace(/^https?:\/\/[^/]+/, "");
  for (const h of hrefs) {
    // Same-origin, path-relative only — a rail never leaves the page it belongs to.
    if (!h.startsWith("/")) continue;
    if (h === here) continue;
    // ⚠️ Keyed on the FULL href including its query: the whole point is that `?tab=reads` is a
    // different render of the same path. Deduping on the path would collapse the set to one.
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}
