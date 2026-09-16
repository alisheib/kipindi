/**
 * THE PHONE CAPTURE THE VISUAL CRITICS PANEL READS — docs/MOBILE-VISUAL-PLAN.md §3b, and the Seal re-run in §1a.
 *
 *   node scripts/live/mobile-visual-capture.mjs
 *   LOCALE=en WIDTH=412 HEIGHT=915 node scripts/live/mobile-visual-capture.mjs
 *
 * Photographs what a visitor sees on www.50pick.tz: 9 player surfaces, up to 5 screens each plus the
 * last one (so the footer is always in the set), and a JSON of geometry a critic cannot read off a
 * picture — pinned chrome, document height in screens, horizontal overflow, card heights.
 * Read-only: it navigates and screenshots. It never submits a form, signs in or places a bet.
 *
 * ⛔ LOCALE UNSET MEANS "NO LANGUAGE COOKIE", not English. Since 8822b648 the server gives a visitor who
 * has never chosen a language SWAHILI, and that is the experience this capture exists to record. Setting
 * LOCALE=sw by hand would prove the cookie works, not what a new visitor gets. Pass LOCALE only to
 * photograph a chosen language on purpose.
 *
 * ⛔ THE USER AGENT MUST CARRY "HeadlessChrome". On 2026-09-15 a capture spoofed a plain Android UA and
 * /api/pv counted 25-60 QA page views as real traffic. Spoof the DEVICE, never the automation marker —
 * so this script refuses to start if the marker is missing, rather than trusting whoever edits the UA.
 *
 * Frames go to .qa-shots/ (gitignored, DESIGN_AUTHORITY §0b). Only numbers are ever written into docs.
 */
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const { chromium } = await import(pathToFileURL(join(REPO, "node_modules/playwright/index.mjs")).href);

const BASE = process.env.BASE || "https://www.50pick.tz";
const LOCALE = process.env.LOCALE || "";
const WIDTH = Number(process.env.WIDTH || 360);
const HEIGHT = Number(process.env.HEIGHT || 780);
const STAMP = new Date().toISOString().slice(0, 10);
const OUT = process.env.OUT || join(REPO, ".qa-shots", "mobile-visual", "critics", `${STAMP}-${LOCALE || "default"}-${WIDTH}`);

const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
if (!/HeadlessChrome/.test(UA)) {
  console.error("REFUSING TO RUN: the user agent has no HeadlessChrome marker, so /api/pv would count this capture as real visitors.");
  process.exit(2);
}

const KILL = "*{transition:none!important;animation:none!important;caret-color:transparent!important}";

/** A live market to photograph: the first one the board links to, unless MARKET names one. */
async function pickMarket(ctx) {
  if (process.env.MARKET) return process.env.MARKET;
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "load", timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const id = await p.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/markets/mkt_"]')][0];
    return a ? a.getAttribute("href").split("/").pop() : null;
  });
  await p.close();
  return id;
}

/** Geometry a critic cannot read off a picture. */
async function measure(page) {
  return page.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05;
    };
    const pinned = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if ((s.position === "fixed" || s.position === "sticky") && vis(el)) {
        const r = el.getBoundingClientRect();
        if (r.width > vw * 0.6 && r.height > 20) {
          pinned.push({ top: Math.round(r.top), h: Math.round(r.height), pos: s.position,
            cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 70) });
        }
      }
    }
    // ⛔ FLOATING OVERLAYS ARE COUNTED SEPARATELY, AND THEY ARE COUNTED. `pinned` only takes bars wider than 60% of
    // the screen, which is right for a height budget — and it made the 52px chat bubble invisible to every capture
    // before 2026-09-16, although it is the one pinned object that sits ON TOP of content (D3). The critics panel's
    // completeness critic found that the "237px of chrome" figure could not see the thing players say covers their
    // cards. So: every fixed element at least 24px on a side and narrower than the bars, with its rectangle.
    const floating = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" || !vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > vw * 0.6 || r.width < 24 || r.height < 24) continue;
      if (el.parentElement && getComputedStyle(el.parentElement).position === "fixed") continue; // count the outer box once
      floating.push({ left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        label: (el.getAttribute("aria-label") || el.className?.baseVal || el.className || "").toString().slice(0, 50) });
    }
    const overflowX = document.documentElement.scrollWidth > vw + 1;
    const cards = [...document.querySelectorAll(".mcardp")].filter(vis).map((c) => Math.round(c.getBoundingClientRect().height));
    return {
      vw, vh, docH: document.documentElement.scrollHeight,
      screens: +(document.documentElement.scrollHeight / vh).toFixed(1),
      pinned, pinnedPx: pinned.reduce((a, p) => a + p.h, 0), floating, overflowX, cards,
      lang: document.documentElement.lang,
    };
  });
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA,
});
if (LOCALE) await ctx.addCookies([{ name: "kp-locale", value: LOCALE, domain: new URL(BASE).hostname, path: "/" }]);
// The first-visit primer covers every guest page; it is photographed on purpose, not by accident.
await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });

// Decline consent once so the banner is not in every frame.
{
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const d = p.getByTestId("consent-decline");
  if (await d.count()) await d.first().click({ timeout: 8000 }).catch(() => console.log("  (consent not clickable)"));
  await p.close();
}

const market = await pickMarket(ctx);
const ROUTES = [
  ["home", "/"], ["markets", "/markets"], ["detail", market ? `/markets/${market}` : null], ["updown", "/updown"],
  ["live", "/live"], ["results", "/results"], ["leaderboard", "/leaderboard"], ["help", "/help"], ["login", "/auth/login"],
].filter(([, r]) => r);

const index = [];
for (const [tag, route] of ROUTES) {
  const page = await ctx.newPage();
  try {
    // `networkidle` never fires on www (the live stream holds a connection open): load, then wait.
    await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.addStyleTag({ content: KILL });
    await page.waitForTimeout(1000);
    const m = await measure(page);
    m.route = route;
    const n = Math.min(Math.ceil(m.docH / m.vh), 40);
    const idx = [...new Set([...Array(Math.min(n, 5)).keys(), n - 1])].filter((i) => i >= 0);
    m.frames = [];
    for (const i of idx) {
      await page.evaluate((y) => window.scrollTo(0, y), i * m.vh);
      await page.waitForTimeout(400);
      const f = `${tag}__s${String(i).padStart(2, "0")}.png`;
      await page.screenshot({ path: join(OUT, f) });
      m.frames.push(f);
    }
    writeFileSync(join(OUT, `${tag}.json`), JSON.stringify(m, null, 1));
    index.push(m);
    console.log(`ok   ${tag.padEnd(12)} lang=${m.lang} screens=${m.screens} pinned=${m.pinnedPx}px floating=${m.floating.map((f) => `${f.w}x${f.h}@${f.left},${f.top}`).join(";") || "none"} ovx=${m.overflowX} cards=${m.cards.length} frames=${m.frames.length}`);
  } catch (e) {
    console.log(`FAIL ${tag} ${String(e.message).split("\n")[0]}`);
  }
  await page.close();
}
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 1));
await ctx.close();
await browser.close();
console.log(`\n${index.length}/${ROUTES.length} surfaces captured into ${OUT}`);
process.exit(index.length === ROUTES.length ? 0 : 1);
