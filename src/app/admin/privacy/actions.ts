"use server";

import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle } from "@/lib/server/privacy";
import { getSession } from "@/lib/server/session";

/** Officer-on-behalf: file a DSAR request for a user. */
export async function fileDsarAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const userId = String(formData.get("userId") || "").trim();
  const type = String(formData.get("type") || "ACCESS") as "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
  const reason = String(formData.get("reason") || "") || null;
  if (!userId) return { ok: false, error: "userId required" };
  fileDsarRequest({ userId, type, reason: reason ?? undefined });
  revalidatePath("/admin/privacy");
  return { ok: true };
}

export async function fulfillDsarAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const id = String(formData.get("id") || "").trim();
  const exportRef = String(formData.get("exportRef") || "") || null;
  const r = fulfillDsarRequest({ id, officerId: session.userId, exportRef });
  if (!r) return { ok: false, error: "DSAR not found" };
  revalidatePath("/admin/privacy");
  return { ok: true };
}

/** Returns the DSAR JSON bundle so the client can download it as a file. */
export async function buildDsarBundleAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in." };
  const userId = String(formData.get("userId") || "").trim();
  const bundle = buildDsarBundle(userId);
  if (!bundle) return { ok: false as const, error: "User not found" };
  return { ok: true as const, bundle };
}
