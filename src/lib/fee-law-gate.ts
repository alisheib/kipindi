/**
 * ⛔ THE NEW FEE LAW'S SWITCH — programme FEE-TAX-2026-10 (`docs/FEE-TAX-PLAN.md`).
 *
 * Ali's rulings of 2026-10-24 (`docs/COMPLIANCE-DECISIONS.md` § "2026-10-24 · The fee becomes 13% of every stake, a 15%
 * winnings tax on every win, …") are DECIDED and NOT IN FORCE. Until release R5 flips this constant — in the same commit
 * that rewrites every rule a player reads — `docs/RULES.md` §1/§2 stand everywhere, and nothing may put the new law into
 * force through a side door.
 *
 * WHAT THIS CONTROLS. Every door that could make the `stake-share` fee model, or a winnings tax, apply to a market not yet
 * created reads this file (through `feeLawLive` / `newFeeLawRefusal`) and refuses while it is false:
 *   · `/admin/config`'s save (`market-config.ts` → `validate`): the polls' fee model and `winningsTaxRate`;
 *   · a per-market override (`setMarketOverride`): never a fee model or a tax, gate or no gate;
 *   · an Up & Down rate profile — the product default, a chain's own, created or edited (`updown-config.ts`);
 *   · the one act that moves the default and every chain at once (`applyFeeProfileToEveryChain`);
 *   · and the last door every product passes through, stamping a market (`market-config.ts` → `snapshotFromConfig`), so
 *     a hand-edited settings row cannot put the law into force either.
 * A market that already exists keeps the law it froze in its `feeSnapshot`, whatever this says: the switch decides only
 * what a NEW market may freeze.
 *
 * ⛔ IT IS A CONSTANT, NOT A SETTING — on purpose. A setting can be flipped by one save on a stale container, months before
 * the words players read have changed; a constant moves only with a reviewed commit, and that commit (R5) carries the
 * rewritten Terms, rulebooks, help and How to play beside it. After the flip, the law still applies to nothing until an
 * admin's three audited saves (`FEE-TAX-PLAN.md` §5) — the switch makes those saves POSSIBLE, it does not make them.
 *
 * ⚠️ CLIENT-SAFE AND IMPORT-FREE, so a screen and a server door read the same value. `test:fee-gate` proves each door
 * refuses with it false and accepts with it flipped IN ITS OWN PROCESS, through `__setFeeLawLiveForTest` — never by editing
 * this file. That seam is refused in production, and the suite fails if anything under `src/` but this file names it.
 */

/** False until release R5 of the fee & tax programme. ⛔ Flipped only in R5's one commit. */
export const FEE_LAW_LIVE: boolean = false;

/** The test seam's value, when a suite has set one (`__setFeeLawLiveForTest`); `null` = the constant decides. */
let testFlip: boolean | null = null;

/** Is the new fee law in force for NEW markets? Every door asks this, never the constant directly. */
export function feeLawLive(): boolean {
  return testFlip ?? FEE_LAW_LIVE;
}

/**
 * The refusal every door returns while the new law is not in force — `null` once it is. Plain words, for the officer who
 * pressed Save: what was refused, why, and that nothing changed.
 */
export function newFeeLawRefusal(): string | null {
  if (feeLawLive()) return null;
  return "The new fee law — a fee on every stake and a tax on winnings — is decided but not yet in force. It switches on in one release, together with every rule players read. Nothing was changed.";
}

/**
 * ⚠️ TEST SEAM ONLY — `test:fee-gate` flips the switch inside its own process to prove every door ACCEPTS once it is open,
 * then puts it back (`null` = the constant decides again). ⛔ Never called from application code: the suite fails the build
 * if anything under `src/` other than this file names it. ⛔ Refused in production, so it cannot be a side door even if
 * something did.
 */
export function __setFeeLawLiveForTest(live: boolean | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("fee-law-gate: the test seam is refused in production — the law switches on only with release R5's commit.");
  }
  testFlip = live;
}
