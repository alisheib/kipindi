"use client";

/**
 * Input atom — kit-faithful (kit/atoms.jsx → Input).
 * - prefix slot (e.g. "TZS", "+255") locked in a sub-cell with a divider
 * - mono variant (font-mono + tabular-nums) for amounts + numeric input
 * - error state — red border + tinted background
 * - controlled OR uncontrolled (defaultValue + value both supported)
 * - kit "input-group" semantic — works as a child of <label>
 *
 * STRICT NUMERIC MODE — any field declared numeric (`type="number"`, or
 * `inputMode="numeric"`/`"decimal"`) is rendered as a filtered text box: every
 * keystroke and paste is sanitised down to a valid number, so letters / "e" /
 * stray symbols can NEVER land in the value. This is enforced centrally here so
 * every numeric field across the app (admin + wallet + profile) is strict by
 * construction — no per-call-site discipline required. Decimals are allowed
 * automatically for `inputMode="decimal"` or a fractional `step`; negatives only
 * when `allowNegative` is set (default off — counts, rates, amounts are ≥ 0).
 *
 * ⭐ A WHOLE-NUMBER BOX NEVER CHANGES THE SIZE OF A NUMBER (vb6, 2026-10-03). It used to delete every dot, so a pasted
 * "12.50" became 1250 and "1,500.50" became 150050 — a 100× change that passes every range check, on live money fields
 * (the agent rail's refund and receipt amounts, config's min and max stake, and now the console's balance adjustment,
 * which had hand-rolled its own box). Every change is now read by `numericStep`:
 *   · a PASTE or a DROP that holds a decimal mark keeps what it brought up to it, and the Field says the rest was dropped;
 *   · a TYPED dot is not inserted and the value stays; a digit typed straight after it, at the caret where it was
 *     refused, is dropped — and only then does the Field say so — and so is one typed after a comma or a letter there
 *     ("9500.,00" ends on 9500), until a named key, a blur, a deletion, a change over a selection, a caret that settles
 *     anywhere else (a tap) or anything that lands elsewhere; so "12500.00" typed key by key ends on 12500. A dot typed
 *     with no digit before it (an empty box) holds nothing: there is no number for a fraction to multiply;
 *   · a stray dot typed inside a number keeps every digit that was already there, and says nothing: nothing was lost.
 * A decimal mark is a dot or a Chinese keyboard's full stop (U+3002, U+FF0E, U+FF61) — never a currency's abbreviation
 * ("Tsh. 9,500" keeps 9500) — or, in a paste, a comma before its last one or two digits ("9 500,00" keeps 9500). A
 * TYPED comma is read as grouping, so "9500,00" typed key by key still reads 950000: owed (DESIGN_AUTHORITY §A7).
 * A phone-number box (`type="tel"`: PhoneInput, the deposit number) reads a dot or a dash as a separator, exactly as
 * before, and says nothing. `test:numeric` drives `numericBox` — the object each box keeps — key by key.
 *
 * ⭐ AND `Field` WIRES WHAT IT WRAPS (vb6). The legend, the error line (`role="alert"`), the notice (`role="status"`,
 * always mounted, so a screen reader hears its words arrive) and the hint get ids, and the kit control inside — this
 * Input, `Textarea`, `Select`, `DateSelect` — reads them through `useFieldWiring`: `aria-describedby`, `aria-invalid`,
 * `aria-required`, and the legend as its name. DESIGN_AUTHORITY §A7 holds the rule.
 *
 * ⭐ THREE ADDITIONS FOR THE BET SHEET'S STAKE BOX (Vodacom S8 WP5, VODACOM-PLAN §2 and §0g's design calls), EACH INERT
 * UNLESS SET — a box that names none of them renders and behaves byte for byte as it did (`test:numeric`'s census
 * renders every call site's configuration through the kit before and after, and holds the markup equal):
 *   · `grouped` — a whole-number box that SHOWS its digits in thousands groups while they are typed ("5,000"), keeps
 *     the caret by digit index across a regrouping, opens the numeric keypad and holds at most nine digits. What its
 *     caller reads is the DIGITS: `e.target.value` inside its `onChange`, and the hidden field that carries its `name`.
 *     Every change still goes through `numericStep`, so a paste reads exactly as it reads in any whole-number box;
 *   · `attention` — "too much": a strong NEUTRAL border (`--input-attention`). ⛔ It is not an error: it never paints
 *     the error's red, gold or the NO ink, and it sets no `aria-invalid` (a caller that means "invalid" says so itself).
 *     The words it points at are the caller's `aria-describedby`;
 *   · `size="xl"` — the control ladder's top rung, `--h-control-xl` (56px), with its figure on `--type-h2` (24px).
 *     S8-PLAN A18: the canvas drew 60px and 26px, which sit on no rung; Ali's answer of 2026-10-12 took the nearest.
 */
import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { FieldLegend } from "@/components/ui/field-legend";
import { useT } from "@/lib/i18n";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
  mono?: boolean;
  error?: boolean | string;
  /**
   * Rendered height: sm 40 · md 44 · lg 48 · xl 56 (px). See the warning on `heightCls`
   * below — these are arbitrary values, not spacing-scale classes, on purpose.
   */
  size?: "sm" | "md" | "lg" | "xl";
  containerClassName?: string;
  /** Force-allow a decimal point (otherwise inferred from inputMode/step). */
  allowDecimal?: boolean;
  /** Allow a leading minus sign. Default false — numeric fields are ≥ 0. */
  allowNegative?: boolean;
  /** (S8 WP5) A whole-number box shown in thousands groups, its caller reading the digits; nine digits at most. */
  grouped?: boolean;
  /** (S8 WP5) "Too much": the strong neutral border. Never an error, never `aria-invalid`. */
  attention?: boolean;
};

/** How a numeric box reads its text. */
export type NumericOpts = {
  /** A decimal box keeps its first dot. */
  decimal: boolean;
  /** A leading minus is kept. */
  negative: boolean;
  /** A phone-number box (`type="tel"`): a dot, a dash or a space only separates digit groups — dropped, never cut, and
   *  never reported. */
  separators?: boolean;
};

/** Strip a raw string down to a valid number literal — the WHOLE text read as one entry, as a paste into an empty box
 *  is. ⛔ A whole-number box CUTS at the first dot (`readNumericEntry`); a box being typed into reads each change with
 *  `numericStep`. */
export function sanitizeNumericInput(raw: string, opts: NumericOpts): string {
  return readNumericEntry(raw, opts).value;
}

/** What a numeric box keeps from one whole entry, and what it had to drop on the way. */
export type NumericEntry = {
  /** What the box keeps: digits, at most one dot (decimal mode only), and a leading minus where one is allowed. */
  value: string;
  /** A whole-number box met a dot: the dot and everything after it were dropped. */
  cutAtDot: boolean;
  /** A box that refuses negatives met a leading minus, and dropped it. */
  droppedMinus: boolean;
};

/* ⭐ (vb6) THE FULL STOPS A WHOLE-NUMBER BOX READS AS A DOT, besides the ASCII one: the ideographic, full-width and
   half-width ideographic full stops (U+3002, U+FF0E, U+FF61) that a Chinese keyboard types. Read as nothing, they made
   "12500" + U+3002 + "00" read 1250000. */
const FULL_STOPS = new RegExp("[" + String.fromCharCode(0x3002, 0xff0e, 0xff61) + "]", "g");

/** The text with each of those full stops written as the ASCII dot — one character for one, so a caret still points
 *  where it pointed. */
function plainDots(text: string): string {
  return text.replace(FULL_STOPS, ".");
}

