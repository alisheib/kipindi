/**
 * `npm run qa:refusal` — THE REFUSAL BENCH. Does the refusal card FIT?
 *
 * 🔬 WHY THIS EXISTS. The 2026-08-31 seam replaced a one-line sentence with a card that carries
 * a title, a figures grid and a BUTTON WHOSE LABEL IS A SENTENCE ("Open AI usage → Credit
 * budget"), inside pill buttons that are `flex-1` in a 380px modal. Every one of those is a
 * chance for text to be clipped, and a clipped remedy is the same defect as a wrong sentence:
 * the operator cannot act on what they cannot read. Nothing in the unit suite can see a
 * clipped glyph — `test:operator-error` proves the STRINGS are right, and a string can be
 * right and invisible.
 *
 * 🔴 IT RUNS INSIDE A REAL PRODUCTION PAGE, NOT A COPY OF ITS STYLESHEET — the mechanism
 * `type-bench.mjs` had to learn twice. A saved sheet's `@font-face` resolves `src:url(../media/…)`
 * to nothing, and rewritten to absolute URLs a webfont is still CORS-refused from `file://`.
 * Either way `getComputedStyle().fontFamily` reports the font that was REQUESTED while every
 * width measured belongs to a fallback. A public route gives same origin, real sheet, real
 * order, real fonts, real cascade — no build, no auth, no database. This is a GET plus some
 * client-side DOM in a throwaway browser; nothing is written to the product.
 *
 * ⛔ THE CONTROL IS `--prove-red`, NOT `--sheet-missing`, AND THAT CORRECTION IS THE POINT.
 * This header claimed `--sheet-missing` was the control and that "the overflow assertions MUST
 * change" under it. Then it was RUN: 97 passed · 0 failed, identical to the styled run. Stripping
 * the stylesheet removes the CONSTRAINTS, so unstyled text in a full-width body overflows nothing.
 * The numbers move a lot (a figure label goes 151px → 380px), which proves the sheet is read —
 * but a control must change the VERDICT. `--prove-red` replays the actual shipped defect instead.
 * A bench that cannot fail proves nothing; this programme has already shipped a guard that
 * printed `n=7 probed=0 ✓`.
 *
 * Usage:
 *   node scripts/design-gate/refusal-bench.mjs                 # measure + screenshot
 *   npm run qa:refusal-control                                # THE CONTROL — must report the defect
 *   node scripts/design-gate/refusal-bench.mjs --sheet-missing # premise check only: is the sheet read
 *   LIVE_BASE=… to point elsewhere.
 * Output: `.qa-design-gate/refusal-bench/` (evidence — gitignored, regenerable).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BASE } from "../live/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", ".qa-design-gate", "refusal-bench");
const SHEET_MISSING = process.argv.includes("--sheet-missing");
/**
 * ⛔ THE REAL CONTROL — and the first one written here was NOT one.
 *
 * `--sheet-missing` was supposed to be the proof this bench can fail. It cannot: stripping the
 * stylesheet REMOVES the constraints, so unstyled text in a full-width body overflows nothing
 * and the run passes 97/97 exactly as the styled one does. The measurements do change wildly
 * (a figure label goes 151px → 380px), so the sheet is demonstrably load-bearing — but a
 * control has to change the VERDICT, not the numbers. It is kept, and demoted to what it
 * honestly is: a premise check that the sheet is being read.
 *
 * `--prove-red` (`npm run qa:refusal-control`) is the control. ⛔ It is deliberately NOT named
 * `red:refusal`: in this repo `red:*` means a harness that MUTATES REAL SOURCE to prove a guard
 * catches it, which is what `test:red-anchors` §4 audits — and that ratchet correctly reported
 * this as an undeclared 68th harness when it squatted there. This mutates nothing; it re-renders
 * the specimen. `test:operator-error` §9 pins the specimen to the product so the copy cannot drift.
 *
 * It re-renders the card with the label and the non-wrapping row
 * AS THEY SHIPPED BEFORE THIS FIX — the 224px "Open AI usage → Credit budget" in a plain
 * `flex gap-2` — and REQUIRES the bench to report failures. It replays the actual defect
 * rather than removing the conditions that make defects possible.
 */
const PROVE_RED = process.argv.includes("--prove-red");
const BENCH_ROUTE = process.env.BENCH_ROUTE || "/legal/terms";
mkdirSync(OUT, { recursive: true });

/* ── The specimens — REAL strings, at the real widths ─────────────────────────────────── */

// ⛔ THE REAL SENTENCE AND THE REAL LABEL, from `ai-usage.ts` and `operator-refusal.ts`.
// A bench measured on "Lorem ipsum" measures nothing: the whole question is whether THESE
// words fit. The figures are the ones production actually refused with.
// ⛔ THE BODY, NOT THE SERVER'S FULL SENTENCE — this is what a KNOWN refusal renders (the next
// step only). The full sentence is the fallback for an unknown reason and is measured as
// SENTENCE_FALLBACK, because it is longer and therefore the harder fit of the two.
const SENTENCE = "Raise the limit, or start a new top-up window after adding credit.";
const SENTENCE_FALLBACK =
  "AI credit limit reached ($20.56 of $70.00 this top-up window). Raise the limit, or start a " +
  "new top-up window after adding credit, under Admin → AI usage.";
