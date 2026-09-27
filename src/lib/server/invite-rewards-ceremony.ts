/**
 * THE OWNER'S CEREMONY — making invites Payable, and stopping payment (2026-09-26).
 *
 * The WRITE side of `invite-rewards-switch.ts`. Imported by `/admin/affiliate`'s actions and page, and
 * by the suites — nothing else. Ali's rulings, binding:
 *   1. Only the OWNER (stored role ADMIN) makes invites payable: a written reason (5–300 characters)
 *      and the typed words MAKE PAYABLE. No authenticator code — Ali's choice.
 *   2. Only the Owner stops payment: a reason, one step.
 *   3. Not payable locks every reward setting; Payable unlocks them behind ONE verified Save.
 *   4. The Make-payable dialog defaults to "Nothing yet — switch every reward off".
 *
 * ⛔ THE CHECKS RUN IN ONE ORDER, AND THE ORDER IS THE SPEC. (1) a session at all ("Your session
 * ended", no audit row), then the viewer's STORED role — a session cookie is a photograph of a role at
 * sign-in, so it is never asked; a refusal writes a SECURITY `privilege_escalation_blocked` row. (2) the
 * console's own two-step status (passes when `DISABLE_ADMIN_TOTP=true`). (3) the reason, cleaned of
 * invisible characters. (4) ON only: the ceiling, the typed words, what pays from now. (5) under the
 * switch's lock: a fresh read, the seq the page was rendered on, then (ON only) the reward settings
 * RE-READ from their row — and, for "the settings on this page", the price the Owner saw checked against
 * THAT — the no-op check, the COMPLIANCE attempt row, the config write, the sealed record, and a re-read
 * of what now holds. (6) after the lock, the COMPLIANCE outcome row (`confirmed: false` when unknown).
 *
 * ⛔ ON WRITES THE CONFIG FIRST AND THE SWITCH SECOND, AND THE ORDER IS THE SAFE ONE. If the switch
 * were written first and the config write then failed, invites would be payable on whatever modes were
 * already on — the shipped prize among them — which is exactly what "Nothing yet" exists to prevent.
 * Config first means every failure leaves invites Not payable.
 *
 * ⛔ A REFUSAL IS A UNION, NEVER A THROW — a thrown action shows the Owner nothing, and on the control
 * that starts money that is the worst failure there is. Every sentence here is the server's; the
 * dialog's own words are built by `invitePayableDialogs` below, on the server too.
 */
import { audit } from "./audit";
import { db } from "./store";
import { withLock } from "./locks";
import type { AdminTotpStatus } from "./admin-guard";
import { inviteRewardsCeiling } from "@/lib/feature-state";
import { affiliateConfigFingerprint, cleanReason, priceInviteRewards, rewardTermsRaised, type InviteRewardsPrice } from "@/lib/affiliate-rules";
import { formatDateTime } from "@/lib/utils";
import { getAffiliateConfig, reloadAffiliateConfig, setAffiliateConfigVerified, type AffiliateConfig, type AffiliateConfigUpdate } from "./affiliate-config";
import { referralRewardDestination } from "./affiliate-service";
import {
  INVITE_REASON_MAX,
  INVITE_REASON_MIN,
  INVITE_SWITCH_KEY,
  composeInvitePayable,
  playerInvitePayableNow,
  readStoredSwitchFresh,
  writeStoredSwitchVerified,
  type InvitePayableView,
  type StoredSwitch,
} from "./invite-rewards-switch";

export { INVITE_REASON_MAX, INVITE_REASON_MIN } from "./invite-rewards-switch";

/** ⛔ THE TYPED WORDS, IN ONE HOME. Handed to the dialog as a prop and checked again here — a word
 *  verified only in the browser is a ceremony a crafted POST walks straight through. */
export const INVITE_PAYABLE_WORD = "MAKE PAYABLE";

/** The switch's lock. A Make payable, a Stop paying and a reward Save are serialised on it, across containers. */
export const INVITE_SWITCH_LOCK = "invite-rewards:switch";

export type InvitePayableStart = "NOTHING" | "AS_SHOWN";

/** What the ceremony posts. */
export type InvitePayableInput = {
  to: "PAYABLE" | "NOT_PAYABLE";
  reason: string;
  /** PAYABLE only: what the Owner typed. */
  typed?: string;
  /** The `seq` the page was rendered on (`InvitePayableView.seq`) — "changed a moment ago" otherwise. */
  expectSeq: number;
  /** PAYABLE only: "NOTHING" switches every reward off; "AS_SHOWN" arms the settings as priced. */
  start?: InvitePayableStart;
  /** PAYABLE + AS_SHOWN only: the fingerprint of the config the Owner saw priced. */
  pricedFingerprint?: string;
};

/**
 * What it answers. `payable` is the page's state AFTER the act (Payable = the switch composes to pay
 * and the service-level pause is off). `note` is the sentence beside the outcome and `warn` says whether
 * it is a warning (the act landed but its compliance record did not, or the server still forces payment).
 * `recorded` is false only when the act LANDED and its COMPLIANCE row could not be written.
 */
export type InvitePayableResult =
  | { ok: true; payable: boolean; changed: boolean; note: string | null; warn: boolean; recorded: boolean }
  | { ok: false; error: string; field?: "reason" | "typed" | "start" | "seq" };

/** The ceremony's context — resolved by the action, never by this module (no cookies here). */
export type InvitePayableContext = { totp: AdminTotpStatus };

