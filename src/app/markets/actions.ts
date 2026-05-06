"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { buyPosition, cashOutPosition, resolveMarket, createMarket, type CreateMarketInput, type Side } from "@/lib/server/market-service";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";

export async function buyPositionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const marketId = String(formData.get("marketId") ?? "");
  const side = String(formData.get("side") ?? "") as Side;
  const stake = parseInt(String(formData.get("stake") ?? "0"), 10);
  const r = await buyPosition(session.userId, { marketId, side, stake });
  if (r.ok) {
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/positions");
    revalidatePath("/wallet");
  }
  return r;
}

export async function cashOutPositionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const positionId = String(formData.get("positionId") ?? "");
  const r = await cashOutPosition(session.userId, positionId);
  if (r.ok) {
    revalidatePath("/positions");
    revalidatePath("/wallet");
    revalidatePath("/markets");
  }
  return r;
}

export async function resolveMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const marketId = String(formData.get("marketId") ?? "");
  const outcome = String(formData.get("outcome") ?? "") as Side | "VOID";
  const r = await resolveMarket({ marketId, outcome, officerId: session.userId });
  if (r.ok) {
    revalidatePath("/admin/resolver-queue");
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/positions");
  }
  return r;
}

export async function createMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const input: CreateMarketInput = {
    titleEn: String(formData.get("titleEn") ?? ""),
    titleSw: String(formData.get("titleSw") ?? ""),
    category: String(formData.get("category") ?? "other") as CreateMarketInput["category"],
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    resolutionCriterion: String(formData.get("resolutionCriterion") ?? ""),
    resolutionAt: String(formData.get("resolutionAt") ?? ""),
    proposedBy: session.userId,
  };
  if (!input.titleEn || !input.sourceUrl || !input.resolutionAt) {
    return { ok: false as const, error: "Title, source URL, and resolution time are required." };
  }
  // Source-trust gate — only enabled, on-registry sources can publish a market.
  seedDefaultSources();
  const trust = isSourceTrusted(input.sourceUrl, input.category);
  if (!trust.ok) {
    return { ok: false as const, error: `Source not approved · ${trust.reason}. Add or enable it at /admin/sources.` };
  }
  const m = createMarket(input);
  revalidatePath("/admin/markets");
  revalidatePath("/markets");
  return { ok: true as const, market: m };
}
