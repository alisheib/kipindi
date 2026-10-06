/**
 * Probe (S10, 2026-10-02) — does a failed sign-in / sign-up MARK the field it refused, for a screen reader?
 *
 * The Input atom derives `aria-invalid` from its `error` prop ALONE and writes it after the spread ("the two are one
 * fact", input.tsx), so a caller that passed only `aria-invalid` had it silently dropped: /auth/login's identifier
 * and /auth/register's phone and email said "no account" / "already registered" in words while every field read
 * valid. This loads each error state at phone and desktop width and reads the attribute the browser actually holds.
 *
 * ⭐ 2026-10-06 · THE SIGN-UP CASE IS DRIVEN, NOT TYPED INTO THE ADDRESS BAR. A refused sign-up no longer redirects to
 * `/auth/register?error=exists`: the refusal returns to the still-mounted form (register-form.tsx), so there is no URL
 * to load. Instead each width registers one account, then — each in a fresh context — submits the SAME phone with a new
 * email (the phone box, and only it, must read invalid) and the SAME email with a new phone (the email box, and only
 * it). 🔴 C3: "phone taken" used to mark the email box too, and "email taken" marked nothing.
 *
 *   BASE=http://localhost:3010 node scripts/live/auth-invalid-probe.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = ".qa-shots/marketing-setup/auth-invalid";
mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { if (c) pass++; else fail++; console.log(`  ${c ? "ok  " : "FAIL"} ${l}${x ? ` -- ${x}` : ""}`); };

const CASES = [
  { path: "/auth/login?error=no_account", field: "#identifier", want: "true", name: "login-no-account" },
  { path: "/auth/login", field: "#identifier", want: null, name: "login-clean" },
  { path: "/auth/register", field: "#phone", want: null, name: "register-clean" },
];
const PASSWORD = "Probe!Pass2026x";
/** A fresh valid Tanzanian mobile (74 + seven digits), different on every call. */
let seq = 0;
const freshPhone = () => `74${String((Date.now() + ++seq * 7919) % 10_000_000).padStart(7, "0")}`;
async function resetLimits() { await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {}); }

/** Fill the sign-up form and submit; resolves when the refusal panel shows or the tab leaves /auth/register. */
async function signUp(page, { phone, email }) {
  await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await page.fill("#phone", phone);
  await page.fill("#email", email);
  await page.locator("#dob").fill("15");
  await page.locator('input[aria-label="Month"]').fill("01");
  await page.locator('input[aria-label="Year"]').fill("1990");
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="passwordConfirm"]', PASSWORD);
  await page.check('input[name="acceptAge"]', { force: true });
  await page.check('input[name="acceptTerms"]', { force: true });
  // Each wait swallows its own timeout, so the one that loses the race never rejects unhandled.
  const settled = Promise.race([
    page.waitForSelector("[data-refusal]", { timeout: 10_000 }).catch(() => null),
    page.waitForURL((u) => !u.pathname.startsWith("/auth/register"), { timeout: 10_000 }).catch(() => null),
  ]);
  await page.click('button[type="submit"]');
  await settled;
}
/** A context in English, so the date box's segments are named Day / Month / Year. */
async function englishContext(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  return ctx;
}
const ariaInvalid = async (page, sel) => ((await page.locator(sel).count()) ? page.locator(sel).first().getAttribute("aria-invalid") : "MISSING");

const browser = await chromium.launch();
for (const vp of [{ name: "360x780", width: 360, height: 780 }, { name: "1280x800", width: 1280, height: 800 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  console.log(`\n[auth-invalid] ${vp.name}`);
  for (const c of CASES) {
    await page.goto(BASE + c.path, { waitUntil: "networkidle" }).catch(() => {});
    const count = await page.locator(c.field).count();
    const got = count ? await page.locator(c.field).first().getAttribute("aria-invalid") : "MISSING";
    ok(`${vp.name} · ${c.path} · ${c.field} reads aria-invalid=${c.want ?? "(absent)"}`, got === c.want, `got ${got}`);
    if (count) {
      await page.locator(c.field).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: `${SHOTS}/${vp.name}-${c.name}.png` });
    }
  }
  await ctx.close();

  // ── the driven duplicate: one real account, then its phone and its email each tried again ──
  const phone = freshPhone();
  const email = `probe.${phone}@50pick.test`;
  await resetLimits();
  const first = await englishContext(vp);
  const firstPage = await first.newPage();
  await signUp(firstPage, { phone, email });
  const created = !new URL(firstPage.url()).pathname.startsWith("/auth/register");
  ok(`${vp.name} · setup: the first sign-up created the account (left /auth/register)`, created, firstPage.url());
  await first.close();

  for (const dup of [
    { name: "register-phone-taken", phone, email: `probe.other.${freshPhone()}@50pick.test`, code: "exists", invalid: "#phone", valid: "#email" },
    { name: "register-email-taken", phone: freshPhone(), email, code: "email_exists", invalid: "#email", valid: "#phone" },
  ]) {
    await resetLimits();
    const dctx = await englishContext(vp);
    const dpage = await dctx.newPage();
    await signUp(dpage, { phone: dup.phone, email: dup.email });
    const code = await dpage.locator("[data-refusal]").first().getAttribute("data-refusal").catch(() => null);
    const marked = await ariaInvalid(dpage, dup.invalid);
    const unmarked = await ariaInvalid(dpage, dup.valid);
    ok(`${vp.name} · ${dup.name} · the refusal panel names ${dup.code}, with nothing in the URL`,
      code === dup.code && !/error=/.test(dpage.url()), `got ${code} · ${dpage.url()}`);
    ok(`${vp.name} · ${dup.name} · ${dup.invalid} reads aria-invalid=true and ${dup.valid} reads it absent`,
      marked === "true" && unmarked === null, `${dup.invalid}=${marked} · ${dup.valid}=${unmarked}`);
    await dpage.locator(dup.invalid).first().scrollIntoViewIfNeeded().catch(() => {});
    await dpage.screenshot({ path: `${SHOTS}/${vp.name}-${dup.name}.png` });
    await dctx.close();
  }
}
await browser.close();
console.log(`\nauth-invalid-probe: ${pass} passed, ${fail} failed\nshots: ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
