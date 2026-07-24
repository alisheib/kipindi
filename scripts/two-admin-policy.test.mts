/**
 * Two-admin authorization policy — full effects test (in-memory store).
 *
 * The owner decision (2026-07-24): single-admin resolution is the permanent DEFAULT
 * in ALL money modes, and a position-holding admin may resolve. Two-admin
 * authorization is an OPTIONAL toggle with NO real-money hard-lock. This suite
 * verifies that end-to-end and across everything it touches:
 *   A. DEFAULT (two-admin OFF): one admin resolves a market in ONE action — INCLUDING
 *      a market they hold a position in — and their own position settles + pays
 *      exactly like any player's. Money is conserved (stakes in = payouts + house
 *      fee). Winners are paid the correct pari-mutuel amount.
 *   B. Two-admin ON: stage-1 by A, then a DIFFERENT B seals; same-officer stage-2 is
 *      rejected (the B !== A gate). Re-disabling restores single-admin.
 *   C. Works identically in a simulated LIVE env — no hard-lock.
 *   D. The toggle is written to the COMPLIANCE audit trail (never silent); the
 *      adjudication records which authorization path sealed it.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, listPositionsForUser } from "../src/lib/server/market-service.ts";
import { setRequireTwoOfficerResolution, getRequireTwoOfficerResolution } from "../src/lib/server/resolution-policy.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role: "PLAYER" | "ADMIN", balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@test.tz`,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  if (balance > 0) {
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
  }
}
const bal = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;
const future = new Date(Date.now() + 3600_000).toISOString();
const mkMarket = (title: string) => createMarket({
  titleEn: title, titleSw: title, titleZh: title,
  descriptionEn: "t", descriptionSw: "t", descriptionZh: "t",
  category: "FINANCE", resolutionAt: future, resolutionCriterion: "x", sourceUrl: "https://example.com", createdById: "clean",
} as never);

// This suite asserts capped-commission payout numbers; pin the model (the platform
// default is now loser-share) so mkMarket() freezes the model it expects.
await setGlobalConfig({ feeModel: "capped-commission" }, "two-admin-test-setup");

await mkUser("officerX", "ADMIN");   // admin AND bettor (holds a position)
await mkUser("officerY", "ADMIN", 0);
await mkUser("clean", "ADMIN", 0);
await mkUser("playerP", "PLAYER");

// ── A · DEFAULT (two-admin OFF) — single admin, incl. position-holder, one action ─
ok("two-admin defaults OFF", (await getRequireTwoOfficerResolution()) === false);

const mA = await mkMarket("A market");
await buyPosition("officerX", { marketId: mA.id, side: "YES", stake: 1000 });
await buyPosition("playerP", { marketId: mA.id, side: "NO", stake: 2000 });
const xBefore = await bal("officerX");
const pBefore = await bal("playerP");
// officerX holds YES 1000 in mA — the position-holder — and resolves in ONE call.
const solo = await resolveMarket({ marketId: mA.id, outcome: "YES", officerId: "officerX" });
ok("DEFAULT: position-holding admin resolves in ONE action", solo.ok && solo.data?.stage === "complete", solo.ok ? "" : solo.error);

// Stage-2 records the verdict; settlement is what pays. The policy under test is the
// single-admin default, not the objection window, so force past it.
const settled = await settleMarket(mA.id, { force: true, actorId: "officerX" });
ok("single-admin settlement pays out", settled.ok, settled.ok ? "" : (settled as { error?: string }).error);

// The position-holding officer's own YES position must WIN and be paid.
const xPositions = await listPositionsForUser("officerX");
const xPos = xPositions.find((p) => p.marketId === mA.id);
ok("officer's own position settled WIN", xPos?.status === "WIN", `status=${xPos?.status}`);
ok("officer's own position has a payout", (xPos?.finalPayout ?? 0) > 0, `payout=${xPos?.finalPayout}`);

// Capped-fee math: grossPool 3000, not lopsided enough for the ceiling, so the 10%
// commission applies: fee = 300 → netPool 2700, sole YES takes it all.
const winnersPaid = settled.ok ? (settled.data?.winnersPaid ?? 0) : 0;
ok("winnersPaid = netPool (2700)", winnersPaid === 2700, `winnersPaid=${winnersPaid}`);
const xAfter = await bal("officerX");
ok("officer credited exactly the payout", xAfter - xBefore === 2700, `Δ=${xAfter - xBefore}`);
const pAfter = await bal("playerP");
ok("losing player's balance unchanged by settlement", pAfter === pBefore, `before=${pBefore} after=${pAfter}`);

// Money conservation: stakes in (3000) = payouts to players (2700) + house fee (300).
const grossPool = 1000 + 2000;
const houseFee = grossPool - winnersPaid;
ok("money conserved: stakes = payouts + house fee", grossPool === winnersPaid + houseFee && houseFee === 300, `gross=${grossPool} paid=${winnersPaid} fee=${houseFee}`);

// ── B · Two-admin ON — stage-1 by A, stage-2 by a DIFFERENT B ────────────────
await setRequireTwoOfficerResolution(true, "test_admin");
ok("two-admin now ON", (await getRequireTwoOfficerResolution()) === true);

const mB = await mkMarket("B market");
await buyPosition("playerP", { marketId: mB.id, side: "YES", stake: 1000 });
await buyPosition("officerY", { marketId: mB.id, side: "NO", stake: 1000 });
const bS1 = await resolveMarket({ marketId: mB.id, outcome: "YES", officerId: "clean" });
ok("ON: stage-1 recorded (no seal yet)", bS1.ok && bS1.data?.stage === "stage1", bS1.ok ? "" : bS1.error);
const bS2same = await resolveMarket({ marketId: mB.id, outcome: "YES", officerId: "clean" });
ok("ON: SAME officer blocked at stage-2 (B !== A)", !bS2same.ok, bS2same.ok ? "unexpected ok" : bS2same.error);
const bS2diff = await resolveMarket({ marketId: mB.id, outcome: "YES", officerId: "officerY" });
ok("ON: a DIFFERENT officer seals stage-2", bS2diff.ok && bS2diff.data?.stage === "complete", bS2diff.ok ? "" : bS2diff.error);

// Re-disable restores single-admin.
await setRequireTwoOfficerResolution(false, "test_admin");
const mC = await mkMarket("C market");
await buyPosition("officerX", { marketId: mC.id, side: "YES", stake: 500 });
await buyPosition("playerP", { marketId: mC.id, side: "NO", stake: 500 });
const reSolo = await resolveMarket({ marketId: mC.id, outcome: "YES", officerId: "officerX" });
ok("OFF again: single admin seals in one action once more", reSolo.ok && reSolo.data?.stage === "complete", reSolo.ok ? "" : reSolo.error);

// ── C · Simulated LIVE money-mode — no hard-lock ─────────────────────────────
const prevNodeEnv = process.env.NODE_ENV;
const prevTestFunding = process.env.TEST_FUNDING;
try {
  process.env.NODE_ENV = "production";
  delete process.env.TEST_FUNDING; // NODE_ENV=production && TEST_FUNDING unset ⇒ LIVE
  const mLive = await mkMarket("LIVE market");
  await buyPosition("officerX", { marketId: mLive.id, side: "YES", stake: 400 });
  await buyPosition("playerP", { marketId: mLive.id, side: "NO", stake: 600 });
  const liveSolo = await resolveMarket({ marketId: mLive.id, outcome: "YES", officerId: "officerX" });
  ok("LIVE: single admin (position-holder) still resolves in one action (no hard-lock)", liveSolo.ok && liveSolo.data?.stage === "complete", liveSolo.ok ? "" : liveSolo.error);
} finally {
  if (prevNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prevNodeEnv;
  if (prevTestFunding === undefined) delete process.env.TEST_FUNDING; else process.env.TEST_FUNDING = prevTestFunding;
}

// ── D · Audit trail records the toggle + the authorization path ──────────────
const compliance = getAuditPage({ category: "COMPLIANCE", limit: 500 });
ok("audit: two_admin_enabled + two_admin_disabled recorded",
  compliance.some((e) => e.action === "resolution.two_admin_enabled") && compliance.some((e) => e.action === "resolution.two_admin_disabled"));
const adminAudit = getAuditPage({ category: "ADMIN", limit: 500 });
const adjA = adminAudit.find((e) => e.action === "market.adjudicated" && e.targetId === mA.id);
ok("audit: single-admin adjudication tagged resolutionAuth=single-admin", adjA?.payload?.resolutionAuth === "single-admin", `auth=${adjA?.payload?.resolutionAuth}`);
const adjB = adminAudit.find((e) => e.action === "market.adjudicated" && e.targetId === mB.id);
ok("audit: two-admin adjudication tagged resolutionAuth=two-officer", adjB?.payload?.resolutionAuth === "two-officer", `auth=${adjB?.payload?.resolutionAuth}`);

console.log(`\ntwo-admin-policy: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
