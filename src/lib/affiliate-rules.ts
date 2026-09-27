/**
 * THE PLAYER INVITE'S REWARD RULES — pure, browser-safe, and the ONE home for what a player-promo
 * config may say and what it would pay (2026-09-26, the Owner's "Payable / Not payable" switch).
 *
 * ⭐ WHY A PURE MODULE. Three readers need the same rules and live on three sides of the tree: the
 * server config (`server/affiliate-config.ts` validates every save and sanitizes every load with
 * them), the money path (`policyFor` prices a player accrual through `effectivePlayerTerms`), and
 * the admin page's live "This will pay" preview, which is a CLIENT component. A second copy of any
 * of them is how the preview and the payer would drift apart.
 * ⛔ So this file imports nothing from `lib/server` and nothing that needs Node. `./utils` is the
 * platform's one money formatter and is already in the client bundle.
 *
 * 🔴 WHAT CHANGED, AND WHY IT HAD TO. `defineConfig` hydrates a persisted row as
 * `{ ...defaults, ...restored }` with NO validation, and the old validator only range-checked
 * numbers: a row carrying `enabled: "false"` (truthy), `rate: "0.9"` or `capPerRecruitTzs: NaN`
 * (which reads as "uncapped" at `cap > 0`) would have reached the payer untouched. Every field is
 * now TYPE-checked on save, repaired field by field on load (the `payment-control.ts` shape), and
 * the payer clamps again on its own line.
 *
 * ⛔ COMMISSION ≤ 50% OF MARGIN IS A RULE HERE, NOT A SENTENCE. It was printed guidance on the page
 * while the validator accepted anything up to 100%. A rate above it is refused on save, REPLACED on
 * load by the value that pays least (0 — the `SAFE_FALLBACK` rule, not a clamp), and clamped to the
 * ceiling once more in `effectivePlayerTerms`, the payer's own line.
 */
import { formatTzs } from "./utils";

export type BonusRecipient = "NEW" | "REFERRER" | "BOTH";
/**
 * ⛔ SIGN-UP ONLY, AND THE FIRST-BET PRIZE ONLY — THE DEPOSIT-TIED MODES ARE RETIRED (Ali, 2026-09-26).
 * The published Responsible Gambling policy says, in its operator responsibilities (§4): *"No bonus
 * offers tied to deposit increases"* (`src/app/legal/responsible-gambling/page.tsx`). `FIRST_DEPOSIT`
 * (a bonus for depositing) and `DEPOSIT_THRESHOLD` (a prize for depositing enough) were exactly that, so
 * neither can be chosen, stored or paid: a save naming one is refused, a stored row naming one loads
 * with that mode switched OFF, and the deposit hook refuses, audited (`player_deposit_trigger_retired`).
 * ⚠️ `requireDeposit` on the first-bet prize STAYS: it is an anti-fraud precondition (an account that
 * never funded itself cannot farm prizes with free sign-ups), not a reward for depositing.
 */
export type BonusTrigger = "SIGNUP";
export type PrizeMilestone = "FIRST_BET";
/** The retired spellings, as a stored row (or anything that bypassed the load's repair) could still hold them. */
export const RETIRED_BONUS_TRIGGER = "FIRST_DEPOSIT";
export const RETIRED_PRIZE_MILESTONE = "DEPOSIT_THRESHOLD";

