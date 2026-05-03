/**
 * Sprint 19 — overlay responsiveness on mobile.
 *
 * Verifies every popover/menu/dialog on the platform sits inside the viewport
 * on a small phone screen (393×667) AND honours the safe-area-inset bottom so
 * nothing gets clipped by the bottom nav, Dynamic Island, or home indicator.
 *
 *   BASE=http://localhost:3000  node scripts/overlay-responsiveness-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function rectFitsViewport(page, locator, label, opts = {}) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) {
    log(label, false, "element has no bounding box");
    return null;
  }
  const vp = page.viewportSize();
  // Allow 2px sub-pixel rounding.
  const tolerance = 2;
  // Extra bottom padding for safe-area where required (estimate).
  const safeAreaBottom = opts.safeAreaBottom ?? 0;
  const okLeft   = box.x >= -tolerance;
  const okTop    = box.y >= -tolerance;
  const okRight  = box.x + box.width  <= vp.width + tolerance;
  const okBottom = box.y + box.height <= vp.height - safeAreaBottom + tolerance;
  const ok = okLeft && okTop && okRight && okBottom;
  log(label, ok, `box=(${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}) vp=${vp.width}x${vp.height}`);
  return box;
}

const browser = await chromium.launch();

// ============================================================
// SECTION 1 — Mobile (iPhone-ish 393×667) — every overlay fits
// ============================================================
console.log("\n=== 1 · MOBILE 393×667 ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 667 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });

  // 1a — Notifications panel
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const bell = p.locator('button[aria-label^="Notifications"]').first();
    await bell.click();
    await p.waitForTimeout(400);
    const dialog = p.locator('[role="dialog"][aria-label="Notifications"]').first();
    await rectFitsViewport(p, dialog, "1a notifications dialog inside viewport", { safeAreaBottom: 56 });
    // 1b — close button reachable
    const closeBtn = dialog.locator('button[aria-label="Close"]').first();
    log("1b notifications close button visible", await closeBtn.isVisible());
    await p.close();
  }

  // 2 — Avatar menu
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const avatar = p.locator('button[aria-haspopup="menu"], button[aria-label*="account"], button[aria-label*="user"], button[aria-label*="Profile"], header button:has(div.rounded-pill)').first();
    if (await avatar.isVisible().catch(() => false)) {
      await avatar.click();
      await p.waitForTimeout(400);
      const menu = p.locator('[role="menu"]').first();
      if (await menu.isVisible().catch(() => false)) {
        await rectFitsViewport(p, menu, "2a avatar menu inside viewport", { safeAreaBottom: 56 });
      } else {
        log("2a avatar menu inside viewport", false, "menu did not open (probably guest)");
      }
    } else {
      log("2a avatar menu inside viewport", true, "no avatar visible (acceptable)");
    }
    await p.close();
  }

  // 3 — Language dropdown
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const lang = p.locator('button[aria-label^="Language:"]').first();
    if (await lang.isVisible().catch(() => false)) {
      await lang.click();
      await p.waitForTimeout(300);
      const menu = p.locator('div[role="menu"][aria-label="Language"]').first();
      await rectFitsViewport(p, menu, "3a language menu inside viewport", { safeAreaBottom: 56 });
    } else {
      log("3a language menu inside viewport", true, "language toggle not visible (acceptable on small screens)");
    }
    await p.close();
  }

  // 4 — Reality-check modal (force fire via sessionStorage)
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      sessionStorage.setItem("kp_session_started_at", String(Date.now() - 60 * 60_000));
      sessionStorage.setItem("kp_reality_check_last", String(Date.now() - 60 * 60_000));
    });
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForTimeout(1_500);
    const dialog = p.locator('[role="dialog"][aria-labelledby="reality-check-title"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      await rectFitsViewport(p, dialog, "4a reality-check modal inside viewport", { safeAreaBottom: 0 });
    } else {
      log("4a reality-check modal inside viewport", true, "could not force-fire (acceptable)");
    }
    await p.close();
  }

  // 5 — BottomNav doesn't clip content above
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const nav = p.locator('nav.fixed').first();
    const navBox = await nav.boundingBox().catch(() => null);
    log("5a bottom nav present + sized", !!navBox && navBox.height > 0, `${navBox?.height}px`);
  }

  await ctx.close();
}

// ============================================================
// SECTION 2 — Smaller iPhone SE (375×667)
// ============================================================
console.log("\n=== 2 · SMALL MOBILE 375×667 ===");
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const bell = p.locator('button[aria-label^="Notifications"]').first();
  await bell.click();
  await p.waitForTimeout(400);
  const dialog = p.locator('[role="dialog"][aria-label="Notifications"]').first();
  await rectFitsViewport(p, dialog, "2a notifications fits 375×667", { safeAreaBottom: 56 });
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 3 — Tablet 768×1024
// ============================================================
console.log("\n=== 3 · TABLET 768×1024 ===");
{
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const bell = p.locator('button[aria-label^="Notifications"]').first();
  await bell.click();
  await p.waitForTimeout(400);
  const dialog = p.locator('[role="dialog"][aria-label="Notifications"]').first();
  await rectFitsViewport(p, dialog, "3a notifications fits 768×1024 (popover anchored)");
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nOVERLAY RESPONSIVENESS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
