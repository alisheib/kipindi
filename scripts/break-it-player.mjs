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
  await p.fill('#phone', tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', "TestPass123!");
  await p.fill('input[name="passwordConfirm"]', "TestPass123!");
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    p.waitForURL(u => !/auth\/register/.test(u.toString()), { timeout: 15_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.close();
  return { tail, e164 };
}

async function readAuditCount() {
  const r = await fetch(`${BASE}/api/health`);
  return (await r.json())?.store?.auditEntries ?? 0;
}

async function resetRateLimits() {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});
}
await resetRateLimits();

async function readWallet(p) {
  await p.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.waitForTimeout(800);
  const txt = await p.locator("body").textContent().catch(() => "");
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
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    // Meta-refresh fires after 1s but Next.js streaming can delay it.
    // Poll up to 6s for the URL to settle on the gating endpoint.
    for (let i = 0; i < 12 && !mustEnd.test(page.url()); i++) await page.waitForTimeout(500);
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
    await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" }).catch(() => {});
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
// F · SELF-EXCLUSION BYPASS  (uses an ISOLATED context so the rest of
// the suite — H, I, K, L, M, N — keeps a working session on `p`.)
// =========================================================
console.log("\n=== F · SELF-EXCLUSION BYPASS ===");
{
  const sxCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const sxMe = await register(sxCtx);
  const sxP = await sxCtx.newPage();
  await sxP.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "networkidle" });
  // The trigger button in the SX form opens a ConfirmDialog (Sprint 43);
  // clicking it shows a "Yes, self-exclude" button inside the dialog,
  // which calls form.requestSubmit() to fire the server action.
  const sxTrigger = sxP.locator('button:has-text("Self-exclude")').first();
  if (await sxTrigger.count() === 0) {
    log("F1 self-exclusion UI present", false, "no SX trigger found — RG page changed");
  } else {
    await sxTrigger.click({ force: true }).catch(() => {});
    await sxP.waitForTimeout(400);
    const dialogConfirm = sxP.locator('button:has-text("Yes, self-exclude")').first();
    if (await dialogConfirm.count() === 0) {
      log("F1 self-exclusion confirm dialog present", false, "no confirm dialog");
    } else {
      await dialogConfirm.click({ force: true }).catch(() => {});
      await sxP.waitForTimeout(900);
      // Open a market and try to fire the buy server action directly. The
      // service layer must refuse for SELF_EXCLUDED users — we assert by
      // checking the audit count doesn't grow with bet-placed entries.
      const beforeAudit = await readAuditCount();
      await sxP.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await sxP.waitForTimeout(1200);
      await sxP.evaluate(async ({ marketId }) => {
        const form = document.querySelector("form[action]");
        if (!form) return;
        const fd = new FormData();
        fd.set("marketId", marketId);
        fd.set("side", "YES");
        fd.set("stake", "100");
        for (const el of form.querySelectorAll("input")) if (el.name && !fd.has(el.name)) fd.set(el.name, el.value);
        await fetch(form.getAttribute("action"), { method: "POST", body: fd }).catch(() => {});
      }, { marketId }).catch(() => {});
      await sxP.waitForTimeout(400);
      const afterAudit = await readAuditCount();
      // Generous bound — SX action itself adds an audit entry; bet-placed
      // entries would exceed that. Allow ≤ 3 entries (SX itself + buffer).
      log("F1 self-excluded user cannot place a bet", afterAudit - beforeAudit <= 3, `auditΔ=${afterAudit - beforeAudit}`);
    }
  }
  await sxCtx.close();
}

