import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMessagingConsent, StoredUser } from "@/lib/server/store";
import {
  detectHarmMarkers,
  selfExclusionStandingOf,
  SELF_EXCLUSION_PERIODS_SEC,
} from "@/lib/server/responsible-gambling";
import type { HarmFlag } from "@/lib/server/responsible-gambling";
import { getAuditForTargetsDurable } from "@/lib/server/audit";

/**
 * U10 · THE MARKETING RG PREDICATE — a STANDING, never a lockout (D9, OD12, OD13).
 *
 * 🔴 WHY IT EXISTS. `isLockedOut` answers "may this player bet RIGHT NOW?" and lifts itself the moment
 * the chosen period elapses — correct for betting, and exactly wrong for marketing: a player who
 * self-excluded for 24 hours would be marketable 25 hours later, and one who took a one-hour break
 * would be sent a promotion the minute it ended. ⭐ The rule this file is built on: THE PERIOD ENDING
 * IS NOT THE PERSON ASKING. Only a positive act by the player lifts a marketing refusal.
 *
 * ⛔ IT READS AND NEVER WRITES. It is asked once per recipient (§3c: up to 150,000 per campaign), and
 * also by every count an officer is shown before a campaign exists. So:
 *   · the RG row is read with `db.responsible.get` — ⛔ never `getRgSettings`, `selfExclusionStanding`
 *     or `isLockedOut`, which CREATE a row for a user who has none and REWRITE one whose pending limit
 *     change has come due (`effectivize`). U7's gate guarded only the first of those two writes;
 *   · harm markers are detected with NO options, because the session-overrun detector is the one
 *     path in `detectHarmMarkers` that reaches `getRgSettings`;
 *   · a refusal is RETURNED, never audited here. The audit line belongs to the send loop, when a
 *     refusal is acted on (`dispatch.ts`, U9) — an audience count must not write to the chain.
 *
 * THE ORDER IS §5.6's — self-exclusion → cooling-off → harm markers — and the caller asks consent
 * first, so the one expensive step (harm markers read up to 10,000 transactions) runs only for a
 * player who has already said yes.
 *
 * ⛔ `isLockedOut` is not modified and not called (OD12, §6). `push-service` and `watchlist-service` still
 * call it, and since S7 (D10, on Ali's delegation of 2026-09-26) each also refuses a SELF_EXCLUDED account
 * whatever the timer says — the lift no longer reaches either door.
 */

export type MarketingRgSkipReason = "rg_self_excluded" | "rg_cooling_off" | "rg_harm_marker";

export type MarketingRgStanding =
  /** `coolingOffEnded` — a break is on record, it has ended, AND the player consented again after it.
   *  Only then may an account whose status still reads COOLED_OFF (nothing ever clears it) be marketed. */
  | { ok: true; coolingOffEnded: boolean }
  | { ok: false; skipReason: MarketingRgSkipReason; detail: string; until: string | null };

/** What the audit chain proves about the account's self-exclusions — the only durable record of WHEN an
 *  officer reopened one: `restorePlayerAction` writes no column, only this action. */
export type ExclusionRecord = { restoredAt: string | null; lastActivatedAt: string | null };

export type MarketingRgDeps = {
  harmFlags: (userId: string) => Promise<HarmFlag[]>;
  exclusionRecord: (userId: string) => Promise<ExclusionRecord>;
};

export const RG_RESTORE_ACTION = "rg.self_exclusion.reopened";
export const RG_ACTIVATE_ACTION = "rg.self_exclusion.activated";

async function readExclusionRecord(userId: string): Promise<ExclusionRecord> {
  const { entries } = await getAuditForTargetsDurable({
    targetType: "User",
    targetIds: [userId],
    actions: [RG_RESTORE_ACTION, RG_ACTIVATE_ACTION],
    sinceIso: "1970-01-01T00:00:00.000Z",
    limit: 200,
  });
  // Newest first, in both the durable read and the ring.
  return {
    restoredAt: entries.find((e) => e.action === RG_RESTORE_ACTION)?.createdAt ?? null,
    lastActivatedAt: entries.find((e) => e.action === RG_ACTIVATE_ACTION)?.createdAt ?? null,
  };
}

export const MARKETING_RG_DEPS: MarketingRgDeps = {
  // ⛔ NO OPTIONS. Passing `sessionStartedAt` switches on the one detector that calls `getRgSettings`.
  harmFlags: (userId) => detectHarmMarkers(userId),
  exclusionRecord: readExclusionRecord,
};

/**
 * ⭐ GN 478T reg 48(3): a self-exclusion lasts AT LEAST six months, whatever period was chosen.
 * Six CALENDAR months and never fewer than 182 days — the platform's "6m" period is 182 days, which is
 * shorter than some calendar half-years (1 Mar → 1 Sep is 184), so neither alone is safe. A month
 * overflow (31 Aug + 6 → 3 Mar) rolls FORWARD, which errs the safe way.
 */
export function sixMonthFloor(startIso: string): number {
  const start = Date.parse(startIso);
  const calendar = new Date(start);
  calendar.setUTCMonth(calendar.getUTCMonth() + 6);
  return Math.max(calendar.getTime(), start + SELF_EXCLUSION_PERIODS_SEC["6m"] * 1000);
}

const refuse = (skipReason: MarketingRgSkipReason, detail: string, until: string | null): MarketingRgStanding =>
  ({ ok: false, skipReason, detail, until });

