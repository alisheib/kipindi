/**
 * DESIGNATION AND CONSENT — the services behind designate, re-verify, Start and the consent void
 * (PLAN §6, 02 §2.6/§3.2/§3.3, 04 A3, A4, C4, C8, C9, N2 §4 step 10). Commit 7's console actions call these;
 * nothing here reads a session or a form.
 *
 * ⛔ THE HOLDER'S PASSWORD NEVER BECOMES A SESSION (02 §2.7). `verifyHouseBotPassword` checks it once, in
 * memory, inside `login:<userId>`, and drops it: no session, no cookie, no `ActiveSession` row, no
 * `lastLoginAt`, no bootstrap-admin promotion, no `auth.login.*` audit. It never appears in a log, an error
 * or an audit payload.
 *
 * ⛔ AN OWNER CAN NEVER LOCK THE HOLDER OUT (04 C4). The owner's attempts share sign-in's counter but stop
 * two short of `LOCKOUT_MAX_FAILS` — the last two are the holder's — and never write `lockedUntil`.
 *
 * ⛔ LOCK ORDER `wallet:<botUser>` → `house:control` (C3-SPEC ruling 4), the global order every bet and
 * control write uses. Every write below happens inside `wallet:<botUser>`, where Pause, auto-pause, Remove and
 * the seam's H2 re-read the bot; audits and notices go out after the lock is released (04 A19).
 */
import { houseBotsLive } from "@/lib/feature-state";
import { db, type StoredUser } from "../store";
import { hasOpenRequest } from "../privacy";
import { withLock } from "../locks";
import { audit } from "../audit";
import { verifyPassword } from "../crypto";
import { passwordFingerprint } from "../password-reset";
import { rateCheckAsync } from "../rate-limit";
import { LOCKOUT_MAX_FAILS } from "../auth-service";
import { getRgSettings, isLockedOut } from "../responsible-gambling";
import {
  houseAtomic, houseBotAlertOnceStore, houseBotControlStore, houseBotEventStore, houseBotIntentStore, houseBotRuntimeStore,
  houseBotStore, newHouseId, targetStore, uniqueViolation, type StoredHouseBot,
} from "../house-bot-dal";
import { houseBotEligibility, passwordContextRows, RG_LOCKED_COPY, type EligibilityRow } from "./eligibility";
import { consentValid, rgLockStands } from "@/lib/house-bot/consent";
import { canReverify, type ConsentVoidCause } from "@/lib/house-bot/pause-reasons";
import {
  ALERT_KEY, HOUSE_AUDIT, HOUSE_CONTROL_LOCK, RUNTIME_KEY, isAllowedHouseAuditPayload,
  type HouseAuditAction, type HouseBotStatus, type PasswordSetVia,
} from "@/lib/house-bot/constants";
import {
  DUPLICATE_LABEL_COPY, HOUSE_RULES_SCHEMA_VERSION, labelKey, normaliseLabel, normaliseText, parseHouseBotRules,
  rulesStartProblems, validateLabel, validateNote, CAP_FIELDS, type HouseBotCaps, type RulesContext,
} from "@/lib/house-bot/rules";
import { formatEat } from "@/lib/house-bot/clock";
import { CONSOLE_LIMITS_HREF, consoleBotTabHref, consoleReverifyHref } from "@/lib/house-bot/console-routes";
import { houseBotStatusWord } from "./status-display";

/* ═══ Audit ═══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * One house audit row, awaited, in its `HOUSE_AUDIT` category (R7). ⛔ A payload outside the allowlist is a
 * programming error and throws — a label or a name written into the seven-year chain cannot be erased.
 * ⛔ IT ANSWERS WHETHER THE ROW IS IN THE LOG (replan ruling 543). Every call site runs AFTER a write that has
 * already landed — a counter, a designation, a Start, a void — so a row that could not be written is the CALLER's
 * to say beside the act, never a throw that reports a completed act as a failed one. Designate and Start carry
 * the answer to the console as `recorded`; the verify and void paths log it (`audit()` already has).
 */
async function houseAudit(action: HouseAuditAction, actorId: string | null, target: { type: "HouseBot" | "User"; id: string }, payload: Record<string, unknown>): Promise<boolean> {
  if (!isAllowedHouseAuditPayload(payload)) throw new Error(`house audit ${action}: payload keys outside the R7 allowlist`);
  const logged = await audit({ category: HOUSE_AUDIT[action], action, actorId, targetType: target.type, targetId: target.id, payload });
  return logged.recorded;
}

/* ═══ Password check (04 C4 service side, 02 §2.6 steps 2–6) ═══════════════════════════════════════ */

/** The attempts sign-in keeps for the holder: an owner stops at `LOCKOUT_MAX_FAILS − RESERVED_ATTEMPTS`. */
export const RESERVED_ATTEMPTS = 2;

/** Tries the owner may still make before the reserve (C3-SPEC ruling 5). */
export function attemptsBeforeLock(failedLoginCount: number): number {
  return Math.max(0, LOCKOUT_MAX_FAILS - RESERVED_ATTEMPTS - failedLoginCount);
}

export type VerifyRefusalCode =
  | "EMPTY" | "DUPLICATE_SUBMIT" | "ACCOUNT_MISSING" | "BOT_REMOVED" | "NOTHING_TO_VERIFY"
  | "BLOCKED" | "RATE_LIMITED" | "RESERVED" | "WRONG_PASSWORD";

export type VerifyResult =
  | { ok: true; fingerprint: string; attemptsBeforeLock: number }
  | {
    ok: false; code: VerifyRefusalCode; message: string; field?: "password";
    attemptsBeforeLock: number | null; retryAfterSec: number | null; row?: EligibilityRow;
  };

export const VERIFY_COPY = {
  empty: "Enter their password.",
  duplicate: "This press was already sent — wait for its answer.",
  missing: "No account with that ID.",
  removed: "This bot was removed.",
  nothing: "Nothing to verify — the bot is running.",
  rateLimited: (sec: number) => `Too many checks from your console. Try again in ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}.`,
  reserved: "Stop here — the last 2 attempts are kept for the holder. Ask them to sign in once (that resets the count), then try again.",
} as const;

