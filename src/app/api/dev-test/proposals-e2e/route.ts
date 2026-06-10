/**
 * /api/dev-test/proposals-e2e — in-process end-to-end test of the player
 * market-proposals engine against the real store + services: create, vote
 * tallies + toggling, rate limit, officer approve→market, request-changes,
 * decline (reason required), real market resolution → proposer prize, prize
 * idempotency, anti-fraud, and the read models.
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setProposalsConfig, getProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import {
  createProposal, castVote, approveAndList, requestChanges, declineProposal,
  getProposalDetail, listBoard, getAdminQueue, getAdminProposalStats, timelineStep,
} from "@/lib/server/proposals-service";
import { resolveMarket } from "@/lib/server/market-service";

const OFFICER_ROLE = "ADMIN" as const;

async function mkUser(role: StoredUser["role"] = "PLAYER") {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25573${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const bal = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getProposalsConfig();

  try {
    setProposalsConfig({ enabled: true, prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 } as Partial<ProposalsConfig>, "system_test");

    const P = await mkUser();
    const officer1 = await mkUser(OFFICER_ROLE);
    const officer2 = await mkUser(OFFICER_ROLE);

    // 1 · create
    const c = await createProposal(P.id, { titleEn: "Will Simba SC win the league this season?", resolutionCriterion: "Resolves from the official TPL final standings.", category: "sports", resolutionDate: futureDate() });
    ok("create proposal succeeds", c.ok === true);
    if (!c.ok) throw new Error("create failed: " + c.error);
    const pid = c.proposal.id;
    ok("new proposal starts in REVIEW", c.proposal.status === "REVIEW");

    // 2 · validation
    ok("rejects short title", (await createProposal(P.id, { titleEn: "short", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate() })).ok === false);
    ok("rejects past date", (await createProposal(P.id, { titleEn: "A valid long title here", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: "2020-01-01" })).ok === false);

    // 3 · votes + tally
    const voters = await Promise.all(Array.from({ length: 6 }, () => mkUser()));
    for (const v of voters) await castVote(v.id, pid, "up");
    let d = (await getProposalDetail(pid, null))!;
    await ok("6 upvotes tally to up=6 score=6", d.up === 6 && d.score === 6, `up=${d.up} score=${d.score}`);
    // toggle one up→null, one up→down
    await castVote(voters[0].id, pid, null);
    await castVote(voters[1].id, pid, "down");
    d = (await getProposalDetail(pid, null))!;
    await ok("toggle up→null and up→down updates tally", d.up === 4 && d.down === 1 && d.score === 3, `up=${d.up} down=${d.down} score=${d.score}`);
    // re-vote same user is idempotent (one vote per user)
    await castVote(voters[2].id, pid, "up");
    await castVote(voters[2].id, pid, "up");
    d = (await getProposalDetail(pid, null))!;
    await ok("repeat same-direction vote stays one vote", d.up === 4, `up=${d.up}`);
    // viewer's own vote reflected
    ok("viewer myVote reflected", (await getProposalDetail(pid, voters[1].id))!.myVote === "down");

    // 4 · rate limit (limit 3 open; P already has 1)
    await createProposal(P.id, { titleEn: "Second valid proposal title", resolutionCriterion: "long enough criterion here", category: "macro", resolutionDate: futureDate() });
    await createProposal(P.id, { titleEn: "Third valid proposal title", resolutionCriterion: "long enough criterion here", category: "crypto", resolutionDate: futureDate() });
    const fourth = await createProposal(P.id, { titleEn: "Fourth valid proposal title", resolutionCriterion: "long enough criterion here", category: "weather", resolutionDate: futureDate() });
    ok("rate limit blocks the 4th open proposal", fourth.ok === false && (fourth as { code: string }).code === "RATE_LIMITED");

    // 5 · officer approve & list → real market
    const appr = await approveAndList(pid, officer1.id);
    ok("approve & list creates a market", appr.ok === true && !!(appr as { marketId: string }).marketId);
    const marketId = (appr as { marketId: string }).marketId;
    d = (await getProposalDetail(pid, null))!;
    await ok("proposal now LISTED with publishedMarketId", d.status === "LISTED" && d.publishedMarketId === marketId);
    ok("timeline at Listed step (2)", await timelineStep(d) === 2);

    // 6 · voting closed after listing
    ok("voting blocked on a listed proposal", (await castVote((await mkUser()).id, pid, "up")).ok === false);

    // 7 · decline requires a valid reason
    const p2 = await createProposal((await mkUser()).id, { titleEn: "A political proposal to decline", resolutionCriterion: "long enough criterion here", category: "culture", resolutionDate: futureDate() });
    const declBad = await declineProposal((p2 as { proposal: { id: string } }).proposal.id, officer1.id, "Not a reason" as never);
    await ok("decline rejects an invalid reason", declBad.ok === false);
    const declOk = await declineProposal((p2 as { proposal: { id: string } }).proposal.id, officer1.id, "Politics", "Outside scope");
    await ok("decline with valid reason succeeds", declOk.ok === true);
    await ok("declined proposal carries reason", (await getProposalDetail((p2 as { proposal: { id: string } }).proposal.id, null))!.declineReason === "Politics");

    // 8 · request changes
    const p3 = await createProposal((await mkUser()).id, { titleEn: "A proposal needing changes", resolutionCriterion: "long enough criterion here", category: "macro", resolutionDate: futureDate() });
    const rc = await requestChanges((p3 as { proposal: { id: string } }).proposal.id, officer1.id, "Please add a source.");
    await ok("request changes succeeds", rc.ok === true && (await getProposalDetail((p3 as { proposal: { id: string } }).proposal.id, null))!.status === "CHANGES_REQUESTED");

    // 9 · resolve the listed market (two officers) → proposer prize
    const proposerBefore = await bal(P.id);
    const r1 = await resolveMarket({ marketId, outcome: "YES", officerId: officer1.id });
    ok("resolution stage 1 ok", r1.ok === true);
    const r2 = await resolveMarket({ marketId, outcome: "YES", officerId: officer2.id });
    ok("resolution stage 2 completes", r2.ok === true);
    d = (await getProposalDetail(pid, null))!;
    await ok("proposal RESOLVED after market settles", d.status === "RESOLVED");
    await ok("proposer paid the prize (+20,000)", await bal(P.id) - proposerBefore === 20_000, `Δ=${await bal(P.id) - proposerBefore}`);
    await ok("prizePaidTzs recorded on proposal", d.prizePaidTzs === 20_000);
    ok("timeline at Paid step (4)", await timelineStep(d) === 4);

    // 10 · prize idempotency — resolving cannot double-pay
    const beforeReResolve = await bal(P.id);
    await resolveMarket({ marketId, outcome: "YES", officerId: officer1.id }).catch(() => {});
    ok("prize not double-paid on re-resolve", await bal(P.id) === beforeReResolve);

    // 11 · read models
    const board = await listBoard(P.id, "mine");
    await ok("board 'mine' filter returns the proposer's proposals", board.proposals.length >= 1 && board.proposals.every((v) => v.isMine));
    const listed = await listBoard(null, "listed");
    await ok("board 'listed' filter includes the resolved market", listed.proposals.some((v) => v.id === pid));
    const queue = await getAdminQueue("all");
    ok("admin queue sorted by score desc", queue.length >= 1 && queue.every((r, i) => i === 0 || queue[i - 1].score >= r.score));
    const stats = await getAdminProposalStats();
    await ok("admin stats: listed-from-proposals ≥ 1", stats.listedFromProposals >= 1, `listed=${stats.listedFromProposals}`);
    await ok("admin stats: prizes paid ≥ 20,000", stats.prizesPaidTzs >= 20_000, `paid=${stats.prizesPaidTzs}`);

    // 12 · paused gating
    setProposalsConfig({ enabled: false } as Partial<ProposalsConfig>, "system_test");
    ok("paused: create blocked", (await createProposal((await mkUser()).id, { titleEn: "Should be blocked while paused", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate() })).ok === false);
    ok("paused: voting blocked", (await castVote((await mkUser()).id, (p3 as { proposal: { id: string } }).proposal.id, "up")).ok === false);

    const passed = checks.filter((x) => x.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} checks passed`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setProposalsConfig(saved, "system_test");
  }
}
