/**
 * MAY THIS ACCOUNT BE (OR STAY) A HOUSE BOT? — the one function behind the picker, the account card,
 * designate, re-verify and Start (PLAN §6, 04 A3, A4, C4, C8, C9).
 *
 * ⭐ ONE FUNCTION, THREE CONTEXTS. The picker and the wizard's account card are `designate` without a
 * password; re-verify and Start pass the bot. Every context shares the "always" rows, so a row a screen
 * shows is the row a service enforces.
 *
 *   always                      role · closed · not ACTIVE · no password · RG lockout · wallet · balance read
 *   designate (no bot)          already a live bot · the owner's own account · roster full
 *   designate, reverify, start  open ERASURE request
 *   designate, reverify         sign-in locked · password last set by support · password history unreadable
 *   start (bot)                 the live causes · RG backstop · holder's own loss limit · today's loss cap
 *
 * ⛔ FAILS CLOSED. A read that throws is a blocking row, never an absent one: a balance that cannot be read,
 * RG settings that cannot be read, a password history that cannot be read (PLAN I5, 04 A3 "a failed read
 * refuses", A4 "a failed read blocks").
 *
 * ⛔ PASSWORD HISTORY IS READ FROM THE COLUMNS (04 A4). `passwordSetVia` and `emailSetByOfficerAt` are written
 * in the same update as the change; only a legacy row with no history falls back to the audit log, and that
 * read is awaited.
 *
 * Copy is admin English and never names the holder: the console resolves names live.
 */
import { db, type StoredUser, type StoredWallet } from "../store";
import { getRgSettings, isLockedOut, checkLossLimit } from "../responsible-gambling";
import { openErasureRequest } from "../privacy";
import { getAuditForTargetDurable } from "../audit";
import { passwordFingerprint } from "../password-reset";
import { positionStore } from "../market-dal";
import { houseBotControlStore, houseBotStore, type StoredHouseBot } from "../house-bot-dal";
import { houseDayBook, houseOpenExposure } from "./book";
import { holderCauses, rgLockStands } from "@/lib/house-bot/consent";
import type { ConsentVoidCause, HolderCause } from "@/lib/house-bot/pause-reasons";
import { OFFICER_EMAIL_WINDOW_DAYS } from "@/lib/house-bot/constants";
import { eatDayKey, formatEat } from "@/lib/house-bot/clock";
import { CONSOLE_LIMITS_HREF, consoleBotHref, consoleBotTabHref, consoleReverifyHref } from "@/lib/house-bot/console-routes";
import { isFinalRefusal } from "@/lib/kyc-refusal";

export type EligibilityContext = "designate" | "reverify" | "start";

export const ELIGIBILITY_BLOCKING_CODES = [
  "ACCOUNT_MISSING",
  "STAFF_ACCOUNT",
  "AGENT_ACCOUNT",
  "ACCOUNT_CLOSED",
  "NOT_ACTIVE",
  "NO_PASSWORD",
  "RG_LOCKED",
  "RG_UNREADABLE",
  "WALLET_MISSING",
  "WALLET_NOT_ACTIVE",
  "BALANCE_UNREADABLE",
  "ALREADY_LIVE_BOT",
  "OWN_ACCOUNT",
  "ROSTER_FULL",
  "ERASURE_REQUEST",
  "ERASURE_UNREADABLE",
  "SIGN_IN_LOCKED",
  "PASSWORD_SET_BY_SUPPORT",
  "PASSWORD_HISTORY_UNREADABLE",
  "IDENTITY_REFUSED",
  "PASSWORD_CHANGED",
  "CONSENT_VOID",
  "RG_SINCE_VERIFIED",
  "DAILY_LOSS_STOP",
  "OWNER_LOSS_LIMIT",
] as const;
export type EligibilityBlockingCode = (typeof ELIGIBILITY_BLOCKING_CODES)[number];

export const ELIGIBILITY_WARNING_CODES = [
  "EMAIL_UNVERIFIED",
  "IDENTITY_NOT_APPROVED",
  "RECRUITED",
  "OPEN_POSITIONS",
  "PUBLIC_NAME",
  "NAME_RISK",
  "SIGN_IN_LOCKED_WARNING",
] as const;
export type EligibilityWarningCode = (typeof ELIGIBILITY_WARNING_CODES)[number];

