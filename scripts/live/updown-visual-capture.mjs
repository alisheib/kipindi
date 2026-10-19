/**
 * U43 · THE UP & DOWN BOARD, ITS ROUND CARDS AND THE MARKET CARD, PHOTOGRAPHED FOR THE EIGHT-LENS READ
 * (docs/MOBILE-VISUAL-PLAN.md §9 U43 — Ali, 2026-10-19: every perspective rated until it is 10/10).
 *
 *   BASE=https://www.50pick.tz node scripts/live/updown-visual-capture.mjs
 *   BASE=http://localhost:3311 WIDTHS=360,1280 LOCALES=sw,en TAG=r1 node scripts/live/updown-visual-capture.mjs
 *
 * Read-only against any BASE: it navigates, opens the filter sheet and the chart view on the client only, and
 * photographs. It never signs in, submits a form or places a bet. A caller that wants a signed-in board passes
 * STORAGE=<playwright storage-state json> (made by its own sign-in, on a local server only).
 *
 * Per width × language it writes, under .qa-shots/u43/<TAG>/ (gitignored, DESIGN_AUTHORITY §0b):
 *   updown__<w>-<loc>__s00.png        the first screen, exactly what the phone shows before any scroll
 *   updown__<w>-<loc>__full.png       the whole board
 *   updown__<w>-<loc>__card<i>.png    each round card on its own, named with its data-phase in index.json
 *   updown-chart__<w>-<loc>__s00.png  the board with the Chart view chosen (client storage only)
 *   updown-sheet__<w>-<loc>.png       the phone filter sheet open (below 640px only)
 *   markets__<w>-<loc>__s00.png / __full.png / __card<i>.png
 * and index.json: per page the viewport, DPR, html lang read back, horizontal scrollability, document height in
 * screens, the first card's top, the first Up/Down button's top and bottom against the fold, and per card its box,
 * phase, the distinct computed font sizes and corner radii inside it, its row gaps and how often the open price
 * is written inside it.
 *
 * ⛔ The user agent carries "HeadlessChrome" on purpose (the same refusal as mobile-visual-capture.mjs): /api/pv must
 * never count a capture as real visitors, and the first-visit primer hides itself for this marker.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const PW_ROOT = process.env.PW_ROOT || REPO;
const { chromium } = await import(pathToFileURL(join(PW_ROOT, "node_modules/playwright/index.mjs")).href);

const BASE = (process.env.BASE || "https://www.50pick.tz").replace(/\/$/, "");
const TAG = process.env.TAG || `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`;
const OUT = process.env.OUT || join(REPO, ".qa-shots", "u43", TAG);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",").map((s) => s.trim()).filter(Boolean);
const HEIGHT_FOR = { 320: 640, 360: 740, 390: 844, 412: 915, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
const WIDTHS = (process.env.WIDTHS || "320,360,390,768,1024,1280,1920").split(",").map(Number).filter(Boolean);
const SURFACES = (process.env.SURFACES || "updown,updown-chart,updown-sheet,markets").split(",").map((s) => s.trim());
const STORAGE = process.env.STORAGE || undefined;
const PARALLEL = Math.max(1, Number(process.env.PARALLEL || LOCALES.length));

const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36";
if (!/HeadlessChrome/.test(UA) || !/HeadlessChrome/.test(UA_DESKTOP)) {
  console.error("REFUSING TO RUN: a user agent lost its HeadlessChrome marker, so /api/pv would count this capture as real visitors.");
  process.exit(2);
}

/** Transitions and animations off for a stable frame; the countdown still ticks (it is text, not an animation). */
const STILL = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}nextjs-portal{visibility:hidden!important}";

/** The visible text and accessible name of every side choice on a page (the YES/NO and Up/Down buttons, the home rows). */
const CHOICE_TEXTS = () => [...document.querySelectorAll(".btn-yes, .btn-no, .kp-qrow__btn")]
  .filter((e) => e.getClientRects().length > 0)
  .slice(0, 24)
  .map((e) => ({ text: (e.textContent || "").replace(/\s+/g, " ").trim(), aria: e.getAttribute("aria-label") || "" }));

mkdirSync(OUT, { recursive: true });
const index = { base: BASE, tag: TAG, startedAt: new Date().toISOString(), pages: [] };

