/**
 * LIVE — ONE ROUND, BOTH SIDES, REAL MONEY, PAIRED THREE WAYS.
 *
 *   node scripts/live-updown-money-pair.mjs <roundId>
 *
 * The single question this answers: after a round settles on a dated bar, do the WALLET, the
 * POSITION and the ROUND ROW agree to the shilling?
 *
 * ⛔ IT BETS ON THE ROUND PAGE, NOT THE BOARD. An earlier attempt navigated to `/updown/<id>`
 * and screenshotted the BOARD — because `.first()` on a role selector picks whichever card is
 * first in the DOM, and the board carries several. Betting from the board is a real path, but
 * it makes "which round did that stake land on" ambiguous, and this script exists to be
 * unambiguous about exactly that.
 *
 * ⛔ AND IT WAITS FOR THE STAKE TO APPEAR, never a fixed sleep. A tap issued before hydration
 * does nothing and leaves no trace — which is what a fixed `waitForTimeout` then reports as a
 * successful bet on an empty pool.
 */
import { mkdirSync } from "node:fs";
import { BASE, login, bodyText, browser } from "./live/harness.mjs";

const ROUND = process.argv[2];
if (!ROUND) { console.error("usage: node scripts/live-updown-money-pair.mjs <roundId>"); process.exit(2); }
const OUT = ".qa-artifacts/drive";
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const ok = (l, c, x = "") => log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);

async function snap(page, sel, name) {
  const el = page.locator(sel).first();
  if (await el.count().catch(() => 0)) await el.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
  else await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`   📸 ${name}.png`);
}

async function bet(who, side) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, who);
    // ⛔ `networkidle` never fires on this app (SSE keeps a connection open) — see §3. Wait for
    // the round's OWN heading instead, which is a positive signal that the page is really here.
    await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1, h2", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3500); // hydration — a pre-hydration tap does nothing at all

    const before = await bodyText(page);
    if (/bets closed|dau limefungwa/.test(before)) throw new Error("already locked — too late to bet");

    // 🔴 THE UP LOCATOR WAS AMBIGUOUS AND HAD NEVER PLACED AN UP BET (found 2026-08-22).
    //
    // `/^up\b/i` matches TWO controls on this page: the real stake button, "Up × 1.87 est.",
    // and the product-line chip "UP & DOWN" — which also starts with "UP" followed by a word
    // boundary. `.first()` took the CHIP, clicking it did nothing to the pool, and the drive
    // reported "no confirmation appeared on the page" as though the product were broken.
    // ⛔ DOWN was never affected — "UP & DOWN" does not START with "down" — which is exactly
    // why this presented as a one-sided PRODUCT defect instead of a one-sided LOCATOR defect.
    // The asymmetry was the tell, and this is the trap the file's OWN header warns about:
    // `.first()` on a role selector picks whichever node is first in the DOM.
    //
    // ⛔ ANCHORED ON THE ARIA-LABEL, WHICH IS WHAT `getByRole(name)` ACTUALLY MATCHES.
    // A second wrong guess was made here first — `/^up\s*×/i`, taken from the button's
    // VISIBLE text "Up × 1.87 est." — and it matched nothing at all, because the stake
    // button carries `aria-label="Up — XRP · TZS 1,000"` and an accessible name, once an
    // aria-label exists, IS that label and not the text node. Asking the page for its real
    // accessible names took one probe and ended the guessing; the em dash belongs to the
    // stake control alone, and the chip "UP & DOWN" has no aria-label at all.
    const label = side === "UP" ? /^up\s*—/i : /^down\s*—/i;
    const btn = page.getByRole("button", { name: label }).first();
    if (!(await btn.count())) throw new Error(`no ${side} stake button on the round page`);
    // ⛔ PROVE IT IS THE CONTROL WE MEAN before clicking, not after failing. A stake button
    // names its asset and its amount; the product-line chip names neither.
    const btnLabel = (await btn.getAttribute("aria-label").catch(() => "")) ?? "";
    if (!/tzs/i.test(btnLabel)) throw new Error(`${side} locator resolved to "${btnLabel}", not a stake button`);
    log(`   → ${side} control: "${btnLabel}"`);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click();

    // ⭐ WAIT FOR THE MONEY, not for a timer. The stake is real when the page says so.
    const landed = await page.waitForFunction(
      () => /you're in|uko ndani|你已参与/i.test(document.body.innerText) ||
            /vol\s*tzs\s*[1-9]/i.test(document.body.innerText.replace(/\s+/g, " ")),
      undefined, { timeout: 25_000 },
    ).then(() => true).catch(() => false);

    // ⚠️ `who` can be `fleet:01`, and a COLON IS ILLEGAL IN A WINDOWS FILENAME — NTFS reads it
    // as an alternate-data-stream separator, so `p-fleet:01-up.png` silently wrote a 0-byte
    // file called `p-fleet` and the evidence for the run did not exist. Sanitised, not assumed.
    await snap(page, "main", `p-${String(who).replace(/[^a-z0-9]+/gi, "-")}-${side.toLowerCase()}`);
    ok(`${who} staked ${side}`, landed, landed ? "" : "no confirmation appeared on the page");
    await b.close();
    return landed;
  } catch (e) {
    log(`   ❌ ${who}: ${e.message}`);
    await snap(page, "main", `p-error-${who}`).catch(() => {});
    await b.close();
    return false;
  }
}

log(`\n═══ ONE ROUND, BOTH SIDES · ${ROUND}\n`);
// ⚠️ SEQUENTIAL, not parallel. Two headless Chromes racing the same round page on one laptop
// starved each other's hydration; the tap then landed on an unhydrated button and vanished.
// ⚠️ PERSONAS ARE ARGUMENTS NOW (2026-08-22), defaulting to the old hardcoded pair so every
// existing invocation is byte-identical in behaviour. They had to become arguments because
// `.env.qa.local` on a second machine can predate a password re-mint (E-176) — and when it
// does, `alpha`/`echo` fail in the one way the harness warns "looks exactly like a wrong
// password". The QA fleet carries its own shared secret and is unaffected, so being able to
// say `fleet:01 fleet:02` is the difference between a drive that runs and one that cannot.
const P_UP = process.argv[3] ?? "alpha";
const P_DOWN = process.argv[4] ?? "echo";
const a = await bet(P_UP, "UP");
const e = await bet(P_DOWN, "DOWN");
// ⚠️ NAMES THE PERSONAS IT ACTUALLY DROVE. This read "alpha UP … echo DOWN" as literals, so
// a run with `fleet:07 fleet:08` reported the wrong two accounts in its own summary — a log
// line that cannot be wrong about anything is a log line nobody can check.
log(`\n  ${P_UP} UP: ${a ? "placed" : "NOT placed"} · ${P_DOWN} DOWN: ${e ? "placed" : "NOT placed"}`);
log("  Pair the wallet, the position and the round row with scripts/live/q.cjs once it settles.\n");
