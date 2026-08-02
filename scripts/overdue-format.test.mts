/**
 * THE OVERDUE BADGE'S UNIT — finding E-38.
 *
 *   npx tsx scripts/overdue-format.test.mts     (npm run test:overdue-format)
 *
 * ── WHAT THIS EXISTS TO STOP ─────────────────────────────────────────────────
 * The resolver queue's overdue badge rendered `${minutes}m overdue` with NO rollover to
 * hours or days, while the not-yet-due branch of the same function rolled m → h → d
 * correctly. So on production 2026-08-02 a market **16 hours** overdue — holding
 * **TZS 59,450 of real player money** across 8 positions from 4 different players —
 * announced itself as **"966M OVERDUE"** (the admin CSS uppercases it).
 *
 * Two things make that worse than a cosmetic slip:
 *  · "M" means MILLIONS everywhere else in this console (`formatTzs`, `admin-charts`, the
 *    conviction dial, the invite page). On a money screen, "966M" reads as an amount.
 *  · it is the ALARM. The one direction that matters — already late, money held — was the
 *    one direction that did not scale its unit, so the longer a payout waits the less
 *    urgent its badge looks.
 *
 * ⚠️ PROVEN RED BEFORE THE FIX: with the old `${Math.floor(ms/60_000)}m` body, cases 2-5
 * fail (966m, 1440m, 4320m, 20160m instead of 16h, 1d, 3d, 2w).
 */
import { humanDuration } from "../src/app/admin/resolver-queue/page.tsx";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

ok("1 · under an hour stays in minutes", humanDuration(45 * MIN) === "45m", humanDuration(45 * MIN));
// THE PRODUCTION CASE. 966 minutes is what the live badge printed.
ok("2 · ⭐ the real production case: 966 minutes reads as hours, not '966m'",
   humanDuration(966 * MIN) === "16h", humanDuration(966 * MIN));
ok("3 · a full day reads as a day", humanDuration(DAY) === "1d", humanDuration(DAY));
ok("4 · three days reads as days", humanDuration(3 * DAY) === "3d", humanDuration(3 * DAY));
ok("5 · a fortnight reads as weeks, not 20160 minutes",
   humanDuration(14 * DAY) === "2w", humanDuration(14 * DAY));
ok("6 · exactly one hour rolls over", humanDuration(HOUR) === "1h", humanDuration(HOUR));
ok("7 · 59 minutes does not", humanDuration(59 * MIN) === "59m", humanDuration(59 * MIN));
ok("8 · zero is not an empty string", humanDuration(0) === "0m", humanDuration(0));

// The property that actually matters, stated as a property rather than as examples: the
// number shown must never grow past what its unit can sensibly carry. A formatter that
// prints "966m" violates it; one that prints "16h" does not.
const NUMBER = /^(\d+)([mhdw])$/;
let worst = "";
for (let m = 1; m <= 40_000; m += 7) {
  const out = humanDuration(m * MIN);
  const match = NUMBER.exec(out);
  if (!match) { worst = `unparseable "${out}" at ${m}m`; break; }
  if (Number(match[1]) > 99) { worst = `"${out}" at ${m}m — three digits means the unit is too small`; break; }
}
ok("9 · ★ across 40,000 minutes the number never exceeds two digits — the unit always scales",
   worst === "", worst);

console.log(`\n${fail === 0 ? "✅" : "❌"} overdue formatting (E-38): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
