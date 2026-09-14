/**
 * THE WHOLE JOURNEY, WITH A REAL ACCOUNT AND A REAL OFFICER — no fixtures anywhere.
 *
 * ⭐ WHY THIS EXISTS BESIDE `qa:kyc-gate`. That drive uses `/auth/demo?kyc=…`, which WRITES
 * a KycSubmission directly. It proves the screens react to a state; it cannot prove the
 * state is reachable. This one registers through the real sign-up form, confirms the email
 * through the real link, deposits through the real form, fills the real identity step,
 * uploads real images through the real uploader, submits for review, signs in as a real
 * officer, approves through the real workstation, and then checks that the withdrawal opened.
 * If any step of the product is broken, this stops at it.
 *
 * ⭐ THE LADDER IS THE 2026-09-13 ONE (docs/COMPLIANCE-DECISIONS.md) — register → confirm email →
 * deposit and play → verify identity → withdraw — and Ali's quiet rule of the same day decides what
 * the player is TOLD on the way: identity on the withdraw screen, and in ONE dismissible notice after
 * the first confirmed deposit; nowhere else.
 *
 *   ① register → lands on /wallet/deposit, not on the identity form
 *   ② a new account: TZS 0, the email door on the deposit screen, the stake control on a market,
 *      the payout panel on the withdraw screen — and no identity prompt anywhere else
 *   ③ confirm the email through the real link → the deposit form
 *   ④ a REAL deposit → the one quiet notice on /wallet; dismissed, it stays gone in this browser
 *   ⑤ identity + documents → ⑥ submit (the withdraw panel says it is with us; the notice is not due)
 *   ⑦ an officer approves → ⑧ the withdrawal form opens, and nothing asks again
 *
 * ⛔ THE POINT OF ⑧ IS THAT A GATE WHICH NEVER OPENS IS ALSO "SECURE". Refusals are cheap to get right
 * by accident; the expensive failure is a player who verifies and still cannot withdraw.
 * ⚠️ ④ NEEDS THE LOCAL MOCK RAIL — the default, which confirms a mobile-money deposit synchronously.
 * With demo-async on (`PAYMENTS_DEMO_ASYNC` or the control-plane toggle) it answers PENDING, nothing is
 * confirmed, the notice is correctly not due, and its checks are SKIPPED out loud rather than failed.
 * ⛔ Until 2026-09-13 this drive walked the OLD ladder: registration landed on /profile/kyc, the deposit
 * form and the dial stood behind a panel, and a standing identity bar sat on every page. Each of those
 * is now asserted the other way round.
 *
 *   BASE=http://localhost:3000 node scripts/kyc-gate-e2e.mjs        (npm run qa:kyc-e2e)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const PW = "Kyc!Drive2026x";
const NOTICE_COOKIE = "kp-kyc-notice";

let pass = 0, fail = 0;
const skipped = [];
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
// ⛔ A SKIP IS NEITHER A PASS NOR A FAILURE — it is said out loud, and repeated in the final line.
const skip = (l, why) => { skipped.push(`${l} — ${why}`); console.log(`SKIP ${l} — ${why} (SKIPPED, not passed)`); };
const step = (s) => console.log(`\n${s}`);

async function go(page, url) {
  // ⚠️ 120s, NOT the 30s default. A cold route can take a minute to compile on a loaded machine,
  // and the default timeout turns that into "the page never rendered". A drive that reports a
  // compile as a product failure is worse than a slow drive.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });
}
const settle = (page) => page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });

/** Collapsed, LOWERCASED innerText of the first match — "" when there is none. The panel's eyebrow is
 *  CSS-uppercased and Chromium applies `text-transform` to innerText. */
