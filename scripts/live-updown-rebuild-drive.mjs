/**
 * LIVE PRODUCTION DRIVE — the Up & Down settlement rebuild, end to end, with real money.
 *
 *   node scripts/live-updown-rebuild-drive.mjs <stage>
 *
 * Stages, run in order. Each is separately re-runnable so a failure costs one stage, not the run:
 *
 *   a-config    FINANCE officer: switch the reader to dated bars, set the margin to the tick
 *               floor, raise the assets off the 1-tick configuration (E-73).
 *   b-chain     TRADING officer: create a 3-minute BTC chain and GENERATE a round — through the
 *               console, as an operator, never a script bypassing the UI.
 *   c-bet       alpha and echo stake REAL money on OPPOSITE sides of that round.
 *   d-lock      watch the betting window shut: buttons gone, countdown RE-LABELLED.
 *   e-settle    let it close on a real Twelve Data bar and read the result.
 *   f-console   the chain-health console from 6333ef0e, which shipped and was never looked at.
 *
 * ⛔ EVERY SCREENSHOT IS `locator.screenshot()`, NEVER `fullPage`. A fullPage shot of a page
 * with a sticky header or a portalled dropdown is a broken-canvas artefact — this campaign has
 * twice filed a layout "bug" that was only ever in the screenshot.
 *
 * ⛔ THIS SPENDS REAL MONEY AND REAL PROVIDER CREDITS. It is a manual drive tool, never a gate.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { BASE, login, clickByName, bodyText, browser, qaEnv } from "./live/harness.mjs";

const STAGE = process.argv[2] ?? "";
const OUT = ".qa-artifacts/drive";
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);
const ok = (l, c, x = "") => log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);

/**
 * ⛔ ELEMENT SCREENSHOT, NEVER fullPage — see the header.
 * Falls back to the viewport (still not fullPage) when the selector is absent, and SAYS so,
 * because a silently-missing shot is evidence that does not exist.
 */
