"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { requestInvitationOtp, acceptInvitation, declineInvitation } from "@/lib/server/agent-application-service";

export type InviteActionResult = { ok: true; data?: { applicationId?: string; expiresAt?: string } } | { ok: false; error: string; code?: string };

export async function requestInvitationOtpAction(formData: FormData): Promise<InviteActionResult> {
  const token = String(formData.get("token") ?? "");
  const r = await requestInvitationOtp(token);
  return r.ok ? { ok: true, data: { expiresAt: r.data?.expiresAt } } : { ok: false, error: r.error, code: r.code };
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
