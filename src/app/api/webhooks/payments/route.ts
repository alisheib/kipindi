/**
 * Payment-provider webhook receiver.
 *
 * Two inbound shapes are handled:
 *
 *  • SELCOM — posts a signed callback with `Authorization: SELCOM …` and a JSON
 *    body carrying `order_id`/`transid` + `payment_status`. Detected by the auth
 *    scheme (Selcom does not send our `X-Provider` header). DEPOSITS are settled
 *    from an AUTHORITATIVE, signed order-status re-query (we never credit on the
 *    callback body alone); WITHDRAWALS (wallet-cashin, no status endpoint) settle
 *    only on a signature-verified callback, else stay PROCESSING for the reconcile
 *    sweep. See src/lib/server/selcom.ts + docs/SELCOM-API-DIGEST.md.
 *
 *  • Generic (Azampay, Mixx by Yas) — `X-Provider`/`X-Signature`/`X-Timestamp`
 *    with HMAC-SHA-256 over `${timestamp}.${body}`, per-provider secret, 5-minute
 *    replay window, timing-safe, fails closed. Unchanged (audit C5).
 *
 * On success the audit log records `webhook.payment.received` under WALLET.
 * Replay/verify rejections are logged under SYSTEM. Settlement itself
 * (settlePaymentWebhook) is exactly-once + amount-tamper-defended.
 */
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";
import { settlePaymentWebhook } from "@/lib/server/wallet-service";
import { db } from "@/lib/server/store";
import { selcomEnv, selcomVerifyOrder, selcomVerifyPayout, railOf, verifySelcomCallback } from "@/lib/server/selcom";

/** Map the many provider-specific status spellings to our two terminal states.
 *  Anything not recognised is treated as a non-terminal update we simply ack. */
