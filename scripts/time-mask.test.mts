/**
 * Unit + stress tests for the segmented 24-hour time field (time-mask.ts).
 *
 * The headline requirement: an out-of-range time must be IMPOSSIBLE TO ENTER.
 * The QA finding was that operators could type hour 55 or 90. These tests drive
 * the same pure keystroke logic the React component uses and assert that such
 * values can never land in a segment.
 *
 * Run: npm run test:time   (tsx scripts/time-mask.test.mts)
 */

import {
  emptyTimeState, applyTimeInput, applyTimeBackspace, focusPrevTime, focusNextTime,
  resolveTimeSegment, sanitizeDigits, padTimeOnBlur, deriveTime, timeStateFromString,
  to12Hour, TIME_SEGMENTS, type TimeMaskState,
} from "../src/components/ui/time-mask.ts";

let pass = 0, fail = 0;
function eq(label: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log(`FAIL ${label}\n   got ${g}\n   exp ${e}`); }
}

// Simulate the native input: typing a digit appends at the caret (end), capped
// to the segment width, then resolve/advance — exactly like the component.
function typeDigit(s: TimeMaskState, d: string): TimeMaskState {
  const seg = TIME_SEGMENTS[s.focus];
  const raw = s[seg.key] + d;
  return applyTimeInput(s, raw);
}
function type(s: TimeMaskState, keys: string): TimeMaskState {
  for (const k of keys) s = typeDigit(s, k);
  return s;
}
const view = (s: TimeMaskState) => `${s.hh || "HH"}:${s.mm || "MM"}@${s.focus}`;

// ── 1. The reported bug: hour 55 / 90 must be impossible ──────────────
{
  // Typing "5" in hours → can't be the first of a 2-digit hour, so it becomes
  // "05" and advances to minutes. The second "5" goes into minutes.
  let s = type(emptyTimeState(), "55");
  eq("type 55 -> 05:5 (hour clamped, advanced)", view(s), "05:5@1");
  s = applyTimeInput(s, s.mm); // settle
  eq("       -> minutes hold 5", s.mm, "5");
}
{
  let s = type(emptyTimeState(), "9");
  eq("type 9 in hours -> 09, advance", view(s), "09:MM@1");
}
{
  // "90" — 9 pads to 09 + advances; 0 goes to minutes → 09:00, never hour 90.
  let s = type(emptyTimeState(), "90");
  eq("type 90 -> 09:0", view(s), "09:0@1");
}

// ── 2. Two-digit hours: 23 is the ceiling ─────────────────────────────
{
  let s = type(emptyTimeState(), "23");
  eq("type 23 -> 23, advance to minutes", view(s), "23:MM@1");
}
{
  // "2" then "4" → 24 is invalid; the 4 is REJECTED, segment keeps "2".
  let s = emptyTimeState();
  s = typeDigit(s, "2"); eq("type 2 -> hold (could be 20-23)", view(s), "2:MM@0");
  s = typeDigit(s, "4"); eq("type 24 rejected -> still 2", view(s), "2:MM@0");
  s = typeDigit(s, "3"); eq("type 23 -> accepted", view(s), "23:MM@1");
}
{
  // "2" then "5".."9" all rejected.
  for (const d of ["5", "6", "7", "8", "9"]) {
    let s = type(emptyTimeState(), "2" + d);
    eq(`type 2${d} rejected -> 2`, s.hh, "2");
  }
}
{
  // "20","21","22" all valid.
  for (const t of ["20", "21", "22"]) {
    let s = type(emptyTimeState(), t);
    eq(`type ${t} -> accepted`, s.hh, t);
  }
}

// ── 3. Minutes: 0–59, 6.. pads ────────────────────────────────────────
{
  let s = type(emptyTimeState(), "12");      // hour 12
  s = type(s, "59");                          // minutes 59
  eq("12:59 valid", deriveTime(s), { value: "12:59", invalid: false });
}
{
  // Minute first digit 6 → 06, advance/complete. "6" can't start a 60+ minute.
  let s = emptyTimeState(); s.focus = 1;
  s = typeDigit(s, "6");
  eq("minute 6 -> 06", s.mm, "06");
}
{
  // Minute "9" → 09.
  let s = emptyTimeState(); s.focus = 1;
  s = typeDigit(s, "9");
  eq("minute 9 -> 09", s.mm, "09");
}

