/**
 * AGENT AFFILIATE PROGRAMME — the operator's levers.
 *
 * ⭐ THE LAW: no surface may hard-code any number in this file. `/agent` renders
 * `formatTzs(cfg.registrationFeeTzs)`, the agent's dashboard renders their OWN
 * `commissionPct`, and the officer's rate field validates against `cfg.maxCommissionPct`.
 * A number written twice is a number that will disagree with itself — this project has
 * paid for that three times, most recently a stake floor that read 1,000 in the code, 1,000
 * in a green suite, and 500 in production for three weeks.
 *
 * ⛔ THE RULE AND THE VALUE ARE DIFFERENT THINGS. `RULES.md` §2.10 states a 40% ceiling that
 * the platform cannot be configured out of, so `validate()` REFUSES `maxCommissionPct > 40` —
 * exactly as `PLATFORM_MAX_STAKE` lets an operator narrow inside a rule and never widen past
 * it. An operator may set the ceiling to 25%; nobody can set it to 60%.
 *
 * ⚠️ SCALE. `defaultCommissionPct` / `maxCommissionPct` are PERCENTS (`20.00` = 20%).
 * `affiliate-config`'s `commission.rate` is a FRACTION (`0.5` = 50%). Feeding one into the
 * other is a 40× error, and the two configs govern two different programmes that share one
 * ledger — so they will sit side by side in a reader's head. They never mix: `policyFor`
 * reads the percent for AGENT and the fraction for PLAYER, and converts once, at the edge.
 *
 * ⚠️ THIS OBJECT IS FLAT, AND THAT IS LOAD-BEARING. `defineConfig` hydrates a persisted
 * snapshot with a SHALLOW spread (`{ ...defaults, ...restored }`), so any NESTED field would
 * arrive `undefined` on production the moment a row exists — the defect
 * `docs/AGENT-STRESS-TEST-FINDINGS.md` records against `affiliate-config`'s three nested
 * modes. Keep every key a scalar.
 *
 * ⛔ INDEPENDENT OF `affiliate-config.enabled`. That switch is the GROWTH officer's
 * player-promo lever. Pausing the player promo must not stop a vetted partner earning the
 * commission they were charged TZS 100,000 for, and turning the player promo on must not
 * change one shilling of agent economics. `test:programme-isolation` is that assertion.
 *
 * Edited at `/admin/agents` → Settings (`compliance` domain + step-up 2FA), never at
 * `/admin/affiliate`. Authority: docs/AGENT-PROGRAMME.md. Rate rule: docs/RULES.md §2.10.
 */
import { defineConfig } from "./define-config";

const AGENT_CONFIG_KEY = "agent.config";

/**
 * 🔴 THE HARD CEILING, AS A RULE RATHER THAN A SETTING.
 *
 * `RULES.md` §2.10 states it, this constant enforces it, and `validate()` is the only place
 * that reads it. It is exported so a guard can assert the rule and the value cannot drift
 * apart — ⛔ never so a surface can render it. A surface renders `cfg.maxCommissionPct`,
 * which is what an officer is actually held to.
 */
export const PLATFORM_MAX_COMMISSION_PCT = 40;

/**
 * VAT treatment of the registration fee.
 *
 * ⚠️ `registrationFeeTzs` MEANS A DIFFERENT THING UNDER EACH TREATMENT, and flipping this
 * moves the applicant-facing figure by the VAT rate. Under `INCLUSIVE` the fee IS the gross
 * the applicant pays and the VAT is backed out of it for the tax pack. Under `EXCLUSIVE` the
 * fee is the NET and the applicant pays `fee × (1 + rate)`.
 *
 * ⭐ MANAGEMENT SET THIS TO `EXCLUSIVE` ON 2026-09-08. Their annotation on the "What it
 * costs" card reads "TZS 100,000 + VAT = 118,000" — so the published price is the net plus
 * VAT on top, not a VAT-inclusive hundred thousand. Every surface that names the treatment
 * now reads this field instead of asserting "VAT inclusive" in prose; the three places that
 * used to hard-code it were the reason this comment exists.
 */
export type FeeVatTreatment = "INCLUSIVE" | "EXCLUSIVE";

