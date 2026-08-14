#!/usr/bin/env node
/**
 * B / B1b / B2 — THE BONUS RULES, EXERCISED IN A REAL WALLET ON PRODUCTION.
 *
 *   node scripts/live-bonus-live-proof.mjs grant             # GROWTH officer issues a grant
 *   MKT=mkt_x node scripts/live-bonus-live-proof.mjs warn    # the B2 warning, 4 widths x 3 languages
 *   MKT=mkt_x node scripts/live-bonus-live-proof.mjs hedge   # take the other side; turnover must NOT move
 *   MKT=mkt_x node scripts/live-bonus-live-proof.mjs cancel  # free cancellation takes its credit back
 *
 * ⭐ WHY THIS EXISTS. `docs/RULES.md` §2.4 and §2.5 have carried a ⏳ for exactly one reason:
 * **production has ZERO bonus grants**, so nothing has ever exercised them in a wallet.
 * `npm run test:bonus-one-side` proves all of it on the real service path — and a suite is not
 * production. Ali authorised granting a bonus to a QA-fleet player (§0, 2026-08-14).
 *
 * ⛔ THE DOM IS NOT THE PROOF. Every turnover claim is read off the GRANT ROW by
 * `scripts/live/ops/bonus-census.cjs`, never from a number this page rendered. A rule about
 * turnover checked against the thing that renders turnover proves only self-consistency.
 *
 * ⚠️ THE GRANT IS ISSUED BY THE **GROWTH** OFFICER, not by ADMIN and not "on Ali's behalf".
 * `grantBonusToPlayerAction` calls `requireStaff("growth")`, so growth is the role that owns
 * this; ADMIN bypasses every domain check and would prove nothing about the real path. The
 * note records that it is QA money so the ledger can be read honestly later.
 */
import { BASE, SHOT, browser, login, bodyText, clickByName, shot, recorder, measureClipping, describeClipping } from "./live/harness.mjs";

const CMD = process.argv[2] ?? "grant";
const MKT = process.env.MKT ?? "";
const PLAYER = process.env.PLAYER ?? "01";          // fleet:01
const PLAYER_PHONE = `7990000${PLAYER}`;            // 9-digit local part
const AMOUNT = Number(process.env.AMOUNT ?? 10_000);
const MULT = Number(process.env.MULT ?? 5);
const FIRST = Number(process.env.FIRST ?? 3_000);   // the side that SHOULD accrue
const SECOND = Number(process.env.SECOND ?? 2_000); // the hedge, which must NOT
const WIDTHS = [360, 768, 1024, 1440];
const LOCALES = ["en", "sw", "zh"];

const rec = recorder(`LIVE BONUS · ${CMD}`);

// ── grant ────────────────────────────────────────────────────────────────────
async function grant() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  page.on("response", async (r) => {
    if (r.request().method() === "POST") console.log(`  [POST ${r.status()}] ${r.url().slice(0, 80)}`);
  });
  try {
    await login(page, "growth");                     // ⚠️ the role that owns the domain
    await page.goto(`${BASE}/admin/bonuses`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });

    await page.locator('input[aria-label="Player phone"]').first().fill(PLAYER_PHONE);
    // The NumFields carry their label; fill by position within the grant form.
    const nums = page.locator('form input[inputmode="numeric"], input[inputmode="numeric"]');
    await nums.nth(0).fill(String(AMOUNT));          // Amount
    await nums.nth(1).fill(String(MULT));            // Multiplier
    await page.locator('input[aria-label="Note (optional)"]').first()
      .fill("QA session-3 live proof of RULES.md 2.4/2.5 - QA fleet money");
    await page.waitForTimeout(400);
    await shot(page, "bonus-grant-form");

    // ⚠️ THE EXACT CONTROL, AND ITS EFFECT WATCHED ON THE WIRE. The first attempt used the
    // page-wide `clickByName` helper, no POST was ever issued, and the run still reported
    // success — see the assertion note below.
    const btn = page.getByRole("button", { name: /^Grant bonus$/i }).first();
    await btn.waitFor({ state: "visible", timeout: 30_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 30_000 });

    // ⛔ "GRANT BONUS" ONLY OPENS A CONFIRM DIALOG — it does not issue anything, and that is
    // deliberate: the code's own comment says a manual grant creates real bonus liability the
    // player must play through, so it must not issue on a single stray click. Two runs clicked
    // it, sent NO POST at all, and still reported success because the assertion was vacuous.
    // ⚠️ Scoped to the dialog: `clickByName` is page-wide and takes `.first()`.
    await page.waitForTimeout(800);
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    await dlg.waitFor({ state: "visible", timeout: 15_000 });
    await shot(page, "bonus-grant-confirm");
    await dlg.getByRole("button", { name: /yes, grant/i }).first().click({ timeout: 20_000 });
    // ⚠️ The result is a TOAST and it auto-dismisses. Poll from the instant of the click.
    for (let i = 0; i < 40; i++) {
      const msg = await page.evaluate(() => {
        for (const el of document.querySelectorAll('div[role="region"], [role="alert"], [role="status"]')) {
          const s = (el.innerText || "").replace(/\s+/g, " ").trim();
          if (s) return s;
        }
        return "";
      });
      if (msg) { console.log(`  toast: "${msg}"`); await shot(page, "bonus-grant-toast"); break; }
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2_500);
    const txt = await bodyText(page);
    // 🔴 THE FIRST VERSION OF THIS CHECK WAS VACUOUS AND PASSED OVER A GRANT THAT DID NOT
    // EXIST. It accepted `/outstanding bonus/`, which is a KPI LABEL printed on the page
    // whether or not a single bonus has ever been issued — so it reported "ok, the console
    // shows the grant" while the database held zero grants and no POST had been sent.
    // Ask of every check: would this still pass if the feature were absent? That one did.
    // ⛔ The ledger's EMPTY STATE is the honest signal: "No bonuses granted yet" must be gone.
    rec.check("the grant ledger is no longer empty — the row exists, not just the label",
              !/no bonuses granted yet/i.test(txt), txt.slice(0, 200));
    await shot(page, "bonus-grant-after");
    console.log(`\n  ⛔ Now read the ROW, not this page:\n     KP_REPO=F:/kipindi-main node scripts/live/ops/bonus-census.cjs ${PLAYER}\n`);
  } finally { await ctx.close(); await b.close(); }
}

