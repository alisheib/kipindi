/**
 * BROWSER JOURNEY — the real thing, in a real browser, repeated.
 *
 * Everything else in this change is unit- or service-level. This drives what a
 * PLAYER actually does, through the actual rendered UI:
 *
 *   sign up (with email) → hit the deposit gate → confirm the email →
 *   deposit by CARD (billing fields) → get redirected to the gateway →
 *   come back on the return leg → see the money → open the receipt →
 *   place a bet with the credited balance
 *
 * Run against a dev server wired to scripts/selcom-stub-gateway.mjs:
 *   PAYMENT_API_URL=http://127.0.0.1:4599/v1 ... npx next dev
 *   BASE=http://localhost:3000 node scripts/browser-journey.mjs
 *
 * Every pass asserts the same outcomes, and RUNS is set >1 deliberately: a flow
 * that works once and not the second time is the failure mode that reaches a
 * player. Screenshots of the money-proof surfaces land in
 * .50pick-shots/journey/ and are meant to be READ.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const RUNS = Number(process.env.RUNS || 3);
const OUT = ".50pick-shots/journey";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const problems = [];
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; problems.push(`${label}${extra ? ` — ${extra}` : ""}`); console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const browser = await chromium.launch();
const runSummaries = [];

for (let run = 1; run <= RUNS; run++) {
  console.log(`\n═══ RUN ${run}/${RUNS} ═══`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  // `navigator.vibrate` is refused by Chrome until the frame has a real user
  // gesture, and our haptics helper calls it from the confirm button. It is a
  // browser policy notice, not an application error — the house responsive-audit
  // treats it the same way. Filtering it keeps a genuine console error visible.
  const IGNORABLE = /navigator\.vibrate/i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORABLE.test(m.text())) consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  const stamp = `${Date.now()}${run}`;
  const phone = `7${String(10000000 + run * 137 + (Date.now() % 100000)).slice(0, 8)}`;
  const email = `journey.${stamp}@example.com`;
  const PW = "Str0ng!Passw0rd";

  // ── 1. SIGN UP (email is now mandatory) ────────────────────────────────────
  await page.goto(`${BASE}/auth/register`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  ok(`run ${run} · sign-up form has an email field`, (await page.locator("#email").count()) === 1);

  await page.fill("#phone", phone);
  await page.fill("#email", email);
  await page.fill('input[name="password"]', PW);
  await page.fill('input[name="passwordConfirm"]', PW);
  // DOB is a segmented DD / MM / YYYY mask (DateSelect), not a native date input:
  // three text segments that feed a hidden ISO field. Type into the segments the
  // way a player does — writing the hidden input directly would bypass the very
  // masking logic we want exercised.
  await page.fill('input[aria-label="Day"]', "01");
  await page.fill('input[aria-label="Month"]', "01");
  await page.fill('input[aria-label="Year"]', "1990");
  await page.locator('input[aria-label="Year"]').blur();
  await page.waitForTimeout(200);
  ok(`run ${run} · DOB mask produced a valid ISO date`,
    (await page.locator('input[name="dob"]').inputValue()) === "1990-01-01",
    await page.locator('input[name="dob"]').inputValue());
  await page.check('input[name="acceptAge"]', { force: true });
  await page.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
  ok(`run ${run} · signed up and landed in-app`, !page.url().includes("/auth/register"), page.url());

  // ── 2. THE GATE — a fresh account must NOT be able to deposit ─────────────
  await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(500);
  const gateShown = await page.locator('[data-testid="email-verify-gate"]').count();
  ok(`run ${run} · a brand-new account meets the EMAIL GATE`, gateShown === 1);
  ok(`run ${run} · the deposit form is NOT reachable while unverified`,
    (await page.locator("#provider-CARD").count()) === 0);
  await page.screenshot({ path: `${OUT}/run${run}-1-gate.png`, fullPage: false });

  // ── 3. CONFIRM THE EMAIL (the link the player gets by mail) ───────────────
  // Mint the same signed token the mail carries, via the dev-only helper.
  const verifyUrl = await page.evaluate(async (b) => {
    const r = await fetch(`${b}/api/dev/verify-link`, { credentials: "include" });
    return r.ok ? (await r.json()).url : null;
  }, BASE);
  ok(`run ${run} · a confirmation link exists for this account`, !!verifyUrl, String(verifyUrl));
  if (verifyUrl) {
    await page.goto(verifyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(600);
    const body = await page.locator("body").innerText();
    ok(`run ${run} · the link confirms the address`, /confirm|thibitish|确认/i.test(body), body.slice(0, 90));
    await page.screenshot({ path: `${OUT}/run${run}-2-verified.png`, fullPage: false });
  }

  // ── 4. DEPOSIT BY CARD ────────────────────────────────────────────────────
  await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(500);
  ok(`run ${run} · after confirming, the deposit FORM renders`,
    (await page.locator('[data-testid="email-verify-gate"]').count()) === 0);

  // The radio is `sr-only` (the tile is the visible control), so click the LABEL —
  // exactly what a player taps.
  await page.locator('label:has(#provider-CARD)').click();
  await page.waitForTimeout(300);
  ok(`run ${run} · choosing Card reveals the billing block`,
    await page.locator('[data-testid="card-billing"]').isVisible());
  ok(`run ${run} · choosing Card hides the mobile-money number`,
    !(await page.locator("#msisdn").isVisible().catch(() => true)));

  await page.fill('input[name="amount"]', "20000");
  await page.fill('input[name="billingFirstName"]', "Journey");
  await page.fill('input[name="billingLastName"]', "Tester");
  await page.fill('input[name="billingAddress1"]', "12 Samora Ave");
  await page.fill('input[name="billingCity"]', "Dar es Salaam");
  await page.fill('input[name="billingRegion"]', "Dar es Salaam");
  await page.fill('input[name="billingPostcode"]', "P.O. Box 1234");
  await page.screenshot({ path: `${OUT}/run${run}-3-card-form.png`, fullPage: true });

  // Two-step confirm (audit M9), same as bet + withdraw: the gold trigger opens a
  // dialog, whose CONFIRM button is labelled with the action ("Deposit"), not the
  // word "Confirm" — target it by position, not by guessing copy.
  await page.locator('form button.btn-gold').click();
  await page.waitForTimeout(500);
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').last();
  ok(`run ${run} · the confirm dialog opens before any money moves`, await dialog.isVisible());
  const dialogText = await dialog.innerText();
  ok(`run ${run} · confirm dialog states the amount`, /20,000/.test(dialogText), dialogText.slice(0, 120));
  await page.screenshot({ path: `${OUT}/run${run}-3b-confirm.png`, fullPage: false });
  // ConfirmModal renders CONFIRM first and CANCEL last (cancel is `btn-ghost`),
  // and the panel also has a top-right ✕ — so neither .first() nor .last() is the
  // confirm. Target the primary action explicitly.
  await dialog.locator('button.w-full:not(.btn-ghost)').first().click();

  await page.waitForURL(/\/wallet\/deposit\/return/, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // ── 5. THE RETURN LEG — the money proof ───────────────────────────────────
  const returnText = await page.locator("body").innerText();
  ok(`run ${run} · landed on the return leg`, page.url().includes("/wallet/deposit/return"), page.url());
  ok(`run ${run} · return leg reports the payment as received`,
    /payment received|malipo yamepokelewa|已收到付款/i.test(returnText), returnText.slice(0, 140));
  ok(`run ${run} · return leg shows the amount`, /20,000/.test(returnText));
  ok(`run ${run} · return leg shows a gateway reference`, /dep_/.test(returnText));
  ok(`run ${run} · return leg shows the new balance`, /20,000/.test(returnText));
  await page.screenshot({ path: `${OUT}/run${run}-4-return-paid.png`, fullPage: true });

  // Refresh the return leg — must NOT credit twice.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // ── 6. THE RECEIPT ────────────────────────────────────────────────────────
  const receiptLink = page.locator('a[href^="/wallet/receipt/"]').first();
  ok(`run ${run} · the return leg links to a receipt`, (await receiptLink.count()) > 0);
  if (await receiptLink.count()) {
    await Promise.all([
      page.waitForURL(/\/wallet\/receipt\//, { timeout: 30_000 }).catch(() => {}),
      receiptLink.click(),
    ]);
    await page.waitForTimeout(1200);
    const receipt = await page.locator("body").innerText();
    ok(`run ${run} · receipt opens`, page.url().includes("/wallet/receipt/"), page.url());
    ok(`run ${run} · receipt shows the amount`, /20,000/.test(receipt));
    ok(`run ${run} · receipt shows a gateway reference`, /dep_/.test(receipt));
    ok(`run ${run} · receipt reads as completed`, /completed|imekamilika|已完成/i.test(receipt));
    await page.screenshot({ path: `${OUT}/run${run}-5-receipt.png`, fullPage: true });
  }

  // ── 7. THE MONEY IS REALLY THERE, AND ONLY ONCE ───────────────────────────
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1200);
  const walletText = await page.locator("body").innerText();
  ok(`run ${run} · wallet shows the credited balance`, /20,000/.test(walletText));
  ok(`run ${run} · balance is NOT doubled by the refresh`, !/40,000/.test(walletText));
  await page.screenshot({ path: `${OUT}/run${run}-6-wallet.png`, fullPage: true });

  ok(`run ${run} · no console errors across the whole journey`,
    consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

  runSummaries.push({
    gate: gateShown === 1,
    paid: /payment received|malipo yamepokelewa|已收到付款/i.test(returnText),
    balanceShown: /20,000/.test(walletText),
    doubled: /40,000/.test(walletText),
  });

  await ctx.close();
}

await browser.close();

// Determinism across runs — the property that actually matters.
const first = JSON.stringify(runSummaries[0]);
ok(`ALL ${RUNS} browser runs produced an IDENTICAL outcome`,
  runSummaries.every((r) => JSON.stringify(r) === first), JSON.stringify(runSummaries));

console.log(`\nbrowser-journey: ${pass} passed, ${fail} failed`);
console.log(`screenshots → ${OUT}`);
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of problems) console.log(`  · ${p}`);
}
if (fail > 0) process.exit(1);
