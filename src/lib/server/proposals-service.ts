/**
 * Player market-proposals service (Feature 2).
 *
 *  - createProposal: validated submission (source URL REQUIRED), per-player
 *    open-proposal rate limit; on submit → notify + email BOTH the proposer
 *    ("we're reviewing") and every market-ops officer ("new proposal to review").
 *  - castVote: one up/down vote per user, toggl*able, ranking only (never decides)
 *  - board / detail read models with the requesting user's vote + derived "Hot"
 *  - officer actions:
 *      · approveProposal — grants the proposer's bonus INSTANTLY (exactly-once)
 *        and marks the proposal APPROVED. Does NOT publish a market.
 *      · goLiveProposal  — separate publish step: creates the real Market from an
 *        APPROVED proposal (no bonus logic here — already granted at approval).
 *      · requestChanges / declineProposal — an officer ALWAYS decides; no bonus.
 *  - onMarketResolved: status reflection only (LISTED → RESOLVED). The reward is
 *    granted at approval, so resolution moves NO money.
 *  - admin stats for the review console
 *
 * Reward model (2026-07-05 rebuild): ONE reward path — a non-withdrawable
 * bonus-wallet grant (amount = proposals config prizeTzs) paid the instant an
 * officer approves. Exactly-once via the proposal status guard + the bonus grant's
 * sourceRef idempotency key. There is NO pay-on-listing/resolution logic anymore.
 */
import {
  db,
  type StoredProposal,
  type StoredProposalVote,
  type ProposalCategory,
  type ProposalStatus,
} from "./store";
import { getProposalsConfig } from "./proposals-config";
import { getBonusConfig } from "./bonus-config";
import { audit } from "./audit";
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { maskName } from "./affiliate-service";
import { creditBonus } from "./bonus-service";
import { creditInternal } from "./wallet-service";
import { displayLabel } from "@/lib/display-label";
import { resolvePhoneEmail } from "./email-map";
import {
  notifyProposalUnderReview,
  notifyAdminProposalReview,
  notifyProposalApproved,
  notifyProposalListed,
  notifyProposalDeclined,
  notifyProposalChanges,
} from "./notification-service";
import {
  sendEmail,
  sendEmailToUser,
  proposalSubmittedHtml,
  proposalSubmittedAdminHtml,
  proposalApprovedHtml,
  proposalDeclinedHtml,
  proposalChangesHtml,
  proposalListedHtml,
} from "./email";

const BASE_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";

export const PROPOSAL_CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure"];
export const DECLINE_REASONS = [
  "Politics", "Ambiguous outcome", "No official source", "Duplicate",
  "Past resolution", "Outside jurisdiction", "Officer decision",
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

/** States where a proposal is still open for officer triage / player counts. */
const OPEN_STATES: ProposalStatus[] = ["REVIEW", "CHANGES_REQUESTED"];

/** Proposal category → market category (markets have no "infrastructure"). */
function toMarketCategory(c: ProposalCategory): "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" {
  return c === "infrastructure" ? "tech" : c;
}

/**
 * Validate a player-supplied source URL. Must be a well-formed http(s) URL,
 * bounded in length. Returns the normalised (trimmed) URL on success. Kept in
 * one place so create-form (client) and createProposal (server) agree.
 */
export const MAX_SOURCE_URL_LEN = 500;
export function validateSourceUrl(raw: string | null | undefined): { ok: true; url: string } | { ok: false; error: string } {
  const url = (raw ?? "").trim();
  if (!url) return { ok: false, error: "A source link is required so the outcome can be verified." };
  if (url.length > MAX_SOURCE_URL_LEN) return { ok: false, error: `Source link must be under ${MAX_SOURCE_URL_LEN} characters.` };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Enter a valid link, e.g. https://example.com/results." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Source link must start with http:// or https://." };
  }
  return { ok: true, url };
}

/**
 * Validate an OPTIONAL betting-close (selection) date against a resolution date.
 * Empty → null (market's selectionClosedAt is auto-derived at publish). If present:
 * YYYY-MM-DD, in the future, and on/before the resolution date. Shared by
 * createProposal and editProposal so client + both server paths agree.
 */
