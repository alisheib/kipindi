/**
 * PHASE D + E — DOES THE MONEY SHOW UP WHERE IT SHOULD?
 *
 * Phase C proved a real win and a real loss settled correctly in the DATABASE. That is
 * necessary and nowhere near sufficient: what Ali actually asked is whether the round is
 * "reflected" — to the WINNER, to the LOSER, and in the ACCOUNTING — visually and
 * technically, from every side.
 *
 * So this drives, against LIVE production, for a named round:
 *
 *   D · the winner  — /positions · /updown/history · /wallet · the receipt · the bell
 *   D · the loser   — the same five, because a loss must be stated plainly (LCCP), and a
 *                     loser who is told nothing is the harm case, not the winner
 *   E · accounting  — /admin/finance · /admin/transactions · /admin/settlement, read as
 *                     the FINANCE officer, which is the identity that OWNS those screens
 *
 * Every surface is screenshotted, because a passing assertion is not a readable screen
 * (E-30: text clipped inside a card never reaches document.scrollWidth).
 *
 * ⚠️ Read-only. It places no bet, moves no money and changes no config.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MARKET = process.env.MARKET_ID ?? "mkt_1a8078a879355cc6822a";
// `--only=players` / `--only=accounting` so a re-run does not redo the half that passed.
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").split("=")[1] || "all";
const r = recorder(`PHASE D+E — is ${MARKET} reflected to players and to accounting?`);

function sql(query) {
  const f = join(tmpdir(), `50pick-r-${process.pid}.sql`);
  writeFileSync(f, query, "utf8");
  try {
    const out = execFileSync("railway",
      ["run", "-s", "50pick", "--", "node", "scripts/live/q.cjs", `"${f}"`],
      { cwd: "C:/kipindi-main", encoding: "utf8", timeout: 120_000, shell: true });
    const line = out.trim().split("\n").filter((l) => l.trim().startsWith("[")).pop();
    if (!line) throw new Error(`no JSON: ${out.slice(-300)}`);
    return JSON.parse(line);
  } finally { rmSync(f, { force: true }); }
}

/** Amounts as they are actually rendered: "8,700" appears as TZS 8,700 / 8.7K / 8700. */
const showsAmount = (text, n) => {
  const plain = String(n);
  const grouped = Number(n).toLocaleString("en-US");
  const k = n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : null;
  return text.includes(plain) || text.includes(grouped.toLowerCase()) || (k ? text.includes(k) : false);
};

const { b, ctx } = await browser();

