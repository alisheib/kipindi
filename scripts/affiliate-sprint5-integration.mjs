/**
 * Sprint 5 · INTEGRATION & REGRESSION.
 *   A. Real registration with ?ref= binds the recruit (UI form → auth-service → engine)
 *   B. Real deposit() + buyPosition() fire the affiliate hooks (money-flow wiring)
 *   C. Snapshot persistence: the new store collections are in the backup envelope
 *  (regression suites are run separately by the harness)
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };

async function registerViaUI(browser, { ref } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (let attempt = 0; attempt < 3; attempt++) {
    await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST", headers: { connection: "close" } }).catch(() => {});
    const p = await ctx.newPage();
    const phone = "65" + String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
    await p.goto(`${BASE}/auth/register${ref ? `?ref=${ref}` : ""}`, { waitUntil: "networkidle" });
    await p.fill("#phone", phone);
    await p.fill('input[name="dob"]', "1995-06-15");
    await p.fill('input[name="password"]', "Tanzania#2026x");
    await p.fill('input[name="passwordConfirm"]', "Tanzania#2026x");
    await p.check('input[name="acceptAge"]', { force: true });
    await p.check('input[name="acceptTerms"]', { force: true });
    await Promise.all([p.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 12000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
    const landed = !p.url().includes("/auth/register");
    await p.close();
    if (landed) return { ctx, ok: true };
  }
  return { ctx, ok: false };
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ reset: true }) });

  // ── A · REAL REGISTRATION → BIND (full UI → auth-service → engine) ────
  console.log("\n=== A · REAL REGISTER → BIND ===");
  {
    const R = await registerViaUI(browser);
    log("A.referrer registered via form", R.ok);
    if (R.ok) {
      const pr = await R.ctx.newPage();
      await pr.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
      const code = (await pr.locator('input[aria-label="Referral link"]').inputValue().catch(() => "")).match(/ref=([A-Z0-9]+)/)?.[1];
      log("A.referrer got a code", !!code, code);
      const before = (await pr.locator("body").textContent()) ?? "";
      log("A.referrer starts with empty recruits", /No referrals yet/.test(before));

      const C = await registerViaUI(browser, { ref: code });
      log("A.recruit registered via ?ref= link", C.ok);

      await pr.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
      await pr.waitForTimeout(150);
      const after = (await pr.locator("body").textContent()) ?? "";
      log("A.referrer now shows a bound recruit (real register→bind)", !/No referrals yet/.test(after) && /\*\*\*/.test(after));
      await pr.close();
      await C.ctx?.close();
    }
    await R.ctx?.close();
  }

  // ── B · REAL DEPOSIT + BET WIRING ────────────────────────────────────
  console.log("\n=== B · REAL MONEY-FLOW WIRING (deposit + bet) ===");
  {
    const res = await fetch(`${BASE}/api/dev-test/affiliate-integration`, { method: "POST", headers: { connection: "close" } });
    const b = await res.json();
    if (!Array.isArray(b.checks)) log("B.integration endpoint ran", false, JSON.stringify(b).slice(0, 200));
    else for (const c of b.checks) log("B." + c.name, c.pass, c.detail);
  }

  // ── C · SNAPSHOT PERSISTENCE (new collections survive restart) ───────
  console.log("\n=== C · SNAPSHOT PERSISTENCE ===");
  {
    // Force a few mutations + wait past the 1.5s debounce so the snapshot is fresh.
    await fetch(`${BASE}/api/dev-test/affiliate-seed-recruits`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ code: "DEMOEDN", n: 1 }) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    const snapPath = join(process.cwd(), ".50pick-backups", "store.snapshot.json");
    if (!existsSync(snapPath)) {
      log("C.snapshot file exists", false, snapPath);
    } else {
      log("C.snapshot file exists", true);
      const env = JSON.parse(readFileSync(snapPath, "utf8"));
      const payload = JSON.parse(env.payload);
      const aff = payload.affiliates;
      const rew = payload.referralRewards;
      log("C.snapshot includes 'affiliates' map", !!aff && aff.__map === true && Array.isArray(aff.entries));
      log("C.snapshot includes 'referralRewards' map", !!rew && rew.__map === true && Array.isArray(rew.entries));
      log("C.affiliates persisted with entries", (aff?.entries?.length ?? 0) > 0, `entries=${aff?.entries?.length ?? 0}`);
      log("C.referralRewards persisted with entries", (rew?.entries?.length ?? 0) > 0, `entries=${rew?.entries?.length ?? 0}`);
      // A user row carries the recruitedBy field (schema-aligned persistence)
      const users = payload.users?.entries ?? [];
      const anyRecruited = users.some((e) => e[1]?.recruitedBy);
      log("C.users persist recruitedBy linkage", anyRecruited);
    }
  }

  await fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ reset: true }) });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 5 · INTEGRATION   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
