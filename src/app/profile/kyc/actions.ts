"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { submitNidaStep, attachDocument, attachExtraDocument, submitForReview } from "@/lib/server/kyc-service";

export async function submitNidaAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const rawEmail = formData.get("email");
  const emailStr = rawEmail ? String(rawEmail).trim() : "";
  console.log(`[kyc-action] submitNida user=${session.userId.slice(0, 14)}… rawEmail=${rawEmail === null ? "NULL(missing)" : `"${emailStr}"`}`);

  const result = await submitNidaStep(session.userId, {
    nida: String(formData.get("nida") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    ...(emailStr ? { email: emailStr } : {}),
  });

  // Verify the email was actually persisted
  if (emailStr) {
    const { db } = await import("@/lib/server/store");
    const u = await db.user.findById(session.userId);
    console.log(`[kyc-action] post-save check: user.email=${u?.email ?? "NULL"} (expected=${emailStr})`);
  }

  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(`/profile/kyc?error=${encodeURIComponent(result.error)}`);
  redirect("/profile/kyc?nida=verified");
}

export async function attachDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const docType = String(formData.get("docType") ?? "") as "NIDA_FRONT" | "NIDA_BACK" | "SELFIE";
  if (!["NIDA_FRONT", "NIDA_BACK", "SELFIE"].includes(docType)) return { ok: false, error: "Invalid document type." };
  // The client resizes the photo and posts it as a base64 image data URL; the
  // service validates the format + size and stores it on the submission.
  const image = String(formData.get("image") ?? "");
  const result = await attachDocument(session.userId, docType, image);
  revalidatePath("/profile/kyc");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function attachExtraDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { ok: false, error: "Missing request." };
  const image = String(formData.get("image") ?? "");
  const result = await attachExtraDocument(session.userId, requestId, image);
  revalidatePath("/profile/kyc");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function submitKycForReviewAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const result = await submitForReview(session.userId);
  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(`/profile/kyc?error=${encodeURIComponent(result.error)}`);
  redirect("/profile/kyc?submitted=1");
}
