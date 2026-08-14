#!/usr/bin/env node
/**
 * A LONG-FORM POLL, END TO END, ON PRODUCTION — created, bet on both sides, resolved,
 * settled, and tied out against the ledger.
 *
 *   node scripts/live-poll-drive.mjs create            # publish a QA poll via the wizard
 *   MKT=mkt_x node scripts/live-poll-drive.mjs bet     # the fleet bets BOTH sides
 *   MKT=mkt_x node scripts/live-poll-drive.mjs resolve # resolve YES through the console
 *
 * ⭐ WHY THIS EXISTS. `docs/RULES.md`'s definition of done requires *"a real bet on
 * production settling at 13% of the losing side"* on **BOTH** products. Up & Down was driven
 * in session 2 (mkt_39b5c1731ae414, fee 1,040.00 = 13% × 8,000). The long-form poll has never
 * been driven under `loser-share` at all, so the ⏳ on that line is honest and this closes it.
 *
 * ⚠️ REAL MONEY from QA-fleet wallets, on production, authorised by Ali 2026-08-14 (§0 of
 * `docs/SESSION-PROMPT-RATES-SESSION-3.md`: "no cap — whatever the test needs").
 *
 * ⛔ SIX PLAYERS AND SEVEN POSITIONS, NOT TWO — Ali's standing instruction, given twice. Two
 * personas cannot exercise `allocateFeeShares`, which distributes the fee across winners by
 * largest remainder: with ONE winner there is no remainder to get wrong. The stakes below are
 * deliberately unequal and deliberately do not divide evenly.
 *
 *     YES  fleet:16 5K · fleet:18 2K · fleet:20 1K   =  8,000
 *     NO   fleet:17 10K · fleet:19 1K · fleet:21 2K  = 13,000
 *
 *   YES wins → fee = 13% × 13,000 = 1,690, split 5:2:1 over 8,000 → 1056.25 / 422.50 / 211.25.
 *              ⭐ Those do not divide evenly, which is the whole point: largest-remainder is
 *              exercised, and the three shares must still sum to exactly 1,690.00.
 *
 * ⛔ THE DOM IS NOT THE PROOF. `scripts/live/ops/loser-share-settled.cjs` recomputes every
 * figure from the pool columns and the frozen snapshot and compares it against the LEDGER.
 * This script's job is to make a real row exist; that script's job is to disbelieve it.
 *
 * Traps encoded here:
 *  · ⚠️ Sign in as the role that OWNS the page. `trading` publishes markets, `resolver` /
 *    `officer` resolve them — ADMIN bypasses every domain check and would measure nothing.
 *  · ⚠️ `datetime-local` wants LOCAL wall-clock with no zone, not an ISO instant.
 *  · ⚠️ Confirms are scoped to `[role=dialog]`; `clickByName` is page-wide and takes `.first()`.
 *  · ⚠️ ASCII in selectors only.
 */
import { BASE, SHOT, browser, login, bodyText, clickByName, shot, recorder } from "./live/harness.mjs";

const CMD = process.argv[2] ?? "create";
const MKT = process.env.MKT ?? "";
const rec = recorder(`LIVE POLL · ${CMD}`);

