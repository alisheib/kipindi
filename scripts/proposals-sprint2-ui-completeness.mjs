/**
 * Feature 2 · Sprint 2 · UI COMPLETENESS — every proposals screen + state.
 *   Board: header, reward banner, stats, filters (hot/new/listed/mine), populated, paused
 *   Create: guidelines, fields, category chips, validation (submit gating), rate-limit hint
 *   Detail: head, vote control, resolution criterion, timeline, declined state
 *   Admin: queue, review panel, config, KPIs
 *   + light theme render, bilingual SW
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const promote = () => fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
const setCfg = (c) => fetch(`${BASE}/api/dev-test/proposals-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });
const seed = (mineFor) => fetch(`${BASE}/api/dev-test/proposals-seed`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ mineFor }) });

async function authed(browser, { theme = "dark" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-theme", value: theme, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
  return ctx;
}
// NOTE: kit mono labels use CSS text-transform:uppercase, and innerText
// returns the *rendered* (uppercased) text — so all label assertions here are
// case-insensitive on purpose.
const text = (p) => p.locator("body").innerText();

const browser = await chromium.launch();
try {
  await setCfg({ reset: true });
  // Seed populated data attributed to the demo player so "Mine" populates.
  const ctx0 = await authed(browser);
  const who = await (await ctx0.newPage().then(async (p) => { await p.goto(`${BASE}/api/dev-test/whoami`); const t = await p.locator("body").innerText(); await p.close(); return { json: () => JSON.parse(t) }; })).json();
  await seed(who?.session?.userId);
  await ctx0.close();

  // ── 1 · BOARD ────────────────────────────────────────────────────────
  console.log("\n=== 1 · BOARD ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals`, { waitUntil: "networkidle" });
    let t = await text(p);
    log("1.header present", /Market Proposals/.test(t) && /Vote for the markets you want to see/.test(t));
    log("1.bilingual SW header", /Pigia kura soko unayotaka/.test(t));
    log("1.reward banner with prize", /Earn TZS [\d,]+ for each proposal/i.test(t));
    log("1.stats strip", /\d[\d,]* proposals/i.test(t) && /\d[\d,]* votes/i.test(t));
    log("1.create CTA present", await p.locator('a[href="/proposals/new"]').count() > 0);
    log("1.filter chips present", /Hot/.test(t) && /New/.test(t) && /Listed/.test(t) && /Mine/.test(t));
    log("1.populated board has cards", await p.locator('a[href^="/proposals/prp_"]').count() >= 1, `cards=${await p.locator('a[href^="/proposals/prp_"]').count()}`);
    // Filters
    await p.goto(`${BASE}/proposals?f=listed`, { waitUntil: "networkidle" });
    log("1.listed filter active styling", await p.locator('a[href="/proposals?f=listed"]').first().evaluate((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)"));
    await p.goto(`${BASE}/proposals?f=mine`, { waitUntil: "networkidle" });
    t = await text(p);
    log("1.mine filter shows own proposals or empty msg", /\*\*\*|You · Wewe|No proposals in/.test(t) || /by You/.test(t));
    await p.close(); await ctx.close();
  }

  // ── 2 · CREATE ───────────────────────────────────────────────────────
  console.log("\n=== 2 · CREATE ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals/new`, { waitUntil: "networkidle" });
    const t = await text(p);
    log("2.guidelines panel", /What makes a good proposal/.test(t));
    log("2.rate-limit hint", /open proposals used/.test(t));
    log("2.category chips present", /Sports/.test(t) && /Weather/.test(t) && /Infrastructure/.test(t));
    log("2.bilingual fields", /Vigezo vya utatuzi/i.test(t));
    // Submit disabled until valid
    const submit = p.locator("button.btn.btn-gold", { hasText: "Submit proposal" });
    log("2.submit disabled when empty", await submit.isDisabled());
    await p.fill('input[placeholder^="Will [event]"]', "Will Yanga win their next derby match?");
    await p.locator("textarea").nth(1).fill("Resolves from the official TPL match report.");
    await p.fill('input[type="date"]', "2026-09-15");
    await p.waitForTimeout(150);
    log("2.submit enabled once valid", !(await submit.isDisabled()));
    await p.close(); await ctx.close();
  }

  // ── 3 · DETAIL ───────────────────────────────────────────────────────
  console.log("\n=== 3 · DETAIL ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals?f=hot`, { waitUntil: "networkidle" });
    const first = p.locator('a[href^="/proposals/prp_"]').first();
    const href = await first.getAttribute("href");
    if (href) {
      await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const t = await text(p);
      log("3.detail renders title + criterion", /Resolution criterion/i.test(t));
      log("3.vote control present", await p.locator('button[aria-label="Upvote proposal"]').count() > 0);
      log("3.status timeline present", /Submitted/.test(t) && /Under review/.test(t) && /Paid/.test(t));
    } else log("3.detail (no card to open)", false);
    await p.close(); await ctx.close();
  }

  // ── 4 · ADMIN ────────────────────────────────────────────────────────
  console.log("\n=== 4 · ADMIN ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/proposals`, { waitUntil: "networkidle" });
    const t = await text(p);
    log("4.title + queue", /Market Proposals/.test(t) && /Queue · sorted by votes/.test(t));
    log("4.KPIs present", /Proposals pending/i.test(t) && /Listed from proposals/i.test(t) && /Prizes paid/i.test(t) && /Top proposer/i.test(t));
    log("4.review panel vote stats", /Upvotes/i.test(t) && /Downvotes/i.test(t) && /Votes only rank the queue/i.test(t));
    log("4.officer actions", /Approve & list/i.test(t) && /Decline/i.test(t));
    log("4.config block", /master switch/i.test(t) && /Listing \+ resolution prize/i.test(t) && /vote threshold/i.test(t));
    log("4.Growth/Markets nav has Player proposals", await p.locator('aside a[href="/admin/proposals"]').count() > 0);
    await p.close(); await ctx.close();
  }

  // ── 5 · THEME + PAUSED ───────────────────────────────────────────────
  console.log("\n=== 5 · THEME + PAUSED ===");
  {
    for (const theme of ["dark", "light"]) {
      const ctx = await authed(browser, { theme });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/proposals`, { waitUntil: "networkidle" });
      const cls = await p.evaluate(() => document.documentElement.className);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      log(`5.${theme} board renders + no overflow`, new RegExp(theme).test(cls) && o <= 1, `Δ${o}px`);
      await p.close(); await ctx.close();
    }
    await setCfg({ enabled: false });
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals`, { waitUntil: "networkidle" });
    log("5.paused board shows paused banner", /Proposals are paused right now/.test(await text(p)));
    await setCfg({ reset: true });
    await p.close(); await ctx.close();
  }

  await setCfg({ reset: true });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 2 · UI COMPLETENESS   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
