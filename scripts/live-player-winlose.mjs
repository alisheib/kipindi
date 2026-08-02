/**
 * PHASE C — a REAL WIN and a REAL LOSS, with real money, on LIVE PRODUCTION.
 *
 * `alpha` backs UP and `echo` backs DOWN on the SAME Up & Down round. Whatever the price
 * does, one of them genuinely wins and the other genuinely loses — unless the move lands
 * inside the margin band, in which case the round VOIDs and both are refunded. That is a
 * correct outcome, not a failure (E-32: Ali chose "balanced", ~1 in 3 voids), so this
 * retries across rounds until one resolves decisively.
 *
 * ⚠️ REAL MONEY. Authorised by Ali 2026-08-02: "bet ~5,000 each side, repeat until
 * decisive", QA wallets only.
 *
 * ⚠️ HARNESS CONTRACT for the Up & Down quick-bet, learned from the live DOM
 * (`scripts/live/probe-updown-ui.mjs`), not guessed:
 *   · the stake chips are buttons named exactly `TZS 500` / `TZS 1,000` / `TZS 2,500` /
 *     `TZS 5,000` / `Custom`;
 *   · THE SIDE BUTTON'S NAME CONTAINS THE SELECTED STAKE — `Up — Bitcoin · TZS 5,000`.
 *     Match on /^up —/i, never on the whole string, or picking a different chip breaks it;
 *   · `/updown` holds an open event stream, so `networkidle` NEVER fires. Navigate with
 *     `domcontentloaded` and wait for a control.
 *
 * The DOM is never the proof. `verify()` re-reads every claim from the database.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STAKE = "TZS 5,000";
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS ?? 4);
const r = recorder("PHASE C — a real win and a real loss on production");

/**
 * Ask the live database, through railway so no secret is ever written down.
 *
 * ⚠️ The SQL goes via a FILE, not `node -e`. Passing a multi-line query as an inline
 * argument means it crosses cmd.exe → node's string parser, and the backslashes in the
 * host-rewrite regex die there ("Expected unicode escape"). A file has no escaping layer.
 * ⚠️ Windows: the npm shim is `railway.cmd`, so `execFileSync("railway", …)` is ENOENT
 * without `shell: true`; and the CWD must be the repo, because the Railway project link
 * lives in the tree ("No linked project found" otherwise).
 */
function sql(query) {
  const f = join(tmpdir(), `50pick-q-${process.pid}.sql`);
  writeFileSync(f, query, "utf8");
  try {
    const out = execFileSync(
      "railway", ["run", "-s", "50pick", "--", "node", "scripts/live/q.cjs", `"${f}"`],
      { cwd: "C:/kipindi-main", encoding: "utf8", timeout: 120_000, shell: true },
    );
    const line = out.trim().split("\n").filter((l) => l.trim().startsWith("[")).pop();
    if (!line) throw new Error(`no JSON from query runner: ${out.slice(-300)}`);
    return JSON.parse(line);
  } finally { rmSync(f, { force: true }); }
}

const wallets = () => sql(`
  select u."phoneE164" as phone, w.balance::text as balance, w.hold::text as hold
    from "User" u join "Wallet" w on w."userId"=u.id
   where u."phoneE164" in ('+255712000101','+255712000105') order by 1`);

/** Place one quick bet and return the market id the player actually landed on. */
async function bet(page, side) {
  await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("button", { timeout: 30_000 });
  await page.waitForTimeout(2_500);                       // let the board paint its round

  // 🔴 THE STAKE CHIPS ARE `role="radio"` IN A `role="radiogroup"`, NOT buttons.
  // `getByRole("button", {name: /5K/})` matches NOTHING and times out — which looks like a
  // missing control on a page whose markup is in fact better than a plain button group.
  // They are `<button type="button" role="radio">`, so querySelectorAll("button") DOES find
  // them, and that mismatch is exactly what sent two earlier runs chasing a phantom.
  // Their name also changes with hydration: `TZS 5,000` server-rendered → `5K` after.
  await page.getByRole("radio", { name: /^(5K|TZS 5,000)$/i }).first().click();
  const sideBtn = page.getByRole("button", { name: side === "UP" ? /^up —/i : /^down —/i }).first();
  await sideBtn.waitFor({ state: "visible", timeout: 15_000 });
  const label = await sideBtn.getAttribute("aria-label");
  await sideBtn.click();

  // A confirm step may or may not exist — click it only if it appears, and never blind-
  // dismiss anything (the shared primer-dismisser once killed the very confirmation a run
  // was looking for, and the navigation it caused was reported as a product defect).
  const confirm = page.getByRole("button", { name: /^confirm/i }).first();
  if (await confirm.count().then((n) => n > 0).catch(() => false)) {
    await confirm.click({ timeout: 5_000 }).catch(() => {});
  }
  await page.waitForTimeout(3_000);
  return label;
}

const { b, ctx } = await browser();