const TITLE = "AI credit limit reached";
const FIX_LABEL = PROVE_RED ? "Open AI usage → Credit budget" : "Open Credit budget";
/** The row as it was before the wrap idiom — `flex-1` with no basis and no wrapping. */
const ROW_CLS = PROVE_RED ? "flex gap-2 pt-1" : "flex flex-wrap gap-2 pt-1";
const BTN_BASIS = PROVE_RED ? "" : " basis-[8rem]";
const FIGURES = [["Spent this window", "$20.56"], ["Limit", "$70.00"]];

/** ⚠️ 360 is where this repo has already lost a card heading to width (`G-5`), so it is not an
 *  optional row. 320 is the narrowest phone still in the wild. */
const WIDTHS = [320, 360, 390, 430, 768, 1280];

/**
 * The INLINE card — the AiOverlayShell failure branch on /admin/ai-polls.
 *
 * ⛔ THE CONTAINER CLASSES ARE COPIED VERBATIM FROM THE PRODUCT (`ai-progress.tsx:98`), and the
 * first draft of this bench did NOT do that: it pinned `max-width:420px` with no `w-[90vw]`, so
 * a 420px card sat in a 320px viewport and the bench reported 14 failures that belonged entirely
 * to itself. A strawman specimen is the same "wrong population" error as a strawman test — it
 * produces real measurements of something nobody ships.
 */
const inlineCard = () => `
<div id="spec-inline" class="rounded-xl border border-border bg-bg-elevated p-5 w-[90vw] max-w-[420px]">
  <div class="space-y-3">
    <div class="flex items-center gap-2.5">
      <span class="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-no-500/15 text-no-300 shrink-0">✕</span>
      <div>
        <p data-fit="title" class="font-display text-[15px] font-semibold text-text">${TITLE}</p>
      </div>
    </div>
    <p data-fit="sentence" class="text-[13px] text-text-muted leading-snug">${SENTENCE}</p>
    <dl class="flex flex-wrap gap-x-5 gap-y-1.5">
      ${FIGURES.map(([l, v]) => `
      <div class="flex items-baseline gap-1.5">
        <dt data-fit="figure-label" class="font-mono text-micro uppercase eyebrow text-text-tertiary">${l}</dt>
        <dd data-fit="figure-value" class="font-mono text-body-sm tabular text-text">${v}</dd>
      </div>`).join("")}
    </dl>
    <div class="${ROW_CLS}">
      <button data-fit="btn-dismiss" class="btn btn-ghost btn-sm rounded-pill flex-1${BTN_BASIS}">Dismiss</button>
      <a data-fit="btn-fix" class="btn btn-primary btn-sm rounded-pill flex-1${BTN_BASIS} text-center">${FIX_LABEL}</a>
    </div>
  </div>
</div>`;

/** The MODAL card — OperationResultModal, which the shared ActionOverlay renders. Its real
 *  max width is 380 (see `action-overlay.tsx`), so it is pinned here rather than fluid. */
const modalCard = () => `
<div id="spec-modal" class="mat-modal relative w-full p-5 lg:p-6 rounded-modal" style="max-width:380px">
  <div class="space-y-3">
    <p class="font-mono text-micro uppercase eyebrow text-text-tertiary">Failed · Imeshindikana</p>
    <p data-fit="m-title" class="font-display text-title-sm font-semibold text-text">${TITLE}</p>
    <p data-fit="m-sub" class="text-body-sm text-text-subtle leading-relaxed">${SENTENCE}</p>
    <div class="grid grid-cols-2 gap-2">
      ${FIGURES.map(([l, v]) => `
      <div>
        <p data-fit="m-fig-label" class="font-mono text-micro uppercase eyebrow text-text-tertiary">${l}</p>
        <p data-fit="m-fig-value" class="font-mono text-body-sm tabular text-text">${v}</p>
      </div>`).join("")}
    </div>
    <!-- ⛔ STACKED w-full, COPIED FROM operation-result-modal.tsx:506/520. The first draft of this
         bench modelled this footer as a two-up \`flex gap-2\` row and reported an overflow the
         shared modal does not have — the component was already right, and the bench was wrong
         about it. Check the component before believing a bench that indicts it. -->
    <div class="space-y-2">
      <button data-fit="m-btn-primary" class="btn btn-primary btn-lg w-full">Dismiss · Funga</button>
      <button data-fit="m-btn-secondary" class="btn btn-ghost btn-md w-full">${FIX_LABEL}</button>
    </div>
  </div>
</div>`;

/**
 * The UNKNOWN-REASON card — what a surface renders when the server sends a `reason` this client
 * does not know. ⛔ IT IS A SEPARATE SPECIMEN, NOT AN EXTRA PARAGRAPH ON THE ONE ABOVE. The first
 * version stacked the body AND the full fallback sentence in a single card to measure both at
 * once, and the screenshot then showed a card the product can never produce — evidence that
 * misleads whoever reads it later is worse than no evidence.
 */
