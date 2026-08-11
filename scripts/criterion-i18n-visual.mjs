#!/usr/bin/env node
/**
 * criterion-i18n-visual.mjs — F6's two arms, in a real browser, MEASURED then shot.
 *
 * ⛔ A GREEN UNIT SUITE IS NOT EVIDENCE THAT A PLAYER CAN READ THE RULE. `pickCriterion`
 * can be perfect while the page renders the note in the wrong branch, clips it at
 * 360px, or prints the English original where the translation should be. This drives
 * the actual page and asserts what is on it.
 *
 * ⭐ THE LOCALE COMES FROM THE `kp-locale` COOKIE, SET ON THE CONTEXT so it is present
 * on the FIRST request (E-106 — there is no /api/locale route), and `<html lang>` is
 * read back afterwards. A mismatch REFUSES to capture: a sweep that silently shoots
 * the wrong language produces output that looks exactly like evidence.
 *
 * Usage:
 *   node scripts/criterion-i18n-visual.mjs --base http://127.0.0.1:3001 --shots .qa-f6
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:3001").replace(/\/$/, "");
const SHOTS = arg("--shots", ".qa-f6");
const WIDTHS = arg("--widths", "360,1280").split(",").map(Number);

mkdirSync(SHOTS, { recursive: true });

const TRANSLATED = "mkt_f6_translated";
const UNTRANSLATED = "mkt_f6_untranslated";

// The exact strings the dictionary promises, per locale. Asserting the RENDERED text
// against the dictionary — rather than "some note is present" — is what stops a
// correctly-placed note in the wrong language from passing.
const NOTE = {
  sw: { none: "Imeonyeshwa kwa Kiingereza", bind: "Maandishi ya Kiingereza ndiyo yanayoamua" },
  zh: { none: "以英文显示", bind: "结算以英文原文为准" },
};
// A Swahili sentence from the seeded translation, and an English one from the canon.
const SW_BODY = "Inatatuliwa NDIYO iwapo kiwango rasmi";
const ZH_BODY = "若坦桑尼亚银行在当月最后一个营业日";
const EN_BODY = "Resolves YES if the Bank of Tanzania official daily mid-rate";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();

for (const locale of ["en", "sw", "zh"]) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 1100 },
      locale,
      extraHTTPHeaders: { "Accept-Language": locale },
      deviceScaleFactor: 2,
    });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();

    for (const [arm, id] of [["translated", TRANSLATED], ["fallback", UNTRANSLATED]]) {
      const tag = `${arm}-${locale}-${width}`;
      await page.goto(`${BASE}/markets/${id}`, { waitUntil: "domcontentloaded", timeout: 45000 });

      // ⛔ REFUSE ON A LOCALE MISMATCH rather than shooting the wrong language.
      const htmlLang = await page.getAttribute("html", "lang");
      if (htmlLang !== locale) {
        ok(`${tag}: <html lang> is the locale that was asked for`, false, `got "${htmlLang}"`);
        continue;
      }

      // Scope every read to the criterion SECTION. A page-wide match cannot tell
      // "my note" from "a note" — the English original also lives on this page.
      const section = page.locator("section", { has: page.locator("a[href^='https://www.bot.go.tz']") }).last();
      await section.waitFor({ state: "visible", timeout: 20000 });
      const body = (await section.locator("p").first().innerText()).trim();
      const all = await section.innerText();

      if (locale === "en") {
        ok(`${tag}: English reads the canonical criterion`, body.startsWith(EN_BODY), body.slice(0, 48));
        ok(`${tag}: and carries NO language note — an English reader needs none`,
           !all.includes("Shown in English") && !all.includes("Show the English original"));
      } else if (arm === "translated") {
        const want = locale === "sw" ? SW_BODY : ZH_BODY;
        ok(`${tag}: the body is the ${locale.toUpperCase()} translation`, body.includes(want), body.slice(0, 48));
        ok(`${tag}: it does NOT claim a missing translation`, !all.includes(NOTE[locale].none));
        ok(`${tag}: it names English as what decides`, all.includes(NOTE[locale].bind), all.slice(0, 0));
        // The binding English must be REACHABLE, not merely mentioned.
        const det = section.locator("details");
        ok(`${tag}: the English original is behind a disclosure`, await det.count() === 1);
        await det.locator("summary").click();
        const opened = await det.locator("p").innerText();
        ok(`${tag}: opening it shows the canonical English`, opened.trim().startsWith(EN_BODY), opened.slice(0, 48));
      } else {
        ok(`${tag}: the body falls back to the English criterion`, body.startsWith(EN_BODY), body.slice(0, 48));
        ok(`${tag}: and the page SAYS it fell back`, all.includes(NOTE[locale].none));
        ok(`${tag}: it does not also claim to be a translation`, !all.includes(NOTE[locale].bind));
        ok(`${tag}: no English-original disclosure — the body already IS the English`,
           await section.locator("details").count() === 0);
      }

      // The note must not overflow its panel at 360. Measured against the element's
      // OWN scrollWidth: a child clipped by an intermediate row never reaches the
      // section's edge, so comparing against the section reports "no overflow" over
      // a visibly severed line.
      const over = await section.evaluate((el) => {
        let worst = 0;
        for (const n of [el, ...el.querySelectorAll("*")]) worst = Math.max(worst, n.scrollWidth - n.clientWidth);
        return worst;
      });
      ok(`${tag}: nothing overflows inside the criterion panel`, over <= 1, `${over}px`);

      await section.screenshot({ path: `${SHOTS}/${tag}.png` });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\ncriterion-i18n-visual: ${pass} passed, ${fail} failed · shots in ${SHOTS}/`);
if (fail > 0) process.exit(1);
