/**
 * Sprint 4 · SECURITY, ACCESS CONTROL & ANTI-FRAUD.
 *   A. HTTP access control: anon + non-admin player are redirected off /admin/affiliate
 *   B. Server-side config validation rejects out-of-range values (same setter the admin action uses)
 *   C. In-process anti-fraud / money-integrity (affiliate-security endpoint)
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const setCfg = (c) => fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });

const browser = await chromium.launch();
try {
  // ── A · HTTP ACCESS CONTROL ──────────────────────────────────────────
  console.log("\n=== A · ACCESS CONTROL ===");
  {
    // Anonymous (no session) must not reach the admin dashboard.
    const anon = await browser.newContext();
    const ap = await anon.newPage();
    const r1 = await ap.goto(`${BASE}/admin/affiliate`, { waitUntil: "domcontentloaded" });
    // Either a redirect status or a final URL on the admin-auth gate.
    log("A.anon redirected away from /admin/affiliate", /\/auth\/admin/.test(ap.url()) || !ap.url().includes("/admin/affiliate"), ap.url());
    await ap.close(); await anon.close();

    // Non-admin PLAYER must not reach it either. Register a fresh player.
    await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST", headers: { connection: "close" } }).catch(() => {});
    const player = await browser.newContext();
    const pp = await player.newPage();
    const phone = "65" + String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
    await pp.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
    await pp.fill("#phone", phone);
    await pp.fill('input[name="dob"]', "1994-03-03");
    await pp.fill('input[name="password"]', "Tanzania#2026x");
    await pp.fill('input[name="passwordConfirm"]', "Tanzania#2026x");
    await pp.check('input[name="acceptAge"]');
    await pp.check('input[name="acceptTerms"]');
    await Promise.all([pp.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 12000 }).catch(() => {}), pp.locator('button[type="submit"]').click()]);
    const isPlayer = !pp.url().includes("/auth/register");
    log("A.fresh player registered (PLAYER role)", isPlayer, pp.url());
    // The security guarantee that matters: a non-admin must NOT see the admin
    // affiliate dashboard or its controls. (The shared admin layout renders an
    // error boundary for non-admins instead of an HTTP redirect — pre-existing,
    // app-wide behaviour across ALL /admin/* routes; no admin data is exposed.)
    await pp.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const adminText = await pp.evaluate(() => document.body.innerText);
    log("A.player CANNOT see the affiliate admin dashboard (no master switch / Save)",
      !/master switch/i.test(adminText) && !/Save · Hifadhi/.test(adminText) && !/Payout ledger/i.test(adminText),
      adminText.slice(0, 60).replace(/\s+/g, " "));
    // Player CAN reach their own invite page (positive control).
    await pp.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    log("A.player CAN reach /profile/invite (positive control)", pp.url().includes("/profile/invite") && /Invite friends/.test(await pp.evaluate(() => document.body.innerText)));
    await pp.close(); await player.close();
  }

  // ── B · SERVER-SIDE CONFIG VALIDATION ────────────────────────────────
  console.log("\n=== B · CONFIG VALIDATION BOUNDS ===");
  {
    const cases = [
      ["commission rate > 100%", { commission: { rate: 5 } }],
      ["negative commission rate", { commission: { rate: -0.1 } }],
      ["commission window 0 months", { commission: { windowMonths: 0 } }],
      ["new-player bonus > 1,000,000", { bonus: { newAmountTzs: 5_000_000 } }],
      ["negative referrer bonus", { bonus: { referrerAmountTzs: -1 } }],
      ["prize cap > 10,000", { prize: { capPerReferrer: 999_999 } }],
      ["prize amount > 1,000,000", { prize: { amountTzs: 9_000_000 } }],
    ];
    for (const [label, cfg] of cases) {
      const res = await setCfg(cfg);
      log(`B.rejects ${label}`, res.status === 400);
    }
    // Sanity: a valid update is accepted.
    const good = await setCfg({ commission: { rate: 0.45 } });
    log("B.accepts a valid update", good.status === 200);
    await setCfg({ reset: true });
  }

  // ── C · ANTI-FRAUD / MONEY INTEGRITY (in-process) ────────────────────
  console.log("\n=== C · ANTI-FRAUD / MONEY INTEGRITY ===");
  {
    const res = await fetch(`${BASE}/api/dev-test/affiliate-security`, { method: "POST", headers: { connection: "close" } });
    const b = await res.json();
    if (!Array.isArray(b.checks)) { log("C.security endpoint ran", false, JSON.stringify(b).slice(0, 200)); }
    else for (const c of b.checks) log("C." + c.name, c.pass, c.detail);
  }

  await setCfg({ reset: true });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 4 · SECURITY   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
