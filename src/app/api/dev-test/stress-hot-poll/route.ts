/**
 * /api/dev-test/stress-hot-poll — capacity probe for "100k clicks per poll".
 * Fires N concurrent castVote() calls at ONE proposal, measures wall-clock +
 * throughput, and asserts NO lost votes (final tally === distinct voters).
 * Reveals the O(N²) recompute cost (each vote re-scans all votes).
 * 404 in production.   POST { votes?: number }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { createProposal, castVote } from "@/lib/server/proposals-service";
import { getProposalsConfig, setProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { votes?: number };
  const N = Math.max(1, Math.min(200_000, body.votes ?? 5000));

  const saved = getProposalsConfig();
  // Clear prior proposals/votes so the O(n) scan reflects only this poll.
  const store = (globalThis as { __50PICK_STORE?: { proposals?: Map<string, unknown>; proposalVotes?: Map<string, unknown> } }).__50PICK_STORE;
  store?.proposals?.clear();
  store?.proposalVotes?.clear();

  try {
    setProposalsConfig({ enabled: true } as Partial<ProposalsConfig>, "stress");
    const proposer = `stress_${Date.now()}`;
    const r = await createProposal(proposer, {
      titleEn: "Hot poll capacity probe — will it scale?",
      resolutionCriterion: "Resolves from the official source on the resolution date.",
      category: "sports",
      resolutionDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: "could not create proposal", detail: r.error });
    const pid = r.proposal.id;

    // Fire N concurrent up-votes from N distinct synthetic voters.
    const t0 = Date.now();
    await Promise.all(Array.from({ length: N }, (_, i) => castVote(`v${i}`, pid, "up")));
    const elapsedMs = Date.now() - t0;

    const finalUp = db.proposal.findById(pid)?.up ?? -1;
    const opsPerSec = Math.round((N / elapsedMs) * 1000);
    return NextResponse.json({
      ok: finalUp === N,
      votes: N,
      finalUp,
      lostVotes: N - finalUp,
      elapsedMs,
      opsPerSec,
      msPerVote: +(elapsedMs / N).toFixed(3),
    });
  } finally {
    setProposalsConfig(saved, "stress");
    store?.proposals?.clear();
    store?.proposalVotes?.clear();
  }
}
