/**
 * Prove a change to `.mcardp-details` does NOT move card layout.
 *
 * `MARKET_CARD_H = 349` (card-geometry.ts) is consumed by BOTH `/markets` skeletons, and the
 * Details row is deliberately a constant one-line height so the card never changes height between
 * boards. That is the whole reason §4e was deferred twice. So: measure every card's box, the
 * Details row's own box, and the grid's row offsets — before and after — and diff them.
 *
 * Run: npm run qa:card-geometry -- <label>
 */
import { chromium } from "playwright";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const LABEL = process.argv[2] || "before";
const BASE = process.argv[3] || "http://localhost:3009";
const OUT_DIR = ".qa-design-geometry";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/card-geometry-${LABEL}.json`;

const b = await chromium.launch();
const result = {};
for (const path of ["/markets", "/"]) {
  for (const W of [{ n: "360", w: 360, h: 780 }, { n: "1280", w: 1280, h: 900 }, { n: "1920", w: 1920, h: 1080 }]) {
    const ctx = await localisedContext(b, { locale: "en", width: W.w, height: W.h, baseUrl: BASE, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
    await assertLang(p, "en");
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
    });
    const m = await p.evaluate(() => {
      const cards = [...document.querySelectorAll(".mcardp")].filter((c) => c.getBoundingClientRect().height > 0);
      const h = cards.map((c) => Math.round(c.getBoundingClientRect().height));
      const det = [...document.querySelectorAll(".mcardp-details")].filter((d) => d.getBoundingClientRect().height > 0);
      const detBox = det.map((d) => { const r = d.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; });
      // Row offsets: the y of each card, rounded — a layout shift moves these.
      const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top + scrollY));
      return {
        cardCount: cards.length,
        cardHeights: [...new Set(h)].sort((x, y) => x - y),
        detailsCount: det.length,
        detailsHeights: [...new Set(detBox.map((x) => x.h))].sort((x, y) => x - y),
        detailsWidths: [...new Set(detBox.map((x) => x.w))].sort((x, y) => x - y),
        cardTops: tops,
        docHeight: document.body.scrollHeight,
      };
    });
    result[`${path} @${W.n}`] = m;
    console.log(`${path.padEnd(9)} ${W.n.padStart(4)} | cards=${m.cardCount} heights=${JSON.stringify(m.cardHeights)} details=${m.detailsCount}@${JSON.stringify(m.detailsHeights)} doc=${m.docHeight}`);
    await ctx.close();
  }
}
await b.close();
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nwrote ${OUT}`);

// If the counterpart exists, diff the two.
const other = LABEL === "after" ? ".qa-design-geometry/card-geometry-before.json" : ".qa-design-geometry/card-geometry-after.json";
if (existsSync(other)) {
  const prev = JSON.parse(readFileSync(other, "utf8"));
  const diffs = [];
  for (const k of Object.keys(result)) {
    const a = result[k], p2 = prev[k];
    if (!p2) { diffs.push(`${k}: missing in the other run`); continue; }
    for (const field of ["cardCount", "cardHeights", "detailsCount", "docHeight", "cardTops"]) {
      if (JSON.stringify(a[field]) !== JSON.stringify(p2[field])) {
        const s = (v) => { const t = JSON.stringify(v); return t.length > 90 ? t.slice(0, 90) + "…" : t; };
        diffs.push(`${k}.${field}: ${s(p2[field])} -> ${s(a[field])}`);
      }
    }
  }
  console.log(`\n=== LAYOUT DIFF vs ${other} ===`);
  if (!diffs.length) console.log("IDENTICAL — card heights, card tops and document height all unchanged.");
  else { console.log(`${diffs.length} DIFFERENCE(S) — layout MOVED:`); diffs.forEach((d) => console.log(`  - ${d}`)); process.exitCode = 1; }
  // The hit area is EXPECTED to change; report it separately so it is never mistaken for a shift.
  for (const k of Object.keys(result)) {
    if (prev[k] && JSON.stringify(result[k].detailsHeights) !== JSON.stringify(prev[k].detailsHeights)) {
      console.log(`  (expected) ${k} details box height ${JSON.stringify(prev[k].detailsHeights)} -> ${JSON.stringify(result[k].detailsHeights)}`);
    }
  }
}