const SET_VIA_WORDS: Record<PasswordSetVia, string> = {
  REGISTRATION: "registration",
  SELF_CHANGE: "Account settings",
  RESET_LINK: "a reset link",
  OFFICER_TEMP: "a temporary password from support",
  REHASH: "a security update",
};

/** C4's wrong-password sentence. The history clause is left out when the account predates the columns. */
export function wrongPasswordCopy(u: { passwordSetAt?: string | null; passwordSetVia?: PasswordSetVia | null }, left: number): string {
  const history = u.passwordSetAt && u.passwordSetVia
    ? ` It was changed on ${formatEat(Date.parse(u.passwordSetAt), "D MMM, HH:MM")} EAT via ${SET_VIA_WORDS[u.passwordSetVia]}.`
    : "";
  const tail = left > 0 ? ` ${left} attempt${left === 1 ? "" : "s"} left.` : " No attempts left — the last 2 are kept for the holder.";
  return `That isn't their current password.${history}${tail}`;
}

const refuse = (code: VerifyRefusalCode, message: string, extra: Partial<Extract<VerifyResult, { ok: false }>> = {}): VerifyResult =>
  ({ ok: false, code, message, attemptsBeforeLock: null, retryAfterSec: null, ...extra });

/**
 * Check the holder's password for an owner (designate and re-verify). In order:
 *   1. an empty password is refused, uncounted and untrimmed;
 *   2. a `submitId` is claimed once (AlertOnce `submit:<officer>:<id>`) — a double tap is refused;
 *   3. re-verify: a removed bot refuses, a running bot with valid consent is a no-op;
 *   4. the password-context rows and a responsible-gambling lock refuse, uncounted, before any check;
 *   5. the `desk.verify` bucket (`<officer>:<holder>`) — the holder's counter is untouched;
 *   6. inside `login:<userId>` on the FRESH row: an expired lock is cleared as sign-in clears it; at the
 *      reserve the password is not checked; wrong → count + 1, never `lockedUntil`; right → count 0.
 */
export async function verifyHouseBotPassword(input: {
  officerId: string; userId: string; password: string; botId?: string | null; submitId?: string | null; nowMs?: number;
}): Promise<VerifyResult> {
  const { officerId, userId, password } = input;
  const nowMs = input.nowMs ?? Date.now();
  const target = input.botId ? { type: "HouseBot" as const, id: input.botId } : { type: "User" as const, id: userId };
  const auditPayload = input.botId ? { botId: input.botId, holderUserId: userId } : { holderUserId: userId };

  if (typeof password !== "string" || password.length === 0) return refuse("EMPTY", VERIFY_COPY.empty, { field: "password" });
  if (input.submitId) {
    const claimed = await houseBotAlertOnceStore.claim(ALERT_KEY.submit(officerId, input.submitId));
    if (!claimed) return refuse("DUPLICATE_SUBMIT", VERIFY_COPY.duplicate);
  }
  if (input.botId) {
    const bot = await houseBotStore.get(input.botId);
    if (!bot || bot.userId !== userId) return refuse("ACCOUNT_MISSING", VERIFY_COPY.missing);
    if (bot.status === "REMOVED") return refuse("BOT_REMOVED", VERIFY_COPY.removed);
    const holder = await db.user.findById(userId);
    if (bot.status === "ACTIVE" && holder && consentValid(bot, passwordFingerprint(holder.passwordHash))) {
      return refuse("NOTHING_TO_VERIFY", VERIFY_COPY.nothing);
    }
  }
  const user = await db.user.findById(userId);
  if (!user) return refuse("ACCOUNT_MISSING", VERIFY_COPY.missing);

  // Step 4 — uncounted, before any password check.
  const rows = await passwordContextRows(user, nowMs);
  try {
    const s = await getRgSettings(userId);
    const lock = await isLockedOut(userId);
    const rg = { selfExclusionUntil: s.selfExclusionUntil ?? null, coolingOffUntil: s.coolingOffUntil ?? null };
    if (lock.locked || rgLockStands({ user, rg, nowMs })) {
      const excluded = user.status === "SELF_EXCLUDED" || lock.reason === "self_exclusion";
      rows.unshift({ code: "RG_LOCKED", short: excluded ? "Self-excluded" : "On a break", message: RG_LOCKED_COPY(excluded ? "self-excluded" : "on a break", excluded ? rg.selfExclusionUntil : rg.coolingOffUntil) });
    }
  } catch {
    rows.unshift({ code: "RG_UNREADABLE", short: "Limits unreadable", message: "Couldn't read their responsible-gambling settings. Refresh to try again." });
  }
  if (rows.length > 0) {
    if (rows[0].code === "SIGN_IN_LOCKED") await houseAudit("house_bot.verify_account_locked", officerId, target, auditPayload);
    const retryAfterSec = rows[0].code === "SIGN_IN_LOCKED" && user.lockedUntil ? Math.ceil((Date.parse(user.lockedUntil) - nowMs) / 1000) : null;
    return refuse("BLOCKED", rows[0].message, { row: rows[0], retryAfterSec, attemptsBeforeLock: attemptsBeforeLock(user.failedLoginCount ?? 0) });
  }

  // Step 5 — the console's own bucket.
  const rl = await rateCheckAsync(`${officerId}:${userId}`, "desk.verify");
  if (!rl.allowed) {
    await houseAudit("house_bot.verify_rate_limited", officerId, target, auditPayload);
    return refuse("RATE_LIMITED", VERIFY_COPY.rateLimited(rl.retryAfterSec), { retryAfterSec: rl.retryAfterSec, attemptsBeforeLock: attemptsBeforeLock(user.failedLoginCount ?? 0) });
  }

  // Step 6 — the fresh row, inside sign-in's own lock. ⛔ Never the row read above (C4: sign-in's pre-lock pattern).
  type Outcome =
    | { kind: "missing" } | { kind: "locked"; until: string } | { kind: "no_password" }
    | { kind: "reserved"; count: number } | { kind: "wrong"; count: number; setAt: string | null; setVia: PasswordSetVia | null }
    | { kind: "right"; fingerprint: string };
  const outcome = await withLock(`login:${userId}`, async (): Promise<Outcome> => {
    let fresh = await db.user.findById(userId);
    if (!fresh) return { kind: "missing" };
    if (fresh.lockedUntil) {
      if (Date.parse(fresh.lockedUntil) > Date.now()) return { kind: "locked", until: fresh.lockedUntil };
      await db.user.update(userId, { lockedUntil: null, failedLoginCount: 0 });
      fresh = { ...fresh, lockedUntil: null, failedLoginCount: 0 };
    }
    if (!fresh.passwordHash || !fresh.passwordSalt) return { kind: "no_password" };
    const count = fresh.failedLoginCount ?? 0;
    if (count >= LOCKOUT_MAX_FAILS - RESERVED_ATTEMPTS) return { kind: "reserved", count };
    if (!(await verifyPassword(password, fresh.passwordSalt, fresh.passwordHash))) {
      // ⛔ The counter only. `lockedUntil` is never written by an owner's attempt (C4).
      await db.user.update(userId, { failedLoginCount: count + 1 });
      return { kind: "wrong", count: count + 1, setAt: fresh.passwordSetAt ?? null, setVia: fresh.passwordSetVia ?? null };
    }
    await db.user.update(userId, { failedLoginCount: 0, lockedUntil: null });
    return { kind: "right", fingerprint: passwordFingerprint(fresh.passwordHash) };
  });

  switch (outcome.kind) {
    case "missing":
      return refuse("ACCOUNT_MISSING", VERIFY_COPY.missing);
    case "locked": {
      await houseAudit("house_bot.verify_account_locked", officerId, target, auditPayload);
      const until = formatEat(Date.parse(outcome.until), "HH:MM");
      return refuse("BLOCKED", `Their sign-in is locked after wrong passwords until ${until} EAT. Try again after it ends.`, { retryAfterSec: Math.ceil((Date.parse(outcome.until) - Date.now()) / 1000) });
    }
    case "no_password":
      return refuse("BLOCKED", "This account has no password (erased or never set). It can't give or confirm permission.");
    case "reserved":
      await houseAudit("house_bot.verify_reserved", officerId, target, auditPayload);
      return refuse("RESERVED", VERIFY_COPY.reserved, { attemptsBeforeLock: 0 });
    case "wrong": {
      await houseAudit("house_bot.password_rejected", officerId, target, auditPayload);
      const left = attemptsBeforeLock(outcome.count);
      return refuse("WRONG_PASSWORD", wrongPasswordCopy({ passwordSetAt: outcome.setAt, passwordSetVia: outcome.setVia }, left), { field: "password", attemptsBeforeLock: left });
    }
    case "right":
      await houseAudit("house_bot.password_verified", officerId, target, auditPayload);
      return { ok: true, fingerprint: outcome.fingerprint, attemptsBeforeLock: attemptsBeforeLock(0) };
  }
}

