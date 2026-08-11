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
import { createHash } from "node:crypto";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { twoOfficerGate } from "@/lib/server/two-officer";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { getReportPack, packIdFor, currentPackPeriod } from "@/lib/server/report-pack";
import { buildGbtMonthly } from "@/lib/server/reports/catalogue";
import { renderPdf } from "@/lib/server/reports/pdf";

type ActionResult = { ok: true } | { ok: false; error: string };

// ⛔ ONE GATE, NOT A COPY (finding A2). ⚠️ This copy did not take step-up 2FA *inside* the
// helper — each of the four actions below called `requireAdminTotp` itself, immediately
// after gating, so the protection was present and merely placed differently. Now that
// `softRequireStaff` takes it, those call-site calls are redundant and have been removed;
// the second factor is taken exactly once, in the same place as every other admin gate.
async function requireSigningOfficer(): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const g = await softRequireStaff("accounting", "report-pack",
    "Forbidden: a report-pack signing officer (accounting access) is required.");
  return g.ok ? { userId: g.userId, sessionId: g.sessionId } : { error: g.error };
}

/** Prepare — the maker generates the pack, hashes the rendered PDF, and signs. */
export async function prepareReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };

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

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const pack = await getReportPack(period);
  if (pack.state !== "prepared") return { ok: false, error: `Pack must be Prepared before approval (currently ${pack.state}).` };
  const conflict = twoOfficerGate({
    makerId: pack.preparedBy,
    checkerId: gate.userId,
    reason: "you prepared this pack and cannot approve your own work.",
    audit: { action: "pack.approve.conflict_blocked", targetType: "ReportPack", targetId: packIdFor(period) },
  });
  if (conflict) return { ok: false, error: conflict.error };
  audit({ category: "ADMIN", action: "pack.approved", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { period, preparedBy: pack.preparedBy } });
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Submit — file the pack with the regulator. Requires both signatures. */
export async function submitReportPack(formData: FormData): Promise<ActionResult> {
  const gate = await requireSigningOfficer();
  if ("error" in gate) return { ok: false, error: gate.error };

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

  const period = String(formData.get("period") ?? "") || currentPackPeriod();
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 120) || null;
  const pack = await getReportPack(period);
  if (pack.state !== "submitted") return { ok: false, error: `Pack must be Submitted before it can be acknowledged (currently ${pack.state}).` };
  audit({ category: "ADMIN", action: "pack.acknowledged", actorId: gate.userId, targetType: "ReportPack", targetId: packIdFor(period), payload: { period, reference } });
  revalidatePath("/admin/reports");
  return { ok: true };
}
