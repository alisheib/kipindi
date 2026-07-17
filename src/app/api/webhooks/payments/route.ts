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
import { selcomEnv, selcomVerifyOrder, selcomVerifyCashin, verifySelcomCallback } from "@/lib/server/selcom";

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

const KNOWN_PROVIDERS: Record<string, string> = {
  selcom:  "SELCOM_WEBHOOK_SECRET",
  azampay: "AZAMPAY_WEBHOOK_SECRET",
  mixx:    "MIXX_WEBHOOK_SECRET",
};

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
    // Withdrawal (wallet-cashin): AUTHORITATIVE re-query via the docs'
    // GET /v1/walletcashin/query — we do not trust the callback body/signature
    // for a payout confirmation either. (sigOk above is captured for audit only.)
    const verdict = await selcomVerifyCashin(env, transid || ref);
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
