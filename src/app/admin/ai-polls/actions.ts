"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import {
  generateAIPoll,
  generateAIPollBatch,
  approveAIPoll,
  rejectAIPoll,
  editAIPoll,
  markAIPollPublished,
  deleteAIPoll,
  seedAIPollFixtures,
  getAIPoll,
  type FilterReason,
} from "@/lib/server/ai-poll-generation";
import { updateAIPollConfig } from "@/lib/server/ai-poll-config";
import {
  ingestCandidate,
  filterCandidate,
  attachVerification,
  scoreCandidate,
  approveCandidate,
  markPublished,
} from "@/lib/server/market-candidate";
import { createMarket } from "@/lib/server/market-service";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin(action: string): Promise<string> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = await db.user.findById(session.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: u?.role ?? "unknown" },
    });
    throw new Error("Forbidden: admin role required.");
  }
  return session.userId;
}

/* ─── Generate ─── */

export async function generatePollAction(formData: FormData) {
  const officerId = await requireAdmin("generatePollAction");
  const category = String(formData.get("category") ?? "sports");
  const prompt = String(formData.get("prompt") ?? "");
  const regenerationOf = String(formData.get("regenerationOf") ?? "");

  const poll = await generateAIPoll({
    category,
    prompt: prompt || undefined,
    actorId: officerId,
    regenerationOf: regenerationOf || undefined,
  });

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, poll };
}

/* ─── Generate batch ─── */

export async function generatePollBatchAction(formData: FormData) {
  const officerId = await requireAdmin("generatePollBatchAction");
  const count = Number(formData.get("count") ?? "3");
  const prompt = String(formData.get("prompt") ?? "");
  const catsRaw = String(formData.get("categories") ?? "");
  const categories = catsRaw ? catsRaw.split(",").map((c) => c.trim()).filter(Boolean) : undefined;

  const { generated, summary } = await generateAIPollBatch({
    count,
    categories,
    prompt: prompt || undefined,
    actorId: officerId,
  });

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, total: generated.length, summary };
}

/* ─── Update config ─── */

export async function updatePollConfigAction(formData: FormData) {
  const officerId = await requireAdmin("updatePollConfigAction");

  const num = (k: string): number | undefined => {
    if (!formData.has(k)) return undefined;
    const n = Number(formData.get(k));
    return Number.isFinite(n) ? n : undefined;
  };

  const config = updateAIPollConfig(
    {
      webSearchEnabled: formData.has("webSearchEnabled")
        ? formData.get("webSearchEnabled") === "true"
        : undefined,
      dailyTarget: num("dailyTarget"),
      minLeadTimeHours: num("minLeadTimeHours"),
      maxLeadTimeDays: num("maxLeadTimeDays"),
      minConfidence: num("minConfidence"),
      maxBatchPerRun: num("maxBatchPerRun"),
    },
    officerId,
  );

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, config };
}

/* ─── Approve ─── */

export async function approvePollAction(formData: FormData) {
  const officerId = await requireAdmin("approvePollAction");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");

  const poll = approveAIPoll(id, { officerId, note: note || undefined });
  if (!poll) return { ok: false as const, error: "Poll not found or not in review state." };

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, poll };
}

/* ─── Reject ─── */

export async function rejectPollAction(formData: FormData) {
  const officerId = await requireAdmin("rejectPollAction");
  const id = String(formData.get("id") ?? "");
  const reasonsStr = String(formData.get("reasons") ?? "");
  const note = String(formData.get("note") ?? "");

  const reasons = reasonsStr ? reasonsStr.split(",") as FilterReason[] : ["malformed_response" as FilterReason];

  const poll = rejectAIPoll(id, { officerId, reasons, note: note || undefined });
  if (!poll) return { ok: false as const, error: "Poll not found or not in reviewable state." };

  revalidatePath("/admin/ai-polls");
  return { ok: true as const };
}

/* ─── Edit ─── */

