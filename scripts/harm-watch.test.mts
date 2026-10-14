/**
 * test:harm-watch — the S13 harm watch's daily count (`src/lib/server/harm-watch.ts`, S13-PLAN WP3), ON BOTH STORES.
 *
 *   npm run test:harm-watch     (boots the on-box Postgres through db-scratch; KP_SCRATCH_PORT picks its port)
 *   npm run red:harm-watch      (--prove-red: memory only, in process — each defect below is planted in the cases'
 *                                implementation and must be caught by its own named case; nothing is written to disk)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/harm-watch-cases.mts`), the two-store runner. ⛔ NO POSTGRES IS A FAILURE.
 * ⛔ THE FLOOR: H.1–H.10 with their sub-cases are 14 lines on each store, plus 0.store = 15.
 *
 * ⚠️ S13-PLAN WP3 asked for a plant that "narrows 8 days to 7" to fail. It cannot: the detectors need a deposit inside 24
 * hours or three inside 7 days, so a 7-day candidate window loses no flagged account — the eighth day is margin. A plant
 * that cannot fail proves nothing (`50pick-standards` §5b rule 8), so the window plants below narrow to 24 hours and to
 * 6 days, which DO lose an account the detector flags (the chaser whose top-ups are 2–6½ days old).
 */
const PROVE_RED = process.argv.includes("--prove-red");

if (!PROVE_RED) {
  const { runTwoStores } = await import("./lib/house-bot-two-stores.mts");
  await runTwoStores({ suite: "test:harm-watch", casesFile: "scripts/lib/harm-watch-child.mts", minPass: 15, dbPrefix: "s13_harm" });
} else {
  delete process.env.DATABASE_URL;
  process.env.USE_PRISMA_DAL = "false";
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
  const { loadHarm, runHarmCases } = await import("./lib/harm-watch-cases.mts");
  const { HW, impl: REAL } = await loadHarm();
  type Impl = typeof REAL;
  const run = async (impl: Impl) => {
    const failed: string[] = [];
    try { await runHarmCases((label, cond) => { if (!cond) failed.push(label); }, impl, HW); }
    catch (e) { failed.push(`threw: ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
    return failed;
  };
  const DAY = 86_400_000;
  const plants: Array<{ name: string; expect: RegExp; impl: Impl }> = [
    { name: "the candidates narrowed to 24 hours (the 7-day chaser is lost)", expect: /^H\.2 /,
      impl: { ...REAL, candidates: (since) => REAL.candidates(since + 7 * DAY) } },
    { name: "the candidates narrowed to 6 days (the account whose top-ups are 6.9 days old is lost)", expect: /^H\.2 /,
      impl: { ...REAL, candidates: (since) => REAL.candidates(since + 2 * DAY) } },
    { name: "staff accounts filtered out of the count (a role filter D20a forbids)", expect: /^H\.2 /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o?.detect ? { ...o, detect: async (id: string) => (/_staff_/.test(id) ? [] : o.detect(id)) } : o) } },
    { name: "a marked deposit's account dropped (an exclusion D20a forbids)", expect: /^H\.2 /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o?.detect ? { ...o, detect: async (id: string) => (/_marked_/.test(id) ? [] : o.detect(id)) } : o) } },
    { name: "counted before 03:00 EAT", expect: /^H\.1 /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(new Date(now + 3 * 3_600_000).getUTCHours() < 3 ? now + 2 * 3_600_000 : now, o) } },
    { name: "the same day counted twice", expect: /^H\.3 /,
      impl: { ...REAL, snapshot: async (now, o) => { const r = await REAL.snapshot(now, o); if (r.wrote === "skipped" && r.why === "already counted") { HW.__setHarmWatchMemoryForTests(null); return REAL.snapshot(now, o); } return r; } } },
    { name: "an overrun recorded as the partial count", expect: /^H\.4 /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o?.ceilingMs ? { ...o, ceilingMs: Number.MAX_SAFE_INTEGER } : o) } },
    { name: "a day never counted read as 0", expect: /^H\.6 /,
      impl: { ...REAL, series: async () => { const r = await REAL.series(); if (!r.ok) return r; const m = new Map(r.byDay); for (let i = 1; i <= 3; i++) { const d = new Date(Date.now() + 3 * 3_600_000 - i * DAY).toISOString().slice(0, 10); if (!m.has(d)) m.set(d, { day: d, at: new Date().toISOString(), rapidDeposit: 0, chasingLosses: 0, scanned: 0 }); } return { ok: true, byDay: m }; } } },
    { name: "a malformed series overwritten", expect: /^H\.7 /,
      impl: { ...REAL, snapshot: async (now, o) => { const r = await REAL.snapshot(now, o); if (r.wrote === "skipped" && r.why === "series malformed") { HW.__setHarmWatchMemoryForTests(null); return REAL.snapshot(now, o); } return r; } } },
    { name: "two containers both write the day (no compare-and-swap)", expect: /^H\.8 /,
      impl: { ...REAL, series: async () => { const r = await REAL.series(); return r; }, snapshot: async (now, o) => { const r = await REAL.snapshot(now, o); return r.wrote === "skipped" && r.why === "lost the race" ? { wrote: "counted", day: "x", rapidDeposit: 0, chasingLosses: 0, scanned: 0 } : r; } } },
    { name: "the detector re-implemented with a window of its own", expect: /^H\.10 /,
      impl: { ...REAL, source: REAL.source.replace("const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id));", "const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id)); const RAPID_MS = 3600_000;") } },
    { name: "the lifecycle never counts", expect: /^H\.10b /,
      impl: { ...REAL, lifecycle: REAL.lifecycle.replace(/    await maybeCountHarmWatch\(\)\.catch\([^\n]*\n/, "") } },
    { name: "the reset never deletes the series", expect: /^H\.10c /,
      impl: { ...REAL, reset: REAL.reset.replace(" OR key='journey.harm.daily'", "") } },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL);
  say("the REAL harm watch passes every case", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the cases cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}
