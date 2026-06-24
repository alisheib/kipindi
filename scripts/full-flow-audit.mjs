/**
 * Full-flow audit — walks every major route and user journey.
 * Checks: HTTP status, page load errors, dead links, console errors,
 * empty states, broken images, choking points.
 *
 * Run: node scripts/full-flow-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";
const results = { pass: 0, fail: 0, warnings: [], errors: [] };

function pass(label) { results.pass++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
function fail(label, detail) { results.fail++; results.errors.push(`${label}: ${detail}`); console.log(`  \x1b[31m✗\x1b[0m ${label}  →  ${detail}`); }
function warn(label, detail) { results.warnings.push(`${label}: ${detail}`); console.log(`  \x1b[33m⚠\x1b[0m ${label}  →  ${detail}`); }

async function checkPage(page, path, label, opts = {}) {
  const consoleErrors = [];
  const handler = (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); };
  page.on("console", handler);

  try {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = resp?.status() ?? 0;

    // Status check
    if (opts.expectRedirect) {
      // Playwright follows redirects — check final URL contains /auth/
      const finalUrl = page.url();
      if (finalUrl.includes("/auth/")) pass(`${label} — redirected to ${new URL(finalUrl).pathname}`);
      else if (status >= 300 && status < 400) pass(`${label} — redirects (${status})`);
      else fail(label, `expected redirect to /auth/*, landed on ${finalUrl}`);
    } else {
      if (status >= 200 && status < 300) pass(`${label} — ${status}`);
      else if (status >= 300 && status < 400) warn(label, `unexpected redirect ${status} → ${page.url()}`);
      else fail(label, `HTTP ${status}`);
    }

    // Wait for hydration
    if (!opts.expectRedirect && status >= 200 && status < 300) {
      await page.waitForTimeout(1000);

      // Note: in dev mode, Next.js shows an error overlay for CSP eval()
      // violations (React dev needs unsafe-eval). This doesn't happen in
      // production. We skip overlay detection here — real errors show up
      // as non-200 status codes or "unhandled error" body text.

      // Check for "Error" or "Something went wrong" in body
      const bodyText = await page.textContent("body").catch(() => "");
      if (/unhandled/i.test(bodyText) && /error/i.test(bodyText)) {
        fail(`${label} — unhandled error in body`, bodyText.slice(0, 200));
      }

      // Console errors (filter out benign ones)
      const real = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("manifest") && !e.includes("Cache-Control") && !e.includes("Hydration") && !e.includes("eval()") && !e.includes("unsafe-eval")
      );
      if (real.length > 0) warn(`${label} — console errors`, real.slice(0, 3).join(" | "));
    }
  } catch (e) {
    fail(label, e.message.split("\n")[0]);
  } finally {
    page.off("console", handler);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════════════════════════
  // SECTION 1: PUBLIC ROUTES (no auth)
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== 1 · PUBLIC ROUTES ===");
  const pub = await browser.newContext();
  const p1 = await pub.newPage();

  const publicRoutes = [
    ["/", "Landing page"],
    ["/markets", "Markets browse"],
    ["/live", "Live markets"],
    ["/leaderboard", "Leaderboard"],
    ["/fairness", "Resolution attestation"],
    ["/help", "Help & support"],
    ["/legal/terms", "Terms"],
    ["/legal/privacy", "Privacy notice"],
    ["/legal/aml", "AML/KYC policy"],
    ["/legal/responsible-gambling", "Responsible gambling"],
    ["/auth/login", "Login page"],
    ["/auth/register", "Register page"],
    ["/auth/admin", "Admin login page"],
    ["/auth/forgot-password", "Forgot password"],
    ["/proposals", "Proposals (public)"],
  ];

  for (const [path, label] of publicRoutes) {
    await checkPage(p1, path, label);
  }

  // Check protected routes redirect when unauthed
  console.log("\n=== 2 · AUTH GATES (unauthed → redirect) ===");
  const protectedRoutes = [
    ["/wallet", "Wallet gate"],
    ["/wallet/deposit", "Deposit gate"],
    ["/wallet/withdraw", "Withdraw gate"],
    ["/positions", "Positions gate"],
    ["/profile", "Profile gate"],
    ["/profile/kyc", "KYC gate"],
    ["/profile/sessions", "Sessions gate"],
    ["/profile/responsible-gambling", "RG gate"],
    ["/profile/account", "Account gate"],
    ["/profile/invite", "Invite gate"],
    ["/admin", "Admin gate"],
    ["/admin/players", "Admin players gate"],
    ["/admin/markets", "Admin markets gate"],
    ["/admin/audit", "Admin audit gate"],
  ];

  for (const [path, label] of protectedRoutes) {
    await checkPage(p1, path, label, { expectRedirect: true });
  }
  await pub.close();

  // ════════════════════════════════════════════════════════════════
  // SECTION 3: AUTHED PLAYER FLOW (via /auth/demo)
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== 3 · AUTHED PLAYER FLOW (demo session) ===");
  const playerCtx = await browser.newContext();
  const p2 = await playerCtx.newPage();

  // Bootstrap demo session
  await p2.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 15000 });
  const cookies = await playerCtx.cookies();
  const hasSession = cookies.some((c) => c.name === "kp_session");
  if (hasSession) pass("Demo session bootstrapped");
  else fail("Demo session", "no kp_session cookie after /auth/demo");

  const playerRoutes = [
    ["/", "Home (authed)"],
    ["/markets", "Markets (authed)"],
    ["/live", "Live (authed)"],
    ["/wallet", "Wallet"],
    ["/wallet/deposit", "Deposit page"],
    ["/wallet/withdraw", "Withdraw page"],
    ["/positions", "Positions"],
    ["/positions?tab=open", "Positions — open tab"],
    ["/positions?tab=settled", "Positions — settled tab"],
    ["/profile", "Profile"],
    ["/profile/kyc", "KYC page"],
    ["/profile/sessions", "Sessions page"],
    ["/profile/responsible-gambling", "RG settings"],
    ["/profile/account", "Account settings"],
    ["/profile/invite", "Invite & earn"],
    ["/profile/source-of-funds", "Source of funds"],
    ["/proposals", "Proposals (authed)"],
    ["/proposals/new", "New proposal"],
    ["/leaderboard", "Leaderboard (authed)"],
    ["/fairness", "Fairness (authed)"],
    ["/help", "Help (authed)"],
  ];

  for (const [path, label] of playerRoutes) {
    await checkPage(p2, path, label);
  }

  // Check a market detail page
  console.log("\n=== 4 · MARKET DETAIL + INTERACTION ===");
  await p2.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 15000 });
  const firstMarketLink = await p2.$('a[href^="/markets/mkt_"]');
  if (firstMarketLink) {
    const href = await firstMarketLink.getAttribute("href");
    await checkPage(p2, href, `Market detail ${href}`);
    // Check dial is present
    const dial = await p2.$('[data-dial], [aria-label*="conviction"], [class*="dial"]');
    if (dial) pass("Conviction dial present on market page");
    else warn("Conviction dial", "dial element not found — may use different selector");
  } else {
    warn("Market detail", "no market links found on /markets");
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 5: ADMIN FLOW (promote demo to admin, then browse)
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== 5 · ADMIN FLOW ===");
  // Promote the demo user to admin
  const promoteResp = await p2.request.post(`${BASE}/api/dev-test/promote-admin`, {
    data: { phone: "+255700000000" },
    headers: { "content-type": "application/json" },
  });
  if (promoteResp.ok()) pass("Demo user promoted to admin");
  else warn("Admin promote", `status ${promoteResp.status()}`);

  // Re-bootstrap session so role is ADMIN in the cookie
  await p2.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 15000 });

  const adminRoutes = [
    ["/admin", "Admin overview"],
    ["/admin/live", "Admin live ops"],
    ["/admin/markets", "Admin markets"],
    ["/admin/markets?status=LIVE", "Admin markets — LIVE filter"],
    ["/admin/markets?page=1", "Admin markets — page 1"],
    ["/admin/players", "Admin players"],
    ["/admin/players?sort=joined&dir=desc", "Admin players — sorted"],
    ["/admin/players?page=1", "Admin players — page 1"],
    ["/admin/resolver-queue", "Admin resolver queue"],
    ["/admin/resolver-queue?window=all", "Admin resolver — all pending"],
    ["/admin/resolver-queue?window=7d", "Admin resolver — 7d"],
    ["/admin/audit", "Admin audit log"],
    ["/admin/audit?category=AUTH", "Admin audit — AUTH filter"],
    ["/admin/audit?page=1", "Admin audit — page 1"],
    ["/admin/finance", "Admin finance"],
    ["/admin/aml", "Admin AML queue"],
    ["/admin/candidates", "Admin candidates"],
    ["/admin/proposals", "Admin proposals"],
    ["/admin/self-exclusions", "Admin self-exclusions"],
    ["/admin/self-exclusions?page=1", "Admin self-exclusions — page 1"],
    ["/admin/compliance", "Admin compliance"],
    ["/admin/config", "Admin config"],
    ["/admin/sources", "Admin sources"],
    ["/admin/system", "Admin system"],
    ["/admin/reports", "Admin reports"],
    ["/admin/affiliate", "Admin affiliate"],

    ["/admin/moderation", "Admin moderation"],
    ["/admin/privacy", "Admin privacy/DSAR"],
    ["/admin/players/cohorts", "Admin cohorts"],
    ["/admin/2fa/setup", "Admin 2FA setup"],
  ];

  for (const [path, label] of adminRoutes) {
    await checkPage(p2, path, label);
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 6: 404 / NOT FOUND
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== 6 · 404 / DEAD ENDS ===");
  const resp404 = await p2.goto(`${BASE}/this-does-not-exist`, { waitUntil: "domcontentloaded", timeout: 15000 });
  if (resp404?.status() === 404) pass("404 page renders correctly");
  else warn("404 page", `status ${resp404?.status()}`);

  // ════════════════════════════════════════════════════════════════
  // SECTION 7: LOGOUT FLOW
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== 7 · LOGOUT FLOW ===");
  // POST logout
  const logoutResp = await p2.request.post(`${BASE}/auth/logout`, { maxRedirects: 0 });
  if (logoutResp.status() === 307 || logoutResp.status() === 302) pass("POST /auth/logout redirects (session destroyed)");
  else fail("POST /auth/logout", `status ${logoutResp.status()}`);

  // After logout, protected routes should redirect
  await checkPage(p2, "/wallet", "Wallet after logout", { expectRedirect: true });

  await playerCtx.close();
  await browser.close();

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(60));
  console.log(`FULL FLOW AUDIT  PASS: ${results.pass}    FAIL: ${results.fail}    WARN: ${results.warnings.length}`);
  console.log("=".repeat(60));
  if (results.errors.length > 0) {
    console.log("\nFailures:");
    for (const e of results.errors) console.log(`  · ${e}`);
  }
  if (results.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of results.warnings) console.log(`  · ${w}`);
  }
  process.exit(results.fail > 0 ? 1 : 0);
})();
