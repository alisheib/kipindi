#!/usr/bin/env node
/**
 * PLAYER QUERY — the look-at-it driver.
 *
 * `test:responsive` proves a page does not OVERFLOW. It cannot prove a rail is readable, that a
 * Swahili label has not eaten the row, or that the lens a player just pressed is the one on
 * screen. ⭐ Those are judgements a person makes from an image, and this is what produces the
 * images: full-page captures of each query surface, per locale, per width, plus the phone sheet
 * OPENED — which is the one control a viewport screenshot can never show, because it is a
 * `<details>` that is shut on load.
 *
 * ⛔ IT REFUSES TO CAPTURE THE WRONG LANGUAGE. The locale comes from the `kp-locale` cookie set on
 * the CONTEXT (there is no `/api/locale` route — E-106), and `<html lang>` is read back before
 * every shot. A sweep that silently shoots `en` while claiming `sw` produces output that LOOKS
 * like evidence, which is worse than producing none.
 *
 * ⛔ AND IT REFUSES TO CAPTURE AN EMPTY PAGE. A rail that renders nothing because the fixture is
 * empty is indistinguishable, in an image, from a rail that is broken — the exact confusion that
 * cost this campaign an afternoon. Each surface declares a string that must be present.
 *
 *   node scripts/live/player-query-shots.mjs [baseUrl] [--only=/positions] [--widths=360,1280]
 *
 * Shots → .50pick-shots/player-query/<surface>-<width>-<locale>[-sheet].png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = arg("only", null);
const WIDTHS = arg("widths", "360,1280").split(",").map(Number);
const LOCALES = arg("locales", "sw,en,zh").split(",");
const OUT = ".50pick-shots/player-query";
mkdirSync(OUT, { recursive: true });

/** `<html lang>` per locale — the value the product actually writes. */
const LANG = { en: "en", sw: "sw", zh: "zh" };

/**
 * ⚠️ `must` IS THE VACUITY GUARD, and it is per-surface rather than one shared string: each page
 * proves it rendered its OWN rail. A shot of a login redirect is a 200 with a pretty page on it.
 */
const SURFACES = [
  { id: "positions", path: "/positions", must: "data-filter-rail", sheet: true },
  { id: "positions-won", path: "/positions?tab=win", must: "data-filter-rail", sheet: false },
  { id: "positions-empty", path: "/positions?q=zzzznomatch", must: "data-filter-rail", sheet: false },
  { id: "udhistory", path: "/updown/history", must: "data-filter-rail", sheet: true },
  { id: "wallet", path: "/wallet", must: "data-filter-rail", sheet: true },
  { id: "wallet-payouts", path: "/wallet?type=payout", must: "data-filter-rail", sheet: false },
  { id: "wallet-empty", path: "/wallet?q=zzzznomatch", must: "data-filter-rail", sheet: false },
  { id: "results", path: "/results", must: "data-filter-rail", sheet: true },
  { id: "markets", path: "/markets", must: "data-filter-rail", sheet: true },
];

const surfaces = ONLY ? SURFACES.filter((s) => s.path.startsWith(ONLY) || s.id === ONLY.replace("/", "")) : SURFACES;
if (surfaces.length === 0) {
  console.error(`🔴 --only=${ONLY} matched no surface — refusing to report a clean run over nothing.`);
  process.exit(3);
}

let shots = 0;
const problems = [];

const browser = await chromium.launch();
try {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: width < 500 ? 780 : 900 },
        deviceScaleFactor: 1,
      });
      // ⛔ On the CONTEXT, so it is present on the FIRST request — a cookie set after navigation
      //    shoots the previous language.
      await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      const page = await ctx.newPage();

      // Sign in. ⚠️ One live session per account (the durable single-session model), so every
      // context re-authenticates and the previous one is revoked — which is why this loop is
      // serial and must stay serial.
      const auth = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
      if (!auth || auth.status() >= 400) {
        problems.push(`${locale} ${width}: /auth/demo failed (${auth ? auth.status() : "no response"})`);
        await ctx.close();
        continue;
      }

      for (const s of surfaces) {
        const res = await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
        if (!res || res.status() >= 400) {
          problems.push(`${s.id} ${locale} ${width}: HTTP ${res ? res.status() : "none"}`);
          continue;
        }
        await page.waitForTimeout(900);

        const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
        if (lang !== LANG[locale]) {
          problems.push(`${s.id} ${locale} ${width}: REFUSED — <html lang="${lang}">, expected "${LANG[locale]}"`);
          continue;
        }
        const html = await page.content();
        if (!html.includes(s.must)) {
          problems.push(`${s.id} ${locale} ${width}: REFUSED — "${s.must}" absent, the page rendered nothing to look at`);
          continue;
        }

        await page.screenshot({ path: `${OUT}/${s.id}-${width}-${locale}.png`, fullPage: true });
        shots++;

        // The phone sheet — shut on load, so a plain capture can never show it.
        if (s.sheet && width < 500) {
          const trigger = page.locator("summary.kp-fsheet-trigger, .kp-fsheet > summary").first();
          if (await trigger.count()) {
            await trigger.click({ timeout: 5_000 }).catch(() => {});
            await page.waitForTimeout(700);
            await page.screenshot({ path: `${OUT}/${s.id}-${width}-${locale}-sheet.png` });
            shots++;
          } else {
            problems.push(`${s.id} ${locale} ${width}: the phone sheet trigger was not found`);
          }
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${shots} shot(s) → ${OUT}`);
if (problems.length) {
  console.error("\n🔴 problems:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
// ⛔ Zero shots is a skipped run, not a pass.
if (shots === 0) {
  console.error("🔴 ZERO shots captured — this is a SKIPPED RUN, not a pass.");
  process.exit(3);
}
console.log("✅ every surface rendered its rail in the language it claimed. NOW LOOK AT THEM.");
