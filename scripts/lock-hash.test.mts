/**
 * Advisory-lock key hash test (audit M1). The old 32-bit Java-hashCode collided
 * across namespaces (a documented pair: `wallet:chmjin0ggv93fffnq` and
 * `market:cg7t39uk4ng1gg3d1` both hashed to 280122337). The 64-bit SHA-256 key
 * separates them and is collision-free over a realistic key population.
 */
import { hashKey64 } from "../src/lib/server/locks.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// The exact pair the audit found colliding under the old 32-bit hash.
const a = hashKey64("wallet:chmjin0ggv93fffnq");
const b = hashKey64("market:cg7t39uk4ng1gg3d1");
ok("M1: the audit's colliding pair no longer collides", a !== b, `${a} vs ${b}`);

// Fits PG's signed int64 (pg_advisory_xact_lock(bigint)).
const MIN = -(2n ** 63n), MAX = 2n ** 63n - 1n;
ok("M1: hashes fit signed int64", a >= MIN && a <= MAX && b >= MIN && b <= MAX);

// Namespace separation: identical suffix, different namespace → different id.
ok("M1: wallet:abc != market:abc", hashKey64("wallet:abc") !== hashKey64("market:abc"));

// Collision-free over 20k realistic wallet:/market: cuid-like keys.
const seen = new Set<bigint>();
let collisions = 0;
for (let i = 0; i < 20_000; i++) {
  const k = (i % 2 === 0 ? "wallet:" : "market:") + `c${i.toString(36)}${((i * 2654435761) % 1_000_000_007).toString(36)}`;
  const h = hashKey64(k);
  if (seen.has(h)) collisions++;
  seen.add(h);
}
ok("M1: 0 collisions over 20k keys", collisions === 0, `collisions=${collisions}`);

console.log(`\nlock-hash: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
