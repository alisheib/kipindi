#!/usr/bin/env node
/**
 * live-poll-board.mjs — what a REAL PLAYER actually sees on the poll board.
 *
 * ⛔ WHY A BROWSER AND NOT `curl`. /markets streams its grid inside a Suspense
 * boundary, so the first HTML response contains TWELVE SHIMMER SKELETONS and no
 * cards at all. Reading that response and counting `href="/markets/…"` reports an
 * empty board on a full one, and a full board on an empty one — it is measuring the
 * fallback. Every count here is taken from the LIVE DOM after the stream settles.
 *
 * It answers one question per time-window: **of the markets that are live, how many
 * does this window actually show a player**, and what does the page say when it
 * shows none.
 *
 * Usage:
 *   node scripts/live-poll-board.mjs                       # production
 *   node scripts/live-poll-board.mjs --base http://localhost:3000
 *   node scripts/live-poll-board.mjs --shots .qa-board     # + screenshots
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("--base", "https://50pick.tz").replace(/\/$/, "");
const SHOTS = arg("--shots", null);
const LOCALES = arg("--locales", "en").split(",");
const WIDTHS = arg("--widths", "360,768,1280").split(",").map(Number);

// The board's own five windows (src/app/markets/page.tsx). `today` is the DEFAULT —
// it is the one a player lands on with no query string at all, which is why it is
// listed first and probed twice (bare URL + explicit param must agree).
const WINDOWS = ["(default)", "soon", "today", "week", "all", "new"];

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/** Count what actually rendered, from the settled DOM. */
async function readBoard(page) {
  return page.evaluate(() => {
    const grid = document.querySelector(".market-grid");
    // A skeleton cell carries aria-hidden on the grid itself; a real card is a link.
    const skeleton = grid?.getAttribute("aria-hidden") === "true";
    const cards = Array.from(document.querySelectorAll('a[href^="/markets/mkt_"]'));
    const ids = Array.from(new Set(cards.map((a) => a.getAttribute("href"))));
    const main = document.querySelector("main");
    const text = (main?.innerText || "").replace(/\s+/g, " ").trim();
    // The "see wider" nudge and the empty state are the two ways out of a sparse
    // board. Record whether EITHER is present — a board showing nothing with no way
    // out is the failure this probe exists to catch.
    const nudge = Array.from(document.querySelectorAll("main a")).filter((a) =>
      /markets\?when=|\/markets$/.test(a.getAttribute("href") || ""),
    ).length;
    return {
      skeleton,
      gridCards: grid ? grid.querySelectorAll('a[href^="/markets/mkt_"]').length : 0,
      anyCards: ids.length,
      nudgeLinks: nudge,
      textHead: text.slice(0, 220),
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });
}

const browser = await chromium.launch();
let worst = 0;

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      locale,
      extraHTTPHeaders: { "Accept-Language": locale },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    console.log(`\n=== ${BASE} · ${locale} · ${width}px ===`);
    for (const w of WINDOWS) {
      const url = w === "(default)" ? `${BASE}/markets` : `${BASE}/markets?when=${w}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      // The grid streams. Wait for the skeleton to be REPLACED, not for a timeout —
      // a fixed sleep is what makes this class of probe report the fallback.
      await page
        .waitForFunction(() => document.querySelector(".market-grid")?.getAttribute("aria-hidden") !== "true", null, { timeout: 30_000 })
        .catch(() => {});
      const r = await readBoard(page);
      const flag = r.gridCards === 0 ? (r.nudgeLinks > 0 ? "⚠️ EMPTY (has a way out)" : "🔴 EMPTY, NO WAY OUT") : "✓";
      console.log(`  ${String(w).padEnd(10)} cards=${String(r.gridCards).padEnd(3)} nudges=${String(r.nudgeLinks).padEnd(3)} ${flag}${r.hasHorizontalOverflow ? `  🔴 H-OVERFLOW ${r.scrollW}>${r.clientW}` : ""}`);
      if (r.gridCards === 0 && r.nudgeLinks === 0) worst = 2;
      else if (r.gridCards === 0 && worst < 1) worst = 1;
      if (SHOTS) {
        await page.screenshot({ path: `${SHOTS}/board-${locale}-${width}-${w.replace(/[()]/g, "")}.png`, fullPage: false });
      }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(worst === 2 ? "\n🔴 a default board rendered NOTHING and offered no way out" : worst === 1 ? "\n⚠️ an empty board was found, but it offered a way out" : "\n✓ every window rendered cards");
process.exit(worst === 2 ? 2 : 0);
