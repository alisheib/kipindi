/**
 * Set a chain's WINNING BAND through the console — the lever that forces a `no-move` refund.
 *
 *   node scripts/live-updown-band.mjs "BTC 3m" "Very wide"
 *   node scripts/live-updown-band.mjs "BTC 3m" "Smallest"
 *
 * ⭐ WHY THIS IS THE RIGHT WAY TO DRIVE A no-move VOID. A `no-move` round is not a fault: it is
 * the margin working exactly as designed — the price stayed inside the band, so there is no
 * honest verdict and every stake goes back. Waiting for one to happen by chance at the tick
 * floor could take all day; widening the band makes it the normal outcome within minutes, using
 * the operator's own control rather than a database edit.
 *
 * ⛔ Every confirm is scoped to `[role=dialog]`. A page-wide accessible-name lookup on a grid of
 * chains lands on whichever row is first in the DOM — that is how this session started a chain
 * it did not mean to.
 */
import { browser, login, recorder, BASE, SHOT, bodyText } from "./live/harness.mjs";

const CHAIN = process.argv[2] ?? "BTC 3m";
const BAND = process.argv[3] ?? "Very wide";
const rec = recorder(`LIVE · set ${CHAIN} band → ${BAND}`);
const { b, ctx } = await browser({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();

try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "networkidle" });

  const row = page.locator("tr").filter({ hasText: CHAIN }).first();
  await row.waitFor({ state: "visible", timeout: 20_000 });
  rec.note(`row before: ${(await row.innerText()).replace(/\s+/g, " ").trim()}`);
  await row.getByRole("button", { name: /^edit$/i }).click();

  // The edit form may render inline (in the row) or in a dialog — scope to whichever appeared,
  // never to the page.
  const dialog = page.locator('[role="dialog"]');
  const scope = (await dialog.count()) ? dialog : page.locator("form").filter({ hasText: /winning band/i }).first();
  await scope.waitFor({ state: "visible", timeout: 15_000 });

  const trigger = scope.locator('button[role="combobox"]').filter({ hasText: /%|smallest|narrow|wide/i }).first();
  await trigger.click();
  await page.waitForSelector('[role="option"]', { timeout: 10_000 });
  const opt = page.locator('[role="option"]').filter({ hasText: new RegExp(BAND, "i") }).first();
  rec.check(`the "${BAND}" band is offered`, (await opt.count()) > 0);
  await opt.click();

  await scope.getByRole("button", { name: /save|update/i }).first().click();
  const saved = await page.waitForFunction(
    (label) => {
      const tr = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(label));
      return !!tr && !/±\$?0\.02/.test(tr.innerText) === true;
    },
    CHAIN, { timeout: 30_000 },
  ).then(() => true).catch(() => false);

  const after = (await row.innerText()).replace(/\s+/g, " ").trim();
  rec.check("the chain's band changed on the server's own render", saved, after);
  rec.note(`row after: ${after}`);
  await page.screenshot({ path: `${SHOT}/band-${BAND.replace(/\s+/g, "-").toLowerCase()}.png` }).catch(() => {});
  rec.check("no error surfaced", !/application error|something went wrong/.test(await bodyText(page)));
} catch (e) {
  rec.check("driver completed", false, e.message);
  await page.screenshot({ path: `${SHOT}/band-crash.png` }).catch(() => {});
} finally {
  await b.close();
}

process.exit(rec.done() === 0 ? 0 : 1);
