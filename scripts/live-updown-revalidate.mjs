/**
 * FULL REVALIDATION of the Up & Down lane, on LIVE PRODUCTION.
 *
 * Ali, 2026-08-03: *"revalidate everything we made — generation, resolution, playing — all
 * clear, final and tested, and it helps admins not to make mistakes or misunderstand what
 * is going on."* Plus: the evidence excerpt must be gone for players and kept for staff.
 *
 * So this is the single run that re-proves the whole lane after four deploys, and it
 * checks the two things that are easy to break separately:
 *   · GENERATION  — chains emit, the feed confirms, the operator can see the state
 *   · RESOLUTION  — rounds decide, the proof card tells the truth, and the money ties
 *   · PLAYING     — the board is usable and the round page offers a real stake control
 *   · CLARITY     — the console explains WHY, in the failing states as much as the good
 *                   ones (a shut market, a stale feed, a 100% void rate)
 *   · PRIVACY     — the raw provider blob is staff-only, checked from BOTH sides
 *
 * ⛔ Read-only. It places no bet, starts no chain and creates no asset.
 */
import { BASE, bodyText, browser, login, recorder, shot } from "./live/harness.mjs";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const r = recorder("Up & Down — full revalidation on production");

function sql(query) {
  const f = join(tmpdir(), `50pick-rv-${process.pid}.sql`);
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
  // ══ 1 · GENERATION, from the data the operator screens render ══════════════
  const [gen] = sql(`
    select
      (select count(*)::text from "UpDownRound" where "boundaryAt" > now() - interval '2 hours') as rounds_2h,
      (select count(*)::text from "UpDownObservation"
        where "boundaryAt" > now() - interval '2 hours' and state='CONFIRMED') as confirmed_2h,
      (select count(*)::text from "UpDownChain" where state='RUNNING') as running,
      (select count(*)::text from "PredictionMarket" where "productLine"='UPDOWN' and status='RESOLVED') as resolved,
      (select count(*)::text from "Position" p join "PredictionMarket" m on m.id=p."marketId"
        where m."productLine"='UPDOWN' and p.status='OPEN') as open_positions`);
  r.note(`generation: ${JSON.stringify(gen)}`);
  r.check("chains are still emitting rounds", Number(gen.rounds_2h) > 0, JSON.stringify(gen));
  r.check("the feed is still confirming prices", Number(gen.confirmed_2h) > 0, JSON.stringify(gen));
  r.check("rounds still resolve, not only void", Number(gen.resolved) > 0, JSON.stringify(gen));

  // ══ 2 · RESOLUTION — the money on a real settled round still ties ══════════
  const [tie] = sql(`
    select m.id,
           (select count(*)::text from "Position" p where p."marketId"=m.id) as positions,
           (select coalesce(sum(le.amount),0)::text from "LedgerEntry" le where le."marketId"=m.id) as ledger_sum,
           (select count(*)::text from "LedgerEntry" le where le."marketId"=m.id) as ledger_rows
      from "PredictionMarket" m
     where m."productLine"='UPDOWN' and m.status='RESOLVED' and m."settledAt" is not null
       -- ⚠️ ...AND SOMEBODY ACTUALLY PLAYED IT. A round with no bets has no money to
       -- move and therefore no ledger rows, which is correct, not a hole in the books.
       -- The first version of this check picked the newest settled round of any kind and
       -- reported an unplayed one as a missing ledger.
       and (select count(*) from "Position" p where p."marketId"=m.id) > 0
     order by m."settledAt" desc limit 1`);
  r.note(`newest settled round: ${JSON.stringify(tie)}`);
  r.check("the newest settled round wrote ledger entries", Number(tie.ledger_rows) > 0, JSON.stringify(tie));
  r.check("…and they NET TO ZERO (double-entry holds)", Number(tie.ledger_sum) === 0, tie.ledger_sum);

  // ══ 3 · THE OPERATOR VIEW — does it EXPLAIN, including in failing states? ══
  const officer = await ctx.newPage();
  await login(officer, "trading");
  await officer.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await officer.waitForTimeout(4_000);
  const ov = await bodyText(officer);
  await shot(officer, "R1-admin-overview");

  r.check("the overview names each chain's RUNNING/STOPPED state",
    /running|stopped|paused/.test(ov), ov.slice(0, 160));
  // ⚠️ DO NOT require both states at once. This asserted an open market AND a shut one
  // were both on screen, which is only true while something is closed — and it failed at
  // 22:07 UTC Sunday for the best possible reason: the metals week had just reopened at
  // 22:00, exactly on schedule, so every market legitimately read `open`. Test the
  // PROPERTY, not the hour.
  r.check("it shows a MARKET column carrying a real session state",
    /market/.test(ov) && /open|closed/.test(ov), ov.slice(0, 160));
  const anyShut = /closed · opens/.test(ov);
  r.check(anyShut
    ? "a shut market names WHEN it reopens, not just 'closed'"
    : "nothing is shut right now, so there is no reopen time to name (correct)",
    anyShut ? /opens \d{2}:\d{2} utc/.test(ov) : true, ov.slice(0, 200));
  r.check("it shows a VOID RATE per chain — the number that exposes a broken asset",
    /void rate/.test(ov), "");
  r.check("the margin is shown as scheduled, not a bare default",
    /·\s?sched/.test(ov), "");

  // The failing states must be legible, which is the whole ask.
  r.check("a 100%-void chain is visible as such (SOL/ETH are the live examples)",
    /100%/.test(ov), ov.slice(0, 200));

  // ══ 4 · THE GUIDED FORM still guides (E-46) ════════════════════════════════
  const admin = await ctx.browser().newContext({ viewport: { width: 1440, height: 1000 } })
    .then((c) => c.newPage());
  await login(admin, "admin");
  await admin.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await admin.waitForTimeout(3_500);
  await admin.getByRole("button", { name: /\+ add asset/i }).first().click();
  await admin.waitForTimeout(1_500);
  const f = await bodyText(admin);
  r.check("the Add-asset form still locks what the symbol decides",
    f.includes("set by the symbol"), f.slice(0, 160));
  r.check("…and still states the trading window before anything is created",
    /24\/7|22:00 utc/.test(f), f.slice(0, 200));
  const cat = await admin.locator('input[name="category"][type="hidden"]').inputValue().catch(() => "");
  r.check("…and the category is still a locked hidden value", !!cat, cat);
  await shot(admin, "R2-add-asset-form");

  // ══ 5 · PLAYING — the board and the round page work for a real player ══════
  const player = await ctx.browser().newContext({ viewport: { width: 1440, height: 1000 } })
    .then((c) => c.newPage());
  await login(player, "alpha");
  await player.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await player.waitForTimeout(3_500);
  const board = await bodyText(player);
  await shot(player, "R3-player-board");
  r.check("the player board renders a live round", /up|down/.test(board) && board.length > 300);
  r.check("the stake chips are present for a player",
    (await player.getByRole("radio").count()) > 0);
  r.check("both sides are offered",
    (await player.getByRole("button", { name: /^up —/i }).count()) > 0 &&
    (await player.getByRole("button", { name: /^down —/i }).count()) > 0);

  // ══ 6 · PRIVACY — the raw blob, checked from BOTH sides ════════════════════
  const [settled] = sql(`
    select ud.id from "UpDownRound" ud
      join "PredictionMarket" m on m.id = ud."marketId"
     where m.status='RESOLVED' and ud."closePrice" is not null
     order by ud."boundaryAt" desc limit 1`);
  const url = `${BASE}/updown/${settled.id}`;
  r.note(`proof card under test: ${settled.id}`);

  await player.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await player.waitForTimeout(3_000);
  const playerProof = await bodyText(player);
  const playerHtml = await player.content();
  await shot(player, "R4-proof-as-player");

  r.check("PLAYER: the settlement proof still renders", /settlement proof/.test(playerProof));
  r.check("PLAYER: still sees both prices and the rule",
    /open/.test(playerProof) && /close/.test(playerProof) && /target|band/.test(playerProof));
  r.check("PLAYER: the evidence excerpt is GONE", !/evidence excerpt/.test(playerProof),
    playerProof.slice(0, 200));
  // The real test: the bytes must not be in the HTML at all.
  r.check("PLAYER: the raw provider payload is not in the page source either",
    !/last_quote_at|fifty_two_week|previous_close/.test(playerHtml),
    "raw vendor JSON found in the player's HTML");

  await officer.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await officer.waitForTimeout(3_000);
  const staffProof = await bodyText(officer);
  await shot(officer, "R5-proof-as-staff");
  r.check("STAFF: the evidence excerpt is still there", /evidence excerpt/.test(staffProof),
    staffProof.slice(0, 200));
  r.check("STAFF: …and is labelled staff only", /staff only/.test(staffProof));
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
