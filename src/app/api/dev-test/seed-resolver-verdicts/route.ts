/**
 * /api/dev-test/seed-resolver-verdicts — dev-only. Stamps AI-sentinel fields onto CLOSED
 * markets so the resolver queue can be driven through EVERY verdict class in a browser.
 *
 * ⛔ WHY THIS HAS TO EXIST. The sentinel fields are only ever written by a real AI call
 * (`market-service.ts` → `sentinelFields`), so on a machine with no model key every market
 * in the queue is blocked on `no-assessment` — a reason that carries NO outcome and is
 * therefore not overridable. A drive against that queue selects twenty rows, finds no
 * reason field, no sealable row and no confirmation dialog, and prints "ALL PASS" having
 * exercised none of them. That is the vacuous green this repo keeps catching, and the only
 * honest fix is a population that actually contains the states under test.
 *
 * ⛔ IT FABRICATES NOTHING A PLAYER SEES. Every field written here is an AI RECOMMENDATION
 * — the input to an officer's decision, not a resolution. No market is resolved, no money
 * moves, no `resolvedOutcome` is touched. Returns 404 in production. UNCOMMITTED dev tool.
 *
 *   POST { }  →  { ok, stamped: { overridable, belowThreshold, eligible, noOutcome } }
 */
import { NextResponse } from "next/server";
import { marketStore } from "@/lib/server/market-dal";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const all = await marketStore.values();
  const closed = all.filter((m) => (m.status === "CLOSED" || m.status === "LIVE") && !m.resolvedOutcome);
  if (closed.length === 0) {
    return NextResponse.json({ ok: false, error: "No CLOSED markets to stamp — seed and fast-forward first." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const stamped = { overridable: 0, belowThreshold: 0, eligible: 0, noOutcome: 0 };

  for (const [i, m] of closed.entries()) {
    const bucket = i % 4;

    /* 0 · OVERRIDABLE — a confident, determined read that cites the WRONG DOMAIN. This is
       the row the shared override field exists for, and the one class that must be present
       for the field to render at all. It HAS an outcome, so an override can seal it. */
    if (bucket === 0) {
      await marketStore.stamp(m.id, {
        sentinelOutcome: "YES",
        sentinelConfidence: 97,
        sentinelEvidence: "The match centre records the final score as 2-1 to the home side.",
        sentinelSourceUrl: "https://sports-mirror.example/match/1",
        sentinelReasoning: "Result reported consistently across coverage of the fixture.",
        sentinelDetermined: true,
        sentinelClosedAt: now,
        /* Mirrors what `resolveDueMarket` stamps alongside the assessment (market-service
           ~2245): the close and the AI read land together, and the claim is released. A
           LIVE market is row-state blocked and NEVER overridable, so without this the
           fixture cannot produce the state under test at all. */
        status: "CLOSED",
        resolveClaimedAt: null,
        updatedAt: now,
      });
      stamped.overridable++;
      continue;
    }

    /* 1 · BELOW THRESHOLD — cites the approved source, but is not confident enough.
       Also overridable, and also carries an outcome. */
    if (bucket === 1) {
      await marketStore.stamp(m.id, {
        sentinelOutcome: "NO",
        sentinelConfidence: 61,
        sentinelEvidence: "Coverage is inconsistent on whether the second goal stood.",
        sentinelSourceUrl: m.sourceUrl || "https://www.premierleague.com/match/1",
        sentinelReasoning: "Conflicting reports; confidence held low deliberately.",
        sentinelDetermined: true,
        sentinelClosedAt: now,
        /* Mirrors what `resolveDueMarket` stamps alongside the assessment (market-service
           ~2245): the close and the AI read land together, and the claim is released. A
           LIVE market is row-state blocked and NEVER overridable, so without this the
           fixture cannot produce the state under test at all. */
        status: "CLOSED",
        resolveClaimedAt: null,
        updatedAt: now,
      });
      stamped.belowThreshold++;
      continue;
    }

    /* 2 · ELIGIBLE — clears every clause of the floor. Needed as the CONTRAST: without a
       sealable row the drive cannot tell "the reason armed the batch" from "the button was
       armed all along". */
    if (bucket === 2) {
      await marketStore.stamp(m.id, {
        sentinelOutcome: "YES",
        sentinelConfidence: 98,
        sentinelEvidence: "The official match centre records the final score as 2-1.",
        sentinelSourceUrl: m.sourceUrl || null,
        sentinelReasoning: "Single unambiguous official result.",
        sentinelDetermined: true,
        sentinelClosedAt: now,
        /* Mirrors what `resolveDueMarket` stamps alongside the assessment (market-service
           ~2245): the close and the AI read land together, and the claim is released. A
           LIVE market is row-state blocked and NEVER overridable, so without this the
           fixture cannot produce the state under test at all. */
        status: "CLOSED",
        resolveClaimedAt: null,
        updatedAt: now,
      });
      stamped.eligible++;
      continue;
    }

    /* 3 · A READ WITH NO OUTCOME — determined false, nothing to seal. ⭐ THE ROW THIS
       SESSION'S BLOCKER WAS ABOUT: it must NOT be offered as overridable, must NOT be
       counted in "will seal", and must NOT have its pool added to the money on the
       confirmation, because the action skips it unconditionally. */
    await marketStore.stamp(m.id, {
      sentinelOutcome: null,
      sentinelConfidence: 44,
      sentinelEvidence: "The fixture appears to have been postponed; no result is published.",
      sentinelSourceUrl: m.sourceUrl || null,
      sentinelReasoning: "No determinable outcome at this time.",
      sentinelDetermined: false,
      sentinelClosedAt: now,
      status: "CLOSED",
      resolveClaimedAt: null,
      updatedAt: now,
    });
    stamped.noOutcome++;
  }

  return NextResponse.json({ ok: true, closed: closed.length, stamped });
}
