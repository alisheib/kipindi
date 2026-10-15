/**
 * test:journey-measures-core — the S13 pure core (`src/lib/journey/measures.ts`): the agency's five measures as data, the
 * windows, the one status vocabulary, the cadence, one rounding rule, and the row matching both stores share.
 *
 *   npm run test:journey-measures-core
 *   npm run red:journey-measures-core     (--prove-red: every defect below is planted IN MEMORY and must be caught
 *                                           by its own named assertion; nothing is written to disk)
 *
 *   §0  the zone: the run is pinned to a zone that is neither UTC nor EAT, and §0 refuses to call itself green otherwise.
 *   §1  the definitions assert themselves: both titles, a unit, a campaign split only where BOTH halves carry the tag,
 *       "before" honest for measures 3 and 4, no house word, no claim of an owner's approval, the WP4 flags honest.
 *   §2  the windows: today never in one; the launch day on neither side; EAT days, not UTC ones; the baseline clipped to
 *       the first full counted day and marked partial; a rollback day skipped and named; an unknown day never assumed.
 *   §3  the cells: the precedence, the marks, the hold at 100.0%, "no offer" and "not recorded" never a 0, a campaign
 *       split refused where a half carries no tag, S9's records absent → "not available", never 0.
 *   §4  one rounding: tenths of a percent; one decimal; the fraction a numeric cell carries prints the same text.
 *   §5  the change: in points, from the PRINTED shares, U+2212 for a fall, only between two figures.
 *   §6  the cadence: the baseline before launch; eight Mondays from the first whose week holds a day after launch; then
 *       the previous calendar month on the first Monday after it ends; the week report never on a skipped day.
 *   §7  the matching: one deposit per returned bet (the latest eligible), the 30 minutes inclusive, the follow-up rule.
 */
process.env.TZ = "Pacific/Honolulu";
process.exitCode = 1;

const M = await import("../src/lib/journey/measures.ts");
const { eatDayKey, eatDayStartMs } = await import("../src/lib/eat-day.ts");
const { HOUSE_WORD_SOURCE, HOUSE_IDENTIFIER_SOURCE } = await import("./lib/house-bot-vocabulary.mjs");

type Mod = typeof M;
const PROVE_RED = process.argv.includes("--prove-red");
const HOUR = 3_600_000, DAY = 86_400_000;
/** An instant written in East Africa Time (UTC+3). */
const eat = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 3, mi);
const j = (v: unknown) => JSON.stringify(v);

/** A launch record: observed from `since`, with these transitions. */
function launch(since: number, transitions: Array<[number, M.RolloutState]>, gap: M.LaunchFacts["gap"] = null): M.LaunchFacts {
  const t = transitions.map(([at, state]) => ({ at, state }));
  const firstActive = t.find((x) => x.state === "ACTIVE")?.at ?? null;
  return { observedSince: since, firstActiveAt: firstActive, startedActive: firstActive === since, transitions: t, gap };
}

