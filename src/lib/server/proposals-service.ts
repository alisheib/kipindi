/**
 * Player market-proposals service (Feature 2).
 *
 *  - createProposal: validated submission, per-player open-proposal rate limit
 *  - castVote: one up/down vote per user, togg*able, ranking only (never decides)
 *  - board / detail read models with the requesting user's vote + derived "Hot"
 *  - officer actions: approve & list (→ real Market via market-service),
 *    request changes, decline (reason required) — an officer ALWAYS decides
 *  - onMarketResolved: pays the proposer the fixed prize once their market is
 *    listed AND resolved (real outcome, not VOID), idempotently
 *  - admin stats for the review console
 *
 * Money rule: whole TZS. Prizes go through wallet-service.creditInternal.
 */
import {
  db,
  type StoredProposal,
  type StoredProposalVote,
  type ProposalCategory,
  type ProposalStatus,
} from "./store";
import { getProposalsConfig } from "./proposals-config";
import { audit } from "./audit";
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { maskName } from "./affiliate-service";
import { creditInternal } from "./wallet-service";
import {
  notifyProposalUnderReview,
  notifyProposalListed,
  notifyProposalDeclined,
  notifyProposalChanges,
  notifyProposalResolvedPaid,
} from "./notification-service";

export const PROPOSAL_CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure"];
export const DECLINE_REASONS = [
  "Politics", "Ambiguous outcome", "No official source", "Duplicate",
  "Past resolution", "Outside jurisdiction", "Officer decision",
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

const OPEN_STATES: ProposalStatus[] = ["REVIEW", "CHANGES_REQUESTED"];

/** Proposal category → market category (markets have no "infrastructure"). */
function toMarketCategory(c: ProposalCategory): "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" {
  return c === "infrastructure" ? "tech" : c;
}

// ── Create ─────────────────────────────────────────────────────────────
export type CreateProposalInput = {
  titleEn: string;
  titleSw?: string;
  description?: string;
  resolutionCriterion: string;
  category: ProposalCategory;
  resolutionDate: string; // YYYY-MM-DD
};

export async function createProposal(userId: string, input: CreateProposalInput):
  Promise<{ ok: true; proposal: StoredProposal } | { ok: false; error: string; code: "PAUSED" | "RATE_LIMITED" | "INVALID" }> {
  const cfg = getProposalsConfig();
  if (!cfg.enabled) return { ok: false, error: "Proposals are paused right now.", code: "PAUSED" };

  const titleEn = (input.titleEn ?? "").trim();
  const criterion = (input.resolutionCriterion ?? "").trim();
  const date = (input.resolutionDate ?? "").trim();
  if (titleEn.length < 8 || titleEn.length > 120) return { ok: false, error: "Title must be 8–120 characters.", code: "INVALID" };
  if (criterion.length < 12) return { ok: false, error: "Resolution criterion must be at least 12 characters.", code: "INVALID" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Resolution date must be YYYY-MM-DD.", code: "INVALID" };
  const ts = Date.parse(`${date}T23:59:59.000Z`);
  if (!Number.isFinite(ts)) return { ok: false, error: "Invalid resolution date.", code: "INVALID" };
  if (ts <= Date.now()) return { ok: false, error: "Resolution date must be in the future.", code: "INVALID" };
  if (!PROPOSAL_CATEGORIES.includes(input.category)) return { ok: false, error: "Pick a valid category.", code: "INVALID" };

  // Rate limit — max simultaneously-open proposals per player.
  const open = (await db.proposal.listByProposer(userId)).filter((p) => OPEN_STATES.includes(p.status)).length;
  if (open >= cfg.rateLimit) {
    return { ok: false, error: `You can have at most ${cfg.rateLimit} open proposals at a time.`, code: "RATE_LIMITED" };
  }

  const now = new Date().toISOString();
  const proposal = await db.proposal.create({
    id: `prp_${randomId(12)}`,
    proposerId: userId,
    titleEn,
    titleSw: input.titleSw?.trim() || null,
    description: input.description?.trim() || null,
    resolutionCriterion: criterion,
    category: input.category,
    resolutionDate: date,
    status: "REVIEW",
    up: 0,
    down: 0,
    publishedMarketId: null,
    prizePaidTzs: 0,
    declineReason: null,
    declineNote: null,
    changeNote: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  audit({ category: "ADMIN", action: "proposal.created", actorId: userId, targetType: "Proposal", targetId: proposal.id, payload: { category: proposal.category } });
  notifyProposalUnderReview(userId, { titleEn });
  return { ok: true, proposal };
}

// ── Vote (ranking only) ────────────────────────────────────────────────
export async function castVote(userId: string, proposalId: string, dir: "up" | "down" | null):
  Promise<
    | { ok: true; up: number; down: number; myVote: "up" | "down" | null }
    | { ok: false; error: string }
  > {
  const cfg = getProposalsConfig();
  if (!cfg.enabled) return { ok: false, error: "Voting is paused." };
  // Serialize per-proposal so concurrent voters can't interleave the
  // record-then-recount and lose a tally.
  return withLock(`proposal:${proposalId}`, async () => {
    const p = await db.proposal.findById(proposalId);
    if (!p) return { ok: false as const, error: "Proposal not found." };
    if (!OPEN_STATES.includes(p.status)) return { ok: false as const, error: "Voting has closed for this proposal." };

    // O(1) incremental tally — back out this voter's previous effect and apply
    // the new one. Correct by construction because the per-proposal lock above
    // serialises every read-modify-write, so counts can't drift or race. (The
    // old "recompute from a full scan" approach was O(votes) per vote → O(N²)
    // on a hot poll; this keeps a 100k-click poll O(N) total.)
    const existing = await db.proposalVote.get(proposalId, userId); // O(1) keyed lookup
    let up = p.up;
    let down = p.down;
    if (existing?.dir === "up") up--;
    else if (existing?.dir === "down") down--;
    if (dir === "up") up++;
    else if (dir === "down") down++;
    up = Math.max(0, up);
    down = Math.max(0, down);

    if (dir === null) {
      await db.proposalVote.delete(proposalId, userId);
    } else {
      const v: StoredProposalVote = {
        id: `${proposalId}:${userId}`,
        proposalId,
        userId,
        dir,
        createdAt: new Date().toISOString(),
      };
      await db.proposalVote.set(v);
    }

    await db.proposal.update(proposalId, { up, down });
    return { ok: true as const, up, down, myVote: dir };
  });
}

// ── Read models ─────────────────────────────────────────────────────────
export type BoardFilter = "hot" | "new" | "listed" | "mine";
export type ProposalView = {
  id: string;
  titleEn: string;
  titleSw: string | null;
  description: string | null;
  category: ProposalCategory;
  resolutionCriterion: string;
  resolutionDate: string;
  status: ProposalStatus;
  isHot: boolean;
  up: number;
  down: number;
  score: number;
  proposerMasked: string;
  isMine: boolean;
  myVote: "up" | "down" | null;
  publishedMarketId: string | null;
  prizePaidTzs: number;
  declineReason: string | null;
  declineNote: string | null;
  changeNote: string | null;
  createdAt: string;
};

async function toView(p: StoredProposal, viewerId: string | null) {
  const cfg = getProposalsConfig();
  const score = p.up - p.down;
  const proposer = await db.user.findById(p.proposerId);
  return {
    id: p.id,
    titleEn: p.titleEn,
    titleSw: p.titleSw,
    description: p.description,
    category: p.category,
    resolutionCriterion: p.resolutionCriterion,
    resolutionDate: p.resolutionDate,
    status: p.status,
    isHot: OPEN_STATES.includes(p.status) && score >= cfg.hotThreshold,
    up: p.up,
    down: p.down,
    score,
    proposerMasked: viewerId && p.proposerId === viewerId ? "You · Wewe" : maskName(proposer?.displayName ?? null, proposer?.phoneE164 ?? ""),
    isMine: !!viewerId && p.proposerId === viewerId,
    myVote: viewerId ? ((await db.proposalVote.get(p.id, viewerId))?.dir ?? null) : null,
    publishedMarketId: p.publishedMarketId,
    prizePaidTzs: p.prizePaidTzs,
    declineReason: p.declineReason,
    declineNote: p.declineNote,
    changeNote: p.changeNote,
    createdAt: p.createdAt,
  };
}

/** Max cards rendered per board view — the board is a curated feed, not an
 *  archive. Totals (for the stats strip) still reflect every proposal. */
const BOARD_PAGE_SIZE = 60;

export async function listBoard(viewerId: string | null, filter: BoardFilter = "hot") {
  const cfg = getProposalsConfig();
  const all = await db.proposal.list(5000);
  const totalVotes = all.reduce((s, p) => s + p.up + p.down, 0);
  let views = await Promise.all(all.map((p) => toView(p, viewerId)));
  if (filter === "hot") views = views.filter((v) => v.isHot).sort((a, b) => b.score - a.score);
  else if (filter === "listed") views = views.filter((v) => v.status === "LISTED" || v.status === "RESOLVED");
  else if (filter === "mine") views = views.filter((v) => v.isMine);
  // "new" keeps the recency order from db.proposal.list
  return { proposals: views.slice(0, BOARD_PAGE_SIZE), totalProposals: all.length, totalVotes, enabled: cfg.enabled };
}

export async function getProposalDetail(id: string, viewerId: string | null) {
  const p = await db.proposal.findById(id);
  return p ? toView(p, viewerId) : null;
}

/** Timeline step index for the detail stepper (Submitted→…→Paid). */
export function timelineStep(v: ProposalView): number {
  if (v.status === "RESOLVED") return v.prizePaidTzs > 0 ? 4 : 3;
  if (v.status === "LISTED") return 2;
  return 1; // REVIEW / CHANGES_REQUESTED (DECLINED handled separately in UI)
}

// ── Officer actions ─────────────────────────────────────────────────────
export async function approveAndList(proposalId: string, officerId: string):
  | Promise<{ ok: true; marketId: string } | { ok: false; error: string }> {
  const p = await db.proposal.findById(proposalId);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.status === "LISTED" || p.status === "RESOLVED") return { ok: false, error: "Already listed." };
  if (p.status === "DECLINED") return { ok: false, error: "Proposal was declined." };

  // Create the real market through the existing pipeline.
  const { createMarket } = await import("./market-service");
  const market = createMarket({
    titleEn: p.titleEn,
    titleSw: p.titleSw ?? p.titleEn,
    category: toMarketCategory(p.category),
    sourceUrl: "",
    resolutionCriterion: p.resolutionCriterion,
    resolutionAt: new Date(`${p.resolutionDate}T23:59:59.000Z`).toISOString(),
    proposedBy: p.proposerId,
  });
  await db.proposal.update(proposalId, { status: "LISTED", publishedMarketId: market.id, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
  audit({ category: "ADMIN", action: "proposal.approved_listed", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { marketId: market.id } });
  notifyProposalListed(p.proposerId, { titleEn: p.titleEn, marketId: market.id });
  return { ok: true, marketId: market.id };
}

export async function requestChanges(proposalId: string, officerId: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await db.proposal.findById(proposalId);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (!OPEN_STATES.includes(p.status)) return { ok: false, error: "Only open proposals can be sent back." };
  await db.proposal.update(proposalId, { status: "CHANGES_REQUESTED", changeNote: note?.trim() || null, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
  audit({ category: "ADMIN", action: "proposal.changes_requested", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { note } });
  notifyProposalChanges(p.proposerId, { titleEn: p.titleEn, note: note?.trim() || null });
  return { ok: true };
}

export async function declineProposal(proposalId: string, officerId: string, reason: DeclineReason, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await db.proposal.findById(proposalId);
  if (!p) return { ok: false, error: "Proposal not found." };
  if (p.status === "LISTED" || p.status === "RESOLVED") return { ok: false, error: "Listed proposals can't be declined." };
  if (!DECLINE_REASONS.includes(reason)) return { ok: false, error: "Pick a valid decline reason." };
  await db.proposal.update(proposalId, { status: "DECLINED", declineReason: reason, declineNote: note?.trim() || null, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
  audit({ category: "ADMIN", action: "proposal.declined", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { reason, note } });
  notifyProposalDeclined(p.proposerId, { titleEn: p.titleEn, reason });
  return { ok: true };
}

/**
 * Called from market resolution: if the resolved market originated from a
 * player proposal, pay the proposer the fixed prize (listed AND resolved).
 * Idempotent; skips VOID outcomes and zero-prize config.
 */
export async function onMarketResolved(marketId: string, opts: { voided: boolean }): Promise<void> {
  const p = await db.proposal.findByMarketId(marketId);
  if (!p) return;
  if (p.status === "RESOLVED" || p.prizePaidTzs > 0) return; // already settled
  if (p.status !== "LISTED") return;
  // Mark resolved regardless; pay only on a real outcome with a positive prize.
  const cfg = getProposalsConfig();
  if (opts.voided) {
    await db.proposal.update(p.id, { status: "RESOLVED" });
    return;
  }
  const prize = cfg.prizeTzs;
  if (prize > 0) {
    // Only record the prize as paid if the credit actually landed. Otherwise we
    // mark the proposal RESOLVED with prizePaidTzs 0 and audit the failure so an
    // officer can settle manually — never claim a payout that didn't move.
    const credited = (await creditInternal(p.proposerId, prize, { description: `Proposal prize · "${p.titleEn.slice(0, 50)}"` })) !== null;
    if (credited) {
      await db.proposal.update(p.id, { status: "RESOLVED", prizePaidTzs: prize });
      audit({ category: "WALLET", action: "proposal.prize_paid", actorId: null, targetType: "Proposal", targetId: p.id, payload: { proposerId: p.proposerId, prize, marketId } });
      notifyProposalResolvedPaid(p.proposerId, { titleEn: p.titleEn, amountTzs: prize });
    } else {
      await db.proposal.update(p.id, { status: "RESOLVED" });
      audit({ category: "WALLET", action: "proposal.prize_failed", actorId: null, targetType: "Proposal", targetId: p.id, payload: { proposerId: p.proposerId, prize, marketId, reason: "wallet credit failed" } });
    }
  } else {
    await db.proposal.update(p.id, { status: "RESOLVED" });
  }
}

// ── Admin stats ─────────────────────────────────────────────────────────
export type AdminProposalStats = {
  pending: number;
  listedFromProposals: number;
  prizesPaidTzs: number;
  topProposer: { handle: string; listed: number } | null;
};

async function handleFor(userId: string) {
  const u = await db.user.findById(userId);
  if (!u) return "@unknown";
  if (u.displayName) return "@" + u.displayName.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 18);
  return "@" + u.phoneE164.replace(/\D/g, "").slice(-6);
}

export async function getAdminProposalStats() {
  const all = await db.proposal.list(5000);
  const pending = all.filter((p) => OPEN_STATES.includes(p.status)).length;
  const listed = all.filter((p) => p.status === "LISTED" || p.status === "RESOLVED");
  const prizesPaidTzs = all.reduce((s, p) => s + p.prizePaidTzs, 0);
  const byProposer = new Map<string, number>();
  for (const p of listed) byProposer.set(p.proposerId, (byProposer.get(p.proposerId) ?? 0) + 1);
  let top: { handle: string; listed: number } | null = null;
  for (const [uid, n] of byProposer) {
    if (!top || n > top.listed) top = { handle: await handleFor(uid), listed: n };
  }
  return { pending, listedFromProposals: listed.length, prizesPaidTzs, topProposer: top };
}

export type AdminQueueRow = {
  id: string; title: string; titleSw: string | null; description: string | null;
  resolutionCriterion: string; resolutionDate: string; category: ProposalCategory;
  proposerMasked: string; up: number; down: number; score: number;
  ageIso: string; status: ProposalStatus;
};

export async function getAdminQueue(filter: "all" | "review" | "flagged" = "all") {
  let rows: AdminQueueRow[] = await Promise.all((await db.proposal.list(2000)).map(async (p) => {
    const proposer = await db.user.findById(p.proposerId);
    return {
      id: p.id, title: p.titleEn, titleSw: p.titleSw, description: p.description,
      resolutionCriterion: p.resolutionCriterion, resolutionDate: p.resolutionDate, category: p.category,
      proposerMasked: maskName(proposer?.displayName ?? null, proposer?.phoneE164 ?? ""),
      up: p.up, down: p.down, score: p.up - p.down, ageIso: p.createdAt, status: p.status,
    };
  }));
  if (filter === "review") rows = rows.filter((r) => r.status === "REVIEW" || r.status === "CHANGES_REQUESTED");
  else if (filter === "flagged") rows = rows.filter((r) => r.score < 0 || (r.down > 0 && r.down >= r.up));
  // sort by net votes desc (ranking only), cap the rendered queue
  return rows.sort((a, b) => b.score - a.score).slice(0, 100);
}
