// Screenshot driver for the round-2 design inheritance.
// Run: LOCALES=en,sw,zh npm run qa:discovery-shots -- <outDir> [baseUrl]
// Shots are EVIDENCE and gitignored — write them under .qa-design-*/ (DESIGN_AUTHORITY §0b).
// Captures the three surfaces under change at 1280 and 360, in en/sw/zh.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "./shots";
const BASE = process.argv[3] || "http://localhost:3009";

const ROUTES = [
  { name: "landing", path: "/" },
  { name: "markets", path: "/markets" },
];
const WIDTHS = [
  { name: "1280", w: 1280, h: 900 },
  { name: "360", w: 360, h: 780 },
];
const LOCALES = (process.env.LOCALES || "en").split(",");

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let n = 0;
const failures = [];

for (const loc of LOCALES) {
  for (const vp of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
      locale: loc === "zh" ? "zh-CN" : loc === "sw" ? "sw-TZ" : "en-US",
    });
    // The app reads locale from a cookie.
    await ctx.addCookies([
      { name: "locale", value: loc, url: BASE },
      { name: "NEXT_LOCALE", value: loc, url: BASE },
    ]);
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
        await page.waitForTimeout(600);
        const file = `${OUT}/${r.name}-${vp.name}-${loc}.png`;
        await page.screenshot({ path: file, fullPage: true });
        // Horizontal overflow check — the mobile killer.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        n++;
        console.log(
          `${status} ${r.name} ${vp.name} ${loc}  overflowX=${overflow}px  ${consoleErrors.length ? "CONSOLE_ERRORS=" + consoleErrors.length : ""}`,
        );
        if (status !== 200) failures.push(`${r.path} ${vp.name} ${loc} -> HTTP ${status}`);
        if (overflow > 0) failures.push(`${r.path} ${vp.name} ${loc} -> overflowX ${overflow}px`);
      } catch (e) {
        failures.push(`${r.path} ${vp.name} ${loc} -> ${String(e.message).slice(0, 120)}`);
        console.log(`FAIL ${r.name} ${vp.name} ${loc}: ${String(e.message).slice(0, 120)}`);
      }
    }
    if (consoleErrors.length) {
      console.log(`  console errors (${loc}/${vp.name}): ${consoleErrors.slice(0, 3).join(" | ")}`);
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${n} screenshots -> ${OUT}`);
if (failures.length) {
  console.log("FAILURES:");
  failures.forEach((f) => console.log("  " + f));
  process.exit(1);
}
console.log("no failures");
