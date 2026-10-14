/**
 * THE CASES BEHIND `test:journey-launch` — the S13 launch record (`src/lib/server/journey-launch.ts`, S13-PLAN WP2).
 *
 * Shared by the two-store child (`journey-launch-child.mts`: memory, then a fresh scratch Postgres) and the in-process red
 * twin (`journey-launch.test.mts --prove-red`, memory only), which runs these very cases with one defect planted at a time.
 *
 *   L.1  the first observation creates the record (observed since now) and writes one SYSTEM audit row
 *   L.2  the same state again writes nothing
 *   L.3  a move to ACTIVE is appended; the record's launch is that instant
 *   L.4  a rollback and its return are two more transitions; the first ACTIVE stays the launch
 *   L.5  two containers racing write ONE transition (and one record on a fresh store)
 *   L.6  an observation from an older build (a process that started before the last one) is ignored; so is a clock behind
 *   L.7  a malformed row reads as unreadable and is never overwritten
 *   L.8  a failed state read writes nothing
 *   L.9  every move has its audit row, with its from, to and source
 *   L.10 what is observed: the ceiling and the stored switch (ABSENT → the ceiling; WITHDRAWN ceiling → no store read;
 *        a failed switch read → null, never WITHDRAWN)
 *   L.11 the record stays bounded: the first observation and the first ACTIVE are kept, the dropped middle is a gap
 *   L.12 parsing is strict (order, a repeated state, an extra key, a gap that runs backwards)
 *   L.13 the lifecycle wiring and the prelaunch reset's classification (source)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;

export type LaunchImpl = {
  observe: (now: number, opts?: { read?: () => Promise<Any>; processStartedAt?: number }) => Promise<Any>;
  record: () => Promise<Any>;
  parse: (raw: unknown) => Any;
  bound: (rec: Any, max?: number) => Any;
  facts: (rec: Any) => Any;
  readNow: () => Promise<Any>;
  lifecycle: string;
  reset: string;
};

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);
/** JSON with sorted keys — a jsonb column hands keys back in its own order, so equality must not depend on order. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
/** An instant written in East Africa Time (UTC+3). */
const eat = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 3, mi);

export async function loadLaunch(): Promise<{ JL: Any; impl: LaunchImpl }> {
  const JL: Any = await import("../../src/lib/server/journey-launch.ts");
  const impl: LaunchImpl = {
    observe: JL.observeJourneyRollout, record: JL.journeyLaunchRecord, parse: JL.parseLaunchRecord, bound: JL.boundTransitions,
    facts: JL.launchFactsOf, readNow: JL.readRolloutNow,
    lifecycle: read("src/lib/server/lifecycle.ts"), reset: read("scripts/ops-prelaunch-reset.mts"),
  };
  return { JL, impl };
}

