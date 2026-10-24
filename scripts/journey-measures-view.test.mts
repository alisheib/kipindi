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
 *   V.16 ⭐ MASWALI-BUILD S6 · MB-46 — Millionea's launch day marked on the view; none before it. Round 5: a launch alone
 *        names no population and carries no note; round 6: only a cell a surface prints can (V.20, V.21)
 *   V.17 ⭐ MASWALI-BUILD S6 · OD-22 — the harm markers reported twice once a Millionea week has opened, and the bounds
 *        judged on players without a ticket; before any week, one series and the verdict as it always was. Round 2: the
 *        second count is read from its OWN row (`journey.harm.noTicket.daily`), and a malformed one is said (V.17e).
 *        Round 4: the split starts at the first PUBLIC week's opening — during the private drive, one series (V.17f).
 *        Round 5: a day counted before that opening never reads a second count (V.17g)
 *   V.18 ⭐ MASWALI-BUILD S6 · OD-22, round 2 — 50 sign-ups who bought only a Millionea ticket leave measure 5 at its
 *        baseline (40 of 100 on each side) and the seven days in bounds
 *   V.19 ⭐ rounds 3 and 5 — the baseline never moves in EITHER launch order: 30 baseline sign-ups (25 of its 40 bettors)
 *        buy tickets days later, outside every horizon, and 5's baseline still reads 40 of 100, 4b's keeps their deposits;
 *        V.16d–f: a private drive week's ticket counts like any week's, and an unreadable opening changes no figure
 *   V.20 ⭐ rounds 5 and 6 — the population line and the note follow the cells each surface prints: present exactly
 *        where a printed cell left a unit out, and a file in which none did reads byte-identically with no Millionea at all
 *   V.21 ⭐ round 6 (MEDIUM-1) — the reviewer's case: A's baseline file byte-identical with and without a ticket that only
 *        a since-launch cell left out; V.21b the panel's 4b line (before and after 7) silent for an after-14 unit
 *   V.22 ⭐ round 6 (LOW 1) — a unit is due only once its horizon's end plus the money lock's timeout has passed (the
 *        boundary, to the millisecond); V.22b the lag is the lock's own default budget, and only a market's settlement
 *        and its emergency void pass a larger one
 *   V.23 ⭐ round 6 (LOW 2) — a BEFORE-window unit with a ticket in its horizon is left out of the before cell
 *   V.24 ⭐ round 6 (LOW 7) — the panel carries the note when 4b's line alone names a population
 *   V.25 ⭐ round 6 (LOW 8) — a file names the report it was asked for: a week-3 file fetched in weeks 5 and 6 is one file
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
const { weekStore, ticketStore } = await import("../src/lib/server/maswali-dal.ts");
const DAL = await import("../src/lib/server/journey-measures-dal.ts");
const DOC = await import("../src/lib/server/journey-measures-doc.ts");
const M = await import("../src/lib/journey/measures.ts");
const { readFileSync, readdirSync } = await import("node:fs");
type View = Awaited<ReturnType<typeof V.journeyMeasuresView>>;
const PROVE_RED = process.argv.includes("--prove-red");
const j = (v: unknown) => JSON.stringify(v);
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const eatAt = (day: string, h = 0, mi = 0) => Date.parse(`${day}T00:00:00.000Z`) - 3 * HOUR + h * HOUR + mi * MIN;
const iso = (t: number) => new Date(t).toISOString();
const eatDayKeyOf = (t: number) => new Date(t + 3 * HOUR).toISOString().slice(0, 10);

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

/** ⭐ Round 6 — the panel's own labels ride with the view, so a plant can stand in for the panel's decision too. */
type Fns = { view: typeof V.journeyMeasuresView; setReads: typeof V.__setJourneyMeasuresReadsForTests; panel: typeof V.panelLabels };
const REAL: Fns = { view: V.journeyMeasuresView, setReads: V.__setJourneyMeasuresReadsForTests, panel: V.panelLabels };
/** An instant after every ticket these cases plant (a holder read "as of now"). */
const EVER = Date.parse("2100-01-01T00:00:00.000Z");

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

/* Scenario F (⭐ MASWALI-BUILD S6 · OD-22, round 2): a jackpot's ticket-only sign-ups — its own dates. Besides the world's
   own three new players a side (one of them betting within 24 hours), 97 more join over each side's days, 39 of them
   betting within 24 hours: 40 of 100 before, 40 of 100 after. And 50 more join over the first seven days after launch and
   buy ONLY a Millionea ticket, 30 minutes after joining: a position on a MASWALI market, and its ticket row on an opened
   PRIVATE DRIVE week (round 5: a drive ticket counts like any week's, and no public week is read from a drive week, so
   every other scenario still reads "no Millionea launch"). Judged on every player, measure 5 after would read 40 of 150
   (26.7%), below its baseline; leaving out the sign-ups whose ticket came within the 24 hours it reads, 40 of 100. */
const F = await world("2028-06-05", 8);
const MLN = "mkt_jmvmln", F_WEEK = "cyc_jmv_f";
await marketStore.set({
  id: MLN, titleEn: "Millionea week", titleSw: "Wiki ya Millionea", titleZh: null, category: "sports", sourceUrl: "https://example.com", resolutionCriterion: "Case",
  resolutionCriterionSw: null, resolutionCriterionZh: null, resolutionAt: "2030-01-01T00:00:00.000Z", selectionClosedAt: null, status: "LIVE",
  yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null, resolutionStage1By: null, resolutionStage1At: null,
  resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null, settledAt: null, reopenedAt: null, reopenCount: null,
  productLine: "MASWALI", proposedBy: "usr_none", createdAt: iso(Date.now()), updatedAt: iso(Date.now()),
} as never);
await weekStore.create({
  id: F_WEEK, marketId: MLN, code: "MLN-JMV-F", seq: 910_000, visibility: "DRIVE", state: "CLOSED",
  opensAt: iso(eatAt(F.l1, 0)), closesAt: iso(eatAt(addDays(F.l1, 7), 0)), finalDeadlineAt: iso(eatAt(addDays(F.l1, 9), 0)), closedAt: iso(eatAt(addDays(F.l1, 7), 0)),
  rulesSnapshot: { planted: true }, questionSetHash: "planted", ticketMerkleRoot: null, ticketCount: 0, salesAtClose: null, gradedSetFinalAt: null,
  objectionsCloseAt: null, objectionRestarted: false, rolloverIn: null, jackpot: null, fee: null, traLevy: null, gbtLevy: null,
  topUp: null, winningTickets: null, sharePerTicket: null, paidTotal: null, carryOut: null, dustCarried: null,
  settlementGroupId: null, settledAt: null, releasedBy: null, isFinal: false, parityAttestedBy: null, parityAttestedAt: null,
  createdBy: "usr_none", createdAt: iso(Date.now()), updatedAt: iso(Date.now()),
});
const fBaseline: Array<{ id: string; joinedAt: number; bet: boolean }> = [];
for (const days of [14, 7]) {
  for (let i = 0; i < 97; i++) {
    const at = eatAt(days === 14 ? addDays("2028-06-05", i % 14) : addDays(F.l1, i % 7), 13) + i * MIN;
    const p = await user("PLAYER", at);
    if (i < 39) await bet(p, at + 30 * MIN);                                                  // within 24 h (30 min)
    if (days === 14) fBaseline.push({ id: p, joinedAt: at, bet: i < 39 });
  }
}
/* ⭐ Round 3 — the baseline must not move after launch. 30 of the baseline's sign-ups buy a ticket AFTER the first public
   week opens (noon on F.l1): 25 of its 40 who bet within 24 hours and 5 who did not. Judged on whoever holds a ticket
   NOW, measure 5's baseline would re-read 15 of 70 (21.4%); judged as the decision says, it stays 40 of 100. Ten of the 25
   also deposited before launch, 20 minutes after joining (their bet came 10 minutes later): 4b's baseline keeps them. */
