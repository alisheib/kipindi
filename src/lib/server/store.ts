/**
 * In-memory data store + Prisma DAL switch.
 *
 * When USE_PRISMA_DAL=true and DATABASE_URL is set, `db` routes to the
 * Prisma-backed DAL (prisma-dal.ts). Otherwise it uses the in-memory Maps.
 * All call sites must have `await` (Phase 3) before flipping the flag.
 */
import { prismaDb } from "./prisma-dal";
import { hasDatabase } from "./prisma";
import { randomId } from "./crypto";
import { matchesFilters, sortAndPage, summarise, type TxnSearchFilters, type TxnSearchResult } from "./txn-filters";
// U35b · the campaign tables' ONE rule set — this twin asks it before every campaign or recipient write, exactly as
// the Prisma twin does (`test:dal-parity` §26). It takes only TYPES back from this file, so there is no cycle.
// U16a · and before erasure's unlink and the access export's read — with the ONE bound that read shares with Postgres.
// U43a · and before the engine's doors — the claim, the settle, the reaper's reads and the requeue — whose WRITES it
// computes too (`claimWrite`, `settleWrite`, `requeueWrite`): this twin applies them by name (`writeRecipient`), the
// Prisma twin through its column map, so the two cannot write different columns (`test:dal-parity` §26.u43a).
import {
  assertNewCampaign, assertDraftPatch, assertTransitionShape, assertSeeds, fillRecipientCounts,
  assertRecipientUnlink, assertRecipientNumberRead, SMS_RECIPIENTS_BY_NUMBER_MAX,
  assertClaim, assertClaimRead, assertSettle, assertStrandedRead, assertRequeueHeld, assertActivityRead, assertTargetsRead,
  claimWrite, settleWrite, requeueWrite, newestPerTarget, refuseHeldToken, type SmsRecipientWrite,
} from "@/lib/server/marketing/campaign-model";
// U36 · the campaign list's ONE vocabulary — this twin asks `wantsAttention` itself (the Prisma twin spreads the same
// statuses into one count) and answers every count through the same zero-filled tallies. Pure, and it takes only TYPES
// back from this file, so there is no cycle.
import { tallyCampaignStatuses, tallyRecipientsByCampaign, wantsAttention } from "@/lib/marketing/campaign-status";
import type { SmsEncoding } from "@/lib/sms-compose";
import type { ConfirmTierColumn } from "@/lib/marketing/campaign-confirm";
// ⛔ The same lens definitions the Prisma DAL reads — one home (§0a), so the two
// implementations of this contract cannot drift apart about what "Money" means.
import {
  kindsFor, showsCleared, MONEY_FILTER_KINDS, ACCOUNT_FILTER_KINDS,
  type NotificationFilter, type NotificationSort,
} from "@/lib/notification-filters";
import { parseQuery, matchesQuery, queryToWhere, fieldNames, NOTIFICATION_SEARCH, CONTACT_SEARCH } from "@/lib/search";
import type { ParsedQuery } from "@/lib/search";
import { holdsDocumentNumber } from "@/lib/kyc-refusal";
// U29 · a staged run carries U28's mapping and drafted problems, the parsed file's format, and U31's choice and outcome
// union — TYPES only, so loading the store loads no contacts module.
import type { ColumnMapping, FieldProblem } from "@/lib/contacts/contact-fields";
import type { ImportChoice, ImportOutcome, RowOverrides } from "@/lib/contacts/import-decide";
import type { ContactsFileFormat } from "@/lib/contacts/parsed-file";
// U33a-L · THE ONE ERASURE MARK — the list-basis reads tell an emptied tombstone from a live book row by it, exactly as the
// Prisma twin does (`test:dal-parity` §27). Its module is pure and imports nothing, so there is no cycle.
import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";
// U33a-L · the list basis's ONE rule set — this twin asks it before every read or write of the table, exactly as the
// Prisma twin does (`test:dal-parity` §27.model). It takes only TYPES back from this file, so there is no cycle.
import { assertListBasisSeed, assertListBasisRevocation, assertListBasisKeys } from "@/lib/server/marketing/list-basis-model";
// U33r · the agent-referee keys' ONE rule set — this twin asks it before every read or write of the table, exactly as the
// Prisma twin does (`test:dal-parity` §28.model). It takes only TYPES back from this file, so there is no cycle.
import { assertRefereeKeyRows, assertRefereeKeys } from "@/lib/server/marketing/referee-key-model";

export type StoredUser = {
  id: string;
  phoneE164: string;
  email?: string | null;
  /** ISO-8601 timestamp the user confirmed ownership of `email` via a signed
   *  verification link. Null = email present but unconfirmed (or no email).
   *  Cleared whenever the address changes so a new address must be re-confirmed. */
  emailVerifiedAt?: string | null;
  /** scrypt(password, passwordSalt) hex. Optional only because legacy
   *  rows created during the OTP-only era have neither — those accounts
   *  must set a password on next login. */
  passwordHash: string | null;
  passwordSalt: string | null;
  /** Brute-force defence: counts consecutive wrong-password attempts.
   *  Resets to 0 on any successful login. */
  failedLoginCount: number;
  /** ISO-8601 timestamp until which the account refuses logins. Set when
   *  failedLoginCount crosses the threshold. */
  lockedUntil: string | null;
  role: "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT" | "FINANCE" | "GROWTH" | "AUDITOR";
  status: "ACTIVE" | "PENDING_KYC" | "SUSPENDED" | "SELF_EXCLUDED" | "COOLED_OFF" | "CLOSED";
  locale: "EN" | "SW" | "ZH";
  displayName: string | null;
  dob: string | null;
  region: string | null;
  acceptedTermsVersion: string | null;
  acceptedTermsAt: string | null;
  marketingOptIn: boolean;
  twoFactorEnabled: boolean;
  /** Optional user-uploaded avatar image as a data URL (base64 jpeg/png).
   *  Capped at ~96KB after client-side resize to 256x256. Null means use
   *  the deterministic OKLCH gradient + initials. */
  avatarDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  closedAt: string | null;
  /** Affiliate program: the userId of the affiliate who recruited this
   *  account (resolved from a referral code at registration). Null for
   *  organic sign-ups. Optional so snapshots created before the affiliate
   *  feature shipped restore cleanly (treated as null). */
  recruitedBy?: string | null;
  /**
   * ⭐ THE PROVENANCE STAMP — which programme this attribution was created under.
   * Written in the SAME `db.user.update` that sets `recruitedBy`, and never rewritten.
   *
   * 🔴 THE EXPLOIT IT CLOSES. Before this field the programme was DERIVED at accrual from
   * the referrer's CURRENT role, so a player could farm attributions for free, buy AGENT
   * status, and every old bind would flip to paying agent commission at the negotiated
   * rate. `programme === "AGENT"` is immutable; a role is not.
   *
   * ⛔ NULL MEANS PLAYER, NEVER AGENT — `programmeOf()` is the one place that coalesces,
   * and it never falls through to the agent branch.
   */
  recruitedProgramme?: "PLAYER" | "AGENT" | null;
  /** When the bind happened. The commission window measures from HERE, not from
   *  `createdAt` — otherwise an agent's window is silently shortened by however long the
   *  recruit existed before binding. */
  recruitedAt?: string | null;
  /** The literal code redeemed at bind. History only — ⛔ never read for pricing. */
  recruitedByCode?: string | null;
  /**
   * ⭐ DURABLE PASSWORD HISTORY (house bots, 04 A4). When the password was last set, and by which
   * path — written in the SAME update as the hash. A house bot's consent is tied to the password
   * its holder gave, so a change must be attributable after the fact.
   *
   * NULL on every account created before the column existed. ⛔ NULL is "not recorded", never
   * "never changed": the house-bot check then falls back to the audit trail, and a failed read
   * blocks rather than passes.
   *
   * ⚠️ The writers land in build commit 3. Like `recruitedAt`, these must be mapped in all four
   * places in `prisma-dal.ts` or Postgres silently reads NULL while memory suites stay green.
   */
  passwordSetAt?: string | null;
  /** Mirrors `User_passwordSetVia_check` (the house markers migration). */
  passwordSetVia?: "REGISTRATION" | "SELF_CHANGE" | "RESET_LINK" | "OFFICER_TEMP" | "REHASH" | null;
  /** When an officer last set this account's email (04 A4): an officer-set address is not
   *  proof the holder controls it, so a house bot's notices treat it with care for 30 days. */
  emailSetByOfficerAt?: string | null;
};

export type KycExtraRequest = { id: string; description: string; requestedAt: string; storageKey: string | null; uploadedAt: string | null };