/**
 * ⭐ WHAT A WHOLE-NUMBER BOX READS IN A TEXT (vb6), one character for one so a caret still points where it pointed:
 *   · each full stop as the ASCII dot (`plainDots`);
 *   · a dot that directly follows a letter BEFORE any digit has appeared — a currency's abbreviation leading the
 *     number: "Tsh. 9,500", "TSh. 9,500.00", "Sh.9,500" — as nothing (a space, which the reading strips). Cut there,
 *     the box emptied and said a fraction was dropped. Once a digit has appeared — in the text, or in the box before
 *     the caret (`digitsBefore`) — every dot is a decimal mark, so "9500a.50" keeps 9500, and "Tsh.50" pasted after a
 *     9500 already in the box keeps 9500: never 950050;
 *   · when `entry` — the text is everything that ARRIVED, a paste or a drop — a comma before its LAST one or two digits
 *     as the decimal mark it must be: grouping always leads three digits, so "9 500,00" keeps 9500, never 950000.
 *     ⚠️ A TYPED comma cannot be read so — the digits after it have not arrived yet — so "9500,00" typed key by key
 *     still reads 950000: owed (DESIGN_AUTHORITY §A7).
 */
function wholeText(text: string, entry: boolean, digitsBefore = false): string {
  const dots = plainDots(text);
  let out = "";
  let digitSeen = digitsBefore;
  for (let i = 0; i < dots.length; i++) {
    const c = dots[i];
    out += c === "." && !digitSeen && i > 0 && /[A-Za-z]/.test(dots[i - 1]) ? " " : c;
    if (/[0-9]/.test(c)) digitSeen = true;
  }
  return entry ? out.replace(/,([0-9]{1,2})([^0-9]*)$/, ".$1$2") : out;
}

/**
 * ⭐ THE READING OF ONE WHOLE ENTRY (vb6, 2026-10-03) — `sanitizeNumericInput` is its `value`.
 *
 * 🔴 THE WHOLE-NUMBER BRANCH USED TO DELETE EVERY DOT. A pasted "12.50" became 1250, "1,500.50" became 150050 and
 * "12,500.00" became 1250000: a 100× change that passes every range check, on live money fields. ⛔ It now CUTS at the
 * first decimal mark — "12.50" keeps 12, "1,500.50" keeps 1500 — so a number is never multiplied. A European "1.500"
 * keeps 1, which is visible, and the Field says why. What counts as a decimal mark is `wholeText`'s: a dot or a Chinese
 * full stop, never a currency's abbreviation dot, and a comma before the entry's last one or two digits.
 * ⚠️ Decimal mode is unchanged: it keeps the first dot and drops any later one. A minus survives only where negatives
 * are allowed; where they are not, dropping it is reported, because "-5" becoming 5 is a sign change no range catches.
 */
export function readNumericEntry(entry: string, opts: NumericOpts): NumericEntry {
  return readText(entry, opts, true);
}

/** The reading itself. `entry`: the text is all that arrived, so a comma before its last one or two digits is its
 *  decimal mark (`wholeText`); a text the box composed around what arrived — or a part of one, read for a caret — is
 *  read without that rule. */
function readText(text: string, opts: NumericOpts, entry: boolean): NumericEntry {
  const raw = opts.decimal ? text : wholeText(text, entry);
  if (opts.separators) return { value: raw.replace(/[^0-9]/g, ""), cutAtDot: false, droppedMinus: false };
  const signed = /^\s*-/.test(raw);
  let s = raw.replace(/[^\d.]/g, "");          // keep digits + dots only
  let cutAtDot = false;
  const dot = s.indexOf(".");
  if (opts.decimal) {
    if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, ""); // first dot only
  } else if (dot >= 0) {
    s = s.slice(0, dot);                        // ⛔ CUT at the first dot — never delete it
    cutAtDot = true;
  }
  return { value: (opts.negative && signed ? "-" : "") + s, cutAtDot, droppedMinus: signed && !opts.negative };
}

/** What a box owes its officer a line for: digits after a dot it cut or dropped, a minus it dropped. */
export type NumericOwed = { dot: boolean; minus: boolean };

/** What a numeric box carries from one change to the next. */
export type NumericMemory = {
  /**
   * Where a refused dot holds — the caret, in what the box keeps, at which the dot was refused — or `null` when nothing
   * holds. A digit typed AT that caret is the dot's fraction, and is dropped; a digit typed anywhere else is a digit.
   */
  latchedAt: number | null;
  /** The line the box owes, or `null`. */
  owed: NumericOwed | null;
};

export const NO_NUMERIC_MEMORY: NumericMemory = { latchedAt: null, owed: null };

/** One change, as the browser reports it to the change handler. */
export type NumericChange = {
  /** The text the box held before the change, or `null` when it is not known. */
  before: string | null;
  /** The text after the browser applied the change (`e.target.value`). */
  raw: string;
  /** The caret after the change (`e.target.selectionEnd`), or `null` when the box cannot say. */
  caret: number | null;
  /** The change replaced a selection that held text — a select-all and a paste, a key typed over a selection. Absent
   *  counts as no. */
  replaced?: boolean;
};

/** What the box keeps after one change, where its caret goes, and what it carries to the next. */
export type NumericStep = { value: string; caret: number | null; memory: NumericMemory };

/**
 * Where a change put new text: the span of `raw` that was not there before, or `null` when it cannot be told.
 * ⭐ The CARET marks the end of what arrived, and everything after it must be the box's old tail — so a paste whose own
 * last digits happen to match the old text is never mistaken for the old text, which a plain prefix-and-suffix diff
 * would do (a pasted "12.50" over a selected "1000" would leave "120").
 */
function insertedSpan(before: string | null, raw: string, caret: number | null): { start: number; end: number } | null {
  if (before === null || caret === null || caret < 0 || caret > raw.length) return null;
  const tailLength = raw.length - caret;
  if (tailLength > before.length || raw.slice(caret) !== before.slice(before.length - tailLength)) return null;
  const headMax = Math.min(caret, before.length - tailLength);
  let start = 0;
  while (start < headMax && raw[start] === before[start]) start++;
  return { start, end: caret };
}

/**
 * ⭐ ONE CHANGE TO A NUMERIC BOX — the rule every keystroke, paste and drop goes through (vb6, 2026-10-03).
 *
 * In a whole-number box:
 *   ① a digit typed straight after a refused dot — AT the caret where the dot was refused, replacing nothing — is its
 *     fraction: it is DROPPED, the box keeps exactly what it held, and the Field now says so. A character the reading
 *     strips (a comma, a space, a letter, a minus) typed there moves nothing, so the dot still holds: "9500.,00" ends on
 *     9500. The hold ends on a named key (`numericKey`), a blur (`numericBlur`), a deletion, a change that replaced a
 *     selection (a select-all and a paste), a caret that settles anywhere else (`numericBox`'s `select` — a tap or a
 *     click, which a phone with no arrow keys depends on), or anything that lands anywhere else. So "12500.00" typed
 *     key by key ends on 12500, never 1250000;
 *   ② a decimal mark in what arrived (`wholeText`: a dot, a Chinese full stop, or a comma before its last one or two
 *     digits — never a currency's abbreviation dot) keeps what arrived up to it and drops the mark and the rest, while
 *     the box's own text on both sides stays: a pasted "12,500.00" or "9 500,00" keeps what came before the mark, and a
 *     stray dot typed inside "125000" keeps every digit. A dot that ENDED what arrived (a typed ".", or a paste ending
 *     in one) starts the hold of ①, at the caret — but only where a whole number stands before that caret: in an empty
 *     box there is nothing a fraction could multiply, and a hold would only swallow the digits that follow.
 * When what arrived cannot be told from what was there, the whole text is read as one paste (`readNumericEntry`). A
 * decimal box and a phone-number box read the whole text, exactly as they always have.
 * ⛔ THE LINE IS NEVER FALSE: the dot's line ("the part after the dot was dropped") is owed only once digits after a dot
 * WERE dropped — cut from what arrived, or dropped by ① — and then until the value moves; a refused dot that dropped
 * nothing owes nothing. A dropped minus changed the SIGN of every digit typed after it, so its line lasts until the box
 * is emptied.
 */