export async function runLaunchCases(ok: Ok, impl: LaunchImpl, JL: Any): Promise<{ onPostgres: boolean }> {
  const { hasDatabase }: Any = await import("../../src/lib/server/prisma.ts");
  const CS: Any = await import("../../src/lib/server/config-store.ts");
  const AUD: Any = await import("../../src/lib/server/audit.ts");
  const SW: Any = await import("../../src/lib/server/simple-journey-switch.ts");
  const { dayStanding }: Any = await import("../../src/lib/journey/measures.ts");
  const onPostgres = hasDatabase();
  const KEY = JL.JOURNEY_LAUNCH_KEY;

  /** Put the store row in a known state: null = no row. */
  const setRow = async (value: unknown) => {
    if (onPostgres) { await CS.deleteConfig(KEY); if (value !== null) await CS.saveConfigOrThrow(KEY, value); }
    else JL.__setJourneyLaunchMemoryForTests(value);
  };
  /** The row as stored: the database row on Postgres, the memory twin's value otherwise. */
  const rowNow = async () => (onPostgres
    ? ((r: Any) => (r.ok ? r.value : "UNREAD"))(await CS.loadConfigResult(KEY))
    : (globalThis as Any).__50PICK_JOURNEY_LAUNCH?.value ?? null);
  const audits = async () => (await AUD.getAuditByActionsDurable(["journey.rollout.observed"], { limit: 500 })).entries;
  const see = (state: string, source = `test ${state}`) => async () => ({ state, source });
  const P1 = eat(2026, 10, 15, 9), P2 = eat(2026, 10, 20, 9); // two processes' start times

  /* L.1 · the first observation */
  await setRow(null);
  const a0 = (await audits()).length;
  const t1 = eat(2026, 10, 16, 10);
  const r1 = await impl.observe(t1, { read: see("STAFF_PREVIEW"), processStartedAt: P1 });
  const rec1 = await impl.record();
  ok("L.1 · the first observation creates the record: observed since now, one transition, no launch yet",
    r1.wrote === "created" && rec1.ok && rec1.facts && rec1.facts.observedSince === t1 && rec1.facts.transitions.length === 1
      && rec1.facts.firstActiveAt === null && rec1.facts.startedActive === false, j({ r1, rec1 }));
  ok(`L.1row · the row is in ${onPostgres ? "SystemConfig on Postgres" : "the memory twin"}, exactly the record read back`,
    canon(await rowNow()) === canon(rec1.record), j(await rowNow()));

  /* L.2 · unchanged */
  const before2 = j((await impl.record()).record);
  const r2 = await impl.observe(t1 + 60_000, { read: see("STAFF_PREVIEW"), processStartedAt: P1 });
  ok("L.2 · the same state again writes nothing", r2.wrote === "unchanged" && j((await impl.record()).record) === before2, j(r2));

  /* L.3 · a move to ACTIVE */
  const tL = eat(2026, 11, 2, 15);
  const r3 = await impl.observe(tL, { read: see("ACTIVE", "ceiling CODE ACTIVE · stored ABSENT"), processStartedAt: P2 });
  const rec3 = await impl.record();
  ok("L.3 · a move to ACTIVE is appended, and the record's launch is that instant",
    r3.wrote === "appended" && r3.from === "STAFF_PREVIEW" && r3.to === "ACTIVE" && rec3.facts.firstActiveAt === tL && rec3.facts.transitions.length === 2, j({ r3, f: rec3.facts }));

  /* L.4 · a rollback and its return */
  const tRb = eat(2026, 11, 5, 9), tBack = eat(2026, 11, 5, 15);
  const r4a = await impl.observe(tRb, { read: see("WITHDRAWN", "ceiling CODE ACTIVE · stored SET WITHDRAWN"), processStartedAt: P2 });
  const r4b = await impl.observe(tBack, { read: see("ACTIVE"), processStartedAt: P2 });
  const rec4 = await impl.record();
  ok("L.4 · a rollback and its return are two transitions; the first ACTIVE stays the launch; the rollback day is not a full ACTIVE day",
    r4a.wrote === "appended" && r4b.wrote === "appended" && rec4.facts.transitions.length === 4 && rec4.facts.firstActiveAt === tL
      && dayStanding(rec4.facts, "2026-11-05") === "not-active" && dayStanding(rec4.facts, "2026-11-06") === "active" && dayStanding(rec4.facts, "2026-11-04") === "active",
    j(rec4.facts.transitions));

  /* L.5 · two containers racing */
  const tR = eat(2026, 11, 7, 12);
  const race = await Promise.all([
    impl.observe(tR, { read: see("WITHDRAWN"), processStartedAt: P2 }),
    impl.observe(tR + 1, { read: see("WITHDRAWN"), processStartedAt: P2 }),
  ]);
  const rec5 = await impl.record();
  const appended = race.filter((x: Any) => x.wrote === "appended").length;
  ok("L.5 · two containers observing one move write ONE transition (the loser writes nothing)",
    appended === 1 && race.some((x: Any) => x.wrote === "skipped" && x.why === "lost the race") && rec5.facts.transitions.length === 5, j(race));
  await setRow(null);
  const raceCreate = await Promise.all([
    impl.observe(t1, { read: see("STAFF_PREVIEW"), processStartedAt: P1 }),
    impl.observe(t1, { read: see("STAFF_PREVIEW"), processStartedAt: P1 }),
  ]);
  ok("L.5b · on a fresh store two containers create ONE record",
    raceCreate.filter((x: Any) => x.wrote === "created").length === 1 && (await impl.record()).facts.transitions.length === 1, j(raceCreate));

  /* L.6 · an older build */
  await impl.observe(tL, { read: see("ACTIVE"), processStartedAt: P2 }); // the new build flips it
  const before6 = j((await impl.record()).record);
  const r6 = await impl.observe(tL + 30_000, { read: see("STAFF_PREVIEW", "old build"), processStartedAt: P1 });
  ok("L.6 · an observation from a process that started before the last recorded one is ignored — the old build cannot write the flip back",
    r6.wrote === "skipped" && r6.why === "older build" && j((await impl.record()).record) === before6, j(r6));
  const r6b = await impl.observe(tL - 3_600_000, { read: see("WITHDRAWN"), processStartedAt: P2 });
  ok("L.6b · an observation stamped before the last transition (a clock behind) is not written either",
    r6b.wrote === "skipped" && r6b.why === "clock behind" && j((await impl.record()).record) === before6, j(r6b));

  /* L.7 · malformed */
  const bad = { v: 1, observedSince: "yesterday", transitions: [], gap: null };
  await setRow(bad);
  const rec7 = await impl.record();
  const r7 = await impl.observe(tL + 120_000, { read: see("ACTIVE"), processStartedAt: P2 });
  const after7 = await rowNow();
  ok("L.7 · a malformed row reads as 'malformed' (never a guessed launch) and the observer leaves it exactly as it is",
    rec7.ok === false && rec7.why === "malformed" && r7.wrote === "skipped" && r7.why === "record malformed"
      && canon(after7) === canon(bad), j({ rec7, r7, after7 }));

  /* L.8 · a failed state read */
  await setRow(null);
  const r8 = await impl.observe(t1, { read: async () => null, processStartedAt: P1 });
  const r8b = await impl.observe(t1, { read: async () => { throw new Error("boom"); }, processStartedAt: P1 });
  ok("L.8 · a failed state read writes nothing (no record is created from a failure)",
    r8.wrote === "skipped" && r8.why === "state unreadable" && r8b.wrote === "skipped" && (await impl.record()).facts === null, j({ r8, r8b }));

  /* L.9 · the audit rows */
  const rows9 = (await audits()).slice(0, (await audits()).length - a0);
  const moves = rows9.map((e: Any) => `${e.payload?.from ?? "∅"}→${e.payload?.to}`).reverse();
  ok("L.9 · every write has one SYSTEM audit row naming from, to and the source (creation, the flip, the rollback, its return, the race's one, the re-creations)",
    rows9.length >= 7 && rows9.every((e: Any) => e.category === "SYSTEM" && e.targetId === KEY && typeof e.payload?.source === "string")
      && moves[0] === "∅→STAFF_PREVIEW" && moves.includes("STAFF_PREVIEW→ACTIVE") && moves.includes("ACTIVE→WITHDRAWN") && moves.includes("WITHDRAWN→ACTIVE"),
    j(moves));

  /* L.10 · what is observed */
  const envBefore = process.env.FEATURE_SIMPLEJOURNEY;
  const clearSnap = () => { globalThis.__50PICK_JOURNEY_SWITCH = undefined as Any; globalThis.__50PICK_JOURNEY_SWITCH_READ = undefined as Any; };
  try {
    process.env.FEATURE_SIMPLEJOURNEY = "ACTIVE"; clearSnap();
    const n1 = await impl.readNow();
    process.env.FEATURE_SIMPLEJOURNEY = "WITHDRAWN"; clearSnap();
    let storeReads = 0;
    SW.__setJourneySwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => { storeReads++; return { ok: true, value: null }; } });
    const n2 = await impl.readNow();
    process.env.FEATURE_SIMPLEJOURNEY = "ACTIVE"; clearSnap();
    SW.__setJourneySwitchStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => ({ ok: false, error: "planted" }) });
    const n3 = await impl.readNow();
    ok("L.10 · an ACTIVE ceiling with no stored cap is observed ACTIVE, with its source",
      n1?.state === "ACTIVE" && /ceiling ENV ACTIVE/.test(n1?.source ?? "") && /stored ABSENT/.test(n1?.source ?? ""), j(n1));
    ok("L.10b · a WITHDRAWN ceiling is a real WITHDRAWN, read without asking the store", n2?.state === "WITHDRAWN" && storeReads === 0, j({ n2, storeReads }));
    ok("L.10c · ⛔ a failed switch read is NOT an observation (the switch would answer WITHDRAWN; recording it would invent a rollback)", n3 === null, j(n3));
  } finally {
    SW.__setJourneySwitchStoreForTests(null);
    if (envBefore === undefined) delete process.env.FEATURE_SIMPLEJOURNEY; else process.env.FEATURE_SIMPLEJOURNEY = envBefore;
    clearSnap();
  }

  /* L.11 · bounded */
  const iso = (ms: number) => new Date(ms).toISOString();
  const big = { v: 1, observedSince: iso(t1), gap: null, transitions: [] as Any[] };
  // 205 changes: STAFF_PREVIEW / WITHDRAWN alternating, with the one move to ACTIVE at the fourth.
  for (let i = 0; i < 205; i++) {
    const state = i === 3 ? "ACTIVE" : i % 2 === 0 ? "STAFF_PREVIEW" : "WITHDRAWN";
    big.transitions.push({ at: iso(t1 + i * 3_600_000), state, source: "t", processStartedAt: iso(P1) });
  }
  const bounded = impl.bound(big, 50);
  const fBig = impl.facts(bounded);
  ok("L.11 · the record stays bounded: the first observation and the first ACTIVE are kept, the newest fill the rest, and the dropped middle becomes a gap",
    bounded.transitions.length === 50 && bounded.transitions[0].at === big.transitions[0].at
      && bounded.transitions.some((x: Any) => x.state === "ACTIVE" && x.at === big.transitions.find((y: Any) => y.state === "ACTIVE").at)
      && bounded.transitions[49].at === big.transitions[big.transitions.length - 1].at && bounded.gap !== null && impl.parse(bounded) !== "malformed"
      // the gap starts at the first move dropped AFTER the first ACTIVE (index 4), never before it; inside it a day is
      // unknown, and a day the kept moves describe is known again (here: not on all day)
      && fBig.gap && fBig.gap.from === Date.parse(big.transitions[4].at) && dayStanding(fBig, "2026-10-20") === "unknown"
      && dayStanding(fBig, "2026-10-23") === "not-active",
    j({ n: bounded.transitions.length, gap: bounded.gap, firstActive: fBig.firstActiveAt }));

  /* L.12 · strict parsing */
  const goodRec = (await (async () => { await setRow(null); await impl.observe(t1, { read: see("STAFF_PREVIEW"), processStartedAt: P1 }); return (await impl.record()).record; })());
  const mut = (f: (r: Any) => void) => { const c = JSON.parse(JSON.stringify(goodRec)); f(c); return impl.parse(c); };
  ok("L.12 · parsing is strict: out of order, a repeated state, an extra key, a gap that runs backwards and an unknown state are each malformed",
    impl.parse(goodRec) !== "malformed"
      && mut((r) => { r.transitions.push({ ...r.transitions[0], at: new Date(t1 - 1).toISOString(), state: "ACTIVE" }); }) === "malformed"
      && mut((r) => { r.transitions.push({ ...r.transitions[0], at: new Date(t1 + 1).toISOString() }); }) === "malformed"
      && mut((r) => { r.extra = 1; }) === "malformed"
      && mut((r) => { r.gap = { from: new Date(t1 + 5).toISOString(), to: new Date(t1).toISOString() }; }) === "malformed"
      && mut((r) => { r.transitions[0].state = "LAUNCHED"; }) === "malformed",
    "");

  /* L.13 · wiring (source) */
  const life = impl.lifecycle;
  const iObs = life.lastIndexOf("await observeJourneyLaunch()"), iSweep = life.lastIndexOf("await maybeRunHolderSweep()");
  ok("L.13 · the lifecycle pass observes the rollout on its own catch, before the holder sweep (which stays last)",
    iObs > 0 && iSweep > iObs && /await observeJourneyLaunch\(\)\.catch\(/.test(life) && (life.match(/await observeJourneyLaunch\(\)/g) ?? []).length === 1);
  ok("L.13b · the prelaunch reset classifies the key as dropped AND deletes it in its SQL AND verifies it",
    /\/\^journey\\\.rollout\\\.observed\$\//.test(impl.reset) && /OR key='journey\.rollout\.observed'/.test(impl.reset)
      && /key IN \('journey\.rollout\.observed','journey\.harm\.daily'\)/.test(impl.reset));
  await setRow(null);
  return { onPostgres };
}