/* ═══ Designate (02 §3.2, 04 C4 designate order, C9, A3) ═══════════════════════════════════════════ */

/**
 * ⛔ `rosterFull` IS RENDERED ON THE CONSOLE, SO IT IS IN THE NEUTRAL LEXICON (C7-SPEC ruling 453, which outranks §2).
 * It was "Remove a bot or raise Max designated bots on Limits →". The desk's head action shows this sentence VISIBLY
 * beside a disabled button (ruling 314), so those words would have sat in every screenshot of a full roster — and a
 * screenshot is the likeliest accidental disclosure channel this project has, on a PUBLIC repository. An entry is an
 * "account"; a ceiling is a "limit". ⚠️ `eligibility.ts`'s ROSTER_FULL row spells the same sentence (it cannot import
 * this module — `designation.ts` imports IT, so the dependency would be a cycle); `test:house-bot-console` 1.314 pins
 * the two byte-identical, which is what keeps the "two spellings" defect ruling 314 names from coming back.
 * ⚠️ `alreadyBot` and the eligibility rows the WIZARD renders still carry the feature's words; they are that surface's
 * own neutral pass (C7 step 6), recorded by ruling 432 rather than half-changed here.
 */
export const DESIGNATE_COPY = {
  passwordChanged: "Their password changed a moment ago — enter the new one.",
  alreadyBot: "This account is already a house bot.",
  rosterFull: (n: number, max: number) => `The roster is full (${n} of ${max}). Remove an account or raise the roster limit on Limits →`,
} as const;

/**
 * ⛔ F2 · THE ONE SENTENCE FOR A WITHDRAWN PROGRAMME, AND IT IS NEUTRAL BY RULE (D19). It names no
 * feature, no bot, no holder and no officer, so it is safe wherever a refusal is rendered. It rides on
 * the EXISTING refusal codes of all three results — deliberately, so that adding this gate changes no
 * caller's exhaustive handling and no console mapping: a new code would have been a second edit in a
 * file another lane is working in today, for no gain the officer can see.
 */
export const FEATURE_WITHDRAWN_REFUSAL = "Withdrawn from the product — nothing can be added, started or re-checked here.";

export type DesignateResult =
  /** ⛔ `recorded` false: the account IS designated and its compliance row did not land (ruling 543) — say both. */
  | { ok: true; bot: StoredHouseBot; recorded: boolean }
  | { ok: false; code: "INVALID" | "INELIGIBLE" | "ALREADY_BOT" | "PASSWORD_CHANGED" | "ROSTER_FULL" | VerifyRefusalCode;
    message: string; field?: string; href?: string; row?: EligibilityRow; data?: { botId: string };
    attemptsBeforeLock?: number | null; retryAfterSec?: number | null };

const NULL_CAPS = Object.fromEntries(CAP_FIELDS.map((k) => [k, null])) as HouseBotCaps;

/**
 * Designate `userId` as a house bot: PAUSED(NEW), nothing in scope until Start (04 A11).
 *   1. label and note; eligibility (roster full and a readable balance included) — before the password, so
 *      no attempt is spent on an account that cannot be designated (C4);
 *   2. the password check;
 *   3. under `wallet:<userId>`: the hash re-read — a change since the check refuses and writes no row (A3, C9);
 *      then under `house:control`: the roster counted again, and the bot, its runtime row and DESIGNATED
 *      written in one transaction (C4).
 * A label or account clash between the check and the insert — including two owners at once — is named by the
 * unique index, never guessed (C2).
 */
