/**
 * AI poll → live market: the publish pipeline, as a service.
 *
 * ── WHY THIS IS A MODULE AND NOT A CLOSURE INSIDE THE SERVER ACTION ──────────
 *
 * It used to be the body of `publishPollAction`. A "use server" action cannot be
 * called from a test — it sits behind session + step-up TOTP + RBAC — so the eight-step
 * pipeline it runs was the ONE money-adjacent chain in this codebase covered by nothing
 * that executes it. What covered it was a reading of the source, and a reading of the
 * source is exactly what missed this:
 *
 *   scoreCandidate(confidence 52) → FILTERED_OUT
 *   approveCandidate()            → null, AND THE RETURN VALUE WAS DISCARDED
 *   createMarket()                → ran anyway, market LIVE and bettable
 *   markPublished()               → null, because the candidate is not APPROVED
 *   → the officer is told "publish FAILED · do NOT retry" about a live market.
 *
 * It fired three times on production — 2026-08-11 05:05, 2026-08-14 08:25, 2026-08-14
 * 08:36 — every one of them `pollLinked: true, marketPublished: false`, every one of
 * them a market that was LIVE. `mkt_49303bbf4faec0e38524` had TZS 15,000 staked in it
 * while the console said it had not published.
 *
 * ── THE TWO RULES THIS FILE ENFORCES ─────────────────────────────────────────
 *
 *  1. A HUMAN APPROVAL WINS. The officer approved the poll before this ran; the
 *     confidence threshold is the AUTOPILOT's admission test and does not get to
 *     overrule them. `scoreCandidate({ humanApproved: true })`, recorded in the trace
 *     and audited. See `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14.
 *
 *  2. NOTHING GOES LIVE OFF A BROKEN PIPELINE. Every step's return value is checked,
 *     and the check happens BEFORE `createMarket`. Creating the market is the
 *     irreversible act — a market cannot be un-created, only voided with refunds — so
 *     it is the last thing that happens, after everything that can still fail has.
 *     This ordering is the actual safety property; rule 1 is what stops it triggering.
 */

import { withLock } from "./locks";
import { audit } from "./audit";
import {
  ingestCandidate,
  filterCandidate,
  attachVerification,
  scoreCandidate,
  approveCandidate,
  markPublished,
} from "./market-candidate";
import { createMarket, type MarketCategory } from "./market-service";
import { getAIPoll, markAIPollPublished, type StoredAIPoll } from "./ai-poll-generation";

export type PublishPollResult =
  | { ok: true; marketId: string; candidateId: string }
  | { ok: false; error: string; marketId?: string };

/**
 * Run an APPROVED AI poll through the candidate pipeline and publish it as a live
 * market. Serialised on the poll id, and the poll's state is RE-READ inside the lock.
 *
 * ⛔ The lock and the re-read are not decoration. Publishing is eight steps and the only
 * thing that stopped it running twice was an `APPROVED` check made BEFORE any of them,
 * on a read anyone could race — a double-click, a retried request, or two officers on
 * the same queue all passed it and all reached `createMarket`, which creates a market
 * `status: "LIVE"` unconditionally. Two live markets asking the same question, each
 * taking real stakes into its own pool, each resolving separately; `markAIPollPublished`
 * records only the LAST market id, so the first is orphaned the moment it is created.
 *
 * @param publishCategory the category the market is created as. The caller has already
 *   gated the poll's source against THIS category — pass the same value, never recompute
 *   it here, or the gate and the market can disagree.
 */
