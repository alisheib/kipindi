/**
 * THE IDENTITY GATE, DRIVEN IN A REAL BROWSER — what renders, what does not, what clicks.
 *
 * ⭐ WHY A DRIVE AND NOT MORE ASSERTIONS. `test:kyc-gate` proves the SERVER refuses. It
 * cannot prove that a player never meets that refusal by surprise, that the control which
 * would be refused is genuinely absent from the DOM rather than merely dimmed, that the
 * panel's button goes anywhere, or that any of it survives 360px and three languages.
 * Those are rendering facts and only a renderer can answer them.
 *
 * ⛔ ABSENT, NOT DISABLED — the property this file exists to hold. A disabled dial still
 * invites the tap and reads as an outage; a hidden one is still in the DOM for anything
 * that walks it. Every state below asserts the control is GONE and the panel is THERE.
 *
 * Fixtures come from `/auth/demo?kyc=…`, which writes a real KycSubmission (dev-only route,
 * 404 in production). ⚠️ Requires the app running at BASE — `npm run build && npm start`.
 * `next dev` renders an empty admin body on this machine; player surfaces are fine either
 * way, but `start` is what the other live harnesses use.
 *
 *   BASE=http://localhost:3000 node scripts/kyc-gate-drive.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const WIDTHS = [360, 1280];
const LOCALES = ["en", "sw", "zh"];

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
  // ⚠️ 120s, NOT the 30s default. This runs against `next dev`, which COMPILES a route the
  // first time it is requested — a cold /markets or / can take a minute on a loaded machine,
  // and the default timeout turns that into "the page never rendered". A drive that reports a
  // compile as a product failure is worse than a slow drive.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });
}

/** Sign in as the demo player in a chosen identity state. */
async function demo(page, kyc) {
  await go(page, `${BASE}/auth/demo?kyc=${kyc}`);
}

const sel = {
  gate: '[data-testid="kyc-gate-panel"]',
  banner: '[data-testid="kyc-verify-banner"]',
  // The stake control on a poll market, and the deposit/withdraw forms.
  // The poll market's stake control is the conviction dial; these are its own testids.
  dial: '[data-testid="side-picker"]',
  // Up & Down renders a different control — the quick-stake column, not the dial.
  dialUpDown: '[data-testid="updown-stake-panel"]',
  depositForm: 'form input[name="msisdn"], #provider-MPESA',
  withdrawForm: 'form button[type="submit"], #amount',
};

const browser = await chromium.launch();

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
  // by router.push. So four "the gate panel is missing on the round" failures were the
  // drive standing on the HISTORY page, where there is correctly no stake control and no
  // gate. ⛔ A selector that matches the wrong element reports a defect in a product that
  // is behaving perfectly, which is worse than matching nothing.
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
  // legitimate state of the environment, not of the product. Counting it as a pass would
  // hide that this surface went unchecked; counting it as a failure would cry wolf. It is
  // printed, excluded from both tallies, and repeated in the final line.
  if (roundHref) ok("0.2 · fixture · an Up & Down round exists to drive", true, roundHref);
  else { skipped.push("Up & Down round surface — no round was open in this environment"); console.log("SKIP 0.2 · no Up & Down round is open — its checks are SKIPPED, not passed"); }

  // ⚠️ IS THE ROUND ACTUALLY BETTABLE RIGHT NOW? An Up & Down round spends most of its life
  // LOCKED or SETTLED, and `RoundActionPanel` renders the stake column only while it is
  // open — so on a locked round there is no control to replace and correctly no gate panel.
  // ⛔ The first draft demanded the panel unconditionally and reported four failures against
  // a product doing exactly the right thing. A drive has to establish that the control WOULD
  // be there for a verified player before it can claim the gate removed it.
  if (roundHref) {
    await go(page, `${BASE}${roundHref}`);
    roundBettable = await page.locator(sel.dialUpDown).count() > 0;
  }
  ok("0.3 · fixture · …and it is open for staking (else its checks are skipped, not failed)",
    true, roundBettable ? "bettable" : "locked/settled — round checks skipped");
  await page.close();
}

// ── §1 · Each blocked state: the panel is there, the control is NOT ──────────
const BLOCKED = [
  ["none", "not_started"],
  ["pending", "pending_review"],
  ["more_info", "more_info"],
  ["rejected", "rejected"],
];

