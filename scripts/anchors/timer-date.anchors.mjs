/**
 * THE ANCHORS `red:timer-date` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Jay (Gaming Board) item #6 — every timer names its absolute instant, as of 2026-08-25.
 * Each mutation restores one way that can silently regress.
 *
 * ⭐ THE SECOND IS THE ONE TO READ. `wrong-instant` leaves a date beside the clock — it
 * is present, it is formatted correctly, it is in the right zone — and it names the
 * OTHER deadline. That renders a confident wrong date on a money page and looks
 * completely right, which is why §3 compares the `at=` expression against the `to=`
 * expression rather than merely asserting a date is there.
 *
 * ⭐ AND THE FIFTH IS THE POSITIVE CONTROL. §3's per-timer loop passes VACUOUSLY over an
 * empty match set, so a component rename would leave the gate sweeping nothing and
 * reporting green. `control-no-timers` renames the pattern the gate scans for and the
 * gate must fail on the COUNT assertion — the same blindness `red:time-left` case 5
 * exists for.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF and these declarations are LF, so a
 * multi-line anchor cannot match and the replace becomes a silent no-op — which reads
 * as "the guard failed to catch the defect" rather than "the harness never ran".
 * ⚠️ And no replacement may CONTAIN its own anchor, or the did-it-reach-disk check
 * refuses a mutation that applied correctly (`red:payout-alloc` paid for that one).
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const UTILS = "src/lib/utils.ts";
const PAGE = "src/app/markets/[id]/page.tsx";
const CLOCK = "src/components/markets/countdown.tsx";
const GATE = "scripts/timer-date.test.mts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "no-date",
    why: "⭐ THE PRE-2026-08-25 STATE, verbatim: the resolve timer counts down and never names the day it counts to, which is Jay item #6 in full",
    file: PAGE,
    suite: "timer-date",
    from: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatDeadline(m.resolutionAt)} />`,
    to: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} />`,
    expect: "3: timer to={m.resolutionAt} passes an absolute date",
  },
  {
    name: "wrong-instant",
    why: "⛔ the date beside the RESULTS clock names the SELECTION deadline instead — present, correctly formatted, correctly zoned, and about a different moment. A player reads a confident wrong date and nothing looks broken",
    file: PAGE,
    suite: "timer-date",
    from: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatDeadline(m.resolutionAt)} />`,
    to: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatDeadline(m.selectionClosedAt)} />`,
    expect: "3: ...and it names the SAME instant the clock counts to",
  },
  {
    name: "year-blind",
    why: "⚠️ THE DEFECT THE OBVIOUS FIX WOULD HAVE SHIPPED: the date always omits the year, so the 3 LIVE markets measured resolving in 2027 show a bare '10 Feb' beside a 170-DAYS cell — the arithmetic item #6 exists to remove",
    file: UTILS,
    suite: "timer-date",
    from: `  return sameZonedYear(iso, now) ? formatDayTime(iso) : formatDateTime(iso);`,
    to: `  return formatDayTime(iso);`,
    expect: "2: a cross-year deadline DOES carry its year",
  },
  {
    name: "host-clock-year",
    why: "the year is read off the host clock rather than the platform clock, so on New Year's Eve in EAT — 21:30 UTC, already 1 Jan in Dar — a deadline hours into the new year prints with no year at all",
    file: UTILS,
    suite: "timer-date",
    from: `    new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: tz() }).format(d);`,
    to: `    String(d.getUTCFullYear());`,
    expect: "2b: so the deadline carries its year, though UTC still reads 2026",
  },
  {
    name: "control-no-timers",
    why: "⭐ POSITIVE CONTROL — the gate's per-timer loop is emptied. Every per-timer assertion then passes vacuously, and only the COUNT assertion stands between that and a green report over a page with no dates on it at all",
    file: GATE,
    suite: "timer-date",
    from: `  const sites = [...market.matchAll(/<Countdown\\b([^>]*)>/g)].map((m) => m[1]);`,
    to: `  const sites = [...market.matchAll(/<CountdownRenamedAway\\b([^>]*)>/g)].map((m) => m[1]);`,
    expect: "3: the market page renders exactly the two timers item #6 names",
  },
  {
    name: "hardcoded-zone",
    why: "the year test pins EAT as a literal, so an operator changing the platform timezone at /admin/config moves every displayed time while the year decision silently stays on the old zone",
    file: UTILS,
    suite: "timer-date",
    from: `    new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: tz() }).format(d);`,
    to: `    new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Africa/Dar_es_Salaam" }).format(d);`,
    expect: "3: the year test reads the platform zone, never a literal",
  },
  {
    name: "clock-formats-its-own",
    why: "⛔ the client clock formats a date for itself. It has no platform zone to read, so it renders in whatever zone the DEVICE is on — the three-hour-slip defect `test:zoned-time` was built for, arriving through a different door",
    file: CLOCK,
    suite: "timer-date",
    from: `  const resolvedLabel = label ?? t.common.closesIn;`,
    to: `  const resolvedLabel = (label ?? t.common.closesIn).trim(); void new Date(to).toLocaleDateString();`,
    expect: "3: Countdown derives no format of its own",
  },
];
