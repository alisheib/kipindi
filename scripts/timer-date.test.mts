/**
 * THE DATE BESIDE EVERY TIMER — Jay (Gaming Board) item #6.
 *
 * A countdown states a REMAINDER ("170 DAYS"). Item #6 says it must also state the
 * INSTANT, so the player does not do the arithmetic. Two things can go wrong, and
 * only one of them is obvious:
 *
 *  1. the date is missing, or is not the instant the clock counts to;
 *  2. the date is AMBIGUOUS. ⚠️ MEASURED ON PRODUCTION 2026-08-25: **3 of 49 LIVE
 *     markets resolve in 2027**, the furthest 170 days out. A bare "10 Feb" beside a
 *     three-digit DAYS cell is the arithmetic item #6 exists to remove. So the year
 *     appears exactly when the deadline leaves the reader's own year.
 *
 * ⛔ WHY THE RULE IS A PURE EXPORTED FUNCTION. `SESSION-PROMPT-CLOSE-THE-BOARD.md`
 * §1b: a decision that lives inside a render is a decision nothing can drive. The
 * year choice is `formatDeadline` in `src/lib/utils.ts`, and §2 below drives it.
 *
 * ⛔ AND WHY §3 EXISTS ANYWAY. §2 can be perfect while the market page renders no
 * date at all, or names the WRONG instant beside a clock. §3 reads the call sites and
 * asserts each `<Countdown>`'s `at=` is built from the SAME expression as its `to=` —
 * rule 5b, assert the call site, not the symbol.
 *
 * Run: npm run test:timer-date
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { formatDeadline, formatDayTime, formatDateTime, PLATFORM_TZ_GET } = await import("../src/lib/utils.ts");

const TZ = PLATFORM_TZ_GET();
const yearOf = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: TZ }).format(new Date(iso));

// -- 1 - The premise, stated rather than assumed ------------------------------
ok("1: the platform zone resolves to a real IANA zone", /^[A-Za-z]+\/[A-Za-z_]+$|^UTC$/.test(TZ), TZ);

// -- 2 - THE RULE: the year appears iff the deadline leaves the reader's year --
{
  const READER = Date.parse("2026-08-25T12:00:00.000Z");   // EAT 15:00, same day
  const readerIso = new Date(READER).toISOString();
  const sameYear = "2026-10-28T20:59:59.000Z";
  const nextYear = "2027-02-10T20:59:59.000Z";             // the shape of mkt_0d271bde3ae784abe12b

  ok("2: reader and the near deadline really are the same platform year",
     yearOf(readerIso) === yearOf(sameYear), `${yearOf(readerIso)} vs ${yearOf(sameYear)}`);
  ok("2: and the far one really is a DIFFERENT platform year",
     yearOf(readerIso) !== yearOf(nextYear), `${yearOf(readerIso)} vs ${yearOf(nextYear)}`);

  const near = formatDeadline(sameYear, READER);
  const far = formatDeadline(nextYear, READER);

  ok("2: a same-year deadline carries NO year", !/\b20\d\d\b/.test(near), near);
  ok("2: a cross-year deadline DOES carry its year", /\b2027\b/.test(far), far);

  // ⛔ THE CONTROL THAT MAKES THE TWO ABOVE MEAN SOMETHING. If `formatDeadline`
  // ignored `now` and always took one branch, one of them would fail — but only if
  // the two branches genuinely differ. Prove that they do.
  ok("2: the two branches are not the same string", near !== far, `${near} / ${far}`);

  // ⛔ NO THIRD FORMAT. Each branch must BE a formatter that already existed.
  ok("2: the same-year branch IS formatDayTime", near === formatDayTime(sameYear), `${near} vs ${formatDayTime(sameYear)}`);
  ok("2: the cross-year branch IS formatDateTime", far === formatDateTime(nextYear), `${far} vs ${formatDateTime(nextYear)}`);

  // The cross-year string is the same-year string PLUS a year — nothing else moved.
  ok("2: the cross-year string differs from the same-year one by the year alone",
     far.replace(/ 20\d\d,/, ",") === formatDayTime(nextYear), far.replace(/ 20\d\d,/, ","));
}

// -- 2b - The boundary a naive getFullYear() gets wrong ------------------------
// 2026-12-31 21:30 UTC is 2027-01-01 00:30 in EAT. On a UTC host the host clock says
// 2026; the platform clock says 2027. This is the one moment the zone decides the
// answer, so it is the one that must actually be driven.
{
  const eveUtc = "2026-12-31T21:30:00.000Z";
  const readerUtc = Date.parse("2026-12-31T20:00:00.000Z");  // EAT 23:00, still 2026
  if (TZ === "UTC") {
    console.log("SKIP 2b: platform zone is UTC, so there is no zone-vs-host divergence to see");
  } else {
    ok("2b: the platform clock has already turned the year at this instant",
       yearOf(eveUtc) !== yearOf(new Date(readerUtc).toISOString()),
       `${yearOf(new Date(readerUtc).toISOString())} -> ${yearOf(eveUtc)}`);
    ok("2b: so the deadline carries its year, though UTC still reads 2026",
       /\b2027\b/.test(formatDeadline(eveUtc, readerUtc)), formatDeadline(eveUtc, readerUtc));
    ok("2b: and a host-clock read would have got it wrong",
       new Date(eveUtc).getUTCFullYear() === 2026);
  }
}

// -- 3 - THE CALL SITES: a date naming a different instant is worse than none ---
{
  const read = (p: string) => decomment(readFileSync(new URL(p, import.meta.url), "utf8"));

  const countdown = read("../src/components/markets/countdown.tsx");
  ok("3: Countdown accepts the absolute date as a prop", /\bat\??\s*:\s*string/.test(countdown));
  ok("3: and renders it", /\{at\}/.test(countdown));
  // ⛔ It must NOT format for itself: it is a client component and the platform zone
  // is a server fact. A local toLocaleString here IS the three-hour-slip defect.
  ok("3: Countdown derives no format of its own",
     !/toLocale(Date|Time)?String|toISOString\(\)\s*\.slice/.test(countdown));

  const market = read("../src/app/markets/[id]/page.tsx");
  const sites = [...market.matchAll(/<Countdown\b([^>]*)>/g)].map((m) => m[1]);
  ok("3: the market page renders exactly the two timers item #6 names", sites.length === 2, `found ${sites.length}`);

  for (const attrs of sites) {
    const to = attrs.match(/\bto=\{([^}]+)\}/)?.[1]?.trim();
    const at = attrs.match(/\bat=\{([^}]+)\}/)?.[1]?.trim();
    ok(`3: timer to={${to}} passes an absolute date`, !!at, at ?? "MISSING");
    // ⭐ THE ASSERTION WITH TEETH: the date must be built from the SAME expression the
    // clock counts to. A date naming a different instant is a confident wrong deadline
    // on a money page, and it reads as correct.
    ok("3: ...and it names the SAME instant the clock counts to",
       at === `formatDeadline(${to})`, `at=${at} to=${to}`);
  }

  // ⛔ ONE HOME PER FACT. Nothing may show a deadline through the raw same-year
  // formatter any more, or the product carries two answers to one question.
  for (const [file, src] of [
    ["markets/[id]/page.tsx", market],
    ["positions/page.tsx", read("../src/app/positions/page.tsx")],
  ] as const) {
    ok(`3: ${file} routes every deadline through formatDeadline`, !/\bformatDayTime\(/.test(src));
  }

  const utils = read("../src/lib/utils.ts");
  // ⚠️ `\bformatDayTime\(` also matches its own `export function` line, so count CALL
  // sites only — the first draft of this assertion asserted 1 against a true 2 and went
  // red on correct code. A count is only as good as the population it counts.
  const dayTimeCalls = (utils.match(/(?<!function )\bformatDayTime\(/g) ?? []).length;
  ok("3: formatDayTime survives only as formatDeadline's same-year branch — not an orphan",
     dayTimeCalls === 1, String(dayTimeCalls));
  // ⛔ The zone must not be hardcoded: an admin changing the platform timezone would
  // otherwise move every displayed time while the YEAR test silently stayed on EAT.
  const rule = utils.slice(utils.indexOf("function sameZonedYear"));
  ok("3: the year test reads the platform zone, never a literal",
     /timeZone:\s*tz\(\)/.test(rule) && !/Africa\/Dar_es_Salaam/.test(rule));
}

console.log(`\ntimer-date: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
