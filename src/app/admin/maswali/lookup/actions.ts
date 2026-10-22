"use server";

/**
 * /admin/maswali/lookup — the support desk's ONE read on Millionea (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 9, MB-64).
 *
 * ⛔ A READ, NOT A CONTROL. It changes nothing, so it is in no control table. Its gate is the page's own: whoever may VIEW
 *    `/admin/maswali/lookup` — the support domain: the desk, Compliance and the Owner, by default — decided on the STORED
 *    role with the console's second factor (`softRequireConsole`). A role that cannot open the page is refused, and the
 *    attempt is recorded as every action guard records one.
 * ⭐ The lookup records itself (`lookupMaswaliTicketForDesk`), found or not, before it answers — and answers nothing when
 *    that record could not be written.
 */
import { softRequireConsole } from "@/lib/server/rbac-guard";
import { canView } from "@/lib/server/rbac";
import { domainForPath } from "@/lib/server/roles";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { lookupMaswaliTicketForDesk, type DeskLookup } from "@/lib/server/maswali-support";

/** The page this read belongs to; its domain is the read's audience. */
const LOOKUP_PAGE = "/admin/maswali/lookup";
const REFUSED = "Your role cannot look up a Millionea ticket.";

export async function lookupMaswaliTicketAction(formData: FormData): Promise<DeskLookup> {
  const guard = await softRequireConsole("lookupMaswaliTicket", REFUSED);
  if (!guard.ok) return { ok: false, error: guard.error };
  if (guard.role !== "ADMIN" && !(await canView(guard.role, domainForPath(LOOKUP_PAGE)))) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: guard.userId,
      targetType: "Action",
      targetId: "lookupMaswaliTicket",
      payload: { role: guard.role, domain: domainForPath(LOOKUP_PAGE), action: "lookupMaswaliTicket" },
    });
    return { ok: false, error: REFUSED };
  }
  try {
    return await lookupMaswaliTicketForDesk({ serial: formData.get("serial"), phone: formData.get("phone"), officerId: guard.userId });
  } catch (err) {
    return { ok: false, error: safeError(err, "The ticket could not be looked up") };
  }
}
