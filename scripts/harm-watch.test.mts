/**
 * test:harm-watch — the S13 harm watch's daily count (`src/lib/server/harm-watch.ts`, S13-PLAN WP3), ON BOTH STORES.
 *
 *   npm run test:harm-watch     (boots the on-box Postgres through db-scratch; KP_SCRATCH_PORT picks its port)
 *   npm run red:harm-watch      (--prove-red: memory only, in process — each defect below is planted in the cases'
 *                                implementation and must be caught by its own named case; nothing is written to disk)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/harm-watch-cases.mts`), the two-store runner. ⛔ NO POSTGRES IS A FAILURE.
 * ⛔ THE FLOOR: H.1–H.10 with their sub-cases are 14 lines on each store, plus 0.store = 15.
 * ⭐ RAISED 2026-10-18 (MASWALI-BUILD S6, OD-22): H.11–H.11e add five lines on each store, and H.10d (round 2: the second
 *    row's own key in the prelaunch reset) one more — 21. Round 4: H.11f and H.11g (the split from the first PUBLIC week's
 *    opening, on the real reads) — 23. Round 6: H.11h and H.11h2 (who holds a ticket read outside the time ceiling) and
 *    H.10e (the source names no parameter of the player-safety logic) — 26. Round 7: H.11i (the ticket read's own budget) — 27.
 *    Round 8: H.11i2 (that budget on the real clock) — 28 on each store. Round 10: H.10e reads four files' prose and the
 *    red twin plants each of its forms (no new line; still 28). R15: H.10e fails any figure in a sentence that names a
 *    detector, a reference set aside exactly; the red twin plants each new form and appends each reference form, which
 *    must leave every case passing (no new line; still 28).
 *
 * ⚠️ S13-PLAN WP3 asked for a plant that narrows the candidate window slightly to fail. It cannot (S13-PLAN A8): the
 * window holds every deposit either detector reads. A plant that cannot fail proves nothing
 * (`AGENTS.md` §8), so the window plants below narrow it far enough to lose an account the detector flags.
 */
const PROVE_RED = process.argv.includes("--prove-red");

