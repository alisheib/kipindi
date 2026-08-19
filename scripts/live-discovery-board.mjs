/**
 * Does the board's GRID render a page of the set its bar promised?
 *
 * ⛔ This has to be a browser, not a regex over the response body. React streams the Suspense
 * boundary, so the byte order of the HTML is not the DOM order: on production, of the fifteen
 * market questions on the page, six land before the "recently resolved" strip's bytes and nine
 * after it — a regex slice reads 6 where the DOM holds 12. A count taken from streamed bytes is
 * not a measurement of what a player sees.
 *
 * Run: npm run qa:discovery-board -- [baseUrl]        (default http://localhost:3009)
 *      npm run qa:discovery-board -- https://50pick.tz   — read-only, safe against production
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || "http://localhost:3009";
const PAGE_SIZE = 12;

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  PASS ${label}`);
  else { console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function read(qs = "") {
  await page.goto(`${BASE}/markets${qs}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const grid = document.querySelector('[data-board="grid"]');
    const bar = document.querySelector("[data-result-count]");
    return {
      cards: grid ? grid.querySelectorAll("h3.mcardp-q").length : -1,
      promised: bar ? Number(bar.getAttribute("data-result-count")) : NaN,
      // Everything on the page, so the resolved strip is visibly excluded from `cards`.
      allQuestions: document.querySelectorAll("h3.mcardp-q").length,
      barHeight: Math.round(document.querySelector(".kp-discovery-bar")?.getBoundingClientRect().height ?? -1),
    };
  });
}

console.log(`\ncounting cards in the DOM at ${BASE}\n`);

for (const [label, qs] of [
  ["default board", ""],
  ["pool=50k", "?pool=50k"],
  ["status=all", "?status=all"],
  ["odds=cont", "?odds=cont"],
  ["page 2", "?page=2"],
]) {
  const r = await read(qs);
  /**
   * ⚠️ `?page=2` CLAMPS, IT DOES NOT EMPTY. `markets/page.tsx:233` takes
   * `safePage = Math.min(pageNum, totalPages)` deliberately — the same "a hand-edited URL still
   * renders a board, never a 500 and never an empty one" contract `qa:discovery-probe` asserts
   * for junk params.
   * 🔴 This expectation used to read `promised - PAGE_SIZE` unconditionally, so on a board with
   * only one page it demanded an EMPTY grid from a product that was behaving correctly. It went
   * green for as long as production happened to hold more than a page, which is not the same
   * thing as being true — and it fails the moment the book shrinks or a filter narrows it.
   */
  const lastPage = Math.max(1, Math.ceil(r.promised / PAGE_SIZE));
  const expected = qs === "?page=2" && lastPage >= 2
    ? Math.min(PAGE_SIZE, r.promised - PAGE_SIZE)
    : Math.min(r.promised, PAGE_SIZE);
  ok(`${label}: grid draws ${r.cards}, promised ${r.promised} → expected ${expected}`,
    r.cards === expected, `all questions on page = ${r.allQuestions}`);
}

/**
 * The sticky bar's height budget on a phone, in the two languages that break it.
 *
 * 🔴 This block used to set a cookie named `locale`, which the product does not read — so it
 * measured ENGLISH while reporting "in Swahili", and English is the easy case (Swahili short
 * labels run 1.74× p90 / 2.25× p95 longer). Both languages are measured now, and `assertLang`
 * refuses to report a number taken in the wrong one. See `scripts/qa-locale.mjs`.
 *
 * ⭐ THE CEILING IS 120px SINCE BATCH 6, not the 260 it held before. The history in one line:
 * **448px** when the rows wrapped → **214px** with scrolling strips and stacked groups →
 * **under 120** now the four groups live behind one `Filters` button. ⛔ Do not relax this back
 * toward 260 to make a change fit: the number is the whole point of the batch, and a sticky bar
 * eating a third of the viewport is what a player experiences as "there are no markets here".
 */
const BAR_CEILING_PX = 120;
for (const loc of ["sw", "zh"]) {
  const m = await localisedContext(browser, { locale: loc, width: 360, height: 780, baseUrl: BASE });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await assertLang(mp, loc);
  await mp.waitForTimeout(300);
  const h = await mp.evaluate(() => Math.round(document.querySelector(".kp-discovery-bar")?.getBoundingClientRect().height ?? -1));
  ok(`[${loc}] the sticky bar fits the batch-6 budget (${h}px < ${BAR_CEILING_PX})`,
    h > 0 && h < BAR_CEILING_PX, `${h}px — 448 when the rows wrapped, 214 when the groups stacked`);
  await m.close();
}