function normalizeStatus(raw: unknown): "CONFIRMED" | "FAILED" | null {
  const s = String(raw ?? "").toUpperCase();
  if (["CONFIRMED", "SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "SETTLED"].includes(s)) return "CONFIRMED";
  if (["FAILED", "FAILURE", "DECLINED", "CANCELLED", "CANCELED", "REJECTED", "REVERSED", "EXPIRED"].includes(s)) return "FAILED";
  return null;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The GENERIC lane's providers — the ones with no status endpoint, which therefore
 * settle from the callback body.
 *
 * 🔴 `selcom` USED TO BE IN THIS MAP, AND THAT UNDID THE ONE RULE THIS FILE OPENS WITH.
 * Routing is decided by the `Authorization: SELCOM …` scheme, so a caller who simply
 * did NOT send that header — sending `X-Provider: selcom` and an HMAC over
 * `${timestamp}.${body}` instead — never reached `handleSelcomCallback` and was settled
 * from the body's own `status`. Every protection on the Selcom money-in path lives in
 * that handler: the authoritative signed order-status re-query, and the re-queried
 * amount that feeds the tamper check. The generic lane has none of them.
 *
 * ⛔ The exploit needs only `SELCOM_WEBHOOK_SECRET` — a value we share with the vendor
 * and keep in a deployment variable — plus a deposit the attacker initiated themselves
 * and never paid: POST a signed `{reference, status: "COMPLETED", amount}` and the
 * wallet is credited up to the initiated amount. A secret is a barrier, not the
 * authority the header comment promises.
 *
 * Selcom now has exactly ONE door. A callback naming it here is refused, loudly.
 * ⚠️ This costs nothing operationally: Selcom signs with `digest` / `signed-fields`,
 * never `X-Signature`, so a genuine Selcom callback taking this path could only ever
 * have failed the signature check anyway — 401 then, 400 now.
 */
const KNOWN_PROVIDERS: Record<string, string> = {
  azampay: "AZAMPAY_WEBHOOK_SECRET",
  mixx:    "MIXX_WEBHOOK_SECRET",
};

/** Providers that must use a dedicated authoritative handler, never the generic lane. */
const AUTHORITATIVE_ONLY = new Set(["selcom"]);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const body = await req.text();

  // Selcom's signed callback uses `Authorization: SELCOM …`, not our X-Provider
  // scheme — route it to the dedicated handler. The generic path below is unchanged.
  if (/^SELCOM\s+/i.test(authHeader)) {
    return handleSelcomCallback(req, body);
  }

  const provider = (req.headers.get("x-provider") ?? "").toLowerCase();
  const signature = req.headers.get("x-signature") ?? "";
  const timestamp = req.headers.get("x-timestamp") ?? undefined;

  // ⛔ A provider with an authoritative handler may NOT be settled from a callback
  // body, whichever header it arrives under. Refused before the signature is even
  // checked, and audited as SECURITY: on a correctly-configured deployment nothing
  // legitimate takes this path, so a row here is somebody trying the weaker door.
  if (AUTHORITATIVE_ONLY.has(provider)) {
    audit({
      category: "SECURITY",
      action: "webhook.payment.rejected",
      actorId: null,
      targetType: "Webhook",
      targetId: null,
      payload: { provider, reason: "authoritative-lane-required", note: "A callback naming this provider must arrive on its dedicated handler, which settles a deposit only from a signed order-status re-query. The generic lane settles from the request body and is never valid for it." },
    });
    return NextResponse.json({ ok: false, error: "authoritative-lane-required" }, { status: 400 });
  }

  if (!provider || !KNOWN_PROVIDERS[provider]) {
    return NextResponse.json({ ok: false, error: "unknown-provider" }, { status: 400 });
  }

  const envName = KNOWN_PROVIDERS[provider];
  const secret = process.env[envName]
    ?? (process.env.NODE_ENV === "production"
        ? ""  // empty string → verifyWebhookSignature returns missing-secret
        : "dev-only-webhook-secret-replace-in-prod");

  const result = verifyWebhookSignature({ body, signatureHex: signature, secret, timestamp });
  if (!result.valid) {
    audit({
      category: "SYSTEM",
      action: "webhook.payment.rejected",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { provider, reason: result.reason, hasTimestamp: !!timestamp },
    });
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 });
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  // The provider echoes back the `reference` we sent at initiate time — we store
  // it as Transaction.providerRef and use it to correlate the callback. `status`
  // is the provider's final verdict for that collection/payout.
  const ref = (parsed as { reference?: string; providerRef?: string })?.reference
    ?? (parsed as { providerRef?: string })?.providerRef
    ?? "";
  const status = normalizeStatus((parsed as { status?: string })?.status);
  // M4 — the provider-reported amount, verified against the initiated txn in
  // settlePaymentWebhook (mismatch → fail closed + SECURITY alert).
  const rawAmount = (parsed as { amount?: unknown })?.amount;
  const amount = typeof rawAmount === "number" ? rawAmount : typeof rawAmount === "string" && rawAmount.trim() !== "" && !Number.isNaN(Number(rawAmount)) ? Number(rawAmount) : undefined;

  audit({
    category: "WALLET",
    action: "webhook.payment.received",
    actorId: null,
    targetType: "Webhook",
    targetId: ref || null,
    payload: { provider, reference: ref, status, signaturePrefix: signature.slice(0, 12) },
  });

  // Settle the transaction. This is the SOLE authority that credits a pending
  // deposit / releases a pending payout. settlePaymentWebhook is idempotent, so
  // a provider's at-least-once retry is safe. Always 200 on a verified webhook
  // so the provider stops retrying (the verdict is captured in the audit log).
  if (!ref || !status) {
    return NextResponse.json({ ok: true, ignored: true, reason: !ref ? "no-reference" : "non-terminal-status" });
  }
  let settled: Awaited<ReturnType<typeof settlePaymentWebhook>>;
  try {
    settled = await settlePaymentWebhook({ providerRef: ref, status, amount });
  } catch (err) {
    audit({
      category: "WALLET",
      action: "webhook.payment.settle_error",
      actorId: null,
      targetType: "Webhook",
      targetId: ref,
      payload: { provider, error: String(err) },
    });
    return NextResponse.json({ ok: false, error: "settle-failed" }, { status: 500 });
  }
  audit({
    category: "WALLET",
    action: "webhook.payment.settled",
    actorId: null,
    targetType: "Webhook",
    targetId: ref,
    payload: { provider, ...settled },
  });
  return NextResponse.json({ ok: true, ...settled });
}

/**
 * Selcom callback handler.
 *
 * DEPOSITS are the money-in path we care most about: we IGNORE the callback body's
 * claimed status and instead re-query Selcom's order-status with our fully-verified
 * signature (selcomVerifyOrder) — a forged or replayed callback therefore cannot
 * credit a wallet, and a genuine one is confirmed against Selcom's own record. The
 * re-queried amount also flows into settlePaymentWebhook's M4 tamper check.
 *
 * WITHDRAWALS (wallet-cashin) have no confirmed status endpoint, so we settle them
 * only on a signature-verified callback; an unverified one is ignored and the hold
 * stays until the reconcile sweep or a manual /admin/payments action resolves it —
 * the wallet is already debited-and-held, so nothing is lost or double-paid.
 *
 * Always returns HTTP 200 on a parseable callback so Selcom stops retrying; the
 * verdict is in the audit log.
 */
async function handleSelcomCallback(req: Request, body: string): Promise<NextResponse> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const orderId = String(parsed.order_id ?? "");
  const transid = String(parsed.transid ?? "");
  const ref = orderId || transid; // our correlation id — the providerRef we stored
  const paymentStatus = String(parsed.payment_status ?? "");

  const env = selcomEnv();
  const sigOk = env
    ? verifySelcomCallback({
        signedFields: req.headers.get("signed-fields") ?? "",
        timestamp: req.headers.get("timestamp") ?? "",
        digestB64: req.headers.get("digest") ?? "",
        body: parsed,
        apiSecret: env.apiSecret,
      })
    : false;

  audit({
    category: "WALLET",
    action: "webhook.payment.received",
    actorId: null,
    targetType: "Webhook",
    targetId: ref || null,
    payload: { provider: "selcom", order_id: orderId || null, transid: transid || null, payment_status: paymentStatus, sigVerified: sigOk },
  });

  if (!ref) return NextResponse.json({ ok: true, ignored: true, reason: "no-reference" });
  if (!env) {
    // Selcom callback arrived but creds aren't configured — we cannot verify or
    // re-query. Log and ack (nothing to settle safely).
    audit({ category: "SYSTEM", action: "webhook.payment.rejected", actorId: null, targetType: "Webhook", targetId: ref, payload: { provider: "selcom", reason: "selcom-not-configured" } });
    return NextResponse.json({ ok: true, ignored: true, reason: "selcom-not-configured" });
  }

  const txn = await db.txn.findByProviderRef(ref);
  if (!txn) return NextResponse.json({ ok: true, ignored: true, reason: "unknown-reference" });

  let status: "CONFIRMED" | "FAILED" | null = null;
  let amount: number | undefined;

  if (txn.type === "DEPOSIT") {
    // AUTHORITATIVE re-query (checkout order-status) — never credit on the
    // callback body alone.
    const verdict = await selcomVerifyOrder(env, orderId || ref);
    status = verdict.status;
    amount = verdict.amount;
  } else {
    // Withdrawal: AUTHORITATIVE re-query on THE RAIL THIS PAYOUT ACTUALLY USED — we
    // do not trust the callback body for a payout confirmation either.
    //
    // 🔴 The rail comes off the transaction row. Every rail's query endpoint only
    // knows its own transids, so asking wallet-cashin about a Selcom Pesa payout
    // returns a stranger's envelope, which resolves to FAILED and refunds a player
    // whose money already left. `railOf` defaults null to WALLET_CASHIN — correct for
    // every row written before rails existed.
    //
    // 🔴 AND THE IDENTITY WE ASK ABOUT MUST BE THE ONE WE SETTLE (found 2026-09-09).
    // This read `transid || ref` — and `transid` is a SECOND, INDEPENDENT field of the
    // caller's body, while the transaction being settled was found by `ref`. So a
    // caller could name a real payout in `order_id` and ANY other id in `transid`: we
    // looked up the victim's row, asked Selcom about the attacker's id, and settled the
    // victim's row with the answer. `envelopeSettlementVerdict` defaults to **FAILED**
    // for every code that is not 000/111/927/999 — an id Selcom does not recognise is
    // therefore a FAILED verdict — so the reply refunds a payout that is still in
    // flight, and the money leaves twice.
    //
    // ⛔ Routing here needs no secret: `Authorization: SELCOM <anything>` reaches this
    // handler, and `sigOk` was computed and never read.
    //
    // `providerRef` IS the id the rail knows this payout by — it is exactly what
    // `verifyWithdrawalStatus` passes for the reconcile sweep (payments.ts), the proven
    // path. Asking about anything else is asking about someone else's money.
    const payoutTransid = txn.providerRef ?? ref;
    if (transid && transid !== payoutTransid) {
      audit({
        category: "SECURITY",
        action: "webhook.payout_transid_mismatch",
        actorId: txn.userId,
        targetType: "Transaction",
        targetId: txn.id,
        payload: { providerRef: payoutTransid, callbackTransid: transid, orderId: orderId || null, sigVerified: sigOk },
      });
    }
    // ⛔ AND A PAYOUT SETTLES ONLY ON A SIGNATURE-VERIFIED CALLBACK — which is what this
    // file's own header has always promised and the code did not do. Failing here is
    // SAFE in the only direction that matters: the row stays PROCESSING and the
    // reconcile sweep re-queries it on its own schedule, so a genuine callback we
    // could not verify costs a delay, never a lost or doubled payout.
    if (!sigOk) {
      audit({ category: "SYSTEM", action: "webhook.payment.rejected", actorId: null, targetType: "Webhook", targetId: ref, payload: { provider: "selcom", type: "WITHDRAWAL", reason: "payout-signature-unverified" } });
      return NextResponse.json({ ok: true, ignored: true, reason: "payout-signature-unverified" });
    }
    const verdict = await selcomVerifyPayout(env, railOf(txn.payoutRail), payoutTransid);
    status = verdict.status;
  }

  if (!status) return NextResponse.json({ ok: true, ignored: true, reason: "non-terminal-status" });

  let settled: Awaited<ReturnType<typeof settlePaymentWebhook>>;
  try {
    settled = await settlePaymentWebhook({ providerRef: ref, status, amount });
  } catch (err) {
    audit({ category: "WALLET", action: "webhook.payment.settle_error", actorId: null, targetType: "Webhook", targetId: ref, payload: { provider: "selcom", error: String(err) } });
    return NextResponse.json({ ok: false, error: "settle-failed" }, { status: 500 });
  }
  audit({ category: "WALLET", action: "webhook.payment.settled", actorId: null, targetType: "Webhook", targetId: ref, payload: { provider: "selcom", ...settled } });
  return NextResponse.json({ ok: true, ...settled });
}
