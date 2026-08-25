/**
 * `E-218` LIVE — share and Details are two controls, and both are still clickable.
 *
 *   npm run qa:card-share-glow
 *
 * ⛔ THE HIT AREA IS PROVABLE ONLY BY `elementFromPoint`, AND THAT IS NOT A PREFERENCE.
 * `.mcardp-share` reaches 40px through an out-of-flow `::after` so the 17px footer row never
 * grows — which means a bounding-box measurement correctly reports 17px whether the control
 * is reachable or not. This control has already shipped once *visible, named, translated and
 * UNCLICKABLE*, and the only instrument that saw it was hit-testing. So the run below asks the
 * page **what is actually at these coordinates**.
 *
 * ⭐ AND IT HIT-TESTS BOTH CONTROLS, NOT JUST THE ONE THAT CHANGED. The two failure modes are
 * mirror images — share's `::after` covering Details, or Details' covering share — and a driver
 * that only checked the control it just edited would be blind to the half it caused.
 *
 * ⚠️ THE HOVER COLOUR IS READ FROM THE RENDERED ELEMENT, not from the stylesheet.
 * `test:card-share` §6 already compares the resolved token values in the source; that is a
 * different claim from *"the browser paints them differently"*, and only one of them is what a
 * player sees. Both are worth having and neither substitutes for the other.
 */
import { BASE, loginOnce, browser, recorder } from "./live/harness.mjs";
import { mkdirSync } from "node:fs";
mkdirSync(".qa-design-geometry/shots", { recursive: true });

const r = recorder(`E-218 · the share glow and both hit areas, on ${BASE}`);
const { b, ctx: boot } = await browser({});
await boot.close();

