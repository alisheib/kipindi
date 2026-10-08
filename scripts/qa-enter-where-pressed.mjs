#!/usr/bin/env node
/**
 * qa:enter-where-pressed — the real-browser half of `test:enter-where-pressed` (the Vodacom plan S6 A8i, 2026-10-06).
 *
 *   BASE=http://localhost:3061 npm run qa:enter-where-pressed
 *
 * Drives a LOCAL in-memory dev server as a keyboard player (the demo player, 100,000 TZS of local money) and reads the
 * WALLET on a page of its own, never the dialog, to say whether money moved — a dialog is evidence of intent, the
 * balance is evidence of fact.
 *
 *   A  bet confirm · Tab to Cancel, Enter                 → the confirm closes, no bet
 *   B  bet confirm · Shift+Tab to the ✕, Enter            → the confirm closes, no bet
 *   C  the dial · Enter HELD (auto-repeat)                → the confirm opens, no bet
 *   D  the dial · Space HELD (auto-repeat), released      → the confirm opens, no bet
 *   E  bet confirm · Enter where focus lands (Confirm)    → the bet is placed — the keyboard path still confirms
 *   F  the receipt · Tab to "View positions", Enter        → /positions, not the primary's board
 *   G  Sell confirm · Tab to "Keep position", Enter        → no sale
 *   H  Sell confirm with the win seal opened on top, Enter → the seal closes, no sale
 *   I  the Sell button · Enter HELD                       → the confirm opens, no sale
 *   J  Sell confirm · Enter where focus lands (Sell)      → the sale happens
 *
 *
 *   § A8i-2 (2026-10-07) — a key held down presses once, wherever it is; nothing behind the top dialog takes a key. Each
 *   of these counts the bets and sales the page SENDS (at the network) as well as reading the wallet:
 *   0b the arming beat is read from src/lib/modal-stack.ts; 0c the section's own ticket (J sold the drive's first)
 *   K1 Sell confirm · Tab to "Keep position", Enter HELD   → it closes and stays closed, no sale (proven red 2026-10-07)
 *   K2 bet confirm · Tab to Cancel, Enter HELD             → it closes and stays closed, no bet
 *   W2 the win seal over the Sell confirm · Enter, Enter 60 ms apart → the seal closes, the confirm stays with focus on
 *      its way out ("Keep position"), no sale (proven red 2026-10-07: the second Enter sold)
 *   SQ two win seals queued over the Sell confirm · Enter every ~60 ms through both → both shown, no sale
 *   ESC the win seal over the Sell confirm · one Escape    → only the seal closes; focus is back in the confirm
 *   DD the dial · Enter, Enter 100 ms apart               → the confirm opens, no bet
 *   SL the win seal over the bet confirm, its quote lapsing under the seal · Enter, Enter → no confirm reopens, no bet
 *   UD1 Up & Down · Enter HELD on a board card's UP        → exactly one bet
 *   UD2 Up & Down · the receipt, Enter HELD on "Keep playing" → it closes, and no further bet
 *   C, D and I also show their repeats reached the dialog, and H that the Sell confirm is still open under the seal.
 *
 * ⭐ IT IS ITS OWN RED CONTROL: on a server built from the tree before A8i, A B C D F G H I fail and E J pass; on the tree
 *   before A8i-2 (23f762f4 and later main), K1 K2 W2 ESC SQ DD SL UD1 UD2 fail and every other case passes. A case that
 *   cannot even be set up is BLOCKED, never a FAIL, so a control run cannot count one as proof. Each Sell case bets its own
 *   ticket by mouse when the player has none (`ensureTicket`), so a sale on the old tree never starves the next case.
 * ⛔ It refuses any host but localhost — it places and sells bets.
 */
import { readFileSync } from "node:fs";
import * as playwright from "playwright";

/** S6 A8i-2 · the engine: `ENGINE=webkit` (every iPhone browser) or `ENGINE=firefox`; Chromium by default. */
const ENGINE = process.env.ENGINE || "chromium";
if (!["chromium", "webkit", "firefox"].includes(ENGINE)) {
  console.error(`⛔ ENGINE must be chromium, webkit or firefox — got ${ENGINE}`);
  process.exit(2);
}