/**
 * ⭐ THE REWARD SAVE'S POST (2026-09-26): the fingerprint of the settings the page LOADED
 * (`affiliateConfigFingerprint`), and ONLY the fields the officer changed (`changedRewardFields`).
 */
export type InviteRewardSettingsSave = { baseFingerprint: string; changes: AffiliateConfigUpdate };

const COPY = {
  refusedOn: "Only the Owner can make invites payable.",
  refusedOff: "Only the Owner can stop payment.",
  refusedAny: "Only the Owner can change whether invites are paid.",
  whoUnknown: "We could not confirm who you are, so nothing changed. Reload the page and try again.",
  totpNotEnrolled: "Two-step sign-in is not set up on this account. Set it up, then try again. Nothing changed.",
  totpUnverified: "Your console session needs its two-step check again. Reload the page, then try again. Nothing changed.",
  notUnderstood: "The request was not understood, so nothing changed. Reload the page and try again.",
  reasonShort: `Say why, in ${INVITE_REASON_MIN} characters or more. It is kept with the change.`,
  reasonLong: `Keep the reason under ${INVITE_REASON_MAX} characters.`,
  forced: "Forced on by the server (FEATURE_INVITEREWARDS=ACTIVE); the Owner switch is not in effect.",
  closedEnv: "Withdrawn in the server's environment (FEATURE_INVITEREWARDS=WITHDRAWN); this page cannot turn it on.",
  closedCode: "Withdrawn in the server's code; this page cannot turn it on.",
  wordWrong: `Type ${INVITE_PAYABLE_WORD} exactly, in capitals, to confirm.`,
  startMissing: "Choose what pays from now.",
  priceStale: "The reward settings changed since this page priced them. Reload the page and check the price again. Nothing changed.",
  seqStale: "The switch was changed a moment ago. Reload the page to see who changed it and why. Nothing changed.",
  unread: "The stored switch could not be read, so nothing changed. Try again.",
  notStored: "The switch did not reach the database, so invites are still Not payable. Try again.",
  notStoredNothing: "The switch did not reach the database, so invites are still Not payable. Every reward setting was switched off first. Try again.",
  notStoredOff: "The change did not reach the database, so payment was NOT stopped. Try again.",
  unconfirmed: "The change was sent but could not be confirmed. Reload the page to see the switch as it is now.",
  alreadyOn: "Invites were already payable. Nothing changed.",
  alreadyOff: "Invites were already Not payable. Nothing changed.",
  onNothing: "Invites are payable, and every reward is switched off. Nothing is paid until you switch one on below and Save.",
  offForced: "Stored as Not payable — but the server still forces payment (FEATURE_INVITEREWARDS=ACTIVE).",
  offKilled: "Recorded as Not payable — lifting the server's suspension no longer resumes payment.",
  notRecorded: "⚠️ Its compliance record could not be written — tell whoever keeps the records.",
  locked: "Locked while Not payable — the reward settings change only while invites are payable. Nothing was saved.",
  saveNotUnderstood: "The settings were not understood, so nothing was saved. Reload the page and try again.",
  configUnread: "The reward settings could not be read, so nothing changed and invites are still Not payable. Try again.",
  saveConfigUnread: "The stored reward settings could not be read, so nothing was saved. Try again.",
  settingsMoved: "These settings changed since this page loaded — reload to see them.",
  attemptUnrecorded: "The compliance record could not be written first, so nothing changed. Try again.",
  outcomeUnknown: "Outcome unknown — reload to see the current state.",
  rearmed: "Invites are payable again — the service-level pause is lifted.",
  rearmedNoRecord: "Invites are payable again — the service-level pause is lifted. The switch's own record could not be updated, so the earlier record still shows on this page.",
  sessionEnded: "Your session ended — sign in again. Nothing changed.",
  stopStarts: "No new referral reward starts from the moment you confirm; a reward already being paid at that instant can still land.",
  termsNotRecorded: "Saved — ⚠️ but the compliance record of the raised terms could not be written. Tell whoever keeps the records.",
} as const;

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/** Every reward mode off — "Nothing yet". `enabled` rides with it: the ceremony is the one writer of it. */
const ALL_MODES_OFF: AffiliateConfigUpdate = { enabled: true, commission: { enabled: false }, bonus: { enabled: false }, prize: { enabled: false } };

/**
 * ⭐ MAKE INVITES PAYABLE, OR STOP PAYING — the Owner's ceremony.
 *
 * @param viewerUserId the SESSION's user id (null when there is none); the role is read from the row.
 * @param input        what the dialog posted — treated as untrusted, field by field.
 * @param ctx          the action's own two-step status for this session (`checkAdminTotp`).
 */
