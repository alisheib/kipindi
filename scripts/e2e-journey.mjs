/**
 * S14 local journey proof. Run against a disposable `next dev` at KP_BASE with no DATABASE_URL,
 * PAYMENT_AGGREGATOR=mock, EMAIL_OUTBOX_CAPTURE=1 and DISABLE_ADMIN_TOTP=true.
 * No production host, configured database, real rail or seeded funding is accepted.
 *
 * Registration is password-based after the 2026-10-06 auth change. Its email confirmation
 * is a link, not a code; the drive reads the actual captured dev-outbox message and follows it.
 */
import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { premise, mintStaffPass, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { bodyKey, freshPlayer, observed, openSheet, post, S, pageIn } from "./live/bet-sheet-gates.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3048";
const OUT = resolve(process.env.KP_E2E_OUT ?? ".qa-shots/simple-journey/e2e");
const checks = [];
const stamp = () => new Date().toISOString();
const check = (name, condition, detail = "") => {
  checks.push({ name, state: condition ? "PASS" : "FAIL", detail });
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) throw new Error(name + (detail ? `: ${detail}` : ""));
};
const body = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const shot = async (page, name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: name === "03-deposit-form",
    style: "nextjs-portal{display:none!important}" });
};
const cookie = (base, c) => ({ name: c.name, value: c.value, url: base });
const waitFrame = (page, frame, timeout = 120_000) => page.locator(`${S.root}[data-frame="${frame}"]`).waitFor({ timeout });
const sheetPick = async (page, id = null) => {
  const locator = page.locator('[data-sheet] a[data-bet-side="YES"]');
  await locator.first().waitFor({ state: "visible", timeout: 120_000 });
  const candidates = await locator.count();
  for (let i = 0; i < candidates; i++) {
    const choice = locator.nth(i);
    const seed = await choice.evaluate((el) => JSON.parse(el.closest("[data-sheet]").getAttribute("data-sheet")));
    if (!id || seed.id === id) { await choice.click(); await page.locator(S.root).waitFor(); return seed; }
  }
  throw new Error(`No pick for market ${id}`);
};
const money = async (ctx, marketId) => observed(BASE, ctx, marketId);
const noPosition = async (ctx, marketId, name) => {
  const x = await money(ctx, marketId);
  check(name, x.positionCount === 0 && x.betPlacedCount === 0, `positions=${x.positionCount}, bet ledger=${x.betPlacedCount}`);
  return x;
};
const phoneFor = (suffix) => `+25571${String(Number(BigInt("0x" + randomUUID().replaceAll("-", "").slice(0, 10)) % 10_000_000n) + suffix).slice(-7).padStart(7, "0")}`;

