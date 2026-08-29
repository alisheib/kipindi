/**
 * PROVE the admin charts' axis labels are READABLE TEXT and not stretched artwork — DG-A-15.
 *
 * ⛔ THE DEFECT THIS EXISTS TO CATCH, MEASURED ON PRODUCTION 2026-08-29. Every `AdminAreaChart`
 * and `AdminStackedBars` draws into a **1200-wide** viewBox with `preserveAspectRatio="none"`,
 * and then renders that box at whatever width the card gives it — 530px on `/admin/finance`'s
 * two-up grid. `none` means the two axes scale INDEPENDENTLY, so at 1440 the glyphs are
 * multiplied by **scaleX 0.44 and scaleY 1.00**: an 11px axis label renders 11px TALL and
 * **4.9px WIDE**. It is not small text — it is text condensed to 44% of its own width, which no
 * font-size floor and no screenshot diff would describe correctly.
 *
 * ⛔ AND `scaleY` IS EXACTLY 1.0 — the register's "and vertically by height/240" is wrong, and
 * that matters: a guard that asserted a HEIGHT floor would have passed this defect forever.
 * The measurement that separates the two is the RATIO of the axes, not either one alone.
 *
 * ⭐ WHY A BOUNDING BOX IS THE RIGHT INSTRUMENT HERE, unlike `qa:popover-clip`. There the
 * question was "is this painted?", which a rect cannot answer. Here the question is "by how
 * much is this glyph distorted?", which is pure geometry — and the SVG's own rendered box
 * against its own viewBox answers it exactly, with no font metrics involved.
 *
 * Four assertions, over every text-bearing chart on five admin routes × three widths:
 *   1. ISOTROPY — a glyph's horizontal and vertical scale agree (≤ 12% apart). This is the
 *      defect itself, and it is scale-free: it fails at 530px and at 1200px alike.
 *   2. READABLE — the EFFECTIVE size (declared × scale) is ≥ 10px in BOTH dimensions. 10 is
 *      `--type-micro`, the smallest size this platform sets anywhere (globals.css:215).
 *   3. NO OVERLAP — labels sharing an axis row do not collide. ⚠️ This assertion is the price
 *      of fixing 1: condensed labels could never touch each other. Un-condensing them without
 *      guarding the gap would trade a readability defect for a legibility one.
 *   4. IN THE BOX — no label is clipped by the chart's own left or right edge. The y-axis
 *      gutter has to be sized in the READER'S pixels; sized in the DATA's coordinate space it
 *      shrinks with the card, which is how the defect got here in the first place.
 *
 * ⛔ ZERO CHARTS PROBED IS A SKIPPED RUN, NEVER A PASS.
 *
 * ⚠️ ONE CONTEXT FOR THE WHOLE DRIVE, AND THAT IS A MEASURED REQUIREMENT, NOT A STYLE CHOICE.
 * The first version of this file opened a FRESH context per route×width from one saved
 * `storageState`, exactly as `qa:toggle-hit` does. It measured 7 pages and then read the
 * SIGN-IN PAGE for the remaining 8 — first failing immediately after `/admin/live`, the one
 * route here that holds a stream open. The saved state stops being accepted partway through;
 * a single context keeps whatever the server rotates into it, and the failure disappears.
 * ⛔ Do not "tidy" this back into per-cell contexts. And note the shape: every one of those 8
 * pages returned HTTP 200 and rendered fine — only the `/auth/` check told the truth.
 *
 *   node scripts/chart-axis-test.mjs [baseUrl]      (default: production)
 */
import { chromium } from "playwright";
import { loginOnce, BASE as DEFAULT_BASE } from "./live/harness.mjs";

const BASE = process.argv[2] || DEFAULT_BASE;

/** The floor is `--type-micro` (10px) — the smallest size the platform sets anywhere. */
const MIN_EFFECTIVE_PX = 10;
/** Isotropy tolerance. Sub-pixel rounding on a 530px box moves the ratio by ~1%; 0.44 is the defect. */
const MAX_ANISOTROPY = 0.12;

