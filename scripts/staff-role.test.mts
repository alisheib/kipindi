/**
 * Staff-role management — locks the /admin/staff policy: which roles are assignable,
 * the role-change validation (incl. the self-demotion block that stops the Owner
 * locking themselves out), and the consequence data shown before a change (staffRoleInfos).
 *
 * The action wrappers (setStaffRoleAction/addStaffByPhoneAction) gate via requireOwner
 * (ADMIN-only + step-up 2FA) + revokeUserSessions + a COMPLIANCE audit — those need a
 * request/session context, so they're exercised by the app; here we lock the PURE rules.
 *
 * Run: npx tsx scripts/staff-role.test.mts
 */
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  isStaffAssignable,
  validateRoleChange,
} from "../src/lib/server/staff-roles.ts";
import { staffRoleInfos, __resetGrantsForTest } from "../src/lib/server/rbac.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}`); };

// ── Assignable set ────────────────────────────────────────────────────────────
ok("ASSIGNABLE = 7 staff roles + PLAYER", ASSIGNABLE_ROLES.length === 8);
ok("ASSIGNABLE includes PLAYER (revoke access)", (ASSIGNABLE_ROLES as readonly string[]).includes("PLAYER"));
ok("ASSIGNABLE excludes AGENT", !(ASSIGNABLE_ROLES as readonly string[]).includes("AGENT"));
ok("isAssignableRole(FINANCE)", isAssignableRole("FINANCE"));
ok("isAssignableRole(AGENT) is false", !isAssignableRole("AGENT"));
ok("isStaffAssignable(SUPPORT)", isStaffAssignable("SUPPORT"));
ok("isStaffAssignable(ADMIN) — co-owner allowed", isStaffAssignable("ADMIN"));
ok("isStaffAssignable(PLAYER) is false (add-staff only)", !isStaffAssignable("PLAYER"));

// ── validateRoleChange ────────────────────────────────────────────────────────
const base = { actorId: "owner1", targetId: "t1", prevRole: "SUPPORT", newRole: "FINANCE", reason: "moved to finance" };
ok("valid change passes", validateRoleChange(base).ok === true);
ok("BLOCKS self-demotion (target === actor)", validateRoleChange({ ...base, targetId: "owner1" }).ok === false);
ok("blocks an unknown role", validateRoleChange({ ...base, newRole: "WIZARD" }).ok === false);
ok("blocks a too-short reason", validateRoleChange({ ...base, reason: "x" }).ok === false);
ok("blocks a no-op change (prev === new)", validateRoleChange({ ...base, newRole: "SUPPORT" }).ok === false);
ok("blocks a missing target id", validateRoleChange({ ...base, targetId: "" }).ok === false);
ok("allows revoking to PLAYER", validateRoleChange({ ...base, newRole: "PLAYER" }).ok === true);

// ── staffRoleInfos (consequence data) — default grants ────────────────────────
__resetGrantsForTest();
const infos = await staffRoleInfos();
ok("ADMIN (Owner) sees + does everything", infos.ADMIN.view.length === 7 && infos.ADMIN.act.length === 7);
ok("AUDITOR acts nowhere (read-only)", infos.AUDITOR.act.length === 0);
ok("AUDITOR is not flagged sensitive", infos.AUDITOR.sensitive === false);
ok("SUPPORT acts only on player support (1 domain)", infos.SUPPORT.act.length === 1);
ok("SUPPORT is not sensitive (no money/PII)", infos.SUPPORT.sensitive === false);
ok("FINANCE is sensitive (moves money)", infos.FINANCE.sensitive === true);
ok("COMPLIANCE is sensitive (handles PII)", infos.COMPLIANCE.sensitive === true);
ok("MODERATOR/Trading is not sensitive", infos.MODERATOR.sensitive === false);
ok("every role carries a non-empty label", Object.values(infos).every((i) => typeof i.label === "string" && i.label.length > 0));

console.log(`\nstaff-role: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
