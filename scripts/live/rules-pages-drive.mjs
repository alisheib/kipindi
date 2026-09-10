/**
 * GAME RULES — VISUAL VERIFICATION ON PRODUCTION.
 *
 *   node scripts/live/rules-pages-drive.mjs
 *
 * ⛔ WHAT THIS ASSERTS IS GEOMETRY AND TYPE, NOT TEXT. `curl | grep` already proved the words
 * are on the page; it cannot tell you that a fee table pushes the body sideways at 360, that a
 * sentence renders below the reading floor, or that a figure came out in the reading face
 * instead of the mono one. Those are the defects a rules document actually ships with.
 *
 * ⭐ EVERY CHECK CARRIES A POSITIVE CONTROL, because the whole population is easy to fake:
 *   · locale — a known Swahili/Chinese string must be PRESENT, or a page that quietly served
 *     English would satisfy every other assertion. ⚠️ The cookie is `kp-locale`; `locale` is a
 *     different thing and reading it renders English while the report says "Chinese".
 *   · population — the counts of prose nodes, figures and tables must be non-zero, so "no
 *     violations" can never mean "nothing was looked at".
 *   · nav — the highlight is asserted after a REAL `<Link>` CLICK. `page.goto()` is a hard load
 *     and cannot reproduce the soft-navigation staleness this nav has had (E-70, three times).
 *
 * §A6 requires zero horizontal overflow at 360. §T4 sets the reading-copy floor at 12.5px.
 * §T5 puts every DATA numeral in the mono face. §A3 sets the tap floor at 40px.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { clippedControls } from "./clip.mjs";

const BASE = process.env.BASE || "https://50pick.tz";
const ROUTES = ["/legal/rules", "/legal/rules/yes-no", "/legal/rules/up-down"];
const LOCALES = ["en", "sw", "zh"];
const WIDTHS = [360, 768, 1280];
const SHOTS = "scripts/live/.shots/rules";

/** A string that exists ONLY in that language's copy — the locale positive control. */
const LOCALE_PROOF = {
  en: "binding",
  sw: "Kanuni",
  zh: "规则",
};

let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();