export function numericStep(memory: NumericMemory, change: NumericChange, opts: NumericOpts): NumericStep {
  /* The reading of a text the box composed: the comma rule belongs to what arrived alone (`readText`). */
  const read = (text: string) => readText(text, opts, false);
  /* The caret in what the box keeps: the characters in front of it that survive the reading. */
  const caretIn = (text: string, at: number | null, value: string) =>
    at === null ? null : Math.min(value.length, read(text.slice(0, at)).value.length);
  /* Whether reading a text cuts digits: there is a digit after its first dot. */
  const cutsDigits = (text: string) => {
    const at = text.indexOf(".");
    return at >= 0 && /[0-9]/.test(text.slice(at + 1));
  };
  /* A refused dot holds only where a whole number stands before its caret — there is nothing else to protect. */
  const guards = (value: string, at: number | null) => /[0-9]/.test(value.slice(0, at ?? value.length));
  const cleanBefore = change.before === null ? null : read(change.before).value;
  const owing = (dot: boolean, minus: boolean, value: string): NumericOwed | null => {
    const was = memory.owed;
    const keepDot = value === cleanBefore && was !== null && was.dot;
    const keepMinus = value !== "" && was !== null && was.minus;
    const next = { dot: dot || keepDot, minus: minus || keepMinus };
    return next.dot || next.minus ? next : null;
  };

  if (opts.decimal || opts.separators) {
    const whole = read(change.raw);
    return {
      value: whole.value,
      caret: caretIn(change.raw, change.caret, whole.value),
      memory: { latchedAt: null, owed: opts.separators ? null : owing(false, whole.droppedMinus, whole.value) },
    };
  }

  const raw = plainDots(change.raw);
  const before = change.before === null ? null : plainDots(change.before);
  const caret = change.caret;
  const span = insertedSpan(before, raw, caret);
  if (span === null || before === null) {
    /* The whole text is one entry, read as `readNumericEntry` reads one — its comma rule included. */
    const whole = readNumericEntry(change.raw, opts);
    const marked = wholeText(change.raw, true);
    const caretOut = caretIn(raw, caret, whole.value);
    const holds = whole.cutAtDot && !cutsDigits(marked) && guards(whole.value, caretOut);
    return {
      value: whole.value,
      caret: caretOut,
      memory: { latchedAt: holds ? caretOut ?? whole.value.length : null, owed: owing(cutsDigits(marked), whole.droppedMinus, whole.value) },
    };
  }
  const head = raw.slice(0, span.start);
  const arrived = raw.slice(span.start, span.end);
  const tail = raw.slice(span.end);
  const removed = before.length - head.length - tail.length;
  /* The change sits exactly where a refused dot holds: at its caret, removing nothing, replacing no selection. */
  const atHold = memory.latchedAt === span.start && removed === 0 && change.replaced !== true;

  // ① the fraction of a refused dot: a digit typed at the dot's caret
  if (atHold && /^[0-9]+$/.test(arrived)) {
    return { value: before, caret: span.start, memory: { latchedAt: memory.latchedAt, owed: owing(true, false, before) } };
  }

  // ② a decimal mark in what arrived — and anything else that is not a digit is stripped by the reading, which also
  //    cuts at a dot a parent may have written into the box itself
  const marked = wholeText(arrived, true, /[0-9]/.test(head));
  const dot = marked.indexOf(".");
  const kept = dot < 0 ? marked : marked.slice(0, dot);
  const fraction = dot < 0 ? "" : marked.slice(dot + 1);
  const text = head + kept + tail;
  const entry = read(text);
  const caretOut = caretIn(text, head.length + kept.length, entry.value);
  /* Digits were dropped: the fraction that arrived held one, or the reading cut one the box itself held. */
  const cut = /[0-9]/.test(fraction) || cutsDigits(text);
  /* A character the reading strips, typed at the dot's caret, moves nothing: the dot still holds ("9500.,00"). */
  const keepsHold = atHold && dot < 0 && !/[0-9]/.test(arrived);
  return {
    value: entry.value,
    caret: caretOut,
    memory: {
      latchedAt: keepsHold ? memory.latchedAt : dot >= 0 && !/[0-9]/.test(fraction) && guards(entry.value, caretOut) ? caretOut : null,
      owed: owing(cut, entry.droppedMinus, entry.value),
    },
  };
}

/* The keys that end nothing: a modifier, or the name a phone keyboard reports for every key it does not name. */
const SILENT_KEYS = new Set([
  "Unidentified", "Process", "Dead", "Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "NumLock",
  "ScrollLock", "Fn", "FnLock", "Hyper", "Super", "Symbol", "SymbolLock", "OS",
]);

/**
 * A key went down in the box (`e.key`). A refused dot's hold ends on a NAMED key (an arrow, Home, Backspace, Enter,
 * Tab), judged here. A printable key is judged by the change it makes in `numericStep`: a digit at the dot's caret is
 * its fraction, a character the reading strips leaves the hold standing, and a paste shortcut's own digits are still
 * the dot's fraction.
 * ⚠️ "Unidentified" and "Process" end nothing: an Android keyboard reports one of them for EVERY key, digits included.
 */
export function numericKey(memory: NumericMemory, key: string): NumericMemory {
  if (memory.latchedAt === null || key.length <= 1 || SILENT_KEYS.has(key)) return memory;
  return { ...memory, latchedAt: null };
}

/** The box lost focus: a refused dot's hold ends. Its line stays until the box changes. */
export function numericBlur(memory: NumericMemory): NumericMemory {
  return memory.latchedAt === null ? memory : { ...memory, latchedAt: null };
}

/** The element half of a change — what the Input's change handler holds as `e.target`. */
export type NumericTarget = {
  value: string;
  selectionEnd: number | null;
  setSelectionRange?: (start: number, end: number) => void;
};

/** One numeric box: its memory, and the five events the Input hands it. */
export type NumericBox = {
  /** The box's text, read off the element — on focus, and once a form reset has run. */
  seen: (value: string) => void;
  /** The selection the element holds now (`selectionStart`, `selectionEnd`) — read on every select event and on every
   *  key, so the next change knows whether it replaced text that was selected, and a caret that settles away from a
   *  refused dot's caret ends its hold. */
  select: (start: number | null, end: number | null) => void;
  /** A key went down (`e.key`). */
  key: (key: string) => void;
  /** The change event: reads `target`, writes back what the box keeps (and the caret), and returns the line now owed.
   *  `before` is the text a CONTROLLED box held (its `value`); an uncontrolled box remembers its own. */
  change: (target: NumericTarget, opts: NumericOpts, before?: string) => NumericOwed | null;
  /** The box lost focus. */
  blur: () => void;
  /** Something other than the officer moved the value (a parent, a form reset): the hold and the line end. Returns
   *  whether there was a line to take back. */
  moved: (value: string | null) => boolean;
  /** The line the box owes now. */
  owed: () => NumericOwed | null;
};

/**
 * ⭐ THE INPUT'S NUMERIC HANDLERS, WITHOUT REACT (vb6). Each Input keeps one in a ref and calls it from `onFocus`,
 * `onSelect`, `onKeyDown`, `onChange` and `onBlur` with the real element; `test:numeric` drives this same object with a
 * stand-in element, key by key — so the typed path is proven on the code a box runs, not on a description of it.
 * `change` writes back only when the box keeps something other than what the browser holds, and then puts the caret
 * where the kept text ends, so the next key lands where the officer is looking (a write moves a caret to the end).
 * ⚠️ A change cannot see the selection it replaced — the browser has already collapsed it — so the box keeps the last
 * one it was told of: a select-all followed by a paste reaches `numericStep` as a change that REPLACED text.
 */
export function numericBox(): NumericBox {
  let memory: NumericMemory = NO_NUMERIC_MEMORY;
  let before: string | null = null;
  /* The selection last reported held text, so the next change replaces it. */
  let selected = false;
  return {
    seen: (value) => { before = value; },
    select: (start, end) => {
      selected = start !== null && end !== null && end > start;
      /* ⭐ A caret that settles anywhere but the dot's caret — a tap, a click — ends the hold: the officer has moved on,
         and on a phone with no arrow keys this is the only way to say so. */
      if (start !== null && start === end && memory.latchedAt !== null && start !== memory.latchedAt) memory = { ...memory, latchedAt: null };
    },
    key: (key) => { memory = numericKey(memory, key); },
    change: (target, opts, given) => {
      const replaced = selected;
      selected = false;
      const next = numericStep(memory, { before: given ?? before, raw: target.value, caret: target.selectionEnd, replaced }, opts);
      if (next.value !== target.value) {
        target.value = next.value;
        if (next.caret !== null && typeof target.setSelectionRange === "function") {
          try { target.setSelectionRange(next.caret, next.caret); } catch { /* a box that holds no caret */ }
        }
      }
      memory = next.memory;
      before = next.value;
      return memory.owed;
    },
    blur: () => { memory = numericBlur(memory); },
    moved: (value) => {
      const had = memory.owed !== null;
      memory = NO_NUMERIC_MEMORY;
      before = value;
      selected = false;
      return had;
    },
    owed: () => memory.owed,
  };
}

