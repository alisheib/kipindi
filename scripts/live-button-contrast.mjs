/**
 * THE RASTER CONTRAST INSTRUMENT — the third contrast check, and the only one
 * that can see a button's `:hover`.
 *
 *   node scripts/live-button-contrast.mjs
 *   LIVE_BASE=http://localhost:3010 node scripts/live-button-contrast.mjs
 *   SIZES=btn-xl,btn-md,btn-sm node scripts/live-button-contrast.mjs
 *
 * WHY A THIRD ONE. The two that exist both read COLOURS:
 *   · `contrast-audit.mts`   — the token gate. Parses globals.css.
 *   · `contrast-rendered.mjs` — the DOM sweep. Reads `getComputedStyle`.
 * `filter: brightness()` is a RASTER effect. It changes no computed value, so
 * neither of them can see a hover state without SIMULATING the filter — and a
 * simulation is a derived value, which this campaign has been burned by often
 * enough to have written it down. This file simulates nothing: it puts a real
 * pointer on a real button on production and reads the pixels back.
 *
 * TWO NUMBERS PER STATE, AND THEY ARE NOT THE SAME QUESTION:
 *   worst-stop    the lightest fill pixel in the button — the very top of a
 *                 180deg ramp. This is what the two colour instruments score
 *                 after E-118/E-119, and it is deliberately conservative.
 *   behind-glyph  the fill at the TOP ROW OF THE LABEL BOX, sampled in the
 *                 horizontal padding where no glyph paints. A 180deg ramp is
 *                 invariant in x, so this IS the background behind the tallest
 *                 ascender — what a reader actually receives. ⭐ It is the
 *                 verdict column, and it is SIZE-DEPENDENT: one gradient reads
 *                 4.62 under a 56px hero label and 4.39 under a 30px pill,
 *                 because the shorter button puts its glyphs higher up the ramp.
 *
 * ⛔ THE INK IS SAMPLED FROM A SOLID `background: currentColor` SWATCH, NEVER
 * FROM A GLYPH. Subpixel antialiasing tints glyph pixels: measured, a pearl-white
 * label sampled `rgb(209,252,255)` from inside a █ block — a cyan fringe worth
 * 0.3 of a contrast point, in the flattering direction.
 *
 * ⛔ THE FIXTURE IS VERIFIED AGAINST THE REAL BUTTON. An injected element styled
 * by the page's own stylesheet is only evidence if it computes to what the
 * product paints, so the run asserts that its `.btn-primary` fixture and the
 * page's own `.btn-primary` resolve to the same `background-image`, and REFUSES
 * to report if they diverge.
 *
 * Exit 1 on a behind-glyph AA failure, 2 if the run measured nothing.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE ?? "https://50pick.tz";
const SIZES = (process.env.SIZES ?? "btn-xl,btn-sm").split(",");
const VARIANTS = ["btn-primary", "btn-yes", "btn-no", "btn-danger", "btn-gold", "btn-claret"];

// Findings that already own a failure here, so a known-open defect reads as
// tracked rather than as a fresh surprise. ⛔ An id in this map does NOT stop
// the run failing — it only labels the row.
const OPEN = {
  "btn-yes:hover": "E-120",
  "btn-danger:hover": "E-120",
};

const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); const [hi, lo] = x >= y ? [x, y] : [y, x]; return (hi + 0.05) / (lo + 0.05); };
const rgb = (c) => `rgb(${c.join(",")})`;

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(1200);

// The fixture takes the PAGE'S OWN stylesheet. Nothing here restates a value.
await page.evaluate(({ variants, sizes }) => {
  const host = document.createElement("div");
  host.id = "px-fixture";
  host.style.cssText =
    "position:fixed;left:0;top:0;z-index:2147483647;display:flex;flex-direction:column;gap:6px;padding:6px;background:#000";
  for (const size of sizes) {
    for (const v of variants) {
      const el = document.createElement("button");
      el.className = `btn ${v} ${size}`;
      el.id = `px-${v}-${size}`;
      el.style.cssText = "width:420px;justify-content:center";
      const label = document.createElement("span");
      label.id = `lbl-${v}-${size}`;
      label.textContent = "Sign up";
      const swatch = document.createElement("i");
      swatch.id = `ink-${v}-${size}`;
      swatch.style.cssText = "display:inline-block;width:40px;height:10px;background:currentColor;margin-left:10px";
      el.append(label, swatch);
      host.appendChild(el);
    }
  }
  document.body.appendChild(host);
}, { variants: VARIANTS, sizes: SIZES });
await page.waitForTimeout(400);

// ⛔ REPRESENTATION CHECK — before any number is printed.
const fidelity = await page.evaluate((size) => {
  const real = [...document.querySelectorAll(".btn-primary")].find((n) => !n.closest("#px-fixture"));
  if (!real) return { ok: false, why: "no real .btn-primary on the page to compare against" };
  const a = getComputedStyle(real).backgroundImage;
  const b = getComputedStyle(document.getElementById(`px-${"btn-primary"}-${size}`)).backgroundImage;
  return { ok: a === b, why: `real "${a}" vs fixture "${b}"` };
}, SIZES[0]);
if (!fidelity.ok) {
  console.log(`⛔ FIXTURE DOES NOT MATCH THE PRODUCT — ${fidelity.why}`);
  await browser.close();
  process.exit(2);
}

/** Decode a PNG back to pixels using the page's own canvas — no dependency. */
async function pixels(buf) {
  const url = "data:image/png;base64," + buf.toString("base64");
  return page.evaluate(async (u) => {
    const img = new Image();
    img.src = u;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    return { w: c.width, h: c.height, data: Array.from(g.getImageData(0, 0, c.width, c.height).data) };
  }, url);
}
const at = (p, x, y) => [p.data[(y * p.w + x) * 4], p.data[(y * p.w + x) * 4 + 1], p.data[(y * p.w + x) * 4 + 2]];
const median = (rows) => [...rows].sort((a, b) => lum(a) - lum(b))[Math.floor(rows.length / 2)];

