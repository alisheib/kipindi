/**
 * /api/dev-test/proposals-seed — dev-only. Seeds a representative spread of
 * proposals (Hot / Under review / Declined, plus votes) so the board and admin
 * queue render populated deterministically. Optionally attributes some to a
 * given proposerId so a player's "Mine" view is populated. 404 in prod.
 * POST { mineFor?: userId, n?: number }.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { createProposal, castVote, declineProposal } from "@/lib/server/proposals-service";

async function mkUser() {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25576${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: "Seed User", dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

const FIXTURES: Array<{ title: string; cat: "sports" | "weather" | "macro" | "crypto" | "culture"; votes: number }> = [
  { title: "Will Simba SC win the Mainland Premier League?", cat: "sports", votes: 260 },
  { title: "Will Dar es Salaam hit 35C before 15 June?", cat: "weather", votes: 240 },
  { title: "Will the BoT hold the rate at the next MPC meeting?", cat: "macro", votes: 40 },
  { title: "Will BTC close above 90k on 30 June?", cat: "crypto", votes: 25 },
];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const { mineFor } = (await req.json().catch(() => ({}))) as { mineFor?: string };
  const cfg = getProposalsConfig();
  let created = 0;

  for (const f of FIXTURES) {
    const proposer = await mkUser();
    const r = await createProposal(proposer.id, { titleEn: f.title, titleSw: f.title, resolutionCriterion: "Resolves from the official source at the resolution date.", category: f.cat, resolutionDate: futureDate() });
    if (!r.ok) continue;
    created++;
    // Apply up-votes from distinct voters (cap to keep it quick) so Hot threshold can be crossed.
    const target = Math.min(f.votes, cfg.hotThreshold + 30);
    for (let i = 0; i < target; i++) await castVote((await mkUser()).id, r.proposal.id, "up");
  }

  // A declined fixture so the player/admin "declined" state is exercised.
  const dp = await createProposal((await mkUser()).id, { titleEn: "Will a specific candidate win a local seat?", resolutionCriterion: "Resolves from official results.", category: "culture", resolutionDate: futureDate() });
  if (dp.ok) { await declineProposal(dp.proposal.id, "system_seed", "Politics", "Outside jurisdiction."); created++; }

  // Optionally attribute a couple to a real signed-in player so "Mine" populates.
  if (mineFor && await db.user.findById(mineFor)) {
    const a = await createProposal(mineFor, { titleEn: "My own proposal under review please", resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate() });
    if (a.ok) { await castVote((await mkUser()).id, a.proposal.id, "up"); created++; }
  }

  return NextResponse.json({ ok: true, created });
}
