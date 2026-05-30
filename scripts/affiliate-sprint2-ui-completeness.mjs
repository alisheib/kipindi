/**
 * Sprint 2 · UI COMPLETENESS — every screen in every state.
 *   - Theme: dark + light (kp-theme cookie) render, no overflow, content visible
 *   - Locale: SW bilingual strings present
 *   - Reward-mode adaptivity: player promise lines reflect which modes are on
 *   - Conditional admin fields: deposit-threshold only for DEPOSIT_THRESHOLD;
 *     reward-card inputs hidden when the mode is off
 *   - Program state: Active vs Paused (player banner + admin amber master)
 *   - Empty vs populated recruits (via real registration)
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const setCfg = (cfg) => fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(cfg) }).then((r) => r.json());
const promote = () => fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });

async function authed(browser, { theme = "dark", locale = "en", w = 1280, h = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addCookies([
    { name: "kp-theme", value: theme, url: BASE },
    { name: "kp-locale", value: locale, url: BASE },
  ]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
  return ctx;
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Register a brand-new account through the real form. Leaves ctx authed as it. */
const seedRecruits = (code, n = 2) => fetch(`${BASE}/api/dev-test/affiliate-seed-recruits`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ code, n, activity: true }) }).then((r) => r.json());

async function registerViaUI(browser, { ref } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // "65" prefix keeps us clear of the "72" stress-seeded phone range; retry on
  // the (correct) rate-limit / duplicate guard with a fresh limiter + number.
  for (let attempt = 0; attempt < 3; attempt++) {
    await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST", headers: { connection: "close" } }).catch(() => {});
    const p = await ctx.newPage();
    const phone = "65" + String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
    await p.goto(`${BASE}/auth/register${ref ? `?ref=${ref}` : ""}`, { waitUntil: "networkidle" });
    await p.fill("#phone", phone);
    await p.fill('input[name="dob"]', "1995-06-15");
    await p.fill('input[name="password"]', "Tanzania#2026x");
    await p.fill('input[name="passwordConfirm"]', "Tanzania#2026x");
    await p.check('input[name="acceptAge"]');
    await p.check('input[name="acceptTerms"]');
    await Promise.all([
      p.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 12000 }).catch(() => {}),
      p.locator('button[type="submit"]').click(),
    ]);
    const landed = !p.url().includes("/auth/register");
    await p.close();
    if (landed) return { ctx, ok: true };
  }
  return { ctx, ok: false };
}

