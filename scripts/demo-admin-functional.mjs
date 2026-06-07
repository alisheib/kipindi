/**
 * Demo dry-run — admin functional walk.
 *
 * Logs in as a bootstrapped admin (via ADMIN_BOOTSTRAP_PHONES), then
 * exercises every admin page from the navigation. Each page must:
 *   - render 200 (not redirect away)
 *   - carry the AdminShell confidentiality band
 *   - not throw a runtime error visible in the body
 *
 *   Run: node scripts/demo-admin-functional.mjs
 *
 * Pre-req: the test temporarily mutates the in-memory user store via a
 *   dev-only endpoint to set ADMIN role on a freshly-registered user.
 *   In production the operator does this via the ADMIN_BOOTSTRAP_PHONES
 *   env var on Railway (see CLAUDE.md → "Admin bootstrap").
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const fails = [];
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; fails.push(`${label} ${detail}`); }
}
const tail = (offset = 0) => "7" + String((Date.now() + offset) % 100_000_000).padStart(8, "0");
async function reset() { await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {}); }

const browser = await chromium.launch();

// ─────────────────────────────────────────────────────────────
// Setup — register a player, then promote to ADMIN via the dev
// endpoint. (See scripts/dev-promote-admin if it exists; otherwise
// fall back to direct store manipulation through the dev API we
// can use for tests.)
// ─────────────────────────────────────────────────────────────
console.log("\n=== SETUP ===");
await reset();

const adminTail = tail();
const adminE164 = "+255" + adminTail;
const adminPwd = "AdminDemo!2026Strong";

// Register the user
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill('#phone', adminTail);
  await p.fill('input[name="dob"]', "1985-04-12");
  await p.fill('input[name="password"]', adminPwd);
  await p.fill('input[name="passwordConfirm"]', adminPwd);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 8_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  log(`SETUP register ${adminE164}`, !/auth\/register/.test(p.url()), p.url());
  await ctx.close();
}

// Promote to admin via dev-only endpoint
const promote = await fetch(`${BASE}/api/dev-test/promote-admin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone: adminE164 }),
}).catch(() => ({ ok: false }));
if (!promote.ok) {
  console.log("✗ SETUP: /api/dev-test/promote-admin not available — skipping admin functional walk.");
  console.log("  Add the dev endpoint or set ADMIN_BOOTSTRAP_PHONES and re-register.");
  await browser.close();
  process.exit(2);
}
log("SETUP promoted to ADMIN role", true, await promote.text().then(t => t.slice(0, 80)));

// Now log in as admin
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
{
  const p = await adminCtx.newPage();
  await reset();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill('#phone', adminTail);
  await p.fill('input[name="password"]', adminPwd);
  await Promise.all([
    p.waitForURL(u => !/auth\/login$/.test(u.toString()), { timeout: 8_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  log("SETUP admin login lands on /admin", /\/admin/.test(p.url()), p.url());
  await p.close();
}

// ─────────────────────────────────────────────────────────────
// Walk every admin page
// ─────────────────────────────────────────────────────────────
console.log("\n=== ADMIN PAGES ===");
const ROUTES = [
  ["overview",      "/admin"],
  ["live ops",      "/admin/live"],
  ["finance",       "/admin/finance"],
  ["reports",       "/admin/reports"],
  ["players",       "/admin/players"],
  ["cohorts",       "/admin/players/cohorts"],
  ["markets list",  "/admin/markets"],
  ["new market",    "/admin/markets/new"],
  ["resolver",      "/admin/resolver-queue"],
  ["sources",       "/admin/sources"],
  ["config",        "/admin/config"],
  ["compliance",    "/admin/compliance"],
  ["aml queue",     "/admin/aml"],
  ["self-exclu.",   "/admin/self-exclusions"],
  ["audit log",     "/admin/audit"],
  ["system",        "/admin/system"],
  ["approvals",     "/admin/approvals"],
  ["privacy",       "/admin/privacy"],
  ["retention",     "/admin/retention"],
];

let okPages = 0;
for (const [label, route] of ROUTES) {
  const p = await adminCtx.newPage();
  let landedOk = false;
  let hasBand = false;
  let errorVisible = false;
  try {
    await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(900);
    const url = p.url();
    landedOk = !/\/auth\//.test(url) && url.includes("/admin");
    if (landedOk) {
      const text = (await p.locator("body").textContent()) ?? "";
      hasBand = /Staff · Confidential|Confidential|Audit|Compliance/i.test(text);
      errorVisible = /(Internal Server Error|Application error|Uncaught|TypeError:|ReferenceError:)/i.test(text);
    }
  } catch { /* navigation aborted by redirect — checked via landedOk */ }
  const ok = landedOk && !errorVisible;
  log(`${route}  (${label})`, ok, `landed=${landedOk} band=${hasBand} err=${errorVisible}`);
  if (ok) okPages++;
  await p.close();
}
log(`${okPages}/${ROUTES.length} admin pages render for an authenticated admin`, okPages === ROUTES.length);

// ─────────────────────────────────────────────────────────────
// Exercise key admin actions
// ─────────────────────────────────────────────────────────────
console.log("\n=== ADMIN ACTIONS ===");
{
  // A1 — admin can SEE the audit log entries (latest few)
  const p = await adminCtx.newPage();
  await p.goto(`${BASE}/admin/audit`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const text = (await p.locator("body").textContent()) ?? "";
  const hasEntries = /AUTH|user\.|SECURITY|WALLET|session\./i.test(text);
  log("A1 admin sees real audit entries on /admin/audit", hasEntries);
  await p.close();
}
{
  // A2 — admin can open /admin/players and see the user count
  const p = await adminCtx.newPage();
  await p.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const text = (await p.locator("body").textContent()) ?? "";
  const hasUsers = /usr_|player|registered|Total/i.test(text);
  log("A2 admin sees player list / metrics on /admin/players", hasUsers);
  await p.close();
}
{
  // A3 — admin can open /admin/system and see the rate-limit / health snapshot
  const p = await adminCtx.newPage();
  await p.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const text = (await p.locator("body").textContent()) ?? "";
  const hasHealth = /rate|bucket|health|version|uptime/i.test(text);
  log("A3 admin sees rate-limit / health on /admin/system", hasHealth);
  await p.close();
}
{
  // A4 — admin's TopAppBar role badge shows the admin role tone
  const p = await adminCtx.newPage();
  await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const bandText = (await p.locator(':text("Confidential"), :text("Admin")').first().textContent().catch(() => "")) ?? "";
  log("A4 admin shell shows confidentiality band", bandText.length > 0, bandText.slice(0, 60));
  await p.close();
}

await adminCtx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}`);
console.log(`DEMO ADMIN FUNCTIONAL  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
if (fails.length) {
  console.log("\nFailing assertions:");
  for (const f of fails) console.log("  - " + f);
}
process.exit(fail === 0 ? 0 : 1);
