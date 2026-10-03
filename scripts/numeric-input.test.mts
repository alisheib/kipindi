/**
 * Unit tests for the strict numeric-input sanitiser used by the shared <Input>
 * atom (src/components/ui/input.tsx). Every numeric field across the app routes
 * through this, so it must NEVER let a non-numeric character survive.
 *
 * ⭐ AND IT MUST NEVER CHANGE THE SIZE OF A NUMBER (vb6, 2026-10-03). The whole-number branch used to DELETE every
 * dot, so a pasted "12.50" became 1250 on the agent rail's refund amount — a 100× change no range check catches. A
 * paste now keeps what it brought up to its first dot; a TYPED dot is refused and the digits typed straight after it,
 * at its caret, are dropped (so "12500.00" typed key by key ends on 12500) until a change over a selection, a digit
 * typed anywhere else, a named key, a blur or a deletion; a stray dot inside a number keeps every digit; a Chinese
 * keyboard's full stop is a dot; the line is owed only once digits were dropped; a phone box (type="tel") reads a dot
 * as a separator. The typed path is driven through `numericBox` — the very object each Input keeps and calls from its
 * own handlers — with a stand-in element, and every judge is shown RED on a planted copy of input.tsx (built in memory
 * with esbuild; nothing is written), while the same copy with nothing planted passes. The console's balance
 * adjustment, the one money box that was still hand-rolled, is pinned to the kit box at the end.
 *
 * Run: npm run test:numeric   (tsx scripts/numeric-input.test.mts)
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

type Kit = Pick<typeof KIT, "sanitizeNumericInput" | "readNumericEntry" | "numericBox" | "numericNoticeKeys">;
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
 * "paste:TEXT" (text arrives with no key), "selectAll", "tap:N" (a pointer puts the caret at N), "blur" or "focus".
 * `android` reports every key as "Unidentified", which is what an Android keyboard sends for digits and dots alike.
 * ⭐ The box is told the selection as the Input tells it: before every key (its onKeyDown) and after every move of the
 * caret or the selection (its onSelect — a select-all, a tap, an arrow).
 */
function drive(kit: Kit, steps: string[], opts: Opts = INT, start = "", android = false) {
  const box = kit.numericBox();
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
    else if (s.startsWith("paste:")) { put(s.slice(6)); box.change(el, opts); }
    else if (s === "ArrowLeft" || s === "ArrowRight") {
      told();
      box.key(s);
      const to = Math.max(0, Math.min(el.value.length, el.selectionEnd + (s === "ArrowLeft" ? -1 : 1)));
      el.selectionStart = to;
      el.selectionEnd = to;
      told();
    } else if (s === "Backspace") {
      told();
      box.key(s);
      const a = el.selectionStart, b = el.selectionEnd;
      if (a !== b || a > 0) {
        const from = a === b ? a - 1 : a;
        el.value = el.value.slice(0, from) + el.value.slice(b);
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
    label: "a dot typed into an empty box says nothing until the digit after it is dropped, then says so, keeps saying so through a stripped letter, and the line goes once the box moves",
    run: (kit) => {
      const r = drive(kit, [".", "5", "a", "blur", "focus", "5"]);
      return { pass: r.value === "5" && lines(r.owed) === "-DDDD-", detail: show({ value: r.value, lines: lines(r.owed) }) };
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
    label: "⭐ a caret moved by a tap ends the hold: 12500, a refused dot, a tap after the 12, then 7 — the 7 is inserted (127500), as it must be on a phone with no arrow keys",
    run: (kit) => {
      const r = drive(kit, [..."12500.", "tap:2", "7"]);
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
};

const judgeOn = (kit: Kit, name: string): Verdict => {
  try { return JUDGES[name].run(kit); } catch (e) { return { pass: false, detail: `threw: ${(e as Error).message}` }; }
};
for (const name of Object.keys(JUDGES)) {
  const v = judgeOn(KIT, name);
  eq(`${name} · ${JUDGES[name].label}`, v.pass ? true : v.detail, true);
}

// ── The plants: a copy of input.tsx with one defect put back, built in memory, judged by the SAME judge ──
const KIT_SOURCE = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8");
const nodeRequire = createRequire(import.meta.url);
const KIT_DEPS: Record<string, unknown> = {
  react: nodeRequire("react"),
  "@/lib/utils": await import("../src/lib/utils.ts"),
  "@/components/ui/field-legend": await import("../src/components/ui/field-legend.tsx"),
  "@/lib/i18n": await import("../src/lib/i18n.tsx"),
};
/** input.tsx with each [from, to] planted (every `from` must occur exactly once), built with esbuild and evaluated as a
 *  module in memory — nothing touches the disk. */
async function plantedKit(plants: Array<[string, string]>): Promise<Kit> {
  let src = KIT_SOURCE;
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
    plant: [["if (memory.latchedAt === span.start && removed === 0 && change.replaced !== true && /^[0-9]+$/.test(arrived)) {", "if (false) {"]] },
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
    plant: [["latchedAt: dot >= 0 && !/[0-9]/.test(fraction) ? caretOut : null,", "latchedAt: dot >= 0 ? caretOut : null,"]] },
  { judge: "emptyDot", what: "the dot's line dropped by a change that moved nothing",
    plant: [["const keepDot = value === cleanBefore && was !== null && was.dot;", "const keepDot = false;"]] },
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
      select: /numeric[.]select[(]e[.]currentTarget[.]selectionStart, e[.]currentTarget[.]selectionEnd[)]/.test(kit) && /onSelect=[{]handleSelect[}]/.test(kit),
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

console.log(`\nnumeric-input: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
