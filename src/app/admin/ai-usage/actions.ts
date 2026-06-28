"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setCreditLimit, resetCreditCycle } from "@/lib/server/ai-usage";
import { setAiModel, setSentinelInterval, AVAILABLE_MODELS, INTERVAL_OPTIONS } from "@/lib/server/ai-ops-config";
import { audit } from "@/lib/server/audit";
import { CONFIG_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

/** Set the per-cycle spend limit (USD). Admins are emailed at ~80% and at 100%. */
export async function setCreditLimitAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  await ensureAdmin();
  const raw = String(fd.get("limitUsd") ?? "").trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid limit in USD (e.g. 20)." };
  }
  await setCreditLimit(amount);
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}

/** Start a fresh spend cycle (call right after topping up Anthropic credit).
 *  Resets "spent this cycle" to 0 and re-arms the limit alerts. */
export async function resetCreditCycleAction(): Promise<{ ok: boolean; error?: string }> {
  await ensureAdmin();
  await resetCreditCycle();
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}

/** Set the primary Claude model for poll generation + sentinel deep checks. */
export async function setAiModelAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  const model = String(fd.get("model") ?? "").trim();
  if (!AVAILABLE_MODELS.some((m) => m.id === model)) {
    return { ok: false, error: "Invalid model selection." };
  }
  await setAiModel(model);
  // Notify sentinel so next sweep uses the new model immediately
  try {
    const { applySentinelConfigChange } = await import("@/lib/server/market-sentinel");
    await applySentinelConfigChange();
  } catch { /* sentinel may not be running in dev */ }
  audit({
    category: "ADMIN",
    action: "ai.model_changed",
    actorId: s.userId,
    targetType: "System",
    targetId: "ai-config",
    payload: { model },
  });
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}

/** Live sentinel status for the countdown widget (next sweep time, interval). */
export async function getSentinelStatusAction() {
  await ensureAdmin();
  const { getSentinelStatus } = await import("@/lib/server/market-sentinel");
  return getSentinelStatus();
}

/** Reset the countdown — schedule the next sweep one full interval from now. */
export async function resetSentinelTimerAction(): Promise<{ ok: boolean; nextSweepAt?: number | null; error?: string }> {
  const s = await ensureAdmin();
  try {
    const { resetSentinelTimer } = await import("@/lib/server/market-sentinel");
    const r = await resetSentinelTimer(s.userId);
    return { ok: true, nextSweepAt: r.nextSweepAt };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** "Finish timer & execute" — run a sentinel sweep right now, then re-arm. */
export async function runSentinelNowAction(): Promise<{ ok: boolean; closed?: number; errors?: number; total?: number; error?: string }> {
  const s = await ensureAdmin();
  try {
    const { runSentinelNow } = await import("@/lib/server/market-sentinel");
    const r = await runSentinelNow(s.userId);
    revalidatePath("/admin/resolver-queue");
    if (!r.ok) return { ok: false, error: r.reason };
    return { ok: true, closed: r.summary?.closed ?? 0, errors: r.summary?.errors ?? 0, total: r.summary?.total ?? 0 };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** Pause the sentinel — disarm the scheduler so no sweep (and no paid AI call)
 *  can start until resumed. Persisted across restarts. */
export async function pauseSentinelAction(): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  try {
    const { pauseSentinel } = await import("@/lib/server/market-sentinel");
    await pauseSentinel(s.userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** Resume the sentinel after a pause — re-arm the countdown one interval out. */
export async function resumeSentinelAction(): Promise<{ ok: boolean; nextSweepAt?: number | null; error?: string }> {
  const s = await ensureAdmin();
  try {
    const { resumeSentinel } = await import("@/lib/server/market-sentinel");
    const r = await resumeSentinel(s.userId);
    return { ok: true, nextSweepAt: r.nextSweepAt };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** Set how often the sentinel sweeps live markets. Takes effect on next tick. */
export async function setSentinelIntervalAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  const raw = String(fd.get("intervalMs") ?? "").trim();
  const ms = Number(raw);
  if (!INTERVAL_OPTIONS.some((o) => o.ms === ms)) {
    return { ok: false, error: "Invalid interval selection." };
  }
  await setSentinelInterval(ms);
  // Force the running sentinel to immediately pick up the new interval
  // instead of waiting for the old interval to fire its next tick.
  try {
    const { applySentinelConfigChange } = await import("@/lib/server/market-sentinel");
    await applySentinelConfigChange();
  } catch { /* sentinel may not be running in dev */ }
  audit({
    category: "ADMIN",
    action: "ai.sentinel_interval_changed",
    actorId: s.userId,
    targetType: "System",
    targetId: "market-sentinel",
    payload: { intervalMs: ms },
  });
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}
