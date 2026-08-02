/**
 * PHASE B — Up & Down GENERATION and RESOLUTION, from the operator's side, on production.
 *
 * Phase C proved a round pays. This asks the other half of Ali's question: can an operator
 * SEE the machine working — chains emitting, rounds resolving, prices confirmed — and does
 * the player-facing settlement proof for a real settled round tell the truth?
 *
 * Driven as the TRADING officer (`/admin/updown` is a `trading` route). Read-only: it
 * starts, stops and re-points nothing. Chain state on production belongs to Ali and Jay.
 *
 * The proof card is checked against the ROUND'S OWN numbers from the database, because
 * E-39 was precisely a card that printed a true band and a false rule underneath it.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MARKET = process.env.MARKET_ID ?? "mkt_1a8078a879355cc6822a";
const r = recorder("PHASE B — Up & Down generation + resolution, operator side");

function sql(query) {
  const f = join(tmpdir(), `50pick-b-${process.pid}.sql`);
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

const { b, ctx } = await browser();

try {
  // ── Ground truth for the round whose proof card we are about to read ──────
  const [round] = sql(`
    select ud.id as round_id, a.key as asset, ch."durationMinutes" as dur,
           ud."openPrice"::text as open, ud."closePrice"::text as close,
           ud."marginBps" as bps, ud."upTarget"::text as up_t, ud."downTarget"::text as dn_t,
           ud."boundaryAt"::text as boundary, m."resolvedOutcome" as outcome, m.status
      from "UpDownRound" ud
      join "UpDownChain" ch on ch.id = ud."chainId"
      join "UpDownAsset" a on a.id = ch."assetId"
      join "PredictionMarket" m on m.id = ud."marketId"
     where ud."marketId" = '${MARKET}'`);
  r.note(`round: ${JSON.stringify(round)}`);
  r.check("the round has BOTH confirmed prices (a resolution needs two)",
    !!round?.open && !!round?.close, JSON.stringify(round));

  // Generation health, straight from the tables the operator screens render.
  const gen = sql(`
    select
      (select count(*)::text from "UpDownRound" where "boundaryAt" > now() - interval '3 hours') as rounds_3h,
      (select count(*)::text from "UpDownObservation"
        where "boundaryAt" > now() - interval '3 hours' and state='CONFIRMED') as confirmed_3h,
      (select count(*)::text from "UpDownObservation"
        where "boundaryAt" > now() - interval '3 hours' and state<>'CONFIRMED') as unconfirmed_3h,
      (select count(*)::text from "PredictionMarket"
        where "productLine"='UPDOWN' and status='RESOLVED') as resolved_all,
      (select count(*)::text from "UpDownChain" where state='RUNNING') as chains_running`);
  r.note(`generation health: ${JSON.stringify(gen[0])}`);
  r.check("chains are emitting rounds", Number(gen[0].rounds_3h) > 0, JSON.stringify(gen[0]));
  r.check("the feed is confirming prices", Number(gen[0].confirmed_3h) > 0, JSON.stringify(gen[0]));
  r.check("rounds are resolving, not only voiding", Number(gen[0].resolved_all) > 0, JSON.stringify(gen[0]));

  // ── The OPERATOR view ─────────────────────────────────────────────────────
  const page = await ctx.newPage();
  await login(page, "trading");

  for (const [label, path] of [["overview", "/admin/updown"], ["rounds", "/admin/updown/rounds"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_500);
    const t = await bodyText(page);
    await shot(page, `B-admin-${label}`);
    r.check(`operator: ${path} renders (not a refusal, not the login page)`,
      !/admin sign in|you do not have access/.test(t) && page.url().includes(path),
      `url=${page.url()} · ${t.slice(0, 140)}`);
    r.check(`operator: ${path} shows chain/round state, not an empty shell`,
      /running|stopped|paused|resolved|void|boundary|round/.test(t), t.slice(0, 160));
  }

  // E-36's market column — the shut-market gate must be visible to the operator.
  const ov = await bodyText(page.url().includes("rounds") ? page : page);
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const overview = await bodyText(page);
  r.check("operator: the overview names each market's OPEN/CLOSED state (E-36's calendar)",
    /open|closed|opens \d|shut/.test(overview), overview.slice(0, 200));

  // ── The player-facing SETTLEMENT PROOF for this exact round (E-39's surface) ─
  await page.goto(`${BASE}/updown/${round.round_id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const proof = await bodyText(page);
  await shot(page, "B-proof-card");

  const has = (n) => {
    const x = Number(n);
    return proof.includes(x.toLocaleString("en-US", { minimumFractionDigits: 2 }).toLowerCase())
      || proof.includes(String(x)) || proof.includes(x.toLocaleString("en-US").toLowerCase());
  };
  r.check("proof card: shows the OPEN price the round actually used", has(round.open), round.open);
  r.check("proof card: shows the CLOSE price the round actually used", has(round.close), round.close);
  r.check("proof card: shows the winning band, not just the prices",
    has(round.up_t) || has(round.dn_t), `${round.dn_t} / ${round.up_t}`);

  // ⛔ E-39: at a NON-ZERO margin the card must NOT print the margin-zero rule
  // ("void if it does not move"), because a round that moved and still voided reads as
  // theft on the very card a player would take to an objection.
  const zeroRule = /void if it does not move|voided if the price does not move/.test(proof);
  r.check(`proof card: does NOT state the margin-ZERO rule at ${round.bps} bps (E-39)`,
    round.bps === 0 ? true : !zeroRule,
    zeroRule ? "the legacy margin-0 sentence is showing under a real band" : "");
  r.check("proof card: states the banded rule (stayed inside / cleared the band)",
    /band|target|inside/.test(proof), proof.slice(0, 200));
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
