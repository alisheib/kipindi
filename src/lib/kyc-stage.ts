/**
 * THE ROSTER'S KYC STAGE — one derived word per player, from four scalars and one sum.
 *
 * ⭐ WHY IT EXISTS, IN THE OWNER'S OWN WORDS (2026-09-11): *"in roster i can see
 * players as admin but those who uploaded kyc can i have a unique tag for them …
 * because it says pending kyc always how i know who uploaded and how not,
 * especially with so many users coming in daily."*
 *
 * He is right, and the cause is not cosmetic. `/admin/players` renders
 * `<AccountStatusBadge status={u.status} />` — the ACCOUNT column — so four
 * different people read one identical word:
 *
 *   · registered, never opened KYC        → no KycSubmission row AT ALL
 *   · opened it, uploaded nothing          → IN_PROGRESS, 0 documents
 *   · uploaded everything, never submitted → IN_PROGRESS, documents > 0   ⭐
 *   · submitted, waiting on US             → PENDING_REVIEW               ⭐
 *
 * The two starred rows are the request. Nothing in the console showed them
 * apart, and the third is invisible platform-wide: `listPendingKyc`
 * (kyc-service.ts) reads only PENDING_REVIEW + ADDITIONAL_INFO_REQUIRED, so
 * a player who uploaded every photo and never pressed Confirm is in no queue,
 * on no screen, and nobody chases them.
 *
 * ⛔ THIS MODULE IS PURE, IMPORTS TWO MODULES — `./kyc-approval` and (2026-09-13, for
 * `isFinalRefusalCell`) `./kyc-refusal`, both pure and import-free — AND CARRIES NO "use client".
 * It is called from src/app/admin/players/page.tsx (a SERVER component) and
 * imported type-only by src/components/admin/status-badge.tsx, which client
 * components reach. A "use client" helper called from a server component takes
 * down every page that imports it while BOTH `tsc` and `next build` stay green —
 * the client/server boundary is a RUNTIME contract. The status union below is
 * declared structurally rather than imported from @/lib/server/store for the same
 * reason, and it lets the derivation be unit-tested without booting a store.
 *
 * ⛔ WHY NOT `KycSubmission.status` ALONE — this is the whole point.
 * `attachDocument` (kyc-service.ts) spreads `...k` and NEVER writes status; its
 * only guard refuses PENDING_REVIEW / APPROVED. Submit is a separate explicit
 * button. So IN_PROGRESS spans "opened the page and did nothing" through
 * "attached every required photo and never pressed Confirm".
 *
 * ⛔ WHY NOT `User.status`, IN EITHER DIRECTION. Nothing demotes it on REJECT or on
 * force-reverify, and responsible-gambling.ts overwrites it with no KYC
 * precondition — so ACTIVE+REJECTED and SELF_EXCLUDED+IN_PROGRESS are both
 * reachable. An ACCOUNT fact cannot answer an IDENTITY question, which is exactly
 * why the roster had been wrong. (From 2026-09-13 new accounts are created ACTIVE
 * and the migration normalised PENDING_KYC → ACTIVE, so that column no longer even
 * pretends to.)
 *
 * ── THE MONEY DIMENSION (2026-09-13) ─────────────────────────────────────────
 *
 * ⭐ WHY THE STAGE NOW READS MONEY. From 2026-09-13 identity is asked before a
 * WITHDRAWAL and before nothing else (docs/COMPLIANCE-DECISIONS.md, 2026-09-13). The
 * ladder is register → confirm email → deposit and play → verify identity →
 * withdraw, so a player deposits and plays with NO submission at all. "Nothing yet"
 * used to be the dormant majority, holding nothing. From that date it would also
 * cover a player holding real money we hold no identity for — in NO queue, because
 * `listPendingKyc` still reads only PENDING_REVIEW + ADDITIONAL_INFO_REQUIRED. The
 * ruling turns that blind spot into a liability nobody can see.
 *
 * ⛔ SO IT IS AN EIGHTH STAGE IN THIS DERIVATION — `funded_nothing_yet` — AND NOT A
 * CONCEPT BESIDE IT. The roster's column, its tallies and its filter all read
 * `kycStage`, so they gain the new group together and a drift between them stays
 * unexpressible. A parallel "is this player funded?" predicate on the page would
 * re-open exactly the three-renderings defect this module was built to close.
 *
 * ⛔ MONEY SPLITS ONE ARM ONLY: "nothing sent" becomes "nothing sent, holding
 * nothing" or "nothing sent, holding money". Every other stage is a fact about the
 * FILE, and money does not change whose move a file is — `with_us` is `with_us` at
 * TZS 0 and at TZS 5,000,000. `test:kyc-stage` proves that over the whole product
 * space rather than trusting this sentence.
 *
 * ⛔ "VERIFIED" MEANS `approvedEver` — the withdrawal gate's own predicate
 * (src/lib/kyc-approval.ts). A restarted, once-approved player holding money can
 * still withdraw; calling them funded-and-unverified would send an officer after a
 * person the gate already lets through.
 */
