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
 * ⭐ IT IS ITS OWN RED CONTROL: on a server built from the tree before A8i, A B C D F G H I fail and E J pass.
 * ⛔ It refuses any host but localhost — it places and sells bets.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE || "http://localhost:3061").replace(/\/$/, "");
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) {
  console.error(`⛔ REFUSING ${BASE}: this drive places and sells bets, so it runs only against a local in-memory server.`);
  process.exit(2);
}
const STAKE = 1000;
const QUIET_MS = 900;

let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));

/** The balance as the server renders it, read on a page of its own so the page under test is never disturbed. */
async function balance() {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
    const pill = p.locator('[data-testid="wallet-balance-pill"]').first();
    await pill.waitFor({ state: "attached", timeout: 30000 });
    const n = (await pill.innerText()).replace(/[^\d]/g, "");
    return n ? Number(n) : NaN;
  } finally { await p.close(); }
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

console.log(`enter-where-pressed drive — ${BASE}`);
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
/** Each case starts on a freshly loaded page, so nothing a failed case left open (a receipt, a dialog) decides the next. */
async function freshMarket() {
  await page.goto(marketUrl, { waitUntil: "domcontentloaded" });
  await stakeBox.waitFor({ state: "visible", timeout: 90000 });
  await stakeBox.click(); await stakeBox.fill(String(STAKE)); await stakeBox.press("Enter");
  await page.waitForTimeout(300);
}
async function freshPositions() {
  await page.goto(BASE + "/positions", { waitUntil: "domcontentloaded" });
  await sellNow.waitFor({ state: "visible", timeout: 90000 });
  await page.waitForTimeout(300);
}
async function openBet() {
  await place.click();
  await betDialog.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(200);
}
async function openSell() {
  await sellNow.click();
  await sellDialog.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(200);
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
/** Runs one case; a case that cannot even be set up is a FAIL that says why, and the drive goes on to the next. */
async function runCase(id, words, body) {
  try { await body(); } catch (e) { ok(`${id} · ${words}`, false, `the case could not run: ${String(e?.message ?? e).split("\n")[0]}`); }
}

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
    await hold(key);
    await quiet();
    const open = await betDialog.isVisible(), receipt = await keepPredicting.isVisible();
    const { first, now } = await settled();
    ok(`${id} · ${words} — the confirm opens, and no bet is placed`, open && !receipt && now === before, JSON.stringify({ open, receipt, before, first, now }));
  });
}
await runCase("E", "Enter where focus lands (Confirm) — the bet is placed: the keyboard path still confirms", async () => {
  await freshMarket();
  const before = await balance();
  await openBet();
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await keepPredicting.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const receipt = await keepPredicting.isVisible();
  const after = await balance();
  ok("E · Enter where focus lands (Confirm) — the bet is placed: the keyboard path still confirms",
    /btn-gold/.test(enterOn) && receipt && after === before - STAKE, JSON.stringify({ enterOn, receipt, before, after }));

  await runCase("F", "the receipt: Tab to \"View positions\", Enter — it goes to /positions, not the primary's board", async () => {
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
  await page.waitForTimeout(500);
  const enterOn = await focused();
  const inSeal = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="You won"]'));
  await page.keyboard.press("Enter");
  await quiet();
  const sealGone = !(await seal.isVisible());
  const { first, now } = await settled();
  ok("H · the win seal opened over the Sell confirm, Enter — the seal closes, and nothing is sold underneath",
    inSeal && sealGone && now === before, JSON.stringify({ enterOn, inSeal, sealGone, before, first, now }));
});
await runCase("I", "Enter HELD on the Sell button — the confirm opens, and nothing is sold", async () => {
  await freshPositions();
  const before = await balance();
  await sellNow.focus();
  await hold("Enter");
  await quiet();
  const open = await sellDialog.isVisible();
  const { first, now } = await settled();
  ok("I · Enter HELD on the Sell button — the confirm opens, and nothing is sold", open && now === before, JSON.stringify({ open, before, first, now }));
});
await runCase("J", "Enter where focus lands (Sell) — the sale happens: the keyboard path still sells", async () => {
  await freshPositions();
  const before = await balance();
  await openSell();
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  const { first, now } = await settled();
  ok("J · Enter where focus lands (Sell) — the sale happens: the keyboard path still sells",
    /btn-gold/.test(enterOn) && now === before + STAKE, JSON.stringify({ enterOn, before, first, now }));
});

ok("Z · no page error during the drive", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nENTER WHERE PRESSED (drive) — ${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.map((f) => f.split(" ")[0]).join(" ")}` : ""}\n`);
console.log(`(market ${marketUrl})`);
process.exit(fails.length ? 1 : 0);
