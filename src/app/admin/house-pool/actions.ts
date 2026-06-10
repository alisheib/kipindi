"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  topUpHousePool,
  withdrawHousePool,
  setHousePoolConfig,
  type HousePoolConfig,
} from "@/lib/server/house-pool";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  // Defence-in-depth: Server Actions can be invoked directly (bypassing the
  // admin layout), so the ROLE must be checked here, not just session presence.
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

export async function topUpAction(formData: FormData) {
  const s = await ensureAdmin();
  const amount = parseInt(String(formData.get("amount") ?? ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Enter a positive amount." };
  }
  const r = topUpHousePool(amount, s.userId);
  revalidatePath("/admin/house-pool");
  return r;
}

export async function withdrawAction(formData: FormData) {
  const s = await ensureAdmin();
  const amount = parseInt(String(formData.get("amount") ?? ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Enter a positive amount." };
  }
  const r = withdrawHousePool(amount, s.userId);
  revalidatePath("/admin/house-pool");
  return r;
}

export async function updateHousePoolConfigAction(formData: FormData) {
  const s = await ensureAdmin();
  const updates: Partial<HousePoolConfig> = {};

  const seedRaw = formData.get("seedPerSide");
  if (seedRaw != null && String(seedRaw) !== "") {
    const n = parseInt(String(seedRaw), 10);
    if (Number.isFinite(n)) updates.seedPerSide = n;
  }

  const minRaw = formData.get("minReserve");
  if (minRaw != null && String(minRaw) !== "") {
    const n = parseInt(String(minRaw), 10);
    if (Number.isFinite(n)) updates.minReserve = n;
  }

  const pauseRaw = formData.get("pauseMarketsOnLowReserve");
  updates.pauseMarketsOnLowReserve = pauseRaw === "on" || pauseRaw === "true";

  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: "No values to update." };
  }

  const r = setHousePoolConfig(updates, s.userId);
  revalidatePath("/admin/house-pool");
  return r;
}
