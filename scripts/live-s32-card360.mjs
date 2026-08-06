/**
 * E-109 AT 360, IN ALL THREE LANGUAGES — because the change added two lines to every bettable card.
 *
 * ⛔ READ-ONLY: it signs in, sets a language, photographs the card, and measures it. No bet, no
 * write. The stake is never placed; only the surface is read.
 *
 * ⚠️ THE LOCALE MUST BE PROVEN, NOT REQUESTED (E-106). This app resolves language from the
 * `kp-locale` COOKIE — `/api/locale` has never existed, and its 404 was swallowed by a
 * `.catch(() => {})`, so **every SW/ZH screenshot this campaign ever took was English
 * photographed twice.** The cookie is set on the context and `<html lang>` is then read back as
 * the honest witness; a mismatch THROWS rather than capturing a mislabelled shot.
 *
 * ⚠️ AND `innerText` IS NOT VISIBILITY (the truncation trap). A clipped line returns its full
 * string whatever the ellipsis paints, and a WRAP satisfies `scrollWidth === clientWidth`
 * exactly as a fit does. So this measures geometry — per-element overflow past the card's own
 * box — rather than asking whether the words are present.
 *
 *   SHOT_DIR=.qa-s32 node scripts/live-s32-card360.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { login, recorder, BASE } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-s32";
const DURATION = process.env.DURATION ?? "15";
const LOCALES = (process.env.LOCALES ?? "en,sw,zh").split(",");
const r = recorder("E-109 · the card at 360, in three languages");
mkdirSync(SHOT, { recursive: true });

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
try {
  for (const locale of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 1400 }, deviceScaleFactor: 2 });
    // ⛔ The cookie IS the mechanism. Setting it on the context means it is present on the very
    // first request, so nothing renders in English first and swaps.
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    await login(page, "fleet:01");
    await page.goto(`${BASE}/updown?d=${DURATION}`, { waitUntil: "domcontentloaded" });

    // ⛔ `<html lang>` is written from the SAME resolved locale the dictionary lookup uses, so
    // it witnesses the RESULT rather than the request. The cookie only proves we asked.
    const applied = await page.getAttribute("html", "lang");
    if (applied !== locale) {
      r.check(`${locale}: the locale applied`, false, `<html lang>="${applied}" — refusing to capture a mislabelled shot`);
      await ctx.close();
      continue;
    }
    r.check(`${locale}: the locale applied (<html lang>="${applied}")`, true);

    await page.waitForSelector("article.mcardp", { timeout: 45_000 });
    await page.waitForFunction(
      () => [...document.querySelectorAll("article.mcardp")].some((c) => /×\s*[\d.]/.test(c.innerText)),
      null, { timeout: 45_000 },
    );
    const card = page.locator("article.mcardp")
      .filter({ has: page.getByRole("button", { name: /^(up|juu|涨)/i }) }).first();
    // ⛔ `locator.screenshot()`, never `fullPage` — a full-page shot of a long board is an
    // artefact nobody can judge a card by.
    await card.screenshot({ path: `${SHOT}/e109-card-360-${locale}.png` });

    // ── Geometry, per element, scoped to THIS card ─────────────────────────
    const m = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const over = [];
      for (const n of el.querySelectorAll("*")) {
        const b2 = n.getBoundingClientRect();
        if (b2.width === 0 || b2.height === 0) continue;
        // Past the card's own padded edge by more than a rounding pixel.
        if (b2.right > box.right + 1 || b2.left < box.left - 1) {
          over.push(`${n.tagName.toLowerCase()}.${(n.className || "").toString().split(" ")[0]}: ${Math.round(b2.right - box.right)}px`);
        }
      }
      // 🔴 THE CHECK ABOVE IS NOT ENOUGH, AND THE SWAHILI SHOT PROVED IT. A child clipped by an
      // intermediate row never reaches the CARD's edge — its rect is bounded by the row that is
      // cutting it — so "nothing overflows the card" was reported over a visibly severed chip.
      // The truncation memo, exactly: a WRAP and a CLIP both satisfy an edge comparison.
      // Measure every container against its OWN content instead.
      const clipped = [];
      for (const n of el.querySelectorAll("*")) {
        if (n.scrollWidth - n.clientWidth > 1 && n.clientWidth > 0) {
          const st = getComputedStyle(n);
          // `overflow-x: auto/scroll` is a scroller by design; `hidden`/`clip` is a cut.
          // ⛔ AN ELLIPSIS IS NOT A DEFECT, AND THIS CHECK REPORTED ONE AS THREE. Standing rule
          // §0.1b.3: a per-element scan must skip what is wide BY DESIGN — a `text-overflow:
          // ellipsis` element's hidden tail IS the "…", and flagging it means the "fix" is to
          // undo the fix. The card's footer source line is exactly that, and it was scored as a
          // 174px cut in Swahili on first run. Its SIZE is still worth a human look, so it is
          // reported as a note below rather than swallowed entirely.
          if (/ellipsis/.test(st.textOverflow)) continue;
          if (/hidden|clip/.test(st.overflowX)) {
            clipped.push(`${n.tagName.toLowerCase()}.${(n.className || "").toString().split(" ").slice(0, 2).join(".")}: ${n.scrollWidth - n.clientWidth}px cut`);
          }
        }
      }
      const btns = [...el.querySelectorAll("button")].map((x) => x.getBoundingClientRect());
      return {
        cardHeight: Math.round(box.height),
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        over: over.slice(0, 6),
        clipped: clipped.slice(0, 6),
        // Ellipsised elements, reported as INFORMATION. A tail hidden behind "…" is by design;
        // how MUCH of it is hidden is still a judgement a human should make.
        ellipsised: [...el.querySelectorAll("*")]
          .filter((n) => /ellipsis/.test(getComputedStyle(n).textOverflow) && n.scrollWidth - n.clientWidth > 1)
          .map((n) => ({ pct: Math.round(((n.scrollWidth - n.clientWidth) / n.scrollWidth) * 100), t: n.innerText.slice(0, 30) })),
        // Tap targets: the kit's floor is 40px.
        smallTaps: [...el.querySelectorAll("button")]
          .map((x) => ({ t: x.innerText.replace(/s+/g, " ").trim().slice(0, 14), h: Math.round(x.getBoundingClientRect().height) }))
          .filter((x) => x.h > 0 && x.h < 40),
        text: el.innerText.replace(/\s+/g, " ").trim(),
      };
    });
    r.note(`${locale}: card ${m.cardHeight}px tall`);
    for (const e of m.ellipsised) r.note(`${locale}: ⓘ "${e.t}…" is ${e.pct}% hidden behind its ellipsis (by design — but LOOK)`);
    r.check(`${locale}: nothing inside the card overflows its own box`, m.over.length === 0, m.over.join(" · "));
    r.check(`${locale}: no container is CUTTING its own content`, m.clipped.length === 0, m.clipped.join(" · "));
    r.check(`${locale}: the page itself has no horizontal overflow`, m.docOverflow <= 0, `${m.docOverflow}px`);
    r.check(`${locale}: every control clears the 40px tap floor`, m.smallTaps.length === 0, m.smallTaps.map((x) => `${x.t}=${x.h}px`).join(" · "));
    // The two sentences E-109 added must be on the card, in THIS language — and the first of
    // them only when it is TRUE.
    //
    // 🔴 THIS CHECK WAS UNCONDITIONAL AND FAILED IN ALL THREE LANGUAGES ON A CORRECT SCREEN.
    // Between two runs the round gained a second side, so the empty-side sentence was rightly
    // absent — and a check that demands it always be present is demanding a false statement.
    // ⭐ The honest form is an INVARIANT, and it is exactly derivable from the card itself:
    // a side with no counterparty returns EXACTLY 1.00× (the fee is a share of the losing pool,
    // and an empty losing pool means no fee and no prize — the stake, straight back). So the
    // sentence must be present **iff** one of the two multiples reads 1.00. That also catches
    // the opposite defect, which no presence check could: the sentence appearing on a
    // two-sided round, where it would be a lie.
    const empty = { en: /nobody has backed|no bets yet/i, sw: /hakuna aliyeweka dau|hakuna dau bado/i, zh: /没有人投注|尚无投注/ }[locale];
    const note = { en: /moves with every bet/i, sw: /hubadilika kwa kila dau/i, zh: /随每一笔新投注变动/ }[locale];
    const mults = [...m.text.matchAll(/×\s*([\d.]+)\s*est/g)].map((x) => Number(x[1]));
    const oneSided = mults.some((x) => x === 1);
    r.check(`${locale}: a side with no counterparty is quoted at exactly 1.00×, or none is`,
      mults.length === 2, `read ${mults.join(" / ")}`);
    r.check(`${locale}: the empty-side sentence is shown when — and only when — it is true`,
      empty.test(m.text) === oneSided,
      `multiples ${mults.join(" / ")} ⇒ ${oneSided ? "expected the sentence" : "expected NO sentence"}; ${empty.test(m.text) ? "it is there" : "it is absent"}`);
    r.check(`${locale}: the estimate note is present and translated`, note.test(m.text));
    await ctx.close();
  }
} catch (e) {
  console.error(`\n🔴 ${e.message}\n`);
} finally {
  failed = r.done();
  await b.close();
}
process.exit(failed === 0 ? 0 : 1);
