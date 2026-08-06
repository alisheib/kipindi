/**
 * PREVIEW A CSS-ONLY ATOM ON THE REAL PRODUCTION SURFACE, BEFORE SHIPPING IT.
 *
 *   node scripts/material-candidate-preview.mjs \
 *     --route=/markets --selector=.pbar --persona=fleet:07 \
 *     --css-file=.qa-design/candidate.css --tag=pbar-even-ring
 *
 * ⭐ WHY THIS EXISTS. The four-part gate says LOOK before believing a number, and
 * until now the only thing this repo could look at was production — which means
 * the only way to see a candidate was to ship it. That is backwards for a change
 * whose whole risk is visual. ATOM 2c-c has to decide whether `.pbar-yes` and
 * `.pbar-no` take an even ring at all: the two fills ABUT in the middle of the
 * bar, so two 1px inner rings meeting would paint a 2px light seam where the
 * split is — a defect the geometry gate would score as compliant. That is a
 * question for the eye, and it needs asking BEFORE the commit.
 *
 * So: drive the real page, shoot the real element, inject the candidate, shoot it
 * again. Same DOM, same fonts, same real data, same viewport, one variable.
 *
 * ⛔ WHAT THIS IS NOT. Injecting a rule is not the same as shipping it. The
 * injected sheet is appended LAST, so it wins by document order at equal
 * specificity — this previews the VALUE, not the cascade. A candidate that needs
 * to beat an existing rule in the real stylesheet must still be checked there.
 * ⛔ It also proves nothing about the ATOM: only the shipped, deployed file does.
 * This is a look-before-you-leap instrument, and the four-part gate still runs
 * against production afterwards.
 *
 * ⛔ locator.screenshot() / a viewport-clipped page.screenshot(), NEVER fullPage.
 * ⛔ Language comes from the `kp-locale` COOKIE set on the context before the
 * first request (E-106), and `<html lang>` is read back — a sweep that silently
 * shoots the wrong language produces output that looks exactly like evidence.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, login } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-design";
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};

const ROUTE = flag("route", "/markets");
const SELECTOR = flag("selector", ".pbar");
const PERSONA = flag("persona", "");
const TAG = flag("tag", "candidate");
const CSS_FILE = flag("css-file", "");
const OPEN = flag("open", "").split(",").filter(Boolean);
const WIDTHS = flag("widths", "360,1280").split(",").map(Number);
const LOCALES = flag("locales", "en").split(",");
const PAD = Number(flag("pad", "8")); // CSS px of context around the element
/**
 * ⛔ WHICH PROPERTY THE "did it take" TEST READS. It was hard-wired to
 * `boxShadow`, which is right for a ring atom and useless for a canvas atom:
 * previewing `--bg` against `main` read `none` on both sides and the run
 * correctly announced that it proved nothing. ⭐ That is the tool working — a
 * missed injection MUST NOT look like "no visual risk" — but the fix is to let
 * the caller name the property the change is expected to move, not to loosen the
 * test. `--prop=backgroundColor` for a surface, `--prop=color` for ink.
 */
const PROP = flag("prop", "boxShadow");
/** Cap the capture height: a full-page element at dsf 4 is a 10,000px image nobody opens. */
const MAXH = Number(flag("maxh", "900"));

if (!CSS_FILE) throw new Error("--css-file is required: the candidate rule(s) to inject");
const CANDIDATE = readFileSync(CSS_FILE, "utf8");

const geom = (v) =>
  String(v)
    .replace(/(oklch|oklab|lab|lch|rgba?|hsla?|color-mix|color)\([^()]*(\([^()]*\)[^()]*)*\)/g, "▢")
    .replace(/\s+/g, " ")
    .trim();

async function run() {
  mkdirSync(`${SHOT}/candidate`, { recursive: true });
  const report = [];
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  console.log(`candidate preview · ${BASE}${ROUTE} · ${SELECTOR}\n--- injected ---\n${CANDIDATE.trim()}\n---`);

  for (const locale of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: WIDTHS[0], height: 900 }, deviceScaleFactor: 4 });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    if (PERSONA) await login(page, PERSONA);

    for (const width of WIDTHS) {
      const cell = `${TAG}-${width}-${locale}`;
      try {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        const lang = await page.evaluate(() => document.documentElement.lang);
        if (!String(lang).toLowerCase().startsWith(locale)) {
          throw new Error(`locale mismatch: asked ${locale}, <html lang> says "${lang}" — refusing to capture`);
        }
        for (const step of OPEN) await page.locator(step).first().click();

        const el = page.locator(SELECTOR).first();
        await el.waitFor({ state: "visible", timeout: 60_000 });
        await page.waitForTimeout(600);

        // ⛔ ONE CLIP FOR BOTH SHOTS, computed once. Re-measuring after the
        // injection would silently compare two different crops if the candidate
        // moved anything by a pixel, and the reader would call that a colour
        // change. A geometry change must show up as a MISALIGNMENT, loudly.
        const box = await el.boundingBox();
        const clip = {
          x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
          width: box.width + PAD * 2, height: Math.min(MAXH, box.height + PAD * 2),
        };

        const read = () => el.evaluate((n, prop) => getComputedStyle(n)[prop], PROP);
        const beforeVal = await read();
        await page.screenshot({ path: `${SHOT}/candidate/${cell}-A-shipped.png`, clip });

        await page.addStyleTag({ content: CANDIDATE });
        await page.waitForTimeout(200);
        const afterVal = await read();
        await page.screenshot({ path: `${SHOT}/candidate/${cell}-B-candidate.png`, clip });

        // ⛔ RAW, NOT geom(). `geom()` replaces every colour function with ▢ so the
        // geometry probe cannot mis-read L/C/H as R/G/B (§5b rule 12) — and that makes
        // it BLIND to a colour change: previewing --bg printed "▢" on both sides and
        // reported the injection had not applied. Comparing two raw strings for
        // equality is not parsing a colour, so it is safe here and it is the only
        // thing that can see a canvas atom at all.
        const took = String(beforeVal) !== String(afterVal);
        console.log(`\n── ${cell}  lang=${lang}  ${clip.width.toFixed(0)}x${clip.height.toFixed(0)} CSS px @4x`);
        console.log(`   A shipped   [${PROP}] : ${String(beforeVal).slice(0, 110)}`);
        console.log(`   B candidate [${PROP}] : ${String(afterVal).slice(0, 110)}`);
        // ⛔ A candidate that changed NOTHING is the failure mode this must shout
        // about: the selector missed, or the injected rule lost the cascade, and
        // both produce two identical images that read as "no visual risk".
        console.log(`   → ${took ? "the injection TOOK" : "⛔ NO CHANGE — the rule did not apply; this preview proves nothing"}`);
        report.push({ cell, lang, width, locale, prop: PROP, beforeVal, afterVal, took });
      } catch (err) {
        console.log(`\n── ${cell}  ⛔ FAILED: ${err.message}`);
        report.push({ cell, width, locale, error: err.message });
      }
    }
    await ctx.close();
  }

  await b.close();
  writeFileSync(`${SHOT}/candidate/report.json`, JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.error || !r.took);
  console.log(`\n${report.length - bad.length}/${report.length} cells previewed → ${SHOT}/candidate/`);
  console.log("⭐ OPEN THE -A- AND -B- PAIRS. This instrument decides nothing; it only lets you see.");
  process.exit(bad.length ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
