/**
 * test:phone-normalize — ONE phone key, and the refusal that stops a malformed one being billed.
 *
 * ── PART ONE (2026-08): THE PHONE FIELD MUST ACCEPT WHAT THE SERVER ACCEPTS ──
 * Found by typing into the live site: `PhoneInput` stripped non-digits and truncated to 9, so four
 * of the five shapes a Tanzanian actually writes were mangled before the server ever saw them — on
 * registration AND on sign-in:
 *
 *   typed              kept by the field
 *   0712000101    ->   071200010     (last digit lost, "invalid number")
 *   +255712000101 ->   255712000     (a DIFFERENT number)
 *   255712000101  ->   255712000
 *   0712 000 101  ->   071200010
 *   712000101     ->   712000101     (the only shape that survived)
 *
 * `tzPhone` had always accepted all four. §1 pins the two definitions together: whatever the widget
 * produces must parse, and must parse to the SAME E.164 the server would derive from the raw input.
 *
 * ── PART TWO (2026-09-25, marketing plan U1): D1 AND D2 ──────────────────────
 * 🔴 D1 — THE IDD PREFIX PRODUCED A SIXTEEN-DIGIT MSISDN. Measured on this file's own vectors
 * before the fix:
 *
 *   toMsisdn255("00255712345678")            -> "2550255712345678"   (16 digits, on the wire)
 *   normalizeTzLocalDigits("00255712345678") -> "255712345"          (a different number entirely)
 *
 * Both helpers tested `startsWith("0")` before `startsWith("255")`, so an international `00` IDD
 * prefix was read as the local trunk prefix. The two rails then disagreed in OPPOSITE directions on
 * the same input, which is the shape of defect that survives review: each function looks correct
 * read alone.
 *
 * ⛔ IT WAS LATENT, NOT LIVE, AND THAT IS EXACTLY WHY IT HAD TO BE FIXED BEFORE THE IMPORTER. Every
 * caller today stands behind `tzPhone`, whose regex `^(?:\+?255|0)?[67]\d{8}$` cannot pass a `00…`
 * string through. The contacts importer (plan U25/U26) is the first caller that will not — a pasted
 * `00255…` is one of the commonest shapes in a real address book. Fixing it after the importer
 * exists means fixing it with rows already written.
 *
 * 🔴 D2 — NOTHING REFUSED A MALFORMED NUMBER AT THE WIRE. `sendBatch` normalised, wrote the
 * `SmsMessage` row, and POSTed. Four of this file's twelve vectors reach the gateway today and are
 * billed as send attempts that can never deliver: the 16-digit one, a Kenyan `+254…`, a Dar es
 * Salaam landline, and a truncated 9-digit string.
 *
 * ── WHAT THIS FILE ASSERTS, AND WHY EACH SHAPE IS NOT DECORATION ─────────────
 * §1 · the widget's shapes still parse (the 2026-08 regression).
 * §2 · TWELVE WRITTEN-OUT VECTORS, each pinned to ONE stated result for BOTH helpers. ⛔ Not round
 *      numbers and not generated — a generated corpus agrees with whatever the code does.
 * §3 · THE TWO RAILS AGREE. For every vector that is not foreign, `toMsisdn255(v)` is exactly
 *      `"255" + normalizeTzLocalDigits(v)`. ⭐ And the FOREIGN vector must BREAK that identity —
 *      without that half, an identity that held trivially would look like a passing assertion.
 * §4 · the gateway predicate's decision table, including the two numbers it deliberately does NOT
 *      catch (see the note on 70 below).
 * §5 · THE WIRE, driven for real through `sendBatch` against a stubbed gateway: a good number sends
 *      (the control), every bad one is refused `BAD_MSISDN`, no `SmsMessage` row is written for it,
 *      and ⭐ NO HTTP REQUEST IS MADE — the refusal has to happen before the money, not after.
 * §6 · the standing invariant: no row in the store carries a msisdn the gateway cannot use.
 * §2b · vb3 (2026-10-03) · the box's new spellings: ONE trunk zero written after +255 is dropped — before the nine,
 *      or before a number cut short — and another keyboard's digits (full-width, Arabic-Indic) are read.
 * §2c · vb3 · THE PASTE RULE (`pasteIntoBox`): a whole number REPLACES the box, caret at the end or in the middle,
 *      plain digits included; so does a paste that would push the box past nine digits, never a mix of two; a
 *      short paste that fits is inserted at the caret; and `pasteReplacesBox` — `PhoneInput`'s shortcut — agrees.
 * §7 · vb3 · THE COMPONENT READS THE RULE: `PhoneInput` asks `pasteReplacesBox` before its clean-paste shortcut
 *      and sets the box from `pasteIntoBox`, with no splice of its own (source — a client component needs a
 *      browser; the browser half is the drive). §7b · ONE DIGIT TABLE: house-bot's `rules.ts` imports
 *      `toAsciiDigits` from `phone-normalize.ts` and keeps no copy of its own.
 * ⚠️ `+255 0712…` IS DELIBERATELY NOT ONE OF THE TWELVE VECTORS. The box reduces it to its nine digits; the money
 *      rail (`toMsisdn255`) is unchanged and keeps the thirteen, which the wire predicate refuses — the spelling
 *      fails CLOSED there, so §3's identity rightly does not hold for it. §4's vectors are unchanged.
 *
 * ⚠️ WHAT §4 DOES NOT COVER, DELIBERATELY. `0701234567` normalises to `255701234567`, which is
 * twelve digits starting `2557`, so the wire predicate ACCEPTS it without any view on who holds NDC
 * 70. The predicate is coarse on purpose: its job is "can the gateway dial this at all", and it
 * must not silently become a second, drifting copy of the numbering plan. ⭐ The cost of getting
 * that wrong is measured, not imagined: NDC 70 was spare in the TCRA plan's 2020, 2024 and 2025
 * editions and is allocated in the 2026 one. A table pinned here would have refused a real
 * customer's number. Allocation is the numbering module's single job (plan U2). §4 asserts the gap
 * EXPLICITLY so that nobody later reads this suite as covering it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the pre-fix implementations IN MEMORY and
 * requires the MATCHING assertion to fire — not merely "something failed". This file makes no
 * file-writing call of any kind, so it stays outside `test:red-anchors` §4's undeclared count.
 *
 * Run:  npm run test:phone-normalize
 * Red:  npm run red:phone-normalize
 */
