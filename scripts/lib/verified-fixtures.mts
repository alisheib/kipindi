/**
 * TEST FIXTURES ARE VERIFIED PLAYERS — importing this module makes them so.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NARROWER THAN IT WAS ─────────────────────────────────
 * From 2026-09-13 identity is asked before money is WITHDRAWN and before nothing else
 * (`assertIdentityForPayout`, `src/lib/server/kyc-gate.ts`; docs/COMPLIANCE-DECISIONS.md
 * 2026-09-13). A suite that pays a fixture out would otherwise measure the identity gate
 * instead of its own rule, so this import keeps it honest about WHY its payouts succeed.
 *
 * ⚠️ IT WAS WRITTEN FOR A WIDER GATE, AND THAT REASON IS NOW FALSE. From 2026-09-05 to
 * 2026-09-13 a player could not deposit, bet or withdraw until an officer approved them; 59
 * suites went red at once on fixtures the product could not produce, and this module was the
 * fix. The deposit and bet gates are DELETED, so for a suite that only deposits, bets or
 * credits a bonus this import is now inert — harmless, and no longer a reason. ⛔ Do not cite
 * it as "deposit requires identity" or "a bet requires identity": both are false from 2026-09-13.
 *
 * ⚠️ IT DOES NOT CONFIRM AN EMAIL. Since 2026-10-07 a withdrawal also needs a CONFIRMED address (owner ruling;
 * `withdraw()` asks after identity), so a suite that pays a fixture out sets `emailVerifiedAt` on that fixture itself —
 * as withdrawal-fee, concurrency and bonus-withdrawable do — and says why beside it.
 *
 * ⛔ WHAT THIS IS NOT. It is NOT a bypass, and there is a bright line here worth stating.
 * It writes a real APPROVED `KycSubmission` row through the ordinary store, so the gate
 * runs in full and finds a verified player — exactly as if each fixture had been written
 * that way by hand. It touches no product code, it is opt-in per suite by an import that
 * is visible at the top of the file, and it cannot be reached from a running platform.
 * ⛔ Nothing here may ever weaken `assertIdentityForPayout`, add a NODE_ENV branch to it, or
 * teach it about tests. A gate that knows it is being tested cannot fail.
 *
 * ⛔ AND THE SUITES THAT TEST THE LADDER ITSELF MUST NOT IMPORT THIS. `kyc-gate.test.mts`,
 * `deposit-gate-return.test.mts` and `failure-reasons.test.mts` build their own fixtures
 * deliberately — including UNVERIFIED ones — because what an unverified account may and may
 * not do is the thing they measure. Importing this there would make them assert a rule against
 * a population that cannot break it, which is the "a gate that chooses its own population
 * cannot fail" defect.
 *
 * ── HOW ────────────────────────────────────────────────────────────────────────────────
 * It wraps `db.user.create` once, at import time, so a suite needs a single line and no
 * edit to its fixture bodies. ⚠️ The wrap is IDEMPOTENT: two imports in one process (a
 * suite importing another suite's helper) must not double-wrap and write the row twice.
 *
 * ── WHICH KIND OF APPROVAL (2026-10-10, typed-only KYC) ────────────────────────────────
 * From that day there are two: a player's AUTOMATIC approval from typed details (`autoApprovedAt`,
 * no officer), and an officer's approval on the document's photos (`photoVerifiedAt` — the agent
 * programme's identity gate, `photoIdentityVerified`). Every fixture here is the SECOND kind, the one
 * every account had before that day (the migration backfills `photoVerifiedAt` from `approvedAt`):
 *   · an AGENT fixture must still pass the agent gates it passed before — ruling 4 of 2026-10-10 is
 *     that agents keep everything as before — and an automatic approval never passes them;
 *   · an automatic approval would put every fixture of every suite on the officers' post-check list
 *     (`listUncheckedAutoApprovals`), a population nobody asked to change.
 * ⚠️ `reviewerId` STAYS NULL, deliberately: any reviewer on a row is OFFICER PROVENANCE, which sends a
 * typed send to an officer instead of approving it. A suite that spreads this row into a restart to
 * test the instant path would inherit it and measure the routing rule instead of its own.
 * ⭐ AND THE PHOTOS BEHIND THE STAMP ARE ON FILE. The agent gate (`photoIdentityVerified`,
 * `src/lib/server/agent-identity.ts`) asks three facts, not one: APPROVED now, `photoVerifiedAt`, AND the full
 * photo set for the document still on the row (`photoSetComplete`) — because a stamp with no photos behind it is
 * exactly the shape the migration's backfill can leave on a row restarted before the release, and the product
 * refuses to count it. So every fixture carries the NIDA set — front, back and a selfie — as tiny real PNGs with
 * their sniffed mime and byte count, exactly as `attachDocument` records them. A fixture with the stamp and no
 * photos would be a row the product cannot produce, and an agent suite would measure the backfill rule instead of
 * its own. ⛔ AND UPLOADED NO LATER THAN THE STAMP (2026-10-10, review R5.2): a stamp counts only over photos uploaded
 * at or before it (`photoSetStampedBy`, `src/lib/id-documents.ts`) — an officer approves the photos already on file —
 * so `fixturePhotoSet` takes the stamp's own instant, never a later one.
 * ⛔ Every column is named. These rows are BUILT, not spread, and the DAL writes an omitted field as null.
 */