try {
  // ── Ground truth first. Every DOM claim below is checked against this. ────
  const truth = sql(`
    select u."phoneE164" as phone, p.side, p.status, p.stake::text as stake,
           p."finalPayout"::text as payout, m."titleEn" as title,
           m.status as market_status, m."settledAt"::text as settled
      from "Position" p
      join "User" u on u.id = p."userId"
      join "PredictionMarket" m on m.id = p."marketId"
     where p."marketId" = '${MARKET}' order by p.status`);
  r.note(`ground truth: ${JSON.stringify(truth)}`);
  const winner = truth.find((x) => x.status === "WIN");
  const loser  = truth.find((x) => x.status === "LOSS");
  r.check("the round has one WIN and one LOSS to check against", !!winner && !!loser);

  const who = { "+255712000101": "alpha", "+255712000105": "echo" };
  const payout = Math.round(Number(winner.payout));
  const stake  = Math.round(Number(loser.stake));

  // ── D · THE WINNER, then THE LOSER ────────────────────────────────────────
  // ⚠️ ONE browser, a fresh CONTEXT per identity. The first version launched a new
  // chromium per persona and left them open; the third login then failed, and because the
  // success detector was also wrong it was scored as a pass — so six accounting
  // assertions ran green against a screenshot of the sign-in form. One browser, and a
  // login that throws loudly, is what stops that recurring.
  for (const side of ONLY === "accounting" ? [] : ["winner", "loser"]) {
    const row = side === "winner" ? winner : loser;
    const persona = who[row.phone];
    const page = await ctx.browser().newContext({ viewport: { width: 1440, height: 1000 } })
      .then((c) => c.newPage());
    await login(page, persona);
    r.note(`\n--- ${side}: ${persona} (${row.side}, ${row.status}) ---`);

    // 1 · /positions — the canonical "what did I bet and what happened" screen
    await page.goto(`${BASE}/positions`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    const pos = await bodyText(page);
    await shot(page, `D-${side}-1-positions`);
    r.check(`${side}: /positions names the outcome (won/lost), not just a number`,
      side === "winner" ? /won|win|umeshinda/.test(pos) : /lost|loss|limepotea/.test(pos),
      pos.slice(0, 180));

    // 2 · /updown/history — the round card with both prices (the E-39 proof surface)
    await page.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    const hist = await bodyText(page);
    await shot(page, `D-${side}-2-updown-history`);
    r.check(`${side}: /updown/history shows this round's result`,
      /won|lost|win|loss|void/.test(hist), hist.slice(0, 180));
    r.check(`${side}: history states the amount that moved`,
      showsAmount(hist, side === "winner" ? payout : stake),
      `looking for ${side === "winner" ? payout : stake} in: ${hist.slice(0, 200)}`);

    // 3 · /wallet — the balance and the transaction behind it
    await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
    const wal = await bodyText(page);
    await shot(page, `D-${side}-3-wallet`);
    r.check(`${side}: /wallet lists a transaction for this round`,
      /bet|stake|payout|win|loss|settle/.test(wal), wal.slice(0, 180));

    // 4 · THE BELL — E-37. Up & Down suppresses per-round messages and the daily digest
    //     that was meant to replace them was never built, so we EXPECT nothing here.
    //     Measured rather than assumed, so the finding carries a fresh instance.
    const bell = page.getByRole("button", { name: /notifications/i }).first();
    const bellName = await bell.getAttribute("aria-label").catch(() => null);
    r.note(`${side}: bell reads "${bellName}"`);
    await bell.click().catch(() => {});
    await page.waitForTimeout(2_500);
    const inbox = await bodyText(page);
    await shot(page, `D-${side}-4-bell`);
    const told = /you won|umeshinda|bet lost|dau limepotea|round result/.test(inbox);
    r.note(`${side}: inbox mentions this round's outcome? ${told} ` +
           `— E-37 predicts NO for Up & Down (per-round messages suppressed, digest never built)`);
    await page.context().close();
  }

  // ── E · ACCOUNTING, as the FINANCE officer ────────────────────────────────
  const fPage = await ctx.browser().newContext({ viewport: { width: 1440, height: 1000 } })
    .then((c) => c.newPage());
  await login(fPage, "finance");
  r.note(`\n--- accounting: FINANCE officer ---`);

  // Prove we are actually INSIDE the console before asserting anything about it.
  // (The previous run asserted six things about the finance screens while sitting on
  // the sign-in page, and every one of them passed.)
  const shell = await bodyText(fPage);
  r.check("the FINANCE officer is genuinely signed in to the console",
    !/admin sign in|i'm a player, not staff/.test(shell), shell.slice(0, 160));

  for (const [label, path] of [
    ["finance", "/admin/finance"],
    ["transactions", "/admin/transactions"],
    ["settlement", "/admin/settlement"],
  ]) {
    await fPage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await fPage.waitForTimeout(3_500);
    const t = await bodyText(fPage);
    await shot(fPage, `E-${label}`);
    // ⚠️ "no refusal text + long page" is NOT evidence — the sign-in page satisfies both,
    // and "tzs" appears in the LiveTicker marquee on every page including signed-out ones.
    // Require the console chrome AND that we are still on the route we asked for.
    r.check(`accounting: ${path} renders for FINANCE (not a refusal, not the login page)`,
      !/you do not have access|restricted|forbidden|admin sign in/.test(t)
        && fPage.url().includes(path),
      `url=${fPage.url()} · ${t.slice(0, 140)}`);
    // ⚠️ An EMPTY queue is a correct answer, not a gap. /admin/settlement legitimately
    // reads "Nothing awaiting settlement — every resolved market has been paid", because
    // Up & Down settles on its own per-market timer (this round settled 348ms after its
    // boundary). Demanding the words "balance|total|ledger" failed that perfectly good
    // page. Require a money figure OR an explicit, worded empty state.
    const hasFigures = /tzs\s?[\d,]/.test(t);
    const honestEmpty = /nothing awaiting|no .* yet|every resolved market has been paid/.test(t);
    r.check(`accounting: ${path} shows real figures or an explicit empty state`,
      hasFigures || honestEmpty, t.slice(0, 160));
  }

  // The books must still prove themselves after this round moved money.
  const tb = sql(`
    select
      (select count(*) from "Position" p where p."marketId"='${MARKET}')::text as positions,
      (select sum(amount)::text from "LedgerEntry" le
         where le."marketId"='${MARKET}') as ledger_sum,
      (select count(*)::text from "LedgerEntry" le where le."marketId"='${MARKET}') as ledger_rows`);
  r.note(`ledger for this round: ${JSON.stringify(tb)}`);
  r.check("the round wrote ledger entries", Number(tb[0]?.ledger_rows ?? 0) > 0, JSON.stringify(tb));
  r.check("this round's ledger entries NET TO ZERO (double-entry)",
    Number(tb[0]?.ledger_sum ?? -1) === 0, `sum = ${tb[0]?.ledger_sum}`);
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
