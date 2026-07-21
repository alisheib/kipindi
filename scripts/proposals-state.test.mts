/**
 * Proposals feature-state machine — regression proof (in-memory; no DATABASE_URL,
 * so the SystemConfig write-through no-ops and the audit ring is the sole store).
 *
 * Proves the three things the 4-state, admin-controlled proposals switch must
 * guarantee end to end:
 *   1. The gate is SERVER-ENFORCED. Only ACTIVE lets a player create a proposal
 *      or cast a vote; COMING_SOON / MAINTENANCE / DISABLED all refuse — the
 *      "get paid to propose" reward is a regulated inducement (COMPLIANCE-
 *      DECISIONS.md), so the server never trusts the client.
 *   2. Old snapshots MIGRATE. A pre-existing config persisted with the boolean
 *      `enabled` hydrates onto the new state machine (true→ACTIVE, false→DISABLED)
 *      so a live SystemConfig row never breaks hydration.
 *   3. A state change is AUDITED as `proposals.config.updated` with a before/after.
 *
 * Run: npm run test:proposals-state
 */
import { db, type StoredUser } from "../src/lib/server/store.ts";
import { randomId } from "../src/lib/server/crypto.ts";
import {
  setProposalsConfig,
  getProposalsConfig,
  isProposalsActive,
  isProposalsHidden,
  migrateProposalsConfig,
  PROPOSALS_STATES,
  type ProposalsState,
  type ProposalsConfig,
} from "../src/lib/server/proposals-config.ts";
import { createProposal, castVote, proposalsBlockedReason } from "../src/lib/server/proposals-service.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

const OFFICER = "usr_state_officer";
const SRC = "https://www.tff.or.tz/results";
const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

async function mkUser(role: StoredUser["role"] = "PLAYER") {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+25573${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, bonusBalance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return id;
}

const propose = (uid: string, title = "Will Simba SC win the league this season?") =>
  createProposal(uid, { titleEn: title, resolutionCriterion: "Resolves from the official TPL final standings.", category: "sports", resolutionDate: futureDate(), sourceUrl: SRC });

await (async () => {
  // ── 1. Migration: legacy boolean `enabled` → new state machine ──────────
  ok("migrate enabled:true → ACTIVE", migrateProposalsConfig({ enabled: true }).state === "ACTIVE");
  ok("migrate enabled:false → DISABLED", migrateProposalsConfig({ enabled: false }).state === "DISABLED");
  ok("migrate carries prizeTzs through", migrateProposalsConfig({ enabled: true, prizeTzs: 33_000 }).prizeTzs === 33_000);
  ok("migrate keeps a valid modern state", migrateProposalsConfig({ state: "MAINTENANCE" }).state === "MAINTENANCE");
  ok("migrate drops a bogus state (falls back to default)", migrateProposalsConfig({ state: "NONSENSE" }).state === undefined);
  ok("migrate leaves no legacy `enabled` key on the result", !("enabled" in migrateProposalsConfig({ enabled: true })));

  // ── 2. Validation rejects an unknown state ──────────────────────────────
  const badState = setProposalsConfig({ state: "WAT" as ProposalsState }, OFFICER);
  ok("setProposalsConfig rejects an unknown state", badState.ok === false);

  // ── 3. Helpers ──────────────────────────────────────────────────────────
  ok("isProposalsActive true only for ACTIVE", isProposalsActive({ state: "ACTIVE" } as ProposalsConfig) && !isProposalsActive({ state: "COMING_SOON" } as ProposalsConfig));
  ok("isProposalsHidden true only for DISABLED", isProposalsHidden({ state: "DISABLED" } as ProposalsConfig) && !isProposalsHidden({ state: "MAINTENANCE" } as ProposalsConfig));
  ok("exactly four states", PROPOSALS_STATES.length === 4);

  // ── 4. Server-enforced gate: create + vote per state ────────────────────
  // ACTIVE → allowed.
  setProposalsConfig({ state: "ACTIVE", prizeTzs: 20_000, hotThreshold: 200, rateLimit: 3 }, OFFICER);
  const player = await mkUser();
  const created = await propose(player);
  ok("ACTIVE: create succeeds", created.ok === true);
  ok("getProposalsConfig reflects ACTIVE", getProposalsConfig().state === "ACTIVE");
  if (created.ok) {
    const v = await castVote(await mkUser(), created.proposal.id, "up");
    ok("ACTIVE: vote succeeds", v.ok === true);
  }

  // Every non-ACTIVE state must refuse BOTH create and vote.
  for (const state of ["COMING_SOON", "MAINTENANCE", "DISABLED"] as ProposalsState[]) {
    setProposalsConfig({ state }, OFFICER);
    const c = await propose(await mkUser(), `Blocked while ${state} — a valid long title`);
    ok(`${state}: server refuses create`, c.ok === false, c.ok ? "unexpectedly created" : c.error);
    ok(`${state}: refusal is coded PAUSED`, c.ok === false && c.code === "PAUSED");

    // A vote needs a real open proposal to target — make one under ACTIVE, then
    // flip to the blocked state and confirm the vote is refused.
    setProposalsConfig({ state: "ACTIVE" }, OFFICER);
    const seed = await propose(await mkUser(), `Vote seed for ${state} test title`);
    setProposalsConfig({ state }, OFFICER);
    if (seed.ok) {
      const v = await castVote(await mkUser(), seed.proposal.id, "up");
      ok(`${state}: server refuses vote`, v.ok === false, v.ok ? "unexpectedly voted" : v.error);
    } else {
      ok(`${state}: vote seed created under ACTIVE`, false, "seed create failed");
    }
  }

  // ── 5. Refusal reason is honest + state-specific (the server-layer message
  //      the createProposalAction gate returns; the action delegates to this) ──
  ok("blocked reason (coming soon) mentions coming soon", /coming soon/i.test(proposalsBlockedReason("COMING_SOON")));
  ok("blocked reason (maintenance) mentions unavailable/shortly", /unavailable|shortly/i.test(proposalsBlockedReason("MAINTENANCE")));
  ok("blocked reason (disabled) is honest", /available/i.test(proposalsBlockedReason("DISABLED")));

  // ── 6. Audit: a state change writes proposals.config.updated ────────────
  setProposalsConfig({ state: "MAINTENANCE" }, OFFICER);
  await auditFlush();
  const admin = getAuditPage({ category: "ADMIN", limit: 200 });
  const entry = admin.find((e) => e.action === "proposals.config.updated" && (e.payload?.changes as { state?: string })?.state === "MAINTENANCE");
  ok("state change is audited as proposals.config.updated", !!entry);
  ok("audit entry carries a before/after payload", !!entry && !!entry.payload?.before && !!entry.payload?.after);
  ok("audit actor is the officer", !!entry && entry.actorId === OFFICER);

  // Restore a safe default for anything downstream in the same process.
  setProposalsConfig({ state: "COMING_SOON" }, OFFICER);
})();

console.log(`\nproposals-state: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
