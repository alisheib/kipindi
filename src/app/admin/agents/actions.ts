"use server";

/**
 * /admin/agents — the compliance officer's actions. Every rule lives in
 * `agent-application-service.ts`; this layer gates (compliance domain + step-up 2FA, ONE
 * gate — `softRequireStaff`, never a copy), shapes the result for the overlay, and
 * revalidates. ⛔ No decision is made here.
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import type { AgentDocType, AgentRejectReason } from "@/lib/server/store";
import {
  approveAgent, rejectApplication, requestMoreInfo, reconcileFee, waiveFee, recordFeeRefund,
  setAgentRate, deactivateAgent, reactivateAgent, revokeAgent, settlePayable,
  issueInvitation, revokeInvitation, ALL_DOC_SLOTS,
} from "@/lib/server/agent-application-service";
import { setAgentConfig, type AgentConfig } from "@/lib/server/agent-config";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string; field?: string };

async function gate(action: string): Promise<{ userId: string } | { error: string }> {
  const g = await softRequireStaff("compliance", action, "Forbidden: compliance access is required.");
  return g.ok ? { userId: g.userId } : { error: g.error };
}
const revalidate = (id?: string) => { revalidatePath("/admin/agents"); if (id) revalidatePath(`/admin/agents/${id}`); };

export async function approveAgentAction(formData: FormData): Promise<Result<{ agentCode: string; commissionPct: number }>> {
  const g = await gate("approveAgent"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const pct = Number(formData.get("commissionPct"));
  if (!Number.isFinite(pct)) return fieldError("commissionPct", "Enter a commission rate.");
  const r = await approveAgent(g.userId, id, { commissionPct: pct });
  if (!r.ok) return { ok: false, error: r.error, field: /rate/i.test(r.error) ? "commissionPct" : undefined };
  revalidate(id);
  return { ok: true, data: r.data };
}

export async function rejectApplicationAction(formData: FormData): Promise<Result> {
  const g = await gate("rejectApplication"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const reason = String(formData.get("reason") ?? "") as AgentRejectReason;
  const r = await rejectApplication(g.userId, id, { reason, note: String(formData.get("note") ?? "") });
  if (!r.ok) return { ok: false, error: r.error, field: /reason/i.test(r.error) ? "note" : undefined };
  revalidate(id);
  return { ok: true };
}

export async function requestMoreInfoAction(formData: FormData): Promise<Result> {
  const g = await gate("requestMoreInfo"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const slots = formData.getAll("slots").map(String).filter((s): s is AgentDocType => (ALL_DOC_SLOTS as readonly string[]).includes(s));
  const r = await requestMoreInfo(g.userId, id, { note: String(formData.get("note") ?? ""), slots });
  if (!r.ok) return { ok: false, error: r.error, field: "note" };
  revalidate(id);
  return { ok: true };
}

export async function reconcileFeeAction(formData: FormData): Promise<Result> {
  const g = await gate("reconcileFee"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const r = await reconcileFee(g.userId, id, {
    attestedTzs: Number(formData.get("attestedTzs")),
    statementRef: String(formData.get("statementRef") ?? ""),
    sourceAccountMasked: String(formData.get("sourceAccount") ?? ""),
  });
  if (!r.ok) return { ok: false, error: r.error, field: /statement/i.test(r.error) ? "statementRef" : /reads/i.test(r.error) ? "attestedTzs" : undefined };
  revalidate(id);
  return { ok: true };
}

export async function waiveFeeAction(formData: FormData): Promise<Result> {
  const g = await gate("waiveFee"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const r = await waiveFee(g.userId, id, String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "waiveReason" };
  revalidate(id);
  return { ok: true };
}

export async function recordFeeRefundAction(formData: FormData): Promise<Result> {
  const g = await gate("recordFeeRefund"); if ("error" in g) return { ok: false, error: g.error };
  const id = String(formData.get("applicationId") ?? "");
  const r = await recordFeeRefund(g.userId, id, { reference: String(formData.get("reference") ?? ""), amountTzs: Number(formData.get("amountTzs")) });
  if (!r.ok) return { ok: false, error: r.error, field: /reference/i.test(r.error) ? "refundReference" : "refundAmount" };
  revalidate(id);
  return { ok: true };
}

export async function setAgentRateAction(formData: FormData): Promise<Result> {
  const g = await gate("setAgentRate"); if ("error" in g) return { ok: false, error: g.error };
  const userId = String(formData.get("userId") ?? "");
  const r = await setAgentRate(g.userId, userId, Number(formData.get("commissionPct")), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: /rate/i.test(r.error) ? "commissionPct" : "reason" };
  revalidate();
  return { ok: true };
}

export async function deactivateAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("deactivateAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await deactivateAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate();
  return { ok: true };
}

export async function reactivateAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("reactivateAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await reactivateAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate();
  return { ok: true };
}

export async function revokeAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("revokeAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await revokeAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate();
  return { ok: true };
}

export async function settlePayableAction(formData: FormData): Promise<Result> {
  const g = await gate("settlePayable"); if ("error" in g) return { ok: false, error: g.error };
  const r = await settlePayable(g.userId, String(formData.get("rewardId") ?? ""), String(formData.get("reference") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reference" };
  revalidate();
  return { ok: true };
}

export async function issueInvitationAction(formData: FormData): Promise<Result<{ link: string; expiresAt: string }>> {
  const g = await gate("issueInvitation"); if ("error" in g) return { ok: false, error: g.error };
  const r = await issueInvitation(g.userId, { phoneE164: String(formData.get("phone") ?? ""), displayName: String(formData.get("displayName") ?? "") });
  if (!r.ok) return { ok: false, error: r.error, field: "phone" };
  revalidate();
  return { ok: true, data: { link: r.data!.link, expiresAt: r.data!.expiresAt } };
}

export async function revokeInvitationAction(formData: FormData): Promise<Result> {
  const g = await gate("revokeInvitation"); if ("error" in g) return { ok: false, error: g.error };
  const r = await revokeInvitation(g.userId, String(formData.get("invitationId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error };
  revalidate();
  return { ok: true };
}

/** The Settings tab. Every field is validated by `agent-config`'s own `validate()` — the
 *  ceiling rule included — so this action cannot write past the rule. */
