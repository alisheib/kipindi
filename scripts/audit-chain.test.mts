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

  // 9. Canonical payload hashing (audit C6) — verification must survive a payload
  //    KEY REORDER. Postgres jsonb normalizes key order on write, so a payload
  //    hashed in insertion order comes back reordered; the HMAC must be invariant
  //    to that or the persisted chain (and the ring after a rehydrate) would
  //    falsely read BROKEN for every multi-key payload. We simulate the round-trip
  //    by rebuilding the live ring entry's payload with the same values in a
  //    different key order — the chain must stay valid.
  await audit({ category: "WALLET", action: "deposit.multi", actorId: "usr_c", targetType: "User", targetId: "usr_c", payload: { provider: "AZAM", amount: 100, note: "x", nested: { z: 1, a: 2 } } });
  await auditFlush();
  ok("chain valid before reorder", verifyChain().valid);
  const latest = getAuditPage({ limit: 1 })[0]; // newest-first; live ring ref
  latest.payload = { nested: { a: 2, z: 1 }, note: "x", amount: 100, provider: "AZAM" }; // same data, keys reordered
  ok("canonical hash survives payload key reorder", verifyChain().valid);

  // 10. undefined-vs-null payload asymmetry (found on production entry
  //     aud_mrq93f08_18lx2r, 2026-07-18 config.global.updated).
  //     JSON.stringify DROPS a key whose value is `undefined`, but Prisma persists
  //     it as `null`. So an entry logged with { warn: undefined } was hashed over an
  //     object with no `warn` key and stored with "warn": null — permanently
  //     unverifiable, and indistinguishable from tampering. The payload is now
  //     normalised before it is hashed OR stored, so both see the same object.
  await audit({
    category: "ADMIN", action: "config.updated", actorId: "usr_d",
    targetType: "Config", targetId: "global",
    payload: { warn: undefined, after: { rate: 0.1 }, note: undefined },
  });
  await auditFlush();
  ok("chain valid with undefined payload values", verifyChain().valid);
  const undef = getAuditPage({ limit: 1 })[0];
  // The stored payload must not carry the dropped keys at all — if it did, the
  // round-trip through Postgres would reintroduce them as null and break the hash.
  ok("undefined payload keys are omitted, not stored as null",
    undef.payload !== undefined && !("warn" in (undef.payload as object)) && !("note" in (undef.payload as object)));
  // Simulate the Postgres round-trip that produced the production failure.
  undef.payload = JSON.parse(JSON.stringify({ ...(undef.payload as object) }));
  ok("hash survives the persisted-payload round-trip", verifyChain().valid);
// ═══ 11. Key rotation must not read as tampering — but tampering still must ═══
// The chain reported BROKEN in production because AUDIT_CHAIN_SECRET was introduced
// after entries had been signed with the SESSION_SECRET fallback. "BROKEN" on a
// regulator artifact asserts the log was altered, which was false. Verification now
// tries every key an entry could legitimately have been signed with, and reports
// non-recomputable rows separately from a CHAIN LINK break.
//
// The risk of that change is a verifier that can no longer fail. These two checks
// exist to prove it still can.
  const vc = verifyChain;
  ok("chain valid before tamper", vc().valid);

  const live = getAuditPage({ limit: 1 })[0];   // newest-first; live ring reference
  const originalPrev = live.prevHash;
  live.prevHash = "GENESIS";                    // sever the link to its predecessor
  ok("a broken chain LINK is still detected", !vc().valid);
  live.prevHash = originalPrev;
  ok("chain valid again once the link is restored", vc().valid);

  const originalAction = live.action;
  live.action = "tampered.action";              // same links, altered content
  ok("an altered field is still detected", !vc().valid);
  live.action = originalAction;
  ok("chain valid again once the field is restored", vc().valid);
})();

console.log(`\naudit-chain: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

