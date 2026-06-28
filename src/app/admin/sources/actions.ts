"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  addSource,
  removeSource,
  setSourceEnabled,
  setCategoryEnabled,
} from "@/lib/server/source-registry";
import type { MarketCategory } from "@/lib/server/market-service";
import { MARKET_OPS_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = MARKET_OPS_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  // Role check here too — Server Actions bypass the admin layout's gate.
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return session;
}

export async function addSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as MarketCategory;
  const rationale = String(formData.get("rationale") ?? "").trim().slice(0, 500);
  if (!domain || !label || !rationale) {
    return { ok: false as const, error: "Domain, label and rationale are required." };
  }
  await addSource({ domain, label, category, rationale, addedBy: session.userId });
  revalidatePath("/admin/sources");
  return { ok: true as const };
}

export async function toggleSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  await setSourceEnabled(id, enabled, session.userId);
  revalidatePath("/admin/sources");
  return { ok: true as const };
}

export async function removeSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  await removeSource(id, session.userId);
  revalidatePath("/admin/sources");
  return { ok: true as const };
}

export async function toggleCategoryAction(formData: FormData) {
  const session = await ensureAdmin();
  const category = String(formData.get("category") ?? "") as MarketCategory;
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  await setCategoryEnabled(category, enabled, session.userId);
  revalidatePath("/admin/sources");
  return { ok: true as const };
}
