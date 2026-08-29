/**
 * `npm run qa:dg-type` — THE TYPE BENCH. DESIGN-GATE-2026-08-28, step 2.
 *
 * 🔬 WHY THIS EXISTS, AND WHY IT IS TRACKED. Step 2's two remaining decisions — the money
 * wall (§M4 vs every Tailwind rung) and the micro/label name collision between the two
 * ladders — are the first rows of this programme that cannot be settled by counting call
 * sites. They need to be SEEN, and they need rendered numbers. Three of this programme's
 * four wrong causes were confident, literate readings of correct code; "detect, don't
 * diagnose" has a positive form, and it is *build the instrument*.
 *
 * ⛔ AND IT LIVES IN `scripts/`, NOT IN `.qa-design-gate/`. The DG-A-12 sweep tool was
 * written into the gitignored evidence folder, which this programme's own DELETE-WHEN-DONE
 * list orders deleted — so the reasoning that decided ~190 money sites was scheduled for
 * destruction with the screenshots. Evidence is regenerable; an instrument is not.
 *
 * 🔴 IT LOADS THE **PRODUCTION** STYLESHEET, DISCOVERED FROM THE LIVE PAGE.
 * The previous static harness linked `.next/static/chunks/*.css` from a LOCAL build. On
 * 2026-08-29 the local build emitted `16a-67oey7~~e.css` while production served
 * `16egkpsn4~sqz.css` — a different file. They turned out to agree (2,182 selectors, same
 * set; the only deltas are last-digit `lab()` float rounding, e.g. `-50.319` vs `-50.320`),
 * but that was LUCK, and nothing checked it. A cascade measured against a sheet nobody is
 * served is the wrong population, which is this programme's signature failure. So the URL is
 * read out of the live HTML every run and never hard-coded — a hashed asset name rots.
 *
 * ⛔ THE CONTROL. `--sheet-missing` renders the same specimens with NO stylesheet. Every
 * assertion below must go RED under it. A bench that cannot fail proves nothing, and this
 * programme has already shipped one guard that printed `n=7 probed=0 ✓`.
 *
 * Usage:
 *   node scripts/design-gate/type-bench.mjs            # money + label benches, screenshots
 *   node scripts/design-gate/type-bench.mjs --sheet-missing   # the control; MUST fail
 *   node scripts/design-gate/type-bench.mjs --bench money
 *   LIVE_BASE=… to point elsewhere.
 * Output: `.qa-design-gate/type-bench/` (evidence — gitignored, regenerable).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BASE } from "../live/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", ".qa-design-gate", "type-bench");
const SHEET_MISSING = process.argv.includes("--sheet-missing");
const ONLY_BENCH = (() => {
  const i = process.argv.indexOf("--bench");
  return i > -1 ? process.argv[i + 1] : null;
})();
mkdirSync(OUT, { recursive: true });

/* ── 1. Discover the stylesheet production is actually serving ──────────────────────── */

/**
 * 🔴 THE BENCH RUNS INSIDE A REAL PRODUCTION PAGE, NOT A STATIC COPY OF ITS STYLESHEET.
 *
 * The first two versions of this file saved the served CSS to disk and linked it from a
 * `file://` page. Both were wrong, in two different ways, and both LOOKED right:
 *   ① `@font-face` ships `src:url(../media/…woff2)`, relative to the sheet — from a saved
 *      copy that resolves to a directory that does not exist, so every webfont 404s.
 *   ② Rewritten to absolute URLs the files fetch fine (200, 12 KB), and the browser STILL
 *      refuses them: a webfont is CORS-gated, and `file://` is an opaque origin.
 * Either way `getComputedStyle().fontFamily` reports `"JetBrains Mono"` — it echoes what was
 * REQUESTED — while every width measured belongs to a fallback monospace.
 *
 * ⭐ Loading a PUBLIC production route removes the whole class of error: same origin, the
 * real sheet in its real order, the real fonts, the real cascade, no build, no auth, no
 * database. The bench then replaces the document body with its own specimens. Nothing is
 * written to the product — this is a GET and some client-side DOM in a throwaway browser.
 */
const BENCH_ROUTE = process.env.BENCH_ROUTE || "/legal/terms";

async function openProdPage(page) {
  const res = await page.goto(BASE + BENCH_ROUTE, { waitUntil: "load", timeout: 90_000 });
  if (!res || !res.ok()) throw new Error(`${BASE}${BENCH_ROUTE} returned ${res && res.status()}`);
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
  const sheets = await page.$$eval('link[rel="stylesheet"]', (ls) => ls.map((l) => l.href));
  /* The candidate rules go FIRST IN <head>, ahead of every product sheet, so source order is
     stacked AGAINST them. Whatever still wins from there wins on specificity alone — the only
     thing that survives Tailwind's variants being emitted after everything globals.css writes. */
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.id = "bench-candidates";
    s.textContent = css;
    document.head.insertBefore(s, document.head.firstChild);
  }, CANDIDATE_CSS);
  return { urls: sheets, bytes: null };
}

