/**
 * MINT "QA Mobile 01" — the signed-in player the Mobile Visual Plan measures production as (plan §9 U1).
 *
 *   LIVE_BASE=https://www.50pick.tz npm run ops:mint-qa-mobile
 *
 * ⭐ WHY IT EXISTS. The 2026-09-11 pre-launch reset (docs/PRELAUNCH-RESET.md) deleted every account except three
 * ADMINs — the personas, the staff QA identities and the whole QA fleet. So on 2026-09-22 there was NO player a
 * production drive could sign in as, and plan §11 step 7 re-measures production "signed out and as the QA player".
 *
 * ⭐ HOW, AND WHY THIS WAY. Through the REAL sign-up form — never a direct SQL insert (`ops-qa-fleet.mts`): the
 * product writes the user, the wallet, the terms acceptance and the chained audit row itself, and the account is
 * shaped exactly like a new player's. Then the display name is set through /profile, as a player would.
 *   · phone 712000110 — the next number of the old QA persona block (+2557120001NN), OUTSIDE the fleet predicate
 *     `+2557990000%`, so a future fleet `fund`/`destroy` can never touch it. Checked 2026-09-22 against production's
 *     ADMIN_BOOTSTRAP_PHONES and TESTER_BOOTSTRAP_PHONES (a listed phone would be promoted at sign-up): in neither.
 *   · email qa.mobile01@50pick.test — Ali's choice (2026-09-22). It does not deliver: the first mail hard-bounces
 *     and the address is suppressed, and the account keeps the (collapsible) verify-email bar, like any new player.
 *   · wallet 0, never funded, no deposit possible (a verified email gates deposits). It moves no money.
 *
 * ⛔ ONE MINT, EVER. The password is generated here, written to the gitignored `.env.qa.local` of THIS checkout as
 * QA_MOBILE01_PASSWORD before anything can throw, and never printed. The script refuses if that key already exists:
 * re-minting would fail (the phone is taken) or, worse, strand a second account. To use the account on another PC,
 * copy the two lines of `.env.qa.local`; never re-mint.
 * ⛔ The user agent is Playwright's headless default, which carries "HeadlessChrome" — /api/pv drops it.
 * Retire at the programme's close (plan §1a) by closing the account in /profile/account, and log it in plan §2.
 */
import { chromium } from "playwright";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { BASE, PERSONA, recorder, bodyText } from "./harness.mjs";

const R = recorder(`ops:mint-qa-mobile — ${BASE}`);
const P = PERSONA.mobile01;
const EMAIL = "qa.mobile01@50pick.test";
const NAME = "QA Mobile 01";
const envFile = new URL("../../.env.qa.local", import.meta.url);
const existing = (() => { try { return readFileSync(envFile, "utf8"); } catch { return ""; } })();
if (new RegExp(`^${P.secret}\\s*=`, "m").test(existing)) {
  console.error(`REFUSING: ${P.secret} is already in .env.qa.local — this account was minted. Never re-mint; copy the file instead.`);
  process.exit(2);
}

const b = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", domain: new URL(BASE).hostname, path: "/" }]);
const page = await ctx.newPage();
R.check("the browser's user agent carries HeadlessChrome", /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));

const password = `Qamob-${randomBytes(12).toString("base64url")}!`;
await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
// PhoneInput mirrors the visible field into a hidden input on change: fill until the mirror agrees (harness login()).
for (let i = 0; i < 8; i++) {
  await page.fill("#phone", P.phone);
  await page.waitForTimeout(250);
  if ((await page.locator('input[name="phone"]').inputValue().catch(() => "")).replace(/\D/g, "").endsWith(P.phone)) break;
}
R.check("the phone reached the form's hidden field", (await page.locator('input[name="phone"]').inputValue()).replace(/\D/g, "").endsWith(P.phone));
await page.fill("#email", EMAIL);
await page.getByLabel("Day", { exact: true }).fill("01");
await page.getByLabel("Month", { exact: true }).fill("01");
await page.getByLabel("Year", { exact: true }).fill("1990");
await page.waitForTimeout(300);
R.check("the date of birth reached the form's hidden field", (await page.locator('input[name="dob"]').inputValue()) === "1990-01-01",
  await page.locator('input[name="dob"]').inputValue());
await page.fill('input[name="password"]', password);
await page.fill('input[name="passwordConfirm"]', password);
for (const n of ["acceptAge", "acceptTerms"]) {
  const c = page.locator(`input[name="${n}"]`);
  if (!(await c.isChecked())) await c.check({ force: true });
  R.check(`${n} is checked`, await c.isChecked());
}
R.check("marketing opt-in left unchecked", !(await page.locator('input[name="marketingOptIn"]').isChecked()));
if (R.failed) { await b.close(); process.exit(R.done() === 0 ? 0 : 1); }

await page.locator('form button[type="submit"]').first().click();
await page.waitForURL((u) => !/\/auth\/register/i.test(u.toString()), { timeout: 120_000 }).catch(() => {});
const landed = new URL(page.url());
if (/\/auth\/register/.test(landed.pathname)) {
  R.check("registration accepted", false, `still on the form: ${landed.search} · ${(await bodyText(page)).slice(0, 200)}`);
  await b.close();
  process.exit(R.done() === 0 ? 0 : 1);
}
// Record the password BEFORE any later step can throw, so the account is never stranded.
appendFileSync(envFile, `${existing.endsWith("\n") || !existing ? "" : "\n"}QA_MOBILE01_PHONE=${P.phone}\n${P.secret}=${password}\n`);
R.check(`registration accepted — landed on ${landed.pathname}`, true);
R.note(`${P.secret} written to .env.qa.local (not printed)`);

// The display name, through the product (profile/actions.ts updateProfileBasicsAction).
await page.goto(`${BASE}/profile`, { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "Edit display name" }).click();
const input = page.getByLabel("Your name", { exact: true });
await input.fill(NAME);
await input.press("Enter");
const named = await page.waitForFunction((n) => document.body.innerText.includes(n), NAME, { timeout: 20_000 }).then(() => true, () => false);
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(1500);
R.check(`the display name reads "${NAME}" after a reload`, named && (await page.evaluate((n) => document.body.innerText.includes(n), NAME)));
R.check("the account is a PLAYER (no staff role badge on /profile)", !/\b(admin|compliance|moderator|finance)\b/i.test((await bodyText(page)).slice(0, 1500)));
const bal = await page.locator('[data-testid="wallet-balance-capsule"]').first().innerText().catch(() => "");
R.check("the wallet holds TZS 0", /\b0\b/.test(bal.replace(/,/g, "")), bal);

await b.close();
process.exit(R.done() === 0 ? 0 : 1);