export function parseSelectionCloseDate(raw: string | null | undefined, resolutionDate: string):
  { ok: true; date: string | null } | { ok: false; error: string } {
  const s = (raw ?? "").trim();
  if (!s) return { ok: true, date: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: "Betting-close date must be YYYY-MM-DD." };
  const ts = Date.parse(`${s}T23:59:59.000Z`);
  if (!Number.isFinite(ts)) return { ok: false, error: "Invalid betting-close date." };
  if (ts <= Date.now()) return { ok: false, error: "Betting-close date must be in the future." };
  // Strictly before resolution: an equal date resolves to the same 23:59:59 cutoff
  // and would be dropped at market creation, so require an earlier day to avoid a
  // silently-discarded value. Leave blank to keep betting open until resolution.
  if (s >= resolutionDate) return { ok: false, error: "Betting must close before the resolution date." };
  return { ok: true, date: s };
}

// ── Create ─────────────────────────────────────────────────────────────
export type CreateProposalInput = {
  titleEn: string;
  titleSw?: string;
  titleZh?: string;
  description?: string;
  resolutionCriterion: string;
  category: ProposalCategory;
  resolutionDate: string; // YYYY-MM-DD
  selectionCloseDate?: string; // YYYY-MM-DD (optional) — when betting closes; must be <= resolutionDate
  sourceUrl: string;      // REQUIRED — trusted source for resolution
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
  // Optional betting-close date — validated against the resolution date.
  const sel = parseSelectionCloseDate(input.selectionCloseDate, date);
  if (!sel.ok) return { ok: false, error: sel.error, code: "INVALID" };
  // Source link is required and must be a valid http(s) URL (server-side gate).
  const src = validateSourceUrl(input.sourceUrl);
  if (!src.ok) return { ok: false, error: src.error, code: "INVALID" };

  // Rate limit — max simultaneously-open proposals per player. Serialize the
  // count-then-create per user so a burst of concurrent submits can't each read
  // the same under-limit count and all slip through (TOCTOU anti-spam guard).
  const now = new Date().toISOString();
  const created = await withLock(`proposal:create:${userId}`, async () => {
    const open = (await db.proposal.listByProposer(userId)).filter((p) => OPEN_STATES.includes(p.status)).length;
    if (open >= cfg.rateLimit) return "RATE_LIMITED" as const;
    return db.proposal.create({
      id: `prp_${randomId(12)}`,
      proposerId: userId,
      titleEn,
      titleSw: input.titleSw?.trim() || null,
      titleZh: input.titleZh?.trim() || null,
      description: input.description?.trim() || null,
      resolutionCriterion: criterion,
      category: input.category,
      resolutionDate: date,
      selectionCloseDate: sel.date,
      sourceUrl: src.url,
      status: "REVIEW",
      up: 0,
      down: 0,
      publishedMarketId: null,
      bonusGrantedTzs: 0,
      bonusGrantId: null,
      approvedAt: null,
      declineReason: null,
      declineNote: null,
      changeNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  if (created === "RATE_LIMITED") {
    return { ok: false, error: `You can have at most ${cfg.rateLimit} open proposals at a time.`, code: "RATE_LIMITED" };
  }
  const proposal = created;
  audit({ category: "ADMIN", action: "proposal.created", actorId: userId, targetType: "Proposal", targetId: proposal.id, payload: { category: proposal.category } });

  // ── Submission notifications (all best-effort; never block the submission) ──
  // Player: confirmation ("we're reviewing").
  notifyProposalUnderReview(userId, { titleEn }).catch(() => {});
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Proposal received · under review",
    html: proposalSubmittedHtml({ titleEn, reference: proposal.id, submittedAt: now }),
    tag: "proposal-submitted",
  }));

  // Officers: in-app bell + email ("new proposal to review", with source + link).
  void notifyOfficersOfNewProposal(proposal).catch(() => {});

  return { ok: true, proposal };
}

/**
 * Alert every market-ops officer that a new proposal is awaiting review — in-app
 * bell (deep-links to /admin/proposals) + best-effort email carrying the source
 * link, proposer, and titles. Mirrors the KYC "new submission" admin fan-out.
 */
async function notifyOfficersOfNewProposal(proposal: StoredProposal): Promise<void> {
  const proposer = await db.user.findById(proposal.proposerId);
  const proposerLabel = displayLabel(proposer ?? { id: proposal.proposerId, displayName: null });
  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role));

  for (const o of officers) {
    notifyAdminProposalReview(o.id, { proposerLabel, titleEn: proposal.titleEn, proposalId: proposal.id }).catch(() => {});
  }

  const reviewUrl = `${BASE_URL()}/admin/proposals`;
  const html = proposalSubmittedAdminHtml({
    reference: proposal.id,
    proposer: proposerLabel,
    titleEn: proposal.titleEn,
    titleSw: proposal.titleSw,
    category: proposal.category,
    sourceUrl: proposal.sourceUrl ?? "—",
    reviewUrl,
  });
  const recipients = [...new Set(
    officers
      .map((o) => (o.email || resolvePhoneEmail(o.phoneE164) || "").trim().toLowerCase())
      .filter((e) => e && !e.endsWith("@stub") && !e.endsWith("@none")),
  )];
  for (const to of recipients) {
    sendEmail({ to, subject: "New market proposal to review · " + proposal.id, html, tag: "proposal-admin", trackLinks: false }).catch(() => {});
  }
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
    // serialises every read-modify-write, so counts can't drift or race.
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
  titleZh: string | null;
  description: string | null;
  category: ProposalCategory;
  resolutionCriterion: string;
  resolutionDate: string;
  selectionCloseDate: string | null;
  sourceUrl: string | null;
  status: ProposalStatus;
  isHot: boolean;
  up: number;
  down: number;
  score: number;
  proposerMasked: string;
  isMine: boolean;
  myVote: "up" | "down" | null;
  publishedMarketId: string | null;
  bonusGrantedTzs: number;
  approvedAt: string | null;
  declineReason: string | null;
  declineNote: string | null;
  changeNote: string | null;
  createdAt: string;
};

