"use server";

import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle } from "@/lib/server/privacy";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/**
 * DSAR actions expose other players' PII, so they MUST be officer-only.
 * Server Actions bypass the admin layout, so the role is enforced here.
 * Returns the session on success, or an error result the caller returns as-is.
 */
async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) return { ok: false, error: "Not authorised." };
  return { ok: true, userId: session.userId };
}

/** Officer-on-behalf: file a DSAR request for a user. */
export async function fileDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  const type = String(formData.get("type") || "ACCESS") as "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
  const reason = String(formData.get("reason") || "") || null;
  if (!userId) return { ok: false, error: "userId required" };
  fileDsarRequest({ userId, type, reason: reason ?? undefined });
  revalidatePath("/admin/privacy");
  return { ok: true };
}

export async function fulfillDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const id = String(formData.get("id") || "").trim();
  const exportRef = String(formData.get("exportRef") || "") || null;
  const r = fulfillDsarRequest({ id, officerId: auth.userId, exportRef });
  if (!r) return { ok: false, error: "DSAR not found" };
  revalidatePath("/admin/privacy");
  return { ok: true };
}

/** Returns the DSAR JSON bundle so the client can download it as a file. */
export async function buildDsarBundleAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  const bundle = await buildDsarBundle(userId);
  if (!bundle) return { ok: false as const, error: "User not found" };
  return { ok: true as const, bundle };
}
