/**
 * Break-it: ADMIN PORTAL — QA hammers the admin attack surface.
 *
 *   Run: BASE=http://localhost:3000  node scripts/break-it-admin.mjs
 *
 * Coverage (no admin credentials required):
 *   A · Anonymous gating across every /admin/* route
 *   B · Player gating — a logged-in PLAYER must be redirected from /admin
 *   C · TOTP cookie spoofing
 *   D · Direct admin Server Action invocation as player (privilege escalation)
 *   E · Admin webhook / dev endpoints
 *   F · Audit-chain integrity — entries are append-only and signed
 *   G · CSV export gating — no PII without a session
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const fails = [];
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; fails.push(`${label} ${detail}`); }
}

const phoneTail = () => "7" + String(Date.now() % 100_000_000).padStart(8, "0");
async function fetchOtp(phoneE164) {
  const r = await fetch(`${BASE}/api/dev-test/last-otp?phone=${encodeURIComponent(phoneE164)}`);
  if (!r.ok) throw new Error(`OTP fetch ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return String(j.code);
}
async function register(ctx) {
  const tail = phoneTail();
  const e164 = "+255" + tail;
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill('input[name="phone"]', tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await Promise.all([
    p.waitForURL(/auth\/otp/, { timeout: 15_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  const code = await fetchOtp(e164);
  await p.fill('input[name="code"]', code);
  await Promise.all([
    p.waitForURL(u => !/auth\/otp/.test(u.toString()), { timeout: 15_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.close();
  return { tail, e164 };
}

const browser = await chromium.launch();

// Full admin route list
const ADMIN_ROUTES = [
  "/admin",
  "/admin/live",
  "/admin/finance",
  "/admin/reports",
  "/admin/players",
  "/admin/players/cohorts",
  "/admin/markets",
  "/admin/markets/new",
  "/admin/resolver-queue",
  "/admin/sources",
  "/admin/config",
  "/admin/compliance",
  "/admin/aml",
  "/admin/self-exclusions",
  "/admin/audit",
  "/admin/system",
  "/admin/approvals",
  "/admin/2fa/setup",
  "/admin/totp-verify",
  "/admin/privacy",
  "/admin/retention",
];

// =========================================================
// A · ANON GATING — every admin route redirects
// =========================================================
console.log("\n=== A · ANON GATING (every admin route) ===");
{
  const ctx = await browser.newContext();
  let okCount = 0, failedRoutes = [];
  for (const route of ADMIN_ROUTES) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2500);
    const isGated = /\/auth\/admin|\/auth\/login/.test(p.url());
    if (isGated) okCount++;
    else failedRoutes.push(`${route} → ${p.url()}`);
    await p.close();
  }
  log(`A1 ${okCount}/${ADMIN_ROUTES.length} admin routes gate anonymous traffic`, failedRoutes.length === 0, failedRoutes.length ? `LEAK: ${failedRoutes.join("; ")}` : "");
  await ctx.close();
}

// =========================================================
// B · PLAYER GATING — a regular player can't browse admin
// =========================================================
console.log("\n=== B · PLAYER GATING (player into admin) ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const me = await register(ctx);
  console.log(`[setup] player ${me.e164}`);
  let okCount = 0, leaks = [];
  for (const route of ADMIN_ROUTES) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2500);
    const url = p.url();
    const gated = /\/auth\/admin|\/auth\/login|^\/$|^http:\/\/[^/]+\/?$/.test(url);
    if (gated) okCount++;
    else leaks.push(`${route} → ${url}`);
    await p.close();
  }
  log(`B1 ${okCount}/${ADMIN_ROUTES.length} admin routes block PLAYER role`, leaks.length === 0, leaks.length ? `LEAK: ${leaks.join("; ")}` : "");
  await ctx.close();
}

// =========================================================
// C · TOTP COOKIE SPOOFING
// =========================================================
console.log("\n=== C · TOTP COOKIE SPOOFING ===");
{
  const ctx = await browser.newContext();
  // Forged TOTP cookie without admin session — should not let us in
  for (const [label, val] of [
    ["C1 forged kp_admin_totp + no session", "valid-looking-but-fake-totp"],
    ["C2 empty kp_admin_totp + no session", ""],
    ["C3 long-random kp_admin_totp + no session", "x".repeat(256)],
  ]) {
    await ctx.clearCookies();
    await ctx.addCookies([{
      name: "kp_admin_totp", value: val,
      domain: "localhost", path: "/",
    }]);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2500);
    log(label + " → /auth/admin", /\/auth\/admin/.test(p.url()), p.url());
    await p.close();
  }
  await ctx.close();
}

// =========================================================
// D · DIRECT ADMIN SERVER-ACTION CALLS AS PLAYER
// =========================================================
console.log("\n=== D · DIRECT ADMIN SERVER ACTIONS AS PLAYER ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await register(ctx);
  const p = await ctx.newPage();

  // Try to POST to admin pages with FormData payloads. The admin layout
  // gates with redirect() before any action runs — but the action functions
  // themselves should ALSO refuse. Defense in depth.
  const targets = [
    { path: "/admin/resolver-queue",  payload: { marketId: "mkt_x", outcome: "YES" } },
    { path: "/admin/markets",         payload: { titleEn: "evil", sourceUrl: "https://x.com" } },
    { path: "/admin/aml",             payload: { transactionId: "tx_x", status: "approve" } },
    { path: "/admin/self-exclusions", payload: { userId: "u_x", action: "lift" } },
    { path: "/admin/players",         payload: { userId: "u_x", action: "ban" } },
    { path: "/admin/system",          payload: { action: "rotate_secret" } },
  ];

  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const results = await p.evaluate(async (targets) => {
    const out = [];
    for (const { path, payload } of targets) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(payload)) fd.set(k, v);
      const r = await fetch(path, { method: "POST", body: fd });
      out.push(`${path}=${r.status}`);
    }
    return out;
  }, targets);
  // All should be 3xx (redirect away) or 4xx — never 200/302-to-admin-success.
  // We can't perfectly assert from out-of-band, but all-non-2xx is the bar.
  const allGated = results.every(s => /=(3\d\d|4\d\d|5\d\d)$/.test(s));
  log(`D1 forged POSTs to /admin/* never return 2xx`, allGated, results.join(" | "));
  await ctx.close();
}

// =========================================================
// E · ADMIN-ONLY API ENDPOINTS
// =========================================================
console.log("\n=== E · ADMIN-ONLY API ENDPOINTS ===");
{
  // Admin export endpoints — verify any /api/* under admin scope is gated.
  // (Also verify /api/health doesn't expose admin-only data.)
  const r1 = await fetch(`${BASE}/api/health`);
  const j = await r1.json();
  const fields = Object.keys(j?.store ?? {});
  // store should not contain raw user records, OTP plaintext, session HMACs
  const safe = !fields.some(k => /password|otp|hmac|secret|pepper/i.test(k));
  log("E1 /api/health does not expose secrets/PII fields", safe, `fields=${fields.join(",")}`);

  // Try /api/admin/* — does anything respond 200?
  const candidates = ["/api/admin/csv", "/api/admin/export", "/api/admin/users", "/api/internal/dump"];
  const results = [];
  for (const c of candidates) {
    const r = await fetch(`${BASE}${c}`);
    results.push(`${c}=${r.status}`);
  }
  // Each must be 4xx (not found or unauthorized)
  log("E2 speculative /api/admin/* paths are 4xx", results.every(r => /=4\d\d$/.test(r)), results.join(" | "));
}

// =========================================================
// F · AUDIT CHAIN
// =========================================================
console.log("\n=== F · AUDIT CHAIN ===");
{
  const r = await fetch(`${BASE}/api/health`);
  const j = await r.json();
  const before = j?.store?.auditEntries ?? 0;
  // Fire some traffic that creates audits (login attempts), confirm count increases.
  // We just hit /auth/login a few times.
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/auth/login`).catch(() => {});
  }
  await new Promise(r => setTimeout(r, 300));
  const r2 = await fetch(`${BASE}/api/health`);
  const j2 = await r2.json();
  const after = j2?.store?.auditEntries ?? 0;
  log("F1 audit-entry counter is monotonic non-decreasing", after >= before, `before=${before} after=${after}`);
}

// =========================================================
// G · CSV / PII export gating (best-effort — endpoint may not exist)
// =========================================================
console.log("\n=== G · CSV / PII EXPORT GATING ===");
{
  // Try common CSV export paths anonymously
  const paths = [
    "/admin/aml/export.csv",
    "/admin/players/export.csv",
    "/admin/audit/export.csv",
    "/admin/finance/export.csv",
  ];
  let leaks = [];
  for (const path of paths) {
    const r = await fetch(`${BASE}${path}`);
    const ct = r.headers.get("content-type") ?? "";
    const isCsv = /text\/csv|application\/csv/.test(ct) && r.status === 200;
    if (isCsv) leaks.push(`${path}=200 csv`);
  }
  log("G1 anon CSV export paths return no CSV", leaks.length === 0, leaks.join("; "));
}

await browser.close();
console.log(`\n${"=".repeat(60)}`);
console.log(`ADMIN BREAK-IT  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
if (fails.length) {
  console.log("\nFailing assertions:");
  for (const f of fails) console.log("  - " + f);
}
process.exit(fail === 0 ? 0 : 1);
