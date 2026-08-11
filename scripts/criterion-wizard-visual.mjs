#!/usr/bin/env node
/**
 * criterion-wizard-visual.mjs — F6b's admin step, DRIVEN and then photographed.
 *
 * ⛔ WHY THIS IS SEPARATE FROM `criterion-i18n-visual.mjs`. That one shoots the PLAYER
 * surface, which is public. This one needs an ADMIN session — so it signs in through
 * the real login form as the account `npm run db:seed-admin-local` creates.
 *
 * ⛔ IT RUNS AGAINST `next build && next start`, NOT `next dev`, AND THAT IS NOT A
 * PREFERENCE. The obvious route — `/api/dev-test/seed-admin`, which mints a session in
 * one call — 404s under `next start` because it is gated on NODE_ENV. Using `next dev`
 * to reach it was tried and cost an hour: the dev server's HMR WebSocket never came up
 * on this machine (19 `ERR_INVALID_HTTP_RESPONSE` console errors), so the page rendered
 * from the server and NEVER HYDRATED — a perfectly healthy wizard whose Continue button
 * stayed `disabled` through 60 seconds of retries, reading exactly like a product bug.
 * ⭐ The fix is to stop needing the dev server, not to lower the bar to what it can
 * show. The dev server also serves stale CSS, so the overflow numbers would have been
 * worthless too.
 *
 * ⛔ NEVER POINT THIS AT PRODUCTION. Logging in as the owner on prod revokes Ali's
 * live session (single-active-session, session.ts) — it refuses any non-localhost base.
 *
 * Setup:
 *   DATABASE_URL=<local> npx tsx scripts/seed-admin-local.mts
 *   DATABASE_URL=<local> DISABLE_ADMIN_TOTP=true npx next start -p 3001
 * Usage:
 *   node scripts/criterion-wizard-visual.mjs --base http://127.0.0.1:3001 --shots .qa-f6-wizard
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:3001").replace(/\/$/, "");
const PHONE = arg("--phone", "+255700000000");
const PASSWORD = arg("--password", "QaAdmin2026!");
const SHOTS = arg("--shots", ".qa-f6-wizard");

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) {
  console.error(`REFUSED — localhost only, got ${BASE}. An owner login on production revokes the live session.`);
  process.exit(1);
}
mkdirSync(SHOTS, { recursive: true });

const EN = "Resolves YES if the Bank of Tanzania official daily mid-rate published on the last business day of the month is strictly below the rate published on the first business day.";
const SW = "Inatatuliwa NDIYO iwapo kiwango rasmi cha katikati cha Benki Kuu ya Tanzania kilichochapishwa siku ya mwisho ya kazi ya mwezi kiko chini ya kiwango cha siku ya kwanza.";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();

for (const width of [360, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // ⛔ CAPTURE THE CONSOLE. A client bundle that fails to load leaves a perfectly
  // rendered server page whose controls never respond — indistinguishable, from the
  // outside, from a product bug. The error is in the console and nowhere else.
  const clientErrors = [];
  page.on("pageerror", (e) => clientErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") clientErrors.push(`console: ${m.text()}`); });
  /**
   * ── Sign in, by the rule `scripts/live/harness.mjs` already writes down ─────
   * Three things it warns about, all of which cost me a run before I read it:
   *   · STAFF sign in at `/auth/admin`, players at `/auth/login`.
   *   · The field takes the 9-DIGIT LOCAL PART, not E.164 (`pattern="[67]\d{8}"`).
   *   · `networkidle`, not `domcontentloaded` — PhoneInput MIRRORS the visible field
   *     into a hidden input on React change. Fill it before hydration and the hidden
   *     mirror stays EMPTY, the form posts a blank identifier, and the server bounces
   *     you to the signed-out home page. ⛔ That looks exactly like a wrong password
   *     and is not one, which is why the mirror is asserted below rather than trusted.
   */
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60000 });
  const local = PHONE.replace(/^\+255/, "");
  const field = (await page.locator("#phone").count()) ? "#phone" : "#identifier";
  await page.fill(field, local);
  const mirror = await page.locator(`input[name="${field.slice(1)}"]`).inputValue().catch(() => "");
  ok(`${width}: the phone field's hidden mirror synced (not a blank post)`, mirror === local, `mirror="${mirror}"`);
  await page.fill('input[type="password"]', PASSWORD);
  // ⚠️ `退出登录` (sign OUT) contains `登录`, hence the lookbehind — harness.mjs's rule.
  await page.getByRole("button", { name: /sign in|log ?in|ingia|(?<!退出)登录/i }).first().click();
  // 🔴 WAIT FOR A POSITIVE SIGNAL, never for the absence of a negative one — and the
  // signal must NOT exist in the failure state. "admin" appears in "Admin sign in",
  // the heading of the page you are on when login FAILS; harness.mjs records a run
  // that scored a failed sign-in as a success on exactly that word and then asserted
  // six things about a screenshot of the login form.
  const signedIn = await page.waitForFunction(() => {
    const t = document.body.innerText.toLowerCase();
    if (/invalid|incorrect|too many attempts|locked/.test(t)) return "bad";
    if (/admin sign in|kuingia kwa wafanyakazi|i'm a player, not staff/.test(t)) return false;
    return /back to app|muhtasari|staff · confidential/.test(t);
  }, undefined, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => false);
  if (signedIn !== true) {
    ok(`${width}: signed in`, false, (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220));
    await page.screenshot({ path: `${SHOTS}/STUCK-login-${width}.png`, fullPage: true });
    await ctx.close(); continue;
  }

  await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // ⛔ REFUSE WHEN THE PREMISE IS ABSENT. Without an admin session this route
  // redirects, and every assertion below would be describing a login page.
  if (!page.url().includes("/admin/markets/new")) {
    ok(`${width}: signed in as an admin`, false, `landed on ${page.url()}`);
    await page.screenshot({ path: `${SHOTS}/STUCK-login-${width}.png`, fullPage: true });
    await ctx.close(); continue;
  }
  await page.getByText("Step 1 / 4").waitFor({ timeout: 60000 });
  // ⛔ NOT `ok(..., true, ...)`. This line used to pass the literal `true` — a
  // PASS-BY-CONSTRUCTION that could not fail, quietly padding a count the write-up
  // then quoted as evidence. The guard above it (the early `continue` on a redirect)
  // does the real work, so the honest thing is to assert something that can be
  // false: that this is the wizard, on the wizard's URL.
  ok(`${width}: the wizard rendered (not a login redirect)`,
     page.url().includes("/admin/markets/new") && (await page.getByText("Step 1 / 4").count()) === 1,
     page.url());

  /**
   * ⚠️ FILL, THEN WAIT FOR THE BUTTON TO AGREE — never fill and click.
   * "Step 1 / 4" is SERVER-rendered, so it appears before React hydrates. A `fill()`
   * landing in that window sets the DOM value and no component state, so `canNext`
   * stays false and Continue never enables: the first run of this driver timed out
   * clicking a disabled button and read as "the wizard is broken". It is not — the
   * page simply was not listening yet. Re-filling until the control responds turns a
   * race into a wait, and if the button never enables that is a real failure.
   *
   * ⚠️ AND THE WINDOW IS 60s, NOT 10s. Turbopack's FIRST compile of a page is ~30s
   * (a documented gotcha in this repo), so a 10s budget failed here on a perfectly
   * healthy wizard — the instrument being impatient, not the product being broken.
   */
  const advance = async (label, fill) => {
    const cont = page.getByRole("button", { name: "Continue" });
    for (let i = 0; i < 60; i++) {
      await fill();
      if (await cont.isEnabled()) { await cont.click(); return true; }
      await page.waitForTimeout(1000);
    }
    // ⭐ EVIDENCE ON FAILURE, NOT ON SUCCESS. A driver that gives up with only a
    // timeout tells you it failed and nothing about WHY — the first version of this
    // one reported "step 1 accepts a title: FAIL" over a page I had never seen.
    await page.screenshot({ path: `${SHOTS}/STUCK-${label}-${width}.png`, fullPage: true });
    const values = await page.evaluate(() =>
      [...document.querySelectorAll("input, textarea")].map((e) => `${e.placeholder || e.type}="${e.value}"`).join(" · "));
    console.log(`     STUCK at ${label}: ${values}`);
    // The distinguishing question: did the page ever become interactive at all?
    console.log(`     client errors (${clientErrors.length}): ${clientErrors.slice(0, 4).join(" | ") || "none"}`);
    return false;
  };

  ok(`${width}: step 1 accepts a title`, await advance("title", async () => {
    await page.getByPlaceholder("Will the TZS strengthen").fill("Will the shilling strengthen against the dollar by month-end?");
  }));
  ok(`${width}: step 2 accepts a source + resolution instant`, await advance("source", async () => {
    await page.getByPlaceholder("https://www.bot.go.tz").fill("https://www.bot.go.tz/exchangerates");
    await page.locator('input[type="datetime-local"]').fill("2026-09-15T14:30");
  }));

  const swBox = page.getByPlaceholder("Inatatuliwa NDIYO");
  const zhBox = page.getByPlaceholder("若坦桑尼亚银行最后一个营业日的中间价");
  ok(`${width}: the step collects all THREE languages`,
     await page.getByPlaceholder("Resolves YES if the BoT").count() === 1 &&
     await swBox.count() === 1 && await zhBox.count() === 1);

  await page.getByPlaceholder("Resolves YES if the BoT").fill(EN);

  // ── The refusal, which is the whole point of F6b's validation ──────────────
  await swBox.fill(EN);                                   // the F8 shape, typed in
  // ⛔ SCOPED TO THE REFUSAL, NOT TO THE PAGE. `[role="alert"]` page-wide also matches
  // the toast live-region, which is always mounted — so "no alert on the page" was
  // false even with the field perfectly valid, and the check failed over a correct
  // screen. A page-wide match cannot tell "my control" from "a control".
  const refusals = page.locator('[role="alert"]').filter({ hasText: /English text|Too short/ });
  const sameMsg = refusals.first();
  await sameMsg.waitFor({ timeout: 5000 });
  ok(`${width}: pasting the English into Swahili is REFUSED`,
     (await sameMsg.innerText()).includes("This is the English text"), (await sameMsg.innerText()).slice(0, 50));
  ok(`${width}: …and Continue is disabled while it stands`,
     await page.getByRole("button", { name: "Continue" }).isDisabled());
  await page.screenshot({ path: `${SHOTS}/refuse-same-as-english-${width}.png`, fullPage: true });

  await swBox.fill("TODO");
  await sameMsg.waitFor({ timeout: 5000 });
  ok(`${width}: a stub is REFUSED as too short`,
     (await sameMsg.innerText()).includes("Too short"), (await sameMsg.innerText()).slice(0, 40));

  // ── The accepted state ────────────────────────────────────────────────────
  await swBox.fill(SW);
  ok(`${width}: a real translation clears the refusal`, await refusals.count() === 0);
  ok(`${width}: …and Continue is enabled again`,
     await page.getByRole("button", { name: "Continue" }).isEnabled());
  await page.screenshot({ path: `${SHOTS}/criterion-step-${width}.png`, fullPage: true });

  // ── The review step must SAY what a blank translation will do ─────────────
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Step 4 / 4").waitFor({ timeout: 15000 });
  const review = await page.locator("text=Review + publish").locator("xpath=ancestor::div[1]").innerText()
    .catch(() => page.locator("body").innerText());
  ok(`${width}: review echoes the Swahili criterion that was entered`, review.includes("Inatatuliwa NDIYO"));
  ok(`${width}: and says what a BLANK Chinese one means, rather than showing an empty dash`,
     review.includes("players see the English"), review.slice(0, 0));
  await page.screenshot({ path: `${SHOTS}/review-${width}.png`, fullPage: true });

  // ── F6c · the OFFICER's review surface for an AI-generated poll ───────────
  // ⛔ A translation the model generates, the DB stores and the publish path carries
  // to the player must be READABLE by the officer who approves it — otherwise a
  // human signs off on the sentence that decides the payout without ever seeing it.
  // Both arms, because "no translation" has to say so rather than leave a blank row.
  for (const [arm, id] of [["translated", "aip_f6_translated"], ["fallback", "aip_f6_untranslated"]]) {
    const tag = `aipoll-${arm}-${width}`;
    await page.goto(`${BASE}/admin/ai-polls/${id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const card = page.getByText("Resolution criterion · EN (binding)").locator("xpath=ancestor::*[self::div][1]");
    await card.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    const text = await card.innerText().catch(() => "");
    ok(`${tag}: the criterion card was located`, text.length > 40, `${text.length} chars`);
    // ⚠️ CASE-INSENSITIVE, because the label carries `text-transform: uppercase` and
    // `innerText` returns the RENDERED text — "EN (BINDING)", not "EN (binding)".
    // The same class of trap as reading a truncated string back from the DOM: CSS
    // changed what the property returns, and the check failed over correct markup.
    ok(`${tag}: it labels English as BINDING`, /en \(binding\)/i.test(text), text.slice(0, 40));
    if (arm === "translated") {
      ok(`${tag}: the Swahili the model produced is shown to the officer`, text.includes("Inatatuliwa NDIYO"));
      ok(`${tag}: and the Chinese too`, /若坦桑尼亚银行/.test(text));
    } else {
      const misses = (text.match(/No translation — players see the English/g) ?? []).length;
      ok(`${tag}: BOTH missing translations say so, rather than leaving blank rows`, misses === 2, `${misses} of 2`);
    }
    await card.screenshot({ path: `${SHOTS}/${tag}.png` }).catch(() => {});
  }

  // Reported, not gated — the dev server can serve stale CSS (see the header).
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`     note ${width}: page horizontal overflow = ${over}px (reported, dev CSS)`);

  await ctx.close();
}

await browser.close();
console.log(`\ncriterion-wizard-visual: ${pass} passed, ${fail} failed · shots in ${SHOTS}/`);
if (fail > 0) process.exit(1);
