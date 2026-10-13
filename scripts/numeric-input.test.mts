/**
 * Unit tests for the strict numeric-input sanitiser used by the shared <Input>
 * atom (src/components/ui/input.tsx). Every numeric field across the app routes
 * through this, so it must NEVER let a non-numeric character survive.
 *
 * ⭐ AND IT MUST NEVER CHANGE THE SIZE OF A NUMBER (vb6, 2026-10-03). The whole-number branch used to DELETE every
 * dot, so a pasted "12.50" became 1250 on the agent rail's refund amount — a 100× change no range check catches. A
 * paste now keeps what it brought up to its first decimal mark (a dot, a Chinese keyboard's full stop, or a comma
 * before its last one or two digits — never a currency's abbreviation dot); a TYPED dot is refused and the digits
 * typed straight after it at its caret — through a comma or a letter typed there — are dropped (so "12500.00" typed
 * key by key ends on 12500) until a change over a selection, a caret that settles elsewhere, anything that lands
 * elsewhere, a named key, a blur or a deletion; a dot refused with no digit before it holds nothing; a stray dot inside
 * a number keeps every digit; the line is owed only once digits were dropped; a phone box (type="tel") reads a dot as
 * a separator. The typed path is driven through `numericBox` — the very object each Input keeps and calls from its
 * own handlers — with a stand-in element, and every judge is shown RED on a planted copy of input.tsx (built in memory
 * with esbuild; nothing is written), while the same copy with nothing planted passes. The console's balance
 * adjustment, the one money box that was still hand-rolled, is pinned to the kit box at the end.
 *
 * Run: npm run test:numeric   (tsx scripts/numeric-input.test.mts)
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import * as KIT from "../src/components/ui/input.tsx";
import { dict } from "../src/lib/i18n-dict.ts";
import { decomment } from "./lib/decomment.mts";

const { sanitizeNumericInput, readNumericEntry } = KIT;

let pass = 0, fail = 0;
function eq(label: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log(`FAIL ${label}\n   got ${g}\n   exp ${e}`); }
}

const INT = { decimal: false, negative: false };
const DEC = { decimal: true, negative: false };
const NEG = { decimal: true, negative: true };

// ── Letters / strings are stripped entirely (the reported bug) ─────────
eq("'abc' -> ''", sanitizeNumericInput("abc", INT), "");
eq("'12abc' -> '12'", sanitizeNumericInput("12abc", INT), "12");
eq("'1a2b3' -> '123'", sanitizeNumericInput("1a2b3", INT), "123");
eq("'hello' -> ''", sanitizeNumericInput("hello", INT), "");
eq("'  spaces 5 ' -> '5'", sanitizeNumericInput("  spaces 5 ", INT), "5");

// ── Scientific notation / number-input escape chars ────────────────────
eq("'1e5' -> '15'", sanitizeNumericInput("1e5", INT), "15");
eq("'1E10' -> '110'", sanitizeNumericInput("1E10", INT), "110");
eq("'+5' -> '5' (int)", sanitizeNumericInput("+5", INT), "5");
eq("'5%' -> '5'", sanitizeNumericInput("5%", INT), "5");
eq("'$1,000' -> '1000'", sanitizeNumericInput("$1,000", INT), "1000");

// ── Integer mode CUTS at the first dot — it never multiplies (vb6) ─────
eq("'12.50' int -> '12' (cut at the dot, never 1250)", sanitizeNumericInput("12.50", INT), "12");
eq("'1,500.50' int -> '1500' (never 150050)", sanitizeNumericInput("1,500.50", INT), "1500");
eq("'12,500.00' int -> '12500' (the drive's paste, never 1250000)", sanitizeNumericInput("12,500.00", INT), "12500");
eq("'1.500' int -> '1' (a European thousands dot is cut, visibly, and the Field says why)", sanitizeNumericInput("1.500", INT), "1");
eq("'.' int -> ''", sanitizeNumericInput(".", INT), "");

// ── What the whole-entry reading dropped is reported, so the Field can say it ──
eq("readNumericEntry '12.50' int — cut at the dot", readNumericEntry("12.50", INT), { value: "12", cutAtDot: true, droppedMinus: false });
eq("readNumericEntry '1500' int — nothing dropped", readNumericEntry("1500", INT), { value: "1500", cutAtDot: false, droppedMinus: false });
eq("readNumericEntry '12.50' dec — decimal mode keeps its dot and drops nothing", readNumericEntry("12.50", DEC), { value: "12.50", cutAtDot: false, droppedMinus: false });
eq("readNumericEntry '-5' int — a refused minus is dropped AND reported (a sign change no range catches)", readNumericEntry("-5", INT), { value: "5", cutAtDot: false, droppedMinus: true });
eq("readNumericEntry '-5' neg — an allowed minus is kept", readNumericEntry("-5", NEG), { value: "-5", cutAtDot: false, droppedMinus: false });
eq("readNumericEntry · a phone box (separators) keeps every digit across dots and dashes, and reports nothing",
   readNumericEntry("0712.345-678", { decimal: false, negative: false, separators: true }), { value: "0712345678", cutAtDot: false, droppedMinus: false });

// ── Decimal mode keeps ONE dot ─────────────────────────────────────────
eq("'12.50' dec -> '12.50'", sanitizeNumericInput("12.50", DEC), "12.50");
eq("'1.2.3' dec -> '1.23'", sanitizeNumericInput("1.2.3", DEC), "1.23");
eq("'0.01' dec", sanitizeNumericInput("0.01", DEC), "0.01");
eq("'1.5e3' dec -> '1.53'", sanitizeNumericInput("1.5e3", DEC), "1.53");
eq("'.5' dec -> '.5'", sanitizeNumericInput(".5", DEC), ".5");
eq("'abc.def' dec -> '.'", sanitizeNumericInput("abc.def", DEC), ".");

// ── Negative only when allowed, only leading ───────────────────────────
eq("'-5' int(no neg) -> '5'", sanitizeNumericInput("-5", INT), "5");
eq("'-5' neg -> '-5'", sanitizeNumericInput("-5", NEG), "-5");
eq("'5-3' neg -> '53' (minus not leading)", sanitizeNumericInput("5-3", NEG), "53");
eq("'-1.5' neg -> '-1.5'", sanitizeNumericInput("-1.5", NEG), "-1.5");

// ── Already-clean values pass through unchanged ────────────────────────
eq("'1000' clean", sanitizeNumericInput("1000", INT), "1000");
eq("'0' clean", sanitizeNumericInput("0", INT), "0");
eq("'' clean", sanitizeNumericInput("", INT), "");

// ── Fuzz: output always matches a strict numeric grammar ───────────────
{
  let seed = 99887766;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const alphabet = "0123456789.eE+-abcXYZ$,% ";
  let bad = 0;
  for (let i = 0; i < 3000; i++) {
    let raw = "";
    const len = Math.floor(rnd() * 10);
    for (let k = 0; k < len; k++) raw += alphabet[Math.floor(rnd() * alphabet.length)];
    const opts = rnd() < 0.5 ? INT : (rnd() < 0.5 ? DEC : NEG);
    const out = sanitizeNumericInput(raw, opts);
    // Build the grammar the output must satisfy.
    const body = opts.decimal ? "\\d*\\.?\\d*" : "\\d*";
    const sign = opts.negative ? "-?" : "";
    const re = new RegExp(`^${sign}${body}$`);
    if (!re.test(out)) { bad++; if (bad <= 5) console.log(`  fuzz fail: "${raw}" -> "${out}"`); }
    // And it must contain no letters ever.
    if (/[a-zA-Z]/.test(out)) bad++;
  }
  eq("fuzz: 3000 inputs, all strictly numeric", bad, 0);
}

// ═══ vb6 · THE TYPED PATH, THROUGH THE HANDLER A BOX RUNS ═══════════════════════════════════════════════════════
// `numericBox()` is the object every Input keeps in a ref and calls from its own onFocus / onSelect / onKeyDown / onChange
// / onBlur with the real element (the call-site pin below holds it to that). Here it gets a stand-in element and a stand-in
// browser, in the order a browser sends those events: the key goes down, the browser edits the text at the caret, then
// the change event. Each JUDGE is one promise; each runs on the shipped module and must pass, and on a planted copy of
// input.tsx that puts its defect back, and must go red.

type Kit = Pick<typeof KIT, "sanitizeNumericInput" | "readNumericEntry" | "numericBox" | "numericNoticeKeys" | "groupedBox" | "groupedDigits" | "readsDigits">;
type Opts = { decimal: boolean; negative: boolean; separators?: boolean };
type Owed = { dot: boolean; minus: boolean } | null;
const TEL: Opts = { decimal: false, negative: false, separators: true };
const DOT_OWED: Owed = { dot: true, minus: false };
const show = (v: unknown) => JSON.stringify(v);
/** The line after each step, as one letter a step: D = the dot's line, M = the minus line, - = none. */
const lines = (owed: Owed[]) => owed.map((o) => (o === null ? "-" : o.dot && o.minus ? "B" : o.dot ? "D" : "M")).join("");

/** The element the Input hands its box: a value and a caret, kept the way a browser keeps them. */
type El = { value: string; selectionStart: number; selectionEnd: number; setSelectionRange: (a: number, b: number) => void };
function element(value: string): El {
  const el: El = {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
    setSelectionRange: (a: number, b: number) => { el.selectionStart = a; el.selectionEnd = b; },
  };
  return el;
}

