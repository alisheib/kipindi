/**
 * Webhook replay + amount tests (audit C5 + M4).
 *
 * C5: the stale-replay window could be bypassed by OMITTING the X-Timestamp
 * header (the check was conditional) and the signature didn't cover the
 * timestamp (so it could be stripped). Now the timestamp is mandatory and the
 * HMAC is over `${timestamp}.${body}`.
 *
 * M4: settlePaymentWebhook now verifies the provider-reported amount against the
 * initiated txn and fails closed on a mismatch.
 *
 * In-memory store; no DATABASE_URL.
 */
process.env.PAYMENTS_DEMO_ASYNC = "true"; // deposits stay PROCESSING → settle via webhook

import { readFileSync } from "node:fs";
import { verifyWebhookSignature, signWebhook } from "../src/lib/server/crypto.ts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { deposit, settlePaymentWebhook } from "../src/lib/server/wallet-service.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

const SECRET = "test-webhook-secret";
const body = JSON.stringify({ reference: "MPESA-ABC123", status: "SUCCESS", amount: 50_000 });

// ── C5 · timestamp mandatory + bound to the signature ────────────────────────
{
  const ts = now();
  const sig = signWebhook(ts, body, SECRET);

  ok("C5: a correctly-signed, fresh webhook verifies", verifyWebhookSignature({ body, signatureHex: sig, secret: SECRET, timestamp: ts }).valid);

  // The exploit: replay the captured payload+signature but OMIT the timestamp.
  const omitted = verifyWebhookSignature({ body, signatureHex: sig, secret: SECRET, timestamp: undefined });
  ok("C5: omitting the timestamp is REJECTED (was the bypass)", !omitted.valid && omitted.reason === "missing-timestamp", omitted.reason);

  // A genuinely old, correctly-signed replay is rejected on staleness.
  const oldTs = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 min old (> 5 min window)
  const oldSig = signWebhook(oldTs, body, SECRET);
  const stale = verifyWebhookSignature({ body, signatureHex: oldSig, secret: SECRET, timestamp: oldTs });
  ok("C5: a stale (6-min-old) replay is rejected", !stale.valid && stale.reason === "stale-timestamp", stale.reason);

  // Swapping in a fresh timestamp with the old signature fails — the timestamp is
  // bound to the MAC, so it can't be forward-dated to dodge the staleness check.
  const swapped = verifyWebhookSignature({ body, signatureHex: sig, secret: SECRET, timestamp: new Date(Date.now() + 1000).toISOString() });
  ok("C5: a forward-dated timestamp with the old signature is rejected", !swapped.valid && swapped.reason === "signature-mismatch", swapped.reason);

  // L1: non-hex signature yields a truthful reason (not the dead length-mismatch).
  const badHex = verifyWebhookSignature({ body, signatureHex: "zzzz-not-hex", secret: SECRET, timestamp: ts });
  ok("L1: non-hex signature → bad-signature-encoding", !badHex.valid && badHex.reason === "bad-signature-encoding", badHex.reason);
}

