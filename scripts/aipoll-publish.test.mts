/**
 * THE AI-POLL PUBLISH CHAIN — EXECUTED, and the false "failed" that was never real.
 *
 * ── WHAT WENT WRONG ─────────────────────────────────────────────────────────
 * `publishPollAction` runs an officer-approved poll through the candidate pipeline for
 * its audit trail. `scoreCandidate` sent anything below CONFIDENCE_PUBLISH_THRESHOLD
 * (75) to FILTERED_OUT; `approveCandidate` then returned **null** and its return value
 * was DISCARDED; `createMarket` ran anyway and put a LIVE, bettable market on the board;
 * `markPublished` refused because the candidate was not APPROVED — and the officer was
 * told the publish had FAILED.
 *
 * It fired three times on production before it was found:
 *   2026-08-11 05:05 · mkt_034555d0c988640474d8   (2 bettors)
 *   2026-08-14 08:25 · mkt_49303bbf4faec0e38524   (TZS 15,000 staked)
 *   2026-08-14 08:36 · mkt_02fe245420ecec12fc80   (0 bettors)
 * All three markets were LIVE. All three audit rows said `marketPublished: false`.
 *
 * ── WHAT THIS FILE ASSERTS, AND AT WHICH LAYER ──────────────────────────────
 * §1 THE PIPELINE, executed. The six state-machine functions, called in the order the
 *    publish path calls them, on a real candidate. Both directions: a human-approved
 *    sub-threshold candidate reaches PUBLISHED, and — the positive control — an
 *    UNATTENDED sub-threshold candidate is still FILTERED_OUT. The threshold was not
 *    deleted; it was scoped.
 * §2 THE PUBLISH CHAIN, executed end to end through `publishApprovedPoll` — the same
 *    function `publishPollAction` calls, with the same arguments. This is the check that
 *    would have caught the outage. A sub-threshold APPROVED poll must publish, must
 *    report ok, must leave a LIVE market, a PUBLISHED candidate and a PUBLISHED poll.
 * §3 NOTHING GOES LIVE OFF A BROKEN PIPELINE. Each pipeline step is shown to return null
 *    on a state mismatch (executed), and the publish path is shown to create the market
 *    only after every one of those returns has been checked (structural — `createMarket`
 *    is irreversible, so its position in the file is the property, and a position cannot
 *    be executed into existence).
 * §4 THE RECORD IS HONEST. A waived gate is written to the trace and to the audit log,
 *    so an officer reading the candidate months later sees the override rather than
 *    inferring it from a gap.
 *
 * ⚠️ Runs on the in-memory store (no DATABASE_URL needed) so it can sit in `test:all`.
 * RED harness: `node scripts/aipoll-publish-red.mjs`.
 *
 * Run: npm run test:aipoll-publish
 */
