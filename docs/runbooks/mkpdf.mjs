/**
 * Render a runbook HTML source to its PDF.
 *
 *   node docs/runbooks/mkpdf.mjs updown-runbook.html 50pick-updown-runbook.pdf
 *   npm run runbook:updown            # the same thing, from the repo root
 *
 * ⚠️ THIS SCRIPT LIVES IN THE REPO ON PURPOSE. The first version of it existed only in a
 * session scratchpad, so the README's "to rebuild, run mkpdf.mjs" was an instruction nobody
 * else could follow — the PDF was effectively un-regenerable the moment that machine was gone.
 * A runbook that cannot be rebuilt goes stale by default.
 *
 * Images are inlined as data URIs before rendering, so the PDF is self-contained and nothing
 * depends on `file://` resolution inside Chromium's print context. A missing image is a hard
 * FAILURE, not a warning: a runbook that silently ships with a blank figure is worse than one
 * that refuses to build, because a tester reads the caption and believes it.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const srcName = process.argv[2] ?? "updown-runbook.html";
const outName = process.argv[3] ?? "50pick-updown-runbook.pdf";
const src = resolve(HERE, srcName);
const out = resolve(HERE, outName);

if (!existsSync(src)) {
  console.error(`[runbook] source not found: ${src}`);
  process.exit(1);
}

let html = readFileSync(src, "utf8");
const missing = [];
html = html.replace(/src="([^"]+\.png)"/g, (m, rel) => {
  const p = join(HERE, rel);
  if (!existsSync(p)) { missing.push(rel); return m; }
  return `src="data:image/png;base64,${readFileSync(p).toString("base64")}"`;
});
if (missing.length) {
  console.error(`[runbook] ${missing.length} image(s) referenced but not on disk:\n  ${missing.join("\n  ")}`);
  console.error(`[runbook] refusing to build — a figure that renders blank is a caption that lies.`);
  process.exit(1);
}

const br = await chromium.launch();
const page = await br.newPage();
await page.setContent(html, { waitUntil: "load" });
// Every image must have actually decoded. `load` alone can fire with a broken data URI.
await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
const shown = await page.evaluate(() => document.images.length);
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="width:100%;font:8pt Segoe UI,sans-serif;color:#8a90a0;padding:0 15mm;' +
    'display:flex;justify-content:space-between"><span>50pick · Up &amp; Down runbook</span>' +
    '<span class="pageNumber"></span></div>',
  margin: { top: "16mm", bottom: "14mm", left: "15mm", right: "15mm" },
});
await br.close();
console.log(`✓ ${outName} — ${shown} figures, all decoded`);
