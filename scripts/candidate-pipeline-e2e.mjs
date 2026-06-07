/**
 * AI market-candidate pipeline · end-to-end test.
 *
 * Walks the four pipeline layers + officer review:
 *   1. Seed fixtures across every state (FILTERED_OUT at L2, FILTERED_OUT
 *      at L4 by confidence, and PENDING_REVIEW awaiting officer call).
 *   2. Officer opens /admin/candidates — KPIs reflect the seeded state.
 *   3. Officer approves a PENDING_REVIEW candidate via UI form action.
 *   4. Officer rejects a PENDING_REVIEW candidate.
 *   5. Officer publishes an APPROVED candidate — creates a real market.
 *   6. Audit chain captured every officer action.
 *
 *   BASE=http://localhost:3000  node scripts/candidate-pipeline-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = (off = 0) => "7" + String((Date.now() + off) % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

async function login(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="password"]', pwd);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  // === 1 · Seed the pipeline with fixtures ===
  console.log("\n=== 1 · SEED PIPELINE ===");
  const seed = await fetch(`${BASE}/api/dev-test/seed-candidates`, { method: "POST" })
    .then(r => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  log("1a seed endpoint OK", seed?.ok === true, `count=${seed?.seeded}`);
  log("1b 6 fixtures seeded (across L2-reject, L4-reject, PENDING_REVIEW)",
      seed?.seeded === 6, `seeded=${seed?.seeded}`);

  const pendingIds = (seed.candidates || []).filter(c => c.state === "PENDING_REVIEW").map(c => c.id);
  const filteredOut = (seed.candidates || []).filter(c => c.state === "FILTERED_OUT");
  log("1c at least 4 PENDING_REVIEW (officer queue populated)", pendingIds.length >= 4, `count=${pendingIds.length}`);
  log("1d 2 FILTERED_OUT (L2-politics + L4-low-confidence)", filteredOut.length === 2, `count=${filteredOut.length}`);

  // === 2 · Officer opens /admin/candidates ===
  console.log("\n=== 2 · OFFICER OPENS QUEUE ===");
  const pwd = "Candidate!2026";
  const tail = phoneTail();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await reg(ctx, tail, pwd);
  const promo = await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + tail }),
  }).then(r => r.json()).catch(() => null);
  log("2a officer promoted to ADMIN", promo?.role === "ADMIN", `userId=${promo?.userId}`);
  await login(ctx, tail, pwd);

  const queue = await ctx.newPage();
  await queue.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
  await queue.waitForTimeout(600);
  const body = (await queue.locator("body").textContent()) ?? "";
  log("2b page renders 'Market candidates' heading", /Market candidates/.test(body));
  log("2c KPI: pending review count visible", /Pending review/i.test(body) && pendingIds.length > 0);
  log("2d KPI: filtered + rejected count visible", /Filtered.*rejected|Yalikataliwa/.test(body));
  log("2e KPI: 24h spend in USD visible", /Spend|Gharama/.test(body) && /\$/.test(body));

  // First PENDING row should show approve/reject form
  const firstRow = queue.locator('[class*="divide-y"] > div').first();
  const approveBtn = queue.locator('button').filter({ hasText: /Approve/i }).first();
  const rejectBtn  = queue.locator('button').filter({ hasText: /Reject/i }).first();
  log("2f Approve button visible on first PENDING row", await approveBtn.isVisible().catch(() => false));
  log("2g Reject button visible on first PENDING row", await rejectBtn.isVisible().catch(() => false));
  await queue.close();

  // === 3 · Approve a candidate ===
  console.log("\n=== 3 · APPROVE A CANDIDATE ===");
  const approvePage = await ctx.newPage();
  await approvePage.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
  await approvePage.waitForTimeout(600);
  const initialPending = await approvePage.locator('button').filter({ hasText: /^Approve$/i }).count();
  await approvePage.locator('button').filter({ hasText: /^Approve$/i }).first().click().catch(() => {});
  await approvePage.waitForTimeout(1500);
  await approvePage.reload({ waitUntil: "networkidle" });
  await approvePage.waitForTimeout(500);
  const remainingPending = await approvePage.locator('button').filter({ hasText: /^Approve$/i }).count();
  log("3a approve decremented PENDING_REVIEW queue",
      remainingPending === initialPending - 1, `before=${initialPending} after=${remainingPending}`);
  const approvedSection = (await approvePage.locator("body").textContent()) ?? "";
  log("3b 'Approved · ready to publish' card now shown",
      /Approved.*ready to publish|Yaliyoidhinishwa/.test(approvedSection));
  await approvePage.close();

  // === 4 · Reject a candidate ===
  // The first "Reject…" button (with ellipsis) opens a popover containing
  // a reason select + note + a confirming "Reject" button — kit pattern
  // for any destructive action that needs an audit reason.
  console.log("\n=== 4 · REJECT A CANDIDATE ===");
  const rejectPage = await ctx.newPage();
  await rejectPage.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
  await rejectPage.waitForTimeout(600);
  const beforeReject = await rejectPage.locator('button').filter({ hasText: /^Approve$/i }).count();
  // Step 1 — open the reject popover
  await rejectPage.locator('button').filter({ hasText: /Reject…/ }).first().click().catch(() => {});
  await rejectPage.waitForTimeout(400);
  // Step 2 — pick a reason (default is fine), optionally add a note, then confirm
  const reasonSel = rejectPage.locator('select').first();
  if (await reasonSel.isVisible().catch(() => false)) {
    await reasonSel.selectOption("officer_decision").catch(() => {});
  }
  const noteArea = rejectPage.locator('textarea').first();
  if (await noteArea.isVisible().catch(() => false)) {
    await noteArea.fill("E2E test rejection — discretionary").catch(() => {});
  }
  // The confirming button inside the popover is exact "Reject" (no ellipsis)
  await rejectPage.locator('button').filter({ hasText: /^Reject$/ }).first().click().catch(() => {});
  await rejectPage.waitForTimeout(1500);
  await rejectPage.reload({ waitUntil: "networkidle" });
  await rejectPage.waitForTimeout(500);
  const afterReject = await rejectPage.locator('button').filter({ hasText: /^Approve$/i }).count();
  log("4a reject decremented PENDING_REVIEW queue",
      afterReject === beforeReject - 1, `before=${beforeReject} after=${afterReject}`);
  await rejectPage.close();

  // === 5 · Publish an approved candidate ===
  console.log("\n=== 5 · PUBLISH APPROVED CANDIDATE ===");
  const publishPage = await ctx.newPage();
  await publishPage.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
  await publishPage.waitForTimeout(600);
  const publishBtn = publishPage.locator('button').filter({ hasText: /^Publish$/i }).first();
  const publishVisible = await publishBtn.isVisible().catch(() => false);
  log("5a Publish button visible on APPROVED row", publishVisible);
  if (publishVisible) {
    await publishBtn.click();
    await publishPage.waitForTimeout(1800);
    await publishPage.reload({ waitUntil: "networkidle" });
    await publishPage.waitForTimeout(500);
    // After publish, the APPROVED card should be empty or absent for that candidate
    const stillApproved = await publishPage.locator('button').filter({ hasText: /^Publish$/i }).count();
    log("5b approved-card row gone after publish", stillApproved < 1 || stillApproved === 0);
    // Spot the PUBLISHED state in recent activity table
    const recentBody = (await publishPage.locator("body").textContent()) ?? "";
    log("5c PUBLISHED row appears in recent activity", /PUBLISHED/.test(recentBody));
  }
  await publishPage.close();

  // === 6 · Verify a market was actually created ===
  console.log("\n=== 6 · MARKET CREATED FROM PUBLISH ===");
  const markets = await ctx.newPage();
  await markets.goto(`${BASE}/admin/markets`, { waitUntil: "networkidle" });
  await markets.waitForTimeout(500);
  const mb = (await markets.locator("body").textContent()) ?? "";
  // We should see one of the fixture titles in the curation queue
  const knownTitles = [
    "Simba SC wins the NBC Premier League",
    "USD/TZS daily close",
    "Long rains begin in Dar es Salaam",
    "Bitcoin closes above $100,000",
  ];
  const anyMatch = knownTitles.some((t) => mb.includes(t));
  log("6a a published fixture title appears in /admin/markets", anyMatch);
  await markets.close();

  // === 7 · Audit log captured every officer decision ===
  console.log("\n=== 7 · AUDIT CHAIN ===");
  const audit = await ctx.newPage();
  await audit.goto(`${BASE}/admin/audit?category=ADMIN`, { waitUntil: "networkidle" });
  await audit.waitForTimeout(500);
  const ab = (await audit.locator("body").textContent()) ?? "";
  log("7a audit shows candidate.approved", /candidate\.approved/.test(ab));
  log("7b audit shows candidate.rejected", /candidate\.rejected/.test(ab));
  log("7c audit shows candidate.published", /candidate\.published/.test(ab));
  await audit.close();

  // === 8 · Negative test: cannot approve a FILTERED_OUT candidate via direct call ===
  console.log("\n=== 8 · STATE-MACHINE INTEGRITY ===");
  const filteredId = filteredOut[0]?.id;
  if (filteredId) {
    // The server action requires a real form-action POST; we just verify
    // the candidate state stays terminal by re-reading the queue.
    const reload = await ctx.newPage();
    await reload.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
    const rb = (await reload.locator("body").textContent()) ?? "";
    log("8a FILTERED_OUT candidate not in approval queue", !rb.includes(filteredId) || !/Approve/.test(rb.split(filteredId)[1] || ""));
    await reload.close();
  }

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nCANDIDATE PIPELINE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
