import { randomUUID, createHash } from "crypto";
import { db } from "@/lib/server/store";
import type { MessagingKey, MessagingLocale, SuppressionReason } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";
import { maskPhone, toMsisdn255 } from "@/lib/phone-normalize";
import { OPTOUT_TOKEN_CHARS } from "@/lib/marketing/footer";
import { optOutTokenFromHex, isOptOutTokenShape, normalizeOptOutToken, optOutTokenRef } from "@/lib/marketing/optout";
import { userPhoneKeyFor } from "@/lib/server/marketing/consent";
import { rateCheckAsync, rateRefundAsync } from "@/lib/server/rate-limit";
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
 *
 * 🔴 D6 (2026-09-26) · RESUME USED TO STORE THE STOP INSTRUCTION. It was `resubscribeButton — body`,
 * and `body` is "tap once to stop marketing messages" — so every GIVEN row this page wrote recorded
 * an instruction to STOP as the sentence somebody consented under, and never named what they were
 * agreeing to. It now stores the consent sentence the page shows BESIDE the resume button,
 * `push.marketingBody` — the same one the profile toggle uses, which names sender, content and
 * channel (D1). ⛔ `consent-wording.ts` pins this composition literally (OQ11); a copy change to
 * either half must be appended there or the gate stops counting it.
 */
export function optOutWording(act: OptOutAct, locale: MessagingLocale): string {
  const d = locale === "EN" ? dict.en : locale === "ZH" ? dict.zh : dict.sw;
  return act === "STOP"
    ? `${d.optout.stopButton} — ${d.optout.body}`
    : `${d.optout.resubscribeButton} — ${d.push.marketingBody}`;
}

/**
 * ⛔ D6 · WHICH STOPS "START THEM AGAIN" MAY LIFT — ONLY ONE THE PERSON MADE.
 *
 * `/s/` is unauthenticated: whoever holds an old SMS can tap it. A `WITHDRAWN` row is the person's own
 * "stop" (this page, or their own toggle), so their own link may take it back. ⛔ A `COMPLAINT`,
 * `OPERATOR` or `SELF_EXCLUSION` row was put there by somebody else for a reason the link-holder does
 * not get to overrule — one tap on an old message must never undo an officer's, an erasure's or a
 * responsible-gambling suppression. Such a number is shown as stopped, with no way back offered.
 */
export const PERSON_LIFTABLE_REASONS: readonly SuppressionReason[] = ["WITHDRAWN"];
export function personMayLift(reason: SuppressionReason | null | undefined): boolean {
  return !!reason && PERSON_LIFTABLE_REASONS.includes(reason);
}

/** Named because these are DAL-shaped parameters — see `store.ts` on `region()`.
 *  ⭐ `token` is the NORMALISED token (D6: case-insensitive), and every act writes from it rather
 *  than from what the caller passed. `resumable` is "the page may offer start-them-again": the
 *  number is stopped AND the stop is one the person made (`personMayLift`). ⛔ The REASON itself is
 *  never handed to the page — a stranger holding the link learns "stopped", not why. */
export type OptOutResolution =
  | { ok: true; token: string; identifier: string; masked: string; suppressed: boolean; resumable: boolean }
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
export async function resolveOptOutToken(raw: string): Promise<OptOutResolution> {
  // ⭐ D6 · CASE-INSENSITIVE. Folded BEFORE the shape check, because a lower-case token typed off a
  // phone screen is the right shape in the wrong case — and was answered "this link does not work".
  const token = normalizeOptOutToken(raw);
  if (!isOptOutTokenShape(token)) return { ok: false, reason: "malformed" };
  const row = await Promise.resolve(db.marketingOptOutToken.find(token));
  // ⛔ OD43 · THE LINK NEVER EXPIRES. There is deliberately no age comparison here: somebody
  // who kept an SMS from a year ago must still be able to click out of it, and a token that
  // stopped working is a person who cannot leave. `test:marketing-optout` plants the expiry.
  if (!row) return { ok: false, reason: "unknown" };
  const active = await Promise.resolve(db.suppression.find(keyFor(row.identifier)));
  return {
    ok: true,
    token,
    identifier: row.identifier,
    // §5.14 — the page shows the number so the person knows WHICH one they are stopping, and
    // it shows it masked. ⛔ A raw number on a page anybody holding the link can open is a
    // number disclosed to whoever the phone was handed to.
    // ⭐ D6 · masked in the `+255…` form (`userPhoneKeyFor`), so it reads `+255••••21` like every
    // other shared mask. The bare marketing key gave `2557••••21`: the operator digit leaked and
    // the form was one nobody writes their number in.
    masked: maskPhone(userPhoneKeyFor(row.identifier)),
    suppressed: active !== null,
    resumable: active !== null && personMayLift(active.reason),
  };
}

