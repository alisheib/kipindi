/**
 * End-to-end test against the LIVE Railway URL.
 * Exercises every flow a manager would touch, on an iPhone Pro Max viewport.
 *
 *   BASE=https://kipindi-production.up.railway.app node scripts/live-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "https://kipindi-production.up.railway.app";
const viewport = { width: 430, height: 932 };

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function readBal(page) {
  const el = page.locator("[data-testid='wallet-balance']").first();
  if (await el.count() === 0) return null;
  const v = await el.getAttribute("data-balance");
  return v ? parseInt(v, 10) : null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport });

try {
  // ---- 1. Landing loads, demo CTA visible ----
  const home = await ctx.newPage();
  await home.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
  await home.waitForTimeout(1_000);
  const demoBtn = home.locator('a[href="/auth/demo"]').first();
  log("01 landing loads on mobile + demo CTA visible", await demoBtn.isVisible());
  await home.close();

  // ---- 2. /auth/demo creates session, redirects ----
  const sess = await ctx.newPage();
  await sess.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const url = sess.url();
  log("02 /auth/demo creates session and redirects", url.includes("/live") || url.endsWith("/"));
  await sess.close();

  // ---- 3. Wallet shows TZS 100,000 ----
  const wallet = await ctx.newPage();
  await wallet.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await wallet.waitForTimeout(800);
  const startBal = await readBal(wallet);
  log("03 wallet starts at TZS 100,000", startBal === 100_000, `${startBal?.toLocaleString()}`);
  await wallet.close();

  // ---- 4. /live shows matches ----
  const live = await ctx.newPage();
  await live.goto(`${BASE}/live`, { waitUntil: "networkidle" });
  await live.waitForTimeout(1_000);
  const matchLinks = live.locator('a[href^="/match/"]');
  const matchCount = await matchLinks.count();
  log("04 /live shows match links", matchCount > 0, `${matchCount} matches`);
  await live.close();

  // ---- 5. Open a match and place a bet ----
  const match = await ctx.newPage();
  await match.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await match.waitForTimeout(1_000);
  const placeBtn = match.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  const placeVisible = await placeBtn.isVisible().catch(() => false);
  if (placeVisible) {
    await placeBtn.click().catch(() => {});
    await match.waitForTimeout(2_500);
  }
  await match.close();

  // ---- 6. Wallet should show -1,000 (or whatever default match stake) ----
  const w2 = await ctx.newPage();
  await w2.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w2.waitForTimeout(800);
  const afterMatchBet = await readBal(w2);
  await w2.close();
  log(
    "05 match bet placed → wallet debits",
    afterMatchBet !== null && afterMatchBet < (startBal ?? 100_000),
    `${startBal?.toLocaleString()} → ${afterMatchBet?.toLocaleString()}`,
  );

  // ---- 7. /bets shows the placed bet ----
  const bets = await ctx.newPage();
  await bets.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bets.waitForTimeout(800);
  const bodyText = (await bets.locator("body").textContent()) ?? "";
  const hasActive = /Active\s*·/i.test(bodyText);
  log("06 /bets renders + shows Active counter", hasActive);
  await bets.close();

  // ---- 8. Mapigo: pick SPIKE + place ----
  // Reset round state first so this test is independent
  await ctx.request.get(`${BASE}/auth/demo-mapigo-reset`).catch(() => {});
  await ctx.request.get(`${BASE}/auth/demo`).catch(() => {});  // reset wallet

  const mp = await ctx.newPage();
  await mp.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(1_200);
  const spike = mp.locator('button[aria-pressed]').filter({ hasText: /Spike/i }).first();
  await spike.click().catch(() => {});
  await mp.waitForTimeout(300);
  const placeMp = mp.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
  if (await placeMp.isVisible().catch(() => false)) await placeMp.click().catch(() => {});
  await mp.waitForTimeout(2_500);
  await mp.close();

  const w3 = await ctx.newPage();
  await w3.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w3.waitForTimeout(800);
  const afterMapigo = await readBal(w3);
  await w3.close();
  log(
    "07 Mapigo SPIKE placed → wallet at 99,000",
    afterMapigo === 99_000,
    `${afterMapigo?.toLocaleString()}`,
  );

  // ---- 9. Mapigo settle: SPIKE wins → wallet should grow ----
  const ms = await ctx.newPage();
  await ms.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await ms.waitForTimeout(800);
  const settle = ms.locator('button').filter({ hasText: /^SPIKE wins$/ }).first();
  if (await settle.isVisible().catch(() => false)) await settle.click().catch(() => {});
  await ms.waitForTimeout(3_000);
  await ms.close();

  const w4 = await ctx.newPage();
  await w4.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w4.waitForTimeout(800);
  const afterSettle = await readBal(w4);
  await w4.close();
  log(
    "08 Mapigo SPIKE wins → wallet at 101,300 (1,000 stake × 2.30 payout)",
    afterSettle === 101_300,
    `${afterSettle?.toLocaleString()}`,
  );

  // ---- 10. Sign out via /auth/logout ----
  const lo = await ctx.request.get(`${BASE}/auth/logout`, { maxRedirects: 0 });
  log("09 /auth/logout returns 307 redirect", lo.status() === 307);

  // After logout, gated routes should redirect
  const noSess = await browser.newContext();
  const r = await noSess.request.get(`${BASE}/wallet/deposit`, { maxRedirects: 0 });
  log("10 /wallet/deposit blocked when signed out", r.status() === 307);
  await noSess.close();

  // ---- 11. Security headers on production ----
  const headerRes = await browser.newContext().then((c) => c.request.get(BASE));
  const h = headerRes.headers();
  log(
    "11 production CSP + X-Frame DENY + X-Content nosniff",
    !!h["content-security-policy"] && h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff",
  );
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nLIVE E2E  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
