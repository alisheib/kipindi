/**
 * VOID one market from the resolver queue, on LIVE PRODUCTION, as the TRADING officer.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-void-market.mjs <marketId> <title-substring>
 *
 * ⚠️ THIS MOVES REAL PLAYERS' MONEY. Authorised by Ali 2026-08-03 for exactly two markets:
 *   · mkt_9a131d19337d5c09b7a7 — the EWURA petrol cap. Its criterion resolves on a notice
 *     EWURA publishes "on or around August 6"; its resolutionAt was 1 Aug. The market was
 *     created to resolve five days BEFORE its own source could exist, so there is no honest
 *     YES or NO to give — verified against ewura.go.tz, which still shows July 2026 as the
 *     latest notice.
 *   · mkt_8c885478d7361c79bdf3 — the Dar rainfall poll. Its criterion names AccuWeather
 *     station 317663, which cannot be read at all (server fetch times out; real Chromium
 *     gets ERR_HTTP2_PROTOCOL_ERROR), and the two readable substitutes give OPPOSITE
 *     answers: the Julius Nyerere airport station recorded 0.0 in on both days, while the
 *     Open-Meteo reanalysis shows 0.20 mm and 0.70 mm against a 0.1 mm threshold.
 * In both cases a VOID returns every stake untouched. A YES or NO would be a guess wearing
 * the clothes of a settlement.
 *
 * ⛔ THE CLICK IS SCOPED TO THE CARD, NEVER TO THE PAGE. The queue renders one card per
 * market and EVERY card carries a button named "Void". `getByRole("button", {name: /void/})`
 * matches all of them, and `.first()` would silently void whichever market happens to sort
 * first — a page-wide selector cannot tell "my card's button" from "some card's button",
 * which is the same class of mistake as a page-wide regex reading another row's money.
 * So: find the button whose OWN enclosing card names this market, and refuse if the number
 * of matches is anything other than one.
 */
import { BASE, SHOT, browser, login, bodyText, shot, clickByName } from "./live/harness.mjs";

const marketId = process.argv[2];
const titleNeedle = process.argv[3];
if (!marketId || !titleNeedle) {
  console.error("usage: node scripts/live-void-market.mjs <marketId> <title-substring>");
  process.exit(2);
}

const { b, ctx } = await browser();
const page = await ctx.newPage();
let failed = null;

try {
  await login(page, "trading");
  await page.goto(`${BASE}/admin/resolver-queue`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /resolver queue/i.test(document.body.innerText), null, { timeout: 45_000 });
  await page.waitForTimeout(1500);

  await shot(page, `void-${marketId}-1-queue-before`);

  // ── Find MY card's Void button ────────────────────────────────────────────────
  const voids = page.getByRole("button", { name: /^void$/i });
  const total = await voids.count();
  console.log(`\n${total} "Void" button(s) on the queue — finding the one whose card names ${marketId}`);

  const mine = [];
  for (let i = 0; i < total; i++) {
    // Walk up until the ancestor is big enough to BE the card (it will contain the title).
    const cardText = await voids.nth(i).evaluate((el) => {
      let p = el.parentElement;
      for (let k = 0; k < 10 && p; k++) {
        if ((p.innerText || "").length > 300) return p.innerText;
        p = p.parentElement;
      }
      return p?.innerText ?? "";
    });
    if (cardText.toLowerCase().includes(titleNeedle.toLowerCase())) mine.push(i);
  }

  if (mine.length !== 1) {
    throw new Error(
      `expected exactly 1 card matching "${titleNeedle}", found ${mine.length}. ` +
      `Refusing to click — a wrong click here voids a different market's money.`,
    );
  }
  console.log(`  matched card index ${mine[0]} — clicking its Void`);

  await voids.nth(mine[0]).click();
  await page.waitForTimeout(1500);
  await shot(page, `void-${marketId}-2-confirm`);

  // A money action should ask. Photograph whatever it asks, then confirm it.
  const afterClick = await bodyText(page);
  console.log(`\n--- after clicking Void ---\n${afterClick.slice(0, 1500)}\n`);

  // 🔴 CONFIRM INSIDE THE DIALOG, NEVER ON THE PAGE. The first version of this asked the
  // PAGE for /^(confirm|void|…|resolve)/ and matched **"Resolve YES"** — a button on the
  // card BEHIND the modal, belonging to the OTHER market. It tried to click it for 30s and
  // only the modal's own scrim stopped it; without that scrim this script would have
  // resolved the EWURA poll YES and moved TZS 59,450 the wrong way. The card's Void button
  // was carefully scoped and the confirm button was not, which is the whole lesson: a
  // page-wide selector cannot tell "the control I opened" from "a control that is there".
  const dialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ visible: true }).first();
  if (!(await dialog.count())) {
    throw new Error("no confirmation dialog appeared — refusing to hunt for a confirm button on the page");
  }
  // And prove the dialog is about VOIDING before confirming it.
  const dlgLabel = (await dialog.getAttribute("aria-label").catch(() => "")) ?? "";
  const dlgText = (await dialog.innerText().catch(() => "")) ?? "";
  console.log(`  dialog aria-label="${dlgLabel}"`);
  if (!/void/i.test(`${dlgLabel} ${dlgText}`)) {
    throw new Error(`the open dialog is not a void confirmation (label="${dlgLabel}") — refusing`);
  }

  const confirm = dialog.getByRole("button", { name: /void|confirm|seal/i }).first();
  const label = (await confirm.innerText().catch(() => "")).trim();
  console.log(`  confirming inside the dialog with "${label}"`);
  await confirm.click();
  await page.waitForTimeout(3000);

  await page.waitForTimeout(2000);
  await shot(page, `void-${marketId}-3-after`);
  const after = await bodyText(page);
  console.log(`\n--- queue after ---\n${after.slice(0, 1800)}\n`);

  // Read the market's own page back — the queue is a list, the market is the fact.
  await page.goto(`${BASE}/admin/markets/${marketId}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /tzs|market predictors/i.test(document.body.innerText), null, { timeout: 45_000 });
  await page.waitForTimeout(1500);
  await shot(page, `void-${marketId}-4-market-page`);
  const mkt = await bodyText(page);
  console.log(`--- market page after ---\n${mkt.slice(0, 2200)}\n`);
  console.log(`voided=${/voided|void/i.test(mkt)}`);
} catch (e) {
  failed = e.message;
  console.log(`FAILED — ${e.message}`);
  await shot(page, `void-${marketId}-FAILED`);
} finally {
  await b.close();
}

console.log(`\nshots in ${SHOT}`);
process.exit(failed ? 1 : 0);