export type AffiliateConfig = {
  /**
   * ⛔ A SERVICE-LEVEL PAUSE, AND SINCE 2026-09-26 IT IS NOT ON THE PAGE. The Owner's
   * Payable / Not payable switch (`server/invite-rewards-switch.ts`) is the one control; making
   * invites payable sets this true, and a Save never sends it. `policyFor` still refuses with
   * `programme_disabled` while it is false, so a row that says false pauses the promo without
   * anyone touching the switch — and the page then says "Not payable · paused at service level".
   */
  enabled: boolean;

  commission: {
    enabled: boolean;
    /** Share of the operator margin a recruit generates that the referrer earns, as a fraction
     *  (0.5 = 50%). ⛔ At most `PLAYER_MAX_COMMISSION_RATE`, in whole percent. */
    rate: number;
    /** How long after the invite binds commission keeps accruing, in months: 1–60. ⛔ Never 0 —
     *  0 is "lifetime" to `commissionWindowEnd`, and the player promo has no lifetime term. */
    windowMonths: number;
    /** Max total commission earnable from a single recruit, in TZS. 0 = uncapped. */
    capPerRecruitTzs: number;
  };

  bonus: {
    enabled: boolean;
    recipient: BonusRecipient;
    /** Credit to the newly-recruited player, in TZS. */
    newAmountTzs: number;
    /** Credit to the referrer, in TZS. */
    referrerAmountTzs: number;
    trigger: BonusTrigger;
  };

  prize: {
    enabled: boolean;
    /** Always `FIRST_BET`. ⛔ `depositThresholdTzs` WENT WITH `DEPOSIT_THRESHOLD` (2026-09-26): nothing
     *  else ever read it, so a stored row that still carries it loads unchanged except that the dead
     *  key is dropped — it was never shown for a first-bet prize. */
    milestone: PrizeMilestone;
    /** Fixed prize paid to the referrer when a recruit hits the milestone. */
    amountTzs: number;
    /** Max number of milestone prizes a single referrer can earn. 0 = uncapped. */
    capPerReferrer: number;
    /** Minimum bet amount the recruit must place to trigger the FIRST_BET milestone.
     *  Per Management Bonus Rules §4.2c: at least one position ≥ TZS 20,000. */
    minBetAmountTzs: number;
    /** When true, the recruit must have deposited funds before the milestone triggers.
     *  Per Management Bonus Rules §4.2b. ⭐ An ANTI-FRAUD PRECONDITION, not a reward for depositing:
     *  the prize is for the friend's first BET and grows with nothing the friend deposits. */
    requireDeposit: boolean;
  };
};

/**
 * Defaults per 50pick Management Bonus Rules §4 (2026-07-01):
 *   - Invite bonus: TZS 10,000 to REFERRER
 *   - Triggers when the recruit: registers + deposits + places ≥1 position ≥ TZS 20,000
 *   - This maps to prize mode (FIRST_BET milestone) with deposit requirement
 *   - Signup bonus disabled (was testing-only)
 *   - Commission disabled (not in management rules)
 *
 * ⚠️ THESE ARE NOT A PAYMENT. A prize ON here pays nothing while invites are Not payable, and the
 * Make-payable ceremony defaults to switching every mode off ("Nothing yet") — so these values
 * reach the payer only if the Owner chooses "the settings on this page" and sees them priced.
 */
export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  enabled: true,
  commission: { enabled: false, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
  bonus: { enabled: false, recipient: "REFERRER", newAmountTzs: 2_000, referrerAmountTzs: 10_000, trigger: "SIGNUP" },
  prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20, minBetAmountTzs: 20_000, requireDeposit: true },
};

/** ⛔ THE PLATFORM CEILING on player commission: 50% of the margin a recruit earns 50pick. A RULE —
 *  an officer may set less, nothing may set more (the agent programme's twin is
 *  `PLATFORM_MAX_COMMISSION_PCT`). */
export const PLAYER_MAX_COMMISSION_RATE = 0.5;
/** The player commission window, in months. ⛔ No lifetime option (Ali's call, 2026-09-26). */
export const PLAYER_WINDOW_MIN_MONTHS = 1;
export const PLAYER_WINDOW_MAX_MONTHS = 60;

// ── THE FIELD TABLE — one rule per field, read by validate AND by sanitize ──────────────────────

type FieldRule = { ok: (v: unknown) => boolean; reason: string };

/** ⛔ The refusals for a retired deposit-tied mode NAME THE POLICY, so an officer who tries one learns
 *  why rather than meeting a bare "invalid value". */
export const DEPOSIT_TRIGGER_RETIRED_REASON =
  "The bonus is paid on sign-up only. A bonus for depositing is retired: the Responsible Gambling policy promises “No bonus offers tied to deposit increases”.";
export const DEPOSIT_MILESTONE_RETIRED_REASON =
  "The prize is paid on a friend’s first bet only. A prize for depositing is retired: the Responsible Gambling policy promises “No bonus offers tied to deposit increases”.";

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isWhole = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const oneOf = <T extends string>(...allowed: T[]) => (v: unknown) => typeof v === "string" && (allowed as string[]).includes(v);
/** A fraction that is a WHOLE percent: 0.07 is 7%, 0.075 is refused. The float tolerance is for
 *  `0.07 * 100 === 7.000000000000001`, not for accepting a fractional percent. */
const isWholePercentRate = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= PLAYER_MAX_COMMISSION_RATE
  && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

