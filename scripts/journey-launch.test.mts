/**
 * test:journey-launch — the S13 launch record (`src/lib/server/journey-launch.ts`, S13-PLAN WP2), ON BOTH STORES.
 *
 *   npm run test:journey-launch     (boots the on-box Postgres through db-scratch; KP_SCRATCH_PORT picks its port)
 *   npm run red:journey-launch      (--prove-red: memory only, in process — each defect below is planted in the cases'
 *                                    implementation and must be caught by its own named case; nothing is written to disk)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/journey-launch-cases.mts` runs in two child processes through the runner the
 * two-store suites use: the memory store, then a fresh scratch database with every migration applied. A case that passes
 * in memory and fails on Postgres is a FAIL. ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOOR: L.1–L.13 with their sub-cases are 19 lines on each store (L.1row reads the store's own row), plus 0.store = 20.
 */
const PROVE_RED = process.argv.includes("--prove-red");

if (!PROVE_RED) {
  const { runTwoStores } = await import("./lib/house-bot-two-stores.mts");
  await runTwoStores({
    suite: "test:journey-launch",
    casesFile: "scripts/lib/journey-launch-child.mts",
    minPass: 20,
    dbPrefix: "s13_launch",
  });
} else {
  delete process.env.DATABASE_URL;
  process.env.USE_PRISMA_DAL = "false";
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
  const { loadLaunch, runLaunchCases } = await import("./lib/journey-launch-cases.mts");
  const { JL, impl: REAL } = await loadLaunch();
  type Impl = typeof REAL;
  const run = async (impl: Impl) => {
    const failed: string[] = [];
    try { await runLaunchCases((label, cond) => { if (!cond) failed.push(label); }, impl, JL); }
    catch (e) { failed.push(`threw: ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
    return failed;
  };
  const plants: Array<{ name: string; expect: RegExp; impl: Impl }> = [
    { name: "a failed switch read recorded as WITHDRAWN (a rollback invented)", expect: /^L\.10c /,
      impl: { ...REAL, readNow: async () => (await REAL.readNow()) ?? { state: "WITHDRAWN", source: "unread" } } },
    { name: "an older build's observation written back", expect: /^L\.6 /,
      impl: { ...REAL, observe: (now, o) => REAL.observe(now, { ...o, processStartedAt: Date.UTC(2100, 0, 1) }) } },
    { name: "the race writes two transitions (no compare-and-swap)", expect: /^L\.5 /,
      impl: { ...REAL, observe: async (now, o) => {
        const r = await REAL.observe(now, o);
        if (r.wrote === "skipped" && r.why === "lost the race") {
          const cur = (await REAL.record()).record;
          const seen = await o!.read!();
          JL.__setJourneyLaunchMemoryForTests({ ...cur, transitions: [...cur.transitions, { at: new Date(now).toISOString(), state: seen.state, source: seen.source, processStartedAt: new Date(o!.processStartedAt!).toISOString() }] });
          return { wrote: "appended", from: null, to: seen.state };
        }
        return r;
      } } },
    { name: "a malformed row overwritten by a fresh record", expect: /^L\.7 /,
      impl: { ...REAL, observe: async (now, o) => {
        const rec = await REAL.record();
        if (!rec.ok && rec.why === "malformed") { JL.__setJourneyLaunchMemoryForTests(null); return REAL.observe(now, o); }
        return REAL.observe(now, o);
      } } },
    { name: "a malformed row read as 'no record yet'", expect: /^L\.7 /,
      impl: { ...REAL, record: async () => { const r = await REAL.record(); return r.ok ? r : { ok: true, facts: null, record: null }; } } },
    { name: "the first ACTIVE dropped when the record is bounded", expect: /^L\.11 /,
      impl: { ...REAL, bound: (rec, max) => { const r = REAL.bound(rec, max); return { ...r, transitions: r.transitions.filter((t: { state: string }, i: number) => i === 0 || t.state !== "ACTIVE" || i > 3) }; } } },
    { name: "the dropped middle left without a gap (unknown days read as whatever came before)", expect: /^L\.11 /,
      impl: { ...REAL, bound: (rec, max) => ({ ...REAL.bound(rec, max), gap: null }) } },
    { name: "a record with a repeated state accepted", expect: /^L\.12 /,
      impl: { ...REAL, parse: (raw) => { const r = REAL.parse(raw); if (r !== "malformed") return r; const x = raw as { transitions?: Array<{ state: string }> }; return Array.isArray(x?.transitions) && x.transitions.length === 2 && x.transitions[0].state === x.transitions[1].state ? x : r; } } },
    { name: "the launch taken from the LAST move to ACTIVE (a return after a rollback becomes the launch)", expect: /^L\.4 /,
      impl: { ...REAL, record: async () => { const r = await REAL.record(); if (!r.ok || !r.facts) return r; const act = r.facts.transitions.filter((t: { state: string }) => t.state === "ACTIVE"); return { ...r, facts: { ...r.facts, firstActiveAt: act.length ? act[act.length - 1].at : null } }; } } },
    { name: "the lifecycle observes after the holder sweep", expect: /^L\.13 /,
      impl: { ...REAL, lifecycle: REAL.lifecycle.replace(/    await observeJourneyLaunch\(\)\.catch\([^\n]*\n/, "").replace("await maybeRunHolderSweep().catch((e) => console.error(\"[lifecycle] house-bot holder sweep:\", e));", "await maybeRunHolderSweep().catch((e) => console.error(\"[lifecycle] house-bot holder sweep:\", e));\n    await observeJourneyLaunch().catch((e) => console.error(\"[lifecycle] journey launch record:\", e));") } },
    { name: "the reset classifies the key but its SQL never deletes it", expect: /^L\.13b /,
      impl: { ...REAL, reset: REAL.reset.replace("OR key='journey.rollout.observed' ", "") } },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL);
  say("the REAL record passes every case", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the cases cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}
