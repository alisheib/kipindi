/**
 * FINANCE FILTER ALIGNMENT — the owner's literal complaint, measured.
 *
 * 🔴 "alignment of input fields is weird, some up some down" (2026-09-25). Two separate causes,
 * both on /admin/finance's page head:
 *   §2 `TimeSelect`'s root is a COLUMN carrying a 12-hour echo BELOW its 36px box, so the control
 *      it hands the row is ~53px. The row was `items-center`, so the 36px DateSelect beside it
 *      was centred against 53px and sat ~8px LOW. Every other DateSelect+TimeSelect pairing in
 *      this repo already uses `items-start`.
 *   §3 The whole filter was an in-flow flex child of the page head's actions row, so opening the
 *      Custom panel grew it ~32px→~180px and slid the Excel/PDF buttons down with it.
 *
 * ⛔ IT MEASURES RECTANGLES, NOT CLASS STRINGS. A class-name assertion passes on a stylesheet
 * that never loaded and on a rule that something later outranks. Every number here is a real
 * `getBoundingClientRect()` from a real layout.
 * ⛔ AND EVERY ASSERTION HAS A POPULATION CONTROL. A selector that matches nothing makes an
 * "all of them line up" check pass trivially; each section fails if it found nothing to measure.
 *
 *   DISABLE_ADMIN_TOTP=true npx next dev -p 3017
 *   BASE=http://localhost:3017 node scripts/finance-filter-alignment.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3017";
const WIDTHS = [1280, 768, 360];
let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log(`  PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const CLOSED = "/admin/finance";
const OPEN = "/admin/finance?range=custom&from=2026-09-18&to=2026-09-25";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
/* ⛔ NEVER `networkidle` AGAINST `next dev`. The dev server holds an HMR socket open for the
   life of the page, so the idle condition never fires and every navigation dies on its timeout
   — which reads exactly like a broken page. `domcontentloaded` plus an explicit wait for the
   control being measured is the honest condition: it waits for the THING, not for silence. */
page.setDefaultTimeout(180_000);

/**
 * ⛔ A ZERO RECT IS NOT A MEASUREMENT, IT IS AN UNSTYLED PAGE. `domcontentloaded` fires before
 * stylesheets are applied, and against `next dev` the first cold load of a route can paint bare
 * HTML for several seconds while CSS compiles. The first run of this probe measured the 1280px
 * pass at 0px tall and reported two FAILures for a layout that was simply not styled yet — while
 * 768 and 360, served from the warm cache, measured correctly. An instrument that reads "0" and
 * calls it a height invents defects.
 * ⭐ So every pass now waits for the rail to have a real box before it measures anything, and a
 * box that never arrives fails loudly rather than being read as zero.
 */
async function settled(sel) {
  await page.locator(sel).first().waitFor({ state: "attached" });
  await page.waitForFunction(
    (s) => { const el = document.querySelector(s); return !!el && el.getBoundingClientRect().height > 0; },
    sel, { timeout: 180_000 },
  );
}

// Admin session in one call — the same bootstrap the reports smoke test uses.
const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
if (!seeded.ok()) { console.error(`seed-admin failed: ${seeded.status()}`); process.exit(1); }

const rect = async (sel, nth = 0) =>
  page.evaluate(([s, n]) => {
    const el = document.querySelectorAll(s)[n];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +r.top.toFixed(2), left: +r.left.toFixed(2), h: +r.height.toFixed(2), w: +r.width.toFixed(2) };
  }, [sel, nth]);