/**
 * ⭐ THE PAGE'S READ, WITHIN A BUDGET THAT ONLY A MISS SPENDS (D6).
 *
 * 🔴 THE LIMIT THAT "STOPS A SCRIPT WALKING THE TOKEN SPACE" USED TO GUARD ONLY THE TWO POSTS. The walk
 * happens over GET — a valid token renders a number and a button, an invalid one the refusal, so every
 * GET was a free yes/no. Now each lookup is charged up front and REFUNDED when the token resolves:
 * a person opening their own link never spends anything, and a walker — whose every guess is a miss —
 * runs the bucket dry. ⛔ Once it is dry the lookup is not made at all (`throttled`), and the page
 * answers with the same refusal an unknown token gets, so an exhausted bucket is not an oracle either.
 * ⚠️ The trade-off, stated: a genuine link opened behind the SAME address as an active walker is
 * refused until the bucket refills (10/min). The refusal names two other ways to stop.
 */
export const OPTOUT_BUDGET = "optout.ip" as const;
export type OptOutPageResolution = OptOutResolution | { ok: false; reason: "throttled" };

export async function resolveOptOutTokenWithinBudget(raw: string, clientKey: string): Promise<OptOutPageResolution> {
  const gate = await rateCheckAsync(clientKey, OPTOUT_BUDGET);
  if (!gate.allowed) return { ok: false, reason: "throttled" };
  const r = await resolveOptOutToken(raw);
  if (r.ok) await rateRefundAsync(clientKey, OPTOUT_BUDGET);
  return r;
}

/**
 * The two acts, within the same budget. ⭐ A MISS spends the address's allowance and a hit is refunded,
 * so a burst of genuine STOPs through one carrier-NAT address after a large send is never refused for
 * sharing it. ⛔ And a hit is capped PER LINK instead — 30 burst, 10/min, the same rule — because an
 * uncapped holder of one valid token could flip stop/start at request speed and append ledger rows
 * without limit. No person taps their own link thirty times in a minute. The link's bucket is keyed
 * by a hash, so `/admin/system`'s bucket table never prints a live token.
 * ⚠️ A refused act reports `error` ("did not go through, try again"), never a success.
 */
const linkBucketKey = (token: string): string =>
  `link:${createHash("sha256").update(`optout-link:${token}`).digest("hex").slice(0, 16)}`;

async function actWithinBudget(clientKey: string, raw: string, act: () => Promise<OptOutActResult>): Promise<OptOutActResult> {
  const gate = await rateCheckAsync(clientKey, OPTOUT_BUDGET);
  if (!gate.allowed) return { ok: false, reason: "error" };
  const token = normalizeOptOutToken(raw);
  if (isOptOutTokenShape(token)) {
    const perLink = await rateCheckAsync(linkBucketKey(token), OPTOUT_BUDGET);
    if (!perLink.allowed) {
      await rateRefundAsync(clientKey, OPTOUT_BUDGET);
      return { ok: false, reason: "error" };
    }
  }
  const r = await act();
  // `error` means the token RESOLVED and a write failed — a hit, so it is refunded like a success.
  if (r.ok || r.reason === "error") await rateRefundAsync(clientKey, OPTOUT_BUDGET);
  return r;
}

export function stopMarketingWithinBudget(raw: string, locale: MessagingLocale, clientKey: string): Promise<OptOutActResult> {
  return actWithinBudget(clientKey, raw, () => stopMarketing(raw, locale));
}

export function resumeMarketingWithinBudget(raw: string, locale: MessagingLocale, clientKey: string): Promise<OptOutActResult> {
  return actWithinBudget(clientKey, raw, () => resumeMarketing(raw, locale));
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
 *
 * 🔴 THE THREE WRITES ARE NOT ONE TRANSACTION, SO "ALREADY" REPAIRS. If the ledger write failed after
 * the suppression row landed, the page said "try again" — and the retry used to return `already`
 * before either missing write was made, leaving the ledger's latest row GIVEN (no evidence of the
 * withdrawal) and the player's toggle ON for ever. Now `already` finishes the job: a missing
 * WITHDRAWN row is appended and the toggle is synced before it answers.
 */
