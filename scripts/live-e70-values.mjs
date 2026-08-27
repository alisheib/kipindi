/**
 * E-70 · THE VALUES THAT FREEZE ACROSS A SOFT NAVIGATION — DRIVEN ON PRODUCTION BY CLICKING.
 *
 *   node scripts/live-e70-values.mjs legal     # Ali's item 4 — the legal nav highlight
 *   node scripts/live-e70-values.mjs balance   # Ali's item 1 — the top-bar balance after a bet
 *
 * 🔴 READ THIS BEFORE CHANGING A LINE OF IT. TWO SESSIONS WERE LOST TO THIS EXACT INSTRUMENT
 * MISTAKE, ON THIS EXACT CLASS OF DEFECT. `admin-shell.tsx:210` and `avatar-menu.tsx:172` both
 * record it: **a driver that navigates with `page.goto()` CANNOT REPRODUCE EITHER BUG**, because
 * a `goto` is a HARD load and a hard load re-executes the layout correctly. Measured on
 * production, same URL and same session: click → `nav=0`, hard load → `nav=2`. So every leg here
 * clicks a real `<Link>`, and every leg PROVES the navigation was soft by planting a value on
 * `window` first and requiring it to survive. ⛔ If that proof ever fails, the leg reports
 * INCONCLUSIVE rather than a pass — a probe that silently hard-loads reports a healthy platform
 * over a broken one, which is worse than no probe.
 *
 * ⛔ AND A RENDERED NUMBER IS NEVER EVIDENCE OF A BALANCE. The balance leg reads `Wallet.balance`
 * from production's own row and compares the DOM to it. It reads the pill TWICE, in two different
 * ways, because the work order named two failure modes that need different fixes:
 *   · the pill's `aria-label` carries `formatTzs(effectiveBalance)` — what the component BELIEVES,
 *     after the SSE event and before the tween. A stale one means the DATA never arrived.
 *   · the pill's text carries `display` — the 600ms rolling counter's current frame. A correct
 *     label with wrong text means the TWEEN landed wrong.
 * Distinguishing them is the whole reason both are read.
 */
import { readFileSync } from "node:fs";
import { BASE, browser, login, shot, recorder, fleetPersona } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";

const CMD = process.argv[2] ?? "legal";
const PLAYER = process.env.PLAYER ?? "01";
const me = fleetPersona(PLAYER);
const E164 = `+255${me.phone}`;
/**
 * ⚠️ 3,000 AND NOT 2,000, AND THAT IS A PRECONDITION RATHER THAN A PREFERENCE. `fleet:01` may
 * hold an ACTIVE 2,000×1 bonus grant (`qa:bonus-relock` leaves one deliberately). A 2,000 stake
 * would FULFIL it, converting 2,000 of bonus into real balance in the same transaction — so the
 * real balance would come out UNCHANGED and this leg could not tell a live pill from a frozen
 * one. Leg 0 asserts the balance actually moved rather than assuming it.
 */
const STAKE = Number(process.env.STAKE ?? 3_000);

const rec = recorder(`LIVE E-70 · ${CMD} · ${me.label}`);

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(new URL("./live/ops/.env", import.meta.url), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
}
const sql = await connect();
const N = (v) => Number(v ?? 0);

/** `Wallet.balance` for this player, off production. The only balance this file trusts. */
async function dbBalance() {
  const { rows } = await sql.query(
    `select w.balance::numeric balance, w."bonusBalance"::numeric bonus
       from "Wallet" w join "User" u on u.id = w."userId" where u."phoneE164" = $1`, [E164]);
  if (!rows[0]) throw new Error(`no wallet for ${E164}`);
  return { balance: N(rows[0].balance), bonus: N(rows[0].bonus) };
}

/** Plant a value on `window`; if it survives the click, the navigation was SOFT. */
const plant = (page) => page.evaluate(() => { window.__e70 = "soft-nav-probe"; });
const survived = (page) => page.evaluate(() => window.__e70 === "soft-nav-probe");

// ─────────────────────────────────────────────────────────────────────────────
// legal — item 4: the highlighted tab after CLICKING, not after loading
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ THE ASSERTION IS `aria-current="page"`, NOT A COLOUR. The highlight is expressed to
 * assistive technology by that attribute and to sighted users by a background and a left border;
 * the attribute is the one a machine can read without measuring paint, and it is the one that
 * would still be wrong if the classes were restyled tomorrow.
 * ⛔ AND THE REPORT'S WORDING IS TESTED, NOT ASSUMED. Ali said "always Responsible Gambling"; the
 * diagnosis says "always whatever page you ARRIVED on". So this leg arrives on TERMS as well and
 * requires the stuck tab to follow the landing page — that is what makes the diagnosis exact
 * rather than plausible.
 */
