/**
 * /api/dev-test/proposals-stress — Sprint 1 load + invariant checks for the
 * proposals engine:
 *   - vote TALLY CONSISTENCY: denormalised up/down == counted individual votes
 *   - one vote per user (re-votes don't inflate)
 *   - concurrency: many voters on ONE proposal → no lost vote updates
 *   - rate limit holds at scale
 *   - no negative tallies
 *   - throughput within budget
 *
 * 404 in production. POST ?proposers=&voters=
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setProposalsConfig, getProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import { createProposal, castVote } from "@/lib/server/proposals-service";

async function mkUser() {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25574${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const PROPOSERS = Math.min(300, Math.max(1, Number(sp.get("proposers") ?? 80)));
  const VOTERS = Math.min(500, Math.max(1, Number(sp.get("voters") ?? 200)));
  const RATE = 3;

  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getProposalsConfig();
  const t0 = Date.now();
  let ops = 0;

  try {
    setProposalsConfig({ state: "ACTIVE", prizeTzs: 20_000, hotThreshold: 200, rateLimit: RATE } as Partial<ProposalsConfig>, "system_stress");

    // Build proposals (respect rate limit; verify it blocks the overflow).
    const proposalIds: string[] = [];
    let rateBlocks = 0;
    for (let i = 0; i < PROPOSERS; i++) {
      const proposer = await mkUser();
      for (let j = 0; j < RATE + 1; j++) {
        const r = await createProposal(proposer.id, { titleEn: `Stress proposal ${i}-${j} long enough`, resolutionCriterion: "Resolves from an official source at the date.", category: "sports", resolutionDate: futureDate(), sourceUrl: "https://www.bbc.com/sport" });
        ops++;
        if (r.ok) proposalIds.push(r.proposal.id);
        else rateBlocks++;
      }
    }
    ok("rate limit blocked every over-quota create", rateBlocks === PROPOSERS, `blocks=${rateBlocks} expected=${PROPOSERS}`);

    // Random voting across proposals.
    const voters = await Promise.all(Array.from({ length: VOTERS }, () => mkUser()));
    let vseed = 7;
    const rnd = () => (vseed = (vseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const v of voters) {
      for (let k = 0; k < 5; k++) {
        const pid = proposalIds[Math.floor(rnd() * proposalIds.length)];
        await castVote(v.id, pid, rnd() < 0.7 ? "up" : "down");
        ops++;
      }
    }

    // One voter spamming the same proposal in the same direction → one vote.
    const spammer = await mkUser();
    const target = proposalIds[0];
    const beforeUp = (await db.proposal.findById(target))!.up;
    for (let k = 0; k < 10; k++) { await castVote(spammer.id, target, "up"); ops++; }
    ok("repeated same-direction votes count once", (await db.proposal.findById(target))!.up === beforeUp + 1, `Δup=${(await db.proposal.findById(target))!.up - beforeUp}`);

    // TALLY CONSISTENCY across all proposals: denormalised up/down == counted votes.
    let mismatch = 0, negTallies = 0;
    for (const pid of proposalIds) {
      const p = (await db.proposal.findById(pid))!;
      const votes = await db.proposalVote.listByProposal(pid);
      const up = votes.filter((v) => v.dir === "up").length;
      const down = votes.filter((v) => v.dir === "down").length;
      if (p.up !== up || p.down !== down) mismatch++;
      if (p.up < 0 || p.down < 0) negTallies++;
    }
    ok("denormalised tallies match counted votes (all proposals)", mismatch === 0, `mismatches=${mismatch}`);
    ok("no negative tallies", negTallies === 0);

    // CONCURRENCY: many distinct voters upvote ONE fresh proposal at once.
    const cProposer = await mkUser();
    const cRes = await createProposal(cProposer.id, { titleEn: "Concurrency target proposal long enough", resolutionCriterion: "Resolves from an official source at the date.", category: "macro", resolutionDate: futureDate(), sourceUrl: "https://www.bbc.com/news" });
    const cPid = (cRes as { proposal: { id: string } }).proposal.id;
    const cVoters = await Promise.all(Array.from({ length: 150 }, () => mkUser()));
    await Promise.all(cVoters.map((v) => Promise.resolve().then(() => castVote(v.id, cPid, "up"))));
    ops += cVoters.length;
    ok("concurrent upvotes: no lost updates", (await db.proposal.findById(cPid))!.up === cVoters.length, `up=${(await db.proposal.findById(cPid))!.up} expected=${cVoters.length}`);

    const elapsedMs = Date.now() - t0;
    const opsPerSec = Math.round((ops / elapsedMs) * 1000);
    ok("throughput within budget (≥ 300 ops/sec)", opsPerSec >= 300, `${opsPerSec} ops/sec over ${ops} ops in ${elapsedMs}ms`);

    const passed = checks.filter((x) => x.pass).length;
    return NextResponse.json({ ok: passed === checks.length, scale: { proposers: PROPOSERS, voters: VOTERS, proposals: proposalIds.length, ops }, perf: { elapsedMs, opsPerSec }, summary: `${passed}/${checks.length} invariants held`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setProposalsConfig(saved, "system_stress");
  }
}