console.log(`live-button-contrast: ${BASE}\n`);
console.log("size    variant      state  ink              worst-stop        r     behind-glyph      r     verdict");
let measured = 0;
const failures = [];
for (const size of SIZES) {
  for (const v of VARIANTS) {
    const el = page.locator(`#px-${v}-${size}`);
    for (const state of ["rest", "hover"]) {
      if (state === "hover") { await el.hover(); await page.waitForTimeout(450); }
      else { await page.mouse.move(1240, 860); await page.waitForTimeout(250); }

      const geom = await page.evaluate(({ v, size }) => {
        const b = document.getElementById(`px-${v}-${size}`).getBoundingClientRect();
        const l = document.getElementById(`lbl-${v}-${size}`).getBoundingClientRect();
        const i = document.getElementById(`ink-${v}-${size}`).getBoundingClientRect();
        return {
          labelTop: Math.round(l.top - b.top),
          inkX: Math.round(i.left - b.left + i.width / 2),
          inkY: Math.round(i.top - b.top + i.height / 2),
        };
      }, { v, size });

      const p = await pixels(await el.screenshot());
      const ink = at(p, geom.inkX, geom.inkY);
      // x=14 is inside the horizontal padding at every size: no glyph paints
      // there, and a 180deg ramp does not vary in x.
      const worst = median([2, 3, 4].map((y) => at(p, 14, y)));
      const behind = median([geom.labelTop, geom.labelTop + 1].map((y) => at(p, 14, y)));
      const rW = ratio(ink, worst), rB = ratio(ink, behind);
      measured++;
      const key = `${v}:${state}`;
      const bad = rB < 4.5;
      if (bad) failures.push({ ...{ size, v, state }, rB, id: OPEN[key] });
      console.log(
        `${size.padEnd(7)} ${v.padEnd(12)} ${state.padEnd(6)} ${rgb(ink).padEnd(16)} ${rgb(worst).padEnd(17)} ` +
        `${rW.toFixed(2).padStart(5)} ${rgb(behind).padEnd(17)} ${rB.toFixed(2).padStart(5)} ` +
        `${bad ? `FAIL${OPEN[key] ? ` (${OPEN[key]})` : ""}` : "PASS"}`);
    }
  }
}
await browser.close();

// ⛔ "no failures" is not a pass unless something was measured — E-118's rule.
const want = SIZES.length * VARIANTS.length * 2;
console.log(`\n  measured ${measured}/${want} button states`);
if (measured < want) {
  console.log("⛔ INCONCLUSIVE — this run did not cover what it names\n");
  process.exit(2);
}
if (failures.length) {
  console.log(`\nFAIL — ${failures.length} state(s) below AA 4.5 behind the glyph:`);
  for (const f of failures) console.log(`   · ${f.size} ${f.v} ${f.state} — ${f.rB.toFixed(2)}${f.id ? `  [${f.id}, filed]` : "  [UNFILED — file it]"}`);
  console.log("");
  process.exit(1);
}
console.log("\nPASS — every solid-family button label clears AA in both states\n");
