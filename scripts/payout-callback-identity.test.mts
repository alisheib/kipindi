/**
 * test:payout-callback-identity — THE ID WE ASK ABOUT MUST BE THE ID WE SETTLE.
 *
 * 🔴 THE DEFECT THIS GATE EXISTS FOR (found 2026-09-09, money-gate session 2).
 * `handleSelcomCallback` correlates on `ref = order_id || transid` and looks OUR
 * transaction up by it — then, on the WITHDRAWAL branch, re-queried Selcom about
 * `transid || ref`. `transid` is a SECOND, INDEPENDENT field of the caller's body. So a
 * caller could name a real payout in `order_id` and any other id in `transid`: we looked
 * up the victim's row, asked the rail about the attacker's id, and settled the victim's
 * row with the answer.
 *
 * ⛔ At the time of this identity fix, an unrecognised query envelope defaulted to
 * FAILED, so asking about an id the rail did not recognise refunded a real payout
 * in flight. The payout query now keeps such answers pending as a second guard.
 *
 * ⛔ Routing needs no secret: `Authorization: SELCOM <anything>` reaches the handler, and
 * `sigOk` was computed and never read — while this file's own header promised
 * *"WITHDRAWALS … settle only on a signature-verified callback, else stay PROCESSING for
 * the reconcile sweep."* The header described a control that was not there.
 *
 * ⚠️ Session 1's contradiction guard in `settlePaymentWebhook` catches this ONLY once the
 * withdrawal is already CONFIRMED. The live window is a PROCESSING payout — money in
 * flight at the gateway — which is precisely when a refund double-pays.
 *
 * ⭐ WHY `providerRef` IS THE RIGHT ID, and not a guess: `verifyWithdrawalStatus` in
 * `payments.ts` — the reconcile sweep's proven path — already calls
 * `selcomVerifyPayout(env, railOf(payoutRail), providerRef)`. §3 pins that, so the two
 * paths can never drift apart again.
 *
 *   npx tsx scripts/payout-callback-identity.test.mts
 *   PCI_ROOT=<tree> npx tsx scripts/payout-callback-identity.test.mts   ← red harness
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PCI_ROOT || join(here, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split("\r\n").join("\n");

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` · ${detail}` : ""}`); }
}

const route = read("src/app/api/webhooks/payments/route.ts");
const payments = read("src/lib/server/payments.ts");
const selcom = read("src/lib/server/selcom.ts");

/** The withdrawal branch of handleSelcomCallback. */
const withdrawalBranch = (() => {
  const i = route.indexOf("if (txn.type === \"DEPOSIT\") {");
  if (i < 0) return "";
  const j = route.indexOf("if (!status)", i);
  return j > i ? route.slice(i, j) : route.slice(i, i + 4000);
})();

// ── §1 · The payout re-query is keyed on OUR stored providerRef ──────────────
console.log("\n§1 · the payout re-query uses providerRef, never the caller's transid");
{
  ok("1.1  the withdrawal branch was located", withdrawalBranch.length > 0);
  // ⚠️ `[^)]*` CANNOT CROSS THE `)` IN `railOf(txn.payoutRail)`, so a pattern written that
  // way matches nothing and passes over both shapes alike. §4 caught exactly that in this
  // file's own first draft — which is what a positive control is for. Anchor on the LAST
  // argument instead, where the whole question lives.
  ok("1.2  selcomVerifyPayout is NOT passed the caller's transid",
    !/railOf\(txn\.payoutRail\),\s*transid\s*\|\|/.test(withdrawalBranch),
    "re-query still keyed on `transid || ref` — it asks about an id the caller chose");
  ok("1.3  it IS passed a value derived from txn.providerRef",
    /txn\.providerRef\s*\?\?/.test(withdrawalBranch) && /railOf\(txn\.payoutRail\),\s*payoutTransid\)/.test(withdrawalBranch),
    "the id asked about is not the transaction's own providerRef");
}

