/**
 * RASTERISE A PDF AND LOOK AT IT — every page, as an image.
 *
 *   node scripts/rasterise-pdf.mjs docs/50pick-updown-operator-guide.pdf [outDir]
 *
 * ⛔ WHY THIS EXISTS AND WHY A SCREENSHOT OF THE HTML WILL NOT DO. The HTML and the PDF are
 * DIFFERENT DOCUMENTS. Print CSS, page breaks, widow/orphan handling and `@page` margins
 * only take effect in the PDF, so a fault that splits a worked example across a page
 * boundary — or drops a box off the bottom — is invisible in the browser and obvious on
 * paper. `docs/README.md` states the rule for the operator guide: edit the HTML, regenerate,
 * then verify by RASTERISING, never by trusting the render.
 *
 * It uses Chromium (already a dependency for the live drives) with the PDF loaded through
 * the built-in viewer, so what is captured is what the viewer paints — not a re-render of
 * the source.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const pdfPath = resolve(process.argv[2] ?? "");
const outDir = resolve(process.argv[3] ?? "./shots/pdf");
if (!pdfPath || !existsSync(pdfPath)) {
  console.error("usage: node scripts/rasterise-pdf.mjs <file.pdf> [outDir]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// Page count straight from the file, so the loop below cannot silently capture fewer pages
// than the document has — "I looked at every page" has to be checkable.
const raw = readFileSync(pdfPath).toString("latin1");
const declared = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`${basename(pdfPath)} — ${declared} page objects declared`);

const browser = await chromium.launch({
  // ⛔ HEADED. Headless Chromium DOWNLOADS a PDF instead of displaying it ("Download is
  // starting" on navigation), so the built-in viewer — the thing whose output we want to
  // photograph — never runs. Headed is not a preference here, it is the only mode in which
  // this measures anything.
  headless: false,
  args: ["--no-sandbox"],
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1500 } });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(pdfPath).href, { waitUntil: "load", timeout: 90_000 });
  // The built-in viewer streams pages in; give it room, then scroll to force every page to
  // render before capture. A lazy viewer photographs blank pages otherwise.
  await page.waitForTimeout(6_000);
  for (let i = 0; i < declared; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2_000);
  await page.keyboard.press("Control+Home");
  await page.waitForTimeout(1_500);

  // 🔴 "N FRAMES CAPTURED" IS NOT "N PAGES LOOKED AT", AND THE FIRST VERSION OF THIS LOOP
  // PROVED IT. It pressed PageDown between shots; the key went to the page, not to the PDF
  // viewer's scroller, so it wrote 22 files that were all page 1 — and reported
  // "captured 22 frames" perfectly happily. A rasteriser that photographs the same page
  // twenty-two times is worse than none, because it produces exactly the evidence the work
  // order asks for while showing nothing.
  //
  // ⭐ SO: scroll the viewer itself, and PROVE each frame is new by comparing bytes with the
  // one before it. A repeat is reported as a repeat.
  const seen = new Map();
  let frame = 0;
  // ⭐ SWEEP, THEN DEDUPE — rather than trying to land on page boundaries.
  //
  // Two earlier attempts failed in opposite directions, and both REPORTED SUCCESS at first:
  // PageDown went to the page rather than the viewer and wrote 22 copies of page 1; and
  // `#page=N` navigation reloads the viewer, which returns it to page 1 every time — 1
  // distinct frame out of 22. A wheel step tuned to "one page" landed 17 of 22, because the
  // step is a guess about zoom, margins and where the viewer decides to settle.
  //
  // So: take SMALL steps, many more frames than there are pages, and keep the DISTINCT ones.
  // A frame that straddles a page boundary is not a defect here — it is the best possible
  // view of a bad page break, which is the whole reason the PDF is rasterised rather than
  // the HTML screenshotted.
  const STEP = 560;
  const MAX_FRAMES = declared * 4 + 20;
  for (let i = 0; i < MAX_FRAMES && seen.size < declared * 2; i++) {
    const buf = await page.screenshot();
    const key = createHash("sha1").update(buf).digest("hex");
    if (!seen.has(key)) {
      frame++;
      const file = `${outDir}/${basename(pdfPath, ".pdf")}-f${String(frame).padStart(2, "0")}.png`;
      fs.writeFileSync(file, buf);
      seen.set(key, file);
    }
    await page.mouse.move(700, 800);
    await page.mouse.wheel(0, STEP);
    await page.waitForTimeout(320);
  }
  console.log(`${declared} pages declared · ${seen.size} DISTINCT frames written to ${outDir}`);
  if (seen.size < declared) {
    console.error(`✗ ONLY ${seen.size} DISTINCT FRAMES for ${declared} pages — the sweep did not reach the end.`);
    console.error("  Do not report this document as rasterised.");
    process.exitCode = 1;
  }
  console.log("⛔ Capturing is not verifying. LOOK at every frame.");
} finally {
  await browser.close();
}