async function toView(p: StoredProposal, viewerId: string | null): Promise<ProposalView> {
  const cfg = getProposalsConfig();
  const score = p.up - p.down;
  const proposer = await db.user.findById(p.proposerId);
  return {
    id: p.id,
    titleEn: p.titleEn,
    titleSw: p.titleSw,
    titleZh: p.titleZh ?? null,
    description: p.description,
    category: p.category,
    resolutionCriterion: p.resolutionCriterion,
    resolutionDate: p.resolutionDate,
    selectionCloseDate: p.selectionCloseDate,
    sourceUrl: p.sourceUrl,
    status: p.status,
    isHot: OPEN_STATES.includes(p.status) && score >= cfg.hotThreshold,
    up: p.up,
    down: p.down,
    score,
    proposerMasked: viewerId && p.proposerId === viewerId ? "You · Wewe" : maskName(proposer?.displayName ?? null, proposer?.phoneE164 ?? ""),
    isMine: !!viewerId && p.proposerId === viewerId,
    myVote: viewerId ? ((await db.proposalVote.get(p.id, viewerId))?.dir ?? null) : null,
    publishedMarketId: p.publishedMarketId,
    bonusGrantedTzs: p.bonusGrantedTzs,
    approvedAt: p.approvedAt,
    declineReason: p.declineReason,
    declineNote: p.declineNote,
    changeNote: p.changeNote,
    createdAt: p.createdAt,
  };
}

/** Default board page size when a caller doesn't specify one. */
const BOARD_PAGE_SIZE = 12;