try {
  for (const loc of LOCALES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.addCookies([{ name: "kp-locale", value: loc, domain: "50pick.tz", path: "/" }]);
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45_000 });

      // ── locale positive control ───────────────────────────────────────────────────────
      const body = await page.locator("body").innerText();
      ok(`${loc} ${route} · CONTROL served ${loc}`, body.includes(LOCALE_PROOF[loc]),
        `"${LOCALE_PROOF[loc]}" absent — the page may have served English`);
      const htmlLang = await page.getAttribute("html", "lang");
      ok(`${loc} ${route} · <html lang> matches`, htmlLang === loc, `lang=${htmlLang}`);

      // ── TYPE: every sentence at or above the reading floor, every figure in mono ──────
      const type = await page.evaluate(() => {
        const article = document.querySelector("article") || document.body;
        // ⛔ THE POPULATION IS READING COPY, WHICH MEANS THE READING FACE — and the first
        // version of this check got that wrong and accused the page. It flagged the eyebrow
        // ("Legal") and the version stamp at 11px, then I discriminated against `/legal/terms`
        // and `/legal/privacy` — both design-gate-approved — and found the SAME two nodes,
        // both `mono`. They are §T3 microlabels, not sentences; §T4's 12.5px floor is about
        // prose. Excluding the mono face is the difference between measuring the rule and
        // measuring my own misreading of it.
        const prose = [...article.querySelectorAll("p, li")]
          .filter((el) => !/mono/i.test(getComputedStyle(el).fontFamily));
        const small = [];
        for (const el of prose) {
          const txt = (el.textContent || "").trim();
          if (txt.length < 12) continue;                 // a two-word chip is not a sentence
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 12.5) small.push(`${px}px "${txt.slice(0, 40)}"`);
        }
        // Figures: spans carrying tabular-nums must be in the mono face (§T5).
        const figures = [...article.querySelectorAll(".tabular-nums")];
        const wrongFace = figures
          .filter((el) => !/mono/i.test(getComputedStyle(el).fontFamily))
          .map((el) => (el.textContent || "").trim().slice(0, 24));
        return { proseCount: prose.length, small, figureCount: figures.length, wrongFace };
      });
      ok(`${loc} ${route} · CONTROL prose population`, type.proseCount > 5, `${type.proseCount} nodes`);
      ok(`${loc} ${route} · reading floor 12.5px holds`, type.small.length === 0, type.small.join(" | "));
      ok(`${loc} ${route} · CONTROL figure population`, type.figureCount > 0, `${type.figureCount} figures`);
      ok(`${loc} ${route} · every figure is in the mono face`, type.wrongFace.length === 0, type.wrongFace.join(" | "));

      // ── TABLES: the first ones in the legal section. Skin + keyboard-reachable region ──
      const tables = await page.evaluate(() => {
        const t = [...document.querySelectorAll("table")];
        return t.map((el) => {
          const region = el.closest('[role="region"]');
          return {
            skinned: el.className.includes("admin-tbl"),
            inRegion: !!region,
            labelled: !!region?.getAttribute("aria-label"),
            focusable: region?.getAttribute("tabindex") === "0",
          };
        });
      });
      if (route !== "/legal/rules") {
        ok(`${loc} ${route} · CONTROL tables present`, tables.length >= 1, `${tables.length}`);
        ok(`${loc} ${route} · every table uses the one skin`, tables.every((t) => t.skinned));
        ok(`${loc} ${route} · every table scrolls in a labelled, focusable region`,
          tables.every((t) => t.inRegion && t.labelled && t.focusable),
          JSON.stringify(tables));
      }

      // ── REACH at every width, with the tables present ────────────────────────────────
      // 🔴 THIS CHECK WAS VACUOUS IN THE FIRST VERSION OF THIS DRIVE, AND THE FIX IS TO ASK A
      // DIFFERENT QUESTION. It read `documentElement.scrollWidth - clientWidth <= 0` — but
      // `globals.css` gives `html` `overflow-x: clip`, which clips WITHOUT creating a scroll
      // container, so the document never learns. Discriminated rather than reasoned about: a
      // deliberately 2000px-wide block injected at a 360 viewport left that expression at 0.
      // Twenty-seven "zero horizontal overflow" passes could not have failed.
      // ⭐ `clip.mjs` already carries this lesson in capitals and exports the honest instrument,
      // so this uses it rather than inventing a second idiom: the question is about the CONTROL
      // and its ancestors, never about the document.
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 1000 });
        await page.waitForTimeout(150);
        const clipped = await clippedControls(page, "body");
        ok(`${loc} ${route} @${w} · no control is clipped out of reach`,
          clipped.length === 0, clipped.slice(0, 3).join(" | "));
        // And a plain geometry read, which `overflow-x: clip` cannot mask: does any element's
        // box exceed the viewport? A wide table may push layout without severing a control.
        const widest = await page.evaluate((vw) => {
          let worst = 0, tag = "";
          for (const el of document.querySelectorAll("article *")) {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.left < -1) continue;
            const past = Math.round(r.right - vw);
            // ⛔ A table inside a ScrollX is EXPECTED to be wider than the viewport — that is the
            // component doing its job. Skip anything inside a scroll region.
            if (el.closest('[role="region"]')) continue;
            if (past > worst) { worst = past; tag = el.tagName.toLowerCase(); }
          }
          return { worst, tag };
        }, w);
        ok(`${loc} ${route} @${w} · nothing outside a scroll region exceeds the viewport`,
          widest.worst <= 1, `${widest.tag} extends ${widest.worst}px past ${w}`);
        if (w === 360 || w === 1280) {
          const name = `${route.replace(/\//g, "_")}_${loc}_${w}.png`;
          await page.screenshot({ path: `${SHOTS}/${name}` }).catch(() => {});
        }
      }
      await page.setViewportSize({ width: 1280, height: 1000 });
    }

    // ── NAV: the highlight must follow a REAL CLICK, not a goto ──────────────────────────
    // ⛔ Landing on /legal/terms first, then CLICKING through, is the only way to reproduce the
    //    soft-navigation staleness class. A `goto` re-renders the layout and always looks right.
    await page.goto(`${BASE}/legal/terms`, { waitUntil: "networkidle", timeout: 45_000 });
    const navLink = page.locator('nav a[href="/legal/rules"]').first();
    ok(`${loc} nav · CONTROL the Game Rules entry exists`, (await navLink.count()) > 0);
    if (await navLink.count()) {
      const box = await navLink.boundingBox();
      ok(`${loc} nav · tap floor 40px`, !!box && box.height >= 40, `${box?.height}px`);
      // ⛔ `waitForLoadState` IS THE WRONG WAIT FOR A SOFT NAVIGATION. All four legal links are
      // client-side transitions inside one layout: there is no document load to idle on, so
      // networkidle resolved instantly and `page.url()` still read the OLD route. The drive
      // reported "the click did not navigate" about a nav that works. Wait on the URL itself.
      await navLink.click();
      await page.waitForURL((u) => new URL(u).pathname === "/legal/rules", { timeout: 45_000 }).catch(() => {});
      ok(`${loc} nav · a real click lands on the rules index`,
        new URL(page.url()).pathname === "/legal/rules", page.url());
      // Then click INTO a child and prove the parent entry is STILL the highlighted one.
      const child = page.locator('a[href="/legal/rules/up-down"]').first();
      if (await child.count()) {
        await child.click();
        await page.waitForURL((u) => new URL(u).pathname === "/legal/rules/up-down", { timeout: 45_000 }).catch(() => {});
        const activeHrefs = await page.evaluate(() =>
          [...document.querySelectorAll("nav a")]
            .filter((a) => {
              const s = getComputedStyle(a);
              return s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
            })
            .map((a) => a.getAttribute("href")));
        ok(`${loc} nav · EXACTLY ONE entry is highlighted on a child route`,
          activeHrefs.length === 1, `highlighted: ${JSON.stringify(activeHrefs)}`);
        ok(`${loc} nav · and it is the Game Rules parent`,
          activeHrefs[0] === "/legal/rules", `got ${activeHrefs[0]}`);
      }
    }
    await ctx.close();
  }
} catch (err) {
  fail++;
  console.log(`FAIL drive threw — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed · shots in ${SHOTS}`);
process.exit(fail === 0 ? 0 : 1);
