/**
 * ONE AUDITED SAVE — correct the live `support_config` phone to the owner's ruled form.
 *
 *   npm run ops:support-phone-save          # reports only, changes nothing
 *   APPLY=1 npm run ops:support-phone-save  # performs the save
 *
 * ⭐ WHY A DRIVE AND NOT SQL. `AuditLog` is an append-only HMAC chain: a raw
 * `UPDATE "SystemConfig"` leaves NO audit row, and a value that moved with no record
 * reads as tampering to whoever audits it later. This goes through the real form, so the
 * real server action runs, the real validation runs, and the change is chained.
 *
 * WHAT IT CHANGES: `phone` → `0769777877` (Ali's ruling 2026-09-10 — the local form a
 * Tanzanian reads and dials). `phoneTel` is DERIVED by `toDialTarget()` and stays E.164
 * `+255769777877`, so a tap still works from abroad — two facts, deliberately, which is
 * what row 4.3 built the split for.
 *
 * ⭐ AND IT DROPS TWO DEAD KEYS AS A SIDE EFFECT, which is half the point. The live row
 * still carries `helpline`/`helplineTel` holding 50pick's OWN desk number. They are inert
 * today only because `migrate()` is an allowlist that copies the three fields it owns —
 * but the module's own comment names the residual risk: *"a later set() would write them
 * out again."* The form full-replaces the JSON with `{email, phone, phoneTel}`, so a save
 * removes them permanently rather than relying on a read-time filter for ever.
 *
 * ⛔ ONE LIVE SESSION PER ACCOUNT. Signing in here REVOKES whoever else holds the ADMIN
 * account. Announce before running.
 */
import { browser, login, BASE } from "../harness.mjs";

const APPLY = process.env.APPLY === "1";
const WANT_PHONE = "0769777877";

const { b, ctx } = await browser();
const page = await ctx.newPage();
let failed = 0;
const say = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

try {
  // ⚠️ 30s IS NOT ENOUGH FOR `networkidle` ON THIS SITE. The harness's `login()` waits for
  // network idle on purpose — PhoneInput mirrors into a hidden input on React's onChange,
  // and filling it before hydration posts a blank identifier that reads as a wrong
  // password. But the live ticker holds a connection open, so idle arrives late and the
  // default 30s navigation timeout fires first. That looks like the site being down and
  // is not.
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  await login(page, "admin");
  await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });

  const before = await page.locator('input[name="phone"]').inputValue();
  const emailBefore = await page.locator('input[name="email"]').inputValue();
  console.log(`\n  BEFORE  phone=${JSON.stringify(before)}  email=${JSON.stringify(emailBefore)}`);

  if (before === WANT_PHONE) {
    say(true, `already ${WANT_PHONE} — nothing to do`);
  } else if (!APPLY) {
    console.log(`\n  DRY RUN — would set phone to ${WANT_PHONE}. Re-run with APPLY=1.\n`);
  } else {
    await page.fill('input[name="phone"]', WANT_PHONE);
    // The derived dial target is rendered as a live preview; read it BEFORE saving so the
    // value that is about to be stored is observed rather than assumed.
    const preview = await page.locator("body").innerText();
    const dial = (preview.match(/\+255\d{9}/) ?? [])[0] ?? "(not shown)";
    console.log(`  derived dial target on screen: ${dial}`);

    // ⛔ SCOPED TO THE FORM THAT OWNS THE FIELD, NOT `.first()`. /admin/system renders
    // SEVERAL cards, each with its own Save whose `disabled={!changed}` is keyed to its
    // OWN input. A page-wide `getByRole("button", {name:/save/i}).first()` grabbed a
    // different card's button, which was correctly disabled because nothing in that card
    // had changed — and Playwright then retried for 30s against an element that was never
    // going to enable. It reads as a broken save on a form that is fine. Same `.first()`
    // shape the harness already documents for the sign-in pill.
    const cfgForm = page.locator('form:has(input[name="phone"])');
    await cfgForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(4000);

    // ⛔ READ THE ROW BACK, do not trust the toast. Unit 3 exists because a save that
    // never landed looked exactly like one that did — green toast, mutated screen,
    // nothing persisted. A fresh navigation re-reads from the row.
    await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
    const after = await page.locator('input[name="phone"]').inputValue();
    console.log(`  AFTER   phone=${JSON.stringify(after)}`);
    say(after === WANT_PHONE, `the ROW now holds ${WANT_PHONE} (read back after a reload, not from the toast)`);
    say(emailBefore === (await page.locator('input[name="email"]').inputValue()),
      "the email was not disturbed by the save");
  }
} catch (e) {
  console.log(`\n  FAIL drive error: ${e.message}`);
  failed++;
} finally {
  await b.close();
}

console.log(`\nsupport-phone-save — ${failed ? `${failed} FAILED` : "ok"}\n`);
process.exit(failed ? 1 : 0);