const fLater: Array<{ id: string; ticketAt: number }> = [];
const laterBettors = fBaseline.filter((x) => x.bet).slice(0, 25), laterOthers = fBaseline.filter((x) => !x.bet).slice(0, 5);
for (const x of laterBettors.slice(0, 10)) await deposit(x.id, x.joinedAt + 20 * MIN);
for (const [k, x] of [...laterBettors, ...laterOthers].entries()) {
  const ticketAt = eatAt(F.l1, 18) + k * MIN, positionId = `pos_jmv_mlnl_${k}`;
  fLater.push({ id: x.id, ticketAt });
  await positionStore.set({ id: positionId, userId: x.id, marketId: MLN, side: "YES", stake: 1000, bonusStakeTzs: 0, potentialPayout: 0, status: "OPEN", finalPayout: null, placedAt: iso(ticketAt), settledAt: null, idempotencyKey: null, houseBotId: null });
  await ticketStore.create({
    id: `tkt_jmv_l_${k}`, positionId, cycleId: F_WEEK, userId: x.id, serial: `MLN-JMV-L-${String(k + 1).padStart(4, "0")}`,
    selections: Array.from({ length: 15 }, () => "YES"), salt: "case-salt", selectionsHash: "case-hash", picksKey: "case-picks",
    status: "LIVE", cancelledAt: null, closeAtPurchase: iso(eatAt(addDays(F.l1, 7), 0)), rulesVersion: "case", score: null, won: null, payout: null,
    frozenReason: null, lastViewedAt: null, createdAt: iso(ticketAt),
  });
}
const fTicketOnly: Array<{ id: string; joinedAt: number }> = [];
for (let i = 0; i < 50; i++) {
  const at = eatAt(addDays(F.l1, i % 7), 16) + i * MIN;
  const id = await user("PLAYER", at);
  fTicketOnly.push({ id, joinedAt: at });
  const positionId = `pos_jmv_mln_${i}`;
  await positionStore.set({ id: positionId, userId: id, marketId: MLN, side: "YES", stake: 1000, bonusStakeTzs: 0, potentialPayout: 0, status: "OPEN", finalPayout: null, placedAt: iso(at + 30 * MIN), settledAt: null, idempotencyKey: null, houseBotId: null });
  await ticketStore.create({
    id: `tkt_jmv_${i}`, positionId, cycleId: F_WEEK, userId: id, serial: `MLN-JMV-F-${String(i + 1).padStart(4, "0")}`,
    selections: Array.from({ length: 15 }, () => "YES"), salt: "case-salt", selectionsHash: "case-hash", picksKey: "case-picks",
    status: "LIVE", cancelledAt: null, closeAtPurchase: iso(eatAt(addDays(F.l1, 7), 0)), rulesVersion: "case", score: null, won: null, payout: null,
    frozenReason: null, lastViewedAt: null, createdAt: iso(at + 30 * MIN),
  });
}
const nowF = eatAt(addDays(F.l1, 9), 9);
/** The first public week's opening the F cases plant: noon on the journey's first after day. */
const F_OPEN = eatAt(F.l1, 12);

/** ⭐ Round 6 — a Millionea ticket bought at `at`: its position on the MASWALI market and its row on F's opened week. */
let kSeq = 0;
async function ticket(userId: string, at: number) {
  const k = ++kSeq, positionId = `pos_jmv_r6_${k}`;
  await positionStore.set({ id: positionId, userId, marketId: MLN, side: "YES", stake: 1000, bonusStakeTzs: 0, potentialPayout: 0, status: "OPEN", finalPayout: null, placedAt: iso(at), settledAt: null, idempotencyKey: null, houseBotId: null });
  await ticketStore.create({
    id: `tkt_jmv_r6_${k}`, positionId, cycleId: F_WEEK, userId, serial: `MLN-JMV-R6-${String(k).padStart(4, "0")}`,
    selections: Array.from({ length: 15 }, () => "YES"), salt: "case-salt", selectionsHash: "case-hash", picksKey: "case-picks",
    status: "LIVE", cancelledAt: null, closeAtPurchase: iso(eatAt(addDays(F.l1, 7), 0)), rulesVersion: "case", score: null, won: null, payout: null,
    frozenReason: null, lastViewedAt: null, createdAt: iso(at),
  });
}

/* ⭐ Round 6 (MEDIUM-1) — two Millionea units in A's world that no surface prints. A sign-up on l1+29 — past after 28
   (its 28 active days end on l1+28, the rollback day skipped), inside since launch — who buys a ticket 30 minutes later;
   and a player who joined before every window, depositing on l1+10 (inside after 14 and 28, past after 7) and buying a
   ticket 10 minutes later. A's baseline file is taken here, before the first ticket exists, to be read again with it. */
const aLate = await user("PLAYER", eatAt(addDays(A.l1, 29), 10));
const aOld = await user("PLAYER", eatAt("2026-09-01", 10));
await deposit(aOld, eatAt(addDays(A.l1, 10), 12));
await ticket(aOld, eatAt(addDays(A.l1, 10), 12, 10));
JL.__setJourneyLaunchMemoryForTests(A.rec);
const A_BASELINE_CSV = DOC.buildJourneyMeasuresCsv(await V.journeyMeasuresView({ nowMs: nowA, fresh: true }));
await ticket(aLate, eatAt(addDays(A.l1, 29), 10, 30));

/* ⭐ Round 6 (LOW 2, LOW 1) — G, never launched (a baseline of its own). In its before window, a sign-up who buys a
   ticket 30 minutes after joining: measure 5 must leave it out of the BEFORE cell, as of every window. And the commit
   lag's boundary: a sign-up at 00:10 on the window's last day and an older player's deposit at 23:40 that evening —
   both horizons end at 00:10 the next morning, and both are due only the money lock's timeout later (G_EDGE). */
await world("2029-01-01", 0);
const recG = record(eatAt("2028-12-30"), [[eatAt("2028-12-30"), "STAFF_PREVIEW"]]);
await ticket(await user("PLAYER", eatAt("2029-01-05", 10)), eatAt("2029-01-05", 10, 30));
await user("PLAYER", eatAt("2029-01-14", 0, 10));
await deposit(await user("PLAYER", eatAt("2028-12-01", 8)), eatAt("2029-01-14", 23, 40));
const nowG = eatAt("2029-01-15", 9), G_EDGE = eatAt("2029-01-15", 0, 10) + V.COMMIT_LAG_MS;

