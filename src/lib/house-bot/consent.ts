/**
 * CONSENT AND THE HOLDER'S LIVE CAUSES — one predicate and one cause list for every reader (04 A3, C8,
 * PLAN §18 "Consent void").
 *
 * ⭐ ONE PREDICATE. Seam H2, Start, the strip and the `?reverify=1` state all ask `consentValid`, so a bet
 * can never run on a consent the console calls stale, or the other way round.
 *
 * ⛔ THE FINGERPRINT ALONE IS NOT CONSENT. A responsible-gambling pause, a final identity refusal, an
 * erasure request or the holder's own "stop" voids consent even when the password never changed — and an
 * unchanged password keeps the fingerprint matching. So the void is a second, independent half: it stands
 * until a re-verify whose `verifiedAt` is after it (C8). The designation suite plants the fingerprint-only
 * predicate and proves it lets the voided bot through.
 *
 * ⛔ PURE. The caller reads the account (user, wallet, RG settings, privacy queue, KYC, own loss limit) and
 * passes a snapshot; this module decides. It never imports the server.
 */
import { sortCauses, isPasswordChangeMethod, type ConsentVoidCause, type CredentialChangedVia, type HolderCause } from "./pause-reasons";
import { currentFreezeReasons } from "@/lib/wallet-freeze-reasons";

/** The consent half of a bot row. */
export type ConsentRow = {
  passwordFingerprint: string;
  verifiedAt: string;
  consentVoidAt: string | null;
};

/** A void stands while no verification is later than it. */
export function voidStands(bot: Pick<ConsentRow, "verifiedAt" | "consentVoidAt">): boolean {
  return bot.consentVoidAt != null && !(Date.parse(bot.verifiedAt) > Date.parse(bot.consentVoidAt));
}

/**
 * `consentValid = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)`.
 * `fingerprintNow` is `passwordFingerprint(<the holder's current hash>)`, read by the caller.
 */
export function consentValid(bot: ConsentRow, fingerprintNow: string): boolean {
  return fingerprintNow === bot.passwordFingerprint && !voidStands(bot);
}

/** Everything `holderCauses` reads, as the caller read it. */
export type HolderSnapshot = {
  bot: ConsentRow & { consentVoidCause: ConsentVoidCause | null };
  /** `passwordFingerprint(<current hash>)`; a null hash fingerprints the empty string. */
  fingerprintNow: string;
  user: {
    role: string;
    status: string;
    closedAt: string | null;
    passwordSetAt?: string | null;
    passwordSetVia?: string | null;
    /** A2 row 16 · when a sign-in lockout ends, for C13's bell. Never a cause: anyone can lock the holder out. */
    lockedUntil?: string | null;
  };
  /** Null when the account has no wallet. The eligibility row covers that; it is not a holder cause. */
  wallet: { status: "ACTIVE" | "FROZEN" | "CLOSED"; freezeReasons?: readonly string[] | null } | null;
  rg: { selfExclusionUntil: string | null; coolingOffUntil: string | null };
  erasureRequestOpen: boolean;
  /** The newest identity submission is a FINAL refusal (`kyc-refusal.ts`). */
  identityRefused: boolean;
  /** Only for a bot with a stake minimum: the holder's own rolling 24-hour limit refuses it. */
  ownerLossLimit: { blocked: boolean; freesAt: string | null };
  nowMs: number;
};

const future = (iso: string | null, nowMs: number): boolean => iso != null && Date.parse(iso) > nowMs;

/**
 * The holder's live causes, in `HOLDER_CAUSES` order (04 A3). Recomputed every time; `pauseReason` never
 * enters into it.
 *
 * - SELF_EXCLUDED / COOLING_OFF: the status, or a timer still running. A COOLED_OFF status whose timer has
 *   run out is not a live break (the bet path reads it the same way).
 * - CONSENT_VOID: a void stands and its own cause is no longer live. A withdrawal has no live signal of its
 *   own, so a standing HOLDER_WITHDREW void always reads as CONSENT_VOID — which is what keeps Re-verify
 *   on offer for it.
 * - PASSWORD_CHANGED: the fingerprint moved. The method is `passwordSetVia` when it names a change, else
 *   UNKNOWN (a legacy NULL, or a value that is not a change) — never a guess at SELF_CHANGE.
 */
export function holderCauses(s: HolderSnapshot): HolderCause[] {
  const { user, nowMs } = s;
  const causes: HolderCause[] = [];
  if (user.status === "CLOSED" || user.closedAt != null) causes.push({ code: "ACCOUNT_CLOSED" });
  if (s.erasureRequestOpen) causes.push({ code: "HOLDER_ERASURE_REQUEST" });
  if (user.status === "SELF_EXCLUDED" || future(s.rg.selfExclusionUntil, nowMs)) {
    causes.push({ code: "SELF_EXCLUDED", until: s.rg.selfExclusionUntil });
  }
  const coolingTimer = future(s.rg.coolingOffUntil, nowMs);
  if (coolingTimer || (user.status === "COOLED_OFF" && s.rg.coolingOffUntil == null)) {
    causes.push({ code: "COOLING_OFF", until: s.rg.coolingOffUntil });
  }
  if (s.identityRefused) causes.push({ code: "IDENTITY_REFUSED" });

  const live = new Set<string>(causes.map((c) => c.code));
  if (voidStands(s.bot) && s.bot.consentVoidCause != null && !live.has(s.bot.consentVoidCause)) {
    causes.push({ code: "CONSENT_VOID", cause: s.bot.consentVoidCause, at: s.bot.consentVoidAt! });
  }
  if (s.fingerprintNow !== s.bot.passwordFingerprint) {
    const via = user.passwordSetVia;
    const method: CredentialChangedVia = isPasswordChangeMethod(via) ? via : "UNKNOWN";
    causes.push({ code: "PASSWORD_CHANGED", method, changedAt: user.passwordSetAt ?? null });
  }
  if (user.status === "SUSPENDED") causes.push({ code: "ACCOUNT_SUSPENDED" });
  if (s.wallet && s.wallet.status !== "ACTIVE") {
    causes.push({ code: "WALLET_FROZEN", reasons: currentFreezeReasons(s.wallet) });
  }
  if (user.role !== "PLAYER") causes.push({ code: "ROLE_CHANGED", to: user.role });
  if (s.ownerLossLimit.blocked) causes.push({ code: "OWNER_LOSS_LIMIT", freesAt: s.ownerLossLimit.freesAt });
  return sortCauses(causes);
}

/** A responsible-gambling lock stands: re-verify waits for it, uncounted (C8). */
export function rgLockStands(s: Pick<HolderSnapshot, "user" | "rg" | "nowMs">): boolean {
  return s.user.status === "SELF_EXCLUDED"
    || future(s.rg.selfExclusionUntil, s.nowMs)
    || future(s.rg.coolingOffUntil, s.nowMs)
    || (s.user.status === "COOLED_OFF" && s.rg.coolingOffUntil == null);
}