export type AgentConfig = {
  /** The programme's own switch — it closes the DOOR (applications, invitations, the public
   *  CTA). ⛔ Independent of `affiliate-config.enabled`, and ⛔ it never stops an approved
   *  agent recruiting or accruing: that is standing (`agentStandingFor`), not this flag. */
  enabled: boolean;

  /** Percent of the NET operator fee, pre-filled for a new agent. */
  defaultCommissionPct: number;
  /** The officer ceiling. ⛔ `validate()` refuses anything above
   *  `PLATFORM_MAX_COMMISSION_PCT` — an operator may narrow, never widen. */
  maxCommissionPct: number;

  /**
   * ⭐ LOCAL WITHHOLDING TAX ON THE AGENT'S OWN EARNINGS, as a PERCENT of their gross
   * commission. Management's 2026-09-08 waterfall added it as a line item: the agent's 10%
   * share is computed, 5% of THAT is withheld, and the remainder is the cash credited.
   *
   * ⛔ IT IS NOT THE 15% WITHDRAWAL TAX. That one was deleted in 2026-07 and must stay
   * deleted (`wallet-service.ts` carries the marker). This is a deduction on commission
   * INCOME at the moment it is earned, remitted to `HOUSE:TAX` in the same balanced ledger
   * group as the credit — a different tax, on a different base, at a different moment.
   *
   * ⭐ `0` IS A LEGITIMATE SETTING and means the tax does not apply: the agent is credited
   * their gross. It is not a sentinel for "unset", so the accrual must handle it as a real
   * rate rather than falling back to anything.
   */
  agentWithholdingTaxPct: number;

  /** The registration fee, in whole TZS. */
  registrationFeeTzs: number;
  feeVatTreatment: FeeVatTreatment;
  /** TZ standard rate — used to split the VAT component on the ledger entry. */
  feeVatRatePct: number;
  /** Where the fee is paid, out of band. Proper nouns, so they live here rather than in the
   *  trilingual dictionary — an account number is the same in every language, and the
   *  parity guard would otherwise need an allowlist entry per locale. */
  feeDestinationName: string;
  feeDestinationAccount: string;

  /** How long after the BIND an agent keeps earning. ⭐ `0` = LIFETIME.
   *  ⚠️ Measured from `User.recruitedAt`, never from `User.createdAt` — otherwise the window
   *  is silently shortened by however long the recruit existed before binding. */
  commissionWindowMonths: number;
  /** Max total commission from a single recruit, in TZS. ⭐ `0` = UNCAPPED.
   *  Lifetime + uncapped is safe precisely because the base is the fee we KEPT: the house
   *  always retains the majority, so commission can never cost more than the recruit earned us. */
  capPerRecruitTzs: number;

  /** Invitation token lifetime, in days. */
  invitationExpiryDays: number;
  /** How long an untouched DRAFT survives before it expires and its documents are purged. */
  draftExpiryDays: number;
  /** The promise: a rejected applicant's fee is refunded in full within this many days. */
  refundDeadlineDays: number;
  /** Cool-down before a rejected applicant may apply again. ⛔ Does not apply to the three
   *  TERMINAL reject reasons, which never re-open. */
  reapplyCooldownDays: number;
  /**
   * What `/agent` and `/agent/status` promise about review time, in WORKING days. Read from
   * here so the page never invents a number, and so a timeline says WHEN, not just where.
   *
   * ⚠️ WORKING DAYS SINCE 2026-09-08, on management's instruction. The unit is not
   * decoration: `/admin/agents` measures the same promise with `workingDaysBetween` from
   * `src/lib/business-days.ts`, so the console's "Past SLA" chip and the applicant's
   * expectation are one fact. ⛔ Never compare this against a calendar-day difference.
   */
  reviewSlaDays: number;
};

