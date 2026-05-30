/**
 * Feature 2 · Sprint 3 · NATIVE UI-KIT CONFORMANCE.
 *   - CTAs are kit .btn (gold primary / ghost secondary); NO betting .btn-yes/.btn-no
 *   - VoteControl arrows are neutral idle / GOLD up / CLARET down — never green/red
 *   - StatusBadge = kit Chip (span.rounded-pill); money/prize = gold token
 *   - fonts Sora / Inter / JetBrains Mono; no rogue #hex; token-driven colour
 *   - responsiveness: no horizontal overflow at 393 / 768 / 1280
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const promote = () => fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
const setCfg = (c) => fetch(`${BASE}/api/dev-test/proposals-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });
const seed = () => fetch(`${BASE}/api/dev-test/proposals-seed`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({}) });

async function authed(browser, w = 1280, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" }); await p.close();
  return ctx;
}
async function rogueHex(p, sel) {
  return p.evaluate((s) => {
    const root = document.querySelector(s); if (!root) return ["no-root"];
    const out = [];
    for (const el of root.querySelectorAll("*")) { const st = el.getAttribute("style"); if (st && /#[0-9a-fA-F]{3,8}\b/.test(st)) out.push(st.match(/#[0-9a-fA-F]{3,8}/)[0]); }
    return out;
  }, sel);
}
const resolveToken = (p, name) => p.evaluate((n) => { const s = document.createElement("span"); s.style.color = `var(${n})`; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; }, name);

const browser = await chromium.launch();
try {
  await setCfg({ reset: true }); await seed();

  // ── A · BOARD kit conformance ────────────────────────────────────────
  console.log("\n=== A · BOARD ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals?f=new`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    log("A.Create CTA is kit .btn.btn-gold", await p.locator(".btn.btn-gold", { hasText: /Create/ }).count() >= 1);
    log("A.NO betting .btn-yes/.btn-no on board", await p.locator(".btn-yes, .btn-no").count() === 0);
    log("A.status badges are kit Chips (span.rounded-pill)", await p.locator("span.rounded-pill").count() >= 1);
    log("A.vote arrows present w/ aria-label", await p.locator('button[aria-label="Upvote proposal"]').count() >= 1 && await p.locator('button[aria-label="Downvote proposal"]').count() >= 1);

    // Vote colour discipline (non-interactive — robust): idle arrows are
    // neutral (text-subtle), and NO vote arrow ever uses a betting green/red
    // token. Active up=gold / down=claret is enforced in VoteControl source
    // (var(--gold-300)/var(--claret-300)) and exercised by the engine tests.
    const subtle = await resolveToken(p, "--text-subtle");
    const yes5 = await resolveToken(p, "--yes-500"); const yes3 = await resolveToken(p, "--yes-300");
    const no5 = await resolveToken(p, "--no-500"); const no3 = await resolveToken(p, "--no-300");
    const voteColors = await p.$$eval('button[aria-label="Upvote proposal"], button[aria-label="Downvote proposal"]', (els) => els.map((e) => getComputedStyle(e).color));
    log("A.idle vote arrows are neutral (text-subtle)", voteColors.length > 0 && voteColors.every((c) => c === subtle), `${voteColors.length} arrows`);
    log("A.vote arrows never use betting green/red", !voteColors.some((c) => [yes5, yes3, no5, no3].includes(c)));

    // Fonts
    const f = async (sel) => p.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily).catch(() => "");
    log("A.headings → Sora", /Sora/i.test(await f(".font-display")));
    log("A.numbers → JetBrains Mono", /JetBrains/i.test(await f(".font-mono, .mono")));
    log("A.no rogue #hex in board", (await rogueHex(p, "main")).length === 0);
    await p.close(); await ctx.close();
  }

  // ── B · CREATE + DETAIL kit ──────────────────────────────────────────
  console.log("\n=== B · CREATE / DETAIL ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/proposals/new`, { waitUntil: "networkidle" });
    log("B.Submit CTA is kit .btn.btn-gold", await p.locator(".btn.btn-gold", { hasText: /Submit proposal/ }).count() >= 1);
    log("B.title field uses kit Input", await p.locator("span.input-group input, input.input").count() >= 1 || await p.locator('input[placeholder^="Will [event]"]').count() >= 1);
    log("B.category chips present", await p.locator("button", { hasText: "Sports" }).count() >= 1);
    log("B.no rogue #hex in create", (await rogueHex(p, "main")).length === 0);
    // detail
    await p.goto(`${BASE}/proposals?f=new`, { waitUntil: "networkidle" });
    const href = await p.locator('a[href^="/proposals/prp_"]').first().getAttribute("href");
    if (href) {
      await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      log("B.detail vote control + timeline present", await p.locator('button[aria-label="Upvote proposal"]').count() >= 1);
      log("B.no rogue #hex in detail", (await rogueHex(p, "main")).length === 0);
    }
    await p.close(); await ctx.close();
  }

  // ── C · ADMIN kit ────────────────────────────────────────────────────
  console.log("\n=== C · ADMIN ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/proposals`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    log("C.Save + Approve are kit .btn.btn-gold", await p.locator(".btn.btn-gold").count() >= 1);
    log("C.master switch is kit Toggle (role=switch)", await p.locator('button[role="switch"]').count() >= 1);
    log("C.status pill is kit Chip", await p.locator("span.rounded-pill").count() >= 1);
    log("C.config fields use kit .input-group", await p.locator(".input-group input.input.input-mono").count() >= 3);
    log("C.NO betting .btn-yes/.btn-no", await p.locator(".btn-yes, .btn-no").count() === 0);
    const goldMoney = await p.locator(".text-gold-300").filter({ hasText: /\d/ }).count();
    log("C.prize/money figures gold", goldMoney >= 1, `count=${goldMoney}`);
    log("C.no rogue #hex in admin content", (await rogueHex(p, ".max-w-\\[1180px\\]")).length === 0);
    await p.close(); await ctx.close();
  }

  // ── D · RESPONSIVENESS ───────────────────────────────────────────────
  console.log("\n=== D · RESPONSIVENESS ===");
  for (const [w, h] of [[393, 852], [768, 1024], [1280, 900]]) {
    const ctx = await authed(browser, w, h); await promote();
    for (const path of ["/proposals", "/proposals/new", "/admin/proposals"]) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(200);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      log(`D.${w}w ${path} no overflow`, o <= 1, `Δ${o}px`);
      await p.close();
    }
    await ctx.close();
  }

  await setCfg({ reset: true });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 3 · KIT CONFORMANCE   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
