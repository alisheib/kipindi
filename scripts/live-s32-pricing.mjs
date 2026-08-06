/**
 * E-109 · D2 DRIVEN ON PRODUCTION — is the number on the card the number the money path pays?
 *
 *   SHOT_DIR=.qa-s32 node scripts/live-s32-pricing.mjs
 *
 * ⛔ THE CLAIM THIS EXISTS TO TEST CANNOT BE TESTED BY THE PRODUCT ALONE. Reading the card's
 * `× N` and comparing it to the pool the same page renders is circular — both come from the
 * server I just changed. So the browser half reads the card, and a SECOND, independent half
 * reads `yesPool` / `noPool` / `feeSnapshot` straight out of production Postgres and recomputes
 * the figure with `payoutFor`. The check is that the two agree.
 *
 * ⭐ AND IT DRIVES A REAL BET, because the defect is invisible on a two-sided round. The old
 * card printed `× 1.5` on both buttons; the new one must print numbers that DIFFER once one
 * side has money. A one-sided stake is refunded in full at settlement (E-65), so this costs
 * nothing but proves the thing.
 *
 * ⚠️ It bets on whichever chain the board is actually serving. The 15m chains belong to another
 * operator — placing a PLAYER bet on them is playing the game, not editing their chain, and it
 * is the only way to observe the surface a player sees.
 */
import { browser, login, recorder, BASE, SHOT } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";
import { payoutFor } from "../src/lib/payout.ts";
import { mkdirSync } from "node:fs";

// ⛔ THE STAKE IS THE CARD'S, NOT A CONSTANT — AND ASSUMING IT COST THIS RUN TWO FALSE
// FAILURES. The first version hardcoded 1,000 "the platform floor", priced the expected
// multiplier at that, and reported the DOWN button as wrong (card 1.74 vs "truth" 1.33). The
// card was right: the live global `minStake` is **500**, so the default preset — and the bet
// actually placed — was 500, and the two figures were answers to two different questions.
// A pari-mutuel multiplier is a function OF the stake; comparing one computed at a different
// stake is not a comparison. Ask the page which amount it is pricing.
// ⚠️ THE BOARD DEFAULTS TO THE SHORTEST DURATION, AND OURS IS STOPPED. `getBoard` picks
// `durations[0]` — BTC 5m, the campaign's own chain, which carries no open round — so the
// default board shows one SETTLED card and no bet buttons at all. The running chains are the
// 15m ones. Name the duration rather than trusting a default that depends on whose chain sorts
// first: that is the same "it only worked because BTC happened to sort first" luck `getBoard`
// already documents.
const DURATION = process.env.DURATION ?? "15";
const BOARD = `${BASE}/updown?d=${DURATION}`;
const PLAYER = process.env.PLAYER ?? "fleet:01";
const r = recorder("E-109 · D2 on production — the card's multiplier against the money path's own");
mkdirSync(SHOT, { recursive: true });

/**
 * The BETTABLE card, not merely the first one.
 *
 * ⛔ THE BOARD RENDERS UP TO THREE CARDS — the live round, one still confirming, and the last
 * settled one — and `.first()` is whichever the layout puts first. A settled card has no bet
 * buttons and no multiplier, so a run scoped to it reports "no × on the card" about a screen
 * that is working perfectly. Scope to the card that carries the control under test (standards
 * §5b rule 4: the control's presence IS the state).
 */
const BETTABLE = (page) =>
  page.locator("article.mcardp").filter({ has: page.getByRole("button", { name: /^(up|juu)/i }) }).first();

/** Wait until a bettable card has rendered its multiplier — the thing being measured. */
async function waitForCard(page) {
  await page.waitForSelector("article.mcardp", { timeout: 45_000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll("article.mcardp")].some((c) => /×\s*[\d.]/.test(c.innerText)),
    null, { timeout: 45_000 },
  );
}

