"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { type AdminDomain } from "@/lib/server/roles";
import { requireStaff } from "@/lib/server/rbac-guard";
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
// RBAC: economics config (asset registry, rate profile, thresholds, price source) is
// money-grade → `accounting`; chain start / pause / stop is operational → `trading`.
// requireStaff enforces the role's canAct for the domain (Owner/ADMIN bypass), audits
// a blocked attempt, then step-up 2FA. Mirrors the old CONFIG vs MARKET_OPS split.
async function ensure(domain: AdminDomain) {
  return requireStaff(domain);
}

const ensureConfig = () => ensure("accounting");
const ensureOps = () => ensure("trading");

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
    const marginPct = num(formData, "marginPct");
    const r = await createChain({
      assetId,
      durationMinutes: duration as Duration,
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
      // % in the UI → basis points. Blank = inherit the product default.
      marginBps: marginPct != null ? Math.round(marginPct * 100) : null,
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
    const patch: { minStake: number | null; maxStake: number | null; marginBps?: number | null } = {
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
    };
    // Only touch the margin when the field is present, so a stake-only edit never
    // silently clears a chain's margin override. Blank-but-present = inherit (null).
    if (formData.has("marginPct")) {
      const marginPct = num(formData, "marginPct");
      patch.marginBps = marginPct != null ? Math.round(marginPct * 100) : null;
    }
    const r = await updateChain(id, patch, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update chain failed") };
  }
}

// ── Rounds (CONFIG tier — a void MOVES MONEY) ────────────────────────────────

/**
 * VOID a round and refund every stake in full.
 *
 * ⛔ CONFIG tier (`accounting`), NOT ops. Starting and pausing a chain is operational —
 * it changes whether rounds are emitted. This REFUNDS REAL MONEY, so it sits with the
 * money-grade roles; MODERATOR (who may pause a chain) must not be able to move a
 * player's balance. `docs/UPDOWN-ARCHITECTURE.md` §10 listed this under MARKET_OPS; the
 * doc was written before the action existed and is corrected alongside this.
 *
 * WHY IT EXISTS AT ALL: `voidRoundByOperator` was written, tested by nothing, and called
 * by NOTHING — dead code with no route, no action and no button. So when production
 * accumulated 1,398 rounds that could not resolve, there was no way for an operator to
 * return the money either: Up & Down rounds are also filtered out of /admin/markets
 * (`listMarkets()` defaults to `productLine: "MARKET"`), so the emergency-void control
 * there could not see them. This is the escape hatch that was missing.
 *
 * The reason is REQUIRED and lands in the audit payload. A refund with no stated cause
 * is not a decision anyone can defend later.
 */
export async function voidRoundAction(formData: FormData) {
  const session = await ensureConfig();
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false as const, error: "Which round? No round id was supplied." };
  if (reason.length < 8) {
    return { ok: false as const, error: "Give a reason of at least 8 characters — it is written to the audit trail and is the only record of why this money moved." };
  }
  if (reason.length > 300) {
    return { ok: false as const, error: "Keep the reason under 300 characters." };
  }
  try {
    const { voidRoundByOperator } = await import("@/lib/server/updown-service");
    const r = await voidRoundByOperator(id, session.userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    revalidatePath("/admin/updown/rounds");
    return { ok: true as const, settled: r.data.settled };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Void failed") };
  }
}

// ── Thresholds (CONFIG tier — they govern what counts as a valid price) ──────

export async function updateThresholdsAction(formData: FormData) {
  const session = await ensureConfig();
  try {
    const marginPct = num(formData, "defaultMarginPct");
    const r = await setUpDownConfig({
      maxStalenessSeconds: num(formData, "maxStalenessSeconds"),
      confidenceThreshold: num(formData, "confidenceThreshold"),
      maxObservationAttempts: num(formData, "maxObservationAttempts"),
      defaultMinStake: num(formData, "defaultMinStake"),
      defaultMaxStake: num(formData, "defaultMaxStake"),
      // Round margin: % in the UI → basis points (0.5% → 50). See UPDOWN-PRICING.md.
      defaultMarginBps: marginPct != null ? Math.round(marginPct * 100) : undefined,
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const, warn: r.warn };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update thresholds failed") };
  }
}
