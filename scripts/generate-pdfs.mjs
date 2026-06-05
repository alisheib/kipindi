/**
 * Render docs/brief-operator.html and docs/brief-technical.html to PDF
 * via Playwright. Output:
 *
 *   docs/50pick-operator-briefing.pdf
 *   docs/50pick-technical-brief.pdf
 *
 * Run: node scripts/generate-pdfs.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const TARGETS = [
  { in: "docs/brief-operator.html",  out: "docs/50pick-operator-briefing.pdf" },
  { in: "docs/brief-technical.html", out: "docs/50pick-technical-brief.pdf"  },
  { in: "docs/manual-player.html",   out: "docs/50pick-player-user-manual.pdf"  },
  { in: "docs/manual-admin.html",    out: "docs/50pick-admin-user-manual.pdf"   },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1240, height: 1754 }, // approx A4 @ 150 dpi for screen render
});

for (const t of TARGETS) {
  const inPath  = resolve(root, t.in);
  const outPath = resolve(root, t.out);
  const fileUrl = "file:///" + inPath.replace(/\\/g, "/");
  console.log(`▸ ${t.in}  →  ${t.out}`);
  const page = await ctx.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  // Give web fonts a moment to settle (the Sora / Inter / JetBrains Mono
  // network requests resolve mostly in that "networkidle" wait, but the
  // first paint can still flash unstyled if we PDF immediately).
  await page.waitForTimeout(800);
  let writePath = outPath;
  try {
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    console.log(`  ✓ ${t.out}`);
  } catch (err) {
    // Most common Windows case: the canonical PDF is open in a reader
    // and locked. Fall back to a -new.pdf suffix so the user can swap
    // when ready.
    if (err && (err.code === "EBUSY" || /EBUSY/.test(String(err)))) {
      writePath = outPath.replace(/\.pdf$/i, "-new.pdf");
      await page.pdf({
        path: writePath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      console.log(`  ! ${t.out} was locked — wrote ${writePath.replace(root + "\\", "").replace(root + "/", "")} instead. Close the viewer + rename when ready.`);
    } else {
      throw err;
    }
  }
  await page.close();
}

await ctx.close();
await browser.close();
console.log("\n  Done. Both PDFs written to docs/.");
