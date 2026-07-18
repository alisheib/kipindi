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

import { verifyWebhookSignature, signWebhook } from "../src/lib/server/crypto.ts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { deposit, settlePaymentWebhook } from "../src/lib/server/wallet-service.ts";

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

console.log(`\nwebhook-security: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