const BASE = (process.env.BASE || "http://localhost:3061").replace(/\/$/, "");
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) {
  console.error(`⛔ REFUSING ${BASE}: this drive places and sells bets, so it runs only against a local in-memory server.`);
  process.exit(2);
}
const STAKE = 1000;
const QUIET_MS = 900;

let pass = 0;
const fails = [];
/** S6 A8i-2 · cases that could not even be set up: never a FAIL of their own check, so a control run cannot mistake one
 *  for proof (on the tree before A8i-2, W2's sale used to leave ESC no ticket, and ESC "failed"). */
const blocked = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

/**
 * A8i-2's owed "reduced motion" (S6 WP12): `REDUCED_MOTION=1` runs every case with the OS asking for no motion. Then a
 * closing dialog unmounts at once (`exitBeatMs` is 0 under `prefers-reduced-motion`), so there is no leaving ghost, and
 * the cases built on the seal's exit (W2, SQ) meet the arming beat alone.
 */
const REDUCED = process.env.REDUCED_MOTION === "1";
const browser = await playwright[ENGINE].launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: REDUCED ? "reduce" : "no-preference" });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
// S6 A8i-2 · what the page SENDS, counted from the first case: a server action whose form carries a bet's idempotency key is
// a bet, one that names a ticket is a sale. Passive (`request`, not `route`): nothing is intercepted, and the dev bundles
// keep their cache. E is the bet counter's positive control and J the sale counter's.
const sent = { bets: 0, sales: 0 };
page.on("request", (r) => {
  if (r.method() !== "POST" || !r.headers()["next-action"]) return;
  let body = "";
  try { body = r.postData() ?? ""; } catch { body = ""; }
  if (body.includes("idempotencyKey")) sent.bets += 1;
  else if (body.includes("positionId")) sent.sales += 1;
});
// S6 A8i-2 · every keydown the page sees, recorded at the window before any listener of the page's own (the key guard among
// them): whether the keyboard repeated it, and whether it landed in a dialog — so a held-key case can show its repeats
// reached a place where they could press something, and were swallowed there rather than never sent.
await page.addInitScript(() => {
  // S6 A8i-2 · the first-visit primer stays shut: it hides itself from automation by its user agent, which matches
  // Chromium's ("HeadlessChrome") but not Firefox's or WebKit's, so in those engines it opened (z 150) over the dialogs
  // under test, took their focus by the stack's own rule and caught the drive's clicks. A player who has seen it.
  try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ }
  const keys = [];
  window.__keys = keys;
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    keys.push({ repeat: e.repeat, inDialog: !!(t && t.closest && t.closest('[role="dialog"], [role="alertdialog"]')) });
  }, true);
});
/** How many repeated keydowns the page has seen since it loaded; only those in a dialog, with `inDialog`. */
const repeatsSeen = (inDialog = false) => page.evaluate((d) => (window.__keys ?? []).filter((k) => k.repeat && (!d || k.inDialog)).length, inDialog);
// S6 A8i-2 · the arming beat (`ARMING_MS`, src/lib/modal-stack.ts), read from the source so this drive never retypes it: a
// fresh press in a dialog that took focus less than that ago presses nothing, so a case that means a press waits it out.
const ARMING_MS = (() => {
  try { return Number(/export const ARMING_MS = ([0-9]+);/.exec(readFileSync(new URL("../src/lib/modal-stack.ts", import.meta.url), "utf8"))?.[1] ?? Number.NaN); }
  catch { return Number.NaN; }
})();
const ARMED_MS = (Number.isFinite(ARMING_MS) ? ARMING_MS : 400) + 200;

/**
 * The balance as the server renders it, read from /wallet's HTML over the player's own session — NO PAGE IS OPENED.
 * S6 A8i-2: it used to open a second page, and in Firefox and WebKit a page opened in the context takes focus from the
 * page under test, so a case's next key landed nowhere (a held Enter on UP placed no bet at all). The figure is the
 * balance pill's "TZS …" as the server drew it (masked or missing reads as NaN, which fails the case that reads it).
 */
