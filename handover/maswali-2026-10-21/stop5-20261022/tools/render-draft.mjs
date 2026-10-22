// Render the DRAFT admin guide for Ali's Desktop: the S6 branch's docs/maswali-operator-guide.html (committed with its PDF
// at 337ea69c8) + one DRAFT box under the subtitle saying what the final version changes. Same method as the repo's
// scripts/generate-pdfs.mjs (Chromium print, A4, the page's own CSS). Also writes one PNG per page so every page is read.
// node render-draft.mjs <guide.html> <out.pdf> <png-dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("C:/50pick-ssd/maswali-coord-20261019/package.json");
const { chromium } = require("playwright");

const [src, outPdf, pngDir] = process.argv.slice(2);
let html = readFileSync(src, "utf8");
const anchor = '<p class="sub">For 50pick staff who run Maswali Millionea, the weekly jackpot. No technical knowledge required.</p>';
if (!html.includes(anchor)) throw new Error("anchor missing");
const box = `
<div class="box warn"><p><span class="pill a">DRAFT · 22 OCTOBER 2026</span> <b>This is the working draft.</b> The final guide
replaces it once the last console changes are in. What the final version changes:</p>
<ul>
<li><b>Objections.</b> A player objects to one question at a time, from the ticket's page, during the 24-hour
<b>objection window</b> (called the “check window” below). A Compliance officer rules on each objection on the Integrity
page — never the officer who sealed that question.</li>
<li><b>No private test weeks.</b> The first public week is the live test. Ignore the <i>Drive</i> line below.</li>
<li><b>Clearer screens.</b> Officers' names instead of codes, every time in EAT, a card with the rules each week froze,
a way to discard a draft week, and search on the evidence archive.</li>
<li><b>The Auditor</b> will read every Millionea screen, without acting on any.</li>
</ul></div>`;
html = html.replace(anchor, anchor + box);
const tmpHtml = src.replace(/\.html$/, ".draft.html");
writeFileSync(tmpHtml, html);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1240, height: 1754 } });
const page = await ctx.newPage();
await page.goto("file:///" + tmpHtml.replace(/\\/g, "/"), { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.pdf({ path: outPdf, format: "A4", printBackground: true, preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" } });
console.log("pdf written:", outPdf);

// Page images: render the PDF itself in Chromium's PDF viewer is not available headless, so print-emulate the HTML
// at A4 width and cut it into page-height screenshots with the print media applied.
await page.emulateMedia({ media: "print" });
await page.setViewportSize({ width: 794, height: 1123 }); // A4 at 96 dpi
mkdirSync(pngDir, { recursive: true });
const h = await page.evaluate(() => document.documentElement.scrollHeight);
let n = 0;
for (let y = 0; y < h; y += 1123) {
  n++;
  await page.screenshot({ path: `${pngDir}/p${String(n).padStart(2, "0")}.png`, clip: { x: 0, y, width: 794, height: Math.min(1123, h - y) }, fullPage: true });
}
console.log("png pages:", n, "height", h);
await browser.close();
