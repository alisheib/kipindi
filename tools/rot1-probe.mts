/**
 * rot1 PROBE - replicates programme-isolation.test.mts section 1 (agent) / section 2 (player) FIRST_BET step
 * and prints everything the suite does not show. Read-only against src/; run with the plant in place.
 *
 *   PROBE_WHO=agent|player   which referrer to use
 *   PROBE_FORCE=0|1          1 = set FEATURE_INVITEREWARDS=ACTIVE (+ FEATURE_INVITE=ACTIVE) BEFORE the bet,
 *                            exactly as the suite's section 2 control does
 */
import "file:///F:/kipindi-rot1/scripts/lib/verified-fixtures.mts";
import "file:///F:/kipindi-rot1/scripts/lib/bonus-feature-on.mts";
import { db } from "file:///F:/kipindi-rot1/src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf, bonusOf } from "file:///F:/kipindi-rot1/scripts/lib/agent-fixtures.mts";
import { bindRecruit, onRecruitBet, ensureAffiliateAccount, accrualContextFor } from "file:///F:/kipindi-rot1/src/lib/server/affiliate-service.ts";
import { setAffiliateConfig } from "file:///F:/kipindi-rot1/src/lib/server/affiliate-config.ts";
import { setBonusConfig } from "file:///F:/kipindi-rot1/src/lib/server/bonus-config.ts";
import { getAuditPage } from "file:///F:/kipindi-rot1/src/lib/server/audit.ts";
import { refreshInvitePayable, playerInvitePayable } from "file:///F:/kipindi-rot1/src/lib/server/invite-rewards-switch.ts";
import { inviteRewardsCeiling } from "file:///F:/kipindi-rot1/src/lib/feature-state.ts";

const WHO = process.env.PROBE_WHO ?? "agent";
const FORCE = process.env.PROBE_FORCE === "1";
const out = (...a: unknown[]) => console.log("PROBE", ...a);

setBonusConfig({ enabled: true }, "test-officer");
const armed = setAffiliateConfig({
  enabled: true,
  commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: true, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 1_000, requireDeposit: false },
}, "test-officer");
out("setup armed.ok =", armed.ok);

if (FORCE) {
  process.env.FEATURE_INVITEREWARDS = "ACTIVE";
  process.env.FEATURE_INVITE = "ACTIVE";
}
out("WHO =", WHO, " FORCE =", FORCE, " FEATURE_INVITEREWARDS =", process.env.FEATURE_INVITEREWARDS ?? "(unset)");

let refId = "probe_ref", recId = "probe_rec";
await mkFixtureUser(refId);
let code: string;
if (WHO === "agent") code = await approveFixtureAgent(refId, { commissionPct: 20 });
else code = (await ensureAffiliateAccount(refId)).code;
await mkFixtureUser(recId);
const bound = await bindRecruit({ recruitUserId: recId, code });
out("bind =", JSON.stringify(bound));

out("inviteRewardsCeiling() =", JSON.stringify(inviteRewardsCeiling()));
out("playerInvitePayable() =", playerInvitePayable(), "  refreshInvitePayable() =", await refreshInvitePayable());

const ctx = await accrualContextFor(recId);
out("accrualContextFor ->", ctx.ok ? `ok programme=${ctx.ctx.policy.programme} flatRewards=${ctx.ctx.policy.flatRewards} destination=${ctx.ctx.policy.destination}` : `REFUSED ${ctx.refusal}`);

// spy: does payPrize reach its per-referrer lock? (its first action there is listByRecruit)
let listByRecruitCalls = 0;
const origLBR = db.referralReward.listByRecruit.bind(db.referralReward);
db.referralReward.listByRecruit = (async (...a: Parameters<typeof origLBR>) => { listByRecruitCalls++; return origLBR(...a); }) as typeof db.referralReward.listByRecruit;

const seen = new Set(getAuditPage({ limit: 1_000_000 }).map((e) => e.id));
out("BEFORE bet  cash =", await cashOf(refId), " bonus =", await bonusOf(refId));
await onRecruitBet(recId, { stake: 25_000 } as never);   // exactly the suite's call (no houseBotId key)
out("AFTER  bet  cash =", await cashOf(refId), " bonus =", await bonusOf(refId));
out("listByRecruit calls during onRecruitBet (payPrize lock entered if >0) =", listByRecruitCalls);

const rows = await db.referralReward.listByReferrer(refId);
out("reward rows =", JSON.stringify(rows.map((r) => ({ type: r.type, status: r.status, amount: r.amountTzs, programme: r.programme }))));
const fresh = getAuditPage({ limit: 1_000_000 }).filter((e) => !seen.has(e.id)).reverse();
out("audit rows written by onRecruitBet:", fresh.length === 0 ? "(none)" : "");
for (const e of fresh) out("   ", e.category, e.action, JSON.stringify(e.payload));
