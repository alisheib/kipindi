"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { type AdminDomain } from "@/lib/server/roles";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import {
  createAsset, updateAsset, setAssetEnabled,
  createChain, updateChain, setChainState,
  setUpDownConfig,
  ALLOWED_DURATIONS, type Duration,
} from "@/lib/server/updown-config";
import { voidRoundByOperator } from "@/lib/server/updown-service";
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

// ── Rounds (MONEY tier — this one hands real stakes back) ────────────────────

/**
 * Void a round and refund every stake in full — the operator's remedy for a round the
 * engine could not finish.
 *
 * FINDING E-23. `voidRoundByOperator` has existed since the subsystem shipped, audits
 * properly and refunds through the normal settlement path — and `grep -rn` found
 * exactly ONE reference to it: its own definition. No action, no button, no route. So
 * when E-24 stranded a stake, nobody on the platform could release it through the
 * product; the 1,395 historical `operator` voids must have come from a hand-run
 * script. A remedy that only exists in a script is not a remedy an operator has.
 *
 * ⛔ THE DOMAIN IS `compliance`, NOT `trading` — the tier this file's own header
 * describes for chain start/stop does not apply. Stopping a chain changes whether
 * rounds are emitted; this hands money back. It is read from CONTROL_DOMAIN so the
 * rounds page can ask the identical question before it renders anything (E-18).
 */
export async function voidRoundAction(formData: FormData) {
  const session = await requireStaff(CONTROL_DOMAIN.voidUpDownRound, "voidUpDownRound");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  // An officer-entered reason is required and is NOT decorated by us: whatever is
  // stored here is what the compliance record says about why a player's stake was
  // handed back (the E-6 rule — our words never masquerade as the officer's).
  if (reason.length < 5) {
    return { ok: false as const, error: "Give a reason of at least 5 characters — it is recorded on the compliance trail." };
  }
  try {
    const r = await voidRoundByOperator(id, session.userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath("/admin/updown/rounds");
    revalidatePath("/admin/updown");
    return { ok: true as const, settled: r.data.settled };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Void round failed") };
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