async function run(impl: Mod, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  /* §0 · the zone */
  const offset = new Date(Date.UTC(2026, 9, 14, 12)).getTimezoneOffset();
  ok("0.zone · the run is in a zone that is neither UTC nor EAT (Pacific/Honolulu, +600 minutes)", offset === 600, `offset ${offset}`);

  /* §1 · the definitions */
  const keys = impl.MEASURES.map((m) => m.key);
  ok("1.keys · the five measures and the comparison row, each once, in the agency's order",
    j(keys) === j(["homeToSheet", "sheetToBet", "shortToDeposit", "depositToBet", "depositToAnyBet", "timeToFirstBet"]), j(keys));
  ok("1.names · the agency's own words",
    j(impl.MEASURES.map((m) => m.name)) === j(["Home → bet sheet", "Bet sheet → bet placed", "Short balance → deposit", "Deposit → bet completed", "Deposit → any bet within 30 minutes", "Time to first bet"]));
  ok("1.titles · every measure has both language titles, a unit, both halves' words and a 'none yet' sentence",
    impl.MEASURES.every((m) => m.name && m.nameSw && m.unit && m.noneYet && m.numerator.text && m.denominator.text && m.nameSw !== m.name));
  ok("1.split · a campaign split is claimed exactly where BOTH halves are counted with the visit's tag (measure 2 only)",
    impl.MEASURES.every((m) => m.campaignSplit === (m.numerator.half.source === "counter" && m.denominator.half.source === "counter"))
      && impl.MEASURES.filter((m) => m.campaignSplit).map((m) => m.key).join() === "sheetToBet");
  const byKey = Object.fromEntries(impl.MEASURES.map((m) => [m.key, m])) as Record<M.MeasureKey, M.MeasureDef>;
  ok("1.before · short balance → deposit has no 'before' (no deposit was offered); deposit → bet completed is not recorded before launch; the rest are figures",
    byKey.shortToDeposit.before === "no-offer" && byKey.depositToBet.before === "not-recorded"
      && ["homeToSheet", "sheetToBet", "depositToAnyBet", "timeToFirstBet"].every((k) => byKey[k as M.MeasureKey].before === "figure"));
  ok("1.s9 · exactly the measures that read S9's records say so (3 and 4)",
    impl.MEASURES.filter((m) => m.needsS9).map((m) => m.key).join() === "shortToDeposit,depositToBet");
  ok("1.overstate · the pairs fed by two counters can overstate (1, 2, 3); the row-only pairs (4, 4b, 5) cannot",
    impl.MEASURES.filter((m) => m.canOverstate).map((m) => m.key).join() === "homeToSheet,sheetToBet,shortToDeposit");
  const sheetOpen = byKey.sheetToBet.denominator.half;
  ok("1.every-origin · 'bet sheets opened, from anywhere' is every origin the allow-list names, for both journeys",
    sheetOpen.source === "counter" && j(sheetOpen.origins.old) === j(["home", "board", "market", "card"]) && j(sheetOpen.origins.new) === j(sheetOpen.origins.old));
  const sheetBets = byKey.sheetToBet.numerator.half;
  ok("1.sheet-bets · old journey: dial bets; new: sheet bets and the bet placed back from a deposit — never Up & Down's quick bets",
    sheetBets.source === "counter" && j(sheetBets.origins.old) === j(["dial"]) && j(sheetBets.origins.new) === j(["sheet", "deposit_return"]));
  const words = [
    ...impl.MEASURES.flatMap((m) => [m.name, m.nameSw, m.unit, m.noneYet, m.numerator.text, m.denominator.text, ...m.notes]),
    impl.REFERENCE_ROW.name, impl.REFERENCE_ROW.nameSw, impl.REFERENCE_ROW.text, ...impl.definitionNotes(),
  ].join("\n");
  ok("1.house · no house word and no house identifier anywhere in the definitions (D19)",
    !new RegExp(HOUSE_WORD_SOURCE, "i").test(words) && !new RegExp(HOUSE_IDENTIFIER_SOURCE).test(words));
  ok("1.no-person · the definitions name no person and claim no one's ruling or approval (the files state rules, not who chose them)",
    !/\b(Ali|approved|ruling|ruled|owner)\b/i.test(words));
  ok("1.exclusions · the agency's sentence about who is counted", impl.definitionNotes()[0] === "Players only. Staff accounts, previews and automated visits are not counted.");
  ok("1.wp4-honest · until WP4 ships, the words say a home view can open several sheets and the bet counter does not yet skip automation",
    impl.HOME_OPEN_ONE_PER_VIEW === false && impl.BET_COUNTER_SKIPS_AUTOMATION === false
      && byKey.homeToSheet.notes.some((n) => /several bet sheets/.test(n)) && impl.definitionNotes().some((n) => /bet counter does not yet/.test(n)));
  ok("1.follow-up · the one 30-minute rule and the 24-hour horizon", impl.DEPOSIT_FOLLOW_UP_MS === 30 * 60_000 && impl.FIRST_BET_HORIZON_MS === 24 * HOUR);
  ok("1.first-day · counting's first full day is 2026-10-02 (the deploy ended 01:47 EAT on 2026-10-01)", impl.FIRST_FULL_COUNTED_DAY === "2026-10-02");

  /* §2 · the windows */
  const RET = "2025-01-01";
  // Not launched, read at 08:00 EAT on 2026-10-20.
  const w0 = impl.measureWindows({ launch: null, nowMs: eat(2026, 10, 20, 8), retainedFromDay: RET });
  ok("2.today · today is never in a window (the baseline so far ends yesterday)",
    w0.today === "2026-10-20" && !w0.before.days.includes("2026-10-20") && w0.before.days[w0.before.days.length - 1] === "2026-10-19", j(w0.before.days));
  ok("2.baseline · before a launch the before window is the 14 days ending yesterday, and every after window is 'not launched'",
    w0.before.days.length === 14 && w0.before.days[0] === "2026-10-06" && w0.after[7].notLaunched && w0.after[28].notLaunched && w0.sinceLaunch.notLaunched);
  // Early: read on 2026-10-09 — only 2026-10-02 … 10-08 exist.
  const wEarly = impl.measureWindows({ launch: null, nowMs: eat(2026, 10, 9, 12), retainedFromDay: RET });
  ok("2.clip · a baseline older than counting is clipped to 2026-10-02 and each dropped day is named",
    wEarly.before.days[0] === "2026-10-02" && wEarly.before.days.length === 7
      && wEarly.before.skipped.length === 7 && wEarly.before.skipped.every((s) => s.why === "before counting began"), j(wEarly.before));
  // Launch at 15:00 EAT on 2026-11-02 (Monday), read at 09:00 EAT on 2026-11-20.
  const L = eat(2026, 11, 2, 15);
  const rec = launch(eat(2026, 10, 20, 10), [[eat(2026, 10, 20, 10), "STAFF_PREVIEW"], [L, "ACTIVE"]]);
  const w1 = impl.measureWindows({ launch: rec, nowMs: eat(2026, 11, 20, 9), retainedFromDay: RET });
  ok("2.launch-day · the launch day counts on neither side: before ends the day before it, after starts the day after it",
    w1.launchDay === "2026-11-02" && w1.before.days[w1.before.days.length - 1] === "2026-11-01" && w1.before.days[0] === "2026-10-19"
      && w1.after[7].days[0] === "2026-11-03" && !w1.after[7].days.includes("2026-11-02") && !w1.before.days.includes("2026-11-02"), j({ b: w1.before.days, a: w1.after[7].days }));
  ok("2.after · after 7 and 14 are full; after 28 is partial (the days so far), and today is not among them",
    w1.after[7].days.length === 7 && w1.after[14].days.length === 14 && w1.after[28].days.length === 17
      && w1.after[28].days[16] === "2026-11-19" && !w1.after[28].notLaunched, j(w1.after[28].days.length));
  // An EAT day boundary in a zone that is neither: 23:30 EAT on 2026-11-02 is still the launch day.
  ok("2.eat-day · the launch day is the EAT day of the first ACTIVE instant, not its UTC day",
    impl.launchDayOf(launch(eat(2026, 10, 1), [[eat(2026, 10, 1), "STAFF_PREVIEW"], [eat(2026, 11, 2, 1, 30), "ACTIVE"]])) === "2026-11-02"
      && eatDayKey(eat(2026, 11, 2, 1, 30)) === "2026-11-02");
  // A rollback for 6 hours on 2026-11-05, back to ACTIVE.
  const recRb = launch(eat(2026, 10, 20, 10), [[eat(2026, 10, 20, 10), "STAFF_PREVIEW"], [L, "ACTIVE"], [eat(2026, 11, 5, 9), "WITHDRAWN"], [eat(2026, 11, 5, 15), "ACTIVE"]]);
  const w2 = impl.measureWindows({ launch: recRb, nowMs: eat(2026, 11, 20, 9), retainedFromDay: RET });
  ok("2.rollback · a day with any moment off the new journey is skipped and named, and the window takes the next full day instead",
    !w2.after[7].days.includes("2026-11-05") && w2.after[7].days.length === 7 && w2.after[7].days[6] === "2026-11-10"
      && w2.after[7].skipped.some((s) => s.day === "2026-11-05" && s.why === "not on the new journey all day"), j(w2.after[7]));
  // Back to ACTIVE at 15:00: the day after (11-06) starts ACTIVE and stays so.
  ok("2.return · the first full day after a rollback's return counts again", w2.after[7].days.includes("2026-11-06"));
  // A record with a gap: days inside are not known, never assumed ACTIVE.
  const recGap = launch(eat(2026, 10, 20, 10), [[eat(2026, 10, 20, 10), "STAFF_PREVIEW"], [L, "ACTIVE"]], { from: eat(2026, 11, 7), to: eat(2026, 11, 9) });
  const w3 = impl.measureWindows({ launch: recGap, nowMs: eat(2026, 11, 20, 9), retainedFromDay: RET });
  ok("2.unknown · a day the record cannot vouch for is skipped as unknown, never counted as ACTIVE",
    !w3.after[14].days.includes("2026-11-07") && !w3.after[14].days.includes("2026-11-08")
      && w3.after[14].skipped.filter((s) => /not known/.test(s.why)).length === 2, j(w3.after[14].skipped));
  ok("2.pruned · a window older than the counters keep is marked pruned",
    impl.measureWindows({ launch: null, nowMs: eat(2026, 10, 20, 8), retainedFromDay: "2026-10-10" }).before.pruned && !w0.before.pruned);
  const wk = impl.weekWindow(recRb, "2026-11-09", RET);
  ok("2.week · the week before a Monday holds its ACTIVE days after the launch day only, the rollback day skipped and named",
    j(wk.days) === j(["2026-11-03", "2026-11-04", "2026-11-06", "2026-11-07", "2026-11-08"]) && wk.skipped.some((s) => s.day === "2026-11-05"), j(wk));
  const mo = impl.monthWindow(recRb, "2026-11", RET);
  ok("2.month · a calendar month counts its ACTIVE days after the launch day", mo.days[0] === "2026-11-03" && !mo.days.includes("2026-11-05") && mo.fromDay === "2026-11-01" && mo.toDay === "2026-11-30");

  /* §3 · the cells */
  const winFull: M.DayWindow = { key: "after7", variant: "new", asked: 7, days: ["a", "b", "c", "d", "e", "f", "g"], skipped: [], notLaunched: false, pruned: false, fromDay: "a", toDay: "g" };
  const winPartial: M.DayWindow = { ...winFull, days: ["a", "b", "c"] };
  const ctx = (m: M.MeasureKey, over: Partial<M.CellContext> = {}): M.CellContext =>
    ({ measure: byKey[m], side: "after", window: winFull, campaign: null, readable: true, s9: true, ...over });
  const fig = impl.cellFor(17, 40, ctx("sheetToBet"));
  ok("3.figure · a share is its numerator over its own denominator, one decimal, both halves kept",
    fig.status === "figure" && fig.text === "42.5%" && fig.n === 17 && fig.d === 40 && !fig.small && fig.note === null, j(fig));
  const held = impl.cellFor(45, 40, ctx("sheetToBet"));
  ok("3.held · a numerator above its denominator is held at 100.0% and marked; both halves are printed",
    held.status === "held" && held.text === "100.0%" && held.held && held.n === 45 && held.d === 40 && impl.cellMarks(held)[0] === "* two counters disagree", j(held));
  const none = impl.cellFor(0, 0, ctx("homeToSheet"));
  ok("3.none · no denominator is no figure: '—' and 'no {unit} yet', never 0%",
    none.status === "none" && none.text === "—" && none.tenths === null && none.note === "no home-page views yet");
  const small = impl.cellFor(3, 12, ctx("sheetToBet"));
  ok("3.small · a denominator under 30 is marked 'small sample'", small.small && impl.cellMarks(small).includes("small sample") && !impl.cellFor(10, 30, ctx("sheetToBet")).small);
  const part = impl.cellFor(5, 50, ctx("sheetToBet", { window: winPartial }));
  ok("3.partial · fewer days than the window asks are marked 'k of N days'", j(part.partial) === j({ counted: 3, asked: 7 }) && impl.cellMarks(part).includes("3 of 7 days"));
  const noOffer = impl.cellFor(0, 9, ctx("shortToDeposit", { side: "before", window: { ...winFull, key: "before", variant: "old", asked: 14 } }));
  ok("3.no-offer · measure 3 before launch prints no share and never 0%: '—', the reason, and the notices shown",
    noOffer.status === "no-offer" && noOffer.text === "—" && noOffer.tenths === null && noOffer.n === null && impl.halvesText(noOffer) === "9 notices shown", j(noOffer));
  const notRec = impl.cellFor(0, 5, ctx("depositToBet", { side: "before" }));
  ok("3.not-recorded · measure 4 before launch is 'not recorded', never a share", notRec.status === "not-recorded" && notRec.text === "—" && notRec.n === null && notRec.d === null);
  const notL = impl.cellFor(1, 2, ctx("sheetToBet", { window: { ...winFull, notLaunched: true, days: [] } }));
  ok("3.not-launched · an after column before launch says 'Not launched', no figure", notL.status === "not-launched" && notL.text === "Not launched" && notL.n === null);
  const notSplit = impl.cellFor(1, 2, ctx("shortToDeposit", { campaign: "launch" }));
  const split = impl.cellFor(1, 2, ctx("sheetToBet", { campaign: "launch" }));
  ok("3.not-split · under a campaign only measure 2 has a share; the others say 'not split by campaign'",
    notSplit.status === "not-split" && notSplit.note === "not split by campaign" && split.status === "figure"
      && impl.MEASURES.filter((m) => !m.campaignSplit).every((m) => impl.cellFor(1, 2, ctx(m.key, { campaign: "x" })).status === "not-split"));
  const unav = impl.cellFor(0, 4, ctx("depositToBet", { s9: false }));
  ok("3.unavailable · without S9's records an after cell of measures 3 and 4 says so — never a counted 0",
    unav.status === "unavailable" && unav.text === "—" && unav.n === null && impl.cellFor(0, 4, ctx("shortToDeposit", { s9: false })).status === "unavailable"
      && impl.cellFor(0, 4, ctx("depositToAnyBet", { s9: false })).status === "figure");
  const unread = impl.cellFor(3, 4, ctx("sheetToBet", { readable: false }));
  ok("3.unreadable · a source that failed says 'could not be read' in its own cell — never a 0, never a stale share",
    unread.status === "unreadable" && unread.text === "—" && unread.n === null && unread.note === "could not be read");
  const pruned = impl.cellFor(3, 4, ctx("sheetToBet", { window: { ...winFull, pruned: true } }));
  ok("3.pruned · a counter window older than 400 days says so; a row-only measure keeps its figure",
    pruned.status === "pruned" && pruned.note === "older than 400 days" && impl.cellFor(3, 4, ctx("timeToFirstBet", { window: { ...winFull, pruned: true } })).status === "figure");
  const order = impl.cellFor(3, 4, ctx("shortToDeposit", { readable: false, side: "before", campaign: "x", s9: false }));
  ok("3.precedence · unreadable wins over every other status", order.status === "unreadable");
  const marks = impl.cellFor(3, 5, ctx("depositToAnyBet", { window: winPartial, waiting: 2, notCounted: ["2026-11-04"] }));
  ok("3.marks · a counted cell carries its marks in one order: small sample, k of N days, waiting, not counted",
    j(impl.cellMarks(marks)) === j(["small sample", "3 of 7 days", "2 waiting", "not counted: 2026-11-04"]), j(impl.cellMarks(marks)));
  ok("3.marks-explained · an explained cell (not split, unreadable, …) carries none of the window's marks",
    impl.cellMarks(impl.cellFor(1, 2, ctx("homeToSheet", { campaign: "x", window: winPartial, waiting: 3 }))).length === 0);
  ok("3.bad-input · a negative or missing count is never printed as a figure", impl.cellFor(-1, 4, ctx("sheetToBet")).status === "unreadable" && impl.cellFor(null, 4, ctx("sheetToBet")).status === "unreadable");

  /* §4 · one rounding */
  ok("4.tenths · tenths of a percent, half up: 1/8 → 125, 1/80 → 13 (1.3%), 2/3 → 667, 1/1 → 1000",
    impl.tenthsOf(1, 8) === 125 && impl.tenthsOf(1, 80) === 13 && impl.tenthsOf(2, 3) === 667 && impl.tenthsOf(1, 1) === 1000 && impl.tenthsOf(0, 7) === 0);
  ok("4.text · one decimal everywhere: 12.5%, 1.3%, 66.7%, 100.0%, 0.0%",
    ["12.5%", "1.3%", "66.7%", "100.0%", "0.0%"].join() === [125, 13, 667, 1000, 0].map(impl.percentText).join(), [125, 13, 667, 1000, 0].map(impl.percentText).join());
  let agree = true;
  for (let d = 1; d <= 400 && agree; d++) for (let n = 0; n <= d && agree; n++) {
    const t = impl.tenthsOf(n, d);
    // The PDF renderer prints a percent cell as (v × 100).toFixed(1) — the fraction must print the same words.
    if (`${(impl.shareFraction(t) * 100).toFixed(1)}%` !== impl.percentText(t)) agree = false;
  }
  ok("4.renderers · the fraction a numeric cell carries prints exactly the screen's words through the PDF renderer's rule (every n ≤ d ≤ 400)", agree);
  ok("4.counts · counts print with thousands separators", impl.countText(1234567) === "1,234,567" && impl.countText(0) === "0");
  ok("4.daily-mean · a safety baseline is an average, never rounded to a whole event",
    impl.dailyMeanText(1 / 14) === "0.07" && impl.dailyMeanText(1 / 2) === "0.50"
      && impl.dailyMeanText(0) === "0.00" && impl.dailyMeanText(null) === "Could not be read");
  ok("4.minutes · the median time reads in minutes and hours", impl.minutesText(12) === "12 min" && impl.minutesText(72) === "1 h 12 min" && impl.minutesText(null) === "—");

  /* §5 · the change */
  const b1 = impl.cellFor(17, 40, ctx("sheetToBet", { side: "before" })), a1 = impl.cellFor(18, 40, ctx("sheetToBet"));
  const ch = impl.changeOf(b1, a1);
  ok("5.points · after minus before, in points, from the printed shares", ch?.text === "+2.5 pts" && ch?.tenths === 25, j(ch));
  const fall = impl.changeOf(a1, b1);
  ok("5.fall · a fall carries U+2212, never a hyphen", fall?.text === `${String.fromCharCode(0x2212)}2.5 pts`, j(fall));
  ok("5.only-figures · no change beside a held, empty or explained cell", impl.changeOf(b1, held) === null && impl.changeOf(none, a1) === null && impl.changeOf(b1, unav) === null);
  // 1/3 (33.3%) and 2/3 (66.7%): the printed difference is 33.4, the exact one 33.33… — the change must match the print.
  const third = impl.changeOf(impl.cellFor(1, 3, ctx("sheetToBet", { side: "before" })), impl.cellFor(2, 3, ctx("sheetToBet")));
  ok("5.printed · the change is the difference of the PRINTED shares (33.3% → 66.7% reads +33.4 pts)", third?.text === "+33.4 pts", j(third));

  /* §6 · the cadence */
  const s0 = impl.agencySchedule(null, eat(2026, 10, 20, 9));
  ok("6.baseline · before launch the due report is the baseline and no Monday is scheduled", s0.due.kind === "baseline" && s0.mondays.length === 0);
  const s1 = impl.agencySchedule("2026-11-02", eat(2026, 11, 20, 9));
  ok("6.mondays · eight Mondays, the first after the launch day's next day (launch Mon 2 Nov → first report Mon 9 Nov)",
    s1.mondays.length === 8 && s1.mondays[0] === "2026-11-09" && s1.mondays[7] === "2026-12-28" && s1.mondays.every((d) => impl.weekdayOf(d) === 0), j(s1.mondays));
  ok("6.due · on Friday 20 Nov the due report is week 2 (9–15 Nov), and the next is Monday 23 Nov",
    s1.due.kind === "week" && s1.due.k === 2 && s1.due.fromDay === "2026-11-09" && s1.due.toDay === "2026-11-15" && s1.next?.kind === "week" && (s1.next as { monday: string }).monday === "2026-11-23", j(s1));
  const sSun = impl.agencySchedule("2026-11-08", eat(2026, 11, 9, 9));
  ok("6.sunday-launch · a launch on a Sunday leaves its own week empty: the first report is the Monday after the next",
    sSun.mondays[0] === "2026-11-16" && sSun.due.kind === "baseline", j(sSun));
  const sSat = impl.agencySchedule("2026-11-07", eat(2026, 11, 9, 9));
  ok("6.short-week · a launch on a Saturday makes a one-day launch week (the Sunday), due the next day", sSat.mondays[0] === "2026-11-09" && sSat.due.kind === "week");
  const sMonth = impl.agencySchedule("2026-11-02", eat(2027, 1, 4, 9));
  ok("6.monthly · after the eighth Monday (28 Dec) the previous calendar month is due on the first Monday after it ends (December on Mon 4 Jan)",
    sMonth.due.kind === "month" && (sMonth.due as { month: string }).month === "2026-12" && (sMonth.due as { dueDay: string }).dueDay === "2027-01-04", j(sMonth.due));
  const sEnd = impl.agencySchedule("2026-11-02", eat(2026, 12, 28, 9));
  ok("6.handover · on the eighth Monday week 8 is due and the next is December's month report", sEnd.due.kind === "week" && (sEnd.due as { k: number }).k === 8 && sEnd.next?.kind === "month", j(sEnd));
  ok("6.text · the due report as one line", impl.dueText({ kind: "week", k: 2, of: 8, monday: "2026-11-16", fromDay: "2026-11-09", toDay: "2026-11-15" }) === "Week 2 of 8 — 9–15 Nov 2026"
    && impl.dueText({ kind: "month", month: "2026-12", dueDay: "2027-01-04" }) === "Month — December 2026" && impl.dueText({ kind: "baseline" }) === "Baseline — before launch");
  const wkSkip = impl.weekWindow(recRb, "2026-11-09", RET);
  ok("6.week-skip · a week report never counts a skipped day", !wkSkip.days.includes("2026-11-05") && !wkSkip.days.includes("2026-11-02"));

  /* §7 · the matching */
  const t0 = eat(2026, 11, 10, 12);
  const deps: M.DepositRowLite[] = [
    { id: "d1", userId: "u1", at: t0, savedBet: { marketId: "mkt_a", side: "YES", stake: 1000 } },
    { id: "d2", userId: "u1", at: t0 + 5 * 60_000, savedBet: { marketId: "mkt_a", side: "YES", stake: 1000 } },
    { id: "d3", userId: "u2", at: t0, savedBet: { marketId: "mkt_b", side: "NO", stake: 500 } },
    { id: "d4", userId: "u3", at: t0, savedBet: { marketId: "mkt_c", side: "YES", stake: 500 } },
    { id: "d5", userId: "u4", at: t0, savedBet: null },
  ];
  const bets: M.BetRowLite[] = [
    { id: "p1", userId: "u1", marketId: "mkt_a", side: "YES", stake: 1000, placedAt: t0 + 10 * 60_000 },
    { id: "p2", userId: "u2", marketId: "mkt_b", side: "NO", stake: 700, placedAt: t0 + 60_000 },
    { id: "p3", userId: "u3", marketId: "mkt_c", side: "YES", stake: 500, placedAt: t0 + 30 * 60_000 },
    { id: "p4", userId: "u4", marketId: "mkt_d", side: "YES", stake: 500, placedAt: t0 + 60_000 },
  ];
  const matched = impl.matchReturnedBets(deps, bets);
  ok("7.one-to-one · two deposits before one returned bet: only the latest is matched; another stake matches nothing; 30 minutes is inclusive",
    j([...matched].sort()) === j(["d2", "d4"]), j([...matched]));
  const late = impl.matchReturnedBets([deps[3]], [{ ...bets[2], placedAt: t0 + 30 * 60_000 + 1 }]);
  ok("7.window · 30 minutes plus 1 ms is outside", late.size === 0);
  const byUser = new Map([["u1", [t0 + 30 * 60_000]], ["u2", [t0 - 1]], ["u3", [t0 + 30 * 60_000 + 1]]]);
  ok("7.follow-up · any bet in [deposit, deposit + 30 min] counts; one before the deposit, or after the window, does not",
    impl.followedWithin({ userId: "u1", at: t0 }, byUser) && !impl.followedWithin({ userId: "u2", at: t0 }, byUser) && !impl.followedWithin({ userId: "u3", at: t0 }, byUser)
      && !impl.followedWithin({ userId: "u9", at: t0 }, byUser));
  ok("7.median · the median of an odd and an even list, and of none", impl.median([5, 1, 3]) === 3 && impl.median([4, 1, 3, 2]) === 2.5 && impl.median([]) === null);
  ok("7.span · the instant span of a set of EAT days is half-open from the first day's 00:00 EAT",
    j(impl.spanOf(["2026-11-04", "2026-11-03"])) === j({ fromMs: eatDayStartMs("2026-11-03"), toMs: eatDayStartMs("2026-11-05") }));
  return failed;
}

