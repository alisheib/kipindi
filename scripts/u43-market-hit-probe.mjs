/** U43 market card: actual Info, Share and Details tap reach at narrow phone widths. */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.env.BASE || process.argv[3] || "http://localhost:3009";
const PATH = process.argv[4] || process.env.HIT_PATH || "/markets";
if (PATH !== "/markets" && PATH !== "/") throw new Error(`Unsupported market-card hit path: ${PATH}`);
const RED = process.env.RED_MARKET_HIT || "0";
const MIN = 40;
const WIDTHS = (process.env.HIT_WIDTHS || "320,360").split(",").map(Number).filter((width) => width === 320 || width === 360);
const LOCALES = (process.env.HIT_LOCALES || "sw,en,zh").split(",").filter((locale) => ["sw", "en", "zh"].includes(locale));
if (!WIDTHS.length || !LOCALES.length) throw new Error("Market hit probe has no supported width or locale");
const failures = [];
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    for (const locale of LOCALES) {
      const ctx = await localisedContext(browser, { locale, width, height: width === 320 ? 640 : 740, baseUrl: BASE, reducedMotion: "reduce" });
      try {
        const page = await ctx.newPage();
        await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 90000 });
        await assertLang(page, locale);
        await page.locator("article.mcardp").first().waitFor({ timeout: 20000 });
        if (RED === "reach") {
          // Replant the real 39.5px defect in this browser only. The application file is untouched.
          await page.addStyleTag({ content: ".mcardp-share::after,.mcardp-details::after{bottom:-14px!important}" });
        } else if (RED === "meta-margin" && PATH === "/markets") {
          // Replant the 320px Info/Share collision without editing the shared stylesheet.
          await page.addStyleTag({ content: "@media(max-width:359px){.mcardp-meta>.mcardp-meta-right{margin-left:auto!important}}" });
        } else if (RED === "featured-wrap" && PATH === "/") {
          // Put the larger featured pool back on the control row at 320px.
          await page.addStyleTag({ content: "@media(max-width:359px){.mcardp--featured .mcardp-meta>.mcardp-pool{flex-basis:auto!important}}" });
        }
        const cards = page.locator("article.mcardp");
        const count = await cards.count();
        if (count === 0) failures.push(`${PATH} ${width} ${locale}: no market cards to hit-test`);
        const measures = [];
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          // The card can be taller than a phone. Centre its control row, not the
          // whole card, or the fixed rail covers the row and fakes a small target.
          await card.locator(".mcardp-details").evaluate((node) => node.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" }));
          await page.waitForFunction((index) => {
            const node = document.querySelectorAll("article.mcardp")[index]?.querySelector(".mcardp-details");
            const box = node?.getBoundingClientRect();
            return !!box && box.top > 90 && box.bottom < innerHeight - 100;
          }, i, { timeout: 5000 });
          measures.push(await card.evaluate((article) => {
            const sample = (selector) => {
              const control = article.querySelector(selector);
              if (!control) return null;
              const box = control.getBoundingClientRect();
              if (box.width === 0 || box.height === 0) return null;
              const pseudo = getComputedStyle(control, "::after");
              const hasReach = pseudo.content !== "none" && pseudo.position === "absolute";
              const inset = (value) => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
              const left = hasReach ? box.left + inset(pseudo.left) : box.left;
              const top = hasReach ? box.top + inset(pseudo.top) : box.top;
              const width = hasReach ? inset(pseudo.width) : box.width;
              const height = hasReach ? inset(pseudo.height) : box.height;
              const owns = (hit) => !!hit && (hit === control || control.contains(hit));
              const centreX = left + width / 2, centreY = top + height / 2;
              let liveW = 0, liveH = 0;
              const missedX = [], missedY = [];
              for (let x = Math.floor(left); x < Math.ceil(left + width); x++) {
                const hit = document.elementFromPoint(x + 0.5, centreY);
                if (owns(hit)) liveW++;
                else if (missedX.length < 12) missedX.push({ x, tag: hit?.tagName ?? null, className: typeof hit?.className === "string" ? hit.className : null });
              }
              for (let y = Math.floor(top); y < Math.ceil(top + height); y++) {
                const hit = document.elementFromPoint(centreX, y + 0.5);
                if (owns(hit)) liveH++;
                else if (missedY.length < 12) missedY.push({ y, tag: hit?.tagName ?? null, className: typeof hit?.className === "string" ? hit.className : null });
              }
              return { boxW: box.width, boxH: box.height, reachW: width, reachH: height, liveW, liveH, missedX, missedY };
            };
            return {
              info: sample(".mcardp-info"),
              share: sample(".mcardp-share"),
              details: sample(".mcardp-details"),
            };
          }));
        }
        for (const control of ["info", "share", "details"]) {
          const rows = measures.map((m) => m[control]);
          if (rows.some((m) => !m)) {
            failures.push(`${PATH} ${width} ${locale}: ${control} absent on ${rows.filter((m) => !m).length}/${count} cards`);
            continue;
          }
          const minW = Math.min(...rows.map((m) => m.liveW));
          const minH = Math.min(...rows.map((m) => m.liveH));
          const minReachW = Math.min(...rows.map((m) => m.reachW));
          const minReachH = Math.min(...rows.map((m) => m.reachH));
          console.log(`${PATH} ${width} ${locale} ${control}: ${count} cards, smallest declared reach ${minReachW.toFixed(1)}×${minReachH.toFixed(1)}px, live hit ${minW}×${minH}px`);
          if (minReachW < MIN || minReachH < MIN || minW < MIN || minH < MIN) {
            const offenders = rows.flatMap((m, index) => m.reachW < MIN || m.reachH < MIN || m.liveW < MIN || m.liveH < MIN ? [index] : []);
            failures.push(`${PATH} ${width} ${locale}: ${control} live hit ${minW}×${minH}px, declared reach ${minReachW.toFixed(1)}×${minReachH.toFixed(1)}px below ${MIN}px on cards ${offenders.join(",")}`);
            console.error(`  first bad ${control} card ${offenders[0]}: ${JSON.stringify(rows[offenders[0]])}`);
          }
        }
      } finally {
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("U43 market-card hit geometry: all visible controls reach 40px in both axes");
}
