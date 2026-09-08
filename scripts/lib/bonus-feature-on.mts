/**
 * THE BONUS FEATURE IS WITHDRAWN FROM THE PRODUCT — importing this module drives its ON path.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
 * From 2026-09-06 the bonus wallet is WITHDRAWN for every role (`src/lib/feature-state.ts`),
 * and since the audit of that withdrawal `creditBonus` enforces it: the PRODUCT state outranks
 * the operator config, so no new grant is minted while the feature sleeps. That is the correct
 * product behaviour and it is what the withdrawal promised.
 *
 * It also turns every suite that TESTS the bonus machinery red at once — nine of them — and
 * not one of those failures is about the thing the suite measures. They read
 * `bonus=0 · grants=0` and then fall over on `undefined.wageredTzs`, which names neither the
 * feature state nor the gate that produced it.
 *
 * ⭐ THIS IS LAW 2, NOT A WORKAROUND. `feature-state.ts` exposes `FEATURE_BONUS` for exactly
 * this purpose and says so in its own header: *"A dormant path rots because nothing runs it —
 * that is the whole reason re-enabling a feature months later ships broken."* The wagering
 * ladder, FIFO cascade, queueing, expiry, relock, restitution and ledger postings are the
 * machinery a re-enablement depends on. Deleting or skipping their suites would leave that
 * machinery unexecuted for as long as the feature sleeps, which is the precise failure this
 * override was built to prevent. So the suites keep running — against the ON state, declared
 * in one visible line at the top of each file.
 *
 * ⛔ WHAT THIS IS NOT. It is not a bypass and it touches no product code. It sets the same
 * server-side env var an operator would set to re-enable the feature, so the real
 * `resolvedState()` runs in full and returns ACTIVE — exactly as it will on the day the
 * programme returns. It is opt-in per suite, visible at the top of the file, and unreachable
 * from a running platform (`FEATURE_BONUS` is deliberately NOT `NEXT_PUBLIC_`).
 *
 * ⛔ AND THE SUITES THAT MEASURE THE WITHDRAWAL ITSELF MUST NOT IMPORT THIS.
 * `withdrawn-features.test.mts` and `cashback-hidden.test.mts` assert the OFF state — that no
 * grant is minted, that no surface offers one. Importing this there would make them assert a
 * rule against a population that cannot break it, which is this repo's "a gate that chooses
 * its own population cannot fail" defect, filed against itself.
 * ⚠️ `withdrawn-features.test.mts` §4 and §5g2 drive the ON path too, but they set and DELETE
 * the variable inside a `try/finally` around a few lines, because there the ON state is the
 * thing under test rather than the ambient condition. That is the difference between the two.
 *
 * ── HOW ────────────────────────────────────────────────────────────────────────────────
 * ⚠️ IMPORT ORDER DOES NOT MATTER, and that is by construction rather than by luck:
 * `resolvedState()` reads `process.env` on every CALL, not once at module load, so a suite
 * that imports the bonus service before this module still resolves ACTIVE at the moment it
 * grants. Do not "optimise" that read into a module-level constant.
 *
 * ⚠️ THE OVERRIDE IS NOT RESTORED, deliberately. It is ambient for the whole process, which is
 * one suite. A suite that needs BOTH states in one run must scope its own `try/finally` (see
 * `withdrawn-features.test.mts` §4) rather than importing this.
 */

/** The product states `resolvedState()` accepts. Anything else falls back to the shipped constant. */
const ACTIVE = "ACTIVE";

// Idempotent and non-clobbering: if a suite (or CI) has already pinned a state deliberately,
// that choice wins. Only an ABSENT variable is filled in, so this can never silently override
// a suite that set `FEATURE_BONUS=WITHDRAWN` to measure the refusal.
if (!process.env.FEATURE_BONUS) {
  process.env.FEATURE_BONUS = ACTIVE;
}

export {};
