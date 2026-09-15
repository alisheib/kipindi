/**
 * WHY A HOUSE BOT IS NOT RUNNING — the reasons, the live causes, and the one way out of each.
 *
 * ⭐ TWO DIFFERENT THINGS, KEPT APART ON PURPOSE (04 A3).
 * - `pauseReason` is HISTORY: the reason the bot stopped, written once, shown in History. It never
 *   gates anything.
 * - The CAUSES are LIVE: `holderCauses()` (`consent.ts`) recomputes them from the holder's account every
 *   time, and Start, Re-verify and the strip read only them. A bot paused for a password change
 *   whose holder then self-excludes has one reason and two causes, and gating on the reason alone
 *   would offer a Start that consent no longer allows.
 *
 * ⛔ THE CLOSED LISTS MIRROR MIGRATION CHECKS: `PAUSE_REASONS` is `HouseBot_pauseReason_check`,
 * `REMOVE_CAUSES` is `HouseBot_removedCause_check`, `CONSENT_VOID_CAUSES` is
 * `HouseBot_consentVoidCause_check` and `CREDENTIAL_CHANGED_VIA` is `HouseBot_credentialChangedVia_check`
 * — same values, same order (`test:house-bot-migrations`). Why a bot was REMOVED lives in its own
 * `removedCause` column, not in `pauseReason`.
 *
 * ⛔ PURE. The console renders these from server components and the strip from the browser.
 * The copy is admin-facing English and never names the holder.
 */
import { closedListGuard, type HouseBotStatus } from "./constants";
import type { WalletFreezeReason } from "@/lib/wallet-freeze-reasons";

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** `HouseBot.pauseReason` (PLAN §2 + 04 A3 + F4). ACCOUNT_BLOCKED means the status could not be read. */
export const PAUSE_REASONS = [
  "NEW",
  "MANUAL",
  "PASSWORD_CHANGED",
  "ROLE_CHANGED",
  "SELF_EXCLUDED",
  "COOLING_OFF",
  "ACCOUNT_BLOCKED",
  "ACCOUNT_MISSING",
  "WALLET_FROZEN",
  "WALLET_MISSING",
  "OWNER_LOSS_LIMIT",
  "DAILY_LOSS_STOP",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_CLOSED",
  "IDENTITY_REFUSED",
  "HOLDER_ERASURE_REQUEST",
  "HOLDER_WITHDREW",
  "UNMAPPED_REFUSAL",
  "RULES_INVALID",
  "RULES_OUTDATED",
] as const;
export type PauseReason = (typeof PAUSE_REASONS)[number];
export const isPauseReason = closedListGuard(PAUSE_REASONS);

/** `HouseBot.removedCause` (04 A5, F2). `removedReason` stays the officer's free text. */
export const REMOVE_CAUSES = ["MANUAL", "ACCOUNT_CLOSED", "SUNSET"] as const;
export type RemoveCause = (typeof REMOVE_CAUSES)[number];
export const isRemoveCause = closedListGuard(REMOVE_CAUSES);

/** How a removed bot's History line reads. */
export const REMOVE_CAUSE_COPY: Record<RemoveCause, string> = {
  MANUAL: "Removed by an owner.",
  ACCOUNT_CLOSED: "Account closed — the bot was removed. Recover the float out of band.",
  SUNSET: "House bots were withdrawn.",
};

/**
 * The events that void the holder's consent (04 A3 + C8, PLAN §18). A void stands until a re-verify
 * whose `verifiedAt` is after it — even when the password never changed, which is the whole point:
 * the fingerprint alone would still match.
 */
export const CONSENT_VOID_CAUSES = [
  "SELF_EXCLUDED",
  "COOLING_OFF",
  "IDENTITY_REFUSED",
  "HOLDER_ERASURE_REQUEST",
  "HOLDER_WITHDREW",
] as const;
export type ConsentVoidCause = (typeof CONSENT_VOID_CAUSES)[number];
export const isConsentVoidCause = closedListGuard(CONSENT_VOID_CAUSES);

