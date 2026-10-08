/**
 * THE DATE BESIDE EVERY TIMER — Jay (Gaming Board) item #6.
 *
 * A countdown states a REMAINDER ("170 DAYS"). Item #6 says it must also state the
 * INSTANT, so the player does not do the arithmetic. Two things can go wrong, and
 * only one of them is obvious:
 *
 *  1. the date is missing, or is not the instant the clock counts to;
 *  2. the date is AMBIGUOUS. ⚠️ MEASURED ON PRODUCTION 2026-08-25: **7 of 51 LIVE
 *     markets resolve in a later year on the platform clock**, the furthest 170 days
 *     out. A bare "10 Feb" beside a three-digit DAYS cell is the arithmetic item #6
 *     exists to remove. So the year appears exactly when the deadline leaves the
 *     reader's own year. ⚠️ The first census said 3 of 49 and undercounted the four
 *     markets ON the boundary — see the note on `formatDeadline`; the census had made
 *     the very zone error the function prevents.
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
 * ⭐ §L4 (2026-10-08) — AND THE DATE IS IN THE READER'S WORDS. `formatDeadline` is an
 * "en-GB" formatter, so a Swahili ticket read "Imewekwa 8 Oct, 15:18" and a Chinese one
 * "下注于 8 Oct, 15:18". Every player surface that printed a date through it, or through
 * `formatDayTime` / `formatDateTime` / `formatDayShort`, now uses the receipts' helper,
 * `formatEatDateTime` (`formatEatDate` for a day) in `src/lib/eat-day.ts`: the month words
 * of `t.common.monthsShort`, the East Africa clock, and the same year rule — the year
 * appears when the instant leaves the reader's EAT year (Chinese always carries it). §3
 * holds each surface it names to that helper and to the instant each date names, and
 * fences every converted file against the English helpers coming back. `formatDeadline`
 * itself stays, for the admin console (English by design), so §1/§2 still drive it.
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
  // ⭐ AND RENDERS IT AS A <time> CARRYING THE INSTANT THE CLOCK COUNTS TO. Without
  // `dateTime={to}` a live driver can only assert "a date is present"; with it, the
  // driver can assert the date names the RIGHT deadline — which is the one thing a
  // human reading the page cannot check.
  ok("3: the date is a <time> whose dateTime is the countdown's own target",
     /<time[^>]*\bdateTime=\{to\}/.test(countdown));
  ok("3: and it is addressable by a live driver", /data-testid="timer-date"/.test(countdown));
  // ⛔ It must NOT format for itself: it is a client component and the platform zone
  // is a server fact. A local toLocaleString here IS the three-hour-slip defect.
  ok("3: Countdown derives no format of its own",
     !/toLocale(Date|Time)?String|toISOString\(\)\s*\.slice/.test(countdown));

  // ⭐ §L4 · THE READER'S DATE. Every date below goes through `formatEatDateTime` (`formatEatDate` for a day) with the
  // reader's month words and locale as its last two arguments — `t.common.monthsShort, locale` — never an English helper.
  // `eatCalls` lists each call with its arguments as written; it balances (), [] and {}, so `Date.parse(x)` and an
  // inline list are one argument each. Patterns are spelt with character classes, so no escape is typed in them.
  const eatCalls = (src: string) => [...src.matchAll(/(?<![A-Za-z0-9_$.])formatEat(DateTime|Date)[(]/g)].map((m) => {
    const args: string[] = [];
    let depth = 1, start = (m.index ?? 0) + m[0].length, i = start;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") { depth--; if (depth === 0) args.push(src.slice(start, i).trim()); }
      else if (c === "," && depth === 1) { args.push(src.slice(start, i).trim()); start = i + 1; }
    }
    return { fn: `formatEat${m[1]}`, args };
  });
  const inReaderWords = (c: { args: string[] }) => c.args.length === 4 && c.args[2] === "t.common.monthsShort" && c.args[3] === "locale";
  const showCalls = (cs: { fn: string; args: string[] }[]) => cs.map((c) => `${c.fn}(${c.args.join(", ")})`).join(" | ");
  // Any use of an English helper: a call, an import, or an alias (`const fmtTime = formatDateTime` was the market page's).
  // (formatDateTimeSafe, formatDateShort and formatDate joined the list with the second pass, the same afternoon.)
  const ENGLISH_HELPER = /(?<![A-Za-z0-9_$.])(formatDeadline|formatDayTime|formatDateTime|formatDayShort|formatDateTimeSafe|formatDateShort|formatDate)(?![A-Za-z0-9_$])/g;
  const englishIn = (src: string) => [...src.matchAll(ENGLISH_HELPER)].map((m) => m[1]);

  const market = read("../src/app/markets/[id]/page.tsx");
  const sites = [...market.matchAll(/<Countdown\b([^>]*)>/g)].map((m) => m[1]);
  ok("3: the market page renders exactly the two timers item #6 names", sites.length === 2, `found ${sites.length}`);

  // The one shape a timer's date may take: the reader's helper, over the very instant `to=` names, with the reader's words.
  const AT_RULE = /^formatEatDateTime[(]Date[.]parse[(]([^()]+)[)], ([^,()]+(?:[(][)])?), t[.]common[.]monthsShort, locale[)]$/;
  for (const attrs of sites) {
    const to = attrs.match(/\bto=\{([^}]+)\}/)?.[1]?.trim();
    const at = attrs.match(/\bat=\{([^}]+)\}/)?.[1]?.trim();
    ok(`3: timer to={${to}} passes an absolute date`, !!at, at ?? "MISSING");
    const shape = at?.match(AT_RULE);
    ok(`3: ...in the reader's month words, through formatEatDateTime (timer to={${to}})`, !!shape, `at=${at}`);
    // ⭐ THE ASSERTION WITH TEETH: the date must be built from the SAME expression the
    // clock counts to. A date naming a different instant is a confident wrong deadline
    // on a money page, and it reads as correct.
    ok("3: ...and it names the SAME instant the clock counts to",
       !!shape && shape[1].trim() === to, `at=${at} to=${to}`);
  }

  // ⛔ ONE HOME PER FACT, AND IT IS THE READER'S. The three surfaces this section names — the market page, /positions
  // and the journey's ticket card — date every deadline through the localized helper, in the reader's month words, each
  // over a parsed instant; none of them may show one through an English helper (the fence below holds that, file by file).
  for (const [file, src] of [
    ["markets/[id]/page.tsx", market],
    ["positions/page.tsx", read("../src/app/positions/page.tsx")],
    // ⭐ S6 WP9 — the journey's ticket card states the same two instants to a preview reader.
    ["journey ticket-card.tsx", read("../src/components/journey/tickets/ticket-card.tsx")],
  ] as const) {
    const calls = eatCalls(src);
    ok(`3: ${file} dates every deadline through formatEatDateTime/formatEatDate, in the reader's month words`,
      calls.length > 0 && calls.every((c) => inReaderWords(c) && /^Date[.]parse[(][^()]+[)]$/.test(c.args[0])) && englishIn(src).length === 0,
      `${showCalls(calls)}${englishIn(src).length ? ` · English: ${englishIn(src).join(", ")}` : ""}`);
  }

  // ⭐ S6 WP9 · THE JOURNEY'S TICKET CARD STATES TWO INSTANTS — when the ticket was placed and when selection closes —
  // and, like the market page's timers, each date must name the instant it is about: every date on the card is a
  // `formatEatDateTime(Date.parse(X), serverNow, t.common.monthsShort, locale)` inside a `<time dateTime={X}>` naming
  // that very X, asked with the render's own `serverNow` (so the year rule reads the server's clock) and the reader's
  // month words (§L4). ⛔ And the card formats on the server: no directive, and no locale formatter of its own.
  const card = read("../src/components/journey/tickets/ticket-card.tsx");
  const dated = [...card.matchAll(/<time dateTime=[{]([^}]+)[}][^>]*>[{]formatEatDateTime[(]Date[.]parse[(]([^()]+)[)], serverNow, t[.]common[.]monthsShort, locale[)][}]<[/]time>/g)];
  ok("3: the journey ticket card dates both of its instants (placed, selection closes)", dated.length === 2, `found ${dated.length}`);
  for (const m of dated) {
    ok(`3: ...its <time dateTime={${m[1].trim()}}> names the SAME instant it formats`, m[1].trim() === m[2].trim(),
      `dateTime=${m[1]} formats ${m[2]}`);
  }
  ok("3: ...and the card formats no date outside those two", eatCalls(card).length === dated.length && englishIn(card).length === 0,
    `${eatCalls(card).length} localized calls, English: ${englishIn(card).join(", ") || "none"}`);
  ok("3: the journey ticket card formats on the server, never with a locale formatter of its own",
    card.length > 0 && !card.trimStart().startsWith(`"use client"`) && !/toLocale(Date|Time)?String/.test(card));
  ok("3: ...and its close line names the instant its Sell button closes at",
    card.includes("const cutoffIso = m.selectionClosedAt ?? m.resolutionAt;") && card.includes("closesAt={cutoffIso}")
      && card.includes("<time dateTime={cutoffIso}"));

  // ⭐ S6 WP10 · THE JOURNEY'S SELL LINE STATES A THIRD INSTANT, "Uza bila ada hadi {time} · m:ss", and its time must be
  // the instant the countdown runs to. The card binds the server's free-sell instant once, hands it to the Sell button
  // as `freeUntil`, and hands beside it that same binding's clock reading, `formatClock`, made on the server; the
  // button puts the reading in a `<time>` naming `freeUntil`, beside its countdown, and formats no time of its own (a
  // client file has no platform zone). The countdown itself is `test:sell-grace-truth` §3's.
  const sellButton = read("../src/components/markets/sell-button.tsx");
  ok("3: the journey ticket card hands the Sell button the clock time of THE instant it counts to — formatClock of the one binding, on the server",
    card.includes("const freeUntil = freeExitEndsAt({ placedAt: p.placedAt }, m);") && card.includes("freeUntil={freeUntil}")
      && card.includes("freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}") && card.split("formatClock(").length - 1 === 1);
  ok("3: ...and the button's journey line puts that reading in a <time> naming the same instant, beside its countdown",
    sellButton.includes('<time dateTime={freeUntil ?? undefined} className="whitespace-nowrap tabular-nums">{freeUntilLabel}</time>')
      && /<span role="timer"[^>]*>[{]graceLabel[}]<[/]span>/.test(sellButton));
  ok("3: the Sell button formats no time of its own — no locale formatter, no date helper, no Intl",
    sellButton.length > 0 && !/toLocale(Date|Time)?String/.test(sellButton)
      && !/format(Clock|Deadline|DayTime|DateTime|Time|Date|EatDateTime|EatDate|EatDay)[(]/.test(sellButton) && !sellButton.includes("Intl."));

  // ⭐ §L4 · THE FENCE (2026-10-08). These are every player surface — `src/app/**` and `src/components/**` outside the
  // English-only admin console — that printed a date through `formatDeadline`, `formatDayTime`, `formatDateTime` or
  // `formatDayShort`, so a Swahili or Chinese reader got English month names. All of them were converted to the localized
  // helper in one change, and each is held to two things:
  //   · it uses NO English date helper again — no call, no import, and no alias (the market page's `fmtTime` WAS
  //     `formatDateTime` under another name, which a grep for a call never sees);
  //   · it still dates through `formatEatDateTime`/`formatEatDate` in the reader's month words — so a date deleted, or
  //     formatted some other way, cannot pass the first check by default.
  // ⛔ And a CLIENT file reads the year rule off an instant the server handed it, never `Date.now()`: the browser's clock
  // is a different number, and the first render must be the server's (a hydration mismatch otherwise, around a New Year).
  const CONVERTED = [
    "app/markets/[id]/page.tsx",
    "app/positions/page.tsx",
    "components/journey/tickets/ticket-card.tsx",
    "components/markets/resolution-panel.tsx",
    "components/markets/position-card.tsx",
    "app/profile/responsible-gambling/page.tsx",
    "app/watchlist/page.tsx",
    "app/wallet/deposit/page.tsx",
    "app/profile/sessions/page.tsx",
    "app/positions/performance/page.tsx",
    // The second pass (2026-10-08): the rest of the player dates, through formatDateTimeSafe, formatDateShort, formatDate.
    "app/fairness/page.tsx",
    "app/agent/page.tsx",
    "app/agent/status/page.tsx",
    "app/agent/invite/[token]/page.tsx",
    "app/profile/source-of-funds/page.tsx",
  ];
  /* ⚠️ TWO CLIENT FILES WHOSE YEAR RULE READS THE DEVICE CLOCK, BY THEIR OWN DESIGN — held to the first two checks, not
     the third: the comment thread's date is the fallback of a relative time ("5m", "3h") that is the device clock's
     already, and the wallet card's bonus expiry sits in a file whose transaction row (`TxnRow`) reads it the same way.
     Neither is handed a server instant; the year can differ from the server's only across a New Year. */
  const DEVICE_CLOCK = ["components/markets/comments-thread.tsx", "app/wallet/wallet-client.tsx"];
  for (const rel of [...CONVERTED, ...DEVICE_CLOCK]) {
    const src = read(`../src/${rel}`);
    const english = englishIn(src);
    ok(`3: fence · ${rel} uses no English date helper (formatDeadline, formatDayTime, formatDateTime, formatDayShort, formatDateTimeSafe, formatDateShort, formatDate)`,
      src.length > 0 && english.length === 0, english.join(", "));
    const calls = eatCalls(src);
    ok(`3: fence · ${rel} dates through formatEatDateTime/formatEatDate, in the reader's month words`,
      calls.length > 0 && calls.every(inReaderWords), showCalls(calls) || "no localized call");
    if (src.trimStart().startsWith(`"use client"`) && !DEVICE_CLOCK.includes(rel)) {
      ok(`3: fence · ${rel} is a client file: its year rule reads the server's instant, never Date.now()`,
        calls.length > 0 && calls.every((c) => c.args.length === 4 && !/Date[.]now/.test(c.args[1])), showCalls(calls));
    }
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

// §4 · an instant that is not one reads "—" — every player page now dates through eat-day, and its key reaches
// `toISOString`, which throws on an invalid date: one unreadable timestamp would take a whole page down.
{
  const eat = await import("../src/lib/eat-day.ts");
  const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
  const now = Date.parse("2026-10-08T12:00:00Z");
  const said = (f: () => string) => { try { return f(); } catch (e) { return `THREW ${(e as Error).message}`; } };
  ok("4: formatEatDateTime of NaN reads the missing-value mark, it does not throw",
     said(() => eat.formatEatDateTime(Number.NaN, now, MONTHS, "sw")) === "—", said(() => eat.formatEatDateTime(Number.NaN, now, MONTHS, "sw")));
  ok("4: …and formatEatDate of NaN too", said(() => eat.formatEatDate(Number.NaN, now, MONTHS, "zh")) === "—");
  ok("4: CONTROL — a real instant still reads in the reader's month words",
     said(() => eat.formatEatDateTime(Date.parse("2026-10-08T12:18:00Z"), now, MONTHS, "sw")) === "8 Okt, 15:18",
     said(() => eat.formatEatDateTime(Date.parse("2026-10-08T12:18:00Z"), now, MONTHS, "sw")));
}

console.log(`\ntimer-date: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
