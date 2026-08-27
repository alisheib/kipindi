/**
 * Mutation anchors for `red:bonus-relock` — E-224, the bonus re-lock.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on
 * every run, WITHOUT executing the harness, and holds a ceiling of undeclared harnesses that
 * may only shrink. Inline anchors rot silently: three in `updown-push-red.mjs` went stale
 * against rewritten code on 2026-08-22 and the harness went on reporting catches.
 *
 * ── ⭐ THE PROPERTY THAT MAKES THIS FLEET A PROOF: IT MUTATES THE **FIX**, NOT THE DEFECT ──
 *
 * E-224's fix has an unusual shape. The defect was a one-line query filter, so the tempting
 * red fleet is one that re-introduces the *symptom* — and a suite that only dies on the symptom
 * would keep passing if the whole FULFILLED branch were deleted, because with no branch there
 * is no symptom to observe either. ⛔ **A proof that passes with the fix REMOVED is measuring
 * nothing.** So `reversal-population-narrows-to-active` is first and is the one to read: it
 * restores the original `listActiveByUser` call verbatim, and §1.5 / §1.8 are written to die on
 * exactly that edit.
 *
 * ⚠️ AND NOTE WHICH FILE EACH DAL MUTATION TARGETS. The guarded suite runs against the
 * IN-MEMORY store (no DATABASE_URL), so a mutation of `prisma-dal.ts` would change nothing the
 * suite can see and the harness would honestly report a miss against a working platform. Every
 * DAL mutation below therefore targets `store.ts`. This is the same class of mistake as a guard
 * pinned to a path — the rule was right and reached the wrong copy of the code.
 *
 * 📌 ONE CHECK IN THE SUITE HAS NO MUTATION HERE, STATED RATHER THAN IMPLIED: §6.1 asserts that
 * `listReversibleByUser` exists on the store the suite actually runs against — the blind
 * `memoryDb as unknown as typeof prismaDb` cast means a missing mirror is a runtime TypeError
 * that tsc cannot see. Renaming it away would CRASH the suite rather than fail a check, and a
 * crash gives an exit code with no reported failure — which this harness must not accept as a
 * catch (§0.1a: a harness that only checks "did it change?" prints comfort). So §6.1 is a guard
 * without a red mutation, and saying so here is cheaper than a mutation that proves nothing.
 */
const BONUS = "src/lib/server/bonus-service.ts";
const STORE = "src/lib/server/store.ts";

