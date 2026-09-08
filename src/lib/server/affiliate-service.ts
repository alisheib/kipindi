/**
 * Affiliate / referral service — the runtime engine behind Feature 1.
 *
 * Responsibilities:
 *  - Mint every player a stable, shareable referral code (lazy, on first touch).
 *  - Bind a new registration to its referrer from a referral code, with
 *    anti-fraud guards (no self-referral, one referrer per recruit, IP overlap).
 *  - Accrue the three reward modes — COMMISSION (from a recruit's betting),
 *    BONUS (sign-up / first-deposit), PRIZE (first-bet / deposit milestone) —
 *    each gated by the admin config, capped, idempotent, and audited.
 *  - Credit rewards straight to the recipient's wallet via a CONFIRMED
 *    BONUS_CREDIT transaction (immutable money history, same as every other
 *    money movement in the app).
 *  - Expose read models for the player Invite & Earn page and the admin
 *    dashboard (KPIs, leaderboard, payout ledger).
 *
 * Money rule: every figure is whole TZS. No fractional shillings.
 */
import { db, type StoredAffiliateAccount, type StoredReferralReward, type StoredUser } from "./store";
import { inviteIsLiveFor, NO_VIEWER, type InviteViewer } from "@/lib/feature-state";
import { getAffiliateConfig } from "./affiliate-config";
import { getAgentConfig, commissionWindowEnd, type AgentConfig } from "./agent-config";
import { splitWithholding } from "@/lib/agent-commission";
import { displayLabel } from "@/lib/display-label";
import { audit } from "./audit";
import { randomId } from "./crypto";
import { notifyReferralJoined, notifyReferralReward, notifyAgentCommissionReversed, notifyAgentCommission } from "./notification-service";
import { creditInternal, debitInternal } from "./wallet-service";
import { creditBonus } from "./bonus-service";
import { getBonusConfig } from "./bonus-config";
import { sendEmailToUser, referralRewardHtml, referralEarningHtml, agentCommissionReversedHtml, agentCommissionEarnedHtml } from "./email";
import { appUrl } from "@/lib/app-url";
import { withLock } from "./locks";
import { formatTzs } from "@/lib/utils";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

/**
 * ⭐ THE VETTED-AGENT CODE FORMAT — framework §4, minted at APPROVAL (§2 step 3).
 * `50PICK-AG-` is ten characters, and the six that follow come from the same unambiguous
 * alphabet as a player code.
 */
export const AGENT_CODE_PREFIX = "50PICK-AG-";
const AGENT_CODE_ID_LEN = 6;

/**
 * 🔴 THE LENGTH THAT USED TO SILENTLY EAT AN AGENT'S ATTRIBUTION.
 *
 * `/auth/register` sliced an incoming `?ref=` to SIXTEEN characters, in two places — the page
 * and the server action. `50PICK-AG-` is already ten, leaving six for the id, so a
 * `50PICK-AG-ABC123` code fitted by exactly nothing and anything longer was cut with no
 * error, no audit row, and no ribbon: the attribution was simply lost, permanently, because
 * `recruitedBy` is written once and `already_bound` means it is never re-attributed.
 *
 * ⛔ AND TRUNCATION IS THE WRONG REPAIR EVEN AT A LARGER NUMBER. A cut prefix can MATCH
 * SOMEBODY ELSE'S CODE, which is worse than losing the bind: it is a permanent mis-bind to a
 * partner who did no work. `normalizeReferralCode` therefore REFUSES an over-length input
 * rather than shortening it — an unrecognised code degrades to "no code", which every caller
 * already handles.
 */
export const MAX_REFERRAL_CODE_LEN = 32;

/** The shape a referral code may take: the player alphabet, plus the agent prefix's
 *  `50PICK-AG-` characters (digits and the hyphen). */
const REFERRAL_CODE_RE = /^[A-Z0-9-]{4,32}$/;

/**
 * Normalise an inbound referral code, or return `null` if it cannot be one.
 *
 * ⭐ ONE HOME, consumed by the register page, the register action, `bindRecruit` and
 * `resolveReferralPreview` — so the ribbon and the bind can never disagree about whether a
 * code is valid, which is the promise `resolveReferralPreview`'s own header makes.
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return null;
  // ⛔ REFUSE, never truncate — see MAX_REFERRAL_CODE_LEN.
  if (code.length > MAX_REFERRAL_CODE_LEN) return null;
  if (!REFERRAL_CODE_RE.test(code)) return null;
  return code;
}

/** Mint a `50PICK-AG-XXXXXX` code. Uniqueness is enforced by the caller's retry loop against
 *  `db.affiliate.findByCode`, exactly as player codes are. */
function genAgentCode(): string {
  const hex = randomId(AGENT_CODE_ID_LEN * 2 + 4);
  let id = "";
  for (let i = 0; i + 1 < hex.length && id.length < AGENT_CODE_ID_LEN; i += 2) {
    id += CODE_ALPHABET[parseInt(hex.slice(i, i + 2), 16) % CODE_ALPHABET.length];
  }
  return AGENT_CODE_PREFIX + id;
}

function appBaseUrl(): string {
  return appUrl();
}

/**
 * Build a referral code: up to 4 letters from the display name + a random
 * suffix. Codes are minted at registration when displayName is often null,
 * so the random portion must carry the entropy on its own. We consume the
 * random bytes in PAIRS (0–255 % 32) to cover the FULL 32-char alphabet —
 * a single hex nibble (0–15) would only ever reach the first half and both
 * shrink and bias the space. Target ≥6 random chars for no-name users
 * (32^6 ≈ 1e9), backed by a uniqueness retry loop in ensureAffiliateAccount. */
