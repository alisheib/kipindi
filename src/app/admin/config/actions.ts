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

/** A <select> for the fee model. Only the two known values are accepted. */
function parseFeeModel(raw: string | null): RateConfig["feeModel"] | undefined {
  if (raw === "capped-commission" || raw === "loser-share") return raw;
  return undefined;
}

/** A checkbox. Absent (unchecked) ⇒ false; present ("on"/"true") ⇒ true.
 *  The hidden companion input guarantees the key is always posted, so an unchecked
 *  box reads as an explicit false rather than "leave unchanged". */
function parseBool(raw: string | null): boolean | undefined {
  if (raw == null) return undefined;
  return raw === "on" || raw === "true" || raw === "1";
}

export async function updateGlobalConfigAction(formData: FormData) {
  const s = await ensureAdmin();
  try {
    const updates: Partial<RateConfig> = {};
    const c = parseRate(String(formData.get("commissionRate") ?? ""));
    const ceil = parseRate(String(formData.get("feeCeilingRate") ?? ""));
    const co = parseRate(String(formData.get("cashOutFeeRate") ?? ""));
    // Minutes, not a rate.
    const grace = parseInteger(String(formData.get("freeExitGraceMinutes") ?? ""));
    const paidWin = parseInteger(String(formData.get("paidExitWindowMinutes") ?? ""));
    const wdr = parseRate(String(formData.get("withdrawalFeeRate") ?? ""));
    const gw = parseRate(String(formData.get("withdrawalGatewayShareRate") ?? ""));
    const min = parseInteger(String(formData.get("minStake") ?? ""));
    const max = parseInteger(String(formData.get("maxStake") ?? ""));
    const thin = parseRatio(String(formData.get("thinProfitRatio") ?? ""));
    const starter = parseInteger(String(formData.get("starterBalanceTzs") ?? ""));
    const tra = parseRate(String(formData.get("traTaxOnCommissionRate") ?? ""));
    // F11 — the settlement gate. Hours, not a rate: 0..168, 0 = no window.
    const objWindow = parseInteger(String(formData.get("objectionWindowHours") ?? ""));
    const gbt = parseRate(String(formData.get("gbtLevyOnCommissionRate") ?? ""));
    // Fee model (loser-share) — applies to FUTURE polls only.
    const feeModel = parseFeeModel(formData.get("feeModel") as string | null);
    const platform = parseRate(String(formData.get("platformFeeRate") ?? ""));
    const operator = parseRate(String(formData.get("operatorFeeRate") ?? ""));
    const estRate = parseRate(String(formData.get("estimatedWinningsRate") ?? ""));
    // Checkbox: the form always posts this key (hidden companion), so its absence
    // is impossible; a genuinely-absent key means "form didn't include it" → skip.
    const showEst = formData.has("feeModel") ? parseBool(formData.get("showEstimatedWinnings") as string | null) : undefined;
    if (c !== undefined) updates.commissionRate = c;
    if (ceil !== undefined) updates.feeCeilingRate = ceil;
    if (co !== undefined) updates.cashOutFeeRate = co;
    if (grace !== undefined) updates.freeExitGraceMinutes = grace;
    if (paidWin !== undefined) updates.paidExitWindowMinutes = paidWin;
    if (wdr !== undefined) updates.withdrawalFeeRate = wdr;
    if (gw !== undefined) updates.withdrawalGatewayShareRate = gw;
    if (min !== undefined) updates.minStake = min;
    if (max !== undefined) updates.maxStake = max;
    if (thin !== undefined) updates.thinProfitRatio = thin;
    if (starter !== undefined) updates.starterBalanceTzs = starter;
    if (tra !== undefined) updates.traTaxOnCommissionRate = tra;
    if (objWindow !== undefined) updates.objectionWindowHours = objWindow;
    if (gbt !== undefined) updates.gbtLevyOnCommissionRate = gbt;
    if (feeModel !== undefined) updates.feeModel = feeModel;
    if (platform !== undefined) updates.platformFeeRate = platform;
    if (operator !== undefined) updates.operatorFeeRate = operator;
    if (estRate !== undefined) updates.estimatedWinningsRate = estRate;
    if (showEst !== undefined) updates.showEstimatedWinnings = showEst;
    // setGlobalConfig REFUSES a config under which a winner could be paid below
    // their stake (the winner-floor guardrail in validate()), and may return a
    // `warn` for a ceiling above 50%. Both surface to the officer.
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
    const c = parseRate(String(formData.get("commissionRate") ?? ""));
    const ceil = parseRate(String(formData.get("feeCeilingRate") ?? ""));
    // cashOutFeeRate + thinProfitRatio were always merged by getEffectiveConfig
    // but had no input in the form, so overriding either was unreachable.
    const co = parseRate(String(formData.get("cashOutFeeRate") ?? ""));
    const thin = parseRatio(String(formData.get("thinProfitRatio") ?? ""));
    const min = parseInteger(String(formData.get("minStake") ?? ""));
    const max = parseInteger(String(formData.get("maxStake") ?? ""));
    if (c !== undefined) updates.commissionRate = c;
    if (ceil !== undefined) updates.feeCeilingRate = ceil;
    if (co !== undefined) updates.cashOutFeeRate = co;
    if (thin !== undefined) updates.thinProfitRatio = thin;
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
