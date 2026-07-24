"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { CONFIG_ROLES, MARKET_OPS_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import {
  createAsset, updateAsset, setAssetEnabled,
  createChain, updateChain, setChainState,
  setUpDownConfig,
  ALLOWED_DURATIONS, type Duration,
} from "@/lib/server/updown-config";
import type { ChainState } from "@/lib/server/updown-dal";
import type { MarketCategory } from "@/lib/server/market-service";

/**
 * TWO TIERS, deliberately different — see docs/UPDOWN-ARCHITECTURE.md §10.
 *
 *  · CONFIG_ROLES (ADMIN/COMPLIANCE, never MODERATOR) — the asset registry, the rate
 *    profile and the thresholds. These change ECONOMICS: the fee a round freezes, and
 *    the price source real money is settled against.
 *  · MARKET_OPS_ROLES (adds MODERATOR) — starting, pausing and stopping a chain. That
 *    is operational: it changes whether rounds are emitted, not what they are worth.
 *
 * Widening either tier re-grants authority everywhere it is imported. Keep them tight.
 */
async function ensure(tier: Set<string>) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!u || !tier.has(u.role)) redirect("/auth/admin");
  await requireAdminTotp(session.userId, session.sessionId);
  return session;
}

const ensureConfig = () => ensure(CONFIG_ROLES as unknown as Set<string>);
const ensureOps = () => ensure(MARKET_OPS_ROLES as unknown as Set<string>);

const refresh = () => revalidatePath("/admin/updown");

const num = (fd: FormData, k: string): number | undefined => {
  const raw = String(fd.get(k) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// ── Assets (CONFIG tier — the source real money resolves against) ────────────

export async function createAssetAction(formData: FormData) {
  const session = await ensureConfig();
  try {
    const r = await createAsset({
      key: String(formData.get("key") ?? ""),
      symbol: String(formData.get("symbol") ?? ""),
      nameEn: String(formData.get("nameEn") ?? ""),
      nameSw: String(formData.get("nameSw") ?? ""),
      nameZh: String(formData.get("nameZh") ?? "") || null,
      iconKey: String(formData.get("iconKey") ?? "gold"),
      priceSourceUrl: String(formData.get("priceSourceUrl") ?? ""),
      category: (String(formData.get("category") ?? "macro") || "macro") as MarketCategory,
      decimals: num(formData, "decimals"),
      minMoveTicks: num(formData, "minMoveTicks"),
      sortOrder: num(formData, "sortOrder"),
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Create asset failed") };
  }
}

export async function updateAssetAction(formData: FormData) {
  const session = await ensureConfig();
  const id = String(formData.get("id") ?? "");
  try {
    const r = await updateAsset(id, {
      symbol: String(formData.get("symbol") ?? "") || undefined,
      nameEn: String(formData.get("nameEn") ?? "") || undefined,
      nameSw: String(formData.get("nameSw") ?? "") || undefined,
      priceSourceUrl: String(formData.get("priceSourceUrl") ?? "") || undefined,
      decimals: num(formData, "decimals"),
      minMoveTicks: num(formData, "minMoveTicks"),
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update asset failed") };
  }
}

export async function toggleAssetAction(formData: FormData) {
  const session = await ensureConfig();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    // The service re-checks the trusted source on enable and refuses to disable an
    // asset with a running chain. Both refusals surface to the operator as-is.
    const r = await setAssetEnabled(id, enabled, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle asset failed") };
  }
}

// ── Chains (OPS tier — whether rounds are emitted) ───────────────────────────

export async function createChainAction(formData: FormData) {
  const session = await ensureOps();
  const assetId = String(formData.get("assetId") ?? "");
  const duration = Number(formData.get("durationMinutes") ?? 0);
  if (!ALLOWED_DURATIONS.includes(duration as Duration)) {
    return { ok: false as const, error: `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes.` };
  }
  try {
    const r = await createChain({
      assetId,
      durationMinutes: duration as Duration,
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Create chain failed") };
  }
}

export async function setChainStateAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  const state = String(formData.get("state") ?? "") as ChainState;
  if (state !== "RUNNING" && state !== "PAUSED" && state !== "STOPPED") {
    return { ok: false as const, error: "Invalid chain state." };
  }
  try {
    const r = await setChainState(id, state, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Chain state change failed") };
  }
}

export async function updateChainAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  try {
    const r = await updateChain(id, {
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update chain failed") };
  }
}

// ── Thresholds (CONFIG tier — they govern what counts as a valid price) ──────

export async function updateThresholdsAction(formData: FormData) {
  const session = await ensureConfig();
  try {
    const r = await setUpDownConfig({
      maxStalenessSeconds: num(formData, "maxStalenessSeconds"),
      confidenceThreshold: num(formData, "confidenceThreshold"),
      maxObservationAttempts: num(formData, "maxObservationAttempts"),
      defaultMinStake: num(formData, "defaultMinStake"),
      defaultMaxStake: num(formData, "defaultMaxStake"),
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const, warn: r.warn };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update thresholds failed") };
  }
}
