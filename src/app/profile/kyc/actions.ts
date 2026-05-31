"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { submitNidaStep, attachDocument, submitForReview } from "@/lib/server/kyc-service";

export async function submitNidaAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const result = await submitNidaStep(session.userId, {
    nida: String(formData.get("nida") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    dob: String(formData.get("dob") ?? ""),
  });
  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(`/profile/kyc?error=${encodeURIComponent(result.error)}`);
  redirect("/profile/kyc?nida=verified");
}

export async function attachDocumentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const docType = String(formData.get("docType") ?? "") as "NIDA_FRONT" | "NIDA_BACK" | "SELFIE";
  // In dev, use a mock storage key; real implementation would multipart-upload to S3-compatible store.
  const storageKey = `dev/${session.userId}/${docType}/${Date.now()}.jpg`;
  const result = await attachDocument(session.userId, docType, storageKey);
  revalidatePath("/profile/kyc");
  return result;
}

export async function submitKycForReviewAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const result = await submitForReview(session.userId);
  revalidatePath("/profile/kyc");
  if (!result.ok) redirect(`/profile/kyc?error=${encodeURIComponent(result.error)}`);
  redirect("/profile/kyc?submitted=1");
}
