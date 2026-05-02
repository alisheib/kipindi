"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { deposit } from "@/lib/server/wallet-service";

export async function depositAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const result = await deposit(session.userId, {
    provider: String(formData.get("provider") ?? "") as "MPESA",
    amount: parseInt(String(formData.get("amount") ?? "0"), 10),
    msisdn: formData.get("msisdn") ? String(formData.get("msisdn")) : undefined,
  });
  revalidatePath("/wallet");
  if (!result.ok) return { ok: false as const, error: result.error };
  redirect("/wallet?deposited=" + result.data!.txnId);
}
