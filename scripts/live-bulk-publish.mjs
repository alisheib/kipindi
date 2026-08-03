/**
 * LEG B · REVIEW AND PUBLISH — carry AI polls from PENDING_REVIEW to a LIVE MARKET.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-bulk-publish.mjs
 *
 * Driven as the TRADING officer. ⛔ AI never publishes — the officer's approval is the only
 * path to a live market, and this exercises that path as a real operator, not as ADMIN.
 *
 * ⭐ IT REJECTS ONE ON PURPOSE. The reject path is half the queue and gets tested least;
 * a run that only ever approves proves nothing about what happens to the other half.
 *
 * ⛔ NEVER RELOAD WHILE AN ACTION IS IN FLIGHT (E-61, withdrawn). A progress poll that
 * navigates is not an observer, it is a participant: reloading aborted a batch mid-run and
 * cost a wrongly-filed HIGH finding. Wait on the page; read the server's view from the DB
 * in a separate process.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const { b, ctx } = await browser();
const page = await ctx.newPage();
const log = [];

try {
  await login(page, "trading");
  await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /ai poll generation/i.test(document.body.innerText), null, { timeout: 45_000 });
  await page.waitForTimeout(2000);
  await shot(page, "bulkB-1-queue");

  // Rows whose STATE cell reads pending — scoped to the row, never the page. A page-wide
  // /pending/ match would also hit the "PENDING REVIEW" KPI tile above the table.
  const rows = page.locator("tr").filter({ hasText: /pending/i });
  const n = await rows.count();
  console.log(`\nLEG B · ${n} row(s) in PENDING_REVIEW\n`);
  if (!n) { console.log("nothing to review — generate first"); process.exit(0); }

  // Decide up front: approve all but the last, reject the last. Deterministic, so the
  // run is repeatable and the intent is legible in the log.
  for (let i = 0; i < n; i++) {
    // Re-query each iteration: acting on a row re-renders the table and stale handles
    // silently point at nothing.
    const row = page.locator("tr").filter({ hasText: /pending/i }).first();
    if (!(await row.count())) break;

    const title = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 90);
    const action = i === n - 1 ? "reject" : "approve";
    console.log(`  ${action.toUpperCase().padEnd(7)} ${title}`);

    // ⚠️ "View" is a BUTTON on some rows and a LINK on others — ask for it by name across
    // both roles rather than assuming a tag. Guessing one cost a 30s timeout on a table
    // that was rendering perfectly.
    const view = row.getByRole("button", { name: /view/i }).or(row.getByRole("link", { name: /view/i })).first();
    await view.click({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    await shot(page, `bulkB-2-detail-${i}`);

    if (action === "approve") {
      await page.getByRole("button", { name: /^approve$/i }).first().click();
    } else {
      await page.getByRole("button", { name: /^reject/i }).first().click();
      await page.waitForTimeout(1200);
      // A reject asks for a reason — fill whatever field the dialog offers.
      const reason = page.locator('textarea, input[type="text"]').last();
      if (await reason.isVisible().catch(() => false)) {
        await reason.fill("QA bulk run — deliberately rejected to exercise the reject path.");
      }
      const confirm = page.locator('[role="dialog"], [role="alertdialog"]')
        .getByRole("button", { name: /reject|confirm/i }).last();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      else await page.getByRole("button", { name: /^reject$/i }).last().click().catch(() => {});
    }
    await page.waitForTimeout(4000);
    log.push(`${action}: ${title}`);
    await shot(page, `bulkB-3-after-${i}`);

    // Return to the queue WITHOUT reloading mid-action — the action has settled by now.
    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => /ai poll generation/i.test(document.body.innerText), null, { timeout: 45_000 });
    await page.waitForTimeout(1500);
  }

  const txt = await bodyText(page);
  console.log(`\n  approved/awaiting publish visible: ${/approved/.test(txt)}`);
  await shot(page, "bulkB-4-final");
  console.log(`\n  ⛔ Pair this against AIPoll.state in the DB before believing it.`);
  for (const l of log) console.log(`  · ${l}`);
} catch (e) {
  console.log(`FAILED — ${e.message}`);
  await shot(page, "bulkB-FAILED");
  process.exitCode = 1;
} finally {
  await b.close();
}
console.log(`shots in ${SHOT}`);