/** The responsible-gambling causes: they block even re-verify while the lock stands (04 C8). */
export const RG_CAUSES = ["SELF_EXCLUDED", "COOLING_OFF"] as const satisfies readonly ConsentVoidCause[];

/** The password writers that change a holder's credential (04 A2 rows 1–3). */
export const PASSWORD_CHANGE_METHODS = ["SELF_CHANGE", "RESET_LINK", "OFFICER_TEMP"] as const;
export type PasswordChangeMethod = (typeof PASSWORD_CHANGE_METHODS)[number];
export const isPasswordChangeMethod = closedListGuard(PASSWORD_CHANGE_METHODS);

/**
 * `HouseBot.credentialChangedVia` (02 §2.2). UNKNOWN is a legacy holder whose `passwordSetVia` is
 * NULL — the column is newer than the account, and guessing SELF_CHANGE would wave through an
 * officer's temporary password.
 */
export const CREDENTIAL_CHANGED_VIA = [...PASSWORD_CHANGE_METHODS, "UNKNOWN"] as const;
export type CredentialChangedVia = (typeof CREDENTIAL_CHANGED_VIA)[number];
export const isCredentialChangedVia = closedListGuard(CREDENTIAL_CHANGED_VIA);

/**
 * The live holder causes, in display order (04 A3 asks for an order and gives none; decided here):
 * terminal and statutory → responsible gambling → consent-voiding decisions → re-verifiable →
 * lifted by an officer → clears by itself. The strip shows the first three, then "and N more".
 *
 * CONSENT_VOID is listed only while a void stands and its original cause is no longer live —
 * while the cause is live, the cause itself says more.
 */
export const HOLDER_CAUSES = [
  "ACCOUNT_CLOSED",
  "HOLDER_ERASURE_REQUEST",
  "SELF_EXCLUDED",
  "COOLING_OFF",
  "IDENTITY_REFUSED",
  "HOLDER_WITHDREW",
  "CONSENT_VOID",
  "PASSWORD_CHANGED",
  "ACCOUNT_SUSPENDED",
  "WALLET_FROZEN",
  "ROLE_CHANGED",
  "OWNER_LOSS_LIMIT",
] as const;
export type HolderCauseCode = (typeof HOLDER_CAUSES)[number];
export const isHolderCauseCode = closedListGuard(HOLDER_CAUSES);

/** The only causes a re-verify can clear (04 A3). Everything else waits, or needs an officer. */
export const REVERIFY_ELIGIBLE_CAUSES = ["PASSWORD_CHANGED", "CONSENT_VOID"] as const satisfies readonly HolderCauseCode[];

/**
 * Causes a re-verify neither clears nor waits for: consent survives them (04 C8 "Other causes (suspended,
 * frozen, role) still don't block re-verify", 02 §2.6 step 4, PLAN §18 §14-step-4 row). Start still
 * refuses while any of them is live. ⚠️ A3's own sentence reads stricter ("limited to PASSWORD_CHANGED and
 * CONSENT_VOID"); the binding reconciliation sides with C8, and so does this list (C3-SPEC §6 ruling 21).
 */
export const REVERIFY_TOLERATED_CAUSES = ["ACCOUNT_SUSPENDED", "WALLET_FROZEN", "ROLE_CHANGED", "OWNER_LOSS_LIMIT"] as const satisfies readonly HolderCauseCode[];

// ---------------------------------------------------------------------------
// Cause details — also what `pauseDetail` stores (04 A2, A4, A7)
// ---------------------------------------------------------------------------

/**
 * One live cause and its detail.
 *
 * ⚠️ The password change key is `method`, in the cause and in `PauseDetail` alike (02 §2.2) — one key
 * name everywhere, so a reader of either never checks the other spelling.
 */