/* ── 2. The specimens ────────────────────────────────────────────────────────────────── */

/** ⛔ Real strings from the product, not lorem. `TZS 679,532` is the /admin KPI value that
 *  clips at 390 (DG-A-10 part 2); `TZS 1,234,567` is the widest shape a pill must hold. */
const MONEY = ["TZS 679,532", "TZS 1,234,567", "TZS 134,000", "-TZS 12,450"];

/** Every treatment a money amount could take. `cls` is applied to the specimen span. */
const MONEY_TREATMENTS = [
  { id: "today", label: "TODAY — arbitrary text-[13px]", cls: "font-mono tabular text-[13px]" },
  { id: "rung", label: "THE RUNG — text-body-sm (emits letter-spacing)", cls: "font-mono tabular text-body-sm" },
  { id: "token", label: "TOKEN REF — text-[length:var(--type-small)]", cls: "font-mono tabular", style: "font-size: var(--type-small)" },
  { id: "rung-zeroed", label: "RUNG + letter-spacing:0", cls: "font-mono tabular text-body-sm", style: "letter-spacing: 0" },
  /* ⭐ A mechanism with NO new CSS at all. The eyebrow rows prove a `tracking-` utility
     already beats a rung's own letter-spacing, so Tailwind's stock `tracking-normal`
     (0em) may neutralise §M4's problem without a class, a token or a specificity trick. */
  { id: "tracking-normal", label: "RUNG + tracking-normal (no new CSS)", cls: "font-mono tabular text-body-sm tracking-normal" },
  { id: "micro-tracking-normal", label: "text-micro + tracking-normal (worst rung)", cls: "font-mono tabular text-micro tracking-normal" },
];

/** ⭐ EVERY rung, because §M4's severity is NOT uniform. `text-body-sm` emits -0.05px and
 *  `text-micro` emits +0.4px — the first is a sub-pixel tightening, the second is real,
 *  visible tracking-out over a numeral. A ruling that quotes only the 13px case would be a
 *  true measurement over the wrong population. */
const ALL_RUNGS = ["text-micro", "text-caption", "text-label", "text-body-sm", "text-body",
                   "text-body-lg", "text-title-sm", "text-title-md", "text-title-lg"];

/** The KPI value size question (DG-A-10 part 2): what fits 137px and 116px? */
const KPI_SIZES = [22, 20, 18, 17, 16, 15, 13];

/** The name collision, rendered. An eyebrow is UPPERCASE + tracked (§T3). */
const EYEBROW = "TOTAL SETTLED";
const LABEL_TREATMENTS = [
  { id: "tw-micro", label: "text-micro — Tailwind 10px", cls: "font-mono uppercase tracking-[0.14em] text-micro" },
  { id: "css-micro", label: "--type-micro — CSS 11px", cls: "font-mono uppercase tracking-[0.14em]", style: "font-size: var(--type-micro)" },
  { id: "tw-caption", label: "text-caption — Tailwind 11px", cls: "font-mono uppercase tracking-[0.14em] text-caption" },
  { id: "css-label", label: "--type-label — CSS 9.5px", cls: "font-mono uppercase tracking-[0.14em]", style: "font-size: var(--type-label)" },
  { id: "tw-label", label: "text-label — Tailwind 12px", cls: "font-mono uppercase tracking-[0.14em] text-label" },
  { id: "arb-10", label: "text-[10px] — the modal off-ladder size", cls: "font-mono uppercase tracking-[0.14em] text-[10px]" },
];

/** ⭐ THE RECIPE BENCH — the last open question in step 2, and the one no law decides.
 *  §T7 settled the RUNG (`text-micro`) and 139 sites moved onto it. What it did not settle is
 *  the DRESSING, and the handover's *"tracking varies 0.12/0.14/0.16/0.20em"* was the wrong
 *  population: re-derived 2026-08-29 there are **106 recipe elements in 74 files carrying 38
 *  distinct recipes, 23 used exactly once, over NINE tracking values**. The three real
 *  candidates, each with a claim to being canonical:
 *    · **0.1em** — the MODE, 32 sites, and ⚠️ spelled two ways (`0.1em` / `0.10em`), so a
 *      text-matching guard reads them as different. That is the `hardcoded-pill-active` shape.
 *    · **0.14em** — what `globals.css`'s own `.admin-tbl thead` uses, i.e. the CSS side's
 *      canonical eyebrow, and 21 call sites.
 *    · **0.16em** — what `field-legend.tsx`, the KIT's canonical eyebrow, emits. 17 sites.
 *  🔴 So the component and the product disagree: the most-typed eyebrow is NOT the kit's.
 *  ⛔ A taste call still needs a screenshot — "I decided" is not a measurement — and the thing
 *  to look at is Swahili, because §A5 makes it 35-40% longer and tracking multiplies per glyph:
 *  the cost of a wider rung is paid on the LONGEST string, not the specimen one. */