/**
 * ⭐ `Record<keyof …>` IS THE POINT. Adding a field to `AffiliateConfig` without a rule here does
 * not compile, and neither does a rule for a field that does not exist — so validate, sanitize,
 * merge and clone (which all walk these keys) cannot silently skip a new field or persist a stray one.
 */
const RULES: {
  enabled: FieldRule;
  commission: Record<keyof AffiliateConfig["commission"], FieldRule>;
  bonus: Record<keyof AffiliateConfig["bonus"], FieldRule>;
  prize: Record<keyof AffiliateConfig["prize"], FieldRule>;
} = {
  enabled: { ok: isBool, reason: "The programme pause must be on or off." },
  commission: {
    enabled: { ok: isBool, reason: "Commission must be switched on or off." },
    rate: { ok: isWholePercentRate, reason: "Commission rate must be a whole percent from 0% to 50% of margin — 50% is the platform ceiling." },
    windowMonths: { ok: (v) => isWhole(v, PLAYER_WINDOW_MIN_MONTHS, PLAYER_WINDOW_MAX_MONTHS), reason: "Commission window must be 1–60 months." },
    capPerRecruitTzs: { ok: (v) => isWhole(v, 0, 50_000_000), reason: "Per-recruit cap must be whole shillings, 0–50,000,000 TZS." },
  },
  bonus: {
    enabled: { ok: isBool, reason: "The bonus must be switched on or off." },
    recipient: { ok: oneOf<BonusRecipient>("NEW", "REFERRER", "BOTH"), reason: "The bonus goes to the new player, the inviter, or both." },
    newAmountTzs: { ok: (v) => isWhole(v, 0, 1_000_000), reason: "New-player bonus must be whole shillings, 0–1,000,000 TZS." },
    referrerAmountTzs: { ok: (v) => isWhole(v, 0, 1_000_000), reason: "Referrer bonus must be whole shillings, 0–1,000,000 TZS." },
    trigger: { ok: oneOf<BonusTrigger>("SIGNUP"), reason: DEPOSIT_TRIGGER_RETIRED_REASON },
  },
  prize: {
    enabled: { ok: isBool, reason: "The prize must be switched on or off." },
    milestone: { ok: oneOf<PrizeMilestone>("FIRST_BET"), reason: DEPOSIT_MILESTONE_RETIRED_REASON },
    amountTzs: { ok: (v) => isWhole(v, 0, 1_000_000), reason: "Prize amount must be whole shillings, 0–1,000,000 TZS." },
    capPerReferrer: { ok: (v) => isWhole(v, 0, 10_000), reason: "Prize cap must be a whole number, 0–10,000." },
    minBetAmountTzs: { ok: (v) => isWhole(v, 0, 10_000_000), reason: "Min bet amount must be whole shillings, 0–10,000,000 TZS." },
    requireDeposit: { ok: isBool, reason: "Require-deposit must be on or off." },
  },
};

export type AffiliateSection = "commission" | "bonus" | "prize";
export const AFFILIATE_SECTIONS: readonly AffiliateSection[] = ["commission", "bonus", "prize"];

