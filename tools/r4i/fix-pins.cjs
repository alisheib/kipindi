const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/rg-doors.test.mts", [
  [`    const rows: Array<[Parameters<typeof accountRefusalPath>[0], string, string]> = [
      [{ standing: "serving", until: "2026-12-01T09:00:00.000Z" }, "", "/auth/login?excluded=serving&until=2026-12-01"],`,
   `    // ⭐ R4-I (2026-10-09): serving carries its END, the instant — no longer its UTC day ("until=2026-12-01" read as
    // midnight on the sign-in page, and an end before 03:00 EAT named the day before). The page formats it.
    const rows: Array<[Parameters<typeof accountRefusalPath>[0], string, string]> = [
      [{ standing: "serving", until: "2026-12-01T09:00:00.000Z" }, "", "/auth/login?excluded=serving&until=2026-12-01T09%3A00%3A00.000Z"],`],
]);
edit("scripts/pending-bet.test.mts", [
  [`      [[{ standing: "serving", until: "2026-12-01T09:00:00.000Z" }, ""], "/auth/login?excluded=serving&until=2026-12-01"],`,
   `      // R4-I (2026-10-09): serving carries its end as the instant, not its UTC day (test:rg-doors 6.10 says why).
      [[{ standing: "serving", until: "2026-12-01T09:00:00.000Z" }, ""], "/auth/login?excluded=serving&until=2026-12-01T09%3A00%3A00.000Z"],`],
]);
edit("scripts/timer-date.test.mts", [
  ["  const eatCalls = (src: string) => [...src.matchAll(/(?<![A-Za-z0-9_$.])formatEat(DateTime|Date)[(]/g)].map((m) => {",
   "  // ⭐ R4-I (2026-10-09): `formatBreakEnd` (src/lib/break-end.ts) is `formatEatDateTime` for a break's or an exclusion's end —\n  // the same four arguments, the reader's month words — so a file that dates a break through it is held like one that calls\n  // `formatEatDateTime` itself (the deposit page's notice moved to it).\n  const eatCalls = (src: string) => [...src.matchAll(/(?<![A-Za-z0-9_$.])(formatEat(?:DateTime|Date)|formatBreakEnd)[(]/g)].map((m) => {"],
  ["    return { fn: `formatEat${m[1]}`, args };", "    return { fn: m[1], args };"],
]);
edit("scripts/popup-fit.test.mts", [
  ["  const titleBlock = /\\{marketTitle && \\([\\s\\S]{0,400}?\\{marketTitle\\}/.exec(bet)?.[0] ?? \"\";",
   "  // R4-I (2026-10-09): the title is drawn through `keepText` (its last two words kept together, so \"2026-27\" never stands\n  // alone) — the same text, unclamped; the anchor reads either form.\n  const titleBlock = /\\{marketTitle && \\([\\s\\S]{0,400}?\\{(?:keepText\\()?marketTitle\\)?\\}/.exec(bet)?.[0] ?? \"\";"],
]);
