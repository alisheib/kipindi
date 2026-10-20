/** U43: the shared split instrument reads a price, never a payout. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const read = (path) => readFileSync(resolve(path), "utf8");
const css = read(process.env.U43_BAR_CSS || "src/app/globals.css");
const market = read("src/components/markets/market-card.tsx");
const round = read("src/components/updown/updown-card.tsx");
const brand = read("src/components/brand.tsx");
const positions = read(process.env.U43_POSITION_SOURCE || "src/components/positions/pnl-summary-strip.tsx");
const positionDial = positions.slice(positions.indexOf("function NeedleDial"));
let failed = 0;
function check(id, description, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${description}`);
  if (!pass) failed++;
}

check("1.1", "both U43 cards use the shared bar", market.includes("<TippingBar ") && round.includes("<TippingBar "));
check("1.2", "each shared reading token has one definition", ["bar-needle", "bar-needle-glow", "bar-shimmer", "bar-sweep"].every((name) => [...css.matchAll(new RegExp(`^\\s*--${name}\\s*:`, "gm"))].length === 1));
check("1.3", "the component renders the tested marker and effects", brand.includes('className="tipbar-needle"') && brand.includes('className="tipbar-shimmer"') && brand.includes('className="tipbar-sweep"'));
check("1.4", "the positions dial can show a zero win rate", positions.includes("const winRate = settledCount > 0 ? Math.round((effWins / settledCount) * 100) : 0;") && positions.includes("<NeedleDial rate={winRate} />"));
check("1.5", "the win-rate needle and hub consume neutral reading ink", positionDial.includes('stroke="var(--bar-needle)"') && positionDial.includes('fill="var(--bar-needle)"') && !positionDial.includes('var(--gilt)'));

let browser;
try {
  browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await page.setContent(`<div class="tipbar-rail" style="--tb-h:14px;width:240px">
    <div class="tipbar-fill tipbar-yes" style="width:62%"></div>
    <div class="tipbar-fill tipbar-no" style="width:38%"></div>
    <div class="tipbar-needle"></div><div class="tipbar-shimmer"></div><div class="tipbar-sweep"></div>
  </div><div id="reference"></div><div id="gold-reference"></div>`);
  await page.addStyleTag({ content: css });
  const result = await page.evaluate(() => {
    const ref = document.querySelector("#reference");
    const gold = document.querySelector("#gold-reference");
    ref.style.cssText = `color:var(--text);box-shadow:0 0 12px color-mix(in oklab, var(--text) 40%, transparent);
      background-image:linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--text) 32%, transparent) 50%, transparent 100%)`;
    gold.style.color = "var(--gilt)";
    const sweep = document.createElement("div");
    sweep.style.backgroundImage = "linear-gradient(90deg, transparent 0%, transparent 20%, color-mix(in oklab, var(--text) 65%, transparent) 50%, transparent 80%, transparent 100%)";
    document.body.append(sweep);
    const marker = getComputedStyle(document.querySelector(".tipbar-needle"));
    const expected = getComputedStyle(ref);
    const shimmer = getComputedStyle(document.querySelector(".tipbar-shimmer"), "::after");
    const recast = getComputedStyle(document.querySelector(".tipbar-sweep"), "::after");
    const yes = getComputedStyle(document.querySelector(".tipbar-yes"));
    const no = getComputedStyle(document.querySelector(".tipbar-no"));
    return {
      needle: marker.backgroundColor,
      neutral: expected.color,
      gold: getComputedStyle(gold).color,
      glow: marker.boxShadow,
      neutralGlow: expected.boxShadow,
      shimmer: shimmer.backgroundImage,
      neutralShimmer: expected.backgroundImage,
      sweep: recast.backgroundImage,
      neutralSweep: getComputedStyle(sweep).backgroundImage,
      yes: yes.backgroundImage,
      no: no.backgroundImage,
    };
  });
  check("2.1", "the rendered needle is neutral and distinct from gilt", result.needle === result.neutral && result.needle !== result.gold && result.needle !== "rgba(0, 0, 0, 0)");
  check("2.2", "the rendered needle glow follows neutral ink", result.glow === result.neutralGlow && result.glow !== "none");
  check("2.3", "the settled shimmer is neutral", result.shimmer === result.neutralShimmer && result.shimmer !== "none");
  check("2.4", "the hover sweep is neutral", result.sweep === result.neutralSweep && result.sweep !== "none");
  check("2.5", "YES and NO retain distinct side fills", result.yes !== "none" && result.no !== "none" && result.yes !== result.no);
} catch (error) {
  check("2.0", `browser style read completed: ${String(error)}`, false);
} finally {
  await browser?.close();
}

console.log(`U43 BAR INK: ${failed} failed`);
process.exit(failed ? 1 : 0);