export async function switchInvitePayable(
  viewerUserId: string | null | undefined,
  input: InvitePayableInput,
  ctx: InvitePayableContext,
): Promise<InvitePayableResult> {
  const post: Record<string, unknown> = input && typeof input === "object" ? (input as unknown as Record<string, unknown>) : {};
  const toRaw = post.to;
  const to: InvitePayableInput["to"] | null = toRaw === "PAYABLE" || toRaw === "NOT_PAYABLE" ? toRaw : null;
  const auditAction = to === "PAYABLE" ? "affiliate.payable.on" : to === "NOT_PAYABLE" ? "affiliate.payable.off" : "affiliate.payable.switch";
  const refused = to === "PAYABLE" ? COPY.refusedOn : to === "NOT_PAYABLE" ? COPY.refusedOff : COPY.refusedAny;

  // (1) THE OWNER — on the STORED row. ⭐ No session at all is a session that ENDED (an Owner whose
  // cookie expired while the dialog was open), not an escalation: said so, and no SECURITY row.
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return { ok: false, error: COPY.sessionEnded };
  const actorId: string = viewerUserId;
  let role: string | null;
  try {
    role = (await db.user.findById(actorId))?.role ?? null;
  } catch {
    return { ok: false, error: COPY.whoUnknown };
  }
  if (role !== "ADMIN") {
    void audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId,
      targetType: "Action",
      targetId: auditAction,
      payload: { role: role ?? "unknown", ownerOnly: true, action: auditAction },
    });
    return { ok: false, error: refused };
  }

  // (2) THE CONSOLE'S TWO-STEP STATUS for this session. ⭐ "ok" when `DISABLE_ADMIN_TOTP=true`.
  if (ctx?.totp !== "ok") return { ok: false, error: ctx?.totp === "not-enrolled" ? COPY.totpNotEnrolled : COPY.totpUnverified };
  if (!to) return { ok: false, error: COPY.notUnderstood };

  // (3) THE REASON — CLEANED (every invisible character out, then trimmed), bounded, stored as cleaned:
  // five zero-width spaces are not a reason (review, 2026-09-26).
  const reason = cleanReason(post.reason);
  if (reason.length < INVITE_REASON_MIN) return { ok: false, error: COPY.reasonShort, field: "reason" };
  if (reason.length > INVITE_REASON_MAX) return { ok: false, error: COPY.reasonLong, field: "reason" };

  // (4) ON ONLY — the ceiling, the words, what pays from now.
  const { ceiling, source } = inviteRewardsCeiling();
  let start: InvitePayableStart | null = null;
  if (to === "PAYABLE") {
    if (ceiling === "FORCED") return { ok: false, error: COPY.forced };
    if (ceiling !== "OWNER") return { ok: false, error: source === "ENV" ? COPY.closedEnv : COPY.closedCode };
    /* ⛔ COMPARED EXACTLY, AFTER TRIMMING AND NOTHING ELSE. Case-folding would let "make payable" arm a
       control whose whole purpose is that it cannot be armed by habit. */
    if ((typeof post.typed === "string" ? post.typed.trim() : "") !== INVITE_PAYABLE_WORD) {
      return { ok: false, error: COPY.wordWrong, field: "typed" };
    }
    const startRaw = post.start;
    if (startRaw !== "NOTHING" && startRaw !== "AS_SHOWN") return { ok: false, error: COPY.startMissing, field: "start" };
    start = startRaw;
    /* ⚠️ The price the Owner saw is checked ONCE, under the lock, against the settings RE-READ from their
       row there — not here against this container's cache, which may be the stale copy it booted with. */
  }
  const expectSeq = post.expectSeq;
  if (typeof expectSeq !== "number" || !Number.isSafeInteger(expectSeq) || expectSeq < 0) {
    return { ok: false, error: COPY.seqStale, field: "seq" };
  }

  // (5) UNDER THE LOCK.
  /* ⛔ EVERY OUTCOME IS READ, NEVER INFERRED, AND NO WRITE BEGINS UNRECORDED (review P4/P5, 2026-09-26).
     · Before the first write, a COMPLIANCE `affiliate.payable.attempt` row names who, which way, why and the
       record number; if it cannot be written, nothing is written and the Owner is told so.
     · After the writes, the switch and the settings are RE-READ, and the answer is what they say — so a
       re-arm from "paused at service level" (the stored record already ON), where the settings write alone
       makes invites payable, is reported and audited as the act even when the switch's own record fails.
     · If the outcome cannot be read, or anything throws once a write has begun — a lock timeout included —
       the Owner is told "Outcome unknown — reload to see the current state", never "Nothing changed", and
       the COMPLIANCE row is written with `confirmed: false`. */
  type Landed =
    | { changed: false; note: string }
    | { changed: true; from: "PAYABLE" | "NOT_PAYABLE"; storedFrom: "PAYABLE" | "NOT_PAYABLE"; seq: number; price: InviteRewardsPrice | null; rearmed: boolean; recordUpdated: boolean; payableAfter: boolean; note: string | null; warn: boolean };
  type Unknown = { unknown: true };
  /** What the locked act got to — read by the catch below, which runs outside it. */
  const act: { writesBegan: boolean; attemptSeq: number; landed: Landed | null } = { writesBegan: false, attemptSeq: 0, landed: null };
  const lockedAct = async (): Promise<InvitePayableResult | Landed | Unknown> => {
    const fresh: StoredSwitch = await readStoredSwitchFresh();
    if (fresh.kind === "UNREAD") return { ok: false, error: COPY.unread };
    const currentSeq = fresh.kind === "SET" ? fresh.seq : 0;
    if (expectSeq !== currentSeq) return { ok: false, error: COPY.seqStale, field: "seq" };
    const storedOn = fresh.kind === "SET" && fresh.payable === true;
    /* ⛔ MAKE PAYABLE READS THE REWARD SETTINGS FROM THEIR ROW FIRST. The config write below merges onto
       this container's cache and writes the WHOLE object back, and a container that booted before the
       last Save holds a stale copy: "the settings on this page" would re-arm what it remembers, and
       "Nothing yet" would put old amounts back. A row that cannot be read refuses — nothing changes.
       ⛔ Stop paying never waits on this read: the safe direction must not depend on the config. */
    if (to === "PAYABLE") {
      const cfgRow = await reloadAffiliateConfig();
      if (!cfgRow.ok) return { ok: false, error: COPY.configUnread };
    }
    const cfgBefore = getAffiliateConfig();
    const from = composeInvitePayable(ceiling, fresh) && cfgBefore.enabled === true ? "PAYABLE" : "NOT_PAYABLE";
    const record = { seq: currentSeq + 1, changedAt: new Date().toISOString(), changedBy: actorId, reason };

    if (to === "PAYABLE") {
      if (storedOn && cfgBefore.enabled === true) return { changed: false, note: COPY.alreadyOn };
      // The config the Owner saw priced must still be the config — re-checked under the lock.
      if (start === "AS_SHOWN" && post.pricedFingerprint !== affiliateConfigFingerprint(cfgBefore)) {
        return { ok: false, error: COPY.priceStale, field: "start" };
      }
      act.attemptSeq = record.seq;
      if (!(await recordAttempt(actorId, { to, reason, seq: record.seq, ceiling, start, rearm: storedOn }))) return { ok: false, error: COPY.attemptUnrecorded };
      act.writesBegan = true;
      /* ⛔ ALWAYS WRITTEN, EVEN WHEN NOTHING WOULD CHANGE: the verified write is also the HYDRATION gate.
         A container whose `affiliate.config` never loaded holds the shipped defaults (the prize ON), and
         `setVerified` refuses there — so the switch cannot go on over settings nobody stored.
         ⚠️ With the stored record already ON (a re-arm from "paused at service level") THIS write is the
         act: it alone makes invites payable, whatever then happens to the switch's own record. */
      const cfgWrite = await setAffiliateConfigVerified(start === "NOTHING" ? ALL_MODES_OFF : { enabled: true }, actorId);
      const written = cfgWrite.ok ? await writeStoredSwitchVerified({ ...record, payable: true }) : null;
      const after = await readPayableOutcome(ceiling, true);
      if (!after.known) return { unknown: true };
      const price = after.payable ? priceInviteRewards(after.config, { destination: referralRewardDestination(), rosterRecruitsPerInviter: [], armed: true }) : null;
      if (after.payable) {
        const recordUpdated = written?.ok === true;
        const note = start === "NOTHING" ? COPY.onNothing : storedOn ? (recordUpdated ? COPY.rearmed : COPY.rearmedNoRecord) : null;
        const landedOn: Landed = { changed: true, from, storedFrom: storedOn ? "PAYABLE" : "NOT_PAYABLE", seq: recordUpdated ? record.seq : after.seq, price, rearmed: storedOn, recordUpdated, payableAfter: true, note, warn: !recordUpdated };
        act.landed = landedOn;
        return landedOn;
      }
      // Read back Not payable: nothing that pays changed, and the Owner is told exactly that.
      if (!cfgWrite.ok) return { ok: false, error: `${cfgWrite.error} Invites are still Not payable.` };
      return { ok: false, error: start === "NOTHING" ? COPY.notStoredNothing : COPY.notStored };
    }

    // OFF — the config is untouched: it stays as it was, and locked. ⛔ Its outcome is read from the SWITCH
    // alone: stopping payment must never depend on reading the settings.
    if (!storedOn) return { changed: false, note: COPY.alreadyOff };
    act.attemptSeq = record.seq;
    if (!(await recordAttempt(actorId, { to, reason, seq: record.seq, ceiling, start: null, rearm: false }))) return { ok: false, error: COPY.attemptUnrecorded };
    act.writesBegan = true;
    const written = await writeStoredSwitchVerified({ ...record, payable: false });
    const after = await readPayableOutcome(ceiling, false);
    if (!after.known) return { unknown: true };
    if (after.storedPayable) return { ok: false, error: COPY.notStoredOff };
    const landedOff: Landed = { changed: true, from, storedFrom: "PAYABLE", seq: written.ok ? record.seq : after.seq, price: null, rearmed: false, recordUpdated: written.ok, payableAfter: after.payable, note: null, warn: false };
    act.landed = landedOff;
    return landedOff;
  };

  let inLock: InvitePayableResult | Landed | Unknown;
  try {
    inLock = await withLock(INVITE_SWITCH_LOCK, lockedAct);
  } catch (err) {
    /* A throw from the lock — a timeout, a failed commit. If the act finished and was READ BACK it stands;
       if a write had begun and nothing was read back, the outcome is unknown; if no write began, the
       action's own catch says "Nothing changed", which is then true. */
    if (act.landed) inLock = act.landed;
    else if (act.writesBegan) inLock = { unknown: true };
    else throw err;
  }

  if ("ok" in inLock) return inLock;
  if ("unknown" in inLock) {
    await recordOutcome(actorId, to === "PAYABLE" ? "affiliate.payable.on" : "affiliate.payable.off", { to, reason, seq: act.attemptSeq, ceiling, start, confirmed: false, outcome: "unknown" });
    return { ok: false, error: COPY.outcomeUnknown };
  }
  if (!inLock.changed) {
    const payableNow = (await playerInvitePayableNow()) && getAffiliateConfig().enabled === true;
    return { ok: true, payable: payableNow, changed: false, note: inLock.note, warn: false, recorded: true };
  }

  // (6) THE COMPLIANCE ROW — after the lock. ⛔ The act has LANDED and been READ BACK by this line, so a
  // failed record is a WARNING beside a true outcome, never a failure (the desk's replan ruling 543).
  const recorded = await recordOutcome(actorId, to === "PAYABLE" ? "affiliate.payable.on" : "affiliate.payable.off", {
    from: inLock.from,
    /* The STORED position before the act — under the hard kill or the service-level pause it differs from
       `from` (what was in effect), and a Stop there changes the record, not the payment. */
    storedFrom: inLock.storedFrom,
    to,
    reason,
    seq: inLock.seq,
    ceiling,
    start,
    confirmed: true,
    ...(inLock.rearmed ? { rearmed: true, note: "re-armed from service-level pause", recordUpdated: inLock.recordUpdated } : {}),
    price: inLock.price ? { destination: inLock.price.destination, lines: inLock.price.lines, nothingPays: inLock.price.nothingPays } : null,
  });

  if (to === "PAYABLE") {
    const note = [inLock.note, recorded ? null : COPY.notRecorded].filter(Boolean).join(" ") || null;
    return { ok: true, payable: inLock.payableAfter, changed: true, note, warn: inLock.warn || !recorded, recorded };
  }
  const forcedStill = ceiling === "FORCED";
  const offNote = [forcedStill ? COPY.offForced : ceiling === "CLOSED" ? COPY.offKilled : null, recorded ? null : COPY.notRecorded].filter(Boolean).join(" ") || null;
  return { ok: true, payable: inLock.payableAfter, changed: true, note: offNote, warn: forcedStill || !recorded, recorded };
}