/**
 * 🔴 A CONTROL THAT OPENS INTO A 4-PIXEL SLIVER IS NOT A CONTROL — found on production
 * 2026-08-13, after the bar had been signed off.
 *
 * The sort and topic menus are `<details>` whose listbox is absolutely positioned. They sat inside
 * the row that scrolls horizontally below `lg`, and CSS coerces `overflow-y: visible` to `auto` as
 * soon as one axis scrolls — so a 274px sort panel and a 362px topic panel were clipped by a 62px
 * strip to **4px, or 1%**. Zero of six sort options and zero of eight topics could be reached at
 * 360px, on the width most of this audience uses.
 *
 * ⛔ NOTHING CAUGHT IT. The page had no horizontal overflow, every tap target measured 44px, no
 * element overflowed its own box, and a screenshot of a CLOSED menu looks perfect. The defect only
 * exists once the control is opened, so the check has to open it.
 *
 * ⚠️ BATCH 6 MOVED THE WIDTH, NOT THE RULE. The two menus are the DESKTOP layout now, so they are
 * opened at 1280 — where the defect would look different but is no less possible. The phone's
 * equivalent control is the sheet, and it gets the same treatment in the block below. ⛔ Opening a
 * control at a width that no longer renders it would have been the easiest possible way to turn
 * this guard into a green light over nothing.
 */
{
  const m = await localisedContext(browser, { locale: "sw", width: 1280, height: 900, baseUrl: BASE });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await assertLang(mp, "sw");
  await mp.waitForTimeout(300);

  const summaries = mp.locator(".kp-discovery-bar details.kp-menu > summary");
  const count = await summaries.count();
  // Refuse to pass on an absent premise: no menus found means the selector rotted, not that the
  // menus are fine (50pick-standards §5b rule 5).
  ok(`the bar still has its two menu controls (found ${count})`, count === 2, "selector may have rotted");

  for (let i = 0; i < count; i++) {
    await summaries.nth(i).scrollIntoViewIfNeeded();
    await summaries.nth(i).click();
    await mp.waitForTimeout(250);
    const r = await mp.evaluate((idx) => {
      const det = [...document.querySelectorAll(".kp-discovery-bar details.kp-menu")][idx];
      const panel = det.querySelector('[role="listbox"]');
      const pb = panel.getBoundingClientRect();
      let node = panel.parentElement, box = null;
      while (node && node !== document.body) {
        const st = getComputedStyle(node);
        if (["auto", "scroll", "hidden", "clip"].includes(st.overflowX) || ["auto", "scroll", "hidden", "clip"].includes(st.overflowY)) {
          box = node.getBoundingClientRect();
          break;
        }
        node = node.parentElement;
      }
      const visible = box ? Math.max(0, Math.min(pb.bottom, box.bottom) - Math.max(pb.top, box.top)) : pb.height;
      return {
        label: det.querySelector("summary")?.innerText.replace(/\s+/g, " ").trim().slice(0, 24),
        options: panel.querySelectorAll('[role="option"]').length,
        panelH: Math.round(pb.height),
        visibleH: Math.round(visible),
      };
    }, i);
    const pct = r.panelH ? Math.round((r.visibleH / r.panelH) * 100) : 0;
    ok(
      `[1280 sw] the "${r.label}" menu opens fully — ${r.options} options, ${r.visibleH}/${r.panelH}px visible (${pct}%)`,
      r.options > 0 && pct >= 90,
      `${pct}% visible — it was 1% when the menu sat inside the horizontally scrolling strip`,
    );
    await mp.keyboard.press("Escape");
    await mp.waitForTimeout(120);
  }
  await m.close();
}

/**
 * ⭐ THE PHONE'S WHOLE FILTER SURFACE — batch 6. At 360 the four groups are behind one button, so
 * everything the block above proves about the desktop menus has to be proved here about the sheet.
 * A closed sheet photographs perfectly; so did a 4px listbox.
 *
 * Driven in Swahili on purpose: it is the language the bar has broken in twice.
 */