// ── §2 · A payout settles only on a verified signature ───────────────────────
console.log("\n§2 · sigOk is ENFORCED on the payout branch, not merely audited");
{
  ok("2.1  the branch refuses when the signature did not verify",
    /if\s*\(!sigOk\)/.test(withdrawalBranch),
    "sigOk is still computed and never read on the payout path");
  ok("2.2  and refusing leaves the row PROCESSING rather than settling it",
    /payout-signature-unverified/.test(withdrawalBranch) && !/settlePaymentWebhook/.test(withdrawalBranch));
  ok("2.3  the stale claim that sigOk is 'for audit only' is gone",
    !/sigOk above is captured for audit only/.test(route));
}

// ── §3 · The two paths that ask the rail the same question agree ─────────────
//
// ⛔ WITHOUT THIS, §1 IS A GUESS. `providerRef` is the right id only because the reconcile
// sweep already proves it is — if payments.ts ever changed what IT queries on, §1 would be
// pinning the wrong identifier while still passing.
console.log("\n§3 · the webhook and the reconcile sweep ask about the SAME identifier");
{
  ok("3.1  verifyWithdrawalStatus queries selcomVerifyPayout on providerRef",
    /selcomVerifyPayout\(env,\s*railOf\(payoutRail\),\s*providerRef\)/.test(payments),
    "the sweep's identifier moved — §1 may now be pinning the wrong one");
  ok("3.2  and the sweep passes it the transaction's providerRef",
    /verifyWithdrawalStatus\(t\.providerRef!?,\s*t\.payoutRail\)/.test(read("src/lib/server/wallet-service.ts")));
}

// ── §4 · POSITIVE CONTROL — the scanner can still say NO ─────────────────────
//
// ⛔ WITHOUT THIS, §1 AND §2 COULD PASS BY MATCHING NOTHING. Each pattern is re-run
// against the PRE-FIX text and must REJECT it, and against the fixed text and must
// ACCEPT it. A regex that quietly stopped matching reports both shapes identically.
console.log("\n§4 · POSITIVE CONTROL · pre-fix REJECTED, post-fix ACCEPTED");
{
  const preFix = `if (txn.type === "DEPOSIT") {
    const verdict = await selcomVerifyOrder(env, orderId || ref);
  } else {
    // (sigOk above is captured for audit only.)
    const verdict = await selcomVerifyPayout(env, railOf(txn.payoutRail), transid || ref);
    status = verdict.status;
  }`;
  ok("4.1  pre-fix: the transid re-query is caught",
    /railOf\(txn\.payoutRail\),\s*transid\s*\|\|/.test(preFix));
  ok("4.2  pre-fix: the missing providerRef keying is caught",
    !(/txn\.providerRef\s*\?\?/.test(preFix) && /railOf\(txn\.payoutRail\),\s*payoutTransid\)/.test(preFix)));
  ok("4.3  pre-fix: the unenforced signature is caught", !/if\s*\(!sigOk\)/.test(preFix));

  const fixed = `} else {
    const payoutTransid = txn.providerRef ?? ref;
    if (!sigOk) { return NextResponse.json({ ok: true, ignored: true, reason: "payout-signature-unverified" }); }
    const verdict = await selcomVerifyPayout(env, railOf(txn.payoutRail), payoutTransid);
  }`;
  ok("4.4  post-fix: all three patterns accept the corrected shape",
    !/railOf\(txn\.payoutRail\),\s*transid\s*\|\|/.test(fixed)
    && /txn\.providerRef\s*\?\?/.test(fixed) && /railOf\(txn\.payoutRail\),\s*payoutTransid\)/.test(fixed)
    && /if\s*\(!sigOk\)/.test(fixed));
}

// ── §5 · The payout query also fails closed on ambiguous responses ─────────────
console.log("\n§5 · ambiguous payout query envelopes cannot refund");
{
  const query = selcom.slice(selcom.indexOf("export async function selcomVerifyPayout"), selcom.indexOf("/**", selcom.indexOf("export async function selcomVerifyPayout")));
  ok("5.1  payout query has no broad FAILED fallback", !query.includes('status: "FAILED"'));
  ok("5.2  only coherent 000/SUCCESS can confirm", /code === "000" && result === "SUCCESS"/.test(query));
  ok("5.3  a mismatched or malformed echoed transid stays pending", /query transid malformed or mismatched/.test(query));
}

console.log(`\n${fail === 0 ? "PASS" : "FAILED"} · ${pass} ok, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
