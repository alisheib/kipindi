/**
 * Officer resolution + evidence tests (in-memory store; no DATABASE_URL).
 *
 * The officer-conflict hard-block was RETIRED (owner decision 2026-07-24,
 * docs/COMPLIANCE-DECISIONS.md): a single admin resolves any market — INCLUDING one
 * they hold a position in — in one action, by default, in all money modes. The
 * position-holder settlement math is covered by scripts/two-admin-policy.test.mts.
 *
 * This suite now locks:
 *   - A position-holding officer CAN resolve / emergency-void (the block is gone).
 *   - The stage-1 evidence excerpt is denormalised onto the market (settlement-proof
 *     panel), null when absent, capped at 2000 chars, and stored raw (React escapes
 *     it at render).
 *   - Two-admin mode preserves the stage-1 evidence through a stage-2 countersign.
 *   - The player "two-officer" honesty predicate: a badge shows ONLY for two DISTINCT
 *     real officers; single-officer / synthetic / missing-stage ⇒ no badge.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, resolveMarket, emergencyVoidMarket } from "../src/lib/server/market-service.ts";
import { setRequireTwoOfficerResolution } from "../src/lib/server/resolution-policy.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const now = () => new Date().toISOString();
let seq = 0;

async function mkUser(id: string, role: "PLAYER" | "ADMIN", balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25598${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@test.tz`,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  if (balance > 0) {
    await db.wallet.create({
      id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
      currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
    } as StoredWallet);
  }
}

const futureDate = new Date(Date.now() + 3600_000).toISOString();

await mkUser("officer_a", "ADMIN");
await mkUser("officer_b", "ADMIN");
await mkUser("clean_officer", "ADMIN", 0);
await mkUser("player_1", "PLAYER");

const mkt1 = await createMarket({
  titleEn: "Conflict test market", titleSw: "Soko", titleZh: "市场",
  descriptionEn: "Test", descriptionSw: "Jaribio", descriptionZh: "测试",
  category: "FINANCE", resolutionAt: futureDate,
  resolutionCriterion: "Price > 100", sourceUrl: "https://example.com",
  createdById: "clean_officer",
});

// Officer A holds a position in market 1.
const bet1 = await buyPosition("officer_a", { marketId: mkt1.id, side: "YES", stake: 1000 });
ok("officer_a placed bet", bet1.ok);
await buyPosition("player_1", { marketId: mkt1.id, side: "NO", stake: 2000 });

// ── Test 1: position-holding officer CAN resolve in ONE action (block retired) ─
{
  const res = await resolveMarket({ marketId: mkt1.id, outcome: "YES", officerId: "officer_a" });
  ok("position-holding officer resolves in one action", res.ok, res.ok ? "" : res.error);
  ok("single-admin seals immediately (stage complete)", res.ok && res.data?.stage === "complete", res.ok ? `stage=${res.data?.stage}` : res.error);
}

// ── Test 2: position-holding officer CAN emergency-void ──────────────────────
{
  const mkt2 = await createMarket({
    titleEn: "Void conflict market", titleSw: "Soko", titleZh: "市场",
    descriptionEn: "T", descriptionSw: "T", descriptionZh: "T",
    category: "FINANCE", resolutionAt: futureDate,
    resolutionCriterion: "x", sourceUrl: "https://example.com",
    createdById: "clean_officer",
  });
  await buyPosition("officer_a", { marketId: mkt2.id, side: "YES", stake: 500 });
  await buyPosition("player_1", { marketId: mkt2.id, side: "NO", stake: 500 });
  const res = await emergencyVoidMarket({ marketId: mkt2.id, officerId: "officer_a", reason: "operator decision" });
  ok("position-holding officer can emergency-void", res.ok, res.ok ? "" : (res as { error?: string }).error);
}

// ── Evidence excerpt (settlement-proof panel) ───────────────────────────────
async function mkEvMarket(crit: string): Promise<string> {
  const m = await createMarket({
    titleEn: "Evidence market", titleSw: "Soko", titleZh: "市场",
    descriptionEn: "T", descriptionSw: "T", descriptionZh: "T",
    category: "FINANCE", resolutionAt: futureDate,
    resolutionCriterion: crit, sourceUrl: "https://example.com",
    createdById: "clean_officer",
  } as never);
  return (m as { id: string }).id;
}

// ── Test 3: evidence is persisted onto the market and round-trips ────────────
{
  const id = await mkEvMarket("Evidence > 1");
  const quote = "Per the official exchange ledger, BTC's daily close was 68,240 — above the 68,000 threshold.";
  const res = await resolveMarket({ marketId: id, outcome: "YES", officerId: "clean_officer", evidence: quote });
  ok("resolve with evidence ok", res.ok, res.ok ? "" : res.error);
  const m = await marketStore.get(id);
  ok("evidence persisted onto market", m?.resolutionEvidence === quote, `got=${JSON.stringify(m?.resolutionEvidence)}`);
}

// ── Test 4: no evidence → null (empty-state, never "") ──────────────────────
{
  const id = await mkEvMarket("Evidence null");
  const res = await resolveMarket({ marketId: id, outcome: "NO", officerId: "clean_officer" });
  ok("resolve without evidence ok", res.ok);
  const m = await marketStore.get(id);
  ok("no evidence → null (not empty string)", m?.resolutionEvidence === null, `got=${JSON.stringify(m?.resolutionEvidence)}`);
}

// ── Test 5: over-long evidence is capped at 2000 chars ──────────────────────
{
  const id = await mkEvMarket("Evidence long");
  const huge = "A".repeat(5000);
  const res = await resolveMarket({ marketId: id, outcome: "YES", officerId: "clean_officer", evidence: huge });
  ok("resolve with huge evidence ok", res.ok);
  const m = await marketStore.get(id);
  ok("evidence capped at 2000 chars", (m?.resolutionEvidence?.length ?? -1) === 2000, `len=${m?.resolutionEvidence?.length}`);
}

// ── Test 6: injection payload is stored raw (rendered inert by React) ────────
{
  const id = await mkEvMarket("Evidence injection");
  const payload = "<script>alert(1)</script></section>{{7*7}} ‮RTL‬ 😀";
  const res = await resolveMarket({ marketId: id, outcome: "YES", officerId: "clean_officer", evidence: payload });
  ok("resolve with injection payload ok", res.ok);
  const m = await marketStore.get(id);
  ok("injection payload stored raw + inert", m?.resolutionEvidence === payload, `got=${JSON.stringify(m?.resolutionEvidence)}`);
}

// ── Test 7: two-admin mode — stage-1 evidence survives a stage-2 countersign ─
{
  await setRequireTwoOfficerResolution(true, "officer-conflict-test");
  const id = await mkEvMarket("Evidence stage-2 preserve");
  await buyPosition("player_1", { marketId: id, side: "YES", stake: 500 });
  await buyPosition("player_1", { marketId: id, side: "NO", stake: 500 });
  const quote = "Official source confirms the YES condition was met at settlement time.";
  const s1 = await resolveMarket({ marketId: id, outcome: "YES", officerId: "officer_a", evidence: quote });
  ok("two-admin stage-1 ok", s1.ok && s1.data?.stage === "stage1", s1.ok ? "" : s1.error);
  const s2 = await resolveMarket({ marketId: id, outcome: "YES", officerId: "officer_b", evidence: "counter-sign note — different text" });
  ok("two-admin stage-2 seals", s2.ok && s2.data?.stage === "complete", s2.ok ? "" : s2.error);
  const m = await marketStore.get(id);
  ok("stage-1 evidence preserved through stage-2", m?.resolutionEvidence === quote, `got=${JSON.stringify(m?.resolutionEvidence)}`);
  ok("market is RESOLVED", m?.status === "RESOLVED");
  await setRequireTwoOfficerResolution(false, "officer-conflict-test");
}

// ── Test 8: two-officer honesty predicate — badge only for two DISTINCT reals ─
{
  const twoOfficerClaim = (s1: string | null, s2: string | null) =>
    !!(s1 && s2 && s1 !== s2 && !s1.startsWith("system") && !s2.startsWith("system"));
  // single-officer predicate (what markets/[id] uses to show the single-officer line)
  const singleOfficerClaim = (s1: string | null, s2: string | null) =>
    !twoOfficerClaim(s1, s2) && !!(s1 && !s1.startsWith("system"));
  ok("real distinct officers → two-officer badge", twoOfficerClaim("ev_officer_1", "ev_officer_2"));
  ok("same officer → NO two-officer badge", !twoOfficerClaim("ev_officer_1", "ev_officer_1"));
  ok("same officer (single-admin) → single-officer line shown", singleOfficerClaim("ev_officer_1", "ev_officer_1"));
  ok("system/synthetic resolver → neither badge", !twoOfficerClaim("system_demo", "system_sentinel") && !singleOfficerClaim("system_demo", "system_sentinel"));
  ok("one missing stage → no two-officer badge", !twoOfficerClaim("ev_officer_1", null));
}

console.log(`\nofficer-conflict: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