function genCode(displayName: string | null): string {
  const stem = (displayName ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const head = stem.length >= 2 ? stem : "P";
  const need = Math.max(4, 7 - head.length);
  const hex = randomId(Math.max(16, need * 2 + 4));
  let rand = "";
  for (let i = 0; i + 1 < hex.length && rand.length < need; i += 2) {
    rand += CODE_ALPHABET[parseInt(hex.slice(i, i + 2), 16) % CODE_ALPHABET.length];
  }
  return (head + rand).slice(0, 9);
}

/** Mint (or fetch) the affiliate account for a user. Idempotent. */
export async function ensureAffiliateAccount(userId: string) {
  const existing = await db.affiliate.findByUserId(userId);
  if (existing) return existing;
  const user = await db.user.findById(userId);
  let code = genCode(user?.displayName ?? null);
  // Collision-avoidance — vanishingly rare. Try friendly regenerations first…
  let guard = 0;
  while (await db.affiliate.findByCode(code) && guard < 12) {
    code = genCode(user?.displayName ?? null);
    guard++;
  }
  // …then, if we somehow still collide, widen the code with extra entropy until
  // it is provably unique. Never fall through and mint a duplicate code — two
  // referrers sharing a code would misattribute every recruit and reward.
  while (await db.affiliate.findByCode(code)) {
    const hex = randomId(8);
    let extra = "";
    for (let i = 0; i + 1 < hex.length && extra.length < 4; i += 2) {
      extra += CODE_ALPHABET[parseInt(hex.slice(i, i + 2), 16) % CODE_ALPHABET.length];
    }
    code = (code.slice(0, 5) + extra).slice(0, 12);
  }
  const now = new Date().toISOString();
  const account = await db.affiliate.create({
    userId,
    code,
    recruitCount: 0,
    totalEarnedTzs: 0,
    // ⛔ A FRESHLY MINTED ROW IS NOT AN AGENT, AND EVERY FIELD HERE SAYS SO EXPLICITLY.
    // `commissionPct` is NULL — no officer has priced this person — and the agent branch of
    // `policyFor` REFUSES on null rather than falling back to the player promo's rate. The
    // column used to default to 5.00, which made that refusal unreachable and put the entire
    // player base one dropped conjunct away from being 5% agents.
    commissionPct: null,
    // `true`, and therefore meaningless on its own: it is the officer's revocation switch,
    // read only in conjunction with `approvedAt`.
    active: true,
    // ⭐ THE ONE DISCRIMINATOR, and it starts null for everybody.
    approvedAt: null,
    approvedBy: null,
    deactivatedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  audit({ category: "SYSTEM", action: "affiliate.account.created", actorId: userId, targetType: "AffiliateAccount", targetId: userId, payload: { code } });
  return account;
}

export function referralLinkFor(code: string): string {
  return `${appBaseUrl()}/auth/register?ref=${encodeURIComponent(code)}`;
}

/** Privacy-minimised name for recruit lists / ledgers. "Asha Mwangi" → "As***i M." */
export function maskName(displayName: string | null, phoneE164: string): string {
  if (displayName && displayName.trim().length > 1) {
    const parts = displayName.trim().split(/\s+/);
    const first = parts[0];
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + "." : "";
    const head = first.slice(0, 2);
    const tail = first.length > 3 ? first[first.length - 1] : "";
    return `${head}***${tail}${lastInitial ? " " + lastInitial : ""}`.trim();
  }
  const digits = phoneE164.replace(/\D/g, "");
  return `+${digits.slice(0, 3)}•••${digits.slice(-3)}`;
}

/**
 * The label for a SENSITIVE ADMIN ROSTER — the self-exclusion register and the on-behalf DSAR
 * list. A masked name when the player has one, and the anonymous handle when they do not.
 *
 * 🔴 WHY IT EXISTS (2026-09-06). Those two tables called `maskName` directly, whose fallback for
 * a player with no display name is a PHONE FRAGMENT — `+255•••678`, the last THREE digits. After
 * the phone came under the READ axis on the same day, each of those rows carried the number
 * masked TWO different ways: the governed column showed the last two behind an audited eye, and
 * the name column beside it leaked a third digit with no gate and no audit row. The looser of
 * two maskings of the same value is the one that decides what leaked.
 *
 * ⛔ AND THE FALLBACK IS NOT A TIGHTER PHONE MASK — it is not a phone at all. `display-label.ts`
 * already records the standard this product chose: *"every account has a non-PII handle that
 * operators and players can refer to in chat / disputes without exposing the real name or the
 * masked phone."* The phone is one column over, behind the eye, for anyone who needs it.
 *
 * ⚠️ `maskName` itself is deliberately UNCHANGED. `scripts/erasure.test.mts:224` pins its phone
 * form to the last three digits AND asserts it differs from the name mask, because a redacted
 * record must not be re-identifiable by matching two masks against each other. That is a real
 * control on a different surface; this is a call-site decision, not a rewrite of theirs.
 */
export function maskedRosterLabel(
  user: { id: string; displayName: string | null },
  phoneE164: string,
): string {
  const named = (user.displayName ?? "").trim().length > 1;
  return named ? maskName(user.displayName, phoneE164) : displayLabel({ id: user.id, displayName: null });
}

// ═══════════════════════════════════════════════════════════════════════════
//  THE RESOLVER — one place decides which programme an accrual belongs to,
//  at what rate, into which wallet, under which cap and window.
//
//  ⛔ IT IS KEYED ON THE ATTRIBUTION'S STAMP, NEVER ON THE REFERRER'S CURRENT ROLE.
//
//  🔴 THE EXPLOIT THAT FORCES THIS SHAPE. Until 2026-09-07 the programme was DERIVED at
//  accrual from `inviteIsLiveFor(referrer.role)`. So the play was: farm attributions for
//  free as an ordinary player — every shared market and position link carried your code —
//  then pay the registration fee for AGENT status, and every one of those old binds flipped to
//  paying agent commission at the negotiated rate, on relationships nobody was vetted for,
//  with the window opening on recruits who joined months earlier. A role is mutable and
//  purchasable; a stamp written at bind is neither.
//
//  ⛔ AND THE OBVIOUS SECOND DISCRIMINATOR IS A TRAP. `boundAt >= approvedAt` looks like it
//  says the same thing and does not: `approvedAt` is mutable state, so a
//  deactivate→reactivate cycle restamps it and SILENTLY DELETES the agent's real book.
//  `programme === "AGENT"` is immutable and sufficient on its own.
//
//  ⭐ THE INVARIANT: one referrer, one programme, one payment per event — decided by the
//  STAMPED programme, never by the current role.
// ═══════════════════════════════════════════════════════════════════════════

export type Programme = "PLAYER" | "AGENT";

/** Why an accrual or a bind was refused. Every value reaches an audit row, so a zero payout
 *  is always explainable — the officer's "partial payout I cannot explain" disappears for
 *  ALL its causes, not just the interesting one. */
export type ReferralRefusal =
  | "no_referrer"
  | "referrer_missing"
  | "programme_disabled"
  | "agent_not_approved"
  | "agent_deactivated"
  | "agent_account_closed"
  | "agent_account_suspended"
  | "agent_self_excluded"
  | "agent_rate_unset"
  | "player_invite_withdrawn"
  | "window_expired"
  | "cap_exhausted"
  | "no_fee";

/** An agent's commercial standing, derived from the user row and the affiliate row
 *  together. ⛔ Nothing else computes this — `closeAccount`, admin suspend and
 *  self-exclusion stay untouched, so no status writer can forget to call a deactivator. */
export type AgentStanding =
  | { ok: true }
  | { ok: false; refusal: ReferralRefusal };

/**
 * The resolved economics for ONE accrual. Everything downstream reads this and nothing
 * re-derives any part of it.
 *
 * ⚠️ `rate` IS A FRACTION (0..1). The two programmes store their rate at different scales —
 * `AffiliateAgent.commissionPct` is a PERCENT (`20.00`), `affiliate-config.commission.rate`
 * is a FRACTION (`0.5`) — and this is the ONE place the conversion happens. Feeding one into
 * the other is a 40× error, so nothing outside this resolver may read either raw value.
 */
export type ReferralPolicy = {
  programme: Programme;
  /** Fraction 0..1 of the base. */
  rate: number;
  /** ⛔ AGENT is always CASH. Never the bonus wallet, never a wagering requirement. */
  destination: "CASH" | "BONUS";
  /** The transaction type the credit is booked as. ⛔ AGENT is `AGENT_COMMISSION`, never
   *  `BONUS_CREDIT` — that reports contracted business income to the regulator as bonus cost. */
  txnType: "AGENT_COMMISSION" | "BONUS_CREDIT";
  /** 0 = uncapped. */
  capPerRecruitTzs: number;
  /** 0 = lifetime. Measured from the BIND. */
  windowMonths: number;
  /**
   * ⭐ LOCAL WITHHOLDING TAX ON THE RECIPIENT'S EARNINGS, as a PERCENT of the gross accrual.
   * Management's waterfall, 2026-09-08. `0` means no tax applies and the gross is credited.
   *
   * ⛔ AGENT ONLY, AND `0` FOR PLAYER BY CONSTRUCTION. The player promo pays a promotional
   * grant, not commission income — there is nothing to withhold against, and a tax line on
   * a bonus would misreport promotional spend as remitted tax in the statutory pack.
   */
  withholdingPct: number;
  /** Whether the flat player rewards (sign-up bonus, first-bet prize) apply at all.
   *  ⛔ FALSE for AGENT — the programme is commission-only BY CONSTRUCTION, so `payPrize`
   *  and `payBonus` are never reached with an agent context and there is no early return
   *  for anyone to forget. */
  flatRewards: boolean;
};

/** The stamped attribution — who recruited this account, under which programme, and when. */
export type Attribution = {
  referrerUserId: string;
  programme: Programme;
  /** ISO. The commission window measures from here. */
  boundAt: string;
  code: string | null;
};

/**
 * ⭐ NULL MEANS PLAYER, NEVER AGENT. This is the only place that coalesces, and it coalesces
 * in the safe direction: a legacy row with no stamp is a PLAYER attribution, which today
 * pays nothing at all. A fall-through to the agent branch would have re-created the exploit
 * with a new name.
 */
export function programmeOf(u: Pick<StoredUser, "recruitedProgramme">): Programme {
  return u.recruitedProgramme === "AGENT" ? "AGENT" : "PLAYER";
}

/** True when this account is a vetted, approved agent — ⭐ `approvedAt` ALONE. A row's
 *  existence proves nothing: one is auto-minted for every player who touches the surface. */
export function isApprovedAgent(account: Pick<StoredAffiliateAccount, "approvedAt"> | null | undefined): boolean {
  return !!account?.approvedAt;
}

/**
 * May this agent create new relationships and earn on existing ones?
 *
 * ⛔ CLOSED, SUSPENDED and SELF_EXCLUDED end the commercial relationship; `active` is the
 * officer's explicit revocation switch. All four stop BOTH recruiting and accruing, which is
 * what keeps a dead partner's public `50PICK-AG-` link — on WhatsApp, on posters, and it
 * never expires — from binding new gamblers to an account nobody is watching.
 *
 * ⚠️ COOLED_OFF IS DELIBERATELY ABSENT. A cooling-off period is a responsible-gambling break
 * about the agent's OWN play; it is not the end of a business relationship, and destroying a
 * partner's contracted income for a 24-hour break would be forfeiture, not protection. Their
 * accrual is recorded PENDING instead (see `payCommission`) and settled out of band.
 */
export function agentStandingFor(
  user: Pick<StoredUser, "status">,
  account: Pick<StoredAffiliateAccount, "approvedAt" | "active"> | null | undefined,
): AgentStanding {
  if (!account?.approvedAt) return { ok: false, refusal: "agent_not_approved" };
  if (!account.active) return { ok: false, refusal: "agent_deactivated" };
  if (user.status === "CLOSED") return { ok: false, refusal: "agent_account_closed" };
  if (user.status === "SUSPENDED") return { ok: false, refusal: "agent_account_suspended" };
  if (user.status === "SELF_EXCLUDED") return { ok: false, refusal: "agent_self_excluded" };
  return { ok: true };
}

/**
 * ⭐ THE ONE PLACE A PAGE ASKS "may this viewer see the invite programme?".
 *
 * Loads the user and the affiliate row once and composes the `InviteViewer` that
 * `feature-state.ts` now requires. Every surface that used to call `inviteIsLiveFor(role)` —
 * the shell, the profile row, the share links on markets and positions, the achievements
 * shelf, the invite page itself — calls this instead, so "may see" and "may recruit" and
 * "may earn" are all derived from `agentStandingFor`, and a deactivated agent loses every one
 * of them in the same instant.
 *
 * `null` / a failed read → `NO_VIEWER`: a failed read must never open a withdrawn programme.
 */
export async function inviteViewerFor(userId: string | null | undefined): Promise<InviteViewer> {
  if (!userId) return NO_VIEWER;
  try {
    const user = await db.user.findById(userId);
    if (!user) return NO_VIEWER;
    const account = await db.affiliate.findByUserId(userId);
    return { role: user.role, agentInGoodStanding: agentStandingFor(user, account).ok };
  } catch {
    return NO_VIEWER;
  }
}

/** The same composition for rows already in hand — used inside the resolver. */
function inviteViewerOf(user: StoredUser, account: StoredAffiliateAccount | null): InviteViewer {
  return { role: user.role, agentInGoodStanding: agentStandingFor(user, account).ok };
}

/**
 * ⭐ THE ONE RESOLVER. `policyFor(programme, account, cfg, agentCfg)`.
 *
 * ⛔ KEYED ON THE PROGRAMME, NOT ON THE AGENT'S OWN ROW. Passing the account in is how the
 * agent's negotiated rate is read; branching on it would be the same role-now defect wearing
 * a different column.
 *
 * ⛔ THE AGENT BRANCH REFUSES ON A NULL RATE AND NEVER FALLS BACK. Falling back to
 * `cfg.commission.rate` would price a vetted partner off the GROWTH officer's player-promo
 * lever — a different programme's number, at a different scale, chosen by someone who cannot
 * see this page.
 *
 * ⛔ THE AGENT BRANCH NEVER READS `cfg.enabled` OR `cfg.commission.enabled`. Those are the
 * player promo's switches. An agent's on/off is `agentCfg.enabled` plus their own standing.
 */
export function policyFor(
  programme: Programme,
  account: Pick<StoredAffiliateAccount, "commissionPct"> | null | undefined,
  cfg: ReturnType<typeof getAffiliateConfig>,
  agentCfg: AgentConfig,
): { ok: true; policy: ReferralPolicy } | { ok: false; refusal: ReferralRefusal } {
  if (programme === "AGENT") {
    // ⛔ NOT `agentCfg.enabled`. That switch closes the DOOR — applications and invitations —
    // and an operator closing the door must not silently stop paying the partners already
    // inside: commission is contracted income, and the only things that end it are the
    // agent's STANDING (approvedAt · active · account status — see `agentStandingFor`) and
    // the officer's rate. `test:agent-policy` §4 holds this open.
    const pct = account?.commissionPct;
    // 🔴 AN APPROVED AGENT WITH NO RATE IS AN INVARIANT VIOLATION, NOT A DEFAULT.
    // `approveAgent` sets the rate atomically with the approval, so reaching here means
    // something wrote one without the other. Refuse loudly rather than pay a number nobody
    // chose — the caller raises an ADMIN audit so an officer sees it, instead of a partner
    // quietly earning the wrong amount for a month.
    if (pct === null || pct === undefined || !Number.isFinite(pct) || pct <= 0) {
      return { ok: false, refusal: "agent_rate_unset" };
    }
    // ⚠️ THE ONE CONVERSION. Percent → fraction, here and nowhere else.
    // Clamped at the platform ceiling as a belt-and-braces on a money path: `validate()`
    // and the officer's field both enforce it, but a rate that somehow got past both must
    // not be able to pay more than the rule allows.
    const capped = Math.min(pct, agentCfg.maxCommissionPct);
    return {
      ok: true,
      policy: {
        programme: "AGENT",
        rate: capped / 100,
        destination: "CASH",
        txnType: "AGENT_COMMISSION",
        capPerRecruitTzs: agentCfg.capPerRecruitTzs,
        windowMonths: agentCfg.commissionWindowMonths,
        // ⭐ THE WITHHOLDING RATE TRAVELS ON THE POLICY, like the commission rate does, so
        // the accrual never reads config a second time and a mid-settlement config edit
        // cannot tax half a market's positions at one rate and half at another.
        withholdingPct: agentCfg.agentWithholdingTaxPct,
        // ⛔ COMMISSION-ONLY BY CONSTRUCTION. The flat prize and the sign-up bonus are the
        // PLAYER promo's instruments; an agent is paid a share of revenue they generated,
        // and nothing else. On the shipped config the prize is ON and commission is OFF, so
        // without this flag an approved agent would have earned TZS 200,000 of flat prizes
        // as withdrawable cash and zero commission — the exact inverse of the decision.
        flatRewards: false,
      },
    };
  }

  // ── PLAYER ────────────────────────────────────────────────────────────────
  if (!cfg.enabled) return { ok: false, refusal: "programme_disabled" };
  return {
    ok: true,
    policy: {
      programme: "PLAYER",
      // Already a fraction on this side. ⛔ Do not divide.
      rate: cfg.commission.enabled ? cfg.commission.rate : 0,
      // The player promo routes through the bonus wallet when the bonus programme is on;
      // `creditWallet` still falls back to cash if the grant cannot be made, exactly as before.
      destination: "BONUS",
      txnType: "BONUS_CREDIT",
      capPerRecruitTzs: cfg.commission.capPerRecruitTzs,
      windowMonths: cfg.commission.windowMonths,
      // ⛔ ZERO FOR PLAYER, BY CONSTRUCTION AND NOT BY CONFIG. A player promo pays a
      // promotional grant; there is no commission income to withhold against, and a tax
      // line on a bonus would report promotional spend to TRA as remitted tax.
      withholdingPct: 0,
      flatRewards: true,
    },
  };
}

/**
 * The stamped attribution for a recruit, or `null` when there is none.
 * ⛔ `boundAt` falls back to `createdAt` ONLY for legacy rows written before the stamp
 * existed — those are all PLAYER, and the player window is not lifetime, so the fallback can
 * never extend an agent's window.
 */
export async function attributionFor(recruitUserId: string): Promise<Attribution | null> {
  const recruit = await db.user.findById(recruitUserId);
  if (!recruit?.recruitedBy) return null;
  return {
    referrerUserId: recruit.recruitedBy,
    programme: programmeOf(recruit),
    boundAt: recruit.recruitedAt ?? recruit.createdAt,
    code: recruit.recruitedByCode ?? null,
  };
}

/** Everything an accrual hook needs, resolved ONCE. `null` means "this event pays nothing",
 *  and the reason is audited by the caller so a zero payout is never a mystery. */
export type AccrualContext = {
  attribution: Attribution;
  referrer: StoredUser;
  account: StoredAffiliateAccount | null;
  policy: ReferralPolicy;
};

/**
 * ⭐ THE SINGLE SEAM. `referrerMayEarn` is GONE rather than kept as a sibling — a second
 * definition of "may earn" is how the bind gate and the payment gate came to disagree in the
 * first place, and `feature-state.ts` records the standing rule that this predicate "must not
 * grow a SECOND definition somewhere else".
 *
 * ⛔ NO ACCRUAL HOOK MAY CALL `getAffiliateConfig()` OR `getAgentConfig()` AGAIN. Both are
 * read here, once, and threaded down — otherwise a switch flipped mid-settlement splits one
 * market across two policies.
 */
export async function accrualContextFor(
  recruitUserId: string,
): Promise<{ ok: true; ctx: AccrualContext } | { ok: false; refusal: ReferralRefusal; attribution: Attribution | null }> {
  const attribution = await attributionFor(recruitUserId);
  if (!attribution) return { ok: false, refusal: "no_referrer", attribution: null };

  const referrer = await db.user.findById(attribution.referrerUserId);
  if (!referrer) return { ok: false, refusal: "referrer_missing", attribution };

  const account = await db.affiliate.findByUserId(attribution.referrerUserId);

  if (attribution.programme === "AGENT") {
    const standing = agentStandingFor(referrer, account);
    if (!standing.ok) return { ok: false, refusal: standing.refusal, attribution };
  } else {
    // The PLAYER programme's own gate: today `invite` is WITHDRAWN, so an ordinary player's
    // attribution pays nothing. ⛔ `agentInGoodStanding` is passed as FALSE here on purpose —
    // this is a PLAYER-stamped attribution, and an agent's standing must never open the player
    // promo for it (that is the exploit: buy AGENT status, and the pre-approval book flips).
    // Only the product state may open this branch.
    if (!inviteIsLiveFor({ role: referrer.role, agentInGoodStanding: false })) {
      return { ok: false, refusal: "player_invite_withdrawn", attribution };
    }
  }

  const resolved = policyFor(attribution.programme, account, getAffiliateConfig(), getAgentConfig());
  if (!resolved.ok) return { ok: false, refusal: resolved.refusal, attribution };

  return { ok: true, ctx: { attribution, referrer, account, policy: resolved.policy } };
}

/** One audit row per refused accrual, so a zero payout is always explainable. */
function auditRefusal(
  action: string,
  refusal: ReferralRefusal,
  recruitUserId: string,
  attribution: Attribution | null,
  extra: Record<string, unknown> = {},
): void {
  audit({
    category: refusal === "agent_rate_unset" ? "ADMIN" : "SYSTEM",
    action,
    actorId: null,
    targetType: "User",
    targetId: recruitUserId,
    payload: {
      refusal,
      recruitUserId,
      referrerUserId: attribution?.referrerUserId ?? null,
      programme: attribution?.programme ?? null,
      ...extra,
    },
  });
}

/**
 * May this code CREATE a new attribution? Consumed by BOTH `bindRecruit` and
 * `resolveReferralPreview`, so the ribbon can never promise what the bind will refuse —
 * the promise `resolveReferralPreview`'s own header makes.
 */
async function mayRecruit(
  referrer: StoredUser,
  account: StoredAffiliateAccount | null,
): Promise<{ ok: true; programme: Programme } | { ok: false; refusal: ReferralRefusal }> {
  // An approved agent recruits under the AGENT programme.
  if (isApprovedAgent(account)) {
    const standing = agentStandingFor(referrer, account);
    if (!standing.ok) return { ok: false, refusal: standing.refusal };
    // ⛔ NOT `getAgentConfig().enabled` — that closes the DOOR (applications, invitations), not
    // the room. A partner already approved keeps recruiting until their STANDING ends
    // (`agentStandingFor`), the same rule the accrual applies. `test:agent-policy` §4.
    return { ok: true, programme: "AGENT" };
  }
  // Everyone else falls to the player programme's own gate — the product state alone. A
  // role of AGENT with no approval is NOT an agent (that is the fixture that kept three
  // guards green while asserting the wrong answer), so standing is passed as false and only
  // `FEATURE_INVITE=ACTIVE` can open this branch.
  if (!inviteIsLiveFor(inviteViewerOf(referrer, null))) return { ok: false, refusal: "player_invite_withdrawn" };
  return { ok: true, programme: "PLAYER" };
}

/**
 * Registration-time preview for a referral code: who invited you and whether
 * a sign-up bonus is on offer. Returns null when the code is unknown so the
 * ribbon degrades gracefully (no ribbon shown).
 */
export async function resolveReferralPreview(code: string) {
  // ⭐ ONE normaliser, shared with the bind — so an over-length or malformed code degrades to
  // "no ribbon" here for exactly the same reason it degrades to "no bind" there.
  const norm = normalizeReferralCode(code);
  if (!norm) return null;
  const affiliate = await db.affiliate.findByCode(norm);
  if (!affiliate) return null;
  const referrer = await db.user.findById(affiliate.userId);
  if (!referrer) return null;
  /**
   * ⛔ THE RIBBON IS A PROMISE, SO IT OBEYS THE SAME GATE AS THE BIND.
   * `/auth/register?ref=CODE` is reachable by anyone holding an old shared link, and those
   * links do not expire. Rendering "You were invited by X · Claim your welcome bonus" for a
   * code that `bindRecruit` is now going to REFUSE would be the product promising a reward it
   * has already decided not to pay — the exact contradiction this programme exists to remove.
   * Returning null degrades gracefully: the page shows no ribbon, exactly as for an unknown
   * code, and the hidden `ref` field is never rendered.
   *
   * ⭐ IT IS THE SAME FUNCTION AS THE BIND'S NOW, not a parallel condition that agrees today.
   * A deactivated agent's badge vanishing and their code refusing are one decision.
   */
  const may = await mayRecruit(referrer, affiliate);
  if (!may.ok) return null;
  const cfg = getAffiliateConfig();
  // New-player bonus is only advertised when the program + bonus mode are on
  // and the new player is actually a recipient.
  // ⛔ NEVER FOR AN AGENT'S CODE. The agent programme pays commission to the agent and makes
  // no offer to the recruit at all, so advertising a welcome bonus on an agent's ribbon
  // would be the player promo's terms on a page the player promo does not govern.
  const newPlayerBonusTzs =
    may.programme === "PLAYER" && cfg.enabled && cfg.bonus.enabled && (cfg.bonus.recipient === "NEW" || cfg.bonus.recipient === "BOTH")
      ? cfg.bonus.newAmountTzs
      : 0;
  const name =
    referrer.displayName && referrer.displayName.trim().length > 0
      ? referrer.displayName.trim().split(/\s+/).slice(0, 2).map((p: string, i: number) => (i === 1 ? p[0].toUpperCase() + "." : p)).join(" ")
      : "a friend";
  return {
    referrerName: name,
    newPlayerBonusTzs,
    bonusTrigger: cfg.bonus.trigger,
    /** ⭐ The read model behind the "Verified 50pick Agent" trust mark. It is a claim about a
     *  vetted, fee-paying, compliance-approved partner — so it is derived from the same
     *  standing check that decides whether the code binds at all, never from a role string. */
    programme: may.programme,
    verifiedAgent: may.programme === "AGENT",
  };
}

// ── Wallet credit (internal) ─────────────────────────────────────────────
/** Credit a referral reward. Routes to the BONUS wallet when the bonus program
 *  is enabled and affiliate→bonus routing is on (Ali's default — rewards must be
 *  played through); otherwise credits real balance directly. Falls back to real
 *  if a bonus credit can't be made, so a reward is never silently dropped. */
async function creditWallet(
  userId: string,
  amount: number,
  description: string,
  sourceRef: string | undefined,
  policy: ReferralPolicy,
  /** ⭐ Withholding tax already deducted from the gross by the caller. `amount` is the NET.
   *  Only ever non-zero on the AGENT cash path — see `ReferralPolicy.withholdingPct`. */
  taxWithheld = 0,
): Promise<boolean> {
  /**
   * 🔴 THE WALLET DEFECT, AND IT WAS LIVE ON THE SHIPPED DEFAULTS.
   *
   * `bonus-config` ships `enabled: true` and `affiliateToBonus: true`, and production has NO
   * `bonus.config` row — so the file's defaults ARE the live values. Agent commission would
   * therefore have landed in the BONUS wallet with a 5× wagering requirement and a 30-day
   * expiry: contracted business income for a partner who paid the registration fee, converted into a
   * promotional grant they must gamble through before they can touch it.
   *
   * ⛔ THE AGENT BRANCH NEVER CONSULTS `bonus-config` AT ALL. Not "consults it and usually
   * decides cash" — never reaches it. The destination is a property of the POLICY, resolved
   * once from the stamped programme, so no bonus switch can move an agent's money.
   *
   * ⛔ AND THE TYPE TRAVELS WITH IT. `creditInternal` defaults to `BONUS_CREDIT`; passing
   * `AGENT_COMMISSION` explicitly is what keeps the owner's book, the daily P&L and the
   * statutory regulator pack from reporting a commission payment as bonus cost.
   */
  if (policy.destination === "CASH") {
    return (await creditInternal(userId, amount, { description, type: policy.txnType, taxWithheld })) !== null;
  }
  const bcfg = getBonusConfig();
  if (bcfg.enabled && bcfg.affiliateToBonus) {
    // Pass a deterministic sourceRef so creditBonus dedupes: even if a reward
    // payer is somehow re-entered, the grant lands at most once. (The payer's
    // own lock + existence check is the primary guard; this is belt-and-suspenders
    // and gives cross-instance dedupe on the bonus path.)
    const r = await creditBonus(userId, { amountTzs: amount, source: "REFERRAL", sourceRef, note: description });
    if (r.ok) return true;
    // bonus credit failed (disabled mid-flight / wallet issue) → fall through to real.
  }
  return (await creditInternal(userId, amount, { description })) !== null;
}

async function recordReward(input: {
  referrerUserId: string;
  recruitUserId: string;
  recipientUserId: string;
  type: StoredReferralReward["type"];
  label: string;
  /** ⚠️ THE NET — what actually reached the wallet. See the call site in the accrual. */
  amountTzs: number;
  /** The commission before withholding tax. Null for a reward that is not priced off a rate
   *  (a flat prize or sign-up bonus) and for anything with no tax to withhold. */
  grossAmountTzs?: number | null;
  /** The withholding tax deducted from `grossAmountTzs`. Null/0 when none applies. */
  taxWithheldTzs?: number | null;
  status: StoredReferralReward["status"];
  note?: string | null;
  /** ⭐ COPIED from the attribution's stamp — ⛔ never re-derived from the referrer's role. */
  programme: Programme;
  /** The rate that priced this row, as a PERCENT, so a later rate change never rewrites
   *  history. Null for flat rewards, which are not priced off a rate at all. */
  rateApplied?: number | null;
  marketId?: string | null;
  sourceRef?: string | null;
}) {
  const reward = await db.referralReward.create({
    id: `ref_${randomId(12)}`,
    referrerUserId: input.referrerUserId,
    recruitUserId: input.recruitUserId,
    recipientUserId: input.recipientUserId,
    type: input.type,
    label: input.label,
    amountTzs: input.amountTzs,
    grossAmountTzs: input.grossAmountTzs ?? null,
    taxWithheldTzs: input.taxWithheldTzs ?? null,
    status: input.status,
    note: input.note ?? null,
    programme: input.programme,
    rateApplied: input.rateApplied ?? null,
    marketId: input.marketId ?? null,
    sourceRef: input.sourceRef ?? null,
    reversedAt: null,
    reversedReason: null,
    createdAt: new Date().toISOString(),
  });
  // Keep the affiliate account's denormalised earnings in sync (only count
  // money that actually reached the referrer, and only PAID rewards).
  //
  // 🔴 THIS WAS A READ-MODIFY-WRITE ACROSS TWO DIFFERENT LOCKS. It read
  // `acct.totalEarnedTzs` and wrote `+ amount` — but the enclosing lock is per-RECRUIT
  // (`referral:commission:{referrer}:{recruit}`), so two recruits of the SAME agent settling
  // at the same moment each read the same total and each wrote their own. One accrual then
  // vanished from the agent's own earnings statement while its reward row survived, which is
  // the worst shape of all: the money moved and the statement disagrees.
  //
  // ⭐ It is the same lost update `incrementRecruitCount` was already fixed for (audit M7) —
  // on the counter that carries money rather than the one that carries a display figure.
  if (input.status === "PAID" && input.recipientUserId === input.referrerUserId) {
    await ensureAffiliateAccount(input.referrerUserId);
    await db.affiliate.incrementEarned(input.referrerUserId, input.amountTzs);
  }
  audit({
    category: "WALLET",
    action: "affiliate.reward.recorded",
    actorId: null,
    targetType: "ReferralReward",
    targetId: reward.id,
    payload: {
      type: reward.type, amount: reward.amountTzs, status: reward.status,
      referrer: input.referrerUserId, recruit: input.recruitUserId,
      // The stamped programme and the priced rate belong in the chain: they are what a
      // regulator asks about a payment, and a reward row alone cannot say which of two
      // programmes' money it was.
      programme: reward.programme, rateApplied: reward.rateApplied,
      marketId: reward.marketId, sourceRef: reward.sourceRef,
    },
  });
  return reward;
}

// ── Registration binding ─────────────────────────────────────────────────
/**
 * Bind a freshly-registered user to the referrer behind `code`.
 * Returns the referrer's userId on success, or a reason it was skipped.
 * Always safe to call — invalid / missing codes are a no-op.
 */
export async function bindRecruit(opts: { recruitUserId: string; code: string; ip?: string | null }):
  Promise<{ bound: true; referrerUserId: string } | { bound: false; reason: string }> {
  // ⭐ ONE normaliser, shared with the ribbon. An over-length or malformed code is REFUSED
  // rather than truncated: a cut prefix can match somebody else's code, and a permanent
  // mis-bind to a partner who did no work is worse than losing the attribution.
  const code = normalizeReferralCode(opts.code);
  if (!code) return { bound: false, reason: "no_code" };

  const recruit = await db.user.findById(opts.recruitUserId);
  if (!recruit) return { bound: false, reason: "recruit_not_found" };
  if (recruit.recruitedBy) return { bound: false, reason: "already_bound" };

  const affiliate = await db.affiliate.findByCode(code);
  if (!affiliate) {
    // An unknown code used to vanish with no trace at all, which is how the 16-character
    // truncation stayed invisible: the symptom was an absence.
    audit({
      category: "SYSTEM",
      action: "affiliate.bind.unknown_code",
      actorId: opts.recruitUserId,
      targetType: "User",
      targetId: opts.recruitUserId,
      payload: { code },
    });
    return { bound: false, reason: "invalid_code" };
  }
  const referrerUserId = affiliate.userId;

  /**
   * 🔴 A CODE ONLY RECRUITS IF ITS OWNER MAY ACTUALLY REFER — AND THIS IS AN ATTRIBUTION
   * GATE, NOT A PAYMENT ONE.
   *
   * Every player was minted a code automatically, and until this programme every shared
   * market and position link carried one. Those links are already out there and they do not
   * expire. `recruitedBy` is written ONCE, a few lines below, and `already_bound` above means
   * it is NEVER re-attributed — so a bind made today is permanent.
   *
   * ⛔ "It pays nothing right now" is not a defence. Nothing pays *today* because the reward
   * modes are gated; the ROW still gets written. Re-enable the programme in a month and every
   * one of those silent binds becomes a live attribution nobody chose, on a relationship no
   * agent was vetted for. The cheapest moment to refuse is before the write.
   *
   * ⭐ It reads the SAME seam as every other surface, so binding can never disagree with what
   * the product shows: if `feature-state.ts` says this owner may not refer, their code does
   * not recruit. Under re-enablement the gate opens for everyone at once, by construction.
   *
   * ⭐ `approvedAt` / `active` ARRIVED 2026-09-07, exactly as this comment reserved — and they
   * live in `mayRecruit`, the ONE predicate the ribbon reads too. A closed, suspended,
   * self-excluded or deactivated agent's `50PICK-AG-` link is a public artefact on WhatsApp
   * and on posters that never expires; without this it would keep binding new gamblers to a
   * dead account, and every settlement would write a reward row nobody could ever pay.
   */
  const referrer = await db.user.findById(referrerUserId);
  if (!referrer) {
    return { bound: false, reason: "referrer_not_eligible" };
  }
  const may = await mayRecruit(referrer, affiliate);
  if (!may.ok) {
    audit({
      category: "ADMIN",
      // ⭐ The refusal REASON is in the payload, so a deactivated agent is separable from a
      // withdrawn player promo in the log. The action name is kept for continuity with the
      // rows already in the chain.
      action: "affiliate.bind.refused_withdrawn",
      actorId: opts.recruitUserId,
      targetType: "User",
      targetId: opts.recruitUserId,
      payload: { code, referrerUserId, referrerRole: referrer.role, refusal: may.refusal },
    });
    return { bound: false, reason: "referrer_not_eligible" };
  }
  const programme = may.programme;

  // Anti-fraud: a user can never recruit themselves.
  if (referrerUserId === opts.recruitUserId) {
    audit({ category: "SECURITY", action: "affiliate.self_referral_blocked", actorId: opts.recruitUserId, targetType: "User", targetId: opts.recruitUserId, payload: { code } });
    return { bound: false, reason: "self_referral" };
  }

  // Anti-fraud: same phone-region tricks are out of scope here, but a shared
  // device/IP between referrer's recent session and this sign-up is the
  // classic multi-account vector. We don't block the bind (legit family
  // sharing exists), but we mark it so rewards land HELD for review.
  const suspectIpOverlap = !!opts.ip && referrerSharesIp(referrerUserId, opts.ip);

  /**
   * ⭐ THE STAMP GOES ON IN THE SAME WRITE AS THE ATTRIBUTION ITSELF.
   *
   * ⛔ NOT A `ReferralAttribution` TABLE. That would make a second writer beside readers that
   * already exist (`getPlayerReferralSummary`, `getAdminAffiliateStats`, the DSAR bundle,
   * erasure), and the two would drift. One write, one row, no window in which an attribution
   * exists without its programme.
   *
   * ⛔ AND `recruitedProgramme` IS IMMUTABLE FROM HERE. Nothing rewrites it — not approval,
   * not deactivation, not a role change. That immutability IS the fix: it is what stops a
   * newly-approved agent retro-monetising a book they assembled for free as a player.
   */
  const boundAt = new Date().toISOString();
  await db.user.update(opts.recruitUserId, {
    recruitedBy: referrerUserId,
    recruitedProgramme: programme,
    recruitedAt: boundAt,
    recruitedByCode: code,
  });
  await ensureAffiliateAccount(referrerUserId);
  // Atomic increment (audit M7) — the old `recruitCount + 1` read-modify-write
  // lost updates when two recruits bound concurrently. Display-only, but correct.
  await db.affiliate.incrementRecruitCount(referrerUserId);
  await ensureAffiliateAccount(opts.recruitUserId); // recruit gets their own link too

  audit({
    category: "ADMIN",
    action: "affiliate.recruit.bound",
    actorId: opts.recruitUserId,
    targetType: "User",
    targetId: opts.recruitUserId,
    payload: { referrerUserId, code, suspectIpOverlap, programme, boundAt },
  });

  // Notify the referrer that their friend joined.
  notifyReferralJoined(referrerUserId, { recruitMasked: maskName(recruit.displayName, recruit.phoneE164) });

  // Sign-up-triggered bonus (if configured).
  // ⛔ PLAYER PROGRAMME ONLY, AND BY CONSTRUCTION RATHER THAN BY AN EARLY RETURN INSIDE
  // `payBonus`. An agent earns commission on revenue and nothing else — no sign-up bonus, no
  // flat prize. Routing the call itself means there is no guard clause anyone can forget, and
  // no second definition of "is this an agent" living inside a payer.
  const cfg = getAffiliateConfig();
  if (programme === "PLAYER" && cfg.enabled && cfg.bonus.enabled && cfg.bonus.trigger === "SIGNUP") {
    await payBonus({ referrerUserId, recruitUserId: opts.recruitUserId, held: suspectIpOverlap });
  }

  return { bound: true, referrerUserId };
}

/** True if the referrer has an active/recent session from the same IP. */
function referrerSharesIp(referrerUserId: string, ip: string): boolean {
  try {
    // Sessions are not exposed on the db facade; this is a best-effort,
    // conservative check against the global session store if present.
    const sessions = (globalThis as { __50PICK_SESSIONS?: Map<string, { userId: string; ip?: string | null }> }).__50PICK_SESSIONS;
    if (!sessions) return false;
    for (const s of sessions.values()) {
      if (s.userId === referrerUserId && s.ip && s.ip === ip) return true;
    }
  } catch { /* ignore */ }
  return false;
}

// ── Reward payers (idempotent, capped, config-gated) ─────────────────────
//
// ⛔ `referrerMayEarn` IS GONE, NOT DEPRECATED. It asked `inviteIsLiveFor(referrer.role)` —
// the referrer's role NOW — and that is the whole defect this programme exists to close: a
// role is mutable and purchasable, so every pre-existing attribution flipped to agent
// economics the instant `approveAgent` ran. `accrualContextFor` replaces it outright, keyed
// on the immutable stamp. A shim left behind would have let the old, role-blind answer keep
// compiling at every call site, which is exactly how `invite-feature.ts` nearly shipped one
// surface still holding the previous answer.
//
// ⭐ AND THE PAYERS BELOW ARE REACHED ONLY UNDER A `PLAYER` POLICY. That is why neither has
// an "is this an agent" early return: an agent context never arrives, so there is no guard
// clause for anyone to forget and no third definition of what an agent is.

/** Pay the sign-up / first-deposit bonus once per recruit. ⛔ PLAYER programme only. */
async function payBonus(opts: { referrerUserId: string; recruitUserId: string; held: boolean }): Promise<void> {
  const cfg = getAffiliateConfig();
  if (!cfg.enabled || !cfg.bonus.enabled) return;
  // The player promo's own destination: bonus wallet when the bonus programme is on, cash
  // otherwise. ⛔ An agent's policy is never `PLAYER`, so this can never route agent money.
  const playerPolicy = policyFor("PLAYER", null, cfg, getAgentConfig());
  if (!playerPolicy.ok) return;
  const policy = playerPolicy.policy;

  // Serialize per recruit so two concurrent triggers (e.g. sign-up + a racing
  // first-deposit, or a retry) can't both pass the once-per-recruit guard and
  // double-pay. The guard is RE-READ inside the lock — the read-then-act was
  // the race. (withLock is a cross-instance advisory lock in prod.)
  await withLock(`referral:reward:${opts.recruitUserId}`, async () => {
    // Idempotency — only one bonus per recruit, ever (re-checked under the lock).
    const priorBonus = (await db.referralReward.listByRecruit(opts.recruitUserId)).some((r) => r.type === "BONUS");
    if (priorBonus) return;

    const status: StoredReferralReward["status"] = opts.held ? "HELD" : "PAID";
    const triggerLabel = cfg.bonus.trigger === "SIGNUP" ? "sign-up" : "deposit";

    const payTo = async (userId: string, amount: number, who: "new" | "referrer") => {
      if (amount <= 0) return;
      // If the credit can't land (frozen/missing wallet), record the reward as
      // HELD rather than PAID — otherwise the ledger claims money was paid that
      // never moved, and the held queue lets an officer retry it.
      const credited = status === "PAID"
        ? await creditWallet(userId, amount, `Referral bonus · ${triggerLabel}`, `referral:bonus:${opts.recruitUserId}:${who}`, policy)
        : false;
      const finalStatus: StoredReferralReward["status"] = status === "PAID" && !credited ? "HELD" : status;
      await recordReward({
        referrerUserId: opts.referrerUserId,
        recruitUserId: opts.recruitUserId,
        recipientUserId: userId,
        type: "BONUS",
        label: `Bonus · ${triggerLabel}`,
        amountTzs: amount,
        status: finalStatus,
        note: who === "new" ? "new-player bonus" : "referrer bonus",
        programme: "PLAYER",
      });
      if (finalStatus === "PAID") {
        notifyReferralReward(userId, { type: "BONUS", amountTzs: amount });
        sendEmailToUser(userId, (email) => ({
          to: email,
          subject: `Referral bonus · ${formatTzs(amount)}`,
          html: referralEarningHtml({ type: "BONUS", amountTzs: amount }),
          tag: "referral",
        })).catch(() => {});
      }
    };

    if (cfg.bonus.recipient === "NEW" || cfg.bonus.recipient === "BOTH") await payTo(opts.recruitUserId, cfg.bonus.newAmountTzs, "new");
    if (cfg.bonus.recipient === "REFERRER" || cfg.bonus.recipient === "BOTH") await payTo(opts.referrerUserId, cfg.bonus.referrerAmountTzs, "referrer");
  });
}

/** Pay the milestone prize to the referrer once per recruit. ⛔ PLAYER programme only —
 *  an agent is paid a share of revenue they generated, and nothing else. */
async function payPrize(opts: { referrerUserId: string; recruitUserId: string; milestoneLabel: string }): Promise<void> {
  const cfg = getAffiliateConfig();
  if (!cfg.enabled || !cfg.prize.enabled || cfg.prize.amountTzs <= 0) return;
  const playerPolicy = policyFor("PLAYER", null, cfg, getAgentConfig());
  if (!playerPolicy.ok) return;
  const policy = playerPolicy.policy;
  // Serialize per REFERRER so both guards below hold atomically under
  // concurrency: (a) once-per-recruit, and (b) the per-referrer cap — two prizes
  // for two different recruits of the same referrer must not both slip past the
  // cap. Both checks are RE-READ inside the lock.
  const done = await withLock(`referral:prize:${opts.referrerUserId}`, async (): Promise<boolean> => {
    // One prize per recruit.
    const priorPrize = (await db.referralReward.listByRecruit(opts.recruitUserId)).some((r) => r.type === "PRIZE");
    if (priorPrize) return false;
    // Per-referrer cap on number of prizes.
    if (cfg.prize.capPerReferrer > 0) {
      const prizeCount = (await db.referralReward.listByReferrer(opts.referrerUserId)).filter((r) => r.type === "PRIZE").length;
      if (prizeCount >= cfg.prize.capPerReferrer) return false;
    }
    const credited = await creditWallet(opts.referrerUserId, cfg.prize.amountTzs, `Referral prize · ${opts.milestoneLabel}`, `referral:prize:${opts.recruitUserId}`, policy);
    await recordReward({
      referrerUserId: opts.referrerUserId,
      recruitUserId: opts.recruitUserId,
      recipientUserId: opts.referrerUserId,
      type: "PRIZE",
      label: `Prize · ${opts.milestoneLabel}`,
      amountTzs: cfg.prize.amountTzs,
      status: credited ? "PAID" : "HELD",
      programme: "PLAYER",
    });
    return credited;
  });
  if (done) {
    notifyReferralReward(opts.referrerUserId, { type: "PRIZE", amountTzs: cfg.prize.amountTzs });
    // Email the referrer their reward (best-effort, fire-and-forget).
    const recruit = await db.user.findById(opts.recruitUserId);
    const acct = await db.affiliate.findByUserId(opts.referrerUserId);
    sendEmailToUser(opts.referrerUserId, (email) => ({
      to: email,
      subject: `Referral reward · ${formatTzs(cfg.prize.amountTzs)}`,
      html: referralRewardHtml({
        amount: cfg.prize.amountTzs,
        referredName: maskName(recruit?.displayName ?? null, recruit?.phoneE164 ?? ""),
        totalEarned: acct?.totalEarnedTzs ?? cfg.prize.amountTzs,
      }),
      tag: "referral-reward",
    }));
  }
}

// ── Activity hooks (called from the betting + wallet flows) ──────────────

/**
 * A recruit placed a bet. Fires the FIRST_BET milestone prize.
 *
 * ⚠️ COMMISSION IS NO LONGER ACCRUED HERE — see `onRecruitSettlement` below.
 * It used to be, priced at `stake × commissionRate`, and under the capped-fee
 * model that number is a fiction: it is the fee we would have taken if the poll
 * were balanced. On a lopsided poll we take far less (on the reported poll we earn
 * 3,500, not 31,050), and on a one-sided poll we earn NOTHING while this would
 * still have paid the referrer. We would have been paying out a share of revenue
 * we never made — and `reverseWagering` unwinds turnover on a refund, but a
 * referral credit was never clawed back.
 *
 * The real fee is not knowable at bet time. It depends on the FINAL pools. So the
 * commission now accrues where the fee actually exists: at settlement.
 *
 * The PRIZE stays here, because it is a milestone on the ACT of betting ("your
 * recruit placed their first bet"), not a share of revenue. That is correct.
 */
export async function onRecruitBet(recruitUserId: string, opts: { stake: number }): Promise<void> {
  const resolved = await accrualContextFor(recruitUserId);
  if (!resolved.ok) {
    // ⭐ Silence used to be the only signal here. Every refusal is now a row, so "why did
    // this agent earn nothing on that poll?" is answerable from the chain instead of by
    // re-running the code in your head.
    if (resolved.refusal !== "no_referrer") {
      auditRefusal("affiliate.accrual_refused", resolved.refusal, recruitUserId, resolved.attribution, { hook: "bet" });
    }
    return;
  }
  const { policy, attribution } = resolved.ctx;

  /**
   * ⛔ THE AGENT PROGRAMME PAYS NO FLAT PRIZE, BY CONSTRUCTION.
   *
   * 🔴 On the SHIPPED config this was the live defect and it ran the wrong way round:
   * `commission.enabled` is FALSE and `prize.enabled` is TRUE at TZS 10,000 with a cap of 20
   * per referrer. So on approval day an agent would have earned TZS 200,000 of flat prizes as
   * real withdrawable cash and exactly zero commission — the precise inverse of the decision
   * they were vetted and charged for. And a GROWTH officer could have raised the prize amount
   * without anyone thinking about agents at all.
   *
   * `flatRewards` comes from the resolved policy, so the branch is a property of the
   * programme rather than a guard clause inside `payPrize` that a later edit can drop.
   */
  if (!policy.flatRewards) {
    auditRefusal("affiliate.accrual_refused", "programme_disabled", recruitUserId, attribution, { hook: "bet", reason: "agent_commission_only" });
    return;
  }

  const referrerUserId = attribution.referrerUserId;
  const cfg = getAffiliateConfig();

  // First-bet milestone prize (Management Bonus Rules §4).
  // Fires only when: the bet meets the minimum amount AND the recruit has deposited.
  if (cfg.prize.enabled && cfg.prize.milestone === "FIRST_BET") {
    const meetsMinBet = opts.stake >= (cfg.prize.minBetAmountTzs ?? 0);
    let hasDeposited = true;
    if (cfg.prize.requireDeposit) {
      try {
        const txns = await db.txn.findByUser(recruitUserId, 1000);
        hasDeposited = txns.some((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED");
      } catch { /* if we can't check, allow it — never block a valid reward */ }
    }
    if (meetsMinBet && hasDeposited) {
      await payPrize({ referrerUserId, recruitUserId, milestoneLabel: "first bet" });
    }
  }
}

/**
 * A recruit's position SETTLED, and we took a fee on the poll.
 *
 * This is where referral commission belongs, and it is the fix for a real defect:
 * commission used to accrue at BET time against `stake × commissionRate` — the
 * fee we would have charged on a balanced poll. Under the capped-fee model that
 * is a fiction:
 *
 *   • the reported poll (YES 300,000 / NO 10,500): we earn 3,500, not 31,050;
 *   • a ONE-SIDED poll: we earn NOTHING (everyone is refunded) — but the old code
 *     still paid the referrer a share of a fee that never existed;
 *   • a VOIDED poll: same.
 *
 * The real fee is not knowable until the pools are final. So `operatorNetFee` here is
 * THIS POSITION'S ACTUAL SHARE of the fee we actually KEPT — `(stake / pool) × operatorNet` —
 * passed in by settleMarket. If we earned nothing, the referrer earns nothing. We can no
 * longer pay out on revenue we never made.
 *
 * 🔴 AND IT IS THE **NET** FEE, WHICH IS THE SECOND HALF OF THE SAME LESSON. The parameter
 * used to be the GROSS fee, but roughly 15% of every fee has already left the building as
 * TRA (10%) and GBT (5%) levies before we keep a shilling of it (`RULES.md` §2.2,
 * `payout.ts` → `levySplit`). Pricing commission on the gross shares out money we never had:
 * at a 30% rate on a 30,000 fee that is 9,000 promised against 25,500 actually retained —
 * and at the 40% ceiling the error is larger still. `settleMarket` now passes
 * `levySplit(...).operatorNet`, and the parameter is named for it so the next reader cannot
 * quietly re-derive the gross.
 *
 * ⭐ IT IS ALSO WHAT MAKES LIFETIME + UNCAPPED SAFE. Because the base is what the house
 * actually kept, and the house always retains the majority, commission can never cost more
 * than the recruit earned us — however long they play.
 *
 * Accrues on EVERY settled position (win or lose): every stake was in the pool, so
 * every stake contributed to the fee. Refunds (one-sided / void) pass a fee of 0.
 */
export async function onRecruitSettlement(
  recruitUserId: string,
  opts: {
    /** THIS POSITION'S share of the fee the house KEPT, after TRA + GBT. ⛔ Never the gross. */
    operatorNetFee: number;
    /** ⭐ Required. Without it a clawback cannot find the rows a voided market produced, and
     *  the accrual has no idempotency key — which made commission the one reward path where
     *  a replay was a double-pay. */
    marketId: string;
    positionId: string;
  },
): Promise<void> {
  const resolved = await accrualContextFor(recruitUserId);
  if (!resolved.ok) {
    if (resolved.refusal !== "no_referrer") {
      auditRefusal("affiliate.accrual_refused", resolved.refusal, recruitUserId, resolved.attribution, {
        hook: "settlement", marketId: opts.marketId, operatorNetFee: opts.operatorNetFee,
      });
    }
    return;
  }
  const { policy, attribution, referrer } = resolved.ctx;
  const referrerUserId = attribution.referrerUserId;

  if (!(opts.operatorNetFee > 0)) {
    // No fee kept → nothing to share. Not audited: it is the ordinary outcome of a one-sided
    // or voided poll and would drown the chain in rows that mean "nothing happened".
    return;
  }
  if (!(policy.rate > 0)) {
    auditRefusal("affiliate.accrual_refused", "programme_disabled", recruitUserId, attribution, {
      hook: "settlement", marketId: opts.marketId, reason: "rate_zero",
    });
    return;
  }

  /**
   * ⭐ THE WINDOW MEASURES FROM THE BIND, NOT FROM THE RECRUIT'S SIGN-UP DATE.
   *
   * It used to read `recruit.createdAt`, which silently shortened every window by however
   * long the recruit had existed before they redeemed the code — and for an agent who
   * recruits an existing player, that is the whole window. `recruitedAt` is stamped in the
   * same write as the attribution, so the clock starts when the relationship did.
   *
   * `windowMonths === 0` is LIFETIME and returns null, so the branch is skipped entirely
   * rather than compared against a date 0 months away.
   */
  const windowEnd = commissionWindowEnd(attribution.boundAt, policy.windowMonths);
  if (windowEnd && Date.now() > windowEnd.getTime()) {
    auditRefusal("affiliate.accrual_refused", "window_expired", recruitUserId, attribution, {
      hook: "settlement", marketId: opts.marketId, windowEnd: windowEnd.toISOString(),
    });
    return;
  }

  /**
   * 🔴 `Math.floor`, NOT `Math.round`.
   *
   * The platform allocates ITS OWN fee shares with `Math.floor` plus largest-remainder
   * (`payout.ts` → `allocateFeeShares`), and that discipline exists because independent
   * `Math.round` over-collects: it breaks ties upward, so the parts sum to more than the
   * whole and the escrow pool finishes settlement NEGATIVE. Measured on production
   * 2026-08-11: nine markets with a non-zero residual, seven of them negative.
   *
   * Commission was rounding the other way — half-up, in the AGENT's favour, against a
   * platform that floors its own. On its own that is a shilling; across a lifetime,
   * uncapped, on every settled position of every recruit, it is a systematic leak in one
   * direction. Flooring means a fractional shilling always stays with the house, which is
   * the only rounding direction that cannot be argued into a shortfall.
   */
  const grossCut = Math.floor(opts.operatorNetFee * policy.rate);
  if (grossCut <= 0) return;

  /**
   * ⭐ AND THE WITHHOLDING TAX IS APPLIED **AFTER** THE CAP, NOT HERE.
   *
   * Management's waterfall (2026-09-08) withholds a percent of the agent's gross commission.
   * The order of the three operations is load-bearing and it is: price the gross → clamp it
   * against the per-recruit budget → withhold on what remains. Withholding first would remit
   * tax on money the cap then refused to accrue, which is money nobody ever earned; and
   * capping the NET would let a partner accrue more gross than their budget allows, because
   * the cap would be measured on a figure the tax had already shrunk.
   *
   * `splitWithholding` is therefore called inside the lock below, on the capped `cut`.
   */


  /**
   * ⭐ THE IDEMPOTENCY KEY COMMISSION NEVER HAD.
   *
   * `payBonus` and `payPrize` both pass a deterministic `sourceRef`; commission passed none,
   * so a replayed settlement — and settlement IS resumable — paid twice. The key is unique in
   * Postgres, so the second write loses rather than doubling the money, and a replay tool can
   * be built without becoming a second way to pay.
   */
  const sourceRef = `referral:commission:${opts.marketId}:${opts.positionId}`;

  // Serialize per (referrer, recruit) so the per-recruit cap read + the credit
  // + the record are atomic — two concurrent bets must not both read the same
  // `already` and each credit up to `remaining`, overshooting the cap.
  const paid = await withLock(`referral:commission:${referrerUserId}:${recruitUserId}`, async (): Promise<{ credited: boolean; cut: number; status: StoredReferralReward["status"] } | null> => {
    // Re-read under the lock: a concurrent settlement of the same position must lose here,
    // not at the unique index.
    if (await db.referralReward.findBySourceRef(sourceRef)) return null;

    let cut = grossCut;
    if (policy.capPerRecruitTzs > 0) {
      const already = (await db.referralReward
        .listByReferrer(referrerUserId))
        .filter((r) => r.recruitUserId === recruitUserId && r.type === "COMMISSION")
        // ⛔ REVERSED rows do not count. A clawed-back accrual is money the partner does not
        // have; leaving it in the sum would silently shrink the budget for the rest of that
        // recruit's life because of a market that was voided.
        // ⚠️ PENDING and HELD DO count. The cap is a budget on ACCRUAL, and a suppressed
        // accrual is still money we owe — dropping it would let a released backlog overshoot.
        .filter((r) => r.status !== "REVERSED")
        // ⭐ THE CAP IS A BUDGET ON GROSS COMMISSION EARNED, NOT ON CASH RECEIVED.
        // `amountTzs` is the NET credited since withholding began (2026-09-08), so summing it
        // alone would silently widen every capped agent's budget by the tax they never saw.
        // ⚠️ The fallback is what keeps history correct: rows accrued BEFORE withholding have
        // no `grossAmountTzs`, and for those `amountTzs` WAS the gross.
        .reduce((s, r) => s + (r.grossAmountTzs ?? r.amountTzs), 0);
      const remaining = policy.capPerRecruitTzs - already;
      if (remaining <= 0) return null;
      cut = Math.min(cut, remaining);
    }
    if (cut <= 0) return null;

    // ⭐ ONE FUNCTION, SHARED WITH `/agent`'s WATERFALL. The page's worked example and this
    // credit cannot disagree, because they are the same arithmetic — `test:agent-waterfall`
    // is that assertion.
    const split = splitWithholding(cut, policy.withholdingPct);
    if (split.netTzs <= 0) return null;

    const credited = await creditWallet(referrerUserId, split.netTzs, "Agent commission", sourceRef, policy, split.taxWithheldTzs);
    /**
     * ⛔ AN AGENT ACCRUAL IS NEVER `HELD`. `HELD` is terminal in this codebase — no code path
     * has ever paid one out — and it consumes the per-recruit budget, so a partner's
     * contracted income would be written off silently by a control written for promotions.
     *
     * ⭐ `PENDING` is the honest state and the enum value already exists: accrued, not yet
     * paid, payable. The only way an agent credit fails is the responsible-gambling
     * suppression in `creditInternal` (a cooling-off period) or a frozen wallet — both
     * temporary, both an officer can settle out of band from `/admin/agents/[id]`.
     */
    const status: StoredReferralReward["status"] = credited
      ? "PAID"
      : policy.programme === "AGENT" ? "PENDING" : "HELD";
    await recordReward({
      referrerUserId,
      recruitUserId,
      recipientUserId: referrerUserId,
      type: "COMMISSION",
      label: policy.programme === "AGENT" ? "Agent commission" : "Commission",
      // ⭐ `amountTzs` IS THE NET — the money that actually moved. Every existing reader
      // (the agent's dashboard, the payables table, the owner's book, the clawback) means
      // "what the partner got" by it, and changing that meaning would have been the invasive
      // choice. The gross and the tax are recorded beside it so the withholding line can be
      // shown and reversed without anybody re-deriving it from a rate.
      amountTzs: split.netTzs,
      grossAmountTzs: split.grossTzs,
      taxWithheldTzs: split.taxWithheldTzs,
      status,
      note: credited ? null : "credit suppressed — payable, settle out of band",
      // ⭐ The stamp and the priced rate travel onto the row, so a later rate change never
      // rewrites history and the owner's book can separate agent spend from promo cost.
      programme: policy.programme,
      rateApplied: policy.rate * 100,
      marketId: opts.marketId,
      sourceRef,
    });
    return { credited, cut, status };
  });

  if (paid?.credited) {
    // ⭐ Two programmes, two voices. An agent's commission is contracted income and says so;
    // the player promo's message ("from a friend") is the withdrawn programme's, and a partner
    // reading it would be told their business is a promo (four-lens review, 2026-09-07).
    if (policy.programme === "AGENT") {
      notifyAgentCommission(referrerUserId, { amountTzs: paid.cut });
      sendEmailToUser(referrerUserId, (email) => ({ to: email, subject: `Agent commission · ${formatTzs(paid.cut)}`, html: agentCommissionEarnedHtml({ amountTzs: paid.cut }), tag: "agent-commission" })).catch(() => {});
    } else {
      notifyReferralReward(referrerUserId, { type: "COMMISSION", amountTzs: paid.cut });
      sendEmailToUser(referrerUserId, (email) => ({
        to: email,
        subject: `Referral commission · ${formatTzs(paid.cut)}`,
        html: referralEarningHtml({ type: "COMMISSION", amountTzs: paid.cut }),
        tag: "referral",
      })).catch(() => {});
    }
  } else if (paid) {
    // A payable was created and no money moved. That is an officer's problem, not a silent
    // one — it is the row `/admin/agents/[id]` surfaces for out-of-band settlement.
    audit({
      category: "COMPLIANCE",
      action: "affiliate.commission.payable",
      actorId: null,
      targetType: "User",
      targetId: referrerUserId,
      payload: { recruitUserId, amountTzs: paid.cut, status: paid.status, programme: policy.programme, marketId: opts.marketId, referrerStatus: referrer.status },
    });
  }
}

/**
 * ⭐ CLAWBACK — a market that was settled and is then VOIDED must not leave the commission
 * it produced standing.
 *
 * 🔴 WHY IT HOOKS THE VOID PATH AND NOT A "SETTLEMENT REVERSAL". There is no settlement
 * reversal in this codebase — nothing un-settles a market — so a clawback hung on one would
 * be a guard on a path that cannot be reached, which is indistinguishable from no guard at
 * all. The reachable event is `voidMarket`, and that is where this is called from.
 *
 * ⛔ NEVER DRIVES A WALLET NEGATIVE. `debitInternal` refuses to overdraw, so a partner who
 * has already withdrawn the money leaves a DEBT: the row is marked REVERSED (so it stops
 * counting toward the cap and the earnings total) and the shortfall is audited as a
 * COMPLIANCE row for an officer to recover through the ordinary adjustment path. Silently
 * writing a negative balance would break the platform's first money invariant.
 */
export async function clawbackMarketCommission(
  marketId: string,
  reason: string,
): Promise<{ reversedRows: number; reclaimedTzs: number; shortfallTzs: number }> {
  const rows = (await db.referralReward.listByMarket(marketId))
    .filter((r) => r.type === "COMMISSION" && r.status !== "REVERSED");
  let reclaimed = 0;
  let shortfall = 0;
  let reversedRows = 0;

  for (const r of rows) {
    await withLock(`referral:commission:${r.referrerUserId}:${r.recruitUserId}`, async () => {
      // Re-read under the lock — a concurrent clawback must not reverse the same row twice.
      const fresh = await db.referralReward.findBySourceRef(r.sourceRef ?? "");
      const current = fresh ?? r;
      if (current.status === "REVERSED") return;

      let recovered = 0;
      if (current.status === "PAID") {
        const res = await debitInternal(current.referrerUserId, current.amountTzs, {
          description: "Agent commission reversed — market voided",
          type: "AGENT_COMMISSION_REVERSAL",
          // ⭐ The withholding tax on this accrual goes back too, in proportion to what is
          // actually recovered — see `debitInternal`. ⚠️ `?? 0` is what keeps a pre-2026-09-08
          // row (no tax column) reversing exactly as it always did.
          taxWithheld: current.taxWithheldTzs ?? 0,
        });
        recovered = res.debited;
        if (res.shortfall > 0) {
          shortfall += res.shortfall;
          audit({
            category: "COMPLIANCE",
            action: "affiliate.clawback.shortfall",
            actorId: null,
            targetType: "User",
            targetId: current.referrerUserId,
            payload: { marketId, rewardId: current.id, owed: current.amountTzs, recovered, shortfall: res.shortfall, taxReversed: res.taxReversed, reason },
          });
        }
      }
      reclaimed += recovered;
      // The row SURVIVES — a reversed liability is still a fact, and an agent's statement
      // must be able to show what was taken back and why.
      await db.referralReward.update(current.id, {
        status: "REVERSED",
        reversedAt: new Date().toISOString(),
        reversedReason: reason,
      });
      // Keep the denormalised total honest, atomically and in the same direction.
      if (current.status === "PAID") {
        await db.affiliate.incrementEarned(current.referrerUserId, -current.amountTzs);
      }
      reversedRows += 1;
      audit({
        category: "WALLET",
        action: "affiliate.commission.reversed",
        actorId: null,
        targetType: "ReferralReward",
        targetId: current.id,
        payload: { marketId, referrerUserId: current.referrerUserId, recruitUserId: current.recruitUserId, amountTzs: current.amountTzs, recovered, programme: current.programme, reason },
      });
      // ⭐ Money left a wallet — the person is told, with the figure (four-lens review, 2026-09-07).
      if (current.programme === "AGENT") {
        notifyAgentCommissionReversed(current.referrerUserId, { amountTzs: current.amountTzs, recoveredTzs: recovered, marketId });
        sendEmailToUser(current.referrerUserId, (email) => ({ to: email, subject: `Commission of ${formatTzs(current.amountTzs)} reversed — market voided`, html: agentCommissionReversedHtml({ amountTzs: current.amountTzs, recoveredTzs: recovered, marketId }), tag: "agent-commission-reversed" })).catch(() => {});
      }
    });
  }

  return { reversedRows, reclaimedTzs: reclaimed, shortfallTzs: shortfall };
}

/**
 * A recruit's deposit confirmed. Fires the first-deposit bonus (if that's the
 * configured trigger) and the DEPOSIT_THRESHOLD milestone prize.
 * `cumulativeDepositsTzs` includes this deposit.
 */
export async function onRecruitDeposit(recruitUserId: string, opts: { cumulativeDepositsTzs: number }): Promise<void> {
  const resolved = await accrualContextFor(recruitUserId);
  if (!resolved.ok) {
    if (resolved.refusal !== "no_referrer") {
      auditRefusal("affiliate.accrual_refused", resolved.refusal, recruitUserId, resolved.attribution, { hook: "deposit" });
    }
    return;
  }
  const { policy, attribution } = resolved.ctx;
  // ⛔ Deposit-triggered rewards are the PLAYER promo's flat instruments. An agent is paid on
  // revenue at settlement and nothing else — by construction, see `onRecruitBet`.
  if (!policy.flatRewards) return;
  const referrerUserId = attribution.referrerUserId;
  const cfg = getAffiliateConfig();

  if (cfg.bonus.enabled && cfg.bonus.trigger === "FIRST_DEPOSIT") {
    await payBonus({ referrerUserId, recruitUserId, held: false });
  }
  if (cfg.prize.enabled && cfg.prize.milestone === "DEPOSIT_THRESHOLD" && opts.cumulativeDepositsTzs >= cfg.prize.depositThresholdTzs) {
    await payPrize({ referrerUserId, recruitUserId, milestoneLabel: "deposit milestone" });
  }
}

// ── Read models ──────────────────────────────────────────────────────────

export type RecruitRow = {
  maskedName: string;
  joinedAt: string;
  status: "Signed up" | "First bet" | "Earning";
  earnedTzs: number;
};

export type PlayerReferralSummary = {
  code: string;
  link: string;
  recruitCount: number;
  earnedTzs: number;
  recruits: RecruitRow[];
  programEnabled: boolean;
  /** Adaptive promise lines reflecting which modes are live. */
  promises: Array<{ icon: "percent" | "ticket" | "gift"; en: string; sw: string }>;
};

/**
 * The PLAYER promo's read model. ⛔ Reachable only under the player programme — an approved
 * agent's page reads `getAgentDashboard`, a DISTINCT model, because the two programmes have
 * different money, different terms and different destinations, and a page that swaps a
 * number into the other programme's sentence ships a false term wearing a true rate.
 */
export async function getPlayerReferralSummary(userId: string) {
  const acct = await ensureAffiliateAccount(userId);
  const cfg = getAffiliateConfig();

  const referrerRewards = await db.referralReward.listByReferrer(userId);
  // Indexed on `recruitedBy` — this used to `db.user.list()` and filter the whole table.
  // ⭐ Only PLAYER-stamped recruits: an attribution created under the other programme is
  // not this promo's book, and listing it would show money that will never be paid here.
  const recruits: RecruitRow[] = (await db.user.listByRecruiter(userId))
    .filter((u) => programmeOf(u) === "PLAYER")
    .map((u) => {
      const earned = referrerRewards
        .filter((r) => r.recruitUserId === u.id && r.recipientUserId === userId && r.status === "PAID")
        .reduce((s, r) => s + r.amountTzs, 0);
      const hasCommission = referrerRewards
        .some((r) => r.recruitUserId === u.id && r.type === "COMMISSION");
      const status: RecruitRow["status"] = hasCommission ? "Earning" : earned > 0 ? "First bet" : "Signed up";
      // ⭐ `maskedRosterLabel`, not `maskName`: the bare fallback for a player with no display
      // name is a PHONE FRAGMENT, and a recruit list is where three trailing digits are most
      // re-identifying — the referrer knows the people they signed up.
      return { maskedName: maskedRosterLabel(u, u.phoneE164), joinedAt: u.recruitedAt ?? u.createdAt, status, earnedTzs: earned };
    });

  const promises: PlayerReferralSummary["promises"] = [];
  if (cfg.commission.enabled) {
    promises.push({
      icon: "percent",
      en: `Earn ${Math.round(cfg.commission.rate * 100)}% of your friends' fees for ${cfg.commission.windowMonths} months`,
      sw: `Pata ${Math.round(cfg.commission.rate * 100)}% ya ada za marafiki kwa miezi ${cfg.commission.windowMonths}`,
    });
  }
  if (cfg.prize.enabled && cfg.prize.amountTzs > 0) {
    const minBet = cfg.prize.minBetAmountTzs ?? 0;
    const minBetLabel = minBet > 0 ? ` (min ${formatTzs(minBet)})` : "";
    const minBetLabelSw = minBet > 0 ? ` (angalau ${formatTzs(minBet)})` : "";
    promises.push({
      icon: "ticket",
      en: cfg.prize.milestone === "FIRST_BET"
        ? `Get ${formatTzs(cfg.prize.amountTzs)} when a friend deposits & places their first bet${minBetLabel}`
        : `Get ${formatTzs(cfg.prize.amountTzs)} when a friend deposits`,
      sw: cfg.prize.milestone === "FIRST_BET"
        ? `Pata ${formatTzs(cfg.prize.amountTzs)} rafiki anapoweka amana na dau la kwanza${minBetLabelSw}`
        : `Pata ${formatTzs(cfg.prize.amountTzs)} rafiki anapoweka amana`,
    });
  }
  if (cfg.bonus.enabled && (cfg.bonus.recipient === "REFERRER" || cfg.bonus.recipient === "BOTH") && cfg.bonus.referrerAmountTzs > 0) {
    promises.push({
      icon: "gift",
      en: `Get ${formatTzs(cfg.bonus.referrerAmountTzs)} when a friend ${cfg.bonus.trigger === "SIGNUP" ? "signs up" : "makes their first deposit"}`,
      sw: `Pata ${formatTzs(cfg.bonus.referrerAmountTzs)} rafiki ${cfg.bonus.trigger === "SIGNUP" ? "anapojisajili" : "anapoweka amana ya kwanza"}`,
    });
  }

  return {
    code: acct.code,
    link: referralLinkFor(acct.code),
    recruitCount: acct.recruitCount,
    earnedTzs: acct.totalEarnedTzs,
    recruits,
    programEnabled: cfg.enabled,
    promises,
  };
}

// ── The AGENT dashboard — a DISTINCT read model ──────────────────────────
//
// 🔴 THREE LIVE DEFECTS FORCED THIS TO BE ITS OWN SHAPE rather than the player page with
// fields swapped. `/profile/invite` told an approved agent that (1) their withdrawable cash
// carried a wagering requirement and an expiry, (2) their programme was "Paused" whenever a
// GROWTH officer paused the PLAYER promo, and (3) the terms on offer were the player promo's.
// Every one of those came from reading the other programme's config. This model reads only
// the agent's own row, the agent config, and the agent-stamped book.

export type AgentRecruitRow = {
  userId: string;
  maskedName: string;
  boundAt: string;
  /** Lifetime commission this recruit produced for the agent (PAID + PENDING, net of REVERSED). */
  commissionTzs: number;
  /** Money still owed on this recruit — accrued but not yet credited. */
  pendingTzs: number;
  /** How many settled positions accrued commission — activity, without exposing turnover
   *  (⛔ a recruit's betting turnover is not the agent's to see; it is the officer's). */
  settlements: number;
};

export type AgentDashboard = {
  /** ⭐ The single discriminator, threaded to the page so it can never test a role string. */
  approved: true;
  /** `false` after an officer deactivates: the page keeps the history and loses every share
   *  surface — the code, the link, the QR, the CTA. */
  active: boolean;
  code: string;
  link: string;
  /** Their OWN rate, as a percent. ⛔ Never the player promo's. */
  commissionPct: number;
  /** 0 = lifetime. From the agent config, not the player config. */
  windowMonths: number;
  /** 0 = uncapped. */
  capPerRecruitTzs: number;
  /** ⭐ Always CASH. Rendered as a fact so the page cannot say "wagering" about it. */
  destination: "CASH";
  approvedAt: string;
  /** Recruits bound under the AGENT programme — the commissionable book. */
  recruits: AgentRecruitRow[];
  recruitCount: number;
  /** Lifetime commission PAID into the wallet. */
  paidTzs: number;
  /** Accrued and owed — settled out of band by an officer. */
  pendingTzs: number;
  /** Clawed back. Shown, not hidden: a partner's statement shows what was taken and why. */
  reversedTzs: number;
  /** Commission PAID in the current calendar month (Africa/Dar_es_Salaam is UTC+3, no DST). */
  thisMonthTzs: number;
  /** Recruits attributed to this person BEFORE approval, under the player promo. They are
   *  not commissionable and the page says so, rather than showing a book that will never
   *  pay a shilling — the false money statement the Player-View Audit shipped five
   *  blockers for. */
  preAgentRecruitCount: number;
};

/** Start of the current calendar month in East Africa Time (UTC+3, no DST), as ISO. */
function monthStartEat(): string {
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), 1) - 3 * 60 * 60 * 1000).toISOString();
}

/**
 * The agent's own page. Returns `null` unless `approvedAt` is set — the caller treats null
 * as "not this viewer's page" and never falls through to the player model on its own.
 */
export async function getAgentDashboard(userId: string): Promise<AgentDashboard | null> {
  const acct = await db.affiliate.findByUserId(userId);
  if (!isApprovedAgent(acct) || !acct) return null;
  const agentCfg = getAgentConfig();
  const rewards = (await db.referralReward.listByReferrer(userId)).filter((r) => r.programme === "AGENT");
  const recruitsAll = await db.user.listByRecruiter(userId);
  const monthStart = monthStartEat();

  const rows: AgentRecruitRow[] = recruitsAll
    .filter((u) => programmeOf(u) === "AGENT")
    .map((u) => {
      const mine = rewards.filter((r) => r.recruitUserId === u.id && r.type === "COMMISSION");
      const paid = mine.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amountTzs, 0);
      const pending = mine.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amountTzs, 0);
      return {
        userId: u.id,
        maskedName: maskedRosterLabel(u, u.phoneE164),
        boundAt: u.recruitedAt ?? u.createdAt,
        commissionTzs: paid + pending,
        pendingTzs: pending,
        settlements: mine.filter((r) => r.status !== "REVERSED").length,
      };
    });

  const sum = (status: StoredReferralReward["status"]) =>
    rewards.filter((r) => r.type === "COMMISSION" && r.status === status).reduce((s, r) => s + r.amountTzs, 0);

  return {
    approved: true,
    active: acct.active,
    code: acct.code,
    link: referralLinkFor(acct.code),
    commissionPct: acct.commissionPct ?? 0,
    windowMonths: agentCfg.commissionWindowMonths,
    capPerRecruitTzs: agentCfg.capPerRecruitTzs,
    destination: "CASH",
    approvedAt: acct.approvedAt!,
    recruits: rows,
    recruitCount: rows.length,
    paidTzs: sum("PAID"),
    pendingTzs: sum("PENDING"),
    reversedTzs: sum("REVERSED"),
    thisMonthTzs: rewards
      .filter((r) => r.type === "COMMISSION" && r.status === "PAID" && r.createdAt >= monthStart)
      .reduce((s, r) => s + r.amountTzs, 0),
    preAgentRecruitCount: recruitsAll.length - rows.length,
  };
}

