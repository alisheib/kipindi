import { db } from "@/lib/server/store";
import type { MessagingKey } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { selfExclusionStanding } from "@/lib/server/responsible-gambling";

/**
 * U7 · THE ONE GATE. Nothing sends a marketing SMS without asking this first.
 *
 * ⭐ ITS ORDER IS THE LAW'S ORDER, NOT A CONVENIENCE (§5.6, OD11): suppression is asked
 * BEFORE consent. Somebody who said stop has said stop, and a stale consent row must never
 * out-argue that — which is exactly what happens if the two are swapped, because a withdrawn
 * person usually still has the consent row they gave you last year.
 *
 * ⛔ A CONTACT-BOOK ROW CAN NEVER OVERRIDE A PLAYER'S OWN "NO". When the number belongs to a
 * `User`, that user governs and the ledger is not consulted at all. An imported spreadsheet
 * cannot re-permit somebody who turned the toggle off (OD10).
 *
 * ⚠️ WHAT THIS UNIT DOES **NOT** DECIDE, so nobody reads a false completeness into it:
 * cooling-off and harm markers (U10), age (U11), the frequency cap (U14), the send window
 * (U13) and the Board's approval (U41) are separate gates in the loop. This one answers
 * suppression, consent, self-exclusion standing and account status.
 */

/** ⭐ Named, and each value is a `skipped` reason — never a failure (§5.6). A refusal is the
 *  system working. */
export type MarketingSkipReason =
  | "bad_msisdn"
  | "suppressed"
  | "no_consent"
  | "consent_withdrawn"
  | "rg_self_excluded"
  | "account_status";

export type MarketingGateVerdict =
  | { ok: true }
  | { ok: false; skipReason: MarketingSkipReason; detail: string };

const refuse = (skipReason: MarketingSkipReason, detail: string): MarketingGateVerdict =>
  ({ ok: false, skipReason, detail });

/**
 * 🔴 THE TWO PHONE FORMATS THIS PLATFORM ACTUALLY HAS, AND WHY THIS FUNCTION EXISTS.
 *
 * `User.phoneE164` is written from `tzPhone` (`validators.ts:32-37`), which returns
 * **`+255XXXXXXXXX`** — with the plus. The marketing key, the SMS wire and `MessagingConsent.
 * identifier` all use `toMsisdn255`, which returns **`255XXXXXXXXX`** — without it. Measured
 * 2026-09-25: the two are unequal for EVERY input, including `+255712345678` itself.
 *
 * ⛔ So `db.user.findByPhone(identifier)` with the marketing key returns null for EVERY
 * PLAYER, and a gate written the obvious way would quietly treat the whole player base as
 * strangers — handing each of them to the ledger branch, which is precisely the branch that
 * must never govern a player. It would never throw and never log; it would simply answer the
 * wrong question, consistently, for everyone.
 *
 * `test:marketing-consent` pins this in both directions: the bridged form finds the player,
 * and the bare form is proven to find nothing.
 */
export function userPhoneKeyFor(identifier: string): string {
  return `+${identifier}`;
}

/** The account states that may be marketed to at all, before consent is even considered. */
const MARKETABLE_STATUS = new Set(["ACTIVE", "PENDING_KYC"]);

export async function mayReceiveMarketingSms(msisdn: string): Promise<MarketingGateVerdict> {
  const identifier = toMsisdn255(msisdn);
  // ⛔ An unusable number is refused here rather than at the wire, so it never becomes a
  // billed send attempt (D2, U1).
  if (!identifier || identifier.length < 12) {
    return refuse("bad_msisdn", "the number does not normalise to a Tanzanian msisdn");
  }
  const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };

  // ── 1 · SUPPRESSION, FIRST, ALWAYS (OD11) ───────────────────────────────────────────────
  // ⛔ Before consent, not after. A suppressed number usually still carries the consent row it
  // gave before it withdrew, so asking consent first lets that stale row win.
  const suppressed = await Promise.resolve(db.suppression.find(key));
  if (suppressed) {
    return refuse("suppressed", `suppressed ${suppressed.reason.toLowerCase()} on ${suppressed.createdAt}`);
  }

  // ── 2 · IF THE NUMBER BELONGS TO A PLAYER, THE PLAYER GOVERNS ───────────────────────────
  const user = await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(identifier)));
  if (user) {
    // ⛔ `selfExclusionStanding`, NEVER `isLockedOut` (OD12, D9). `isLockedOut` LIFTS ITSELF
    // when the chosen period elapses, so a 24-hour self-exclusion would be marketable 25 hours
    // later. `minimum_served` is refused for exactly that reason: the period ending is not the
    // person asking to be marketed again. ⚠️ U10 adds cooling-off, harm markers and the
    // fresh-consent-after-restoration rule on top of this; it does not replace it.
    const rg = await selfExclusionStanding(user.id);
    if (rg.state === "serving" || rg.state === "minimum_served") {
      return refuse("rg_self_excluded", `self-exclusion ${rg.state} (until ${rg.until})`);
    }
    if (!MARKETABLE_STATUS.has(user.status)) {
      return refuse("account_status", `account is ${user.status}`);
    }
    // OD8 · the profile screen says the toggle means this, in the shipped wording, so the
    // boolean IS the player's consent.
    if (user.marketingOptIn !== true) {
      return refuse("no_consent", "the player's own marketing toggle is off");
    }
    return { ok: true };
  }

  // ── 3 · OTHERWISE THE LEDGER GOVERNS ────────────────────────────────────────────────────
  // ⛔ No row is not "not yet decided" — it is NO. There is no lawful basis but consent in
  // Tanzania (OD7), so silence can never be treated as permission.
  const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
  if (!latest) {
    return refuse("no_consent", "no consent has ever been recorded for this number");
  }
  if (latest.status === "WITHDRAWN") {
    return refuse("consent_withdrawn", `consent withdrawn on ${latest.createdAt}`);
  }
  return { ok: true };
}
