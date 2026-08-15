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
/* ── the market chart's time-range rail — batch 6 ────────────────────────────────────────────
 *
 * ⭐ `.pchart-range` went 40 → 44px on Ali's ruling (2026-08-14): it is the eighth filter
 * control and the other seven rails are all 44. It is probed HERE, with `elementFromPoint`,
 * for the same reason `.mcardp-details` is:
 *
 * 🔴 THE FIRST ATTEMPT AT THIS CONTROL WAS AN ABSOLUTELY-POSITIONED `::after`, and it MEASURED
 * 36px WHERE 40 WAS INTENDED — `up 16 / down 19`, because the chart wrapper that follows it in
 * the DOM took the pixels back. A pseudo-element painted outside its parent is still subject to
 * PAINT ORDER. ⛔ A bounding box cannot see that, and could not tell a working overlay from a
 * broken one. The control is genuinely tall now, but the probe stays: the box agreeing with the
 * intent is exactly what was true when it was 36.
 *
 * ⚠️ AND THE COST ALI ACCEPTED IS A LAYOUT QUESTION, so it is measured too — the rail sits in a
 * chart header whose label is 10px mono, and the header must not overflow its own box at any
 * width. A screenshot is written at each width because "still reads as a header" is a judgement
 * a person makes, not an assertion.
 */
