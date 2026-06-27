/**
 * Marketing-cards + invite-admin UI stress test (Playwright, against a running
 * server — local dev or any BASE). Focuses on the NEW surfaces:
 *   - 10% cashback promo cards on home / wallet / deposit (render + no overflow)
 *   - invite admin: empty states, the split email/phone form, the staged list
 *     under load (60 rapid adds → scroll, no overflow), add-to-campaign, send
 * Hostile/edge inputs are thrown at the form. Any horizontal overflow, missing
 * promo, console error, or JS exception fails the run.
 *
 *   BASE=http://localhost:3000 node scripts/marketing-invite-stress.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (label, cond, extra) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`); } };

const overflow = (page) => page.evaluate(() => {
  const d = document.documentElement;
  return { over: d.scrollWidth > d.clientWidth + 1, sw: d.scrollWidth, cw: d.clientWidth };
});
const hasText = (page, t) => page.locator(`text=${t}`).first().isVisible().catch(() => false);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error" && !/eval\(\) is not supported|Content Security Policy|favicon|hydrat/i.test(m.text())) consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

try {
  // ── seed an admin session ──────────────────────────────────────────────
  const seed = await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { name: "Stress Admin" } });
  ok("seed-admin ok", seed.ok(), `status ${seed.status()}`);

  // ── marketing cards: home / wallet / deposit at mobile + desktop ────────
  for (const [label, w, h] of [["mobile-360", 360, 780], ["desktop-1280", 1280, 900]]) {
    await page.setViewportSize({ width: w, height: h });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    ok(`${label} / no h-overflow`, !(await overflow(page)).over);
    ok(`${label} / cashback promo present`, await hasText(page, "back on every deposit"));

    await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
    ok(`${label} /wallet no h-overflow`, !(await overflow(page)).over);
    ok(`${label} /wallet cashback promo present`, await hasText(page, "Cashback · Marejesho"));

    await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "networkidle" });
    ok(`${label} /wallet/deposit no h-overflow`, !(await overflow(page)).over);
    ok(`${label} /wallet/deposit compact promo present`, await hasText(page, "back on every deposit"));
  }

  // ── invite admin: empty state + create campaign ─────────────────────────
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(`${BASE}/admin/invites`, { waitUntil: "networkidle" });
  ok("invites list reachable (admin)", page.url().includes("/admin/invites"));
  ok("invites empty state renders", await hasText(page, "No campaigns yet"));
  ok("invites list no h-overflow @360", !(await overflow(page)).over);

  // Create a campaign (very long name = stress the header/layout).
  const longName = "Mega Launch " + "X".repeat(80);
  await page.locator('input[placeholder="June Launch Push"]').fill(longName);
  await page.getByRole("button", { name: /Create campaign/i }).click();
  await page.waitForURL(/\/admin\/invites\/inv_/, { timeout: 15000 }).catch(() => {});
  ok("campaign created → detail page", /\/admin\/invites\/inv_/.test(page.url()), page.url());
  ok("long campaign name does not overflow @360", !(await overflow(page)).over);
  ok("contacts empty state renders", await hasText(page, "No contacts yet"));

  // ── stress the structured contact form: 60 rapid adds + hostile input ───
  const emailInput = page.locator('input[placeholder="jane@example.com"]');
  const addToList = page.getByRole("button", { name: /^Add to list/i });
  // hostile: bad email should NOT stage
  await emailInput.fill("not-an-email");
  await addToList.click();
  ok("bad email rejected (0 staged)", !(await hasText(page, "contact staged")) && !(await hasText(page, "contacts staged")));

  for (let i = 0; i < 60; i++) {
    await emailInput.fill(`stress_${i}@example.com`);
    await addToList.click();
  }
  ok("60 contacts staged", await hasText(page, "60 contacts staged"));
  ok("staged list no h-overflow @360", !(await overflow(page)).over);
  // staged list should scroll (max-h-72), not grow the page unbounded
  const ul = page.locator("ul.max-h-72").first();
  const scrolls = await ul.evaluate((el) => el.scrollHeight > el.clientHeight + 4).catch(() => false);
  ok("staged list scrolls instead of overflowing", scrolls);

  // commit to campaign
  await page.getByRole("button", { name: /Add .*to campaign/i }).click();
  await page.waitForTimeout(1200);
  ok("contacts table rendered after add", await hasText(page, "Status") || await hasText(page, "stress_0@example.com"));
  ok("detail no h-overflow after 60 contacts @360", !(await overflow(page)).over);

  // send (all email → should send; in dev SMS console is 'live' so 0 pending)
  await page.getByRole("button", { name: /^Send/i }).click();
  await page.waitForTimeout(1500);
  ok("no JS/console errors during invite flow", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  // desktop re-check of the populated detail page
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(page.url(), { waitUntil: "networkidle" });
  ok("populated detail no h-overflow @1280", !(await overflow(page)).over);
} catch (e) {
  fail++;
  console.log(`  ✗ EXCEPTION: ${e.message}`);
} finally {
  await browser.close();
}

console.log(`\nmarketing-invite-stress: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