import { normalizeTzLocalDigits, toMsisdn255, isGatewayMsisdn, pasteIntoBox, pasteReplacesBox } from "../src/lib/phone-normalize.ts";
import { tzPhone } from "../src/lib/server/validators.ts";
import { sendBatch } from "../src/lib/server/sms.ts";
import { db } from "../src/lib/server/store.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

/* ⛔ FAILURE IS THE DEFAULT AND IS SET BEFORE THE FIRST `await`. A suite whose verdict is written
 * only at the end scores GREEN when a promise never settles or the process exits early — the exit
 * code is 0 unless something set it. This line is cleared at the bottom, and only there. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

/* ══ THE IMPLEMENTATIONS UNDER TEST ══════════════════════════════════════════
 * Passed in rather than imported directly by the assertions, so `--prove-red` can substitute the
 * pre-fix versions and run the IDENTICAL assertions against them. */
type Impl = {
  toMsisdn255: (raw: string) => string;
  normalizeTzLocalDigits: (raw: string) => string;
  isGatewayMsisdn: (msisdn: string) => boolean;
  /** vb3 · the number box after a paste, and `PhoneInput`'s whole-number test. */
  pasteIntoBox: (boxDigits: string, selStart: number, selEnd: number, clipboard: string) => string;
  pasteReplacesBox: (boxDigits: string, selStart: number, selEnd: number, clipboard: string) => boolean;
};

const REAL: Impl = { toMsisdn255, normalizeTzLocalDigits, isGatewayMsisdn, pasteIntoBox, pasteReplacesBox };

/** The code exactly as it stood before this unit — the defect, restored, for the red control.
 *  Copied from `src/lib/phone-normalize.ts` at `a008232e`. */
const NAIVE: Pick<Impl, "toMsisdn255" | "normalizeTzLocalDigits" | "isGatewayMsisdn"> = {
  toMsisdn255: (raw: string): string => {
    const d = (raw ?? "").replace(/\D/g, "");
    if (d.startsWith("255")) return d;
    if (d.startsWith("0")) return "255" + d.slice(1);
    if (d.length === 9) return "255" + d;
    return d;
  },
  normalizeTzLocalDigits: (raw: string): string => {
    let d = (raw ?? "").replace(/\D+/g, "");
    if (d.startsWith("255")) d = d.slice(3);
    else if (d.startsWith("0")) d = d.replace(/^0+/, "");
    return d.slice(0, 9);
  },
  // Before D2 there was no predicate at all: everything reached the wire.
  isGatewayMsisdn: () => true,
};

/** vb3 · the number box and its paste as they stood before 2026-10-03 — restored for the red control. The reducer
 *  kept the trunk zero after 255 and read ASCII digits only; every paste was spliced in at the caret; and the
 *  component took a paste over only when it was not "already clean". Copied from `phone-normalize.ts` and
 *  `phone-input.tsx` at `0968026c`. */
const preVb3Reduce = (raw: string): string => {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("255")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return d.slice(0, 9);
};
const PRE_VB3: Pick<Impl, "normalizeTzLocalDigits" | "pasteIntoBox" | "pasteReplacesBox"> = {
  normalizeTzLocalDigits: preVb3Reduce,
  pasteIntoBox: (box, start, end, clipboard) => (box.slice(0, start) + preVb3Reduce(clipboard) + box.slice(end)).slice(0, 9),
  pasteReplacesBox: (_box, _start, _end, clipboard) => clipboard !== preVb3Reduce(clipboard),
};

/** vb3's FIRST build, restored for the red control: the box dropped the trunk zero only at exactly ten digits, and a
 *  paste replaced the box only when it held nine digits — an overflowing one was still spliced and cut to nine. */
const FIRST_BUILD: Pick<Impl, "normalizeTzLocalDigits" | "pasteIntoBox" | "pasteReplacesBox"> = {
  normalizeTzLocalDigits: (raw) => {
    const d = (raw ?? "").replace(/\D+/g, "");
    return /^(?:00)?2550\d{6,8}$/.test(d) ? d.replace(/^(?:00)?255/, "").slice(0, 9) : normalizeTzLocalDigits(raw);
  },
  pasteIntoBox: (box, start, end, clipboard) => {
    const pasted = normalizeTzLocalDigits(clipboard);
    return pasted.length === 9 ? pasted : (box.slice(0, start) + pasted + box.slice(end)).slice(0, 9);
  },
  pasteReplacesBox: (_box, _start, _end, clipboard) => normalizeTzLocalDigits(clipboard).length === 9,
};

/** vb3 · the same digits as another keyboard writes them — built from code points, so no escape is decoded on the
 *  way to disk. */
const writtenIn = (zero: number, s: string): string =>
  [...s].map((c) => (c >= "0" && c <= "9" ? String.fromCharCode(zero + c.charCodeAt(0) - 48) : c)).join("");
const FULL_WIDTH = writtenIn(0xff10, "0712 345 678");   // a Chinese input method in full-width mode
const ARABIC_INDIC = writtenIn(0x0660, "0712345678");    // a phone set to Arabic

/* ══ THE TWELVE VECTORS ══════════════════════════════════════════════════════
 * Written out, one stated result each. `local` is what the form field keeps; `msisdn` is what the
 * gateway is handed; `wire` is whether the gateway may be asked to dial it at all. */
type Vector = {
  raw: string;
  why: string;
  local: string;
  msisdn: string;
  wire: boolean;
  foreign?: true;
};