/* ═══ S8 WP5 · THE GROUPED BOX ═══════════════════════════════════════════════════════════════════════════════════════
   A grouped box SHOWS "12,500" and HOLDS 12500. Each change is carried from the text it shows into its digits, read by
   `numericStep` exactly as any whole-number box reads it, and carried back. Only the box's OWN separators are taken
   out: what ARRIVED reaches `numericStep` as it arrived, so a pasted "9 500,00" still keeps 9500 and a pasted
   "12,500.00" still keeps 12500 and owes the dot's line. */

/** The most digits a grouped box holds: nine (TZS 999,999,999). A change that would hold more is refused whole — the
 *  box keeps what it held — because cutting a pasted number to nine digits would change its size (vb6's rule). */
export const GROUPED_MAX_DIGITS = 9;

/** How a grouped box reads: a whole number, never negative — whatever else the box declares (a `type="tel"` too). */
const GROUPED_OPTS: NumericOpts = { decimal: false, negative: false };

/** The box's own separator, as `formatNumber` writes it. */
const GROUP_MARK = /,/g;

/** A grouped box's digits, as it shows them: "12500" → "12,500"; "" stays "". */
export function groupedText(digits: string): string {
  return digits === "" ? "" : formatNumber(Number(digits));
}

/** The digits a grouped box's text holds, leading zeros dropped ("0500" holds 500 — the same number). */
export function groupedDigits(text: string): string {
  return text.replace(/[^0-9]/g, "").replace(/^0+(?=[0-9])/, "");
}

/** How many digits stand in front of a caret. */
function digitsAhead(text: string, at: number): number {
  return text.slice(0, at).replace(/[^0-9]/g, "").length;
}

/** The caret just after a text's n-th digit (the start, for none). */
function caretAfterDigit(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) if (/[0-9]/.test(text[i]) && ++seen === n) return i + 1;
  return text.length;
}

/** What a grouped box keeps after one change: `value` its digits, `text` what it shows, `caret` in that text. */
export type GroupedStep = NumericStep & { text: string };

/**
 * ⭐ ONE CHANGE TO A GROUPED BOX. `change` is in the coordinates of the text the box shows ("12,500"); the step is
 * taken by `numericStep` in the coordinates of its digits, with the refused dot's hold kept in those, and the caret
 * comes back to the same DIGIT it followed — so a digit typed inside a group lands where it was typed, whatever the
 * regrouping did around it. A change that would hold more than `GROUPED_MAX_DIGITS` is refused: the box keeps its text,
 * the caret goes back to where the change began, and nothing it carries moves.
 */
export function groupedStep(memory: NumericMemory, change: NumericChange, opts: NumericOpts): GroupedStep {
  const before = change.before ?? "";
  const span = insertedSpan(before, change.raw, change.caret);
  const inner: NumericChange = span === null
    ? { before: null, raw: change.raw, caret: change.caret, replaced: change.replaced }
    : (() => {
        const head = change.raw.slice(0, span.start).replace(GROUP_MARK, "");
        const arrived = change.raw.slice(span.start, span.end);
        const tail = change.raw.slice(span.end).replace(GROUP_MARK, "");
        return { before: before.replace(GROUP_MARK, ""), raw: head + arrived + tail, caret: head.length + arrived.length, replaced: change.replaced };
      })();
  const step = numericStep(memory, inner, opts);
  const value = groupedDigits(step.value);
  /* Removing the leading 1 from 1,000 leaves three zero placeholders. Showing only 0 would make a replacement 5
     produce 50 instead of 5,000. Keep these editable places until blur; the caller still reads the same numeric 0.
     A pasted leading zero is normalized as before, and ordinary 0 then 5 typing still holds 5. */
  const keepZeroPlaces = /^0\d/.test(step.value) && (change.raw.length < before.length || /^0\d/.test(before.replace(GROUP_MARK, "")));
  if (value.length > GROUPED_MAX_DIGITS || (keepZeroPlaces && step.value.length > GROUPED_MAX_DIGITS)) {
    const kept = groupedDigits(before);
    const text = groupedText(kept);
    return { value: kept, text, caret: span === null ? null : caretAfterDigit(text, digitsAhead(before, span.start)), memory };
  }
  /* The leading zeros dropped stood in front of the caret and of a refused dot's caret. */
  const zeros = keepZeroPlaces ? 0 : step.value.length - value.length;
  const shift = (at: number | null) => (at === null ? null : Math.max(0, at - zeros));
  const text = keepZeroPlaces ? step.value.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : groupedText(value);
  const at = shift(step.caret);
  return {
    value,
    text,
    caret: at === null ? null : caretAfterDigit(text, at),
    memory: { latchedAt: shift(step.memory.latchedAt), owed: step.memory.owed },
  };
}

/**
 * ⭐ THE GROUPED BOX'S HANDLERS — `numericBox`'s five events, in the coordinates of the text the box shows. The Input
 * keeps one in place of its `numericBox` when `grouped` is set, and calls it from the same handlers; `test:numeric`
 * drives it key by key with the same stand-in element. `before`, when the box is controlled, is the controlled value —
 * its digits or its text, either: both are read as digits and shown grouped.
 */
export function groupedBox(): NumericBox {
  let memory: NumericMemory = NO_NUMERIC_MEMORY;
  let before: string | null = null;
  let selected = false;
  let keyPressed: string | null = null;
  const shown = (value: string) => groupedText(groupedDigits(value));
  return {
    seen: (value) => { before = value; },
    select: (start, end) => {
      selected = start !== null && end !== null && end > start;
      if (start !== null && start === end && memory.latchedAt !== null && digitsAhead(before ?? "", start) !== memory.latchedAt) {
        memory = { ...memory, latchedAt: null };
      }
    },
    key: (key) => { keyPressed = key; memory = numericKey(memory, key); },
    change: (target, _opts, given) => {
      const replaced = selected;
      selected = false;
      const from = given === undefined || (before !== null && groupedDigits(before) === groupedDigits(given)) ? before : shown(given);
      const next = groupedStep(memory, { before: from, raw: target.value, caret: target.selectionEnd, replaced }, GROUPED_OPTS);
      /* Deleting a display comma restores that comma. Forward Delete must move past it, or every subsequent Delete
         repeats forever at the same separator; Backspace already lands on its left. */
      const at = target.selectionEnd;
      if (keyPressed === "Delete" && from !== null && at !== null && from[at] === ","
        && target.value === from.slice(0, at) + from.slice(at + 1) && next.caret !== null && next.text[next.caret] === ",") {
        next.caret++;
      }
      keyPressed = null;
      if (next.text !== target.value) {
        target.value = next.text;
        if (next.caret !== null && typeof target.setSelectionRange === "function") {
          try { target.setSelectionRange(next.caret, next.caret); } catch { /* a box that holds no caret */ }
        }
      }
      memory = next.memory;
      before = next.text;
      return memory.owed;
    },
    blur: () => { memory = numericBlur(memory); },
    moved: (value) => {
      const hadLine = memory.owed !== null;
      memory = NO_NUMERIC_MEMORY;
      before = value === null ? null : shown(value);
      selected = false;
      keyPressed = null;
      return hadLine;
    },
    owed: () => memory.owed,
  };
}

/**
 * ⭐ WHAT A GROUPED BOX'S CALLER READS: its digits, including from a deferred state updater. Temporarily changing the
 * live element back to digits let that updater read "12,500" after the handler restored the display, and also wrote
 * the browser's edit twice. The event instead has an input target whose value is the committed digits; its other
 * properties and methods still belong to the real input, which keeps its grouped text and caret throughout.
 */
