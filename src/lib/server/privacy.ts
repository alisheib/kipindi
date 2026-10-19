/**
 * Privacy operations — DSAR (Data Subject Access Request) + erasure.
 *
 * Aligns with:
 *  - Tanzania Personal Data Protection Act (PDPA) 2022 §29 (right of access)
 *                                              §30 (right of correction)
 *                                              §31 (right of erasure)
 *  - GDPR Art. 15 (access), Art. 17 (erasure)
 *
 * SLA: 30 calendar days from request to fulfilment (PDPA + GDPR aligned).
 *
 * In production this writes to a `dsar_request` Postgres table; here it lives on
 * `globalThis.__50PICK_DSAR_QUEUE` so it survives module reloads in dev.
 */
import { runOutsideLock } from "./locks";
import { audit } from "./audit";
import { db } from "./store";
import type { StoredKyc, StoredTxn, StoredUser } from "./store";
import { loadConfig, loadConfigResult, saveConfig } from "./config-store";
import { anonymizeClosedAccount, type AnonymizeOutcome } from "./erasure";
// ⭐ `/admin/privacy` reads the held identities through THIS module (2026-10-11): the DSAR page already reaches the
// erasure routine through `fulfillDsarRequest`, and `test:house-bot-surfaces` §3 holds every module an admin page
// imports directly to that feature's word register — which the routine's owner-managed-account refusal is not on.
export { listHeldIdentities, type HeldIdentity } from "./erasure";
// 🔴 THE DSAR BUNDLE INVENTED A THIRD ADDRESS. `privacy@50pick.tz` appeared nowhere else in
// the platform — no config, no admin field, and contradicting `/legal/privacy` §1 — on the two
// sentences that tell a data subject HOW to exercise correction and erasure. Those are
// statutory response paths with a 30-day clock attached (PDPA 2022 §31 / GDPR Art. 17), so an
// address that does not resolve is a compliance failure, not a typo.
import { SUPPORT_EMAIL } from "./support-config";
import { marketingDsarView } from "./marketing/dsar";
import { noticeStore, ticketStore, weekStore, type SeenNotice, type StoredTicket } from "./maswali-dal";
import { SLOT_COUNT, slotLabel } from "@/lib/maswali-score";
import { shareStateOf } from "@/lib/maswali-share-note";

const DSAR_QUEUE_KEY = "privacy.dsar_queue";

export type DsarType = "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
/**
 * ⭐ `PARTIAL` EXISTS BECAUSE "FULFILLED" WOULD HAVE BEEN A FALSE STATEMENT.
 *
 * An erasure request against an account closed less than seven years ago cannot be finished:
 * the identity record — since 2026-10-11 (Part C, the owner's ruling) the typed name, date of
 * birth and document number as well as the IMAGES — is held under POCA Cap 423 §16 / FATF
 * R.11, which is exactly the posture `/admin/retention` already publishes to the Gaming Board
 * — *"we PARTIALLY fulfil"*.
 * Stamping such a request FULFILLED would put the platform's own queue in the same position
 * as the retention schedule that F-01 found: describing work it has not done.
 *
 * ⛔ It also has to STAY IN THE QUEUE. Nothing on this platform re-runs erasure at year
 * seven — there is no seven-year timer and building one nobody can test for seven years
 * would be worse than saying so. The open request IS the reminder, and it carries the date.
 *
 * ⭐ ITS SECOND CAUSE (2026-10-11, Part C review): a run AFTER the hold in which a deletion in the file storage
 * failed (`erasureObjectsFailed` > 0, no held-until date). The identity record is erased by then, but files may remain
 * — so the request stays PARTIAL, and open, until a re-run finishes them.
 */
export type DsarStatus = "PENDING" | "PARTIAL" | "FULFILLED" | "REJECTED";

