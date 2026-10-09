/**
 * Prisma-backed DAL — drop-in async replacement for the in-memory `db` object
 * exported by store.ts.
 *
 * Every method has the same name and return shape as the memory version.
 * The only difference is all methods are `async`. Phase 3 adds `await` at
 * every call site so the switch is transparent.
 *
 * Type conversions handled here:
 *   Prisma DateTime  →  ISO-8601 string
 *   Prisma Decimal   →  number
 *   Prisma enums     →  identical string literals (cast)
 *
 * NOT wired up until Phase 2 flips the switch in store.ts.
 */
import { prisma } from "./prisma";
import type { PrismaClient, Prisma } from "@prisma/client";
// U43b-2 · DC-4 · the ONE runtime value this twin takes from the client: the Json-null sentinel a WHERE needs to ask "no
// trail written yet" (`AnyNull` — a plain `null` is no Json filter on Postgres; see `ai-poll-generation.ts`).
import { Prisma as PrismaRuntime } from "@prisma/client";

// A money-path write can pass a Prisma transaction client (audit C3) so the
// wallet mutation, its Transaction row, and its ledger entries commit together
// (see withMoneyTx in ledger.ts). When omitted, the method self-commits as
// before. `PrismaClient` is assignable to `TransactionClient` (it has a superset
// of the model delegates), so `tx ?? pc()` is well-typed for the model calls.
type Db = Prisma.TransactionClient | PrismaClient;
import {
  summarise, GATEWAY_TYPES, STUCK_PROCESSING_MS,
  type TxnSearchFilters, type TxnSearchResult,
} from "./txn-filters";
import { sniffBase64ImageMime } from "./image-signature";
// U35b · the campaign tables' ONE rule set — asked before every campaign or recipient write, exactly as the memory
// twin asks it (`test:dal-parity` §26). Pure: it takes only types from the store, so there is no cycle.
// U16a · and before erasure's unlink and the access export's read — with the ONE bound that read shares with the memory twin.
// U43a · and before the engine's doors — the claim, the settle, the reaper's reads and the requeue — whose WRITES it
// computes too: this twin drives them through `SMS_CAMPAIGN_RECIPIENT_COLUMN`, the memory twin applies them by name.
// U46a · and before the receipt door — its write (`receiptWrite`, through the same map), the one list of rows a receipt
// moves (`SMS_RECEIPT_FROM`, spread into the WHERE) and the one reading of a miss (`receiptMiss`).
// U43b-2 · and before DC-4's send record — its write (`sendRecordWrite`, through the same map) and the one list of rows it
// writes into (`SMS_SEND_RECORD_FROM`, spread into the WHERE).
import {
  assertNewCampaign, assertDraftPatch, assertTransitionShape, assertSeeds, fillRecipientCounts,
  assertRecipientUnlink, assertRecipientNumberRead, SMS_RECIPIENTS_BY_NUMBER_MAX,
  assertClaim, assertClaimRead, assertSettle, assertStrandedRead, assertRequeueHeld, assertActivityRead, assertTargetsRead,
  claimWrite, settleWrite, requeueWrite, newestPerTarget, refuseHeldToken, type SmsRecipientWrite,
  assertReceipt, receiptWrite, receiptMiss, SMS_RECEIPT_FROM,
  assertSendRecord, sendRecordWrite, SMS_SEND_RECORD_FROM,
  assertSentBeforeRead, assertHandedOverRead,
} from "@/lib/server/marketing/campaign-model";
// U36 · the campaign list's ONE vocabulary: the attention count spreads its statuses (never a retyped list) and every
// count is zero-filled through its tallies, exactly as the memory twin's are (`test:dal-parity` §26).
import {
  ATTENTION_ALWAYS, ATTENTION_WHEN_OWED, OUTSTANDING_RECIPIENT_STATUSES, tallyCampaignStatuses, tallyRecipientsByCampaign,
  tallyRecipientOutcomes,
} from "@/lib/marketing/campaign-status";
// ⛔ The lens definitions have ONE home. Re-listing MONEY_KINDS here is how a kind added to
// the registry later stops appearing under the filter a player would look for it under.
import {
  kindsFor, showsCleared, MONEY_FILTER_KINDS, ACCOUNT_FILTER_KINDS,
  type NotificationFilter, type NotificationSort,
} from "@/lib/notification-filters";
import { parseQuery, queryToWhere, fieldNames, NOTIFICATION_SEARCH, CONTACT_SEARCH } from "@/lib/search";
import { FINAL_REFUSAL_CODES } from "@/lib/kyc-refusal";
import type {
  StoredUser,
  StoredKyc,
  StoredOtp,
  StoredWallet,
  StoredTxn,
  StoredResponsibleGambling,
  StoredNotification,
  StoredSourceOfFunds,
  StoredAffiliateAccount,
  StoredReferralReward,
  StoredProposal,
  StoredObjection,
  StoredProposalVote,
  StoredPushSub,
  StoredEvent,
  StoredBonusGrant,
  BonusGrantStatus,
  StoredInviteCampaign,
  StoredInviteEntry,
  StoredSmsMessage,
  SmsDlr,
  SmsDlrResult,
  StoredSmsCampaign,
  StoredSmsCampaignRecipient,
  SmsCampaignRecipientStatus,
  SmsCampaignGateTrail,
  SmsCampaignDraftPatch,
  SmsCampaignDraftGuard,
  SmsCampaignTransition,
  SmsCampaignTransitionPatch,
  SmsCampaignRecipientSeed,
  SmsCampaignRecipientInsert,
  SmsCampaignRecipientCount,
  SmsCampaignPageQuery,
  SmsCampaignPage,
  SmsCampaignStatusCounts,
  SmsCampaignRecipientCountsById,
  SmsCampaignRecipientOutcomeCount,
  SmsCampaignRecipientSettle,
  SmsCampaignSettleResult,
  SmsRecipientReceipt,
  SmsRecipientReceiptResult,
  SmsRecipientSendRecord,
  SmsRecipientSendRecordResult,
  SmsCampaignHandedOver,
  StoredAgentApplication,
  StoredAgentApplicationDocument,
  StoredAgentInvitation,
  AgentApplicationStatus,
  AgentDocType, StoredKycStageRow, NotificationRedactScope,
  StoredMessagingConsent, StoredSuppression, MessagingKey,
  MessagingKeyBatch,
  MarketingContactPresenceQuery,
  MarketingContactEmailEntry,
  PlayerWalkQuery,
  PlayerWalk,
  StoredMarketingOptOutToken,
  StoredMarketingContact,
  StoredContactList,
  StoredContactListMember,
  ContactListKey,
  MarketingContactPatch,
  ContactEditPatch,
  ContactEditGuard,
  ContactCasResult,
  ContactBulkStamp,
  ContactBulkCount,
  ContactPageQuery,
  ContactPage,
  ContactBookSummary,
  ContactAudienceWhere,
  ContactWalkQuery,
  ContactWalk,
  ContactTagCountQuery,
  ContactTagCount } from "./store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get PrismaClient or throw — DAL is only used when DATABASE_URL is set. */
function pc(): PrismaClient {
  const c = prisma();
  if (!c) throw new Error("prisma-dal: DATABASE_URL is required");
  return c;
}

/** Prisma Date → ISO string */
function iso(d: Date): string;
function iso(d: Date | null | undefined): string | null;
function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Prisma Decimal / number → number */
function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

/** Prisma Decimal / number | null → number | null */
function numOrNull(d: unknown): number | null {
  if (d == null) return null;
  return Number(d);
}

/**
 * SmsMessage row → StoredSmsMessage.
 *
 * ⚠️ `balanceTzs` is a `Decimal(18,2)`, so Prisma hands back a Decimal object, not a
 * number. `numOrNull` is the same coercion every money column uses; a raw Decimal
 * reaching a `<` against the cost floor compares as an object, and the floor then
 * silently never trips — on the one instrument that decides whether a campaign is
 * allowed to eat the float the login path needs.
 */
type SmsMessageRow = {
  reference: string; msisdn: string; purpose: string; provider: string; senderId: string;
  bodyLen: number; status: string; providerMsg: string | null; dlrStatus: string | null;
  dlrDesc: string | null; balanceTzs: unknown; attempts: number; targetType: string | null;
  targetId: string | null; createdAt: Date; sentAt: Date | null; deliveredAt: Date | null;
  failedAt: Date | null;
};

function toStoredSmsMessage(s: SmsMessageRow): StoredSmsMessage {
  return {
    reference: s.reference,
    msisdn: s.msisdn,
    purpose: s.purpose as StoredSmsMessage["purpose"],
    provider: s.provider,
    senderId: s.senderId,
    bodyLen: s.bodyLen,
    status: s.status as StoredSmsMessage["status"],
    providerMsg: s.providerMsg,
    dlrStatus: s.dlrStatus,
    dlrDesc: s.dlrDesc,
    balanceTzs: numOrNull(s.balanceTzs),
    attempts: s.attempts,
    targetType: s.targetType,
    targetId: s.targetId,
    createdAt: iso(s.createdAt),
    sentAt: iso(s.sentAt),
    deliveredAt: iso(s.deliveredAt),
    failedAt: iso(s.failedAt),
  };
}

/**
 * Every writable column of StoredSmsMessage, typed `Record<keyof …>` so `tsc` refuses a
 * field added to the Stored shape and forgotten here.  `null` = not updatable.
 * ⛔ A DateTime column MUST be "date": an ISO string reaching Prisma throws on Postgres
 * and nowhere else, so every memory-backed suite would stay green straight through it.
 */
/**
 * MessagingConsent row → StoredMessagingConsent (marketing U6).
 *
 * ⛔ THERE IS NO COLUMN MAP BESIDE THIS ONE, AND THAT IS THE POINT. `SMS_MESSAGE_COLUMN`
 * exists to drive an `update`; this table has none and never will, so a column map here
 * would be a writer with no reader — a thing that looks like a safety net and catches
 * nothing. `dal-parity` §17 asserts the create and the read mapper instead, and asserts
 * that `update` and `delete` are ABSENT.
 */
type MessagingConsentRow = {
  id: string; channel: string; identifier: string; category: string; status: string;
  source: string; wording: string; locale: string; evidence: string | null;
  recordedBy: string | null; createdAt: Date;
};
function toStoredMessagingConsent(c: MessagingConsentRow): StoredMessagingConsent {
  return {
    id: c.id,
    channel: c.channel as StoredMessagingConsent["channel"],
    identifier: c.identifier,
    category: c.category as StoredMessagingConsent["category"],
    status: c.status as StoredMessagingConsent["status"],
    source: c.source as StoredMessagingConsent["source"],
    wording: c.wording,
    locale: c.locale as StoredMessagingConsent["locale"],
    evidence: c.evidence,
    recordedBy: c.recordedBy,
    createdAt: iso(c.createdAt),
  };
}

/** Suppression row → StoredSuppression (marketing U6, lift U8). ⛔ No delete — a lift
 *  SUPERSEDES the row (`liftedAt`), it never removes it. */
type SuppressionRow = {
  id: string; channel: string; identifier: string; category: string; reason: string;
  evidence: string | null; recordedBy: string | null; createdAt: Date;
  liftedAt: Date | null; liftedReason: string | null;
};
function toStoredSuppression(s: SuppressionRow): StoredSuppression {
  return {
    id: s.id,
    channel: s.channel as StoredSuppression["channel"],
    identifier: s.identifier,
    category: s.category as StoredSuppression["category"],
    reason: s.reason as StoredSuppression["reason"],
    evidence: s.evidence,
    recordedBy: s.recordedBy,
    createdAt: iso(s.createdAt),
    liftedAt: iso(s.liftedAt),
    liftedReason: s.liftedReason,
  };
}

/** MarketingOptOutToken row → StoredMarketingOptOutToken (marketing U8). ⛔ No update, no delete. */
type MarketingOptOutTokenRow = {
  token: string; channel: string; identifier: string; category: string; createdAt: Date;
};
function toStoredMarketingOptOutToken(t: MarketingOptOutTokenRow): StoredMarketingOptOutToken {
  return {
    token: t.token,
    channel: t.channel as StoredMarketingOptOutToken["channel"],
    identifier: t.identifier,
    category: t.category as StoredMarketingOptOutToken["category"],
    createdAt: iso(t.createdAt),
  };
}

/** MarketingContact row -> StoredMarketingContact (marketing U18). */
type MarketingContactRow = {
  id: string; msisdn: string; rawInput: string; displayName: string | null; email: string | null;
  ndc: string; operator: string | null; source: string; sourceRef: string | null;
  userId: string | null; consentState: string; suppressedAt: Date | null; tags: string[];
  notes: string | null; importId: string | null; createdAt: Date; createdBy: string | null;
  updatedAt: Date; updatedBy: string | null;
};
function toStoredMarketingContact(c: MarketingContactRow): StoredMarketingContact {
  return {
    id: c.id,
    msisdn: c.msisdn,
    rawInput: c.rawInput,
    displayName: c.displayName,
    email: c.email,
    ndc: c.ndc,
    operator: c.operator,
    source: c.source as StoredMarketingContact["source"],
    sourceRef: c.sourceRef,
    userId: c.userId,
    consentState: c.consentState as StoredMarketingContact["consentState"],
    suppressedAt: iso(c.suppressedAt),
    tags: c.tags,
    notes: c.notes,
    importId: c.importId,
    createdAt: iso(c.createdAt),
    createdBy: c.createdBy,
    updatedAt: iso(c.updatedAt),
    updatedBy: c.updatedBy,
  };
}

/**
 * U24 · THE PRISMA TWIN'S ONE AUDIENCE TRANSLATION — `page`, `countWhere`, `summaryWhere` and `walk` all read
 * through it, and the memory twin's `contactMatchesAudience` (store.ts) mirrors it predicate for predicate
 * (`test:dal-parity` §21 holds every key of `ContactAudienceWhere` read by both).
 * ⛔ null MEANS NOTHING — a name query SQL cannot express — never "everything".
 * ⛔ Every key is checked `!== null`, never by `.length`: an EMPTY array is NOTHING (`in: []` matches no row in
 * Prisma), and a truthiness test would widen it to the whole book.
 * 🔴 THE ERASED EXCLUSION CARRIES A NULL ARM. A bare `{ sourceRef: { not: … } }` compiles to `"sourceRef" <> $1`,
 * which is NULL — so false — for every row with no sourceRef: nearly the whole book would vanish here while the
 * memory twin's `!==` kept it, and every suite runs on memory.
 */
function toPrismaContactWhere(w: ContactAudienceWhere): Prisma.MarketingContactWhereInput | null {
  const nameWhere = w.name !== null ? queryToWhere(w.name, CONTACT_SEARCH) : {};
  if (nameWhere === null) return null;
  const and: Prisma.MarketingContactWhereInput[] = [nameWhere as Prisma.MarketingContactWhereInput];
  if (w.msisdn !== null) and.push({ msisdn: w.msisdn });
  if (w.consent !== null) and.push({ consentState: { in: w.consent } as never });
  if (w.suppressed !== null) and.push({ suppressedAt: w.suppressed ? { not: null } : null });
  if (w.ndcs !== null) and.push({ ndc: { in: w.ndcs } });
  if (w.listIds !== null) and.push({ lists: { some: { listId: { in: w.listIds } } } });
  if (w.tags !== null) and.push({ tags: { hasSome: w.tags } });
  if (w.sources !== null) and.push({ source: { in: w.sources } as never });
  if (w.linked !== null) and.push({ userId: w.linked ? { not: null } : null });
  if (w.importId !== null) and.push({ importId: w.importId });
  if (w.createdFrom !== null) and.push({ createdAt: { gte: new Date(w.createdFrom) } });
  if (w.createdBefore !== null) and.push({ createdAt: { lt: new Date(w.createdBefore) } });
  if (w.ids !== null) and.push({ id: { in: w.ids } });
  if (w.excludeSourceRef !== null) and.push({ OR: [{ sourceRef: null }, { sourceRef: { not: w.excludeSourceRef } }] });
  return { AND: and };
}

/** U23 · how many rows one bulk statement reads or writes at a time: a book of 150,000 is about thirty round trips per
 *  bulk write — never one read holding the whole book in memory, never one statement per row. */
const CONTACT_BULK_CHUNK = 5000;

/** vb7 (review m1) · the longest ONE bulk Remove may hold its transaction. The largest book a bulk can name is the export's
 *  ceiling, 200,000 rows: forty chunks of CONTACT_BULK_CHUNK, each one count and one delete (the memberships cascade, the
 *  campaign links SET NULL) — two minutes is generous for that. Running out of it is a fault like any other: rolled back,
 *  nobody removed, and the run's audit row says so. */
const CONTACT_BULK_TX_TIMEOUT_MS = 120_000;

/** §25 · the most distinct keys one bulk keyed read takes — the memory twin's `BULK_KEYED_READ_MAX`, the same number
 *  (`test:dal-parity` §25). ⚠️ Not imported from the store: the store imports this module, so a VALUE import back would
 *  be a cycle — the two constants are held equal by the gate instead. */
const BULK_KEYED_READ_MAX = 2000;
/** §25 · a bulk read's keys, deduplicated — and ⛔ REFUSED above the bound, never cut off (the memory twin's rule). */
function bulkKeys(keys: readonly string[], read: string): string[] {
  const unique = Array.from(new Set(keys));
  if (unique.length > BULK_KEYED_READ_MAX) {
    throw new Error(`${read}: at most ${BULK_KEYED_READ_MAX} keys a call (got ${unique.length}) — refused, never cut off`);
  }
  return unique;
}

/** ContactList row -> StoredContactList (marketing U18). */
type ContactListRow = {
  id: string; name: string; description: string | null;
  createdAt: Date; createdBy: string | null; updatedAt: Date; updatedBy: string | null;
};
function toStoredContactList(l: ContactListRow): StoredContactList {
  return {
    id: l.id,
    name: l.name,
    description: l.description,
    createdAt: iso(l.createdAt),
    createdBy: l.createdBy,
    updatedAt: iso(l.updatedAt),
    updatedBy: l.updatedBy,
  };
}

/** ContactListMember row -> StoredContactListMember (marketing U18). */
type ContactListMemberRow = {
  listId: string; contactId: string; addedAt: Date; addedBy: string | null;
};
function toStoredContactListMember(m: ContactListMemberRow): StoredContactListMember {
  return {
    listId: m.listId,
    contactId: m.contactId,
    addedAt: iso(m.addedAt),
    addedBy: m.addedBy,
  };
}

// U33a-L · the list-basis types — an import from the store beside the code that reads them (type-only, so the store's
// import of this module is no cycle) — the ONE erasure mark, from its pure module, which imports nothing, and the ONE
// rule set both twins ask before every read or write (pure, types only from the store: no cycle either).
import type {
  StoredContactListBasis, ContactListBasisSeed, ContactListBasisRevocation, OutreachBasisCover, BookStanding, BookStandingEntry,
  ListBasisCoverage,
} from "./store";
import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";
// C8a · the ONE "does an erasure stand?" both twins' grouped read answer through (its own line: §27.5 pins the one above).
import { erasureStandsAmongRows } from "@/lib/marketing/erasure-mark";
import { assertListBasisSeed, assertListBasisRevocation, assertListBasisKeys } from "@/lib/server/marketing/list-basis-model";

/** ContactListBasis row -> StoredContactListBasis (marketing U33a-L). ⛔ No update member and no delete member in either
 *  twin: the row is evidence, and `revoke` sets its three revocation columns ONCE. */
type ContactListBasisRow = {
  id: string; listId: string; basisKey: string; wording: string; wordingVersion: number; adultWording: string;
  adultVersion: number; proofNote: string; recordedBy: string; recordedAt: Date; revokedAt: Date | null;
  revokedBy: string | null; revokedReason: string | null;
};
function toStoredContactListBasis(b: ContactListBasisRow): StoredContactListBasis {
  return {
    id: b.id,
    listId: b.listId,
    basisKey: b.basisKey,
    wording: b.wording,
    wordingVersion: b.wordingVersion,
    adultWording: b.adultWording,
    adultVersion: b.adultVersion,
    proofNote: b.proofNote,
    recordedBy: b.recordedBy,
    recordedAt: iso(b.recordedAt),
    revokedAt: iso(b.revokedAt),
    revokedBy: b.revokedBy,
    revokedReason: b.revokedReason,
  };
}

/** U33a-L · the three KEY-ONLY rows `bookStandings` reads — named, so each query's result is checked against them. */
type BookKeyRow = { id: string; msisdn: string; sourceRef: string | null };
type BookMemberRow = { listId: string; contactId: string; addedAt: Date };
type BookBasisRow = { id: string; listId: string; recordedAt: Date; revokedAt: Date | null };

/**
 * U33a-L · THE ONE DEFINITION OF A NUMBER'S BOOK STANDING ON POSTGRES — `standingFor` and `standingAmong` both ask it, so
 * the single read and the bulk read cannot disagree; the memory twin's `bookStandings` takes the same three steps in the
 * same order (`test:dal-parity` §27). Keys in (already deduplicated by the caller, and checked by the rule set), one entry
 * per key out — a number with no book row included — ordered by key.
 * ⛔ THREE QUERIES, AND EACH `in` IS ANSWERED EARLY WHEN IT WOULD BE EMPTY. No list is ever built into an `OR` — Prisma
 * reads a nested `OR: []` as NO condition at all on Postgres here (bulk-reads-pg-probe 7 measured every player coming
 * back for []), and an empty `in` would be a round trip asking for nothing:
 *   1 · the book rows by number — KEY-ONLY: the id, the number and the erasure mark, never a name, an e-mail or a note;
 *   2 · the memberships of the LIVE rows — ⛔ an erased tombstone's memberships are never read: it covers nothing (S9);
 *   3 · EVERY recording of those lists, revoked ones included (⛔ no revocation filter in the QUESTION: filtering first
 *       would let an older recording stand in for a revoked newest one), newest first.
 * ⭐ A LIST'S ONE STANDING IS ITS NEWEST RECORDING (M1): the first per list in that order, dropped when revoked — so
 * revoking the newest ends the list's coverage and an older recording never comes back. A live row's cover is the FIRST
 * in-force recording on a list it joined at or before the recording (`addedAt <= recordedAt`, compared as instants — the
 * Dates' milliseconds, never their spelling): the newest covering recording across its lists (S8).
 */
async function bookStandings(keys: readonly string[]): Promise<BookStandingEntry[]> {
  if (keys.length === 0) return [];
  assertListBasisKeys("contactListBasis.standing", keys);
  const rows: BookKeyRow[] = await pc().marketingContact.findMany({
    where: { msisdn: { in: [...keys] } },
    select: { id: true, msisdn: true, sourceRef: true },
  });
  const liveIds = rows.filter((r) => r.sourceRef !== ERASURE_EVIDENCE).map((r) => r.id);
  const members: BookMemberRow[] = liveIds.length === 0 ? [] : await pc().contactListMember.findMany({
    where: { contactId: { in: liveIds } },
    select: { listId: true, contactId: true, addedAt: true },
  });
  const joined = new Map<string, Map<string, number>>();
  for (const m of members) {
    const lists = joined.get(m.contactId) ?? new Map<string, number>();
    lists.set(m.listId, m.addedAt.getTime());
    joined.set(m.contactId, lists);
  }
  const listIds = Array.from(new Set(members.map((m) => m.listId)));
  const bases: BookBasisRow[] = listIds.length === 0 ? [] : await pc().contactListBasis.findMany({
    where: { listId: { in: listIds } },
    select: { id: true, listId: true, recordedAt: true, revokedAt: true },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
  });
  const newest = new Map<string, BookBasisRow>();
  for (const b of bases) if (!newest.has(b.listId)) newest.set(b.listId, b);
  const inForce = [...newest.values()].filter((b) => b.revokedAt === null);
  const byKey = new Map<string, BookKeyRow>();
  for (const r of rows) byKey.set(r.msisdn, r);
  return [...keys].sort().map((msisdn): BookStandingEntry => {
    const row = byKey.get(msisdn);
    if (row === undefined) return { msisdn, standing: { row: "none", cover: null } };
    if (row.sourceRef === ERASURE_EVIDENCE) return { msisdn, standing: { row: "erased", cover: null } };
    const lists = joined.get(row.id);
    const found = lists === undefined ? undefined : inForce.find((b) => {
      const joinedAt = lists.get(b.listId);
      return joinedAt !== undefined && joinedAt <= b.recordedAt.getTime();
    });
    const cover: OutreachBasisCover | null = found === undefined ? null : { basisId: found.id, listId: found.listId, recordedAt: found.recordedAt.toISOString() };
    return { msisdn, standing: { row: "live", cover } };
  });
}

// U33r · the agent-referee keys' types — an import from the store beside the code that reads them (type-only, so the
// store's import of this module is no cycle) — and the ONE rule set both twins ask before every read or write (pure, types
// only from the store: no cycle either).
import type { StoredAgentRefereeKey, AgentRefereeKeyEntry } from "./store";
import { assertRefereeKeyRows, assertRefereeKeys } from "@/lib/server/marketing/referee-key-model";

/** U33r · the KEY-ONLY row `refereeHeld` reads — named, so the query's result is checked against it. */
type RefereeKeyRow = { refereeKey: string };

/**
 * U33r · THE ONE DEFINITION OF A REFEREE KEY'S ANSWER ON POSTGRES — `holds` and `heldAmong` both ask it, so the single
 * read and the bulk read cannot disagree; the memory twin's `refereeHeld` takes the same steps (`test:dal-parity` §28).
 * Keys in (already deduplicated by the caller, and checked by the rule set), one entry per key out — a key no row holds
 * included, as `held: false` — ordered by key. ONE query, served by the primary key, and an empty set answered before it.
 */
async function refereeHeld(keys: readonly string[]): Promise<AgentRefereeKeyEntry[]> {
  if (keys.length === 0) return [];
  assertRefereeKeys("agentRefereeKey.held", keys);
  const rows: RefereeKeyRow[] = await pc().agentRefereeKey.findMany({
    where: { refereeKey: { in: [...keys] } },
    select: { refereeKey: true },
  });
  const held = new Set(rows.map((r) => r.refereeKey));
  return [...keys].sort().map((refereeKey): AgentRefereeKeyEntry => ({ refereeKey, held: held.has(refereeKey) }));
}

// U29 · the staging types — a second import from the store, kept beside the code that reads them (type-only, so the
// store's import of this module is no cycle).
import type {
  StoredContactImport, StoredContactImportRow, ContactImportStageBatch, ContactImportStageResult, ContactImportTransition,
  ContactImportTotals, ContactImportIdleQuery, ContactImportFinishedPurge, ContactImportRowWindow,
} from "./store";
// §29 · S15 · the import's check and commit types — a third type-only import from the store, beside the code that reads them.
import type {
  MarketingContactSnapshot, ContactImportFirstLinesQuery, ContactImportFirstLine, ContactImportFailedQuery,
  ContactImportFailedPage, ContactImportKeptCount, ContactImportFreeze, ContactImportCommitBatch, ContactImportCommitResult,
  ContactImportOthersQuery,
} from "./store";
// C8b · the revival (B1), the list figures by viewer (B5) and the "Added" re-dating (B8) — named, as dal-parity needs.
import type {
  ContactTombstoneRevival, ContactTombstoneRevived, ListBasisCoverageSplit, ContactAddedRedate, ContactAddedRedateResult,
} from "./store";
import { assertAddedRedates } from "@/lib/server/contacts/added-redate-model";

/** U29 · the most rows one keyset page, and one access-export read for a number, hand back — the memory twin's bounds. */
const CONTACT_IMPORT_ROW_PAGE_MAX = 2000;
const CONTACT_IMPORT_ROWS_BY_NUMBER_MAX = 1000;
/** §29 · the most failures one page hands back — the memory twin's `CONTACT_IMPORT_FAILED_PAGE_MAX`, the same number. */
const CONTACT_IMPORT_FAILED_PAGE_MAX = 50;
/** §29 · S15-12 · the most open runs of other officers one read hands back — the memory twin's
 *  `CONTACT_IMPORT_OPEN_RUNS_MAX`, the same number. */
const CONTACT_IMPORT_OPEN_RUNS_MAX = 20;
/** §29 · ONE commit step's transaction: at most 500 rows — one create statement, one conditional update per changed
 *  contact, a few grouped settlements — measured in tens of milliseconds; the timeout is a ceiling, never a budget. */
const CONTACT_IMPORT_COMMIT_TX_TIMEOUT_MS = 30_000;
/** §29 · the start's freeze: one conditional update, and — for a new list — one insert and one update more. */
const CONTACT_IMPORT_FREEZE_TX_TIMEOUT_MS = 10_000;
/** C8b (B1) · a tombstone's revival: one conditional update, one delete of its memberships, one read back. */
const CONTACT_REVIVE_TX_TIMEOUT_MS = 10_000;
/** C8b (B8) · the "Added" re-dating: one conditional update per row, at most `ADDED_REDATE_MAX` rows (the 54 of 2026-10-03
 *  take milliseconds); the timeout is a ceiling, never a budget. */
const CONTACT_REDATE_TX_TIMEOUT_MS = 30_000;

/** C8b (B8) · thrown INSIDE the re-dating's transaction when a row is gone or no longer holds its expected `createdAt`, so
 *  Postgres rolls every row back and the member answers `changed`, naming it. */
class ContactAddedRedateChanged extends Error {
  constructor(readonly id: string) {
    super("marketingContact.redateAdded: a row changed since the plan — every row was rolled back");
  }
}

/** §29 · thrown INSIDE the commit's transaction when the unique index refused a create, a guard refused an update, or a
 *  staged row the step settles is gone (R9), so Postgres rolls the whole step back — the cursor included — and the step
 *  answers `conflict` naming the rows. */
class ContactImportBatchConflict extends Error {
  constructor(readonly ordinals: number[]) {
    super(`contactImport.commitBatch: ${ordinals.length} row(s) changed since they were decided — the step was rolled back`);
  }
}

/** ContactImport row -> StoredContactImport (marketing U29). ⚠️ Named `…Record`, not `…Row`: `ContactImportRow` is a
 *  model of its own. The two JSON columns come back as whatever was written: the service validates before it drafts. */
type ContactImportRecord = {
  id: string; status: string; format: string; fileName: string | null; fileDigest: string; mapping: unknown;
  totalRows: number; unreadable: number; stagedThrough: number; committedThrough: number;
  decisionChoice: string | null; decisionOverrides: unknown; decisionConfirmedAt: Date | null; decisionConfirmedBy: string | null;
  consentBasis: string | null; consentWording: string | null; consentProofNote: string | null; adultAttestedAt: Date | null;
  consentBasisSetBy: string | null; consentBasisSetAt: Date | null;
  pausedAt: Date | null; pausedBy: string | null; finishedAt: Date | null;
  createdAt: Date; createdBy: string; updatedAt: Date; targetListId: string | null;
};
function toStoredContactImport(r: ContactImportRecord): StoredContactImport {
  return {
    id: r.id,
    status: r.status as StoredContactImport["status"],
    format: r.format as StoredContactImport["format"],
    fileName: r.fileName,
    fileDigest: r.fileDigest,
    mapping: (r.mapping ?? {}) as StoredContactImport["mapping"],
    totalRows: r.totalRows,
    unreadable: r.unreadable,
    stagedThrough: r.stagedThrough,
    committedThrough: r.committedThrough,
    decisionChoice: r.decisionChoice as StoredContactImport["decisionChoice"],
    decisionOverrides: (r.decisionOverrides ?? {}) as StoredContactImport["decisionOverrides"],
    decisionConfirmedAt: iso(r.decisionConfirmedAt),
    decisionConfirmedBy: r.decisionConfirmedBy,
    consentBasis: r.consentBasis,
    consentWording: r.consentWording,
    consentProofNote: r.consentProofNote,
    adultAttestedAt: iso(r.adultAttestedAt),
    consentBasisSetBy: r.consentBasisSetBy,
    consentBasisSetAt: iso(r.consentBasisSetAt),
    pausedAt: iso(r.pausedAt),
    pausedBy: r.pausedBy,
    finishedAt: iso(r.finishedAt),
    createdAt: iso(r.createdAt),
    createdBy: r.createdBy,
    updatedAt: iso(r.updatedAt),
    targetListId: r.targetListId,
  };
}

/** ContactImportRow row -> StoredContactImportRow (marketing U29). */
type ContactImportRowRecord = {
  importId: string; ordinal: number; line: number; rawPhone: string; msisdn: string | null; displayName: string | null;
  email: string | null; tags: string[]; notes: string | null; problems: unknown; readError: string | null;
  outcome: string | null; outcomeReason: string | null; stagedAt: Date;
};
function toStoredContactImportRow(w: ContactImportRowRecord): StoredContactImportRow {
  return {
    importId: w.importId,
    ordinal: w.ordinal,
    line: w.line,
    rawPhone: w.rawPhone,
    msisdn: w.msisdn,
    displayName: w.displayName,
    email: w.email,
    tags: w.tags,
    notes: w.notes,
    problems: (Array.isArray(w.problems) ? w.problems : []) as StoredContactImportRow["problems"],
    readError: w.readError,
    outcome: w.outcome as StoredContactImportRow["outcome"],
    outcomeReason: w.outcomeReason,
    stagedAt: iso(w.stagedAt),
  };
}

/** U29 · why a staging batch lost its compare-and-set, read off the run as it stands now — in the memory twin's order,
 *  so the two twins give one answer. */
function stageLoss(run: StoredContactImport | null, b: ContactImportStageBatch): ContactImportStageResult {
  if (!run) return { ok: false, reason: "not_found", run: null };
  if (run.status !== "STAGING") return { ok: false, reason: "not_staging", run };
  return { ok: false, reason: run.stagedThrough > b.from - 1 ? "already_staged" : "out_of_order", run };
}

const SMS_MESSAGE_COLUMN: Record<keyof StoredSmsMessage, "date" | "plain" | null> = {
  reference: null,
  createdAt: null,
  msisdn: "plain",
  purpose: "plain",
  provider: "plain",
  senderId: "plain",
  bodyLen: "plain",
  status: "plain",
  providerMsg: "plain",
  dlrStatus: "plain",
  dlrDesc: "plain",
  balanceTzs: "plain",
  attempts: "plain",
  targetType: "plain",
  targetId: "plain",
  sentAt: "date",
  deliveredAt: "date",
  failedAt: "date",
};

/**
 * SmsCampaign row -> StoredSmsCampaign (marketing U35b).
 * ⚠️ `estimateTzs` and `budgetTzs` are `Decimal(18,2)`, so Prisma hands back a Decimal object: `numOrNull`, the
 * coercion every money column uses (the SmsMessage note above). ⭐ `audienceFilter` is TEXT, so it comes back as the
 * exact string written — U24's canonical key, byte for byte (JSONB would have reordered its keys).
 */
