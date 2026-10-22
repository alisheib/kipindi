/** Local-only layout fixture for the truthful market-card move words. No market history is changed. */
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DayAgoMove } from "../../src/components/markets/market-card.tsx";
import { dict } from "../../src/lib/i18n-dict.ts";
import { sideWord } from "../../src/lib/side-label.ts";
import { assertLang } from "../qa-locale.mjs";

const BASE = process.env.BASE || "http://localhost:3417";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) {
  throw new Error("The synthetic layout fixture runs only against a local server");
}
const OUT = resolve(process.env.OUT || ".qa-shots/u43/market-move-layout");
const widths = [320, 360, 390];
const locales = ["sw", "en", "zh"] as const;
const moves = process.env.RED_MOVE_NOWRAP === "1" ? [3, 0] : [-3, -1, 0, 1, 3, 20];
const failures: string[] = [];
const results = [];
const browser = await chromium.launch();
try {
  for (const width of widths) for (const locale of locales) for (const move of moves) {
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, reducedMotion: "reduce" });
    try {
      await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await assertLang(page, locale);
      const first = page.locator('article.mcardp[data-market-choices="open"] .mcardp-moveline').first();
      await first.waitFor({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      const t = dict[locale].market;
      const html = renderToStaticMarkup(createElement(DayAgoMove, {
        move, keyed: true, side: sideWord(dict[locale], "YES", "MARKET"),
        labels: { one: t.h24MoveOne, many: t.h24MoveMany, flat: t.h24MoveFlat },
      }));
      await first.evaluate((line, markup) => {
        line.innerHTML = markup;
        const card = line.closest("article.mcardp");
        if (!card) throw new Error("Move line has no market card");
        const tag = document.createElement("div");
        tag.id = "u43-layout-fixture-label";
        tag.textContent = "LOCAL LAYOUT FIXTURE · NO OBSERVED PRICE HISTORY";
        tag.style.cssText = "padding:8px;margin-bottom:8px;background:#5b2e74;color:white;font:700 12px/1.35 sans-serif;letter-spacing:.03em";
        card.parentElement?.insertBefore(tag, card);
      }, html);
      if (process.env.RED_MOVE_NOWRAP === "1") {
        await page.addStyleTag({ content: ".mcardp-h24{white-space:nowrap!important;font-size:var(--type-micro)!important;line-height:1!important}" });
      }
      const measurement = await first.evaluate((line) => {
        const card = line.closest("article.mcardp")!;
        const moveEl = line.querySelector(".mcardp-h24")!;
        const parts = [".mcardp-q", ".mcardp-prob", ".mcardp-top", ".mcardp-actions"];
        const boxes = Object.fromEntries(parts.map((selector) => {
          const el = card.querySelector(selector);
          const r = el?.getBoundingClientRect();
          return [selector, r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null];
        }));
        const cardBox = card.getBoundingClientRect();
        const lineBox = line.getBoundingClientRect();
        const moveBox = moveEl.getBoundingClientRect();
        const text = [...moveEl.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        const range = document.createRange();
        if (text) range.selectNodeContents(text);
        const textRects = text ? [...range.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })) : [];
        return {
          text: moveEl.textContent,
          fontSize: getComputedStyle(moveEl).fontSize,
          whiteSpace: getComputedStyle(moveEl).whiteSpace,
          card: { left: cardBox.left, right: cardBox.right },
          line: { left: lineBox.left, right: lineBox.right, top: lineBox.top, bottom: lineBox.bottom },
          move: { left: moveBox.left, right: moveBox.right, top: moveBox.top, bottom: moveBox.bottom, scrollWidth: moveEl.scrollWidth, clientWidth: moveEl.clientWidth },
          textRects, boxes,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      results.push({ width, locale, move, ...measurement });
      const moveName = move === 0 ? "flat" : `${move > 0 ? "plus" : "minus"}-${Math.abs(move)}`;
      const label = `${width}/${locale}/${moveName}`;
      const within = (left: number, right: number) => left >= measurement.card.left - 1 && right <= measurement.card.right + 1;
      const title = measurement.boxes[".mcardp-q"];
      const prob = measurement.boxes[".mcardp-prob"];
      const status = measurement.boxes[".mcardp-top"];
      const actions = measurement.boxes[".mcardp-actions"];
      if (!title || !prob || !status || !actions || !measurement.text) failures.push(`${label}: missing card content`);
      if (!within(measurement.move.left, measurement.move.right) || measurement.textRects.some((r) => !within(r.left, r.right)) || measurement.move.scrollWidth > measurement.move.clientWidth + 1 || measurement.horizontalOverflow) {
        failures.push(`${label}: move words overflow card or viewport`);
      }
      if (measurement.move.top < measurement.line.top - 1 || measurement.move.bottom > measurement.line.bottom + 1 ||
          (title && measurement.line.top < title.bottom - 1) || (prob && measurement.line.top < prob.bottom - 1) ||
          (status && measurement.line.top < status.bottom - 1) || (actions && measurement.line.bottom > actions.top + 1)) {
        failures.push(`${label}: move words overlap title, probability, status, or choice`);
      }
      console.log(`${label}: ${measurement.text} · ${measurement.fontSize}, ${measurement.whiteSpace}, ${measurement.textRects.length} text line(s)`);
      if (width === 320 && process.env.RED_MOVE_NOWRAP !== "1") {
        mkdirSync(OUT, { recursive: true });
        await page.locator("#u43-layout-fixture-label").scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(OUT, `${locale}-${moveName}-320.png`) });
      }
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
if (process.env.RED_MOVE_NOWRAP !== "1") {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "measurements.json"), JSON.stringify({ base: BASE, results, failures }, null, 2));
}
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`U43 market move local layout fixture: ${failures.length ? `${failures.length} failed` : "all cells fit"}`);
if (failures.length) process.exitCode = 1;