if (!PROVE_RED) {
  const { runTwoStores } = await import("./lib/house-bot-two-stores.mts");
  await runTwoStores({ suite: "test:harm-watch", casesFile: "scripts/lib/harm-watch-child.mts", minPass: 28, dbPrefix: "s13_harm" });
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
  /** The opening of the first week of EITHER line — what the split keyed on before round 4 (the drive included). */
  const { weekStore } = await import("../src/lib/server/maswali-dal.ts");
  const firstOpeningOfAnyWeek = async (): Promise<number | null> => {
    const t = (await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING", "SETTLED", "VOIDED"] })).map((w) => Date.parse(w.opensAt)).filter((x) => Number.isFinite(x));
    return t.length ? Math.min(...t) : null;
  };
  /** ⭐ Round 10 — the forms H.10e must catch, assembled from tokens (a comment marker and the markers' names joined). */
  const C = ["/", "/"].join(""), R1 = ["RAPID", "DEPOSIT", "ESCALATION"].join("_"), R2 = ["CHASING", "LOSSES"].join("_");
  const H10E_FORMS: Array<[string, string]> = [
    ["a figure before its unit", `${C} ${R1} on ${5} deposits in ${13} hours`],
    ["a hyphenated unit", `${C} ${R1} reads a ${19}-hour span`],
    ["a hyphenated day unit", `${C} ${R2} looks over a ${11}-day span`],
    ["a figure after its unit", `${C} ${R2} reads days ${9} back`],
    ["the figure first, the marker after", `${C} a ${9} days span for ${R2}`],
    ["a detector named in prose", `${C} the ${["rapid", "deposit"].join("-")} ${["detec", "tor"].join("")} ${["looks", "back"].join(" ")} ${47} ${["min", "utes"].join("")}`],
    ["a sentence wrapped across comment lines", `${C} ${R2} needs ${"nine"} confirmed deposits\n${C} in the last ${11} days`],
    ["a counted noun", `${C} ${R2} needs ${4} top-ups`],
    ["a counted number word", `${C} ${R2} needs ${"eleven"} top-ups`],
    ["a number word with a unit", `${C} ${R1} ${["looks", "back"].join(" ")} ${"twenty-two"} ${["ho", "urs"].join("")}`],
    ["an abbreviated unit", `${C} ${R1}: ${7}+ deposits in ${13}min`],
    ["a sentence broken by an abbreviation", `${C} ${R2} (${"e.g."} a top-up after a bet) within ${17} minutes`],
    ["slack named beside a span constant", `${C} inside the candidate window and a ${"margin"} of its own (${["HARM", "WATCH", "CANDIDATE", "DAYS"].join("_")})`],
    // ⭐ Round 13 — the stricter forms: a unit word with no figure, the other names, the pairing, the slack words, the
    // abbreviations, and a literal in the code.
    ["a unit word with no figure", `${C} ${R2} reads ${"recent"} ${["ho", "urs"].join("")} only`],
    ["the harm marker named in prose", `${C} the ${["harm", "marker"].join(" ")} sums the ${["da", "ily"].join("")} deposits`],
    ["the look-back named in prose", `${C} the logic ${["looks", "back"].join(" ")} over ${["we", "eks"].join("")}`],
    ["another marker's name", `${C} ${["LATE", "NIGHT", "PLAY"].join("_")} reads the ${["nigh", "tly"].join("")} play`],
    ["a third marker's name", `${C} ${["SESSION", "OVERRUN"].join("_")} fires past the ${["min", "utes"].join("")}`],
    ["a fourth marker's name", `${C} ${["LIMIT", "BREACH", "HISTORY"].join("_")} looks over ${["mon", "ths"].join("")}`],
    ["a unit in the sentence after a detector", `${C} ${R1} raises its flag. It reads ${["a", " ", "mon", "th"].join("")}`],
    ["slack named as a buffer", `${C} the candidate ${["win", "dow"].join("")} keeps a ${["buf", "fer"].join("")}`],
    ["slack named as to spare", `${C} the span holds every deposit with room ${["to", "spare"].join(" ")}`],
    ["slack named as longer than", `${C} the candidate ${["win", "dow"].join("")} is ${["longer", "than"].join(" ")} it needs`],
    ["a sentence carried past an abbreviation", `${C} ${R2} counts top-ups ${["etc", "."].join("")} within ${["min", "utes"].join("")}`],
    ["a counted figure past an abbreviation", `${C} ${R2} (${["approx", "."].join("")} ${7} top-ups) fires`],
    ["a detector in a string literal", `const label = "${R2} reads recent ${["ho", "urs"].join("")}";`],
    // ⭐ Round 14 — two more unit words.
    ["an abbreviated week", `${C} ${R2} reads nine ${["w", "k"].join("")} back`],
    ["a fortnight", `${C} ${R1} reads the last ${["fort", "night"].join("")}`],
    // ⭐ R15 — a figure of any kind in a sentence that names a marker, with no unit: the R15 rule alone sees each form below.
    // Every figure is made up and echoes no detector's actual setting (nor do the older forms above, since R15).
    ["a bare figure", `${C} ${R2} flags an account past ${19}`],
    ["a number word", `${C} ${R2} flags an account past ${["nine", "teen"].join("")}`],
    ["a dozen", `${C} ${R1} flags ${["a", "dozen"].join(" ")} of them`],
    ["an ordinal", `${C} ${R2} fires on the ${["nin", "th"].join("")} top-up`],
    ["a fraction", `${C} ${R2} reads a ${["quar", "ter"].join("")} of the history`],
    ["a multiplicative", `${C} ${R2} fires ${["on", "ce"].join("")} a top-up follows a bet`],
    ["a multiplier word", `${C} ${R1} flags a ${["ten", "fold"].join("")} total`],
    ["a multiplier sign", `${C} ${R1} flags past ${["×", "9"].join("")} the usual total`],
    ["a currency amount", `${C} ${R1} flags a total over ${["TZS", "1,250"].join(" ")}`],
    ["an amount in thousands", `${C} ${R1} flags a total over ${["9", "k"].join("")}`],
    ["an amount written like an id", `${C} ${R1} flags a total over ${["TZS", "1250"].join("")}`],
    ["a multiplier written like an id", `${C} ${R2} fires on an ${["X", "9"].join("")} jump`],
    ["a year with no date", `${C} ${R2} was tuned in ${["20", "26"].join("")}`],
    ["a figure beside a reference", `${C} ${R2} (${["S", "6"].join("")}) flags past ${19}`],
    ["a figure dressed as a case id", `const label = "${["1", "25"].join(".")} TZS past which ${R2} flags";`],
  ];
  /** ⭐ R15 — each reference form beside a marker's name, appended to the source: every case must still pass. */
  const H10E_QUIET: Array<[string, string]> = [
    ["a date", `${C} ${R2} was reworded on ${["2026", "10", "19"].join("-")}`],
    ["a date and a time", `${C} ${R2} was reworded at ${["2026", "10", "19"].join("-")} ${["22", "44"].join(":")} UTC`],
    ["a dated version", `${C} ${R2} is described by the policy ${"v"}${["2026", "09", "26"].join("-")}`],
    ["a file's line reference", `${C} ${R2} lives at ${["responsible-gambling", "ts"].join(".")}:${123}`],
    ["a quoted file's lines", `${C} ${R2} lives at ${"\x60"}${["responsible-gambling", "ts"].join(".")}${"\x60"}:${["12", "40"].join("–")}, :${56}`],
    ["a line as L", `${C} ${R2} lives at ${["L", "123"].join("")}`],
    ["a line range as #L", `${C} ${R2} lives at ${["#L", "12", "-L", "40"].join("")}`],
    ["plan ids with their hyphen", `${C} ${R2} is ruled in ${["MB", "23"].join("-")}, ${["OD", "08"].join("-")} and ${["MR", "16"].join("-")}`],
    ["a section id", `${C} ${R2} is ruled in ${["§", "5b"].join("")}`],
    ["session and review ids", `${C} ${R2} was reworded in ${["S", "6"].join("")} and ${["R", "4"].join("")}`],
    ["a case id", `${C} ${R2} is proved by ${["H", "10e"].join(".")}`],
    ["the id a case's label opens with", `const label = "${["7", "2"].join(".")} the ${R2} detail is checked";`],
  ];
  const plants: Array<{ name: string; expect: RegExp; impl: Impl }> = [
    { name: "the candidates' window narrowed far (a chaser the detector flags is lost)", expect: /^H\.2 /,
      impl: { ...REAL, candidates: (since) => REAL.candidates(since + 7 * DAY) } },
    { name: "the candidates' window narrowed less (the late chaser the detector flags is lost)", expect: /^H\.2 /,
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
      impl: { ...REAL, series: async () => { const r = await REAL.series(); if (!r.ok) return r; const m = new Map(r.byDay); for (let i = 1; i <= 3; i++) { const d = new Date(Date.now() + 3 * 3_600_000 - i * DAY).toISOString().slice(0, 10); if (!m.has(d)) m.set(d, { day: d, at: new Date().toISOString(), rapidDeposit: 0, chasingLosses: 0, scanned: 0 }); } return { ...r, byDay: m }; } } },
    { name: "a malformed series overwritten", expect: /^H\.7 /,
      impl: { ...REAL, snapshot: async (now, o) => { const r = await REAL.snapshot(now, o); if (r.wrote === "skipped" && r.why === "series malformed") { HW.__setHarmWatchMemoryForTests(null); return REAL.snapshot(now, o); } return r; } } },
    { name: "two containers both write the day (no compare-and-swap)", expect: /^H\.8 /,
      impl: { ...REAL, series: async () => { const r = await REAL.series(); return r; }, snapshot: async (now, o) => { const r = await REAL.snapshot(now, o); return r.wrote === "skipped" && r.why === "lost the race" ? { wrote: "counted", day: "x", rapidDeposit: 0, chasingLosses: 0, scanned: 0 } : r; } } },
    { name: "the detector re-implemented with a window of its own", expect: /^H\.10 /,
      impl: { ...REAL, source: REAL.source.replace("const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id));", "const detect = opts.detect ?? ((id: string) => detectHarmMarkers(id)); const sinceThen = Date.now() - 7_777;") } },
    // ⭐ Round 11 — a new constant carrying a figure, and a product led by a unit constant, in the harm watch's code (made-up figures).
    { name: "a new constant carrying a figure in the harm watch's code", expect: /^H\.10 /,
      impl: { ...REAL, source: `${REAL.source}\nconst ${["SPAN", "LIMIT"].join("_")} = ${23};` } },
    { name: "a product led by a unit constant in the harm watch's code", expect: /^H\.10 /,
      impl: { ...REAL, source: `${REAL.source}\nconst span = ${"DAY_MS"} * ${29};` } },
    { name: "the lifecycle never counts", expect: /^H\.10b /,
      impl: { ...REAL, lifecycle: REAL.lifecycle.replace(/    await maybeCountHarmWatch\(\)\.catch\([^\n]*\n/, "") } },
    { name: "the reset never deletes the series", expect: /^H\.10c /,
      impl: { ...REAL, reset: REAL.reset.replace(" OR key='journey.harm.daily'", "") } },
    // ⭐ MASWALI-BUILD S6 · OD-22 — the split's three ways to be wrong.
    { name: "the split counts the ticket holders too", expect: /^H\.11 /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o?.holders ? { ...o, holders: async () => new Set<string>() } : o) } },
    { name: "a split written before any Millionea week opened", expect: /^H\.11b /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o && "openedAt" in o ? { ...o, openedAt: async () => 0 } : o) } },
    { name: "the second count written into the S13 row (a build older than S6 would call the series malformed)", expect: /^H\.11d /,
      impl: { ...REAL, snapshot: async (now, o) => {
        const r = await REAL.snapshot(now, o);
        const row = (globalThis as { __50PICK_HARM_WATCH?: { value: { days?: Array<Record<string, unknown>> } | null } }).__50PICK_HARM_WATCH?.value;
        if (r.noTicket && row?.days?.length) { row.days[row.days.length - 1].noTicket = r.noTicket; HW.__setHarmWatchMemoryForTests(row); }
        return r;
      } } },
    { name: "the reset never deletes the second row", expect: /^H\.10d /,
      impl: { ...REAL, reset: REAL.reset.replace(" OR key='journey.harm.noTicket.daily'", "") } },
    // ⭐ Round 10 — H.10e's forms, one plant each, every figure made up; each sentence is assembled from tokens at run time,
    // so this file's own prose holds none of them.
    ...H10E_FORMS.map(([form, text]) => ({ name: `a detector's parameter in the public source again (${form})`, expect: /^H\.10e /,
      impl: { ...REAL, source: `${REAL.source}\n${text}` } })),
    // ⭐ Round 4 — the split dates the event it reports: the first PUBLIC week's opening; the private drive's starts nothing.
    { name: "the split keyed on any week's opening (the private drive's opening splits the S16 series)", expect: /^H\.11f /,
      impl: { ...REAL, snapshot: (now, o) => REAL.snapshot(now, o && !("openedAt" in o) ? { ...o, openedAt: firstOpeningOfAnyWeek } : o) } },
    // ⭐ Round 6 — the ticket read's time charged to the day's ceiling (as when it ran on the ceiling's clock): the read's
    // cost lands again inside the walk.
    { name: "the ticket read charged to the day's time ceiling (a slow read costs the day its count)", expect: /^H\.11h /,
      impl: { ...REAL, snapshot: (now, o) => {
        if (!o?.holders || !o?.clock || !o?.detect) return REAL.snapshot(now, o);
        let first = true;
        return REAL.snapshot(now, { ...o, detect: async (id: string) => { if (first) { first = false; await o.holders([]); } return o.detect(id); } });
      } } },
    // ⭐ Round 7 — the ticket read's own budget ignored: the snapshot's clock never sees the read's time, so a read past
    // its budget still splits the day.
    // ⭐ Round 8 — the read awaited in full, without its budget (on the real clock the tick waits for it).
    { name: "the ticket read awaited without its budget (the tick waits for a late read)", expect: /^H\.11i2 /,
      impl: { ...REAL, snapshot: async (now, o) => {
        if (!o?.holders || o?.clock) return REAL.snapshot(now, o);
        const ids = o.candidates ? await o.candidates(0) : [];
        const got = await o.holders(ids).catch(() => null);
        return REAL.snapshot(now, { ...o, holders: async () => { if (got === null) throw new Error("planted: the holders read failed"); return got; } });
      } } },
    { name: "the ticket read's own budget ignored (a read past it still splits the day)", expect: /^H\.11i /,
      impl: { ...REAL, snapshot: (now, o) => {
        if (!o?.holders || !o?.clock) return REAL.snapshot(now, o);
        let charged = 0;
        return REAL.snapshot(now, { ...o, clock: () => o.clock() - charged,
          holders: async (ids: readonly string[]) => { const t0 = o.clock(); const r = await o.holders(ids); charged += o.clock() - t0; return r; } });
      } } },
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
  let left = 0;
  for (const [form, text] of H10E_QUIET) {
    const failures = await run({ ...REAL, source: `${REAL.source}\n${text}` });
    if (failures.length === 0) left++;
    say(`CONTROL · a reference beside a detector's name is no figure (${form})`, failures.length === 0, failures.length === 0 ? "" : `flagged: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught · ${left}/${H10E_QUIET.length} references left alone${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}
