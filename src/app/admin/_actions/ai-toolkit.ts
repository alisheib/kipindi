"use server";

/**
 * AI toolkit — the server actions behind the single admin dropdown that owns every
 * AI switch. ONE gate, ONE place. Each control lives in exactly one module; these
 * actions are the audited write path the dropdown calls.
 *
 *   setChatbotEnabledAction     → ai-controls.setChatbotEnabled
 *   setPollGenEnabledAction      → ai-controls.setPollGenEnabled
 *   setResolutionAiPausedAction  → market-sentinel.setResolutionAiPaused
 *   setAutoResolveAction         → market-config global resolutionMode (human|auto)
 *
 * Enabling auto-resolve overrides the two-officer / POCA §16 rule, so it carries a
 * COMPLIANCE breadcrumb; the others are ordinary ADMIN operations. All gated to
 * ADMIN/COMPLIANCE + 2FA.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { moneyMode } from "@/lib/server/runtime-mode";

async function gate(action: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({
      category: "SECURITY", action: "privilege_escalation_blocked",
      actorId: session.userId, targetType: "Action", targetId: action,
      payload: { role: user?.role ?? "unknown" },
    });
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return { ok: true, userId: session.userId };
}

function boolField(fd: FormData, name: string): boolean {
  return String(fd.get(name) ?? "") === "true";
}

/** Refresh every admin surface that reflects an AI switch (the top-bar toolkit is
 *  on all of them; the resolver queue reads the mode too). */
function revalidateAdmin(): void {
  revalidatePath("/admin/resolver-queue");
  revalidatePath("/admin", "layout");
}

export async function setChatbotEnabledAction(fd: FormData): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {
  const g = await gate("setChatbotEnabled");
  if (!g.ok) return { ok: false, error: g.error };
  const enabled = boolField(fd, "enabled");
  try {
    const { setChatbotEnabled } = await import("@/lib/server/ai-controls");
    await setChatbotEnabled(enabled, g.userId);
    revalidateAdmin();
    revalidatePath("/", "layout"); // the chat widget lives in the root layout
    return { ok: true, enabled };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change chatbot state") };
  }
}

export async function setPollGenEnabledAction(fd: FormData): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {
  const g = await gate("setPollGenEnabled");
  if (!g.ok) return { ok: false, error: g.error };
  const enabled = boolField(fd, "enabled");
  try {
    const { setPollGenEnabled } = await import("@/lib/server/ai-controls");
    await setPollGenEnabled(enabled, g.userId);
    revalidateAdmin();
    revalidatePath("/admin/ai-polls");
    return { ok: true, enabled };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change poll-generation state") };
  }
}

export async function setResolutionAiPausedAction(fd: FormData): Promise<{ ok: true; paused: boolean } | { ok: false; error: string }> {
  const g = await gate("setResolutionAiPaused");
  if (!g.ok) return { ok: false, error: g.error };
  const paused = boolField(fd, "paused");
  try {
    const { setResolutionAiPaused } = await import("@/lib/server/market-sentinel");
    await setResolutionAiPaused(paused, g.userId);
    revalidateAdmin();
    return { ok: true, paused };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change AI resolution state") };
  }
}

export async function setAutoResolveAction(fd: FormData): Promise<{ ok: true; mode: "human" | "auto" } | { ok: false; error: string }> {
  const g = await gate("setAutoResolve");
  if (!g.ok) return { ok: false, error: g.error };
  const mode: "human" | "auto" = boolField(fd, "auto") ? "auto" : "human";
  try {
    const { setGlobalConfig, getGlobalConfig } = await import("@/lib/server/market-config");
    const before = (await getGlobalConfig()).resolutionMode;
    const r = await setGlobalConfig({ resolutionMode: mode }, g.userId);
    if (!r.ok) return { ok: false, error: r.error };
    // The two-officer rule is a licensing control — its bypass is never silent.
    audit({
      category: "COMPLIANCE",
      action: mode === "auto" ? "market.resolution_mode.auto_enabled" : "market.resolution_mode.human_restored",
      actorId: g.userId, targetType: "MarketConfig", targetId: "global",
      payload: {
        from: before, to: mode, mode: moneyMode(), confidenceThreshold: r.config.resolveConfidenceThreshold,
        note: mode === "auto"
          ? "AUTO resolution enabled from the AI toolkit: at a market's resolve date the AI may seal + hand to the settle timer WITHOUT the two-officer ceremony when confidence clears the threshold. Overrides POCA §16 — docs/COMPLIANCE-DECISIONS.md. Low-confidence/UNKNOWN still falls back to human."
          : "HUMAN resolution restored — every market sealed by the two-officer ceremony; the AI only recommends.",
      },
    });
    revalidateAdmin();
    return { ok: true, mode };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change auto-resolve state") };
  }
}
