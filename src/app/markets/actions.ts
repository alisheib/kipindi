"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { buyPosition, cashOutPosition, resolveMarket, createMarket, listPositionsForUser, type CreateMarketInput, type Side } from "@/lib/server/market-service";
import { addComment, reportComment, deleteComment, type CommentSide } from "@/lib/server/comments-store";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";

/** Defense-in-depth: even though the /admin layout gates non-admin
 *  access at render time, the Server Action itself must refuse a
 *  privileged write if the caller is not actually an admin. A leaked
 *  Server-Action ID would otherwise let a regular player resolve a
 *  market. Regulator: GBT / LCCP "least-privilege" + ISO 27001 A.9. */
const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);
function requireAdminOrThrow(userId: string, action: string): void {
  const user = db.user.findById(userId);
  if (!user || !ADMIN_ROLES.has(user.role)) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: userId,
      targetType: "Action",
      targetId: action,
      payload: { role: user?.role ?? "unknown" },
    });
    throw new Error("Forbidden: admin role required.");
  }
}

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
  requireAdminOrThrow(session.userId, "resolveMarketAction");
  const marketId = String(formData.get("marketId") ?? "");
  const outcome = String(formData.get("outcome") ?? "") as Side | "VOID";
  // Validate at runtime — the `as` cast is erased, so an invalid string would
  // otherwise reach settlement, mark the market RESOLVED with no winners, and
  // permanently lock every stake.
  if (outcome !== "YES" && outcome !== "NO" && outcome !== "VOID") {
    return { ok: false as const, error: "Invalid outcome.", code: "INVALID" as const };
  }
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
  requireAdminOrThrow(session.userId, "createMarketAction");
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

// ─── Market discussion (comments) ──────────────────────────────────────
// Post-moderation: visible immediately, community report → auto-hide,
// author/moderator soft-delete. See comments-store.ts.

export async function postCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in to comment · Ingia ili kutoa maoni." };
  const marketId = String(formData.get("marketId") ?? "");
  const body = String(formData.get("body") ?? "");
  // Surface which side they hold as a small trust badge on the comment.
  const open = listPositionsForUser(session.userId).filter((p) => p.marketId === marketId && p.status === "OPEN");
  const side: CommentSide = open.length ? (open[open.length - 1].side as "YES" | "NO") : null;
  const r = addComment(session.userId, marketId, body, side);
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}

export async function reportCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };
  const marketId = String(formData.get("marketId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const r = reportComment(session.userId, commentId);
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}

export async function deleteCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };
  const marketId = String(formData.get("marketId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const r = deleteComment(session.userId, commentId);
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}
