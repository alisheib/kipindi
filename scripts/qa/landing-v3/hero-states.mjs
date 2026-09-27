// Landing v3 · hero v3 — the hero's interaction and text-size states as viewport tiles (spec hero-v3 §11.4):
//   · 360 sw with the root text at 130% (an approximation of Android's font scale — the DEV row's real handsets
//     stay Ali's), the first screen and the next;
//   · keyboard focus on the primary CTA, the secondary CTA and the helpline link (focus-visible rings);
//   · pointer hover on the same three (1280 en — a hover-capable pointer).
//   BASE=http://localhost:3057 OUT=<dir> node scripts/qa/landing-v3/hero-states.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/hero/states";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function open(w, h, loc) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  const decline = page.getByTestId("consent-decline");
  if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important}" }).catch(() => {});
  const h1 = await page.locator("h1").first().textContent({ timeout: 15000 }).catch(() => null);
  if (!h1) throw new Error("no h1 — not the landing page");
  return { ctx, page };
}

try {
  // 130% root text, 360 × 780, sw
  {
    const { ctx, page } = await open(360, 780, "sw");
    await page.addStyleTag({ content: "html{font-size:130%!important}" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, "text130-360-sw-t0.png") });
    await page.evaluate(() => scrollBy(0, 684)); await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "text130-360-sw-t1.png") });
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(`${ov > 0 ? "FAIL" : "PASS"} 130% text: no horizontal overflow (${ov}px)`);
    await ctx.close();
  }
  // focus on the CTAs and the helpline, by keyboard, at 360 sw and 1280 en
  for (const [w, h, loc] of [[360, 780, "sw"], [1280, 800, "en"]]) {
    const { ctx, page } = await open(w, h, loc);
    const targets = [
      ["tel", '[data-band="hero"] a.kp-hero__tel'],
      ["cta1", '[data-band="hero"] .kp-hero__ctas a >> nth=0'],
      ["cta2", '[data-band="hero"] .kp-hero__ctas a >> nth=1'],
    ];
    for (const [name, sel] of targets) {
      const el = page.locator(sel).first();
      if (!(await el.count())) { console.log(`FAIL focus ${name} ${w}-${loc}: ${sel} not found`); continue; }
      await el.scrollIntoViewIfNeeded();
      await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab"); // enter keyboard modality
      await el.focus(); await page.waitForTimeout(250);
      const fv = await el.evaluate((n) => n.matches(":focus-visible"));
      await page.screenshot({ path: join(OUT, `focus-${name}-${w}-${loc}.png`) });
      console.log(`${fv ? "PASS" : "FAIL"} focus-visible on ${name} at ${w}-${loc}`);
      if (w >= 1024) {
        await page.mouse.move(1, 1); await el.blur();
        await el.hover(); await page.waitForTimeout(300);
        await page.screenshot({ path: join(OUT, `hover-${name}-${w}-${loc}.png`) });
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
