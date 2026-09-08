/**
 * AGENT ELIGIBILITY — who may recruit and earn is a question of STANDING, never of ROLE.
 *
 * 🔴 THE TRAP (2026-09-07): three predeploy guards fixtured an "agent" as `role: "AGENT"` and
 * nothing else, and `inviteStateFor` keyed on the role. A row with a role and no approval is
 * not an agent; a suspended, closed or self-excluded agent has stopped being one; a deactivated
 * agent is paused. Each arm below is a refusal with the CONTROL beside it — the same account,
 * one field flipped back, live again — so a gate that refused everyone would go red on the
 * control, and a gate that admitted everyone would go red on the refusal.
 *
 * Red harness: `npm run red:agent-eligibility`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, deactivateFixtureAgent, cashOf, netAfterWht } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement, agentStandingFor, inviteViewerFor, ensureAffiliateAccount } from "../src/lib/server/affiliate-service.ts";
import { inviteIsLiveFor, inviteStateFor, NO_VIEWER } from "../src/lib/feature-state.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
let n = 0;
const live = async (uid: string) => inviteIsLiveFor(await inviteViewerFor(uid));
const standing = async (uid: string) => agentStandingFor((await db.user.findById(uid))!, await db.affiliate.findByUserId(uid));
const tryBind = async (code: string) => { const rec = `el_rec_${++n}`; await mkFixtureUser(rec); return bindRecruit({ recruitUserId: rec, code }); };

// ── §1 · CONTROL — an approved, active agent on an ACTIVE account is live ───────────────
await mkFixtureUser("el_agent");
const code = await approveFixtureAgent("el_agent", { commissionPct: 20 });
ok("1.control · approved + active + ACTIVE → the invite surface is LIVE for them", await live("el_agent"));
ok("1.standing · agentStandingFor says ok", (await standing("el_agent")).ok === true, JSON.stringify(await standing("el_agent")));
ok("1.bind · their code binds", (await tryBind(code)).bound === true);
ok("1.state · inviteStateFor reads ACTIVE, not the withdrawn product state", inviteStateFor(await inviteViewerFor("el_agent")) === "ACTIVE");

// ── §2 · THE TRAP — a role with no approval is nobody ──────────────────────────────────
await mkFixtureUser("el_roleonly", { role: "AGENT" });
const roleCode = (await ensureAffiliateAccount("el_roleonly")).code;
ok("2.role · role AGENT with no approvedAt is NOT live", !(await live("el_roleonly")));
ok("2.standing · standing refuses: agent_not_approved", (await standing("el_roleonly")).ok === false && (await standing("el_roleonly") as { refusal?: string }).refusal === "agent_not_approved", JSON.stringify(await standing("el_roleonly")));
ok("2.bind · their code does not bind (the player promo is withdrawn)", (await tryBind(roleCode)).bound === false);

// ── §3 · DEACTIVATED — paused, and reactivation is the control ─────────────────────────
await mkFixtureUser("el_deact");
const deactCode = await approveFixtureAgent("el_deact", { commissionPct: 20 });
const recruitBefore = `el_rec_${++n}`;
await mkFixtureUser(recruitBefore);
await bindRecruit({ recruitUserId: recruitBefore, code: deactCode });
await deactivateFixtureAgent("el_deact");
ok("3.deactivated · a deactivated agent is not live", !(await live("el_deact")));
ok("3.bind · …their code no longer binds", (await tryBind(deactCode)).bound === false);
await onRecruitSettlement(recruitBefore, { operatorNetFee: 10_000, marketId: "mkt_el_1", positionId: "pos_el_1" });
ok("3.accrue · …and an existing recruit's settlement pays them nothing while paused", (await cashOf("el_deact")) === 0, `cash=${await cashOf("el_deact")}`);
await db.affiliate.update("el_deact", { active: true, deactivatedAt: null });
ok("3.control · reactivated → live again", await live("el_deact"));
ok("3.control.bind · …and binding again", (await tryBind(deactCode)).bound === true);
await onRecruitSettlement(recruitBefore, { operatorNetFee: 10_000, marketId: "mkt_el_1", positionId: "pos_el_2" });
ok("3.control.accrue · …and accruing again (prospective, TZS 2,000 gross)", (await cashOf("el_deact")) === netAfterWht(2_000), `cash=${await cashOf("el_deact")}`);

// ── §4 · ACCOUNT STATUS ends the relationship — each with its control ──────────────────
for (const status of ["SUSPENDED", "CLOSED", "SELF_EXCLUDED"] as const) {
  const uid = `el_${status.toLowerCase()}`;
  await mkFixtureUser(uid);
  const c = await approveFixtureAgent(uid, { commissionPct: 20 });
  ok(`4.${status}.control · live while ACTIVE`, await live(uid));
  await db.user.update(uid, { status });
  ok(`4.${status} · not live once ${status}`, !(await live(uid)));
  ok(`4.${status}.bind · code does not bind`, (await tryBind(c)).bound === false);
  ok(`4.${status}.standing · standing names the refusal`, (await standing(uid)).ok === false, JSON.stringify(await standing(uid)));
}

// ── §5 · COOLED_OFF is a break about their own play — standing survives ────────────────
await mkFixtureUser("el_cool");
const coolCode = await approveFixtureAgent("el_cool", { commissionPct: 20 });
await db.user.update("el_cool", { status: "COOLED_OFF" });
ok("5.cooled · a cooling-off agent keeps standing (the accrual becomes a PENDING payable instead)", (await standing("el_cool")).ok === true, JSON.stringify(await standing("el_cool")));
ok("5.bind · …and still recruits", (await tryBind(coolCode)).bound === true);

// ── §6 · an ordinary player and nobody at all ──────────────────────────────────────────
await mkFixtureUser("el_player");
ok("6.player · a PLAYER is not live (the promo is withdrawn)", !(await live("el_player")));
ok("6.nobody · no viewer is never live", !inviteIsLiveFor(NO_VIEWER) && !inviteIsLiveFor(null));
ok("6.unknown · an unknown user id resolves to no viewer", !(await live("el_does_not_exist")));

console.log(`\nagent-eligibility: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
