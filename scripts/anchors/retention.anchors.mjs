/**
 * THE ANCHORS `red:retention` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason `updown-readiness.anchors.mjs` sets out at length: the fleet
 * auditor must answer *"does every anchor still resolve, exactly once?"* WITHOUT executing a
 * harness that rewrites real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHAT THESE MUTATIONS ARE ──────────────────────────────────────────────────
 * A retention pass has two opposite ways to be wrong and `test:retention` has always been
 * written to hold both: it must DELETE what it published a period for (cases 1, 6), and it must
 * reach NOTHING ELSE (cases 3, 4). The F-09 payload pass adds a third shape that neither of
 * those covers — **saying the wrong thing about what it did**. Case 2 removes the tombstone so a
 * pruned payload is indistinguishable from one that never existed; case 5 stamps "pruned" over a
 * column that was always null; case 7 names the audit field for a deletion that did not happen.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const RETENTION = "src/lib/server/retention.ts";
const AIPOLL = "src/lib/server/ai-poll-generation.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // The pass wired but inert — F-01's original defect, which is that a published schedule
    // enforced by nothing reads exactly like one that works.
    name: "payload prune does nothing (a published period enforced by nothing — F-01 again)",
    file: RETENTION,
    suite: "retention",
    from: `  const aiPolls = await aiPollStore.prunePayloads(aiPollBefore)`,
    to: `  const aiPolls = await Promise.resolve({ rawResponses: 0, generations: 0 }).then((r) => r).catch(() => r) as never ?? await aiPollStore.prunePayloads(aiPollBefore)`,
  },
  {
    // 🔴 The tombstone replaced by a null. Nothing breaks, disk is freed — and a reviewer
    // looking at a month-old failed generation can no longer tell "it aged out" from "there was
    // never a raw response". Silent absence, which is the defect this whole audit is about.
    name: "tombstone replaced by null (a reviewer cannot tell pruned from never-existed)",
    file: AIPOLL,
    suite: "retention",
    from: `        poll.rawResponse = AIPOLL_PAYLOAD_PRUNED; rawResponses++; touched = true;`,
    to: `        poll.rawResponse = null; rawResponses++; touched = true;`,
  },
  {
    // ⛔ THE WORST ONE. The prune deletes rows instead of blanking columns — destroying the
    // record of every AI-generated market the platform has ever published.
    name: "payload prune DELETES the row (the record of every published AI market, gone)",
    file: AIPOLL,
    suite: "retention",
    from: `      if (touched) polls.set(id, poll);`,
    to: `      if (touched) polls.delete(id);`,
  },
  {
    // A decision field taken with the payload. Plausible: `reasoning` is long text and looks
    // like a payload — it is the record of WHY a poll scored what it did.
    name: "a DECISION field blanked with the payload (reasoning is a record, not a payload)",
    file: AIPOLL,
    suite: "retention",
    from: `      if (poll.generation != null) { poll.generation = null; generations++; touched = true; }`,
    to: `      if (poll.generation != null) { poll.generation = null; poll.confidence = 0; poll.publishedMarketId = null; generations++; touched = true; }`,
  },
  {
    // The false statement in the other direction: a tombstone stamped over a column that never
    // held anything, so the record says a payload was pruned when there never was one.
    name: "tombstone stamped over a NULL (says a payload was pruned when none existed)",
    file: AIPOLL,
    suite: "retention",
    from: `      if (poll.rawResponse !== null && poll.rawResponse !== AIPOLL_PAYLOAD_PRUNED) {`,
    to: `      if (poll.rawResponse !== AIPOLL_PAYLOAD_PRUNED) {`,
  },
  {
    // The age gate gone — a generation from this morning loses the raw response a reviewer is
    // about to open.
    name: "no age gate on the payload prune (this morning's failure loses its evidence)",
    file: AIPOLL,
    suite: "retention",
    from: `      if (Date.parse(poll.createdAt) >= cutoff) continue;`,
    to: `      if (false) continue;`,
  },
  {
    // The audit row naming a deletion that did not happen. "We deleted 494 AI polls" and "we
    // blanked a column on 494 AI polls" are very different sentences to have to say.
    name: "audit row says DELETED instead of blanked (a false sentence in an unprunable log)",
    file: RETENTION,
    suite: "retention",
    from: `        aiPollRawResponsesBlanked: aiPolls.rawResponses,`,
    to: `        aiPollsDeleted: aiPolls.rawResponses,`,
  },
  {
    // ⭐ RETRO-COVER: the coupling F-01 shipped with. The notification period is bounded from
    // BELOW by the Up & Down digest's replay window; tightening it for disk makes a replayed
    // digest tell every affected player about their day twice.
    name: "notification period tightened past the digest replay window (double-notifies)",
    file: RETENTION,
    suite: "retention",
    from: `export const NOTIFICATION_RETENTION_DAYS = 180;`,
    to: `export const NOTIFICATION_RETENTION_DAYS = 60;`,
  },
  {
    // ⭐ RETRO-COVER: the pass reaching a money row. It cannot today — it names what it touches
    // — but the assertion that says so has to be able to fail.
    name: "the pass reaches a TRANSACTION (proves §3's money assertions can fail)",
    file: RETENTION,
    suite: "retention",
    from: `  const otps = await db.otp.pruneOlderThan(otpBefore);`,
    to: `  const otps = await db.otp.pruneOlderThan(otpBefore);\n  { const w = await db.wallet.findByUserId("u_ret"); if (w) await db.wallet.update(w.id, { balance: 0 }); }`,
  },
];