export type HolderCause =
  | { code: "PASSWORD_CHANGED"; method: CredentialChangedVia; changedAt: string | null }
  | { code: "SELF_EXCLUDED" | "COOLING_OFF"; until: string | null }
  | { code: "WALLET_FROZEN"; reasons: readonly WalletFreezeReason[] }
  | { code: "ROLE_CHANGED"; to: string }
  | { code: "OWNER_LOSS_LIMIT"; freesAt: string | null }
  | { code: "CONSENT_VOID"; cause: ConsentVoidCause; at: string }
  | { code: "ACCOUNT_CLOSED" | "ACCOUNT_SUSPENDED" | "IDENTITY_REFUSED" | "HOLDER_ERASURE_REQUEST" | "HOLDER_WITHDREW" };

/**
 * The detail keys each cause carries. `satisfies Record<HolderCauseCode, …>` is what keeps the union
 * above and `HOLDER_CAUSES` from drifting: a code added to the list without a row fails tsc.
 */
const HOLDER_CAUSE_DETAIL_KEYS = {
  ACCOUNT_CLOSED: [],
  HOLDER_ERASURE_REQUEST: [],
  SELF_EXCLUDED: ["until"],
  COOLING_OFF: ["until"],
  IDENTITY_REFUSED: [],
  HOLDER_WITHDREW: [],
  CONSENT_VOID: ["cause", "at"],
  PASSWORD_CHANGED: ["method", "changedAt"],
  ACCOUNT_SUSPENDED: [],
  WALLET_FROZEN: ["reasons"],
  ROLE_CHANGED: ["to"],
  OWNER_LOSS_LIMIT: ["freesAt"],
} as const satisfies Record<HolderCause["code"], readonly string[]> & Record<HolderCauseCode, readonly string[]>;

/** Does this stored value look like a cause? Tolerant read of `pauseDetail.causes` (JSON from the database). */
export function isHolderCause(v: unknown): v is HolderCause {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const row = v as Record<string, unknown>;
  if (!isHolderCauseCode(row.code)) return false;
  return (HOLDER_CAUSE_DETAIL_KEYS[row.code] as readonly string[]).every((k) => k in row);
}

/** `HouseBot.pauseDetail`. `field` names the rules field for RULES_INVALID and RULES_OUTDATED. */
export type PauseDetail = {
  causes?: HolderCause[];
  field?: string;
  method?: CredentialChangedVia;
  changedAt?: string | null;
  detectedBy?: "HOOK" | "SWEEP" | "MAPPER";
  officerReset?: boolean;
};

// ---------------------------------------------------------------------------
// The way out of each reason
// ---------------------------------------------------------------------------

/** The steps a way out is made of, in the order they are offered. */
export const WAY_OUT_STEPS = [
  "HOLDER_ACTION",
  "OFFICER_ACTION",
  "RESOLVE_REQUEST",
  "WAIT",
  "SAVE_RULES",
  "RAISE_CAP",
  "REVERIFY",
  "START",
  "REMOVE",
  "NONE",
] as const;
export type WayOutStep = (typeof WAY_OUT_STEPS)[number];

export type WayOut = {
  origin: "BOT" | "HOLDER" | "ENGINE" | "REMOVED";
  /** Does this reason void the holder's consent (a fresh password before Start)? */
  voidsConsent: boolean;
  steps: readonly WayOutStep[];
  /** Admin copy. `{label}` is the bot's label, filled by `wayOutCopy`. */
  copy: string;
};

const RG_WAY_OUT_COPY =
  "Start disabled while the lock stands. After it ends: Re-verify (fresh password, even if unchanged) → Start. Never resumes by itself.";

/**
 * Every reason's way out. ⛔ No reason may be a dead end: the rules suite clears every pair of causes
 * in both orders and requires a step other than Remove at each point (04 A3).
 */
