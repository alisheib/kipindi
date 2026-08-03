/**
 * LEGS C–E · THE FLEET PLAYS, BOTH SIDES, ON LIVE UP & DOWN ROUNDS.
 *
 *   SHOT_DIR=./shots/RUN node scripts/live-bulk-play.mjs [assetLabel] [pairs]
 *   SHOT_DIR=./shots/RUN node scripts/live-bulk-play.mjs Bitcoin 3
 *
 * ⚠️ REAL MONEY from QA-fleet wallets, on production. Authorised by Ali.
 *
 * WHY UP & DOWN CARRIES THE MONEY HALF. A long-form poll published today resolves in
 * September; a 5-minute round opens, closes, resolves and settles inside one sitting. So
 * this is where "played → won/lost → wallet moved" can actually be OBSERVED rather than
 * asserted, which is the whole point of the exercise.
 *
 * ⛔ ASSET CHOICE IS DELIBERATE. Gold and Solana void ~100% of rounds (E-58), so betting
 * there proves only that refunds work. Bitcoin and Ethereum resolve decisively ~70% of the
 * time, which is what produces a real winner and a real loser to verify.
 *
 * ⚠️ THE QUICK-BET DOM CONTRACT, learned from the live DOM (`live/probe-updown-ui.mjs`),
 * never guessed: the stake chips are buttons named exactly `TZS 500` / `TZS 1,000` / …,
 * and THE SIDE BUTTON'S NAME CONTAINS THE SELECTED STAKE (`Up — Bitcoin · TZS 1,000`), so
 * match on /^up —/i and never on the whole string. `/updown` holds an open event stream, so
 * `networkidle` NEVER fires — navigate with `domcontentloaded` and wait for a control.
 */
import { BASE, SHOT, browser, login, bodyText, shot } from "./live/harness.mjs";

const ASSET = process.argv[2] ?? "Bitcoin";
const PAIRS = Number(process.argv[3] ?? 3);          // how many UP/DOWN pairs to place
const STAKE = "TZS 1,000";

const placed = [];

/** One fleet player places one side on the currently-open round of ASSET. */
async function play(idx, side) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  let step = "login";
  try {
    await login(page, `fleet:${idx}`);
    await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });
    await page.waitForTimeout(2000);

    // The first-run primer covers every control for a new account. Scoped, and verified.
    const primer = page.locator('[role="dialog"][aria-label*="primer" i]');
    if (await primer.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      if (await primer.isVisible().catch(() => false)) {
        await primer.getByRole("button", { name: /close|cancel|skip|got it/i }).last().click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
      }
      if (await primer.isVisible().catch(() => false)) throw new Error("primer would not dismiss");
    }

    // 🔴 THE RECORDED DOM CONTRACT WAS STALE, AND EVERY BET FAILED ON IT.
    // `live-player-winlose.mjs` (and the note quoted in harness.mjs) describe stake chips
    // named `TZS 500` / `TZS 1,000` and a side button named `Up — Bitcoin · TZS 5,000`.
    // The live page as of 2026-08-03 renders **`500` `1K` `2.5K` `5K` `Custom`** and
    // **`Up × 1.4 est.` / `Down × 1.4 est.`** — and offers no asset <button> at all.
    // Six identical 30s timeouts is what a stale contract looks like; the product was fine.
    // ⭐ A DOM CONTRACT WRITTEN INTO A COMMENT IS A MEMORY. Re-probe it, don't trust it.
    // ⚠️ AND MATCH ON TEXT, NOT ACCESSIBLE NAME. `getByRole("button", {name:/^1K$/})`
    // timed out against a page where a button plainly reads "1K" — because getByRole
    // matches the ACCESSIBLE NAME, which an aria-label overrides. The screenshot showed
    // the control present and enabled the whole time. Filter on the rendered text.
    step = "stake chip 1K";
    await page.locator("button").filter({ hasText: /^1K$/ }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(800);

    // ⛔ ASCII ONLY IN SELECTORS. The label is `Up × 1.4 est.` and matching on that `×`
    // (U+00D7) returned ZERO elements against a page where the button was plainly visible,
    // enabled, and dumped its own text as `Up × 1.4 est.` two lines earlier — the character
    // does not survive every shell/encoding path a script is invoked through. Match the
    // ASCII prefix instead. (`Up 50%` in the pool bar is not a <button>, so `^Up ` is
    // unambiguous among buttons.)
    // ⛔ AND DO NOT ANCHOR WITH `^`. `filter({hasText})` tests **textContent**, which
    // includes screen-reader-only spans the eye never sees — so `/^Up\s/` matched ZERO
    // buttons on a card that dumps `Up × 1.4 est.` as its own innerText. Three selector
    // attempts died here (accessible-name, the `×` character, then the anchor); the button
    // was visible and enabled throughout. Discriminate on CONTENT instead: both side
    // buttons carry `est.`, and only one of them carries `Up`.
    step = "side button";
    const sideBtn = page.locator("button")
      .filter({ hasText: /est\./ })
      .filter({ hasText: side === "UP" ? /Up/ : /Down/ })
      .first();
    await sideBtn.click({ timeout: 20_000 });
    await page.waitForTimeout(4000);

    const txt = await bodyText(page);
    const ok = /placed|imewekwa|已下注|you're in|in this round/i.test(txt);
    console.log(`  ${ok ? "ok  " : "FAIL"} fleet:${idx} ${side.padEnd(4)} ${ASSET} ${STAKE}`);
    placed.push({ idx, side, ok });
    if (idx === "01") await shot(page, `bulkC-card-${ASSET}`);
  } catch (e) {
    console.log(`  FAIL fleet:${idx} ${side} — at [${step}] — ${e.message.split("\n")[0]}`);
    placed.push({ idx, side, ok: false });
    await shot(page, `bulkC-FAILED-${idx}`);
  } finally {
    await b.close();
  }
}

console.log(`\nLEGS C–E · ${PAIRS} UP/DOWN pair(s) on ${ASSET} · ${STAKE} each · ${BASE}\n`);
for (let i = 0; i < PAIRS; i++) {
  const up = String(i * 2 + 1).padStart(2, "0");
  const down = String(i * 2 + 2).padStart(2, "0");
  await play(up, "UP");
  await play(down, "DOWN");
}

const good = placed.filter((p) => p.ok).length;
console.log(`\n${good}/${placed.length} bets placed`);
console.log(`\n⛔ The DOM is not the proof. Pair it:`);
console.log(`   positions on the round, wallets before/after, WIN|LOSS|VOID, and both players notified.`);
console.log(`shots in ${SHOT}`);
process.exit(good === 0 ? 1 : 0);