if (!PROVE_RED) {
  console.log("journey-measures-core — the S13 pure core");
  const failed = await run(M, (l) => console.log(l));
  console.log(`\nJOURNEY MEASURES CORE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  type Plant = { name: string; expect: RegExp; impl: Mod };
  const W = (f: (o: Parameters<Mod["measureWindows"]>[0]) => M.MeasureWindows): Mod => ({ ...M, measureWindows: f });
  const plants: Plant[] = [
    { name: "a window that includes today", expect: /^2\.today /,
      impl: W((o) => { const r = M.measureWindows(o); return { ...r, before: { ...r.before, days: [...r.before.days.slice(1), r.today] } }; }) },
    { name: "the launch day counted after", expect: /^2\.launch-day /,
      impl: W((o) => { const r = M.measureWindows(o); if (!r.launchDay) return r; const a7 = r.after[7]; return { ...r, after: { ...r.after, 7: { ...a7, days: [r.launchDay, ...a7.days.slice(0, 6)] } } }; }) },
    { name: "the UTC day taken for the EAT day", expect: /^2\.eat-day /,
      impl: { ...M, launchDayOf: (l) => (l && l.firstActiveAt !== null ? new Date(l.firstActiveAt).toISOString().slice(0, 10) : null) } },
    { name: "a partial window left unmarked", expect: /^3\.partial /,
      impl: { ...M, cellFor: (n, d, c) => ({ ...M.cellFor(n, d, c), partial: null }) } },
    { name: "a share printed above 100%", expect: /^3\.held /,
      impl: { ...M, cellFor: (n, d, c) => { const r = M.cellFor(n, d, c); return r.status === "held" && n !== null && d !== null ? { ...r, status: "figure", held: false, tenths: Math.round((n * 1000) / d), text: M.percentText(Math.round((n * 1000) / d)), note: null } : r; } } },
    { name: "a campaign split claimed for measure 3", expect: /^(1\.split|3\.not-split) /,
      impl: { ...M, MEASURES: M.MEASURES.map((m) => (m.key === "shortToDeposit" ? { ...m, campaignSplit: true } : m)) } },
    { name: "'no offer' replaced by 0%", expect: /^3\.no-offer /,
      impl: { ...M, cellFor: (n, d, c) => (c.side === "before" && c.measure.before === "no-offer" ? { ...M.cellFor(0, d ?? 0, { ...c, measure: { ...c.measure, before: "figure" } }) } : M.cellFor(n, d, c)) } },
    { name: "a week report on a skipped day", expect: /^(2\.week|6\.week-skip) /,
      impl: { ...M, weekWindow: (l, mon, r) => { const w = M.weekWindow(l, mon, r); return { ...w, days: [...w.days, ...w.skipped.map((s) => s.day)].sort(), skipped: [] }; } } },
    { name: "the decimal dropped (whole numbers)", expect: /^4\.text /,
      impl: { ...M, percentText: (t) => `${Math.round(t / 10)}%` } },
    { name: "two decimals printed", expect: /^4\.text /,
      impl: { ...M, percentText: (t) => `${(t / 10).toFixed(2)}%` } },
    { name: "the numeric cell carries a value that prints differently from the screen", expect: /^4\.renderers /,
      impl: { ...M, shareFraction: (t) => t / 1000 + 0.0006 } },
    { name: "a safety baseline mean rounded to a whole event", expect: /^4\.daily-mean /,
      impl: { ...M, dailyMeanText: (n) => n === null ? "Could not be read" : M.countText(n) } },
    { name: "an unreadable source printed as 0%", expect: /^3\.unreadable /,
      impl: { ...M, cellFor: (n, d, c) => (c.readable ? M.cellFor(n, d, c) : { ...M.cellFor(0, Math.max(1, d ?? 1), { ...c, readable: true }) }) } },
    { name: "S9's absent records printed as a counted 0", expect: /^3\.unavailable /,
      impl: { ...M, cellFor: (n, d, c) => M.cellFor(n, d, { ...c, s9: true }) } },
    { name: "a rollback day counted in an after window", expect: /^2\.rollback /,
      impl: { ...M, dayStanding: () => "active", measureWindows: (o) => {
        const r = M.measureWindows(o);
        if (!o.launch || !r.launchDay) return r;
        const days = M.dayRange(M.addDays(r.launchDay, 1), M.addDays(r.today, -1)).slice(0, 7);
        return { ...r, after: { ...r.after, 7: { ...r.after[7], days, skipped: [] } } };
      } } },
    { name: "an unknown day assumed ACTIVE", expect: /^2\.unknown /,
      impl: W((o) => M.measureWindows(o.launch ? { ...o, launch: { ...o.launch, gap: null } } : o)) },
    { name: "the change computed from the exact shares, not the printed ones", expect: /^5\.printed /,
      impl: { ...M, changeOf: (b, a) => {
        if (b.status !== "figure" || a.status !== "figure" || b.n === null || b.d === null || a.n === null || a.d === null) return null;
        const diff = Math.round(((a.n / a.d) - (b.n / b.d)) * 1000);
        return { tenths: diff, text: `${diff > 0 ? "+" : diff < 0 ? String.fromCharCode(0x2212) : ""}${(Math.abs(diff) / 10).toFixed(1)} pts` };
      } } },
    { name: "a fall written with a hyphen", expect: /^5\.fall /,
      impl: { ...M, changeOf: (b, a) => { const r = M.changeOf(b, a); return r ? { ...r, text: r.text.replace(String.fromCharCode(0x2212), "-") } : r; } } },
    { name: "the first Monday taken as the Monday of the launch week", expect: /^6\.(mondays|sunday-launch|due) /,
      impl: { ...M, agencySchedule: (l, now) => (l ? M.agencySchedule(M.addDays(l, -7), now) : M.agencySchedule(l, now)) } },
    { name: "monthly reports never start (weekly for ever)", expect: /^6\.monthly /,
      impl: { ...M, agencySchedule: (l, now) => { const r = M.agencySchedule(l, now); return r.due.kind === "month" ? { ...r, due: { kind: "week", k: 8, of: 8, monday: r.mondays[7], fromDay: M.addDays(r.mondays[7], -7), toDay: M.addDays(r.mondays[7], -1) } } : r; } } },
    { name: "every deposit before a returned bet matched (not one-to-one)", expect: /^7\.one-to-one /,
      impl: { ...M, matchReturnedBets: (deps, bets) => { const s = new Set<string>(); for (const b of bets) for (const d of deps) if (d.userId === b.userId && d.savedBet && d.savedBet.marketId === b.marketId && d.savedBet.side === b.side && d.savedBet.stake === b.stake && d.at <= b.placedAt && b.placedAt - d.at <= M.DEPOSIT_FOLLOW_UP_MS) s.add(d.id); return s; } } },
    { name: "the 30 minutes made exclusive", expect: /^(7\.one-to-one|7\.follow-up) /,
      impl: { ...M, followedWithin: (dep, by) => (by.get(dep.userId) ?? []).some((t) => t >= dep.at && t < dep.at + M.DEPOSIT_FOLLOW_UP_MS),
        matchReturnedBets: (deps, bets) => M.matchReturnedBets(deps, bets.map((b) => ({ ...b, placedAt: b.placedAt + 1 }))) } },
    { name: "the follow-up window set to 60 minutes", expect: /^1\.follow-up /, impl: { ...M, DEPOSIT_FOLLOW_UP_MS: 60 * 60_000 } },
    { name: "a house word in the definitions", expect: /^1\.house /,
      impl: { ...M, definitionNotes: () => [...M.definitionNotes(), "Liquidity added by the platform is excluded."] } },
    { name: "a definition naming the person who approved it", expect: /^1\.no-person /,
      impl: { ...M, definitionNotes: () => [...M.definitionNotes(), "These rules were approved by Ali."] } },
    { name: "the words claim one home open per view before WP4 ships", expect: /^1\.wp4-honest /,
      impl: { ...M, MEASURES: M.MEASURES.map((m) => (m.key === "homeToSheet" ? { ...m, notes: m.notes.filter((n) => !/several bet sheets/.test(n)) } : m)) } },
    { name: "Up & Down quick bets counted as sheet bets", expect: /^1\.sheet-bets /,
      impl: { ...M, MEASURES: M.MEASURES.map((m) => (m.key === "sheetToBet" ? { ...m, numerator: { ...m.numerator, half: { source: "counter" as const, step: "bet" as const, origins: { old: ["dial", "quick"], new: ["sheet", "deposit_return", "quick"] } } } } : m)) } },
    { name: "a small sample left unmarked", expect: /^3\.small /, impl: { ...M, cellFor: (n, d, c) => ({ ...M.cellFor(n, d, c), small: false }) } },
    { name: "the baseline not clipped to the first counted day", expect: /^2\.clip /,
      impl: W((o) => { const r = M.measureWindows(o); return { ...r, before: { ...r.before, days: [...r.before.skipped.map((s) => s.day), ...r.before.days], skipped: [] } }; }) },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(M, () => {});
  say("the REAL core passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl, () => {});
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
