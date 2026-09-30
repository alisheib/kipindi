/**
 * Which words the payout notice shows — pure, so the pairing of title and body can be tested (F1, §9).
 *
 * 🔴 The deposit variant used to show the UNAVAILABLE deposit warning ("…you will not be able to take money out
 * again until payouts are restored") under the DELAYED title ("Withdrawals are slower than usual"). On a delayed
 * status that sentence is false: withdrawals still work, they are only slow. Found 2026-10-01 while collecting copy
 * for the Vodacom plan's deposit screen. The deposit warning belongs to `unavailable` only; a delayed status tells
 * the same truth on both pages.
 */
export type PayoutNoticeStatus = "operational" | "delayed" | "unavailable";

export type PayoutNoticeLabels = {
  delayedTitle: string;
  delayedBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  depositWarning: string;
};

/** The title and body for one status on one page, or null when there is nothing to say. An officer's note replaces
 *  the default body verbatim; it never changes the title, which always names the real status. */
export function payoutNoticeCopy(
  status: PayoutNoticeStatus,
  variant: "withdraw" | "deposit",
  labels: PayoutNoticeLabels,
  note?: string | null,
): { title: string; body: string } | null {
  if (status === "operational") return null;
  if (status === "unavailable") {
    return { title: labels.unavailableTitle, body: note ?? (variant === "deposit" ? labels.depositWarning : labels.unavailableBody) };
  }
  return { title: labels.delayedTitle, body: note ?? labels.delayedBody };
}