/** One row: the card's sentence, and the picker's short reason (02 §3.1). */
export type EligibilityRow<C extends string = EligibilityBlockingCode> = {
  code: C;
  message: string;
  short: string;
  href?: string;
};

export type HouseBotEligibility = {
  context: EligibilityContext;
  userId: string;
  botId: string | null;
  eligible: boolean;
  blocking: EligibilityRow[];
  warnings: EligibilityRow<EligibilityWarningCode>[];
  /** The bot's live holder causes (04 A3); empty without a bot. */
  causes: HolderCause[];
  /** A responsible-gambling lock stands (C8): re-verify waits, uncounted. */
  rgLocked: boolean;
  /** Null when the wallet is missing or its read failed. */
  balanceTzs: number | null;
};

/** Words the C9 name-risk warning looks for in a public display name. */
export const NAME_RISK_RE = /50pick|house|bot|liquidity|ukwasi/i;

const DAY_MS = 86_400_000;

const row = (code: EligibilityBlockingCode, short: string, message: string, href?: string): EligibilityRow =>
  href ? { code, short, message, href } : { code, short, message };

const warn = (code: EligibilityWarningCode, message: string): EligibilityRow<EligibilityWarningCode> => ({ code, short: message, message });

const day = (iso: string | null | undefined): string => (iso ? formatEat(Date.parse(iso), "D MMM YYYY") : "an unknown date");

/** How a password was last set by support, for the C9 sentence. */
export type SupportSetHow = "TEMP_PASSWORD" | "RESET_AFTER_OFFICER_EMAIL";

export const PASSWORD_SET_BY_SUPPORT_COPY = (how: SupportSetHow, atIso: string | null): string =>
  `Their password was last set through support (${how === "TEMP_PASSWORD" ? "a temporary password" : "a reset link to an address support set"}, ${day(atIso)}). Ask them to change it themselves in Account settings, then verify.`;

export const RG_LOCKED_COPY = (kind: "self-excluded" | "on a break", untilIso: string | null): string =>
  `Can't ask for their password while they are ${kind}${untilIso ? ` (until ${day(untilIso)})` : ""}. Their permission can be confirmed again only after it has ended.`;

/**
 * The password-context rows (designate and re-verify), in the order the service checks them. Exported for
 * `verifyHouseBotPassword`, which runs exactly these — uncounted — before any password check (C4, C8).
 */
export async function passwordContextRows(user: StoredUser, nowMs: number): Promise<EligibilityRow[]> {
  const rows: EligibilityRow[] = [];
  if (!user.passwordHash || !user.passwordSalt) {
    rows.push(row("NO_PASSWORD", "No password set", "This account has no password (erased or never set). It can't give or confirm permission."));
    return rows;
  }
  if (user.lockedUntil && Date.parse(user.lockedUntil) > nowMs) {
    const until = formatEat(Date.parse(user.lockedUntil), "HH:MM");
    rows.push(row("SIGN_IN_LOCKED", `Sign-in locked until ${until}`, `Their sign-in is locked after wrong passwords until ${until} EAT. Try again after it ends.`));
  }
  const via = user.passwordSetVia ?? null;
  if (via === "OFFICER_TEMP") {
    rows.push(row("PASSWORD_SET_BY_SUPPORT", "Password set by support", PASSWORD_SET_BY_SUPPORT_COPY("TEMP_PASSWORD", user.passwordSetAt ?? null)));
  } else if (via === "RESET_LINK" && user.passwordSetAt) {
    const setAt = Date.parse(user.passwordSetAt);
    const emailAt = user.emailSetByOfficerAt ? Date.parse(user.emailSetByOfficerAt) : Number.NaN;
    if (emailAt <= setAt && setAt - emailAt <= OFFICER_EMAIL_WINDOW_DAYS * DAY_MS) {
      rows.push(row("PASSWORD_SET_BY_SUPPORT", "Password set by support", PASSWORD_SET_BY_SUPPORT_COPY("RESET_AFTER_OFFICER_EMAIL", user.passwordSetAt)));
    } else {
      // The column is not the only record (review LI-2, LI-5): an officer email written before the column existed, or
      // one whose stamp a later edit moved, is still in the durable audit log. Awaited; a read that fails or stops
      // short inside the window blocks.
      const audited = await officerEmailBefore(user.id, setAt);
      if (audited === "UNREADABLE") rows.push(row("PASSWORD_HISTORY_UNREADABLE", "Password history unreadable", "Couldn't check how their password was last changed. Refresh to try again."));
      else if (audited === "FOUND") rows.push(row("PASSWORD_SET_BY_SUPPORT", "Password set by support", PASSWORD_SET_BY_SUPPORT_COPY("RESET_AFTER_OFFICER_EMAIL", user.passwordSetAt)));
    }
  } else if (via == null) {
    const legacy = await legacyPasswordHistory(user.id);
    if (legacy.kind === "UNREADABLE") {
      rows.push(row("PASSWORD_HISTORY_UNREADABLE", "Password history unreadable", "Couldn't check how their password was last changed. Refresh to try again."));
    } else if (legacy.kind === "SUPPORT") {
      rows.push(row("PASSWORD_SET_BY_SUPPORT", "Password set by support", PASSWORD_SET_BY_SUPPORT_COPY(legacy.how, legacy.atIso)));
    }
  }
  return rows;
}