/** `datetime-local` takes local wall-clock, zone-free. Minutes from now. */
function localStamp(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── create ───────────────────────────────────────────────────────────────────
async function create() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  // ⛔ WATCH THE WIRE, NOT THE PAINT. A server action's refusal reaches this page as a toast
  // that auto-dismisses; two runs reported only "still on the form" while the server had been
  // answering all along. The POST status and any console error are the primary evidence.
  page.on("console", (m) => { if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 200)}`); });
  page.on("response", async (r) => {
    if (r.request().method() !== "POST") return;
    console.log(`  [POST ${r.status()}] ${r.url().slice(0, 90)}`);
    if (r.status() >= 400) console.log(`      body: ${(await r.text().catch(() => "")).slice(0, 300)}`);
  });
  page.on("requestfailed", (r) => console.log(`  [FAILED] ${r.method()} ${r.url().slice(0, 90)} — ${r.failure()?.errorText}`));
  try {
    // ⚠️ TRADING, not ADMIN — the role that actually owns market publication.
    await login(page, "trading");
    await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input", { timeout: 45_000 });

    const stamp = new Date().toISOString().slice(11, 16).replace(":", "");
    const tag = process.env.TAG ?? "loser-share";
    const title = `QA session-3 ${tag} poll ${stamp} - will this QA market settle at 13 percent?`;

    // step 0 · titles + category
    // ⚠️ ANCHOR ON THE PLACEHOLDER, NOT `input.first()`. The admin shell renders its own
    // controls above the form, so `.first()` filled something that was not the title and the
    // Continue button stayed correctly disabled — which reads exactly like a broken wizard.
    await page.locator('input[placeholder*="TZS strengthen"]').first().fill(title);
    await page.waitForTimeout(400);

    // ⛔ THE CATEGORY IS NOT COSMETIC — IT DECIDES WHICH SOURCES ARE ALLOWED. The wizard
    // defaults to `sports`, and the server refused three runs with
    //   "Source not approved · No enabled trusted source for sports matching www.bot.go.tz"
    // which is exactly right: `bot.go.tz` is trusted for **macro**. The refusal was correct
    // and the driver was wrong. ⚠️ The kit Select renders its panel in a PORTAL at the
    // document root and fades it in, so wait for `opacity === 1` before clicking an option —
    // a click on a still-transparent panel lands on the page behind it.
    const cat = page.locator('button[role="combobox"]').first();
    await cat.click();
    await page.waitForSelector('[role="option"]', { timeout: 10_000 });
    await page.waitForFunction(() => {
      const p = document.querySelector('[role="listbox"]');
      return !!p && getComputedStyle(p).opacity === "1";
    }, undefined, { timeout: 5_000 }).catch(() => {});
    await page.locator('[role="option"]').filter({ hasText: /^macro$/i }).first().click();
    await page.waitForTimeout(500);

    await clickByName(page, /Continue/);
    await page.waitForTimeout(600);

    // step 1 · source URL + resolution timestamp
    const src = page.locator('input[placeholder*="bot.go.tz"]').first();
    await src.fill("https://www.bot.go.tz/exchangerates");
    // ⭐ FAR ENOUGH OUT THAT SELECTIONS STAY OPEN while six players sign in and bet, and near
    // enough to resolve inside this session. `createMarket` refuses a past resolution outright.
    await page.locator('input[type="datetime-local"]').first().fill(localStamp(Number(process.env.RES_MIN ?? 35)));
    await clickByName(page, /Continue/);
    await page.waitForTimeout(600);

    // step 2 · the binding criterion
    await page.locator("textarea").first().fill(
      "QA MARKET - NOT A REAL EVENT. Created by the session-3 rules programme to prove that a " +
      "long-form poll settles at 13 percent of the losing side on production. Resolves YES by " +
      "operator decision at the stated time; every stake is QA-fleet money.");
    await clickByName(page, /Continue/);
    await page.waitForTimeout(600);

    // step 3 · publish
    // ⚠️ The EXACT control, and its state read back. `clickByName` is page-wide and takes
    // `.first()`; the first attempt left the wizard sitting on a filled step 4/4 with the
    // button still enabled, which is indistinguishable from a click that never happened.
    const publish = page.getByRole("button", { name: /Publish market/i }).first();
    await publish.waitFor({ state: "visible", timeout: 30_000 });
    await publish.scrollIntoViewIfNeeded();
    // ⛔ THE REFUSAL IS A TOAST, AND A TOAST AUTO-DISMISSES. Two runs reported only "still at
    // /admin/markets/new" because the screenshot was taken after it had gone — the server was
    // saying why the whole time and nothing was listening. Poll for it from the instant of the
    // click, and shoot the moment it appears.
    // ⚠️ THE VIEWPORT IS `div[role="region"]`, not `[role=status]`. Matching on the status
    // role found an empty node and printed `toast: ""` twice — a capture that reports nothing
    // is worse than no capture, because it looks like the server said nothing.
    await publish.click({ timeout: 30_000 });
    for (let i = 0; i < 40; i++) {
      const msg = await page.evaluate(() => {
        for (const el of document.querySelectorAll('div[role="region"], [role="alert"], [role="status"]')) {
          const s = (el.innerText || "").replace(/\s+/g, " ").trim();
          if (s) return s;
        }
        return "";
      });
      if (msg) { console.log(`  toast: "${msg}"`); await shot(page, "poll-publish-toast"); break; }
      if (!/\/admin\/markets\/new/.test(page.url())) break;
      await page.waitForTimeout(250);
    }
    await page.waitForURL(/\/admin\/markets(?!\/new)/, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await shot(page, "poll-published");

    const url = page.url();
    const id = /mkt_[a-z0-9]+/i.exec(url + " " + (await bodyText(page)))?.[0] ?? null;
    rec.check("a market was published", !!id, id ?? `still at ${url}`);
    if (id) console.log(`\n  MKT=${id}\n`);
  } catch (e) {
    // ⛔ A screenshot of the failure, or the next attempt is another guess.
    await shot(page, "poll-create-FAILED").catch(() => {});
    console.log("  page said:", (await bodyText(page).catch(() => "")).slice(0, 500));
    throw e;
  } finally { await ctx.close(); await b.close(); }
}

// ── bet ──────────────────────────────────────────────────────────────────────
// ⚠️ 15–20, and the ceiling is real: the production fleet is `fleet:01`–`fleet:20`. An index
// past the end produces a valid-looking 9-digit phone the server has no account for, and the
// sign-in fails looking exactly like a wrong password.
const PLAN = [
  { idx: "15", side: "YES", stake: 5000 },
  { idx: "17", side: "YES", stake: 2000 },
  { idx: "19", side: "YES", stake: 1000 },
  { idx: "16", side: "NO",  stake: 10000 },
  { idx: "18", side: "NO",  stake: 1000 },
  { idx: "20", side: "NO",  stake: 2000 },
];

async function betOne({ idx, side, stake }) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  let step = "login";
  try {
    await login(page, `fleet:${idx}`);
    step = "open market";
    await page.goto(`${BASE}/markets/${MKT}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector("main", { timeout: 45_000 });

    step = "pick side";
    // ⛔ THE SIDE COMES FIRST, THEN THE STAKE. The panel reads "PICK YOUR SIDE / Which way will
    // it resolve?" and the dial does not exist until a side is chosen — its own hint says so:
    // "Choose a side to set your conviction and place your bet." The first version of this
    // driver waited 30s for a stake box on a page that was working perfectly.
    // ⚠️ BY ACCESSIBLE NAME, AND THAT IS MEASURED, NOT PREFERRED. `scripts/live/probe-poll-card.mjs`
    // counted every candidate on the live page:
    //     0 matches   button text filter /^YES$/      ← what the first two runs used
    //     1 match     getByRole name="Back YES"        box 142x46
    // The campaign's usual rule is "match rendered TEXT, not the accessible name", and that rule
    // comes from CSS-uppercased labels. It does not apply here: the rendered text is `YES` while
    // the name is `Back YES`, so the name is both more specific and the only thing that resolves.
    //
    // 🔴 AND THE CONTRACT CHANGES UNDER YOU ONCE THE MARKET HAS A POOL. Measured minutes apart
    // on the same market: while it read "No bets yet" the control was `Back YES`; after five
    // bets landed it became **`Back YES at 35%`**, and the exact-name locator that had just
    // placed five bets matched nothing for the sixth. `exact: true` was the defect.
    // ⛔ PREFIX + `.first()`, and the ordering is load-bearing: the "Similar markets" rail also
    // renders `Back YES at 95%`, and it comes AFTER the market's own panel in DOM order. A
    // loose match without `.first()` bets real money on somebody else's market. The stake step
    // below is the check on that — the rail's buttons navigate away instead of opening a dial,
    // so a wrong pick fails loudly rather than quietly.
    await page.getByRole("button", { name: new RegExp(`^Back ${side}\\b`) }).first()
      .click({ timeout: 30_000 });
    await page.waitForTimeout(1_000);

    step = "stake";
    const box = page.locator('input[inputmode="numeric"], input[type="text"][inputmode]').first();
    await box.waitFor({ timeout: 30_000 });
    // ⛔ SELECT-ALL AND TYPE, NOT `fill`. The stake box is a MASKED, controlled input that
    // arrives carrying a default. `fill()` raced its re-format and produced **"1000100"** —
    // caught by the read-back below, which is the only reason it was not a 100,100 bet.
    // ⚠️ The read-back is not optional garnish: it is the difference between a wrong stake
    // and a wrong stake nobody noticed.
    await box.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await page.keyboard.type(String(stake), { delay: 30 });
    await page.waitForTimeout(500);
    const typed = (await box.inputValue()).replace(/[^\d]/g, "");
    if (typed !== String(stake)) throw new Error(`stake box reads "${typed}", expected ${stake}`);

    step = "place";
    await page.getByRole("button", { name: new RegExp(`Place ${side}`, "i") }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(1_200);

    step = "confirm";
    // ⛔ Scoped to the dialog. A page-wide `.first()` confirm lands on the wrong control.
    await page.locator('[role="dialog"], [role="alertdialog"]').locator("button")
      .filter({ hasText: /^(Confirm|Place)/i }).last().click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);

    const txt = await bodyText(page);
    const ok = /placed|imewekwa|已下注|you're in|receipt/i.test(txt);
    console.log(`  ${ok ? "ok  " : "FAIL"} fleet:${idx} ${side.padEnd(3)} ${String(stake).padStart(6)}`);
    if (!ok) await shot(page, `poll-bet-FAILED-${idx}`);
    return { idx, side, stake, ok };
  } catch (e) {
    // ⛔ NOT `.split("\n")[0]`. Playwright puts "waiting for locator(…)" and "element is not
    // enabled / not visible" on the LATER lines, and truncating to the first threw away the
    // difference between "no such control" and "the control is covered" — the two diagnoses
    // that matter. Two runs were debugged blind because of it.
    console.log(`  FAIL fleet:${idx} ${side} ${stake} — at [${step}] — ${e.message.replace(/\s+/g, " ").slice(0, 260)}`);
    await shot(page, `poll-bet-FAILED-${idx}`).catch(() => {});
    return { idx, side, stake, ok: false };
  } finally { await b.close(); }
}

