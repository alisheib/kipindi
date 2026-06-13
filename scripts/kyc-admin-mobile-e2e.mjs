/**
 * Mobile E2E — KYC officer review controls on a phone (390×844).
 * Admins review "on the run", so the approve / request-info / reject controls
 * must be reachable, tappable (≥44px), and never cause horizontal overflow.
 *
 *   BASE=http://localhost:3009 node scripts/kyc-admin-mobile-e2e.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] }); // 412×915-ish mobile, isMobile, touch
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error" && !/eval|DevTools|React will never use eval/.test(m.text())) errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

const noOverflow = async (label) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${label}: no horizontal overflow`, overflow <= 1, `(overflow=${overflow}px)`);
};

try {
  // 1. Player session → promote to admin → seed a pending-KYC player.
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const promote = await page.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  ok("promote-admin ok", promote.ok());
  const seedRes = await page.request.post(`${BASE}/api/dev-test/seed-kyc`, { data: { status: "PENDING_REVIEW" } });
  const seed = await seedRes.json();
  ok("seed-kyc ok", seedRes.ok() && !!seed.userId, JSON.stringify(seed));

  // 2. Open the player KYC review tab at phone width.
  await page.goto(`${BASE}/admin/players/${seed.userId}?tab=kyc`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  ok("controls: Approve present", /Approve/.test(body));
  ok("controls: Request info present", /Request info/.test(body));
  ok("controls: Reject present", /Reject/.test(body));
  await noOverflow("review tab");

  // 3. Tap targets ≥ 44px (mobile ergonomics).
  const approveBtn = page.getByRole("button", { name: /Approve/ }).first();
  const box = await approveBtn.boundingBox();
  ok("Approve button ≥44px tall", !!box && box.height >= 44, box ? `(${Math.round(box.height)}px)` : "(no box)");

  // 4. Open "Request info…" → reason panel renders, no overflow, send button shown.
  await page.getByRole("button", { name: /Request info/ }).first().click();
  await page.waitForTimeout(150);
  ok("request-info: textarea visible", await page.locator("textarea").first().isVisible());
  ok("request-info: 'Send request' shown", /Send request/.test(await page.locator("body").innerText()));
  await noOverflow("request-info panel");
  await page.screenshot({ path: "/tmp/kyc_admin_mobile.png", fullPage: true });

  ok("no console / page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
} catch (e) {
  ok("e2e ran without throwing", false, String(e));
}

await browser.close();
console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