/** Every admin route that renders a chart with text on it. */
const ROUTES = [
  { path: "/admin/finance", why: "2× AdminAreaChart + AdminStackedBars in a 2-up grid — the P1 case" },
  { path: "/admin", why: "the overview area chart, full-width" },
  { path: "/admin/live", why: "live flow chart" },
  { path: "/admin/ai-usage", why: "spend series beside AdminMeter" },
  { path: "/admin/players/cohorts", why: "registrations series beside AdminBarList" },
];
const WIDTHS = [
  { n: "1920", w: 1920, h: 1000 },
  { n: "1440", w: 1440, h: 1000 },
  { n: "390", w: 390, h: 844 },
];

/**
 * Collect every chart label on the page, whether it is SVG `<text>` or an HTML axis layer,
 * with the scale actually applied to it.
 */
const probe = () => {
  const labels = [];
  const charts = [];

  const push = (l) => { if (l.text) labels.push(l); };

  // ── SVG text: the scale comes from the svg's own box against its own viewBox ──
  for (const svg of document.querySelectorAll("svg[viewBox]")) {
    const vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const q = svg.getBoundingClientRect();
    if (vb.length !== 4 || !vb[2] || !vb[3] || q.width < 2 || q.height < 2) continue;
    const texts = [...svg.querySelectorAll("text")].filter((t) => (t.textContent || "").trim());
    if (!texts.length) continue;
    const sx = q.width / vb[2];
    const sy = q.height / vb[3];
    const chartIdx = charts.length;
    charts.push({ kind: "svg", box: { left: q.left, right: q.right }, sx: +sx.toFixed(3), sy: +sy.toFixed(3), par: svg.getAttribute("preserveAspectRatio") || "(default)" });
    for (const t of texts) {
      const fs = parseFloat(getComputedStyle(t).fontSize) || 0;
      const r = t.getBoundingClientRect();
      push({
        chartIdx, kind: "svg-text", text: (t.textContent || "").trim().slice(0, 18),
        declaredFs: fs, sx: +sx.toFixed(3), sy: +sy.toFixed(3),
        effW: +(fs * sx).toFixed(2), effH: +(fs * sy).toFixed(2),
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      });
    }
  }

  // ── HTML axis layers: scale 1 by construction, so the declared size IS the effective one ──
  const byRoot = new Map();
  for (const el of document.querySelectorAll("[data-chart-label]")) {
    // ⛔ A label the narrow viewport DROPS (`hidden sm:block`) is not a defect — but it has a
    // 0×0 rect at the origin, which would read as "clipped outside its chart" forever. Skip it
    // on `display: none` EXPLICITLY, never on "the rect looks empty": a genuinely collapsed
    // label that is still displayed must keep failing.
    if (getComputedStyle(el).display === "none") continue;
    const root = el.closest("[data-chart]") || el.parentElement;
    if (!byRoot.has(root)) {
      const q = root.getBoundingClientRect();
      byRoot.set(root, charts.length);
      charts.push({ kind: "html", box: { left: q.left, right: q.right }, sx: 1, sy: 1, par: "(html layer)" });
    }
    const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
    const r = el.getBoundingClientRect();
    push({
      chartIdx: byRoot.get(root), kind: "html-label", axis: el.getAttribute("data-chart-label"),
      text: (el.textContent || "").trim().slice(0, 18),
      declaredFs: fs, sx: 1, sy: 1, effW: fs, effH: fs,
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
    });
  }

  return { charts, labels };
};

const b = await chromium.launch();
const state = await loginOnce(b, "admin");
const failures = [];
let chartsProbed = 0;
let labelsProbed = 0;

const ctx = await b.newContext({ storageState: state, viewport: { width: WIDTHS[0].w, height: WIDTHS[0].h }, colorScheme: "dark" });
const p = await ctx.newPage();

