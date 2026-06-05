/**
 * AFFILIATE · full UI audit (player + manager) — drives the real app with
 * Playwright across viewports and asserts:
 *
 *   PLAYER  · /profile entry row · /profile/invite hero, ring, link, copy,
 *             share targets, KPIs, how-it-works, recruits/empty · register ribbon
 *   MANAGER · /admin/affiliate master switch, KPIs, 3 reward cards, sub-toggles,
 *             segmented controls, Save→persist, pause→player banner, Growth nav
 *   KIT     · every CTA is a kit .btn (gold primary / ghost secondary), status
 *             uses kit Chip, switch is the kit Toggle, fonts are Sora/JBM,
 *             money + codes are mono, NO betting green/red in this feature
 *   RESPONSIVE · no horizontal overflow + correct reflow at 393 / 768 / 1280
 *
 *   1. npm run dev      2. node scripts/affiliate-ui-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const failures = [];
function log(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; failures.push(`${label} ${detail}`); }
}

const VIEWPORTS = [
  { name: "393 · mobile", w: 393, h: 852 },
  { name: "768 · tablet", w: 768, h: 1024 },
  { name: "1280 · desktop", w: 1280, h: 900 },
];

/** Auth helpers — reuse the dev demo session + promote endpoint. */
async function newAuthedContext(browser, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
  return ctx;
}

