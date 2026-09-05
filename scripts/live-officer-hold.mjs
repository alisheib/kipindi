#!/usr/bin/env node
/**
 * qa:officer-hold — READ the new settlement controls on the live deploy.
 *
 * ⛔ THIS DRIVE DELIBERATELY MOVES NO MONEY AND HOLDS NOTHING. `/admin/settlement` lists REAL
 * markets carrying REAL pools, and pressing "Hold payout" on production would freeze a real
 * player's payout to take a photograph. So the drive opens the confirm dialog, reads it, and
 * CANCELS. The service is proven by `test:settlement-gate` §14 and `red:officer-hold` 10/10;
 * what only a browser can answer is whether the control renders, says the right thing, and
 * fits — which is exactly what this reads.
 *
 * ⭐ WHY IT ASSERTS THE SENTENCE AND NOT JUST THE BUTTON. The one thing an officer must know
 * before pressing is that they will NOT be able to release it themselves. A control that
 * renders perfectly and omits that sentence is the failure this is looking for.
 *
 *   ADMIN=1 node scripts/live-officer-hold.mjs
 */
import { BASE, browser, login, shot, recorder } from "./live/harness.mjs";

const rec = recorder("LIVE · OFFICER HOLD + SEAL NOTICE");
const WIDTHS = [360, 768, 1280];

const { b, ctx } = await browser();
try {
  const page = await ctx.newPage();
  await login(page, "admin");

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE}/admin/settlement`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(600);

    // ── the control exists at every width ──
    const holds = page.locator('button:has-text("Hold payout")');
    const n = await holds.count();
    rec.check(`${w}: the Hold payout control renders`, n > 0, `${n} on screen`);

    // ⛔ NOTHING MAY SCROLL SIDEWAYS. The control was added into an existing action cell.
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec.check(`${w}: no horizontal overflow`, over <= 1, `scrollWidth-clientWidth=${over}`);

    if (n > 0) {
      const box = await holds.first().boundingBox();

      // ⚠️ THE FIRST VERSION OF THIS CHECK ASSERTED "inside the VIEWPORT" AND WAS WRONG, and
      // the correction is worth keeping because the number looked damning. It reported
      // `x=770` at 360 and 768 and read as a control shipped off the right edge. Measured:
      // the admin table sits in a `.scrollx overflow-x-auto` container whose scrollWidth is
      // 869 against a 318px client — it is a HORIZONTAL SCROLLER by design, the Action column
      // is its last column, and the document itself overflows by 0. The pre-existing "Settle
      // now" button occupies the very same cell.
      //
      // ⛔ So the honest measure for a scrollable table is REACHABILITY WITHIN ITS OWN
      // CONTAINER, not the viewport. Asserting the viewport here would demand a redesign of a
      // shared admin table on the strength of a mis-aimed check — the "true measurement over
      // the wrong population" failure.
      const reach = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((el) => el.textContent.trim().startsWith("Hold payout"));
        if (!btn) return null;
        const sc = btn.closest(".scrollx, .overflow-x-auto");
        if (!sc) return { scrolled: false, within: true, note: "not inside a scroller" };
        const b = btn.getBoundingClientRect(), s = sc.getBoundingClientRect();
        return {
          scrolled: sc.scrollWidth > sc.clientWidth + 1,
          // Left edge of the button relative to the container's full scrollable width.
          within: (b.x - s.x + sc.scrollLeft) + b.width <= sc.scrollWidth + 1,
          scrollW: sc.scrollWidth, clientW: sc.clientWidth,
        };
      });
      rec.check(`${w}: the trigger is reachable inside the table's own scroller`,
        !!reach && reach.within, JSON.stringify(reach));
      // ⚠️ Stated, not asserted: at narrow widths the Action column needs a sideways scroll.
      // That is pre-existing table behaviour (Settle now shares the cell), not this change.
      if (reach && reach.scrolled && w < 1024) {
        rec.note(`${w}: the action column requires a sideways scroll of the table (scrollW ${reach.scrollW} vs client ${reach.clientW}) — pre-existing, shared with "Settle now"`);
      }
      // A money-adjacent control must clear the tap floor.
      rec.check(`${w}: the trigger clears the 40px tap floor`, !!box && box.height >= 40,
        box ? `${Math.round(box.height)}px` : "no box");
    }
    await shot(page, `officer-hold-${w}`);
  }

  // ── the confirm, read at the narrowest width, then CANCELLED ──
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${BASE}/admin/settlement`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main", { timeout: 45_000 });
  const trigger = page.locator('button:has-text("Hold payout")').first();
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(700);
    const dlg = page.locator('[role="alertdialog"]');
    rec.check("the confirm opens", (await dlg.count()) > 0);
    const text = (await dlg.first().innerText().catch(() => "")) || "";

    // ⭐ THE SENTENCE THAT MATTERS MOST — separation of duties, said BEFORE the act.
    rec.check("it says the officer cannot release it themselves",
      /will not be able to release it yourself/i.test(text), text.slice(0, 160));
    rec.check("it says the freeze stops every payout",
      /no winner is paid/i.test(text), text.slice(0, 160));
    rec.check("it names the reason control", /reason/i.test(text));
    // ⛔ It must NOT state the window as a number of hours — that number lives in one place.
    rec.check("it states no objection-window hour count",
      !/\b\d+\s*-?\s*hours?\b/i.test(text), text.slice(0, 200));

    // The primary action starts DISABLED: a hold with no written case is refused by the
    // service anyway, and a button that looks available when it is not is the defect.
    const submit = dlg.locator('button:has-text("Hold payout")').last();
    rec.check("the confirm's own button starts disabled (no case written yet)",
      await submit.isDisabled().catch(() => false));

    await shot(page, "officer-hold-confirm-360");

    // ⛔ CANCEL. Nothing on production is held by a screenshot run.
    await dlg.locator('button:has-text("Cancel")').first().click();
    await page.waitForTimeout(400);
    rec.check("the confirm closes on Cancel, holding nothing",
      (await page.locator('[role="alertdialog"]').count()) === 0);
  } else {
    // An empty queue is a legitimate production state and must not read as a pass.
    rec.check("SKIPPED · the settlement queue is empty, so the confirm was not reachable", false,
      "re-run when a market is awaiting settlement — this is UNVERIFIED, not green");
  }
} finally {
  await ctx.close();
  await b.close();
}
const failed = rec.done();
process.exit(failed ? 1 : 0);