import {
  ingestCandidate,
  filterCandidate,
  attachVerification,
  scoreCandidate,
  approveCandidate,
  markPublished,
  getCandidate,
} from "../src/lib/server/market-candidate.ts";
import { aiPollStore, getAIPoll, type StoredAIPoll } from "../src/lib/server/ai-poll-generation.ts";
import { publishApprovedPoll } from "../src/lib/server/ai-poll-publish.ts";
import { getMarket, listMarkets } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "officer-aipub-test";
const RUN = `aipub-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
const SOURCE = "https://www.bot.go.tz";
const createdMarkets: string[] = [];
const createdPolls: string[] = [];

console.log(`DAL: ${process.env.DATABASE_URL ? "REAL POSTGRES" : "in-memory"}  run=${RUN}\n`);

function pollFixture(opts: { confidence: number; suffix: string }): StoredAIPoll {
  const id = `aip_${RUN.replace(/[^a-z0-9]/gi, "")}${opts.suffix}`;
  const now = new Date().toISOString();
  return {
    id,
    state: "APPROVED",
    requestCategory: "macro",
    requestPrompt: "test",
    generation: null,
    rawResponse: null,
    filterReasons: [],
    qualityIndicators: [],
    overallQuality: 70,
    titleEn: `Will the ${RUN}${opts.suffix} index close above its opening level?`,
    titleSw: `Je, kielelezo cha ${RUN}${opts.suffix} kitafunga juu ya kiwango cha ufunguzi?`,
    titleZh: "",
    category: "macro",
    resolutionCriterion:
      "Resolves YES if the Bank of Tanzania official daily mid-rate published on the resolution date is strictly above the rate published on the preceding business day.",
    resolutionCriterionSw: null,
    resolutionCriterionZh: null,
    resolutionAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    selectionClosedAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    options: [],
    sources: [{ url: SOURCE, publisher: "Bank of Tanzania" }],
    confidence: opts.confidence,
    reasoning: "test fixture",
    reviewedBy: OFFICER,
    reviewedAt: now,
    reviewNote: "approved by a human officer",
    rejectReasons: [],
    publishedMarketId: null,
    publishedCandidateId: null,
    tokensUsed: 0,
    costUsd: 0,
    latencyMs: 0,
    regenerationOf: null,
    regenerationCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * ⚠️ EVERY STEP IS SNAPSHOTTED AT THE MOMENT IT RETURNS. The in-memory DAL hands back
 * the SAME object the store holds, so a later step mutating it rewrites what an earlier
 * variable appears to say — the first draft of this file read `scored.state` as
 * "PUBLISHED" and failed a check that was actually passing. Against real Postgres the
 * same code would have read "PENDING_REVIEW", so the bug was invisible in one
 * environment and fatal in the other. Copy the scalars; never hold the reference.
 */
async function runPipeline(confidence: number, humanApproved: boolean) {
  const c = await ingestCandidate({
    category: "macro",
    proposedTitleEn: `pipeline ${RUN} ${confidence} ${humanApproved}`,
    resolutionCriterion: "Resolves YES if the published figure exceeds the prior figure.",
    resolutionAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    sources: [{ url: SOURCE, publisher: "BoT", retrievedAt: new Date().toISOString() }],
    actorId: OFFICER,
  });
  await filterCandidate(c.id, { passes: true });
  await attachVerification(c.id, { confirmingSources: [], tokensSpent: 0, costUsd: 0 });
  const scoredRef = await scoreCandidate(c.id, {
    confidence, tokensSpent: 0, costUsd: 0, rubric: { aiPollQuality: 70 },
    ...(humanApproved ? { humanApproved: true } : {}),
  });
  const scored = scoredRef && {
    state: scoredRef.state,
    confidence: scoredRef.confidence,
    rejectReason: scoredRef.rejectReason,
    trace: scoredRef.trace.map((t) => ({ layer: t.layer, outcome: t.outcome })),
  };
  const approvedRef = await approveCandidate(c.id, { officerId: OFFICER });
  const approved = approvedRef && { state: approvedRef.state };
  const publishedRef = approvedRef ? await markPublished(c.id, `mkt_probe_${c.id}`, OFFICER) : null;
  const published = publishedRef && { state: publishedRef.state };
  return { id: c.id, scored, approved, published };
}

// ── 1 · THE PIPELINE, in both directions ────────────────────────────────────
{
  // The defect case: confidence 52 — inside the band 106 real production candidates
  // scored in (52–72) — with a human officer already behind it.
  const human = await runPipeline(52, true);
  ok("1: a HUMAN-APPROVED candidate scoring 52 is not filtered out",
     human.scored?.state === "PENDING_REVIEW", `state=${human.scored?.state}`);
  ok("1: …so approveCandidate returns a candidate, not null",
     human.approved != null, human.approved ? `state=${human.approved.state}` : "null");
  ok("1: …and markPublished reaches PUBLISHED",
     human.published?.state === "PUBLISHED", `state=${human.published?.state ?? "null"}`);

  // ⭐ THE POSITIVE CONTROL. The threshold still governs the unattended pipeline. Without
  // this, "fix the false alarm" and "delete the confidence gate" pass identically.
  const auto = await runPipeline(52, false);
  ok("1: an UNATTENDED candidate scoring 52 is STILL filtered out",
     auto.scored?.state === "FILTERED_OUT", `state=${auto.scored?.state}`);
  ok("1: …and its low_confidence reason is recorded",
     auto.scored?.rejectReason === "low_confidence", `${auto.scored?.rejectReason}`);
  ok("1: …so approveCandidate refuses it",
     auto.approved == null, auto.approved ? `state=${auto.approved.state}` : "null");

  // And an above-threshold candidate is unaffected either way.
  const high = await runPipeline(88, false);
  ok("1: a candidate scoring 88 still passes with no human flag",
     high.scored?.state === "PENDING_REVIEW" && high.published?.state === "PUBLISHED",
     `scored=${high.scored?.state} published=${high.published?.state ?? "null"}`);
}

// ── 2 · THE PUBLISH CHAIN — the function the action calls, executed ─────────
{
  // 2a · THE OUTAGE, reproduced. Sub-threshold confidence, officer-approved poll.
  const low = pollFixture({ confidence: 52, suffix: "low" });
  await aiPollStore.set(low);
  createdPolls.push(low.id);

  const before = (await listMarkets()).length;
  const res = await publishApprovedPoll({ pollId: low.id, officerId: OFFICER, publishCategory: "macro" });

  ok("2a: publishing an officer-approved poll scoring 52 REPORTS SUCCESS",
     res.ok === true, res.ok ? "" : `error=${res.error}`);

  if (res.ok) createdMarkets.push(res.marketId);
  const market = res.ok ? await getMarket(res.marketId) : null;
  ok("2a: …the market it created is LIVE", market?.status === "LIVE", `status=${market?.status ?? "no market"}`);

  const cand = res.ok ? await getCandidate(res.candidateId) : null;
  ok("2a: …the candidate row says PUBLISHED, not FILTERED_OUT",
     cand?.state === "PUBLISHED", `state=${cand?.state ?? "null"}`);
  ok("2a: …and points at the market it became",
     cand?.publishedMarketId === (res.ok ? res.marketId : null), `${cand?.publishedMarketId}`);

  const pollBack = await getAIPoll(low.id);
  ok("2a: …the poll is PUBLISHED and linked to the same market",
     pollBack?.state === "PUBLISHED" && pollBack?.publishedMarketId === (res.ok ? res.marketId : null),
     `state=${pollBack?.state} market=${pollBack?.publishedMarketId}`);

  ok("2a: …exactly ONE market was created", (await listMarkets()).length === before + 1,
     `${(await listMarkets()).length - before}`);

  // 2b · POSITIVE CONTROL — the ordinary above-threshold publish still works, so a
  // green §2a cannot come from a publish path that simply says ok to everything.
  const high = pollFixture({ confidence: 88, suffix: "high" });
  await aiPollStore.set(high);
  createdPolls.push(high.id);
  const res2 = await publishApprovedPoll({ pollId: high.id, officerId: OFFICER, publishCategory: "macro" });
  ok("2b: an above-threshold poll publishes too", res2.ok === true, res2.ok ? "" : `error=${res2.error}`);
  if (res2.ok) createdMarkets.push(res2.marketId);

  // 2c · THE DOUBLE-PUBLISH REFUSAL still holds — the poll is now PUBLISHED, and a
  // second call must refuse WITHOUT creating a second live market.
  const beforeDouble = (await listMarkets()).length;
  const again = await publishApprovedPoll({ pollId: low.id, officerId: OFFICER, publishCategory: "macro" });
  ok("2c: republishing an already-published poll is refused",
     again.ok === false, again.ok ? "it published TWICE" : "");
  ok("2c: …and created no second market", (await listMarkets()).length === beforeDouble,
     `${(await listMarkets()).length - beforeDouble} extra`);

  // 2d · A poll that is not APPROVED is refused, and nothing goes live.
  const draft = pollFixture({ confidence: 90, suffix: "draft" });
  draft.state = "PENDING_REVIEW";
  await aiPollStore.set(draft);
  createdPolls.push(draft.id);
  const beforeDraft = (await listMarkets()).length;
  const refused = await publishApprovedPoll({ pollId: draft.id, officerId: OFFICER, publishCategory: "macro" });
  ok("2d: a poll that is not APPROVED is refused", refused.ok === false);
  ok("2d: …and no market was created", (await listMarkets()).length === beforeDraft,
     `${(await listMarkets()).length - beforeDraft} extra`);
}

// ── 3 · NOTHING GOES LIVE OFF A BROKEN PIPELINE ─────────────────────────────
{
  // 3a · EXECUTED: each step really does return null when its precondition is unmet.
  // This is what makes the `if (!step) return` checks meaningful rather than decorative.
  ok("3a: filterCandidate on a missing candidate returns null",
     (await filterCandidate("cand_does_not_exist", { passes: true })) === null);
  ok("3a: attachVerification on a missing candidate returns null",
     (await attachVerification("cand_does_not_exist", { confirmingSources: [], tokensSpent: 0, costUsd: 0 })) === null);
  ok("3a: scoreCandidate on a missing candidate returns null",
     (await scoreCandidate("cand_does_not_exist", { confidence: 90, tokensSpent: 0, costUsd: 0, rubric: {} })) === null);
  ok("3a: approveCandidate on a candidate in the wrong state returns null",
     (await approveCandidate((await runPipeline(52, false)).id, { officerId: OFFICER })) === null);

  // 3b · STRUCTURAL, and said so. `createMarket` is the irreversible act — a market can
  // only be voided with refunds, never un-created — so it must come AFTER every check.
  // That is an ordering property of the file; there is no state in which to observe it.
  const src = readFileSync(new URL("../src/lib/server/ai-poll-publish.ts", import.meta.url), "utf8");
  const createAt = src.indexOf("await createMarket(");
  ok("3b: the publish path calls createMarket", createAt > 0);
  const guarded = ["filtered", "verified", "scored", "approved"];
  for (const v of guarded) {
    const at = src.indexOf(`if (!${v}) return pipelineAbort(`);
    ok(`3b: the ${v} step is checked, and BEFORE createMarket`, at > 0 && at < createAt,
       at > 0 ? `at ${at} vs createMarket ${createAt}` : "no check found");
  }
  ok("3b: the officer-approved path passes humanApproved to scoreCandidate",
     /humanApproved:\s*true/.test(src));
}

// ── 4 · THE RECORD IS HONEST ────────────────────────────────────────────────
{
  const waived = await runPipeline(60, true);
  const layer4 = waived.scored?.trace.filter((t) => t.layer === 4) ?? [];
  ok("4: a waived gate is written into the candidate's own trace",
     layer4.some((t) => t.outcome.includes("human_approved")),
     layer4.map((t) => t.outcome).join(" | ") || "no layer-4 trace");
  ok("4: …and the confidence itself is still recorded, not hidden",
     waived.scored?.confidence === 60, `${waived.scored?.confidence}`);

  const notWaived = await runPipeline(90, true);
  ok("4: an above-threshold candidate is NOT labelled as a waiver",
     !(notWaived.scored?.trace.some((t) => t.layer === 4 && t.outcome.includes("human_approved"))),
     notWaived.scored?.trace.filter((t) => t.layer === 4).map((t) => t.outcome).join(" | "));
}

// ── 5 · cleanup, by id ──────────────────────────────────────────────────────
{
  for (const id of createdMarkets) await marketStore.delete(id);
  for (const id of createdPolls) await aiPollStore.delete(id);
  const leftM: string[] = [];
  for (const id of createdMarkets) if (await marketStore.get(id)) leftM.push(id);
  const leftP: string[] = [];
  for (const id of createdPolls) if (await getAIPoll(id)) leftP.push(id);
  ok("5: every market this run created was removed", leftM.length === 0, `${leftM.length} left`);
  ok("5: every poll this run created was removed", leftP.length === 0, `${leftP.length} left`);
}

console.log(`\naipoll-publish: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
