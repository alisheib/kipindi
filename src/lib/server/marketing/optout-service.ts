import { randomUUID } from "crypto";
import { db } from "@/lib/server/store";
import type { MessagingKey, MessagingLocale } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";
import { maskPhone } from "@/lib/phone-normalize";
import { OPTOUT_TOKEN_CHARS } from "@/lib/marketing/footer";
import { optOutTokenFromHex, isOptOutTokenShape } from "@/lib/marketing/optout";
import { userPhoneKeyFor } from "@/lib/server/marketing/consent";
import { dict } from "@/lib/i18n-dict";

/**
 * U8 · THE OPT-OUT PAGE'S ONE SERVICE — resolving a token, stopping, and starting again.
 *
 * ⭐ THE UNIT'S WHOLE POINT IS THAT NEITHER BUTTON MAY LIE. Every failure here has its OWN
 * reason, and the page renders a distinct sentence for each: a person who taps "stop" and is
 * told it worked must actually be refused at the next dispatch, and a person who taps "start
 * them again" must actually be marketable again. ⛔ A success message is a claim about the
 * database, not about the request having been received.
 *
 * 🔴 AND THE REASON THIS UNIT NEEDED A SCHEMA DECISION BEFORE IT COULD BE WRITTEN. U6 shipped
 * `Suppression` with no lift path and `dal-parity` §17 asserts NO delete in either twin —
 * rightly, since deleting a row re-permits marketing to somebody who said stop and destroys
 * the evidence that they did. U7's gate asks suppression FIRST. So "start them again" could
 * not have worked at all: it would have written a consent row, reported success, and the
 * suppression row would have gone on refusing for ever.
 * ⭐ The fix is that a row is never DELETED but may be SUPERSEDED — `liftedAt` — so both
 * promises hold at once. `db.suppression.lift` is that write, and it is an UPDATE.
 */

/** The two acts the page offers. Named, because it is a function parameter. */
export type OptOutAct = "STOP" | "RESUME";

/**
 * ⭐ THE SENTENCE THIS PERSON ACTUALLY READ, resolved AT THE MOMENT OF THE ACT and stored as
 * text (§5.7, U6's rule). ⛔ Storing a KEY into today's copy would mean the record silently
 * changes every time marketing rewords the page — which is the record being worthless.
 *
 * ⛔ AND IT IS RESOLVED HERE, NOT PASSED IN. A `wording` parameter would let a caller — or a
 * forged form post — put any sentence into the evidence, and evidence a stranger can choose is
 * not evidence. The only input is the locale, and the action reads that from the same cookie
 * the page rendered from.
 *
 * ⚠️ Swahili is the DEFAULT (§5.13), so an unrecognised locale falls to `sw` and never to
 * English: a record saying the person read English copy they were never shown is a false one.
 */
export function optOutWording(act: OptOutAct, locale: MessagingLocale): string {
  const d = locale === "EN" ? dict.en : locale === "ZH" ? dict.zh : dict.sw;
  return act === "STOP"
    ? `${d.optout.stopButton} — ${d.optout.body}`
    : `${d.optout.resubscribeButton} — ${d.optout.body}`;
}

/** Named because these are DAL-shaped parameters — see `store.ts` on `region()`. */
export type OptOutResolution =
  | { ok: true; identifier: string; masked: string; suppressed: boolean }
  | { ok: false; reason: "malformed" | "unknown" };

export type OptOutActResult =
  | { ok: true; state: "stopped" | "already" | "resumed" }
  | { ok: false; reason: "malformed" | "unknown" | "error" };

const keyFor = (identifier: string): MessagingKey =>
  ({ channel: "SMS", identifier, category: "MARKETING" });

/**
 * ⭐ THE PAGE'S READ. Shape is checked before the database is asked, because `/s/` is public,
 * unauthenticated and the cheapest thing on this site to point a script at — an obviously
 * malformed path must not cost a round trip per hit.
 *
 * ⛔ BOTH FAILURES ARE TOLD THE SAME THING BY THE PAGE. `malformed` and `unknown` are separate
 * here because the caller logs them differently, but the SENTENCE a stranger reads is identical:
 * the page never reveals which of the two it was, or `/s/` becomes an oracle for guessing live
 * tokens.
 */