export async function designateHouseBot(input: {
  officerId: string; userId: string; label: string; note?: string | null; password: string; submitId?: string | null;
}): Promise<DesignateResult> {
  /* ⛔ F2 · FIRST STATEMENT, BEFORE A PASSWORD ATTEMPT CAN BE SPENT. Until this gate existed the desk's
     "nothing can be designated" Callout was DISPLAY ONLY: the service would happily designate a new
     account onto a withdrawn desk, and the refusal has to hold for every caller, not only for the one
     that hides the button. */
  if (!houseBotsLive()) return { ok: false, code: "INELIGIBLE", message: FEATURE_WITHDRAWN_REFUSAL };
  const { officerId, userId } = input;
  const labelErr = validateLabel(input.label);
  if (labelErr) return { ok: false, code: "INVALID", message: labelErr.message, field: "label" };
  const noteErr = input.note ? validateNote(input.note) : null;
  if (noteErr) return { ok: false, code: "INVALID", message: noteErr.message, field: "note" };
  const label = normaliseLabel(input.label);
  const key = labelKey(label);
  const note = input.note ? normaliseText(input.note) || null : null;

  // The CHECK time: the bot's `verifiedAt`. Anything that lands while the owner types is later than it (review LI-3).
  const checkedAtMs = Date.now();
  const el = await houseBotEligibility(userId, { context: "designate", actorId: officerId });
  if (!el.eligible) {
    const first = el.blocking[0];
    if (first.code === "ALREADY_LIVE_BOT") {
      const live = await houseBotStore.findLiveByUserId(userId);
      return { ok: false, code: "ALREADY_BOT", message: DESIGNATE_COPY.alreadyBot, data: live ? { botId: live.id } : undefined, href: first.href };
    }
    return { ok: false, code: first.code === "ROSTER_FULL" ? "ROSTER_FULL" : "INELIGIBLE", message: first.message, row: first, href: first.href };
  }
  const clash = (await houseBotStore.listNonRemoved()).find((b) => b.labelKey === key);
  if (clash) return { ok: false, code: "INVALID", field: "label", message: DUPLICATE_LABEL_COPY(clash.label, houseBotStatusWord(clash.status)) };

  const v = await verifyHouseBotPassword({ officerId, userId, password: input.password, submitId: input.submitId });
  if (!v.ok) return { ok: false, code: v.code, message: v.message, field: v.field, row: v.row, attemptsBeforeLock: v.attemptsBeforeLock, retryAfterSec: v.retryAfterSec };

  type Written = { kind: "changed" } | { kind: "full"; count: number; max: number } | { kind: "blocked"; row: EligibilityRow } | { kind: "ok"; bot: StoredHouseBot };
  let written: Written;
  try {
    written = await withLock(`wallet:${userId}`, async (): Promise<Written> => {
      const fresh = await db.user.findById(userId);
      if (!fresh || passwordFingerprint(fresh.passwordHash) !== v.fingerprint) return { kind: "changed" };
      // The account as it is now, under the lock erasure's live-bot check also takes (review MC-4, LI-3).
      const stale = await accountChangedSince(fresh, checkedAtMs);
      if (stale) return { kind: "blocked", row: stale };
      return withLock(HOUSE_CONTROL_LOCK, async (tx): Promise<Written> => {
        const count = await houseBotStore.countLive(tx);
        const control = await houseBotControlStore.get(tx);
        if (count >= control.maxDesignatedBots) return { kind: "full", count, max: control.maxDesignatedBots };
        const now = new Date().toISOString();
        const bot = await houseBotStore.designate({
          bot: {
            id: newHouseId("bot"), userId, label, labelKey: key, note, passwordFingerprint: v.fingerprint,
            verifiedAt: new Date(checkedAtMs).toISOString(), verifiedById: officerId, designatedAt: now, designatedById: officerId,
            rules: { schemaVersion: HOUSE_RULES_SCHEMA_VERSION }, ...NULL_CAPS,
          },
          event: { actorId: officerId, reason: null, payload: null },
        }, tx);
        return { kind: "ok", bot };
      });
    });
  } catch (e) {
    const index = uniqueViolation(e);
    if (index === "HouseBot_labelKey_live_key") {
      const other = (await houseBotStore.listNonRemoved()).find((b) => b.labelKey === key);
      return { ok: false, code: "INVALID", field: "label", message: DUPLICATE_LABEL_COPY(other?.label ?? label, houseBotStatusWord(other?.status ?? "PAUSED")) };
    }
    if (index === "HouseBot_userId_live_key") {
      const live = await houseBotStore.findLiveByUserId(userId);
      return { ok: false, code: "ALREADY_BOT", message: DESIGNATE_COPY.alreadyBot, data: live ? { botId: live.id } : undefined };
    }
    throw e;
  }
  if (written.kind === "changed") return { ok: false, code: "PASSWORD_CHANGED", field: "password", message: DESIGNATE_COPY.passwordChanged };
  if (written.kind === "blocked") return { ok: false, code: "INELIGIBLE", message: written.row.message, row: written.row };
  if (written.kind === "full") return { ok: false, code: "ROSTER_FULL", message: DESIGNATE_COPY.rosterFull(written.count, written.max), href: CONSOLE_LIMITS_HREF };

  // After the locks: the COMPLIANCE row (R7 — no label, note or fingerprint). The holder is told nothing (D19c, ruling 149).
  // ⛔ 543 · the account is designated whatever the row did; whether the row landed travels with the answer.
  const designated = await houseAudit("house_bot.designated", officerId, { type: "HouseBot", id: written.bot.id }, { botId: written.bot.id, holderUserId: userId });
  return { ok: true, bot: written.bot, recorded: designated };
}