import { db } from "../../src/lib/server/store.ts";

type UserLike = { id: string; role?: string };

/** A real 1×1 PNG (magic bytes and all) — what `validateDocImage` accepts; 70 bytes decoded (96 base64 characters,
 *  two of them padding — `validateDocImage`'s own arithmetic). */
const FIXTURE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** The full NIDA photo set — front, back and the selfie (`ID_DOC_SPECS.NIDA.requiredSlots`) — uploaded at `stampedAt`,
 *  the officer's photo stamp (`photoVerifiedAt`): never after it, or the stamp would not stand over them (`photoSetStampedBy`). */
function fixturePhotoSet(stampedAt: string) {
  return (["NIDA_FRONT", "NIDA_BACK", "SELFIE"] as const).map((docType) => ({
    docType, storageKey: FIXTURE_PNG, uploadedAt: stampedAt, mimeType: "image/png", sizeBytes: 70,
  }));
}

/** The approval columns every fixture here carries — an officer's kind of approval at `now` (see the header). */
function officerApprovalStamps(now: string) {
  return {
    photoVerifiedAt: now,
    autoApprovedAt: null,
    autoFlags: [] as string[],
    postCheckedAt: null,
    postCheckedById: null,
    priorIdentities: [],
  };
}

/**
 * Approve one account explicitly — for the staff accounts the automatic wrap skips.
 *
 * ⚠️ IT WAS WRITTEN FOR AN OFFICER WHO HAD TO BET. `officer-conflict` proves an officer
 * cannot resolve a market they staked on, so its ADMIN fixture places a real bet — and from
 * 2026-09-05 to 2026-09-13 an account with no approved identity could not. Since 2026-09-13 a
 * stake asks no identity question, so for a BET this call is now inert; it still matters for a
 * staff fixture that is PAID OUT, and two suites call it (`officer-conflict`, `two-admin-policy`).
 * Widening the automatic wrap to cover staff would have been quieter and worse: staff accounts
 * appear in KYC queues and self-review checks across other suites, and giving all of them
 * submissions changes populations nobody asked to change. One named call per suite that needs
 * it is the smaller blast radius.
 */
export async function approveFixtureIdentity(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.kyc.upsert({
    id: `kyc_${userId}`, userId, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: `199001018${String(Date.now()).slice(-11)}`, idExpiry: null,
    idVerifiedAt: now, fullName: "Fixture Officer", dob: "1990-01-01", documents: fixturePhotoSet(now), extraRequests: [],
    reviewerId: null, reviewedAt: now, submittedAt: now, approvedAt: now,
    ...officerApprovalStamps(now),
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
    // ⚠️ NON-STAFF ONLY. Staff accounts are created by these suites too, and an officer with
    // a KYC submission of their own is a state the product does not produce — worse, some
    // suites assert that an officer cannot review their own identity, which needs there to
    // be no submission to find.
    //
    // ⭐ `AGENT` JOINS `PLAYER` HERE (2026-09-06), and the rule this encodes is "not staff",
    // not "player". `AGENT` is explicitly NOT a staff role — `isStaffRole` excludes it,
    // `DEFAULT_GRANTS` cannot even represent it, and login/register route it into the player
    // app exactly like a PLAYER. It is a non-staff account that deposits, bets and earns, so
    // it belongs in the verified population for the same reason a player does. It was simply
    // not a fixture role anywhere when this wrap was written.
    //
    // ⛔ HOW ITS ABSENCE PRESENTED, because the symptom named neither KYC nor roles: referral
    // fixtures became AGENTs (a code only recruits if its owner may refer), the wrap skipped
    // them, their bonus grants landed `PENDING_KYC`, and three suites failed with
    // "referrer rewarded … bonus=0". Including the CONTROL that exists to prove an eligible
    // referrer IS paid — which is exactly the control earning its place.
    // ⚠️ That `PENDING_KYC` grant hold was deleted on 2026-09-13 with the deposit and bet gates. An
    // AGENT stays in the wrap for the gate that remains: a paid-out AGENT must clear identity too.
    if ((u.role ?? "PLAYER") === "PLAYER" || u.role === "AGENT") {
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
        // ⭐ The photo set behind the officer's stamp (2026-10-10) — see the header and `fixturePhotoSet`.
        documents: fixturePhotoSet(now),
        extraRequests: [],
        reviewerId: null,
        reviewedAt: now,
        submittedAt: now,
        // The first-approval stamp — the half of `approvedEver` the withdrawal gate is built around.
        // The product writes it with every first approval, so an APPROVED fixture carries it too.
        approvedAt: now,
        // ⭐ An officer's kind of approval, the agent gate's stamp included — see the header (2026-10-10).
        ...officerApprovalStamps(now),
        createdAt: now,
        updatedAt: now,
      });
    }
    return created;
  }) as typeof db.user.create;
}