/** The keys of one reward mode, straight off the rule table — so the list cannot drift from the type. */
export function affiliateSectionKeys<S extends AffiliateSection>(section: S): (keyof AffiliateConfig[S])[] {
  return Object.keys(RULES[section]) as (keyof AffiliateConfig[S])[];
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Is this a config the platform may store? Every boolean and enum is TYPE-checked, every amount is a
 * whole, finite shilling inside its bound, the rate is a whole percent ≤ 50%, the window 1–60.
 * ⛔ Takes `unknown` on purpose: its input is a merged form post, and the post is whatever the
 * browser sent. `field` names the first failure as `section.key` (or `enabled`).
 */
export function validateAffiliateConfig(c: unknown): { ok: true } | { ok: false; reason: string; field: string } {
  if (!isObject(c)) return { ok: false, reason: "The settings were not understood.", field: "config" };
  if (!RULES.enabled.ok(c.enabled)) return { ok: false, reason: RULES.enabled.reason, field: "enabled" };
  for (const section of AFFILIATE_SECTIONS) {
    const part = c[section];
    if (!isObject(part)) return { ok: false, reason: `The ${section} settings were not understood.`, field: section };
    const rules = RULES[section] as Record<string, FieldRule>;
    for (const key of Object.keys(rules)) {
      if (!rules[key].ok(part[key])) return { ok: false, reason: rules[key].reason, field: `${section}.${key}` };
    }
  }
  return { ok: true };
}

/**
 * ⛔ WHAT AN UNREADABLE FIELD FALLS BACK TO: THE VALUE THAT PAYS LEAST — NOT THE SHIPPED DEFAULT.
 * The shipped default has the prize ON at TZS 10,000, so "fall back to the default" would turn a
 * corrupted `prize.enabled` (a hand-edited `"false"`, say — truthy) into a live prize. So every switch
 * falls back OFF (the service-level pause included) and every amount and the rate fall back to 0. A
 * cap, a threshold, a window or a choice keeps its default: 0 there means uncapped or no threshold,
 * which is the PAYING direction.
 */
const SAFE_FALLBACK: AffiliateConfig = {
  enabled: false,
  commission: { ...DEFAULT_AFFILIATE_CONFIG.commission, enabled: false, rate: 0 },
  bonus: { ...DEFAULT_AFFILIATE_CONFIG.bonus, enabled: false, newAmountTzs: 0, referrerAmountTzs: 0 },
  prize: { ...DEFAULT_AFFILIATE_CONFIG.prize, enabled: false, amountTzs: 0 },
};

/**
 * A persisted `affiliate.config` row, repaired FIELD BY FIELD on the way in — the shape
 * `payment-control.ts` uses for its own hydration.
 *
 * ⛔ WHY NOT REFUSE THE ROW. Refusing a whole row for one bad field would silently revert every good
 * field with it — the same outcome as the de-hydrated overwrite `define-config.ts` refuses. A bad or
 * missing field falls back to `SAFE_FALLBACK` above (the value that pays least) — AND THE MODE IT BELONGS
 * TO IS SWITCHED OFF. ⛔ Never re-pointed, never re-limited: a stored bonus armed on the retired
 * `FIRST_DEPOSIT` loads as the bonus OFF (its trigger reads SIGNUP only because the type has no other
 * value), and a live commission whose cap reads `1500.5` does not come back ON under the shipped
 * TZS 250,000 cap — an officer who set one term did not set its replacement (review 2026-09-26). Every
 * readable field keeps its value, so the officer sees what they stored with that one mode off. Unknown
 * keys are dropped (the retired `depositThresholdTzs` among them).
 * ⭐ It returns a COMPLETE config, because `defineConfig` merges `{ ...defaults, ...restored }`
 * shallowly: a partial `commission` object would replace the default's whole object.
 * ⚠️ A valid row passes through unchanged — `setVerified`'s read-back compares through this, so a
 * repair of a good value would report a landed save as a failed one.
 */
export function sanitizePersistedAffiliateConfig(raw: unknown): AffiliateConfig {
  const src = isObject(raw) ? raw : {};
  const pick = (rule: FieldRule, value: unknown, fallback: unknown) => (rule.ok(value) ? value : fallback);
  const section = <S extends AffiliateSection>(name: S): AffiliateConfig[S] => {
    const rawPart = src[name];
    const part: Record<string, unknown> = isObject(rawPart) ? rawPart : {};
    const rules = RULES[name] as Record<string, FieldRule>;
    const fallback = SAFE_FALLBACK[name] as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(rules)) out[key] = pick(rules[key], part[key], fallback[key]);
    if (Object.keys(rules).some((key) => key !== "enabled" && !rules[key].ok(part[key]))) out.enabled = false;
    return out as unknown as AffiliateConfig[S];
  };
  return {
    enabled: pick(RULES.enabled, src.enabled, SAFE_FALLBACK.enabled) as boolean,
    commission: section("commission"),
    bonus: section("bonus"),
    prize: section("prize"),
  };
}

/**
 * Which RETIRED deposit-tied mode does this config ARM — a mode switched on (`=== true`) with a retired
 * choice (`FIRST_DEPOSIT`, `DEPOSIT_THRESHOLD`)? Reads raw values on purpose: it is asked of a STORED ROW
 * as it was read (before the load's repair switched the mode off) and of anything that bypassed that
 * repair, so the deposit hook can refuse such a config out loud instead of saying nothing.
 */
export function retiredDepositModes(cfg: unknown): { bonus: boolean; prize: boolean } {
  const c = isObject(cfg) ? cfg : {};
  const bonus = isObject(c.bonus) ? c.bonus : {};
  const prize = isObject(c.prize) ? c.prize : {};
  return {
    bonus: bonus.enabled === true && bonus.trigger === RETIRED_BONUS_TRIGGER,
    prize: prize.enabled === true && prize.milestone === RETIRED_PRIZE_MILESTONE,
  };
}