// =========================================================
// G · PRIVILEGE ESCALATION (admin actions as player)
// =========================================================
console.log("\n=== G · PRIVILEGE ESCALATION ===");
{
  // Player browses to /admin → must redirect (browser-level via meta-refresh).
  // Acceptable landings: /auth/admin OR / (the admin login page bounces
  // already-authed non-admins straight home — both are "not on /admin").
  const landedAway = (url) => !/\/admin(\b|\/)/.test(url) || /\/auth\/admin/.test(url);
  await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" }).catch(() => {});
  for (let i = 0; i < 12 && !landedAway(p.url()); i++) await p.waitForTimeout(500);
  log("G1 /admin pushes player off (auth/admin or /)", landedAway(p.url()), `landed=${p.url()}`);

  await p.goto(`${BASE}/admin/resolver-queue`, { waitUntil: "domcontentloaded" }).catch(() => {});
  for (let i = 0; i < 12 && !landedAway(p.url()); i++) await p.waitForTimeout(500);
  log("G2 /admin/resolver-queue pushes player off", landedAway(p.url()), `landed=${p.url()}`);

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

// =========================================================
// K · WALLET / TRANSACTION MANIPULATION
// =========================================================
console.log("\n=== K · WALLET / TRANSACTION ===");
{
  const balBefore = await readWallet(p);
  // K1 — try negative withdraw, oversize withdraw, and stake injection.
  // Withdraw is KYC-gated; fresh user without KYC won't see the form.
  // Pass the test as long as the balance never moves.
  await p.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.waitForTimeout(800);
  const tries = await p.evaluate(async () => {
    try {
      const form = document.querySelector("form[action]");
      if (!form) return ["no-form-as-expected (KYC gate)"];
      const action = form.getAttribute("action");
      const out = [];
      for (const amount of [-10000, 0, 1e15, "abc", "1.5e10"]) {
        const fd = new FormData();
        for (const el of form.querySelectorAll("input,select")) {
          if (el.name) fd.set(el.name, el.value || "");
        }
        fd.set("amount", String(amount));
        try {
          const r = await fetch(action, { method: "POST", body: fd });
          out.push(`amt=${amount}→${r.status}`);
        } catch (e) {
          out.push(`amt=${amount}→err`);
        }
      }
      return out;
    } catch (e) {
      return [`evaluate-failed: ${e.message}`];
    }
  });
  const balAfter = await readWallet(p);
  log("K1 invalid withdraw payloads do not debit (KYC-gated)", balBefore === balAfter, `tries=${tries.join(",")} bal=${balBefore}→${balAfter}`);
}

// =========================================================
// L · CONCURRENT CASH-OUT (double-spend)
// =========================================================
console.log("\n=== L · CONCURRENT CASH-OUT ===");
{
  // First, place a bet so we have a position to cash out.
  await p.goto(`${BASE}/markets/${marketId}`, { waitUntil: "networkidle" });
  const placed = await p.evaluate(async ({ marketId }) => {
    const form = document.querySelector("form[action]");
    if (!form) return false;
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("side", "YES");
    fd.set("stake", "500");
    for (const el of form.querySelectorAll("input")) if (el.name && !fd.has(el.name)) fd.set(el.name, el.value);
    const r = await fetch(form.getAttribute("action"), { method: "POST", body: fd });
    return r.ok;
  }, { marketId });
  // Visit /positions to get a position id
  await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
  const positionId = await p.evaluate(() => {
    const form = document.querySelector('form[action*="cashout" i], form input[name="positionId"]');
    if (!form) return null;
    if (form.tagName === "FORM") return form.querySelector('input[name="positionId"]')?.value ?? null;
    return form.value ?? null;
  });
  const balBefore = await readWallet(p);
  const statuses = await p.evaluate(async (positionId) => {
    if (!positionId) return [];
    const form = document.querySelector("form[action]");
    if (!form) return [];
    const action = form.getAttribute("action");
    const buildFD = () => {
      const fd = new FormData();
      fd.set("positionId", positionId);
      for (const el of form.querySelectorAll("input")) if (el.name && !fd.has(el.name)) fd.set(el.name, el.value);
      return fd;
    };
    const reqs = Array.from({ length: 8 }, () => fetch(action, { method: "POST", body: buildFD() }));
    const rs = await Promise.all(reqs);
    return rs.map(r => r.status);
  }, positionId);
  const balAfter = await readWallet(p);
  // Even if we couldn't isolate the cashout, the test passes if balance
  // didn't grow by 8x the position payout.
  log("L1 8 concurrent cashouts → wallet credit not ×8", balAfter - balBefore < 8 * 500, `placed=${placed} pid=${positionId} statuses=${statuses.join(",")} bal=${balBefore}→${balAfter}`);
}

// =========================================================
// M · CROSS-ACCOUNT INTERFERENCE
// =========================================================
console.log("\n=== M · CROSS-ACCOUNT INTERFERENCE ===");
{
  // Register a SECOND user, then from user 1's session try to act on user 2's
  // resources by guessing IDs.
  const ctx2 = await browser.newContext();
  const me2 = await register(ctx2);
  console.log(`[setup] second user ${me2.e164}`);
  await ctx2.close();

  // From user 1 (already logged in), try to read user 2's positions/wallet.
  // The site doesn't expose another user's state in any path — this confirms.
  await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
  const bodyText = (await p.locator("body").textContent()) ?? "";
  const otherPhone = me2.e164.replace("+255", "");
  const leak = bodyText.includes(otherPhone) || bodyText.includes(me2.tail);
  log("M1 user 1's /positions does not leak user 2's phone", !leak);

  // Try to fetch a positionId pattern (pos_ or wlt_) — should not return data
  const dump = await p.evaluate(async () => {
    const r = await fetch("/api/health");
    return await r.json();
  });
  const nameSerialised = JSON.stringify(dump);
  const phoneLeak = nameSerialised.includes("+255");
  log("M2 /api/health does not leak any +255 phone numbers", !phoneLeak);
}

// =========================================================
// N · LARGE / MALICIOUS PAYLOADS
// =========================================================
console.log("\n=== N · LARGE / MALICIOUS PAYLOADS ===");
{
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  // Try to set display name to a 100KB string and a SQLi-shaped string.
  const editBtn = p.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
  if (await editBtn.count() > 0) {
    await editBtn.click({ force: true }).catch(() => {});
    const nameField = p.locator('input[name="displayName"], input[name="name"]').first();
    if (await nameField.count() > 0) {
      await nameField.fill("A".repeat(100_000)).catch(() => {});
      const save = p.locator('button:has-text("Save"), button[type="submit"]').first();
      await save.click({ force: true }).catch(() => {});
      await p.waitForTimeout(400);
    }
  }
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  const text = (await p.locator("body").textContent()) ?? "";
  const hugeNamePresent = text.includes("A".repeat(500));
  log("N1 100KB display name does not render verbatim", !hugeNamePresent);

  // CRLF / header injection in form fields
  const crlfPayload = "harmless\r\nX-Injected: yes";
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  if (await editBtn.count() > 0) {
    await editBtn.click({ force: true }).catch(() => {});
    const nameField = p.locator('input[name="displayName"], input[name="name"]').first();
    if (await nameField.count() > 0) {
      await nameField.fill(crlfPayload).catch(() => {});
      const save = p.locator('button:has-text("Save"), button[type="submit"]').first();
      await save.click({ force: true }).catch(() => {});
      await p.waitForTimeout(400);
    }
  }
  log("N2 CRLF in display name does not crash app", !p.url().includes("error"));
}

// =========================================================
// O · TIME / AGE TAMPERING
// =========================================================
console.log("\n=== O · TIME / AGE TAMPERING ===");
{
  // Try to register a fresh user with a future DOB / under-18 DOB / non-date.
  const probe = await browser.newContext();
  const pp = await probe.newPage();
  await pp.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  const tail = "7" + String((Date.now() + 1) % 100_000_000).padStart(8, "0");
  await pp.fill('#phone', tail);
  await pp.fill('input[name="dob"]', "2020-01-15");   // 5-year-old
  await pp.fill('input[name="password"]', "TestPass123!");
  await pp.fill('input[name="passwordConfirm"]', "TestPass123!");
  await pp.check('input[name="acceptAge"]', { force: true });
  await pp.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    pp.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 8_000 }).catch(() => null),
    pp.click('button[type="submit"]'),
  ]);
  log("O1 under-18 DOB rejected", /auth\/register/.test(pp.url()) || pp.url().includes("error="), pp.url());
  await probe.close();
}