try {
  const before = wallets();
  r.note(`wallets before: ${JSON.stringify(before)}`);

  const aPage = await ctx.newPage();
  const eCtx = await (await browser()).ctx;               // echo needs its own session
  const ePage = await eCtx.newPage();
  await login(aPage, "alpha");
  await login(ePage, "echo");
  r.check("both players signed in", true);

  let decisive = null;

  for (let attempt = 1; attempt <= MAX_ROUNDS && !decisive; attempt++) {
    r.note(`\n--- attempt ${attempt}/${MAX_ROUNDS} ---`);

    const aLabel = await bet(aPage, "UP");
    const eLabel = await bet(ePage, "DOWN");
    r.note(`alpha clicked "${aLabel}" · echo clicked "${eLabel}"`);
    await shot(aPage, `C-attempt${attempt}-alpha`);

    // Which round did each actually land on? The DB is the authority, not the label.
    const placed = sql(`
      select u."phoneE164" as phone, p."marketId", p.side, p.stake::text as stake,
             p.status, m."resolutionAt"::text as boundary
        from "Position" p
        join "User" u on u.id = p."userId"
        join "PredictionMarket" m on m.id = p."marketId"
       where m."productLine"='UPDOWN' and p."placedAt" > now() - interval '4 minutes'
       order by p."placedAt" desc`);
    r.note(`positions just placed: ${JSON.stringify(placed)}`);

    const aPos = placed.find((x) => x.phone === "+255712000101");
    const ePos = placed.find((x) => x.phone === "+255712000105");
    if (!r.check(`attempt ${attempt}: both bets were accepted`, !!aPos && !!ePos,
      `alpha=${!!aPos} echo=${!!ePos}`)) continue;
    if (!r.check(`attempt ${attempt}: both landed on the SAME round`,
      aPos.marketId === ePos.marketId, `${aPos.marketId} vs ${ePos.marketId}`)) continue;
    r.check(`attempt ${attempt}: they took OPPOSITE sides`, aPos.side !== ePos.side,
      `${aPos.side} vs ${ePos.side}`);

    // Wait past the boundary, then for settlement to land.
    const boundaryMs = new Date(aPos.boundary + "Z").getTime();
    const waitMs = Math.max(0, boundaryMs - Date.now()) + 90_000;
    r.note(`boundary ${aPos.boundary}Z — waiting ${Math.round(waitMs / 1000)}s for settlement`);
    await aPage.waitForTimeout(waitMs);

    const settled = sql(`
      select u."phoneE164" as phone, p.side, p.status, p.stake::text as stake,
             p."finalPayout"::text as payout, m.status as market_status,
             m."resolvedOutcome" as outcome,
             ud."openPrice"::text as open, ud."closePrice"::text as close,
             ud."marginBps" as bps, ud."upTarget"::text as up_t, ud."downTarget"::text as dn_t
        from "Position" p
        join "User" u on u.id=p."userId"
        join "PredictionMarket" m on m.id=p."marketId"
        join "UpDownRound" ud on ud."marketId"=m.id
       where p."marketId"='${aPos.marketId}' order by u."phoneE164"`);
    r.note(`settled: ${JSON.stringify(settled)}`);

    const statuses = settled.map((x) => x.status);
    if (statuses.includes("WIN") && statuses.includes("LOSS")) {
      decisive = { marketId: aPos.marketId, settled };
    } else if (statuses.every((s) => s === "VOID")) {
      r.note(`round VOIDED inside the band (open ${settled[0]?.open} → close ${settled[0]?.close}, ` +
             `band ${settled[0]?.dn_t}–${settled[0]?.up_t}) — refunded, retrying on the next round`);
    } else {
      r.note(`unexpected statuses ${JSON.stringify(statuses)} — retrying`);
    }
  }

  // ── THE VERDICT ───────────────────────────────────────────────────────────
  if (r.check("a round resolved DECISIVELY — one real winner, one real loser", !!decisive,
    `no decisive round in ${MAX_ROUNDS} attempts (all voided inside the band)`)) {
    const win = decisive.settled.find((x) => x.status === "WIN");
    const loss = decisive.settled.find((x) => x.status === "LOSS");
    r.note(`WIN  ${win.phone} ${win.side} stake ${win.stake} → payout ${win.payout}`);
    r.note(`LOSS ${loss.phone} ${loss.side} stake ${loss.stake} → payout ${loss.payout}`);

    r.check("the winner was paid MORE than their stake", Number(win.payout) > Number(win.stake),
      `${win.payout} vs ${win.stake}`);
    r.check("the loser received exactly zero", Number(loss.payout) === 0, String(loss.payout));
    r.check("the market resolved (not voided)", decisive.settled[0].market_status === "RESOLVED",
      decisive.settled[0].market_status);

    // The money actually moved in the wallets — the claim the DOM can never prove.
    const after = wallets();
    r.note(`wallets after: ${JSON.stringify(after)}`);
    const moved = before.some((bw) => {
      const aw = after.find((x) => x.phone === bw.phone);
      return aw && aw.balance !== bw.balance;
    });
    r.check("real wallet balances changed", moved);
  }
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
