import { db } from "@/lib/server/store";
import type { MessagingKey } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { marketingRgStanding } from "@/lib/server/marketing/rg";

/**
 * U7 · THE ONE GATE. Nothing sends a marketing SMS without asking this first.
 *
 * ⭐ ITS ORDER IS THE LAW'S ORDER, NOT A CONVENIENCE (§5.6, OD11): suppression → consent →
 * self-exclusion → cooling-off → harm markers, then account status. Suppression is asked BEFORE
 * consent: somebody who said stop has said stop, and a stale consent row must never out-argue that
 * — which is exactly what happens if the two are swapped, because a withdrawn person usually still
 * has the consent row they gave you last year.
 * ⚠️ Corrected at U10 (2026-09-25): this docblock said "ordered exactly as §5.6" while the code
 * asked self-exclusion BEFORE consent. The outcome is a refusal either way; the difference is COST —
 * harm markers read up to 10,000 transactions, and asking them before consent would scan every
 * non-consenting player on the platform, which on day one is nearly everyone.
 *
 * ⛔ A CONTACT-BOOK ROW CAN NEVER OVERRIDE A PLAYER'S OWN "NO". When the number belongs to a
 * `User`, that user governs and the ledger is not consulted for permission. An imported spreadsheet
 * cannot re-permit somebody who turned the toggle off (OD10).
 *
 * ⚠️ WHAT THIS GATE DOES **NOT** YET DECIDE, so nobody reads a false completeness into it: age (U11),
 * the frequency cap (U14), the send window (U13) and the Board's approval (U41) are separate steps.
 * ⛔ AND IT IS ASKED BY THE LOOP, NOT BY A LIST: `dispatch.ts` (U9) asks it per recipient immediately
 * before the send, so somebody who opts out in minute two does not receive minute four's message.
 */

/** ⭐ Named, and each value is a `skipped` reason — never a failure (§5.6). A refusal is the
 *  system working. */
export type MarketingSkipReason =
  | "bad_msisdn"
  | "suppressed"
  | "no_consent"
  | "consent_withdrawn"
  | "rg_self_excluded"
  | "rg_cooling_off"
  | "rg_harm_marker"
  | "account_status";

/** `userId` is set on every refusal the PLAYER branch makes, so the loop can write the RG audit line
 *  against the account (§5.14 — never against a phone number). */
export type MarketingGateVerdict =
  | { ok: true }
  | { ok: false; skipReason: MarketingSkipReason; detail: string; userId?: string };

const refuse = (skipReason: MarketingSkipReason, detail: string, userId?: string): MarketingGateVerdict =>
  (userId ? { ok: false, skipReason, detail, userId } : { ok: false, skipReason, detail });

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
  // ⭐ `find` ANSWERS "IS THIS NUMBER BEING REFUSED RIGHT NOW" — it returns only rows whose
  // `liftedAt` is null (U8). The row is never deleted, so a person who opted out in 2026 and
  // asked to be resubscribed in 2027 is marketable again WITHOUT the evidence of the original
  // refusal being destroyed. ⛔ Nothing here filters the lift a second time: a gate that
  // re-implemented the DAL's question would be a second definition of "suppressed", and the
  // two only have to disagree once.
  const suppressed = await Promise.resolve(db.suppression.find(key));
  if (suppressed) {
    return refuse("suppressed", `suppressed ${suppressed.reason.toLowerCase()} on ${suppressed.createdAt}`);
  }

  // ── 2 · IF THE NUMBER BELONGS TO A PLAYER, THE PLAYER GOVERNS ───────────────────────────
  const user = await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(identifier)));
  if (user) {
    // ── 2a · CONSENT — OD8 · the profile screen says the toggle means this, in the shipped
    // wording, so the boolean IS the player's consent. Asked before RG because it is one field
    // already in hand, and the RG step below is the costly one.
    if (user.marketingOptIn !== true) {
      return refuse("no_consent", "the player's own marketing toggle is off", user.id);
    }
    // ── 2b · RG STANDING — self-exclusion → cooling-off → harm markers (U10, `rg.ts`).
    // ⛔ NEVER `isLockedOut` (OD12, D9): it LIFTS ITSELF when the chosen period elapses, so a 24-hour
    // self-exclusion would be marketable 25 hours later. The period ending is not the person asking.
    // 🔴 AND NEVER A PREDICATE THAT WRITES. U7 first asked `selfExclusionStanding`, which goes
    // through `getRgSettings`: that CREATES a row for a user with none (fixed at U7 by reading the
    // row first) and REWRITES a row whose pending limit change has come due (`effectivize`) — which
    // the U7 fix did not cover. `rg.ts` reads the raw row and computes from it; nothing it calls writes.
    const rg = await marketingRgStanding(user, identifier);
    if (!rg.ok) return refuse(rg.skipReason, rg.detail, user.id);
    // ── 2c · ACCOUNT STATUS. COOLED_OFF is never cleared by anything, so it is admitted ONLY when
    // the RG step has proven the break is over AND the player consented again after it.
    // SELF_EXCLUDED never reaches here — the RG step refuses it.
    const statusOk = MARKETABLE_STATUS.has(user.status) || (user.status === "COOLED_OFF" && rg.coolingOffEnded);
    if (!statusOk) {
      return refuse("account_status", `account is ${user.status}`, user.id);
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