async function legal() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    const current = () => page.evaluate(() => {
      const el = document.querySelector('nav[aria-label] a[aria-current="page"]');
      return el ? (el.textContent ?? "").trim() : null;
    });

    for (const [arriveAt, arriveLabel, clickLabel, clickHref] of [
      ["/legal/responsible-gambling", /responsible gambling/i, /^Terms$/, "/legal/terms"],
      ["/legal/terms", /^terms$/i, /^AML \/ KYC$/, "/legal/aml"],
    ]) {
      await page.goto(`${BASE}${arriveAt}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("nav[aria-label]", { timeout: 45_000 });
      await page.waitForTimeout(1_200);
      const landed = await current();
      rec.check(`1: arriving on ${arriveAt} highlights its own tab (a HARD load is correct, and always was)`,
        !!landed && arriveLabel.test(landed), `highlighted: ${landed ?? "(nothing)"}`);

      await plant(page);
      const link = page.getByRole("link", { name: clickLabel }).first();
      await link.waitFor({ state: "visible", timeout: 20_000 });
      await link.click({ timeout: 20_000 });
      await page.waitForURL(`**${clickHref}`, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(1_200);

      // ⛔ THE PROOF THAT THIS PROBE IS TESTING THE RIGHT THING AT ALL.
      const soft = await survived(page);
      rec.check(`2: ⛔ the click was a SOFT navigation — the document was NOT reloaded, so this leg can actually see the bug`,
        soft, soft ? "window value survived" : "INCONCLUSIVE — the page hard-loaded; a goto-style navigation re-renders the layout correctly and proves nothing");
      if (!soft) continue;

      const after = await current();
      rec.check(`3: ★★ after CLICKING through to ${clickHref}, the highlight follows the click`,
        !!after && clickLabel.test(after.replace(/\s+/g, " ")),
        `url ${page.url().replace(BASE, "")} · highlighted: ${after ?? "(nothing)"} · wanted ${clickLabel}`);
      await shot(page, `e70-legal-${clickHref.replace(/\W+/g, "-")}`);
    }

    // ⭐ SWAHILI, because the nav is trilingual and the labels are not the same strings.
    await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
    await page.goto(`${BASE}/legal/responsible-gambling`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("nav[aria-label]", { timeout: 45_000 });
    await page.waitForTimeout(1_200);
    await plant(page);
    await page.getByRole("link", { name: /^Masharti$/ }).first().click({ timeout: 20_000 });
    await page.waitForURL("**/legal/terms", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1_200);
    const softSw = await survived(page);
    const sw = await page.evaluate(() => {
      const el = document.querySelector('nav[aria-label] a[aria-current="page"]');
      return el ? (el.textContent ?? "").trim() : null;
    });
    rec.check("4: ★ and it follows the click in SWAHILI too — the fix is not keyed to English labels",
      softSw && /masharti/i.test(sw ?? ""), softSw ? `highlighted: ${sw ?? "(nothing)"}` : "INCONCLUSIVE — hard load");
    await shot(page, "e70-legal-sw-terms");
  } finally { await ctx.close(); await b.close(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// balance — item 1: the top-bar figure after a bet, with no navigation at all
// ─────────────────────────────────────────────────────────────────────────────
async function balance() {
  const before = await dbBalance();
  rec.check("0: the real balance can fund the stake", before.balance > STAKE,
    `balance ${before.balance} · stake ${STAKE}`);
  if (!(before.balance > STAKE)) { rec.done(); return; }

  const market = (await sql.query(`
    select m.id from "PredictionMarket" m
     where m.status = 'LIVE' and m."productLine"::text <> 'UPDOWN'
       and coalesce(m."selectionClosedAt", m."resolutionAt") > (now() at time zone 'utc') + interval '30 minutes'
       and m."yesPool" = 0 and m."noPool" = 0
       and (select count(*) from "Position" p where p."marketId" = m.id) = 0
     limit 1`)).rows[0];
  rec.check("0: a LIVE poll with hours left and nobody else in it", !!market, market?.id ?? "none found");
  if (!market) { rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/markets/${market.id}?side=YES`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(2_000);

    /**
     * The pill, read TWO ways. ⭐ `aria-label` carries `formatTzs(effectiveBalance)` — what the
     * component BELIEVES; the text carries `display` — the tween's current frame. A stale label
     * means the DATA never arrived (fix the data path); a good label with stale text means the
     * TWEEN landed wrong (fix the component). The work order named both and they need different
     * fixes, so both are measured.
     */
    const readPill = async () => page.evaluate(() => {
      const el = document.querySelector('[data-testid="wallet-balance-pill"]');
      if (!el) return null;
      const num = (s) => { const m = /([\d,]{2,})/.exec(s ?? ""); return m ? Number(m[1].replace(/,/g, "")) : null; };
      return { label: num(el.getAttribute("aria-label")), text: num(el.textContent), raw: (el.getAttribute("aria-label") ?? "").slice(0, 60) };
    });

    const p0 = await readPill();
    rec.check("1: the pill is on the page and shows a figure (cash is not hidden)",
      !!p0 && p0.label !== null && p0.text !== null, JSON.stringify(p0));
    rec.check("1: ★ on a HARD load the pill agrees with the database — the baseline that was never in doubt",
      p0?.label === before.balance && p0?.text === before.balance,
      `db ${before.balance} · label ${p0?.label} · text ${p0?.text}`);

    // ── the bet, with NO navigation afterwards ────────────────────────────────────────────
    const box = page.locator('input[aria-label*="Stake amount" i]').first();
    await box.waitFor({ timeout: 30_000 });
    await box.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(String(STAKE), { delay: 30 });
    await page.waitForTimeout(400);
    const typed = (await box.inputValue()).replace(/[^\d]/g, "");
    rec.check("2: ★ the stake box reads the intended amount before the commit", typed === String(STAKE), `"${typed}"`);
    if (typed !== String(STAKE)) throw new Error("refusing to bet");
    await page.getByRole("button", { name: /Place YES/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(1_200);
    await page.locator('[role="dialog"], [role="alertdialog"]').locator("button")
      .filter({ hasText: /^(Confirm|Place)/i }).last().click({ timeout: 20_000 });
    // The tween is 600ms and the SSE hop is a network round trip. Give both room, then read.
    await page.waitForTimeout(8_000);

    const mid = await dbBalance();
    rec.check("3: ⛔ the bet MOVED the real balance — without this the leg cannot tell a live pill from a frozen one",
      mid.balance !== before.balance,
      `db ${before.balance} → ${mid.balance} (bonus ${before.bonus} → ${mid.bonus})`);
    const p1 = await readPill();
    // ⭐ THE CHECK ALI'S REPORT IS ABOUT. No navigation has happened at all — this is the same
    // document, the same layout instance, the same pill component.
    rec.check("4: ★★ WITH NO NAVIGATION AT ALL, the pill now agrees with the database — the live feed reached it",
      p1?.label === mid.balance,
      `db ${mid.balance} · pill label ${p1?.label} (was ${before.balance}) — a stale label means the DATA never arrived`);
    rec.check("4: ★ …and the rolling counter LANDED on it rather than near it",
      p1?.text === mid.balance,
      `db ${mid.balance} · pill text ${p1?.text} — a correct label with wrong text is the TWEEN, not the data`);
    await shot(page, "e70-balance-after-bet-no-nav");

    // ── and now the soft navigation, which is where the layout freezes ────────────────────
    await plant(page);
    const nav = page.getByRole("link", { name: /^Positions$/i }).first();
    const haveNav = await nav.isVisible().catch(() => false);
    if (haveNav) {
      await nav.click({ timeout: 20_000 });
      await page.waitForTimeout(3_000);
      const soft = await survived(page);
      rec.check("5: ⛔ the navigation was SOFT — the layout was preserved, which is the condition the bug needs",
        soft, soft ? `url ${page.url().replace(BASE, "")}` : "INCONCLUSIVE — hard load, proves nothing");
      const p2 = await readPill();
      rec.check("5: ★★ after CLICKING a real <Link>, the pill still agrees with the database",
        p2?.label === mid.balance, `db ${mid.balance} · pill label ${p2?.label}`);
      await shot(page, "e70-balance-after-soft-nav");
    } else {
      rec.note("5: no `Positions` link visible at this viewport — soft-nav half skipped, not scored.");
    }

    // ── put the money back, and prove the exit publishes too ──────────────────────────────
    await page.goto(`${BASE}/markets/${market.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    const exit = page.getByRole("button", { name: /free exit|cancel|ghairi|取消/i }).first();
    let sold = false;
    if (await exit.isVisible().catch(() => false)) {
      for (let i = 0; i < 3 && !sold; i++) {
        await exit.click({ timeout: 20_000 });
        const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 15_000 });
        const sell = dlg.getByRole("button", { name: /^Sell\b/i }).first();
        await sell.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
        if (await sell.isEnabled().catch(() => false)) { await sell.click({ timeout: 15_000 }); sold = true; }
        else { await dlg.getByRole("button", { name: /keep position|close/i }).first().click({ timeout: 10_000 }).catch(() => {}); await page.waitForTimeout(600); }
      }
    }
    rec.check("6: the free exit returned the stake — this leg leaves the wallet as it found it", sold);
    if (sold) {
      await page.waitForTimeout(8_000);
      const end = await dbBalance();
      const p3 = await readPill();
      rec.check("6: ★★ and the CASH-OUT publishes too — the pill followed the refund with no navigation",
        p3?.label === end.balance, `db ${end.balance} · pill label ${p3?.label}`);
      rec.check("6: ★ the wallet is back where it started, to the shilling",
        end.balance === before.balance && end.bonus === before.bonus,
        `balance ${before.balance} → ${end.balance} · bonus ${before.bonus} → ${end.bonus}`);
      rec.note(`CLOSE: balance ${end.balance} · bonus ${end.bonus}`);
    }
  } finally { await ctx.close(); await b.close(); }
}


// ─────────────────────────────────────────────────────────────────────────────
// settled — item 1, REPRODUCED: the money moves while the tab is PARKED
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 WHY THIS LEG EXISTS, AND THE THREE READINGS THAT HAD TO BE ELIMINATED FIRST.
 * The obvious reading of Ali's report — "place a bet, look at the navbar" — was driven against
 * production and came back **13 passed, 0 failed, BEFORE any fix shipped** (`qa:e70-balance`).
 * A poll bet goes through `buyPositionAction`, a SERVER ACTION, and an action's response
 * re-renders the current route's tree from the root: the layout DOES re-execute, so the pill was
 * already correct. Two more readings were measured and also came back clean:
 *   · `/updown` and `/updown/[roundId]` both mount a `RefreshPoller` whose `router.refresh()`
 *     re-renders the server tree. ⚠️ I nearly filed `markets/actions.ts:95`'s comment as a false
 *     claim on the strength of one grep that missed those two files. It is accurate.
 *   · `/wallet`'s AVAILABLE figure agrees with the pill to the shilling, with the bonus shown
 *     separately as "PLAY TO UNLOCK" — so it is not a totals-mismatch either.
 *
 * ⭐ SO THE CONDITION IS NARROWER THAN THE WORK ORDER ASSUMED, AND NAMING IT IS THE FINDING:
 * **the balance changes while the player's tab is PARKED — no server action, no poller, nothing
 * in that tab asking the server anything.** A settlement lands. A payout arrives. The pill's prop
 * was computed in the LAYOUT on the last hard load and nothing re-runs it. Then the player clicks
 * to `/wallet`: the PAGE re-renders and reads fresh, the LAYOUT is preserved and does not, and the
 * two numbers on one screen disagree. **That is Ali's sentence, exactly.**
 *
 * ⛔ AND THE OBVIOUS INSTRUMENT FOR IT IS IMPOSSIBLE ON THIS PLATFORM, WHICH IS WORTH RECORDING.
 * The first version of this leg opened TWO browsers as the same player and had one move the money
 * while the other sat still. **A second login REVOKES the first session** (B-13, by design — the
 * shell even routes the revoked device to `/auth/login?revoked=1`), so tab A was bounced to the
 * login page and the leg died waiting for `main`. A platform property, not a bug, and it rules out
 * the whole two-tab family of probes.
 *
 * ⭐ SO THE MONEY IS MOVED BY THE PLATFORM ITSELF: an Up & Down round SETTLES while the tab is
 * parked on `/wallet`, which mounts no `RefreshPoller`. That is a genuine settlement through
 * `settleMarket` — the exact path the fix touches — with no operator action, no second account and
 * nothing whatever for the parked tab to have learned from except the live feed.
 */
async function settled() {
  const start = await dbBalance();
  rec.check("0: the real balance can fund the stake", start.balance > STAKE, `balance ${start.balance}`);
  // A round that still accepts bets AND settles soon enough to watch. ⚠️ `boundaryAt` is when the
  // price is read; settlement follows it. Nobody else may hold a position in it, or this leg is
  // moving another player's odds for its own convenience.
  const round = (await sql.query(`
    select r."marketId" mkt, r.id round_id, a.symbol, ch."durationMinutes" mins,
           extract(epoch from (m."selectionClosedAt" - (now() at time zone 'utc')))::int window_s,
           extract(epoch from (r."boundaryAt"        - (now() at time zone 'utc')))::int boundary_s
      from "UpDownRound" r
      join "PredictionMarket" m on m.id = r."marketId"
      join "UpDownChain" ch on ch.id = r."chainId"
      left join "UpDownAsset" a on a.id = ch."assetId"
     where m.status = 'LIVE' and ch.state = 'RUNNING'
       and m."selectionClosedAt" > (now() at time zone 'utc') + interval '150 seconds'
       and r."boundaryAt" < (now() at time zone 'utc') + interval '14 minutes'
       and (select count(*) from "Position" p where p."marketId" = m.id) = 0
     order by r."boundaryAt" asc limit 1`)).rows[0];
  rec.check("0: an Up & Down round accepts a bet now, settles within 14 minutes, and nobody else is in it",
    !!round, round ? `${round.mkt} ${round.symbol} ${round.mins}m · window ${round.window_s}s · boundary in ${round.boundary_s}s` : "none found");
  if (!round || !(start.balance > STAKE)) { rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  const readPill = () => page.evaluate(() => {
    const el = document.querySelector('[data-testid="wallet-balance-pill"]');
    if (!el) return null;
    const num = (t) => { const m = /([\d,]{2,})/.exec(t ?? ""); return m ? Number(m[1].replace(/,/g, "")) : null; };
    return { label: num(el.getAttribute("aria-label")), text: num(el.textContent) };
  });
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/markets/${round.mkt}?side=YES`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(5_000);

    // ⚠️ THE UP & DOWN CARD IS NOT THE POLL CARD. It renders a PRESET LADDER whose chips are
    // `<button role="radio">` — Playwright resolves roles through the accessibility tree, where an
    // explicit `role` beats the tag, so `getByRole("button")` cannot match them. Learned the
    // expensive way in `live-bonus-j.mjs`.
    const preset = `${STAKE / 1000}K`;
    const chip = page.getByRole("radio", { name: new RegExp(`^${preset}$`) }).first();
    await chip.waitFor({ state: "visible", timeout: 30_000 });
    await chip.click({ timeout: 20_000 });
    await page.waitForTimeout(800);
    // ⛔ READ THE CONTROL BEFORE CLICKING IT — the gold button IS the money commit, with no dialog.
    const confirms = page.locator('button[aria-label*="TZS" i]');
    const n = await confirms.count();
    rec.check("1: exactly ONE button names a TZS amount — no ordering guess on a money control", n === 1, `${n} candidates`);
    if (n !== 1) throw new Error("refusing to click");
    const label = await confirms.first().getAttribute("aria-label");
    const wants = new RegExp(`TZS\\s*${STAKE.toLocaleString("en-US")}\\s*$`);
    rec.check("1: ★ the one-click commit names the intended stake before it is clicked",
      !!label && wants.test(label), `aria-label="${label}"`);
    if (!label || !wants.test(label)) throw new Error("refusing to click a control that does not name the stake");
    await confirms.first().click({ timeout: 25_000 });
    await page.waitForTimeout(6_000);

    const afterBet = await dbBalance();
    rec.check("2: the stake left the wallet", afterBet.balance !== start.balance,
      `db ${start.balance} → ${afterBet.balance}`);

    // ── PARK on /wallet, by CLICKING. It mounts no RefreshPoller, which is the condition. ──
    await plant(page);
    await page.locator('[data-testid="wallet-balance-pill"]').first().click({ timeout: 20_000 });
    await page.waitForURL("**/wallet", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3_000);
    rec.check("3: ⛔ the move to /wallet was a SOFT navigation — the layout is preserved, which is the condition Ali's report needs",
      await survived(page), `url ${page.url().replace(BASE, "")}`);
    const parked = await readPill();
    rec.check("3: the parked pill starts out agreeing with the database", parked?.label === afterBet.balance,
      `db ${afterBet.balance} · pill ${parked?.label}`);

    // ── wait for the platform to move the money underneath it ──────────────────────────────
    const posId = (await sql.query(`
      select p.id from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2 order by p."placedAt" desc limit 1`,
      [E164, round.mkt])).rows[0]?.id;
    rec.check("4: the position exists and can be watched", !!posId, posId ?? "none");
    let settledRow = null;
    const deadline = Date.now() + (Math.max(0, round.boundary_s) + 240) * 1000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(15_000);   // ⛔ the WAIT is on the page, so the tab stays parked and alive
      settledRow = (await sql.query(`
        select p.status::text status, p."finalPayout"::numeric payout from "Position" p where p.id = $1`,
        [posId ?? ""])).rows[0];
      if (settledRow && settledRow.status !== "OPEN") break;
    }
    rec.check("4: ★ the round SETTLED while the tab sat on /wallet doing nothing",
      !!settledRow && settledRow.status !== "OPEN",
      settledRow ? `${settledRow.status} finalPayout ${settledRow.payout}` : "still OPEN at the deadline");
    if (!settledRow || settledRow.status === "OPEN") { rec.done(); return; }

    const afterSettle = await dbBalance();
    rec.check("5: ⛔ settlement MOVED the balance — otherwise a stale pill is indistinguishable from a correct one",
      afterSettle.balance !== afterBet.balance,
      `db ${afterBet.balance} → ${afterSettle.balance} · position ${settledRow.status}`);
    if (afterSettle.balance === afterBet.balance) {
      rec.note("⚠️ the position LOST, so no money came back and this leg cannot measure the parked pill. Re-run.");
      rec.done(); return;
    }

    // ⭐⭐ THE CHECK. The tab has not been clicked, navigated or refreshed since it parked.
    await page.waitForTimeout(8_000);
    const p1 = await readPill();
    rec.check("6: ★★ ALI'S BUG · the PARKED tab's navbar corrected itself with no action, no poller and no click — only the live feed could have told it",
      p1?.label === afterSettle.balance,
      `db ${afterSettle.balance} · navbar ${p1?.label} (was ${afterBet.balance}) — equal to the OLD figure is the defect`);
    await shot(page, "e70-settled-parked-navbar");

    // ── and the two numbers on one screen, which is how Ali saw it ─────────────────────────
    await plant(page);
    const positions = page.getByRole("link", { name: /^Positions$/i }).first();
    if (await positions.isVisible().catch(() => false)) {
      await positions.click({ timeout: 20_000 });
      await page.waitForTimeout(2_500);
      await page.locator('[data-testid="wallet-balance-pill"]').first().click({ timeout: 20_000 });
      await page.waitForURL("**/wallet", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3_000);
      rec.check("7: ⛔ both hops were SOFT navigations", await survived(page), `url ${page.url().replace(BASE, "")}`);
    }
    const both = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="wallet-balance-pill"]');
      const num = (t) => { const m = /([\d,]{2,})/.exec(t ?? ""); return m ? Number(m[1].replace(/,/g, "")) : null; };
      const main = document.querySelector("main")?.innerText ?? "";
      const avail = /AVAILABLE\s*\n?\s*TZS\s*([\d,]+)/i.exec(main);
      return { pill: num(el?.getAttribute("aria-label")), available: avail ? Number(avail[1].replace(/,/g, "")) : null };
    });
    rec.check("8: ★★ ALI'S SENTENCE · the navbar figure and the wallet page's own AVAILABLE figure are the SAME number, on one screen, after a soft navigation",
      both.pill !== null && both.pill === both.available,
      `navbar ${both.pill} · wallet AVAILABLE ${both.available} · database ${afterSettle.balance}`);
    rec.check("8: ★ …and both are the DATABASE's figure, not merely equal to each other",
      both.pill === afterSettle.balance && both.available === afterSettle.balance,
      `db ${afterSettle.balance} · navbar ${both.pill} · page ${both.available}`);
    await shot(page, "e70-settled-wallet-vs-navbar");
    rec.note(`CLOSE: balance ${afterSettle.balance} · bonus ${afterSettle.bonus} · position ${settledRow.status} payout ${settledRow.payout}`);
  } finally { await ctx.close(); await b.close(); }
}

const CMDS = { legal, balance, settled };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
try { await CMDS[CMD](); } finally { await sql.end(); }
rec.done();
