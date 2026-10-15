/**
 * test:journey-measures-view — the S13 view (`src/lib/server/journey-measures.ts`, S13-PLAN WP6): one model for the panel and
 * the files, composed from the pure core over the reads, with the launch watch. In process, on the memory store.
 *
 *   npm run test:journey-measures-view
 *   npm run red:journey-measures-view     (--prove-red: each defect planted IN MEMORY must be caught by its own case)
 *
 *   V.1  not launched: the baseline so far, every after column "Not launched", the baseline report due
 *   V.2  launched, partial: after 7 counts the days so far, marked "k of 7 days"
 *   V.3  full: 7/14/28 complete; the figures are the fixtures' arithmetic; the change in points
 *   V.4  a rollback day is skipped and named, and the windows take the next full day
 *   V.5  a campaign: only measure 2 splits; the campaign table, a visit-only tag named
 *   V.6  each source failing ALONE makes exactly its cells "could not be read"; the launch record failing makes every cell so
 *   V.7  a small sample · V.8 held at 100 · V.9 no offer and not recorded
 *   V.10 the launch watch: the trigger lines (70% of the before mean for three days; 80% of the before confirm rate)
 *   V.11 the harm rows and S16's verdict only for a caller holding compliance VIEW
 *   V.12 S9's merged records: measures 3 and 4 after are figures, and the reference row's after counts
 *   V.13 a counting gap (visits but no counter row) is dropped from both halves and named
 *   V.14 a follow-up that has not passed is left out and counted as waiting
 *   V.15 the 60-second memo, and a fresh read for the files
 */
process.exitCode = 1;
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

