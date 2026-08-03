/**
 * LIVE verification of E-47b — drive a REAL AI proposal on production and prove the price
 * came from the platform's feed, not from the model.
 *
 *   node scripts/live-proposal-check.mjs [ASSET_KEY]
 *
 * ⚠️ THIS SPENDS REAL AI CREDIT (~$0.10) and writes a real `UpDownProposal` row. It does NOT
 * approve or arm anything, so no chain starts and no money moves. The row is left in the queue
 * on purpose — it is the evidence.
 *
 * WHY A LIVE RUN AND NOT JUST THE SUITE. `npm run test:updown-proposal` runs against the MOCK
 * AI provider and the MOCK price feed. It can prove the wiring; it cannot prove that the real
 * Claude call still returns a usable framing once `web_fetch` and three schema fields were
 * removed, nor that the real Twelve Data read satisfies the staleness gate at proposal time.
 * Before this change the live answer was 0 approvable out of 12 — that number only ever came
 * from production, and so must this one.
 */
import { BASE, SHOT, browser, login, bodyText, shot, clickByName } from "./live/harness.mjs";

const assetKey = process.argv[2] ?? "BTC";
const { b, ctx } = await browser();
const page = await ctx.newPage();
const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

try {
  console.log(`\nLIVE E-47b proposal check · asset ${assetKey} · ${BASE}\n`);

  // TRADING owns Up & Down. ⛔ Not ADMIN — ADMIN bypasses every domain check.
  await login(page, "trading");
  await page.goto(`${BASE}/admin/updown/proposals`, { waitUntil: "domcontentloaded" });
  const rendered = await page
    .waitForFunction(() => /Ask the AI to propose|AI generation is off/i.test(document.body.innerText), null, { timeout: 45_000 })
    .then(() => true).catch(() => false);
  ok("the proposals console rendered", rendered, "never showed the generate control");

  const before = await bodyText(page);
  // ⭐ The copy is part of the fix: the console must no longer claim the AI reads the price.
  ok("the console says the PLATFORM reads the price", /the platform reads/i.test(before),
    "the generate form still describes the AI fetching a page");
  ok("…and no longer says 'source the ai read'", !/source the ai read/i.test(before));

  if (/AI generation is off/i.test(before)) {
    throw new Error("AI generation is switched off in the AI toolkit — turn it on to verify E-47b.");
  }

  // Pick the asset. ⚠️ `components/ui/select.tsx` is the KIT dropdown, NOT a native <select>:
  // it renders `role="combobox"` over a `role="listbox"` of `role="option"` BUTTONS. The first
  // version of this did `.locator("option").allTextContents()`, got an empty array, and
  // reported "BTC is available to propose on — options: " as a failure on a page that offers
  // seven assets. `selectOption()` would not have worked either. Open it and click the option.
  const combo = page.getByRole("combobox", { name: "Asset to propose a chain for" });
  await combo.click();
  const option = page.getByRole("option", { name: new RegExp(`^${assetKey}\\b`, "i") }).first();
  const found = await option.isVisible().catch(() => false);
  const offered = await page.getByRole("option").allTextContents().catch(() => []);
  ok(`${assetKey} is available to propose on`, found, `options offered: ${offered.join(" | ")}`);
  if (found) await option.click();
  else await page.keyboard.press("Escape");

  await shot(page, "e47b-before");
  console.log(`    generating — this takes ~30s and spends real credit…`);
  await clickByName(page, /ask the ai to propose/i);

  // 🔴🔴 READ THIS BEFORE CHANGING THE WAIT. The first version of this scanned the WHOLE page
  // for `/No AI credit was spent|cannot be read right now/` and returned "feed_refused" — on
  // its very first poll, before the generation had even finished. That sentence is the ADVICE
  // TEXT rendered against the twelve historical FILTERED rows already in the queue. So the run
  // reported a working feature as broken, and the screenshot it saved was of the still-open
  // "Asking the AI to propose a chain" overlay. The database said PENDING_REVIEW with a real
  // 62,702.00 price. Harness lied; product was right. Again.
  //
  // The fix is to wait for the OVERLAY TO CLOSE — the one signal that belongs to THIS
  // generation and cannot be satisfied by another row's text — and then to let the DATABASE
  // decide the outcome. A page-wide regex cannot distinguish "my row says X" from "some row
  // says X", so it must not be asked to.
  const finished = await page
    .waitForFunction(() => !/Asking the AI to propose a chain/i.test(document.body.innerText),
      null, { timeout: 180_000 })
    .then(() => true).catch(() => false);
  ok("the generation finished (the overlay closed)", finished,
    "still generating after 3 minutes — check /admin/ai-usage");

  await shot(page, "e47b-after");
  const after = await bodyText(page);

  // ⛔ NOT ASSERTED FROM THE DOM. Whether THIS proposal is approvable is a fact about one row,
  // and the queue shows dozens. Verify it with:
  //   railway run -s 50pick -- node scripts/live/q.cjs <sql>   (newest UpDownProposal row)
  // and check state=PENDING_REVIEW, observedPrice non-null, filterReasons empty, costUsd small.
  console.log(`    ⓘ the DOM cannot tell you which row is yours — confirm the newest`);
  console.log(`      UpDownProposal row in the DB: state, observedPrice, filterReasons, costUsd.`);
  ok("the queue states what the FEED returned, not what the AI read",
    /what the feed returned/i.test(after) || /source the platform read/i.test(after),
    "the reworded columns are not on the page");

  console.log(`\n    shots → ${SHOT}/e47b-before.png · ${SHOT}/e47b-after.png`);
  console.log(`    ⚠️ a real proposal row now exists in the queue. It is NOT approved or armed.`);
} catch (e) {
  fails.push(`threw — ${e.message}`);
  console.log(`  FAIL threw — ${e.message}`);
  await shot(page, "e47b-threw");
} finally {
  await b.close();
}

console.log(`\n${fails.length === 0 ? "PASS" : `${fails.length} FAILED`}\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
