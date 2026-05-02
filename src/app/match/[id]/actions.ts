"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { placeBet, settleWindow } from "@/lib/server/bet-service";
import { matches } from "@/lib/mock-data";

export async function placeBetAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const matchId = String(formData.get("matchId") ?? "");
  const windowKind = String(formData.get("windowKind") ?? "") as "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT";
  const outcome = String(formData.get("outcome") ?? "") as "home" | "away" | "draw";
  const stake = parseInt(String(formData.get("stake") ?? "0"), 10);

  const match = matches.find((m) => m.id === matchId);
  if (!match) return { ok: false as const, error: "Match not found." };
  const window = match.windows.find((w) => w.kind === windowKind);
  if (!window) return { ok: false as const, error: "Window not found." };

  const outcomeLabel =
    outcome === "home" ? `${match.home.shortName} win` :
    outcome === "away" ? `${match.away.shortName} win` :
    "Draw · Sare";

  const result = await placeBet(
    session.userId,
    { matchId, windowKind, outcome, stake },
    {
      matchLabel: `${match.home.shortName} vs ${match.away.shortName}`,
      league: match.league,
      windowLabel: window.label,
      outcomeLabel,
      payRate: window.payRate,
    },
  );

  // NOTE: revalidatePath is deliberately omitted here — when paired with a server
  // action that also returns a value, Next 15+ can drop the return for the client.
  // The client component calls router.refresh() after success instead.
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, data: result.data };
}

export async function settleWindowAction(formData: FormData) {
  const session = await currentSession();
  if (!session?.demoMode) redirect("/auth/login");

  const matchId = String(formData.get("matchId") ?? "");
  const windowKind = String(formData.get("windowKind") ?? "") as "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT";
  const outcome = String(formData.get("outcome") ?? "home") as "home" | "away" | "draw";
  await settleWindow(matchId, windowKind, outcome);
  return { ok: true as const };
}
