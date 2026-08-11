/**
 * The LOCAL staff fixtures — one account per staff role on the disposable cluster.
 *
 * ⭐ ONE DEFINITION, IMPORTED BY BOTH SIDES. `seed-staff-local.mts` writes these rows and
 * `scripts/live/harness.mjs` signs in as them. When the phone block lived in the seeder and
 * the driver derived it from an array index, reordering `EDITABLE_ROLES` would have silently
 * pointed the driver at a different role than the one it named — and a sweep that reports
 * one role's gate under another role's name is worse than no sweep, because it looks like a
 * measurement. There is nothing to drift from now.
 *
 * ⚠️ The phone block `+25570000001N` is deliberately clear of every other fixture in this
 * repo: the local admin is `+255700000000`, the QA personas are `+25571200010N`, the
 * disposable fleet is `+2557990000NN`.
 *
 * ⚠️ NINE-DIGIT LOCAL PART. The login form takes `700000014`, never `+255700000014` and
 * never `0700000014` — see the PhoneInput rules in `harness.mjs`.
 */

/** role → 9-digit local part. Explicit, not index-derived. */
export const LOCAL_STAFF = {
  COMPLIANCE: "700000010",
  MODERATOR: "700000011",
  FINANCE: "700000012",
  GROWTH: "700000013",
  AUDITOR: "700000014",
  SUPPORT: "700000015",
};

/** The Owner seeded by `seed-admin-local.mts` — a different script owns this row. */
export const LOCAL_ADMIN = { phone: "700000000", password: "QaAdmin2026!" };

/** One shared secret: these are disposable rows on a disposable cluster, recreated by
 *  `npm run db:seed-staff-local` in seconds. Per-account secrets would be ceremony
 *  without safety. ⛔ Localhost only — the seeder refuses any non-localhost DATABASE_URL. */
export const LOCAL_STAFF_PASSWORD = "QaStaff2026!";

export const LOCAL_STAFF_ROLES = Object.keys(LOCAL_STAFF);
