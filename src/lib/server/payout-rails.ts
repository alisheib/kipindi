/**
 * WHICH WALLETS THE LANDING HERO MAY NAME — "Deposit and withdraw with {rails}." (INHERIT-MANIFEST R8(6)).
 *
 * The owner's ruling: the hero names only the mobile-money methods whose PAYOUT path is live in the
 * platform's own config; a method that cannot pay out is not named in "deposit and withdraw with …".
 * So the list is not declared here. It is READ from the definitions the money path itself enforces:
 *
 *   1. `MOBILE_MONEY_METHODS` (`payment-providers.ts`) — the rails a player can pick, in chooser order,
 *      with their brand spellings;
 *   2. `WithdrawSchema.provider` (`validators.ts`) — what `wallet-service.withdraw()` accepts at all;
 *   3. `DepositSchema.provider` — what `wallet-service.deposit()` accepts ("deposit AND withdraw");
 *   4. `mnoToSelcomCashin()` (`selcom.ts`) — the rail has a wallet-cashin code, so the payout ladder's
 *      first rung (`WALLET_CASHIN`, `payments.ts` `runPayoutLadder`) does not skip it;
 *   5. at render time, the per-rail kill switches (`payment-ops.ts`, persisted `payments.killswitch`):
 *      a rail an officer has paused for deposits OR withdrawals is not named while it is paused —
 *      `wallet-service` refuses it in exactly that state.
 *
 * ⚠️ A FAILED KILL-SWITCH READ NAMES THE STATIC LIST. That is the direction the money path itself
 * fails in (`ensureKill` leaves the map empty and `isPaymentPaused` answers false), so the hero and
 * the withdraw form cannot disagree about a rail; which way an unreadable switch should fail is an
 * owner call recorded in `docs/MONEY-GATE-REMEDIATION.md` §4, not this module's.
 * ⛔ The global payout status (`payout-status.ts`) is deliberately NOT read here: it is a scan of
 * stuck payouts, too heavy for the busiest public page, and the withdraw page already states it.
 *
 * `npm run test:hero-copy` §3 pins the result in all three languages and cross-checks it against the
 * withdraw page's own tiles and the withdraw action's allow-list.
 */
import { MOBILE_MONEY_METHODS, type PaymentMethodSpec } from "@/lib/payment-providers";
import { DepositSchema, WithdrawSchema } from "./validators";
import { mnoToSelcomCashin } from "./selcom";
import type { PaymentProvider } from "./payments";

/** The mobile-money rails the money path can both take money in on and pay out on, in chooser order. */
export function payoutCapableRails(): PaymentMethodSpec[] {
  const payout = new Set<string>(WithdrawSchema.shape.provider.options);
  const deposit = new Set<string>(DepositSchema.shape.provider.options);
  return MOBILE_MONEY_METHODS.filter(
    (m) => payout.has(m.id) && deposit.has(m.id) && mnoToSelcomCashin(m.id as PaymentProvider) !== null,
  );
}

/** The kill-switch map as `getKillSwitches()` returns it; `null` when it could not be read. */
export type RailPauses = Readonly<Record<string, { deposits: boolean; withdrawals: boolean } | undefined>>;

/** The rails the landing names or shows: payout-capable, and paused for neither direction right now. The hero's
 *  wallet row and the trust band's marks both read THIS, so a paused rail leaves both at once (review, 2026-09-27:
 *  the band still drew the logo of a rail the hero had dropped). */
export function heroRails(pauses: RailPauses | null): PaymentMethodSpec[] {
  return payoutCapableRails().filter((m) => !pauses?.[m.id]?.deposits && !pauses?.[m.id]?.withdrawals);
}

/** The names the hero prints — `heroRails`, by name. */
export function heroRailNames(pauses: RailPauses | null): string[] {
  return heroRails(pauses).map((m) => m.name);
}