const RECIPE_STRINGS = ["TOTAL SETTLED", "JUMLA ILIYOLIPWA", "ZIMEKAMILIKA"];
const RECIPE_TREATMENTS = [
  { id: "tr-008", label: "0.08em — 2 sites", cls: "font-mono uppercase text-micro tracking-[0.08em]" },
  { id: "tr-010", label: "0.1em — 32 sites (the MODE, two spellings)", cls: "font-mono uppercase text-micro tracking-[0.10em]" },
  { id: "tr-012", label: "0.12em — 20 sites", cls: "font-mono uppercase text-micro tracking-[0.12em]" },
  { id: "tr-014", label: "0.14em — 21 sites · .admin-tbl thead", cls: "font-mono uppercase text-micro tracking-[0.14em]" },
  { id: "tr-016", label: "0.16em — 17 sites · FieldLegend", cls: "font-mono uppercase text-micro tracking-[0.16em]" },
  { id: "tr-018", label: "0.18em — 6 sites", cls: "font-mono uppercase text-micro tracking-[0.18em]" },
  { id: "tr-020", label: "0.2em — 4 sites", cls: "font-mono uppercase text-micro tracking-[0.20em]" },
  { id: "tr-rung", label: "⛔ NO tracking — the rung's own 0.4px", cls: "font-mono uppercase text-micro" },
];

/* ── 3. The page ─────────────────────────────────────────────────────────────────────── */

/* ⭐ THE CANDIDATE MECHANISMS FOR §M4, injected BEFORE the sheet so that SOURCE ORDER is
   stacked against them. Anything that still wins from here wins on SPECIFICITY alone, which
   is the only property that survives a Tailwind variant being emitted at byte ~219,300 —
   after every rule globals.css authors (~131,800). ⛔ Injected after the link, a candidate
   would win for the wrong reason and the bench would bless a mechanism the product breaks. */
const CANDIDATE_CSS = `
  .amt-1 { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: 0; }
  .amt-2.amt-2 { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: 0; }
`;

/** The bench's own chrome, injected into the live page after its body is cleared. */
const BENCH_CHROME = `
  /* Bench chrome ONLY. ⛔ Nothing here may style a specimen — a specimen's every pixel must
     come from the production sheet, or the bench is measuring itself. */
  body { margin: 0; padding: 24px; background: var(--bg, #0b0b17); color: var(--text, #e8e8f0);
         font-family: var(--font-body, system-ui); }
  h2 { font-size: 15px; margin: 28px 0 10px; opacity: .75; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
  .bench-row { display: flex; align-items: baseline; gap: 16px; padding: 7px 0;
               border-bottom: 1px solid rgba(255,255,255,.07); }
  .bench-caption { flex: 0 0 300px; font-size: 11px; opacity: .55; font-family: ui-monospace, monospace; }
  .bench-spec { display: inline-block; }
  .bench-rule { flex: 0 0 auto; margin-left: auto; font-size: 10px; opacity: .4; font-family: ui-monospace, monospace; }
  /* ⚠️ 137 and 116 are CONTENT widths, already net of the tile's border and padding —
     derived as 390 − 8 scrollbar → 382, − px-4 (20+20) → 342, − gap-3 16 ÷ 2 → 163 / 142,
     − 2 border − p-2 (12+12) → 137 / 116. So this box must ADD no padding of its own, or
     the bench subtracts it twice and reports a size smaller than the product can hold. */
  .kpi-tile { width: 137px; padding: 0; border: 0; outline: 1px dashed rgba(255,255,255,.28);
              overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .kpi-tile.narrow { width: 116px; }
  .kpi-wrap { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
`;

/* ── 4. Drive ────────────────────────────────────────────────────────────────────────── */

