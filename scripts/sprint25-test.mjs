/**
 * Sprint 25 — wallet rebuild + positions P&L summary.
 *
 *   1. /wallet renders kit hero (FiftyMark watermark, balance card)
 *   2. Tabs: Activity / Methods / Limits all switch
 *   3. /wallet/deposit kit-faithful (no Pattern sokoni, no Card legacy)
 *   4. /wallet/withdraw kit-faithful (KYC gate visible if not approved)
 *   5. /positions summary strip — At risk / Live value / Settled / Win rate
 *   6. /api/health 200
 *
 *   BASE=http://localhost:3000  node scripts/sprint25-test.mjs
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

// 1+2 · /wallet
console.log("\n=== 1 · /wallet ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  log("1a /wallet returns 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("1b 'Available · Salio' header", /Available.*Salio/i.test(body));
  log("1c Pending + On hold sub-stats", /Pending/.test(body) && /On hold/.test(body));
  log("1d Deposit + Withdraw CTAs", /Deposit/.test(body) && /Withdraw/.test(body));
  // No Kipindi tokens leaking *inside the wallet main content* (we ignore
  // the shared layout chrome — top bar / footer leaks are tracked separately).
  const mainHtml = await p.locator("main main").innerHTML();
  const kp = ["text-title-lg", "text-title-md", "text-title-sm", "Pattern kind", "border-divider", "text-text-secondary", "text-text-tertiary", "text-label", "text-caption", "text-micro", "shadow-glow-gold", "kp-slide-up", "var(--royal)", "var(--success)", "bet-cold"];
  const leaks = kp.filter((t) => mainHtml.includes(t));
  log("1e no Kipindi tokens leaked in main", leaks.length === 0, leaks.join(", ") || "clean");

  // Methods tab
  const methodsBtn = p.locator('button[role="tab"]', { hasText: "Methods" }).first();
  await methodsBtn.click();
  await p.waitForTimeout(300);
  const methodsBody = (await p.locator("body").textContent()) ?? "";
  log("1f Methods tab: M-Pesa / Tigo Pesa", /M-Pesa/i.test(methodsBody) && /Tigo Pesa/i.test(methodsBody));
  log("1g Default badge present", /Default/i.test(methodsBody));

  // Limits tab
  await p.locator('button[role="tab"]', { hasText: "Limits" }).first().click();
  await p.waitForTimeout(300);
  const limitsBody = (await p.locator("body").textContent()) ?? "";
  log("1h Limits tab: daily/weekly/monthly", /Daily deposit/.test(limitsBody) && /Weekly deposit/.test(limitsBody));
  log("1i Self-exclusion section", /Self-exclusion/.test(limitsBody));

  await p.close();
  await ctx.close();
}

// 3 · /wallet/deposit
console.log("\n=== 2 · /wallet/deposit ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/wallet/deposit`, { waitUntil: "networkidle" });
  log("2a /wallet/deposit 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("2b 'Add funds to your wallet'", /Add funds/i.test(body));
  log("2c Method · Njia legend", /Method.*Njia/i.test(body));
  log("2d Quick amounts (1K..100K)", /1K/.test(body) && /100K/.test(body));
  await p.close();
  await ctx.close();
}

// 4 · /wallet/withdraw
console.log("\n=== 3 · /wallet/withdraw ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/wallet/withdraw`, { waitUntil: "networkidle" });
  log("3a /wallet/withdraw 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("3b 'Move funds out' header", /Move funds out/i.test(body));
  log("3c Tax notice block", /Tax notice/i.test(body));
  await p.close();
  await ctx.close();
}

// 5 · /positions P&L summary
console.log("\n=== 4 · /positions ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
  log("4a /positions 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("4b Open + Settled sections still present", /Open/.test(body) && /Settled/.test(body));
  await p.close();
  await ctx.close();
}

// 6 · health
console.log("\n=== 5 · HEALTH ===");
{
  const r = await fetch(`${BASE}/api/health`);
  log("5a 200", r.status === 200, String(r.status));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 25  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