for (const loc of ["sw", "zh"]) {
  const m = await localisedContext(browser, { locale: loc, width: 360, height: 780, baseUrl: BASE });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  await assertLang(mp, loc);
  await mp.waitForTimeout(300);

  const trigger = mp.locator(".kp-discovery-bar .kp-fsheet > summary");
  const triggers = await trigger.count();
  // Refuse on an absent premise — no trigger means the selector rotted or the sheet is gone, and
  // either way the assertions below would pass over nothing.
  ok(`[360 ${loc}] the bar exposes exactly one Filters trigger (found ${triggers})`, triggers === 1);
  if (triggers !== 1) { await m.close(); continue; }

  /**
   * ⭐ EXACTLY ONE MENU AT PHONE WIDTH, AND IT IS SORT. The kit keeps sort and status in the bar
   * at every width — *"they answer the first two questions a punter has and must never cost a
   * tap"* (COMPONENTS §21) — while odds, pool and topic move into the sheet. So topic's menu is
   * desktop-only and sort's is not.
   * ⛔ TWO would mean the desktop row is rendering beside the sheet: two live copies of one
   * control on one screen, and every count on the page twice.
   */
  const menusVisible = await mp.evaluate(() =>
    [...document.querySelectorAll(".kp-discovery-bar details.kp-menu > summary")]
      .filter((el) => el.checkVisibility()).length);
  ok(`[360 ${loc}] exactly one menu renders at phone width — sort (${menusVisible} visible)`,
    menusVisible === 1, "2 would mean the desktop groups are rendering beside the sheet");

  /**
   * 🔴 AND SORT'S PANEL STILL HAS TO OPEN AT 360. It is back in the bar at this width, so the
   * §8.7c rule applies to it here: a 274px listbox clipped to 4px by a scrolling ancestor was
   * the defect, and a screenshot of the closed control could not show it. The row this menu
   * sits in WRAPS rather than scrolling, which is what makes it safe — but "is what makes it
   * safe" is a claim, and this is the measurement.
   */
  {
    const sortSummary = mp.locator(".kp-discovery-bar details.kp-menu > summary").first();
    await sortSummary.click();
    await mp.waitForTimeout(260);
    const m = await mp.evaluate(() => {
      const det = document.querySelector(".kp-discovery-bar details.kp-menu");
      const panel = det?.querySelector('[role="listbox"]');
      if (!panel) return null;
      const pb = panel.getBoundingClientRect();
      let node = panel.parentElement, box = null;
      while (node && node !== document.body) {
        const st = getComputedStyle(node);
        if (["auto", "scroll", "hidden", "clip"].includes(st.overflowX) || ["auto", "scroll", "hidden", "clip"].includes(st.overflowY)) { box = node.getBoundingClientRect(); break; }
        node = node.parentElement;
      }
      const vis = box ? Math.max(0, Math.min(pb.bottom, box.bottom) - Math.max(pb.top, box.top)) : pb.height;
      return { options: panel.querySelectorAll('[role="option"]').length, panelH: Math.round(pb.height), visibleH: Math.round(vis) };
    });
    const pctSort = m && m.panelH ? Math.round((m.visibleH / m.panelH) * 100) : 0;
    ok(`[360 ${loc}] the sort menu opens fully in the bar — ${m?.options} options, ${pctSort}% visible`,
      !!m && m.options === 6 && pctSort >= 90,
      `${pctSort}% — it was 1% when the menu sat inside the horizontally scrolling strip`);
    await mp.keyboard.press("Escape");
    await mp.waitForTimeout(150);
  }

  await trigger.click();
  /**
   * ⛔ WAIT FOR THE RISE TO FINISH, DO NOT GUESS AT IT. Measured with a flat 300ms timeout this
   * read **608/640px (95%)** — the panel was still mid-`m-sheet-in`, so the instrument was
   * reporting a keyframe as a layout. A magic number that happens to land after an animation is
   * a number that stops landing the moment the animation changes, and it would have been filed
   * as a 5% clipping defect in the product. Await the animations the element actually has.
   */
  await mp.evaluate(async () => {
    const panel = document.querySelector(".kp-fsheet-panel");
    if (!panel) return;
    await Promise.all(panel.getAnimations().map((a) => a.finished.catch(() => {})));
  });
  await mp.waitForTimeout(120);

  const s = await mp.evaluate(() => {
    const panel = document.querySelector(".kp-fsheet-panel");
    if (!panel) return null;
    const pb = panel.getBoundingClientRect();
    const visible = Math.max(0, Math.min(pb.bottom, innerHeight) - Math.max(pb.top, 0));
    const body = panel.querySelector(".kp-fsheet-body");
    const opts = [...panel.querySelectorAll('[role="option"]')];
    // ⚠️ THE LAST CONTROL IS A CHIP, NOT AN OPTION. Every control in the sheet is a `.kp-fchip`
    //    (COMPONENTS §21); `role="option"` belongs to the DESKTOP menus. Probing for an option
    //    here found nothing and reported "not reachable" over a sheet that was fine — a check
    //    that fails when the product is correct is as broken as one that passes when it is not.
    const chips = [...panel.querySelectorAll(".kp-fchip")];
    // Scroll the body to its end and re-read the LAST control: a group below the fold is
    // reachable, which is the honest difference between "scrolls" and "clipped".
    if (body) body.scrollTop = body.scrollHeight;
    const last = chips[chips.length - 1]?.getBoundingClientRect();
    const scrim = document.querySelector(".kp-fsheet-scrim");
    const sb = scrim?.getBoundingClientRect();
    return {
      panelH: Math.round(pb.height),
      visibleH: Math.round(visible),
      top: Math.round(pb.top),
      bottom: Math.round(pb.bottom),
      vh: innerHeight,
      groups: panel.querySelectorAll(".kp-fsheet-grp").length,
      chips: panel.querySelectorAll(".kp-fchip").length,
      options: opts.length,
      scrimCovers: !!sb && sb.top <= 0 && sb.bottom >= innerHeight - 1 && sb.left <= 0 && sb.right >= innerWidth - 1,
      lastReachable: !!last && last.height > 0 && last.bottom <= pb.bottom + 1 && last.top >= pb.top - 1,
      barZ: getComputedStyle(document.querySelector(".kp-discovery-bar")).zIndex,
    };
  });

  const pct = s && s.panelH ? Math.round((s.visibleH / s.panelH) * 100) : 0;
  /**
   * 🔴 A RATIO IS NOT THE THING THIS MEANS, AND THE FIRST VERSION OF THIS CHECK PROVED IT.
   * "≥90% visible" passed at **95%** over a sheet whose heading was cut off the top of the
   * screen (`top: -32`) and whose bottom floated **172px clear of the window** — because
   * `.route-enter` retains a `both`-filled transform and became the containing block for
   * `position: fixed`. The sheet was visibly broken and the number looked fine.
   * ⭐ So assert the two facts that ARE the requirement: it docks to the bottom of the WINDOW,
   * and none of it is above the top of the window. The ratio is kept as reported detail.
   */
  ok(`[360 ${loc}] the sheet docks to the bottom of the window (bottom ${s?.bottom} of ${s?.vh})`,
    !!s && Math.abs(s.bottom - s.vh) <= 1,
    "it read 608 of 780 when .route-enter's retained transform captured `position: fixed`");
  ok(`[360 ${loc}] …and none of it is off the top of the window (top ${s?.top})`,
    !!s && s.top >= 0, "it read -32 — the grab handle and heading were above the screen");
  ok(`[360 ${loc}] the sheet is wholly inside the viewport — ${s?.visibleH}/${s?.panelH}px (${pct}%)`,
    !!s && pct >= 99, `${pct}% — a control clipped to 1% is what this surface shipped in batch 1`);
  /* ⭐ THREE GROUPS — odds, pool, topic — which is exactly what COMPONENTS §21 lists, and every
     one of them is a PILL. `options` must be ZERO: a `role="option"` in here would mean a menu
     had been nested inside the scrolling sheet, which is §8.7c's defect wearing a new name. */
  ok(`[360 ${loc}] the sheet holds the kit's three groups (${s?.groups} groups, ${s?.chips} chips, ${s?.options} options)`,
    !!s && s.groups === 3 && s.chips >= 7 + 1 && s.options === 0,
    "odds 4 + pool 3 + topics ≥1, all chips; zero listbox options (a nested menu would clip)");
  // ⛔ A SCRIM THAT DOES NOT COVER THE WINDOW IS NOT A SCRIM. Trapped in `.route-enter` it left
  //    the top bar and the area below the wrapper live and tappable, on a dialog claiming
  //    `aria-modal="true"` — the modal was a lie in exactly the region a thumb rests.
  ok(`[360 ${loc}] the scrim covers the whole window`, !!s?.scrimCovers);
  ok(`[360 ${loc}] the last option is reachable by scrolling the body, not clipped away from it`,
    !!s?.lastReachable);
  // 🔴 The bar is z-20 and the bottom nav z-40: without the lift the sheet opens UNDER the nav.
  ok(`[360 ${loc}] the bar is lifted above the bottom nav while open (z-index ${s?.barZ})`,
    Number(s?.barZ) >= 40, "z-40 is the bottom nav; anything at or below it puts the sheet underneath");

  // Escape closes it AND focus returns to the trigger — the shared <Modal>'s contract, proven
  // rather than asserted from the source.
  await mp.keyboard.press("Escape");
  await mp.waitForTimeout(200);
  const after = await mp.evaluate(() => ({
    open: !!document.querySelector(".kp-fsheet[open]"),
    focusIsTrigger: document.activeElement?.tagName.toLowerCase() === "summary",
  }));
  ok(`[360 ${loc}] Escape closes the sheet`, !after.open);
  ok(`[360 ${loc}] …and focus returns to the trigger that opened it`, after.focusIsTrigger);

  await m.close();
}

