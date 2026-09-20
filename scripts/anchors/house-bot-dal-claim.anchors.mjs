/**
 * Anchors for the house DAL's CLAIM predicate — `scripts/lib/house-bot-dal-cases.mts` group c13, run by
 * `test:house-bot-migrations` §d once on a migrated Postgres and once on the memory twin.
 *
 * ⭐ WHY THIS FILE EXISTS. c13's cases are not `ok(...)` lines: the child writes OUTCOMES to a file and the
 * parent requires both stores to equal `EXPECTED` and to equal each other. That comparison IS the assertion,
 * and it is a strong one — but nothing audited that the mutations proving it can fail still POINT at the
 * product. `test:red-anchors` §3 imports every `scripts/anchors/*.anchors.mjs` and requires each `from` to
 * resolve EXACTLY ONCE, whether or not a `red:*` harness consumes the file, so declaring here buys the
 * anchor-rot guard for a case list that could not otherwise have it.
 *
 * ⛔ TWO TWINS, TWO MUTATIONS, ON PURPOSE. The reclaim arm is written twice — once as a JavaScript
 * predicate, once as SQL — and the whole point of running one case list on both stores is that a limb
 * present in one and missing in the other is a REAL divergence. A single declared mutation would prove only
 * the twin it edits; `claim-reclaim-mem` and `claim-reclaim-pg` each strand the OTHER store's arm intact, so
 * each one also demonstrates that the parity comparison itself would report the difference.
 *
 * `expect` names the c13 outcome KEY that must stop matching `EXPECTED` (there are no PASS/FAIL labels to
 * quote here), and `sections` is the `HB_DAL_CASES_ONLY` group.
 *
 * ⛔ A red anchor quotes SOURCE. Editing either claim twin must be paired with re-anchoring here.
 */
const DAL = "src/lib/server/house-bot-dal.ts";

export const MUTATIONS = [
  {
    name: "claim-reclaim-mem · the memory twin forgets the abandoned-CLAIMED arm, so a worker killed mid-pass strands its intent until staleAt",
    file: DAL,
    from: `        || (i.status === "CLAIMED" && i.claimedUntil != null && ms(i.claimedUntil) < now))
      && ms(i.deadlineAt) > now && ms(i.staleAt) > now && i.attempts < MAX_NON_TRANSIENT_ATTEMPTS)
      .sort((a, b) => ms(a.dueAt) - ms(b.dueAt))`,
    to: `        )
      && ms(i.deadlineAt) > now && ms(i.staleAt) > now && i.attempts < MAX_NON_TRANSIENT_ATTEMPTS)
      .sort((a, b) => ms(a.dueAt) - ms(b.dueAt))`,
    expect: "c13.d an ABANDONED claim is reclaimed; a live lease and a spent one are not",
    suite: "dal-mem",
    sections: "c13",
  },
  {
    name: "claim-reclaim-pg · the Postgres twin's second disjunct goes, so only the memory store rescues an abandoned claim",
    file: DAL,
    from: "      + ` OR (\"status\" = 'CLAIMED' AND \"claimedUntil\" < now()))`\n      + ` AND \"deadlineAt\" > now() AND \"staleAt\" > now() AND \"attempts\" < ${p.raw(MAX_NON_TRANSIENT_ATTEMPTS, \"int\")}`",
    to: "      + `)`\n      + ` AND \"deadlineAt\" > now() AND \"staleAt\" > now() AND \"attempts\" < ${p.raw(MAX_NON_TRANSIENT_ATTEMPTS, \"int\")}`",
    expect: "c13.d an ABANDONED claim is reclaimed; a live lease and a spent one are not",
    suite: "dal-pg",
    sections: "c13",
  },
  {
    name: "claim-steal-live-mem · the lease check is dropped from the memory twin, so a LIVE claim is stolen and one intent fires under two workers",
    file: DAL,
    from: `        || (i.status === "CLAIMED" && i.claimedUntil != null && ms(i.claimedUntil) < now))`,
    to: `        || (i.status === "CLAIMED" && i.claimedUntil != null))`,
    expect: "c13.f CONTROL · the live lease still belongs to its own worker, on its own attempt",
    suite: "dal-mem",
    sections: "c13",
  },
];
