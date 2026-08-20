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
import { audit } from "./audit";
import { db } from "./store";
import type { StoredUser } from "./store";
import { loadConfig, saveConfig } from "./config-store";
import { anonymizeClosedAccount, type AnonymizeOutcome } from "./erasure";

const DSAR_QUEUE_KEY = "privacy.dsar_queue";

export type DsarType = "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
/**
 * ⭐ `PARTIAL` EXISTS BECAUSE "FULFILLED" WOULD HAVE BEEN A FALSE STATEMENT.
 *
 * An erasure request against an account closed less than seven years ago cannot be finished:
 * the identity IMAGES are held under POCA Cap 423 §16 / FATF R.11, which is exactly the
 * posture `/admin/retention` already publishes to the Gaming Board — *"we PARTIALLY fulfil"*.
 * Stamping such a request FULFILLED would put the platform's own queue in the same position
 * as the retention schedule that F-01 found: describing work it has not done.
 *
 * ⛔ It also has to STAY IN THE QUEUE. Nothing on this platform re-runs erasure at year
 * seven — there is no seven-year timer and building one nobody can test for seven years
 * would be worse than saying so. The open request IS the reminder, and it carries the date.
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
  /** ERASURE only: the date the held identity documents may be destroyed (ISO `YYYY-MM-DD`),
   *  or null once they have been. Set when the status becomes `PARTIAL`. */
  erasureHeldUntil?: string | null;
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
    erasure = await anonymizeClosedAccount(r.userId);
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
  const held = erasure?.ok ? erasure.documentsHeldUntil : null;
  r.status = held ? "PARTIAL" : "FULFILLED";
  r.fulfilledAt = new Date().toISOString();
  r.fulfilledBy = opts.officerId;
  r.exportRef = opts.exportRef ?? null;
  r.erasureHeldUntil = held;
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
 * documents are held to a date and nothing but that request remembers it — so a second erasure
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

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    user: dsarUserView(user),
    wallet,
    transactions: txns,
    kyc,
    responsibleGambling: responsible,
    notificationsCount: notifications.length,
    rights: {
      access: "Granted (this document).",
      correction: "Submit a correction request via /profile/account or by contacting privacy@50pick.tz.",
      // ⚠️ THIS SENTENCE HAS BEEN WRONG IN BOTH DIRECTIONS, WHICH IS WHY IT CARRIES A HISTORY.
      //
      //  · Before 2026-08-20 it promised "available 7 years after account closure subject to
      //    AML retention requirements" — a capability the platform did not have at all.
      //  · Corrected that day to state only the CHANNEL, because there was no routine and the
      //    ERASURE branch of `fulfillDsarRequest` refused rather than acting.
      //  · Corrected again 2026-08-21, because there IS a routine now
      //    (`anonymizeClosedAccount`) and describing a capability we have as a mere postal
      //    address is the same defect pointing the other way: it under-states a right.
      //
      // ⛔ IT DESCRIBES A PARTIAL FULFILMENT AND SAYS WHICH PART. That is the honest shape of
      // erasure for a licensed operator, and it is the posture `/admin/retention` already
      // publishes to the Gaming Board. Whatever this says must stay true of what the routine
      // does — `test:erasure` §10 holds the period, and the two tiers are named in
      // `docs/DATA-RETENTION.md` §2.
      erasure: "Request erasure by writing to privacy@50pick.tz, or from Account settings. "
        + "On a closed account we erase your contact details, password, profile, in-app "
        + "messages and the name and number on your identity record, and we replace any "
        + "name shown beside your past comments. Your financial and audit records, and the "
        + "images of your identity documents, are retained for 7 years from account closure "
        + "under POCA Cap 423 §16 and cannot be erased before then; they are erased when "
        + "that period ends. Each request is handled by a compliance officer within the "
        + "30-day statutory period (PDPA 2022 §31 / GDPR Art. 17).",
      portability: "This bundle is the portability format (machine-readable JSON).",
    },
  };
}
