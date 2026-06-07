/**
 * Dial EXACT-VALUE stress test.
 *
 * The user reported: "typed 104, dial moved to 100". Root cause was
 * the drag-derived stake snapping to the nearest 100 TZS (a UX
 * convenience for the continuous slider). When a player types an
 * exact value the typed number should win — no quiet rounding.
 *
 * What this checks:
 *   A · Type 10,475 → bet is exactly 10,475 (no snap to 10,500)
 *   B · Type 8,237 → bet is 8,237 (no snap to 8,200)
 *   C · Type 5,134 → bet is 5,134 (not 5,100, not 5,200)
 *   D · Drag the slider AFTER typing — exact lock clears, snap-to-
 *       100 resumes (drag is "vibe" mode, not "precise" mode)
 *   E · Keyboard arrow on the slider after typing — exact lock
 *       clears too (any slider-driven movement is a mode shift)
 *   F · Type a value, blur, re-focus, type again — the new value
 *       wins exactly
 *   G · Place button shows the EXACT typed amount (10,475), not
 *       the snapped one
 *   H · Out-of-range typed value (99,999) → clamps to max 25,000
 *       and the EXACT 25,000 is what's used (not snapped to a
 *       rounder number nearby)
 *   I · Affordance: input pill has a visible heavy border at rest,
 *       gold accent rule, lifted background — clearly editable
 *
 *   BASE=http://localhost:3000  node scripts/dial-exact-stress-e2e.mjs
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

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const pwd = "Exact!2026";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(ctx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 100_000 }),
  });

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
  const stakeInput = p.locator('input[aria-label^="Stake amount in TZS"]').first();
  await stakeInput.waitFor({ state: "visible", timeout: 5_000 });

  async function typeStake(value) {
    await stakeInput.focus();
    await p.waitForTimeout(80);
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await stakeInput.type(String(value), { delay: 12 });
    await p.waitForTimeout(350);
  }
  async function readPlaceLabel() {
    const btn = p.locator('button[aria-label^="Place "]').first();
    const text = await btn.textContent({ timeout: 800 }).catch(() => "");
    return text;
  }
  async function readStakeInput() {
    const v = await stakeInput.inputValue();
    return parseInt(v.replace(/[^\d]/g, ""), 10);
  }

  // -----------------------------------------------------------------
  // === A · TYPE EXACT VALUES — NO SNAP ============================
  // -----------------------------------------------------------------
  // Make sure we're on the YES side first so the Place button shows.
  // 12,500 is in range; setting it via type also locks exactStake.
  console.log("\n=== A · EXACT TYPED VALUES ARE PRESERVED ===");
  await typeStake(10475);
  const s1 = await readStakeInput();
  log("A.1 type 10,475 → input still reads 10,475 (no snap)",
      s1 === 10475, `value=${s1}`);
  const place1 = await readPlaceLabel();
  log("A.2 Place button shows the exact 10,475",
      /TZS\s*10,?475/.test(place1), `label="${place1?.trim()}"`);

  await typeStake(8237);
  const s2 = await readStakeInput();
  log("A.3 type 8,237 → input reads 8,237 (no snap to 8,200)",
      s2 === 8237, `value=${s2}`);
  const place2 = await readPlaceLabel();
  log("A.4 Place button shows the exact 8,237",
      /TZS\s*8,?237/.test(place2), `label="${place2?.trim()}"`);

  await typeStake(5134);
  const s3 = await readStakeInput();
  log("A.5 type 5,134 → input reads 5,134 (no snap to 5,100 or 5,200)",
      s3 === 5134, `value=${s3}`);

  await typeStake(23789);
  const s4 = await readStakeInput();
  log("A.6 type 23,789 → input reads 23,789 (no snap to 23,800)",
      s4 === 23789, `value=${s4}`);
  const place4 = await readPlaceLabel();
  log("A.7 Place button shows the exact 23,789",
      /TZS\s*23,?789/.test(place4), `label="${place4?.trim()}"`);

  // -----------------------------------------------------------------
  // === B · DRAG AFTER TYPE → snap resumes =========================
  // -----------------------------------------------------------------
  console.log("\n=== B · DRAG CLEARS THE EXACT LOCK ===");
  // Currently on 23,789. Drag the slider; the snap-to-100 should
  // resume.
  const box = await track.boundingBox();
  const sx = box.x + box.width / 2;
  const tx = box.x + box.width * 0.6;
  const y = box.y + box.height / 2;
  await p.mouse.move(sx, y);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(700);

  const sAfterDrag = await readStakeInput();
  // After dragging, the stake should be the snap-to-100 value.
  // pos=0.6 → dist=0.2 → mult=1.16 → stake=5800 (snapped to 5800).
  log("B.1 drag after type → input shows snapped value (multiple of 100)",
      sAfterDrag % 100 === 0, `stake=${sAfterDrag}`);
  log("B.2 drag value is approximately right for pos 0.6",
      sAfterDrag >= 5500 && sAfterDrag <= 6100, `stake=${sAfterDrag}`);

  // -----------------------------------------------------------------
  // === C · TYPE → BLUR → TYPE AGAIN ===============================
  // -----------------------------------------------------------------
  console.log("\n=== C · TYPE → BLUR → TYPE AGAIN ===");
  await typeStake(12345);
  const c1 = await readStakeInput();
  log("C.1 first type 12,345 lands exactly", c1 === 12345, `value=${c1}`);

  // Blur (click outside the input — but stay in the dial card).
  await stakeInput.blur();
  await p.waitForTimeout(400);
  const c2 = await readStakeInput();
  log("C.2 after blur, input still reads 12,345 (no surprise re-rounding)",
      c2 === 12345, `value=${c2}`);

  await typeStake(7891);
  const c3 = await readStakeInput();
  log("C.3 second type 7,891 lands exactly", c3 === 7891, `value=${c3}`);

  // -----------------------------------------------------------------
  // === D · OUT-OF-RANGE TYPED → CLAMP-EXACT =======================
  // -----------------------------------------------------------------
  console.log("\n=== D · OUT-OF-RANGE TYPED → CLAMPED EXACT ===");
  await typeStake(99999);
  // While typing, the slider clamps to max (1.0) and the Place
  // button shows the clamped max amount.
  const ariaAtMax = parseInt(await track.getAttribute("aria-valuenow") ?? "0", 10) / 100;
  log("D.1 slider clamps to 1.0 on out-of-range type",
      ariaAtMax === 1.0, `aria=${ariaAtMax}`);
  // The Place button reflects the clamped EXACT value (25,000 — not
  // some random nearby snapped number).
  const place99 = await readPlaceLabel();
  log("D.2 Place button shows the exact clamped value 25,000",
      /TZS\s*25,?000/.test(place99), `label="${place99?.trim()}"`);

  // -----------------------------------------------------------------
  // === E · KEYBOARD ARROW ON SLIDER CLEARS THE LOCK ================
  // -----------------------------------------------------------------
  console.log("\n=== E · KEYBOARD ARROW CLEARS EXACT LOCK ===");
  // Type an exact value, then focus the slider, press Arrow keys.
  await typeStake(15678);
  await stakeInput.blur();
  await track.focus();
  await p.waitForTimeout(200);
  // Two arrow lefts — moves the slider toward NO.
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.press("ArrowLeft");
  await p.waitForTimeout(400);
  const sAfterArrow = await readStakeInput();
  log("E.1 keyboard arrow after type → stake is snapped (multiple of 100)",
      sAfterArrow % 100 === 0,
      `stake=${sAfterArrow}`);

  // -----------------------------------------------------------------
  // === F · AFFORDANCE: pill looks editable at rest =================
  // -----------------------------------------------------------------
  console.log("\n=== F · AFFORDANCE AT REST ===");
  // Refresh the page so we're back to the default state.
  await p.goto(`${BASE}${marketHref}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const stakeInput2 = p.locator('input[aria-label^="Stake amount in TZS"]').first();
  await stakeInput2.waitFor({ state: "visible" });

  // The kit Input atom wraps prefix + input + trailing in a <span>
  // with the recognisable form-field treatment. Walk up the DOM to
  // find that wrapper (the one with `rounded-md` class).
  const findWrapperStyle = async (prop) => stakeInput2.evaluate((el, p) => {
    let node = el.parentElement;
    while (node && !node.className.includes("rounded-md")) node = node.parentElement;
    return node ? window.getComputedStyle(node).getPropertyValue(p) : "";
  }, prop);

  const borderWidth = await findWrapperStyle("border-width");
  log("F.1 input wrapper has a visible border at rest",
      borderWidth && parseFloat(borderWidth) > 0,
      `borderWidth=${borderWidth}`);

  const bgColor = await findWrapperStyle("background-color");
  log("F.2 input wrapper has a non-transparent background at rest",
      bgColor && bgColor !== "rgba(0, 0, 0, 0)" && !bgColor.endsWith(", 0)"),
      `bg=${bgColor}`);

  // Kit Input has a TZS prefix sub-cell — visible at rest, separates
  // the unit from the typed amount with a vertical rule (border-r).
  const prefixVisible = await p.getByText(/^TZS$/).first().isVisible({ timeout: 1_500 }).catch(() => false);
  log("F.3 'TZS' prefix sub-cell visible inside the input", prefixVisible);

  // Pencil icon trailing inside the input (extra "you can edit" cue).
  const pencil = await p.locator('svg.lucide-pencil').first().isVisible({ timeout: 1_500 }).catch(() => false);
  log("F.4 pencil icon trailing inside the input", pencil);

  // Range helper present at rest.
  // Range chip — kit-grade gradient mini-bar between min and max.
  const minRange = await p.locator('[data-testid="stake-range-min"]').first().isVisible({ timeout: 1_500 }).catch(() => false);
  const maxRange = await p.locator('[data-testid="stake-range-max"]').first().isVisible({ timeout: 1_500 }).catch(() => false);
  log("F.5 stake-range-min + stake-range-max both visible", minRange && maxRange);

  await p.close();
  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL EXACT STRESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