// ── The COMPLIANCE officer's roster — the question is "is this agent worth their rate" ──
//
// ⛔ NOT recruit count. A count does not answer the question an officer sorting a roster is
// asking. The roster sorts by REVENUE GENERATED — the net fee the agent's recruits produced
// for the house — shows commission-to-revenue as a ratio, and flags an agent whose recruits'
// activity skews to one market, which is the shape collusion takes.

export type AgentRosterRow = {
  userId: string;
  handle: string;
  code: string;
  commissionPct: number | null;
  active: boolean;
  approvedAt: string;
  /** Recruits bound under the AGENT programme. */
  recruits: number;
  /** ⭐ The net fee the house kept from this agent's recruits, reconstructed from each accrual's
   *  amount and the rate that priced it. The sort key. */
  revenueTzs: number;
  /** Commission PAID + PENDING (net of REVERSED). */
  commissionTzs: number;
  pendingTzs: number;
  /** commission ÷ revenue, as a percent — what the agent actually costs per shilling earned. */
  costPct: number | null;
  /** The share of this agent's commission that came from ONE market, when it is dominant and
   *  there are enough settlements for the pattern to mean something. Null = no signal. */
  marketSkewPct: number | null;
  skewMarketId: string | null;
  /** Rows PENDING settlement out of band. */
  payables: number;
  standing: "ACTIVE" | "DEACTIVATED" | "SUSPENDED" | "CLOSED" | "EXCLUDED";
};