export async function resolveOptOutToken(token: string): Promise<OptOutResolution> {
  if (!isOptOutTokenShape(token)) return { ok: false, reason: "malformed" };
  const row = await Promise.resolve(db.marketingOptOutToken.find(token));
  // ⛔ OD43 · THE LINK NEVER EXPIRES. There is deliberately no age comparison here: somebody
  // who kept an SMS from a year ago must still be able to click out of it, and a token that
  // stopped working is a person who cannot leave. `test:marketing-optout` plants the expiry.
  if (!row) return { ok: false, reason: "unknown" };
  const active = await Promise.resolve(db.suppression.find(keyFor(row.identifier)));
  return {
    ok: true,
    identifier: row.identifier,
    // §5.14 — the page shows the number so the person knows WHICH one they are stopping, and
    // it shows it masked. ⛔ A raw number on a page anybody holding the link can open is a
    // number disclosed to whoever the phone was handed to.
    masked: maskPhone(row.identifier),
    suppressed: active !== null,
  };
}

/**
 * ⭐ STOP — ONE CLICK, NO CONFIRMATION STEP (OD43). A second screen asking "are you sure" is a
 * step a person on a feature phone does not reliably complete, and every one who abandons it
 * stays marketable while believing they opted out. The law's question is whether they asked to
 * stop, and they asked by tapping.
 *
 * Writes, in this order, and each one is a different record answering a different question:
 *   1. the SUPPRESSION row — what the send loop reads (§5.6);
 *   2. a WITHDRAWN ledger row carrying the page's exact wording (§5.7) — what a regulator reads;
 *   3. when the number belongs to a player, `marketingOptIn = false` through the EXISTING
 *      `privacy.marketing_consent.withdrawn` audit action — so the profile toggle agrees.
 *
 * ⛔ THE PLAYER LOOKUP GOES THROUGH `userPhoneKeyFor` (U7). `User.phoneE164` is `+255…` and the
 * marketing key is bare `255…`; they are unequal for every input, so a bare lookup finds NO
 * player, leaves every profile toggle untouched, and never errors.
 */
export async function stopMarketing(token: string, locale: MessagingLocale): Promise<OptOutActResult> {
  const wording = optOutWording("STOP", locale);
  const r = await resolveOptOutToken(token);
  if (!r.ok) return { ok: false, reason: r.reason };
  if (r.suppressed) return { ok: true, state: "already" };
  try {
    await Promise.resolve(db.suppression.create({
      id: randomUUID(),
      channel: "SMS",
      identifier: r.identifier,
      category: "MARKETING",
      reason: "WITHDRAWN",
      // ⛔ The token, not the number — `identifier` is the only place a number belongs (§5.14).
      evidence: `optout:${token}`,
      recordedBy: null,
      createdAt: new Date().toISOString(),
      liftedAt: null,
      liftedReason: null,
    }));
    await appendLedgerRow(r.identifier, "WITHDRAWN", wording, locale, token);
    await syncPlayerToggle(r.identifier, false, token);
    return { ok: true, state: "stopped" };
  } catch (err) {
    console.error("[optout] stop failed:", (err as Error)?.message ?? err);
    return { ok: false, reason: "error" };
  }
}

/**
 * ⭐ START THEM AGAIN — THE SECOND BUTTON, NEVER A CONDITION OF THE FIRST (OD43). It is offered
 * after a stop and on a number already suppressed; it is never a step somebody has to pass
 * through on their way out.
 *
 * ⛔ IT LIFTS, IT DOES NOT DELETE. The suppression row and its original `createdAt` survive, so
 * "when did this person first say no" is still answerable — while the gate stops refusing them.
 * A delete would satisfy this function identically and destroy that answer, which is why
 * `dal-parity` §17 asserts there is no delete to call in either twin.
 */
export async function resumeMarketing(token: string, locale: MessagingLocale): Promise<OptOutActResult> {
  const wording = optOutWording("RESUME", locale);
  const r = await resolveOptOutToken(token);
  if (!r.ok) return { ok: false, reason: r.reason };
  try {
    await Promise.resolve(db.suppression.lift(keyFor(r.identifier), `optout:${token}`, new Date().toISOString()));
    // ⛔ THE LEDGER ROW IS WRITTEN WHETHER OR NOT THERE WAS A ROW TO LIFT. Somebody who was
    // never suppressed and taps "start them again" has still stated a consent, and the ledger
    // is the only place that statement can live — the gate reads it for every non-player.
    // ⚠️ Without this the button would be a no-op for a stranger with no suppression row: the
    // page would say "you will get 50pick texts again" while the gate still refused them for
    // want of consent, which is the same false success in a different costume.
    await appendLedgerRow(r.identifier, "GIVEN", wording, locale, token);
    await syncPlayerToggle(r.identifier, true, token);
    return { ok: true, state: "resumed" };
  } catch (err) {
    console.error("[optout] resume failed:", (err as Error)?.message ?? err);
    return { ok: false, reason: "error" };
  }
}

