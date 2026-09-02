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
