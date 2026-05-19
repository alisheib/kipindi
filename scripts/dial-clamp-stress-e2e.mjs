/**
 * Dial clamp + affordance stress test.
 *
 * Verifies the manual stake input:
 *   - Looks editable (border + pencil icon visible before focus)
 *   - Lights up on focus
 *   - Lights claret when typed value is out of the dial range
 *   - The dial position is always within the dial's representable
 *     range, regardless of what the user types
 *   - On blur, the input value snaps to the clamped value (so the
 *     player sees the same number the dial represents)
 *   - The slider can't end up at a fraction outside [0, 1]
 *
 *   BASE=http://localhost:3000  node scripts/dial-clamp-stress-e2e.mjs
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

  const pwd = "Clamp!2026";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 50_000 }),
  });

  // Find a LIVE market to load the dial.
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const marketHref = await probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first().getAttribute("href").catch(() => null);
  await probe.close();
  log("00 found a LIVE market", !!marketHref, marketHref ?? "(none)");
  if (!marketHref) throw new Error("no live market");

  const p = await ctx.newPage();
  await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);

  const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  const stakeInput = p.locator('input[aria-label*="Stake amount in TZS"]').first();
  // Wait for the dial to mount.
  await stakeInput.waitFor({ state: "visible", timeout: 5_000 });

  // -----------------------------------------------------------------
  // === A · AFFORDANCE ============================================
  // -----------------------------------------------------------------
  console.log("\n=== A · INPUT LOOKS EDITABLE BEFORE TOUCH ===");
  // Pencil + edit label both reachable in the DOM before focus.
  const pencilVisible = await p.locator('svg.lucide-pencil').first().isVisible({ timeout: 2_000 }).catch(() => false);
  log("A.1 Pencil icon visible next to 'Stake' label", pencilVisible);
  const editLabel = await p.getByText(/Stake\s*·\s*dau\s*·\s*edit/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  log("A.2 'Stake · dau · edit' helper text visible", editLabel);
  const rangeLabel = await p.getByText(/5,?000.*–.*25,?000.*type or slide/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  log("A.3 range helper '5,000 – 25,000 · type or slide' visible", rangeLabel);

  // The pill should have a visible border before focus (not just text).
  const borderColorBefore = await stakeInput.evaluate((el) => {
    return window.getComputedStyle(el.closest("label")).borderColor;
  });
  log("A.4 wrapper label has a visible border before focus",
      !!borderColorBefore && !borderColorBefore.includes("rgba(0, 0, 0, 0)"),
      `borderColor=${borderColorBefore}`);

  // -----------------------------------------------------------------
  // === B · FOCUS STATE LIGHTS UP =================================
  // -----------------------------------------------------------------
  console.log("\n=== B · FOCUS STATE ===");
  await stakeInput.focus();
  await p.waitForTimeout(200);
  const borderFocus = await stakeInput.evaluate((el) => {
    return window.getComputedStyle(el.closest("label")).borderColor;
  });
  log("B.1 border changes on focus (gold) — distinct from blur color",
      borderFocus !== borderColorBefore, `before=${borderColorBefore} focus=${borderFocus}`);

  // -----------------------------------------------------------------
  // === C · OVER-MAX TYPING SHOWS CLARET HINT =====================
  // -----------------------------------------------------------------
  console.log("\n=== C · OVER-MAX TYPING ===");
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("999999", { delay: 6 });
  await p.waitForTimeout(300);

  // The "Max 25,000" hint should now be visible.
  const overMaxHint = await p.getByText(/Max\s+25,?000\s*·\s*adjusts on blur/i).first().isVisible({ timeout: 1_500 }).catch(() => false);
  log("C.1 over-max typing shows 'Max 25,000 · adjusts on blur' hint",
      overMaxHint);

  // aria-invalid should be true.
  const invalidAttr = await stakeInput.getAttribute("aria-invalid");
  log("C.2 aria-invalid='true' on out-of-range value",
      invalidAttr === "true", `aria-invalid=${invalidAttr}`);

  // Slider position should be clamped to 1.0 (max).
  const ariaAtMax = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  log("C.3 slider position clamped to 1.0 even though input shows 999,999",
      ariaAtMax === 1.0, `aria=${ariaAtMax}`);

  // Input still shows the typed value (let user see what they typed).
  const typedValueShown = await stakeInput.inputValue();
  log("C.4 input still shows '999999' (we don't fight the user mid-type)",
      typedValueShown === "999999", `value=${typedValueShown}`);

  // -----------------------------------------------------------------
  // === D · ON BLUR THE INPUT SETTLES TO THE CLAMPED VALUE =========
  // -----------------------------------------------------------------
  console.log("\n=== D · BLUR SETTLES TO CLAMPED VALUE ===");
  await stakeInput.blur();
  await p.waitForTimeout(400);
  const settledMax = await stakeInput.inputValue();
  log("D.1 input snaps to '25,000' on blur after typing 999,999",
      /25,?000/.test(settledMax), `value=${settledMax}`);

  // -----------------------------------------------------------------
  // === E · UNDER-MIN TYPING SHOWS CLARET HINT ====================
  // -----------------------------------------------------------------
  console.log("\n=== E · UNDER-MIN TYPING ===");
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("1000", { delay: 6 });
  await p.waitForTimeout(300);

  const underMinHint = await p.getByText(/Min\s+5,?000\s*·\s*adjusts on blur/i).first().isVisible({ timeout: 1_500 }).catch(() => false);
  log("E.1 under-min typing shows 'Min 5,000 · adjusts on blur' hint",
      underMinHint);

  const ariaAtMin = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  log("E.2 slider clamps to centre (mult=1) when under-min typed",
      Math.abs(ariaAtMin - 0.5) < 0.04, `aria=${ariaAtMin}`);

  await stakeInput.blur();
  await p.waitForTimeout(400);
  const settledMin = await stakeInput.inputValue();
  log("E.3 input snaps to '5,000' on blur after typing 1000",
      /5,?000/.test(settledMin), `value=${settledMin}`);

  // -----------------------------------------------------------------
  // === F · LONG-NUMBER PASTE CAPPED AT 7 DIGITS ==================
  // -----------------------------------------------------------------
  console.log("\n=== F · LONG-NUMBER PASTE GUARD ===");
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("123456789012345", { delay: 0 });
  await p.waitForTimeout(300);
  const capped = await stakeInput.inputValue();
  log("F.1 long paste truncates to 7 digits max (no layout-break)",
      capped.length <= 7, `value=${capped}`);

  // The slider should still be at max (1.0) since the 7-digit number
  // (1234567) is well above maxDial.
  const ariaLong = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  log("F.2 slider clamps to 1.0 on huge paste",
      ariaLong === 1.0, `aria=${ariaLong}`);
  await stakeInput.blur();
  await p.waitForTimeout(400);
  const settledLong = await stakeInput.inputValue();
  log("F.3 input snaps to 25,000 on blur",
      /25,?000/.test(settledLong), `value=${settledLong}`);

  // -----------------------------------------------------------------
  // === G · ZERO AND EMPTY HANDLED =================================
  // -----------------------------------------------------------------
  console.log("\n=== G · ZERO + EMPTY ===");
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("0", { delay: 6 });
  await p.waitForTimeout(200);
  const ariaZero = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10);
  log("G.1 typing '0' doesn't drive slider out of [0, 100]",
      ariaZero >= 0 && ariaZero <= 100, `aria=${ariaZero}`);

  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await p.waitForTimeout(200);
  const ariaEmpty = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10);
  log("G.2 empty input doesn't crash; slider stays sane",
      ariaEmpty >= 0 && ariaEmpty <= 100, `aria=${ariaEmpty}`);
  await stakeInput.blur();
  await p.waitForTimeout(400);
  // After blur with empty/zero, the input shows whatever the slider
  // currently maps to — should be a non-empty stake string.
  const blurredEmpty = await stakeInput.inputValue();
  log("G.3 empty/zero settles to a non-empty value after blur",
      blurredEmpty.length > 0, `value=${blurredEmpty}`);

  // -----------------------------------------------------------------
  // === H · SLIDER POSITION ALWAYS WITHIN [0, 1] ==================
  // -----------------------------------------------------------------
  console.log("\n=== H · INVARIANT: aria-valuenow ∈ [0, 100] ALWAYS ===");
  // Spam 30 random values across [-1M, +1M] and at each step
  // confirm the slider is in range.
  const samples = [-999999, -1, 0, 1, 100, 5000, 5001, 6000, 12500, 17500,
                   24999, 25000, 25001, 30000, 99999, 999999, 1e8,
                   42, 0, 1, 5000, 25000, 1, 9999999, 7777777, 3333, 50000, 60000, 70000, 80000];
  let outOfRange = 0;
  for (const v of samples) {
    await stakeInput.focus();
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await stakeInput.type(String(Math.max(0, v)), { delay: 0 });
    const aria = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10);
    if (aria < 0 || aria > 100) outOfRange++;
  }
  log(`H.1 across ${samples.length} edge values the slider stayed in [0, 100]`,
      outOfRange === 0, `outOfRange=${outOfRange}`);

  // -----------------------------------------------------------------
  // === I · CORRECT-THEN-CONTINUE — typing recovers from overrun ==
  // -----------------------------------------------------------------
  console.log("\n=== I · TYPE OVER MAX, BACKSPACE, TYPE VALID — clean ===");
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("99999", { delay: 6 });
  await p.waitForTimeout(200);
  // Out of range now
  const hintBefore = await p.getByText(/Max\s+25,?000/).first().isVisible({ timeout: 800 }).catch(() => false);
  log("I.1 hint shown while typing over max", hintBefore);

  // User corrects to a valid value
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("15000", { delay: 6 });
  await p.waitForTimeout(300);
  const hintAfter = await p.getByText(/Max\s+25,?000/).first().isVisible({ timeout: 600 }).catch(() => false);
  log("I.2 hint disappears once a valid value is typed", !hintAfter);

  // Range helper line should be back.
  const rangeBack = await p.getByText(/5,?000.*–.*25,?000.*type or slide/i).first().isVisible({ timeout: 600 }).catch(() => false);
  log("I.3 range helper '5,000 – 25,000 · type or slide' is back", rangeBack);

  await p.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL CLAMP STRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
