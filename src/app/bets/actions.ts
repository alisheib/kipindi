"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { cashOutBet } from "@/lib/server/bet-service";

export async function cashOutBetAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const betId = String(formData.get("betId") ?? "");
  if (!betId) return { ok: false as const, error: "Missing bet id." };
  const result = await cashOutBet(session.userId, betId);
  revalidatePath("/bets");
  revalidatePath("/wallet");
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, data: result.data };
}
