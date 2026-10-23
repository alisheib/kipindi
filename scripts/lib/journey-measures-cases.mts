/**
 * THE CASES BEHIND `test:journey-measures` — the S13 reads (`src/lib/server/journey-measures-dal.ts`, the two narrow visit
 * reads in `site-visits.ts`, and the S9 seam), S13-PLAN WP5.
 *
 * Shared by the two-store child (`journey-measures-child.mts`) and the in-process red twin (`journey-measures.test.mts
 * --prove-red`, memory only). Every read is asserted against the fixture's own arithmetic, so the two stores agree by
 * agreeing with it. Each run writes its own days (`runIndex` moves the base day), so the red twin's repeated runs in one
 * process never read each other's totals.
 *
 *   M.1  counters: the funnel's totals over a day range, every dimension; a tag the funnel drops is stored as no tag
 *   M.2  home views per day from the narrow per-path read (never the top-N ranking); other paths left out
 *   M.3  campaign visits per day and tag, the empty tag left out; the visit counter's tag kept as it stored it
 *   M.4  R1 — confirmed shortfall deposits: EAT midnight on both sides, COALESCE(completedAt, createdAt), REVERSED and
 *        FAILED out, a marked deposit out, staff out, an AGENT in
 *   M.5  R2 — every confirmed player deposit, by the same rules
 *   M.6  the follow-up bets: [deposit, deposit + 30 min] inclusive — 30 minutes exactly counts, 30 minutes + 1 ms does not;
 *        a marked bet never counts
 *   M.7  R4 — players who joined in the window (EAT midnight), staff out, an AGENT in, and each one's first UNMARKED bet;
 *        24 hours exactly is within, 24 hours + 1 ms is not
 *   M.8  W — deposits started per EAT day by outcome (REVERSED counts as confirmed; staff and marked rows out)
 *   M.9  the S9 seam: shut on this build and held to the schema (it must open exactly when S9's columns exist); R3 refuses
 *        while shut; with S9 present (a merged tree), the saved bets and the one-to-one match on real rows
 *   M.10 (Postgres) no read without a window or an id list — every client call recorded; N concurrent first counts of one
 *        key make N; EXPLAIN printed for the row reads (a record, not an assertion)
 *   M.11 the view's own guard: `journey-measures.ts` reads no store directly and never walks a whole table
 *   M.12 ⭐ MASWALI-BUILD S6 · OD-22 — a Maswali Millionea ticket is no bet: never a deposit's follow-up; and (round 5)
 *        a sign-up or a deposit whose player bought a ticket within the window the measure reads for it is MARKED to be
 *        left out of 5 or 4b — a ticket of any week, the private drive's included — both ends of the horizon included;
 *        no ticket is read while no week has ever opened; and the harm watch's holders read the same ticket rows.
 *        Round 6: the ticket read is bounded in time — a ticket outside the units' horizons is never read and changes
 *        nothing, the marks equal round 5's (M.12h; on Postgres every ticket call recorded with its window, M.12h2) —
 *        and 4b's horizon is held at both ends (M.12i). Round 7: R2's and R4's recorded windows are their rows' own
 *        (R2 a chunk's span; R4 each sign-up's first ticket alone, M.12h2)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;
export type DalImpl = {
  counterRows: (from: string, to: string) => Promise<Any[]>;
  homeViewsByDay: (from: string, to: string) => Promise<Map<string, number>>;
  campaignVisits: (from: string, to: string) => Promise<Any[]>;
  shortfallDeposits: (fromMs: number, toMs: number) => Promise<Any[]>;
  /** ⭐ S6 · each row marked `ticketInHorizon` when its player bought a Millionea ticket in the window it is read for. */
  confirmedDeposits: (fromMs: number, toMs: number) => Promise<Any[]>;
  /** ⭐ S6 · round 6 — the one ticket reader, bounded by account AND by `createdAt` in [from, to]. */
  ticketPurchases: (ids: string[], fromMs: number, toMs: number) => Promise<Map<string, number[]>>;
  betsOf: (ids: string[], fromMs: number, toMs: number) => Promise<Any[]>;
  returnedBetsOf: (ids: string[], fromMs: number, toMs: number) => Promise<Any[]>;
  joinedPlayers: (fromMs: number, toMs: number) => Promise<Any[]>;
  depositOutcomesByDay: (fromMs: number, toMs: number) => Promise<Map<string, Any>>;
  s9On: boolean;
  schema: string;
  seam: string;
  measuresSource: string;
  viewSource: string;
};

const ROOT = process.cwd();
const read = (p: string) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n") : "");
const j = (v: unknown) => JSON.stringify(v);
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
/** An instant written in East Africa Time (UTC+3). */
const eatAt = (day: string, h = 0, mi = 0, s = 0, msec = 0) => Date.parse(`${day}T00:00:00.000Z`) - 3 * HOUR + h * HOUR + mi * MIN + s * 1000 + msec;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY).toISOString().slice(0, 10);

export async function loadDal(): Promise<{ D: Any; impl: DalImpl }> {
  const D: Any = await import("../../src/lib/server/journey-measures-dal.ts");
  const impl: DalImpl = {
    counterRows: D.counterRows, homeViewsByDay: D.homeViewsByDay, campaignVisits: D.campaignVisits,
    shortfallDeposits: D.shortfallDeposits, confirmedDeposits: D.confirmedDeposits, ticketPurchases: D.ticketPurchases, betsOf: D.betsOf, returnedBetsOf: D.returnedBetsOf,
    joinedPlayers: D.joinedPlayers, depositOutcomesByDay: D.depositOutcomesByDay, s9On: D.S9_ON,
    schema: read("prisma/schema.prisma"), seam: read("src/lib/server/journey-measures-s9.ts"),
    measuresSource: read("src/lib/journey/measures.ts"), viewSource: read("src/lib/server/journey-measures.ts"),
  };
  return { D, impl };
}

