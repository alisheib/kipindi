// What the converted surfaces now print, per locale, against the old English helpers. Run from F:\kipindi-months:
//   npx tsx <this file>
import { pathToFileURL } from "node:url";
import { join } from "node:path";
const root = process.cwd();
const { formatEatDateTime, formatEatDate } = await import(pathToFileURL(join(root, "src/lib/eat-day.ts")).href);
const { dict } = await import(pathToFileURL(join(root, "src/lib/i18n-dict.ts")).href);
const { formatDeadline, formatDateTime, formatDayShort } = await import(pathToFileURL(join(root, "src/lib/utils.ts")).href);

const NOW = Date.parse("2026-10-08T13:00:00.000Z");
const cases = [
  ["the bug's ticket (placed 15:18 EAT)", "2026-10-08T12:18:00.000Z"],
  ["a deadline next year", "2027-02-10T20:59:00.000Z"],
  ["New Year's Eve 21:30 UTC (already 2027 in Dar)", "2026-12-31T21:30:00.000Z"],
];
for (const [label, iso] of cases) {
  console.log(`\n${label} — ${iso}`);
  console.log(`  before · formatDeadline: ${formatDeadline(iso, NOW)} · formatDateTime: ${formatDateTime(iso)} · formatDayShort: ${formatDayShort(iso)}`);
  for (const l of ["en", "sw", "zh"] as const) {
    const m = dict[l].common.monthsShort;
    console.log(`  after  · ${l} · formatEatDateTime: ${formatEatDateTime(Date.parse(iso), NOW, m, l)} · formatEatDate: ${formatEatDate(Date.parse(iso), NOW, m, l)}`);
  }
}
