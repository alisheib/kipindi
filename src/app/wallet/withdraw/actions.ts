"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { withdraw } from "@/lib/server/wallet-service";
import { lookupPayeeName, type PaymentProvider } from "@/lib/server/payments";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { db } from "@/lib/server/store";
import type { WithdrawInput } from "@/lib/server/validators";
import { WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { getPayoutStatus, payoutsAcceptingRequests } from "@/lib/server/payout-status";
import { getServerT } from "@/lib/i18n-server";
import { errorCopy } from "@/lib/error-copy";

const WITHDRAW_PROVIDERS = new Set(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX"]);

/**
 * Best-effort payee-name lookup for the withdraw confirm screen — resolves the
 * registered account holder for a payee number so the player can verify WHO they are
 * paying before "Send funds". Auth + KYC-gated and rate-limited (a name-lookup could
 * otherwise be abused to enumerate names). Returns { name: null } on any miss; the
 * modal then shows the number alone and the payout is NEVER blocked on this.
 */
export async function lookupWithdrawPayeeAction(input: { provider: string; msisdn: string }): Promise<{ name: string | null }> {
  const session = await currentSession();
  if (!session) return { name: null };
  if (!WITHDRAW_PROVIDERS.has(input.provider)) return { name: null };
  const digits = String(input.msisdn ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 12) return { name: null };
  const kyc = await db.kyc.findByUserId(session.userId).catch(() => null);
  if (kyc?.status !== "APPROVED") return { name: null }; // only players who can withdraw
  const rl = await rateCheckAsync(session.userId, "wallet.payee_lookup");
  if (!rl.allowed) return { name: null };
  try {
    return { name: await lookupPayeeName(input.provider as PaymentProvider, digits) };
  } catch {
    return { name: null };
  }
}

export async function withdrawAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const { t } = await getServerT();

  // 🔴 THE ACTUAL GATE. The withdraw page disables its form when payouts cannot be paid, but a
  // disabled form is a hint, not a control — this action is reachable by a direct POST. Accepting
  // a request we cannot fulfil is worse than refusing it: it takes the money out of the player's
  // available balance and looks like progress. Refuse here, in the player's own language.
  const payouts = await getPayoutStatus();
  // ✅ SEALED 2026-08-10. The temporary `PAYOUT_TEST_BYPASS_MSISDN` escape hatch that let one
  // named tester past a shut gate is GONE — variable cleared on Railway, function and both
  // call sites deleted. It existed because the gate was self-locking: two payouts frozen
  // since 2026-07-29 made `derivePayoutStatus` report `unavailable`, so nobody could request
  // the one controlled withdrawal that would prove whether the rail paid at all. That
  // deadlock is over — the last stuck payout was returned to its owner today and the queue
  // reads 0 — so the gate is the only gate again, for everyone, with no exceptions.
  if (!payoutsAcceptingRequests(payouts.status)) {
    // B-7 — `payouts.note` is operator diagnostics ("N stuck payouts…"), not
    // player copy; the localized body says everything the player can act on.
    redirect(("/wallet/withdraw?error=" + encodeURIComponent(t.wallet.payoutsUnavailableBody)) as never);
  }

  const amount = parseInt(String(formData.get("amount") ?? "0"), 10);
  // Pass the chosen destination through (don't coerce to MPESA). Step-up SMS
  // verification is gated on the licensed SMS provider; the withdrawal is
  // protected by KYC + AML in the meantime, so no unenforced OTP is collected.
  const provider = String(formData.get("provider") ?? "") as WithdrawInput["provider"];
  const msisdn = formData.get("msisdn") ? String(formData.get("msisdn")) : undefined;

  // Carry form values through the error redirect so the player doesn't
  // have to re-enter provider + amount + phone on validation failure.
  const carryParams = `&provider=${encodeURIComponent(provider)}&amount=${amount}${msisdn ? `&msisdn=${encodeURIComponent(msisdn)}` : ""}`;

  // These two were hardcoded English on the money path — a Swahili- or Chinese-speaking player
  // saw an English validation error. `amountHint` already states the same bounds in all three
  // locales, so it is the honest thing to echo rather than a fourth phrasing of the same rule.
  if (!Number.isFinite(amount) || amount < WITHDRAW_MIN_TZS || amount > WITHDRAW_MAX_TZS) {
    redirect(("/wallet/withdraw?error=" + encodeURIComponent(t.wallet.amountHint) + carryParams) as never);
  }
  // The payee mobile number is where the money is sent — required for every
  // (mobile-money) payout. A clean message here; the exact format is validated
  // by the WithdrawSchema (tzPhone) inside withdraw().
  if (!msisdn) redirect(("/wallet/withdraw?error=" + encodeURIComponent(t.wallet.destinationPhone) + carryParams) as never);
  const idempotencyKey = formData.get("idempotencyKey") ? String(formData.get("idempotencyKey")) : undefined;
  const result = await withdraw(session.userId, {
    provider,
    amount,
    msisdn,
  }, idempotencyKey);
  revalidatePath("/wallet");
  // B-7 — mint the refusal in the player's language; the English service string
  // stays in the audit record, not on the screen.
  if (!result.ok) redirect(("/wallet/withdraw?error=" + encodeURIComponent(errorCopy(t, result)) + carryParams) as never);
  redirect(`/wallet?withdrawal=${result.data!.txnId}&status=${result.data!.status}&amount=${amount}` as never);
}
