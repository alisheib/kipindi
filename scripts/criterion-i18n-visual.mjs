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
 *   # local, both arms, against the seeded pair (npm run db:seed-criterion-local)
 *   node scripts/criterion-i18n-visual.mjs --base http://127.0.0.1:3001 --shots .qa-f6
 *
 *   # production, fallback arm only — until F6b/F6c land, no live poll HAS a
 *   # translated criterion, so asking for that arm there would be a check that can
 *   # only fail for a reason that is not a defect.
 *   node scripts/criterion-i18n-visual.mjs --base https://50pick.tz \
 *     --fallback mkt_… --translated none --shots .qa-f6-prod
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:3001").replace(/\/$/, "");
const SHOTS = arg("--shots", ".qa-f6");
const WIDTHS = arg("--widths", "360,1280").split(",").map(Number);

mkdirSync(SHOTS, { recursive: true });

// Default to the locally-seeded pair; `--translated none` drops that arm so the same
// driver can run against production, where no poll has a translated criterion yet.
const TRANSLATED = arg("--translated", "mkt_f6_translated");
const UNTRANSLATED = arg("--fallback", "mkt_f6_untranslated");
const ARMS = [
  ...(TRANSLATED === "none" ? [] : [["translated", TRANSLATED]]),
  ...(UNTRANSLATED === "none" ? [] : [["fallback", UNTRANSLATED]]),
];
if (!ARMS.length) { console.error("Nothing to check — both arms are 'none'."); process.exit(1); }
// ⛔ SAY WHAT WAS SKIPPED. A run that silently covers one arm reads exactly like a
// run that covered both, and the summary line is what anyone quotes afterwards.
if (TRANSLATED === "none") console.log("NOTE: translated arm SKIPPED (--translated none) — fallback arm only.\n");

// The exact strings the dictionary promises, per locale. Asserting the RENDERED text
// against the dictionary — rather than "some note is present" — is what stops a
// correctly-placed note in the wrong language from passing.
const NOTE = {
  sw: { none: "Imeonyeshwa kwa Kiingereza", bind: "Maandishi ya Kiingereza ndiyo yanayoamua" },
  zh: { none: "以英文显示", bind: "结算以英文原文为准" },
};
// The criterion panel's heading, per locale — this is how the section is located, so
// it works on ANY poll rather than only the seeded one.
const HEADING = { en: "Resolution criterion", sw: "Kigezo cha utatuzi", zh: "结算标准" };

// ⭐ THE BODY IS CHECKED AS AN INVARIANT, NOT AGAINST A HARDCODED SENTENCE. The English
// pass records what each poll's criterion says; the SW/ZH passes are then asserted
// RELATIVE to it — a fallback must render exactly the English, a translation must
// render something else. That is the actual claim, it holds for any market, and it
// means this driver can be pointed at a live production poll whose text I do not know.
const enBody = new Map();

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

    for (const [arm, id] of ARMS) {
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
      // Located by its own HEADING, then the section that heading sits in, so this
      // works on any poll and cannot drift onto a neighbouring panel.
      const section = page
        .getByRole("heading", { name: HEADING[locale], exact: true })
        .locator("xpath=ancestor::section[1]");
      await section.waitFor({ state: "visible", timeout: 20000 });
      ok(`${tag}: the criterion section was located exactly once`, await section.count() === 1,
         `${await section.count()} match(es)`);
      const body = (await section.locator("p").first().innerText()).trim();
      const all = await section.innerText();

      if (locale === "en") {
        // The canonical text, recorded for the SW/ZH passes below to measure against.
        enBody.set(arm, body);
        ok(`${tag}: the English criterion is present and non-trivial`, body.length >= 30, `${body.length} chars`);
        ok(`${tag}: and carries NO language note — an English reader needs none`,
           !all.includes("Shown in English") && !all.includes("Show the English original"));
      } else if (!enBody.has(arm)) {
        // ⛔ REFUSE rather than pass. Without the English baseline every assertion
        // below is comparing against undefined, which would quietly succeed.
        ok(`${tag}: the English baseline for this poll was captured first`, false, "EN pass did not run");
      } else if (arm === "translated") {
        ok(`${tag}: the body is NOT the English — a translation is being shown`,
           body !== enBody.get(arm) && body.length > 0, body.slice(0, 40));
        ok(`${tag}: it does NOT claim a missing translation`, !all.includes(NOTE[locale].none));
        ok(`${tag}: it names English as what decides`, all.includes(NOTE[locale].bind));
        // The binding English must be REACHABLE, not merely mentioned.
        const det = section.locator("details");
        ok(`${tag}: the English original is behind a disclosure`, await det.count() === 1);
        await det.locator("summary").click();
        const opened = (await det.locator("p").innerText()).trim();
        ok(`${tag}: opening it shows the SAME canonical English the EN page showed`,
           opened === enBody.get(arm), opened.slice(0, 40));
      } else {
        ok(`${tag}: the body is EXACTLY the English criterion`, body === enBody.get(arm), body.slice(0, 40));
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
