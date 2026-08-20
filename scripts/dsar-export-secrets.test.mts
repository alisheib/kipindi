/**
 * DSAR EXPORT SECRETS — nothing a player downloads may carry account credentials.
 *
 *   npx tsx scripts/dsar-export-secrets.test.mts   (npm run test:dsar-secrets)
 *
 * 🔴 WHY THIS TEST EXISTS (2026-08-20). The platform grants the same legal right through
 * two doors, and one of them was wrong:
 *
 *   · `buildDsarBundle` — officer-triggered, /admin/privacy and /admin/players. Field-picked
 *     the user row correctly and never carried a secret.
 *   · `exportUserData` — PLAYER-triggered, /profile/account → "Export my data". Returned
 *     `await db.user.findById(userId)` WHOLE. The downloaded JSON contained the account's
 *     scrypt `passwordHash` and `passwordSalt`. Measured, not inferred: both values were
 *     found in the serialised payload.
 *
 * That is the worse door to get wrong. The file goes to a phone's Downloads folder, gets
 * mailed to the player, syncs to consumer cloud storage — an offline cracking target for
 * their own account, and for every service where they reused the password.
 *
 * Neither door is trusted here. Both are called, both are serialised exactly as the product
 * serialises them, and the result is searched for the secret VALUES — not just the field
 * names, because a rename would defeat a name-only check.
 *
 * ⛔ The last section is the important one: it proves the projection is an ALLOWLIST. A fix
 * that merely deleted two known fields would pass everything above it and start leaking
 * again the day somebody adds a third secret column to `User`.
 *
 * Every negative assertion here has been broken on purpose and observed to go red.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { exportUserData } from "../src/lib/server/user-service.ts";
import { buildDsarBundle, dsarUserView } from "../src/lib/server/privacy.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

// Distinctive sentinels — if any of these strings appears in an export, that value escaped.
const HASH = "SENTINEL-PASSWORD-HASH-93f1a7c4e2b8";
const SALT = "SENTINEL-PASSWORD-SALT-5d0e6b9a1c33";

const userId = "u_dsar_secrets";
await db.user.create({
  id: userId,
  phoneE164: "+255700000042",
  email: "probe@50pick.tz",
  passwordHash: HASH,
  passwordSalt: SALT,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: "DSAR Probe", dob: null, region: "Dar es Salaam",
  acceptedTermsVersion: "v3", acceptedTermsAt: new Date().toISOString(),
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
} as never);

// ── 1 · CONTROL — the exports actually produce something ─────────────────────────────
// Without this, every negative assertion below could pass on an empty object.
section("1 · CONTROL: both doors return a populated bundle");

const playerExport = await exportUserData(userId);
const officerBundle = await buildDsarBundle(userId);
const playerJson = JSON.stringify(playerExport);
const officerJson = JSON.stringify(officerBundle);

ok("the PLAYER export carries the account it was asked for",
  playerExport.user?.id === userId, `got ${playerExport.user?.id}`);
ok("the OFFICER bundle carries the account it was asked for",
  officerBundle?.user?.id === userId, `got ${officerBundle?.user?.id}`);
ok("both are substantial documents, not stubs",
  playerJson.length > 200 && officerJson.length > 200,
  `player ${playerJson.length}B / officer ${officerJson.length}B`);
ok("the sentinels really are on the stored row (so searching for them is meaningful)",
  (await db.user.findById(userId))?.passwordHash === HASH,
  "If the DAL did not persist the sentinel, sections 2-3 prove nothing.");

// ── 2 · The player-facing door — the one that leaked ─────────────────────────────────
section("2 · the PLAYER export carries no credential");

ok("⛔ no password HASH VALUE in the downloaded JSON", !playerJson.includes(HASH));
ok("⛔ no password SALT VALUE in the downloaded JSON", !playerJson.includes(SALT));
ok("no `passwordHash` field name either", !playerJson.includes("passwordHash"));
ok("no `passwordSalt` field name either", !playerJson.includes("passwordSalt"));

// ── 3 · The officer-facing door — verified, not assumed ──────────────────────────────
section("3 · the OFFICER bundle carries no credential");

ok("⛔ no password HASH VALUE in the officer bundle", !officerJson.includes(HASH));
ok("⛔ no password SALT VALUE in the officer bundle", !officerJson.includes(SALT));
ok("no credential field names", !officerJson.includes("passwordHash") && !officerJson.includes("passwordSalt"));

// ── 4 · The projection is an ALLOWLIST, not a two-field patch ────────────────────────
section("4 · a NEW secret column would be excluded automatically");

/**
 * The real question is not "are these two fields gone" — it is "what happens to the THIRD
 * one". A denylist fix passes sections 2 and 3 and then leaks the next column somebody
 * adds. So: hand the projection a row carrying a field it has never heard of, and require
 * that it does not appear in the output.
 */
const rowWithFutureSecret = {
  ...(await db.user.findById(userId))!,
  // Pretend a later migration added these. The projection must not know or care.
  recoveryKeyHash: "SENTINEL-FUTURE-SECRET-a1b2c3d4",
  totpSecretEnc: "SENTINEL-FUTURE-TOTP-e5f6a7b8",
} as never;
const projected = JSON.stringify(dsarUserView(rowWithFutureSecret));

ok("⛔ an unknown future secret column does NOT reach the output",
  !projected.includes("SENTINEL-FUTURE-SECRET-a1b2c3d4") && !projected.includes("recoveryKeyHash"),
  "The projection is behaving like a denylist. It must name what it INCLUDES.");
ok("⛔ nor does a second one",
  !projected.includes("SENTINEL-FUTURE-TOTP-e5f6a7b8") && !projected.includes("totpSecretEnc"));
ok("CONTROL: the projection still emits the fields a player is entitled to",
  projected.includes(userId) && projected.includes("Dar es Salaam") && projected.includes("probe@50pick.tz"),
  "If this fails the projection is empty and the two assertions above are vacuous.");

// ── 5 · Both doors read the SAME projection ──────────────────────────────────────────
section("5 · one projection, so the two doors cannot drift again");

const playerKeys = Object.keys(playerExport.user ?? {}).sort().join(",");
const officerKeys = Object.keys(officerBundle?.user ?? {}).sort().join(",");
ok("the player export and the officer bundle expose an IDENTICAL user field set",
  playerKeys === officerKeys && playerKeys.length > 0,
  `player: ${playerKeys}\n       officer: ${officerKeys}`);
ok("and that set is exactly what dsarUserView returns",
  playerKeys === Object.keys(dsarUserView((await db.user.findById(userId))!)).sort().join(","));

console.log("");
console.log("─".repeat(64));
console.log(`  DSAR EXPORT SECRETS: ${pass} passed, ${fail} failed`);
console.log(`  A data-subject export is a file the player keeps. It may hold everything`);
console.log(`  about them and nothing that authenticates them.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