export const PAUSE_REASON_WAY_OUT: Record<PauseReason, WayOut> = {
  NEW: { origin: "BOT", voidsConsent: false, steps: ["START"], copy: "Set its rules and caps, then Start." },
  MANUAL: { origin: "BOT", voidsConsent: false, steps: ["START"], copy: "Start when ready." },
  PASSWORD_CHANGED: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["REVERIFY", "START"],
    copy: "Enter their new password, then Start.",
  },
  ROLE_CHANGED: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["OFFICER_ACTION", "START"],
    copy: "Change their role back to PLAYER, then Start.",
  },
  SELF_EXCLUDED: {
    origin: "HOLDER",
    voidsConsent: true,
    steps: ["WAIT", "OFFICER_ACTION", "REVERIFY", "START"],
    copy: RG_WAY_OUT_COPY,
  },
  COOLING_OFF: { origin: "HOLDER", voidsConsent: true, steps: ["WAIT", "REVERIFY", "START"], copy: RG_WAY_OUT_COPY },
  ACCOUNT_BLOCKED: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["WAIT", "START"],
    copy: "Their account status could not be read. Start is enabled once it reads again.",
  },
  ACCOUNT_MISSING: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["WAIT", "START", "REMOVE"],
    copy: "Their account could not be found. Start once it reads again, or remove the bot.",
  },
  WALLET_FROZEN: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["OFFICER_ACTION", "START"],
    copy: "Start once the last hold on their wallet is lifted.",
  },
  WALLET_MISSING: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["OFFICER_ACTION", "START"],
    copy: "Restore their wallet — settlement is blocked for every player until then. Removing the bot does not bypass it.",
  },
  OWNER_LOSS_LIMIT: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["WAIT", "START"],
    copy: "Start once their own rolling 24-hour loss limit allows the minimum stake.",
  },
  DAILY_LOSS_STOP: {
    origin: "BOT",
    voidsConsent: false,
    steps: ["WAIT", "RAISE_CAP", "START"],
    copy: "Start after 00:00 EAT, or raise the daily loss cap above today's settled loss.",
  },
  ACCOUNT_SUSPENDED: {
    origin: "HOLDER",
    voidsConsent: false,
    steps: ["OFFICER_ACTION", "START"],
    copy: "Start once their account is restored.",
  },
  ACCOUNT_CLOSED: {
    origin: "REMOVED",
    voidsConsent: true,
    steps: ["NONE"],
    copy: "Account closed — the bot was removed. Recover the float out of band.",
  },
  IDENTITY_REFUSED: {
    origin: "HOLDER",
    voidsConsent: true,
    steps: ["OFFICER_ACTION", "REVERIFY", "START"],
    copy: "An officer must reopen the refusal; then Re-verify and Start. Removing the bot is recommended.",
  },
  HOLDER_ERASURE_REQUEST: {
    origin: "HOLDER",
    voidsConsent: true,
    steps: ["RESOLVE_REQUEST", "REVERIFY", "START", "REMOVE"],
    copy: "Resolve their erasure request or remove the bot. If they withdraw it: Re-verify, then Start.",
  },
  HOLDER_WITHDREW: {
    origin: "HOLDER",
    voidsConsent: true,
    steps: ["REVERIFY", "START"],
    copy: "The holder stopped liquidity stakes themselves. Only a fresh password they give you can restart it.",
  },
  UNMAPPED_REFUSAL: {
    origin: "ENGINE",
    voidsConsent: false,
    steps: ["START"],
    copy: "A bet refusal this build doesn't recognise paused the bot. Read the activity feed before starting again.",
  },
  RULES_INVALID: { origin: "BOT", voidsConsent: false, steps: ["SAVE_RULES", "START"], copy: "Rules → Save → Start." },
  RULES_OUTDATED: {
    origin: "BOT",
    voidsConsent: false,
    steps: ["SAVE_RULES", "START"],
    copy: "{label} is paused: its rules were saved in an older format. Open Rules, review the converted values, Save, then Start.",
  },
};

