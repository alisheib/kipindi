/**
 * ⭐ CHART-SPRINT D — THE CHART SYSTEM HAS ONE HOME, AND NOTHING CHARTS OUTSIDE IT.
 *
 *   npx tsx scripts/chart-one-home.test.mts     (npm run test:chart-one-home)
 *
 * DESIGN_AUTHORITY §B12: every user-level chart is a component in
 * `src/components/charts/`, or a NAMED member at a pinned address. Before the sprint there
 * were six chart implementations in six homes with four private copies of one smoothing
 * function; the never-imported `Sparkline` sat for weeks one import away from putting a
 * colour law violation on a money page. This gate holds both directions:
 *   · nothing chart-shaped exists OUTSIDE the system (§3),
 *   · everything INSIDE the system is actually imported (§4) — dead members are how the
 *     Sparkline/PriceChart class of defect breeds,
 *   · and no charting LIBRARY arrives (§5) — the decision + rejected alternatives are in
 *     DESIGN-BASELINE §8; a dependency appearing again is a reversal of a dated ruling.
 *
 * THE POPULATION (§1, re-derived every run): every `.tsx` under `src/app` and
 * `src/components`, EXCLUDING `src/app/admin`, `src/components/admin` (the console has its
 * own admin-only chart home, out of §B12's player scope) and `src/app/api` (no rendered
 * player DOM). "Chart-shaped" = computed SVG geometry (§0 proves the detectors on
 * fixtures): a path/polyline/polygon whose `d`/`points` is a JSX expression, a
 * stroke-dasharray/-offset expression (rings), a line/group with a computed `transform`
 * (needle gauges), or any `<canvas>` at all.
 *
 * ⚠️ NAMED BLIND SPOTS (DESIGN-BASELINE §5 discipline — stated, not discovered later):
 *   · an svg whose `d` is a hand-written LITERAL with data baked in at authoring time is
 *     invisible to every detector here (it is also not a chart, it is a picture);
 *   · a dead NAMED EXPORT inside a live member file (§4 sees files, not exports);
 *   · geometry built outside JSX attributes (none exists at HEAD; a new pattern needs a
 *     new detector, added WITH its red mutation).
 *
 * KP_SRC / KP_PKG point the gate at a copied tree — the red harness's mechanism
 * (red:chart-one-home), same as red-chip-one-home.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC ?? join(ROOT, "src");
const PKG = process.env.KP_PKG ?? join(ROOT, "package.json");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// ── The detectors ───────────────────────────────────────────────────────────
const D1_DATA_PATH = /<(?:path|polyline|polygon)\b[\s\S]{0,600}?\b(?:d|points)=\{/;
const D2_DASH_RING = /\bstrokeDash(?:array|offset)=\{/;
const D3_ROT_GAUGE = /<(?:line|g)\b[\s\S]{0,400}?\btransform=\{/;
const D4_CANVAS = /<canvas\b/;
const isChartShaped = (body: string) =>
  D1_DATA_PATH.test(body) || D2_DASH_RING.test(body) || D3_ROT_GAUGE.test(body) || D4_CANVAS.test(body);

// ── The system ──────────────────────────────────────────────────────────────
/** The one home. A file under here is a member by address. */
const HOME = "components/charts/";
/** Named members at pinned addresses, with the reason the pin exists. */
const NAMED_MEMBERS = new Map<string, string>([
  ["components/updown/price-hero.tsx",
    "updown-chart.test.mts imports it and updown-chart-red.mjs anchors it CRLF-sensitively; " +
    "design-frozen + eyebrow-roles pin the path — moving it churns three guards for zero player value"],
]);
/** Chart-shaped by detector, NOT a chart — each earns its place with a reason, never a bare
 *  filename (§B12 / DESIGN-BASELINE §3). ⛔ The list may only shrink, and §3.2 fails on any
 *  entry whose site no longer matches a detector — a stale exemption is a hole the size of
 *  the next defect. */