try {
  for (const w of [360, 1280]) {
    const ctx = await b.newContext({ storageState: await loginOnce(b, "alpha"), viewport: { width: w, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(3_000);

      // ── The row must still be 17px ──────────────────────────────────────────
      const row = await page.evaluate(() => {
        const share = document.querySelector(".mcardp-share");
        if (!share) return null;
        const rowEl = share.parentElement;
        return {
          rowH: Math.round(rowEl.getBoundingClientRect().height),
          cardH: Math.round(share.closest(".mcardp").getBoundingClientRect().height),
        };
      });
      r.check(`@${w}: the footer row is still 17px`, row?.rowH === 17, `${row?.rowH}px`);
      // ⚠️ NOT `cardH === 349`. That assertion was here for one run and failed at 360 on a
      // correct card: the first card measured 322px. `MARKET_CARD_H = 349` is the height the
      // /markets SKELETONS RESERVE, not a height every card has — the baseline census reads
      // `heights=[278,322,349]` on this very surface, because a card with no pool and a card
      // with a dial are different shapes. ⛔ Asserting a constant over a population that was
      // never uniform is measuring the wrong thing, and it would have gone red on every future
      // run for no reason. The claim that geometry did not MOVE belongs to `qa:card-geometry`,
      // which diffs the whole height set before and after; this driver owns the 17px row.
      r.note(`@${w} first card ${row?.cardH}px (heights vary by card: 278/322/349 — 349 is the skeleton's reserve, see qa:card-geometry)`);

      // ── ⭐ HIT-TEST BOTH CONTROLS, at their own centres ────────────────────
      const hit = await page.evaluate(() => {
        const share = document.querySelector(".mcardp-share");
        const details = share?.parentElement?.querySelector(".mcardp-details");
        const at = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          const node = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
          if (!node) return "nothing";
          // Walk up: the glyph inside the button is a legitimate hit for the button.
          const owner = node.closest(".mcardp-share") ? "share"
            : node.closest(".mcardp-details") ? "details"
            : `${node.tagName.toLowerCase()}.${(node.className || "").toString().slice(0, 40)}`;
          return owner;
        };
        return { atShare: at(share), atDetails: at(details), hasDetails: !!details };
      });
      r.check(`@${w}: ⭐ the point at share's centre belongs to SHARE`, hit.atShare === "share", String(hit.atShare));
      r.check(`@${w}: ⭐ the point at Details' centre belongs to DETAILS`,
        !hit.hasDetails || hit.atDetails === "details", String(hit.atDetails));

      // ── The two controls paint different colours on hover ──────────────────
      const paint = await page.evaluate(async () => {
        const share = document.querySelector(".mcardp-share");
        const details = share?.parentElement?.querySelector(".mcardp-details");
        if (!share || !details) return null;
        const detailsColour = getComputedStyle(details).color;
        const shareResting = getComputedStyle(share).color;
        share.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        share.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        await new Promise((res) => setTimeout(res, 300));
        return { detailsColour, shareResting, shareHoverFilter: getComputedStyle(share).filter };
      });
      r.check(`@${w}: share at rest is not Details' colour`,
        paint && paint.shareResting !== paint.detailsColour,
        `share=${paint?.shareResting} details=${paint?.detailsColour}`);
      r.note(`@${w} details=${paint?.detailsColour} · share(rest)=${paint?.shareResting} · share filter=${paint?.shareHoverFilter}`);

      // ⚠️ A REAL hover, driven by the mouse, because CSS `:hover` does not respond to a
      // synthesised event — a dispatched `mouseover` moves no cursor and matches no selector.
      await page.locator(".mcardp-share").first().hover();
      await page.waitForTimeout(400);
      const hovered = await page.evaluate(() => {
        const share = document.querySelector(".mcardp-share");
        const details = share?.parentElement?.querySelector(".mcardp-details");
        return {
          share: getComputedStyle(share).color,
          filter: getComputedStyle(share).filter,
          details: getComputedStyle(details).color,
          rowH: Math.round(share.parentElement.getBoundingClientRect().height),
        };
      });
      r.check(`@${w}: 🔴 ON HOVER share is a DIFFERENT colour from Details`,
        hovered.share !== hovered.details, `share=${hovered.share} details=${hovered.details}`);
      r.check(`@${w}: ⭐ …and it carries a real glow`,
        /drop-shadow/.test(hovered.filter), hovered.filter);
      r.check(`@${w}: ⛔ …and the row did NOT grow while hovered`, hovered.rowH === 17, `${hovered.rowH}px`);
      await page.screenshot({ path: `.qa-design-geometry/shots/share-hover-${w}.png`, timeout: 15_000 }).catch(() => {});

      // ── ⭐ THE CONTROLLED TEST: does the glow add ANY height? ────────────────
      //
      // 🔴 AND IT EXISTS BECAUSE `qa:card-geometry` CANNOT ANSWER THIS ON A LIVE BOARD.
      // That probe diffs production against a baseline file, so its "MOVED" verdict conflates
      // *"the CSS changed the layout"* with *"the board changed between the two runs"* — and
      // on the run that shipped this change it reported real movement whose cause was DATA:
      // the landing's height set went `[322,349,356] → [322,356]`, i.e. a card of one shape
      // stopped existing. ⛔ A true measurement over a population that moved underneath you is
      // still the wrong measurement, and "the geometry probe went red" would have been an
      // honest-looking reason to revert a change that was innocent.
      //
      // ⭐ So measure the SAME DOM twice inside ONE page load, with the hover styles forced on
      // for every share control at once. Data drift cannot enter: nothing reloads. If the glow
      // could raise the 17px row — and therefore `MARKET_CARD_H`, and therefore geometry on
      // /markets, /live, /watchlist and the landing — this is where it would show.
      const before = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".mcardp")].filter((c) => c.getBoundingClientRect().height > 0);
        const rows = [...document.querySelectorAll(".mcardp-share")].map((x) => Math.round(x.parentElement.getBoundingClientRect().height));
        return { heights: [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().height)))].sort((a, z) => a - z),
                 rows: [...new Set(rows)].sort((a, z) => a - z), doc: document.body.scrollHeight };
      });
      await page.addStyleTag({ content: ".mcardp-share { color: var(--text) !important; filter: drop-shadow(0 0 5px color-mix(in oklab, var(--royal-300) 55%, transparent)) !important; }" });
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".mcardp")].filter((c) => c.getBoundingClientRect().height > 0);
        const rows = [...document.querySelectorAll(".mcardp-share")].map((x) => Math.round(x.parentElement.getBoundingClientRect().height));
        return { heights: [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().height)))].sort((a, z) => a - z),
                 rows: [...new Set(rows)].sort((a, z) => a - z), doc: document.body.scrollHeight };
      });
      r.check(`@${w}: ⭐ CONTROLLED — the glow forced on EVERY card moves nothing`,
        JSON.stringify(before) === JSON.stringify(after),
        `rows ${before.rows.join(",")}→${after.rows.join(",")} · heights ${before.heights.join(",")}→${after.heights.join(",")} · doc ${before.doc}→${after.doc}`);
      // ⚠️ The control for the control: if the style tag did not apply, the comparison above
      // would be two identical measurements of an unchanged page and could not fail.
      const applied = await page.evaluate(() => /drop-shadow/.test(getComputedStyle(document.querySelector(".mcardp-share")).filter));
      r.check(`@${w}: ⚠️ …and the forced style really applied (or the check above proves nothing)`, applied);
    } finally { await ctx.close(); }
  }
} catch (e) {
  r.check("driver completed", false, String(e.message ?? e).slice(0, 250));
} finally { await b.close(); }

process.exit(r.done() === 0 ? 0 : 1);