/** A market must carry at least this many of an agent's settlements before its share is a
 *  signal rather than a small-numbers artefact. */
const SKEW_MIN_SETTLEMENTS = 4;
/** …and hold at least this share of the agent's commission to be flagged. */
const SKEW_FLAG_PCT = 60;

export async function getAgentRoster(): Promise<AgentRosterRow[]> {
  const accounts = (await db.affiliate.list()).filter((a) => isApprovedAgent(a));
  if (accounts.length === 0) return [];
  const users = new Map((await db.user.findByIds(accounts.map((a) => a.userId))).map((u) => [u.id, u] as const));
  const rows: AgentRosterRow[] = [];
  for (const a of accounts) {
    const u = users.get(a.userId);
    const rewards = (await db.referralReward.listByReferrer(a.userId)).filter((r) => r.programme === "AGENT" && r.type === "COMMISSION");
    const live = rewards.filter((r) => r.status !== "REVERSED");
    const commission = live.reduce((s, r) => s + r.amountTzs, 0);
    const pending = live.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amountTzs, 0);
    // Revenue = Σ amount ÷ (rate/100), per row, because the rate that priced each row is on it.
    const revenue = Math.round(live.reduce((s, r) => s + (r.rateApplied && r.rateApplied > 0 ? r.amountTzs / (r.rateApplied / 100) : 0), 0));
    const byMarket = new Map<string, number>();
    for (const r of live) if (r.marketId) byMarket.set(r.marketId, (byMarket.get(r.marketId) ?? 0) + r.amountTzs);
    let skewMarketId: string | null = null, skewPct: number | null = null;
    if (live.length >= SKEW_MIN_SETTLEMENTS && commission > 0) {
      const top = [...byMarket.entries()].sort((x, y) => y[1] - x[1])[0];
      if (top) {
        const pct = Math.round((top[1] / commission) * 100);
        if (pct >= SKEW_FLAG_PCT) { skewMarketId = top[0]; skewPct = pct; }
      }
    }
    const recruits = (await db.user.listByRecruiter(a.userId)).filter((r) => programmeOf(r) === "AGENT").length;
    const standing: AgentRosterRow["standing"] = !a.active ? "DEACTIVATED"
      : u?.status === "SUSPENDED" ? "SUSPENDED" : u?.status === "CLOSED" ? "CLOSED" : u?.status === "SELF_EXCLUDED" ? "EXCLUDED" : "ACTIVE";
    rows.push({
      userId: a.userId, handle: handleOf(u), code: a.code, commissionPct: a.commissionPct, active: a.active, approvedAt: a.approvedAt!,
      recruits, revenueTzs: revenue, commissionTzs: commission, pendingTzs: pending,
      costPct: revenue > 0 ? Math.round((commission / revenue) * 1000) / 10 : null,
      marketSkewPct: skewPct, skewMarketId, payables: live.filter((r) => r.status === "PENDING").length, standing,
    });
  }
  // ⭐ Revenue generated, descending — the question the roster answers.
  return rows.sort((x, y) => y.revenueTzs - x.revenueTzs || y.commissionTzs - x.commissionTzs);
}

