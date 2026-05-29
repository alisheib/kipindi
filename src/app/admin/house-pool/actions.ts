"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import {
  topUpHousePool,
  withdrawHousePool,
  setHousePoolConfig,
  type HousePoolConfig,
} from "@/lib/server/house-pool";

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
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