export async function runDalCases(ok: Ok, impl: DalImpl, runIndex = 0): Promise<{ onPostgres: boolean; calls: Any[] }> {
  const { hasDatabase, prisma }: Any = await import("../../src/lib/server/prisma.ts");
  const { db }: Any = await import("../../src/lib/server/store.ts");
  const { marketStore, positionStore }: Any = await import("../../src/lib/server/market-dal.ts");
  const { recordFunnel }: Any = await import("../../src/lib/server/journey-funnel.ts");
  const { recordVisit }: Any = await import("../../src/lib/server/site-visits.ts");
  const onPostgres = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

  /* ── (Postgres) record every client call the reads make ── */
  const calls: Any[] = [];
  if (onPostgres) {
    const real = prisma();
    const MODELS = ["transaction", "position", "user", "journeyFunnelDay", "siteVisitPage", "siteVisitSource", "maswaliTicket"];
    (globalThis as Any).__50PICK_PRISMA = new Proxy(real, {
      get(t, prop, r) {
        const v = Reflect.get(t, prop, r);
        if (typeof prop !== "string" || !MODELS.includes(prop) || !v || typeof v !== "object") return v;
        return new Proxy(v, {
          get(dt, op, dr) {
            const f = Reflect.get(dt, op, dr);
            return typeof f === "function" ? (...a: Any[]) => { calls.push({ model: prop, op: String(op), args: a[0] }); return f.apply(dt, a); } : f;
          },
        });
      },
    });
  }

  /* ── fixtures ── */
  const D0 = addDays("2026-11-02", runIndex * 40), D1 = addDays(D0, 1), D2 = addDays(D0, 2), Dm1 = addDays(D0, -1), Dm5 = addDays(D0, -5);
  const tag = `${process.pid}_${runIndex}_${Math.floor(Math.random() * 1e6)}`;
  const iso = (t: number) => new Date(t).toISOString();
  const users: Record<string, string> = {};
  const person = async (k: string, role: string, joined: number) => {
    const id = `usr_jm_${k}_${tag}`;
    users[k] = id;
    await db.user.create({
      id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: iso(joined), updatedAt: iso(joined), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(joined), updatedAt: iso(joined) } as never);
    return id;
  };
  await person("A", "PLAYER", eatAt(D0, 10));
  await person("B", "PLAYER", eatAt(D0, 23, 59, 59, 999));     // joins on the last instant of D0
  await person("C", "AGENT", eatAt(D1, 0));                     // an AGENT is a player here; joins on D1's first instant
  await person("D", "PLAYER", eatAt(D0, 8));                    // first bet at exactly +24 h
  await person("E", "PLAYER", eatAt(D0, 8));                    // first bet at +24 h + 1 ms
  await person("M", "PLAYER", eatAt(D0, 9));                    // only marked stakes
  await person("F", "FINANCE", eatAt(D0, 12));                  // staff
  await person("O", "PLAYER", eatAt(Dm5, 12));                  // joined before the window
  let seq = 0;
  const dep = async (who: string, status: string, created: number, completed: number | null, extra: Record<string, unknown> = {}) => {
    const id = `txn_jm_${tag}_${++seq}`;
    await db.txn.create({
      id, walletId: `wal_${users[who]}`, userId: users[who], type: "DEPOSIT", status, amount: 1_000, fee: 0, taxWithheld: 0,
      balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: "deposit", positionId: null,
      amlReason: null, createdAt: iso(created), updatedAt: iso(created), completedAt: completed === null ? null : iso(completed), idempotencyKey: null, ...extra,
    } as never);
    return id;
  };
  const MKT = `mkt_jm${tag.replace(/[^a-z0-9]/gi, "")}`;
  const now = new Date().toISOString();
  await marketStore.set({
    id: MKT, titleEn: "Case market", titleSw: "Soko la jaribio", titleZh: null, category: "sports", sourceUrl: "https://example.com",
    resolutionCriterion: "Case", resolutionCriterionSw: null, resolutionCriterionZh: null, resolutionAt: "2027-12-31T00:00:00.000Z",
    selectionClosedAt: null, status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null,
    settledAt: null, reopenedAt: null, reopenCount: null, productLine: "MARKET", proposedBy: users.F, createdAt: now, updatedAt: now,
  });
  let pseq = 0;
  const bet = async (who: string, at: number, stake = 500, extra: Record<string, unknown> = {}) => {
    const id = `pos_jm_${tag}_${++pseq}`;
    await positionStore.set({
      id, userId: users[who], marketId: MKT, side: "YES", stake, bonusStakeTzs: 0, potentialPayout: stake * 2, status: "OPEN",
      finalPayout: null, placedAt: iso(at), settledAt: null, idempotencyKey: null, houseBotId: null, ...extra,
    });
    return id;
  };
  const MARK = `hbt_${"0".repeat(24)}`;
  const d1 = await dep("A", "CONFIRMED", eatAt(D0, 9, 50), eatAt(D0, 10), { origin: "low_balance" });
  const d2 = await dep("A", "CONFIRMED", eatAt(D0, 23, 59, 59, 999), eatAt(D0, 23, 59, 59, 999));   // D0's last instant
  const d3 = await dep("B", "CONFIRMED", eatAt(D1, 0), null);                                          // no completedAt: placed by createdAt, D1's first instant
  const d4 = await dep("A", "REVERSED", eatAt(D0, 11), eatAt(D0, 11, 5), { origin: "low_balance" });
  const d5 = await dep("A", "FAILED", eatAt(D0, 12), eatAt(D0, 12, 5));
  const d6 = await dep("A", "PROCESSING", eatAt(D0, 13), null);
  const d7 = await dep("C", "CONFIRMED", eatAt(D1, 11, 50), eatAt(D1, 12), { origin: "low_balance" });  // the AGENT
  const d8 = await dep("F", "CONFIRMED", eatAt(D0, 14), eatAt(D0, 14, 1), { origin: "low_balance" });   // staff
  const d9 = await dep("A", "CONFIRMED", eatAt(D0, 15), eatAt(D0, 15, 1), { origin: "low_balance", houseBotId: MARK }); // marked
  const d10 = await dep("O", "CONFIRMED", eatAt(Dm1, 12), eatAt(Dm1, 12, 1));                            // the day before the window
  await bet("A", eatAt(D0, 10, 30));                         // d1 + 30 min exactly → followed (inclusive)
  await bet("A", eatAt(D1, 0, 9, 59, 999));                  // d2 + 10 min → followed
  await bet("B", eatAt(D1, 0, 30, 0, 1));                    // d3 + 30 min + 1 ms → NOT followed
  await bet("C", eatAt(D1, 12, 5));                          // d7 + 5 min → followed
  await bet("D", eatAt(D1, 8));                              // D's first bet: exactly 24 h
  await bet("E", eatAt(D1, 8, 0, 0, 1));                     // E's first bet: 24 h + 1 ms
  await bet("M", eatAt(D0, 9, 30), 500, { houseBotId: MARK }); // marked: never a bet here
  await bet("A", eatAt(D0, 15, 10), 500, { houseBotId: MARK }); // a marked stake near d9 — never a follow-up
  /* ⭐ MASWALI-BUILD S6 · OD-22 — a Maswali Millionea ticket is no bet in these measures. On D2, outside every window the
     cases above read: T deposits and buys only a ticket (a position on a MASWALI market); U, the control, deposits and
     places a poll bet. Both join on D2, so a ticket can never stand in for a first bet either. */
  const D3 = addDays(D0, 3);
  const MLN = `mkt_jmmln${tag.replace(/[^a-z0-9]/gi, "")}`;
  await marketStore.set({
    id: MLN, titleEn: "Millionea week", titleSw: "Wiki ya Millionea", titleZh: null, category: "sports", sourceUrl: "https://example.com",
    resolutionCriterion: "Case", resolutionCriterionSw: null, resolutionCriterionZh: null, resolutionAt: "2027-12-31T00:00:00.000Z",
    selectionClosedAt: null, status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null,
    settledAt: null, reopenedAt: null, reopenCount: null, productLine: "MASWALI", proposedBy: users.F, createdAt: now, updatedAt: now,
  });
  await person("T", "PLAYER", eatAt(D2, 9));
  await person("U", "PLAYER", eatAt(D2, 9));
  await dep("T", "CONFIRMED", eatAt(D2, 12, 55), eatAt(D2, 13));
  await dep("U", "CONFIRMED", eatAt(D2, 12, 55), eatAt(D2, 13));
  const ticketId = `pos_jm_${tag}_mln`;
  await positionStore.set({
    id: ticketId, userId: users.T, marketId: MLN, side: "YES", stake: 1_000, bonusStakeTzs: 0, potentialPayout: 0, status: "OPEN",
    finalPayout: null, placedAt: iso(eatAt(D2, 13, 5)), settledAt: null, idempotencyKey: null, houseBotId: null,
  });
  await bet("U", eatAt(D2, 13, 5));
  // …and the ticket rows themselves (round 5: a unit is left out when its player bought a ticket within the window the
  // measure reads for it — `ticketPurchases` reads these rows), on an opened week of the PRIVATE DRIVE: a drive ticket
  // counts like any week's (OD-21), and an opened week is what lets the measures read tickets at all. T bought 4 h after
  // joining (5 minutes after depositing); X exactly 24 h after joining; V 24 h + 1 ms after joining (20 h after depositing).
  const { weekStore, ticketStore }: Any = await import("../../src/lib/server/maswali-dal.ts");
  const cycleId = `cyc_jm_${tag.replace(/[^a-z0-9]/gi, "")}`;
  await weekStore.create({
    id: cycleId, marketId: MLN, code: `MLN-JM-${tag}`, seq: 900_000 + runIndex, visibility: "DRIVE", state: "CLOSED",
    opensAt: iso(eatAt(D2, 0)), closesAt: iso(eatAt(D3, 0)), finalDeadlineAt: iso(eatAt(addDays(D0, 6), 0)), closedAt: iso(eatAt(D3, 0)),
    rulesSnapshot: { planted: true }, questionSetHash: "planted", ticketMerkleRoot: null, ticketCount: 0, salesAtClose: null, gradedSetFinalAt: null,
    objectionsCloseAt: null, objectionRestarted: false, rolloverIn: null, jackpot: null, fee: null, traLevy: null, gbtLevy: null,
    topUp: null, winningTickets: null, sharePerTicket: null, paidTotal: null, carryOut: null, dustCarried: null,
    settlementGroupId: null, settledAt: null, releasedBy: null, isFinal: false, parityAttestedBy: null, parityAttestedAt: null,
    createdBy: users.F, createdAt: now, updatedAt: now,
  });
  await person("V", "PLAYER", eatAt(D2, 9));
  await person("X", "PLAYER", eatAt(D2, 9));
  await dep("V", "CONFIRMED", eatAt(D2, 12, 55), eatAt(D2, 13));
  const plantTicket = async (who: string, positionId: string, at: number, n: number) => {
    if (positionId !== ticketId) {
      await positionStore.set({
        id: positionId, userId: users[who], marketId: MLN, side: "YES", stake: 1_000, bonusStakeTzs: 0, potentialPayout: 0, status: "OPEN",
        finalPayout: null, placedAt: iso(at), settledAt: null, idempotencyKey: null, houseBotId: null,
      });
    }
    await ticketStore.create({
      id: `tkt_jm_${tag.replace(/[^a-z0-9]/gi, "")}_${n}`, positionId, cycleId, userId: users[who], serial: `MLN-JM-${tag}-000${n}`,
      selections: Array.from({ length: 15 }, () => "YES"), salt: "case-salt", selectionsHash: "case-hash", picksKey: "case-picks",
      status: "LIVE", cancelledAt: null, closeAtPurchase: iso(eatAt(D3, 0)), rulesVersion: "case", score: null, won: null, payout: null,
      frozenReason: null, lastViewedAt: null, createdAt: iso(at),
    });
  };
  await plantTicket("T", ticketId, eatAt(D2, 13, 5), 1);
  await plantTicket("X", `pos_jm_${tag}_mlnx`, eatAt(D2, 9) + DAY, 2);
  await plantTicket("V", `pos_jm_${tag}_mlnv`, eatAt(D2, 9) + DAY + 1, 3);
  // ⭐ Round 6 (MEDIUM-2) — a ticket far outside every horizon these cases read: T's second, 25 days on. A read bounded by
  // the units' own horizons never sees it (M.12h).
  await plantTicket("T", `pos_jm_${tag}_mlnfar`, eatAt(addDays(D0, 25), 12), 4);
  // ⭐ Round 6 (LOW 2) — 4b's horizon at both ends. Y, Z and Q joined before every window (R4 never reads them), and each
  // deposits on D2: Y's ticket came 10 minutes BEFORE its deposit, Z's at exactly +30 minutes, Q's at +30 minutes + 1 ms.
  for (const k of ["Y", "Z", "Q"]) await person(k, "PLAYER", eatAt(Dm5, 12));
  await dep("Y", "CONFIRMED", eatAt(D2, 13, 59), eatAt(D2, 14));
  await dep("Z", "CONFIRMED", eatAt(D2, 14, 59), eatAt(D2, 15));
  await dep("Q", "CONFIRMED", eatAt(D2, 15, 59), eatAt(D2, 16));
  await plantTicket("Y", `pos_jm_${tag}_mlny`, eatAt(D2, 13, 50), 5);
  await plantTicket("Z", `pos_jm_${tag}_mlnz`, eatAt(D2, 15, 30), 6);
  await plantTicket("Q", `pos_jm_${tag}_mlnq`, eatAt(D2, 16, 30) + 1, 7);

  // Counters (EAT day = the `now` handed in).
  const ev = async (day: string, step: string, origin: string, variant: string, n: number, uc = "", us = "") => {
    for (let i = 0; i < n; i++) await recordFunnel({ step, origin, variant, utmSource: us, utmCampaign: uc }, eatAt(day, 12));
  };
  await ev(D0, "sheet_open", "home", "old", 3);
  await ev(D0, "sheet_open", "board", "old", 2, "launch", "facebook");
  await ev(D0, "bet", "dial", "old", 4);
  await ev(D0, "bet", "dial", "old", 1, "launch", "facebook");
  await ev(D0, "low_balance", "dial", "old", 2);
  await ev(D0, "low_balance", "updown", "old", 1);
  await ev(D0, "sheet_open", "home", "old", 1, "Launch!");   // a tag the funnel drops → stored as no tag
  await ev(D1, "sheet_open", "card", "new", 5);
  await ev(D1, "bet", "sheet", "new", 2);
  await ev(D2, "bet", "quick", "old", 7);
  // Visits.
  const visit = async (day: string, p: string, e: boolean, c = "") => recordVisit({ p, r: e ? "example.com" : "", s: e ? "facebook" : "", m: e ? "cpc" : "", c: e ? c : "", e }, eatAt(day, 9));
  await visit(D0, "/", true, "launch"); await visit(D0, "/", true, "launch"); await visit(D0, "/", true, "launch!");
  await visit(D0, "/markets", true, "launch");
  await visit(D1, "/", false);

  const W0 = eatAt(D0), W2 = eatAt(D2);   // the window [D0, D2)
  if (onPostgres) calls.length = 0;        // count only the reads below

  /* M.1 · counters */
  const rows = await impl.counterRows(D0, D1);
  const sumOf = (f: (r: Any) => boolean) => rows.filter(f).reduce((n: number, r: Any) => n + r.count, 0);
  ok("M.1 · counters: every dimension over the inclusive day range — D2's quick bets left out; the funnel's tags as stored",
    sumOf((r: Any) => r.day === D0 && r.step === "sheet_open" && r.variant === "old") === 6 && sumOf((r: Any) => r.step === "sheet_open" && r.utmCampaign === "launch") === 2
      && sumOf((r: Any) => r.day === D1 && r.step === "sheet_open" && r.variant === "new") === 5 && sumOf((r: Any) => r.day < D0 || r.day > D1) === 0
      && sumOf((r: Any) => r.step === "bet" && r.origin === "dial") === 5 && sumOf((r: Any) => r.step === "bet" && r.origin === "quick") === 0
      && sumOf((r: Any) => r.step === "sheet_open" && r.variant === "new") === 5 && sumOf((r: Any) => r.utmCampaign === "Launch!" || r.utmCampaign === "launch!") === 0
      && sumOf((r: Any) => r.step === "sheet_open" && r.origin === "home" && r.utmCampaign === "") === 4,
    j(rows.map((r: Any) => [r.day.slice(5), r.step, r.origin, r.variant, r.utmCampaign, r.count])));

  /* M.2 · home views */
  const hv = await impl.homeViewsByDay(D0, D2);
  ok("M.2 · home views per EAT day from the per-path read: '/' only, every day it was viewed",
    hv.get(D0) === 3 && hv.get(D1) === 1 && !hv.has(D2) && hv.size === 2, j([...hv]));

  /* M.3 · campaign visits */
  const cv = await impl.campaignVisits(D0, D1);
  ok("M.3 · campaign visits per day and tag: entries only, the empty tag out, the visit counter's own spelling kept ('launch!')",
    j(cv) === j([{ day: D0, campaign: "launch", visits: 3 }, { day: D0, campaign: "launch!", visits: 1 }]), j(cv));

  /* M.4 · R1 */
  const r1 = await impl.shortfallDeposits(W0, W2);
  const ids = (xs: Any[]) => xs.map((x: Any) => x.id).sort();
  ok("M.4 · R1: confirmed shortfall deposits of players in [D0, D2) — the AGENT in; REVERSED, staff, marked and the day before out",
    j(ids(r1)) === j([d1, d7].sort()), j(ids(r1)));
  ok("M.4b · R1 carries the window instant (completedAt) and the match instant; with S9 shut, no saved bet is claimed",
    r1.find((x: Any) => x.id === d1)?.at === eatAt(D0, 10) && r1.find((x: Any) => x.id === d1)?.completedAt === eatAt(D0, 10)
      && (impl.s9On || r1.every((x: Any) => x.savedBet === null)));

  /* M.5 · R2 (no Millionea ticket in these windows: nothing is marked — M.12 holds the ticket rule) */
  const r2 = await impl.confirmedDeposits(W0, W2);
  ok("M.5 · R2: every confirmed player deposit in [D0, D2): D0's last instant in, D1's first instant in by createdAt (no completedAt)",
    j(ids(r2)) === j([d1, d2, d3, d7].sort()) && r2.find((x: Any) => x.id === d3)?.at === eatAt(D1, 0) && r2.find((x: Any) => x.id === d3)?.completedAt === null,
    j(ids(r2)));
  const r2edge = await impl.confirmedDeposits(W0, eatAt(D0, 23, 59, 59, 999));
  ok("M.5b · the window is half-open: a deposit at exactly its upper bound is outside", !ids(r2edge).includes(d2) && ids(r2edge).includes(d1), j(ids(r2edge)));

  /* M.6 · follow-up bets */
  const fb = await impl.betsOf([users.A, users.B, users.C, users.M], W0, W2 + 30 * MIN);
  const atOf = (who: string) => fb.filter((b: Any) => b.userId === users[who]).map((b: Any) => b.placedAt).sort();
  const within = (d: number, who: string) => atOf(who).some((t: number) => t >= d && t <= d + 30 * MIN);
  ok("M.6 · follow-ups: 30 minutes exactly counts (d1), 30 minutes + 1 ms does not (d3); a marked stake is never a bet",
    within(eatAt(D0, 10), "A") && !within(eatAt(D1, 0), "B") && within(eatAt(D1, 12), "C") && atOf("M").length === 0
      && !fb.some((b: Any) => b.placedAt === eatAt(D0, 15, 10)), j(fb.map((b: Any) => [b.userId.split("_")[2], new Date(b.placedAt).toISOString()])));
  ok("M.6b · the bet read is inclusive at its upper bound", (await impl.betsOf([users.A], eatAt(D0, 10, 30), eatAt(D0, 10, 30))).length === 1);

  /* M.7 · R4 */
  const r4 = await impl.joinedPlayers(W0, W2);
  const byId = Object.fromEntries(r4.map((p: Any) => [p.id, p]));
  ok("M.7 · R4: players who joined in [D0, D2) — the AGENT in, staff out, the earlier player out; each with the first UNMARKED bet",
    j(Object.keys(byId).sort()) === j([users.A, users.B, users.C, users.D, users.E, users.M].sort())
      && byId[users.A].firstBetAt === eatAt(D0, 10, 30) && byId[users.M].firstBetAt === null && byId[users.B].joinedAt === eatAt(D0, 23, 59, 59, 999),
    j(r4.map((p: Any) => [p.id.split("_")[2], p.firstBetAt])));
  ok("M.7b · 24 hours exactly is within the horizon, 24 hours + 1 ms is not",
    byId[users.D].firstBetAt - byId[users.D].joinedAt === DAY && byId[users.E].firstBetAt - byId[users.E].joinedAt === DAY + 1);

  /* M.8 · W */
  const w = await impl.depositOutcomesByDay(W0, W2);
  ok("M.8 · deposits started per EAT day by outcome: REVERSED counts as confirmed, FAILED as failed, PROCESSING undecided; staff and marked out",
    j(w.get(D0)) === j({ day: D0, confirmed: 3, failed: 1, undecided: 1 }) && j(w.get(D1)) === j({ day: D1, confirmed: 2, failed: 0, undecided: 0 }) && w.size === 2,
    j([...w.values()]));

  /* M.9 · the S9 seam */
  const schemaHasS9 = /model Transaction \{[\s\S]*?\n\s+pendingBet\s+Json\?[\s\S]*?\n\}/.test(impl.schema) && /model Position \{[\s\S]*?\n\s+origin\s+String\?[\s\S]*?\n\}/.test(impl.schema);
  // Read the CODE, not the doc comment (which shows the plug-in's own text).
  const seamCode = impl.seam.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const seamOpen = /export const S9_RECORDS: S9Records \| null = \{/.test(seamCode);
  const seamShut = /export const S9_RECORDS: S9Records \| null = null;/.test(seamCode);
  ok("M.9 · ⛔ the S9 seam is open exactly when the schema carries S9's two columns (a merge that brings S9 cannot leave the figures dark)",
    (schemaHasS9 && seamOpen && impl.s9On) || (!schemaHasS9 && seamShut && !impl.s9On), j({ schemaHasS9, seamOpen, seamShut, s9On: impl.s9On }));
  const depositStateExists = existsSync(join(ROOT, "src/lib/journey/deposit-state.ts"));
  const ownConstant = /export const DEPOSIT_FOLLOW_UP_MS = 30 \* 60_000;/.test(impl.measuresSource);
  ok("M.9b · one 30-minute rule: measures.ts defines it only while S9's deposit-state.ts is absent, and takes S9's once it exists",
    depositStateExists ? !ownConstant && /DEPOSIT_RETURN_WINDOW_MS/.test(impl.measuresSource) : ownConstant, j({ depositStateExists, ownConstant }));
  if (!impl.s9On) {
    let refused = false;
    try { await impl.returnedBetsOf([users.A], W0, W2); } catch { refused = true; }
    ok("M.9c · while the seam is shut, the returned-bet read refuses (it never answers [] for records it cannot read)", refused);
  } else {
    // S9 present (a merged tree): the envelopes and the one-to-one match on real rows.
    const env = (bet: string, returnPath: string) => ({ v: 1, bet, returnPath });
    const q = await dep("A", "CONFIRMED", eatAt(D1, 14), eatAt(D1, 14, 1), { origin: "low_balance", pendingBet: env(`${MKT}.YES.1000`, `/markets/${MKT}`) });
    const q2 = await dep("A", "CONFIRMED", eatAt(D1, 14, 2), eatAt(D1, 14, 3), { origin: "low_balance", pendingBet: env(`${MKT}.YES.1000`, `/markets/${MKT}`) });
    const rd = await dep("B", "CONFIRMED", eatAt(D1, 15), eatAt(D1, 15, 1), { origin: "low_balance", pendingBet: env("udr_abc123.UP.1000", "/updown/udr_abc123") });
    const bad = await dep("B", "CONFIRMED", eatAt(D1, 16), eatAt(D1, 16, 1), { origin: "low_balance", pendingBet: { v: 2, bet: "x", returnPath: "/" } });
    await bet("A", eatAt(D1, 14, 10), 1000, { origin: "deposit_return" });
    await bet("A", eatAt(D1, 14, 12), 700, { origin: "deposit_return" });
    const r1s9 = await impl.shortfallDeposits(W0, W2);
    const saved = (id: string) => r1s9.find((x: Any) => x.id === id)?.savedBet ?? null;
    ok("M.9d · S9: a question envelope is a saved question bet; a round, a malformed envelope and none are not",
      j(saved(q)) === j({ marketId: MKT, side: "YES", stake: 1000 }) && saved(rd) === null && saved(bad) === null && saved(d1) === null, j(r1s9.map((x: Any) => [x.id, x.savedBet])));
    const ret = await impl.returnedBetsOf([users.A, users.B], W0, W2 + 30 * MIN);
    const { matchReturnedBets }: Any = await import("../../src/lib/journey/measures.ts");
    const m = matchReturnedBets(r1s9.filter((x: Any) => x.completedAt !== null).map((x: Any) => ({ id: x.id, userId: x.userId, at: x.completedAt, savedBet: x.savedBet })), ret);
    ok("M.9e · S9: two deposits before one returned bet — only the later is matched; a returned bet on another stake matches nothing",
      ret.length === 2 && j([...m]) === j([q2]), j({ ret: ret.length, m: [...m] }));
  }

  /* M.12 · ⭐ MASWALI-BUILD S6 · OD-22 — a Millionea ticket is no bet (both twins; on Postgres, before M.10 records the reads) */
  const fbT = await impl.betsOf([users.T, users.U], eatAt(D2), eatAt(D3) + 30 * MIN);
  ok("M.12 · ⭐ a Maswali Millionea ticket is no bet: T's deposit, followed only by a ticket, has no follow-up; U's poll bet beside it still counts",
    !fbT.some((b: Any) => b.userId === users.T) && fbT.filter((b: Any) => b.userId === users.U).length === 1 && !fbT.some((b: Any) => b.id === ticketId),
    j(fbT.map((b: Any) => [b.userId.split("_")[2], b.marketId === MLN ? "ticket" : "poll"])));
  /* ⭐ ROUND 5 (the lead's decision) — a unit is left out of 5 or 4b only when its player bought a Millionea ticket WITHIN
     THAT UNIT'S OWN HORIZON, the window the measure reads for it; a ticket of any week counts, the private drive's
     included. R2 and R4 MARK such a unit (`ticketInHorizon`) and the view leaves it out; no launch instant decides it. */
  const r4T = await impl.joinedPlayers(eatAt(D2), eatAt(D3));
  const byT = Object.fromEntries(r4T.map((p: Any) => [p.id, p]));
  ok("M.12b · ⭐ R5 · a sign-up whose player bought a ticket within measure 5's own horizon is marked to be left out: T (a private drive week's ticket, 4 h after joining); U, who bought none, is not, with its poll bet",
    byT[users.T]?.ticketInHorizon === true && byT[users.T]?.firstBetAt === null && !!byT[users.U] && !byT[users.U].ticketInHorizon
      && byT[users.U].firstBetAt === eatAt(D2, 13, 5), j(r4T.map((p: Any) => [p.id.split("_")[2], p.ticketInHorizon ?? false, p.firstBetAt])));
  const DAL: Any = await import("../../src/lib/server/journey-measures-dal.ts");
  const bought: Map<string, number[]> = await impl.ticketPurchases([users.T, users.U], eatAt(D2), eatAt(D3));
  const weekRow: Any = await weekStore.get(cycleId);
  ok("M.12c · CONTROL · the ticket really is on the store — T bought one, on an opened PRIVATE DRIVE week, its position on a MASWALI market; U bought none — so M.12–M.12g are not vacuous",
    j(bought.get(users.T)) === j([eatAt(D2, 13, 5)]) && !bought.has(users.U) && weekRow?.visibility === "DRIVE" && weekRow?.state === "CLOSED"
      && ((await positionStore.getMany([ticketId])) as Any[]).some((p: Any) => p.id === ticketId && p.marketId === MLN)
      && (await marketStore.bookByIds([MLN])).get(MLN)?.productLine === "MASWALI", j({ bought: [...bought.keys()].map((x) => x.split("_")[2]), week: weekRow?.visibility }));
  const r2T = await impl.confirmedDeposits(eatAt(D2), eatAt(D3));
  ok("M.12d · ⭐ R5 · …and 4b: T's deposit, followed by its ticket within the window 4b reads, is marked; U's is not",
    r2T.some((d: Any) => d.userId === users.T && d.ticketInHorizon === true) && r2T.some((d: Any) => d.userId === users.U && !d.ticketInHorizon),
    j(r2T.map((d: Any) => [d.userId.split("_")[2], d.ticketInHorizon ?? false])));
  ok("M.12e · ⭐ R5 · the horizon is the measure's own, both ends included: X's ticket at exactly 24 h marks its sign-up; V's, 1 ms later, leaves V's sign-up in — and V's deposit, 20 h before the ticket, in",
    byT[users.X]?.ticketInHorizon === true && !!byT[users.V] && !byT[users.V].ticketInHorizon
      && r2T.some((d: Any) => d.userId === users.V && !d.ticketInHorizon), j({ X: byT[users.X]?.ticketInHorizon ?? false, V: byT[users.V]?.ticketInHorizon ?? false }));
  // M.12f · while no Millionea week has ever opened, no ticket is read at all (the store's reads are counted).
  const listReal = weekStore.list, forUserReal = ticketStore.listForUser;
  let ticketReads = 0;
  const pgTicketCalls = () => calls.filter((c: Any) => c.model === "maswaliTicket").length;
  const pgBefore = pgTicketCalls();
  weekStore.list = async () => [];
  ticketStore.listForUser = async (...a: Any[]) => { ticketReads++; return forUserReal.apply(ticketStore, a); };
  let r4Closed: Any[] = [];
  try { r4Closed = await impl.joinedPlayers(eatAt(D2), eatAt(D3)); } finally { weekStore.list = listReal; ticketStore.listForUser = forUserReal; }
  ok("M.12f · ⭐ R5 · while no Millionea week has ever opened no ticket is read at all, and nothing is marked: the read is exactly the twin's",
    ticketReads === 0 && pgTicketCalls() === pgBefore && r4Closed.length === r4T.length && r4Closed.every((p: Any) => !p.ticketInHorizon),
    j({ ticketReads, pg: pgTicketCalls() - pgBefore, n: r4Closed.length }));
  // M.12g · the harm watch's second count reads the same ticket rows (`ticketHolders`: bought at or before an instant).
  const holders: Set<string> = await DAL.ticketHolders([users.T, users.U, users.V, users.X], eatAt(addDays(D0, 6)));
  const holdersEarly: Set<string> = await DAL.ticketHolders([users.V, users.X], eatAt(D2, 9) + DAY);
  ok("M.12g · the harm watch's holders read the same ticket rows: T, V and X hold one (any week, the drive's included), U does not; by X's purchase instant, X holds one and V not yet",
    holders.has(users.T) && holders.has(users.V) && holders.has(users.X) && !holders.has(users.U) && holdersEarly.has(users.X) && !holdersEarly.has(users.V),
    j({ all: [...holders].map((x) => x.split("_")[2]), early: [...holdersEarly].map((x) => x.split("_")[2]) }));
  /* M.12h · ⭐ ROUND 6 (MEDIUM-2) — the ticket read is bounded in time as well as by account: a ticket outside the bounds
     is never read (T's second, 25 days on; V's, 1 ms past the sign-up window), and it changes nothing — R2's and R4's
     marks are exactly what round 5's rule makes of every ticket ever bought. */
  const { FIRST_BET_HORIZON_MS: H5, DEPOSIT_FOLLOW_UP_MS: H4b }: Any = await import("../../src/lib/journey/measures.ts");
  const EVER: [number, number] = [Date.parse("2000-01-01T00:00:00.000Z"), Date.parse("2100-01-01T00:00:00.000Z")];
  const inSignUps = await impl.ticketPurchases([users.T, users.U, users.V, users.X], eatAt(D2, 9), eatAt(D2, 9) + H5);
  const ever = await impl.ticketPurchases(["T", "U", "V", "X", "Y", "Z", "Q"].map((k) => users[k]), EVER[0], EVER[1]);
  const round5 = (who: string, from: number, to: number) => (ever.get(who) ?? []).some((t: number) => t >= from && t <= to);
  const same4 = r4T.length === 4 && r4T.every((p: Any) => !!p.ticketInHorizon === round5(p.id, p.joinedAt, p.joinedAt + H5));
  const same2 = r2T.length === 6 && r2T.every((d: Any) => !!d.ticketInHorizon === round5(d.userId, d.at, d.at + H4b));
  ok("M.12h · ⭐ R6 · the ticket read is bounded in time: T's ticket 25 days on and V's 1 ms past the sign-ups' horizon are never read, and R4's and R2's marks equal round 5's rule over every ticket ever bought",
    j(inSignUps.get(users.T)) === j([eatAt(D2, 13, 5)]) && j(inSignUps.get(users.X)) === j([eatAt(D2, 9) + DAY]) && !inSignUps.has(users.V) && !inSignUps.has(users.U)
      && (ever.get(users.T) ?? []).length === 2 && ever.has(users.V) && same4 && same2,
    j({ T: inSignUps.get(users.T)?.length ?? 0, V: inSignUps.has(users.V), everT: ever.get(users.T)?.length ?? 0, same4, same2, r4: r4T.length, r2: r2T.length }));
  if (onPostgres) {
    const ticketCalls = calls.filter((c: Any) => c.model === "maswaliTicket");
    const windowed = ticketCalls.every((c: Any) => Array.isArray(c.args?.where?.userId?.in) && c.args?.where?.createdAt?.lte instanceof Date
      && (c.op !== "findMany" || c.args.where.createdAt.gte instanceof Date));
    // ⭐ Round 7 — R4's and R2's reads over D2 are their rows' own windows: R4 one row per buyer, by the latest sign-up's
    // horizon end; R2 the deposits' first instant to the last one's follow-up end (13:00 to 16:30).
    const sameIds = (c: Any, keys: string[]) => j([...new Set(c.args?.where?.userId?.in ?? [])].sort()) === j(keys.map((k) => users[k]).sort());
    const r4Call = ticketCalls.find((c: Any) => c.op === "groupBy" && sameIds(c, ["T", "U", "V", "X"]));
    const r2Call = ticketCalls.find((c: Any) => c.op === "findMany" && sameIds(c, ["T", "U", "V", "Y", "Z", "Q"]));
    ok("M.12h2 · ⭐ R6/R7 · (Postgres) every ticket read carries an id list AND a window on the ticket's own createdAt, and R4's and R2's are their rows' own: R4 each sign-up's first ticket by the latest horizon end, R2 [its first deposit, its last deposit + 30 minutes] — recorded, not assumed",
      ticketCalls.length >= 4 && windowed && !!r4Call && r4Call.args.where.createdAt.lte.getTime() === eatAt(D2, 9) + H5 && r4Call.args.where.createdAt.gte === undefined
        && !!r2Call && r2Call.args.where.createdAt.gte.getTime() === eatAt(D2, 13) && r2Call.args.where.createdAt.lte.getTime() === eatAt(D2, 16) + H4b,
      j({ calls: ticketCalls.map((c: Any) => `${c.op} ${j(c.args?.where?.createdAt ?? null)}`), r4: !!r4Call, r2: !!r2Call }));
  }
  /* M.12i · ⭐ ROUND 6 (LOW 2) — 4b's horizon is [the deposit, +30 minutes], both ends included, and nothing before it. */
  const dOf = (k: string) => r2T.find((d: Any) => d.userId === users[k]);
  ok("M.12i · ⭐ R6 · 4b's horizon at both ends: Y's ticket 10 minutes BEFORE its deposit leaves the deposit in; Z's at exactly +30 minutes marks it; Q's at +30 minutes + 1 ms leaves it in",
    !!dOf("Y") && !dOf("Y").ticketInHorizon && dOf("Z")?.ticketInHorizon === true && !!dOf("Q") && !dOf("Q").ticketInHorizon,
    j(["Y", "Z", "Q"].map((k) => [k, dOf(k)?.ticketInHorizon ?? false])));
  /* M.12j · ⭐ ROUNDS 9 and 11 — across chunks: with the chunk size shrunk (the DAL's test seam), R2 and R4 read in
     several chunks, each over its own span, and every mark is the one-chunk read's — with a marked unit LAST in a chunk
     (R4's at size two, R2's at size five), so a read that skipped a chunk's last unit fails. The reads are counted on
     both stores: on memory the ticket store's per-user reads, on Postgres the recorded calls. */
  const callsBefore = calls.length;
  let perUser = 0;
  const forUserSpied = ticketStore.listForUser;
  ticketStore.listForUser = async (...a: Any[]) => { perUser++; return forUserSpied.apply(ticketStore, a); };
  let r2c: Any[] = [], r4c: Any[] = [], r2c5: Any[] = [];
  const perRead: number[] = [];
  try {
    DAL.__setMeasuresChunkForTests(2);
    r2c = await impl.confirmedDeposits(eatAt(D2), eatAt(D3)); perRead.push(perUser); perUser = 0;
    r4c = await impl.joinedPlayers(eatAt(D2), eatAt(D3)); perRead.push(perUser); perUser = 0;
    DAL.__setMeasuresChunkForTests(5);
    r2c5 = await impl.confirmedDeposits(eatAt(D2), eatAt(D3)); perRead.push(perUser);
  } finally { DAL.__setMeasuresChunkForTests(null); ticketStore.listForUser = forUserSpied; }
  const marksOf = (rows: Any[], key: (r: Any) => string) => j(rows.map((r: Any) => [key(r), !!r.ticketInHorizon]).sort());
  const chunkReads = calls.slice(callsBefore).filter((c: Any) => c.model === "maswaliTicket");
  ok("M.12j · ⭐ R9/R11 · across chunks: every mark R2 and R4 make equals the one-chunk read's, a marked unit last in a chunk included — and the reads counted (memory: each chunk's per-user reads; Postgres: R2 three then two chunks, R4 two)",
    marksOf(r2c, (d: Any) => d.id) === marksOf(r2T, (d: Any) => d.id) && marksOf(r4c, (p: Any) => p.id) === marksOf(r4T, (p: Any) => p.id)
      && marksOf(r2c5, (d: Any) => d.id) === marksOf(r2T, (d: Any) => d.id)
      && (onPostgres
        ? chunkReads.filter((c: Any) => c.op === "findMany").length === 5 && chunkReads.filter((c: Any) => c.op === "groupBy").length === 2
          // ⭐ Round 14 — R4 reads its ids sorted, so X closes the second chunk on Postgres too, whatever order the rows came in.
          && j(chunkReads.filter((c: Any) => c.op === "groupBy").map((c: Any) => c.args?.where?.userId?.in)) === j([[users.T, users.U].sort(), [users.V, users.X].sort()])
        : j(perRead) === j([6, 4, 6])),
    j({ r2: r2c.length, r4: r4c.length, perRead, reads: chunkReads.map((c: Any) => c.op) }));
  // M.12k · ⭐ ROUND 11 — the seam takes only a whole number of at least one, or null to put the product's size back.
  let refusedSizes = 0;
  for (const bad of [0, -1, 1.5, Number.NaN]) { try { DAL.__setMeasuresChunkForTests(bad); } catch { refusedSizes++; } }
  DAL.__setMeasuresChunkForTests(null);
  ok("M.12k · ⭐ R11 · the chunk seam refuses a size that is not a whole number of at least one (zero, negative, fractional, NaN), and null puts the product's own back",
    refusedSizes === 4, `${refusedSizes} of 4 refused`);

  /* M.10 · Postgres: the calls, the concurrent first count, EXPLAIN */
  if (onPostgres) {
    const READS = new Set(["findMany", "findFirst", "groupBy", "count", "aggregate"]);
    const bounded = (where: Any): boolean => {
      if (!where || typeof where !== "object") return false;
      for (const [k, v] of Object.entries(where)) {
        if (k === "OR" || k === "AND") { if (Array.isArray(v) && v.length > 0 && v.every((x) => bounded(x))) return true; continue; }
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const o = v as Record<string, unknown>;
          if (Array.isArray(o.in)) return true;
          if ("gte" in o || "gt" in o || "lt" in o || "lte" in o) return true;
          if (bounded(o)) return true;
        }
      }
      return false;
    };
    const reads = calls.filter((c: Any) => READS.has(c.op));
    const unbounded = reads.filter((c: Any) => !bounded(c.args?.where));
    ok("M.10 · ⛔ every read the measures make on Postgres carries a window or an id list (recorded, not assumed)",
      reads.length >= 8 && unbounded.length === 0, j({ reads: reads.map((c: Any) => `${c.model}.${c.op}`), unbounded: unbounded.map((c: Any) => `${c.model}.${c.op} ${j(c.args)}`) }));
    const real = prisma();
    const K = { step: "sheet_open", origin: "market", variant: "new", utmSource: "", utmCampaign: `race${runIndex}` };
    const N = 20;
    await Promise.all(Array.from({ length: N }, () => recordFunnel(K, eatAt(D2, 12)).catch(() => false)));
    const after = (await impl.counterRows(D2, D2)).filter((r: Any) => r.utmCampaign === K.utmCampaign).reduce((n: number, r: Any) => n + r.count, 0);
    ok(`M.10b · ${N} concurrent first counts of one counter key make ${N} (the Prisma upsert loses none)`, after === N, `${after}`);
    const explain = async (label: string, sql: string) => {
      try {
        const plan = await real.$queryRawUnsafe(`EXPLAIN ${sql}`);
        console.log(`EXPLAIN [${label}] ${plan.map((r: Any) => r["QUERY PLAN"]).join(" | ").slice(0, 400)}`);
      } catch (e) { console.log(`EXPLAIN [${label}] failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
    };
    const f = new Date(W0).toISOString(), t = new Date(W2).toISOString();
    await real.$executeRawUnsafe("SET enable_seqscan = off");
    await explain("R1", `SELECT t.id FROM "Transaction" t JOIN "User" u ON u.id = t."userId" WHERE t.type = 'DEPOSIT' AND t.status = 'CONFIRMED' AND t.origin = 'low_balance' AND t."houseBotId" IS NULL AND u.role::text <> ALL(ARRAY['ADMIN','COMPLIANCE','MODERATOR','FINANCE','GROWTH','AUDITOR','SUPPORT']) AND ((t."completedAt" >= '${f}' AND t."completedAt" < '${t}') OR (t."completedAt" IS NULL AND t."createdAt" >= '${f}' AND t."createdAt" < '${t}'))`);
    await explain("R2-bets", `SELECT p.id FROM "Position" p WHERE p."userId" = ANY(ARRAY['${users.A}']) AND p."houseBotId" IS NULL AND p."placedAt" >= '${f}' AND p."placedAt" <= '${t}'`);
    await explain("R4", `SELECT u.id FROM "User" u WHERE u.role::text <> ALL(ARRAY['ADMIN']) AND u."createdAt" >= '${f}' AND u."createdAt" < '${t}'`);
    await explain("W", `SELECT t.status FROM "Transaction" t WHERE t.type = 'DEPOSIT' AND t."houseBotId" IS NULL AND t."createdAt" >= '${f}' AND t."createdAt" < '${t}'`);
    await real.$executeRawUnsafe("RESET enable_seqscan");
  }

  /* M.11 · the view's own guard */
  const view = impl.viewSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("M.11 · the view reads no store directly: no db., no prisma(, no positionStore, no listAll — only the reads above",
    !/\bdb\.|prisma\(|positionStore|listAll\(/.test(view) && /from "\.\/journey-measures-dal"/.test(view));
  return { onPostgres, calls };
}
