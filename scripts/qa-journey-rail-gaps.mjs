/**
 * qa:journey-rail-gaps — THE JOURNEY RAIL'S TEXT GEOMETRY ON THE PHONES' TWO ENGINES (MASWALI-BUILD S5-FIX-PLATFORM D14,
 * 2026-10-21, the five-tab rail; S5 round 2 · PLATFORM, 2026-10-22, the four-tab rail; S5-R3-FIX F2, 2026-10-23: measured
 * in Chromium AND WebKit, DESIGN_AUTHORITY §M4a rule 5; `test:visual-pass-r9c` §4–§4c holds the stylesheet with its model).
 *
 *   FEATURE_SIMPLEJOURNEY=ACTIVE on a running server (+ FEATURE_MILLIONEA=ACTIVE for the five tabs; anything else, or none,
 *   for the four), then:
 *   BASE=http://localhost:3501 node scripts/qa-journey-rail-gaps.mjs [outDir]
 *   (WIDTHS=320,333,… · ENGINES=chromium,webkit · RATIOS=2.625,3,1 · LOCALES=en,sw,zh to narrow it)
 *
 * In each engine, at each pixel ratio and language, a guest's journey home resized through every width (default 320–460,
 * one pixel apart: every threshold of the rail's rules lies inside it), each cell read as the engine draws it:
 *   1. WHOLE — every label's natural width (a copy, unconstrained: one line where the label is one line, its longest word
 *      where it may wrap) no wider than its own box, to the hundredth of a pixel; at every ratio (a cut is never allowed);
 *   2. THE GAP — at a phone's ratio (2.625, 3) no two neighbouring labels' ink closer than MIN (8px: the 56px pips' own gap
 *      in a fifth of 320), five tabs or four;
 *   3. THE PIPS — every pip's top on one line (±0.5px): a two-line label never lifts a pip;
 *   4. R9-C — where no label wraps, the slots stand centred (their content as far from the rail's edge as from its foot,
 *      ±1px): the top-stacking is only for a rail with a wrapped label.
 * Tiles of the rail at ratio 3: 320, 336, 340, 347, 360 and 440 (outDir, default .qa-artifacts/journey-rail-gaps/).
 * One check per engine × ratio × language, its failing cells listed; the summary counts the cells.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "journey-rail-gaps"));
const MIN = Number(process.env.MIN || 8);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : range(320, 460);
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const RATIOS = (process.env.RATIOS || "2.625,3,1").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const SHOTS = [320, 336, 340, 347, 360, 440];
mkdirSync(OUT, { recursive: true });

/** In the page: the rail as drawn — each slot's label (text, lines, ink, natural cut) and boxes. */
const READ = () => {
  const rail = document.querySelector("nav.kp-rail--journey");
  if (!rail) return null;
  const R = (el) => { const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
  const slots = [...rail.querySelectorAll(".kp-rail__item")].map((item) => {
    const label = item.querySelector(".kp-rail__label");
    const pip = item.querySelector(".kp-rail__pip");
    const rects = [];
    const walk = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const x of range.getClientRects()) if (x.width > 0) rects.push(x);
    }
    const cs = getComputedStyle(label);
    const ics = getComputedStyle(item);
    const copy = label.cloneNode(true);
    copy.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;max-width:none;width:${cs.whiteSpace === "nowrap" ? "max-content" : "min-content"}`;
    label.parentElement.appendChild(copy);
    const cut = copy.getBoundingClientRect().width - label.getBoundingClientRect().width;
    copy.remove();
    return {
      text: label.textContent.trim(), ls: cs.letterSpacing,
      lines: new Set(rects.map((x) => Math.round(x.top))).size,
      inkL: rects.length ? Math.min(...rects.map((x) => x.left)) : 0, inkR: rects.length ? Math.max(...rects.map((x) => x.right)) : 0,
      cut: Math.round(cut * 100) / 100,
      item: R(item), pip: R(pip), label: R(label), padT: parseFloat(ics.paddingTop), padB: parseFloat(ics.paddingBottom),
    };
  });
  return { tabs: rail.getAttribute("data-tabs") ?? String(slots.length), slots };
};

let failed = 0;
let cells = 0;
const rows = [];
try {
  for (const engine of ENGINES) {
    const browser = await (engine === "webkit" ? webkit : chromium).launch();
    try {
      for (const dsf of RATIOS) {
        for (const l of LOCALES) {
          const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 780 }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true });
          // A returning visitor: WebKit's automated user agent is not the primer's to recognise, and a first visit's primer
          // (or the How-to sheet) covers the rail's tiles; the rail's own boxes are read either way.
          await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); localStorage.setItem("50pick-howto-seen", "1"); } catch {} });
          await ctx.addCookies([{ name: "kp-locale", value: l, url: BASE }]);
          const page = await ctx.newPage();
          await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
          await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
          await page.evaluate(() => document.fonts?.ready).catch(() => {});
          await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
          await page.waitForTimeout(400);
          const bad = [];
          let least = { gap: Infinity, at: 0 }, tabs = "?";
          for (const w of WIDTHS) {
            await page.setViewportSize({ width: w, height: 780 });
            await page.evaluate(() => new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))));
            await page.waitForTimeout(20);
            const m = await page.evaluate(READ);
            cells++;
            if (!m) { bad.push(`${w}: no journey rail`); continue; }
            tabs = m.tabs;
            const s = m.slots;
            const problems = [];
            for (const x of s) if (x.cut > 0.01) problems.push(`"${x.text}" cut ${x.cut}px`);
            const gaps = s.slice(1).map((b, i) => Math.round((b.inkL - s[i].inkR) * 100) / 100);
            const g = Math.min(...gaps);
            if (g < least.gap) least = { gap: g, at: w };
            if (dsf !== 1 && !(g >= MIN - 0.05)) problems.push(`least gap ${g}px < ${MIN}`);
            const tops = s.map((x) => x.pip.t);
            if (Math.max(...tops) - Math.min(...tops) > 0.5) problems.push(`pips on ${Math.round((Math.max(...tops) - Math.min(...tops)) * 100) / 100}px of rise`);
            const wraps = s.some((x) => x.lines > 1);
            if (!wraps) {
              const x = s[0];
              const above = x.pip.t - (x.item.t + x.padT), below = (x.item.b - x.padB) - x.label.b;
              if (Math.abs(above - below) > 1) problems.push(`no label wraps, yet the slots are not centred (${Math.round(above * 100) / 100} above, ${Math.round(below * 100) / 100} below)`);
            }
            if (problems.length) bad.push(`${w}: ${problems.join(", ")}`);
            rows.push({ engine, dsf, l, w, tabs: m.tabs, gaps, wraps, labels: s.map((x) => `${x.text}${x.lines > 1 ? ` (${x.lines} lines)` : ""}`), ls: [...new Set(s.map((x) => x.ls))], problems });
            if (dsf === 3 && SHOTS.includes(w)) {
              const box = await page.locator("nav.kp-rail--journey").boundingBox().catch(() => null);
              if (box) await page.screenshot({ path: join(OUT, `rail-${tabs}tabs-${engine}-${l}-${w}.png`), clip: { x: 0, y: Math.max(0, box.y - 4), width: w, height: box.height + 8 } });
            }
          }
          const ok = bad.length === 0;
          if (!ok) failed++;
          console.log(`${ok ? "  ✓" : "  ✗"} ${engine} @${dsf} · ${l} · ${tabs} tabs · ${WIDTHS[0]}–${WIDTHS.at(-1)}px: every label whole, every pip on one line, centred where nothing wraps${dsf === 1 ? "" : `, no two labels closer than ${MIN}px`} (least gap ${least.gap}px at ${least.at})${ok ? "" : ` — ${bad.length} cell(s): ${bad.slice(0, 8).join(" | ")}`}`);
          await ctx.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
}
console.log(`\nqa:journey-rail-gaps: ${cells} cells in ${ENGINES.join(" + ")} at ratios ${RATIOS.join(", ")} · ${failed} check(s) failed (shots in ${OUT})`);
process.exitCode = failed ? 1 : 0;
