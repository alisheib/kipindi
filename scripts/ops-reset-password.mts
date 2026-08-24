/**
 * ⚠️ ONE-OFF SUPPORT TOOL — set a player's password through the REAL reset flow.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-reset-password.mts <email> <newPassword>
 *
 * ⛔ WHY NOT JUST WRITE THE HASH. A direct `db.user.update` would set the
 * password and leave NO audit row, no notification to the account holder, and no
 * policy check — the same class of shortcut as clearing a stuck payout with SQL.
 * This mints the identical token `buildResetUrl` mints (it is module-private, so
 * the payload is rebuilt from the exported `signSession` + `passwordFingerprint`)
 * and hands it to the exported `consumeResetToken`, which is the function the
 * real `/auth/reset-password` page calls. So the password goes through:
 *   · validatePasswordStrength  (min length, breach list, edge whitespace)
 *   · validateResetToken        (HMAC, expiry, email binding, single-use pwh)
 *   · the AUTH/password_reset.completed audit row
 *   · alertPasswordChanged      (the account holder is TOLD)
 *
 * ⚠️ DATABASE_URL comes from scripts/live/ops/.env, not from `railway run` —
 * Railway injects `postgres.railway.internal`, which does not resolve off-cluster.
 * SESSION_SECRET must come from `railway run`, or the HMAC will not verify.
 */
import { readFileSync } from "node:fs";

for (const l of readFileSync("scripts/live/ops/.env", "utf8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0 && l.slice(0, i) === "DATABASE_URL") process.env.DATABASE_URL = l.slice(i + 1).trim();
}

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) { console.error("usage: ops-reset-password.mts <email> <newPassword>"); process.exit(2); }
if (!process.env.SESSION_SECRET) { console.error("⛔ no SESSION_SECRET — run this under `railway run -s 50pick --`, or the token cannot be signed."); process.exit(2); }

const { db } = await import("../src/lib/server/store.ts");
const { signSession } = await import("../src/lib/server/crypto.ts");
const { passwordFingerprint, consumeResetToken, validateResetToken } = await import("../src/lib/server/password-reset.ts");

// ⚠️ `email` is NOT unique on this platform — the DAL says so beside findByEmail,
// and sign-in disambiguates. So ask for ALL of them and REFUSE on ambiguity
// rather than resetting whichever one happens to come back first.
const matches: any[] = await db.user.findAllByEmail(email);
if (!matches.length) { console.error(`no account carries ${email}`); process.exit(1); }
if (matches.length > 1) {
  console.error(`⛔ ${matches.length} accounts carry ${email} — refusing to guess which one to reset:`);
  for (const m of matches) console.error(`   ${m.id}  role=${m.role} status=${m.status} created=${m.createdAt}`);
  process.exit(1);
}
const user = matches[0];

console.log(`account : ${user.id}`);
console.log(`role    : ${user.role}   status: ${user.status}`);
console.log(`email   : ${user.email}`);

const token = signSession({
  purpose: "password-reset",
  userId: user.id,
  email: user.email,
  pwh: passwordFingerprint(user.passwordHash),
  exp: Date.now() + 60 * 60 * 1000,
});

// ⭐ Validate BEFORE consuming, so a token this script built wrongly is reported
// as a bad token rather than as a failed reset.
const pre = await validateResetToken(token);
if (!pre.ok) { console.error(`⛔ the token this script minted does NOT validate: ${pre.error}`); process.exit(1); }
console.log(`token   : validates ✅ (HMAC + expiry + email binding + single-use fingerprint)`);

const r = await consumeResetToken(token, newPassword);
if (!r.ok) { console.error(`⛔ reset REFUSED by the platform: ${r.error}`); process.exit(1); }
console.log(`\n✅ password set through the real reset flow.`);

// ⛔ PROVE IT, don't assume it. Re-read the row and verify the new password
// against the stored hash with the platform's own verifier.
const { verifyPassword } = await import("../src/lib/server/crypto.ts");
const after: any = await db.user.findById(user.id);
const good = await verifyPassword(newPassword, after.passwordSalt, after.passwordHash);
console.log(`verify  : the stored hash accepts the new password → ${good ? "✅ YES" : "🔴 NO"}`);

// And the token must now be DEAD — the reset rotated the hash.
const post = await validateResetToken(token);
console.log(`single-use: the same token now → ${post.ok ? "🔴 STILL VALID (bad)" : "✅ rejected — " + post.error}`);

// 🔴 DO NOT `process.exit()` HERE. `consumeResetToken` calls `audit(...)` WITHOUT
// awaiting it — the write is fire-and-forget by design (audit.ts keeps an in-memory
// ring and lets the request proceed). In a server that is fine: the process keeps
// running and the row lands. In a SCRIPT, `process.exit()` tears the event loop down
// mid-flight and the row is LOST. Measured 2026-08-24: the first run of this script
// set the password correctly and wrote NO `password_reset.completed` row at all —
// a password changed on a live money platform with no compliance trace, which is the
// exact thing using the real flow was supposed to guarantee. Drain, then verify the
// row is actually on disk before reporting success.
await new Promise((r) => setTimeout(r, 4000));

const { db: db2 } = await import("../src/lib/server/store.ts");
void db2;
const audited = await (async () => {
  const { Client } = (await import("pg")).default as any;
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const n = (await c.query(
    `select count(*)::int as n from "AuditLog"
      where action = 'password_reset.completed' and "targetId" = $1
        and "createdAt" > now() - interval '5 minutes'`, [user.id])).rows[0].n;
  await c.end();
  return n as number;
})();
console.log(`audit   : password_reset.completed rows written just now → ${audited > 0 ? "✅ " + audited : "🔴 NONE — the compliance row did not persist"}`);

if (!(good && !post.ok && audited > 0)) process.exitCode = 1;
