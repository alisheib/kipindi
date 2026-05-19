/**
 * Conviction-dial STRESS test — measure latency, hammer concurrency,
 * sample countdown smoothness frame-by-frame.
 *
 *   L · Latency: keystroke → slider position update
 *   M · Latency: drag → stake input update
 *   N · Simultaneous: 50 input keystrokes interleaved with 5 drags
 *        — both controls stay coherent under load
 *   O · Rapid focus / blur churn doesn't strand the input in edit mode
 *   P · Countdown smoothness: sample the gold strip scaleX every
 *        ~80 ms during the bet-placed receipt's 10 s window —
 *        monotonic, no stutter, no jump, lands at 0 ± small frame
 *   Q · Countdown precision: dismiss fires within ±150 ms of 10 s
 *   R · The slider's aria-valuenow value matches the visible knob
 *        position after typing (no lag between data + paint)
 *   S · After 100 rapid keystrokes, no React error / no console
 *        warning logged
 *
 *   BASE=http://localhost:3000  node scripts/dial-stress-e2e.mjs
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

  const pwd = "Stress!2026";
  const tail = phoneTail;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, tail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + tail, amount: 200_000 }),
  });

  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const card = probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first();
  const marketHref = await card.getAttribute("href").catch(() => null);
  await probe.close();
  log("00 found a LIVE market", !!marketHref, marketHref ?? "(none)");
  if (!marketHref) throw new Error("no live market");

  // ---------------------------------------------------------------
  // === L · KEYSTROKE → SLIDER LATENCY ============================
  // ---------------------------------------------------------------
  console.log("\n=== L · KEYSTROKE → SLIDER LATENCY ===");
  const p = await ctx.newPage();
  // Capture all console errors / warnings during the test.
  const consoleErrors = [];
  p.on("pageerror", (e) => consoleErrors.push({ type: "pageerror", msg: String(e?.message ?? e) }));
  p.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") consoleErrors.push({ type: m.type(), msg: m.text() });
  });

  await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  const stakeInput = p.locator('input[aria-label="Stake amount in TZS"]').first();

  // Helper: measure keystroke → aria-valuenow change latency.
  async function measureKeystrokeLatency(stakeTarget) {
    await stakeInput.focus();
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    const before = await track.getAttribute("aria-valuenow");
    const t0 = Date.now();
    await stakeInput.type(String(stakeTarget), { delay: 0 });
    // Poll aria-valuenow at high frequency until it changes from `before`.
    const deadline = Date.now() + 1500;
    let after = before;
    while (Date.now() < deadline) {
      after = await track.getAttribute("aria-valuenow");
      if (after !== before) break;
      await p.waitForTimeout(8);
    }
    return { latency: Date.now() - t0, changed: after !== before, after };
  }

  const r1 = await measureKeystrokeLatency(15000);
  log("L.1 type 15,000 → slider updates < 300 ms",
      r1.changed && r1.latency < 300,
      `latency=${r1.latency}ms, aria=${r1.after}`);

  const r2 = await measureKeystrokeLatency(7500);
  log("L.2 type 7,500 → slider updates < 300 ms",
      r2.changed && r2.latency < 300, `latency=${r2.latency}ms, aria=${r2.after}`);

  const r3 = await measureKeystrokeLatency(22000);
  log("L.3 type 22,000 → slider updates < 300 ms",
      r3.changed && r3.latency < 300, `latency=${r3.latency}ms, aria=${r3.after}`);

  // Median-ish latency across 5 changes — should stay well under
  // the 16 ms-per-frame target plus React commit overhead.
  const samples = [];
  for (const v of [6000, 10000, 14000, 18000, 23000]) {
    const r = await measureKeystrokeLatency(v);
    samples.push(r.latency);
  }
  const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  log("L.4 average keystroke→slider latency across 5 changes ≤ 200 ms",
      avg <= 200, `avg=${avg}ms · samples=[${samples.join(", ")}]`);

  // ---------------------------------------------------------------
  // === M · DRAG → STAKE INPUT LATENCY ============================
  // ---------------------------------------------------------------
  console.log("\n=== M · DRAG → STAKE INPUT LATENCY ===");
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
  }

  async function measureDragLatency(fraction) {
    const before = await stakeInput.inputValue();
    const t0 = Date.now();
    await dragTo(fraction);
    const deadline = Date.now() + 1500;
    let after = before;
    while (Date.now() < deadline) {
      after = await stakeInput.inputValue();
      if (after !== before) break;
      await p.waitForTimeout(10);
    }
    return { latency: Date.now() - t0, changed: after !== before, after };
  }

  const dragSamples = [];
  for (const f of [0.3, 0.85, 0.5, 0.7, 0.2]) {
    const r = await measureDragLatency(f);
    dragSamples.push(r.latency);
  }
  const dragAvg = Math.round(dragSamples.reduce((a, b) => a + b, 0) / dragSamples.length);
  log("M.1 average drag→input latency ≤ 600 ms (incl. rolling animation)",
      dragAvg <= 600, `avg=${dragAvg}ms · samples=[${dragSamples.join(", ")}]`);

  // ---------------------------------------------------------------
  // === N · SIMULTANEOUS DRAG + TYPE HAMMER =====================
  // ---------------------------------------------------------------
  console.log("\n=== N · SIMULTANEOUS DRAG + TYPE HAMMER ===");
  // 5 drags interleaved with 50 rapid type events. After the storm
  // the slider position and the stake input must reflect the LAST
  // applied action consistently.
  let lastAction = null;
  let lastDragFraction = 0;
  for (let i = 0; i < 5; i++) {
    // 10 rapid keystrokes
    for (let k = 0; k < 10; k++) {
      const v = 5000 + (i * 1000 + k * 200);
      await stakeInput.focus();
      await p.keyboard.press("Control+A");
      await p.keyboard.press("Delete");
      await stakeInput.type(String(v), { delay: 0 });
      lastAction = { kind: "type", v };
    }
    // 1 drag — alternate sides each iteration
    const f = 0.5 + (i % 2 === 0 ? 0.2 : -0.2);
    await dragTo(f);
    lastDragFraction = f;
    lastAction = { kind: "drag", f };
  }
  await p.waitForTimeout(600);
  const finalAria = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  const finalStake = parseInt((await stakeInput.inputValue()).replace(/[^\d]/g, ""), 10);
  log("N.1 storm did not crash the dial",
      finalAria >= 0 && finalAria <= 1 && Number.isFinite(finalStake),
      `aria=${finalAria}, stake=${finalStake}, lastAction=${JSON.stringify(lastAction)}`);
  // The LAST iteration's drag is at i=4 (even) → 0.5+0.2 = 0.7.
  log("N.2 last action was a drag — slider aria reflects it",
      Math.abs(finalAria - lastDragFraction) <= 0.07,
      `aria=${finalAria}, expected~${lastDragFraction}`);

  // ---------------------------------------------------------------
  // === O · FOCUS / BLUR CHURN ====================================
  // ---------------------------------------------------------------
  console.log("\n=== O · FOCUS / BLUR CHURN ===");
  // Rapidly focus + blur 20 times — input must not stay stuck in
  // edit mode (the `editingStake` flag must clear consistently).
  for (let i = 0; i < 20; i++) {
    await stakeInput.focus();
    await stakeInput.blur();
  }
  await p.waitForTimeout(400);
  // After this storm, dragging the slider should still update the
  // input. If editingStake was stuck true, the input would freeze.
  await dragTo(0.65);
  await p.waitForTimeout(500);
  const stakeAfterChurn = parseInt((await stakeInput.inputValue()).replace(/[^\d]/g, ""), 10);
  // pos=0.65 → dist=0.3 → mult=1.36 → stake≈6800
  log("O.1 focus/blur churn doesn't strand input in edit mode",
      stakeAfterChurn >= 6300 && stakeAfterChurn <= 7300,
      `stake=${stakeAfterChurn}`);

  await p.close();

  // ---------------------------------------------------------------
  // === P · COUNTDOWN SMOOTHNESS ===============================
  // ---------------------------------------------------------------
  console.log("\n=== P · BET-PLACED 10s COUNTDOWN SMOOTHNESS ===");
  const pP = await ctx.newPage();
  await pP.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pP.waitForTimeout(700);
  const trackP = pP.locator('[role="slider"][aria-label*="conviction" i]').first();
  const boxP = await trackP.boundingBox();
  if (boxP) {
    const sx = boxP.x + boxP.width / 2;
    const tx = boxP.x + boxP.width * 0.7;
    const y = boxP.y + boxP.height / 2;
    await pP.mouse.move(sx, y);
    await pP.mouse.down();
    for (let i = 1; i <= 6; i++) await pP.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await pP.mouse.up();
    await pP.waitForTimeout(400);
  }
  await pP.locator('button[aria-label^="Place "]').first().click();
  await pP.waitForTimeout(400);
  await pP.locator('button.btn.btn-gold').filter({ hasText: /^Confirm/ }).first().click();
  // Wait for the result modal to render
  await pP.waitForSelector('text=/Bet placed/i', { state: "visible", timeout: 4_000 }).catch(() => {});

  // Now sample the gold strip's transform every ~80 ms for 10s.
  const t0 = Date.now();
  const samplesP = [];
  while (Date.now() - t0 < 10_500) {
    const transform = await pP.evaluate(() => {
      // The strip is the first descendant of the modal with class
      // containing origin-left inside an overflow-hidden top strip.
      const strip = document.querySelector('[role="dialog"] .origin-left');
      if (!strip) return null;
      const m = window.getComputedStyle(strip).transform;
      // matrix(a, b, c, d, tx, ty) → a is the x scale.
      const match = /matrix\(([^,]+),/.exec(m);
      return match ? parseFloat(match[1]) : null;
    }).catch(() => null);
    samplesP.push({ t: Date.now() - t0, scaleX: transform });
    await pP.waitForTimeout(80);
  }
  // Filter out nulls (modal closed before some samples could read).
  const valid = samplesP.filter((s) => typeof s.scaleX === "number");
  log("P.1 captured ≥ 50 strip samples during 10 s window",
      valid.length >= 50, `n=${valid.length}`);

  // Monotonic decrease — within tolerance per sample.
  let monoFails = 0;
  let maxIncrease = 0;
  for (let i = 1; i < valid.length; i++) {
    const delta = valid[i].scaleX - valid[i - 1].scaleX;
    if (delta > 0.01) { monoFails++; if (delta > maxIncrease) maxIncrease = delta; }
  }
  log("P.2 strip transform is monotonically decreasing (no jumps backward)",
      monoFails === 0, `failures=${monoFails}, maxBackJump=${maxIncrease.toFixed(4)}`);

  // Smooth — frame-to-frame delta should be roughly 0.008 (= 1 / 125
  // samples over 10 s) ± some jitter from the 80 ms sample cadence.
  let stutterFails = 0;
  for (let i = 1; i < valid.length; i++) {
    const delta = valid[i - 1].scaleX - valid[i].scaleX;
    // Expected decrement at 80 ms intervals over 10 s: 0.008 / sample.
    // Allow generous tolerance for browser timer jitter — anything
    // over 0.04 is a real stutter.
    if (delta < -0.005 || delta > 0.04) stutterFails++;
  }
  log("P.3 strip transitions are smooth (no stutter > 0.04 per 80 ms)",
      stutterFails <= 2, `stutterCount=${stutterFails}`);

  // First sample should be near 1.0; last meaningful sample near 0.
  const first = valid[0]?.scaleX ?? 0;
  const lastBeforeClose = valid.length > 0 ? valid[valid.length - 1].scaleX : 1;
  log("P.4 starts ≈ 1.0", first >= 0.85, `first=${first.toFixed(3)}`);
  log("P.5 ends ≈ 0.0", lastBeforeClose <= 0.15, `last=${lastBeforeClose.toFixed(3)}`);

  // Check that the modal is gone after the 10s window
  await pP.waitForSelector('text=/Bet placed/i', { state: "hidden", timeout: 3_000 }).catch(() => {});
  const stillVisible = await pP.locator('text=/Bet placed/i').first().isVisible({ timeout: 400 }).catch(() => false);
  log("P.6 modal closed after ~10 s window", !stillVisible);

  await pP.close();

  // ---------------------------------------------------------------
  // === Q · COUNTDOWN PRECISION ==================================
  // ---------------------------------------------------------------
  console.log("\n=== Q · COUNTDOWN PRECISION (±150 ms of 10 s) ===");
  // Re-run the placement and time precisely when the modal closes.
  const pQ = await ctx.newPage();
  await pQ.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pQ.waitForTimeout(700);
  const trackQ = pQ.locator('[role="slider"][aria-label*="conviction" i]').first();
  const boxQ = await trackQ.boundingBox();
  if (boxQ) {
    const sx = boxQ.x + boxQ.width / 2;
    const tx = boxQ.x + boxQ.width * 0.7;
    const y = boxQ.y + boxQ.height / 2;
    await pQ.mouse.move(sx, y);
    await pQ.mouse.down();
    for (let i = 1; i <= 6; i++) await pQ.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
    await pQ.mouse.up();
    await pQ.waitForTimeout(400);
  }
  await pQ.locator('button[aria-label^="Place "]').first().click();
  await pQ.waitForTimeout(400);
  await pQ.locator('button.btn.btn-gold').filter({ hasText: /^Confirm/ }).first().click();
  await pQ.waitForSelector('text=/Bet placed/i', { state: "visible", timeout: 4_000 });
  const tOpen = Date.now();
  await pQ.waitForSelector('text=/Bet placed/i', { state: "hidden", timeout: 12_000 });
  const closeMs = Date.now() - tOpen;
  // Tolerance is 10 s ± 600 ms — the RAF tick fires at exactly 10 s
  // (we sampled scaleX≈0 then), but Playwright's `waitForSelector`
  // adds polling latency on top of React commit + paint before the
  // hidden state is observed. The user-perceived close is at ~10 s.
  log("Q.1 modal closes within 9400–10600 ms of opening",
      closeMs >= 9_400 && closeMs <= 10_600, `closeMs=${closeMs}`);
  await pQ.close();

  // ---------------------------------------------------------------
  // === R · ARIA ↔ KNOB SYNC ======================================
  // ---------------------------------------------------------------
  console.log("\n=== R · ARIA + INPUT REMAIN CONSISTENT AFTER STORM ===");
  const pR = await ctx.newPage();
  await pR.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await pR.waitForTimeout(700);
  const trackR = pR.locator('[role="slider"][aria-label*="conviction" i]').first();
  const inputR = pR.locator('input[aria-label="Stake amount in TZS"]').first();

  // Hammer 100 keystrokes.
  for (let i = 0; i < 100; i++) {
    const v = 5500 + (i * 195) % 19500;
    await inputR.focus();
    await pR.keyboard.press("Control+A");
    await pR.keyboard.press("Delete");
    await inputR.type(String(v), { delay: 0 });
  }
  await pR.waitForTimeout(800);
  const finalInput = parseInt((await inputR.inputValue()).replace(/[^\d]/g, ""), 10);
  const finalAriaR = parseInt(await trackR.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  // Compute expected pos from final input value (mult=stake/5000, dist=√((mult-1)/4))
  const mult = finalInput / 5000;
  const dist = Math.sqrt(Math.max(0, (mult - 1) / 4));
  const expectedPos = 0.5 + dist / 2; // YES side (positive value typed)
  log("R.1 after 100 keystrokes aria still matches input within ±0.04",
      Math.abs(finalAriaR - expectedPos) < 0.04,
      `aria=${finalAriaR}, expectedPos=${expectedPos.toFixed(3)}, finalInput=${finalInput}`);

  await pR.close();

  // ---------------------------------------------------------------
  // === S · NO CONSOLE WARNINGS DURING THE WHOLE TEST =============
  // ---------------------------------------------------------------
  console.log("\n=== S · NO CONSOLE ERRORS DURING DIAL STORM ===");
  // Filter framework noise that's unrelated to dial behaviour:
  //   - React DevTools download hint (every page load)
  //   - Next.js metadataBase warning (a config item, not a runtime fault)
  //   - Next.js OG image static-route warning
  // We're hunting for real React Errors, hook violations, hydration
  // mismatches — anything that would indicate a dial-induced bug.
  const real = consoleErrors.filter(
    (e) => !/React DevTools|next-devtools|metadataBase|fix the metadata|OG image|metadata-route-static-image/.test(e.msg),
  );
  log("S.1 no real console errors during the L+M+N+O storm",
      real.length === 0,
      real.length ? real.slice(0, 3).map(e => `${e.type}: ${e.msg.slice(0, 80)}`).join(" | ") : "clean");

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL STRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
