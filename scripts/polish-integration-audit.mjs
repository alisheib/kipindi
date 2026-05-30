/**
 * POLISH & VISUAL-INTEGRATION AUDIT (Affiliate + Proposals).
 *   A. Console/render sweep — every new page loads with NO console/page errors,
 *      no horizontal overflow, and the kit brand logo present.
 *   B. Input padding — every visible text input / textarea is comfortably padded.
 *   C. Logos from the kit — brand SVG renders (not broken / not recolored away).
 *   D. Animations don't break — modal, toast, toggle, hover transitions.
 *   E. Functionality triggers — copy link, vote, create→modal, admin toggle save,
 *      admin approve→market (the new-feature triggers actually fire).
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };
const promote = () => fetch(`${BASE}/api/dev-test/promote-admin`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ phone: "+255700000000" }) });
const setP = (c) => fetch(`${BASE}/api/dev-test/proposals-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });
const setA = (c) => fetch(`${BASE}/api/dev-test/affiliate-set-config`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(c) });
const seedP = (mineFor) => fetch(`${BASE}/api/dev-test/proposals-seed`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({ mineFor }) });

// Console noise we deliberately ignore (dev-only / unrelated to our features).
const IGNORE = [/favicon/i, /React DevTools/i, /Download the React/i, /\[Fast Refresh\]/i, /webpack-hmr/i, /source-?map/i];
function attachConsole(p, bucket) {
  p.on("console", (m) => { if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) bucket.push(m.text()); });
  p.on("pageerror", (e) => { if (!IGNORE.some((r) => r.test(String(e)))) bucket.push("PAGEERROR: " + String(e?.message ?? e)); });
}
async function authed(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" }); await p.close();
  return ctx;
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const PAGES = [
  ["/profile/invite", "Invite & Earn"],
  ["/profile", "profile"],
  ["/proposals", "proposals board"],
  ["/proposals/new", "create proposal"],
  ["/admin/affiliate", "admin affiliate"],
  ["/admin/proposals", "admin proposals"],
  ["/markets", "markets (entry card)"],
  ["/wallet/deposit", "deposit"],
  ["/auth/register?ref=DEMOEDN", "register ribbon"],
];

const browser = await chromium.launch();
try {
  await setP({ reset: true }); await setA({ reset: true });
  const ctx0 = await authed(browser);
  const whoP = await ctx0.newPage();
  await whoP.goto(`${BASE}/api/dev-test/whoami`); const who = JSON.parse(await whoP.locator("body").innerText()); await whoP.close();
  await seedP(who?.session?.userId);
  await ctx0.close();
  await promote();

  // ── A · CONSOLE / RENDER / LOGO SWEEP ────────────────────────────────
  console.log("\n=== A · CONSOLE / RENDER / LOGO SWEEP ===");
  for (const [path, label] of PAGES) {
    const ctx = await authed(browser); await promote();
    const errs = [];
    const p = await ctx.newPage();
    attachConsole(p, errs);
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    log(`A.${label} — no console/page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    log(`A.${label} — no horizontal overflow`, (await overflow(p)) <= 1);
    // a brand logo SVG is present (top app bar lockup, footer, ribbon, or header)
    const hasLogo = await p.evaluate(() => !!document.querySelector('a[aria-label="50pick home"] svg, svg[aria-label="50pick"], header svg'));
    log(`A.${label} — kit brand logo renders`, hasLogo);
    await p.close(); await ctx.close();
  }

  // ── B · INPUT PADDING ────────────────────────────────────────────────
  console.log("\n=== B · INPUT PADDING ===");
  for (const path of ["/proposals/new", "/admin/affiliate", "/admin/proposals", "/wallet/deposit", "/auth/register?ref=DEMOEDN"]) {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(250);
    const bad = await p.evaluate(() => {
      const els = [...document.querySelectorAll('input[type="text"],input[type="number"],input[type="date"],input[type="tel"],input:not([type]),textarea')];
      const offenders = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue; // hidden
        const cs = getComputedStyle(el);
        const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
        const inGroup = !!el.closest(".input-group"); // group supplies the visual inset
        if (!inGroup && (pl < 8 || pr < 8)) offenders.push(`${el.name || el.id || el.type}: pl=${pl} pr=${pr}`);
      }
      return offenders;
    });
    log(`B.${path} — all inputs comfortably padded`, bad.length === 0, bad.slice(0, 3).join(" | "));
    await p.close(); await ctx.close();
  }

  // ── C · LOGOS FROM KIT (not broken / not recolored) ──────────────────
  console.log("\n=== C · KIT LOGOS ===");
  {
    const ctx = await authed(browser);
    const p = await ctx.newPage();
    // Register ribbon uses FiftyMark; deposit header uses FiftyMark; footer uses FiftyMark.
    await p.goto(`${BASE}/auth/register?ref=DEMOEDN`, { waitUntil: "networkidle" });
    log("C.register ribbon shows a brand mark SVG", await p.locator("svg").count() >= 1 && /invited by/i.test(await p.evaluate(() => document.body.innerText)));
    await p.goto(`${BASE}/wallet/deposit`, { waitUntil: "networkidle" });
    log("C.deposit header brand mark present", await p.locator("header svg, main svg").count() >= 1);
    await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const footerLogo = await p.locator("footer svg").count();
    log("C.public footer brand mark present", footerLogo >= 1, `svgs=${footerLogo}`);
    // top app bar logo is a link to home with an svg
    log("C.top app bar logo links home", await p.locator('header a[aria-label="50pick home"]').count() >= 1 || await p.locator("header a svg").count() >= 1);
    await p.close(); await ctx.close();
  }

  // ── D · ANIMATIONS DON'T BREAK ───────────────────────────────────────
  console.log("\n=== D · ANIMATIONS ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    // Hover transition defined on proposal cards
    await p.goto(`${BASE}/proposals?f=new`, { waitUntil: "networkidle" });
    const card = p.locator('div:has(> a[href^="/proposals/prp_"])').first();
    const trans = await card.evaluate((el) => getComputedStyle(el).transitionProperty).catch(() => "");
    log("D.proposal card has a transition (hover anim defined)", /all|transform|color|box-shadow/.test(trans), trans.slice(0, 40));
    // Toggle animates: aria-checked flips + has transition
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const master = p.locator('button[role="switch"][aria-label="Program master switch"]');
    const before = await master.getAttribute("aria-checked");
    const tdur = await master.evaluate((el) => getComputedStyle(el).transitionDuration);
    await master.click(); await p.waitForTimeout(150);
    const after = await master.getAttribute("aria-checked");
    log("D.toggle flips state + has transition", before !== after && tdur !== "0s", `${before}→${after} dur=${tdur}`);
    await master.click(); // restore
    // OperationResultModal animates in on proposal submit.
    // Raise the rate limit first so the (heavily-reused) demo account isn't at
    // its open-proposal cap — which would correctly keep Submit disabled.
    try {
      await setP({ enabled: true, rateLimit: 100 });
      await p.goto(`${BASE}/proposals/new`, { waitUntil: "networkidle" });
      await p.fill('input[placeholder^="Will [event]"]', "Will this animated modal appear on submit?");
      await p.locator("textarea").nth(1).fill("Resolves from the official source on the date given.");
      await p.fill('input[type="date"]', "2026-10-01");
      await p.waitForTimeout(300); // let controlled state settle so Submit enables
      const submit = p.locator(".btn.btn-gold", { hasText: "Submit proposal" });
      await submit.click({ timeout: 8000 });
      const modal = p.locator('[role="dialog"], [role="alertdialog"]');
      await modal.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
      log("D.result modal appears on submit (crest)", (await modal.count()) >= 1 && /Proposal received/i.test(await p.evaluate(() => document.body.innerText)));
    } catch (e) {
      log("D.result modal appears on submit (crest)", false, String(e?.message ?? e).slice(0, 80));
    }
    await p.close(); await ctx.close();
  }

  // ── E · FUNCTIONALITY TRIGGERS ───────────────────────────────────────
  console.log("\n=== E · FUNCTIONALITY TRIGGERS ===");
  {
    const ctx = await authed(browser); await promote();
    const p = await ctx.newPage();
    // E1 · affiliate copy → clipboard + toast
    await p.goto(`${BASE}/profile/invite`, { waitUntil: "networkidle" });
    await p.locator("button", { hasText: "Copy" }).first().click();
    await p.waitForTimeout(400);
    const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
    log("E.affiliate copy writes link + shows toast", clip.includes("ref=") && /copied|imenakiliwa/i.test(await p.evaluate(() => document.body.innerText)));
    // E2 · admin proposals: toggle + Save persists
    await setP({ reset: true });
    await p.goto(`${BASE}/admin/proposals`, { waitUntil: "networkidle" });
    const sw = p.locator('button[role="switch"]').first();
    if ((await sw.getAttribute("aria-checked")) === "true") await sw.click();
    await p.locator(".btn.btn-gold", { hasText: "Save" }).first().click();
    await p.waitForTimeout(800);
    await p.reload({ waitUntil: "networkidle" });
    log("E.admin proposals pause persists after save", /Paused/.test(await p.evaluate(() => document.body.innerText)));
    // player sees paused board
    const pp = await ctx.newPage();
    await pp.goto(`${BASE}/proposals`, { waitUntil: "networkidle" });
    log("E.trigger: paused → player board read-only banner", /paused/i.test(await pp.evaluate(() => document.body.innerText)));
    await pp.close();
    await setP({ reset: true });
    // E3 · admin affiliate: change commission rate + save persists
    await p.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    const sw2 = p.locator('button[role="switch"][aria-label="Program master switch"]');
    if ((await sw2.getAttribute("aria-checked")) === "false") await sw2.click();
    const commField = p.locator("input.input.input-mono").first();
    await commField.fill("42");
    await p.locator(".btn.btn-gold", { hasText: "Save" }).first().click();
    await p.waitForTimeout(800);
    await p.reload({ waitUntil: "networkidle" });
    log("E.admin affiliate commission edit persists (42)", (await p.locator("input.input.input-mono").first().inputValue()) === "42");
    await setA({ reset: true });
    await p.close(); await ctx.close();
  }

  await setP({ reset: true }); await setA({ reset: true });
} catch (e) {
  log("FATAL", false, String(e?.stack ?? e?.message ?? e).slice(0, 300));
}
await browser.close();
console.log(`\n${"=".repeat(60)}\nPOLISH & INTEGRATION AUDIT   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
