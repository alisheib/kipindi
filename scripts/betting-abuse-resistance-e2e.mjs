/**
 * Betting abuse-resistance stress test.
 *
 * Crazy-input sprint focused on the betting workflow. The contract:
 *   1. No string can crash the dial.
 *   2. No combination of garbage paste can leave the input in a
 *      "broken" state (NaN, Infinity, negative, > 9-digit display).
 *   3. The Place button can NEVER show a stake outside [5,000–25,000].
 *   4. The server must reject any forged stake (out-of-range,
 *      non-integer, insufficient balance, closed market).
 *   5. Rapid-fire Confirm clicks must debit the wallet EXACTLY once.
 *   6. The multiplier input must filter symmetrically with the stake
 *      input (no leak via the new third entry point).
 *
 *   BASE=http://localhost:3000  node scripts/betting-abuse-resistance-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = "7" + String(Date.now() % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

// 30 paste attacks, ranging from benign-looking to scam-grade.
const PASTE_ATTACKS = [
  "999999999999999",                  // 15-digit overflow
  "1e9",                              // scientific notation
  "1E9",                              // upper-case e
  "0x5000",                           // hex literal
  "0b101",                            // binary literal
  "0o17500",                          // octal literal
  "+5000",                            // signed positive
  "-5000",                            // signed negative
  "5000.50",                          // decimal
  "5000,50",                          // EU decimal comma
  "5,000",                            // thousand separator
  "5_000",                            // underscore separator
  "5 000",                            // space separator
  "TZS 7,500",                        // currency prefix
  "7500 TZS",                         // currency suffix
  "$5,000",                           // foreign currency
  "  10000  ",                        // whitespace
  "\n5000\n",                         // newlines
  "5000\t10000",                      // tab
  "5000​",                       // zero-width space
  "5000﻿",                       // BOM
  "５０００",                              // full-width digits
  "٥٠٠٠",                             // Arabic-Indic digits
  "𝟓𝟬𝟬𝟬",                              // math italic digits
  "5️⃣0️⃣0️⃣0️⃣",                          // emoji digits
  "NaN",                              // literal NaN
  "Infinity",                         // literal infinity
  "null",                             // null
  "undefined",                        // undefined
  "true",                             // boolean
  "abcdefghij",                       // pure letters
  "; DROP TABLE bets; --",            // SQL
  "<img src=x onerror=alert(1)>",     // XSS
  "javascript:alert(1)",              // pseudo-protocol
  "${process.env.SECRET}",            // template literal
  "🎰🎲💰",                              // emoji-only
  "5000".repeat(50),                  // 200-char repetitive
];

const MULTI_PASTE_ATTACKS = [
  "999",                              // > max 5
  "0",                                // = 0, below min 1
  "-2.5",                             // negative
  "2.5e2",                            // scientific
  "0xa",                              // hex
  "2.5.3",                            // multiple dots
  "..2",                              // leading dots
  "2..",                              // trailing dots
  "2,5",                              // comma decimal
  "  2.50  ",                         // whitespace
  "abc2.5xyz",                        // letters + digits
  "５.５",                              // full-width
  "Infinity",                         // literal
  "NaN",                              // literal
  "<script>",                         // XSS
  "2.5×",                             // unit suffix
  "x2.5",                             // unit prefix
  "2.50000000000001",                 // precision overflow
  ".",                                // bare dot
  "",                                 // empty
  "2.5".repeat(40),                   // long repetitive
  "2.500000.5",                       // late decimal
];

const browser = await chromium.launch();
let consoleErrors = [];

try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const pwd = "Abuse!2026";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 500_000 }),
  });

  // -----------------------------------------------------------------
  // Helper — pick fresh live market each scenario where it matters
  // -----------------------------------------------------------------
  async function liveMarketHref() {
    const probe = await ctx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const h = await probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first().getAttribute("href").catch(() => null);
    await probe.close();
    return h;
  }

  let href = await liveMarketHref();
  if (!href) throw new Error("no live market");

  let p = await ctx.newPage();

  // Capture every console error so we can verify zero leaks during
  // the storm.
  p.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (/Failed to load resource: net::ERR_/i.test(t)) return;
    if (/^Warning:/i.test(t)) return;
    consoleErrors.push(t.slice(0, 180));
  });
  p.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 180)}`));

  await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);

  let track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  let stakeInput = p.locator('input[aria-label^="Stake amount in TZS"]').first();
  let multInput = p.locator('input[aria-label^="Conviction multiplier"]').first();
  await stakeInput.waitFor({ state: "visible" });
  await multInput.waitFor({ state: "visible" });

  async function liveMarketsAll() {
    const probe = await ctx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const hrefs = await probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i })
      .evaluateAll((els) => els.map((e) => e.getAttribute("href"))).catch(() => []);
    await probe.close();
    return hrefs.filter((h) => h);
  }

  async function reopen() {
    // Tests run long enough that the first picked "Live" market can
    // resolve mid-test. Try up to 4 fresh markets before giving up
    // — the seed always refreshes ~6 minute-scale ones per /markets
    // hit, so a retry is virtually guaranteed to find one with the
    // dial still mounted.
    const candidates = await liveMarketsAll();
    if (candidates.length === 0) throw new Error("no live markets available");
    await p.close();
    p = await ctx.newPage();
    p.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const t = msg.text();
      if (/Failed to load resource: net::ERR_/i.test(t)) return;
      if (/^Warning:/i.test(t)) return;
      consoleErrors.push(t.slice(0, 180));
    });
    p.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 180)}`));

    for (const h of candidates.slice(0, 4)) {
      await p.goto(`${BASE}${h}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(500);
      track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
      stakeInput = p.locator('input[aria-label^="Stake amount in TZS"]').first();
      multInput = p.locator('input[aria-label^="Conviction multiplier"]').first();
      const found = await stakeInput.isVisible({ timeout: 5_000 }).catch(() => false);
      if (found) {
        await multInput.waitFor({ state: "visible", timeout: 3_000 });
        return;
      }
    }
    throw new Error("no live market had the dial visible after 4 retries");
  }

  async function pasteInto(input, value) {
    await input.click({ clickCount: 3 });
    await input.press("Delete");
    await p.evaluate((v) => {
      const el = document.activeElement;
      if (!(el instanceof HTMLInputElement)) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, String(value));
    await p.waitForTimeout(120);
  }

  async function readWallet() {
    const probe = await ctx.newPage();
    try {
      await probe.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
      const el = probe.locator("[data-testid='wallet-balance']").first();
      const v = (await el.count()) > 0 ? await el.getAttribute("data-balance") : null;
      return v !== null ? parseInt(v, 10) : null;
    } finally {
      await probe.close();
    }
  }

  // -----------------------------------------------------------------
  // A · STAKE INPUT — 37 paste attacks
  // -----------------------------------------------------------------
  console.log("\n=== A · STAKE INPUT — 37 paste attacks ===");
  let stakeLeaks = 0;
  for (const v of PASTE_ATTACKS) {
    await pasteInto(stakeInput, v);
    const raw = await stakeInput.inputValue();
    // Contract: input should contain only digits OR be empty.
    // Length capped at 7 (per onStakeInput slice).
    const clean = /^\d{0,7}$/.test(raw);
    if (!clean) {
      stakeLeaks++;
      console.log(`  · LEAK on "${v.slice(0, 30)}" → raw="${raw}"`);
    }
  }
  log("A.1 stake input filters every paste to ≤ 7 digits (no symbols leak)",
      stakeLeaks === 0, `leaks=${stakeLeaks}/${PASTE_ATTACKS.length}`);

  // After the storm, blur should settle to a value in [5000, 25000].
  await stakeInput.blur();
  await p.waitForTimeout(400);
  const stakeAfter = parseInt((await stakeInput.inputValue()).replace(/[^\d]/g, ""), 10);
  log("A.2 after garbage storm + blur, stake in [5000, 25000]",
      stakeAfter >= 5000 && stakeAfter <= 25000, `settled=${stakeAfter}`);

  // -----------------------------------------------------------------
  // B · MULTIPLIER INPUT — 22 paste attacks
  // -----------------------------------------------------------------
  console.log("\n=== B · MULTIPLIER INPUT — 22 paste attacks ===");
  let multLeaks = 0;
  for (const v of MULTI_PASTE_ATTACKS) {
    await pasteInto(multInput, v);
    const raw = await multInput.inputValue();
    // Contract: only digits and at most one dot, capped at 4 chars.
    const clean = /^\d{0,4}(\.\d{0,2})?$|^\.\d{0,2}$|^$/.test(raw) && raw.length <= 4;
    if (!clean) {
      multLeaks++;
      console.log(`  · LEAK on "${v.slice(0, 30)}" → raw="${raw}"`);
    }
  }
  log("B.1 multiplier input filters every paste to digits + ≤ 1 dot (≤ 4 chars)",
      multLeaks === 0, `leaks=${multLeaks}/${MULTI_PASTE_ATTACKS.length}`);

  await multInput.blur();
  await p.waitForTimeout(400);
  const multAfter = parseFloat(await multInput.inputValue());
  log("B.2 after garbage storm + blur, multiplier in [1.00, 5.00]",
      Number.isFinite(multAfter) && multAfter >= 1 && multAfter <= 5,
      `settled=${multAfter}`);

  // -----------------------------------------------------------------
  // C · CROSS-INPUT INTERFERENCE — garbage on one doesn't corrupt the other
  // -----------------------------------------------------------------
  console.log("\n=== C · CROSS-INPUT INTERFERENCE ===");
  await reopen();
  // Lock the multiplier at 2.50 via typing
  await multInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await multInput.type("2.50", { delay: 5 });
  await multInput.blur();
  await p.waitForTimeout(400);
  // Now hammer the stake input with garbage
  for (const v of PASTE_ATTACKS.slice(0, 12)) {
    await pasteInto(stakeInput, v);
  }
  // Blur stake input
  await stakeInput.blur();
  await p.waitForTimeout(400);
  const stakeFinal = parseInt((await stakeInput.inputValue()).replace(/[^\d]/g, ""), 10);
  const multFinal = parseFloat(await multInput.inputValue());
  log("C.1 stake garbage didn't corrupt multiplier (still in range)",
      Number.isFinite(multFinal) && multFinal >= 1 && multFinal <= 5,
      `multiplier=${multFinal}`);
  log("C.2 stake settled inside [5000, 25000] after the cross-storm",
      stakeFinal >= 5000 && stakeFinal <= 25000, `stake=${stakeFinal}`);

  // -----------------------------------------------------------------
  // D · PLACE BUTTON NEVER LEAKS OUT-OF-RANGE
  // -----------------------------------------------------------------
  console.log("\n=== D · PLACE BUTTON can NEVER show out-of-range stake ===");
  let placeLeaks = 0;
  for (const v of [...PASTE_ATTACKS.slice(0, 20), ...MULTI_PASTE_ATTACKS.slice(0, 12)]) {
    // Alternate inputs to maximise chaos
    const target = Math.random() < 0.5 ? stakeInput : multInput;
    await pasteInto(target, v);
    const placeBtn = p.locator('button[aria-label^="Place "]').first();
    const visible = await placeBtn.isVisible({ timeout: 80 }).catch(() => false);
    if (visible) {
      const text = (await placeBtn.textContent()) ?? "";
      const m = text.match(/TZS\s*([\d,]+)/);
      if (m) {
        const amt = parseInt(m[1].replace(/,/g, ""), 10);
        if (amt < 5000 || amt > 25000) {
          placeLeaks++;
          console.log(`  · LEAK: Place button shows TZS ${amt} after paste "${v.slice(0, 24)}"`);
        }
      }
    }
  }
  log("D.1 across 32 chaotic pastes, Place button never shows < 5000 or > 25000",
      placeLeaks === 0, `leaks=${placeLeaks}/32`);

  // -----------------------------------------------------------------
  // E · WALLET DEBITED EXACTLY ONCE per Place click sequence
  // -----------------------------------------------------------------
  console.log("\n=== E · WALLET DEBITED EXACTLY ONCE per Place sequence ===");
  await reopen();
  // Pick a known live market for a clean bet
  await multInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await multInput.type("2.00", { delay: 5 });
  await multInput.blur();
  await p.waitForTimeout(400);

  const walletBefore = await readWallet();
  // Click Place, then spam Confirm.
  await p.locator('button[aria-label^="Place "]').first().click();
  await p.waitForTimeout(200);
  const confirmBtn = p.locator('[role="dialog"][aria-label="Confirm prediction"] button', { hasText: /confirm|thibitisha/i }).first();
  // Triple-click confirm rapidly
  for (let i = 0; i < 5; i++) {
    await confirmBtn.click({ timeout: 400 }).catch(() => {});
  }
  await p.waitForTimeout(2500);
  const walletAfter = await readWallet();
  const debited = walletBefore !== null && walletAfter !== null ? walletBefore - walletAfter : null;
  // multiplier 2.00 × baseStake 5000 = 10000
  log("E.1 5× Confirm click → wallet debited EXACTLY 10,000 (not 20k / 30k / 0)",
      debited === 10000, `before=${walletBefore} after=${walletAfter} debited=${debited}`);

  // -----------------------------------------------------------------
  // F · MULTIPLIER BOUNDARIES — 1.00 / 5.00 / clamp cases
  // -----------------------------------------------------------------
  console.log("\n=== F · MULTIPLIER BOUNDARIES ===");
  // Bet was just placed in E which can leave the market in a low-pool
  // state; reopen against a fresh live market before the boundary sweep.
  await reopen();
  await p.waitForTimeout(400);
  for (const [typed, expectMult] of [
    ["1.00", 1.00],
    ["1",    1.00],
    ["0.99", 1.00],   // below-min clamp
    ["5.00", 5.00],
    ["5",    5.00],
    ["5.01", 5.00],   // above-max clamp
    ["999",  5.00],   // way above max
  ]) {
    await multInput.focus();
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await multInput.type(typed, { delay: 5 });
    await multInput.blur();
    await p.waitForTimeout(400);
    const v = parseFloat(await multInput.inputValue());
    log(`F · "${typed}" → settles to ${expectMult.toFixed(2)}`,
        Math.abs(v - expectMult) < 0.02, `value=${v.toFixed(2)}`);
  }

  // -----------------------------------------------------------------
  // G · NEUTRAL → cannot place bet (no Place button, no Enter trigger)
  // -----------------------------------------------------------------
  console.log("\n=== G · NEUTRAL state → no bet can be placed ===");
  await reopen();
  // Drag dial dead-centre to force NEUTRAL
  const box = await track.boundingBox();
  await p.mouse.move(box.x + box.width * 0.95, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const walletPre = await readWallet();
  // Try Enter on the slider (a keyboard placement attempt)
  await track.focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(500);
  await p.keyboard.press("Space");
  await p.waitForTimeout(500);
  const walletPost = await readWallet();
  log("G.1 NEUTRAL + Enter/Space → no bet placed (wallet unchanged)",
      walletPre === walletPost, `pre=${walletPre} post=${walletPost}`);

  // -----------------------------------------------------------------
  // H · MID-CONFIRM TAMPER — change multiplier WHILE confirm modal open
  // -----------------------------------------------------------------
  console.log("\n=== H · MID-CONFIRM TAMPER — locked quote survives input edit ===");
  await reopen();
  // Lock 2.50x = 12,500
  await multInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await multInput.type("2.50", { delay: 5 });
  await multInput.blur();
  await p.waitForTimeout(400);
  // Open confirm modal — should lock at 12,500
  await p.locator('button[aria-label^="Place "]').first().click();
  await p.waitForTimeout(300);
  // Try to change the multiplier WHILE modal is open
  // The input is behind the modal; we use force-click to attempt it
  await multInput.click({ force: true, timeout: 1500 }).catch(() => {});
  await p.keyboard.type("5.00", { delay: 5 }).catch(() => {});
  await p.waitForTimeout(400);
  // The CONFIRM modal text should still say TZS 12,500 (locked at open time)
  const modalText = (await p.locator('[role="dialog"][aria-label="Confirm prediction"]').textContent({ timeout: 2_000 }).catch(() => "")) ?? "";
  log("H.1 confirm modal displays the value at open time (TZS 12,500), not the tampered one",
      /TZS\s*12,?500/.test(modalText),
      `modal contains TZS 12,500? ${/TZS\s*12,?500/.test(modalText)}`);
  // Close modal
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);

  // -----------------------------------------------------------------
  // I · FINAL CONSOLE-ERROR AUDIT — across the whole storm
  // -----------------------------------------------------------------
  console.log("\n=== I · ZERO console errors / unhandled rejections ===");
  log("I.1 zero uncaught client errors during the entire abuse storm",
      consoleErrors.length === 0, `count=${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log("  Errors (first 5):");
    consoleErrors.slice(0, 5).forEach((e) => console.log(`    · ${e}`));
  }

  await p.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nBETTING ABUSE RESISTANCE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