/** ⛔ THE ATTEMPT, ON RECORD BEFORE ANY WRITE (review P5). False when the row is not on file — then nothing
 *  is written either. ⚠️ It reads `recorded` (replan ruling 543): `audit()` never rejects — a database that
 *  refuses the row leaves it in this container's memory only (PERSIST_FAILED), and an entry that cannot be
 *  signed is written nowhere (UNSIGNED), and both RESOLVE — so only `recorded` can hold the act back. */
async function recordAttempt(actorId: string, payload: Record<string, unknown>): Promise<boolean> {
  const attemptRow = await audit({ category: "COMPLIANCE", action: "affiliate.payable.attempt", actorId, targetType: "InviteRewardsSwitch", targetId: INVITE_SWITCH_KEY, payload });
  if (attemptRow.recorded) return true;
  console.error(`[invite-rewards] the attempt row was not recorded (${attemptRow.unrecorded}) — nothing was changed`);
  return false;
}

/** The act's COMPLIANCE row — `confirmed: true` once read back, `confirmed: false` when the outcome is
 *  unknown. False when the row itself could not be written. */
async function recordOutcome(actorId: string, action: "affiliate.payable.on" | "affiliate.payable.off", payload: Record<string, unknown>): Promise<boolean> {
  const outcomeRow = await audit({ category: "COMPLIANCE", action, actorId, targetType: "InviteRewardsSwitch", targetId: INVITE_SWITCH_KEY, payload });
  if (outcomeRow.recorded) return true;
  console.error(`[invite-rewards] the compliance row was not recorded (${outcomeRow.unrecorded})`);
  return false;
}

