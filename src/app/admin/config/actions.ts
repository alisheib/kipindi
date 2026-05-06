"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import {
  setGlobalConfig,
  setMarketOverride,
  clearMarketOverride,
  type RateConfig,
} from "@/lib/server/market-config";

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  return s;
}

function parseRate(raw: string | null, scale = 100): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n / scale; // input is 0–20 (percent), stored as 0.0–0.20
}

function parseInteger(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseRatio(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function updateGlobalConfigAction(formData: FormData) {
  const s = await ensureAdmin();
  const updates: Partial<RateConfig> = {};
  const t = parseRate(String(formData.get("taxRate") ?? ""));
  const c = parseRate(String(formData.get("commissionRate") ?? ""));
  const min = parseInteger(String(formData.get("minStake") ?? ""));
  const max = parseInteger(String(formData.get("maxStake") ?? ""));
  const thin = parseRatio(String(formData.get("thinProfitRatio") ?? ""));
  if (t !== undefined) updates.taxRate = t;
  if (c !== undefined) updates.commissionRate = c;
  if (min !== undefined) updates.minStake = min;
  if (max !== undefined) updates.maxStake = max;
  if (thin !== undefined) updates.thinProfitRatio = thin;
  const r = setGlobalConfig(updates, s.userId);
  revalidatePath("/admin/config");
  return r;
}

export async function setMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  const updates: Partial<RateConfig> = {};
  const t = parseRate(String(formData.get("taxRate") ?? ""));
  const c = parseRate(String(formData.get("commissionRate") ?? ""));
  const min = parseInteger(String(formData.get("minStake") ?? ""));
  const max = parseInteger(String(formData.get("maxStake") ?? ""));
  if (t !== undefined) updates.taxRate = t;
  if (c !== undefined) updates.commissionRate = c;
  if (min !== undefined) updates.minStake = min;
  if (max !== undefined) updates.maxStake = max;
  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: "No values to update." };
  }
  const r = setMarketOverride(marketId, updates, s.userId);
  revalidatePath("/admin/config");
  return r;
}

export async function clearMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  clearMarketOverride(marketId, s.userId);
  revalidatePath("/admin/config");
  return { ok: true as const };
}
