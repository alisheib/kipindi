/**
 * Unit tests for the strict numeric-input sanitiser used by the shared <Input>
 * atom (src/components/ui/input.tsx). Every numeric field across the app routes
 * through this, so it must NEVER let a non-numeric character survive.
 *
 * Run: npm run test:numeric   (tsx scripts/numeric-input.test.mts)
 */

import { sanitizeNumericInput } from "../src/components/ui/input.tsx";

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

// ── Integer mode strips dots ───────────────────────────────────────────
eq("'12.50' int -> '1250'", sanitizeNumericInput("12.50", INT), "1250");
eq("'.' int -> ''", sanitizeNumericInput(".", INT), "");

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

console.log(`\nnumeric-input: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
