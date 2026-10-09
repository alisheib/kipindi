// Throwaway, read-only: render the real helper with the real dictionary and the app's real `fill`, all three locales.
// Imports use the worktree's own files as file:// URLs (a bare F:/ path is not a valid ESM specifier on Windows).
import { timeLeftLabel } from "file:///F:/kipindi-tleft/src/lib/markets/time-left.ts";
import { dict } from "file:///F:/kipindi-tleft/src/lib/i18n-dict.ts";
import { fill } from "file:///F:/kipindi-tleft/src/lib/utils.ts";

const NOW = Date.parse("2026-10-08T09:00:00.000Z");
const cases: [string, number][] = [
  ["40 s", 40_000], ["1 min", 60_000], ["1m59s", 119_999], ["2 min", 120_000], ["59 min", 3_540_000],
  ["1 h", 3_600_000], ["1h59m", 7_199_000], ["2 h", 7_200_000], ["23 h", 82_800_000],
  ["1 d", 86_400_000], ["1d23h", 169_200_000], ["2 d", 172_800_000], ["9 d", 777_600_000],
  ["closed", 0],
];
for (const loc of ["en", "sw", "zh"] as const) {
  const m = dict[loc].market;
  const labels = {
    closed: m.closed, days: m.timeLeftD, hours: m.timeLeftH, minutes: m.timeLeftM,
    daysOne: m.timeLeftD1, hoursOne: m.timeLeftH1, minutesOne: m.timeLeftM1,
  };
  console.log(`--- ${loc}`);
  console.log(cases.map(([n, ms]) => `${n} => ${timeLeftLabel(NOW + ms, NOW, labels, fill)}`).join("\n"));
}
