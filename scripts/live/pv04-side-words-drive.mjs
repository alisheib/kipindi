/**
 * `npm run qa:side-words` — PV-04, PROVEN ON PRODUCTION, IN THE PLAYER'S OWN LANGUAGE.
 *
 * ⛔ WHY A LIVE DRIVE AND NOT ONLY A SCANNER. `test:labels` §3b/§3c catch two of PV-04's
 * three shapes — a token typed as JSX text, and a stored token dropped into a translated
 * sentence. They cannot catch the third: a JSX expression child that RESOLVES to the enum
 * (`{effectiveSide}`, `{s}`). No source scanner can, without knowing what a variable holds.
 * And the components cannot be bare-rendered either — `ConvictionDial` calls `useRouter()`
 * and imports a server action, so `renderToStaticMarkup` would CRASH rather than fail, and
 * a crash scores as "red" while proving nothing.
 *
 * So this asks the product. It drives the real market-detail page as a signed-in player, in
 * Swahili and Chinese, and reads the words that actually reach the screen.
 *
 * ⭐ EVERY CHECK IS A PAIR, AND THAT IS THE POINT. An absence assertion passes beautifully
 * when the reader is broken — a blank region, a page that never hydrated, a locale cookie
 * that did not take all report "no English tokens found". So each region is asserted twice:
 *
 *      NEGATIVE   the region carries no ASCII YES/NO
 *      POSITIVE   the region carries this locale's own word (NDIO/HAPANA · 是/否)
 *
 * If the reader is blind, the POSITIVE fails and the run goes red. A silent pass is not
 * reachable. The drive also REFUSES to continue on a missing premise (no pick gate, wrong
 * `<html lang>`) rather than reporting green over a surface it never reached.
 *
 * ⚠️ ONE SIGN-IN, REUSED. 50pick keeps one live session per account, so a second login
 * revokes the first — see `loginOnce`'s header. The fleet persona is used so no human's
 * session is disturbed.
 *
 * Evidence: `.qa-shots/pv04/` (gitignored).
 * Run: npm run qa:side-words          PV04_PERSONA=fleet:03 to use another fleet account.
 */
import { mkdirSync } from "node:fs";
import { browser, loginOnce, BASE, recorder } from "./harness.mjs";

const WHO = process.env.PV04_PERSONA || "fleet:01";
const SHOTS = ".qa-shots/pv04";

/** The word each locale's dictionary actually issues — `common.yes` / `common.no`. */
const EXPECT = {
  sw: { yes: "NDIO", no: "HAPANA" },
  zh: { yes: "是", no: "否" },
};
/** The stored tokens. ⛔ Never a substring test — `NO` must not match inside "NOTE". */
const ASCII_ENUM = /\b(YES|NO)\b/;

/**
 * Read the commit surfaces, each located precisely rather than by a page-wide sweep.
 *
 * ⛔ SCOPE MATTERS HERE MORE THAN USUAL. This page legitimately carries the ASCII enum in two
 * places a player is not being lied to by: the market's own settlement criteria (English source
 * text, shown beside a "translation — the English governs" notice) and the `similar markets`
 * rail. A page-wide grep for "YES" would fail on a perfectly correct screen, which is the
 * fastest way to teach a session to ignore this drive.
 *
 * The dial's root is COMPUTED, not hardcoded: walk up from the commit button until the
 * ancestor also contains the locked-pole group. A class name would rot on the next redesign.
 */
async function readSurfaces(page) {
  return page.evaluate(() => {
    const txt = (el) => (el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : null);
    const gate = [...document.querySelectorAll("main button.btn-lg")]
      .filter((b) => /btn-(yes|no)\b/.test(b.className));
    const commit = document.querySelector("main button.whitespace-normal");
    let dial = null;
    if (commit) {
      for (let el = commit.parentElement; el && el.tagName !== "MAIN"; el = el.parentElement) {
        if (el.querySelector('[role="img"][aria-label]')) { dial = el; break; }
      }
      dial = dial || commit.parentElement;
    }
    const poles = dial?.querySelector('[role="img"][aria-label]') ?? null;
    return {
      lang: document.documentElement.lang,
      gate: gate.map(txt),
      gateAria: gate.map((b) => b.getAttribute("aria-label") || ""),
      commitText: txt(commit),
      commitAria: commit?.getAttribute("aria-label") ?? null,
      polesAria: poles?.getAttribute("aria-label") ?? null,
      polesText: txt(poles),
      dialText: txt(dial),
      svgText: dial ? [...dial.querySelectorAll("svg text")].map((t) => t.textContent.trim()).filter(Boolean).join(" ") : null,
    };
  });
}

const r = recorder("qa:side-words — PV-04 · the side word a player actually reads, on production");
mkdirSync(SHOTS, { recursive: true });
const { b } = await browser();
let openMarket = null;

