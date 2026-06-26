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
import { db, type StoredAffiliateAccount, type StoredReferralReward } from "./store";
import { getAffiliateConfig } from "./affiliate-config";
import { audit } from "./audit";
import { randomId } from "./crypto";
import { notifyReferralJoined, notifyReferralReward } from "./notification-service";
import { creditInternal } from "./wallet-service";
import { creditBonus } from "./bonus-service";
import { getBonusConfig } from "./bonus-config";
import { sendEmailToUser, referralRewardHtml } from "./email";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";
  return raw.replace(/\/+$/, "");
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
 * Registration-time preview for a referral code: who invited you and whether
 * a sign-up bonus is on offer. Returns null when the code is unknown so the
 * ribbon degrades gracefully (no ribbon shown).
 */
export async function resolveReferralPreview(code: string) {
  const affiliate = await db.affiliate.findByCode((code ?? "").trim());
  if (!affiliate) return null;
  const referrer = await db.user.findById(affiliate.userId);
  if (!referrer) return null;
  const cfg = getAffiliateConfig();
  // New-player bonus is only advertised when the program + bonus mode are on
  // and the new player is actually a recipient.
  const newPlayerBonusTzs =
    cfg.enabled && cfg.bonus.enabled && (cfg.bonus.recipient === "NEW" || cfg.bonus.recipient === "BOTH")
      ? cfg.bonus.newAmountTzs
      : 0;
  const name =
    referrer.displayName && referrer.displayName.trim().length > 0
      ? referrer.displayName.trim().split(/\s+/).slice(0, 2).map((p: string, i: number) => (i === 1 ? p[0].toUpperCase() + "." : p)).join(" ")
      : "a friend";
  return { referrerName: name, newPlayerBonusTzs, bonusTrigger: cfg.bonus.trigger };
}

// ── Wallet credit (internal) ─────────────────────────────────────────────
/** Credit a referral reward. Routes to the BONUS wallet when the bonus program
 *  is enabled and affiliate→bonus routing is on (Ali's default — rewards must be
 *  played through); otherwise credits real balance directly. Falls back to real
 *  if a bonus credit can't be made, so a reward is never silently dropped. */
