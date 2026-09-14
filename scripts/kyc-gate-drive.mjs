/**
 * THE IDENTITY GATE, DRIVEN IN A REAL BROWSER — where identity is asked, and everywhere it is NOT.
 *
 * ⭐ THE DESIGN IT HOLDS (Ali, 2026-09-13 — docs/COMPLIANCE-DECISIONS.md). Identity is required before a
 * WITHDRAWAL and before nothing else, and by the owner's quiet rule of the same day it is put in front
 * of a player in exactly two places: the withdraw screen (`KycGatePanel`, purpose "payout"), and ONE
 * small dismissible notice on /wallet once the account holds a confirmed deposit and has sent nothing
 * (`kyc-first-deposit-notice.tsx`). No app-wide bar (`KycVerifyBanner` is deleted), no panel on the
 * deposit screen, the conviction dial or the Up & Down stake panel, no amber banner on /profile.
 * ⛔ Until 2026-09-13 this drive asserted the OPPOSITE on three of those surfaces — a panel in front of
 * the deposit form, the dial and the stake panel, and a standing bar on every page. Do not restore it
 * by reading the older ruling.
 *
 * ⭐ WHY A DRIVE AND NOT MORE ASSERTIONS. `test:kyc-gate` and `test:kyc-at-withdrawal` prove the SERVER
 * and the SOURCE. Neither can prove that a control renders instead of a panel, that a dismissal
 * survives a reload, or that any of it survives 360px and three languages. Those are rendering facts
 * and only a renderer can answer them.
 *
 * ⛔ EVERY ABSENCE RIDES WITH A CONTROL. "No panel" on a page that never rendered passes over an empty
 * body, so each one is paired with the thing that WOULD be there — the dial, the deposit form, the
 * wallet balance, the status pill — and the notice's absence with the same fixture's presence.
 *
 *   §1 every never-approved state: the stake and deposit controls render with no panel; the withdraw
 *      screen shows the payout panel in THAT state and NO form; no bar anywhere; /profile keeps the pill
 *   §2 the first-deposit notice: absent before a confirmed deposit, present after one while nothing is
 *      sent, absent once documents are with us or approved; dismissed, gone after reload for THIS player (the cookie is bound to the player since 2026-09-14)
 *   §3 THE POSITIVE CONTROL: an approved account sees every form, no panel, no notice
 *   §4 the copy in en/sw/zh: "Before you withdraw", no "balance is safe" line, the notice's sentence
 *
 * Fixtures come from `/auth/demo?kyc=…&deposit=0|1` (dev-only route, 404 in production): a real
 * KycSubmission row, and ONE confirmed deposit row added (`1`) or failed (`0`, which also empties the wallet to TZS 0).
 * ⚠️ THE DEMO ACCOUNT IS SHARED and every sign-in re-applies its state, so this drive opens one browser
 * at a time and closes it before the next fixture — two interleaved fixtures would each rewrite the
 * other's row.
 * ⚠️ Requires the app running at BASE — `npm run build && npm start`. `next dev` renders an empty admin
 * body on this machine; player surfaces are fine either way, but `start` is what the other live
 * harnesses use.
 *
 *   BASE=http://localhost:3000 node scripts/kyc-gate-drive.mjs        (npm run qa:kyc-gate)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const WIDTHS = [360, 1280];
const LOCALES = ["en", "sw", "zh"];
const NOTICE_COOKIE = "kp-kyc-notice";

let pass = 0, fail = 0;
const skipped = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

/**
 * Navigate and WAIT FOR CONTENT, not for a lifecycle event.
 *
 * ⚠️ NEITHER OF THE OBVIOUS WAITS WORKS HERE, and both fail silently in opposite
 * directions. `domcontentloaded` fires before the server component has streamed, so
 * `body.innerText` is EMPTY and every selector reports 0 — a clean sweep of false
 * negatives that reads exactly like "the panel is missing". `networkidle` never settles at
 * all in `next dev`, because the HMR websocket keeps a connection open forever, so it
 * times out on a page that rendered perfectly. Waiting for real text is the only honest
 * signal.
 */
