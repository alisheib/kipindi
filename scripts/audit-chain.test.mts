/**
 * Audit chain unit tests (in-memory; no DATABASE_URL → persistence no-ops).
 * Covers: chain validity, tamper detection, serialized ordering under
 * concurrent fire-and-forget writes, and the prevHash-walk order reconstruction
 * used to rehydrate the ring from Postgres on boot.
 */
import {
  audit, auditFlush, verifyChain, getAuditPage, getAuditForActor,
  reconstructChainOrder, auditRingSize,
} from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}
function eq(label: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log(`FAIL ${label}\n   got ${g}\n   exp ${e}`); }
}

await (async () => {
  // 1. A handful of awaited writes produce a valid chain.
  await audit({ category: "AUTH", action: "user.login", actorId: "usr_a", targetType: "User", targetId: "usr_a" });
  await audit({ category: "WALLET", action: "deposit", actorId: "usr_a", targetType: "User", targetId: "usr_a", payload: { amt: 100 } });
  await audit({ category: "BET", action: "bet.placed", actorId: "usr_b", targetType: "Bet", targetId: "bet_1" });
  ok("chain valid after awaited writes", verifyChain().valid);
  ok("ring has 3 entries", auditRingSize() === 3);

  // 2. First entry roots at GENESIS; each links to the previous entryHash.
  const all = getAuditPage({ limit: 100 }).reverse(); // oldest-first
  eq("genesis root", all[0].prevHash, "GENESIS");
  ok("link 1->2", all[1].prevHash === all[0].entryHash);
  ok("link 2->3", all[2].prevHash === all[1].entryHash);

  // 3. Filters.
  eq("actor filter", getAuditForActor("usr_b").map((e) => e.action), ["bet.placed"]);
  eq("category filter", getAuditPage({ category: "WALLET" }).map((e) => e.action), ["deposit"]);

  // 4. Concurrent fire-and-forget writes stay strictly ordered (serialized queue)
  //    and keep the chain intact — no interleaving/fork.
  const N = 50;
  for (let i = 0; i < N; i++) {
    void audit({ category: "SYSTEM", action: `seq.${i}`, actorId: null, targetType: null, targetId: null });
  }
  await auditFlush();
  ok("chain valid after concurrent writes", verifyChain().valid);
  const seqActions = getAuditPage({ category: "SYSTEM", limit: 1000 }).reverse().map((e) => e.action);
  eq("concurrent writes preserved call order", seqActions, Array.from({ length: N }, (_, i) => `seq.${i}`));

  // 5. Tamper detection — mutating a persisted field breaks the chain at that point.
  const page = getAuditPage({ limit: 1000 }); // newest-first; entries are live ring refs
  const victim = page[page.length - 1];        // oldest = our first entry
  const savedAction = victim.action;
  victim.action = "user.logout"; // in-place edit without recomputing the HMAC
  const broken = verifyChain();
  ok("tamper detected", !broken.valid);
  eq("tamper points at edited entry", broken.firstBreakAt, victim.id);
  victim.action = savedAction; // restore so the chain is valid again
  ok("chain valid after restore", verifyChain().valid);

  // 6. reconstructChainOrder: given shuffled rows, recover insertion order via links.
  const linear = [
    { entryHash: "h1", prevHash: "GENESIS", createdAt: "2026-01-01T00:00:00.000Z" },
    { entryHash: "h2", prevHash: "h1", createdAt: "2026-01-01T00:00:01.000Z" },
    { entryHash: "h3", prevHash: "h2", createdAt: "2026-01-01T00:00:02.000Z" },
    { entryHash: "h4", prevHash: "h3", createdAt: "2026-01-01T00:00:03.000Z" },
  ];
  const shuffled = [linear[2], linear[0], linear[3], linear[1]];
  eq("reconstruct from shuffled", reconstructChainOrder(shuffled).map((r) => r.entryHash), ["h1", "h2", "h3", "h4"]);

  // 7. Windowed load: head links to an evicted entry (not GENESIS) — still ordered.
  const windowed = [
    { entryHash: "w2", prevHash: "w1_evicted", createdAt: "2026-01-01T00:00:01.000Z" },
    { entryHash: "w3", prevHash: "w2", createdAt: "2026-01-01T00:00:02.000Z" },
  ];
  eq("reconstruct windowed", reconstructChainOrder([windowed[1], windowed[0]]).map((r) => r.entryHash), ["w2", "w3"]);

  // 8. Gap/fork: a missing link still returns every row (oldest-first leftovers).
  const gapped = [
    { entryHash: "g1", prevHash: "GENESIS", createdAt: "2026-01-01T00:00:00.000Z" },
    { entryHash: "g3", prevHash: "g2_missing", createdAt: "2026-01-01T00:00:02.000Z" },
  ];
  eq("reconstruct keeps all rows on gap", reconstructChainOrder(gapped).map((r) => r.entryHash).sort(), ["g1", "g3"]);
})();

console.log(`\naudit-chain: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