/**
 * What may have changed on the account between the owner's checks and the write, read again under
 * `wallet:<userId>` (review MC-1, LI-3, MC-4): the account closed or no longer active, an erasure request filed, a
 * responsible-gambling lock standing, or a self-exclusion or break STARTED after `checkedAtMs` (both stamps are the
 * app clock). A read that throws refuses. Null means nothing changed.
 */
async function accountChangedSince(fresh: StoredUser, checkedAtMs: number): Promise<EligibilityRow | null> {
  if (fresh.status === "CLOSED" || fresh.closedAt != null) {
    return { code: "ACCOUNT_CLOSED", short: "Account closed", message: "Their account was closed a moment ago — it can't be designated or confirmed." };
  }
  if (hasOpenRequest(fresh.id, "ERASURE")) {
    return { code: "ERASURE_REQUEST", short: "Erasure requested", message: "They asked for their data to be erased a moment ago. Liquidity stakes can't continue — resolve the request or remove the bot." };
  }
  try {
    const s = await getRgSettings(fresh.id);
    const lock = await isLockedOut(fresh.id);
    const rg = { selfExclusionUntil: s.selfExclusionUntil ?? null, coolingOffUntil: s.coolingOffUntil ?? null };
    const started = Math.max(Date.parse(s.selfExclusionStartedAt ?? "") || 0, Date.parse(s.coolingOffStartedAt ?? "") || 0);
    if (lock.locked || rgLockStands({ user: fresh, rg, nowMs: Date.now() }) || started > checkedAtMs) {
      const excluded = fresh.status === "SELF_EXCLUDED" || lock.reason === "self_exclusion";
      return { code: "RG_LOCKED", short: excluded ? "Self-excluded" : "On a break", message: RG_LOCKED_COPY(excluded ? "self-excluded" : "on a break", excluded ? rg.selfExclusionUntil : rg.coolingOffUntil) };
    }
  } catch {
    return { code: "RG_UNREADABLE", short: "Limits unreadable", message: "Couldn't read their responsible-gambling settings. Refresh to try again." };
  }
  return null;
}

/* ═══ Re-verify (02 §2.6 steps 3–7, 04 A3, C8) ═══════════════════════════════════════════════════════ */

/** The eligibility rows that refuse a re-verify. Suspension, freeze and role do not (C8, PLAN §18). */
const REVERIFY_BLOCKING_ROWS: ReadonlySet<string> = new Set([
  "ACCOUNT_MISSING", "ACCOUNT_CLOSED", "NO_PASSWORD", "RG_LOCKED", "RG_UNREADABLE", "ERASURE_REQUEST",
  // C4-SPEC ruling 130: an unreadable data-rights queue fails closed, like every other unreadable row here.
  "ERASURE_UNREADABLE",
  "SIGN_IN_LOCKED", "PASSWORD_SET_BY_SUPPORT", "PASSWORD_HISTORY_UNREADABLE",
]);

export const REVERIFY_COPY = {
  changedAgain: "Their password changed again while you were typing. Ask them for the newest one.",
  running: "The bot is running. It pauses itself when the password changes — try again in a moment.",
  notReverifiable: "Re-verify can't clear what stops this bot now. Resolve the causes listed on the bot first.",
  voidedMeanwhile: "Their permission ended while you were typing. Re-verify can't confirm it in the same step — look at the bot's causes, then try again.",
} as const;

export type ReverifyResult =
  | { ok: true; verified: true; status: HouseBotStatus; wasActive: boolean }
  | { ok: false; code: "NOT_FOUND" | "BLOCKED" | "CHANGED_AGAIN" | "BOT_ACTIVE" | VerifyRefusalCode;
    message: string; field?: "password"; row?: EligibilityRow; attemptsBeforeLock?: number | null; retryAfterSec?: number | null };

/**
 * Confirm the holder's permission again with their current password. On success: the new fingerprint,
 * `verifiedAt/ById`, the credential change cleared, an AUTO_PAUSED bot moved to PAUSED(MANUAL) (C3-SPEC ruling
 * 11), event VERIFIED. ⛔ It never starts the bot: the console's "resume" calls `startHouseBot` after it, with
 * every Start check.
 */