/** The card, as a player sees it: the two buttons' multiples and the empty-side sentence. */
async function readCard(page) {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll("article.mcardp")]
      .find((c) => [...c.querySelectorAll("button")].some((b) => /^\s*(up|juu)/i.test(b.innerText)));
    if (!card) return null;
    const txt = (el) => (el?.innerText ?? "").replace(/\s+/g, " ").trim();
    // ⛔ SCOPE TO THE CARD, and to each BUTTON inside it. A page-wide `× ` match cannot tell
    // "the Up button's multiple" from "some multiple somewhere", which is check 5b.4 of the
    // standards skill and has cost this campaign a near-miss on a money write.
    const btns = [...card.querySelectorAll("button")];
    const pick = (re) => {
      const b = btns.find((x) => re.test(x.innerText));
      const m = b && b.innerText.match(/×\s*([\d.]+)/);
      return m ? Number(m[1]) : null;
    };
    return {
      up: pick(/^\s*(up|juu|涨)/i),
      down: pick(/^\s*(down|chini|跌)/i),
      body: txt(card).toLowerCase(),
      href: card.getAttribute("aria-label") ?? "",
    };
  });
}

const { b, ctx } = await browser({ viewport: { width: 1280, height: 1400 } });
const page = await ctx.newPage();
const db = await connect();
let exitCode = 1;
try {
  await login(page, PLAYER);
  await page.goto(BOARD, { waitUntil: "domcontentloaded" });
  await waitForCard(page);

  // The round the board is actually serving, so the DB half reads the SAME round the browser
  // half photographed — not "the newest row", which is a different round the moment a chain
  // ticks over mid-run.
  //
  // ⚠️ IT IS NOT IN THE MARKUP. The card is `role="link"` with an `onClick` that calls
  // `router.push` — there is no `href` and no id attribute anywhere in its HTML, so the obvious
  // `outerHTML.match(/udr_/)` returns null and reads exactly like "no round on the board".
  // Ask the product where the card goes instead: click its heading (which bubbles to the
  // article, not to a bet button) and read the URL it lands on.
  await BETTABLE(page).locator("h3").first().click();
  await page.waitForURL(/\/updown\/udr_/, { timeout: 30_000 });
  const roundId = page.url().match(/udr_[0-9a-z]+/)?.[0] ?? null;
  await page.goto(BOARD, { waitUntil: "domcontentloaded" });
  await waitForCard(page);
  r.check("the board is serving a round and it identifies itself", !!roundId, String(roundId));
  if (!roundId) throw new Error("no round on the board — cannot measure anything");
  r.note(`round ${roundId}`);

  const truth = async () => {
    const { rows } = await db.query(
      `select m."yesPool", m."noPool", m."feeSnapshot"
         from "UpDownRound" rd join "PredictionMarket" m on m.id = rd."marketId"
        where rd.id = $1`, [roundId]);
    return rows[0];
  };
  /** What `payoutFor` — the function settlement pays with — returns for these pools. */
  const expect = (row, side, stake) => {
    const rates = row.feeSnapshot ?? {};
    const p = payoutFor(
      { yesPool: Number(row.yesPool), noPool: Number(row.noPool), side: side === "UP" ? "YES" : "NO", stake },
      rates,
    ).payout;
    return p / stake;
  };
  /** The stake the card is pricing, read off the button's own accessible name. */
  const cardStake = async () => {
    const label = await BETTABLE(page).getByRole("button", { name: /^(up|juu)/i }).first().getAttribute("aria-label");
    // ⚠️ Written with an editor, not through a shell heredoc — the first attempt lost a
    // backslash layer and shipped `/([d,]+)s*$/`, which matched nothing and reported "the Up
    // button names no stake" over a label that plainly read `TZS 500`.
    const m = (label ?? "").match(/TZS\s*([\d,]+)/i);
    if (!m) throw new Error(`the Up button names no stake: "${label}"`);
    return Number(m[1].replace(/,/g, ""));
  };
  /** The card FLOORS to 2dp under ten, 1dp under a hundred — so compare like for like. */
  const shown = (m) => {
    const d = m >= 100 ? 0 : m >= 10 ? 1 : 2;
    const f = 10 ** d;
    return Math.floor(m * f + 1e-9) / f;
  };

  // ── BEFORE ────────────────────────────────────────────────────────────────
  const before = await readCard(page);
  const row0 = await truth();
  const stake0 = await cardStake();
  r.note(`the card is pricing a stake of TZS ${stake0}`);
  r.note(`DB pools before: UP ${row0.yesPool} · DOWN ${row0.noPool}`);
  r.note(`card before: up × ${before.up} · down × ${before.down}`);
  await BETTABLE(page).screenshot({ path: `${SHOT}/e109-before.png` });

  // ⛔ THE DEFECT, STATED AS A NUMBER. 1.5 was the constant on both buttons for the whole
  // life of this product. Seeing it here would mean the deploy did not take.
  r.check("neither button still prints the old flat 1.5",
    before.up !== 1.5 || before.down !== 1.5, `up ${before.up} down ${before.down}`);
  r.check("the UP button's figure is what payoutFor would pay for the live pool",
    before.up === shown(expect(row0, "UP", stake0)), `card ${before.up} vs money path ${shown(expect(row0, "UP", stake0))}`);
  r.check("…and the DOWN button's",
    before.down === shown(expect(row0, "DOWN", stake0)), `card ${before.down} vs money path ${shown(expect(row0, "DOWN", stake0))}`);

  const emptyBefore = Number(row0.yesPool) <= 0 && Number(row0.noPool) <= 0;
  if (emptyBefore) {
    r.check("an untouched round says so in words, before the bet",
      /no bets yet|hakuna dau bado|目前尚无投注/.test(before.body), before.body.slice(0, 160));
    r.check("…and quotes 1.00× on both sides, which is exactly what an untouched round returns",
      before.up === 1 && before.down === 1, `up ${before.up} down ${before.down}`);
  } else {
    r.note("round already carries a stake — the empty-round copy is not on this screen");
  }

  // ── THE BET — real money, on the live board ───────────────────────────────
  const card = BETTABLE(page);
  await card.getByRole("button", { name: /^(up|juu)/i }).first().click();
  // ⛔ Wait for the money to be acknowledged, not for a timer. The success toast names the
  // side and the amount (E-64); waiting on it is waiting on the server's answer.
  await page.getByText(/bet placed|dau limewekwa/i).first().waitFor({ timeout: 30_000 });
  // ⛔ `r.check(name, true)` IS NOT A CHECK, and the first version of this line was one — it
  // also named an amount (1,000) that was not the amount staked (500). The toast having
  // appeared is the product's claim; the DB row below is the verification, so the two are
  // recorded as one assertion rather than a congratulation followed by a fact.
  r.note(`placed a real TZS ${stake0} UP bet on ${roundId}`);

  // The board reconciles on its own poller; a reload reads server truth immediately.
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForCard(page);

  // ── AFTER ─────────────────────────────────────────────────────────────────
  const after = await readCard(page);
  const row1 = await truth();
  const stake1 = await cardStake();
  r.note(`DB pools after: UP ${row1.yesPool} · DOWN ${row1.noPool}`);
  r.note(`card after: up × ${after.up} · down × ${after.down}`);
  await BETTABLE(page).screenshot({ path: `${SHOT}/e109-after.png` });

  r.check("the stake reached the pool, to the shilling",
    Number(row1.yesPool) - Number(row0.yesPool) === stake0,
    `${row0.yesPool} → ${row1.yesPool}, expected +${stake0}`);
  // ⭐ THE WHOLE POINT. One round, two sides, two different numbers — which the flat constant
  // could not do however lopsided the pool became.
  r.check("the two buttons now quote DIFFERENT multiples", after.up !== after.down,
    `up ${after.up} down ${after.down}`);
  r.check("the side that has the money returns about the stake", after.up != null && after.up < 1.05,
    `up × ${after.up}`);
  r.check("the empty side is worth strictly more than the side holding the money",
    after.down != null && after.up != null && after.down > after.up,
    `up × ${after.up} · down × ${after.down}`);
  r.check("the UP figure still equals the money path's",
    after.up === shown(expect(row1, "UP", stake1)), `card ${after.up} vs ${shown(expect(row1, "UP", stake1))}`);
  r.check("…and the DOWN figure still equals the money path's",
    after.down === shown(expect(row1, "DOWN", stake1)), `card ${after.down} vs ${shown(expect(row1, "DOWN", stake1))}`);
  r.check("the card now names the side nobody has backed",
    /nobody has backed down|hakuna aliyeweka dau chini|目前还没有人投注跌/.test(after.body),
    after.body.slice(0, 200));
  r.check("…and says what happens if that does not change",
    /stake comes back|dau lako litarudi|全额退回/.test(after.body));
  r.check("the note tells the player the figure moves",
    /moves with every bet|hubadilika kwa kila dau|随每一笔新投注变动/.test(after.body));

  exitCode = r.done() === 0 ? 0 : 1;
} catch (e) {
  console.error(`\n🔴 ${e.message}\n`);
  r.done();
} finally {
  await db.end().catch(() => {});
  await b.close();
}
process.exit(exitCode);
