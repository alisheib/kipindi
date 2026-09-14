/**
 * WHY A WALLET IS FROZEN — the vocabulary, and the one rule that turns reasons into a status.
 *
 * ⭐ A wallet can be frozen for more than one reason at once (2026-09-13). Until then
 * self-exclusion was the only writer of `FROZEN`, and re-opening a served exclusion simply set the
 * wallet back to `ACTIVE`. From 2026-09-13 a FINAL identity refusal freezes it too, and so can an
 * officer — so "unfreeze" has to mean "remove MY hold", never "clear the flag", or re-opening a
 * self-exclusion would silently lift an officer's freeze on a sanctions refusal.
 *
 * ⛔ PURE AND IMPORT-FREE: the admin player page renders these labels from a server component, and
 * the service in `src/lib/server/wallet-freeze.ts` is the only writer of the column.
 */

export const WALLET_FREEZE_REASONS = ["SELF_EXCLUSION", "IDENTITY_REFUSED", "OFFICER"] as const;
export type WalletFreezeReason = (typeof WALLET_FREEZE_REASONS)[number];

/** Officer-facing names (the admin console is English). Never shown to a player. */
export const FREEZE_REASON_LABEL: Record<WalletFreezeReason, string> = {
  SELF_EXCLUSION: "Self-exclusion",
  IDENTITY_REFUSED: "Identity refused (final)",
  OFFICER: "Officer freeze",
};

export function isWalletFreezeReason(x: unknown): x is WalletFreezeReason {
  return typeof x === "string" && (WALLET_FREEZE_REASONS as readonly string[]).includes(x);
}

type WalletStatus = "ACTIVE" | "FROZEN" | "CLOSED";

/**
 * The reasons a wallet is CURRENTLY held for, read tolerantly.
 *
 * ⚠️ A wallet frozen before the column existed carries `FROZEN` with no reasons. Self-exclusion was
 * the only writer then, so that is what it means — the migration backfills it, and this keeps a row
 * written by a container still running the old code during the deploy reading the same way.
 */
export function currentFreezeReasons(w: { status: WalletStatus; freezeReasons?: readonly string[] | null }): WalletFreezeReason[] {
  // ⛔ AN ACTIVE WALLET HOLDS NOTHING (audit session 95, 2026-09-13). A container still running the pre-2026-09-13
  // code during the deploy could set a wallet ACTIVE without touching the new column (the old "reopen a served
  // self-exclusion" wrote `status: "ACTIVE"` only), leaving ACTIVE + ["SELF_EXCLUSION"]. Read as a standing hold,
  // that stale reason survived the next officer freeze and made the wallet impossible to unfreeze. The status is
  // the truth a money path refuses on; an ACTIVE wallet's leftover reasons are history, not holds.
  if (w.status === "ACTIVE") return [];
  const known = (w.freezeReasons ?? []).filter(isWalletFreezeReason);
  if (w.status === "FROZEN" && known.length === 0) return ["SELF_EXCLUSION"];
  return Array.from(new Set(known));
}

/**
 * The status a wallet must carry for a set of reasons. ⛔ `CLOSED` is terminal and is never
 * re-opened by a freeze or an unfreeze; otherwise it is `FROZEN` exactly when a reason remains.
 */
export function statusForFreezeReasons(current: WalletStatus, reasons: readonly WalletFreezeReason[]): WalletStatus {
  if (current === "CLOSED") return "CLOSED";
  return reasons.length > 0 ? "FROZEN" : "ACTIVE";
}