/** Geometry a reader cannot take off a picture. Runs in the page. */
function measurePage(kind) {
  const vw = innerWidth;
  const vh = innerHeight;
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +(b.y + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const cards = [...document.querySelectorAll("article.mcardp")].filter(visible);
  const priceRe = /\$\s?[\d,]+\.\d{2}/g;
  const cardInfo = cards.map((card) => {
    const sizes = new Set();
    const radii = new Set();
    for (const el of card.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (hasText) sizes.add(parseFloat(s.fontSize));
      const rad = parseFloat(s.borderTopLeftRadius);
      if (rad > 0 && (s.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(s.borderTopWidth) > 0)) radii.add(rad);
    }
    const kids = [...card.children].filter((c) => visible(c) && !c.classList.contains("mcardp-open") && !c.classList.contains("mcardp-watermark"));
    const gaps = [];
    for (let i = 1; i < kids.length; i++) gaps.push(+(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom).toFixed(1));
    const text = card.innerText || "";
    const prices = text.match(priceRe) || [];
    const counts = {};
    for (const p of prices) counts[p] = (counts[p] || 0) + 1;
    const maxRepeat = Object.values(counts).reduce((a, b) => Math.max(a, b), 0);
    const yes = card.querySelector(".btn-yes");
    const no = card.querySelector(".btn-no");
    return {
      box: r(card),
      phase: card.getAttribute("data-phase"),
      surface: card.getAttribute("data-market-surface"),
      fontSizes: [...sizes].sort((a, b) => a - b),
      radii: [...radii].sort((a, b) => a - b),
      rowGaps: gaps,
      dollarFigures: prices.length,
      mostRepeatedFigure: maxRepeat,
      upButton: yes && visible(yes) ? r(yes) : null,
      downButton: no && visible(no) ? r(no) : null,
      title: (card.querySelector("h2,h3")?.innerText || "").replace(/\s+/g, " ").slice(0, 120),
    };
  });
  const firstBtn = cardInfo.find((c) => c.upButton)?.upButton || null;
  // Can the page move sideways? scrollWidth lies on this site (MOBILE-VISUAL U42): try it.
  const x0 = scrollX; scrollTo(400, scrollY); const canScrollX = scrollX > 0; scrollTo(x0, scrollY);
  return {
    kind,
    vw, vh,
    dpr: devicePixelRatio,
    lang: document.documentElement.lang,
    canScrollX,
    docScreens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    firstCardTop: cardInfo[0]?.box.y ?? null,
    firstUpButtonTop: firstBtn ? firstBtn.y : null,
    firstUpButtonBottom: firstBtn ? +(firstBtn.y + firstBtn.h).toFixed(1) : null,
    upDownOnFirstScreen: firstBtn ? firstBtn.y + firstBtn.h <= vh : false,
    cards: cardInfo,
  };
}

/**
 * A card's own frame shows the card, not the chrome floating over it: while `fn` runs, every `position: fixed` element
 * (the bottom rail, the chat bubble, the fidget, the dev badge) and the sticky top bar are hidden, so a card scrolled
 * under the header is photographed whole. Page frames keep their chrome — that is what a player sees.
 */
async function withoutChrome(page, fn) {
  const style = await page.addStyleTag({ content: ".app-topbar,.kp-rail,.cm-bubble,[data-toaster],nextjs-portal{visibility:hidden!important}" });
  try { return await fn(); }
  finally { await style.evaluate((el) => el.remove()).catch(() => {}); }
}

async function shoot(page, file, opts = {}) {
  await page.screenshot({ path: join(OUT, file), ...opts });
  return file;
}

async function settle(page, ms = 1200) {
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(ms);
}

async function waitForCardGlyphs(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("article.mcardp svg")]
    .filter((el) => el.querySelector("use") && el.getClientRects().length > 0).every((el) => {
    try { return el.getBBox().width > 0; } catch { return false; }
  }), null, { timeout: 10000 });
}