export async function reverifyHouseBot(input: { officerId: string; botId: string; password: string; submitId?: string | null }): Promise<ReverifyResult> {
  /* ⛔ F2 · a re-check is the first step of putting an account back to work, so it is refused too — and
     before the password, so a withdrawn programme cannot spend a holder's own lockout reserve. */
  if (!houseBotsLive()) return { ok: false, code: "BLOCKED", message: FEATURE_WITHDRAWN_REFUSAL };
  const { officerId, botId } = input;
  const bot = await houseBotStore.get(botId);
  if (!bot) return { ok: false, code: "NOT_FOUND", message: "No bot with that ID." };
  if (bot.status === "REMOVED") return { ok: false, code: "BOT_REMOVED", message: VERIFY_COPY.removed };
  if (input.password.length === 0) return { ok: false, code: "EMPTY", message: VERIFY_COPY.empty, field: "password" };

  // The CHECK time, and the void as it stood before the password check: both are compared again under the lock.
  const checkedAtMs = Date.now();
  const el = await houseBotEligibility(bot.userId, { context: "reverify", botId, actorId: officerId });
  const blockingRow = el.blocking.find((r) => REVERIFY_BLOCKING_ROWS.has(r.code));
  if (blockingRow) return { ok: false, code: "BLOCKED", message: blockingRow.message, row: blockingRow };
  const holder = await db.user.findById(bot.userId);
  if (bot.status === "ACTIVE") {
    if (holder && consentValid(bot, passwordFingerprint(holder.passwordHash))) return { ok: false, code: "NOTHING_TO_VERIFY", message: VERIFY_COPY.nothing };
    return { ok: false, code: "BOT_ACTIVE", message: REVERIFY_COPY.running };
  }
  if (!canReverify(bot.status, el.causes, el.rgLocked)) return { ok: false, code: "BLOCKED", message: REVERIFY_COPY.notReverifiable };

  const v = await verifyHouseBotPassword({ officerId, userId: bot.userId, password: input.password, botId, submitId: input.submitId });
  if (!v.ok) return { ok: false, code: v.code, message: v.message, field: v.field, row: v.row, attemptsBeforeLock: v.attemptsBeforeLock, retryAfterSec: v.retryAfterSec };

  type Written = { kind: "changed" } | { kind: "removed" } | { kind: "active" } | { kind: "blocked"; row: EligibilityRow } | { kind: "ok"; status: HouseBotStatus; wasActive: boolean };
  const written = await withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t): Promise<Written> => {
    const fresh = await db.user.findById(bot.userId);
    if (!fresh || passwordFingerprint(fresh.passwordHash) !== v.fingerprint) return { kind: "changed" };
    const cur = await houseBotStore.get(botId, t);
    if (!cur || cur.status === "REMOVED") return { kind: "removed" };
    if (cur.status === "ACTIVE") return { kind: "active" };
    // ⛔ A void written while the owner typed is NOT cleared by this re-verify (review MC-1): compared by value, since
    // the void is stamped on the database clock.
    if (cur.consentVoidAt !== bot.consentVoidAt || cur.consentVoidCause !== bot.consentVoidCause) {
      return { kind: "blocked", row: { code: "CONSENT_VOID", short: "Permission ended", message: REVERIFY_COPY.voidedMeanwhile } };
    }
    const stale = await accountChangedSince(fresh, checkedAtMs);
    if (stale) return { kind: "blocked", row: stale };
    const wasActive = cur.pausedFromStatus === "ACTIVE";
    // `verifiedAt` is the check time — but later than the void this re-verify clears (checked unchanged just above),
    // which the database clock may have stamped a few milliseconds past the app's.
    const verifiedAt = new Date(Math.max(checkedAtMs, cur.consentVoidAt ? Date.parse(cur.consentVoidAt) + 1 : 0)).toISOString();
    const verified = await houseBotStore.setVerified(botId, { fingerprint: v.fingerprint, verifiedById: officerId, verifiedAt }, t);
    if (!verified) return { kind: "active" };
    let status: HouseBotStatus = verified.status;
    if (verified.status === "AUTO_PAUSED") {
      const moved = await houseBotStore.setStatus(botId, { from: ["AUTO_PAUSED"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null }, t);
      if (moved) status = "PAUSED";
    }
    await houseBotEventStore.append({
      houseBotId: botId, userId: bot.userId, marketId: null, kind: "VERIFIED", fromStatus: cur.status, toStatus: status,
      reason: null, actorId: officerId, payload: { wasActive },
    }, t);
    return { kind: "ok", status, wasActive };
  }));
  if (written.kind === "changed") return { ok: false, code: "CHANGED_AGAIN", field: "password", message: REVERIFY_COPY.changedAgain };
  if (written.kind === "blocked") return { ok: false, code: "BLOCKED", message: written.row.message, row: written.row };
  if (written.kind === "removed") return { ok: false, code: "BOT_REMOVED", message: VERIFY_COPY.removed };
  if (written.kind === "active") return { ok: false, code: "BOT_ACTIVE", message: REVERIFY_COPY.running };

  return { ok: true, verified: true, status: written.status, wasActive: written.wasActive };
}

/* ═══ Start (02 §3.3, 04 A3, C8, C9, C10, C14) ═════════════════════════════════════════════════════════ */

export type StartResult =
  /**
   * ⭐ `warnings` — WHAT START KNEW AND USED TO THROW AWAY (2026-09-23 · register A3).
   *
   * 🔴 MEASURED ON 2026-09-22: `rulesStartProblems` answers `{ refusals, warnings }`, this branch read the
   * refusals and dropped the warnings on the floor, and the console reported "Started". So an account whose
   * every enabled mode is IMPOSSIBLE — a COUNTER whose entry can never fall inside any chain's window, or an
   * account with no automatic mode at all — was started, said to be started, and then never placed a bet,
   * with nothing on any screen saying why. The facts existed; only the shape lost them.
   * ⛔ THEY ARE ADVICE AND NEVER A REFUSAL. The account IS started: a warning that blocked would be a refusal
   * wearing the wrong word, and the officer's own decision to run a by-hand-only account is theirs to make.
   * ⚠️ EMPTY ON `alreadyRunning`: the rules were not re-read for an account that was already ACTIVE, and a
   * warning inferred from a read that did not happen is worse than none.
   * ⭐ `recorded` (replan ruling 543) is false when the account IS running and its compliance row did not land —
   * the console says both. It is true on `alreadyRunning`, where nothing was written and nothing is owed.
   */
  | { ok: true; alreadyRunning: boolean; masterOn: boolean; warnings: string[]; recorded: boolean }
  | { ok: false; code: "NOT_FOUND" | "REMOVED" | "INELIGIBLE" | "CONSENT" | "RULES" | "LOSS_CAP" | "OWNER_LOSS_LIMIT" | "CHANGED";
    message: string; field?: string; href?: string; row?: EligibilityRow };

/** Start's consent and money rows, which 02 §3.3 checks after the plain eligibility rows. */
const START_LATE_ROWS: readonly string[] = ["PASSWORD_CHANGED", "CONSENT_VOID", "RG_SINCE_VERIFIED", "DAILY_LOSS_STOP", "OWNER_LOSS_LIMIT"];

const cantStart = (m: string): string => (m.startsWith("Can't start") ? m : `Can't start: ${m}`);

/**
 * Start a paused bot, in 02 §3.3's order: removed → eligibility → consent (fingerprint, void, RG backstop) →
 * the saved rules and caps → today's loss cap → the holder's own loss limit. Then, under `wallet:<botUser>`,
 * consent is re-read and the bot moves to ACTIVE with its scope starting now (04 A11) and event STARTED.
 * ⚠️ With the master switch OFF the bot still starts (C10, C3-SPEC ruling 10); `masterOn` says so.
 * `rulesContext` is built by the caller from the live platform (commit 7's action).
 */
