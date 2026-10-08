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
    // Added 2026-10-08 with the suite's §1 fix (its agent arm now runs with the money switched on, as §2's
    // control does): the same leak by the other door — the policy is right, but the hook stops asking it.
    gate: "programme-isolation",
    name: "affiliate-service.ts — onRecruitBet stops branching on the policy (the FIRST_BET prize leak, by the hook)",
    file: "src/lib/server/affiliate-service.ts",
    from: `if (!policy.flatRewards) {`,
    to: `if (false) {`,
    expect: "1.noprize",
  },
  {
    gate: "programme-isolation",
    name: "affiliate-service.ts — the bind's SIGNUP bonus stops asking which programme recruited (an agent's recruit is paid it)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (programme === "PLAYER" && cfg.enabled && cfg.bonus.enabled`,
    to: `  if (cfg.enabled && cfg.bonus.enabled`,
    expect: "1.nosignup",
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
  // ⚠️ RE-ANCHORED 2026-09-26: the first two quoted `playerInviteRewardsLive()`, which was DELETED
  // when the invite's money became the Owner's switch; they now quote the switch's readers.
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the PLAYER branch stops consulting the Owner's switch (the promo pays again, from a config row)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (!playerInvitePayable()) return { ok: false, refusal: "player_rewards_withdrawn" };`,
    to: `  if (false) return { ok: false, refusal: "player_rewards_withdrawn" };`,
    expect: "3.resolver",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the page's read model is told the programme pays (money copy over a refused accrual)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const rewardsLive = await playerInvitePayableNow();`,
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
  // ── THE OWNER'S SWITCH — "Payable / Not payable" (2026-09-26), test:player-invite-unpaid §8 ─
  // Each is a way the switch could ship broken while every page still said "Not payable": a parser
  // that coerces, a kill that stops nothing, a ceremony any officer can walk through, a Save that is
  // not locked, a ceiling that is only a sentence, and a money path that trusts a stale cache.
  // In-memory mode; the stale-cache cases go through the suite's store seam ("another container").
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — the parser COERCES a non-boolean payable (a sealed \"true\" reads as ON)",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `    if (typeof rec.payable !== "boolean") return { kind: "MALFORMED", why: "payable is not a boolean" };`,
    to: `    if (typeof rec.payable !== "boolean") rec.payable = !!rec.payable;`,
    expect: "8.malformed.string",
  },
  {
    gate: "player-invite-unpaid",
    name: "feature-state.ts — FEATURE_INVITEREWARDS=WITHDRAWN is no longer read (the hard kill stops nothing the Owner started)",
    file: "src/lib/feature-state.ts",
    from: `  if (raw === "WITHDRAWN") return { ceiling: "CLOSED", source: "ENV" };`,
    to: `  if (false) return { ceiling: "CLOSED", source: "ENV" };`,
    expect: "8.kill.accrual",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — a CLOSED ceiling composes to pay (the kill is read, then ignored)",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `    case "CLOSED": return false;`,
    to: `    case "CLOSED": return true;`,
    expect: "8.kill.accrual",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the Owner check is reduced to 'has a role' (a GROWTH officer makes invites payable)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (role !== "ADMIN") {`,
    to: `  if (!role) {`,
    expect: "8.refused.growth",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the typed words MAKE PAYABLE are no longer checked on the server",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if ((typeof post.typed === "string" ? post.typed.trim() : "") !== INVITE_PAYABLE_WORD) {`,
    to: `    if (false) {`,
    expect: "8.refused.word",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reason floor is dropped (money starts on a four-letter reason)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (reason.length < INVITE_REASON_MIN) return { ok: false, error: COPY.reasonShort, field: "reason" };`,
    to: `  if (false) return { ok: false, error: COPY.reasonShort, field: "reason" };`,
    expect: "8.refused.reason",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reward Save is no longer locked while Not payable",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (!settingsPayable) return { ok: false, error: COPY.locked };`,
    to: `    if (false) return { ok: false, error: COPY.locked };`,
    expect: "8.locked.save",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — the 50% commission ceiling is raised to 100% (the rule becomes a sentence again)",
    file: "src/lib/affiliate-rules.ts",
    from: `export const PLAYER_MAX_COMMISSION_RATE = 0.5;`,
    to: `export const PLAYER_MAX_COMMISSION_RATE = 1;`,
    expect: "8.validate.rate",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — effectivePlayerTerms stops clamping the rate (a 90% row that bypassed validation is paid at 90%)",
    file: "src/lib/affiliate-rules.ts",
    from: `    rate: pays && rate !== null ? Math.min(rate, PLAYER_MAX_COMMISSION_RATE) : 0,`,
    to: `    rate: pays && rate !== null ? rate : 0,`,
    expect: "8.clamp",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — policyFor prices the PLAYER rate from the raw config instead of the clamped terms",
    file: "src/lib/server/affiliate-service.ts",
    from: `      rate: terms.rate,`,
    to: `      rate: cfg.commission.enabled ? cfg.commission.rate : 0,`,
    expect: "8.clamp",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — accrualContextFor trusts this container's snapshot (a Stop paying pressed elsewhere is not obeyed)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    const payableNow = await refreshInvitePayable();`,
    to: `    const payableNow = true;`,
    expect: "8.fresh.commission",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payPrize trusts the accrual's earlier read (a stop landing in between still pays the prize)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const prizePayableNow = await refreshInvitePayable();`,
    to: `  const prizePayableNow = true;`,
    expect: "8.fresh.prize",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payBonus trusts the accrual's earlier read (a stop landing in between still pays the bonus)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const bonusPayableNow = await refreshInvitePayable();`,
    to: `  const bonusPayableNow = true;`,
    expect: "8.fresh.bonus",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the seq the page was rendered on is not compared under the lock",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (expectSeq !== currentSeq) return { ok: false, error: COPY.seqStale, field: "seq" };`,
    to: `    if (false) return { ok: false, error: COPY.seqStale, field: "seq" };`,
    expect: "8.refused.seq",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — \"the settings on this page\" is armed without checking the price the Owner saw",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      if (start === "AS_SHOWN" && post.pricedFingerprint !== affiliateConfigFingerprint(cfgBefore)) {`,
    to: `      if (false) {`,
    expect: "8.refused.fingerprint",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — \"Nothing yet\" leaves the shipped prize ON",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `const ALL_MODES_OFF: AffiliateConfigUpdate = { enabled: true, commission: { enabled: false }, bonus: { enabled: false }, prize: { enabled: false } };`,
    to: `const ALL_MODES_OFF: AffiliateConfigUpdate = { enabled: true, commission: { enabled: false }, bonus: { enabled: false } };`,
    expect: "8.on.modes",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the Save no longer drops `enabled` (a crafted form pauses or re-arms the programme)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    return setAffiliateConfigVerified(rewards, officerId);`,
    to: `    return setAffiliateConfigVerified(updates, officerId);`,
    expect: "8.locked.enabled",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — a failed store read keeps the last answer (an unreadable row stays ON)",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `    return res.ok ? parseStoredSwitch(res.value) : UNREAD;`,
    to: `    return res.ok ? parseStoredSwitch(res.value) : snap().stored;`,
    expect: "8.unread.fail",
  },
  // ── DEPOSIT-TIED REWARDS ARE RETIRED (2026-09-26), test:player-invite-unpaid §8.retired ─────
  // The RG policy promises "No bonus offers tied to deposit increases": the FIRST_DEPOSIT bonus and
  // the DEPOSIT_THRESHOLD prize are refused on save, switched OFF on load, never priced, never paid.
  // Each mutation below brings one of those back. ⚠️ The two payer guards are proven by a config that
  // changes to a retired mode BETWEEN the hook's own check and the payer's read (the suite's store
  // seam runs the change mid-read). The "depth" pairs — the bind/bet check AND the payer guard both
  // removed — are not declared: red-agent plants ONE contiguous anchor per mutation, and each pair's
  // two lines sit far apart in different functions; each guard alone is already proven red.
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — the bonus trigger rule accepts FIRST_DEPOSIT again (a bonus for depositing can be saved)",
    file: "src/lib/affiliate-rules.ts",
    from: `    trigger: { ok: oneOf<BonusTrigger>("SIGNUP"), reason: DEPOSIT_TRIGGER_RETIRED_REASON },`,
    to: `    trigger: { ok: oneOf<string>("SIGNUP", "FIRST_DEPOSIT"), reason: DEPOSIT_TRIGGER_RETIRED_REASON },`,
    expect: "8.retired.trigger",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — the prize milestone rule accepts DEPOSIT_THRESHOLD again (a prize for depositing can be saved)",
    file: "src/lib/affiliate-rules.ts",
    from: `    milestone: { ok: oneOf<PrizeMilestone>("FIRST_BET"), reason: DEPOSIT_MILESTONE_RETIRED_REASON },`,
    to: `    milestone: { ok: oneOf<string>("FIRST_BET", "DEPOSIT_THRESHOLD"), reason: DEPOSIT_MILESTONE_RETIRED_REASON },`,
    expect: "8.retired.milestone",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — load repair RE-POINTS an unreadable choice instead of switching the mode off (a stored deposit bonus loads as a live sign-up bonus)",
    file: "src/lib/affiliate-rules.ts",
    // ⚠️ RE-ANCHORED 2026-09-27: the rule now covers EVERY field of a mode, not only its choices (CHOICE_KEYS is gone).
    from: `    if (Object.keys(rules).some((key) => key !== "enabled" && !rules[key].ok(part[key]))) out.enabled = false;`,
    to: `    void rules;`,
    expect: "8.retired.load",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — load repair switches a mode off only for an unreadable CHOICE again (a fractional cap loads the mode ON, uncapped)",
    file: "src/lib/affiliate-rules.ts",
    from: `    if (Object.keys(rules).some((key) => key !== "enabled" && !rules[key].ok(part[key]))) out.enabled = false;`,
    to: `    if (["recipient", "trigger", "milestone"].some((key) => key in rules && !rules[key].ok(part[key]))) out.enabled = false;`,
    expect: "8.corrupt",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — the price counts a bonus on any trigger (a retired deposit bonus is quoted to the Owner as paying)",
    file: "src/lib/affiliate-rules.ts",
    from: `    if (b.enabled === true && b.trigger === "SIGNUP") {`,
    to: `    if (b.enabled === true) {`,
    expect: "8.retired.price.bonus",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — the price counts a prize on any milestone (a retired deposit prize is quoted to the Owner as paying)",
    file: "src/lib/affiliate-rules.ts",
    from: `    if (p.enabled === true && p.milestone === "FIRST_BET" && prizeTzs > 0) {`,
    to: `    if (p.enabled === true && prizeTzs > 0) {`,
    expect: "8.retired.price.prize",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the deposit hook stays SILENT about a retired mode left armed (no player_deposit_trigger_retired)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (retiredOnDeposit.bonus || retiredOnDeposit.prize) {`,
    to: `  if (false) {`,
    expect: "8.retired.deposit.audit",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — a deposit PAYS again (the hook calls the bonus payer, as it did before the retirement)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const retiredOnDeposit = armedRetiredDepositModes();`,
    to: `  await payBonus({ referrerUserId: attribution.referrerUserId, recruitUserId, held: false }); const retiredOnDeposit = armedRetiredDepositModes();`,
    expect: "8.retired.deposit.zero",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payBonus pays a bonus on any trigger (the belt under the bind's check is gone)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (bonusTriggerNow !== "SIGNUP") {`,
    to: `  if (false) {`,
    expect: "8.retired.payer.bonus",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payPrize pays a prize on any milestone (the belt under the bet's check is gone)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (prizeMilestoneNow !== "FIRST_BET") {`,
    to: `  if (false) {`,
    expect: "8.retired.payer.prize",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the requireDeposit read FAILS OPEN again (a failed read pays the prize)",
    file: "src/lib/server/affiliate-service.ts",
    from: `      } catch { hasDeposited = false; }`,
    to: `      } catch { hasDeposited = true; }`,
    expect: "8.retired.failclosed",
  },
  // ── THE SWITCH IN DATABASE MODE (2026-09-26), test:invite-payable-db ────────────────────────
  // ⛔ ITS OWN GATE, BECAUSE WITH NO DATABASE_URL A RELOAD READS NOTHING and every mutation below
  // would be invisible to the in-memory suite. Each is a way a container could pay from the reward
  // settings it BOOTED with after the Owner changed them on another container, or pay while the
  // settings row cannot be read. ⚠️ A "fail open" mutation in a payer must change the refusal AND
  // the `const cfg = …` line together (one anchor spanning both): changing only the refusal leaves
  // `cfg` undefined, the payer throws, nothing is paid, and the defect is masked.
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — accrualContextFor stops re-reading the settings row (prices from the stale boot cache)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    const configNow = await reloadAffiliateConfig();`,
    to: `    const configNow = { ok: true };`,
    expect: "2.price",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — accrualContextFor does not refuse when the settings row cannot be read",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (!configNow.ok) return { ok: false, refusal: "player_config_unreadable", attribution };`,
    to: `    if (false) return { ok: false, refusal: "player_config_unreadable", attribution };`,
    expect: "2.cfgfail.refused",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payPrize prices from this container's cache instead of the row",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const prizeConfigNow = await reloadAffiliateConfig();`,
    to: `  const prizeConfigNow = { ok: true, config: getAffiliateConfig() };`,
    expect: "2.payprize",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payBonus prices from this container's cache instead of the row",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const bonusConfigNow = await reloadAffiliateConfig();`,
    to: `  const bonusConfigNow = { ok: true, config: getAffiliateConfig() };`,
    expect: "2.paybonus",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payPrize FAILS OPEN: an unreadable settings row falls back to the cache",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (!prizeConfigNow.ok) {
    auditRefusal("affiliate.accrual_refused", "player_config_unreadable", opts.recruitUserId, null, { hook: "prize", referrerUserId: opts.referrerUserId, programme: "PLAYER" });
    return;
  }
  const cfg = prizeConfigNow.config;`,
    to: `  if (false) {
    auditRefusal("affiliate.accrual_refused", "player_config_unreadable", opts.recruitUserId, null, { hook: "prize", referrerUserId: opts.referrerUserId, programme: "PLAYER" });
    return;
  }
  const cfg = prizeConfigNow.ok ? prizeConfigNow.config : getAffiliateConfig();`,
    expect: "2.prizefail",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payBonus FAILS OPEN: an unreadable settings row falls back to the cache",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (!bonusConfigNow.ok) {
    auditRefusal("affiliate.accrual_refused", "player_config_unreadable", opts.recruitUserId, null, { hook: "bonus", referrerUserId: opts.referrerUserId, programme: "PLAYER" });
    return;
  }
  const cfg = bonusConfigNow.config;`,
    to: `  if (false) {
    auditRefusal("affiliate.accrual_refused", "player_config_unreadable", opts.recruitUserId, null, { hook: "bonus", referrerUserId: opts.referrerUserId, programme: "PLAYER" });
    return;
  }
  const cfg = bonusConfigNow.ok ? bonusConfigNow.config : getAffiliateConfig();`,
    expect: "2.bonusfail",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — the settings are re-read BEFORE the switch (an unpaid platform pays for every read)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    const payableNow = await refreshInvitePayable();`,
    to: `    await reloadAffiliateConfig(); const payableNow = await refreshInvitePayable();`,
    expect: "2.unpaid.reads",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — reload FAILS OPEN: a read that could not ask answers the cached value",
    file: "src/lib/server/define-config.ts",
    from: `      if (!res.ok) return { ok: false, error: res.error };`,
    to: `      if (!res.ok) return { ok: true, config: get() };`,
    expect: "1.fail",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — reload answers the row but does not replace the cache the hooks read",
    file: "src/lib/server/define-config.ts",
    from: `      registry.set(key, next);`,
    to: `      void next;`,
    expect: "1.replace",
  },
  // ⚠️ RE-ANCHORED 2026-09-27: an overtaken read now answers only when it AGREES with the local write, and
  // otherwise fails closed (ok:false) — it no longer answers the local value alone.
  {
    gate: "invite-payable-db",
    name: "define-config.ts — a reload overtaken by a local save lands anyway (puts the older value back)",
    file: "src/lib/server/define-config.ts",
    from: `      if (genOf(key) !== genAtStart) {`,
    to: `      if (false) {`,
    expect: "1.overtaken",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — an overtaken reload answers the LOCAL value whatever it read (a newer row it just read is discarded)",
    file: "src/lib/server/define-config.ts",
    from: `        return sameConfig(next, local) ? { ok: true, config: local, stored: !!res.value } : { ok: false, error: "The settings changed while they were being read. Try again." };`,
    to: `        return { ok: true, config: local, stored: !!res.value };`,
    expect: "1.overtaken",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — an overtaken reload refuses even when the read and the local write AGREE (every save during a read fails the next payer)",
    file: "src/lib/server/define-config.ts",
    from: `        return sameConfig(next, local) ? { ok: true, config: local, stored: !!res.value } : { ok: false, error: "The settings changed while they were being read. Try again." };`,
    to: `        return { ok: false, error: "The settings changed while they were being read. Try again." };`,
    expect: "1.overtaken.agree",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — reload does not wait for this process's own pending set() save",
    file: "src/lib/server/define-config.ts",
    from: `      await pendingSave.get(key);`,
    to: `      void pendingSave.get(key);`,
    expect: "1.pending",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — a slow boot hydration lands over a newer reload",
    file: "src/lib/server/define-config.ts",
    from: `        if (res.value && genOf(key) === genAtStart) {`,
    to: `        if (res.value) {`,
    expect: "1.slowboot",
  },
  {
    gate: "invite-payable-db",
    name: "define-config.ts — concurrent reloads no longer share one read",
    file: "src/lib/server/define-config.ts",
    from: `    if (shared) return shared;`,
    to: `    if (false) return shared;`,
    expect: "1.share",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — Make payable stops re-reading the settings row (merges onto a stale container's copy)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      const cfgRow = await reloadAffiliateConfig();`,
    to: `      const cfgRow = { ok: true };`,
    expect: "3.asshown",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — Make payable goes ahead when the settings row cannot be read",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      if (!cfgRow.ok) return { ok: false, error: COPY.configUnread };`,
    to: `      if (false) return { ok: false, error: COPY.configUnread };`,
    expect: "3.cfgunread",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — the reward Save merges onto this container's cache instead of the row",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    const rowNow = await reloadAffiliateConfig();`,
    to: `    const rowNow = { ok: true, config: getAffiliateConfig() };`,
    expect: "3.savemerge",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — the reward Save FAILS OPEN: an unreadable settings row falls back to the cache",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    // ⚠️ RE-ANCHORED 2026-09-27: the fail-open reaches the fingerprint check and the "before" too, or the planted
    // defect throws on the undefined config and is masked as a pre-write refusal.
    from: `    if (!rowNow.ok) return { ok: false, error: COPY.saveConfigUnread };
    if (rowNow.config.enabled !== true) return { ok: false, error: COPY.locked };
    if (affiliateConfigFingerprint(rowNow.config) !== baseFingerprint) return { ok: false, error: COPY.settingsMoved };
    seen.before = rowNow.config;`,
    to: `    const rowCfg = rowNow.ok ? rowNow.config : getAffiliateConfig();
    if (rowCfg.enabled !== true) return { ok: false, error: COPY.locked };
    if (affiliateConfigFingerprint(rowCfg) !== baseFingerprint) return { ok: false, error: COPY.settingsMoved };
    seen.before = rowCfg;`,
    expect: "3.saveunread",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-config.ts — the row is no longer NOTED as it is read (a stored deposit mode is loaded OFF and then forgotten: the deposit refuses in silence)",
    file: "src/lib/server/affiliate-config.ts",
    from: `    noteRowRetiredModes(persisted);`,
    to: `    void persisted;`,
    expect: "4.deposit",
  },
  // ── THE REVIEW ROUND (2026-09-26/27) — every core fix, each turning ITS OWN label red ────────────
  // In-memory cases: test:player-invite-unpaid §8 (8.inlock, 8.twotab, 8.terms, 8.nothing/8.paying, 8.attempt,
  // 8.rearm, 8.unknown, 8.save, 8.overtaken, 8.dialogs, 8.log, 8.label, 8.reason, 8.armed, 8.client, 8.corrupt).
  // Database-mode cases: test:invite-payable-db §1, §5 (records the database refuses), §6 (no settings row).
  // ⚠️ The two in-lock payer anchors span TWO lines: the 4-space `if (!(await confirmInvitePayableNow())) {` is a
  // substring of the 6-space one, so only the refusal line beneath each (hook prize / hook bonus) makes it unique.
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payPrize credits without re-reading the switch inside its lock (a Stop landing while it waited still pays)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (!(await confirmInvitePayableNow())) {
      auditRefusal("affiliate.accrual_refused", "player_rewards_withdrawn", opts.recruitUserId, null, { hook: "prize", referrerUserId: opts.referrerUserId, programme: "PLAYER", stage: "credit" });`,
    to: `    if (false) {
      auditRefusal("affiliate.accrual_refused", "player_rewards_withdrawn", opts.recruitUserId, null, { hook: "prize", referrerUserId: opts.referrerUserId, programme: "PLAYER", stage: "credit" });`,
    expect: "8.inlock.prize",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — payBonus credits without re-reading the switch inside its lock",
    file: "src/lib/server/affiliate-service.ts",
    from: `      if (!(await confirmInvitePayableNow())) {
        auditRefusal("affiliate.accrual_refused", "player_rewards_withdrawn", opts.recruitUserId, null, { hook: "bonus", referrerUserId: opts.referrerUserId, programme: "PLAYER", stage: "credit", recipient: who });`,
    to: `      if (false) {
        auditRefusal("affiliate.accrual_refused", "player_rewards_withdrawn", opts.recruitUserId, null, { hook: "bonus", referrerUserId: opts.referrerUserId, programme: "PLAYER", stage: "credit", recipient: who });`,
    expect: "8.inlock.bonus",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the commission payer credits without re-reading the switch inside its lock",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (policy.programme === "PLAYER" && !(await confirmInvitePayableNow())) {`,
    to: `    if (false) {`,
    expect: "8.inlock.commission",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the in-lock recheck is applied to AGENT commission too (the Owner's invite switch withholds contracted agent income)",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (policy.programme === "PLAYER" && !(await confirmInvitePayableNow())) {`,
    to: `    if (!(await confirmInvitePayableNow())) {`,
    expect: "4.paid",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reward Save no longer checks the base fingerprint (an older tab writes over a change it never saw)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (affiliateConfigFingerprint(rowNow.config) !== baseFingerprint) return { ok: false, error: COPY.settingsMoved };`,
    to: `    if (false) return { ok: false, error: COPY.settingsMoved };`,
    expect: "8.twotab.refused",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — changedRewardFields posts EVERY field, not only the changed ones (the page-load values ride along again)",
    file: "src/lib/affiliate-rules.ts",
    from: `      if (JSON.stringify(now[key]) !== JSON.stringify(was[key])) (out[section] ??= {})[key] = now[key];`,
    to: `      (out[section] ??= {})[key] = now[key];`,
    expect: "8.twotab.changes",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — a Save that raises the terms writes no COMPLIANCE affiliate.reward.terms row",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (terms.raised.length === 0) return saved;`,
    to: `  if (true) return saved;`,
    expect: "8.terms.arm",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — a cap dropped to 0 (UNCAPPED) is read as a cap LOWERED, so it writes no terms row",
    file: "src/lib/affiliate-rules.ts",
    from: `const capLoosened: TermRaise = (was, now) => numOr0(was) > 0 && (numOr0(now) === 0 || numOr0(now) > numOr0(was));`,
    to: `const capLoosened: TermRaise = (was, now) => numOr0(now) > numOr0(was);`,
    expect: "8.terms.row · the prize cap loosened to 0",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — invitePaysPlayers asks the switch and the pause only ('Nothing yet' tells players 'Invite & Earn')",
    file: "src/lib/affiliate-rules.ts",
    from: `    && !priceInviteRewards(cfg, { destination: "CASH", rosterRecruitsPerInviter: [] }).nothingPays;`,
    to: `    && true;`,
    expect: "8.nothing.helper",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the invite page's 'paid' is the switch alone (rewardsLive over 'Nothing yet')",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const paysPlayers = screenCfg !== null && invitePaysPlayers(rewardsLive, screenCfg);`,
    to: `  const paysPlayers = screenCfg !== null && rewardsLive;`,
    expect: "8.nothing.page",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-service.ts — the register ribbon's 'paid' is the switch alone (a welcome bonus offered while paused)",
    file: "src/lib/server/affiliate-service.ts",
    from: `  const ribbonPays = ribbonCfg !== null && invitePaysPlayers(payable, ribbonCfg);`,
    to: `  const ribbonPays = ribbonCfg !== null && payable;`,
    expect: "8.paying.paused",
  },
  {
    gate: "player-invite-unpaid",
    name: "api/health/route.ts — `paying` reports the switch alone (the live checks branch on a payable that pays nothing)",
    file: "src/app/api/health/route.ts",
    from: `    const invitePaying = invitePayable ? await invitePaysPlayersNow().catch(() => false) : false;`,
    to: `    const invitePaying = invitePayable;`,
    expect: "8.nothing.health",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — Make payable writes before its attempt row is on record",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      if (!(await recordAttempt(actorId, { to, reason, seq: record.seq, ceiling, start, rearm: storedOn }))) return { ok: false, error: COPY.attemptUnrecorded };`,
    to: `      void recordAttempt;`,
    expect: "8.attempt.first",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — Stop paying writes before its attempt row is on record",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (!(await recordAttempt(actorId, { to, reason, seq: record.seq, ceiling, start: null, rearm: false }))) return { ok: false, error: COPY.attemptUnrecorded };`,
    to: `    void recordAttempt;`,
    expect: "8.attempt.off",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — a re-arm whose switch record fails is reported as NOT payable (the settings write alone made it payable)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      if (after.payable) {`,
    to: `      if (after.payable && written?.ok === true) {`,
    expect: "8.rearm.norecord",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — a re-arm is recorded as an ordinary switch-on (no 'rearmed', no 're-armed from service-level pause')",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    ...(inLock.rearmed ? { rearmed: true, note: "re-armed from service-level pause", recordUpdated: inLock.recordUpdated } : {}),`,
    to: `    ...({}),`,
    expect: "8.rearm.row",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — Make payable whose outcome cannot be read back says 'not stored' (a guess, maybe false)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `      const after = await readPayableOutcome(ceiling, true);
      if (!after.known) return { unknown: true };`,
    to: `      const after = await readPayableOutcome(ceiling, true);
      if (!after.known) return { ok: false, error: COPY.notStored };`,
    expect: "8.unknown.on",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — Stop paying whose outcome cannot be read back says 'payment was NOT stopped' (a guess, maybe false)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    const after = await readPayableOutcome(ceiling, false);
    if (!after.known) return { unknown: true };`,
    to: `    const after = await readPayableOutcome(ceiling, false);
    if (!after.known) return { ok: false, error: COPY.notStoredOff };`,
    expect: "8.unknown.off",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — a throw once the writes began escapes to the action, which tells the Owner 'nothing changed'",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    else if (act.writesBegan) inLock = { unknown: true };`,
    to: `    else if (false) inLock = { unknown: true };`,
    expect: "8.unknown.throw",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reward Save rethrows a throw AFTER its write began (the action then says 'nothing was saved')",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (!seen.writeBegan) throw err;`,
    to: `    throw err;`,
    expect: "8.save.unknown",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reward Save swallows a throw BEFORE its write began as 'Outcome unknown' (a clean refusal reads as a maybe)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    if (!seen.writeBegan) throw err;`,
    to: `    if (false) throw err;`,
    expect: "8.save.prewrite",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the reason is only trimmed, not cleaned (five zero-width spaces pass as a reason)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  const reason = cleanReason(post.reason);`,
    to: `  const reason = typeof post.reason === "string" ? post.reason.trim() : "";`,
    expect: "8.refused.invisible",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — an ended session is treated as an escalation (a SECURITY row, 'Only the Owner…')",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return { ok: false, error: COPY.sessionEnded };`,
    to: `  void COPY.sessionEnded;`,
    expect: "8.refused.noviewer",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — Stop paying is offered only while paying again (under the kill a stored Payable cannot be stopped)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  const stopPaying: InvitePayableDialog | null = view.viewerIsOwner && view.storedPayable ? {`,
    to: `  const stopPaying: InvitePayableDialog | null = view.viewerIsOwner && view.paying ? {`,
    expect: "8.dialogs.closed.on",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — under the kill the card no longer states the STORED Payable (lifting the kill resumes payment unannounced)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (view.ceiling === "CLOSED" && view.storedPayable) {`,
    to: `  if (false) {`,
    expect: "8.dialogs.closed.on",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — under FORCED the card no longer states the stored position (removing the setting does what nobody was told)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (view.ceiling === "FORCED") {
    notes.push(view.storedPayable`,
    to: `  if (false) {
    notes.push(view.storedPayable`,
    expect: "8.dialogs.forced",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the header chip grows a third word ('Paused')",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `    chip: paying ? { label: "Payable", variant: "active" } : { label: "Not payable", variant: "paused" },`,
    to: `    chip: paying ? { label: "Payable", variant: "active" } : view.storedPayable ? { label: "Paused", variant: "paused" } : { label: "Not payable", variant: "paused" },`,
    expect: "8.dialogs.paused",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the provenance drops the record number (a restored older record cannot be told apart)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: '      return `Since ${when} · ${view.changedByLabel ?? "the Owner"} · “${s.reason}” · record #${s.seq}`;',
    to: '      return `Since ${when} · ${view.changedByLabel ?? "the Owner"} · “${s.reason}”`;',
    expect: "8.dialogs.off",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the CASH effect promises money 'withdrawable at once' (the first withdrawal waits on KYC)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `        ? "Every reward to an inviter and to a new player lands as withdrawable CASH — the bonus wallet is withdrawn, so there is no wagering and no expiry — and a player's first withdrawal still needs their identity check (KYC at withdrawal)."`,
    to: `        ? "Every reward to an inviter and to a new player lands as CASH, withdrawable at once."`,
    expect: "8.dialogs.cash",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-ceremony.ts — the Stop dialog promises nothing more is paid (a reward already being paid can still land)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  stopStarts: "No new referral reward starts from the moment you confirm; a reward already being paid at that instant can still land.",`,
    to: `  stopStarts: "No referral reward is paid from the moment you confirm.",`,
    expect: "8.dialogs.payable",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — the view never flags a stored record OLDER than the last recorded change",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `    recordOlderThanLog: stored.kind !== "UNREAD" && lastRecordedSeq !== null && seq < lastRecordedSeq,`,
    to: `    recordOlderThanLog: false,`,
    expect: "8.log.older",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — an UNCONFIRMED act's seq counts as the last recorded change",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `      if (p.confirmed === false) continue;`,
    to: `      void p.confirmed;`,
    expect: "8.log.unconfirmed",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — an author with no chosen name is shown as the generated 'Player #…'",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `      changedByLabel = chosen.length > 0 ? chosen : null;`,
    to: `      changedByLabel = chosen.length > 0 ? chosen : "Player #" + stored.changedBy.slice(-6).toUpperCase();`,
    expect: "8.label",
  },
  {
    gate: "player-invite-unpaid",
    name: "invite-rewards-switch.ts — an overtaken switch read answers the LOCAL value alone (it read OFF, it says payable)",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `      if (s.gen !== genAtStart) return composeInvitePayable("OWNER", stored) ? s.stored : stored;`,
    to: `      if (s.gen !== genAtStart) return s.stored;`,
    expect: "8.overtaken",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-rules.ts — a fraction of a percent is a valid rate again (a rate nobody saw on the page)",
    file: "src/lib/affiliate-rules.ts",
    from: `  && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;`,
    to: `  && true;`,
    expect: "8.validate.whole",
  },
  {
    gate: "player-invite-unpaid",
    name: "payable-switch.tsx — the arming predicate FAILS OPEN: a PAYABLE copy that lost its words arms on a reason alone",
    file: "src/app/admin/affiliate/payable-switch.tsx",
    from: `  if (copy.to === "NOT_PAYABLE") return true;`,
    to: `  if (copy.to === "NOT_PAYABLE" || copy.word === null) return true;`,
    expect: "8.armed.failclosed",
  },
  {
    gate: "player-invite-unpaid",
    name: "affiliate-admin-client.tsx — the form's Save is enabled on a draft the server would refuse",
    file: "src/app/admin/affiliate/affiliate-admin-client.tsx",
    from: `disabled={!unsaved || !check.ok} onClick={save}`,
    to: `disabled={!unsaved} onClick={save}`,
    expect: "8.client.save",
  },
  /* ⭐ RE-AIMED 2026-10-03 (validation batch vb6, round 3). The case used to take the page's own split(".") away, when
   * the page cut the dot itself behind a decimal box. The box is the kit's whole-number box now and cuts first, so that
   * plant moved nothing and the case could no longer go red. The defect that can still ship is the decimal box coming
   * back: the parent paints its number back without the dot, and a typed "5000.50" holds 500050. */
  {
    gate: "player-invite-unpaid",
    name: "affiliate-admin-client.tsx — a field lets the dot through again (a decimal box): its number is painted back without the dot, so a typed '5000.50' holds 500050",
    file: "src/app/admin/affiliate/affiliate-admin-client.tsx",
    from: `        inputMode="numeric"`,
    to: `        inputMode="numeric" allowDecimal`,
    expect: "8.client.whole",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — accrualContextFor prices from the shipped DEFAULTS when there is no settings row",
    file: "src/lib/server/affiliate-service.ts",
    from: `    if (configNow.stored === false) return { ok: false, refusal: "player_config_unreadable", attribution };`,
    to: `    if (false) return { ok: false, refusal: "player_config_unreadable", attribution };`,
    expect: "6.absent.accrual",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payPrize pays from the shipped DEFAULTS (prize ON, TZS 10,000) when the row is gone",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (prizeConfigNow.stored === false) {`,
    to: `  if (false) {`,
    expect: "6.absent.prize",
  },
  {
    gate: "invite-payable-db",
    name: "affiliate-service.ts — payBonus reads the shipped DEFAULTS when the row is gone, and says nothing",
    file: "src/lib/server/affiliate-service.ts",
    from: `  if (bonusConfigNow.stored === false) {`,
    to: `  if (false) {`,
    expect: "6.absent.bonus",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-switch.ts — the screens promise the shipped DEFAULTS when there is no settings row",
    file: "src/lib/server/invite-rewards-switch.ts",
    from: `    if (!row.ok || !row.stored) return null;`,
    to: `    if (!row.ok) return null;`,
    expect: "6.absent.screens",
  },
  // ⚠️ RE-ANCHORED 2026-09-27: the ceremony reads `audit()`'s own `recorded` (main's replan ruling 543), no longer a
  // helper of its own. Each defect IGNORES that answer — the resolved row read as "on record" whatever happened.
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — the attempt row's `recorded` is ignored (a database that refused it still lets the act write)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (attemptRow.recorded) return true;`,
    to: `  if (true) return true;`,
    expect: "5.attempt",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — the outcome row's `recorded` is ignored (a lost compliance record is reported as recorded)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (outcomeRow.recorded) return true;`,
    to: `  if (true) return true;`,
    expect: "5.outcome",
  },
  {
    gate: "invite-payable-db",
    name: "invite-rewards-ceremony.ts — the raised-terms row's `recorded` is ignored (a lost terms record gives no warning)",
    file: "src/lib/server/invite-rewards-ceremony.ts",
    from: `  if (termsRow.recorded) return saved;`,
    to: `  return saved;`,
    expect: "5.terms.lost",
  },
];
