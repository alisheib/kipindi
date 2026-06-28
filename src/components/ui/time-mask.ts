/**
 * Pure, framework-free logic for the segmented 24-hour time field (HH : MM).
 *
 * Mirrors date-mask.ts: the user types into one segment at a time, left to
 * right; the ":" separator is fixed chrome. The whole point of this module is
 * that an out-of-range time is IMPOSSIBLE TO ENTER — not merely flagged after
 * the fact. Hours are bounded to 00–23 and minutes to 00–59 at the keystroke
 * level (a digit that could only produce an invalid value is rejected or
 * auto-corrected), so "55" or "90" can never land in a segment.
 *
 * Everything here is a pure function so it can be unit-tested without a DOM
 * (see scripts/time-mask.test.mts). The React shell is time-select.tsx.
 */

export type TimeSegKey = "hh" | "mm";
export type TimeMaskState = { hh: string; mm: string; focus: 0 | 1 };

export const TIME_SEGMENTS: ReadonlyArray<{ key: TimeSegKey; max: number; ph: string; aria: string }> = [
  { key: "hh", max: 2, ph: "HH", aria: "Hour (00–23)" },
  { key: "mm", max: 2, ph: "MM", aria: "Minute (00–59)" },
];

export function emptyTimeState(): TimeMaskState {
  return { hh: "", mm: "", focus: 0 };
}

/** Strip non-digits and cap to the segment width. */
export function sanitizeDigits(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/**
 * Given the digits a user is trying to put in a segment, return the value that
 * is actually allowed to stay there plus whether to auto-advance. This is the
 * heart of "impossible to enter an invalid time":
 *
 *   Hours (00–23):
 *     • one digit > 2  → pad to "0d" and advance (3..9 can only be 03..09)
 *     • one digit 0–2  → keep, wait for the second digit
 *     • two digits     → only kept if ≤ 23; otherwise the 2nd digit is rejected
 *                        (the segment stays on the single first digit)
 *   Minutes (00–59):
 *     • one digit > 5  → pad to "0d" and advance (6..9 can only be 06..09)
 *     • one digit 0–5  → keep, wait for the second digit
 *     • two digits     → always ≤ 59 by construction, advance/complete
 */
export function resolveTimeSegment(
  key: TimeSegKey,
  digits: string,
): { value: string; advance: boolean } {
  if (digits.length === 0) return { value: "", advance: false };

  if (digits.length === 1) {
    const n = Number(digits);
    if (key === "hh" && n > 2) return { value: "0" + digits, advance: true };
    if (key === "mm" && n > 5) return { value: "0" + digits, advance: true };
    return { value: digits, advance: false };
  }

  // Two digits.
  const first = digits[0];
  const val = Number(digits.slice(0, 2));
  if (key === "hh") {
    if (val <= 23) return { value: digits.slice(0, 2), advance: true };
    // e.g. "2" then "5" → 25 is invalid; reject the keystroke, keep the "2".
    return { value: first, advance: false };
  }
  // minutes: "00".."59" always valid (first digit was already clamped to 0–5).
  return { value: digits.slice(0, 2), advance: true };
}

/** Pad a lone hour/minute digit to two on blur ("9" → "09"). */
export function padTimeOnBlur(value: string): string {
  if (value.length === 1) return value.padStart(2, "0");
  return value.slice(0, 2);
}

// ── State transitions (exercised by the unit tests) ──────────────────

/** The user typed `raw` into the focused segment's native input. */
export function applyTimeInput(state: TimeMaskState, raw: string): TimeMaskState {
  const seg = TIME_SEGMENTS[state.focus];
  const prev = state[seg.key];
  const digits = sanitizeDigits(raw, seg.max);
  const { value, advance } = resolveTimeSegment(seg.key, digits);
  // A rejected 2nd digit (value shorter than the digits typed) must not wipe
  // the segment — keep whatever was already valid.
  const nextVal = value.length === 0 && prev.length > 0 && digits.length > prev.length ? prev : value;
  const next: TimeMaskState = { ...state, [seg.key]: nextVal };
  if (advance && state.focus < 1) next.focus = 1;
  return next;
}

/** Backspace: delete within the segment, or hop to the previous one if empty. */
export function applyTimeBackspace(state: TimeMaskState): TimeMaskState {
  const seg = TIME_SEGMENTS[state.focus];
  const cur = state[seg.key];
  if (cur.length > 0) return { ...state, [seg.key]: cur.slice(0, -1) };
  if (state.focus > 0) return { ...state, focus: 0 };
  return state;
}

export function focusPrevTime(state: TimeMaskState): TimeMaskState {
  return state.focus > 0 ? { ...state, focus: 0 } : state;
}
export function focusNextTime(state: TimeMaskState): TimeMaskState {
  return state.focus < 1 ? { ...state, focus: 1 } : state;
}

// ── Commit ───────────────────────────────────────────────────────────

/**
 * Derive an "HH:MM" string from the segments. Returns value="" while
 * incomplete, and invalid=true only when both are filled but somehow out of
 * range (defence in depth — resolveTimeSegment should make this unreachable).
 */
export function deriveTime(s: Pick<TimeMaskState, "hh" | "mm">): { value: string; invalid: boolean } {
  const hh = padTimeOnBlur(s.hh);
  const mm = padTimeOnBlur(s.mm);
  if (hh.length === 2 && mm.length === 2) {
    const h = Number(hh);
    const m = Number(mm);
    if (Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { value: `${hh}:${mm}`, invalid: false };
    }
    return { value: "", invalid: true };
  }
  return { value: "", invalid: false };
}

/** Parse an "HH:MM" string back into segment state (for controlled value sync). */
export function timeStateFromString(s: string): Pick<TimeMaskState, "hh" | "mm"> {
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { hh: "", mm: "" };
  return { hh: m[1], mm: m[2] };
}

/**
 * Human-readable 12-hour rendering of an "HH:MM" 24-hour string, e.g.
 * "21:30" → "9:30 PM", "00:05" → "12:05 AM". Returns "" if incomplete. This is
 * shown next to the field so the operator is never unsure whether they entered
 * morning or evening.
 */
export function to12Hour(value: string): string {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const mm = m[2];
  if (h < 0 || h > 23) return "";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}