export async function startHouseBot(input: { officerId: string; botId: string; rulesContext: RulesContext }): Promise<StartResult> {
  /* ⛔ F2 · a withdrawn programme starts nothing, and this is checked before the roster is even read.
     ⚠️ It does NOT stop an already-ACTIVE account being paused or removed: a sunset must be able to wind
     down what is running, and gating the refusal path is how a withdrawal strands what it withdrew. */
  if (!houseBotsLive()) return { ok: false, code: "INELIGIBLE", message: FEATURE_WITHDRAWN_REFUSAL };
  const { officerId, botId } = input;
  const bot = await houseBotStore.get(botId);
  if (!bot) return { ok: false, code: "NOT_FOUND", message: "No bot with that ID." };
  if (bot.status === "REMOVED") return { ok: false, code: "REMOVED", message: VERIFY_COPY.removed };
  const control = await houseBotControlStore.get();
  if (bot.status === "ACTIVE") return { ok: true, alreadyRunning: true, masterOn: control.enabled, warnings: [], recorded: true };

  const el = await houseBotEligibility(bot.userId, { context: "start", botId, actorId: officerId });
  const early = el.blocking.find((r) => !START_LATE_ROWS.includes(r.code));
  if (early) return { ok: false, code: "INELIGIBLE", message: cantStart(early.message), row: early, href: early.href };
  const consent = el.blocking.find((r) => r.code === "PASSWORD_CHANGED" || r.code === "CONSENT_VOID" || r.code === "RG_SINCE_VERIFIED");
  if (consent) return { ok: false, code: "CONSENT", message: consent.message, row: consent, href: consent.href };

  const parsed = parseHouseBotRules(bot.rules, input.rulesContext);
  if (!parsed.ok) {
    const message = parsed.code === "RULES_FROM_FUTURE"
      ? "Can't start: these rules were saved by a newer build. Wait for the deploy to finish, then try again."
      : parsed.code === "RULES_OUTDATED"
        ? "Can't start: the rules were saved in an older format. Open Rules, review the converted values, Save, then Start."
        : "Can't start: the saved rules can't be read. Rules → Save → Start.";
    return { ok: false, code: "RULES", message, field: parsed.field, href: consoleBotTabHref(botId, "rules") };
  }
  const caps = Object.fromEntries(CAP_FIELDS.map((k) => [k, bot[k]])) as HouseBotCaps;
  const problems = rulesStartProblems(parsed.rules, caps, input.rulesContext, { botId, label: bot.label });
  if (problems.refusals.length > 0) {
    const r = problems.refusals[0];
    return { ok: false, code: "RULES", message: r.message, field: r.field, href: r.href };
  }
  const loss = el.blocking.find((r) => r.code === "DAILY_LOSS_STOP");
  if (loss) return { ok: false, code: "LOSS_CAP", message: loss.message, row: loss, href: loss.href };
  const own = el.blocking.find((r) => r.code === "OWNER_LOSS_LIMIT");
  if (own) return { ok: false, code: "OWNER_LOSS_LIMIT", message: own.message, row: own };

  type Written = { kind: "changed" } | { kind: "removed" } | { kind: "already" } | { kind: "ok"; from: HouseBotStatus };
  const written = await withLock(`wallet:${bot.userId}`, (tx) => houseAtomic(tx, async (t): Promise<Written> => {
    const cur = await houseBotStore.get(botId, t);
    if (!cur || cur.status === "REMOVED") return { kind: "removed" };
    if (cur.status === "ACTIVE") return { kind: "already" };
    const fresh = await db.user.findById(bot.userId);
    if (!fresh || !consentValid(cur, passwordFingerprint(fresh.passwordHash))) return { kind: "changed" };
    const moved = await houseBotStore.setStatus(botId, { from: ["PAUSED", "AUTO_PAUSED"], to: "ACTIVE", pauseReason: null, pauseDetail: null, pausedFromStatus: null }, t);
    if (!moved) return { kind: "already" };
    await houseBotRuntimeStore.setScopeFrom(RUNTIME_KEY.bot(botId), t);
    await houseBotEventStore.append({
      houseBotId: botId, userId: bot.userId, marketId: null, kind: "STARTED", fromStatus: cur.status, toStatus: "ACTIVE",
      reason: null, actorId: officerId, payload: { rulesVersion: cur.rulesVersion },
    }, t);
    return { kind: "ok", from: cur.status };
  }));
  if (written.kind === "removed") return { ok: false, code: "REMOVED", message: VERIFY_COPY.removed };
  if (written.kind === "already") return { ok: true, alreadyRunning: true, masterOn: control.enabled, warnings: [], recorded: true };
  if (written.kind === "changed") return { ok: false, code: "CHANGED", message: "Can't start: their password or permission changed a moment ago. Enter their password to confirm it again.", href: consoleReverifyHref(botId) };

  // ⛔ 543 · the account is ACTIVE by this line; whether its compliance row landed travels with the answer.
  const startRecorded = await houseAudit("house_bot.started", officerId, { type: "HouseBot", id: botId }, { botId, holderUserId: bot.userId, from: written.from, to: "ACTIVE", rulesVersion: bot.rulesVersion });
  return { ok: true, alreadyRunning: false, masterOn: (await houseBotControlStore.get()).enabled, warnings: problems.warnings, recorded: startRecorded };
}

/* ═══ Consent void (04 A3, C8, N2 §4 step 10) ═════════════════════════════════════════════════════════ */

export type VoidResult =
  | { voided: true; botId: string; from: HouseBotStatus; to: HouseBotStatus; targetsEnded: number; intentsCancelled: number }
  | { voided: false; reason: "NO_LIVE_BOT" | "ALREADY_VOID" };

