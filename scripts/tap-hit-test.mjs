/**
 * PROVE the Details hit area, and prove it did not steal the info button's clicks.
 *
 * Why a hit test and not a measurement: the fix is an absolutely-positioned `::after`, so
 * `getBoundingClientRect()` on `.mcardp-details` still returns 17px — correctly. Every existing
 * driver reports 17px before AND after, which means none of them can tell the fix from its absence.
 * `document.elementFromPoint` is what actually answers "would a finger here open the market?".
 *
 * Three things are asserted per card, at every width:
 *   1. the target is at least --tap-min (40px) tall, top to bottom, by probing real coordinates;
 *   2. the row's PAINTED height is still 17px (the whole reason this was deferred twice);
 *   3. the info button's own centre still resolves to the info button — not to Details.
 * Assertion 3 is the one that makes 1 safe rather than reckless.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || "http://localhost:3009";
const TAP_MIN = 40;
const b = await chromium.launch();
const failures = [];
let cardsProbed = 0;

for (const path of ["/markets", "/"]) {
  for (const W of [{ n: "360", w: 360, h: 780 }, { n: "768", w: 768, h: 1024 }, { n: "1280", w: 1280, h: 900 }, { n: "1920", w: 1920, h: 1080 }]) {
    const ctx = await localisedContext(b, { locale: "en", width: W.w, height: W.h, baseUrl: BASE, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
    await assertLang(p, "en");

    // ⚠️ `elementFromPoint` is VIEWPORT-based, so a card below the fold cannot be probed where it
    // sits. The first version of this driver simply skipped those and probed nothing at all on 5 of
    // 8 combinations — it was right to refuse to report a pass, but the answer is to bring each
    // card into view rather than to shrink the claim. Each card is centred, then probed.
    const cardCount = await p.locator(".mcardp").count();
    const res = [];
    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      await p.evaluate((idx) => {
        const c = document.querySelectorAll(".mcardp")[idx];
        if (c) c.scrollIntoView({ block: "center" });
      }, i);
      await p.waitForTimeout(220);
      const one = await p.evaluate(({ tapMin, idx }) => {
        const out = [];
        const card = document.querySelectorAll(".mcardp")[idx];
        if (!card) return out;
        const det = card.querySelector(".mcardp-details");
        if (!det) return out;
        const r = det.getBoundingClientRect();
        if (r.height === 0) return out;
        // Still guard the edges: a row flush against the viewport edge cannot be probed outward.
        if (r.top < 60 || r.bottom > innerHeight - 45) return out;

        const x = Math.round(r.right - 30);           // inside the label, right-aligned row
        const cy = (r.top + r.bottom) / 2;
        const owns = (el) => !!el && (el === det || det.contains(el) || el.closest(".mcardp-details") === det);

        // Walk outward from the centre to find the real top and bottom of the hit area.
        let up = 0, down = 0;
        for (let d = 0; d <= 30; d++) { if (owns(document.elementFromPoint(x, Math.round(cy - d)))) up = d; else break; }
        for (let d = 0; d <= 30; d++) { if (owns(document.elementFromPoint(x, Math.round(cy + d)))) down = d; else break; }
        const hit = up + down + 1;

        // The info button must still own its own centre.
        const info = card.querySelector(".mcardp-info");
        let infoOk = null;
        if (info) {
          const ir = info.getBoundingClientRect();
          if (ir.height > 0 && ir.top > 50 && ir.bottom < innerHeight - 5) {
            const at = document.elementFromPoint(Math.round((ir.left + ir.right) / 2), Math.round((ir.top + ir.bottom) / 2));
            infoOk = !!at && (at === info || info.contains(at) || at.closest(".mcardp-info") === info);
          }
        }
        out.push({ paintedH: Math.round(r.height), hitH: hit, infoOk, tapMin });
        return out;
      }, { tapMin: TAP_MIN, idx: i });
      res.push(...one);
    }

    let minHit = Infinity, maxPainted = 0, infoStolen = 0, infoChecked = 0;
    for (const c of res) {
      cardsProbed++;
      minHit = Math.min(minHit, c.hitH);
      maxPainted = Math.max(maxPainted, c.paintedH);
      if (c.infoOk !== null) { infoChecked++; if (!c.infoOk) infoStolen++; }
    }
    if (!res.length) { failures.push(`${path} @${W.n}: no card fully in view — probed nothing`); console.log(`${path.padEnd(9)} ${W.n.padStart(4)} | NOTHING PROBED`); await ctx.close(); continue; }
    if (minHit < TAP_MIN) failures.push(`${path} @${W.n}: smallest Details hit area ${minHit}px (< ${TAP_MIN})`);
    if (maxPainted !== 17) failures.push(`${path} @${W.n}: the row's PAINTED height moved to ${maxPainted}px (must stay 17)`);
    if (infoStolen) failures.push(`${path} @${W.n}: Details swallowed the info button on ${infoStolen}/${infoChecked} card(s)`);

    console.log(`${path.padEnd(9)} ${W.n.padStart(4)} | cards=${String(res.length).padStart(2)} hitArea=${minHit}px painted=${maxPainted}px infoIntact=${infoChecked - infoStolen}/${infoChecked}`);
    await ctx.close();
  }
}
await b.close();

console.log(`\n${cardsProbed} cards hit-tested`);
if (!cardsProbed) { console.log("FAILED: nothing was probed — this proves nothing."); process.exit(1); }
if (failures.length) { console.log(`FAILURES (${failures.length}):`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log(`every Details target >= ${TAP_MIN}px · every row still painted at 17px · no info button swallowed`);
