/**
 * Rasterize each .page section of the four PDF source HTMLs to PNGs
 * for visual audit. This sidesteps the Chromium PDF viewer entirely.
 *
 * Output: .50pick-shots/pdf-audit/<name>-pN.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, ".50pick-shots/pdf-audit");
mkdirSync(out, { recursive: true });

const TARGETS = [
  { name: "brief-operator",  html: "docs/brief-operator.html" },
  { name: "brief-technical", html: "docs/brief-technical.html" },
  { name: "manual-player",   html: "docs/manual-player.html" },
  { name: "manual-admin",    html: "docs/manual-admin.html" },
];

const browser = await chromium.launch();
// A4 @ 96dpi-ish: 794×1123 baseline; bump width slightly so screenshot covers the section.
const ctx = await browser.newContext({ viewport: { width: 800, height: 1130 } });

for (const t of TARGETS) {
  const fileUrl = "file:///" + resolve(root, t.html).replace(/\\/g, "/");
  console.log(`▸ ${t.name}`);
  const page = await ctx.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Each .page is one PDF page in the printed output.
  const sections = await page.locator("section.page").all();
  console.log(`   ${sections.length} pages`);

  for (let i = 0; i < sections.length; i++) {
    const dest = resolve(out, `${t.name}-p${i + 1}.png`);
    const box = await sections[i].boundingBox();
    if (!box) continue;
    // Scroll the section into view, then screenshot the section's bounding box.
    await sections[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await sections[i].screenshot({ path: dest });
  }

  await page.close();
}

await ctx.close();
await browser.close();
console.log("\n  Done.");
