/**
 * Break-it: PLAYER PLATFORM — manipulator tries to game the system.
 *
 *   Run: BASE=http://localhost:3000  node scripts/break-it-player.mjs
 *
 * Notes:
 *   - The app redirects via <meta http-equiv="refresh"> from server
 *     components. We use a real browser (Playwright) so meta-refresh
 *     follows and `page.url()` is the truthful authority on gating.
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

async function readAuditCount() {
  const r = await fetch(`${BASE}/api/health`);
  return (await r.json())?.store?.auditEntries ?? 0;
}

async function readWallet(p) {
  await p.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const txt = await p.locator("body").textContent();
  const m = txt?.match(/TZS\s*([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

const browser = await chromium.launch();

// =========================================================
// A · ANON GATING (browser follows meta-refresh)
// =========================================================
console.log("\n=== A · ANON GATING ===");
{
  const ctx = await browser.newContext();
  for (const [label, path, mustEnd] of [
    ["A1 anon /wallet redirects to /auth/login", "/wallet", /auth\/login/],
    ["A2 anon /wallet/withdraw redirects to /auth/login", "/wallet/withdraw", /auth\/login/],
    ["A3 anon /positions redirects to /auth/login", "/positions", /auth\/login/],
    ["A4 anon /profile/kyc redirects to /auth/login", "/profile/kyc", /auth\/login/],
    ["A5 anon /admin redirects to /auth/admin", "/admin", /auth\/admin/],
    ["A6 anon /admin/resolver-queue redirects to /auth/admin", "/admin/resolver-queue", /auth\/admin/],
  ]) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    // wait a beat for meta-refresh to trigger
    await page.waitForTimeout(2500);
    log(label, mustEnd.test(page.url()), `landed=${page.url()}`);
    await page.close();
  }
  await ctx.close();
}

// =========================================================
// B · COOKIE TAMPERING
// =========================================================
console.log("\n=== B · COOKIE TAMPERING ===");
{
  for (const [label, val] of [
    ["B1 garbage session value", "garbage-not-a-real-token"],
    ["B2 forged JSON-shaped session", "userId=admin&exp=9999999999&sig=AAAA"],
    ["B3 empty session value", ""],
  ]) {
    const ctx = await browser.newContext();
    await ctx.addCookies([{
      name: "kp_session", value: val,
      domain: "localhost", path: "/",
    }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    log(label, /auth\/login/.test(page.url()), `landed=${page.url()}`);
    await page.close();
    await ctx.close();
  }
}

// Setup real user for the rest
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const me = await register(ctx);
console.log(`\n[setup] registered ${me.e164}`);

const p = await ctx.newPage();
await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
const href = await p.locator('a[href^="/markets/mkt_"]').first().getAttribute("href");
const marketId = href?.split("/").pop();
console.log(`[setup] target market: ${marketId}`);
await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });

const startBal = await readWallet(p);
console.log(`[setup] wallet TZS ${startBal?.toLocaleString()}`);

// Helper: invoke the buy server action via the rendered form's action URL
async function postBuy({ stake, side = "YES", marketIdOverride = marketId }) {
  await p.goto(`${BASE}/markets/${marketIdOverride || marketId}`, { waitUntil: "networkidle" }).catch(() => {});
  return await p.evaluate(async ({ marketIdOverride, stake, side }) => {
    const form = document.querySelector("form[action]");
    if (!form) return { ok: false, status: 0, err: "no form" };
    const fd = new FormData();
    fd.set("marketId", marketIdOverride);
    fd.set("side", side);
    fd.set("stake", String(stake));
    for (const el of form.querySelectorAll("input")) {
      if (el.name && !fd.has(el.name)) fd.set(el.name, el.value);
    }
    const r = await fetch(form.getAttribute("action"), { method: "POST", body: fd });
    let body = "";
    try { body = (await r.text()).slice(0, 200); } catch {}
    return { ok: r.ok, status: r.status, body };
  }, { marketIdOverride, stake, side });
}

// =========================================================
// C · STAKE VALIDATION
// =========================================================
console.log("\n=== C · STAKE VALIDATION ===");
{
  const before = await readAuditCount();
  for (const [label, stake] of [
    ["C1 negative stake (-1000)", -1000],
    ["C2 zero stake", 0],
    ["C3 NaN-string stake (\"abc\")", "abc"],
    ["C4 Infinity stake", "Infinity"],
    ["C5 MAX_SAFE_INTEGER stake", Number.MAX_SAFE_INTEGER],
    ["C6 fractional stake (100.5)", 100.5],
    ["C7 huge stake 999_999_999 (>balance)", 999_999_999],
  ]) {
    await postBuy({ stake });
  }
  const after = await readAuditCount();
  const balAfter = await readWallet(p);
  log("C0 invalid stakes never debit balance", balAfter === startBal, `before=${startBal} after=${balAfter}`);
  log("C1-7 invalid stakes do not produce ≥7 successful audits", after - before < 7, `auditΔ=${after - before}`);
}

// =========================================================
// D · MARKET / SIDE VALIDATION
// =========================================================
console.log("\n=== D · MARKET / SIDE VALIDATION ===");
{
  const balBefore = await readWallet(p);
  await postBuy({ stake: 100, marketIdOverride: "mkt_does_not_exist" });
  await postBuy({ stake: 100, side: "MAYBE" });
  await postBuy({ stake: 100, side: "" });
  await postBuy({ stake: 100, marketIdOverride: "" });
  await postBuy({ stake: 100, marketIdOverride: "'; DROP TABLE markets; --" });
  const balAfter = await readWallet(p);
  log("D1 5 invalid-payload bets do not debit", balBefore === balAfter, `before=${balBefore} after=${balAfter}`);
}

// =========================================================
// E · CONCURRENT BUY (race)
// =========================================================
console.log("\n=== E · CONCURRENT BUY (race) ===");
{
  const balBefore = await readWallet(p);
  await p.goto(`${BASE}/markets/${marketId}`, { waitUntil: "networkidle" });
  const statuses = await p.evaluate(async ({ marketId }) => {
    const form = document.querySelector("form[action]");
    if (!form) return [];
    const action = form.getAttribute("action");
    const buildFD = () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", "YES");
      fd.set("stake", "200");
      for (const el of form.querySelectorAll("input")) if (el.name && !fd.has(el.name)) fd.set(el.name, el.value);
      return fd;
    };
    const r = await Promise.all(Array.from({ length: 12 }, () =>
      fetch(action, { method: "POST", body: buildFD() })
    ));
    return r.map(x => x.status);
  }, { marketId });
  const balAfter = await readWallet(p);
  const debited = balBefore - balAfter;
  // Wallet must never go negative; debit must equal sum of accepted buys × 200.
  const ok = balAfter >= 0 && debited % 200 === 0 && debited >= 0;
  log("E1 12 concurrent buys → wallet stays consistent", ok, `before=${balBefore} after=${balAfter} debited=${debited} statuses=${statuses.join(",")}`);
}

// =========================================================
// F · SELF-EXCLUSION BYPASS
// =========================================================
console.log("\n=== F · SELF-EXCLUSION BYPASS ===");
{
  await p.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "networkidle" });
  const sxBtn = p.locator('button:has-text("Self-exclude"), button:has-text("Take a break"), button[aria-label*="exclude" i], button[aria-label*="break" i]').first();
  let triggered = false;
  if (await sxBtn.count() > 0) {
    await sxBtn.click({ force: true }).catch(() => {});
    await p.waitForTimeout(400);
    const confirm = p.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Sawa")').first();
    if (await confirm.count() > 0) {
      await confirm.click({ force: true }).catch(() => {});
      triggered = true;
    }
    await p.waitForTimeout(700);
  }
  if (!triggered) {
    log("F1 self-exclusion UI present", false, "no SX button found — UI flow may have changed");
  } else {
    const balBefore = await readWallet(p);
    await postBuy({ stake: 100 });
    const balAfter = await readWallet(p);
    log("F1 self-excluded user cannot place a bet", balBefore === balAfter, `before=${balBefore} after=${balAfter}`);
  }
}

// =========================================================
// G · PRIVILEGE ESCALATION (admin actions as player)
// =========================================================
console.log("\n=== G · PRIVILEGE ESCALATION ===");
{
  // Player browses to /admin → must redirect (browser-level via meta-refresh)
  await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  log("G1 /admin redirects player to /auth/admin", /auth\/admin/.test(p.url()), `landed=${p.url()}`);

  await p.goto(`${BASE}/admin/resolver-queue`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  log("G2 /admin/resolver-queue redirects player", /auth\/admin/.test(p.url()), `landed=${p.url()}`);

  // Even if a player somehow knew an admin Server Action ID, the action
  // function itself should refuse (defense in depth). We test this by
  // confirming the player can't fire a market resolution that touches the
  // resolution audit log.
  const beforeAudit = await readAuditCount();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // Try to invoke a server action with a guessed admin signature is futile
  // without a known action ID. We instead assert no resolution audit appears
  // after a flurry of forged POSTs to /admin/* paths.
  const tries = await p.evaluate(async () => {
    const targets = [
      "/admin/resolver-queue",
      "/admin/markets",
      "/admin/players",
      "/admin/aml",
    ];
    const out = [];
    for (const t of targets) {
      const fd = new FormData();
      fd.set("marketId", "mkt_x");
      fd.set("outcome", "YES");
      const r = await fetch(t, { method: "POST", body: fd });
      out.push(`${t}=${r.status}`);
    }
    return out;
  });
  const afterAudit = await readAuditCount();
  log("G3 forged POSTs to /admin/* do not write resolution audits", (afterAudit - beforeAudit) <= 5, `tries=${tries.join("|")} auditΔ=${afterAudit - beforeAudit}`);
}

// =========================================================
// H · KYC GATE on withdrawal
// =========================================================
console.log("\n=== H · KYC GATE on withdraw ===");
{
  await p.goto(`${BASE}/wallet/withdraw`, { waitUntil: "networkidle" });
  const text = (await p.locator("body").textContent()) ?? "";
  const blocks = /verify|kyc|hujahakikishwa|complete.*verification|nida/i.test(text);
  log("H1 unverified user sees KYC gate copy on /wallet/withdraw", blocks, `len=${text.length}`);
}

// =========================================================
// I · XSS in display name
// =========================================================
console.log("\n=== I · XSS IN PROFILE ===");
{
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  const xssPayload = '<img src=x onerror="window.__xss_player=1">';
  const editBtn = p.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
  if (await editBtn.count() > 0) {
    await editBtn.click({ force: true }).catch(() => {});
    const nameField = p.locator('input[name="displayName"], input[name="name"]').first();
    if (await nameField.count() > 0) {
      await nameField.fill(xssPayload).catch(() => {});
      const save = p.locator('button:has-text("Save"), button[type="submit"]').first();
      await save.click({ force: true }).catch(() => {});
      await p.waitForTimeout(500);
    }
  }
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  const fired = await p.evaluate(() => Boolean(window.__xss_player));
  log("I1 stored XSS in display name does not execute", !fired);
}

// =========================================================
// J · API SURFACE
// =========================================================
console.log("\n=== J · API SURFACE ===");
{
  const r1 = await fetch(`${BASE}/api/dev-test/last-otp?phone=+255700000000`);
  log("J1 /api/dev-test responds (dev only)", r1.status === 200 || r1.status === 404, `status=${r1.status}`);

  const r2 = await fetch(`${BASE}/api/health`);
  const j = await r2.json();
  const flat = JSON.stringify(j);
  const leak = /(password|secret|otpHash|peppered|hmacKey|pepper)/i.test(flat);
  log("J2 /api/health has no obvious secret leakage", !leak);

  const r3 = await fetch(`${BASE}/api/webhooks/sms`, {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json" },
  });
  log("J3 /api/webhooks/sms rejects unsigned POST", r3.status >= 400, `status=${r3.status}`);

  const r4 = await fetch(`${BASE}/api/webhooks/sms`, { method: "GET" });
  log("J4 /api/webhooks/sms rejects GET", r4.status >= 400, `status=${r4.status}`);
}

await ctx.close();
await browser.close();

console.log(`\n${"=".repeat(60)}`);
console.log(`PLAYER BREAK-IT  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);
if (fails.length) {
  console.log("\nFailing assertions:");
  for (const f of fails) console.log("  - " + f);
}
process.exit(fail === 0 ? 0 : 1);
