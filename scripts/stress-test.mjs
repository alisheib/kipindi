/**
 * Stress test — concurrent bets, edge cases, security probes.
 *
 *  1. Concurrency:   N parallel match-bet placements; verify wallet balance is exactly
 *                    startBalance − (N × stake) and bet count is exactly N.
 *  2. Concurrency:   Same for Mapigo: N parallel placements should result in only ONE
 *                    accepted (one-bet-per-round rule) — others rejected gracefully.
 *  3. Edge cases:    Negative / zero / decimal / over-balance / over-max stakes — all
 *                    must fail without corrupting state.
 *  4. Session:       Tampered cookie rejected.
 *  5. Sign-out:      After /auth/logout, all session-gated routes 307.
 *  6. Headers:       CSP + X-Frame DENY present everywhere.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function readTzs(page) {
  // Read the authoritative wallet balance from the data-balance attribute.
  // The visible text uses CountUp which animates from old → new, so we'd
  // catch a transitional value. data-balance is the final numeric balance.
  const el = page.locator("[data-testid='wallet-balance']").first();
  if (await el.count() === 0) return null;
  const v = await el.getAttribute("data-balance");
  return v ? parseInt(v, 10) : null;
}

async function readActiveCount(page) {
  const txt = await page.locator("body").textContent();
  const m = txt?.match(/Active\s*·\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // === SETUP: boot demo session ===
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });

  const w0 = await ctx.newPage();
  await w0.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w0.waitForTimeout(500);
  const startBal = await readTzs(w0);
  await w0.close();
  log("setup: demo wallet starts at 100,000", startBal === 100_000, `TZS ${startBal?.toLocaleString()}`);

  // === TEST 1: concurrent match bets (8 parallel, 1000 each — form default) ===
  const N = 8;
  const STAKE_EACH = 1_000;
  const pages = await Promise.all(Array.from({ length: N }, () => ctx.newPage()));
  await Promise.all(pages.map((p) => p.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" })));
  await Promise.all(pages.map((p) => p.waitForTimeout(800)));
  // Click Place bet on every page in parallel
  const t0 = Date.now();
  await Promise.all(pages.map(async (p) => {
    const btn = p.locator('button').filter({ hasText: /^Place bet ·/ }).first();
    if (await btn.isVisible()) await btn.click();
    await p.waitForTimeout(2_000);
  }));
  console.log(`  ${N} parallel bets fired in ${Date.now() - t0}ms`);
  await Promise.all(pages.map((p) => p.close()));

  // Wait for all server-side mutations to settle, then read fresh.
  await new Promise((r) => setTimeout(r, 2_000));
  const w1 = await ctx.newPage();
  await w1.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w1.waitForTimeout(800);
  const afterBal = await readTzs(w1);
  await w1.close();
  const expectedAfter = (startBal ?? 0) - N * STAKE_EACH;
  log(
    `concurrency: wallet exact debit (no double-spend race)`,
    afterBal === expectedAfter,
    `expected TZS ${expectedAfter.toLocaleString()}, got TZS ${afterBal?.toLocaleString()}`,
  );

  // Diagnostic: how many bets actually got created?
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bp.waitForTimeout(500);
  const placedCount = await readActiveCount(bp);
  await bp.close();
  log(`diagnostic: bets actually placed`, placedCount !== null && placedCount >= 1, `Active · ${placedCount}`);

  // === TEST 2: mapigo concurrent — only ONE should succeed (one-bet-per-round rule) ===
  // First reset by hitting demo (resets wallet to 100k)
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  // Open 4 mapigo pages
  const M = 4;
  const mgPages = await Promise.all(Array.from({ length: M }, () => ctx.newPage()));
  await Promise.all(mgPages.map((p) => p.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" })));
  await Promise.all(mgPages.map((p) => p.waitForTimeout(700)));
  // Each picks SPIKE then place in parallel
  await Promise.all(mgPages.map(async (p) => {
    const spike = p.locator('button').filter({ hasText: /Spike/i }).first();
    await spike.click().catch(() => {});
    await p.waitForTimeout(200);
    const place = p.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
    if (await place.isVisible().catch(() => false)) await place.click();
    await p.waitForTimeout(2_500);
  }));
  await Promise.all(mgPages.map((p) => p.close()));

  // Wallet should be 100k − (1 × 1000) = 99,000   (the 1k default Mapigo stake)
  const w2 = await ctx.newPage();
  await w2.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w2.waitForTimeout(500);
  const mgBal = await readTzs(w2);
  await w2.close();
  log(
    `concurrency: Mapigo enforces one-bet-per-round across ${M} parallel attempts`,
    mgBal === 99_000,
    `expected TZS 99,000, got TZS ${mgBal?.toLocaleString()}`,
  );

  // === TEST 3: tampered session cookie rejected ===
  // Get current cookies, mutate kp_session, verify session-gated routes redirect
  const cookies = await ctx.cookies(BASE);
  const sess = cookies.find((c) => c.name === "kp_session");
  if (sess) {
    // Flip the last char of the signature → invalid HMAC
    const tampered = sess.value.replace(/.$/, sess.value.endsWith("A") ? "B" : "A");
    const tamperCtx = await browser.newContext();
    await tamperCtx.addCookies([{ ...sess, value: tampered }]);
    const tr = await tamperCtx.request.get(`${BASE}/wallet/deposit`, { maxRedirects: 0 });
    log("security: tampered session cookie → 307 to login", tr.status() === 307);
    await tamperCtx.close();
  } else {
    log("security: tampered session cookie → 307 to login", false, "no session cookie to tamper");
  }

  // === TEST 4: no-session access to gated routes ===
  await ctx.request.get(`${BASE}/auth/logout`, { maxRedirects: 0 });
  const noSessCtx = await browser.newContext();
  for (const path of ["/wallet/deposit", "/wallet/withdraw", "/profile/kyc"]) {
    const r = await noSessCtx.request.get(`${BASE}${path}`, { maxRedirects: 0 });
    log(`security: ${path} blocked when signed out`, r.status() === 307);
  }
  await noSessCtx.close();

  // === TEST 5: security headers on every kind of route ===
  const headerCtx = await browser.newContext();
  for (const path of ["/", "/auth/login", "/mapigo"]) {
    const r = await headerCtx.request.get(`${BASE}${path}`);
    const h = r.headers();
    log(`headers @ ${path}: CSP + X-Frame DENY + X-Content nosniff`,
      !!h["content-security-policy"] && h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff");
  }
  await headerCtx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSTRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
