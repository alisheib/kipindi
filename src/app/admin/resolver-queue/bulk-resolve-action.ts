"use server";

/**
 * BULK RESOLVE — seal every SELECTED market in the resolver queue in one action.
 *
 * Ali, 2026-08-28: *"an auto-resolve button on top of this resolver queue page. It confirms
 * all of them and resolves all of them. Plus a checkbox functionality — if admin wants to
 * resolve only a couple of them using the button, he checks each poll as much as he wants
 * and auto-resolves them."*
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * ⛔ IT IS A CALLER, NOT A SECOND ENGINE.
 *
 * Every market goes through `resolveMarket` — the SAME function the per-card "Resolve YES"
 * button has always called, through the same `withLock('market:<id>')`, the same
 * stage-1/stage-2 ceremony, the same `market.adjudicated` audit row, the same objection
 * window, the same settle timer, and the same exact-conservation check when the money
 * finally moves. Nothing here re-implements a money rule. A bulk path that grew its own
 * copy of the resolve logic is how the two halves drift, and the half nobody clicks is the
 * one that goes wrong.
 *
 * ⛔ AND IT DOES NOT WAVE THE CITATION GATE THROUGH. `bulkVerdictFor` re-derives, on the
 * server, the very decision `decideAutoResolve` makes, and a row it refuses is SKIPPED —
 * unless the officer typed a reason for that one row, which is recorded against their name
 * in the audit chain with the block reason, the cited host and the approved host. A control
 * that can be waved past without saying so is not a control.
 *
 * ⛔ SEQUENTIAL, NEVER `Promise.all`. Each `resolveMarket` opens a `withLock` transaction;
 * twenty at once is the pool-exhaustion shape (`P2024`) that `admission.ts` exists to
 * prevent on the bet path. Twenty markets take twenty short transactions in a row.
 *
 * ⭐ PARTIAL SUCCESS IS THE NORMAL CASE, NOT THE ERROR CASE. The result reports four
 * buckets and the UI shows all four. ⛔ Never one "Done ✓" over a mixed batch — on a
 * settlement surface that is a false statement about money.
 */

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { PER_PAGE } from "@/components/ui/pagination";
import {
  bulkVerdictFor,
  OVERRIDABLE,
  type BulkBlockReason,
} from "@/lib/server/bulk-resolve-eligibility";
import type { BulkResolveOutcome, BulkResolveResult } from "./bulk-resolve-types";

const DOMAIN = CONTROL_DOMAIN.bulkResolveMarkets;
const OVERRIDE_DOMAIN = CONTROL_DOMAIN.bulkResolveOverride;

/** The shortest override reason that is a reason rather than a keystroke. Mirrors the
 *  emergency-void control, which learned that "x" is not a justification. */
const MIN_REASON = 12;

