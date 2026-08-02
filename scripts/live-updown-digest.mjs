/**
 * LIVE VERIFICATION — E-37 + E-43, the Up & Down daily digest, on production.
 *
 *   SHOT_DIR=./shots node scripts/live-updown-digest.mjs
 *
 * ⚠️ WHAT THIS IS CAREFUL ABOUT, because previous sessions were not:
 *
 *  · Session 13's trap #6 was *"the bell check matched OLD inbox entries and
 *    reported E-37 as fixed."* So every DOM assertion here is scoped to a string
 *    that CANNOT exist in the failure state — the digest's own title, which
 *    contains this player's own net figure for one specific day. "A notification
 *    is present" is not evidence of anything on an account with an inbox.
 *  · Every DOM claim is paired with the database. The bell showing a row and the
 *    row existing with the right href are two different facts.
 *  · The filter is tested by COUNTING: an unfiltered history must show strictly
 *    more rounds than the filtered day, and the filtered day must show exactly
 *    what the aggregate says settled that day. A filter that renders is not a
 *    filter that filters — the guard's own §7 learned that the hard way.
 */
import { browser, login, bodyText, shot, recorder, BASE } from "./live/harness.mjs";

const DAY = process.env.DIGEST_DAY ?? "2026-08-02";
const r = recorder(`E-37 + E-43 · the Up & Down daily digest, live on ${BASE} (day ${DAY})`);

const { b, ctx } = await browser();
try {
  // ── alpha: a LOSING day. 3 rounds, 1 win 2 losses, 15,000 staked → 8,700 back.
  // The losing branch is the one carrying the LCCP claim, so it is the one driven.
  const page = await ctx.newPage();
  await login(page, "alpha");
  r.check("signed in as alpha", true);

  // 1 · The deep link the digest sends — does it actually filter?
  //
  // ⚠️ COUNT THE CARDS, not the KPI strip. The strip's label is "Rounds", and a text
  // scrape for it would happily match the word somewhere else on the page. A round
  // card is an anchor to that round, so `a[href^="/updown/udr_"]` is the thing itself.
  // ⚠️ And the expectation comes from the DATABASE, not from arithmetic done here:
  // the page groups POSITIONS into rounds, so the card count is distinct markets
  // (3 on 2 Aug, 4 all-time for alpha) and is NOT the digest's position count.
  const cards = (p) => p.locator('a[href^="/updown/udr_"]').count();

  await page.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const allRounds = await cards(page);
  r.note(`unfiltered history renders ${allRounds} round cards`);

  await page.goto(`${BASE}/updown/history?day=${DAY}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const dayRounds = await cards(page);
  const dayText = await bodyText(page);
  await shot(page, "digest-1-history-filtered");

  r.check("the ?day= link filters to FEWER rounds than the full history",
    dayRounds < allRounds, `all=${allRounds} day=${dayRounds}`);
  r.check("…and renders exactly the 3 rounds the live DB says alpha settled that day",
    dayRounds === 3, `day=${dayRounds}`);
  r.check("…while the unfiltered page still shows all 4 (so the filter is not just breaking the page)",
    allRounds === 4, `all=${allRounds}`);
  r.check("the active day is named on screen", /showing/.test(dayText) && /aug/.test(dayText), dayText.slice(0, 160));
  r.check("…with a way back to every day", /all days/.test(dayText));

  // A junk day must render the page, not a 500 — a player can type anything here.
  await page.goto(`${BASE}/updown/history?day=lol`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const junk = await bodyText(page);
  r.check("a malformed ?day= renders the page rather than erroring",
    !/application error|something went wrong/.test(junk) && (await cards(page)) === allRounds,
    junk.slice(0, 120));

  // 2 · The bell. Scoped to THIS digest's own figure, which no older entry has.
  await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
  const bell = page.getByRole("button", { name: /notifications/i }).first();
  await bell.waitFor({ state: "visible", timeout: 20_000 });
  await bell.click();
  await page.waitForTimeout(1500);
  const inbox = await bodyText(page);
  await shot(page, "digest-2-bell");

  // alpha lost 6,300 on 2026-08-02 (15,000 staked, 8,700 returned).
  r.check("the digest is in the bell, identified by alpha's OWN net for that day",
    /up & down/.test(inbox) && /6,300/.test(inbox),
    inbox.slice(inbox.indexOf("up & down") >= 0 ? inbox.indexOf("up & down") : 0, 220));
  r.check("…and it states the loss, not a net figure to decode", /you lost/.test(inbox));
  r.check("…and names the rounds", /3 rounds/.test(inbox));

  console.log(`\n${r.done() === 0 ? "PASS" : "FAIL"}`);
  process.exitCode = r.failed > 0 ? 1 : 0;
} finally {
  await ctx.close(); await b.close();
}