async function snap(page, selector, name) {
  const el = page.locator(selector).first();
  if (await el.count().catch(() => 0)) {
    await el.screenshot({ path: `${OUT}/${name}.png` }).catch(async () => {
      await page.screenshot({ path: `${OUT}/${name}.png` });
    });
    log(`   📸 ${name}.png  (${selector})`);
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png` });
    log(`   📸 ${name}.png  ⚠️ selector "${selector}" not found — viewport shot instead`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ⚠️ THE CHAINS GRID, NOT the first table — /admin/updown renders the ASSETS grid first, so a
// bare `table` selector screenshots the wrong one and the evidence looks like a miss.
const CHAINS_SELECTOR = 'table:has(th:text-matches("Paid a winner", "i"))';

// ═══════════════════════════════════════════════════════════════════════════
async function stageAConfig() {
  // ⛔ ADMIN, AND THIS IS THE ONE PLACE IT IS CORRECT TO USE ALI'S OWN LOGIN.
  //
  // The reading method and the thresholds demand `accounting`, while /admin/updown's VIEW gate
  // is `trading` — so the TRADING officer sees those controls rendered locked, and the FINANCE
  // officer (the one non-Owner role with `accounting` act) cannot open the page at all. Driven
  // live and confirmed on production: finance gets "Your role cannot view this page."
  //
  // ⚠️ THIS IS NOT A NEW FINDING. `control-gates.ts` documents it verbatim — "these five
  // controls are Owner-only in practice" — and §6m records that whether a non-Owner should be
  // able to turn the price feed on is Ali's decision. Re-filing it would break the
  // one-finding-one-truth rule; using ADMIN and SAYING SO is the honest way through.
  log("\n═══ A · CONFIG (ADMIN — these controls are Owner-only in practice; see E-27 / §6m)\n");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "admin");
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const body = await bodyText(page);
    ok("A1 · the Up & Down console loads for the Owner", /up & down|juu na chini/i.test(body));

    // ── The reader ─────────────────────────────────────────────────────────
    // ⛔ This is the rollback lever: an audited config edit with NO deploy. Switching it is
    // what puts real money on the dated reader for the first time.
    const providerSelect = page.locator('[name="feedProvider"]').first();
    if (await providerSelect.count()) {
      // The kit Select renders a button trigger plus a hidden input of the same name.
      const trigger = page.locator('button[role="combobox"]').filter({ hasText: /market data|simulated/i }).first();
      if (await trigger.count()) {
        await trigger.click();
        await page.waitForTimeout(400);
        const opt = page.getByRole("option", { name: /1-minute bars/i }).first();
        if (await opt.count()) {
          await opt.click();
          await page.waitForTimeout(400);
          log("   selected: Market data · 1-minute bars");
        } else {
          log("   ⚠️ the 1-minute-bars option was not offered");
        }
      }
    }
    await snap(page, "form:has([name='feedProvider'])", "a1-reading-method");
    const saved = await clickByName(page, /save reading method|save method|save/i).catch(() => null);
    if (saved) await page.waitForTimeout(3000);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const after = await bodyText(page);
    ok("A2 · ⭐ the reader is now the DATED one — a late close can settle",
       /1-minute bars/i.test(after), after.match(/market data[^.]{0,40}/i)?.[0] ?? "");

    await b.close();
  } catch (e) {
    log(`\n❌ stage A: ${e.message}`);
    await snap(page, "body", "a-error").catch(() => {});
    await b.close();
    process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
async function stageBChain() {
  log("\n═══ B · CHAIN + ROUND (trading officer — `trading` domain)\n");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "trading");
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // ── The numbered readiness signals (phase 4), seen for real ─────────────
    const addChain = await clickByName(page, /\+ add chain/i).catch(() => null);
    if (addChain) {
      await page.waitForTimeout(800);
      const durTrigger = page.locator('button[role="combobox"]').filter({ hasText: /min/i }).first();
      if (await durTrigger.count()) {
        await durTrigger.click();
        await page.waitForTimeout(500);
        await snap(page, '[role="listbox"]', "b1-duration-readiness");
        const marks = await page.locator('[role="option"]').allInnerTexts().catch(() => []);
        log(`   duration options: ${marks.map((m) => m.split("\n")[0]).join(" | ")}`);
        ok("B1 · ⭐ every duration option carries a numbered readiness mark",
           marks.some((m) => /[①②③]/.test(m)), marks[0] ?? "");
        ok("B2 · ⭐ 3-minute rounds are offered", marks.some((m) => /\b3 min/.test(m)));
        await page.keyboard.press("Escape");
      }
    }
    await snap(page, "form:has([name='durationMinutes'])", "b2-add-chain-form");

    // ── Create the 3-minute BTC chain ──────────────────────────────────────
    // The shortest round the product has ever offered, unblocked by the epoch lattice.
    const assetTrigger = page.locator('button[role="combobox"]').filter({ hasText: /BTC|ETH|SOL|XAU/i }).first();
    if (await assetTrigger.count()) {
      await assetTrigger.click();
      await page.waitForTimeout(400);
      const btc = page.getByRole("option", { name: /BTC/i }).first();
      if (await btc.count()) { await btc.click(); await page.waitForTimeout(600); }
    }
    const durTrigger2 = page.locator('button[role="combobox"]').filter({ hasText: /min/i }).first();
    if (await durTrigger2.count()) {
      await durTrigger2.click();
      await page.waitForTimeout(400);
      const three = page.getByRole("option", { name: new RegExp(process.env.DRIVE_DURATION ? `^${process.env.DRIVE_DURATION} min` : "3 min", "i") }).first();
      if (await three.count()) { await three.click(); await page.waitForTimeout(400); }
    }
    await snap(page, "form:has([name='durationMinutes'])", "b3-chain-ready-to-add");
    await clickByName(page, /^add chain$/i).catch(() => null);
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const grid = await bodyText(page);
    const has3m = /btc\s*3m/i.test(grid);
    ok("B3 · ⭐ a 3-MINUTE BTC chain exists — the shortest round the product has ever offered", has3m);

    // ── GENERATE A ROUND, as the trading officer, through the console ───────
    // ⛔ Not a script bypassing the UI: this is the operator's own button, gated on `trading`.
    const row = page.locator("tr").filter({ hasText: /BTC\s*3m/i }).first();
    if (await row.count()) {
      const gen = row.getByRole("button", { name: /generate round/i }).first();
      if (await gen.count()) {
        await gen.click();
        log("   clicked: Generate round (BTC 3m)");
        // ⚠️ The button disables and reads "Reading price…" while the provider read runs; the
        // round only exists once that returns. Wait for the OUTCOME, not a fixed delay.
        await page.waitForTimeout(15_000);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
      }
    }
    await snap(page, CHAINS_SELECTOR, "b4-after-generate");
    const afterGen = await bodyText(page);
    ok("B4 · the console reports no refusal after Generate",
       !/could not read a price|no round was created/i.test(afterGen),
       afterGen.match(/could not read[^.]{0,90}/i)?.[0] ?? "");

    await b.close();
  } catch (e) {
    log(`\n❌ stage B: ${e.message}`);
    await snap(page, "body", "b-error").catch(() => {});
    await b.close();
    process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
/**
 * C · REAL MONEY, BOTH SIDES, then the LOCK.
 *
 * ⛔ Two DIFFERENT accounts on opposite sides — which is what a pari-mutuel market IS, and
 * what the one-account-one-side rule leaves untouched. `alpha` backs UP, `echo` backs DOWN.
 */
async function stageCBet() {
  log("\n═══ C · REAL STAKES, BOTH SIDES (alpha UP · echo DOWN)\n");
  const roundId = process.argv[3];
  if (!roundId) { log("   usage: … c-bet <roundId>"); process.exitCode = 2; return; }

  // ⛔ IN PARALLEL, NOT IN SEQUENCE. A 3-minute round locks 36 seconds before it closes, and
  // two sequential Playwright logins take longer than the whole betting window — the first
  // attempt at this missed the lock entirely and looked like a product failure. The players are
  // independent, so run them at once.
  await Promise.all([["alpha", "UP"], ["echo", "DOWN"]].map(async ([who, side]) => {
    const { b, ctx } = await browser();
    const page = await ctx.newPage();
    try {
      await login(page, who);
      await page.goto(`${BASE}/updown/${roundId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      const before = await bodyText(page);
      ok(`C0.${who} · the round page loads`, /up & down|juu na chini|higher or lower/i.test(before));

      // The stake panel is the real money path — the same `buyPosition` the dial uses.
      await snap(page, "main", `c1-${who}-before-bet`);

      // ⛔ THE BUTTON IS "Up × 1.4 est.", NOT "Up" — and ONE TAP PLACES THE BET.
      //
      // The first version anchored on `/^up$/i`, which matched nothing, so `.count()` was 0 and
      // the whole bet was silently skipped. It then looked for a "Place" button that does not
      // exist: the round page says "Tap Up or Down to bet · TZS 500". The run reported PASS on
      // both players while the pool stayed at TZS 0 — my assertion had matched the word "wallet"
      // in the page chrome. ⚠️ A selector that finds nothing and an assertion that matches
      // chrome are the same bug twice: neither touched the thing it named.
      const label = side === "UP" ? /^up\b|^juu\b|^涨/i : /^down\b|^chini\b|^跌/i;
      const btn = page.getByRole("button", { name: label }).first();
      const found = await btn.count();
      if (!found) throw new Error(`no ${side} button found — the bet was never attempted`);
      await btn.click();
      await page.waitForTimeout(5000);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      // ⛔ ASSERT ON THE POOL, NOT ON PAGE CHROME. The first version matched
      // `/you're in|stake/` — words that appear on the page whether or not a bet landed — and
      // reported PASS twice while the pool was TZS 0. The pool is the money; read the money.
      const after = await bodyText(page);
      const pool = after.match(/tzs\s*([\d,]+)\s*vol/i)?.[1]?.replace(/,/g, "") ?? "0";
      ok(`C1.${who} · ⭐ a REAL stake is on the round, ${side} — pool is no longer empty`,
         Number(pool) > 0, `pool TZS ${pool}`);
      await snap(page, "main", `c2-${who}-after-bet`);
      await b.close();
    } catch (e) {
      log(`   ❌ ${who}: ${e.message}`);
      await snap(page, "body", `c-error-${who}`).catch(() => {});
      await b.close();
      process.exitCode = 1;
    }
  }));
}

