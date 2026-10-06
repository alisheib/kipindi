import { readFileSync } from "node:fs";
import {
  emptyState, applyInput, applyBackspace, focusPrev, focusNext, blurSegment,
  deriveIso, resolveSegment, sanitize, padOnBlur, SEGMENTS, type MaskState,
} from "../src/components/ui/date-mask.ts";

let pass = 0, fail = 0;
function eq(label: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log(`FAIL ${label}\n   got ${g}\n   exp ${e}`); }
}

// Simulate the native input: typing a digit appends at the end (caret at end,
// no select-all), capped at the segment width, then resolve/advance.
function typeDigit(s: MaskState, d: string): MaskState {
  const seg = SEGMENTS[s.focus];
  const raw = (s[seg.key] + d); // native value becomes current + new char
  return applyInput(s, raw);
}
function type(s: MaskState, keys: string): MaskState {
  for (const k of keys) s = typeDigit(s, k);
  return s;
}
const view = (s: MaskState) => `${s.dd || "DD"}/${s.mm || "MM"}/${s.yyyy || "YYYY"}@${s.focus}`;

// 1. The reported bug: typing "10" must stay "10", never "01".
{
  let s = emptyState();
  s = typeDigit(s, "1"); eq("type 1 -> dd=1, stay", [s.dd, s.focus], ["1", 0]);
  s = typeDigit(s, "0"); eq("type 10 -> dd=10, advance to mm", [s.dd, s.focus], ["10", 1]);
}

// 2. Single "1" then leaving pads to "01".
{
  let s = emptyState();
  s = typeDigit(s, "1");
  s = blurSegment(s, 0);
  eq("type 1 then blur -> dd=01", s.dd, "01");
}

// 3. Full date typed straight through: 10/05/1990
{
  let s = type(emptyState(), "10051990");
  eq("10051990 segments", [s.dd, s.mm, s.yyyy], ["10", "05", "1990"]);
  eq("10051990 iso", deriveIso(s).iso, "1990-05-10");
}

// 4. Smart advance: day 5 -> "05" advance; month 7 -> "07" advance.
{
  let s = emptyState();
  s = typeDigit(s, "5"); eq("day 5 -> 05 advance", [s.dd, s.focus], ["05", 1]);
  s = typeDigit(s, "7"); eq("month 7 -> 07 advance", [s.mm, s.focus], ["07", 2]);
  s = type(s, "2026");  eq("year 2026", s.yyyy, "2026");
  eq("05/07/2026 iso", deriveIso(s).iso, "2026-07-05");
}

// 5. Day "1" does NOT auto-advance (could be 10-19); "2" in month DOES (>1).
{
  let s = emptyState();
  s = typeDigit(s, "1"); eq("day 1 stays (ambiguous)", s.focus, 0);
  s = typeDigit(s, "2"); eq("day 12 advances", [s.dd, s.focus], ["12", 1]);
  s = typeDigit(s, "1"); eq("month 1 stays (ambiguous)", s.focus, 1);
  s = typeDigit(s, "2"); eq("month 12 advances", [s.mm, s.focus], ["12", 2]);
}

// 6. Backspace within a segment, then hop to previous when empty.
{
  let s = type(emptyState(), "10051990"); // 10/05/1990 @2
  s = applyBackspace(s); eq("bksp year -> 199", [s.yyyy, s.focus], ["199", 2]);
  s = applyBackspace(s); s = applyBackspace(s); s = applyBackspace(s); // 199 -> ""
  eq("year emptied stays focus 2", [s.yyyy, s.focus], ["", 2]);
  s = applyBackspace(s); eq("bksp on empty year hops to mm", s.focus, 1);
  eq("mm still 05", s.mm, "05");
  s = applyBackspace(s); eq("bksp deletes mm last -> 0", s.mm, "0");
}

