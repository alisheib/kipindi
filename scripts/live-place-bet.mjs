#!/usr/bin/env node
/**
 * live-place-bet.mjs — place a REAL bet on production as a named player, through the
 * real dial, and prove the money moved.
 *
 * ⛔ THIS SPENDS REAL MONEY. It exists because the campaign had every layer of the poll
 * money path tested separately — the dial's locking, the confirm dialog, settlement
 * arithmetic in suites, the ledger invariants — and no way to walk the chain in one go.
 * `qa:live` asserts the Place button EXISTS with the right label and locking; it never
 * clicks it. So "the product works" was never actually witnessed, only inferred.
 *
 * ⛔ IT REFUSES TO RUN WITHOUT `--live`. A driver that spends money on an accidental
 * invocation is worse than no driver.
 *
 * ⭐ IT NEVER TRUSTS THE SCREEN ABOUT MONEY. The wallet is read before and after and the
 * delta is compared to the stake — the product cannot be its own witness. A receipt
 * saying "BET PLACED" over a wallet that did not move is exactly the class of defect
 * this campaign keeps finding, so the receipt is evidence of INTENT and the wallet
 * delta is evidence of FACT.
 *
 * Usage:
 *   node scripts/live-place-bet.mjs --live --phone 712000101 --secret QA_ALPHA_PASSWORD \
 *        --market mkt_xxx --side YES --stake 3000 [--shots .qa-board]
 *
 *   Secrets come from `.env.qa.local` by name, or from `BET_PW` in the environment for
 *   an account outside the QA persona set — never as an argument, which would land in
 *   the shell history.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://50pick.tz").replace(/\/$/, "");
const PHONE = arg("--phone");
const SECRET_KEY = arg("--secret");
const MARKET = arg("--market");
const SIDE = (arg("--side") || "").toUpperCase();
const STAKE = arg("--stake");
const SHOTS = arg("--shots");

if (!process.argv.includes("--live")) {
  console.error("⛔ REFUSING: this places a REAL bet with REAL money. Pass --live if that is what you mean.");
  process.exit(2);
}
if (!PHONE || !MARKET || !["YES", "NO"].includes(SIDE) || !STAKE) {
  console.error("usage: --live --phone <9-digit> --secret <ENV_KEY> --market <mkt_id> --side YES|NO --stake <tzs>");
  process.exit(2);
}

let PW = process.env.BET_PW || null;
if (!PW && SECRET_KEY) {
  try {
    const env = Object.fromEntries(
      readFileSync(new URL("../.env.qa.local", import.meta.url), "utf8").split("\n")
        .map((l) => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; })
        .filter(Boolean),
    );
    PW = env[SECRET_KEY] ?? null;
  } catch { /* file absent — BET_PW is the other route */ }
}
if (!PW) { console.error(`⛔ no secret: set BET_PW, or put ${SECRET_KEY} in .env.qa.local`); process.exit(2); }
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const tag = `${MARKET.slice(0, 12)}-${SIDE}-${PHONE}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  timezoneId: "Africa/Dar_es_Salaam",   // the platform's zone — never the runner's
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const shot = (n) => (SHOTS ? page.screenshot({ path: `${SHOTS}/bet-${tag}-${n}.png` }).catch(() => {}) : Promise.resolve());

/** The wallet's own page, read as a number. Never the market screen's idea of it. */
async function walletTzs() {
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2600);
  const m = (await page.evaluate(() => document.querySelector("main")?.innerText || "")).match(/TZS\s*([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

let failed = 0;
try {
  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1400);
  await page.locator('input[placeholder="712 345 678"]').first().fill(PHONE);
  await page.locator('input[type="password"]').first().fill(PW);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5500);
  if (page.url().includes("/auth/")) { console.error("🔴 sign-in failed for " + PHONE); process.exit(1); }

  const before = await walletTzs();
  console.log(`${PHONE} wallet BEFORE: ${before}`);

  // `?side=` locks the dial to one side — the side-locked invariant this platform
  // treats as law. Placing through it means the drive exercises the real control.
  await page.goto(`${BASE}/markets/${MARKET}?side=${SIDE}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);

  const box = page.locator('input[inputmode="numeric"]').first();
  await box.click(); await box.fill(String(STAKE)); await box.press("Enter");
  await page.waitForTimeout(600);
  const typed = (await box.inputValue()).replace(/\D/g, "");
  if (typed !== String(STAKE)) { console.error(`🔴 stake box reads ${typed}, expected ${STAKE}`); failed++; }
  await shot("1-dial");

  await page.getByRole("button", { name: new RegExp(`Place ${SIDE}`) }).first().click();
  await page.waitForTimeout(1600);
  await shot("2-confirm");
  console.log("CONFIRM: " + (await page.evaluate(() => document.querySelector('[role="dialog"],[role="alertdialog"]')?.innerText || "")).replace(/\s+/g, " ").slice(0, 260));

  await page.locator('[role="dialog"] button, [role="alertdialog"] button')
    .filter({ hasText: /^(Confirm|Place)/ }).last().click();
  await page.waitForTimeout(3500);
  await shot("3-receipt");
  const receipt = (await page.evaluate(() => document.querySelector('[role="dialog"],[role="alertdialog"]')?.innerText
    || document.querySelector("main")?.innerText || "")).replace(/\s+/g, " ");
  console.log("RECEIPT: " + receipt.slice(0, 260));
  const ticket = (receipt.match(/pos_[A-Za-z0-9]+/) || [])[0] ?? null;

  const after = await walletTzs();
  console.log(`${PHONE} wallet AFTER : ${after}`);
  if (before == null || after == null) {
    console.error("🔴 could not read the wallet on both sides — the money claim is UNPROVEN");
    failed++;
  } else {
    const moved = before - after;
    const exact = moved === Number(STAKE);
    console.log(`moved ${moved} against a stake of ${STAKE} — ${exact ? "✓ EXACT" : "🔴 MISMATCH"}`);
    if (!exact) failed++;
  }
  console.log(`ticket: ${ticket ?? "🔴 none found on the receipt"}`);
  if (!ticket) failed++;
} catch (e) {
  console.error("threw:", e.message.slice(0, 220));
  failed++;
} finally {
  await browser.close();
}
process.exit(failed === 0 ? 0 : 1);
