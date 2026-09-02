/**
 * `npm run qa:pending-bar` — DRIVE THE PENDING-CHANGES BAR ON PRODUCTION.
 *                                                    (ADMIN-TABS-2026-09-01, §K rule 7d)
 *
 * ⭐ IT IS WRITTEN TO DISCRIMINATE, not to confirm. Three of its four assertions FAIL on the
 * most likely wrong implementations rather than on nothing:
 *
 *   ① THE BAR IS ANCHORED TO THE WINDOW, NOT THE PAGE. This is the whole reason it portals.
 *      `.route-enter` keeps a `transform` for ever, and a transformed ancestor is the containing
 *      block for every `position: fixed` descendant — so a NON-portaled bar renders at the
 *      bottom of a 4,000px PAGE and scrolls out of sight, while still reporting `position:
 *      fixed` and looking perfect in a screenshot of the top of the page. The check is
 *      geometric: its bottom edge must sit at the VIEWPORT's bottom edge, measured AFTER
 *      scrolling the page, so a page-anchored bar cannot pass by accident.
 *   ② IT DOES NOT COVER CONTENT. A fixed bar hides whatever is beneath it, and the admin body
 *      reserves no bottom padding — so the spacer is asserted by measuring that the page's last
 *      card ends ABOVE the bar's top edge when scrolled to the bottom.
 *   ③ IT APPEARS ONLY WHEN DIRTY, AND STOPS WHEN THE EDIT IS UNDONE. Typing a value and then
 *      typing it BACK must clear the bar — the property that separates a snapshot-and-compare
 *      from a `touched` flag, which would warn for ever after the first keystroke.
 *   ④ IT IS ANNOUNCED. `role="status"` + `aria-live="polite"` — important, not an emergency.
 *
 * ⛔ SAFE BY CONSTRUCTION: it types into a field and then RESTORES the original value. It never
 * submits, never clicks Save, and never touches a control that moves money.
 *
 *   ROUTE=/admin/config FIELD=commissionRate npm run qa:pending-bar
 *   ⚠️ On Git Bash prefix MSYS_NO_PATHCONV=1 or a leading-slash ROUTE is rewritten to a path.
 */
import { chromium } from "playwright";
import { login, BASE } from "../live/harness.mjs";

const ROUTE = process.env.ROUTE || "/admin/config";
const FIELD = process.env.FIELD || "commissionRate";
/** ⭐ A SECOND FIELD IN A DIFFERENT FORM ON THE SAME PAGE — assertion ⑥ needs two independently
 *  dirty forms, which is the shape the two-stacked-bars defect lived in. */
const FIELD_B = process.env.FIELD_B || "";
const WIDTHS = (process.env.W ? [Number(process.env.W)] : [1440, 390]).map((w) => ({ w, h: w === 390 ? 844 : 900 }));

const browser = await chromium.launch();
let bad = 0;