const VECTORS: Vector[] = [
  { raw: "0712345678",       why: "habitual local form, leading trunk zero",  local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "712345678",        why: "bare nine digits",                         local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "255712345678",     why: "country code, no plus",                    local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+255712345678",    why: "full international, pasted",               local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "00255712345678",   why: "🔴 D1 — IDD prefix instead of the plus",   local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+255 712 345 678", why: "international, spaced as on a card",       local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "255-712-345-678",  why: "dashed",                                   local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "'+255712345678",   why: "our own CSV export's formula guard",       local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+254712345678",    why: "🔴 D2 — Kenyan; billable today",           local: "254712345", msisdn: "254712345678", wire: false, foreign: true },
  { raw: "0222123456",       why: "🔴 D2 — Dar es Salaam landline",           local: "222123456", msisdn: "255222123456", wire: false },
  { raw: "255712345",        why: "🔴 D2 — truncated, nine digits",           local: "712345",    msisdn: "255712345",    wire: false },
  { raw: "0701234567",       why: "⚠️ NDC 70 — dialable; who holds it is not this module's business", local: "701234567", msisdn: "255701234567", wire: true },
  { raw: "00712000101",      why: "🔴 D1 — IDD with no country code; 13 digits before the fix",      local: "712000101", msisdn: "255712000101", wire: true },
];

/* ══ THE ASSERTIONS ══════════════════════════════════════════════════════════ */

/** Every pure assertion, run against whichever `Impl` is handed in. Returns the labels that FAILED,
 *  so the red control can require the SPECIFIC one it planted for. */
function checkPure(impl: Impl, log: (line: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  /* ── §1 · the widget's shapes still reach the server unchanged ───────────── */
  log("\n§1 · THE FIELD ACCEPTS WHAT THE SERVER ACCEPTS");
  const EXPECTED = "+255712000101";
  const SHAPES: Array<[string, string]> = [
    ["0712000101", "habitual local form with leading zero"],
    ["+255712000101", "full international, pasted"],
    ["255712000101", "country code without the plus"],
    ["0712 000 101", "spaced, as printed on a business card"],
    ["712 000 101", "spaced, no trunk prefix"],
    ["712000101", "bare nine digits"],
    ["+255 712 000 101", "international with spaces"],
    ["0712-000-101", "dashed"],
    ["00712000101", "double-zero fat finger"],
  ];
  for (const [raw, why] of SHAPES) {
    const widget = impl.normalizeTzLocalDigits(raw);
    const parsed = tzPhone.safeParse(widget);
    ok(
      `§1 the field keeps "${raw}" usable (${why})`,
      parsed.success && parsed.data === EXPECTED,
      `field produced "${widget}" -> ${parsed.success ? parsed.data : "REJECTED by tzPhone"}`,
    );
  }
  ok(
    "§1 no shape silently becomes a different subscriber number",
    SHAPES.every(([raw]) => {
      const p = tzPhone.safeParse(impl.normalizeTzLocalDigits(raw));
      return !p.success || p.data === EXPECTED;
    }),
  );

  // Partial input while typing must stay a prefix — the field cannot fight the user.
  {
    const typed = "0712000101";
    let prev = "";
    let monotonic = true;
    for (let i = 1; i <= typed.length; i++) {
      const cur = impl.normalizeTzLocalDigits(typed.slice(0, i));
      if (!cur.startsWith(prev)) monotonic = false;
      prev = cur;
    }
    ok("§1 typing digit-by-digit only ever appends", monotonic, `ended at "${prev}"`);
    ok("§1 …and lands on the canonical nine digits", prev === "712000101", prev);
  }

  for (const junk of ["", "abc", "+", "255", "0"]) {
    const w = impl.normalizeTzLocalDigits(junk);
    ok(`§1 "${junk}" does not become a valid number`, !tzPhone.safeParse(w).success || w.length === 9, `-> "${w}"`);
  }

  /* ── §2 · the twelve vectors, one stated result each ─────────────────────── */
  log("\n§2 · TWELVE VECTORS, ONE STATED RESULT EACH");
  for (const v of VECTORS) {
    const got = impl.toMsisdn255(v.raw);
    ok(`§2 toMsisdn255("${v.raw}") is "${v.msisdn}" (${v.why})`, got === v.msisdn, `got "${got}"`);
  }
  for (const v of VECTORS) {
    const got = impl.normalizeTzLocalDigits(v.raw);
    ok(`§2 normalizeTzLocalDigits("${v.raw}") is "${v.local}"`, got === v.local, `got "${got}"`);
  }
  // ⭐ The class assertion, not just the instances: nothing this repo can be handed may produce a
  // msisdn longer than the international maximum. D1's 16-digit output is the reason it is here.
  ok(
    "§2 ⭐ no vector produces a msisdn longer than 15 digits (ITU-T E.164 maximum)",
    VECTORS.every((v) => impl.toMsisdn255(v.raw).length <= 15),
    VECTORS.filter((v) => impl.toMsisdn255(v.raw).length > 15)
      .map((v) => `"${v.raw}" -> ${impl.toMsisdn255(v.raw).length} digits`).join("; "),
  );

  /* ── §2b · vb3 · the box reads every spelling of one number ──────────────── */
  log("\n§2b · vb3 · ONE BOX RULE FOR EVERY SPELLING");
  for (const [raw, why] of [
    ["+255 0712 345 678", "the trunk zero written after +255 is dropped"],
    ["2550712345678", "…with no plus"],
  ] as const) {
    const got = impl.normalizeTzLocalDigits(raw);
    ok(`§2b vb3 · normalizeTzLocalDigits("${raw}") is "712345678" — ${why}`, got === "712345678", `got "${got}"`);
  }
  {
    const got = impl.normalizeTzLocalDigits("+255 00712 345 678");
    ok(`§2b vb3 · …and ONE zero only: "+255 00712 345 678" keeps its second zero — the box never turns a spelling the parser refuses into a number that looks whole`,
      got === "007123456", `got "${got}"`);
  }
  {
    const got = impl.normalizeTzLocalDigits("+255 0712 345 67");
    ok(`§2b vb3 · …and the trunk zero before a number cut short goes too: "+255 0712 345 67" shows 712 345 67, eight of nine — never 071 234 567, a range nobody holds`,
      got === "71234567", `got "${got}"`);
  }
  {
    const fw = impl.normalizeTzLocalDigits(FULL_WIDTH);
    const ar = impl.normalizeTzLocalDigits(ARABIC_INDIC);
    ok("§2b vb3 · the box reads another keyboard's digits — full-width and Arabic-Indic give the same nine",
      fw === "712345678" && ar === "712345678", `full-width "${fw}" · Arabic-Indic "${ar}"`);
  }

  /* ── §2c · vb3 · a paste of a whole number replaces the box ─────────────── */
  log("\n§2c · vb3 · A PASTE OF A WHOLE NUMBER REPLACES THE BOX");
  {
    const full = "712345678"; // the box, full: "712 345 678"
    const atEnd = impl.pasteIntoBox(full, 9, 9, "0755 000 111");
    ok("§2c vb3 · pasteIntoBox · a whole number pasted into a FULL box with the caret at the END replaces it — the old number is never kept",
      atEnd === "755000111", `got "${atEnd}"`);
    const mid = impl.pasteIntoBox(full, 3, 3, "0755 000 111");
    ok("§2c vb3 · pasteIntoBox · …with the caret in the MIDDLE it replaces it too — never a third number built from both",
      mid === "755000111", `got "${mid}"`);
    const plain = impl.pasteIntoBox(full, 9, 9, "755000111");
    const trunk = impl.pasteIntoBox(full, 0, 9, "+255 0712 345 678");
    ok("§2c vb3 · pasteIntoBox · plain digits replace it too (the shortcut once let the browser drop them), and '+255 0712…' as its own nine",
      plain === "755000111" && trunk === "712345678", `plain "${plain}" · trunk "${trunk}"`);
    const inserted = impl.pasteIntoBox("712678", 3, 3, "345");
    const selected = impl.pasteIntoBox(full, 3, 6, "999");
    ok("§2c vb3 · pasteIntoBox · a SHORT paste is inserted at the caret (three digits in the middle) and replaces a selection",
      inserted === "712345678" && selected === "712999678", `inserted "${inserted}" · selected "${selected}"`);
    const nearWhole = [0, 9, 3].map((at) => impl.pasteIntoBox("755000111", at, at, "0712 345 67"));
    const completes = impl.pasteIntoBox("712", 3, 3, "345678");
    ok("§2c vb3 · pasteIntoBox · a paste that would push the box past nine digits REPLACES it — a number missing its last digit, pasted at the start, the end or the middle of a full box, becomes the eight digits it holds, never a mix of two numbers (CONTROL: the rest of a number pasted after its start still completes it)",
      nearWhole.every((v) => v === "71234567") && completes === "712345678", `near-whole [${nearWhole.join(" | ")}] · completes "${completes}"`);
    const missed = ["0755 000 111", "755000111", "+255 0712 345 678"].filter((c) => !impl.pasteReplacesBox(full, 9, 9, c));
    const overflows = impl.pasteReplacesBox(full, 0, 0, "0712 345 67") && impl.pasteReplacesBox("712345", 6, 6, "4567");
    const wrongly = ["345", "+255", "07"].filter((c) => impl.pasteReplacesBox("712", 3, 3, c));
    ok("§2c vb3 · pasteReplacesBox, the component's shortcut, is true for every whole number — plain digits included — and for a paste that would overflow the box, and false for a short paste that fits",
      missed.length === 0 && overflows && wrongly.length === 0, `missed [${missed.join(" | ")}] · overflows ${overflows} · wrongly [${wrongly.join(" | ")}]`);
  }

  /* ── §3 · the two rails agree, and the foreign vector proves it is not vacuous ── */
  log("\n§3 · THE TWO RAILS AGREE (and one vector proves the identity has teeth)");
  for (const v of VECTORS.filter((x) => !x.foreign)) {
    const expanded = impl.toMsisdn255(v.raw);
    const reduced = impl.normalizeTzLocalDigits(v.raw);
    ok(
      `§3 "${v.raw}" — toMsisdn255 is exactly "255" + normalizeTzLocalDigits`,
      expanded === "255" + reduced,
      `"${expanded}" vs "255${reduced}"`,
    );
  }
  {
    const v = VECTORS.find((x) => x.foreign)!;
    ok(
      `§3 ⭐ …and BREAKS for the foreign vector "${v.raw}" — a reducer cannot make a Kenyan number Tanzanian`,
      impl.toMsisdn255(v.raw) !== "255" + impl.normalizeTzLocalDigits(v.raw),
      "the identity held, so it is proving nothing",
    );
  }

  /* ── §4 · the gateway predicate's decision table ─────────────────────────── */
  log("\n§4 · WHAT THE GATEWAY MAY BE ASKED TO DIAL");
  for (const v of VECTORS) {
    const got = impl.isGatewayMsisdn(impl.toMsisdn255(v.raw));
    ok(
      `§4 "${v.raw}" -> ${v.wire ? "dialable" : "REFUSED"} (${v.why})`,
      got === v.wire,
      `predicate said ${got}`,
    );
  }
  // ⛔ The deliberate gap, asserted so it cannot be mistaken for coverage.
  ok(
    "§4 ⚠️ the predicate accepts NDC 70 with no view on who holds it — allocation is the numbering module's job",
    impl.isGatewayMsisdn("255701234567") === true,
  );
  ok(
    "§4 control · the predicate is not simply always-true",
    impl.isGatewayMsisdn("254712345678") === false && impl.isGatewayMsisdn("255222123456") === false,
  );
  ok(
    "§4 control · the predicate is not simply always-false",
    impl.isGatewayMsisdn("255712345678") === true && impl.isGatewayMsisdn("255612345678") === true,
  );

  return failed;
}

/** The standing invariant, read off the store. Returns the offending rows. */
async function badRowsInStore(): Promise<string[]> {
  const rows = await db.smsMessage.listRecent(10_000);
  return rows.filter((r) => !isGatewayMsisdn(r.msisdn)).map((r) => `${r.reference}=${r.msisdn}`);
}

/* ══ §7 · vb3 · THE COMPONENT READS THE RULE ════════════════════════════════
 * Source, because `PhoneInput` is a "use client" component and needs a browser to run; the browser half is the
 * drive. §2c proves the rule; this proves the box asks it — so the inline splice cannot come back while every pure
 * assertion stays green. */
const PHONE_INPUT = decomment(readFileSync(new URL("../src/components/ui/phone-input.tsx", import.meta.url), "utf8"));
const WIRING = "§7 vb3 · PhoneInput asks pasteReplacesBox BEFORE its clean-paste shortcut and sets the box from pasteIntoBox — no splice of its own";
function checkWiring(src: string, log: (line: string) => void): string[] {
  const guard = src.indexOf("if (!pasteReplacesBox(raw, start, end, text)) {");
  const shortcut = src.indexOf("if (text === stripDigits(text)) return;");
  const wired = guard > 0 && shortcut > guard && /const next = pasteIntoBox\(raw, start, end, text\);/.test(src)
    && !/raw\.slice\(0, start\)/.test(src);
  log(`  ${wired ? "ok  " : "FAIL"} ${WIRING}`);
  return wired ? [] : [WIRING];
}

/* ══ §7c · 2026-10-06 · A NUMBER TYPED BEFORE THE SCRIPT ARRIVED IS KEPT ═══════
 * On a slow connection a player types — or the browser autofills — the box before React wakes up. The box showed the
 * digits, but the hidden field the form posts stayed EMPTY and the ungrouped digits failed the box's own pattern, so
 * sign-up and sign-in were refused over a number in plain sight (measured with the page's scripts held back). Source,
 * like §7: the box must read its own value on mount (uncontrolled only), and the box must carry the ref that reads it. */
const CATCH_UP = "§7c · PhoneInput adopts a number typed before its script arrived — it reads its own box on mount, and the box holds the ref";
function checkCatchUp(src: string, log: (line: string) => void): string[] {
  const effect = /React\.useEffect\(\(\) => \{\s*if \(value !== undefined\) return;\s*const typed = boxRef\.current\?\.value \?\? "";\s*if \(typed\) setV\(stripDigits\(typed\)\);\s*\}, \[\]\);/.test(src);
  const wired = /ref=\{setBoxRef\}/.test(src) && /boxRef\.current = el;/.test(src);
  const ok = effect && wired;
  log(`  ${ok ? "ok  " : "FAIL"} ${CATCH_UP}`);
  return ok ? [] : [CATCH_UP];
}

/* ══ §7b · vb3 · ONE DIGIT TABLE ════════════════════════════════════════════
 * Every keyboard's digits are read through ONE table, `toAsciiDigits` in `phone-normalize.ts`. House-bot's whole-number
 * parser kept a private copy until vb3, and two copies drift. Source, like §7: a deleted copy cannot be driven. */
const RULES_SRC = decomment(readFileSync(new URL("../src/lib/house-bot/rules.ts", import.meta.url), "utf8"));
const ONE_TABLE = "§7b vb3 · ONE digit table — house-bot's rules.ts imports toAsciiDigits from @/lib/phone-normalize and keeps no copy of its own";
function checkOneTable(src: string, log: (line: string) => void): string[] {
  const line = /^import \{([^}]*)\} from "@[/]lib[/]phone-normalize";/m.exec(src);
  const imported = line !== null && line[1].split(",").map((s) => s.trim()).includes("toAsciiDigits");
  const copy = /const DIGIT_ZEROS|function toAsciiDigits/.test(src);
  const oneTable = imported && !copy;
  log(`  ${oneTable ? "ok  " : "FAIL"} ${ONE_TABLE}`);
  return oneTable ? [] : [ONE_TABLE];
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const log = (l: string) => console.log(l);
  const failed = checkPure(REAL, log);

  /* ── §5 · the wire, driven for real ──────────────────────────────────────── */
  log("\n§5 · THE WIRE REFUSES BEFORE IT BILLS");
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  process.env.SMS_PROVIDER = "blackball";
  process.env.SMS_SENDER_ID = "50pick";
  process.env.BLACKBALL_CLIENT_ID = "cid";
  process.env.BLACKBALL_CLIENT_SECRET = "csec";
  delete process.env.SMS_BALANCE_FLOOR_TZS;

  let httpCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/account/balance")) {
      return new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: 5000 }), { status: 200 });
    }
    httpCalls++;
    return new Response(JSON.stringify({ status: true, message: "Successfully submitted message(s) to broker.", data: null, balance: 5000 }), { status: 200 });
  }) as typeof fetch;

  const BAD = VECTORS.filter((v) => !v.wire);
  const GOOD = "+255712345678";

  // ⭐ THE CONTROL COMES FIRST. A suite that refuses everything would pass every assertion below it.
  {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([{ to: GOOD, body: "control", purpose: "OPS" }]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    ok("§5 control · a good number still sends, writes its row, and makes exactly one request",
      r.results[0]?.ok === true && after === before + 1 && httpCalls === 1,
      `ok=${r.results[0]?.ok} rows ${before}->${after} httpCalls=${httpCalls}`);
  }

  for (const v of BAD) {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([{ to: v.raw, body: "must not send", purpose: "INVITE" }]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    const res = r.results[0];
    ok(`§5 "${v.raw}" is refused BAD_MSISDN`, res?.ok === false && res?.code === "BAD_MSISDN", `code=${res?.code} ok=${res?.ok}`);
    ok(`§5 "${v.raw}" writes no SmsMessage row`, after === before, `rows ${before} -> ${after}`);
    ok(`§5 ⭐ "${v.raw}" makes no request — refused BEFORE the money, not after`, httpCalls === 0, `httpCalls=${httpCalls}`);
    ok(`§5 "${v.raw}" is handed back with no reference, because no row was minted`, res?.reference === "", `reference="${res?.reference}"`);
  }

  // ⭐ A MIXED BATCH IS THE REAL CAMPAIGN SHAPE. One bad row must not kill nine good ones — and the
  // results must stay in INPUT ORDER, because `invite-service` zips them back by target.
  {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([
      { to: GOOD, body: "a", purpose: "INVITE", targetId: "one" },
      { to: "+254712345678", body: "b", purpose: "INVITE", targetId: "two" },
      { to: "0712345679", body: "c", purpose: "INVITE", targetId: "three" },
    ]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    ok("§5 ⭐ a mixed batch sends the good and refuses only the bad",
      r.results.length === 3 && r.results[0]?.ok === true && r.results[1]?.ok === false && r.results[2]?.ok === true,
      r.results.map((x) => `${x.ok}/${x.code ?? "-"}`).join(" "));
    ok("§5 ⭐ …results stay in INPUT ORDER, carrying each caller's own key",
      r.results[0]?.targetId === "one" && r.results[1]?.targetId === "two" && r.results[2]?.targetId === "three",
      r.results.map((x) => String(x.targetId)).join(" "));
    ok("§5 …and exactly two rows are written, not three", after === before + 2, `rows ${before} -> ${after}`);
    ok("§5 …and the bad one is reported BAD_MSISDN", r.results[1]?.code === "BAD_MSISDN", String(r.results[1]?.code));
  }

  /* ── §6 · the standing invariant ─────────────────────────────────────────── */
  log("\n§6 · NO ROW CARRIES A MSISDN THE GATEWAY CANNOT USE");
  {
    const bad = await badRowsInStore();
    ok("§6 every SmsMessage row written in this run is dialable", bad.length === 0, bad.join(", "));
  }

  /* ── §7 · the component reads the rule ───────────────────────────────────── */
  log("\n§7 · vb3 · THE COMPONENT READS THE RULE");
  failed.push(...checkWiring(PHONE_INPUT, log));
  log("\n§7c · A NUMBER TYPED BEFORE THE SCRIPT ARRIVED IS KEPT");
  failed.push(...checkCatchUp(PHONE_INPUT, log));
  log("\n§7b · vb3 · ONE DIGIT TABLE");
  failed.push(...checkOneTable(RULES_SRC, log));

  console.log(`\nPHONE NORMALIZE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /* ══ RED CONTROL, IN MEMORY ════════════════════════════════════════════════
   * ⭐ EACH PLANT NAMES THE ASSERTION IT MUST BREAK. "The suite reported something" is not a red
   * control — a class already failing would satisfy it. Each plant here must (a) be proven to have
   * LANDED, and (b) produce the MATCHING failure and not merely some failure. */
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  console.log("RED CONTROL — the pre-fix code, planted in memory\n");

  // The baseline: the real implementation passes everything. Without this, a red control cannot
  // tell "the plant broke it" from "it was already broken".
  const baseline = checkPure(REAL, quiet);
  ok("§0 baseline · the shipped implementation passes every pure assertion", baseline.length === 0, baseline.join("; "));

  type Plant = { name: string; expect: RegExp; impl: Impl; landed: () => boolean; landedAs: string };

  /* ── vb3's planted reducers and pastes ── */
  /** The drop made greedy: every zero after the country code comes off, so two zeros pass as one. */
  const greedyReduce = (raw: string) => REAL.normalizeTzLocalDigits((raw ?? "").replace(/^(\+?(?:00)?255\D*)0+/, "$1"));
  /** The digit map dropped: every decimal digit outside 0-9 falls away before the reducer sees it. */
  const asciiOnlyReduce = (raw: string) => REAL.normalizeTzLocalDigits((raw ?? "").replace(/\p{Nd}/gu, (c) => (c >= "0" && c <= "9" ? c : "")));
  /** A paste that always replaces — even three digits meant for the middle. */
  const alwaysReplace = (_box: string, _from: number, _to: number, clipboard: string) => REAL.normalizeTzLocalDigits(clipboard);
  const plants: Plant[] = [
    {
      name: "D1 · the pre-fix toMsisdn255 (leading zero tested before the country code)",
      expect: /^§2 toMsisdn255\("00255712345678"\)/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00255712345678") === "2550255712345678",
      landedAs: `NAIVE.toMsisdn255("00255712345678") = "${NAIVE.toMsisdn255("00255712345678")}"`,
    },
    {
      name: "D1 · …and the sixteen-digit msisdn trips the E.164 length class assertion",
      expect: /^§2 ⭐ no vector produces a msisdn longer than 15 digits/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00255712345678").length === 16,
      landedAs: `length = ${NAIVE.toMsisdn255("00255712345678").length}`,
    },
    {
      // ⭐ FOUND BY AUDITING THE SUITE, NOT THE CODE. `00712000101` has been in §1 since August,
      // labelled "double-zero fat finger" — the one input this file already called a real user
      // mistake. Nothing anywhere evaluated `toMsisdn255` on it, and it produced a THIRTEEN-digit
      // wire msisdn. A vector can sit in a suite for a month and still be untested by it.
      name: "D1 · the pre-fix toMsisdn255 on the IDD-with-no-country-code vector (13 digits)",
      expect: /^§2 toMsisdn255\("00712000101"\)/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00712000101") === "2550712000101",
      landedAs: `NAIVE.toMsisdn255("00712000101") = "${NAIVE.toMsisdn255("00712000101")}" (${NAIVE.toMsisdn255("00712000101").length} digits)`,
    },
    {
      name: "D1 · the pre-fix normalizeTzLocalDigits (same ordering, opposite wrong answer)",
      expect: /^§2 normalizeTzLocalDigits\("00255712345678"\)/,
      impl: { ...REAL, normalizeTzLocalDigits: NAIVE.normalizeTzLocalDigits },
      landed: () => NAIVE.normalizeTzLocalDigits("00255712345678") === "255712345",
      landedAs: `NAIVE.normalizeTzLocalDigits("00255712345678") = "${NAIVE.normalizeTzLocalDigits("00255712345678")}"`,
    },
    {
      name: "D1 · …and the two rails then disagree on that vector",
      expect: /^§3 "00255712345678"/,
      impl: { ...REAL, normalizeTzLocalDigits: NAIVE.normalizeTzLocalDigits },
      landed: () => toMsisdn255("00255712345678") !== "255" + NAIVE.normalizeTzLocalDigits("00255712345678"),
      landedAs: `"${toMsisdn255("00255712345678")}" vs "255${NAIVE.normalizeTzLocalDigits("00255712345678")}"`,
    },
    {
      name: "D2 · no predicate at all — everything reaches the wire",
      expect: /^§4 "\+254712345678" -> REFUSED/,
      impl: { ...REAL, isGatewayMsisdn: NAIVE.isGatewayMsisdn },
      landed: () => NAIVE.isGatewayMsisdn("254712345678") === true,
      landedAs: "the pre-fix predicate accepts a Kenyan number",
    },
    {
      name: "D2 · …and an always-true predicate is caught by §4's own control",
      expect: /^§4 control · the predicate is not simply always-true/,
      impl: { ...REAL, isGatewayMsisdn: NAIVE.isGatewayMsisdn },
      landed: () => NAIVE.isGatewayMsisdn("255222123456") === true,
      landedAs: "the pre-fix predicate accepts a landline",
    },
    {
      name: "control · an always-FALSE predicate is caught too (so §4 cannot be satisfied by refusing all)",
      expect: /^§4 control · the predicate is not simply always-false/,
      impl: { ...REAL, isGatewayMsisdn: () => false },
      landed: () => true,
      landedAs: "an always-false predicate needs no proof of landing",
    },
    {
      name: "control · an identity that holds for EVERYTHING is caught by §3's foreign vector",
      expect: /^§3 ⭐ …and BREAKS for the foreign vector/,
      impl: { ...REAL, toMsisdn255: (raw: string) => "255" + REAL.normalizeTzLocalDigits(raw) },
      landed: () => "255" + REAL.normalizeTzLocalDigits("+254712345678") === "255254712345",
      landedAs: "a toMsisdn255 defined AS the identity makes §3 vacuous",
    },
    // ── vb3 · one box rule for every spelling, and a paste that replaces ──
    {
      name: "vb3 · the pre-vb3 reducer — the trunk zero kept after 255, so a pasted '+255 0712…' shows 071 234 567",
      expect: /^§2b vb3 · normalizeTzLocalDigits\("\+255 0712 345 678"\)/,
      impl: { ...REAL, normalizeTzLocalDigits: PRE_VB3.normalizeTzLocalDigits },
      landed: () => PRE_VB3.normalizeTzLocalDigits("+255 0712 345 678") === "071234567",
      landedAs: `PRE_VB3.normalizeTzLocalDigits("+255 0712 345 678") = "${PRE_VB3.normalizeTzLocalDigits("+255 0712 345 678")}"`,
    },
    {
      name: "vb3 · the drop made greedy — both zeros of '+255 00712…' stripped, so the box shows a number the parser refuses",
      expect: /^§2b vb3 · …and ONE zero only/,
      impl: { ...REAL, normalizeTzLocalDigits: greedyReduce },
      landed: () => greedyReduce("+255 00712 345 678") === "712345678",
      landedAs: `greedyReduce("+255 00712 345 678") = "${greedyReduce("+255 00712 345 678")}"`,
    },
    {
      name: "vb3 · the digit map dropped — an Arabic or Chinese keyboard's digits vanish from the box",
      expect: /^§2b vb3 · the box reads another keyboard's digits/,
      impl: { ...REAL, normalizeTzLocalDigits: asciiOnlyReduce },
      landed: () => asciiOnlyReduce(ARABIC_INDIC) === "" && asciiOnlyReduce(FULL_WIDTH) === "",
      landedAs: "with the map gone, nothing of either number reaches the box",
    },
    {
      name: "vb3 · the pre-vb3 paste — spliced at the caret: a whole number into a full box, caret at the end, keeps the OLD number",
      expect: /^§2c vb3 · pasteIntoBox · a whole number pasted into a FULL box with the caret at the END/,
      impl: { ...REAL, pasteIntoBox: PRE_VB3.pasteIntoBox },
      landed: () => PRE_VB3.pasteIntoBox("712345678", 9, 9, "0755 000 111") === "712345678",
      landedAs: `the splice keeps "${PRE_VB3.pasteIntoBox("712345678", 9, 9, "0755 000 111")}"`,
    },
    {
      name: "vb3 · …and with the caret in the middle the splice builds a THIRD number from the two",
      expect: /^§2c vb3 · pasteIntoBox · …with the caret in the MIDDLE/,
      impl: { ...REAL, pasteIntoBox: PRE_VB3.pasteIntoBox },
      landed: () => PRE_VB3.pasteIntoBox("712345678", 3, 3, "0755 000 111") === "712755000",
      landedAs: `the splice builds "${PRE_VB3.pasteIntoBox("712345678", 3, 3, "0755 000 111")}"`,
    },
    {
      name: "vb3 · …and a plain nine-digit paste fares no better — the old number stays",
      expect: /^§2c vb3 · pasteIntoBox · plain digits replace it too/,
      impl: { ...REAL, pasteIntoBox: PRE_VB3.pasteIntoBox },
      landed: () => PRE_VB3.pasteIntoBox("712345678", 9, 9, "755000111") === "712345678",
      landedAs: "the splice keeps the old number for plain digits too",
    },
    {
      name: "vb3 · a paste that ALWAYS replaces — three digits meant for the middle wipe the box",
      expect: /^§2c vb3 · pasteIntoBox · a SHORT paste is inserted at the caret/,
      impl: { ...REAL, pasteIntoBox: alwaysReplace },
      landed: () => alwaysReplace("712678", 3, 3, "345") === "345",
      landedAs: `alwaysReplace("712678", 3, 3, "345") = "${alwaysReplace("712678", 3, 3, "345")}"`,
    },
    {
      name: "vb3 · the shortcut still 'already clean' — a plain nine-digit paste goes to the browser, which drops it into a full box",
      expect: /^§2c vb3 · pasteReplacesBox, the component's shortcut/,
      impl: { ...REAL, pasteReplacesBox: PRE_VB3.pasteReplacesBox },
      landed: () => PRE_VB3.pasteReplacesBox("712345678", 9, 9, "755000111") === false,
      landedAs: "the old shortcut leaves a plain nine-digit paste to the browser",
    },
    {
      name: "vb3 · the FIRST build's box — the trunk zero dropped only at exactly ten digits, so '+255 0712 345 67' shows 071 234 567",
      expect: /^§2b vb3 · …and the trunk zero before a number cut short goes too/,
      impl: { ...REAL, normalizeTzLocalDigits: FIRST_BUILD.normalizeTzLocalDigits },
      landed: () => FIRST_BUILD.normalizeTzLocalDigits("+255 0712 345 67") === "071234567",
      landedAs: `the first build's box reads "+255 0712 345 67" as "${FIRST_BUILD.normalizeTzLocalDigits("+255 0712 345 67")}"`,
    },
    {
      name: "vb3 · the FIRST build's paste — only a nine-digit paste replaced, so a number missing its last digit was cut into a mix of two",
      expect: /^§2c vb3 · pasteIntoBox · a paste that would push the box past nine digits REPLACES it/,
      impl: { ...REAL, pasteIntoBox: FIRST_BUILD.pasteIntoBox },
      landed: () => FIRST_BUILD.pasteIntoBox("755000111", 0, 0, "0712 345 67") === "712345677",
      landedAs: `the first build's paste gives "${FIRST_BUILD.pasteIntoBox("755000111", 0, 0, "0712 345 67")}"`,
    },
    {
      name: "vb3 · the FIRST build's shortcut — an overflowing short paste left to the browser, whose maxLength drops it or cuts it to fit",
      expect: /^§2c vb3 · pasteReplacesBox, the component's shortcut/,
      impl: { ...REAL, pasteReplacesBox: FIRST_BUILD.pasteReplacesBox },
      landed: () => FIRST_BUILD.pasteReplacesBox("712345678", 0, 0, "0712 345 67") === false,
      landedAs: "the first build's test says an eight-digit paste into a full box does not replace it",
    },
  ];

  for (const p of plants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
    const failures = checkPure(p.impl, quiet);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`  └─ fires: ${p.expect.source.slice(0, 60)}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 3).join(" | ")}`);
  }

  // §6's invariant gets its own plant: a row the old code would have written, put straight into the
  // store. Nothing else in this file can prove that assertion is able to fail.
  {
    const ref = "sms_redcontrol_00255";
    db.smsMessage.create({
      reference: ref, msisdn: NAIVE.toMsisdn255("00255712345678"), purpose: "OPS", provider: "blackball",
      senderId: "50pick", bodyLen: 1, status: "QUEUED", providerMsg: null, dlrStatus: null, dlrDesc: null,
      balanceTzs: null, attempts: 1, targetType: null, targetId: null,
      createdAt: "2026-09-25T00:00:00.000Z", sentAt: null, deliveredAt: null, failedAt: null,
    });
    const bad = await badRowsInStore();
    ok("PLANT LANDED · a 16-digit row, exactly as the pre-fix sendBatch would have written it",
      bad.some((b) => b.startsWith(ref)), bad.join(", "));
    ok("  └─ fires: §6 every SmsMessage row written in this run is dialable", bad.length > 0,
      "the invariant did not see a row the gateway cannot dial");
  }

  // §7 reads the SOURCE, so its plants are source-level — still in memory, and nothing is written.
  {
    ok("§0 baseline · the shipped PhoneInput reads the rule", checkWiring(PHONE_INPUT, quiet).length === 0);
    const SOURCE_PLANTS = [
      ["vb3 · the inline splice back in the component — the rule tested, the box not asking it",
        "const next = pasteIntoBox(raw, start, end, text);",
        "const next = (raw.slice(0, start) + stripDigits(text) + raw.slice(end)).slice(0, 9);"],
      ["vb3 · the whole-number test dropped — a plain nine-digit paste goes straight to the shortcut again",
        "if (!pasteReplacesBox(raw, start, end, text)) {",
        "if (true) {"],
    ] as const;
    for (const [name, from, to] of SOURCE_PLANTS) {
      ok(`PLANT LANDED · ${name}`, PHONE_INPUT.split(from).length === 2, "the anchor must match the shipped source exactly once");
      ok(`  └─ fires: ${WIRING.slice(0, 60)}`, checkWiring(PHONE_INPUT.replace(from, to), quiet).includes(WIRING),
        "the wiring check did not see the planted component");
    }
  }

  // §7c reads the SOURCE too: each half of the catch-up removed must fire — in memory, and nothing is written.
  {
    ok("§0 baseline · the shipped PhoneInput keeps a number typed before its script arrived", checkCatchUp(PHONE_INPUT, quiet).length === 0);
    const CATCH_PLANTS = [
      ["2026-10-06 · the catch-up dropped — a number typed before hydration is lost again",
        "if (typed) setV(stripDigits(typed));", ""],
      ["2026-10-06 · the box loses its ref — the catch-up reads nothing",
        "ref={setBoxRef}", "ref={ref}"],
    ] as const;
    for (const [name, from, to] of CATCH_PLANTS) {
      ok(`PLANT LANDED · ${name}`, PHONE_INPUT.split(from).length === 2, "the anchor must match the shipped source exactly once");
      ok(`  └─ fires: ${CATCH_UP.slice(0, 60)}`, checkCatchUp(PHONE_INPUT.replace(from, to), quiet).includes(CATCH_UP),
        "the catch-up check did not see the planted component");
    }
  }

  // §7b reads rules.ts's SOURCE: a private copy put back must fire — in memory, and nothing is written.
  {
    ok("§0 baseline · house-bot's rules.ts reads the one digit table", checkOneTable(RULES_SRC, quiet).length === 0);
    const IMPORT = 'import { toAsciiDigits } from "@/lib/phone-normalize";';
    ok("PLANT LANDED · vb3 · house-bot's private digit table put back — the second copy that drifts", RULES_SRC.split(IMPORT).length === 2,
      "the import line must match the shipped source exactly once");
    ok(`  └─ fires: ${ONE_TABLE.slice(0, 60)}`,
      checkOneTable(RULES_SRC.replace(IMPORT, "function toAsciiDigits(s: string): string | null { return s; }"), quiet).includes(ONE_TABLE),
      "the one-table check did not see the private copy");
  }

  console.log(`\nRED CONTROL — ${fail === 0 ? `all ${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
