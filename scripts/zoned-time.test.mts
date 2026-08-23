/**
 * WALL CLOCK → INSTANT, and the wizard that has to use it.
 *
 * THE DEFECT (2026-08-11, `wizard-resolution-time-parsed-in-browser-timezone`):
 * the admin market wizard built its resolution instant with
 * `new Date(resolutionAt).toISOString()` in the BROWSER, over a value from
 * `<input type="datetime-local">` — a bare wall clock with no zone. JS parses that on
 * the local machine's clock. An officer not on EAT published a poll resolving at a
 * different absolute instant from the one they typed and confirmed, and every cloud/CI
 * session (UTC) was silently three hours out.
 *
 * ⛔ WHY THIS IS A MONEY GUARD AND NOT A FORMATTING ONE. The campaign has already
 * measured the mechanism at one-minute resolution: a poll closing at 01:30 read BTC
 * 63,993 at the console but 64,014.51 on the 1-minute bar AT the deadline — it crossed
 * one minute LATE, and resolving on the wrong instant would have paid the wrong side.
 * Hours of slip is that same error, larger.
 *
 * Run: npm run test:zoned-time
 */
import {
  isBareWallClock, tzOffsetMsAt, wallClockToUtcIso, toUtcIso,
} from "../src/lib/zoned-time.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const EAT = "Africa/Dar_es_Salaam";

// ── 1 · The discriminator ────────────────────────────────────────────────────
// It decides whether a value gets re-interpreted at all, so a false positive here
// would SHIFT an instant that was already correct — worse than the original bug.
ok("1: a datetime-local value is a bare wall clock", isBareWallClock("2026-08-15T14:30"));
ok("1: with seconds too", isBareWallClock("2026-08-15T14:30:00"));
ok("1: a Z instant is NOT", !isBareWallClock("2026-08-15T14:30:00.000Z"));
ok("1: a +offset instant is NOT", !isBareWallClock("2026-08-15T14:30:00+03:00"));
ok("1: a -offset instant is NOT", !isBareWallClock("2026-08-15T14:30:00-05:00"));
ok("1: junk is NOT", !isBareWallClock("tomorrow-ish"));

// ── 2 · The offset, from Intl rather than a hardcoded constant ───────────────
ok("2: EAT is +3h", tzOffsetMsAt(EAT, Date.UTC(2026, 7, 15)) === 3 * 3600_000,
   String(tzOffsetMsAt(EAT, Date.UTC(2026, 7, 15))));
ok("2: EAT has no DST — January agrees with August",
   tzOffsetMsAt(EAT, Date.UTC(2026, 0, 15)) === tzOffsetMsAt(EAT, Date.UTC(2026, 7, 15)));
ok("2: UTC is 0", tzOffsetMsAt("UTC", Date.UTC(2026, 7, 15)) === 0);
ok("2: an unknown zone degrades to 0 rather than throwing",
   tzOffsetMsAt("Not/AZone", Date.UTC(2026, 7, 15)) === 0);

// ⭐ A zone WITH DST, because the platform timezone is admin-configurable and the
// two-pass correction is dead code until something exercises it.
{
  const NY = "America/New_York";
  const summer = tzOffsetMsAt(NY, Date.UTC(2026, 6, 15)); // EDT, -4
  const winter = tzOffsetMsAt(NY, Date.UTC(2026, 0, 15)); // EST, -5
  ok("2: New York is -4h in July", summer === -4 * 3600_000, String(summer / 3600_000));
  ok("2: and -5h in January", winter === -5 * 3600_000, String(winter / 3600_000));
  ok("2: so the DST branch is genuinely reachable", summer !== winter);
}

// ── 3 · THE CONVERSION — the assertion the defect fails ──────────────────────
// 14:30 on an EAT clock is 11:30 UTC. The old code produced 14:30 UTC on a UTC
// machine — the exact three-hour slip.
ok("3: 14:30 EAT is 11:30 UTC",
   wallClockToUtcIso("2026-08-15T14:30", EAT) === "2026-08-15T11:30:00.000Z",
   String(wallClockToUtcIso("2026-08-15T14:30", EAT)));
ok("3: 00:30 EAT is 21:30 UTC the PREVIOUS day (the case that changes the date)",
   wallClockToUtcIso("2026-08-15T00:30", EAT) === "2026-08-14T21:30:00.000Z",
   String(wallClockToUtcIso("2026-08-15T00:30", EAT)));
