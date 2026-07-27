/**
 * Routing / redirect audit — hits the platform as a signed-out visitor AND as an admin,
 * asserting every route lands where it should:
 *   · protected + admin routes, signed-out → 307 to the RIGHT login (/auth/login vs
 *     /auth/admin) carrying ?next=<original>
 *   · public routes, signed-out → 200
 *   · admin routes, as an admin → 200 (no gate bounce)
 *   · invalid ids → 404 (notFound), not a 200 shell
 *   · the /markets/[updownId] → /updown/[roundId] redirect
 *
 *   BASE=http://localhost:3000 node scripts/routing-audit.mjs
 * (dev server must run with NODE_ENV=development DISABLE_ADMIN_TOTP=true)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();

// ── Anonymous context (no session cookie) ────────────────────────────────────
const anon = await browser.newContext();
const anonReq = anon.request;

async function status(ctx, path) {
  const r = await ctx.get(`${BASE}${path}`, { maxRedirects: 0, failOnStatusCode: false, timeout: 90_000 });
  return { code: r.status(), location: r.headers()["location"] ?? "" };
}

// Public — must be 200 signed-out.
const PUBLIC = ["/", "/markets", "/live", "/results", "/updown", "/fairness", "/proposals", "/auth/login", "/auth/admin", "/leaderboard"];
for (const p of PUBLIC) {
  const { code } = await status(anonReq, p);
  ok(`public ${p} → 200`, code === 200 || code === 308, `got ${code}`);
}

// Protected (player) — signed-out must 307 to /auth/login?next=<path>.
const PLAYER_PROTECTED = ["/wallet", "/positions", "/profile", "/watchlist", "/proposals/new", "/updown/history"];
for (const p of PLAYER_PROTECTED) {
  const { code, location } = await status(anonReq, p);
  const good = code === 307 && location.includes("/auth/login") && location.includes(`next=${encodeURIComponent(p)}`);
  ok(`protected ${p} → 307 /auth/login?next=`, good, `got ${code} → ${location}`);
}

// Admin — signed-out must 307 to /auth/admin?next=<path> (NOT the player login).
const ADMIN = [
  "/admin", "/admin/reports", "/admin/finance", "/admin/transactions", "/admin/updown",
  "/admin/updown/rounds", "/admin/markets", "/admin/players", "/admin/config",
  "/admin/candidates", "/admin/ai-polls", "/admin/ai-usage", "/admin/resolver-queue",
  "/admin/moderation", "/admin/kyc", "/admin/payments", "/admin/sources", "/admin/system",
];
for (const p of ADMIN) {
  const { code, location } = await status(anonReq, p);
  const good = code === 307 && location.includes("/auth/admin") && location.includes("next=");
  ok(`admin ${p} → 307 /auth/admin?next=`, good, `got ${code} → ${location}`);
}

// ── Admin context (seed an admin → session cookie in this context) ────────────
const adminCtx = await browser.newContext();
await adminCtx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali" } });
await adminCtx.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } }).catch(() => {});
await adminCtx.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => {});
await adminCtx.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} }).catch(() => {});

// Admin routes as an admin → 200 (no bounce). DISABLE_ADMIN_TOTP=true skips 2FA.
for (const p of ADMIN) {
  const { code } = await status(adminCtx.request, p);
  ok(`admin ${p} (as admin) → 200`, code === 200, `got ${code}`);
}

// ── notFound — invalid ids must 404, never a 200 shell ────────────────────────
const NOTFOUND = ["/markets/mkt_does_not_exist_xyz", "/updown/udr_nope_xyz"];
for (const p of NOTFOUND) {
  const { code } = await status(adminCtx.request, p);
  ok(`invalid ${p} → 404`, code === 404, `got ${code}`);
}

// ── /markets/[updownId] → /updown/[roundId] redirect ──────────────────────────
{
  // Find an updown round via the board, then its market id via the round detail's data.
  const adv = await adminCtx.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => null);
  const advJson = adv ? await adv.json().catch(() => null) : null;
  const round = advJson?.rounds?.flatMap((c) => c.rounds ?? [])?.[0] ?? null;
  if (round?.marketId) {
    const { code, location } = await status(adminCtx.request, `/markets/${round.marketId}`);
    const good = (code === 307 || code === 308) && location.includes("/updown/");
    ok(`/markets/[updownId] → /updown/[roundId] redirect`, good, `got ${code} → ${location}`);
  } else {
    console.log("SKIP · no updown round available for the redirect check");
  }
}

await browser.close();
console.log(`\nrouting-audit: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