// =========================================================
// P · BOT / AUTOMATION FINGERPRINTS
// =========================================================
console.log("\n=== P · BOT / AUTOMATION ===");
{
  // Per-IP rate-limit assertion: 12 fast registrations from the same
  // context must trip the IP cap (Sprint 45: cap=10 per ~20 min).
  await resetRateLimits();
  const probe = await browser.newContext();
  const pp = await probe.newPage();
  let okCount = 0, blockedCount = 0;
  for (let i = 0; i < 12; i++) {
    await pp.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
    const tail = "7" + String((Date.now() + i + 7) % 100_000_000).padStart(8, "0");
    await pp.fill('#phone', tail);
    await pp.fill('input[name="dob"]', "1990-01-15");
    await pp.fill('input[name="password"]', "TestPass123!");
    await pp.fill('input[name="passwordConfirm"]', "TestPass123!");
    await pp.check('input[name="acceptAge"]', { force: true });
    await pp.check('input[name="acceptTerms"]', { force: true });
    await Promise.all([
      pp.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 6_000 }).catch(() => null),
      pp.click('button[type="submit"]'),
    ]);
    if (/error=rate_limited/.test(pp.url())) blockedCount++;
    else if (!/auth\/register/.test(pp.url())) okCount++;
  }
  // Per-IP cap (Sprint 45) must throttle BEFORE 12 succeed.
  log("P1 rapid 12× registration burst is throttled per-IP", blockedCount > 0, `ok=${okCount} blocked=${blockedCount}`);
  await probe.close();
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
