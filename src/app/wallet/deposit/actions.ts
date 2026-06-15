"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { deposit } from "@/lib/server/wallet-service";
import type { DepositInput } from "@/lib/server/validators";

export async function depositAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const amount = parseInt(String(formData.get("amount") ?? "0"), 10);
  if (!Number.isFinite(amount) || amount <= 0) redirect("/wallet/deposit?error=" + encodeURIComponent("Amount must be a positive number.") as never);
  // Pass the chosen provider through (don't coerce to MPESA) — the schema validates it.
  const provider = String(formData.get("provider") ?? "") as DepositInput["provider"];
  const result = await deposit(session.userId, {
    provider,
    amount,
    msisdn: formData.get("msisdn") ? String(formData.get("msisdn")) : undefined,
  });
  revalidatePath("/wallet");
  // Surface failures instead of swallowing them — bounce back with the error.
  if (!result.ok) redirect(("/wallet/deposit?error=" + encodeURIComponent(result.error)) as never);
  // status is CONFIRMED for synchronous providers, PROCESSING when the provider
  // collects asynchronously (we credit on the webhook). The modal reflects both.
  redirect(`/wallet?deposited=${result.data!.txnId}&amount=${amount}&status=${result.data!.status}` as never);
}
