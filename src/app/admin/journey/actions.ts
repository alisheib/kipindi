"use server";

/**
 * /admin/journey — the Owner's three acts on the new journey (the Vodacom plan S1): the rollout cap, and the
 * preview links (create, revoke). Every one of them is `runJourneyCeremony` (`simple-journey-ceremony.ts`).
 *
 * ⛔ THE GATE IS IN THE CEREMONY'S OWN PATH (ruling 523: a server action is a POST to whatever URL the browser
 * is on, so no layout or path rule can see it), and it decides on STORED rows: the FIRST thing the ceremony does
 * with the session's user id is read that user's stored role, and anything but the Owner is refused (and
 * recorded as `privilege_escalation_blocked`). The console's two-step status is resolved HERE, without
 * redirecting, because the ceremony answers every refusal in words — exactly `setInvitePayableAction`'s shape.
 *
 * ⛔ EACH ACTION BUILDS ITS OWN `op`. The page never posts one: the rollout action can only ever ask for a CAP,
 * the link actions only for their own act, whatever a crafted POST carries.
 *
 * ⛔ A REFUSAL IS NOT A REVALIDATION. Only a change that LANDED invalidates the page; a refused ceremony must
 * not wipe the reason the Owner has just typed. The revalidation sits in its own try — a throw there, after the
 * act landed, must not report the opposite of the truth.
 */
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { checkAdminTotp, type AdminTotpStatus } from "@/lib/server/admin-guard";
import { safeError } from "@/lib/server/safe-error";
import {
  runJourneyCeremony,
  type JourneyCeremonyInput,
  type JourneyCeremonyResult,
} from "@/lib/server/simple-journey-ceremony";

/** What the page posts — untrusted, field by field. The ceremony checks every field; these only carry them. */
type Posted = Record<string, unknown>;
const posted = (input: unknown): Posted => (input && typeof input === "object" ? (input as Posted) : {});

/**
 * ⭐ SET THE OWNER'S CAP ON THE ROLLOUT — Stop (WITHDRAWN), Resume (ACTIVE: no cap), or players back to the old
 * journey with previews continuing (STAFF_PREVIEW). Never throws: every outcome is the ceremony's union.
 */
export async function setJourneyRolloutAction(input: { to: string; reason: string; expectSeq: number }): Promise<JourneyCeremonyResult> {
  let result: JourneyCeremonyResult;
  try {
    const session = await currentSession();
    const totp: AdminTotpStatus = session ? await checkAdminTotp(session.userId, session.sessionId) : "unverified";
    const p = posted(input);
    result = await runJourneyCeremony(
      session?.userId ?? null,
      { op: "CAP", to: p.to, reason: p.reason, expectSeq: p.expectSeq } as unknown as JourneyCeremonyInput,
      { totp },
    );
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing changed. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try { revalidatePath("/admin/journey"); } catch { /* the switch moved; a stale page is the smaller harm */ }
  }
  return result;
}

/**
 * ⭐ CREATE A PREVIEW LINK — a signed 7-day link for someone outside 50pick. The new link's URL comes back in
 * `result.link.url`, once, for the Owner to copy. Never throws.
 */
export async function createJourneyPreviewLinkAction(input: { label: string; reason: string; expectSeq: number }): Promise<JourneyCeremonyResult> {
  let result: JourneyCeremonyResult;
  try {
    const session = await currentSession();
    const totp: AdminTotpStatus = session ? await checkAdminTotp(session.userId, session.sessionId) : "unverified";
    const p = posted(input);
    result = await runJourneyCeremony(
      session?.userId ?? null,
      { op: "ISSUE_LINK", label: p.label, reason: p.reason, expectSeq: p.expectSeq } as unknown as JourneyCeremonyInput,
      { totp },
    );
  } catch (err) {
    return { ok: false, error: safeError(err, "No link was created. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try { revalidatePath("/admin/journey"); } catch { /* the link exists; a stale page is the smaller harm */ }
  }
  return result;
}

/**
 * ⭐ REVOKE A PREVIEW LINK — the link, and every preview opened from it, stop counting within 10 seconds.
 * Never throws.
 */
export async function revokeJourneyPreviewLinkAction(input: { linkId: string; reason: string; expectSeq: number }): Promise<JourneyCeremonyResult> {
  let result: JourneyCeremonyResult;
  try {
    const session = await currentSession();
    const totp: AdminTotpStatus = session ? await checkAdminTotp(session.userId, session.sessionId) : "unverified";
    const p = posted(input);
    result = await runJourneyCeremony(
      session?.userId ?? null,
      { op: "REVOKE_LINK", linkId: p.linkId, reason: p.reason, expectSeq: p.expectSeq } as unknown as JourneyCeremonyInput,
      { totp },
    );
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing changed. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try { revalidatePath("/admin/journey"); } catch { /* the link stopped; a stale page is the smaller harm */ }
  }
  return result;
}