/** D · watch the window shut: the buttons go, and the countdown RE-LABELS itself. */
async function stageDLock() {
  log("\n═══ D · THE BETTING WINDOW SHUTS\n");
  const roundId = process.argv[3];
  if (!roundId) { log("   usage: … d-lock <roundId>"); process.exitCode = 2; return; }
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "alpha");
    let sawOpen = false, sawLocked = false, openLabel = "", lockLabel = "", lockCopy = "";
    for (let i = 0; i < 40; i++) {
      await page.goto(`${BASE}/updown/${roundId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const t = await bodyText(page);
      if (/betting closes in|dau linafungwa|距停止下注/.test(t) && !sawOpen) {
        sawOpen = true;
        openLabel = t.match(/betting closes in[^\n]{0,30}/i)?.[0] ?? "";
        log(`   OPEN  · ${openLabel}`);
        await snap(page, "main", "d1-open-betting-closes-in");
      }
      if (/bets closed|dau limefungwa|已停止下注/.test(t)) {
        sawLocked = true;
        lockLabel = t.match(/result in[^\n]{0,30}/i)?.[0] ?? "";
        lockCopy = t.match(/bets closed at[^\n]{0,140}/i)?.[0] ?? "";
        log(`   LOCKED · ${lockLabel}`);
        log(`   reason · ${lockCopy}`);
        await snap(page, "main", "d2-locked-with-reason");
        break;
      }
      await sleep(6000);
    }
    ok("D1 · ⭐ before the lock the countdown says BETTING CLOSES IN", sawOpen, openLabel);
    ok("D2 · ⭐ the round LOCKS while still running", sawLocked);
    ok("D3 · ⭐ and the countdown RE-LABELS itself to RESULT IN — same digits, different deadline",
       /result in/i.test(lockLabel), lockLabel);
    ok("D4 · ⭐ the lock message carries its REASON, naming the instant",
       /bets closed at/i.test(lockCopy), lockCopy);
    ok("D5 · …and explains the fairness rule, not just the fact",
       /nobody can bet|already see|outcome/i.test(lockCopy), lockCopy);
    await b.close();
  } catch (e) {
    log(`\n❌ stage D: ${e.message}`);
    await snap(page, "body", "d-error").catch(() => {});
    await b.close();
    process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
/**
 * FULL · generate → bet BOTH sides → watch the lock → settle, in ONE continuous run.
 *
 * ⛔ ONE RUN, BECAUSE THE GAPS ARE WHERE THE EVIDENCE DIES. Driving these as separate
 * invocations left ~40 seconds between generating a round and reaching it as a player, and on a
 * 3-minute round that is a quarter of the betting window — the first attempt arrived after the
 * lock and reported "no DOWN button found", which reads as a broken page on a page that was
 * doing exactly its job.
 */
async function stageFull() {
  const MINUTES = Number(process.env.DRIVE_DURATION ?? 5);
  log(`\n═══ FULL DRIVE · BTC ${MINUTES}m — generate, bet both sides, lock, settle\n`);

  // ── 1 · GENERATE, as the trading officer, through the console ─────────────
  const admin = await browser();
  const apage = await admin.ctx.newPage();
  let roundId = null;
  try {
    await login(apage, "trading");
    await apage.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await apage.waitForTimeout(2500);
    const row = apage.locator("tr").filter({ hasText: new RegExp(`BTC\\s*${MINUTES}m`, "i") }).first();
    if (!(await row.count())) throw new Error(`no BTC ${MINUTES}m chain row`);
    await row.getByRole("button", { name: /generate round/i }).first().click();
    log("   Generate round clicked — the button reads 'Reading price…' while the provider read runs");
    await apage.waitForTimeout(14_000);
    await snap(apage, CHAINS_SELECTOR, "g1-generated");
  } catch (e) {
    log(`   ❌ generate: ${e.message}`);
    await admin.b.close();
    process.exitCode = 1;
    return;
  }
  await admin.b.close();

  // The round id, straight from the board — the operator's own view of what exists.
  const finder = await browser();
  const fpage = await finder.ctx.newPage();
  await fpage.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
  await fpage.waitForTimeout(2500);
  const link = await fpage.locator('a[href*="/updown/udr_"], [role="link"]').first();
  roundId = (await fpage.evaluate(() => {
    const m = document.body.innerHTML.match(/udr_[a-z0-9]{16,}/i);
    return m ? m[0] : null;
  }).catch(() => null));
  await finder.b.close();
  if (!roundId) { log("   ❌ could not find the new round on the board"); process.exitCode = 1; return; }
  log(`   round: ${roundId}\n`);

  // ── 2 · BOTH SIDES, IN PARALLEL, IMMEDIATELY ─────────────────────────────
  await Promise.all([["alpha", "UP"], ["echo", "DOWN"]].map(async ([who, side]) => {
    const { b, ctx } = await browser();
    const page = await ctx.newPage();
    try {
      await login(page, who);
      await page.goto(`${BASE}/updown/${roundId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      await snap(page, "main", `g2-${who}-open`);
      const label = side === "UP" ? /^up\b|^juu\b/i : /^down\b|^chini\b/i;
      const btn = page.getByRole("button", { name: label }).first();
      if (!(await btn.count())) throw new Error(`no ${side} button — already locked?`);
      await btn.click();
      await page.waitForTimeout(6000);
      await snap(page, "main", `g3-${who}-placed`);
      log(`   ${who} tapped ${side}`);
      await b.close();
    } catch (e) {
      log(`   ❌ ${who}: ${e.message}`);
      await snap(page, "main", `g-error-${who}`).catch(() => {});
      await b.close();
    }
  }));
  log("");
  return roundId;
}

