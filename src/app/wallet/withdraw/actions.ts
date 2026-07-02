"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { withdraw } from "@/lib/server/wallet-service";
import type { WithdrawInput } from "@/lib/server/validators";

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