async function balance() {
  const res = await ctx.request.get(BASE + "/wallet");
  const html = await res.text();
  const at = html.indexOf('data-testid="wallet-balance-pill"');
  if (at < 0) return NaN;
  const inner = html.slice(html.indexOf(">", at) + 1, html.indexOf(">", at) + 6000).replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;|&#xa0;/gi, " ");
  const m = /TZS\s*([0-9][0-9,]*)/.exec(inner);
  return m ? Number(m[1].split(",").join("")) : NaN;
}
/** The element that has focus, as `tag.class|name`. */
const focused = () => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return "";
  return `${a.tagName.toLowerCase()}.${String(a.className).split(" ").slice(0, 3).join(".")}|${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 40)}`;
});
const quiet = () => page.waitForTimeout(QUIET_MS);
/** Holds `key` down: one press, then `n` auto-repeats 35 ms apart, then the release. */
async function hold(key, n = 20) {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  for (let i = 0; i < n; i++) { await page.keyboard.down(key); await page.waitForTimeout(35); }
  await page.keyboard.up(key);
}

const betDialog = page.getByRole("dialog", { name: "Confirm prediction" });
const sellDialog = page.getByRole("dialog", { name: "Cash out" });
const seal = page.getByRole("dialog", { name: "You won" });
const keepPredicting = page.getByRole("button", { name: "Keep predicting" });

console.log(`enter-where-pressed drive — ${BASE} · ${ENGINE}${REDUCED ? " · REDUCED MOTION (prefers-reduced-motion: reduce)" : ""}`);
await fetch(BASE + "/api/dev-test/seed-markets", { method: "POST" }).catch(() => {});
await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
// The first live card's market, opened on YES the way its YES button opens it (`?side=YES`, CLAUDE.md "the dial is ALWAYS
// side-locked") — by its address, so a slow dev compile of the click's navigation cannot stall the drive.
const card = page.locator(".mcardp:has(.mcardp-actions) a[href^='/markets/mkt_']").first();
await card.waitFor({ state: "attached", timeout: 90000 });
const marketUrl = `${BASE}${(await card.getAttribute("href")).split("?")[0]}?side=YES`;
const stakeBox = page.locator('input[inputmode="numeric"]').first();
const place = page.getByRole("button", { name: /Place YES/ });
const sellNow = page.getByRole("button", { name: /^(Free exit|Sell now)/ }).first();
/**
 * S6 A8i-2 · a case's navigation, tried again once when the app's own navigation interrupts it: a bet just placed can
 * send the page on its way (the receipt's refresh, the board's address) a moment after the case moves on, and Firefox
 * and WebKit abort the case's load for it (NS_BINDING_ABORTED, "interrupted by another navigation") — a set-up race,
 * never a verdict.
 */
