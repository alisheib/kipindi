/**
 * `npm run test:admin-charts` — the admin chart primitives, RENDERED, at the edges.
 *
 * ⛔ WHY RENDERED AND NOT GREPPED. This codebase has already shipped a chart that
 * FABRICATED price history for real-money bettors, and a card that badged a fabricated
 * 50% crowd price on an empty pool. A chart defect lives in the geometry the component
 * emits, not in the characters of its source — so every assertion below reads the actual
 * SVG/HTML that `renderToStaticMarkup` produces and checks a property of it.
 *
 * THE EDGES THAT MANUFACTURE A FAKE POINT, and they are the same three every time:
 *   · an EMPTY series      — does it say so, or paint something?
 *   · a ONE-POINT series   — a line needs two points; what does it draw?
 *   · an ALL-ZERO series   — does a zero paint a visible mark?
 *   · a tiny RANGE         — do the axis labels still describe the gridlines they sit on?
 *   · a huge OUTLIER       — does the scale survive it?
 *
 * ⭐ THE AXIS ONE IS THE FINDING. `compact()` rounds every y-tick to a whole number, but
 * the ticks are `min + t*range` for t ∈ {0,.25,.5,.75,1}. On any chart whose range is
 * small — a count series topping out at 1, 2 or 3, which is ordinary on a young platform —
 * distinct gridlines get IDENTICAL or WRONG labels. A reader taking a value off the axis
 * reads a number the chart does not mean.
 */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminAreaChart, AdminStackedBars, AdminSpark, AdminMeter, AdminBarList, AdminGauge, CATEGORICAL_RAMP,
  type SeriesPoint,
} from "../src/components/admin/admin-charts.tsx";
import { AdminStackedBar } from "../src/components/admin/admin-shell.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const pts = (ys: number[]): SeriesPoint[] => ys.map((y, x) => ({ x, y }));

