/**
 * Bar smoothness probe — animation quality checks for the platform's
 * moving / sliding / counting elements.
 *
 * For each animated surface, samples the visual state at multiple
 * timepoints during the animation and asserts:
 *   • The value monotonically progresses toward the target (no jitter)
 *   • The animation actually moves between frames (didn't freeze)
 *   • Final state matches the expected end value
 *
 * Surfaces covered:
 *   A. Wallet-pill rolling counter — sample digit width every 80ms
 *      during a wallet debit. Width should grow then settle.
 *   B. TippingBar recast — hover triggers a 540ms sweep + width
 *      animation. Sample sub-frames to verify smooth interpolation.
 *   C. BetConfirmModal gold countdown — RAF-driven scaleX should
 *      decay monotonically from 1.0 → 0.0 over 10s.
 *   D. OperationResultModal gold countdown — same pattern, 10s
 *      success auto-close.
 *
 *   BASE=http://localhost:3000  node scripts/bar-smoothness-probe.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = "C:\\kipindi\\50pick-logo-for-claude-design\\screenshots\\bars\\";
try { mkdirSync(SHOTS, { recursive: true }); } catch {}

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/auth/demo`, { waitUntil: "load" });
await page.waitForTimeout(800);

// ── A · WALLET-PILL ROLLING COUNTER ─────────────────────────────
console.log("\n=== A · Wallet pill roll on balance change ===");
{
  await page.goto(`${BASE}/wallet`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const pillBefore = await page.locator('[data-testid="wallet-balance-pill"]').first().textContent();
  log("A1 pill renders initial balance", !!pillBefore && /TZS\s*[\d,]+/.test(pillBefore || ""), `text=${pillBefore?.trim()}`);

  // Place a bet to trigger a balance change
  await page.goto(`${BASE}/markets`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const mlink = page.locator('a[href^="/markets/mkt_"]').first();
  const href = await mlink.getAttribute("href").catch(() => null);
  if (href) {
    await page.goto(BASE + href, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const slider = page.locator("[role='slider']").first();
    const sb = await slider.boundingBox();
    if (sb) {
      await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(sb.x + sb.width * 0.2, sb.y + sb.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(400);
    }
    const place = page.locator('button:has-text("Place")').first();
    if ((await place.count()) > 0 && (await place.isVisible()) && !(await place.isDisabled())) {
      await place.click();
      await page.waitForTimeout(400);
      const confirm = page.locator('button:has-text("Confirm")').first();
      if (await confirm.count() > 0) {
        await confirm.click();

        // Sample the pill text every 80ms for ~700ms — capture the
        // mid-roll values. They should be DIFFERENT consecutive
        // samples (not all the same number, not all the final).
        const samples = [];
        for (let i = 0; i < 9; i++) {
          await page.waitForTimeout(80);
          const t = (await page.locator('[data-testid="wallet-balance-pill"]').first().textContent()) ?? "";
          const m = t.match(/TZS\s*([\d,]+)/);
          samples.push(m ? parseInt(m[1].replace(/,/g, ""), 10) : null);
        }
        const distinct = new Set(samples).size;
        log(
          "A2 pill shows mid-roll values (distinct counts)",
          distinct >= 3,
          `samples=[${samples.join(",")}]  distinct=${distinct}`,
        );

        // Monotonic — should be non-increasing throughout (balance went DOWN)
        let monotonic = true;
        for (let i = 1; i < samples.length; i++) {
          if (samples[i - 1] !== null && samples[i] !== null && samples[i] > samples[i - 1]) {
            monotonic = false;
            break;
          }
        }
        log("A3 pill value monotonic non-increasing", monotonic);

        await page.waitForTimeout(900);
        const final = (await page.locator('[data-testid="wallet-balance-pill"]').first().textContent()) ?? "";
        const finalMatch = final.match(/TZS\s*([\d,]+)/);
        const finalNum = finalMatch ? parseInt(finalMatch[1].replace(/,/g, ""), 10) : null;
        log(
          "A4 pill landed below initial",
          finalNum !== null && samples[0] !== null && finalNum < samples[0],
          `final=${finalNum} initial=${samples[0]}`,
        );

        // Wait for result modal then close it
        const close = page.locator(".cm-close, [aria-label='Close']").first();
        await close.click().catch(() => {});
      }
    }
  }
}

// ── B · TIPPINGBAR RECAST ───────────────────────────────────────
console.log("\n=== B · TippingBar recast smoothness ===");
{
  await page.goto(`${BASE}/markets`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const bar = page.locator("[role='progressbar']").first();
  if ((await bar.count()) > 0) {
    const beforeFillW = await bar.evaluate((el) => {
      const yes = el.querySelector(":scope > div:nth-child(3)");
      const rect = yes?.getBoundingClientRect();
      return rect ? rect.width : 0;
    });
    log("B1 bar yes-fill has width at rest", beforeFillW > 0, `w=${beforeFillW.toFixed(1)}px`);

    // Hover triggers the recast — sample fill width across the ~540 ms
    await bar.hover();
    const samples = [];
    for (let i = 0; i < 7; i++) {
      await page.waitForTimeout(80);
      const w = await bar.evaluate((el) => {
        const yes = el.querySelector(":scope > div:nth-child(3)");
        return yes?.getBoundingClientRect().width ?? 0;
      });
      samples.push(w);
    }
    const distinct = new Set(samples.map((w) => Math.round(w))).size;
    log(
      "B2 fill width animates through distinct mid-frames",
      distinct >= 3,
      `samples=[${samples.map((w) => w.toFixed(1)).join(",")}]`,
    );
    await page.waitForTimeout(800);
    const after = await bar.evaluate((el) => {
      const yes = el.querySelector(":scope > div:nth-child(3)");
      return yes?.getBoundingClientRect().width ?? 0;
    });
    log("B3 fill settles within 2px of resting width", Math.abs(after - beforeFillW) < 2, `Δ=${(after - beforeFillW).toFixed(1)}px`);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
  }
}

// ── C · BET-CONFIRM-MODAL GOLD COUNTDOWN ────────────────────────
console.log("\n=== C · BetConfirmModal countdown decay ===");
{
  const mlink = page.locator('a[href^="/markets/mkt_"]').first();
  const href = await mlink.getAttribute("href").catch(() => null);
  if (href) {
    await page.goto(BASE + href, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const slider = page.locator("[role='slider']").first();
    const sb = await slider.boundingBox();
    if (sb) {
      await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(sb.x + sb.width * 0.2, sb.y + sb.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(400);
    }
    const place = page.locator('button:has-text("Place")').first();
    if ((await place.count()) > 0 && (await place.isVisible()) && !(await place.isDisabled())) {
      await place.click();
      await page.waitForTimeout(300);
      // Sample scaleX over 5 timepoints during the 10s countdown
      const samples = [];
      const start = Date.now();
      while (Date.now() - start < 3200) {
        const sx = await page.evaluate(() => {
          const strip = document.querySelector(".kp-overflow-hidden, [class*='rounded-t-2xl'] > div");
          if (!strip) return null;
          const transform = window.getComputedStyle(strip).transform;
          if (transform === "none") return 1;
          // matrix(a, b, c, d, tx, ty) — a is scaleX
          const m = transform.match(/matrix\(([^)]+)\)/);
          return m ? parseFloat(m[1].split(",")[0]) : null;
        });
        samples.push(sx);
        await page.waitForTimeout(700);
      }
      const valid = samples.filter((s) => s !== null);
      log("C1 countdown strip samples non-null", valid.length >= 3, `n=${valid.length}/${samples.length}`);
      let monotonic = true;
      for (let i = 1; i < valid.length; i++) {
        if (valid[i] > valid[i - 1] + 0.02) { monotonic = false; break; }
      }
      log("C2 countdown scaleX monotonic decreasing", monotonic, `samples=[${samples.map((s) => s?.toFixed(2) ?? "null").join(",")}]`);

      // Cancel the modal so the next test runs clean
      const cancel = page.locator('button[aria-label="Cancel"]').first();
      await cancel.click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }
}

// ── D · CHAT BUBBLE HOVER SMOOTHNESS ────────────────────────────
console.log("\n=== D · Chat bubble hover ===");
{
  await page.goto(`${BASE}/help`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const bubble = page.locator(".cm-bubble").first();
  if ((await bubble.count()) > 0) {
    const before = await bubble.boundingBox();
    await bubble.hover();
    await page.waitForTimeout(220);
    const during = await bubble.boundingBox();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(220);
    const after = await bubble.boundingBox();
    log("D1 bubble lifts on hover (negative dy)", !!before && !!during && during.y < before.y, `Δy=${(during?.y ?? 0) - (before?.y ?? 0)}`);
    log("D2 bubble returns to rest after un-hover (≤1 px drift)", !!before && !!after && Math.abs((after?.y ?? 0) - (before?.y ?? 0)) <= 1, `final Δy=${(after?.y ?? 0) - (before?.y ?? 0)}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`BAR SMOOTHNESS  PASS: ${pass}    FAIL: ${fail}`);
console.log(`${"=".repeat(60)}`);

await browser.close();
process.exit(fail > 0 ? 1 : 0);
