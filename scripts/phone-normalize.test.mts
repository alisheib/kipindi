/**
 * THE PHONE FIELD MUST ACCEPT WHAT THE SERVER ACCEPTS.
 *
 * Found by typing into the live site: `PhoneInput` stripped non-digits and
 * truncated to 9, so four of the five shapes a Tanzanian actually writes were
 * mangled before the server ever saw them — on registration AND on sign-in:
 *
 *   typed              kept by the field
 *   0712000101    ->   071200010     (last digit lost, "invalid number")
 *   +255712000101 ->   255712000     (a DIFFERENT number)
 *   255712000101  ->   255712000
 *   0712 000 101  ->   071200010
 *   712000101     ->   712000101     (the only shape that survived)
 *
 * `tzPhone` had always accepted all four. This test pins the two definitions
 * together: whatever the widget produces must parse, and must parse to the SAME
 * E.164 number the server would derive from the raw input. A widget that narrows
 * what the validator accepts is a silent funnel leak, and this is the first
 * screen every one of the users onboarding next week has to get through.
 */
import { normalizeTzLocalDigits } from "../src/lib/phone-normalize.ts";
import { tzPhone } from "../src/lib/server/validators.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const EXPECTED = "+255712000101";

// Every shape a real person enters — typed, pasted, or copied off a card.
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
  const widget = normalizeTzLocalDigits(raw);
  const parsed = tzPhone.safeParse(widget);
  ok(
    `widget keeps "${raw}" usable (${why})`,
    parsed.success && parsed.data === EXPECTED,
    `widget produced "${widget}" -> ${parsed.success ? parsed.data : "REJECTED by tzPhone"}`,
  );
}

// The widget must never invent a valid-looking but WRONG number, which is what
// the +255 case used to do (255712000101 -> 255712000).
ok(
  "no shape silently becomes a different subscriber number",
  SHAPES.every(([raw]) => {
    const w = normalizeTzLocalDigits(raw);
    const p = tzPhone.safeParse(w);
    return !p.success || p.data === EXPECTED;
  }),
);

// Partial input while typing must stay a prefix — the field cannot fight the user.
const typed = "0712000101";
let prev = "";
let monotonic = true;
for (let i = 1; i <= typed.length; i++) {
  const cur = normalizeTzLocalDigits(typed.slice(0, i));
  if (!cur.startsWith(prev)) monotonic = false;
  prev = cur;
}
ok("typing digit-by-digit only ever appends", monotonic, `ended at "${prev}"`);
ok("…and lands on the canonical 9 digits", prev === "712000101", prev);

// Junk must not become a number.
for (const junk of ["", "abc", "+", "255", "0"]) {
  const w = normalizeTzLocalDigits(junk);
  ok(`"${junk}" does not become a valid number`, !tzPhone.safeParse(w).success || w.length === 9, `-> "${w}"`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