const RANGE_MIN = 44;
let rangesProbed = 0;
{
  const ctx0 = await localisedContext(b, { locale: "en", width: 1280, height: 900, baseUrl: BASE, reducedMotion: "reduce" });
  const p0 = await ctx0.newPage();
  await p0.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90000 });
  const candidates = await p0.evaluate(() =>
    [...new Set([...document.querySelectorAll('a[href^="/markets/"]')].map((a) => a.getAttribute("href")))].slice(0, 6));
  await ctx0.close();

  /**
   * ⛔ THE CHART IS BEHIND A COLLAPSED DISCLOSURE (`ChartToggle`), so the rail does not exist in
   * the DOM until it is opened — the first version of this probe reported "NO RAIL" on four
   * widths and was right to refuse rather than pass. ⭐ THE SAME RULE THAT FOUND THE 4px LISTBOX:
   * a control you have not opened is a control you have not measured.
   * And the rail itself only renders when the market offers more than one range, so the board's
   * FIRST card is not guaranteed to carry it — walk the candidates rather than concluding the
   * product is broken from a market that legitimately has none.
   */
  const openChart = async (page) => {
    const toggle = page.locator('button[aria-expanded]:has(svg)').filter({ hasText: /./ }).first();
    const byLabel = page.getByRole("button", { expanded: false }).filter({ hasText: /probability|uwezekano|概率/i }).first();
    for (const loc of [byLabel, toggle]) {
      if ((await loc.count()) > 0) {
        await loc.click().catch(() => {});
        await page.waitForTimeout(350);
        if ((await page.locator(".pchart-ranges").count()) > 0) return true;
      }
    }
    return (await page.locator(".pchart-ranges").count()) > 0;
  };

  let marketHref = null;
  for (const href of candidates) {
    const c = await localisedContext(b, { locale: "en", width: 1280, height: 900, baseUrl: BASE, reducedMotion: "reduce" });
    const pg = await c.newPage();
    await pg.goto(`${BASE}${href}`, { waitUntil: "networkidle", timeout: 90000 });
    await pg.waitForTimeout(300);
    const found = await openChart(pg);
    await c.close();
    if (found) { marketHref = href; break; }
  }

  if (!marketHref) {
    // ⛔ Refuse rather than skip quietly. Reporting "the chart control is fine" over a rail that
    //    was never on screen is the exact shape of a check that lies (50pick-standards §5b r5).
    failures.push(`chart range: no market among ${candidates.length} candidates exposes a range rail once the chart is opened — the control was never probed.`);
  } else {
    for (const W of [{ n: "360", w: 360, h: 780 }, { n: "768", w: 768, h: 1024 }, { n: "1280", w: 1280, h: 900 }, { n: "1920", w: 1920, h: 1080 }]) {
      const ctx = await localisedContext(b, { locale: "en", width: W.w, height: W.h, baseUrl: BASE, reducedMotion: "reduce" });
      const p = await ctx.newPage();
      await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle", timeout: 90000 });
      await assertLang(p, "en");
      await p.waitForTimeout(400);
      await openChart(p);
      await p.waitForTimeout(250);

      const r = await p.evaluate((min) => {
        const rail = document.querySelector(".pchart-ranges");
        if (!rail) return { absent: true };
        rail.scrollIntoView({ block: "center" });
        const btns = [...rail.querySelectorAll(".pchart-range")];
        const header = rail.parentElement;
        const hits = [];
        for (const btn of btns) {
          const br = btn.getBoundingClientRect();
          if (br.height === 0 || br.top < 60 || br.bottom > innerHeight - 45) { hits.push(null); continue; }
          const x = Math.round((br.left + br.right) / 2);
          const cy = (br.top + br.bottom) / 2;
          const owns = (el) => !!el && (el === btn || btn.contains(el));
          let up = 0, down = 0;
          for (let d = 0; d <= 40; d++) { if (owns(document.elementFromPoint(x, Math.round(cy - d)))) up = d; else break; }
          for (let d = 0; d <= 40; d++) { if (owns(document.elementFromPoint(x, Math.round(cy + d)))) down = d; else break; }
          hits.push({ painted: Math.round(br.height), hit: up + down + 1 });
        }
        const hr = header.getBoundingClientRect();
        return {
          min,
          count: btns.length,
          hits,
          headerH: Math.round(hr.height),
          // The header is one flex row: it cannot wrap onto a second line, but it CAN overflow
          // its own box, which is what a squeezed 10px mono label actually looks like.
          headerOverflow: Math.round(header.scrollWidth - header.clientWidth),
          pageOverflow: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      }, RANGE_MIN);

      if (r.absent) {
        failures.push(`chart range @${W.n}: no .pchart-ranges rail on ${marketHref} — nothing probed`);
        console.log(`chart     ${W.n.padStart(4)} | NO RAIL`);
      } else {
        const probed = r.hits.filter(Boolean);
        rangesProbed += probed.length;
        const minHit = probed.length ? Math.min(...probed.map((h) => h.hit)) : 0;
        const minPainted = probed.length ? Math.min(...probed.map((h) => h.painted)) : 0;
        if (!probed.length) failures.push(`chart range @${W.n}: rail found but no button was probeable in the viewport`);
        if (probed.length && minHit < RANGE_MIN) failures.push(`chart range @${W.n}: smallest hit area ${minHit}px (< ${RANGE_MIN}) — paint order may be taking the pixels back`);
        if (probed.length && minPainted < RANGE_MIN) failures.push(`chart range @${W.n}: painted height ${minPainted}px (< ${RANGE_MIN})`);
        if (r.headerOverflow > 1) failures.push(`chart range @${W.n}: the chart header overflows its own box by ${r.headerOverflow}px`);
        if (r.pageOverflow > 1) failures.push(`chart range @${W.n}: the page overflows horizontally by ${r.pageOverflow}px`);
        console.log(`chart     ${W.n.padStart(4)} | buttons=${probed.length}/${r.count} hitArea=${minHit}px painted=${minPainted}px header=${r.headerH}px overflow=${r.headerOverflow}px`);
      }
      await p.screenshot({ path: `.50pick-shots/chart-range-${W.n}.png` }).catch(() => {});
      await ctx.close();
    }
  }
}

await b.close();

console.log(`\n${cardsProbed} cards hit-tested · ${rangesProbed} chart-range buttons hit-tested`);
if (!cardsProbed) { console.log("FAILED: nothing was probed — this proves nothing."); process.exit(1); }
if (failures.length) { console.log(`FAILURES (${failures.length}):`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log(`every Details target >= ${TAP_MIN}px · every row still painted at 17px · no info button swallowed`);
console.log(`every chart-range target >= ${RANGE_MIN}px · the chart header does not overflow at 4 widths`);
