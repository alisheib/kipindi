#!/usr/bin/env node
/**
 * shot-sweep — a focused screenshot sweep over (route × width × locale), with the two
 * checks that make a screenshot count as EVIDENCE rather than decoration.
 *
 * `responsive-audit.mjs` is the exhaustive gauntlet: 99 routes × 9 widths, run before a
 * release. This is the other tool — point it at the four screens a change actually
 * touched, get the four widths and three locales, and READ the images. The design law
 * (DESIGN_AUTHORITY §A6, `50pick-standards` §4) is that a green suite is not proof; a
 * human has to look. This exists to make looking cheap enough to actually do.
 *
 * ⛔ THE LOCALE COMES FROM THE `kp-locale` COOKIE, SET ON THE CONTEXT — there is no
 * /api/locale route (E-106). Setting it after the first navigation shoots the previous
 * language. So it rides the context, and then `<html lang>` is read BACK and a mismatch
 * REFUSES to capture: a sweep that silently shoots the wrong language is worse than one
 * that fails, because its output looks like evidence.
 *
 * Each capture also asserts the two things an eye misses on a small image and a reviewer
 * will not check by hand: document-level horizontal overflow (§A6 — zero at 360, no
 * exceptions) and console/page errors.
 *
 * Usage:
 *   node scripts/shot-sweep.mjs --base http://localhost:3000 --out .50pick-shots/my-change \
 *        --routes /,/markets,/wallet [--widths 360,768,1280,1920] [--locales en,sw,zh] [--full]
 *        [--pre "/auth/demo?email=unverified"]
 *
 *   BASE defaults to http://localhost:3000; widths to the four in the design matrix;
 *   locales to `en`. `--full` captures the whole page rather than the viewport.
 *
 *   `--pre` visits one URL before the sweep and keeps its cookies, which is how an
 *   AUTHED sweep is driven: `/auth/demo` mints a 100k signed-in session locally (and is
 *   404 in production, so this is a local-only affordance). Its `?email=` parameter picks
 *   which side of the deposit email gate you land on — `unverified` is the one that puts
 *   the standing NoticeBar on every page. Half the surfaces worth photographing on this
 *   product are behind a session; without this they all photograph as the login screen,
 *   and a folder full of login screens reads as a completed sweep.
 *
 * ⚠️ On Git Bash, prefix with MSYS_NO_PATHCONV=1 or the shell rewrites a bare `/` route
 * into a Windows path and the sweep navigates somewhere absurd.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const has = (n) => process.argv.includes(`--${n}`);

const BASE = arg("base", process.env.BASE || "http://localhost:3000");
const OUT = arg("out", ".50pick-shots/sweep");
const ROUTES = arg("routes", "/").split(",").map((s) => s.trim()).filter(Boolean);
const WIDTHS = arg("widths", "360,768,1280,1920").split(",").map((s) => parseInt(s, 10));
const LOCALES = arg("locales", "en").split(",").map((s) => s.trim());
const FULL = has("full");
const PRE = arg("pre", null);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let shots = 0;
const problems = [];

for (const locale of LOCALES) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w <= 400 ? 780 : 900 },
      deviceScaleFactor: 1,
      storageState: {
        cookies: [{ name: "kp-locale", value: locale, domain: new URL(BASE).hostname, path: "/" }],
        origins: [],
      },
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 160)));

    if (PRE) {
      // REFUSE to sweep if the session was not actually minted. Silently photographing
      // the login page for every route is the failure mode this whole file exists to
      // prevent: it produces a folder that looks exactly like a finished authed sweep.
      try {
        await page.goto(BASE + PRE, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(600);
        const cookies = await ctx.cookies();
        if (!cookies.some((c) => /session/i.test(c.name))) {
          throw new Error("no session cookie after --pre; is this a production build? /auth/demo is 404 there");
        }
      } catch (e) {
        problems.push(`PRE FAILED @${w}(${locale}): ${String(e).slice(0, 200)} — sweep aborted for this context`);
        await ctx.close();
        continue;
      }
    }

    for (const route of ROUTES) {
      const slug = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
      errors.length = 0;
      try {
        // 40s+: the first hit on a cold Turbopack route genuinely takes ~30s.
        const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(900);

        const lang = await page.evaluate(() => document.documentElement.lang);
        if (lang !== locale) {
          problems.push(`LANG MISMATCH ${route}@${w}: wanted ${locale}, got "${lang}" — NOT captured`);
          continue;
        }
        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
        if (overflow > 1) problems.push(`H-OVERFLOW ${route}@${w}(${locale}): ${overflow}px`);
        if (resp && resp.status() >= 400) problems.push(`HTTP ${resp.status()} ${route}@${w}(${locale})`);
        if (errors.length) problems.push(`CONSOLE ${route}@${w}(${locale}): ${errors.slice(0, 3).join(" | ")}`);

        await page.screenshot({ path: path.join(OUT, `${slug}__${w}__${locale}.png`), fullPage: FULL });
        shots++;
      } catch (e) {
        problems.push(`FAIL ${route}@${w}(${locale}): ${String(e).slice(0, 160)}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();

console.log(`\ncaptured ${shots} shot(s) → ${OUT}`);
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log("  ✗ " + p);
} else {
  console.log("no overflow, no console errors, no lang mismatches.");
}
console.log("\n⚠️  The checks above are the floor, not the point. OPEN THE IMAGES.");
process.exit(problems.length ? 1 : 0);