import { approvedEver } from "./kyc-approval";
import { isFinalRefusal } from "./kyc-refusal";

/** The six arms of the `KycStatus` enum in prisma/schema.prisma. Declared
 *  structurally, not imported — see the header. `test:kyc-stage` parses the enum
 *  out of the schema and asserts this union is exhaustive over it, so a seventh
 *  arm goes red there as well as failing to compile in `kycStage` below. */
export type KycStatusToken =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ADDITIONAL_INFO_REQUIRED";

/**
 * The four FILE facts the tag is allowed to read. The fifth input — money — is a
 * separate argument; see `KycMoney` for why it cannot be a field here.
 *
 * ⛔ `idVerifiedAt` IS DELIBERATELY ABSENT. It means "format accepted and
 * unique", never "an authority confirmed this identity" (prisma/schema.prisma,
 * docs/IDENTITY-POLICY.md), and scripts/kyc-status-honesty.test.mts exists
 * because a green "ID verified" pill was once bound to that exact field and was
 * false in all three languages. Splitting "opened it" from "typed their number"
 * also gives an officer no different action.
 *
 * ⛔ `extraRequests` IS ABSENT, AND NOT FOR TIDINESS. It is a `Json?` column whose
 * entries carry a `storageKey` that is a FULL base64 data URL under inline
 * storage — selecting it for a whole population pulls image bytes through a
 * roster render. All three ADDITIONAL_INFO_REQUIRED sub-states mean the same
 * thing to a roster scanner ("with the player"), so the column loses nothing;
 * they stay on /admin/players/[id], which reads one row at a time.
 */
export type KycStageFacts = {
  status: KycStatusToken;
  /**
   * How many document slots this submission holds.
   *
   * ⛔ ONLY EVER COMPARED TO ZERO — never to a required total, and the
   * restriction is a ruling, not an oversight. kyc-service.ts puts it in
   * those words: *"`documents.length >= 3` was true of a NIDA and is a lie about
   * a passport"* — a NIDA needs 3 slots, a passport / licence / voter card 2.
   * Completeness is `missingSlots`' job inside `submitForReview`, and its OUTPUT
   * is `submittedAt`, which is a separate witness below.
   */
  documentCount: number;
  /** Written in exactly ONE place — the transition INTO PENDING_REVIEW, which
   *  `missingSlots` gates — and cleared in exactly one, `startKyc`. Proof that a
   *  COMPLETE file once reached us. */
  submittedAt: string | null;
  /** 🔴 SET ONCE, NEVER CLEARED — `startKyc` explicitly carries it through a
   *  reset ("THE ONE FIELD THIS RESET MUST NOT CLEAR"). The only witness that
   *  survives both a restart and erasure. */
  approvedAt: string | null;
};