type SmsCampaignRow = {
  id: string; name: string; status: string; bodySw: string; bodyEn: string | null; codingSw: string;
  segmentsSw: number; codingEn: string | null; segmentsEn: number | null; nameFallbackSw: string | null;
  nameFallbackEn: string | null; sourcePhrase: string | null; draftRevision: number; confirmTier: string | null;
  audienceFilter: string; audienceCount: number | null; audienceWatermark: string | null;
  estimateSegments: number | null; estimateTzs: unknown; budgetTzs: unknown; enqueueCursor: string | null;
  enqueuedAt: Date | null; stopReason: string | null; createdBy: string; confirmedBy: string | null;
  confirmedAt: Date | null; startedAt: Date | null; pausedAt: Date | null; finishedAt: Date | null;
  createdAt: Date; updatedAt: Date;
};
function toStoredSmsCampaign(cmp: SmsCampaignRow): StoredSmsCampaign {
  return {
    id: cmp.id,
    name: cmp.name,
    status: cmp.status as StoredSmsCampaign["status"],
    bodySw: cmp.bodySw,
    bodyEn: cmp.bodyEn,
    codingSw: cmp.codingSw as StoredSmsCampaign["codingSw"],
    segmentsSw: cmp.segmentsSw,
    codingEn: cmp.codingEn as StoredSmsCampaign["codingEn"],
    segmentsEn: cmp.segmentsEn,
    nameFallbackSw: cmp.nameFallbackSw,
    nameFallbackEn: cmp.nameFallbackEn,
    sourcePhrase: cmp.sourcePhrase,
    draftRevision: cmp.draftRevision,
    confirmTier: cmp.confirmTier as StoredSmsCampaign["confirmTier"],
    audienceFilter: cmp.audienceFilter,
    audienceCount: cmp.audienceCount,
    audienceWatermark: cmp.audienceWatermark,
    estimateSegments: cmp.estimateSegments,
    estimateTzs: numOrNull(cmp.estimateTzs),
    budgetTzs: numOrNull(cmp.budgetTzs),
    enqueueCursor: cmp.enqueueCursor,
    enqueuedAt: iso(cmp.enqueuedAt),
    stopReason: cmp.stopReason,
    createdBy: cmp.createdBy,
    confirmedBy: cmp.confirmedBy,
    confirmedAt: iso(cmp.confirmedAt),
    startedAt: iso(cmp.startedAt),
    pausedAt: iso(cmp.pausedAt),
    finishedAt: iso(cmp.finishedAt),
    createdAt: iso(cmp.createdAt),
    updatedAt: iso(cmp.updatedAt),
  };
}

/**
 * SmsCampaignRecipient row -> StoredSmsCampaignRecipient (marketing U35b).
 * ⛔ It reads the row's OWN columns and never a relation — no contact, user or campaign reached through — because a
 * recipient holds LINKS, never a copy of a contact's or a player's details (`test:dal-parity` §26.link).
 * ⭐ THE COLUMN MAP BESIDE IT (U43a, `SMS_CAMPAIGN_RECIPIENT_COLUMN`) drives every write the engine's doors make — the
 * claim, the settle, the requeue — from the ONE write the rule set computes (`smsRecipientData`): map-driven, never a
 * hand-written allow-list. `createMany` still writes the seed's keys by name (§26.createMany); U46a's receipt brings
 * its own write (`receiptWrite`) through the same map.
 * ⭐ THE STATUS IS CAST TO THE ONE NAMED UNION (`SmsCampaignRecipientStatus`, store.ts) — never an inline list — so the
 * value U43-0 added, UNCONFIRMED, is a status this twin names the moment the union does (`test:dal-parity`
 * 26.status). The cast checks nothing by itself: the generated client rejects a label it was not built with, and the
 * counts (`fillRecipientCounts`, `tallyRecipientsByCampaign`) refuse a status this code does not know.
 */
type SmsCampaignRecipientRow = {
  id: string; campaignId: string; msisdn: string; contactId: string | null; userId: string | null; status: string;
  smsReference: string | null; optOutToken: string | null; locale: string | null; failureClass: string | null;
  error: string | null; skipReason: string | null; skipDetail: string | null; claimToken: string | null;
  claimedAt: Date | null; attempts: number; segments: number | null; bodyLen: number | null; costTzs: unknown;
  gateTrail: unknown; createdAt: Date; updatedAt: Date; sentAt: Date | null; deliveredAt: Date | null;
  failedAt: Date | null;
};
function toStoredSmsCampaignRecipient(rcp: SmsCampaignRecipientRow): StoredSmsCampaignRecipient {
  return {
    id: rcp.id,
    campaignId: rcp.campaignId,
    msisdn: rcp.msisdn,
    contactId: rcp.contactId,
    userId: rcp.userId,
    status: rcp.status as SmsCampaignRecipientStatus,
    smsReference: rcp.smsReference,
    optOutToken: rcp.optOutToken,
    locale: rcp.locale as StoredSmsCampaignRecipient["locale"],
    failureClass: rcp.failureClass,
    error: rcp.error,
    skipReason: rcp.skipReason,
    skipDetail: rcp.skipDetail,
    claimToken: rcp.claimToken,
    claimedAt: iso(rcp.claimedAt),
    attempts: rcp.attempts,
    segments: rcp.segments,
    bodyLen: rcp.bodyLen,
    costTzs: numOrNull(rcp.costTzs),
    gateTrail: rcp.gateTrail as SmsCampaignGateTrail | null,
    createdAt: iso(rcp.createdAt),
    updatedAt: iso(rcp.updatedAt),
    sentAt: iso(rcp.sentAt),
    deliveredAt: iso(rcp.deliveredAt),
    failedAt: iso(rcp.failedAt),
  };
}

/**
 * ⭐ U43a · EVERY StoredSmsCampaignRecipient KEY AND HOW THE ENGINE'S DOORS WRITE IT — typed `Record<keyof …>`, so a
 * column added to the stored shape and forgotten here is a `tsc` error. `null` = NEVER written by a claim, a settle, a
 * requeue or a receipt (U46a): the id, the campaign and the number are the seed's; the two LINKS move only by erasure's
 * unlink and Postgres' SET NULL; `costTzs` is provider-reported and nothing reports it yet (a receipt carries no price);
 * `createdAt` is the seed's.
 * ⛔ A DateTime column MUST be "date" — an ISO string reaching Prisma throws on Postgres and nowhere else — and the gate
 * trail is "json": written as a value, never cleared.
 */
const SMS_CAMPAIGN_RECIPIENT_COLUMN: Record<keyof StoredSmsCampaignRecipient, "date" | "plain" | "json" | null> = {
  id: null,
  campaignId: null,
  msisdn: null,
  contactId: null,
  userId: null,
  costTzs: null,
  createdAt: null,
  status: "plain",
  smsReference: "plain",
  optOutToken: "plain",
  locale: "plain",
  failureClass: "plain",
  error: "plain",
  skipReason: "plain",
  skipDetail: "plain",
  claimToken: "plain",
  claimedAt: "date",
  attempts: "plain",
  segments: "plain",
  bodyLen: "plain",
  gateTrail: "json",
  updatedAt: "date",
  sentAt: "date",
  deliveredAt: "date",
  failedAt: "date",
};

/**
 * U43a · a write the rule set computed (`claimWrite`, `settleWrite`, `requeueWrite`, U46a's `receiptWrite` and U43b-2's
 * `sendRecordWrite`, campaign-model.ts) -> Prisma `data`, DRIVEN BY THE MAP — the very write the memory twin applies by name
 * (`writeRecipient`), so the twins cannot write different columns. ⛔ An unmapped key THROWS, and so does a key the map
 * says these doors never write. `attempts` moves on as `{ increment }`, so a release adds to what Postgres holds at the
 * write — never a read-then-write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function smsRecipientData(w: SmsRecipientWrite): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(w.set)) {
    if (v === undefined) continue;
    const spec = SMS_CAMPAIGN_RECIPIENT_COLUMN[k as keyof StoredSmsCampaignRecipient];
    if (spec === undefined) {
      throw new Error(`[prisma-dal] smsCampaignRecipient: unmapped field "${k}" — add it to SMS_CAMPAIGN_RECIPIENT_COLUMN or it is a silent production no-op.`);
    }
    if (spec === null) throw new Error(`[prisma-dal] smsCampaignRecipient: "${k}" is never written by a claim, a settle, a requeue or a receipt.`);
    if (spec === "json") {
      if (v === null) throw new Error(`[prisma-dal] smsCampaignRecipient: "${k}" is never cleared.`);
      data[k] = v as unknown as Prisma.InputJsonValue;
      continue;
    }
    data[k] = spec === "date" ? (v === null ? null : new Date(v as string)) : v;
  }
  if (w.attemptsBy > 0) data.attempts = { increment: w.attemptsBy };
  return data;
}

/** U43a · the campaign's rows STILL PENDING under one claim, by id — the claim's own third step and `claimedBy`'s answer,
 *  ONE read (`claimToken` is indexed). The status is in the WHERE, so a settled row that keeps its token is never read
 *  back as held. */
async function recipientsClaimedBy(campaignId: string, token: string): Promise<StoredSmsCampaignRecipient[]> {
  const rows = await pc().smsCampaignRecipient.findMany({ where: { campaignId, claimToken: token, status: "PENDING" }, orderBy: { id: "asc" } });
  return rows.map(toStoredSmsCampaignRecipient);
}

/**
 * Every StoredSmsCampaign key and how a patch writes it, typed `Record<keyof …>` so `tsc` refuses a key added to the
 * stored shape and forgotten here. `null` = NEVER written through a patch: the id and the provenance are set once,
 * the status moves only as a transition's `to`, `draftRevision` only by the draft save, `updatedAt` only from `at`.
 * ⛔ A DateTime column MUST be "date" — an ISO string reaching Prisma throws on Postgres and nowhere else.
 * "decimal" columns are written as numbers and read back through `numOrNull`.
 */
const SMS_CAMPAIGN_COLUMN: Record<keyof StoredSmsCampaign, "date" | "plain" | "decimal" | null> = {
  id: null,
  status: null,
  draftRevision: null,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  name: "plain",
  bodySw: "plain",
  bodyEn: "plain",
  codingSw: "plain",
  segmentsSw: "plain",
  codingEn: "plain",
  segmentsEn: "plain",
  nameFallbackSw: "plain",
  nameFallbackEn: "plain",
  sourcePhrase: "plain",
  audienceFilter: "plain",
  audienceCount: "plain",
  confirmTier: "plain",
  audienceWatermark: "plain",
  estimateSegments: "plain",
  estimateTzs: "decimal",
  budgetTzs: "decimal",
  confirmedBy: "plain",
  confirmedAt: "date",
  enqueueCursor: "plain",
  enqueuedAt: "date",
  stopReason: "plain",
  startedAt: "date",
  pausedAt: "date",
  finishedAt: "date",
};

/**
 * A campaign patch -> Prisma `data`, DRIVEN BY THE MAP — the 2026-09-07 lesson (`dal-parity` §1): a hand-written
 * allow-list drops a field silently and still returns a row. ⛔ An unmapped key THROWS, and so does a key the map
 * says is never patched (the rule set refuses both first; this is the second net).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function smsCampaignData(patch: SmsCampaignDraftPatch | SmsCampaignTransitionPatch): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const spec = SMS_CAMPAIGN_COLUMN[k as keyof StoredSmsCampaign];
    if (spec === undefined) {
      throw new Error(`[prisma-dal] smsCampaign: unmapped field "${k}" — add it to SMS_CAMPAIGN_COLUMN or it is a silent production no-op.`);
    }
    if (spec === null) throw new Error(`[prisma-dal] smsCampaign: "${k}" is never written through a patch.`);
    data[k] = spec === "date" ? (v === null ? null : new Date(v as string)) : v;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Entity mappers: Prisma row → Stored* type
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredUser(u: any): StoredUser {
  return {
    id: u.id,
    phoneE164: u.phoneE164,
    passwordHash: u.passwordHash,
    passwordSalt: u.passwordSalt,
    failedLoginCount: u.failedLoginCount ?? 0,
    lockedUntil: iso(u.lockedUntil),
    role: u.role,
    status: u.status,
    email: u.email ?? null,
    emailVerifiedAt: iso(u.emailVerifiedAt),
    locale: u.locale,
    displayName: u.displayName,
    dob: iso(u.dob),
    region: u.region,
    acceptedTermsVersion: u.acceptedTermsVersion,
    acceptedTermsAt: iso(u.acceptedTermsAt),
    marketingOptIn: u.marketingOptIn,
    twoFactorEnabled: u.twoFactorEnabled,
    avatarDataUrl: u.avatarDataUrl,
    createdAt: iso(u.createdAt)!,
    updatedAt: iso(u.updatedAt)!,
    lastLoginAt: iso(u.lastLoginAt),
    closedAt: iso(u.closedAt),
    recruitedBy: u.recruitedBy ?? null,
    // ⭐ THE PROVENANCE STAMP. ⛔ These three must be mapped in ALL FOUR places — here, in
    // `create`, in `update`'s date list, and in `StoredUser` — or the stamp is written by the
    // memory DAL, dropped by Prisma, and every suite stays green while production silently
    // reads NULL and coalesces the whole agent book back to PLAYER.
    recruitedProgramme: u.recruitedProgramme ?? null,
    recruitedAt: iso(u.recruitedAt),
    recruitedByCode: u.recruitedByCode ?? null,
    // ⭐ PASSWORD HISTORY (house bots, 04 A4). ⛔ The same four-place rule as the provenance
    // stamp above: here, `create`, `update`'s date list and `StoredUser`.
    passwordSetAt: iso(u.passwordSetAt),
    passwordSetVia: u.passwordSetVia ?? null,
    emailSetByOfficerAt: iso(u.emailSetByOfficerAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStoredKyc(row: any): StoredKyc {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    rejectReason: row.rejectReason ?? null,
    rejectNote: row.rejectNote,
    idType: row.idType ?? null,
    idNumber: row.idNumber ?? null,
    // ⚠️ DATE ONLY, and that is not cosmetic. `idExpiry` is a calendar day printed
    // on a document, stored at UTC midnight; `iso()` returns a full timestamp,
    // and this laptop is EAT (+3), so rendering the timestamp shows the day
    // BEFORE the one on the passport. Every consumer wants the day.
    idExpiry: row.idExpiry ? iso(row.idExpiry)?.slice(0, 10) ?? null : null,
    idVerifiedAt: iso(row.idVerifiedAt),
    idFingerprint: row.idFingerprint ?? null,
    fullName: row.fullName,
    dob: iso(row.dob),
    // 🔴 `mimeType`/`sizeBytes` MUST be carried back out. `db.kyc.upsert` syncs
    // documents by deleting and re-creating every row from the StoredKyc it is
    // handed, and every caller builds that StoredKyc by reading here first. Drop
    // the two columns on the way out and the next write re-derives them from the
    // storageKey — which only parses as a data URL, so every `r2:<key>` was
    // rewritten as `application/octet-stream` / `0`. attachDocument measured the
    // real bytes; submitForReview then erased the measurement. Measured on
    // production 2026-07-31: all 19 R2 rows 0 bytes while holding real JPEGs,
    // every legacy inline row correct. The write half was fixed in 502160f — this
    // read half is what made that fix invisible. Campaign §6 E-3.
    documents: (row.documents ?? []).map(
      (d: { docType: string; storageKey: string; uploadedAt: Date; mimeType?: string | null; sizeBytes?: number | null }) => ({
        docType: d.docType,
        storageKey: d.storageKey,
        uploadedAt: iso(d.uploadedAt)!,
        ...(d.mimeType ? { mimeType: d.mimeType } : {}),
        ...(typeof d.sizeBytes === "number" ? { sizeBytes: d.sizeBytes } : {}),
      }),
    ),
    reviewerId: row.reviewerId,
    reviewedAt: iso(row.reviewedAt),
    submittedAt: iso(row.submittedAt),
    // 🔴 CARRIED BOTH WAYS OR THE WITHDRAWAL GATE FORGETS. `db.kyc.upsert` writes
    // back the whole StoredKyc every caller builds by reading here first — so a
    // field dropped on the way OUT is nulled on the next write. That is the E-3
    // shape (see the documents note above), and on THIS column it would null a
    // player's first-approval date and lock them out of their own money.
    approvedAt: iso(row.approvedAt),
    extraRequests: Array.isArray(row.extraRequests) ? row.extraRequests : [],
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  };
}

/** Document type codes accepted by the `KycDocType` Prisma enum. */
type KycDocTypeName = "NIDA" | "NIDA_FRONT" | "NIDA_BACK" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | "SELFIE";

/**
 * Build the `KycDocument` rows for a submission.
 *
 * Extracted from `db.kyc.upsert` so the read→write round trip can be tested
 * directly: `toStoredKyc` feeds this, and this feeds the table those rows came
 * from, so any field either half drops shows up as a lossy round trip rather
 * than as silently wrong data in a compliance export.
 *
 * Precedence for the two byte-facts, strongest evidence first:
 *   1. the storageKey itself, when it is an inline data URL — the bytes ARE
 *      right there, so measuring beats any stored column;
 *   2. `mimeType`/`sizeBytes` carried on the StoredKyc — magic-byte sniffed by
 *      `validateDocImage` at upload. This is the ONLY evidence for an
 *      `r2:<key>`, whose bytes live in a bucket and cannot be measured here;
 *   3. `application/octet-stream` / `0` — the honest "we do not know".
 */
export function toKycDocumentRows(
  submissionId: string,
  documents: StoredKyc["documents"],
): { submissionId: string; docType: KycDocTypeName; storageKey: string; mimeType: string; sizeBytes: number; uploadedAt: Date }[] {
  return documents.map((d) => {
    const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(d.storageKey ?? "");
    const b64 = m?.[2] ?? "";
    const derivedBytes = m
      ? Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0)
      : 0;
    return {
      submissionId,
      docType: d.docType as KycDocTypeName,
      storageKey: d.storageKey,
      // ⛔ A MEASUREMENT BEATS A COLUMN, AND A COLUMN BEATS A LABEL — in that order.
      //
      // For an INLINE document the bytes are right there, so both facts are MEASURED
      // fresh: the mime is magic-byte sniffed from the decoded head (`sniffBase64ImageMime`,
      // the same D2 instrument `validateDocImage` uses) and the size is counted from the
      // base64 itself. A stale or wrong stored column cannot survive when the truth is in
      // hand. For an `r2:<key>` the bytes live in a bucket and cannot be measured here, so
      // the stored column — sniffed by `validateDocImage` at upload — is the only evidence.
      //
      // `m?.[1]`, the mime **label** parsed back out of the data URL, is trusted NOWHERE:
      // it is the string the UPLOADER supplied, and D2 exists because a malicious file can
      // carry an image mime label past a naive check. Sniffing the actual bytes is what
      // keeps "measured wins" from re-opening that hole — an inline doc whose bytes are
      // not a supported image falls through to the stored column, never to the label.
      //
      // ⚠️ Do NOT write an image mime with a wildcard in this comment. `test:cert-d2` strips
      // comments with a naive regex, so the two characters that begin a block comment OPEN one
      // for the stripper and swallow the code below — the gate then reports this very line as
      // missing while it sits here correctly. Same shape as the `--m-*` trap in needle.css.
      mimeType: (m ? sniffBase64ImageMime(b64) : null) ?? d.mimeType ?? "application/octet-stream",
      // Inline → the measured count, always (base64 arithmetic, padding-corrected — the
      // same figure `validateDocImage` reports). R2 → the stored column, `??` and not `||`
      // so a genuine 0-byte reading survives; no evidence at all → the honest 0.
      sizeBytes: m ? derivedBytes : (d.sizeBytes ?? 0),
      uploadedAt: new Date(d.uploadedAt),
    };
  });
}

