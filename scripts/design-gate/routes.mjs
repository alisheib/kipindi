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
