/**
 * THE CASES BEHIND `test:harm-watch` — the S13 harm watch's daily count (`src/lib/server/harm-watch.ts`, S13-PLAN WP3).
 *
 * Shared by the two-store child (`harm-watch-child.mts`) and the in-process red twin (`harm-watch.test.mts --prove-red`,
 * memory only), which runs these very cases with one defect planted at a time.
 *
 *   H.1  before 03:00 EAT nothing is counted
 *   H.2  ⭐ the daily count equals Player Safety's own full walk (`detectHarmMarkersForAllUsers`) on the same fixtures:
 *        rapid deposits, top-ups after betting 2–6½ days ago, both, neither, old deposits, a staff account and a marked
 *        deposit — no role, account or marker filter (D20a)
 *   H.3  a second count on the same EAT day writes nothing (idempotent by day)
 *   H.4  an overrun of the time ceiling records the day "not counted" — never a partial number, never 0
 *   H.5  a failed read records the day "not counted", with the reason
 *   H.6  the series reads back by day; a day never counted is absent (the panel says "not counted"), never 0
 *   H.7  a malformed series reads as unreadable and is never overwritten
 *   H.8  two containers counting one day write it once
 *   H.9  the series keeps at most 400 days
 *   H.10 the detector is Player Safety's own (imported, not re-implemented); the lifecycle and the reset wiring (source)
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
  const rapid = await person("rapid");          // 3 confirmed deposits in the last hour
  for (const m of [5, 15, 25]) await txn(rapid, "DEPOSIT", NOW - m * 60_000, 2_000);
  const chaser = await person("chaser");        // 3 top-ups within 30 min of betting, 2–6½ days ago — nothing in the last 24 h
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
  // Three top-ups after betting, all between 6.88 and 6.96 days old: still inside the detector's 7 days, and outside a
  // 6-day candidate window at any time of the EAT day (the count's "now" is 04:00 EAT, up to 20 hours before the clock).
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
  ok("H.2b · the fixtures exercise every branch: rapid, both, staff and marked are rapid; the two chasers and both are chasing; old and quiet carry nothing",
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

  /* H.10 · the detector and the wiring (source) */
  const src = impl.source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("H.10 · the count runs Player Safety's own detector, imported — no window or threshold of its own",
    /import \{ detectHarmMarkers \} from "\.\/responsible-gambling";/.test(src) && /detectHarmMarkers\(id\)/.test(src)
      && !/3600_000|30 \* 60_000|50_000/.test(src) && !/\brole\b|houseBot/i.test(src));
  const life = impl.lifecycle;
  ok("H.10b · the lifecycle counts once a day on its own catch, before the holder sweep",
    life.lastIndexOf("await maybeCountHarmWatch()") > 0 && life.lastIndexOf("await maybeRunHolderSweep()") > life.lastIndexOf("await maybeCountHarmWatch()")
      && /await maybeCountHarmWatch\(\)\.catch\(/.test(life));
  ok("H.10c · the prelaunch reset classifies the key as dropped AND deletes it AND verifies it",
    /\/\^journey\\\.harm\\\.daily\$\//.test(impl.reset) && /OR key='journey\.harm\.daily'/.test(impl.reset) && /'journey\.harm\.daily'\)/.test(impl.reset));
  await setRow(null);
  return { onPostgres };
}