/** ⛔ One writer, so the two acts cannot capture the wording differently (§5.7, U6). */
async function appendLedgerRow(identifier: string, status: "GIVEN" | "WITHDRAWN", wording: string, locale: MessagingLocale, token: string): Promise<void> {
  await Promise.resolve(db.messagingConsent.create({
    id: randomUUID(),
    channel: "SMS",
    identifier,
    category: "MARKETING",
    status,
    source: "OPT_OUT_PAGE",
    // ⛔ VERBATIM (§5.7) — the sentence THIS person read, in the language they read it in,
    // handed in by the page rather than re-rendered from today's copy inside here.
    wording,
    locale,
    evidence: `optout:${token}`,
    recordedBy: null,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * ⭐ WHEN THE NUMBER IS A PLAYER'S, THE PROFILE TOGGLE MOVES WITH IT — and it moves through the
 * SAME audit action `/profile/notifications` already writes, so a compliance reader sees one
 * vocabulary rather than two (`notifications/actions.ts:27`).
 *
 * ⛔ `userPhoneKeyFor` OR THIS FINDS NOBODY (U7). A bare `findByPhone(identifier)` returns null
 * for every player on the platform and this function would silently do nothing, for everyone,
 * for ever — the page would report success and the player's own toggle would still say yes.
 */
async function syncPlayerToggle(identifier: string, on: boolean, token: string): Promise<void> {
  const user = await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(identifier)));
  if (!user || user.marketingOptIn === on) return;
  await db.user.update(user.id, { marketingOptIn: on });
  audit({
    category: "COMPLIANCE",
    action: on ? "privacy.marketing_consent.given" : "privacy.marketing_consent.withdrawn",
    // ⛔ NULL, not the player's own id. They acted without signing in, so the platform cannot
    // claim the session did it — the token is the evidence and it is named in the payload.
    actorId: null,
    targetType: "User",
    targetId: user.id,
    payload: { marketingOptIn: on, via: "optout", token },
  });
}

/**
 * ⭐ MINT — WITH A RETRY, BECAUSE ~1% PER CAMPAIGN IS NOT ZERO AND THE TOKEN NEVER EXPIRES.
 *
 * 32⁸ = 1.1×10¹² against §3c's 150,000 recipients is ≈1% expected collisions per campaign, and
 * OD43 says the token never expires, so that 1% COMPOUNDS over every campaign ever sent. The
 * DAL returns null on a taken token rather than throwing or upserting — ⛔ an upsert would
 * silently re-point somebody else's live opt-out link at a different person, and they would
 * never be able to leave — so the retry is the whole of the collision handling.
 *
 * ⛔ BOUNDED. An unbounded loop against a table that can only fill up is an outage that looks
 * like a hang. Six attempts at ≈1% each is a failure probability no campaign will ever meet,
 * and a caller that gets null must refuse to enqueue rather than send a message with no way out.
 */
export const OPTOUT_MINT_ATTEMPTS = 6;

export async function mintOptOutToken(identifier: string): Promise<string | null> {
  for (let attempt = 0; attempt < OPTOUT_MINT_ATTEMPTS; attempt++) {
    // ⛔ Two hex characters per output character — `optOutTokenFromHex` folds a byte into the
    // 32-character alphabet, and 256 is exactly 8 × 32, so the fold carries no modulo bias.
    const token = optOutTokenFromHex(randomId(OPTOUT_TOKEN_CHARS));
    if (!token) continue;
    const created = await Promise.resolve(db.marketingOptOutToken.create({
      token,
      channel: "SMS",
      identifier,
      category: "MARKETING",
      createdAt: new Date().toISOString(),
    }));
    if (created) return created.token;
  }
  // ⛔ The number is NOT in this line (§5.14) — a marketing list inside the unprunable audit
  // chain is one nobody can ever delete.
  console.error(`[optout] could not mint a token in ${OPTOUT_MINT_ATTEMPTS} attempts for ${maskPhone(identifier)}`);
  return null;
}
