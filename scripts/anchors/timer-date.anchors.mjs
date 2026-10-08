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
 * ⭐ §L4 (2026-10-08) — every date §3 names is the reader's: `formatEatDateTime` with
 * `t.common.monthsShort, locale`, never the English `formatDeadline`. `english-call-back`
 * is the defect the gate's fence was built for (an English helper back in a converted
 * file); `english-alias-back` brings it back under another name, which a grep for a call
 * never sees; `month-words-dropped` keeps the right function and throws the reader's
 * words away; `client-reads-device-clock` is the hydration hazard; and
 * `fence-control-formatted-elsewhere` is the fence's positive control.
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
/** S6 WP9 — the journey's ticket card, which states two instants for a preview reader (WP10: and the free-sell time). */
const JOURNEY_CARD = "src/components/journey/tickets/ticket-card.tsx";
/** S6 WP10 — the Sell button, whose journey look names the free-sell instant beside its countdown. */
const SELL_BUTTON = "src/components/markets/sell-button.tsx";
/** §L4 (2026-10-08) — converted player files the fence holds to the localized date helper. */
const RESOLUTION_PANEL = "src/components/markets/resolution-panel.tsx";
const POSITIONS = "src/app/positions/page.tsx";
const POSITION_CARD = "src/components/markets/position-card.tsx";
const SESSIONS = "src/app/profile/sessions/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "no-date",
    why: "⭐ THE PRE-2026-08-25 STATE, verbatim: the resolve timer counts down and never names the day it counts to, which is Jay item #6 in full",
    file: PAGE,
    suite: "timer-date",
    from: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatEatDateTime(Date.parse(m.resolutionAt), Date.now(), t.common.monthsShort, locale)} />`,
    to: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} />`,
    expect: "3: timer to={m.resolutionAt} passes an absolute date",
  },
  {
    name: "wrong-instant",
    why: "⛔ the date beside the RESULTS clock names the SELECTION deadline instead — present, correctly formatted, correctly zoned, and about a different moment. A player reads a confident wrong date and nothing looks broken",
    file: PAGE,
    suite: "timer-date",
    from: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatEatDateTime(Date.parse(m.resolutionAt), Date.now(), t.common.monthsShort, locale)} />`,
    to: `              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} at={formatEatDateTime(Date.parse(m.selectionClosedAt), Date.now(), t.common.monthsShort, locale)} />`,
    expect: "3: ...and it names the SAME instant the clock counts to",
  },
  {
    name: "year-blind",
    why: "⚠️ THE DEFECT THE OBVIOUS FIX WOULD HAVE SHIPPED: the date always omits the year, so the 7 LIVE markets measured resolving in a later platform-clock year show a bare '10 Feb' beside a 170-DAYS cell — the arithmetic item #6 exists to remove",
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
  {
    name: "journey-card-names-another-instant",
    why: "⭐ S6 WP9 · the journey ticket's close line formats the RESOLUTION while its <time> claims the selection cutoff — present, formatted, zoned, and about a different moment, the wrong-instant case on a preview reader's ticket",
    file: JOURNEY_CARD,
    suite: "timer-date",
    from: `<time dateTime={cutoffIso} className="whitespace-nowrap tabular-nums">{formatEatDateTime(Date.parse(cutoffIso), serverNow, t.common.monthsShort, locale)}</time>`,
    to: `<time dateTime={cutoffIso} className="whitespace-nowrap tabular-nums">{formatEatDateTime(Date.parse(m.resolutionAt), serverNow, t.common.monthsShort, locale)}</time>`,
    expect: "3: ...its <time dateTime={cutoffIso}> names the SAME instant it formats",
  },
  {
    name: "journey-card-year-blind",
    why: "S6 WP9 · the journey ticket's placement date goes back through the raw same-year English formatter: a ticket placed last year reads as this year's, and a Swahili reader reads 'Imewekwa 8 Oct' again (§L4)",
    file: JOURNEY_CARD,
    suite: "timer-date",
    from: `{formatEatDateTime(Date.parse(p.placedAt), serverNow, t.common.monthsShort, locale)}`,
    to: `{formatDayTime(p.placedAt)}`,
    expect: "3: fence · components/journey/tickets/ticket-card.tsx uses no English date helper",
  },
  {
    name: "english-call-back",
    why: "⭐ §L4 · THE DEFECT THIS FENCE WAS BUILT FOR: a converted player file prints a date through `formatDateTime` again — an 'en-GB' formatter, so the resolution panel tells a Swahili or Chinese reader 'Oct' in English. The panel's other two dates stay localized, so only the fence's no-English half can catch it",
    file: RESOLUTION_PANEL,
    suite: "timer-date",
    from: `{formatEatDateTime(Date.parse(resolvedAt), serverNow, t.common.monthsShort, locale)}`,
    to: `{formatDateTime(resolvedAt)}`,
    expect: "3: fence · components/markets/resolution-panel.tsx uses no English date helper",
  },
  {
    name: "english-alias-back",
    why: "§L4 · the English helper comes back under another name — the shape the market page shipped (`const fmtTime = formatDateTime`). A grep for a CALL of `formatDateTime(` never sees `fmtTime(…)`, so the fence reads every use of the name: an import alias here",
    file: PAGE,
    suite: "timer-date",
    from: `import { formatTzsCompact, formatTzs, fill } from "@/lib/utils";`,
    to: `import { formatTzsCompact, formatTzs, fill, formatDateTime as fmtTime } from "@/lib/utils";`,
    expect: "3: fence · app/markets/[id]/page.tsx uses no English date helper",
  },
  {
    name: "month-words-dropped",
    why: "§L4 · the localized helper is called with ENGLISH month words — the right function, the reader's language thrown away — so /positions' close line reads 'Oct' in every locale while every helper name looks correct",
    file: POSITIONS,
    suite: "timer-date",
    from: `formatEatDateTime(Date.parse(cutoffIso), serverNow, t.common.monthsShort, locale)`,
    to: `formatEatDateTime(Date.parse(cutoffIso), serverNow, dict.en.common.monthsShort, "en")`,
    expect: "3: positions/page.tsx dates every deadline through formatEatDateTime/formatEatDate, in the reader's month words",
  },
  {
    name: "client-reads-device-clock",
    why: "⛔ §L4 · a client card reads the year rule off the DEVICE clock. The server rendered with its own instant and the browser hydrates with another, so across a New Year the first render disagrees with the server's — a hydration error on /positions — and a phone with a wrong clock prints a wrong year",
    file: POSITION_CARD,
    suite: "timer-date",
    from: `formatEatDateTime(Date.parse(placedAt), serverNow, t.common.monthsShort, locale)`,
    to: `formatEatDateTime(Date.parse(placedAt), Date.now(), t.common.monthsShort, locale)`,
    expect: "3: fence · components/markets/position-card.tsx is a client file: its year rule reads the server's instant, never Date.now()",
  },
  {
    name: "fence-control-formatted-elsewhere",
    why: "⭐ POSITIVE CONTROL for the fence's second half: a converted page formats its date some other way — no English helper, so the first half stays green — and only 'still dates through the localized helper' stands between that and an English, UTC date on /profile/sessions",
    file: SESSIONS,
    suite: "timer-date",
    from: `const expires = formatEatDateTime(session.exp, Date.now(), t.common.monthsShort, locale);`,
    to: `const expires = new Date(session.exp).toUTCString();`,
    expect: "3: fence · app/profile/sessions/page.tsx dates through formatEatDateTime/formatEatDate, in the reader's month words",
  },
  {
    name: "journey-sell-label-names-another-instant",
    why: "⭐ S6 WP10 · the journey ticket's 'Uza bila ada hadi {time}' names the selection cutoff while the countdown beside it runs to the free window's end — a confident wrong time on the one line that says until when a sale is free",
    file: JOURNEY_CARD,
    suite: "timer-date",
    from: `freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}`,
    to: `freeUntilLabel={formatClock(cutoffIso)}`,
    expect: "3: the journey ticket card hands the Sell button the clock time of THE instant it counts to — formatClock of the one binding, on the server",
  },
  {
    name: "journey-sell-time-names-another-instant",
    why: "S6 WP10 · the Sell button's <time> claims the selection cutoff while its words are the free window's end: a driver reading dateTime is told a different moment from the one shown",
    file: SELL_BUTTON,
    suite: "timer-date",
    from: `<time dateTime={freeUntil ?? undefined}`,
    to: `<time dateTime={closesAt}`,
    expect: "3: ...and the button's journey line puts that reading in a <time> naming the same instant, beside its countdown",
  },
  {
    name: "journey-sell-formats-its-own-time",
    why: "⛔ S6 WP10 · the Sell button formats the free window's end for itself, in the browser. It has no platform zone, so a phone set to another zone shows another time — the three-hour slip, on the line that says until when a sale is free",
    file: SELL_BUTTON,
    suite: "timer-date",
    from: `{freeUntilLabel}</time>`,
    to: `{freeUntil ? new Date(freeUntil).toLocaleTimeString() : null}</time>`,
    expect: "3: the Sell button formats no time of its own — no locale formatter, no date helper, no Intl",
  },
];
