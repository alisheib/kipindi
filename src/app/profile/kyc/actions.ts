"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { startKyc, submitNidaStep, attachDocument, attachExtraDocument, submitForReview } from "@/lib/server/kyc-service";
import { getServerT } from "@/lib/i18n-server";
import { reasonKeyFor } from "@/lib/failure-banner";

/**
 * Player explicitly restarts a REJECTED submission.
 *
 * `startKyc()` CLEARS the record (nidaNumber, documents, rejectReason, rejectNote
 * — see kyc-service.ts:79-95). That is correct for a deliberate "start again", and
 * wrong for a page load: until 2026-07-31 `page.tsx` called it on every render,
 * which wiped the rejection one line before the page read it, so the rejection
 * panel was unreachable and the player never learned why they were turned down.
 * Restarting is now an action the player takes, not a side effect of looking.
 */
export async function restartKycAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await startKyc(session.userId);
  revalidatePath("/profile/kyc");
  redirect("/profile/kyc");
}

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
    // ⛔ THE KEY, NOT THE SENTENCE. This used to mint the localized copy HERE and put the
    // finished sentence on the query string. That was already better than raw prose, but it
    // still meant the page rendered whatever `?error=` said — so any text could be shown to a
    // signed-in player by handing them a link. The page resolves the key itself now.
    const carry = `&nida=${encodeURIComponent(nida)}&fullName=${encodeURIComponent(fullName)}&dob=${encodeURIComponent(dob)}${emailStr ? `&email=${encodeURIComponent(emailStr)}` : ""}`;
    redirect(`/profile/kyc?reason=${encodeURIComponent(reasonKeyFor(result))}${carry}`);
  }
  // A NIDA that FAILS the identity check (mismatch / sanctioned / underage /
  // not-found) still returns ok:true — `ok` reports that the step ran, not that
  // the player passed. submitNidaStep has already set the submission to REJECTED
  // and emailed "Identity check needs attention". Redirecting to ?nida=verified
  // greeted that player with "NIDA number accepted — now attach your documents",
  // i.e. the screen contradicted the email. Fall through to the page, which now
  // renders the rejection panel with the reason.
  if (result.data?.verified === false) redirect("/profile/kyc");
  redirect("/profile/kyc?nida=verified");
}

export async function attachDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string }> {
  // B-7 — failures carry `code` (+ the stable service string) so the uploader
  // can render its own localized line via errorCopy.
  // ⛔ AND THEY MUST CARRY `reason`, OR TEACHING THE SERVICE TO EMIT ONE IS INERT. This
  // boundary used to forward `error` and `code` and silently drop everything else, so a
  // reason minted in `kyc-service.ts` died here and the uploader fell back to prose.
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };
  const docType = String(formData.get("docType") ?? "") as "NIDA_FRONT" | "NIDA_BACK" | "SELFIE";
  if (!["NIDA_FRONT", "NIDA_BACK", "SELFIE"].includes(docType)) return { ok: false, error: "Invalid document type.", code: "INVALID" };
  // The client resizes the photo and posts it as a base64 image data URL; the
  // service validates the format + size and stores it on the submission.
  const image = String(formData.get("image") ?? "");
  const result = await attachDocument(session.userId, docType, image);
  revalidatePath("/profile/kyc");
  return result.ok ? { ok: true } : { ok: false, error: result.error, code: result.code, reason: result.reason };
}

export async function attachExtraDocumentAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { ok: false, error: "Missing request.", code: "INVALID" };
  const image = String(formData.get("image") ?? "");
  const result = await attachExtraDocument(session.userId, requestId, image);
  revalidatePath("/profile/kyc");
  return result.ok ? { ok: true } : { ok: false, error: result.error, code: result.code, reason: result.reason };
}

export async function submitKycForReviewAction() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const result = await submitForReview(session.userId);
  revalidatePath("/profile/kyc");
  if (!result.ok) {
    redirect(`/profile/kyc?reason=${encodeURIComponent(reasonKeyFor(result))}`);
  }
  redirect("/profile/kyc?submitted=1");
}