/**
 * THE MONEY DIMENSION (2026-09-13) — what the account holds, as one number.
 *
 * ⛔ A SEPARATE, REQUIRED ARGUMENT, NOT A FIELD ON `KycStageFacts`, and the reason is
 * the most common production input: a player with NO KycSubmission row (`facts ===
 * null`) still has a wallet, and from 2026-09-13 usually a funded one. A field on the
 * file's facts cannot describe money for a file that does not exist. REQUIRED because
 * an optional money argument is one the next call site forgets — and the funded stage
 * then silently never appears, which is the blind spot this dimension exists to close.
 *
 * ⛔ `MONEY_NOT_APPLIED` IS NOT ZERO. It is a viewer who may not read standing balances
 * (RBAC: SUPPORT reads `money.figures` MASKED — movements, never totals — and "holds
 * money" is a standing-balance fact), or a page whose wallet read failed. The
 * derivation then declines to split, and "Nothing yet" says only what it always said:
 * nothing sent. `{ heldTzs: 0 }` is the CLAIM "holds nothing"; a caller must never
 * write it for an account it could not read.
 *
 * ⚠️ A FROZEN or CLOSED wallet still holds money we owe (a freeze does not discharge
 * a debt — `readPlayerLiability` in house-ledger.ts), so the stage counts it. The
 * finance figure splits by wallet status instead; see `tallyHeldForUnverified`.
 */
export const MONEY_NOT_APPLIED = "not_applied" as const;
export type KycMoney = { heldTzs: number } | typeof MONEY_NOT_APPLIED;

/**
 * THE ONE DEFINITION OF "HOLDS MONEY" — `balance + hold`, exactly the per-wallet sum
 * `walletLiabilityTotal()` adds (src/lib/server/analytics.ts now calls THIS), so the
 * roster's funded stage, its `?funded=` axis and the finance "Held for unverified"
 * figure are one quantity and cannot drift apart.
 *
 * `hold` is money already on its way out (a withdrawal in flight or in AML review),
 * and it is still owed until it leaves. ⛔ `bonusBalance` is EXCLUDED — non-withdrawable
 * promotional credit, not a debt. ⚠️ For a never-approved account `hold` is in practice
 * zero, because the withdrawal gate refuses them — which is why the player's own
 * identity banner (kyc-gate-state.ts) can ask `balance > 0` and agree with this.
 * A missing wallet holds nothing.
 */
export function walletHeldTzs(w: { balance: number; hold?: number | null } | null | undefined): number {
  if (!w) return 0;
  return w.balance + (w.hold ?? 0);
}

/** Where this person's identity file stands. ⛔ NOT a re-spelling of KycStatus —
 *  REJECTED splits in two and IN_PROGRESS splits in two, which is the request; and
 *  "nothing sent" splits by money (2026-09-13). */
export type KycStage =
  | "nothing_yet"
  | "funded_nothing_yet"
  | "uploaded"
  | "with_us"
  | "more_needed"
  | "rejected_after_upload"
  | "rejected_no_docs"
  | "approved";

/**
 * ⭐ A SEPARATE TYPE, SO `tsc` PROVES `kycStage()` CANNOT EMIT IT. "The read
 * failed" is the PAGE's state, never the data's — the A-5 rule: a failed read
 * must never render as a fact, the same line players/page.tsx already draws for
 * wallets. ⛔ It is also NOT a filter value: a failed read is not a population,
 * and offering it would promise rows that do not exist.
 */
export type KycCell = KycStage | "unreadable";

/** Scan order = workflow order: what has not started (dormant, then holding money),
 *  what is with the player, what is with US, then the decided. ONE exported constant —
 *  the column, the filter's options, the guards and the live driver all read it, so the
 *  "three renderings of one enum" defect players/page.tsx records paying for cannot
 *  recur here. */
export const KYC_STAGES = [
  "nothing_yet",
  "funded_nothing_yet",
  "uploaded",
  "with_us",
  "more_needed",
  "rejected_after_upload",
  "rejected_no_docs",
  "approved",
] as const satisfies readonly KycStage[];

/** URL-token guard for `?kyc=`. An unrecognised value falls back to "" at the
 *  call site and matches everything, exactly as an unvalidated `?status=` does. */
export function isKycStage(v: string | undefined): v is KycStage {
  return !!v && (KYC_STAGES as readonly string[]).includes(v);
}

/** The two refusal stages — the only cells a refusal CODE can change the word of. */
export const REFUSAL_STAGES = ["rejected_after_upload", "rejected_no_docs"] as const satisfies readonly KycStage[];

