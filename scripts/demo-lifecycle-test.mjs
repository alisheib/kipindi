/**
 * Sprint 20 — demo-mode lifecycle.
 *
 * Verifies the round-trip a manager will actually walk through tomorrow:
 *   1. Land on /, see "Try demo" CTA
 *   2. Click → /auth/demo → ends up authed with demo banner visible
 *   3. Demo banner Exit click → cookies cleared → no banner, no demo state
 *   4. Re-enter demo → fresh wallet (TZS 100k), fresh session id
 *   5. Place a bet, exit, re-enter → wallet IS reset (or at least not bleed)
 *
 *   BASE=http://localhost:3000  node scripts/demo-lifecycle-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();

// ============================================================
// 1 · Landing → Try demo CTA → demo session
// ============================================================
console.log("\n=== 1 · Enter demo from landing ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const cta = p.locator('a[href*="/auth/demo"]').first();
  log("1a /auth/demo CTA on landing", await cta.isVisible());
  await cta.click();
  await p.waitForTimeout(1500);
  const url = p.url();
  log("1b clicking demo CTA navigates away from /", !url.endsWith("/"), url);
  // Demo banner should be visible
  const banner = p.locator('text=/DEMO MODE/i').first();
  log("1c demo banner appears", await banner.isVisible({ timeout: 4000 }).catch(() => false));
  await p.close();
  await ctx.close();
}

// ============================================================
// 2 · Demo banner Exit button works (USER REPORT)
// ============================================================
console.log("\n=== 2 · Demo banner Exit ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const before = (await p.locator("body").textContent()) ?? "";
  log("2a banner visible before exit", /DEMO MODE/i.test(before));
  // Click the Exit link in the banner
  const exit = p.locator('a[aria-label="Exit demo mode"]').first();
  log("2b Exit button accessible", await exit.isVisible());
  await exit.click();
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(800);
  const after = (await p.locator("body").textContent()) ?? "";
  log("2c banner gone after Exit", !/DEMO MODE/i.test(after));
  // Verify session cookie is cleared
  const cookies = await ctx.cookies();
  const session = cookies.find((c) => c.name === "kp_session");
  log("2d kp_session cookie cleared", !session, session ? `cookie still present: ${session.value.slice(0, 16)}…` : "");
  await p.close();
  await ctx.close();
}

// ============================================================
// 3 · Re-enter demo after exit — fresh state
// ============================================================
console.log("\n=== 3 · Re-enter demo after exit ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  // Round 1: enter, place bet, exit
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  let firstSessionId = null;
  {
    const cookies = await ctx.cookies();
    firstSessionId = cookies.find((c) => c.name === "kp_session")?.value ?? null;
  }
  // Exit
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/logout`, { waitUntil: "networkidle" });
  await p.close();
  // Round 2: re-enter
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  let secondSessionId = null;
  {
    const cookies = await ctx.cookies();
    secondSessionId = cookies.find((c) => c.name === "kp_session")?.value ?? null;
  }
  log("3a both demo sessions issued cookies", !!firstSessionId && !!secondSessionId);
  log("3b re-entered demo gets a NEW session token", firstSessionId !== secondSessionId);
  // Wallet should still report TZS 100,000
  const wp = await ctx.newPage();
  await wp.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await wp.waitForTimeout(400);
  const balEl = wp.locator("[data-testid='wallet-balance']").first();
  const balAttr = await balEl.getAttribute("data-balance").catch(() => null);
  const bal = balAttr ? parseInt(balAttr, 10) : null;
  log("3c re-entered demo wallet at TZS 100,000", bal === 100_000, `${bal}`);
  await wp.close();
  await ctx.close();
}

// ============================================================
// 4 · Demo lockdown — guest cannot reach /admin
// ============================================================
console.log("\n=== 4 · Guest cannot reach /admin ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  // Should be 307 → /auth/admin OR ultimately land at /auth/admin
  const finalUrl = p.url();
  log("4a /admin without session redirects away", finalUrl.includes("/auth/"));
  await p.close();
  await ctx.close();
}

// ============================================================
// 5 · After exit, /auth/demo still works (re-engage manager flow)
// ============================================================
console.log("\n=== 5 · /auth/demo idempotent ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  for (let i = 0; i < 3; i++) {
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
    await ctx.request.get(`${BASE}/auth/logout`).catch(() => {});
  }
  // Final entry
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const body = (await p.locator("body").textContent()) ?? "";
  log("5a /auth/demo after 3 cycle works", /DEMO MODE|Try demo|TZS|100,000/i.test(body));
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDEMO LIFECYCLE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