const startedAt = stamp();
const pre = await premise(BASE);
if (pre.refuse) { console.error(`INVALID local premise: ${pre.refuse}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let admin, player, controlPage;
let demoWas = null;
const evidence = { startedAt, base: BASE, commit: null, checks, images: [], note: "Local in-memory mock rail only; no real payment or production proof." };
const rememberShot = async (page, name) => { await shot(page, name); evidence.images.push(`${name}.png`); };

try {
  admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  await post(BASE, admin, "seed-admin", { role: "ADMIN", phone: phoneFor(31), name: "S14 Journey Operator", balance: 0 });
  const catalogue = await post(BASE, admin, "seed-markets");
  check("open market fixture", catalogue.ids?.length > 0, `${catalogue.ids?.length ?? 0} markets`);
  controlPage = await admin.newPage();
  await controlPage.goto(`${BASE}/admin/payments?tab=rails`, { waitUntil: "domcontentloaded" });
  const mock = controlPage.getByRole("radio", { name: /Mock/ });
  await mock.waitFor({ timeout: 120_000 });
  check("mock payment rail selected", (await mock.getAttribute("aria-checked")) === "true");
  const asyncSwitch = controlPage.locator('[aria-label^="Demo async (test):"]').first();
  await asyncSwitch.waitFor();
  const asyncOn = async () => (await asyncSwitch.getAttribute("aria-label")) === "Demo async (test): on";
  const setAsync = async (want) => {
    if ((await asyncOn()) === want) return;
    await controlPage.waitForFunction(() => {
      const el = document.querySelector('[aria-label^="Demo async (test):"]');
      return el && Object.keys(el).some((key) => key.startsWith("__reactProps$") && typeof el[key].onClick === "function");
    }, null, { timeout: 90_000 });
    await asyncSwitch.click();
    await controlPage.locator(`[aria-label="Demo async (test): ${want ? "on" : "off"}"]`).waitFor({ timeout: 60_000 });
    await controlPage.reload({ waitUntil: "domcontentloaded" });
    await asyncSwitch.waitFor();
    if ((await asyncOn()) !== want) throw new Error(`Demo async failed to persist ${want ? "on" : "off"}`);
  };
  demoWas = await asyncOn();
  await setAsync(false);
  check("mock starts synchronous", !(await asyncOn()));

  const pass = await mintStaffPass(browser, BASE, { phone: phoneFor(37), name: "S14 Preview Support" });
  player = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await player.addCookies([cookie(BASE, pass), { name: LOCALE_COOKIE, value: "en", url: BASE }]);
  const page = await pageIn(BASE, player, "/markets", []);
  const betRequests = [];
  player.on("request", (req) => {
    const payload = req.postDataBuffer();
    if (req.method() === "POST" && req.headers()["next-action"] && payload?.includes("marketId")) betRequests.push(req);
  });
  // The guest host is a lazy shell chunk. `pageIn` waits for the page, then give its passive effect one turn.
  await page.waitForTimeout(2_000);
  const boardPath = new URL(page.url()).pathname;
  const selected = await sheetPick(page);
  await page.locator(`${S.root}[data-guest]`).waitFor();
  const signupVisible = await page.locator('[data-testid="journey-sheet-signup"]').isVisible();
  check("guest choice opens a sheet in place", new URL(page.url()).pathname === boardPath && signupVisible,
    `path=${new URL(page.url()).pathname}, frame=${await page.locator(S.root).getAttribute("data-frame")}, signup=${signupVisible}`);
  check("guest choice sends no bet request", betRequests.length === 0);
  await rememberShot(page, "01-guest-sheet");

  await page.locator('[data-testid="journey-sheet-signup"]').click();
  await page.waitForURL(/\/auth\/register/, { timeout: 120_000 });
  check("registration carries choice", new URL(page.url()).searchParams.get("next")?.includes("bet=") === true);
  const phone = phoneFor(41);
  const email = `s14.${randomUUID()}@50pick.test`;
  await page.locator("#phone").fill(phone.replace("+255", ""));
  await page.locator("#email").fill(email);
  await page.locator('input[name="password"]').fill("S14.Journey!Passw0rd");
  await page.locator('input[name="passwordConfirm"]').fill("S14.Journey!Passw0rd");
  await page.locator('input[aria-label="Day"]').fill("01");
  await page.locator('input[aria-label="Month"]').fill("01");
  await page.locator('input[aria-label="Year"]').fill("1990");
  await page.locator('input[aria-label="Year"]').blur();
  await page.locator('input[name="acceptAge"]').check({ force: true });
  await page.locator('input[name="acceptTerms"]').check({ force: true });
  await page.locator('form:has(#email) button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/auth/register", { timeout: 120_000 });
  check("registration returns to selected market", new URL(page.url()).pathname === boardPath && new URL(page.url()).searchParams.get("bet")?.startsWith(selected.id + "."));
  await waitFrame(page, "low");
  check("new player has short balance", (await page.locator('[data-testid="journey-sheet-deposit"]').isVisible()));
  await noPosition(player, selected.id, "registration does not place a bet");
  await rememberShot(page, "02-short-balance");

  const outbox = await player.request.get(`${BASE}/api/dev-test/last-verification-link`, { timeout: 120_000 });
  const mail = await outbox.json().catch(() => null);
  check("registration email captured in dev outbox", outbox.ok() && mail?.ok === true);
  const verifyUrl = new URL(mail.url);
  check("captured email link stays on local server", verifyUrl.origin === BASE && verifyUrl.pathname === "/auth/verify-email");
  const verifyPage = await player.newPage();
  await verifyPage.goto(verifyUrl.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
  check("captured email link opens confirmation", /confirm|thibitish|verify/i.test(await body(verifyPage)));
  await verifyPage.close();

  await page.locator('[data-testid="journey-sheet-deposit"]').click();
  await page.waitForURL(/\/wallet\/deposit\?/, { timeout: 120_000 });
  await page.locator('[data-testid="journey-deposit-form"]').waitFor();
  check("low-balance deposit carries selected bet", new URL(page.url()).searchParams.get("bet")?.startsWith(selected.id + "."));
  await page.locator('label:has(#provider-MPESA)').click();
  await page.locator('input[name="amount"]').fill("1000");
  await page.locator("#msisdn").fill(phone.replace("+255", ""));
  await rememberShot(page, "03-deposit-form");
  const depositActions = [];
  player.on("request", (req) => {
    const payload = req.postDataBuffer();
    if (req.method() === "POST" && req.headers()["next-action"] && payload?.includes("idempotencyKey") && payload?.includes("pendingBet")) depositActions.push(req);
  });
  await page.locator('[data-testid="journey-deposit-form"] button[type="submit"]').click();
  await page.waitForURL(/\/wallet\/deposit\/wait/, { timeout: 120_000 });
  check("deposit visits waiting route", page.url().includes("/wallet/deposit/wait/"));
  const waitUrl = page.url();
  const txnId = new URL(waitUrl).pathname.split("/").at(-1);
  const statusUrl = `${BASE}/api/wallet/deposits/${encodeURIComponent(txnId)}/status`;
  const paidStatus = await player.request.get(statusUrl).then((r) => r.json());
  check("mock deposit confirmed once", paidStatus.state === "PAID" && paidStatus.amount === 1000 && paidStatus.balance === 1000);
  await page.getByText("Payment received", { exact: true }).waitFor({ timeout: 30_000 });
  check("waiting page tells player the deposit arrived and a bet still needs a press",
    (await body(page)).includes("no bet was placed automatically"));
  await rememberShot(page, "04-paid-waiting");
  await noPosition(player, selected.id, "confirmed deposit does not auto bet");
  check("no hidden bet action before player press", betRequests.length === 0, `requests=${betRequests.length}`);

  // A reload is the browser's normal replay path; the stored funding identity and confirmed row must not credit twice.
  await page.goto(waitUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const replayStatus = await player.request.get(statusUrl).then((r) => r.json());
  check("waiting-page replay does not double-credit", replayStatus.state === "PAID" && replayStatus.balance === 1000);
  await noPosition(player, selected.id, "waiting-page replay does not auto bet");
  // The same action body/key is replayed through the server once, after the UI's own paid return.
  check("one deposit action captured", depositActions.length === 1, `actions=${depositActions.length}`);
  const original = depositActions[0];
  const replayHeaders = Object.fromEntries(Object.entries(original.headers()).filter(([k]) => !["cookie", "host", "content-length", "connection", "accept-encoding"].includes(k)));
  const replay = await player.request.post(original.url(), { headers: replayHeaders, data: original.postDataBuffer(), maxRedirects: 0, timeout: 120_000 });
  check("same-key deposit action replay is handled", replay.status() < 500, `HTTP ${replay.status()}`);
  const afterActionReplay = await player.request.get(statusUrl).then((r) => r.json());
  check("same-key action replay cannot double-credit", afterActionReplay.state === "PAID" && afterActionReplay.balance === 1000);
  await noPosition(player, selected.id, "same-key action replay does not bet");

  // The first-deposit notice can hold the return. A human press takes the player back to the chosen sheet.
  if (!page.url().includes("/markets")) {
    const back = page.getByRole("button", { name: /return to|back to|rudi|返回/i });
    if (await back.count()) await back.first().click();
  }
  await page.waitForURL((url) => url.pathname === boardPath, { timeout: 120_000 });
  await waitFrame(page, "edit");
  await noPosition(player, selected.id, "returned choice still awaits a separate press");
  check("returned sheet shows an enabled place button", await page.locator('[data-testid="journey-sheet-place"]').isEnabled());
  await rememberShot(page, "05-returned-choice");
  await page.locator('[data-testid="journey-sheet-place"]').click();
  await waitFrame(page, "receipt");
  const placed = await money(player, selected.id);
  check("one explicit press places exactly one bet", placed.positionCount === 1 && placed.betPlacedCount === 1,
    `positions=${placed.positionCount}, bet ledger=${placed.betPlacedCount}`);
  check("one bet action after manual press", betRequests.length === 1, `requests=${betRequests.length}`);
  await rememberShot(page, "06-one-bet-receipt");

  // A refusal on a separate, unfunded player must leave the wallet and choice untouched.
  const failedPlayer = await freshPlayer(browser, BASE, pass, { balance: 0, locale: "en" });
  const failedPage = await pageIn(BASE, failedPlayer.ctx, "/", []);
  const failedSeed = await openSheet(failedPage);
  await waitFrame(failedPage, "low");
  await noPosition(failedPlayer.ctx, failedSeed.id, "decline control starts without a position");
  await failedPage.locator('[data-testid="journey-sheet-deposit"]').click();
  await failedPage.waitForURL(/\/wallet\/deposit\?/);
  await failedPage.locator('label:has(#provider-MPESA)').click();
  await failedPage.locator('input[name="amount"]').fill("1013"); // mock rail's documented decline hook
  await failedPage.locator("#msisdn").fill("712345678");
  const declinedActions = [];
  failedPlayer.ctx.on("request", (req) => {
    const payload = req.postDataBuffer();
    if (req.method() === "POST" && req.headers()["next-action"] && payload?.includes("pendingBet") && payload?.includes("idempotencyKey")) declinedActions.push(req);
  });
  await failedPage.locator('[data-testid="journey-deposit-form"] button[type="submit"]').click();
  await failedPage.waitForURL((url) => url.pathname === "/wallet/deposit/wait" && url.searchParams.has("key"), { timeout: 120_000 });
  await failedPage.getByText("Your wallet was not credited.", { exact: false }).waitFor({ timeout: 60_000 });
  const failedText = await body(failedPage);
  check("mock decline states wallet truth without naming Card", failedText.includes("Your wallet was not credited.")
    && failedText.includes("Check this payment with the provider") && !failedText.includes("Nothing was taken from your card")
    && declinedActions.length === 1,
    `neutral=${failedText.includes("Your wallet was not credited.")}, check=${failedText.includes("Check this payment with the provider")}, card=${failedText.includes("Nothing was taken from your card")}, actions=${declinedActions.length}`);
  const declinedKey = bodyKey(declinedActions[0].postDataBuffer(), declinedActions[0].headers()["content-type"]);
  check("declined payment has a recoverable funding identity", !!declinedKey);
  const declinedRead = await failedPlayer.ctx.request.get(`${BASE}/api/wallet/deposits/recover?key=${encodeURIComponent(declinedKey)}`).then((r) => r.json());
  check("declined mock payment is not credited", declinedRead.state === "FAILED" && declinedRead.balance === 0,
    `state=${declinedRead.state}, balance=${declinedRead.balance}`);
  await noPosition(failedPlayer.ctx, failedSeed.id, "declined payment does not auto bet");
  await rememberShot(failedPage, "07-declined-payment");
  await failedPlayer.ctx.close();

  // The mock rail's async setting proves a genuine waiting collection with no credit or hidden bet.
  await setAsync(true);
  check("mock pending mode enabled", await asyncOn());
  const pendingPlayer = await freshPlayer(browser, BASE, pass, { balance: 0, locale: "en" });
  const pendingPage = await pageIn(BASE, pendingPlayer.ctx, "/", []);
  const pendingSeed = await openSheet(pendingPage);
  await waitFrame(pendingPage, "low");
  await pendingPage.locator('[data-testid="journey-sheet-deposit"]').click();
  await pendingPage.waitForURL(/\/wallet\/deposit\?/);
  const pendingBet = new URL(pendingPage.url()).searchParams.get("bet");
  check("pending deposit carries the selected bet", !!pendingBet && pendingBet.startsWith(pendingSeed.id + "."));
  await pendingPage.locator('label:has(#provider-MPESA)').click();
  await pendingPage.locator('input[name="amount"]').fill("1000");
  await pendingPage.locator("#msisdn").fill("712345678");
  const pendingBetRequests = [];
  pendingPlayer.ctx.on("request", (req) => {
    if (req.method() === "POST" && req.headers()["next-action"] && req.postDataBuffer()?.includes("marketId")) pendingBetRequests.push(req);
  });
  await pendingPage.locator('[data-testid="journey-deposit-form"] button[type="submit"]').click();
  await pendingPage.waitForURL(/\/wallet\/deposit\/wait\//, { timeout: 120_000 });
  const pendingUrl = pendingPage.url();
  const pendingTxn = new URL(pendingUrl).pathname.split("/").at(-1);
  const pendingStatusUrl = `${BASE}/api/wallet/deposits/${encodeURIComponent(pendingTxn)}/status`;
  const pendingStatus = await pendingPlayer.ctx.request.get(pendingStatusUrl).then((r) => r.json());
  check("mock async payment waits without credit", pendingStatus.state === "PENDING" && pendingStatus.balance === 0,
    `state=${pendingStatus.state}, balance=${pendingStatus.balance}`);
  await noPosition(pendingPlayer.ctx, pendingSeed.id, "pending payment does not auto bet");
  check("pending payment sends no bet action", pendingBetRequests.length === 0);
  await rememberShot(pendingPage, "08-pending-payment");
  await pendingPage.reload({ waitUntil: "domcontentloaded" });
  const pendingReplay = await pendingPlayer.ctx.request.get(pendingStatusUrl).then((r) => r.json());
  check("pending wait replay keeps one uncredited payment", pendingReplay.state === "PENDING" && pendingReplay.balance === 0);
  await noPosition(pendingPlayer.ctx, pendingSeed.id, "pending wait replay does not auto bet");
  // Following the saved choice before the callback cannot turn the pending
  // payment into spendable money or submit the bet behind the player's back.
  await pendingPage.goto(`${BASE}/?bet=${encodeURIComponent(pendingBet)}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await pendingPage.locator(S.root).waitFor({ timeout: 120_000 });
  const earlyFrame = await pendingPage.locator(S.root).getAttribute("data-frame");
  check("return before confirmation restores the choice without a bet", ["edit", "low"].includes(earlyFrame)
    && pendingBetRequests.length === 0, `frame=${earlyFrame}, bet requests=${pendingBetRequests.length}`);
  const earlyStatus = await pendingPlayer.ctx.request.get(pendingStatusUrl).then((r) => r.json());
  check("return before confirmation cannot spend pending money", earlyStatus.state === "PENDING" && earlyStatus.balance === 0,
    `state=${earlyStatus.state}, balance=${earlyStatus.balance}`);
  await noPosition(pendingPlayer.ctx, pendingSeed.id, "return before confirmation has no bet or bet ledger row");
  await pendingPlayer.ctx.close();

  evidence.completedAt = stamp();
  console.log(`e2e:journey: ${checks.length} passed, 0 failed`);
} catch (error) {
  evidence.error = String(error?.message ?? error).slice(0, 500);
  console.error(`e2e:journey: FAIL — ${evidence.error}`);
  process.exitCode = 1;
} finally {
  if (demoWas !== null && controlPage) {
    try {
      const sw = controlPage.locator('[aria-label^="Demo async (test):"]').first();
      if (((await sw.getAttribute("aria-label")) === "Demo async (test): on") !== demoWas) {
        await controlPage.waitForFunction(() => {
          const el = document.querySelector('[aria-label^="Demo async (test):"]');
          return el && Object.keys(el).some((key) => key.startsWith("__reactProps$") && typeof el[key].onClick === "function");
        }, null, { timeout: 30_000 });
        await sw.click();
        await controlPage.locator(`[aria-label="Demo async (test): ${demoWas ? "on" : "off"}"]`).waitFor({ timeout: 30_000 });
      }
    } catch (error) { evidence.restoreError = String(error?.message ?? error).slice(0, 250); process.exitCode = 1; }
  }
  evidence.completedAt ??= stamp();
  writeFileSync(resolve(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));
  await player?.close().catch(() => {});
  await admin?.close().catch(() => {});
  await browser.close().catch(() => {});
}