async function go(url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (e) {
    if (!/interrupted by another navigation|NS_BINDING_ABORTED|frame was detached|ERR_ABORTED/i.test(String(e?.message ?? e))) throw e;
    await page.waitForTimeout(1000);
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
}
/** Each case starts on a freshly loaded page, so nothing a failed case left open (a receipt, a dialog) decides the next. */
async function freshMarket() {
  await go(marketUrl);
  await stakeBox.waitFor({ state: "visible", timeout: 90000 });
  await stakeBox.click(); await stakeBox.fill(String(STAKE)); await stakeBox.press("Enter");
  await page.waitForTimeout(300);
}
async function freshPositions() {
  await go(BASE + "/positions");
  await sellNow.waitFor({ state: "visible", timeout: 90000 });
  await page.waitForTimeout(300);
}
/* ⭐ S6 A8i-2 · each opener waits out the dialog's arming beat (`ARMED_MS`): a key a case means to press in the dialog is
   pressed after it, as a player who reads the confirm presses it. */
async function openBet() {
  await place.click();
  await betDialog.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
}
async function openSell() {
  await sellNow.click();
  await sellDialog.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
}

/**
 * The balance once nothing is still moving. A bet or a sale the key started may still be in flight when a first read
 * runs (a dev server compiles its action on first use), so it is read after a settle and again two seconds later, and the
 * later figure is the one compared — a case that moved money cannot pass on a read that came too early.
 */
async function settled() {
  await page.waitForTimeout(1500);
  const first = await balance();
  await page.waitForTimeout(2000);
  return { first, now: await balance() };
}
/** Runs one case; a case that cannot even be set up is BLOCKED (never a pass, never its check's FAIL), and the drive goes on. */
async function runCase(id, words, body) {
  try { await body(); } catch (e) {
    blocked.push(id);
    console.log(`  BLOCKED ${id} · ${words} — the case could not run: ${String(e?.message ?? e).split("\n")[0]}`);
  }
}

ok("0b · fixture · the arming beat is read from this checkout's src/lib/modal-stack.ts (ARMING_MS), so this drive waits it out with the number the product uses (a control run against an older server waits the same)", Number.isFinite(ARMING_MS), String(ARMING_MS));
console.log("§ the bet confirm");
await runCase("A", "Tab to Cancel, Enter — the confirm closes and no bet is placed", async () => {
  await freshMarket();
  const before = await balance();
  ok("0 · fixture · the demo player has a balance to bet with", before >= STAKE * 10, String(before));
  await openBet();
  const opened = await focused();
  await page.keyboard.press("Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await quiet();
  const closed = !(await betDialog.isVisible()), receipt = await keepPredicting.isVisible();
  const { first, now } = await settled();
  ok("A · Tab to Cancel, Enter — the confirm closes and no bet is placed",
    /btn-ghost/.test(enterOn) && closed && !receipt && now === before, JSON.stringify({ opened, enterOn, closed, receipt, before, first, now }));
});
await runCase("B", "Shift+Tab to the ✕, Enter — the confirm closes and no bet is placed", async () => {
  await freshMarket();
  const before = await balance();
  await openBet();
  await page.keyboard.press("Shift+Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await quiet();
  const closed = !(await betDialog.isVisible()), receipt = await keepPredicting.isVisible();
  const { first, now } = await settled();
  ok("B · Shift+Tab to the ✕, Enter — the confirm closes and no bet is placed",
    /\|Cancel$/.test(enterOn) && !/btn-/.test(enterOn) && closed && !receipt && now === before,
    JSON.stringify({ enterOn, closed, receipt, before, first, now }));
});
for (const [id, key, words] of [["C", "Enter", "Enter HELD on the dial"], ["D", " ", "Space HELD on the dial and released"]]) {
  await runCase(id, `${words} — the confirm opens, and no bet is placed`, async () => {
    await freshMarket();
    const before = await balance();
    await page.getByRole("slider").focus();
    const r0 = await repeatsSeen(true);
    await hold(key);
    await quiet();
    const open = await betDialog.isVisible(), receipt = await keepPredicting.isVisible(), inDialog = (await repeatsSeen(true)) - r0;
    const { first, now } = await settled();
    ok(`${id} · ${words} — the confirm opens, its repeats reach it, and no bet is placed`, open && !receipt && inDialog >= 1 && now === before,
      JSON.stringify({ open, receipt, repeatsInDialog: inDialog, before, first, now }));
  });
}
await runCase("E", "Enter where focus lands (Confirm) — the bet is placed: the keyboard path still confirms", async () => {
  await freshMarket();
  const before = await balance();
  await openBet();
  const enterOn = await focused();
  const b0 = sent.bets;
  await page.keyboard.press("Enter");
  await keepPredicting.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const receipt = await keepPredicting.isVisible();
  const after = await balance();
  ok("E · Enter where focus lands (Confirm) — the bet is placed: the keyboard path still confirms (and the bet counter sees exactly one bet)",
    /btn-gold/.test(enterOn) && receipt && after === before - STAKE && sent.bets - b0 === 1, JSON.stringify({ enterOn, receipt, before, after, bets: sent.bets - b0 }));

  await runCase("F", "the receipt: Tab to \"View positions\", Enter — it goes to /positions, not the primary's board", async () => {
    // S6 A8i-2 · the receipt took focus a moment ago: a press in its arming beat presses nothing, so the case waits it out.
    await page.waitForTimeout(ARMED_MS);
    const opened = await focused();
    await page.keyboard.press("Tab");
    const tabbed = await focused();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/(positions|markets)(\?|$)/, { timeout: 20000 }).catch(() => {});
    ok("F · the receipt: Tab to \"View positions\", Enter — it goes to /positions, not the primary's board",
      /\/positions(\?|$)/.test(page.url()), JSON.stringify({ opened, enterOn: tabbed, url: page.url() }));
  });
});

console.log("§ the Sell confirm");
await runCase("G", "Tab to \"Keep position\", Enter — the confirm closes and nothing is sold", async () => {
  await freshPositions();
  const before = await balance();
  await openSell();
  const opened = await focused();
  await page.keyboard.press("Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await quiet();
  const closed = !(await sellDialog.isVisible());
  const { first, now } = await settled();
  ok("G · Tab to \"Keep position\", Enter — the confirm closes and nothing is sold",
    /Keep position/.test(enterOn) && closed && now === before, JSON.stringify({ opened, enterOn, closed, before, first, now }));
});
await runCase("H", "the win seal opened over the Sell confirm, Enter — the seal closes, and nothing is sold underneath", async () => {
  await freshPositions();
  const before = await balance();
  await openSell();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail: { kind: "WIN", amount: 4200, net: 2200, label: "A8i drive" } })));
  await seal.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
  const enterOn = await focused();
  const inSeal = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="You won"]'));
  await page.keyboard.press("Enter");
  await quiet();
  const sealGone = !(await seal.isVisible()), sellStill = await sellDialog.isVisible();
  const { first, now } = await settled();
  ok("H · the win seal opened over the Sell confirm, Enter — the seal closes, the Sell confirm is still open under it, and nothing is sold",
    inSeal && sealGone && sellStill && now === before, JSON.stringify({ enterOn, inSeal, sealGone, sellStill, before, first, now }));
});
await runCase("I", "Enter HELD on the Sell button — the confirm opens, and nothing is sold", async () => {
  await freshPositions();
  const before = await balance();
  await sellNow.focus();
  const r0 = await repeatsSeen(true);
  await hold("Enter");
  await quiet();
  const open = await sellDialog.isVisible(), inDialog = (await repeatsSeen(true)) - r0;
  const { first, now } = await settled();
  ok("I · Enter HELD on the Sell button — the confirm opens, its repeats reach it, and nothing is sold", open && inDialog >= 1 && now === before,
    JSON.stringify({ open, repeatsInDialog: inDialog, before, first, now }));
});
await runCase("J", "Enter where focus lands (Sell) — the sale happens: the keyboard path still sells", async () => {
  await freshPositions();
  const before = await balance();
  await openSell();
  const enterOn = await focused();
  const s0 = sent.sales;
  await page.keyboard.press("Enter");
  const { first, now } = await settled();
  ok("J · Enter where focus lands (Sell) — the sale happens: the keyboard path still sells (and the sale counter sees exactly one sale)",
    /btn-gold/.test(enterOn) && now === before + STAKE && sent.sales - s0 === 1, JSON.stringify({ enterOn, before, first, now, sales: sent.sales - s0 }));
});