// ── M4 · webhook amount is verified against the initiated txn ─────────────────
async function fundedUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25595${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    // Depositing requires a CONFIRMED email address (wallet-service gate).
    email: `${id}@t.tz`, emailVerifiedAt: now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const balance = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

{
  await fundedUser("usr_m4");
  const d = await deposit("usr_m4", { provider: "MPESA", amount: 50_000, msisdn: "712345678" });
  ok("M4 setup: async deposit is PROCESSING", d.ok && d.data.status === "PROCESSING", d.ok ? d.data.status : d.error);
  const txnId = d.ok ? d.data.txnId : "";
  const txn = await db.txn.findById(txnId);
  const providerRef = txn?.providerRef ?? "";

  // Provider reports a DIFFERENT amount than we initiated → fail closed, no credit.
  const mism = await settlePaymentWebhook({ providerRef, status: "CONFIRMED", amount: 49_000 });
  ok("M4: amount mismatch is rejected", !mism.handled && mism.reason === "amount-mismatch", mism.reason);
  ok("M4: a mismatched webhook does NOT credit the wallet", (await balance("usr_m4")) === 0, `bal=${await balance("usr_m4")}`);

  // Correct amount settles and credits exactly once.
  const good = await settlePaymentWebhook({ providerRef, status: "CONFIRMED", amount: 50_000 });
  ok("M4: matching amount settles", good.handled);
  ok("M4: wallet credited by the correct amount", (await balance("usr_m4")) === 50_000, `bal=${await balance("usr_m4")}`);
}

// ── §R · A REVERSAL OF MONEY WE ALREADY CREDITED IS NOT A DUPLICATE CALLBACK ──
//
// 🔴 THE DEFECT (2026-09-08). Every non-PROCESSING transaction returned
// `{ handled: true, reason: "already-<status>" }`. That is right for a provider's
// at-least-once RETRY and wrong for a CONTRADICTION. `normalizeStatus` maps
// "REVERSED" to FAILED, so a card chargeback or a mobile-money reversal of a
// deposit we have already credited arrived in exactly that shape — and was acked
// as a benign duplicate. No audit, no ledger entry, nothing in front of an officer.
// Repeatable, uncapped loss to the house.
//
// ⛔ WHAT IS ASSERTED IS DETECTION, NOT CLAWBACK. Debiting a player for a chargeback
// is a policy decision Ali has not made (overdraw them? what if the cash is already
// withdrawn, or staked?), so the fix escalates and leaves the money alone. §R.3 pins
// that the balance is NOT touched, so a future auto-clawback has to be a deliberate
// change to this file rather than a silent one.
{
  await fundedUser("usr_cb");
  const d = await deposit("usr_cb", { provider: "MPESA", amount: 30_000, msisdn: "712345679" });
  const txnId = d.ok ? d.data.txnId : "";
  const ref = (await db.txn.findById(txnId))?.providerRef ?? "";
  const credited = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED", amount: 30_000 });
  ok("R.0 setup: the deposit is credited", credited.handled && (await balance("usr_cb")) === 30_000, `bal=${await balance("usr_cb")}`);

  // The provider now reverses it.
  const rev = await settlePaymentWebhook({ providerRef: ref, status: "FAILED" });
  ok("R.1 ★ a REVERSAL after credit is NOT acked as a duplicate", !rev.handled, rev.reason);
  ok("R.2 ★ …and says so — the reason names both states", rev.reason === "contradicted-confirmed-now-failed", rev.reason);
  ok("R.3 ⛔ …and does NOT silently claw the money back (a policy decision, not a webhook's)",
     (await balance("usr_cb")) === 30_000, `bal=${await balance("usr_cb")}`);

  // ⭐ POSITIVE CONTROL, same run — an ordinary at-least-once RETRY must still be a
  // benign duplicate, or §R.1 is passing by rejecting everything and the provider
  // would retry for ever.
  const retry = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED", amount: 30_000 });
  ok("R.4 ⭐ a genuine retry of the SAME verdict is still handled as a duplicate",
     retry.handled && retry.reason === "already-confirmed", retry.reason);
  ok("R.5 …and still does not double-credit", (await balance("usr_cb")) === 30_000, `bal=${await balance("usr_cb")}`);
}

// ── §S · SELCOM MAY NOT BE SETTLED FROM A CALLBACK BODY ──────────────────────
//
// 🔴 Routing is decided by the `Authorization: SELCOM …` scheme, so a caller who
// simply did not send that header — `X-Provider: selcom` plus an HMAC over
// `${timestamp}.${body}` — skipped `handleSelcomCallback` entirely and was settled
// from the body's own status. Every protection on that money-in path (the
// authoritative signed order-status re-query, and the re-queried amount that feeds
// the M4 check above) lives in the handler it skipped. The only barrier was a secret
// we share with the vendor.
{
  const route = readFileSync(new URL("../src/app/api/webhooks/payments/route.ts", import.meta.url), "utf8");
  const known = route.match(/const KNOWN_PROVIDERS[^=]*=\s*\{([^}]*)\}/);
  ok("S.1 · the generic lane's provider map is still findable — ⚠️ a red means RE-ANCHOR", known !== null, String(known === null));
  if (known) {
    ok("S.2 ★ `selcom` is NOT a generic-lane provider", !/\bselcom\b/.test(known[1]), known[1].replace(/\s+/g, " ").trim());
    // ⭐ POSITIVE CONTROL — the map is not simply empty. The providers that legitimately
    // settle from a body are still there, so S.2 cannot pass by deleting the feature.
    ok("S.3 ⭐ …while the body-settled providers remain", /\bazampay\b/.test(known[1]) && /\bmixx\b/.test(known[1]), known[1].replace(/\s+/g, " ").trim());
  }
  // ⚠️ ANCHORED ON THE WHOLE `if`, NOT ON THE CALL. The first version of this
  // assertion matched `AUTHORITATIVE_ONLY.has(provider)` anywhere in the file — which
  // a mutation satisfied by writing `if (false && AUTHORITATIVE_ONLY.has(provider))`.
  // The red harness caught the guard, not the code: a disabled gate still contained
  // the string it was looking for.
  ok("S.4 ★ a callback naming selcom on the generic lane is refused before the signature check",
     /\n\s*if \(AUTHORITATIVE_ONLY\.has\(provider\)\) \{/.test(route) && /authoritative-lane-required/.test(route),
     "no live refusal found — the guard is missing or short-circuited");
  ok("S.5 · …and the dedicated handler still re-queries rather than trusting the body",
     /selcomVerifyOrder\(env,/.test(route), "the authoritative deposit re-query is gone");
}

console.log(`\nwebhook-security: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
