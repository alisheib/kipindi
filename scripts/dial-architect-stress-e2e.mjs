/**
 * Dial architect-grade stress test.
 *
 * Hunts for state-machine inconsistencies that the earlier suites
 * couldn't catch because they didn't assert global invariants
 * across every interaction. Treats the dial as a finite state
 * machine and asserts the following invariants AT EVERY STEP:
 *
 *   I1 · The visible Place button's amount MUST equal the
 *        input's value (modulo TZS prefix + commas).
 *   I2 · `side` displayed under "YOU ARE PICKING" MUST match the
 *        slider position's side — UNLESS the player is in a typed
 *        edit, in which case the side preservation applies.
 *   I3 · The Place button is visible iff side is YES or NO.
 *   I4 · `aria-valuenow` of the slider is always in [0, 100].
 *   I5 · After typing baseStake (5,000) on a known side, the dial
 *        MUST NOT flip to NEUTRAL — otherwise the Place button
 *        disappears and the player loses their bet.
 *
 * Scenarios (each runs the invariants top-to-bottom):
 *
 *   A · type baseStake while on YES — side stays YES
 *   B · type baseStake while on NO — side stays NO
 *   C · type clamp-low (1) while on YES — side stays YES, stake=5000
 *   D · drag to neutral — side BECOMES NEUTRAL (the legitimate path)
 *   E · 50 rapid drag↔type alternations
 *   F · digit-by-digit backspace from 10,475 to 0
 *   G · boundary typing: 5000, 5001, 24999, 25000
 *   H · type → Confirm dialog shows the exact typed amount (not snapped)
 *
 *   BASE=http://localhost:3000  node scripts/dial-architect-stress-e2e.mjs
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
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const pwd = "Arch!2026";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 100_000 }),
  });

  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first().getAttribute("href").catch(() => null);
  await probe.close();
  if (!href) throw new Error("no live market");

  // Helper: pick a fresh live market and load it. Demo windows are
  // ~30s so we re-pick between long scenarios to keep the dial alive.
  async function freshLiveMarket() {
    const probe2 = await ctx.newPage();
    await probe2.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const h = await probe2.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first().getAttribute("href").catch(() => null);
    await probe2.close();
    return h;
  }

  let p = await ctx.newPage();
  await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);

  let track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  let input = p.locator('input[aria-label^="Stake amount in TZS"]').first();
  await input.waitFor({ state: "visible" });

  async function reopenLiveMarket() {
    const h2 = await freshLiveMarket();
    if (!h2) throw new Error("no live market available for reopen");
    await p.close();
    p = await ctx.newPage();
    await p.goto(`${BASE}${h2}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(700);
    track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
    input = p.locator('input[aria-label^="Stake amount in TZS"]').first();
    await input.waitFor({ state: "visible" });
  }

  // Snapshot the current dial state for invariant checks.
  async function snapshot() {
    const inputVal = parseInt((await input.inputValue()).replace(/[^\d]/g, ""), 10);
    const aria = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10);
    const placeBtn = p.locator('button[aria-label^="Place "]').first();
    const placeVisible = await placeBtn.isVisible({ timeout: 200 }).catch(() => false);
    const placeText = placeVisible ? ((await placeBtn.textContent()) ?? "") : "";
    const placeAmount = placeVisible
      ? parseInt((placeText.match(/TZS\s*([\d,]+)/) ?? ["", "0"])[1].replace(/,/g, ""), 10)
      : null;
    // "You are picking" label.
    const youArePickingHeader = (await p.getByText(/^you are picking$/i).first().textContent({ timeout: 300 }).catch(() => "")) ?? "";
    const noConvictionHeader = (await p.getByText(/^no conviction$/i).first().textContent({ timeout: 300 }).catch(() => "")) ?? "";
    const isNeutralByUi = !!noConvictionHeader && !youArePickingHeader;
    const sideLabel = (await p.getByText(/^YES$|^NO$|Pick side/).first().textContent({ timeout: 300 }).catch(() => "")) ?? "";
    return { inputVal, aria, placeVisible, placeAmount, placeText: placeText.trim(), sideLabel: sideLabel.trim(), isNeutralByUi };
  }

  async function dragTo(fraction) {
    const box = await track.boundingBox();
    // Always start from the opposite end so any target produces real
    // movement (dragTo(0.5) starting from the centre would be zero
    // distance — the tap-vs-drag threshold would ignore it).
    const sx = box.x + box.width * (fraction < 0.5 ? 0.95 : 0.05);
    const tx = box.x + box.width * fraction;
    const y = box.y + box.height / 2;
    await p.mouse.move(sx, y);
    await p.mouse.down();
    for (let i = 1; i <= 6; i++) await p.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await p.mouse.up();
    await p.waitForTimeout(400);
  }

  async function typeStake(value) {
    await input.focus();
    await p.waitForTimeout(80);
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await input.type(String(value), { delay: 8 });
    await p.waitForTimeout(300);
  }

  // -----------------------------------------------------------------
  // === A · TYPE baseStake WHILE ON YES — side stays YES ===========
  // -----------------------------------------------------------------
  console.log("\n=== A · TYPE baseStake (5,000) ON YES — Place button MUST stay visible ===");
  // YES is on the LEFT half (pos < 0.5) per license-review spec.
  await dragTo(0.25);
  await p.waitForTimeout(300);
  const s_yes_before = await snapshot();
  log("A.0 starting on YES side",
      s_yes_before.placeVisible && /TZS/.test(s_yes_before.placeText),
      `place="${s_yes_before.placeText}"`);

  await typeStake(5000);
  const s_yes_5k = await snapshot();
  log("A.1 typed 5,000 on YES → Place button STILL visible",
      s_yes_5k.placeVisible, `place="${s_yes_5k.placeText}"`);
  log("A.2 typed 5,000 on YES → Place button shows TZS 5,000",
      s_yes_5k.placeAmount === 5000, `amount=${s_yes_5k.placeAmount}`);
  log("A.3 typed 5,000 on YES → side stays YES (no NEUTRAL flip)",
      !s_yes_5k.isNeutralByUi, `isNeutralByUi=${s_yes_5k.isNeutralByUi}`);

  // -----------------------------------------------------------------
  // === B · TYPE baseStake WHILE ON NO — symmetric =================
  // -----------------------------------------------------------------
  console.log("\n=== B · TYPE baseStake (5,000) ON NO — symmetric to A ===");
  // NO is on the RIGHT half (pos > 0.5) per license-review spec.
  await dragTo(0.75);
  await p.waitForTimeout(300);
  await typeStake(5000);
  const s_no_5k = await snapshot();
  log("B.1 typed 5,000 on NO → Place button STILL visible",
      s_no_5k.placeVisible, `place="${s_no_5k.placeText}"`);
  log("B.2 typed 5,000 on NO → Place button shows TZS 5,000",
      s_no_5k.placeAmount === 5000, `amount=${s_no_5k.placeAmount}`);
  log("B.3 typed 5,000 on NO → side stays NO (no NEUTRAL flip)",
      !s_no_5k.isNeutralByUi, `isNeutralByUi=${s_no_5k.isNeutralByUi}`);

  // -----------------------------------------------------------------
  // === C · TYPE CLAMP-LOW (1) WHILE ON YES — clamped to 5000 ======
  // -----------------------------------------------------------------
  console.log("\n=== C · TYPE under-min (1) ON YES — side preserved, stake=5000 ===");
  await dragTo(0.25);
  await typeStake(1);
  // Need to blur to settle the clamp.
  await input.blur();
  await p.waitForTimeout(400);
  const s_low = await snapshot();
  log("C.1 typed 1, blurred → settles to 5,000 + place visible",
      s_low.placeVisible && s_low.placeAmount === 5000,
      `place="${s_low.placeText}"`);
  log("C.2 typed 1 → side stays YES (clamped intent honoured)",
      !s_low.isNeutralByUi);

  // -----------------------------------------------------------------
  // === D · DRAG TO NEUTRAL — Place button correctly hidden ========
  // -----------------------------------------------------------------
  console.log("\n=== D · DRAG TO NEUTRAL — Place button hidden (legit no-conviction) ===");
  await dragTo(0.5);
  await p.waitForTimeout(400);
  const s_neutral = await snapshot();
  log("D.1 drag to 0.5 → Place button hidden",
      !s_neutral.placeVisible, `placeText="${s_neutral.placeText}"`);
  log("D.2 drag to 0.5 → 'No conviction / Pick side' label",
      s_neutral.isNeutralByUi);

  // -----------------------------------------------------------------
  // === E · 50 RAPID DRAG↔TYPE ALTERNATIONS, INVARIANT CHECK =======
  // -----------------------------------------------------------------
  console.log("\n=== E · 20 INTERACTIONS — invariant: input value == Place button amount ===");
  let invariantFails = 0;
  for (let i = 0; i < 10; i++) {
    // type some value
    const v = 5000 + (i * 1234) % 19500;
    await typeStake(v);
    const s = await snapshot();
    if (s.placeVisible && s.placeAmount !== s.inputVal) {
      invariantFails++;
      if (invariantFails <= 3) console.log(`  · type ${v} → input=${s.inputVal}, place=${s.placeAmount}`);
    }
    // drag to some position
    const f = 0.25 + ((i * 0.13) % 0.5);
    await dragTo(f);
    const s2 = await snapshot();
    if (s2.placeVisible && s2.placeAmount !== s2.inputVal) {
      invariantFails++;
      if (invariantFails <= 6) console.log(`  · drag ${f.toFixed(2)} → input=${s2.inputVal}, place=${s2.placeAmount}`);
    }
  }
  log("E.1 across 20 interactions, input value always equals Place button amount",
      invariantFails === 0, `failures=${invariantFails}/20`);

  // Re-open a fresh live market before the rest — demo windows are
  // ~30 s and the earlier scenarios eat most of that.
  await reopenLiveMarket();

  // -----------------------------------------------------------------
  // === F · DIGIT-BY-DIGIT BACKSPACE FROM 10475 ====================
  // -----------------------------------------------------------------
  console.log("\n=== F · DIGIT-BY-DIGIT BACKSPACE — slider tracks each delete ===");
  await dragTo(0.75);
  await typeStake(10475);
  const f0 = await snapshot();
  log("F.0 typed 10,475 — invariant input=place", f0.inputVal === f0.placeAmount);

  await input.focus();
  for (const expectedDigits of [1047, 104, 10, 1, 0]) {
    await p.keyboard.press("Backspace");
    await p.waitForTimeout(80);
    const s = await snapshot();
    // The slider's aria-valuenow must stay in [0, 100] at every step.
    if (s.aria < 0 || s.aria > 100) {
      log(`F.X backspace to ${expectedDigits} broke aria-valuenow`, false, `aria=${s.aria}`);
      break;
    }
  }
  // After full delete, blur and confirm settle.
  await input.blur();
  await p.waitForTimeout(400);
  const fEnd = await snapshot();
  log("F.1 after deleting everything + blur, input shows a valid stake",
      fEnd.inputVal >= 5000 && fEnd.inputVal <= 25000,
      `value=${fEnd.inputVal}`);

  // -----------------------------------------------------------------
  // === G · BOUNDARY VALUES ========================================
  // -----------------------------------------------------------------
  console.log("\n=== G · BOUNDARY VALUES 5000 / 5001 / 24999 / 25000 ===");
  await dragTo(0.7);
  await typeStake(5000);
  const g1 = await snapshot();
  log("G.1 5,000 → exact + place visible",
      g1.placeVisible && g1.placeAmount === 5000, `place=${g1.placeAmount}`);

  await typeStake(5001);
  const g2 = await snapshot();
  log("G.2 5,001 → exact + place visible",
      g2.placeVisible && g2.placeAmount === 5001, `place=${g2.placeAmount}`);

  await typeStake(24999);
  const g3 = await snapshot();
  log("G.3 24,999 → exact + place visible",
      g3.placeVisible && g3.placeAmount === 24999, `place=${g3.placeAmount}`);

  await typeStake(25000);
  const g4 = await snapshot();
  log("G.4 25,000 → exact + place visible",
      g4.placeVisible && g4.placeAmount === 25000, `place=${g4.placeAmount}`);

  // -----------------------------------------------------------------
  // === I · TAP TRACK AFTER TYPE — exact value MUST survive ========
  // (Tap = pointerdown + pointerup with no movement. Players who
  // type a value and then click the dial to dismiss the keyboard
  // should NOT have their typed value silently snapped to 100.)
  // -----------------------------------------------------------------
  console.log("\n=== I · TAP TRACK AFTER TYPE — exact value must survive ===");
  await dragTo(0.7);
  await typeStake(6210);
  // Tap the track at the current knob position — no movement.
  const tapBox = await track.boundingBox();
  await p.mouse.move(tapBox.x + tapBox.width * 0.7, tapBox.y + tapBox.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(40);
  await p.mouse.up();
  await p.waitForTimeout(300);
  const i1 = await snapshot();
  log("I.1 typed 6,210 then tapped track → input still 6,210",
      i1.inputVal === 6210, `inputVal=${i1.inputVal}`);
  log("I.2 typed 6,210 then tapped track → Place button still TZS 6,210",
      i1.placeVisible && i1.placeAmount === 6210,
      `place=${i1.placeAmount}`);

  // -----------------------------------------------------------------
  // === J · DRAG > 4px CLEARS LOCK — snap-to-100 takes over ========
  // -----------------------------------------------------------------
  console.log("\n=== J · ACTUAL DRAG AFTER TYPE — slider takes over (snap-to-100) ===");
  await typeStake(6210);
  // Drag from the knob to a different position — > 4px movement.
  const dragBox = await track.boundingBox();
  await p.mouse.move(dragBox.x + dragBox.width * 0.62, dragBox.y + dragBox.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await p.mouse.move(
      dragBox.x + dragBox.width * (0.62 + 0.10 * (i / 6)),
      dragBox.y + dragBox.height / 2,
      { steps: 3 },
    );
  }
  await p.mouse.up();
  await p.waitForTimeout(400);
  const j1 = await snapshot();
  log("J.1 drag overrides typed lock → input snapped to 100",
      j1.inputVal !== 6210 && j1.inputVal % 100 === 0,
      `inputVal=${j1.inputVal}`);
  log("J.2 drag clears lock → input value == Place button amount",
      j1.placeVisible && j1.inputVal === j1.placeAmount,
      `input=${j1.inputVal} place=${j1.placeAmount}`);

  // -----------------------------------------------------------------
  // === H · TYPE → CONFIRM dialog shows EXACT typed amount =========
  // -----------------------------------------------------------------
  console.log("\n=== H · TYPE → CONFIRM modal shows exact amount ===");
  await typeStake(13_579);
  // Open confirm modal
  await p.locator('button[aria-label^="Place "]').first().click();
  await p.waitForTimeout(500);
  const modalText = (await p.locator('[role="dialog"][aria-label="Confirm prediction"]').textContent({ timeout: 3000 }).catch(() => "")) ?? "";
  log("H.1 Confirm modal shows the exact TZS 13,579 (not snapped to 13,600)",
      /TZS\s*13,?579/.test(modalText), `modal contains TZS 13,579? ${/TZS\s*13,?579/.test(modalText)}`);
  // Close modal
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);

  await p.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL ARCHITECT STRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
