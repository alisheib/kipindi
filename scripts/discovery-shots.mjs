// Screenshot driver for the round-2 design inheritance.
// Run: LOCALES=en,sw,zh npm run qa:discovery-shots -- <outDir> [baseUrl]
// Shots are EVIDENCE and gitignored — write them under .qa-design-*/ (DESIGN_AUTHORITY §0b).
//
// 🔴 CORRECTED 2026-08-13. This driver used to set cookies named `locale` and `NEXT_LOCALE`.
// The product reads NEITHER — language comes from `kp-locale` only. Twelve frames labelled
// en/sw/zh were captured and read as trilingual evidence while eight of them were **English**
// (proven: with the old cookies the live site returns `<html lang="en">`). It now sets the real
// cookie through `scripts/qa-locale.mjs` and calls `assertLang` after every navigation, so a
// mismatch throws instead of producing a frame that merely LOOKS like evidence.
//
// Widths are the project matrix 360 / 768 / 1280 / 1920 (50pick-standards §4), not just two.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const OUT = process.argv[2] || "./shots";
const BASE = process.argv[3] || "http://localhost:3009";

/** `rail: true` = this route MUST expose a filter surface, so measuring nothing is a failure. */
const ROUTES = [
  { name: "landing", path: "/", rail: false },
  { name: "markets", path: "/markets", rail: true },
  // Filtered + empty states: the board's promise is only testable with controls PRESSED, and the
  // per-cause empty state is the surface most likely to read as a dead end.
  { name: "markets-filtered", path: "/markets?status=all&pool=10k&sort=pool", rail: true },
  { name: "markets-empty", path: "/markets?q=zzzqqqxx", rail: true },
  // /results is the platform's OTHER filtering board. It carries a category rail and a sort, so it
  // belongs in the same sweep — its filters were shipped without any visual or behavioural guard.
  { name: "results", path: "/results", rail: true },
  { name: "results-filtered", path: "/results?cat=macro&sort=volume", rail: true },
  { name: "results-empty", path: "/results?q=zzzqqqxx", rail: true },
];
const WIDTHS = [
  { name: "360", w: 360, h: 780 },
  { name: "768", w: 768, h: 1024 },
  { name: "1280", w: 1280, h: 900 },
  { name: "1920", w: 1920, h: 1080 },
];
const LOCALES = (process.env.LOCALES || "en").split(",");

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let n = 0;
const failures = [];
const rows = [];

for (const loc of LOCALES) {
  for (const vp of WIDTHS) {
    const ctx = await localisedContext(browser, { locale: loc, width: vp.w, height: vp.h, baseUrl: BASE });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 200)));

    for (const r of ROUTES) {
      const url = BASE + r.path;
      try {
        // Trap 10: first cold compile of a page under Turbopack is ~30s.
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
        const status = resp ? resp.status() : 0;
        // ⛔ Before measuring or capturing ANYTHING: prove the page is in the language asked for.
        await assertLang(page, loc);
        await page.waitForTimeout(600);
        const file = `${OUT}/${r.name}-${vp.name}-${loc}.png`;
        await page.screenshot({ path: file, fullPage: true });

        const m = await page.evaluate(() => {
          const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          // Either board's filter surface. ⛔ It used to look only for `.kp-discovery-bar`, so on
          // /results it measured NOTHING and printed "controls=0 minTap=-1" next to real readings —
          // a check that names tap targets and clipping while testing neither.
          const bar = document.querySelector(".kp-discovery-bar, [data-filter-rail]");
          // Tap targets: every interactive control inside the bar. A control under 44px on a
          // phone is a miss the eye forgives and a thumb does not.
          const controls = bar ? [...bar.querySelectorAll("a,button,select,[role=option],[role=button]")] : [];
          const boxes = controls
            .map((el) => el.getBoundingClientRect())
            .filter((b) => b.width > 0 && b.height > 0);
          const minH = boxes.length ? Math.round(Math.min(...boxes.map((b) => b.height))) : -1;
          // A clip inside an intermediate row never reaches the document edge — measure every
          // scroll container against ITS OWN scrollWidth (50pick-standards §4).
          const clipped = bar
            ? [...bar.querySelectorAll("*")].filter((el) => {
                const s = getComputedStyle(el);
                if (s.overflowX === "auto" || s.overflowX === "scroll") return false; // scrolling is the design
                return el.scrollWidth - el.clientWidth > 1;
              }).length
            : 0;
          return {
            docOverflow,
            barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : -1,
            controls: controls.length,
            minControlH: minH,
            clippedInBar: clipped,
          };
        });

        n++;
        const line =
          `${status} ${r.name.padEnd(17)} ${vp.name.padEnd(5)} ${loc}  overflowX=${m.docOverflow}px` +
          `  bar=${m.barHeight}px  controls=${m.controls}  minTap=${m.minControlH}px  clippedInBar=${m.clippedInBar}` +
          `${consoleErrors.length ? "  CONSOLE_ERRORS=" + consoleErrors.length : ""}`;
        console.log(line);
        rows.push(line);

        if (status !== 200) failures.push(`${r.path} ${vp.name} ${loc} -> HTTP ${status}`);
        if (m.docOverflow > 0) failures.push(`${r.path} ${vp.name} ${loc} -> overflowX ${m.docOverflow}px`);
        if (m.clippedInBar > 0) failures.push(`${r.path} ${vp.name} ${loc} -> ${m.clippedInBar} clipped node(s) inside the bar`);
        // Only the phone width is held to the tap-target floor.
        if (vp.w <= 480 && m.minControlH > 0 && m.minControlH < 40) {
          failures.push(`${r.path} ${vp.name} ${loc} -> smallest bar control ${m.minControlH}px (< 40px)`);
        }
        // ⛔ AND A MEASUREMENT OF NOTHING IS NOT A PASS. Every route in this sweep is a filtering
        // board, so each one must expose a filter surface; `controls=0` means the selector missed
        // it, which is exactly how /results was swept twelve times while nothing was measured.
        if (r.rail && m.controls === 0) {
          failures.push(`${r.path} ${vp.name} ${loc} -> no filter controls found (measured nothing)`);
        }
      } catch (e) {
        failures.push(`${r.path} ${vp.name} ${loc} -> ${String(e.message).slice(0, 160)}`);
        console.log(`FAIL ${r.name} ${vp.name} ${loc}: ${String(e.message).slice(0, 160)}`);
      }
    }
    if (consoleErrors.length) {
      console.log(`  console errors (${loc}/${vp.name}): ${consoleErrors.slice(0, 3).join(" | ")}`);
    }
    await ctx.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/MEASUREMENTS.txt`, rows.join("\n") + "\n", "utf8");
console.log(`\n${n} screenshots -> ${OUT}`);
if (failures.length) {
  console.log("FAILURES:");
  failures.forEach((f) => console.log("  " + f));
  process.exit(1);
}
console.log("no failures");
