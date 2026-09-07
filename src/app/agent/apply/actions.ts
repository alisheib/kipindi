"use server";

/**
 * The applicant's server actions. Thin: every rule lives in `agent-application-service.ts`.
 * The one thing this layer OWNS is the classification of an upload failure into the three
 * words the form shows — wrong type · too large · magic bytes disagree — because the shared
 * KYC validator (deliberately unchanged, it is one of four certified modules) returns one
 * reason for the first and third, and the UI must not substring-match English prose to tell
 * them apart.
 */
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { sniffBase64ImageMime } from "@/lib/server/image-signature";
import { MAX_DOC_BYTES } from "@/lib/id-documents";
import type { AgentDocType } from "@/lib/server/store";
import {
  startApplication, attachAgentDocument, setReferees, recordFeePayment, submitForReview, ALL_DOC_SLOTS,
} from "@/lib/server/agent-application-service";
import { AGENT_TERMS_VERSION } from "@/lib/agent-terms-version";

export type UploadFailure = "type" | "size" | "magic" | "locked" | "generic";
export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string; failure?: UploadFailure; missing?: string[] };

async function me(): Promise<string> {
  const s = await currentSession();
  if (!s) redirect("/auth/login?next=/agent/apply");
  return s.userId;
}

/** The /agent page's "Apply now". Starts (or resumes) and lands on the form. */
export async function startApplicationAction(): Promise<void> {
  const userId = await me();
  const r = await startApplication(userId);
  // ⭐ A refused start used to bounce back to /agent with no word — a silent loop on "Apply now".
  if (!r.ok) redirect("/agent?refused=1");
  redirect("/agent/apply");
}

export async function attachAgentDocumentAction(formData: FormData): Promise<ActionResult<{ status: string; attached: number }>> {
  const userId = await me();
  const docType = String(formData.get("docType") ?? "") as AgentDocType;
  const image = String(formData.get("image") ?? "");
  if (!ALL_DOC_SLOTS.includes(docType)) return { ok: false, error: "Unknown slot.", failure: "generic" };
  // Classify BEFORE the service so the three refusals stay distinct on the form.
  const declared = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!declared) return { ok: false, error: "Not a supported image.", failure: "type" };
  const bytes = Math.floor((declared[2].length * 3) / 4);
  if (bytes > MAX_DOC_BYTES) return { ok: false, error: "Too large.", failure: "size" };
  const actual = sniffBase64ImageMime(declared[2]);
  if (!actual) return { ok: false, error: "Not an image.", failure: "type" };
  if (actual !== `image/${declared[1]}`) return { ok: false, error: "The bytes disagree with the declared type.", failure: "magic" };
  const r = await attachAgentDocument(userId, docType, image);
  if (!r.ok) return { ok: false, error: r.error, failure: r.reason === "docs_locked" ? "locked" : r.reason === "doc_too_large" ? "size" : r.reason === "doc_image_type" ? "type" : "generic" };
  return { ok: true, data: r.data };
}

export async function setRefereesAction(formData: FormData): Promise<ActionResult> {
  const userId = await me();
  const r = await setReferees(userId, {
    oneName: String(formData.get("oneName") ?? ""), oneContact: String(formData.get("oneContact") ?? ""),
    twoName: String(formData.get("twoName") ?? ""), twoContact: String(formData.get("twoContact") ?? ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function recordFeePaymentAction(formData: FormData): Promise<ActionResult<{ status: string }>> {
  const userId = await me();
  const r = await recordFeePayment(userId, { feeReference: String(formData.get("feeReference") ?? "") });
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function submitAgentApplicationAction(formData: FormData): Promise<ActionResult<{ missing: string[] }>> {
  const userId = await me();
  const accepted = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  if (!accepted) return { ok: false, error: "Accept the agent terms to continue." };
  const r = await submitForReview(userId, { acceptedTermsVersion: AGENT_TERMS_VERSION });
  if (!r.ok) return { ok: false, error: r.error, missing: (r as { data?: { missing?: string[] } }).data?.missing };
  return { ok: true, data: { missing: [] } };
}
