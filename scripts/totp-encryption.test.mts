/**
 * TOTP secret encryption-at-rest (AES-256-GCM).
 *
 * Locks: envelope round-trip, tamper/wrong-key failure (GCM auth), that a LEGACY
 * plaintext row still verifies and is transparently upgraded in place, that what
 * lands in the store is never the plaintext seed, and that end-to-end TOTP verify
 * is unaffected. Run: npx tsx scripts/totp-encryption.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { createHmac } from "node:crypto";
import { encryptSecret, decryptSecret, isEncrypted } from "../src/lib/server/crypto.ts";
import { provisionTotp, verifyTotp, hasTotp, removeTotp } from "../src/lib/server/totp.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };

// The dev/in-memory TOTP store lives on globalThis — read it to prove what is
// ACTUALLY persisted (this is the whole point of the feature).
const rawSecrets = () => (globalThis as unknown as { __50PICK_TOTP_SECRETS?: Map<string, string> }).__50PICK_TOTP_SECRETS!;

function base32Decode(str: string): Buffer {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const s = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const c of s) { const i = A.indexOf(c); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; } }
  return Buffer.from(out);
}
function totpNow(b32: string): string {
  const secret = base32Decode(b32);
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac("sha1", secret).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

// ── 1. Envelope primitives ──
{
  const plain = "JBSWY3DPEHPK3PXP";
  const env = encryptSecret(plain);
  ok("envelope is version-prefixed", env.startsWith("v1."));
  ok("isEncrypted true for envelope", isEncrypted(env));
  ok("isEncrypted false for raw base32", !isEncrypted(plain));
  ok("round-trips", decryptSecret(env) === plain);
  ok("ciphertext does not contain the plaintext", !env.includes(plain));
  const env2 = encryptSecret(plain);
  ok("same plaintext → different envelope (random IV)", env !== env2 && decryptSecret(env2) === plain);
}

// ── 2. Tamper detection (GCM auth) ──
{
  const env = encryptSecret("JBSWY3DPEHPK3PXP");
  const parts = env.split(".");
  const flipped = [parts[0], parts[1], parts[2], parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA")].join(".");
  ok("tampered ciphertext → null (not a throw)", decryptSecret(flipped) === null);
  ok("garbage envelope → null", decryptSecret("v1.aaa.bbb.ccc") === null);
  ok("non-envelope → null", decryptSecret("JBSWY3DPEHPK3PXP") === null);
}

// ── 3. What is PERSISTED is never the plaintext seed ──
{
  const { secretBase32 } = await provisionTotp("enc_u1", "+255700000001");
  const stored = rawSecrets().get("enc_u1")!;
  ok("stored value is an envelope", isEncrypted(stored), `stored=${stored.slice(0, 12)}…`);
  ok("stored value is NOT the plaintext seed", stored !== secretBase32 && !stored.includes(secretBase32));
  ok("decrypting the stored value yields the seed", decryptSecret(stored) === secretBase32);
  // End-to-end: verification still works through the encryption boundary.
  ok("verifyTotp works on an encrypted secret", (await verifyTotp("enc_u1", totpNow(secretBase32))) === true);
  ok("verifyTotp rejects a wrong code", (await verifyTotp("enc_u1", "000000")) === false);
}

// ── 4. LEGACY plaintext row still verifies AND is upgraded in place ──
{
  const legacy = "JBSWY3DPEHPK3PXP"; // what pre-encryption rows look like
  rawSecrets().set("enc_legacy", legacy);
  ok("precondition: stored plaintext", !isEncrypted(rawSecrets().get("enc_legacy")!));

  // A read through the store must still verify the user's existing authenticator…
  ok("legacy secret still verifies (no 2FA interruption)", (await verifyTotp("enc_legacy", totpNow(legacy))) === true);

  // …and must have transparently upgraded the row to an envelope.
  const after = rawSecrets().get("enc_legacy")!;
  ok("legacy row upgraded to an envelope in place", isEncrypted(after), `after=${after.slice(0, 12)}…`);
  ok("upgraded envelope still decrypts to the same seed", decryptSecret(after) === legacy);
  ok("still verifies after the upgrade", (await verifyTotp("enc_legacy", totpNow(legacy))) === true);
}

// ── 5. Undecryptable secret fails closed (no crash, no bypass) ──
{
  rawSecrets().set("enc_bad", "v1.AAAA.BBBB.CCCC"); // well-formed prefix, junk payload
  ok("undecryptable secret → verify false (fails closed)", (await verifyTotp("enc_bad", "123456")) === false);
  ok("hasTotp still true (row exists)", (await hasTotp("enc_bad")) === true);
}

// ── 6. Remove still works ──
{
  await removeTotp("enc_u1");
  ok("removeTotp clears the row", (await hasTotp("enc_u1")) === false);
}

console.log(`\ntotp-encryption: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
