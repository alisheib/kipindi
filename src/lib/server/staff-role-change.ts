/**
 * THE ONE ROLE CHANGE BOTH OWNER-ONLY STAFF ACTIONS PASS THROUGH (`src/app/admin/staff/actions.ts`): OD-12's question,
 * the write, the session revoke, the holder hook, the COMPLIANCE row and the notice to the person.
 *
 * ⭐ MASWALI-BUILD S7-F2 · MOVED OUT OF THE "use server" FILE, for two reasons. Every export of that file is a server
 *    action any signed-in client can POST, and this function asks no Owner question of its own: the actions ask it
 *    (`requireOwner`, stored role and step-up) and refresh their pages once it lands. And here a suite drives the real
 *    write path (`test:maswali-adversarial` IN.1b), where it could only read the source before (the S7 review, round 2).
 * ⛔ The caller is the Owner's action. Nothing here may be reached from a route without that gate in front of it.
 */
import { runOutsideLock } from "./locks";
import { db } from "./store";
import { audit } from "./audit";
import { revokeUserSessions } from "./session-registry";
import { sendEmailToUser, staffRoleChangedHtml } from "./email";
import { ROLE_LABEL, type Role } from "./roles";
import type { AssignableRole } from "./staff-roles";
import { safeError } from "./safe-error";
import { millioneaPromotionBlock } from "./maswali-service";

export async function applyRoleChange(
  officerId: string,
  target: { id: string; role: string; displayName?: string | null },
  newRole: AssignableRole,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prevRole = target.role;
  try {
    // ⛔ OD-12 · an account holding a Millionea ticket in a week that has not settled is made staff only once that week
    //    settles: an insider never holds a live ticket. Asked inside the try, so a read that fails refuses the change.
    if (newRole !== "PLAYER") {
      const held = await millioneaPromotionBlock(target.id);
      if (held) return { ok: false, error: held };
    }
    await db.user.update(target.id, { role: newRole });
    // Role lives in the signed session cookie — revoke so the next request re-mints it
    // with the new role (nav/route/action gates then apply immediately).
    await revokeUserSessions(target.id);
    // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(target.id, "ROLE_CHANGED")).catch(() => {});
    });
    audit({
      category: "COMPLIANCE",
      action: "staff.role_changed",
      actorId: officerId,
      targetType: "User",
      targetId: target.id,
      payload: { prevRole, newRole, reason },
    });
    // Notify the person by email (fire-and-forget; sendEmailToUser no-ops cleanly when
    // there's no address on file, so a staffer without an email never blocks the change).
    const isStaff = newRole !== "PLAYER";
    void sendEmailToUser(target.id, (email) => ({
      to: email,
      subject: isStaff ? `Your 50pick role is now ${ROLE_LABEL[newRole as Role]}` : "Your 50pick staff access was removed",
      html: staffRoleChangedHtml({ name: target.displayName || "there", roleLabel: ROLE_LABEL[newRole as Role] ?? newRole, isStaff }),
      tag: "staff-role-change",
    }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Role change failed") };
  }
}