/**
 * ⛔ WHAT ACTUALLY HOLDS NOW — the switch re-read and, for an ON, the settings re-read. `known: false` when
 * either read fails: the caller then says "outcome unknown", never a guess.
 */
async function readPayableOutcome(
  ceiling: ReturnType<typeof inviteRewardsCeiling>["ceiling"],
  withSettings: boolean,
): Promise<{ known: true; payable: boolean; storedPayable: boolean; seq: number; config: AffiliateConfig } | { known: false }> {
  try {
    const stored = await readStoredSwitchFresh();
    if (stored.kind === "UNREAD") return { known: false };
    let config = getAffiliateConfig();
    if (withSettings) {
      const row = await reloadAffiliateConfig();
      if (!row.ok) return { known: false };
      config = row.config;
    }
    return {
      known: true,
      payable: composeInvitePayable(ceiling, stored) && config.enabled === true,
      storedPayable: stored.kind === "SET" && stored.payable === true,
      seq: stored.kind === "SET" ? stored.seq : 0,
      config,
    };
  } catch {
    return { known: false };
  }
}

/**
 * ⭐ THE ONE SAVE FOR THE REWARD SETTINGS — the console's only config writer.
 *
 * ⛔ LOCKED WHILE NOT PAYABLE, decided on a FRESH read of the ROW under the switch's lock, so a Save
 * cannot land in the gap between a Stop paying and the page noticing — in this container or another.
 * `readStoredSwitchFresh`, not the screens' read: that one may share a read which started before the
 * Stop paying landed. "Not payable" here is the page's own state: the switch composed under the
 * ceiling AND the service-level pause off. A row that cannot be read is Not payable, so it refuses.
 * ⛔ `enabled` IS DROPPED FROM THE POST. The two states are the master now; a Save never pauses or
 * re-arms the programme, whatever a crafted form sends.
 * 🔴 AND NO SAVE WRITES OVER A CHANGE IT NEVER SAW (review P3/P3b, 2026-09-26). The page used to post every
 * mode from its page-load draft, so an older tab — or a page rendered on a stale container — re-armed a
 * prize the Owner had switched off minutes earlier. Now the post carries the FINGERPRINT of the settings
 * the page loaded (`baseFingerprint`) and ONLY the fields the officer changed (`changes`): under the lock
 * the row is re-read, a different fingerprint is refused ("These settings changed since this page loaded —
 * reload to see them."), and otherwise only the posted changes are merged onto the row.
 * The staff check is the caller's (`softRequireStaff("growth", …)` in the action).
 */
