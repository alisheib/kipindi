/**
 * Feature 2 · Sprint 4 · SECURITY, ACCESS CONTROL & ANTI-FRAUD.
 *   A. HTTP access control: anon + non-admin player can't see /admin/proposals
 *   B. Server-side config validation rejects out-of-range values
 *   C. In-process anti-abuse (proposals-security endpoint)
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const setCfg = (c) => fetch(`${BASE}/api/dev-test/proposals-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });

const browser = await chromium.launch();
try {
  // ── A · ACCESS CONTROL ───────────────────────────────────────────────
  console.log("\n=== A · ACCESS CONTROL ===");
  {
    const anon = await browser.newContext();
    const ap = await anon.newPage();
    await ap.goto(`${BASE}/admin/proposals`, { waitUntil: "domcontentloaded" });
    log("A.anon redirected away from /admin/proposals", !ap.url().includes("/admin/proposals"), ap.url());
    await ap.close(); await anon.close();

    // Fresh non-admin player.
    await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST", headers: { connection: "close" } }).catch(() => {});
    const player = await browser.newContext();
    const pp = await player.newPage();
    const phone = "65" + String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
    await pp.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
    await pp.fill("#phone", phone);
    await pp.fill('input[name="dob"]', "1994-02-02");
    await pp.fill('input[name="password"]', "Tanzania#2026x");
    await pp.fill('input[name="passwordConfirm"]', "Tanzania#2026x");
    await pp.check('input[name="acceptAge"]'); await pp.check('input[name="acceptTerms"]');
    await Promise.all([pp.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 12000 }).catch(() => {}), pp.locator('button[type="submit"]').click()]);
    log("A.fresh player registered", !pp.url().includes("/auth/register"));
    await pp.goto(`${BASE}/admin/proposals`, { waitUntil: "networkidle" });
    const adminText = await pp.evaluate(() => document.body.innerText);
    log("A.player CANNOT see admin proposals console (no master switch / Approve)", !/master switch/i.test(adminText) && !/Approve & list/i.test(adminText) && !/Queue · sorted/i.test(adminText), adminText.slice(0, 50).replace(/\s+/g, " "));
    // Positive controls — player can use the player surface.
    await pp.goto(`${BASE}/proposals`, { waitUntil: "networkidle" });
    log("A.player CAN reach /proposals", /Market Proposals/i.test(await pp.evaluate(() => document.body.innerText)));
    await pp.goto(`${BASE}/proposals/new`, { waitUntil: "networkidle" });
    log("A.player CAN reach /proposals/new", /good proposal/i.test(await pp.evaluate(() => document.body.innerText)));
    await pp.close(); await player.close();
  }

  // ── B · CONFIG VALIDATION ────────────────────────────────────────────
  console.log("\n=== B · CONFIG VALIDATION ===");
  {
    const cases = [
      ["negative prize", { prizeTzs: -1 }],
      ["prize over ceiling", { prizeTzs: 9_000_000 }],
      ["hot threshold 0", { hotThreshold: 0 }],
      ["rate limit 0", { rateLimit: 0 }],
      ["rate limit over ceiling", { rateLimit: 9999 }],
    ];
    for (const [label, cfg] of cases) log(`B.rejects ${label}`, (await setCfg(cfg)).status === 400);
    log("B.accepts a valid update", (await setCfg({ prizeTzs: 15_000 })).status === 200);
    await setCfg({ reset: true });
  }

  // ── C · ANTI-FRAUD / INTEGRITY (in-process) ──────────────────────────
  console.log("\n=== C · ANTI-FRAUD / INTEGRITY ===");
  {
    const res = await fetch(`${BASE}/api/dev-test/proposals-security`, { method: "POST", headers: { connection: "close" } });
    const b = await res.json();
    if (!Array.isArray(b.checks)) log("C.security endpoint ran", false, JSON.stringify(b).slice(0, 200));
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