ok("3: on a UTC platform the wall clock IS the instant",
   wallClockToUtcIso("2026-08-15T14:30", "UTC") === "2026-08-15T14:30:00.000Z");
ok("3: New York in July is +4h to UTC",
   wallClockToUtcIso("2026-07-15T08:00", "America/New_York") === "2026-07-15T12:00:00.000Z",
   String(wallClockToUtcIso("2026-07-15T08:00", "America/New_York")));
ok("3: junk returns null, never a silent `new Date()` fallback",
   wallClockToUtcIso("not a time", EAT) === null);

// ⛔ THE ANTI-REGRESSION THAT NAMES THE OLD BUG. This is what the browser used to
// do. It must NOT equal the correct answer on a non-EAT machine — and if this
// process happens to run on EAT, say so rather than claim a pass we did not earn.
{
  const wall = "2026-08-15T14:30";
  const browserWay = new Date(wall).toISOString();   // the defect, verbatim
  const correct = wallClockToUtcIso(wall, EAT)!;
  const hostOffset = -new Date(`${wall}:00`).getTimezoneOffset() * 60_000;
  if (hostOffset === 3 * 3600_000) {
    console.log("SKIP 4: this host IS on EAT, so the two agree here by luck — run elsewhere to see it diverge");
  } else {
    ok("4: the old browser-parse does NOT agree with the platform-zone answer",
       browserWay !== correct, `browser=${browserWay} correct=${correct}`);
  }
  ok("4: and the correct answer never depends on the host clock",
     wallClockToUtcIso(wall, EAT) === "2026-08-15T11:30:00.000Z");
}

// ── 5 · Pass-through: an existing instant must not be re-interpreted ─────────
ok("5: a Z instant survives untouched",
   toUtcIso("2026-08-15T11:30:00.000Z", EAT) === "2026-08-15T11:30:00.000Z");
ok("5: an offset instant normalises to the same moment",
   toUtcIso("2026-08-15T14:30:00+03:00", EAT) === "2026-08-15T11:30:00.000Z");
ok("5: a bare wall clock IS interpreted",
   toUtcIso("2026-08-15T14:30", EAT) === "2026-08-15T11:30:00.000Z");
ok("5: empty is null", toUtcIso("", EAT) === null);

// ── 6 · THE CALL SITES — structural, because the unit above can be perfect while
//        the wizard still converts in the browser ──────────────────────────────
//
// This is the half that actually closes the defect. Rule 5b: assert the call site,
// not the symbol.
{
  const wizard = readFileSync(new URL("../src/app/admin/markets/new/wizard.tsx", import.meta.url), "utf8");
  const w = decomment(wizard);

  ok("6: the wizard no longer builds the instant with new Date(...).toISOString()",
     !/new Date\(\s*resolutionAt\s*\)\s*\.toISOString\(\)/.test(w));
  ok("6: it sends the wall clock RAW for the server to interpret",
     /fd\.set\(\s*["']resolutionAt["']\s*,\s*resolutionAt\s*\)/.test(w));

  const action = decomment(readFileSync(new URL("../src/app/markets/actions.ts", import.meta.url), "utf8"));
  // Statement position, and asserted to carry the platform zone — not merely that the
  // words appear somewhere in a 900-line file.
  ok("6: createMarketAction resolves resolutionAt through toUtcIso + the platform zone",
     /resolutionAt\s*=\s*toUtcIso\(\s*resolutionAtRaw\s*,\s*getPlatformTimezone\(\)\s*\)/.test(action));
  ok("6: and selectionClosedAt gets the same treatment — betting-close is a deadline too",
     /selectionClosedAtRaw\s*=\s*toUtcIso\([\s\S]{0,120}?getPlatformTimezone\(\)\s*\)/.test(action));

  // ⛔ AND THE ZONE MUST NOT BE HARDCODED. `eat-day.ts` legitimately pins +3h; this
  // module must not, or an admin changing the platform timezone would move every
  // displayed time while poll deadlines silently stayed on EAT.
  const mod = decomment(readFileSync(new URL("../src/lib/zoned-time.ts", import.meta.url), "utf8"));
  ok("6: zoned-time.ts hardcodes no offset and no zone name",
     !/EAT_OFFSET|3\s*\*\s*60\s*\*\s*60\s*\*\s*1000|Africa\/Dar_es_Salaam/.test(mod));
}

console.log(`\nzoned-time: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