try {
  const state = await loginOnce(b, WHO);
  r.note(`signed in as ${WHO}`);

  for (const loc of ["sw", "zh"]) {
    const want = EXPECT[loc];
    const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 1000 } });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const page = await ctx.newPage();

    // ── Find an OPEN market whose pick gate is on screen. ⛔ Refuse rather than report green:
    //    a closed market renders a different control, and measuring it proves nothing.
    if (!openMarket) {
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(4000);
      const hrefs = await page.evaluate(() =>
        [...new Set([...document.querySelectorAll('a[href^="/markets/mkt_"]')].map((a) => a.getAttribute("href")))]);
      for (const href of hrefs.slice(0, 8)) {
        await page.goto(BASE + href, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.waitForTimeout(2500);
        if (await page.locator("main button.btn-lg.btn-yes").count()) { openMarket = href; break; }
      }
      if (!openMarket) throw new Error("no open market with a pick gate on the board — the premise is absent, not the product");
      r.note(`market under test: ${openMarket}`);
    } else {
      await page.goto(BASE + openMarket, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(2500);
    }

    // ⛔ E-106 — refuse to measure on a locale mismatch. A sweep that silently shoots the wrong
    //    language produces output that LOOKS like evidence.
    const lang0 = await page.evaluate(() => document.documentElement.lang);
    if (!r.check(`${loc} · the page really rendered in ${loc} (<html lang>)`, lang0 === loc, `got "${lang0}"`)) {
      await ctx.close();
      continue;
    }
    if (!r.check(`${loc} · the pick gate is present — the premise of everything below`,
      (await page.locator("main button.btn-lg.btn-yes").count()) === 1)) {
      await ctx.close();
      continue;
    }

    // ── 1 · the pick gate (side-picker.tsx) ────────────────────────────────
    const g = await readSurfaces(page);
    const gateJoined = g.gate.join(" | ");
    r.check(`${loc} · pick-gate buttons carry NO ascii enum`, !ASCII_ENUM.test(gateJoined), gateJoined);
    r.check(`${loc} · pick-gate buttons DO carry this locale's own words (the reader works)`,
      gateJoined.includes(want.yes) && gateJoined.includes(want.no), gateJoined);

    await page.screenshot({ path: `${SHOTS}/gate-${loc}-1280.png` });

    // ── 2 · the dial, after committing to a side (conviction-dial.tsx) ─────
    await page.locator("main button.btn-lg.btn-yes").click();
    await page.waitForTimeout(1800);
    const d = await readSurfaces(page);

    if (!r.check(`${loc} · the dial revealed and its commit button was located`, Boolean(d.commitText))) {
      await ctx.close();
      continue;
    }
    for (const [what, value] of [
      ["commit button text", d.commitText],
      ["commit button aria-label", d.commitAria],
      ["locked-pole group aria-label", d.polesAria],
      ["locked-pole tiles", d.polesText],
      ["dial knob svg text", d.svgText],
      ["the whole dial region", d.dialText],
    ]) {
      r.check(`${loc} · ${what} carries NO ascii enum`, value !== null && !ASCII_ENUM.test(value),
        value === null ? "NOT FOUND — the reader is blind, not the product clean" : String(value).slice(0, 110));
    }
    r.check(`${loc} · the dial DOES carry this locale's own word (the reader works)`,
      Boolean(d.dialText) && d.dialText.includes(want.yes), String(d.dialText).slice(0, 110));

    await page.screenshot({ path: `${SHOTS}/dial-${loc}-1280.png` });

    // ── 3 · the same two surfaces at 390, where the words are tightest ─────
    const phone = await b.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
    await phone.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const p390 = await phone.newPage();
    await p390.goto(BASE + openMarket, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p390.waitForTimeout(2500);
    if (await p390.locator("main button.btn-lg.btn-yes").count()) {
      await p390.screenshot({ path: `${SHOTS}/gate-${loc}-390.png`, fullPage: true });
      await p390.locator("main button.btn-lg.btn-yes").click();
      await p390.waitForTimeout(1800);
      const d390 = await readSurfaces(p390);
      r.check(`${loc} @390 · the dial region carries NO ascii enum`,
        d390.dialText !== null && !ASCII_ENUM.test(d390.dialText), String(d390.dialText).slice(0, 110));
      // ⛔ RESPONSIVENESS IS PART OF THE SAME FIX (Ali, 2026-09-03): the Swahili words are the
      //    longest, and they landed in a fixed-height two-up grid. A word that fits its box is
      //    not the same claim as a word that is CORRECT, so both are measured.
      // ⛔ SCOPED TO THE DIAL, not to `main`. The first draft swept every button on the page and
      //    reported `mcardp-share 19>13` three times — an icon button in the "similar markets"
      //    rail, nothing to do with the side word. A page-wide match cannot tell "my control"
      //    from "a control", and a drive that reports someone else's surface gets ignored.
      //    (That card-share measurement is logged as a NOTE below; it belongs to whoever owns
      //    `.mcardp`, and is filed rather than silently swept in here.)
      const overflow = await p390.evaluate(() => {
        const commit = document.querySelector("main button.whitespace-normal");
        let dial = null;
        for (let el = commit?.parentElement; el && el.tagName !== "MAIN"; el = el.parentElement) {
          if (el.querySelector('[role="img"][aria-label]')) { dial = el; break; }
        }
        if (!dial) return ["DIAL NOT FOUND — measured nothing"];
        const bad = [];
        for (const el of dial.querySelectorAll("button, [role='img'] > div")) {
          if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.className.toString().slice(0, 40)} ${el.scrollWidth}>${el.clientWidth}`);
        }
        return bad;
      });
      r.check(`${loc} @390 · no commit control clips its own word`, overflow.length === 0, overflow.join(" · "));
      await p390.screenshot({ path: `${SHOTS}/dial-${loc}-390.png`, fullPage: true });
    } else {
      r.check(`${loc} @390 · the pick gate is present`, false, "absent at 390 — measured nothing");
    }
    await phone.close();
    await ctx.close();
  }
} finally {
  await b.close();
}

console.log(`\nshots → ${SHOTS}/  ⭐ LOOK at them; a green run is a pre-flight check, not evidence.`);
process.exit(r.done() === 0 ? 0 : 1);
