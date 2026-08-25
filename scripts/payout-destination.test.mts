/**
 * `E-215` — A PAYOUT MAY ONLY GO TO THE NUMBER THE ACCOUNT IS REGISTERED TO.
 *
 *   npm run test:payout-destination      (proven by: npm run red:payout-destination)
 *
 * The owner's law, 2026-08-25. Until that day nothing enforced it: `phoneE164` appeared
 * exactly once anywhere on the withdrawal path — the form PREFILL — while
 * `wallet-service.withdraw()` stored and dispatched whatever the form sent, uncompared.
 *
 * ⭐ AND THE ARGUMENT CAME OUT OF THE DATA. Re-derived from production the day this was
 * written: 7 of 25 lifetime withdrawals went elsewhere, 6 CONFIRMED. ⚠️ Read the ROLES before
 * calling all six harm — three are one operator's two ADMIN accounts (`+255757619808` and
 * `+255772619619` are both Jaykishan Kaba) moving test money between numbers he owns. The
 * genuine exposure is 4 confirmed payouts, TZS 15,000, from two real PLAYER accounts, to
 * numbers held by no account here — and one of those pairs, `…979354` → `…939754`, is a DIGIT
 * TRANSPOSITION. A player mistyped their own number and paid a stranger.
 *
 * ── WHAT THIS SUITE IS ACTUALLY FOR ─────────────────────────────────────────────────
 * §1–§3 drive the pure rule, which is the easy half. **§4 is the one that matters**: it pins
 * that the seal sits BEFORE the money moves. A refusal placed after `db.wallet.adjust` would
 * pass every behavioural assertion in §1–§3 and still debit a player for a payout that was
 * never allowed to leave — the stranded-funds shape `reconcileStalePayments` exists to clean
 * up. ⛔ Order is a property of the code, so it is asserted on the code.
 *
 * §6 pins the OPPOSITE rule on deposit, because a guard that only knows one direction would
 * be equally green if somebody "helpfully" applied the seal to top-ups and broke every
 * player funding from a relative's handset.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { payoutDestinationFor, last4Of } = await import("../src/lib/payout-destination.ts");
const { REASONS } = await import("../src/lib/failure-reasons.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");

const walletSvc = decomment(readFileSync(join(ROOT, "src/lib/server/wallet-service.ts"), "utf8"));
const paymentActs = decomment(readFileSync(join(ROOT, "src/app/admin/payments/payment-actions.ts"), "utf8"));
const depositPage = decomment(readFileSync(join(ROOT, "src/app/wallet/deposit/page.tsx"), "utf8"));

const REG = "+255712000101";

// ── 1 · THE REGISTERED NUMBER IS ACCEPTED, IN EVERY SHAPE `tzPhone` TAKES ───
{
  // ⚠️ The comparison is on the NUMBER, never on its spelling. These four strings are one
  // number written four ways — the exact set `tzPhone` accepts — and refusing a player their
  // own money for typing the leading zero would be a rule "keyed on a spelling", which this
  // campaign has now got wrong in three separate places.
  for (const shape of ["+255712000101", "255712000101", "0712000101", "712000101"]) {
    const r = payoutDestinationFor(REG, shape);
    ok(`1: the registered number is accepted written as ${shape}`, r.ok === true,
       r.ok ? "" : `refused: ${r.refusal}`);
  }
  const r = payoutDestinationFor(REG, "0712000101");
  ok("1: ⛔ it returns the CANONICAL 9 digits, not the shape that was typed",
     r.ok === true && r.msisdn === "712000101", r.ok ? r.msisdn : "refused");
  // The account may itself be STORED in any of those shapes.
  ok("1: the account's own stored shape does not matter either",
     payoutDestinationFor("0712000101", "+255712000101").ok === true);
}

// ── 2 · 🔴 ANY OTHER NUMBER IS REFUSED — including the real production cases ─
{
  const other = payoutDestinationFor(REG, "788123456");
  ok("2: 🔴 a different number is refused", other.ok === false);
  ok("2: …and says WHICH refusal it is, as a machine token",
     other.ok === false && other.refusal === "not_registered",
     other.ok === false ? other.refusal : "accepted");

  // ⭐ THE TRANSPOSITION, DRIVEN AS A CASE. This is the pair that actually happened on
  // production — TZS 7,000 across 2 confirmed payouts — and it is the strongest argument
  // for the rule, so it is a fixture rather than a footnote.
  const t = payoutDestinationFor("+255690979354", "+255690939754");
  ok("2: ⭐ the REAL digit transposition `…979354` → `…939754` is refused", t.ok === false);
  // ⚠️ And the refusal must name the number the money may go TO, not the one just typed.
  ok("2: ⭐ …naming the REGISTERED last four (9354), never the submitted one (9754)",
     t.ok === false && t.last4 === "9354", t.ok === false ? t.last4 : "accepted");

  // The second real pair, whose suffix starts with a zero — see §5.
  const p2 = payoutDestinationFor("+255769434985", "+255783160044");
  ok("2: the second real pair `…434985` → `…160044` is refused",
     p2.ok === false && p2.last4 === "4985", p2.ok === false ? p2.last4 : "accepted");
}

// ── 3 · ⛔ IT FAILS CLOSED, AND IT REFUSES RATHER THAN CORRECTS ─────────────
{
  ok("3: nothing submitted is refused as `missing`",
     (() => { const r = payoutDestinationFor(REG, undefined); return r.ok === false && r.refusal === "missing"; })());
  ok("3: an empty string is refused too",
     (() => { const r = payoutDestinationFor(REG, ""); return r.ok === false && r.refusal === "missing"; })());
  // ⛔ FAIL CLOSED. An account with no usable number cannot have a destination verified, so
  // it cannot withdraw. On a money-OUT path the safe direction of an unanswerable question
  // is refusal; every other choice pays somebody on a guess.
  for (const bad of ["", "712", "notaphone"]) {
    const r = payoutDestinationFor(bad, "712000101");
    ok(`3: ⛔ an account whose number is ${JSON.stringify(bad)} cannot withdraw at all`,
       r.ok === false && r.refusal === "no_registered_number",
       r.ok === false ? r.refusal : "ACCEPTED — fails OPEN");
  }
  // ⛔ IT MUST NOT SILENTLY CORRECT. Returning `{ok:true, msisdn: registered}` for a
  // mismatched submission would "keep the law" and be the worse product: the player is told
  // their payout succeeded having asked for something else, with nothing recording that they
  // asked. Session 62 paid for exactly this with `resolvePublishCategory` — being quietly
  // given something else is not the same as being told no.
  ok("3: ⛔ a mismatch REFUSES; it is never corrected to the registered number",
     payoutDestinationFor(REG, "788123456").ok === false);
}

// ── 4 · ⭐ THE SEAL IS ON THE SERVER, AND IT IS BEFORE THE MONEY MOVES ──────
{
  ok("4: `withdraw()` calls the rule", /payoutDestinationFor\(user\.phoneE164, parse\.data\.msisdn\)/.test(walletSvc));
  ok("4: …and refuses when it says no", /if \(!destination\.ok\)/.test(walletSvc));

  // ⭐ THE ASSERTION THIS SUITE EXISTS FOR. Everything after `db.wallet.adjust` has already
  // taken the player's balance into `hold`; a refusal there strands funds against no txn.
  //
  // 🔴 AND IT MUST BE SCOPED TO `withdraw()`'S OWN BODY. Written first as a bare
  // `walletSvc.indexOf("db.wallet.adjust(")`, this reported the seal running AFTER the hold
  // (`rule@39497 hold@12822`) on code that is correct — because `deposit()` is defined
  // EARLIER in the same file and owns the first `db.wallet.adjust(` in it. A true
  // measurement over the wrong population, which is this campaign's most reliable way to be
  // wrong; the sibling assertion below "passed" for the same bad reason and proved nothing.
  const iW = walletSvc.indexOf("export async function withdraw(");
  const nextExport = walletSvc.indexOf("export async function", iW + 10);
  const withdrawBody = walletSvc.slice(iW, nextExport > iW ? nextExport : undefined);
  ok("4: (the withdraw body was located and is not the whole file)",
     iW > -1 && withdrawBody.length > 0 && withdrawBody.length < walletSvc.length,
     `${withdrawBody.length} of ${walletSvc.length} chars`);
  const iRule = withdrawBody.indexOf("payoutDestinationFor(");
  const iHold = withdrawBody.indexOf("db.wallet.adjust(");
  const iTxn = withdrawBody.indexOf('type: "WITHDRAWAL"');
  ok("4: ⭐ the seal runs BEFORE the balance is moved into hold",
     iRule > -1 && iHold > -1 && iRule < iHold, `rule@${iRule} hold@${iHold}`);
  ok("4: ⭐ …and before the ledger row is written",
     iRule > -1 && iTxn > -1 && iRule < iTxn, `rule@${iRule} txn@${iTxn}`);

  // A refusal nobody can count is how this stayed invisible for 25 withdrawals.
  ok("4: the refusal is recorded as a compliance fact",
     /action: "withdraw\.destination_refused"/.test(walletSvc));
  ok("4: …carrying the SUBMITTED number, which the player is never shown",
     /submittedMsisdn: parse\.data\.msisdn \?\? null/.test(walletSvc));

  // ⛔ THE OPERATOR PATHS ARE BOUND BY THE SAME RULE. Both admin retries replay the ORIGINAL
  // destination, so a retry of one of the historical mismatched rows must be refused too —
  // and it is, because they call `withdraw()` rather than reaching the gateway themselves.
  ok("4: ⛔ the operator retry paths go through `withdraw()`, so the seal binds them too",
     (paymentActs.match(/await withdraw\(/g) ?? []).length >= 2,
     `${(paymentActs.match(/await withdraw\(/g) ?? []).length} call sites`);
}

// ── 5 · THE REFUSAL IS LEGIBLE, IN ALL THREE LANGUAGES ─────────────────────
{
  const spec = (REASONS as Record<string, { key: string; needs?: readonly string[] }>)
    .payout_destination_not_registered;
  ok("5: the reason is registered", !!spec);
  ok("5: …and declares that it interpolates the last four", !!spec?.needs?.includes("last4"));
  for (const lang of ["en", "sw", "zh"] as const) {
    // ⚠️ `t.error`, NAMED — not "wallet, or else error". Reason copy lives in the `error`
    // section beside every other `fail*` key (`renderFailure` is handed `t.error` and looks up
    // nothing else), so a fallback that also searched `wallet` would keep passing if the string
    // were filed in a section the renderer never reads — a green assertion over copy no player
    // could ever see. Ask for it where it has to be.
    const copy = (dict as Record<string, Record<string, Record<string, string>>>)[lang]?.error?.[spec.key];
    ok(`5: ${lang} copy exists`, typeof copy === "string" && copy.length > 0);
    // ⛔ The placeholder must actually be IN the sentence. A translation that dropped `{last4}`
    // would render a refusal that never says where the money may go — which is the entire
    // difference between this and a bare "invalid number".
    ok(`5: ⛔ ${lang} copy names the registered last four`, (copy ?? "").includes("{last4}"));
  }
  // 🔴 A STRING, AND IT HAS TO STAY ONE. `0044` is a real suffix on production
  // (`+255783160044`); as a number it would render `44` and name a different phone on the
  // one refusal whose job is to name the right one.
  ok("5: 🔴 a leading-zero suffix survives as four characters",
     last4Of("+255783160044") === "0044", last4Of("+255783160044"));
}

// ── 6 · ⛔ DEPOSIT IS THE OPPOSITE RULE, AND STAYS THAT WAY ─────────────────
{
  // Money arriving from a friend's handset is ordinary. A guard that only knew the withdrawal
  // half would stay green if somebody applied the seal to top-ups and broke every player
  // funding from a relative's phone.
  const iDep = walletSvc.indexOf("export async function deposit(");
  const iWith = walletSvc.indexOf("export async function withdraw(");
  const depBody = iDep > -1 ? walletSvc.slice(iDep, iWith > iDep ? iWith : undefined) : "";
  ok("6: ⛔ `deposit()` does NOT apply the payout-destination rule",
     iDep > -1 && !depBody.includes("payoutDestinationFor("));
  ok("6: ⭐ and the deposit screen offers a real 'use another number' control",
     /<DepositNumberChoice/.test(depositPage));
}

console.log(`\npayout-destination: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