// ═══ § A8i-2 (2026-10-07) · A KEY HELD DOWN PRESSES ONCE, WHEREVER IT IS; NOTHING BEHIND THE TOP DIALOG TAKES A KEY ═══════
// Every case below fails on the tree before A8i-2 (23f762f4), K1 and W2 as a real browser proved on 2026-10-07, and must
// pass after it. Each counts what the page SENDS as well as reading the wallet: a server action whose form carries a bet's
// idempotency key is a bet, one that names a ticket is a sale. The wallet says whether money moved; the count says whether
// a key even tried.
console.log("§ A8i-2 · held keys, the dialog stack and the arming beat");
/**
 * A ticket to sell: the player's open one, or one bet by MOUSE now (no key is pressed), so every Sell case below has its
 * own — on the tree before A8i-2, W2 sells the ticket it opened, and the next case would otherwise have none to open.
 */
async function ensureTicket() {
  await go(BASE + "/positions");
  const has = await sellNow.waitFor({ state: "visible", timeout: 20000 }).then(() => true).catch(() => false);
  if (has) return;
  await freshMarket();
  await place.click();
  await betDialog.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
  await betDialog.getByRole("button", { name: /^Confirm · TZS/ }).click();
  await keepPredicting.waitFor({ state: "visible", timeout: 20000 });
}
const keepPlaying = page.getByRole("button", { name: "Keep playing" });
const upButton = page.locator(".ud-act button.btn-yes:enabled").first();
/** The bet confirm while it is live, matched by its markup, so a dialog drawn over it (the seal) cannot hide it from the drive. */
const liveBet = page.locator('[role="dialog"][aria-label="Confirm prediction"]:not([aria-hidden="true"])');
/** Opens the win seal the way a win does (the event the poller sends). */
const celebrate = () => page.evaluate(() => window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail: { kind: "WIN", amount: 4200, net: 2200, label: "A8i-2 drive" } })));
/** The win seal opened over whatever is open, its arming beat waited out. */
async function sealOver() {
  await celebrate();
  await seal.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
}
/** Whether focus is inside the dialog named `name`. */
const inside = (name) => page.evaluate((n) => !!document.activeElement?.closest(`[role="dialog"][aria-label="${n}"], [role="alertdialog"][aria-label="${n}"]`), name);
/** The figure in a "TZS 1,000" label. */
const tzsIn = (s) => { const m = /TZS[^0-9]*([0-9][0-9,]*)/.exec(String(s ?? "")); return m ? Number(m[1].split(",").join("")) : Number.NaN; };
/** The Up & Down board, with a card's UP that can be pressed. */
async function freshUpDown() {
  await go(BASE + "/updown");
  await upButton.waitFor({ state: "visible", timeout: 90000 });
  await page.waitForTimeout(300);
}