/** Pick a side and stake it. Returns the receipt text. */
async function placeBet(page, side, stake) {
  // ⛔ NAVIGATE TO THE SIDE, DO NOT CLICK FOR IT. The selected side is a SEARCH PARAM
  // (`hedgeOpposite` is computed server-side from it), so `?side=NO` is the same journey the
  // button produces and it cannot race a client transition. Clicking `Back NO at 62%` and
  // waiting a second for the panel timed out on a page that was working — measured with
  // `scripts/live/probe-poll-card.mjs SIDE=NO`, which found the stake box present and named.
  await page.goto(`${BASE}/markets/${MKT}?side=${side}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main", { timeout: 45_000 });
  await page.waitForTimeout(1_200);
  // ⚠️ BY ITS ARIA LABEL. There are TWO numeric inputs in this panel — stake and the
  // conviction multiplier — and `.first()` on a bare `inputmode` selector is a coin toss
  // between them. The multiplier is `inputmode="decimal"`; the stake names itself.
  const box = page.locator('input[aria-label*="Stake amount" i]').first();
  await box.waitFor({ timeout: 30_000 });
  // ⛔ Select-all and type — `fill` races the masked input's default and produced "1000100" once.
  await box.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.waitForTimeout(200);
  await page.keyboard.type(String(stake), { delay: 30 });
  await page.waitForTimeout(500);
  const typed = (await box.inputValue()).replace(/[^\d]/g, "");
  if (typed !== String(stake)) throw new Error(`stake box reads "${typed}", expected ${stake}`);
  await page.getByRole("button", { name: new RegExp(`Place ${side}`, "i") }).first().click({ timeout: 20_000 });
  await page.waitForTimeout(1_200);
  await page.locator('[role="dialog"], [role="alertdialog"]').locator("button")
    .filter({ hasText: /^(Confirm|Place)/i }).last().click({ timeout: 20_000 });
  await page.waitForTimeout(4_000);
  return await bodyText(page);
}

// ── warn: the B2 warning, at four widths and in three languages ──────────────
// ⭐ THE POINT OF THE WARNING is that a player CANNOT SEE the rule happening: the bet
// succeeds, the money moves, and their wagering counter simply does not advance. So it must
// be legible before they confirm, in their own language, at the width they hold the phone at.
async function warn() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    let found = 0, missing = [];
    for (const loc of LOCALES) {
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: w < 500 ? 900 : 1000 });
        // ⛔ `?side=NO` IS LOAD-BEARING, AND THE FIRST RUN OF THIS PROBE MISSED IT — reporting
        // all twelve cells as "NOT SHOWN" on a feature that was working. `hedgeOpposite` is
        // computed server-side from the SELECTED side against the sides already held:
        //     (side === "NO" && heldSides.has("YES"))
        // and `side` arrives as a search param. Loading the bare market page selects nothing,
        // so the player is not yet taking the other side and there is correctly nothing to warn
        // about. Ask "is this the product, or my list?" before filing.
        await page.goto(`${BASE}/markets/${MKT}?side=NO`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("main", { timeout: 45_000 });
        await page.waitForTimeout(1_200);
        const txt = await bodyText(page);           // ⚠️ lowercased; CSS-uppercase would lie
        // The reason is `bonus_wagering_one_side`; match on a distinctive fragment of each
        // language's copy rather than the whole sentence, which wraps.
        const hit = loc === "sw" ? /halitahesabiwa kwenye bonasi/i
                  : loc === "zh" ? /不计入您的奖金要求/
                  : /won.?t count toward your bonus/i;
        const ok = hit.test(txt);
        if (ok) found++; else missing.push(`${loc}@${w}`);
        await shot(page, `bonus-warn-${loc}-${w}`);
        // ⛔ And it must FIT. Clipping inside a card never reaches document.scrollWidth.
        // ⚠️ `measureClipping` and not a hand-rolled `scrollWidth > clientWidth`: the naive
        // version reported four screen-reader-only nodes as clipped in all twelve cells here.
        const clipped = await measureClipping(page);
        rec.check(`${loc} @ ${w}px · warning present and unclipped`, ok && clipped.length === 0,
                  `${ok ? "" : "NOT SHOWN "}${describeClipping(clipped)}`);
      }
    }
    rec.check(`the warning appears in all ${LOCALES.length * WIDTHS.length} language x width cells`,
              found === LOCALES.length * WIDTHS.length, missing.join(", "));
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  } finally { await ctx.close(); await b.close(); }
}

// ── first / hedge / cancel ───────────────────────────────────────────────────
async function first() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/markets/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    const txt = await placeBet(page, "YES", FIRST);
    rec.check(`first side accepted (YES ${FIRST})`, /placed|imewekwa|已下注|receipt/i.test(txt));
    await shot(page, "bonus-first-side");
  } finally { await ctx.close(); await b.close(); }
}

async function hedge() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/markets/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    const txt = await placeBet(page, "NO", SECOND);
    // ⛔ B / RULES.md §2.4 — the hedge is PERMITTED. The old refusal is gone; this must succeed.
    rec.check(`the hedge is ACCEPTED (NO ${SECOND}) — §2.4, unlimited positions either side`,
              /placed|imewekwa|已下注|receipt/i.test(txt));
    await shot(page, "bonus-hedge");
  } finally { await ctx.close(); await b.close(); }
}

async function cancel() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/markets/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    /** The wallet figure in the header — the product's own number, read before and after. */
    const headerBalance = async () => {
      const t = await page.evaluate(() => (document.querySelector("header")?.innerText ?? document.body.innerText).slice(0, 400));
      const m = /TZS\s*([\d,]+)/.exec(t);
      return m ? Number(m[1].replace(/,/g, "")) : NaN;
    };
    const before = await headerBalance();

    // ⚠️ THE CONTROL IS CALLED "FREE EXIT", NOT "CANCEL" — read off the live page:
    //   label   `FREE EXIT 1:43 · No fee`      (a COUNTDOWN: the window is 5 minutes)
    //   button  `Free exit  TZS 3,000 full refund`
    // and once the window lapses it becomes `Selling closed`, DISABLED, with the aria-label
    // "This prediction now rides to settlement — it can no longer be sold." A probe matching
    // only /cancel/ finds nothing and reports the feature missing.
    const btn = page.getByRole("button", { name: /free exit|cancel|ghairi|取消/i }).first();
    const there = await btn.isVisible().catch(() => false);
    rec.check("a free-cancellation control is offered inside the window", there);
    if (there) {
      // 🔴 THE QUOTE INSIDE THE DIALOG EXPIRES, AND A FULL-PAGE SCREENSHOT IS ENOUGH TO BURN
      // IT. The first attempt shot the page before clicking, and by the time the confirm was
      // reached the modal read "This quote has expired — close and reopen to see the current
      // figure" with **Sell DISABLED**. Nothing was cancelled; the run reported success anyway.
      // So: click through with no screenshots in the way, and reopen once if the quote lapses.
      let sold = false;
      for (let attempt = 0; attempt < 3 && !sold; attempt++) {
        await btn.click({ timeout: 20_000 });
        const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 15_000 });
        const sell = dlg.getByRole("button", { name: /^Sell\b/i }).first();
        await sell.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
        if (await sell.isEnabled().catch(() => false)) {
          await sell.click({ timeout: 15_000 });
          sold = true;
        } else {
          // Expired quote: close and reopen, which is exactly what the dialog tells the player.
          await dlg.getByRole("button", { name: /keep position|close/i }).first().click({ timeout: 10_000 }).catch(() => {});
          await page.waitForTimeout(600);
        }
      }
      rec.check("the Sell control was live, not an expired quote", sold);
      await page.waitForTimeout(5_000);
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForSelector("main", { timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(1_500);
      await shot(page, "bonus-after-cancel");

      // ⛔ THE ASSERTION IS THE MONEY, NOT THE WORDS. The first version matched /refund/ against
      // the page — and the button's OWN label reads "Free exit TZS 4,000 full refund", so it
      // passed over a position that was still OPEN and a wallet that had not moved. Ask of every
      // check: would this still pass if the feature were absent? That one did.
      const after = await headerBalance();
      rec.check(`the stake came back — header balance ${before} → ${after}`,
                Number.isFinite(before) && Number.isFinite(after) && after > before,
                `expected an increase of the cancelled stake`);
    }
  } finally { await ctx.close(); await b.close(); }
}

const CMDS = { grant, warn, first, hedge, cancel };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
await CMDS[CMD]();
console.log(`\n  ⛔ Read the GRANT ROW, not this page:`);
console.log(`     KP_REPO=F:/kipindi-main node scripts/live/ops/bonus-census.cjs ${PLAYER}\n`);
rec.done();
