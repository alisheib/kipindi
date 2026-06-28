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
import { loadConfig, saveConfig } from "./config-store";

const DSAR_QUEUE_KEY = "privacy.dsar_queue";

export type DsarType = "ACCESS" | "ERASURE" | "CORRECTION" | "PORTABILITY";
export type DsarStatus = "PENDING" | "FULFILLED" | "REJECTED";

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

/** Officer marks a DSAR fulfilled. Returns a discriminated result so the caller
 *  can surface why an erasure can't be closed manually. */
export function fulfillDsarRequest(opts: { id: string; officerId: string; exportRef?: string | null }):
  { ok: true; request: DsarRequest } | { ok: false; error: string } {
  const r = queue.find((x) => x.id === opts.id);
  if (!r) return { ok: false, error: "DSAR not found." };
  // ERASURE must NOT be closed by a status flip — that records a FALSE "fulfilled"
  // while the data stays fully intact. The real anonymization routine (respecting
  // the 7-year AML retention window) isn't wired yet, so block it and audit.
  if (r.type === "ERASURE") {
    audit({ category: "COMPLIANCE", action: "privacy.dsar.erasure_blocked", actorId: opts.officerId, targetType: "DsarRequest", targetId: r.id, payload: { userId: r.userId } });
    return { ok: false, error: "Erasure can't be completed manually yet — the anonymization/retention routine isn't wired. Escalate to engineering; do not mark fulfilled." };
  }
  r.status = "FULFILLED";
  r.fulfilledAt = new Date().toISOString();
  r.fulfilledBy = opts.officerId;
  r.exportRef = opts.exportRef ?? null;
  persistQueue();
  audit({
    category: "ADMIN",
    action: "privacy.dsar.fulfilled",
    actorId: opts.officerId,
    targetType: "DsarRequest",
    targetId: r.id,
    payload: { type: r.type, userId: r.userId, exportRef: r.exportRef },
  });
  return { ok: true, request: r };
}

export function listDsarRequests(filter?: { status?: DsarStatus }): DsarRequest[] {
  return queue
    .filter((r) => !filter?.status || r.status === filter.status)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
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
  const bets = await db.bet.findByUser(userId, 10_000);
  const kyc = await db.kyc.findByUserId(userId);
  const responsible = await db.responsible.get(userId);
  const notifications = await db.notification.findByUser(userId, 1000);

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    user: {
      id: user.id,
      phoneE164: user.phoneE164,
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
    },
    wallet,
    transactions: txns,
    matchBets: bets,
    kyc,
    responsibleGambling: responsible,
    notificationsCount: notifications.length,
    rights: {
      access: "Granted (this document).",
      correction: "Submit a correction request via /profile/account or by contacting privacy@50pick.tz.",
      erasure: "Available 7 years after account closure subject to AML retention requirements (POCA Cap 423 §16).",
      portability: "This bundle is the portability format (machine-readable JSON).",
    },
  };
}
