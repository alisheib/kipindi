#!/usr/bin/env bash
# S5-R3-FIX measure 1 (rails): the runner's text geometry BEFORE any change, with the phones' Chinese face installed.
#  - advance table: the rail label's face (11px mono, 600/700) per engine (Chromium, WebKit) and pixel ratio, four trackings;
#  - the classic phone rail (dark and drawn) and the journey rail (four tabs and five), every width 320..420, en/sw/zh,
#    at pixel ratio 1 (the drives' default) and 3 (a phone's): each label's ink, cut or whole, lines, and the least gap;
#  - tiles of the rails at ratio 3 with the current CSS and with trial trackings injected (for the eye, not judged).
. "$CI_RUN/lib.sh"
# Android's CJK face (Noto Sans CJK, named by the app's --font-cjk): without it Chromium draws Chinese as tofu boxes.
step cjk-font bash -c 'sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends fonts-noto-cjk && fc-cache -f'
echo "CJK faces: $(fc-list :lang=zh family | sort -u | head -4 | paste -sd ';')"

cat > "$OUT/measure-advance.mjs" <<'JS'
import { chromium, webkit } from "playwright";
const BASE = process.env.BASE;
const WORDS = ["Up & Down", "Millionea", "Mubashara", "Questions", "Markets", "Juu na Chini", "Tiketi zangu", "My tickets", "Tickets", "MMMMMMMMMM", "市场涨跌"];
const LS = ["normal", "-0.04em", "-0.05em", "-0.06em", "-0.08em"];
for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  let browser;
  try { browser = await type.launch(); } catch (e) { console.log(`ADV ${name}: not launched (${String(e.message).slice(0, 160)})`); continue; }
  for (const dsf of [1, 1.5, 2, 2.625, 3]) {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true });
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded", timeout: 240000 });
    await page.waitForSelector(".kp-rail__label", { timeout: 120000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(800);
    const face = await page.evaluate(() => getComputedStyle(document.querySelector(".kp-rail__label")).fontFamily);
    console.log(`ADV ${name} dsf${dsf} face ${face}`);
    for (const fw of [600, 700]) for (const ls of LS) {
      const widths = await page.evaluate(({ words, fw, ls }) => {
        const host = document.createElement("div");
        host.style.cssText = "position:absolute;left:0;top:0;visibility:hidden";
        document.body.appendChild(host);
        const spans = words.map((w) => {
          const s = document.createElement("span");
          s.className = "kp-rail__label";
          s.style.cssText = `display:block;width:max-content;max-width:none;overflow:visible;padding:0;font-weight:${fw};letter-spacing:${ls}`;
          s.textContent = w;
          host.appendChild(s);
          return s;
        });
        const out = spans.map((s) => s.getBoundingClientRect().width);
        host.remove();
        return out;
      }, { words: WORDS, fw, ls });
      console.log(`ADV ${name} dsf${dsf} w${fw} ls${ls}: ${WORDS.map((w, i) => `${w}=${widths[i].toFixed(3)}`).join(" | ")}`);
    }
    await ctx.close();
  }
  await browser.close();
}
JS

