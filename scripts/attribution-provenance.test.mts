/**
 * ATTRIBUTION PROVENANCE — the programme is stamped on the RECRUIT at bind, and it never moves.
 *
 * 🔴 THE EXPLOIT THIS CLOSES (AGENT-PROGRAMME §6b): v1 derived the programme at accrual from the
 * referrer's CURRENT role. Farm binds for free as a player, pay the fee, get approved — and every
 * old bind flips to agent commission at the negotiated rate, with the window opening on people
 * who joined months ago. `User.recruitedProgramme` is written ONCE, in the same write as
 * `recruitedBy`, and NULL means PLAYER — never a fall-through to the agent branch.
 *
 * Red harness: `npm run red:attribution-provenance`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement, ensureAffiliateAccount, programmeOf, attributionFor } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig, setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
let n = 0;
const pos = () => `pos_prov_${++n}`;
const agentRows = async (uid: string) => (await db.referralReward.listByReferrer(uid)).filter((r) => r.programme === "AGENT");

const snap = getAffiliateConfig();
// Player commission OFF so a PLAYER-programme settlement writes NOTHING — the only money that
// can appear below is agent commission, which makes every zero unambiguous.
setAffiliateConfig({ enabled: true, commission: { ...snap.commission, enabled: false } }, "test-officer");

try {
  // ── §1 · a bind under the PLAYER programme is stamped PLAYER ───────────────────────────
  await mkFixtureUser("prov_ref");
  const playerCode = (await ensureAffiliateAccount("prov_ref")).code;
  await mkFixtureUser("prov_a");
  process.env.FEATURE_INVITE = "ACTIVE";
  let boundA;
  try { boundA = await bindRecruit({ recruitUserId: "prov_a", code: playerCode }); } finally { delete process.env.FEATURE_INVITE; }
  ok("1.bound · a player referrer binds under the promo", boundA.bound === true, JSON.stringify(boundA));
  const a = (await db.user.findById("prov_a"))!;
  ok("1.stamp · recruitedProgramme is PLAYER", a.recruitedProgramme === "PLAYER", String(a.recruitedProgramme));
  ok("1.at · recruitedAt is stamped", !!a.recruitedAt, String(a.recruitedAt));
  ok("1.code · recruitedByCode is the code that was used", a.recruitedByCode === playerCode, String(a.recruitedByCode));
  ok("1.by · recruitedBy is the referrer", a.recruitedBy === "prov_ref", String(a.recruitedBy));

  // ── §2 · the referrer becomes an AGENT — the old bind does NOT flip ────────────────────
  const agentCode = await approveFixtureAgent("prov_ref", { commissionPct: 20 });
  ok("2.setup · the referrer is now an approved agent with a NEW code", agentCode !== playerCode && agentCode.startsWith("50PICK-AG-"), agentCode);
  const a2 = (await db.user.findById("prov_a"))!;
  ok("2.immutable · the recruit's stamp did not change on approval", a2.recruitedProgramme === "PLAYER" && a2.recruitedByCode === playerCode, JSON.stringify([a2.recruitedProgramme, a2.recruitedByCode]));
  await onRecruitSettlement("prov_a", { operatorNetFee: 10_000, marketId: "mkt_prov_1", positionId: pos() });
  ok("2.nocash · settling the PRE-approval recruit pays the agent NOTHING", (await cashOf("prov_ref")) === 0, `cash=${await cashOf("prov_ref")}`);
  ok("2.norow · …and writes no AGENT row", (await agentRows("prov_ref")).length === 0);
  const attrA = await attributionFor("prov_a");
  ok("2.attr · attributionFor reads the STAMP, not the referrer's role", !!attrA && attrA.programme === "PLAYER", JSON.stringify(attrA));

  // ── §3 · a bind AFTER approval is stamped AGENT and pays ───────────────────────────────
  await mkFixtureUser("prov_b");
  const boundB = await bindRecruit({ recruitUserId: "prov_b", code: agentCode });
  ok("3.bound · the agent code binds", boundB.bound === true, JSON.stringify(boundB));
  const b = (await db.user.findById("prov_b"))!;
  ok("3.stamp · recruitedProgramme is AGENT, with the agent code", b.recruitedProgramme === "AGENT" && b.recruitedByCode === agentCode, JSON.stringify([b.recruitedProgramme, b.recruitedByCode]));
  await onRecruitSettlement("prov_b", { operatorNetFee: 10_000, marketId: "mkt_prov_2", positionId: pos() });
  ok("3.cash · CONTROL — the post-approval recruit pays TZS 2,000", (await cashOf("prov_ref")) === 2_000, `cash=${await cashOf("prov_ref")}`);
  ok("3.row · one AGENT row", (await agentRows("prov_ref")).length === 1);

  // ── §4 · the stamp is immutable: a second bind is refused, nothing rewritten ───────────
  await mkFixtureUser("prov_other");
  const otherCode = await approveFixtureAgent("prov_other", { commissionPct: 20 });
  const rebind = await bindRecruit({ recruitUserId: "prov_b", code: otherCode });
  ok("4.refused · a bound recruit cannot be re-bound", rebind.bound === false, JSON.stringify(rebind));
  const b2 = (await db.user.findById("prov_b"))!;
  ok("4.same · the stamp is unchanged", b2.recruitedBy === "prov_ref" && b2.recruitedByCode === agentCode && b2.recruitedProgramme === "AGENT");
  const rebindA = await bindRecruit({ recruitUserId: "prov_a", code: agentCode });
  ok("4.old · a PLAYER-stamped recruit cannot be re-bound onto the agent code either", rebindA.bound === false, JSON.stringify(rebindA));

  // ── §5 · NULL means PLAYER — a legacy row never falls into the agent branch ────────────
  await mkFixtureUser("prov_legacy");
  await db.user.update("prov_legacy", { recruitedBy: "prov_ref", recruitedProgramme: null, recruitedAt: null, recruitedByCode: null });
  const legacy = (await db.user.findById("prov_legacy"))!;
  ok("5.setup · a legacy attribution with a NULL programme", legacy.recruitedBy === "prov_ref" && legacy.recruitedProgramme == null);
  ok("5.programmeOf · programmeOf(NULL) is PLAYER", programmeOf(legacy) === "PLAYER");
  const before = await cashOf("prov_ref");
  await onRecruitSettlement("prov_legacy", { operatorNetFee: 10_000, marketId: "mkt_prov_3", positionId: pos() });
  ok("5.nocash · the legacy recruit pays the agent nothing", (await cashOf("prov_ref")) === before, `cash=${await cashOf("prov_ref")} before=${before}`);
  ok("5.norow · …and writes no AGENT row", (await agentRows("prov_ref")).length === 1);

  // ── §6 · self-bind and a dead code ───────────────────────────────────────────────────
  const self = await bindRecruit({ recruitUserId: "prov_ref", code: agentCode });
  ok("6.self · an agent cannot recruit themselves", self.bound === false, JSON.stringify(self));
  await mkFixtureUser("prov_c");
  const dead = await bindRecruit({ recruitUserId: "prov_c", code: "50PICK-AG-NOPE99" });
  ok("6.dead · an unknown code binds nothing and stamps nothing", dead.bound === false && (await db.user.findById("prov_c"))!.recruitedBy == null, JSON.stringify(dead));
} finally {
  setAffiliateConfig({ enabled: snap.enabled, commission: snap.commission }, "test-officer");
}

console.log(`\nattribution-provenance: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