await runCase("0c", "the section's own ticket: Enter on Confirm, past the arming beat, places one bet", async () => {
  await freshMarket();
  await openBet();
  const b0 = sent.bets;
  await page.keyboard.press("Enter");
  await keepPredicting.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const receipt = await keepPredicting.isVisible();
  ok("0c · fixture · the section's own ticket (the drive's J sold its first): Enter on Confirm, past the arming beat, places one bet",
    receipt && sent.bets - b0 === 1, JSON.stringify({ receipt, bets: sent.bets - b0 }));
});
await runCase("K1", 'the Sell confirm: Tab to "Keep position", Enter HELD — it closes, stays closed, and nothing is sold', async () => {
  await ensureTicket();
  await freshPositions();
  const before = await balance();
  await openSell();
  await page.keyboard.press("Tab");
  const enterOn = await focused();
  const s0 = sent.sales, r0 = await repeatsSeen();
  await hold("Enter");
  await quiet();
  const reopened = await sellDialog.isVisible(), repeats = (await repeatsSeen()) - r0;
  const { first, now } = await settled();
  ok('K1 · the Sell confirm: Tab to "Keep position", Enter HELD — it closes, stays closed, and nothing is sold',
    /Keep position/.test(enterOn) && repeats >= 8 && !reopened && sent.sales === s0 && now === before,
    JSON.stringify({ enterOn, repeats, reopened, sales: sent.sales - s0, before, first, now }));
});
await runCase("K2", "the bet confirm: Tab to Cancel, Enter HELD — it closes, stays closed, and no bet is placed", async () => {
  await freshMarket();
  const before = await balance();
  await openBet();
  await page.keyboard.press("Tab");
  const enterOn = await focused();
  const b0 = sent.bets, r0 = await repeatsSeen();
  await hold("Enter");
  await quiet();
  const reopened = await betDialog.isVisible(), repeats = (await repeatsSeen()) - r0;
  const { first, now } = await settled();
  ok("K2 · the bet confirm: Tab to Cancel, Enter HELD — it closes, stays closed, and no bet is placed",
    /btn-ghost/.test(enterOn) && repeats >= 8 && !reopened && sent.bets === b0 && now === before,
    JSON.stringify({ enterOn, repeats, reopened, bets: sent.bets - b0, before, first, now }));
});
await runCase("W2", "the win seal over the Sell confirm, Enter and Enter 60 ms apart — the seal closes, the confirm stays, and nothing is sold", async () => {
  await ensureTicket();
  await freshPositions();
  const before = await balance();
  await openSell();
  await sealOver();
  const inSeal = await inside("You won");
  const s0 = sent.sales;
  await page.keyboard.press("Enter");
  await page.waitForTimeout(60);
  await page.keyboard.press("Enter");
  await quiet();
  const sealGone = !(await seal.isVisible()), sellStill = await sellDialog.isVisible(), focusAfter = await focused();
  const { first, now } = await settled();
  ok("W2 · the win seal over the Sell confirm, Enter and Enter 60 ms apart — the seal closes, the confirm stays with focus on its way out (\"Keep position\"), and nothing is sold",
    inSeal && sealGone && sellStill && /Keep position/.test(focusAfter) && sent.sales === s0 && now === before,
    JSON.stringify({ inSeal, sealGone, sellStill, focusAfter, sales: sent.sales - s0, before, first, now }));
});
await runCase("ESC", "the win seal over the Sell confirm, one Escape — only the seal closes, and focus is back in the confirm", async () => {
  await ensureTicket();
  await freshPositions();
  await openSell();
  await sealOver();
  const s0 = sent.sales;
  await page.keyboard.press("Escape");
  await quiet();
  const sealGone = !(await seal.isVisible()), sellStill = await sellDialog.isVisible(), inSell = await inside("Cash out");
  ok("ESC · the win seal over the Sell confirm, one Escape — only the seal closes, and focus is back in the confirm",
    sealGone && sellStill && inSell && sent.sales === s0, JSON.stringify({ sealGone, sellStill, inSell, sales: sent.sales - s0 }));
});
/* S6 A8i-2 review (2026-10-07) · TWO WIN SEALS QUEUED over the Sell confirm, and Enter mashed through both. The second seal
   is drawn 350 ms after the first closes, plus however long the phone takes to draw it: had the confirm under them taken
   focus on its sell button, an Enter landing after the beat and before the second seal was on the stack would have sold.
   The mash is ~1.2 s: long enough to cover both seals, too short to walk the keyboard path a player means (Keep closes the
   confirm; a sale needs the Sell button, a new confirm and its own Enter, each past a beat). */