const V = await import("../src/lib/server/journey-measures.ts");
const JL = await import("../src/lib/server/journey-launch.ts");
const HW = await import("../src/lib/server/harm-watch.ts");
const { recordFunnel } = await import("../src/lib/server/journey-funnel.ts");
const { recordVisit } = await import("../src/lib/server/site-visits.ts");
const { db } = await import("../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const M = await import("../src/lib/journey/measures.ts");
type View = Awaited<ReturnType<typeof V.journeyMeasuresView>>;
const PROVE_RED = process.argv.includes("--prove-red");
const j = (v: unknown) => JSON.stringify(v);
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const eatAt = (day: string, h = 0, mi = 0) => Date.parse(`${day}T00:00:00.000Z`) - 3 * HOUR + h * HOUR + mi * MIN;
const iso = (t: number) => new Date(t).toISOString();

/* ── one scenario's world: its own dates, so scenarios never read each other's totals ── */
let uSeq = 0, tSeq = 0, pSeq = 0;
async function user(role: string, joined: number) {
  const id = `usr_jmv_${++uSeq}_${process.pid}`;
  await db.user.create({
    id, phoneE164: `+2556${String(uSeq).padStart(8, "0")}`, email: `${id}@t.tz`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null, acceptedTermsVersion: null,
    acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: iso(joined), updatedAt: iso(joined), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(joined), updatedAt: iso(joined) } as never);
  return id;
}
async function deposit(userId: string, at: number, extra: Record<string, unknown> = {}) {
  await db.txn.create({
    id: `txn_jmv_${++tSeq}_${process.pid}`, walletId: `wal_${userId}`, userId, type: "DEPOSIT", status: "CONFIRMED", amount: 1000, fee: 0, taxWithheld: 0,
    balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "deposit", positionId: null, amlReason: null,
    createdAt: iso(at - MIN), updatedAt: iso(at), completedAt: iso(at), idempotencyKey: null, ...extra,
  } as never);
}
const MKT = "mkt_jmvview";
await marketStore.set({
  id: MKT, titleEn: "Case", titleSw: "Kesi", titleZh: null, category: "sports", sourceUrl: "https://example.com", resolutionCriterion: "Case",
  resolutionCriterionSw: null, resolutionCriterionZh: null, resolutionAt: "2030-01-01T00:00:00.000Z", selectionClosedAt: null, status: "LIVE",
  yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null, resolutionStage1By: null, resolutionStage1At: null,
  resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null, settledAt: null, reopenedAt: null, reopenCount: null,
  productLine: "MARKET", proposedBy: "usr_none", createdAt: iso(Date.now()), updatedAt: iso(Date.now()),
} as never);
async function bet(userId: string, at: number) {
  await positionStore.set({ id: `pos_jmv_${++pSeq}`, userId, marketId: MKT, side: "YES", stake: 500, bonusStakeTzs: 0, potentialPayout: 1000, status: "OPEN", finalPayout: null, placedAt: iso(at), settledAt: null, idempotencyKey: null, houseBotId: null });
}
const count = async (day: string, step: string, origin: string, variant: string, n: number, campaign = "") => {
  for (let i = 0; i < n; i++) await recordFunnel({ step, origin, variant, utmSource: campaign ? "facebook" : "", utmCampaign: campaign }, eatAt(day, 12));
};
const views = async (day: string, n: number) => { for (let i = 0; i < n; i++) await recordVisit({ p: "/", r: "", s: "", m: "", c: "", e: false }, eatAt(day, 10)); };
const record = (since: number, moves: Array<[number, string]>) => ({
  v: 1, observedSince: iso(since), gap: null,
  transitions: moves.map(([at, state]) => ({ at: iso(at), state, source: "test", processStartedAt: iso(since) })),
});
const addDays = M.addDays;

/**
 * THE WORLD. Before: 14 days of the old journey from `b0` (2 home opens and 8 board opens a day, 20 home views, 3 dial bets,
 * 1 dial and 2 Up & Down shortfall notices). After: from `l1` (the day after launch), the new journey (4 home opens, 6 card
 * opens, 20 home views, 4 sheet bets, 2 sheet notices). Rows: per side, two new players (one bets within 24 h), two
 * deposits (one followed by a bet), and before launch one Up & Down shortfall deposit.
 */
async function world(b0: string, afterDays: number, opts: { rollbackDay?: string; afterBets?: number; afterFailed?: number; gapDay?: string; campaign?: string } = {}) {
  for (let i = 0; i < 14; i++) {
    const d = addDays(b0, i);
    if (d === opts.gapDay) { await views(d, 20); continue; } // a counting gap: visits, no counter row at all
    await count(d, "sheet_open", "home", "old", 2); await count(d, "sheet_open", "board", "old", 8);
    await count(d, "bet", "dial", "old", 3); await count(d, "low_balance", "dial", "old", 1); await count(d, "low_balance", "updown", "old", 2);
    await views(d, 20);
    for (let k = 0; k < 2; k++) await deposit(await user("FINANCE", eatAt(d, 1)), eatAt(d, 2)); // staff deposits: never counted
  }
  const l1 = addDays(b0, 15); // b0+14 is the launch day
  for (let i = 0; i < afterDays; i++) {
    const d = addDays(l1, i);
    if (d === opts.gapDay) { await views(d, 20); continue; }
    await count(d, "sheet_open", "home", "new", 4); await count(d, "sheet_open", "card", "new", 6, i === 0 && opts.campaign ? opts.campaign : "");
    await count(d, "bet", "sheet", "new", opts.afterBets ?? 4, i === 0 && opts.campaign ? opts.campaign : ""); await count(d, "low_balance", "sheet", "new", 2);
    await views(d, 20);
  }
  if (opts.campaign) {
    // Landing visits on another page, so the home page's views stay 20 a day.
    await recordVisit({ p: "/markets", r: "x.com", s: "facebook", m: "cpc", c: opts.campaign, e: true }, eatAt(l1, 9));
    await recordVisit({ p: "/markets", r: "x.com", s: "facebook", m: "cpc", c: `${opts.campaign}!`, e: true }, eatAt(l1, 9));
  }
  // Rows — before: day b0+1 and b0+2; after: l1 and l1+1.
  const sides: Array<[string, string]> = [[addDays(b0, 1), addDays(b0, 2)], [l1, addDays(l1, 1)]];
  for (const [d1, d2] of sides) {
    const p1 = await user("PLAYER", eatAt(d1, 10)); await bet(p1, eatAt(d1, 10, 30));           // within 24 h (30 min)
    const p2 = await user("AGENT", eatAt(d2, 8)); await bet(p2, eatAt(d2, 8) + 2 * DAY);         // after 24 h
    await deposit(p1, eatAt(d1, 12)); await bet(p1, eatAt(d1, 12, 10));                        // followed within 30 min
    await deposit(p2, eatAt(d2, 12));                                                           // not followed
  }
  const shortfaller = await user("PLAYER", eatAt(addDays(b0, 3), 9));
  await deposit(shortfaller, eatAt(addDays(b0, 3), 9, 30), { origin: "low_balance" });      // an Up & Down shortfall deposit, before
  const shortAfter = await user("PLAYER", eatAt(l1, 9));
  await deposit(shortAfter, eatAt(l1, 9, 30), { origin: "low_balance" });                    // a sheet shortfall deposit, after
  for (let i = 0; i < (opts.afterFailed ?? 0); i++) await db.txn.create({ id: `txn_jmv_f${++tSeq}`, walletId: `wal_${shortAfter}`, userId: shortAfter, type: "DEPOSIT", status: "FAILED", amount: 1000, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "x", positionId: null, amlReason: null, createdAt: iso(eatAt(addDays(l1, afterDays - 1 - (i % 3)), 14)), updatedAt: iso(eatAt(l1, 14)), completedAt: null, idempotencyKey: null } as never);
  const launchAt = eatAt(addDays(b0, 14), 15);
  const moves: Array<[number, string]> = [[eatAt(b0, 0) - DAY, "STAFF_PREVIEW"], [launchAt, "ACTIVE"]];
  if (opts.rollbackDay) moves.push([eatAt(opts.rollbackDay, 9), "WITHDRAWN"], [eatAt(opts.rollbackDay, 15), "ACTIVE"]);
  return { l1, launchAt, rec: record(eatAt(b0, 0) - DAY, moves) };
}

type Fns = { view: typeof V.journeyMeasuresView; setReads: typeof V.__setJourneyMeasuresReadsForTests };
const REAL: Fns = { view: V.journeyMeasuresView, setReads: V.__setJourneyMeasuresReadsForTests };

// Scenario A: launched, 30 full days after (now = l1 + 31 days 09:00), a rollback on l1+2, a campaign on l1.
const A = await world("2026-10-19", 31, { rollbackDay: "2026-11-05", campaign: "launch" });
// Scenario B: launched 3 days ago (partial) — its own dates.
const B = await world("2027-03-01", 2);
// Scenario C: not launched — a baseline, its own dates; the launch record says STAFF_PREVIEW only.
const C = await world("2027-06-01", 0);
// Scenario D: the trigger lines — question bets at 1 a day after launch (below 70% of 3) and deposits failing.
const D = await world("2027-09-01", 5, { afterBets: 1, afterFailed: 6 });
// Scenario E: a counting gap on a before day.
const E = await world("2028-01-03", 0, { gapDay: "2028-01-05" });
const nowA = eatAt(addDays(A.l1, 31), 9), nowB = eatAt(addDays(B.l1, 2), 9), nowC = eatAt("2027-06-15", 9), nowD = eatAt(addDays(D.l1, 5), 9), nowE = eatAt("2028-01-17", 9);

async function viewOf(fns: Fns, rec: unknown, nowMs: number, o: Partial<Parameters<typeof V.journeyMeasuresView>[0]> = {}): Promise<View> {
  JL.__setJourneyLaunchMemoryForTests(rec);
  return fns.view({ nowMs, fresh: true, ...o });
}

async function run(fns: Fns, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => { if (cond) log(`  PASS ${label}`); else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
  const row = (v: View, k: string) => v.rows.find((r) => r.def.key === k) as View["rows"][number];
  fns.setReads(null);
  try {
    /* V.1 · not launched */
    const recC = record(eatAt("2027-05-30"), [[eatAt("2027-05-30"), "STAFF_PREVIEW"]]);
    const c = await viewOf(fns, recC, nowC);
    ok("V.1 · not launched: the baseline so far (14 days ending yesterday), every after column 'Not launched', the baseline report due",
      c.launch.state === "not-launched" && c.windows.before.days.length === 14 && c.windows.before.days[13] === "2027-06-14"
        && c.rows.every((r) => [7, 14, 28].every((n) => r.after[n as 7].status === "not-launched")) && c.schedule.due.kind === "baseline"
        && row(c, "homeToSheet").before.text === "10.0%" && row(c, "sheetToBet").before.text === "30.0%", j({ s: c.launch.state, h: row(c, "homeToSheet").before, b: row(c, "sheetToBet").before }));

    /* V.2 · partial */
    const b = await viewOf(fns, B.rec, nowB);
    const b7 = row(b, "sheetToBet").after[7];
    ok("V.2 · launched two days ago: after 7 counts the two days so far, marked '2 of 7 days'",
      b.launch.state === "launched" && b.windows.after[7].days.length === 2 && j(b7.partial) === j({ counted: 2, asked: 7 }) && b7.text === "40.0%", j(b7));

    /* V.3 · full */
    const a = await viewOf(fns, A.rec, nowA);
    const a2 = row(a, "sheetToBet"), a1 = row(a, "homeToSheet");
    ok("V.3 · full: after 7/14/28 complete; measure 1 20.0% against 10.0%, measure 2 40.0% against 30.0%, changes +10.0 pts",
      a.windows.after[28].days.length === 28 && a1.after[28].text === "20.0%" && a1.before.text === "10.0%" && a2.after[7].text === "40.0%"
        && a2.changes[7]?.text === "+10.0 pts" && a1.changes[28]?.text === "+10.0 pts" && a2.after[28].partial === null, j({ a1: a1.after[28], ch: a2.changes[7] }));
    const r5 = row(a, "timeToFirstBet"), r4b = row(a, "depositToAnyBet");
    // Per side: three new players (one bets after 30 minutes, the AGENT after two days, the shortfall depositor never) and
    // three confirmed deposits (one followed within 30 minutes).
    ok("V.3b · the row measures: 1 of 3 new players bet within 24 h (median 30 min); 1 of 3 deposits followed within 30 min — on both sides",
      r5.before.text === "33.3%" && r5.before.n === 1 && r5.before.d === 3 && r5.after[28].text === "33.3%" && r5.median?.before === 30
        && r4b.before.n === 1 && r4b.before.d === 3 && r4b.after[28].n === 1 && r4b.after[28].d === 3, j({ r5: [r5.before, r5.median], r4b: r4b.before }));

    /* V.4 · rollback */
    ok("V.4 · the rollback day is skipped and named, and after 7 takes the next full day instead",
      !a.windows.after[7].days.includes("2026-11-05") && a.windows.after[7].skipped.some((s) => s.day === "2026-11-05") && a.windows.after[7].days.length === 7
        && a.windows.after[7].days[6] === "2026-11-10", j(a.windows.after[7]));

    /* V.5 · campaign */
    const ac = await viewOf(fns, A.rec, nowA, { campaign: "launch" });
    const split = row(ac, "sheetToBet").sinceLaunch;
    ok("V.5 · under a campaign only measure 2 has a figure (6 opens, 4 bets on its day); the others say 'not split by campaign'",
      split.status === "figure" && split.n === 4 && split.d === 6 && ac.rows.filter((r) => r.def.key !== "sheetToBet").every((r) => r.after[7].status === "not-split" || r.after[7].status === "unavailable"),
      j({ split, others: ac.rows.map((r) => r.after[7].status) }));
    const tab = a.campaigns.table;
    ok("V.5b · the campaign table lists each tag with its counts and landing visits; a tag only the visit counter saw is named so",
      tab.some((t) => t.campaign === "launch" && t.sheetOpens === 6 && t.bets === 4 && t.landingVisits === 1 && !t.visitOnly)
        && tab.some((t) => t.campaign === "launch!" && t.visitOnly && t.sheetOpens === 0), j(tab));

    /* V.6 · each source failing alone */
    const fail = () => Promise.reject(new Error("planted"));
    const SOURCES: Array<[string, Partial<Parameters<typeof V.__setJourneyMeasuresReadsForTests>[0] & object>, string[], string[]]> = [
      ["counters", { counterRows: fail }, ["homeToSheet", "sheetToBet", "shortToDeposit"], ["depositToAnyBet", "timeToFirstBet"]],
      ["views", { homeViewsByDay: fail }, ["homeToSheet"], ["sheetToBet", "depositToAnyBet", "timeToFirstBet"]],
      ["deposits", { confirmedDeposits: fail }, ["depositToAnyBet"], ["homeToSheet", "sheetToBet", "timeToFirstBet"]],
      ["bets", { betsOf: fail }, ["depositToAnyBet"], ["homeToSheet", "sheetToBet", "timeToFirstBet"]],
      ["joined", { joinedPlayers: fail }, ["timeToFirstBet"], ["homeToSheet", "sheetToBet", "depositToAnyBet"]],
    ];
    for (const [name, o, dark, lit] of SOURCES) {
      fns.setReads(o as never);
      const v = await viewOf(fns, A.rec, nowA);
      fns.setReads(null);
      ok(`V.6 · the ${name} read failing ALONE makes exactly its cells 'could not be read'; the rest keep their figures`,
        dark.every((k) => row(v, k).after[7].status === "unreadable" && row(v, k).after[7].text === "—") && lit.every((k) => row(v, k).after[7].status !== "unreadable")
          && v.sources[name as "counters"] === "unreadable", j({ name, statuses: v.rows.map((r) => [r.def.key, r.after[7].status]) }));
    }
    fns.setReads({ launch: () => Promise.reject(new Error("planted")) });
    const vl = await viewOf(fns, A.rec, nowA);
    fns.setReads(null);
    ok("V.6b · the launch record unreadable: every cell 'could not be read' (before and after cannot be told apart), never a guessed launch",
      vl.launch.state === "unreadable" && vl.rows.every((r) => r.before.status === "unreadable" && r.after[7].status === "unreadable"), j(vl.rows.map((r) => r.before.status)));

    /* V.7 · small · V.8 · held · V.9 · no offer / not recorded */
    ok("V.7 · a denominator under 30 is marked 'small sample' (3 new players)", r5.before.small && M.cellMarks(r5.before).includes("small sample"));
    const a2b = row(a, "sheetToBet").before;
    ok("V.8 · held: the old dial's repeated bets cannot pass the whole — a planted day of 30 dial bets on 10 opens is held at 100.0%, both halves printed",
      await (async () => {
        await count("2028-04-03", "sheet_open", "board", "old", 10); await count("2028-04-03", "bet", "dial", "old", 30);
        for (let i = 0; i < 13; i++) await count(addDays("2028-03-21", i), "sheet_open", "board", "old", 1);
        const vh = await viewOf(fns, record(eatAt("2028-03-01"), [[eatAt("2028-03-01"), "STAFF_PREVIEW"]]), eatAt("2028-04-04", 9));
        const h = row(vh, "sheetToBet").before;
        return h.status === "held" && h.text === "100.0%" && h.n === 30 && h.d === 23 && a2b.status === "figure";
      })());
    const s3 = row(a, "shortToDeposit").before, s4 = row(a, "depositToBet").before;
    ok("V.9 · measure 3 before is 'no offer' with its notices (14 dial notices), measure 4 before 'not recorded' — never 0%",
      s3.status === "no-offer" && s3.d === 14 && s3.tenths === null && s4.status === "not-recorded" && s4.tenths === null, j({ s3, s4 }));

    /* V.10 · the launch watch */
    const d = await viewOf(fns, D.rec, nowD);
    ok("V.10 · the launch watch: the before mean (3 question bets a day) and its 70% line; three full days at 1 a day are below it",
      d.watch.baseline.questionBetsPerDay === 3 && Math.abs((d.watch.lines.questionBets ?? 0) - 2.1) < 1e-9 && d.watch.betsBelowLine?.below === true
        && d.watch.betsBelowLine?.days.length === 3, j({ base: d.watch.baseline, line: d.watch.lines, below: d.watch.betsBelowLine }));
    ok("V.10b · the confirm rate over the trailing three days against 80% of the before rate (failures planted) is below the line; A's is not",
      d.watch.confirmTrailing?.below === true && a.watch.confirmTrailing?.below === false && a.watch.betsBelowLine?.below === false, j({ d: d.watch.confirmTrailing, a: a.watch.confirmTrailing }));

    /* V.11 · harm only for compliance VIEW */
    HW.__setHarmWatchMemoryForTests({ v: 1, days: [...a.windows.before.days.map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 })), ...a.windows.after[7].days.map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 }))].sort((x, y) => (x.day < y.day ? -1 : 1)) });
    const ah = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    ok("V.11 · without compliance VIEW the view carries no harm rows and no S16 verdict; with it, both",
      a.watch.harm === null && a.watch.bounds === null && ah.watch.harm !== null && ah.watch.bounds !== null && ah.watch.harm.before.rapidDeposit === 1, j({ h: ah.watch.harm?.before, b: ah.watch.bounds?.verdict }));
    ok("V.11b · S16's verdict on A: measures 1, 2 and 5 at or above, 3 and 4 have no baseline, harm level → in bounds",
      ah.watch.bounds?.verdict === "in-bounds" && ah.watch.bounds.measures.filter((m) => m.status === "excluded").length === 2, j(ah.watch.bounds));

    /* V.12 · S9 merged */
    const ref = a.reference;
    ok("V.12 · S9's records are live: measure 3 has a counted figure, measure 4 says no qualifying deposits, and the reference row counts both windows",
      row(a, "shortToDeposit").after[7].status === "figure" && row(a, "depositToBet").after[7].status === "none"
        && ref.before.status === "counts" && ref.before.deposits === 1 && ref.before.notices === 28 && ref.after[7].status === "counts" && a.s9 === true, j({ ref, s3a: row(a, "shortToDeposit").after[7], s4a: row(a, "depositToBet").after[7], s9: a.s9 }));

    /* V.13 · a counting gap */
    const e = await viewOf(fns, record(eatAt("2028-01-01"), [[eatAt("2028-01-01"), "STAFF_PREVIEW"]]), nowE);
    const eh = row(e, "homeToSheet").before;
    ok("V.13 · a day with visits but no counter row is dropped from both halves and named (13 days of 2 opens over 20 views each)",
      j(eh.notCounted) === j(["2028-01-05"]) && eh.n === 26 && eh.d === 260 && M.cellMarks(eh).includes("not counted: 2028-01-05"), j(eh));

    /* V.14 · waiting */
    const late = await user("PLAYER", eatAt("2027-06-14", 23, 50));
    await deposit(late, eatAt("2027-06-14", 23, 50));
    const cw = await viewOf(fns, recC, eatAt("2027-06-15", 0, 5));
    const w4b = row(cw, "depositToAnyBet").before, w5 = row(cw, "timeToFirstBet").before;
    ok("V.14 · a deposit whose 30 minutes have not passed, and a new player whose 24 hours have not, are left out and counted as waiting",
      w4b.waiting === 1 && w5.waiting === 1 && M.cellMarks(w4b).includes("1 waiting"), j({ w4b, w5 }));

    /* V.15 · memo */
    JL.__setJourneyLaunchMemoryForTests(recC);
    V.clearJourneyMeasuresMemo();
    const m1 = await fns.view({}), m2 = await fns.view({}), m3 = await fns.view({ fresh: true });
    ok("V.15 · two reads within 60 seconds share one view; a file's fresh read builds its own", m1 === m2 && m3 !== m1);
  } finally {
    fns.setReads(null);
  }
  return failed;
}

