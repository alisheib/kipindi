/**
 * THE ANCHORS `red:ai-vocabulary` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * S-08 (scan #1, 2026-08-28): four hand-copied vocabularies, none derived, already drifted.
 * `/admin/ai-polls` was missing `other` — the validator's documented FALLBACK category — and
 * `/admin/candidates` was missing `VERIFYING`, the state a candidate sits in when verification
 * hangs. Both are filters an officer needs precisely when something has gone wrong.
 *
 * ⭐ 1 AND 2 ARE THE TWO DEFECTS AS THEY SHIPPED, each restored by DELETING one member from the
 * canonical list — which is what a hand-copied list does by omission.
 *
 * ⭐ 3 IS THE ONE THE SCAN ASKED FOR BY NAME: it proves the guard asserts EQUALITY and not
 * membership. Every offered id stays valid; the rail simply stops offering one. A check of the
 * form "every chip is a real category" passes over that for ever, which is why §2's `equal()`
 * reports the symmetric difference in both directions instead.
 *
 * ⭐ 4 IS THE PHANTOM, THE OPPOSITE DIRECTION, and it is the one the scan itself got wrong: it
 * proposed deriving /admin/candidates from the poll categories. Doing that adds `tech` and
 * `other` to a rail whose rows can never hold them — two filters that always return zero. A
 * guard that only looks for missing members would call that an improvement.
 *
 * ⭐ 5 IS THE DERIVATION ITSELF. Everything else proves the canonical module is right; nothing
 * else proves the RAILS use it. A re-typed literal beside the import satisfies every other
 * assertion while shipping the original defect.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement CONTAINS its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const VOCAB = "src/lib/ai/poll-vocabulary.ts";
const POLL_RAIL = "src/app/admin/ai-polls/poll-filters.tsx";
const CAND_RAIL = "src/app/admin/candidates/candidate-filters.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "the-poll-rail-loses-other-again",
    why: "⭐ THE DEFECT AS IT SHIPPED. `other` is the category the validator assigns when nothing else fits, so it is the one a poll acquires by default — and it was the one that could not be filtered for. Deleting it from the canonical list is exactly what the hand-copied rail did by omission",
    file: VOCAB,
    suite: "ai-vocabulary",
    from: `  "other",\n] as const;\nexport type AIPollCategory`,
    to: `] as const;\nexport type AIPollCategory`,
    /* ⚠️ The named check is §3's, not §2's. There is no prisma enum for a CATEGORY — the
       canonical set is a TypeScript list — so §2's schema reconciliation covers states only,
       and `other`'s presence is asserted explicitly because it is the fallback the whole
       finding turns on. Corrected after the harness reported WRONG REASON: it went red on a
       real assertion, just not the one I had predicted. */
    expect: "3: `other` is offered on the poll rail",
  },
  {
    name: "the-candidate-rail-loses-verifying-again",
    why: "⭐ THE OTHER DEFECT AS IT SHIPPED. VERIFYING is the state a candidate sits in when verification hangs or fails — the one an officer most needs to find, and the one the rail did not offer. Unlike EDITING nothing documents it as unreachable, and there is a real label for it",
    file: VOCAB,
    suite: "ai-vocabulary",
    from: `  "VERIFYING",\n  "PENDING_REVIEW",`,
    to: `  "PENDING_REVIEW",`,
    expect: "2: ⛔ VERIFYING is offered",
  },
  {
    name: "an-exclusion-with-no-reason",
    why: "An exclusion list is a HOLE in a set-equality check, so the hole is checked too. Blanking the reason leaves an unexplained gap that the next reader copies — which is how one documented omission becomes two silent ones",
    file: VOCAB,
    suite: "ai-vocabulary",
    from: `  EDITING: "no path enters it — prisma/schema.prisma records this; offering it would be a filter that can only return nothing",`,
    to: `  EDITING: "n/a",`,
    expect: "2: …and its exclusion carries a reason",
  },
  {
    name: "the-candidate-rail-gains-phantom-categories",
    why: "⭐ THE OPPOSITE DIRECTION, and the mistake the SCAN ITSELF made: it proposed deriving both rails from the poll categories. A MarketCandidate can never hold `tech` or `other`, so that adds two filters which always return zero rows — a narrowing control that cannot narrow. A guard that only hunts for MISSING members would read this as a fix",
    /* ⚠️ MUTATES THE CANONICAL LIST, not the rail. Widening the rail's `.map` instead went red
       on §5's derivation rule — correct, but a different finding. The defect being modelled is
       the SCAN'S PROPOSAL: make the candidate vocabulary equal to the poll one. That belongs in
       the canonical module, and it is §3's phantom rule that must refuse it. */
    file: VOCAB,
    suite: "ai-vocabulary",
    from: `  "infrastructure",\n] as const;\nexport type CandidateCategoryId`,
    to: `  "infrastructure",\n  "tech",\n  "other",\n] as const;\nexport type CandidateCategoryId`,
    expect: "3: CANDIDATE_CATEGORIES vs the CandidateCategory type offers NOTHING the pipeline cannot produce",
  },
  {
    name: "a-rail-re-types-its-own-list",
    why: "⭐ THE REGRESSION THAT PASSES EVERY OTHER CHECK. The canonical module stays perfect and the import stays in place; the rail simply stops using it. Every assertion about the vocabulary itself is still true, and the console is back to a hand-typed list that will drift again",
    file: POLL_RAIL,
    suite: "ai-vocabulary",
    from: `  ...AI_POLL_CATEGORIES.map((id) => ({ id, label: CATEGORY_LABEL[id] ?? id })),`,
    to: `  { id: "sports", label: "Sports" }, { id: "macro", label: "Macro" },`,
    expect: "5: ⛔ …and re-types no category id of its own",
  },
];
