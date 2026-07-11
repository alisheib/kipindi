/**
 * pre-deploy-live-check — strict adversarial browser gauntlet.
 *
 *   BASE=http://localhost:3009 node scripts/pre-deploy-live-check.mjs   # full (authed + mutating)
 *   BASE=https://kipindi-production.up.railway.app node scripts/...      # prod read-only subset
 *
 * Rules: ANY console error (minus React dev eval noise), page error, Next.js
 * error overlay, broken internal link, layout overflow, clipped date segment,
 * or mis-handled date is a FAILURE. Exit code != 0 blocks the deploy.
 *
 * Local (localhost) runs also drive authed surfaces via /auth/demo (404 in
 * prod) and assert the invite/History/wallet content. Prod runs skip those.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let pass = 0; const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};
const isDevNoise = (t) =>
  t.includes("eval()") || t.includes("unsafe-eval") || t.includes("React will never use eval") ||
  t.includes("Download the React DevTools");

function attach(page) {
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error" && !isDevNoise(m.text())) errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 500) errs.push(`5xx: ${r.status()} ${r.url()}`); });
  return errs;
}
async function hasErrorOverlay(page) {
  // NOTE: an empty <nextjs-portal> element is ALWAYS present in dev mode — its
  // mere presence is not an error. Only a real error renders a dialog or the
  // signature error text, so detect those specifically.
  return await page.evaluate(() => {
    const t = document.body.innerText || "";
    if (document.querySelector("[data-nextjs-dialog]")) return true;
    return /Unhandled Runtime Error|Build Error|Failed to compile|This page could not be found|Internal Server Error|Application error:/i.test(t);
  });
}

// ── Warmup ──────────────────────────────────────────────────────────
// A freshly-restarted server cold-starts routes on first hit; running the
// strict checks against a cold instance produces false failures (typing races
// hydration, requests time out). Poll health + prime the heaviest routes first
// so every assertion below runs against a warm server — strict, not flaky.
{
  const warm = await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false);
  for (let i = 0; i < 20 && !warm; i++) { await new Promise((r) => setTimeout(r, 1500)); if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break; }
  for (const r of ["/", "/markets", "/auth/register", "/proposals", "/wallet"]) await fetch(BASE + r).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
}

const browser = await chromium.launch();

// ── A. Public route health ──────────────────────────────────────────
console.log("\n[A] Public route health (render + no console/page/5xx errors + no error overlay)");
const PUBLIC_ROUTES = [
  "/", "/markets", "/markets?when=new", "/markets?when=soon", "/markets?when=week",
  "/live", "/leaderboard", "/fairness", "/proposals", "/help",
  "/legal/terms", "/legal/privacy", "/legal/aml", "/legal/responsible-gambling",
  "/auth/login", "/auth/register", "/auth/forgot-password",
];
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  for (const route of PUBLIC_ROUTES) {
    const errs = attach(page);
    let status = 0;
    page.once("response", (r) => { if (r.url() === BASE + route || r.url() === BASE + route + "/") status = r.status(); });
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const overlay = await hasErrorOverlay(page);
    const text = (await page.locator("body").innerText().catch(() => "")).trim();
    ok(`${route} renders content`, text.length > 40, `(len=${text.length})`);
    ok(`${route} no error overlay`, !overlay);
    ok(`${route} no console/page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    page.removeAllListeners("console"); page.removeAllListeners("pageerror"); page.removeAllListeners("response");
  }
  await ctx.close();
}

// ── B. Date field cruelty (/auth/register DOB) ──────────────────────
console.log("\n[B] Date field — clipping, typing order, validation, junk");
{
  // B1 clipping at 3 widths with a full date
  for (const w of [360, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/auth/register", { waitUntil: "domcontentloaded" });
    const day = page.getByLabel("Day"); await day.waitFor({ state: "visible", timeout: 20000 }); await page.waitForTimeout(400);
    await day.click(); await page.keyboard.type("31121999", { delay: 35 });
    for (const lbl of ["Day", "Month", "Year"]) {
      const m = await page.getByLabel(lbl).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, v: el.value }));
      ok(`[w=${w}] ${lbl} not clipped (v="${m.v}")`, m.sw <= m.cw + 1, `scrollW=${m.sw} clientW=${m.cw}`);
    }
    await ctx.close();
  }
  // B2 behavior + validation on one context
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = attach(page);
  await page.goto(BASE + "/auth/register", { waitUntil: "domcontentloaded" });
  const day = page.getByLabel("Day"); await day.waitFor({ state: "visible" }); await page.waitForTimeout(400);
  const clr = async () => { for (const l of ["Day", "Month", "Year"]) { await page.getByLabel(l).click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace"); } };
  const hidden = () => page.locator('input[type=hidden][name=dob]').inputValue();

  // Hydration-robust: the hidden dob only updates once React has attached its
  // onChange (a slow prod cold-start can otherwise accept keystrokes into the
  // raw input before hydration, leaving dob empty). Retry the full valid-date
  // entry until it registers — up to ~9s. If it never does, that's a REAL bug.
  let dobVal = "";
  for (let i = 0; i < 9; i++) {
    await clr(); await page.getByLabel("Day").click();
    await page.keyboard.type("10051990", { delay: 35 });
    dobVal = await hidden();
    if (dobVal === "1990-05-10") break;
    await page.waitForTimeout(1000);
  }
  ok(`valid "10051990" -> hidden dob=1990-05-10`, dobVal === "1990-05-10", `got "${dobVal}"`);

  await clr(); await page.getByLabel("Day").click();
  await page.keyboard.type("1"); const a1 = await page.getByLabel("Day").inputValue();
  await page.keyboard.type("0"); const a10 = await page.getByLabel("Day").inputValue();
  ok(`type "1" -> "1"`, a1 === "1", `got "${a1}"`);
  ok(`type "10" -> "10" (never "01")`, a10 === "10", `got "${a10}"`);

  // impossible date must be invalid + no hidden value
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("31022000", { delay: 25 });
  await page.getByLabel("Year").evaluate((el) => el.blur());
  await page.waitForTimeout(150);
  ok(`31/02/2000 -> hidden dob empty`, (await hidden()) === "", `got "${await hidden()}"`);
  ok(`31/02/2000 -> "Invalid date" shown`, (await page.locator("body").innerText()).includes("Invalid date"));

  // under-18 DOB rejected by max
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("01012025", { delay: 25 });
  await page.getByLabel("Year").evaluate((el) => el.blur()); await page.waitForTimeout(150);
  ok(`01/01/2025 (under 18) -> hidden dob empty`, (await hidden()) === "", `got "${await hidden()}"`);

  // junk letters ignored
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("ab");
  ok(`letters ignored in Day`, (await page.getByLabel("Day").inputValue()) === "");

  ok(`date page no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

// ── C. Responsive overflow (no horizontal scroll on mobile) ─────────
console.log("\n[C] Responsive — no horizontal overflow at 360px");
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  for (const route of ["/", "/markets", "/auth/register", "/leaderboard", "/proposals", "/help"]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${route} no horizontal overflow`, over <= 1, `overflow=${over}px`);
  }
  await ctx.close();
}

// ── D. Dead internal links on key pages ─────────────────────────────
console.log("\n[D] Dead-link crawl (internal links must not 404/5xx)");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const seen = new Set();
  for (const route of ["/", "/markets", "/help", "/proposals"]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of hrefs) {
      if (!h || !h.startsWith("/") || h.startsWith("//")) continue;
      const path = h.split("#")[0]; if (!path || seen.has(path)) continue; seen.add(path);
    }
  }
  for (const path of seen) {
    const res = await page.request.get(BASE + path, { maxRedirects: 3 }).catch(() => null);
    const st = res ? res.status() : 0;
    ok(`link ${path} -> ${st}`, st > 0 && st < 400);
  }
  await ctx.close();
}

// ── E. Tester-change surfaces (public) ──────────────────────────────
console.log("\n[E] Tester changes — demos hidden, New tab, footer email");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/markets?when=new", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  ok(`no demo polls on /markets`, !body.includes("Demo ·"));
  // Single-language display (dual-language labels were removed): only the
  // active locale's word renders, so accept either "New" (en) or "Mpya" (sw).
  ok(`New tab present`, body.includes("New") || body.includes("Mpya"));
  ok(`footer support email`, body.includes("support@50pick.tz"));
  await ctx.close();
}

// ── F. Authed surfaces (LOCAL only — uses /auth/demo, 404 in prod) ──
if (LOCAL) {
  console.log("\n[F] Authed surfaces (local /auth/demo)");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = attach(page);
  await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);

  // History page (was "Positions")
  await page.goto(BASE + "/positions", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const posBody = await page.locator("body").innerText();
  ok(`/positions renders as History`, posBody.includes("History") || posBody.includes("played"), `(no History label)`);
  ok(`/positions no error overlay`, !(await hasErrorOverlay(page)));

  // Wallet
  await page.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  ok(`/wallet renders`, (await page.locator("body").innerText()).length > 60);
  ok(`/wallet no error overlay`, !(await hasErrorOverlay(page)));

  // Invite — single reward only
  await page.goto(BASE + "/profile/invite", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const inv = await page.locator("body").innerText();
  ok(`invite shows 10,000 reward`, inv.includes("10,000") && /first bet/i.test(inv));
  ok(`invite has NO 50% commission line`, !inv.includes("50%"));
  ok(`invite has NO deposit-bonus line`, !/bonus on each/i.test(inv));
  ok(`invite no error overlay`, !(await hasErrorOverlay(page)));

  // Card-body click opens the market detail WITH NO side preselected (like the
  // Details link); the YES/NO buttons enter with that side locked.
  await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
  const liveCard = page.locator(".mcardp:has(.mcardp-actions)").first();
  if (await liveCard.count() > 0) {
    await liveCard.locator(".mcardp-q").click();
    await page.waitForURL(/\/markets\/mkt_[^?]+$/, { timeout: 8000 }).catch(() => {});
    ok(`live card body click -> details, NO side`, /\/markets\/mkt_/.test(page.url()) && !/\?side=/.test(page.url()), page.url());

    // Back to the board, then click the real YES button → locked dial.
    await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
    const yesBtn = page.getByRole("button", { name: /Back YES/ }).first();
    await yesBtn.click();
    await page.waitForURL(/\/markets\/mkt_[^?]+\?side=YES/, { timeout: 12000 }).catch(() => {});
    const id = (page.url().match(/\/markets\/(mkt_[A-Za-z0-9]+)/) || [])[1];
    ok(`YES button opens locked dial (?side=YES)`, /\?side=YES/.test(page.url()), page.url());
    await page.waitForTimeout(400);
    ok(`?side=YES -> Place YES`, (await page.getByRole("button", { name: /Place YES/ }).count()) > 0);
    ok(`?side=YES -> cannot place NO (locked)`, (await page.getByRole("button", { name: /Place NO/ }).count()) === 0);
    ok(`"Your pick" indicator shown`, (await page.locator("body").innerText()).toLowerCase().includes("your pick"));
    ok(`no in-dial switch control (display-only)`, (await page.getByRole("button", { name: /Switch to (YES|NO)|Backing/ }).count()) === 0);
    // Drag-lock: the dial defaults to LOCKED so an accidental brush can't move a
    // set stake; exact entry via the type input must still work while locked.
    const lockToggle = page.locator('[data-testid="dial-lock-toggle"]');
    ok(`dial defaults to LOCKED (drag disabled)`, (await lockToggle.getAttribute("aria-pressed")) === "false", String(await lockToggle.getAttribute("aria-pressed")));
    const stakeBox = page.locator('input[inputmode="numeric"]').first();
    await stakeBox.click(); await stakeBox.fill("3000"); await stakeBox.press("Enter"); await page.waitForTimeout(150);
    ok(`locked dial: exact stake still typeable (3,000)`, (await stakeBox.inputValue()).replace(/\D/g, "") === "3000", await stakeBox.inputValue());
    ok(`typing did not arm the dial (still locked)`, (await lockToggle.getAttribute("aria-pressed")) === "false");
    await lockToggle.click(); await page.waitForTimeout(120);
    ok(`lock toggle arms the dial (drag enabled)`, (await lockToggle.getAttribute("aria-pressed")) === "true");
    const slider = page.getByRole("slider"); await slider.focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    ok(`YES locked: knob can't cross centre`, Number(await slider.getAttribute("aria-valuenow")) <= 50);
    if (id) {
      await page.goto(BASE + `/markets/${id}?side=NO`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
      ok(`?side=NO -> Place NO`, (await page.getByRole("button", { name: /Place NO/ }).count()) > 0);
      ok(`?side=NO -> cannot place YES (locked)`, (await page.getByRole("button", { name: /Place YES/ }).count()) === 0);
      // Direct nav without a side must NOT show the unlocked dial.
      await page.goto(BASE + `/markets/${id}`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
      const noSide = await page.locator("body").innerText();
      ok(`no-side detail shows pick-side gate, not a dial`, /Pick your side/i.test(noSide) && (await page.getByRole("slider").count()) === 0);
    }
  } else {
    ok(`at least one bettable market exists`, false, "no live card found");
  }
  ok(`authed flow no console errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILED:\n" + failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
