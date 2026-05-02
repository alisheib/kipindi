"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { withdraw } from "@/lib/server/wallet-service";

export async function withdrawAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  // In a real flow, the OTP code would be sent + verified. For dev demo, accept any 6-digit.
  const result = await withdraw(session.userId, {
    provider: String(formData.get("provider") ?? "") as "MPESA",
    amount: parseInt(String(formData.get("amount") ?? "0"), 10),
    msisdn: formData.get("msisdn") ? String(formData.get("msisdn")) : undefined,
    otpCode: String(formData.get("otpCode") ?? "000000"),
  });
  revalidatePath("/wallet");
  if (!result.ok) return { ok: false as const, error: result.error };
  redirect(`/wallet?withdrawal=${result.data!.txnId}&status=${result.data!.status}`);
}
