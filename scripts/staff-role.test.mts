/**
 * Staff-role management — locks the /admin/staff policy: which roles are assignable,
 * the role-change validation (incl. the self-demotion block that stops the Owner
 * locking themselves out), and the consequence data shown before a change (staffRoleInfos).
 *
 * The action wrappers (setStaffRoleAction/addStaffByPhoneAction) gate via requireOwner
 * (ADMIN-only + step-up 2FA) + revokeUserSessions + a COMPLIANCE audit — those need a
 * request/session context, so they're exercised by the app; here we lock the PURE rules.
 *
 * ⭐ vb8 (2026-10-03) · THE AUDITED REASON AND WHERE A REFUSAL POINTS. The reason is refused past 500 characters
 * (it used to be cut to 500 inside both actions, before any rule saw it), refused when it holds a phone number, and
 * cleaned before it is stored; a refusal the form can fix names its field. The actions cannot run here, so their
 * CALL SITES are read instead — the cut lived in the action, and a rule that refuses 501 characters proves nothing
 * while the action still hands it 500.
 *
 * Run: npx tsx scripts/staff-role.test.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  isStaffAssignable,
  validateRoleChange,
  checkStaffPhone,
  STAFF_REASON_MAX,
  STAFF_PHONE_EMPTY,
  STAFF_PHONE_INVALID,
} from "../src/lib/server/staff-roles.ts";
import { staffRoleInfos, __resetGrantsForTest } from "../src/lib/server/rbac.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${!c && x ? ` — ${x}` : ""}`); };

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

// ── vb8 · the audited reason: refused, never cut · no phone number · cleaned · the field it names ──
{
  const fieldOf = (v: ReturnType<typeof validateRoleChange>) => (v.ok ? null : v.field ?? null);
  const whole = "r".repeat(STAFF_REASON_MAX);
  const v500 = validateRoleChange({ ...base, reason: whole });
  ok("vb8 · a 500-character reason is kept whole", v500.ok && v500.reason === whole);
  const v501 = validateRoleChange({ ...base, reason: "r".repeat(STAFF_REASON_MAX + 1) });
  ok("vb8 · a 501-character reason is REFUSED at the reason field, never cut",
     !v501.ok && v501.field === "reason" && v501.error === "A reason can be at most 500 characters.",
     JSON.stringify(v501).slice(0, 160));
  ok("vb8 · a reason holding 0712 345 678 is refused at the reason field",
     fieldOf(validateRoleChange({ ...base, reason: "moved to finance, call 0712 345 678" })) === "reason");
  const NUL = String.fromCharCode(0);
  const cleaned = validateRoleChange({ ...base, reason: `moved${NUL} to finance` });
  ok("vb8 · a NUL never reaches the COMPLIANCE payload: the reason is cleaned, and the cleaned text is what is stored",
     cleaned.ok && cleaned.reason === "moved to finance", JSON.stringify(cleaned).slice(0, 160));
  ok("vb8 · an unknown role and a no-op change name the role field",
     fieldOf(validateRoleChange({ ...base, newRole: "WIZARD" })) === "role"
       && fieldOf(validateRoleChange({ ...base, newRole: "SUPPORT" })) === "role");
}

// ── vb8 · the add-by-phone number: tzPhone's rule, with a sentence of its own for an empty box ──
{
  const empty = checkStaffPhone("   ");
  const short = checkStaffPhone("71234");
  const nine = checkStaffPhone("712345678");
  const spaced = checkStaffPhone("0712 345 678");
  ok("vb8 · an empty and an incomplete number are refused with their own sentences; any tzPhone spelling becomes the E.164",
     !empty.ok && empty.error === STAFF_PHONE_EMPTY && !short.ok && short.error === STAFF_PHONE_INVALID
       && nine.ok && nine.phone === "+255712345678" && spaced.ok && spaced.phone === "+255712345678");
}

// ── vb8 · the CALL SITES: the actions hand the reason over whole and store what the rule returns ──
{
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (p: string) => decomment(readFileSync(join(root, p), "utf8"));
  /** Each statement that reads the reason off the form. */
  const reasonReads = (src: string) => [...src.matchAll(/formData[.]get[(]"reason"[)][^;]*;/g)].map((m) => m[0]);
  const cuts = (stmt: string) => /[.](?:slice|substring|substr)[(]/.test(stmt);
  /** Each call that applies a change, up to its end — the last argument is the reason that is stored. */
  const stores = (src: string) => [...src.matchAll(/(?<!function )applyRoleChange[(][^;]*;/g)].map((m) => m[0]);
  /** The stored reason is one of the two verdicts' own field — `v.reason` or `reason.reason` — never a raw value. */
  const storesChecked = (call: string) => /(?<![A-Za-z0-9_$])(?:v|reason)[.]reason[)];$/.test(call);

  const oldRead = `const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);`;
  const oldStore = `return applyRoleChange(officerId, target, v.newRole, reason);`;
  ok("vb8 · CONTROL — the two detectors below see both old defects (the cut, and the raw reason stored)",
     reasonReads(oldRead).some(cuts) && stores(oldStore).length === 1 && !stores(oldStore).every(storesChecked));

  const actions = read("src/app/admin/staff/actions.ts");
  const reads = reasonReads(actions);
  ok("vb8 · both actions read the reason WHOLE — nothing cuts it before the rule sees it",
     reads.length === 2 && !reads.some(cuts), reads.join(" | "));
  const applied = stores(actions);
  ok("vb8 · both actions store the CLEANED reason the rule hands back, never the raw form value",
     applied.length === 2 && applied.every(storesChecked), applied.join(" | "));
}

// ── vb8 · the forms: the same rules before the confirmation, each refusal under its field ──
{
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const forms = decomment(readFileSync(join(root, "src/app/admin/staff/staff-forms.tsx"), "utf8"));
  const cut = forms.indexOf("export function AddStaffForm");
  const assign = forms.slice(forms.indexOf("export function AssignRoleForm"), cut);
  const add = cut >= 0 ? forms.slice(cut) : "";
  const fields = (part: string, names: readonly string[]) => names.every((n) => part.includes(`dataField="${n}"`));
  ok("vb8 · the add form's phone is the kit PhoneInput in a noValidate form — every spelling reduced, a short number refused by the sentence under it",
     /import [{] PhoneInput [}] from "@[/]components[/]ui[/]phone-input"/.test(forms) && add.includes("<PhoneInput") && /<form[^>]*noValidate(?=[^=A-Za-z])/.test(add));
  ok("vb8 · both forms check with the actions' own rules before the confirmation, address every field, and toast no field check",
     assign.includes("checkStaffReason(") && add.includes("checkStaffReason(") && add.includes("checkStaffPhone(")
       && fields(assign, ["role", "reason"]) && fields(add, ["phone", "role", "reason"])
       && !/title: "(?:Phone required|Reason required|No change)"/.test(forms));
}

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
