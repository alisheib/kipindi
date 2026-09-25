/**
 * Anchors for the agent-programme red harness (`scripts/red-agent.mjs`) — one real defect per
 * guard, on the file where it would live, each proven to turn ITS OWN assertion red.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines must be paired with re-anchoring
 * here, or `test:red-anchors` reports ANCHOR FAIL — loudly, by design. DATA, not code: the
 * audit reads this without running anything.
 *
 * `gate` names the package script suffix (`test:<gate>`); `expect` is the label prefix the
 * suite must print after `FAIL ` — a defect caught for the wrong reason cannot print PASS.
 */
export const MUTATIONS = [
  {
    gate: "agent-policy",
    name: "affiliate-service.ts — the AGENT policy pays into BONUS as BONUS_CREDIT (the 'never BONUS_CREDIT' rule)",
    file: "src/lib/server/affiliate-service.ts",
    from: `        destination: "CASH",
        txnType: "AGENT_COMMISSION",`,
    to: `        destination: "BONUS",
        txnType: "BONUS_CREDIT",`,
    expect: "1.cash",
  },
  {
    gate: "programme-isolation",
    name: "affiliate-service.ts — the AGENT policy re-enables flat rewards (the FIRST_BET prize leak)",
    file: "src/lib/server/affiliate-service.ts",
    from: `        flatRewards: false,`,
    to: `        flatRewards: true,`,
    expect: "1.noprize",
  },
  {
    gate: "attribution-provenance",
    name: "affiliate-service.ts — the bind stamps every recruit AGENT regardless of the referrer's programme",
    file: "src/lib/server/affiliate-service.ts",
    from: `    recruitedProgramme: programme,`,
    to: `    recruitedProgramme: "AGENT",`,
    expect: "1.stamp",
  },
  {
    gate: "no-double-pay",
    name: "affiliate-service.ts — the sourceRef re-read under the lock is dropped (the replay pays twice)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (await db.referralReward.findBySourceRef(sourceRef)) return null;`,
    to: `    if (false && await db.referralReward.findBySourceRef(sourceRef)) return null;`,
    expect: "1.once",
  },
  {
    gate: "agent-clawback",
    name: "affiliate-service.ts — the clawback selects only rows that are ALREADY reversed (reverses nothing)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    .filter((r) => r.type === "COMMISSION" && r.status !== "REVERSED");`,
    to: `    .filter((r) => r.type === "COMMISSION" && r.status === "REVERSED");`,
    expect: "1.rows",
  },
  {
    gate: "commission-bounded",
    name: "affiliate-service.ts — the accrual re-grosses the net fee before pricing (pays on money TRA and GBT own)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const grossCut = Math.floor(opts.operatorNetFee * policy.rate);`,
    to: `  const grossCut = Math.floor((opts.operatorNetFee / 0.85) * policy.rate);`,
    expect: "1.equality",
  },
  {
    gate: "agent-eligibility",
    name: "affiliate-service.ts — a deactivated agent keeps standing (the officer's switch does nothing)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (!account.active) return { ok: false, refusal: "agent_deactivated" };`,
    to: `  if (false) return { ok: false, refusal: "agent_deactivated" };`,
    expect: "3.deactivated",
  },
  {
    gate: "agent-application-security",
    name: "agent-application-service.ts — self-review is no longer blocked (an applicant approves their own application)",
    file: "src/lib/server/agent-application-service.ts",
    from: `  if (app.userId === officerId) {`,
    to: `  if (false) {`,
    expect: "3.self",
  },
  {
    gate: "agent-application-security",
    name: "agent-application-service.ts — the referee contact reverts to a bare length check (an unreachable referee passes)",
    file: "src/lib/server/agent-application-service.ts",
    from: `    if (!isReachableContact(value)) {`,
    to: `    if (value.length < 6) {`,
    expect: "2.reach",
  },
  {
    gate: "commission-bounded",
    name: "agent-commission.ts — the withholding tax is skipped and the agent is credited the GROSS",
    file: "src/lib/agent-commission.ts",
    from: `  const taxWithheldTzs = Math.round(gross * (pct / 100));`,
    to: `  const taxWithheldTzs = 0;`,
    expect: "1.tax",
  },
  {
    gate: "commission-bounded",
    name: "agent-commission.ts — the waterfall prices the agent share off the GROSS fee, before TRA and GBT",
    file: "src/lib/agent-commission.ts",
    from: `  const split = agentCommissionSplit(netFee, rates.agentPct, rates.withholdingPct);`,
    to: `  const split = agentCommissionSplit(grossFee, rates.agentPct, rates.withholdingPct);`,
    expect: "7.share",
  },
  // ── THE UNPAID PLAYER INVITE (2026-09-25) ─────────────────────────────────────────────────
  // Six anchors, because the feature's promise is a NEGATIVE and a suite of zeros is the easiest
  // kind to pass by accident. Each one is a real way this could ship broken, on the file where it
  // would live, and each turns ITS OWN assertion red.
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the PLAYER branch stops consulting the product state (the promo pays again, from a config row)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (!playerInviteRewardsLive()) return { ok: false, refusal: "player_rewards_withdrawn" };`,
    to: `  if (false) return { ok: false, refusal: "player_rewards_withdrawn" };`,
    expect: "3.resolver",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the page's read model is told the programme pays (money copy over a refused accrual)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const rewardsLive = playerInviteRewardsLive();`,
    to: `  const rewardsLive = true;`,
    expect: "2.promises",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — an agent out of standing falls back to the player share (a link that can never bind)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  return playerStandingFor(user).ok && !isApprovedAgent(account);`,
    to: `  return playerStandingFor(user).ok;`,
    expect: "1.deactagent",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — a CLOSED / SUSPENDED / SELF_EXCLUDED player keeps recruiting",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (user.status === "CLOSED" || user.status === "SUSPENDED" || user.status === "SELF_EXCLUDED") {`,
    to: `  if (false) {`,
    expect: "1.SELF_EXCLUDED",
  },
  {
    gate: "player-invite-unpaid",
    name: "feature-state.ts — the player branch opens for every viewer, signed out included",
    file: "src/lib/feature-state.ts",
    from: `  return viewer?.playerInviteEligible ? "ACTIVE" : "WITHDRAWN";`,
    to: `  return "ACTIVE";`,
    expect: "1.signedout",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the operator's payables roster is cut back to a top ten (the eleventh inviter is never paid)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    .sort((a, b) => b.recruits - a.recruits || b.earnedTzs - a.earnedTzs);`,
    to: `    .sort((a, b) => b.recruits - a.recruits || b.earnedTzs - a.earnedTzs).slice(0, 10);`,
    expect: "6.full",
  },
];