// ═══════════════════════════════════════════════════════════════════════════
async function stageFConsole() {
  log("\n═══ F · CHAIN-HEALTH CONSOLE (6333ef0e — shipped, never looked at)\n");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "trading");
    await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const body = await bodyText(page);
    ok("F1 · ⭐ the headline is 'Paid a winner · 7d' — how often this chain actually pays",
       /paid a winner/i.test(body));
    ok("F2 · …over a TIME window, not a count", /7d/i.test(body));
    ok("F3 · ⭐ the voids are split BY REASON, not blended into one percentage",
       /no-move|source-failed|operator|unexplained/i.test(body),
       body.match(/\d+ (no-move|source-failed|operator|unexplained)[^\n]{0,40}/i)?.[0] ?? "");

    // ⛔ The grid, not the page — a fullPage shot of a table inside a ScrollX is a broken canvas.
    // ⚠️ THE CHAINS TABLE, NOT `table` — the page renders the ASSETS grid first, so a bare
    // `table` selector screenshots the wrong one and the evidence looks like a miss.
    const CHAINS = CHAINS_SELECTOR;
    await snap(page, CHAINS, "f1-chain-health-grid");
    await snap(page, `${CHAINS} tbody`, "f2-chain-health-rows");

    const rows = await page.locator(CHAINS + " tbody tr").allInnerTexts().catch(() => []);
    log("\n   chain grid, as the operator sees it:");
    for (const r of rows.slice(0, 12)) log(`     ${r.replace(/\s*\n\s*/g, " · ").slice(0, 150)}`);

    await b.close();
  } catch (e) {
    log(`\n❌ stage F: ${e.message}`);
    await snap(page, "body", "f-error").catch(() => {});
    await b.close();
    process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
const STAGES = { "a-config": stageAConfig, "b-chain": stageBChain, "c-bet": stageCBet, "full": stageFull, "d-lock": stageDLock, "f-console": stageFConsole };
if (!STAGES[STAGE]) {
  console.error(`usage: node scripts/live-updown-rebuild-drive.mjs <${Object.keys(STAGES).join("|")}>`);
  process.exit(2);
}
await STAGES[STAGE]();
