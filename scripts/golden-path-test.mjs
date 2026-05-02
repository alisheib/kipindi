/**
 * Golden-path E2E — what every manager / regulator / first-time user touches.
 * Walks the full happy-path on a phone-sized viewport so we catch responsive
 * issues that the per-flow tests miss.
 *
 *   BASE=https://kipindi-production.up.railway.app  node scripts/golden-path-test.mjs
 *   BASE=http://localhost:3000                       node scripts/golden-path-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

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
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });

try {
  // === STEP 1: Landing renders, demo CTA visible ===
  const home = await ctx.newPage();
  await home.goto(BASE, { waitUntil: "networkidle" });
  await home.waitForTimeout(800);
  const demoCta = home.locator('a[href="/auth/demo"]').first();
  log("01 landing renders + Try-demo CTA visible", await demoCta.isVisible());
  await home.close();

  // === STEP 2: Enter demo + land on /live ===
  const demo = await ctx.newPage();
  const r2 = await demo.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  log("02 /auth/demo redirects to authed area", (r2?.status() ?? 0) === 200);
  await demo.close();

  // === STEP 3: Wallet shows TZS 100,000 ===
  const w = await ctx.newPage();
  await w.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w.waitForTimeout(600);
  const bal0 = await readBal(w);
  await w.close();
  log("03 wallet starts at TZS 100,000", bal0 === 100_000, `${bal0?.toLocaleString()}`);

  // === STEP 4: Place a match bet ===
  const m = await ctx.newPage();
  await m.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await m.waitForTimeout(900);
  const placeBtn = m.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  if (await placeBtn.isVisible().catch(() => false)) await placeBtn.click().catch(() => {});
  await m.waitForTimeout(2_500);
  await m.close();
  const w2 = await ctx.newPage();
  await w2.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w2.waitForTimeout(600);
  const bal1 = await readBal(w2);
  await w2.close();
  log("04 match bet places + debits", bal1 !== null && bal1 < (bal0 ?? 100_000), `${bal0?.toLocaleString()} → ${bal1?.toLocaleString()}`);

  // === STEP 5: My bets shows the bet + cash-out offer ===
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bp.waitForTimeout(900);
  const cashBtn = bp.locator('button').filter({ hasText: /^Cash out$/ }).first();
  log("05 /bets shows cash-out offer for active bet", await cashBtn.isVisible().catch(() => false));
  await bp.close();

  // === STEP 6: Mapigo place + settle (with notification) ===
  await ctx.request.get(`${BASE}/auth/demo-mapigo-reset`).catch(() => {});
  await ctx.request.get(`${BASE}/auth/demo`).catch(() => {});
  const mp = await ctx.newPage();
  await mp.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(900);
  const sp = mp.locator('button[aria-pressed]').filter({ hasText: /Spike/i }).first();
  await sp.click().catch(() => {});
  await mp.waitForTimeout(250);
  const pl = mp.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
  if (await pl.isVisible().catch(() => false)) await pl.click().catch(() => {});
  await mp.waitForTimeout(2_500);
  // Force-settle
  const settle = mp.locator('button').filter({ hasText: /^SPIKE wins$/ }).first();
  if (await settle.isVisible().catch(() => false)) await settle.click().catch(() => {});
  await mp.waitForTimeout(2_500);
  await mp.close();
  const w3 = await ctx.newPage();
  await w3.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w3.waitForTimeout(600);
  const bal2 = await readBal(w3);
  await w3.close();
  log("06 Mapigo place + win → wallet at 101,300", bal2 === 101_300, `${bal2?.toLocaleString()}`);

  // === STEP 7: Win notification appears in bell ===
  const np = await ctx.newPage();
  await np.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await np.waitForTimeout(900);
  const bell = np.locator('button[aria-label^="Notifications"]').first();
  await bell.click().catch(() => {});
  await np.waitForTimeout(700);
  const notifBody = (await np.locator('[role="dialog"][aria-label="Notifications"]').textContent()) ?? "";
  log("07 win notification visible in bell", /You won/i.test(notifBody));
  await np.close();

  // === STEP 8: Profile loads with all rows clickable ===
  const pf = await ctx.newPage();
  await pf.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await pf.waitForTimeout(700);
  const settingsCount = await pf.locator('a[href^="/profile/"], a[href="/help"], a[href="/auth/logout"]').count();
  log("08 /profile has clickable setting rows (no dead links)", settingsCount >= 6, `${settingsCount} links`);
  await pf.close();

  // === STEP 9: All major routes return 200 ===
  const ROUTES = ["/", "/live", "/mapigo", "/bets", "/wallet", "/profile", "/profile/account", "/profile/responsible-gambling", "/profile/source-of-funds", "/profile/kyc", "/profile/sessions", "/help", "/admin", "/admin/players", "/admin/aml", "/admin/audit", "/admin/system", "/legal/terms", "/legal/privacy", "/legal/responsible-gambling", "/legal/aml"];
  let routeOk = 0, routeFail = 0;
  for (const path of ROUTES) {
    const r = await ctx.request.get(`${BASE}${path}`, { maxRedirects: 0 });
    const code = r.status();
    if (code === 200) routeOk++; else routeFail++;
  }
  log(`09 every major route returns 200`, routeFail === 0, `${routeOk}/${ROUTES.length}`);

  // === STEP 10: Sign out works ===
  const lo = await ctx.request.get(`${BASE}/auth/logout`, { maxRedirects: 0 });
  log("10 /auth/logout returns 307 redirect", lo.status() === 307);

  // === STEP 11: Gated route blocks signed-out user ===
  const noSess = await browser.newContext();
  const r11 = await noSess.request.get(`${BASE}/wallet/deposit`, { maxRedirects: 0 });
  log("11 /wallet/deposit blocked without session", r11.status() === 307);
  await noSess.close();

  // === STEP 12: Production security headers ===
  const headerRes = await browser.newContext().then((c) => c.request.get(BASE));
  const h = headerRes.headers();
  log(
    "12 CSP + X-Frame DENY + X-Content nosniff",
    !!h["content-security-policy"] && h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff",
  );
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nGOLDEN-PATH  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
