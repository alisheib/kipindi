/**
 * THE MONEY FORMS OPEN WITH THE PLAYER'S OWN NUMBER — Jay (Gaming Board) item #8.
 *
 * Deposit and withdraw used to open with an EMPTY field behind the placeholder
 * `712 345 678`, so every player retyped their own number every time. ⛔ A placeholder must
 * never become a value (finding A-5), so the fix is a real default, not a greyed hint.
 *
 * ⭐ THE RULE IS NOT `sp.msisdn ?? account`, AND THAT IS THE WHOLE POINT OF THIS SUITE.
 * Both actions carry the submitted values back on failure **only when they are truthy** —
 * `withdraw/actions.ts` and `deposit/actions.ts` each omit an EMPTY msisdn. So the naive
 * form would replace a field the player had deliberately CLEARED with their account number,
 * on the screen that decides where their money goes. §2 drives that case directly, and §4
 * pins the carry behaviour it depends on, because a rule written against an assumption about
 * another file is a rule that goes false when that file changes.
 *
 * ⚠️ WITHDRAWALS ARE THE SENSITIVE HALF. A defaulted payout destination is a CONVENIENCE,
 * never an assumption: this changes what is DISPLAYED and nothing else. §5 pins that every
 * destination validation the action already ran still runs.
 *
 * Run: npm run test:msisdn-prefill
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { moneyFormMsisdn, normalizeTzLocalDigits } = await import("../src/lib/phone-normalize.ts");

const withdrawPage = decomment(readFileSync(join(ROOT, "src/app/wallet/withdraw/page.tsx"), "utf8"));
const depositPage = decomment(readFileSync(join(ROOT, "src/app/wallet/deposit/page.tsx"), "utf8"));
const withdrawAct = decomment(readFileSync(join(ROOT, "src/app/wallet/withdraw/actions.ts"), "utf8"));
const depositAct = decomment(readFileSync(join(ROOT, "src/app/wallet/deposit/actions.ts"), "utf8"));

// ── 1 · A FRESH VISIT PREFILLS, in every shape a phone is stored in ─────────
{
  ok("1: a fresh visit shows the account's own number",
     moneyFormMsisdn("+255712000101", undefined, false) === "712000101",
     moneyFormMsisdn("+255712000101", undefined, false));
  // The stored shape must not matter — that is what `normalizeTzLocalDigits` is for.
  for (const stored of ["+255712000101", "255712000101", "0712000101", "712000101"]) {
    ok(`1: …stored as ${stored}`, moneyFormMsisdn(stored, undefined, false) === "712000101",
       moneyFormMsisdn(stored, undefined, false));
  }
  ok("1: it delegates to the ONE normaliser rather than re-deriving the rule",
     moneyFormMsisdn("+255712000101", undefined, false) === normalizeTzLocalDigits("+255712000101"));
}

// ── 2 · ⭐ A FAILED SUBMIT ROUND-TRIPS WHAT WAS TYPED, NOT THE ACCOUNT ──────
{
  ok("2: ⭐ a different number the player typed survives the error",
     moneyFormMsisdn("+255712000101", "788123456", true) === "788123456",
     moneyFormMsisdn("+255712000101", "788123456", true));
  // 🔴 THE CASE A NAIVE `??` GETS WRONG. The actions omit an empty msisdn from the carry
  // params, so `submitted` arrives undefined — and falling back to the account number would
  // silently refill a field the player had emptied on purpose, on a payout destination.
  ok("2: 🔴 a CLEARED field stays cleared after an error — it is not refilled from the account",
     moneyFormMsisdn("+255712000101", undefined, true) === "",
     moneyFormMsisdn("+255712000101", undefined, true));
  ok("2: …and an explicitly empty carry stays empty too",
     moneyFormMsisdn("+255712000101", "", true) === "");
  // A typed value is normalised on the way back, so the field never shows a shape the
  // 9-digit input cannot hold.
  ok("2: a typed `0788123456` comes back as the 9 digits the field accepts",
     moneyFormMsisdn("+255712000101", "0788123456", true) === "788123456",
     moneyFormMsisdn("+255712000101", "0788123456", true));
}

// ── 3 · DEPOSIT uses the shared rule — and after `E-215`, only deposit does ─
//
// 🔴 THIS SECTION USED TO LOOP OVER BOTH PAGES, AND SPLITTING IT IS THE POINT.
// Jay item #8 (`E-210`) prefilled a free-text number field on BOTH money screens, and that
// was right for both at the time. `E-215` changed one of them: a withdrawal may now only be
// paid to the account's registered number, so the withdraw screen has no editable
// destination left to prefill — §6 pins what it has instead. Leaving the old loop here would
// have kept a guard asserting a decision the owner has since replaced, which is the
// "one finding, one truth" failure (§0.1a) wearing a green tick.
{
  const src = depositPage;
  ok("3: deposit seeds the field through the shared rule",
     /moneyFormMsisdn\(session\.phoneE164, sp\.msisdn, errorMsg != null\)/.test(src));
  // ⛔ The old form is the defect. If it comes back, so does the cleared-field bug.
  ok('3: ⛔ deposit no longer uses the naive fallback', !/sp\.msisdn \?\? ""/.test(src));
  ok("3: deposit still renders the value as the field's default, not a placeholder",
     /defaultValue=\{prevMsisdn/.test(src));
  // A-5: the hint stays a hint.
  ok('3: deposit keeps the placeholder as a placeholder', /placeholder="712 345 678"/.test(src));
  // ⭐ `E-215` · and deposit gained a REAL affordance for the other number, because a box
  // that already holds your own number reads as settled rather than editable.
  ok("3: ⭐ deposit offers a working \"use another number\" control",
     /<DepositNumberChoice/.test(src) && /useAnother: t\.wallet\.useAnotherNumber/.test(src));
}

// ── 4 · ⭐ THE ASSUMPTION THIS RULE RESTS ON, PINNED ────────────────────────
{
  // §2's cleared-field case is only reachable because the actions DROP an empty msisdn. If
  // that ever changes, the rule is still correct but this suite's reasoning would be stale —
  // so assert the thing rather than believe it.
  ok("4: ⭐ the withdraw action omits an empty msisdn from its carry params",
     /msisdn \? `&msisdn=\$\{encodeURIComponent\(msisdn\)\}` : ""/.test(withdrawAct));
  ok("4: ⭐ the deposit action does the same", /if \(msisdn\) carry\.set\("msisdn", msisdn\)/.test(depositAct));
}

// ── 5 · ⛔ A CONVENIENCE, NOT AN ASSUMPTION — nothing about validation moved ─
{
  // The destination is still required and still validated server-side. This change touches
  // display only, and on a payout screen that distinction is the whole safety argument.
  ok("5: withdraw still refuses a missing destination", /msisdnRequired|!msisdn/.test(withdrawAct));
  ok("5: deposit still refuses a missing destination", /!msisdn/.test(depositAct));
  // ⛔ The ACTION still reads the FORM, not the session — unchanged by `E-215` and worth
  // keeping green. The seal is in the SERVICE, one layer below, where it cannot be skipped
  // by a caller that builds its own FormData. If the action started reading the session
  // instead, the rule would look enforced while `withdraw()` — which the two operator retry
  // paths call DIRECTLY, with no action and no form at all — went on comparing nothing.
  ok("5: ⛔ the action takes the destination from the FORM, never from the session",
     /formData\.get\("msisdn"\)/.test(withdrawAct) && !/session\.phoneE164/.test(withdrawAct));
}

// ── 6 · 🔴 `E-215` · WITHDRAW NO LONGER HAS AN EDITABLE DESTINATION AT ALL ────
{
  const src = withdrawPage;
  // The destination comes from the SESSION on this page, and must not be recoverable from
  // the query string: the action carries `msisdn` back on an error redirect, so seeding from
  // `sp.msisdn` would let a hand-crafted POST put an attacker's number on screen under the
  // words "Registered number" — a false statement about where money is going.
  ok("6: 🔴 withdraw seeds the destination from the SESSION, not the query string",
     /normalizeTzLocalDigits\(session\.phoneE164\)/.test(src) && !/moneyFormMsisdn\(/.test(src));
  ok("6: withdraw carries the value in a hidden input the confirm step can read",
     /<input type="hidden" name="msisdn" value=\{registeredMsisdn\} \/>/.test(src));
  // ⛔ THE OWNER'S EXPLICIT INSTRUCTION: not a greyed box. A `disabled` field says "you may
  // not" and never says why, so the player cannot tell it from a broken form.
  ok("6: ⛔ the destination is NOT a disabled input",
     !/name="msisdn"[\s\S]{0,300}?disabled/.test(src));
  // …and it says WHY, in the player's own language rather than in English prose.
  ok("6: ⭐ the screen states the rule, localized",
     /t\.wallet\.destinationLockedBody/.test(src) && /t\.wallet\.destinationRegistered/.test(src));
}

console.log(`\nmsisdn-prefill: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
