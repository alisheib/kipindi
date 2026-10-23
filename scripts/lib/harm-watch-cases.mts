/**
 * THE CASES BEHIND `test:harm-watch` — the S13 harm watch's daily count (`src/lib/server/harm-watch.ts`, S13-PLAN WP3).
 *
 * Shared by the two-store child (`harm-watch-child.mts`) and the in-process red twin (`harm-watch.test.mts --prove-red`,
 * memory only), which runs these very cases with one defect planted at a time.
 *
 *   H.1  before 03:00 EAT nothing is counted
 *   H.2  ⭐ the daily count equals Player Safety's own full walk (`detectHarmMarkersForAllUsers`) on the same fixtures:
 *        deposits in a burst, top-ups after betting on earlier days, both, neither, old deposits, a staff
 *        account and a marked deposit — no role, account or marker filter (D20a)
 *   H.3  a second count on the same EAT day writes nothing (idempotent by day)
 *   H.4  an overrun of the time ceiling records the day "not counted" — never a partial number, never 0
 *   H.5  a failed read records the day "not counted", with the reason
 *   H.6  the series reads back by day; a day never counted is absent (the panel says "not counted"), never 0
 *   H.7  a malformed series reads as unreadable and is never overwritten
 *   H.8  two containers counting one day write it once
 *   H.9  the series keeps at most 400 days
 *   H.10 the count runs Player Safety's own marker logic (imported, not re-implemented); the lifecycle and the reset wiring (source)
 *   H.11 ⭐ MASWALI-BUILD S6 · OD-22 — once a Millionea week has opened, the same count is also taken over the candidates
 *        holding no ticket, into its OWN row (round 2); the count itself never changes, nothing is split before any week,
 *        a failed ticket read drops only the second count, and the S13 row still passes the old parser's shape check.
 *        Round 4 (H.11f/H.11g): the split starts at the first PUBLIC week's opening — a drive week's opening starts
 *        nothing. Round 6 (H.11h/H.11h2): who holds a ticket is read outside the time ceiling — a slow ticket read no
 *        longer costs the day its count, and the ceiling still bounds the day's own count. Round 7 (H.11i): the ticket
 *        read has a budget of its own, and a read past it costs the day only its split
 *   H.10d the prelaunch reset knows the second row's key (classified, deleted, verified)
 *   H.10e ⭐ round 6 — the public source names no parameter of the player-safety logic; R15 — a sentence that names a
 *        detector carries no figure at all, references set aside
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;
export type HarmImpl = {
  snapshot: (now: number, opts?: Any) => Promise<Any>;
  series: () => Promise<Any>;
  candidates: (sinceMs: number) => Promise<string[]>;
  parse: (raw: unknown) => Any;
  source: string;
  lifecycle: string;
  reset: string;
};

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
const HOUR = 3_600_000, DAY = 86_400_000;

export async function loadHarm(): Promise<{ HW: Any; impl: HarmImpl }> {
  const HW: Any = await import("../../src/lib/server/harm-watch.ts");
  const impl: HarmImpl = {
    snapshot: HW.snapshotHarmMarkers, series: HW.harmWatchSeries, candidates: HW.harmCandidates, parse: HW.parseHarmSeries,
    source: read("src/lib/server/harm-watch.ts"), lifecycle: read("src/lib/server/lifecycle.ts"), reset: read("scripts/ops-prelaunch-reset.mts"),
  };
  return { HW, impl };
}

export async function runHarmCases(ok: Ok, impl: HarmImpl, HW: Any): Promise<{ onPostgres: boolean }> {
  const { hasDatabase }: Any = await import("../../src/lib/server/prisma.ts");
  const CS: Any = await import("../../src/lib/server/config-store.ts");
  const { db }: Any = await import("../../src/lib/server/store.ts");
  const RG: Any = await import("../../src/lib/server/responsible-gambling.ts");
  const { eatDayKey }: Any = await import("../../src/lib/eat-day.ts");
  const onPostgres = hasDatabase();
  const KEY = HW.HARM_WATCH_KEY;
  const setRow = async (value: unknown) => {
    if (onPostgres) { await CS.deleteConfig(KEY); if (value !== null) await CS.saveConfigOrThrow(KEY, value); }
    else HW.__setHarmWatchMemoryForTests(value);
  };
  /** The row as stored: the database row on Postgres, the memory twin's value otherwise. */
  const rowNow = async () => (onPostgres
    ? ((r: Any) => (r.ok ? r.value : "UNREAD"))(await CS.loadConfigResult(KEY))
    : (globalThis as Any).__50PICK_HARM_WATCH?.value ?? null);

  /* ── fixtures: real rows through the store, times relative to now (the detector reads its own clock) ── */
  const NOW = Date.now();
  const tag = `${process.pid}_${Math.floor(Math.random() * 1e6)}`;
  let seq = 0;
  const person = async (p: string, role = "PLAYER") => {
    const id = `usr_hw_${p}_${tag}`, at = new Date(NOW - 30 * DAY).toISOString();
    await db.user.create({
      id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: at, updatedAt: at, lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at } as never);
    return id;
  };
  const txn = async (userId: string, type: string, at: number, amount: number, extra: Record<string, unknown> = {}) => {
    const iso = new Date(at).toISOString();
    await db.txn.create({
      id: `txn_hw_${tag}_${++seq}`, walletId: `wal_${userId}`, userId, type, status: "CONFIRMED", amount, fee: 0, taxWithheld: 0,
      balanceAfter: null, currency: "TZS", provider: type === "DEPOSIT" ? "MPESA" : "INTERNAL", providerRef: null, msisdn: null,
      description: type, positionId: null, amlReason: null, createdAt: iso, updatedAt: iso, completedAt: iso, ...extra,
    } as never);
  };
  const rapid = await person("rapid");          // recent confirmed deposits that raise the rapid-deposit marker
  for (const m of [5, 15, 25]) await txn(rapid, "DEPOSIT", NOW - m * 60_000, 2_000);
  const chaser = await person("chaser");        // top-ups soon after betting, on earlier days — none recent
  for (const d of [2, 4, 6.5]) { await txn(chaser, "BET_PLACED", NOW - d * DAY - 20 * 60_000, -1_000); await txn(chaser, "DEPOSIT", NOW - d * DAY, 1_000); }
  const both = await person("both");
  for (const m of [3, 8, 13]) await txn(both, "DEPOSIT", NOW - m * 60_000, 1_500);
  for (const d of [1.5, 3]) { await txn(both, "BET_PLACED", NOW - d * DAY - 10 * 60_000, -500); await txn(both, "DEPOSIT", NOW - d * DAY, 500); }
  await txn(both, "BET_PLACED", NOW - 2 * HOUR, -500); await txn(both, "DEPOSIT", NOW - 2 * HOUR + 10 * 60_000, 500);
  const old = await person("old");              // deposits 10 days ago only — no marker, not even a candidate
  for (const m of [5, 15, 25]) await txn(old, "DEPOSIT", NOW - 10 * DAY - m * 60_000, 2_000);
  const quiet = await person("quiet");          // one deposit an hour ago — a candidate, no marker
  await txn(quiet, "DEPOSIT", NOW - HOUR, 3_000);
  const staff = await person("staff", "COMPLIANCE"); // a staff account is flagged like anyone (no role filter)
  for (const m of [4, 9, 14]) await txn(staff, "DEPOSIT", NOW - m * 60_000, 1_000);
  const marked = await person("marked");        // a deposit row carrying a marker counts like any other (D20a)
  for (const m of [6, 11, 16]) await txn(marked, "DEPOSIT", NOW - m * 60_000, 1_000, { houseBotId: `hbt_${"0".repeat(24)}` });
  // Top-ups after betting on earlier days, outside the narrower plant's window at any EAT hour (the count's "now" is
  // 04:00 EAT, up to 20 hours before the clock).
  const lateChaser = await person("latechaser");
  for (const d of [6.88, 6.92, 6.96]) { await txn(lateChaser, "BET_PLACED", NOW - d * DAY - 20 * 60_000, -1_000); await txn(lateChaser, "DEPOSIT", NOW - d * DAY, 1_000); }
  const mine = new Set([rapid, chaser, both, old, quiet, staff, marked, lateChaser]);

  /* H.1 · before 03:00 EAT */
  await setRow(null);
  const day = eatDayKey(NOW);
  const at0230 = Date.parse(`${day}T02:30:00.000Z`) - 3 * HOUR;
  const at0400 = Date.parse(`${day}T04:00:00.000Z`) - 3 * HOUR;
  const r1 = await impl.snapshot(at0230);
  ok("H.1 · before 03:00 EAT nothing is counted", r1.wrote === "skipped" && r1.why === "before 03:00 EAT" && (await impl.series()).byDay.size === 0, j(r1));

  /* H.2 · the count equals Player Safety's full walk */
  // Restrict both sides to THIS run's accounts (the store may hold other rows): the full walk over every user, filtered to
  // ours, against the snapshot's own detector over its own candidates, filtered the same way.
  const flagsAll = (await RG.detectHarmMarkersForAllUsers()).filter((f: Any) => mine.has(f.userId));
  const walk = {
    rapid: new Set(flagsAll.filter((f: Any) => f.marker === "RAPID_DEPOSIT_ESCALATION").map((f: Any) => f.userId)),
    chasing: new Set(flagsAll.filter((f: Any) => f.marker === "CHASING_LOSSES").map((f: Any) => f.userId)),
  };
  const counted = { rapid: new Set<string>(), chasing: new Set<string>(), scanned: new Set<string>() };
  const r2 = await impl.snapshot(at0400, {
    candidates: async (since: number) => { const ids = await impl.candidates(since); return ids.filter((x) => mine.has(x)); },
    detect: async (id: string) => { counted.scanned.add(id); const f = await RG.detectHarmMarkers(id); for (const x of f) { if (x.marker === "RAPID_DEPOSIT_ESCALATION") counted.rapid.add(id); if (x.marker === "CHASING_LOSSES") counted.chasing.add(id); } return f; },
  });
  ok("H.2 · ⭐ the daily count equals Player Safety's full walk of every user, marker by marker, on the same fixtures",
    r2.wrote === "counted" && r2.rapidDeposit === walk.rapid.size && r2.chasingLosses === walk.chasing.size
      && j([...counted.rapid].sort()) === j([...walk.rapid].sort()) && j([...counted.chasing].sort()) === j([...walk.chasing].sort()),
    j({ r2, walk: { rapid: [...walk.rapid].map((x) => x.split("_")[2]), chasing: [...walk.chasing].map((x) => x.split("_")[2]) } }));
  ok("H.2b · the fixtures exercise every branch: rapid, both, staff and marked are rapid; the chaser, the late chaser and both are chasing; old and quiet carry nothing",
    walk.rapid.has(rapid) && walk.rapid.has(both) && walk.rapid.has(staff) && walk.rapid.has(marked) && !walk.rapid.has(chaser)
      && walk.chasing.has(chaser) && walk.chasing.has(both) && walk.chasing.has(lateChaser) && !walk.chasing.has(rapid) && !walk.rapid.has(old) && !walk.chasing.has(old) && !walk.rapid.has(quiet),
    j({ rapid: [...walk.rapid].length, chasing: [...walk.chasing].length }));
  ok("H.2c · the candidates hold every account a marker can reach, and not the account whose deposits are 10 days old",
    [rapid, chaser, both, quiet, staff, marked, lateChaser].every((x) => counted.scanned.has(x)) && !counted.scanned.has(old) && r2.scanned === 7, j([...counted.scanned].length));

  /* H.3 · idempotent by day */
  const before3 = canon(await rowNow());
  const r3 = await impl.snapshot(at0400 + HOUR);
  ok("H.3 · a second count on the same EAT day writes nothing", r3.wrote === "skipped" && r3.why === "already counted" && canon(await rowNow()) === before3, j(r3));

  /* H.4 · the time ceiling */
  await setRow(null);
  let tick = 0;
  const r4 = await impl.snapshot(at0400, {
    candidates: async () => ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"],
    detect: async () => [{ marker: "RAPID_DEPOSIT_ESCALATION" }],
    ceilingMs: 100, clock: () => (tick += 80),
  });
  const s4 = await impl.series();
  ok("H.4 · an overrun of the time ceiling records the day 'not counted' — never the partial count, never 0",
    r4.wrote === "not-counted" && s4.ok && "notCounted" in s4.byDay.get(day) && !("rapidDeposit" in s4.byDay.get(day)), j({ r4, d: s4.ok && s4.byDay.get(day) }));

  /* H.5 · a failed read */
  await setRow(null);
  const r5 = await impl.snapshot(at0400, { candidates: async () => { throw new Error("planted read failure"); } });
  ok("H.5 · a failed read records the day 'not counted' with its reason", r5.wrote === "not-counted" && /planted read failure/.test(r5.why), j(r5));

  /* H.6 · reading the series */
  await setRow(null);
  const yesterday = eatDayKey(at0400 - DAY);
  await impl.snapshot(at0400 - DAY, { candidates: async () => [], detect: async () => [] });
  await impl.snapshot(at0400, { candidates: async () => ["x"], detect: async () => [{ marker: "CHASING_LOSSES" }] });
  const s6 = await impl.series();
  const dayBefore = eatDayKey(at0400 - 2 * DAY);
  ok("H.6 · the series reads back by day (a zero is a counted zero); a day never counted is absent, never 0",
    s6.ok && s6.byDay.get(yesterday)?.scanned === 0 && s6.byDay.get(yesterday)?.rapidDeposit === 0 && s6.byDay.get(day)?.chasingLosses === 1
      && !s6.byDay.has(dayBefore), j(s6.ok && [...s6.byDay.values()]));

  /* H.7 · malformed */
  const bad = { v: 1, days: [{ day: "2026-13-40", at: "x" }] };
  await setRow(bad);
  const s7 = await impl.series();
  const r7 = await impl.snapshot(at0400 + DAY);
  ok("H.7 · a malformed series reads as unreadable and the count leaves it exactly as it is",
    !s7.ok && s7.why === "malformed" && r7.wrote === "skipped" && r7.why === "series malformed" && canon(await rowNow()) === canon(bad),
    j({ s7, r7 }));

  /* H.8 · two containers */
  await setRow(null);
  const race = await Promise.all([
    impl.snapshot(at0400, { candidates: async () => ["x"], detect: async () => [] }),
    impl.snapshot(at0400, { candidates: async () => ["x"], detect: async () => [] }),
  ]);
  const s8 = await impl.series();
  ok("H.8 · two containers counting one day write it once", race.filter((x: Any) => x.wrote === "counted").length === 1 && s8.ok && s8.byDay.size === 1, j(race));

  /* H.9 · 400 days */
  const many = { v: 1, days: Array.from({ length: 400 }, (_, i) => ({ day: eatDayKey(at0400 - (400 - i) * DAY), at: new Date(at0400 - (400 - i) * DAY).toISOString(), rapidDeposit: 0, chasingLosses: 0, scanned: 0 })) };
  await setRow(many);
  const r9 = await impl.snapshot(at0400, { candidates: async () => [], detect: async () => [] });
  const s9 = await impl.series();
  ok("H.9 · the series keeps at most 400 days: the newest day in, the oldest out",
    r9.wrote === "counted" && s9.ok && s9.byDay.size === 400 && s9.byDay.has(day) && !s9.byDay.has(many.days[0].day), j({ size: s9.ok && s9.byDay.size }));

  /* H.11 · ⭐ MASWALI-BUILD S6 · OD-22 — reported twice once Millionea has opened: every candidate, and those without a
     ticket — the second count in its OWN row (round 2), so the S13 row keeps the shape a build older than S6 reads. */
  const KEY2 = HW.HARM_WATCH_NO_TICKET_KEY;
  const setRow2 = async (value: unknown) => {
    if (onPostgres) { await CS.deleteConfig(KEY2); if (value !== null) await CS.saveConfigOrThrow(KEY2, value); }
    else HW.__setHarmWatchNoTicketMemoryForTests(value);
  };
  const row2Now = async () => (onPostgres
    ? ((r: Any) => (r.ok ? r.value : "UNREAD"))(await CS.loadConfigResult(KEY2))
    : (globalThis as Any).__50PICK_HARM_WATCH_NO_TICKET?.value ?? null);
  /** ⛔ THE CHECK b495ede2's PARSER MAKES (before S6): a day is exactly a count or exactly a "not counted" — nothing else. */
  const OLD_SHAPE = (raw: Any) => !!raw && raw.v === 1 && Array.isArray(raw.days) && raw.days.every((d: Any) => {
    const keys = Object.keys(d).sort().join(",");
    return keys === "at,day,notCounted" || keys === "at,chasingLosses,day,rapidDeposit,scanned";
  });
  await setRow(null); await setRow2(null);
  const ours = async (since: number) => (await impl.candidates(since)).filter((x) => mine.has(x));
  const holdersOf = async (ids: readonly string[]) => new Set(ids.filter((x) => x === rapid || x === chaser));
  const rN = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - DAY, holders: holdersOf });
  const sN = await impl.series();
  const secondN: Any = sN.ok && sN.noTicketByDay ? sN.noTicketByDay.get(day) : null;
  ok("H.11 · ⭐ the count is unchanged for every candidate, and the second count, in its own row, leaves out exactly the two ticket holders (OD-22)",
    rN.wrote === "counted" && rN.rapidDeposit === walk.rapid.size && rN.chasingLosses === walk.chasing.size && rN.scanned === 7
      && j(rN.noTicket) === j({ rapidDeposit: walk.rapid.size - 1, chasingLosses: walk.chasing.size - 1, scanned: 5 })
      && secondN?.rapidDeposit === walk.rapid.size - 1 && secondN?.chasingLosses === walk.chasing.size - 1 && secondN?.scanned === 5,
    j({ rN, second: secondN }));
  await setRow(null); await setRow2(null);
  const rB = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => null, holders: holdersOf });
  ok("H.11b · CONTROL · before any Millionea week opened, nothing is split: no second count in the result, no second row",
    rB.wrote === "counted" && !("noTicket" in rB) && (await row2Now()) === null && rB.rapidDeposit === walk.rapid.size, j(rB));
  await setRow(null); await setRow2(null);
  const rC = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - DAY, holders: async () => { throw new Error("planted holder read failure"); } });
  ok("H.11c · a failed read of who holds a ticket drops only the day's second count — never the day's own count",
    rC.wrote === "counted" && !("noTicket" in rC) && rC.rapidDeposit === walk.rapid.size && rC.chasingLosses === walk.chasing.size && (await row2Now()) === null, j(rC));
  // H.11d · the rollback: the S13 row the new code wrote passes the OLD parser's shape check, day by day.
  await setRow(null); await setRow2(null);
  await impl.snapshot(at0400 - DAY, { candidates: ours, openedAt: async () => at0400 - 2 * DAY, holders: holdersOf });
  await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - 2 * DAY, holders: holdersOf });
  const s13 = await rowNow(), second = await row2Now();
  ok("H.11d · ⭐ a rollback past S6 loses nothing: the S13 row written with the second count on passes the old parser's shape check, and the second count sits in its own row",
    OLD_SHAPE(s13) && (s13 as Any).days.length === 2 && OLD_SHAPE(second) && (second as Any).days.length === 2
      && impl.parse(s13) !== "malformed" && impl.parse(second) !== "malformed", j({ s13, second }));
  ok("H.11e · CONTROL · on a store where no Millionea week has opened, the real reads write no split (H.2's day)",
    r2.wrote === "counted" && !("noTicket" in r2), j(r2));
  /* H.11f/H.11g · ⭐ ROUND 4 (the lead's ruling) — the split starts at the first PUBLIC week's opening, from the REAL
     openings read (no `openedAt` handed in): a private drive week opened first splits nothing — its ticket holders stay
     in the day's one count, and the day is a whole count — and once a public week has opened, the day is split. The weeks
     are planted CLOSED (opened, their sales over), each on its own market; the memory twin's weeks are cleared after. */
  const MD: Any = await import("../../src/lib/server/maswali-dal.ts");
  const { marketStore }: Any = await import("../../src/lib/server/market-dal.ts");
  const plantWeek = async (vis: "PUBLIC" | "DRIVE", opensAt: number, seq: number) => {
    const id = `${vis === "PUBLIC" ? "pub" : "drv"}_${tag}`, nowIso = new Date(NOW).toISOString(), iso = (t: number) => new Date(t).toISOString();
    await marketStore.set({
      id: `mkt_hw_${id}`, titleEn: "Millionea week", titleSw: "Wiki ya Millionea", titleZh: null, category: "sports", sourceUrl: "https://example.com",
      resolutionCriterion: "Case", resolutionCriterionSw: null, resolutionCriterionZh: null, resolutionAt: iso(opensAt + 9 * DAY), selectionClosedAt: null,
      status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null, resolvedOutcome: null, resolutionStage1By: null, resolutionStage1At: null,
      resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null, settledAt: null, reopenedAt: null, reopenCount: null,
      productLine: "MASWALI", proposedBy: staff, createdAt: nowIso, updatedAt: nowIso,
    });
    await MD.weekStore.create({
      id: `cyc_hw_${id}`, marketId: `mkt_hw_${id}`, code: `MLN-HW-${id}`, seq, visibility: vis, state: "CLOSED",
      opensAt: iso(opensAt), closesAt: iso(opensAt + 5 * DAY), finalDeadlineAt: iso(opensAt + 9 * DAY), closedAt: iso(opensAt + 5 * DAY),
      rulesSnapshot: { planted: true }, questionSetHash: "planted", ticketMerkleRoot: null, ticketCount: 0, salesAtClose: null, gradedSetFinalAt: null,
      objectionsCloseAt: null, objectionRestarted: false, rolloverIn: null, jackpot: null, fee: null, traLevy: null, gbtLevy: null, topUp: null,
      winningTickets: null, sharePerTicket: null, paidTotal: null, carryOut: null, dustCarried: null, settlementGroupId: null, settledAt: null,
      releasedBy: null, isFinal: false, parityAttestedBy: null, parityAttestedAt: null, createdBy: staff, createdAt: nowIso, updatedAt: nowIso,
    });
  };
  MD.__resetMaswaliMemoryStores?.();
  try {
    await setRow(null); await setRow2(null);
    await plantWeek("DRIVE", at0400 - 2 * DAY, 700_001);
    const rD = await impl.snapshot(at0400, { candidates: ours, holders: holdersOf });
    ok("H.11f · ⭐ R4 · a private DRIVE week opened first splits nothing: its holders stay in the day's one count and no second count is written (a whole count)",
      rD.wrote === "counted" && !("noTicket" in rD) && (await row2Now()) === null && rD.rapidDeposit === walk.rapid.size && rD.scanned === 7, j(rD));
    await setRow(null); await setRow2(null);
    await plantWeek("PUBLIC", at0400 - DAY, 700_002);
    const rP = await impl.snapshot(at0400, { candidates: ours, holders: holdersOf });
    ok("H.11g · ⭐ R4 · …and once a PUBLIC week has opened, the real openings read splits the day: the two ticket holders are left out of the second count",
      rP.wrote === "counted" && j(rP.noTicket) === j({ rapidDeposit: walk.rapid.size - 1, chasingLosses: walk.chasing.size - 1, scanned: 5 }), j(rP));
  } finally {
    MD.__resetMaswaliMemoryStores?.();
  }
  await setRow2(null);
  /* H.11h/H.11h2 · ⭐ ROUND 6 (MEDIUM-2) — who holds a ticket is read OUTSIDE the ceiling's clock. On the case's own clock:
     the ticket read takes 80 of a 100 ms ceiling, the walk 5 an account. Charged to the ceiling, 80 + 35 ran
     past it and the day read "not counted"; outside it, the day is counted and split as H.11's. The control: beside the
     same slow read, a walk over the ceiling on its own (20 an account, 140) still records the day "not counted". */
  let tick6 = 0;
  const slowHolders = async (ids: readonly string[]) => { tick6 += 80; return holdersOf(ids); };
  const walkAt = (each: number) => async (id: string) => { tick6 += each; return RG.detectHarmMarkers(id); };
  await setRow(null); await setRow2(null);
  const rSlow = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - DAY, holders: slowHolders, ceilingMs: 100, clock: () => tick6, detect: walkAt(5) });
  ok("H.11h · ⭐ R6 · a slow ticket read (80 of a 100 ms ceiling) no longer costs the day its count: counted, and split exactly as H.11's",
    rSlow.wrote === "counted" && rSlow.rapidDeposit === walk.rapid.size && rSlow.chasingLosses === walk.chasing.size
      && j(rSlow.noTicket) === j({ rapidDeposit: walk.rapid.size - 1, chasingLosses: walk.chasing.size - 1, scanned: 5 }), j(rSlow));
  await setRow(null); await setRow2(null);
  tick6 = 0;
  const rOver = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - DAY, holders: slowHolders, ceilingMs: 100, clock: () => tick6, detect: walkAt(20) });
  ok("H.11h2 · CONTROL · the ceiling still bounds the day's own count: beside the same slow read, a walk over the ceiling on its own records the day 'not counted'",
    rOver.wrote === "not-counted" && (await row2Now()) === null, j(rOver));
  // H.11i · ⭐ ROUND 7 — the ticket read has a budget of its own (the ceiling's): a read past it (150 of 100 ms) costs the
  // day only its split — its own count stands and no second count is written.
  await setRow(null); await setRow2(null);
  tick6 = 0;
  const pastBudget = async (ids: readonly string[]) => { tick6 += 150; return holdersOf(ids); };
  const rBudget = await impl.snapshot(at0400, { candidates: ours, openedAt: async () => at0400 - DAY, holders: pastBudget, ceilingMs: 100, clock: () => tick6, detect: walkAt(5) });
  ok("H.11i · ⭐ R7 · a ticket read past its own budget (150 of 100 ms) costs the day only its split: the day's own count stands, and no second count is written",
    rBudget.wrote === "counted" && rBudget.rapidDeposit === walk.rapid.size && rBudget.chasingLosses === walk.chasing.size && !("noTicket" in rBudget)
      && (await row2Now()) === null, j(rBudget));
  // H.11i2 · ⭐ ROUND 8 — the budget on the REAL clock: a ticket read that answers only after 1.5 s, against a 50 ms
  // budget, is left behind — the snapshot hands the tick back in under a second, the day counted, no split, no second row.
  await setRow(null); await setRow2(null);
  const lateRead = (ids: readonly string[]) => new Promise<Set<string>>((resolve) => { setTimeout(() => resolve(new Set(ids.filter((x) => x === rapid || x === chaser))), 1_500); });
  const startedAt = Date.now();
  const rLate = await impl.snapshot(at0400, { candidates: async () => [rapid, chaser, quiet], openedAt: async () => at0400 - DAY, holders: lateRead, ceilingMs: 50, detect: async () => [] });
  const tookMs = Date.now() - startedAt;
  ok("H.11i2 · ⭐ R8 · on the real clock, a ticket read still unanswered when its budget runs out is left behind: the snapshot returns in under a second, the day counted, no split and no second row",
    tookMs < 1_000 && rLate.wrote === "counted" && rLate.scanned === 3 && !("noTicket" in rLate) && (await row2Now()) === null, j({ tookMs, rLate }));
  await setRow(null); await setRow2(null);

  /* H.10 · the detector and the wiring (source) */
  const src = impl.source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // ⭐ Rounds 8 and 11 — no duration or amount of its own, by a generic rule: only the module's own constants, BY NAME,
  // are set aside; any other constant carrying a figure fails, and so does any long or exponent literal, a figure times a
  // unit constant in either order, or a product of literals, left in its code (CONTROLS: made-up forms are found).
  const OWN = ["HARM_WATCH_VERSION", "HARM_WATCH_MAX_DAYS", "HARM_WATCH_CANDIDATE_DAYS", "HARM_WATCH_FROM_EAT_HOUR", "HARM_WATCH_CEILING_MS",
    "BATCH", "DAY_MS", "SECOND_MS", "DAY_RE", "ISO_RE"];
  const CONST_LINE = /^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=(.*)$/;
  const lines = src.split(/\r?\n/);
  const strayConsts = lines.map((l) => CONST_LINE.exec(l)).filter((m): m is RegExpExecArray => !!m && !OWN.includes(m[1]) && /\d/.test(m[2])).map((m) => m[1]);
  const code = lines.filter((l) => { const m = CONST_LINE.exec(l); return !(m && OWN.includes(m[1])); }).join("\n");
  const UNIT_CONST = String.raw`[A-Z_]*(?:MS|DAYS?|HOURS?|MINS?|MINUTES?)`;
  const FIGURE = String.raw`\d+(?:\.\d+)?`;
  const LITERAL = new RegExp(String.raw`\b\d[\d_]{3,}\b|\b${FIGURE}[eE]\d+\b|\b${FIGURE}\s*\*\s*${UNIT_CONST}\b|\b${UNIT_CONST}\s*\*\s*${FIGURE}\b|\b${FIGURE}\s*\*\s*${FIGURE}\b`);
  const strayOf = (s: string) => s.split(/\r?\n/).map((l) => CONST_LINE.exec(l)).filter((m): m is RegExpExecArray => !!m && !OWN.includes(m[1]) && /\d/.test(m[2])).length;
  ok("H.10 · the count runs Player Safety's own detector, imported — no duration or amount of its own (CONTROLS: a made-up literal, a product led by a unit constant and a new constant carrying a figure are found)",
    /import \{ DEPOSIT_ESCALATION_LOOKBACK_MS, RECENT_ACTIVITY_MS, detectHarmMarkers \} from "\.\/responsible-gambling";/.test(src) && /detectHarmMarkers\(id\)/.test(src)
      && strayConsts.length === 0 && !LITERAL.test(code) && !/\brole\b|houseBot/i.test(src)
      && LITERAL.test("const sinceThen = Date.now() - 4_321;") && LITERAL.test(["const span = ", "DAY_MS", " * ", String(13), ";"].join(""))
      && strayOf(["const ", "SPAN_", "LIMIT", " = ", String(17), ";"].join("")) === 1,
    String(code.match(LITERAL)?.[0] ?? strayConsts.join(", ")));
  // ⭐ The candidate window is the detectors' own: derived from the windows they export, never typed —
  // by value (the module's constant equals the larger window, rounded up) and in source (its derivation line).
  {
    const rg = await import("../../src/lib/server/responsible-gambling.ts");
    const DERIVED = /export const HARM_WATCH_CANDIDATE_DAYS = Math\.ceil\(Math\.max\(RECENT_ACTIVITY_MS, DEPOSIT_ESCALATION_LOOKBACK_MS\) \/ DAY_MS\);/;
    const derived = (s: string) => DERIVED.test(s);
    ok("H.10f · ⭐ the candidates' window is derived from the detectors' own exported windows, never typed",
      derived(impl.source) && HW.HARM_WATCH_CANDIDATE_DAYS === Math.ceil(Math.max(rg.RECENT_ACTIVITY_MS, rg.DEPOSIT_ESCALATION_LOOKBACK_MS) / DAY),
      String(HW.HARM_WATCH_CANDIDATE_DAYS));
    const typed = impl.source.replace(DERIVED, ["export const HARM_WATCH_CANDIDATE_DAYS = ", String(9), ";"].join(""));
    ok("H.10f · control · a typed window in its place is caught", typed !== impl.source && !derived(typed));
  }
  const life = impl.lifecycle;
  ok("H.10b · the lifecycle counts once a day on its own catch, before the holder sweep",
    life.lastIndexOf("await maybeCountHarmWatch()") > 0 && life.lastIndexOf("await maybeRunHolderSweep()") > life.lastIndexOf("await maybeCountHarmWatch()")
      && /await maybeCountHarmWatch\(\)\.catch\(/.test(life));
  ok("H.10c · the prelaunch reset classifies the key as dropped AND deletes it AND verifies it",
    /\/\^journey\\\.harm\\\.daily\$\//.test(impl.reset) && /OR key='journey\.harm\.daily'/.test(impl.reset) && /'journey\.harm\.daily'\)/.test(impl.reset));
  ok("H.10d · ⭐ S6 · …and the second row's key the same three ways (an unclassified key would stop the reset)",
    /\/\^journey\\\.harm\\\.noTicket\\\.daily\$\//.test(impl.reset) && /OR key='journey\.harm\.noTicket\.daily'/.test(impl.reset)
      && /key='journey\.harm\.noTicket\.daily' AND "updatedAt"/.test(impl.reset));
  // ⭐ Rounds 6 to 15 (LOW 8) — the repository is public: the harm watch, these cases, their test, the S13 plan, the
  // rg-doors suite, the compliance record and the R14 files say what the player-safety logic enforces, never its
  // parameters. Each file's prose is read sentence by sentence: comments (wrapped lines joined, an entry opening a
  // sentence) AND the string and template literals of the code files; the docs' paragraphs joined. A sentence that names
  // a detector carries no unit of time and no figure at all (R15); beside such a sentence, no sentence carries a figure or
  // an article with a unit; and slack is never named beside a span or a constant. The bare word "detector" counts in the
  // harm watch's own files; elsewhere, the markers' own names and "harm detector"/"harm marker". The CONTROLS are made-up
  // sentences; the test plants each form, and leaves each reference form alone.
  const MARKER_NAMES = ["RAPID", "CHASING", "LATE", "LIMIT", "SESSION"].map((w, i) => [w, ["DEPOSIT_ESCALATION", "LOSSES", "NIGHT_PLAY", "BREACH_HISTORY", "OVERRUN"][i]].join("_"));
  const NAMED = String.raw`(?:${MARKER_NAMES.join("|")})|\bharm[- ](?:markers?|detectors?)\b`;
  const DET_HARM = new RegExp(String.raw`${NAMED}|\blooks? back\b|look-?back|\brapid[- ]deposits?\b|\bchas(?:er|ers|ing)\b|\bdetectors?\b`, "i");
  const DET_OTHER = new RegExp(NAMED, "i");
  const UNITS = String.raw`(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|fortnights?|months?|hourly|daily|weekly|nightly)`;
  const UNIT = new RegExp(String.raw`\b${UNITS}\b|\b\d+\s*(?:h|d|m|s|ms)\b`, "i");
  const NUMBER = String.raw`(?:\d+(?:[.,]\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty(?:-\w+)?|thirty|forty|fifty|sixty)`;
  const FIGURE_UNIT = new RegExp(String.raw`\b(?:${NUMBER}|an?)\s*[- ]?\s*${UNITS}\b|\b\d+\s*(?:h|d|m|s|ms)\b`, "i");
  const COUNTED = new RegExp(String.raw`(?<![A-Za-z]\.)\b${NUMBER}\s+(?:confirmed\s+)?(?:deposits?|top-?ups?|bets?|times)\b`, "i");
  const SLACK = /\b(?:margin|room to spare|to spare|buffer|longer than)\b/i, SPAN = /\bwindow\b|\bcandidates?\b|_DAYS\b|_MS\b|\bspan\b/i;
  const OPENS = /^\s*(?:[A-Z][A-Za-z]?\d*\.\d|[-·⭐⛔⚠]|\d+\.\s)/;
  const ABBREV = /\b(?:e\.g|i\.e|approx|vs|etc|cf|incl)\./gi;
  // ⭐ R15 (the lead's ruling) — ANY FIGURE in a sentence that names a detector fails it. A figure is a digit run, a number
  // word (a cardinal, an ordinal, a fraction, once or twice), a multiplier word or a currency amount. A REFERENCE is no
  // figure and is set aside exactly, before the figure is looked for: a date (a time may follow it); a file, with its line
  // reference (the file in backticks or not, more lines after a comma), and the L and #L forms; a plan or section id with
  // its hyphen or §, or a capital-led id; a case id; and the id a case's label opens with. Nothing else is set aside: a
  // year alone, a currency code or an X joined to a figure, and a decimal that opens a label before a counted noun, a
  // currency, a percent or a unit all stay figures.
  const NOT_AMOUNT = String.raw`(?!(?:TZS|TSH|USD|KES|EUR|GBP|X)(?:[-.]|\d))`;
  const REFERENCES: RegExp[] = [
    /(?<!\d)\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?(?: ?(?:UTC|EAT))?)?(?!\d)/g,
    /\x60?(?:[\w.@-]+\/)*[\w.@-]+\.(?:ts|tsx|mts|mjs|cjs|js|jsx|md|json|prisma|sql|css|ya?ml|sh|ps1)\x60?(?::\d+(?:[-–]\d+)?(?:, ?:\d+(?:[-–]\d+)?)*)?(?!\w)/g,
    /#L\d+(?:-L\d+)?(?!\w)/g,
    /\bL\d+(?:[-–]L\d+)?\b/g,
    /§\d+[a-z]?(?:\.\d+[a-z]?)*/g,
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,5}-\d+[a-z]?\b`, "g"),
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,4}\.\d+[a-z\d]*(?:\.\d+[a-z\d]*)*\b`, "g"),
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,4}\d+(?:\.\d+)*[a-z\d]*\b`, "g"),
  ];
  const NUMBER_WORDS = String.raw`zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|dozens?|couple|pair|single|once|twice|thrice|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|twentieth|hundredth|thousandth|half|halves|halved?|quarters?`;
  const MULTIPLIER_WORDS = String.raw`double[ds]?|doubling|triple[ds]?|tripling|treble[ds]?|quadruple[ds]?|(?:two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)-?fold`;
  const ANY_FIGURE = new RegExp(String.raw`\d|×|\b(?:${NUMBER_WORDS}|${MULTIPLIER_WORDS})\b`, "i");
  const figureIn = (x: string) => ANY_FIGURE.test(REFERENCES.reduce((s, re) => s.replace(re, " "), x));
  /** The id a case's label opens with, set aside at a literal's start only — never when a counted noun, a currency, a
   *  percent or a unit follows it (then it is a figure dressed as an id). */
  const LABEL_ID = new RegExp(String.raw`^\d+(?:\.\d+)+[a-z]?(?= (?!(?:confirmed )?(?:deposits?|top-?ups?|bets?|times|transactions?)\b|(?:TZS|TSh|USD|shillings?|per ?cent|percent)\b|%|${UNITS}\b))`, "i");
  const joined = (lines: readonly string[]) => lines.map((l) => (OPENS.test(l) ? ". " : " ") + l.trim()).join("");
  const literalsOf = (code: string): string[] => [...code.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)]
    .map((m) => m[0].slice(1, -1).replace(/\$\{[^}]*\}/g, " ").replace(LABEL_ID, " ")).filter((x) => /[A-Za-z]{3}/.test(x));
  const proseOfCode = (s: string): string[] => {
    const out: string[] = [];
    for (const m of s.matchAll(/\/\*[\s\S]*?\*\//g)) out.push(joined(m[0].slice(2, -2).split("\n").map((l) => l.replace(/^\s*\*\s?/, ""))));
    let run: string[] = [];
    const codeLines: string[] = [];
    for (const line of s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")) {
      const i = line.indexOf("//");
      if (i >= 0 && !/https?:$/.test(line.slice(0, i))) { codeLines.push(line.slice(0, i)); run.push(line.slice(i + 2)); continue; }
      codeLines.push(line);
      if (run.length) { out.push(joined(run)); run = []; }
    }
    if (run.length) out.push(joined(run));
    return [...out, ...literalsOf(codeLines.join("\n"))];
  };
  const proseOfDoc = (s: string): string[] => s.replace(/\n(?=\s*(?:[-*|]|\d+\.)\s)/g, ".\n").split(/\n\s*\n/).map((p) => p.replace(/\n/g, " "));
  const leaks = (blocks: readonly string[], det: RegExp): string[] => blocks.flatMap((b) => {
    const ss = b.replace(ABBREV, (m) => m.slice(0, -1)).split(/(?<=[.;!?])\s+/).filter((x) => x.trim().length > 0);
    return ss.filter((x, i) => {
      const prev = i > 0 ? ss[i - 1] : "";
      return (det.test(x) && (UNIT.test(x) || COUNTED.test(x) || figureIn(x))) || (det.test(x) && FIGURE_UNIT.test(prev))
        || (det.test(prev) && FIGURE_UNIT.test(x)) || (SLACK.test(x) && SPAN.test(x));
    });
  });
  const scanned: Array<[string, string[], RegExp]> = [
    ["harm-watch.ts", proseOfCode(impl.source), DET_HARM],
    ["harm-watch-cases.mts", proseOfCode(read("scripts/lib/harm-watch-cases.mts")), DET_HARM],
    ["harm-watch.test.mts", proseOfCode(read("scripts/harm-watch.test.mts")), DET_HARM],
    ["S13-PLAN.md", proseOfDoc(read("docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md")), DET_HARM],
    ["rg-doors.test.mts", proseOfCode(read("scripts/rg-doors.test.mts")), DET_OTHER],
    ["COMPLIANCE-DECISIONS.md", proseOfDoc(read("docs/COMPLIANCE-DECISIONS.md")), DET_OTHER],
    // ⭐ R14 — the other files that discuss the detectors, each named (the scan is not repo-wide).
    ["marketing/rg.ts", proseOfCode(read("src/lib/server/marketing/rg.ts")), DET_OTHER],
    ["campaign-audience.test.mts", proseOfCode(read("scripts/campaign-audience.test.mts")), DET_OTHER],
    ["SUPPORT-CARE-CAMPAIGN.md", proseOfDoc(read("docs/SUPPORT-CARE-CAMPAIGN.md")), DET_OTHER],
  ];
  const found = scanned.flatMap(([f, blocks, det]) => leaks(blocks, det).map((x) => `${f}: ${x.slice(0, 120)}`));
  const C = ["/", "/ "].join(""), M = MARKER_NAMES[1];
  const madeUp = proseOfCode([C, M, " needs ", String(11), " top-ups"].join(""));
  // ⭐ R15 — a bare figure beside a marker's name is found (only the R15 rule sees it), and each reference form beside such
  // a name is not: a date and a time, a file and its lines, the L and #L forms, plan ids, a § id, a case id, and the id a
  // case's label opens with.
  const bare = proseOfCode([C, M, " flags an account past ", String(19)].join(""));
  const refs = proseOfCode([C, M, " was reworded on ", ["2026", "10", "19"].join("-"), " ", ["22", "44"].join(":"), " UTC, lives at ",
    ["responsible-gambling", "ts"].join("."), ":", "12", " and ", "\x60", ["harm-watch", "ts"].join("."), "\x60", ":", "34", ", :", "56",
    " (", "L", "78", ", ", "#L", "12", "-L", "40", "), is ruled in ", ["MB", "23"].join("-"), ", ", "§", "5b", ", ", "S", "6",
    " and ", ["H", "10e"].join(".")].join(""));
  const label = proseOfCode(["const label = ", "\x22", ["7", "2"].join("."), " the ", M, " detail is checked", "\x22", ";"].join(""));
  const controls = { madeUp: leaks(madeUp, DET_HARM).length, bare: leaks(bare, DET_HARM).length, refs: leaks(refs, DET_HARM), label: leaks(label, DET_HARM) };
  ok("H.10e · ⭐ R6–R15 · the harm watch, its cases, its test, its plan, the rg-doors suite, the compliance record and the R14 files say what the player-safety logic enforces, never its parameters — no figure in a sentence that names a detector, references set aside (prose and literals, sentence by sentence; CONTROLS: a made-up sentence and a bare figure are found, every reference form is not)",
    found.length === 0 && controls.madeUp === 1 && controls.bare === 1 && controls.refs.length === 0 && controls.label.length === 0,
    found.length ? found.slice(0, 3).join(" | ") : j(controls));
  await setRow(null);
  return { onPostgres };
}