export type DsarRequest = {
  id: string;
  userId: string;
  type: DsarType;
  status: DsarStatus;
  reason: string | null;
  requestedAt: string;
  fulfilledAt: string | null;
  fulfilledBy: string | null;
  /** Filename of the export payload, if access type. */
  exportRef: string | null;
  /** ERASURE only: the date the held identity record — the typed details and the images — may
   *  be erased (ISO `YYYY-MM-DD`), or null once it has been. Set when the status becomes
   *  `PARTIAL`. `/admin/privacy` also derives the same dates from the accounts themselves
   *  (`listHeldIdentities`), so the reminder does not live in this one blob alone. */
  erasureHeldUntil?: string | null;
  /** ERASURE only: stored identity files the last run could NOT delete (storage unreachable, a refused object). While it
   *  is above zero the request stays `PARTIAL` — re-run it once storage answers (2026-10-11, Part C review). */
  erasureObjectsFailed?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_DSAR_QUEUE: DsarRequest[] | undefined;
}
const queue: DsarRequest[] = globalThis.__50PICK_DSAR_QUEUE ?? (globalThis.__50PICK_DSAR_QUEUE = []);

// DSAR requests carry a 30-day statutory SLA (PDPA/GDPR), so the pending-request
// queue must survive deploys — losing it would drop tracked legal obligations.
// Persist write-through to SystemConfig (low volume); hydrate eagerly on boot.
// (The audit log already records each filing durably; this keeps the operator's
//  actionable work-queue intact too.)
void loadConfig<DsarRequest[]>(DSAR_QUEUE_KEY)
  .then((stored) => { if (stored && queue.length === 0) queue.push(...stored); })
  .catch(() => {});
function persistQueue(): void {
  void saveConfig(DSAR_QUEUE_KEY, queue);
}

