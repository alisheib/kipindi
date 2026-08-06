/**
 * E-110 on production: does the OPERATOR actually see the second axis?
 *
 * ⛔ READ-ONLY. It opens controls and reads them; it submits nothing and edits no chain.
 * ⚠️ TWO PREMISES HAD TO BE FOUND RATHER THAN ASSUMED: the Add-chain form sits behind a
 * disclosure button, and the reason renders INSIDE the Select's dropdown. A `body.innerText`
 * scrape on page load finds neither and reads exactly like "the feature did not ship".
 */
import { browser, login, recorder, BASE } from "./live/harness.mjs";

const r = recorder("E-110 · G1 on the live console");
const { b, ctx } = await browser({ viewport: { width: 1440, height: 1300 } });
const page = await ctx.newPage();
try {
  await login(page, "trading");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);

  const addChain = page.getByRole("button", { name: /add chain/i }).first();
  r.check("the Add-chain form is reachable as this officer", (await addChain.count()) > 0);
  await addChain.click({ timeout: 10_000 });
  await page.waitForTimeout(2500);

  /** Open every Select in turn and collect the option rows it reveals. */
  const openAndRead = async () => {
    const out = [];
    const triggers = page.locator('button[aria-haspopup="listbox"], [role="combobox"]');
    const n = await triggers.count();
    for (let i = 0; i < n; i++) {
      await triggers.nth(i).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const opts = await page.locator('[role="option"]').allInnerTexts().catch(() => []);
      out.push(...opts.map((t) => t.replace(/\s+/g, " ").trim()));
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(250);
    }
    return out;
  };

  let rows = await openAndRead();
  r.check("the form exposes option lists to read", rows.length > 0, `${rows.length} options`);

  // Readiness is a property of the SYMBOL, so pick GOLD and re-read.
  const assetSel = page.locator('button[aria-haspopup="listbox"]').first();
  await assetSel.click().catch(() => {});
  await page.waitForTimeout(500);
  const gold = page.locator('[role="option"]').filter({ hasText: /gold|XAU/i }).first();
  const pickedGold = (await gold.count()) > 0;
  if (pickedGold) { await gold.click(); await page.waitForTimeout(1500); }
  r.check("gold is selectable in the Add-chain form", pickedGold);
  rows = rows.concat(await openAndRead());

  const quiet = rows.filter((t) => /quietest tenth/i.test(t));
  r.check("⭐ the operator is shown the movement verdict", quiet.length > 0, `${quiet.length} rows`);
  for (const q of quiet.slice(0, 2)) r.note(q.slice(0, 210));
  // ⛔ NOT a bare "BTC is absent" — that passes when NOTHING rendered, which is the vacuous
  // shape this campaign keeps paying for. Assert the gold verdict positively FIRST, and make
  // the discrimination check conditional on at least one verdict existing.
  r.check("…and it is GOLD that carries it", quiet.some((q) => /XAU/.test(q)), quiet[0]?.slice(0, 150) ?? "(none)");
  r.check("…naming the window and the sample count, not a bare adjective",
    quiet.some((q) => /minutes/.test(q) && /samples/.test(q)));
  r.check("…and Bitcoin does NOT carry one — a warning on everything is a warning on nothing",
    quiet.length > 0 && !quiet.some((q) => /BTC/.test(q)));
  await page.screenshot({ path: `${process.env.SHOT_DIR ?? ".qa-s32"}/e110-console.png` });
} catch (e) {
  console.error(`\n🔴 ${e.message}\n`);
}
const failed = r.done();
await b.close();
process.exit(failed === 0 ? 0 : 1);
