/**
 * Capture the operator-guide screenshots FROM PRODUCTION.
 *
 *   node scripts/capture-guide-shots-live.mjs
 *   node scripts/capture-guide-shots-live.mjs --skip-create   (board already has a chain)
 *
 * ⛔ WHY NOT THE DEV SERVER. `capture-guide-shots.mjs` shoots a local dev build seeded with fake
 * rows. Its `rounds.png` shows a column of VOID at TZS 0 — a screen that no longer exists, from a
 * configuration that has been retired, presented in the manual as what the operator should expect.
 * An operator manual whose pictures do not match the screen is worse than one with no pictures,
 * because staff stop trusting it the first time a button is not where it was drawn.
 *
 * ⛔ ELEMENT SHOTS, NEVER `fullPage`. A fullPage capture of this console stitches a tall canvas
 * and renders sticky elements at the wrong offset — it invents layout bugs that are not there, and
 * this campaign has already chased two of them.
 *
 * ⚠️ Runs as the TRADING OFFICER against the real console, and CREATES ONE REAL CHAIN (BTC 5m) so
 * the populated-board and Generate pictures are real. That chain is left STOPPED and is the one an
 * operator can start from the guide.
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, login, browser } from "./live/harness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs/guide-img");
mkdirSync(OUT, { recursive: true });
const SKIP_CREATE = process.argv.includes("--skip-create");
const log = (...a) => console.log(...a);

/** ⛔ Element screenshot. Falls back to a viewport CLIP, never a fullPage. */
async function shoot(page, name, selector, opts = {}) {
  const path = resolve(OUT, `${name}.png`);
  if (selector) {
    const el = page.locator(selector).first();
    if (await el.count().catch(() => 0)) {
      if (await el.isVisible().catch(() => false)) {
        await el.screenshot({ path });
        log(`  ✓ ${name}.png  (element ${selector})`);
        return true;
      }
    }
    log(`  ! ${name}: ${selector} not visible`);
  }
  await page.screenshot({ path, clip: opts.clip ?? { x: 216, y: 0, width: 1224, height: 900 } });
  log(`  ✓ ${name}.png  (clip)`);
  return false;
}

const { b, ctx } = await browser();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 1100 });

try {
  await login(page, "trading");

  // ── 1 · The nav, cropped to "polls are here, Up & Down is there" ───────────
  // ⚠️ Anchored on the real elements, not fixed pixels: a 1000px viewport once cut the sidebar
  // just above "UP & DOWN", so the one picture whose whole job was to show where Up & Down lives
  // did not contain it.
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  {
    const box = await page.evaluate(() => {
      const all = [...document.querySelectorAll("aside *, nav *")];
      const from = all.find((e) => /^MARKETS/i.test((e.textContent ?? "").trim()) && e.children.length === 0);
      const to = all.find((e) => (e.textContent ?? "").trim() === "Rounds");
      if (!from || !to) return null;
      const a = from.getBoundingClientRect(), c = to.getBoundingClientRect();
      return { x: 0, y: Math.max(0, a.top - 14), width: 216, height: Math.min(900, c.bottom - a.top + 28) };
    });
    if (box) { await page.screenshot({ path: resolve(OUT, "nav.png"), clip: box }); log("  ✓ nav.png (cropped MARKETS → Rounds)"); }
    else { await page.screenshot({ path: resolve(OUT, "nav.png"), clip: { x: 0, y: 0, width: 216, height: 900 } }); log("  ! nav.png fell back to a fixed crop — CHECK IT"); }
  }

  // ── 2 · The empty board — what an operator sees on day one ─────────────────
  await shoot(page, "overview-empty", null, { clip: { x: 216, y: 0, width: 1224, height: 760 } });

  // ── 3 · The asset table, with the band per asset ───────────────────────────
  await shoot(page, "assets", "table:below(:text('Assets'))");

  // ── 4 · ADD ASSET, open, so every field and its dropdown is visible ────────
  {
    const btn = page.getByRole("button", { name: /\+\s*Add asset/i }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1200);
      await shoot(page, "form-add-asset", "form:has-text('Add asset')");
    } else log("  ! + Add asset not found");
  }

  // ── 5 · ADD CHAIN, open, with the readiness marks in the dropdowns ─────────
  {
    const btn = page.getByRole("button", { name: /\+\s*Add chain/i }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1200);
      await shoot(page, "form-add-chain", "form:has-text('Add chain')");

      if (!SKIP_CREATE) {
        // Create BTC 5m for real, so the populated pictures are not staged.
        const assetSel = page.locator("select[name='assetId']").first();
        const durSel = page.locator("select[name='durationMinutes']").first();
        if (await assetSel.count()) {
          const btcVal = await assetSel.locator("option").filter({ hasText: /BTC/ }).first().getAttribute("value");
          if (btcVal) await assetSel.selectOption(btcVal);
        }
        if (await durSel.count()) await durSel.selectOption("5").catch(() => {});
        await page.waitForTimeout(400);
        await page.getByRole("button", { name: /^Add chain$/i }).last().click();
        await page.waitForTimeout(6000);
        log("  · BTC 5m chain created (left STOPPED)");
      }
    } else log("  ! + Add chain not found");
  }

  // ── 6 · The populated chain table, with Generate / Start / Edit ────────────
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  // ⚠️ Name the CHAIN table by its own text. A bare `table` shot captured the ASSETS grid on the
  // first attempt, which is a different table on the same page — the picture looked plausible and
  // was of the wrong thing.
  await shoot(page, "chains", "table:has-text('Generate')");
  await shoot(page, "chain-health", "table:has-text('Paid a winner')");

  // ── 7 · The EDIT panel, so the band dropdown is documented ─────────────────
  {
    const edit = page.getByRole("button", { name: /^Edit$/i }).first();
    if (await edit.count()) {
      await edit.click();
      await page.waitForTimeout(1200);
      await shoot(page, "form-edit-chain", "form:has-text('Edit')");
    } else log("  ! Edit not found");
  }

  // ── 8 · The product settings panel ────────────────────────────────────────
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await shoot(page, "form-settings", "form:has-text('Staleness')");
  await shoot(page, "form-reading-method", "form:has-text('Reading method')");

  // ── 9 · The rounds screen ─────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/updown/rounds`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await shoot(page, "rounds", "table", { clip: { x: 216, y: 0, width: 1224, height: 700 } });

  await b.close();
} catch (e) {
  log(`  ❌ ${e.message}`);
  await page.screenshot({ path: resolve(OUT, "_error.png") }).catch(() => {});
  await b.close();
  process.exit(1);
}

log(`\nDone → docs/guide-img/  •  now: node scripts/generate-pdfs.mjs`);