async function textOf(locator) {
  return ((await locator.first().innerText({ timeout: 5_000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim().toLowerCase();
}

const sel = {
  gate: '[data-testid="kyc-gate-panel"]',
  payoutGate: '[data-testid="kyc-gate-panel"][data-kyc-purpose="payout"]',
  // ⛔ DELETED 2026-09-13 with `KycVerifyBanner` — must match nothing, on any page.
  banner: '[data-testid="kyc-verify-banner"]',
  notice: '[data-testid="kyc-first-deposit-notice"]',
  noticeDismiss: '[data-testid="kyc-first-deposit-notice-dismiss"]',
  sidePicker: '[data-testid="side-picker"]',
  emailGate: '[data-testid="email-verify-gate"]',
  depositForm: "#provider-MPESA",
  withdrawForm: 'form input[name="amount"]',
  walletBalance: '[data-testid="wallet-balance"]',
  profilePill: '[data-testid="profile-kyc-pill"]',
};
/** The amber /profile banner deleted 2026-09-13 — its heading, a phrase of its body and its button (en, ac411357). */
const OLD_PROFILE_BANNER = ["verify your identity", "verify before you cash out", "continue verification"];

/** A real 1×1 JPEG — magic bytes and all, because the uploader sniffs them. */
const JPEG_1PX = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");

const suffix = String(Date.now()).slice(-7);
const PHONE_LOCAL = `7${suffix.slice(0, 8).padEnd(8, "0")}`;   // 9 digits, leading 7
const EMAIL = `kycdrive.${suffix}@50pick.test`;
// ⛔ A UNIQUE NIDA PER RUN. One document, one account is a real rule enforced by a partial
// unique index; a fixed number makes the SECOND run of this file fail as a duplicate
// identity, which would look like a product defect in the uniqueness control.
const NIDA = `19900101${suffix.padStart(12, "0")}`;

const browser = await chromium.launch();
const player = await browser.newPage({ viewport: { width: 390, height: 900 } });

async function noBar(page, label) {
  ok(`${label} · ⛔ no app-wide identity bar`, await page.locator(sel.banner).count() === 0);
}

/**
 * THIS account in a browser that never pressed the notice's X — the session cookies copied, the
 * dismissal cookie left behind.
 * ⭐ Without it every "the notice is absent" after ④ would be the remembered X talking, and would pass
 * whatever the server decided. ⚠️ It is the SAME session (the cookie is copied, not a new sign-in), so
 * the single-session rule revokes nothing.
 */
async function cleanBrowserAs(page) {
  const state = await page.context().storageState();
  state.cookies = state.cookies.filter((c) => c.name !== NOTICE_COOKIE);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: state });
  return ctx.newPage();
}

// ── ① REGISTER THROUGH THE REAL FORM ────────────────────────────────────────
step("① register — the real sign-up form, no fixture");
{
  await go(player, `${BASE}/auth/register`);
  // ⚠️ THE VISIBLE FIELD, NOT THE HIDDEN MIRROR, and the 9-digit LOCAL part. The form keeps
  // a hidden `input[name=phone]` that the visible `#phone` writes into; filling the hidden
  // one directly skips the normalisation and the account is created on a number the login
  // form can never reproduce.
  await player.locator("#phone").fill(PHONE_LOCAL);
  await player.locator("#email").fill(EMAIL);
  // ⚠️ THREE BOXES, NOT ONE — and filling only the first leaves the hidden `dob` EMPTY, so
  // the form re-renders with no visible error and the drive reads it as "registration
  // failed". `#dob` is the DAY; Month and Year are separate inputs identified by their
  // aria-labels. (`qa:live` §B calls this field's cruelty out by name for the same reason.)
  await player.locator("#dob").fill("01");
  await player.locator('input[aria-label="Month"]').fill("01");
  await player.locator('input[aria-label="Year"]').fill("1990");
  await player.locator("#password").fill(PW);
  await player.locator("#passwordConfirm").fill(PW);
  for (const n of ["acceptAge", "acceptTerms"]) {
    const c = player.locator(`input[name="${n}"]`);
    if (await c.count() > 0) await c.first().check({ force: true });
  }
  // ⚠️ RECORD EVERY URL THE TAB LANDS ON. `AuthFlash` greets a new account and then strips
  // `welcome=new` with router.replace, so reading page.url() once the page settles would call a
  // correct landing "no welcome".
  const seen = [];
  const onNav = (f) => { if (f === player.mainFrame()) seen.push(f.url()); };
  player.on("framenavigated", onNav);
  await Promise.all([player.waitForURL((u) => !u.pathname.startsWith("/auth/register"), { timeout: 60_000 }).catch(() => {}), player.locator('button[type="submit"]').first().click()]);
  await settle(player);
  player.off("framenavigated", onNav);
  const landing = seen.map((u) => new URL(u)).find((u) => !u.pathname.startsWith("/auth/register"));
  ok("1.1 · ★ registration lands the new account on /wallet/deposit — not on the identity form",
    landing?.pathname === "/wallet/deposit", landing?.href ?? player.url());
  ok("1.2 · …carrying `welcome=new`, so the greeting meets them there",
    landing?.searchParams.get("welcome") === "new", landing?.href ?? "(no landing recorded)");
  ok("1.3 · ⛔ …and never passing through /profile/kyc on the way",
    seen.length > 0 && !seen.some((u) => new URL(u).pathname.startsWith("/profile/kyc")), seen.join(" → "));
}

// ── ② A NEW ACCOUNT: NOTHING HELD, IDENTITY ASKED ONLY AT THE WITHDRAWAL ────
step("② a brand-new account: nothing held, the email door, the stake control — identity only on the withdraw screen");
{
  await go(player, `${BASE}/wallet`);
  const wallet = await player.locator("body").innerText();
  ok("2.1 · the wallet is TZS 0 — no starter balance, no signup bonus in the bonus wallet",
    /\b0\b/.test(wallet) && !/100,000|10,000/.test(wallet.split("Transactions")[0] ?? wallet),
    (wallet.match(/TZS[^\n]{0,14}/) ?? [""])[0]);
  ok("2.2 · control · /wallet rendered its balance", await player.locator(sel.walletBalance).count() > 0);
  ok("2.3 · ⛔ NO first-deposit notice — nothing has been deposited", await player.locator(sel.notice).count() === 0);
  await noBar(player, "2.3b · /wallet");

  await go(player, `${BASE}/wallet/deposit`);
  ok("2.4 · ⛔ NO identity panel on the deposit screen", await player.locator(sel.gate).count() === 0);
  // ⭐ Registration confirms no address, so the one door on this screen is the EMAIL — the
  // second step of the ladder, and nothing to do with identity.
  ok("2.5 · ★ …the one door there is the email", await player.locator(sel.emailGate).count() > 0);
  ok("2.6 · …and the form waits behind it", await player.locator(sel.depositForm).count() === 0);
  await noBar(player, "2.6b · /wallet/deposit");

  await go(player, `${BASE}/wallet/withdraw`);
  const panel = player.locator(sel.payoutGate);
  ok("2.7 · ★ the withdraw screen shows the payout identity panel", await panel.count() === 1, `${await panel.count()} found`);
  ok("2.8 · …in the not-started state", (await panel.first().getAttribute("data-kyc-state").catch(() => null)) === "not_started");
  ok("2.9 · ⛔ …and the withdrawal form is ABSENT from the DOM, not disabled", await player.locator(sel.withdrawForm).count() === 0);
  const pt = await textOf(panel);
  ok('2.10 · it says "Before you withdraw" — and no "balance is safe" line',
    pt.includes("before you withdraw") && !pt.includes("before you cash out") && !pt.includes("your balance is safe"), JSON.stringify(pt.slice(0, 90)));
  await noBar(player, "2.10b · /wallet/withdraw");

  await go(player, `${BASE}/markets`);
  await noBar(player, "2.11 · /markets");
  const mk = await player.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  if (mk) {
    await go(player, `${BASE}${mk}`);
    ok("2.12 · ★ the stake control renders on a live market for an account never approved", await player.locator(sel.sidePicker).count() > 0);
    ok("2.13 · ⛔ …with no identity panel in front of it", await player.locator(sel.gate).count() === 0);
    await noBar(player, "2.13b · the market");
  } else {
    skip("2.12 · the market dial", "no market link on /markets");
  }

  await go(player, `${BASE}/profile`);
  const main = await textOf(player.locator("main"));
  const stale = OLD_PROFILE_BANNER.filter((w) => main.includes(w));
  ok("2.14 · ⛔ /profile carries no amber verify banner — none of its words remain", main.length > 40 && stale.length === 0, stale.join(" | "));
  const pill = player.locator(sel.profilePill);
  const pillText = await textOf(pill);
  ok('2.15 · ★ …and still states the standing, as the KYC pill ("Verify ID")', await pill.count() === 1 && pillText.includes("verify id"), pillText);
  await noBar(player, "2.15b · /profile");
}

// ── ③ CONFIRM THE EMAIL THROUGH THE REAL LINK ───────────────────────────────
step("③ confirm the email — the link the player would receive");
{
  const link = await player.request.get(`${BASE}/api/dev/verify-link`).then((r) => r.json()).catch(() => null);
  ok("3.1 · the confirmation link the player would receive is issued", !!link?.url, JSON.stringify(link)?.slice(0, 80));
  if (link?.url) {
    // ⚠️ THE LINK CARRIES THE PRODUCTION ORIGIN. `BASE_URL()` falls back to the Railway host
    // when `NEXT_PUBLIC_APP_URL` is unset, so the confirmation URL a local run gets back
    // points at kipindi-production — following it verbatim drives the LIVE site and leaves
    // the local account unconfirmed. Only the path and its signed token matter; the origin
    // is swapped for the one under test.
    const u = new URL(link.url, BASE);
    await go(player, `${BASE}${u.pathname}${u.search}`);
  }
  await go(player, `${BASE}/wallet/deposit`);
  ok("3.2 · ★ the real deposit form is present — the email was the only door", await player.locator(sel.depositForm).count() > 0);
  ok("3.3 · ⛔ …and still no identity panel", await player.locator(sel.gate).count() === 0);
}

// ── ④ A REAL DEPOSIT, AND THE ONE QUIET NOTICE ──────────────────────────────
step("④ a REAL deposit through the real form — and the one quiet notice it earns");
let deposited = false;
{
  await go(player, `${BASE}/wallet/deposit`);
  await player.locator(sel.depositForm).check({ force: true }).catch(() => {});
  // ⚠️ NOT AN AMOUNT ENDING IN 13 — the mock rail declines those on purpose (`payments.ts`).
  await player.locator("#amount").fill("10000");
  // The number is prefilled with the account's own (`moneyFormMsisdn`); fill it only if a future
  // change leaves it blank, so a missing prefill cannot pass itself off as a declined deposit.
  const msisdn = player.locator("#msisdn");
  if (await msisdn.count() > 0 && !(await msisdn.inputValue())) await msisdn.fill(PHONE_LOCAL);
  // ⛔ THE SUBMIT IS A ConfirmDialog, NOT A SUBMIT BUTTON: "Confirm deposit" opens it and "Deposit"
  // inside it commits. A drive that looks for `button[type=submit]` finds nothing and reports a
  // working screen as broken.
  await player.locator("form button.btn-gold", { hasText: /confirm deposit/i }).first().click().catch(() => {});
  const commit = player.locator('[role="alertdialog"] button, [role="dialog"] button').filter({ hasText: /^\s*Deposit\s*$/ }).first();
  await commit.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  ok("4.0 · the deposit confirm dialog opened", await commit.count() > 0);
  if (await commit.count() > 0) {
    await Promise.all([
      player.waitForURL((u) => (u.pathname === "/wallet" && u.searchParams.has("deposited")) || u.searchParams.has("error"), { timeout: 60_000 }).catch(() => {}),
      commit.click(),
    ]);
  }
  // The action states its outcome in the URL — read it BEFORE the page settles and tidies it.
  const q = new URL(player.url()).searchParams;
  ok("4.1 · the deposit was accepted and the player is back on /wallet",
    new URL(player.url()).pathname === "/wallet" && q.has("deposited"), q.has("error") ? `refused: ${q.get("error")}` : player.url());
  deposited = q.get("status") === "CONFIRMED";
  if (q.has("deposited") && !deposited) {
    skip("4.2–4.11, 6.4–6.5, 8.4–8.5 · the first-deposit notice", `the rail answered ${q.get("status")} — nothing is confirmed, so it is correctly not due (demo-async on?)`);
  }
  await settle(player).catch(() => {});
}
if (deposited) {
  await go(player, `${BASE}/wallet`);
  const notice = player.locator(sel.notice);
  ok("4.2 · ★ /wallet now shows the ONE first-deposit notice", await notice.count() === 1, `${await notice.count()} found`);
  const nt = await textOf(notice);
  ok("4.3 · …its one sentence, attached forward to the withdrawal",
    nt.includes("verify your identity anytime before your first withdrawal."), JSON.stringify(nt));
  // ⛔ THE COPY RULE: adding money and playing are never named in the same sentence as identity.
  ok("4.4 · ⛔ …naming no deposit, no money going in, no play", nt.length > 20 && !/deposit|add money|top up|\bbet|\bplay|\bstake/.test(nt), nt);
  ok("4.5 · …with its one quiet link, to /profile/kyc", await player.locator(`${sel.notice} a[href="/profile/kyc"]`).count() === 1);
  // ⛔ NOTHING IN THE WRONG PLACE: while it is due, it is due on /wallet and nowhere else.
  for (const path of ["/wallet/deposit", "/wallet/withdraw", "/markets"]) {
    await go(player, `${BASE}${path}`);
    ok(`4.6 · ⛔ the notice is NOT on ${path}`, await player.locator(sel.notice).count() === 0);
  }
  await go(player, `${BASE}/wallet`);
  const x = player.locator(sel.noticeDismiss);
  ok("4.7 · control · the notice and its X are up on /wallet before the X is pressed", await notice.count() === 1 && await x.count() === 1);
  if (await x.count() > 0) {
    await x.first().click();
    await player.waitForFunction((s) => !document.querySelector(s), sel.notice, { timeout: 5_000 }).catch(() => {});
    ok("4.8 · ★ pressing the X removes it in place", await notice.count() === 0);
    await player.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(player);
    ok("4.9 · control · /wallet rendered again after the reload", await player.locator(sel.walletBalance).count() > 0);
    ok("4.10 · ★ …and the notice STAYS gone after the reload", await notice.count() === 0);
  }
  const other = await cleanBrowserAs(player);
  await go(other, `${BASE}/wallet`);
  ok("4.11 · ⭐ per browser, not per account — a browser that never pressed the X is still offered it",
    await other.locator(sel.notice).count() === 1);
  await other.context().close();
}

// ── ⑤ THE REAL IDENTITY STEP AND THE REAL UPLOADER ──────────────────────────
step("⑤ identity + documents — the real form, the real uploader");
{
  await go(player, `${BASE}/profile/kyc`);
  await player.locator("#idNumber").fill(NIDA);
  await player.locator("#fullName").fill("Kyc Drive Tester");
  // ⚠️ THE EMAIL FIELD IS PART OF THIS FORM AND IS REQUIRED. Leaving it empty makes the
  // browser block submit with NATIVE validation — no server round-trip, no error text on the
  // page, nothing in the log. The drive read that as "the identity step was refused" and
  // spent a debugging pass looking for a server defect that did not exist.
  const emailField = player.locator("#email");
  if (await emailField.count() > 0 && !(await emailField.inputValue())) await emailField.fill(EMAIL);

  // ⚠️ WAIT FOR THE OUTCOME IN THE URL. `waitForLoadState("domcontentloaded")` resolves
  // IMMEDIATELY when the current document is already loaded, so the drive read the page
  // BEFORE the server action's redirect landed and counted zero file inputs on a form that
  // had in fact been accepted. The lesson is that a wait must name the thing being waited FOR.
  await Promise.all([
    player.waitForURL((u) => u.searchParams.has("id") || u.searchParams.has("reason"), { timeout: 60_000 }).catch(() => {}),
    player.locator('button[type="submit"]').first().click(),
  ]);
  await settle(player);
  ok("5.0 · the identity step was ACCEPTED by the server", new URL(player.url()).searchParams.get("id") === "accepted",
    new URL(player.url()).search || "(no outcome in the URL)");

  // ⛔ ASSERT THE STATE, NOT THE PROSE. The file inputs only exist once the identity step is
  // accepted, so their presence IS the acceptance.
  const inputs = player.locator('input[type="file"]');
  const n = await inputs.count();
  ok("5.1 · ★ the identity step is accepted — the document slots now exist", n >= 3,
    `${n} file inputs · ${(await player.locator("body").innerText()).slice(0, 80).replace(/\n/g, " ")}`);
  for (let i = 0; i < n; i++) {
    await inputs.nth(i).setInputFiles({ name: `doc${i}.jpg`, mimeType: "image/jpeg", buffer: JPEG_1PX });
    await player.waitForTimeout(1200); // the uploader downscales on a canvas before posting
  }
  // ⛔ COUNT THE ATTACHMENTS THEMSELVES. The submit control renders as soon as the identity
  // step is done — BEFORE any document is attached — so its presence proves nothing about
  // the uploads. Each uploader tile reports "Attached" when it holds a file; that is the fact.
  await go(player, `${BASE}/profile/kyc`);
  const attached = player.locator("button").filter({ hasText: /Attached|Imeambatanishwa|已附加/ });
  ok("5.2 · ★ every required slot is ATTACHED", await attached.count() >= 3, `${await attached.count()} of 3 attached`);
}

// ── ⑥ SUBMIT FOR REVIEW ─────────────────────────────────────────────────────
step("⑥ submit for review");
{
  // ⚠️ THE CONTROL IS LABELLED "Confirm", NOT "Submit" — it renders `t.common.confirm`.
  const submit = player.locator('form button[type="submit"]').filter({ hasText: /^(Confirm|Thibitisha|确认)$/ });
  ok("6.0 · the submit-for-review control is present", await submit.count() > 0);
  if (await submit.count() > 0) {
    await Promise.all([
      player.waitForURL((u) => u.searchParams.has("submitted") || u.searchParams.has("reason"), { timeout: 60_000 }).catch(() => {}),
      submit.first().click(),
    ]);
    await settle(player);
    // The server states the outcome in the URL: `?submitted=1`, or `?reason=<why not>`.
    const q = new URL(player.url()).searchParams;
    ok("6.0b · the server ACCEPTED the submission", q.get("submitted") !== null && !q.has("reason"),
      q.has("reason") ? `refused: ${q.get("reason")}` : (q.toString() || "(no outcome in the URL)"));
  }
  // ⛔ READ THE STATE THE PRODUCT PUBLISHES, NOT THE WORDS ON THE PAGE — and since 2026-09-13 the one
  // money screen that publishes it to the player is the WITHDRAW screen (the deposit screen reads no
  // identity row at all).
  await go(player, `${BASE}/wallet/withdraw`);
  const st = await player.locator(sel.payoutGate).first().getAttribute("data-kyc-state").catch(() => null);
  ok("6.1 · ★ the submission really is PENDING REVIEW — the withdraw panel says it is with our team", st === "pending_review", String(st));
  ok("6.2 · …and offers NO button, because there is nothing for them to do",
    st !== null && await player.locator(`${sel.payoutGate} a.btn`).count() === 0);
  ok("6.3 · ⛔ …while the withdrawal form stays absent", await player.locator(sel.withdrawForm).count() === 0);
  if (deposited) {
    const other = await cleanBrowserAs(player);
    await go(other, `${BASE}/wallet`);
    ok("6.4 · control · /wallet rendered in a browser that never dismissed the notice", await other.locator(sel.walletBalance).count() > 0);
    ok("6.5 · ★ the notice is NOT due once the documents are with our team", await other.locator(sel.notice).count() === 0);
    await other.context().close();
  }
}

// ── ⑦ A REAL OFFICER APPROVES, THROUGH THE REAL WORKSTATION ─────────────────
step("⑦ the officer approves — the real queue, the real confirm dialog");
{
  // ⚠️ NOT `db:seed-admin-local` — that seeder writes to POSTGRES and refuses without
  // `DATABASE_URL`, while this drive runs against the in-memory store. The dev-test route
  // creates the officer in the SAME store the app is serving from, and mints their session.
  const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const seeded = await admin.request.post(`${BASE}/api/dev-test/seed-admin`);
  ok("7.0 · an officer account exists", seeded.ok(), `${seeded.status()}`);
  await go(admin, `${BASE}/admin/approvals`);
  // ⛔ THE PLAYER'S OWN NAME, NOT THE WORD "KYC". `/KYC/i` matches the queue's HEADING, so
  // this passed on an empty queue — reporting that a submission had arrived when none had.
  const queue = await admin.locator("body").innerText();
  ok("7.1 · ★ THIS player's submission is in the officer's queue", queue.includes("Kyc Drive Tester"),
    queue.includes("Kyc Drive Tester") ? "" : "the queue does not name this player");

  // ⚠️ THE ROW'S OWN LINK. The page also links the KYC queue and its sub-pages, so the first
  // `/admin/kyc/` anchor on the page is not necessarily this player's workstation.
  const link = admin.locator("tr", { hasText: "Kyc Drive Tester" }).first().locator('a[href*="/admin/kyc/"]').first();
  ok("7.2 · the queue row links to this player's review workstation", await link.count() > 0);
  if (await link.count() > 0) {
    await Promise.all([
      admin.waitForURL((u) => u.pathname.startsWith("/admin/kyc/"), { timeout: 60_000 }).catch(() => {}),
      link.click(),
    ]);
    await settle(admin);
    ok("7.3 · the review workstation opens", /approve|idhinisha|批准/i.test(await admin.locator("body").innerText()), admin.url());

    // ⚠️ THE ATTESTATIONS ARE TAP-TO-CYCLE CHECKLIST ROWS (pending → pass → fail), NOT CHECKBOXES —
    // `kyc-decision-rail.tsx`. Approve stays disabled until every row reads "pass", so a driver that
    // ticked `input[type=checkbox]` pressed a disabled button for 30s (measured 2026-09-13). Tap each
    // pending row exactly once.
    const pendingRows = admin.locator('button:has-text("tap to verify")');
    for (let guard = 0; guard < 12 && (await pendingRows.count()) > 0; guard++) await pendingRows.first().click();
    const approve = admin.locator('button:has-text("Approve"), button:has-text("Idhinisha")').first();
    if (await approve.count() > 0) {
      await approve.click();
      await admin.waitForTimeout(800);
      // ⛔ APPROVE IS A ConfirmDialog TRIGGER, as CLAUDE.md requires for a consequential
      // action — a driver that clicks once and reads the page will report "not approved"
      // against a product that simply asked the officer to confirm. Confirm it. ⑧ is the proof
      // that it took: this step only proves the control was there to press.
      const confirm = admin.locator('[role="dialog"] button:has-text("Approve"), [role="dialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Approve")').first();
      // ⚠️ WAIT FOR THE OUTCOME, NOT A FIXED 1.5s (measured 2026-09-13). On a dev server the approve action
      // compiles on first use; ⑧ read the player's standing before it had committed and reported the account
      // still `pending_review`, while a probe that waited saw "Identity approved". The toast is the outcome.
      let outcome = "(no confirm dialog)";
      if (await confirm.count() > 0) {
        await confirm.click();
        outcome = await admin.waitForSelector("text=/Identity approved|Blocked/", { timeout: 30_000 })
          .then((h) => h.innerText(), () => "(no outcome within 30s)");
        await admin.waitForTimeout(1_000);
      }
      ok("7.4 · ★ the officer pressed Approve and confirmed — and the workstation said it was approved",
        /Identity approved/.test(outcome), outcome);
    } else {
      ok("7.4 · ★ the officer pressed Approve and confirmed", false, "no Approve control found");
    }
  }
  await admin.close();
}

// ── ⑧ THE WITHDRAWAL OPENS ──────────────────────────────────────────────────
step("⑧ ★ the withdrawal opens — the half a refusal-only suite can never prove");
{
  // ⛔ ASSERT THE STATE, NOT A WORD ON THE PAGE. `/verified/i` matches "Verify your
  // identity" — the copy shown to an UNVERIFIED player — so a word check once passed for four
  // runs while the account was still `not_started`. A false PASS on the one assertion that says
  // the journey worked is worse than a false failure.
  await go(player, `${BASE}/wallet/withdraw`);
  const gates = await player.locator(sel.gate).count();
  ok("8.1 · ★ the account really is APPROVED — no identity panel on the withdraw screen", gates === 0,
    gates > 0 ? String(await player.locator(sel.gate).first().getAttribute("data-kyc-state")) : "");
  ok("8.2 · ★★ …and the real withdrawal form is present", await player.locator(sel.withdrawForm).count() > 0);
  await noBar(player, "8.2b · /wallet/withdraw");

  await go(player, `${BASE}/wallet/deposit`);
  ok("8.3 · the deposit form is still there, with no identity panel",
    await player.locator(sel.depositForm).count() > 0 && await player.locator(sel.gate).count() === 0);

  if (deposited) {
    const other = await cleanBrowserAs(player);
    await go(other, `${BASE}/wallet`);
    ok("8.4 · control · /wallet rendered in a browser that never dismissed the notice", await other.locator(sel.walletBalance).count() > 0);
    ok("8.5 · ★ an approved account is never offered the notice again", await other.locator(sel.notice).count() === 0);
    await other.context().close();
  }

  await go(player, `${BASE}/profile`);
  ok('8.6 · /profile states the new standing — the pill reads "ID verified"', (await textOf(player.locator("main"))).includes("id verified"));
  await noBar(player, "8.6b · /profile");

  const mk = await (async () => { await go(player, `${BASE}/markets`); return player.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null); })();
  if (mk) {
    await go(player, `${BASE}${mk}`);
    ok("8.7 · the stake control is on a live market, as it was before verification",
      await player.locator(sel.sidePicker).count() > 0 && await player.locator(sel.gate).count() === 0);
  }
}

await browser.close();
console.log(`\nkyc-gate e2e: ${pass} passed, ${fail} failed${skipped.length ? `, ${skipped.length} SKIPPED` : ""}`);
for (const s of skipped) console.log(`  SKIPPED · ${s}`);
if (fail > 0) process.exit(1);