const PASSWORD_WRITE_ACTIONS = ["password.changed", "password_reset.completed", "player.password_reset_by_officer"] as const;

type AuditPage = { entries: ReadonlyArray<{ action: string; createdAt: string }>; truncated: boolean };

/**
 * Is there an officer email within the 30 days before `setAt` in this page? UNREADABLE when the page was cut off
 * while its oldest row is still inside the window — an entry we did not read is not an entry that is absent
 * (review LI-6).
 */
function officerEmailIn(page: AuditPage, setAt: number): "FOUND" | "NONE" | "UNREADABLE" {
  const windowStart = setAt - OFFICER_EMAIL_WINDOW_DAYS * DAY_MS;
  if (page.entries.some((e) => e.action === "player.email.set_by_officer" && Date.parse(e.createdAt) <= setAt && Date.parse(e.createdAt) >= windowStart)) return "FOUND";
  const oldest = page.entries[page.entries.length - 1];
  if (page.truncated && (!oldest || Date.parse(oldest.createdAt) >= windowStart)) return "UNREADABLE";
  return "NONE";
}

async function officerEmailBefore(userId: string, setAt: number): Promise<"FOUND" | "NONE" | "UNREADABLE"> {
  try {
    return officerEmailIn(await getAuditForTargetDurable("User", userId, { limit: 200 }), setAt);
  } catch {
    return "UNREADABLE";
  }
}

/**
 * A holder whose account is older than the history columns (04 A4): the newest password write in the durable
 * audit log decides. ⛔ AWAITED, AND A READ THAT FAILS OR STOPS SHORT BLOCKS — an officer reset that the page
 * could not see is not an officer reset that did not happen.
 */
async function legacyPasswordHistory(userId: string): Promise<{ kind: "OK" } | { kind: "UNREADABLE" } | { kind: "SUPPORT"; how: SupportSetHow; atIso: string }> {
  try {
    const r = await getAuditForTargetDurable("User", userId, { limit: 200 });
    const latest = r.entries.find((e) => (PASSWORD_WRITE_ACTIONS as readonly string[]).includes(e.action));
    if (!latest) return r.truncated ? { kind: "UNREADABLE" } : { kind: "OK" };
    if (latest.action === "player.password_reset_by_officer") return { kind: "SUPPORT", how: "TEMP_PASSWORD", atIso: latest.createdAt };
    if (latest.action === "password_reset.completed") {
      const found = officerEmailIn(r, Date.parse(latest.createdAt));
      if (found === "FOUND") return { kind: "SUPPORT", how: "RESET_AFTER_OFFICER_EMAIL", atIso: latest.createdAt };
      if (found === "UNREADABLE") return { kind: "UNREADABLE" };
    }
    return { kind: "OK" };
  } catch {
    return { kind: "UNREADABLE" };
  }
}

/**
 * The eligibility of `userId` in `context`. `botId` is required for `reverify` and `start` and must belong to
 * the account; `actorId` is the owner acting (the own-account row).
 */