export async function saveInviteRewardSettings(
  input: InviteRewardSettingsSave,
  officerId: string,
): Promise<{ ok: true; config: AffiliateConfig; warning?: string } | { ok: false; error: string }> {
  const post: Record<string, unknown> = input && typeof input === "object" && !Array.isArray(input) ? (input as unknown as Record<string, unknown>) : {};
  const baseFingerprint = typeof post.baseFingerprint === "string" ? post.baseFingerprint : "";
  const updates = post.changes as AffiliateConfigUpdate | undefined;
  if (baseFingerprint === "" || !updates || typeof updates !== "object" || Array.isArray(updates)) return { ok: false, error: COPY.saveNotUnderstood };
  /** The row the Save merged onto, as read under the lock — the "before" of the terms record below.
   *  `writeBegan`: the verified write was called, so a throw from here on may have landed it. */
  const seen: { before: AffiliateConfig | null; writeBegan: boolean } = { before: null, writeBegan: false };
  /* ⛔ A THROW AFTER THE WRITE BEGAN IS NOT "NOTHING WAS SAVED". The lock can fail on its way out (the
     commit, the release) after the row is already written; the action's catch would then tell the officer
     nothing was saved while the new terms pay. Before the write, a throw is still a clean refusal (the
     action's own sentence); after it, the answer is the ceremony's: the outcome is unknown — reload. */
  const saved = await withLock(INVITE_SWITCH_LOCK, async (): Promise<{ ok: true; config: AffiliateConfig } | { ok: false; error: string }> => {
    const settingsPayable = composeInvitePayable(inviteRewardsCeiling().ceiling, await readStoredSwitchFresh());
    if (!settingsPayable) return { ok: false, error: COPY.locked };
    /* ⛔ AND THE SAVE MERGES ONTO THE ROW, NOT ONTO THIS CONTAINER'S BOOT-TIME COPY (the verified write
       writes the whole object back). Read only now that the switch pays; a row that cannot be read saves
       nothing, and a row that says the programme is paused keeps the settings locked — the page's own
       "Not payable · paused at service level", decided on the row rather than on this container's copy. */
    const rowNow = await reloadAffiliateConfig();
    if (!rowNow.ok) return { ok: false, error: COPY.saveConfigUnread };
    if (rowNow.config.enabled !== true) return { ok: false, error: COPY.locked };
    if (affiliateConfigFingerprint(rowNow.config) !== baseFingerprint) return { ok: false, error: COPY.settingsMoved };
    seen.before = rowNow.config;
    const { enabled: _dropped, ...rewards } = updates;
    void _dropped;
    seen.writeBegan = true;
    return setAffiliateConfigVerified(rewards, officerId);
  }).catch((err: unknown): { ok: false; error: string } => {
    if (!seen.writeBegan) throw err;
    console.error("[invite-rewards] the reward Save threw after its write began:", errMessage(err));
    return { ok: false, error: COPY.outcomeUnknown };
  });
  if (!saved.ok || !seen.before) return saved;
  /* ⛔ A SAVE THAT RAISES WHAT THE INVITE PAYS IS A COMPLIANCE EVENT, NOT ONLY AN ADMIN ONE (addendum B,
     2026-09-26). Every Save lands while invites are Payable, so arming a mode, raising a rate, an amount or
     the window, or loosening a cap changes what 50pick pays from the next event on — beside the ADMIN
     `affiliate.config.updated` row (`setVerified`) it writes a COMPLIANCE `affiliate.reward.terms` row:
     every money field moved, before → after, and who. Who MAY save is unchanged. Written after the lock and
     after the read-back, so it records what landed; a row that cannot be written is a warning beside a
     true "Saved", never a failure. */
  const terms = rewardTermsRaised(seen.before, saved.config);
  if (terms.raised.length === 0) return saved;
  const termsRow = await audit({
    category: "COMPLIANCE",
    action: "affiliate.reward.terms",
    actorId: officerId,
    targetType: "AffiliateConfig",
    targetId: "global",
    payload: { changes: terms.changes, raised: terms.raised, by: officerId },
  });
  if (termsRow.recorded) return saved;
  console.error(`[invite-rewards] the reward-terms compliance row was not recorded (${termsRow.unrecorded})`);
  return { ...saved, warning: COPY.termsNotRecorded };
}

// ── THE WORDS — every sentence the state card and both dialogs paint, built here ──────────────────────

/** One dialog. `word` and `start` are null on the way to Not payable — a stop is the safe direction. */
export type InvitePayableDialog = {
  to: "PAYABLE" | "NOT_PAYABLE";
  /** The button that opens it: "Make payable…" / "Stop paying…". */
  trigger: string;
  title: string;
  /** Paragraphs, in order. */
  body: string[];
  /** ON only: the regulated-inducement line, shown as a warning. */
  regulated: string | null;
  /** ON only: "What pays from now". `defaultChoice` is always NOTHING. */
  start: null | {
    legend: string;
    defaultChoice: "NOTHING";
    nothing: { value: "NOTHING"; label: string; hint: string };
    asShown: { value: "AS_SHOWN"; label: string; lines: string[]; nothingPays: boolean; exposure: string };
  };
  /** What happens from the moment of confirming, one sentence each. */
  effects: string[];
  reasonLabel: string;
  reasonHint: string;
  reasonCountLabel: string;
  reasonMin: number;
  reasonMax: number;
  /** ON only: the words to type, the field's label and placeholder. */
  word: string | null;
  wordLabel: string | null;
  wordPlaceholder: string | null;
  confirmLabel: string;
  cancelLabel: string;
  /** The toast titles when it lands, and when it does not. */
  doneTitle: string;
  failTitle: string;
  /** Post back as `expectSeq`. */
  expectSeq: number;
  /** ON only: post back as `pricedFingerprint` when the Owner picks AS_SHOWN. */
  pricedFingerprint: string | null;
};

