/**
 * Open any surface on PRODUCTION as a named persona and photograph it.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-shoot.mjs <persona> <path> <shot-name> [wait-regex]
 *   node scripts/live-shoot.mjs trading /admin/resolver resolver-queue "resolver|queue"
 *
 * The general-purpose eye. Every driver in this campaign re-implemented "sign in, go to a
 * page, wait for something real, take a picture" — and each copy re-learned the same traps.
 * This is that loop once, on the shared harness.
 *
 * ⛔ Read-only by construction: it signs in, navigates, waits, shoots, and prints text.
 * It clicks nothing. Anything that changes production state belongs in a named script that
 * says so in its own header.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const [persona, path, name, waitRe] = process.argv.slice(2);
if (!persona || !path || !name) {
  console.error("usage: node scripts/live-shoot.mjs <persona> <path> <shot-name> [wait-regex]");
  process.exit(2);
}

const { b, ctx } = await browser();
const page = await ctx.newPage();

try {
  await login(page, persona);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });

  // 🔴 Wait for a POSITIVE signal. These pages suspend and stream; `load` and
  // `domcontentloaded` both fire on the SPINNER, and `networkidle` never fires at all
  // (open event stream). A shot taken at that instant photographs an empty page and is
  // then read as "the feature is missing".
  const re = waitRe ?? "[a-z]{4}";
  const rendered = await page
    .waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re, { timeout: 45_000 })
    .then(() => true).catch(() => false);

  await page.waitForTimeout(1200);
  const txt = await bodyText(page);
  console.log(`\n${persona} · ${path} · rendered=${rendered} · ${txt.length} chars\n`);
  console.log(txt.slice(0, 4000));

  await shot(page, name);
  console.log(`\nshot → ${SHOT}/${name}.png`);
} catch (e) {
  console.log(`FAILED — ${e.message}`);
  await shot(page, `${name}-failed`);
  process.exitCode = 1;
} finally {
  await b.close();
}