export async function listBoard(viewerId: string | null, filter: BoardFilter = "hot", page = 1, perPage = BOARD_PAGE_SIZE) {
  const cfg = getProposalsConfig();
  const all = await db.proposal.list(5000);
  const totalVotes = all.reduce((s, p) => s + p.up + p.down, 0);
  let views = await Promise.all(all.map((p) => toView(p, viewerId)));
  if (filter === "hot") views = views.filter((v) => v.isHot).sort((a, b) => b.score - a.score);
  else if (filter === "listed") views = views.filter((v) => v.status === "LISTED" || v.status === "RESOLVED");
  else if (filter === "mine") views = views.filter((v) => v.isMine);
  // "new" keeps the recency order from db.proposal.list
  const matchedCount = views.length;
  const totalPages = Math.max(1, Math.ceil(matchedCount / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    proposals: views.slice((safePage - 1) * perPage, safePage * perPage),
    matchedCount,
    totalProposals: all.length,
    totalVotes,
    enabled: cfg.enabled,
    page: safePage,
    perPage,
  };
}

export async function getProposalDetail(id: string, viewerId: string | null) {
  const p = await db.proposal.findById(id);
  return p ? toView(p, viewerId) : null;
}

/** Timeline step index for the detail stepper: Submitted → Under review →
 *  Approved → Live → Resolved. DECLINED is handled separately in the UI. */
export function timelineStep(v: ProposalView): number {
  if (v.status === "RESOLVED") return 4;
  if (v.status === "LISTED") return 3;
  if (v.status === "APPROVED") return 2;
  return 1; // REVIEW / CHANGES_REQUESTED
}

// ── Officer actions ─────────────────────────────────────────────────────
export type ApproveResult =
  | { ok: true; grantedTzs: number }
  | { ok: false; error: string };

/**
 * Approve a proposal and grant the proposer's reward INSTANTLY.
 *
 * Money-safety (exactly-once):
 *  - The whole grant + status flip runs under `withLock("proposal:<id>")`.
 *  - Only a proposal in REVIEW / CHANGES_REQUESTED can be approved — once it is
 *    APPROVED the status guard makes a re-approve a no-op, so the reward is paid
 *    at most once even on double-click / retry / re-review.
 *  - The bonus grant is additionally idempotent by its sourceRef `proposal:<id>`,
 *    so a partial failure (grant landed, status write lost) can't double-credit.
 *
 * Reward = a non-withdrawable bonus-wallet grant of `prizeTzs`. If the bonus
 * program is off (or the wallet can't take a bonus), we fall back to a real
 * credit and audit it — the promised reward is never silently lost. Approval
 * does NOT publish a market; publishing is a separate step (goLiveProposal).
 */
export async function approveProposal(proposalId: string, officerId: string): Promise<ApproveResult> {
  return withLock(`proposal:${proposalId}`, async (): Promise<ApproveResult> => {
    const p = await db.proposal.findById(proposalId);
    if (!p) return { ok: false, error: "Proposal not found." };
    if (!OPEN_STATES.includes(p.status)) {
      return { ok: false, error: `Only a proposal under review can be approved (this one is ${p.status.toLowerCase().replace("_", " ")}).` };
    }

    const prize = Math.round(getProposalsConfig().prizeTzs);
    const now = new Date().toISOString();
    const note = `Proposal approved · "${p.titleEn.slice(0, 50)}"`;
    const sourceRef = `proposal:${p.id}`;

    let grantId: string | null = null;
    let grantedTzs = 0;
    let wagerRequiredTzs = 0;
    let queued = false;

    if (prize > 0) {
      // Prefer the bonus wallet (must be played through). Idempotent by sourceRef.
      // notifyPlayer:false — we send the single, contextual "proposal approved"
      // notice below instead of the generic "bonus added" one (no double-notify).
      const r = await creditBonus(p.proposerId, { amountTzs: prize, source: "PROPOSAL", sourceRef, note, notifyPlayer: false });
      if (r.ok) {
        grantId = r.grant.id;
        grantedTzs = r.grant.amountTzs;
        wagerRequiredTzs = r.grant.wagerRequiredTzs;
        queued = r.grant.status === "QUEUED";
      } else {
        // Bonus program off / wallet not bonus-eligible — never lose the promised
        // reward. Fall back to a real credit and audit. Exactly-once still holds:
        // the status guard above stops a re-approve from re-entering this branch.
        const credited = await creditInternal(p.proposerId, prize, { description: note });
        if (credited === null) {
          audit({ category: "WALLET", action: "proposal.approve_grant_failed", actorId: officerId, targetType: "Proposal", targetId: p.id, payload: { proposerId: p.proposerId, prize, reason: r.error } });
          return { ok: false, error: `Couldn't credit the proposer's reward (${r.error}). Check the bonus/wallet setup and retry.` };
        }
        grantedTzs = prize;
        audit({ category: "WALLET", action: "proposal.approve_real_fallback", actorId: officerId, targetType: "Proposal", targetId: p.id, payload: { proposerId: p.proposerId, prize, reason: r.error } });
      }
    }

    const updated = await db.proposal.update(proposalId, {
      status: "APPROVED",
      bonusGrantedTzs: grantedTzs,
      bonusGrantId: grantId,
      approvedAt: now,
      reviewedBy: officerId,
      reviewedAt: now,
    });
    if (!updated) {
      // The reward committed but the status write failed. Do NOT claim success —
      // ask the officer to retry. A retry is money-safe: creditBonus dedupes on
      // sourceRef (no second grant) and re-attempts the status flip. Audit so ops
      // can see the transient split even if no one retries.
      audit({ category: "WALLET", action: "proposal.approve_status_write_failed", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { proposerId: p.proposerId, grantedTzs, grantId } });
      return { ok: false, error: "Reward credited, but saving the approval failed — click Approve again to finish (it won't double-pay)." };
    }
    audit({ category: "ADMIN", action: "proposal.approved", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { proposerId: p.proposerId, grantedTzs, grantId } });

    notifyProposalApproved(p.proposerId, { titleEn: p.titleEn, amountTzs: grantedTzs, queued }).catch(() => {});
    sendEmailToUser(p.proposerId, (email) => ({
      to: email,
      subject: grantedTzs > 0 ? `Proposal approved · bonus TZS ${grantedTzs.toLocaleString("en-US")} credited` : "Proposal approved",
      html: proposalApprovedHtml({ titleEn: p.titleEn, amountTzs: grantedTzs, wagerRequiredTzs, queued }),
      tag: "proposal-approved",
    }));

    return { ok: true, grantedTzs };
  });
}

/**
 * Publish an APPROVED proposal live — creates the real Market via market-service.
 * SEPARATE from approval: the bonus was already granted at approval, so this moves
 * NO money. Serialized + status-guarded so a double-click can't create two markets.
 * The source URL (pre-filled from the proposal, officer-editable) is trust-checked
 * against the approved source registry, same gate as a direct market create.
 */
export async function goLiveProposal(proposalId: string, officerId: string, sourceUrl: string):
  Promise<{ ok: true; marketId: string } | { ok: false; error: string }> {
  const src = validateSourceUrl(sourceUrl);
  if (!src.ok) return { ok: false, error: src.error };
  const { isSourceTrusted, seedDefaultSources } = await import("./source-registry");
  await seedDefaultSources();

  return withLock(`proposal:${proposalId}`, async () => {
    const p = await db.proposal.findById(proposalId);
    if (!p) return { ok: false as const, error: "Proposal not found." };
    if (p.status === "LISTED" || p.status === "RESOLVED") return { ok: false as const, error: "This proposal is already live." };
    if (p.status !== "APPROVED") return { ok: false as const, error: "Approve the proposal (and pay its bonus) before publishing it live." };

    const trust = await isSourceTrusted(src.url, toMarketCategory(p.category));
    if (!trust.ok) return { ok: false as const, error: `Source not approved: ${trust.reason}. Add or enable it at /admin/sources.` };

    const { createMarket } = await import("./market-service");
    const { computeSelectionClosedAt } = await import("./ai-poll-config");
    const resolutionAt = new Date(`${p.resolutionDate}T23:59:59.000Z`).toISOString();
    // Betting-close: use the proposal's explicit selection-close date when set
    // (proposer- or officer-specified), otherwise fall back to the auto heuristic.
    const selectionClosedAt = p.selectionCloseDate
      ? new Date(`${p.selectionCloseDate}T23:59:59.000Z`).toISOString()
      : computeSelectionClosedAt(resolutionAt, toMarketCategory(p.category));
    const market = await createMarket({
      titleEn: p.titleEn,
      titleSw: p.titleSw ?? p.titleEn,
      titleZh: p.titleZh ?? null,
      category: toMarketCategory(p.category),
      sourceUrl: src.url,
      resolutionCriterion: p.resolutionCriterion,
      resolutionAt,
      selectionClosedAt,
      proposedBy: p.proposerId,
    });
    const linked = await db.proposal.update(proposalId, { status: "LISTED", publishedMarketId: market.id, sourceUrl: src.url, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
    if (!linked) {
      // The market was created but the proposal→market link write failed. Surface
      // the marketId loudly for manual reconciliation and refuse (rather than
      // returning ok with an unlinked market). A blind retry would create a
      // DUPLICATE market — the audit + error tell the officer to check /admin/markets
      // first. (Same non-atomic boundary the original approve&list carried.)
      audit({ category: "ADMIN", action: "proposal.publish_link_failed", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { marketId: market.id, warning: "market created but not linked — reconcile before retrying" } });
      return { ok: false as const, error: `Market ${market.id} was created but couldn't be linked to the proposal. Check /admin/markets before retrying to avoid a duplicate.` };
    }
    audit({ category: "ADMIN", action: "proposal.published_live", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { marketId: market.id } });

    notifyProposalListed(p.proposerId, { titleEn: p.titleEn, marketId: market.id }).catch(() => {});
    sendEmailToUser(p.proposerId, (email) => ({
      to: email,
      subject: "Your proposal is now a live market",
      html: proposalListedHtml({ titleEn: p.titleEn, marketId: market.id }),
      tag: "proposal-listed",
    }));
    return { ok: true as const, marketId: market.id };
  });
}

export async function requestChanges(proposalId: string, officerId: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = note?.trim() || null;
  // Serialize against approve/go-live/decline on the SAME proposal and re-check
  // status INSIDE the lock — otherwise a concurrent approve (which pays the bonus)
  // could interleave and this write would clobber an APPROVED proposal back to
  // CHANGES_REQUESTED while the reward is already out.
  const res = await withLock(`proposal:${proposalId}`, async (): Promise<{ ok: false; error: string } | { ok: true; proposal: StoredProposal }> => {
    const cur = await db.proposal.findById(proposalId);
    if (!cur) return { ok: false, error: "Proposal not found." };
    if (!OPEN_STATES.includes(cur.status)) return { ok: false, error: "Only open proposals can be sent back." };
    await db.proposal.update(proposalId, { status: "CHANGES_REQUESTED", changeNote: trimmed, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
    return { ok: true, proposal: cur };
  });
  if (!res.ok) return res;
  const p = res.proposal;
  audit({ category: "ADMIN", action: "proposal.changes_requested", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { note: trimmed } });
  notifyProposalChanges(p.proposerId, { titleEn: p.titleEn, note: trimmed }).catch(() => {});
  sendEmailToUser(p.proposerId, (email) => ({
    to: email,
    subject: "Changes requested on your proposal",
    html: proposalChangesHtml({ titleEn: p.titleEn, note: trimmed }),
    tag: "proposal-changes",
  }));
  return { ok: true };
}

export async function declineProposal(proposalId: string, officerId: string, reason: DeclineReason, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!DECLINE_REASONS.includes(reason)) return { ok: false, error: "Pick a valid decline reason." };
  const trimmed = note?.trim() || null;
  // Locked + inside-lock re-check so a decline can NEVER land on a proposal that
  // was just approved (bonus paid) — the guard blocks any non-open state.
  const res = await withLock(`proposal:${proposalId}`, async (): Promise<{ ok: false; error: string } | { ok: true; proposal: StoredProposal }> => {
    const cur = await db.proposal.findById(proposalId);
    if (!cur) return { ok: false, error: "Proposal not found." };
    if (!OPEN_STATES.includes(cur.status)) return { ok: false, error: `A ${cur.status.toLowerCase().replace("_", " ")} proposal can't be declined.` };
    await db.proposal.update(proposalId, { status: "DECLINED", declineReason: reason, declineNote: trimmed, reviewedBy: officerId, reviewedAt: new Date().toISOString() });
    return { ok: true, proposal: cur };
  });
  if (!res.ok) return res;
  const p = res.proposal;
  audit({ category: "ADMIN", action: "proposal.declined", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { reason, note: trimmed } });
  notifyProposalDeclined(p.proposerId, { titleEn: p.titleEn, reason }).catch(() => {});
  sendEmailToUser(p.proposerId, (email) => ({
    to: email,
    subject: "Update on your market proposal",
    html: proposalDeclinedHtml({ titleEn: p.titleEn, reason, note: trimmed }),
    tag: "proposal-declined",
  }));
  return { ok: true };
}

// ── Officer edit — full control over a proposal's fields ─────────────────────
export type EditProposalInput = {
  titleEn?: string;
  titleSw?: string | null;
  titleZh?: string | null;
  description?: string | null;
  resolutionCriterion?: string;
  category?: ProposalCategory;
  resolutionDate?: string;            // YYYY-MM-DD
  selectionCloseDate?: string | null; // YYYY-MM-DD, or "" / null to clear
  sourceUrl?: string | null;
};

/** States in which an officer may edit a proposal's content. A LISTED proposal
 *  already spawned a live market (edit the market directly); RESOLVED/DECLINED are
 *  terminal. APPROVED is editable so an officer can fix details before publishing. */
const EDITABLE_STATES: ProposalStatus[] = ["REVIEW", "CHANGES_REQUESTED", "APPROVED"];

/**
 * Officer edit of a proposal's content — "change anything in it." Serialized on the
 * proposal lock and status-guarded so an edit can't race an approve/publish/decline.
 * Every provided field is validated exactly like createProposal; the betting-close
 * date is re-checked against the (possibly new) resolution date. Approval/bonus and
 * status are untouched — editing an APPROVED proposal keeps it APPROVED.
 */
export async function editProposal(proposalId: string, officerId: string, patch: EditProposalInput):
  Promise<{ ok: true } | { ok: false; error: string }> {
  return withLock(`proposal:${proposalId}`, async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const p = await db.proposal.findById(proposalId);
    if (!p) return { ok: false, error: "Proposal not found." };
    if (!EDITABLE_STATES.includes(p.status)) {
      return { ok: false, error: `A ${p.status.toLowerCase().replace("_", " ")} proposal can't be edited — edit the live market directly if it's listed.` };
    }

    const next: Partial<StoredProposal> = {};

    if (patch.titleEn !== undefined) {
      const t = patch.titleEn.trim();
      if (t.length < 8 || t.length > 120) return { ok: false, error: "Title must be 8–120 characters." };
      next.titleEn = t;
    }
    if (patch.titleSw !== undefined) next.titleSw = (patch.titleSw ?? "").trim() || null;
    if (patch.titleZh !== undefined) next.titleZh = (patch.titleZh ?? "").trim() || null;
    if (patch.description !== undefined) next.description = (patch.description ?? "").trim() || null;
    if (patch.resolutionCriterion !== undefined) {
      const c = patch.resolutionCriterion.trim();
      if (c.length < 12) return { ok: false, error: "Resolution criterion must be at least 12 characters." };
      next.resolutionCriterion = c;
    }
    if (patch.category !== undefined) {
      if (!PROPOSAL_CATEGORIES.includes(patch.category)) return { ok: false, error: "Pick a valid category." };
      next.category = patch.category;
    }
    // Effective resolution date for cross-checks (new value if provided, else current).
    const effResolution = patch.resolutionDate !== undefined ? (patch.resolutionDate ?? "").trim() : p.resolutionDate;
    if (patch.resolutionDate !== undefined) {
      const d = (patch.resolutionDate ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: "Resolution date must be YYYY-MM-DD." };
      const ts = Date.parse(`${d}T23:59:59.000Z`);
      if (!Number.isFinite(ts) || ts <= Date.now()) return { ok: false, error: "Resolution date must be a valid future date." };
      next.resolutionDate = d;
    }
    if (patch.selectionCloseDate !== undefined) {
      const sel = parseSelectionCloseDate(patch.selectionCloseDate, effResolution);
      if (!sel.ok) return { ok: false, error: sel.error };
      next.selectionCloseDate = sel.date;
    } else if (patch.resolutionDate !== undefined && p.selectionCloseDate && p.selectionCloseDate >= effResolution) {
      // Resolution moved to/earlier than the existing close date — force the officer
      // to reconcile rather than silently ship an impossible/degenerate market.
      return { ok: false, error: "New resolution date is on/before the existing betting-close date — set a new betting-close date too." };
    }
    if (patch.sourceUrl !== undefined) {
      const s = validateSourceUrl(patch.sourceUrl);
      if (!s.ok) return { ok: false, error: s.error };
      next.sourceUrl = s.url;
    }

    if (Object.keys(next).length === 0) return { ok: true };
    next.reviewedBy = officerId;
    next.reviewedAt = new Date().toISOString();
    const updated = await db.proposal.update(proposalId, next);
    if (!updated) return { ok: false, error: "Couldn't save the edit — try again." };
    audit({ category: "ADMIN", action: "proposal.edited", actorId: officerId, targetType: "Proposal", targetId: proposalId, payload: { fields: Object.keys(next) } });
    return { ok: true };
  });
}

/**
 * Called from market resolution: if the resolved market originated from a player
 * proposal, reflect that in the proposal status (LISTED → RESOLVED). The reward
 * was granted at APPROVAL, so this moves NO money — status reflection only.
 * Idempotent (only flips a LISTED proposal).
 */
export async function onMarketResolved(marketId: string, opts: { voided: boolean }): Promise<void> {
  void opts; // outcome doesn't affect the reward anymore (paid at approval)
  const p = await db.proposal.findByMarketId(marketId);
  if (!p) return;
  if (p.status !== "LISTED") return; // already RESOLVED or never live
  await db.proposal.update(p.id, { status: "RESOLVED" });
  audit({ category: "ADMIN", action: "proposal.market_resolved", actorId: null, targetType: "Proposal", targetId: p.id, payload: { marketId } });
}

// ── Admin stats ─────────────────────────────────────────────────────────
export type AdminProposalStats = {
  pending: number;
  approvedAwaitingLive: number;
  listedFromProposals: number;
  bonusesGrantedTzs: number;
  topProposer: { handle: string; listed: number } | null;
};

async function handleFor(userId: string) {
  const u = await db.user.findById(userId);
  if (!u) return "@unknown";
  if (u.displayName) return "@" + u.displayName.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 18);
  return "@" + u.phoneE164.replace(/\D/g, "").slice(-6);
}

export async function getAdminProposalStats(): Promise<AdminProposalStats> {
  const all = await db.proposal.list(5000);
  const pending = all.filter((p) => OPEN_STATES.includes(p.status)).length;
  const approvedAwaitingLive = all.filter((p) => p.status === "APPROVED").length;
  const listed = all.filter((p) => p.status === "LISTED" || p.status === "RESOLVED");
  const bonusesGrantedTzs = all.reduce((s, p) => s + p.bonusGrantedTzs, 0);
  const byProposer = new Map<string, number>();
  for (const p of listed) byProposer.set(p.proposerId, (byProposer.get(p.proposerId) ?? 0) + 1);
  let top: { handle: string; listed: number } | null = null;
  for (const [uid, n] of byProposer) {
    if (!top || n > top.listed) top = { handle: await handleFor(uid), listed: n };
  }
  return { pending, approvedAwaitingLive, listedFromProposals: listed.length, bonusesGrantedTzs, topProposer: top };
}

export type AdminQueueRow = {
  id: string; title: string; titleSw: string | null; titleZh: string | null; description: string | null;
  resolutionCriterion: string; resolutionDate: string; selectionCloseDate: string | null; category: ProposalCategory;
  sourceUrl: string | null; bonusGrantedTzs: number;
  proposerMasked: string; up: number; down: number; score: number;
  ageIso: string; status: ProposalStatus;
};

export async function getAdminQueue(filter: "all" | "review" | "approved" | "flagged" = "all") {
  let rows: AdminQueueRow[] = await Promise.all((await db.proposal.list(2000)).map(async (p) => {
    const proposer = await db.user.findById(p.proposerId);
    return {
      id: p.id, title: p.titleEn, titleSw: p.titleSw, titleZh: p.titleZh ?? null, description: p.description,
      resolutionCriterion: p.resolutionCriterion, resolutionDate: p.resolutionDate, selectionCloseDate: p.selectionCloseDate, category: p.category,
      sourceUrl: p.sourceUrl, bonusGrantedTzs: p.bonusGrantedTzs,
      proposerMasked: maskName(proposer?.displayName ?? null, proposer?.phoneE164 ?? ""),
      up: p.up, down: p.down, score: p.up - p.down, ageIso: p.createdAt, status: p.status,
    };
  }));
  if (filter === "review") rows = rows.filter((r) => r.status === "REVIEW" || r.status === "CHANGES_REQUESTED");
  else if (filter === "approved") rows = rows.filter((r) => r.status === "APPROVED");
  else if (filter === "flagged") rows = rows.filter((r) => r.score < 0 || (r.down > 0 && r.down >= r.up));
  // sort by net votes desc (ranking only), cap the rendered queue
  return rows.sort((a, b) => b.score - a.score).slice(0, 100);
}