for (const width of WIDTHS) {
  console.log(`\n══ ${width}px ══`);
  await page.setViewportSize({ width, height: 900 });

  // ── §1 · the rail and the export buttons are one control language ──
  await page.goto(`${BASE}${CLOSED}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settled("[data-chip^='range:']");
  await settled("[aria-label='Download Excel report']");
  const nChips = await page.locator("[data-chip^='range:']").count();
  ok("§1 CONTROL · the window rail rendered", nChips >= 8, `${nChips} chip(s)`);
  const pill = await rect("[data-chip='range:7d']");
  const excelClosed = await rect("[aria-label='Download Excel report']");
  ok("§1 CONTROL · both the pill and the Excel button were found", !!pill && !!excelClosed);
  if (pill && excelClosed) {
    ok("§1 the export button is the same height as the pills it shares a row with",
      Math.abs(pill.h - excelClosed.h) <= 1, `pill ${pill.h}px vs button ${excelClosed.h}px`);
    ok("§1 …and that height is the dense admin rung (32px)",
      Math.abs(excelClosed.h - 32) <= 1, `${excelClosed.h}px`);
  }

  // ── §2 · the date box and the time box sit on ONE baseline ──
  /* ⛔ THE PANEL IS OPENED BY A CLICK NOW, NOT BY THE URL. In overlay mode it deliberately seeds
     CLOSED (an out-of-flow panel opened by a link covers the page it was opened from), so this
     probe has to drive the control the way an officer does. That also makes it a hydration check:
     if the click does nothing, the panel never appears and §2 fails loudly rather than silently
     measuring the closed state. */
  await page.goto(`${BASE}${OPEN}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settled("[data-chip^='range:']");
  const customBtn = page.locator("button.kp-fchip[aria-expanded]").first();
  ok("§2 CONTROL · the Custom toggle is present", await customBtn.count() > 0);
  /* ⛔ OPEN IT ONLY IF IT IS SHUT. The toggle is a toggle: in `inline` mode the panel seeds OPEN
     from the URL, so an unconditional click CLOSES it and this probe then waits three minutes
     for a panel it just dismissed. That is a coupling in the instrument, not a finding — and it
     matters because this file has to measure BOTH modes: the mutation run that proves these
     assertions can fail reverts the page to `inline`. Drive to the state you need, not through
     a fixed number of clicks. */
  if (await page.locator(".field-measure").count() === 0) await customBtn.click();
  await settled(".field-measure");
  const nDate = await page.locator(".field-measure").count();
  const nTime = await page.locator("[role='group']").count();
  ok("§2 CONTROL · the Custom panel rendered both field pairs",
    nDate >= 2 && nTime >= 2, `${nDate} date box(es), ${nTime} time box(es)`);
  for (const [i, row] of [[0, "From"], [1, "To"]]) {
    const d = await rect(".field-measure", i);
    const t = await rect("[role='group']", i);
    if (!d || !t) { ok(`§2 ${row} CONTROL · both boxes measurable`, false); continue; }
    /* ⭐ THE INVARIANT MOVED WITH THE LAYOUT, AND THAT IS THE POINT OF RE-STATING IT. The owner's
       complaint was "some up some down" when date and time shared a ROW: the fix then was a
       common TOP edge. They are stacked now (a side-by-side row cannot give the date field the
       187px it needs at 768 or 360), so the alignment that matters is a common LEFT edge and a
       common width — a field that starts or ends short of its neighbour reads exactly as wrong.
       ⛔ Asserting the old top-edge rule here would now be asserting that the layout never
       changed, which is a guard describing the past. */
    ok(`§2 ${row} · the date box and the time box share a left edge`,
      Math.abs(d.left - t.left) <= 1, `date ${d.left} vs time ${t.left} (Δ${(d.left - t.left).toFixed(2)}px)`);
    ok(`§2 ${row} · and both are the 36px sm field`,
      Math.abs(d.h - 36) <= 1 && Math.abs(t.h - 36) <= 1, `date ${d.h}px, time ${t.h}px`);
  }

  // ── §3 · opening the panel moves NOTHING around it ──
  const excelOpen = await rect("[aria-label='Download Excel report']");
  ok("§3 CONTROL · the Excel button was found in both states", !!excelClosed && !!excelOpen);
  if (excelClosed && excelOpen) {
    ok("§3 opening the Custom panel does not move the export buttons",
      Math.abs(excelClosed.top - excelOpen.top) <= 1,
      `closed top ${excelClosed.top} vs open top ${excelOpen.top} (Δ${(excelOpen.top - excelClosed.top).toFixed(2)}px)`);
  }

  // ── §4 · the out-of-flow panel is readable, not clipped off-screen ──
  /* ⛔ `[data-range-panel]`, NOT `.closest(".rounded-lg.border")`. The first version of this
     probe used the class pair — which `DateSelect`'s own box also wears — so it measured the
     115px date field and reported it as a panel "fully inside the viewport". A panel pushed
     off-screen would have passed. Measure the thing you name. */
  const panel = await page.evaluate(() => {
    const box = document.querySelector("[data-range-panel]");
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), w: +r.width.toFixed(2), vw: window.innerWidth };
  });
  ok("§4 CONTROL · the panel box was located", !!panel);
  if (panel) {
    ok("§4 the panel is fully inside the viewport",
      panel.left >= -1 && panel.right <= panel.vw + 1,
      `left ${panel.left}, right ${panel.right}, viewport ${panel.vw}`);
  }

  // ── §4b · the date field can actually show a date ──
  /* 🔴 MEASURED, BECAUSE IT WAS INVISIBLE TO EVERY OTHER CHECK. At a 520px panel the two-column
     grid left the date field ~115px against the ~145px "18 / 09 / 2026" plus the calendar
     trigger needs, so the YEAR was clipped at 768 and 1280 while 360 — one column, plenty of
     room — looked perfect. Overflow inside a field is paint, not page scroll: §5 below reported
     zero horizontal overflow the whole time it was happening. */
  const clip = await page.evaluate(() => {
    const out = [];
    for (const box of document.querySelectorAll(".field-measure")) {
      const input = box.querySelector("input");
      const strip = input?.parentElement?.parentElement;
      if (!strip) continue;
      out.push({ scroll: strip.scrollWidth, client: strip.clientWidth });
    }
    return out;
  });
  ok("§4b CONTROL · a date field's segment strip was measurable", clip.length >= 2, `${clip.length} field(s)`);
  for (const [i, c] of clip.entries()) {
    ok(`§4b date field ${i + 1} shows its whole date (no clipped year)`,
      c.scroll <= c.client + 1, `needs ${c.scroll}px, has ${c.client}px`);
  }

  /* 🔴 AND THE STRIP FITTING IS NOT THE WHOLE FIELD FITTING — the owner spotted what this probe
     could not. The field is `overflow-hidden`; the segment strip is `flex-1` (so it will not
     shrink below its min-content) and the calendar trigger is `shrink-0`. When the field is
     narrow, the part that gets clipped is therefore the TRIGGER, not the text — the strip check
     above stays green while the calendar glyph is sliced down its right edge. Measure the thing
     that actually gets cut. */
  const glyph = await page.evaluate(() => {
    const out = [];
    for (const field of document.querySelectorAll(".field-measure")) {
      const btn = field.querySelector("button");
      if (!btn) continue;
      const f = field.getBoundingClientRect(), b = btn.getBoundingClientRect();
      const svg = btn.querySelector("svg");
      out.push({
        overhang: +(b.right - f.right).toFixed(2),
        btnW: +b.width.toFixed(2),
        svgW: svg ? +svg.getBoundingClientRect().width.toFixed(2) : null,
        svgOverhang: svg ? +(svg.getBoundingClientRect().right - f.right).toFixed(2) : null,
      });
    }
    return out;
  });
  ok("§4c CONTROL · the calendar trigger was found in both date fields", glyph.length >= 2, `${glyph.length} trigger(s)`);
  for (const [i, g] of glyph.entries()) {
    ok(`§4c date field ${i + 1}'s calendar glyph is not clipped by the field edge`,
      g.overhang <= 1 && (g.svgOverhang === null || g.svgOverhang <= 1),
      `trigger overhangs the field by ${g.overhang}px (glyph by ${g.svgOverhang}px), button ${g.btnW}px wide`);
  }

  // ── §5 · the page does not scroll sideways in either state ──
  const ov = await page.evaluate(() => ({
    body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, vw: window.innerWidth,
  }));
  ok("§5 no horizontal overflow with the panel open",
    ov.body <= ov.vw + 1 && ov.doc <= ov.vw + 1, `body ${ov.body}, doc ${ov.doc}, viewport ${ov.vw}`);
}

await browser.close();
console.log(`\nfinance-filter-alignment: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
