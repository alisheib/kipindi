// Landing v3 local capture — viewport TILES (never full-page) + measurements, for the build or the concept.
//   MODE=build   BASE=http://localhost:3057  OUT=<dir>  node scripts/qa/landing-v3/capture.mjs
//   MODE=concept OUT=<dir>                               node scripts/qa/landing-v3/capture.mjs
// Optional: WIDTHS=360,768,1280  LOCALES=sw,en,zh  AUTH=demo0|demo1 (build only, /auth/demo)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODE = process.env.MODE || "build";
const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/out";
const AUTH = process.env.AUTH || "";
const W = (process.env.WIDTHS || "360,768,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const H = { 360: 780, 768: 1024, 1280: 860, 1024: 900, 320: 640, 414: 896 };
const MAX_TILES = Number(process.env.MAX_TILES || 14);
const CONCEPT = pathToFileURL(resolve("docs/design-system/v4-2026-09-26-landing-ten/design/50pick Home Concept v3.dc.html")).href;
mkdirSync(OUT, { recursive: true });

const MEASURE = () => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const card = document.querySelector(".kp-hero__card .mcardp");
  const actions = card?.querySelector(".mcardp-actions");
  const price = card?.querySelector(".mcardp-prob");
  const header = document.querySelector("header");
  const ticker = document.querySelector("[data-live-ticker], .ticker-viewport, .kp-ticker");
  return {
    innerWidth, innerHeight,
    overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    docHeight: document.documentElement.scrollHeight,
    header: r(header), ticker: r(ticker?.closest("[data-band], div") || ticker),
    hero: r(document.querySelector(".kp-hero")),
    featuredCard: r(card), featuredPrice: r(price), featuredActions: r(actions),
    ctas: r(document.querySelector(".kp-hero__ctas")), trust: r(document.querySelector(".kp-hero__trust")),
    headings: [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map((h) => `${h.tagName}:${(h.textContent || "").trim().slice(0, 50)}`),
    bands: [...document.querySelectorAll("[data-band]")].map((b) => b.getAttribute("data-band")),
    smallText: [...document.querySelectorAll("body *")].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${e.className?.toString().slice(0, 40)}:${parseFloat(getComputedStyle(e).fontSize)}:${(e.textContent || "").trim().slice(0, 24)}`).slice(0, 30),
    clipped: [...document.querySelectorAll("main *")].filter((e) => vis(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible" && (e.textContent || "").trim() && e.children.length === 0).map((e) => `${e.className?.toString().slice(0, 40)}:${(e.textContent || "").trim().slice(0, 30)}`).slice(0, 20),
  };
};

const browser = await chromium.launch({ headless: true });
const report = [];
for (const w of W) for (const loc of LOCALES) {
  const h = H[w] || 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const id = `${MODE}-${w}-${loc}${AUTH ? "-" + AUTH : ""}`;
  try {
    let url;
    if (MODE === "concept") {
      const q = new URLSearchParams({ locale: loc });
      if (AUTH === "demo1") { q.set("signedIn", "1"); q.set("balance", "1"); }
      if (AUTH === "demo0") { q.set("signedIn", "1"); q.set("balance", "0"); }
      url = `${CONCEPT}?${q}`;
    } else {
      if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
      await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
      url = BASE + "/";
    }
    const page = await ctx.newPage();
    if (MODE === "build" && AUTH) {
      await page.goto(`${BASE}/auth/demo?deposit=${AUTH === "demo1" ? 1 : 0}`, { waitUntil: "load", timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(MODE === "build" ? 5000 : 2500);
    const decline = page.getByTestId("consent-decline");
    if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}" }).catch(() => {});
    // must be the real page, not an error screen
    const h1 = await page.locator("h1").first().textContent({ timeout: 10000 }).catch(() => null);
    if (!h1) throw new Error("no h1 — not the landing page");
    // fire every reveal
    const dh = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < dh; y += Math.floor(h * 0.8)) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(150); }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(900);
    const m = MODE === "build" ? await page.evaluate(MEASURE) : { docHeight: dh };
    // tiles
    const step = h - 96; const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const tiles = [];
    for (let i = 0, y = 0; i < MAX_TILES && y < total; i++, y += step) {
      await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(350);
      const f = join(OUT, `${id}-t${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: f }); tiles.push(f);
    }
    report.push({ id, h1: h1.trim().slice(0, 40), ...m, tiles: tiles.length });
    console.log(`ok ${id} tiles=${tiles.length}${m.overflowX != null ? ` overflowX=${m.overflowX}` : ""}${m.featuredActions ? ` cardActionsBottom=${m.featuredActions.bottom}` : ""}`);
  } catch (e) {
    report.push({ id, error: String(e.message).split("\n")[0] });
    console.log(`FAIL ${id}: ${String(e.message).split("\n")[0]}`);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, `report-${MODE}${AUTH ? "-" + AUTH : ""}.json`), JSON.stringify(report, null, 2));