export async function publishApprovedPoll(input: {
  pollId: string;
  officerId: string;
  publishCategory: MarketCategory;
}): Promise<PublishPollResult> {
  const { pollId, officerId, publishCategory } = input;

  return await withLock(`aipoll:publish:${pollId}`, async () => {
    const poll = await getAIPoll(pollId);
    if (!poll) return { ok: false as const, error: "Poll not found." };
    if (poll.state !== "APPROVED") {
      return { ok: false as const, error: "Poll is no longer approved — it may already have been published." };
    }

    // The candidate pipeline's category type has no tech/other (it predates them), so
    // fold those into macro for the intermediate record only. The market itself keeps
    // the faithful `publishCategory` value.
    const candidateCategory = (publishCategory === "tech" || publishCategory === "other") ? "macro" : publishCategory;

    const candidate = await ingestCandidate({
      category: candidateCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure",
      proposedTitleEn: poll.titleEn,
      proposedTitleSw: poll.titleSw || undefined,
      proposedTitleZh: poll.titleZh || undefined,
      resolutionCriterion: poll.resolutionCriterion,
      resolutionCriterionSw: poll.resolutionCriterionSw,
      resolutionCriterionZh: poll.resolutionCriterionZh,
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

    // Fast-track through the candidate pipeline (already validated by the AI poll
    // service and read by a human officer). ⛔ EVERY RETURN VALUE IS CHECKED. Each of
    // these is a state-machine transition that returns `null` when the state it needs
    // is not the state it finds; discarding one is how a live market was created off a
    // candidate that had been filtered out.
    const filtered = await filterCandidate(candidate.id, { passes: true });
    if (!filtered) return pipelineAbort("filterCandidate", candidate.id, poll, officerId);

    const verified = await attachVerification(candidate.id, {
      confirmingSources: [],
      tokensSpent: 0,
      costUsd: 0,
    });
    if (!verified) return pipelineAbort("attachVerification", candidate.id, poll, officerId);

    // 🔴 humanApproved — the officer already approved this poll. The 75-confidence gate
    // is the unattended pipeline's admission test, not a licence rule, and it does not
    // overrule a human. The score is still recorded and still shown.
    const scored = await scoreCandidate(candidate.id, {
      confidence: poll.confidence,
      tokensSpent: 0,
      costUsd: 0,
      rubric: { aiPollQuality: poll.overallQuality },
      humanApproved: true,
    });
    if (!scored) return pipelineAbort("scoreCandidate", candidate.id, poll, officerId);

    const approved = await approveCandidate(candidate.id, {
      officerId,
      note: `Auto-approved from AI poll ${poll.id}`,
    });
    if (!approved) return pipelineAbort("approveCandidate", candidate.id, poll, officerId);

    // ⛔ EVERYTHING THAT CAN STILL FAIL HAS NOW FAILED OR PASSED. Only past this line is
    // the irreversible act performed.
    const market = await createMarket({
      titleEn: poll.titleEn,
      titleSw: poll.titleSw || poll.titleEn,
      titleZh: poll.titleZh || null,
      category: publishCategory,
      sourceUrl: poll.sources[0]?.url ?? "",
      resolutionCriterion: poll.resolutionCriterion,
      // ⭐ THE POINT OF F6c. Without these two lines the model's Swahili criterion is
      // generated, validated, stored, shown to the officer — and then dropped at the one
      // boundary that matters, leaving the player told "no translation available" about
      // a translation that exists. A write-only field.
      resolutionCriterionSw: poll.resolutionCriterionSw,
      resolutionCriterionZh: poll.resolutionCriterionZh,
      resolutionAt: poll.resolutionAt,
      selectionClosedAt: poll.selectionClosedAt,
      proposedBy: officerId,
    });

    // ⚠️ THE LINK-BACK IS CHECKED, NOT ASSUMED. These two writes tie the new LIVE market
    // to the poll it came from. Failing loudly cannot un-create the market (it is live by
    // design), but it stops the silent duplicate and puts the orphan in front of an
    // operator instead of in a log. With the pre-flight checks above, reaching this
    // branch now means a genuine anomaly — not a candidate the pipeline itself rejected.
    const pub = await markPublished(candidate.id, market.id, officerId);
    const linked = await markAIPollPublished(poll.id, {
      candidateId: candidate.id,
      marketId: market.id,
      officerId,
    });
    if (!pub || !linked) {
      audit({
        category: "SYSTEM",
        action: "aipoll.publish_link_failed",
        actorId: officerId,
        targetType: "Market",
        targetId: market.id,
        payload: { pollId: poll.id, candidateId: candidate.id, marketPublished: !!pub, pollLinked: !!linked },
      });
      return {
        ok: false as const,
        marketId: market.id,
        error: `Market ${market.id} was created and is LIVE, but the poll could not be marked published. Do NOT retry — check /admin/markets first.`,
      };
    }

    return { ok: true as const, marketId: market.id, candidateId: candidate.id };
  });
}

/**
 * A pipeline step refused before anything went live. Nothing has been created, so the
 * officer can safely be told to try again — which is the opposite of what the old code
 * said, and the whole point of aborting here rather than after `createMarket`.
 */
function pipelineAbort(
  step: string,
  candidateId: string,
  poll: StoredAIPoll,
  officerId: string,
): { ok: false; error: string } {
  audit({
    category: "SYSTEM",
    action: "aipoll.publish_pipeline_aborted",
    actorId: officerId,
    targetType: "AIPoll",
    targetId: poll.id,
    payload: { step, candidateId, confidence: poll.confidence },
  });
  return {
    ok: false as const,
    error: `Publish stopped at the ${step} step — NO market was created and nothing is live. The poll is still approved; try again, and if it repeats, report the candidate id ${candidateId}.`,
  };
}