/* ⭐ Round 6 (LOW 7) — H, never launched: an older player's deposit in its before window, followed by a ticket 10
   minutes later. The panel's 4b line prints that before cell, so it names the population and the panel carries the
   note, though measure 5 names none; the files print no 4b, so they name nothing. */
await world("2029-04-02", 0);
const recH = record(eatAt("2029-03-31"), [[eatAt("2029-03-31"), "STAFF_PREVIEW"]]);
const hOld = await user("PLAYER", eatAt("2029-03-01", 8));
await deposit(hOld, eatAt("2029-04-06", 12));
await ticket(hOld, eatAt("2029-04-06", 12, 10));
const nowH = eatAt("2029-04-16", 9);

async function viewOf(fns: Fns, rec: unknown, nowMs: number, o: Partial<Parameters<typeof V.journeyMeasuresView>[0]> = {}): Promise<View> {
  JL.__setJourneyLaunchMemoryForTests(rec);
  return fns.view({ nowMs, fresh: true, ...o });
}

async function run(fns: Fns, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => { if (cond) log(`  PASS ${label}`); else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
  const row = (v: View, k: string) => v.rows.find((r) => r.def.key === k) as View["rows"][number];
  /** ⭐ Round 6 — the population's words and the note, and whether EITHER surface names one: a file (its CSV) or the panel. */
  const POP = V.WITHOUT_TICKET_POPULATION.en, NOTE = V.millioneaNote();
  const named = (v: View) => {
    const csv = DOC.buildJourneyMeasuresCsv(v), p = fns.panel(v);
    return csv.includes(POP) || csv.includes(NOTE) || p.note !== null || v.rows.some((r) => p.population(r) !== null);
  };
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

    /* V.16 · ⭐ MASWALI-BUILD S6 · MB-46 — Millionea's launch marked on the view; its note and the population lines follow
       the cells each surface prints (rounds 5 and 6), and A's two ticket units sit in cells no surface prints (V.21), so
       none of them appears */
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: eatAt(A.l1, 12) }) });
    const am = await viewOf(fns, A.rec, nowA);
    fns.setReads(null);
    ok("V.16 · ⭐ MB-46 · Millionea's launch is marked on the view (its first public week's EAT day); no cell either surface prints having left a unit out, the definitions are the core's own and no line names a population (round 6: only a printed cell names one)",
      am.millionea.readable && am.millionea.launchDay === A.l1 && j(am.definitions.notes) === j(M.definitionNotes()) && !named(am),
      j({ m: am.millionea, notes: am.definitions.notes.length, left: am.rows.map((r) => [r.def.key, r.leftOut]) }));
    ok("V.16b · CONTROL · with no public Millionea week the view reads as before: no launch day, the definitions the core's own word for word, and no population on any line",
      a.millionea.readable && a.millionea.launchDay === null && j(a.definitions.notes) === j(M.definitionNotes()) && !named(a),
      j({ m: a.millionea, notes: a.definitions.notes.length }));
    fns.setReads({ millioneaOpenings: () => Promise.reject(new Error("planted")) });
    const au = await viewOf(fns, A.rec, nowA);
    fns.setReads(null);
    ok("V.16c · the openings unreadable: said, never a guessed launch — no launch day, and every measure keeps its figure",
      !au.millionea.readable && au.millionea.launchDay === null && au.sources.millionea === "unreadable"
        && row(au, "sheetToBet").after[7].text === a2.after[7].text && j(au.definitions.notes) === j(M.definitionNotes()), j(au.millionea));

    /* V.17 · ⭐ MASWALI-BUILD S6 · OD-22 — the harm markers reported twice, and the bounds judged on players without a ticket */
    const openAt = eatAt(A.l1, 12);                 // Millionea's first week opens at noon on the journey's first after day
    const after7 = a.windows.after[7].days, extra = a.windows.after[14].days[7];
    HW.__setHarmWatchMemoryForTests({ v: 1, days: [
      ...a.windows.before.days.map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 })),
      // counted at 04:00 on the first after day, before the opening: no second count, a count of players without a ticket
      { day: after7[0], at: iso(eatAt(after7[0], 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 },
      // every later day: four rapid depositors in all (its second count, one of them without a ticket, is in the second row)
      ...after7.slice(1).map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 4, chasingLosses: 0, scanned: 8 })),
      // a later day with no second count: "not counted" for players without a ticket, never the whole count
      { day: extra, at: iso(eatAt(extra, 4)), rapidDeposit: 2, chasingLosses: 0, scanned: 6 },
    ].sort((x, y) => (x.day < y.day ? -1 : 1)) });
    // ⭐ Round 2 — the second count lives in its OWN row (`journey.harm.noTicket.daily`), in the first row's shape.
    HW.__setHarmWatchNoTicketMemoryForTests({ v: 1, days: after7.slice(1).map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 })) });
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: openAt }) });
    const h2 = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    fns.setReads(null);
    const h0 = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    const wt = h2.watch.harm?.withoutTicket ?? null;
    const allOn = (v: View, day: string) => { const c = v.watch.harm?.days.find((x) => x.day === day)?.counted; return c && "rapidDeposit" in c ? c.rapidDeposit : null; };
    ok("V.17 · ⭐ OD-22 · reported twice: every player (4 rapid depositors a day) and players without a ticket (1), and the seven-day bounds are judged on the latter — in bounds",
      wt !== null && wt.readable && wt.before.rapidDeposit === 1 && wt.before.daysCounted === a.windows.before.days.length
        && allOn(h2, after7[1]) === 4 && wt.days.find((d) => d.day === after7[1])?.counts?.rapidDeposit === 1 && h2.watch.bounds?.verdict === "in-bounds",
      j({ wt: wt && { before: wt.before, readable: wt.readable }, bounds: h2.watch.bounds?.verdict, reason: h2.watch.bounds?.reason }));
    ok("V.17b · a day counted before the first week opened is a count of players without a ticket; a later day without its split reads 'Not counted'",
      wt !== null && wt.days.find((d) => d.day === after7[0])?.counts?.rapidDeposit === 1 && wt.days.find((d) => d.day === extra)?.counts === null
        && allOn(h2, extra) === 2, j(wt?.days.filter((d) => d.day === after7[0] || d.day === extra)));
    ok("V.17c · CONTROL · with no Millionea week the panel reads as before — one series — and the same counts judged on every player are OUT of bounds",
      h0.watch.harm !== null && h0.watch.harm.withoutTicket === null && h0.watch.bounds?.verdict === "out-of-bounds", j({ b: h0.watch.bounds?.verdict, r: h0.watch.bounds?.reason }));
    fns.setReads({ millioneaOpenings: () => Promise.reject(new Error("planted")) });
    const hu = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    fns.setReads(null);
    ok("V.17d · the openings unreadable: the bounds are judged on every player — the stricter reading, here out of bounds — and only the split says it cannot be read",
      hu.watch.harm?.withoutTicket?.readable === false && hu.watch.bounds?.verdict === "out-of-bounds", j({ wt: hu.watch.harm?.withoutTicket?.readable, b: hu.watch.bounds?.verdict }));
    HW.__setHarmWatchNoTicketMemoryForTests({ v: 2, days: "not a series" });
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: openAt }) });
    const hm = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    fns.setReads(null);
    ok("V.17e · the second row malformed: the S13 row still reads, the split says it cannot be read, and the bounds are judged on every player (out of bounds here)",
      hm.watch.harm?.readable === true && hm.watch.harm?.withoutTicket?.readable === false && hm.watch.bounds?.verdict === "out-of-bounds"
        && allOn(hm, after7[1]) === 4, j({ readable: hm.watch.harm?.readable, wt: hm.watch.harm?.withoutTicket?.readable, b: hm.watch.bounds?.verdict }));
    /* V.17f · ⭐ round 4 (the lead's ruling) — the split starts at the first PUBLIC week's opening: it dates that event, so
       the drive's opening starts nothing (5 and 4b key on no opening at all, round 5). A drive week opened at noon on the
       first after day, no public week: the second row's days (as a build that split from the drive's opening wrote them)
       must change nothing. `anyAt`, the drive's opening the reads no longer return, is planted beside to prove it is
       ignored. */
    HW.__setHarmWatchNoTicketMemoryForTests({ v: 1, days: after7.slice(1).map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 })) });
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: null, anyAt: openAt }) as never });
    const hd = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    fns.setReads(null);
    ok("V.17f · ⭐ R4 · during the private drive the S16 series is not split: one series, judged on every player (out of bounds here), the drive-era second counts ignored",
      hd.watch.harm !== null && hd.watch.harm.withoutTicket === null && hd.watch.bounds?.verdict === "out-of-bounds" && allOn(hd, after7[1]) === 4,
      j({ wt: hd.watch.harm?.withoutTicket ?? null, b: hd.watch.bounds?.verdict }));
    /* V.17g · ⭐ round 5 — a day counted before the first public opening reads the whole count, checked BEFORE the second
       row: a second count the row holds for it (as a build that split from an earlier opening wrote one) is never used. */
    HW.__setHarmWatchNoTicketMemoryForTests({ v: 1, days: [
      { day: after7[0], at: iso(eatAt(after7[0], 4)), rapidDeposit: 0, chasingLosses: 0, scanned: 5 },
      ...after7.slice(1).map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 })),
    ] });
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: openAt }) });
    const hg = await viewOf(fns, A.rec, nowA, { includeHarm: true });
    fns.setReads(null);
    const wg = hg.watch.harm?.withoutTicket ?? null;
    ok("V.17g · ⭐ R5 · a day counted before the first public opening reads the whole count though the second row holds one for it (1, never its 0); a day counted after it reads the second row (1 of 4)",
      wg !== null && wg.days.find((d) => d.day === after7[0])?.counts?.rapidDeposit === 1 && wg.days.find((d) => d.day === after7[1])?.counts?.rapidDeposit === 1
        && allOn(hg, after7[1]) === 4, j(wg?.days.filter((d) => d.day === after7[0] || d.day === after7[1])));
    HW.__setHarmWatchMemoryForTests(null);
    HW.__setHarmWatchNoTicketMemoryForTests(null);

    /* V.18 · ⭐ MASWALI-BUILD S6 · OD-22, round 2 — a jackpot's ticket-only sign-ups cannot drag measure 5 down */
    const fw = await viewOf(fns, F.rec, nowF);
    const fBefore = fw.windows.before.days, fAfter = fw.windows.after[7].days;
    // One rapid depositor a day on both sides, in both rows (the after days' second count included), so S16 can decide.
    const oneADay = (days: readonly string[]) => days.map((day) => ({ day, at: iso(eatAt(day, 4)), rapidDeposit: 1, chasingLosses: 0, scanned: 5 }));
    HW.__setHarmWatchMemoryForTests({ v: 1, days: oneADay([...fBefore, ...fAfter]) });
    HW.__setHarmWatchNoTicketMemoryForTests({ v: 1, days: oneADay(fAfter) });
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: F_OPEN }) });
    const fv = await viewOf(fns, F.rec, nowF, { includeHarm: true });
    fns.setReads(null);
    HW.__setHarmWatchMemoryForTests(null);
    HW.__setHarmWatchNoTicketMemoryForTests(null);
    const f5 = row(fv, "timeToFirstBet"), f5bound = fv.watch.bounds?.measures.find((m) => m.key === "timeToFirstBet");
    ok("V.18 · ⭐ round 2 · 50 sign-ups who bought only a Millionea ticket leave measure 5 at its baseline — 40 of 100 before, 40 of 100 after (40.0%), judged on players without a ticket — and the seven days in bounds",
      f5.before.n === 40 && f5.before.d === 100 && f5.before.text === "40.0%" && f5.after[7].n === 40 && f5.after[7].d === 100 && f5.after[7].text === "40.0%"
        && f5bound?.status === "at-or-above" && fv.watch.bounds?.verdict === "in-bounds" && f5.leftOut?.after[7] === 50,
      j({ before: [f5.before.n, f5.before.d, f5.before.text], after: [f5.after[7].n, f5.after[7].d, f5.after[7].text], bound: f5bound?.status, verdict: fv.watch.bounds?.verdict, reason: fv.watch.bounds?.reason }));
    const fHolders = await DAL.ticketHolders(fTicketOnly.map((t) => t.id), nowF);
    const fJoined = await DAL.joinedPlayers(eatAt(fAfter[0]), eatAt(addDays(fAfter[fAfter.length - 1], 1)));
    const fMarked = new Set(fJoined.filter((p) => p.ticketInHorizon).map((p) => p.id));
    ok("V.18b · CONTROL · the 50 really bought their tickets within the 24 hours after joining, inside those seven days, so V.18 is not vacuous: R4 marks exactly them, and every baseline sign-up is counted (all 100)",
      fHolders.size === 50 && fAfter.length === 7 && fAfter[0] === F.l1 && fTicketOnly.every((t) => fAfter.includes(eatDayKeyOf(t.joinedAt)) && fMarked.has(t.id))
        && fMarked.size === 50 && fJoined.length === 150 && f5.before.d === 100,
      j({ holders: fHolders.size, marked: fMarked.size, joined: fJoined.length, after: fAfter }));

    /* V.19 · ⭐ MASWALI-BUILD S6 · OD-22, rounds 3 and 5 — the baseline never moves, in EITHER launch order: 30 of F's baseline
       sign-ups bought tickets days later, outside every horizon the measures read for them, so they stay counted whether
       Millionea went public after the baseline (as F_OPEN) or before it */
    const f4b = row(fv, "depositToAnyBet");
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: eatAt(addDays(F.l1, -20), 12) }) });
    const fvEarly = await viewOf(fns, F.rec, nowF);
    fns.setReads(null);
    const e5 = row(fvEarly, "timeToFirstBet"), e4b = row(fvEarly, "depositToAnyBet");
    ok("V.19 · ⭐ R5 · the baseline stays put in either launch order: 30 of its 100 sign-ups (25 of the 40 who bet within 24 h) bought tickets days later, and measure 5's baseline reads 40 of 100 (40.0%) whether Millionea went public after the baseline or before it — never 15 of 70 (21.4%)",
      f5.before.n === 40 && f5.before.d === 100 && f5.before.text === "40.0%" && j(e5.before) === j(f5.before) && j(e5.after[7]) === j(f5.after[7]),
      j({ late: f5.before, early: e5.before }));
    ok("V.19b · ⭐ R5 · …and 4b's baseline keeps the ten deposits those later ticket holders made: 11 of 13 followed within 30 minutes (84.6%), in either order",
      f4b.before.n === 11 && f4b.before.d === 13 && f4b.before.text === "84.6%" && j(e4b.before) === j(f4b.before), j({ late: f4b.before, early: e4b.before }));
    const lateHolders = await DAL.ticketHolders(fLater.map((x) => x.id), nowF);
    ok("V.19c · CONTROL · the 30 really hold tickets now, each bought days after joining (outside the horizon), so V.19 and V.19b are not vacuous",
      lateHolders.size === 30 && fLater.length === 30 && fLater.every((x) => x.ticketAt > F_OPEN), j({ held: lateHolders.size }));

    /* V.16d–f · ⭐ round 5 — no launch instant decides who is left out: a private drive week's ticket counts like any week's,
       and an unreadable opening changes no figure (`anyAt`, a drive week's opening the reads no longer return, is planted
       beside to prove it changes nothing) */
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: null, anyAt: eatAt(A.l1, 12) }) as never });
    const ad = await viewOf(fns, A.rec, nowA);
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: null, anyAt: F_OPEN }) as never });
    const fd = await viewOf(fns, F.rec, nowF);
    fns.setReads({ millioneaOpenings: () => Promise.reject(new Error("planted")) });
    const fu = await viewOf(fns, F.rec, nowF);
    fns.setReads(null);
    ok("V.16d · during the private drive (a week open, none public), no cell either surface prints having left one of A's units out: no launch day, no population line, no note — as before any week",
      ad.millionea.readable && ad.millionea.launchDay === null && !named(ad) && j(ad.definitions.notes) === j(M.definitionNotes()),
      j({ left: ad.rows.map((r) => [r.def.key, r.leftOut]), notes: ad.definitions.notes.length }));
    const fd5 = row(fd, "timeToFirstBet").after[7];
    const fdCsv = DOC.buildJourneyMeasuresCsv(fd);
    ok("V.16e · ⭐ R5 · a private drive week's tickets count like any week's (OD-21): with no public week, F's 50 ticket-only sign-ups are still left out of measure 5 (40 of 100), which both surfaces name, with the note",
      fd5.n === 40 && fd5.d === 100 && fns.panel(fd).population(row(fd, "timeToFirstBet"))?.en === POP && fns.panel(fd).note === NOTE
        && fdCsv.includes(`5. Time to first bet · ${POP}`) && fdCsv.includes(NOTE), j(fd5));
    ok("V.16f · ⭐ R5 · the openings unreadable: no launch day, and every figure the same — who is left out never waits on them",
      !fu.millionea.readable && fu.millionea.launchDay === null && j(row(fu, "timeToFirstBet").after[7]) === j(fd5)
        && j(row(fu, "depositToAnyBet").before) === j(row(fd, "depositToAnyBet").before) && row(fu, "sheetToBet").after[7].text === row(fw, "sheetToBet").after[7].text,
      j(fu.rows.map((r) => [r.def.key, r.before.status, r.after[7].status])));

    /* V.20 · ⭐ rounds 5 and 6 — the population line and the note follow the cells each surface prints */
    const fvCsv = DOC.buildJourneyMeasuresCsv(fv), fvPanel = fns.panel(fv);
    const leftNone = (r: View["rows"][number]) => !!r.leftOut && r.leftOut.before + r.leftOut.after[7] + r.leftOut.after[14] + r.leftOut.after[28] + r.leftOut.sinceLaunch + r.leftOut.period === 0;
    ok("V.20 · ⭐ R5/R6 · the population line and the note follow the cells each surface prints: in F measure 5's after cells left out the 50, so the panel's row and the file's lines name its population, both with the note; 4b, none of whose deposits was followed by a ticket within its window, names none",
      f5.leftOut?.after[7] === 50 && fvPanel.population(f5)?.en === POP && fvPanel.population(f4b) === null && fvPanel.note === NOTE
        && fvCsv.includes(`5. Time to first bet · ${POP}`) && fvCsv.includes(NOTE) && leftNone(f4b) && j(fv.definitions.notes) === j(M.definitionNotes()),
      j({ f5: f5.leftOut, f4b: f4b.leftOut, panel: fvPanel.population(f5)?.en ?? null, note: fvPanel.note !== null }));
    // V.20b · F the morning after its journey launched: every unit so far is a baseline one, and no baseline ticket fell
    // within a horizon, so its file must read exactly as it would with no Millionea at all — opened or not.
    const nowF0 = eatAt(F.l1, 9);
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: eatAt(addDays(F.l1, -1), 12) }) });
    const f0Open = await viewOf(fns, F.rec, nowF0);
    fns.setReads({ millioneaOpenings: async () => ({ publicAt: null }) });
    const f0None = await viewOf(fns, F.rec, nowF0);
    fns.setReads(null);
    ok("V.20b · ⭐ R5 · a file in which no unit was left out reads as it would with no Millionea at all: F's file the morning after its launch is byte-identical with the opening and without it — no population line, no note",
      DOC.buildJourneyMeasuresCsv(f0Open) === DOC.buildJourneyMeasuresCsv(f0None) && f0Open.millionea.launchDay !== null
        && !named(f0Open) && j(f0Open.definitions.notes) === j(M.definitionNotes()),
      j({ launch: f0Open.millionea.launchDay, notes: f0Open.definitions.notes.length }));

    /* V.21 · ⭐ ROUND 6 (MEDIUM-1, the lead's decision) — a surface names the population, and carries the note, only where
       a cell IT PRINTS left a unit out: the files print the five's before, after 7/14/28 and the period; the panel the
       five's before and after 7/14/28 and 4b's line before and after 7 — no surface prints a since-launch cell. */
    const a5 = row(a, "timeToFirstBet"), a4b = row(a, "depositToAnyBet");
    ok("V.21 · ⭐ R6 · the reviewer's case: A's baseline file is byte-identical with and without the ticket bought 30 minutes after a sign-up on l1+29 — only a since-launch cell, which no file prints, left that sign-up out, so no line gains the population or the note",
      DOC.buildJourneyMeasuresCsv(a) === A_BASELINE_CSV && a5.leftOut?.sinceLaunch === 1 && a5.leftOut.before === 0 && a5.leftOut.period === 0
        && a5.leftOut.after[7] === 0 && a5.leftOut.after[14] === 0 && a5.leftOut.after[28] === 0 && fns.panel(a).population(a5) === null,
      j({ a5: a5.leftOut, same: DOC.buildJourneyMeasuresCsv(a) === A_BASELINE_CSV }));
    ok("V.21b · ⭐ R6 · the panel's 4b line prints only before and after 7: A's deposit on l1+10, followed by a ticket, left out of after 14 and 28 names no population on it, and the panel carries no note — over a printed after-14 cell it would be named",
      a4b.leftOut?.after[14] === 1 && a4b.leftOut.after[28] === 1 && a4b.leftOut.after[7] === 0 && a4b.leftOut.before === 0
        && fns.panel(a).population(a4b) === null && fns.panel(a).note === null && V.populationWhere(a4b, ["before", 7, 14])?.en === POP,
      j({ a4b: a4b.leftOut, line: fns.panel(a).population(a4b)?.en ?? null, note: fns.panel(a).note !== null }));

    /* V.22 · ⭐ ROUND 6 (LOW 1) — a unit is due only once its horizon's end plus the money lock's timeout has passed: a bet
       or a ticket stamped inside the horizon may still be committing until then. G's 00:10 sign-up and its 23:40 deposit
       both end their horizons at 00:10; G_EDGE is 00:10 plus the lag. */
    const gWait = await viewOf(fns, recG, G_EDGE - 1), gDue = await viewOf(fns, recG, G_EDGE);
    const gw5 = row(gWait, "timeToFirstBet").before, gw4 = row(gWait, "depositToAnyBet").before;
    const gd5 = row(gDue, "timeToFirstBet").before, gd4 = row(gDue, "depositToAnyBet").before;
    ok("V.22 · ⭐ R6 · a unit counts only once its horizon's end plus the money lock's timeout has passed: 1 ms before it, G's sign-up and deposit still wait (1 waiting each, 3 counted); at it, both count (4)",
      gw5.waiting === 1 && gw5.d === 3 && gw4.waiting === 1 && gw4.d === 3 && gd5.waiting === 0 && gd5.d === 4 && gd4.waiting === 0 && gd4.d === 4,
      j({ wait: [gw5.n, gw5.d, gw5.waiting, gw4.n, gw4.d, gw4.waiting], due: [gd5.n, gd5.d, gd5.waiting, gd4.n, gd4.d, gd4.waiting] }));
    // S6-INT 8 · main's U43 (c29cb7526) made the lock's budget a parameter: withAdvisoryLock's default (`timeoutMs = 30000`)
    // is what its $transaction passes, withLock defaults it the same way, and a caller may pass a larger one. The lag is
    // that default. The callers that pass a larger budget are a market's settlement, its emergency void and (FEE-TAX R2b,
    // 2026-10-24) its close-time disclosure — which writes the frozen payout figures and the close stamp — and none stamps
    // a sign-up, a deposit, a bet or a ticket, so no unit these measures count waits longer to commit.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const locksSrc = readFileSync("src/lib/server/locks.ts", "utf8").replace(/\r\n/g, "\n");
    const advisory = strip(locksSrc.slice(locksSrc.indexOf("async function withAdvisoryLock"), locksSrc.indexOf("async function drainLock")));
    const withLockSrc = strip(locksSrc.slice(locksSrc.indexOf("export async function withLock")));
    const LIT = /^async function withAdvisoryLock[^{]*?\btimeoutMs\s*=\s*([\d_]+)\)/;
    const lit = LIT.exec(advisory)?.[1];
    const passed = /\$transaction\([\s\S]*?\btimeout:\s*timeoutMs\b/.test(advisory);
    const lockDefault = /options\?\.timeoutMs\s*\?\?\s*([\d_]+)/.exec(withLockSrc)?.[1];
    const num = (s: string | undefined) => (s === undefined ? NaN : Number(s.replace(/_/g, "")));
    // Every option object that carries a budget (`{ timeoutMs }`, `{ timeoutMs: … }`), named by its top-level function.
    const BUDGET = /\{\s*timeoutMs(\s*:\s*[^}]+)?\s*\}/g;
    const TOP = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)|^(?:export\s+)?(?:const|let)\s+(\w+)\s*=/gm;
    const passers = (src: string) => [...src.matchAll(BUDGET)].map((m) => {
      const top = [...src.slice(0, m.index).matchAll(TOP)].pop();
      return top ? (top[1] ?? top[2]) : "?";
    });
    const larger = new Set(readdirSync("src", { recursive: true }).map(String)
      .filter((f) => /\.tsx?$/.test(f) && !/^lib[\\/]server[\\/]locks\.ts$/.test(f))
      .flatMap((f) => passers(readFileSync(`src/${f}`, "utf8").replace(/\r\n/g, "\n"))));
    const plantedBet = passers("export async function placeBet() {\n  return withLock(\"wallet:u\", fn, { timeoutMs: 60_000 });\n}");
    const plantedHelper = passers("export async function settleMarket() {}\nasync function helper() {\n  return withLock(\"k\", fn, { timeoutMs });\n}");
    ok("V.22b · the lag is the money lock's own: COMMIT_LAG_MS equals the lock's default budget in locks.ts — withAdvisoryLock's default, which its $transaction passes, and withLock's — and the only callers that pass a larger budget are settleMarket, emergencyVoidMarket and notifySelectionClosedForMarket, which stamp no sign-up, deposit, bet or ticket (an unfound literal fails; CONTROLS: a signature with no numeric default reads as unfound; a larger budget planted in placeBet is found, and one in a helper after settleMarket is named by the helper)",
      advisory.length > 0 && num(lit) === V.COMMIT_LAG_MS && passed && num(lockDefault) === V.COMMIT_LAG_MS
        && [...larger].sort().join() === "emergencyVoidMarket,notifySelectionClosedForMarket,settleMarket"
        && !LIT.test("async function withAdvisoryLock<T>(key: string, timeoutMs = env.TX_TIMEOUT): Promise<T> {")
        && plantedBet.join() === "placeBet" && plantedHelper.join() === "helper",
      j({ lit: lit ?? null, passed, lockDefault: lockDefault ?? null, lag: V.COMMIT_LAG_MS, larger: [...larger].sort() }));

    /* V.23 · ⭐ ROUND 6 (LOW 2) — a BEFORE-window unit is left out like any other: G's sign-up who bought a ticket 30
       minutes after joining is in neither half of measure 5's before cell, which counts it left out. */
    const g = await viewOf(fns, recG, nowG);
    const g5 = row(g, "timeToFirstBet"), g4b = row(g, "depositToAnyBet");
    ok("V.23 · ⭐ R6 · measure 5 leaves a BEFORE-window unit out: G's sign-up who bought a ticket 30 minutes after joining is in neither half (1 of 4), its before cell counts it left out, and both surfaces name the population there; 4b, which left none out, names none",
      g5.before.n === 1 && g5.before.d === 4 && g5.leftOut?.before === 1 && g4b.before.d === 4 && g4b.leftOut?.before === 0
        && fns.panel(g).population(g5)?.en === POP && fns.panel(g).population(g4b) === null && DOC.buildJourneyMeasuresCsv(g).includes(`5. Time to first bet · ${POP}`),
      j({ g5: [g5.before.n, g5.before.d, g5.leftOut], g4b: [g4b.before.d, g4b.leftOut] }));

    /* V.24 · ⭐ ROUND 6 (LOW 7) — the panel carries the note when EITHER line names a population. */
    const hv = await viewOf(fns, recH, nowH);
    const h4b = row(hv, "depositToAnyBet"), h5 = row(hv, "timeToFirstBet"), hp = fns.panel(hv), hCsv = DOC.buildJourneyMeasuresCsv(hv);
    ok("V.24 · ⭐ R6 · the panel carries the note when 4b's line alone names a population: H's before cell left out a deposit followed by a ticket, the line names it and the note is there, though measure 5 names none; the files, which print no 4b, name nothing and carry no note",
      h4b.leftOut?.before === 1 && h4b.before.d === 3 && hp.population(h4b)?.en === POP && hp.population(h5) === null && hp.note === NOTE
        && !hCsv.includes(POP) && !hCsv.includes(NOTE),
      j({ h4b: [h4b.before.n, h4b.before.d, h4b.leftOut], line: hp.population(h4b)?.en ?? null, note: hp.note !== null }));

    /* V.25 · ⭐ ROUND 6 (LOW 8) — a file names the report it was asked for, never the one due when it was fetched. A's
       week-3 file (its Monday 2026-11-23), fetched while week 5 is due and again while week 6 is: one file. */
    const week3 = { kind: "week" as const, monday: "2026-11-23" };
    const w3a = await viewOf(fns, A.rec, eatAt("2026-12-08", 9), { period: week3 }), w3b = await viewOf(fns, A.rec, eatAt("2026-12-15", 9), { period: week3 });
    const asked = M.dueText({ kind: "week", k: 3, of: 8, monday: "2026-11-23", fromDay: "2026-11-16", toDay: "2026-11-22" });
    const label3 = DOC.documentLines(w3b).find((l) => l.section === "This period")?.label;
    const doc3 = DOC.buildJourneyMeasuresDocument(w3b, { generatorId: "usr_jmv", generatorName: "Case", generatedAtMs: eatAt("2026-12-15", 9), reference: "SJM-CASE" });
    ok("V.25 · ⭐ R6 · a file names the report it was asked for: A's week-3 file reads 'Week 3 of 8' fetched while week 5 is due and while week 6 is (never 'Week 6 of 8'), and is byte-identical both times",
      w3b.schedule.due.kind === "week" && w3b.schedule.due.k === 6 && w3a.schedule.due.kind === "week" && w3a.schedule.due.k === 5 && asked.startsWith("Week 3 of 8")
        && label3 === asked && doc3.subtitle === asked && doc3.meta.period.startsWith(asked) && DOC.buildJourneyMeasuresCsv(w3a) === DOC.buildJourneyMeasuresCsv(w3b),
      j({ label3, asked, due: [w3a.schedule.due, w3b.schedule.due] }));

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
  // ⭐ Round 2 — a read as it was before round 2, planted through the view's own seam (a case's own override still wins).
  type ReadsO = NonNullable<Parameters<typeof V.__setJourneyMeasuresReadsForTests>[0]>;
  const withRead = (o: ReadsO): Fns => ({ ...REAL, setReads: (x) => REAL.setReads({ ...o, ...(x ?? {}) }) });
  // ⭐ Round 5 — R2 and R4 as the old rules read them: the horizon mark taken off, or put on every ticket holder.
  const unmark = <T extends { ticketInHorizon?: true }>(r: T): T => { const { ticketInHorizon: _mark, ...rest } = r; void _mark; return rest as T; };
  const markHolders = async <T extends { ticketInHorizon?: true }>(rows: T[], who: (r: T) => string): Promise<T[]> => {
    const held = await DAL.ticketHolders(rows.map(who), EVER);
    return rows.map((r) => (held.has(who(r)) ? { ...r, ticketInHorizon: true as const } : r));
  };
  /** ⭐ Round 6 — a row's left-out count where a surface prints a cell it never left out of (the plants' "named anyway"). */
  type MRow = View["rows"][number];
  const leftBefore = (r: MRow): MRow => (r.leftOut ? { ...r, leftOut: { ...r.leftOut, before: Math.max(1, r.leftOut.before) } } : r);
  const emptyWhenMalformed: typeof HW.harmWatchSeries = async () => {
    const r = await HW.harmWatchSeries();
    return r.ok && r.noTicketByDay === null ? { ...r, noTicketByDay: new Map() } : r;
  };
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
      fns: mapRows((r) => ({ ...r, after: Object.fromEntries(Object.entries(r.after).map(([k, c]) => [k, r.def.key === "shortToDeposit" && c.status === "figure" ? { ...c, status: "unavailable" } : c])) as typeof r.after })) },
    { name: "a counting gap read as a day of zeros", expect: /^V\.13 /,
      fns: mapRows((r) => ({ ...r, before: { ...r.before, notCounted: [] } })) },
    { name: "an unfinished follow-up counted as 'no bet'", expect: /^V\.14 /,
      fns: mapRows((r) => ({ ...r, before: { ...r.before, waiting: 0 } })) },
    { name: "the trigger line at 80% of the bets instead of 70%", expect: /^V\.10 /,
      fns: mapView((v) => ({ ...v, watch: { ...v.watch, lines: { ...v.watch.lines, questionBets: v.watch.baseline.questionBetsPerDay === null ? null : v.watch.baseline.questionBetsPerDay * 0.8 } } })) },
    { name: "the memo ignored (every read rebuilt)", expect: /^V\.15 /, fns: { ...REAL, view: (o?: O) => REAL.view({ ...o, fresh: true }) } },
    // ⭐ MASWALI-BUILD S6 · MB-46 / OD-22
    { name: "Millionea's launch day dropped from the view", expect: /^V\.16 /,
      fns: mapView((v) => ({ ...v, millionea: { ...v.millionea, launchDay: null } })) },
    { name: "the Millionea sentence printed before any launch", expect: /^V\.16b /,
      fns: mapView((v) => ({ ...v, definitions: { notes: [...v.definitions.notes, V.millioneaNote()] } })) },
    { name: "the bounds judged on every player once Millionea has opened", expect: /^V\.17 /,
      fns: mapView((v) => (v.watch.harm?.withoutTicket && v.watch.bounds ? { ...v, watch: { ...v.watch, bounds: { ...v.watch.bounds, verdict: "out-of-bounds" as const } } } : v)) },
    { name: "a later day without its split read as the whole count", expect: /^V\.17b /,
      fns: mapView((v) => {
        const h = v.watch.harm;
        if (!h?.withoutTicket) return v;
        const whole = (day: string) => { const c = h.days.find((x) => x.day === day)?.counted; return c && "rapidDeposit" in c ? { rapidDeposit: c.rapidDeposit, chasingLosses: c.chasingLosses } : null; };
        return { ...v, watch: { ...v.watch, harm: { ...h, withoutTicket: { ...h.withoutTicket, days: h.withoutTicket.days.map((d) => ({ ...d, counts: d.counts ?? whole(d.day) })) } } } };
      }) },
    // ⭐ Rounds 2, 5 and 6 (S6 · OD-22) — the population line follows the cells a surface prints; the second row's own key
    { name: "the population line dropped where units were left out (no cell counts what it left out)", expect: /^V\.20 /,
      fns: mapRows((r) => ({ ...r, leftOut: null })) },
    { name: "the population line printed before any Millionea week", expect: /^V\.16b /,
      fns: mapRows((r) => (r.def.key === "timeToFirstBet" ? leftBefore(r) : r)) },
    { name: "the population line printed where no unit was left out (keyed on the launch day)", expect: /^V\.16 /,
      fns: mapView((v) => (v.millionea.launchDay !== null ? { ...v, rows: v.rows.map(leftBefore) } : v)) },
    { name: "the note keyed on the launch day (a file with nothing left out gains it)", expect: /^V\.20b /,
      fns: mapView((v) => (v.millionea.launchDay !== null && !v.definitions.notes.includes(V.millioneaNote())
        ? { ...v, definitions: { notes: [...v.definitions.notes, V.millioneaNote()] } } : v)) },
    { name: "a malformed second row read as an empty one (the split claimed readable)", expect: /^V\.17e /, fns: withRead({ harmWatchSeries: emptyWhenMalformed }) },
    // ⭐ Round 5 — who 5 and 4b leave out: a unit whose player bought a ticket within the window the measure reads for it.
    { name: "measure 5 judged on every player (the horizon mark ignored: ticket-only sign-ups kept)", expect: /^V\.18 /,
      fns: withRead({ joinedPlayers: async (f, t) => (await DAL.joinedPlayers(f, t)).map(unmark) }) },
    { name: "measure 5's baseline judged on whoever holds a ticket now (the baseline moves)", expect: /^V\.19 /,
      fns: withRead({ joinedPlayers: async (f, t) => markHolders(await DAL.joinedPlayers(f, t), (p) => p.id) }) },
    { name: "4b's baseline judged on whoever holds a ticket now", expect: /^V\.19b /,
      fns: withRead({ confirmedDeposits: async (f, t) => markHolders(await DAL.confirmedDeposits(f, t), (d) => d.userId) }) },
    { name: "the population named whenever any week opened (the private drive included)", expect: /^V\.16d /,
      fns: mapView((v) => (v.millionea.readable && v.millionea.launchDay === null ? { ...v, rows: v.rows.map(leftBefore) } : v)) },
    { name: "a private drive week's tickets ignored (only a public week's leave units out)", expect: /^V\.16e /,
      fns: { ...REAL, setReads: (x) => REAL.setReads(x?.millioneaOpenings ? { ...x, joinedPlayers: async (f, t) => {
        const o = await x.millioneaOpenings!().catch(() => null);
        const rows = await DAL.joinedPlayers(f, t);
        return o && o.publicAt === null ? rows.map(unmark) : rows;
      } } : x) } },
    { name: "who is left out made to wait on the openings (an unreadable opening empties 5 and 4b)", expect: /^V\.16f /,
      fns: { ...REAL, setReads: (x) => REAL.setReads(x?.millioneaOpenings ? { ...x,
        joinedPlayers: async (f, t) => { await x.millioneaOpenings!(); return DAL.joinedPlayers(f, t); },
        confirmedDeposits: async (f, t) => { await x.millioneaOpenings!(); return DAL.confirmedDeposits(f, t); },
      } : x) } },
    // ⭐ Round 4 — the split dates the event it reports: the drive's opening starts nothing.
    { name: "the harm split keyed on any week's opening (the drive's opening splits the S16 series)", expect: /^V\.17f /,
      fns: { ...REAL, setReads: (x) => REAL.setReads(x?.millioneaOpenings ? { ...x, millioneaOpenings: async () => {
        const v = (await x.millioneaOpenings!()) as { publicAt: number | null; anyAt?: number | null };
        return v.publicAt === null && typeof v.anyAt === "number" ? { publicAt: v.anyAt } : { publicAt: v.publicAt };
      } } : x) } },
    // ⭐ Round 6 (MEDIUM-1) — a surface labelled by a cell it does not print.
    { name: "the population named by a since-launch cell no surface prints (round 5's rule)", expect: /^V\.21 /,
      fns: mapRows((r) => (r.leftOut && r.leftOut.sinceLaunch > 0 ? { ...r, leftOut: { ...r.leftOut, before: r.leftOut.before + r.leftOut.sinceLaunch } } : r)) },
    { name: "the panel's 4b line named by a cell it does not print (after 14)", expect: /^V\.21b /,
      fns: mapRows((r) => (r.def.key === "depositToAnyBet" && r.leftOut ? { ...r, leftOut: { ...r.leftOut, after: { ...r.leftOut.after, 7: r.leftOut.after[7] + r.leftOut.after[14] } } } : r)) },
    // ⭐ Round 6 (LOW 1) — a unit due the instant its horizon ends: every unit's instant read as the lag earlier.
    { name: "a unit due the instant its horizon ends (the money lock's commit lag ignored)", expect: /^V\.22 /,
      fns: withRead({
        joinedPlayers: async (f, t) => (await DAL.joinedPlayers(f, t)).map((p) => ({ ...p, joinedAt: p.joinedAt - V.COMMIT_LAG_MS })),
        confirmedDeposits: async (f, t) => (await DAL.confirmedDeposits(f, t)).map((d) => ({ ...d, at: d.at - V.COMMIT_LAG_MS })),
      }) },
    // ⭐ Round 6 (LOW 2) — `keep` applied to the after cells only: a before-window unit keeps its place (G's before window).
    { name: "keep applied to the after cells only (a BEFORE-window unit with a ticket in its horizon kept)", expect: /^V\.23 /,
      fns: withRead({ joinedPlayers: async (f, t) => (await DAL.joinedPlayers(f, t)).map((p) => (p.joinedAt >= eatAt("2029-01-01") && p.joinedAt < eatAt("2029-01-15") ? unmark(p) : p)) }) },
    // ⭐ Round 6 (LOW 7) — the panel's note keyed on measure 5 alone.
    { name: "the panel's note keyed on measure 5 alone (4b's line naming its population carries none)", expect: /^V\.24 /,
      fns: { ...REAL, panel: (v) => { const p = V.panelLabels(v); return { ...p, note: v.rows.some((r) => r.def.key === "timeToFirstBet" && p.population(r) !== null) ? V.millioneaNote() : null }; } } },
    // ⭐ Round 6 (LOW 8) — a file labelled with the report due on the day it was fetched.
    { name: "the period line labelled with the report due when the file was fetched", expect: /^V\.25 /,
      fns: mapView((v) => (v.period.kind === "week" && v.schedule.due.kind === "week" ? { ...v, period: { kind: "week" as const, monday: v.schedule.due.monday } } : v)) },
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
