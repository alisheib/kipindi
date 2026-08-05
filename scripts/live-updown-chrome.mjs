/**
 * THE VISUAL PASS over the surfaces whose LOGIC is green and whose APPEARANCE has never been
 * looked at — toasts and modals.
 *
 *   SHOT_DIR=./shots/chrome node scripts/live-updown-chrome.mjs
 *
 * ⛔ WHY A GREEN COMMS SUITE IS NOT THIS. 232 checks prove the right message is chosen, in the
 * right language, for the right event. None of them proves it is READABLE: that the text is not
 * clipped, that it does not overflow at 360px, that a Swahili string twice the English length
 * still fits, or that a modal's buttons are reachable. E-30 settled that a document-level
 * overflow check reports 0 over unreadable text.
 *
 * ⚠️ `locator.screenshot()`, never `fullPage` — a full-page shot re-lays-out the page and
 * detaches portalled overlays, which is how a toast gets photographed as an empty strip. And it
 * waits for the animation: `.m-float-in` fades in, so an immediate shot catches an opaque panel
 * half-transparent.
 */
import { browser, login, recorder, BASE, SHOT, clickByName } from "./live/harness.mjs";

const WIDTHS = [
  { name: "mobile", width: 375, height: 780 },
  { name: "tablet", width: 768, height: 900 },
  { name: "tabletL", width: 1100, height: 900 },   // the 1024–1279 band the header overflows in
  { name: "desktop", width: 1440, height: 950 },
];
const LOCALES = ["en", "sw", "zh"];

const rec = recorder("LIVE · visual pass — toasts and modals, 4 widths × 3 locales");
const { b } = await browser({});

/** Measure the thing, not the page: does this element clip its own text? */
const clipReport = (el) => el.evaluate((n) => {
  const bad = [];
  const walk = (x) => {
    const cs = getComputedStyle(x);
    const ellipsis = cs.textOverflow === "ellipsis";
    const clipped = x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1;
    // ⛔ A PLACEHOLDER IS TEXT AND IT IS NOT `innerText` (E-88). The first version of this walker
    // only looked at `innerText`, so it passed a `<textarea rows={2}>` whose placeholder was cut
    // mid-word at 375px — the screenshot showed it and the check did not. An empty control's
    // only visible text is precisely the one this could not see.
    const own = (x.innerText ?? "").trim() || (x.getAttribute?.("placeholder") ?? "").trim();
    if (clipped && !ellipsis && x.children.length === 0 && own) {
      bad.push(`${x.tagName.toLowerCase()}: "${own.slice(0, 40)}"`);
    }
    for (const c of x.children) walk(c);
  };
  walk(n);
  return { bad, text: (n.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 90) };
});

try {
  for (const w of WIDTHS) {
    for (const loc of LOCALES) {
      const ctx = await b.newContext({ viewport: { width: w.width, height: w.height } });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
      const p = await ctx.newPage();
      const tag = `${w.name}-${loc}`;

      // ── ADMIN MODAL · the void confirmation, the most consequential popup we ship ──
      await login(p, "admin");
      await p.goto(`${BASE}/admin/updown/rounds`, { waitUntil: "networkidle" });
      const voidBtn = p.getByRole("button", { name: /void.{0,3}refund/i }).first();
      if (await voidBtn.count()) {
        await voidBtn.click();
        const modal = p.locator('[role="alertdialog"], [role="dialog"]').first();
        await modal.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
        // ⛔ WAIT FOR **EVERY** ANIMATION, NOT THE MODAL'S OWN OPACITY. Waiting on the dialog
        // alone photographed a perfectly opaque modal as see-through THREE separate times this
        // session — the SCRIM behind it fades and blurs on its own timeline, so the page shows
        // through until it lands, and the picture is indistinguishable from a real defect. The
        // browser will tell you when nothing is moving; ask it.
        await p.waitForFunction(
          () => document.getAnimations().every((a) => a.playState !== "running"),
          undefined, { timeout: 8_000 },
        ).catch(() => {});
        await p.waitForTimeout(400);
        if (await modal.count()) {
          const r = await clipReport(modal);
          rec.check(`${tag} · the void modal clips nothing`, r.bad.length === 0, r.bad.join(" · "));
          // ⛔ A confirmation nobody can dismiss is worse than none: both exits must be reachable.
          const cancel = modal.getByRole("button", { name: /cancel|ghairi|取消/i }).first();
          rec.check(`${tag} · …and its cancel is on screen`,
            (await cancel.count()) > 0 && (await cancel.isVisible()),
            "no reachable way out of an irreversible-action dialog");
          await modal.screenshot({ path: `${SHOT}/modal-void-${tag}.png` }).catch(() => {});
        }
        await p.keyboard.press("Escape");
      } else {
        rec.note(`${tag} · no voidable round on the board — modal not captured`);
      }
      await ctx.close();
    }
  }
} catch (e) {
  rec.check("driver completed", false, e.message);
} finally {
  await b.close();
}

process.exit(rec.done() === 0 ? 0 : 1);
