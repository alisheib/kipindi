"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  addSource,
  removeSource,
  setSourceEnabled,
  setCategoryEnabled,
  normalizeDomain,
} from "@/lib/server/source-registry";
import type { MarketCategory } from "@/lib/server/market-service";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("trading");
}

export async function addSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as MarketCategory;
  const rationale = String(formData.get("rationale") ?? "").trim().slice(0, 500);
  if (!domain || !label || !rationale) {
    return { ok: false as const, error: "Domain, label and rationale are required." };
  }
  try {
    await addSource({ domain, label, category, rationale, addedBy: session.userId });
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Add source failed") };
  }
}

export async function toggleSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    await setSourceEnabled(id, enabled, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle failed") };
  }
}

export async function removeSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await removeSource(id, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Remove failed") };
  }
}

export async function toggleCategoryAction(formData: FormData) {
  const session = await ensureAdmin();
  const category = String(formData.get("category") ?? "") as MarketCategory;
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    await setCategoryEnabled(category, enabled, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle category failed") };
  }
}