const EXEMPT = new Map<string, string>([
  ["components/badges/Badge.tsx", "badge artwork — decorative iconography, no data series"],
  ["components/brand.tsx", "brand primitives (TippingBar, needle, marks) — DESIGN_AUTHORITY §0 names the component file as their geometry home"],
  ["components/layout/needle-drawer.tsx", "the needle fidget — a brand object with its own motion law (§M8), not a data chart"],
  ["components/markets/conviction-dial.tsx", "a bet CONTROL: it sets money and reads no series; its ladder is guarded by test:dial-stake"],
  ["components/positions/countdown-ring.tsx", "time-remaining UI on a position row — a clock, not a data chart"],
  ["components/positions/pnl-summary-strip.tsx", "NeedleDial win-rate gauge — the brand needle motif (±26° tilt), same object as TippingBar's needle"],
  ["components/ui/identity-avatar.tsx", "generative avatar art seeded from an id — identity, not data"],
  ["components/updown/round-stake-panel.tsx", "a glyph chosen by variable (an arrow constant), not computed from a series"],
  ["app/updown/[roundId]/page.tsx", "a glyph chosen by variable (outcomeArrow constant), not computed from a series"],
]);

// ── §0 · the detectors work — proven on fixtures, not assumed ───────────────
console.log("\n§0 · detector fixtures");
ok("0.1 a computed-d path IS chart-shaped", D1_DATA_PATH.test("<svg><path d={line} /></svg>"));
ok("0.2 a literal-d glyph is NOT chart-shaped", !isChartShaped('<svg><path d="M4 6l6 6" strokeWidth="2" /></svg>'));
ok("0.3 a computed dash ring IS chart-shaped", D2_DASH_RING.test("<circle strokeDasharray={`${len} ${c}`} />"));
ok("0.4 a computed rotation across a line break IS chart-shaped",
   D3_ROT_GAUGE.test('<line\n  x1="22" y1="34"\n  transform={`rotate(${t} 22 34)`}\n/>'));
ok("0.5 a canvas IS chart-shaped", D4_CANVAS.test("<canvas ref={ref} />"));

// ── §1 · the corpus ─────────────────────────────────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const all = [...walk(join(SRC, "app")), ...walk(join(SRC, "components"))]
  .map((p) => relative(SRC, p).replace(/\\/g, "/"))
  .filter((p) => !p.startsWith("app/admin/") && !p.startsWith("components/admin/") && !p.startsWith("app/api/"));

console.log("\n§1 · the corpus");
ok(`1.1 the probe actually read the corpus`, all.length > 200, `${all.length} user-level .tsx files`);

// ── §2+§3 · every chart-shaped file is a member or a named exemption ────────
console.log("\n§3 · one home");
const hits = all.filter((p) => isChartShaped(decomment(readFileSync(join(SRC, p), "utf8"))));
const strays = hits.filter((p) => !p.startsWith(HOME) && !NAMED_MEMBERS.has(p) && !EXEMPT.has(p));
ok("3.1 zero chart-shaped files outside the system", strays.length === 0,
   strays.length ? `stray: ${strays.join(", ")}` : `${hits.length} chart-shaped files, all accounted for`);

const staleExempt = [...EXEMPT.keys()].filter((p) => !hits.includes(p));
ok("3.2 every exemption still matches a detector (the list may only shrink)",
   staleExempt.length === 0, staleExempt.length ? `stale: ${staleExempt.join(", ")}` : "");

const staleNamed = [...NAMED_MEMBERS.keys()].filter((p) => !all.includes(p));
ok("3.3 every named member still exists at its pinned address",
   staleNamed.length === 0, staleNamed.length ? `gone: ${staleNamed.join(", ")}` : "");