if (!PROVE_RED) {
  console.log("journey-measures-view — the S13 view (memory store)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`\nJOURNEY MEASURES VIEW — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  type O = Parameters<typeof V.journeyMeasuresView>[0];
  const mapView = (f: (v: View) => View): Fns => ({ ...REAL, view: async (o?: O) => f(await REAL.view(o)) });
  const mapRows = (f: (r: View["rows"][number]) => View["rows"][number]) => mapView((v) => ({ ...v, rows: v.rows.map(f) }));
  const plants: Array<{ name: string; expect: RegExp; fns: Fns }> = [
    { name: "a failed read printed as 0", expect: /^V\.6 /,
      fns: mapRows((r) => ({ ...r, after: Object.fromEntries(Object.entries(r.after).map(([k, c]) => [k, c.status === "unreadable" ? { ...c, status: "figure", text: "0.0%", tenths: 0, n: 0, d: 1 } : c])) as typeof r.after })) },
    { name: "the launch record's failure read as 'not launched'", expect: /^V\.6b /,
      fns: { ...REAL, view: async (o?: O) => { const v = await REAL.view(o); return v.launch.state === "unreadable" ? { ...v, launch: { state: "not-launched", observedSince: null, current: null }, rows: v.rows.map((r) => ({ ...r, before: { ...r.before, status: "figure" as const } })) } : v; } } },
    { name: "after columns before launch filled with figures", expect: /^V\.1 /,
      fns: mapRows((r) => ({ ...r, after: Object.fromEntries(Object.entries(r.after).map(([k, c]) => [k, c.status === "not-launched" ? { ...c, status: "none", text: "—" } : c])) as typeof r.after })) },
    { name: "a partial window left unmarked", expect: /^V\.2 /, fns: mapRows((r) => ({ ...r, after: { ...r.after, 7: { ...r.after[7], partial: null } } })) },
    { name: "the rollback day counted", expect: /^V\.4 /,
      fns: mapView((v) => ({ ...v, windows: { ...v.windows, after: { ...v.windows.after, 7: { ...v.windows.after[7], days: [...v.windows.after[7].days, ...v.windows.after[7].skipped.map((s) => s.day)].sort(), skipped: [] } } } })) },
    { name: "a campaign split claimed for every measure", expect: /^V\.5 /,
      fns: mapRows((r) => ({ ...r, after: Object.fromEntries(Object.entries(r.after).map(([k, c]) => [k, c.status === "not-split" ? { ...c, status: "figure", text: "50.0%", tenths: 500 } : c])) as typeof r.after })) },
    { name: "a visit-only tag shown as a journey campaign", expect: /^V\.5b /, fns: mapView((v) => ({ ...v, campaigns: { ...v.campaigns, table: v.campaigns.table.map((t) => ({ ...t, visitOnly: false })) } })) },
    { name: "'no offer' printed as 0%", expect: /^V\.9 /,
      fns: mapRows((r) => (r.before.status === "no-offer" ? { ...r, before: { ...r.before, status: "figure", text: "0.0%", tenths: 0, n: 0 } } : r)) },
    { name: "harm rows given to every viewer", expect: /^V\.11 /,
      fns: { ...REAL, view: (o?: O) => REAL.view({ ...o, includeHarm: true }) } },
    { name: "S9's live after figure suppressed as unavailable", expect: /^V\.12 /,
      fns: mapRows((r) => ({ ...r, after: Object.fromEntries(Object.entries(r.after).map(([k, c]) => [k, r.key === "shortToDeposit" && c.status === "figure" ? { ...c, status: "unavailable" } : c])) as typeof r.after })) },
    { name: "a counting gap read as a day of zeros", expect: /^V\.13 /,
      fns: mapRows((r) => ({ ...r, before: { ...r.before, notCounted: [] } })) },
    { name: "an unfinished follow-up counted as 'no bet'", expect: /^V\.14 /,
      fns: mapRows((r) => ({ ...r, before: { ...r.before, waiting: 0 } })) },
    { name: "the trigger line at 80% of the bets instead of 70%", expect: /^V\.10 /,
      fns: mapView((v) => ({ ...v, watch: { ...v.watch, lines: { ...v.watch.lines, questionBets: v.watch.baseline.questionBetsPerDay === null ? null : v.watch.baseline.questionBetsPerDay * 0.8 } } })) },
    { name: "the memo ignored (every read rebuilt)", expect: /^V\.15 /, fns: { ...REAL, view: (o?: O) => REAL.view({ ...o, fresh: true }) } },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, () => {});
  say("the REAL view passes every case", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.fns, () => {});
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the view cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