export async function houseBotEligibility(
  userId: string,
  opts: { context: EligibilityContext; botId?: string | null; actorId?: string | null; nowMs?: number },
): Promise<HouseBotEligibility> {
  const nowMs = opts.nowMs ?? Date.now();
  const { context } = opts;
  const blocking: EligibilityRow[] = [];
  const warnings: EligibilityRow<EligibilityWarningCode>[] = [];
  const out = (extra: Partial<HouseBotEligibility> = {}): HouseBotEligibility => ({
    context, userId, botId: opts.botId ?? null, eligible: blocking.length === 0, blocking, warnings,
    causes: [], rgLocked: false, balanceTzs: null, ...extra,
  });

  const user = await db.user.findById(userId);
  let bot: StoredHouseBot | null = null;
  if (opts.botId) {
    bot = await houseBotStore.get(opts.botId);
    if (!bot || bot.userId !== userId) {
      blocking.push(row("ACCOUNT_MISSING", "Account not found", "This bot's account could not be found."));
      return out();
    }
  } else if (context !== "designate") {
    throw new Error(`houseBotEligibility: context '${context}' needs a botId`);
  }
  if (!user) {
    blocking.push(row("ACCOUNT_MISSING", "Account not found", "No account with that ID."));
    return out();
  }

  // ── always ──────────────────────────────────────────────────────────────────────────────────────
  if (user.role === "AGENT") blocking.push(row("AGENT_ACCOUNT", "Agent account", "This is an agent account. Only a player account can provide liquidity."));
  else if (user.role !== "PLAYER") blocking.push(row("STAFF_ACCOUNT", "Staff account", `This is a staff account (${user.role}). Only a player account can provide liquidity.`));

  let wallet: StoredWallet | null = null;
  let walletReadFailed = false;
  try {
    wallet = await db.wallet.findByUserId(userId);
  } catch {
    walletReadFailed = true;
  }
  const balanceTzs = wallet ? wallet.balance : null;

  const closed = user.status === "CLOSED" || user.closedAt != null;
  if (closed) {
    const openHouse = bot ? await houseOpenExposure(bot.id).catch(() => null) : 0;
    blocking.push(row("ACCOUNT_CLOSED", "Account closed",
      `Account closed on ${day(user.closedAt)} — it can't be reopened. TZS ${fmt(balanceTzs)} and TZS ${fmt(openHouse)} of open house stakes stay in the closed wallet; recover the float out of band. Remove the bot.`));
  } else if (user.status !== "ACTIVE" && user.status !== "COOLED_OFF") {
    // ⚠️ COOLED_OFF is left to the RG row below: the status outlives the break (nothing resets it when the
    // timer runs out, and the bet path lets such an account bet), so reading it here would block Start for good.
    blocking.push(row("NOT_ACTIVE", `Not active (${user.status})`, `This account is not active (${user.status}).`));
  }
  if (!user.passwordHash || !user.passwordSalt) {
    blocking.push(row("NO_PASSWORD", "No password set", "This account has no password (erased or never set). It can't give or confirm permission."));
  }

  let rg: { selfExclusionUntil: string | null; coolingOffUntil: string | null; selfExclusionStartedAt: string | null; coolingOffStartedAt: string | null } | null = null;
  let rgLocked = false;
  try {
    const s = await getRgSettings(userId);
    rg = { selfExclusionUntil: s.selfExclusionUntil ?? null, coolingOffUntil: s.coolingOffUntil ?? null, selfExclusionStartedAt: s.selfExclusionStartedAt ?? null, coolingOffStartedAt: s.coolingOffStartedAt ?? null };
    const lock = await isLockedOut(userId);
    rgLocked = lock.locked || rgLockStands({ user, rg, nowMs });
    if (rgLocked) {
      const excluded = user.status === "SELF_EXCLUDED" || lock.reason === "self_exclusion";
      const until = excluded ? rg.selfExclusionUntil : rg.coolingOffUntil;
      blocking.push(row("RG_LOCKED", excluded ? "Self-excluded" : "On a break", RG_LOCKED_COPY(excluded ? "self-excluded" : "on a break", until)));
    }
  } catch {
    rgLocked = true;
    blocking.push(row("RG_UNREADABLE", "Limits unreadable", "Couldn't read their responsible-gambling settings. Refresh to try again."));
  }

  if (walletReadFailed) blocking.push(row("BALANCE_UNREADABLE", "Balance unavailable", "Balance unavailable — try again"));
  else if (!wallet) blocking.push(row("WALLET_MISSING", "No wallet", "This account has no wallet — it cannot be designated."));
  else if (wallet.status !== "ACTIVE") blocking.push(row("WALLET_NOT_ACTIVE", `Wallet ${wallet.status.toLowerCase()}`, `Their wallet is ${wallet.status.toLowerCase()}. Start waits until the last hold is lifted.`));

  // ── designate: the roster ──────────────────────────────────────────────────────────────────────────
  if (context === "designate") {
    const live = await houseBotStore.findLiveByUserId(userId);
    if (live) blocking.push(row("ALREADY_LIVE_BOT", `Already house bot “${live.label}”`, "This account is already a house bot.", consoleBotHref(live.id)));
    if (opts.actorId && opts.actorId === userId) blocking.push(row("OWN_ACCOUNT", "Your own account", "You can't designate your own account."));
    const [count, control] = await Promise.all([houseBotStore.countLive(), houseBotControlStore.get()]);
    if (count >= control.maxDesignatedBots) {
      blocking.push(row("ROSTER_FULL", `Roster full (${count} of ${control.maxDesignatedBots})`,
        `The roster is full (${count} of ${control.maxDesignatedBots}). Remove an account or raise the roster limit on Limits →`, CONSOLE_LIMITS_HREF));
    }
  }

  // ── an open erasure request ───────────────────────────────────────────────────────────────────────
  // C4-SPEC ruling 130 · the durable queue, awaited; a queue that cannot be read is a blocking row, never "no request".
  let erasure: Awaited<ReturnType<typeof openErasureRequest>> = null;
  try {
    erasure = await openErasureRequest(userId);
  } catch {
    blocking.push(row("ERASURE_UNREADABLE", "Data requests unreadable", "Couldn't read the data-rights queue. Refresh to try again."));
  }
  if (erasure) {
    blocking.push(row("ERASURE_REQUEST", "Erasure requested",
      `They asked for their data to be erased (${erasure.id}, ${day(erasure.requestedAt)}). Liquidity stakes can't continue — resolve the request or remove the bot.`));
  }

  // ── password contexts ─────────────────────────────────────────────────────────────────────────────
  if (context === "designate" || context === "reverify") {
    for (const r of await passwordContextRows(user, nowMs)) {
      if (!blocking.some((b) => b.code === r.code)) blocking.push(r);
    }
  }

  // ── the bot's live causes, and Start's own rows ─────────────────────────────────────────────────────
  let causes: HolderCause[] = [];
  const kyc = await db.kyc.findByUserId(userId);
  if (bot) {
    let ownerLossBlocked = false;
    if (context === "start" && bot.stakeMinTzs != null) {
      ownerLossBlocked = !(await checkLossLimit(userId, bot.stakeMinTzs)).allowed;
    }
    causes = holderCauses({
      bot, fingerprintNow: passwordFingerprint(user.passwordHash),
      user: { role: user.role, status: user.status, closedAt: user.closedAt ?? null, passwordSetAt: user.passwordSetAt ?? null, passwordSetVia: user.passwordSetVia ?? null },
      wallet: wallet ? { status: wallet.status, freezeReasons: wallet.freezeReasons ?? null } : null,
      rg: { selfExclusionUntil: rg?.selfExclusionUntil ?? null, coolingOffUntil: rg?.coolingOffUntil ?? null },
      erasureRequestOpen: !!erasure,
      identityRefused: !!kyc && kyc.status === "REJECTED" && isFinalRefusal(kyc.rejectReason),
      ownerLossLimit: { blocked: ownerLossBlocked, freesAt: ownerLossBlocked ? new Date(nowMs + DAY_MS).toISOString() : null },
      nowMs,
    });

    if (context === "start") {
      if (causes.some((c) => c.code === "IDENTITY_REFUSED")) {
        blocking.push(row("IDENTITY_REFUSED", "Identity refused", "Their identity verification was finally refused. An officer must reopen the refusal; then Re-verify and Start. Removing the bot is recommended."));
      }
      const pw = causes.find((c) => c.code === "PASSWORD_CHANGED");
      if (pw) {
        blocking.push(row("PASSWORD_CHANGED", "Password changed",
          `Can't start: their password changed on ${day(pw.changedAt)}. Enter the new password first.`, consoleReverifyHref(bot.id)));
      }
      const cv = causes.find((c) => c.code === "CONSENT_VOID");
      if (cv) {
        blocking.push(row("CONSENT_VOID", "Permission ended",
          `Can't start: ${CONSENT_VOID_PHRASE[cv.cause]} on ${day(cv.at)} ended their permission. Enter their password to confirm it again.`, consoleReverifyHref(bot.id)));
      }
      // The RG backstop (04 A3): a self-exclusion or break after the last verification refuses, even if no
      // detector ever wrote the void. A failed read already refused above.
      // ⚠️ THE START STAMPS ALONE MISS EVERY EPISODE AFTER THE FIRST (review LI-1): `selfExclude`/`coolOff` keep the
      // first start for the register. The END dates only move forward, and designate and re-verify refuse while
      // one runs — so an end later than `verifiedAt` means an episode was in force after the verification.
      const verifiedMs = Date.parse(bot.verifiedAt);
      const startedMs = Math.max(Date.parse(rg?.selfExclusionStartedAt ?? "") || 0, Date.parse(rg?.coolingOffStartedAt ?? "") || 0);
      const endedMs = Math.max(Date.parse(rg?.selfExclusionUntil ?? "") || 0, Date.parse(rg?.coolingOffUntil ?? "") || 0);
      if (rg && !cv && (startedMs > verifiedMs || endedMs > verifiedMs)) {
        const when = startedMs > verifiedMs
          ? `began on ${day(new Date(startedMs).toISOString())}`
          : `ran until ${day(new Date(endedMs).toISOString())}`;
        blocking.push(row("RG_SINCE_VERIFIED", "Permission ended",
          `Can't start: a self-exclusion or break ${when}, after their permission was last confirmed. Enter their password to confirm it again.`, consoleReverifyHref(bot.id)));
      }
      if (bot.capDailyLossTzs != null) {
        const today = await houseDayBook(eatDayKey(nowMs), bot.id);
        if (today.realisedLossTzs >= bot.capDailyLossTzs) {
          blocking.push(row("DAILY_LOSS_STOP", "Daily loss cap reached",
            `Can't start: today's settled loss TZS ${fmt(today.realisedLossTzs)} has reached the daily loss cap TZS ${fmt(bot.capDailyLossTzs)}. Raise the cap or wait until 00:00 EAT.`, consoleBotTabHref(bot.id, "rules")));
        }
      }
      if (ownerLossBlocked) {
        const limit = (await getRgSettings(userId)).dailyLossLimit;
        blocking.push(row("OWNER_LOSS_LIMIT", "Own loss limit",
          `Can't start: their own daily loss limit (TZS ${fmt(limit)}) counts house stakes over a rolling 24 hours. The minimum stake fits again by ${formatEat(nowMs + DAY_MS, "D MMM, HH:MM")} EAT at the latest.`));
      }
    }
  }

  // ── warnings ──────────────────────────────────────────────────────────────────────────────────────
  if (!user.email || !user.emailVerifiedAt) warnings.push(warn("EMAIL_UNVERIFIED", "Email unconfirmed — they can't top up until they confirm it."));
  if (!kyc || kyc.status !== "APPROVED") warnings.push(warn("IDENTITY_NOT_APPROVED", "Identity never approved — they can't withdraw until it is."));
  if (user.recruitedBy) warnings.push(warn("RECRUITED", "Recruited by an agent — no commission is paid on house stakes."));
  const open = (await positionStore.listForUser(userId, 100)).filter((p) => p.status === "OPEN" && p.houseBotId == null);
  if (open.length > 0) warnings.push(warn("OPEN_POSITIONS", `Open positions on ${open.length} market${open.length === 1 ? "" : "s"} — the bot skips those markets.`));
  const name = (user.displayName ?? "").trim();
  if (name) {
    warnings.push(warn("PUBLIC_NAME", "The leaderboard shows the first word of their display name — suggest a nickname."));
    if (NAME_RISK_RE.test(name)) warnings.push(warn("NAME_RISK", `Public name “${name}” can reveal this account — ask them to change it.`));
  }
  if (context === "start" && user.lockedUntil && Date.parse(user.lockedUntil) > nowMs) {
    warnings.push(warn("SIGN_IN_LOCKED_WARNING", `Their sign-in is locked until ${formatEat(Date.parse(user.lockedUntil), "HH:MM")} EAT after wrong passwords. The bot continues; re-verify waits for the lock.`));
  }

  return out({ causes, rgLocked, balanceTzs });
}

/** How a void's cause reads inside the Start refusal (C8). */
export const CONSENT_VOID_PHRASE: Record<ConsentVoidCause, string> = {
  SELF_EXCLUDED: "their self-exclusion",
  COOLING_OFF: "their break",
  IDENTITY_REFUSED: "the final refusal of their identity",
  HOLDER_ERASURE_REQUEST: "their erasure request",
  HOLDER_WITHDREW: "stopping liquidity stakes themselves",
};

function fmt(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}
