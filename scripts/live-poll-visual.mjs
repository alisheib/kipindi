#!/usr/bin/env node
/**
 * live-poll-visual.mjs — the poll surfaces at every width and locale, MEASURED.
 *
 * ⛔ A SCREENSHOT IS NOT A CHECK. Shooting 27 PNGs and calling the pass "verified" is
 * how a clipped control ships: nobody opens 27 images, and the ones they do open are
 * the ones that look fine. Every cell below asserts something a machine can fail on —
 * horizontal overflow, a control under the tap floor, an untranslated key, a card that
 * did not render — and the images are kept as EVIDENCE for the failures, not as the
 * check itself.
 *
 * Usage:
 *   node scripts/live-poll-visual.mjs                          # production
 *   node scripts/live-poll-visual.mjs --base http://127.0.0.1:3000 --shots .qa-board/v
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://50pick.tz").replace(/\/$/, "");
const SHOTS = arg("--shots", null);
const WIDTHS = arg("--widths", "360,768,1280").split(",").map(Number);
const LOCALES = arg("--locales", "en,sw,zh").split(",");
const ROUTES = arg("--routes", "/markets,/markets?when=all,/results,/positions").split(",");

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ⚠️ 40px is the platform's money-control floor (Law 9). The board's filter pills are
// NAVIGATION, not money, and globals.css schedules the control-height bump as a
// separate phase — so they are measured and REPORTED at 40, but only a control that
// takes MONEY fails the run. Reporting without failing keeps the number honest
// without inventing a gate the design has not adopted yet.
const TAP_FLOOR = 40;

let hardFail = 0, softWarn = 0;
const rows = [];

const browser = await chromium.launch();

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      locale,
      extraHTTPHeaders: { "Accept-Language": locale },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

    for (const route of ROUTES) {
      const label = `${locale}·${width}·${route}`;
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForFunction(
          () => { const g = document.querySelector(".market-grid"); return !g || g.getAttribute("aria-hidden") !== "true"; },
          null, { timeout: 25_000 },
        ).catch(() => {});
        await page.waitForTimeout(700);

        const r = await page.evaluate((floor) => {
          const doc = document.documentElement;
          const overflow = doc.scrollWidth - doc.clientWidth;
          // Any element whose right edge crosses the viewport is what a reader
          // experiences as "the page slides sideways".
          const bleed = Array.from(document.querySelectorAll("main *")).filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && b.right > doc.clientWidth + 1;
          }).slice(0, 3).map((e) => `${e.tagName}.${(e.className || "").toString().split(" ")[0]}`);

          // ⛔ A MONEY CONTROL IS ONE THAT TAKES A STAKE. First cut of this probe
          // matched `.btn-primary` too and failed all 36 cells on the HEADER SIGN-UP
          // PILL — a 30px auth chip in the app bar, sized deliberately by
          // `--h-control-sm`, whose rise to 40 is a scheduled Phase-3 token bump
          // (globals.css). That is the instrument measuring its own list rather than
          // the product, and it is the same trap that made an earlier audit finding
          // about this floor collapse under scrutiny.
          // The controls that move money on a poll surface are the YES/NO stake
          // buttons. Everything else that is small is REPORTED, never failed.
          const money = Array.from(document.querySelectorAll("button.btn-yes, button.btn-no"));
          const shortMoney = money.map((e) => ({ t: (e.textContent || "").trim().slice(0, 18), h: +e.getBoundingClientRect().height.toFixed(1) }))
            .filter((x) => x.h > 0 && x.h < floor);

          // Navigation / auth chrome — reported only, with the smallest named so the
          // Phase-3 bump has a real before-number to move.
          const chrome = Array.from(document.querySelectorAll("aside nav a, a.btn-primary, button.btn-primary"));
          const shortPills = chrome.map((e) => +e.getBoundingClientRect().height.toFixed(1)).filter((h) => h > 0 && h < floor);

          const text = (document.querySelector("main")?.innerText || "");
          // A dictionary key that leaked into the UI, e.g. "market.noBetsYet".
          const rawKeys = (text.match(/\b(?:market|common|dialog|toast|error)\.[a-zA-Z]{3,}\b/g) || []).slice(0, 3);
          const cards = document.querySelectorAll('.market-grid a[href^="/markets/mkt_"]').length;
          return { overflow, bleed, shortMoney, shortPills: shortPills.length, minPill: shortPills.length ? Math.min(...shortPills) : null, rawKeys, cards, chars: text.length };
        }, TAP_FLOOR);

        const problems = [];
        if (r.overflow > 1) { problems.push(`H-OVERFLOW ${r.overflow}px [${r.bleed.join(", ")}]`); hardFail++; }
        if (r.shortMoney.length) { problems.push(`MONEY CONTROL < ${TAP_FLOOR}px: ${r.shortMoney.map((m) => `${m.t}=${m.h}`).join(", ")}`); hardFail++; }
        if (r.rawKeys.length) { problems.push(`UNTRANSLATED KEY: ${r.rawKeys.join(", ")}`); hardFail++; }
        if (r.chars < 200) { problems.push(`PAGE NEARLY EMPTY (${r.chars} chars)`); hardFail++; }
        if (r.shortPills) { problems.push(`nav pills < ${TAP_FLOOR}px: ${r.shortPills} (min ${r.minPill}) — reported, Phase-3 token bump`); softWarn++; }

        rows.push({ label, cards: r.cards, problems });
        console.log(`  ${problems.length === 0 ? "✓" : problems.some((p) => /reported/.test(p)) && problems.length === 1 ? "⚠️" : "🔴"} ${label.padEnd(34)} cards=${String(r.cards).padEnd(3)} ${problems.join(" · ")}`);
        if (SHOTS && problems.length) {
          await page.screenshot({ path: `${SHOTS}/FAIL-${locale}-${width}-${route.replace(/[/?=]/g, "_")}.png`, fullPage: false });
        }
      } catch (e) {
        rows.push({ label, problems: [`THREW ${e.message.slice(0, 60)}`] });
        console.log(`  🔴 ${label.padEnd(34)} THREW ${e.message.slice(0, 70)}`);
        hardFail++;
      }
    }
    const real = consoleErrors.filter((e) => !/favicon|DevTools|hmr|Cross-origin|ResizeObserver/i.test(e));
    if (real.length) { console.log(`  🔴 ${locale}·${width} console: ${real.slice(0, 2).join(" | ").slice(0, 160)}`); hardFail++; }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${"─".repeat(70)}`);
console.log(`  ${rows.length} cells · ${hardFail} FAILURES · ${softWarn} reported-only`);
console.log("─".repeat(70));
process.exit(hardFail === 0 ? 0 : 1);
