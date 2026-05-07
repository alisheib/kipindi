/**
 * Sprint 26 — layout chrome rebuild (top bar + footer + demo banner +
 * notifications panel + bottom nav). Verifies the whole-page Kipindi
 * token leaks Sprint 25 deferred are now gone.
 *
 *   BASE=http://localhost:3000  node scripts/sprint26-test.mjs
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

const KIPINDI_TOKENS = [
  "text-text-secondary", "text-text-tertiary",
  "border-divider", "border-border-divider", "border-border-subtle",
  "text-label", "text-caption", "text-micro",
  "duration-micro", "duration-short",
  "kp-slide-up", "kp-ping",
  "shadow-glow-gold", "shadow-e3", "shadow-e4", "shadow-e5",
  "var(--royal)", "var(--success)", "var(--bet-cold)",
  "z-sticky", "z-popover",
  "Pattern kind",
  "bg-surface-pressed", "bg-surface-hover",
];

console.log("\n=== 1 · LAYOUT CHROME — whole page Kipindi-token scan ===");

for (const route of ["/", "/markets", "/wallet", "/positions", "/profile", "/leaderboard"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (route !== "/") {
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  }
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  log(`1.${route}.status 200`, r?.status() === 200, String(r?.status()));
  // Scan only rendered DOM body, not <script> bundles — Next.js code-splits
  // bundles for unrelated routes and includes them in the page payload, so
  // class names from /admin etc. would otherwise show up here even though
  // they aren't actually applied to anything.
  const bodyHtml = await p.evaluate(() => document.body.outerHTML.replace(/<script[\s\S]*?<\/script>/g, ""));
  const leaks = KIPINDI_TOKENS.filter((t) => bodyHtml.includes(t));
  log(`1.${route}.no-leaks`, leaks.length === 0, leaks.join(", ") || "clean");
  await p.close();
  await ctx.close();
}

console.log("\n=== 2 · TOP BAR ELEMENTS ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // Sticky header presence
  const headerSticky = await p.locator('header.sticky').count();
  log("2a sticky header present", headerSticky > 0);
  // Bell + bell unread dot (we have demo notifications)
  const bell = await p.locator('button[aria-label^="Notifications"]').count();
  log("2b notifications bell present", bell > 0);
  // FiftyLockup logo home link
  const home = await p.locator('a[aria-label="50pick home"]').count();
  log("2c home link with FiftyLockup", home > 0);
  // Bottom nav (mobile only — should not render at 1440 wide)
  const bnav = await p.locator('nav[aria-label="Primary"]').count();
  log("2d primary nav rendered (top + bottom together)", bnav >= 1);
  await p.close();
  await ctx.close();
}

console.log("\n=== 3 · NOTIFICATIONS PANEL OPENS ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  await p.locator('button[aria-label^="Notifications"]').first().click();
  await p.waitForTimeout(400);
  const dialog = await p.locator('[role="dialog"][aria-label="Notifications"]').count();
  log("3a notifications dialog opens", dialog > 0);
  const body = (await p.locator('[role="dialog"][aria-label="Notifications"]').innerText().catch(() => "")) ?? "";
  log("3b 'Notifications · Arifa' header", /Notifications.*Arifa/i.test(body));
  await p.close();
  await ctx.close();
}

console.log("\n=== 4 · FOOTER ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const body = (await p.locator("footer").innerText()) ?? "";
  log("4a Play safe + Cheza salama heading", /play safe/i.test(body) && /Cheza salama/i.test(body));
  log("4b Helpline number visible", /0800 11 0011/.test(body));
  log("4c License line visible", /Licensed by the Gaming Board of Tanzania/.test(body));
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 26  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
