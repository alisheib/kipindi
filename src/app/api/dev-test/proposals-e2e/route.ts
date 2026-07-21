/**
 * /api/dev-test/proposals-e2e — in-process end-to-end test of the player
 * market-proposals engine against the real store + services: create (source URL
 * required), vote tallies + toggling, rate limit, officer APPROVE → instant
 * bonus grant (exactly-once), separate GO-LIVE → real market, request-changes,
 * decline (reason required), market resolution → status reflection only (no
 * second payout), and the read models.
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setProposalsConfig, getProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import {
  createProposal, castVote, approveProposal, goLiveProposal, requestChanges, declineProposal,
  getProposalDetail, listBoard, getAdminQueue, getAdminProposalStats, timelineStep,
} from "@/lib/server/proposals-service";
import { getBonusSummary } from "@/lib/server/bonus-service";
import { resolveMarket } from "@/lib/server/market-service";

const OFFICER_ROLE = "ADMIN" as const;
const SRC = "https://www.tff.or.tz/results"; // tff.or.tz — trusted for sports

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
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, bonusBalance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const bonusBal = async (id: string) => (await getBonusSummary(id)).bonusBalance;
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getProposalsConfig();

  try {
    setProposalsConfig({ state: "ACTIVE", prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 } as Partial<ProposalsConfig>, "system_test");

    const P = await mkUser();
    const officer1 = await mkUser(OFFICER_ROLE);
    const officer2 = await mkUser(OFFICER_ROLE);

    // 1 · create (source URL required)
    const c = await createProposal(P.id, { titleEn: "Will Simba SC win the league this season?", resolutionCriterion: "Resolves from the official TPL final standings.", category: "sports", resolutionDate: futureDate(), sourceUrl: SRC });
    ok("create proposal succeeds", c.ok === true);
    if (!c.ok) throw new Error("create failed: " + c.error);
    const pid = c.proposal.id;
    ok("new proposal starts in REVIEW", c.proposal.status === "REVIEW");
    ok("source URL persisted", c.proposal.sourceUrl === SRC);

    // 2 · validation
    ok("rejects short title", (await createProposal(P.id, { titleEn: "short", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate(), sourceUrl: SRC })).ok === false);
    ok("rejects past date", (await createProposal(P.id, { titleEn: "A valid long title here", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: "2020-01-01", sourceUrl: SRC })).ok === false);
    ok("rejects missing source URL", (await createProposal(P.id, { titleEn: "A valid long title here", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate(), sourceUrl: "" })).ok === false);
    ok("rejects non-http source URL", (await createProposal(P.id, { titleEn: "A valid long title here", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate(), sourceUrl: "ftp://nope" })).ok === false);

    // 3 · votes + tally
    const voters = await Promise.all(Array.from({ length: 6 }, () => mkUser()));
    for (const v of voters) await castVote(v.id, pid, "up");
    let d = (await getProposalDetail(pid, null))!;
    await ok("6 upvotes tally to up=6 score=6", d.up === 6 && d.score === 6, `up=${d.up} score=${d.score}`);
    await castVote(voters[0].id, pid, null);
    await castVote(voters[1].id, pid, "down");
    d = (await getProposalDetail(pid, null))!;
    await ok("toggle up→null and up→down updates tally", d.up === 4 && d.down === 1 && d.score === 3, `up=${d.up} down=${d.down} score=${d.score}`);
    await castVote(voters[2].id, pid, "up");
    await castVote(voters[2].id, pid, "up");
    d = (await getProposalDetail(pid, null))!;
    await ok("repeat same-direction vote stays one vote", d.up === 4, `up=${d.up}`);
    ok("viewer myVote reflected", (await getProposalDetail(pid, voters[1].id))!.myVote === "down");

    // 4 · rate limit (limit 3 open; P already has 1)
    await createProposal(P.id, { titleEn: "Second valid proposal title", resolutionCriterion: "long enough criterion here", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC });
    await createProposal(P.id, { titleEn: "Third valid proposal title", resolutionCriterion: "long enough criterion here", category: "crypto", resolutionDate: futureDate(), sourceUrl: SRC });
    const fourth = await createProposal(P.id, { titleEn: "Fourth valid proposal title", resolutionCriterion: "long enough criterion here", category: "weather", resolutionDate: futureDate(), sourceUrl: SRC });
    ok("rate limit blocks the 4th open proposal", fourth.ok === false && (fourth as { code: string }).code === "RATE_LIMITED");

    // 5 · officer APPROVE → instant bonus grant (exactly-once), NOT yet live
    const bonusBefore = await bonusBal(P.id);
    const appr = await approveProposal(pid, officer1.id);
    ok("approve succeeds", appr.ok === true);
    ok("approve grants the reward", appr.ok === true && appr.grantedTzs === 20_000);
    d = (await getProposalDetail(pid, null))!;
    await ok("proposal now APPROVED (not live)", d.status === "APPROVED" && d.publishedMarketId === null);
    await ok("bonus credited to proposer's bonus wallet (+20,000)", await bonusBal(P.id) - bonusBefore === 20_000, `Δ=${await bonusBal(P.id) - bonusBefore}`);
    await ok("bonusGrantedTzs recorded on proposal", d.bonusGrantedTzs === 20_000);
    ok("timeline at Approved step (2)", await timelineStep(d) === 2);

    // 5b · re-approve is blocked → bonus NOT double-granted (exactly-once)
    const bonusAfterFirst = await bonusBal(P.id);
    const reAppr = await approveProposal(pid, officer1.id);
    ok("re-approve blocked", reAppr.ok === false);
    await ok("bonus not double-granted on re-approve", await bonusBal(P.id) === bonusAfterFirst, `bonus=${await bonusBal(P.id)}`);

    // 6 · voting closed once past review
    ok("voting blocked on an approved proposal", (await castVote((await mkUser()).id, pid, "up")).ok === false);

    // 7 · GO LIVE → real market (separate step, no second bonus)
    const bonusBeforeLive = await bonusBal(P.id);
    const live = await goLiveProposal(pid, officer1.id, SRC);
    ok("go-live creates a market", live.ok === true && !!(live as { marketId: string }).marketId);
    const marketId = (live as { marketId: string }).marketId;
    d = (await getProposalDetail(pid, null))!;
    await ok("proposal now LISTED with publishedMarketId", d.status === "LISTED" && d.publishedMarketId === marketId);
    await ok("go-live grants NO extra bonus", await bonusBal(P.id) === bonusBeforeLive, `bonus=${await bonusBal(P.id)}`);
    ok("timeline at Live step (3)", await timelineStep(d) === 3);
    ok("second go-live blocked", (await goLiveProposal(pid, officer1.id, SRC)).ok === false);

    // 8 · decline requires a valid reason (and pays no bonus)
    const dpUser = await mkUser();
    const p2 = await createProposal(dpUser.id, { titleEn: "A political proposal to decline", resolutionCriterion: "long enough criterion here", category: "culture", resolutionDate: futureDate(), sourceUrl: SRC });
    const p2id = (p2 as { proposal: { id: string } }).proposal.id;
    const declBad = await declineProposal(p2id, officer1.id, "Not a reason" as never);
    await ok("decline rejects an invalid reason", declBad.ok === false);
    const declOk = await declineProposal(p2id, officer1.id, "Politics", "Outside scope");
    await ok("decline with valid reason succeeds", declOk.ok === true);
    await ok("declined proposal carries reason", (await getProposalDetail(p2id, null))!.declineReason === "Politics");
    await ok("declined proposal paid no bonus", await bonusBal(dpUser.id) === 0, `bonus=${await bonusBal(dpUser.id)}`);

    // 9 · request changes
    const p3 = await createProposal((await mkUser()).id, { titleEn: "A proposal needing changes", resolutionCriterion: "long enough criterion here", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC });
    const p3id = (p3 as { proposal: { id: string } }).proposal.id;
    const rc = await requestChanges(p3id, officer1.id, "Please tighten the criterion.");
    await ok("request changes succeeds", rc.ok === true && (await getProposalDetail(p3id, null))!.status === "CHANGES_REQUESTED");

    // 10 · resolve the live market (two officers) → status reflection only, no money
    const bonusBeforeResolve = await bonusBal(P.id);
    const r1 = await resolveMarket({ marketId, outcome: "YES", officerId: officer1.id });
    ok("resolution stage 1 ok", r1.ok === true);
    const r2 = await resolveMarket({ marketId, outcome: "YES", officerId: officer2.id });
    ok("resolution stage 2 completes", r2.ok === true);
    d = (await getProposalDetail(pid, null))!;
    await ok("proposal RESOLVED after market settles", d.status === "RESOLVED");
    await ok("resolution pays NO additional bonus", await bonusBal(P.id) === bonusBeforeResolve, `Δ=${await bonusBal(P.id) - bonusBeforeResolve}`);
    ok("timeline at Resolved step (4)", await timelineStep(d) === 4);

    // 11 · read models
    const board = await listBoard(P.id, "mine");
    await ok("board 'mine' filter returns the proposer's proposals", board.proposals.length >= 1 && board.proposals.every((v) => v.isMine));
    const listed = await listBoard(null, "listed");
    await ok("board 'listed' filter includes the resolved market", listed.proposals.some((v) => v.id === pid));
    const queue = await getAdminQueue("all");
    ok("admin queue sorted by score desc", queue.length >= 1 && queue.every((r, i) => i === 0 || queue[i - 1].score >= r.score));
    const stats = await getAdminProposalStats();
    await ok("admin stats: listed-from-proposals ≥ 1", stats.listedFromProposals >= 1, `listed=${stats.listedFromProposals}`);
    await ok("admin stats: bonuses granted ≥ 20,000", stats.bonusesGrantedTzs >= 20_000, `granted=${stats.bonusesGrantedTzs}`);

    // 12 · non-active state gating (MAINTENANCE blocks writes)
    setProposalsConfig({ state: "MAINTENANCE" } as Partial<ProposalsConfig>, "system_test");
    ok("paused: create blocked", (await createProposal((await mkUser()).id, { titleEn: "Should be blocked while paused", resolutionCriterion: "long enough criterion here", category: "sports", resolutionDate: futureDate(), sourceUrl: SRC })).ok === false);
    ok("paused: voting blocked", (await castVote((await mkUser()).id, p3id, "up")).ok === false);

    const passed = checks.filter((x) => x.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} checks passed`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setProposalsConfig(saved, "system_test");
  }
}