/**
 * A password changed through support's temporary password. Re-verify is refused until the holder
 * sets their own password (04 A2 row 3, C9) — an officer-set password is not the holder's consent.
 */
export const OFFICER_TEMP_WAY_OUT: WayOut = {
  origin: "HOLDER",
  voidsConsent: false,
  steps: ["HOLDER_ACTION", "REVERIFY", "START"],
  copy: "They must change the temporary password themselves in Account settings; then enter it and Start.",
};

/** A void that outlived its cause: the break ended, the request was withdrawn — a fresh password first. */
export const CONSENT_VOID_WAY_OUT: WayOut = {
  origin: "HOLDER",
  voidsConsent: true,
  steps: ["REVERIFY", "START"],
  copy: "Their permission ended with the earlier pause. Re-verify with their current password, then Start.",
};

/** A reason's copy with the bot's label filled in. */
export function wayOutCopy(wayOut: WayOut, label: string): string {
  return wayOut.copy.replaceAll("{label}", label);
}

/** The way out of one live cause. */
export function wayOutForCause(cause: HolderCause): WayOut {
  if (cause.code === "CONSENT_VOID") return CONSENT_VOID_WAY_OUT;
  if (cause.code === "PASSWORD_CHANGED" && cause.method === "OFFICER_TEMP") return OFFICER_TEMP_WAY_OUT;
  return PAUSE_REASON_WAY_OUT[cause.code];
}

// ---------------------------------------------------------------------------
// Gating — pure; the service adds its own reads (F3 checks, fingerprint, loss)
// ---------------------------------------------------------------------------

/** Causes in `HOLDER_CAUSES` order. Returns a new array. */
export function sortCauses<T extends { code: HolderCauseCode }>(causes: readonly T[]): T[] {
  return [...causes].sort((a, b) => HOLDER_CAUSES.indexOf(a.code) - HOLDER_CAUSES.indexOf(b.code));
}

/** Start needs no live cause at all (04 A3). The service still runs 02 §3.3's other refusals. */
export function canStart(status: HouseBotStatus, causes: readonly HolderCause[]): boolean {
  return status !== "REMOVED" && causes.length === 0;
}

/**
 * Re-verify is allowed only on a stopped bot, outside a responsible-gambling lock, when every live
 * cause is one a fresh password clears or one consent survives — and never over support's temporary
 * password. A closed account, an open erasure request and a final identity refusal refuse it.
 */
export function canReverify(status: HouseBotStatus, causes: readonly HolderCause[], rgLocked: boolean): boolean {
  if (status === "ACTIVE" || status === "REMOVED" || rgLocked) return false;
  return causes.every(
    (c) =>
      ((REVERIFY_ELIGIBLE_CAUSES as readonly string[]).includes(c.code) || (REVERIFY_TOLERATED_CAUSES as readonly string[]).includes(c.code)) &&
      !(c.code === "PASSWORD_CHANGED" && c.method === "OFFICER_TEMP"),
  );
}

/**
 * The steps the console offers for this bot now: the union of each live cause's steps, plus START
 * when Start is allowed, in `WAY_OUT_STEPS` order. While a responsible-gambling lock stands,
 * REVERIFY is withheld and WAIT is offered instead.
 */
export function nextActions(status: HouseBotStatus, causes: readonly HolderCause[], rgLocked: boolean): WayOutStep[] {
  if (status === "REMOVED") return ["NONE"];
  if (status === "ACTIVE" && causes.length === 0) return ["NONE"];
  const steps = new Set<WayOutStep>();
  for (const cause of causes) for (const step of wayOutForCause(cause).steps) steps.add(step);
  if (canStart(status, causes)) steps.add("START");
  if (rgLocked) {
    steps.delete("REVERIFY");
    steps.add("WAIT");
  }
  if (steps.size === 0) steps.add("NONE");
  return WAY_OUT_STEPS.filter((s) => steps.has(s));
}
