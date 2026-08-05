/**
 * SESSION 28 · THE MONEY, AT A REAL POOL SIZE, WITH A REAL FLEET.
 *
 * Session 27's biggest miss, in Ali's own words: the whole campaign was driven on TWO
 * players, so 10 of 17 rounds took no bets and exactly ONE paid a winner. Two wallets
 * cannot test any of this:
 *
 *   · the pari-mutuel split across MORE THAN TWO positions;
 *   · the fee at a real pool size — and `min(13%·pool, 1/3·smaller)` has TWO branches,
 *     so one pool shape only ever exercises one of them;
 *   · concurrency on a single market (this bets in parallel batches on purpose);
 *   · the difference between "nobody is here" and "the thin side is thin".
 *
 *   node scripts/live-s28-money.mjs <balanced|lopsided> <roundId>
 *
 * ⛔ ONE BROWSER CONTEXT PER PLAYER. A shared cookie jar makes /auth/login redirect and the
 * missing field reads exactly like a broken login page.
 * ⚠️ THE FLEET IS TRILINGUAL BY CONSTRUCTION (`ops-qa-fleet.mts` spreads EN/SW/ZH), so every
 * accessible name here is a three-locale union. That is deliberate: an all-English fleet
 * cannot surface a Swahili or Chinese rendering bug, and this platform ships three languages.
 */
import { mkdirSync } from "node:fs";
import { BASE, SHOT, login, browser } from "./live/harness.mjs";

const [PLAN, ROUND] = process.argv.slice(2);

/**
 * Two pool shapes, chosen so the fee formula's TWO branches are both exercised.
 * `fee = min(commissionRate·pool, feeCeilingRate·smallerSide)` — 13% and 1/3 on this platform.
 *
 *   balanced  UP 12,500 (5 players) · DOWN 14,500 (7) · pool 27,000
 *             13%·27,000 = 3,510   vs   1/3·12,500 = 4,166  ->  THE 13% BINDS
 *   lopsided  UP  1,000 (1 player) · DOWN 26,000 (7) · pool 27,000
 *             13%·27,000 = 3,510   vs   1/3· 1,000 =   333  ->  THE CEILING BINDS
 *
 * ⭐ The ceiling is the branch that protects a thin side from being taxed out of existence,
 * and it has never been driven on production with real money.
 */
const PLANS = {
  balanced: [
    { nn: "05", side: "UP",   stake: 1000 }, { nn: "06", side: "UP",   stake: 2000 },
    { nn: "07", side: "UP",   stake: 3000 }, { nn: "08", side: "UP",   stake: 5000 },
    { nn: "09", side: "UP",   stake: 1500 },
    { nn: "10", side: "DOWN", stake: 1000 }, { nn: "11", side: "DOWN", stake: 4000 },
    { nn: "12", side: "DOWN", stake: 2000 }, { nn: "13", side: "DOWN", stake: 1000 },
    { nn: "14", side: "DOWN", stake: 3000 }, { nn: "15", side: "DOWN", stake: 2500 },
    { nn: "16", side: "DOWN", stake: 1000 },
  ],
  lopsided: [
    { nn: "05", side: "UP",   stake: 1000 },
    { nn: "06", side: "DOWN", stake: 5000 }, { nn: "07", side: "DOWN", stake: 4000 },
    { nn: "08", side: "DOWN", stake: 3000 }, { nn: "09", side: "DOWN", stake: 6000 },
    { nn: "10", side: "DOWN", stake: 2000 }, { nn: "11", side: "DOWN", stake: 4000 },
    { nn: "12", side: "DOWN", stake: 2000 },
  ],
};

if (!PLANS[PLAN] || !ROUND) {
  console.error("usage: node scripts/live-s28-money.mjs <balanced|lopsided> <roundId>");
  process.exit(2);
}
mkdirSync(SHOT, { recursive: true });

const BETS = PLANS[PLAN];
const UP = /^(Up|Juu|涨)\s*[—-]/;
const DOWN = /^(Down|Chini|跌)\s*[—-]/;
const CUSTOM = /^(Custom|Maalum|自定义)$/;
const CUSTOM_AMOUNT = /custom stake amount|kiasi maalum cha dau|自定义投注额/i;

/** Sign one fleet player in and leave them parked, ready to bet the instant we say go. */
async function arm(ctx, nn) {
  const page = await ctx.newPage();
  await login(page, `fleet:${nn}`);
  return page;
}