/**
 * Void the holder's consent for `cause` — one of `CONSENT_VOID_CAUSES` — on their non-removed bot, in ONE
 * `wallet:<botUser>` transaction:
 *   · `consentVoidAt` stamped (only when no void stands since the last verification — a second pass changes
 *     nothing) and event CONSENT_VOIDED;
 *   · every ACTIVE target of the bot → ENDED(CONSENT_VOID) with one TARGET_ENDED event each; Re-verify and
 *     Start never revive them (N2 §4 step 10, TGT-40);
 *   · an ACTIVE bot → AUTO_PAUSED(cause), `pausedFromStatus` ACTIVE, its live intents cancelled; a paused bot
 *     keeps its status and gets HOLDER_CAUSE_ADDED.
 * A throw anywhere rolls every one of those back (targets stay ACTIVE). After the lock: the COMPLIANCE row.
 * ⛔ **AND NOTHING ELSE REACHES THE HOLDER — corrected in C5-8 (2026-09-21, ruling 258).** This paragraph used to
 * add "and for HOLDER_WITHDREW the holder's confirmation": owner ruling D19c admits no house-bot notice or email to
 * a holder for ANY cause, and this module sends none (it imports no emitter). Responsible-gambling causes send the
 * holder nothing (C8); IDENTITY_REFUSED and HOLDER_ERASURE_REQUEST are ADMIN notices from commit 4's emitters
 * (C3-SPEC ruling 12), never the holder's.
 *
 * Callers: the withdrawal helper below (an OFFICER action, Commit 7 — never the holder's own button, D19c), and
 * commit 4's holder hook, L2 sweep and mapper.
 */
export async function voidHouseConsent(input: { userId: string; cause: ConsentVoidCause; actorId: string | null }): Promise<VoidResult> {
  const { userId, cause } = input;
  type Written = VoidResult & { cancelled?: string[] };
  const written = await withLock(`wallet:${userId}`, (tx) => houseAtomic(tx, async (t): Promise<Written> => {
    const bot = await houseBotStore.findLiveByUserId(userId, t);
    if (!bot) return { voided: false, reason: "NO_LIVE_BOT" };
    let voided = await houseBotStore.setConsentVoid(bot.id, cause, t);
    // The holder's own "stop" on a void that stands for another cause is still recorded (review LI-4): the cause
    // becomes HOLDER_WITHDREW, the audit and the confirmation go out. A repeat withdrawal changes nothing.
    const supersedes = !voided && cause === "HOLDER_WITHDREW" ? bot.consentVoidCause : null;
    if (!voided && cause === "HOLDER_WITHDREW") voided = await houseBotStore.upgradeConsentVoidCause(bot.id, t);
    if (!voided) return { voided: false, reason: "ALREADY_VOID" };
    const to: HouseBotStatus = bot.status === "ACTIVE" ? "AUTO_PAUSED" : bot.status;
    await houseBotEventStore.append({
      houseBotId: bot.id, userId, marketId: null, kind: "CONSENT_VOIDED", fromStatus: bot.status, toStatus: to,
      reason: null, actorId: input.actorId, payload: supersedes ? { cause, supersedes } : { cause },
    }, t);
    const ended = await targetStore.endAllForBot(bot.id, "CONSENT_VOID", t);
    for (const target of ended) {
      await houseBotEventStore.append({
        houseBotId: bot.id, userId, marketId: target.marketId, kind: "TARGET_ENDED", fromStatus: "ACTIVE", toStatus: "ENDED",
        // N2 §2's event table names the key `endCause` (C4-SPEC ruling 76).
        reason: null, actorId: input.actorId, payload: { targetId: target.id, endCause: "CONSENT_VOID" },
      }, t);
    }
    let cancelled: string[] = [];
    if (bot.status === "ACTIVE") {
      const paused = await houseBotStore.setStatus(bot.id, {
        from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: cause, pauseDetail: null, pausedFromStatus: "ACTIVE",
      }, t);
      if (!paused) throw new Error(`voidHouseConsent: ${bot.id} left ACTIVE inside its own wallet lock`);
      cancelled = (await houseBotIntentStore.cancelLive({ houseBotId: bot.id }, "BOT_NOT_ACTIVE", t)).map((i) => i.id);
      await houseBotEventStore.append({
        houseBotId: bot.id, userId, marketId: null, kind: "AUTO_PAUSED", fromStatus: "ACTIVE", toStatus: "AUTO_PAUSED",
        reason: null, actorId: input.actorId, payload: { cause },
      }, t);
    } else {
      await houseBotEventStore.append({
        houseBotId: bot.id, userId, marketId: null, kind: "HOLDER_CAUSE_ADDED", fromStatus: bot.status, toStatus: bot.status,
        reason: null, actorId: input.actorId, payload: { cause },
      }, t);
    }
    return { voided: true, botId: bot.id, from: bot.status, to, targetsEnded: ended.length, intentsCancelled: cancelled.length };
  }));
  if (!written.voided) return written;

  const counts = { targetsEnded: written.targetsEnded, intentsCancelled: written.intentsCancelled };
  const payload = { botId: written.botId, holderUserId: userId, from: written.from, to: written.to, cause, counts };
  if (cause === "HOLDER_WITHDREW") {
    await houseAudit("house_bot.holder_withdrew_consent", input.actorId, { type: "HouseBot", id: written.botId }, payload);
  } else if (written.from === "ACTIVE") {
    await houseAudit("house_bot.auto_paused", input.actorId, { type: "HouseBot", id: written.botId }, payload);
  }
  return { voided: true, botId: written.botId, from: written.from, to: written.to, targetsEnded: written.targetsEnded, intentsCancelled: written.intentsCancelled };
}

/**
 * WITHDRAWAL OF CONSENT (04 A3, cause HOLDER_WITHDREW).
 *
 * ⛔ **NOT a holder-facing action, and the docstring that said so was corrected in C5-8 (2026-09-21, ruling 258).**
 * It read "the holder's own Stop liquidity stakes — the service `…Action` calls", naming a server action that has
 * never existed on this branch. Owner ruling D19c struck the holder-facing surface whole: a holder is told nothing
 * about house bots, so they cannot be given a button that stops them. Any caller is an OFFICER acting on a holder's
 * request, and that surface belongs to Commit 7.
 *
 * ⚠️ It has NO caller under `src/` today, and that is enforced rather than remembered: the reports suite's §0.170.2
 * requires nothing under `src/` to name it outside this definition, with planted callers as its controls, and
 * `HOLDER_ACTOR_DEBT` carries it as a Commit 7 debt that may only LEAVE that list — because when a caller does
 * arrive it must write the officer as actor, not the holder (ruling 170).
 */
export function withdrawHouseConsent(holderUserId: string): Promise<VoidResult> {
  return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId });
}
