/**
 * Second pass for the markets runbook — the figures the first pass got WRONG or missed.
 *
 *   SHOT_DIR=docs/runbooks/markets-assets node scripts/live-markets-guide-shots2.mjs
 *
 * 🔴 WHY THIS EXISTS. The first pass captured `/admin/settlement` as the COMPLIANCE
 * officer and called the file `m11-refused` — expecting a refusal panel. Compliance is
 * NOT refused there: `DEFAULT_GRANTS` gives it `accounting` **view** (it is `accounting`
 * **act** it lacks), so the page renders in full. The figure was real and the caption
 * would have been a lie. Looking at the image is what caught it.
 *
 * A genuine refusal needs a role that lacks the DOMAIN, not the act — the TRADING
 * officer on a `compliance` route, since `DEFAULT_GRANTS` makes the two disjoint.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { login, bodyText, BASE, SHOT } from "./live/harness.mjs";

mkdirSync(SHOT, { recursive: true });

const br = await chromium.launch();
const contexts = [];
async function as(who) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } });
  contexts.push(ctx);
  const page = await ctx.newPage();
  await login(page, who);
  return page;
}
async function shootPage(page, file) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOT}/${file}.png`, fullPage: false });
  console.log(`  ✓ ${file}.png`);
}

try {
  const t = await as("trading");

  // The REAL refusal. Assert it before shooting it — a figure captioned "this is what a
  // refusal looks like" must actually be one, and the first pass proved that assuming
  // is not good enough.
  await t.goto(`${BASE}/admin/objections`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  const txt = await bodyText(t);
  const refused = /cannot view|hairuhusiwi|not have access|restricted/.test(txt);
  console.log(`  trading on /admin/objections → ${refused ? "REFUSED (as expected)" : "NOT refused"}`);
  console.log(`    ${txt.slice(0, 200)}`);
  await shootPage(t, refused ? "m11-refused" : "m11-NOT-refused-check-me");

  // A resolved market's own detail page — the record an objection would be argued from.
  await t.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  const firstMarket = await t.locator('a[href^="/admin/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  if (firstMarket) {
    await t.goto(`${BASE}${firstMarket}`, { waitUntil: "domcontentloaded" });
    await t.waitForLoadState("networkidle").catch(() => {});
    await shootPage(t, "m14-market-detail");
    console.log(`    market detail: ${firstMarket}`);
  } else {
    console.log("  ✗ no market detail link found on the curation queue");
  }

  // The compliance VIEW of settlement, correctly named this time.
  const c = await as("officer");
  await c.goto(`${BASE}/admin/settlement`, { waitUntil: "domcontentloaded" });
  await c.waitForLoadState("networkidle").catch(() => {});
  await shootPage(c, "m15-settlement-as-compliance");
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  await br.close();
}