export type AdminLedgerRow = {
  id: string;
  referrerHandle: string;
  recruitMasked: string;
  type: string;
  amountTzs: number;
  date: string;
  status: StoredReferralReward["status"];
};

export type AdminLeaderboardRow = { handle: string; userId: string; recruits: number; earnedTzs: number };

export type AdminAffiliateStats = {
  totalReferrals: number;
  activeAffiliates: number;
  commissionPaidTzs: number;
  totalPaidTzs: number;
  topReferrer: { handle: string; recruits: number } | null;
  leaderboard: AdminLeaderboardRow[];
  ledger: AdminLedgerRow[];
};

async function handleFor(userId: string) {
  const u = await db.user.findById(userId);
  if (!u) return "@unknown";
  if (u.displayName) return "@" + u.displayName.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 18);
  return "@" + u.phoneE164.replace(/\D/g, "").slice(-6);
}

/** Handle for a user row already in hand — the batched sibling of `handleFor`. */
function handleOf(u: StoredUser | undefined): string {
  if (!u) return "@unknown";
  if (u.displayName) return "@" + u.displayName.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 18);
  return "@" + u.phoneE164.replace(/\D/g, "").slice(-6);
}

/** The newest rows the ledger TABLE renders. ⛔ Never the population a total is summed over. */
const ADMIN_LEDGER_PAGE = 1000;

