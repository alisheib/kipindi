"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { rateCheckAsync } from "@/lib/server/rate-limit";
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
import { createMarket, emergencyVoidMarket, resolvePublishCategory } from "@/lib/server/market-service";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";
import { MARKET_OPS_ROLES } from "@/lib/server/roles";
import { safeError } from "@/lib/server/safe-error";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = MARKET_OPS_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin(action: string): Promise<{ userId: string; sessionId: string }> {
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
  await requireAdminTotp(session.userId, session.sessionId);
  return { userId: session.userId, sessionId: session.sessionId };
}

/* ─── Generate ─── */

export async function generatePollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("generatePollAction");
  const category = String(formData.get("category") ?? "sports");
  const prompt = String(formData.get("prompt") ?? "");
  const regenerationOf = String(formData.get("regenerationOf") ?? "");
  // Controlled mode fields
  const controlledTitle = String(formData.get("controlledTitle") ?? "").trim() || undefined;
  const controlledResolutionAt = String(formData.get("controlledResolutionAt") ?? "").trim() || undefined;
  const controlledSelectionClosedAt = String(formData.get("controlledSelectionClosedAt") ?? "").trim() || undefined;

  try {
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
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Generation failed") };
  }
}

/* ─── Generate batch ─── */

export async function generatePollBatchAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("generatePollBatchAction");
  // Per-officer rate-limit: a batch fires up to 200 paid AI generations, so cap
  // how often it can be triggered (caps runaway Anthropic spend within the
  // trusted-admin boundary).
  const rl = await rateCheckAsync(officerId, "ai.batch");
  if (!rl.allowed) {
    return { ok: false as const, error: `Too many batch generations — wait ${rl.retryAfterSec}s before the next batch.` };
  }
  const countRaw = Number(formData.get("count") ?? "3");
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(200, Math.floor(countRaw))) : 3;
  const prompt = String(formData.get("prompt") ?? "");
  const catsRaw = String(formData.get("categories") ?? "");
  const categories = catsRaw ? catsRaw.split(",").map((c) => c.trim()).filter(Boolean) : undefined;

  try {
    const { generated, summary } = await generateAIPollBatch({
      count,
      categories,
      prompt: prompt || undefined,
      actorId: officerId,
    });

    revalidatePath("/admin/ai-polls");
    return { ok: true as const, total: generated.length, summary };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Batch generation failed") };
  }
}

/* ─── Update config ─── */

export async function updatePollConfigAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("updatePollConfigAction");

  const num = (k: string): number | undefined => {
    if (!formData.has(k)) return undefined;
    const n = Number(formData.get(k));
    return Number.isFinite(n) ? n : undefined;
  };

  // Parse per-category selection lead times in MINUTES (e.g. "selectionLead.sports" = "60")
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

  try {
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
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config update failed") };
  }
}

/* ─── Approve ─── */

export async function approvePollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("approvePollAction");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");

  try {
    // Precise message for the common block: a poll that failed quality checks.
    const existing = await getAIPoll(id);
    if (existing && existing.state === "PENDING_REVIEW" && existing.filterReasons.length > 0) {
      return { ok: false as const, error: "This poll has unresolved quality issues and cannot be approved. Edit or regenerate it first." };
    }

    const poll = await approveAIPoll(id, { officerId, note: note || undefined });
    if (!poll) return { ok: false as const, error: "Poll not found or not in review state." };

    revalidatePath("/admin/ai-polls");
    return { ok: true as const, poll };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Approve failed") };
  }
}

/* ─── Reject ─── */

export async function rejectPollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("rejectPollAction");
  const id = String(formData.get("id") ?? "");
  const reasonsStr = String(formData.get("reasons") ?? "");
  const note = String(formData.get("note") ?? "");

  const VALID_FILTER_REASONS: Set<string> = new Set([
    "empty_title", "empty_criterion", "invalid_date", "past_date",
    "resolution_too_soon", "resolution_too_far", "no_options",
    "duplicate_options", "too_few_options", "invalid_category",
    "banned_category", "low_confidence", "title_too_long",
    "criterion_too_long", "xss_detected", "null_bytes",
    "duplicate_poll", "no_sources", "invalid_source_url", "source_not_trusted",
    "malformed_response", "missing_translation",
  ]);
  const rawReasons = reasonsStr ? reasonsStr.split(",").filter((r) => VALID_FILTER_REASONS.has(r)) : [];
  const reasons: FilterReason[] = rawReasons.length > 0 ? rawReasons as FilterReason[] : ["malformed_response"];

  try {
    const poll = await rejectAIPoll(id, { officerId, reasons, note: note || undefined });
    if (!poll) return { ok: false as const, error: "Poll not found or not in reviewable state." };

    revalidatePath("/admin/ai-polls");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Reject failed") };
  }
}

/* ─── Edit ─── */

export async function editPollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("editPollAction");
  const id = String(formData.get("id") ?? "");
  const titleEn = formData.has("titleEn") ? String(formData.get("titleEn")) : undefined;
  const titleSw = formData.has("titleSw") ? String(formData.get("titleSw")) : undefined;
  const titleZh = formData.has("titleZh") ? String(formData.get("titleZh")) : undefined;
  const category = formData.has("category") ? String(formData.get("category")) : undefined;
  const resolutionCriterion = formData.has("resolutionCriterion") ? String(formData.get("resolutionCriterion")) : undefined;
  const resolutionAt = formData.has("resolutionAt") ? String(formData.get("resolutionAt")) : undefined;
  const selectionClosedAt = formData.has("selectionClosedAt")
    ? (formData.get("selectionClosedAt") === "" ? null : String(formData.get("selectionClosedAt")))
    : undefined;

  try {
    const poll = await editAIPoll(id, {
      officerId,
      titleEn,
      titleSw,
      titleZh,
      category,
      resolutionCriterion,
      resolutionAt,
      selectionClosedAt,
    });

    if (!poll) return { ok: false as const, error: "Poll not found or not editable." };

    revalidatePath("/admin/ai-polls");
    return { ok: true as const, poll };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Edit failed") };
  }
}