// ── 4. resolveTimeSegment direct (clamp truth table) ──────────────────
eq("hh '0' holds", resolveTimeSegment("hh", "0"), { value: "0", advance: false });
eq("hh '1' holds", resolveTimeSegment("hh", "1"), { value: "1", advance: false });
eq("hh '2' holds", resolveTimeSegment("hh", "2"), { value: "2", advance: false });
eq("hh '3' pads+adv", resolveTimeSegment("hh", "3"), { value: "03", advance: true });
eq("hh '00' ok", resolveTimeSegment("hh", "00"), { value: "00", advance: true });
eq("hh '19' ok", resolveTimeSegment("hh", "19"), { value: "19", advance: true });
eq("hh '23' ok", resolveTimeSegment("hh", "23"), { value: "23", advance: true });
eq("hh '24' rejected", resolveTimeSegment("hh", "24"), { value: "2", advance: false });
eq("hh '99' rejected", resolveTimeSegment("hh", "99"), { value: "9", advance: false }); // 9>2 path handled at 1-digit; 2-digit safety
eq("mm '5' holds", resolveTimeSegment("mm", "5"), { value: "5", advance: false });
eq("mm '6' pads+adv", resolveTimeSegment("mm", "6"), { value: "06", advance: true });
eq("mm '59' ok", resolveTimeSegment("mm", "59"), { value: "59", advance: true });
eq("mm '00' ok", resolveTimeSegment("mm", "00"), { value: "00", advance: true });

// ── 5. sanitize strips junk ───────────────────────────────────────────
eq("sanitize 'a1b2' -> 12", sanitizeDigits("a1b2", 2), "12");
eq("sanitize '1:2' -> 12 capped", sanitizeDigits("1:2", 2), "12");
eq("sanitize emoji", sanitizeDigits("1️⃣2", 2), "12");

// ── 6. padOnBlur ──────────────────────────────────────────────────────
eq("pad '9' -> 09", padTimeOnBlur("9"), "09");
eq("pad '09' -> 09", padTimeOnBlur("09"), "09");
eq("pad '' -> ''", padTimeOnBlur(""), "");

// ── 7. deriveTime completeness + invalid defence ──────────────────────
eq("derive incomplete", deriveTime({ hh: "1", mm: "" }), { value: "", invalid: false });
eq("derive 00:00", deriveTime({ hh: "00", mm: "00" }), { value: "00:00", invalid: false });
eq("derive 23:59", deriveTime({ hh: "23", mm: "59" }), { value: "23:59", invalid: false });
eq("derive pads lone digits", deriveTime({ hh: "9", mm: "5" }), { value: "09:05", invalid: false });

// ── 8. Backspace + focus ──────────────────────────────────────────────
{
  let s = type(emptyTimeState(), "23"); // 23, focus on minutes
  s = type(s, "30");                     // 23:30
  eq("23:30", deriveTime(s), { value: "23:30", invalid: false });
  s = applyTimeBackspace(s);             // mm "30" -> "3"
  eq("backspace mm -> 3", s.mm, "3");
  s = applyTimeBackspace(s);             // mm "3" -> ""
  eq("backspace mm -> ''", s.mm, "");
  s = applyTimeBackspace(s);             // empty mm -> hop to hours
  eq("backspace hops to hours", s.focus, 0);
}

// ── 9. Round-trip parse ───────────────────────────────────────────────
eq("parse '21:30'", timeStateFromString("21:30"), { hh: "21", mm: "30" });
eq("parse garbage", timeStateFromString("nope"), { hh: "", mm: "" });
eq("parse '7:5' (unpadded) rejected", timeStateFromString("7:5"), { hh: "", mm: "" });

// ── 10. 12-hour echo (operator clarity) ───────────────────────────────
eq("00:00 -> 12:00 AM", to12Hour("00:00"), "12:00 AM");
eq("00:30 -> 12:30 AM", to12Hour("00:30"), "12:30 AM");
eq("09:05 -> 9:05 AM", to12Hour("09:05"), "9:05 AM");
eq("12:00 -> 12:00 PM", to12Hour("12:00"), "12:00 PM");
eq("13:00 -> 1:00 PM", to12Hour("13:00"), "1:00 PM");
eq("21:30 -> 9:30 PM", to12Hour("21:30"), "9:30 PM");
eq("23:59 -> 11:59 PM", to12Hour("23:59"), "11:59 PM");
eq("incomplete -> ''", to12Hour("2:3"), "");

// ── 11. Fuzz: 2000 random keystroke sequences never yield an invalid time ─
{
  // Deterministic LCG so the run is reproducible (no Date/Math.random reliance).
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let bad = 0;
  for (let i = 0; i < 2000; i++) {
    let s = emptyTimeState();
    const len = 1 + Math.floor(rnd() * 6);
    for (let k = 0; k < len; k++) {
      const ch = "0123456789:abxz/ "[Math.floor(rnd() * 17)];
      s = typeDigit(s, ch);
      if (rnd() < 0.15) s = applyTimeBackspace(s);
      if (rnd() < 0.1) s = rnd() < 0.5 ? focusPrevTime(s) : focusNextTime(s);
    }
    // Whatever the segments hold, the derived value is either "" or a real time.
    const { value, invalid } = deriveTime(s);
    if (invalid) bad++;
    if (value) {
      const m = value.match(/^([01]\d|2[0-3]):[0-5]\d$/);
      if (!m) { bad++; }
    }
    // And the raw segments themselves are always within physical bounds.
    if (s.hh && Number(s.hh) > 23) bad++;
    if (s.mm && Number(s.mm) > 59) bad++;
  }
  eq("fuzz: 2000 sequences, zero invalid times", bad, 0);
}

console.log(`\ntime-mask: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