async function runCell(browser, locale, width) {
  const height = HEIGHT_FOR[width] || 900;
  const phone = width < 640;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: phone ? 2 : 1,
    userAgent: phone ? UA : UA_DESKTOP,
    isMobile: phone,
    hasTouch: phone,
    storageState: STORAGE,
  });
  const host = new URL(BASE).hostname;
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  const cell = `${width}-${locale}`;
  const out = [];
  const page = await ctx.newPage();

  try {
    if (SURFACES.includes("updown")) {
      await page.addInitScript(() => { try { localStorage.setItem("kp-updown-chart-open", "closed"); localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(page, 2500);
      await waitForCardGlyphs(page);
      await page.addStyleTag({ content: STILL });
      await page.waitForTimeout(300);
      const m = await page.evaluate(measurePage, "updown");
      const files = [await shoot(page, `updown__${cell}__s00.png`), await shoot(page, `updown__${cell}__full.png`, { fullPage: true })];
      const cards = page.locator("article.mcardp");
      const n = await cards.count();
      await withoutChrome(page, async () => {
        for (let i = 0; i < n; i++) {
          if (!(await cards.nth(i).isVisible())) continue;
          await cards.nth(i).screenshot({ path: join(OUT, `updown__${cell}__card${i}.png`) });
          files.push(`updown__${cell}__card${i}.png`);
        }
      });
      out.push({ surface: "updown", cell, locale, width, height, files, ...m });
    }

    if (SURFACES.includes("updown-chart")) {
      const p2 = await ctx.newPage();
      await p2.addInitScript(() => { try { localStorage.setItem("kp-updown-chart-open", "open"); localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await p2.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(p2, 2500);
      await waitForCardGlyphs(p2);
      await p2.waitForFunction(() => !!document.querySelector('.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas'), null, { timeout: 15000 });
      await p2.waitForTimeout(1500);
      await p2.addStyleTag({ content: STILL });
      const m = await p2.evaluate(measurePage, "updown-chart");
      const files = [await shoot(p2, `updown-chart__${cell}__s00.png`), await shoot(p2, `updown-chart__${cell}__full.png`, { fullPage: true })];
      out.push({ surface: "updown-chart", cell, locale, width, height, files, ...m });
      await p2.close();
    }

    if (SURFACES.includes("updown-sheet") && width < 640) {
      const p3 = await ctx.newPage();
      await p3.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await p3.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(p3, 2000);
      const trigger = p3.locator("details.kp-fsheet > summary, .kp-fsheet summary").first();
      if (await trigger.count()) {
        await trigger.click().catch(() => {});
        await p3.waitForTimeout(900);
        await p3.addStyleTag({ content: STILL });
        out.push({ surface: "updown-sheet", cell, locale, width, height, files: [await shoot(p3, `updown-sheet__${cell}.png`)], lang: await p3.evaluate(() => document.documentElement.lang) });
      } else {
        out.push({ surface: "updown-sheet", cell, locale, width, height, files: [], note: "no filter-sheet trigger found" });
      }
      await p3.close();
    }

    if (SURFACES.includes("markets")) {
      const p4 = await ctx.newPage();
      await p4.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await p4.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(p4, 2500);
      await p4.addStyleTag({ content: STILL });
      await p4.waitForTimeout(300);
      const m = await p4.evaluate(measurePage, "markets");
      const files = [await shoot(p4, `markets__${cell}__s00.png`), await shoot(p4, `markets__${cell}__full.png`, { fullPage: true })];
      const cards = p4.locator("article.mcardp");
      const n = Math.min(await cards.count(), 4);
      await withoutChrome(p4, async () => {
        for (let i = 0; i < n; i++) {
          if (!(await cards.nth(i).isVisible())) continue;
          // Lower cards may scroll during locator.screenshot before their button ink paints.
          // Put them on screen first, wait for paint, and refuse an unreadable choice.
          await cards.nth(i).scrollIntoViewIfNeeded();
          await p4.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const sideButtons = cards.nth(i).locator("button.btn-yes, button.btn-no");
          if (await sideButtons.count()) {
            if (await sideButtons.count() !== 2 || !(await sideButtons.nth(0).isVisible()) || !(await sideButtons.nth(1).isVisible())
              || !(await sideButtons.nth(0).textContent())?.trim() || !(await sideButtons.nth(1).textContent())?.trim()) {
              throw new Error(`market card ${i} has an unreadable side choice`);
            }
          }
          await p4.waitForTimeout(120);
          await cards.nth(i).screenshot({ path: join(OUT, `markets__${cell}__card${i}.png`) });
          files.push(`markets__${cell}__card${i}.png`);
        }
      });
      const choices = await p4.evaluate(CHOICE_TEXTS);
      out.push({ surface: "markets", cell, locale, width, height, files, choices, ...m });
      await p4.close();
    }

    // The other surfaces that draw a card's choices (U43 release A: no figure on any card choice) — the home's question
    // rows and /live's tiles: a frame, the full page, and the text of every choice on it.
    for (const [surface, path] of [["home", "/"], ["live", "/live"]]) {
      if (!SURFACES.includes(surface)) continue;
      const p5 = await ctx.newPage();
      await p5.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      await p5.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settle(p5, 2500);
      await p5.addStyleTag({ content: STILL });
      await p5.waitForTimeout(300);
      const files = [await shoot(p5, `${surface}__${cell}__s00.png`), await shoot(p5, `${surface}__${cell}__full.png`, { fullPage: true })];
      const choices = await p5.evaluate(CHOICE_TEXTS);
      out.push({ surface, cell, locale, width, height, files, choices, lang: await p5.evaluate(() => document.documentElement.lang) });
      await p5.close();
    }
  } catch (e) {
    out.push({ cell, error: String(e).slice(0, 300) });
  } finally {
    await ctx.close();
  }
  for (const o of out) {
    if (o.lang && o.lang !== locale) o.langMismatch = `asked ${locale}, html lang ${o.lang}`;
  }
  return out;
}

const browser = await chromium.launch();
const cells = [];
for (const locale of LOCALES) for (const width of WIDTHS) cells.push([locale, width]);
let next = 0;
async function worker() {
  while (next < cells.length) {
    const [locale, width] = cells[next++];
    const res = await runCell(browser, locale, width);
    index.pages.push(...res);
    const bad = res.filter((r) => r.error || r.langMismatch).length;
    console.log(`  ${width}-${locale}: ${res.length} page(s)${bad ? ` · ${bad} problem(s)` : ""}`);
  }
}
await Promise.all(Array.from({ length: Math.min(PARALLEL, cells.length) }, worker));
await browser.close();
index.finishedAt = new Date().toISOString();
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
const problems = index.pages.filter((p) => p.error || p.langMismatch);
console.log(`U43 capture → ${OUT} · ${index.pages.length} pages · ${problems.length} problem(s)`);
if (problems.length) { for (const p of problems) console.log("  ✗", p.cell, p.error || p.langMismatch); process.exit(1); }