/** The player commission terms the PAYER uses. `rate` is a fraction. */
export type PlayerCommissionTerms = { rate: number; windowMonths: number; capPerRecruitTzs: number };

/**
 * ⭐ THE PLAYER COMMISSION TERMS, CLAMPED ON THE MONEY PATH — the player twin of the agent branch's
 * `Math.min(pct, agentCfg.maxCommissionPct, PLATFORM_MAX_COMMISSION_PCT)` in `policyFor`.
 *
 * Validation refuses a bad save and sanitize repairs a bad load, and this is the belt beneath both:
 * whatever reached the registry, the payer cannot price above the rule.
 *   · rate  → at most 50%; commission off, or a rate that is not a positive finite number → 0.
 *   · window → whole months, clamped to 1–60. ⛔ Never 0: `commissionWindowEnd` reads 0 as lifetime.
 *   · cap   → whole shillings; 0 still means uncapped.
 * 🔴 A NON-FINITE WINDOW OR CAP PAYS NOTHING. `NaN > 0` is false, so a NaN cap would read as
 * UNCAPPED at the accrual — the unsafe direction. Any unsound term zeroes the rate instead.
 */
export function effectivePlayerTerms(cfg: Pick<AffiliateConfig, "commission">): PlayerCommissionTerms {
  const rawC: unknown = cfg?.commission;
  const c: Record<string, unknown> = isObject(rawC) ? rawC : {};
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const rate = num(c.rate), months = num(c.windowMonths), cap = num(c.capPerRecruitTzs);
  const capOk = cap !== null && cap >= 0;
  const pays = c.enabled === true && rate !== null && rate > 0 && months !== null && capOk;
  return {
    rate: pays && rate !== null ? Math.min(rate, PLAYER_MAX_COMMISSION_RATE) : 0,
    windowMonths: months !== null ? Math.min(PLAYER_WINDOW_MAX_MONTHS, Math.max(PLAYER_WINDOW_MIN_MONTHS, Math.floor(months))) : PLAYER_WINDOW_MIN_MONTHS,
    capPerRecruitTzs: capOk && cap !== null ? Math.floor(cap) : 0,
  };
}

// ── THE PRICE — what a config pays, in sentences an Owner can confirm ─────────────────────────────

export type InviteRewardsPriceOptions = {
  /** Where a player reward lands — `referralRewardDestination()` on the server. */
  destination: "CASH" | "BONUS";
  /** Recruits per inviter already in the roster (one number per inviter), for the exposure line. */
  rosterRecruitsPerInviter: readonly number[];
  /**
   * ⭐ Price the config AS MAKE PAYABLE WOULD ARM IT — `enabled` treated as true, because the
   * ceremony sets it. Without this a paused config prices at nothing, and the dialog would show an
   * Owner "nothing is paid" for the settings they are about to switch on.
   */
  armed?: boolean;
};

export type InviteRewardsPrice = {
  /** One finished sentence per reward that pays. ⛔ Empty when nothing pays — never a stub. */
  lines: string[];
  nothingPays: boolean;
  /** The sentence above the lines, or the whole answer when nothing pays. */
  headline: string;
  destination: "CASH" | "BONUS";
  roster: { inviters: number; friends: number };
  /** The most the one-off rewards (the first-bet prize) could cost across the roster, TZS. */
  oneOffCeilingTzs: number;
  /** The most commission could cost across the roster; `null` = no ceiling (uncapped); 0 = commission off. */
  commissionCeilingTzs: number | null;
  /** "Already in the roster: …" — the exposure sentence. */
  exposureLine: string;
};

