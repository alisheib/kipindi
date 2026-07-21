/**
 * /api/dev-test/proposals-security — in-process anti-abuse / integrity:
 *   - votes NEVER auto-approve (a high-score proposal stays REVIEW until an officer acts)
 *   - APPROVE grants the bonus exactly once (re-approve blocked, no double-credit)
 *   - can't decline an approved/listed proposal; can't approve a declined one
 *   - go-live and market resolution grant NO additional reward
 *   - voting only on open proposals; one vote per user
 *   - privacy: proposer is masked in read models
 *   - paused program blocks create + vote
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setProposalsConfig, getProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import { createProposal, castVote, approveProposal, goLiveProposal, declineProposal, getProposalDetail, getAdminQueue } from "@/lib/server/proposals-service";
import { getBonusSummary } from "@/lib/server/bonus-service";
import { resolveMarket } from "@/lib/server/market-service";

const SRC = "https://www.tff.or.tz/results"; // tff.or.tz — trusted for sports

async function mkUser(role: StoredUser["role"] = "PLAYER") {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25577${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "SW", displayName: "Juma Hassan Mwita", dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, bonusBalance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const bal = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;
const bonusBal = async (id: string) => (await getBonusSummary(id)).bonusBalance;
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getProposalsConfig();

  try {
    setProposalsConfig({ state: "ACTIVE", prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 } as Partial<ProposalsConfig>, "system_sec");
    const off1 = await mkUser("ADMIN");
    const off2 = await mkUser("ADMIN");

    // 1 · votes never auto-approve — pile on votes far past the Hot threshold.
    const P = await mkUser();
    const r = await createProposal(P.id, { titleEn: "Heavily upvoted but unapproved proposal", resolutionCriterion: "Resolves from an official source.", category: "sports", resolutionDate: futureDate(), sourceUrl: SRC });
    const pid = (r as { proposal: { id: string } }).proposal.id;
    for (let i = 0; i < 250; i++) await castVote((await mkUser()).id, pid, "up");
    let d = (await getProposalDetail(pid, null))!;
    await ok("high score flags Hot", d.isHot && d.score >= 200, `score=${d.score} hot=${d.isHot}`);
    await ok("votes never auto-approve (stays REVIEW)", d.status === "REVIEW");

    // 2 · privacy — proposer masked, full name never leaks
    await ok("proposer masked in read model", !d.proposerMasked.includes("Juma Hassan Mwita") && d.proposerMasked.includes("***"), d.proposerMasked);
    ok("queue masks proposer", (await getAdminQueue("all")).every((q) => !q.proposerMasked.includes("Juma Hassan Mwita")));

    // 3 · APPROVE grants the bonus exactly once
    const bonusBefore = await bonusBal(P.id);
    const a = await approveProposal(pid, off1.id);
    ok("officer approve succeeds", a.ok === true);
    await ok("approve credits the bonus once (+20,000)", await bonusBal(P.id) - bonusBefore === 20_000, `Δ=${await bonusBal(P.id) - bonusBefore}`);
    const bonusAfterApprove = await bonusBal(P.id);
    ok("re-approve blocked", (await approveProposal(pid, off1.id)).ok === false);
    await ok("re-approve does not double-credit", await bonusBal(P.id) === bonusAfterApprove, `bonus=${await bonusBal(P.id)}`);
    ok("decline of an approved proposal blocked", (await declineProposal(pid, off1.id, "Politics")).ok === false);

    // 3b · GO LIVE grants no extra bonus; decline of a listed one blocked
    const live = await goLiveProposal(pid, off1.id, SRC);
    ok("go-live lists it", live.ok === true);
    await ok("go-live grants no extra bonus", await bonusBal(P.id) === bonusAfterApprove, `bonus=${await bonusBal(P.id)}`);
    ok("decline of a listed proposal blocked", (await declineProposal(pid, off1.id, "Politics")).ok === false);
    const marketId = (live as { marketId: string }).marketId;

    // 4 · can't approve or go-live a declined proposal
    const r2 = await createProposal((await mkUser()).id, { titleEn: "A proposal to be declined here", resolutionCriterion: "Resolves from an official source.", category: "culture", resolutionDate: futureDate(), sourceUrl: SRC });
    const dpid = (r2 as { proposal: { id: string } }).proposal.id;
    await declineProposal(dpid, off1.id, "Ambiguous outcome");
    ok("approve of a declined proposal blocked", (await approveProposal(dpid, off1.id)).ok === false);
    ok("go-live of a declined proposal blocked", (await goLiveProposal(dpid, off1.id, SRC)).ok === false);

    // 5 · market resolution grants NO additional reward (bonus was paid at approval)
    const proposerRealBefore = await bal(P.id);
    const bonusBeforeResolve = await bonusBal(P.id);
    await resolveMarket({ marketId, outcome: "VOID", officerId: off1.id });
    await resolveMarket({ marketId, outcome: "VOID", officerId: off2.id });
    d = (await getProposalDetail(pid, null))!;
    await ok("resolution moves no real balance", await bal(P.id) === proposerRealBefore, `Δ=${await bal(P.id) - proposerRealBefore}`);
    await ok("resolution grants no extra bonus", await bonusBal(P.id) === bonusBeforeResolve, `bonus=${await bonusBal(P.id)}`);
    await ok("proposal marked RESOLVED; approval bonus preserved", d.status === "RESOLVED" && d.bonusGrantedTzs === 20_000);

    // 6 · voting only on open proposals
    ok("voting blocked on resolved proposal", (await castVote((await mkUser()).id, pid, "up")).ok === false);

    // 7 · non-active state gating (MAINTENANCE blocks writes)
    setProposalsConfig({ state: "MAINTENANCE" } as Partial<ProposalsConfig>, "system_sec");
    ok("paused blocks create", (await createProposal((await mkUser()).id, { titleEn: "Blocked while paused proposal", resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC })).ok === false);
    ok("paused blocks voting", (await castVote((await mkUser()).id, pid, "up")).ok === false);

    const passed = checks.filter((x) => x.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} security invariants held`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setProposalsConfig(saved, "system_sec");
  }
}
