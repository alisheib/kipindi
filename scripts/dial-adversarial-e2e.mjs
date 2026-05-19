/**
 * Conviction-dial adversarial UI tests — try to break the dial and
 * the bet-placement countdown in every way a real player or QA
 * might prod it.
 *
 * Coverage:
 *   A · Slider position correctness at every fraction
 *   B · Manual stake input → slider position sync (inverse curve)
 *   C · Clamping: typed amount below baseStake / above baseStake×5 /
 *       zero / negative / paste with non-digits / very large numbers
 *   D · Keyboard navigation (Arrow keys, Home/End, Enter) inside the
 *       stake input must NOT shift the slider (event isolation)
 *   E · Side preservation when typing — stay on whatever side the
 *       slider is currently on (YES stays YES, NO stays NO)
 *   F · BetConfirmModal countdown — bar starts full, ends empty,
 *       auto-dismisses at ~5s (the pre-place quote-hold)
 *   G · OperationResultModal — opens after Confirm, gold bar starts
 *       full, auto-closes at exactly ~10 s ± 250 ms (the new bet-
 *       placed receipt timing)
 *   H · Rapid input spam — 20 keystroke-equivalent changes don't
 *       desync the slider
 *   I · Drag → type → drag interaction (manual input doesn't trap
 *       the slider; user can resume dragging immediately)
 *
 *   BASE=http://localhost:3000  node scripts/dial-adversarial-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}
function near(actual, expected, tol = 0.02) {
  return Math.abs(actual - expected) <= tol;
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

  // Provision a player + seed wallet so confirm-place flow can fire.
  const pwd = "Dial!2026";
  const tail = phoneTail;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, tail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + tail, amount: 200_000 }),
  });

  // Find a LIVE Demo market for the dial.
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const card = probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first();
  const marketHref = await card.getAttribute("href").catch(() => null);
  await probe.close();
  log("00 found a LIVE market", !!marketHref, marketHref ?? "(none)");
  if (!marketHref) throw new Error("no live market");

  // -------------------------------------------------------------------
  // === A · SLIDER FRACTIONS MAP TO EXPECTED STAKES ==================
  // -------------------------------------------------------------------
  // Drag the dial to specific fractions and read the stake input value.
  // baseStake defaults to 5,000 per ConvictionDial Props. Expected:
  //   pos=0.5 → mult=1.00 → stake≈5,000
  //   pos=0.7 → dist=0.4 → mult=1+4·0.16=1.64 → stake≈8,200
  //   pos=0.9 → dist=0.8 → mult=1+4·0.64=3.56 → stake≈17,800
  //   pos=1.0 → dist=1.0 → mult=5.00 → stake≈25,000
  // -------------------------------------------------------------------
  console.log("\n=== A · SLIDER POSITION → STAKE ===");
  const p = await ctx.newPage();
  await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  const stakeInput = p.locator('input[aria-label^="Stake amount in TZS"]').first();
  log("A.0 track + stake input visible",
      (await track.isVisible().catch(() => false)) && (await stakeInput.isVisible().catch(() => false)));

  async function dragTo(fraction) {
    const box = await track.boundingBox();
    if (!box) return;
    const sx = box.x + box.width / 2;
    const tx = box.x + box.width * fraction;
    const y = box.y + box.height / 2;
    await p.mouse.move(sx, y);
    await p.mouse.down();
    for (let i = 1; i <= 6; i++) await p.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await p.mouse.up();
    await p.waitForTimeout(450);
  }
  async function readStake() {
    const v = await stakeInput.inputValue();
    return parseInt(v.replace(/[^\d]/g, ""), 10);
  }

  await dragTo(0.5);
  let s = await readStake();
  log("A.1 pos=0.5 → ~5,000 (mult 1×)", near(s, 5000, 200), `stake=${s}`);

  await dragTo(0.7);
  s = await readStake();
  // tolerate ±300 because of the rolling-number animation timing
  log("A.2 pos=0.7 → ~8,200 (mult 1.64×)", Math.abs(s - 8200) <= 400, `stake=${s}`);

  await dragTo(1.0);
  s = await readStake();
  log("A.3 pos=1.0 → ~25,000 (mult 5×)", Math.abs(s - 25000) <= 500, `stake=${s}`);

  await dragTo(0.0);
  s = await readStake();
  log("A.4 pos=0.0 → ~25,000 (mult 5× on NO side)", Math.abs(s - 25000) <= 500, `stake=${s}`);

  // -------------------------------------------------------------------
  // === B · MANUAL INPUT → SLIDER POSITION ==========================
  // -------------------------------------------------------------------
  console.log("\n=== B · MANUAL INPUT → SLIDER ===");
  async function typeStake(value) {
    await stakeInput.focus();
    await p.waitForTimeout(80);
    // Clear via select-all (focus() in our component already selects)
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await stakeInput.type(String(value), { delay: 18 });
    await p.waitForTimeout(300);
  }
  async function readPosFromAria() {
    const v = await track.getAttribute("aria-valuenow").catch(() => null);
    return v ? parseInt(v, 10) / 100 : null; // 0..1
  }

  // Start on YES side so subsequent type tests stay on YES
  await dragTo(0.7);
  await typeStake(8200);
  const pos82 = await readPosFromAria();
  log("B.1 type 8,200 → pos≈0.70 (YES side)", pos82 !== null && near(pos82, 0.70, 0.04),
      `pos=${pos82}`);

  await typeStake(17800);
  const pos178 = await readPosFromAria();
  log("B.2 type 17,800 → pos≈0.90 (YES side)", pos178 !== null && near(pos178, 0.90, 0.04),
      `pos=${pos178}`);

  await typeStake(5000);
  const pos50 = await readPosFromAria();
  // 5000 = baseStake = mult 1 = pos 0.5 (NEUTRAL). But our code preserves
  // side: typing on YES, stays on YES. So pos goes to 0.5 + 0 = 0.5 anyway.
  log("B.3 type 5,000 → pos≈0.50 (back to centre)", pos50 !== null && near(pos50, 0.50, 0.04),
      `pos=${pos50}`);

  await typeStake(25000);
  const pos250 = await readPosFromAria();
  log("B.4 type 25,000 → pos=1.00 (extreme YES)", pos250 !== null && near(pos250, 1.0, 0.02),
      `pos=${pos250}`);

  // -------------------------------------------------------------------
  // === C · CLAMPING ON EDGE INPUTS ==================================
  // -------------------------------------------------------------------
  console.log("\n=== C · CLAMPING + INVALID INPUT ===");

  // Above max → clamps to max (pos=1.0)
  await typeStake(999999);
  const posMax = await readPosFromAria();
  log("C.1 type 999,999 → pos clamps to 1.0", posMax !== null && near(posMax, 1.0, 0.02),
      `pos=${posMax}`);

  // Below baseStake → clamps to baseStake (pos≈0.5)
  await typeStake(1000);
  const posMin = await readPosFromAria();
  log("C.2 type 1,000 → pos clamps to ~0.5 (mult 1×)", posMin !== null && near(posMin, 0.5, 0.04),
      `pos=${posMin}`);

  // Zero — should not crash. Slider stays where it was (or snaps to 0.5).
  await typeStake(0);
  const posZero = await readPosFromAria();
  log("C.3 type 0 → no crash, sane pos", posZero !== null && posZero >= 0 && posZero <= 1,
      `pos=${posZero}`);

  // Paste with non-digits — should strip to digits only.
  await stakeInput.focus();
  await p.keyboard.press("Control+A");
  await p.keyboard.press("Delete");
  await stakeInput.type("TZS 12,345", { delay: 18 });
  await p.waitForTimeout(300);
  const sAfterPaste = await readStake();
  log("C.4 paste 'TZS 12,345' → stake reads 12,345 (digits-only)",
      sAfterPaste === 12345, `stake=${sAfterPaste}`);

  // -------------------------------------------------------------------
  // === D · KEYBOARD EVENT ISOLATION =================================
  // -------------------------------------------------------------------
  console.log("\n=== D · ARROW KEYS INSIDE INPUT DON'T MOVE SLIDER ===");
  // Drag to a known position, then press arrows while focused on input.
  // The dial's keyboard handler listens for Arrow keys at the slider
  // level; with stopPropagation in the input, those should not bubble.
  await dragTo(0.75);
  const posBefore = await readPosFromAria();
  await stakeInput.focus();
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press("ArrowLeft");
    await p.waitForTimeout(40);
  }
  const posAfterArrows = await readPosFromAria();
  log("D.1 Arrow keys inside input don't shift slider",
      Math.abs((posAfterArrows ?? 0) - (posBefore ?? 0)) <= 0.05,
      `before=${posBefore} after=${posAfterArrows}`);

  // -------------------------------------------------------------------
  // === E · SIDE PRESERVATION ON TYPE =================================
  // -------------------------------------------------------------------
  console.log("\n=== E · SIDE PRESERVATION ===");
  // Drag to NO side, then type — should stay on NO side.
  await dragTo(0.3);
  await p.waitForTimeout(200);
  const sideBeforeNo = await readPosFromAria();
  await typeStake(10000);
  const sideAfterNoType = await readPosFromAria();
  log("E.1 NO side preserved when typing",
      sideAfterNoType !== null && sideAfterNoType < 0.5 && sideBeforeNo !== null && sideBeforeNo < 0.5,
      `before=${sideBeforeNo} after=${sideAfterNoType}`);

  // Drag to YES side, type — should stay on YES.
  await dragTo(0.8);
  await typeStake(12000);
  const sideAfterYes = await readPosFromAria();
  log("E.2 YES side preserved when typing",
      sideAfterYes !== null && sideAfterYes > 0.5, `pos=${sideAfterYes}`);

  // -------------------------------------------------------------------
  // === F · BETCONFIRMMODAL COUNTDOWN ===============================
  // -------------------------------------------------------------------
  console.log("\n=== F · BET CONFIRM MODAL — 5s quote-hold ===");
  // Set up a fresh page — the previous one had focused input state.
  await p.close();
  const pF = await ctx.newPage();
  await pF.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pF.waitForTimeout(700);
  const trackF = pF.locator('[role="slider"][aria-label*="conviction" i]').first();
  const boxF = await trackF.boundingBox();
  if (boxF) {
    const sx = boxF.x + boxF.width / 2;
    const tx = boxF.x + boxF.width * 0.7;
    const y = boxF.y + boxF.height / 2;
    await pF.mouse.move(sx, y);
    await pF.mouse.down();
    for (let i = 1; i <= 6; i++) await pF.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await pF.mouse.up();
    await pF.waitForTimeout(400);
  }

  const pill = pF.locator('button[aria-label^="Place "]').first();
  await pill.click();
  await pF.waitForTimeout(300);
  const confirmModalVisible = await pF.locator('[role="dialog"][aria-label="Confirm prediction"]')
    .isVisible({ timeout: 2_000 }).catch(() => false);
  log("F.1 confirm modal opens", confirmModalVisible);

  // Bar starts at scaleX=1 (or close to it)
  const t0 = Date.now();
  const barF = pF.locator('[role="dialog"][aria-label="Confirm prediction"] div.origin-left').first();
  const initialBoxF = await barF.boundingBox().catch(() => null);
  log("F.2 bar visible + has width", !!initialBoxF && initialBoxF.width > 10);

  // Wait for the modal to auto-dismiss at ~5s
  await pF.waitForSelector('[role="dialog"][aria-label="Confirm prediction"]', { state: "hidden", timeout: 7_000 }).catch(() => {});
  const elapsed = Date.now() - t0;
  log("F.3 modal auto-dismisses around 5s",
      elapsed >= 4500 && elapsed <= 6500, `elapsed=${elapsed}ms`);
  await pF.close();

  // -------------------------------------------------------------------
  // === G · OPERATIONRESULTMODAL — 10s bet-placed receipt ============
  // -------------------------------------------------------------------
  console.log("\n=== G · BET-PLACED RECEIPT — 10s ===");
  const pG = await ctx.newPage();
  await pG.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pG.waitForTimeout(700);
  const trackG = pG.locator('[role="slider"][aria-label*="conviction" i]').first();
  const boxG = await trackG.boundingBox();
  if (boxG) {
    const sx = boxG.x + boxG.width / 2;
    const tx = boxG.x + boxG.width * 0.7;
    const y = boxG.y + boxG.height / 2;
    await pG.mouse.move(sx, y);
    await pG.mouse.down();
    for (let i = 1; i <= 6; i++) await pG.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await pG.mouse.up();
    await pG.waitForTimeout(400);
  }
  await pG.locator('button[aria-label^="Place "]').first().click();
  await pG.waitForTimeout(500);
  const confirmBtn = pG.locator('button.btn.btn-gold').filter({ hasText: /^Confirm/ }).first();
  await confirmBtn.click();

  // Wait for the result modal to APPEAR
  await pG.waitForSelector('[role="dialog"][aria-label*="YES"], [role="dialog"][aria-label*="TZS"]',
    { state: "visible", timeout: 5_000 }).catch(() => {});
  const t1 = Date.now();
  const resultVisible = await pG.locator('text=/Bet placed/i').first()
    .isVisible({ timeout: 3_000 }).catch(() => false);
  log("G.1 result modal opens with 'Bet placed'", resultVisible);

  // Wait for it to auto-close — should be ~10s, not the old 5s
  await pG.waitForSelector('text=/Bet placed/i', { state: "hidden", timeout: 14_000 }).catch(() => {});
  const elapsedG = Date.now() - t1;
  log("G.2 result modal auto-closes around 10s (NOT 5s)",
      elapsedG >= 9000 && elapsedG <= 11500, `elapsed=${elapsedG}ms`);
  await pG.close();

  // -------------------------------------------------------------------
  // === H · RAPID INPUT SPAM ==========================================
  // -------------------------------------------------------------------
  console.log("\n=== H · RAPID INPUT DOESN'T DESYNC SLIDER ===");
  const pH = await ctx.newPage();
  await pH.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pH.waitForTimeout(700);
  const trackH = pH.locator('[role="slider"][aria-label*="conviction" i]').first();
  const stakeH = pH.locator('input[aria-label^="Stake amount in TZS"]').first();
  // Set initial side to YES
  {
    const box = await trackH.boundingBox();
    if (box) {
      await pH.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await pH.mouse.down();
      await pH.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 8 });
      await pH.mouse.up();
      await pH.waitForTimeout(300);
    }
  }
  // Fire 20 rapid typed amounts
  const spamValues = [6000, 9000, 12000, 7000, 15000, 8000, 22000, 5000, 18000, 11000,
                     6500, 13500, 16500, 19500, 21500, 17500, 14500, 12500, 9500, 7500];
  for (const v of spamValues) {
    await stakeH.focus();
    await pH.keyboard.press("Control+A");
    await pH.keyboard.press("Delete");
    await stakeH.type(String(v), { delay: 6 });
  }
  await pH.waitForTimeout(500);
  const finalStakeH = parseInt((await stakeH.inputValue()).replace(/[^\d]/g, ""), 10);
  log("H.1 input ends on the last spammed value (7,500)",
      finalStakeH === 7500, `final=${finalStakeH}`);
  const posFinalH = parseInt(await trackH.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  // 7,500 = mult 1.5 = dist 0.354 = pos 0.677 (on YES side)
  log("H.2 slider matches the final value (~0.68)", near(posFinalH, 0.677, 0.05),
      `pos=${posFinalH}`);
  await pH.close();

  // -------------------------------------------------------------------
  // === I · DRAG → TYPE → DRAG INTERLEAVED ==========================
  // -------------------------------------------------------------------
  console.log("\n=== I · DRAG + TYPE + DRAG INTERACTIONS ===");
  const pI = await ctx.newPage();
  await pI.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pI.waitForTimeout(700);
  const trackI = pI.locator('[role="slider"][aria-label*="conviction" i]').first();
  const stakeI = pI.locator('input[aria-label^="Stake amount in TZS"]').first();
  async function dragI(fraction) {
    const box = await trackI.boundingBox();
    if (!box) return;
    const sx = box.x + box.width / 2;
    const tx = box.x + box.width * fraction;
    const y = box.y + box.height / 2;
    await pI.mouse.move(sx, y);
    await pI.mouse.down();
    for (let i = 1; i <= 6; i++) await pI.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await pI.mouse.up();
    await pI.waitForTimeout(350);
  }
  await dragI(0.85);
  const after1 = parseInt((await stakeI.inputValue()).replace(/[^\d]/g, ""), 10);
  // Type something
  await stakeI.focus();
  await pI.keyboard.press("Control+A");
  await pI.keyboard.press("Delete");
  await stakeI.type("10000", { delay: 12 });
  await pI.waitForTimeout(300);
  const after2 = parseInt(await trackI.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  // 10000 = mult 2 = dist sqrt(0.25)=0.5 = pos 0.75 (on YES side)
  log("I.1 drag-then-type lands at the typed value",
      near(after2, 0.75, 0.05), `pos=${after2}, drag-was=${after1}`);

  // Now drag again — slider should respond freely (not locked by input)
  await dragI(0.20);
  const after3 = parseInt(await trackI.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  log("I.2 drag after typing still moves slider", near(after3, 0.20, 0.05),
      `pos=${after3}`);
  // pos=0.20 → dist=0.6 → mult=1+4·0.36=2.44 → stake≈12,200 (NO side).
  // The point of the assertion is: the input must update from the
  // slider, NOT stay frozen at the previously-typed 10,000 value.
  const after3Stake = parseInt((await stakeI.inputValue()).replace(/[^\d]/g, ""), 10);
  log("I.3 stake input updates from the new drag (not frozen at typed value)",
      after3Stake !== 10000 && after3Stake >= 11500 && after3Stake <= 13000,
      `stake=${after3Stake} (expected ≈12,200 for pos=0.20)`);
  await pI.close();

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL ADVERSARIAL  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