for (const W of WIDTHS) {
  await p.setViewportSize({ width: W.w, height: W.h });
  for (const { path, why } of ROUTES) {
    {
    try {
      await p.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 });
      await p.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
      await p.waitForTimeout(1_200);
      // ⛔ A revoked session renders the sign-in page at HTTP 200. Say so; never score it 0/0 green.
      if (/\/auth\//.test(p.url())) { failures.push(`${path}@${W.n}: SESSION REVOKED — measured the sign-in page`); continue; }

      const { charts, labels } = await p.evaluate(probe);
      if (charts.length === 0) {
        failures.push(`${path}@${W.n}: no chart with labels found — the population shrank, re-choose it deliberately`);
        continue;
      }
      chartsProbed += charts.length;
      labelsProbed += labels.length;

      const bad = [];
      for (const l of labels) {
        const ratio = l.sy > 0 ? l.sx / l.sy : 0;
        // 1 · isotropy
        if (Math.abs(ratio - 1) > MAX_ANISOTROPY) {
          bad.push(`"${l.text}" scaleX ${l.sx} vs scaleY ${l.sy} — condensed to ${Math.round(ratio * 100)}% of its own width`);
        }
        // 2 · readable in both dimensions
        if (l.effW < MIN_EFFECTIVE_PX || l.effH < MIN_EFFECTIVE_PX) {
          bad.push(`"${l.text}" renders ${l.effW}px wide × ${l.effH}px tall (declared ${l.declaredFs}px) — under the ${MIN_EFFECTIVE_PX}px floor`);
        }
        // 4 · inside its own chart's box
        const box = charts[l.chartIdx].box;
        if (l.left < box.left - 0.5 || l.right > box.right + 0.5) {
          bad.push(`"${l.text}" spans ${Math.round(l.left)}…${Math.round(l.right)} outside its chart's ${Math.round(box.left)}…${Math.round(box.right)} — clipped by the card edge`);
        }
      }

      // 3 · no two labels sharing an axis row may collide
      const rows = new Map();
      for (const l of labels) {
        const key = `${l.chartIdx}|${Math.round(l.top / 4)}`;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(l);
      }
      for (const row of rows.values()) {
        row.sort((a, c) => a.left - c.left);
        for (let i = 1; i < row.length; i++) {
          if (row[i].left < row[i - 1].right - 0.5) {
            bad.push(`"${row[i - 1].text}" and "${row[i].text}" overlap on one axis row (${Math.round(row[i - 1].right)} > ${Math.round(row[i].left)})`);
          }
        }
      }

      for (const m of bad) failures.push(`${path}@${W.n}: ${m}`);
      const anis = charts.filter((c) => Math.abs(c.sx / c.sy - 1) > MAX_ANISOTROPY).length;
      console.log(
        `${path.padEnd(24)} @${W.n.padEnd(5)} charts=${String(charts.length).padStart(2)} labels=${String(labels.length).padStart(3)} ` +
          `${anis ? `anisotropic=${anis} ` : ""}${bad.length ? `✗ ${bad.length} FAIL` : "✓ isotropic, ≥10px, no overlap, in-box"}  — ${why}`,
      );
    } catch (e) {
      failures.push(`${path}@${W.n}: ${e.message.slice(0, 100)}`);
    }
    }
  }
}
await ctx.close();
await b.close();

console.log(`\nchart-axis: ${labelsProbed} labels across ${chartsProbed} chart renders`);
// ⛔ ZERO PROBES IS A SKIPPED RUN, NEVER A GREEN ONE. A guard that cannot fail is not a guard.
if (labelsProbed === 0) { console.error("FAIL — measured 0 chart labels. That is a broken drive, not a pass."); process.exit(1); }
if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  const seen = new Set();
  for (const f of failures) { if (seen.has(f)) continue; seen.add(f); console.error("  · " + f); }
  process.exit(1);
}
console.log("PASS — every admin chart label is isotropic, ≥10px effective in both dimensions, un-collided and inside its box.");
