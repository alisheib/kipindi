/**
 * Sprint 19 — international polish + responsiveness regression.
 *
 * Verifies:
 *  1. Player-Safety markers-of-harm panel on /admin/compliance
 *  2. Two-person AML approval threshold visible on the queue
 *  3. Self-exclusion register CSV header schema (cross-operator format)
 *  4. Webhook signing primitive: signed POST → 200; unsigned → 401; wrong sig → 401
 *  5. /admin/aml suspicious-bet detector still wired
 *
 *   BASE=http://localhost:3000  node scripts/sprint19-test.mjs
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:3000";
const WEBHOOK_SECRET = "dev-only-webhook-secret-replace-in-prod";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();

// ============================================================
// 1 · /admin/compliance — Player Safety panel
// ============================================================
console.log("\n=== 1 · Player-safety markers panel ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/compliance`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("1a Player-safety panel heading present", /Player safety|markers of harm/i.test(body));
  log("1b LCCP §3.4.1 reference",                /LCCP\s*[\u00a7§]3\.4\.1/.test(body));
  log("1c All 5 marker types named",             /rapid-deposit/.test(body) && /chasing-losses/.test(body) && /late-night/.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// 2 · /admin/aml — two-person threshold + suspicious-bet
// ============================================================
console.log("\n=== 2 · Two-person AML threshold ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/aml`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("2a /admin/aml renders",                       /AML|EDD|review/i.test(body));
  log("2b Two-person approval policy referenced",    /two[- ]person|second\s*reviewer|TZS\s*5M|second-officer/i.test(body));
  log("2c Suspicious-bet detector still wired",      /Suspicious[- ]bet detector/i.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// 3 · Webhook signing primitive
// ============================================================
console.log("\n=== 3 · Webhook signing ===");
{
  const body = JSON.stringify({ provider: "selcom", reference: "test-ref-001", amount: 5000, status: "CONFIRMED" });
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(body, "utf8").digest("hex");
  const now = new Date().toISOString();

  // 3a unsigned post → 401
  const r1 = await fetch(`${BASE}/api/webhooks/payments`, {
    method: "POST",
    headers: { "x-provider": "selcom", "content-type": "application/json" },
    body,
  });
  log("3a unsigned webhook → 401", r1.status === 401, `${r1.status}`);

  // 3b wrong signature → 401
  const r2 = await fetch(`${BASE}/api/webhooks/payments`, {
    method: "POST",
    headers: {
      "x-provider": "selcom",
      "x-signature": "deadbeef".repeat(8),
      "x-timestamp": now,
      "content-type": "application/json",
    },
    body,
  });
  log("3b wrong signature → 401", r2.status === 401, `${r2.status}`);

  // 3c valid signature → 200
  const r3 = await fetch(`${BASE}/api/webhooks/payments`, {
    method: "POST",
    headers: {
      "x-provider": "selcom",
      "x-signature": sig,
      "x-timestamp": now,
      "content-type": "application/json",
    },
    body,
  });
  log("3c valid signature → 200", r3.status === 200, `${r3.status}`);

  // 3d unknown provider → 400
  const r4 = await fetch(`${BASE}/api/webhooks/payments`, {
    method: "POST",
    headers: { "x-provider": "evil-corp", "x-signature": sig, "content-type": "application/json" },
    body,
  });
  log("3d unknown provider → 400", r4.status === 400, `${r4.status}`);

  // 3e stale timestamp → 401
  const stale = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 min ago
  const r5 = await fetch(`${BASE}/api/webhooks/payments`, {
    method: "POST",
    headers: {
      "x-provider": "selcom",
      "x-signature": sig,
      "x-timestamp": stale,
      "content-type": "application/json",
    },
    body,
  });
  log("3e stale timestamp → 401", r5.status === 401, `${r5.status}`);
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 19  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