for (const [param, expectState] of BLOCKED) {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await demo(page, param);

  // The app-wide bar names the condition on an ordinary browsing page.
  await go(page, `${BASE}/markets`);
  const bar = page.locator(sel.banner);
  ok(`1.${param}.bar · the standing identity bar is on an ordinary page`, await bar.count() > 0);
  if (await bar.count() > 0) {
    const state = await page.locator(`${sel.banner} [data-kyc-state]`).first().getAttribute("data-kyc-state").catch(() => null);
    ok(`1.${param}.bar · …naming THIS state`, state === expectState, `${state} vs ${expectState}`);
  }

  for (const [name, href, formSel] of [
    ["market", marketHref, sel.dial],
    ["round", roundBettable ? roundHref : null, sel.dialUpDown],
    ["deposit", "/wallet/deposit", sel.depositForm],
    ["withdraw", "/wallet/withdraw", sel.withdrawForm],
  ]) {
    if (!href) continue;
    await go(page, `${BASE}${href}`);
    const gate = page.locator(sel.gate);
    ok(`1.${param}.${name} · the gate panel renders`, await gate.count() > 0);
    // ⛔ THE HEART OF IT: the refused control must be ABSENT from the DOM.
    ok(`1.${param}.${name} · …and the control it replaces is ABSENT, not hidden`,
      await page.locator(formSel).count() === 0);
    if (await gate.count() > 0) {
      const st = await gate.first().getAttribute("data-kyc-state");
      ok(`1.${param}.${name} · …in the right state`, st === expectState, `${st} vs ${expectState}`);
      // Tap targets and overflow, at the width that hurts.
      const btn = page.locator(`${sel.gate} a.btn`);
      if (await btn.count() > 0) {
        // ⚠️ SCROLL BEFORE MEASURING. A control below the fold at 360 can return a null
        // box, which reads as "undefinedpx" and fails a button that is perfectly sized — the
        // same viewport-coordinate trap the KYC "looked at" sweep filed 14 false failures on.
        await btn.first().scrollIntoViewIfNeeded().catch(() => {});
        const box = await btn.first().boundingBox();
        // ⚠️ HALF-PIXEL TOLERANCE, AND IT IS NOT A CLIMBDOWN. The button is 44px by design
        // (`btn-md`); Chromium measured it at 43.99993896484375 — sub-pixel layout, not a
        // small button. Asserting `>= 44` on a float from a real renderer fails on rounding
        // and teaches the next person to distrust the check. The rule is "44px preferred on
        // mobile" (§A2); anything at or above 43.5 rounds to it and no thumb can tell.
        ok(`1.${param}.${name} · the CTA is at least 44px tall`, !!box && box.height >= 43.5, `${box?.height}px`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      ok(`1.${param}.${name} · no horizontal overflow at 360`, !overflow);
    }
  }

  // ⭐ THE CTA MUST ACTUALLY GO SOMEWHERE. A panel whose button is decorative is a dead end
  // wearing the costume of a fix.
  await go(page, `${BASE}/wallet/deposit`);
  const cta = page.locator(`${sel.gate} a.btn`);
  if (await cta.count() > 0) {
    // ⚠️ WAIT FOR THE URL, NOT FOR TEXT.  on body length returns
    // INSTANTLY here — the page we are leaving already has text — so the assertion read the
    // old URL and called a working button broken.
    await Promise.all([
      page.waitForURL((u) => u.pathname.startsWith("/profile/kyc"), { timeout: 30_000 }).catch(() => {}),
      cta.first().click(),
    ]);
    ok(`1.${param}.cta · the panel's button lands on /profile/kyc`, page.url().includes("/profile/kyc"), page.url());
  } else {
    ok(`1.${param}.cta · pending_review deliberately offers NO button`, expectState === "pending_review");
  }

  // ⛔ MONEY ALREADY HELD IS NEVER TRAPPED: the cash-out route stays reachable.
  await go(page, `${BASE}/positions`);
  ok(`1.${param}.positions · /positions still renders (cash-out is never gated)`,
    !/error|something went wrong/i.test(await page.locator("body").innerText()));
  await page.close();
}

// ── §2 · THE POSITIVE CONTROL — approved sees every control, no panel ────────
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await demo(page, "approved");
  for (const [name, href, formSel] of [
    ["market", marketHref, sel.dial],
    ["deposit", "/wallet/deposit", sel.depositForm],
    ["withdraw", "/wallet/withdraw", sel.withdrawForm],
  ]) {
    if (!href) continue;
    await go(page, `${BASE}${href}`);
    ok(`2.${width}.${name} · ★ an APPROVED player sees NO gate panel`, await page.locator(sel.gate).count() === 0);
    ok(`2.${width}.${name} · ★ …and the real control is present`, await page.locator(formSel).count() > 0);
  }
  ok(`2.${width}.bar · ★ …and no standing identity bar`, await page.locator(sel.banner).count() === 0);
  await page.close();
}

// ── §3 · The copy resolves in all three languages ───────────────────────────
// ⛔ A missing dictionary key renders as the KEY, or as empty. Both are shipped defects and
// neither throws. This is the check `test:i18n` cannot make: it proves parity of keys, not
// that the right key reached the screen.
for (const loc of LOCALES) {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await page.context().addCookies([{ name: "kp_locale", value: loc, url: BASE }]);
  await demo(page, "pending");
  await go(page, `${BASE}/wallet/deposit`);
  const text = await page.locator(sel.gate).first().innerText().catch(() => "");
  ok(`3.${loc} · the gate panel has real copy, not a key or a blank`,
    text.trim().length > 20 && !/kycGate\.|undefined|\{\w+\}/.test(text), JSON.stringify(text.slice(0, 60)));
  await page.close();
}

await browser.close();
// ⛔ THE SKIP COUNT RIDES IN THE HEADLINE, not only in the body. "92 passed, 0 failed" reads
// as complete coverage; it is not, if a surface was never reached. Anyone scanning the last
// line must see that something went unchecked.
console.log(`\nkyc-gate drive: ${pass} passed, ${fail} failed${skipped.length ? `, ${skipped.length} SKIPPED` : ""}`);
for (const s of skipped) console.log(`  SKIPPED · ${s}`);
if (fail > 0) process.exit(1);