for (const { w, h } of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  await login(page, "admin");
  await page.goto(BASE + ROUTE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  console.log(`\n${ROUTE}  @${w}×${h}`);

  const field = page.locator(`[name="${FIELD}"]`).first();
  if (!(await field.count())) { console.log(`  🔴 no [name="${FIELD}"] on this page — nothing to dirty`); bad++; await ctx.close(); continue; }

  const original = await field.inputValue();
  const before = await page.evaluate(() => !!document.querySelector('[role="status"].kp-rail'));
  console.log(`  clean page          bar present: ${before ? "🔴 yes (it should not be)" : "✓ no"}`);
  if (before) bad++;

  // ── dirty it ──────────────────────────────────────────────────────────────
  await field.fill(String(Number(original || 0) + 1));
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    const bar = document.querySelector('[role="status"].kp-rail');
    if (!bar) return null;
    window.scrollTo(0, document.body.scrollHeight);
    const r = bar.getBoundingClientRect();
    const cards = [...document.querySelectorAll(".glass-panel")];
    const lastBottom = cards.length ? Math.max(...cards.map((c) => c.getBoundingClientRect().bottom)) : null;
    return {
      live: bar.getAttribute("aria-live"),
      barTop: Math.round(r.top), barBottom: Math.round(r.bottom),
      viewportH: window.innerHeight,
      lastCardBottom: lastBottom === null ? null : Math.round(lastBottom),
      portaled: bar.closest("main") === null,
    };
  });

  if (!m) { console.log("  🔴 the bar did NOT appear after an edit"); bad++; await ctx.close(); continue; }

  /* ① anchored to the WINDOW. Allow 2px for fractional layout; a page-anchored bar is off by
     hundreds, never by two. */
  const anchored = Math.abs(m.barBottom - m.viewportH) <= 2;
  console.log(`  ① window-anchored   bar bottom ${m.barBottom} vs viewport ${m.viewportH}  ${anchored ? "✓" : "🔴 PAGE-ANCHORED — the portal is not working"}`);
  if (!anchored) bad++;

  console.log(`  · portaled out of <main>: ${m.portaled ? "✓" : "🔴 no"}`);
  if (!m.portaled) bad++;

  /* ② does not cover content */
  const clear = m.lastCardBottom === null || m.lastCardBottom <= m.barTop + 2;
  console.log(`  ② content clear     last card ends ${m.lastCardBottom} · bar top ${m.barTop}  ${clear ? "✓" : "🔴 THE BAR COVERS THE LAST CARD — the spacer is not reserving its height"}`);
  if (!clear) bad++;

  /* ④ announced */
  const announced = m.live === "polite";
  console.log(`  ④ announced         aria-live="${m.live}"  ${announced ? "✓" : "🔴 expected polite"}`);
  if (!announced) bad++;

  /* ── ⑤ A TAB SWITCH IS AN EXIT (§K rule 7d) ────────────────────────────────
     ⛔ THIS IS THE ASSERTION THE RAIL MAKES NECESSARY. A `?tab=` option is an `<a href>`, so
     the guard's in-app-link interception should already cover it — but "should already" is
     exactly the kind of claim this programme does not accept without driving it. With the form
     dirty, clicking another section must OPEN THE KIT DIALOG and must NOT navigate. */
  const rail = page.locator("[data-section-rail] a[href]");
  const railCount = await rail.count();
  if (railCount > 1) {
    const urlBefore = page.url();
    // the first option that is not the current one
    let clicked = false;
    for (let i = 0; i < railCount; i++) {
      const a = rail.nth(i);
      if ((await a.getAttribute("aria-current")) === "page") continue;
      await a.click({ trial: false }).catch(() => {});
      clicked = true;
      break;
    }
    if (clicked) {
      await page.waitForTimeout(900);
      const dialog = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
        return d ? (d.textContent || "").slice(0, 90) : null;
      });
      const moved = page.url() !== urlBefore;
      const held = !!dialog && !moved;
      console.log(`  ⑤ tab is an EXIT   dialog:${dialog ? "opened" : "none"} · navigated:${moved ? "YES" : "no"}  ${held ? "✓" : "🔴 the tab switch discarded the edit silently"}`);
      if (!held) bad++;
      // Dismiss: stay on this page, so the field can be restored below.
      const stay = page.getByRole("button", { name: /Stay on this page/i }).first();
      if (await stay.count()) { await stay.click().catch(() => {}); await page.waitForTimeout(500); }
    }
  } else {
    console.log("  ⑤ tab is an EXIT   · no section rail on this route — not applicable");
  }

  /* ── ⑥ TWO DIRTY FORMS, ONE BAR (the singleton) ────────────────────────────
     ⛔ THE ASSERTION THAT CAUGHT A DEFECT IN THE FIX ITSELF. Every bar is `fixed inset-x-0
     bottom-0`, so two dirty forms on one page painted two bars IN THE SAME PIXELS — and both
     wrote `document.body.style.paddingBottom`, so the page reserved the height of ONE while TWO
     were painted and the lower one covered the content the reserve exists to protect. It is
     reachable on this very route: `/admin/ai-usage` renders CreditControls and AiOpsControls
     side by side. This counts the bars in the DOM — a count, not a screenshot, because two
     bars at identical coordinates look exactly like one. */
  if (FIELD_B) {
    const second = page.locator(`[name="${FIELD_B}"]`).first();
    if (!(await second.count())) {
      console.log(`  ⑥ one bar only     · no [name="${FIELD_B}"] on this page — not applicable`);
    } else {
      // The field may be a <select>; choosing a different option is its edit.
      const tag = await second.evaluate((el) => el.tagName);
      if (tag === "SELECT") {
        const picked = await second.evaluate((el) => {
          const opts = [...el.options].map((o) => o.value);
          return opts.find((v) => v !== el.value) ?? null;
        });
        if (picked) await second.selectOption(picked);
      } else {
        await second.fill(`${await second.inputValue()}1`);
      }
      await page.waitForTimeout(700);
      const m2 = await page.evaluate(() => {
        const bars = document.querySelectorAll('[role="status"].kp-rail');
        return { count: bars.length, text: bars.length ? (bars[0].textContent || "") : "" };
      });
      const single = m2.count === 1;
      const counted = /\+\s*\d+\s+more unsaved/i.test(m2.text);
      console.log(`  ⑥ one bar only      bars in DOM ${m2.count} · says "+N more": ${counted ? "yes" : "no"}  ${single && counted ? "✓" : "🔴 TWO BARS STACKED, or the others are not counted"}`);
      if (!single || !counted) bad++;
    }
  }

  // ── ③ undo the edit — the bar must go ─────────────────────────────────────
  await field.fill(original);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => !!document.querySelector('[role="status"].kp-rail'));
  console.log(`  ③ typed back        bar present: ${after ? "🔴 yes — this is a `touched` flag, not a comparison" : "✓ no"}`);
  if (after) bad++;

  await ctx.close();
}

await browser.close();
console.log(`\n${bad === 0 ? "✅ the pending-changes bar is window-anchored, clears content, announces itself, and tracks a real comparison." : `🔴 ${bad} assertion(s) failed.`}`);
process.exit(bad ? 1 : 0);
