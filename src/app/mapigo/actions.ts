"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { placeMapigoBet, settleRound, getCurrentRound } from "@/lib/server/mapigo-service";

export async function placeMapigoBetAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const call = String(formData.get("call") ?? "") as "SPIKE" | "DRIFT" | "CALM";
  const stake = parseInt(String(formData.get("stake") ?? "0"), 10);

  const result = await placeMapigoBet(session.userId, { call, stake });
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, data: result.data };
}

export async function settleCurrentRoundAction(formData?: FormData) {
  const session = await currentSession();
  if (!session?.demoMode) redirect("/auth/login");
  const round = getCurrentRound();
  const forced = formData ? (String(formData.get("result") ?? "") as "SPIKE" | "DRIFT" | "CALM" | "") : "";
  const result = await settleRound(round.id, forced || undefined);
  return result;
}
