"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { withdraw } from "@/lib/server/wallet-service";
import { lookupPayeeName, type PaymentProvider } from "@/lib/server/payments";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { db } from "@/lib/server/store";
import type { WithdrawInput } from "@/lib/server/validators";

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

  const amount = parseInt(String(formData.get("amount") ?? "0"), 10);
  // Pass the chosen destination through (don't coerce to MPESA). Step-up SMS
  // verification is gated on the licensed SMS provider; the withdrawal is
  // protected by KYC + AML in the meantime, so no unenforced OTP is collected.
  const provider = String(formData.get("provider") ?? "") as WithdrawInput["provider"];
  const msisdn = formData.get("msisdn") ? String(formData.get("msisdn")) : undefined;

  // Carry form values through the error redirect so the player doesn't
  // have to re-enter provider + amount + phone on validation failure.
  const carryParams = `&provider=${encodeURIComponent(provider)}&amount=${amount}${msisdn ? `&msisdn=${encodeURIComponent(msisdn)}` : ""}`;

  if (!Number.isFinite(amount) || amount < 1000 || amount > 5_000_000) redirect(("/wallet/withdraw?error=" + encodeURIComponent("Amount must be between TZS 1,000 and TZS 5,000,000.") + carryParams) as never);
  // The payee mobile number is where the money is sent — required for every
  // (mobile-money) payout. A clean message here; the exact format is validated
  // by the WithdrawSchema (tzPhone) inside withdraw().
  if (!msisdn) redirect(("/wallet/withdraw?error=" + encodeURIComponent("Enter the destination mobile number.") + carryParams) as never);
  const idempotencyKey = formData.get("idempotencyKey") ? String(formData.get("idempotencyKey")) : undefined;
  const result = await withdraw(session.userId, {
    provider,
    amount,
    msisdn,
  }, idempotencyKey);
  revalidatePath("/wallet");
  if (!result.ok) redirect(("/wallet/withdraw?error=" + encodeURIComponent(result.error) + carryParams) as never);
  redirect(`/wallet?withdrawal=${result.data!.txnId}&status=${result.data!.status}&amount=${amount}` as never);
}