const browser = await chromium.launch();
try {
  await promote();
  await setCfg({ reset: true });

  // ── 1 · THEME (dark + light) render + no overflow ────────────────────
  console.log("\n=== 1 · THEME COVERAGE ===");
  for (const theme of ["dark", "light"]) {
    const ctx = await authed(browser, { theme });
    await promote();
    for (const path of ["/profile/invite", "/admin/affiliate", "/profile"]) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(250);
      const cls = await p.evaluate(() => document.documentElement.className);
      log(`1.${theme} ${path} applies ${theme} class`, new RegExp(theme).test(cls), cls);
      log(`1.${theme} ${path} no overflow`, (await overflow(p)) <= 1);
      await p.close();
    }
    await ctx.close();
  }

  // ── 2 · LOCALE (SW bilingual strings) ────────────────────────────────
  console.log("\n=== 2 · BILINGUAL (SW) ===");
  {
    const ctx = await authed(browser, { locale: "sw" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    const t = (await p.locator("body").textContent()) ?? "";
    log("2.invite SW: 'Alika upate'", /Alika upate/.test(t));
    log("2.invite SW: 'Inavyofanya kazi'", /Inavyofanya kazi/.test(t));
    log("2.invite SW: 'Marafiki wako'", /Marafiki wako/.test(t));
    await promote();
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const a = (await p.locator("body").textContent()) ?? "";
    log("2.admin SW: 'Swichi kuu'", /Swichi kuu/.test(a));
    log("2.admin SW: 'Daftari la malipo'", /Daftari la malipo/.test(a));
    await p.close();
    await ctx.close();
  }

  // ── 3 · REWARD-MODE ADAPTIVITY (player promises) ─────────────────────
  console.log("\n=== 3 · REWARD-MODE ADAPTIVITY ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    const promisesText = async () => { await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" }); await p.waitForTimeout(150); return (await p.locator("body").textContent()) ?? ""; };

    await setCfg({ enabled: true, commission: { enabled: true }, bonus: { enabled: true }, prize: { enabled: true } });
    let t = await promisesText();
    log("3.all-on: commission % line", /% of your friends/.test(t));
    log("3.all-on: prize line", /when a friend places their first bet|when a friend deposits/.test(t));

    await setCfg({ commission: { enabled: false }, bonus: { enabled: false }, prize: { enabled: true } });
    t = await promisesText();
    log("3.prize-only: prize line present", /when a friend/.test(t));
    log("3.prize-only: NO commission % line", !/% of your friends/.test(t));

    await setCfg({ commission: { enabled: true }, bonus: { enabled: false }, prize: { enabled: false } });
    t = await promisesText();
    log("3.commission-only: % line present", /% of your friends/.test(t));
    log("3.commission-only: NO prize line", !/when a friend places their first bet/.test(t));

    await setCfg({ reset: true });
    await p.close();
    await ctx.close();
  }

  // ── 4 · ADMIN CONDITIONAL FIELDS ─────────────────────────────────────
  console.log("\n=== 4 · ADMIN CONDITIONAL FIELDS ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await setCfg({ enabled: true, prize: { enabled: true, milestone: "FIRST_BET" } });
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    log("4.FIRST_BET hides deposit-threshold field", !/Deposit threshold/.test((await p.locator("body").textContent()) ?? ""));
    await setCfg({ prize: { enabled: true, milestone: "DEPOSIT_THRESHOLD" } });
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    log("4.DEPOSIT_THRESHOLD shows deposit-threshold field", /Deposit threshold/.test((await p.locator("body").textContent()) ?? ""));
    await setCfg({ commission: { enabled: false } });
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    log("4.commission OFF hides its 'Commission rate' field", !/Commission rate/.test((await p.locator("body").textContent()) ?? ""));
    await setCfg({ reset: true });
    await p.close(); await ctx.close();
  }

  // ── 5 · PROGRAM STATE (Active vs Paused) ─────────────────────────────
  console.log("\n=== 5 · ACTIVE vs PAUSED ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await setCfg({ enabled: false });
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    let t = (await p.locator("body").textContent()) ?? "";
    log("5.paused: player shows paused banner", /program is paused/i.test(t));
    log("5.paused: player status pill 'Paused'", /Paused/.test(t));
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    log("5.paused: admin shows 'PAUSED'", /PAUSED/.test((await p.locator("body").textContent()) ?? ""));
    await setCfg({ enabled: true });
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    t = (await p.locator("body").textContent()) ?? "";
    log("5.active: NO paused banner", !/program is paused/i.test(t));
    log("5.active: status pill 'Active'", /Active/.test(t));
    await p.close(); await ctx.close();
  }

  // ── 6 · EMPTY vs POPULATED recruits (real registration) ──────────────
  console.log("\n=== 6 · EMPTY vs POPULATED (real registration) ===");
  {
    await setCfg({ reset: true });
    const A = await registerViaUI(browser);
    log("6.referrer A registered (real form)", A.ok);
    if (A.ok) {
      const pa = await A.ctx.newPage();
      await pa.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
      const empty = (await pa.locator("body").textContent()) ?? "";
      log("6.empty state: 'No referrals yet'", /No referrals yet/.test(empty));
      const code = (await pa.locator('input[aria-label="Referral link"]').inputValue().catch(() => "")).match(/ref=([A-Z0-9]+)/)?.[1];
      log("6.referrer A has a code", !!code, code);
      // Seed recruits onto A deterministically, then reload → populated.
      const seed = await seedRecruits(code, 3);
      log("6.seeded recruits onto A", seed.ok && seed.bound >= 1, `bound=${seed.bound}`);
      await pa.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
      await pa.waitForTimeout(200);
      const populated = (await pa.locator("body").textContent()) ?? "";
      log("6.populated: empty state gone", !/No referrals yet/.test(populated));
      log("6.populated: recruit rows show masked names", /\*\*\*/.test(populated));
      log("6.populated: status chip present (Signed up/First bet/Earning)", /Signed up|First bet|Earning/.test(populated));
      log("6.populated: an earnings figure shown (+amount)", /\+[\d,]+/.test(populated));
      await pa.close();
    }
    await A.ctx?.close();
  }

  // ── 7 · ADMIN populated ledger + leaderboard ─────────────────────────
  console.log("\n=== 7 · ADMIN POPULATED TABLES ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const ledgerRows = await p.locator('.grid.grid-cols-\\[1fr_1\\.2fr_1\\.4fr_1fr_0\\.9fr_0\\.9fr\\]').count();
    log("7.ledger has data rows", ledgerRows >= 2, `rows≈${ledgerRows}`);
    const lb = (await p.locator("body").textContent()) ?? "";
    log("7.leaderboard shows recruits", /recruits/.test(lb));
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
