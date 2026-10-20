/** Local browser audit of every classic MarketCard mounting route at the narrow Swahili width. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLang } from "../qa-locale.mjs";

const BASE = process.env.BASE || "http://localhost:3417";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) {
  throw new Error("The signed-in route audit runs only against a local server");
}
const OUT = resolve(process.env.OUT || ".qa-shots/u43/market-card-routes");
const browser = await chromium.launch();
const failures = [];
const results = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (let i = 0; i < 40 && !(await ctx.cookies()).some((c) => c.name === "kp_session"); i++) await page.waitForTimeout(250);
  if (!(await ctx.cookies()).some((c) => c.name === "kp_session")) throw new Error("Local demo sign-in set no session cookie");
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await assertLang(page, "sw");
  await page.locator("article.mcardp").first().waitFor({ timeout: 20000 });
  const detail = await page.locator("article.mcardp a.mcardp-details").first().getAttribute("href");
  if (!detail?.startsWith("/markets/")) throw new Error("No market detail link found for route audit");

  // Star one real local market through the player control, so /watchlist has a card to inspect.
  await page.goto(`${BASE}${detail}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await assertLang(page, "sw");
  await page.waitForLoadState("load");
  await page.locator("button[aria-label]").first().waitFor({ timeout: 20000 });
  const follow = page.getByRole("button", { name: "Fuatilia soko hili" }).first();
  const following = page.getByRole("button", { name: "Acha kufuatilia soko hili" }).first();
  if (await follow.count()) {
    await follow.click();
    await following.waitFor({ timeout: 10000 });
  } else if (!(await following.count())) {
    const names = await page.locator("button[aria-label]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    throw new Error(`Market detail has no usable follow control for the local watchlist probe: ${JSON.stringify(names)}`);
  }

  for (const route of ["/", "/markets", "/watchlist", "/results", detail, "/live"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await assertLang(page, "sw");
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator("article.mcardp");
    const count = await cards.count();
    const liveCount = await page.locator('article.mcardp[data-market-choices="open"]').count();
    const routeResult = { route, count, liveCount, titles: [], blockedTargets: [], needle: null };
    if (route === "/" || route === "/markets" || route === "/watchlist") {
      if (liveCount === 0) failures.push(`${route}: expected a live classic market card after local follow`);
    }
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const checked = await card.evaluate((el) => {
        const q = el.querySelector(".mcardp-q");
        const row = el.querySelector(".mcardp-actions");
        if (!q) return { error: "missing question" };
        const rect = q.getBoundingClientRect();
        const clone = q.cloneNode(true);
        clone.style.cssText += `;position:absolute;visibility:hidden;pointer-events:none;width:${rect.width}px;min-height:0;display:block;-webkit-line-clamp:unset;overflow:visible`;
        q.parentElement.appendChild(clone);
        const fullHeight = clone.getBoundingClientRect().height;
        clone.remove();
        return {
          title: q.textContent?.trim(), open: el.getAttribute("data-market-choices") === "open",
          final: el.getAttribute("data-market-result") === "final",
          shownHeight: rect.height, fullHeight,
          gapToChoices: row ? row.getBoundingClientRect().top - rect.bottom : null,
        };
      });
      routeResult.titles.push(checked);
      if (checked.error || ((checked.open || checked.final) && (checked.shownHeight + 1 < checked.fullHeight || (checked.open && checked.gapToChoices < 0)))) {
        failures.push(`${route} card ${i}: active choice or final verdict obscures part of its proposition`);
      }
      for (const target of await card.locator(".mcardp-actions button, .mcardp-details").all()) {
        await target.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const visibility = await target.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const samples = [[(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.right - 3, (r.top + r.bottom) / 2]];
          return samples.map(([x, y]) => {
            if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return { x, y, offscreen: true };
            const top = document.elementFromPoint(x, y);
            return { x, y, clear: !!top && (el === top || el.contains(top)), blocker: top?.closest("#needle-root, #chat-root")?.id ?? null };
          });
        });
        if (visibility.some((sample) => sample.blocker)) {
          routeResult.blockedTargets.push({ card: i, className: await target.getAttribute("class"), visibility });
          failures.push(`${route} card ${i}: floating helper covers a card control`);
        }
      }
    }
    routeResult.needle = await page.locator("#needle-root").evaluate((node) => ({ hidden: node.hidden, display: getComputedStyle(node).display })).catch(() => null);
    if (count > 0 && ["/", "/markets", "/watchlist", "/results", detail].includes(route) &&
        (!routeResult.needle || (!routeResult.needle.hidden && routeResult.needle.display !== "none"))) {
      failures.push(`${route}: Needle is visible against a classic market card`);
    }
    results.push(routeResult);
    console.log(`${route}: ${count} classic cards, ${liveCount} active, ${routeResult.blockedTargets.length} controls under floating helpers, Needle ${routeResult.needle?.display ?? "absent"}`);
    if (count > 0) {
      mkdirSync(OUT, { recursive: true });
      await cards.first().screenshot({ path: resolve(OUT, `${route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-/, "")}-320-sw.png`) });
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "measurements.json"), JSON.stringify({ base: BASE, results, failures }, null, 2));
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`U43 classic market card routes: ${failures.length ? `${failures.length} failed` : "all visible controls clear"}`);
if (failures.length) process.exitCode = 1;
