"use server";

/**
 * /admin/maswali/integrity — COMPLIANCE's acts on Millionea (MASWALI-BUILD S4; MR-18, MB-62, MB-78, MB-43, OD-07).
 *
 *   · voidMaswaliWeek — refund a week whose whole-week void is certain on its sealed record, once its window closed;
 *   · pauseMaswaliSales / resumeMaswaliSales — stop and restart SALES only (never a cancel, a settlement or a refund);
 *   · holdMaswaliShare / releaseMaswaliShare / forfeitMaswaliShare — Compliance decides a winning share under review.
 * Three acts are kept apart on purpose (MB-78): the pause (sales only), the week void (refund, carry untouched) and the
 * product stop (the Owner's sunset, on the pools page).
 */
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { voidWeek } from "@/lib/server/maswali-service";
import { pauseMaswaliSales, resumeMaswaliSales } from "@/lib/server/maswali-pause";
import { forfeitMaswaliShare, holdMaswaliShare, releaseMaswaliShare } from "@/lib/server/maswali-settlement";
import { noteMaswaliPoolChanged } from "@/lib/server/maswali-pool-feed";

type ActionResult = { ok: true; note?: string } | { ok: false; error: string };

const refresh = () => {
  revalidatePath("/admin/maswali");
  revalidatePath("/admin/maswali/pools");
  revalidatePath("/admin/maswali/integrity");
  // MASWALI-BUILD S5 · a week void reaches the register and the hub; a pause reaches the hub (MB-97).
  revalidatePath("/millionea", "layout");
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function voidMaswaliWeekAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.voidMaswaliWeek, "voidMaswaliWeek");
  try {
    const r = await voidWeek({ weekId: str(formData, "weekId"), actorId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, note: `Week ${r.week.code} is voided; every ticket is refunded in full.` };
  } catch (err) {
    return { ok: false, error: safeError(err, "The week could not be voided") };
  } finally {
    // R1 · the void stamps the week VOIDED before its refunds, so a refusal or an error can still leave it changed (VOIDED,
    // its refunds owed and alerted): the console is re-read on every outcome.
    refresh();
  }
}

export async function pauseMaswaliSalesAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.pauseMaswaliSales, "pauseMaswaliSales");
  try {
    const r = await pauseMaswaliSales({ officerId: session.userId, reason: str(formData, "reason") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Sales could not be paused") };
  }
}

export async function resumeMaswaliSalesAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.resumeMaswaliSales, "resumeMaswaliSales");
  try {
    const r = await resumeMaswaliSales({ officerId: session.userId, note: str(formData, "note") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Sales could not be resumed") };
  }
}

export async function holdMaswaliShareAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.holdMaswaliShare, "holdMaswaliShare");
  try {
    const r = await holdMaswaliShare({ ticketId: str(formData, "ticketId"), officerId: session.userId, reason: str(formData, "reason") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The share could not be held") };
  }
}

export async function releaseMaswaliShareAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.releaseMaswaliShare, "releaseMaswaliShare");
  try {
    const r = await releaseMaswaliShare({ ticketId: str(formData, "ticketId"), officerId: session.userId, note: str(formData, "note") });
    if (!r.ok) return { ok: false, error: r.error };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The share could not be released") };
  }
}

export async function forfeitMaswaliShareAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.forfeitMaswaliShare, "forfeitMaswaliShare");
  try {
    const r = await forfeitMaswaliShare({ ticketId: str(formData, "ticketId"), officerId: session.userId, typed: str(formData, "typed"), reason: str(formData, "reason") });
    if (!r.ok) return { ok: false, error: r.error };
    // The share went back to the jackpot, so a week still waiting to claim its carry counts more (OD-07).
    noteMaswaliPoolChanged();
    refresh();
    return { ok: true, note: "The share went back to the jackpot." };
  } catch (err) {
    return { ok: false, error: safeError(err, "The share could not be forfeited") };
  }
}