/**
 * The GROWTH officer's player-promo console.
 *
 * 🔴 ITS "ALL-TIME" MONEY FIGURES WERE SUMMED OVER `list(1000)` — the newest thousand rewards,
 * labelled as everything. Past a thousand rows every headline on the page silently stopped
 * being true, and nothing could tell. The totals now come from a grouped aggregate that
 * cannot truncate; the table is still a page, and is labelled as one by its caller.
 *
 * ⭐ PLAYER-PROGRAMME ONLY. Agent money is the COMPLIANCE officer's, on `/admin/agents`; a
 * growth officer who paused the player promo must not see agent commission in these totals
 * and conclude the pause did nothing.
 */
export async function getAdminAffiliateStats() {
  const accounts = await db.affiliate.list();
  const totals = await db.referralReward.totals();
  const playerCells = totals.filter((c) => c.programme !== "AGENT");

  const totalReferrals = await db.user.countRecruited();
  const commissionPaidTzs = playerCells.filter((c) => c.type === "COMMISSION" && c.status === "PAID").reduce((s, c) => s + c.sumTzs, 0);
  const totalPaidTzs = playerCells.filter((c) => c.status === "PAID").reduce((s, c) => s + c.sumTzs, 0);

  const rewards = (await db.referralReward.list(ADMIN_LEDGER_PAGE)).filter((r) => r.programme !== "AGENT");
  // "Active affiliates" is a distinct count, and a distinct count over a page IS a page. It is
  // reported over the page it can see and labelled by the caller as such — a true number over a
  // stated population beats a total over a silently truncated one.
  const activeAffiliates = new Set(rewards.filter((r) => r.status === "PAID").map((r) => r.referrerUserId)).size;

  // ⭐ ONE batched lookup for every referrer and recruit on the page — this was an N+1 loop
  // (`findById` per row, plus `handleFor` per row) over a thousand rows.
  const ids = new Set<string>();
  for (const a of accounts) ids.add(a.userId);
  for (const r of rewards) { ids.add(r.referrerUserId); ids.add(r.recruitUserId); }
  const userById = new Map((await db.user.findByIds(Array.from(ids))).map((u) => [u.id, u] as const));

  const leaderboard: AdminLeaderboardRow[] = accounts
    // The player-promo leaderboard: vetted agents have their own roster on /admin/agents.
    .filter((a) => !isApprovedAgent(a))
    .map((a) => ({ handle: handleOf(userById.get(a.userId)), userId: a.userId, recruits: a.recruitCount, earnedTzs: a.totalEarnedTzs }))
    .filter((r) => r.recruits > 0 || r.earnedTzs > 0)
    .sort((a, b) => b.earnedTzs - a.earnedTzs || b.recruits - a.recruits)
    .slice(0, 10);

  const ledger: AdminLedgerRow[] = rewards.map((r) => {
    const recruit = userById.get(r.recruitUserId);
    return {
      id: r.id,
      referrerHandle: handleOf(userById.get(r.referrerUserId)),
      recruitMasked: recruit ? maskedRosterLabel(recruit, recruit.phoneE164) : "—",
      type: r.label,
      amountTzs: r.amountTzs,
      date: r.createdAt,
      status: r.status,
    };
  });

  const top = leaderboard[0];
  return {
    totalReferrals,
    activeAffiliates,
    commissionPaidTzs,
    totalPaidTzs,
    topReferrer: top ? { handle: top.handle, recruits: top.recruits } : null,
    leaderboard,
    ledger,
    /** How many rows the table holds, so the page can say "newest N" instead of "all". */
    ledgerPage: ADMIN_LEDGER_PAGE,
  };
}