cat > "$OUT/measure-rails.mjs" <<'JS'
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE;
const MODE = process.env.MODE;
const TAG = process.env.TAG || MODE;
const WIDTHS = process.env.WIDTHS.split(",").map(Number);
const DSFS = (process.env.DSFS || "1").split(",").map(Number);
const SHOTW = Number(process.env.SHOTW || 0);
const TRIALS = (process.env.TRIALS || "").split(",").filter(Boolean);
const SHOTS = `${process.env.OUT}/shots`;
mkdirSync(SHOTS, { recursive: true });
const PATH = MODE === "classic" ? "/markets" : "/";
const NAV = MODE === "classic" ? "nav.kp-rail:not(.kp-rail--journey)" : "nav.kp-rail--journey";
const browser = await chromium.launch();
const frames = (page) => page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))));
const READ = (nav) => [...document.querySelectorAll(`${nav} .kp-rail__label`)].map((el) => {
  const rects = [];
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) { const r = document.createRange(); r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 0) rects.push(x); }
  const cs = getComputedStyle(el);
  const L = rects.length ? Math.min(...rects.map((x) => x.left)) : 0, R = rects.length ? Math.max(...rects.map((x) => x.right)) : 0;
  return { t: el.textContent.trim(), sw: el.scrollWidth, cw: el.clientWidth, L, R, ink: R - L, lines: new Set(rects.map((x) => Math.round(x.top))).size, ls: cs.letterSpacing };
});
for (const dsf of DSFS) {
  for (const l of ["en", "sw", "zh"]) {
    const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 780 }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true });
    await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + PATH, { waitUntil: "domcontentloaded", timeout: 240000 });
    await page.waitForSelector(`${NAV} .kp-rail__label`, { timeout: 120000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
    await page.waitForTimeout(800);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 780 });
      await frames(page);
      await page.waitForTimeout(40);
      const m = await page.evaluate(READ, NAV);
      const gaps = m.slice(1).map((b, i) => +(b.L - m[i].R).toFixed(2));
      const least = gaps.length ? Math.min(...gaps) : NaN;
      const cut = m.filter((x) => x.sw > x.cw + 0.5).map((x) => x.t);
      console.log(`RAIL ${TAG} n${m.length} dsf${dsf} ${l} ${w}: least ${least} cut [${cut.join("|")}] ls ${[...new Set(m.map((x) => x.ls))].join(",")} gaps ${JSON.stringify(gaps)} :: ${m.map((x) => `${x.t}${x.lines > 1 ? "(" + x.lines + "l)" : ""} ${x.ink.toFixed(2)} ${x.sw}/${x.cw}`).join(" · ")}`);
      if (w === SHOTW && dsf === DSFS[DSFS.length - 1] && l !== "zh") {
        const box = await page.locator(NAV).first().boundingBox();
        const clip = { x: 0, y: Math.max(0, box.y - 2), width: w, height: box.height + 4 };
        await page.screenshot({ path: `${SHOTS}/${TAG}-${l}-${w}-dsf${dsf}-asis.png`, clip });
        for (const tr of TRIALS) {
          const h = await page.addStyleTag({ content: `${NAV} .kp-rail__label { letter-spacing: ${tr} !important; }` });
          await frames(page);
          const mt = await page.evaluate(READ, NAV);
          const gt = mt.slice(1).map((b, i) => +(b.L - mt[i].R).toFixed(2));
          console.log(`TRIAL ${TAG} dsf${dsf} ${l} ${w} ls ${tr}: least ${Math.min(...gt)} cut [${mt.filter((x) => x.sw > x.cw + 0.5).map((x) => x.t).join("|")}] gaps ${JSON.stringify(gt)}`);
          await page.screenshot({ path: `${SHOTS}/${TAG}-${l}-${w}-dsf${dsf}-ls${tr}.png`, clip });
          await h.evaluate((el) => el.remove());
          await frames(page);
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();
JS

cp "$OUT/measure-advance.mjs" measure-advance.tmp.mjs
cp "$OUT/measure-rails.mjs" measure-rails.tmp.mjs
W=$(seq -s, 320 420)
step classic-dark serve 3601 -- bash -c "node measure-advance.tmp.mjs; MODE=classic TAG=classic-dark WIDTHS=$W DSFS=1,3 SHOTW=320 TRIALS=-0.04em node measure-rails.tmp.mjs"
step classic-drawn serve 3602 FEATURE_MILLIONEA=ACTIVE -- env MODE=classic TAG=classic-drawn WIDTHS=$W DSFS=1,3 SHOTW=320 TRIALS=-0.04em node measure-rails.tmp.mjs
step journey-four serve 3603 FEATURE_SIMPLEJOURNEY=ACTIVE -- env MODE=journey TAG=journey-four WIDTHS=$W DSFS=1,3 SHOTW=340 TRIALS=-0.04em,-0.06em node measure-rails.tmp.mjs
step journey-five serve 3604 FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- env MODE=journey TAG=journey-five WIDTHS=$W DSFS=1,3 SHOTW=320 TRIALS=-0.04em,-0.06em,-0.08em node measure-rails.tmp.mjs
rm -f measure-advance.tmp.mjs measure-rails.tmp.mjs
finish
