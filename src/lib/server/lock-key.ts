/**
 * Advisory-lock key hashing — split out from locks.ts on purpose.
 *
 * `audit.ts` needs only this pure function, but audit is reachable from the
 * CLIENT module graph (`src/lib/utils.ts` imports platform-config → audit for
 * the platform timezone). Importing it from locks.ts dragged locks' runtime —
 * including `node:async_hooks` — into that graph, and Turbopack cannot generate
 * a browser chunk for a Node-only builtin. Keeping the hash here means the pure
 * helper is freely importable while the lock RUNTIME stays server-only.
 */

import { createHash } from "node:crypto";

/**
 * Hash a lock key to a 64-bit signed integer for pg_advisory_xact_lock(bigint)
 * (audit M1). The old 32-bit Java-hashCode collided across namespaces — over
 * 100k realistic cuid keys, `wallet:X` and `market:Y` mapped to the same lock id,
 * so a wallet op could block an unrelated market op (correctness was preserved by
 * over-serializing, but it was an undiagnosable latency bug). The full key string
 * already carries its namespace (`wallet:` / `market:`), so hashing it into the
 * full 64-bit advisory-lock space makes a cross-namespace collision ~2^-64.
 */
export function hashKey64(key: string): bigint {
  const digest = createHash("sha256").update(key).digest();
  // First 8 bytes as an unsigned 64-bit, reinterpreted as signed for PG bigint.
  return BigInt.asIntN(64, digest.readBigUInt64BE(0));
}
