/**
 * Render a report HTML source to its PDF.
 *
 *   node docs/reports/mkreport.mjs technical-architecture-report.html 50pick-technical-architecture-report.pdf
 *   npm run report:technical          # the same thing, from the repo root
 *
 * ⚠️ SAME REASONING AS `docs/runbooks/mkpdf.mjs`, and it lives in the repo for the same
 * reason: a document that can only be rebuilt on one person's machine is a document that
 * goes stale by default. This one differs in two ways that matter for a regulatory issue.
 *
 * ⛔ NO CHROMIUM HEADER/FOOTER TEMPLATE. The runbook renderer draws a running footer through
 * `displayHeaderFooter`. This report paints its own footer inside each sheet, because a
 * regulatory document's footer carries the section number, which changes per page and which
 * Chromium's template cannot know. `displayHeaderFooter` is therefore OFF and the margins
 * are zero — the sheet is the page.
 *
 * ⛔ FONTS MUST HAVE LOADED BEFORE THE PRINT. The document uses webfonts; printing before
 * they resolve silently produces a fallback-metric PDF that looks subtly wrong and is not
 * obviously broken. `document.fonts.ready` is awaited, and the families actually resolved
 * are reported so a fallback render is visible rather than shipped unnoticed.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const srcName = process.argv[2] ?? "technical-architecture-report.html";
const outName = process.argv[3] ?? "50pick-technical-architecture-report.pdf";
const src = resolve(HERE, srcName);
const out = resolve(HERE, outName);

if (!existsSync(src)) {
  console.error(`[report] source not found: ${src}`);
  process.exit(1);
}
mkdirSync(HERE, { recursive: true });

let html = readFileSync(src, "utf8");

// Inline any referenced raster so the PDF is self-contained and nothing depends on
// `file://` resolution inside Chromium's print context. A missing image is a hard failure:
// a figure that renders blank leaves a caption that lies.
const missing = [];
html = html.replace(/src="([^"]+\.(?:png|jpg|jpeg))"/g, (m, rel) => {
  if (/^data:/.test(rel)) return m;
  const p = join(HERE, rel);
  if (!existsSync(p)) { missing.push(rel); return m; }
  const ext = rel.split(".").pop().toLowerCase() === "png" ? "png" : "jpeg";
  return `src="data:image/${ext};base64,${readFileSync(p).toString("base64")}"`;
});
if (missing.length) {
  console.error(`[report] ${missing.length} image(s) referenced but not on disk:\n  ${missing.join("\n  ")}`);
  console.error("[report] refusing to build — a figure that renders blank is a caption that lies.");
  process.exit(1);
}

const br = await chromium.launch();
const page = await br.newPage();
await page.setContent(html, { waitUntil: "networkidle" });

// ⛔ Webfonts, then images. Either one unresolved changes the layout of a printed page.
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(
  () => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
);

const fonts = await page.evaluate(() => ({
  display: document.fonts.check('600 12pt Poppins'),
  body: document.fonts.check('400 12pt "Source Serif 4"'),
  mono: document.fonts.check('400 12pt "JetBrains Mono"'),
  sheets: document.querySelectorAll(".sheet").length,
}));

/**
 * ⛔ EVERY SHEET MUST FIT ITS PAGE, AND THIS IS WHAT PROVES IT.
 *
 * A sheet whose content runs past the page height does not fail loudly: it spills a few
 * millimetres onto a second page that carries a stray line and a footer, and the document
 * still opens perfectly well. The first render of this report produced 26 pages from 16
 * sheets that way — an overflow nobody would notice until it was in front of a regulator.
 *
 * The check is arithmetic, not judgement: measure each sheet against the page box it was
 * given and name the ones that exceed it.
 */
const PAGE_MM = 296;
const overflow = await page.evaluate((limitMm) => {
  const mm = 96 / 25.4; // CSS px per mm
  return Array.from(document.querySelectorAll(".sheet")).map((el, i) => {
    // scrollHeight catches content that has run past a fixed height; offsetHeight would not.
    const used = Math.max(el.scrollHeight, el.getBoundingClientRect().height) / mm;
    const label = el.querySelector(".runhead span")?.textContent?.trim()
      ?? el.querySelector("h1")?.textContent?.trim() ?? `sheet ${i + 1}`;
    return { i: i + 1, label, used: Math.round(used * 10) / 10 };
  }).filter((s) => s.used > limitMm + 0.5);
}, PAGE_MM);

if (overflow.length) {
  console.error(`[report] ${overflow.length} sheet(s) exceed the ${PAGE_MM}mm page:`);
  for (const s of overflow) console.error(`   sheet ${String(s.i).padStart(2)} · ${s.used}mm · ${s.label}`);
  console.error("[report] refusing to build — trim the content or split the sheet.");
  await br.close();
  process.exit(1);
}

await page.emulateMedia({ media: "print" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: false,
  preferCSSPageSize: true,
  margin: { top: "0", bottom: "0", left: "0", right: "0" },
});
await br.close();

const fallback = Object.entries(fonts)
  .filter(([k, v]) => k !== "sheets" && !v)
  .map(([k]) => k);
console.log(`✓ ${outName} — ${fonts.sheets} sheets`);
if (fallback.length) {
  console.warn(`⚠ webfont not resolved (${fallback.join(", ")}) — the PDF rendered with fallback metrics.`);
  process.exit(1);
}
console.log("  fonts: display, body and mono all resolved");
