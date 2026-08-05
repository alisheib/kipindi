/**
 * E-64 DRIVEN LIVE ON PRODUCTION — a real stake, real money, and a photograph of the toast.
 *
 *   node scripts/live-s30-bet-toast.mjs [fleetNN] [stake] [locale]
 *   SHOT_DIR=.qa-s30/e64 node scripts/live-s30-bet-toast.mjs 07 1000 en
 *
 * ⛔ THE BOARD, WITH NO QUERY STRING. Ali reported this on `/updown` itself, and the campaign's
 * own trap list records that landing WITH a query string hid a bug for a whole campaign. So this
 * driver navigates to the bare board and bets from the card, which is the exact surface and the
 * exact gesture the report describes — not the round page, which is a different component.
 *
 * ⚠️ THE SHOT MUST LAND INSIDE A 3-SECOND WINDOW. `durationMs: 3000` is part of the fix, so a
 * probe that clicks and then waits `networkidle` (which never fires here — the board polls) or
 * sleeps 5s photographs an EMPTY screen and reports the fix as absent. Three shots are taken at
 * 700ms / 1400ms / 2600ms, and the assertion is made on the DOM at the same instants rather than
 * on the pictures, so the evidence and the claim cannot drift apart.
 *
 * ⛔ AND THE CLAIM IS PAIRED WITH THE DATABASE. A toast saying "Bet placed" over a bet that did
 * not place is a worse defect than the silence it replaced, so this prints the position id and
 * the wallet delta it expects; `s30-verify-bet.mts` reads them back from the DB.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, SHOT, login, browser, bodyText, recorder } from "./live/harness.mjs";

const [NN = "07", STAKE_ARG = "1000", LOCALE = "en", ROUND = ""] = process.argv.slice(2);
const STAKE = Number(STAKE_ARG);
/**
 * ⚠️ WHY A ROUND ID IS ACCEPTED AT ALL, when the bare board is the surface Ali reported.
 * The board is shared with a SECOND OPERATOR whose two 15-minute BTC/XAU chains are RUNNING,
 * and `getBoard` picks the active asset+duration by itself — so on a board carrying both a BTC
 * 5m (ours) and a BTC 15m (his), the bare `/updown` may well serve HIS round, and betting on it
 * would put our money into another operator's round. Passing OUR round id targets
 * `/updown/<id>`, whose bet box uses the SAME shared `useUpDownQuickBet` hook, so the fix under
 * test is identical. ⛔ Prefer the bare board whenever the board is ours alone.
 */
const TARGET = ROUND ? `${BASE}/updown/${ROUND}` : `${BASE}/updown`;
mkdirSync(`${SHOT}`, { recursive: true });

const rec = recorder(`E-64 · a real stake as fleet:${NN}, and the toast that must follow (${LOCALE})`);

// Accessible names, all three locales — the side buttons carry `Up — …· TZS n,nnn`.
const UP = /^(Up|Juu|涨)\s*[—-]/;
const CUSTOM = /^(Custom|Maalum|自定义)$/;
const CUSTOM_AMOUNT = /custom stake amount|kiasi maalum cha dau|自定义投注额/i;
// The toast title is the `udBetPlaced` token in en / sw / zh.
const PLACED = /bet placed|dau limewekwa|已下注/i;

const { b } = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); // a real phone, which is where Ali saw it
const page = await ctx.newPage();
const out = { stake: STAKE, nn: NN, locale: LOCALE, shots: [], toastSeen: {}, before: null, after: null };

