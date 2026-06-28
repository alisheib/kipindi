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
  deleteAllAIPolls,
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
import { createMarket, emergencyVoidMarket } from "@/lib/server/market-service";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";
import { MARKET_OPS_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = MARKET_OPS_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin(action: string): Promise<string> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
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
  // Controlled mode fields
  const controlledTitle = String(formData.get("controlledTitle") ?? "").trim() || undefined;
  const controlledResolutionAt = String(formData.get("controlledResolutionAt") ?? "").trim() || undefined;
  const controlledSelectionClosedAt = String(formData.get("controlledSelectionClosedAt") ?? "").trim() || undefined;

  const poll = await generateAIPoll({
    category,
    prompt: prompt || undefined,
    actorId: officerId,
    regenerationOf: regenerationOf || undefined,
    controlledTitle,
    controlledResolutionAt,
    controlledSelectionClosedAt,
  });

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, poll };
}

/* ─── Generate batch ─── */

export async function generatePollBatchAction(formData: FormData) {
  const officerId = await requireAdmin("generatePollBatchAction");
  const countRaw = Number(formData.get("count") ?? "3");
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(200, Math.floor(countRaw))) : 3;
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

  // Parse per-category selection lead times (e.g. "selectionLead.sports" = "1")
  const selectionLeadTimeHours: Record<string, number> | undefined = (() => {
    const entries: [string, number][] = [];
    for (const [key, val] of formData.entries()) {
      if (key.startsWith("selectionLead.")) {
        const cat = key.slice("selectionLead.".length);
        const n = Number(val);
        if (cat && Number.isFinite(n)) entries.push([cat, n]);
      }
    }
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  })();

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
      selectionLeadTimeHours,
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

  // Precise message for the common block: a poll that failed quality checks.
  const existing = await getAIPoll(id);
  if (existing && existing.state === "PENDING_REVIEW" && existing.filterReasons.length > 0) {
    return { ok: false as const, error: "This poll has unresolved quality issues and cannot be approved. Edit or regenerate it first." };
  }

  const poll = await approveAIPoll(id, { officerId, note: note || undefined });
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

  const VALID_FILTER_REASONS: Set<string> = new Set([
    "empty_title", "empty_criterion", "invalid_date", "past_date",
    "resolution_too_soon", "resolution_too_far", "no_options",
    "duplicate_options", "too_few_options", "invalid_category",
    "banned_category", "low_confidence", "title_too_long",
    "criterion_too_long", "xss_detected", "null_bytes",
    "duplicate_poll", "no_sources", "invalid_source_url", "malformed_response",
  ]);
  const rawReasons = reasonsStr ? reasonsStr.split(",").filter((r) => VALID_FILTER_REASONS.has(r)) : [];
  const reasons: FilterReason[] = rawReasons.length > 0 ? rawReasons as FilterReason[] : ["malformed_response"];

  const poll = await rejectAIPoll(id, { officerId, reasons, note: note || undefined });
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

  const poll = await editAIPoll(id, {
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

  const poll = await getAIPoll(id);
  if (!poll) return { ok: false as const, error: "Poll not found." };
  if (poll.state !== "APPROVED") return { ok: false as const, error: "Poll must be approved before publishing." };
  if (!poll.titleEn) return { ok: false as const, error: "Poll has no title." };
  if (!poll.resolutionAt) return { ok: false as const, error: "Poll has no resolution date." };
  // Stale-date guard: a poll approved a while ago may now resolve in the past.
  // Publishing it would create a dead market (selections already closed). Force
  // an edit to a fresh future date first.
  const resMs = Date.parse(poll.resolutionAt);
  if (!Number.isFinite(resMs) || resMs <= Date.now()) {
    return { ok: false as const, error: "Resolution date has passed — edit the poll to a future date before publishing." };
  }
  // Selection close must be strictly before resolution (defence in depth).
  if (poll.selectionClosedAt) {
    const selMs = Date.parse(poll.selectionClosedAt);
    if (!Number.isFinite(selMs) || selMs >= resMs) {
      return { ok: false as const, error: "Selection-close time must be before the resolution date — edit the poll first." };
    }
  }

  // Create a market candidate through the existing pipeline
  const candidate = await ingestCandidate({
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
  await filterCandidate(candidate.id, { passes: true });
  await attachVerification(candidate.id, {
    confirmingSources: [],
    tokensSpent: 0,
    costUsd: 0,
  });
  await scoreCandidate(candidate.id, {
    confidence: poll.confidence,
    tokensSpent: 0,
    costUsd: 0,
    rubric: { aiPollQuality: poll.overallQuality },
  });
  await approveCandidate(candidate.id, { officerId, note: `Auto-approved from AI poll ${poll.id}` });

  // Create the actual market
  await seedDefaultSources();
  const marketCategory = poll.category === "infrastructure" ? "macro"
    : poll.category === "tech" ? "tech"
    : poll.category === "other" ? "other"
    : poll.category;

  const market = await createMarket({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || poll.titleEn,
    category: marketCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other",
    sourceUrl: poll.sources[0]?.url ?? "",
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    selectionClosedAt: poll.selectionClosedAt,
    proposedBy: officerId,
  });

  await markPublished(candidate.id, market.id, officerId);
  await markAIPollPublished(poll.id, {
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
  const rawReason = String(formData.get("reason") ?? "").trim();
  const voidReason = rawReason.length >= 5 ? rawReason : "Regulatory/administrative decision — market cancelled by administrator";

  // For PUBLISHED polls, void the live market first (full refunds, no deductions).
  const poll = await getAIPoll(id);
  if (!poll) return { ok: false as const, error: "Poll not found." };

  let refundedCount = 0;
  let refundedTzs = 0;

  if (poll.state === "PUBLISHED" && poll.publishedMarketId) {
    const voidResult = await emergencyVoidMarket({ marketId: poll.publishedMarketId, officerId, reason: voidReason });
    if (!voidResult.ok) return { ok: false as const, error: `Market void failed: ${voidResult.error}` };
    refundedCount = voidResult.data?.refundedCount ?? 0;
    refundedTzs = voidResult.data?.refundedTzs ?? 0;
  }

  const ok = await deleteAIPoll(id, officerId);
  if (!ok) return { ok: false as const, error: "Poll not found or not in a deletable state." };

  revalidatePath("/admin/ai-polls");
  return { ok: true as const, refundedCount, refundedTzs };
}

/* ─── Delete all ─── */

export async function deleteAllPollsAction(formData: FormData) {
  const officerId = await requireAdmin("deleteAllPollsAction");
  const rawReason = String(formData.get("reason") ?? "").trim();
  const voidReason = rawReason.length >= 5 ? rawReason : "Regulatory/administrative decision — bulk market cancellation by administrator";

  const { deleted, skipped, publishedPolls } = await deleteAllAIPolls(officerId);

  let voidedCount = 0;
  let totalRefundedCount = 0;
  let totalRefundedTzs = 0;
  const voidErrors: string[] = [];

  // Void each live market and delete its poll
  for (const { pollId, marketId } of publishedPolls) {
    if (!marketId) {
      // No market ID — delete poll directly
      await deleteAIPoll(pollId, officerId);
      voidedCount++;
      continue;
    }
    const voidResult = await emergencyVoidMarket({ marketId, officerId, reason: voidReason });
    if (!voidResult.ok) {
      voidErrors.push(`Market ${marketId}: ${voidResult.error}`);
      continue;
    }
    totalRefundedCount += voidResult.data?.refundedCount ?? 0;
    totalRefundedTzs += voidResult.data?.refundedTzs ?? 0;
    await deleteAIPoll(pollId, officerId);
    voidedCount++;
  }

  revalidatePath("/admin/ai-polls");
  revalidatePath("/admin/markets");

  return {
    ok: true as const,
    deleted,
    voided: voidedCount,
    skipped,
    refundedCount: totalRefundedCount,
    refundedTzs: totalRefundedTzs,
    voidErrors,
  };
}

/* ─── Seed fixtures ─── */

export async function seedFixturesAction() {
  const officerId = await requireAdmin("seedFixturesAction");
  const seeded = await seedAIPollFixtures();
  revalidatePath("/admin/ai-polls");
  return { ok: true as const, count: seeded.length };
}
