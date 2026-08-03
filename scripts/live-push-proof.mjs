/**
 * E-57 · PROVE PUSH END TO END, ON PRODUCTION, WITH A REAL BROWSER.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-push-proof.mjs [fleetIndex]
 *
 * A player opts in, the browser produces a real subscription, and our server stores it.
 * Nothing here is stubbed and nothing is asserted from a unit test — this campaign has
 * been burned repeatedly by suites that pass while the product does nothing (E-40:
 * `UpDownProposal` had 0 rows in the platform's entire history while every test was green).
 *
 * ⚠️ IT MUST RUN HEADED. Measured this session: headless Chromium reports
 * `Notification.permission === "denied"` even after `grantPermissions`, though
 * `PushManager` and `serviceWorker` are both present. The opt-in reads that property, so
 * headless renders "Notifications are blocked in your browser settings" — which photographs
 * exactly like a broken feature and is not one. The same probe headed returns `"granted"`.
 *
 * ⚠️ AND SETTING THE RAILWAY VARIABLE IS NOT ENOUGH. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is
 * inlined into the CLIENT BUNDLE at BUILD time. `railway redeploy` re-runs the EXISTING
 * build, so the browser still has no key and the panel reads "Push isn't available on this
 * deployment yet." Only a rebuild (a push to main) inlines it. This script distinguishes
 * that state from every other one, which is the whole reason it reads the control.
 *
 * ⚠️ It leaves a real `PushSubscription` row behind for a QA-fleet player. That row dies
 * with the fleet (`ops-qa-fleet.mts destroy`), because PushSubscription cascades on User.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const idx = process.argv[2] ?? "05";
const r = { pass: 0, fails: [] };
const ok = (name, cond, detail = "") => {
  if (cond) { r.pass++; console.log(`  ok   ${name}`); }
  else { r.fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const { b, ctx } = await browser({ headless: false, permissions: ["notifications"] });
const page = await ctx.newPage();

try {
  console.log(`\nE-57 push proof · fleet:${idx} · ${BASE}\n`);

  // The browser must actually be able to say yes, or every result below is meaningless.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const env = await page.evaluate(() => ({
    perm: Notification.permission,
    pm: "PushManager" in window,
    sw: "serviceWorker" in navigator,
  }));
  ok("the browser can receive notifications", env.perm === "granted", `permission=${env.perm}`);
  ok("PushManager and serviceWorker exist", env.pm && env.sw, JSON.stringify(env));

  await login(page, `fleet:${idx}`);
  await page.goto(`${BASE}/profile/notifications`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /push/i.test(document.body.innerText), null, { timeout: 45_000 });
  await page.waitForTimeout(2000);

  // ⚠️ THE FIRST-RUN PRIMER MOUNTS OVER EVERY PAGE FOR A NEW ACCOUNT, and every QA-fleet
  // player is a new account. It is `role="dialog" aria-label="50pick primer"`, a 3-step
  // carousel rendered above the content — so the opt-in beneath it is present in the DOM,
  // readable by a text scrape, and NOT CLICKABLE. That reads as a broken control.
  //
  // ⛔ `harness.mjs` deliberately ships no shared `dismissPrimer()`: the last one clicked
  // anything resembling Skip/Got it/Close and dismissed the very confirmation the run then
  // went looking for. So this names the control and SCOPES it to that dialog — "Cancel" is
  // a common name, and the void driver proved today what a page-wide match costs.
  const primer = page.locator('[role="dialog"][aria-label*="primer" i]');
  if (await primer.isVisible().catch(() => false)) {
    console.log("    dismissing the first-run primer, scoped to that dialog");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    if (await primer.isVisible().catch(() => false)) {
      await primer.getByRole("button", { name: /close|cancel|skip|got it|maliza/i }).last().click({ force: true });
      await page.waitForTimeout(600);
    }
    // ⚠️ VERIFY THE DISMISSAL. The first version did `waitFor(hidden).catch(() => {})`,
    // which SWALLOWED the failure — the run carried on with the overlay still up and
    // blamed the toggle for a 30s timeout. A dismissal that is not verified is not one.
    ok("the first-run primer is dismissed", !(await primer.isVisible().catch(() => false)),
       "still mounted over the page — every control beneath it is unclickable");
  }

  const before = await bodyText(page);
  await shot(page, "push-1-optin-before");

  // ⛔ ASSERT THE CONTROL, NOT THE PROSE. Both of this script's original checks were FALSE
  // PASSES, and both reported a working feature on a deployment where push was unavailable:
  //   · "the opt-in is offered" merely excluded the word "unconfigured" — but the real copy
  //     is "Push isn't available on this deployment yet.", which never contains it;
  //   · "push is ON" matched /on\b/, which occurs in "Choose how this device is notified.
  //     You can turn this off any time." A page-wide word match cannot report a state.
  // `PushSettings` renders a kit <Toggle> ONLY when the state is on|off; every other state
  // renders a static span reading N/A. So the PRESENCE of the toggle is the state.
  const optIn = page.locator('[role="switch"], button[aria-label="Push notifications"]');
  const offered = (await optIn.count()) > 0;
  ok("the opt-in control is rendered (state is on|off, not unconfigured/blocked/unsupported)",
     offered,
     `no toggle — panel reads: "${(before.match(/push notifications[^.]*\./) ?? ["?"])[0]}"`);
  if (!offered) throw new Error("no opt-in control to click — stopping rather than reporting a green");

  await optIn.first().click();
  await page.waitForTimeout(6000);
  await shot(page, "push-2-optin-after");

  // The toggle's own state, read off the element. Not a word in the page text.
  const checked = await optIn.first().getAttribute("aria-checked").catch(() => null);
  ok("the toggle reports ON", checked === "true", `aria-checked=${checked}`);

  console.log(`\n    ⛔ THE DOM IS NOT THE PROOF. Pair it:`);
  console.log(`    railway run --service 50pick -- node scripts/live/q.cjs <select count(*) from "PushSubscription">`);
  console.log(`    A toggle that says ON with zero rows stored is a defect, not a pass.`);
} catch (e) {
  r.fails.push(`threw — ${e.message}`);
  console.log(`  FAIL threw — ${e.message}`);
  await shot(page, "push-FAILED");
} finally {
  await b.close();
}

console.log(`\n${r.pass} passed, ${r.fails.length} failed`);
for (const f of r.fails) console.log(`  · ${f}`);
console.log(`shots in ${SHOT}`);
process.exit(r.fails.length ? 1 : 0);
