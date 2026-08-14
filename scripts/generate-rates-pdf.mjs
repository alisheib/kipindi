/**
 * Render docs/rates-for-admins.html → docs/50pick-rates-for-admins.pdf
 * (the rates & payouts guide handed to administrators).
 *
 * Run: node scripts/generate-rates-pdf.mjs
 *
 * ⛔ WHY THIS IS NOT A TARGET IN `generate-pdfs.mjs`, AND THE DIFFERENCE MATTERS.
 * That script renders with `preferCSSPageSize: true` and zero PDF margins, which is right
 * for a guide whose HTML paints its own full-bleed pages. This document is plain flowed
 * text and carries a **running page-number footer**, and Chromium draws header/footer
 * INSIDE the PDF margin box — with `preferCSSPageSize` on, the CSS @page margin wins,
 * no room is reserved, and the page numbers silently do not print. Rendering this file
 * through the other script produces a PDF that looks fine and has lost its pagination.
 *
 * ⚠️ The figures in the HTML are not computed here — they were produced by running the
 * platform's own `src/lib/payout.ts` at the rates stated in the document's section 1.
 * If a rate changes, re-derive the worked examples before re-rendering; this script only
 * lays the document out.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  {
    in: "docs/rates-for-admins.html",
    out: "docs/50pick-rates-for-admins.pdf",
    foot: "50pick — how rates and payouts are calculated",
  },
  {
    in: "docs/rates-decisions-needed.html",
    out: "docs/50pick-betting-rules-final.pdf",
    foot: "50pick — betting rules and rates: final",
  },
];

const footerFor = (label) => `
<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:8pt;color:#555;
            padding:0 14mm;display:flex;justify-content:space-between;align-items:center;">
  <span>${label}</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

const BASE_OPTS = {
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  // An empty header is REQUIRED: omitted, Chromium prints its own default title/date band.
  headerTemplate: '<div style="font-size:0"></div>',
  margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1240, height: 1754 } });

for (const t of TARGETS) {
  const IN = resolve(root, t.in);
  const OUT = resolve(root, t.out);
  const opts = { ...BASE_OPTS, footerTemplate: footerFor(t.foot) };

  const page = await ctx.newPage();
  await page.goto("file:///" + IN.replace(/\\/g, "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  let writePath = OUT;
  try {
    await page.pdf({ path: OUT, ...opts });
  } catch (err) {
    // Windows: the canonical PDF is open in a reader and locked. Same fallback as generate-pdfs.mjs.
    if (err && (err.code === "EBUSY" || /EBUSY/.test(String(err)))) {
      writePath = OUT.replace(/\.pdf$/i, "-new.pdf");
      await page.pdf({ path: writePath, ...opts });
      console.log(`  ! ${OUT} was locked — wrote ${writePath} instead. Close the viewer + rename.`);
    } else {
      throw err;
    }
  }
  console.log(`  ✓ ${writePath}`);
  await page.close();
}

await ctx.close();
await browser.close();
