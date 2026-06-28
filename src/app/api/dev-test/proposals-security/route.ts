/**
 * /api/dev-test/proposals-security — Sprint 4 in-process anti-abuse / integrity:
 *   - votes NEVER auto-approve (a high-score proposal stays REVIEW until an officer acts)
 *   - VOID resolution pays NO prize (and still marks resolved)
 *   - prize is idempotent; can't approve a declined proposal; can't decline a listed one
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
import { createProposal, castVote, approveAndList, declineProposal, getProposalDetail, getAdminQueue } from "@/lib/server/proposals-service";
import { resolveMarket } from "@/lib/server/market-service";

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
    setProposalsConfig({ enabled: true, prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 } as Partial<ProposalsConfig>, "system_sec");
    const off1 = await mkUser("ADMIN");
    const off2 = await mkUser("ADMIN");

    // 1 · votes never auto-approve — pile on votes far past the Hot threshold.
    const P = await mkUser();
    const r = await createProposal(P.id, { titleEn: "Heavily upvoted but unapproved proposal", resolutionCriterion: "Resolves from an official source.", category: "sports", resolutionDate: futureDate() });
    const pid = (r as { proposal: { id: string } }).proposal.id;
    for (let i = 0; i < 250; i++) await castVote((await mkUser()).id, pid, "up");
    let d = (await getProposalDetail(pid, null))!;
    await ok("high score flags Hot", d.isHot && d.score >= 200, `score=${d.score} hot=${d.isHot}`);
    await ok("votes never auto-approve (stays REVIEW)", d.status === "REVIEW");

    // 2 · privacy — proposer masked, full name never leaks
    await ok("proposer masked in read model", !d.proposerMasked.includes("Juma Hassan Mwita") && d.proposerMasked.includes("***"), d.proposerMasked);
    ok("queue masks proposer", (await getAdminQueue("all")).every((q) => !q.proposerMasked.includes("Juma Hassan Mwita")));

    // 3 · officer approves → LISTED; can't re-approve / can't decline a listed one
    const a = await approveAndList(pid, off1.id, "https://www.bbc.com/test-source");
    ok("officer approve lists it", a.ok === true);
    ok("re-approve blocked", (await approveAndList(pid, off1.id, "https://www.bbc.com/test-source")).ok === false);
    ok("decline of a listed proposal blocked", (await declineProposal(pid, off1.id, "Politics")).ok === false);
    const marketId = (a as { marketId: string }).marketId;

    // 4 · can't approve a declined proposal
    const r2 = await createProposal((await mkUser()).id, { titleEn: "A proposal to be declined here", resolutionCriterion: "Resolves from an official source.", category: "culture", resolutionDate: futureDate() });
    const dpid = (r2 as { proposal: { id: string } }).proposal.id;
    await declineProposal(dpid, off1.id, "Ambiguous outcome");
    ok("approve of a declined proposal blocked", (await approveAndList(dpid, off1.id, "https://www.bbc.com/test-source")).ok === false);

    // 5 · VOID resolution pays NO prize but marks resolved
    const proposerBefore = await bal(P.id);
    await resolveMarket({ marketId, outcome: "VOID", officerId: off1.id });
    await resolveMarket({ marketId, outcome: "VOID", officerId: off2.id });
    d = (await getProposalDetail(pid, null))!;
    await ok("VOID resolution pays no prize", await bal(P.id) === proposerBefore, `Δ=${await bal(P.id) - proposerBefore}`);
    await ok("VOID still marks proposal resolved", d.status === "RESOLVED" && d.prizePaidTzs === 0);

    // 6 · voting only on open proposals
    ok("voting blocked on resolved proposal", (await castVote((await mkUser()).id, pid, "up")).ok === false);

    // 7 · paused gating
    setProposalsConfig({ enabled: false } as Partial<ProposalsConfig>, "system_sec");
    ok("paused blocks create", (await createProposal((await mkUser()).id, { titleEn: "Blocked while paused proposal", resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate() })).ok === false);
    const r3id = pid; // any
    ok("paused blocks voting", (await castVote((await mkUser()).id, r3id, "up")).ok === false);

    const passed = checks.filter((x) => x.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} security invariants held`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setProposalsConfig(saved, "system_sec");
  }
}
