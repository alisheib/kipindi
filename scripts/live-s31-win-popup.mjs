/**
 * THE UP & DOWN WIN MOMENT, PHOTOGRAPHED IN ALL THREE LANGUAGES AT TWO WIDTHS.
 *
 *   SHOT_DIR=.qa-s31 node scripts/live-s31-win-popup.mjs
 *
 * ⚠️ WHAT THIS PROVES, AND WHAT IT DOES NOT — say it out loud rather than let a picture imply
 * more than it earned. It fires the REAL `50pick:celebrate` event that `UpDownResultAnnouncer`
 * fires, at the REAL `WinCelebrationHost` mounted in `AppShell`, on a REAL production page as a
 * signed-in player. So it is honest evidence about **layout, copy and theme in SW and ZH**,
 * which is the open gap. ⛔ It is NOT end-to-end proof of the WIRING — that a settled round
 * reaches the announcer at all. That was already proven live in EN (`shots/E105/`, 9/9) by
 * watching a real round settle, and it cannot be re-proven by dispatching an event.
 *
 * ⛔ TWO TIMING TRAPS, BOTH ALREADY PAID FOR:
 *  · the payout is a ROLLING COUNTER over ~900ms — session 30 photographed one **10 short**,
 *    which reads exactly like a money-display defect. Wait past it before shooting.
 *  · the popup AUTO-DISMISSES at 4.5s. Shoot inside the window or photograph an empty page.
 *
 * ⛔ And the amount must be the same in every shot, so a reader comparing three languages is
 * comparing the LAYOUT and not three different numbers.
 */
import { mkdirSync } from "node:fs";
import { BASE, SHOT, login, browser, recorder } from "./live/harness.mjs";

mkdirSync(`${SHOT}/win`, { recursive: true });

/** The figures from the real settled round in `shots/E105/`, so the picture is a real shape. */
const AMOUNT = 3470, NET = 1480;
/** The label the announcer itself builds: `${t.market.udUpDown} · ${sideWord}`. */
const LABEL = { en: "Up & Down · Down", sw: "Juu na Chini · Chini", zh: "涨跌 · 跌" };
/** `wonHeading` per locale — used to PROVE the modal rendered in the language we asked for. */
const HEADING = { en: "Won!", sw: "Umeshinda!", zh: "赢了！" };

const WIDTHS = [360, 1280];
const r = recorder("The Up & Down win moment · EN / SW / ZH");
const { b, ctx } = await browser();

try {
  for (const locale of ["en", "sw", "zh"]) {
    for (const w of WIDTHS) {
      const c = await ctx.browser().newContext({ viewport: { width: w, height: w < 768 ? 780 : 900 } });
      const page = await c.newPage();
      await login(page, "fleet:07");
      // E-106 · the locale is a COOKIE. There is no /api/locale route, and asking for one
      // silently 404s — every SW/ZH shot this campaign took before 2026-08-06 was English.
      await c.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // ⛔ WITNESS THE RESULT, NOT THE REQUEST. `<html lang>` is written from the same resolved
      // locale the dictionary lookup uses; the cookie only proves we asked.
      const lang = await page.evaluate(() => document.documentElement.lang);
      if (lang !== locale) throw new Error(`locale did not apply: asked "${locale}", <html lang>="${lang}" — refusing to shoot a mislabelled picture`);

      await page.evaluate(([amount, net, label]) => {
        window.dispatchEvent(new CustomEvent("50pick:celebrate", {
          detail: { kind: "WIN", amount, net, label },
        }));
      }, [AMOUNT, NET, LABEL[locale]]);

      // Past the 900ms roll, well inside the 4.5s auto-dismiss.
      await page.waitForTimeout(1600);

      const dialog = page.locator('[role="dialog"]').first();
      const shown = await dialog.count();
      r.check(`${locale} @${w} · the celebration opened`, shown > 0);
      if (!shown) { await c.close(); continue; }

      const txt = (await dialog.innerText()).replace(/\s+/g, " ").trim();
      // ⛔ The heading proves the LANGUAGE; the amount proves the counter finished rolling.
      r.check(`${locale} @${w} · it is in ${locale.toUpperCase()} ("${HEADING[locale]}")`,
        txt.includes(HEADING[locale]), txt.slice(0, 70));
      r.check(`${locale} @${w} · the payout finished rolling (${AMOUNT.toLocaleString()})`,
        txt.includes(AMOUNT.toLocaleString()), txt.slice(0, 70));

      // Per-element, never fullPage.
      await dialog.screenshot({ path: `${SHOT}/win/win-${locale}-${w}.png` });
      await page.screenshot({ path: `${SHOT}/win/win-${locale}-${w}-viewport.png` });
      r.note(`${locale} @${w} → ${txt.slice(0, 80)}`);
      await c.close();
    }
  }
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
