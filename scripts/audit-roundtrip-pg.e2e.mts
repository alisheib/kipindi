/**
 * e2e:audit-roundtrip — every audit row must re-verify after a REAL Postgres round trip.
 *
 *   DATABASE_URL=postgresql://…@127.0.0.1:<port>/<scratch db> npm run e2e:audit-roundtrip
 *
 * 🔴 WHY (2026-09-26). Production's ISO audit export read UNVERIFIED: 9 `payouts.unavailable_derived`
 * rows from 2026-09-24 recomputed under no key. Nothing had touched them — their payload held
 * `oldestStuckHours`, a double needing 17 significant digits, and Prisma → Postgres `jsonb` stored 16.
 * `test:audit` simulates that store in memory; this drives the REAL one: `audit()` writes through
 * Prisma, `verifyChainFull()` re-reads and recomputes every row, and the verdict must be valid.
 *
 * ⛔ NOT `test:*` (needs a Postgres; `test:all` runs without one — the `e2e:money` convention).
 * ⛔ LOOPBACK ONLY: it writes audit rows, so it refuses any host but 127.0.0.1/localhost.
 */
const url = process.env.DATABASE_URL ?? "";
let host = "";
try { host = new URL(url).hostname; } catch { /* reported below */ }
if (!url || !["127.0.0.1", "localhost"].includes(host)) {
  console.error(`e2e:audit-roundtrip REFUSED — DATABASE_URL must be a LOOPBACK scratch Postgres (got "${host || "none"}"); this suite writes audit rows.`);
  process.exit(2);
}
process.env.AUDIT_CHAIN_SECRET ??= "e2e-audit-roundtrip-secret";
const { audit, auditFlush, verifyChainFull } = await import("../src/lib/server/audit.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

// The awkward payload shapes, each of which once broke (or could break) verifiability.
const shapes: Array<Record<string, unknown>> = [
  { oldestStuckHours: 54.744926944444444, stuckCount: 1 },          // the production row, verbatim
  { rate: 0.1 + 0.2, third: 1 / 3, twoThirds: 2 / 3 },
  { hours: (1_790_000_000_000 + 7_777_777 + 123) / 3_600_000 - 497_000 },
  { warn: undefined, after: { rate: 0.1 }, note: undefined },     // undefined → null (the 2026-07 defect)
  { nested: { z: 1, a: [3, 2, 1], m: { y: 2.5, b: "é — →" } } },  // key order + unicode
  { amountTzs: 1_000_000, count: 42, atMs: 1_790_000_000_123 },   // integers must pass untouched
];
for (let i = 0; i < 20; i++) shapes.push({ i, hours: (1_790_000_000_000 + i * 9_876_543 + 7) / 3_600_000 - 497_000 });
for (const [i, payload] of shapes.entries()) {
  await audit({ category: "SYSTEM", action: `e2e.roundtrip.${i}`, actorId: null, targetType: null, targetId: null, payload });
}
await auditFlush();

const v = await verifyChainFull();
ok("CONTROL · the rows reached the database (the verifier walked them)", v.total >= shapes.length, `${v.total} rows walked`);
ok("🔴 every row re-verifies after the real Postgres round trip", v.valid && (v.unattested ?? 0) === 0,
  `valid=${v.valid} unattested=${v.unattested ?? 0} linkBroken=${v.linkBroken ?? false} ${v.firstBreakAt ?? ""}`);
ok("…and no link is broken", !v.linkBroken);

console.log(`\naudit-roundtrip-pg: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
