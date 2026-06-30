"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  setGlobalConfig,
  setMarketOverride,
  clearMarketOverride,
  type RateConfig,
} from "@/lib/server/market-config";
import { CONFIG_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  // Role check here too — Server Actions bypass the admin layout's gate.
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  await requireAdminTotp(s.userId, s.sessionId); // B3: 2FA at the action layer
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
  try {
    const updates: Partial<RateConfig> = {};
    const t = parseRate(String(formData.get("taxRate") ?? ""));
    const c = parseRate(String(formData.get("commissionRate") ?? ""));
    const co = parseRate(String(formData.get("cashOutFeeRate") ?? ""));
    const rv = parseRate(String(formData.get("reserveRate") ?? ""));
    const ag = parseRate(String(formData.get("aggregatorRate") ?? ""));
    const min = parseInteger(String(formData.get("minStake") ?? ""));
    const max = parseInteger(String(formData.get("maxStake") ?? ""));
    const thin = parseRatio(String(formData.get("thinProfitRatio") ?? ""));
    const starter = parseInteger(String(formData.get("starterBalanceTzs") ?? ""));
    const tra = parseRate(String(formData.get("traTaxOnCommissionRate") ?? ""));
    const gbt = parseRate(String(formData.get("gbtLevyOnCommissionRate") ?? ""));
    if (t !== undefined) updates.taxRate = t;
    if (c !== undefined) updates.commissionRate = c;
    if (co !== undefined) updates.cashOutFeeRate = co;
    if (rv !== undefined) updates.reserveRate = rv;
    if (ag !== undefined) updates.aggregatorRate = ag;
    if (min !== undefined) updates.minStake = min;
    if (max !== undefined) updates.maxStake = max;
    if (thin !== undefined) updates.thinProfitRatio = thin;
    if (starter !== undefined) updates.starterBalanceTzs = starter;
    if (tra !== undefined) updates.traTaxOnCommissionRate = tra;
    if (gbt !== undefined) updates.gbtLevyOnCommissionRate = gbt;
    const r = await setGlobalConfig(updates, s.userId);
    revalidatePath("/admin/config");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config update failed") };
  }
}

export async function setMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  try {
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
    const r = await setMarketOverride(marketId, updates, s.userId);
    revalidatePath("/admin/config");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Override failed") };
  }
}

export async function clearMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  try {
    await clearMarketOverride(marketId, s.userId);
    revalidatePath("/admin/config");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Clear override failed") };
  }
}