export function readsDigits(
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined,
  digits: (value: string) => void,
): React.ChangeEventHandler<HTMLInputElement> {
  return (e) => {
    const el = e.target;
    const held = groupedDigits(el.value);
    digits(held);
    if (onChange === undefined) return;
    const target = new Proxy(el, {
      get: (input, key) => {
        if (key === "value") return held;
        const value = Reflect.get(input, key, input);
        return typeof value === "function" ? value.bind(input) : value;
      },
    });
    const change = Object.create(e, {
      target: { value: target },
      currentTarget: { value: target },
    }) as React.ChangeEvent<HTMLInputElement>;
    onChange(change);
  };
}

/** The dictionary words (`t.common`) of the line a box owes, by what it dropped. */
export const NUMERIC_NOTICE_KEYS = { dot: "wholeNumbersOnly", minus: "noNegativeNumbers" } as const;
export type NumericNoticeKey = (typeof NUMERIC_NOTICE_KEYS)[keyof typeof NUMERIC_NOTICE_KEYS];

/** The keys of the line for what a Field's boxes owe, in reading order — none when nothing is owed. */
export function numericNoticeKeys(owed: NumericOwed | null): NumericNoticeKey[] {
  if (owed === null) return [];
  const keys: NumericNoticeKey[] = [];
  if (owed.dot) keys.push(NUMERIC_NOTICE_KEYS.dot);
  if (owed.minus) keys.push(NUMERIC_NOTICE_KEYS.minus);
  return keys;
}

const sameOwed = (a: NumericOwed | null, b: NumericOwed | null): boolean =>
  a === b || (a !== null && b !== null && a.dot === b.dot && a.minus === b.minus);

/**
 * ⭐ WHAT A FIELD TELLS THE CONTROL INSIDE IT (vb6, 2026-10-03). `Field` renders the legend and the lines under the box;
 * the kit control it wraps reads this and wires itself to them, so a form gets the wiring by using the kit.
 */
export type FieldWiring = {
  /** The ids of the lines under the control, in reading order: the error, a notice, the hint. */
  describedBy: string | undefined;
  /** The legend's id. A control with no name of its own takes it, so the lines are read once, as its description. */
  labelledBy: string;
  /** The Field is showing an error. */
  invalid: boolean;
  /** The Field was declared `required`. */
  required: boolean;
  /** A numeric box reports the line it owes (digits after a dot it cut or dropped, a minus it dropped), or `null` once it
   *  owes none. */
  report: (owner: string, owed: NumericOwed | null) => void;
};

const FieldContext = React.createContext<FieldWiring | null>(null);

/** The wiring of the Field this control sits in, or `null` outside one. */
export function useFieldWiring(): FieldWiring | null {
  return React.useContext(FieldContext);
}

/** Space-separated ids, each once, or `undefined` when there are none. */
export function joinIds(...groups: Array<string | null | undefined | false>): string | undefined {
  const out: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const id of group.split(/\s+/)) if (id !== "" && !out.includes(id)) out.push(id);
  }
  return out.length > 0 ? out.join(" ") : undefined;
}

/** Whether a caller's own `aria-invalid` claims the control is invalid. ⛔ The string "false" claims nothing. */
export function claimsInvalid(v: unknown): boolean {
  return v === true || v === "true" || v === "grammar" || v === "spelling";
}

// ⚠️ ARBITRARY LITERALS ON PURPOSE. `theme.extend.spacing` is OVERRIDDEN in
// tailwind.config.ts:200-215, so a scale class here is roughly DOUBLE what it
// reads as: this table used to say h-9 / h-11 / h-12 and rendered 64 / 96 / 128px
// against the 36 / 44 / 48 contract above — i.e. every un-sized field in the
// product was 96px tall. ⛔ Never "tidy" these back into h-9 / h-11 / h-12.
const heightCls: Record<NonNullable<Props["size"]>, string> = {
  // ⭐ DG-A-04 (DESIGN-GATE-2026-08-28) — WAS `h-[36px]`, AND 36 IS ON NO RUNG. The ladder is
  // 32/40/44/48/56 (`--h-control-*`), so `sm` was the one field height in the kit that named a
  // number nobody had decided; 45 instances measured on production. Ali's ruling 2026-08-29:
  // it takes `--h-control-sm` (40), not the 32 dense-admin rung — most call sites are FORMS
  // (bonuses, invites, poll editing) rather than dense rails, 40 is `--tap-min` so it stays
  // finger-safe, and where these sit beside a `btn-sm` (the ai-polls batch row) the step of 4px
  // closes to flush. ⚠️ Read the TOKEN, like `md` below, so the rung cannot drift from the ladder.
  sm: "h-[var(--h-control-sm)]",
  md: "h-[var(--h-input)]",   // 44px — the kit input token, globals.css
  lg: "h-[48px]",
  // ⭐ S8 WP5 (A18) — xl is the ladder's top rung, `--h-control-xl` (56px), read from its TOKEN in the box's own style
  // (`xlStyle` below), not by a class: a new arbitrary class here would add a utility to the stylesheet every page loads.
  xl: "",
};

const fontCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-[16px]",
  lg: "text-[16px]",
  // ⭐ S8 WP5 (A18) — xl's figure is on the type scale's 24px rung, `--type-h2` (the canvas drew 26px, on no rung), and
  // its unit cell on `--type-h4` (17px; the canvas drew "TZS" at 18px): `xlStyle`, for the same reason as the height.
  xl: "",
};

/**
 * ⭐ (S8 WP5) WHAT `size="xl"` READS — the three tokens, as the element's own style. Only an xl box carries them, so
 * every other box's markup is what it was, and the stylesheet gains nothing.
 */
const xlStyle = {
  box: { height: "var(--h-control-xl)" },
  figure: { fontSize: "var(--type-h2)" },
  unit: { fontSize: "var(--type-h4)" },
} as const;