/**
 * One box, one officer. A step is a key ("1", ".", "a"), a named key ("Backspace", "ArrowLeft", "ArrowRight"),
 * "paste:TEXT" (text arrives with no key), "selectAll", "tap:N" (a pointer puts the caret at N), "drop:N:TEXT" (the
 * pointer drops TEXT at N — no key, and no select event before it), "blur" or "focus".
 * `android` reports every key as "Unidentified", which is what an Android keyboard sends for digits and dots alike.
 * ⭐ The box is told the selection as the Input tells it: before every key (its onKeyDown) and after every move of the
 * caret or the selection (its onSelect — a select-all, a tap, an arrow).
 */
function drive(kit: Kit, steps: string[], opts: Opts = INT, start = "", android = false, grouped = false) {
  /* (S8 WP5) `grouped` drives the box a grouped Input keeps — the same events, on the text it shows. */
  const box = grouped ? kit.groupedBox() : kit.numericBox();
  const el = element(start);
  box.seen(el.value);                                   // the officer focused the box
  const owed: Owed[] = [];
  const told = () => box.select(el.selectionStart, el.selectionEnd);
  const put = (text: string) => {
    const from = el.selectionStart;
    el.value = el.value.slice(0, from) + text + el.value.slice(el.selectionEnd);
    el.selectionStart = from + text.length;
    el.selectionEnd = from + text.length;
  };
  for (const s of steps) {
    if (s === "blur") box.blur();
    else if (s === "focus") box.seen(el.value);
    else if (s === "selectAll") { el.selectionStart = 0; el.selectionEnd = el.value.length; told(); }
    else if (s.startsWith("tap:")) {
      const to = Math.max(0, Math.min(el.value.length, Number(s.slice(4))));
      el.selectionStart = to;
      el.selectionEnd = to;
      told();
    }
    else if (s.startsWith("drop:")) {
      const [, at, ...text] = s.split(":");
      const to = Math.max(0, Math.min(el.value.length, Number(at)));
      el.selectionStart = to;
      el.selectionEnd = to;
      put(text.join(":"));
      box.change(el, opts);
    }
    else if (s.startsWith("paste:")) { put(s.slice(6)); box.change(el, opts); }
    else if (s === "ArrowLeft" || s === "ArrowRight") {
      told();
      box.key(s);
      const to = Math.max(0, Math.min(el.value.length, el.selectionEnd + (s === "ArrowLeft" ? -1 : 1)));
      el.selectionStart = to;
      el.selectionEnd = to;
      told();
    } else if (s === "Backspace" || s === "Delete") {
      told();
      box.key(s);
      const a = el.selectionStart, b = el.selectionEnd;
      if (a !== b || (s === "Backspace" ? a > 0 : a < el.value.length)) {
        const from = a === b && s === "Backspace" ? a - 1 : a;
        const to = a === b && s === "Delete" ? b + 1 : b;
        el.value = el.value.slice(0, from) + el.value.slice(to);
        el.selectionStart = from;
        el.selectionEnd = from;
        box.change(el, opts);
      }
    } else {
      told();
      box.key(android ? "Unidentified" : s);
      put(s);
      box.change(el, opts);
    }
    owed.push(box.owed());
  }
  return { value: el.value, caret: el.selectionEnd, owed };
}

