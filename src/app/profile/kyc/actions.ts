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

  const nida = String(formData.get("nida") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const dob = String(formData.get("dob") ?? "");

  const result = await submitNidaStep(session.userId, {
    nida,
    fullName,
    dob,
    ...(emailStr ? { email: emailStr } : {}),
  });

  revalidatePath("/profile/kyc");
  // Carry form values through the error redirect so the player doesn't
  // have to re-type a 20-digit NIDA number + full name on validation failure.
  if (!result.ok) {
    const carry = `&nida=${encodeURIComponent(nida)}&fullName=${encodeURIComponent(fullName)}&dob=${encodeURIComponent(dob)}${emailStr ? `&email=${encodeURIComponent(emailStr)}` : ""}`;
    redirect(`/profile/kyc?error=${encodeURIComponent(result.error)}${carry}`);
  }
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
