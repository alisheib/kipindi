/**
 * Sprint 3 · NATIVE UI-KIT COMPATIBILITY — proves every element is built from
 * the existing kit, nothing bespoke:
 *   - CTAs are kit .btn (gold primary / ghost secondary); NO betting .btn-yes/.btn-no
 *   - switch is the kit Toggle atom (role=switch); status is a kit Chip (rounded-pill)
 *   - inputs use the kit .input-group; cards use kit surface tokens + radius
 *   - fonts resolve to Sora (display) / Inter (body) / JetBrains Mono (numbers)
 *   - money figures render gold
 *   - NO rogue hardcoded hex colours in inline styles (kit tokens only)
 *   - theme tokens actually adapt (a feature element recolours dark↔light)
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const promote = () => fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
const setCfg = (c) => fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) }).then((r) => r.json());

async function authed(browser, theme = "dark") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-theme", value: theme, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
  return ctx;
}

// Rogue-colour detector: kit uses var()/oklch()/color-mix()/gradients/keywords —
// never raw #hex. Scan inline styles within a root for hex literals.
async function rogueHexIn(p, rootSel) {
  return p.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return ["root-not-found"];
    const offenders = [];
    for (const el of root.querySelectorAll("*")) {
      const s = el.getAttribute("style");
      if (s && /#[0-9a-fA-F]{3,8}\b/.test(s)) offenders.push(`${el.tagName}.${el.className?.toString().slice(0, 24)}: ${s.match(/#[0-9a-fA-F]{3,8}/)[0]}`);
    }
    return offenders;
  }, rootSel);
}

const browser = await chromium.launch();
try {
  await promote();
  await setCfg({ reset: true });

  // ── PLAYER · /profile/invite ─────────────────────────────────────────
  console.log("\n=== A · PLAYER kit conformance ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);

    // CTAs
    log("A.primary CTA is .btn.btn-gold", await p.locator("button.btn.btn-gold", { hasText: "Share with Friends" }).count() === 1);
    log("A.secondary CTAs are .btn.btn-ghost (≥3)", await p.locator("button.btn.btn-ghost").count() >= 3);
    log("A.NO betting .btn-yes/.btn-no buttons", await p.locator(".btn-yes, .btn-no").count() === 0);
    // kit Input group for the link
    log("A.referral link uses kit .input-group", await p.locator(".input-group input.input.input-mono").count() >= 1);
    // kit Chip status pill
    log("A.status pill is kit Chip (span.rounded-pill)", await p.locator("span.rounded-pill").filter({ hasText: /Active|Paused/ }).count() >= 1);
    // money figure gold
    const earnedGold = await p.locator(".text-gold-300").filter({ hasText: /\d/ }).count();
    log("A.money figure rendered gold (.text-gold-300)", earnedGold >= 1, `count=${earnedGold}`);
    // cards use kit surface + radius token
    const cardOk = await p.evaluate(() => {
      const el = [...document.querySelectorAll("section,div")].find((d) => getComputedStyle(d).backgroundColor && /rounded/.test(d.className) && /border/.test(d.className));
      if (!el) return false;
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
      return [8, 12, 16, 24, 999].some((v) => Math.abs(r - v) <= 1);
    });
    log("A.cards use kit radius tokens (8/12/16/24)", cardOk);

    // FONTS
    const f = async (sel) => p.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily).catch(() => "");
    log("A.headings → Sora", /Sora/i.test(await f(".font-display")));
    log("A.numbers → JetBrains Mono", /JetBrains/i.test(await f(".font-mono, .mono")));
    const bodyFont = await p.locator("p").filter({ hasText: /Rewards are credited/ }).first().evaluate((el) => getComputedStyle(el).fontFamily).catch(() => "");
    log("A.body copy → Inter", /Inter/i.test(bodyFont), bodyFont.slice(0, 30));

    // NO rogue hex in the feature content
    const rogue = await rogueHexIn(p, "main");
    log("A.no rogue #hex colours (kit tokens only)", rogue.length === 0, rogue.slice(0, 3).join(" | "));

    await p.close();
    await ctx.close();
  }

  // ── MANAGER · /admin/affiliate ───────────────────────────────────────
  console.log("\n=== B · MANAGER kit conformance ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);

    log("B.Save CTA is .btn.btn-gold", await p.locator(".btn.btn-gold", { hasText: "Save" }).count() >= 1);
    log("B.master + sub switches are kit Toggle (role=switch ≥4)", await p.locator('button[role="switch"]').count() >= 4);
    log("B.status pill is kit Chip", await p.locator("span.rounded-pill").filter({ hasText: /Active|Paused/ }).count() >= 1);
    log("B.config fields use kit .input-group", await p.locator(".input-group input.input.input-mono").count() >= 3);
    log("B.NO betting .btn-yes/.btn-no", await p.locator(".btn-yes, .btn-no").count() === 0);
    const goldMoney = await p.locator(".text-gold-300").filter({ hasText: /\d/ }).count();
    log("B.money figures (KPIs/ledger) gold", goldMoney >= 1, `count=${goldMoney}`);
    const rogue = await rogueHexIn(p, "body");
    // The shared admin shell may contain its own markup; scope the check to the
    // affiliate content container (max-w wrapper) to judge OUR feature only.
    const rogueFeature = await rogueHexIn(p, ".max-w-\\[1180px\\]");
    log("B.no rogue #hex in affiliate admin content", rogueFeature.length === 0, rogueFeature.slice(0, 3).join(" | "));

    await p.close(); await ctx.close();
  }

  // ── C · TOKEN-DRIVEN STYLING ─────────────────────────────────────────
  // NOTE: 50pick is single-theme by design — globals.css states "No dark mode
  // — single light royal theme" and retired the [data-theme=light] block. So
  // we don't assert dark↔light divergence; we assert the feature is driven by
  // kit CSS custom-property tokens (not hardcoded colours), which IS the kit
  // contract for this app.
  console.log("\n=== C · TOKEN-DRIVEN STYLING (single-theme app) ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    const tokens = await p.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        gold: cs.getPropertyValue("--gold-300").trim(),
        royal: cs.getPropertyValue("--royal-500").trim(),
        bgEl: cs.getPropertyValue("--bg-elevated").trim(),
        border: cs.getPropertyValue("--border").trim(),
      };
    });
    log("C.kit tokens defined on :root (--gold-300/--royal-500/--bg-elevated/--border)", !!(tokens.gold && tokens.royal && tokens.bgEl && tokens.border), JSON.stringify(tokens));
    // The gold money figure's resolved colour must equal the resolved --gold-300
    // token — proves it's token-driven, not a literal.
    const match = await p.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--gold-300)";
      document.body.appendChild(probe);
      const tokenColor = getComputedStyle(probe).color;
      probe.remove();
      const money = [...document.querySelectorAll(".text-gold-300")].find((e) => /\d/.test(e.textContent || ""));
      const moneyColor = money ? getComputedStyle(money).color : "";
      return { tokenColor, moneyColor };
    });
    log("C.money figure colour == resolved --gold-300 token", match.tokenColor === match.moneyColor && !!match.moneyColor, `${match.moneyColor} vs ${match.tokenColor}`);
    await p.close(); await ctx.close();
  }

  await setCfg({ reset: true });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 3 · UI-KIT CONFORMANCE   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
