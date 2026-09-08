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
import { setLipaConfig, type LipaConfig } from "@/lib/server/lipa-config";

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
  // ⭐ THE DETAIL PATH TOO. These four actions are taken FROM the workstation, and they
  // revalidated only the queue — so the page the officer is standing on kept its cached
  // render and a colleague opening it saw the old rate. The rail's `router.refresh()` hid
  // this from whoever clicked, and from nobody else.
  revalidate(String(formData.get("applicationId") ?? "") || undefined);
  return { ok: true };
}

export async function deactivateAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("deactivateAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await deactivateAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate(String(formData.get("applicationId") ?? "") || undefined);
  return { ok: true };
}

export async function reactivateAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("reactivateAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await reactivateAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate(String(formData.get("applicationId") ?? "") || undefined);
  return { ok: true };
}

export async function revokeAgentAction(formData: FormData): Promise<Result> {
  const g = await gate("revokeAgent"); if ("error" in g) return { ok: false, error: g.error };
  const r = await revokeAgent(g.userId, String(formData.get("userId") ?? ""), String(formData.get("reason") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reason" };
  revalidate(String(formData.get("applicationId") ?? "") || undefined);
  return { ok: true };
}

export async function settlePayableAction(formData: FormData): Promise<Result> {
  const g = await gate("settlePayable"); if ("error" in g) return { ok: false, error: g.error };
  const r = await settlePayable(g.userId, String(formData.get("rewardId") ?? ""), String(formData.get("reference") ?? ""));
  if (!r.ok) return { ok: false, error: r.error, field: "reference" };
  revalidate();
  return { ok: true };
}

export async function issueInvitationAction(formData: FormData): Promise<Result<{ link: string; expiresAt: string; delivery: string }>> {
  const g = await gate("issueInvitation"); if ("error" in g) return { ok: false, error: g.error };
  const r = await issueInvitation(g.userId, { email: String(formData.get("email") ?? ""), displayName: String(formData.get("displayName") ?? "") });
  // ⭐ THE SERVICE NAMES THE FIELD NOW, so a refusal about the address focuses the address and
  // a refusal about anything else does not. This used to hard-code `field: "phone"` on EVERY
  // refusal, including "the programme is switched off" — which pointed the officer at an
  // input that was not the problem.
  if (!r.ok) return { ok: false, error: r.error, ...(r.field ? { field: r.field } : {}) };
  revalidate();
  // ⭐ THE DELIVERY OUTCOME TRAVELS TO THE UI. `sendEmail` distinguishes `sent` from `stub`
  // (no provider configured), `suppressed` (the address hard-bounced) and `failed` — and the
  // console is about to tell an officer whether to expect the invitee to receive anything.
  return { ok: true, data: { link: r.data!.link, expiresAt: r.data!.expiresAt, delivery: r.data!.delivery } };
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

/**
 * The Lipa (Selcom merchant QR) identity.
 *
 * ⚠️ IT LIVES HERE, BESIDE THE FEE, ON PURPOSE. The QR renders only when the Lipa number
 * IS `feeDestinationAccount` (see `shouldShowLipaQr`), so the two settings are one
 * decision wearing two fields, and an officer who can change one must see the other.
 * ⛔ It shares this file's ONE `gate` rather than growing a second copy of the guard —
 * the rule this module's header states.
 *
 * ⛔ `qrAssetPath` and `qrPayload` are NOT writable from here and must not become so.
 * The image is a picture that moves money; it is replaced by re-running
 * `scripts/extract-lipa-qr.mjs` against a Selcom-issued poster, which re-verifies the
 * EMVCo CRC and the merchant id and refuses to write anything that fails. A text field
 * would let an officer paste a path to an image nobody has ever decoded.
 */
export async function saveLipaConfigAction(formData: FormData): Promise<Result> {
  const g = await gate("saveLipaConfig"); if ("error" in g) return { ok: false, error: g.error };
  const updates: Partial<LipaConfig> = {
    enabled: formData.get("lipaEnabled") === "on" || formData.get("lipaEnabled") === "true",
    merchantName: String(formData.get("lipaMerchantName") ?? "").trim().slice(0, 80),
    // Digits only — the operator may type "7006 3747" off the poster and mean the number.
    // Normalising here rather than refusing is the difference between a setting that works
    // and a support ticket about an invisible QR.
    lipaNumber: String(formData.get("lipaNumber") ?? "").replace(/\D/g, "").slice(0, 20),
    ussdCode: String(formData.get("lipaUssdCode") ?? "").trim().slice(0, 20),
  };
  const r = setLipaConfig(updates, g.userId);
  if (!r.ok) {
    return {
      ok: false,
      error: r.error,
      field: /lipa number/i.test(r.error) ? "lipaNumber"
        : /merchant name/i.test(r.error) ? "lipaMerchantName"
        : /ussd/i.test(r.error) ? "lipaUssdCode"
        : undefined,
    };
  }
  revalidate();
  // Both surfaces that render the QR are statically cached; without these an officer
  // saves, sees "Saved", and the applicant keeps seeing the old number.
  revalidatePath("/agent");
  revalidatePath("/agent/apply");
  return { ok: true };
}