/** The whole switch, painted: the state card, the lock, and whichever dialog this viewer may open. */
export type InvitePayableCopy = {
  state: "PAYABLE" | "NOT_PAYABLE";
  /** The header chip — ⛔ exactly one of two words, never a third. */
  chip: { label: "Payable" | "Not payable"; variant: "active" | "paused" };
  title: string;
  body: string;
  /** "Since … · who · “reason” · record #N", "Never switched on", or the unreadable/unread sentence. */
  provenance: string | null;
  /** The ceiling, the STORED position when the server overrides it, paused-at-service-level, a restored
   *  older record, unreadable settings, the viewer's role — each its own sentence. */
  notes: string[];
  /** Payable only: the priced summary. */
  priceHeadline: string | null;
  priceLines: string[];
  /** Always shown: the Gaming Board line and the enforced 50% ceiling. */
  regulated: string;
  /** Every reward setting read-only. */
  locked: boolean;
  lockedCaption: string | null;
  /** Where rewards land — for the client's live "This will pay" preview (`priceInviteRewards`). */
  destination: "CASH" | "BONUS";
  /** Owner only. `makePayable` while not paying under the OWNER ceiling; `stopPaying` whenever the STORED
   *  record says Payable, whatever the ceiling. ⭐ BOTH at once while paused at service level with the record
   *  ON — re-arm, or record Not payable — so the page renders both. */
  makePayable: InvitePayableDialog | null;
  stopPaying: InvitePayableDialog | null;
};

const REGULATED_LINE = "Rewarding referrals is a regulated inducement — the Gaming Board of Tanzania must clear this reward structure before it is paid. Commission ≤ 50% of margin is enforced.";

function provenanceFor(view: InvitePayableView): string | null {
  const s = view.stored;
  switch (s.kind) {
    case "SET": {
      let when = s.changedAt;
      try { when = formatDateTime(s.changedAt); } catch { /* the ISO string is still true */ }
      // ⭐ The record's number rides with it (review P1): it is what "older than its last recorded change" compares.
      return `Since ${when} · ${view.changedByLabel ?? "the Owner"} · “${s.reason}” · record #${s.seq}`;
    }
    case "ABSENT": return "Never switched on.";
    case "MALFORMED": return "Stored switch unreadable — treated as Not payable.";
    case "UNREAD": return "The stored switch could not be read just now — treated as Not payable. Reload to try again.";
    default: return null;
  }
}

/**
 * ⭐ EVERY WORD THE SWITCH PAINTS, BUILT ON THE SERVER — the client receives finished strings and
 * decides only WHEN (the desk's `switchDialogFor`, same reason).
 *
 * @param view        `invitePayableView(viewerUserId)` — fresh, with the viewer's stored role.
 * @param price       `priceInviteRewards(cfg, { destination, rosterRecruitsPerInviter, armed: true })` —
 *                    ⚠️ ARMED, so the dialog prices what Make payable would switch on even while the
 *                    service-level pause is set. The Payable card shows the same lines.
 * @param fingerprint `affiliateConfigFingerprint(cfg)` of the SAME config.
 * @param opts        `settingsUnread` — the page could not re-read the settings from their row and shows
 *                    this container's copy; said on the card.
 */
