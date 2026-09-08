"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { requestInvitationOtp, acceptInvitation, declineInvitation } from "@/lib/server/agent-application-service";

/** ⭐ `delivery` is `SendResult["reason"]` — `sent` · `stub` · `no-address` ·
 *  `suppressed` · `failed`. The client reads it before claiming a code is in the invitee's
 *  inbox: opening a code box after a suppressed send strands them on a screen they can never
 *  complete. `email.ts` states the rule — a caller that makes a promise must read the reason. */
export type InviteActionResult = { ok: true; data?: { applicationId?: string; expiresAt?: string; delivery?: string } } | { ok: false; error: string; code?: string };

export async function requestInvitationOtpAction(formData: FormData): Promise<InviteActionResult> {
  const token = String(formData.get("token") ?? "");
  const r = await requestInvitationOtp(token);
  return r.ok ? { ok: true, data: { expiresAt: r.data?.expiresAt, delivery: r.data?.delivery } } : { ok: false, error: r.error, code: r.code };
}

export async function acceptInvitationAction(formData: FormData): Promise<InviteActionResult> {
  const session = await currentSession();
  const token = String(formData.get("token") ?? "");
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/agent/invite/${token}`)}`);
  const r = await acceptInvitation(session.userId, token, String(formData.get("code") ?? ""));
  return r.ok ? { ok: true, data: { applicationId: r.data?.applicationId } } : { ok: false, error: r.error, code: r.code };
}

export async function declineInvitationAction(formData: FormData): Promise<InviteActionResult> {
  const r = await declineInvitation(String(formData.get("token") ?? ""));
  return r.ok ? { ok: true } : { ok: false, error: r.error, code: r.code };
}