export const MUTATIONS = [
  {
    name: "reversal-population-narrows-to-active",
    why: "⭐ THE DEFECT VERBATIM, AND THE MUTATION THAT MATTERS MOST — the reversal path goes back "
       + "to `listActiveByUser`, whose DAL filter is literally `status: \"ACTIVE\"`, so a FULFILLED "
       + "grant becomes INVISIBLE TO THE QUERY again and a refunded qualifying bet clears the "
       + "bonus at zero risk. This mutation removes the FIX, not the symptom.",
    file: BONUS,
    from: "  const reversible = await db.bonusGrant.listReversibleByUser(userId);",
    to: "  const reversible = await db.bonusGrant.listActiveByUser(userId);",
    check: "1.5 · ★★ THE REFUND RE-LOCKS IT — the grant is ACTIVE again, not FULFILLED",
  },
  {
    name: "fulfilment-zeroes-the-remainder-again",
    why: "🔴 THE CRUX — fulfilment erases the number the fix needs. `remainingTzs` returns to 0 on "
       + "FULFILMENT, so \"how much cash did this grant unlock?\" becomes unanswerable and the "
       + "re-lock has nothing to move. The grant would still return to ACTIVE while the money "
       + "stayed withdrawable — the gap open, with a re-lock that looks like it ran.",
    file: BONUS,
    from: `{ wageredTzs: newWagered, remainingTzs: moved, status: "FULFILLED", fulfilledAt: new Date().toISOString() }`,
    to: `{ wageredTzs: newWagered, remainingTzs: 0, status: "FULFILLED", fulfilledAt: new Date().toISOString() }`,
    check: "1.4 · ⭐ THE FIX · a FULFILLED grant KEEPS remainingTzs — the only record of what it converted",
  },
  {
    name: "relock-is-a-clawback",
    why: "🔴 THE FIX ALI EXPLICITLY FORBADE — the withdrawable balance is debited and the bonus "
       + "wallet is NOT credited, so the player is simply poorer. \"NOTHING IS EVER CLAWED BACK\" "
       + "is the ruling, and this is the edit that violates it while every status assertion in "
       + "the suite still passes.",
    file: BONUS,
    from: "{ balance: -relock, bonusBalance: relock }",
    to: "{ balance: -relock }",
    check: "1.9 · ★★★ NOTHING WAS CLAWED BACK — total holdings are unchanged to the shilling",
  },
  {
    name: "relock-drives-the-balance-negative",
    why: "the clamp to what the player actually holds is dropped, so a short re-lock asks for more "
       + "than the balance. The atomic guard then refuses the whole movement and the grant is left "
       + "FULFILLED — the gap stays open for exactly the player who already spent the money, which "
       + "is the one case where it matters most.",
    file: BONUS,
    from: "    const relock = Math.min(owed, available);",
    to: "    const relock = owed;",
    check: "2.2 · ★★ it re-locks what EXISTS — 4,000 — and NEVER drives the balance negative",
  },
  {
    name: "the-shortfall-is-rounded-away",
    why: "⚠️ THE SILENT ABSORB — the gap between what was owed and what came back is recorded as "
       + "zero. The money is right and the platform can no longer say that an obligation went "
       + "undischarged. A re-lock that quietly moves less than it claims is the same class of "
       + "defect as the one being fixed.",
    file: BONUS,
    from: "    const shortfall = owed - relock;",
    to: "    const shortfall = 0;",
    check: "2.7 · ★★ THE SHORTFALL IS AUDITED BY NAME — 6,000, visible rather than silently absorbed",
  },
  {
    name: "remaining-holds-the-owed-figure",
    why: "the re-locked grant claims the FULL owed amount rather than what reached the bonus "
       + "wallet, so `bonusBalance == Σ ACTIVE remainingTzs` breaks by exactly the shortfall — the "
       + "trial balance starts drifting on a wallet nobody is looking at.",
    file: BONUS,
    // ⚠️ RE-ANCHORED once the update gained `expiresAt` — the original anchor rotted the moment
    // the expiry fix landed, and red:bonus-relock reported it as a HARNESS ERROR rather than
    // quietly editing nothing. This is exactly why the anchors are declared as data.
    from: `{ wageredTzs: newWagered, remainingTzs: relock, status: "ACTIVE", fulfilledAt: null, expiresAt: relockExpiresAt }`,
    to: `{ wageredTzs: newWagered, remainingTzs: owed, status: "ACTIVE", fulfilledAt: null, expiresAt: relockExpiresAt }`,
    check: "2.3 · ⛔ remainingTzs is the RE-LOCKED figure (4,000), NOT the owed one",
  },
  {
    name: "every-refund-relocks",
    why: "⭐ THE OVER-CORRECTION, and the reason this suite carries positive controls. The ACTIVE "
       + "short-circuit is removed, so an ordinary refund against a grant that never fulfilled "
       + "also runs the re-lock — moving money on the commonest path in the product and breaking "
       + "the invariant on every void. A fix that re-locks TOO MUCH is also a defect.",
    file: BONUS,
    from: `    if (g.status === "ACTIVE" || newWagered >= g.wagerRequiredTzs) {`,
    to: "    if (newWagered >= g.wagerRequiredTzs) {",
    check: "3.2 · ⛔ …and NO money moved — the common path is untouched by this fix",
  },
  {
    name: "cancelled-grants-become-reversible",
    why: "⛔ THE POPULATION WIDENS TOO FAR — a CANCELLED grant enters the reversal set, so a later "
       + "refund finds its leftover progress, drops it below the requirement and RESURRECTS the "
       + "grant to ACTIVE. Its remainder was REMOVED from the player, not converted, so there is "
       + "nothing to return: this mints bonus money out of a cancellation. ⚠️ Targets store.ts, "
       + "not prisma-dal.ts — the suite runs against the in-memory mirror.",
    file: STORE,
    from: `        .filter((g) => g.userId === userId && (g.status === "ACTIVE" || g.status === "FULFILLED"))`,
    to: `        .filter((g) => g.userId === userId && g.status !== "QUEUED")`,
    check: "4.2 · ★★ a later refund does NOT resurrect it — the reversal population excludes CANCELLED",
  },
  {
    // ⛔ THE SECOND HALF OF THE MUTATION ABOVE, not a mutation of its own — applied together with
    // it, never alone. ⭐ red:bonus-relock FOUND THIS, AND IT IS THE MORE USEFUL HALF OF THE
    // FINDING: widening the STORE filter alone changes nothing observable, because
    // reverseWageringCore does not iterate the query result directly — it partitions it into an
    // ACTIVE list and a FULFILLED list and walks only those two. So the SERVICE partition is the
    // real control and the store filter is defence-in-depth. A mutation of either layer alone
    // reports a miss against a platform that is safe; the control is two-layered, so the mutation
    // must be too.
    name: "the-partition-admits-everything-that-is-not-active",
    combineInto: "cancelled-grants-become-reversible",
    why: "the service-layer partition stops naming FULFILLED and takes everything that is not "
       + "ACTIVE, which is the half that actually reaches the re-lock loop. Without it the store "
       + "filter widening is invisible and the harness would credit the guard for a catch it "
       + "never made.",
    file: BONUS,
    from: `  const cleared = reversible.filter((g) => g.status === "FULFILLED").reverse(); // newest-first`,
    to: `  const cleared = reversible.filter((g) => g.status !== "ACTIVE").reverse(); // newest-first`,
  },
  {
    name: "the-admin-ledger-paints-converted-cash-as-remaining",
    why: "the suppression on the ONE unfiltered reader is removed, so the operator ledger shows a "
       + "\"remaining bonus\" figure against a FULFILLED grant whose money is already real cash. A "
       + "false money statement on an operator surface, created by the fix itself — which is why "
       + "it had to ship in the same commit.",
    file: BONUS,
    from: `      remainingTzs: g.status === "ACTIVE" || g.status === "QUEUED" ? g.remainingTzs : null,`,
    to: "      remainingTzs: g.remainingTzs,",
    check: "5.1 · ★★ the FULFILLED grant's remaining figure is SUPPRESSED",
  },
  {
    name: "the-relock-paints-as-incoming",
    why: "🔴 THE ROW TYPE FLIPS TO BONUS_CREDIT — and this is not cosmetic. `wallet/page.tsx` maps "
       + "BONUS_CREDIT to \"deposit\", so a DEBIT of the player's withdrawable balance renders as "
       + "money arriving; and `report-money.ts` sums the ABSOLUTE value of every BONUS_CREDIT into "
       + "bonus cost, so a negative one INFLATES the cost it should reduce. A loss painted as a "
       + "gain, on a money screen, plus an overstated cost in the operator's P&L.",
    file: BONUS,
    from: `        type: "ADJUSTMENT_DEBIT",`,
    to: `        type: "BONUS_CREDIT",`,
    check: "1.13 · ⛔ …and NOT as a negative BONUS_CREDIT",
  },
  {
    name: "the-relock-explains-nothing",
    why: "the description is dropped, and `wallet-client` renders `tx.description ?? tx.type` — so "
       + "the player sees the bare words ADJUSTMENT_DEBIT against money leaving their withdrawable "
       + "balance, with no statement that it was re-locked rather than taken. The money is right "
       + "and the product has stopped being able to say why it moved.",
    file: BONUS,
    from: `        description: "Bonus re-locked — the refunded bet did not complete the wagering",`,
    to: "        description: null,",
    check: "1.14 · the row explains itself in the words the player actually reads",
  },
  {
    // ⭐ BOTH MUTATIONS BELOW GUARD FINDINGS THAT THE FIRST DRAFT OF THIS FIX GOT WRONG, and
    // both were found by adversarially re-reading the diff rather than by writing it. They are
    // the most valuable rows in this file for that reason.
    name: "the-player-summary-leaks-converted-cash",
    why: "🔴 THE SECOND UNFILTERED READER, WHICH THE FIRST DRAFT DENIED EXISTED. toGrantView stops "
       + "suppressing the field, so getBonusSummary — built from listByUser, with NO status "
       + "filter — reports a FULFILLED grant's converted cash as locked bonus money to the "
       + "PLAYER. Today one filter in a different file (app/wallet/page.tsx) hides it; deleting "
       + "that single line would ship the defect with tsc and every bonus suite green.",
    file: BONUS,
    // ⚠️ ANCHORED WITH THE FOLLOWING LINE ON PURPOSE. The admin-ledger suppression is the SAME
    // expression at SIX spaces of indent, and it CONTAINS this four-space string as a substring —
    // so the bare line resolves TWICE and `red-anchor.mjs` rightly refuses to inject.
    // `progressPct,` on the next line exists only in `toGrantView`.
    // ⭐ red:bonus-relock FOUND THIS, and it found it the right way: it printed a HARNESS ERROR
    // rather than a catch it never made. An anchor that matches twice would inject into whichever
    // site came first and leave the other standing — the gate might then go red for a different
    // reason than this row claims, while the harness printed PASS.
    from: `    remainingTzs: g.status === "ACTIVE" || g.status === "QUEUED" ? g.remainingTzs : null,
    progressPct,`,
    to: "    remainingTzs: g.remainingTzs,\n    progressPct,",
    check: "7.2 · ★★ …and its remaining figure is SUPPRESSED AT THE SOURCE",
  },
  {
    name: "the-relock-inherits-a-dead-expiry",
    why: "🔴 A CLAWBACK BY THE BACK DOOR — the re-lock keeps the grant's original expiresAt. A "
       + "grant that fulfils near its 30-day expiry and is re-locked after that date returns to "
       + "ACTIVE with a DEAD expiry, and expireActiveGrants (status ACTIVE AND expiresAt < now) "
       + "removes the re-locked money on its very next pass. The player ends with NEITHER the "
       + "cash NOR the bonus — the exact outcome the ruling forbids, reached through a different "
       + "door. Every status and money assertion in §1 and §2 still passes under this mutation.",
    file: BONUS,
    from: `    const relockExpiresAt = g.expiresAt
      ? new Date(Math.max(Date.parse(g.expiresAt), Date.now() + relockExpiryDays * 86_400_000)).toISOString()
      : null;`,
    to: "    const relockExpiresAt = g.expiresAt;",
    check: "8.4 · ★★★ THE EXPIRY SWEEP DOES NOT TAKE IT",
  },
];