/** Player-initiated request (called from /profile/account export/close flow). */
export function fileDsarRequest(opts: { userId: string; type: DsarType; reason?: string }): DsarRequest {
  const r: DsarRequest = {
    id: `dsar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: opts.userId,
    type: opts.type,
    status: "PENDING",
    reason: opts.reason ?? null,
    requestedAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfilledBy: null,
    exportRef: null,
    erasureHeldUntil: null,
  };
  queue.push(r);
  persistQueue();
  // A2 row 14 · an ERASURE request stops a house bot on this account while we handle it (04 A5, C9).
  if (r.type === "ERASURE") {
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(opts.userId, "ERASURE_REQUEST")).catch(() => {});
    });
  }
  audit({
    category: "ADMIN",
    action: "privacy.dsar.filed",
    actorId: opts.userId,
    targetType: "DsarRequest",
    targetId: r.id,
    payload: { type: r.type, reason: r.reason },
  });
  return r;
}

/**
 * Officer closes a DSAR. Returns a discriminated result so the caller can surface exactly
 * why an erasure could not be closed.
 *
 * ⭐ ERASURE IS NOT A STATUS FLIP, AND NEVER WAS ALLOWED TO BE. Until 2026-08-21 this branch
 * REFUSED outright, because marking a request fulfilled while every column stayed intact
 * records a false "we erased your data" in a compliance queue — the worst kind of green.
 * The refusal was correct for as long as there was no routine. There is one now, so the
 * branch RUNS it instead of refusing, and the three outcomes are kept distinct:
 *
 *   · the routine refuses (the account is not closed) → the request stays PENDING and the
 *     officer is told what to do about it. Still no false fulfilment.
 *   · the routine runs and the 7-year hold is still on → **PARTIAL**, with the release date
 *     on the request. The request stays in the queue because nothing else will remember.
 *   · the routine runs and nothing is left to hold → FULFILLED.
 */
export async function fulfillDsarRequest(opts: { id: string; officerId: string; exportRef?: string | null }):
  Promise<{ ok: true; request: DsarRequest; erasure?: AnonymizeOutcome } | { ok: false; error: string }> {
  const r = queue.find((x) => x.id === opts.id);
  if (!r) return { ok: false, error: "DSAR not found." };

  let erasure: AnonymizeOutcome | undefined;
  if (r.type === "ERASURE") {
    // A routine that THROWS part-way is a refusal the officer must see, not an unhandled error that writes no
    // record (house-bots review MC-4): the same blocked row, with the reason "error". It is re-runnable.
    erasure = await anonymizeClosedAccount(r.userId, { officerId: opts.officerId }).catch((err: unknown): AnonymizeOutcome => {
      console.error("[privacy] erasure threw:", (err as Error)?.message ?? err);
      return { ok: false, reason: "error", error: "Erasure stopped part-way with an error. Nothing was marked fulfilled — fix the cause, then run it again." };
    });
    if (!erasure.ok) {
      // ⛔ The SAME audit action the old refusal wrote, deliberately. A regulator reading the
      // chain for "when could we not erase, and why" gets one action name across both eras,
      // and the payload now says which of the two reasons it was.
      audit({
        category: "COMPLIANCE", action: "privacy.dsar.erasure_blocked", actorId: opts.officerId,
        targetType: "DsarRequest", targetId: r.id,
        payload: { userId: r.userId, reason: erasure.reason },
      });
      return { ok: false, error: erasure.error };
    }
  }

  // 🔴 PARTIAL, NOT FULFILLED, while a statutory hold is still running. See `DsarStatus`.
  // ⭐ …AND WHILE ANY STORED FILE COULD NOT BE DELETED (2026-10-11, Part C review). After the release the routine keeps a
  // row whose object refused to go ("the row only goes if the bytes went") and counts it — a FULFILLED there would say
  // "we erased your data" over files that are still stored, and drop the request (and its button) from the queue.
  const held = erasure?.ok ? erasure.documentsHeldUntil : null;
  // …and the agent programme's files count too (2026-10-11, reviews PC-1/PC-2/PC-3): a referee's ID scan the storage
  // refused is a stored file all the same, and nothing else re-runs this request once it reads FULFILLED.
  const failedObjects = erasure?.ok ? erasure.counts.documentObjectsFailed + erasure.counts.agentDocumentObjectsFailed : 0;
  r.status = held || failedObjects > 0 ? "PARTIAL" : "FULFILLED";
  r.fulfilledAt = new Date().toISOString();
  r.fulfilledBy = opts.officerId;
  r.exportRef = opts.exportRef ?? null;
  r.erasureHeldUntil = held;
  r.erasureObjectsFailed = failedObjects;
  persistQueue();
  audit({
    category: "ADMIN",
    action: "privacy.dsar.fulfilled",
    actorId: opts.officerId,
    targetType: "DsarRequest",
    targetId: r.id,
    // ⛔ Counts and dates only. Never a field of the data just erased — this row is in the
    // append-only chain for seven years, which would make it the last place it survives.
    payload: {
      type: r.type, userId: r.userId, exportRef: r.exportRef,
      status: r.status,
      ...(erasure?.ok ? { erasureHeldUntil: held, ...erasure.counts } : {}),
    },
  });
  return { ok: true, request: r, erasure };
}

/**
 * ⛔ ONE OPEN REQUEST PER PERSON PER KIND — the cap BOTH doors share.
 *
 * It lives here rather than in either action for two reasons. The player's door is a public
 * form on an authenticated session, so without a cap a frustrated player (or a script) fills
 * the compliance queue with a hundred identical erasure requests and the officer can no longer
 * see the real ones. And the OFFICER's door needs the same protection for a duller reason: a
 * double-click, or two officers taking the same walk-in, files it twice. A cap in one action
 * and not the other is a cap somebody will find the way around.
 *
 * ⚠️ `PARTIAL` counts as OPEN. A partially fulfilled erasure is still live work — the identity
 * record is held to a date, and the request is what an officer re-runs on it — so a second erasure
 * request for the same account would duplicate a job already in progress.
 */
export function hasOpenRequest(userId: string, type: DsarType): boolean {
  return queue.some(
    (r) => r.userId === userId && r.type === type && (r.status === "PENDING" || r.status === "PARTIAL"),
  );
}

/**
 * The two rights a DSAR register is FOR.
 *
 * ⭐ ACCESS and PORTABILITY are deliberately absent, and this constant is where that decision
 * is enforced rather than remembered. Both are already served — immediately, with no queue and
 * no clock — by the data export (`exportUserData` for the player, `buildDsarBundle` for the
 * officer). Filing one opens a 30-day statutory obligation for work that is already done, and a
 * queue full of already-answered requests is exactly how a real one gets missed. Ali's decision,
 * 2026-08-21: *"the ACCESS right needs no DSAR at all… the register is for ERASURE and
 * CORRECTION, the requests that need a human decision and a statutory clock."*
 */
export const REQUESTABLE_TYPES = ["ERASURE", "CORRECTION"] as const;
export type RequestableType = (typeof REQUESTABLE_TYPES)[number];

/** Narrow untrusted form input to a type the register accepts. ⛔ Never a cast. */
export function asRequestableType(raw: unknown): RequestableType | null {
  return (REQUESTABLE_TYPES as readonly string[]).includes(String(raw))
    ? (String(raw) as RequestableType)
    : null;
}

/**
 * The account's open ERASURE request (PENDING or PARTIAL), read from the DURABLE queue (house bots, C4-SPEC rulings 85,
 * 130). The process array above is hydrated by a fire-and-forget read at module load, so a container can answer from an
 * empty array just after boot, or miss a request another container filed. This reads the stored copy, awaited, and
 * then this process's own array (a request filed here whose write-through has not landed yet), and answers with the
 * first open request in either — failing closed.
 *
 * ⛔ A READ THAT FAILS THROWS. A house holder snapshot must never read "no request" from a queue it could not read.
 */
export async function openErasureRequest(userId: string): Promise<DsarRequest | null> {
  const open = (r: DsarRequest) => r.userId === userId && r.type === "ERASURE" && (r.status === "PENDING" || r.status === "PARTIAL");
  const stored = await loadConfigResult<DsarRequest[]>(DSAR_QUEUE_KEY);
  if (!stored.ok) throw new Error(`privacy: the data-rights queue is unreadable — ${stored.error}`);
  return (stored.value ?? []).find(open) ?? queue.find(open) ?? null;
}

export function listDsarRequests(filter?: { status?: DsarStatus }): DsarRequest[] {
  return queue
    .filter((r) => !filter?.status || r.status === filter.status)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

/**
 * 🔴 THE ONE PROJECTION OF A USER ROW THAT MAY LEAVE THE PLATFORM.
 *
 * An ALLOWLIST, deliberately, and it must stay one. A denylist ("everything except
 * passwordHash") silently starts leaking the next secret column somebody adds to `User`;
 * an allowlist silently starts OMITTING a new field, which is a bug a player can report
 * and nobody can exploit. When those are the two failure modes, pick the boring one.
 *
 * WHY THIS FUNCTION EXISTS (2026-08-20). The platform grants the same right — access /
 * portability — through two doors, and they had drifted:
 *
 *   · `buildDsarBundle` (officer-triggered, /admin/privacy + /admin/players) field-picked
 *     correctly and never carried a secret.
 *   · `exportUserData` (PLAYER-triggered, /profile/account → "Export my data") returned
 *     `await db.user.findById(userId)` WHOLE. Measured: the downloaded JSON contained the
 *     account's scrypt `passwordHash` AND `passwordSalt`.
 *
 * That is the worse of the two doors to get wrong. The file lands in a phone's Downloads,
 * gets mailed to the player, synced to consumer cloud storage — carrying an offline
 * cracking target for their own account, and for every other service where they reused the
 * password. Nothing in the export needed it; nobody had noticed because the safe
 * implementation and the unsafe one lived in different files.
 *
 * Both doors now read this function. There is one list, in one place.
 */
export function dsarUserView(user: StoredUser) {
  return {
    id: user.id,
    phoneE164: user.phoneE164,
    email: user.email ?? null,
    role: user.role,
    status: user.status,
    locale: user.locale,
    displayName: user.displayName,
    dob: user.dob,
    region: user.region,
    acceptedTermsVersion: user.acceptedTermsVersion,
    acceptedTermsAt: user.acceptedTermsAt,
    marketingOptIn: user.marketingOptIn,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    closedAt: user.closedAt,
  };
}

/**
 * The transaction keys a data-rights file carries, in `toStoredTxn`'s order (`prisma-dal.ts`) — exactly the 23 keys a
 * `StoredTxn` had before house bots (C5-SPEC ruling 169).
 */
export const DSAR_TXN_KEYS = [
  "id", "walletId", "userId", "type", "status", "amount", "fee", "taxWithheld", "balanceAfter", "currency", "provider",
  "providerRef", "providerStatus", "payoutRail", "msisdn", "description", "positionId", "amlReason", "createdAt", "updatedAt",
  "completedAt", "idempotencyKey", "pendingNotifiedAt",
] as const;

/**
 * ⭐ ONE TRANSACTION PROJECTION FOR BOTH RELEASABLE DOORS (owner ruling D19; C5-SPEC rulings 168–169).
 *
 * 🔴 THE DEFECT IT CLOSES. `buildDsarBundle` returned `db.txn.findByUser` rows WHOLE. On Postgres every row carries the
 * key `houseBotId` — null for a player, a bot's id on a house stake's rows — and this file goes to the data subject.
 * The player door had a key-removing destructure instead; two doors, two mechanisms, one of them leaking.
 *
 * ⛔ AN ALLOWLIST, FOR THE REASON `dsarUserView` IS ONE: a column added to `Transaction` tomorrow must not reach a
 * subject's file by default. A house stake's rows stay in the file as the holder's own rows — exactly like their own bets,
 * never removed and never marked (D19c).
 *
 * ⚠️ VALUES ARE COPIED VERBATIM, never `?? null`: a memory row may lack `providerStatus` or `payoutRail`, and
 * `JSON.stringify` drops an `undefined` exactly as the unprojected row did, so the file a player downloads is unchanged.
 */
export function dsarTxnView(t: StoredTxn) {
  return {
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
    providerStatus: t.providerStatus,
    payoutRail: t.payoutRail,
    msisdn: t.msisdn,
    description: t.description,
    positionId: t.positionId,
    amlReason: t.amlReason,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt,
    idempotencyKey: t.idempotencyKey,
    pendingNotifiedAt: t.pendingNotifiedAt,
  };
}

/**
 * ⭐ ONE KYC PROJECTION FOR BOTH RELEASABLE DOORS (2026-10-10, reviews R2.4/R4.3) — the player's own download
 * (`exportUserData`) and the officer's DSAR bundle (below), as `dsarUserView` and `dsarTxnView` already are.
 *
 * 🔴 THE DEFECT IT CLOSES. Both doors returned `db.kyc.findByUserId` WHOLE, and from 2026-10-10 the row carries the
 * automatic approval's internals: `autoFlags` (a `SAME_PERSON` flag in a file the player downloads tells them their
 * identity was matched to another account — AML tipping-off), the post-checking officer, and inside each prior identity
 * the officer who decided it.
 *
 * ⛔ AN ALLOWLIST, for the reason `dsarUserView` is one: a column added to `KycSubmission` tomorrow must not reach a
 * subject's file by default. What the subject IS entitled to stays: the details they submitted, the status and its
 * dates, the reason they were given (code and note), the documents they sent (by reference), the requests made of them,
 * that an approval happened and when (`autoApprovedAt`, `photoVerifiedAt`), and their own prior identities' details.
 * Left out on purpose: `autoFlags`, `postCheckedAt` / `postCheckedById`, `reviewerId`, and the `reviewerId` inside every
 * prior identity — staff identities and internal checks, not the subject's data.
 * ⚠️ VALUES ARE COPIED VERBATIM (the `dsarTxnView` rule), so the file is otherwise what the row was.
 */
export function dsarKycView(k: StoredKyc | null | undefined) {
  if (!k) return null;
  return {
    id: k.id,
    userId: k.userId,
    status: k.status,
    rejectReason: k.rejectReason,
    rejectNote: k.rejectNote,
    idType: k.idType,
    idNumber: k.idNumber,
    idExpiry: k.idExpiry,
    idVerifiedAt: k.idVerifiedAt,
    fullName: k.fullName,
    dob: k.dob,
    documents: k.documents,
    extraRequests: k.extraRequests,
    reviewedAt: k.reviewedAt,
    submittedAt: k.submittedAt,
    approvedAt: k.approvedAt,
    photoVerifiedAt: k.photoVerifiedAt,
    autoApprovedAt: k.autoApprovedAt,
    priorIdentities: Array.isArray(k.priorIdentities)
      ? k.priorIdentities.map((p) => ({
          idType: p.idType,
          idNumber: p.idNumber,
          idExpiry: p.idExpiry,
          fullName: p.fullName,
          dob: p.dob,
          status: p.status,
          approvedAt: p.approvedAt,
          cause: p.cause,
          supersededAt: p.supersededAt,
        }))
      : k.priorIdentities,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  };
}

/** Which releasable door a Millionea section is built for: the holder's own download, or the bundle an officer builds. */
export type MillioneaDoor = "owner" | "officer";

/**
 * ⭐ ONE MILLIONEA TICKET PROJECTION FOR BOTH RELEASABLE DOORS (MASWALI-BUILD S6, MB-67) — the player's own download
 * (`exportUserData`) and the officer's DSAR bundle (below), as `dsarKycView` and `dsarTxnView` already are.
 *
 * 🔴 THE GAP IT CLOSES. A ticket's fifteen answers were in neither door: a holder's file carried the stake and the payout
 * (the transactions) and not what the money was staked on.
 *
 * ⛔ AN ALLOWLIST, for `dsarUserView`'s reason: a column added to `MaswaliTicket` tomorrow must not reach a subject's file
 * by default. What the holder is entitled to: the serial and the week, the fifteen answers under the labels the ticket
 * prints (M1…M10, A1…A5), when it was bought and cancelled, the close it was bought under, the rules version, the grade,
 * the share as the ticket page names it (paid, held for review, forfeited), the commitment leaf, and when they last
 * opened it.
 * ⛔ THE SALT REACHES THE OWNER'S OWN DOWNLOAD ONLY (MB-32). It is what lets a holder recompute their leaf, and it is
 *    shown to its owner alone — so the bundle an officer builds and hands over carries the leaf without it, as the
 *    bundle already leaves out every other piece of crypto material (the header of `buildDsarBundle`).
 * ⛔ LEFT OUT ON PURPOSE: `picksKey` (an unsalted hash of the answers, server-only — 2^15 inputs) and `frozenReason` (the
 *    officer's reason for holding a share: the holder reads THAT a share is held, never why, as `dsarKycView` leaves out
 *    `autoFlags`).
 * ⚠️ VALUES ARE COPIED VERBATIM (the `dsarTxnView` rule), so the file says what the row says.
 */
export function dsarMaswaliTicketView(t: StoredTicket, weekCode: string | null, door: MillioneaDoor) {
  // The share's state through the one reading of its mark (`maswali-share-note.ts`); the mark itself never leaves.
  const share = t.status !== "SETTLED" || t.won !== true ? null : shareStateOf(t.frozenReason);
  return {
    serial: t.serial,
    week: weekCode,
    ticketId: t.id,
    weekId: t.cycleId,
    // The bet's own row in the same file: the transactions above carry this id on the stake and the payout.
    positionId: t.positionId,
    status: t.status,
    boughtAt: t.createdAt,
    cancelledAt: t.cancelledAt,
    closeAtPurchase: t.closeAtPurchase,
    rulesVersion: t.rulesVersion,
    picks: Object.fromEntries(t.selections.map((p, i) => [i < SLOT_COUNT ? slotLabel(i + 1) : String(i + 1), p])),
    score: t.score,
    won: t.won,
    payout: t.payout,
    share,
    selectionsHash: t.selectionsHash,
    ...(door === "owner" ? { salt: t.salt } : {}),
    lastViewedAt: t.lastViewedAt,
  };
}

/**
 * The Millionea section of a releasable door, or null for a person with no Millionea row at all — and then the door
 * leaves the section out entirely, so a Yes/No or Up & Down player's file is byte for byte what it was before Millionea.
 * Every ticket the person bought (never a page of the newest: at most a cap a week), and every hub notice they have seen
 * (`MaswaliNoticeSeen`: one row per week and notice, and the instant) — in ANY week, not only the weeks they bought
 * into: the rollover notice is shown to every hub viewer, ticket or not (S6 review, 2026-10-18), and its seen mark is
 * that person's data all the same. Oldest first, so the same person's file reads the same on both stores.
 * ⛔ A read that fails THROWS, as every other read of these two doors does: a file that silently lacks its tickets reads
 * as a file of a person who never bought one.
 */
export async function maswaliDsarSection(userId: string, door: MillioneaDoor) {
  const tickets = await ticketStore.listForUser(userId);
  // Every week there is — a line of weekly rows, so one read; the seen marks are then asked for across all of them.
  const weeks = await weekStore.list();
  const seen: SeenNotice[] = weeks.length > 0 ? await noticeStore.seenFor(userId, weeks.map((w) => w.id)) : [];
  if (tickets.length === 0 && seen.length === 0) return null;
  const codes = new Map<string, string | null>(weeks.map((w) => [w.id, w.code] as const));
  return {
    tickets: tickets.map((t) => dsarMaswaliTicketView(t, codes.get(t.cycleId) ?? null, door)),
    noticesSeen: [...seen]
      .sort((a, b) => a.seenAt.localeCompare(b.seenAt) || a.cycleId.localeCompare(b.cycleId) || a.notice.localeCompare(b.notice))
      .map((s) => ({ week: codes.get(s.cycleId) ?? null, notice: s.notice, seenAt: s.seenAt })),
  };
}

/**
 * Build a full DSAR access bundle for a user. Returns a serialisable object
 * containing every piece of data the platform holds about that user. The
 * output is deliberately verbose — we choose oversharing over undersharing
 * so the DSAR does not fail on appeal.
 *
 * Excludes: secrets (server seeds we own, OTP hashes — not the user's data,
 * those are crypto material), other users' data, internal hash chain links.
 */
export async function buildDsarBundle(userId: string) {
  const user = await db.user.findById(userId);
  if (!user) return null;
  const wallet = await db.wallet.findByUserId(userId);
  const txns = await db.txn.findByUser(userId, 10_000);
  const kyc = await db.kyc.findByUserId(userId);
  const responsible = await db.responsible.get(userId);
  const notifications = await db.notification.findByUser(userId, 1000);
  const millionea = await maswaliDsarSection(userId, "officer");

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    user: dsarUserView(user),
    wallet,
    // ⛔ D19, ruling 169: through the one allowlist, never the raw rows (which carry `houseBotId` on Postgres).
    transactions: txns.map(dsarTxnView),
    // MASWALI-BUILD S6 · MB-67 · a holder's tickets through the ONE ticket allowlist both doors share — without the salt,
    // which is its owner's alone — and the hub notices the person saw. Absent for a person with no Millionea row at all
    // (no ticket, no seen mark), so their bundle is what it always was.
    ...(millionea ? { millionea } : {}),
    // ⛔ 2026-10-10: through the one KYC allowlist both doors share, never the raw row (it carries `autoFlags`).
    kyc: dsarKycView(kyc),
    responsibleGambling: responsible,
    notificationsCount: notifications.length,
    // U18b · the consent ledger, the stop list and the contact book, through ONE allowlist both doors share.
    marketing: await marketingDsarView(user),
    rights: {
      access: "Granted (this document).",
      correction: `Submit a correction request via /profile/account or by contacting ${SUPPORT_EMAIL()}.`,
      // ⚠️ THIS SENTENCE HAS BEEN WRONG IN BOTH DIRECTIONS, WHICH IS WHY IT CARRIES A HISTORY.
      //
      //  · Before 2026-08-20 it promised "available 7 years after account closure subject to
      //    AML retention requirements" — a capability the platform did not have at all.
      //  · Corrected that day to state only the CHANNEL, because there was no routine and the
      //    ERASURE branch of `fulfillDsarRequest` refused rather than acting.
      //  · Corrected again 2026-08-21, because there IS a routine now
      //    (`anonymizeClosedAccount`) and describing a capability we have as a mere postal
      //    address is the same defect pointing the other way: it under-states a right.
      //  · Corrected again 2026-10-07 (approved by Ali in the session — COMPLIANCE-DECISIONS
      //    "Privacy v2026-10-07"): "we erase your contact details" was false of the phone
      //    number, which erasure deliberately KEEPS — in the record of the person's marketing
      //    choices (the consent ledger, the stop list and the emptied book row, U18b) so they are
      //    never messaged again (G10 of 2026-10-05), and in the records of the marketing text
      //    messages sent to it, kept 7 years with only the account link removed (U16a's
      //    `unlinkCampaignRecipients`; DATA-RETENTION rows 48–49).
      //  · And again the same day, on the review (the lead's words, to be put to Ali): "they are
      //    erased when that period ends" is gone — money and audit rows are NEVER deleted
      //    (DATA-RETENTION §1: "Never deleted — by design"); and "only" is gone — the number also
      //    stays in the log of the security codes texted to it and in the payment records, both
      //    kept because the law requires them, which the last sentence now says.
      //  · And on 2026-10-09 (the owner's ruling that a marketing SMS is sent exactly as the officer wrote
      //    it — COMPLIANCE-DECISIONS "Privacy v2026-10-09"): "and the stop link it carried" is gone, since
      //    no marketing text message carries a stop link any more; the note under "Erase my data" says
      //    the same record in the same words.
      //  · And on 2026-10-11 (Part C — the owner's ruling of 2026-10-10, "keep 7 years but no notice";
      //    COMPLIANCE-DECISIONS "Privacy v2026-10-11"): "and the name and number on your identity
      //    record" is no longer erased at once. The identity record — name, date of birth and document
      //    number — is held with the images for 7 years from closure (`erasure.ts`, tier ②), compared
      //    with new identity checks meanwhile, and then erased except a coded form of the number; the
      //    sentence before the record of marketing choices is untouched, so "We also keep" still reads on.
      //
      // ⛔ IT DESCRIBES A PARTIAL FULFILMENT AND SAYS WHICH PART. That is the honest shape of
      // erasure for a licensed operator, and it is the posture `/admin/retention` already
      // publishes to the Gaming Board. Whatever this says must stay true of what the routine
      // does — `test:erasure` §10 holds the period, the two tiers are named in
      // `docs/DATA-RETENTION.md` §2, and `test:privacy-notice` §4j pins these words and the record.
      erasure: `Request erasure by writing to ${SUPPORT_EMAIL()}, or from Account settings. `
        + "On a closed account we erase your contact details (except as below), password, profile and "
        + "in-app messages, and we replace any name shown beside your past comments. Your financial "
        + "and audit records, your identity record (your name, date of birth and document number) and "
        + "any images of your identity documents or selfie are retained for at least 7 years from account closure "
        + "under POCA Cap 423 §16 and cannot be erased before then. We also keep your phone "
        + "number in our record of your marketing choices, so that we never send you marketing "
        + "again, and in the records of the marketing text messages we sent to it: those records "
        + "(the number, the message and what happened to it) are kept "
        + "for at least 7 years, as the record GN 478T reg 51(1) requires; erasure removes which "
        + "account they belonged to and keeps the rest. The records of the security codes we "
        + "texted to your number, and your payment records, which the law requires us to keep, "
        + "keep it too. While we hold your identity record, it is compared with new identity checks "
        + "so that it cannot be used to open another account; once the 7 years have run, we complete "
        + "your request and erase it and the images, except for a coded form of your document number "
        + "(not the number itself), which we keep so that the same document cannot open another "
        + "account. Each request is handled by a "
        + "compliance officer within the 30-day statutory period (PDPA 2022 §31 / GDPR Art. 17).",
      portability: "This bundle is the portability format (machine-readable JSON).",
    },
  };
}
