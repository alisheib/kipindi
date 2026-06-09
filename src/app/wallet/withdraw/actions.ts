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
  if (!Number.isFinite(amount) || amount <= 0) redirect("/wallet/withdraw?error=" + encodeURIComponent("Amount must be a positive number.") as never);
  // Pass the chosen destination through (don't coerce to MPESA). Step-up SMS
  // verification is gated on the licensed SMS provider; the withdrawal is
  // protected by KYC + AML in the meantime, so no unenforced OTP is collected.
  const provider = String(formData.get("provider") ?? "") as WithdrawInput["provider"];
  const result = await withdraw(session.userId, {
    provider,
    amount,
    msisdn: formData.get("msisdn") ? String(formData.get("msisdn")) : undefined,
  });
  revalidatePath("/wallet");
  if (!result.ok) redirect(("/wallet/withdraw?error=" + encodeURIComponent(result.error)) as never);
  redirect(`/wallet?withdrawal=${result.data!.txnId}&status=${result.data!.status}&amount=${amount}` as never);
}