const fallbackCard = () => `
<div id="spec-fallback" class="rounded-xl border border-border bg-bg-elevated p-5 w-[90vw] max-w-[420px]">
  <div class="space-y-3">
    <div class="flex items-center gap-2.5">
      <span class="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-no-500/15 text-no-300 shrink-0">✕</span>
      <div><p data-fit="fb-title" class="font-display text-[15px] font-semibold text-text">Generation failed</p></div>
    </div>
    <p data-fit="fb-sentence" class="text-[13px] text-text-muted leading-snug">${SENTENCE_FALLBACK}</p>
    <div class="${ROW_CLS}">
      <button data-fit="fb-btn-dismiss" class="btn btn-ghost btn-sm rounded-pill flex-1${BTN_BASIS}">Dismiss</button>
      <button data-fit="fb-btn-retry" class="btn btn-primary btn-sm rounded-pill flex-1${BTN_BASIS}">Generate another</button>
    </div>
  </div>
</div>`;

/* ── Run ──────────────────────────────────────────────────────────────────────────────── */

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage();

const res = await page.goto(BASE + BENCH_ROUTE, { waitUntil: "load", timeout: 90_000 });
if (!res || !res.ok()) { console.error(`${BASE}${BENCH_ROUTE} returned ${res && res.status()}`); process.exit(1); }
await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});

const sheetCount = await page.$$eval('link[rel="stylesheet"]', (ls) => ls.length);
if (SHEET_MISSING) {
  await page.$$eval('link[rel="stylesheet"], style', (ns) => ns.forEach((n) => n.remove()));
}
// ⭐ PROVE THE PREMISE. `type-bench` shipped a sibling that measured a page whose sheet had not
// loaded and reported a clean pass. If the product sheet is absent when it should be present,
// every "it fits" below is meaningless.
ok(`§0 premise: product stylesheets ${SHEET_MISSING ? "REMOVED for the control" : "present"}`,
  SHEET_MISSING ? true : sheetCount > 0, `${sheetCount} sheet(s)`);

const report = [];
for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.evaluate((html) => {
    document.body.innerHTML =
      `<div style="padding:16px;display:flex;flex-direction:column;gap:20px;align-items:center;width:100%;box-sizing:border-box">${html}</div>`;
    document.body.style.margin = "0";
  }, inlineCard() + modalCard() + fallbackCard());
  await page.waitForTimeout(120);

  /**
   * ⛔ THREE DIFFERENT WAYS TEXT FAILS TO FIT, and only measuring all three is honest:
   *   · `overflowX`  — content wider than its box (a pill button's label, a long figure)
   *   · `clipped`    — content taller than a fixed-height box (a button that will not grow)
   *   · `escapes`    — the box itself sticks out past the viewport
   * A single `scrollWidth` check misses the second, which is exactly how a `btn` with a
   * one-line height hides the back half of a two-word label.
   */
  const fits = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("[data-fit]")) {
      const r = el.getBoundingClientRect();
      out.push({
        key: el.getAttribute("data-fit"),
        text: (el.textContent || "").trim().slice(0, 40),
        overflowX: el.scrollWidth - el.clientWidth,
        clipped: el.scrollHeight - el.clientHeight,
        escapes: Math.round(r.right - document.documentElement.clientWidth),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return out;
  });

  for (const f of fits) {
    const bad = f.overflowX > 1 || f.clipped > 1 || f.escapes > 1;
    if (bad) report.push({ vw: w, ...f });
    ok(`§${w} ${f.key} fits`, !bad,
      bad ? `overflowX=${f.overflowX} clipped=${f.clipped} escapes=${f.escapes} box=${f.w}×${f.h} "${f.text}"` : `${f.w}×${f.h}`);
  }

  writeFileSync(path.join(OUT, `refusal-${w}${SHEET_MISSING ? "-nosheet" : ""}.png`), await page.screenshot({ fullPage: true }));
}

await browser.close();

if (report.length) {
  console.log("\n── TEXT THAT DOES NOT FIT ──");
  for (const r of report) console.log(`  vw${r.vw}  ${r.key}  overflowX=${r.overflowX} clipped=${r.clipped} escapes=${r.escapes}  "${r.text}"`);
}
console.log(`\n${pass} passed · ${fail} failed · shots in .qa-design-gate/refusal-bench/`);

if (PROVE_RED) {
  // ⛔ INVERTED. The control's job is to FAIL. A green `--prove-red` means this bench has stopped
  // being able to see the defect it was built for, which makes every green run above it worthless.
  const caught = report.some((r) => r.key === "btn-fix");
  console.log(caught
    ? `\nCONTROL OK — the bench still detects the shipped defect (${report.length} overflow${report.length === 1 ? "" : "s"} on the pre-fix card).`
    : "\nCONTROL FAILED — the pre-fix card did NOT overflow. This bench can no longer fail and proves nothing.");
  process.exit(caught ? 0 : 1);
}
process.exit(fail === 0 ? 0 : 1);