/** Every `<text …>LABEL</text>` in render order. */
function texts(html: string): string[] {
  return [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
}
/** The y-tick labels of an AdminAreaChart: the 5 emitted before the area path. */
function yTickLabels(html: string): string[] {
  const cut = html.indexOf("<path");
  return texts(cut > 0 ? html.slice(0, cut) : html);
}

console.log("\ntest:admin-charts — the chart primitives, rendered, at the edges\n");

// ── §1 · AdminAreaChart ────────────────────────────────────────────────────────────
console.log("§1 AdminAreaChart");
{
  const empty = render(h(AdminAreaChart, { series: [] }));
  ok("§1 empty series says 'No data in this window' rather than drawing", empty.includes("No data in this window"));
  ok("§1 empty series emits NO <path> (nothing is drawn from nothing)", !empty.includes("<path"));

  const one = render(h(AdminAreaChart, { series: pts([7]) }));
  const onePaths = [...one.matchAll(/<path d="([^"]*)"/g)].map((m) => m[1]);
  // A single point cannot make a line. The line path must not invent a second vertex.
  const lineSegs = (onePaths[1] ?? "").match(/L /g)?.length ?? 0;
  ok("§1 a ONE-POINT series does not invent a second vertex", lineSegs === 0, `line path = "${onePaths[1] ?? ""}"`);

  // ⭐ THE AXIS. Ticks are min + t*range for t in {0,.25,.5,.75,1}; with 5 DISTINCT tick
  // values the 5 labels must also be distinct, or two different gridlines carry one number.
  for (const [name, series] of [
    ["max 1", pts([0, 1, 0, 1])],
    ["max 2", pts([0, 1, 2, 1])],
    ["max 3", pts([0, 3, 1, 2])],
    ["max 4", pts([0, 4, 2, 1])],
  ] as const) {
    const html = render(h(AdminAreaChart, { series: series as SeriesPoint[] }));
    const labels = yTickLabels(html);
    const uniq = new Set(labels);
    ok(
      `§1 y-axis labels are distinct for a series with ${name} (5 gridlines, 5 different values)`,
      labels.length === 5 && uniq.size === 5,
      `labels=[${labels.join(", ")}] unique=${uniq.size}`,
    );
  }

  // A zero-range series: every tick IS the same value, so identical labels are correct.
  const flat = render(h(AdminAreaChart, { series: pts([0, 0, 0, 0]) }));
  ok("§1 CONTROL — an all-zero series renders (its axis may legitimately repeat)", flat.includes("<path"));

  // A huge outlier must not produce NaN/Infinity in the geometry.
  const huge = render(h(AdminAreaChart, { series: pts([0, 1, 9_999_999_999]) }));
  ok("§1 a huge outlier emits no NaN/Infinity coordinates", !/NaN|Infinity/.test(huge));
  ok("§1 CONTROL — the huge value is compacted on the axis, not printed raw",
    yTickLabels(huge).some((l) => /B$/.test(l)), `labels=[${yTickLabels(huge).join(", ")}]`);
}

// ── §2 · AdminStackedBars ──────────────────────────────────────────────────────────
console.log("\n§2 AdminStackedBars");
{
  const empty = render(h(AdminStackedBars, { bars: [] }));
  ok("§2 empty bars say 'No data' rather than drawing", empty.includes("No data"));
  ok("§2 empty bars emit NO <rect>", !empty.includes("<rect"));

  // ⛔ A ZERO SEGMENT MUST NOT PAINT. `Math.max(0.5, segH)` gives a zero-volume rail a
  // visible sliver in a provider-mix chart — a mark where there is no data.
  const zeroSeg = render(h(AdminStackedBars, { bars: [{ label: "d1", segments: [10, 0, 5] }] }));
  const heights = [...zeroSeg.matchAll(/<rect[^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
  ok("§2 a ZERO segment paints no height (a rail with no volume shows none)",
    !heights.includes(0.5), `heights=[${heights.join(", ")}]`);

  const nan = render(h(AdminStackedBars, { bars: [{ label: "d1", segments: [0, 0] }] }));
  ok("§2 an all-zero stack emits no NaN", !/NaN|Infinity/.test(nan));
}

// ── §3 · AdminSpark ────────────────────────────────────────────────────────────────
console.log("\n§3 AdminSpark");
{
  ok("§3 a 0-point series renders nothing rather than a flat invented line",
    render(h(AdminSpark, { series: [] })) === "");
  ok("§3 a 1-point series renders nothing (a line needs two points)",
    render(h(AdminSpark, { series: [5] })) === "");
  const two = render(h(AdminSpark, { series: [1, 2] }));
  ok("§3 CONTROL — a 2-point series DOES draw", two.includes("<path"));
  ok("§3 a constant series emits no NaN", !/NaN|Infinity/.test(render(h(AdminSpark, { series: [4, 4, 4] }))));
}

// ── §4 · AdminMeter ────────────────────────────────────────────────────────────────
console.log("\n§4 AdminMeter");
{
  // ⛔ `Math.max(1, pct)` paints 1% for a zero value.
  const zero = render(h(AdminMeter, { value: 0, cap: 100, label: "Credit" }));
  const w = zero.match(/width:\s*([\d.]+)%/)?.[1];
  ok("§4 a ZERO value paints no fill", w === "0", `width=${w}%`);

  // cap = 0 — division guarded, and the label must not read as a real ratio.
  const noCap = render(h(AdminMeter, { value: 5, cap: 0, label: "Credit" }));
  ok("§4 cap=0 emits no NaN", !/NaN|Infinity/.test(noCap));

  // Over-cap: the BAR clamps, so the disclosure has to come from the number.
  const over = render(h(AdminMeter, { value: 150, cap: 100, label: "Credit" }));
  ok("§4 over-cap still prints the true value (the bar clamps, so the number must not)",
    over.includes("150"), "the ring/bar is clamped to 100% by design");
  ok("§4 CONTROL — over-cap flips to the danger colour", over.includes("var(--no-500)"));
}

// ── §5 · AdminBarList ──────────────────────────────────────────────────────────────
console.log("\n§5 AdminBarList");
{
  // ⛔ `Math.max(2, pct)` paints 2% for a zero row — the most visible of the three floors.
  const withZero = render(h(AdminBarList, { rows: [{ label: "M-Pesa", value: 100 }, { label: "Airtel", value: 0 }] }));
  const widths = [...withZero.matchAll(/width:\s*([\d.]+)%/g)].map((m) => m[1]);
  ok("§5 a ZERO row paints no bar", widths.includes("0") || !widths.includes("2"), `widths=[${widths.join(", ")}]`);
  ok("§5 CONTROL — the non-zero row still paints full width", widths.includes("100"), `widths=[${widths.join(", ")}]`);

  const allZero = render(h(AdminBarList, { rows: [{ label: "a", value: 0 }, { label: "b", value: 0 }] }));
  ok("§5 an all-zero list emits no NaN", !/NaN|Infinity/.test(allZero));
  ok("§5 CONTROL — an empty list renders without throwing", render(h(AdminBarList, { rows: [] })).length >= 0);

  // ⭐ THE ANTI-COLLATERAL ASSERTION. A5's fix is "zero is zero", NOT "small values vanish".
  // A row worth 1 in 10,000 is 0.01% and would be a sub-pixel bar, so the 2% floor must
  // survive for every non-zero value — otherwise the fix trades one misreading for another
  // and nothing would notice. ⚠️ This is expected to pass in BOTH states, on purpose: a check
  // that only goes red with the defect cannot protect the thing the fix might break.
  const tiny = render(h(AdminBarList, { rows: [{ label: "big", value: 10_000 }, { label: "tiny", value: 1 }] }));
  const tinyWidths = [...tiny.matchAll(/width:\s*([\d.]+)%/g)].map((m) => Number(m[1]));
  ok("§5 CONTROL — a tiny NON-zero row still paints its visibility floor",
    tinyWidths.includes(2), `widths=[${tinyWidths.join(", ")}]`);

  const tinyMeter = render(h(AdminMeter, { value: 1, cap: 10_000, label: "Credit" }));
  ok("§4 CONTROL — a tiny NON-zero meter still paints its 1% floor",
    /width:\s*1%/.test(tinyMeter), tinyMeter.match(/width:\s*[\d.]+%/)?.[0] ?? "none");

  const tinySeg = render(h(AdminStackedBars, { bars: [{ label: "d1", segments: [10_000, 1] }] }));
  const segHeights = [...tinySeg.matchAll(/<rect[^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
  ok("§2 CONTROL — a tiny NON-zero segment still paints its 0.5px floor",
    segHeights.includes(0.5), `heights=[${segHeights.join(", ")}]`);
}

// ── §6 · AdminGauge ────────────────────────────────────────────────────────────────
console.log("\n§6 AdminGauge");
{
  const zero = render(h(AdminGauge, { value: 0, max: 100 }));
  ok("§6 a zero gauge emits no NaN", !/NaN|Infinity/.test(zero));
  const noMax = render(h(AdminGauge, { value: 5, max: 0 }));
  ok("§6 max=0 emits no NaN", !/NaN|Infinity/.test(noMax));
  const over = render(h(AdminGauge, { value: 150, max: 100 }));
  ok("§6 over-max still prints the true value (the arc clamps, so the number must not)", over.includes("150"));
}

// ── §7 · AdminStackedBar — the SINGULAR flex one ───────────────────────────────────
console.log("\n§7 AdminStackedBar");
/**
 * 🔴 S-04 (scan #1, 2026-08-28). This primitive had NO empty state, and /admin/compliance
 * floored every segment at `Math.max(2, …)` over a `|| 1` denominator. With zero
 * reality-check events all three landed on that floor, so the card painted THREE EQUAL
 * COLOURED BANDS — including the rose self-exclusion band — under a caption reading
 * "0% continued · 0% break · 0% self-excluded". A distribution presented where none exists,
 * on the compliance console, in the row a regulator's eye goes to.
 *
 * ⚠️ Its plural sibling `AdminStackedBars` (§2) always HAD an empty state. Only the singular
 * flex one did not — exactly the asymmetry a source scan reports as "there is an empty state"
 * and a render test does not.
 */
{
  const bands = (html: string) => [...html.matchAll(/background:/g)].length;

  const empty = render(h(AdminStackedBar, { segments: [] }));
  ok("§7 an EMPTY bar paints no bands at all", bands(empty) === 0, `${bands(empty)} bands`);
  ok("§7 …and says so in words rather than showing an empty frame", /No activity/i.test(empty));

  const allZero = render(h(AdminStackedBar, {
    segments: [
      { flex: 0, color: "var(--text-tertiary)" },
      { flex: 0, color: "var(--warning-fg)" },
      { flex: 0, color: "var(--bet-lose)" },
    ],
  }));
  ok("§7 🔴 an ALL-ZERO bar paints no bands — the S-04 defect", bands(allZero) === 0, `${bands(allZero)} bands`);
  ok("§7 …and does not paint the rose self-exclusion band over an empty window",
    !allZero.includes("--bet-lose"));

  ok("§7 the empty label is the caller's own words, not a generic placeholder",
    render(h(AdminStackedBar, { segments: [], emptyLabel: "No reality-check activity in window" }))
      .includes("No reality-check activity in window"));

  // ⭐ POSITIVE CONTROL — real data must still draw, or "never render" would pass everything.
  const real = render(h(AdminStackedBar, {
    segments: [
      { flex: 7, color: "var(--text-tertiary)" },
      { flex: 2, color: "var(--warning-fg)" },
      { flex: 1, color: "var(--bet-lose)" },
    ],
  }));
  ok("§7 ⭐ CONTROL — a bar WITH data still paints every band", bands(real) === 3, `${bands(real)} bands`);
  ok("§7 …and does not claim to be empty", !/No activity/i.test(real));

  // A zero segment among real ones is dropped, not floored into a visible sliver.
  const mixed = render(h(AdminStackedBar, {
    segments: [
      { flex: 7, color: "var(--text-tertiary)" },
      { flex: 0, color: "var(--warning-fg)" },
      { flex: 3, color: "var(--bet-lose)" },
    ],
  }));
  ok("§7 ⛔ a ZERO segment beside real ones is not painted", bands(mixed) === 2, `${bands(mixed)} bands`);
  ok("§7 …and it is the ZERO one that is missing, not just any of them",
    !mixed.includes("--warning-fg") && mixed.includes("--bet-lose"));

  /* ⭐ THE ANTI-COLLATERAL ASSERTION, as §5 does for AdminBarList. The fix is "zero is zero",
   * NOT "small values vanish". One self-exclusion against 999 continues is a real and important
   * event; a raw flex share would render it sub-pixel. Expected to pass in BOTH states, on
   * purpose — a check that only goes red with the defect cannot protect what the fix might break. */
  const tiny = render(h(AdminStackedBar, {
    segments: [
      { flex: 999, color: "var(--text-tertiary)" },
      { flex: 1, color: "var(--bet-lose)" },
    ],
  }));
  const flexes = [...tiny.matchAll(/flex:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  ok("§7 ⭐ CONTROL — a tiny NON-zero segment still paints its 2% visibility floor",
    flexes.includes(0.02), `flexes=[${flexes.join(", ")}]`);
}

// ── §8 · THE CATEGORICAL RAMP — contrast RECOMPUTED from the tokens ────────────────
console.log("\n§8 CATEGORICAL_RAMP");
/**
 * 🔴 S-03 + S-12 (scan #1, 2026-08-28). `AdminStackedBar` hardcoded `text-white` while the
 * fill arrived as a free-form string, and the provider ramp put four of its five bands under
 * that ink at 2.19–4.28:1 where 10px text needs 4.5:1.
 *
 * ⛔ WHY THIS LIVES HERE AND NOT IN `test:contrast`. That gate's corpus is four CSS FILES.
 * This pair forms at RUNTIME, from an inline `style={{ background }}` in a .tsx against a
 * class — neither half is in a stylesheet, so a pure-CSS gate stays green over it FOR EVER.
 * The scan said so explicitly, and it is the reason the defect survived every audit.
 *
 * ⭐ SO THE RATIOS ARE RECOMPUTED FROM THE TOKEN VALUES, not asserted as remembered numbers.
 * OKLCH → linear sRGB → WCAG relative luminance, read out of globals.css. Restyle `--gold-400`
 * two steps lighter and this fails, which a hardcoded expected-ratio table never would.
 */
{
  const { readFileSync: rf } = await import("node:fs");
  const css = rf(new URL("../src/app/globals.css", import.meta.url), "utf8");

  /** `--royal-700: oklch(32% 0.150 268);` → [L,C,h] */
  const token = (name: string): [number, number, number] | null => {
    const m = css.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`));
    return m ? [Number(m[1]) / 100, Number(m[2]), Number(m[3])] : null;
  };
  const toLinear = ([L, C, h]: [number, number, number]) => {
    const rad = (h * Math.PI) / 180, a = C * Math.cos(rad), b = C * Math.sin(rad);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ] as [number, number, number];
  };
  const lum = ([r, g, b]: [number, number, number]) => {
    const c = (v: number) => Math.max(0, Math.min(1, v));
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const contrast = (x: [number, number, number], y: [number, number, number]) => {
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  /** A ramp entry's colour: a `var(--token)` or the literal white the kit uses for ink. */
  const resolve = (v: string): [number, number, number] | null => {
    if (v === "#fff" || v === "#ffffff") return [1, 1, 1];
    const name = v.match(/var\(--([\w-]+)\)/)?.[1];
    const t = name ? token(name) : null;
    return t ? toLinear(t) : null;
  };

  let worst = Infinity;
  let resolved = 0;
  for (const { fill, ink } of CATEGORICAL_RAMP) {
    const f = resolve(fill), i = resolve(ink);
    // ⛔ A token that does not resolve must FAIL, not silently skip. A renamed or typo'd
    // token would otherwise drop out of the population and the ramp would "pass" on fewer
    // and fewer bands — the shape this repo has paid for on every scanner that went blind.
    // ⚠️ NOT `if (!ok(…)) continue` — this suite's `ok` returns void, so that reads as
    // "always continue" and every ratio below is silently skipped while the summary check
    // passes on `worst = Infinity`. That vacuous pass is exactly what the reconciliation
    // two checks down caught, and it is why the count is asserted rather than assumed.
    const bothResolve = !!f && !!i;
    ok(`§8 ${fill} and ${ink} both resolve to real tokens`, bothResolve);
    if (!bothResolve) continue;
    resolved++;
    const r = contrast(f!, i!);
    worst = Math.min(worst, r);
    ok(`§8 ${fill} on ${ink} reaches AA at 10px`, r >= 4.5, `${r.toFixed(2)}:1`);
  }
  ok("§8 ⛔ every ramp entry was actually measured — the loop is not vacuous",
    resolved === CATEGORICAL_RAMP.length, `${resolved}/${CATEGORICAL_RAMP.length}`);
  ok("§8 ⭐ the whole ramp clears AA", worst >= 4.5, `worst = ${worst.toFixed(2)}:1`);

  // Bands must be tellable APART, or a five-way categorical is a four-way one.
  for (let k = 0; k < CATEGORICAL_RAMP.length - 1; k++) {
    const a = resolve(CATEGORICAL_RAMP[k].fill)!, b = resolve(CATEGORICAL_RAMP[k + 1].fill)!;
    ok(`§8 band ${k + 1} is distinguishable from band ${k + 2}`, contrast(a, b) >= 1.5,
      `${contrast(a, b).toFixed(2)}:1`);
  }

  /* ⛔ S-12 — aqua and claret carry meanings that are not "provider #4".
     DESIGN_AUTHORITY §B4: aqua is finishing-pass only, "never a chip, button label, or
     anything semantic", and §B4b names /admin/live as an exception BY NAME. §B4a makes claret
     the colour of an irreversible operator ceremony. */
  const rampText = CATEGORICAL_RAMP.map((c) => `${c.fill} ${c.ink}`).join(" ");
  ok("§8 ⛔ the ramp borrows no aqua (finishing pass only — /admin/live is the named exception)",
    !/aqua/.test(rampText), rampText);
  ok("§8 ⛔ …and no claret (the colour of an irreversible ceremony)", !/claret/.test(rampText), rampText);

  /* ⭐ ONE DEFINITION. The ramp was written out twice, byte-identically, in admin-charts.tsx
     and admin/page.tsx — two literals painting the same semantic dimension with nothing
     linking them. A second copy is how they drift apart again. */
  const pageSrc = rf(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  ok("§8 ⭐ /admin no longer keeps its own copy of the ramp",
    !/\[\s*"var\(--royal\)"/.test(pageSrc) && !/provColors\s*=/.test(pageSrc));
  ok("§8 …and imports the shared one instead", /CATEGORICAL_RAMP/.test(pageSrc));
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
