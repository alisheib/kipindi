/**
 * Pure, framework-free logic for the segmented date field (DD / MM / YYYY).
 *
 * Everything here is a pure function over a plain state object so it can be
 * unit-tested without a DOM. The React component (date-select.tsx) is a thin
 * shell that renders this state and wires DOM focus to `state.focus`.
 *
 * Model: the user types into one segment at a time, left to right; the "/"
 * separators are fixed chrome. Typing appends to the focused segment (caret
 * sits at the end), auto-advancing when the segment is full or the digit is
 * unambiguous. Backspace deletes within a segment, or hops to the previous
 * segment when the current one is already empty. No select-all, no value→
 * segment re-sync mid-edit — the segments are the single source of truth.
 */

export type Parsed = { y: number; m: number; d: number };
export type SegKey = "dd" | "mm" | "yyyy";
export type MaskState = { dd: string; mm: string; yyyy: string; focus: 0 | 1 | 2 };

export const SEGMENTS: ReadonlyArray<{ key: SegKey; max: number; ph: string; aria: string }> = [
  { key: "dd", max: 2, ph: "DD", aria: "Day" },
  { key: "mm", max: 2, ph: "MM", aria: "Month" },
  { key: "yyyy", max: 4, ph: "YYYY", aria: "Year" },
];

export function emptyState(): MaskState {
  return { dd: "", mm: "", yyyy: "", focus: 0 };
}

// ── Date math ────────────────────────────────────────────────────────

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}
export function parseIso(s: string): Parsed | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}
export function toIso(p: Parsed): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
export function isInRange(p: Parsed, minP: Parsed | null, maxP: Parsed | null): boolean {
  const ts = new Date(p.y, p.m - 1, p.d).getTime();
  if (minP && ts < new Date(minP.y, minP.m - 1, minP.d).getTime()) return false;
  if (maxP && ts > new Date(maxP.y, maxP.m - 1, maxP.d).getTime()) return false;
  return true;
}

export function stateFromParsed(p: Parsed): Pick<MaskState, "dd" | "mm" | "yyyy"> {
  return { dd: String(p.d).padStart(2, "0"), mm: String(p.m).padStart(2, "0"), yyyy: String(p.y) };
}

// ── Segment helpers ──────────────────────────────────────────────────

const KEYS: SegKey[] = ["dd", "mm", "yyyy"];

/** Strip non-digits and cap to the segment width. */
export function sanitize(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/**
 * Given the digits now in a segment, decide whether to auto-advance and what
 * the stored value should be. A full segment always advances. A single digit
 * advances only when it can't be the first of a two-digit value:
 *   day  > 3  (4..9 → 04..09)   month > 1 (2..9 → 02..09)
 */
export function resolveSegment(key: SegKey, digits: string, max: number): { value: string; advance: boolean } {
  if (digits.length >= max) return { value: digits.slice(0, max), advance: true };
  if (digits.length === 1) {
    const n = Number(digits);
    if (key === "dd" && n > 3) return { value: "0" + digits, advance: true };
    if (key === "mm" && n > 1) return { value: "0" + digits, advance: true };
  }
  return { value: digits, advance: false };
}

/** Pad a lone day/month digit to two on blur ("1" → "01"); year untouched. */
export function padOnBlur(key: SegKey, value: string, max: number): string {
  if ((key === "dd" || key === "mm") && value.length === 1) return value.padStart(2, "0");
  return value.slice(0, max);
}

// ── State transitions (what the test exercises) ──────────────────────

/** The user typed `raw` into the focused segment's input (native value). */
export function applyInput(state: MaskState, raw: string): MaskState {
  const seg = SEGMENTS[state.focus];
  const digits = sanitize(raw, seg.max);
  const { value, advance } = resolveSegment(seg.key, digits, seg.max);
  const next: MaskState = { ...state, [seg.key]: value };
  if (advance && state.focus < 2) next.focus = (state.focus + 1) as 0 | 1 | 2;
  return next;
}

/** Backspace: delete within the segment, or hop to the previous one if empty. */
export function applyBackspace(state: MaskState): MaskState {
  const seg = SEGMENTS[state.focus];
  const cur = state[seg.key];
  if (cur.length > 0) return { ...state, [seg.key]: cur.slice(0, -1) };
  if (state.focus > 0) return { ...state, focus: (state.focus - 1) as 0 | 1 | 2 };
  return state;
}

export function focusPrev(state: MaskState): MaskState {
  return state.focus > 0 ? { ...state, focus: (state.focus - 1) as 0 | 1 | 2 } : state;
}
export function focusNext(state: MaskState): MaskState {
  return state.focus < 2 ? { ...state, focus: (state.focus + 1) as 0 | 1 | 2 } : state;
}

/** Pad the segment we're leaving (used when focus changes). */
export function blurSegment(state: MaskState, idx: 0 | 1 | 2): MaskState {
  const seg = SEGMENTS[idx];
  return { ...state, [seg.key]: padOnBlur(seg.key, state[seg.key], seg.max) };
}

// ── Commit ───────────────────────────────────────────────────────────

/**
 * Derive an ISO date from the segments. Returns iso="" while incomplete, and
 * invalid=true only when all three are filled but the date is out of range /
 * impossible (e.g. 31/02 or before `min`).
 */
export function deriveIso(
  s: Pick<MaskState, "dd" | "mm" | "yyyy">,
  min?: string,
  max?: string,
): { iso: string; invalid: boolean } {
  const dd = padOnBlur("dd", s.dd, 2);
  const mm = padOnBlur("mm", s.mm, 2);
  if (dd.length === 2 && mm.length === 2 && s.yyyy.length === 4) {
    const p = { d: Number(dd), m: Number(mm), y: Number(s.yyyy) };
    const minP = min ? parseIso(min) : null;
    const maxP = max ? parseIso(max) : null;
    if (p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= daysInMonth(p.y, p.m) && isInRange(p, minP, maxP)) {
      return { iso: toIso(p), invalid: false };
    }
    return { iso: "", invalid: true };
  }
  return { iso: "", invalid: false };
}
