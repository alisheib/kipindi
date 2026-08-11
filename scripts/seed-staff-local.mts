/**
 * seed-staff-local.mts — one account per STAFF ROLE in the LOCAL Postgres, for the
 * admin-console role matrix.
 *
 * ⭐ WHY THIS EXISTS, AND IT IS NOT CONVENIENCE. Measured on production 2026-08-11 with
 * `scripts/live/ops/rbac-census.cjs`: **AUDITOR and SUPPORT have no account at all** — not
 * on production, and `.env.qa.local` carries no persona for either. So a role sweep that
 * runs only against the existing QA identities is structurally incapable of covering 2 of
 * the 7 staff roles, and would report a clean matrix having never exercised a third of it.
 * That is the same blindness as testing a live campaign with two players.
 *
 * ⛔ LOCALHOST ONLY, three refusal gates, exactly like `seed-admin-local.mts`. Creating
 * staff on production would be a real grant of real access to a real money console.
 *
 * ⚠️ It does NOT touch the ADMIN account — `seed-admin-local.mts` owns that one, and two
 * scripts writing one row is how a fixture gets silently re-hashed under a running driver.
 *
 * Usage:
 *   DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public' \
 *     npx tsx scripts/seed-staff-local.mts
 */
import { db, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";
import { hashPassword, randomId } from "../src/lib/server/crypto.ts";
import { EDITABLE_ROLES } from "../src/lib/server/roles.ts";
import { LOCAL_STAFF, LOCAL_STAFF_PASSWORD } from "./local-staff.mjs";

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("DATABASE_URL is required."); process.exit(1); }
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production."); process.exit(1);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — localhost only."); process.exit(1);
}

const PASSWORD = LOCAL_STAFF_PASSWORD;

const roles = EDITABLE_ROLES; // the 6 staff roles that are NOT the Owner

/**
 * ⛔ THE ROLE→PHONE MAP LIVES IN `local-staff.mjs`, NOT HERE, because the driver that
 * signs in as these accounts reads the same constant. When this file derived the phone
 * from the array index, reordering `EDITABLE_ROLES` would have re-pointed the driver at a
 * different role than the one it named — a sweep reporting one role's gate under
 * another's, which looks exactly like a measurement.
 *
 * ⚠️ So the two lists must AGREE, and that is asserted rather than assumed.
 */
const missing = roles.filter((r) => !(r in LOCAL_STAFF));
const extra = Object.keys(LOCAL_STAFF).filter((r) => !(roles as readonly string[]).includes(r));
if (missing.length || extra.length) {
  console.error(`REFUSED — local-staff.mjs disagrees with EDITABLE_ROLES.`);
  if (missing.length) console.error(`  roles with no phone: ${missing.join(", ")}`);
  if (extra.length) console.error(`  phones with no role:  ${extra.join(", ")}`);
  process.exit(1);
}

const phoneFor = (role: string) => `+255${LOCAL_STAFF[role as keyof typeof LOCAL_STAFF]}`;

const results: string[] = [];

for (let i = 0; i < roles.length; i++) {
  const role = roles[i];
  const phone = phoneFor(role);
  const local = phone.replace("+255", "");
  if (local.length !== 9) throw new Error(`local part must be 9 digits, got "${local}"`);

  const existing = await db.user.findByPhone(phone);
  const salt = randomId(16);
  const passwordHash = await hashPassword(PASSWORD, salt);

  if (existing) {
    await db.user.update(existing.id, {
      role, status: "ACTIVE",
      passwordSalt: salt, passwordHash,
      failedLoginCount: 0, lockedUntil: null,
    });
    results.push(`${role.padEnd(11)} ${local}  (updated ${existing.id})`);
  } else {
    const now = new Date().toISOString();
    const id = `usr_${randomId(12)}`;
    const u: StoredUser = {
      id, phoneE164: phone, email: null,
      passwordHash, passwordSalt: salt,
      failedLoginCount: 0, lockedUntil: null,
      role, status: "ACTIVE", locale: "EN", displayName: `QA ${role}`,
      dob: "1990-01-01", region: "TZ",
      acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
      createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
    };
    await db.user.create(u);
    // Staff get a wallet like any user — the console reads `Wallet` for some surfaces
    // and a missing row renders as a crash rather than a zero.
    const w: StoredWallet = {
      id: `wal_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0,
      currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
    };
    await db.wallet.create(w);
    results.push(`${role.padEnd(11)} ${local}  (created ${id})`);
  }
}

// ⚠️ READ EVERY ROW BACK. A silent write failure would leave the role sweep signing in
// as the wrong role and reporting one role's gate as another's — which is worse than a
// missing account, because it looks like a measurement.
let bad = 0;
for (let i = 0; i < roles.length; i++) {
  const check = await db.user.findByPhone(phoneFor(roles[i]));
  const okRole = check?.role === roles[i];
  const okStatus = check?.status === "ACTIVE";
  if (!okRole || !okStatus) { bad++; console.error(`VERIFY FAILED ${roles[i]}: role=${check?.role} status=${check?.status}`); }
}

console.log(results.join("\n"));
console.log(`\npassword for all six: ${PASSWORD}`);
console.log(`verify — ${roles.length - bad}/${roles.length} accounts hold the role and status they were seeded with`);
process.exit(bad === 0 ? 0 : 1);