export async function saveAgentConfigAction(formData: FormData): Promise<Result> {
  const g = await gate("saveAgentConfig"); if ("error" in g) return { ok: false, error: g.error };
  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(/[^0-9.]/g, ""));
  const updates: Partial<AgentConfig> = {
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
    defaultCommissionPct: num("defaultCommissionPct"),
    maxCommissionPct: num("maxCommissionPct"),
    registrationFeeTzs: num("registrationFeeTzs"),
    feeVatTreatment: String(formData.get("feeVatTreatment") ?? "INCLUSIVE") === "EXCLUSIVE" ? "EXCLUSIVE" : "INCLUSIVE",
    feeVatRatePct: num("feeVatRatePct"),
    feeDestinationName: String(formData.get("feeDestinationName") ?? "").trim().slice(0, 80),
    feeDestinationAccount: String(formData.get("feeDestinationAccount") ?? "").trim().slice(0, 40),
    commissionWindowMonths: num("commissionWindowMonths"),
    capPerRecruitTzs: num("capPerRecruitTzs"),
    invitationExpiryDays: num("invitationExpiryDays"),
    draftExpiryDays: num("draftExpiryDays"),
    refundDeadlineDays: num("refundDeadlineDays"),
    reapplyCooldownDays: num("reapplyCooldownDays"),
    reviewSlaDays: num("reviewSlaDays"),
  };
  const r = setAgentConfig(updates, g.userId);
  if (!r.ok) return { ok: false, error: r.error, field: /maximum|ceiling/i.test(r.error) ? "maxCommissionPct" : /default/i.test(r.error) ? "defaultCommissionPct" : undefined };
  revalidate();
  revalidatePath("/agent");
  return { ok: true };
}