export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { prefix, trailing, mono, error, size = "md", className, containerClassName, allowDecimal, allowNegative, grouped, attention, ...rest },
  ref,
) {
  const field = useFieldWiring();
  const owner = React.useId();
  /** (S8 WP5) The grouped box is on only when the prop says so — every branch below reads this one flag. */
  const grouping = grouped === true;

  // ── Strict numeric mode ────────────────────────────────────────────
  const { type, inputMode, step, onChange: callerChange, onKeyDown, onFocus, onBlur, onSelect, ...inputRest } = rest;
  /* A grouped box is a whole-number box whatever it declares: no decimal, no minus, no phone separators. */
  const isNumeric = grouping || type === "number" || inputMode === "numeric" || inputMode === "decimal";
  const decimal = !grouping && isNumeric && (
    allowDecimal ??
    (inputMode === "decimal" || (step !== undefined && !Number.isInteger(Number(step))))
  );
  const negative = !grouping && isNumeric && !!allowNegative;
  /* ⭐ A PHONE-NUMBER BOX READS A DOT AS A SEPARATOR (vb6). `type="tel"` is what PhoneInput and the deposit number
     declare, and in a phone number "712.345.678" is one number: cutting it at the dot would keep "712". So a tel box
     keeps every digit, as it always has, and owes no line — no "Whole numbers only" under a phone number. */
  const separators = isNumeric && type === "tel";
  const opts: NumericOpts = { decimal: !!decimal, negative, separators };
  /* (S8 WP5) The digits an UNCONTROLLED grouped box holds, for the hidden field that carries its name. */
  const [ownDigits, setOwnDigits] = React.useState(() => (grouping ? groupedDigits(String(rest.defaultValue ?? "")) : ""));
  /* Grouping an IME's live text ends its composition range; the next update then APPENDS the same digits again.
     Keep that draft exactly as the browser wrote it, and publish/group only the committed text. */
  const composing = React.useRef(false);
  const [compositionText, setCompositionText] = React.useState<string | null>(null);
  const [zeroPlacesText, setZeroPlacesText] = React.useState<string | null>(null);
  /* DOM formatting does not enter the browser's native undo stack. Keep an edit history for grouped boxes only. */
  const groupedHistory = React.useRef({ entries: [{ text: groupedText(groupedDigits(String(rest.value ?? rest.defaultValue ?? ""))), caret: 0 }], at: 0, restoring: false });
  /* ⭐ A grouped box's caller reads its digits (`readsDigits`); any other box's caller gets its own handler, untouched. */
  const onChange = grouping ? readsDigits(callerChange, setOwnDigits) : callerChange;

  /**
   * ⭐ THE BOX'S MEMORY (vb6) — one `numericBox` per box, in a ref: the Input paints nothing for it (its Field prints the
   * line), so a change must not re-render the box. Its line is reported to the Field whenever it changes, and taken back
   * when the box unmounts, when its form is reset, and when a controlled parent moves the value (a save that clears it,
   * a Discard) — told apart from the parent echoing what the box itself just wrote.
   */
  const box = React.useRef<NumericBox | null>(null);
  if (box.current === null) box.current = numericBox();
  /* (S8 WP5) A grouped box keeps a `groupedBox` instead: the same five events, in the coordinates of its grouped text. */
  const groupedRef = React.useRef<NumericBox | null>(null);
  if (grouping && groupedRef.current === null) {
    groupedRef.current = groupedBox();
    /* Autofill and accessibility edits need not focus first. Otherwise "12,34" after deleting from "12,345"
       looks like a new decimal paste and becomes 12, rather than the intended 1,234. */
    groupedRef.current.seen(groupedText(groupedDigits(String(inputRest.value ?? inputRest.defaultValue ?? ""))));
  }
  const numeric = grouping && groupedRef.current !== null ? groupedRef.current : box.current;
  const controlledValue = (inputRest as { value?: unknown }).value;
  const controlled = controlledValue !== undefined && controlledValue !== null;
  const produced = React.useRef<string | null>(null);
  const reportRef = React.useRef<FieldWiring["report"] | null>(null);
  const stopWatchingReset = React.useRef<(() => void) | null>(null);
  React.useEffect(() => { reportRef.current = field?.report ?? null; });
  React.useEffect(() => () => {
    stopWatchingReset.current?.();
    stopWatchingReset.current = null;
    if (numeric.moved(null)) reportRef.current?.(owner, null);
  }, [numeric, owner]);
  React.useEffect(() => {
    if (!isNumeric || !controlled) return;
    /* A grouped box wrote its grouped text; its parent holds the digits — compared as the text the box shows. */
    const now = grouping ? groupedText(groupedDigits(String(controlledValue))) : String(controlledValue);
    if (now === produced.current) return;
    if (grouping && produced.current !== null && groupedDigits(now) === groupedDigits(produced.current)) return;
    produced.current = now;
    if (grouping) {
      setZeroPlacesText(null);
      groupedHistory.current = { entries: [{ text: now, caret: now.length }], at: 0, restoring: false };
    }
    if (numeric.moved(now)) reportRef.current?.(owner, null);
  }, [isNumeric, controlled, controlledValue, numeric, owner, grouping]);
  const watchReset = (el: HTMLInputElement) => {
    const form = el.form;
    if (stopWatchingReset.current !== null || form === null) return;
    const onReset = () => {
      if (numeric.moved(null)) reportRef.current?.(owner, null);
      /* A reset puts the values back AFTER its event: read what it left once it has. */
      window.setTimeout(() => {
        numeric.seen(el.value);
        /* (S8 WP5) An uncontrolled grouped box's hidden field follows the default the reset put back. */
        if (grouping) setOwnDigits(groupedDigits(el.value));
      }, 0);
    };
    form.addEventListener("reset", onReset);
    stopWatchingReset.current = () => form.removeEventListener("reset", onReset);
  };

  // Sanitise on every input (covers typing, paste, drop, IME). For controlled
  // fields the parent stores the sanitised value via this onChange; for
  // uncontrolled fields we mutate the DOM value in place so junk never sticks.
  const handleChange: React.ChangeEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => {
        if (grouping && composing.current) {
          setCompositionText(e.target.value);
          return;
        }
        const was = numeric.owed();
        const owed = numeric.change(e.target, opts, controlled ? String(controlledValue) : undefined);
        produced.current = e.target.value;
        if (grouping) {
          setZeroPlacesText(/^0\d/.test(e.target.value.replace(GROUP_MARK, "")) ? e.target.value : null);
          const history = groupedHistory.current;
          if (!history.restoring && history.entries[history.at].text !== e.target.value) {
            history.entries.splice(history.at + 1);
            history.entries.push({ text: e.target.value, caret: e.target.selectionEnd ?? e.target.value.length });
            history.at++;
          }
        }
        if (!sameOwed(was, owed)) field?.report(owner, owed);
        watchReset(e.target);
        onChange?.(e);
      }
    : onChange;
  const handleCompositionStart: React.CompositionEventHandler<HTMLInputElement> = (e) => {
    numeric.seen(e.currentTarget.value);
    numeric.select(e.currentTarget.selectionStart, e.currentTarget.selectionEnd);
    composing.current = true;
    setCompositionText(e.currentTarget.value);
    inputRest.onCompositionStart?.(e);
  };
  const handleCompositionEnd: React.CompositionEventHandler<HTMLInputElement> = (e) => {
    composing.current = false;
    setCompositionText(null);
    handleChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
    inputRest.onCompositionEnd?.(e);
  };
  /* ⭐ The four other events a numeric box needs (vb6): a key that is not a digit and a blur end a refused dot's hold,
     a focus reads the text an uncontrolled box holds, and a select — and every key, before it acts — tells the box
     what is selected, so a change over a selection is known for one. Each still hands the event to the caller's own
     handler. */
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => {
        if (grouping && !composing.current && (e.ctrlKey || e.metaKey) && !e.altKey && /^(z|y)$/i.test(e.key)) {
          e.preventDefault();
          const history = groupedHistory.current;
          const forward = e.key.toLowerCase() === "y" || e.shiftKey;
          const next = history.at + (forward ? 1 : -1);
          if (next >= 0 && next < history.entries.length) {
            history.at = next;
            const entry = history.entries[next];
            e.currentTarget.value = entry.text;
            e.currentTarget.setSelectionRange(entry.caret, entry.caret);
            numeric.moved(entry.text);
            history.restoring = true;
            try { handleChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>); }
            finally { history.restoring = false; }
          }
        } else if (!grouping || !composing.current) {
          if (grouping) groupedHistory.current.entries[groupedHistory.current.at].caret = e.currentTarget.selectionEnd ?? 0;
          numeric.select(e.currentTarget.selectionStart, e.currentTarget.selectionEnd); numeric.key(e.key);
        }
        onKeyDown?.(e);
      }
    : onKeyDown;
  const handleSelect: React.ReactEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => { if (!grouping || !composing.current) numeric.select(e.currentTarget.selectionStart, e.currentTarget.selectionEnd); onSelect?.(e); }
    : onSelect;
  const handleFocus: React.FocusEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => { numeric.seen(e.target.value); onFocus?.(e); }
    : onFocus;
  const handleBlur: React.FocusEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => {
        numeric.blur();
        if (grouping && !composing.current && zeroPlacesText !== null) {
          e.target.value = groupedText(groupedDigits(e.target.value));
          numeric.seen(e.target.value);
          setZeroPlacesText(null);
        }
        onBlur?.(e);
      }
    : onBlur;

  /**
   * ⭐ INVALID IS ONE FACT, WITH THREE SOURCES (vb6): the box's own `error`, the error of the Field it sits in, or the
   * caller's own `aria-invalid`. Whichever says so, the box both LOOKS invalid (border + wash) and READS invalid.
   * 🔴 The caller's `aria-invalid` used to be overwritten with nothing whenever `error` was absent — the 2FA code box
   * set one and it never reached a screen reader. Honouring it here keeps the old promise below (the two can never
   * disagree) by agreeing in the other direction.
   */
  const errored = !!error || !!field?.invalid || claimsInvalid(inputRest["aria-invalid"]);
  const describedBy = joinIds(inputRest["aria-describedby"], field?.describedBy);
  const labelledBy = inputRest["aria-labelledby"] ?? (inputRest["aria-label"] ? undefined : field?.labelledBy);
  const ariaRequired = inputRest["aria-required"] ?? (field?.required ? true : undefined);

  // A field the officer cannot edit — either flag. Both make a reader the same promise
  // ("you may not change this"), so both must produce the same appearance.
  const locked = !!(inputRest as { disabled?: boolean; readOnly?: boolean }).disabled
    || !!(inputRest as { disabled?: boolean; readOnly?: boolean }).readOnly;

  /* ⭐ (S8 WP5) WHAT A GROUPED BOX SHOWS, AND WHAT IT POSTS. It shows its digits grouped — the controlled value's, or
     its default's — and gives its `name` to a hidden field that carries the digits, so a form posts "12500", never
     "12,500". A box that is not grouped spreads nothing here. */
  const name = inputRest.name;
  const heldDigits = controlled ? groupedDigits(String(controlledValue)) : ownDigits;
  const groupedShown = compositionText ?? (zeroPlacesText !== null && groupedDigits(zeroPlacesText) === heldDigits ? zeroPlacesText : groupedText(heldDigits));
  const groupedAttrs = controlled
    ? { name: undefined, value: groupedShown }
    : { name: undefined, defaultValue: groupedText(groupedDigits(String(inputRest.defaultValue ?? ""))) };

  /* The box's surface, exactly as it always was — and what WP5's props add to it, `null` when neither is set. ⭐ "Too
     much" is a strong NEUTRAL edge, its own token: it gives way to an error and to a locked box, and it is never the
     error's red, gold or the NO ink. It is the element's own style (it outranks the hover edge); a class would add a
     utility to the stylesheet every page loads. */
  /* A18: the sheet may truthfully mark a low stake aria-invalid while its attention cue stays NEUTRAL. A real
     error prop or Field error still paints the error; merely declaring invalid does not replace this chosen cue. */
  const attentionEdge = attention === true && !error && !field?.invalid && !locked;
  const surface: React.CSSProperties =
    errored && !attentionEdge ? { background: "var(--danger-wash)" }
    : locked ? { background: "var(--bg-base)", opacity: 0.72 }
    : { background: "var(--bg-inset)" };
  const added: React.CSSProperties | null = attentionEdge || size === "xl"
    ? { ...(size === "xl" ? xlStyle.box : {}), ...(attentionEdge ? { borderColor: "var(--input-attention)", borderWidth: "2px" } : {}) }
    : null;

  // Render numeric fields as text so we fully control the characters; keep an
  // appropriate inputMode so phones still show the numeric keypad.
  const effectiveType = isNumeric ? "text" : type;
  const effectiveInputMode = inputMode ?? (isNumeric ? (decimal ? "decimal" : "numeric") : undefined);

  return (
    <span
      className={cn(
        // `field-measure` (DESIGN_AUTHORITY B7) caps the field at whatever measure
        // its <FormColumn> sets. It resolves to `none` by default, so this is a
        // no-op in inline admin toolbars where the field is meant to flex — the
        // cap only applies where a form column has opted in.
        "field-measure flex items-stretch rounded-lg border overflow-hidden brand-focus-within transition-all duration-150",
        heightCls[size],
        errored && !attentionEdge ? "border-danger-500"
          // 🔴 A LOCKED FIELD MUST *LOOK* LOCKED — and until 2026-09-10 this atom painted no
          // disabled state whatsoever. The pinned statutory helpline on `/admin/system` rendered
          // through the same <Field>/<Input> as the two editable boxes: same border, same fill,
          // same ink (the input sets `text-text` explicitly, overriding even the UA grey), same
          // hover. ⭐ THIS IS CAUSE **H** OF THE OWNER'S REPORT — *"some fields are not changing,
          // maybe readonly"*. Nothing was broken; the field genuinely is read-only and the console
          // gave the officer no way to know. A control that refuses input without SAYING it is
          // read-only is indistinguishable, from the outside, from one that is broken.
          // ⚠️ Border AND fill AND ink all move, deliberately: one of the three alone reads as a
          // style accident on a dark theme, and the officer has to be able to tell at a glance.
          : locked ? "border-border/50 cursor-not-allowed"
          : "border-border hover:border-border-strong",
        containerClassName,
      )}
      style={added === null ? surface : { ...surface, ...added }}
    >
      {prefix !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-r border-border font-mono text-text-muted shrink-0",
            fontCls[size],
          )}
          style={size === "xl" ? xlStyle.unit : undefined}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        {...inputRest}
        type={effectiveType}
        inputMode={effectiveInputMode}
        {...(isNumeric ? { autoComplete: inputRest.autoComplete ?? "off" } : {})}
        {...(grouping ? groupedAttrs : {})}
        {...(grouping ? { maxLength: undefined } : {})}
        {...(size === "xl" ? { style: { ...inputRest.style, ...xlStyle.figure } } : {})}
        /**
         * 🔴 AN ERRORED FIELD SAID NOTHING TO A SCREEN READER, AND THAT IS THE SAME DEFECT AS THE
         * LOCKED BOX ABOVE IT (measured 2026-09-21 on `/admin/desk/[id]?tab=rules`: a refused save
         * painted a red border on four fields and set `aria-invalid` on none of them).
         *
         * The error was carried entirely in COLOUR — a border and a wash — plus a sentence below
         * the box that nothing associated with the box. So a sighted officer saw which field was
         * wrong and a reader user was told they were all fine. That is exactly cause **H**'s shape:
         * a control whose true state is visible only to people who can see it.
         * ⚠️ `|| undefined` rather than `false`: `aria-invalid="false"` is a claim, and announcing
         * "valid" on every untouched box on the page is noise, not information.
         * ⛔ AFTER the spread, so a caller that sets its own `aria-invalid` cannot be silently
         * overridden into disagreeing with its own `error` prop — the two are one fact.
         * ⭐ (vb6) …and the caller's own claim, and its Field's error, are folded INTO `errored` above rather than
         * thrown away, so the box paints whatever this attribute says. The three wiring attributes beside it merge
         * the caller's values with the Field's: a caller's own name (`aria-label` / `aria-labelledby`) always wins.
         */
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        aria-required={ariaRequired}
        aria-invalid={errored || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...(grouping ? { onCompositionStart: handleCompositionStart, onCompositionEnd: handleCompositionEnd } : {})}
        className={cn(
          "flex-1 min-w-0 bg-transparent px-3 outline-none placeholder:text-text-subtle",
          // ⛔ NOT a bare `text-text`. That explicit colour is what overrode the UA grey and made a
          // disabled box indistinguishable from an editable one.
          locked ? "text-text-muted cursor-not-allowed" : "text-text",
          mono && "font-mono tabular-nums",
          fontCls[size],
          className,
        )}
      />
      {grouping && name !== undefined ? <input type="hidden" name={name} form={inputRest.form} value={heldDigits} disabled={inputRest.disabled} /> : null}
      {trailing !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-l border-border font-mono text-text-subtle shrink-0",
            fontCls[size],
          )}
          style={size === "xl" ? xlStyle.unit : undefined}
        >
          {trailing}
        </span>
      )}
    </span>
  );
});