async function creditWallet(userId: string, amount: number, description: string): Promise<boolean> {
  const bcfg = getBonusConfig();
  if (bcfg.enabled && bcfg.affiliateToBonus) {
    const r = await creditBonus(userId, { amountTzs: amount, source: "REFERRAL", note: description });
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
  amountTzs: number;
  status: StoredReferralReward["status"];
  note?: string | null;
}) {
  const reward = await db.referralReward.create({
    id: `ref_${randomId(12)}`,
    referrerUserId: input.referrerUserId,
    recruitUserId: input.recruitUserId,
    recipientUserId: input.recipientUserId,
    type: input.type,
    label: input.label,
    amountTzs: input.amountTzs,
    status: input.status,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  });
  // Keep the affiliate account's denormalised earnings in sync (only count
  // money that actually reached the referrer, and only PAID rewards).
  if (input.status === "PAID" && input.recipientUserId === input.referrerUserId) {
    const acct = await ensureAffiliateAccount(input.referrerUserId);
    await db.affiliate.update(input.referrerUserId, { totalEarnedTzs: acct.totalEarnedTzs + input.amountTzs });
  }
  audit({
    category: "WALLET",
    action: "affiliate.reward.recorded",
    actorId: null,
    targetType: "ReferralReward",
    targetId: reward.id,
    payload: { type: reward.type, amount: reward.amountTzs, status: reward.status, referrer: input.referrerUserId, recruit: input.recruitUserId },
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
  const code = (opts.code ?? "").trim();
  if (!code) return { bound: false, reason: "no_code" };

  const recruit = await db.user.findById(opts.recruitUserId);
  if (!recruit) return { bound: false, reason: "recruit_not_found" };
  if (recruit.recruitedBy) return { bound: false, reason: "already_bound" };

  const affiliate = await db.affiliate.findByCode(code);
  if (!affiliate) return { bound: false, reason: "invalid_code" };
  const referrerUserId = affiliate.userId;

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

  await db.user.update(opts.recruitUserId, { recruitedBy: referrerUserId });
  const acct = await ensureAffiliateAccount(referrerUserId);
  await db.affiliate.update(referrerUserId, { recruitCount: acct.recruitCount + 1 });
  await ensureAffiliateAccount(opts.recruitUserId); // recruit gets their own link too

  audit({
    category: "ADMIN",
    action: "affiliate.recruit.bound",
    actorId: opts.recruitUserId,
    targetType: "User",
    targetId: opts.recruitUserId,
    payload: { referrerUserId, code, suspectIpOverlap },
  });

  // Notify the referrer that their friend joined.
  notifyReferralJoined(referrerUserId, { recruitMasked: maskName(recruit.displayName, recruit.phoneE164) });

  // Sign-up-triggered bonus (if configured).
  const cfg = getAffiliateConfig();
  if (cfg.enabled && cfg.bonus.enabled && cfg.bonus.trigger === "SIGNUP") {
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

/** Pay the sign-up / first-deposit bonus once per recruit. */
async function payBonus(opts: { referrerUserId: string; recruitUserId: string; held: boolean }): Promise<void> {
  const cfg = getAffiliateConfig();
  if (!cfg.enabled || !cfg.bonus.enabled) return;
  // Idempotency — only one bonus per recruit, ever.
  const priorBonus = (await db.referralReward.listByRecruit(opts.recruitUserId)).some((r) => r.type === "BONUS");
  if (priorBonus) return;

  const status: StoredReferralReward["status"] = opts.held ? "HELD" : "PAID";
  const triggerLabel = cfg.bonus.trigger === "SIGNUP" ? "sign-up" : "deposit";

  const payTo = async (userId: string, amount: number, who: "new" | "referrer") => {
    if (amount <= 0) return;
    // If the credit can't land (frozen/missing wallet), record the reward as
    // HELD rather than PAID — otherwise the ledger claims money was paid that
    // never moved, and the held queue lets an officer retry it.
    const credited = status === "PAID" ? await creditWallet(userId, amount, `Referral bonus · ${triggerLabel}`) : false;
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
    });
    if (finalStatus === "PAID") notifyReferralReward(userId, { type: "BONUS", amountTzs: amount });
  };

  if (cfg.bonus.recipient === "NEW" || cfg.bonus.recipient === "BOTH") await payTo(opts.recruitUserId, cfg.bonus.newAmountTzs, "new");
  if (cfg.bonus.recipient === "REFERRER" || cfg.bonus.recipient === "BOTH") await payTo(opts.referrerUserId, cfg.bonus.referrerAmountTzs, "referrer");
}

/** Pay the milestone prize to the referrer once per recruit. */
async function payPrize(opts: { referrerUserId: string; recruitUserId: string; milestoneLabel: string }): Promise<void> {
  const cfg = getAffiliateConfig();
  if (!cfg.enabled || !cfg.prize.enabled || cfg.prize.amountTzs <= 0) return;
  // One prize per recruit.
  const priorPrize = (await db.referralReward.listByRecruit(opts.recruitUserId)).some((r) => r.type === "PRIZE");
  if (priorPrize) return;
  // Per-referrer cap on number of prizes.
  if (cfg.prize.capPerReferrer > 0) {
    const prizeCount = (await db.referralReward.listByReferrer(opts.referrerUserId)).filter((r) => r.type === "PRIZE").length;
    if (prizeCount >= cfg.prize.capPerReferrer) return;
  }
  const credited = await creditWallet(opts.referrerUserId, cfg.prize.amountTzs, `Referral prize · ${opts.milestoneLabel}`);
  await recordReward({
    referrerUserId: opts.referrerUserId,
    recruitUserId: opts.recruitUserId,
    recipientUserId: opts.referrerUserId,
    type: "PRIZE",
    label: `Prize · ${opts.milestoneLabel}`,
    amountTzs: cfg.prize.amountTzs,
    status: credited ? "PAID" : "HELD",
  });
  if (credited) {
    notifyReferralReward(opts.referrerUserId, { type: "PRIZE", amountTzs: cfg.prize.amountTzs });
    // Email the referrer their reward (best-effort, fire-and-forget).
    const recruit = await db.user.findById(opts.recruitUserId);
    const acct = await db.affiliate.findByUserId(opts.referrerUserId);
    sendEmailToUser(opts.referrerUserId, (email) => ({
      to: email,
      subject: `Referral reward · TZS ${cfg.prize.amountTzs.toLocaleString()}`,
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
 * A recruit placed a bet. Accrues the referrer's commission (a share of the
 * operator margin on this stake) and fires the FIRST_BET milestone prize.
 * `operatorCommissionRate` is the effective per-market commission fraction.
 */
export async function onRecruitBet(recruitUserId: string, opts: { stake: number; operatorCommissionRate: number }): Promise<void> {
  const recruit = await db.user.findById(recruitUserId);
  const referrerUserId = recruit?.recruitedBy;
  if (!referrerUserId) return;
  const cfg = getAffiliateConfig();
  if (!cfg.enabled) return;

  // First-bet milestone prize.
  if (cfg.prize.enabled && cfg.prize.milestone === "FIRST_BET") {
    await payPrize({ referrerUserId, recruitUserId, milestoneLabel: "first bet" });
  }

  // Commission accrual.
  if (cfg.commission.enabled && cfg.commission.rate > 0) {
    // Window check — commission only accrues for windowMonths after join.
    const acct = await db.affiliate.findByUserId(referrerUserId);
    // Real calendar-month window (not a flat 30-day approximation, which would
    // drift ~5 days/year and shortchange the referrer on long windows).
    const windowEnd = new Date(recruit!.createdAt);
    windowEnd.setMonth(windowEnd.getMonth() + cfg.commission.windowMonths);
    if (Date.now() > windowEnd.getTime()) return;

    const operatorFee = opts.stake * Math.max(0, opts.operatorCommissionRate);
    let cut = Math.round(operatorFee * cfg.commission.rate);
    if (cut <= 0) return;

    // Per-recruit cap.
    if (cfg.commission.capPerRecruitTzs > 0) {
      const already = (await db.referralReward
        .listByReferrer(referrerUserId))
        .filter((r) => r.recruitUserId === recruitUserId && r.type === "COMMISSION")
        .reduce((s, r) => s + r.amountTzs, 0);
      const remaining = cfg.commission.capPerRecruitTzs - already;
      if (remaining <= 0) return;
      cut = Math.min(cut, remaining);
    }
    if (cut <= 0) return;

    const credited = await creditWallet(referrerUserId, cut, "Referral commission");
    await recordReward({
      referrerUserId,
      recruitUserId,
      recipientUserId: referrerUserId,
      type: "COMMISSION",
      label: "Commission",
      amountTzs: cut,
      status: credited ? "PAID" : "HELD",
    });
    if (credited) notifyReferralReward(referrerUserId, { type: "COMMISSION", amountTzs: cut });
    if (acct) { /* totals updated inside recordReward */ }
  }
}

/**
 * A recruit's deposit confirmed. Fires the first-deposit bonus (if that's the
 * configured trigger) and the DEPOSIT_THRESHOLD milestone prize.
 * `cumulativeDepositsTzs` includes this deposit.
 */
export async function onRecruitDeposit(recruitUserId: string, opts: { cumulativeDepositsTzs: number }): Promise<void> {
  const recruit = await db.user.findById(recruitUserId);
  const referrerUserId = recruit?.recruitedBy;
  if (!referrerUserId) return;
  const cfg = getAffiliateConfig();
  if (!cfg.enabled) return;

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

export async function getPlayerReferralSummary(userId: string) {
  const acct = await ensureAffiliateAccount(userId);
  const cfg = getAffiliateConfig();

  const allUsers = await db.user.list();
  const referrerRewards = await db.referralReward.listByReferrer(userId);
  const recruits: RecruitRow[] = allUsers
    .filter((u) => u.recruitedBy === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => {
      const earned = referrerRewards
        .filter((r) => r.recruitUserId === u.id && r.recipientUserId === userId && r.status === "PAID")
        .reduce((s, r) => s + r.amountTzs, 0);
      const hasCommission = referrerRewards
        .some((r) => r.recruitUserId === u.id && r.type === "COMMISSION");
      const status: RecruitRow["status"] = hasCommission ? "Earning" : earned > 0 ? "First bet" : "Signed up";
      return { maskedName: maskName(u.displayName, u.phoneE164), joinedAt: u.createdAt, status, earnedTzs: earned };
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
    promises.push({
      icon: "ticket",
      en: `Get TZS ${cfg.prize.amountTzs.toLocaleString()} when a friend ${cfg.prize.milestone === "FIRST_BET" ? "places their first bet" : "deposits"}`,
      sw: `Pata TZS ${cfg.prize.amountTzs.toLocaleString()} rafiki ${cfg.prize.milestone === "FIRST_BET" ? "anapoweka dau la kwanza" : "anapoweka amana"}`,
    });
  }
  if (cfg.bonus.enabled && (cfg.bonus.recipient === "REFERRER" || cfg.bonus.recipient === "BOTH") && cfg.bonus.referrerAmountTzs > 0) {
    promises.push({
      icon: "gift",
      en: `Plus a TZS ${cfg.bonus.referrerAmountTzs.toLocaleString()} bonus on each friend's ${cfg.bonus.trigger === "SIGNUP" ? "sign-up" : "first deposit"}`,
      sw: `Pamoja na bonasi ya TZS ${cfg.bonus.referrerAmountTzs.toLocaleString()} kwa kila rafiki`,
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

export async function getAdminAffiliateStats() {
  const accounts = await db.affiliate.list();
  const rewards = await db.referralReward.list(1000);

  const totalReferrals = (await db.user.list()).filter((u) => !!u.recruitedBy).length;
  const earnerIds = new Set(rewards.filter((r) => r.status === "PAID").map((r) => r.referrerUserId));
  const activeAffiliates = earnerIds.size;
  const commissionPaidTzs = rewards.filter((r) => r.type === "COMMISSION" && r.status === "PAID").reduce((s, r) => s + r.amountTzs, 0);
  const totalPaidTzs = rewards.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amountTzs, 0);

  const leaderboard: AdminLeaderboardRow[] = await Promise.all(accounts
    .map(async (a) => ({ handle: await handleFor(a.userId), userId: a.userId, recruits: a.recruitCount, earnedTzs: a.totalEarnedTzs }))
  ).then((rows) => rows
    .filter((r) => r.recruits > 0 || r.earnedTzs > 0)
    .sort((a, b) => b.earnedTzs - a.earnedTzs || b.recruits - a.recruits)
    .slice(0, 10));

  const ledger: AdminLedgerRow[] = await Promise.all(rewards.map(async (r) => {
    const recruit = await db.user.findById(r.recruitUserId);
    return {
      id: r.id,
      referrerHandle: await handleFor(r.referrerUserId),
      recruitMasked: recruit ? maskName(recruit.displayName, recruit.phoneE164) : "—",
      type: r.label,
      amountTzs: r.amountTzs,
      date: r.createdAt,
      status: r.status,
    };
  }));

  const top = leaderboard[0];
  return {
    totalReferrals,
    activeAffiliates,
    commissionPaidTzs,
    totalPaidTzs,
    topReferrer: top ? { handle: top.handle, recruits: top.recruits } : null,
    leaderboard,
    ledger,
  };
}