export const NOTHING_PAYS_LINE = "No reward is switched on — nothing is paid yet.";
export const SERVICE_PAUSED_LINE = "The programme is paused at service level — nothing is paid.";

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * ⭐ WHAT THIS CONFIG PAYS, IN FINISHED SENTENCES — for the Make-payable dialog, the Payable card and
 * the page's live preview, so the three cannot price the same config differently.
 *
 * ⛔ NEVER "would pay ." A mode that is on with a zero amount pays nothing and gets no line; when no
 * line is left, `lines` is EMPTY and `headline` says nothing is paid. A sentence with a hole in it
 * is a money statement nobody can read.
 * ⛔ IT STATES WHERE THE MONEY LANDS on every line ("in CASH"), because since the bonus wallet was
 * withdrawn a referral reward is withdrawable cash, and the Owner is confirming exactly that.
 * ⚠️ THE ROSTER EXPOSURE COUNTS WHAT EXISTING FRIENDS CAN STILL TRIGGER: the first-bet prize once
 * per friend (within the per-inviter cap) and commission up to the per-friend cap. The SIGN-UP bonus is
 * not in it — everyone in the roster has already signed up — and nothing is back-paid. ⛔ No deposit
 * triggers anything here (the RG policy's "No bonus offers tied to deposit increases").
 */
export function priceInviteRewards(cfg: AffiliateConfig, opts: InviteRewardsPriceOptions): InviteRewardsPrice {
  const destination = opts.destination === "BONUS" ? "BONUS" : "CASH";
  const lands = destination === "CASH" ? "in CASH" : "as a bonus-wallet credit";
  const roster = (opts.rosterRecruitsPerInviter ?? []).filter((n) => Number.isSafeInteger(n) && n > 0);
  const inviters = roster.length;
  const friends = roster.reduce((s, n) => s + n, 0);
  /* ⚠️ The page prices a DRAFT as it is typed, and a half-typed field is NaN or empty. A figure that is
     not a positive finite number prices as 0 — a missing line, never "TZS NaN" and never a crash. The
     payer only ever sees validated whole shillings, so for a stored config this changes nothing. */
  const whole = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const partOf = (v: unknown): Record<string, unknown> => (isObject(v) ? v : {});

  const live = opts.armed === true || cfg?.enabled === true;
  const lines: string[] = [];
  let oneOff = 0;
  let commissionCeiling: number | null = 0;

  if (live) {
    const p = partOf(cfg?.prize);
    const prizeTzs = whole(p.amountTzs), prizeCap = whole(p.capPerReferrer);
    /* ⛔ ONLY THE FIRST-BET PRIZE IS EVER PRICED: a prize on any other milestone (the retired
       `DEPOSIT_THRESHOLD`, or anything unreadable) pays nothing and gets no line. "Who has deposited" is
       the anti-fraud precondition (`requireDeposit`), not a deposit trigger. */
    if (p.enabled === true && p.milestone === "FIRST_BET" && prizeTzs > 0) {
      const cap = prizeCap > 0 ? `up to ${plural(prizeCap, "prize")} per inviter` : "no limit per inviter";
      const who = p.requireDeposit === false ? "a friend" : "a friend who has deposited";
      const minBet = whole(p.minBetAmountTzs);
      lines.push(`A prize of ${formatTzs(prizeTzs)} to the inviter, ${lands}, when ${who} places a bet${minBet > 0 ? ` of at least ${formatTzs(minBet)}` : ""} (once per friend) — ${cap}.`);
      for (const n of roster) oneOff += (prizeCap > 0 ? Math.min(n, prizeCap) : n) * prizeTzs;
    }
    const b = partOf(cfg?.bonus);
    /* ⛔ ONLY THE SIGN-UP BONUS IS EVER PRICED (the retired `FIRST_DEPOSIT` gets no line), and it adds
       nothing to the roster's exposure: everyone already in the roster has signed up. */
    if (b.enabled === true && b.trigger === "SIGNUP") {
      const referrerTzs = whole(b.referrerAmountTzs), newTzs = whole(b.newAmountTzs);
      const toReferrer = (b.recipient === "REFERRER" || b.recipient === "BOTH") && referrerTzs > 0;
      const toNew = (b.recipient === "NEW" || b.recipient === "BOTH") && newTzs > 0;
      if (toReferrer) lines.push(`${formatTzs(referrerTzs)} to the inviter, ${lands}, when a friend signs up with the link.`);
      if (toNew) lines.push(`${formatTzs(newTzs)} to the new player, ${lands}, when they sign up with the link.`);
    }
    const terms = effectivePlayerTerms(cfg);
    if (terms.rate > 0) {
      const pct = Math.round(terms.rate * 100);
      lines.push(`${pct}% of the margin each friend's bets earn 50pick, to the inviter ${lands}, for ${plural(terms.windowMonths, "month")} from the friend's invite date — ${terms.capPerRecruitTzs > 0 ? `at most ${formatTzs(terms.capPerRecruitTzs)} per friend` : "no cap per friend"}.`);
      commissionCeiling = terms.capPerRecruitTzs > 0 ? friends * terms.capPerRecruitTzs : null;
    }
  }

  const nothingPays = lines.length === 0;
  const headline = nothingPays
    ? (live ? NOTHING_PAYS_LINE : SERVICE_PAUSED_LINE)
    : `50pick pays ${plural(lines.length, "reward")}, ${lands}:`;

  let exposureLine: string;
  if (inviters === 0) exposureLine = "Nobody is in the roster yet.";
  else if (nothingPays) exposureLine = `Already in the roster: ${plural(inviters, "inviter")}, ${plural(friends, "friend")} — nothing is paid on them.`;
  else {
    const commission = commissionCeiling === null ? "commission with no ceiling"
      : commissionCeiling > 0 ? `commission up to ${formatTzs(commissionCeiling)}`
      : "no commission";
    exposureLine = `Already in the roster: ${plural(inviters, "inviter")}, ${plural(friends, "friend")} → one-off rewards up to ${formatTzs(oneOff)}; ${commission}.`;
  }

  return {
    lines,
    nothingPays,
    headline,
    destination,
    roster: { inviters, friends },
    oneOffCeilingTzs: nothingPays ? 0 : oneOff,
    commissionCeilingTzs: nothingPays ? 0 : commissionCeiling,
    exposureLine,
  };
}

/**
 * A stable fingerprint of what the reward modes would pay — the Make-payable "as shown" check.
 *
 * ⭐ WHY IT EXISTS. An Owner who confirms "the settings on this page" confirmed a PRICE. If the modes
 * changed between the render and the confirm, the server refuses rather than arm a config nobody saw
 * priced. ⛔ `enabled` is not in it: the ceremony sets that itself.
 * ⚠️ Key order comes from the rule table, never from the object, so a Postgres round trip (which does
 * not keep key order) cannot change it. Not a security boundary — a staleness check.
 */
export function affiliateConfigFingerprint(cfg: AffiliateConfig): string {
  const parts: string[] = [];
  for (const section of AFFILIATE_SECTIONS) {
    const part = (isObject(cfg?.[section]) ? cfg[section] : {}) as Record<string, unknown>;
    for (const key of Object.keys(RULES[section])) parts.push(`${section}.${key}=${JSON.stringify(part[key] ?? null)}`);
  }
  // cyrb53 — a 53-bit string hash, pure JS, identical in the browser and on the server.
  const str = parts.join("|");
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `afp1-${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)}`;
}

/**
 * The reward fields a draft CHANGED against the settings it was loaded from — the reward Save's post
 * (2026-09-26). ⛔ ONLY WHAT CHANGED IS SENT: a form that posts every field writes its page-load values
 * back over whatever another tab or the Owner stored since, which is how an older tab re-armed a prize
 * the Owner had switched off (review P3b). The Save refuses a post whose base fingerprint no longer
 * matches the row, and this keeps the post to the officer's own edits. `enabled` is never compared.
 */
export function changedRewardFields(base: AffiliateConfig, draft: AffiliateConfig): { [S in AffiliateSection]?: Partial<AffiliateConfig[S]> } {
  const out: Record<string, Record<string, unknown>> = {};
  for (const section of AFFILIATE_SECTIONS) {
    const was = (isObject(base?.[section]) ? base[section] : {}) as Record<string, unknown>;
    const now = (isObject(draft?.[section]) ? draft[section] : {}) as Record<string, unknown>;
    for (const key of Object.keys(RULES[section])) {
      if (JSON.stringify(now[key]) !== JSON.stringify(was[key])) (out[section] ??= {})[key] = now[key];
    }
  }
  return out as { [S in AffiliateSection]?: Partial<AffiliateConfig[S]> };
}

type TermRaise = (was: unknown, now: unknown) => boolean;
const numOr0 = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const termUp: TermRaise = (was, now) => numOr0(now) > numOr0(was);
const termDown: TermRaise = (was, now) => numOr0(now) < numOr0(was);
const termArmed: TermRaise = (was, now) => was !== true && now === true;
/** A cap of 0 is UNCAPPED, so dropping a cap to 0 loosens it as surely as raising it. */
const capLoosened: TermRaise = (was, now) => numOr0(was) > 0 && (numOr0(now) === 0 || numOr0(now) > numOr0(was));
const recipientsOf = (v: unknown): string[] => (v === "BOTH" ? ["NEW", "REFERRER"] : typeof v === "string" ? [v] : []);
const recipientWidened: TermRaise = (was, now) => recipientsOf(now).some((r) => !recipientsOf(was).includes(r));

/** Which way each money term RAISES what the invite pays. `trigger` and `milestone` have one value each. */
const TERM_RAISES: Record<AffiliateSection, Record<string, TermRaise>> = {
  commission: { enabled: termArmed, rate: termUp, windowMonths: termUp, capPerRecruitTzs: capLoosened },
  bonus: { enabled: termArmed, recipient: recipientWidened, newAmountTzs: termUp, referrerAmountTzs: termUp },
  prize: { enabled: termArmed, amountTzs: termUp, capPerReferrer: capLoosened, minBetAmountTzs: termDown, requireDeposit: (was, now) => was === true && now !== true },
};

/**
 * ⛔ DID A SAVE RAISE WHAT THE INVITE PAYS? (addendum B, 2026-09-26) — a mode switched ON; a rate, an
 * amount or the window raised; a cap loosened (raised, or dropped to 0 = uncapped); the bonus reaching a
 * new recipient; the prize's minimum bet lowered or its deposit precondition dropped. `changes` is every
 * reward field the save moved, before → after; `raised` names the ones that pay MORE. The reward Save writes
 * a COMPLIANCE `affiliate.reward.terms` row whenever `raised` is not empty.
 */
export function rewardTermsRaised(before: AffiliateConfig, after: AffiliateConfig): { raised: string[]; changes: Record<string, { before: unknown; after: unknown }> } {
  const raised: string[] = [];
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const section of AFFILIATE_SECTIONS) {
    const was = (isObject(before?.[section]) ? before[section] : {}) as Record<string, unknown>;
    const now = (isObject(after?.[section]) ? after[section] : {}) as Record<string, unknown>;
    for (const key of Object.keys(RULES[section])) {
      if (JSON.stringify(now[key]) === JSON.stringify(was[key])) continue;
      changes[`${section}.${key}`] = { before: was[key] ?? null, after: now[key] ?? null };
      const raises = TERM_RAISES[section][key];
      if (raises && raises(was[key], now[key])) raised.push(`${section}.${key}`);
    }
  }
  return { raised, changes };
}