/** Place ONE stake, with the exact amount, and prove the money moved rather than a toast. */
async function bet(page, { nn, side, stake }) {
  await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
  // The positive signal that a round card has actually RENDERED: a price with real decimals.
  // Skeletons carry no digits, and `networkidle` never fires because the board polls.
  await page.waitForFunction(() => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText),
    undefined, { timeout: 60_000 });

  // ⭐ A CUSTOM AMOUNT, NOT A PRESET. Varied stakes are the whole point — a pari-mutuel
  // split across equal stakes cannot tell a proportional payout from a flat one.
  await page.getByRole("radio", { name: CUSTOM }).first().click();
  const field = page.getByLabel(CUSTOM_AMOUNT).first();
  await field.waitFor({ state: "visible", timeout: 15_000 });
  await field.fill(String(stake));

  const btn = page.getByRole("button", { name: side === "UP" ? UP : DOWN }).first();
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  // ⛔ ASSERT THE CONTROL CARRIES THE AMOUNT BEFORE PRESSING IT. The side button's accessible
  // name ends `· TZS 3,000` only once the stake is READY; clicking a disabled control and
  // reporting "placed" is exactly how a run measures nothing and photographs like a success.
  const label = (await btn.getAttribute("aria-label")) ?? "";
  const armed = new RegExp(String(stake).replace(/\B(?=(\d{3})+(?!\d))/g, ",")).test(label);
  if (!armed) throw new Error(`fleet:${nn} — side control does not carry ${stake}: "${label}"`);
  await btn.click();

  const ok = await page.waitForFunction(
    () => /you're in|uko ndani|已下注/i.test(document.body.innerText),
    undefined, { timeout: 30_000 },
  ).then(() => true).catch(() => false);
  return { nn, side, stake, ok, label };
}

const { b, ctx: _unused } = await browser();
const results = [];
try {
  // ⚠️ ARM IN PARALLEL, BECAUSE THE BETTING WINDOW IS THE CONSTRAINT. A 5-minute round gives
  // 5 minutes of betting; twelve sequential sign-ins at ~10s each would eat half of it and a
  // slow one would push the last bets past the lock — which reads as "the control was gone"
  // and is really the harness being late. Sign-in is not what is under test here.
  console.log(`\n── arming ${BETS.length} fleet players (one context each, in parallel) ──`);
  const armed = [];
  for (let i = 0; i < BETS.length; i += 4) {
    await Promise.all(BETS.slice(i, i + 4).map(async (spec) => {
      const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
      try {
        const page = await arm(c, spec.nn);
        armed.push({ spec, page });
        console.log(`   fleet:${spec.nn} signed in`);
      } catch (e) {
        console.log(`   ❌ fleet:${spec.nn} could not sign in — ${e.message.slice(0, 120)}`);
      }
    }));
  }

  // ⭐ IN PARALLEL BATCHES, ON ONE MARKET, ON PURPOSE. Sequential bets never contend for the
  // market row; this is the only way a live drive exercises the conditional update that stops
  // two writes double-spending a pool.
  console.log(`\n── betting on ${ROUND} — parallel batches of 4, on ONE market ──`);
  for (let i = 0; i < armed.length; i += 4) {
    const batch = armed.slice(i, i + 4);
    const out = await Promise.all(batch.map(({ page, spec }) =>
      bet(page, spec).catch((e) => ({ ...spec, ok: false, err: e.message.slice(0, 160) }))));
    for (const r of out) {
      results.push(r);
      console.log(`   fleet:${r.nn} ${String(r.side).padEnd(4)} ${String(r.stake).padStart(6)} ` +
        `${r.ok ? "PLACED" : "NOT PLACED"}${r.err ? ` — ${r.err}` : ""}`);
    }
  }

  const shot = armed.find((a) => a.spec.nn === BETS[0].nn);
  if (shot) await shot.page.locator("main").first()
    .screenshot({ path: `${SHOT}/s28-money-${PLAN}.png` }).catch(() => {});
} finally {
  await b.close();
}

const placed = results.filter((r) => r.ok);
const up = placed.filter((r) => r.side === "UP").reduce((s, r) => s + r.stake, 0);
const down = placed.filter((r) => r.side === "DOWN").reduce((s, r) => s + r.stake, 0);
console.log(`\n  placed ${placed.length}/${BETS.length}  ·  UP ${up.toLocaleString()} (${placed.filter((r) => r.side === "UP").length})  ·  DOWN ${down.toLocaleString()} (${placed.filter((r) => r.side === "DOWN").length})  ·  pool ${(up + down).toLocaleString()}`);
const smaller = Math.min(up, down);
console.log(`  predicted fee = min(13%·${(up + down).toLocaleString()} = ${Math.floor(0.13 * (up + down)).toLocaleString()}, ⅓·${smaller.toLocaleString()} = ${Math.floor(smaller / 3).toLocaleString()}) = ${Math.min(Math.floor(0.13 * (up + down)), Math.floor(smaller / 3)).toLocaleString()}`);
process.exit(placed.length === BETS.length ? 0 : 1);
