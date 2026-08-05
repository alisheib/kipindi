/**
 * SESSION 27 · PLAY A LIVE ROUND, AS A PLAYER, WITH REAL MONEY.
 *
 *   node scripts/live-s27-play.mjs board <persona> <UP|DOWN>   # from /updown, NO query string
 *   node scripts/live-s27-play.mjs round <persona> <UP|DOWN> <roundId>
 *
 * ⛔ `board` LANDS ON `/updown` WITH NO QUERY STRING ON PURPOSE. A query string pinned the
 * board to one asset for a whole campaign and hid a bug behind it — the guide's §9 step 5 is
 * "open 50pick.tz/updown as a player", and that is the path a player actually takes.
 *
 * ⛔ `networkidle` NEVER fires here: the board polls. `domcontentloaded` returns while every
 * card is still a skeleton, so reading text there reports a page that has not rendered yet.
 * Wait for the round's OWN numbers.
 *
 * ⛔ ONE BROWSER CONTEXT PER PERSONA — an admin cookie makes /auth/login redirect and the
 * missing field reads exactly like a broken login page.
 */
import { mkdirSync } from "node:fs";
import { BASE, SHOT, login, bodyText, browser } from "./live/harness.mjs";

const [MODE, WHO, SIDE, ROUND] = process.argv.slice(2);
if (!MODE || !WHO || !SIDE) {
  console.error("usage: node scripts/live-s27-play.mjs <board|round> <persona> <UP|DOWN> [roundId]");
  process.exit(2);
}
mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(...a);

const { b, ctx } = await browser();
const page = await ctx.newPage();
let placed = false;
try {
  await login(page, WHO);
  const url = MODE === "round" ? `${BASE}/updown/${ROUND}` : `${BASE}/updown`;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // THE POSITIVE SIGNAL: a real price with the asset's own decimals, which only a rendered
  // round card can produce. Skeletons carry no digits.
  const ready = await page.waitForFunction(
    () => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText),
    undefined, { timeout: 60_000 },
  ).then(() => true).catch(() => false);
  log(`   card rendered: ${ready}`);

  const before = await bodyText(page);
  if (/bets closed|dau limefungwa/.test(before)) throw new Error("selections already closed");

  // ⚠️ `^up\b` — the accessible name, scoped so "Up & Down" in the chrome cannot match.
  const btn = page.getByRole("button", { name: SIDE === "UP" ? /^up\b/i : /^down\b/i }).first();
  if (!(await btn.count())) throw new Error(`no ${SIDE} control on ${url}`);
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click();

  // ⭐ WAIT FOR THE MONEY, not for a timer.
  placed = await page.waitForFunction(
    () => /you're in|uko ndani|你已参与/i.test(document.body.innerText)
       || /vol\s*tzs\s*[1-9]/i.test(document.body.innerText.replace(/\s+/g, " ")),
    undefined, { timeout: 30_000 },
  ).then(() => true).catch(() => false);

  await page.locator("main").first().screenshot({ path: `${SHOT}/play-${WHO}-${SIDE.toLowerCase()}.png` }).catch(() => {});
  log(`   ${WHO} ${SIDE}: ${placed ? "PLACED" : "NOT placed"}`);
} catch (e) {
  log(`   ❌ ${WHO}: ${e.message}`);
  await page.screenshot({ path: `${SHOT}/play-error-${WHO}.png` }).catch(() => {});
} finally {
  await b.close();
}
process.exit(placed ? 0 : 1);