export type StoredKyc = {
  id: string;
  userId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  rejectReason: string | null;
  rejectNote: string | null;
  /** WHICH of the four documents proves this identity. `IdDocType` in
   *  `@/lib/id-documents`; typed as a string here because `StoredKyc` is the
   *  storage shape both back-ends map onto. */
  idType?: string | null;
  /** The identity number, NORMALISED (`normaliseIdNumber`). ⛔ Half of the
   *  uniqueness tuple — one document, one account, across all four types. */
  idNumber?: string | null;
  /** Expiry, for the two documents that carry one. Null for NIDA / voter card. */
  idExpiry?: string | null;
  /** When the number was accepted: format valid and unique. Never "authority
   *  confirmed" — there is no authority check (docs/IDENTITY-POLICY.md). */
  idVerifiedAt?: string | null;
  /** 🔴 The keyed HMAC of `(idType, idNumber)` — `identityFingerprint` in `crypto.ts`.
   *  The half of one-document-one-account that SURVIVES erasure: `anonymizeClosedAccount`
   *  destroys `idNumber`, so from then on the tuple can no longer collide with the raw
   *  number a future applicant submits, and this can. Optional so rows written before
   *  2026-08-21 still load. */
  idFingerprint?: string | null;
  fullName: string | null;
  dob: string | null;
  /** `mimeType`/`sizeBytes` are the VERIFIED facts about the bytes, captured at
   *  upload (magic-byte sniffed — not the client's claim). They are carried here
   *  because once a document moves to R2 the storageKey is `r2:<key>` and the
   *  bytes can no longer be measured from it: the DAL used to regex the key as a
   *  data URL and silently record `application/octet-stream` / `0` for EVERY R2
   *  document — a false statement about identity evidence in a compliance table
   *  (all 7 R2 rows on production, measured 2026-07-31, against real ~150–240 KB
   *  JPEGs). Optional so older/partial records still load. */
  documents: { docType: string; storageKey: string; uploadedAt: string; mimeType?: string; sizeBytes?: number }[];
  /** Extra documents an officer asked for during review (each with a written
   *  description the player and reviewer both see). Empty in the normal case;
   *  populated by a REQUEST_INFO decision. `storageKey` is null until the
   *  player uploads the requested file. */
  extraRequests?: KycExtraRequest[];
  reviewerId: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  /** 🔴 First-ever approval — set once, NEVER cleared. The withdrawal gate asks THIS
   *  (`assertIdentityForPayout` → `approvedEver` in `src/lib/kyc-approval.ts`, whose other
   *  arm is `status === "APPROVED"`). Since 2026-09-13 that is the ONLY identity question on
   *  any money path: deposit and betting ask none (from 2026-09-05 to 2026-09-13 they asked
   *  `status`, through the deleted `assertKycForMoney`). Never clearing it is what stops
   *  `forceReverifyKyc` freezing money a player earned under an identity we already
   *  accepted — see the column note in `prisma/schema.prisma`. Optional so rows written
   *  before 2026-09-05 still load. */
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * THE ROSTER'S STAGE READ — one submission per user (the NEWEST), plus a document
 * COUNT. Consumed by `kycStage()` in `@/lib/kyc-stage` to put a derived identity
 * word on every row of `/admin/players`.
 *
 * ⛔ A READ SHAPE, NEVER A WRITE SHAPE — and that is the ruling, not a convenience.
 * Nothing upserts this, so there is no counter to keep in step, no invariant for a
 * future session to break, and no second source of truth that can make the tag lie.
 * `documentCount` is DERIVED on every read.
 *
 * ⛔ WHY NOT A DENORMALISED `KycSubmission.documentCount` COLUMN, which is the
 * obvious design and was rejected on evidence:
 *   1. `kyc.upsert` commits the submission and its documents in TWO separate round
 *      trips, so a stored counter would commit BEFORE the rows it counts. Any
 *      failure between them leaves it permanently wrong, and the drift only has to
 *      cross ZERO to make the tag lie — in both directions.
 *   2. THE REPO ALREADY TRIED IT. `PredictionMarket.predictorCount` is this repo's
 *      one denormalised counter over a child table; it drifted, it outlived its
 *      children, and `scripts/ops-backfill-predictor-count.mjs` could not repair
 *      all of it.
 *   3. `test:dal-parity` covers StoredAffiliateAccount / StoredUser /
 *      StoredReferralReward / StoredAgentApplication and NOT StoredKyc — so a
 *      counter mapped in one DAL half only would be invisible to the single guard
 *      written to catch exactly that. It is the blind spot the 2026-09-11 P0 lived
 *      in, on this same table.
 * The column's day comes with the release that moves the roster's filtering,
 * sorting and pagination into SQL — and not before `kyc.upsert` is ONE transaction
 * and a reconciliation check is in the pipeline.
 *
 * ⛔ NO `documents`, NO `extraRequests`, NO `idNumber` / `dob` / `fullName`. This
 * shape crosses a POPULATION read. `extraRequests` is a `Json?` whose entries carry
 * a `storageKey` that is a FULL base64 data URL under inline storage — and
 * `storage.ts` falls back to inline SILENTLY when `KYC_STORAGE=r2` is set without
 * `R2_BUCKET`. Selecting either for every player would pull image bytes through a
 * roster render.
 */
export type StoredKycStageRow = {
  id: string;
  userId: string;
  status: StoredKyc["status"];
  /**
   * The REAL count — not a boolean, not a synthetic 1.
   *
   * ⛔ The derivation only ever compares it to ZERO, and `test:kyc-stage` asserts
   * that at source level: `documents.length >= 3` was true of a NIDA and is a lie
   * about a passport. But the INTEGER is what is carried here, so a magnitude
   * comparison creeping into `kycStage()` goes RED in the guard instead of
   * silently reading 1 for every uploader.
   */
  documentCount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  /** The refusal code on a REJECTED row, else null. Carried (2026-09-13) so a roster or report can
   *  tell a FINAL refusal from a recoverable one without a second read per player (`kyc-refusal.ts`). */
  rejectReason: string | null;
  createdAt: string;
};

export type StoredOtp = {
  id: string;
  /** The address the code went to, when it is a phone. ⛔ Exactly one of `phoneE164` /
   *  `email` is set on a row — never both, never neither. */
  phoneE164: string | null;
  /** ⭐ The address the code went to, when it is a mailbox (`agent_invite` since
   *  2026-09-08). ⛔ An email is NEVER stored in `phoneE164`: `erasure.ts` deletes OTPs BY
   *  PHONE, so a mis-filed address is a row a data-subject request cannot reach. */
  email: string | null;
  hashedCode: string;
  salt: string;
  purpose: "login" | "register" | "withdraw" | "reauth" | "self_exclusion"
    /** Proves live control of the ADDRESS an agent invitation is BOUND to — a mailbox
     *  since 2026-09-08, a phone on rows issued before it. */
    | "agent_invite";
  attempts: number;
  consumedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export type StoredWallet = {
  id: string;
  userId: string;
  balance: number;
  pending: number;
  hold: number;
  /** Non-withdrawable promotional funds. Optional so snapshots/rows created
   *  before the bonus wallet shipped restore cleanly (treated as 0). Invariant:
   *  bonusBalance == Σ remainingTzs over the wallet's ACTIVE BonusGrants. */
  bonusBalance?: number;
  currency: "TZS";
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  /** WHY the wallet is frozen — one entry per independent hold (2026-09-13). `status` is FROZEN
   *  exactly when this is non-empty; every lifter removes only its own reason. Optional so rows and
   *  snapshots written before the column existed still load (`currentFreezeReasons` reads a
   *  reason-less FROZEN wallet as self-exclusion, the only writer there was). Written ONLY by
   *  `src/lib/server/wallet-freeze.ts`. */
  freezeReasons?: string[];
  createdAt: string;
  updatedAt: string;
};

export type BonusSource = "ADMIN" | "REFERRAL" | "PROPOSAL" | "INVITE" | "PROMOTION" | "CASHBACK";
export type BonusGrantStatus = "ACTIVE" | "QUEUED" | "PENDING_KYC" | "FULFILLED" | "EXPIRED" | "CANCELLED" | "FORFEITED";

/**
 * One promotional bonus credit. Lives in Wallet.bonusBalance and is not
 * withdrawable until `wageredTzs` >= `wagerRequiredTzs` (turnover target =
 * amountTzs × wagerMultiplier), at which point bonus-service converts
 * `remainingTzs` to real balance and marks the grant FULFILLED. All money fields
 * are whole TZS integers.
 */
export type StoredBonusGrant = {
  id: string;
  userId: string;
  walletId: string;
  amountTzs: number;
  remainingTzs: number;
  wagerMultiplier: number;
  wagerRequiredTzs: number;
  wageredTzs: number;
  source: BonusSource;
  sourceRef: string | null;
  status: BonusGrantStatus;
  expiresAt: string | null;
  fulfilledAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "CANCELLED";
export type ContactType = "EMAIL" | "PHONE";
export type InviteEntryStatus = "QUEUED" | "SENT" | "DELIVERED" | "REGISTERED" | "FAILED" | "BOUNCED";

/** A bulk invite campaign — branded SMS/email invites that grant the invitee a
 *  bonus when they register with the campaign's `code`. */
export type StoredInviteCampaign = {
  id: string;
  code: string;
  name: string;
  bonusAmountTzs: number;
  wagerMultiplier: number;
  expiresInDays: number;
  messageEn: string;
  messageSw: string;
  status: CampaignStatus;
  totalInvites: number;
  totalRegistered: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredInviteEntry = {
  id: string;
  campaignId: string;
  contactType: ContactType;
  contactValue: string;
  bonusAmountTzs: number;
  status: InviteEntryStatus;
  sentAt: string | null;
  registeredUserId: string | null;
  bonusGrantId: string | null;
  failureReason: string | null;
  createdAt: string;
};

/** Which of OUR lanes a message belongs to — mirrors the `SmsPurpose` enum. */
export type SmsPurpose = "OTP" | "INVITE" | "OPS" | "MARKETING"; // MARKETING: U35a (D22) — nothing writes it before U37 (test:campaign-models §3.1)
/** Mirrors the `SmsStatus` enum. ACCEPTED is the gateway's receipt; DELIVERED needs a
 *  delivery report. ⛔ UNKNOWN is AMBIGUOUS, not failed — the request never completed,
 *  so the gateway may hold the message and bill for it. */
export type SmsStatus = "QUEUED" | "ACCEPTED" | "DELIVERED" | "FAILED" | "UNKNOWN";

/** One SMS attempt, keyed by the reference handed to the gateway. ⛔ The message BODY is
 *  never a field here: it carries the OTP. `bodyLen` is what a cost question needs. */
export type StoredSmsMessage = {
  reference: string;
  msisdn: string;
  purpose: SmsPurpose;
  provider: string;
  senderId: string;
  bodyLen: number;
  status: SmsStatus;
  providerMsg: string | null;
  dlrStatus: string | null;
  dlrDesc: string | null;
  balanceTzs: number | null;
  attempts: number;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
};

/** The two states a delivery receipt may never move a row out of. Exported because the
 *  Prisma DAL must enforce the SAME rule — a monotonic guard implemented in only one
 *  backend is a guard that holds in tests and not in production. */
export const SMS_TERMINAL: readonly SmsStatus[] = ["DELIVERED", "FAILED"];

/** One normalised line of a delivery receipt. ⛔ `status: null` means WE DO NOT RECOGNISE
 *  the provider's token: record it raw and leave the row's status exactly as it was.
 *  Shared by both DALs so the receipt contract cannot differ between them. */
export type SmsDlr = { status: SmsStatus | null; rawStatus: string; desc: string | null; at: string };

/** What applying a receipt did. `changed` is false on a replay, on an unrecognised token, and
 *  on a row that had already settled — it is what tells the route whether a downstream write
 *  (an InviteEntry status) is warranted at all.
 *
 *  ⚠️ NAMED, NOT INLINE, AND THAT IS LOAD-BEARING. `dal-parity`'s `region()` extracts a
 *  function body by finding the first `{` after the signature, so an inline object literal in
 *  either the parameters OR the return type silently hands the gate the TYPE instead of the
 *  body — every assertion about the implementation then fails against 100 characters of type
 *  annotation. Keep both sides of this signature named. */
export type SmsDlrResult = { changed: boolean; row: StoredSmsMessage | null };

/* ═══ THE CAMPAIGN TABLES (marketing U35b — D22; decisions X12–X15, M5, M6) ═══════════════════════════════
 *
 * ⭐ TWO STORES, AND EACH HAS ONE DOOR. Every write to a campaign or a recipient goes through the twins'
 * `smsCampaign` / `smsCampaignRecipient` namespaces, which ask `marketing/campaign-model.ts`'s rules BEFORE they
 * write: the frozen keys only in DRAFT and only on the revision the officer saw, a status only by a conditional
 * transition (one winner), a recipient batch whole or not at all. ⛔ No delete and no stored counter, in either
 * twin (`test:dal-parity` §26).
 * ⚠️ NAMED, NOT INLINE: every DAL signature below names its parameter and return types — `dal-parity`'s
 * `region()` reads a body from the first `{` after a signature (the `SmsDlrResult` note above). */

/** Mirrors `SmsCampaignStatus` (X12). DONE and CANCELLED are terminal; nothing returns to DRAFT. */
export type SmsCampaignStatus = "DRAFT" | "CONFIRMED" | "PREPARING" | "RUNNING" | "PAUSED" | "DONE" | "CANCELLED";
/** Mirrors `SmsCampaignRecipientStatus` (X12), in the schema's order. ⚠️ HELD is OUTSTANDING — a held row still owes
 *  somebody a message. ⭐ UNCONFIRMED (U43-0, ENGINE-SPEC E4) is SETTLED: handed to the wire, and the network's answer
 *  never came — never retried automatically, and a late receipt may still settle it. Its own ADD VALUE migration ships
 *  one deploy before its first writer, U43b (`test:campaign-models` 1.12 and the writer pin 3.2); the Prisma twin
 *  types every status it reads with THIS union (`test:dal-parity` 26.status). */
export type SmsCampaignRecipientStatus = "PENDING" | "HELD" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED" | "UNCONFIRMED";

/** ⭐ ONE CAMPAIGN. ⛔ No counter among these keys (OD26): progress is `countByStatus`, a groupBy over the recipient
 *  rows. The frozen keys (`SMS_CAMPAIGN_FROZEN`, `campaign-model.ts`) change only in DRAFT. */
export type StoredSmsCampaign = {
  id: string;
  /** Staff-only label, never sent. */
  name: string;
  status: SmsCampaignStatus;
  bodySw: string;
  /** null = everyone gets Swahili (OD42). */
  bodyEn: string | null;
  /** U37's SAVED per-variant verdicts (X15, M16) — the confirmation's estimate reads these, never a live counter. */
  codingSw: SmsEncoding;
  segmentsSw: number;
  codingEn: SmsEncoding | null;
  segmentsEn: number | null;
  nameFallbackSw: string | null;
  nameFallbackEn: string | null;
  /** M5 · OQ3's phrase for every non-account recipient; null until G5 supplies the wording. */
  sourcePhrase: string | null;
  /** ⭐ THE ONE OPTIMISTIC MECHANISM (X12): every draft save compares it and moves it on by one. */
  draftRevision: number;
  /** U40's tier as `CONFIRM_TIER_COLUMN` spells it; read back only through `confirmTierFromColumn`. */
  confirmTier: ConfirmTierColumn | null;
  /** ⛔ U24's canonical key (`contactAudienceKey`, X13), byte for byte — a FILTER, never a list of ids. */
  audienceFilter: string;
  audienceCount: number | null;
  /** X13: U40's keyed members key on the enumerate tier, null on the typed tier. */
  audienceWatermark: string | null;
  /** X15: frozen at the confirmation — the spend ceiling, not the forecast. */
  estimateSegments: number | null;
  estimateTzs: number | null;
  budgetTzs: number | null;
  /** X8: `b:<id>` · `p:<userId>` · `done`, parsed in `audience.ts` only. ⛔ Never a phone number. */
  enqueueCursor: string | null;
  enqueuedAt: string | null;
  stopReason: string | null;
  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** M6 · one check of §5.8's per-recipient record: what ran, its verdict, the wording shown and its source. U43 writes
 *  the trail for EVERY recipient, sent or skipped; U35b stores it and never reads inside it. */
export type SmsCampaignGateCheck = { check: string; verdict: string; wording: string | null; source: string | null };
export type SmsCampaignGateTrail = SmsCampaignGateCheck[];

/** ⭐ ONE PERSON ON ONE CAMPAIGN — the record that we messaged them, or why we did not. Its `id` is the slice ref and
 *  `SmsMessage.targetId`. ⛔ `contactId` and `userId` are LINKS, never copies, and the row is never deleted — erasure
 *  clears `userId` and keeps everything else (U16a, `unlinkUser`): the record that we messaged a NUMBER outlives the
 *  record of which account held it. */
export type StoredSmsCampaignRecipient = {
  id: string;
  campaignId: string;
  /** ⛔ The ONE key, bare `255…` (U1) — the twins refuse a batch holding any other spelling. */
  msisdn: string;
  contactId: string | null;
  userId: string | null;
  status: SmsCampaignRecipientStatus;
  /** The reference handed to the gateway. Nullable-unique. */
  smsReference: string | null;
  /** U8's token in this person's footer — ensured at SEND, only after the gate clears (E1): reused, else minted, so a
   *  person the gate refuses gets no permanent link. The seed carries none; the settle writes it. ⛔ A message is never
   *  rendered without one. */
  optOutToken: string | null;
  /** Which OD42 variant went out — written at send time. */
  locale: MessagingLocale | null;
  failureClass: string | null;
  /** Scrubbed. ⛔ Never a phone number (§5.14). */
  error: string | null;
  skipReason: string | null;
  skipDetail: string | null;
  claimToken: string | null;
  claimedAt: string | null;
  attempts: number;
  segments: number | null;
  bodyLen: number | null;
  /** Provider-reported only. */
  costTzs: number | null;
  gateTrail: SmsCampaignGateTrail | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
};

/** U37's DRAFT SAVE — the officer's composition and nothing else (`campaign-model.ts`'s `draft` keys; a compile-time
 *  check there holds the two lists equal). Written only while the row is a DRAFT, on `SmsCampaignDraftGuard`. */
export type SmsCampaignDraftPatch = Partial<Pick<StoredSmsCampaign,
  | "name" | "bodySw" | "bodyEn" | "codingSw" | "segmentsSw" | "codingEn" | "segmentsEn"
  | "nameFallbackSw" | "nameFallbackEn" | "sourcePhrase" | "audienceFilter">>;
/** The compare in the draft save's compare-and-set: the revision the form was rendered on. */
export type SmsCampaignDraftGuard = { draftRevision: number };
/** What a TRANSITION may write: the confirmation's fields (only FROM exactly DRAFT, on a revision) and the engine's. */
export type SmsCampaignTransitionPatch = Partial<Pick<StoredSmsCampaign,
  | "audienceCount" | "confirmTier" | "audienceWatermark" | "estimateSegments" | "estimateTzs" | "budgetTzs"
  | "confirmedBy" | "confirmedAt"
  | "enqueueCursor" | "enqueuedAt" | "stopReason" | "startedAt" | "pausedAt" | "finishedAt">>;
/**
 * ⭐ THE ONLY WAY A STATUS MOVES. `from` is the CONDITION — the twins write only a row still in it, so of two racing
 * writers ONE wins — and `to: null` is a conditional patch with no move (U42's cursor, U43's stamps). `draftRevision`,
 * when not null, is compared too (U40's confirmation). Both twins stamp `at` as `updatedAt`.
 * ⚠️ The row handed back is re-read after the write and may already carry a later writer's change: null versus
 * non-null is the race verdict, never the returned status.
 */
export type SmsCampaignTransition = {
  from: readonly SmsCampaignStatus[];
  to: SmsCampaignStatus | null;
  patch: SmsCampaignTransitionPatch;
  draftRevision: number | null;
  at: string;
};
/** What U42's enqueue writes — and NOTHING that settles a row (no status, no `smsReference`): the Prisma twin's
 *  `skipDuplicates` has no conflict target, so a colliding settle key would drop a person silently. */
export type SmsCampaignRecipientSeed = Pick<StoredSmsCampaignRecipient,
  "id" | "campaignId" | "msisdn" | "contactId" | "userId" | "optOutToken" | "createdAt">;
/** `inserted` + `duplicates` = the batch. A duplicate is a person already on the campaign (or an id already held). */
export type SmsCampaignRecipientInsert = { inserted: number; duplicates: number };
export type SmsCampaignRecipientCount = { status: SmsCampaignRecipientStatus; count: number };

/* ── U36 · THE CAMPAIGN LIST'S READS — page, statusCounts, attentionCount, countsByCampaign (`test:dal-parity` §26,
 * extended by U36 as decision X1 says). ⚠️ NAMED, NOT INLINE: the `SmsDlrResult` note above. ── */
/** The list's sortable columns: when the campaign was made, its name, its last activity. */
export type SmsCampaignListSort = "created" | "name" | "updated";
/** One page of the list. `statuses` null = every status (the rail's All); ⛔ an EMPTY list = nothing, never "no
 *  constraint". Both twins break every tie on `id`, in the sort's own direction. */
export type SmsCampaignPageQuery = {
  statuses: readonly SmsCampaignStatus[] | null;
  sort: SmsCampaignListSort;
  dir: "asc" | "desc";
  offset: number;
  limit: number;
};
export type SmsCampaignPage = { rows: StoredSmsCampaign[]; total: number };
/** Every campaign status with its count over the WHOLE table, zeros included — the rail's counts. */
export type SmsCampaignStatusCounts = Record<SmsCampaignStatus, number>;
/** One campaign's recipients by status, zeros included. ⛔ Never stored (OD26): always counted from the rows. */
export type SmsCampaignRecipientStatusCounts = Record<SmsCampaignRecipientStatus, number>;
/** Each campaign asked about, by id, with its recipients by status — and only those. */
export type SmsCampaignRecipientCountsById = Record<string, SmsCampaignRecipientStatusCounts>;

/* ── U43a · THE ENGINE'S RECIPIENT DOORS — claim, claimedBy, settle, findStranded, requeueHeld, lastActivity, and
 * `smsMessage.findByTargets` (ENGINE-SPEC §4.10; `test:dal-parity` §26.u43a, `test:campaign-models` §2.14–§2.28).
 * ⚠️ NAMED, NOT INLINE: the `SmsDlrResult` note above. ── */
/**
 * ⭐ ONE SETTLE OF ONE CLAIMED ROW — the row by its `id` (never by its place in a list), the claim it expects, and the
 * status it moves to with EXACTLY that status's columns (`SMS_RECIPIENT_SETTLE_KEYS`, campaign-model.ts; a compile-time
 * check holds each variant equal to its row of that table). Both twins write it only where the row still holds
 * `claimToken` AND is PENDING; anywhere else it is `lost`, never forced. `PENDING` is a RELEASE — the claim's token
 * cleared (its `claimedAt` kept, D15), `attempts` moved on by 0 or 1 — and `HELD` parks the row; every other target
 * settles it.
 * ⛔ Nothing here moves a row OUT of a settled status: a late receipt is U46a's door, and UNCONFIRMED never goes back.
 * ⚠️ The reaper settles a stranded claim from EVIDENCE (E6) and never saw what the slice prepared, so SENT's token,
 * variant, segments and length may be null — the slice always fills them — and DELIVERED is a target here (§3.2).
 *
 * ⭐ THE SETTLE DOOR'S CONTRACT — written here ONCE; both twins' `settle` and the rule set point at it.
 * · ONE BATCH, ONE ANSWER. The rule set refuses the WHOLE batch for one unlawful patch, before any write, and a throw
 *   from `settle` — a refusal, or a reference another row holds (P2002, carried as `code` "P2002" by BOTH twins'
 *   errors) — means NOTHING was written. Otherwise `{ settled, lost }`: a lost id is a row reaped, released, moved by a
 *   receipt or claimed again since — read it again, never force it.
 * · ⛔ NEVER THE ACCOUNT LINK (U16a PE-01). No variant carries `userId`, the rule set refuses the key by name, the write
 *   is read off the table and never off the patch (`settleWrite`), and the Prisma map throws on it: erasure's `unlinkUser`
 *   stays the ONE writer of the link, so a send that raced an erasure can never re-link the erased account.
 * · ⛔ NEVER A CLOCK FOR A SEND INSTANT (U16a PE-08). `sentAt` is the HAND-OVER instant copied from the message — the
 *   slice's from its own send, the reaper's from the evidence's `SmsMessage.sentAt` — and `deliveredAt` / `failedAt` are
 *   the message's too. The settle's own `at` stamps `updatedAt` and nothing else; never the settle's or the reap's clock
 *   in a send instant (the access export dates a hand-over by it).
 * · OWED BY U43b — EVERY PATCH LAWFUL BEFORE IT IS HANDED IN (DC-5). The rule set REFUSES; it never scrubs and never
 *   trims. So U43b passes every free text — `error` (a gateway's `providerMsg` above all), `skipDetail`, a trail's
 *   `check`, `verdict` and `wording` — through `scrubPhoneRuns` (contact-fields.ts) and trims it to
 *   `SMS_RECIPIENT_TEXT_MAX`, `SMS_RECIPIENT_TRAIL_TEXT_MAX` or `SMS_RECIPIENT_CODE_MAX` first, and may ask
 *   `assertSettle([p], at)` of one patch to set it aside. Otherwise one gateway message echoing a number refuses the
 *   slice's whole settle — and the reaper's on every step after it (§3.3 reaps first), wedging the campaign until a hand
 *   repair. U43b's engine suite (ENGINE-SPEC §4.13, its §S and §R) holds that case.
 * · OWED BY U46a WITH U43b — THE SEND RECORD WHEN A RECEIPT WINS (DC-4). A receipt that lands between the wire and this
 *   settle moves the still-claimed PENDING row (U46a decision 1, its test D5), so the slice's SENT patch is `lost` here and
 *   the row's trail, token, variant, segments, length and `sentAt` (E20, E30, the access export) are never written.
 *   Before U46a's arm ships: a second, narrow door in both twins that writes ONLY those columns, never the status, WHERE
 *   the row still holds THIS claim, a receipt moved it (DELIVERED or FAILED) and its trail is still null; U43b calls it
 *   for each SENT patch lost to such a row; U46a's D5 asserts the DELIVERED row then carries its trail and `sentAt`.
 */
export type SmsCampaignRecipientSettle =
  | {
      id: string; claimToken: string; to: "SENT"; smsReference: string; sentAt: string; optOutToken: string | null;
      locale: MessagingLocale | null; segments: number | null; bodyLen: number | null; gateTrail: SmsCampaignGateTrail;
    }
  | { id: string; claimToken: string; to: "SKIPPED"; skipReason: string; skipDetail: string; gateTrail: SmsCampaignGateTrail }
  | {
      id: string; claimToken: string; to: "FAILED"; failureClass: string; error: string | null; failedAt: string;
      smsReference: string | null; gateTrail: SmsCampaignGateTrail;
    }
  | {
      id: string; claimToken: string; to: "UNCONFIRMED"; smsReference: string | null; optOutToken: string | null;
      locale: MessagingLocale | null; segments: number | null; bodyLen: number | null; gateTrail: SmsCampaignGateTrail;
    }
  | {
      id: string; claimToken: string; to: "DELIVERED"; smsReference: string; sentAt: string | null; deliveredAt: string;
      optOutToken: string | null; locale: MessagingLocale | null; segments: number | null; bodyLen: number | null;
      gateTrail: SmsCampaignGateTrail;
    }
  | { id: string; claimToken: string; to: "HELD"; failureClass: string; attempts: number }
  | { id: string; claimToken: string; to: "PENDING"; attemptsDelta: 0 | 1 };
/** What a settle did: how many rows it wrote, and the ids it did NOT write, in the order they were handed in. */
export type SmsCampaignSettleResult = { settled: number; lost: string[] };

declare global {
  /** DEV ONLY — set by `/api/dev-test/marketing-campaigns-seed?fault=1` so the U36 drive can photograph the campaign
   *  list's error state (the rail kept with no counts, no badge). Read by the MEMORY twin's `page`, `statusCounts` and
   *  `attentionCount` alone, which never serve production. */
  // eslint-disable-next-line no-var
  var __50PICK_CAMPAIGNS_READ_FAULT: boolean | undefined;
}

/* ═══ MESSAGING CONSENT AND SUPPRESSION (marketing U6 — D7, D8) ═══════════════════════
 *
 * ⭐ THESE UNIONS ARE THE MEMORY TWIN OF THE PRISMA ENUMS, AND THEY ARE NAMED ON PURPOSE.
 * `dal-parity`'s `region()` finds a function body by the first `{` after the signature, so
 * an inline object literal anywhere in a DAL signature hands the gate the TYPE instead of
 * the body and every assertion about the implementation passes against an annotation. Every
 * signature below is named for that reason, not for tidiness. */
export type MessagingChannel = "SMS";
export type MessagingCategory = "MARKETING";
export type MessagingConsentStatus = "GIVEN" | "WITHDRAWN";
export type MessagingConsentSource =
  | "REGISTRATION" | "PROFILE" | "OPT_OUT_PAGE" | "KEYWORD" | "IMPORT" | "OPERATOR" | "RETENTION_LAPSE";
export type SuppressionReason = "WITHDRAWN" | "COMPLAINT" | "OPERATOR" | "SELF_EXCLUSION";
export type MessagingLocale = "EN" | "SW" | "ZH";

/** The triple that identifies one person's standing on one channel for one purpose. Named
 *  because it is a DAL parameter — see the note above. */
export type MessagingKey = {
  channel: MessagingChannel;
  identifier: string;
  category: MessagingCategory;
};

/* ═══ §25 · THE ONE BULK KEYED READS (decision X10) ════════════════════════════════════════
 * ⭐ FOUR READS, EACH THE SINGLE-KEY READ IT MIRRORS ASKED OF A SET: `marketingContact.msisdnsPresent` (who is in the
 * book), `user.findByPhones` (the accounts behind a set of numbers), `suppression.findActiveAmong` (the stops still in
 * force) and `messagingConsent.latestAmong` (each number's latest word). Built once and reused by U30–U33 and U38: the
 * audience split (`audience-split.ts`) answers the send gate's three single reads from them a chunk at a time, so those
 * three reads over 150,000 numbers are a few hundred queries, never 450,000. ⚠️ Only those three: the RG standing, the
 * identity check and the harm-marker scan the gate makes for a consenting player stay its own reads, one player at a
 * time (bounded by the split's time budget; U52 measures them).
 * ⛔ EACH ANSWERS EXACTLY WHAT ITS SINGLE READ ANSWERS, PER ELEMENT — `findActiveAmong` only rows whose lift is unset
 * (as `find`), `latestAmong` the ledger's own `createdAt desc, id desc` (as `latestFor`), `findByPhones` the account
 * `findByPhone` returns with the avatar omitted. A bulk read that disagreed with its single read once would be a second
 * definition of "suppressed" or "consented".
 * ⛔ KEY-ONLY WHERE PII MATTERS: `msisdnsPresent` hands back keys, never a book row's name, email or notes.
 * ⛔ AT MOST `BULK_KEYED_READ_MAX` DISTINCT KEYS A CALL, refused above — never cut off — and an empty set is answered
 * with nothing, without a query. The Prisma twin keeps the same bound; `test:dal-parity` §25 holds the pairs, and
 * `scripts/live/bulk-reads-pg-probe.mts` proves the Prisma half on a real Postgres. */
export const BULK_KEYED_READ_MAX = 2000;
/** A set of numbers on one channel for one purpose — a DAL parameter, named for `MessagingKey`'s reason. */
export type MessagingKeyBatch = {
  channel: MessagingChannel;
  category: MessagingCategory;
  identifiers: string[];
};

/** ⭐ APPEND-ONLY. A withdrawal is a NEW row, never an edit of the row that granted consent,
 *  so the ledger can always answer what was true on the day a message went out (GN 478T reg
 *  51(1)). ⛔ There is deliberately no `update` and no `delete` for this namespace in either
 *  store; `test:dal-parity` §17 asserts their ABSENCE. */
export type StoredMessagingConsent = {
  id: string;
  channel: MessagingChannel;
  identifier: string;
  category: MessagingCategory;
  status: MessagingConsentStatus;
  source: MessagingConsentSource;
  /** ⛔ VERBATIM (§5.7) — what this person actually read. Never re-rendered from today's copy. */
  wording: string;
  locale: MessagingLocale;
  evidence: string | null;
  recordedBy: string | null;
  createdAt: string;
};

/** ⛔ NEVER DELETED — not by contact deletion, not by re-import, not by erasure. Deleting one
 *  is exactly how a person who opted out receives the next campaign.
 *
 *  ⭐ NEVER DELETED, BUT SUPERSEDABLE (U8). `liftedAt` is the whole of the difference between a
 *  resubscribe button that works and one that reports a success it cannot deliver: the row —
 *  and its original `createdAt` — survive a lift, so "when did this person first say no" is
 *  still answerable years later, while the gate stops refusing them. */
export type StoredSuppression = {
  id: string;
  channel: MessagingChannel;
  identifier: string;
  category: MessagingCategory;
  reason: SuppressionReason;
  evidence: string | null;
  recordedBy: string | null;
  createdAt: string;
  /** ⭐ NULL means STILL REFUSING. Set once, by `lift`; ⛔ a second lift must not move it. */
  liftedAt: string | null;
  /** Free text, the shape of `evidence`. ⛔ Never a raw phone number (§5.14). */
  liftedReason: string | null;
};
/** ⭐ ONE MINTED OPT-OUT LINK (U8, OD43). The token IS the key, so uniqueness is the database's
 *  job. ⛔ Never expires — OD43 — which is exactly why a collision would be permanent and why
 *  the mint retries rather than hoping. */
export type StoredMarketingOptOutToken = {
  token: string;
  channel: MessagingChannel;
  identifier: string;
  category: MessagingCategory;
  createdAt: string;
};

/* ═══ THE CONTACT BOOK (marketing U18) ═════════════════════════════════════════════════════
 * ⛔ THE FIRST STORE ON THIS PLATFORM THAT HOLDS PEOPLE WHO MAY HAVE NO `User` ROW. Every
 * rule it depends on is therefore written down here rather than inherited from the player
 * tables beside it. */

/** Mirrors `ContactSource` in `schema.prisma`. */
export type ContactSource = "IMPORT" | "REGISTRATION" | "OPERATOR" | "AGENT";
/** Mirrors `ContactConsentState`. ⛔ A CACHE of the ledger's answer for filtering and
 *  counting — never the answer. The send gate (U7) asks the consent ledger, never this. */
export type ContactConsentState = "UNKNOWN" | "GIVEN" | "WITHDRAWN";

/** ⭐ ONE ROW PER PERSON IN THE BOOK. `msisdn` is the ONE key — bare `255…`, exactly as
 *  `toMsisdn255` produces it. ⛔ `userId` is a LINK, never a copy: an erased player must not
 *  survive inside a marketing row. */
export type StoredMarketingContact = {
  id: string;
  /** ⛔ UNIQUE. The database enforces it; this twin fakes it with a secondary map. */
  msisdn: string;
  rawInput: string;
  displayName: string | null;
  email: string | null;
  ndc: string;
  operator: string | null;
  source: ContactSource;
  sourceRef: string | null;
  userId: string | null;
  consentState: ContactConsentState;
  suppressedAt: string | null;
  tags: string[];
  notes: string | null;
  importId: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type StoredContactList = {
  id: string;
  /** ⛔ UNIQUE, for the same reason `msisdn` is: two lists of one name is two audiences. */
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type StoredContactListMember = {
  listId: string;
  contactId: string;
  addedAt: string;
  addedBy: string | null;
};

/** A DAL parameter, named for the same reason `MessagingKey` is. */
export type ContactListKey = { listId: string; contactId: string };

/* ═══ U33a-L · THE LIST BASIS — `ContactListBasis` (OD57 · OD58; docs/marketing-specs/U33a-U37c-OD58.md §4.2) ═══════════
 * ⛔ NEVER A CONSENT. An officer recorded, for a whole list at one instant, why 50pick may message its members under its
 * Gaming Board licence without their consent, that every member is 18 or older, and where the numbers came from. The
 * consent ledger stays the person's own word, and nothing here is ever written to it (S1).
 * ⛔ APPEND-ONLY, IN BOTH TWINS: recording again is a NEW row; `revoke` sets the three revocation fields ONCE and never
 * moves them; there is no update member and no delete member (`test:dal-parity` §27.3 asserts their ABSENCE).
 * ⭐ A LIST'S ONE STANDING IS ITS NEWEST RECORDING (`recordedAt desc, id desc`), revoked or not (the lead's ruling M1,
 * 2026-10-04). Revoking the newest recording ends the list's coverage; an older recording NEVER comes back into force;
 * recording again starts it anew. COVERAGE (S8): a list covers a number when the number's LIVE book row — never the
 * erasure tombstone (S9) — is a member of it, was ADDED at or before its newest recording (compared as instants), and that
 * recording is not revoked. Across a number's lists the newest such recording is the ref. ONE definition per twin —
 * `bookStandings`, asked by both `standingFor` and `standingAmong` — so the single read and the bulk read cannot disagree.
 * Every DAL signature below is NAMED: dal-parity's `region()` would read an inline literal as the body. */

/** ONE RECORDED BASIS. ⛔ `wording` and `adultWording` are VERBATIM — the saved versions in force at the recording — and
 *  are never re-rendered. ⛔ `proofNote` and `revokedReason` are officer free text, screened for phone numbers by the
 *  service (§5.14), never for names — they are the one place a person could be typed in. */
export type StoredContactListBasis = {
  /** `lb_` and twenty lower-case letters, minted by the service, and both creates refuse any other
   *  (`list-basis-model.ts`) — no digit run a log could read as a phone number, and an alphabet in which code-unit order
   *  and every Postgres collation agree (the id breaks a `recordedAt` tie). */
  id: string;
  listId: string;
  /** The catalogue key — today only "LICENCE_OUTREACH". TEXT, never a Postgres enum (a new kind would be a 55P04 two-step). */
  basisKey: string;
  wording: string;
  wordingVersion: number;
  adultWording: string;
  adultVersion: number;
  proofNote: string;
  recordedBy: string;
  recordedAt: string;
  /** ⭐ NULL means IN FORCE. Set once, by `revoke`; ⛔ a second revoke must not move it. */
  revokedAt: string | null;
  revokedBy: string | null;
  revokedReason: string | null;
};
/** What `create` takes — a basis is BORN UNREVOKED. ⛔ No revocation key: both twins write the three as null, so the only
 *  way to revoke a basis is `revoke`, once. */
export type ContactListBasisSeed = {
  id: string;
  listId: string;
  basisKey: string;
  wording: string;
  wordingVersion: number;
  adultWording: string;
  adultVersion: number;
  proofNote: string;
  recordedBy: string;
  recordedAt: string;
};
/** One revocation: who, why (screened by the service — never a phone number) and when. */
export type ContactListBasisRevocation = {
  id: string;
  by: string;
  reason: string;
  at: string;
};
/** The basis that covers a number — ids and the recording instant only, never a number. */
export type OutreachBasisCover = {
  basisId: string;
  listId: string;
  recordedAt: string;
};
/** A number's book standing — the gate's `bookStanding` read (U33a-G): no book row · a LIVE row and its covering basis,
 *  if any · the ERASED tombstone, which covers nothing whatever its memberships say (S9). */
export type BookStanding = {
  row: "none" | "live" | "erased";
  cover: OutreachBasisCover | null;
};
/** One number's standing in a bulk answer — EVERY number asked about gets one, a number with no book row included. */
export type BookStandingEntry = {
  msisdn: string;
  standing: BookStanding;
};
/** A list's coverage, counted in ONE pass over its members — the Lists card's "covers 412 of 420" (U33b-L). `live`: the
 *  members whose book row is live (not the tombstone) and linked to NO account — a list basis never reaches an account's
 *  number, which the player branch governs (S3). `covered`: those of them the list's newest recording covers — 0 when it
 *  is revoked, or when the list was never recorded. */
export type ListBasisCoverage = {
  live: number;
  covered: number;
};

/* ═══ U33r · THE AGENT-REFEREE EXCLUSION — `AgentRefereeKey` (Q8; COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to
 * anyone with a phone — consent is not a condition (the owner's FINAL rule), and his approvals given in the session") ═══
 * ⭐ WHY IT EXISTS. /legal/privacy §9 promised every agent applicant's referee "we never contact you for marketing" until
 * version `REFEREE_PROMISE_REWORDED_IN` (v2026-10-07), and the owner ruled that promise HONOURED for every referee already
 * given it — §9 keeps it for every referee named before that version, and §5 says a coded form of each such number is kept. A referee's contact is free text on
 * `AgentApplication` — no gate can ask a spreadsheet of free text about a number — so each Tanzanian mobile number a
 * PROMISED referee's contact leads to is kept here as a KEYED HASH (`refereeKeyOf`, `referee-exclusion.ts`), and the send
 * gate asks this table by key (`consent.ts`, step 1b): a key held is a refusal.
 * ⛔ THE KEY AND NOTHING ELSE (the U33r review's MAJOR-1): thirty-two letters a–p — an HMAC under the server's pepper, never
 * the number, never a digit, and nothing without the pepper maps it back. No instant (when a referee was named, when the
 * row was written): an applicant's `refereeConsentAt` joined on an instant would link the referee's key back to the
 * applicant. No name, no application id, and no column links it to the applicant — so the applicant's erasure leaves nothing of theirs
 * here, and the referee's protection outlives it. WHETHER a referee was given the old promise is decided by the WRITER,
 * when it writes, and only a promised referee is ever written.
 * ⛔ APPEND-ONLY, IN BOTH TWINS: `record` inserts a key not yet held and skips one already held — Postgres's ON CONFLICT DO
 * NOTHING — and there is NO update member and NO delete member (`test:dal-parity` §28). Every DAL signature below is
 * NAMED: dal-parity's `region()` would read an inline literal as the body. */

/** ONE ROW: a promised referee's number as a keyed hash — the primary key, and the whole row. */
export type StoredAgentRefereeKey = {
  /** Thirty-two letters a–p — `refereeKeyOf(msisdn)`, refused in any other spelling by both twins (`referee-key-model.ts`). */
  refereeKey: string;
};
/** One key's answer in a read: whether a row holds it. */
export type AgentRefereeKeyEntry = {
  refereeKey: string;
  held: boolean;
};

/** ⛔ `id`, `msisdn`, `createdAt` and `createdBy` are NOT patchable: the key and the
 *  provenance of a row are not editable facts. A number that changed is a different person's
 *  row, created and (if need be) the old one suppressed. */
export type MarketingContactPatch = Partial<
  Omit<StoredMarketingContact, "id" | "msisdn" | "createdAt" | "createdBy">
>;

/**
 * U22 · WHAT AN OFFICER'S EDIT MAY CHANGE — the edit form's four fields and the stamp, and nothing else.
 * ⛔ NARROWER THAN `MarketingContactPatch` ON PURPOSE: no key for the number, `sourceRef` (an erasure mark must
 * survive), the link, the caches (`consentState`, `suppressedAt` — the mirror's), the import or the provenance, so
 * the compare-and-set below cannot write them however it is called. `email` absent KEEPS the stored address.
 * `test:dal-parity` §22 holds the key set exactly.
 */
export type ContactEditPatch = {
  displayName: string | null;
  email?: string | null;
  notes: string | null;
  tags: string[];
  updatedBy: string | null;
};
/** U22 · the compare in compare-and-set: the row's `updatedAt` as the dialog was rendered. */
export type ContactEditGuard = { expectedUpdatedAt: string };
/** U22 · a compare-and-set answer: the row as written, or why nothing was — gone, or changed since. */
export type ContactCasResult =
  | { ok: true; row: StoredMarketingContact }
  | { ok: false; reason: "not_found" | "stale" };
/**
 * U23 · WHO AND WHEN, FOR A BULK WRITE. Every row a bulk tag, untag or list-add changes is stamped with the caller's
 * `at` — EXPLICITLY, in both twins, as U22's compare-and-set does (decision C25) — and the officer as `by`.
 */
export type ContactBulkStamp = {
  at: string;
  by: string;
};
/**
 * U23 · A BULK WRITE'S ANSWER, COUNTED BY THE STORE ITSELF — never by the client, never by a second read.
 * `matched`: rows the audience held when the write ran · `changed`: rows written (a row removed, for a remove) ·
 * `unchanged`: rows already as asked (the tag already carried or already absent, already on the list) · `full`: rows
 * that could not take a tag because they already carry the most a contact may (decision C11). A row the audience held
 * that is in none of the three was gone before the write reached it. `test:dal-parity` §23 holds the key set exactly.
 */
export type ContactBulkCount = {
  matched: number;
  changed: number;
  unchanged: number;
  full: number;
};

/** U20 · the sortable columns of the book. ⚠️ "operator" sorts by the PREFIX (`ndc`). */
export type ContactPageSort = "added" | "name" | "operator";
/**
 * U24 · THE AUDIENCE WHERE — what `toAudienceWhere` (`src/lib/server/marketing/audience.ts`, the ONE translation
 * from a filter) hands the twins. AND across keys, any-of within one.
 * ⛔ null means UNCONSTRAINED; an EMPTY array means NOTHING — never "no constraint": a widened bulk, export or
 * campaign audience is the defect this shape exists to make impossible.
 * ⭐ Each twin translates it ONCE (`contactMatchesAudience` below, `toPrismaContactWhere` in `prisma-dal.ts`), and
 * `test:dal-parity` §21 holds every key read by both. ⛔ Named ONLY here, in `prisma-dal.ts` and in `audience.ts`
 * (`test:contacts-audience` 1.5) — a fourth file naming it is a second path from a filter to the book.
 */
export type ContactAudienceWhere = {
  /** A WHOLE number's bare key, matched EXACTLY. ⛔ Never a substring: a masked role could rebuild a number digit by digit. */
  msisdn: string | null;
  /** A name query in the shared grammar (`CONTACT_SEARCH`). One the SQL twin cannot express is NOTHING, in both twins. */
  name: ParsedQuery | null;
  consent: ContactConsentState[] | null;
  /** true = `suppressedAt` set (the CACHE of an active stop), false = not set. */
  suppressed: boolean | null;
  /** Prefixes, expanded from operator ids by the ONE table (`ndcsForOperator`), never hand-typed. */
  ndcs: string[] | null;
  /** A member of ANY of these lists (`ContactListMember`). */
  listIds: string[] | null;
  /** Carries ANY of these tags. */
  tags: string[] | null;
  sources: ContactSource[] | null;
  /** true = linked to an account (`userId` set), false = not linked. */
  linked: boolean | null;
  importId: string | null;
  /** ISO instant, INCLUSIVE. */
  createdFrom: string | null;
  /** ISO instant, EXCLUSIVE. */
  createdBefore: string | null;
  /** A ticked selection — any of these ids. */
  ids: string[] | null;
  /** A row whose `sourceRef` EQUALS this is left out — the erased tombstone (`ERASURE_EVIDENCE`, decision C3).
   *  ⛔ NULL-SAFE in both twins: a row with NO `sourceRef` — nearly the whole book — is kept. */
  excludeSourceRef: string | null;
};
/** U20 · one page of the book. U24 · the match is an audience where; the order and the window are the page's. */
export type ContactPageQuery = {
  where: ContactAudienceWhere;
  sort: ContactPageSort;
  dir: "asc" | "desc";
  offset: number;
  limit: number;
};
export type ContactPage = { rows: StoredMarketingContact[]; total: number };
/** U20 · the counts of a match — U24: of any audience; the KPI band asks for the WHOLE book.
 *  `suppressed` counts the cached `suppressedAt`. */
export type ContactBookSummary = { total: number; given: number; unknown: number; withdrawn: number; suppressed: number };
/** U24 · a KEYSET walk over an audience, on `id` ascending. ⛔ No offset and no phone number ever forms the cursor:
 *  a row written between two calls cannot make the walk visit another row twice (an export or a send would). */
export type ContactWalkQuery = { where: ContactAudienceWhere; afterId: string | null; limit: number };
export type ContactWalk = { rows: StoredMarketingContact[]; nextAfterId: string | null };
/** U24 (decision M8) · the book's distinct tags with how many contacts carry each — the rail's pills (U21).
 *  `excludeSourceRef` is the erased tombstone, left out NULL-safely, exactly as in `ContactAudienceWhere`. */
export type ContactTagCountQuery = { excludeSourceRef: string | null; limit: number };
export type ContactTagCount = { tag: string; count: number };
/**
 * §25 · WHICH OF THESE NUMBERS THE BOOK HOLDS — keys in, keys out (`marketingContact.msisdnsPresent`).
 * `excludeSourceRef` leaves a row carrying that mark out, NULL-SAFELY, exactly as `ContactAudienceWhere` does:
 * ⭐ U30's pre-flight passes null, so an ERASED row still counts as present ("already in the book" — erasure is never
 * disclosed, X22); U38a's campaign walk passes the erasure mark, because a tombstone is in no audience (C3) and the
 * player at that number must be walked as a player, not dropped as "in the book".
 */
export type MarketingContactPresenceQuery = {
  msisdns: string[];
  excludeSourceRef: string | null;
};
/**
 * U38a · THE PLAYER ARM OF A CAMPAIGN AUDIENCE, as a KEYSET on the account id (decision X8) — `user.playerWalk`.
 * ⛔ ONLY PLAYER ACCOUNTS ON A `+255…` NUMBER: staff are never an audience, and an erased account (`erased:<id>`) or a
 * foreign number never matches the prefix. `ndcs` narrows by the number's prefix (null = any; ⛔ an EMPTY array is
 * NOTHING), and the window is the account's `createdAt` — `createdFrom` INCLUSIVE, `createdBefore` EXCLUSIVE.
 * ⛔ No offset and no phone number ever forms the cursor: `afterId` is an account id, compared `>` (never `>=`).
 */
export type PlayerWalkQuery = {
  afterId: string | null;
  limit: number;
  ndcs: string[] | null;
  createdFrom: string | null;
  createdBefore: string | null;
};
/** ⛔ KEY-ONLY: the account id and its number — no name, no date of birth, no avatar. */
export type PlayerWalkRow = {
  id: string;
  phoneE164: string;
};
export type PlayerWalk = {
  rows: PlayerWalkRow[];
  nextAfterId: string | null;
};

/* ═══ CONTACT IMPORT STAGING (marketing U29 — decisions X1 · X2 · X18–X20 · X28 · X29) ═════════════════════
 * ⭐ THE ONE STAGING MODEL (X2): a run row (`ContactImport`) and the file's records (`ContactImportRow`), so an import
 * survives a closed tab, a reload and a redeploy. ⛔ NO STORED COUNTER (OD26): every total is counted from the rows
 * (`contactImport.totals`), and the run holds only its two compare-and-set cursors and the browser's two figures.
 * ⛔ A staged row is NOT a contact and is in no audience: nothing sends from it, and nothing writes the book from it
 * but U32's ONE commit (X3). Every DAL signature below is NAMED — dal-parity's `region()` would read an inline literal
 * as the body (`SmsDlrResult`'s note) — and `test:dal-parity` §24 holds the two twins to one shape. */

/** Mirrors `ContactImportStatus` in `schema.prisma` — every status a later unit needs, created at once (X2). */
export type ContactImportStatus = "STAGING" | "STAGED" | "COMMITTING" | "PAUSED" | "DONE" | "CANCELLED";

/**
 * ONE IMPORT RUN. `stagedThrough` and `committedThrough` are ORDINALS — how many records are staged, how many the
 * commit has settled — and each moves only by a compare-and-set (`stageRows` here, U32's `commitBatch`). `totalRows`
 * and `unreadable` are the BROWSER's figures (OD29 parses in the browser), shown as "read from your file" and held to
 * what is staged; they decide nothing about consent, money or an audience.
 * ⭐ The decision (U31), the consent basis (U33) and the pause (U32) are columns HERE, each written by its own unit's
 * member, so no conditional migration is ever owed (X2). `createdBy` is a soft key, as on the book.
 */
export type StoredContactImport = {
  id: string;
  status: ContactImportStatus;
  format: ContactsFileFormat;
  /** The file's name as the browser reported it — a label, cleaned and bounded. ⛔ Never in an audit payload. */
  fileName: string | null;
  /** sha-256 of the file's bytes, 64 lower-case hex, computed in the browser: the same digest ADOPTS the run (X18). */
  fileDigest: string;
  /** U28's `ColumnMapping` (X20), validated at open. The server drafts every posted row with THIS, never a posted one. */
  mapping: ColumnMapping;
  totalRows: number;
  unreadable: number;
  stagedThrough: number;
  committedThrough: number;
  /** U31 · the officer's choice, frozen by U32's start action; null until then. */
  decisionChoice: ImportChoice | null;
  /** U31 · per-row overrides keyed by the file row, frozen with the choice; empty until then. */
  decisionOverrides: RowOverrides;
  decisionConfirmedAt: string | null;
  decisionConfirmedBy: string | null;
  /** U33 · the consent basis the run is applied under, written ONCE by U32's start action (owner gate G4). */
  consentBasis: string | null;
  consentWording: string | null;
  consentProofNote: string | null;
  adultAttestedAt: string | null;
  consentBasisSetBy: string | null;
  consentBasisSetAt: string | null;
  /** U32 · who stopped a commit and when (X18: "Stopped by Amina at 14:02"); a resume clears both. */
  pausedAt: string | null;
  pausedBy: string | null;
  /** Set when the run reaches DONE or CANCELLED; retention deletes the run 90 days after it. */
  finishedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

/**
 * ONE RECORD OF THE FILE, as the SERVER drafted it (X2, X19). `ordinal` is its place in the run — the keyset every walk
 * uses, never an offset — and `line` its row in the officer's own file (C15's name; one record per line in a run). A
 * readable record carries U28's drafted fields and their `problems` (REPORTED, never clipped — X20) and the key
 * `parseTzNumber` derives on the server (`msisdn`, null unless the number is a sendable mobile); an unreadable one
 * carries `readError` and nothing else. `outcome` and `outcomeReason` are X4's, null until U32's commit settles it.
 */
export type StoredContactImportRow = {
  importId: string;
  ordinal: number;
  line: number;
  rawPhone: string;
  msisdn: string | null;
  displayName: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  problems: FieldProblem[];
  readError: string | null;
  outcome: ImportOutcome | null;
  /** TEXT — one of `IMPORT_OUTCOME_REASONS`, read back through `parseImportOutcomeReason` (import-decide.ts). */
  outcomeReason: string | null;
  /** When the record reached us — the access export's bound (a row staged before the account existed is not theirs). */
  stagedAt: string;
};

/** Staging's compare-and-set batch: rows `from` … `from + n - 1`, staged only while `stagedThrough` is `from - 1`.
 *  `completes` moves the run to STAGED in the same write. */
export type ContactImportStageBatch = {
  importId: string;
  from: number;
  rows: StoredContactImportRow[];
  completes: boolean;
  at: string;
};
/** Why a batch was not staged. `duplicate_line` is the one-record-per-line rule refusing a line already staged. */
export type ContactImportStageLoss = "not_found" | "not_staging" | "out_of_order" | "already_staged" | "duplicate_line";
export type ContactImportStageResult =
  | { ok: true; run: StoredContactImport }
  | { ok: false; reason: ContactImportStageLoss; run: StoredContactImport | null };
/** A status compare-and-set. `updatedBefore` (the idle sweep's) also requires the run to be idle still when it lands. */
export type ContactImportTransition = {
  importId: string;
  from: ContactImportStatus[];
  to: ContactImportStatus;
  by: string | null;
  at: string;
  updatedBefore: string | null;
};
/** Counted from the rows, never stored (OD26): every row, those with a read error, those no commit has settled, and
 *  X4's four outcomes. */
export type ContactImportTotals = {
  staged: number;
  unreadable: number;
  pending: number;
  create: number;
  update: number;
  keep: number;
  fail: number;
};
/** The idle sweep's read (X29): runs in `statuses` untouched since `idleBefore`, oldest first. */
export type ContactImportIdleQuery = { statuses: ContactImportStatus[]; idleBefore: string; limit: number };
/** Retention's purge: up to `limit` DONE or CANCELLED runs finished before `finishedBefore` — their rows go with them. */
export type ContactImportFinishedPurge = { finishedBefore: string; limit: number };
/** A keyset window on `ordinal`: the rows after `afterOrdinal`, ascending, at most `limit` (clamped to the page bound). */
export type ContactImportRowWindow = { importId: string; afterOrdinal: number; limit: number };

/** The most rows one keyset page hands back — one staging batch's worth. The Prisma twin keeps the same bound. */
export const CONTACT_IMPORT_ROW_PAGE_MAX = 2000;
/** The most staged rows the access export reads for one number — a person is in a handful of files, never thousands. */
const CONTACT_IMPORT_ROWS_BY_NUMBER_MAX = 1000;

declare global {
  /** DEV ONLY — set by `/api/dev-test/marketing-contacts-seed?fault=1` so the U20 drive can photograph the
   *  contacts page's error state. Read by the MEMORY twin's `summaryWhere()` alone, which never serves production. */
  var __50PICK_CONTACTS_READ_FAULT: boolean | undefined;
}




/**
 * ⭐ EVERY TRANSACTION TYPE, AS DATA. The union below is DERIVED from this array so the
 * four surfaces that enumerate types by hand — the admin filter, the CSV export, the badge
 * lexicon and the wallet's own label map — can derive from it too, and a new type is a
 * compile error at each one instead of a row nobody can filter, export or read.
 * `AGENT_COMMISSION` is contracted income, real cash — ⛔ never `BONUS_CREDIT`.
 * `AGENT_COMMISSION_REVERSAL` is its clawback leg, kept distinct from ADJUSTMENT_DEBIT so the
 * owner's book can net commission against its own reversals.
 * `AGENT_REGISTRATION_FEE` is an applicant paying the TZS 100,000 out of their own wallet
 * (Ali, 2026-09-10) — ⛔ never `ADJUSTMENT_DEBIT`, which is both an admin action in the book
 * and, through `debitInternal`, a PARTIAL debit that would let a short balance "pay" a fee.
 */
export const TXN_TYPES = [
  "DEPOSIT", "WITHDRAWAL", "BET_PLACED", "BET_PAYOUT", "BET_REFUND", "BONUS_CREDIT",
  "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT", "CASHOUT", "HOUSE_FEE",
  "AGENT_COMMISSION", "AGENT_COMMISSION_REVERSAL", "AGENT_REGISTRATION_FEE",
] as const;

export type StoredTxn = {
  id: string;
  walletId: string;
  userId: string;
  type: (typeof TXN_TYPES)[number];
  status: "PENDING" | "PROCESSING" | "AML_REVIEW" | "CONFIRMED" | "FAILED" | "REVERSED" | "CANCELLED";
  amount: number;
  fee: number;
  taxWithheld: number;
  balanceAfter: number | null;
  currency: "TZS";
  provider: "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "TTCL_PESA" | "CARD" | "BANK_TRANSFER" | "INTERNAL" | null;
  providerRef: string | null;
  /**
   * What the payment gateway ACTUALLY said, in its own words — HTTP status,
   * resultcode, result and message (see `describeSelcom`).
   *
   * 🔴 The Prisma column has existed since the schema was written and NO code path
   * ever wrote it, so it was silently always null. On 2026-07-29 two real payouts
   * stalled in PROCESSING and the platform could not say whether Selcom had queued
   * them, refused them for an empty float, or rejected the utility code — the
   * envelope was discarded at the adapter and this field, which exists precisely to
   * hold it, was dead. It is written now on dispatch and refreshed on every status
   * re-query. Log-safe by construction: no credentials, payee masked, truncated.
   */
  providerStatus?: string | null;
  /**
   * Which Selcom payout rail this withdrawal went out on — `PayoutRail` in
   * `selcom.ts`. Null on deposits and on payouts written before rails existed.
   *
   * 🔴 Read it through `railOf()`, never raw. Each rail's status endpoint only knows
   * its own transids, so re-querying a payout on the wrong one returns an envelope
   * for a transaction it has never seen — which resolves to FAILED and makes the
   * reconcile sweep refund a player whose money already left. Null means
   * WALLET_CASHIN, which is true for every legacy row.
   */
  payoutRail?: string | null;
  msisdn: string | null;
  description: string | null;
  positionId: string | null;
  amlReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Client-generated UUID — prevents double-submit on 2G. Null for internal txns. */
  idempotencyKey?: string | null;
  /** Set once we've emailed the player that this deposit is taking a while.
   *  Exactly-once guard for the reconcile sweep's "still pending" mail. */
  pendingNotifiedAt?: string | null;
  /**
   * ⭐ THE HOUSE MARKER (house bots, PLAN §2 I8; 04 R3). The house bot whose stake this ledger row
   * belongs to; NULL for every player row. The house book reads returned money ONLY from marked
   * rows, so an unmarked payout on a house stake would vanish from its loss figures.
   *
   * ⛔ CREATE-ONLY. Both `txn.update` implementations drop it from the patch, so no later write
   * can move money between the house book and a player's.
   */
  houseBotId?: string | null;
  /** The journey funnel's origin of a DEPOSIT (Vodacom plan S3b): "low_balance", else null. ⛔ Create-only. */
  origin?: string | null;
};

export type StoredResponsibleGambling = {
  userId: string;
  dailyDepositLimit: number | null;
  weeklyDepositLimit: number | null;
  monthlyDepositLimit: number | null;
  dailyLossLimit: number | null;
  sessionTimeLimitMin: number | null;
  realityCheckIntervalMin: number;
  selfExclusionUntil: string | null;
  coolingOffUntil: string | null;
  /** When the CURRENT exclusion/cooling-off began. Null for periods set before this
   *  was recorded — the cross-operator register prints "—" rather than guessing. */
  selfExclusionStartedAt: string | null;
  coolingOffStartedAt: string | null;
  pendingIncreaseTo: number | null;
  pendingIncreaseEffectiveAt: string | null;
  pendingWeeklyIncreaseTo: number | null;
  pendingWeeklyIncreaseEffectiveAt: string | null;
  pendingMonthlyIncreaseTo: number | null;
  pendingMonthlyIncreaseEffectiveAt: string | null;
  /** E-408 · a looser loss / session limit waits 24 h. `…To` null with the time set = a pending REMOVAL. Optional:
   *  rows and fixtures written before 2026-09-14 do not carry them. */
  pendingLossLimitTo?: number | null;
  pendingLossLimitEffectiveAt?: string | null;
  pendingSessionLimitTo?: number | null;
  pendingSessionLimitEffectiveAt?: string | null;
  /** E-408 · the play-session clock per PLAYER (start of the sitting, last bet attempt) — see `checkSessionTimeLimit`. */
  playStartedAt?: string | null;
  playLastSeenAt?: string | null;
};

/**
 * Limits `redactFragment` to one bot's own notices (house-bots erasure, review LI-9): rows of `kind` whose href
 * contains `hrefIncludes`, OR that were written in `[createdFrom, createdTo]`. Omitted = every row, as before.
 */
export type NotificationRedactScope = { kind: string; hrefIncludes: string; createdFrom: string; createdTo: string };

export type StoredNotification = {
  id: string;
  userId: string;
  kind:
    | "WIN"
    | "LOSS"
    | "BET_PLACED"
    | "SELECTION_CLOSED"
    | "ROUND_RESULT"
    | "DEPOSIT"
    | "WITHDRAW"
    | "KYC"
    | "MATCH_START"
    | "RG"
    | "SECURITY"
    | "AFFILIATE"
    | "PROPOSAL"
    | "BONUS"
    /** F3 — a market on the player's watchlist closed soon / settled. */
    | "WATCHLIST"
    /** F11 — a player disputed a verdict, or an officer ruled on their dispute. */
    | "OBJECTION"
    /**
     * A verdict was RECORDED and the money has not moved yet (management ruling ①,
     * 2026-09-05). Deliberately not `WIN`/`LOSS`: nobody has been paid, and the same
     * message goes to both sides of the market. Deliberately not `SELECTION_CLOSED`:
     * that is the earlier event, when betting shut and the pools froze.
     */
    | "VERDICT"
    /** House bots: the holder's liquidity notices and the officers' house-bot alerts. Not a money kind. */
    | "HOUSE_BOT";
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  bodyEn: string;
  bodySw: string;
  bodyZh?: string | null;
  href: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
};

export type StoredSourceOfFunds = {
  userId: string;
  declaredSource: "salary" | "business" | "savings" | "investments" | "inheritance" | "other";
  declaredOccupation: string;
  declaredEmployer: string | null;
  declaredAnnualIncomeBand: "under-12m" | "12m-50m" | "50m-200m" | "over-200m";
  declaredOther: string | null;
  reviewStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewerId: string | null;
  reviewedAt: string | null;
  submittedAt: string;
};

/**
 * Affiliate account — every player automatically gets one the first time
 * their referral surface is touched (visiting /profile/invite, or someone
 * registering with their code). Keyed by userId. `code` is the public,
 * shareable referral code embedded in their link. Running totals are
 * denormalised counters kept in sync by the affiliate service so
 * /profile/invite and the /admin/affiliate roster read in O(1).
 */
export type StoredAffiliateAccount = {
  userId: string;
  code: string;
  recruitCount: number;
  totalEarnedTzs: number;
  /**
   * ⭐ THE ONE DISCRIMINATOR. Non-null ⇔ a compliance officer approved this partner.
   * ⛔ THE ROW'S EXISTENCE PROVES NOTHING — one is auto-minted for every player who ever
   * touched the referral surface. Never test "has an affiliate row" and mean "is an agent".
   */
  approvedAt: string | null;
  approvedBy: string | null;
  /**
   * The officer's explicit revocation switch. `true` on every auto-minted player row,
   * which is why it is NEVER a sufficient test on its own — always in conjunction with
   * `approvedAt`.
   */
  active: boolean;
  /** Set when an officer deactivates. Prospective only — accruals already PAID stand. */
  deactivatedAt: string | null;
  /**
   * ⚠️ A PERCENT (`20.00` = 20%), NOT a fraction. `affiliate-config`'s `commission.rate`
   * is a FRACTION (`0.5` = 50%); feeding one into the other is a 40× error.
   *
   * ⛔ NULL = no officer has priced this partner, and the agent branch of `policyFor`
   * REFUSES on it rather than falling back to the player promo's rate. It used to be NOT
   * NULL defaulting to 5.00 on every auto-minted row, which made that refusal unreachable
   * and put the whole player base one dropped conjunct away from being 5% agents.
   */
  commissionPct: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Referral reward ledger entry — the immutable record of every payout the
 * affiliate program makes. `COMMISSION` accrues from a recruit's betting
 * activity, `BONUS` from sign-up / first-deposit, `PRIZE` from a milestone.
 * status: PAID (credited to wallet) · PENDING (awaiting trigger) ·
 * HELD (withheld pending anti-fraud review).
 */
export type StoredReferralReward = {
  id: string;
  referrerUserId: string;
  recruitUserId: string;
  type: "COMMISSION" | "BONUS" | "PRIZE";
  /** Human label e.g. "Commission", "Prize · first bet", "Bonus · sign-up". */
  label: string;
  /** ⚠️ THE NET — what actually reached the wallet, after any withholding tax. */
  amountTzs: number;
  /** ⭐ The commission BEFORE the local withholding tax (management, 2026-09-08). `null` on
   *  every row accrued before that date, where `amountTzs` WAS the gross — which is why the
   *  per-recruit cap sums `grossAmountTzs ?? amountTzs`. */
  grossAmountTzs: number | null;
  /** ⭐ The withholding tax deducted from the gross and remitted to `HOUSE:TAX`. `null`/0
   *  where none applies. ⛔ Not the 15% withdrawal tax, deleted in 2026-07. */
  taxWithheldTzs: number | null;
  status: "PAID" | "PENDING" | "HELD" | "REVERSED";
  /** Recipient of this reward — almost always the referrer, but the bonus
   *  mode can also pay the NEW player; we record who actually received it. */
  recipientUserId: string;
  note: string | null;
  /**
   * The programme COPIED from the attribution's stamp at accrual — ⛔ never re-derived
   * from the referrer's role. This is the column that separates agent spend (contracted
   * commission, real cash) from promo cost (a bonus grant) in the owner's book and the
   * regulator pack.
   */
  programme: "PLAYER" | "AGENT" | null;
  /** The rate that actually priced this row, as a PERCENT. Snapshotted so a later rate
   *  change never rewrites history — the same discipline as `PredictionMarket.feeSnapshot`. */
  rateApplied: number | null;
  /** The market this accrual came from. Without it a clawback cannot find the rows to
   *  reverse when that market is voided after settlement. */
  marketId: string | null;
  /** ⭐ THE IDEMPOTENCY KEY. Commission was the ONE reward path that had none — `payBonus`
   *  and `payPrize` both passed a deterministic ref and commission passed nothing, so any
   *  replay was a double-pay. Unique in Postgres; NULLs do not collide. */
  sourceRef: string | null;
  /** Set by a clawback. The row STAYS — a reversed liability is still a fact — and its
   *  status becomes REVERSED so the cap and the earnings total stop counting it. */
  reversedAt: string | null;
  reversedReason: string | null;
  createdAt: string;
};

// ── AGENT AFFILIATE PROGRAMME ───────────────────────────────────────────────
// A vetted business partner who introduces players and earns commission.
// ⛔ RECRUITER ONLY — never holds float, never touches player money.
// Authority: docs/AGENT-PROGRAMME.md. Rate rule: docs/RULES.md §2.10.

/** ⛔ Every value needs a `STATUS_TONE` row and an en/sw/zh phrase in `dict.agent`.
 *  These are enum names, not copy — `PAYMENT_PENDING` is not a sentence anyone reads. */
export type AgentApplicationStatus =
  | "DRAFT"
  | "INVITED"
  | "KYC_SUBMITTED"
  | "PAYMENT_PENDING"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFO_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "DECLINED"
  | "EXPIRED"
  | "REVOKED";

export type AgentApplicationSource = "SELF_SERVICE" | "OFFICER_INVITED";

/** The seven documents of framework §2, plus the fee receipt. ⭐ The framework's fifth
 *  item — "Government-Issued Identification" — is deliberately absent: that is the
 *  platform's existing, certified KYC. ⛔ Do not build a second identity flow. */
export type AgentDocType =
  | "CV"
  | "REQUEST_LETTER"
  | "SERIKALI_LETTER"
  | "REFEREE_ONE_LETTER"
  | "REFEREE_ONE_ID"
  | "REFEREE_TWO_LETTER"
  | "REFEREE_TWO_ID"
  | "FEE_RECEIPT";

/** ⛔ The last three are TERMINAL — a person refused for any of them may never re-apply. */
export type AgentRejectReason =
  | "INCOMPLETE_DOCUMENTS"
  | "DOCUMENT_NOT_LEGIBLE"
  | "UNSATISFACTORY_REFEREE"
  | "DETAILS_MISMATCH"
  | "FEE_NOT_RECONCILED"
  | "STAFF_CONFLICT"
  | "OTHER"
  | "SANCTIONED"
  | "IDENTITY_MISMATCH"
  | "FRAUD";

/** What happened to the TZS 100,000. ⭐ `NONE` is the load-bearing value: a rejection from
 *  there owes nothing, and a refunds queue that forgets it tells the platform to pay out
 *  money it never took. */
export type AgentFeeDisposition = "NONE" | "WAIVED" | "COLLECTED" | "REFUND_DUE" | "REFUNDED";

export type AgentInvitationStatus = "ISSUED" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED";

export type StoredAgentApplication = {
  id: string;
  userId: string;
  status: AgentApplicationStatus;
  source: AgentApplicationSource;
  refereeOneName: string | null;
  refereeOneContact: string | null;
  refereeTwoName: string | null;
  refereeTwoContact: string | null;
  /** ⛔ REFEREE ACCOUNTABILITY. We have no relationship with a referee, so the APPLICANT
   *  attests that each consented and was shown the notice. Submission is refused without it. */
  refereeConsentAt: string | null;
  /** Stamped from `agent-config` at reconciliation — ⛔ NEVER a form field. A human-typed
   *  amount means a TZS 1,000 receipt attested as the fee passes every check. */
  feeAmountTzs: number | null;
  /** What the officer actually read on the receipt. A mismatch is a hard refusal. */
  feeAttestedTzs: number | null;
  /** ⭐ WHERE THE MONEY CAME FROM, stamped at collection (Ali, 2026-09-10). `null` = a row
   *  predating the ruling, read as `EXTERNAL`. ⛔ A refund mirrors THIS, not today's policy. */
  feeFundingSource: "WALLET" | "EXTERNAL" | null;
  /** Applicant-typed, LEGACY rail only. ⭐ UNIQUE — one receipt, one application. */
  feeReference: string | null;
  /** The officer's own evidence: the bank statement line. */
  feeStatementRef: string | null;
  feeReconciledAt: string | null;
  feeReconciledById: string | null;
  /** Masked destination captured at reconciliation, so a refund can only go back the way
   *  the money came. */
  feeSourceAccount: string | null;
  feeWaivedAt: string | null;
  feeWaivedById: string | null;
  feeWaiverReason: string | null;
  feeDisposition: AgentFeeDisposition;
  feeRefundDueAt: string | null;
  feeRefundedAt: string | null;
  feeRefundedById: string | null;
  feeRefundReference: string | null;
  feeRefundAmountTzs: number | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  rejectReason: AgentRejectReason | null;
  rejectNote: string | null;
  infoRequestNote: string | null;
  infoRequestedAt: string | null;
  /** The rate the officer set at approval, as a PERCENT. Mirrored onto
   *  `AffiliateAgent.commissionPct`; kept here as the decision record. */
  approvedRatePct: number | null;
  agentCode: string | null;
  acceptedTermsVersion: string | null;
  acceptedTermsAt: string | null;
  submittedAt: string | null;
  /** DRAFT expiry. Documents are purged when it passes. */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredAgentApplicationDocument = {
  id: string;
  applicationId: string;
  docType: AgentDocType;
  /** Written + read through the SAME storage seam as KYC. */
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  /** WHO physically supplied this file. ⛔ An officer may supply business paperwork on an
   *  invited application, but never the invitee's own ID or selfie. */
  suppliedById: string;
  uploadedAt: string;
  rejected: boolean;
  rejectReason: string | null;
  /** ⛔ TRUE for the two referee IDs — third-party personal data belonging to people who
   *  never used 50pick and cannot invoke erasure through any surface we have. */
  thirdParty: boolean;
  /** Set by `retention.purge.daily` when the bytes are destroyed. The ROW survives. */
  purgedAt: string | null;
};

export type StoredAgentInvitation = {
  id: string;
  applicationId: string | null;
  /** The phone a PRE-2026-09-08 token was bound to. ⚠️ NULL on every invitation since:
   *  the programme moved to email on 2026-09-08, when no SMS provider was licensed, and
   *  deliberately STAYED on email after Blackball went live on 2026-09-16
   *  (agent-application-service.ts `issueInvitation`). (corrected 2026-09-25) */
  phoneE164: string | null;
  /** ⭐ THE MAILBOX THE TOKEN IS BOUND TO, since 2026-09-08. Acceptance needs an OTP
   *  delivered to THIS address AND a signed-in account whose email matches it — a
   *  forwarded link is worthless, which is the property the phone binding gave.
   *  ⛔ Exactly one of `phoneE164` / `email` is set. Ask `invitationChannel()`. */
  email: string | null;
  displayName: string | null;
  /** ⛔ HASHED. A readable token in the database is a second copy of the credential. */
  tokenHash: string;
  status: AgentInvitationStatus;
  issuedById: string;
  issuedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  revokedById: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Player market proposal (Feature 2). A player proposes a market; the
 * community up/down-votes (ranking only); an officer approves → it becomes a
 * live Market; the proposer earns a fixed prize when it's both LISTED and
 * RESOLVED. Vote tallies are denormalised onto up/down and kept in sync by
 * the proposals service; individual votes live in `proposalVotes`.
 */
export type ProposalStatus = "REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "LISTED" | "RESOLVED" | "DECLINED";
export type ProposalCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure" | "tech" | "mixed";

export type StoredProposal = {
  id: string;
  proposerId: string;
  titleEn: string;
  titleSw: string | null;
  titleZh: string | null;
  description: string | null;
  resolutionCriterion: string;
  category: ProposalCategory;
  resolutionDate: string;            // ISO date (YYYY-MM-DD)
  selectionCloseDate: string | null; // ISO date (YYYY-MM-DD) — when betting closes; null = auto at publish
  sourceUrl: string | null;          // player-supplied trusted source (required at app layer)
  status: ProposalStatus;
  up: number;
  down: number;
  publishedMarketId: string | null;  // set when an officer publishes it live (go-live)
  bonusGrantedTzs: number;           // bonus (TZS) granted to the proposer at APPROVAL (0 until approved)
  bonusGrantId: string | null;       // the BonusGrant credited at approval (idempotency/audit)
  approvedAt: string | null;         // when the officer approved (bonus granted)
  declineReason: string | null;
  declineNote: string | null;
  changeNote: string | null;         // officer "request changes" note
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredProposalVote = {
  id: string;                        // `${proposalId}:${userId}`
  proposalId: string;
  userId: string;
  dir: "up" | "down";
  createdAt: string;
};

/** Why a player says the verdict is wrong. A closed list, not free text — the
 *  officer triages on the reason and the player writes their case in `detail`. */
export type ObjectionReason =
  | "WRONG_OUTCOME"        // the result is simply not what the source says
  | "SOURCE_CONTRADICTS"   // the cited source says something else
  | "AMBIGUOUS_CRITERION"  // the criterion doesn't decide this case
  | "RESOLVED_EARLY"       // settled before the real-world event concluded
  | "OTHER";

/**
 * OPEN freezes the market's money; a ruling releases it.
 *
 * There is deliberately NO player-side withdraw. An officer has to read every
 * objection anyway, so a mistaken one is released by them rejecting it — and a
 * withdraw path would have re-opened the file → withdraw → re-file loop that the
 * one-objection-per-market rule exists to close.
 */
export type ObjectionStatus = "OPEN" | "UPHELD" | "REJECTED";

/** What the officer did about an upheld objection. Only reachable while the
 *  market is unsettled — which is the entire reason settlement is gated. */
export type ObjectionRemedy = "VOID" | "REVERSE";

/**
 * A player's formal objection to a market's verdict, filed inside the objection
 * window while the pool is still intact. An OPEN objection blocks settlement
 * (see settleMarket) — that is what gives it teeth.
 */
export type StoredObjection = {
  id: string;                        // obj_…
  marketId: string;
  userId: string;                    // the objector — must hold a position
  reason: ObjectionReason;
  detail: string;                    // the player's case, capped at the app layer
  status: ObjectionStatus;
  createdAt: string;
  /** Officer review. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Set only when status === "UPHELD" — what was done to the market. */
  remedy: ObjectionRemedy | null;
  /** The verdict at the time of filing, so the audit trail shows what was
   *  actually being disputed even after a remedy changes the market. */
  outcomeAtFiling: string | null;
};

/** F3 — a player's star on a market. Composite id `${marketId}:${userId}`. */
export type StoredWatchlist = {
  id: string;
  marketId: string;
  userId: string;
  createdAt: string;
};

/** F4 — one browser push endpoint. Keyed by `endpoint` (globally unique). */
export type StoredPushSub = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** F8 — an operator-authored real-world event the AI can be steered by.
 *  `category` is a MarketCategory value (typed as string here to avoid a
 *  store ↔ market-service import cycle; events-service narrows it). */
export type StoredEvent = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  sourceUrl: string;
  note: string | null;
  generatedAt: string | null;
  aiPollId: string | null;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_STORE: {
    users: Map<string, StoredUser>;
    usersByPhone: Map<string, string>;
    kyc: Map<string, StoredKyc>;
    otps: Map<string, StoredOtp>;
    wallets: Map<string, StoredWallet>;
    walletsByUser: Map<string, string>;
    txns: Map<string, StoredTxn>;
    responsible: Map<string, StoredResponsibleGambling>;
    notifications: Map<string, StoredNotification>;
    sourceOfFunds: Map<string, StoredSourceOfFunds>;
    affiliates: Map<string, StoredAffiliateAccount>;
    referralRewards: Map<string, StoredReferralReward>;
    agentApplications: Map<string, StoredAgentApplication>;
    agentApplicationDocs: Map<string, StoredAgentApplicationDocument>;
    agentInvitations: Map<string, StoredAgentInvitation>;
    proposals: Map<string, StoredProposal>;
    proposalVotes: Map<string, StoredProposalVote>;
    objections: Map<string, StoredObjection>;
    watchlist: Map<string, StoredWatchlist>;
    pushSubs: Map<string, StoredPushSub>;
    events: Map<string, StoredEvent>;
    bonusGrants: Map<string, StoredBonusGrant>;
    inviteCampaigns: Map<string, StoredInviteCampaign>;
    inviteEntries: Map<string, StoredInviteEntry>;
    smsMessages: Map<string, StoredSmsMessage>;
    messagingConsents: Map<string, StoredMessagingConsent>;
    suppressions: Map<string, StoredSuppression>;
    optOutTokens: Map<string, StoredMarketingOptOutToken>;
    marketingContacts: Map<string, StoredMarketingContact>;
    /** ⭐ THE @unique, FAKED — msisdn -> contact id, exactly as `usersByPhone` does it. */
    contactsByMsisdn: Map<string, string>;
    contactLists: Map<string, StoredContactList>;
    /** Keyed `${listId}|${contactId}` — the compound primary key. */
    contactListMembers: Map<string, StoredContactListMember>;
    /** U29 · import runs, by id. */
    contactImports: Map<string, StoredContactImport>;
    /** U29 · each run's staged rows BY ORDINAL — ⛔ never by array index: erasure deletes a middle row. */
    contactImportRows: Map<string, Map<number, StoredContactImportRow>>;
    /** U35b · the campaign tables. */
    smsCampaigns: Map<string, StoredSmsCampaign>;
    smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
    /** ⭐ THE @@unique([campaignId, msisdn]), FAKED — `${campaignId}|${msisdn}` -> recipient id. */
    recipientsByCampaignMsisdn: Map<string, string>;
    /** U33a-L · the recorded list bases, by id. ⛔ Append-only: never deleted, revoked once. */
    contactListBases: Map<string, StoredContactListBasis>;
    /** U33r · the agent-referee keys, by `refereeKey` — the primary key, and the whole row. ⛔ Append-only. */
    agentRefereeKeys: Map<string, StoredAgentRefereeKey>;
  } | undefined;
}

const store = globalThis.__50PICK_STORE ?? (globalThis.__50PICK_STORE = {
  users: new Map(),
  usersByPhone: new Map(),
  kyc: new Map(),
  otps: new Map(),
  wallets: new Map(),
  walletsByUser: new Map(),
  txns: new Map(),
  responsible: new Map(),
  notifications: new Map(),
  sourceOfFunds: new Map(),
  affiliates: new Map(),
  referralRewards: new Map(),
  agentApplications: new Map(),
  agentApplicationDocs: new Map(),
  agentInvitations: new Map(),
  proposals: new Map(),
  proposalVotes: new Map(),
  objections: new Map(),
  watchlist: new Map(),
  pushSubs: new Map(),
  events: new Map(),
  bonusGrants: new Map(),
  inviteCampaigns: new Map(),
  inviteEntries: new Map(),
  smsMessages: new Map(),
  messagingConsents: new Map(),
  suppressions: new Map(),
  optOutTokens: new Map(),
  marketingContacts: new Map(),
  contactsByMsisdn: new Map(),
  contactLists: new Map(),
  contactListMembers: new Map(),
  contactImports: new Map(),
  contactImportRows: new Map(),
  smsCampaigns: new Map(),
  smsCampaignRecipients: new Map(),
  recipientsByCampaignMsisdn: new Map(),
  contactListBases: new Map(),
  agentRefereeKeys: new Map(),
});

// Hot-reload safety: if a previous build created the global without the newer maps,
// add them now. Without this, server-action calls into bets crash with
// "Cannot read properties of undefined" because the cached global is stale.
if (!store.usersByPhone)  store.usersByPhone = new Map();
if (!store.walletsByUser) store.walletsByUser = new Map();
if (!store.notifications) store.notifications = new Map();
if (!store.sourceOfFunds) store.sourceOfFunds = new Map();
if (!store.affiliates)      store.affiliates = new Map();
if (!store.referralRewards) store.referralRewards = new Map();
if (!store.agentApplications)    store.agentApplications = new Map();
if (!store.agentApplicationDocs) store.agentApplicationDocs = new Map();
if (!store.agentInvitations)     store.agentInvitations = new Map();
if (!store.proposals)       store.proposals = new Map();
if (!store.proposalVotes)   store.proposalVotes = new Map();
if (!store.watchlist)       store.watchlist = new Map();
if (!store.pushSubs)        store.pushSubs = new Map();
if (!store.events)          store.events = new Map();
if (!store.bonusGrants)     store.bonusGrants = new Map();
if (!store.inviteCampaigns) store.inviteCampaigns = new Map();
if (!store.inviteEntries)   store.inviteEntries = new Map();
if (!store.smsMessages)     store.smsMessages = new Map();
if (!store.messagingConsents) store.messagingConsents = new Map();
if (!store.suppressions)    store.suppressions = new Map();
if (!store.optOutTokens)    store.optOutTokens = new Map();
if (!store.marketingContacts)  store.marketingContacts = new Map();
if (!store.contactsByMsisdn)   store.contactsByMsisdn = new Map();
if (!store.contactLists)       store.contactLists = new Map();
if (!store.contactListMembers) store.contactListMembers = new Map();
if (!store.contactImports)     store.contactImports = new Map();
if (!store.contactImportRows)  store.contactImportRows = new Map();
if (!store.smsCampaigns)               store.smsCampaigns = new Map();
if (!store.smsCampaignRecipients)      store.smsCampaignRecipients = new Map();
if (!store.recipientsByCampaignMsisdn) store.recipientsByCampaignMsisdn = new Map();
if (!store.contactListBases)           store.contactListBases = new Map();
if (!store.agentRefereeKeys)           store.agentRefereeKeys = new Map();

/* ═══ U24 · THE MEMORY TWIN'S ONE AUDIENCE TRANSLATION ═════════════════════════════════════
 * ⭐ The Prisma twin's `toPrismaContactWhere` predicate for predicate, so a count on the suites' backend is
 * production's count. Every key is checked `!== null` — ⛔ never `.length` truthiness, because an EMPTY array
 * means NOTHING and a truthiness test would read it as "no constraint" and widen to the whole book
 * (`test:dal-parity` §21.empty). */
function contactMatchesAudience(c: StoredMarketingContact, w: ContactAudienceWhere): boolean {
  if (w.msisdn !== null && c.msisdn !== w.msisdn) return false;
  // ⛔ A name query SQL cannot express (`queryToWhere` → null) is NOTHING here too — never a match the
  // production twin cannot make.
  if (w.name !== null && (queryToWhere(w.name, CONTACT_SEARCH) === null || !matchesQuery(w.name, { displayName: c.displayName }, CONTACT_SEARCH))) return false;
  if (w.consent !== null && !w.consent.includes(c.consentState)) return false;
  if (w.suppressed !== null && (c.suppressedAt !== null) !== w.suppressed) return false;
  if (w.ndcs !== null && !w.ndcs.includes(c.ndc)) return false;
  if (w.listIds !== null && !w.listIds.some((l) => store.contactListMembers.has(`${l}|${c.id}`))) return false;
  if (w.tags !== null && !w.tags.some((t) => c.tags.includes(t))) return false;
  if (w.sources !== null && !w.sources.includes(c.source)) return false;
  if (w.linked !== null && (c.userId !== null) !== w.linked) return false;
  if (w.importId !== null && c.importId !== w.importId) return false;
  if (w.createdFrom !== null && Date.parse(c.createdAt) < Date.parse(w.createdFrom)) return false;
  if (w.createdBefore !== null && Date.parse(c.createdAt) >= Date.parse(w.createdBefore)) return false;
  if (w.ids !== null && !w.ids.includes(c.id)) return false;
  // ⛔ NULL-SAFE, like the Prisma twin's OR arm: a row with no sourceRef is not the excluded mark.
  if (w.excludeSourceRef !== null && c.sourceRef === w.excludeSourceRef) return false;
  return true;
}

/** Every book row an audience admits. The memory twin scans because it never serves production (the hard lock
 *  at the foot of this file); the Prisma twin pages in SQL. */
function contactsMatching(w: ContactAudienceWhere): StoredMarketingContact[] {
  return Array.from(store.marketingContacts.values()).filter((c) => contactMatchesAudience(c, w));
}

/** §25 · a bulk read's keys, deduplicated — and ⛔ REFUSED above `BULK_KEYED_READ_MAX`, never cut off: a truncated set
 *  answers for numbers nobody asked about and stays silent on the rest. The Prisma twin's `bulkKeys` is the same rule. */
function bulkKeys(keys: readonly string[], read: string): string[] {
  const unique = Array.from(new Set(keys));
  if (unique.length > BULK_KEYED_READ_MAX) {
    throw new Error(`${read}: at most ${BULK_KEYED_READ_MAX} keys a call (got ${unique.length}) — refused, never cut off`);
  }
  return unique;
}

/** U33a-L · NEWEST FIRST — the Prisma twin's `orderBy: [{ recordedAt: "desc" }, { id: "desc" }]`. ⛔ Compared as INSTANTS
 *  (`Date.parse`), never as strings: two spellings of one millisecond are one instant. The tie breaks on the id in plain
 *  code-unit order — both creates refuse any id but `lb_` and twenty lower-case letters (`list-basis-model.ts`), and in
 *  that alphabet code-unit order and every Postgres collation agree. */
function newestBasisFirst(a: StoredContactListBasis, b: StoredContactListBasis): number {
  return Date.parse(b.recordedAt) - Date.parse(a.recordedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}

/**
 * U33a-L · THE ONE DEFINITION OF A NUMBER'S BOOK STANDING IN THIS TWIN — `standingFor` and `standingAmong` both ask it, so
 * the single read and the bulk read cannot disagree, and the Prisma twin's `bookStandings` takes the same three steps in
 * the same order (`test:dal-parity` §27). Keys in (already deduplicated by the caller, and checked by the rule set), one
 * entry per key out — a number with no book row included — ordered by key.
 *   1 · the book rows by number, through the faked unique index, exactly as `findByMsisdn` reads them;
 *   2 · the memberships of the LIVE rows — ⛔ an erased tombstone's memberships are never read: it covers nothing (S9);
 *   3 · EVERY recording of those lists, revoked ones included, newest first — and of each list only its FIRST, its NEWEST
 *       recording, is its standing (M1): dropped when revoked, so revoking the newest ends the list's coverage and an older
 *       recording never comes back. ⛔ `revokedAt === null`, STRICTLY — the reverse of the stop list's falsy lift (§17):
 *       there a row refuses unless it was explicitly lifted, here a recording is in force only while it is DEFINITELY
 *       unrevoked, so a row of any other shape covers nobody. Both read the safe direction.
 * A live row's cover is the FIRST in-force recording in that order on a list it joined at or before the recording
 * (`addedAt <= recordedAt`, as instants): the newest covering recording across its lists (S8). So recording again moves
 * the ref, and a member added after a recording is not covered until the next one.
 */
function bookStandings(keys: readonly string[]): BookStandingEntry[] {
  if (keys.length === 0) return [];
  assertListBasisKeys("contactListBasis.standing", keys);
  const rows = new Map<string, StoredMarketingContact>();
  for (const msisdn of keys) {
    const id = store.contactsByMsisdn.get(msisdn);
    const c = id ? store.marketingContacts.get(id) : undefined;
    if (c) rows.set(msisdn, c);
  }
  const liveIds = new Set<string>();
  for (const c of rows.values()) if (c.sourceRef !== ERASURE_EVIDENCE) liveIds.add(c.id);
  const joined = new Map<string, Map<string, number>>();
  for (const m of store.contactListMembers.values()) {
    if (!liveIds.has(m.contactId)) continue;
    const lists = joined.get(m.contactId) ?? new Map<string, number>();
    lists.set(m.listId, Date.parse(m.addedAt));
    joined.set(m.contactId, lists);
  }
  const listIds = new Set<string>();
  for (const lists of joined.values()) for (const listId of lists.keys()) listIds.add(listId);
  const bases = Array.from(store.contactListBases.values())
    .filter((b) => listIds.has(b.listId))
    .sort(newestBasisFirst);
  const newest = new Map<string, StoredContactListBasis>();
  for (const b of bases) if (!newest.has(b.listId)) newest.set(b.listId, b);
  const inForce = [...newest.values()].filter((b) => b.revokedAt === null);
  return [...keys].sort().map((msisdn): BookStandingEntry => {
    const row = rows.get(msisdn);
    if (row === undefined) return { msisdn, standing: { row: "none", cover: null } };
    if (row.sourceRef === ERASURE_EVIDENCE) return { msisdn, standing: { row: "erased", cover: null } };
    const lists = joined.get(row.id);
    const found = lists === undefined ? undefined : inForce.find((b) => {
      const joinedAt = lists.get(b.listId);
      return joinedAt !== undefined && joinedAt <= Date.parse(b.recordedAt);
    });
    const cover: OutreachBasisCover | null = found === undefined ? null : { basisId: found.id, listId: found.listId, recordedAt: found.recordedAt };
    return { msisdn, standing: { row: "live", cover } };
  });
}

/**
 * U33r · THE ONE DEFINITION OF A REFEREE KEY'S ANSWER IN THIS TWIN — `holds` and `heldAmong` both ask it, so the single
 * read and the bulk read cannot disagree, and the Prisma twin's `refereeHeld` takes the same steps (`test:dal-parity`
 * §28). Keys in (already deduplicated by the caller, and checked by the rule set), one entry per key out — a key no row
 * holds included, as `held: false` — ordered by key.
 */
function refereeHeld(keys: readonly string[]): AgentRefereeKeyEntry[] {
  if (keys.length === 0) return [];
  assertRefereeKeys("agentRefereeKey.held", keys);
  return [...keys].sort().map((refereeKey): AgentRefereeKeyEntry => ({ refereeKey, held: store.agentRefereeKeys.has(refereeKey) }));
}

/** U38a · THE MEMORY TWIN'S PLAYER ARM — the Prisma twin's `playerWalk` where, predicate for predicate. Every key is
 *  checked `!== null` — ⛔ never `.length` truthiness: an EMPTY prefix list is NOTHING, never "no constraint". */
function playerMatchesWalk(u: StoredUser, q: PlayerWalkQuery): boolean {
  if (u.role !== "PLAYER") return false;
  if (!u.phoneE164.startsWith("+255")) return false;
  if (q.ndcs !== null && !q.ndcs.some((n) => u.phoneE164.startsWith(`+255${n}`))) return false;
  if (q.createdFrom !== null && Date.parse(u.createdAt) < Date.parse(q.createdFrom)) return false;
  if (q.createdBefore !== null && Date.parse(u.createdAt) >= Date.parse(q.createdBefore)) return false;
  return true;
}

/* ═══ U43a · THE MEMORY TWIN'S RECIPIENT HELPERS (`test:dal-parity` §26.u43a) ═════════════════════════════════════
 * One order, one copy, one apply of a write and one claim read — so the claim, `claimedBy`, the settle, the stranded read
 * and the requeue cannot each spell them a little differently. */
/** By id — the Prisma twin's `orderBy: { id: "asc" }`. Code-unit order: E21's ids are `rcp_` and lower-case hex, and in
 *  that alphabet code-unit order and every Postgres collation agree (a fixture keeps its ids fixed-width for the same
 *  reason). */
function byRecipientId(a: StoredSmsCampaignRecipient, b: StoredSmsCampaignRecipient): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
/** A copy all the way down — the gate trail too — as Postgres hands back a fresh row. */
function recipientCopy(rcp: StoredSmsCampaignRecipient): StoredSmsCampaignRecipient {
  return { ...rcp, gateTrail: rcp.gateTrail === null ? null : rcp.gateTrail.map((g) => ({ ...g })) };
}
/** ⭐ THE ONE APPLY of a write the rule set computed (`claimWrite`, `settleWrite`, `requeueWrite`): every column it sets,
 *  by name, and `attempts` moved on by its delta — the Prisma twin drives the same write through its column map
 *  (`smsRecipientData`). In place: a row is never replaced and never removed. */
function writeRecipient(r: StoredSmsCampaignRecipient, w: SmsRecipientWrite): void {
  for (const [k, v] of Object.entries(w.set)) (r as Record<string, unknown>)[k] = v;
  r.attempts += w.attemptsBy;
}
/** The campaign's rows still PENDING under one claim, by id, as copies — the claim's answer and `claimedBy`'s, ONE read
 *  (the Prisma twin's `recipientsClaimedBy`). */
function claimedRows(campaignId: string, token: string): StoredSmsCampaignRecipient[] {
  const held: StoredSmsCampaignRecipient[] = [];
  for (const r of store.smsCampaignRecipients.values()) {
    if (r.campaignId === campaignId && r.claimToken === token && r.status === "PENDING") held.push(r);
  }
  return held.sort(byRecipientId).map(recipientCopy);
}

const memoryDb = {
  // USER
  user: {
    findById: (id: string): StoredUser | null => store.users.get(id) ?? null,
    findByPhone: (phone: string): StoredUser | null => {
      const id = store.usersByPhone.get(phone);
      return id ? store.users.get(id) ?? null : null;
    },
    create: (u: StoredUser) => { store.users.set(u.id, u); store.usersByPhone.set(u.phoneE164, u.id); return u; },
    /**
     * E-409 · marketing consent lapses after 2 years without activity (Privacy §5, the owner's period in
     * DATA-RETENTION.md). Activity = the last sign-in, or account creation if there never was one. Returns the ids
     * cleared, so the retention pass can audit each. Mirrors the Prisma DAL.
     */
    expireMarketingConsent: (beforeIso: string): string[] => {
      const cutoff = Date.parse(beforeIso);
      const ids: string[] = [];
      for (const u of store.users.values()) {
        if (!u.marketingOptIn) continue;
        const last = Date.parse(u.lastLoginAt ?? u.createdAt);
        if (Number.isFinite(last) && last < cutoff) { store.users.set(u.id, { ...u, marketingOptIn: false, updatedAt: new Date().toISOString() }); ids.push(u.id); }
      }
      return ids;
    },
    /** Find a user by email (case-insensitive). Used to enforce one-email-per-account. */
    findByEmail: (email: string): StoredUser | null => {
      const norm = email.trim().toLowerCase();
      if (!norm) return null;
      for (const u of store.users.values()) if ((u.email ?? "").trim().toLowerCase() === norm) return u;
      return null;
    },
    /** EVERY account on an address, oldest first. Mirrors the Prisma DAL — see the
     *  long note there: `email` is not unique, so sign-in must disambiguate. */
    findAllByEmail: (email: string, cap = 5): StoredUser[] => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      return Array.from(store.users.values())
        .filter((u) => (u.email ?? "").trim().toLowerCase() === norm)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .slice(0, cap);
    },
    update: (id: string, patch: Partial<StoredUser>) => {
      const u = store.users.get(id);
      if (!u) return null;
      // ⭐ RE-INDEX A CHANGED NUMBER, as Postgres' unique column does by being the column (S10, §9 U16's
      // finding). The index was written on create only, so an erased account (`phoneE164` → `erased:<id>`)
      // was still found by its OLD number here while Postgres returned nobody — every suite ran the
      // player branch of the marketing gate where production runs the ledger branch.
      // ⛔ And it refuses what Postgres refuses: a number another account holds is a unique violation
      // (P2002 there), checked BEFORE anything is written; an `undefined` in the patch changes nothing.
      const newPhone = typeof patch.phoneE164 === "string" ? patch.phoneE164 : u.phoneE164;
      if (newPhone !== u.phoneE164) {
        const holder = store.usersByPhone.get(newPhone);
        if (holder && holder !== id) throw new Error(`unique constraint: phoneE164 already held (memory twin of P2002)`);
      }
      const next = { ...u, ...patch, phoneE164: newPhone, updatedAt: new Date().toISOString() };
      store.users.set(id, next);
      if (newPhone !== u.phoneE164) {
        if (store.usersByPhone.get(u.phoneE164) === id) store.usersByPhone.delete(u.phoneE164);
        store.usersByPhone.set(newPhone, id);
      }
      return next;
    },
    list: (): StoredUser[] => Array.from(store.users.values()),
    /** COUNT(*) — never materialises rows (audit H4/M5). */
    count: (): number => store.users.size,
    /** Users holding any of `roles` — replaces list().filter(...) officer scans
     *  (audit M5). Indexed on role in the Prisma DAL. */
    listByRoles: (roles: string[], select?: { id: true; email?: true }): StoredUser[] => {
      void select; // in-memory returns full rows; the Prisma DAL honours select
      return Array.from(store.users.values()).filter((u) => roles.includes(u.role));
    },
    /** Batched lookup — replaces the N+1 `findById` loops the affiliate ledger ran. */
    findByIds: (ids: string[]): StoredUser[] => {
      const out: StoredUser[] = [];
      for (const id of new Set(ids)) { const u = store.users.get(id); if (u) out.push(u); }
      return out;
    },
    /** §25 · the accounts behind a set of numbers (`+255…`, the account's own spelling) — `findByPhone` asked of a set,
     *  through the same index. ⛔ The avatar is OMITTED, exactly as the Prisma twin omits it: a copy reporting null, so
     *  the two twins hand back one shape and nothing here can be rendered as a picture. Ordered by number. */
    findByPhones: (phones: string[]): StoredUser[] => {
      const keys = bulkKeys(phones, "user.findByPhones");
      if (keys.length === 0) return [];
      const out: StoredUser[] = [];
      for (const phone of keys) {
        const id = store.usersByPhone.get(phone);
        const u = id ? store.users.get(id) : undefined;
        if (u) out.push({ ...u, avatarDataUrl: null });
      }
      return out.sort((a, b) => (a.phoneE164 < b.phoneE164 ? -1 : a.phoneE164 > b.phoneE164 ? 1 : 0));
    },
    /** U38a · THE PLAYER ARM'S KEYSET WALK, `id` ascending (see `PlayerWalkQuery`). ⭐ The SAME comparator orders the
     *  rows and places the cursor (plain code-unit order), so an account created between two calls cannot make the walk
     *  visit another twice. One extra row is read to know whether the walk is finished. The resolver clamps `limit`. */
    playerWalk: (q: PlayerWalkQuery): PlayerWalk => {
      const afterId = q.afterId;
      const rows = Array.from(store.users.values())
        .filter((u) => playerMatchesWalk(u, q) && (afterId === null || u.id > afterId))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, q.limit + 1);
      const more = rows.length > q.limit;
      const shown = more ? rows.slice(0, q.limit) : rows;
      const last = shown[shown.length - 1];
      return { rows: shown.map((u) => ({ id: u.id, phoneE164: u.phoneE164 })), nextAfterId: more && last ? last.id : null };
    },
    /** Everyone this referrer recruited — indexed on `recruitedBy` in Postgres, so the agent
     *  dashboard and `/admin/agents/[id]` stop scanning the whole user table. */
    listByRecruiter: (referrerUserId: string): StoredUser[] =>
      Array.from(store.users.values())
        .filter((u) => u.recruitedBy === referrerUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    /** COUNT of attributed users — the admin KPI that used to `list()` the whole table. */
    countRecruited: (): number => {
      let n = 0;
      for (const u of store.users.values()) if (u.recruitedBy) n++;
      return n;
    },
  },
  kyc: {
    findByUserId: (userId: string) => {
      // Return the NEWEST submission for this user (matches the Prisma DAL's
      // orderBy createdAt desc) so a resubmission reads the latest record, not
      // a stale one — important for KYC review/compliance.
      let latest: StoredKyc | null = null;
      for (const k of store.kyc.values()) {
        if (k.userId !== userId) continue;
        if (!latest || k.createdAt > latest.createdAt) latest = k;
      }
      return latest;
    },
    upsert: (k: StoredKyc) => { store.kyc.set(k.id, k); return k; },
    /**
     * Submissions in the given statuses — the officer review queue.
     *
     * ⛔ IT EXISTS BECAUSE THE POLICY CHANGED THE POPULATION, NOT BECAUSE THE OLD CODE WAS
     * SLOPPY. `listPendingKyc` used to call `db.kyc.list()` — `findMany` with NO `where`
     * and NO `select`, documents joined — and filter in JavaScript. Fine while KYC was
     * optional and production held 56 rows. From 2026-09-05 every registered player was sent to
     * verification first and had a submission, so that became a full-table scan with a join on
     * every `/admin/approvals` render, growing with sign-ups.
     * ⚠️ SUPERSEDED REASON, SAME ANSWER (2026-09-13). Identity is asked before WITHDRAWAL only, so a
     * new account has no row until the player opens /profile/kyc, and "the only route to revenue"
     * no longer describes this screen. The filter stays: the table only grows, and the queue is now
     * a MONEY queue — a player in it may be waiting to take out their own balance
     * (docs/COMPLIANCE-DECISIONS.md 2026-09-13, S14).
     */
    listByStatus: (statuses: StoredKyc["status"][]) => {
      const want = new Set(statuses);
      return Array.from(store.kyc.values()).filter((k) => want.has(k.status));
    },
    // ⚠️ `findByNida` / `findActiveByNida` LIVED HERE UNTIL 2026-08-20. They read the
    // deprecated `nidaNumber` column and had ZERO callers from the day the identity
    // tuple shipped — `findActiveByIdNumber` below replaced them, matching on the PAIR.
    // ⛔ Deleted with the column and not reinstated: a duplicate read that matches a
    // number without its document type refuses a passport for sharing digits with a
    // NIDA, and lets one human hold two accounts on two different documents.
    /**
     * 🔴 ONE DOCUMENT, ONE ACCOUNT — the duplicate read for ALL FOUR identity
     * types. A non-REJECTED submission carrying this (type, number) on a
     * DIFFERENT user.
     *
     * ⛔ It matches on the PAIR, never on the number alone. Matching the number
     * alone would refuse a passport that happens to share its digits with somebody
     * else's licence; matching the type alone is meaningless. And the pair is what
     * the partial unique index enforces, so the fast path and the enforcement must
     * ask the same question or the two disagree under load.
     *
     * ⚠️ The caller passes an ALREADY-NORMALISED number (`normaliseIdNumber`).
     * Normalising here as well would hide a call site that forgot to.
     */
    findActiveByIdNumber: (
      idType: string,
      idNumber: string,
      excludeUserId?: string,
    ): { userId: string; status: string } | null => {
      const norm = idNumber.trim();
      if (!norm || !idType) return null;
      for (const k of store.kyc.values()) {
        if ((k.idNumber ?? "").trim() !== norm) continue;
        if ((k.idType ?? "") !== idType) continue;
        if (excludeUserId && k.userId === excludeUserId) continue;
        // The partial unique index's own question (2026-09-13): a refusal frees the number,
        // EXCEPT a FINAL refusal, which keeps it reserved (`kyc-refusal.ts`).
        if (!holdsDocumentNumber(k)) continue;
        return { userId: k.userId, status: k.status };
      }
      return null;
    },
    /**
     * 🔴 THE SAME CONTROL, ON THE VALUE THAT SURVIVES ERASURE.
     *
     * `findActiveByIdNumber` above matches the RAW number, and an erased submission no
     * longer has one — `anonymizeClosedAccount` replaced it with its keyed HMAC. So a
     * document that was erased would read as free to the fast path while the DATABASE
     * still refuses it on "KycSubmission_idFingerprint_active_key", and the player would
     * meet an unexplained 500 instead of the `id_taken` refusal. Both questions get
     * asked, in the same shape, for the same reason the tuple pair does.
     *
     * Mirror of the Prisma DAL's implementation. Both halves exist because every unit
     * test runs against this store, and a Prisma-only method throws there.
     */
    findActiveByFingerprint: (
      fingerprint: string,
      excludeUserId?: string,
    ): { userId: string; status: string } | null => {
      const fp = fingerprint.trim();
      if (!fp) return null;
      for (const k of store.kyc.values()) {
        if ((k.idFingerprint ?? "") !== fp) continue;
        if (excludeUserId && k.userId === excludeUserId) continue;
        // The partial unique index's own question (2026-09-13): a refusal frees the number,
        // EXCEPT a FINAL refusal, which keeps it reserved (`kyc-refusal.ts`).
        if (!holdsDocumentNumber(k)) continue;
        return { userId: k.userId, status: k.status };
      }
      return null;
    },
    /**
     * EVERY submission this user has ever made, newest first.
     *
     * ⛔ NOT `findByUserId`, which returns the NEWEST ONE ONLY. Erasure that reads the
     * newest leaves the identity number, full name and date of birth intact on every
     * earlier submission — and a resubmission after a rejection is the ordinary case, so
     * "one row per user" is the exception, not the rule.
     */
    listByUser: (userId: string): StoredKyc[] =>
      Array.from(store.kyc.values())
        .filter((k) => k.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    /**
     * Drop every document row on a submission. Used only by erasure.
     *
     * ⛔ `upsert` CANNOT DO THIS. Its document sync is guarded by
     * `if (k.documents?.length)`, so handing it an empty array is a no-op, not a delete —
     * an erasure routine written against `upsert` alone would report success while every
     * identity image stayed in the table. The R2 objects are a separate destruction and
     * are `deleteKycDocument`'s job; this removes the rows that point at them.
     */
    deleteDocuments: (submissionId: string): number => {
      const k = store.kyc.get(submissionId);
      if (!k) return 0;
      const n = k.documents?.length ?? 0;
      store.kyc.set(submissionId, { ...k, documents: [] });
      return n;
    },
    list: () => Array.from(store.kyc.values()),
    /**
     * Mirror of the Prisma DAL's `listStageFacts` — the roster's KYC stage feed.
     * Both halves exist because every unit suite runs against this store, and a
     * Prisma-only method compiles everywhere and throws here at runtime.
     *
     * ⭐ THE TIE-BREAK IS SPELLED OUT RATHER THAN REUSING `findByUserId`'s LOOP,
     * DELIBERATELY. That loop breaks a `createdAt` tie with a strict `>`, so the
     * FIRST-inserted row wins — a THIRD answer, different from both this and the
     * Prisma half. Matching `(createdAt desc, id desc)` EXACTLY is what stops the
     * roster tag from differing between the two backends, which is the defect
     * class `prisma-dal.ts`'s `kyc.upsert` records paying for on this same table
     * on 2026-09-11.
     *
     * ⭐ A USER CAN HAVE MORE THAN ONE ROW — there is no `@@unique([userId])`, and
     * `startKyc` is a read-then-write with nothing behind it, rendered from a
     * server component. Two tabs both read null, both mint a cuid, both insert.
     * Race-born duplicates are milliseconds apart and can share a `createdAt`
     * (TIMESTAMP(3)), so `id` desc is what makes the pick REPRODUCIBLE.
     *
     * ⚠️ No snapshot skew on this side — this store is synchronous and atomic, so
     * the read-ordering rule the Prisma half needs is vacuous here. ⛔ Do not let a
     * guard that only runs against this store claim to have proven it.
     */
    listStageFacts: (): StoredKycStageRow[] => {
      const newest = new Map<string, StoredKyc>();
      for (const k of store.kyc.values()) {
        const cur = newest.get(k.userId);
        const wins = !cur
          || k.createdAt > cur.createdAt
          || (k.createdAt === cur.createdAt && k.id > cur.id);
        if (wins) newest.set(k.userId, k);
      }
      return Array.from(newest.values()).map((k) => ({
        id: k.id,
        userId: k.userId,
        status: k.status,
        // ⚠️ `?.length ?? 0`, never `?.length` truthiness — `[]` is falsy on
        // `.length`, and that exact confusion IS the P0 fixed in prisma-dal's
        // `kyc.upsert` on 2026-09-11.
        documentCount: k.documents?.length ?? 0,
        submittedAt: k.submittedAt ?? null,
        approvedAt: k.approvedAt ?? null,
        rejectReason: k.rejectReason ?? null,
        createdAt: k.createdAt,
      }));
    },
  },
  otp: {
    create: (o: StoredOtp) => { store.otps.set(o.id, o); return o; },
    /** Mirror of the Prisma DAL's prune — see its comment for why this keys on issue,
     *  not expiry. Both halves exist because unit tests run against the memory store. */
    pruneOlderThan: (beforeIso: string): number => {
      const cutoff = Date.parse(beforeIso);
      let removed = 0;
      for (const [id, o] of store.otps) {
        if (Date.parse(o.createdAt) < cutoff) { store.otps.delete(id); removed++; }
      }
      return removed;
    },
    findActive: (phone: string, purpose: string) => {
      // Most-recent active OTP (createdAt desc) — matches the Prisma DAL ordering
      // so the same code is selected in tests and prod under clock skew.
      const now = Date.now();
      return Array.from(store.otps.values())
        .filter((o) => o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
    },
    /** Return ALL active (unconsumed, unexpired) OTPs for a phone+purpose,
     *  ordered most-recent-first. Used by verifyOtpAndAuth to accept any
     *  valid OTP regardless of delivery order. */
    findAllActive: (phone: string, purpose: string): StoredOtp[] => {
      const now = Date.now();
      return Array.from(store.otps.values())
        .filter((o) => o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    /** ⭐ The same read, keyed on an EMAIL address — the channel an agent invitation uses
     *  since 2026-09-08. ⚠️ Case-insensitive: a code sent to `A@x.tz` must be findable when
     *  the account's stored email is `a@x.tz`, or the invitee is locked out by capitalisation. */
    findAllActiveByEmail: (email: string, purpose: string): StoredOtp[] => {
      const now = Date.now();
      const want = email.trim().toLowerCase();
      return Array.from(store.otps.values())
        .filter((o) => (o.email ?? "").toLowerCase() === want && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    consume: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.consumedAt = new Date().toISOString();
      store.otps.set(id, o);
      return o;
    },
    incrementAttempts: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.attempts += 1;
      store.otps.set(id, o);
      return o;
    },
    /**
     * Delete every OTP row issued to a phone number. Erasure only.
     *
     * `Otp.phoneE164` is the number itself, not a reference to the user, so tombstoning
     * `User.phoneE164` leaves it behind untouched. The 30-day prune would reach it
     * eventually; erasure is not "eventually".
     */
    deleteAllForPhone: (phone: string): number => {
      let removed = 0;
      for (const [id, o] of store.otps) {
        if (o.phoneE164 === phone) { store.otps.delete(id); removed++; }
      }
      return removed;
    },
  },
  wallet: {
    findByUserId: (userId: string): StoredWallet | null => {
      const id = store.walletsByUser.get(userId);
      return id ? store.wallets.get(id) ?? null : null;
    },
    /** All wallets — analytics only (wallet liability total). */
    listAll: (): StoredWallet[] => Array.from(store.wallets.values()),
    create: (w: StoredWallet) => { store.wallets.set(w.id, w); store.walletsByUser.set(w.userId, w.id); return w; },
    update: (id: string, patch: Partial<StoredWallet>) => {
      const w = store.wallets.get(id);
      if (!w) return null;
      const next = { ...w, ...patch, updatedAt: new Date().toISOString() };
      store.wallets.set(id, next);
      return next;
    },
    /**
     * Atomically apply balance/hold/pending DELTAS, optionally guarded by a
     * minimum (for overdraw-safe debits). Returns the updated wallet, or null
     * if the wallet is missing OR a guard failed (e.g. insufficient balance).
     *
     * This is the money-safe mutation: the Prisma implementation maps to a
     * single conditional `updateMany` (DB-atomic `increment`/`decrement` with a
     * `WHERE balance >= n` guard), so concurrent debits/credits on the same
     * wallet can never lose an update or overdraw — correct even across multiple
     * server instances, where the in-process lock alone would not be.
     */
    adjust: (
      id: string,
      deltas: { balance?: number; hold?: number; pending?: number; bonusBalance?: number },
      opts?: { requireBalanceGte?: number; requireHoldGte?: number; requireBonusBalanceGte?: number },
    ): StoredWallet | null => {
      const w = store.wallets.get(id);
      if (!w) return null;
      if (opts?.requireBalanceGte !== undefined && w.balance < opts.requireBalanceGte) return null;
      if (opts?.requireHoldGte !== undefined && w.hold < opts.requireHoldGte) return null;
      if (opts?.requireBonusBalanceGte !== undefined && (w.bonusBalance ?? 0) < opts.requireBonusBalanceGte) return null;
      const next: StoredWallet = {
        ...w,
        balance: w.balance + (deltas.balance ?? 0),
        hold: w.hold + (deltas.hold ?? 0),
        pending: w.pending + (deltas.pending ?? 0),
        bonusBalance: (w.bonusBalance ?? 0) + (deltas.bonusBalance ?? 0),
        updatedAt: new Date().toISOString(),
      };
      store.wallets.set(id, next);
      return next;
    },
  },
  txn: {
    create: (t: StoredTxn) => { store.txns.set(t.id, t); return t; },
    /**
     * ⭐ `excludeHouseBets` (C5-SPEC ruling 173): drop house-marked rows (`houseBotId != null`) INSIDE the filter, BEFORE
     * `.slice(-limit)` — or a holder's newest-N window stays flooded by house rows on this store only. Default off, so every
     * existing caller reads exactly what it read before.
     */
    findByUser: (userId: string, limit = 50, opts?: { excludeHouseBets?: boolean }) =>
      Array.from(store.txns.values()).filter((t) => t.userId === userId && (!opts?.excludeHouseBets || t.houseBotId == null)).slice(-limit).reverse(),
    /**
     * ⭐ ONE PLAYER'S TRANSACTIONS INSIDE A DATE WINDOW, NEWEST FIRST — the read `/wallet` filters
     * over. The window is applied HERE, in the store, and that is the whole point: filtering an
     * already-truncated page would search only the newest 1,000 rows, so a player narrowing to
     * "last 30 days" to find an older withdrawal would be searching the very rows the cap had
     * already handed them. ⛔ A filter over an incomplete population is a check that lies.
     *
     * ⚠️ IT SORTS BY `createdAt` EXPLICITLY, WHERE `findByUser` ABOVE SORTS BY INSERTION ORDER
     * (`.slice(-limit).reverse()`). That divergence is pre-existing and is not widened here: the
     * Prisma twin orders `createdAt: "desc"`, so this half now says the same thing in the same
     * words, and a suite that passes against the memory store means the same in production.
     *
     * Bounds match `listInRange` — `>= from`, `< to` — so two reads of one span cannot disagree.
     */
    findByUserWindow: (userId: string, fromMs: number, toMs: number, limit: number): StoredTxn[] =>
      Array.from(store.txns.values())
        .filter((t) => {
          if (t.userId !== userId) return false;
          const at = Date.parse(t.createdAt);
          return at >= fromMs && at < toMs;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    /**
     * ⭐ ONE PLAYER'S ROWS OF THE GIVEN TYPES, NEWEST FIRST — the Receipts page's read (2026-10-07). The memory half of
     * `prisma-dal.ts`'s `findByUserTypes`, in the same order: `createdAt` desc, then `id` desc to break a tie — so a suite
     * that passes here means the same against Postgres. ⛔ BOTH HALVES EXIST OR NEITHER DOES.
     */
    findByUserTypes: (userId: string, types: readonly StoredTxn["type"][], limit: number): StoredTxn[] =>
      Array.from(store.txns.values())
        .filter((t) => t.userId === userId && types.includes(t.type))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        .slice(0, limit),
    findById: (id: string) => store.txns.get(id) ?? null,
    findByProviderRef: (providerRef: string) => Array.from(store.txns.values()).find((t) => t.providerRef === providerRef) ?? null,
    update: (id: string, patch: Partial<StoredTxn>) => {
      const t = store.txns.get(id);
      if (!t) return null;
      // ⛔ The house marker AND the position link are create-only — the Prisma twin skips both keys the same way, so
      // a patch can neither re-mark nor un-mark a ledger row in either store, and cannot POSITION an unmarked one
      // either (C5-7's review: `positionId` passed through here, and a row positioned by an update is permanently
      // unmarkable — visible in the holder's own wallet feed and missing from the house book's `returned`, with
      // ruling 232's `.txn.create(` pin blind to it). The pin is `test:house-bot-reports` 0.232.4.
      const { houseBotId: _marker, positionId: _positioned, origin: _origin, ...rest } = patch;
      const next = { ...t, ...rest, updatedAt: new Date().toISOString() };
      store.txns.set(id, next);
      return next;
    },
    listByStatus: (status: StoredTxn["status"]) => Array.from(store.txns.values()).filter((t) => t.status === status),
    /** Every transaction, ALL TIME. ⛔ Never on a windowed path — use `listInRange` (guarded by
     *  `test:report-parity` §4 and `test:report-window-reads`). */
    listAll: (): StoredTxn[] => Array.from(store.txns.values()),
    /** In-memory twin of the Prisma DAL's SQL range query. Same bounds — `>= from`,
     *  `< to` — so a report cannot produce different totals depending on which store it
     *  ran against. */
    listInRange: (fromMs: number, toMs: number): StoredTxn[] =>
      Array.from(store.txns.values()).filter((t) => {
        const at = Date.parse(t.createdAt);
        return at >= fromMs && at < toMs;
      }),
    listForUser: (userId: string): StoredTxn[] =>
      Array.from(store.txns.values()).filter((t) => t.userId === userId),
    /** In-memory twin of the SQL GROUP BY. Same ordering rule — margin descending — so
     *  the admin page ranks identically whichever store it ran against. */
    topContributors: (limit: number): Array<{ userId: string; stakes: number; payouts: number }> => {
      const acc = new Map<string, { stakes: number; payouts: number }>();
      for (const t of store.txns.values()) {
        if (t.status !== "CONFIRMED") continue;
        const isStake = t.type === "BET_PLACED";
        const isPayout = t.type === "BET_PAYOUT" || t.type === "CASHOUT";
        if (!isStake && !isPayout) continue;
        const e = acc.get(t.userId) ?? { stakes: 0, payouts: 0 };
        if (isStake) e.stakes += Math.abs(t.amount);
        else e.payouts += Math.abs(t.amount);
        acc.set(t.userId, e);
      }
      return Array.from(acc, ([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => (b.stakes - b.payouts) - (a.stakes - a.payouts))
        .slice(0, limit);
    },
    /** Filtered + paginated transaction search for the compliance browser.
     *  Summary totals cover the WHOLE filtered set, not the returned page —
     *  an operator reconciling against a gateway statement needs the full figure.
     *  Filter/sort rules live in `txn-filters.ts` so this and the Prisma DAL
     *  can't drift. */
    search: (f: TxnSearchFilters = {}): TxnSearchResult => {
      const all = Array.from(store.txns.values()).filter((t) => matchesFilters(t, f));
      return { rows: sortAndPage(all, f), total: all.length, summary: summarise(all) };
    },
    findByIdempotencyKey: (key: string): StoredTxn | null => {
      for (const t of store.txns.values()) if (t.idempotencyKey === key) return t;
      return null;
    },
    /** Sum of deposits for a user since a cutoff timestamp. No row-count cap.
     *  `includePending` also counts PROCESSING deposits — used by the RG deposit-
     *  cap + SOF gate so an in-flight deposit is visible to a concurrent one
     *  (audit C4). Off by default (the player-facing dashboard wants confirmed-only). */
    sumDepositsSince: (userId: string, sinceMs: number, includePending = false): number => {
      let sum = 0;
      for (const t of store.txns.values()) {
        const counts = t.status === "CONFIRMED" || (includePending && t.status === "PROCESSING");
        if (t.userId === userId && t.type === "DEPOSIT" && counts && Date.parse(t.createdAt) >= sinceMs) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Net real-money gambling result for a user since a cutoff — Σ of the signed
     *  amounts of the four gambling txn types (BET_PLACED is negative money-out;
     *  BET_PAYOUT / BET_REFUND / CASHOUT are positive money-back). A negative
     *  return = net loss. Powers the daily loss-limit gate. */
    sumGamblingNetSince: (userId: string, sinceMs: number): number => {
      let sum = 0;
      for (const t of store.txns.values()) {
        if (
          t.userId === userId &&
          t.status === "CONFIRMED" &&
          (t.type === "BET_PLACED" || t.type === "BET_PAYOUT" || t.type === "BET_REFUND" || t.type === "CASHOUT") &&
          Date.parse(t.createdAt) >= sinceMs
        ) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Per-user Σ of CONFIRMED signed amounts across the given txn types since a
     *  cutoff (in-memory twin of the windowed Prisma aggregate). SIGNED sum —
     *  BET_PLACED / WITHDRAWAL are negative money-out. Powers "Your activity". */
    sumUserByTypesSince: (userId: string, sinceMs: number, types: StoredTxn["type"][]): number => {
      const set = new Set<StoredTxn["type"]>(types);
      let sum = 0;
      for (const t of store.txns.values()) {
        if (t.userId === userId && t.status === "CONFIRMED" && set.has(t.type) && Date.parse(t.createdAt) >= sinceMs) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Platform-wide Σ of CONFIRMED amounts across the given txn types (in-memory
     *  twin of the Prisma DB aggregate). Powers the landing "paid out" stats band. */
    sumConfirmedByTypes: (types: StoredTxn["type"][]): number => {
      const set = new Set<StoredTxn["type"]>(types);
      let sum = 0;
      for (const t of store.txns.values()) {
        if (t.status === "CONFIRMED" && set.has(t.type)) sum += t.amount;
      }
      return sum;
    },
    /**
     * Per-type CONFIRMED count and ABSOLUTE sum — in-memory twin of the Prisma
     * GROUP BY. Powers the Selcom statement (`selcom-statement.ts`), which must not
     * walk a 20,000-row ledger to print three numbers.
     *
     * ⚠️ ABSOLUTE, unlike `sumConfirmedByTypes` above, and that is the whole reason
     * this is a separate method rather than a parameter on that one. Withdrawals are
     * stored NEGATIVE, so a signed sum prints a negative "money out" and makes a
     * `net` that adds when it should subtract. A statement wants magnitudes and a
     * direction it decides itself; the landing's "paid out" band wants the signed
     * sum. Two questions, two methods.
     */
    /** In-memory twin of the Prisma read: the newest `limit` CONFIRMED rows of one type,
     *  `createdAt` then `id` descending — the order a "most recent N" disclosure promises. */
    newestConfirmedOfType: (type: StoredTxn["type"], limit: number): StoredTxn[] =>
      Array.from(store.txns.values())
        .filter((t) => t.type === type && t.status === "CONFIRMED")
        .sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0) || b.id.localeCompare(a.id))
        .slice(0, Math.max(0, limit)),
    totalsByType: (types: StoredTxn["type"][]): Record<string, { amount: number; count: number }> => {
      const out: Record<string, { amount: number; count: number }> = {};
      for (const t of types) out[t] = { amount: 0, count: 0 };
      for (const t of store.txns.values()) {
        if (t.status !== "CONFIRMED") continue;
        const slot = out[t.type];
        if (!slot) continue;
        slot.amount += Math.abs(t.amount);
        slot.count += 1;
      }
      return out;
    },
    /** Transactions since `sinceMs` (optionally filtered to `types`) — in-memory
     *  twin of the windowed Prisma query. */
    listSince: (sinceMs: number, opts?: { types?: StoredTxn["type"][] }): StoredTxn[] => {
      const set = opts?.types && opts.types.length ? new Set<StoredTxn["type"]>(opts.types) : null;
      const out: StoredTxn[] = [];
      for (const t of store.txns.values()) {
        if (Date.parse(t.createdAt) >= sinceMs && (!set || set.has(t.type))) out.push(t);
      }
      return out;
    },
  },
  responsible: {
    get: (userId: string) => store.responsible.get(userId) ?? null,
    listAll: () => Array.from(store.responsible.values()),
    upsert: (r: StoredResponsibleGambling) => { store.responsible.set(r.userId, r); return r; },
    /** E-408 · write ONLY the play clock, so it cannot clobber a limit saved in between. No row → nothing (no limit to measure). */
    touchPlayClock: (userId: string, startedAtIso: string, lastSeenIso: string): void => {
      const cur = store.responsible.get(userId);
      if (cur) store.responsible.set(userId, { ...cur, playStartedAt: startedAtIso, playLastSeenAt: lastSeenIso });
    },
  },
  notification: {
    create: (n: StoredNotification) => { store.notifications.set(n.id, n); return n; },
    /** Mirror of the Prisma DAL's dedupe lookup — the two must not diverge, or
     *  the behaviour tests prove in memory is not the behaviour production has. */
    findRecentDuplicate: (q: {
      userId: string; kind: string; titleEn: string; bodyEn: string; href: string | null; sinceMs: number;
    }): StoredNotification | null => {
      const cutoff = Date.now() - q.sinceMs;
      const hits = Array.from(store.notifications.values()).filter((n) =>
        n.userId === q.userId && n.kind === q.kind &&
        n.titleEn === q.titleEn && n.bodyEn === q.bodyEn &&
        (n.href ?? null) === q.href &&
        Date.parse(n.createdAt) >= cutoff);
      if (!hits.length) return null;
      hits.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return hits[0];
    },
    /** Mirror of the Prisma DAL's once-per-period check — see its header for why
     *  this is unbounded in time and `findRecentDuplicate` is not. */
    existsWithHref: (userId: string, href: string): boolean =>
      Array.from(store.notifications.values()).some((n) => n.userId === userId && n.href === href),
    /**
     * Delete in-app notifications created before `beforeIso`. Returns the count removed.
     *
     * ⚠️ THE PERIOD IS NOT A FREE CHOICE — see `retention.ts`. `existsWithHref` above is
     * deliberately unbounded in time because it is the Up & Down digest's only idempotency
     * key, and this method deletes the rows that answer is read from.
     *
     * Mirror of the Prisma DAL's implementation. Both halves exist because the in-memory
     * store is what every unit test runs against; a Prisma-only method throws there.
     */
    pruneOlderThan: (beforeIso: string): number => {
      const cutoff = Date.parse(beforeIso);
      let removed = 0;
      for (const [id, n] of store.notifications) {
        if (Date.parse(n.createdAt) < cutoff) { store.notifications.delete(id); removed++; }
      }
      return removed;
    },
    findByUser: (userId: string, limit = 50) =>
      Array.from(store.notifications.values())
        .filter((n) => n.userId === userId && !n.dismissedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    countUnread: (userId: string) =>
      Array.from(store.notifications.values()).filter((n) => n.userId === userId && !n.readAt && !n.dismissedAt).length,
    /**
     * Mirror of the Prisma DAL's `page` — the `/notifications` screen's one read.
     *
     * ⛔ BOTH HALVES EXIST OR NEITHER DOES. The in-memory store is what every unit test and
     * every local boot runs against, so a Prisma-only method throws there and the suite that
     * was supposed to prove the screen proves nothing. Same contract, same ordering, same
     * count semantics — if these two ever disagree, the tests are measuring a product that
     * does not ship.
     */
    page: (q: {
      userId: string;
      filter: NotificationFilter;
      sort: NotificationSort;
      page: number;
      perPage: number;
      /** The raw search text — see the Prisma twin. `undefined`/`""` mean "no search". */
      q?: string;
    }) => {
      /**
       * ⛔ `matchesQuery`, THE TWIN OF THE PRISMA HALF'S `queryToWhere`. The two are asserted
       * equivalent by `scripts/search-grammar.test.mts`, which is the whole reason a search may be
       * pushed into SQL on one side and run in JS on the other without the screen changing meaning
       * between a Postgres deploy and an in-memory boot.
       */
      const parsed = parseQuery(q.q ?? "", { fields: fieldNames(NOTIFICATION_SEARCH) });
      const hit = (n: StoredNotification) =>
        matchesQuery(parsed, n as unknown as Record<string, string | null | undefined>, NOTIFICATION_SEARCH);

      const mineAll = Array.from(store.notifications.values()).filter((n) => n.userId === q.userId);
      // ⛔ The search narrows the COUNTS as well as the rows — see the Prisma twin's note. A pill
      //    that promised a number folded over the unsearched inbox would over-promise on every
      //    lens the moment a player types.
      const mine = mineAll.filter(hit);
      const live = mine.filter((n) => !n.dismissedAt);
      const kinds = kindsFor(q.filter);
      const base = showsCleared(q.filter) ? mine.filter((n) => !!n.dismissedAt) : live;
      const matched = base
        .filter((n) => (q.filter === "unread" ? !n.readAt : true))
        .filter((n) => (kinds ? kinds.includes(n.kind as never) : true));
      const sorted = [...matched].sort((a, b) =>
        q.sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt));
      const skip = Math.max(0, (q.page - 1) * q.perPage);
      const inKinds = (n: StoredNotification, ks: readonly string[]) => ks.includes(n.kind as never);
      return {
        items: sorted.slice(skip, skip + q.perPage),
        total: sorted.length,
        counts: {
          all: live.length,
          unread: live.filter((n) => !n.readAt).length,
          money: live.filter((n) => inKinds(n, MONEY_FILTER_KINDS)).length,
          account: live.filter((n) => inKinds(n, ACCOUNT_FILTER_KINDS)).length,
          cleared: mine.filter((n) => !!n.dismissedAt).length,
        } as Record<NotificationFilter, number>,
      };
    },
    /** Mirror of the Prisma DAL's `restore` — owner-scoped, undoes a dismissal. */
    restore: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, dismissedAt: null };
      store.notifications.set(id, next);
      return next;
    },
    markRead: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, readAt: n.readAt ?? new Date().toISOString() };
      store.notifications.set(id, next);
      return next;
    },
    markAllRead: (userId: string) => {
      const now = new Date().toISOString();
      let count = 0;
      for (const n of store.notifications.values()) {
        if (n.userId === userId && !n.readAt && !n.dismissedAt) {
          store.notifications.set(n.id, { ...n, readAt: now });
          count++;
        }
      }
      return count;
    },
    dismiss: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, dismissedAt: new Date().toISOString() };
      store.notifications.set(id, next);
      return next;
    },
    dismissAll: (userId: string) => {
      const now = new Date().toISOString();
      let count = 0;
      for (const n of store.notifications.values()) {
        if (n.userId === userId && !n.dismissedAt) {
          store.notifications.set(n.id, { ...n, dismissedAt: now });
          count++;
        }
      }
      return count;
    },
    /**
     * Delete every notification belonging to one user. Erasure only.
     *
     * ⛔ NOT `dismissAll` — dismissing hides a row whose `bodyEn` still says what the
     * player bet and won. In-app notifications are "operational only, 180 days" on
     * docs/DATA-RETENTION.md: no statute asks us to keep them, so erasure deletes them
     * rather than pretending a `dismissedAt` is a deletion.
     *
     * ⚠️ It also removes the rows `existsWithHref` answers from — the Up & Down digest's
     * only idempotency key. That is safe HERE and nowhere else: the account is CLOSED and
     * erased, so a replayed digest has nobody to double-notify.
     */
    deleteAllForUser: (userId: string): number => {
      let removed = 0;
      for (const [id, n] of store.notifications) {
        if (n.userId === userId) { store.notifications.delete(id); removed++; }
      }
      return removed;
    },
    /**
     * 🔴 OVERWRITE A FROZEN MASK WHEREVER IT LANDED IN SOMEBODY ELSE'S ROW.
     *
     * `notifyReferralJoined` writes `maskName(displayName, phoneE164)` into the
     * REFERRER's notification body — "+255•••417 signed up with your link." — and freezes
     * it there at write time. That is the last three digits of the recruit's phone number,
     * sitting in a row erasure does not own and `deleteAllForUser` above does not reach.
     * Same defect as `Comment.authorName`, one table across.
     *
     * ⚠️ Matches on the MASK, not the phone number, because the mask is what was stored.
     * Two accounts sharing a country prefix and last three digits would both be replaced;
     * the cost of that collision is one notification reading "a former member" instead of
     * a mask, which is the right side to err on.
     */
    redactFragment: (fragment: string, replacement: string, scope?: NotificationRedactScope): number => {
      if (!fragment) return 0;
      let changed = 0;
      for (const [id, n] of store.notifications) {
        if (scope && !(n.kind === scope.kind && ((n.href ?? "").includes(scope.hrefIncludes)
          || (n.createdAt >= scope.createdFrom && n.createdAt <= scope.createdTo)))) continue;
        const next = { ...n };
        let hit = false;
        for (const f of ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"] as const) {
          const v = (next as Record<string, unknown>)[f];
          if (typeof v === "string" && v.includes(fragment)) {
            (next as Record<string, unknown>)[f] = v.split(fragment).join(replacement);
            hit = true;
          }
        }
        if (hit) { store.notifications.set(id, next); changed++; }
      }
      return changed;
    },
  },
  sourceOfFunds: {
    get: (userId: string) => store.sourceOfFunds.get(userId) ?? null,
    upsert: (s: StoredSourceOfFunds) => { store.sourceOfFunds.set(s.userId, s); return s; },
    listPending: () => Array.from(store.sourceOfFunds.values()).filter((s) => s.reviewStatus === "PENDING"),
  },
  affiliate: {
    findByUserId: (userId: string): StoredAffiliateAccount | null => store.affiliates.get(userId) ?? null,
    findByCode: (code: string): StoredAffiliateAccount | null => {
      const norm = code.trim().toUpperCase();
      for (const a of store.affiliates.values()) if (a.code === norm) return a;
      return null;
    },
    create: (a: StoredAffiliateAccount): StoredAffiliateAccount => { store.affiliates.set(a.userId, a); return a; },
    update: (userId: string, patch: Partial<StoredAffiliateAccount>): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, ...patch, updatedAt: new Date().toISOString() };
      store.affiliates.set(userId, next);
      return next;
    },
    /** Atomic +1 to recruitCount (audit M7) — a lost-update-safe increment
     *  (Prisma `{ increment: 1 }`); never read-modify-write from app code. */
    incrementRecruitCount: (userId: string): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, recruitCount: a.recruitCount + 1, updatedAt: new Date().toISOString() };
      store.affiliates.set(userId, next);
      return next;
    },
    /**
     * ⭐ Atomic ± to `totalEarnedTzs` — the SAME fix `incrementRecruitCount` already got, on
     * the counter that carries money. `recordReward` used to do
     * `update(userId, { totalEarnedTzs: acct.totalEarnedTzs + amount })`, a read-modify-write
     * across two different per-recruit locks: two recruits of one agent settling at the same
     * moment each read the same total and each wrote their own, so one accrual vanished from
     * the agent's own earnings statement while its reward row survived.
     *
     * `delta` is signed — a clawback passes a negative.
     */
    incrementEarned: (userId: string, delta: number): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, totalEarnedTzs: a.totalEarnedTzs + delta, updatedAt: new Date().toISOString() };
      store.affiliates.set(userId, next);
      return next;
    },
    list: (): StoredAffiliateAccount[] => Array.from(store.affiliates.values()),
  },
  referralReward: {
    create: (r: StoredReferralReward): StoredReferralReward => { store.referralRewards.set(r.id, r); return r; },
    update: (id: string, patch: Partial<StoredReferralReward>): StoredReferralReward | null => {
      const r = store.referralRewards.get(id);
      if (!r) return null;
      const next: StoredReferralReward = { ...r, ...patch };
      store.referralRewards.set(id, next);
      return next;
    },
    list: (limit = 500): StoredReferralReward[] =>
      Array.from(store.referralRewards.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    listByReferrer: (referrerUserId: string): StoredReferralReward[] =>
      Array.from(store.referralRewards.values())
        .filter((r) => r.referrerUserId === referrerUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    listByRecruit: (recruitUserId: string): StoredReferralReward[] =>
      Array.from(store.referralRewards.values()).filter((r) => r.recruitUserId === recruitUserId),
    /** ⭐ The idempotency lookup. Commission is the one reward path that had no key, so any
     *  replay was a double-pay; this is what makes a replay tool safe to build. */
    findBySourceRef: (sourceRef: string): StoredReferralReward | null => {
      for (const r of store.referralRewards.values()) if (r.sourceRef === sourceRef) return r;
      return null;
    },
    /** Every accrual a market produced — the population a clawback reverses. */
    listByMarket: (marketId: string): StoredReferralReward[] =>
      Array.from(store.referralRewards.values()).filter((r) => r.marketId === marketId),
    /**
     * ⭐ THE TOTALS, OVER EVERY ROW. `/admin/affiliate` computed its "all-time" money
     * figures over `list(1000)` — the newest thousand rewards, labelled as everything. A
     * grouped aggregate cannot truncate. Rows are (programme × type × status) with a count
     * and a sum; the caller seeds absent cells to zero, because a missing group renders as
     * blank and blank reads as broken rather than as a true zero.
     */
    totals: (): Array<{ programme: "PLAYER" | "AGENT" | null; type: StoredReferralReward["type"]; status: StoredReferralReward["status"]; count: number; sumTzs: number }> => {
      const cells = new Map<string, { programme: "PLAYER" | "AGENT" | null; type: StoredReferralReward["type"]; status: StoredReferralReward["status"]; count: number; sumTzs: number }>();
      for (const r of store.referralRewards.values()) {
        const key = `${r.programme ?? "null"}|${r.type}|${r.status}`;
        const cell = cells.get(key) ?? { programme: r.programme, type: r.type, status: r.status, count: 0, sumTzs: 0 };
        cell.count += 1;
        cell.sumTzs += r.amountTzs;
        cells.set(key, cell);
      }
      return Array.from(cells.values());
    },
  },

  // ── AGENT APPLICATION ─────────────────────────────────────────────────────
  agentApplication: {
    create: (a: StoredAgentApplication): StoredAgentApplication => { store.agentApplications.set(a.id, a); return a; },
    findById: (id: string): StoredAgentApplication | null => store.agentApplications.get(id) ?? null,
    /**
     * The ONE live application for a user, if any. ⛔ "Live" excludes every terminal state:
     * a refused, declined, lapsed or ended application deliberately frees the person to
     * apply again. This mirrors the partial unique index in Postgres — and the memory
     * backend has no index at all, which is exactly why the SERVICE check is the primary
     * guard and the index only the race-loser backstop.
     */
    findActiveByUser: (userId: string): StoredAgentApplication | null => {
      const terminal = new Set<AgentApplicationStatus>(["REJECTED", "DECLINED", "EXPIRED", "REVOKED"]);
      for (const a of store.agentApplications.values()) {
        if (a.userId === userId && !terminal.has(a.status)) return a;
      }
      return null;
    },
    findByFeeReference: (feeReference: string): StoredAgentApplication | null => {
      const norm = feeReference.trim().toUpperCase();
      for (const a of store.agentApplications.values()) {
        if ((a.feeReference ?? "").trim().toUpperCase() === norm) return a;
      }
      return null;
    },
    listByUser: (userId: string): StoredAgentApplication[] =>
      Array.from(store.agentApplications.values())
        .filter((a) => a.userId === userId)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
    update: (id: string, patch: Partial<StoredAgentApplication>): StoredAgentApplication | null => {
      const a = store.agentApplications.get(id);
      if (!a) return null;
      const next: StoredAgentApplication = { ...a, ...patch, updatedAt: new Date().toISOString() };
      store.agentApplications.set(id, next);
      return next;
    },
    list: (): StoredAgentApplication[] =>
      Array.from(store.agentApplications.values()).sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
    listByStatus: (statuses: AgentApplicationStatus[]): StoredAgentApplication[] => {
      const want = new Set(statuses);
      return Array.from(store.agentApplications.values())
        .filter((a) => want.has(a.status))
        // Oldest first: a queue an officer works through, not a feed.
        .sort((x, y) => (x.submittedAt ?? x.createdAt).localeCompare(y.submittedAt ?? y.createdAt));
    },
  },

  agentApplicationDoc: {
    create: (d: StoredAgentApplicationDocument): StoredAgentApplicationDocument => { store.agentApplicationDocs.set(d.id, d); return d; },
    findById: (id: string): StoredAgentApplicationDocument | null => store.agentApplicationDocs.get(id) ?? null,
    /** One file per slot — `attachDocument` REPLACES rather than appends, so an officer
     *  never reviews two versions without knowing which is current. */
    findSlot: (applicationId: string, docType: AgentDocType): StoredAgentApplicationDocument | null => {
      for (const d of store.agentApplicationDocs.values()) {
        if (d.applicationId === applicationId && d.docType === docType) return d;
      }
      return null;
    },
    listByApplication: (applicationId: string): StoredAgentApplicationDocument[] =>
      Array.from(store.agentApplicationDocs.values()).filter((d) => d.applicationId === applicationId),
    update: (id: string, patch: Partial<StoredAgentApplicationDocument>): StoredAgentApplicationDocument | null => {
      const d = store.agentApplicationDocs.get(id);
      if (!d) return null;
      const next: StoredAgentApplicationDocument = { ...d, ...patch };
      store.agentApplicationDocs.set(id, next);
      return next;
    },
    delete: (id: string): boolean => store.agentApplicationDocs.delete(id),
    /** The retention sweep's working set: undestroyed scans, newest bound by the caller. */
    listUnpurged: (): StoredAgentApplicationDocument[] =>
      Array.from(store.agentApplicationDocs.values()).filter((d) => d.purgedAt === null),
  },

  agentInvitation: {
    create: (i: StoredAgentInvitation): StoredAgentInvitation => { store.agentInvitations.set(i.id, i); return i; },
    findById: (id: string): StoredAgentInvitation | null => store.agentInvitations.get(id) ?? null,
    findByTokenHash: (tokenHash: string): StoredAgentInvitation | null => {
      for (const i of store.agentInvitations.values()) if (i.tokenHash === tokenHash) return i;
      return null;
    },
    findLiveByPhone: (phoneE164: string): StoredAgentInvitation | null => {
      for (const i of store.agentInvitations.values()) {
        if (i.phoneE164 === phoneE164 && i.status === "ISSUED") return i;
      }
      return null;
    },
    /** ⚠️ Case-insensitive, because an email address is. Two invitations to `A@x.tz` and
     *  `a@x.tz` are two invitations to one mailbox, and the "one live invitation" rule has
     *  to see them as the same person or it does not hold at all. */
    findLiveByEmail: (email: string): StoredAgentInvitation | null => {
      const want = email.trim().toLowerCase();
      for (const i of store.agentInvitations.values()) {
        if ((i.email ?? "").toLowerCase() === want && i.status === "ISSUED") return i;
      }
      return null;
    },
    update: (id: string, patch: Partial<StoredAgentInvitation>): StoredAgentInvitation | null => {
      const i = store.agentInvitations.get(id);
      if (!i) return null;
      const next: StoredAgentInvitation = { ...i, ...patch, updatedAt: new Date().toISOString() };
      store.agentInvitations.set(id, next);
      return next;
    },
    list: (): StoredAgentInvitation[] =>
      Array.from(store.agentInvitations.values()).sort((x, y) => y.issuedAt.localeCompare(x.issuedAt)),
  },
  proposal: {
    create: (p: StoredProposal): StoredProposal => { store.proposals.set(p.id, p); return p; },
    findById: (id: string): StoredProposal | null => store.proposals.get(id) ?? null,
    findByMarketId: (marketId: string): StoredProposal | null => {
      for (const p of store.proposals.values() as Iterable<StoredProposal>) if (p.publishedMarketId === marketId) return p;
      return null;
    },
    update: (id: string, patch: Partial<StoredProposal>): StoredProposal | null => {
      const p = store.proposals.get(id);
      if (!p) return null;
      const next: StoredProposal = { ...p, ...patch, updatedAt: new Date().toISOString() };
      store.proposals.set(id, next);
      return next;
    },
    list: (limit = 1000): StoredProposal[] =>
      (Array.from(store.proposals.values()) as StoredProposal[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    listByProposer: (proposerId: string): StoredProposal[] =>
      (Array.from(store.proposals.values()) as StoredProposal[])
        .filter((p) => p.proposerId === proposerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  },
  objection: {
    create: (o: StoredObjection): StoredObjection => { store.objections.set(o.id, o); return o; },
    findById: (id: string): StoredObjection | null => store.objections.get(id) ?? null,
    update: (id: string, patch: Partial<StoredObjection>): StoredObjection | null => {
      const o = store.objections.get(id);
      if (!o) return null;
      const next: StoredObjection = { ...o, ...patch };
      store.objections.set(id, next);
      return next;
    },
    /** Every objection against a market, newest first. */
    listForMarket: (marketId: string): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .filter((o) => o.marketId === marketId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    listForUser: (userId: string): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    list: (limit = 1000): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    /** Every objection UPHELD with a remedy that changed the verdict (REVERSE or VOID). */
    listUpheldRulings: (): Array<{ marketId: string; remedy: string; reviewedBy: string | null; reviewedAt: string | null }> =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .filter((o) => o.status === "UPHELD" && (o.remedy === "REVERSE" || o.remedy === "VOID"))
        .map((o) => ({ marketId: o.marketId, remedy: o.remedy ?? "", reviewedBy: o.reviewedBy ?? null, reviewedAt: o.reviewedAt ?? null })),
  },
  proposalVote: {
    get: (proposalId: string, userId: string): StoredProposalVote | null =>
      store.proposalVotes.get(`${proposalId}:${userId}`) ?? null,
    set: (v: StoredProposalVote): StoredProposalVote => { store.proposalVotes.set(v.id, v); return v; },
    delete: (proposalId: string, userId: string): void => { store.proposalVotes.delete(`${proposalId}:${userId}`); },
    listByProposal: (proposalId: string): StoredProposalVote[] =>
      (Array.from(store.proposalVotes.values()) as StoredProposalVote[]).filter((v) => v.proposalId === proposalId),
  },
  watchlist: {
    isWatching: (marketId: string, userId: string): boolean => store.watchlist.has(`${marketId}:${userId}`),
    add: (marketId: string, userId: string): void => {
      const id = `${marketId}:${userId}`;
      if (!store.watchlist.has(id)) {
        store.watchlist.set(id, { id, marketId, userId, createdAt: new Date().toISOString() });
      }
    },
    remove: (marketId: string, userId: string): void => { store.watchlist.delete(`${marketId}:${userId}`); },
    listWatcherIds: (marketId: string): string[] =>
      Array.from(store.watchlist.values()).filter((w) => w.marketId === marketId).map((w) => w.userId),
    listMarketIdsForUser: (userId: string): string[] =>
      Array.from(store.watchlist.values())
        .filter((w) => w.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((w) => w.marketId),
  },
  event: {
    create: (e: { title: string; category: string; startsAt: string; sourceUrl: string; note: string | null; addedBy: string }): StoredEvent => {
      const now = new Date().toISOString();
      const row: StoredEvent = {
        id: `evt_${randomId(10)}`,
        title: e.title, category: e.category, startsAt: e.startsAt, sourceUrl: e.sourceUrl,
        note: e.note, generatedAt: null, aiPollId: null, addedBy: e.addedBy,
        createdAt: now, updatedAt: now,
      };
      store.events.set(row.id, row);
      return row;
    },
    findById: (id: string): StoredEvent | null => store.events.get(id) ?? null,
    list: (): StoredEvent[] =>
      Array.from(store.events.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    update: (id: string, patch: { generatedAt?: string | null; aiPollId?: string | null }): void => {
      const cur = store.events.get(id);
      if (!cur) return;
      store.events.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
    },
    delete: (id: string): void => { store.events.delete(id); },
  },
  pushSub: {
    upsert: (s: StoredPushSub): void => { store.pushSubs.set(s.endpoint, s); },
    listForUser: (userId: string): StoredPushSub[] =>
      Array.from(store.pushSubs.values()).filter((s) => s.userId === userId),
    deleteByEndpoint: (endpoint: string): void => { store.pushSubs.delete(endpoint); },
    countForUser: (userId: string): number =>
      Array.from(store.pushSubs.values()).filter((s) => s.userId === userId).length,
  },
  bonusGrant: {
    create: (g: StoredBonusGrant): StoredBonusGrant => { store.bonusGrants.set(g.id, g); return g; },
    findById: (id: string): StoredBonusGrant | null => store.bonusGrants.get(id) ?? null,
    /** Idempotency: find a grant already created for this source reference. */
    findBySourceRef: (sourceRef: string): StoredBonusGrant | null => {
      for (const g of store.bonusGrants.values()) if (g.sourceRef === sourceRef) return g;
      return null;
    },
    update: (id: string, patch: Partial<StoredBonusGrant>): StoredBonusGrant | null => {
      const g = store.bonusGrants.get(id);
      if (!g) return null;
      const next: StoredBonusGrant = { ...g, ...patch, updatedAt: new Date().toISOString() };
      store.bonusGrants.set(id, next);
      return next;
    },
    /** All grants for a user, newest first (history / admin player view). */
    listByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    /** ACTIVE grants for a user, OLDEST first (FIFO wagering / spend order). */
    listActiveByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId && g.status === "ACTIVE")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    /** ACTIVE **and FULFILLED** grants, OLDEST first — the wagering-REVERSAL population
     *  (E-224). Mirrors prisma-dal.listReversibleByUser; see the note there for why
     *  listActiveByUser is deliberately NOT widened instead.
     *  ⛔ THIS MIRROR IS NOT OPTIONAL AND tsc CANNOT SEE IT MISSING: this module exports
     *  `db` as `memoryDb as unknown as typeof prismaDb` — a blind cast — so an absent
     *  method here is a runtime TypeError in every in-memory suite, not a compile error. */
    listReversibleByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId && (g.status === "ACTIVE" || g.status === "FULFILLED"))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    /** ACTIVE grants whose expiry has passed — for the expiry sweep. */
    listExpired: (nowIso: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.status === "ACTIVE" && !!g.expiresAt && g.expiresAt < nowIso),
    listByStatus: (status: BonusGrantStatus): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values()).filter((g) => g.status === status),
    /** All grants — admin ledger / analytics. */
    listAll: (limit = 1000): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
  },
  inviteCampaign: {
    create: (c: StoredInviteCampaign): StoredInviteCampaign => { store.inviteCampaigns.set(c.id, c); return c; },
    findById: (id: string): StoredInviteCampaign | null => store.inviteCampaigns.get(id) ?? null,
    findByCode: (code: string): StoredInviteCampaign | null => {
      const norm = code.trim().toUpperCase();
      for (const c of store.inviteCampaigns.values()) if (c.code === norm) return c;
      return null;
    },
    update: (id: string, patch: Partial<StoredInviteCampaign>): StoredInviteCampaign | null => {
      const c = store.inviteCampaigns.get(id);
      if (!c) return null;
      const next: StoredInviteCampaign = { ...c, ...patch, updatedAt: new Date().toISOString() };
      store.inviteCampaigns.set(id, next);
      return next;
    },
    /** Atomic counter bumps (avoid read-modify-write races when many invitees
     *  register concurrently). Deltas, like wallet.adjust. */
    incrementCounters: (id: string, deltas: { invites?: number; registered?: number }): StoredInviteCampaign | null => {
      const c = store.inviteCampaigns.get(id);
      if (!c) return null;
      const next: StoredInviteCampaign = {
        ...c,
        totalInvites: c.totalInvites + (deltas.invites ?? 0),
        totalRegistered: c.totalRegistered + (deltas.registered ?? 0),
        updatedAt: new Date().toISOString(),
      };
      store.inviteCampaigns.set(id, next);
      return next;
    },
    list: (limit = 500): StoredInviteCampaign[] =>
      Array.from(store.inviteCampaigns.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
  },
  inviteEntry: {
    create: (e: StoredInviteEntry): StoredInviteEntry => { store.inviteEntries.set(e.id, e); return e; },
    findById: (id: string): StoredInviteEntry | null => store.inviteEntries.get(id) ?? null,
    findByCampaign: (campaignId: string): StoredInviteEntry[] =>
      Array.from(store.inviteEntries.values()).filter((e) => e.campaignId === campaignId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    findByCampaignAndContact: (campaignId: string, contactValue: string): StoredInviteEntry | null => {
      for (const e of store.inviteEntries.values()) if (e.campaignId === campaignId && e.contactValue === contactValue) return e;
      return null;
    },
    update: (id: string, patch: Partial<StoredInviteEntry>): StoredInviteEntry | null => {
      const e = store.inviteEntries.get(id);
      if (!e) return null;
      const next: StoredInviteEntry = { ...e, ...patch };
      store.inviteEntries.set(id, next);
      return next;
    },
  },

  smsMessage: {
    create: (m: StoredSmsMessage): StoredSmsMessage => { store.smsMessages.set(m.reference, m); return m; },
    createMany: (ms: StoredSmsMessage[]): StoredSmsMessage[] => { for (const m of ms) store.smsMessages.set(m.reference, m); return ms; },
    findByReference: (reference: string): StoredSmsMessage | null => store.smsMessages.get(reference) ?? null,
    update: (reference: string, patch: Partial<StoredSmsMessage>): StoredSmsMessage | null => {
      const m = store.smsMessages.get(reference);
      if (!m) return null;
      const next: StoredSmsMessage = { ...m, ...patch };
      store.smsMessages.set(reference, next);
      return next;
    },
    /**
     * Apply a delivery receipt. ⛔ MONOTONIC: a row that already reached DELIVERED or
     * FAILED never moves again, so the provider's at-least-once retry is a no-op and a
     * late receipt cannot contradict a settled one. `changed` is what tells the route
     * whether a downstream write (an InviteEntry status) is warranted.
     *
     * ⛔ A NULL `status` MEANS "WE DO NOT RECOGNISE THIS TOKEN". The raw token is still
     * recorded — that is how the vendor's undocumented vocabulary gets learned — but the
     * row's status is left exactly as it was. Defaulting an unknown token to DELIVERED
     * would report delivery we have no evidence for, on the rail that carries login codes.
     */
    recordDlr: (reference: string, d: SmsDlr): SmsDlrResult => {
      const m = store.smsMessages.get(reference);
      if (!m) return { changed: false, row: null };
      const settled = SMS_TERMINAL.includes(m.status);
      const moving = d.status !== null && !settled && d.status !== m.status;
      const next: StoredSmsMessage = {
        ...m,
        dlrStatus: d.rawStatus,
        dlrDesc: d.desc,
        ...(moving
          ? {
              status: d.status as SmsStatus,
              deliveredAt: d.status === "DELIVERED" ? d.at : m.deliveredAt,
              failedAt: d.status === "FAILED" ? d.at : m.failedAt,
            }
          : {}),
      };
      store.smsMessages.set(reference, next);
      return { changed: moving, row: next };
    },
    countSince: (sinceIso: string, purpose?: SmsPurpose): number => {
      let n = 0;
      for (const m of store.smsMessages.values()) {
        if (m.createdAt >= sinceIso && (!purpose || m.purpose === purpose)) n++;
      }
      return n;
    },
    listRecent: (limit = 50): StoredSmsMessage[] =>
      Array.from(store.smsMessages.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
    /** U43a · THE REAPER'S EVIDENCE (E6) — for each target named, the NEWEST message of the type asked (`newestPerTarget`,
     *  the ONE rule both twins answer through): one per target, none for a target without one, ordered by target id. The
     *  rule set is asked first — at most 200 ids, refused above, never cut. ⛔ Never cut by a count either: a target whose
     *  message fell outside a cut would read "never sent", go back to PENDING and be sent again. Copies. ⚠️ The newest
     *  message EVER for each target, not bounded by the row's claim — that bound is the reaper's (`newestPerTarget`, DC-1). */
    findByTargets: (targetType: string, targetIds: readonly string[]): StoredSmsMessage[] => {
      assertTargetsRead(targetType, targetIds);
      if (targetIds.length === 0) return [];
      const wanted = new Set(targetIds);
      const rows: StoredSmsMessage[] = [];
      for (const m of store.smsMessages.values()) {
        if (m.targetType === targetType && m.targetId !== null && wanted.has(m.targetId)) rows.push({ ...m });
      }
      return newestPerTarget(rows);
    },
  },
  /* ═══ MESSAGING CONSENT (marketing U6) ═════════════════════════════════════════════════
   * ⛔ NO `update` AND NO `delete`, IN EITHER TWIN. An append-only ledger that grows an
   * update path stops being evidence and becomes an opinion. `dal-parity` §17 asserts the
   * absence, so adding one later fails the gate rather than passing quietly. */
  messagingConsent: {
    create: (row: StoredMessagingConsent): StoredMessagingConsent => {
      store.messagingConsents.set(row.id, row);
      return row;
    },
    /** The one question the send-loop gate asks (§5.6): what is this person's latest word?
     *  ⭐ The tiebreak on `id` is not decoration — two rows can share a millisecond, and a
     *  twin that resolves a tie differently from Postgres is a gate that answers differently
     *  in memory than it does in production. */
    latestFor: (key: MessagingKey): StoredMessagingConsent | null =>
      Array.from(store.messagingConsents.values())
        .filter((r) => r.channel === key.channel && r.identifier === key.identifier && r.category === key.category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null,
    listFor: (key: MessagingKey): StoredMessagingConsent[] =>
      Array.from(store.messagingConsents.values())
        .filter((r) => r.channel === key.channel && r.identifier === key.identifier && r.category === key.category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
    /** §25 · each number's LATEST word — `latestFor` asked of a set: the SAME order (`createdAt desc, id desc`, the tie
     *  broken on the id the ledger's clock makes sort in write order), the FIRST row per number kept. A number with no
     *  row is absent. Ordered by number. */
    latestAmong: (q: MessagingKeyBatch): StoredMessagingConsent[] => {
      const keys = bulkKeys(q.identifiers, "messagingConsent.latestAmong");
      if (keys.length === 0) return [];
      const want = new Set(keys);
      const ordered = Array.from(store.messagingConsents.values())
        .filter((r) => r.channel === q.channel && r.category === q.category && want.has(r.identifier))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      const latest = new Map<string, StoredMessagingConsent>();
      for (const r of ordered) if (!latest.has(r.identifier)) latest.set(r.identifier, r);
      return Array.from(latest.values()).sort((a, b) => (a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0));
    },
  },

  /* ═══ SUPPRESSION (marketing U6, lift U8) ══════════════════════════════════════════════
   * ⛔ NO `delete`, IN EITHER TWIN, EVER. Not by contact deletion, not by re-import, not by
   * erasure, and ⛔ NOT BY RESUBSCRIBE — a lift SUPERSEDES the row, it does not remove it. */
  suppression: {
    /** ⭐ IDEMPOTENT ON THE TRIPLE, exactly as the database's unique index is. Re-suppressing
     *  keeps THE ROW THAT IS ALREADY THERE rather than replacing it: the first refusal is
     *  the evidence, and its timestamp is the answer to "when did they say no". A re-import
     *  that overwrote it would quietly move that date forward.
     *
     *  🔴 BUT IT MUST CLEAR A LIFT, AND THAT IS NOT A DETAIL — IT IS THE SECOND FALSE SUCCESS.
     *  Once a row can be lifted, `stop → start again → stop again` comes back through here. A
     *  create that returned the LIFTED row untouched would tell the person "you will not get
     *  marketing texts again" while the suppression stayed lifted and the next campaign sent
     *  to them. ⛔ So `liftedAt`/`liftedReason` are cleared and `createdAt` is NOT touched:
     *  re-suppression re-arms the refusal without rewriting when it was first made.
     *
     *  🔴 AND THE REASON MUST FOLLOW THE STOP THAT IS NOW IN FORCE. Only a `WITHDRAWN` row may be
     *  lifted by its link (`PERSON_LIFTABLE_REASONS`), so keeping the FIRST reason let a person's
     *  old stop hide a complaint or an officer's stop behind it — one tap on an old SMS then
     *  lifted a refusal somebody else made. ⛔ So a row being RE-ARMED takes the new refusal's
     *  reason and evidence, and a non-`WITHDRAWN` refusal arriving over an active `WITHDRAWN` one
     *  takes it over. `createdAt` still does not move. */
    create: (row: StoredSuppression): StoredSuppression => {
      for (const r of store.suppressions.values()) {
        if (r.channel === row.channel && r.identifier === row.identifier && r.category === row.category) {
          if (r.liftedAt || (r.reason === "WITHDRAWN" && row.reason !== "WITHDRAWN")) {
            r.reason = row.reason;
            r.evidence = row.evidence;
            r.recordedBy = row.recordedBy;
          }
          r.liftedAt = null;
          r.liftedReason = null;
          return r;
        }
      }
      store.suppressions.set(row.id, row);
      return row;
    },
    /** ⭐ ACTIVE ONLY — a lifted row is not refusing anybody, so it is not found here.
     *
     *  ⛔ THE NAME CARRIES THE SAFE DIRECTION ON PURPOSE. The gate's question is "is this
     *  number being refused right now", and that is what the plainest name must answer. A
     *  future caller who reaches for `find` and forgets that rows can be lifted OVER-refuses
     *  — annoying and lawful. The opposite arrangement, where the plainest name returned
     *  lifted rows too and the caller had to remember to filter, fails the other way: a
     *  suppressed person receives marketing. Only one of those two is a breach.
     *  ⛔ The row itself is still there — `listFor` returns it — which is how "never deleted"
     *  is OBSERVED rather than merely asserted. */
    find: (key: MessagingKey): StoredSuppression | null => {
      for (const r of store.suppressions.values()) {
        if (r.channel === key.channel && r.identifier === key.identifier && r.category === key.category) {
          // 🔴 `!r.liftedAt`, NOT `r.liftedAt === null`, AND THE DIFFERENCE IS A BREACH.
          // A row that carries no lift FIELD AT ALL has `undefined` here, and `undefined === null`
          // is FALSE — so the strict form read "this row has been lifted" and handed a suppressed
          // person back as marketable. It failed OPEN, in the one direction the law does not
          // forgive. ⛔ Found by running `test:marketing-consent` after this field landed: U7's
          // own suppressed fixture went ALLOWED, and `tsc` could not see it because
          // `tsconfig.json` includes `scripts/**/*.ts` and every suite here is `.mts`.
          // ⭐ A row is REFUSING unless it has been explicitly lifted. Anything falsy — absent,
          // null, empty — means nobody lifted it, so it still refuses.
          return !r.liftedAt ? r : null;
        }
      }
      return null;
    },
    /** §25 · the stops STILL IN FORCE among a set of numbers — `find` asked of a set, and the same question: a row is
     *  refusing unless its lift is set, read FALSILY exactly as `find` reads it (a row with no lift field still refuses).
     *  ⛔ A lifted row is not returned here; it is still there — `listFor` returns it. Ordered by number. */
    findActiveAmong: (q: MessagingKeyBatch): StoredSuppression[] => {
      const keys = bulkKeys(q.identifiers, "suppression.findActiveAmong");
      if (keys.length === 0) return [];
      const want = new Set(keys);
      const out: StoredSuppression[] = [];
      for (const r of store.suppressions.values()) {
        if (r.channel === q.channel && r.category === q.category && want.has(r.identifier) && !r.liftedAt) out.push(r);
      }
      return out.sort((a, b) => (a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0));
    },
    /** ⭐ SUPERSEDE, NEVER DELETE (U8). Returns the row it lifted, or null when there was no
     *  ACTIVE row to lift — so the caller can tell "I stopped their refusal" from "there was
     *  nothing refusing them", and never reports a change it did not make.
     *
     *  ⛔ ONLY AN ACTIVE ROW IS TOUCHED, which is what stops a second lift moving `liftedAt`
     *  forward. The date is evidence, the same way `createdAt` is. */
    lift: (key: MessagingKey, reason: string | null, at: string): StoredSuppression | null => {
      for (const r of store.suppressions.values()) {
        if (r.channel === key.channel && r.identifier === key.identifier && r.category === key.category) {
          // ⛔ The same tolerant reading as `find`, for the same reason: a row with no lift on it
          // is an ACTIVE row and may be lifted once. A strict `!== null` would refuse to lift a
          // row whose field was absent, stranding somebody who asked to be resubscribed.
          if (r.liftedAt) return null;
          // ⛔ ONLY A PERSON'S OWN STOP IS LIFTABLE (`PERSON_LIFTABLE_REASONS`). The services check
          // first; this is the store refusing too, so no future caller can lift a complaint, an
          // officer's stop or a self-exclusion by forgetting that check.
          if (r.reason !== "WITHDRAWN") return null;
          r.liftedAt = at;
          r.liftedReason = reason;
          return r;
        }
      }
      return null;
    },
    /** ⛔ EVERY ROW, LIFTED OR NOT. This is the reader that proves a lift removed nothing. */
    listFor: (identifier: string): StoredSuppression[] =>
      Array.from(store.suppressions.values())
        .filter((r) => r.identifier === identifier)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  },
  /* ═══ OPT-OUT TOKENS (marketing U8) ════════════════════════════════════════════════════
   * ⛔ NO `delete`, IN EITHER TWIN. OD43 says the link never expires: a person who kept an
   * SMS from a year ago must still be able to click out of it. Deleting the row is how that
   * link starts answering "invalid token" to somebody trying to leave. */
  marketingOptOutToken: {
    /** ⭐ RETURNS null WHEN THE TOKEN IS ALREADY TAKEN, rather than throwing or overwriting —
     *  the Prisma twin turns its unique violation into the same null, so the mint's retry loop
     *  is one piece of code that behaves identically on both backends. ⛔ Overwriting would
     *  silently re-point somebody else's live opt-out link at a different person. */
    create: (row: StoredMarketingOptOutToken): StoredMarketingOptOutToken | null => {
      if (store.optOutTokens.has(row.token)) return null;
      store.optOutTokens.set(row.token, row);
      return row;
    },
    find: (token: string): StoredMarketingOptOutToken | null => store.optOutTokens.get(token) ?? null,
    listFor: (identifier: string): StoredMarketingOptOutToken[] =>
      Array.from(store.optOutTokens.values())
        .filter((r) => r.identifier === identifier)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.token.localeCompare(a.token)),
  },

  /* ═══ THE CONTACT BOOK (marketing U18) ═══════════════════════════════════════════════════
   * ⛔ `msisdn` IS UNIQUE AND THE DATABASE ENFORCES IT; this twin fakes it with a secondary
   * map, exactly as `usersByPhone` does. A re-import must get the row already there back,
   * never a second person — `create` therefore REFUSES rather than overwrites, and returns
   * null, which is the same answer the Prisma twin gives when Postgres raises P2002.
   * `test:dal-parity` §19 asserts both halves. */
  marketingContact: {
    create: (row: StoredMarketingContact): StoredMarketingContact | null => {
      if (store.contactsByMsisdn.has(row.msisdn)) return null;
      store.marketingContacts.set(row.id, row);
      store.contactsByMsisdn.set(row.msisdn, row.id);
      return row;
    },
    find: (id: string): StoredMarketingContact | null => store.marketingContacts.get(id) ?? null,
    /** ⭐ THE LOOKUP THE IMPORTER AND THE GATE BOTH NEED — by the ONE key, never by name. */
    findByMsisdn: (msisdn: string): StoredMarketingContact | null => {
      const id = store.contactsByMsisdn.get(msisdn);
      return id ? store.marketingContacts.get(id) ?? null : null;
    },
    /** §25 · WHICH of these keys the book holds — `findByMsisdn` asked of a set, through the same index, answering KEYS
     *  only (a book row's name, email and notes never leave). A row carrying `excludeSourceRef` is left out NULL-SAFELY:
     *  a row with no `sourceRef` — nearly the whole book — is kept. Ordered by key. */
    msisdnsPresent: (q: MarketingContactPresenceQuery): string[] => {
      const keys = bulkKeys(q.msisdns, "marketingContact.msisdnsPresent");
      if (keys.length === 0) return [];
      const out: string[] = [];
      for (const m of keys) {
        const id = store.contactsByMsisdn.get(m);
        const c = id ? store.marketingContacts.get(id) : undefined;
        if (c && (q.excludeSourceRef === null || c.sourceRef !== q.excludeSourceRef)) out.push(m);
      }
      return out.sort();
    },
    /** Every book row LINKED to an account — erasure's reach (U18b). Usually one; a player who changed
     *  number can have the old one in the book too. */
    listByUserId: (userId: string): StoredMarketingContact[] =>
      Array.from(store.marketingContacts.values())
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
    /** U33r · the book's numbers held under ONE e-mail address, case-insensitive — KEY-ONLY (the number alone, never the
     *  row), sorted. A referee named only by e-mail is keyed under every number the book holds for that address (the
     *  U33r review's MINOR-1). A blank address answers nothing. */
    msisdnsByEmail: (email: string): string[] => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      return Array.from(store.marketingContacts.values())
        .filter((c) => (c.email ?? "").trim().toLowerCase() === norm)
        .map((c) => c.msisdn)
        .sort();
    },
    /** ⛔ `msisdn` is not patchable (see `MarketingContactPatch`), so the unique index can
     *  never need re-pointing here — which is why this does not touch `contactsByMsisdn`. */
    update: (id: string, patch: MarketingContactPatch, at: string): StoredMarketingContact | null => {
      const row = store.marketingContacts.get(id);
      if (!row) return null;
      const next = { ...row, ...patch, updatedAt: at };
      store.marketingContacts.set(id, next);
      return next;
    },
    /** U22 · ⭐ COMPARE-AND-SET — the edit form's ONE write. The row is written only if its `updatedAt` is still
     *  the one the dialog was rendered with, so a second officer's stale save is REFUSED instead of silently
     *  overwriting the first. Compared as INSTANTS (`Date.parse`), the Prisma twin's `updatedAt` equality, so the
     *  twins agree on two spellings of one millisecond. ⛔ The caller's `at` is written EXPLICITLY (decision C25) —
     *  the same value the Prisma twin stamps. ⛔ The patch's fields are NAMED, never spread: a key outside
     *  `ContactEditPatch` cannot reach the row (`test:dal-parity` §22). JavaScript runs this to the end before any
     *  other write, so the compare and the set are one step. */
    updateIfUnchanged: (id: string, patch: ContactEditPatch, guard: ContactEditGuard, at: string): ContactCasResult => {
      const row = store.marketingContacts.get(id);
      if (!row) return { ok: false, reason: "not_found" };
      if (Date.parse(row.updatedAt) !== Date.parse(guard.expectedUpdatedAt)) return { ok: false, reason: "stale" };
      const next: StoredMarketingContact = {
        ...row,
        displayName: patch.displayName,
        email: patch.email === undefined ? row.email : patch.email,
        notes: patch.notes,
        tags: [...patch.tags],
        updatedBy: patch.updatedBy,
        updatedAt: at,
      };
      store.marketingContacts.set(id, next);
      return { ok: true, row: next };
    },
    /** U20 · ONE PAGE of the book and the size of the whole match. The order breaks every tie on `id`, in
     *  the same direction, and puts a contact with NO name last whichever way names sort — Postgres'
     *  `nulls: "last"` in the Prisma twin, so a page boundary falls in the same place on both.
     *  U24 · the match is the audience where, through the ONE translation above. */
    page: (q: ContactPageQuery): ContactPage => {
      const rows = contactsMatching(q.where);
      const sign = q.dir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        if (q.sort === "name") {
          if (a.displayName === null || b.displayName === null) {
            if (a.displayName !== b.displayName) return a.displayName === null ? 1 : -1;
          } else {
            const byName = a.displayName.localeCompare(b.displayName);
            if (byName !== 0) return sign * byName;
          }
        } else {
          const ka = q.sort === "operator" ? a.ndc : a.createdAt;
          const kb = q.sort === "operator" ? b.ndc : b.createdAt;
          const byKey = ka.localeCompare(kb);
          if (byKey !== 0) return sign * byKey;
        }
        return sign * a.id.localeCompare(b.id);
      });
      return { rows: rows.slice(q.offset, q.offset + q.limit), total: rows.length };
    },
    /** U24 · how many rows an audience holds. */
    countWhere: (w: ContactAudienceWhere): number => contactsMatching(w).length,
    /** U24 · an audience's counts by recorded consent and suppression (REPLACES U20's whole-book `summary()`:
     *  the KPI band now asks for the whole book through the resolver, `contactAudience(WHOLE_BOOK)`). */
    summaryWhere: (w: ContactAudienceWhere): ContactBookSummary => {
      // ⛔ DEV ONLY — the U20 drive photographs the page's error state through this switch, set by
      // `/api/dev-test/marketing-contacts-seed?fault=1`. The memory twin never serves production.
      if (globalThis.__50PICK_CONTACTS_READ_FAULT) throw new Error("contact book read fault (dev drive)");
      const out: ContactBookSummary = { total: 0, given: 0, unknown: 0, withdrawn: 0, suppressed: 0 };
      for (const c of contactsMatching(w)) {
        out.total++;
        if (c.consentState === "GIVEN") out.given++;
        else if (c.consentState === "WITHDRAWN") out.withdrawn++;
        else out.unknown++;
        if (c.suppressedAt !== null) out.suppressed++;
      }
      return out;
    },
    /** U24 · the KEYSET walk, `id` ascending. ⭐ The SAME comparator orders the rows and places the cursor (plain
     *  code-unit order — a strict total order, so no two ids ever tie), which is what keeps every row visited once
     *  while rows are written between calls. One extra row is read to know whether the walk is finished. */
    walk: (q: ContactWalkQuery): ContactWalk => {
      const afterId = q.afterId;
      const rows = contactsMatching(q.where)
        .filter((c) => afterId === null || c.id > afterId)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, q.limit + 1);
      const more = rows.length > q.limit;
      const shown = more ? rows.slice(0, q.limit) : rows;
      const last = shown[shown.length - 1];
      return { rows: shown, nextAfterId: more && last ? last.id : null };
    },
    /** U24 (decision M8) · the book's distinct tags, most-carried first, then by tag in code-unit order (the
     *  Prisma twin sorts `collate "C"` for the same order). A contact counts ONCE per tag, however its array reads. */
    tagCounts: (q: ContactTagCountQuery): ContactTagCount[] => {
      const counts = new Map<string, number>();
      for (const c of store.marketingContacts.values()) {
        if (q.excludeSourceRef !== null && c.sourceRef === q.excludeSourceRef) continue;
        for (const t of new Set<string>(c.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      return Array.from(counts, ([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
        .slice(0, q.limit);
    },
    listAll: (): StoredMarketingContact[] =>
      Array.from(store.marketingContacts.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
    count: (): number => store.marketingContacts.size,
    /* ═══ U23 · THE BULK WRITES — set-based, through the ONE translation (`contactsMatching`) ═══════════════════
     * ⭐ Each reads the audience where the resolver counts (`contactAudienceWrites`, audience.ts — the only caller,
     * `test:contacts-audience` §1.1), so the erased tombstone is in no bulk (C3) and an empty selection writes nothing.
     * The Prisma twin mirrors each one; `test:dal-parity` §23 holds the pairs. */
    /** U23 · TAG every row the audience holds. A row already carrying the tag is UNCHANGED; a row already holding
     *  `maxTags` is FULL and left as it was (decision C11: at most 20 per contact). A changed row is stamped with the
     *  caller's `at` and `by` — the instant and the officer the Prisma twin writes. */
    tagWhere: (w: ContactAudienceWhere, tag: string, maxTags: number, stamp: ContactBulkStamp): ContactBulkCount => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      for (const c of contactsMatching(w)) {
        out.matched++;
        if (c.tags.includes(tag)) { out.unchanged++; continue; }
        if (c.tags.length >= maxTags) { out.full++; continue; }
        store.marketingContacts.set(c.id, { ...c, tags: [...c.tags, tag], updatedAt: stamp.at, updatedBy: stamp.by });
        out.changed++;
      }
      return out;
    },
    /** U23 · UNTAG every row the audience holds. A row without the tag is UNCHANGED and keeps its stamp. */
    untagWhere: (w: ContactAudienceWhere, tag: string, stamp: ContactBulkStamp): ContactBulkCount => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      for (const c of contactsMatching(w)) {
        out.matched++;
        if (!c.tags.includes(tag)) { out.unchanged++; continue; }
        store.marketingContacts.set(c.id, { ...c, tags: c.tags.filter((t) => t !== tag), updatedAt: stamp.at, updatedBy: stamp.by });
        out.changed++;
      }
      return out;
    },
    /** U23 · ADD every row the audience holds to ONE list. ⛔ A member already on it keeps its ORIGINAL `addedAt` —
     *  when somebody joined a list is evidence (§19.readd) — and a list that does not exist is refused, as Postgres's
     *  foreign key refuses it. */
    addWhere: (w: ContactAudienceWhere, listId: string, stamp: ContactBulkStamp): ContactBulkCount => {
      if (!store.contactLists.has(listId)) throw new Error("addWhere: no such contact list (the foreign key)");
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      for (const c of contactsMatching(w)) {
        out.matched++;
        const k = `${listId}|${c.id}`;
        if (store.contactListMembers.has(k)) { out.unchanged++; continue; }
        store.contactListMembers.set(k, { listId, contactId: c.id, addedAt: stamp.at, addedBy: stamp.by });
        out.changed++;
      }
      return out;
    },
    /** U23 · REMOVE every row the audience holds. ⭐ THE POSTGRES CASCADE, EMULATED: the database deletes a removed
     *  contact's list memberships itself (`ContactListMember` onDelete: Cascade), and this twin must too, or every suite
     *  keeps memberships production deletes — U18b's class, a memory index not maintained. ⭐ The unique index is FREED
     *  (only while it still points at this row), so the number can be added again. ⛔ The consent ledger and the stop
     *  list are keyed by NUMBER and are not touched: removing a book row never deletes evidence.
     *  ⭐ U35b · AND THE CAMPAIGN LINK IS SET NULL, as Postgres does (`SmsCampaignRecipient.contactId` onDelete: SetNull):
     *  the recipient row — the record that we messaged somebody — stays, pointing at nobody (`test:dal-parity` §26). */
    removeWhere: (w: ContactAudienceWhere): ContactBulkCount => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      for (const c of contactsMatching(w)) {
        out.matched++;
        if (!store.marketingContacts.delete(c.id)) continue;
        if (store.contactsByMsisdn.get(c.msisdn) === c.id) store.contactsByMsisdn.delete(c.msisdn);
        for (const [k, m] of store.contactListMembers) if (m.contactId === c.id) store.contactListMembers.delete(k);
        for (const r of store.smsCampaignRecipients.values()) if (r.contactId === c.id) r.contactId = null;
        out.changed++;
      }
      return out;
    },
    /** vb7 (review m1) · REMOVE every row the audience holds AMONG `ids` — a bulk Remove's confirmed ids — ALL OR
     *  NOTHING, as the Prisma twin's ONE transaction is. ⭐ Through `removeWhere` itself, so this twin still deletes a
     *  contact in ONE place (the cascade, the freed index, the campaign SET NULL — `test:dal-parity` §23, §26), over the
     *  audience narrowed to those ids (∩ any ids it already holds). The rows are chosen in one synchronous pass before
     *  any is deleted, and nothing in that loop can throw part-way. */
    removeBoundWhere: (w: ContactAudienceWhere, ids: readonly string[]): ContactBulkCount =>
      memoryDb.marketingContact.removeWhere({ ...w, ids: w.ids === null ? [...ids] : w.ids.filter((id) => ids.includes(id)) }),
  },

  contactList: {
    create: (row: StoredContactList): StoredContactList | null => {
      for (const l of store.contactLists.values()) if (l.name === row.name) return null;
      store.contactLists.set(row.id, row);
      return row;
    },
    find: (id: string): StoredContactList | null => store.contactLists.get(id) ?? null,
    findByName: (name: string): StoredContactList | null => {
      for (const l of store.contactLists.values()) if (l.name === name) return l;
      return null;
    },
    listAll: (): StoredContactList[] =>
      Array.from(store.contactLists.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  },

  contactListMember: {
    /** ⭐ THE COMPOUND KEY IS THE DEDUPLICATION. "Add these 4,000" run twice must not make
     *  anybody a member twice, or a campaign resolving this list counts and texts them twice.
     *  ⛔ Re-adding keeps the ORIGINAL `addedAt`: when somebody joined a list is evidence,
     *  not a status flag — the same rule `Suppression.createdAt` follows. */
    add: (row: StoredContactListMember): StoredContactListMember => {
      const k = `${row.listId}|${row.contactId}`;
      const existing = store.contactListMembers.get(k);
      if (existing) return existing;
      store.contactListMembers.set(k, row);
      return row;
    },
    remove: (key: ContactListKey): boolean =>
      store.contactListMembers.delete(`${key.listId}|${key.contactId}`),
    listMembers: (listId: string): StoredContactListMember[] =>
      Array.from(store.contactListMembers.values())
        .filter((m) => m.listId === listId)
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || b.contactId.localeCompare(a.contactId)),
    listMemberships: (contactId: string): StoredContactListMember[] =>
      Array.from(store.contactListMembers.values())
        .filter((m) => m.contactId === contactId)
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || b.listId.localeCompare(a.listId)),
  },

  /* ═══ U33a-L · THE LIST BASIS (OD57 · OD58) ══════════════════════════════════════════════════════════════════════════
   * ⭐ A LIST'S ONE STANDING IS ITS NEWEST RECORDING, revoked or not (M1): revoking it ends the list's coverage, an older
   * recording never comes back, and recording again starts it anew — in `bookStandings` and in `coveredCount` alike.
   * ⛔ APPEND-ONLY: `create` never upserts (a held id is refused with null — Postgres's P2002 in the other twin), `revoke`
   * sets the revocation ONCE, and there is NO update member and NO delete member (`test:dal-parity` §27.3). ⛔ EVERY member
   * asks the ONE rule set (`list-basis-model.ts`) before it reads or writes, as the Prisma twin does, so an input Postgres
   * would refuse is refused here too. Rows come out as COPIES, as Postgres hands back fresh rows, and every instant is
   * compared as an instant. `test:dal-parity` §27 holds the pairs; the Prisma half runs on a real Postgres, beside this
   * twin, in `scripts/live/list-basis-pg-probe.mts`. ⛔ Nothing outside the data layer and its tests reads or writes these
   * rows until U33a-G (the gate) and U33b-L (the Lists card, the ONE writer). */
  contactListBasis: {
    /** ⛔ NEVER AN UPSERT. The rule set first; then an id already held is refused with null; then a list that does not
     *  exist is refused as the foreign key refuses it — the memory twin of P2003, carrying its code — in Postgres's own
     *  order. Written by NAME, never a spread, so no key outside the seed can reach the row; born UNREVOKED. */
    create: (row: ContactListBasisSeed): StoredContactListBasis | null => {
      assertListBasisSeed(row);
      if (store.contactListBases.has(row.id)) return null;
      if (!store.contactLists.has(row.listId)) throw Object.assign(new Error(`foreign key: no ContactList ${row.listId} (memory twin of P2003) — nothing was written`), { code: "P2003" });
      const stored: StoredContactListBasis = {
        id: row.id,
        listId: row.listId,
        basisKey: row.basisKey,
        wording: row.wording,
        wordingVersion: row.wordingVersion,
        adultWording: row.adultWording,
        adultVersion: row.adultVersion,
        proofNote: row.proofNote,
        recordedBy: row.recordedBy,
        recordedAt: new Date(row.recordedAt).toISOString(),
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
      };
      store.contactListBases.set(row.id, stored);
      return { ...stored };
    },
    /** ⭐ SET ONCE. An unknown id is null; a basis already revoked comes back AS IT IS — its first revocation is the
     *  evidence and is never moved — and only an unrevoked one is written, all three fields in one step. */
    revoke: (r: ContactListBasisRevocation): StoredContactListBasis | null => {
      assertListBasisRevocation(r);
      const row = store.contactListBases.get(r.id);
      if (row === undefined) return null;
      if (row.revokedAt !== null) return { ...row };
      const next: StoredContactListBasis = { ...row, revokedAt: new Date(r.at).toISOString(), revokedBy: r.by, revokedReason: r.reason };
      store.contactListBases.set(r.id, next);
      return { ...next };
    },
    /** Every basis recorded on one list, revoked ones included, NEWEST FIRST (`recordedAt desc, id desc`) — the first is
     *  the list's standing. */
    listForList: (listId: string): StoredContactListBasis[] => {
      assertListBasisKeys("contactListBasis.listForList", [listId]);
      return Array.from(store.contactListBases.values())
        .filter((b) => b.listId === listId)
        .sort(newestBasisFirst)
        .map((b) => ({ ...b }));
    },
    /** One number's book standing — the ONE definition, asked of one key. */
    standingFor: (msisdn: string): BookStanding => bookStandings([msisdn])[0].standing,
    /** §25's bound and shape: at most `BULK_KEYED_READ_MAX` distinct keys, REFUSED above — never cut off — duplicates
     *  folded, an empty set answered with nothing; then the ONE definition, one entry per key. */
    standingAmong: (msisdns: string[]): BookStandingEntry[] => {
      const keys = bulkKeys(msisdns, "contactListBasis.standingAmong");
      if (keys.length === 0) return [];
      return bookStandings(keys);
    },
    /** The list's coverage in ONE pass over its members (`ListBasisCoverage`) — the Lists card's "covers 412 of 420"
     *  (U33b-L). `live`: members whose book row is live and linked to no account; `covered`: those of them added at or
     *  before the list's NEWEST recording — none when it is revoked (M1), or when the list was never recorded. ⛔ Coverage
     *  through ANOTHER list's recording is that list's, not this one's. */
    coveredCount: (listId: string): ListBasisCoverage => {
      assertListBasisKeys("contactListBasis.coveredCount", [listId]);
      const newest: StoredContactListBasis | undefined = Array.from(store.contactListBases.values())
        .filter((b) => b.listId === listId)
        .sort(newestBasisFirst)[0];
      const bound = newest !== undefined && newest.revokedAt === null ? Date.parse(newest.recordedAt) : null;
      const out: ListBasisCoverage = { live: 0, covered: 0 };
      for (const m of store.contactListMembers.values()) {
        if (m.listId !== listId) continue;
        const c = store.marketingContacts.get(m.contactId);
        if (c === undefined || c.userId !== null || c.sourceRef === ERASURE_EVIDENCE) continue;
        out.live++;
        if (bound !== null && Date.parse(m.addedAt) <= bound) out.covered++;
      }
      return out;
    },
  },

  /* ═══ U33r · THE AGENT-REFEREE KEYS (Q8) ══════════════════════════════════════════════════════════════════
   * ⛔ APPEND-ONLY: `record` writes a key not yet held and SKIPS one already held — Postgres's ON CONFLICT DO NOTHING in the
   * other twin, so nothing is ever moved — and there is NO update member and NO delete member (`test:dal-parity` §28).
   * ⛔ EVERY member asks the ONE rule set (`referee-key-model.ts`) before it reads or writes, as the Prisma twin does, so a
   * raw number handed in as a key — or a row carrying anything beside its key — is refused by both. ⛔ The ONE writer is
   * `referee-exclusion.ts` (`test:dal-parity` §28.writers); the ONE reader the gate's (`DB_GATE_READS`) and the split's
   * prefetch, both through that module. */
  agentRefereeKey: {
    /** The batch checked WHOLE first; then each key not yet held is written by NAME — never a spread — and one already
     *  held is skipped. Answers how many rows were written: 0 on a re-run, which is what makes the backfill re-runnable. */
    record: (rows: StoredAgentRefereeKey[]): number => {
      assertRefereeKeyRows(rows);
      let written = 0;
      for (const r of rows) {
        if (store.agentRefereeKeys.has(r.refereeKey)) continue;
        const stored: StoredAgentRefereeKey = { refereeKey: r.refereeKey };
        store.agentRefereeKeys.set(stored.refereeKey, stored);
        written++;
      }
      return written;
    },
    /** Whether a row holds this key — the ONE definition, asked of one key. */
    holds: (refereeKey: string): boolean => refereeHeld([refereeKey])[0].held,
    /** §25's bound and shape: at most `BULK_KEYED_READ_MAX` distinct keys, REFUSED above — never cut off — duplicates
     *  folded, an empty set answered with nothing; then the ONE definition, one entry per key. */
    heldAmong: (refereeKeys: string[]): AgentRefereeKeyEntry[] => {
      const keys = bulkKeys(refereeKeys, "agentRefereeKey.heldAmong");
      if (keys.length === 0) return [];
      return refereeHeld(keys);
    },
  },

  /* ═══ CONTACT IMPORT STAGING (marketing U29) ═══════════════════════════════════════════════
   * ⭐ COMPARE-AND-SET BY CONSTRUCTION: JavaScript runs each member to its end before any other write, so every check
   * below and the write after it are one step — the Prisma twin gets the same from a conditional update (inside one
   * short transaction, for staging). ⛔ ROWS ARE FOUND BY ORDINAL, never by array index (erasure deletes a middle row),
   * and a purged run's rows go with it — the cascade Postgres does for the other twin, emulated. Timestamps compare as
   * INSTANTS (`Date.parse`), as the Prisma twin's columns do. `test:dal-parity` §24 holds the pairs. */
  contactImport: {
    /** ⛔ NEVER AN UPSERT: an id already held is refused with null — Postgres's P2002 in the other twin. */
    create: (row: StoredContactImport): StoredContactImport | null => {
      if (store.contactImports.has(row.id)) return null;
      const stored: StoredContactImport = { ...row, mapping: { ...row.mapping }, decisionOverrides: { ...row.decisionOverrides } };
      store.contactImports.set(row.id, stored);
      if (!store.contactImportRows.has(row.id)) store.contactImportRows.set(row.id, new Map<number, StoredContactImportRow>());
      return stored;
    },
    find: (id: string): StoredContactImport | null => store.contactImports.get(id) ?? null,
    /** An officer's OPEN run — the adopt read. The EARLIEST, so two tabs that raced to open one file converge on one. */
    findOpenFor: (createdBy: string): StoredContactImport | null =>
      Array.from(store.contactImports.values())
        .filter((r) => r.createdBy === createdBy && (r.status === "STAGING" || r.status === "STAGED" || r.status === "COMMITTING" || r.status === "PAUSED"))
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null,
    /** The idle sweep's read (X29): runs in `q.statuses` untouched since `q.idleBefore`, oldest first, at most `q.limit`. */
    listIdle: (q: ContactImportIdleQuery): StoredContactImport[] =>
      Array.from(store.contactImports.values())
        .filter((r) => q.statuses.includes(r.status) && Date.parse(r.updatedAt) < Date.parse(q.idleBefore))
        .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, Math.max(0, q.limit)),
    /** ⭐ COMPARE-AND-SET ON STATUS: the run moves only from a status in `t.from` — and, for the sweep, only while it is
     *  still idle. DONE and CANCELLED stamp `finishedAt`; PAUSED records who stopped it and when; a resume clears that. */
    transition: (t: ContactImportTransition): StoredContactImport | null => {
      const run = store.contactImports.get(t.importId);
      if (!run || !t.from.includes(run.status)) return null;
      if (t.updatedBefore !== null && !(Date.parse(run.updatedAt) < Date.parse(t.updatedBefore))) return null;
      const resumed = t.to === "COMMITTING" && t.from.includes("PAUSED");
      const next: StoredContactImport = {
        ...run,
        status: t.to,
        updatedAt: t.at,
        finishedAt: t.to === "DONE" || t.to === "CANCELLED" ? t.at : run.finishedAt,
        pausedAt: t.to === "PAUSED" ? t.at : resumed ? null : run.pausedAt,
        pausedBy: t.to === "PAUSED" ? t.by : resumed ? null : run.pausedBy,
      };
      store.contactImports.set(t.importId, next);
      return next;
    },
    /** ⭐ THE STAGING COMPARE-AND-SET (X2): a batch lands only while the run is STAGING and `stagedThrough` is EXACTLY
     *  `b.from - 1`, so a replay, a racing second tab or a skipped batch writes NOTHING and says why. The rows land
     *  unsettled (`outcome` null) whatever the caller handed in, and one record per line holds across the whole run. */
    stageRows: (b: ContactImportStageBatch): ContactImportStageResult => {
      if (b.rows.length === 0) throw new Error("stageRows: an empty batch");
      b.rows.forEach((row, i) => {
        if (row.importId !== b.importId || row.ordinal !== b.from + i) throw new Error("stageRows: the rows must run from b.from, one ordinal each, in this run");
      });
      const run = store.contactImports.get(b.importId);
      if (!run) return { ok: false, reason: "not_found", run: null };
      if (run.status !== "STAGING") return { ok: false, reason: "not_staging", run };
      if (run.stagedThrough !== b.from - 1) return { ok: false, reason: run.stagedThrough > b.from - 1 ? "already_staged" : "out_of_order", run };
      const rows = store.contactImportRows.get(b.importId) ?? new Map<number, StoredContactImportRow>();
      const lines = new Set<number>();
      for (const held of rows.values()) lines.add(held.line);
      for (const row of b.rows) {
        if (lines.has(row.line)) return { ok: false, reason: "duplicate_line", run };
        lines.add(row.line);
      }
      for (const row of b.rows) {
        rows.set(row.ordinal, { ...row, tags: [...row.tags], problems: row.problems.map((p) => ({ ...p })), outcome: null, outcomeReason: null });
      }
      store.contactImportRows.set(b.importId, rows);
      const next: StoredContactImport = {
        ...run,
        stagedThrough: b.from - 1 + b.rows.length,
        status: b.completes ? "STAGED" : "STAGING",
        updatedAt: b.at,
      };
      store.contactImports.set(b.importId, next);
      return { ok: true, run: next };
    },
    /** ⛔ COUNTED FROM THE ROWS, never stored (OD26) — the groupBy the Prisma twin runs. */
    totals: (importId: string): ContactImportTotals => {
      const out: ContactImportTotals = { staged: 0, unreadable: 0, pending: 0, create: 0, update: 0, keep: 0, fail: 0 };
      // ⚠️ Typed: the store literal's `new Map()` widens a read to any under `??` (TS7053 on the outcome below).
      const rows: Map<number, StoredContactImportRow> = store.contactImportRows.get(importId) ?? new Map<number, StoredContactImportRow>();
      for (const row of rows.values()) {
        out.staged++;
        if (row.readError !== null) out.unreadable++;
        if (row.outcome === null) out.pending++;
        else out[row.outcome]++;
      }
      return out;
    },
    /** Retention, 90 days after `finishedAt`: up to `q.limit` DONE or CANCELLED runs go, oldest first, and ⭐ THEIR ROWS
     *  WITH THEM — the ON DELETE CASCADE Postgres does for the other twin, emulated. */
    purgeFinished: (q: ContactImportFinishedPurge): number => {
      const gone = Array.from(store.contactImports.values())
        .filter((r) => (r.status === "DONE" || r.status === "CANCELLED") && r.finishedAt !== null && Date.parse(r.finishedAt) < Date.parse(q.finishedBefore))
        .sort((a, b) => Date.parse(a.finishedAt ?? "") - Date.parse(b.finishedAt ?? "") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, Math.max(0, q.limit));
      for (const r of gone) {
        store.contactImports.delete(r.id);
        store.contactImportRows.delete(r.id);
      }
      return gone.length;
    },
  },

  contactImportRow: {
    /** ⭐ THE KEYSET (X2): the rows AFTER `w.afterOrdinal`, ascending — never an offset, so a row erasure deletes between
     *  two pages cannot shift the walk onto the wrong row. */
    after: (w: ContactImportRowWindow): StoredContactImportRow[] =>
      Array.from<StoredContactImportRow>((store.contactImportRows.get(w.importId) ?? new Map<number, StoredContactImportRow>()).values())
        .filter((row) => row.ordinal > w.afterOrdinal)
        .sort((a, b) => a.ordinal - b.ordinal)
        .slice(0, Math.max(0, Math.min(w.limit, CONTACT_IMPORT_ROW_PAGE_MAX))),
    /** A discarded or swept run's UNSETTLED rows (outcome null). A settled row is the commit's record and stays. */
    deleteUnsettled: (importId: string): number => {
      const rows = store.contactImportRows.get(importId);
      if (!rows) return 0;
      let n = 0;
      for (const [ordinal, row] of rows) if (row.outcome === null) { rows.delete(ordinal); n++; }
      return n;
    },
    /** ⭐ ERASURE'S REACH (U29b): every staged row, in every run, that holds this number. */
    deleteByMsisdn: (msisdn: string): number => {
      let n = 0;
      for (const rows of store.contactImportRows.values()) {
        for (const [ordinal, row] of rows) if (row.msisdn === msisdn) { rows.delete(ordinal); n++; }
      }
      return n;
    },
    /** The access export's read: the staged rows holding this number, NEWEST first, bounded (review F5) — the export
     *  keeps only rows staged since the account began, so a recycled number's older rows must not crowd those out. */
    listByMsisdn: (msisdn: string): StoredContactImportRow[] => {
      const out: StoredContactImportRow[] = [];
      for (const rows of store.contactImportRows.values()) for (const row of rows.values()) if (row.msisdn === msisdn) out.push(row);
      return out
        .sort((a, b) => Date.parse(b.stagedAt) - Date.parse(a.stagedAt) || (a.importId < b.importId ? 1 : a.importId > b.importId ? -1 : 0) || b.ordinal - a.ordinal)
        .slice(0, CONTACT_IMPORT_ROWS_BY_NUMBER_MAX);
    },
  },

  /* ═══ THE CAMPAIGN TABLES (marketing U35b) ═══════════════════════════════════════════════════════════
   * ⛔ ONE DOOR, AND ITS RULES ARE `campaign-model.ts`'s. Every member asks the rule set FIRST, so a refused write
   * changes nothing. The frozen keys move only while the row is a DRAFT on the revision the caller saw; the status
   * moves only while the row is still in `from` — so of two racing writers ONE wins. JavaScript runs each member to
   * the end before any other write, so the check and the write are one step, as the Prisma twin's conditional
   * `updateMany` is one statement. Rows go in and come out as COPIES, as Postgres hands back fresh objects.
   * ⛔ NO `delete` in either namespace and NO stored counter (`test:dal-parity` §26): a recipient row is the
   * record that we messaged somebody. */
  smsCampaign: {
    /** ⭐ A campaign is born a blank DRAFT (`assertNewCampaign`). A second row on one id is Postgres' P2002. */
    create: (row: StoredSmsCampaign): StoredSmsCampaign => {
      assertNewCampaign(row);
      if (store.smsCampaigns.has(row.id)) throw new Error(`unique constraint: SmsCampaign ${row.id} already exists (memory twin of P2002)`);
      store.smsCampaigns.set(row.id, { ...row });
      return { ...row };
    },
    find: (id: string): StoredSmsCampaign | null => {
      // ⛔ DEV ONLY — the U37b drive photographs the composer's read error through U36's switch
      // (`/api/dev-test/marketing-campaigns-seed?fault=1`). The memory twin never serves production.
      if (globalThis.__50PICK_CAMPAIGNS_READ_FAULT) throw new Error("campaign read fault (dev drive)");
      const row = store.smsCampaigns.get(id);
      return row ? { ...row } : null;
    },
    /** U37's DRAFT SAVE — ⭐ COMPARE-AND-SET on `draftRevision`, the ONE optimistic mechanism (X12). Written only
     *  while the row is still a DRAFT on the revision the form was rendered on, which then moves on by one; null
     *  when the row is gone, has left DRAFT, or was saved since. ⛔ So a confirmed scope can never be widened. */
    update: (id: string, patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string): StoredSmsCampaign | null => {
      assertDraftPatch(patch, guard, at);
      const row = store.smsCampaigns.get(id);
      if (row === undefined) return null;
      if (row.status !== "DRAFT" || row.draftRevision !== guard.draftRevision) return null;
      const next: StoredSmsCampaign = { ...row, draftRevision: guard.draftRevision + 1, updatedAt: at };
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) (next as Record<string, unknown>)[k] = v;
      store.smsCampaigns.set(id, next);
      return { ...next };
    },
    /** ⭐ THE ONLY WAY A STATUS MOVES — conditional on `from` (and on `draftRevision` when one is given), so a row
     *  another writer already moved is not touched and the loser gets null. `to: null` writes without a move. */
    transition: (id: string, t: SmsCampaignTransition): StoredSmsCampaign | null => {
      assertTransitionShape(t);
      const row = store.smsCampaigns.get(id);
      if (row === undefined) return null;
      if (!t.from.includes(row.status)) return null;
      if (t.draftRevision !== null && row.draftRevision !== t.draftRevision) return null;
      const next: StoredSmsCampaign = { ...row, status: t.to ?? row.status, updatedAt: t.at };
      for (const [k, v] of Object.entries(t.patch)) if (v !== undefined) (next as Record<string, unknown>)[k] = v;
      store.smsCampaigns.set(id, next);
      return { ...next };
    },
    /** U36 · ONE PAGE of the campaign list and the size of the whole match. Every tie breaks on `id` in the sort's own
     *  direction — the Prisma twin's `orderBy: [first, { id: q.dir }]` — so a page boundary falls in the same place in
     *  both twins. `statuses` null = every status; an EMPTY list = nothing. Rows come out as COPIES. */
    page: (q: SmsCampaignPageQuery): SmsCampaignPage => {
      // ⛔ DEV ONLY — the U36 drive photographs the list's error state through this switch
      // (`/api/dev-test/marketing-campaigns-seed?fault=1`). The memory twin never serves production.
      if (globalThis.__50PICK_CAMPAIGNS_READ_FAULT) throw new Error("campaign list read fault (dev drive)");
      const all: StoredSmsCampaign[] = Array.from(store.smsCampaigns.values());
      const rows = all.filter((c) => q.statuses === null || q.statuses.includes(c.status));
      const sign = q.dir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        const by = q.sort === "name" ? a.name.localeCompare(b.name)
          : q.sort === "updated" ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
          : Date.parse(a.createdAt) - Date.parse(b.createdAt);
        return by !== 0 ? sign * by : sign * a.id.localeCompare(b.id);
      });
      return { rows: rows.slice(q.offset, q.offset + q.limit).map((c) => ({ ...c })), total: rows.length };
    },
    /** U36 · every status with its count over the WHOLE table, zeros included — the rail's counts, never the page's. */
    statusCounts: (): SmsCampaignStatusCounts => {
      if (globalThis.__50PICK_CAMPAIGNS_READ_FAULT) throw new Error("campaign list read fault (dev drive)");
      const all: StoredSmsCampaign[] = Array.from(store.smsCampaigns.values());
      return tallyCampaignStatuses(all.map((c) => ({ status: c.status, count: 1 })));
    },
    /** U36 · how many campaigns want an officer — the nav badge. ⭐ ONE DEFINITION: the pure `wantsAttention`, asked of
     *  each campaign over its own recipient tally; the Prisma twin asks the same question as ONE count. */
    attentionCount: (): number => {
      if (globalThis.__50PICK_CAMPAIGNS_READ_FAULT) throw new Error("campaign list read fault (dev drive)");
      const all: StoredSmsCampaign[] = Array.from(store.smsCampaigns.values());
      const recipients: StoredSmsCampaignRecipient[] = Array.from(store.smsCampaignRecipients.values());
      const tallies = tallyRecipientsByCampaign(all.map((c) => c.id), recipients.map((r) => ({ campaignId: r.campaignId, status: r.status, count: 1 })));
      return all.filter((c) => wantsAttention(c, tallies[c.id])).length;
    },
  },

  smsCampaignRecipient: {
    /** ⭐ ON CONFLICT DO NOTHING, FAKED — the Prisma twin's `createMany({ skipDuplicates: true })`. The batch is
     *  checked WHOLE first (`assertSeeds`); then the rows that would be INSERTED are picked out — a seed whose
     *  (campaignId, msisdn) is already held, or whose id is, is skipped, and the FIRST of two in one batch wins, as
     *  Postgres' does; then the foreign keys of exactly those rows are checked (Postgres checks a link only for a row
     *  it inserts), and only then is anything written: Postgres refuses a statement whole, so a partial batch here
     *  would be a state production can never reach. ⛔ Never an upsert: a person already on the campaign keeps their
     *  row as it is. */
    createMany: (seeds: SmsCampaignRecipientSeed[]): SmsCampaignRecipientInsert => {
      assertSeeds(seeds);
      const planned = new Set<string>();
      const toInsert = seeds.filter((s) => {
        const k = `${s.campaignId}|${s.msisdn}`;
        if (store.recipientsByCampaignMsisdn.has(k) || store.smsCampaignRecipients.has(s.id) || planned.has(k)) return false;
        planned.add(k);
        return true;
      });
      for (const s of toInsert) {
        if (!store.smsCampaigns.has(s.campaignId)) throw new Error(`foreign key: no SmsCampaign ${s.campaignId} (memory twin of P2003) — nothing was written`);
        if (s.contactId !== null && !store.marketingContacts.has(s.contactId)) throw new Error(`foreign key: no MarketingContact ${s.contactId} (memory twin of P2003) — nothing was written`);
        if (s.userId !== null && !store.users.has(s.userId)) throw new Error(`foreign key: no User ${s.userId} (memory twin of P2003) — nothing was written`);
      }
      for (const s of toInsert) {
        const k = `${s.campaignId}|${s.msisdn}`;
        const row: StoredSmsCampaignRecipient = {
          id: s.id,
          campaignId: s.campaignId,
          msisdn: s.msisdn,
          contactId: s.contactId,
          userId: s.userId,
          status: "PENDING",
          smsReference: null,
          optOutToken: s.optOutToken,
          locale: null,
          failureClass: null,
          error: null,
          skipReason: null,
          skipDetail: null,
          claimToken: null,
          claimedAt: null,
          attempts: 0,
          segments: null,
          bodyLen: null,
          costTzs: null,
          gateTrail: null,
          createdAt: s.createdAt,
          updatedAt: s.createdAt,
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
        };
        store.smsCampaignRecipients.set(row.id, row);
        store.recipientsByCampaignMsisdn.set(k, row.id);
      }
      return { inserted: toInsert.length, duplicates: seeds.length - toInsert.length };
    },
    /** A copy all the way down — the gate trail too — as Postgres hands back a fresh row. */
    find: (id: string): StoredSmsCampaignRecipient | null => {
      // ⚠️ `row` typed: the store literal's `new Map()` widens a read to any under `??`, and the gate trail's copy below
      // then cannot infer its element (TS7006). That line stays byte-identical — `test:dal-parity` 26.find and its anchor.
      const row: StoredSmsCampaignRecipient | undefined = store.smsCampaignRecipients.get(id);
      return row ? { ...row, gateTrail: row.gateTrail === null ? null : row.gateTrail.map((g) => ({ ...g })) } : null;
    },
    /** Every recipient status with its count, zeros included, in the schema's order (`fillRecipientCounts`). The
     *  memory twin tallies because it never serves production; the Prisma twin asks ONE groupBy. */
    countByStatus: (campaignId: string): SmsCampaignRecipientCount[] => {
      const raw = new Map<SmsCampaignRecipientStatus, number>();
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.campaignId === campaignId) raw.set(r.status, (raw.get(r.status) ?? 0) + 1);
      }
      return fillRecipientCounts(Array.from(raw, ([status, count]) => ({ status, count })));
    },
    /** U36 · the recipient tally of EACH campaign named — every status, zeros included — and of no other: the list asks
     *  ONCE for exactly its page's ids (never once per row, never the whole table). An empty list is an empty answer. */
    countsByCampaign: (ids: readonly string[]): SmsCampaignRecipientCountsById => {
      if (ids.length === 0) return {};
      const wanted = new Set(ids);
      const recipients: StoredSmsCampaignRecipient[] = Array.from(store.smsCampaignRecipients.values());
      return tallyRecipientsByCampaign(ids, recipients
        .filter((r) => wanted.has(r.campaignId))
        .map((r) => ({ campaignId: r.campaignId, status: r.status, count: 1 })));
    },
    /** U16a · THE ACCESS EXPORT'S READ — the rows about ONE number CREATED OR SENT on or after `sinceIso`, NEWEST first
     *  (`createdAt`, then `id`, both descending: the Prisma twin's `orderBy`), at most `SMS_RECIPIENTS_BY_NUMBER_MAX` + 1 —
     *  the one past the cap only tells the export that it cut (D10). The rule set is asked first
     *  (`assertRecipientNumberRead`). ⛔ The bound is part of the QUESTION, as it is the Prisma twin's WHERE: a recycled
     *  number's older rows — a previous holder's — are never in the answer, so they can never crowd this person's rows out
     *  of the cap; and a row put on a campaign before the number passed to this person but SENT after it is theirs, so it
     *  is in (D12, the review's MINOR-3). Instants compared as instants, never as text. Copies all the way down, as `find`. */
    listByMsisdn: (msisdn: string, sinceIso: string): StoredSmsCampaignRecipient[] => {
      assertRecipientNumberRead(msisdn, sinceIso);
      const since = Date.parse(sinceIso);
      const held: StoredSmsCampaignRecipient[] = Array.from(store.smsCampaignRecipients.values());
      return held
        .filter((r) => r.msisdn === msisdn && (Date.parse(r.createdAt) >= since || (r.sentAt !== null && Date.parse(r.sentAt) >= since)))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
        .slice(0, SMS_RECIPIENTS_BY_NUMBER_MAX + 1)
        .map((r) => ({ ...r, gateTrail: r.gateTrail === null ? null : r.gateTrail.map((g) => ({ ...g })) }));
    },
    /** U16a · ERASURE'S REACH — every row LINKED to the account loses the link, and nothing else changes but the caller's
     *  stamp: the number, the status, the stamps and the gate trail stay, because the row is the record of what was sent
     *  (GN 478T reg 51(1)) and is kept for its own period. The rule set is asked first (`assertRecipientUnlink` — never a
     *  missing id). ⛔ Never a delete, and never a row linked to another account. Answers how many rows lost the link. */
    unlinkUser: (userId: string, at: string): number => {
      assertRecipientUnlink(userId, at);
      let unlinked = 0;
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.userId !== userId) continue;
        r.userId = null;
        r.updatedAt = at;
        unlinked++;
      }
      return unlinked;
    },
    /** U43a · ⭐ THE CLAIM — the first `limit` rows of the campaign that are PENDING AND UNCLAIMED, in id order (E21: the
     *  walk's order), take the caller's fresh token, the instant and the stamp (`claimWrite`); nothing else moves — not
     *  the status, not `attempts`. The rule set is asked first. JavaScript runs this member to its end before any other
     *  write, so the test and the write are one step, as the Prisma twin's conditional `updateMany` is one statement.
     *  ⛔ A token ANY row already holds is refused before anything is written (`refuseHeldToken`, D16 — a token is fresh
     *  for each claim, so the answer can only ever be this claim's rows). Answers the rows NOW holding the token, read by
     *  it (`claimedRows` — `claimedBy`'s read), as copies. */
    claim: (campaignId: string, limit: number, token: string, at: string): StoredSmsCampaignRecipient[] => {
      assertClaim(campaignId, limit, token, at);
      const free: StoredSmsCampaignRecipient[] = [];
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.claimToken === token) refuseHeldToken();
        if (r.campaignId === campaignId && r.status === "PENDING" && r.claimToken === null) free.push(r);
      }
      if (free.length === 0) return [];
      const write = claimWrite(token, at);
      for (const r of free.sort(byRecipientId).slice(0, limit)) writeRecipient(r, write);
      return claimedRows(campaignId, token);
    },
    /** U43a · the campaign's rows STILL PENDING under this claim, in id order — what the slice's `beforeSend` re-reads just
     *  before the wire (E6): a row reaped, released or settled since is not among them, so a stalled slice sends nothing. */
    claimedBy: (campaignId: string, token: string): StoredSmsCampaignRecipient[] => {
      assertClaimRead(campaignId, token);
      return claimedRows(campaignId, token);
    },
    /** U43a · ⭐ THE SETTLE — each patch lands only on ITS row (by id, never by its place in the list) while that row still
     *  holds the claim the patch names AND is PENDING; any other patch is `lost`, never forced (a reaped row, a row a
     *  receipt settled, a stalled slice's claim). The rule set is asked first and refuses the WHOLE batch for one bad patch.
     *  ⛔ ONE STEP OR NOTHING, as the Prisma twin's one transaction: an SMS reference another row already holds is refused
     *  BEFORE the first write — Postgres' unique index would roll the whole transaction back (P2002) — and the refusal
     *  carries `code` "P2002", as Prisma's error does, so a caller that reads the code reads it in both twins (DC-7). Each
     *  landing patch's `settleWrite` is applied through the one apply. Answers how many landed and the ids that did not,
     *  in the order given. The contract — what a caller owes, what this door never writes — is `SmsCampaignRecipientSettle`'s. */
    settle: (patches: readonly SmsCampaignRecipientSettle[], at: string): SmsCampaignSettleResult => {
      assertSettle(patches, at);
      const landing = patches.filter((p) => {
        const r: StoredSmsCampaignRecipient | undefined = store.smsCampaignRecipients.get(p.id);
        return r !== undefined && r.claimToken === p.claimToken && r.status === "PENDING";
      });
      const writes = landing.map((p) => ({ id: p.id, write: settleWrite(p, at) }));
      for (const { id, write } of writes) {
        const reference = write.set.smsReference;
        if (typeof reference !== "string") continue;
        for (const other of store.smsCampaignRecipients.values()) {
          if (other.id !== id && other.smsReference === reference) {
            throw Object.assign(
              new Error("unique constraint: SmsCampaignRecipient.smsReference already held by another row (memory twin of P2002, the transaction rolled back) — nothing was written"),
              { code: "P2002" },
            );
          }
        }
      }
      for (const { id, write } of writes) {
        const r: StoredSmsCampaignRecipient | undefined = store.smsCampaignRecipients.get(id);
        if (r !== undefined) writeRecipient(r, write);
      }
      const landed = new Set(landing.map((p) => p.id));
      return { settled: landed.size, lost: patches.filter((p) => !landed.has(p.id)).map((p) => p.id) };
    },
    /** U43a · THE REAPER'S QUESTION (E6) — the campaign's PENDING rows holding a claim STRICTLY OLDER than `cutoff` (a
     *  claim at the cutoff is not yet stranded), oldest claim first, then id — the Prisma twin's `orderBy` — at most
     *  `limit`. Instants compared as instants. Copies. */
    findStranded: (campaignId: string, cutoff: string, limit: number): StoredSmsCampaignRecipient[] => {
      assertStrandedRead(campaignId, cutoff, limit);
      const before = Date.parse(cutoff);
      const held: StoredSmsCampaignRecipient[] = [];
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.campaignId === campaignId && r.status === "PENDING" && r.claimToken !== null && r.claimedAt !== null && Date.parse(r.claimedAt) < before) held.push(r);
      }
      return held
        .sort((a, b) => Date.parse(a.claimedAt ?? "") - Date.parse(b.claimedAt ?? "") || byRecipientId(a, b))
        .slice(0, limit).map(recipientCopy);
    },
    /** U43a · RESUME'S RE-QUEUE (E8) — every HELD row of the campaign, and ⛔ ONLY HELD (never UNCONFIRMED, never a settled
     *  row), starts over: PENDING, `attempts` 0, the claim's token and the hold's class cleared (its `claimedAt` kept,
     *  D15), the caller's stamp (`requeueWrite`). Answers how many rows moved. */
    requeueHeld: (campaignId: string, at: string): number => {
      assertRequeueHeld(campaignId, at);
      const write = requeueWrite(at);
      let requeued = 0;
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.campaignId !== campaignId || r.status !== "HELD") continue;
        writeRecipient(r, write);
        requeued++;
      }
      return requeued;
    },
    /** U43a · "NOBODY IS DRIVING" — the newest `claimedAt` on the campaign, the instant of the newest claim any of its rows
     *  took: a settled or held row keeps its claim, and a released or requeued row keeps the instant of its last claim
     *  (D15), so the answer never moves backwards while a page claims and releases. null when nothing was ever claimed.
     *  Instants compared as instants. */
    lastActivity: (campaignId: string): string | null => {
      assertActivityRead(campaignId);
      let newest: string | null = null;
      for (const r of store.smsCampaignRecipients.values()) {
        if (r.campaignId !== campaignId || r.claimedAt === null) continue;
        if (newest === null || Date.parse(r.claimedAt) > Date.parse(newest)) newest = r.claimedAt;
      }
      return newest;
    },
  },
};

// Postgres (Prisma) is the ONE production data path. It engages whenever a
// DATABASE_URL is configured — always the case in prod.
const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

// Hard lock: if we're actually serving production traffic (NODE_ENV=production)
// without a database, REFUSE TO START rather than silently fall back to the
// in-memory store — which would lose data and diverge per instance. There is no
// scenario where production runs on memory. (Skipped during `next build`, which
// evaluates modules with NODE_ENV=production but no DB.)
if (!usePrisma && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "FATAL: DATABASE_URL is required. The in-memory store is a test-only fallback " +
    "and must never serve production traffic — set DATABASE_URL (and USE_PRISMA_DAL≠false).",
  );
}

// The in-memory Maps above are retained STRICTLY as a fake for unit tests and
// local dev that run WITHOUT a DATABASE_URL (the test suites create fixed-id
// records and rely on a wipe-on-run store, so they can't share a persistent DB).
// They never execute in production — the guard above guarantees it.
// Type as the ASYNC Prisma DAL so TypeScript enforces `await` on every call.
// In dev (no DATABASE_URL) the sync in-memory store is cast to match — `await`
// on a sync value is a harmless no-op, but a MISSING `await` on an async
// Prisma call is a production crash. This way tsc catches it at compile time.
export const db: typeof prismaDb = usePrisma
  ? prismaDb
  : (memoryDb as unknown as typeof prismaDb);