/**
 * Ali's decisions, 2026-09-07, as amended by management's feedback of 2026-09-08 —
 * recorded in docs/AGENT-PROGRAMME.md §5/§5a and RULES.md §2.10.
 *
 * ⚠️ THESE DEFAULTS ARE WHAT PRODUCTION RUNS ON UNTIL A ROW EXISTS. `define-config` only
 * merges a persisted snapshot if one is there, and the agent programme is new, so on the day
 * it ships there is no `agent.config` row and every value below IS the live value. Check the
 * live state, not the file, before quoting any of these anywhere.
 *
 * ⚠️ AND IF A ROW DOES EXIST, THREE OF THESE EDITS DO NOT REACH PRODUCTION ON DEPLOY.
 * `defineConfig` hydrates `{ ...defaults, ...restored }`, so a persisted `agent.config` row
 * overrides `defaultCommissionPct`, `feeVatTreatment` and `reviewSlaDays` with whatever an
 * officer last saved. `agentWithholdingTaxPct` is NEW, so it takes the default either way.
 * ⭐ The post-deploy step is therefore to READ the live `SystemConfig["agent.config"]` row and
 * confirm the amended values. This is written here because a deploy that silently keeps the
 * old rate is indistinguishable from a successful one.
 *
 * ⛔ THIS PARAGRAPH USED TO OFFER AN ops-agent-config-sync SCRIPT AS THE ALTERNATIVE. There is
 * no such script and there never was. On 2026-09-08 exactly the failure it describes then
 * happened: a persisted row carried `feeVatRatePct` 0 while three documents said 18, and it
 * went unnoticed for a day (`MONEY-GATE-REMEDIATION.md` §7.1). A comment naming a tool that
 * does not exist tells a reader the check is handled and stops them doing it by hand.
 * `npm run test:guards-exist` now refuses that class of claim from any source file.
 *
 * ⚠️ The dead name is written above WITHOUT backticks on purpose. That guard reads a
 * backticked name as a citation, so a correction that quoted what it deleted would re-create
 * the very claim it is removing — the trap §6.15 hit when an absence check matched its own
 * docblock quoting the line it had just removed.
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: true,
  // ⭐ 20 → 10 on management's instruction, 2026-09-08: "Agent fee = 10% of commission on
  // winnings after tax". ⛔ This only PRE-FILLS a new approval. Agents already approved keep
  // their own `AffiliateAgent.commissionPct` and must be re-priced one at a time with
  // `setAgentRate` (which emails them) — a config edit must never silently re-cut a
  // contracted partner's income.
  defaultCommissionPct: 10,
  maxCommissionPct: 40,
  // ⭐ 5% of the agent's gross commission, withheld and remitted. Management's waterfall,
  // 2026-09-08. See `agentWithholdingTaxPct` above for why this is not the deleted 15%.
  agentWithholdingTaxPct: 5,
  registrationFeeTzs: 100_000,
  // ⭐ INCLUSIVE → EXCLUSIVE on management's instruction, 2026-09-08: "TZS 100,000 + VAT =
  // 118,000". The published price is the net; the applicant pays the net plus VAT.
  feeVatTreatment: "EXCLUSIVE",
  // 🔴 18 → 0, Ali's decision 2026-09-09. The registration fee is NOT VAT-bearing, so an
  // applicant owes the published TZS 100,000 and nothing is booked to `HOUSE:TAX`.
  //
  // ⛔ THE DECISION RATIFIES PRODUCTION, IT DOES NOT CHANGE IT. `agent.config` on the live
  // database has carried `feeVatRatePct: 0` since 2026-09-08T17:42:24Z, where it travelled —
  // unannounced — inside the save that changed the Lipa fee destination. The money gate found
  // it on a production read; the platform had already been quoting 100,000 for a day; and Ali
  // ruled that the 100,000 is right and the documents were what needed correcting.
  // `COMPLIANCE-DECISIONS.md` § 2026-09-09 carries the reasoning, RULES §5 the procedure.
  //
  // ⛔ IT IS NOT RETROACTIVE. The one agent registered before it paid TZS 118,000 under the
  // 18% then in force, and `HOUSE:TAX` holds that 18,000 as a genuine liability to TRA. A rate
  // change never reprices what has already been collected — the same doctrine that forbids
  // backfilling `PredictionMarket.feeSnapshot`. The refund path reverses the VAT that was
  // actually BOOKED, not today's rate, so that application still nets `HOUSE:TAX` to zero.
  feeVatRatePct: 0,
  feeDestinationName: "Digital Selcom Bank",
  feeDestinationAccount: "0769777877",
  commissionWindowMonths: 0,
  capPerRecruitTzs: 0,
  invitationExpiryDays: 14,
  draftExpiryDays: 30,
  refundDeadlineDays: 7,
  reapplyCooldownDays: 90,
  reviewSlaDays: 5,
};

function validate(c: AgentConfig): { ok: true } | { ok: false; reason: string } {
  // ⛔ THE RULE, NOT THE SETTING. RULES.md §2.10 fixes the ceiling at 40%; an operator may
  // narrow inside it and can never widen past it. Same construction as PLATFORM_MAX_STAKE.
  if (!Number.isFinite(c.maxCommissionPct) || c.maxCommissionPct <= 0 || c.maxCommissionPct > PLATFORM_MAX_COMMISSION_PCT)
    return { ok: false, reason: `Maximum commission must be above 0% and no more than ${PLATFORM_MAX_COMMISSION_PCT}% (RULES.md §2.10).` };
  if (!Number.isFinite(c.defaultCommissionPct) || c.defaultCommissionPct <= 0)
    return { ok: false, reason: "Default commission must be above 0%." };
  // A default above the ceiling would pre-fill the officer's field with a value their own
  // form is about to refuse.
  if (c.defaultCommissionPct > c.maxCommissionPct)
    return { ok: false, reason: "Default commission cannot exceed the maximum." };
  // ⛔ 100% IS THE BOUND, NOT 40. A withholding rate above 100 makes the agent's net payout
  // NEGATIVE, and a negative credit is refused silently downstream — so the partner would see
  // "no commission" and nobody would see a misconfiguration. 0 is allowed and means the tax
  // does not apply.
  if (!Number.isFinite(c.agentWithholdingTaxPct) || c.agentWithholdingTaxPct < 0 || c.agentWithholdingTaxPct > 100)
    return { ok: false, reason: "Agent withholding tax must be 0–100%." };
  if (!Number.isFinite(c.registrationFeeTzs) || c.registrationFeeTzs < 0 || c.registrationFeeTzs > 10_000_000)
    return { ok: false, reason: "Registration fee must be 0–10,000,000 TZS." };
  if (!Number.isInteger(c.registrationFeeTzs))
    return { ok: false, reason: "Registration fee must be a whole number of shillings." };
  if (c.feeVatTreatment !== "INCLUSIVE" && c.feeVatTreatment !== "EXCLUSIVE")
    return { ok: false, reason: "VAT treatment must be INCLUSIVE or EXCLUSIVE." };
  if (!Number.isFinite(c.feeVatRatePct) || c.feeVatRatePct < 0 || c.feeVatRatePct > 100)
    return { ok: false, reason: "VAT rate must be 0–100%." };
  if (!c.feeDestinationAccount.trim())
    return { ok: false, reason: "The fee destination account cannot be empty — the applicant is told to pay it." };
  if (!c.feeDestinationName.trim())
    return { ok: false, reason: "The fee destination name cannot be empty." };
  // 0 = lifetime, and that is the shipped decision. A bound is still needed so a typo cannot
  // set a 10,000-month window that reads as lifetime but is not.
  if (!Number.isInteger(c.commissionWindowMonths) || c.commissionWindowMonths < 0 || c.commissionWindowMonths > 600)
    return { ok: false, reason: "Commission window must be 0 (lifetime) – 600 months." };
  if (!Number.isFinite(c.capPerRecruitTzs) || c.capPerRecruitTzs < 0 || c.capPerRecruitTzs > 1_000_000_000)
    return { ok: false, reason: "Per-recruit cap must be 0 (uncapped) – 1,000,000,000 TZS." };
  // ⛔ An expiry of 0 is not "never expires" — it is a token that is dead on arrival, and an
  // invitation nobody can accept is indistinguishable from a broken one.
  if (!Number.isInteger(c.invitationExpiryDays) || c.invitationExpiryDays < 1 || c.invitationExpiryDays > 90)
    return { ok: false, reason: "Invitation expiry must be 1–90 days." };
  if (!Number.isInteger(c.draftExpiryDays) || c.draftExpiryDays < 1 || c.draftExpiryDays > 365)
    return { ok: false, reason: "Draft expiry must be 1–365 days." };
  if (!Number.isInteger(c.refundDeadlineDays) || c.refundDeadlineDays < 1 || c.refundDeadlineDays > 90)
    return { ok: false, reason: "Refund deadline must be 1–90 days." };
  if (!Number.isInteger(c.reapplyCooldownDays) || c.reapplyCooldownDays < 0 || c.reapplyCooldownDays > 730)
    return { ok: false, reason: "Re-apply cool-down must be 0–730 days." };
  if (!Number.isInteger(c.reviewSlaDays) || c.reviewSlaDays < 1 || c.reviewSlaDays > 90)
    return { ok: false, reason: "Review time must be 1–90 days." };
  return { ok: true };
}

const _config = defineConfig<AgentConfig>({
  key: AGENT_CONFIG_KEY,
  defaults: DEFAULT_AGENT_CONFIG,
  validate,
  audit: { action: "agent.config.updated", targetType: "AgentConfig" },
});

export function getAgentConfig(): AgentConfig {
  return _config.get();
}

export function setAgentConfig(updates: Partial<AgentConfig>, officerId: string):
  | { ok: true; config: AgentConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}

/**
 * The commission window's end for an attribution bound at `boundAtIso`, or `null` when the
 * programme is lifetime (`commissionWindowMonths === 0`).
 *
 * ⚠️ A REAL CALENDAR-MONTH WINDOW, not a 30-day approximation — the approximation drifts ~5
 * days a year and short-changes the partner on a long window. And it measures from the BIND,
 * ⛔ never from the recruit's `createdAt`.
 */
export function commissionWindowEnd(boundAtIso: string, windowMonths: number): Date | null {
  if (windowMonths <= 0) return null; // lifetime
  const end = new Date(boundAtIso);
  if (Number.isNaN(end.getTime())) return null;
  end.setMonth(end.getMonth() + windowMonths);
  return end;
}