type Verdict = { pass: boolean; detail: string };
const JUDGES: Record<string, { label: string; run: (kit: Kit) => Verdict }> = {
  whole: {
    label: "the whole-entry reading (sanitizeNumericInput) cuts at the first dot: '12.50' keeps 12, '12,500.00' keeps 12500 — never 1250 or 1250000",
    run: (kit) => {
      const got = [kit.sanitizeNumericInput("12.50", INT), kit.sanitizeNumericInput("12,500.00", INT)];
      return { pass: got[0] === "12" && got[1] === "12500", detail: show(got) };
    },
  },
  typed: {
    label: "⭐ typing 12500.00 key by key ends on 12500: the dot is refused and drops nothing, so it says nothing; the two zeros typed straight after it are dropped, the line appears with the first of them and stays, and the caret stays after the last 0",
    run: (kit) => {
      const r = drive(kit, [..."12500.00"]);
      return { pass: r.value === "12500" && r.caret === 5 && lines(r.owed) === "------DD", detail: show({ ...r, lines: lines(r.owed) }) };
    },
  },
  stray: {
    label: "⭐ a stray dot typed inside 125000 keeps every digit and owes NO line — nothing was dropped; the digit typed straight after it is dropped, and only then is the line owed — the box still reads 125000",
    run: (kit) => {
      const r = drive(kit, ["ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", ".", "3"], INT, "125000");
      return { pass: r.value === "125000" && r.caret === 2 && lines(r.owed) === "-----D", detail: show({ ...r, lines: lines(r.owed) }) };
    },
  },
  holdEnds: {
    label: "the hold ends on a key that is not a digit, on a blur and on a deletion — only then is the next digit a digit",
    run: (kit) => {
      const key = drive(kit, [..."12500.", "ArrowLeft", "ArrowRight", "0"]).value;
      const blur = drive(kit, [..."12500.", "blur", "focus", "0"]).value;
      const del = drive(kit, [..."12500.", "Backspace", "0"]).value;
      return { pass: key === "125000" && blur === "125000" && del === "12500", detail: show({ key, blur, del }) };
    },
  },
  android: {
    label: "an Android keyboard, which reports every key as 'Unidentified', still ends 12500.00 on 12500",
    run: (kit) => {
      const r = drive(kit, [..."12500.00"], INT, "", true);
      return { pass: r.value === "12500", detail: show(r.value) };
    },
  },
  paste: {
    label: "a pasted 12,500.00 keeps 12500 and says so; a pasted 12.50 over a selected 1000 keeps 12 — the paste's own last 0 is never mistaken for the old text",
    run: (kit) => {
      const a = drive(kit, ["paste:12,500.00"]);
      const b = drive(kit, ["selectAll", "paste:12.50"], INT, "1000");
      return { pass: a.value === "12500" && show(a.owed[0]) === show(DOT_OWED) && b.value === "12" && show(b.owed[1]) === show(DOT_OWED), detail: show({ a: a.value, b: b.value }) };
    },
  },
  pasteHold: {
    label: "a paste that ENDS on its dot holds like a typed one; a paste that carried its own fraction holds nothing",
    run: (kit) => {
      const ends = drive(kit, ["paste:12.", "5"]).value;
      const carried = drive(kit, ["paste:12.50", "7"]);
      return { pass: ends === "12" && carried.value === "127" && carried.owed[1] === null, detail: show({ ends, carried: carried.value, line: carried.owed[1] }) };
    },
  },
  emptyDot: {
    label: "⭐ a dot typed into an EMPTY box is refused and holds nothing — there is no whole number for a fraction to multiply — so it says nothing, and the digits typed after it are digits: . 5 a (blur) 5 reads 55",
    run: (kit) => {
      const r = drive(kit, [".", "5", "a", "blur", "focus", "5"]);
      return { pass: r.value === "55" && lines(r.owed) === "------", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  minus: {
    label: "a refused minus is said, and its line stays while the digits typed after it are in the box — they lost their sign — until the box is emptied",
    run: (kit) => {
      const r = drive(kit, ["-", "5", "0", "Backspace", "Backspace"]);
      return { pass: r.value === "" && lines(r.owed) === "MMMM-", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  decimal: {
    label: "a decimal box is unchanged: 1.5. keeps 1.5 (its first dot, a later one dropped) and owes no line",
    run: (kit) => {
      const r = drive(kit, [..."1.5."], DEC);
      return { pass: r.value === "1.5" && lines(r.owed) === "----", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  moved: {
    label: "a value moved by something other than the officer — a save that clears it, a Discard, a form reset — takes the line back at once (a pasted 12.50 owed it)",
    run: (kit) => {
      const box = kit.numericBox();
      const el = element("");
      box.seen("");
      el.value = "12.50";
      el.selectionStart = 5;
      el.selectionEnd = 5;
      box.change(el, INT);
      const line = box.owed();
      const had = box.moved("");
      const after = box.owed();
      return { pass: show(line) === show(DOT_OWED) && had === true && after === null, detail: show({ line, had, after }) };
    },
  },
  tel: {
    label: "a phone box (type=tel) keeps every digit across a typed dot and a pasted 0712.345.678, and owes no line — PhoneInput prints no 'Whole numbers only'",
    run: (kit) => {
      const typed = drive(kit, ["ArrowLeft", "ArrowLeft", "ArrowLeft", "."], TEL, "712345678");
      const pasted = drive(kit, ["paste:0712.345.678"], TEL);
      return {
        pass: typed.value === "712345678" && pasted.value === "0712345678" && lines([...typed.owed, ...pasted.owed]) === "-----",
        detail: show({ typed: typed.value, pasted: pasted.value }),
      };
    },
  },
  replaced: {
    label: "⭐ a change over a selection ends the hold: 12500, a refused dot, select all, paste 125000 — the box reads 125000, never the 12500 it held",
    run: (kit) => {
      const r = drive(kit, [..."12500.", "selectAll", "paste:125000"]);
      return { pass: r.value === "125000", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  pointer: {
    label: "⭐ a digit that lands away from the dot's caret is a digit, even when nothing told the box the caret moved: 12500, a refused dot, a 7 dropped by the pointer after the 12 — 127500",
    run: (kit) => {
      const r = drive(kit, [..."12500.", "drop:2:7"]);
      return { pass: r.value === "127500" && r.caret === 3, detail: show({ value: r.value, caret: r.caret }) };
    },
  },
  ideographic: {
    label: "a Chinese keyboard's full stops (U+3002, U+FF0E, U+FF61) are dots: 12500 + each + 00 keeps 12500, read whole or typed key by key — never 1250000",
    run: (kit) => {
      const stops = [0x3002, 0xff0e, 0xff61].map((c) => String.fromCharCode(c));
      const whole = stops.map((stop) => kit.sanitizeNumericInput(`12500${stop}00`, INT));
      const typed = drive(kit, [..."12500", stops[0], "0", "0"]).value;
      return { pass: whole.every((v) => v === "12500") && typed === "12500", detail: show({ whole, typed }) };
    },
  },
  stripped: {
    label: "⭐ a character the reading strips, typed after a refused dot (a comma, a space, a letter), leaves the hold standing: 12500 . , 0 0 ends on 12500, never 1250000 — and the line, owed once a zero is dropped, stays through the next stripped letter",
    run: (kit) => {
      const r = drive(kit, [..."12500.", ",", "0", "0", "a"]);
      return { pass: r.value === "12500" && lines(r.owed) === "-------DDD", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  commaDecimal: {
    label: "⭐ a pasted comma before its last one or two digits is the decimal mark it must be: 9 500,00 keeps 9500 and 12 500,50 keeps 12500 (never 950000 or 1250050), while 9,500 and 1,500,000 stay grouping; pasted into the box, 9 500,00 keeps 9500 and says so",
    run: (kit) => {
      const whole = ["9 500,00", "12 500,50", "9,500", "1,500,000"].map((t) => kit.sanitizeNumericInput(t, INT));
      const pasted = drive(kit, ["paste:9 500,00"]);
      return {
        pass: show(whole) === show(["9500", "12500", "9500", "1500000"]) && pasted.value === "9500" && lines(pasted.owed) === "D",
        detail: show({ whole, pasted: pasted.value, lines: lines(pasted.owed) }),
      };
    },
  },
  currencyDot: {
    label: "⭐ a currency's abbreviation is not a decimal mark: Tsh. 9,500, TSh. 9,500.00 and Sh.9,500 keep 9500 (the box no longer empties), and once a digit has appeared — in the text or in the box — a dot is a mark again: 9500a.50, and Tsh.50 pasted after 9500, keep 9500, never 950050; pasted, Tsh. 9,500 owes no line",
    run: (kit) => {
      const whole = ["Tsh. 9,500", "TSh. 9,500.00", "Sh.9,500", "9500a.50"].map((t) => kit.sanitizeNumericInput(t, INT));
      const pasted = drive(kit, ["paste:Tsh. 9,500"]);
      const after = drive(kit, [..."9500", "paste:Tsh.50"]).value;
      return {
        pass: whole.every((v) => v === "9500") && pasted.value === "9500" && lines(pasted.owed) === "-" && after === "9500",
        detail: show({ whole, pasted: pasted.value, lines: lines(pasted.owed), after }),
      };
    },
  },
  emptyHold: {
    label: "⭐ a stray dot in an EMPTY box holds nothing: . then 5000 reads 5000 — the deposit and withdraw box has no Field to explain a swallowed digit, and a hold there trapped a player until a blur",
    run: (kit) => {
      const r = drive(kit, [".", "5", "0", "0", "0"]);
      return { pass: r.value === "5000" && lines(r.owed) === "-----", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },
  tapAway: {
    label: "⭐ a caret that settles away from the dot's caret ends the hold, even when the next digit lands back on it: 12500, a refused dot, a tap after the 12, a tap back at the end, then 0 — 125000",
    run: (kit) => {
      const r = drive(kit, [..."12500.", "tap:2", "tap:5", "0"]);
      return { pass: r.value === "125000", detail: show({ value: r.value, lines: lines(r.owed) }) };
    },
  },

  // ═══ S8 WP5 · THE GROUPED BOX (the bet sheet's stake box), driven key by key through the box a grouped Input keeps ══
  groupedTyped: {
    label: "⭐ (S8 WP5) a grouped box: 5000 typed key by key shows 5,000, with the caret after the last digit",
    run: (kit) => {
      const r = drive(kit, [..."5000"], INT, "", false, true);
      return { pass: r.value === "5,000" && r.caret === 5, detail: show({ value: r.value, caret: r.caret }) };
    },
  },
  groupedInside: {
    label: "⭐ (S8 WP5) a digit typed inside a group lands where it was typed: 7 after the 1 of 12,500 → 172,500 with the caret after the 7; 9 after the comma → 129,500 with the caret after the 9",
    run: (kit) => {
      const a = drive(kit, ["tap:1", "7"], INT, "12,500", false, true);
      const b = drive(kit, ["tap:3", "9"], INT, "12,500", false, true);
      return { pass: a.value === "172,500" && a.caret === 2 && b.value === "129,500" && b.caret === 3, detail: show({ a, b }) };
    },
  },
  groupedPaste: {
    label: "⭐ (S8 WP5) a paste reads exactly as numericStep reads it: 12,500 keeps 12500 (shown 12,500); 12,500.00 keeps 12500 and owes the dot's line; 9 500,00 keeps 9500 — the box's own separators are taken out, never what arrived",
    run: (kit) => {
      const a = drive(kit, ["paste:12,500"], INT, "", false, true);
      const b = drive(kit, ["paste:12,500.00"], INT, "", false, true);
      const c = drive(kit, ["paste:9 500,00"], INT, "", false, true);
      return {
        pass: a.value === "12,500" && kit.groupedDigits(a.value) === "12500" && lines(a.owed) === "-" && b.value === "12,500" && lines(b.owed) === "D" && c.value === "9,500",
        detail: show({ a: a.value, b: b.value, bLine: lines(b.owed), c: c.value }),
      };
    },
  },
  groupedCap: {
    label: "⭐ (S8 WP5) nine digits is the cap, and a change past it is refused whole — never cut, which would change the number's size: 1234567890 typed ends on 123,456,789; a pasted 1234567890 leaves the box empty; a digit typed into a full box (after its 4) leaves it as it was, the caret back after the 4",
    run: (kit) => {
      const typed = drive(kit, [..."1234567890"], INT, "", false, true);
      const pasted = drive(kit, ["paste:1234567890"], INT, "", false, true);
      const full = drive(kit, ["tap:5", "5"], INT, "123,456,789", false, true);
      return {
        pass: typed.value === "123,456,789" && typed.caret === 11 && pasted.value === "" && full.value === "123,456,789" && full.caret === 5,
        detail: show({ typed, pasted: pasted.value, full }),
      };
    },
  },
  groupedErase: {
    label: "(S8 WP5) Backspace over the box's own comma moves the caret, and the next one erases the digit before it: 12,500 → 12,500 (caret 2) → 1,500 (caret 1); Backspace at the end of 1,234,567 regroups to 123,456 — the box's commas are never read as a decimal mark",
    run: (kit) => {
      const one = drive(kit, ["tap:3", "Backspace"], INT, "12,500", false, true);
      const two = drive(kit, ["tap:3", "Backspace", "Backspace"], INT, "12,500", false, true);
      const end = drive(kit, ["Backspace"], INT, "1,234,567", false, true);
      return {
        pass: one.value === "12,500" && one.caret === 2 && two.value === "1,500" && two.caret === 1 && end.value === "123,456" && end.caret === 7 && lines(end.owed) === "-",
        detail: show({ one, two, end }),
      };
    },
  },
  groupedHold: {
    label: "⭐ (S8 WP5) a refused dot holds across a regrouping, by digit: 12500.00 typed ends on 12,500 (the line owed with the first dropped zero), and a tap back on the dot's own caret keeps the hold",
    run: (kit) => {
      const r = drive(kit, [..."12500.00"], INT, "", false, true);
      const tapped = drive(kit, [..."12500.", "tap:6", "0"], INT, "", false, true);
      return { pass: r.value === "12,500" && lines(r.owed) === "------DD" && tapped.value === "12,500", detail: show({ value: r.value, lines: lines(r.owed), tapped: tapped.value }) };
    },
  },
  groupedDigitsRead: {
    label: "(S8 WP5) a grouped box holds its digits without leading zeros — the same number: 0500 holds 500, 0 holds 0, and 0 then 5 typed shows 5",
    run: (kit) => {
      const r = drive(kit, ["0", "5"], INT, "", false, true);
      return { pass: kit.groupedDigits("0500") === "500" && kit.groupedDigits("0") === "0" && r.value === "5", detail: show({ a: kit.groupedDigits("0500"), b: kit.groupedDigits("0"), typed: r.value }) };
    },
  },
  groupedCaller: {
    label: "⭐ (S8 WP5) a grouped box's caller reads its DIGITS: inside onChange the element holds 12500; when the caller returns it shows 12,500 again with the caret where the box put it",
    run: (kit) => {
      const el = element("12,500");
      el.selectionStart = 3; el.selectionEnd = 3;
      let seen = "";
      let held = "";
      const handler = kit.readsDigits((e) => { seen = e.target.value; }, (d) => { held = d; });
      handler({ target: el } as unknown as Parameters<typeof handler>[0]);
      return { pass: seen === "12500" && held === "12500" && el.value === "12,500" && el.selectionEnd === 3, detail: show({ seen, held, value: el.value, caret: el.selectionEnd }) };
    },
  },
  groupedDelete: {
    label: "forward Delete passes a restored grouping comma, so the next Delete reaches the next digit",
    run: (kit) => {
      const r = drive(kit, ["tap:1", "Delete", "Delete"], INT, "1,000", false, true);
      return { pass: r.value === "100" && r.caret === 1, detail: show(r) };
    },
  },
  groupedLeadingEdit: {
    label: "deleting then replacing a leading digit preserves its decimal places: 1,000 → 000 → 5,000",
    run: (kit) => {
      const r = drive(kit, ["tap:1", "Backspace", "5"], INT, "1,000", false, true);
      return { pass: r.value === "5,000" && r.caret === 1, detail: show(r) };
    },
  },
  groupedDeferredCaller: {
    label: "a deferred state updater reads committed digits from target and currentTarget after the handler returns",
    run: (kit) => {
      const el = element("12,500");
      let later = () => "";
      const handler = kit.readsDigits((e) => { later = () => `${e.target.value}/${e.currentTarget.value}`; }, () => {});
      handler({ target: el, currentTarget: el } as unknown as Parameters<typeof handler>[0]);
      return { pass: later() === "12500/12500" && el.value === "12,500", detail: later() };
    },
  },
  ungroupedControl: {
    label: "(S8 WP5) CONTROL — a box that is NOT grouped answers exactly as before: 5000 typed shows 5000 (caret 4), and a pasted 12,500 holds 12500",
    run: (kit) => {
      const a = drive(kit, [..."5000"]);
      const b = drive(kit, ["paste:12,500"]);
      return { pass: a.value === "5000" && a.caret === 4 && b.value === "12500", detail: show({ a, b: b.value }) };
    },
  },
};

const judgeOn = (kit: Kit, name: string): Verdict => {
  try { return JUDGES[name].run(kit); } catch (e) { return { pass: false, detail: `threw: ${(e as Error).message}` }; }
};
for (const name of Object.keys(JUDGES)) {
  const v = judgeOn(KIT, name);
  eq(`${name} · ${JUDGES[name].label}`, v.pass ? true : v.detail, true);
}

// ── The plants: a copy of input.tsx with one defect put back, built in memory, judged by the SAME judge ──
const KIT_SOURCE = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const nodeRequire = createRequire(import.meta.url);
const KIT_DEPS: Record<string, unknown> = {
  react: nodeRequire("react"),
  "@/lib/utils": await import("../src/lib/utils.ts"),
  "@/components/ui/field-legend": await import("../src/components/ui/field-legend.tsx"),
  "@/lib/i18n": await import("../src/lib/i18n.tsx"),
};
/** input.tsx with each [from, to] planted (every `from` must occur exactly once), built with esbuild and evaluated as a
 *  module in memory — nothing touches the disk. */
async function plantedKit(plants: Array<[string, string]>, source = KIT_SOURCE): Promise<Kit> {
  let src = source;
  for (const [from, to] of plants) {
    const parts = src.split(from);
    if (parts.length !== 2) throw new Error(`the plant's anchor occurs ${parts.length - 1} times in input.tsx, not once: ${from}`);
    src = parts.join(to);
  }
  const code = (await transform(src, { loader: "tsx", format: "cjs", target: "es2022", charset: "utf8" })).code;
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  const need = (spec: string) => {
    if (spec in KIT_DEPS) return KIT_DEPS[spec];
    throw new Error(`the planted copy imports ${spec}, which this suite does not provide`);
  };
  new Function("require", "module", "exports", code)(need, mod, mod.exports);
  return mod.exports as unknown as Kit;
}

{
  let copy: Kit | null = null;
  let why = "";
  try { copy = await plantedKit([]); } catch (e) { why = (e as Error).message; }
  const red = copy === null ? ["(not built)"] : Object.keys(JUDGES).filter((n) => !judgeOn(copy as Kit, n).pass);
  eq("the in-memory copy of input.tsx with NOTHING planted passes every judge — so a red plant below is the plant, not the copying",
     why === "" ? red : why, []);
}

const PLANTS: Array<{ judge: string; what: string; plant: Array<[string, string]> }> = [
  { judge: "whole", what: "the pre-fix whole-number branch — every dot deleted",
    plant: [["s = s.slice(0, dot);", 's = s.split(".").join("");']] },
  { judge: "typed", what: "the hold removed — a digit typed after a refused dot is appended (12500.00 → 1250000)",
    plant: [["if (atHold && /^[0-9]+$/.test(arrived)) {", "if (false) {"]] },
  { judge: "stray", what: "the first build's cut — a stray dot cuts every digit after it",
    plant: [["const text = head + kept + tail;", "const text = dot < 0 ? head + kept + tail : head + kept;"]] },
  { judge: "stray", what: "the second build's line — every refused dot owes 'the part after the dot was dropped', though it dropped nothing",
    plant: [["owed: owing(cut, entry.droppedMinus, entry.value),", "owed: owing(dot >= 0 || entry.cutAtDot, entry.droppedMinus, entry.value),"]] },
  { judge: "holdEnds", what: "a blur no longer ends the hold",
    plant: [["return memory.latchedAt === null ? memory : { ...memory, latchedAt: null };", "return memory;"]] },
  { judge: "android", what: "'Unidentified' treated as a named key — every Android keystroke ends the hold",
    plant: [["if (memory.latchedAt === null || key.length <= 1 || SILENT_KEYS.has(key)) return memory;", "if (memory.latchedAt === null || key.length <= 1) return memory;"]] },
  { judge: "paste", what: "a plain prefix-and-suffix diff instead of the caret — a paste's own last digit read as the old text",
    plant: [["const tailLength = raw.length - caret;",
      "let tailLength = 0; while (tailLength < Math.min(raw.length, before.length) && raw[raw.length - 1 - tailLength] === before[before.length - 1 - tailLength]) tailLength++; caret = raw.length - tailLength;"]] },
  { judge: "pasteHold", what: "every dot holds, even one whose paste carried its fraction — the next digit is lost",
    plant: [["dot >= 0 && !/[0-9]/.test(fraction) && guards(entry.value, caretOut)", "dot >= 0 && guards(entry.value, caretOut)"]] },
  { judge: "emptyDot", what: "the third build's trap — a dot refused in an empty box holds, so the digits after it are swallowed until a blur",
    plant: [["/[0-9]/.test(value.slice(0, at ?? value.length))", "true"]] },
  { judge: "minus", what: "the minus line dropped on the next digit — the sign change goes silent",
    plant: [['const keepMinus = value !== "" && was !== null && was.minus;', "const keepMinus = false;"]] },
  { judge: "decimal", what: "a decimal box read as a whole-number box",
    plant: [["if (opts.decimal || opts.separators) {", "if (opts.separators) {"]] },
  { judge: "moved", what: "a moved value that leaves the old line standing (the first build's controlled clear to an empty box)",
    plant: [["const had = memory.owed !== null;", "const had = memory.owed !== null; return had;"]] },
  { judge: "tel", what: "a phone box read as a whole-number box — 712.345.678 cut to 712",
    plant: [['if (opts.separators) return { value: raw.replace(/[^0-9]/g, ""), cutAtDot: false, droppedMinus: false };', ""]] },
  { judge: "replaced", what: "the second build's blind spot — a change over a selection read as a digit typed at the dot's caret, so a select-all paste is swallowed",
    plant: [[" && change.replaced !== true", ""]] },
  { judge: "pointer", what: "the second build's hold, kept wherever the digit lands — after a tap, every digit typed vanishes",
    plant: [["memory.latchedAt === span.start", "memory.latchedAt !== null"]] },
  { judge: "ideographic", what: "the Chinese full stops not read as dots — 12500 + U+3002 + 00 reads 1250000 (the second build)",
    plant: [['return text.replace(FULL_STOPS, ".");', "return text;"]] },
  { judge: "stripped", what: "the third build's gap — a comma typed after a refused dot ends the hold, so 9500.,00 reads 950000",
    plant: [["const keepsHold = atHold && dot < 0 && !/[0-9]/.test(arrived);", "const keepsHold = false;"]] },
  { judge: "stripped", what: "the dot's line dropped by a change that moved nothing",
    plant: [["const keepDot = value === cleanBefore && was !== null && was.dot;", "const keepDot = false;"]] },
  { judge: "commaDecimal", what: "a pasted comma read as grouping wherever it stands — 9 500,00 reads 950000 (the third build)",
    plant: [['return entry ? out.replace(/,([0-9]{1,2})([^0-9]*)$/, ".$1$2") : out;', "return out;"]] },
  { judge: "currencyDot", what: "a currency's abbreviation dot cut as a decimal mark — Tsh. 9,500 empties the box (the third build)",
    plant: [['out += c === "." && !digitSeen && i > 0 && /[A-Za-z]/.test(dots[i - 1]) ? " " : c;', "out += c;"]] },
  { judge: "currencyDot", what: "a letter's dot read as an abbreviation even after a digit — 9500a.50 reads 950050",
    plant: [["!digitSeen && ", ""]] },
  { judge: "emptyHold", what: "the third build's trap on the deposit box — a stray dot in an empty box holds, so 5000 typed after it reads nothing",
    plant: [["/[0-9]/.test(value.slice(0, at ?? value.length))", "true"]] },
  { judge: "tapAway", what: "the third build's select, which never ends the hold — a tap away and back, and the next digit still vanishes",
    plant: [["if (start !== null && start === end && memory.latchedAt !== null && start !== memory.latchedAt) memory = { ...memory, latchedAt: null };", ""]] },
  // ── S8 WP5 · the grouped box ──
  { judge: "groupedTyped", what: "(S8 WP5) the digits shown ungrouped — 5000 stays 5000",
    plant: [['return digits === "" ? "" : formatNumber(Number(digits));', "return digits;"]] },
  { judge: "groupedTyped", what: "(S8 WP5) the caret left in the digits' coordinates — after a regrouping it stops one short of the end",
    plant: [["caret: at === null ? null : caretAfterDigit(text, at),", "caret: at,"]] },
  { judge: "groupedInside", what: "(S8 WP5) the caret sent to the end after every regrouping — a digit typed inside a group pushes the caret away",
    plant: [["caret: at === null ? null : caretAfterDigit(text, at),", "caret: text.length,"]] },
  { judge: "groupedPaste", what: "(S8 WP5) the separators stripped from what ARRIVED too — a pasted 9 500,00 reads 950000",
    plant: [["const arrived = change.raw.slice(span.start, span.end);", 'const arrived = change.raw.slice(span.start, span.end).replace(GROUP_MARK, "");']] },
  { judge: "groupedCap", what: "(S8 WP5) no cap — a tenth digit is taken",
    plant: [["if (value.length > GROUPED_MAX_DIGITS || (keepZeroPlaces && step.value.length > GROUPED_MAX_DIGITS)) {", "if (false) {"]] },
  { judge: "groupedCap", what: "(S8 WP5) a change past the cap CUT to nine digits — a pasted 1234567890 becomes 123,456,789, a tenth of what was pasted",
    plant: [["const value = groupedDigits(step.value);", "const value = groupedDigits(step.value).slice(0, GROUPED_MAX_DIGITS);"]] },
  { judge: "groupedErase", what: "(S8 WP5) the box's own commas left in its digits — Backspace over a comma regroups nothing and the box stops reading",
    plant: [['const head = change.raw.slice(0, span.start).replace(GROUP_MARK, "");', "const head = change.raw.slice(0, span.start);"]] },
  { judge: "groupedHold", what: "(S8 WP5) a refused dot's hold dropped by the regrouping — 12500.00 reads 1,250,000",
    plant: [["memory: { latchedAt: shift(step.memory.latchedAt), owed: step.memory.owed },", "memory: { latchedAt: null, owed: step.memory.owed },"]] },
  { judge: "groupedHold", what: "(S8 WP5) a tap read in the shown text's coordinates — a tap back on the dot's own caret ends the hold",
    plant: [['digitsAhead(before ?? "", start) !== memory.latchedAt', "start !== memory.latchedAt"]] },
  { judge: "groupedDigitsRead", what: "(S8 WP5) leading zeros kept in the digits",
    plant: [['return text.replace(/[^0-9]/g, "").replace(/^0+(?=[0-9])/, "");', 'return text.replace(/[^0-9]/g, "");']] },
  { judge: "groupedCaller", what: "(S8 WP5) the caller handed the grouped text — it reads 12,500",
    plant: [['if (key === "value") return held;', 'if (key === "value") return input.value;']] },
  { judge: "groupedDeferredCaller", what: "the callback's event is the live target again, so a deferred reader sees the grouped text",
    plant: [["    onChange(change);", "    onChange(e);"]] },
  { judge: "groupedDelete", what: "forward Delete cannot pass a grouping comma",
    plant: [['keyPressed === "Delete"', "false"]] },
  { judge: "groupedLeadingEdit", what: "normalizing zero placeholders while editing changes the next typed stake's size",
    plant: [['const keepZeroPlaces = /^0\\d/.test(step.value)', 'const keepZeroPlaces = false && /^0\\d/.test(step.value)']] },
  { judge: "ungroupedControl", what: "(S8 WP5) the grouping reached by every numeric box",
    plant: [["export function numericBox(): NumericBox {", "export function numericBox(): NumericBox {\n  return groupedBox();"]] },
];
for (const p of PLANTS) {
  let verdict = "";
  let planted: Kit | null = null;
  try { planted = await plantedKit(p.plant); } catch (e) { verdict = `the plant could not be built: ${(e as Error).message}`; }
  if (planted !== null) verdict = judgeOn(planted, p.judge).pass ? "still passes — the judge is blind to this defect" : "red";
  eq(`CONTROL · ${p.what} → "${p.judge}" goes red on the planted copy`, verdict, "red");
}

// ── The line's words: the dictionary's, in three languages ──────────────
{
  const keys = KIT.numericNoticeKeys({ dot: true, minus: true });
  eq("the line is two dictionary keys, the dot's first (numericNoticeKeys)", keys, ["wholeNumbersOnly", "noNegativeNumbers"]);
  const words = (loc: "en" | "sw" | "zh") => keys.map((k) => (dict[loc].common as Record<string, unknown>)[k]);
  eq("…in English, the batch's own sentences", words("en"),
     ["Whole numbers only — the part after the dot was dropped.", "No negative numbers — the minus sign was dropped."]);
  const en = words("en");
  const translated = (["sw", "zh"] as const).every((loc) => words(loc).every((w, i) => typeof w === "string" && w.length > 0 && w !== en[i]));
  eq("…and in Swahili and Chinese, each its own translation — a player page never prints the English", translated, true);
  eq("a box that owes nothing prints no line", KIT.numericNoticeKeys(null), []);
}

// ── The call sites: the Input hands every numeric event to its box, and its Field prints the dictionary's words ──
{
  const kitCode = decomment(KIT_SOURCE);
  const phoneCode = decomment(readFileSync(new URL("../src/components/ui/phone-input.tsx", import.meta.url), "utf8"));
  const wired = (kit: string, phone: string) => {
    const handler = /const handleChange[^=]*=\s*isNumeric[\s\S]*?:\s*onChange;/.exec(kit)?.[0] ?? "";
    return {
      oneBoxPerInput: /if \(box\.current === null\) box\.current = numericBox\(\);/.test(kit),
      change: /numeric\.change\(e\.target, opts, controlled \? String\(controlledValue\) : undefined\)/.test(handler) && /onChange\?\.\(e\)/.test(handler),
      report: /if \(!sameOwed\(was, owed\)\) field\?\.report\(owner, owed\);/.test(handler),
      key: /numeric\.key\(e\.key\)/.test(kit) && /onKeyDown=\{handleKeyDown\}/.test(kit),
      focus: /numeric\.seen\(e\.target\.value\)/.test(kit) && /onFocus=\{handleFocus\}/.test(kit),
      blur: /numeric\.blur\(\)/.test(kit) && /onBlur=\{handleBlur\}/.test(kit),
      tel: /const separators = isNumeric && type === "tel";/.test(kit) && /const opts: NumericOpts = \{ decimal: !!decimal, negative, separators \};/.test(kit),
      words: /numericNoticeKeys\(owedHere\)\.map\(\(k\) => t\.common\[k\]\)/.test(kit),
      phoneIsTel: /<Input[\s\S]*?type="tel"[\s\S]*?inputMode="numeric"/.test(phone),
      parentMoves: /if \(now === produced\.current\) return;/.test(kit) && /if \(numeric\.moved\(now\)\) reportRef\.current\?\.\(owner, null\);/.test(kit)
        && /produced\.current = e\.target\.value;/.test(handler),
      reset: /form\.addEventListener\("reset", onReset\)/.test(kit) && /watchReset\(e\.target\);/.test(handler),
      /* BOTH call sites, each in its own handler's body: the key's (the selection before the key acts) and the select
         event's — one of them alone leaves a gap a phone falls into. */
      select: [/const handleKeyDown[^=]*= *isNumeric[^]*?: *onKeyDown;/, /const handleSelect[^=]*= *isNumeric[^]*?: *onSelect;/]
        .every((re) => /numeric[.]select[(]e[.]currentTarget[.]selectionStart, e[.]currentTarget[.]selectionEnd[)]/.test(re.exec(kit)?.[0] ?? ""))
        && /onSelect=[{]handleSelect[}]/.test(kit),
    };
  };
  const ALL = { oneBoxPerInput: true, change: true, report: true, key: true, focus: true, blur: true, tel: true, words: true, phoneIsTel: true, parentMoves: true, reset: true, select: true };
  eq("the Input hands every numeric event to its box — one box per Input; onChange → box.change(e.target, opts, the controlled value) then the caller's; a changed line → its Field; onKeyDown → box.key; onSelect, and every key before it acts → box.select; onFocus → box.seen; onBlur → box.blur; a tel box reads dots as separators; the Field prints the dictionary's words; PhoneInput is a tel box; a parent that moves the value, and a form reset, take the line back",
     wired(kitCode, phoneCode), ALL);
  const CALL_PLANTS: Array<[keyof typeof ALL, "input.tsx" | "phone-input.tsx", string, string]> = [
    ["key", "input.tsx", "numeric.key(e.key);", ""],
    ["blur", "input.tsx", "numeric.blur();", ""],
    ["change", "input.tsx", "numeric.change(e.target, opts, controlled ? String(controlledValue) : undefined)", "numeric.owed()"],
    ["report", "input.tsx", "field?.report(owner, owed)", "void owner"],
    ["tel", "input.tsx", 'type === "tel"', "false"],
    ["words", "input.tsx", "numericNoticeKeys(owedHere).map((k) => t.common[k])", '[""]'],
    ["parentMoves", "input.tsx", "if (numeric.moved(now)) reportRef.current?.(owner, null);", "void now;"],
    ["reset", "input.tsx", 'form.addEventListener("reset", onReset);', "void onReset;"],
    ["select", "input.tsx", "onSelect={handleSelect}", ""],
    ["select", "input.tsx", "numeric.select(e.currentTarget.selectionStart, e.currentTarget.selectionEnd); numeric.key(e.key);", "numeric.key(e.key);"],
    ["phoneIsTel", "phone-input.tsx", 'type="tel"', 'type="text"'],
  ];
  for (const [flag, file, from, to] of CALL_PLANTS) {
    const src = file === "input.tsx" ? kitCode : phoneCode;
    const once = src.split(from).length === 2;
    const planted = src.split(from).join(to);
    const got = file === "input.tsx" ? wired(planted, phoneCode)[flag] : wired(kitCode, planted)[flag];
    eq(`CONTROL · a copy of ${file} with ${JSON.stringify(from)} planted out fails the "${flag}" pin`, once ? got : "anchor not found exactly once", false);
  }
}

// ── vb6 · the console's balance adjustment: a REAL balance, moved by ONE officer below the two-person threshold ──
// 🔴 Its amount was a hand-rolled input whose own filter kept digits AND commas and dropped the dot: a pasted "9,500.00"
// held "9,50000", and one officer moved TZS 950,000 — under TWO_PERSON_THRESHOLD_TZS (1,000,000), so no second officer
// was asked; a pasted "12.50" moved 1,250. It is the kit Input inside a kit Field now, so the rule above cuts the dot
// and the Field says so, and the page reads the box's text as it stands. Read from the source — a page that needs the
// router, a server action and a modal is not rendered here — and each pin is shown red on a copy with the old code back.
{
  const BS = String.fromCharCode(92);
  const adjustCode = decomment(readFileSync(new URL("../src/app/admin/players/[id]/balance-adjust-controls.tsx", import.meta.url), "utf8"));
  const adjustWired = (src: string) => {
    const field = /<Field [^>]*label="Amount [(]TZS[)]"[^>]*>([^]*?)<[/]Field>/.exec(src);
    const box = field === null ? "" : (/<Input([^]*?)[/]>/.exec(field[1])?.[1] ?? "");
    const props = box.split(/[^!-~]+/);
    return {
      kit: /import [{] Field, Input [}] from "@[/]components[/]ui[/]input";/.test(src),
      inField: field !== null && /dataField="amount"/.test(field[0]) && box !== "",
      numericBox: ['inputMode="numeric"', 'prefix="TZS"', "mono", "ref={amountRef}", "value={amount}"].every((p) => props.includes(p)),
      readsBox: /onChange=[{][(]e[)] => setAmount[(]e[.]target[.]value[)][}]/.test(box) && /const amt = Number[(]amount[)];/.test(src),
      noRawFilter: !src.includes(".replace(/[^" + BS + "d"),
      noRawBox: !/<input[^>]*inputMode=/.test(src),
      threshold: /const needsHard = Number[.]isFinite[(]amt[)] && amt >= TWO_PERSON_THRESHOLD_TZS;/.test(src),
    };
  };
  const ADJUST_ALL = { kit: true, inField: true, numericBox: true, readsBox: true, noRawFilter: true, noRawBox: true, threshold: true };
  eq(`⭐ the console's balance adjustment renders the kit Input — inputMode numeric, prefix TZS, mono — inside a kit Field labelled "Amount (TZS)" (dataField amount); amt is the box's text as it stands, with no filter of the page's own and no hand-rolled numeric input; the hard ceremony still starts at TWO_PERSON_THRESHOLD_TZS`,
     adjustWired(adjustCode), ADJUST_ALL);
  const ADJUST_PLANTS: Array<[keyof typeof ADJUST_ALL, string, string, string]> = [
    ["noRawFilter", "the raw handler put back (digits and commas kept, the dot deleted)",
      "onChange={(e) => setAmount(e.target.value)}", `onChange={(e) => setAmount(e.target.value.replace(/[^${BS}d,]/g, ""))}`],
    ["noRawBox", "a hand-rolled input in place of the kit box", "<Input", "<input"],
  ];
  for (const [flag, what, from, to] of ADJUST_PLANTS) {
    const once = adjustCode.split(from).length === 2;
    const got = adjustWired(adjustCode.split(from).join(to))[flag];
    eq(`CONTROL · a copy of balance-adjust-controls.tsx with ${what} fails the "${flag}" pin`, once ? got : "anchor not found exactly once", false);
  }
}

// ═══ S8 WP5 · A15 — THE NEW PROPS ARE INERT WHEN UNSET, PROVEN BY RENDER EQUALITY ══════════════════════════════════
// Every `<Input` call site in src/ is read, and each configuration the classic pages hand it is rendered through
// `renderToStaticMarkup` by the kit as it stood BEFORE WP5 (its blob, pinned below — content-addressed, so a rebase
// cannot move it) and by the kit as it stands: alone, and inside its own Field. The markup must be byte-equal. A call
// site that sets one of WP5's own props (`grouped`, `attention`, `size="xl"`) is the new path, not a classic one: it is
// counted and named, never rendered against the old kit. The plants show the census red on a stray `aria-invalid`
// with `attention` unset, on the grouped path reached without its prop, and on the attention edge reached without it.
const { execFileSync } = await import("node:child_process");
const { readdirSync, statSync } = await import("node:fs");
const { join, relative } = await import("node:path");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const R = nodeRequire("react") as typeof import("react");
type RenderKit = { Input: React.ElementType; Field: React.ElementType };

/** input.tsx as it stood before S8 WP5: the blob of origin/main 5da3db0f (2026-10-08), unchanged to S8's base. */
const PRE_WP5_BLOB = "c8be959a9c6a0da64676ac706ffa1491f57b94f0";
let preSource = "";
try {
  preSource = execFileSync("git", ["cat-file", "blob", PRE_WP5_BLOB], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });
} catch (e) { preSource = ""; console.log(`   (git could not read ${PRE_WP5_BLOB}: ${(e as Error).message.split("\n")[0]})`); }
eq("A15 · the kit as it stood before WP5 is readable (blob c8be959a) — without it no equality below means anything", preSource.length > 0 && !preSource.includes("groupedBox"), true);

const ROOT_DIR = fileURLToPath(new URL("../src", import.meta.url));
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...walk(f));
    else if (f.endsWith(".tsx")) out.push(f);
  }
  return out;
}
/** The text of one JSX opening tag from `at` (just after `<Input`) to its close, braces and strings respected. */
function openingTag(src: string, at: number): string | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (quote !== null) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (depth === 0 && c === ">") return src.slice(at, src[i - 1] === "/" ? i - 1 : i);
  }
  return null;
}
type Attr = { name: string; literal?: string; expr?: string; bare?: boolean } | { spread: string };
function attrsOf(tag: string): Attr[] | null {
  const out: Attr[] = [];
  let i = 0;
  const balanced = (from: number): number => {
    let depth = 0, quote: string | null = null;
    for (let j = from; j < tag.length; j++) {
      const c = tag[j];
      if (quote !== null) { if (c === "\\") j++; else if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return j;
    }
    return -1;
  };
  while (i < tag.length) {
    while (i < tag.length && /\s/.test(tag[i])) i++;
    if (i >= tag.length) break;
    if (tag[i] === "{") {
      const end = balanced(i);
      if (end < 0) return null;
      out.push({ spread: tag.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    const m = /^[A-Za-z_][\w:-]*/.exec(tag.slice(i));
    if (m === null) return null;
    const name = m[0];
    i += name.length;
    if (tag[i] !== "=") { out.push({ name, bare: true }); continue; }
    i++;
    if (tag[i] === '"' || tag[i] === "'") {
      const end = tag.indexOf(tag[i], i + 1);
      out.push({ name, literal: tag.slice(i + 1, end) });
      i = end + 1;
    } else if (tag[i] === "{") {
      const end = balanced(i);
      if (end < 0) return null;
      out.push({ name, expr: tag.slice(i + 1, end).trim() });
      i = end + 1;
    } else return null;
  }
  return out;
}
const NOOP = () => {};
/** The values one attribute takes in the census: its literal; an expression's own literals; else a stand-in by name. */
function valuesOf(a: { name: string; literal?: string; expr?: string; bare?: boolean }): unknown[] | null {
  if (a.bare) return [true];
  if (a.literal !== undefined) return [a.literal];
  const e = a.expr ?? "";
  if (a.name === "ref" || a.name === "key") return null;
  if (/^on[A-Z]/.test(a.name)) return [NOOP];
  if (e === "true" || e === "false") return [e === "true"];
  if (/^-?[0-9.]+$/.test(e)) return [Number(e)];
  if (/^"[^"]*"$|^'[^']*'$/.test(e)) return [e.slice(1, -1)];
  if (["size", "type", "inputMode"].includes(a.name)) {
    const lits = [...e.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
    return lits.length > 0 ? lits : null;
  }
  if (["value", "defaultValue"].includes(a.name)) return ["1500"];
  if (["error"].includes(a.name)) return [true, "x"];
  if (["disabled", "readOnly", "mono", "required", "autoFocus", "allowDecimal", "allowNegative"].includes(a.name)) return [true, false];
  if (["prefix", "trailing"].includes(a.name)) return ["TZS"];
  if (["min", "max", "step", "maxLength", "minLength"].includes(a.name)) return ["1"];
  return ["x"];
}
const NEW_PROPS = new Set(["grouped", "attention"]);
const sites: Array<{ file: string; line: number; props: Attr[] }> = [];
const newPathSites: string[] = [];
const unread: string[] = [];
let kitFiles = 0;
for (const f of walk(ROOT_DIR)) {
  /* Comments out first: a JSX comment inside a tag ("the atom's prefix cell") would open a quote the tag never closes. */
  const src = decomment(readFileSync(f, "utf8"));
  const rel = relative(fileURLToPath(new URL("..", import.meta.url)), f);
  const imp = [...src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"(?:@\/components\/ui\/input|\.\/input)"/g)];
  if (!imp.some((m) => /(^|[,\s])Input(\s*(,|$)|\s+as\s)/.test(m[1]))) continue;
  if (rel === "src/components/ui/input.tsx") continue;
  kitFiles++;
  for (const m of src.matchAll(/<Input(?=[\s/>])/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    const tag = openingTag(src, (m.index ?? 0) + 6);
    const props = tag === null ? null : attrsOf(tag);
    if (props === null) { unread.push(`${rel}:${line}`); continue; }
    const named = props.filter((p): p is { name: string; literal?: string; expr?: string; bare?: boolean } => "name" in p);
    if (named.some((p) => NEW_PROPS.has(p.name) || (p.name === "size" && (p.literal === "xl" || (p.expr ?? "").includes('"xl"'))))) {
      newPathSites.push(`${rel}:${line}`);
      continue;
    }
    sites.push({ file: rel, line, props });
  }
}
/** Every configuration a site can hand the kit: the cross product of its attributes' values. */
function configsOf(props: Attr[]): Array<Record<string, unknown>> {
  let out: Array<Record<string, unknown>> = [{}];
  for (const p of props) {
    if ("spread" in p) continue;
    const vs = valuesOf(p);
    if (vs === null) continue;
    out = out.flatMap((c) => vs.map((v) => ({ ...c, [p.name]: v })));
  }
  return out;
}
const configs = new Map<string, Record<string, unknown>>();
for (const s of sites) for (const c of configsOf(s.props)) configs.set(JSON.stringify(c, (_k, v) => (typeof v === "function" ? "ƒ" : v)), c);
console.log(`   A15 census: ${sites.length} classic <Input> call sites in ${kitFiles} files · ${configs.size} distinct configurations · ${newPathSites.length} on WP5's new path${newPathSites.length ? ` (${newPathSites.join(", ")})` : ""}`);
eq("A15 · the census reads every <Input call site — none it could not parse", unread, []);
eq("A15 · CONTROL — the census's population did not collapse (measured 2026-10-13: 174 sites, 53 files, 267 configurations; held at ≥ 170 · ≥ 50 · ≥ 200)",
   sites.length >= 170 && kitFiles >= 50 && configs.size >= 200, true);

function markupOf(kit: RenderKit, props: Record<string, unknown>, inField: boolean): string {
  const box = R.createElement(kit.Input, props);
  try {
    return renderToStaticMarkup(inField ? R.createElement(kit.Field, { label: "L", hint: "h" }, box) : box);
  } catch (e) { return `threw: ${(e as Error).message}`; }
}
/** The configurations whose markup differs between the two kits. */
function differences(before: RenderKit, after: RenderKit): string[] {
  const out: string[] = [];
  for (const [key, props] of configs) {
    for (const inField of [false, true]) {
      if (markupOf(before, props, inField) !== markupOf(after, props, inField)) out.push(`${inField ? "in a Field · " : ""}${key}`);
    }
  }
  return out;
}
const preKit = preSource === "" ? null : (await plantedKit([], preSource)) as unknown as RenderKit;
const nowKit = (await plantedKit([])) as unknown as RenderKit;
if (preKit !== null) {
  const diff = differences(preKit, nowKit);
  eq(`⭐ A15 · without WP5's props every classic configuration renders byte for byte as before WP5 — alone and inside a Field (${configs.size * 2} renders)`, diff.slice(0, 5), []);
  eq("A15 · CONTROL — the shipped module and its in-memory copy render the same (so a red plant is the plant)", differences(KIT as unknown as RenderKit, nowKit), []);
  const A15_PLANTS: Array<[string, Array<[string, string]>]> = [
    ["a stray aria-invalid=\"false\" on every box while `attention` is unset", [["aria-invalid={errored || undefined}", "aria-invalid={errored || (attention === true ? undefined : false)}"]]],
    ["the grouped path reached without its prop", [["const grouping = grouped === true;", "const grouping = grouped !== false;"]]],
    ["the attention edge reached without its prop", [["const attentionEdge = attention === true && !error && !field?.invalid && !locked;", "const attentionEdge = attention !== true && !error && !field?.invalid && !locked;"]]],
    ["the xl figure size leaking onto another size", [['{...(size === "xl" ? { style: { ...inputRest.style, ...xlStyle.figure } } : {})}', '{...(size !== "lg" ? { style: { ...inputRest.style, ...xlStyle.figure } } : {})}']]],
  ];
  for (const [what, plant] of A15_PLANTS) {
    let verdict = "";
    try { verdict = differences(preKit, (await plantedKit(plant)) as unknown as RenderKit).length > 0 ? "red" : "still equal — the census is blind to this defect"; }
    catch (e) { verdict = `the plant could not be built: ${(e as Error).message}`; }
    eq(`CONTROL · A15 · ${what} → the render census goes red`, verdict, "red");
  }
}

// ── S8 WP5 · and RIGHT WHEN SET: what each new prop renders ─────────────────────────────────────────────────────
{
  type SetJudge = (kit: RenderKit) => Verdict;
  const html = (kit: RenderKit, props: Record<string, unknown>) => markupOf(kit, props, false);
  const SET: Record<string, { label: string; run: SetJudge }> = {
    groupedControlled: {
      label: "⭐ grouped + a controlled 5000 named \"stake\": the box shows 5,000 as a text box on the numeric keypad and carries no name; a hidden field named stake carries 5000",
      run: (kit) => {
        const h = html(kit, { grouped: true, value: "5000", name: "stake", onChange: NOOP });
        const visible = /<input(?![^>]*type="hidden")[^>]*>/.exec(h)?.[0] ?? "";
        const hidden = /<input[^>]*type="hidden"[^>]*>/.exec(h)?.[0] ?? "";
        return {
          pass: /value="5,000"/.test(visible) && /type="text"/.test(visible) && /inputmode="numeric"/i.test(visible) && !/name=/.test(visible)
            && /name="stake"/.test(hidden) && /value="5000"/.test(hidden),
          detail: h,
        };
      },
    },
    groupedDefault: {
      label: "grouped + an uncontrolled default of 012500: the box shows 12,500 and the hidden field carries 12500",
      run: (kit) => {
        const h = html(kit, { grouped: true, defaultValue: "012500", name: "stake" });
        return { pass: /<input(?![^>]*type="hidden")[^>]*value="12,500"/.test(h) && /type="hidden"[^>]*value="12500"|value="12500"[^>]*type="hidden"/.test(h), detail: h };
      },
    },
    groupedDisabled: {
      label: "a disabled grouped named box disables its hidden carrier too, so a form omits the stake; a read-only box still carries it",
      run: (kit) => {
        const disabled = html(kit, { grouped: true, name: "stake", defaultValue: "5000", disabled: true });
        const readonly = html(kit, { grouped: true, name: "stake", defaultValue: "5000", readOnly: true });
        const carrier = (h: string) => /<input[^>]*type="hidden"[^>]*>/.exec(h)?.[0] ?? "";
        return { pass: /disabled=""/.test(carrier(disabled)) && !/disabled=/.test(carrier(readonly)), detail: disabled };
      },
    },
    attention: {
      label: "⭐ attention: the strong neutral edge (--input-attention), the caller's aria-describedby, and NO aria-invalid — never the error's red",
      run: (kit) => {
        const h = html(kit, { attention: true, "aria-describedby": "warn" });
        return {
          pass: h.includes("border-color:var(--input-attention)") && !h.includes("border-danger-500") && !/aria-invalid/.test(h) && /aria-describedby="warn"/.test(h) && !h.includes("--danger-wash"),
          detail: h,
        };
      },
    },
    attentionUnderError: {
      label: "attention under an error: the error wins — its red edge and aria-invalid=\"true\" — and the attention edge is not drawn",
      run: (kit) => {
        const h = html(kit, { attention: true, error: true });
        return { pass: h.includes("border-danger-500") && /aria-invalid="true"/.test(h) && !h.includes("--input-attention"), detail: h };
      },
    },
    attentionWithCallerInvalid: {
      label: "the sheet may declare aria-invalid while attention stays neutral with a 2px noncolour cue; explicit errors still win",
      run: (kit) => {
        const h = html(kit, { attention: true, "aria-invalid": true, "aria-describedby": "low" });
        return { pass: /aria-invalid="true"/.test(h) && /aria-describedby="low"/.test(h) && h.includes("border-color:var(--input-attention)")
          && h.includes("border-width:2px") && !h.includes("border-danger-500") && !h.includes("--danger-wash"), detail: h };
      },
    },
    sizeXl: {
      label: "⭐ size xl: the ladder's top rung (--h-control-xl, 56px), the figure on --type-h2 (24px), the unit cell on --type-h4",
      run: (kit) => {
        const h = html(kit, { size: "xl", prefix: "TZS", mono: true, inputMode: "numeric" });
        return { pass: /^<span[^>]*style="[^"]*height:var\(--h-control-xl\)/.test(h) && /<input[^>]*style="font-size:var\(--type-h2\)"/.test(h) && /data-input-size="xl"/.test(h) && /style="font-size:var\(--type-h4\)"[^>]*>TZS/.test(h), detail: h };
      },
    },
  };
  for (const [name, j] of Object.entries(SET)) {
    let v: Verdict;
    try { v = j.run(KIT as unknown as RenderKit); } catch (e) { v = { pass: false, detail: `threw: ${(e as Error).message}` }; }
    eq(`(S8 WP5) ${name} · ${j.label}`, v.pass ? true : v.detail, true);
  }
  const SET_PLANTS: Array<[string, string, Array<[string, string]>]> = [
    ["groupedControlled", "the controlled digits shown ungrouped", [["? { name: undefined, value: groupedShown }", "? { name: undefined, value: heldDigits }"]]],
    ["groupedControlled", "the name left on the visible box — a form posts 5,000", [["? { name: undefined, value: groupedShown }", "? { value: groupedText(heldDigits) }"]]],
    ["groupedDefault", "the hidden field's digits not read from the default", [['const [ownDigits, setOwnDigits] = React.useState(() => (grouping ? groupedDigits(String(rest.defaultValue ?? "")) : ""));', 'const [ownDigits, setOwnDigits] = React.useState(() => "");']]],
    ["groupedDisabled", "a disabled grouped box still submits its hidden digits", [["value={heldDigits} disabled={inputRest.disabled}", "value={heldDigits}"]]],
    ["attention", "attention drawn in the error's red", [['borderColor: "var(--input-attention)"', 'borderColor: "var(--danger-500)"']]],
    ["attention", "attention claiming aria-invalid", [["aria-invalid={errored || undefined}", "aria-invalid={errored || attention || undefined}"]]],
    ["attentionUnderError", "attention drawn over an error", [["const attentionEdge = attention === true && !error && !field?.invalid && !locked;", "const attentionEdge = attention === true;"]]],
    ["attentionWithCallerInvalid", "the sheet's aria-invalid suppresses its neutral attention cue", [["attention === true && !error && !field?.invalid && !locked", "attention === true && !errored && !locked"]]],
    ["attentionWithCallerInvalid", "attention loses its noncolour thickness cue", [['borderWidth: "2px"', 'borderWidth: "1px"']]],
    ["sizeXl", "xl on a literal height off the ladder (the canvas's 60px)", [['box: { height: "var(--h-control-xl)" },', 'box: { height: "60px" },']]],
    ["sizeXl", "xl loses the opt-in marker that keeps its figure above the phone anti-zoom floor", [['{...(size === "xl" ? { "data-input-size": "xl" } : {})}', ""]]],
  ];
  for (const [judge, what, plant] of SET_PLANTS) {
    let verdict = "";
    try { verdict = SET[judge].run((await plantedKit(plant)) as unknown as RenderKit).pass ? "still passes — the judge is blind to this defect" : "red"; }
    catch (e) { verdict = `the plant could not be built: ${(e as Error).message}`; }
    eq(`CONTROL · (S8 WP5) ${what} → "${judge}" goes red on the planted copy`, verdict, "red");
  }
}

// Real browser proof is opt-in: the normal in-process CI gate needs no browser installation or server.
// Chromium's real composition range is essential here; a fabricated input event could never show the duplicate
// stake that formatting mid-composition caused. The former handler is planted out of a second bundled kit.
if (process.argv.includes("--browser")) {
  const { build } = await import("esbuild");
  const { chromium } = await import("playwright");
  const compositionAttrs = "{...(grouping ? { onCompositionStart: handleCompositionStart, onCompositionEnd: handleCompositionEnd } : {})}";
  eq("browser control: composition handler plant has exactly one anchor", KIT_SOURCE.split(compositionAttrs).length, 2);
  const bundle = await build({
    stdin: {
      contents: `
        import * as React from "react";
        import { createRoot } from "react-dom/client";
        import { flushSync } from "react-dom";
        import { Input as Fixed } from "numeric-proof:fixed";
        import { Input as Broken } from "numeric-proof:broken";
        const w = window; let root;
        function Box({ kit, props, controlled, functional }) {
          const Input = kit === "broken" ? Broken : Fixed;
          const [value, setValue] = React.useState(props.initial ?? "");
          const [, setOther] = React.useState("first");
          w.state = controlled ? value : undefined;
          const onChange = e => {
            w.changes.push(e.target.value);
            if (controlled) {
              if (functional) { setOther(null); setValue(() => e.target.value); }
              else setValue(e.target.value);
            }
          };
          const { initial, ...rest } = props;
          return <Input {...rest} {...(controlled ? { value } : { defaultValue: initial })} onChange={onChange} />;
        }
        w.mount = (kit, props, controlled = true, functional = false) => {
          if (root) root.unmount();
          document.body.innerHTML = '<form id="proof"></form>';
          w.changes = []; w.state = undefined;
          root = createRoot(document.getElementById("proof"));
          flushSync(() => root.render(<Box {...{ kit, props, controlled, functional }} />));
        };
        w.snap = () => {
          const input = document.querySelector('input:not([type="hidden"])');
          return { value: input.value, caret: input.selectionEnd, state: w.state, changes: w.changes,
            hidden: document.querySelector('input[type="hidden"]')?.value,
            form: Object.fromEntries(new FormData(document.getElementById("proof"))) };
        };`,
      loader: "tsx", resolveDir: fileURLToPath(new URL("..", import.meta.url)), sourcefile: "numeric-browser-proof.tsx",
    },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    tsconfig: fileURLToPath(new URL("../tsconfig.json", import.meta.url)),
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "numeric-proof", setup(b) {
      b.onResolve({ filter: /^numeric-proof:/ }, args => ({ path: args.path, namespace: "numeric-proof" }));
      b.onLoad({ filter: /.*/, namespace: "numeric-proof" }, args => ({
        contents: args.path.endsWith(":broken") ? KIT_SOURCE.replace(compositionAttrs, "") : KIT_SOURCE,
        loader: "tsx", resolveDir: fileURLToPath(new URL("../src/components/ui", import.meta.url)),
      }));
    } }],
  });
  const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage();
    await page.setContent("<body></body>");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    type BrowserSnap = { value: string; caret: number; state?: string; changes: string[]; hidden?: string; form: Record<string, string> };
    const snap = () => page.evaluate(() => (window as any).snap()) as Promise<BrowserSnap>;
    const mount = (props: Record<string, unknown>, controlled = true, functional = false, kit = "fixed") =>
      page.evaluate(([kit, props, controlled, functional]) => (window as any).mount(kit, props, controlled, functional), [kit, props, controlled, functional]);
    const compose = async (initial: string, parts: string[], committed: string, controlled = true, kit = "fixed") => {
      await mount({ grouped: true, name: "stake", initial }, controlled, false, kit);
      await page.locator('input:not([type="hidden"])').focus();
      await page.keyboard.press("End");
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const text of parts) await cdp.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
        await cdp.send("Input.insertText", { text: committed });
        return await snap();
      } finally { await cdp.detach(); }
    };
    const compositions: Array<[string, string[], string, string]> = [
      ["", ["5", "50", "500", "5000"], "5000", "5000"],
      ["", ["1", "12", "123", "1234", "12345"], "12345", "12345"],
      ["50", ["0", "00"], "00", "5000"],
      ["500", ["0"], "0", "5000"],
      ["1000", ["0"], "0", "10000"],
      ["2500", ["0", "00"], "00", "250000"],
    ];
    for (const controlled of [true, false]) for (const [initial, parts, committed, expected] of compositions) {
      const got = await compose(initial, parts, committed, controlled);
      eq(`browser IME (${controlled ? "controlled" : "uncontrolled"}) ${initial}+${committed}: one commit, same stake in display/parent/form`,
        [got.value, controlled ? got.state : got.hidden, got.form.stake, got.changes],
        [KIT.groupedText(expected), expected, expected, [expected]]);
    }
    const broken = await compose("", ["5", "50", "500", "5000"], "5000", true, "broken");
    eq("RED browser control: removing composition guards multiplies the stake, so the 5000 assertion detects it", broken.form.stake !== "5000", true);
    await mount({ grouped: true, name: "stake", initial: "", maxLength: 9 }, true, true);
    await page.locator('input:not([type="hidden"])').focus(); await page.keyboard.type("1234567890");
    const nine = await snap();
    eq("browser: deferred parent reads digits and native maxLength counts no display commas; cap refuses tenth digit", [nine.state, nine.hidden, nine.value], ["123456789", "123456789", "123,456,789"]);
    await mount({ grouped: true, name: "stake", initial: "5000", disabled: true });
    eq("browser: disabled grouped stake is absent from actual FormData", (await snap()).form, {});
    await mount({ grouped: true, name: "stake", initial: "12345" }, false);
    await page.evaluate(() => {
      const input = document.querySelector('input:not([type="hidden"])') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "12,34");
      input.setSelectionRange(5, 5); input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const unfocused = await snap();
    eq("browser: no-focus deletion preserves the intended digits", [unfocused.value, unfocused.form.stake], ["1,234", "1234"]);
    await mount({ grouped: true, name: "stake", initial: "1000" });
    await page.locator('input:not([type="hidden"])').focus();
    await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Delete"); await page.keyboard.press("Delete");
    eq("browser: forward Delete passes a grouping comma and then deletes the digit", (await snap()).form.stake, "100");
    await mount({ grouped: true, name: "stake", initial: "1000" });
    await page.locator('input:not([type="hidden"])').focus();
    await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Backspace");
    eq("browser: after deleting the leading digit the remaining places stay editable", (await snap()).value, "000");
    await page.keyboard.type("5");
    eq("browser: replacing that digit keeps the intended 5000 stake", (await snap()).form.stake, "5000");
    await page.keyboard.press("Control+z");
    eq("browser: grouped Undo restores the previous numeric amount", [(await snap()).form.stake, (await snap()).value], ["0", "000"]);
    await page.keyboard.press("Control+Shift+z");
    eq("browser: grouped Redo restores the same intended stake", (await snap()).form.stake, "5000");
  } finally { await browser.close(); }
}

console.log(`\nnumeric-input: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