const results = { base: BASE, sheet: null, control: SHEET_MISSING, benches: {}, assertions: [] };
const assert = (name, pass, detail) => {
  results.assertions.push({ name, pass, detail });
  console.log(`${pass ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  return pass;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

console.log(`\nTYPE BENCH — ${BASE}${SHEET_MISSING ? "  ⚠️ CONTROL RUN (no stylesheet)" : ""}\n`);

if (SHEET_MISSING) {
  /* ⛔ THE CONTROL: an about:blank page with the same specimens and NO product stylesheet.
     Every assertion below must go red here, or none of them is evidence. */
  await page.goto("about:blank");
} else {
  const sheet = await openProdPage(page);
  results.sheet = { route: BENCH_ROUTE, urls: sheet.urls };
  console.log(`page:  ${BASE}${BENCH_ROUTE}`);
  console.log(`sheet: ${sheet.urls.length} file(s) served with it`);
  sheet.urls.forEach((u) => console.log(`   ${u}`));
}

/** Clear the product's own markup and put the bench in its place — the sheet, the fonts and
 *  the cascade stay exactly as production serves them. */
await page.evaluate((chrome) => {
  const s = document.createElement("style");
  s.textContent = chrome;
  document.head.appendChild(s);
  document.body.innerHTML = '<div id="bench"></div>';
  document.body.className = "";
}, BENCH_CHROME);

/** ⛔ THE GATE. If the production sheet did not load, every measurement below is a
 *  measurement of the browser's defaults wearing this programme's labels. */
const sheetLive = await page.evaluate(() => {
  const p = document.createElement("span");
  p.className = "font-mono text-body-sm";
  document.body.appendChild(p);
  const cs = getComputedStyle(p);
  const out = { fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, fontFamily: cs.fontFamily,
                typeSmall: getComputedStyle(document.documentElement).getPropertyValue("--type-small").trim() };
  p.remove();
  return out;
});
const loaded = sheetLive.fontSize === "13px" && sheetLive.typeSmall === "13px";
assert("production stylesheet resolves (.text-body-sm = 13px AND --type-small = 13px)", loaded,
  `got ${sheetLive.fontSize} / --type-small:${sheetLive.typeSmall || "(unset)"}`);

/** ⛔ THE SECOND GATE — the FONT, not just the sheet. Every width below is a measurement of
 *  a typeface; if the typeface is a fallback, every number is a fiction wearing the right
 *  label. `document.fonts.check` is the only thing that knows. */
const fontsOk = SHEET_MISSING ? false : await (async () => {
  /* A webfont is fetched only when a glyph needs it, so `fonts.ready` on an empty page
     resolves with ZERO faces loaded and `check()` returns false for a font that is
     perfectly reachable. Request them explicitly — which also proves the rewritten
     absolute URLs actually resolve. */
  await page.evaluate(async () => {
    await Promise.allSettled([
      document.fonts.load('13px "JetBrains Mono"'), document.fonts.load('22px "JetBrains Mono"'),
      document.fonts.load('13px "Inter"'), document.fonts.load('28px "Sora"'),
    ]);
    await document.fonts.ready;
  });
  return page.evaluate(() => ({
    mono13: document.fonts.check('13px "JetBrains Mono"'),
    mono22: document.fonts.check('22px "JetBrains Mono"'),
    loaded: [...document.fonts].filter((f) => f.status === "loaded").length,
    families: [...new Set([...document.fonts].map((f) => f.family))].join(", "),
  }));
})();
if (!SHEET_MISSING) {
  assert("JetBrains Mono is REALLY loaded (not a fallback wearing its name)",
    fontsOk.mono13 && fontsOk.mono22,
    `check(13px)=${fontsOk.mono13} check(22px)=${fontsOk.mono22} · ${fontsOk.loaded} faces loaded · ${fontsOk.families}`);
  results.fonts = fontsOk;
}

if (SHEET_MISSING) {
  const ok = !loaded;
  console.log(`\n${ok ? "✅ CONTROL PASSED" : "🔴 CONTROL FAILED"} — with no sheet the gate ${ok ? "goes RED, as it must" : "still passed, so it proves nothing"}\n`);
  await browser.close();
  process.exit(ok ? 0 : 1);
}
if (!loaded) { console.error("\n🔴 REFUSING TO SCREENSHOT — the sheet did not load.\n"); await browser.close(); process.exit(2); }
if (!(fontsOk.mono13 && fontsOk.mono22)) {
  console.error("\n🔴 REFUSING TO MEASURE — JetBrains Mono did not load, so every width would be a fallback font's.\n");
  await browser.close(); process.exit(2);
}

/** Render one bench and measure every specimen. */
async function runBench(title, treatments, strings, extraClass = "") {
  const measured = await page.evaluate(({ title, treatments, strings, extraClass }) => {
    const root = document.getElementById("bench");
    const h = document.createElement("h2"); h.textContent = title; root.appendChild(h);
    const out = [];
    for (const s of strings) {
      for (const t of treatments) {
        const row = document.createElement("div"); row.className = "bench-row";
        const cap = document.createElement("div"); cap.className = "bench-caption"; cap.textContent = t.label;
        const span = document.createElement("span");
        span.className = `bench-spec ${t.cls || ""} ${extraClass}`.trim();
        if (t.style) span.setAttribute("style", t.style);
        span.textContent = s;
        const rule = document.createElement("div"); rule.className = "bench-rule";
        row.append(cap, span, rule); root.appendChild(row);
        const cs = getComputedStyle(span), r = span.getBoundingClientRect();
        const rec = { string: s, treatment: t.id, label: t.label,
          fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, fontFamily: cs.fontFamily.split(",")[0],
          fontVariantNumeric: cs.fontVariantNumeric,
          width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 };
        rule.textContent = `${rec.fontSize} · ls ${rec.letterSpacing} · ${rec.width}px`;
        out.push(rec);
      }
    }
    return out;
  }, { title, treatments, strings, extraClass });
  return measured;
}

if (!ONLY_BENCH || ONLY_BENCH === "money") {
  console.log("\n── MONEY BENCH — §M4: an amount is NEVER letter-spaced ──");
  const money = await runBench("MONEY — §M4 treatments", MONEY_TREATMENTS, MONEY);
  results.benches.money = money;
  for (const s of MONEY) {
    const g = money.filter((m) => m.string === s);
    const today = g.find((m) => m.treatment === "today"), rung = g.find((m) => m.treatment === "rung");
    const tok = g.find((m) => m.treatment === "token"), zero = g.find((m) => m.treatment === "rung-zeroed");
    console.log(`  "${s}"  today ${today.width}px (ls ${today.letterSpacing}) · rung ${rung.width}px (ls ${rung.letterSpacing}) · token ${tok.width}px · zeroed ${zero.width}px`);
  }
  const rungSpaced = money.filter((m) => m.treatment === "rung").every((m) => m.letterSpacing !== "normal" && parseFloat(m.letterSpacing) !== 0);
  assert("every Tailwind rung DOES emit letter-spacing over an amount (the wall is real)", rungSpaced,
    money.find((m) => m.treatment === "rung").letterSpacing);
  const tokenClean = money.filter((m) => m.treatment === "token").every((m) => m.letterSpacing === "normal" || parseFloat(m.letterSpacing) === 0);
  assert("a --type-* token reference sets SIZE ONLY — no letter-spacing (§M4-safe)", tokenClean,
    money.find((m) => m.treatment === "token").letterSpacing);
  /* Only the 13px treatments — `micro-tracking-normal` is deliberately 10px, to show the
     WORST rung neutralised. Asserting over it would be the wrong population. */
  const thirteen = money.filter((m) => m.string === MONEY[0] && m.treatment !== "micro-tracking-normal");
  assert("every 13px treatment renders the SAME 13px — only tracking differs",
    thirteen.every((m) => m.fontSize === "13px"), thirteen.map((m) => m.fontSize).join("/"));

  const tn = money.filter((m) => m.treatment === "tracking-normal");
  const tnMicro = money.filter((m) => m.treatment === "micro-tracking-normal");
  const zeroed = (v) => v === "normal" || parseFloat(v) === 0;
  console.log(`  tracking-normal on text-body-sm : ls ${tn[0].letterSpacing} · ${tn[0].width}px  (today ${money.find((m) => m.string === MONEY[0] && m.treatment === "today").width}px)`);
  console.log(`  tracking-normal on text-micro   : ls ${tnMicro[0].letterSpacing} · ${tnMicro[0].fontSize}`);
  assert("Tailwind's stock `tracking-normal` neutralises a rung's letter-spacing — NO new CSS",
    tn.every((m) => zeroed(m.letterSpacing)) && tnMicro.every((m) => zeroed(m.letterSpacing)),
    `body-sm ${tn[0].letterSpacing} · micro ${tnMicro[0].letterSpacing}`);
  assert("…and it restores the amount to its untracked width, byte for byte",
    tn.every((m) => m.width === money.find((x) => x.string === m.string && x.treatment === "today").width),
    `${tn[0].width} vs today ${money.find((m) => m.string === MONEY[0] && m.treatment === "today").width}`);
  const t0 = money.find((m) => m.string === MONEY[1] && m.treatment === "today");
  const r0 = money.find((m) => m.string === MONEY[1] && m.treatment === "rung");
  console.log(`  ⭐ widest amount "${MONEY[1]}": rung is ${Math.round((r0.width - t0.width) * 100) / 100}px ${r0.width > t0.width ? "WIDER" : "NARROWER"} than today (${MONEY[1].length} glyphs)`);
}

if (!ONLY_BENCH || ONLY_BENCH === "rungs") {
  console.log("\n── RUNG SEVERITY — what each Tailwind rung actually costs an amount ──");
  const rungs = await page.evaluate(({ rungs, str }) => {
    const root = document.getElementById("bench");
    const h = document.createElement("h2"); h.textContent = "RUNG SEVERITY — every rung over one amount"; root.appendChild(h);
    const out = [];
    for (const cls of rungs) {
      const row = document.createElement("div"); row.className = "bench-row";
      const cap = document.createElement("div"); cap.className = "bench-caption"; cap.textContent = cls;
      const span = document.createElement("span"); span.className = `bench-spec font-mono tabular ${cls}`; span.textContent = str;
      const bare = document.createElement("span"); bare.className = "bench-spec font-mono tabular"; bare.textContent = str;
      const rule = document.createElement("div"); rule.className = "bench-rule";
      row.append(cap, span, rule); root.appendChild(row);
      const cs = getComputedStyle(span);
      bare.style.fontSize = cs.fontSize; bare.style.letterSpacing = "normal";
      document.body.appendChild(bare);
      const w = span.getBoundingClientRect().width, w0 = bare.getBoundingClientRect().width;
      bare.remove();
      const rec = { rung: cls, fontSize: cs.fontSize, letterSpacing: cs.letterSpacing,
        width: Math.round(w * 100) / 100, untracked: Math.round(w0 * 100) / 100,
        deltaPx: Math.round((w - w0) * 100) / 100,
        deltaPct: Math.round(((w - w0) / w0) * 10000) / 100 };
      rule.textContent = `${rec.fontSize} · ls ${rec.letterSpacing} · ${rec.deltaPx >= 0 ? "+" : ""}${rec.deltaPx}px (${rec.deltaPct}%)`;
      out.push(rec);
    }
    return out;
  }, { rungs: ALL_RUNGS, str: MONEY[1] });
  results.benches.rungs = rungs;
  for (const r of rungs) console.log(`  ${r.rung.padEnd(14)} ${r.fontSize.padStart(5)} · ls ${String(r.letterSpacing).padStart(8)} → ${r.deltaPx >= 0 ? "+" : ""}${r.deltaPx}px (${r.deltaPct}%) on "${MONEY[1]}"`);
  const anySpaced = rungs.every((r) => r.letterSpacing !== "normal" && parseFloat(r.letterSpacing) !== 0);
  assert("EVERY rung emits letter-spacing — there is no §M4-legal Tailwind rung", anySpaced,
    `${rungs.length} of ${rungs.length} rungs tracked`);
  const worst = rungs.slice().sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
  console.log(`  ⭐ worst: ${worst.rung} moves the amount ${worst.deltaPct}% (${worst.deltaPx}px)`);
  results.benches.worstRung = worst;

  /* ⛔ THE PRECEDENCE CONTROL, using a class that ALREADY SHIPS. `.display` is authored in
     globals.css at line ~872 and sets `letter-spacing: -0.02em`; `@tailwind utilities` is
     emitted at line 19. Measured in the production sheet: `.text-body-sm` at byte 92,286,
     `.display` at 131,812. Same (0,1,0) specificity, so ONLY source order can decide it.
     If globals.css wins here, a money class authored beside `.mono` wins the same way — and
     if it does NOT, the whole "mint a class" option is dead and must not be shipped. */
  const prec = await page.evaluate(() => {
    const a = document.createElement("span"); a.className = "display text-body-sm"; a.textContent = "x";
    const b = document.createElement("span"); b.className = "text-body-sm"; b.textContent = "x";
    document.body.append(a, b);
    const r = { combined: getComputedStyle(a).letterSpacing, rungAlone: getComputedStyle(b).letterSpacing,
                displayEm: getComputedStyle(a).fontSize };
    a.remove(); b.remove();
    return r;
  });
  const globalsWins = prec.combined !== prec.rungAlone;
  assert("a globals.css class authored after @tailwind utilities BEATS a rung's letter-spacing",
    globalsWins, `.display+.text-body-sm → ${prec.combined} vs rung alone ${prec.rungAlone}`);
  results.benches.precedence = { ...prec, globalsWins };

  /* ⛔ …BUT SOURCE ORDER IS NOT ENOUGH, AND THIS IS THE CONTROL THAT PROVES IT.
     Tailwind's RESPONSIVE VARIANTS are emitted AFTER everything globals.css authors —
     measured in the served sheet: `.text-body-sm` 92,287 · `.mono` 131,743 · `.display`
     131,812 · `sm\\:text-*` from 219,312. So a single-class money rule loses to
     `sm:text-…` at ≥640px, silently, and only at that breakpoint. Exposure in the tree
     today is ONE site (`sm:text-label`, not a money element) — but a mechanism that can be
     defeated by a class anybody may type next week is not a mechanism, it is a coincidence.
     A (0,2,0) selector wins on SPECIFICITY, which no emission order can overturn. The
     idiom already ships in this file: `.btn.admin-focus:focus-visible`, written for this
     exact fight. */
  const mech = await page.evaluate(() => {
    const mk = (cls) => { const s = document.createElement("span"); s.className = cls; s.textContent = "TZS 1,234,567"; document.body.appendChild(s); return s; };
    const probe = (cls) => { const s = mk(cls); const ls = getComputedStyle(s).letterSpacing; s.remove(); return ls; };
    return {
      plainVsRung: probe("amt-1 text-body-sm"),
      doubledVsRung: probe("amt-2 text-body-sm"),
      plainVsVariant: probe("amt-1 sm:text-label"),
      doubledVsVariant: probe("amt-2 sm:text-label"),
      variantAlone: probe("sm:text-label"),
    };
  });
  results.benches.mechanism = mech;
  const zero = (v) => v === "normal" || parseFloat(v) === 0;
  console.log(`  single-class .amt-1 vs text-body-sm : ${mech.plainVsRung}`);
  console.log(`  doubled .amt-2.amt-2 vs text-body-sm: ${mech.doubledVsRung}`);
  console.log(`  single-class .amt-1 vs sm:text-label: ${mech.plainVsVariant}   (variant alone ${mech.variantAlone})`);
  console.log(`  doubled .amt-2.amt-2 vs sm:text-label: ${mech.doubledVsVariant}`);
  assert("CONTROL — a SINGLE-class money rule LOSES to a responsive variant (so order is not enough)",
    !zero(mech.plainVsVariant), `got ${mech.plainVsVariant}; if this reads 0 the control is dead and the doubled selector proves nothing`);
  assert("a DOUBLED (0,2,0) money rule holds letter-spacing at 0 against BOTH a rung and a variant",
    zero(mech.doubledVsRung) && zero(mech.doubledVsVariant),
    `rung ${mech.doubledVsRung} · variant ${mech.doubledVsVariant}`);
}

if (!ONLY_BENCH || ONLY_BENCH === "kpi") {
  console.log("\n── KPI BENCH — DG-A-10 part 2: what fits 137px and 116px? ──");
  const kpi = await page.evaluate(({ sizes }) => {
    const root = document.getElementById("bench");
    const h = document.createElement("h2"); h.textContent = "KPI VALUE — 137px and 116px tiles"; root.appendChild(h);
    const wrap = document.createElement("div"); wrap.className = "kpi-wrap"; root.appendChild(wrap);
    const out = [];
    for (const px of sizes) {
      for (const w of ["137", "116"]) {
        const tile = document.createElement("div"); tile.className = `kpi-tile${w === "116" ? " narrow" : ""}`;
        const span = document.createElement("span");
        span.className = "font-mono tabular"; span.style.fontSize = `${px}px`; span.textContent = "TZS 679,532";
        tile.appendChild(span); wrap.appendChild(tile);
        const need = span.getBoundingClientRect().width;
        const avail = tile.clientWidth; // 137/116 are already CONTENT widths — see the CSS note
        out.push({ size: px, tile: Number(w), needed: Math.round(need * 100) / 100, available: avail, fits: need <= avail });
      }
    }
    return out;
  }, { sizes: KPI_SIZES });
  results.benches.kpi = kpi;
  for (const k of kpi) console.log(`  ${String(k.size).padStart(2)}px in ${k.tile}px tile: needs ${String(k.needed).padStart(6)} of ${k.available}  ${k.fits ? "✓ fits" : "✗ clips"}`);
  const firstFit = KPI_SIZES.find((px) => kpi.filter((k) => k.size === px).every((k) => k.fits));
  assert("a size exists that fits BOTH the 137px and the 116px tile", Boolean(firstFit),
    firstFit ? `${firstFit}px is the largest that fits both` : "none of the tested sizes fits both");
  results.benches.kpiFirstFit = firstFit ?? null;
}

if (!ONLY_BENCH || ONLY_BENCH === "label") {
  console.log("\n── LABEL BENCH — the micro/label NAME COLLISION, rendered ──");
  const label = await runBench("EYEBROW — the two ladders' colliding names", LABEL_TREATMENTS, [EYEBROW]);
  results.benches.label = label;
  for (const l of label) console.log(`  ${l.label.padEnd(42)} → ${l.fontSize.padStart(7)} · ${String(l.width).padStart(6)}px wide · ${l.height}px tall`);
  const tw = label.find((l) => l.treatment === "tw-micro"), css = label.find((l) => l.treatment === "css-micro");
  assert("`micro` really does mean two different sizes (text-micro vs --type-micro)", tw.fontSize !== css.fontSize,
    `text-micro ${tw.fontSize} vs var(--type-micro) ${css.fontSize}`);
  const twl = label.find((l) => l.treatment === "tw-label"), cssl = label.find((l) => l.treatment === "css-label");
  assert("`label` really does mean two different sizes (text-label vs --type-label)", twl.fontSize !== cssl.fontSize,
    `text-label ${twl.fontSize} vs var(--type-label) ${cssl.fontSize}`);
  const arb = label.find((l) => l.treatment === "arb-10");
  console.log(`  ⭐ moving the modal off-ladder eyebrow 10px → --type-micro 11px costs ${Math.round((css.width - arb.width) * 100) / 100}px of width on "${EYEBROW}"`);
  results.benches.eyebrowCost = Math.round((css.width - arb.width) * 100) / 100;
}

if (!ONLY_BENCH || ONLY_BENCH === "recipe") {
  console.log("\n── RECIPE BENCH — the eyebrow's TRACKING, the last open call in step 2 ──");
  const recipe = await runBench("EYEBROW RECIPE — nine tracking values, one rung", RECIPE_TREATMENTS, RECIPE_STRINGS);
  results.benches.recipe = recipe;
  for (const s of RECIPE_STRINGS) {
    console.log(`\n  "${s}"`);
    const g = recipe.filter((r) => r.string === s).sort((a, b) => a.width - b.width);
    const base = g.find((r) => r.treatment === "tr-010");
    for (const r of g) {
      const d = Math.round((r.width - base.width) * 100) / 100;
      console.log(`    ${r.label.padEnd(46)} ls ${r.letterSpacing.padStart(7)} → ${String(r.width).padStart(6)}px  ${d === 0 ? "(the mode)" : (d > 0 ? "+" : "") + d + "px"}`);
    }
  }
  /* ⛔ THE ASSERTION THAT MATTERS IS THE ONE ABOUT SWAHILI, not about the English specimen.
     §A5: every label must survive Swahili at ~35-40% longer, and tracking is charged PER GLYPH,
     so the widest recipe is punished hardest exactly where there is least room. Quoting the
     cost on "TOTAL SETTLED" alone would be a true measurement over the wrong population — this
     programme's signature failure, and the reason §M4's own note lists five rungs, not one. */
  const sw = recipe.filter((r) => r.string === "JUMLA ILIYOLIPWA");
  const lo = sw.find((r) => r.treatment === "tr-010"), hi = sw.find((r) => r.treatment === "tr-016");
  const spread = Math.round((hi.width - lo.width) * 100) / 100;
  results.benches.recipeSwSpread = spread;
  console.log(`\n  ⭐ 0.1em → 0.16em costs ${spread}px on the SWAHILI string (${lo.width} → ${hi.width}), the population §A5 makes longest.`);
  assert("the candidate trackings render measurably different widths (the choice is real, not cosmetic)",
    spread > 1, `${spread}px on "JUMLA ILIYOLIPWA"`);
  const untracked = recipe.find((r) => r.treatment === "tr-rung" && r.string === "TOTAL SETTLED");
  assert("an eyebrow with NO explicit tracking still gets the rung's own 0.4px (so 'no tracking' is not a neutral option)",
    untracked.letterSpacing !== "normal" && parseFloat(untracked.letterSpacing) > 0, untracked.letterSpacing);
}

await page.evaluate(() => window.scrollTo(0, 0));
const shot = path.join(OUT, "type-bench.png");
await page.screenshot({ path: shot, fullPage: true });
console.log(`\n📸 ${shot}`);

writeFileSync(path.join(OUT, "type-bench.json"), JSON.stringify(results, null, 2));
await browser.close();

const failed = results.assertions.filter((a) => !a.pass);
const probed = Object.values(results.benches).filter(Array.isArray).reduce((n, b) => n + b.length, 0);
console.log(`\n${probed} specimens measured · ${results.assertions.length} assertions · ${failed.length} failing`);
/** ⛔ Zero probes is a SKIPPED RUN, never a pass — this programme shipped a guard that
 *  printed `n=7 probed=0 ✓` once already. */
if (!probed) { console.error("🔴 ZERO SPECIMENS MEASURED — this is a skipped run, not a pass."); process.exit(3); }
if (failed.length) { console.error(`🔴 ${failed.map((f) => f.name).join("; ")}`); process.exit(1); }
console.log("✅ TYPE BENCH GREEN\n");