export async function marketingRgStanding(
  user: Pick<StoredUser, "id" | "status">,
  identifier: string,
  now: number = Date.now(),
  deps: MarketingRgDeps = MARKETING_RG_DEPS,
): Promise<MarketingRgStanding> {
  const row = await Promise.resolve(db.responsible.get(user.id));
  const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };

  // "Did the player say yes AFTER this date?" — the one positive act that lifts a refusal. ⛔ The
  // LATEST ledger row decides, not any GIVEN row after the date: a yes followed by a no is a no.
  let latest: StoredMessagingConsent | null | undefined;
  const consentedSince = async (iso: string): Promise<boolean> => {
    if (latest === undefined) latest = await Promise.resolve(db.messagingConsent.latestFor(key));
    return latest !== null && latest.status === "GIVEN" && Date.parse(latest.createdAt) > Date.parse(iso);
  };

  // ── 1 · SELF-EXCLUSION (GN 478T reg 49(3); OD12; OQ7's built default) ──────────────────────────
  const se = selfExclusionStandingOf(row?.selfExclusionUntil ?? null, now);
  // ⭐ The status is itself standing evidence: SELF_EXCLUDED means no officer has reopened the account,
  // whatever the timer says — including a row whose end date is missing or unreadable.
  if (user.status === "SELF_EXCLUDED") {
    return refuse("rg_self_excluded", `account is SELF_EXCLUDED (standing: ${se.state})`, row?.selfExclusionUntil ?? null);
  }
  if (se.state === "serving") {
    return refuse("rg_self_excluded", se.permanent ? "permanent self-exclusion" : `self-exclusion serving until ${se.until}`, se.until);
  }
  if (se.state === "minimum_served") {
    // The period is over and the account reads as open. Three things must ALL hold before marketing
    // may resume, and each is checked against a record rather than inferred:
    const rec = await deps.exclusionRecord(user.id);
    const restoredAfterExclusion = rec.restoredAt !== null
      && (rec.lastActivatedAt === null || Date.parse(rec.restoredAt) > Date.parse(rec.lastActivatedAt));
    // ① an officer reopened THIS exclusion — a status that reads open with no restore on record is a
    //    divergence, and a divergence refuses;
    if (!restoredAfterExclusion) {
      return refuse("rg_self_excluded", `minimum served on ${se.until}, and no officer restore on record after it`, se.until);
    }
    // ② six months have passed since it began (reg 48(3)). The start is the last activation on record;
    //    without one it is the END date, the latest the exclusion can have begun — the safe direction;
    const floorMs = sixMonthFloor(rec.lastActivatedAt ?? se.until);
    if (now < floorMs) {
      return refuse("rg_self_excluded", `inside the six-month minimum (GN 478T reg 48(3)) until ${new Date(floorMs).toISOString()}`, new Date(floorMs).toISOString());
    }
    // ③ and the player said yes AFTER the restore (OD12). A consent older than the restore — the
    //    toggle left on through the exclusion, or an old opt-out link tapped while still excluded —
    //    is not the person asking to be marketed again.
    if (!(await consentedSince(rec.restoredAt as string))) {
      return refuse("rg_self_excluded", `restored on ${rec.restoredAt}, and no consent given since`, se.until);
    }
  }

  // ── 2 · COOLING-OFF (OD13) ─────────────────────────────────────────────────────────────────────
  // ⭐ RULED 2026-09-25 (S6, on Ali's delegation): a break is standing for marketing too. It ends by
  // itself for BETTING (market-service reads the timer, by design); for marketing it ends only when the
  // player consents again after it. `coolingOffUntil` is never cleared (`furthest` keeps the latest),
  // so this reads the last break on record.
  let coolingOffEnded = false;
  const co = row?.coolingOffUntil ?? null;
  if (co) {
    const coMs = Date.parse(co);
    if (Number.isNaN(coMs)) return refuse("rg_cooling_off", "the break's end date is unreadable, so it refuses", co);
    if (coMs > now) return refuse("rg_cooling_off", `on a break until ${co}`, co);
    if (!(await consentedSince(co))) return refuse("rg_cooling_off", `break ended on ${co}, and no consent given since`, co);
    coolingOffEnded = true;
  } else if (user.status === "COOLED_OFF") {
    return refuse("rg_cooling_off", "account is COOLED_OFF with no break on record (diverged), so it refuses", null);
  }

  // ── 3 · HARM MARKERS (OD13) ────────────────────────────────────────────────────────────────────
  // ⚠️ NOT STANDING, AND SAID SO: nothing persists a harm flag, so this refusal lasts as long as the
  // detector's window (≤ 8 days) and no longer. Making it standing needs a persisted, officer-reviewed
  // flag store, which does not exist — filed for Ali in the plan's §0, not invented here.
  // ⛔ A check that cannot be read REFUSES. `detectHarmMarkersForAllUsers` turns a failed read into
  // "no flags"; a marketing gate that copied that would market to exactly the player it could not assess.
  let flags: HarmFlag[];
  try {
    flags = await deps.harmFlags(user.id);
  } catch {
    return refuse("rg_harm_marker", "the harm-marker check could not be read, so it refuses", null);
  }
  if (flags.length > 0) {
    return refuse("rg_harm_marker", `harm markers: ${[...new Set(flags.map((f) => f.marker))].join(", ")}`, null);
  }

  return { ok: true, coolingOffEnded };
}