async function go(page, url) {
  // ⚠️ 120s, NOT the 30s default. A cold route can take a minute to compile on a loaded machine,
  // and the default timeout turns that into "the page never rendered". A drive that reports a
  // compile as a product failure is worse than a slow drive.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });
}

/**
 * Collapsed, LOWERCASED innerText of the first match — "" when there is none.
 * ⚠️ The panel's eyebrow is CSS-uppercased and Chromium applies `text-transform` to innerText, so a
 * case-sensitive compare fails a correct screen ("BEFORE YOU WITHDRAW").
 */
async function textOf(locator) {
  return ((await locator.first().innerText({ timeout: 5_000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Sign in as the demo player in one identity state. `deposit` 1 adds its one CONFIRMED deposit, 0 fails
 * it, and leaving it out keeps whatever the last run left — so every §2 case passes it explicitly.
 */
async function demo(page, kyc, deposit) {
  await go(page, `${BASE}/auth/demo?kyc=${kyc}${deposit === undefined ? "" : `&deposit=${deposit}`}`);
}

const sel = {
  gate: '[data-testid="kyc-gate-panel"]',
  payoutGate: '[data-testid="kyc-gate-panel"][data-kyc-purpose="payout"]',
  // ⛔ DELETED 2026-09-13 with `KycVerifyBanner`. Asserted ABSENT on every page this drive opens.
  banner: '[data-testid="kyc-verify-banner"]',
  notice: '[data-testid="kyc-first-deposit-notice"]',
  noticeDismiss: '[data-testid="kyc-first-deposit-notice-dismiss"]',
  // The poll market's stake control is the conviction dial; these are its own testids.
  dial: '[data-testid="side-picker"]',
  // Up & Down renders a different control — the quick-stake column, not the dial.
  dialUpDown: '[data-testid="updown-stake-panel"]',
  depositForm: "#provider-MPESA",
  withdrawForm: 'form input[name="amount"]',
  walletBalance: '[data-testid="wallet-balance"]',
  profilePill: '[data-testid="profile-kyc-pill"]',
};

/**
 * THE WORDS, per language. `old*` is the SUPERSEDED wording, copied from ac411357 (the commit before the
 * quiet rule) — never invented, because an absence check against a string that never shipped passes
 * for nothing. (sw and zh kept their eyebrow through the change; only English said "cash out".)
 */
const COPY = {
  en: { eyebrow: "Before you withdraw", oldEyebrow: "Before you cash out", oldSafe: "Your balance is safe and stays yours.", notice: "Verify your identity anytime before your first withdrawal." },
  sw: { eyebrow: "Kabla ya kutoa pesa", oldEyebrow: null, oldSafe: "Salio lako ni salama na linabaki kuwa lako.", notice: "Thibitisha utambulisho wako wakati wowote kabla ya kutoa pesa kwa mara ya kwanza." },
  zh: { eyebrow: "提现之前", oldEyebrow: null, oldSafe: "您的余额安全，始终归您所有。", notice: "首次提现前，可随时完成身份验证。" },
};
/** The amber /profile banner deleted 2026-09-13 — its heading, a phrase of its body and its button (en, ac411357). */
const OLD_PROFILE_BANNER = ["verify your identity", "verify before you cash out", "continue verification"];

const browser = await chromium.launch();

async function noBar(page, label) {
  ok(`${label} · ⛔ no app-wide identity bar`, await page.locator(sel.banner).count() === 0);
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ── Find a live poll market and an Up & Down round to drive against ──────────
let marketHref = null, roundHref = null, roundBettable = false;
{
  const page = await browser.newPage();
  await demo(page, "approved");
  await go(page, `${BASE}/markets`);
  marketHref = await page.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  // ⚠️ THE BOARD CARD IS NOT A LINK, and reading it as one sent this whole section to the
  // wrong page. `a[href^="/updown/"]` matches exactly ONE element on the board —
  // `/updown/history` — because a round card is an `<article role="link">` that navigates
  // by router.push. ⛔ A selector that matches the wrong element reports a defect in a product
  // that is behaving perfectly, which is worse than matching nothing.
  // ⚠️ A ROUND MAY NOT BE OPEN THE INSTANT THE BOARD IS SEEDED — the scheduler opens them on
  // its own clock. Poll briefly rather than declare the fixture missing on the first look.
  await go(page, `${BASE}/updown`);
  for (let i = 0; i < 10 && await page.locator('article[role="link"]').count() === 0; i++) {
    await page.waitForTimeout(3_000);
    await go(page, `${BASE}/updown`);
  }
  const card = page.locator('article[role="link"]').first();
  if (await card.count() > 0) {
    await Promise.all([page.waitForURL((u) => /\/updown\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/history"), { timeout: 30_000 }).catch(() => {}), card.click()]);
    roundHref = /\/updown\/[^/]+$/.test(new URL(page.url()).pathname) ? new URL(page.url()).pathname : null;
  }
  ok("0.1 · fixture · a poll market exists to drive", !!marketHref, String(marketHref));
  // ⛔ A MISSING FIXTURE IS NOT A FAILURE AND IT IS NOT A PASS — it is a SKIP, said out loud.
  // Up & Down opens and closes rounds on its own clock, so a board with nothing open is a
  // legitimate state of the environment, not of the product.
  if (roundHref) ok("0.2 · fixture · an Up & Down round exists to drive", true, roundHref);
  else { skipped.push("Up & Down round surface — no round was open in this environment"); console.log("SKIP 0.2 · no Up & Down round is open — its checks are SKIPPED, not passed"); }

  // ⚠️ IS THE ROUND ACTUALLY BETTABLE RIGHT NOW? A round spends most of its life LOCKED or
  // SETTLED, and `RoundActionPanel` renders the stake column only while it is open. The drive
  // establishes that the control IS there for a verified account before it asks whether an
  // unverified one gets it too — otherwise a locked round would read as a missing control.
  if (roundHref) {
    await go(page, `${BASE}${roundHref}`);
    roundBettable = await page.locator(sel.dialUpDown).count() > 0;
  }
  if (roundHref && !roundBettable) {
    skipped.push("Up & Down stake panel — the round was locked/settled when measured");
    console.log("SKIP 0.3 · the round is not open for staking — its stake-panel checks are SKIPPED, not passed");
  }
  await page.close();
}

// ── §1 · Every never-approved state ──────────────────────────────────────────
// [fixture, data-kyc-state, the /profile pill's words, is the review wait stated, where the CTA goes]
const NEVER_APPROVED = [
  ["none",          "not_started",    "verify id",               true,  "/profile/kyc"],
  ["uploaded",      "uploaded",       "verify id",               true,  "/profile/kyc"],
  ["pending",       "pending_review", "in review",               false, null],
  // 2026-09-14 — the pill has its own short labels: "More info needed", and "Refused" for a FINAL refusal (it read
  // "Rejected", the same word as a refusal the player can retry).
  ["more_info",     "more_info",      "more info needed",        false, "/profile/kyc"],
  ["rejected",      "rejected",       "rejected",                false, "/profile/kyc"],
  ["refused_final", "refused_final",  "refused",                 false, "/help"],
];

for (const [param, expectState, pillWords, showsWait, ctaPath] of NEVER_APPROVED) {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await demo(page, param);
  const L = `1.${param}`;

  // The boards: ordinary browsing pages, where the deleted bar used to stand.
  for (const board of ["/markets", "/updown"]) {
    await go(page, `${BASE}${board}`);
    await noBar(page, `${L}${board}`);
  }

  // ⭐ THE STAKE CONTROLS RENDER. From 2026-09-05 to 2026-09-13 a panel stood in their place; the
  // server asks no identity question on a bet any more, so a panel there would be a wall the
  // platform does not have.
  for (const [name, href, controlSel] of [
    ["market", marketHref, sel.dial],
    ["round", roundBettable ? roundHref : null, sel.dialUpDown],
  ]) {
    if (!href) continue;
    await go(page, `${BASE}${href}`);
    ok(`${L}.${name} · ★ the stake control renders for an account never approved`, await page.locator(controlSel).count() > 0);
    ok(`${L}.${name} · ⛔ …with NO identity panel`, await page.locator(sel.gate).count() === 0);
    await noBar(page, `${L}.${name}`);
  }

  // ⭐ THE DEPOSIT SCREEN'S ONE DOOR IS THE EMAIL, and the demo address is confirmed — so, the form.
  // 🔴 EXCEPT A FROZEN WALLET (2026-09-14): a final refusal freezes it (IDENTITY_REFUSED), and a wallet that is not
  // ACTIVE gets the paused notice instead of a form the server would refuse.
  await go(page, `${BASE}/wallet/deposit`);
  if (param === "refused_final") {
    ok(`${L}.deposit · ★ a frozen wallet gets the paused notice, not the form`, await page.locator('[data-testid="deposit-paused"]').count() === 1);
    ok(`${L}.deposit · ⛔ …and NO deposit form`, await page.locator(sel.depositForm).count() === 0);
  } else {
    ok(`${L}.deposit · ★ the deposit form renders`, await page.locator(sel.depositForm).count() > 0);
  }
  ok(`${L}.deposit · ⛔ …with NO identity panel`, await page.locator(sel.gate).count() === 0);
  await noBar(page, `${L}.deposit`);

  // ⭐ THE WITHDRAW SCREEN — the one money screen where identity decides what is rendered.
  // ⛔ ABSENT, NOT DISABLED: a disabled payout form reads as an outage and still invites the tap.
  await go(page, `${BASE}/wallet/withdraw`);
  const gate = page.locator(sel.payoutGate);
  const gateCount = await gate.count();
  ok(`${L}.withdraw · ★ the payout identity panel renders`, gateCount === 1, `${gateCount} found`);
  ok(`${L}.withdraw · ⛔ …and the withdrawal form is ABSENT from the DOM`, await page.locator(sel.withdrawForm).count() === 0);
  if (gateCount > 0) {
    const st = await gate.first().getAttribute("data-kyc-state");
    ok(`${L}.withdraw · …in THIS state`, st === expectState, `${st} vs ${expectState}`);
    const pt = await textOf(gate);
    if (expectState === "not_started" || expectState === "uploaded") {
      ok(`${L}.withdraw · it opens with "${COPY.en.eyebrow}", not "${COPY.en.oldEyebrow}"`,
        pt.includes(COPY.en.eyebrow.toLowerCase()) && !pt.includes(COPY.en.oldEyebrow.toLowerCase()), JSON.stringify(pt.slice(0, 80)));
    }
    ok(`${L}.withdraw · the review wait is ${showsWait ? "stated — the next move is theirs" : "NOT stated — the next move is not theirs"}`,
      (await gate.locator('[data-kyc-payout-line="wait"]').count() > 0) === showsWait);
    // ⛔ REMOVED BY THE QUIET RULE (2026-09-13): a reassurance nobody asked for is an explanation, and
    // it raises the very worry it answers.
    ok(`${L}.withdraw · ⛔ no "balance is safe" line`,
      pt.length > 20 && await gate.locator('[data-kyc-payout-line="safe"]').count() === 0 && !pt.includes(COPY.en.oldSafe.toLowerCase()),
      JSON.stringify(pt.slice(0, 80)));
    const btn = gate.locator("a.btn");
    if (ctaPath) {
      ok(`${L}.withdraw · …offers one button`, await btn.count() === 1);
      if (await btn.count() > 0) {
        // ⚠️ SCROLL BEFORE MEASURING. A control below the fold at 360 can return a null box.
        await btn.first().scrollIntoViewIfNeeded().catch(() => {});
        const box = await btn.first().boundingBox();
        // ⚠️ HALF-PIXEL TOLERANCE, AND IT IS NOT A CLIMBDOWN. The button is 44px by design
        // (`btn-md`); Chromium measured it at 43.99993896484375 — sub-pixel layout, not a small
        // button. Anything at or above 43.5 rounds to it and no thumb can tell (§A2).
        ok(`${L}.withdraw · the CTA is at least 44px tall`, !!box && box.height >= 43.5, `${box?.height}px`);
      }
    } else {
      ok(`${L}.withdraw · pending_review deliberately offers NO button — there is nothing for them to do`, await btn.count() === 0);
    }
    ok(`${L}.withdraw · no horizontal overflow at 360`, await noOverflow(page));
  }
  await noBar(page, `${L}.withdraw`);

  // ⭐ THE CTA MUST ACTUALLY GO SOMEWHERE. A panel whose button is decorative is a dead end
  // wearing the costume of a fix.
  if (ctaPath && gateCount > 0) {
    const cta = page.locator(`${sel.payoutGate} a.btn`);
    if (await cta.count() > 0) {
      // ⚠️ WAIT FOR THE URL, NOT FOR TEXT. A wait on body length returns INSTANTLY — the page
      // being left already has text — so the assertion read the old URL and called a working
      // button broken.
      await Promise.all([
        page.waitForURL((u) => u.pathname.startsWith(ctaPath), { timeout: 30_000 }).catch(() => {}),
        cta.first().click(),
      ]);
      ok(`${L}.cta · the panel's button lands on ${ctaPath}`, new URL(page.url()).pathname.startsWith(ctaPath), page.url());
    }
  }

  // /wallet: no bar. Whether the notice is due is §2's question, asked with its own controls.
  await go(page, `${BASE}/wallet`);
  ok(`${L}.wallet · control · /wallet rendered its balance`, await page.locator(sel.walletBalance).count() > 0);
  await noBar(page, `${L}.wallet`);

  // ⭐ /profile STATES the standing and no longer PROMPTS — the amber banner is deleted, the pill stays.
  await go(page, `${BASE}/profile`);
  const main = await textOf(page.locator("main"));
  const stale = OLD_PROFILE_BANNER.filter((w) => main.includes(w));
  ok(`${L}.profile · ⛔ the amber verify banner is gone — none of its words remain`, main.length > 40 && stale.length === 0, stale.join(" | ") || `${main.length} chars read`);
  const pill = page.locator(sel.profilePill);
  const pillText = await textOf(pill);
  ok(`${L}.profile · ★ …and the KYC status pill still states it ("${pillWords}")`, await pill.count() === 1 && pillText.includes(pillWords), pillText);
  await noBar(page, `${L}.profile`);

  // ⛔ MONEY ALREADY HELD IS NEVER TRAPPED: the cash-out route stays reachable.
  await go(page, `${BASE}/positions`);
  ok(`${L}.positions · /positions still renders (cash-out is never gated)`,
    !/error|something went wrong/i.test(await page.locator("body").innerText()));
  await page.close();
}

// ── §2 · The first-deposit notice ────────────────────────────────────────────
// ⭐ EVERY CASE IS A NEW BROWSER — `browser.newPage()` opens a fresh context — so no dismissal cookie
// from another case can be what hides it. An absence here is the server's decision, not a remembered X.
async function walletAs(kyc, deposit, width = 360) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await demo(page, kyc, deposit);
  await go(page, `${BASE}/wallet`);
  return page;
}

for (const [label, kyc, deposit, due] of [
  ["never deposited, nothing sent",                  "none",          0, false],
  ["a confirmed deposit, nothing sent",              "none",          1, true],
  ["a confirmed deposit, photos uploaded, not sent", "uploaded",      1, true],
  ["a confirmed deposit, documents with our team",   "pending",       1, false],
  ["a confirmed deposit, more information asked",    "more_info",     1, false],
  ["a confirmed deposit, rejected",                  "rejected",      1, false],
  ["a confirmed deposit, refused for good",          "refused_final", 1, false],
  ["a confirmed deposit, approved",                  "approved",      1, false],
]) {
  const page = await walletAs(kyc, deposit);
  const L = `2.${kyc}.deposit${deposit}`;
  ok(`${L} · control · /wallet rendered its balance`, await page.locator(sel.walletBalance).count() > 0);
  const n = await page.locator(sel.notice).count();
  ok(`${L} · ${due ? "★ the notice is PRESENT" : "⛔ the notice is ABSENT"} — ${label}`, n === (due ? 1 : 0), `${n} found`);
  if (due && n > 0) {
    const nt = await textOf(page.locator(sel.notice));
    ok(`${L} · it says its one sentence`, nt.includes(COPY.en.notice.toLowerCase()), JSON.stringify(nt));
    // ⛔ THE COPY RULE: verification is attached forward to the withdrawal; adding money and playing are
    // never named in the same sentence.
    ok(`${L} · ⛔ …naming no deposit, no money going in, no play`, nt.length > 20 && !/deposit|add money|top up|\bbet|\bplay|\bstake/.test(nt), nt);
    ok(`${L} · …with its one quiet link, to /profile/kyc`, await page.locator(`${sel.notice} a[href="/profile/kyc"]`).count() === 1);
    ok(`${L} · no horizontal overflow at 360`, await noOverflow(page));
    if (kyc === "none") {
      // ⛔ NOTHING IN THE WRONG PLACE: while it is due, it is due on /wallet and nowhere else.
      for (const path of ["/wallet/deposit", "/wallet/withdraw", "/markets", "/profile"]) {
        await go(page, `${BASE}${path}`);
        ok(`${L} · ⛔ …and it is NOT on ${path}`, await page.locator(sel.notice).count() === 0);
      }
    }
  }
  await page.close();
}

// ⭐ DISMISSED ONCE, REMEMBERED FOR THAT PLAYER IN THIS BROWSER (the cookie value is bound to the player since 2026-09-14).
{
  const page = await walletAs("none", 1);
  const x = page.locator(sel.noticeDismiss);
  ok("2.dismiss · control · the notice and its X are up before the X is pressed",
    await page.locator(sel.notice).count() === 1 && await x.count() === 1);
  if (await x.count() > 0) {
    await x.first().scrollIntoViewIfNeeded().catch(() => {});
    const box = await x.first().boundingBox();
    ok("2.dismiss · the X is a 44px target", !!box && box.width >= 43.5 && box.height >= 43.5, `${box?.width}×${box?.height}px`);
    await x.first().click();
    await page.waitForFunction((s) => !document.querySelector(s), sel.notice, { timeout: 5_000 }).catch(() => {});
    ok("2.dismiss · ★ pressing the X removes it in place", await page.locator(sel.notice).count() === 0);
    const cookie = (await page.context().cookies()).find((c) => c.name === NOTICE_COOKIE);
    // ⚠️ 2026-09-14 (audit session 95): the dismissal is bound to the PLAYER (`d:` + 16 hex of a per-user hash), so a
    // shared phone no longer hides the notice from the next player — the old unbound "dismissed" is not accepted.
    ok("2.dismiss · …and this player's dismissal is remembered in this browser", /^d:[0-9a-f]{16}$/.test(cookie?.value ?? ""), JSON.stringify(cookie ?? null));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });
    ok("2.dismiss · control · /wallet rendered again after the reload", await page.locator(sel.walletBalance).count() > 0);
    ok("2.dismiss · ★ …and the notice STAYS gone after the reload", await page.locator(sel.notice).count() === 0);
  }
  await page.close();
  // A browser that never pressed the X — same account, same state. The server still answers "due", so
  // the absence above was this browser's memory and not a changed account.
  const other = await walletAs("none", 1);
  ok("2.dismiss · ⭐ control · per browser, not per account — another browser is still offered it",
    await other.locator(sel.notice).count() === 1);
  await other.close();
}
skipped.push("the first-deposit notice on the card-deposit return page — needs a real Selcom card return (its mount is pinned by test:kyc-at-withdrawal §B2)");
console.log("SKIP 2.return · the card-deposit return page's confirmed state cannot be reached locally — SKIPPED, not passed");

// ── §3 · THE POSITIVE CONTROL — approved sees every control, no panel, no notice ─
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await demo(page, "approved", 1);
  const L = `3.${width}`;
  for (const [name, href, formSel] of [
    ["withdraw", "/wallet/withdraw", sel.withdrawForm],
    ["deposit", "/wallet/deposit", sel.depositForm],
    ["market", marketHref, sel.dial],
  ]) {
    if (!href) continue;
    await go(page, `${BASE}${href}`);
    ok(`${L}.${name} · ★ an APPROVED account sees NO identity panel`, await page.locator(sel.gate).count() === 0);
    ok(`${L}.${name} · ★ …and the real control is present`, await page.locator(formSel).count() > 0);
    await noBar(page, `${L}.${name}`);
  }
  await go(page, `${BASE}/wallet`);
  ok(`${L}.wallet · control · /wallet rendered its balance`, await page.locator(sel.walletBalance).count() > 0);
  ok(`${L}.wallet · ★ …and no first-deposit notice, though it holds a confirmed deposit`, await page.locator(sel.notice).count() === 0);
  await noBar(page, `${L}.wallet`);
  await page.close();
}

// ── §4 · The copy resolves in all three languages ───────────────────────────
// ⛔ A missing dictionary key renders as the KEY, or as empty. Both are shipped defects and neither
// throws. This is the check `test:i18n` cannot make: it proves parity of keys, not that the right key
// reached the screen.
for (const loc of LOCALES) {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  // ⚠️ `kp-locale`, WITH A HYPHEN — the cookie `i18n-server.ts` reads. Until 2026-09-13 this section set
  // `kp_locale`, which nothing reads, so all three "languages" rendered English and a missing Swahili or
  // Chinese string could never have been seen. The eyebrow check below is also the proof the locale took.
  await page.context().addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
  await demo(page, "none", 1);

  await go(page, `${BASE}/wallet/withdraw`);
  const pt = await textOf(page.locator(sel.payoutGate));
  ok(`4.${loc}.withdraw · the payout panel opens with "${COPY[loc].eyebrow}"`, pt.includes(COPY[loc].eyebrow.toLowerCase()), JSON.stringify(pt.slice(0, 80)));
  ok(`4.${loc}.withdraw · ⛔ …and carries no "balance is safe" line`, pt.length > 20 && !pt.includes(COPY[loc].oldSafe.toLowerCase()));
  if (COPY[loc].oldEyebrow) ok(`4.${loc}.withdraw · ⛔ …and no longer says "${COPY[loc].oldEyebrow}"`, pt.length > 20 && !pt.includes(COPY[loc].oldEyebrow.toLowerCase()));
  ok(`4.${loc}.withdraw · real copy, not a dictionary key or an unfilled placeholder`, pt.length > 20 && !/kycgate\.|undefined|\{\w+\}/.test(pt), JSON.stringify(pt.slice(0, 60)));

  await go(page, `${BASE}/wallet`);
  const nt = await textOf(page.locator(sel.notice));
  ok(`4.${loc}.notice · the first-deposit notice says its one sentence`, nt.includes(COPY[loc].notice.toLowerCase()), JSON.stringify(nt));
  ok(`4.${loc}.notice · real copy, not a dictionary key`, nt.length > 5 && !/kycnotice\.|undefined/.test(nt));
  await page.close();
}

await browser.close();
// ⛔ THE SKIP COUNT RIDES IN THE HEADLINE, not only in the body. "92 passed, 0 failed" reads as complete
// coverage; it is not, if a surface was never reached.
console.log(`\nkyc-gate drive: ${pass} passed, ${fail} failed${skipped.length ? `, ${skipped.length} SKIPPED` : ""}`);
for (const s of skipped) console.log(`  SKIPPED · ${s}`);
if (fail > 0) process.exit(1);
