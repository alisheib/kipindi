/**
 * TEST FIXTURES ARE VERIFIED PLAYERS — importing this module makes them so.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
 * From 2026-09-05 a player may not deposit, bet or withdraw until an officer has approved
 * their identity (`src/lib/server/kyc-gate.ts`). Nearly every suite in `scripts/` builds
 * its players with a local `fundedUser()`-style helper written years before that rule, so
 * every one of them created an UNVERIFIED account and then asserted things about money.
 * 59 suites went red at once, and not one of the failures was about the thing the suite
 * tests: they were all the identity gate, correctly refusing fixtures that represent
 * players who could never exist in the product.
 *
 * ⛔ WHAT THIS IS NOT. It is NOT a bypass, and there is a bright line here worth stating.
 * It writes a real APPROVED `KycSubmission` row through the ordinary store, so the gate
 * runs in full and finds a verified player — exactly as if each fixture had been written
 * that way by hand. It touches no product code, it is opt-in per suite by an import that
 * is visible at the top of the file, and it cannot be reached from a running platform.
 * ⛔ Nothing here may ever weaken `assertKycForMoney`, add a NODE_ENV branch to it, or
 * teach it about tests. A gate that knows it is being tested cannot fail.
 *
 * ⛔ AND THE SUITES THAT TEST THE GATE ITSELF MUST NOT IMPORT THIS. `kyc-gate.test.mts`,
 * `deposit-gate-return.test.mts` and `failure-reasons.test.mts` build their own fixtures
 * deliberately — including UNVERIFIED ones — because refusal is the thing they measure.
 * Importing this there would make them assert a rule against a population that cannot
 * break it, which is the "a gate that chooses its own population cannot fail" defect.
 *
 * ── HOW ────────────────────────────────────────────────────────────────────────────────
 * It wraps `db.user.create` once, at import time, so a suite needs a single line and no
 * edit to its fixture bodies. ⚠️ The wrap is IDEMPOTENT: two imports in one process (a
 * suite importing another suite's helper) must not double-wrap and write the row twice.
 */
import { db } from "../../src/lib/server/store.ts";

type UserLike = { id: string; role?: string };

/**
 * Approve one account explicitly — for the staff accounts the automatic wrap skips.
 *
 * ⚠️ IT EXISTS BECAUSE ONE SUITE HAS AN OFFICER WHO MUST BE ABLE TO BET.
 * `officer-conflict` proves an officer cannot resolve a market they staked on, so its
 * ADMIN fixture has to place a real bet — and from 2026-09-05 an account with no approved
 * identity cannot. Widening the automatic wrap to cover staff would have fixed it too, and
 * more quietly: staff accounts appear in KYC queues and self-review checks across other
 * suites, and giving all of them submissions changes populations nobody asked to change.
 * One named call in the one suite that needs it is the smaller blast radius.
 */
export async function approveFixtureIdentity(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.kyc.upsert({
    id: `kyc_${userId}`, userId, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: `199001018${String(Date.now()).slice(-11)}`, idExpiry: null,
    idVerifiedAt: now, fullName: "Fixture Officer", dob: "1990-01-01", documents: [],
    reviewerId: null, reviewedAt: now, submittedAt: now, approvedAt: now,
    createdAt: now, updatedAt: now,
  });
}

const MARK = Symbol.for("50pick.verifiedFixtures.wrapped");
const g = globalThis as unknown as Record<symbol, boolean>;

if (!g[MARK]) {
  g[MARK] = true;
  const original = db.user.create.bind(db.user);
  let seq = 0;

  db.user.create = (async (u: UserLike) => {
    const created = await original(u as never);
    // ⚠️ PLAYERS ONLY. Staff accounts are created by these suites too, and an officer with
    // a KYC submission of their own is a state the product does not produce — worse, some
    // suites assert that an officer cannot review their own identity, which needs there to
    // be no submission to find.
    if ((u.role ?? "PLAYER") === "PLAYER") {
      const now = new Date().toISOString();
      // ⛔ A UNIQUE `idNumber` PER FIXTURE. One document, one account is enforced by a
      // partial unique index and by `findActiveByIdNumber`; a shared literal here would
      // make the second player in any suite collide, which would look like a duplicate-
      // identity bug in code that never touched identity.
      const n = String(++seq).padStart(11, "0");
      await db.kyc.upsert({
        // ⛔ `kyc_<userId>` — THE SAME ID THE SUITES' OWN FIXTURES USE, and that is the
        // whole trick. A distinct id (`kycfx_…`) left suites that write their own row with
        // TWO submissions for one player; `findByUserId` returns the newest by `createdAt`,
        // both were stamped in the same millisecond, and the winner was a coin flip. It
        // surfaced as one intermittently-failing assertion in `withdrawal-fee`, not as an
        // error. Sharing the id means a suite's own upsert REPLACES this row instead of
        // racing it — including when the suite deliberately wants a non-APPROVED state.
        id: `kyc_${u.id}`,
        userId: u.id,
        status: "APPROVED",
        rejectReason: null,
        rejectNote: null,
        idType: "NIDA",
        idNumber: `199001019${n}`,
        idExpiry: null,
        idVerifiedAt: now,
        fullName: "Fixture Player",
        dob: "1990-01-01",
        documents: [],
        reviewerId: null,
        reviewedAt: now,
        submittedAt: now,
        // The column the WITHDRAW arm of the gate reads. A fixture approved without it is
        // a player who can bet and cannot be paid — a state the product never produces.
        approvedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    return created;
  }) as typeof db.user.create;
}
