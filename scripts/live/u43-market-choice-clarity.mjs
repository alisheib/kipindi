/** U43 B4: a live choice is only offered below its whole question, with no floating Needle over the card. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLang } from "../qa-locale.mjs";

const BASE = process.env.BASE || "http://localhost:3417";
const origin = new URL(BASE);
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error("This signed-in demo probe runs only against a local dev server");
}
const WIDTHS = (process.env.WIDTHS || "320,360,390").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const OUT = resolve(process.env.OUT || ".qa-shots/u43/market-choice-clarity");
const RED = process.env.RED_TITLE_CLAMP === "1" || process.env.RED_RESULT_CLAMP === "1";
const failures = [];
const results = [];
const browser = await chromium.launch();
try {
  const auth = await browser.newContext();
  const login = await auth.newPage();
  await login.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (let i = 0; i < 40 && !(await auth.cookies()).some((c) => c.name === "kp_session"); i++) {
    await login.waitForTimeout(250);
  }
  const signedIn = await auth.storageState();
  await auth.close();
  if (!signedIn.cookies.some((c) => c.name === "kp_session")) throw new Error("Local demo sign-in set no session cookie");

  for (const width of WIDTHS) for (const locale of LOCALES) {
    if (!Number.isInteger(width) || width < 320 || !["sw", "en", "zh"].includes(locale)) {
      throw new Error(`Invalid market clarity cell ${width}/${locale}`);
    }
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 390 ? 740 : 900 },
      storageState: signedIn,
      reducedMotion: "reduce",
    });
    try {
      await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await assertLang(page, locale);
      await page.locator("article.mcardp .mcardp-actions:not(.mcardp-actions--single)").first().waitFor({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      if (process.env.RED_TITLE_CLAMP === "1") await page.addStyleTag({ content: '.mcardp[data-market-choices="open"] .mcardp-q{display:-webkit-box!important;-webkit-line-clamp:2!important;overflow:hidden!important}' });
      if (process.env.RED_RESULT_CLAMP === "1") await page.addStyleTag({ content: '.mcardp[data-market-result="final"] .mcardp-q{display:-webkit-box!important;-webkit-line-clamp:2!important;overflow:hidden!important}' });

      const measured = await page.evaluate(() => {
        const cards = [...document.querySelectorAll("article.mcardp")].filter((card) => card.querySelector(".mcardp-actions:not(.mcardp-actions--single)"));
        const needle = document.querySelector("#needle-root");
        return {
          needle: needle ? { hidden: needle.hidden, display: getComputedStyle(needle).display } : null,
          cards: cards.map((card) => {
            const heading = card.querySelector(".mcardp-q");
            const actions = card.querySelector(".mcardp-actions");
            const choiceCount = actions?.querySelectorAll("button").length ?? 0;
            if (!heading || !actions) return { error: "missing title or choice row" };
            const title = heading.textContent?.trim() ?? "";
            const box = heading.getBoundingClientRect();
            const actionBox = actions.getBoundingClientRect();
            const clone = heading.cloneNode(true);
            clone.style.position = "absolute";
            clone.style.visibility = "hidden";
            clone.style.pointerEvents = "none";
            clone.style.width = `${box.width}px`;
            clone.style.minHeight = "0";
            clone.style.display = "block";
            clone.style.webkitLineClamp = "unset";
            clone.style.overflow = "visible";
            clone.style.setProperty("display", "block", "important");
            clone.style.setProperty("-webkit-line-clamp", "unset", "important");
            clone.style.setProperty("overflow", "visible", "important");
            heading.parentElement.appendChild(clone);
            const fullHeight = clone.getBoundingClientRect().height;
            clone.remove();
            const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
            return {
              title, choiceCount, shownHeight: box.height, fullHeight, fullLines: fullHeight / lineHeight,
              gapToChoice: actionBox.top - box.bottom, clamp: getComputedStyle(heading).webkitLineClamp,
              horizontalFit: box.left >= -1 && box.right <= innerWidth + 1,
            };
          }),
        };
      });
      const settled = await page.evaluate(() => [...document.querySelectorAll('article.mcardp[data-market-result="final"]')].map((card) => {
        const heading = card.querySelector(".mcardp-q");
        if (!heading) return { error: "missing result title" };
        const box = heading.getBoundingClientRect();
        const clone = heading.cloneNode(true);
        clone.style.cssText += `;position:absolute;visibility:hidden;pointer-events:none;width:${box.width}px;min-height:0;display:block;-webkit-line-clamp:unset;overflow:visible`;
        clone.style.setProperty("display", "block", "important");
        clone.style.setProperty("-webkit-line-clamp", "unset", "important");
        clone.style.setProperty("overflow", "visible", "important");
        heading.parentElement.appendChild(clone);
        const fullHeight = clone.getBoundingClientRect().height;
        clone.remove();
        const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
        return { title: heading.textContent?.trim(), shownHeight: box.height, fullHeight, fullLines: fullHeight / lineHeight };
      }));
      results.push({ width, locale, ...measured, settled });
      if (!measured.needle || (!measured.needle.hidden && measured.needle.display !== "none")) {
        failures.push(`${width}/${locale}: signed-in Needle is visible on live market choices`);
      }
      if (measured.cards.length === 0) failures.push(`${width}/${locale}: no live choice cards`);
      measured.cards.forEach((card, i) => {
        if (card.error || !card.title || card.choiceCount !== 2 || card.shownHeight + 1 < card.fullHeight || card.gapToChoice < 0 || !card.horizontalFit) {
          failures.push(`${width}/${locale} card ${i}: question hidden or controls overlap — ${JSON.stringify(card)}`);
        }
      });
      settled.forEach((card, i) => {
        if (card.error || !card.title || card.shownHeight + 1 < card.fullHeight) {
          failures.push(`${width}/${locale} result ${i}: final question hidden — ${JSON.stringify(card)}`);
        }
      });
      if (width === 320 && locale === "sw" && !measured.cards.some((card) => card.fullLines > 2.5)) {
        failures.push("320/sw: missing a three-line live question, so this cell cannot prove the old clamp is gone");
      }
      if (width === 320 && locale === "sw" && !settled.some((card) => card.fullLines > 2.5)) {
        failures.push("320/sw: missing a three-line final result, so this cell cannot prove the old clamp is gone");
      }
      const maxLines = Math.max(...measured.cards.map((card) => card.fullLines ?? 0));
      console.log(`${width}/${locale}: ${measured.cards.length} live, ${settled.length} final cards; longest live ${maxLines.toFixed(1)} lines, Needle ${measured.needle?.display ?? "missing"}`);
      if (!RED && ((width === 320 && locale === "sw") || (width === 390 && ["en", "zh"].includes(locale)))) {
        mkdirSync(OUT, { recursive: true });
        await page.locator("article.mcardp").first().screenshot({ path: resolve(OUT, `market-card-player-${width}-${locale}.png`) });
        if (width === 320 && locale === "sw" && settled.length) {
          await page.screenshot({ path: resolve(OUT, "markets-viewport-player-320-sw.png") });
          await page.locator('article.mcardp[data-market-result="final"]').first().screenshot({ path: resolve(OUT, "market-card-result-320-sw.png") });
        }
      }
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
if (!RED) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "measurements.json"), JSON.stringify({ base: BASE, results, failures }, null, 2));
}
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("U43 live market questions and card actions: full title visible, Needle hidden");
}
