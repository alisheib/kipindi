/**
 * Proposal → approval-bonus tests (in-memory store; no DATABASE_URL).
 *
 * The 2026-07-05 reward model: ONE reward path — a non-withdrawable bonus-wallet
 * grant (amount = proposals config prizeTzs) paid the INSTANT an officer approves.
 * Publishing the market and resolving it move NO money.
 *
 * Money-safety this guards:
 *   - source URL is required + validated at create
 *   - APPROVE grants the bonus exactly once (re-approve blocked, no double-credit)
 *   - DECLINE / CHANGES grant no bonus
 *   - GO-LIVE creates the market but grants no extra bonus
 *   - market resolution (onMarketResolved) grants no bonus, only flips status
 *   - prizeTzs = 0 approves cleanly with no grant
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  createProposal,
  approveProposal,
  goLiveProposal,
  declineProposal,
  requestChanges,
  onMarketResolved,
  getProposalDetail,
} from "../src/lib/server/proposals-service.ts";
import { getBonusSummary, creditBonus } from "../src/lib/server/bonus-service.ts";
import { setProposalsConfig } from "../src/lib/server/proposals-config.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const SRC = "https://www.bbc.com/test-source"; // format-valid (trust is checked only at go-live)
const TRUSTED_MACRO = "https://www.bot.go.tz/exchange-rates"; // bot.go.tz — trusted for macro
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

async function mkUser(role: "PLAYER" | "ADMIN" = "PLAYER"): Promise<string> {
  const id = `usr_${role}_${++seq}`;
  await db.user.create({
    id, phoneE164: `+25573${String(seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
  return id;
}
const bonusBal = async (uid: string) => (await getBonusSummary(uid)).bonusBalance;

setBonusConfig({ enabled: true, defaultWagerMultiplier: 5, defaultExpiryDays: 30, proposalToBonus: true } as never, "test");
setProposalsConfig({ enabled: true, prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 } as never, "test");

const officer = await mkUser("ADMIN");

// ── create: source URL required + validated ──────────────────────────────────
{
  const P = await mkUser();
  const base = { titleEn: "Will Simba SC win the league title?", resolutionCriterion: "Resolves from official TPL standings.", category: "sports" as const, resolutionDate: futureDate() };
  ok("create rejects missing source URL", (await createProposal(P, { ...base, sourceUrl: "" })).ok === false);
  ok("create rejects non-http source URL", (await createProposal(P, { ...base, sourceUrl: "ftp://x" })).ok === false);
  const c = await createProposal(P, { ...base, sourceUrl: SRC });
  ok("create succeeds with valid source", c.ok === true);
  ok("proposal starts REVIEW with source persisted", c.ok === true && c.proposal.status === "REVIEW" && c.proposal.sourceUrl === SRC);
}

// ── approve grants the bonus exactly once ────────────────────────────────────
{
  const P = await mkUser();
  const c = await createProposal(P, { titleEn: "Will the shilling strengthen this quarter?", resolutionCriterion: "Resolves from BoT published rate.", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const pid = c.proposal.id;

  const before = await bonusBal(P);
  const a = await approveProposal(pid, officer);
  ok("approve succeeds", a.ok === true);
  ok("approve reports grantedTzs = 20,000", a.ok === true && a.grantedTzs === 20_000);
  ok("bonus wallet credited +20,000", (await bonusBal(P)) - before === 20_000, `Δ=${(await bonusBal(P)) - before}`);
  const d = (await getProposalDetail(pid, null))!;
  ok("proposal now APPROVED, not live", d.status === "APPROVED" && d.publishedMarketId === null);
  ok("bonusGrantedTzs recorded on proposal", d.bonusGrantedTzs === 20_000);

  const afterFirst = await bonusBal(P);
  const re = await approveProposal(pid, officer);
  ok("re-approve blocked", re.ok === false);
  ok("re-approve does not double-credit", (await bonusBal(P)) === afterFirst, `bonus=${await bonusBal(P)}`);

  // Only one PROPOSAL grant exists for this user
  const grants = (await db.bonusGrant.listByUser(P)).filter((g) => g.source === "PROPOSAL");
  ok("exactly one proposal bonus grant", grants.length === 1, `count=${grants.length}`);

  // No double-notify: the generic "bonus added" (kind BONUS) message is suppressed;
  // the single contextual proposal-approved message (kind PROPOSAL) is sent instead.
  const notifs = await db.notification.findByUser(P, 50);
  ok("no generic BONUS notification on approval", notifs.filter((n) => n.kind === "BONUS").length === 0, `bonus=${notifs.filter((n) => n.kind === "BONUS").length}`);
  ok("exactly one proposal-approved notification", notifs.filter((n) => n.kind === "PROPOSAL" && /approved/i.test(n.titleEn)).length === 1);

  // go-live → market created, NO extra bonus
  const beforeLive = await bonusBal(P);
  const live = await goLiveProposal(pid, officer, TRUSTED_MACRO);
  ok("go-live creates a market", live.ok === true && !!(live as { marketId?: string }).marketId, live.ok ? "" : (live as { error: string }).error);
  ok("go-live grants no extra bonus", (await bonusBal(P)) === beforeLive, `bonus=${await bonusBal(P)}`);
  const dl = (await getProposalDetail(pid, null))!;
  ok("proposal now LISTED", dl.status === "LISTED" && !!dl.publishedMarketId);

  // resolution → status only, no bonus
  if (live.ok && (live as { marketId: string }).marketId) {
    const beforeResolve = await bonusBal(P);
    await onMarketResolved((live as { marketId: string }).marketId, { voided: false });
    const dr = (await getProposalDetail(pid, null))!;
    ok("resolution flips LISTED→RESOLVED", dr.status === "RESOLVED");
    ok("resolution grants no bonus", (await bonusBal(P)) === beforeResolve, `bonus=${await bonusBal(P)}`);
    ok("approval bonus preserved after resolve", dr.bonusGrantedTzs === 20_000);
  }
}

// ── queued: approving when the proposer already has an ACTIVE bonus ──────────
{
  const P = await mkUser();
  await creditBonus(P, { amountTzs: 5_000, source: "ADMIN", note: "pre-existing active bonus", notifyPlayer: false });
  const activeBonus = await bonusBal(P);
  ok("pre-existing active bonus present", activeBonus === 5_000, `bonus=${activeBonus}`);
  const c = await createProposal(P, { titleEn: "A proposal approved while a bonus is active", resolutionCriterion: "Resolves from an official source.", category: "weather", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const a = await approveProposal(c.proposal.id, officer);
  ok("approve succeeds (queued reward)", a.ok === true && a.grantedTzs === 20_000);
  ok("bonusBalance unchanged — reward queued, not active yet", (await bonusBal(P)) === activeBonus, `bonus=${await bonusBal(P)}`);
  const pg = (await db.bonusGrant.listByUser(P)).find((g) => g.source === "PROPOSAL");
  ok("proposal grant is QUEUED", pg?.status === "QUEUED", `status=${pg?.status}`);
  const d = (await getProposalDetail(c.proposal.id, null))!;
  ok("proposal records bonusGrantedTzs + APPROVED", d.status === "APPROVED" && d.bonusGrantedTzs === 20_000);
  const notifs = await db.notification.findByUser(P, 50);
  ok("queued approval notification says reserved", notifs.some((n) => n.kind === "PROPOSAL" && /reserved/i.test(n.titleEn)));
  ok("no generic BONUS notification even when queued", notifs.filter((n) => n.kind === "BONUS").length === 0);
}

// ── decline / changes grant no bonus ─────────────────────────────────────────
{
  const P = await mkUser();
  const c = await createProposal(P, { titleEn: "A proposal that will be declined here", resolutionCriterion: "Resolves from an official source.", category: "culture", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const dec = await declineProposal(c.proposal.id, officer, "Politics", "Out of scope");
  ok("decline succeeds", dec.ok === true);
  ok("declined proposal grants no bonus", (await bonusBal(P)) === 0, `bonus=${await bonusBal(P)}`);
  ok("approve of a declined proposal blocked", (await approveProposal(c.proposal.id, officer)).ok === false);

  const P2 = await mkUser();
  const c2 = await createProposal(P2, { titleEn: "A proposal needing minor changes here", resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c2.ok) throw new Error("setup create failed");
  const rc = await requestChanges(c2.proposal.id, officer, "Tighten the criterion.");
  ok("request changes succeeds", rc.ok === true);
  ok("changes-requested grants no bonus", (await bonusBal(P2)) === 0);
  // still approvable from CHANGES_REQUESTED
  const a2 = await approveProposal(c2.proposal.id, officer);
  ok("approve works from CHANGES_REQUESTED", a2.ok === true && (await bonusBal(P2)) === 20_000);
}

// ── separation of duties: an officer cannot approve their OWN proposal ───────
{
  // The proposer is also an officer (ADMIN) — approving their own proposal would
  // grant themselves a bonus (self-dealing). Must be blocked, no bonus paid.
  const selfOfficer = await mkUser("ADMIN");
  const c = await createProposal(selfOfficer, { titleEn: "An officer proposing their very own market", resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const before = await bonusBal(selfOfficer);
  const a = await approveProposal(c.proposal.id, selfOfficer);
  ok("self-approval blocked", a.ok === false);
  ok("self-approval pays no bonus", (await bonusBal(selfOfficer)) === before, `Δ=${(await bonusBal(selfOfficer)) - before}`);
  const d = (await getProposalDetail(c.proposal.id, null))!;
  ok("self-approved proposal stays under review", d.status === "REVIEW");
  // A DIFFERENT officer can still approve it.
  const a2 = await approveProposal(c.proposal.id, officer);
  ok("a different officer can approve", a2.ok === true && a2.grantedTzs === 20_000);
}

// ── prizeTzs = 0 approves cleanly with no grant ──────────────────────────────
{
  setProposalsConfig({ prizeTzs: 0 } as never, "test");
  const P = await mkUser();
  const c = await createProposal(P, { titleEn: "A zero-prize proposal to approve here", resolutionCriterion: "Resolves from an official source.", category: "crypto", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const a = await approveProposal(c.proposal.id, officer);
  ok("approve succeeds with zero prize", a.ok === true && a.grantedTzs === 0);
  ok("zero-prize grants no bonus", (await bonusBal(P)) === 0);
  const d = (await getProposalDetail(c.proposal.id, null))!;
  ok("zero-prize proposal still APPROVED", d.status === "APPROVED");
  setProposalsConfig({ prizeTzs: 20_000 } as never, "test");
}

// ── race: concurrent approve + decline — never both apply, never DECLINED-with-bonus ──
{
  const P = await mkUser();
  const c = await createProposal(P, { titleEn: "Race between approve and decline here", resolutionCriterion: "Resolves from an official source.", category: "crypto", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const [a, dec] = await Promise.all([
    approveProposal(c.proposal.id, officer),
    declineProposal(c.proposal.id, officer, "Politics"),
  ]);
  const d = (await getProposalDetail(c.proposal.id, null))!;
  const bonus = await bonusBal(P);
  ok("approve/decline race: exactly one succeeded", a.ok !== dec.ok, `approve=${a.ok} decline=${dec.ok}`);
  ok("approve/decline race: never DECLINED with bonus paid", !(d.status === "DECLINED" && bonus > 0), `status=${d.status} bonus=${bonus}`);
  ok("approve/decline race: money matches status", (d.status === "APPROVED" && bonus === 20_000) || (d.status === "DECLINED" && bonus === 0), `status=${d.status} bonus=${bonus}`);
}

// ── race: concurrent double-approve grants exactly once ──────────────────────
{
  const P = await mkUser();
  const c = await createProposal(P, { titleEn: "Race between two approvals here now", resolutionCriterion: "Resolves from an official source.", category: "crypto", resolutionDate: futureDate(), sourceUrl: SRC });
  if (!c.ok) throw new Error("setup create failed");
  const [a1, a2] = await Promise.all([
    approveProposal(c.proposal.id, officer),
    approveProposal(c.proposal.id, officer),
  ]);
  ok("double-approve race: exactly one succeeded", a1.ok !== a2.ok, `a1=${a1.ok} a2=${a2.ok}`);
  ok("double-approve race: bonus granted once (20,000)", (await bonusBal(P)) === 20_000, `bonus=${await bonusBal(P)}`);
  const grants = (await db.bonusGrant.listByUser(P)).filter((g) => g.source === "PROPOSAL");
  ok("double-approve race: single proposal grant", grants.length === 1, `count=${grants.length}`);
}

// ── rate limit holds under a concurrent submit burst ─────────────────────────
{
  setProposalsConfig({ rateLimit: 3 } as never, "test");
  const P = await mkUser();
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    createProposal(P, { titleEn: `Concurrent burst proposal number ${i}`, resolutionCriterion: "Resolves from an official source.", category: "macro", resolutionDate: futureDate(), sourceUrl: SRC })));
  const okCount = results.filter((r) => r.ok).length;
  const openNow = (await db.proposal.listByProposer(P)).filter((p) => p.status === "REVIEW" || p.status === "CHANGES_REQUESTED").length;
  ok("rate limit caps concurrent creates at 3", okCount === 3, `created=${okCount}`);
  ok("no more than 3 open proposals exist after burst", openNow === 3, `open=${openNow}`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