// ── §4 · every member is ALIVE — imported from outside its own file ─────────
console.log("\n§4 · no dead members (the Sparkline/PriceChart class)");
const memberFiles = all.filter((p) => p.startsWith(HOME));
const corpusBodies = new Map(all.map((p) => [p, readFileSync(join(SRC, p), "utf8")]));
// chart-core.ts is not .tsx — check it too, plus every member component.
const coreAndMembers = ["components/charts/chart-core.ts", ...memberFiles];
for (const m of coreAndMembers) {
  const spec = m.replace(/^components\/charts\//, "").replace(/\.tsx?$/, "");
  const fromAlias = `@/components/charts/${spec}`;
  const fromRel = `./${spec}`;
  let imported = false;
  for (const [p, body] of corpusBodies) {
    if (p === m) continue;
    if (body.includes(`from "${fromAlias}"`) || (p.startsWith(HOME) && body.includes(`from "${fromRel}"`))) { imported = true; break; }
  }
  // chart-core.ts is imported by members with a relative specifier; also allow scripts to
  // count later if a suite imports it — but a member no page reaches is still dead.
  if (!imported && m === "components/charts/chart-core.ts") {
    imported = [...corpusBodies.entries()].some(([p, b]) => p !== m && b.includes(`from "./chart-core"`));
  }
  ok(`4.x ${m} has an import site`, imported,
     imported ? "" : "a chart component nothing imports is one import away from a defect — delete it or wire it");
}

// ── §5 · EXACTLY ONE charting library, confined to the home ─────────────────
// 2026-09-04, Ali's direct order (same day, reversing the morning's zero-dep
// decision — both dated in DESIGN-BASELINE §8): TradingView lightweight-charts
// is adopted for the Up & Down terminal chart. The ban did not die, it became
// an ALLOWLIST OF ONE: any OTHER charting dependency is still a failure, and
// even the allowed one may only be imported by members of the home — a page
// reaching for createChart directly is a stray chart wearing a library.
console.log("\n§5 · exactly one charting library, imported only by the home");
const ALLOWED_LIB = "lightweight-charts";
const BANNED = /(recharts|chart\.js|chartjs-|\buplot\b|echarts|@nivo\/|victory|@visx\/|plotly|highcharts|apexcharts|klinecharts|"d3"|"d3-)/;
const pkg = JSON.parse(readFileSync(PKG, "utf8"));
const depNames = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const bannedDeps = depNames.filter((d) => BANNED.test(`"${d}"`));
ok("5.1 package.json carries no charting dependency beyond the allowed one", bannedDeps.length === 0,
   bannedDeps.length ? `found: ${bannedDeps.join(", ")}` : `${depNames.length} deps checked · allowed: ${ALLOWED_LIB}`);
// ⛔ BOTH import forms — static `from "x"` AND dynamic `import("x")`/`require("x")`.
// The review's refuters proved the first version matched only the static form, so
// `await import("lightweight-charts")` from any page kept the suite ALL PASS (F24) —
// and the home itself now legitimately uses the dynamic form.
const BANNED_IMPORT = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])(recharts|chart\.js|uplot|echarts|d3|victory|@nivo|@visx|plotly|highcharts|apexcharts|klinecharts)/;
const ALLOWED_IMPORT = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])lightweight-charts["']/;
const importers = all.filter((p) => BANNED_IMPORT.test(corpusBodies.get(p)!));
ok("5.2 no user-level file imports a banned one (static or dynamic)", importers.length === 0,
   importers.length ? `found: ${importers.join(", ")}` : "");
const libStrays = all.filter((p) => !p.startsWith(HOME) && ALLOWED_IMPORT.test(corpusBodies.get(p)!));
ok("5.3 the allowed library is imported ONLY under the home (static or dynamic)", libStrays.length === 0,
   libStrays.length ? `stray import: ${libStrays.join(", ")}` : "");

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed (${hits.length} chart-shaped files · ${memberFiles.length} members in the home · ${EXEMPT.size} named exemptions)`);
process.exit(fail === 0 ? 0 : 1);