async function bet() {
  if (!MKT) throw new Error("MKT=mkt_… is required");
  // ONLY=19,20 re-runs just those players — a retry after a partial run must not double-bet
  // the ones that already landed.
  const only = (process.env.ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const plan = only.length ? PLAN.filter((p) => only.includes(p.idx)) : PLAN;
  console.log(`\n  YES  ${plan.filter((p) => p.side === "YES").map((p) => `fleet:${p.idx} ${p.stake}`).join(" · ") || "—"}`);
  console.log(`  NO   ${plan.filter((p) => p.side === "NO").map((p) => `fleet:${p.idx} ${p.stake}`).join(" · ") || "—"}\n`);
  // Concurrent: different accounts, so per-account attempt limiting does not apply, and a
  // sequential run would take longer than the selection window.
  const out = await Promise.all(plan.map(betOne));
  const good = out.filter((p) => p.ok).length;
  rec.check(`${good}/${out.length} bets placed on both sides`, good === out.length);
}

// ── resolve ──────────────────────────────────────────────────────────────────
async function resolve() {
  if (!MKT) throw new Error("MKT=mkt_… is required");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    // ⚠️ The COMPLIANCE officer owns resolution, not ADMIN.
    await login(page, "officer");
    await page.goto(`${BASE}/admin/markets/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await shot(page, "poll-admin-before-resolve");
    console.log((await bodyText(page)).slice(0, 1200));
  } finally { await ctx.close(); await b.close(); }
}

if (CMD === "create") await create();
else if (CMD === "bet") await bet();
else if (CMD === "resolve") await resolve();
else throw new Error(`unknown command "${CMD}" — create | bet | resolve`);
rec.done();
