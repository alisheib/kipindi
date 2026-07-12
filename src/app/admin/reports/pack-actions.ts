"use server";

/**
 * ADM1 — Regulator report-pack maker-checker actions.
 *
 * Each transition is guarded and appended to the immutable audit trail
 * (category ADMIN, action `pack.*`, targetId = packId). The two-officer rule is
 * enforced server-side: `approve` requires a prior `prepare` by a DIFFERENT
 * officer, and every step requires the correct prior state. No signature is
 * fabricated — the actor is always the authenticated officer.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { getReportPack, packIdFor, currentPackPeriod } from "@/lib/server/report-pack";
import { buildGbtMonthly } from "@/lib/server/reports/catalogue";
import { renderPdf } from "@/lib/server/reports/pdf";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireSigningOfficer(): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({ category: "SECURITY", action: "privilege_escalation_blocked", actorId: session.userId, targetType: "Action", targetId: "report-pack", payload: { role: user?.role ?? "unknown" } });
    return { error: "Forbidden: a compliance-signing officer (ADMIN or COMPLIANCE) is required." };
  }
  return { userId: session.userId, sessionId: session.sessionId };
}

/** Prepare — the maker generates the pack, hashes the rendered PDF, and signs. */
export async function prepareReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };
  await requireAdminTotp(gate.userId, gate.sessionId);

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const pack = await getReportPack(period);
  if (pack.state !== "draft") return { ok: false, error: `Pack is already ${pack.state}. Prepare is only valid from Draft.` };

  // Real artifact: render the actual monthly PDF and hash its bytes.
  let sha256 = "", sizeBytes = 0, reference = "";
  try {
    const report = await buildGbtMonthly(gate.userId, period);
    reference = report.reference;
    const buf = await renderPdf(report);
    sizeBytes = buf.length;
    sha256 = createHash("sha256").update(buf as unknown as Uint8Array).digest("hex");
  } catch (e) {
    return { ok: false, error: `Could not render the pack artifact: ${String((e as Error)?.message ?? e)}` };
  }

  audit({
    category: "ADMIN",
    action: "pack.prepared",
    actorId: gate.userId,
    targetType: "ReportPack",
    targetId: packIdFor(period),
    payload: { period, filename: `GB-${period}.pdf`, sizeBytes, sha256, reference },
  });
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Approve — the checker countersigns; MUST be a different officer than the maker. */
export async function approveReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };
  await requireAdminTotp(gate.userId, gate.sessionId);

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const pack = await getReportPack(period);
  if (pack.state !== "prepared") return { ok: false, error: `Pack must be Prepared before approval (currently ${pack.state}).` };
  if (pack.preparedBy === gate.userId) {
    audit({ category: "COMPLIANCE", action: "pack.approve.conflict_blocked", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { reason: "self-approval" } });
    return { ok: false, error: `${CEREMONY.secondOfficerRequired.en} — you prepared this pack and cannot approve your own work.` };
  }
  audit({ category: "ADMIN", action: "pack.approved", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { period, preparedBy: pack.preparedBy } });
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Submit — file the pack with the regulator. Requires both signatures. */
export async function submitReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };
  await requireAdminTotp(gate.userId, gate.sessionId);

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const pack = await getReportPack(period);
  if (pack.state !== "approved") return { ok: false, error: `Pack must be Approved by a second officer before submission (currently ${pack.state}).` };
  audit({ category: "ADMIN", action: "pack.submitted", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { period, artifactSha256: pack.artifact?.sha256 ?? null } });
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Acknowledge — record the regulator's receipt reference (external ack). */
export async function acknowledgeReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };
  await requireAdminTotp(gate.userId, gate.sessionId);

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 120) || null;
  const pack = await getReportPack(period);
  if (pack.state !== "submitted") return { ok: false, error: `Pack must be Submitted before it can be acknowledged (currently ${pack.state}).` };
  audit({ category: "ADMIN", action: "pack.acknowledged", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { period, reference } });
  revalidatePath("/admin/reports");
  return { ok: true };
}