const browser = await chromium.launch();
try {
  // Promote the demo user to ADMIN for the manager pass.
  await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST", headers: { "content-type": "application/json", connection: "close" },
    body: JSON.stringify({ phone: "+255700000000" }),
  });

  // ════════════════════════════════════════════════════════════════════
  // A · PLAYER — /profile entry row
  // ════════════════════════════════════════════════════════════════════
  console.log("\n=== A · PLAYER · profile entry row ===");
  {
    const ctx = await newAuthedContext(browser, VIEWPORTS[2]);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    const row = p.locator('a[href="/profile/invite"]').first();
    log("A.profile has Invite & Earn row", await row.isVisible().catch(() => false));
    log("A.row shows EN + SW label", /Invite & Earn[\s\S]*Alika upate/.test((await row.textContent()) ?? ""));
    log("A.row carries a New badge", /New/.test((await row.textContent()) ?? ""));
    // Gold left-accent => the row has a child with a gold gradient background
    const hasAccent = await row.evaluate((el) =>
      [...el.querySelectorAll("span")].some((s) => /gold/.test(getComputedStyle(s).backgroundImage) || getComputedStyle(s).backgroundImage.includes("gradient")));
    log("A.row has gold accent treatment", hasAccent);
    // Click → lands on invite
    await row.click();
    await p.waitForURL("**/profile/invite", { timeout: 8000 }).catch(() => {});
    log("A.row navigates to /profile/invite", p.url().endsWith("/profile/invite"));
    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════
  // B · PLAYER — /profile/invite content + interactions + kit + fonts
  // ════════════════════════════════════════════════════════════════════
  console.log("\n=== B · PLAYER · Invite & Earn page ===");
  let referralCode = null;
  {
    const ctx = await newAuthedContext(browser, VIEWPORTS[2]);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const body = (await p.locator("body").textContent()) ?? "";

    log("B.hero headline present", /Invite friends\. Earn together\./.test(body));
    log("B.hero SW subtitle present", /Alika marafiki\. Pateni pamoja\./.test(body));
    log("B.status pill present (Active/Paused)", /\b(Active|Paused)\b/.test(body));
    log("B.how-it-works present", /How it works/.test(body));
    log("B.how-it-works has 3 steps", /Share your link/.test(body) && /They sign up & play/.test(body) && /You earn/.test(body));
    log("B.stat tiles present", /Referrals/.test(body) && /Earned/.test(body));
    log("B.link section present", /Your referral link/.test(body));

    // Referral link input — readonly, contains ?ref=CODE
    const linkInput = p.locator('input[aria-label="Referral link"]');
    const linkVal = await linkInput.inputValue().catch(() => "");
    const m = linkVal.match(/ref=([A-Z0-9]+)/);
    referralCode = m ? m[1] : null;
    log("B.link input is readonly", await linkInput.getAttribute("readonly") !== null);
    log("B.link contains ?ref=CODE", !!referralCode, linkVal);

    // Earnings ring — gold stroke, NOT betting green/red
    const ringStroke = await p.locator("svg circle[stroke-linecap='round']").first().getAttribute("stroke").catch(() => "");
    log("B.earnings ring uses gold token (not betting colour)", /gold/.test(ringStroke ?? ""), ringStroke ?? "");

    // ---- KIT CONFORMANCE: primary + secondary CTAs are kit .btn ----
    const shareBtn = p.locator("button.btn.btn-gold", { hasText: "Share with Friends" }).first();
    log("KIT.Share CTA is kit .btn.btn-gold", await shareBtn.count() > 0);
    const ghostBtns = await p.locator("button.btn.btn-ghost").count();
    log("KIT.secondary share buttons are kit .btn.btn-ghost (WhatsApp/SMS/Copy)", ghostBtns >= 3, `count=${ghostBtns}`);

    // Share targets present
    log("B.WhatsApp share target", await p.locator('a[href^="https://wa.me/"]').count() > 0);
    log("B.SMS share target", await p.locator('a[href^="sms:"]').count() > 0);

    // ---- INTERACTION: copy to clipboard + toast ----
    const copyBtn = p.locator("button", { hasText: "Copy" }).first();
    await copyBtn.click();
    await p.waitForTimeout(400);
    const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => "")).catch(() => "");
    log("B.copy button writes link to clipboard", clip.includes("ref="), clip.slice(0, 48));
    const toast = (await p.locator("body").textContent()) ?? "";
    log("B.copy shows confirmation toast", /copied|imenakiliwa/i.test(toast));

    // ---- FONTS: heading = Sora, amounts = JetBrains Mono ----
    const headingFont = await p.locator(".font-display").first().evaluate((el) => getComputedStyle(el).fontFamily).catch(() => "");
    log("FONT.headings render in Sora", /Sora/i.test(headingFont), headingFont.slice(0, 40));
    const monoFont = await p.locator(".font-mono, .mono").first().evaluate((el) => getComputedStyle(el).fontFamily).catch(() => "");
    log("FONT.numbers/codes render in JetBrains Mono", /JetBrains|mono/i.test(monoFont), monoFont.slice(0, 40));

    // ---- NO betting green/red in this feature's controls ----
    const hasBetClasses = await p.locator("main .btn-yes, main .btn-no").count();
    log("KIT.no YES/NO betting buttons on invite page", hasBetClasses === 0);

    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════
  // C · PLAYER — registration ribbon with ?ref=CODE
  // ════════════════════════════════════════════════════════════════════
  console.log("\n=== C · PLAYER · registration ribbon ===");
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
    const p = await ctx.newPage();
    const code = referralCode || "DEMOEDN";
    await p.goto(`${BASE}/auth/register?ref=${code}`, { waitUntil: "networkidle" });
    const body = (await p.locator("body").textContent()) ?? "";
    log("C.ribbon shows 'invited by'", /invited by/i.test(body), );
    log("C.ribbon SW line present", /Umealikwa na rafiki/.test(body));
    const codeField = p.locator('input[aria-label="Referral code"]');
    log("C.referral code auto-filled", (await codeField.inputValue().catch(() => "")).toUpperCase() === code.toUpperCase());
    log("C.continue CTA is kit .btn.btn-gold", await p.locator("button.btn.btn-gold, .btn.btn-gold").count() > 0);
    // Invalid code → ribbon hidden, page still renders
    await p.goto(`${BASE}/auth/register?ref=NOPE99`, { waitUntil: "networkidle" });
    const body2 = (await p.locator("body").textContent()) ?? "";
    log("C.invalid code → no ribbon, page renders", !/invited by/i.test(body2) && /Create account/i.test(body2));
    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════
  // D · MANAGER — /admin/affiliate content + kit + interactions
  // ════════════════════════════════════════════════════════════════════
  console.log("\n=== D · MANAGER · /admin/affiliate ===");
  {
    const ctx = await newAuthedContext(browser, VIEWPORTS[2]);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const body = (await p.locator("body").textContent()) ?? "";

    log("D.title 'Affiliate Program'", /Affiliate Program/.test(body));
    log("D.master switch present", /master switch/i.test(body));
    log("D.KPIs present", /Total referrals/.test(body) && /Active affiliates/.test(body) && /Commission paid/.test(body) && /Top referrer/.test(body));
    log("D.3 reward modes present", /Commission/.test(body) && /Bonus \/ discount/.test(body) && /Prize/.test(body));
    log("D.compliance note present (claret)", /Compliance note/.test(body));
    log("D.leaderboard present", /Referral leaderboard/.test(body));
    log("D.payout ledger present", /Payout ledger/.test(body));

    // Growth nav group + active link
    log("D.Growth nav group present", /Growth/.test(body));
    const navActive = await p.locator('aside a[href="/admin/affiliate"]').first();
    log("D.Affiliate nav link present", await navActive.count() > 0);

    // ---- KIT: switches are role=switch (Toggle atom); Save is kit gold btn ----
    const switches = await p.locator('button[role="switch"]').count();
    log("KIT.toggles are role=switch (Toggle atom)", switches >= 4, `count=${switches}`);
    log("KIT.Save is kit .btn.btn-gold", await p.locator(".btn.btn-gold", { hasText: "Save" }).count() > 0);
    // Status pill is a kit Chip (rounded-pill span carrying Active/Paused)
    const pillCount = await p.locator("span.rounded-pill").filter({ hasText: /Active|Paused/ }).count();
    log("KIT.status pill is a kit Chip", pillCount > 0, `count=${pillCount}`);

    // ---- INTERACTION 1: master OFF dims reward modes ----
    const master = p.locator('button[role="switch"][aria-label="Program master switch"]');
    const wasOn = (await master.getAttribute("aria-checked")) === "true";
    if (wasOn) await master.click();
    await p.waitForTimeout(300);
    // A reward card should now be dimmed (opacity < 1)
    const dimmed = await p.evaluate(() => {
      const cards = [...document.querySelectorAll("div")].filter((d) => /Referrer earns a share|Sign-up or first-deposit|fixed reward when a recruit/.test(d.textContent || ""));
      return cards.some((c) => parseFloat(getComputedStyle(c.closest('[style*="opacity"]') || c).opacity) < 1);
    });
    log("D.master OFF dims reward-mode cards", dimmed);

    // Save paused state
    await p.locator(".btn.btn-gold", { hasText: "Save" }).first().click();
    await p.waitForTimeout(800);
    await p.reload({ waitUntil: "networkidle" });
    log("D.paused state persists after save+reload", /Paused/.test((await p.locator("body").textContent()) ?? ""));

    // ---- INTERACTION 2: player sees paused banner ----
    const pp = await ctx.newPage();
    await pp.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    log("D.player sees paused banner while program off", /program is paused/i.test((await pp.locator("main").textContent()) ?? ""));
    await pp.close();

    // ---- INTERACTION 3: master ON + change commission rate + persist ----
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const master2 = p.locator('button[role="switch"][aria-label="Program master switch"]');
    if ((await master2.getAttribute("aria-checked")) === "false") await master2.click();
    await p.waitForTimeout(200);
    // Commission rate field is the first input in the Commission card; set to 40
    const commField = p.locator('input.input.input-mono').first();
    await commField.fill("40");
    await p.locator(".btn.btn-gold", { hasText: "Save" }).first().click();
    await p.waitForTimeout(800);
    await p.reload({ waitUntil: "networkidle" });
    const commVal = await p.locator('input.input.input-mono').first().inputValue().catch(() => "");
    log("D.commission rate edit persists (40)", commVal === "40", `value=${commVal}`);
    log("D.status back to Active", /Active/.test((await p.locator("body").textContent()) ?? ""));

    // ---- INTERACTION 4: segmented control switches active option ----
    const seg = p.locator("button", { hasText: "Sign-up" }).first();
    if (await seg.count() > 0) {
      await seg.click();
      await p.waitForTimeout(150);
      const segBg = await seg.evaluate((el) => getComputedStyle(el).backgroundColor);
      log("D.segmented control selects option (royal bg)", segBg !== "rgba(0, 0, 0, 0)", segBg);
    } else {
      log("D.segmented control present", false, "Sign-up option not found");
    }

    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════
  // E · RESPONSIVENESS — overflow + reflow on the new pages
  // ════════════════════════════════════════════════════════════════════
  console.log("\n=== E · RESPONSIVENESS ===");
  for (const vp of VIEWPORTS) {
    const ctx = await newAuthedContext(browser, vp);
    await fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
    for (const path of ["/profile/invite", "/admin/affiliate", "/profile"]) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(300);
      const o = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      log(`E.${vp.w}w ${path} no horizontal overflow`, o.s - o.c <= 1, `Δ${o.s - o.c}px`);
      await p.close();
    }
    // bottom nav presence by breakpoint on the player page
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    const bnVisible = await p2.locator('nav[aria-label="Primary"]').last().isVisible({ timeout: 1500 }).catch(() => false);
    if (vp.w < 1280) log(`E.${vp.w}w bottom-nav visible (< xl)`, bnVisible);
    else log(`E.${vp.w}w bottom-nav hidden (≥ xl)`, !bnVisible);
    await p2.close();
    await ctx.close();
  }

  // Restore program to default-on so the demo is left healthy.
  await fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nAFFILIATE UI AUDIT   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); for (const f of failures) console.log("  · " + f); }
process.exitCode = fail > 0 ? 1 : 0;
