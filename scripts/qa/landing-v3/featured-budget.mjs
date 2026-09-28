// Landing v3 · WP3 — the featured card's first-screen budget, MEASURED (hero v3 §7 is a model; this is the render).
//   BASE=http://localhost:3057 OUT=<dir> [LOCALES=sw,en,zh] [CELLS=360x740,360x780] [TAG=p2] node scripts/qa/landing-v3/featured-budget.mjs
// Per cell × locale, at the top of `/`: the featured card's top, its price bottom, its YES/NO bottom, its source
// line's bottom and where that line sits (above or below the pick), the question's rendered line count and
// whether it is clamped, whether the top row wrapped, whether the crest row is drawn (the predictor floor),
// and the top of the bottom rail (the first screen's real end, V15's rule). CLEARANCE = rail top − YES/NO bottom.
// Exit 1 when the YES/NO row ends below the rail (or below 740) in any cell; exit 2 when nothing was measured.
// ⚠️ The hero v3 unit moves the trust rows ABOVE the card; a number measured before it lands is not the budget
//    after it. Re-run this after merging it — that run is the one that counts.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE || "http://localhost:3057").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/wp34";
const TAG = process.env.TAG || "budget";
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const CELLS = (process.env.CELLS || "360x740").split(",").map((c) => c.split("x").map(Number));
mkdirSync(OUT, { recursive: true });

const MEASURE = () => {
  const vis = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const box = (el) => { if (!vis(el)) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), h: Math.round(b.height) }; };
  const card = document.querySelector(".kp-hero__card .mcardp");
  if (!card) return { error: "no featured card" };
  // The first screen ends where a wide fixed bar pinned to the bottom begins (V15's rule), or at the viewport.
  let rail = innerHeight;
  for (const el of document.querySelectorAll("body *")) {
    if (getComputedStyle(el).position !== "fixed" || !vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > innerWidth * 0.6 && r.bottom >= innerHeight - 1 && r.top > innerHeight * 0.6) rail = Math.min(rail, Math.round(r.top));
  }
  const q = card.querySelector(".mcardp-q");
  const lh = q ? parseFloat(getComputedStyle(q).lineHeight) : 0;
  const top = card.querySelector(".mcardp-top");
  const topKids = top ? [...top.children].filter(vis).map((c) => Math.round(c.getBoundingClientRect().top)) : [];
  const src = card.querySelector(".mcardp-src--featured");
  const pick = card.querySelector('[data-market-part="pick"]');
  const closes = card.querySelector(".mcardp-closes");
  return {
    rail: rail + Math.round(scrollY),
    card: box(card),
    price: box(card.querySelector(".mcardp-prob")),
    pick: box(pick),
    source: box(src),
    sourceBelowPick: !!(src && pick && vis(src) && src.getBoundingClientRect().top >= pick.getBoundingClientRect().bottom - 1),
    sourceText: src ? (src.innerText || "").trim() : null,
    question: q ? { lines: lh ? Math.round(q.getBoundingClientRect().height / lh) : null, clamped: q.scrollHeight > q.clientHeight + 1, font: parseFloat(getComputedStyle(q).fontSize) } : null,
    topRowLines: new Set(topKids).size,
    time: closes ? (closes.innerText || "").trim() : null,
    signal: [...card.querySelectorAll(".mcardp-top [aria-label]")].map((c) => c.getAttribute("aria-label")),
    crestRow: vis(card.querySelector(".mcardp-traders")),
    withheld: card.getAttribute("data-market-predictors"),
    delta: card.querySelector(".mcardp-h24") ? (card.querySelector(".mcardp-h24").innerText || "").trim() : null,
    markLeft: card.querySelector(".tipbar-mark")?.style.left ?? null,
    barRole: card.querySelector(".tipbar-rail, .tipbar-empty")?.getAttribute("role") ?? null,
    barName: card.querySelector(".tipbar-rail, .tipbar-empty")?.getAttribute("aria-label") ?? null,
  };
};

const browser = await chromium.launch({ headless: true });
const rows = [];
for (const [w, h] of CELLS) for (const loc of LOCALES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const id = `${w}x${h}-${loc}`;
  try {
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(4000);
    const decline = page.getByTestId("consent-decline");
    if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    const m = await page.evaluate(MEASURE);
    const clearance = m.pick ? m.rail - m.pick.bottom : null;
    const over = m.pick ? m.pick.bottom > Math.min(740, m.rail) : true;
    await page.screenshot({ path: join(OUT, `${TAG}-${id}.png`) });
    rows.push({ id, clearance, over, ...m });
    console.log(`${over ? "OVER " : "ok   "} ${id}  card ${m.card?.top}  price ${m.price?.bottom}  YES/NO ${m.pick?.bottom}  rail ${m.rail}  clear ${clearance}  `
      + `q ${m.question?.lines}L${m.question?.clamped ? " clamped" : ""}  top-row ${m.topRowLines}L  src ${m.sourceBelowPick ? "under the pick" : "above the pick"} (${m.source?.bottom})  `
      + `crest ${m.crestRow ? "drawn" : "withheld"}  delta ${JSON.stringify(m.delta)}  mark ${m.markLeft}`);
  } catch (e) {
    rows.push({ id, error: String(e.message).split("\n")[0] });
    console.log(`FAIL ${id}: ${String(e.message).split("\n")[0]}`);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(rows, null, 2));
const measured = rows.filter((r) => r.pick);
if (!measured.length) { console.error("⛔ nothing measured"); process.exit(2); }
process.exit(rows.some((r) => r.over) ? 1 : 0);
