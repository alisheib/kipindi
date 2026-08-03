/**
 * Screenshots for `docs/runbooks/50pick-markets-runbook.pdf`, captured from LIVE production.
 *
 *   SHOT_DIR=docs/runbooks/markets-assets node scripts/live-markets-guide-shots.mjs
 *
 * ⚠️ EACH SURFACE IS SHOT AS THE ROLE THAT OWNS IT, never as ADMIN-for-convenience.
 * `/admin/markets`, `/admin/resolver-queue`, `/admin/ai-polls`, `/admin/proposals` and
 * `/admin/candidates` are `trading` routes; `/admin/settlement` is `accounting`;
 * `/admin/objections` is `compliance`. A runbook shot entirely as the Owner shows
 * controls its reader will not have, and teaches them the product is broken when a
 * button they were promised is missing. The role is recorded in every caption.
 *
 * ⚠️ ELEMENT-SCOPED, not cropped by pixel coordinates. Session 12 cropped by hard-coded
 * x/y out of one composite and shipped a figure of the WRONG ROUND under a caption that
 * described the worked example. A locator names the thing; coordinates name a rectangle.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { login, BASE, SHOT } from "./live/harness.mjs";

mkdirSync(SHOT, { recursive: true });

/** Shoot one element, named by what it IS. Returns false if it never appeared. */
async function shootEl(page, file, selector, { pad = 0 } = {}) {
  const el = page.locator(selector).first();
  try {
    await el.waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(700);           // let the chart/marquee settle
    const box = await el.boundingBox();
    if (!box) throw new Error("no box");
    await page.screenshot({
      path: `${SHOT}/${file}.png`,
      clip: {
        x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
        width: Math.min(box.width + pad * 2, 1440), height: Math.min(box.height + pad * 2, 4000),
      },
    });
    console.log(`  ✓ ${file}.png`);
    return true;
  } catch (e) {
    console.log(`  ✗ ${file}.png — ${String(e).split("\n")[0]}`);
    return false;
  }
}

async function shootPage(page, file) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOT}/${file}.png`, fullPage: false });
  console.log(`  ✓ ${file}.png (viewport)`);
}

// ⚠️ ONE CONTEXT PER PERSONA. The first version reused a single context for all five
// logins, so after signing in as the trading officer every later `login()` navigated to
// /auth/admin ALREADY SIGNED IN — no form, and the run died waiting for a field that was
// never going to render. A browser context holds one session; five roles need five.
// (It also matters for correctness, not just mechanics: the platform enforces a durable
// single session, so sharing a context would let one login evict another mid-run.)
const br = await chromium.launch();
const contexts = [];
async function as(who) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } });
  contexts.push(ctx);
  const page = await ctx.newPage();
  await login(page, who);
  return page;
}

try {
  // ── TRADING officer — where markets are curated, resolved and sourced ──────
  const t = await as("trading");
  console.log("\nas the TRADING officer");

  await t.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootEl(t, "m01-nav", "nav, aside", { pad: 4 });
  await shootPage(t, "m02-markets");
  await shootEl(t, "m02b-markets-table", "table", { pad: 6 });

  await t.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m03-market-new");

  await t.goto(`${BASE}/admin/resolver-queue`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m04-resolver-queue");

  await t.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m05-ai-polls");

  await t.goto(`${BASE}/admin/proposals`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m06-proposals");

  await t.goto(`${BASE}/admin/candidates`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m07-candidates");

  await t.goto(`${BASE}/admin/sources`, { waitUntil: "domcontentloaded" });
  await t.waitForLoadState("networkidle").catch(() => {});
  await shootPage(t, "m08-sources");

  // ── FINANCE officer — the money end of a market ───────────────────────────
  const f = await as("finance");
  console.log("\nas the FINANCE officer");
  await f.goto(`${BASE}/admin/settlement`, { waitUntil: "domcontentloaded" });
  await f.waitForLoadState("networkidle").catch(() => {});
  await shootPage(f, "m09-settlement");

  // ── COMPLIANCE officer — objections, and the refusal a wrong role sees ────
  const c = await as("officer");
  console.log("\nas the COMPLIANCE officer");
  await c.goto(`${BASE}/admin/objections`, { waitUntil: "domcontentloaded" });
  await c.waitForLoadState("networkidle").catch(() => {});
  await shootPage(c, "m10-objections");

  // The refusal panel — a real one, reached by a real role, not a mock. This is
  // what a reader will hit if they follow the runbook signed in as the wrong
  // officer, and a guide that never shows it leaves them thinking it is a fault.
  await c.goto(`${BASE}/admin/settlement`, { waitUntil: "domcontentloaded" });
  await c.waitForLoadState("networkidle").catch(() => {});
  await shootPage(c, "m11-refused");

  // ── PLAYER — the same market, from the other side ─────────────────────────
  const p = await as("alpha");
  console.log("\nas a PLAYER");
  await p.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => {});
  await shootPage(p, "m12-player-board");

  await p.goto(`${BASE}/positions`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => {});
  await shootPage(p, "m13-player-positions");

  console.log(`\nshots written to ${SHOT}`);
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  await br.close();
}