/**
 * IS THIS REFUSAL FINAL? — a WORD question on a refusal stage, NOT a ninth stage (2026-09-13).
 *
 * ⭐ WHY. The roster read "Rejected · after upload" over an UNDERAGE refusal whose wallet was frozen, while
 * /admin/kyc/refused listed the same person as finally refused. "Rejected" reads as retryable; a FINAL code
 * (`isFinalRefusal`, src/lib/kyc-refusal.ts) froze the wallet and the player cannot resubmit. The chip must say
 * "Finally refused" (`REVIEW.kycRefusedFinal`), the word `kycStatusLabel` already uses for the same row.
 *
 * ⛔ NOT A STAGE, AND THAT IS A CONTRACT, NOT A SHORTCUT. `KYC_STAGES` is a closed set that the column, the
 * tallies, the filter, `status-badge.tsx`'s `Record<KycCell, …>` maps and `test:kyc-stage` (totality §1,
 * reachability §4f, money §8) all read; the derivation's inputs are four file facts and money, and a refusal
 * code is neither. A final refusal therefore stays in the `rejected_*` population — filtered and counted there —
 * and only its WORD changes. ⛔ Never true for a non-refusal cell, whatever `rejectReason` a stale row carries:
 * a restarted submission keeps no meaning from an old code.
 */
export function isFinalRefusalCell(cell: KycCell, rejectReason: string | null | undefined): boolean {
  return (REFUSAL_STAGES as readonly string[]).includes(cell) && isFinalRefusal(rejectReason);
}

/**
 * EVIDENCE THAT A COMPLETE FILE ONCE REACHED US.
 *
 * ⛔ USED ON THE `REJECTED` ARM ONLY, AND THAT RESTRICTION IS THE WHOLE POINT.
 * `startKyc` clears `documents` and `submittedAt` but EXPLICITLY PRESERVES
 * `approvedAt`. So on the IN_PROGRESS / NOT_STARTED arm `approvedAt` is a fact
 * about the PAST, not about this attempt: applying this helper there would paint
 * "Uploaded · not sent" over a once-approved player who has uploaded nothing
 * since restarting. That path is entirely shipped code — APPROVED →
 * `forceReverifyKyc` → officer REJECT → the player taps "start again", which
 * `startKyc` permits because the status is REJECTED.
 *
 * ⭐ On the REJECTED arm all three witnesses are honest AND the extra two are
 * load-bearing: erasure destroys document rows from ANY status, so
 * `documentCount` alone would call an officer-refused complete file "nothing
 * sent" once the retention window released its images.
 */
export function kycFileEverArrived(f: KycStageFacts): boolean {
  return f.documentCount > 0 || f.submittedAt !== null || f.approvedAt !== null;
}

/**
 * THE ONE ARM MONEY SPLITS — "nothing sent", told apart by what the account holds.
 *
 * ⛔ `approvedEver`, NEVER A BARE `approvedAt` READ. It is the withdrawal gate's own
 * predicate; writing the expression out again is how the page and the server
 * disagreed until 2026-09-13 (kyc-approval.ts). A once-approved account that has
 * restarted may withdraw, so it is not "funded and unverified" whatever it holds.
 * ⛔ `> 0` — COMPARED TO ZERO AND NOTHING ELSE. A threshold would be a policy, and no
 * ruling set one (ruling 2 of 2026-09-13: no deposit cap for unverified accounts).
 * ⛔ `MONEY_NOT_APPLIED` never splits — see `KycMoney`.
 */
function nothingSent(facts: KycStageFacts | null, money: KycMoney): "nothing_yet" | "funded_nothing_yet" {
  if (money === MONEY_NOT_APPLIED) return "nothing_yet";
  if (approvedEver(facts)) return "nothing_yet";
  return money.heldTzs > 0 ? "funded_nothing_yet" : "nothing_yet";
}

