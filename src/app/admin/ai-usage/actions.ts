"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setCreditLimit, resetCreditCycle, getCreditConfig } from "@/lib/server/ai-usage";
import { setAiModel, AVAILABLE_MODELS } from "@/lib/server/ai-ops-config";
import { audit } from "@/lib/server/audit";
import { CONFIG_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  await requireAdminTotp(s.userId, s.sessionId);
  return s;
}

/** Set the per-cycle spend limit (USD). Admins are emailed at ~80% and at 100%. */
export async function setCreditLimitAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  const raw = String(fd.get("limitUsd") ?? "").trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid limit in USD (e.g. 20)." };
  }
  try {
    const prior = await getCreditConfig();
    await setCreditLimit(amount);
    audit({
      category: "ADMIN",
      action: "ai.credit_limit_changed",
      actorId: s.userId,
      targetType: "AiConfig",
      targetId: "credits",
      payload: { limitUsd: amount, priorLimitUsd: prior.limitUsd },
    });
    revalidatePath("/admin/ai-usage");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Set limit failed") };
  }
}

/** Start a fresh spend cycle (call right after topping up Anthropic credit).
 *  Resets "spent this cycle" to 0 and re-arms the limit alerts. */
export async function resetCreditCycleAction(): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  try {
    const prior = await getCreditConfig();
    await resetCreditCycle();
    audit({
      category: "ADMIN",
      action: "ai.credit_cycle_reset",
      actorId: s.userId,
      targetType: "AiConfig",
      targetId: "credits",
      payload: { priorCycleStartIso: prior.cycleStartIso, priorAlertedLevel: prior.alertedLevel },
    });
    revalidatePath("/admin/ai-usage");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Reset cycle failed") };
  }
}

/** Set the primary Claude model for poll generation + sentinel deep checks. */
export async function setAiModelAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  const model = String(fd.get("model") ?? "").trim();
  if (!AVAILABLE_MODELS.some((m) => m.id === model)) {
    return { ok: false, error: "Invalid model selection." };
  }
  try {
    await setAiModel(model);
    // Takes effect on the next AI call (poll generation + the per-market resolution
    // check both read the live model). No sweep to re-arm any more.
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
  } catch (err) {
    return { ok: false, error: safeError(err, "Set model failed") };
  }
}