export function invitePayableDialogs(view: InvitePayableView, price: InviteRewardsPrice, fingerprint: string, opts: { settingsUnread?: boolean } = {}): InvitePayableCopy {
  const paying = view.paying;
  const lands = price.destination === "CASH" ? "as CASH" : "as bonus-wallet credit";
  const notes: string[] = [];
  const stopper = view.viewerIsOwner ? "you stop" : "the Owner stops";

  if (view.ceiling === "CLOSED") notes.push(view.ceilingSource === "ENV" ? COPY.closedEnv : COPY.closedCode);
  if (view.ceiling === "FORCED") notes.push(COPY.forced);
  /* ⛔ THE STORED POSITION, WHENEVER THE SERVER OVERRIDES IT (review P7, 2026-09-26). Under the hard kill a
     stored Payable pays nothing today and pays again the moment the setting is removed — a page that showed
     only "Not payable" hid the one fact that decides what lifting the kill does. */
  if (view.ceiling === "CLOSED" && view.storedPayable) {
    notes.push(view.ceilingSource === "ENV"
      ? `Stored: Payable — suspended by the server (FEATURE_INVITEREWARDS=WITHDRAWN). Removing that setting resumes payment unless ${stopper} it here.`
      : `Stored: Payable — suspended in the server's code. Lifting that resumes payment unless ${stopper} it here.`);
  }
  if (view.ceiling === "FORCED") {
    notes.push(view.storedPayable
      ? "Stored: Payable — removing the server's setting keeps invites payable."
      : "Stored: Not payable — removing the server's setting stops payment.");
  }
  if (view.payable && !view.configEnabled) {
    notes.push(view.ceiling === "FORCED"
      ? "Paused at service level — the server forces payment on, but the programme is paused, so nothing is paid."
      : view.viewerIsOwner
        ? "Paused at service level — the switch says Payable but the programme is paused, so nothing is paid. Make payable re-arms it."
        : "Paused at service level — the switch says Payable but the programme is paused, so nothing is paid.");
  }
  /* ⛔ A RESTORED OLDER RECORD (review P1): the seal proves who wrote a record, not that it is the latest. */
  if (view.recordOlderThanLog) {
    notes.push(`The stored switch is older than its last recorded change (record #${view.seq} is stored; #${view.lastRecordedSeq ?? "?"} was recorded). An older copy may have been restored — check the database, then set the switch again.`);
  }
  if (opts.settingsUnread) notes.push("The reward settings could not be re-read just now — this page shows this server's last copy. Reload to try again.");
  if (!view.viewerIsOwner && view.ceiling === "OWNER") {
    notes.push(paying
      ? "You can change the amounts; only the Owner can stop payment."
      : "Only the Owner can make invites payable, after Gaming Board clearance.");
  }

  const reasonBase = { reasonCountLabel: "characters left", reasonMin: INVITE_REASON_MIN, reasonMax: INVITE_REASON_MAX, cancelLabel: "Cancel", expectSeq: view.seq };

  const makePayable: InvitePayableDialog | null = view.viewerIsOwner && view.ceiling === "OWNER" && !paying ? {
    ...reasonBase,
    to: "PAYABLE",
    trigger: "Make payable…",
    title: "Make invites payable",
    body: ["From the moment you confirm, 50pick pays referrers with its own money."],
    regulated: "⚖ Regulated inducement: confirm only if the Gaming Board of Tanzania has cleared this structure.",
    start: {
      legend: "What pays from now",
      defaultChoice: "NOTHING",
      nothing: {
        value: "NOTHING",
        label: "Nothing yet — switch every reward off; I will set them below and Save",
        hint: "Invites become payable with every reward off. Nothing is paid until a reward is switched on and saved.",
      },
      asShown: {
        value: "AS_SHOWN",
        label: price.nothingPays ? "The settings on this page: no reward is switched on — nothing would be paid." : "The settings on this page:",
        lines: price.lines,
        nothingPays: price.nothingPays,
        exposure: price.exposureLine,
      },
    },
    effects: [
      /* ⛔ "WITHDRAWABLE AT ONCE" WAS NOT TRUE (addendum H): a player's first withdrawal still waits on their
         identity check — KYC is asked at withdrawal. */
      price.destination === "CASH"
        ? "Every reward to an inviter and to a new player lands as withdrawable CASH — the bonus wallet is withdrawn, so there is no wagering and no expiry — and a player's first withdrawal still needs their identity check (KYC at withdrawal)."
        : "Every reward to an inviter and to a new player lands in the bonus wallet, under its wagering rules.",
      "A player on a cooling-off break, or with a frozen wallet, is held, not paid.",
      "Everyone already in the roster earns on their friends' NEXT bet or settlement — never on a deposit; commission windows run from each friend's invite date; nothing is back-paid.",
    ],
    reasonLabel: "Why are you making invites payable? (required)",
    reasonHint: "Kept with the change, in the compliance record, and shown on this page.",
    word: INVITE_PAYABLE_WORD,
    wordLabel: `Type ${INVITE_PAYABLE_WORD} to confirm`,
    wordPlaceholder: INVITE_PAYABLE_WORD,
    confirmLabel: "Make payable",
    doneTitle: "Invites are payable · Zinalipwa",
    failTitle: "Invites were not made payable",
    pricedFingerprint: fingerprint,
  } : null;

  /* ⛔ OFFERED WHENEVER THE STORED RECORD SAYS PAYABLE, WHATEVER THE CEILING (review P7 / addendum C): under the
     hard kill, and while paused at service level, a stored Payable is a payment waiting to resume — the Owner
     must be able to record Not payable there too. The first paragraph says what confirming changes in THAT
     state; the in-lock recheck on the payers is why "a reward already being paid" can still land. */
  const stopFirst = view.ceiling === "CLOSED"
    ? "Nothing is paid now — the server has suspended payment. Stopping here records Not payable, so lifting that suspension does not resume payment."
    : view.ceiling === "FORCED"
      ? "The server forces payment on (FEATURE_INVITEREWARDS=ACTIVE), so payment continues until that setting is removed. Stopping here records Not payable for when it is."
      : !view.configEnabled
        ? "Nothing is paid now — the programme is paused at service level. Stopping here records Not payable, so nothing pays again until invites are made payable once more."
        : COPY.stopStarts;
  const stopPaying: InvitePayableDialog | null = view.viewerIsOwner && view.storedPayable ? {
    ...reasonBase,
    to: "NOT_PAYABLE",
    trigger: "Stop paying…",
    title: "Stop paying for invites",
    body: [stopFirst, "Paid rewards stay paid; the settings are kept, and locked."],
    regulated: null,
    start: null,
    effects: [],
    reasonLabel: "Why are you stopping payment? (required)",
    reasonHint: "Kept with the change and shown on this page.",
    word: null,
    wordLabel: null,
    wordPlaceholder: null,
    confirmLabel: "Stop paying",
    doneTitle: "Invites are Not payable · Hazilipwi",
    failTitle: "Payment was not stopped",
    pricedFingerprint: null,
  } : null;

  return {
    state: paying ? "PAYABLE" : "NOT_PAYABLE",
    chip: paying ? { label: "Payable", variant: "active" } : { label: "Not payable", variant: "paused" },
    title: paying ? "Payable · Zinalipwa" : "Not payable · Hazilipwi",
    body: paying
      ? `50pick pays the rewards switched on below, ${lands}, from each qualifying event.`
      : "Invites are tracked; 50pick pays nothing. Every reward setting below is locked.",
    provenance: provenanceFor(view),
    notes,
    priceHeadline: paying ? price.headline : null,
    priceLines: paying ? price.lines : [],
    regulated: REGULATED_LINE,
    locked: !paying,
    lockedCaption: paying ? null : "Locked — Not payable",
    destination: price.destination,
    makePayable,
    stopPaying,
  };
}
