/**
 * READ A MARKET'S NAMED RESOLUTION SOURCE IN A REAL BROWSER, and photograph it.
 *
 *   SHOT_DIR=./shots/RUN-2026-08-03 node scripts/live-source-read.mjs <url> <shot-name> [wait-text]
 *
 * WHY THIS EXISTS. A resolution criterion names a public source so that a PLAYER can
 * check the settlement against it. That promise is only kept if the source can actually
 * be read — and `accuweather.com` returns nothing to a server-side fetch (60s timeout,
 * every time). An officer resolving this market opens it in a browser, so the check has
 * to open it in a browser too, and keep the image as the evidence that was looked at.
 *
 * ⛔ This resolves nothing and writes nothing. It reads a page and takes a picture.
 */
import { chromium } from "playwright";

const url = process.argv[2];
const name = process.argv[3] ?? "source";
const waitText = process.argv[4];
const SHOT = process.env.SHOT_DIR ?? ".";
if (!url) { console.error("usage: node scripts/live-source-read.mjs <url> <shot-name> [wait-text]"); process.exit(2); }

const b = await chromium.launch();
// A real UA and viewport: several publishers serve an empty shell to obvious automation,
// and an empty shell photographed as "the source says nothing" is a false finding.
const ctx = await b.newContext({
  viewport: { width: 1440, height: 1600 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  locale: "en-GB",
});
const page = await ctx.newPage();

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  // Wait for a POSITIVE signal — text that only exists once the content rendered.
  if (waitText) {
    await page.waitForFunction(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      waitText, { timeout: 60_000 },
    ).catch(() => console.log(`    (never saw "${waitText}" — reading whatever rendered)`));
  }
  await page.waitForTimeout(4000);          // let lazy tiles settle

  const txt = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
  console.log(`\nURL      ${url}`);
  console.log(`TITLE    ${await page.title()}`);
  console.log(`CHARS    ${txt.length}`);
  console.log(`\n--- first 3000 chars of rendered text ---\n${txt.slice(0, 3000)}\n`);

  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true });
  console.log(`shot → ${SHOT}/${name}.png`);
} catch (e) {
  console.log(`FAILED to read the source: ${e.message}`);
  await page.screenshot({ path: `${SHOT}/${name}-failed.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await b.close();
}