/** A bound as a hint prints it: a whole number grouped, a fraction exactly as written; `null` for none. */
function boundText(v: unknown): string | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Number.isSafeInteger(n) ? formatNumber(n) : s;
}

/** React's mark on a lazy wrapper. `Symbol.for`, so it is the same symbol whichever copy of React made the wrapper. */
const REACT_LAZY = Symbol.for("react.lazy");

/**
 * The one element a Field was handed, opened if it came wrapped; `null` for anything else.
 *
 * 🔴 A LAZY WRAPPER IS THE ELEMENT, NOT YET OPENED (2026-10-08). On the SERVER, the Flight client that decodes a Server
 * Component page hands an element over inside a lazy wrapper whenever something the element names had not arrived as
 * it was read (its client module; in a dev build, its owner's record), and `isValidElement` is false for the wrapper.
 * The browser had everything by then and was handed the bare element. So the server's HTML stated no bound where the
 * browser stated "Min 5 · Max 120", and React threw the responsible-gambling page's tree away on every load ("Hydration
 * failed", its reality-check box: qa:journey-shell's 15.1 and the A8j drives, in English and Swahili, in all three
 * engines). `Children.toArray` opens a lazy the way React's renderer does: it gives the element, or, while the element
 * is still loading, suspends this Field until it is there, as rendering the child would have a moment later. Both
 * renders then read the same props (test:ui-consistency K3g).
 */
