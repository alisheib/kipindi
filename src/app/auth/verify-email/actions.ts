"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { confirmEmailWithProof } from "@/lib/server/email-verification";

/**
 * 🔴 A3 (route audit 2026-10-06) · THE CONFIRMATION LINK'S PASSWORD FORM. Opened away from the account's own session, the
 * link no longer confirms on open: the page asks for the account's password and posts it here. The outcome travels back
 * on the query string as a registry reason key (never prose), with the token, so the form can be tried again.
 * ⛔ The password is never echoed — not into the URL, a log or an audit row — and no session is created here.
 */
export async function confirmEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").slice(0, 4096);
  if (!token) redirect("/auth/verify-email");
  const pw = formData.get("password");
  const session = await currentSession().catch(() => null);
  const r = await confirmEmailWithProof(token, { sessionUserId: session?.userId ?? null, password: typeof pw === "string" ? pw : null });
  const base = "/auth/verify-email?token=" + encodeURIComponent(token);
  if (r.status === "verified" || r.status === "already") redirect((base + "&done=1") as never);
  if (r.status === "password_wrong") redirect((base + "&reason=password_wrong") as never);
  if (r.status === "rate_limited") redirect((base + "&reason=rate_limited&retry=" + Math.max(1, Math.ceil(r.retryAfterSec))) as never);
  if (r.status === "password_not_set") redirect((base + "&reason=signin_required") as never);
  redirect(base as never);
}
