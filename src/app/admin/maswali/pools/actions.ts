"use server";

/**
 * /admin/maswali/pools — ACCOUNTING's release, and the OWNER's ceremonies (MASWALI-BUILD S4; OD-06, MB-03, OD-01, OD-03).
 *
 *   · releaseMaswaliSettlement (accounting) — pays a prepared week, only at the figures the officer read (`digest`);
 *   · fund / return the guarantee, the sunset, the licence basis, the rollout switch (ops: the Owner alone).
 * Each names its control and takes its domain from `CONTROL_DOMAIN`; `requireStaff` checks the stored role, records a
 * blocked attempt, then the 2FA step-up — which is the Owner ceremonies' re-check (there is no separate password step on
 * the platform; recorded as S4's finding in MASWALI-PLAN §7b "S4 · as built").
 */
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { settleMaswaliWeek } from "@/lib/server/maswali-settlement";
import { fundMaswaliGuarantee, returnMaswaliGuarantee } from "@/lib/server/maswali-money-service";
import { sunsetMaswali } from "@/lib/server/maswali-service";
import { recordLicenceBasis, type LicenceBasisKind } from "@/lib/server/maswali-licence";
import { runMillioneaRolloutCeremony } from "@/lib/server/millionea-ceremony";

type ActionResult = { ok: true; note?: string } | { ok: false; error: string; field?: string };

const refresh = () => {
  revalidatePath("/admin/maswali");
  revalidatePath("/admin/maswali/pools");
  revalidatePath("/admin/maswali/integrity");
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const whole = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(/[,\s]/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
};

export async function releaseMaswaliSettlementAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.releaseMaswaliSettlement, "releaseMaswaliSettlement");
  try {
    const r = await settleMaswaliWeek({ weekId: str(formData, "weekId"), releasedBy: session.userId, digest: str(formData, "digest") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true, note: r.already ? "That week was already settled; nothing was paid twice." : undefined };
  } catch (err) {
    return { ok: false, error: safeError(err, "The settlement could not be released") };
  }
}

export async function fundMaswaliGuaranteeAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.fundMaswaliGuarantee, "fundMaswaliGuarantee");
  try {
    const amount = whole(formData, "amount");
    if (amount === null) return { ok: false, error: "The amount is a whole number of shillings.", field: "amount" };
    const r = await fundMaswaliGuarantee({ amount, reference: str(formData, "reference"), typed: str(formData, "typed"), ownerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true, note: `The guarantee now holds TZS ${r.balance.toLocaleString("en")}.` };
  } catch (err) {
    return { ok: false, error: safeError(err, "The guarantee could not be funded") };
  }
}

export async function returnMaswaliGuaranteeAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.returnMaswaliGuarantee, "returnMaswaliGuarantee");
  try {
    const amount = whole(formData, "amount");
    if (amount === null) return { ok: false, error: "The amount is a whole number of shillings.", field: "amount" };
    const r = await returnMaswaliGuarantee({ amount, reference: str(formData, "reference"), typed: str(formData, "typed"), ownerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true, note: `The guarantee now holds TZS ${r.balance.toLocaleString("en")}.` };
  } catch (err) {
    return { ok: false, error: safeError(err, "The guarantee money could not be returned") };
  }
}

export async function sunsetMaswaliAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.sunsetMaswali, "sunsetMaswali");
  try {
    const r = await sunsetMaswali({ weekId: str(formData, "weekId"), ownerId: session.userId, typed: str(formData, "typed"), reason: str(formData, "reason") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true, note: `Week ${r.week.code} is the final week.` };
  } catch (err) {
    return { ok: false, error: safeError(err, "The final week could not be set") };
  }
}

export async function setMaswaliLicenceBasisAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.setMaswaliLicenceBasis, "setMaswaliLicenceBasis");
  try {
    const kind = str(formData, "kind") as LicenceBasisKind;
    const r = await recordLicenceBasis({ kind, ref: str(formData, "ref") || null }, session.userId);
    if (!r.ok) return { ok: false, error: r.error, field: "ref" };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The licence basis could not be recorded") };
  }
}

export async function setMillioneaRolloutAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.setMillioneaRollout, "setMillioneaRollout");
  try {
    const r = await runMillioneaRolloutCeremony({
      ownerId: session.userId, cap: str(formData, "cap"), reason: str(formData, "reason"), expectSeq: Number(str(formData, "expectSeq")),
    });
    if (!r.ok) return { ok: false, error: r.error, field: r.field };
    refresh();
    return { ok: true, note: `Millionea is now ${r.state}.` };
  } catch (err) {
    return { ok: false, error: safeError(err, "The rollout could not be changed") };
  }
}
