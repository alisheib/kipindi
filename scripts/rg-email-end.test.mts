/**
 * test:rg-email-end — THE END OF A BREAK OR AN EXCLUSION, AS ITS CONFIRMATION LETTER STATES IT (R6-A, 2026-10-09; the round-6
 * review's A1, HIGH, responsible gambling).
 *
 * 🔴 WHAT WAS WRONG. `responsible-gambling.ts` formatted the end with `toLocaleDateString("en-GB")` and no time zone, and
 *    production runs in UTC: a 24-hour break taken at 01:30 EAT on 9 Oct (it ends 01:30 on 10 Oct) was confirmed as "until
 *    09 Oct 2026" — a day early, and no time even for a one-hour break — with a Swahili line "hadi 2026-10-09"; the
 *    exclusion's Swahili line printed the English month; a permanent exclusion read "…disabled until 15 Sept 2126". The
 *    bet receipt's "Resolves" row printed `resolutionAt.slice(0, 10)`, the UTC day, unformatted.
 * ⭐ WHAT THIS HOLDS. The letters take the instant and say it on the East Africa clock with its time, each line in its own
 *    month words (`formatEatDateTime`, as the bell says the same end); a permanent exclusion — `selfExclusionStandingOf`,
 *    never the period's name — states no end at all; an unreadable end states none; the receipt's row is a moment in EAT.
 *    Every rule is EXECUTED on the real builders, with a control or a plant beside it; the callers are read decommented.
 * ⚠️ A HOTFIX-SHAPED SUITE: it reads only files `main` has too (email.ts, responsible-gambling.ts, market-service.ts, eat-day.ts,
 *    i18n-dict.ts, decomment.mts), so it travels with the fix when A1 is cherry-picked ahead of the visual pass.
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
const { dict } = await import("../src/lib/i18n-dict.ts");
const { formatEatDateTime } = await import("../src/lib/eat-day.ts");
const E = await import("../src/lib/server/email.ts");
const { selfExclusionStandingOf } = await import("../src/lib/server/responsible-gambling.ts");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** The letter's English sentences (`subtitle`), its Swahili ones (`subtitleSw`) and its detail rows, as the reader reads them. */
const enLines = (h: string) => [...h.matchAll(/<p style="margin:0 0 16px;[^"]*">([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
const swLines = (h: string) => [...h.matchAll(/<p style="margin:-10px 0 16px;[^"]*">([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
const rows = (h: string): Record<string, string> =>
  Object.fromEntries([...h.matchAll(/<td class="sp-row-label"[^>]*>([\s\S]*?)<\/td><td class="sp-row-val"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => [decode(m[1]), decode(m[2])]));

const EN = dict.en.common.monthsShort, SW = dict.sw.common.monthsShort;
const now = () => Date.now();
const endEn = (iso: string) => formatEatDateTime(Date.parse(iso), now(), EN, "en");
const endSw = (iso: string) => formatEatDateTime(Date.parse(iso), now(), SW, "sw");
/** What production printed: `toLocaleDateString("en-GB")` in the server's zone, which is UTC on Railway. */
const oldDay = (iso: string, timeZone = "UTC") => new Date(iso).toLocaleDateString("en-GB", { timeZone, day: "2-digit", month: "short", year: "numeric" });
const MONTH_WORD = new RegExp(`\\b(${[...new Set([...EN, ...SW])].join("|")}|Sept)\\b`);

// The reviewer's cases: 24 hours from 01:30 EAT on 9 Oct (ends 01:30 EAT on 10 Oct = 22:30 UTC on 9 Oct), one hour from 14:00
// EAT, an exclusion from 02:10 EAT, one ending in another year, the stored permanent (now + 100 years) and an unreadable end.
const BREAK24 = "2026-10-09T22:30:00.000Z";
const BREAK1H = "2026-10-09T12:00:00.000Z";
const EXCL24 = "2026-10-09T23:10:00.000Z";
const NEXT_YEAR = new Date(now() + 366 * 86_400_000).toISOString();
const PERM = new Date(now() + 100 * 365 * 86_400_000).toISOString();
const BAD = "not-a-date";

/* ══ §1 · THE BREAK'S LETTER ══════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · coolOffHtml — the break's end on the East Africa clock, with its time, each line in its own words");
const breakOk = (h: string, iso: string) => {
  const en = enLines(h).join(" "), sw = swLines(h).join(" ");
  return en.includes(`, until ${endEn(iso)}.`) && sw.includes(` hadi ${endSw(iso)}.`) && rows(h).Resumes === endEn(iso);
};
{
  const h = E.coolOffHtml({ duration: "24 hours", untilIso: BREAK24 });
  const en = enLines(h).join(" "), sw = swLines(h).join(" ");
  ok(`1.1 · EXECUTED · the 24-hour break taken at 01:30 EAT ends "until ${endEn(BREAK24)}" — the EAT day (10 Oct) and its clock`,
    en.includes(`Betting and deposits are paused for 24 hours, until ${endEn(BREAK24)}.`) && /\b10 Oct\b/.test(endEn(BREAK24)) && endEn(BREAK24).endsWith("01:30"), en);
  ok(`1.2 · EXECUTED · …the Swahili line says "hadi ${endSw(BREAK24)}" in Swahili month words — no English month, no ISO day`,
    sw.includes(`Kuweka dau na amana kumesimamishwa hadi ${endSw(BREAK24)}.`) && /\b10 Okt\b/.test(endSw(BREAK24)) && !/\bOct\b|\d{4}-\d{2}-\d{2}/.test(sw), sw);
  ok("1.3 · EXECUTED · …and the Resumes row is the English line's own value (one letter, one end, one way)", rows(h).Resumes === endEn(BREAK24), JSON.stringify(rows(h)));
  ok("1.4 · EXECUTED · every other word is the letter's own: the duration row and both 'does not block' sentences unchanged",
    rows(h).Duration === "24 hours" && en.includes("Your break does not block sign-in or withdrawals.")
    && sw.includes("Mapumziko haya hayazuii kuingia kwenye akaunti wala kutoa pesa."));
  const h1 = E.coolOffHtml({ duration: "1 hour", untilIso: BREAK1H });
  ok(`1.5 · EXECUTED · a one-hour break states its hour: "until ${endEn(BREAK1H)}" / "hadi ${endSw(BREAK1H)}"`,
    breakOk(h1, BREAK1H) && endEn(BREAK1H).endsWith("15:00") && endSw(BREAK1H).endsWith("15:00"), enLines(h1).join(" | "));
  const planted = h.split(endEn(BREAK24)).join(oldDay(BREAK24)).split(endSw(BREAK24)).join(BREAK24.slice(0, 10));
  ok(`1.5′ CONTROL · production's day for the same break is "${oldDay(BREAK24)}" (a day early, no time) — and a letter carrying it fails 1.1–1.3`,
    oldDay(BREAK24) === "09 Oct 2026" && !breakOk(planted, BREAK24));
}

/* ══ §2 · THE EXCLUSION'S LETTER ══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · selfExclusionHtml — the same end, and a permanent exclusion that names none");
const exclOk = (h: string, iso: string) => {
  const en = enLines(h).join(" "), sw = swLines(h).join(" ");
  return en.includes(`disabled until ${endEn(iso)}.`) && sw.includes(` hadi ${endSw(iso)}.`) && rows(h).Unlocks === endEn(iso);
};
/** A permanent letter: no date in any line or row, the dictionary's word in the Period row, the sentences otherwise whole. */
const permanentOk = (h: string) => {
  const all = [...enLines(h), ...swLines(h), ...Object.values(rows(h))].join(" | ");
  return !/\d{4}|\d{1,2}:\d{2}/.test(all) && !MONTH_WORD.test(all) && !/\buntil\b|\bhadi\b/.test(all)
    && enLines(h).join(" ").includes("Betting, deposits, and login are disabled. This cannot be reversed.")
    && swLines(h).join(" ").includes("Akaunti yako imefungwa. Hii haiwezi kubatilishwa.")
    && rows(h).Period === dict.en.common.permanent && !("Unlocks" in rows(h));
};
{
  const h = E.selfExclusionHtml({ period: "24 hours", untilIso: EXCL24 });
  ok(`2.1 · EXECUTED · a 24-hour exclusion from 02:10 EAT: "until ${endEn(EXCL24)}" / "hadi ${endSw(EXCL24)}" and the Unlocks row — the English month gone from the Swahili line`,
    exclOk(h, EXCL24) && !/\bOct\b/.test(swLines(h).join(" ")) && /\b10 Okt\b/.test(endSw(EXCL24)), [...enLines(h), ...swLines(h)].join(" | "));
  const y = E.selfExclusionHtml({ period: "6 months", untilIso: NEXT_YEAR });
  const year = String(new Date(Date.parse(NEXT_YEAR) + 3 * 3_600_000).getUTCFullYear());
  ok(`2.2 · EXECUTED · an end in another year carries its year in both lines ("${endEn(NEXT_YEAR)}")`,
    exclOk(y, NEXT_YEAR) && endEn(NEXT_YEAR).includes(year) && endSw(NEXT_YEAR).includes(year));
  const s = selfExclusionStandingOf(PERM);
  const permanent = s.state === "serving" && s.permanent;
  ok("2.3 CONTROL · the one definition reads the stored permanent (now + 100 years) as permanent, and a 6-month end as not",
    permanent && (() => { const m = selfExclusionStandingOf(new Date(now() + 182 * 86_400_000).toISOString()); return m.state === "serving" && !m.permanent; })());
  const p = E.selfExclusionHtml({ period: "permanent", untilIso: PERM, permanent });
  ok("2.4 · EXECUTED · a PERMANENT exclusion's letter states no end — no year, no clock, no month word, no 'until'/'hadi' — and its Period row says the dictionary's own word",
    permanentOk(p), [...enLines(p), ...swLines(p), JSON.stringify(rows(p))].join(" | "));
  const asDated = E.selfExclusionHtml({ period: "permanent", untilIso: PERM });
  ok("2.4′ PLANT · the same instant drawn as a dated exclusion (what the letter did) fails 2.4", !permanentOk(asDated));
}

/* ══ §3 · AN UNREADABLE END ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · an end that does not parse states no end — never \"Invalid Date\", \"NaN\" or a dash");
{
  const c = E.coolOffHtml({ duration: "24 hours", untilIso: BAD });
  const x = E.selfExclusionHtml({ period: "24 hours", untilIso: BAD });
  const both = [...enLines(c), ...swLines(c), ...enLines(x), ...swLines(x), ...Object.values(rows(c)), ...Object.values(rows(x))].join(" | ");
  ok("3.1 · EXECUTED · both letters drop only the end: no 'until'/'hadi', no Resumes/Unlocks row, no Invalid Date / NaN / —",
    !/Invalid Date|NaN|—|\buntil\b|\bhadi\b/.test(both) && !("Resumes" in rows(c)) && !("Unlocks" in rows(x))
    && enLines(c).join(" ").includes("Betting and deposits are paused for 24 hours. Your break does not block sign-in or withdrawals."), both);
}

/* ══ §4 · THE BET RECEIPT'S "Resolves" ROW (A1's sibling) ═════════════════════════════════════════════════════════════ */
section("4 · betPlacedHtml — \"Resolves\" is a moment on the East Africa clock, like \"Placed\" above it");
{
  const AT = "2026-10-09T22:00:00.000Z"; // 01:00 EAT on 10 Oct
  const eat = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " EAT";
  const base = { reference: "pos_r6a", side: "YES" as const, stake: 10_000, marketTitle: "T", placedAt: "2026-10-09T09:00:00.000Z", cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 };
  const r = rows(E.betPlacedHtml({ ...base, resolvesAt: AT }));
  ok(`4.1 · EXECUTED · a market resolving at 01:00 EAT on 10 Oct reads "Resolves ${eat(AT)}" (it read "2026-10-09")`,
    r.Resolves === eat(AT) && /\b10 Oct 2026, 01:00 EAT$/.test(r.Resolves), JSON.stringify(r));
  ok("4.2 · EXECUTED · …in the format of the Placed row above it (one table, one clock)", r.Placed === eat(base.placedAt) && / EAT$/.test(r.Placed));
  const bad = rows(E.betPlacedHtml({ ...base, resolvesAt: BAD }));
  ok("4.3 · EXECUTED · an unreadable instant draws no Resolves row — never 'Invalid Date EAT'", !("Resolves" in bad) && !Object.values(bad).some((v) => /Invalid/.test(v)), JSON.stringify(bad));
  ok("4.3′ CONTROL · the formatter alone would have printed 'Invalid Date EAT' for it", eat(BAD) === "Invalid Date EAT");
}

/* ══ §5 · THE CALLERS ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the callers hand the instant, and decide permanence through the one definition");
const RG = read("src/lib/server/responsible-gambling.ts");
const EMAIL = read("src/lib/server/email.ts");
const MS = read("src/lib/server/market-service.ts");
const fn = (src: string, name: string) => { const at = src.indexOf(`function ${name}(`); return at < 0 ? "" : src.slice(at, src.indexOf("\nexport ", at + 10) > 0 ? src.indexOf("\nexport ", at + 10) : undefined); };
/** No DATE is formatted (the harm detector's `Math.round(n).toLocaleString()` is a number, for an officer, and stays). */
const rgFormatsNoDate = (src: string) => !/toLocaleDateString|toLocaleTimeString|\)\)?\.toLocaleString\("|\bfmtDate\b|\.slice\(0, 10\)/.test(src);
{
  ok("5.1 · responsible-gambling.ts formats no date (no toLocaleDateString / dated toLocaleString, no fmtDate, no UTC-day slice)", rgFormatsNoDate(RG));
  ok("5.1′ PLANT · the old `fmtDate` put back is reported",
    !rgFormatsNoDate(RG.replace("const PERIOD_LABEL", 'const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");\nconst PERIOD_LABEL')));
  const se = fn(RG, "selfExclude");
  const perm = /const standing = selfExclusionStandingOf\(until\);\s*const permanent = standing\.state === "serving" && standing\.permanent;/;
  ok("5.2 · selfExclude asks selfExclusionStandingOf(until) — the one definition of permanent — and hands the letter the instant and the answer",
    perm.test(se) && /selfExclusionHtml\(\{ period: periodLabel, untilIso: until, permanent \}\)/.test(se) && /subject: `Self-exclusion confirmed · \$\{periodLabel\}`/.test(se));
  ok("5.2′ PLANT · permanence read from the period's name instead is reported", !perm.test(se.replace("selfExclusionStandingOf(until)", 'period === "perm" ? { state: "serving", permanent: true } : { state: "none" }')));
  ok("5.3 · coolOff hands its letter the instant", /coolOffHtml\(\{ duration: PERIOD_LABEL\[period\] \?\? period, untilIso: until \}\)/.test(fn(RG, "coolOff")));
  const handsInstant = (src: string) => /resolvesAt: market\.resolutionAt,/.test(src) && !/resolutionAt\.slice\(0, 10\)/.test(src);
  ok("5.4 · market-service hands the receipt the resolution INSTANT, never its UTC day", handsInstant(MS));
  ok("5.4′ PLANT · the UTC-day cut put back is reported",
    !handsInstant(MS.replace("resolvesAt: market.resolutionAt,", "resolvesAt: market.resolutionAt.slice(0, 10),")));
  const end = fn(EMAIL, "rgEndIn");
  ok("5.5 · the letters' end is `formatEatDateTime` in each line's own month words (dict.en / dict.sw), and nothing else",
    /en: formatEatDateTime\(at, nowMs, dict\.en\.common\.monthsShort, "en"\)/.test(end) && /sw: formatEatDateTime\(at, nowMs, dict\.sw\.common\.monthsShort, "sw"\)/.test(end)
    && /if \(!Number\.isFinite\(at\)\) return null;/.test(end));
  const sx = fn(EMAIL, "selfExclusionHtml"), co = fn(EMAIL, "coolOffHtml");
  ok("5.6 · both builders take the instant (`untilIso`), read their end only from rgEndIn, and carry no pre-formatted `endDate` and no UTC-day cut",
    /untilIso: string/.test(sx) && /untilIso: string/.test(co) && /rgEndIn\(untilIso, Date\.now\(\)\)/.test(sx) && /rgEndIn\(untilIso, Date\.now\(\)\)/.test(co)
    && !/endDate|\.slice\(0, 10\)|toLocale/.test(sx + co));
  ok("5.7 · a permanent letter draws no end: `permanent ? null : rgEndIn(…)` and the dictionary's word in its Period row",
    /const end = permanent \? null : rgEndIn\(untilIso, Date\.now\(\)\);/.test(sx) && /value: permanent \? dict\.en\.common\.permanent : period/.test(sx));
}

/* ══ §6 · THE SERVER'S ZONE NO LONGER MATTERS ═════════════════════════════════════════════════════════════════════════ */
section("6 · the letters read the same in any server zone (production runs in UTC)");
{
  const zones = ["UTC", "Africa/Dar_es_Salaam", "Pacific/Kiritimati", "America/Los_Angeles"];
  const before = process.env.TZ;
  const letters: string[] = [], old: string[] = [];
  for (const z of zones) {
    process.env.TZ = z;
    letters.push(E.coolOffHtml({ duration: "24 hours", untilIso: BREAK24 }) + E.selfExclusionHtml({ period: "24 hours", untilIso: EXCL24 }));
    old.push(new Date(BREAK24).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
  }
  if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  ok(`6.1 · EXECUTED · both letters are byte-identical under ${zones.join(", ")}`, letters.every((l) => l === letters[0]));
  ok(`6.1′ CONTROL · the zone switch is live in this process: the old formatter gave ${[...new Set(old)].join(" / ")} for the same instant`, new Set(old).size > 1, old.join(" | "));
}

console.log(`\nrg-email-end: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
