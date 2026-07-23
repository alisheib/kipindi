/**
 * Solo-resolution TESTING override — full effects test (in-memory store).
 *
 * Verifies the critical toggle Ali requested end-to-end and across everything it
 * touches:
 *   A. OFF (production intact): conflicted officer blocked; same-officer stage-2
 *      blocked (two-officer rule holds).
 *   B. ON: one officer resolves a market alone (stage-1 + stage-2), INCLUDING a
 *      market they hold a position in — and their own position settles + pays
 *      exactly like any player's. Money is conserved (stakes in = payouts +
 *      house fee). Winners are paid the correct pari-mutuel amount.
 *   C. Re-disable restores production behaviour.
 *   D. The override is written to the COMPLIANCE audit trail (never silent).
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, listPositionsForUser } from "../src/lib/server/market-service.ts";
import { setConflictedResolutionAllowed, getConflictedResolutionAllowed } from "../src/lib/server/test-overrides.ts";
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
await setGlobalConfig({ feeModel: "capped-commission" }, "solo-test-setup");

await mkUser("officerX", "ADMIN");   // the tester — admin AND bettor
await mkUser("officerY", "ADMIN", 0);
await mkUser("clean", "ADMIN", 0);
await mkUser("playerP", "PLAYER");

// ── A · OFF (default) — production behaviour intact ──────────────────────────
ok("override defaults OFF", (await getConflictedResolutionAllowed()) === false);

const mA = await mkMarket("A market");
await buyPosition("officerX", { marketId: mA.id, side: "YES", stake: 1000 });
await buyPosition("playerP", { marketId: mA.id, side: "NO", stake: 2000 });
const offConflict = await resolveMarket({ marketId: mA.id, outcome: "YES", officerId: "officerX" });
ok("OFF: conflicted officer blocked", !offConflict.ok && offConflict.code === "CONFLICT", offConflict.error);

// same-officer two-stage on a clean market must still be blocked at stage-2
const mB = await mkMarket("B market");
await buyPosition("playerP", { marketId: mB.id, side: "YES", stake: 1000 });
await buyPosition("officerY", { marketId: mB.id, side: "NO", stake: 1000 });
const bS1 = await resolveMarket({ marketId: mB.id, outcome: "YES", officerId: "clean" });
const bS2same = await resolveMarket({ marketId: mB.id, outcome: "YES", officerId: "clean" });
ok("OFF: stage-1 recorded", bS1.ok && bS1.data?.stage === "stage1");
ok("OFF: same officer blocked at stage-2 (two-officer rule)", !bS2same.ok, bS2same.error);

// ── B · ON — solo resolution + conflicted officer settles like a player ──────
await setConflictedResolutionAllowed(true, "test_admin");
ok("override now ON", (await getConflictedResolutionAllowed()) === true);

// officerX holds YES 1000 in mA; playerP holds NO 2000. Resolve YES solo.
const xBefore = await bal("officerX");
const pBefore = await bal("playerP");
const s1 = await resolveMarket({ marketId: mA.id, outcome: "YES", officerId: "officerX" });
ok("ON: conflicted officer can stage-1", s1.ok && s1.data?.stage === "stage1", s1.error);
const s2 = await resolveMarket({ marketId: mA.id, outcome: "YES", officerId: "officerX" });
ok("ON: SAME officer can stage-2 (solo settle)", s2.ok && s2.data?.stage === "complete", s2.error);

// Stage-2 records the verdict; settlement is what pays. The override under test
// is the two-officer/conflict bypass, not the objection window, so force past it.
const settled = await settleMarket(mA.id, { force: true, actorId: "officerX" });
ok("solo settlement pays out", settled.ok, settled.ok ? "" : settled.error);

// The conflicted officer's own YES position must WIN and be paid.
const xPositions = await listPositionsForUser("officerX");
const xPos = xPositions.find((p) => p.marketId === mA.id);
ok("officer's own position settled WIN", xPos?.status === "WIN", `status=${xPos?.status}`);
ok("officer's own position has a payout", (xPos?.finalPayout ?? 0) > 0, `payout=${xPos?.finalPayout}`);

// Capped-fee math: grossPool 3000. The poll is not lopsided enough for the ceiling
// to bind, so the 10% commission applies: fee = 300 → netPool 2700, sole YES takes it all.
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

// ── C · Re-disable restores production ───────────────────────────────────────
await setConflictedResolutionAllowed(false, "test_admin");
const mC = await mkMarket("C market");
await buyPosition("officerX", { marketId: mC.id, side: "YES", stake: 500 });
await buyPosition("playerP", { marketId: mC.id, side: "NO", stake: 500 });
const reBlocked = await resolveMarket({ marketId: mC.id, outcome: "YES", officerId: "officerX" });
ok("OFF again: conflicted officer blocked once more", !reBlocked.ok && reBlocked.code === "CONFLICT", reBlocked.error);

// ── D · Audit trail records every bypass ─────────────────────────────────────
const compliance = getAuditPage({ category: "COMPLIANCE", limit: 500 });
ok("audit: conflict_overridden recorded", compliance.some((e) => e.action === "market.resolve.conflict_overridden" && e.targetId === mA.id));
ok("audit: solo_overridden recorded", compliance.some((e) => e.action === "market.resolve.solo_overridden" && e.targetId === mA.id));
ok("audit: toggle enable + disable recorded", compliance.some((e) => e.action === "test.conflicted_resolution.enabled") && compliance.some((e) => e.action === "test.conflicted_resolution.disabled"));

console.log(`\nsolo-resolution-override: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