export async function editPollAction(formData: FormData) {
  const officerId = await requireAdmin("editPollAction");
  const id = String(formData.get("id") ?? "");
  const titleEn = formData.has("titleEn") ? String(formData.get("titleEn")) : undefined;
  const titleSw = formData.has("titleSw") ? String(formData.get("titleSw")) : undefined;
  const category = formData.has("category") ? String(formData.get("category")) : undefined;
  const resolutionCriterion = formData.has("resolutionCriterion") ? String(formData.get("resolutionCriterion")) : undefined;
  const resolutionAt = formData.has("resolutionAt") ? String(formData.get("resolutionAt")) : undefined;

  const poll = editAIPoll(id, {
    officerId,
    titleEn,
    titleSw,
    category,
    resolutionCriterion,
    resolutionAt,
  });

  if (!poll) return { ok: false as const, error: "Poll not found or not editable." };

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, poll };
}

/* ─── Publish (create market candidate → approve → create market → publish) ─── */

export async function publishPollAction(formData: FormData) {
  const officerId = await requireAdmin("publishPollAction");
  const id = String(formData.get("id") ?? "");

  const poll = getAIPoll(id);
  if (!poll) return { ok: false as const, error: "Poll not found." };
  if (poll.state !== "APPROVED") return { ok: false as const, error: "Poll must be approved before publishing." };
  if (!poll.titleEn) return { ok: false as const, error: "Poll has no title." };
  if (!poll.resolutionAt) return { ok: false as const, error: "Poll has no resolution date." };

  // Create a market candidate through the existing pipeline
  const candidate = ingestCandidate({
    category: (poll.category === "tech" || poll.category === "other" ? "macro" : poll.category) as "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure",
    proposedTitleEn: poll.titleEn,
    proposedTitleSw: poll.titleSw || undefined,
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    sources: poll.sources.map((s) => ({
      url: s.url,
      publisher: s.publisher,
      retrievedAt: new Date().toISOString(),
    })),
    tokensSpent: poll.tokensUsed,
    costUsd: poll.costUsd,
    actorId: officerId,
  });

  // Fast-track through the candidate pipeline (already validated by AI poll service)
  filterCandidate(candidate.id, { passes: true });
  attachVerification(candidate.id, {
    confirmingSources: [],
    tokensSpent: 0,
    costUsd: 0,
  });
  scoreCandidate(candidate.id, {
    confidence: poll.confidence,
    tokensSpent: 0,
    costUsd: 0,
    rubric: { aiPollQuality: poll.overallQuality },
  });
  approveCandidate(candidate.id, { officerId, note: `Auto-approved from AI poll ${poll.id}` });

  // Create the actual market
  seedDefaultSources();
  const marketCategory = poll.category === "infrastructure" ? "macro"
    : poll.category === "tech" ? "tech"
    : poll.category === "other" ? "other"
    : poll.category;

  const market = createMarket({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || poll.titleEn,
    category: marketCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other",
    sourceUrl: poll.sources[0]?.url ?? "",
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    proposedBy: officerId,
  });

  markPublished(candidate.id, market.id, officerId);
  markAIPollPublished(poll.id, {
    candidateId: candidate.id,
    marketId: market.id,
    officerId,
  });

  revalidatePath("/admin/ai-polls");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/markets");
  return { ok: true as const, marketId: market.id, candidateId: candidate.id };
}

/* ─── Delete ─── */

export async function deletePollAction(formData: FormData) {
  const officerId = await requireAdmin("deletePollAction");
  const id = String(formData.get("id") ?? "");

  const ok = deleteAIPoll(id, officerId);
  if (!ok) return { ok: false as const, error: "Poll not found or not in a deletable state." };

  revalidatePath("/admin/ai-polls");
  return { ok: true as const };
}

/* ─── Seed fixtures ─── */

export async function seedFixturesAction() {
  const officerId = await requireAdmin("seedFixturesAction");
  const seeded = seedAIPollFixtures();
  revalidatePath("/admin/ai-polls");
  return { ok: true as const, count: seeded.length };
}