await runCase("SQ", "two win seals queued over the Sell confirm, Enter pressed every ~60 ms through both — nothing is sold", async () => {
  await ensureTicket();
  await freshPositions();
  const before = await balance();
  await openSell();
  await celebrate();
  await celebrate();
  await seal.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(ARMED_MS);
  const s0 = sent.sales;
  let shown = 1, wasShown = true;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(60);
    const now = await seal.isVisible();
    if (now && !wasShown) shown += 1;
    wasShown = now;
  }
  await quiet();
  const { first, now } = await settled();
  ok("SQ · two win seals queued over the Sell confirm, Enter pressed every ~60 ms through both — both seals were shown, and nothing is sold",
    shown >= 2 && sent.sales === s0 && now === before,
    JSON.stringify({ sealsShown: shown, sales: sent.sales - s0, sellStill: await sellDialog.isVisible(), before, first, now }));
});
await runCase("DD", "the dial: Enter, then Enter 100 ms later — the confirm opens, and no bet is placed", async () => {
  await freshMarket();
  const before = await balance();
  await page.getByRole("slider").focus();
  const b0 = sent.bets;
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
  await quiet();
  const open = await betDialog.isVisible(), receipt = await keepPredicting.isVisible();
  const { first, now } = await settled();
  ok("DD · the dial: Enter, then Enter 100 ms later — the confirm opens, and no bet is placed",
    open && !receipt && sent.bets === b0 && now === before, JSON.stringify({ open, receipt, bets: sent.bets - b0, before, first, now }));
});
await runCase("SL", "the win seal over the bet confirm, its quote lapsing under the seal, then Enter and Enter — no confirm reopens, and no bet", async () => {
  await freshMarket();
  const before = await balance();
  await openBet();
  // The seal arrives about 5.5 s into the confirm's 10 s quote, so its 7 s dwell outlasts the lapse by about 2.5 s.
  await page.waitForTimeout(4900);
  await celebrate();
  await seal.waitFor({ state: "visible", timeout: 10000 });
  const underSeal = await liveBet.isVisible();
  await liveBet.waitFor({ state: "hidden", timeout: 9000 });
  const sealUp = await seal.isVisible(), inSeal = await inside("You won");
  const b0 = sent.bets;
  await page.keyboard.press("Enter");
  await page.waitForTimeout(60);
  await page.keyboard.press("Enter");
  await quiet();
  const sealGone = !(await seal.isVisible()), reopened = await liveBet.isVisible();
  const { first, now } = await settled();
  ok("SL · the win seal over the bet confirm, its quote lapsing under the seal (focus stays in the seal), then Enter and Enter — the seal closes, no confirm reopens, and no bet is placed",
    underSeal && sealUp && inSeal && sealGone && !reopened && sent.bets === b0 && now === before,
    JSON.stringify({ underSeal, sealUp, inSeal, sealGone, reopened, bets: sent.bets - b0, before, first, now }));
});
// Up & Down: a chain of three-minute rounds on the local mock feed, armed across a boundary so a round is open now: the two
// calls `qa:toast-modal` makes (both 404 in production).
const udSeed = await fetch(BASE + "/api/dev-test/updown-seed", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ durations: [3], feedProvider: "mock-bars" }),
}).then((r) => r.status).catch(() => 0);
const udArm = await fetch(BASE + "/api/dev-test/updown-advance", { method: "POST" }).then((r) => r.status).catch(() => 0);
ok("0d · fixture · an Up & Down round is stood up and armed on the local server", udSeed >= 200 && udSeed < 300 && udArm >= 200 && udArm < 300, JSON.stringify({ udSeed, udArm }));
await runCase("UD1", "Up & Down: Enter HELD on a board card's UP — exactly one bet", async () => {
  await freshUpDown();
  const before = await balance();
  const stake = tzsIn(await upButton.getAttribute("aria-label"));
  await upButton.focus();
  const b0 = sent.bets, r0 = await repeatsSeen();
  await hold("Enter");
  await quiet();
  const repeats = (await repeatsSeen()) - r0, bets = sent.bets - b0;
  const { first, now } = await settled();
  ok("UD1 · Up & Down: Enter HELD on a board card's UP — exactly one bet: the first press is a bet, its repeats are nothing",
    stake > 0 && repeats >= 8 && bets === 1 && now === before - stake, JSON.stringify({ stake, repeats, bets, before, first, now }));
});
await runCase("UD2", 'Up & Down: the receipt, Enter HELD on "Keep playing" — it closes, and no further bet is placed', async () => {
  await freshUpDown();
  const before = await balance();
  const stake = tzsIn(await upButton.getAttribute("aria-label"));
  const b0 = sent.bets;
  await upButton.click();
  await keepPlaying.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(ARMED_MS);
  const enterOn = await focused();
  const b1 = sent.bets, r0 = await repeatsSeen();
  await hold("Enter");
  await quiet();
  const repeats = (await repeatsSeen()) - r0, closed = !(await keepPlaying.isVisible());
  const { first, now } = await settled();
  ok('UD2 · Up & Down: the receipt, Enter HELD on "Keep playing" — it closes, and no further bet is placed (only the tap that opened it)',
    /Keep playing/.test(enterOn) && b1 - b0 === 1 && repeats >= 8 && closed && sent.bets === b1 && now === before - stake,
    JSON.stringify({ enterOn, tapBets: b1 - b0, repeats, closed, laterBets: sent.bets - b1, stake, before, first, now }));
});

ok("Z · no page error during the drive", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nENTER WHERE PRESSED (drive) — ${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.map((f) => f.split(" ")[0]).join(" ")}` : ""}`
  + `${blocked.length ? ` · ${blocked.length} BLOCKED (could not run — no proof either way): ${blocked.join(" ")}` : ""}\n`);
console.log(`(market ${marketUrl})`);
process.exit(fails.length || blocked.length ? 1 : 0);
