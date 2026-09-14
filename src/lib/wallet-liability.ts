/**
 * "WALLET LIABILITY" — THE FIGURE, AND WHAT ITS BASIS LEAVES OUT (2026-09-14, register E-400 ⑦e).
 *
 * ⭐ WHY THIS EXISTS. /admin/finance's "Wallet liability" tile has always summed ACTIVE wallets only
 * (`walletLiabilityTotal`, src/lib/server/analytics.ts), and that basis is deliberate: it is the activity
 * figure, and "Held for unverified" beside it is a subset of it on the same basis (`test:kyc-stage` §9).
 * But the tile said only "real-time". From 2026-09-13 a FINAL identity refusal freezes the wallet, and an
 * officer's hold or a self-exclusion freezes it too, so a frozen, still-undecided balance — money we owe —
 * dropped out of the headline with nothing on the tile to say so. The only trace was "+TZS … frozen" on the
 * NEIGHBOURING tile, and only for accounts never approved.
 *
 * ⛔ THE BASIS DOES NOT CHANGE. Folding frozen money into the headline would break the reconciliation with
 * "Held for unverified" and silently move a pinned KPI. The tile instead SAYS its basis and names what the
 * basis leaves out, from the SAME snapshot, so the caption cannot disagree with the number above it.
 * The solvency line that counts every wallet is `readPlayerLiability` on /admin/house.
 *
 * ⛔ PURE: one import for the per-wallet sum (`walletHeldTzs`, the one definition of "holds money") and one
 * formatter. No store, no "use client".
 */
import { walletHeldTzs, type HeldTally } from "./kyc-stage";
import { formatTzsCompact } from "./utils";

export type WalletLiability = {
  /** Σ `walletHeldTzs` over ACTIVE wallets — the headline, exactly the arithmetic `walletLiabilityTotal` always did. */
  activeTzs: number;
  /** FROZEN wallets holding money: outside the basis, still owed. */
  frozen: HeldTally;
  /** CLOSED wallets holding money: outside the basis, still owed. */
  closed: HeldTally;
};

/**
 * One pass over one wallet snapshot. ⚠️ An ACTIVE wallet's sum is taken as it is (the headline's arithmetic is
 * unchanged); a frozen or closed wallet is counted only when it HOLDS something (`> 0`), because a caption
 * saying "+TZS 0 frozen" about an emptied account names no money left out.
 */
export function tallyWalletLiability(
  wallets: ReadonlyArray<{ status: "ACTIVE" | "FROZEN" | "CLOSED"; balance: number; hold?: number | null }>,
): WalletLiability {
  const out: WalletLiability = { activeTzs: 0, frozen: { accounts: 0, tzs: 0 }, closed: { accounts: 0, tzs: 0 } };
  for (const w of wallets) {
    const held = walletHeldTzs(w);
    if (w.status === "ACTIVE") {
      out.activeTzs += held;
      continue;
    }
    if (held <= 0) continue;
    const bucket = w.status === "FROZEN" ? out.frozen : out.closed;
    bucket.accounts += 1;
    bucket.tzs += held;
  }
  return out;
}

/**
 * The tile's caption: its basis, and what the basis leaves out. ⛔ Never "real-time" — that described when the
 * figure was read, not what it counts. "Nothing frozen or closed" is said only when no frozen or closed wallet
 * holds money, so the absence of an amount is a stated fact rather than a missing caption.
 */
export function walletLiabilityCaption(t: WalletLiability): string {
  const leftOut = [
    t.frozen.accounts > 0 ? `+${formatTzsCompact(t.frozen.tzs)} frozen` : null,
    t.closed.accounts > 0 ? `+${formatTzsCompact(t.closed.tzs)} closed` : null,
  ].filter((s): s is string => s !== null);
  return leftOut.length === 0
    ? "active wallets · nothing frozen or closed"
    : ["active wallets only", ...leftOut].join(" · ");
}
