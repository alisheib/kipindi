/**
 * U43: the 320px market choice stays clear of the raised deposit rail when a
 * live ticker has its 32px slot. The local memory seed has no such
 * settlement, so the browser probe inserts an empty 32px layout stand-in.
 * No ticker event or price is invented or shown to a player.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
const rule = /@media\s*\(max-width:\s*359\.98px\)\s*and\s*\(max-height:\s*700px\)\s*\{\s*\.ticker-strip\s*~\s*main\s*\.market-grid\.mt-5\s*\{\s*margin-top:\s*var\(--sp-4\);\s*\}\s*\}/g;
const uncommented = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");
const sourceProblems = (source) => {
  const plain = uncommented(source);
  return [...plain.matchAll(rule)].length === 1 && /--sp-4:\s*16px/.test(plain) ? [] : ["ticker-scoped 320px grid lift absent or off its 16px rung"];
};
if (sourceProblems(CSS).length) throw new Error(sourceProblems(CSS).join("; "));

if (process.argv.includes("--prove-red")) {
  const olderGap = CSS.replace(".ticker-strip ~ main .market-grid.mt-5 { margin-top: var(--sp-4); }",
    ".ticker-strip ~ main .market-grid.mt-5 { margin-top: var(--sp-5); }");
  const unscoped = CSS.replace(".ticker-strip ~ main .market-grid.mt-5 { margin-top: var(--sp-4); }",
    "main .market-grid.mt-5 { margin-top: var(--sp-4); }");
  if (!sourceProblems(olderGap).length || !sourceProblems(unscoped).length) {
    throw new Error("the in-memory CSS reversals escaped the U43 market-rail source guard");
  }
  console.log("U43 market rail source RED: 2/2 reversals caught; source file unchanged");
  process.exit(0);
}

if (!process.argv.includes("--browser")) {
  console.log("U43 market rail source: scoped 16px ticker rule present");
  process.exit(0);
}

const BASE = (process.env.BASE || "http://localhost:3417").replace(/\/$/, "");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error("U43 market-rail browser probe is local only");
}
const { chromium } = await import("playwright");
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 640], [360, 740]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: "kp-locale", value: "sw", domain: new URL(BASE).hostname, path: "/" }]);
    try {
      const page = await context.newPage();
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.locator("article.mcardp button.btn-no").first().waitFor({ state: "visible", timeout: 30000 });
      await page.waitForTimeout(1000);
      const before = await page.evaluate(() => {
        const grid = document.querySelector('[data-board="grid"]');
        if (!grid?.classList.contains("mt-5") || document.documentElement.lang !== "sw") {
          throw new Error("market grid or Swahili premise absent");
        }
        return Number.parseFloat(getComputedStyle(grid).marginTop);
      });
      if (Math.abs(before - 24) > 0.5) throw new Error(`${width}px no-ticker grid margin ${before}px, expected 24px`);
      const ticker = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (!main) throw new Error("main absent");
        let strip = document.querySelector(".ticker-strip");
        if (!strip) {
          strip = document.createElement("div");
          strip.className = "ticker-strip";
          strip.setAttribute("aria-hidden", "true");
          strip.setAttribute("data-u43-layout-stand-in", "");
          strip.style.cssText = "height:32px;min-height:32px;flex:0 0 32px;padding:0";
          main.before(strip);
        }
        const box = strip.getBoundingClientRect();
        return { height: box.height, simulated: strip.hasAttribute("data-u43-layout-stand-in") };
      });
      if (Math.abs(ticker.height - 32) > 0.5) throw new Error(`${width}px ticker slot is ${ticker.height}px, expected 32px`);
      const sample = () => page.evaluate(() => {
        const grid = document.querySelector('[data-board="grid"]');
        const no = grid?.querySelector("article.mcardp button.btn-no");
        const coin = document.querySelector(".kp-rail .kp-coin");
        if (!grid || !no || !coin) throw new Error("market choice or centre rail premise absent");
        const box = no.getBoundingClientRect();
        const coinBox = coin.getBoundingClientRect();
        const x = box.left + 9, y = box.bottom - 3.5;
        const hit = document.elementFromPoint(x, y);
        return {
          gridMargin: Number.parseFloat(getComputedStyle(grid).marginTop),
          no: { top: box.top, bottom: box.bottom, height: box.height },
          coin: { top: coinBox.top, bottom: coinBox.bottom },
          sample: { x, y, ownsNo: !!hit && (hit === no || no.contains(hit)),
            target: hit?.closest("a,button")?.textContent?.trim().slice(0, 30) ?? null },
        };
      });
      const green = await sample();
      const wantedMargin = width === 320 ? 16 : 24;
      if (Math.abs(green.gridMargin - wantedMargin) > 0.5 || green.no.height < 40 || !green.sample.ownsNo) {
        throw new Error(`${width}px ticker-on NO hit failed: ${JSON.stringify(green)}`);
      }
      console.log(`${width}px ticker-on: grid ${green.gridMargin}px, NO y${green.no.top.toFixed(1)}–${green.no.bottom.toFixed(1)}, lower-left hit NO`);
      if (width === 320) {
        const reversal = await page.addStyleTag({ content:
          '@media(max-width:359.98px) and (max-height:700px){.ticker-strip ~ main .market-grid.mt-5{margin-top:24px!important}}' });
        const red = await sample();
        await reversal.evaluate((node) => node.remove());
        if (red.sample.ownsNo || red.sample.target !== "Amana" || Math.abs(red.gridMargin - 24) > 0.5) {
          throw new Error(`browser RED reversal did not restore the raised-rail interception: ${JSON.stringify(red)}`);
        }
        const restored = await sample();
        if (!restored.sample.ownsNo || Math.abs(restored.gridMargin - 16) > 0.5) {
          throw new Error(`browser source not restored after reversal: ${JSON.stringify(restored)}`);
        }
        console.log(`320px browser RED: old 24px margin hit ${red.sample.target}; restored 16px margin hits NO`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
