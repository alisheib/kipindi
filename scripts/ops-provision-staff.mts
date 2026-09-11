/**
 * `ops-provision-staff.mts` — create staff logins after the pre-launch reset.
 *
 *   npm run ops:provision-staff -- --plan                    # read-only
 *   npm run ops:provision-staff -- --execute --confirm "PROVISION 50PICK STAFF"
 *
 * Ali, 2026-09-11, on the UT support directory: *"assign roles as needed for the ones in the
 * PDF with the correct access"*, then *"if no account, create please"*.
 *
 * ⛔ THE PRODUCT DELIBERATELY HAS NO ADMIN-SIDE ACCOUNT CREATION, AND THIS DOES NOT CHANGE
 * THAT. `/admin/staff` says so in its own header — *"already have a normal 50pick account —
 * we never create logins here"* — and that is the right default: an account minted by a
 * script has not seen the register flow, has not accepted the terms itself, and has no
 * verified phone. This script exists for ONE bounded job: standing up the named operations
 * team on a freshly reset platform, before any player exists, where asking four colleagues
 * to self-register is slower than provisioning them and is the only thing standing between
 * the desk and a working inbox.
 *
 * ⭐ SELF-REGISTRATION REMAINS THE BETTER PATH AND THE DEFAULT RECOMMENDATION. Use it whenever
 * the person can spare two minutes: they accept the terms in their own name, the phone is
 * theirs, and the Owner's promotion at `/admin/staff` is separately audited. Reach for this
 * script when that is genuinely impractical, and say in `--reason` why.
 *
 * FOUR THINGS IT DOES THAT A RAW INSERT WOULD NOT:
 *
 *  1. **It writes an AUDIT ROW per account** (`staff.provisioned`, category SECURITY) naming
 *     the operator, the role, and the typed reason. A role that appears with no record of who
 *     granted it is the exact defect `/admin/staff` was built to prevent; a script that
 *     bypasses the form must not also bypass the ledger. ⚠️ Run this AFTER the reset — before
 *     it, `--execute` deletes the very rows this writes.
 *  2. **It leaves `acceptedTermsVersion` / `acceptedTermsAt` NULL** — the holder has not
 *     accepted the terms, and a stamped version is indistinguishable at every read site
 *     from someone who clicked it. ⛔ Do not copy the registration path's stamp as if
 *     they had: that turns an operational shortcut into a false compliance record.
 *  3. **It creates the Wallet row.** Several admin surfaces read `Wallet` directly and a
 *     missing row renders as a crash rather than a zero.
 *  4. **It refuses to touch an existing account.** If the phone already resolves, it reports
 *     and skips — promotion of an existing account belongs at `/admin/staff`, where it is
 *     audited with a typed reason and cannot be done by a script nobody reviewed.
 *
 * ⛔ ADMIN (Owner) IS NOT PROVISIONABLE HERE. `EDITABLE_ROLES` excludes it deliberately so the
 * Owner seat cannot be handed out through a form; a script must not be the loophole. The
 * Owner path is `ADMIN_BOOTSTRAP_PHONES` + first login, which is one-shot and audited.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { db, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";
import { hashPassword, randomId } from "../src/lib/server/crypto.ts";
import { EDITABLE_ROLES } from "../src/lib/server/roles.ts";
import { audit, auditFlush } from "../src/lib/server/audit.ts";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CONFIRM = "PROVISION 50PICK STAFF";
const LIST = val("--list") ?? "prelaunch-staff.json";
const REASON = val("--reason") ?? "";

type Row = { phone: string; email?: string; displayName?: string; role: string; note?: string };

if (!existsSync(LIST)) {
  console.error(
    `✖ No ${LIST}. Write it as:\n\n` +
      `[\n` +
      `  { "phone": "+255XXXXXXXXX", "email": "Fulgence.kijuu@50pick.tz",\n` +
      `    "displayName": "Fulgence Kijuu", "role": "SUPPORT", "note": "Customer Care (UT directory)" }\n` +
      `]\n\n` +
      `  ⛔ The phone is REQUIRED and is the login. \`phoneE164\` is the only unique column on\n` +
      `     User; email is not unique and cannot identify an account.\n` +
      `  Roles available: ${EDITABLE_ROLES.join(", ")}`
  );
  process.exit(1);
}

const rows = JSON.parse(readFileSync(LIST, "utf8")) as Row[];
const problems: string[] = [];
const ready: Array<Row & { tempPassword: string }> = [];

for (const [i, r] of rows.entries()) {
  const label = r.phone ?? `entry #${i}`;
  if (!r.phone || !/^\+255\d{9}$/.test(r.phone)) {
    problems.push(`${label}: phone must be +255 followed by 9 digits`);
    continue;
  }
  if (!EDITABLE_ROLES.includes(r.role as (typeof EDITABLE_ROLES)[number])) {
    problems.push(
      `${label}: role "${r.role}" is not provisionable here` +
        (r.role === "ADMIN" ? " — ADMIN is Owner-only, use ADMIN_BOOTSTRAP_PHONES + first login" : "") +
        `. Allowed: ${EDITABLE_ROLES.join(", ")}`
    );
    continue;
  }
  const existing = await db.user.findByPhone(r.phone);
  if (existing) {
    problems.push(
      `${label}: account ALREADY EXISTS (${existing.id}, role ${existing.role}) — ` +
        `promote it at /admin/staff instead, where the grant is audited with a reason`
    );
    continue;
  }
  // 18 chars of base64url ≈ 108 bits. Shown once; the holder changes it at first sign-in.
  ready.push({ ...r, tempPassword: randomBytes(14).toString("base64url") });
}

if (problems.length) {
  console.error("✖ Not provisioning. Nothing has been written.\n");
  for (const p of problems) console.error("   • " + p);
  if (!has("--skip-bad")) process.exit(1);
  console.error("\n  --skip-bad given: continuing with the rest.\n");
}

console.log(`\nWould provision ${ready.length} account(s):`);
for (const r of ready)
  console.log(`  ${r.role.padEnd(11)} ${r.phone}  ${r.email ?? "-"}  ${r.displayName ?? "-"}  ${r.note ?? ""}`);

if (!has("--execute")) {
  console.log(`\n(read-only. Re-run with --execute --confirm "${CONFIRM}" --reason "<why not self-registration>")`);
  process.exit(0);
}
if (val("--confirm") !== CONFIRM) {
  console.error(`✖ --execute needs --confirm "${CONFIRM}"`);
  process.exit(1);
}
if (REASON.trim().length < 10) {
  console.error(
    "✖ --reason is required and must say WHY these are not self-registering.\n" +
      "  It is written into the audit payload. A provisioned role with no stated reason is\n" +
      "  the thing /admin/staff's typed-reason field exists to prevent."
  );
  process.exit(1);
}

const operator = val("--operator") ?? "ops-provision-staff";
const created: Array<{ phone: string; role: string; id: string; tempPassword: string }> = [];

for (const r of ready) {
  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const passwordHash = await hashPassword(r.tempPassword, salt);

  const u: StoredUser = {
    id,
    phoneE164: r.phone,
    email: r.email ?? null,
    passwordHash,
    passwordSalt: salt,
    failedLoginCount: 0,
    lockedUntil: null,
    role: r.role as StoredUser["role"],
    status: "ACTIVE",
    locale: "EN",
    displayName: r.displayName ?? null,
    dob: null,
    region: "TZ",
    // ⛔ LEFT NULL DELIBERATELY — THEY HAVE NOT ACCEPTED THE TERMS.
    // The first draft stamped the current version with a payload flag saying an operator
    // accepted on their behalf. That is the defect this file's own header warns about, one
    // level down: a stamped `acceptedTermsVersion` is INDISTINGUISHABLE at every read site
    // from someone who clicked it, and the honest flag sat in an audit payload nobody joins
    // to the user row. Null is the true statement, and it is the one the product can act on.
    // (`TERMS_VERSION` is module-private to auth-service.ts and deliberately not exported,
    // which is the codebase saying the same thing.)
    acceptedTermsVersion: null,
    acceptedTermsAt: null,
    marketingOptIn: false,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    closedAt: null,
  };
  await db.user.create(u);

  const w: StoredWallet = {
    id: `wal_${randomId(12)}`,
    userId: id,
    balance: 0,
    pending: 0,
    hold: 0,
    currency: "TZS",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  await db.wallet.create(w);

  await audit({
    category: "SECURITY",
    action: "staff.provisioned",
    actorId: operator,
    targetType: "User",
    targetId: id,
    payload: {
      role: r.role,
      phoneE164: r.phone,
      email: r.email ?? null,
      displayName: r.displayName ?? null,
      reason: REASON,
      termsAccepted: false,
      note:
        "Created by ops-provision-staff.mts — NOT self-registered, no phone verification, " +
        "and acceptedTermsVersion/acceptedTermsAt left NULL because the holder has not " +
        "accepted the terms. Both facts are true on the User row itself, not only here.",
    },
  });

  created.push({ phone: r.phone, role: r.role, id, tempPassword: r.tempPassword });
}

await auditFlush();

console.log(`\n✔ Provisioned ${created.length} account(s). Audit rows written (staff.provisioned).\n`);
console.log("⛔ TEMPORARY PASSWORDS — shown ONCE, not stored anywhere, not recoverable.");
console.log("   Hand each to its owner over a channel you trust and have them change it at first sign-in.\n");
for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.tempPassword}`);
console.log("\n⚠️ These accounts have NOT verified their phone and did NOT accept the terms themselves.");
console.log("   Both facts are recorded in each audit row rather than hidden.");