export async function stopMarketing(raw: string, locale: MessagingLocale): Promise<OptOutActResult> {
  const wording = optOutWording("STOP", locale);
  try {
    const r = await resolveOptOutToken(raw);
    if (!r.ok) return { ok: false, reason: r.reason };
    const ref = optOutTokenRef(r.token);
    if (r.suppressed) {
      const latest = await Promise.resolve(db.messagingConsent.latestFor(keyFor(r.identifier)));
      if (latest?.status !== "WITHDRAWN") await appendLedgerRow(r.identifier, "WITHDRAWN", wording, locale, ref);
      await syncPlayerToggle(r.identifier, false, ref);
      return { ok: true, state: "already" };
    }
    await Promise.resolve(db.suppression.create({
      id: randomUUID(),
      channel: "SMS",
      identifier: r.identifier,
      category: "MARKETING",
      reason: "WITHDRAWN",
      // ⛔ The token REFERENCE, not the number — `identifier` is the only place a number belongs
      // (§5.14) — and not the live token either (`optOutTokenRef`).
      evidence: `optout:${ref}`,
      recordedBy: null,
      createdAt: new Date().toISOString(),
      liftedAt: null,
      liftedReason: null,
    }));
    await appendLedgerRow(r.identifier, "WITHDRAWN", wording, locale, ref);
    await syncPlayerToggle(r.identifier, false, ref);
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
 *
 * ⛔ D6 · IT LIFTS ONLY A STOP THE PERSON MADE (`personMayLift`). On any other active reason it
 * writes NOTHING and answers `already` — the number stays stopped, which is the truth.
 * ⚠️ AND THE PAGE NEVER PROMISES DELIVERY AFTER IT. The gate may still refuse the number (a contact
 * is `age_unknown` until U33; a player's RG standing), so the sentence says what was DONE — the stop
 * is lifted and the choice recorded — and is the same for everybody. ⛔ Branching it on the gate's
 * verdict would tell whoever holds the link that the number is refused, e.g. self-excluded.
 */
export async function resumeMarketing(raw: string, locale: MessagingLocale): Promise<OptOutActResult> {
  const wording = optOutWording("RESUME", locale);
  try {
    const r = await resolveOptOutToken(raw);
    if (!r.ok) return { ok: false, reason: r.reason };
    if (r.suppressed && !r.resumable) return { ok: true, state: "already" };
    const ref = optOutTokenRef(r.token);
    await Promise.resolve(db.suppression.lift(keyFor(r.identifier), `optout:${ref}`, new Date().toISOString()));
    // ⛔ THE LEDGER ROW IS WRITTEN WHETHER OR NOT THERE WAS A ROW TO LIFT. Somebody who was
    // never suppressed and taps "start them again" has still stated a consent, and the ledger
    // is the only place that statement can live — the gate reads it for every non-player.
    // ⚠️ Without this the button would be a no-op for a stranger with no suppression row: the
    // page would report the stop lifted while the gate still refused them for want of consent,
    // which is the same false success in a different costume.
    await appendLedgerRow(r.identifier, "GIVEN", wording, locale, ref);
    await syncPlayerToggle(r.identifier, true, ref);
    return { ok: true, state: "resumed" };
  } catch (err) {
    console.error("[optout] resume failed:", (err as Error)?.message ?? err);
    return { ok: false, reason: "error" };
  }
}

/** ⛔ One writer, so the two acts cannot capture the wording differently (§5.7, U6).
 *  `ref` is `optOutTokenRef(token)` — never the live token. */
async function appendLedgerRow(identifier: string, status: "GIVEN" | "WITHDRAWN", wording: string, locale: MessagingLocale, ref: string): Promise<void> {
  await Promise.resolve(db.messagingConsent.create({
    id: randomUUID(),
    channel: "SMS",
    identifier,
    category: "MARKETING",
    status,
    source: "OPT_OUT_PAGE",
    // ⛔ VERBATIM (§5.7) — the sentence THIS person read, in the language they read it in,
    // resolved once by `optOutWording()` at the moment of the act from the server-read locale
    // (never passed in by the page), and stored as text so the record does not change when the
    // copy is reworded later.
    wording,
    locale,
    evidence: `optout:${ref}`,
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
 *
 * ⛔ A SELF-EXCLUDED ACCOUNT IS NEVER SWITCHED BACK ON FROM AN UNAUTHENTICATED LINK. Switching OFF
 * always happens; switching ON skips `SELF_EXCLUDED` — the ledger still records what the person
 * tapped, but their own toggle stays off until they consent again after an officer restores them
 * (rg.ts ③). The page's sentence does not change, so the link-holder learns nothing about RG standing.
 */
async function syncPlayerToggle(identifier: string, on: boolean, ref: string): Promise<void> {
  const user = await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(identifier)));
  if (!user || user.marketingOptIn === on) return;
  if (on && user.status === "SELF_EXCLUDED") return;
  await db.user.update(user.id, { marketingOptIn: on });
  audit({
    category: "COMPLIANCE",
    action: on ? "privacy.marketing_consent.given" : "privacy.marketing_consent.withdrawn",
    // ⛔ NULL, not the player's own id. They acted without signing in, so the platform cannot
    // claim the session did it — the token REFERENCE is the evidence (never the live token:
    // `/admin/audit` prints this payload, and the token would let any reader act as the person).
    actorId: null,
    targetType: "User",
    targetId: user.id,
    payload: { marketingOptIn: on, via: "optout", tokenRef: ref },
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

export async function mintOptOutToken(raw: string): Promise<string | null> {
  // 🔴 THE TWO-FORMAT TRAP, CLOSED AT THE BOUNDARY (D6). A caller handing `User.phoneE164` (`+255…`)
  // would mint a link whose STOP writes a suppression keyed `+255…` that the gate — which keys on
  // `toMsisdn255` — never finds, while the page says "done". Normalised here exactly as
  // `appendMarketingConsent` does, and ⛔ an unusable number mints nothing: a caller that gets null
  // must refuse to enqueue rather than send a message with no way out.
  const identifier = toMsisdn255(raw);
  if (!identifier || identifier.length < 12) {
    console.error("[optout] refused a mint with an unusable identifier");
    return null;
  }
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