/**
 * ⭐ THE ONE PLAYER-FACING "PAID" (review P8, 2026-09-26): does a player's invite PAY right now — the
 * Owner's switch composed payable, the service-level pause off, AND at least one reward actually armed?
 * "Make payable → Nothing yet" leaves the switch Payable with every mode off, and a surface that asked
 * the switch alone then told players "Invite & Earn", painted the gold dial and the Active chip and listed
 * bonus requirements while nothing could pay. Every player surface asks THIS: the shell, the invite page,
 * the register ribbon, the avatar menu and `/api/health`'s `paying`. ⛔ The admin card keeps its own two
 * states (the switch, for the Owner), which is a different question.
 */
export function invitePaysPlayers(payable: boolean, cfg: AffiliateConfig): boolean {
  return payable === true && cfg?.enabled === true
    && !priceInviteRewards(cfg, { destination: "CASH", rosterRecruitsPerInviter: [] }).nothingPays;
}

/**
 * Code points that print nothing: C0/C1 controls (tab and line feed are kept — the reason is typed in a
 * text area), the soft hyphen, zero-width spaces and joiners, bidi marks, embeddings, overrides and
 * isolates, the word joiner and its invisible siblings, variation selectors, fillers, the byte-order mark
 * and the tag characters. ⚠️ Written as NUMBERS on purpose: an escaped invisible character in this file
 * would be decoded by an editor into the very thing it strips, and could not then be seen or reviewed.
 */
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x0008], [0x000b, 0x001f], [0x007f, 0x009f], [0x00ad, 0x00ad], [0x034f, 0x034f], [0x061c, 0x061c],
  [0x115f, 0x1160], [0x17b4, 0x17b5], [0x180b, 0x180f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x206f],
  [0x3164, 0x3164], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xffa0, 0xffa0], [0xfff0, 0xfff8],
  [0x1d173, 0x1d17a], [0xe0000, 0xe007f], [0xe0100, 0xe01ef],
];

/**
 * ⛔ A CEREMONY REASON, CLEANED BEFORE IT IS MEASURED AND STORED (review, 2026-09-26): every invisible
 * character removed, then trimmed. Five zero-width spaces used to pass the 5-character floor and be
 * stored as the Owner's "reason". The server measures THIS, stores THIS, and the dialog counts THIS, so
 * the count the Owner sees is the count the server applies.
 */
export function cleanReason(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let out = "";
  for (const ch of raw) {
    const cp = ch.codePointAt(0) ?? 0;
    if (!INVISIBLE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) out += ch;
  }
  return out.trim();
}