/**
 * ⭐ THE SHEET'S MARKUP IS NATIVELY OPERABLE — and the page around it, today, is not.
 *
 * Batch 1 chose scrolling strips over the kit's sheet *because* the strips need no JavaScript,
 * on a board a player reaches on a mid-range Android over a Tanzanian mobile connection.
 * `discovery-bar.tsx` and `menu-shell.tsx` have both said so in prose since. Batch 6 kept the
 * promise in the markup — a `<details>` disclosure whose every control is a real `<a href>`.
 *
 * 🔴 BUT THE PREMISE OF THAT TRADE DOES NOT HOLD, AND HAS NOT SINCE THE BOARD WAS BUILT.
 * Measured 2026-08-15 with JavaScript disabled, on **production** as well as locally: the board
 * streams through a Suspense boundary, and React only relocates streamed content out of its
 * hidden holder with an inline `<script>`. With scripts off, that never runs — so
 * `.kp-discovery-bar` measures **0px tall inside a `display: none` `div#S:3`**, with the cards
 * present in `<template>` elements and nothing on screen. It is not the sheet: it is every
 * control on the board, and it was equally true of the strips batch 1 preferred.
 *
 * ⛔ SO THIS BLOCK ASSERTS THE MARKUP AND *REPORTS* THE PAGE. Asserting "the sheet opens with no
 * JS" would fail forever for a reason no filter change can fix; asserting nothing would let the
 * claim keep being repeated. The numbers below are printed so the finding cannot go quiet.
 */
{
  // The markup, straight off the wire — no browser, so nothing can be relocated or hydrated.
  const html = await (await fetch(`${BASE}/markets`)).text();
  ok("[no-JS] the sheet ships as a native <details> disclosure",
    /<details[^>]*class="[^"]*kp-fsheet/.test(html), "a JS-driven panel could not open without it");
  /* ⚠️ ANCHORED ON `topic:`, WHICH EXISTS ONLY INSIDE THE SHEET — the desktop row renders topic
     as a menu, so these controls cannot be confused with its odds/pool chips. And the tag is
     matched whole rather than assuming an attribute ORDER: React's serialisation order is not a
     contract, and the first version of this check required `href` before `data-chip` and read 0
     over markup that was entirely correct. */
  const topicTags = [...html.matchAll(/<a\b[^>]*\bdata-chip="topic:[^"]*"[^>]*>/g)].map((m) => m[0]);
  const withHref = topicTags.filter((t) => /\bhref="\/markets(\?[^"]*)?"/.test(t)).length;
  ok(`[no-JS] every control inside it is a real link that navigates (${withHref}/${topicTags.length})`,
    topicTags.length >= 8 && withHref === topicTags.length,
    "a control that needs JavaScript to apply a filter is not reachable on this audience's phone");

  // And what a scripts-off browser actually sees of the board, reported rather than asserted.
  const ctxNoJs = await browser.newContext({ viewport: { width: 360, height: 780 }, javaScriptEnabled: false });
  const np = await ctxNoJs.newPage();
  await np.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await np.waitForTimeout(1200);
  const seen = await np.evaluate(() => {
    const bar = document.querySelector(".kp-discovery-bar");
    let hidden = null;
    let n = bar?.parentElement;
    while (n && n !== document.documentElement) {
      if (getComputedStyle(n).display === "none") { hidden = n.tagName.toLowerCase() + (n.id ? `#${n.id}` : ""); break; }
      n = n.parentElement;
    }
    return { barH: bar ? Math.round(bar.getBoundingClientRect().height) : -1, hidden, templates: document.querySelectorAll("template").length };
  });
  console.log(
    seen.barH > 0
      ? `  NOTE [no-JS] the board renders without scripts — bar ${seen.barH}px`
      : `  ⚠️ NOTE [no-JS] the board does NOT render without scripts — bar ${seen.barH}px, hidden inside ${seen.hidden}, ${seen.templates} streamed <template>s. PRE-EXISTING and page-wide (Suspense streaming), not a filter defect — but it means "works with no JavaScript" is false about this page today.`,
  );
  await ctxNoJs.close();
}

await browser.close();
console.log(fail === 0 ? "\n✅ the grid draws what the bar promised\n" : `\n❌ ${fail} failure(s)\n`);
process.exit(fail === 0 ? 0 : 1);