const OTP_SEP = "|";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredOtp(row: any): StoredOtp {
  // codeHash stores "hashedCode|salt" — see fromStoredOtp
  const parts = (row.codeHash as string).split(OTP_SEP);
  return {
    id: row.id,
    phoneE164: row.phoneE164 ?? null,
    email: row.email ?? null,
    hashedCode: parts[0],
    salt: parts[1] ?? "",
    purpose: row.purpose as StoredOtp["purpose"],
    attempts: row.attempts,
    consumedAt: iso(row.consumedAt),
    expiresAt: iso(row.expiresAt)!,
    createdAt: iso(row.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredWallet(w: any): StoredWallet {
  return {
    id: w.id,
    userId: w.userId,
    balance: num(w.balance),
    pending: num(w.pending),
    hold: num(w.hold),
    bonusBalance: num(w.bonusBalance),
    currency: "TZS",
    status: w.status,
    freezeReasons: Array.isArray(w.freezeReasons) ? [...w.freezeReasons] : [],
    createdAt: iso(w.createdAt)!,
    updatedAt: iso(w.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredBonusGrant(g: any): StoredBonusGrant {
  return {
    id: g.id,
    userId: g.userId,
    walletId: g.walletId,
    amountTzs: num(g.amountTzs),
    remainingTzs: num(g.remainingTzs),
    wagerMultiplier: num(g.wagerMultiplier),
    wagerRequiredTzs: num(g.wagerRequiredTzs),
    wageredTzs: num(g.wageredTzs),
    source: g.source,
    sourceRef: g.sourceRef ?? null,
    status: g.status,
    expiresAt: iso(g.expiresAt),
    fulfilledAt: iso(g.fulfilledAt),
    note: g.note ?? null,
    createdAt: iso(g.createdAt)!,
    updatedAt: iso(g.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredTxn(t: any): StoredTxn {
  return {
    id: t.id,
    walletId: t.walletId,
    userId: t.userId,
    type: t.type,
    status: t.status,
    amount: num(t.amount),
    fee: num(t.fee),
    taxWithheld: num(t.taxWithheld),
    balanceAfter: numOrNull(t.balanceAfter),
    currency: "TZS",
    provider: t.provider ?? null,
    providerRef: t.providerRef,
    providerStatus: t.providerStatus ?? null,
    payoutRail: t.payoutRail ?? null,
    msisdn: t.msisdn,
    description: t.description,
    positionId: t.positionId,
    amlReason: t.amlReason,
    createdAt: iso(t.createdAt)!,
    updatedAt: iso(t.updatedAt)!,
    completedAt: iso(t.completedAt),
    idempotencyKey: t.idempotencyKey ?? null,
    pendingNotifiedAt: iso(t.pendingNotifiedAt),
    houseBotId: t.houseBotId ?? null,
    origin: t.origin ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredRG(r: any): StoredResponsibleGambling {
  return {
    userId: r.userId,
    dailyDepositLimit: numOrNull(r.dailyDepositLimit),
    weeklyDepositLimit: numOrNull(r.weeklyDepositLimit),
    monthlyDepositLimit: numOrNull(r.monthlyDepositLimit),
    dailyLossLimit: numOrNull(r.dailyLossLimit),
    sessionTimeLimitMin: r.sessionTimeLimitMin,
    realityCheckIntervalMin: r.realityCheckIntervalMin,
    selfExclusionUntil: iso(r.selfExclusionUntil),
    coolingOffUntil: iso(r.coolingOffUntil),
    selfExclusionStartedAt: iso(r.selfExclusionStartedAt),
    coolingOffStartedAt: iso(r.coolingOffStartedAt),
    pendingIncreaseTo: numOrNull(r.pendingIncreaseTo),
    pendingIncreaseEffectiveAt: iso(r.pendingIncreaseEffectiveAt),
    pendingWeeklyIncreaseTo: numOrNull(r.pendingWeeklyIncreaseTo),
    pendingWeeklyIncreaseEffectiveAt: iso(r.pendingWeeklyIncreaseEffectiveAt),
    pendingMonthlyIncreaseTo: numOrNull(r.pendingMonthlyIncreaseTo),
    pendingMonthlyIncreaseEffectiveAt: iso(r.pendingMonthlyIncreaseEffectiveAt),
    pendingLossLimitTo: numOrNull(r.pendingLossLimitTo),
    pendingLossLimitEffectiveAt: iso(r.pendingLossLimitEffectiveAt),
    pendingSessionLimitTo: r.pendingSessionLimitTo ?? null,
    pendingSessionLimitEffectiveAt: iso(r.pendingSessionLimitEffectiveAt),
    playStartedAt: iso(r.playStartedAt),
    playLastSeenAt: iso(r.playLastSeenAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredNotification(n: any): StoredNotification {
  return {
    id: n.id,
    userId: n.userId,
    kind: n.kind ?? "BET_PLACED",
    titleEn: n.titleEn ?? "",
    titleSw: n.titleSw ?? "",
    titleZh: n.titleZh ?? null,
    bodyEn: n.bodyEn,
    bodySw: n.bodySw,
    bodyZh: n.bodyZh ?? null,
    href: n.href,
    readAt: iso(n.readAt),
    dismissedAt: iso(n.dismissedAt),
    createdAt: iso(n.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredSOF(s: any): StoredSourceOfFunds {
  return {
    userId: s.userId,
    declaredSource: s.declaredSource as StoredSourceOfFunds["declaredSource"],
    declaredOccupation: s.declaredOccupation,
    declaredEmployer: s.declaredEmployer,
    declaredAnnualIncomeBand: s.declaredAnnualIncomeBand as StoredSourceOfFunds["declaredAnnualIncomeBand"],
    declaredOther: s.declaredOther,
    reviewStatus: s.reviewStatus as StoredSourceOfFunds["reviewStatus"],
    reviewerId: s.reviewerId,
    reviewedAt: iso(s.reviewedAt),
    submittedAt: iso(s.submittedAt)!,
  };
}

/**
 * 🔴 THE READ HALF OF THE SILENT NO-OP.
 *
 * This mapper used to return SIX fields while the table had ten, and an unmapped column is
 * dropped on READ as surely as an unwhitelisted one is dropped on WRITE. So a rate an officer
 * set, an approval, a deactivation — all could be written perfectly and then simply not exist
 * as far as the application was concerned, in production only. The memory DAL spreads whole
 * objects (`{ ...a, ...patch }`), so every in-memory suite was green throughout.
 *
 * ⛔ THE COLUMN NAMES DIVERGE, AND THAT IS THE TRAP THAT MADE IT INVISIBLE. Prisma's
 * `totalRecruits` / `totalCommission` are the Stored shape's `recruitCount` / `totalEarnedTzs`.
 * A reader comparing the two files by eye sees two names that do not match and moves on.
 *
 * ⭐ `scripts/dal-parity.test.mts` now asserts, at SOURCE level with no database, that every
 * key of `StoredAffiliateAccount` is named in this function AND in `create` AND in `update`.
 * Deleting any one mapping turns it red.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAffiliate(a: any): StoredAffiliateAccount {
  return {
    userId: a.userId,
    code: a.code,
    recruitCount: a.totalRecruits ?? 0,
    totalEarnedTzs: num(a.totalCommission),
    // ⭐ `approvedAt` is the ONE discriminator between a vetted agent and the row every
    // player is auto-minted. Dropping it here would make every agent invisible.
    approvedAt: iso(a.approvedAt),
    approvedBy: a.approvedBy ?? null,
    active: a.active ?? true,
    deactivatedAt: iso(a.deactivatedAt),
    // ⚠️ Prisma returns Decimal, not number. `num()` is the same coercion the money columns
    // use; a raw Decimal reaching the arithmetic would be `NaN`-by-string-concatenation.
    // NULL stays NULL — it means "no officer has priced this partner" and the agent branch
    // REFUSES on it. ⛔ Never coalesce it to a number here.
    commissionPct: a.commissionPct === null || a.commissionPct === undefined ? null : num(a.commissionPct),
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt ?? a.createdAt)!,
  };
}

/**
 * ⭐ THE WRITE MAP — `Stored` field → Prisma column, exhaustive BY TYPE.
 *
 * `Record<keyof StoredAffiliateAccount, …>` means adding a field to the Stored shape without
 * a line here is a COMPILE ERROR. That is deliberately stronger than a test: the previous
 * mechanism was a hand-maintained `if (patch.x !== undefined)` chain, and a hand-maintained
 * list is exactly what failed — three of the table's columns were writable and the rest were
 * silently discarded in production while the memory DAL accepted them all.
 *
 * `null` means "deliberately not writable through `update`": the primary key, and the two
 * timestamps the database owns.
 */
const AFFILIATE_COLUMN: Record<
  keyof StoredAffiliateAccount,
  { col: string; kind: "plain" | "date" } | null
> = {
  userId: null,          // the key — `where`, never `data`
  createdAt: null,       // set once, at create
  updatedAt: null,       // @updatedAt — Prisma owns it
  code: { col: "code", kind: "plain" },
  recruitCount: { col: "totalRecruits", kind: "plain" },
  totalEarnedTzs: { col: "totalCommission", kind: "plain" },
  commissionPct: { col: "commissionPct", kind: "plain" },
  active: { col: "active", kind: "plain" },
  approvedAt: { col: "approvedAt", kind: "date" },
  approvedBy: { col: "approvedBy", kind: "plain" },
  deactivatedAt: { col: "deactivatedAt", kind: "date" },
};

// ── AGENT APPLICATION MAPPERS ───────────────────────────────────────────────
// Prisma column names match the Stored field names one-for-one here (unlike
// `AffiliateAgent`, whose divergent names are what hid its dropped columns), so the
// write map only has to say which fields are DATES and which are not writable.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAgentApplication(a: any): StoredAgentApplication {
  return {
    id: a.id,
    userId: a.userId,
    status: a.status,
    source: a.source,
    refereeOneName: a.refereeOneName ?? null,
    refereeOneContact: a.refereeOneContact ?? null,
    refereeTwoName: a.refereeTwoName ?? null,
    refereeTwoContact: a.refereeTwoContact ?? null,
    refereeConsentAt: iso(a.refereeConsentAt),
    // ⚠️ Decimal → number on every money column. A raw Prisma Decimal reaching a
    // comparison reads as an object and `100000 === Decimal(100000)` is false — which on
    // this path means a correct fee attested against itself would fail reconciliation.
    feeAmountTzs: a.feeAmountTzs === null || a.feeAmountTzs === undefined ? null : num(a.feeAmountTzs),
    feeAttestedTzs: a.feeAttestedTzs === null || a.feeAttestedTzs === undefined ? null : num(a.feeAttestedTzs),
    feeFundingSource: a.feeFundingSource ?? null,
    feeReference: a.feeReference ?? null,
    feeStatementRef: a.feeStatementRef ?? null,
    feeReconciledAt: iso(a.feeReconciledAt),
    feeReconciledById: a.feeReconciledById ?? null,
    feeSourceAccount: a.feeSourceAccount ?? null,
    feeWaivedAt: iso(a.feeWaivedAt),
    feeWaivedById: a.feeWaivedById ?? null,
    feeWaiverReason: a.feeWaiverReason ?? null,
    feeDisposition: a.feeDisposition,
    feeRefundDueAt: iso(a.feeRefundDueAt),
    feeRefundedAt: iso(a.feeRefundedAt),
    feeRefundedById: a.feeRefundedById ?? null,
    feeRefundReference: a.feeRefundReference ?? null,
    feeRefundAmountTzs: a.feeRefundAmountTzs === null || a.feeRefundAmountTzs === undefined ? null : num(a.feeRefundAmountTzs),
    reviewerId: a.reviewerId ?? null,
    reviewedAt: iso(a.reviewedAt),
    rejectReason: a.rejectReason ?? null,
    rejectNote: a.rejectNote ?? null,
    infoRequestNote: a.infoRequestNote ?? null,
    infoRequestedAt: iso(a.infoRequestedAt),
    approvedRatePct: a.approvedRatePct === null || a.approvedRatePct === undefined ? null : num(a.approvedRatePct),
    agentCode: a.agentCode ?? null,
    acceptedTermsVersion: a.acceptedTermsVersion ?? null,
    acceptedTermsAt: iso(a.acceptedTermsAt),
    submittedAt: iso(a.submittedAt),
    expiresAt: iso(a.expiresAt),
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt ?? a.createdAt)!,
  };
}

/** `"date"` = needs `new Date()`. `null` = not writable through `update`. */
const AGENT_APPLICATION_COLUMN: Record<keyof StoredAgentApplication, "date" | "plain" | null> = {
  id: null,
  userId: null,
  createdAt: null,
  updatedAt: null,
  status: "plain",
  source: "plain",
  refereeOneName: "plain",
  refereeOneContact: "plain",
  refereeTwoName: "plain",
  refereeTwoContact: "plain",
  refereeConsentAt: "date",
  feeAmountTzs: "plain",
  feeAttestedTzs: "plain",
  feeFundingSource: "plain",
  feeReference: "plain",
  feeStatementRef: "plain",
  feeReconciledAt: "date",
  feeReconciledById: "plain",
  feeSourceAccount: "plain",
  feeWaivedAt: "date",
  feeWaivedById: "plain",
  feeWaiverReason: "plain",
  feeDisposition: "plain",
  feeRefundDueAt: "date",
  feeRefundedAt: "date",
  feeRefundedById: "plain",
  feeRefundReference: "plain",
  feeRefundAmountTzs: "plain",
  reviewerId: "plain",
  reviewedAt: "date",
  rejectReason: "plain",
  rejectNote: "plain",
  infoRequestNote: "plain",
  infoRequestedAt: "date",
  approvedRatePct: "plain",
  agentCode: "plain",
  acceptedTermsVersion: "plain",
  acceptedTermsAt: "date",
  submittedAt: "date",
  expiresAt: "date",
};

/** Build the full `create` payload, converting every date field exactly once. */
function agentApplicationCreateData(a: StoredAgentApplication) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { id: a.id, userId: a.userId, createdAt: new Date(a.createdAt) };
  for (const [k, kind] of Object.entries(AGENT_APPLICATION_COLUMN)) {
    if (kind === null) continue;
    const v = (a as unknown as Record<string, unknown>)[k];
    data[k] = kind === "date" ? (v ? new Date(v as string) : null) : v;
  }
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAgentDoc(d: any): StoredAgentApplicationDocument {
  return {
    id: d.id,
    applicationId: d.applicationId,
    docType: d.docType,
    storageKey: d.storageKey,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    suppliedById: d.suppliedById,
    uploadedAt: iso(d.uploadedAt)!,
    rejected: d.rejected ?? false,
    rejectReason: d.rejectReason ?? null,
    thirdParty: d.thirdParty ?? false,
    purgedAt: iso(d.purgedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAgentInvitation(i: any): StoredAgentInvitation {
  return {
    id: i.id,
    applicationId: i.applicationId ?? null,
    // ⛔ NEITHER IS COALESCED TO A STRING. Exactly one is set, and `invitationChannel()`
    // decides which by reading for null — an empty string here would make an email
    // invitation look like a phone one and send the acceptance check down the wrong branch.
    phoneE164: i.phoneE164 ?? null,
    email: i.email ?? null,
    displayName: i.displayName ?? null,
    tokenHash: i.tokenHash,
    status: i.status,
    issuedById: i.issuedById,
    issuedAt: iso(i.issuedAt)!,
    expiresAt: iso(i.expiresAt)!,
    acceptedAt: iso(i.acceptedAt),
    acceptedUserId: i.acceptedUserId ?? null,
    declinedAt: iso(i.declinedAt),
    revokedAt: iso(i.revokedAt),
    revokedById: i.revokedById ?? null,
    createdAt: iso(i.createdAt)!,
    updatedAt: iso(i.updatedAt ?? i.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredReward(r: any): StoredReferralReward {
  return {
    id: r.id,
    referrerUserId: r.referrerUserId,
    recruitUserId: r.recruitUserId,
    type: r.type,
    label: r.label,
    amountTzs: num(r.amountTzs),
    // ⚠️ NULL IS MEANINGFUL AND MUST SURVIVE THE MAP. A pre-2026-09-08 row has no gross
    // recorded, and the per-recruit cap reads `grossAmountTzs ?? amountTzs` to stay correct
    // over that history — coalescing either of these to 0 here would silently zero every
    // capped agent's historical spend and re-open a budget that was already used.
    grossAmountTzs: r.grossAmountTzs === null || r.grossAmountTzs === undefined ? null : num(r.grossAmountTzs),
    taxWithheldTzs: r.taxWithheldTzs === null || r.taxWithheldTzs === undefined ? null : num(r.taxWithheldTzs),
    status: r.status,
    recipientUserId: r.recipientUserId,
    note: r.note,
    // ⛔ `programme` is the column that separates agent spend from promo cost in the owner's
    // book and the regulator pack. Unmapped here it would be written by the memory DAL,
    // defaulted by Prisma, and read back as NULL — the single most consequential field on
    // this row to get wrong, on the ledger the Gaming Board reads.
    programme: r.programme ?? null,
    rateApplied: r.rateApplied === null || r.rateApplied === undefined ? null : num(r.rateApplied),
    marketId: r.marketId ?? null,
    sourceRef: r.sourceRef ?? null,
    reversedAt: iso(r.reversedAt),
    reversedReason: r.reversedReason ?? null,
    createdAt: iso(r.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredObjection(o: any): StoredObjection {
  return {
    id: o.id,
    marketId: o.marketId,
    userId: o.userId,
    reason: o.reason as StoredObjection["reason"],
    detail: o.detail,
    status: o.status as StoredObjection["status"],
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    reviewedBy: o.reviewedBy ?? null,
    reviewedAt: o.reviewedAt ? new Date(o.reviewedAt).toISOString() : null,
    reviewNote: o.reviewNote ?? null,
    remedy: (o.remedy ?? null) as StoredObjection["remedy"],
    outcomeAtFiling: o.outcomeAtFiling ?? null,
  };
}

function toStoredProposal(p: any): StoredProposal {
  return {
    id: p.id,
    proposerId: p.proposerId,
    titleEn: p.titleEn,
    titleSw: p.titleSw,
    titleZh: p.titleZh ?? null,
    description: p.description,
    resolutionCriterion: p.resolutionCriterion,
    category: p.category as StoredProposal["category"],
    resolutionDate: p.resolutionDate,
    selectionCloseDate: p.selectionCloseDate ?? null,
    sourceUrl: p.sourceUrl ?? null,
    status: p.status,
    up: p.up,
    down: p.down,
    publishedMarketId: p.publishedMarketId,
    bonusGrantedTzs: num(p.bonusGrantedTzs),
    bonusGrantId: p.bonusGrantId ?? null,
    approvedAt: iso(p.approvedAt),
    declineReason: p.declineReason,
    declineNote: p.declineNote,
    changeNote: p.changeNote,
    reviewedBy: p.reviewedBy,
    reviewedAt: iso(p.reviewedAt),
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredEvent(r: any): StoredEvent {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    startsAt: iso(r.startsAt)!,
    sourceUrl: r.sourceUrl,
    note: r.note ?? null,
    generatedAt: iso(r.generatedAt) ?? null,
    aiPollId: r.aiPollId ?? null,
    addedBy: r.addedBy,
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

function toStoredVote(v: any): StoredProposalVote {
  return {
    id: v.id,
    proposalId: v.proposalId,
    userId: v.userId,
    dir: (v.dir as string).toLowerCase() as "up" | "down",
    createdAt: iso(v.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredInviteCampaign(c: any): StoredInviteCampaign {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    bonusAmountTzs: num(c.bonusAmountTzs),
    wagerMultiplier: num(c.wagerMultiplier),
    expiresInDays: num(c.expiresInDays),
    messageEn: c.messageEn,
    messageSw: c.messageSw,
    status: c.status,
    totalInvites: num(c.totalInvites),
    totalRegistered: num(c.totalRegistered),
    createdById: c.createdById,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredInviteEntry(e: any): StoredInviteEntry {
  return {
    id: e.id,
    campaignId: e.campaignId,
    contactType: e.contactType,
    contactValue: e.contactValue,
    bonusAmountTzs: num(e.bonusAmountTzs),
    status: e.status,
    sentAt: iso(e.sentAt),
    registeredUserId: e.registeredUserId ?? null,
    bonusGrantId: e.bonusGrantId ?? null,
    failureReason: e.failureReason ?? null,
    createdAt: iso(e.createdAt)!,
  };
}

// ---------------------------------------------------------------------------
// The Prisma DAL — same shape as the in-memory `db` from store.ts
// ---------------------------------------------------------------------------

export const prismaDb = {
  // ── USER ──────────────────────────────────────────────────────────────────
  user: {
    findById: async (id: string): Promise<StoredUser | null> => {
      const u = await pc().user.findUnique({ where: { id } });
      return u ? toStoredUser(u) : null;
    },
    findByPhone: async (phone: string): Promise<StoredUser | null> => {
      const u = await pc().user.findUnique({ where: { phoneE164: phone } });
      return u ? toStoredUser(u) : null;
    },
    findByEmail: async (email: string): Promise<StoredUser | null> => {
      const norm = email.trim().toLowerCase();
      if (!norm) return null;
      // CASE-INSENSITIVE, and that is load-bearing on Postgres.
      //
      // This was an exact match against a lower-cased needle. Postgres compares
      // text case-sensitively, so any stored address carrying an uppercase
      // character (an admin-set address, a PHONE_EMAIL_MAP entry, anything
      // written before normalisation) became invisible to this lookup. Two
      // real consequences, both money-facing:
      //   1. that player could never sign in with their email again, and
      //   2. the one-account-per-email guard — which is enforced HERE, in app
      //      code, because there is no DB unique index — could be walked
      //      straight past with different casing. One inbox could then open
      //      unlimited accounts, which makes the email gate (on depositing until
      //      2026-10-07, on withdrawing since) decorative and per-account RG limits /
      //      self-exclusion evadable.
      // The in-memory Map lower-cases on the way in, so this only ever bit on
      // real Postgres — i.e. only in production.
      // (`email @unique` is deliberately absent: adding the index to the live
      // money DB could fail `migrate deploy` and take prod down if a duplicate
      // already exists. It is a follow-up once prod is confirmed clean.)
      const u = await pc().user.findFirst({ where: { email: { equals: norm, mode: "insensitive" } } });
      return u ? toStoredUser(u) : null;
    },
    /**
     * EVERY account on an address, oldest first — because `findByEmail` above
     * cannot tell "the account" from "an account".
     *
     * `email` has no unique index (see the note above), so an address CAN hold
     * several accounts, and production does: four on one address. A caller that
     * needs to identify a specific user — sign-in — must see the whole set and
     * disambiguate deliberately, not accept whichever row the heap offered.
     * Ordered so the set is stable between calls; capped because the only
     * caller runs on an unauthenticated endpoint and does password work per row.
     */
    /** E-409 · see the in-memory twin in store.ts. ⛔ Both OR arms are non-empty (an empty `{}` in an OR matches every row). */
    expireMarketingConsent: async (beforeIso: string): Promise<string[]> => {
      const before = new Date(beforeIso);
      const where = { marketingOptIn: true, OR: [{ lastLoginAt: { lt: before } }, { lastLoginAt: null, createdAt: { lt: before } }] };
      const rows = await pc().user.findMany({ where, select: { id: true } });
      if (rows.length === 0) return [];
      await pc().user.updateMany({ where: { ...where, id: { in: rows.map((r) => r.id) } }, data: { marketingOptIn: false } });
      return rows.map((r) => r.id);
    },
    findAllByEmail: async (email: string, cap = 5): Promise<StoredUser[]> => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      const rows = await pc().user.findMany({
        where: { email: { equals: norm, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
        take: cap,
      });
      return rows.map(toStoredUser);
    },
    create: async (u: StoredUser): Promise<StoredUser> => {
      const row = await pc().user.create({
        data: {
          id: u.id,
          phoneE164: u.phoneE164,
          passwordHash: u.passwordHash,
          passwordSalt: u.passwordSalt,
          failedLoginCount: u.failedLoginCount,
          lockedUntil: u.lockedUntil ? new Date(u.lockedUntil) : null,
          role: u.role,
          status: u.status,
          email: u.email ?? null,
          emailVerifiedAt: u.emailVerifiedAt ? new Date(u.emailVerifiedAt) : null,
          locale: u.locale,
          displayName: u.displayName,
          dob: u.dob ? new Date(u.dob) : null,
          region: u.region,
          acceptedTermsVersion: u.acceptedTermsVersion,
          acceptedTermsAt: u.acceptedTermsAt ? new Date(u.acceptedTermsAt) : null,
          marketingOptIn: u.marketingOptIn,
          twoFactorEnabled: u.twoFactorEnabled,
          avatarDataUrl: u.avatarDataUrl,
          createdAt: new Date(u.createdAt),
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
          closedAt: u.closedAt ? new Date(u.closedAt) : null,
          recruitedBy: u.recruitedBy ?? null,
          recruitedProgramme: u.recruitedProgramme ?? null,
          recruitedAt: u.recruitedAt ? new Date(u.recruitedAt) : null,
          recruitedByCode: u.recruitedByCode ?? null,
          passwordSetAt: u.passwordSetAt ? new Date(u.passwordSetAt) : null,
          passwordSetVia: u.passwordSetVia ?? null,
          emailSetByOfficerAt: u.emailSetByOfficerAt ? new Date(u.emailSetByOfficerAt) : null,
        },
      });
      return toStoredUser(row);
    },
    update: async (id: string, patch: Partial<StoredUser>): Promise<StoredUser | null> => {
      const exists = await pc().user.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      // Convert date strings to Date objects for Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      // ⚠️ `recruitedAt` BELONGS HERE, and forgetting it is a silent defect rather than a
      // loud one: this loop passes anything not listed straight through, so an ISO STRING
      // would reach a Prisma DateTime column and throw at runtime on Postgres only — with
      // every memory-backed suite green. The bind writes it in the same update as
      // `recruitedBy`, so it is on the hot path for every recruited registration.
      // House bots (04 A4): the two password-history times are PREPENDED, so the list's tail
      // stays the text `red:dal-parity` anchors on.
      const dateFields = ["passwordSetAt", "emailSetByOfficerAt", "lockedUntil", "dob", "acceptedTermsAt", "lastLoginAt", "closedAt", "emailVerifiedAt", "recruitedAt"] as const;
      for (const [k, v] of Object.entries(patch)) {
        if (k === "updatedAt") continue; // Prisma handles @updatedAt
        if (dateFields.includes(k as (typeof dateFields)[number])) {
          data[k] = v ? new Date(v as string) : null;
        } else {
          data[k] = v;
        }
      }
      const row = await pc().user.update({ where: { id }, data });
      return toStoredUser(row);
    },
    /**
     * 🔴 EVERY USER ROW, WITHOUT THE AVATARS (audit F-11c).
     *
     * ⛔ WHY `omit` AND NOT A `select`. A select is an allowlist, and on a table that gains
     * columns that is the wrong failure mode here: a new column would be silently MISSING from
     * every one of the nineteen call sites below. `omit` names the one column being left out, so
     * a new column arrives included — the boring failure.
     *
     * ── THE SCALE ARGUMENT, WITH TODAY'S MEASUREMENT ─────────────────────────
     * Measured on production 2026-08-21: **1 of 100 users has an avatar, 39 kB.** So this saves
     * 39 kB today and the finding is about shape, not cost — exactly as the audit said. But
     * `avatarDataUrl` is capped at 96 kB per row and this method is called by `analytics.ts`,
     * `insights.ts`, `reports/catalogue.ts`, `responsible-gambling.ts`, `kyc-service.ts`,
     * `affiliate-service.ts` and six admin pages. At 10,000 users with a third of them uploading
     * one, a single admin page render pulls ~320 MB out of Postgres. That is not a slow page,
     * that is a connection pool on fire — the shape that already took `/leaderboard` down once.
     *
     * ── ⚠️ AND THE PART THAT COULD HAVE BEEN A SILENT LIE ────────────────────
     * A row read this way reports `avatarDataUrl: null`, which is INDISTINGUISHABLE from "this
     * player has no avatar". If a caller ever rendered it, one player's picture would quietly
     * disappear and nothing would fail. Measured before doing this: only THREE sites read the
     * field at all — `/profile` and `app-shell` (both `findById`, both untouched) and
     * `/profile/actions` (a write). `test:erasure` §11.14 asserts that stays true, so the
     * silent-lie risk is a build failure rather than a bug report.
     */
    list: async (): Promise<StoredUser[]> => {
      const rows = await pc().user.findMany({ omit: { avatarDataUrl: true } });
      return rows.map((r) => toStoredUser({ ...r, avatarDataUrl: null }));
    },
    /** COUNT(*) — no rows materialised (audit H4/M5). */
    count: async (): Promise<number> => pc().user.count(),
    /** Users holding any of `roles` — indexed on role; avoids the full-scan
     *  list().filter() officer lookups (audit M5). */
    listByRoles: async (roles: string[], select?: { id: true; email?: true }): Promise<StoredUser[]> => {
      void select; // return full rows so callers keep the StoredUser shape
      const rows = await pc().user.findMany({ where: { role: { in: roles as never } } });
      return rows.map(toStoredUser);
    },
    /** Batched lookup — one query instead of an N+1 loop. Avatars omitted (audit F-11c). */
    findByIds: async (ids: string[]): Promise<StoredUser[]> => {
      const unique = Array.from(new Set(ids));
      if (unique.length === 0) return [];
      const rows = await pc().user.findMany({ where: { id: { in: unique } }, omit: { avatarDataUrl: true } });
      return rows.map((r) => toStoredUser({ ...r, avatarDataUrl: null }));
    },
    /** §25 · the accounts behind a set of numbers — `findByPhone` asked of a set, ONE query on the unique `phoneE164`.
     *  ⛔ The avatar is OMITTED (audit F-11c): up to 96 kB a row, and a 1,000-number chunk would otherwise drag ~96 MB
     *  out of Postgres for a column the gate never reads. Reported null, as the memory twin reports it. */
    findByPhones: async (phones: string[]): Promise<StoredUser[]> => {
      const keys = bulkKeys(phones, "user.findByPhones");
      if (keys.length === 0) return [];
      const rows = await pc().user.findMany({ where: { phoneE164: { in: keys } }, omit: { avatarDataUrl: true }, orderBy: { phoneE164: "asc" } });
      return rows.map((r) => toStoredUser({ ...r, avatarDataUrl: null }));
    },
    /** U38a · THE PLAYER ARM'S KEYSET WALK — `id > cursor`, ordered by the same column, so the walk is self-consistent
     *  while accounts are created between calls. ⛔ Never `skip`. ⛔ KEY-ONLY: a `select` of the id and the number. An
     *  EMPTY prefix list is an empty OR, which Prisma answers with nothing — never "every prefix". One extra row is read
     *  to know whether the walk is finished. */
    playerWalk: async (q: PlayerWalkQuery): Promise<PlayerWalk> => {
      // ⛔ AN EMPTY PREFIX LIST IS NOTHING, NEVER "NO CONSTRAINT" — answered here, before any query: Prisma reads a
      // nested `OR: []` as no condition at all (bulk-reads-pg-probe 7 measured every player coming back for []).
      if (q.ndcs !== null && q.ndcs.length === 0) return { rows: [], nextAfterId: null };
      const and: Prisma.UserWhereInput[] = [{ role: "PLAYER" }, { phoneE164: { startsWith: "+255" } }];
      if (q.ndcs !== null) and.push({ OR: q.ndcs.map((n) => ({ phoneE164: { startsWith: `+255${n}` } })) });
      if (q.createdFrom !== null) and.push({ createdAt: { gte: new Date(q.createdFrom) } });
      if (q.createdBefore !== null) and.push({ createdAt: { lt: new Date(q.createdBefore) } });
      if (q.afterId !== null) and.push({ id: { gt: q.afterId } });
      const rows = await pc().user.findMany({
        where: { AND: and },
        select: { id: true, phoneE164: true },
        orderBy: { id: "asc" }, take: q.limit + 1,
      });
      const more = rows.length > q.limit;
      const shown = more ? rows.slice(0, q.limit) : rows;
      const last = shown[shown.length - 1];
      return { rows: shown.map((r) => ({ id: r.id, phoneE164: r.phoneE164 })), nextAfterId: more && last ? last.id : null };
    },
    /** Indexed on `recruitedBy` (migration 20260907120100). Newest first. */
    listByRecruiter: async (referrerUserId: string): Promise<StoredUser[]> => {
      const rows = await pc().user.findMany({
        where: { recruitedBy: referrerUserId },
        orderBy: { createdAt: "desc" },
        omit: { avatarDataUrl: true },
      });
      return rows.map((r) => toStoredUser({ ...r, avatarDataUrl: null }));
    },
    /** COUNT(*) WHERE recruitedBy IS NOT NULL — no rows materialised. */
    countRecruited: async (): Promise<number> => pc().user.count({ where: { recruitedBy: { not: null } } }),
  },

  // ── KYC ───────────────────────────────────────────────────────────────────
  kyc: {
    findByUserId: async (userId: string): Promise<StoredKyc | null> => {
      const row = await pc().kycSubmission.findFirst({
        where: { userId },
        include: { documents: true },
        // ⭐ `id` desc ADDED 2026-09-11, and it is a coherence fix, not a tidy-up.
        // `createdAt` is TIMESTAMP(3) and there is no `@@unique([userId])`, so two
        // race-born submissions can share a millisecond — at which point this read
        // broke the tie ARBITRARILY while `listStageFacts` below breaks it by `id`.
        // On such a tie /admin/players and /admin/players/[id] would have shown
        // DIFFERENT identity states for one person: exactly the class of defect the
        // roster stage tag exists to remove. Both reads now order the same way.
        // ⚠️ This read is on all three login paths and the money gate; making a
        // previously-UNDEFINED order deterministic is the safe direction.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return row ? toStoredKyc(row) : null;
    },
    upsert: async (k: StoredKyc): Promise<StoredKyc> => {
      const data = {
        userId: k.userId,
        status: k.status as "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED",
        rejectReason: k.rejectReason as null,
        rejectNote: k.rejectNote,
        idType: (k.idType ?? null) as "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | null,
        idNumber: k.idNumber ?? null,
        // Stored at UTC midnight so the day on the document is the day in the
        // column, whatever zone the reader is in.
        idExpiry: k.idExpiry ? new Date(`${k.idExpiry.slice(0, 10)}T00:00:00.000Z`) : null,
        idVerifiedAt: k.idVerifiedAt ? new Date(k.idVerifiedAt) : null,
        idFingerprint: k.idFingerprint ?? null,
        fullName: k.fullName,
        dob: k.dob ? new Date(k.dob) : null,
        reviewerId: k.reviewerId,
        reviewedAt: k.reviewedAt ? new Date(k.reviewedAt) : null,
        submittedAt: k.submittedAt ? new Date(k.submittedAt) : null,
        // ⛔ WRITE HALF of the round trip above. Never derive this from `status`:
        // the whole point of the column is that it outlives an APPROVED status.
        approvedAt: k.approvedAt ? new Date(k.approvedAt) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extraRequests: (k.extraRequests ?? []) as any,
      };
      const row = await pc().kycSubmission.upsert({
        where: { id: k.id },
        create: { id: k.id, ...data },
        update: data,
        include: { documents: true },
      });
      // Sync documents: delete existing, re-create from StoredKyc.
      //
      // 🔴 THIS IS THREE CASES, NOT TWO — AND THE MISSING ONE WAS A LIVE DEFECT
      // (fixed 2026-09-11). The guard used to read `if (k.documents?.length)`:
      //
      //   undefined  → a caller that omitted the array (an older/partial record).
      //                Touch nothing. This is what the `?.` was always FOR, and it
      //                is still honoured — the degrade-don't-throw contract stands.
      //   []         → an EXPLICIT RESET. ⛔ THIS BRANCH DID NOT EXIST. `[]` is
      //                falsy on `.length`, so the delete never ran.
      //   [..> 0]    → replace.
      //
      // ⛔ WHY THE MISSING BRANCH MATTERED. `startKyc` (kyc-service.ts:107-137)
      // restarts a REJECTED / NOT_STARTED submission by rebuilding it with
      // `documents: []` — and it REUSES THE EXISTING ROW ID (`existing?.id ?? …`),
      // so the previous attempt's `KycDocument` rows stayed attached in Postgres.
      // The in-memory half replaces the object wholesale
      // (`store.ts` — `upsert: (k) => { store.kyc.set(k.id, k); … }`) and DID clear
      // them. So the two DAL halves disagreed about what a restart destroys, EVERY
      // unit suite ran on the half that was right, and production ran the half that
      // was wrong — which is why nothing ever went red.
      //
      // ⛔ IT WAS NOT COSMETIC. `submitForReview`'s `missingSlots` check
      // (kyc-service.ts:507-510) reads `k.documents`, so once the player re-entered
      // their identity the OLD, already-refused images satisfied the required slots
      // and the submission passed straight back to an officer as complete.
      // Reachable entirely from shipped code: APPROVED → `forceReverifyKyc` (:672)
      // → officer REJECT (:838) → the player taps "start again", which `startKyc`
      // permits because the status is REJECTED (:104).
      //
      // ⚠️ Erasure is unaffected: erasure.ts:303 calls `db.kyc.deleteDocuments`
      // explicitly before its own upsert, and this delete is idempotent over that.
      if (k.documents !== undefined) {
        // Atomic delete + re-create so a mid-sync failure can't leave the
        // submission with zero documents (the in-memory store is atomic here).
        await pc().$transaction([
          pc().kycDocument.deleteMany({ where: { submissionId: k.id } }),
          ...(k.documents.length
            ? [pc().kycDocument.createMany({ data: toKycDocumentRows(k.id, k.documents) })]
            : []),
        ]);
      }
      // Re-fetch with documents
      const full = await pc().kycSubmission.findUnique({
        where: { id: k.id },
        include: { documents: true },
      });
      return toStoredKyc(full ?? row);
    },
    // ⚠️ `findByNida` / `findActiveByNida` LIVED HERE UNTIL 2026-08-20, and were the
    // ONLY readers of the deprecated `nidaNumber` column anywhere in the platform —
    // which is why "read by nothing" was true of PRODUCT code and never of the store
    // layer, and why the guard that claimed to prove it had to exempt this file.
    // They had zero callers from the day `findActiveByIdNumber` below shipped.
    // ⛔ Deleted with the column. Do not reinstate a number-only duplicate read: it
    // refuses a passport for sharing digits with a NIDA, and it lets one human hold
    // two accounts on two different documents.
    /**
     * 🔴 ONE DOCUMENT, ONE ACCOUNT — across all four identity types.
     *
     * Indexed by `@@index([idType, idNumber])`, and deliberately a tiny `select` so
     * it never hydrates the base64 KYC images (audit H5: ~1.2 TB pulled per
     * submission at scale — the defect the deleted NIDA read was itself written to
     * fix, which is why the shape is worth keeping now that it is the only one).
     *
     * ⛔ This is the FAST PATH. The enforcement is the partial unique index
     * "KycSubmission_idType_idNumber_active_key"; the two must ask the same
     * question — the same pair, the same exclusion — or a race resolves differently
     * from a sequential duplicate. ⚠️ Since migration 20260913120000 that exclusion is
     * `status <> REJECTED OR rejectReason IN FINAL_REFUSAL_CODES`: a FINAL refusal keeps
     * the document number held (`test:cert-d1` §3c pins both halves).
     */
    findActiveByIdNumber: async (
      idType: string,
      idNumber: string,
      excludeUserId?: string,
    ): Promise<{ userId: string; status: string } | null> => {
      const norm = idNumber.trim();
      if (!norm || !idType) return null;
      const row = await pc().kycSubmission.findFirst({
        where: {
          idType: idType as "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD",
          idNumber: norm,
          // ⛔ EXACTLY the partial unique index's predicate (`20260913120000_kyc_at_withdrawal`):
          // not refused, OR refused on a FINAL code — which keeps the number reserved (S16).
          OR: [{ status: { not: "REJECTED" } }, { rejectReason: { in: [...FINAL_REFUSAL_CODES] } }],
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        select: { userId: true, status: true },
      });
      return row ? { userId: row.userId, status: String(row.status) } : null;
    },
    /**
     * 🔴 THE SAME CONTROL, ON THE VALUE THAT SURVIVES ERASURE — see the in-memory twin.
     *
     * Indexed by `@@index([idFingerprint])`, and the same tiny `select` as the tuple read
     * so it never hydrates a document (audit H5). ⛔ FAST PATH ONLY: the enforcement is
     * "KycSubmission_idFingerprint_active_key", and the two must ask the same question —
     * the same exclusion, since 20260913120000 `status <> REJECTED OR rejectReason IN
     * FINAL_REFUSAL_CODES` — or a race resolves differently from a sequential duplicate.
     */
    findActiveByFingerprint: async (
      fingerprint: string,
      excludeUserId?: string,
    ): Promise<{ userId: string; status: string } | null> => {
      const fp = fingerprint.trim();
      if (!fp) return null;
      const row = await pc().kycSubmission.findFirst({
        where: {
          idFingerprint: fp,
          // ⛔ EXACTLY the partial unique index's predicate (`20260913120000_kyc_at_withdrawal`):
          // not refused, OR refused on a FINAL code — which keeps the number reserved (S16).
          OR: [{ status: { not: "REJECTED" } }, { rejectReason: { in: [...FINAL_REFUSAL_CODES] } }],
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        select: { userId: true, status: true },
      });
      return row ? { userId: row.userId, status: String(row.status) } : null;
    },
    /**
     * EVERY submission this user has ever made, newest first.
     *
     * ⛔ NOT `findByUserId`, which returns the newest ONE. Erasure that reads the newest
     * leaves the number, name and date of birth on every earlier submission, and a
     * resubmission after a rejection is the ordinary case.
     */
    listByUser: async (userId: string): Promise<StoredKyc[]> => {
      const rows = await pc().kycSubmission.findMany({
        where: { userId },
        include: { documents: true },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredKyc);
    },
    /**
     * Drop every document row on a submission. Erasure only.
     *
     * ⛔ `upsert` CANNOT DO THIS — its document sync is guarded by `if (k.documents?.length)`,
     * so an empty array is a no-op rather than a delete. The R2 objects are destroyed
     * separately by `deleteKycDocument`; this removes the rows that point at them.
     */
    deleteDocuments: async (submissionId: string): Promise<number> => {
      const res = await pc().kycDocument.deleteMany({ where: { submissionId } });
      return res.count;
    },
    /**
     * The officer review queue, filtered IN THE DATABASE.
     *
     * ⛔ `list()` below is the unfiltered one and stays for the admin exports that genuinely
     * want everything. `listPendingKyc` used to call it and filter in JavaScript, which was
     * fine while KYC was optional and this table held 56 rows. From 2026-09-05 every
     * registered player had a submission, so that call became a full-table scan with a
     * documents join on every `/admin/approvals` render. ⚠️ Superseded 2026-09-13: a row now
     * exists only once a player opens `/profile/kyc` (identity is asked before withdrawal
     * only), but the filter STAYS — this queue is now a money queue, the officer standing
     * between players and balances they already hold (COMPLIANCE-DECISIONS 2026-09-13, S14).
     * ⚠️ `documents` is still joined: the queue shows a per-submission document COUNT.
     * Production runs `KYC_STORAGE=r2`, so a row carries a short `r2:<key>` reference and
     * not image bytes — but if inline storage is ever reinstated this join is where audit
     * H5's "~1.2 TB pulled per submission at scale" comes back, and it should become a
     * `_count` instead.
     */
    listByStatus: async (statuses: StoredKyc["status"][]): Promise<StoredKyc[]> => {
      const rows = await pc().kycSubmission.findMany({
        where: { status: { in: statuses as never } },
        include: { documents: true },
        orderBy: { submittedAt: "asc" }, // oldest first — FIFO, as the queue promises
      });
      return rows.map(toStoredKyc);
    },
    list: async (): Promise<StoredKyc[]> => {
      const rows = await pc().kycSubmission.findMany({ include: { documents: true } });
      return rows.map(toStoredKyc);
    },
    /**
     * THE ROSTER'S STAGE FEED — the NEWEST submission per user, scalars only, with
     * a live document count. Two statements, no join, no `include`.
     *
     * ⛔ NOT `list()` ABOVE. That is `findMany({ include: { documents: true } })`
     * with NO `where`, NO `select` and — the part that matters here — NO `orderBy`
     * at all. Keying a Map by `userId` off it makes the winner whatever order
     * Postgres happened to return, which is not stable between two renders of the
     * same page. It also drags every document row, and therefore every inline
     * base64 image, through a population read.
     *
     * ⛔ NO DENORMALISED `documentCount` COLUMN, AND THAT IS A RULING — the reasons
     * are on `StoredKycStageRow` in store.ts. The short form: `kyc.upsert` commits
     * the submission and its documents in TWO round trips, so a stored counter
     * would commit before the rows it counts; this repo's one existing counter over
     * a child table (`predictorCount`) drifted and could not be fully repaired; and
     * `test:dal-parity` does not cover `StoredKyc`, so a one-half counter would be
     * invisible to the guard written to catch exactly that. The count is derived on
     * every read, here, where it cannot drift.
     *
     * ⛔ SEQUENTIAL, SUBMISSIONS FIRST — NOT `Promise.all`, AND NOT
     * `$transaction([a, b])` (the array form is READ COMMITTED; each statement
     * still takes its own snapshot). The two reads are not one snapshot, and the
     * ORDER decides which way the skew can run. With the document read always the
     * NEWER observation, a first upload landing between them reads "uploaded" —
     * true at the later instant. Reversed, a `startKyc` reset landing between them
     * would leave a stale id in the count map and paint "Uploaded · not sent" over
     * an empty file: an over-claim, and the expensive direction, because an officer
     * then stops chasing a player who has given us nothing.
     *
     * ⭐ A USER CAN HAVE MORE THAN ONE ROW, AND THE TIE-BREAK IS NOT DECORATION.
     * There is no `@@unique([userId])`. `startKyc` is a read-then-write with nothing
     * behind it, rendered from a SERVER COMPONENT, so two tabs or a double-tapped
     * link to `/profile/kyc` both read null, both mint a cuid and both INSERT. Those
     * duplicates are race-born MILLISECONDS apart and can share a `createdAt`
     * (TIMESTAMP(3)), so `id` desc is what makes this page's pick REPRODUCIBLE
     * between renders — and equal to `findByUserId`'s, so the roster and the player
     * detail page cannot disagree about one person.
     *
     * ⚠️ `groupBy`, not a `_count` relation: the emitted SQL is
     * `SELECT "submissionId", COUNT(*) FROM "KycDocument" GROUP BY "submissionId"`,
     * one flat statement rather than a correlated subquery per row. It never selects
     * `storageKey`, so image bytes are never read and TOAST is never detoasted,
     * whatever `KYC_STORAGE` is set to.
     */
    listStageFacts: async (): Promise<StoredKycStageRow[]> => {
      const subs = await pc().kycSubmission.findMany({
        select: {
          id: true, userId: true, status: true,
          submittedAt: true, approvedAt: true, createdAt: true,
          rejectReason: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      // ⛔ SECOND, never in parallel — see the ordering note above.
      const groups = await pc().kycDocument.groupBy({
        by: ["submissionId"],
        _count: { _all: true },
      });
      const docCount = new Map<string, number>();
      for (const g of groups) docCount.set(g.submissionId, g._count._all);

      const seen = new Set<string>();
      const out: StoredKycStageRow[] = [];
      for (const s of subs) {
        // The `orderBy` above IS the definition of "newest" — first row per user wins.
        if (seen.has(s.userId)) continue;
        seen.add(s.userId);
        out.push({
          id: s.id,
          userId: s.userId,
          status: String(s.status) as StoredKyc["status"],
          documentCount: docCount.get(s.id) ?? 0,
          submittedAt: iso(s.submittedAt),
          approvedAt: iso(s.approvedAt),
          rejectReason: s.rejectReason ? String(s.rejectReason) : null,
          createdAt: iso(s.createdAt),
        });
      }
      return out;
    },
  },

  // ── OTP ───────────────────────────────────────────────────────────────────
  // hashedCode + salt are packed into the single `codeHash` column as "hash|salt"
  otp: {
    create: async (o: StoredOtp): Promise<StoredOtp> => {
      const row = await pc().otp.create({
        data: {
          id: o.id,
          phoneE164: o.phoneE164 ?? null,
          email: o.email ?? null,
          codeHash: `${o.hashedCode}${OTP_SEP}${o.salt}`,
          purpose: o.purpose,
          attempts: o.attempts,
          consumedAt: o.consumedAt ? new Date(o.consumedAt) : null,
          expiresAt: new Date(o.expiresAt),
          createdAt: new Date(o.createdAt),
        },
      });
      return toStoredOtp(row);
    },
    /**
     * Delete OTP rows issued before `beforeIso`. Returns the count removed.
     *
     * An OTP hash is credential material with no value once its window has passed. 30 days
     * from issue is the figure already published on /admin/retention, so wiring this makes an
     * existing statement true rather than creating a new one.
     *
     * ⚠️ Prunes on `createdAt`, not `expiresAt`: the retention promise is measured from
     * ISSUE, and an OTP that was never consumed still expires minutes after issue — keying on
     * expiry would make the published period meaningless.
     */
    pruneOlderThan: async (beforeIso: string): Promise<number> => {
      const res = await pc().otp.deleteMany({
        where: { createdAt: { lt: new Date(beforeIso) } },
      });
      return res.count;
    },
    findActive: async (phone: string, purpose: string): Promise<StoredOtp | null> => {
      const row = await pc().otp.findFirst({
        where: {
          phoneE164: phone,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredOtp(row) : null;
    },
    findAllActive: async (phone: string, purpose: string): Promise<StoredOtp[]> => {
      const rows = await pc().otp.findMany({
        where: {
          phoneE164: phone,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredOtp);
    },
    /** ⭐ The same read keyed on a MAILBOX — the agent invitation's channel since
     *  2026-09-08. ⚠️ `mode: "insensitive"` because an email address is case-insensitive
     *  and the invitee's stored account email may differ in case from what the officer
     *  typed. Without it, capitalisation locks the invitee out of their own invitation. */
    findAllActiveByEmail: async (email: string, purpose: string): Promise<StoredOtp[]> => {
      const rows = await pc().otp.findMany({
        where: {
          email: { equals: email.trim(), mode: "insensitive" },
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredOtp);
    },
    consume: async (id: string): Promise<StoredOtp | null> => {
      try {
        const row = await pc().otp.update({
          where: { id },
          data: { consumedAt: new Date() },
        });
        return toStoredOtp(row);
      } catch {
        return null;
      }
    },
    incrementAttempts: async (id: string): Promise<StoredOtp | null> => {
      try {
        const row = await pc().otp.update({
          where: { id },
          data: { attempts: { increment: 1 } },
        });
        return toStoredOtp(row);
      } catch {
        return null;
      }
    },
    /**
     * Delete every OTP row issued to a phone number. Erasure only.
     *
     * `Otp.phoneE164` is the number itself, not a reference to the user, so tombstoning
     * `User.phoneE164` leaves it behind. The 30-day prune reaches it eventually; erasure
     * is not "eventually".
     */
    deleteAllForPhone: async (phone: string): Promise<number> => {
      const res = await pc().otp.deleteMany({ where: { phoneE164: phone } });
      return res.count;
    },
  },

  // ── WALLET ────────────────────────────────────────────────────────────────
  wallet: {
    // tx (bet-stake single-tx): a read issued INSIDE an open money $transaction
    // must run on the tx client — the pooled client would borrow a second
    // connection per in-flight bet (pool-exhaustion risk under load) and would
    // not see the tx's own uncommitted writes.
    findByUserId: async (userId: string, tx?: Prisma.TransactionClient | null): Promise<StoredWallet | null> => {
      const w = await (tx ?? pc()).wallet.findUnique({ where: { userId } });
      return w ? toStoredWallet(w) : null;
    },
    listAll: async (): Promise<StoredWallet[]> => {
      const rows = await pc().wallet.findMany();
      return rows.map(toStoredWallet);
    },
    create: async (w: StoredWallet): Promise<StoredWallet> => {
      const row = await pc().wallet.create({
        data: {
          id: w.id,
          userId: w.userId,
          balance: w.balance,
          pending: w.pending,
          hold: w.hold,
          bonusBalance: w.bonusBalance ?? 0,
          currency: w.currency,
          status: w.status,
          freezeReasons: w.freezeReasons ?? [],
          createdAt: new Date(w.createdAt),
        },
      });
      return toStoredWallet(row);
    },
    update: async (id: string, patch: Partial<StoredWallet>): Promise<StoredWallet | null> => {
      try {
        const { createdAt: _c, updatedAt: _u, ...rest } = patch;
        const row = await pc().wallet.update({ where: { id }, data: rest });
        return toStoredWallet(row);
      } catch {
        return null;
      }
    },
    // Atomic balance/hold/pending deltas with optional minimum guards. Maps to a
    // single conditional updateMany so the DB applies increment/decrement
    // atomically (no lost updates) and the WHERE guard makes debits overdraw-safe
    // under concurrency — correct even across multiple instances. Returns the
    // updated wallet, or null if missing or a guard failed (insufficient funds).
    adjust: async (
      id: string,
      deltas: { balance?: number; hold?: number; pending?: number; bonusBalance?: number },
      opts?: { requireBalanceGte?: number; requireHoldGte?: number; requireBonusBalanceGte?: number },
      tx?: Prisma.TransactionClient | null,
    ): Promise<StoredWallet | null> => {
      // In tx mode (a money $transaction, audit C3) a DB error must PROPAGATE so
      // the whole transaction rolls back — never swallow it to null, or the caller
      // would commit a half-written movement. A guard failure / missing row still
      // returns null; the caller throws on that to abort the tx. Self-committing
      // mode (no tx) keeps the original catch → null contract.
      const db: Db = tx ?? pc();
      const run = async (): Promise<StoredWallet | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { id };
        if (opts?.requireBalanceGte !== undefined) where.balance = { gte: opts.requireBalanceGte };
        if (opts?.requireHoldGte !== undefined) where.hold = { gte: opts.requireHoldGte };
        if (opts?.requireBonusBalanceGte !== undefined) where.bonusBalance = { gte: opts.requireBonusBalanceGte };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        if (deltas.balance !== undefined) data.balance = { increment: deltas.balance };
        if (deltas.hold !== undefined) data.hold = { increment: deltas.hold };
        if (deltas.pending !== undefined) data.pending = { increment: deltas.pending };
        if (deltas.bonusBalance !== undefined) data.bonusBalance = { increment: deltas.bonusBalance };
        const res = await db.wallet.updateMany({ where, data });
        if (res.count === 0) return null;
        const row = await db.wallet.findUnique({ where: { id } });
        return row ? toStoredWallet(row) : null;
      };
      if (tx) return run(); // let a guard failure / db error propagate to roll back the tx
      try { return await run(); } catch { return null; }
    },
  },

  // ── TRANSACTION ───────────────────────────────────────────────────────────
  txn: {
    create: async (t: StoredTxn, tx?: Prisma.TransactionClient | null): Promise<StoredTxn> => {
      const db: Db = tx ?? pc();
      const row = await db.transaction.create({
        data: {
          id: t.id,
          walletId: t.walletId,
          userId: t.userId,
          type: t.type,
          status: t.status,
          amount: t.amount,
          fee: t.fee,
          taxWithheld: t.taxWithheld,
          balanceAfter: t.balanceAfter,
          currency: t.currency,
          provider: t.provider,
          providerRef: t.providerRef,
          msisdn: t.msisdn,
          description: t.description,
          positionId: t.positionId,
          amlReason: t.amlReason,
          createdAt: new Date(t.createdAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
          idempotencyKey: t.idempotencyKey ?? null,
          // The house marker, written here and nowhere else (`update` skips it).
          houseBotId: t.houseBotId ?? null,
          // The journey funnel's deposit origin (S3b) — create-only too.
          origin: t.origin ?? null,
        },
      });
      return toStoredTxn(row);
    },
    /** `excludeHouseBets` (C5-SPEC ruling 173): `houseBotId IS NULL` in the WHERE, before `take`. See the memory twin. */
    findByUser: async (userId: string, limit = 50, opts?: { excludeHouseBets?: boolean }): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: opts?.excludeHouseBets ? { userId, houseBotId: null } : { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredTxn);
    },
    /**
     * One player's transactions inside a date window, newest first — see the memory twin in
     * `store.ts` for why the window is applied in the STORE rather than over a truncated page.
     * ⛔ BOTH HALVES EXIST OR NEITHER DOES.
     *
     * ⚠️ Bounds are `gte` / `lt`, matching `listInRange`, so two reads of one span cannot disagree
     * about a row that landed exactly on the boundary.
     */
    findByUserWindow: async (userId: string, fromMs: number, toMs: number, limit: number): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { userId, createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredTxn);
    },
    /**
     * ⭐ ONE PLAYER'S ROWS OF THE GIVEN TYPES, NEWEST FIRST — the Receipts page's read (2026-10-07: every deposit and
     * withdrawal in the app, mailed or not). The TYPE filter is applied in the STORE, so a heavy bettor's thousands of
     * stake rows can never push a deposit out of reach the way the all-types cap of `findByUserWindow` would.
     * Ordered `createdAt desc, id desc` in BOTH twins — the id breaks a tie, so two rows stamped in the same millisecond
     * come back in one order everywhere. Served by `@@index([userId, createdAt])`; no migration.
     * ⛔ BOTH HALVES EXIST OR NEITHER DOES (the memory twin is a blind cast in `store.ts`, so the compiler cannot say).
     */
    findByUserTypes: async (userId: string, types: readonly StoredTxn["type"][], limit: number): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { userId, type: { in: [...types] } as never },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      return rows.map(toStoredTxn);
    },
    findById: async (id: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findUnique({ where: { id } });
      return row ? toStoredTxn(row) : null;
    },
    findByProviderRef: async (providerRef: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findFirst({ where: { providerRef } });
      return row ? toStoredTxn(row) : null;
    },
    update: async (id: string, patch: Partial<StoredTxn>, tx?: Prisma.TransactionClient | null): Promise<StoredTxn | null> => {
      const db: Db = tx ?? pc();
      const run = async (): Promise<StoredTxn | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          // ⛔ `houseBotId` AND `positionId` ARE BOTH CREATE-ONLY (house bots, PLAN §2 I8; C5-7's review). A patch can
          // never re-mark or un-mark a ledger row — and, because it cannot, it must not be able to POSITION one
          // either: `positionId` used to pass straight through, so an update could turn an unpositioned, unmarked row
          // into a positioned one that is now permanently unmarkable. That row would sit in the holder's own
          // `excludeHouseBets` wallet feed (a NULL marker is kept, `findByUser` below) and drop out of the house
          // book's `returned` (`house-bot-dal.ts` requires `houseBotId IS NOT NULL`), and ruling 232's pin reads
          // `.txn.create(` sites only, so nothing would report it. The two keys are create-only together or neither
          // is. Measured when this landed: 28 `db.txn.update(` call sites in `src/`, none naming either key. The
          // memory twin drops both the same way; the pin is `test:house-bot-reports` 0.232.4.
          if (k === "createdAt" || k === "updatedAt" || k === "houseBotId" || k === "positionId" || k === "origin") continue;
          if (k === "completedAt" || k === "pendingNotifiedAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await db.transaction.update({ where: { id }, data });
        return toStoredTxn(row);
      };
      // In tx mode, let the error propagate to roll back; otherwise keep catch → null.
      if (tx) return run();
      try { return await run(); } catch { return null; }
    },
    listByStatus: async (status: StoredTxn["status"]): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({ where: { status } });
      return rows.map(toStoredTxn);
    },
    /** Every transaction, ALL TIME. ⛔ Never on a windowed path — use `listInRange` below (guarded
     *  by `test:report-parity` §4 and `test:report-window-reads`). */
    listAll: async (): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany();
      return rows.map(toStoredTxn);
    },
    /**
     * Every transaction in `[fromMs, toMs)`, filtered in SQL.
     *
     * 🔴 WHY THIS EXISTS. `listAll()` pulls the entire transactions table into memory and
     * 13 call sites then filtered it by date in JavaScript. Measured on a seeded database
     * of 1,000 users × 100 transactions (`scripts/load/s13-scale-ceilings.mts`):
     *
     *     listAll() + filter in JS   3,176 ms   333 MB heap
     *     the same window in SQL        48 ms   ~0
     *
     * 66× slower, and the 333 MB is the part that actually ends the process — a Railway
     * container has 512 MB. The adjacent `search()` has always done it correctly and its
     * own comment says this table "must never be walked in memory"; the reporting paths
     * simply never used it.
     *
     * Bounds match `within()` in report-money.ts exactly — `>= from`, `< to` — because
     * these replace that filter and an off-by-one at a month boundary moves money between
     * two statutory reports.
     */
    listInRange: async (fromMs: number, toMs: number): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toStoredTxn);
    },
    /**
     * All-time stakes and payouts per user, aggregated in the database, top `limit` by
     * margin. Replaces a whole-table walk that grouped in JavaScript.
     *
     * Genuinely all-time — there is no window to push down — so the answer is a GROUP BY
     * rather than a smaller scan. `limit` is what keeps it bounded.
     */
    topContributors: async (limit: number): Promise<Array<{ userId: string; stakes: number; payouts: number }>> => {
      const rows = await pc().$queryRawUnsafe<
        Array<{ userId: string; stakes: string; payouts: string }>
      >(
        `select "userId",
                coalesce(sum(case when "type" = 'BET_PLACED' then abs("amount") else 0 end), 0)::text as "stakes",
                coalesce(sum(case when "type" in ('BET_PAYOUT', 'CASHOUT') then abs("amount") else 0 end), 0)::text as "payouts"
           from "public"."Transaction"
          where "status" = 'CONFIRMED'
            and "type" in ('BET_PLACED', 'BET_PAYOUT', 'CASHOUT')
          group by "userId"
          order by (coalesce(sum(case when "type" = 'BET_PLACED' then abs("amount") else 0 end), 0)
                  - coalesce(sum(case when "type" in ('BET_PAYOUT', 'CASHOUT') then abs("amount") else 0 end), 0)) desc
          limit $1`,
        limit,
      );
      return rows.map((r) => ({ userId: r.userId, stakes: Number(r.stakes), payouts: Number(r.payouts) }));
    },
    /** Every transaction for ONE user. Was `listAll().filter(t => t.userId === id)`. */
    listForUser: async (userId: string): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
      return rows.map(toStoredTxn);
    },
    /** Filtered + paginated transaction search for the compliance browser.
     *  Filtering/sorting/pagination are pushed into SQL — this table is the
     *  largest on a money platform and must never be walked in memory. The
     *  summary totals cover the WHOLE filtered set (a second, page-independent
     *  pass), because an operator reconciling against a gateway statement needs
     *  the full figure, not the page's. Rules mirror `txn-filters.ts`; the
     *  search tests assert the two DALs agree. */
    search: async (f: TxnSearchFilters = {}): Promise<TxnSearchResult> => {
      const and: Prisma.TransactionWhereInput[] = [];
      if (f.types?.length) and.push({ type: { in: [...f.types] } as never });
      if (f.statuses?.length) and.push({ status: { in: [...f.statuses] } as never });
      if (f.providers?.length) and.push({ provider: { in: [...f.providers] } as never });
      if (f.fromMs != null) and.push({ createdAt: { gte: new Date(f.fromMs) } });
      if (f.toMs != null) and.push({ createdAt: { lt: new Date(f.toMs) } });
      if (f.q) {
        const q = f.q.trim();
        and.push({ OR: [
          { id: { contains: q, mode: "insensitive" } },
          { providerRef: { contains: q, mode: "insensitive" } },
          { msisdn: { contains: q, mode: "insensitive" } },
          { userId: { contains: q, mode: "insensitive" } },
        ] });
      }
      // "Needs attention" = unreconciled (confirmed gateway money with no ref)
      // OR awaiting AML OR still in flight. Mirrors attentionOf()'s warn levels.
      if (f.attentionOnly) {
        and.push({ OR: [
          { AND: [{ type: { in: [...GATEWAY_TYPES] } as never }, { status: "CONFIRMED" as never }, { providerRef: null }] },
          { status: "AML_REVIEW" as never },
          { AND: [{ status: "PROCESSING" as never }, { createdAt: { lt: new Date(Date.now() - STUCK_PROCESSING_MS) } }] },
        ] });
      }
      const finalWhere: Prisma.TransactionWhereInput = and.length ? { AND: and } : {};

      const field = f.sort?.field ?? "createdAt";
      const dir = f.sort?.dir ?? "desc";
      const orderBy: Prisma.TransactionOrderByWithRelationInput =
        field === "amount" ? { amount: dir }
        : field === "type" ? { type: dir }
        : field === "status" ? { status: dir }
        : field === "provider" ? { provider: dir }
        : { createdAt: dir };

      const take = Math.max(1, Math.min(f.take ?? 50, 500));
      const skip = Math.max(0, f.skip ?? 0);
      const [rows, total, allForSummary] = await Promise.all([
        pc().transaction.findMany({ where: finalWhere, orderBy, skip, take }),
        pc().transaction.count({ where: finalWhere }),
        // Summary needs every matching row's type/status/amount/fee/providerRef.
        // Selected narrowly so this stays cheap even on a large filtered set.
        pc().transaction.findMany({
          where: finalWhere,
          select: { type: true, status: true, amount: true, fee: true, providerRef: true },
        }),
      ]);
      const summary = summarise(allForSummary.map((r) => ({
        type: r.type, status: r.status, amount: Number(r.amount), fee: Number(r.fee),
        providerRef: r.providerRef, createdAt: new Date().toISOString(),
      }) as unknown as StoredTxn));
      return { rows: rows.map(toStoredTxn), total, summary };
    },
    findByIdempotencyKey: async (key: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findUnique({ where: { idempotencyKey: key } });
      return row ? toStoredTxn(row) : null;
    },
    sumDepositsSince: async (userId: string, sinceMs: number, includePending = false): Promise<number> => {
      const result = await pc().transaction.aggregate({
        where: {
          userId,
          type: "DEPOSIT",
          // includePending counts in-flight PROCESSING deposits so a concurrent
          // deposit is visible to the RG cap / SOF gate (audit C4). Default is
          // confirmed-only for the player-facing dashboard.
          status: includePending ? { in: ["CONFIRMED", "PROCESSING"] } : "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    sumGamblingNetSince: async (userId: string, sinceMs: number, tx?: Prisma.TransactionClient | null): Promise<number> => {
      const result = await (tx ?? pc()).transaction.aggregate({
        where: {
          userId,
          type: { in: ["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "CASHOUT"] },
          status: "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Per-user Σ of CONFIRMED signed amounts across the given txn types since a
     *  cutoff — a DB-side aggregate (no row loading, no row-count cap). Powers the
     *  player "Your activity" summary (staked/won/deposits/withdrawals). Returns
     *  the SIGNED sum (BET_PLACED / WITHDRAWAL are negative money-out). */
    sumUserByTypesSince: async (userId: string, sinceMs: number, types: StoredTxn["type"][]): Promise<number> => {
      if (types.length === 0) return 0;
      const result = await pc().transaction.aggregate({
        where: {
          userId,
          type: { in: types },
          status: "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Platform-wide Σ of CONFIRMED amounts across the given txn types — a DB-side
     *  aggregate (no row loading), for marketing stats like the landing "paid out"
     *  band. BET_PAYOUT/CASHOUT are stored positive, so this equals the abs-sum. */
    sumConfirmedByTypes: async (types: StoredTxn["type"][]): Promise<number> => {
      if (types.length === 0) return 0;
      const result = await pc().transaction.aggregate({
        where: { status: "CONFIRMED", type: { in: types } },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Transactions created since `sinceMs` (optionally filtered to `types`) — a
     *  windowed DB query so time-bounded analytics (MNO health, reconciliation)
     *  load only the window, not every row. */
    /**
     * Per-type CONFIRMED count and ABSOLUTE sum, computed in the database. Powers the
     * Selcom statement, which prints three numbers off a ledger that already holds
     * 20,000+ rows — `report-money.ts` records what loading that costs (3,176 ms and
     * 333 MB of heap).
     *
     * ⚠️ `abs()` IN SQL, not in JavaScript, and the in-memory twin in `store.ts` does the
     * same. Withdrawals are stored negative; a signed sum prints a negative "money out"
     * and a `net` that adds when it should subtract.
     *
     * ⚠️ `groupBy`, so a type with no confirmed rows is ABSENT from the result — the
     * caller seeds every requested type at zero first. A statement that silently omitted
     * "withdrawals" because there had been none would read as a missing section rather
     * than as a true zero.
     */
    /**
     * The newest `limit` CONFIRMED rows of one type, `createdAt` then `id` descending.
     * 🔴 WHY: match-integrity printed "the most recent 200 of N" refunds after reading the WHOLE
     * Transaction table to find them. Its count and total come from `totalsByType` (SQL
     * aggregates); this supplies the rows the section shows, and nothing else.
     */
    newestConfirmedOfType: async (type: StoredTxn["type"], limit: number): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { type, status: "CONFIRMED" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.max(0, limit),
      });
      return rows.map(toStoredTxn);
    },
    totalsByType: async (types: StoredTxn["type"][]): Promise<Record<string, { amount: number; count: number }>> => {
      const out: Record<string, { amount: number; count: number }> = {};
      for (const t of types) out[t] = { amount: 0, count: 0 };
      if (types.length === 0) return out;
      // ⛔ ONE PARAMETERISED QUERY PER TYPE, not one `= any($1::text[])`. The types are a
      // module constant of length 3 and the column is indexed, so three scalar-parameter
      // reads cost nothing — while an ARRAY parameter is precisely the shape of raw-SQL
      // binding that has failed on production and only on production in this repo before
      // (`$queryRaw` binds a JS number as bigint; an int4-only function then answers 42883).
      // A scalar text parameter cannot be mis-bound.
      const rows = await Promise.all(types.map((t) =>
        pc().$queryRaw<Array<{ n: bigint; total: unknown }>>`
          select count(*)::bigint as n, coalesce(sum(abs("amount")), 0) as total
            from "Transaction"
           where "status" = 'CONFIRMED' and "type"::text = ${t}`,
      ));
      types.forEach((t, i) => {
        const r = rows[i]?.[0];
        // A `Decimal(18,2)` sum comes back as a Prisma Decimal or a string depending on
        // driver version; `Number(...)` handles both, and `?? 0` covers the no-rows case.
        out[t] = { amount: Number(r?.total ?? 0), count: Number(r?.n ?? 0) };
      });
      return out;
    },
    listSince: async (sinceMs: number, opts?: { types?: StoredTxn["type"][] }): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: {
          createdAt: { gte: new Date(sinceMs) },
          ...(opts?.types && opts.types.length ? { type: { in: opts.types } } : {}),
        },
      });
      return rows.map(toStoredTxn);
    },
  },

  // ── RESPONSIBLE GAMBLING ──────────────────────────────────────────────────
  responsible: {
    get: async (userId: string): Promise<StoredResponsibleGambling | null> => {
      const r = await pc().responsibleGambling.findUnique({ where: { userId } });
      return r ? toStoredRG(r) : null;
    },
    listAll: async (): Promise<StoredResponsibleGambling[]> => {
      const rows = await pc().responsibleGambling.findMany();
      return rows.map(toStoredRG);
    },
    upsert: async (r: StoredResponsibleGambling): Promise<StoredResponsibleGambling> => {
      const data = {
        dailyDepositLimit: r.dailyDepositLimit,
        weeklyDepositLimit: r.weeklyDepositLimit,
        monthlyDepositLimit: r.monthlyDepositLimit,
        dailyLossLimit: r.dailyLossLimit,
        sessionTimeLimitMin: r.sessionTimeLimitMin,
        // `?? 30` — realityCheckIntervalMin is NON-nullable in the schema
        // (Int @default(30)). A caller passing null must fall back to the
        // default, not throw: this is the responsible-gambling write path, and
        // a crash here is a player unable to set a limit or self-exclude.
        realityCheckIntervalMin: r.realityCheckIntervalMin ?? 30,
        selfExclusionUntil: r.selfExclusionUntil ? new Date(r.selfExclusionUntil) : null,
        coolingOffUntil: r.coolingOffUntil ? new Date(r.coolingOffUntil) : null,
        selfExclusionStartedAt: r.selfExclusionStartedAt ? new Date(r.selfExclusionStartedAt) : null,
        coolingOffStartedAt: r.coolingOffStartedAt ? new Date(r.coolingOffStartedAt) : null,
        pendingIncreaseTo: r.pendingIncreaseTo,
        pendingIncreaseEffectiveAt: r.pendingIncreaseEffectiveAt ? new Date(r.pendingIncreaseEffectiveAt) : null,
        pendingWeeklyIncreaseTo: r.pendingWeeklyIncreaseTo,
        pendingWeeklyIncreaseEffectiveAt: r.pendingWeeklyIncreaseEffectiveAt ? new Date(r.pendingWeeklyIncreaseEffectiveAt) : null,
        pendingMonthlyIncreaseTo: r.pendingMonthlyIncreaseTo,
        pendingMonthlyIncreaseEffectiveAt: r.pendingMonthlyIncreaseEffectiveAt ? new Date(r.pendingMonthlyIncreaseEffectiveAt) : null,
        // E-408 · `undefined` (a caller that never read these) leaves the column untouched rather than nulling it.
        ...(r.pendingLossLimitTo !== undefined ? { pendingLossLimitTo: r.pendingLossLimitTo } : {}),
        ...(r.pendingLossLimitEffectiveAt !== undefined ? { pendingLossLimitEffectiveAt: r.pendingLossLimitEffectiveAt ? new Date(r.pendingLossLimitEffectiveAt) : null } : {}),
        ...(r.pendingSessionLimitTo !== undefined ? { pendingSessionLimitTo: r.pendingSessionLimitTo } : {}),
        ...(r.pendingSessionLimitEffectiveAt !== undefined ? { pendingSessionLimitEffectiveAt: r.pendingSessionLimitEffectiveAt ? new Date(r.pendingSessionLimitEffectiveAt) : null } : {}),
      };
      const row = await pc().responsibleGambling.upsert({
        where: { userId: r.userId },
        create: { userId: r.userId, ...data },
        update: data,
      });
      return toStoredRG(row);
    },
    /** E-408 · see the in-memory twin. `updateMany` so a player with no RG row (no limit) is a no-op, not a throw. */
    touchPlayClock: async (userId: string, startedAtIso: string, lastSeenIso: string): Promise<void> => {
      await pc().responsibleGambling.updateMany({ where: { userId }, data: { playStartedAt: new Date(startedAtIso), playLastSeenAt: new Date(lastSeenIso) } });
    },
  },

  // ── NOTIFICATION ──────────────────────────────────────────────────────────
  notification: {
    create: async (n: StoredNotification): Promise<StoredNotification> => {
      const created = new Date(n.createdAt);
      const row = await pc().notification.create({
        data: {
          id: n.id,
          userId: n.userId,
          // The ONLY channel this table has ever carried. `NotificationChannel`
          // declares four; PUSH/SMS/EMAIL have no writer and 0 rows. This table
          // is the in-app inbox — see `comms-registry.ts` for the whole picture.
          channel: "IN_APP",
          event: n.kind,
          kind: n.kind,
          href: n.href,
          titleEn: n.titleEn,
          titleSw: n.titleSw,
          titleZh: n.titleZh ?? null,
          bodyEn: n.bodyEn,
          bodySw: n.bodySw,
          bodyZh: n.bodyZh ?? null,
          // 🔴 `sentAt` was NULL on all 1,673 production rows because nothing in
          // the repo ever wrote it — "was it delivered?" was unanswerable from
          // the data. For an IN_APP notification, delivery IS the row becoming
          // visible in the bell, so the timestamp is knowable exactly here. A
          // column nobody fills is a promise, not a record.
          sentAt: created,
          readAt: n.readAt ? new Date(n.readAt) : null,
          dismissedAt: n.dismissedAt ? new Date(n.dismissedAt) : null,
          createdAt: created,
        },
      });
      return toStoredNotification(row);
    },
    /**
     * The most recent byte-identical notification for this player inside the
     * window, or null. Identity includes `href`, so two genuinely different
     * events (two deposits, two positions) never collide — see DEDUPE_WINDOW_MS
     * in notification-service for the production measurement behind this.
     */
    findRecentDuplicate: async (q: {
      userId: string; kind: string; titleEn: string; bodyEn: string; href: string | null; sinceMs: number;
    }): Promise<StoredNotification | null> => {
      const row = await pc().notification.findFirst({
        where: {
          userId: q.userId,
          kind: q.kind,
          titleEn: q.titleEn,
          bodyEn: q.bodyEn,
          href: q.href,
          createdAt: { gte: new Date(Date.now() - q.sinceMs) },
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredNotification(row) : null;
    },
    /**
     * Has this player EVER been sent a notification at this exact deep link?
     *
     * ⚠️ Deliberately unbounded in time, which is the whole difference between
     * this and `findRecentDuplicate` above. That one asks "is this a double-fire
     * of the same event 90 seconds ago"; this one asks "has this once-per-period
     * message already gone out" — and the answer must not become `false` again
     * simply because time passed. The Up & Down daily digest (E-37) keys on
     * `/updown/history?day=YYYY-MM-DD`, so the day is IN the href and a container
     * restart, a redeploy or a healed late settlement can re-run the sweep as
     * often as it likes without a player being told about their day twice.
     *
     * ⛔ Do not "optimise" this into the dedupe window. A 90-second window on a
     * daily message is not idempotency, it is a race that usually wins.
     */
    existsWithHref: async (userId: string, href: string): Promise<boolean> => {
      const row = await pc().notification.findFirst({
        where: { userId, href },
        select: { id: true },
      });
      return !!row;
    },
    /**
     * Delete in-app notifications created before `beforeIso`. Returns the count removed.
     *
     * ⚠️ THE PERIOD IS NOT A FREE CHOICE — see `retention.ts`. `existsWithHref` above is
     * deliberately unbounded in time because it is the Up & Down digest's only idempotency
     * key (E-37), and this method deletes exactly the rows that answer is read from. Tighten
     * the period and a replayed digest tells players about their day twice.
     */
    pruneOlderThan: async (beforeIso: string): Promise<number> => {
      const res = await pc().notification.deleteMany({
        where: { createdAt: { lt: new Date(beforeIso) } },
      });
      return res.count;
    },
    findByUser: async (userId: string, limit = 50): Promise<StoredNotification[]> => {
      const rows = await pc().notification.findMany({
        where: { userId, dismissedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredNotification);
    },
    countUnread: async (userId: string): Promise<number> => {
      return pc().notification.count({
        where: { userId, readAt: null, dismissedAt: null },
      });
    },
    /**
     * The `/notifications` screen: one filtered, sorted, paginated page PLUS the count for
     * every lens, in one call.
     *
     * ⛔ THE COUNTS ARE COMPUTED, NEVER ESTIMATED. `FilterPill`'s own contract says *"Omit
     * where no honest count exists. Never invent one — A-5, no fabrication."* So each pill's
     * number is a real `count()` over the same predicate its page would use. If a count and
     * its page ever disagree, the count is the lie.
     *
     * ⛔ `page` is 1-indexed to match the shared `Pagination` atom's `?page=` contract.
     * Passing a 0-indexed value here silently skips the first page of a player's money
     * history and nothing throws.
     */
    page: async (q: {
      userId: string;
      filter: NotificationFilter;
      sort: NotificationSort;
      page: number;
      perPage: number;
      /**
       * ⭐ THE RAW SEARCH TEXT, PUSHED DOWN INTO SQL — see `NOTIFICATION_SEARCH`. Every other
       * player surface in this campaign reads its rows and filters them in JS; this one cannot,
       * because Up & Down writes a row per settled round (360/day on a 3-minute chain) and a
       * player's inbox is unbounded. ⛔ `undefined` and `""` both mean "no search", never
       * "match nothing".
       */
      q?: string;
    }): Promise<{ items: StoredNotification[]; total: number; counts: Record<NotificationFilter, number> }> => {
      const kinds = kindsFor(q.filter);
      /**
       * ⛔ `null` FROM `queryToWhere` MEANS "RETURN ZERO ROWS", NEVER "RETURN EVERYTHING" — its own
       * header says so. An invalid query must show a player an empty inbox with an honest
       * search-miss message, not their entire history as though the search had run.
       */
      const parsed = parseQuery(q.q ?? "", { fields: fieldNames(NOTIFICATION_SEARCH) });
      const searchWhere = queryToWhere(parsed, NOTIFICATION_SEARCH);
      const search = searchWhere ?? { id: "__no_such_notification__" };

      // Every lens except `cleared` hides dismissed rows; `cleared` shows only them.
      const dismissed = showsCleared(q.filter) ? { not: null } : null;
      const where = {
        userId: q.userId,
        dismissedAt: dismissed,
        ...(q.filter === "unread" ? { readAt: null } : {}),
        ...(kinds ? { kind: { in: [...kinds] } } : {}),
        ...search,
      };
      const skip = Math.max(0, (q.page - 1) * q.perPage);
      /**
       * ⛔ THE SEARCH NARROWS EVERY COUNT TOO, AND LEAVING IT OUT IS THE DEFECT `qa:count-truth`
       * EXISTS TO CATCH. A pill's number is a promise about what pressing it would show — with the
       * search still on — so a count folded over the unsearched inbox would over-promise on every
       * lens the moment a player types. Same rule as `countsFor` on every other route.
       */
      const [items, total, cAll, cUnread, cMoney, cAccount, cCleared] = await Promise.all([
        pc().notification.findMany({
          where,
          orderBy: { createdAt: q.sort === "oldest" ? "asc" : "desc" },
          skip,
          take: q.perPage,
        }),
        pc().notification.count({ where }),
        pc().notification.count({ where: { userId: q.userId, dismissedAt: null, ...search } }),
        pc().notification.count({ where: { userId: q.userId, dismissedAt: null, readAt: null, ...search } }),
        pc().notification.count({ where: { userId: q.userId, dismissedAt: null, kind: { in: [...MONEY_FILTER_KINDS] }, ...search } }),
        pc().notification.count({ where: { userId: q.userId, dismissedAt: null, kind: { in: [...ACCOUNT_FILTER_KINDS] }, ...search } }),
        pc().notification.count({ where: { userId: q.userId, dismissedAt: { not: null }, ...search } }),
      ]);
      return {
        items: items.map(toStoredNotification),
        total,
        counts: { all: cAll, unread: cUnread, money: cMoney, account: cAccount, cleared: cCleared },
      };
    },
    /**
     * Undo a dismissal — the other half of `CLEAR ALL`.
     *
     * Scoped to the owner exactly as `markRead`/`dismiss` are: a notification id alone is not
     * proof of ownership, and `update` on an id would restore any user's row.
     */
    restore: async (id: string, userId: string): Promise<StoredNotification | null> => {
      try {
        const res = await pc().notification.updateMany({
          where: { id, userId },
          data: { dismissedAt: null },
        });
        if (res.count === 0) return null;
        const row = await pc().notification.findUnique({ where: { id } });
        return row ? toStoredNotification(row) : null;
      } catch {
        return null;
      }
    },
    markRead: async (id: string, userId: string): Promise<StoredNotification | null> => {
      try {
        // Scope to the owner — updateMany on {id, userId} no-ops if the row
        // isn't theirs (an `update` on id alone would mutate any user's row).
        const res = await pc().notification.updateMany({
          where: { id, userId },
          data: { readAt: new Date() },
        });
        if (res.count === 0) return null;
        const row = await pc().notification.findUnique({ where: { id } });
        return row ? toStoredNotification(row) : null;
      } catch {
        return null;
      }
    },
    markAllRead: async (userId: string): Promise<number> => {
      const result = await pc().notification.updateMany({
        where: { userId, readAt: null, dismissedAt: null },
        data: { readAt: new Date() },
      });
      return result.count;
    },
    dismiss: async (id: string, userId: string): Promise<StoredNotification | null> => {
      try {
        // Scope to the owner (see markRead).
        const res = await pc().notification.updateMany({
          where: { id, userId },
          data: { dismissedAt: new Date() },
        });
        if (res.count === 0) return null;
        const row = await pc().notification.findUnique({ where: { id } });
        return row ? toStoredNotification(row) : null;
      } catch {
        return null;
      }
    },
    dismissAll: async (userId: string): Promise<number> => {
      const result = await pc().notification.updateMany({
        where: { userId, dismissedAt: null },
        data: { dismissedAt: new Date() },
      });
      return result.count;
    },
    /**
     * Delete every notification belonging to one user. Erasure only.
     *
     * ⛔ NOT `dismissAll` — a `dismissedAt` hides a row whose `bodyEn` still says what the
     * player bet and won. In-app notifications are "operational only, 180 days" on
     * docs/DATA-RETENTION.md: no statute asks us to keep them.
     *
     * ⚠️ It also removes the rows `existsWithHref` answers from — the Up & Down digest's
     * only idempotency key. Safe HERE and nowhere else: the account is closed and erased,
     * so a replayed digest has nobody to double-notify.
     */
    deleteAllForUser: async (userId: string): Promise<number> => {
      const res = await pc().notification.deleteMany({ where: { userId } });
      return res.count;
    },
    /**
     * 🔴 OVERWRITE A FROZEN MASK WHEREVER IT LANDED IN SOMEBODY ELSE'S ROW.
     *
     * `notifyReferralJoined` writes `maskName(displayName, phoneE164)` into the REFERRER's
     * body — "+255•••417 signed up with your link." — frozen at write time. That is the
     * last three digits of the recruit's phone number in a row erasure does not own and
     * `deleteAllForUser` does not reach. Same defect as `Comment.authorName`, one table
     * across.
     *
     * ⚠️ A full scan of `Notification` by construction (no index answers `contains`), which
     * is why it is reachable only from erasure — a rare, officer-triggered operation — and
     * never from a render path.
     */
    redactFragment: async (fragment: string, replacement: string, scope?: NotificationRedactScope): Promise<number> => {
      if (!fragment) return 0;
      const FIELDS = ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"] as const;
      const text = { OR: FIELDS.map((f) => ({ [f]: { contains: fragment } })) };
      const rows = await pc().notification.findMany({
        where: scope
          ? { AND: [text, { kind: scope.kind }, { OR: [{ href: { contains: scope.hrefIncludes } }, { createdAt: { gte: new Date(scope.createdFrom), lte: new Date(scope.createdTo) } }] }] }
          : text,
        select: { id: true, titleEn: true, titleSw: true, titleZh: true, bodyEn: true, bodySw: true, bodyZh: true },
      });
      let changed = 0;
      for (const row of rows) {
        const data: Record<string, string> = {};
        for (const f of FIELDS) {
          const v = (row as Record<string, unknown>)[f];
          if (typeof v === "string" && v.includes(fragment)) data[f] = v.split(fragment).join(replacement);
        }
        if (Object.keys(data).length === 0) continue;
        await pc().notification.update({ where: { id: row.id }, data });
        changed++;
      }
      return changed;
    },
  },

  // ── SOURCE OF FUNDS ───────────────────────────────────────────────────────
  sourceOfFunds: {
    get: async (userId: string): Promise<StoredSourceOfFunds | null> => {
      const row = await pc().sourceOfFunds.findUnique({ where: { userId } });
      return row ? toStoredSOF(row) : null;
    },
    upsert: async (s: StoredSourceOfFunds): Promise<StoredSourceOfFunds> => {
      const data = {
        declaredSource: s.declaredSource,
        declaredOccupation: s.declaredOccupation,
        declaredEmployer: s.declaredEmployer,
        declaredAnnualIncomeBand: s.declaredAnnualIncomeBand,
        declaredOther: s.declaredOther,
        reviewStatus: s.reviewStatus as "PENDING" | "ACCEPTED" | "REJECTED",
        reviewerId: s.reviewerId,
        reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
        submittedAt: new Date(s.submittedAt),
      };
      const row = await pc().sourceOfFunds.upsert({
        where: { userId: s.userId },
        create: { userId: s.userId, ...data },
        update: data,
      });
      return toStoredSOF(row);
    },
    listPending: async (): Promise<StoredSourceOfFunds[]> => {
      const rows = await pc().sourceOfFunds.findMany({
        where: { reviewStatus: "PENDING" },
      });
      return rows.map(toStoredSOF);
    },
  },

  // ── AFFILIATE ─────────────────────────────────────────────────────────────
  affiliate: {
    findByUserId: async (userId: string): Promise<StoredAffiliateAccount | null> => {
      const row = await pc().affiliateAgent.findUnique({ where: { userId } });
      return row ? toStoredAffiliate(row) : null;
    },
    findByCode: async (code: string): Promise<StoredAffiliateAccount | null> => {
      const norm = code.trim().toUpperCase();
      const row = await pc().affiliateAgent.findUnique({ where: { code: norm } });
      return row ? toStoredAffiliate(row) : null;
    },
    create: async (a: StoredAffiliateAccount): Promise<StoredAffiliateAccount> => {
      const row = await pc().affiliateAgent.create({
        data: {
          userId: a.userId,
          code: a.code,
          totalRecruits: a.recruitCount,
          totalCommission: a.totalEarnedTzs,
          // ⛔ Written explicitly rather than left to the column defaults. `commissionPct`
          // has NO default any more — a freshly minted player row must carry NULL, meaning
          // "no officer has priced this partner", not a rate nobody chose.
          commissionPct: a.commissionPct,
          active: a.active,
          approvedAt: a.approvedAt ? new Date(a.approvedAt) : null,
          approvedBy: a.approvedBy,
          deactivatedAt: a.deactivatedAt ? new Date(a.deactivatedAt) : null,
          createdAt: new Date(a.createdAt),
        },
      });
      return toStoredAffiliate(row);
    },
    /**
     * 🔴 THIS FUNCTION WAS THE DEFECT. It carried a hand-written allow-list of THREE fields
     * (`code`, `recruitCount`, `totalEarnedTzs`) and silently discarded everything else,
     * while the memory DAL did `{ ...a, ...patch }` and accepted anything. So the day an
     * officer set a commission rate, the write would have succeeded, returned a row, audited
     * cleanly — and changed nothing in Postgres. Every in-memory suite would have stayed
     * green. It is the exact shape of "memory-DAL green ≠ Prisma correct", on the money path.
     *
     * ⭐ THE FIX IS A COMPILE ERROR, NOT A LONGER LIST. `AFFILIATE_COLUMN` below is typed
     * `Record<keyof StoredAffiliateAccount, …>`, so adding a field to the Stored shape without
     * mapping it here does not compile. An unknown runtime key THROWS rather than being
     * dropped, because a silent no-op is what this whole comment exists about.
     */
    update: async (userId: string, patch: Partial<StoredAffiliateAccount>): Promise<StoredAffiliateAccount | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        const spec = AFFILIATE_COLUMN[k as keyof StoredAffiliateAccount];
        // `null` = deliberately not writable (the key, or a server-managed timestamp).
        if (spec === null) continue;
        if (spec === undefined) {
          throw new Error(`[prisma-dal] affiliate.update: unmapped field "${k}" — add it to AFFILIATE_COLUMN or it is a silent production no-op.`);
        }
        data[spec.col] = spec.kind === "date" ? (v ? new Date(v as string) : null) : v;
      }
      if (Object.keys(data).length === 0) {
        // Nothing to write. Return the current row rather than a null that a caller would
        // read as "row not found" — the two mean very different things at the call site.
        const row = await pc().affiliateAgent.findUnique({ where: { userId } });
        return row ? toStoredAffiliate(row) : null;
      }
      try {
        const row = await pc().affiliateAgent.update({ where: { userId }, data });
        return toStoredAffiliate(row);
      } catch (err) {
        // ⛔ A swallowed error is indistinguishable from row-not-found, and the two callers
        // that matter — `approveAgent` and `deactivateAgent` — treat null as a HARD failure.
        // Log it so a real Prisma fault is not silently reported as a missing agent.
        console.error(`[prisma-dal] affiliate.update failed for ${userId}:`, err);
        return null;
      }
    },
    /** Atomic +1 (audit M7) — Prisma `{ increment: 1 }`, immune to the
     *  read-modify-write lost update the old `recruitCount + 1` had. */
    incrementRecruitCount: async (userId: string): Promise<StoredAffiliateAccount | null> => {
      try {
        const row = await pc().affiliateAgent.update({ where: { userId }, data: { totalRecruits: { increment: 1 } } });
        return toStoredAffiliate(row);
      } catch {
        return null;
      }
    },
    /** ⭐ Atomic ± on the MONEY counter — the same lost-update fix `incrementRecruitCount`
     *  already carries. `delta` is signed; a clawback passes a negative. */
    incrementEarned: async (userId: string, delta: number): Promise<StoredAffiliateAccount | null> => {
      try {
        const row = await pc().affiliateAgent.update({ where: { userId }, data: { totalCommission: { increment: delta } } });
        return toStoredAffiliate(row);
      } catch (err) {
        console.error(`[prisma-dal] affiliate.incrementEarned failed for ${userId}:`, err);
        return null;
      }
    },
    list: async (): Promise<StoredAffiliateAccount[]> => {
      const rows = await pc().affiliateAgent.findMany();
      return rows.map(toStoredAffiliate);
    },
  },

  // ── REFERRAL REWARD ───────────────────────────────────────────────────────
  referralReward: {
    create: async (r: StoredReferralReward): Promise<StoredReferralReward> => {
      const row = await pc().referralReward.create({
        data: {
          id: r.id,
          referrerUserId: r.referrerUserId,
          recruitUserId: r.recruitUserId,
          type: r.type,
          label: r.label,
          amountTzs: r.amountTzs,
          grossAmountTzs: r.grossAmountTzs,
          taxWithheldTzs: r.taxWithheldTzs,
          status: r.status,
          recipientUserId: r.recipientUserId,
          note: r.note,
          programme: r.programme,
          rateApplied: r.rateApplied,
          marketId: r.marketId,
          sourceRef: r.sourceRef,
          reversedAt: r.reversedAt ? new Date(r.reversedAt) : null,
          reversedReason: r.reversedReason,
          createdAt: new Date(r.createdAt),
        },
      });
      return toStoredReward(row);
    },
    update: async (id: string, patch: Partial<StoredReferralReward>): Promise<StoredReferralReward | null> => {
      try {
        const { createdAt: _c, reversedAt, ...rest } = patch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = { ...rest };
        // ⚠️ The only DateTime in the patchable set. A raw ISO string reaching a Prisma
        // DateTime column throws on Postgres and nowhere else, so the clawback would fail
        // in production with every memory-backed suite green.
        if (reversedAt !== undefined) data.reversedAt = reversedAt ? new Date(reversedAt) : null;
        const row = await pc().referralReward.update({ where: { id }, data });
        return toStoredReward(row);
      } catch (err) {
        console.error(`[prisma-dal] referralReward.update failed for ${id}:`, err);
        return null;
      }
    },
    list: async (limit = 500): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredReward);
    },
    listByReferrer: async (referrerUserId: string): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        where: { referrerUserId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredReward);
    },
    listByRecruit: async (recruitUserId: string): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        where: { recruitUserId },
      });
      return rows.map(toStoredReward);
    },
    /** ⭐ The idempotency lookup — the key commission never had. */
    findBySourceRef: async (sourceRef: string): Promise<StoredReferralReward | null> => {
      const row = await pc().referralReward.findUnique({ where: { sourceRef } });
      return row ? toStoredReward(row) : null;
    },
    /** Every accrual a market produced — the population a clawback reverses. */
    listByMarket: async (marketId: string): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({ where: { marketId } });
      return rows.map(toStoredReward);
    },
    /** ⭐ Grouped aggregate over EVERY row — the fix for the 1,000-row "all-time" truncation.
     *  `groupBy` omits absent groups; the caller seeds zeros. */
    totals: async (): Promise<Array<{ programme: "PLAYER" | "AGENT" | null; type: StoredReferralReward["type"]; status: StoredReferralReward["status"]; count: number; sumTzs: number }>> => {
      const rows = await pc().referralReward.groupBy({
        by: ["programme", "type", "status"],
        _count: { _all: true },
        _sum: { amountTzs: true },
      });
      return rows.map((g) => ({
        programme: (g.programme ?? null) as "PLAYER" | "AGENT" | null,
        type: g.type as StoredReferralReward["type"],
        status: g.status as StoredReferralReward["status"],
        count: g._count._all,
        sumTzs: num(g._sum.amountTzs),
      }));
    },
  },

  // ── AGENT APPLICATION ─────────────────────────────────────────────────────
  // ⛔ The write maps below are typed `Record<keyof Stored…, …>` for the same reason
  // `AFFILIATE_COLUMN` is: a field added to the Stored shape and forgotten here is a
  // COMPILE ERROR, not a value that writes fine in memory and vanishes in production.
  agentApplication: {
    create: async (a: StoredAgentApplication): Promise<StoredAgentApplication> => {
      // The payload is built field-by-field from AGENT_APPLICATION_COLUMN so it cannot drift
      // from the Stored shape; Prisma's generated create-input union needs the cast.
      const row = await pc().agentApplication.create({
        data: agentApplicationCreateData(a) as unknown as Prisma.AgentApplicationUncheckedCreateInput,
      });
      return toStoredAgentApplication(row);
    },
    findById: async (id: string): Promise<StoredAgentApplication | null> => {
      const row = await pc().agentApplication.findUnique({ where: { id } });
      return row ? toStoredAgentApplication(row) : null;
    },
    /** The ONE live application, mirroring the partial unique index's predicate exactly.
     *  ⛔ If these two ever disagree, the service check and the database disagree about
     *  what a duplicate is — which is how a second live application appears. */
    findActiveByUser: async (userId: string): Promise<StoredAgentApplication | null> => {
      const row = await pc().agentApplication.findFirst({
        where: { userId, status: { notIn: ["REJECTED", "DECLINED", "EXPIRED", "REVOKED"] } },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredAgentApplication(row) : null;
    },
    findByFeeReference: async (feeReference: string): Promise<StoredAgentApplication | null> => {
      const norm = feeReference.trim().toUpperCase();
      if (!norm) return null;
      // Case-insensitive on purpose: the reference is typed by a human off a paper receipt,
      // and `ABC-123` and `abc-123` are the same payment. The unique index is exact, so the
      // service must normalise before it writes — this read is the matching half.
      const row = await pc().agentApplication.findFirst({
        where: { feeReference: { equals: norm, mode: "insensitive" } },
      });
      return row ? toStoredAgentApplication(row) : null;
    },
    listByUser: async (userId: string): Promise<StoredAgentApplication[]> => {
      const rows = await pc().agentApplication.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
      return rows.map(toStoredAgentApplication);
    },
    update: async (id: string, patch: Partial<StoredAgentApplication>): Promise<StoredAgentApplication | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        const spec = AGENT_APPLICATION_COLUMN[k as keyof StoredAgentApplication];
        if (spec === null) continue;
        if (spec === undefined) {
          throw new Error(`[prisma-dal] agentApplication.update: unmapped field "${k}" — add it to AGENT_APPLICATION_COLUMN or it is a silent production no-op.`);
        }
        data[k] = spec === "date" ? (v ? new Date(v as string) : null) : v;
      }
      if (Object.keys(data).length === 0) {
        const row = await pc().agentApplication.findUnique({ where: { id } });
        return row ? toStoredAgentApplication(row) : null;
      }
      try {
        const row = await pc().agentApplication.update({ where: { id }, data });
        return toStoredAgentApplication(row);
      } catch (err) {
        console.error(`[prisma-dal] agentApplication.update failed for ${id}:`, err);
        return null;
      }
    },
    list: async (): Promise<StoredAgentApplication[]> => {
      const rows = await pc().agentApplication.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map(toStoredAgentApplication);
    },
    /** Oldest first — a queue an officer works through, not a feed. */
    listByStatus: async (statuses: AgentApplicationStatus[]): Promise<StoredAgentApplication[]> => {
      const rows = await pc().agentApplication.findMany({
        where: { status: { in: statuses as never } },
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      });
      return rows.map(toStoredAgentApplication);
    },
  },

  agentApplicationDoc: {
    create: async (d: StoredAgentApplicationDocument): Promise<StoredAgentApplicationDocument> => {
      const row = await pc().agentApplicationDocument.create({
        data: {
          id: d.id,
          applicationId: d.applicationId,
          docType: d.docType,
          storageKey: d.storageKey,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          suppliedById: d.suppliedById,
          uploadedAt: new Date(d.uploadedAt),
          rejected: d.rejected,
          rejectReason: d.rejectReason,
          thirdParty: d.thirdParty,
          purgedAt: d.purgedAt ? new Date(d.purgedAt) : null,
        },
      });
      return toStoredAgentDoc(row);
    },
    findById: async (id: string): Promise<StoredAgentApplicationDocument | null> => {
      const row = await pc().agentApplicationDocument.findUnique({ where: { id } });
      return row ? toStoredAgentDoc(row) : null;
    },
    findSlot: async (applicationId: string, docType: AgentDocType): Promise<StoredAgentApplicationDocument | null> => {
      const row = await pc().agentApplicationDocument.findUnique({
        where: { applicationId_docType: { applicationId, docType } },
      });
      return row ? toStoredAgentDoc(row) : null;
    },
    listByApplication: async (applicationId: string): Promise<StoredAgentApplicationDocument[]> => {
      const rows = await pc().agentApplicationDocument.findMany({ where: { applicationId } });
      return rows.map(toStoredAgentDoc);
    },
    update: async (id: string, patch: Partial<StoredAgentApplicationDocument>): Promise<StoredAgentApplicationDocument | null> => {
      try {
        const { uploadedAt, purgedAt, ...rest } = patch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = { ...rest };
        if (uploadedAt !== undefined) data.uploadedAt = new Date(uploadedAt);
        if (purgedAt !== undefined) data.purgedAt = purgedAt ? new Date(purgedAt) : null;
        const row = await pc().agentApplicationDocument.update({ where: { id }, data });
        return toStoredAgentDoc(row);
      } catch (err) {
        console.error(`[prisma-dal] agentApplicationDoc.update failed for ${id}:`, err);
        return null;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        await pc().agentApplicationDocument.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },
    listUnpurged: async (): Promise<StoredAgentApplicationDocument[]> => {
      const rows = await pc().agentApplicationDocument.findMany({ where: { purgedAt: null } });
      return rows.map(toStoredAgentDoc);
    },
  },

  agentInvitation: {
    create: async (i: StoredAgentInvitation): Promise<StoredAgentInvitation> => {
      const row = await pc().agentInvitation.create({
        data: {
          id: i.id,
          applicationId: i.applicationId,
          phoneE164: i.phoneE164 ?? null,
          email: i.email ?? null,
          displayName: i.displayName,
          tokenHash: i.tokenHash,
          status: i.status,
          issuedById: i.issuedById,
          issuedAt: new Date(i.issuedAt),
          expiresAt: new Date(i.expiresAt),
          acceptedAt: i.acceptedAt ? new Date(i.acceptedAt) : null,
          acceptedUserId: i.acceptedUserId,
          declinedAt: i.declinedAt ? new Date(i.declinedAt) : null,
          revokedAt: i.revokedAt ? new Date(i.revokedAt) : null,
          revokedById: i.revokedById,
          createdAt: new Date(i.createdAt),
        },
      });
      return toStoredAgentInvitation(row);
    },
    findById: async (id: string): Promise<StoredAgentInvitation | null> => {
      const row = await pc().agentInvitation.findUnique({ where: { id } });
      return row ? toStoredAgentInvitation(row) : null;
    },
    findByTokenHash: async (tokenHash: string): Promise<StoredAgentInvitation | null> => {
      const row = await pc().agentInvitation.findUnique({ where: { tokenHash } });
      return row ? toStoredAgentInvitation(row) : null;
    },
    findLiveByPhone: async (phoneE164: string): Promise<StoredAgentInvitation | null> => {
      const row = await pc().agentInvitation.findFirst({ where: { phoneE164, status: "ISSUED" } });
      return row ? toStoredAgentInvitation(row) : null;
    },
    /** ⚠️ Case-insensitive: two invitations to `A@x.tz` and `a@x.tz` are two invitations to
     *  ONE mailbox, and the "only one live invitation per person" rule has to see them as the
     *  same person or it does not hold at all. */
    findLiveByEmail: async (email: string): Promise<StoredAgentInvitation | null> => {
      const row = await pc().agentInvitation.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" }, status: "ISSUED" } });
      return row ? toStoredAgentInvitation(row) : null;
    },
    update: async (id: string, patch: Partial<StoredAgentInvitation>): Promise<StoredAgentInvitation | null> => {
      try {
        const { issuedAt, expiresAt, acceptedAt, declinedAt, revokedAt, createdAt: _c, ...rest } = patch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = { ...rest };
        if (issuedAt !== undefined) data.issuedAt = new Date(issuedAt);
        if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
        if (acceptedAt !== undefined) data.acceptedAt = acceptedAt ? new Date(acceptedAt) : null;
        if (declinedAt !== undefined) data.declinedAt = declinedAt ? new Date(declinedAt) : null;
        if (revokedAt !== undefined) data.revokedAt = revokedAt ? new Date(revokedAt) : null;
        const row = await pc().agentInvitation.update({ where: { id }, data });
        return toStoredAgentInvitation(row);
      } catch (err) {
        console.error(`[prisma-dal] agentInvitation.update failed for ${id}:`, err);
        return null;
      }
    },
    list: async (): Promise<StoredAgentInvitation[]> => {
      const rows = await pc().agentInvitation.findMany({ orderBy: { issuedAt: "desc" } });
      return rows.map(toStoredAgentInvitation);
    },
  },

  // ── OBJECTION (F11) ───────────────────────────────────────────────────────
  // An OPEN row here freezes a market's settlement, so these are money-bearing
  // compliance records — they persist, they are never silently dropped.
  objection: {
    create: async (o: StoredObjection): Promise<StoredObjection> => {
      const row = await pc().objection.create({
        data: {
          id: o.id,
          marketId: o.marketId,
          userId: o.userId,
          reason: o.reason,
          detail: o.detail,
          status: o.status,
          createdAt: new Date(o.createdAt),
          reviewedBy: o.reviewedBy,
          reviewedAt: o.reviewedAt ? new Date(o.reviewedAt) : null,
          reviewNote: o.reviewNote,
          remedy: o.remedy,
          outcomeAtFiling: o.outcomeAtFiling,
        },
      });
      return toStoredObjection(row);
    },
    findById: async (id: string): Promise<StoredObjection | null> => {
      const row = await pc().objection.findUnique({ where: { id } });
      return row ? toStoredObjection(row) : null;
    },
    update: async (id: string, patch: Partial<StoredObjection>): Promise<StoredObjection | null> => {
      const row = await pc().objection.update({
        where: { id },
        data: {
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.reviewedBy !== undefined ? { reviewedBy: patch.reviewedBy } : {}),
          ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt ? new Date(patch.reviewedAt) : null } : {}),
          ...(patch.reviewNote !== undefined ? { reviewNote: patch.reviewNote } : {}),
          ...(patch.remedy !== undefined ? { remedy: patch.remedy } : {}),
        },
      });
      return toStoredObjection(row);
    },
    listForMarket: async (marketId: string): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ where: { marketId }, orderBy: { createdAt: "desc" } });
      return rows.map(toStoredObjection);
    },
    listForUser: async (userId: string): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
      return rows.map(toStoredObjection);
    },
    list: async (limit = 1000): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toStoredObjection);
    },
    /** Every objection UPHELD with a remedy that changed the verdict (REVERSE or VOID) — the market, the
     *  remedy, who ruled and when. Narrow on purpose (four columns, no player text, no cap): the public
     *  sign-off reads it, and a capped newest-1000 list would silently drop an old ruling (v3 review). */
    listUpheldRulings: async (): Promise<Array<{ marketId: string; remedy: string; reviewedBy: string | null; reviewedAt: string | null }>> => {
      const rows = await pc().objection.findMany({
        where: { status: "UPHELD", remedy: { in: ["REVERSE", "VOID"] } },
        select: { marketId: true, remedy: true, reviewedBy: true, reviewedAt: true },
      });
      return rows.map((r) => ({
        marketId: r.marketId, remedy: r.remedy ?? "", reviewedBy: r.reviewedBy ?? null,
        reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null,
      }));
    },
  },

  // ── PROPOSAL ──────────────────────────────────────────────────────────────
  proposal: {
    create: async (p: StoredProposal): Promise<StoredProposal> => {
      const row = await pc().proposal.create({
        data: {
          id: p.id,
          proposerId: p.proposerId,
          titleEn: p.titleEn,
          titleSw: p.titleSw,
          titleZh: p.titleZh,
          description: p.description,
          resolutionCriterion: p.resolutionCriterion,
          category: p.category,
          resolutionDate: p.resolutionDate,
          selectionCloseDate: p.selectionCloseDate,
          sourceUrl: p.sourceUrl,
          status: p.status,
          up: p.up,
          down: p.down,
          publishedMarketId: p.publishedMarketId,
          bonusGrantedTzs: p.bonusGrantedTzs,
          bonusGrantId: p.bonusGrantId,
          approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
          declineReason: p.declineReason,
          declineNote: p.declineNote,
          changeNote: p.changeNote,
          reviewedBy: p.reviewedBy,
          reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : null,
          createdAt: new Date(p.createdAt),
        },
      });
      return toStoredProposal(row);
    },
    findById: async (id: string): Promise<StoredProposal | null> => {
      const row = await pc().proposal.findUnique({ where: { id } });
      return row ? toStoredProposal(row) : null;
    },
    findByMarketId: async (marketId: string): Promise<StoredProposal | null> => {
      const row = await pc().proposal.findFirst({
        where: { publishedMarketId: marketId },
      });
      return row ? toStoredProposal(row) : null;
    },
    update: async (id: string, patch: Partial<StoredProposal>): Promise<StoredProposal | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "reviewedAt" || k === "approvedAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await pc().proposal.update({ where: { id }, data });
        return toStoredProposal(row);
      } catch {
        return null;
      }
    },
    list: async (limit = 1000): Promise<StoredProposal[]> => {
      const rows = await pc().proposal.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredProposal);
    },
    listByProposer: async (proposerId: string): Promise<StoredProposal[]> => {
      const rows = await pc().proposal.findMany({
        where: { proposerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredProposal);
    },
  },

  // ── PROPOSAL VOTE ─────────────────────────────────────────────────────────
  proposalVote: {
    get: async (proposalId: string, userId: string): Promise<StoredProposalVote | null> => {
      const row = await pc().proposalVote.findUnique({
        where: { proposalId_userId: { proposalId, userId } },
      });
      return row ? toStoredVote(row) : null;
    },
    set: async (v: StoredProposalVote): Promise<StoredProposalVote> => {
      const dir = v.dir.toUpperCase() as "UP" | "DOWN";
      const row = await pc().proposalVote.upsert({
        where: { proposalId_userId: { proposalId: v.proposalId, userId: v.userId } },
        create: {
          proposalId: v.proposalId,
          userId: v.userId,
          dir,
          createdAt: new Date(v.createdAt),
        },
        update: { dir },
      });
      return toStoredVote(row);
    },
    delete: async (proposalId: string, userId: string): Promise<void> => {
      await pc().proposalVote.deleteMany({
        where: { proposalId, userId },
      });
    },
    listByProposal: async (proposalId: string): Promise<StoredProposalVote[]> => {
      const rows = await pc().proposalVote.findMany({
        where: { proposalId },
      });
      return rows.map(toStoredVote);
    },
  },

  // ── EVENT CALENDAR (F8) ───────────────────────────────────────────────────
  event: {
    create: async (e: {
      title: string; category: string; startsAt: string; sourceUrl: string;
      note: string | null; addedBy: string;
    }): Promise<StoredEvent> => {
      const row = await pc().eventCalendar.create({
        data: {
          title: e.title, category: e.category, startsAt: new Date(e.startsAt),
          sourceUrl: e.sourceUrl, note: e.note, addedBy: e.addedBy,
        },
      });
      return toStoredEvent(row);
    },
    findById: async (id: string): Promise<StoredEvent | null> => {
      const row = await pc().eventCalendar.findUnique({ where: { id } });
      return row ? toStoredEvent(row) : null;
    },
    list: async (): Promise<StoredEvent[]> => {
      const rows = await pc().eventCalendar.findMany({ orderBy: { startsAt: "asc" } });
      return rows.map(toStoredEvent);
    },
    update: async (id: string, patch: { generatedAt?: string | null; aiPollId?: string | null }): Promise<void> => {
      await pc().eventCalendar.update({
        where: { id },
        data: {
          ...(patch.generatedAt !== undefined ? { generatedAt: patch.generatedAt ? new Date(patch.generatedAt) : null } : {}),
          ...(patch.aiPollId !== undefined ? { aiPollId: patch.aiPollId } : {}),
        },
      });
    },
    delete: async (id: string): Promise<void> => {
      await pc().eventCalendar.delete({ where: { id } }).catch(() => {});
    },
  },

  // ── WATCHLIST (F3) ────────────────────────────────────────────────────────
  watchlist: {
    isWatching: async (marketId: string, userId: string): Promise<boolean> => {
      const row = await pc().watchlist.findUnique({
        where: { marketId_userId: { marketId, userId } },
        select: { id: true },
      });
      return !!row;
    },
    add: async (marketId: string, userId: string): Promise<void> => {
      await pc().watchlist.upsert({
        where: { marketId_userId: { marketId, userId } },
        create: { marketId, userId },
        update: {},
      });
    },
    remove: async (marketId: string, userId: string): Promise<void> => {
      await pc().watchlist.deleteMany({ where: { marketId, userId } });
    },
    /** User ids watching a market — the alert fan-out set. */
    listWatcherIds: async (marketId: string): Promise<string[]> => {
      const rows = await pc().watchlist.findMany({ where: { marketId }, select: { userId: true } });
      return rows.map((r) => r.userId);
    },
    /** Market ids a user watches, newest first. */
    listMarketIdsForUser: async (userId: string): Promise<string[]> => {
      const rows = await pc().watchlist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { marketId: true },
      });
      return rows.map((r) => r.marketId);
    },
  },

  // ── PUSH SUBSCRIPTIONS (F4) ───────────────────────────────────────────────
  pushSub: {
    upsert: async (s: StoredPushSub): Promise<void> => {
      await pc().pushSubscription.upsert({
        where: { endpoint: s.endpoint },
        create: { userId: s.userId, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        update: { userId: s.userId, p256dh: s.p256dh, auth: s.auth },
      });
    },
    listForUser: async (userId: string): Promise<StoredPushSub[]> => {
      const rows = await pc().pushSubscription.findMany({ where: { userId } });
      return rows.map((r) => ({ userId: r.userId, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
    },
    /** Prune a dead endpoint (push service returned 404/410). */
    deleteByEndpoint: async (endpoint: string): Promise<void> => {
      await pc().pushSubscription.deleteMany({ where: { endpoint } });
    },
    countForUser: async (userId: string): Promise<number> => {
      return pc().pushSubscription.count({ where: { userId } });
    },
  },

  // ── BONUS GRANT ───────────────────────────────────────────────────────────
  bonusGrant: {
    create: async (g: StoredBonusGrant): Promise<StoredBonusGrant> => {
      const row = await pc().bonusGrant.create({
        data: {
          id: g.id,
          userId: g.userId,
          walletId: g.walletId,
          amountTzs: g.amountTzs,
          remainingTzs: g.remainingTzs,
          wagerMultiplier: g.wagerMultiplier,
          wagerRequiredTzs: g.wagerRequiredTzs,
          wageredTzs: g.wageredTzs,
          source: g.source,
          sourceRef: g.sourceRef,
          status: g.status,
          expiresAt: g.expiresAt ? new Date(g.expiresAt) : null,
          fulfilledAt: g.fulfilledAt ? new Date(g.fulfilledAt) : null,
          note: g.note,
          createdAt: new Date(g.createdAt),
        },
      });
      return toStoredBonusGrant(row);
    },
    findById: async (id: string): Promise<StoredBonusGrant | null> => {
      const row = await pc().bonusGrant.findUnique({ where: { id } });
      return row ? toStoredBonusGrant(row) : null;
    },
    findBySourceRef: async (sourceRef: string): Promise<StoredBonusGrant | null> => {
      const row = await pc().bonusGrant.findFirst({ where: { sourceRef } });
      return row ? toStoredBonusGrant(row) : null;
    },
    // tx (bet-stake single-tx): inside a money $transaction a DB error must
    // PROPAGATE so the whole movement rolls back — never swallow it to null
    // (same contract as wallet.adjust above). Self-committing mode keeps the
    // original catch → null contract.
    update: async (id: string, patch: Partial<StoredBonusGrant>, tx?: Prisma.TransactionClient | null): Promise<StoredBonusGrant | null> => {
      const run = async (): Promise<StoredBonusGrant | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "expiresAt" || k === "fulfilledAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await (tx ?? pc()).bonusGrant.update({ where: { id }, data });
        return toStoredBonusGrant(row);
      };
      if (tx) return run(); // let a db error propagate to roll back the tx
      try { return await run(); } catch { return null; }
    },
    listByUser: async (userId: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredBonusGrant);
    },
    // tx: see wallet.findByUserId — in-tx reads must use the tx client.
    listActiveByUser: async (userId: string, tx?: Prisma.TransactionClient | null): Promise<StoredBonusGrant[]> => {
      const rows = await (tx ?? pc()).bonusGrant.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }, // FIFO
      });
      return rows.map(toStoredBonusGrant);
    },
    /**
     * ACTIVE **and FULFILLED** grants for a user, OLDEST first — the population the wagering
     * REVERSAL path must see (E-224). ⛔ `listActiveByUser` is literally `status: "ACTIVE"`,
     * so a FULFILLED grant was never "left untouched by a condition you can see" — it was
     * INVISIBLE TO THE QUERY, and the bet that COMPLETED the wagering is precisely the one a
     * void / one-sided / cash-out refund gives back.
     * ⛔ DO NOT widen `listActiveByUser` instead. spendBonus, refundBonusToActive and the
     * expiry sweep must keep seeing ACTIVE only, and the bonusBalance invariant is
     * ACTIVE-scoped — widening it would put fulfilled money back in play.
     */
    listReversibleByUser: async (userId: string, tx?: Prisma.TransactionClient | null): Promise<StoredBonusGrant[]> => {
      const rows = await (tx ?? pc()).bonusGrant.findMany({
        where: { userId, status: { in: ["ACTIVE", "FULFILLED"] } },
        orderBy: { createdAt: "asc" }, // FIFO — the caller groups by status and reverses
      });
      return rows.map(toStoredBonusGrant);
    },
    listExpired: async (nowIso: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { status: "ACTIVE", expiresAt: { lt: new Date(nowIso) } },
      });
      return rows.map(toStoredBonusGrant);
    },
    listByStatus: async (status: BonusGrantStatus): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({ where: { status } });
      return rows.map(toStoredBonusGrant);
    },
    listAll: async (limit = 1000): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredBonusGrant);
    },
  },

  // ── INVITE CAMPAIGN ───────────────────────────────────────────────────────
  inviteCampaign: {
    create: async (c: StoredInviteCampaign): Promise<StoredInviteCampaign> => {
      const row = await pc().inviteCampaign.create({
        data: {
          id: c.id, code: c.code, name: c.name,
          bonusAmountTzs: c.bonusAmountTzs, wagerMultiplier: c.wagerMultiplier,
          expiresInDays: c.expiresInDays, messageEn: c.messageEn, messageSw: c.messageSw,
          status: c.status, totalInvites: c.totalInvites, totalRegistered: c.totalRegistered,
          createdById: c.createdById, createdAt: new Date(c.createdAt),
        },
      });
      return toStoredInviteCampaign(row);
    },
    findById: async (id: string): Promise<StoredInviteCampaign | null> => {
      const row = await pc().inviteCampaign.findUnique({ where: { id } });
      return row ? toStoredInviteCampaign(row) : null;
    },
    findByCode: async (code: string): Promise<StoredInviteCampaign | null> => {
      const row = await pc().inviteCampaign.findUnique({ where: { code: code.trim().toUpperCase() } });
      return row ? toStoredInviteCampaign(row) : null;
    },
    update: async (id: string, patch: Partial<StoredInviteCampaign>): Promise<StoredInviteCampaign | null> => {
      try {
        const { createdAt: _c, updatedAt: _u, ...rest } = patch;
        const row = await pc().inviteCampaign.update({ where: { id }, data: rest });
        return toStoredInviteCampaign(row);
      } catch {
        return null;
      }
    },
    incrementCounters: async (id: string, deltas: { invites?: number; registered?: number }): Promise<StoredInviteCampaign | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        if (deltas.invites !== undefined) data.totalInvites = { increment: deltas.invites };
        if (deltas.registered !== undefined) data.totalRegistered = { increment: deltas.registered };
        const row = await pc().inviteCampaign.update({ where: { id }, data });
        return toStoredInviteCampaign(row);
      } catch {
        return null;
      }
    },
    list: async (limit = 500): Promise<StoredInviteCampaign[]> => {
      const rows = await pc().inviteCampaign.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toStoredInviteCampaign);
    },
  },

  // ── INVITE ENTRY ──────────────────────────────────────────────────────────
  inviteEntry: {
    create: async (e: StoredInviteEntry): Promise<StoredInviteEntry> => {
      const row = await pc().inviteEntry.create({
        data: {
          id: e.id, campaignId: e.campaignId, contactType: e.contactType,
          contactValue: e.contactValue, bonusAmountTzs: e.bonusAmountTzs, status: e.status,
          sentAt: e.sentAt ? new Date(e.sentAt) : null,
          registeredUserId: e.registeredUserId, bonusGrantId: e.bonusGrantId,
          failureReason: e.failureReason, createdAt: new Date(e.createdAt),
        },
      });
      return toStoredInviteEntry(row);
    },
    findById: async (id: string): Promise<StoredInviteEntry | null> => {
      const row = await pc().inviteEntry.findUnique({ where: { id } });
      return row ? toStoredInviteEntry(row) : null;
    },
    findByCampaign: async (campaignId: string): Promise<StoredInviteEntry[]> => {
      const rows = await pc().inviteEntry.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
      return rows.map(toStoredInviteEntry);
    },
    findByCampaignAndContact: async (campaignId: string, contactValue: string): Promise<StoredInviteEntry | null> => {
      const row = await pc().inviteEntry.findUnique({ where: { campaignId_contactValue: { campaignId, contactValue } } });
      return row ? toStoredInviteEntry(row) : null;
    },
    update: async (id: string, patch: Partial<StoredInviteEntry>): Promise<StoredInviteEntry | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt") continue;
          if (k === "sentAt") data[k] = v ? new Date(v as string) : null;
          else data[k] = v;
        }
        const row = await pc().inviteEntry.update({ where: { id }, data });
        return toStoredInviteEntry(row);
      } catch {
        return null;
      }
    },
  },

  smsMessage: {
    create: async (m: StoredSmsMessage): Promise<StoredSmsMessage> => {
      const row = await pc().smsMessage.create({
        data: {
          reference: m.reference, msisdn: m.msisdn, purpose: m.purpose, provider: m.provider,
          senderId: m.senderId, bodyLen: m.bodyLen, status: m.status, providerMsg: m.providerMsg,
          dlrStatus: m.dlrStatus, dlrDesc: m.dlrDesc, balanceTzs: m.balanceTzs,
          attempts: m.attempts, targetType: m.targetType, targetId: m.targetId,
          createdAt: new Date(m.createdAt),
          sentAt: m.sentAt ? new Date(m.sentAt) : null,
          deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : null,
          failedAt: m.failedAt ? new Date(m.failedAt) : null,
        },
      });
      return toStoredSmsMessage(row);
    },
    createMany: async (ms: StoredSmsMessage[]): Promise<StoredSmsMessage[]> => {
      // `createMany` cannot return rows, and these are written BEFORE the HTTP call so a
      // crash mid-send still leaves a row for a receipt to land on. The input IS the row.
      if (ms.length === 0) return [];
      await pc().smsMessage.createMany({
        data: ms.map((m) => ({
          reference: m.reference, msisdn: m.msisdn, purpose: m.purpose, provider: m.provider,
          senderId: m.senderId, bodyLen: m.bodyLen, status: m.status, providerMsg: m.providerMsg,
          dlrStatus: m.dlrStatus, dlrDesc: m.dlrDesc, balanceTzs: m.balanceTzs,
          attempts: m.attempts, targetType: m.targetType, targetId: m.targetId,
          createdAt: new Date(m.createdAt),
          sentAt: m.sentAt ? new Date(m.sentAt) : null,
          deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : null,
          failedAt: m.failedAt ? new Date(m.failedAt) : null,
        })),
        skipDuplicates: true,
      });
      return ms;
    },
    findByReference: async (reference: string): Promise<StoredSmsMessage | null> => {
      const row = await pc().smsMessage.findUnique({ where: { reference } });
      return row ? toStoredSmsMessage(row) : null;
    },
    update: async (reference: string, patch: Partial<StoredSmsMessage>): Promise<StoredSmsMessage | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        const spec = SMS_MESSAGE_COLUMN[k as keyof StoredSmsMessage];
        if (spec === null) continue;
        if (spec === undefined) {
          throw new Error(`[prisma-dal] smsMessage.update: unmapped field "${k}" — add it to SMS_MESSAGE_COLUMN or it is a silent production no-op.`);
        }
        data[k] = spec === "date" ? (v ? new Date(v as string) : null) : v;
      }
      if (Object.keys(data).length === 0) {
        const row = await pc().smsMessage.findUnique({ where: { reference } });
        return row ? toStoredSmsMessage(row) : null;
      }
      try {
        const row = await pc().smsMessage.update({ where: { reference }, data });
        return toStoredSmsMessage(row);
      } catch (err) {
        console.error(`[prisma-dal] smsMessage.update failed for ${reference}:`, err);
        return null;
      }
    },
    /**
     * Apply a delivery receipt, monotonically — the same rule the memory DAL enforces.
     *
     * ⭐ THE GUARD IS IN THE `where`, NOT IN A READ-THEN-WRITE. Two containers handed the
     * same receipt would both read QUEUED and both write, and the second would overwrite
     * the first's timestamps. A conditional `updateMany` lets Postgres decide once: a row
     * already DELIVERED or FAILED matches nothing, `count` is 0, and `changed` is false.
     * That is what makes the provider's at-least-once retry a genuine no-op rather than a
     * race we happen to usually win.
     */
    recordDlr: async (reference: string, d: SmsDlr): Promise<SmsDlrResult> => {
      // The raw token is recorded even when it moves nothing — that is how the vendor's
      // undocumented vocabulary gets learned from production rather than guessed here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stamp: Record<string, any> = { dlrStatus: d.rawStatus, dlrDesc: d.desc };
      let changed = false;
      if (d.status !== null) {
        const when = new Date(d.at);
        const r = await pc().smsMessage.updateMany({
          where: { reference, status: { notIn: ["DELIVERED", "FAILED"] } },
          data: {
            ...stamp,
            status: d.status,
            ...(d.status === "DELIVERED" ? { deliveredAt: when } : {}),
            ...(d.status === "FAILED" ? { failedAt: when } : {}),
          },
        });
        changed = r.count > 0;
      }
      if (!changed) {
        // Either the token was unrecognised or the row was already settled. Record the
        // observation without touching `status`. ⛔ Never default an unknown token to
        // DELIVERED — that is reporting delivery we have no evidence for, on the rail
        // that carries login codes.
        await pc().smsMessage.updateMany({ where: { reference }, data: stamp });
      }
      const row = await pc().smsMessage.findUnique({ where: { reference } });
      return { changed, row: row ? toStoredSmsMessage(row) : null };
    },
    countSince: async (sinceIso: string, purpose?: StoredSmsMessage["purpose"]): Promise<number> =>
      pc().smsMessage.count({ where: { createdAt: { gte: new Date(sinceIso) }, ...(purpose ? { purpose } : {}) } }),
    listRecent: async (limit = 50): Promise<StoredSmsMessage[]> => {
      const rows = await pc().smsMessage.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toStoredSmsMessage);
    },
    /** U43a · THE REAPER'S EVIDENCE (E6) — ONE findMany of every message of the type asked for the targets named (the
     *  `(targetType, targetId)` index), then `newestPerTarget`, the ONE rule the memory twin answers through: the newest
     *  per target, none for a target without one, ordered by target id. The rule set is asked first (at most 200 ids).
     *  ⛔ NO `take`: a target whose message fell outside a cut would read "never sent", go back to PENDING and be sent
     *  again. An empty list asks nothing. ⚠️ The newest message EVER for each target, not bounded by the row's claim —
     *  that bound is the reaper's (`newestPerTarget`, DC-1). */
    findByTargets: async (targetType: string, targetIds: readonly string[]): Promise<StoredSmsMessage[]> => {
      assertTargetsRead(targetType, targetIds);
      if (targetIds.length === 0) return [];
      const rows = await pc().smsMessage.findMany({ where: { targetType, targetId: { in: [...new Set(targetIds)] } } });
      return newestPerTarget(rows.map(toStoredSmsMessage));
    },
  },
  /* ═══ MESSAGING CONSENT (marketing U6) ═══════════════════════════════════════════════
   * ⛔ NO `update`, NO `delete` — the append-only rule, enforced by there being no method
   * to call. `dal-parity` §17 asserts their absence in BOTH twins. */
  messagingConsent: {
    create: async (row: StoredMessagingConsent): Promise<StoredMessagingConsent> => {
      const created = await pc().messagingConsent.create({
        data: {
          id: row.id, channel: row.channel, identifier: row.identifier, category: row.category,
          status: row.status, source: row.source, wording: row.wording, locale: row.locale,
          evidence: row.evidence, recordedBy: row.recordedBy,
          createdAt: new Date(row.createdAt),
        },
      });
      return toStoredMessagingConsent(created);
    },
    /** ⭐ The tiebreak on `id` matches the memory twin exactly: two rows can share a
     *  millisecond, and a gate that breaks the tie differently in memory than in Postgres
     *  answers differently in a test than it does on production. */
    latestFor: async (key: MessagingKey): Promise<StoredMessagingConsent | null> => {
      const row = await pc().messagingConsent.findFirst({
        where: { channel: key.channel, identifier: key.identifier, category: key.category },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return row ? toStoredMessagingConsent(row) : null;
    },
    listFor: async (key: MessagingKey): Promise<StoredMessagingConsent[]> => {
      const rows = await pc().messagingConsent.findMany({
        where: { channel: key.channel, identifier: key.identifier, category: key.category },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredMessagingConsent);
    },
    /** §25 · each number's LATEST word — `latestFor` asked of a set: ONE query in the ledger's own order
     *  (`createdAt desc, id desc`, served by the [channel, identifier, category, createdAt] index), the FIRST row per
     *  number kept. A number with no row is absent. */
    latestAmong: async (q: MessagingKeyBatch): Promise<StoredMessagingConsent[]> => {
      const keys = bulkKeys(q.identifiers, "messagingConsent.latestAmong");
      if (keys.length === 0) return [];
      const rows = await pc().messagingConsent.findMany({
        where: { channel: q.channel, category: q.category, identifier: { in: keys } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const latest = new Map<string, StoredMessagingConsent>();
      for (const r of rows) if (!latest.has(r.identifier)) latest.set(r.identifier, toStoredMessagingConsent(r));
      return Array.from(latest.values()).sort((a, b) => (a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0));
    },
    /** ⛔ C8a · the numbers among these on which an ERASURE STANDS — the ONE rule (`erasure-mark.ts`): ONE query in the
     *  ledger's own order (`createdAt desc, id desc`, served by the [channel, identifier, category, createdAt] index), the
     *  two columns the rule reads and the key, handed to `erasureStandsAmongRows` — the function the memory twin answers
     *  through. ⛔ No status filter in the query: the rule alone says which rows decide (a later opt-out never lifts an
     *  erasure; a GIVEN does), so Postgres and memory cannot disagree on it. §25's shape: through `bulkKeys`, an empty set
     *  answered with no query. Executed on Postgres by `scripts/live/contacts-import-pg-probe.mts` section 7. */
    erasureStandsAmong: async (q: MessagingKeyBatch): Promise<string[]> => {
      const keys = bulkKeys(q.identifiers, "messagingConsent.erasureStandsAmong");
      if (keys.length === 0) return [];
      const rows = await pc().messagingConsent.findMany({
        where: { channel: q.channel, category: q.category, identifier: { in: keys } },
        select: { identifier: true, status: true, evidence: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return erasureStandsAmongRows(keys, rows);
    },
  },

  /* ═══ SUPPRESSION (marketing U6, lift U8) ════════════════════════════════════════════
   * ⛔ NO `delete`, EVER — and ⛔ NOT BY RESUBSCRIBE EITHER. A lift SUPERSEDES the row. */
  suppression: {
    /** ⭐ IDEMPOTENT ON THE TRIPLE, and the update block is deliberate rather than a stub: a
     *  repeat suppression must leave the ORIGINAL row's `createdAt` exactly where it is,
     *  because that timestamp is the answer to "when did they say no". An update that
     *  refreshed it would quietly move the date forward on every re-import.
     *
     *  🔴 IT CLEARS A LIFT, AND THAT IS THE SECOND FALSE SUCCESS — the one in the opposite
     *  direction from the one U8 was written to prevent. Once a row can be lifted,
     *  `stop → start again → stop again` returns through here, and an EMPTY update block
     *  would hand back the LIFTED row untouched: the page would tell the person they will
     *  never be marketed again while the suppression stayed lifted and the next campaign
     *  sent to them. ⛔ So the update clears the lift and touches NOTHING else — above all
     *  not `createdAt`, which is why this is not a plain overwrite.
     *
     *  🔴 AND THE REASON FOLLOWS THE STOP NOW IN FORCE (see the memory twin): a row being re-armed
     *  takes the new refusal's reason and evidence, and a non-`WITHDRAWN` refusal over an active
     *  `WITHDRAWN` row takes it over — otherwise a person's old stop hides a complaint or an
     *  officer's stop from `personMayLift`. Two conditional updates BEFORE the upsert, so the
     *  upsert's own update block still touches nothing but the lift. */
    create: async (row: StoredSuppression): Promise<StoredSuppression> => {
      const triple = { channel: row.channel, identifier: row.identifier, category: row.category };
      const takeOver = { reason: row.reason, evidence: row.evidence, recordedBy: row.recordedBy };
      await pc().suppression.updateMany({ where: { ...triple, liftedAt: { not: null } }, data: takeOver });
      if (row.reason !== "WITHDRAWN") {
        await pc().suppression.updateMany({ where: { ...triple, reason: "WITHDRAWN", liftedAt: null }, data: takeOver });
      }
      const created = await pc().suppression.upsert({
        where: {
          channel_identifier_category: {
            channel: row.channel, identifier: row.identifier, category: row.category,
          },
        },
        update: { liftedAt: null, liftedReason: null },
        create: {
          id: row.id, channel: row.channel, identifier: row.identifier, category: row.category,
          reason: row.reason, evidence: row.evidence, recordedBy: row.recordedBy,
          createdAt: new Date(row.createdAt),
          liftedAt: row.liftedAt === null ? null : new Date(row.liftedAt),
          liftedReason: row.liftedReason,
        },
      });
      return toStoredSuppression(created);
    },
    /** ⭐ ACTIVE ONLY — `liftedAt: null` is part of the QUESTION, not a filter applied after.
     *  See the memory twin for why the plainest name is the one that answers safely: a caller
     *  who forgets that rows can be lifted over-refuses, which is lawful; the arrangement
     *  where they under-refuse is a breach. ⛔ The row is still there — `listFor` returns it. */
    find: async (key: MessagingKey): Promise<StoredSuppression | null> => {
      const row = await pc().suppression.findFirst({
        where: {
          channel: key.channel, identifier: key.identifier, category: key.category,
          liftedAt: null,
        },
      });
      return row ? toStoredSuppression(row) : null;
    },
    /** ⭐ SUPERSEDE, NEVER DELETE (U8). `updateMany` scoped to `liftedAt: null` does two jobs
     *  in one statement: it is the only write, and it is what stops a SECOND lift moving the
     *  date forward — the date is evidence, exactly as `createdAt` is. A count of 0 means
     *  there was no ACTIVE row, and the caller is told null rather than a change that did not
     *  happen. ⛔ `deleteMany` would satisfy the caller identically and is the whole reason
     *  `dal-parity` §17 asserts the absence of a delete in both twins. */
    lift: async (key: MessagingKey, reason: string | null, at: string): Promise<StoredSuppression | null> => {
      const hit = await pc().suppression.updateMany({
        where: {
          channel: key.channel, identifier: key.identifier, category: key.category,
          liftedAt: null,
          // ⛔ Only a person's own stop is liftable — see the memory twin.
          reason: "WITHDRAWN",
        },
        data: { liftedAt: new Date(at), liftedReason: reason },
      });
      if (hit.count === 0) return null;
      const row = await pc().suppression.findUnique({
        where: {
          channel_identifier_category: {
            channel: key.channel, identifier: key.identifier, category: key.category,
          },
        },
      });
      return row ? toStoredSuppression(row) : null;
    },
    /** ⛔ EVERY ROW, LIFTED OR NOT. This is the reader that proves a lift removed nothing. */
    listFor: async (identifier: string): Promise<StoredSuppression[]> => {
      const rows = await pc().suppression.findMany({
        where: { identifier },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredSuppression);
    },
    /** §25 · the stops STILL IN FORCE among a set of numbers — `find` asked of a set, ONE query, and `liftedAt: null`
     *  part of the QUESTION exactly as it is in `find`. ⛔ A lifted row is not returned; `listFor` still returns it. */
    findActiveAmong: async (q: MessagingKeyBatch): Promise<StoredSuppression[]> => {
      const keys = bulkKeys(q.identifiers, "suppression.findActiveAmong");
      if (keys.length === 0) return [];
      const rows = await pc().suppression.findMany({
        where: { channel: q.channel, category: q.category, identifier: { in: keys }, liftedAt: null },
        orderBy: [{ identifier: "asc" }, { id: "asc" }],
      });
      return rows.map(toStoredSuppression);
    },
  },
  /* ═══ OPT-OUT TOKENS (marketing U8) ══════════════════════════════════════════════════════
   * ⛔ NO `delete` — OD43's link never expires. */
  marketingOptOutToken: {
    /** ⭐ A TAKEN TOKEN COMES BACK AS null, NOT AS A THROW AND NOT AS AN OVERWRITE. `upsert`
     *  here would silently re-point a live opt-out link at a different person; letting P2002
     *  escape would make every caller handle a Prisma error code. The memory twin returns the
     *  same null, so the mint's retry loop is one piece of code on both backends. */
    create: async (row: StoredMarketingOptOutToken): Promise<StoredMarketingOptOutToken | null> => {
      try {
        const created = await pc().marketingOptOutToken.create({
          data: {
            token: row.token, channel: row.channel, identifier: row.identifier,
            category: row.category, createdAt: new Date(row.createdAt),
          },
        });
        return toStoredMarketingOptOutToken(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;
        throw err;
      }
    },
    find: async (token: string): Promise<StoredMarketingOptOutToken | null> => {
      const row = await pc().marketingOptOutToken.findUnique({ where: { token } });
      return row ? toStoredMarketingOptOutToken(row) : null;
    },
    listFor: async (identifier: string): Promise<StoredMarketingOptOutToken[]> => {
      const rows = await pc().marketingOptOutToken.findMany({
        where: { identifier },
        orderBy: [{ createdAt: "desc" }, { token: "desc" }],
      });
      return rows.map(toStoredMarketingOptOutToken);
    },
  },

  /* ═══ THE CONTACT BOOK (marketing U18) ═══════════════════════════════════════════════════
   * ⛔ `msisdn` IS UNIQUE AND POSTGRES ENFORCES IT. `create` turns the P2002 into null rather
   * than letting it escape or papering over it with an `upsert` — an upsert would silently
   * re-point an existing person's row at whatever the importer happened to be holding. The
   * memory twin refuses the same way and returns the same null, so an importer's
   * already-in-the-book branch is one piece of code on both backends. `test:dal-parity` §19
   * asserts both halves. */
  marketingContact: {
    create: async (row: StoredMarketingContact): Promise<StoredMarketingContact | null> => {
      try {
        const created = await pc().marketingContact.create({
          data: {
            id: row.id, msisdn: row.msisdn, rawInput: row.rawInput,
            displayName: row.displayName, email: row.email, ndc: row.ndc,
            operator: row.operator, source: row.source as never, sourceRef: row.sourceRef,
            userId: row.userId, consentState: row.consentState as never,
            suppressedAt: row.suppressedAt ? new Date(row.suppressedAt) : null,
            tags: row.tags, notes: row.notes, importId: row.importId,
            createdAt: new Date(row.createdAt), createdBy: row.createdBy,
            updatedAt: new Date(row.updatedAt), updatedBy: row.updatedBy,
          },
        });
        return toStoredMarketingContact(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;
        throw err;
      }
    },
    find: async (id: string): Promise<StoredMarketingContact | null> => {
      const row = await pc().marketingContact.findUnique({ where: { id } });
      return row ? toStoredMarketingContact(row) : null;
    },
    /** ⭐ BY THE ONE KEY. `msisdn` is `@unique`, so this is an index lookup, not a scan. */
    findByMsisdn: async (msisdn: string): Promise<StoredMarketingContact | null> => {
      const row = await pc().marketingContact.findUnique({ where: { msisdn } });
      return row ? toStoredMarketingContact(row) : null;
    },
    /** §25 · WHICH of these keys the book holds — `findByMsisdn` asked of a set, ONE query on the unique `msisdn`, and
     *  ⛔ KEY-ONLY: a `select` of the key, so a book row's name, email and notes never leave Postgres. A row carrying
     *  `excludeSourceRef` is left out NULL-SAFELY — `"sourceRef" <> $1` alone would drop every row with no mark, which
     *  is nearly the whole book — so the exclusion carries the NULL arm, as the audience where does. */
    msisdnsPresent: async (q: MarketingContactPresenceQuery): Promise<string[]> => {
      const keys = bulkKeys(q.msisdns, "marketingContact.msisdnsPresent");
      if (keys.length === 0) return [];
      const rows = await pc().marketingContact.findMany({
        where: q.excludeSourceRef === null
          ? { msisdn: { in: keys } }
          : { msisdn: { in: keys }, OR: [{ sourceRef: null }, { sourceRef: { not: q.excludeSourceRef } }] },
        select: { msisdn: true },
      });
      return rows.map((r) => r.msisdn).sort();
    },
    /** U33r · the third pass's MINOR-2 · the ADDRESS each of these numbers' book rows holds — ONE query on the unique
     *  `msisdn`, selecting the number and the address only (never the row); a row with no address is left out. */
    emailsAmong: async (msisdns: string[]): Promise<MarketingContactEmailEntry[]> => {
      const keys = bulkKeys(msisdns, "marketingContact.emailsAmong");
      if (keys.length === 0) return [];
      const rows = await pc().marketingContact.findMany({ where: { msisdn: { in: keys } }, select: { msisdn: true, email: true } });
      return rows
        .filter((r) => typeof r.email === "string" && r.email.trim() !== "")
        .map((r) => ({ msisdn: r.msisdn, email: r.email as string }))
        .sort((a, b) => (a.msisdn < b.msisdn ? -1 : a.msisdn > b.msisdn ? 1 : 0));
    },
    /** §29 · S15 · THE BOOK ROWS BEHIND A SET OF NUMBERS — what the importer's decide() reads: ONE query on the unique
     *  `msisdn`, a `select` of exactly the ten columns decide() needs (never the consent cache or the raw input) — the
     *  account link among them (S15-11: a linked row is never changed by a file). ⛔ THE ERASED TOMBSTONE IS INCLUDED
     *  (X22) — there is deliberately no sourceRef filter here. §25's bound through bulkKeys; an empty set answered before
     *  any query. Ordered by number. */
    snapshotsAmong: async (msisdns: string[]): Promise<MarketingContactSnapshot[]> => {
      const keys = bulkKeys(msisdns, "marketingContact.snapshotsAmong");
      if (keys.length === 0) return [];
      const rows = await pc().marketingContact.findMany({
        where: { msisdn: { in: keys } },
        select: { id: true, msisdn: true, displayName: true, email: true, notes: true, tags: true, sourceRef: true, importId: true, updatedAt: true, userId: true },
      });
      return rows
        .map((r): MarketingContactSnapshot => ({
          id: r.id, msisdn: r.msisdn, displayName: r.displayName, email: r.email, notes: r.notes, tags: r.tags,
          sourceRef: r.sourceRef, importId: r.importId, updatedAt: r.updatedAt.toISOString(), userId: r.userId,
        }))
        .sort((a, b) => (a.msisdn < b.msisdn ? -1 : a.msisdn > b.msisdn ? 1 : 0));
    },
    /** Every book row LINKED to an account — erasure's reach (U18b). `userId` is indexed. */
    listByUserId: async (userId: string): Promise<StoredMarketingContact[]> => {
      const rows = await pc().marketingContact.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredMarketingContact);
    },
    /** U33r · the book's numbers held under ONE e-mail address, case-insensitive — KEY-ONLY (the number alone, never the
     *  row), sorted. A referee named only by e-mail is keyed under every number the book holds for that address (the
     *  U33r review's MINOR-1). A blank address answers nothing, with no query. */
    msisdnsByEmail: async (email: string): Promise<string[]> => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      // ONE line on purpose: §25's red anchor plants the presence read's own `select` line, which must stay unique.
      const rows = await pc().marketingContact.findMany({ where: { email: { equals: norm, mode: "insensitive" } }, select: { msisdn: true } });
      return rows.map((r) => r.msisdn).sort();
    },
    /** ⛔ `msisdn` is not patchable (see `MarketingContactPatch`), so the unique index can
     *  never need re-pointing here. `updatedAt` is passed EXPLICITLY rather than left to
     *  `@updatedAt`, so both twins stamp the same value from the same caller. */
    update: async (id: string, patch: MarketingContactPatch, at: string): Promise<StoredMarketingContact | null> => {
      try {
        const updated = await pc().marketingContact.update({
          where: { id },
          data: {
            ...(patch.rawInput !== undefined ? { rawInput: patch.rawInput } : {}),
            ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            ...(patch.ndc !== undefined ? { ndc: patch.ndc } : {}),
            ...(patch.operator !== undefined ? { operator: patch.operator } : {}),
            ...(patch.source !== undefined ? { source: patch.source as never } : {}),
            ...(patch.sourceRef !== undefined ? { sourceRef: patch.sourceRef } : {}),
            ...(patch.userId !== undefined ? { userId: patch.userId } : {}),
            ...(patch.consentState !== undefined ? { consentState: patch.consentState as never } : {}),
            ...(patch.suppressedAt !== undefined ? { suppressedAt: patch.suppressedAt ? new Date(patch.suppressedAt) : null } : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.importId !== undefined ? { importId: patch.importId } : {}),
            ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
            updatedAt: new Date(at),
          },
        });
        return toStoredMarketingContact(updated);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2025") return null;
        throw err;
      }
    },
    /** U22 · ⭐ COMPARE-AND-SET — the edit form's ONE write. ONE conditional UPDATE: the row is written only where
     *  `updatedAt` still equals the instant the dialog was rendered with (Prisma's unique `where` takes the extra
     *  filter), so two officers' saves cannot both land, and the row handed back is exactly the row written. A
     *  refused compare raises P2025, read back once to tell "gone" from "changed since". ⛔ `updatedAt` is written
     *  EXPLICITLY from the caller's `at` (decision C25) — the column is `@updatedAt`, and leaving it to Prisma would
     *  stamp a different value from the memory twin's, so the next compare would disagree between the backends.
     *  ⛔ `data` names the four fields and the stamp; the number, `sourceRef`, the link and the caches are not in
     *  `ContactEditPatch` and never in this write (`test:dal-parity` §22). */
    updateIfUnchanged: async (id: string, patch: ContactEditPatch, guard: ContactEditGuard, at: string): Promise<ContactCasResult> => {
      try {
        const written = await pc().marketingContact.update({
          where: { id, updatedAt: new Date(guard.expectedUpdatedAt) },
          data: {
            displayName: patch.displayName,
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            notes: patch.notes,
            tags: patch.tags,
            updatedBy: patch.updatedBy,
            updatedAt: new Date(at),
          },
        });
        return { ok: true, row: toStoredMarketingContact(written) };
      } catch (err) {
        if ((err as { code?: string })?.code !== "P2025") throw err;
        const still = await pc().marketingContact.findUnique({ where: { id } });
        return { ok: false, reason: still ? "stale" : "not_found" };
      }
    },
    /** C8b (B1) · ⭐ THE TOMBSTONE REVIVED AS A NEW CLIENT'S ROW — ONE interactive transaction whose FIRST statement is the
     *  compare-and-set: ONE conditional update, written only where the row is still the tombstone — this id AND this
     *  number, the erasure's mark, no link (Postgres re-checks the where after a racing commit, so of two sign-ups one
     *  revives it and the loser counts 0, answered null with nothing written) — writing every field of the sign-up's row
     *  but the id, the number and the two caches, which stay the tombstone's. Then its list memberships are DELETED in the
     *  same transaction (a revived row inherits no old list, and no old list's coverage), and the row is read back inside
     *  it. ⛔ `updatedAt` is written EXPLICITLY (decision C25), never left to `@updatedAt`. The memory twin mirrors it;
     *  `test:dal-parity` §31 holds the pair, and `scripts/live/contacts-import-pg-probe.mts` section 8 runs it here. */
    reviveTombstone: async (revival: ContactTombstoneRevival): Promise<ContactTombstoneRevived | null> => {
      const r = revival.row;
      return pc().$transaction(async (tx) => {
        const won = await tx.marketingContact.updateMany({
          where: { id: revival.id, msisdn: revival.msisdn, sourceRef: ERASURE_EVIDENCE, userId: null },
          data: {
            rawInput: r.rawInput, displayName: r.displayName, email: r.email, ndc: r.ndc, operator: r.operator,
            source: r.source as never, sourceRef: r.sourceRef, userId: r.userId, tags: r.tags, notes: r.notes,
            importId: r.importId, createdAt: new Date(r.createdAt), createdBy: r.createdBy,
            updatedAt: new Date(r.updatedAt), updatedBy: r.updatedBy,
          },
        });
        if (won.count !== 1) return null;
        const membershipsDeleted = (await tx.contactListMember.deleteMany({ where: { contactId: revival.id } })).count;
        const row = await tx.marketingContact.findUnique({ where: { id: revival.id } });
        if (row === null) throw new Error("reviveTombstone: the revived row is not there inside its own transaction");
        return { row: toStoredMarketingContact(row), membershipsDeleted };
      }, { timeout: CONTACT_REVIVE_TX_TIMEOUT_MS, maxWait: 5_000 });
    },
    /** C8b (B8) · ⭐ "ADDED" PUT RIGHT, ALL OR NOTHING — ONE interactive transaction, the ONE shape rule first
     *  (`assertAddedRedates`, before any statement). Each row is ONE conditional update: written only where the row still
     *  holds its expected `createdAt` (compared as the column's own instant), its `createdAt` set to the moment it entered
     *  the book and its `updatedAt` to the LATER of its own and that moment (`greatest`). ⛔ Raw SQL on purpose: the column
     *  is `@updatedAt`, and Prisma's update would stamp the clock over the instant this write chooses. A row that counts 0
     *  throws inside the transaction, so Postgres rolls back every row before it, and the answer names it — `changed`,
     *  nothing written. The memory twin mirrors it; `test:dal-parity` §31 holds the pair; the pg probe's section 8 runs it. */
    redateAdded: async (rows: ContactAddedRedate[]): Promise<ContactAddedRedateResult> => {
      assertAddedRedates(rows);
      if (rows.length === 0) return { ok: true, written: 0 };
      try {
        return await pc().$transaction(async (tx) => {
          for (const r of rows) {
            const n = await tx.$executeRaw`
              update "MarketingContact"
                 set "createdAt" = ${r.createdAt}::timestamptz, "updatedAt" = greatest("updatedAt", ${r.createdAt}::timestamptz)
               where "id" = ${r.id} and "createdAt" = ${r.expectedCreatedAt}::timestamptz`;
            if (n !== 1) throw new ContactAddedRedateChanged(r.id);
          }
          return { ok: true as const, written: rows.length };
        }, { timeout: CONTACT_REDATE_TX_TIMEOUT_MS, maxWait: 5_000 });
      } catch (err) {
        if (err instanceof ContactAddedRedateChanged) return { ok: false, reason: "changed", id: err.id };
        throw err;
      }
    },
    /** U20 · ONE PAGE and the whole match's count, in one round trip each. ⛔ The number is matched EXACTLY
     *  (`msisdn` equals); a name goes through the shared grammar's `queryToWhere`, and an unexpressible
     *  query is ZERO rows, never everything. The order mirrors the memory twin: nameless last, ties on id.
     *  U24 · the match is the audience where, through `toPrismaContactWhere` — the one translation. */
    page: async (q: ContactPageQuery): Promise<ContactPage> => {
      const where = toPrismaContactWhere(q.where);
      if (where === null) return { rows: [], total: 0 };
      const orderBy = (q.sort === "name"
        ? [{ displayName: { sort: q.dir, nulls: "last" } }, { id: q.dir }]
        : q.sort === "operator"
          ? [{ ndc: q.dir }, { id: q.dir }]
          : [{ createdAt: q.dir }, { id: q.dir }]) as never;
      const [rows, total] = await Promise.all([
        pc().marketingContact.findMany({ where, orderBy, skip: q.offset, take: q.limit }),
        pc().marketingContact.count({ where }),
      ]);
      return { rows: rows.map(toStoredMarketingContact), total };
    },
    /** U24 · how many rows an audience holds — one count, never the rows. */
    countWhere: async (w: ContactAudienceWhere): Promise<number> => {
      const where = toPrismaContactWhere(w);
      return where === null ? 0 : pc().marketingContact.count({ where });
    },
    /** U24 · an audience's counts — one groupBy and one count, never the rows. REPLACES U20's whole-book
     *  `summary()`: the KPI band asks for the whole book through the resolver (`contactAudience(WHOLE_BOOK)`). */
    summaryWhere: async (w: ContactAudienceWhere): Promise<ContactBookSummary> => {
      const out: ContactBookSummary = { total: 0, given: 0, unknown: 0, withdrawn: 0, suppressed: 0 };
      const where = toPrismaContactWhere(w);
      if (where === null) return out;
      const [groups, suppressed] = await Promise.all([
        pc().marketingContact.groupBy({ by: ["consentState"], where, _count: { _all: true } }),
        pc().marketingContact.count({ where: { AND: [where, { suppressedAt: { not: null } }] } }),
      ]);
      out.suppressed = suppressed;
      for (const g of groups as Array<{ consentState: string; _count: { _all: number } }>) {
        out.total += g._count._all;
        if (g.consentState === "GIVEN") out.given += g._count._all;
        else if (g.consentState === "WITHDRAWN") out.withdrawn += g._count._all;
        else out.unknown += g._count._all;
      }
      return out;
    },
    /** U24 · the KEYSET walk, `id` ascending: `id > cursor`, ordered by the same column under the same collation,
     *  so the walk is self-consistent while rows are written between calls. ⛔ Never `skip`. One extra row is read
     *  to know whether the walk is finished. */
    walk: async (q: ContactWalkQuery): Promise<ContactWalk> => {
      const where = toPrismaContactWhere(q.where);
      if (where === null) return { rows: [], nextAfterId: null };
      const rows = await pc().marketingContact.findMany({
        where: q.afterId === null ? where : { AND: [where, { id: { gt: q.afterId } }] },
        orderBy: { id: "asc" },
        take: q.limit + 1,
      });
      const more = rows.length > q.limit;
      const shown = (more ? rows.slice(0, q.limit) : rows).map(toStoredMarketingContact);
      const last = shown[shown.length - 1];
      return { rows: shown, nextAfterId: more && last ? last.id : null };
    },
    /** U24 (decision M8) · the book's distinct tags with how many contacts carry each, most-carried first.
     *  ⭐ Counted in SQL over `unnest` — never the rows. A contact counts ONCE per tag (`count(distinct …)`). The
     *  erased mark is left out NULL-SAFELY (`is distinct from`; a guard arm when nothing is excluded), and ties
     *  sort `collate "C"` — code-unit order, the memory twin's. ⚠️ `::int`, not bigint: `count` is int8 in Postgres. */
    tagCounts: async (q: ContactTagCountQuery): Promise<ContactTagCount[]> => {
      const rows = await pc().$queryRaw<Array<{ tag: string; n: number }>>`
        select t.tag as tag, count(distinct c.id)::int as n
          from "MarketingContact" c
         cross join lateral unnest(c."tags") as t(tag)
         where (${q.excludeSourceRef}::text is null or c."sourceRef" is distinct from ${q.excludeSourceRef}::text)
         group by t.tag
         order by n desc, t.tag collate "C" asc
         limit ${q.limit}`;
      return rows.map((r) => ({ tag: r.tag, count: Number(r.n) }));
    },
    listAll: async (): Promise<StoredMarketingContact[]> => {
      const rows = await pc().marketingContact.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredMarketingContact);
    },
    count: async (): Promise<number> => pc().marketingContact.count(),
    /* ═══ U23 · THE BULK WRITES — set-based, through the ONE translation (`toPrismaContactWhere`) ═══════════════
     * ⭐ Each reads the audience where the resolver counts (`contactAudienceWrites`, audience.ts — the only caller), so
     * the erased tombstone is in no bulk and a where SQL cannot express (null) writes NOTHING. Rows are found as a KEYSET
     * on id, bounded by `CONTACT_BULK_CHUNK` and never `skip`, and each chunk is ONE statement. The memory twin mirrors
     * each one; `test:dal-parity` §23 holds the pairs. */
    /** U23 · TAG every row the audience holds. The rows lacking the tag are walked, and each chunk is ONE update that
     *  re-checks, row by row, that the tag is still absent and the row holds fewer than `maxTags` (decision C11) — so a
     *  row tagged meanwhile is not tagged twice and none passes the limit. ⚠️ Raw SQL because Prisma's where cannot count
     *  an array. The stamp is the caller's ISO `at` cast to the column's `timestamptz` — never the database clock — so
     *  both twins write one instant (decision C25). */
    tagWhere: async (w: ContactAudienceWhere, tag: string, maxTags: number, stamp: ContactBulkStamp): Promise<ContactBulkCount> => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      const where = toPrismaContactWhere(w);
      if (where === null) return out;
      out.matched = await pc().marketingContact.count({ where });
      let walked = 0;
      let afterId: string | null = null;
      for (;;) {
        const lacking: Prisma.MarketingContactWhereInput[] = [where, { NOT: { tags: { has: tag } } }];
        if (afterId !== null) lacking.push({ id: { gt: afterId } });
        const ids = (await pc().marketingContact.findMany({
          where: { AND: lacking }, select: { id: true }, orderBy: { id: "asc" }, take: CONTACT_BULK_CHUNK,
        })).map((r) => r.id);
        if (ids.length === 0) break;
        walked += ids.length;
        const written = await pc().$executeRaw`
          update "MarketingContact"
             set "tags" = array_append("tags", ${tag}::text), "updatedAt" = ${stamp.at}::timestamptz, "updatedBy" = ${stamp.by}::text
           where "id" = any(${ids}::text[]) and not (${tag}::text = any("tags")) and cardinality("tags") < ${maxTags}::int`;
        out.changed += written;
        out.full += ids.length - written;
        if (ids.length < CONTACT_BULK_CHUNK) break;
        afterId = ids[ids.length - 1];
      }
      out.unchanged = Math.max(0, out.matched - walked);
      return out;
    },
    /** U23 · UNTAG every row the audience holds: the rows carrying the tag are walked, and each chunk is ONE update that
     *  re-checks the tag is still there (`array_remove` — Prisma has no pull). A row without it is UNCHANGED. */
    untagWhere: async (w: ContactAudienceWhere, tag: string, stamp: ContactBulkStamp): Promise<ContactBulkCount> => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      const where = toPrismaContactWhere(w);
      if (where === null) return out;
      out.matched = await pc().marketingContact.count({ where });
      let walked = 0;
      let afterId: string | null = null;
      for (;;) {
        const carrying: Prisma.MarketingContactWhereInput[] = [where, { tags: { has: tag } }];
        if (afterId !== null) carrying.push({ id: { gt: afterId } });
        const ids = (await pc().marketingContact.findMany({
          where: { AND: carrying }, select: { id: true }, orderBy: { id: "asc" }, take: CONTACT_BULK_CHUNK,
        })).map((r) => r.id);
        if (ids.length === 0) break;
        walked += ids.length;
        out.changed += await pc().$executeRaw`
          update "MarketingContact"
             set "tags" = array_remove("tags", ${tag}::text), "updatedAt" = ${stamp.at}::timestamptz, "updatedBy" = ${stamp.by}::text
           where "id" = any(${ids}::text[]) and ${tag}::text = any("tags")`;
        if (ids.length < CONTACT_BULK_CHUNK) break;
        afterId = ids[ids.length - 1];
      }
      out.unchanged = Math.max(0, out.matched - walked);
      return out;
    },
    /** U23 · ADD every row the audience holds to ONE list: walked as a keyset, each chunk ONE `createMany` with
     *  `skipDuplicates` — a member already on the list keeps its ORIGINAL `addedAt` (the compound key is the only unique,
     *  so the untargeted ON CONFLICT is exact), and nothing is ever upserted. ⛔ A list that does not exist is refused
     *  before anything is written, as the memory twin refuses it. 🔴 A contact removed between the read and the insert
     *  fails the whole statement on its foreign key (P2003): that chunk is retried one row at a time, and a row that is
     *  gone is not added — counted in neither `changed` nor `unchanged`. */
    addWhere: async (w: ContactAudienceWhere, listId: string, stamp: ContactBulkStamp): Promise<ContactBulkCount> => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      const list = await pc().contactList.findUnique({ where: { id: listId }, select: { id: true } });
      if (!list) throw new Error("addWhere: no such contact list (the foreign key)");
      const where = toPrismaContactWhere(w);
      if (where === null) return out;
      let gone = 0;
      let afterId: string | null = null;
      for (;;) {
        // ⚠️ Typed: `afterId` is narrowed from this very array at the loop's foot, so an inferred `ids` is circular (TS7022).
        const ids: string[] = (await pc().marketingContact.findMany({
          where: afterId === null ? where : { AND: [where, { id: { gt: afterId } }] },
          select: { id: true }, orderBy: { id: "asc" }, take: CONTACT_BULK_CHUNK,
        })).map((r) => r.id);
        if (ids.length === 0) break;
        out.matched += ids.length;
        const rows = ids.map((contactId) => ({ listId, contactId, addedAt: new Date(stamp.at), addedBy: stamp.by }));
        try {
          out.changed += (await pc().contactListMember.createMany({ data: rows, skipDuplicates: true })).count;
        } catch (err) {
          if ((err as { code?: string })?.code !== "P2003") throw err;
          for (const row of rows) {
            try {
              out.changed += (await pc().contactListMember.createMany({ data: [row], skipDuplicates: true })).count;
            } catch (one) {
              if ((one as { code?: string })?.code !== "P2003") throw one;
              gone++;
            }
          }
        }
        if (ids.length < CONTACT_BULK_CHUNK) break;
        afterId = ids[ids.length - 1];
      }
      out.unchanged = Math.max(0, out.matched - out.changed - gone);
      return out;
    },
    /** U23 · REMOVE every row the audience holds — ONE `deleteMany` through the ONE translation. Postgres cascades the
     *  memberships (`ContactListMember` onDelete: Cascade; the memory twin emulates it), and the consent ledger and the
     *  stop list are keyed by NUMBER, so removing a book row never deletes evidence. */
    removeWhere: async (w: ContactAudienceWhere): Promise<ContactBulkCount> => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      const where = toPrismaContactWhere(w);
      if (where === null) return out;
      out.matched = await pc().marketingContact.count({ where });
      out.changed = (await pc().marketingContact.deleteMany({ where })).count;
      return out;
    },
    /** vb7 (review m1) · REMOVE every row the audience holds AMONG `ids` — a bulk Remove's confirmed ids — ALL OR NOTHING.
     *  Each chunk is ONE count and ONE `deleteMany` inside the translated where AND the chunk's ids, and EVERY chunk runs in
     *  ONE interactive transaction on its client (`tx`), so a fault at any chunk rolls the whole Remove back and no
     *  contact is gone. A row that stopped matching is not deleted (the where still binds); a row that joined is in no
     *  chunk. The timeout is the largest Remove the book can ask for (`CONTACT_BULK_TX_TIMEOUT_MS`). The memory twin
     *  mirrors it; `test:dal-parity` §23 holds the pair. */
    removeBoundWhere: async (w: ContactAudienceWhere, ids: readonly string[]): Promise<ContactBulkCount> => {
      const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
      const where = toPrismaContactWhere(w);
      if (where === null || ids.length === 0) return out;
      return pc().$transaction(async (tx) => {
        for (let i = 0; i < ids.length; i += CONTACT_BULK_CHUNK) {
          const scoped: Prisma.MarketingContactWhereInput = { AND: [where, { id: { in: ids.slice(i, i + CONTACT_BULK_CHUNK) } }] };
          out.matched += await tx.marketingContact.count({ where: scoped });
          out.changed += (await tx.marketingContact.deleteMany({ where: scoped })).count;
        }
        return out;
      }, { timeout: CONTACT_BULK_TX_TIMEOUT_MS, maxWait: 5_000 });
    },
  },

  contactList: {
    create: async (row: StoredContactList): Promise<StoredContactList | null> => {
      try {
        const created = await pc().contactList.create({
          data: {
            id: row.id, name: row.name, description: row.description,
            createdAt: new Date(row.createdAt), createdBy: row.createdBy,
            updatedAt: new Date(row.updatedAt), updatedBy: row.updatedBy,
          },
        });
        return toStoredContactList(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;
        throw err;
      }
    },
    find: async (id: string): Promise<StoredContactList | null> => {
      const row = await pc().contactList.findUnique({ where: { id } });
      return row ? toStoredContactList(row) : null;
    },
    findByName: async (name: string): Promise<StoredContactList | null> => {
      const row = await pc().contactList.findUnique({ where: { name } });
      return row ? toStoredContactList(row) : null;
    },
    listAll: async (): Promise<StoredContactList[]> => {
      const rows = await pc().contactList.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredContactList);
    },
  },

  contactListMember: {
    /** ⭐ THE COMPOUND KEY IS THE DEDUPLICATION, and re-adding keeps the ORIGINAL `addedAt`:
     *  when somebody joined a list is evidence, not a status flag. That is why this reads
     *  first and returns the existing row rather than upserting the timestamp forward — the
     *  memory twin does the same, and §19 asserts it on both. */
    add: async (row: StoredContactListMember): Promise<StoredContactListMember> => {
      const existing = await pc().contactListMember.findUnique({
        where: { listId_contactId: { listId: row.listId, contactId: row.contactId } },
      });
      if (existing) return toStoredContactListMember(existing);
      const created = await pc().contactListMember.create({
        data: {
          listId: row.listId, contactId: row.contactId,
          addedAt: new Date(row.addedAt), addedBy: row.addedBy,
        },
      });
      return toStoredContactListMember(created);
    },
    remove: async (key: ContactListKey): Promise<boolean> => {
      try {
        await pc().contactListMember.delete({
          where: { listId_contactId: { listId: key.listId, contactId: key.contactId } },
        });
        return true;
      } catch (err) {
        if ((err as { code?: string })?.code === "P2025") return false;
        throw err;
      }
    },
    listMembers: async (listId: string): Promise<StoredContactListMember[]> => {
      const rows = await pc().contactListMember.findMany({
        where: { listId },
        orderBy: [{ addedAt: "desc" }, { contactId: "desc" }],
      });
      return rows.map(toStoredContactListMember);
    },
    listMemberships: async (contactId: string): Promise<StoredContactListMember[]> => {
      const rows = await pc().contactListMember.findMany({
        where: { contactId },
        orderBy: [{ addedAt: "desc" }, { listId: "desc" }],
      });
      return rows.map(toStoredContactListMember);
    },
  },

  /* ═══ U33a-L · THE LIST BASIS (OD57 · OD58) ══════════════════════════════════════════════════════════════════════════
   * ⭐ A LIST'S ONE STANDING IS ITS NEWEST RECORDING, revoked or not (M1): revoking it ends the list's coverage, an older
   * recording never comes back, and recording again starts it anew — in `bookStandings` and in `coveredCount` alike.
   * ⛔ APPEND-ONLY: `create` turns the P2002 of a held id into null and NEVER upserts; `revoke` is ONE conditional update —
   * `revokedAt: null` in its where — so a second revoke, or one racing it, matches nothing and moves nothing; there is NO
   * update member and NO delete member (`test:dal-parity` §27.3), and the list link is RESTRICT, so a list carrying a basis
   * cannot be deleted under it. ⛔ EVERY member asks the ONE rule set (`list-basis-model.ts`) before its first query, as the
   * memory twin does, so both twins refuse one input alike. `test:dal-parity` §27 holds the pairs;
   * `scripts/live/list-basis-pg-probe.mts` runs them on PostgreSQL 18.3, beside the memory twin. ⛔ Nothing outside the data
   * layer and its tests reads or writes these rows until U33a-G (the gate) and U33b-L (the Lists card, the ONE writer). */
  contactListBasis: {
    /** ⛔ NEVER AN UPSERT — an upsert would rewrite the evidence of a recording already made. The rule set first; a held id
     *  is P2002, answered null; a list that does not exist is P2003 and THROWS, as the memory twin's foreign key does,
     *  carrying the same code. Born UNREVOKED. */
    create: async (row: ContactListBasisSeed): Promise<StoredContactListBasis | null> => {
      assertListBasisSeed(row);
      try {
        const created = await pc().contactListBasis.create({
          data: {
            id: row.id,
            listId: row.listId,
            basisKey: row.basisKey,
            wording: row.wording,
            wordingVersion: row.wordingVersion,
            adultWording: row.adultWording,
            adultVersion: row.adultVersion,
            proofNote: row.proofNote,
            recordedBy: row.recordedBy,
            recordedAt: new Date(row.recordedAt),
            revokedAt: null,
            revokedBy: null,
            revokedReason: null,
          },
        });
        return toStoredContactListBasis(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;
        throw err;
      }
    },
    /** ⭐ SET ONCE, BY ONE STATEMENT: the update counts 1 only while the basis is unrevoked — Postgres re-checks the where
     *  after a racing commit, so the loser writes nothing — and the row is read back by id either way: an unknown id is
     *  null, and a basis already revoked comes back with its FIRST revocation unmoved. */
    revoke: async (r: ContactListBasisRevocation): Promise<StoredContactListBasis | null> => {
      assertListBasisRevocation(r);
      await pc().contactListBasis.updateMany({
        where: { id: r.id, revokedAt: null },
        data: { revokedAt: new Date(r.at), revokedBy: r.by, revokedReason: r.reason },
      });
      const row = await pc().contactListBasis.findUnique({ where: { id: r.id } });
      return row ? toStoredContactListBasis(row) : null;
    },
    /** Every basis recorded on one list, revoked ones included, NEWEST FIRST — served by the [listId, recordedAt] index;
     *  the first is the list's standing. */
    listForList: async (listId: string): Promise<StoredContactListBasis[]> => {
      assertListBasisKeys("contactListBasis.listForList", [listId]);
      const rows = await pc().contactListBasis.findMany({
        where: { listId },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toStoredContactListBasis);
    },
    /** One number's book standing — the ONE definition, asked of one key (one to three indexed queries). */
    standingFor: async (msisdn: string): Promise<BookStanding> => (await bookStandings([msisdn]))[0].standing,
    /** §25's bound and shape: at most `BULK_KEYED_READ_MAX` distinct keys, REFUSED above — never cut off — duplicates
     *  folded, an empty set answered with nothing and no query; then the ONE definition, one entry per key. */
    standingAmong: async (msisdns: string[]): Promise<BookStandingEntry[]> => {
      const keys = bulkKeys(msisdns, "contactListBasis.standingAmong");
      if (keys.length === 0) return [];
      return bookStandings(keys);
    },
    /** The list's coverage in ONE statement, so `covered` can never exceed `live` (`ListBasisCoverage`) — the Lists card's
     *  "covers 412 of 420" (U33b-L). The list's NEWEST recording first (M1): none, or a revoked one, and the bound is null
     *  and nothing is covered. Then ONE pass over the list's members: `live` counts those whose book row is live and linked
     *  to no account (a list basis never reaches an account's number — the player branch governs it, S3), `covered` those
     *  of them added at or before the bound. 🔴 The mark is left out NULL-SAFELY (`is distinct from`): a bare `<>` is NULL —
     *  so false — for every row with no mark, nearly the whole book. ⚠️ `::int`, not bigint: `count` is int8 in Postgres. */
    coveredCount: async (listId: string): Promise<ListBasisCoverage> => {
      assertListBasisKeys("contactListBasis.coveredCount", [listId]);
      const newest = await pc().contactListBasis.findFirst({
        where: { listId },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        select: { recordedAt: true, revokedAt: true },
      });
      const bound = newest !== null && newest.revokedAt === null ? newest.recordedAt.toISOString() : null;
      const rows = await pc().$queryRaw<Array<{ live: number; covered: number }>>`
        select count(*)::int as live,
               (count(*) filter (where ${bound}::timestamptz is not null and m."addedAt" <= ${bound}::timestamptz))::int as covered
          from "ContactListMember" m
          join "MarketingContact" c on c."id" = m."contactId"
         where m."listId" = ${listId}
           and c."userId" is null
           and c."sourceRef" is distinct from ${ERASURE_EVIDENCE}::text`;
      return { live: Number(rows[0]?.live ?? 0), covered: Number(rows[0]?.covered ?? 0) };
    },
    /** C8b (B5) · the list's coverage SPLIT by the account link, in ONE statement over its members — `coveredCount`'s
     *  newest-recording bound (M1), then four filtered counts: the live members linked to no account and those of them
     *  covered (`coveredCount`'s pair exactly), and the same two over the live members linked to an account. The tombstone
     *  is left out NULL-SAFELY (`is distinct from`, as `coveredCount` does). ⚠️ `::int`, not bigint. ⛔ What a viewer is
     *  SHOWN, never a second "who is covered" — the gate and the basis audit keep `coveredCount`. */
    coverageSplit: async (listId: string): Promise<ListBasisCoverageSplit> => {
      assertListBasisKeys("contactListBasis.coverageSplit", [listId]);
      // ⚠️ Its own names and line shapes, on purpose: `red:dal-parity` anchors coveredCount's lines, which must stay unique.
      const newestSplit = await pc().contactListBasis.findFirst({
        where: { listId },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        select: { revokedAt: true, recordedAt: true },
      });
      const splitBound = newestSplit !== null && newestSplit.revokedAt === null ? newestSplit.recordedAt.toISOString() : null;
      const rows = await pc().$queryRaw<Array<{ live: number; covered: number; linked_live: number; linked_covered: number }>>`
        select (count(*) filter (where c."userId" is null))::int as live,
               (count(*) filter (where c."userId" is null and ${splitBound}::timestamptz is not null and m."addedAt" <= ${splitBound}::timestamptz))::int as covered,
               (count(*) filter (where c."userId" is not null))::int as linked_live,
               (count(*) filter (where c."userId" is not null and ${splitBound}::timestamptz is not null and m."addedAt" <= ${splitBound}::timestamptz))::int as linked_covered
          from "ContactListMember" m
          join "MarketingContact" c on c."id" = m."contactId"
         where m."listId" = ${listId} and c."sourceRef" is distinct from ${ERASURE_EVIDENCE}::text`;
      const r = rows[0];
      return {
        unlinked: { live: Number(r?.live ?? 0), covered: Number(r?.covered ?? 0) },
        linked: { live: Number(r?.linked_live ?? 0), covered: Number(r?.linked_covered ?? 0) },
      };
    },
  },

  /* ═══ U33r · THE AGENT-REFEREE KEYS (Q8) ══════════════════════════════════════════════════════════════════
   * ⛔ APPEND-ONLY: `record` is ONE `createMany` with `skipDuplicates` — Postgres's ON CONFLICT DO NOTHING over the primary
   * key, so a key already held is skipped and nothing is ever moved — and there is NO update member and NO delete member
   * (`test:dal-parity` §28). ⛔ EVERY member asks the ONE rule set (`referee-key-model.ts`) before its first query, as the
   * memory twin does, so a raw number handed in as a key — or a row carrying anything beside its key — is refused by both.
   * ⛔ The ONE writer is `referee-exclusion.ts` (`test:dal-parity` §28.writers). */
  agentRefereeKey: {
    /** The batch checked WHOLE first; an empty batch is answered 0 with no query; then ONE insert of every key, BY NAME,
     *  skipping a key already held. Answers how many rows were written (0 on a re-run). */
    record: async (rows: StoredAgentRefereeKey[]): Promise<number> => {
      assertRefereeKeyRows(rows);
      if (rows.length === 0) return 0;
      const created = await pc().agentRefereeKey.createMany({
        data: rows.map((r) => ({ refereeKey: r.refereeKey })),
        skipDuplicates: true,
      });
      return created.count;
    },
    /** Whether a row holds this key — the ONE definition, asked of one key (one query). */
    holds: async (refereeKey: string): Promise<boolean> => (await refereeHeld([refereeKey]))[0].held,
    /** §25's bound and shape: at most `BULK_KEYED_READ_MAX` distinct keys, REFUSED above — never cut off — duplicates
     *  folded, an empty set answered with nothing and no query; then the ONE definition, one entry per key. */
    heldAmong: async (refereeKeys: string[]): Promise<AgentRefereeKeyEntry[]> => {
      const keys = bulkKeys(refereeKeys, "agentRefereeKey.heldAmong");
      if (keys.length === 0) return [];
      return refereeHeld(keys);
    },
  },

  /* ═══ CONTACT IMPORT STAGING (marketing U29) ═══════════════════════════════════════════════
   * ⭐ EVERY COMPARE-AND-SET IS ONE CONDITIONAL UPDATE: Postgres re-checks its where after a concurrent commit, so the
   * loser counts 0 and writes nothing. `stageRows` runs that update FIRST, inside ONE short interactive transaction, and
   * inserts the rows after it — a lost compare inserts nothing, and a refused insert rolls the cursor back with it. The
   * foreign key's cascade takes a purged run's rows. ⛔ `create` never upserts. `test:dal-parity` §24 holds the pairs. */
  contactImport: {
    create: async (row: StoredContactImport): Promise<StoredContactImport | null> => {
      try {
        const created = await pc().contactImport.create({
          data: {
            id: row.id,
            status: row.status as never,
            format: row.format as never,
            fileName: row.fileName,
            fileDigest: row.fileDigest,
            mapping: row.mapping as unknown as Prisma.InputJsonValue,
            totalRows: row.totalRows,
            unreadable: row.unreadable,
            stagedThrough: row.stagedThrough,
            committedThrough: row.committedThrough,
            decisionChoice: row.decisionChoice as never,
            decisionOverrides: row.decisionOverrides as unknown as Prisma.InputJsonValue,
            decisionConfirmedAt: row.decisionConfirmedAt ? new Date(row.decisionConfirmedAt) : null,
            decisionConfirmedBy: row.decisionConfirmedBy,
            consentBasis: row.consentBasis,
            consentWording: row.consentWording,
            consentProofNote: row.consentProofNote,
            adultAttestedAt: row.adultAttestedAt ? new Date(row.adultAttestedAt) : null,
            consentBasisSetBy: row.consentBasisSetBy,
            consentBasisSetAt: row.consentBasisSetAt ? new Date(row.consentBasisSetAt) : null,
            pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
            pausedBy: row.pausedBy,
            finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
            createdAt: new Date(row.createdAt),
            createdBy: row.createdBy,
            updatedAt: new Date(row.updatedAt),
            targetListId: row.targetListId ?? null,
          },
        });
        return toStoredContactImport(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;
        throw err;
      }
    },
    find: async (id: string): Promise<StoredContactImport | null> => {
      const row = await pc().contactImport.findUnique({ where: { id } });
      return row ? toStoredContactImport(row) : null;
    },
    /** An officer's OPEN run — the adopt read. The EARLIEST, so two tabs that raced to open one file converge on one. */
    findOpenFor: async (createdBy: string): Promise<StoredContactImport | null> => {
      const row = await pc().contactImport.findFirst({
        where: { createdBy, status: { in: ["STAGING", "STAGED", "COMMITTING", "PAUSED"] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return row ? toStoredContactImport(row) : null;
    },
    /** §29 · S15-12 · an ADMIN's read of the runs OTHER officers left unfinished — the same four OPEN statuses as
     *  `findOpenFor`, every creator but `q.excludeCreatedBy` (a soft key, never null), NEWEST first, at most `q.limit`,
     *  clamped to `CONTACT_IMPORT_OPEN_RUNS_MAX`. */
    listOpenByOthers: async (q: ContactImportOthersQuery): Promise<StoredContactImport[]> => {
      const rows = await pc().contactImport.findMany({
        where: { createdBy: { not: q.excludeCreatedBy }, status: { in: ["STAGING", "STAGED", "COMMITTING", "PAUSED"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.max(0, Math.min(q.limit, CONTACT_IMPORT_OPEN_RUNS_MAX)),
      });
      return rows.map(toStoredContactImport);
    },
    /** The idle sweep's read (X29): runs in `q.statuses` untouched since `q.idleBefore`, oldest first, at most `q.limit`. */
    listIdle: async (q: ContactImportIdleQuery): Promise<StoredContactImport[]> => {
      const rows = await pc().contactImport.findMany({
        where: { status: { in: q.statuses as never }, updatedAt: { lt: new Date(q.idleBefore) } },
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: Math.max(0, q.limit),
      });
      return rows.map(toStoredContactImport);
    },
    /** ⭐ COMPARE-AND-SET ON STATUS: one conditional update whose where holds the statuses it may move from (and, for the
     *  sweep, the idle bound). DONE and CANCELLED stamp `finishedAt`; PAUSED records who and when; a resume clears it. */
    transition: async (t: ContactImportTransition): Promise<StoredContactImport | null> => {
      const resumed = t.to === "COMMITTING" && t.from.includes("PAUSED");
      const moved = await pc().contactImport.updateMany({
        where: {
          id: t.importId,
          status: { in: t.from as never },
          ...(t.updatedBefore !== null ? { updatedAt: { lt: new Date(t.updatedBefore) } } : {}),
        },
        data: {
          status: t.to as never,
          updatedAt: new Date(t.at),
          ...(t.to === "DONE" || t.to === "CANCELLED" ? { finishedAt: new Date(t.at) } : {}),
          ...(t.to === "PAUSED" ? { pausedAt: new Date(t.at), pausedBy: t.by } : {}),
          ...(resumed ? { pausedAt: null, pausedBy: null } : {}),
        },
      });
      if (moved.count !== 1) return null;
      const row = await pc().contactImport.findUnique({ where: { id: t.importId } });
      return row ? toStoredContactImport(row) : null;
    },
    /** ⭐ THE STAGING COMPARE-AND-SET (X2). The conditional update — status STAGING and `stagedThrough` exactly
     *  `b.from - 1` — runs FIRST; only when it counted 1 are the rows inserted, unsettled (no outcome, no reason), in the
     *  SAME transaction. A replay or a racing tab counts 0 and inserts nothing; a line already staged (the unique
     *  importId + line) rolls the whole batch back, cursor included. One short row lock per batch — no lock held across
     *  an import. */
    stageRows: async (b: ContactImportStageBatch): Promise<ContactImportStageResult> => {
      if (b.rows.length === 0) throw new Error("stageRows: an empty batch");
      b.rows.forEach((row, i) => {
        if (row.importId !== b.importId || row.ordinal !== b.from + i) throw new Error("stageRows: the rows must run from b.from, one ordinal each, in this run");
      });
      try {
        return await pc().$transaction(async (tx) => {
          const moved = await tx.contactImport.updateMany({
            where: { id: b.importId, status: "STAGING", stagedThrough: b.from - 1 },
            data: { stagedThrough: b.from - 1 + b.rows.length, status: b.completes ? "STAGED" : "STAGING", updatedAt: new Date(b.at) },
          });
          if (moved.count !== 1) {
            const current = await tx.contactImport.findUnique({ where: { id: b.importId } });
            return stageLoss(current ? toStoredContactImport(current) : null, b);
          }
          await tx.contactImportRow.createMany({
            data: b.rows.map((row) => ({
              importId: b.importId,
              ordinal: row.ordinal,
              line: row.line,
              rawPhone: row.rawPhone,
              msisdn: row.msisdn,
              displayName: row.displayName,
              email: row.email,
              tags: row.tags,
              notes: row.notes,
              problems: row.problems as unknown as Prisma.InputJsonValue,
              readError: row.readError,
              stagedAt: new Date(row.stagedAt),
            })),
          });
          const run = await tx.contactImport.findUnique({ where: { id: b.importId } });
          if (!run) throw new Error("stageRows: the run vanished inside its own transaction");
          return { ok: true as const, run: toStoredContactImport(run) };
        }, { timeout: 15_000, maxWait: 5_000 });
      } catch (err) {
        if ((err as { code?: string })?.code !== "P2002") throw err;
        const current = await pc().contactImport.findUnique({ where: { id: b.importId } });
        return { ok: false, reason: "duplicate_line", run: current ? toStoredContactImport(current) : null };
      }
    },
    /** ⛔ COUNTED FROM THE ROWS, never stored (OD26): one groupBy on outcome and one count of the unreadable — never a
     *  fetch-all-then-count. */
    totals: async (importId: string): Promise<ContactImportTotals> => {
      const groups = await pc().contactImportRow.groupBy({ by: ["outcome"], where: { importId }, _count: { _all: true } });
      const unreadable = await pc().contactImportRow.count({ where: { importId, readError: { not: null } } });
      const out: ContactImportTotals = { staged: 0, unreadable, pending: 0, create: 0, update: 0, keep: 0, fail: 0 };
      for (const g of groups as Array<{ outcome: StoredContactImportRow["outcome"]; _count: { _all: number } }>) {
        out.staged += g._count._all;
        if (g.outcome === null) out.pending += g._count._all;
        else out[g.outcome] += g._count._all;
      }
      return out;
    },
    /** Retention, 90 days after `finishedAt`: up to `q.limit` DONE or CANCELLED runs, oldest first. Their rows go by the
     *  foreign key's ON DELETE CASCADE. */
    purgeFinished: async (q: ContactImportFinishedPurge): Promise<number> => {
      const ids = (await pc().contactImport.findMany({
        where: { status: { in: ["DONE", "CANCELLED"] }, finishedAt: { lt: new Date(q.finishedBefore) } },
        select: { id: true },
        orderBy: [{ finishedAt: "asc" }, { id: "asc" }],
        take: Math.max(0, q.limit),
      })).map((r) => r.id);
      if (ids.length === 0) return 0;
      return (await pc().contactImport.deleteMany({
        where: { id: { in: ids }, status: { in: ["DONE", "CANCELLED"] }, finishedAt: { lt: new Date(q.finishedBefore) } },
      })).count;
    },
    /** §29 · ⭐ THE START'S FREEZE (U32, S15) — ONE transaction whose FIRST statement is the conditional update: the run
     *  moves STAGED → COMMITTING only while it is still STAGED, writing the choice, the overrides, who confirmed them and
     *  when, and an EXISTING target list in the same statement. Postgres re-checks the where after a racing commit, so of
     *  two starts ONE freezes the run; the loser counts 0 and is answered null, nothing written. An existing list deleted
     *  since the start read it is the foreign key refusing the update (P2003). ⭐ R12 · a NEW list is inserted only AFTER
     *  the run was won, then made the target, in the same transaction: a held name is the unique index refusing the insert
     *  (P2002), which rolls the freeze back with it — so a start that loses or throws leaves no list behind. */
    freezeDecision: async (f: ContactImportFreeze): Promise<StoredContactImport | null> => {
      const newList = f.newList ?? null;
      if (newList !== null && f.targetListId !== newList.id) throw new Error("freezeDecision: a new list must be the run's target list");
      return pc().$transaction(async (tx) => {
        const frozen = await tx.contactImport.updateMany({
          where: { id: f.importId, status: "STAGED" },
          data: {
            status: "COMMITTING",
            decisionChoice: f.choice as never,
            decisionOverrides: f.overrides as unknown as Prisma.InputJsonValue,
            decisionConfirmedAt: new Date(f.at),
            decisionConfirmedBy: f.by,
            // A NEW list does not exist yet: it becomes the target below, once inserted, in this same transaction.
            targetListId: newList === null ? f.targetListId : null,
            updatedAt: new Date(f.at),
          },
        });
        if (frozen.count !== 1) return null;
        if (newList !== null) {
          const l = newList;
          await tx.contactList.create({
            data: {
              id: l.id, name: l.name, description: l.description,
              createdAt: new Date(l.createdAt), createdBy: l.createdBy, updatedAt: new Date(l.updatedAt), updatedBy: l.updatedBy,
            },
          });
          await tx.contactImport.update({ where: { id: f.importId }, data: { targetListId: l.id, updatedAt: new Date(f.at) } });
        }
        const row = await tx.contactImport.findUnique({ where: { id: f.importId } });
        return row ? toStoredContactImport(row) : null;
      }, { timeout: CONTACT_IMPORT_FREEZE_TX_TIMEOUT_MS, maxWait: 5_000 });
    },
    /** §29 · ⭐ X3 · THE ONE COMMIT WRITE (S15-6) — ONE interactive transaction, its timeout and maxWait set, whose FIRST
     *  statement is the cursor's compare-and-set (COMMITTING and `committedThrough` exactly `b.fromCursor`): a step another
     *  tab already took counts 0 and writes nothing (`moved`). Then, in order: the creates (ONE `createManyAndReturn`, skip
     *  duplicates — fewer back than asked is the unique index refusing a number), each update conditional on its guard AND
     *  on the row not being the erased tombstone (⛔ the NULL arm is REQUIRED: `sourceRef <> 'erasure'` alone is NULL — so
     *  false — for nearly the whole book), and on ANY refusal the transaction THROWS, so Postgres rolls the step back,
     *  cursor included, and the answer names the rows (`conflict`). Then the failure sentences (before the blanking), the
     *  outcomes grouped by their pair with the blanking (S15-8) — each group counted, so a staged row erasure deleted
     *  since the step read it rolls the step back as a `conflict` (R9) — the list memberships (live rows only, skip
     *  duplicates — an existing member keeps its first `addedAt`), and DONE when the cursor reached `stagedThrough`.
     *  ⭐ R3 · ONE lock order for every import: creates by number, updates and memberships by contact id, so two imports
     *  at once take their row locks in the same order and cannot deadlock each other. ⛔ R17 · a cursor that would move
     *  backwards or past the staged rows is refused, nothing written — the memory twin's own refusal. ⛔ No Promise.all
     *  over the transaction's client, and no advisory lock: the cursor's row lock is the whole serialisation (§5.5). */
    commitBatch: async (b: ContactImportCommitBatch): Promise<ContactImportCommitResult> => {
      const creates = [...b.creates].sort((x, y) => (x.row.msisdn < y.row.msisdn ? -1 : x.row.msisdn > y.row.msisdn ? 1 : 0));
      const updates = [...b.updates].sort((x, y) => (x.contactId < y.contactId ? -1 : x.contactId > y.contactId ? 1 : 0));
      const members = [...b.members].sort();
      try {
        return await pc().$transaction(async (tx) => {
          const advanced = await tx.contactImport.updateMany({
            where: { id: b.importId, status: "COMMITTING", committedThrough: b.fromCursor },
            data: { committedThrough: b.toCursor, updatedAt: new Date(b.at) },
          });
          if (advanced.count !== 1) {
            const now = await tx.contactImport.findUnique({ where: { id: b.importId } });
            return { kind: "moved" as const, run: now ? toStoredContactImport(now) : null };
          }
          const bounds = await tx.contactImport.findUnique({ where: { id: b.importId }, select: { stagedThrough: true } });
          if (bounds === null || b.toCursor < b.fromCursor || b.toCursor > bounds.stagedThrough) {
            throw new Error("commitBatch: the cursor must move forward, within the staged rows");
          }
          const refused: number[] = [];
          if (creates.length > 0) {
            const born = await tx.marketingContact.createManyAndReturn({
              data: creates.map(({ row }) => ({
                id: row.id, msisdn: row.msisdn, rawInput: row.rawInput,
                displayName: row.displayName, email: row.email, ndc: row.ndc,
                operator: row.operator, source: row.source as never, sourceRef: row.sourceRef,
                userId: row.userId, consentState: row.consentState as never,
                suppressedAt: row.suppressedAt ? new Date(row.suppressedAt) : null,
                tags: row.tags, notes: row.notes, importId: row.importId,
                createdAt: new Date(row.createdAt), createdBy: row.createdBy,
                updatedAt: new Date(row.updatedAt), updatedBy: row.updatedBy,
              })),
              // ONE line on purpose: §25's red anchor plants the presence read's own `select` line, which must stay unique.
              skipDuplicates: true, select: { msisdn: true },
            });
            if (born.length !== creates.length) {
              const landed = new Set(born.map((r) => r.msisdn));
              for (const c of creates) if (!landed.has(c.row.msisdn)) refused.push(c.ordinal);
            }
          }
          for (const u of updates) {
            const guarded = await tx.marketingContact.updateMany({
              where: { id: u.contactId, updatedAt: new Date(u.guard), OR: [{ sourceRef: null }, { sourceRef: { not: ERASURE_EVIDENCE } }] },
              data: {
                ...(u.patch.displayName !== undefined ? { displayName: u.patch.displayName } : {}),
                ...(u.patch.email !== undefined ? { email: u.patch.email } : {}),
                ...(u.patch.notes !== undefined ? { notes: u.patch.notes } : {}),
                ...(u.patch.tags !== undefined ? { tags: u.patch.tags } : {}),
                updatedAt: new Date(u.at),
                updatedBy: u.by,
              },
            });
            if (guarded.count !== 1) refused.push(u.ordinal);
          }
          if (refused.length > 0) throw new ContactImportBatchConflict(refused.sort((x, y) => x - y));
          // S15-8 · a failed row's sentence BEFORE its cells are blanked, grouped by sentence.
          const bySentence = new Map<string, number[]>();
          for (const s of b.sentences) bySentence.set(s.sentence, [...(bySentence.get(s.sentence) ?? []), s.ordinal]);
          for (const [sentence, ordinals] of bySentence) {
            await tx.contactImportRow.updateMany({
              where: { importId: b.importId, ordinal: { in: ordinals } },
              data: { problems: [{ field: "phone", sentence }] as unknown as Prisma.InputJsonValue },
            });
          }
          // X4 · the outcomes, ONE statement per (outcome, reason) pair — and the cells blanked in the same write (S15-8).
          const byPair = new Map<string, { outcome: string; reason: string | null; ordinals: number[] }>();
          for (const o of b.outcomes) {
            const key = `${o.outcome}|${o.reason ?? ""}`;
            const group = byPair.get(key) ?? { outcome: o.outcome, reason: o.reason, ordinals: [] };
            group.ordinals.push(o.ordinal);
            byPair.set(key, group);
          }
          for (const g of byPair.values()) {
            const settledRows = await tx.contactImportRow.updateMany({
              where: { importId: b.importId, ordinal: { in: g.ordinals }, outcome: null },
              data: { outcome: g.outcome as never, outcomeReason: g.reason, rawPhone: "", displayName: null, email: null, notes: null, tags: [] },
            });
            // ⛔ R9 · every row of the group must still be there, unsettled: erasure deletes a person's staged rows, and a step
            // decided on a row that is gone would create the very number the erasure took away. The rows gone are named.
            if (settledRows.count !== g.ordinals.length) {
              const present = await tx.contactImportRow.findMany({ where: { importId: b.importId, ordinal: { in: g.ordinals } }, select: { ordinal: true } });
              const held = new Set(present.map((r) => r.ordinal));
              const gone = g.ordinals.filter((o) => !held.has(o));
              throw new ContactImportBatchConflict((gone.length > 0 ? gone : g.ordinals).sort((x, y) => x - y));
            }
          }
          if (b.listId !== null && members.length > 0) {
            const live = await tx.marketingContact.findMany({
              where: { id: { in: members }, OR: [{ sourceRef: null }, { sourceRef: { not: ERASURE_EVIDENCE } }] },
              select: { id: true },
              orderBy: { id: "asc" },
            });
            if (live.length > 0) {
              await tx.contactListMember.createMany({
                data: live.map((m) => ({ listId: b.listId as string, contactId: m.id, addedAt: new Date(b.at), addedBy: b.by })),
                skipDuplicates: true,
              });
            }
          }
          await tx.contactImport.updateMany({
            where: { id: b.importId, status: "COMMITTING", stagedThrough: b.toCursor },
            // `updatedAt` named, as the memory twin writes it: left to @updatedAt it would be this statement's clock.
            data: { status: "DONE", finishedAt: new Date(b.at), updatedAt: new Date(b.at) },
          });
          const settled = await tx.contactImport.findUnique({ where: { id: b.importId } });
          if (!settled) throw new Error("contactImport.commitBatch: the run vanished inside its own transaction");
          return { kind: "advanced" as const, run: toStoredContactImport(settled) };
        }, { timeout: CONTACT_IMPORT_COMMIT_TX_TIMEOUT_MS, maxWait: 5_000 });
      } catch (err) {
        if (err instanceof ContactImportBatchConflict) return { kind: "conflict", ordinals: err.ordinals };
        throw err;
      }
    },
  },

  contactImportRow: {
    /** ⭐ THE KEYSET (X2): the rows AFTER `w.afterOrdinal`, ordinal ascending, bounded — never `skip`, so a row erasure
     *  deletes between two pages cannot shift the walk onto the wrong row. */
    after: async (w: ContactImportRowWindow): Promise<StoredContactImportRow[]> => {
      const rows = await pc().contactImportRow.findMany({
        where: { importId: w.importId, ordinal: { gt: w.afterOrdinal } },
        orderBy: { ordinal: "asc" },
        take: Math.max(0, Math.min(w.limit, CONTACT_IMPORT_ROW_PAGE_MAX)),
      });
      return rows.map(toStoredContactImportRow);
    },
    /** A discarded or swept run's UNSETTLED rows. A settled row is the commit's record and stays. */
    deleteUnsettled: async (importId: string): Promise<number> =>
      (await pc().contactImportRow.deleteMany({ where: { importId, outcome: null } })).count,
    /** ⭐ ERASURE'S REACH (U29b): every staged row, in every run, that holds this number (indexed). */
    deleteByMsisdn: async (msisdn: string): Promise<number> =>
      (await pc().contactImportRow.deleteMany({ where: { msisdn } })).count,
    /** The access export's read: the staged rows holding this number, NEWEST first, bounded (review F5) — the export
     *  keeps only rows staged since the account began, so a recycled number's older rows must not crowd those out. */
    listByMsisdn: async (msisdn: string): Promise<StoredContactImportRow[]> => {
      const rows = await pc().contactImportRow.findMany({
        where: { msisdn },
        orderBy: [{ stagedAt: "desc" }, { importId: "desc" }, { ordinal: "desc" }],
        take: CONTACT_IMPORT_ROWS_BY_NUMBER_MAX,
      });
      return rows.map(toStoredContactImportRow);
    },
    /** §29 · ⭐ S15-7 · THE FIRST ROW OF EACH NUMBER, IN ONE READ — ONE grouped query over THIS run's DECIDABLE rows (no
     *  read error, and `problems` the empty JSON array — Prisma's Json `equals: []`, Postgres' jsonb equality), the
     *  smallest line per asked number. §25's bound through bulkKeys; an empty set answered before any query. */
    firstLinesAmong: async (q: ContactImportFirstLinesQuery): Promise<ContactImportFirstLine[]> => {
      const keys = bulkKeys(q.msisdns, "contactImportRow.firstLinesAmong");
      if (keys.length === 0) return [];
      const groups = await pc().contactImportRow.groupBy({
        by: ["msisdn"],
        where: { importId: q.importId, msisdn: { in: keys }, readError: null, problems: { equals: [] } },
        _min: { line: true },
      });
      const out: ContactImportFirstLine[] = [];
      for (const g of groups as Array<{ msisdn: string | null; _min: { line: number | null } }>) {
        if (g.msisdn !== null && g._min.line !== null) out.push({ msisdn: g.msisdn, line: g._min.line });
      }
      return out.sort((a, b) => (a.msisdn < b.msisdn ? -1 : a.msisdn > b.msisdn ? 1 : 0));
    },
    /** §29 · the run's FAILED rows after `q.afterLine`, ascending by line — a keyset on the line, never `skip` — at most
     *  `q.limit` (clamped to `CONTACT_IMPORT_FAILED_PAGE_MAX`), and the run's failures COUNTED separately. */
    failedPage: async (q: ContactImportFailedQuery): Promise<ContactImportFailedPage> => {
      const rows = await pc().contactImportRow.findMany({
        where: { importId: q.importId, outcome: "fail", line: { gt: q.afterLine } },
        orderBy: { line: "asc" },
        take: Math.max(0, Math.min(q.limit, CONTACT_IMPORT_FAILED_PAGE_MAX)),
      });
      const total = await pc().contactImportRow.count({ where: { importId: q.importId, outcome: "fail" } });
      return { rows: rows.map(toStoredContactImportRow), total };
    },
    /** §29 · the run's KEPT rows counted by their stored reason — ONE groupBy, never the rows (OD26). */
    keptSplit: async (importId: string): Promise<ContactImportKeptCount[]> => {
      const groups = await pc().contactImportRow.groupBy({ by: ["outcomeReason"], where: { importId, outcome: "keep" }, _count: { _all: true } });
      return (groups as Array<{ outcomeReason: string | null; _count: { _all: number } }>)
        .map((g): ContactImportKeptCount => ({ reason: g.outcomeReason, count: g._count._all }))
        .sort((a, b) => String(a.reason ?? "").localeCompare(String(b.reason ?? "")));
    },
  },

  /* ═══ THE CAMPAIGN TABLES (marketing U35b) ═══════════════════════════════════════════════════════════
   * ⛔ THE ONE DOOR: no other src file calls these two delegates (`test:dal-parity` §26.onedoor), so the rules cannot
   * be walked round. Every member asks `campaign-model.ts` FIRST; the frozen keys and the status each move in ONE
   * conditional `updateMany`, so Postgres decides the winner — never a read-then-write — and the recipient batch is
   * ONE `createMany` with `skipDuplicates` against `@@unique([campaignId, msisdn])`.
   * ⛔ NO `delete` here or in the memory twin, and no stored counter: progress is a groupBy. */
  smsCampaign: {
    /** ⭐ A campaign is born a blank DRAFT (`assertNewCampaign`), and every key is written explicitly. */
    create: async (row: StoredSmsCampaign): Promise<StoredSmsCampaign> => {
      assertNewCampaign(row);
      const created = await pc().smsCampaign.create({
        data: {
          id: row.id,
          name: row.name,
          status: row.status,
          bodySw: row.bodySw,
          bodyEn: row.bodyEn,
          codingSw: row.codingSw,
          segmentsSw: row.segmentsSw,
          codingEn: row.codingEn,
          segmentsEn: row.segmentsEn,
          nameFallbackSw: row.nameFallbackSw,
          nameFallbackEn: row.nameFallbackEn,
          sourcePhrase: row.sourcePhrase,
          draftRevision: row.draftRevision,
          confirmTier: row.confirmTier,
          audienceFilter: row.audienceFilter,
          audienceCount: row.audienceCount,
          audienceWatermark: row.audienceWatermark,
          estimateSegments: row.estimateSegments,
          estimateTzs: row.estimateTzs,
          budgetTzs: row.budgetTzs,
          enqueueCursor: row.enqueueCursor,
          enqueuedAt: row.enqueuedAt ? new Date(row.enqueuedAt) : null,
          stopReason: row.stopReason,
          createdBy: row.createdBy,
          confirmedBy: row.confirmedBy,
          confirmedAt: row.confirmedAt ? new Date(row.confirmedAt) : null,
          startedAt: row.startedAt ? new Date(row.startedAt) : null,
          pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
          finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      return toStoredSmsCampaign(created);
    },
    find: async (id: string): Promise<StoredSmsCampaign | null> => {
      const row = await pc().smsCampaign.findUnique({ where: { id } });
      return row ? toStoredSmsCampaign(row) : null;
    },
    /** U37's DRAFT SAVE — ⭐ ONE conditional UPDATE: written only where the row is still a DRAFT on the revision the
     *  form was rendered on, moving the revision on by one, so two saves on one revision cannot both land and a
     *  confirmed scope can never be widened. A count of 0 is null (gone, no longer a draft, or saved since). */
    update: async (id: string, patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string): Promise<StoredSmsCampaign | null> => {
      assertDraftPatch(patch, guard, at);
      const data = smsCampaignData(patch);
      data.draftRevision = guard.draftRevision + 1;
      data.updatedAt = new Date(at);
      const saved = await pc().smsCampaign.updateMany({ where: { id, status: "DRAFT", draftRevision: guard.draftRevision }, data });
      if (saved.count === 0) return null;
      const after = await pc().smsCampaign.findUnique({ where: { id } });
      return after ? toStoredSmsCampaign(after) : null;
    },
    /** ⭐ THE ONLY WAY A STATUS MOVES — ONE conditional UPDATE whose WHERE holds `status IN from` (and the revision when
     *  one is given), so of two racing writers Postgres lets exactly one through and the loser gets null.
     *  ⚠️ The row is re-read after the write and may already carry a later change: null versus non-null is the race
     *  verdict, never the returned status. */
    transition: async (id: string, t: SmsCampaignTransition): Promise<StoredSmsCampaign | null> => {
      assertTransitionShape(t);
      const data = smsCampaignData(t.patch);
      if (t.to !== null) data.status = t.to;
      data.updatedAt = new Date(t.at);
      const moved = await pc().smsCampaign.updateMany({
        where: { id, status: { in: [...t.from] }, ...(t.draftRevision !== null ? { draftRevision: t.draftRevision } : {}) },
        data,
      });
      if (moved.count === 0) return null;
      const after = await pc().smsCampaign.findUnique({ where: { id } });
      return after ? toStoredSmsCampaign(after) : null;
    },
    /** U36 · ONE PAGE of the campaign list and the size of the whole match: ONE findMany ordered by the column and then
     *  by `id` in the same direction (so a page boundary falls where the memory twin's does), and ONE count over the
     *  SAME where. `statuses` null = every status; an EMPTY list = nothing (`in: []`). */
    page: async (q: SmsCampaignPageQuery): Promise<SmsCampaignPage> => {
      const where = q.statuses === null ? {} : { status: { in: [...q.statuses] } };
      const first = q.sort === "name" ? { name: q.dir } : q.sort === "updated" ? { updatedAt: q.dir } : { createdAt: q.dir };
      const [rows, total] = await Promise.all([
        pc().smsCampaign.findMany({ where, orderBy: [first, { id: q.dir }], skip: q.offset, take: q.limit }),
        pc().smsCampaign.count({ where }),
      ]);
      return { rows: rows.map((r) => toStoredSmsCampaign(r)), total };
    },
    /** U36 · ONE groupBy by status over the WHOLE table — never the rows — zero-filled. */
    statusCounts: async (): Promise<SmsCampaignStatusCounts> => {
      const groups = await pc().smsCampaign.groupBy({ by: ["status"], _count: { _all: true } });
      return tallyCampaignStatuses((groups as Array<{ status: string; _count: { _all: number } }>)
        .map((g) => ({ status: g.status, count: g._count._all })));
    },
    /** U36 · the nav badge's count as ONE count() — never the rows. Its where is `wantsAttention` in SQL: a status that
     *  always wants an officer, or PAUSED with the list unfinished or a recipient still OUTSTANDING — both lists spread
     *  from campaign-status.ts, never retyped (HELD is outstanding).
     *  ⚖️ ITS PLAN, MEASURED (U36 review F3, 2026-10-02, `campaigns-list-pg-probe` §9 over 60,000 rows): the relation
     *  filter compiles to an UNCORRELATED IN, which PostgreSQL 18 serves with an index-only SKIP SCAN of the (campaignId,
     *  status) index — and production runs 18 (Railway image `postgres-ssl:18`, read the same day). A correlated EXISTS
     *  was tried and planned as a hashed SEQUENTIAL scan — worse. ⛔ Before 18 there is no skip scan: a move to an older
     *  Postgres reopens this. */
    attentionCount: async (): Promise<number> => {
      return pc().smsCampaign.count({
        where: {
          OR: [
            { status: { in: [...ATTENTION_ALWAYS] } },
            { status: ATTENTION_WHEN_OWED, OR: [{ enqueuedAt: null }, { recipients: { some: { status: { in: [...OUTSTANDING_RECIPIENT_STATUSES] } } } }] },
          ],
        },
      });
    },
  },

  smsCampaignRecipient: {
    /** ⭐ THE WHOLE BATCH OR NOTHING, THEN ONE STATEMENT. `assertSeeds` refuses before Postgres is asked; then ONE
     *  `createMany` with `skipDuplicates` (ON CONFLICT DO NOTHING) against `@@unique([campaignId, msisdn])`, so an
     *  enqueue restart cannot put one person on a campaign twice, and the first of two in one batch wins. A missing
     *  campaign, contact or account is P2003 and the statement writes nothing. ⛔ Never an upsert, and the data is the
     *  seed's keys ONLY — no status (the column's PENDING), no `smsReference`: ON CONFLICT has no target, so a
     *  colliding settle key would drop a person silently. */
    createMany: async (seeds: SmsCampaignRecipientSeed[]): Promise<SmsCampaignRecipientInsert> => {
      assertSeeds(seeds);
      if (seeds.length === 0) return { inserted: 0, duplicates: 0 };
      const data = seeds.map((s) => ({
        id: s.id,
        campaignId: s.campaignId,
        msisdn: s.msisdn,
        contactId: s.contactId,
        userId: s.userId,
        optOutToken: s.optOutToken,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.createdAt),
      }));
      const batch = await pc().smsCampaignRecipient.createMany({ data, skipDuplicates: true });
      return { inserted: batch.count, duplicates: seeds.length - batch.count };
    },
    find: async (id: string): Promise<StoredSmsCampaignRecipient | null> => {
      const row = await pc().smsCampaignRecipient.findUnique({ where: { id } });
      return row ? toStoredSmsCampaignRecipient(row) : null;
    },
    /** ONE groupBy by status — never the rows — through `fillRecipientCounts`: every status in the schema's order,
     *  zeros included. */
    countByStatus: async (campaignId: string): Promise<SmsCampaignRecipientCount[]> => {
      const groups = await pc().smsCampaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
      return fillRecipientCounts((groups as Array<{ status: string; _count: { _all: number } }>)
        .map((g) => ({ status: g.status as SmsCampaignRecipientStatus, count: g._count._all })));
    },
    /** U36 · each campaign named, with its recipients by status — ONE groupBy by (campaignId, status) WHERE campaignId
     *  is one of the ids handed in (the list's page, never the whole table), zero-filled for every id. An empty list
     *  asks nothing and answers {}. */
    countsByCampaign: async (ids: readonly string[]): Promise<SmsCampaignRecipientCountsById> => {
      if (ids.length === 0) return {};
      const groups = await pc().smsCampaignRecipient.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: [...ids] } }, _count: { _all: true } });
      return tallyRecipientsByCampaign(ids, (groups as Array<{ campaignId: string; status: string; _count: { _all: number } }>)
        .map((g) => ({ campaignId: g.campaignId, status: g.status, count: g._count._all })));
    },
    /** U47b-1 · THE LIVE PAGE'S ONE GROUPBY — ONE groupBy by (status, skipReason, failureClass) WHERE the campaign is this
     *  one — never the rows, never a counter (OD26) — answered through the ONE tally the memory twin answers with
     *  (`tallyRecipientOutcomes`: merged, none dropped, one order). A null reason or class is a group of its own. */
    countByOutcome: async (campaignId: string): Promise<SmsCampaignRecipientOutcomeCount[]> => {
      const outcomes = await pc().smsCampaignRecipient.groupBy({ by: ["status", "skipReason", "failureClass"], where: { campaignId }, _count: { _all: true } });
      return tallyRecipientOutcomes((outcomes as Array<{ status: string; skipReason: string | null; failureClass: string | null; _count: { _all: number } }>)
        .map((g) => ({ status: g.status, skipReason: g.skipReason, failureClass: g.failureClass, count: g._count._all })));
    },
    /** U16a · THE ACCESS EXPORT'S READ — the rows about ONE number CREATED OR SENT on or after `sinceIso`, NEWEST first,
     *  ties broken on `id` the same way, at most `SMS_RECIPIENTS_BY_NUMBER_MAX` + 1 — the one past the cap only tells the
     *  export that it cut (D10) — `msisdn` is indexed. The rule set is asked first. ⛔ The bound is IN THE WHERE, never a
     *  filter after the read: a recycled number's older rows — a previous holder's — are never read, so they cannot crowd
     *  this person's rows out of the cap; a row put on a campaign before the number passed to this person but SENT after
     *  it is theirs, so the OR takes it (D12). The OR always has its two arms — an EMPTY `OR` nested in a where is no
     *  condition at all on Postgres (every row), the trap `playerWalk` answers before it queries. */
    listByMsisdn: async (msisdn: string, sinceIso: string): Promise<StoredSmsCampaignRecipient[]> => {
      assertRecipientNumberRead(msisdn, sinceIso);
      const bound = new Date(sinceIso);
      const rows = await pc().smsCampaignRecipient.findMany({
        where: { msisdn, OR: [{ createdAt: { gte: bound } }, { sentAt: { gte: bound } }] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: SMS_RECIPIENTS_BY_NUMBER_MAX + 1,
      });
      return rows.map(toStoredSmsCampaignRecipient);
    },
    /** U16a · ERASURE'S REACH — ONE statement: every row linked to the account loses the link, and the only other column
     *  written is the caller's stamp (C25: `updatedAt` is `@updatedAt`, and leaving it to Prisma would stamp another
     *  instant than the memory twin's). The number, the status, the stamps and the gate trail stay — the record of what
     *  was sent (GN 478T reg 51(1)). The rule set is asked first: a missing id here would be NO CONDITION, every row
     *  unlinked. ⛔ Never a delete. `userId` is indexed. */
    unlinkUser: async (userId: string, at: string): Promise<number> => {
      assertRecipientUnlink(userId, at);
      const unlinked = await pc().smsCampaignRecipient.updateMany({ where: { userId }, data: { userId: null, updatedAt: new Date(at) } });
      return unlinked.count;
    },
    /** U43a · ⭐ THE CLAIM — compare-and-set with a token, four statements and no lock held across a send:
     *  ⓪ ⛔ a token ANY row already holds is refused before anything is written (ONE read on the `claimToken` index,
     *  `refuseHeldToken` — D16: a token is fresh for each claim, so ③ can only ever answer THIS claim's rows);
     *  ① the first `limit` FREE rows of the campaign by id (PENDING, no claim — E21: the walk's order); ② ONE conditional
     *  `updateMany` that writes the claim only where each row is STILL PENDING and unclaimed — Postgres re-checks that WHERE
     *  after any concurrent commit, so of two claimants racing for a row exactly one takes it and the other's count simply
     *  misses it; ③ the won set read BACK BY THE TOKEN (`recipientsClaimedBy`), so what this claimant holds is exactly
     *  readable whatever the race did. The rule set is asked first: a missing campaign id would be NO CONDITION. */
    claim: async (campaignId: string, limit: number, token: string, at: string): Promise<StoredSmsCampaignRecipient[]> => {
      assertClaim(campaignId, limit, token, at);
      if ((await pc().smsCampaignRecipient.findFirst({ where: { claimToken: token }, select: { id: true } })) !== null) refuseHeldToken();
      const free = await pc().smsCampaignRecipient.findMany({
        where: { campaignId, status: "PENDING", claimToken: null },
        orderBy: { id: "asc" },
        take: limit,
        select: { id: true },
      });
      if (free.length === 0) return [];
      await pc().smsCampaignRecipient.updateMany({
        where: { id: { in: free.map((r) => r.id) }, campaignId, status: "PENDING", claimToken: null },
        data: smsRecipientData(claimWrite(token, at)),
      });
      return recipientsClaimedBy(campaignId, token);
    },
    /** U43a · the campaign's rows STILL PENDING under this claim — what the slice's `beforeSend` re-reads just before the
     *  wire (E6): a row reaped, released or settled since is not among them, so a stalled slice sends nothing. */
    claimedBy: async (campaignId: string, token: string): Promise<StoredSmsCampaignRecipient[]> => {
      assertClaimRead(campaignId, token);
      return recipientsClaimedBy(campaignId, token);
    },
    /** U43a · ⭐ THE SETTLE — ONE `$transaction` of conditional `updateMany`s, one per patch, each written only WHERE its
     *  row's id, the claim the patch names AND status PENDING all still hold; the data is the rule set's `settleWrite`
     *  through the map. A statement that wrote nothing is that patch's id in `lost` — a reaped row, a row a receipt
     *  settled, a stalled slice's claim — never forced. All or nothing: a refused statement (a reference another row
     *  holds, P2002 — the code the memory twin's refusal carries too) rolls the whole settle back. The statements run in id
     *  order, so two settles that overlap always take their row locks in the same order and cannot deadlock. The rule set
     *  is asked first. The contract — what a caller owes, what this door never writes — is `SmsCampaignRecipientSettle`'s
     *  (store.ts). */
    settle: async (patches: readonly SmsCampaignRecipientSettle[], at: string): Promise<SmsCampaignSettleResult> => {
      assertSettle(patches, at);
      if (patches.length === 0) return { settled: 0, lost: [] };
      const ordered = [...patches].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const written = await pc().$transaction(ordered.map((p) => pc().smsCampaignRecipient.updateMany({
        where: { id: p.id, claimToken: p.claimToken, status: "PENDING" },
        data: smsRecipientData(settleWrite(p, at)),
      })));
      // Each statement's own count, read beside the patch that built it (one array, built once — the patch and its
      // statement travel together): a 0 is that patch's id in `lost`.
      const landed = new Set(ordered.filter((_, i) => written[i].count > 0).map((p) => p.id));
      return { settled: landed.size, lost: patches.filter((p) => !landed.has(p.id)).map((p) => p.id) };
    },
    /** U43a · THE REAPER'S QUESTION (E6) — ONE findMany of the campaign's PENDING rows holding a claim STRICTLY OLDER than
     *  the cutoff (`lt`: a claim at the cutoff is not yet stranded), oldest claim first, then id, at most `limit`. */
    findStranded: async (campaignId: string, cutoff: string, limit: number): Promise<StoredSmsCampaignRecipient[]> => {
      assertStrandedRead(campaignId, cutoff, limit);
      const rows = await pc().smsCampaignRecipient.findMany({
        where: { campaignId, status: "PENDING", claimToken: { not: null }, claimedAt: { lt: new Date(cutoff) } },
        orderBy: [{ claimedAt: "asc" }, { id: "asc" }],
        take: limit,
      });
      return rows.map(toStoredSmsCampaignRecipient);
    },
    /** U43a · RESUME'S RE-QUEUE (E8) — ONE updateMany WHERE the campaign AND status HELD, ⛔ and nothing else (never
     *  UNCONFIRMED, never a settled row): PENDING, `attempts` 0, the claim's token and the hold's class cleared (its
     *  `claimedAt` kept, D15), the caller's stamp, through the map. Answers how many rows moved. */
    requeueHeld: async (campaignId: string, at: string): Promise<number> => {
      assertRequeueHeld(campaignId, at);
      const requeued = await pc().smsCampaignRecipient.updateMany({ where: { campaignId, status: "HELD" }, data: smsRecipientData(requeueWrite(at)) });
      return requeued.count;
    },
    /** U43a · "NOBODY IS DRIVING" — the newest `claimedAt` on the campaign: ONE row, newest first, read down
     *  `SmsCampaignRecipient_campaignId_claimedAt_idx` from its end; null when nothing was ever claimed. ⛔ Never
     *  `aggregate`'s `_max` (the check of 980e2ee7): Prisma wraps an aggregate in a sub-select with an OFFSET, which
     *  Postgres cannot see through, so it read every row of the campaign. A settled or held row keeps its claim, and a
     *  released or requeued row keeps the instant of its last claim (D15), so the answer never moves backwards while a
     *  page claims and releases. */
    lastActivity: async (campaignId: string): Promise<string | null> => {
      assertActivityRead(campaignId);
      const newest = await pc().smsCampaignRecipient.findFirst({ where: { campaignId, claimedAt: { not: null } }, orderBy: { claimedAt: "desc" }, select: { claimedAt: true } });
      return iso(newest?.claimedAt);
    },
    /** U48a · E5 — "NO RECEIPT AFTER 15 MINUTES": ONE count of the campaign's rows that are STILL SENT (no receipt has moved
     *  them) and were handed over STRICTLY before the bound (`lt`: a row at the bound is not yet older) — their own `sentAt`,
     *  never `updatedAt`. The rows are never read, and the rule set is asked first: a missing id would count every
     *  campaign's SENT rows. Served by the (campaignId, status) index, then each SENT row's instant. */
    countSentBefore: async (campaignId: string, before: string): Promise<number> => {
      assertSentBeforeRead(campaignId, before);
      return pc().smsCampaignRecipient.count({ where: { campaignId, status: "SENT", sentAt: { lt: new Date(before) } } });
    },
    /** U48a · E30 — THE STOPPED-BY-LINK WALK'S PAGE: ONE findMany of the campaign's SENT and DELIVERED rows that carry a
     *  hand-over instant, by number — keyset on the unique (campaignId, msisdn) index (`gt` the cursor; null: from the start),
     *  at most `limit`, selecting the number and the instant ALONE (never a row, a token or a reference). A FAILED row never
     *  reached its person, an UNCONFIRMED one carries no instant to date a stop against. The rule set is asked first. */
    handedOverPage: async (campaignId: string, after: string | null, limit: number): Promise<SmsCampaignHandedOver[]> => {
      assertHandedOverRead(campaignId, after, limit);
      const rows = await pc().smsCampaignRecipient.findMany({
        where: { campaignId, status: { in: ["SENT", "DELIVERED"] }, sentAt: { not: null }, ...(after === null ? {} : { msisdn: { gt: after } }) },
        orderBy: { msisdn: "asc" },
        take: limit,
        select: { msisdn: true, sentAt: true },
      });
      const people: SmsCampaignHandedOver[] = [];
      for (const r of rows) {
        if (r.sentAt !== null) people.push({ msisdn: r.msisdn, sentAt: r.sentAt.toISOString() });
      }
      return people;
    },
    /** U46a · ⭐ THE RECEIPT DOOR (E28) — ONE conditional `updateMany`, so Postgres decides once and never a read-then-write:
     *  written only WHERE the row is the one named, holds the MESSAGE's number, holds no reference yet or the receipt's own
     *  (the identity), AND is in a status a receipt moves (`SMS_RECEIPT_FROM`, spread — never retyped: PENDING, SENT,
     *  UNCONFIRMED); the data is the rule set's `receiptWrite` through the map, so the claim stays on the row. Postgres
     *  re-checks that WHERE after any concurrent commit, so a receipt and a settle racing for one claimed row take its lock
     *  in turn and each sees the other's write: the receipt first leaves the settle `lost` (D5); the settle first (SENT,
     *  the receipt's own reference) is followed by the receipt, as it would be a minute later. A statement that wrote
     *  nothing is followed by ONE read of the row, answered through `receiptMiss` — the reading the memory twin shares. A
     *  reference another row already holds is P2002 and writes nothing. The rule set is asked first: a missing id or number
     *  would be NO CONDITION. */
    recordReceipt: async (id: string, r: SmsRecipientReceipt): Promise<SmsRecipientReceiptResult> => {
      assertReceipt(id, r);
      const moved = await pc().smsCampaignRecipient.updateMany({
        where: { id, msisdn: r.msisdn, status: { in: [...SMS_RECEIPT_FROM] }, OR: [{ smsReference: null }, { smsReference: r.reference }] },
        data: smsRecipientData(receiptWrite(r)),
      });
      if (moved.count > 0) return { changed: true, reason: "applied" };
      const row = await pc().smsCampaignRecipient.findUnique({ where: { id } });
      return { changed: false, reason: receiptMiss(row ? toStoredSmsCampaignRecipient(row) : null, r) };
    },
    /** U43b-2 · ⭐ DC-4 · THE SEND RECORD WHEN A RECEIPT WINS (ENGINE-SPEC §4.13 decision 6) — ONE conditional `updateMany`,
     *  so Postgres decides once: written only WHERE the row named still holds the lost patch's claim, is in a status a receipt
     *  settled it to (`SMS_SEND_RECORD_FROM`, spread — never retyped: DELIVERED, FAILED) AND its trail is still null (Json
     *  `AnyNull`: the database's NULL — the one a row is born with — or a JSON null); the data is the rule set's
     *  `sendRecordWrite` through the map, so the status, the reference and the receipt's own columns are never written.
     *  Postgres re-checks that WHERE after any concurrent commit, so of two writers of one trail (this and the reaper) one
     *  lands. The rule set is asked first: a missing id would be NO CONDITION. */
    recordSend: async (id: string, s: SmsRecipientSendRecord, at: string): Promise<SmsRecipientSendRecordResult> => {
      assertSendRecord(id, s, at);
      const owed = await pc().smsCampaignRecipient.updateMany({
        where: { id, claimToken: s.claimToken, status: { in: [...SMS_SEND_RECORD_FROM] }, gateTrail: { equals: PrismaRuntime.AnyNull } },
        data: smsRecipientData(sendRecordWrite(s, at)),
      });
      return { written: owed.count > 0 };
    },
  },
};
