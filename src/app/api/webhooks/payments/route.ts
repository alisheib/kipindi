/**
 * Payment-provider webhook receiver.
 *
 * Production providers (Selcom, Azampay, Mixx by Yas) post deposit/withdrawal
 * status updates to this endpoint. Each post is signed with HMAC-SHA-256 using
 * the per-provider secret (env var `${PROVIDER}_WEBHOOK_SECRET`). We verify the
 * signature with timing-safe compare + a 5-minute timestamp window before doing
 * anything stateful.
 *
 * Headers expected:
 *   X-Provider:    selcom | azampay | mixx
 *   X-Signature:   hex-encoded HMAC-SHA-256 of the raw request body
 *   X-Timestamp:   ISO-8601 (provider-stamped) — replay protection window
 *
 * On success the audit log records `webhook.payment.received` under the WALLET
 * category. Replay-protection rejections are logged under SYSTEM.
 */
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KNOWN_PROVIDERS: Record<string, string> = {
  selcom:  "SELCOM_WEBHOOK_SECRET",
  azampay: "AZAMPAY_WEBHOOK_SECRET",
  mixx:    "MIXX_WEBHOOK_SECRET",
};

export async function POST(req: Request) {
  const provider = (req.headers.get("x-provider") ?? "").toLowerCase();
  const signature = req.headers.get("x-signature") ?? "";
  const timestamp = req.headers.get("x-timestamp") ?? undefined;
  const body = await req.text();

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

  audit({
    category: "WALLET",
    action: "webhook.payment.received",
    actorId: null,
    targetType: "Webhook",
    targetId: (parsed as { reference?: string })?.reference ?? null,
    payload: { provider, body: parsed, signaturePrefix: signature.slice(0, 12) },
  });

  return NextResponse.json({ ok: true });
}
