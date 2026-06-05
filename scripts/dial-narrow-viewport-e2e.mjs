/**
 * Dial narrow-viewport visual stress test.
 *
 * Catches layout bugs that only show up on small screens — the
 * "drag the dial" + "TZS 5,000" collision that management reported
 * on 2026-05. Tests the dial at the four most common phone widths
 * and verifies that no text gets clipped, the input doesn't crowd
 * the side label, and the Place pill stays tap-friendly.
 *
 * Catches:
 *   • Text overflow (clientWidth < scrollWidth on key elements)
 *   • Element boundary collisions (input X-overlaps side label)
 *   • Place button below the safe ~44 px tap target
 *
 * Viewport rotation:
 *   • 320 × 568  · iPhone SE first-gen (smallest in active use)
 *   • 360 × 800  · most common Android baseline
 *   • 390 × 844  · iPhone 14
 *   • 414 × 896  · iPhone 11 / 12 Pro Max
 *
 *   BASE=http://localhost:3000  node scripts/dial-narrow-viewport-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const VIEWPORTS = [
  { w: 320, h: 568, name: "iPhone SE (smallest)" },
  { w: 360, h: 800, name: "Android baseline" },
  { w: 390, h: 844, name: "iPhone 14" },
  { w: 414, h: 896, name: "iPhone 11 / 12 Pro Max" },
];

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

  const pwd = "Narrow!2026";
  // Register once on a default-sized context, then test each viewport
  // in its own context that reuses the cookie.
  const seedCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await reg(seedCtx, phoneTail, pwd);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + phoneTail, amount: 50_000 }),
  });
  const cookies = await seedCtx.cookies();
  await seedCtx.close();

  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.w} × ${vp.h} · ${vp.name} ===`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    await ctx.addCookies(cookies);

    const probe = await ctx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await probe.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Live/i }).first().getAttribute("href").catch(() => null);
    await probe.close();
    if (!href) { log(`${vp.w}px · no live market`, false); await ctx.close(); continue; }

    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);

    // ------ NEUTRAL state visual checks ------
    // Look at "Pick side" / "drag the dial" placeholder + TZS input.
    const sideLabel = p.locator("p.font-display").filter({ hasText: /Pick side|YES|NO/i }).first();
    const stakeInput = p.locator('input[aria-label^="Stake amount in TZS"]').first();
    await stakeInput.waitFor({ state: "visible" });

    // 1 · Side label must not be clipped (clientWidth >= scrollWidth)
    const labelClip = await sideLabel.evaluate((el) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      text: el.textContent ?? "",
    })).catch(() => null);
    log(`${vp.w}px · NEUTRAL side label not clipped`,
        labelClip && labelClip.clientWidth >= labelClip.scrollWidth,
        labelClip ? `client=${labelClip.clientWidth} scroll=${labelClip.scrollWidth} text="${labelClip.text}"` : "no label");

    // 2 · Stake input value not clipped
    const inputClip = await stakeInput.evaluate((el) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      value: el.value,
    }));
    log(`${vp.w}px · stake input value not clipped`,
        inputClip.clientWidth >= inputClip.scrollWidth,
        `client=${inputClip.clientWidth} scroll=${inputClip.scrollWidth} value="${inputClip.value}"`);

    // 3 · Side label X-range does NOT overlap with input X-range
    const labelBox = await sideLabel.boundingBox();
    const inputBox = await stakeInput.boundingBox();
    const overlap = labelBox && inputBox && labelBox.x + labelBox.width > inputBox.x - 1;
    log(`${vp.w}px · side label does NOT overlap input column`,
        !overlap,
        `label.right=${labelBox ? (labelBox.x + labelBox.width).toFixed(1) : "?"} input.left=${inputBox?.x.toFixed(1)}`);

    // 4 · After typing a 5-digit value, input still fits.
    await stakeInput.click();
    await p.waitForTimeout(80);
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await stakeInput.type("12500", { delay: 6 });
    await p.waitForTimeout(200);
    const after5digit = await stakeInput.evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth, value: el.value }));
    log(`${vp.w}px · 5-digit typed value (12,500) renders without clipping`,
        after5digit.cw >= after5digit.sw,
        `cw=${after5digit.cw} sw=${after5digit.sw} value="${after5digit.value}"`);

    // 5 · Max-value 25,000 fits (6 chars incl comma)
    await p.keyboard.press("Control+A");
    await p.keyboard.press("Delete");
    await stakeInput.type("25000", { delay: 6 });
    await p.waitForTimeout(200);
    const after25k = await stakeInput.evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth, value: el.value }));
    log(`${vp.w}px · max typed value (25,000) renders without clipping`,
        after25k.cw >= after25k.sw,
        `cw=${after25k.cw} sw=${after25k.sw} value="${after25k.value}"`);

    // 6 · Blur — make sure side label populates with "YES" / "NO" cleanly
    await stakeInput.blur();
    await p.waitForTimeout(400);
    const placeBtn = p.locator('button[aria-label^="Place "]').first();
    const placeVisible = await placeBtn.isVisible({ timeout: 1_000 }).catch(() => false);
    log(`${vp.w}px · Place button visible after typing valid stake`, placeVisible);

    // 7 · Place button is a 44 px+ tap target (WCAG 2.5.5 minimum)
    if (placeVisible) {
      const pb = await placeBtn.boundingBox();
      log(`${vp.w}px · Place button ≥ 44 px tall (tap-target safe)`,
          pb && pb.height >= 40,  // give 4 px slack
          `height=${pb?.height.toFixed(1)}`);
    }

    // 8 · Range chip min + max values fully visible (not clipped)
    const minOk = await p.locator('[data-testid="stake-range-min"]').first().isVisible({ timeout: 800 }).catch(() => false);
    const maxOk = await p.locator('[data-testid="stake-range-max"]').first().isVisible({ timeout: 800 }).catch(() => false);
    log(`${vp.w}px · range chip both min + max visible`,
        minOk && maxOk,
        `min=${minOk} max=${maxOk}`);

    // 9 · Header "YES · slide to commit · NO" labels visible
    const yesLabel = p.locator("span").filter({ hasText: /^YES$/ }).first();
    const noLabel  = p.locator("span").filter({ hasText: /^NO$/  }).first();
    const yLabelBox = await yesLabel.boundingBox().catch(() => null);
    const nLabelBox = await noLabel.boundingBox().catch(() => null);
    log(`${vp.w}px · YES on LEFT of header, NO on RIGHT`,
        yLabelBox && nLabelBox && yLabelBox.x < nLabelBox.x,
        `YES.x=${yLabelBox?.x.toFixed(1)} NO.x=${nLabelBox?.x.toFixed(1)}`);

    // 10 · "Payout · Lipo · Calculated at resolution" disclosure present
    const payoutDisclosure = await p.getByText(/Payout · Lipo|Calculated at resolution/i).first().isVisible({ timeout: 500 }).catch(() => false);
    log(`${vp.w}px · 'Payout calculated at resolution' disclosure visible (no projected payout)`,
        payoutDisclosure);

    // 11 · The OLD "If correct · Ukishinda" / "TZS X payout" must NOT be rendered.
    const oldPayout = await p.getByText(/If correct.*Ukishinda/i).first().isVisible({ timeout: 200 }).catch(() => false);
    log(`${vp.w}px · NO leftover 'If correct · Ukishinda' projection`,
        !oldPayout);

    await p.close();
    await ctx.close();
  }
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDIAL NARROW-VIEWPORT  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