/**
 * THE DERIVATION. Total over `KycStageFacts | null` × `KycMoney`, deterministic,
 * side-effect free, and exhaustive by construction: the `switch` covers all six enum
 * arms and the `default` assigns `status` to `never`, so a seventh arm in
 * prisma/schema.prisma is a COMPILE ERROR here rather than a silent fall-through to
 * whichever word happens to be last.
 *
 * ⛔ `null` IS A REAL PRODUCTION INPUT, NOT AN ERROR — and from 2026-09-13 it is the
 * NORMAL state of a new player. No registration path writes a KycSubmission; the row
 * is created LAZILY on the first render of /profile/kyc, inside a `try {} catch {}`
 * that swallows failure, and since 2026-09-13 no sign-up door routes there (a new
 * player lands on their safe `next`, else `/wallet/deposit?welcome=new`). A player who
 * deposits and plays and never opens that page has NO ROW — "nothing sent" is the
 * truest possible reading, and their wallet decides which of the two words it gets.
 * ⛔ A FAILED READ IS NOT THIS. The caller renders "unreadable" — see the page.
 */
export function kycStage(facts: KycStageFacts | null, money: KycMoney): KycStage {
  if (facts === null) return nothingSent(null, money);
  const { status, documentCount } = facts;

  switch (status) {
    // Decided, and the only stage that needs no further reading. `reviewKyc`
    // APPROVE also stamps `approvedAt`.
    case "APPROVED":
      return "approved";

    // ⭐ THE ONLY STAGE WHERE THE BALL IS IN OUR COURT — which is the question an
    // officer actually opens this page to answer. It is also the only status that
    // GUARANTEES a complete document set: `submitForReview` refuses unless
    // identity is accepted, `missingSlots` is empty, the document is unexpired
    // and every officer-requested extra is filled. ⛔ Money never changes it: a
    // submitted file is ours to review at any balance.
    case "PENDING_REVIEW":
      return "with_us";

    // Two writers, one word: `reviewKyc` REQUEST_INFO and `forceReverifyKyc`.
    // All three sub-states mean the same thing to a roster scanner — waiting on
    // the PLAYER (`attachExtraDocument` never changes status, so "extras in, not
    // resubmitted" is still this).
    case "ADDITIONAL_INFO_REQUIRED":
      return "more_needed";

    // 🔴 THE SPLIT THAT ANSWERS THE OWNER DIRECTLY. REJECTED conflates two
    // opposite realities: `submitIdentityStep` refusing an underage or unmatched
    // applicant BEFORE any upload is possible, and an officer refusing a COMPLETE
    // file. One word for both would repeat, inside the rejection bucket, the very
    // defect being fixed — and would make every rejected applicant invisible to
    // the question "who has not given us their documents".
    // ⛔ Money does not split this arm: a refused person holding money is the S1
    // population, and it has its own report (/admin/kyc/refused) and its own
    // decision (src/lib/server/refused-funds.ts). A roster word must not stand in
    // for that decision.
    case "REJECTED":
      return kycFileEverArrived(facts) ? "rejected_after_upload" : "rejected_no_docs";

    // NOT_STARTED is schema-legal and effectively unreachable as a STORED value
    // in production (the column default is IN_PROGRESS and `startKyc` writes
    // IN_PROGRESS). It is handled as a live arm anyway: a migrated row can carry
    // it, and /auth/demo?kyc=none writes `{...existing, status:"NOT_STARTED"}`
    // which PRESERVES documents — so the pair (NOT_STARTED, documentCount > 0) is
    // constructible and must not fall through to a wrong word.
    case "NOT_STARTED":
    case "IN_PROGRESS":
      // ⛔ `documentCount` ALONE — NOT `kycFileEverArrived`. See that helper's
      // header: `startKyc` clears documents and `submittedAt` but preserves
      // `approvedAt`, so the three-witness rule HERE would falsely read a
      // restarted, once-approved player as having uploaded something.
      //
      // ⚠️ THIS ARM IS ONLY HONEST BECAUSE OF A FIX SHIPPED WITH IT. Until
      // 2026-09-11 `prisma-dal.ts`'s `kyc.upsert` guarded its document delete
      // with `if (k.documents?.length)`, so a restart left the previous attempt's
      // images attached in Postgres while the in-memory half cleared them. The
      // tag would have read "Uploaded · not sent" for a player who had uploaded
      // nothing. The two halves now agree; `test:kyc-restart-docs` (a real Postgres) is the
      // regression guard, and `test:kyc-stage` pins the tag on the in-memory half.
      return documentCount > 0 ? "uploaded" : nothingSent(facts, money);

    default: {
      // ⭐ EXHAUSTIVENESS, ENFORCED BY tsc. A seventh KycStatus arm stops
      // compiling here instead of quietly reading "Nothing yet" at runtime.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/* ── Whose move is a file in the officer queue? (2026-09-14) ───────────────── */

/**
 * The stage of one FULL submission row. The queue readers (`listPendingKyc`: /admin/approvals, the sidebar
 * badges, the workstation) hold `StoredKyc` rows with documents joined, not the narrow stage feed, so this
 * builds the four facts from the row and asks `kycStage` — never a hand-written status test beside it.
 * ⭐ `MONEY_NOT_APPLIED`, as /admin/kyc does for its file tables: money splits only "nothing sent", and no row
 * `listPendingKyc` returns is on that arm, so the word is the same for every viewer.
 */
export function kycStageOfFile(row: {
  status: KycStatusToken;
  documents: ReadonlyArray<unknown>;
  submittedAt: string | null;
  approvedAt?: string | null;
}): KycStage {
  return kycStage(
    { status: row.status, documentCount: row.documents.length, submittedAt: row.submittedAt, approvedAt: row.approvedAt ?? null },
    MONEY_NOT_APPLIED,
  );
}

/**
 * IS THIS FILE WAITING ON AN OFFICER? — the `with_us` arm, and the ONE rule every "waiting on us" count uses.
 *
 * 🔴 WHY IT EXISTS (audit session 95, register E-400 ⑦d). `listPendingKyc` returns PENDING_REVIEW AND
 * ADDITIONAL_INFO_REQUIRED, and an ADDITIONAL_INFO_REQUIRED file is the PLAYER's move (`attachExtraDocument`
 * never changes status; the player's resubmit returns it to us). /admin/approvals counted both as "KYC pending"
 * (4) while /admin/kyc said "2 with us", and its Approvals sidebar badge added the same two files that no
 * officer could clear. The workstation's "#1 of 2" had the same defect (E-399) and was fixed with its own
 * status test; all three now ask this.
 */
export function isFileWithUs(row: Parameters<typeof kycStageOfFile>[0]): boolean {
  return kycStageOfFile(row) === "with_us";
}

/* ── What money can and cannot move — for the PAGE's failed-read and RBAC states ── */

/** Stages that exist ONLY when money is applied. ⛔ Never offer one as a filter to a
 *  viewer without money rights, or after a failed wallet read: it would promise a
 *  population of zero, which reads as "nobody is funded" rather than "we could not
 *  look". `test:kyc-stage` proves no input reaches these under `MONEY_NOT_APPLIED`. */
export const MONEY_ONLY_STAGES = ["funded_nothing_yet"] as const satisfies readonly KycStage[];

/** Stages whose POPULATION moves when money is applied. After a failed wallet read, an
 *  officer with money rights cannot be told the size of either, so the page withholds
 *  both rather than printing a count that is right only by accident. */
export const MONEY_SPLIT_STAGES = ["nothing_yet", "funded_nothing_yet"] as const satisfies readonly KycStage[];

/**
 * Does money decide THIS file's word? ⭐ ASKED OF THE DERIVATION ITSELF, never
 * re-derived — a hand-written "no row or no documents" here would be the parallel
 * predicate the header forbids, and it would be wrong for the restarted,
 * once-approved player, whose word money cannot move. The page uses it to render
 * "unreadable" on exactly the rows a failed wallet read leaves undecidable, and on
 * no others.
 */
export function stageTurnsOnMoney(facts: KycStageFacts | null): boolean {
  return kycStage(facts, { heldTzs: 1 }) !== kycStage(facts, { heldTzs: 0 });
}

/* ── The roster's MONEY axis — `?funded=` (2026-09-13) ─────────────────────── */

/**
 * `held` = `walletHeldTzs > 0`; `none` = holds nothing (including no wallet row).
 * ⛔ A CLOSED SET, validated exactly as `?kyc=` is: a junk value must not filter the
 * roster to zero rows. ⛔ And offered only to a viewer with money rights whose wallet
 * read succeeded — the page owns that gate, because a failed read is not a population.
 * Independent of the stage on purpose: `?kyc=with_us&funded=held` is "submitted, and
 * money is waiting on our review", which no single stage word can say.
 */
export const FUNDED_AXIS = ["held", "none"] as const;
export type FundedAxis = (typeof FUNDED_AXIS)[number];

export function isFundedAxis(v: string | undefined): v is FundedAxis {
  return !!v && (FUNDED_AXIS as readonly string[]).includes(v);
}

/** One sum, one comparison to zero — the same `> 0` `nothingSent` asks. */
export function fundedAxisOf(heldTzs: number): FundedAxis {
  return heldTzs > 0 ? "held" : "none";
}

/* ── HELD FOR UNVERIFIED — the aggregate, as a pure reduction (2026-09-13) ──── */

export type HeldTally = { accounts: number; tzs: number };

/**
 * `accounts` / `tzs` are on the IDENTICAL basis to `walletLiabilityTotal()` — ACTIVE
 * wallets, `balance + hold` — so "Held for unverified" is a SUBSET of "Wallet
 * liability" and the two can be reconciled on a regulator's desk. `basisTotalTzs` is
 * that liability recomputed from the SAME snapshot, so `tzs <= basisTotalTzs` is a
 * checkable identity rather than a claim about two reads taken milliseconds apart.
 *
 * 🔴 `frozen` AND `closed` ARE REPORTED BESIDE IT, NOT DROPPED. `walletLiabilityTotal`
 * counts ACTIVE wallets only, and from 2026-09-13 a FINAL identity refusal freezes the
 * wallet — so the refused population holding money (S1) is exactly the money that
 * basis leaves out. Folding it in would break the reconciliation; omitting it would
 * make the most sensitive unverified balance on the platform invisible. It is stated
 * separately so neither happens.
 */
export type UnverifiedHeld = HeldTally & {
  basisTotalTzs: number;
  frozen: HeldTally;
  closed: HeldTally;
};

/**
 * Σ what accounts NEVER APPROVED hold. ⛔ `approvedEver` — the withdrawal gate's
 * predicate, over the SAME row the gate reads (`listStageFacts` keeps the newest
 * submission per user, ordered exactly as `db.kyc.findByUserId`). A wallet whose user
 * has no submission row is never-approved, and counted. An account holding nothing is
 * not a liability, and not counted.
 * ⚠️ Staff wallets are included, because `walletLiabilityTotal` includes them and the
 * withdrawal gate asks staff the same question; an unapproved staff balance is
 * genuinely unverified money.
 * ⚠️ If `facts` carries more than one row per user, the FIRST wins — the DAL's
 * newest-first order.
 */
export function tallyHeldForUnverified(
  facts: ReadonlyArray<{ userId: string; status: string; approvedAt: string | null }>,
  wallets: ReadonlyArray<{ userId: string; status: "ACTIVE" | "FROZEN" | "CLOSED"; balance: number; hold?: number | null }>,
): UnverifiedHeld {
  const factsByUser = new Map<string, { status: string; approvedAt: string | null }>();
  for (const f of facts) if (!factsByUser.has(f.userId)) factsByUser.set(f.userId, f);

  const out: UnverifiedHeld = {
    accounts: 0,
    tzs: 0,
    basisTotalTzs: 0,
    frozen: { accounts: 0, tzs: 0 },
    closed: { accounts: 0, tzs: 0 },
  };
  for (const w of wallets) {
    const held = walletHeldTzs(w);
    if (w.status === "ACTIVE") out.basisTotalTzs += held;
    if (held <= 0) continue;
    if (approvedEver(factsByUser.get(w.userId))) continue;
    if (w.status === "ACTIVE") {
      out.accounts += 1;
      out.tzs += held;
    } else if (w.status === "FROZEN") {
      out.frozen.accounts += 1;
      out.frozen.tzs += held;
    } else {
      out.closed.accounts += 1;
      out.closed.tzs += held;
    }
  }
  return out;
}
