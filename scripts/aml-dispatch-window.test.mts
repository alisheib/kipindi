/**
 * test:aml-dispatch-window — AN AML-APPROVED PAYOUT MUST NOT CARRY A PHANTOM providerRef
 * INTO THE SWEEP'S REACH.
 *
 * 🔴 THE DEFECT THIS GATE EXISTS FOR (MO-4.a, CONFIRMED by three independent lenses).
 * While a large withdrawal sits in AML_REVIEW its `providerRef` holds the `wdr_…`
 * correlation id `dispatchWithdrawal` returns from its AML branch — OUR id, which **no
 * gateway has ever seen**: that branch returns before `resolveActiveAdapter`, and
 * `runPayoutLadder` mints a fresh transid on approval. Harmless in AML_REVIEW, which no
 * sweep selects.
 *
 * ⛔ It stops being harmless the instant `dispatchApprovedWithdrawal` flips the row to
 * PROCESSING. `reconcileStalePayments` selects PROCESSING rows filtered on `createdAt`, and
 * an AML row's createdAt is hours or days old — so the whole 30-minute grace is ALREADY
 * SPENT and the row is sweep-eligible immediately. The dispatch round-trip on the next line
 * happens OUTSIDE the wallet lock by design and can run to the 45s rail timeout. In that
 * window the sweep queries the phantom id, `envelopeSettlementVerdict` returns FAILED for any
 * code that is not 000/111/927/999, and `settleWithdrawalFailed` refunds a payout that is in
 * flight. Every AML-approved payout is at or above the review threshold by construction.
 *
 * ⚠️ Nothing downstream corrects it: after the round-trip the REAL ref is written onto the
 * now-FAILED row, `withdraw.approved_dispatched` is audited and the player is told the money
 * is on its way. The trail conceals the double payment.
 *
 * ⭐ THE FIX USES THE SWEEP'S OWN SAFE BRANCH rather than adding a new one: with no
 * providerRef the sweep takes `if (!ref)` → `leftPending` + a needs-review row, moving no
 * money. §3 pins that branch, so this gate fails if the thing it relies on is ever removed.
 *
 *   npx tsx scripts/aml-dispatch-window.test.mts
 *   AMLW_ROOT=<tree> npx tsx scripts/aml-dispatch-window.test.mts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.AMLW_ROOT || join(here, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split("\r\n").join("\n");

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` · ${detail}` : ""}`); }
}

const wallet = read("src/lib/server/wallet-service.ts");
const payments = read("src/lib/server/payments.ts");

const bodyOf = (src: string, anchor: string, span = 3500) => {
  const i = src.indexOf(anchor);
  return i < 0 ? "" : src.slice(i, i + span);
};

// ── §1 · The premise: the AML branch really does store a never-dispatched id ──
//
// If this ever stops being true — if the AML branch stops returning a providerRef at all —
// §2 is no longer necessary and this gate should be retired, not left asserting a
// requirement that has moved. Stating the premise is what makes that visible.
console.log("\n§1 · the premise — the AML branch returns an id no gateway has seen");
{
  ok("1.1  dispatchWithdrawal's AML branch returns before resolveActiveAdapter",
    /return \{ ok: true, providerRef: correlationId, status: "AML_REVIEW", correlationId \};/.test(payments));
  ok("1.2  …and the real adapter call is AFTER it",
    payments.indexOf('status: "AML_REVIEW", correlationId };') < payments.indexOf('resolveActiveAdapter("withdraw"'));
  ok("1.3  a fresh transid is minted per dispatch, so the stored id is never the one sent",
    /wdr_\$\{randomId\(10\)\}/.test(payments));
}

// ── §2 · The claim clears the phantom before the row is sweep-eligible ───────
console.log("\n§2 · dispatchApprovedWithdrawal clears providerRef when it claims the row");
{
  // ⚠️ The span must cover the WHOLE function, docblocks included. At 3500 it stopped short
  // of the post-dispatch write and 2.4 failed against correct source — a scanner reporting a
  // defect that is not there is the same class of lie as one missing a defect that is.
  const claim = bodyOf(wallet, "export async function dispatchApprovedWithdrawal", 7000);
  ok("2.1  the claim block was located", claim.length > 0);
  ok("2.2  the AML_REVIEW → PROCESSING write clears providerRef",
    /status: "PROCESSING", providerRef: null/.test(claim),
    "the row keeps a phantom providerRef while the dispatch is in flight");
  ok("2.3  …and clears payoutRail with it",
    /providerRef: null, payoutRail: null/.test(claim),
    "railOf(null) defaults to WALLET_CASHIN — a stale rail asks the wrong endpoint");
  ok("2.4  the real ref is still written after a successful dispatch",
    /providerRef: result\.providerRef,/.test(claim));
  ok("2.5  and the dispatch still happens OUTSIDE the lock (unchanged by this fix)",
    /never hold a lock across network I\/O/.test(claim));
}

// ── §3 · The safe branch this fix relies on still exists ─────────────────────
//
// ⛔ WITHOUT THIS, §2 IS A FIX POINTING AT NOTHING. Clearing providerRef is only safe
// because the sweep refuses to auto-reverse a withdrawal that has none. If that branch is
// ever deleted or softened, clearing the field would send the row somewhere worse than
// where it started, and §2 would still be green.
console.log("\n§3 · the sweep still refuses to auto-reverse a payout with no providerRef");
{
  const sweep = bodyOf(wallet, "export async function reconcileStalePayments", 6000);
  ok("3.1  the withdrawal arm skips a row with no ref, and moves no money",
    /if \(!ref\) \{ leftPending\+\+; auditNeedsReviewOnce\(t\.id, "stale withdrawal has no providerRef — not auto-reversed"/.test(sweep),
    "the !ref guard moved — clearing providerRef is no longer safe");
  ok("3.2  a FAILED verdict still routes to settleWithdrawalFailed (the branch we are avoiding)",
    /v\.status === "FAILED"[\s\S]{0,120}settleWithdrawalFailed\(t\.id, "reconcile-verified-failed"\)/.test(sweep));
  ok("3.3  selection is still on createdAt — which is why the grace is already spent",
    /listByStatus\("PROCESSING"\)\)\.filter\(\(t\) => Date\.parse\(t\.createdAt\) < cutoff\)/.test(sweep),
    "if selection moved to updatedAt the premise changes and this gate should be re-derived");
}

// ── §4 · POSITIVE CONTROL — the scanner can still say NO ─────────────────────
console.log("\n§4 · POSITIVE CONTROL · pre-fix REJECTED, post-fix ACCEPTED");
{
  const preFix = `const claimed = await withLock(\`wallet:\${pre.userId}\`, async () => {
    const t = await db.txn.findById(txnId);
    if (!t || t.status !== "AML_REVIEW") return null;
    await db.txn.update(txnId, { status: "PROCESSING" });
    return t;
  });`;
  ok("4.1  pre-fix: the un-cleared providerRef is caught",
    !/status: "PROCESSING", providerRef: null/.test(preFix));
  ok("4.2  pre-fix: the un-cleared payoutRail is caught",
    !/providerRef: null, payoutRail: null/.test(preFix));

  const fixed = `await db.txn.update(txnId, { status: "PROCESSING", providerRef: null, payoutRail: null }, tx);`;
  ok("4.3  post-fix: both patterns accept the corrected shape",
    /status: "PROCESSING", providerRef: null/.test(fixed) && /providerRef: null, payoutRail: null/.test(fixed));
}

console.log(`\n${fail === 0 ? "PASS" : "FAILED"} · ${pass} ok, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