try {
  await login(page, `fleet:${NN}`);
  await page.goto(`${BASE}/api/locale?set=${LOCALE}&next=/`, { waitUntil: "domcontentloaded" }).catch(() => {});

  // ── The wallet BEFORE, read off the platform's own surface ──
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  out.before = (await bodyText(page)).match(/tzs\s[\d,]+/)?.[0] ?? "(not read)";
  rec.note(`wallet before: ${out.before}`);

  // ── The board, BARE. No ?asset=, no ?duration= — unless a round id pinned us (see TARGET). ──
  rec.note(`target: ${TARGET}`);
  await page.goto(TARGET, { waitUntil: "domcontentloaded" });
  // A price with real decimals is the positive signal that a card has RENDERED. Skeletons carry
  // no digits, and `networkidle` never fires because the board polls.
  const rendered = await page.waitForFunction(
    () => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText), undefined, { timeout: 60_000 },
  ).then(() => true).catch(() => false);
  rec.check("1.1 a live Up & Down card rendered on the bare /updown board", rendered);
  await page.screenshot({ path: `${SHOT}/e64-1-board-before.png` });
  out.shots.push(`${SHOT}/e64-1-board-before.png`);

  if (!rendered) throw new Error("no card rendered — is a round open? generate one on udc_2ba58e2e2c13a7f8");

  // ── Arm the exact amount ──
  await page.getByRole("radio", { name: CUSTOM }).first().click();
  const field = page.getByLabel(CUSTOM_AMOUNT).first();
  await field.waitFor({ state: "visible", timeout: 15_000 });
  await field.fill(String(STAKE));

  const btn = page.getByRole("button", { name: UP }).first();
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  // ⛔ ASSERT THE CONTROL CARRIES THE AMOUNT BEFORE PRESSING IT. Clicking a control that is not
  // armed and then reporting "placed" is how a run measures nothing and photographs like success.
  const label = (await btn.getAttribute("aria-label")) ?? "";
  const armed = new RegExp(STAKE.toLocaleString("en-US")).test(label);
  rec.check("1.2 the UP control carries the stake before it is pressed", armed, label.slice(0, 90));
  if (!armed) throw new Error(`UP control not armed with ${STAKE}: "${label}"`);

  // ⭐ THE CONTROL, AND IT IS NOT CEREMONY. Every check below asks "is the toast there?" — so
  // before pressing anything, prove the same selector says NO. Without this the suite cannot
  // distinguish a working toast from a selector that matches something permanent, which is
  // exactly the failure this driver already shipped once (see the scoping note below).
  const before = await page.locator('[role="region"]').filter({ hasText: PLACED }).count();
  rec.check("1.3 ⭐ CONTROL — no 'bet placed' toast exists BEFORE the tap", before === 0, `${before} found`);

  // ── THE MOMENT ──
  await btn.click();

  // ⛔⛔ SCOPED TO THE TOAST REGION, AND THE FIRST VERSION OF THIS BLOCK WAS NOT — it asked
  // `bodyText(page)` whether the page mentioned "bet placed". It always does: `setLiveMessage`
  // writes `Bet placed · Up · TZS 1,000` into an `aria-live` node that NEVER LEAVES THE DOM.
  // So all three of these checks, plus §3.1 and §3.2, would have passed over a page with NO
  // TOAST AT ALL — six checks that could not fail, in the very run proving a toast exists — and
  // §3.4 then "failed" because that permanent line never disappears, reporting a defect the
  // product does not have. Measured: with no bet placed, `[role=region]` filtered on the toast
  // copy returns 0 while the aria-live node is present (`.qa-s30/probe-crowd.mjs`).
  // The picture is what proved the toast. The suite beside it proved nothing.
  const toast = () => page.locator('[role="region"]').filter({ hasText: PLACED });
  for (const ms of [700, 1400, 2600]) {
    await page.waitForTimeout(700);
    const seen = (await toast().count()) > 0;
    out.toastSeen[ms] = seen;
    const p = `${SHOT}/e64-2-toast-${ms}ms.png`;
    await page.screenshot({ path: p });          // ⛔ VIEWPORT — never fullPage
    out.shots.push(p);
    rec.check(`2.${ms} · the "bet placed" TOAST (not the aria-live line) is on screen at ~${ms}ms`, seen);
  }

  // The toast region itself, cropped — so the picture shows the component and not the page.
  const region = page.locator('[role="region"]').filter({ hasText: PLACED }).first();
  if (await region.count()) {
    const p = `${SHOT}/e64-3-toast-cropped.png`;
    await region.screenshot({ path: p }).catch(() => {});
    out.shots.push(p);
    rec.note(`cropped toast → ${p}`);
  }

  // ── It must SAY the two things that make it useful — read off the TOAST, not off the page ──
  const toastText = (await toast().count())
    ? (await toast().first().innerText()).replace(/\s+/g, " ").toLowerCase()
    : "";
  rec.note(`toast text: "${toastText}"`);
  rec.check("3.0 the toast is still present to be read", toastText.length > 0);
  rec.check("3.1 the toast names the SIDE", /\b(up|juu|涨)\b/.test(toastText), toastText);
  rec.check("3.2 the toast names the AMOUNT", toastText.includes(STAKE.toLocaleString("en-US")),
    `looking for ${STAKE.toLocaleString("en-US")} in "${toastText}"`);
  // 'You're in' is a CARD chip, not the toast, so this one is legitimately page-scoped.
  rec.check("3.3 …and the position registered — the card's 'you're in' chip appeared",
    /you're in|uko ndani|已下注/i.test(await bodyText(page)));

  // ── And it must GO AWAY. A placement toast that outlives the next tap is the pile-up that
  // removed it in the first place, so the 3s duration is asserted, not assumed. ──
  await page.waitForTimeout(3200);
  const gone = (await toast().count()) === 0;
  rec.check("3.4 the toast has cleared itself by ~6s (durationMs 3000 + exit)", gone,
    gone ? "" : "still present — if this fails, check it is the TOAST and not the aria-live line");
  await page.screenshot({ path: `${SHOT}/e64-4-after-toast-cleared.png` });
  out.shots.push(`${SHOT}/e64-4-after-toast-cleared.png`);

  // ── The wallet AFTER — the money half of the claim ──
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  out.after = (await bodyText(page)).match(/tzs\s[\d,]+/)?.[0] ?? "(not read)";
  rec.note(`wallet after:  ${out.after}   (expect it lower by ${STAKE.toLocaleString("en-US")})`);
} finally {
  writeFileSync(`${SHOT}/e64-run.json`, JSON.stringify(out, null, 1));
  await b.close();
}

const failed = rec.done();
console.log(`\nshots → ${out.shots.join("\n         ")}`);
console.log(`\n⛔ NOW PAIR IT WITH THE DATABASE — a toast is not proof money moved:`);
console.log(`   railway run --service 50pick -- npx tsx scripts/s30-verify-bet.mts ${NN} ${STAKE}\n`);
process.exit(failed ? 1 : 0);
