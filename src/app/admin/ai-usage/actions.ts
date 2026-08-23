"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import {
  setCreditLimit, startNewTopUpWindow, getCreditConfig,
  getCycleConfig, saveCycleConfig, startNextCycle, closeOpenCycleNow,
} from "@/lib/server/ai-usage";
import { parseCycleForm } from "@/lib/ai-cycle-rules";
import { setAiModel, AVAILABLE_MODELS } from "@/lib/server/ai-ops-config";
import { audit } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("ops");
}

/** Set the spend limit (USD) for the top-up window. Admins are emailed at ~80% and at 100%. */
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

/**
 * Start a fresh TOP-UP WINDOW (call right after topping up Anthropic credit).
 * Resets "spent this window" to 0 and re-arms the limit alerts.
 *
 * ⚠️ Renamed from `resetCreditCycleAction` on 2026-08-23. It never had anything to do with a
 * spend cycle, and now that spend cycles exist the old name would name the wrong thing.
 * ⛔ It does NOT touch the cycle ledger — the cycle index is monotonic for ever.
 */
export async function startTopUpWindowAction(): Promise<{ ok: boolean; error?: string }> {
  const s = await ensureAdmin();
  try {
    const prior = await getCreditConfig();
    await startNewTopUpWindow();
    audit({
      category: "ADMIN",
      action: "ai.topup_window_started",
      actorId: s.userId,
      targetType: "AiConfig",
      targetId: "credits",
      payload: { priorWindowStartIso: prior.topUpWindowStartIso, priorAlertedLevel: prior.alertedLevel },
    });
    revalidatePath("/admin/ai-usage");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Start new top-up window failed") };
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

// ---------------------------------------------------------------------------
// SPEND CYCLES
// ---------------------------------------------------------------------------

/**
 * Save the cycle settings.
 *
 * ⛔ THE SERVER IS THE AUTHORITY. The form runs the same `parseCycleForm` for convenience,
 * but nothing here trusts that it did — the value is re-parsed from the raw FormData.
 * ⛔ AND A SIZE CHANGE IS NOT RETROACTIVE. Closed cycles keep the size they were opened
 * with; the new size is stamped on the NEXT cycle opened. If it rewrote history, "cycles per
 * year" would silently change for every past year the moment Ali retuned it.
 */
export async function setCycleConfigAction(fd: FormData): Promise<{ ok: boolean; error?: string; field?: string; warnings?: string[] }> {
  const s = await ensureAdmin();
  const parsed = parseCycleForm(
    {
      sizeUsd: String(fd.get("sizeUsd") ?? ""),
      autoRoll: fd.get("autoRoll") === null ? null : String(fd.get("autoRoll")),
      targetMarginPct: String(fd.get("targetMarginPct") ?? ""),
      fxTzsPerUsd: String(fd.get("fxTzsPerUsd") ?? ""),
      fxAsOfIso: String(fd.get("fxAsOfIso") ?? ""),
      minDaysForProjection: String(fd.get("minDaysForProjection") ?? ""),
    },
    Date.now(),
  );
  if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };

  try {
    const prior = await getCycleConfig();
    await saveCycleConfig(parsed.value);
    // ⛔ THE PRIOR VALUE IS AUDITED, not just the new one. "Someone set the size to $100" is
    // not an audit trail; "someone changed it FROM $1 TO $100" is, and it is the only way to
    // read a historical cycle count correctly afterwards.
    audit({
      category: "ADMIN",
      action: "ai.cycle_config_changed",
      actorId: s.userId,
      targetType: "AiConfig",
      targetId: "cycles",
      payload: {
        sizeUsd: parsed.value.sizeUsd, priorSizeUsd: prior.sizeUsd,
        autoRoll: parsed.value.autoRoll, priorAutoRoll: prior.autoRoll,
        targetMarginPct: parsed.value.targetMarginPct, priorTargetMarginPct: prior.targetMarginPct,
        fxTzsPerUsd: parsed.value.fxTzsPerUsd, priorFxTzsPerUsd: prior.fxTzsPerUsd,
        fxAsOfIso: parsed.value.fxAsOfIso, priorFxAsOfIso: prior.fxAsOfIso,
        minDaysForProjection: parsed.value.minDaysForProjection, priorMinDaysForProjection: prior.minDaysForProjection,
      },
    });
    revalidatePath("/admin/ai-usage");
    return { ok: true, warnings: parsed.warnings };
  } catch (err) {
    return { ok: false, error: safeError(err, "Save cycle settings failed") };
  }
}

/**
 * START THE NEXT CYCLE — the control that un-pauses the AI after a cycle has ended.
 * This is the deliberate checkpoint Ali asked for: a $1,000 top-up becomes ten $100
 * decisions, and each one is audited with who made it.
 */
export async function startNextCycleAction(fd: FormData): Promise<{ ok: boolean; error?: string; index?: number }> {
  const s = await ensureAdmin();
  const note = String(fd.get("note") ?? "").trim().slice(0, 240) || null;
  try {
    const opened = await startNextCycle(s.userId, note);
    if (!opened) {
      return { ok: false, error: "A cycle is already open — there is nothing to start. Reload the page to see the current one." };
    }
    audit({
      category: "ADMIN",
      action: "ai.cycle_opened",
      actorId: s.userId,
      targetType: "AiSpendCycle",
      targetId: String(opened.index),
      payload: { index: opened.index, sizeUsd: opened.sizeUsd, priceRev: opened.priceRev, note },
    });
    revalidatePath("/admin/ai-usage");
    return { ok: true, index: opened.index };
  } catch (err) {
    return { ok: false, error: safeError(err, "Start cycle failed") };
  }
}

/**
 * CLOSE THE OPEN CYCLE EARLY, before it has spent its full size.
 * ⛔ Deliberately does NOT open the successor — closing is "stop here", and starting the next
 * one stays a separate, explicit decision. Closing therefore PAUSES the AI.
 */
export async function closeCycleNowAction(fd: FormData): Promise<{ ok: boolean; error?: string; index?: number }> {
  const s = await ensureAdmin();
  const note = String(fd.get("note") ?? "").trim().slice(0, 240) || null;
  try {
    const closed = await closeOpenCycleNow(s.userId, note);
    if (!closed) return { ok: false, error: "No cycle is open, so there is nothing to close." };
    // `closeOpenCycleNow` writes the `ai.cycle_closed_early` audit itself, with the duration.
    revalidatePath("/admin/ai-usage");
    return { ok: true, index: closed.index };
  } catch (err) {
    return { ok: false, error: safeError(err, "Close cycle failed") };
  }
}