/* ─── Publish (create market candidate → approve → create market → publish) ─── */

export async function publishPollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("publishPollAction");
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
    // Stale selection-close guard: if the poll sat in APPROVED for days and the
    // selection close has already passed, recompute it from the category lead
    // time so the published market has a valid betting window.
    if (selMs <= Date.now()) {
      const { computeSelectionClosedAt } = await import("@/lib/server/ai-poll-config");
      poll.selectionClosedAt = computeSelectionClosedAt(poll.resolutionAt, poll.category);
    }
  }

  // ── SOURCE ALLOWLIST GATE ────────────────────────────────────────────────
  // This was MISSING: `isSourceTrusted` was imported here but never called, so the
  // AI-poll → market path was the ONE publish path that skipped the trusted-domain
  // allowlist (every other path — manual, candidate, proposal — enforces it). An
  // AI-generated source URL is only syntax-checked, never fetched, so a plausible
  // hallucinated domain could reach a live market. isSourceTrusted ALSO enforces
  // the operator's disabled-category list, which was likewise being bypassed here.
  // The gate + createMarket now use the SAME resolvePublishCategory, so a poll is
  // gated against the exact category it publishes as (previously tech/other were
  // gated against macro but published as tech/other — an unsatisfiable mismatch).
  const publishCategory = resolvePublishCategory(poll.category);
  const primarySource = poll.sources[0]?.url ?? "";
  await seedDefaultSources();
  const trust = await isSourceTrusted(primarySource, publishCategory);
  if (!trust.ok) {
    audit({
      category: "COMPLIANCE",
      action: "ai_poll.publish_blocked.untrusted_source",
      actorId: officerId, targetType: "AIPoll", targetId: poll.id,
      payload: { sourceUrl: primarySource, category: publishCategory, reason: trust.reason },
    });
    return {
      ok: false as const,
      error: `Source not permitted: ${trust.reason ?? "not on the trusted registry"}. Edit the poll's source, or add the domain under Sources & categories.`,
    };
  }

  try {
  // Create a market candidate through the existing pipeline
  // The candidate pipeline's category type has no tech/other (it predates them),
  // so fold those into macro for the intermediate record only. The market itself
  // (below) keeps the faithful resolvePublishCategory value.
  const candidateCategory = (publishCategory === "tech" || publishCategory === "other") ? "macro" : publishCategory;
  const candidate = await ingestCandidate({
    category: candidateCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure",
    proposedTitleEn: poll.titleEn,
    proposedTitleSw: poll.titleSw || undefined,
    proposedTitleZh: poll.titleZh || undefined,
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

  // Create the actual market — SAME category the trusted-source gate above used.
  await seedDefaultSources();
  const market = await createMarket({
    titleEn: poll.titleEn,
    titleSw: poll.titleSw || poll.titleEn,
    titleZh: poll.titleZh || null,
    category: publishCategory,
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
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Publish failed") };
  }
}

/* ─── Delete ─── */

export async function deletePollAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("deletePollAction");
  const id = String(formData.get("id") ?? "");
  const rawReason = String(formData.get("reason") ?? "").trim();
  const voidReason = rawReason.length >= 5 ? rawReason : "Regulatory/administrative decision — market cancelled by administrator";

  try {
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
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Delete failed") };
  }
}

/* ─── Delete all ─── */

export async function deleteAllPollsAction(formData: FormData) {
  const { userId: officerId } = await requireAdmin("deleteAllPollsAction");
  const rawReason = String(formData.get("reason") ?? "").trim();
  const voidReason = rawReason.length >= 5 ? rawReason : "Regulatory/administrative decision — bulk market cancellation by administrator";

  try {
    const { deleted, skipped, publishedPolls } = await deleteAllAIPolls(officerId);

    let voidedCount = 0;
    let totalRefundedCount = 0;
    let totalRefundedTzs = 0;
    const voidErrors: string[] = [];

    // Void each live market and delete its poll
    for (const { pollId, marketId } of publishedPolls) {
      try {
        if (!marketId) {
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
      } catch (loopErr) {
        voidErrors.push(`Poll ${pollId}: ${(loopErr as Error)?.message ?? "unknown error"}`);
      }
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
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Delete all failed") };
  }
}

/* ─── Seed fixtures ─── */

export async function seedFixturesAction() {
  await requireAdmin("seedFixturesAction");
  // Fixtures inject FABRICATED polls (a fake human reviewer + synthetic
  // cost/latency telemetry) straight into the store the prod admin reads and
  // that can feed AI-spend reporting. Dev/demo only — never in production.
  if (process.env.NODE_ENV === "production") {
    return { ok: false as const, error: "Seed fixtures is disabled in production." };
  }
  try {
    const seeded = await seedAIPollFixtures();
    revalidatePath("/admin/ai-polls");
    return { ok: true as const, count: seeded.length };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Seed failed") };
  }
}
