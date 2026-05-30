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
  // Pass the chosen provider through (don't coerce to MPESA) — the schema validates it.
  const provider = String(formData.get("provider") ?? "") as DepositInput["provider"];
  const result = await deposit(session.userId, {
    provider,
    amount,
    msisdn: formData.get("msisdn") ? String(formData.get("msisdn")) : undefined,
  });
  revalidatePath("/wallet");
  // Surface failures instead of swallowing them — bounce back with the error.
  if (!result.ok) redirect("/wallet/deposit?error=" + encodeURIComponent(result.error));
  redirect(`/wallet?deposited=${result.data!.txnId}&amount=${amount}`);
}