function handedElement(children: React.ReactNode): React.ReactElement | null {
  if (React.isValidElement(children)) return children;
  if (typeof children !== "object" || children === null || (children as { $$typeof?: unknown }).$$typeof !== REACT_LAZY) return null;
  const opened = React.Children.toArray(children);
  return opened.length === 1 && React.isValidElement(opened[0]) ? opened[0] : null;
}

/**
 * The bounds a Field states for the numeric box that is its direct child, or `null`.
 *
 * ⛔ WHY THE FIELD STATES THEM (vb6): the Input renders a numeric box as a TEXT input, where `min` and `max` are inert —
 * no browser enforces or announces them — so an officer met a bound only as a refusal after Save. "A control must not
 * offer what the thing behind it will reject" (the asset form's own rule) needs the bound said BEFORE the typing.
 * 🔴 READ FROM THE CHILD'S PROPS, NEVER ITS TYPE. On a page that is a Server Component the Field and its Input arrive
 * through the RSC payload, where a client component in an element's type slot is a LAZY REFERENCE — never `Input`
 * itself — so a type check stated no bound on any server page (the responsible-gambling limits among them). The props
 * arrive intact: a direct child that declares a numeric box (`type="number"`, `inputMode` numeric or decimal) and a
 * bound is stated, whatever renders it.
 * ⚠️ A min of 0 on a box that cannot go negative is not stated: the box already enforces it, and "Min 0" under every
 * amount would be noise. ⚠️ Read during render, so the server's HTML already carries the bound and nothing shifts on
 * hydration. A box nested deeper states nothing, which is the old behaviour. The child may arrive wrapped, still to be
 * opened: `handedElement` opens it.
 */
export function fieldBounds(children: React.ReactNode): { min: string | null; max: string | null } | null {
  const child = handedElement(children);
  if (child === null) return null;
  const p = child.props as { type?: unknown; inputMode?: unknown; min?: unknown; max?: unknown; allowNegative?: unknown };
  if (!(p.type === "number" || p.inputMode === "numeric" || p.inputMode === "decimal")) return null;
  const minText = boundText(p.min);
  const min = minText !== null && !(Number(p.min) === 0 && p.allowNegative !== true) ? minText : null;
  const max = boundText(p.max);
  return min === null && max === null ? null : { min, max };
}

/** Field label + Input + hint shorthand. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  dataField,
  optional,
  required,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * ⭐ (vb6) — prints the dictionary's "(optional)" after the label (`t.common.optional`, so it reads "(hiari)" and
   * "（可选）" too). DESIGN_AUTHORITY §A7: mark the optional field; a field with no mark is required.
   */
  optional?: boolean;
  /** ⭐ (vb6) — puts `aria-required` on the control. It paints no mark of its own (§A7). */
  required?: boolean;
  /**
   * ⭐ DG-S-05/06 — the ADDRESS a server refusal names, e.g. `fieldError("limitUsd", …)`.
   *
   * It lands on the `<label>` wrapper rather than the control, because that is what
   * `focusFirstInvalid` queries (`[data-field]`) before focusing whatever focusable control
   * the wrapper contains — so one prop works for an `<input>`, a `<select>` and a `<textarea>`
   * alike. ⛔ OPTIONAL, and absent means exactly today's behaviour: nothing renders
   * differently and no consumer has to change. Adoption is per-form and deliberate.
   */
  dataField?: string;
}) {
  const { t } = useT();
  /* ⚠️ SANITISED, as `select.tsx` sanitises its own: React 19's `useId` emits characters that are legal IDREFs but
     break the moment an id is written into a selector. */
  const base = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const legendId = `fld-${base}-label`;
  const errorId = `fld-${base}-error`;
  const noticeId = `fld-${base}-notice`;
  const hintId = `fld-${base}-hint`;

  /* What the boxes inside owe (digits after a dot cut or dropped, a minus dropped), keyed by the box that owes it. */
  const [owing, setOwing] = React.useState<Readonly<Record<string, NumericOwed>>>({});
  const report = React.useCallback((owner: string, owed: NumericOwed | null) => {
    setOwing((cur) => {
      const has = Object.prototype.hasOwnProperty.call(cur, owner);
      if (owed === null) {
        if (!has) return cur;
        const next: Record<string, NumericOwed> = {};
        for (const k of Object.keys(cur)) if (k !== owner) next[k] = cur[k];
        return next;
      }
      return has && sameOwed(cur[owner], owed) ? cur : { ...cur, [owner]: owed };
    });
  }, []);
  const owedHere = Object.values(owing).reduce<NumericOwed | null>(
    (all, o) => ({ dot: (all?.dot ?? false) || o.dot, minus: (all?.minus ?? false) || o.minus }),
    null,
  );
  /* ⭐ (vb6) The line is the DICTIONARY's (`t.common`): a player page reads it in Swahili or Chinese, the console in
     English — never a hard-coded sentence (§A5). A phone-number box never owes one. */
  const notice = numericNoticeKeys(owedHere).map((k) => t.common[k]).join(" ");

  const bounds = fieldBounds(children);
  const hasError = !!error;
  const hasHint = !!hint;
  /* ⛔ The error still REPLACES the hint, exactly as before — a refusal is the one line that matters then. A notice is
     added beside either: it explains an edit the officer just made, which neither of them knows about. */
  const showHint = !hasError && (hasHint || bounds !== null);
  /* Between the caller's hint and the bounds: a space after a finished sentence, a middle dot otherwise — so
     "Current TZS 1,000" and "Min 1,000" never run together. */
  const hintEndsSentence = typeof hint === "string" && /[.!?。]\s*$/.test(hint);
  const describedBy = joinIds(hasError && errorId, notice !== "" && noticeId, showHint && hintId);
  const isRequired = !!required;
  const wiring = React.useMemo<FieldWiring>(
    () => ({ describedBy, labelledBy: legendId, invalid: hasError, required: isRequired, report }),
    [describedBy, legendId, hasError, isRequired, report],
  );

  return (
    <label className={cn("block", className)} data-field={dataField}>
      <FieldLegend id={legendId} className="block mb-1.5">
        {label}
        {optional ? <>{" "}<span className="font-normal">{t.common.optional}</span></> : null}
      </FieldLegend>
      <FieldContext.Provider value={wiring}>{children}</FieldContext.Provider>
      {/* ⭐ (vb6) The error line is ANNOUNCED, and the control's `aria-describedby` names it, so it is read again
          whenever the box is focused. */}
      {hasError ? (
        <p id={errorId} role="alert" className="mt-1.5 text-body-sm text-danger-fg">{error}</p>
      ) : null}
      {/* ⭐ (vb6) The notice is a LIVE REGION, and it is ALWAYS mounted: a region created already holding its words is
          announced unreliably, so it waits here empty — no margin, so no height — and only its words come and go. The
          control names it in `aria-describedby` only while it holds them. */}
      <p id={noticeId} role="status" className={cn("text-body-sm text-text", notice !== "" && "mt-1.5")}>{notice}</p>
      {showHint ? (
        <p id={hintId} className="mt-1.5 text-body-sm text-text-subtle">
          {hasHint ? hint : null}
          {hasHint && bounds !== null ? (hintEndsSentence ? " " : " · ") : null}
          {bounds !== null && bounds.min !== null ? (
            <span className="whitespace-nowrap">{t.common.min}{" "}<span className="font-mono">{bounds.min}</span></span>
          ) : null}
          {bounds !== null && bounds.min !== null && bounds.max !== null ? " · " : null}
          {bounds !== null && bounds.max !== null ? (
            <span className="whitespace-nowrap">{t.common.max}{" "}<span className="font-mono">{bounds.max}</span></span>
          ) : null}
        </p>
      ) : null}
    </label>
  );
}
