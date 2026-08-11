/**
 * seed-admin-local.mts — an admin account in the LOCAL Postgres, for visual QA.
 *
 * ⛔ WHY THIS EXISTS WHEN `/api/dev-test/seed-admin` ALREADY DOES IT. That route is
 * gated on `NODE_ENV !== "production"`, so it 404s under `next start` — and
 * `next start` is what visual verification must run against, because the dev server
 * serves stale CSS. Driving the admin UI on `next dev` instead was tried and the dev
 * server's own HMR socket never came up on this machine, so the page rendered and
 * never hydrated: a perfectly healthy wizard whose Continue button stayed disabled.
 * ⭐ That is the INSTRUMENT failing, not the product — the fix is to stop needing the
 * dev server, not to lower the bar to what the dev server can show.
 *
 * ⛔ LOCALHOST ONLY, and it refuses anything else. Creating an admin on production
 * and logging in as one would revoke Ali's live session (single-active-session).
 *
 * Usage:
 *   DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public' \
 *     npx tsx scripts/seed-admin-local.mts
 */
import { db, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";
import { hashPassword, randomId } from "../src/lib/server/crypto.ts";

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("DATABASE_URL is required."); process.exit(1); }
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production."); process.exit(1);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — localhost only."); process.exit(1);
}

const PHONE = "+255700000000";
const PASSWORD = "QaAdmin2026!";

const existing = await db.user.findByPhone(PHONE);
if (existing) {
  const salt = randomId(16);
  await db.user.update(existing.id, {
    role: "ADMIN", status: "ACTIVE",
    passwordSalt: salt, passwordHash: await hashPassword(PASSWORD, salt),
    failedLoginCount: 0, lockedUntil: null,
  });
  console.log(`promoted existing ${existing.id} · ${PHONE} / ${PASSWORD}`);
} else {
  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const u: StoredUser = {
    id, phoneE164: PHONE, email: null,
    passwordHash: await hashPassword(PASSWORD, salt), passwordSalt: salt,
    failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: "QA Admin",
    dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(12)}`, userId: id, balance: 1_000_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);
  console.log(`created ${id} · ${PHONE} / ${PASSWORD}`);
}

// ⚠️ READ IT BACK. A silent write failure would leave the visual driver logging in
// against nothing and reporting the login page's contents as the wizard's.
const check = await db.user.findByPhone(PHONE);
console.log(`verify — role=${check?.role} status=${check?.status}`);
process.exit(check?.role === "ADMIN" && check?.status === "ACTIVE" ? 0 : 1);
