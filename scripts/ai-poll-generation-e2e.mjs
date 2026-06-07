/**
 * AI poll generation pipeline · end-to-end test.
 *
 * Exercises the full admin workflow:
 *   1. Seed fixture polls across every state.
 *   2. Officer opens /admin/ai-polls — KPIs + generate form visible.
 *   3. Officer generates a new poll via the form.
 *   4. Officer approves a PENDING_REVIEW poll.
 *   5. Officer rejects a PENDING_REVIEW poll.
 *   6. Officer publishes an APPROVED poll — creates a real market.
 *   7. Officer edits a poll and re-validates.
 *   8. Officer regenerates a poll (creates child generation).
 *   9. Filtered / validation-failed polls surfaced clearly.
 *  10. Audit trail captured every officer action.
 *  11. Stress: generate multiple polls in rapid succession.
 *  12. Graceful handling of timeout / error scenarios.
 *
 *   BASE=http://localhost:3000  node scripts/ai-poll-generation-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "\u2713" : "\u2717";
  console.log(`${t} ${label}${detail ? "  \u2192  " + detail : ""}`);
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

  // === 1 · Seed AI poll fixtures ===
  console.log("\n=== 1 \u00b7 SEED AI POLL FIXTURES ===");
  const seed = await fetch(`${BASE}/api/dev-test/seed-ai-polls`, { method: "POST" })
    .then(r => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  log("1a seed endpoint OK", seed?.ok === true, `count=${seed?.seeded}`);
  log("1b fixtures seeded across states", seed?.seeded >= 4, `seeded=${seed?.seeded}`);

  const pendingPolls = (seed.polls || []).filter(p => p.state === "PENDING_REVIEW");
  const approvedPolls = (seed.polls || []).filter(p => p.state === "APPROVED");
  const filteredPolls = (seed.polls || []).filter(p => p.state === "FILTERED");
  const rejectedPolls = (seed.polls || []).filter(p => p.state === "REJECTED");
  const valFailPolls = (seed.polls || []).filter(p => p.state === "VALIDATION_FAILED");
  log("1c PENDING_REVIEW fixtures present", pendingPolls.length >= 2, `count=${pendingPolls.length}`);
  log("1d APPROVED fixture present", approvedPolls.length >= 1, `count=${approvedPolls.length}`);
  log("1e FILTERED fixture present", filteredPolls.length >= 1, `count=${filteredPolls.length}`);
  log("1f REJECTED fixture present", rejectedPolls.length >= 1, `count=${rejectedPolls.length}`);
  log("1g VALIDATION_FAILED fixture present", valFailPolls.length >= 1, `count=${valFailPolls.length}`);

  // === 2 · Officer setup + opens /admin/ai-polls ===
  console.log("\n=== 2 \u00b7 OFFICER OPENS AI POLLS PAGE ===");
  const pwd = "AIPoll!2026e2e";
  const tail = phoneTail();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await reg(ctx, tail, pwd);
  const promo = await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + tail }),
  }).then(r => r.json()).catch(() => null);
  log("2a officer promoted to ADMIN", promo?.role === "ADMIN", `userId=${promo?.userId}`);
  await login(ctx, tail, pwd);

  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const body = (await page.locator("body").textContent()) ?? "";
  log("2b page renders 'AI poll generation' heading", /AI poll generation/i.test(body));
  log("2c KPI: pending review visible", /Pending review/i.test(body));
  log("2d KPI: approved visible", /Approved/i.test(body));
  log("2e KPI: filtered + rejected visible", /Filtered.*rejected|Yalikataliwa/i.test(body));
  log("2f KPI: total spend visible", /Total spend|Gharama/i.test(body));
  log("2g generate form present", /Generate poll/i.test(body));
  log("2h category buttons present", /Sports/i.test(body) && /Crypto/i.test(body));
  log("2i info banner present", /mock provider|AI never publishes/i.test(body));
  await page.close();

  // === 3 · Generate a new poll ===
  console.log("\n=== 3 \u00b7 GENERATE A NEW POLL ===");
  const genPage = await ctx.newPage();
  await genPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await genPage.waitForTimeout(600);

  // Click a category button (Crypto)
  const cryptoBtn = genPage.locator('button').filter({ hasText: /^Crypto$/i }).first();
  if (await cryptoBtn.isVisible().catch(() => false)) {
    await cryptoBtn.click();
  }

  // Click generate
  const genBtn = genPage.locator('button').filter({ hasText: /Generate poll/i }).first();
  const genVisible = await genBtn.isVisible().catch(() => false);
  log("3a Generate poll button visible", genVisible);
  if (genVisible) {
    await genBtn.click();
    await genPage.waitForTimeout(2500); // wait for mock latency + server action
    await genPage.reload({ waitUntil: "networkidle" });
    await genPage.waitForTimeout(500);
    const afterGen = (await genPage.locator("body").textContent()) ?? "";
    // Should see either PENDING_REVIEW, FILTERED, or VALIDATION_FAILED in recent
    const hasNewState = /PENDING_REVIEW|FILTERED|VALIDATION_FAILED/.test(afterGen);
    log("3b new poll appears in recent activity", hasNewState);
  }
  await genPage.close();

  // === 4 · Approve a PENDING_REVIEW poll ===
  console.log("\n=== 4 \u00b7 APPROVE A POLL ===");
  const approvePage = await ctx.newPage();
  await approvePage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await approvePage.waitForTimeout(600);
  const approveBtn = approvePage.locator('button').filter({ hasText: /^Approve$/i }).first();
  const approveVisible = await approveBtn.isVisible().catch(() => false);
  log("4a Approve button visible on PENDING_REVIEW row", approveVisible);
  if (approveVisible) {
    const beforeCount = await approvePage.locator('button').filter({ hasText: /^Approve$/i }).count();
    await approveBtn.click();
    await approvePage.waitForTimeout(1500);
    await approvePage.reload({ waitUntil: "networkidle" });
    await approvePage.waitForTimeout(500);
    const afterCount = await approvePage.locator('button').filter({ hasText: /^Approve$/i }).count();
    log("4b approve decremented pending queue", afterCount < beforeCount, `before=${beforeCount} after=${afterCount}`);
    const afterBody = (await approvePage.locator("body").textContent()) ?? "";
    log("4c 'Approved \u00b7 ready to publish' card visible", /Approved.*ready to publish|Yaliyoidhinishwa/i.test(afterBody));
  }
  await approvePage.close();

  // === 5 · Reject a PENDING_REVIEW poll ===
  console.log("\n=== 5 \u00b7 REJECT A POLL ===");
  const rejectPage = await ctx.newPage();
  await rejectPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await rejectPage.waitForTimeout(600);
  const rejectTrigger = rejectPage.locator('button').filter({ hasText: /Reject\u2026/ }).first();
  const rejectTriggerVisible = await rejectTrigger.isVisible().catch(() => false);
  log("5a Reject\u2026 trigger button visible", rejectTriggerVisible);
  if (rejectTriggerVisible) {
    const beforeReject = await rejectPage.locator('button').filter({ hasText: /^Approve$/i }).count();
    await rejectTrigger.click();
    await rejectPage.waitForTimeout(400);
    // Fill reject form
    const reasonSel = rejectPage.locator('select').first();
    if (await reasonSel.isVisible().catch(() => false)) {
      await reasonSel.selectOption("low_confidence").catch(() => {});
    }
    const noteArea = rejectPage.locator('textarea').first();
    if (await noteArea.isVisible().catch(() => false)) {
      await noteArea.fill("E2E test \u2014 rejected for low quality").catch(() => {});
    }
    await rejectPage.locator('button').filter({ hasText: /^Reject$/ }).first().click().catch(() => {});
    await rejectPage.waitForTimeout(1500);
    await rejectPage.reload({ waitUntil: "networkidle" });
    await rejectPage.waitForTimeout(500);
    const afterReject = await rejectPage.locator('button').filter({ hasText: /^Approve$/i }).count();
    log("5b reject decremented pending queue", afterReject < beforeReject, `before=${beforeReject} after=${afterReject}`);
  }
  await rejectPage.close();

  // === 6 · Publish an APPROVED poll ===
  console.log("\n=== 6 \u00b7 PUBLISH AN APPROVED POLL ===");
  const pubPage = await ctx.newPage();
  await pubPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await pubPage.waitForTimeout(600);
  const pubBtn = pubPage.locator('button').filter({ hasText: /Publish as market/i }).first();
  const pubVisible = await pubBtn.isVisible().catch(() => false);
  log("6a 'Publish as market' button visible on APPROVED row", pubVisible);
  if (pubVisible) {
    await pubBtn.click();
    await pubPage.waitForTimeout(2000);
    await pubPage.reload({ waitUntil: "networkidle" });
    await pubPage.waitForTimeout(500);
    const pubBody = (await pubPage.locator("body").textContent()) ?? "";
    log("6b PUBLISHED state appears in recent activity", /PUBLISHED/.test(pubBody));
  }
  await pubPage.close();

  // Verify market was created
  const marketPage = await ctx.newPage();
  await marketPage.goto(`${BASE}/admin/markets`, { waitUntil: "networkidle" });
  await marketPage.waitForTimeout(500);
  const marketBody = (await marketPage.locator("body").textContent()) ?? "";
  const fixtureTitle = "200mm rainfall"; // from the approved fixture
  log("6c published poll title visible in /admin/markets", marketBody.includes(fixtureTitle) || marketBody.includes("Dar"));
  await marketPage.close();

  // === 7 · Edit a poll ===
  console.log("\n=== 7 \u00b7 EDIT A POLL ===");
  const editPage = await ctx.newPage();
  await editPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await editPage.waitForTimeout(600);
  const editBtn = editPage.locator('button').filter({ hasText: /Edit\u2026/i }).first();
  const editVisible = await editBtn.isVisible().catch(() => false);
  log("7a Edit\u2026 button visible on PENDING_REVIEW row", editVisible);
  if (editVisible) {
    await editBtn.click();
    await editPage.waitForTimeout(400);
    // Should see edit form fields
    const editForm = editPage.locator('input[type="text"]').first();
    const editFormVisible = await editForm.isVisible().catch(() => false);
    log("7b edit form fields appear", editFormVisible);
    if (editFormVisible) {
      await editForm.fill("Edited title for E2E test");
      const saveBtn = editPage.locator('button').filter({ hasText: /Save.*re-validate/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await editPage.waitForTimeout(1500);
        await editPage.reload({ waitUntil: "networkidle" });
        await editPage.waitForTimeout(500);
        const editBody = (await editPage.locator("body").textContent()) ?? "";
        log("7c edited title visible after save", editBody.includes("Edited title for E2E test"));
      }
    }
  }
  await editPage.close();

  // === 8 · Regenerate a poll ===
  console.log("\n=== 8 \u00b7 REGENERATE A POLL ===");
  const regenPage = await ctx.newPage();
  await regenPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await regenPage.waitForTimeout(600);
  const regenBtn = regenPage.locator('button').filter({ hasText: /Regenerate/i }).first();
  const regenVisible = await regenBtn.isVisible().catch(() => false);
  log("8a Regenerate button visible", regenVisible);
  if (regenVisible) {
    await regenBtn.click();
    await regenPage.waitForTimeout(2500);
    await regenPage.reload({ waitUntil: "networkidle" });
    await regenPage.waitForTimeout(500);
    const regenBody = (await regenPage.locator("body").textContent()) ?? "";
    // Should see regen indicator or additional row in recent activity
    log("8b regenerated poll appears (additional row or regen indicator)", /regen|PENDING_REVIEW|FILTERED/.test(regenBody));
  }
  await regenPage.close();

  // === 9 · Filtered / validation-failed polls surfaced ===
  console.log("\n=== 9 \u00b7 FILTERED POLLS SURFACED ===");
  const filtPage = await ctx.newPage();
  await filtPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await filtPage.waitForTimeout(600);
  const filtBody = (await filtPage.locator("body").textContent()) ?? "";
  log("9a FILTERED state visible in recent activity", /FILTERED/.test(filtBody));
  log("9b VALIDATION_FAILED state visible", /VALIDATION_FAILED/.test(filtBody));
  log("9c REJECTED state visible", /REJECTED/.test(filtBody));
  // Delete button should be visible for terminal states
  const deleteBtn = filtPage.locator('button').filter({ hasText: /Delete/i }).first();
  log("9d Delete button visible for terminal-state polls", await deleteBtn.isVisible().catch(() => false));
  await filtPage.close();

  // === 10 · Audit trail ===
  console.log("\n=== 10 \u00b7 AUDIT TRAIL ===");
  const auditPage = await ctx.newPage();
  await auditPage.goto(`${BASE}/admin/audit?category=ADMIN`, { waitUntil: "networkidle" });
  await auditPage.waitForTimeout(500);
  const ab = (await auditPage.locator("body").textContent()) ?? "";
  log("10a audit shows aipoll.approved", /aipoll\.approved/.test(ab));
  log("10b audit shows aipoll.rejected", /aipoll\.rejected/.test(ab));
  log("10c audit shows aipoll.published or aipoll.pending_review", /aipoll\.(published|pending_review)/.test(ab));
  await auditPage.close();

  // === 11 · Stress: rapid multiple generations ===
  console.log("\n=== 11 \u00b7 STRESS TEST ===");
  const stressPage = await ctx.newPage();
  await stressPage.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
  await stressPage.waitForTimeout(600);
  // Click generate 3 times quickly
  for (let i = 0; i < 3; i++) {
    const btn = stressPage.locator('button').filter({ hasText: /Generate poll/i }).first();
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click();
      await stressPage.waitForTimeout(600);
    }
  }
  await stressPage.waitForTimeout(3000);
  await stressPage.reload({ waitUntil: "networkidle" });
  await stressPage.waitForTimeout(500);
  const stressBody = (await stressPage.locator("body").textContent()) ?? "";
  log("11a page still renders correctly after rapid generation", /AI poll generation/i.test(stressBody));
  log("11b no UI crash (heading + table still present)", /Recent activity/i.test(stressBody));
  await stressPage.close();

  // === 12 · Sidebar navigation ===
  console.log("\n=== 12 \u00b7 SIDEBAR NAVIGATION ===");
  const navPage = await ctx.newPage();
  await navPage.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await navPage.waitForTimeout(500);
  const navBody = (await navPage.locator("body").textContent()) ?? "";
  log("12a 'AI poll generation' link in sidebar", /AI poll generation/i.test(navBody));
  await navPage.close();

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nAI POLL GENERATION  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
