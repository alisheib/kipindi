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
  confirmedDeposits: (fromMs: number, toMs: number) => Promise<Any[]>;
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
    shortfallDeposits: D.shortfallDeposits, confirmedDeposits: D.confirmedDeposits, betsOf: D.betsOf, returnedBetsOf: D.returnedBetsOf,
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
    const MODELS = ["transaction", "position", "user", "journeyFunnelDay", "siteVisitPage", "siteVisitSource"];
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

  /* M.5 · R2 */
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
