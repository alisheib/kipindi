/**
 * Postmark webhook — bounce + spam-complaint receiver.
 *
 * Postmark POSTs delivery events here. We act on hard bounces and spam
 * complaints by adding the address to the suppression list (email-suppression.ts)
 * so sendEmail() stops mailing it — protecting sender reputation/deliverability.
 *
 * Auth: a shared secret. Configure the Postmark webhook URL with `?token=<secret>`
 * (or send it as the `X-Postmark-Token` header) and set `POSTMARK_WEBHOOK_SECRET`
 * to the same value. In production an unset/empty secret rejects all calls (the
 * endpoint is never left open); in dev it's allowed for local testing.
 */
import { NextResponse } from "next/server";
import { suppressEmail } from "@/lib/server/email-suppression";
import { audit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET ?? "";
  if (!secret) return process.env.NODE_ENV !== "production"; // open only in dev
  const url = new URL(req.url);
  const provided = url.searchParams.get("token") ?? req.headers.get("x-postmark-token") ?? "";
  return provided === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    audit({ category: "SYSTEM", action: "webhook.postmark.rejected", actorId: null, targetType: null, targetId: null, payload: { reason: "bad-secret" } });
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { RecordType?: string; Type?: string; Email?: string; Inactive?: boolean } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const recordType = body?.RecordType ?? "";
  const email = (body?.Email ?? "").trim();

  // Suppress on spam complaints and HARD bounces / deactivations only. Transient
  // (soft) bounces are not suppressed — they often recover.
  const isComplaint = recordType === "SpamComplaint";
  const isHardBounce = recordType === "Bounce" && (body?.Inactive === true || ["HardBounce", "BadEmailAddress", "SpamNotification", "ManuallyDeactivated"].includes(body?.Type ?? ""));

  if (email && (isComplaint || isHardBounce)) {
    await suppressEmail(email, isComplaint ? "spam-complaint" : `bounce:${body?.Type ?? "hard"}`);
    return NextResponse.json({ ok: true, suppressed: email });
  }

  // Acknowledge everything else (deliveries, opens, soft bounces) without action.
  return NextResponse.json({ ok: true, ignored: recordType || "unknown" });
}