export async function bulkResolveMarketsAction(formData: FormData): Promise<BulkResolveResult> {
  const g = await softRequireStaff(DOMAIN, "bulkResolveMarkets", "Forbidden: trading access is required.");
  if (!g.ok) return { ok: false, error: g.error };

  // ⛔ THE RAW LIST IS BOUNDED BEFORE ANYTHING IS PARSED. The cap below reads `unique`,
  // which is what is left AFTER the Set collapses duplicates — so a payload of 100,000
  // repetitions of one id sailed past it, having been trimmed and hashed 100,000 times
  // first. A bound that only measures what survived the work is not a bound on the work.
  const raw = formData.getAll("marketIds");
  if (raw.length > PER_PAGE) {
    return { ok: false, error: `Too many markets in one batch (${raw.length}). Selection is limited to the ${PER_PAGE} on this page.` };
  }
  const ids = raw.map((v) => String(v).trim()).filter(Boolean);
  const unique = Array.from(new Set(ids));
  // ⭐ DG-S-05 — the address is the row list itself: there is one control per market and the
  // officer has ticked none of them, so "the place where the missing item is" is the first row.
  if (unique.length === 0) return fieldError("marketIds", "Select at least one market.");
  // ⛔ THE CAP IS THE PAGE, NOT A ROUND NUMBER. Selection is page-scoped and the page holds
  // `PER_PAGE` rows, so a payload larger than that did not come from this screen. Refusing
  // it is cheap; accepting it would let a hand-built request enumerate the whole queue.
  if (unique.length > PER_PAGE) {
    return { ok: false, error: `Too many markets in one batch (${unique.length}). Selection is limited to the ${PER_PAGE} on this page.` };
  }

  // Overrides arrive as `override:<marketId>` so a reason can never be attached to the
  // wrong row by ordering. ⛔ An override for a market that is not in the selection is a
  // tampered payload, not a typo — refuse the whole batch rather than silently dropping it.
  const overrides = new Map<string, string>();
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("override:")) continue;
    const id = k.slice("override:".length);
    const reason = String(v).trim();
    if (!reason) continue;
    if (!unique.includes(id)) {
      return { ok: false, error: "This batch names an override for a market that is not selected. Reload the queue and try again." };
    }
    overrides.set(id, reason.slice(0, 500));
  }

  // The override half is its own control and its own domain. Asked ONCE, before anything
  // is sealed — never per row, or a revocation mid-batch would leave half a batch
  // authorised. ⚠️ `softRequireStaff` writes the SECURITY audit row itself on refusal.
  if (overrides.size > 0) {
    const g2 = await softRequireStaff(
      OVERRIDE_DOMAIN,
      "bulkResolveOverride",
      "Forbidden: overriding the source-citation gate requires compliance access.",
    );
    if (!g2.ok) return { ok: false, error: g2.error };
    for (const [, reason] of overrides) {
      if (reason.length < MIN_REASON) {
        /* ⭐ DG-S-05 — ONE address, not one per market, and that is a fact about the CLIENT
           rather than a simplification: `bulk-resolve-bar.tsx` collects a single shared
           override reason (`#bulk-override-reason`) and sends the same string for every
           overridden row, so there is exactly one control to send the officer to. If this
           ever becomes a per-row box, the address has to become per-row with it. */
        return fieldError("overrideReason", `An override reason must be at least ${MIN_REASON} characters — it is read by a regulator, not by you.`);
      }
    }
  }

  const batchId = randomUUID();

  // ⭐ DECLARED OUTSIDE THE TRY, DELIBERATELY. If anything below throws, the loop may
  // already have SEALED markets — and the first draft returned a bare `{ ok:false, error }`
  // from the outer catch, telling the officer that nothing had happened over a batch that
  // really did resolve real money, with the run-boundary audit row never written either.
  const resolved: BulkResolveOutcome[] = [];
  const staged: BulkResolveOutcome[] = [];
  const skipped: BulkResolveOutcome[] = [];
  const alreadyApplied: BulkResolveOutcome[] = [];
  const failed: BulkResolveOutcome[] = [];
  let attempted = 0;

  try {
    const { getMarket, resolveMarket, resolvePublishCategory } = await import("@/lib/server/market-service");
    const { getEffectiveConfig, getEffectiveResolutionMode } = await import("@/lib/server/market-config");
    const { getRequireTwoOfficerResolution } = await import("@/lib/server/resolution-policy");
    const { sentinelSourceVerdict } = await import("@/lib/server/market-sentinel");
    const { listSources, sourceMatchesAny, listDisabledCategories } = await import("@/lib/server/source-registry");
    const { armMarket } = await import("@/lib/server/market-scheduler");

    // Read ONCE for the whole batch. `isSourceTrusted` re-reads the registry per call, so
    // asking it per market is a 20× store read for one answer that cannot change mid-batch.
    const [requireTwoOfficer, sources, disabledList] = await Promise.all([
      getRequireTwoOfficerResolution(),
      listSources({ enabledOnly: true }),
      listDisabledCategories(),
    ]);
    const disabledCategories = new Set(disabledList);

    for (const id of unique) {
      attempted++;
      const m = await getMarket(id);
      if (!m) {
        failed.push({ marketId: id, title: id, detail: "Market not found." });
        continue;
      }
      const title = m.titleEn;
      // ⛔ ONE PRODUCT LINE. `/admin/updown` owns rounds and voids them through its own
      // control; a payload naming one must not reach `resolveMarket`.
      if (m.productLine !== "MARKET") {
        failed.push({ marketId: id, title, detail: "Not a poll — Up & Down rounds resolve on their own surface." });
        continue;
      }

      // ⭐ THE VERDICT IS RE-DERIVED HERE, ON THE SERVER, FROM THE ROW AS IT IS NOW.
      // The badge the officer clicked was rendered from a snapshot; anything could have
      // moved since. The client's opinion of a row is never an input to this decision.
      const cfg = await getEffectiveConfig(id);
      const mode = await getEffectiveResolutionMode(m.resolutionMode);
      const sv = sentinelSourceVerdict(m.sentinelSourceUrl, m.sourceUrl);
      // ⛔ BOTH ARMS, exactly as `resolveDueMarket` computes it. A market with no approved
      // source is gated by the REGISTRY, not by its own (absent) source; checking only the
      // first arm would refuse a row the engine considers fully matched.
      // ⛔ …AND THE DISABLED-CATEGORY GATE THE ENGINE APPLIES FIRST. `resolveDueMarket`'s
      // second arm is `isSourceTrusted`, which refuses a disabled category before it looks
      // at any host; `sourceMatchesAny` deliberately does not (its docstring says the check
      // "stays in isSourceTrusted where it belongs"), so this caller owes it. Without it the
      // BULK PATH IS MORE PERMISSIVE THAN THE ENGINE — the queue shows a green eligible chip
      // and seals, in one press with no override and no compliance row, a market the
      // scheduled resolver refuses. A bulk convenience must never be a laxer gate.
      const sourceMatches =
        sv === "match" ||
        (sv === "no-approved-source" && !!m.sentinelSourceUrl &&
          !disabledCategories.has(resolvePublishCategory(m.category)) &&
          sourceMatchesAny(sources, m.sentinelSourceUrl, resolvePublishCategory(m.category)));

      const v = bulkVerdictFor({
        market: m, mode, threshold: cfg.resolveConfidenceThreshold,
        sourceMatches, requireTwoOfficer, officerId: g.userId,
      });

      /**
       * ⛔ `usedOverride` IS THE ONLY THING THE AUDIT MAY CALL AN OVERRIDE, AND IT IS NOT
       * "the officer typed something".
       *
       * The first draft audited on `overrides.get(id)` alone, outside every result branch.
       * That row asserts *"an officer sealed a market the platform's own floor REFUSED"* —
       * a statement about a real-money act — and it was written in four states where it was
       * simply untrue: the row was ELIGIBLE and no refusal happened; the seal FAILED; the
       * market had already been sealed by someone else; the outcome was rejected before
       * `resolveMarket` was ever called. A compliance log that records overrides that did
       * not happen is worse than one that records none: it is evidence against an officer
       * for something they did not do.
       *
       * So: an override is USED only when the verdict actually refused the row, the reason
       * was actually overridable, and the officer actually supplied one — and it is
       * RECORDED only after the seal returns ok.
       */
      const typed = overrides.get(id);
      const usedOverride = !v.eligible && !!typed && v.overridable
        && v.all.length > 0 && v.all.every((r) => OVERRIDABLE.has(r));
      if (!v.eligible && !usedOverride) {
        /**
         * ⭐ "ALREADY RESOLVED" IS NOT "SKIPPED", AND THE STRESS DRIVE FOUND THE DIFFERENCE.
         *
         * Replaying a sealed batch, the verdict correctly refuses every row with
         * `already-resolved` — before `resolveMarket` is ever reached, which is why the
         * `alreadyApplied` bucket (fed by the engine's own refusal) stayed EMPTY and the
         * officer was shown *"Skipped — refused and not overridden"* over markets that had
         * simply already been done. Nothing refused them; they were finished.
         *
         * The buckets have to mean what their headings say, so the verdict's own
         * already-resolved answer routes here. `alreadyApplied` now covers BOTH ways a
         * market can turn out to be done: the verdict saw it (the common case, a stale
         * page) and the engine saw it (the narrow race between the verdict and the seal).
         */
        if (v.reason === "already-resolved") {
          alreadyApplied.push({ marketId: id, title, detail: "Already resolved — nothing to do." });
        } else {
          skipped.push({ marketId: id, title, reason: v.reason ?? undefined, detail: detailFor(v.reason, v.citedHost, v.approvedHost, v.confidence, cfg.resolveConfidenceThreshold) });
        }
        continue;
      }

      // ⛔ VALIDATE THE OUTCOME. `resolveMarket` does NOT re-validate it — the `as Side`
      // cast is erased at build, and an invalid string marks the market RESOLVED with no
      // winners and locks every stake in it permanently. `app/markets/actions.ts` carries
      // the same guard for the same reason.
      const outcome = v.outcome;
      if (outcome !== "YES" && outcome !== "NO") {
        skipped.push({ marketId: id, title, reason: "outcome-unknown", detail: "No YES/NO outcome to seal — the AI never returned one." });
        continue;
      }

      /**
       * ⛔ NO `evidence` IS PASSED AT ALL, AND BOTH CANDIDATES ARE WRONG FOR THE SAME REASON.
       *
       * `resolutionEvidence` is denormalised onto the player's settlement-proof panel under
       * the heading **"Officer's recorded evidence"**, attributed to the officer this action
       * names. So:
       *   · the OVERRIDE REASON cannot go there — it is an officer's internal justification
       *     for waving a gate, and player surfaces never narrate ops; and
       *   · the SENTINEL'S EXCERPT cannot go there either, which is the subtler one. It is a
       *     true quote, but putting a model's words under a named officer's byline on a
       *     player-facing settlement proof is a false attribution — and this officer typed
       *     nothing. The auto path may write it because its actor IS `system_auto_resolver`;
       *     here the actor is a person.
       * The excerpt is not lost: it stays on the market row as `sentinelEvidence`, it is in
       * the audit payload below, and the panel shows its honest empty state rather than
       * words nobody wrote.
       */
      try {
        const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId });
        if (r.ok) {
          if (r.data?.stage === "stage1") {
            staged.push({ marketId: id, title, outcome, awaitingSecond: true });
          } else {
            resolved.push({ marketId: id, title, outcome, settlesAt: r.data?.settlesAt ?? null, overridden: usedOverride });
          }
          // ⭐ RECORDED ONLY WHEN THE SEAL ACTUALLY LANDED, AND ONLY WHEN THE FLOOR ACTUALLY
          // REFUSED. This row asserts a real-money act by a named officer; writing it for a
          // failed seal, an already-sealed market, or an eligible row that merely carried a
          // stray reason would put an override in the compliance log that never happened.
          if (usedOverride) {
            audit({
              category: "COMPLIANCE",
              action: "market.resolve.bulk_override",
              actorId: g.userId,
              targetType: "Market",
              targetId: id,
              payload: {
                batchId,
                reason: typed,
                blockedBy: v.reason,
                allBlockReasons: v.all,
                outcome,
                stage: r.data?.stage ?? null,
                confidence: m.sentinelConfidence ?? null,
                threshold: cfg.resolveConfidenceThreshold,
                citedSourceUrl: m.sentinelSourceUrl ?? null,
                approvedSourceUrl: m.sourceUrl,
                sentinelEvidence: m.sentinelEvidence ?? null,
                yesPool: m.yesPool, noPool: m.noPool, grossPool: m.yesPool + m.noPool,
                note: "An officer sealed a market the platform's own auto-resolve floor REFUSED, from the bulk bar, with a typed justification. The floor was not bypassed silently: the refusal, its reason and this justification are all recorded here against the officer's identity. No evidence was written to the player-facing settlement proof — the officer typed a justification, not a source quote.",
              },
            });
          }
          // The settle timer is armed by the caller — `resolveMarket` re-arms on its own
          // path, and this call is belt to that braces for a market whose timer was never
          // armed at all. Best-effort: a missed arm costs a delay to the 5-minute
          // reconciler, never a wrong payout.
          await armMarket(id).catch(() => {});
        } else if (r.code === "INVALID" && /already resolved/i.test(r.error)) {
          // Someone sealed it between render and submit — a second admin, a double-click,
          // or the scheduler. The market is in the state that was asked for.
          alreadyApplied.push({ marketId: id, title, detail: r.error });
        } else {
          failed.push({ marketId: id, title, detail: r.error });
        }
      } catch (err) {
        // ⛔ PER MARKET. One market that throws must not abandon the nineteen behind it —
        // and this catch is OUTSIDE `resolveMarket`, never inside its lock, where catching
        // would convert a rollback into a commit of the partial write it meant to discard.
        failed.push({ marketId: id, title, detail: safeError(err, "Resolve failed") });
      }

    }

    // ⭐ THE RUN BOUNDARY. One row per batch beside the per-market rows the engine already
    // writes, so a regulator can reconcile the summary against the individuals — and so an
    // append-only log has a boundary rather than a stream of adjudications with nothing
    // saying which of them were one officer's single click.
    audit({
      category: "COMPLIANCE",
      action: "market.resolve.bulk",
      actorId: g.userId,
      targetType: "Batch",
      targetId: batchId,
      payload: {
        batchId,
        requireTwoOfficer,
        attempted,
        selection: unique,
        overrides: Array.from(overrides.keys()),
        resolved: resolved.map((r) => r.marketId),
        staged: staged.map((r) => r.marketId),
        alreadyApplied: alreadyApplied.map((r) => r.marketId),
        skipped: skipped.map((r) => ({ marketId: r.marketId, reason: r.reason })),
        failed: failed.map((r) => ({ marketId: r.marketId, detail: r.detail })),
        note: "Bulk resolve from /admin/resolver-queue. Every market was sealed through resolveMarket — the same path, locks, ceremony, objection window and settle timer as the per-market control. No money moved in this action.",
      },
    });

    revalidatePath("/admin/resolver-queue");
    revalidatePath("/markets");
    revalidatePath("/positions");
    for (const r of [...resolved, ...staged]) revalidatePath(`/markets/${r.marketId}`);

    return { ok: true, batchId, attempted, resolved, staged, skipped, alreadyApplied, failed };
  } catch (err) {
    /**
     * ⛔ A BATCH THAT THREW IS NOT A BATCH THAT DID NOTHING — AND THIS RETURNS WHAT REALLY
     * HAPPENED RATHER THAN A BARE FAILURE.
     *
     * `resolveMarket` carries no try/catch of its own and propagates a `$transaction`
     * rejection, so one P2024/P2028 unwinds the loop. The first draft answered that with
     * `{ ok:false, error }` and no buckets, which told the officer nothing had applied over
     * a batch that had genuinely sealed markets — and the run-boundary audit row, written
     * after the loop inside this same try, was never written either. Both are corrected: the
     * boundary row is written HERE too, marked as an abort, and the buckets come back with
     * the throw recorded as a failure of its own.
     */
    const detail = safeError(err, "Bulk resolve failed");
    failed.push({ marketId: "(batch)", title: "The batch stopped early", detail });
    audit({
      category: "COMPLIANCE",
      action: "market.resolve.bulk",
      actorId: g.userId,
      targetType: "Batch",
      targetId: batchId,
      payload: {
        batchId, aborted: true, error: detail,
        attempted, selection: unique,
        resolved: resolved.map((r) => r.marketId),
        staged: staged.map((r) => r.marketId),
        alreadyApplied: alreadyApplied.map((r) => r.marketId),
        skipped: skipped.map((r) => ({ marketId: r.marketId, reason: r.reason })),
        note: "Bulk resolve from /admin/resolver-queue ABORTED part-way. Every market listed under `resolved` was sealed before the abort and its own market.adjudicated row stands; the markets after the abort were never attempted.",
      },
    });
    revalidatePath("/admin/resolver-queue");
    return { ok: true, batchId, attempted, resolved, staged, skipped, alreadyApplied, failed };
  }
}

/** The human sentence behind a block reason. ⛔ The WORDS live in the lexicon; this adds
 *  only the market-specific facts (which host, which number) that no dictionary can hold. */
function detailFor(
  reason: BulkBlockReason | null,
  citedHost: string | null,
  approvedHost: string | null,
  confidence: number | null,
  threshold: number,
): string | undefined {
  switch (reason) {
    case "source-different-domain":
      return `The AI read ${citedHost ?? "another site"}; this market's approved source is ${approvedHost ?? "unset"}.`;
    case "source-untrusted":
      return `This market names no approved source, and ${citedHost ?? "the cited host"} is not in the trusted-source registry for its category.`;
    case "below-threshold":
      return confidence == null ? undefined : `Confidence ${confidence}% is below the ${threshold}% floor.`;
    default:
      return undefined;
  }
}