// 7. Correct-in-place: delete month and retype.
{
  let s = type(emptyState(), "31122026"); // 31/12/2026
  // user clicks month (focus 1), deletes both digits, types 06
  s = { ...s, focus: 1 };
  s = applyBackspace(s); s = applyBackspace(s); eq("mm cleared", s.mm, "");
  s = type(s, "06"); eq("retype mm=06", [s.mm, s.focus], ["06", 2]);
  eq("31/06 invalid (June has 30 days)", deriveIso(s).invalid, true);
}

// 8. Validation: impossible + range.
{
  eq("31/02 impossible", deriveIso({ dd: "31", mm: "02", yyyy: "2000" }).invalid, true);
  eq("29/02/2000 leap ok", deriveIso({ dd: "29", mm: "02", yyyy: "2000" }).iso, "2000-02-29");
  eq("29/02/2001 not leap", deriveIso({ dd: "29", mm: "02", yyyy: "2001" }).invalid, true);
  eq("before min", deriveIso({ dd: "01", mm: "01", yyyy: "1990" }, "2000-01-01").invalid, true);
  eq("after max (DOB 18+)", deriveIso({ dd: "01", mm: "01", yyyy: "2020" }, "1930-01-01", "2008-06-10").invalid, true);
  eq("valid DOB", deriveIso({ dd: "15", mm: "06", yyyy: "1995" }, "1930-01-01", "2008-06-10").iso, "1995-06-15");
}

// 9. Junk input ignored; over-typing capped.
{
  let s = emptyState();
  s = applyInput(s, "a1b"); eq("letters stripped -> dd=1", s.dd, "1");
  s = applyInput(s, "9999"); eq("dd capped to 2 -> 99 (advance)", [s.dd, s.focus], ["99", 1]);
  eq("99 day invalid once full date", deriveIso({ dd: "99", mm: "01", yyyy: "2000" }).invalid, true);
}

// 10. Paste a full date string into first segment.
{
  let s = applyInput(emptyState(), "10/05/1990"); // paste; sanitize keeps first 2 of dd
  eq("paste into dd keeps 10, advances", [s.dd, s.focus], ["10", 1]);
}

// 11. ⭐ 2026-10-06 — the component keeps a date typed before its script arrived. The boxes are controlled by state that
// never heard keystrokes made before hydration, so the first re-render after mount WIPED them and the form posted no
// date (measured on the sign-up form with the page's scripts held back). Source: the mount catch-up must read the
// boxes' own values and emit them; the browser half is a drive.
{
  const SRC = readFileSync(new URL("../src/components/ui/date-select.tsx", import.meta.url), "utf8");
  const adopts = (s: string) => /const typed = refs\.map\(\(r\) => r\.current\?\.value \?\? ""\);/.test(s)
    && /setDd\(next\.dd\); setMm\(next\.mm\); setYyyy\(next\.yyyy\);\s*emit\(next\.dd, next\.mm, next\.yyyy\);/.test(s);
  eq("DateSelect adopts a date typed before hydration (reads its boxes on mount, then emits)", adopts(SRC), true);
  eq("control · without the emit the check fails", adopts(SRC.replace("emit(next.dd, next.mm, next.yyyy);", "")), false);
}

// 12. ⭐ 2026-10-06 — the same rule for the kit Checkbox, the sign-up form's 18+ and terms boxes (no suite of its own; it
// sits beside the date control's). A tick made before hydration checked the real input, but the painted square — drawn
// from state that starts at `defaultChecked` — showed it EMPTY, so a player tapped again and un-ticked it. The
// uncontrolled box must read its input once on mount (measured with the scripts held back: real checked, painted empty).
{
  const SRC = readFileSync(new URL("../src/components/ui/checkbox.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const reads =(s: string) => /const follow = \(\) => setInternal\(el\.checked\);[\s\S]{0,600}?\n\s*follow\(\);\n\s*el\.addEventListener\("input", follow\);/.test(s);
  eq("Checkbox paints a tick made before hydration (follows its input once on mount)", reads(SRC), true);
  eq("control · without the mount read the check fails", reads(SRC.replace(/\n\s*follow\(\);\n/, "\n")), false);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
