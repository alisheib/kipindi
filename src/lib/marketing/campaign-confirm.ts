/**
 * ⭐ THE CONFIRMATION RULE — U40 (OD27, OD28). ONE definition that the confirm modal and the server both read:
 * which confirmation an audience needs, what a typed number reads as, whether a confirmation may freeze, and
 * whether Start may go ahead. Pure and client-safe: no clock, no database, no secret. It imports only `@/lib/utils`
 * (the count line) and `@/lib/phone-normalize` (the bare-key rule), and both are pinned in `test:client-graph-safe`.
 *
 * ── THE TWO TIERS ────────────────────────────────────────────────────────────
 * A FILTERED audience of at most `CONFIRM_ENUMERATE_MAX` (5) people is LISTED, one masked number per person, and
 * confirmed with one press: the officer approves THOSE people. More than 5, or ANY unfiltered audience however
 * small, is confirmed by TYPING the number of people.
 * ⛔ An unfiltered audience is never confirmed at a glance. "Everybody" grows: today's two-contact book is the
 * 150,000-contact book this plan is built for.
 * ⚠️ This is not U23's rule. U23's bulk bar names the first 20 of a selection under 50; that is a different
 * surface doing a different job.
 *
 * ── OD27 · THE GATE IS THE SERVER'S RECOUNT ──────────────────────────────────
 * 🔴 A typed-number gate built from the value it checks can never fail. `decideConfirm` checks the typed text
 * against `fresh.count`, the count the SERVER has just recomputed, and against nothing the browser sent. The
 * browser's view comes back only as a SIGNED claim (`shown`), which proves which draft revision and which audience
 * the officer was looking at. Its count is never the number the typed text is checked against
 * (`test:campaign-confirm` 4.4 is the plan's own red).
 * 🔴 ConfirmModal's `onConfirm` hands its caller no text (modal.tsx), so what reaches the server is the word the
 * modal armed on: `confirmTypedWord(count)`, the bare digits.
 *
 * ── X9 · THE COUNT IS THE CAMPAIGN POPULATION ────────────────────────────────
 * 🔴 Found by the U29–U40 critic: a fence over the BOOK's count alone confirms fewer people than the enqueue writes
 * once the player arm is on. Every Start would then refuse, or players would be messaged without confirmation. So a
 * claim's `count` is U38's campaign-audience count (the book ∪ the players, ONE person per number), and its members
 * key comes from that same walk, in X8's order. ⛔ Never a second count.
 *
 * ── X13 · WHAT IS STORED ─────────────────────────────────────────────────────
 * `audienceFilter` holds the canonical key JSON (U24). `audienceWatermark` holds the keyed members key for an
 * ENUMERATE confirmation and NULL for a TYPED one. `ConfirmFreeze.audienceWatermark` is that column's value, and it
 * is decided here. ⛔ The signed claim the browser carries is never stored.
 * 🔴 The plan's "count + watermark" never defined the watermark. An UNKEYED digest of a one-person audience, sent to
 * the browser, can be brute-forced back to the number (about ten million candidates once the masked tail and the
 * operator are known). So the members key is an HMAC computed on the server (`audience-fence.ts`, U40a). This module
 * fixes only its INPUT (`canonicalMembers`) and its shape (`MEMBERS_KEY_HEX_CHARS`), so that the confirmation and
 * U42's Start can never compute two different keys for one set of people.
 *
 * ── OD28 · START ─────────────────────────────────────────────────────────────
 * U42 calls `startAudienceVerdict` before it writes its first recipient row. MORE people than were confirmed refuses
 * with `audience_moved` and sends nothing. The same number or fewer goes ahead and reports how many fewer. An
 * ENUMERATED confirmation refuses any change of people at all, because a keyed set cannot prove that it holds only a
 * subset.
 *
 * ⛔ IT FAILS CLOSED. Each rule here can only RAISE the bar. An unreadable count is typed, a claim that could not
 * name its members is typed, and an unreadable count at Start refuses.
 * ⛔ CONFIRMED SENDS NOTHING. Nothing here enqueues, mints or sends. The first live send is a separate Start (owner
 * gate G2).
 *
 * Guard: `npm run test:campaign-confirm` · Red: `npm run red:campaign-confirm`.
 */
import { isGatewayMsisdn } from "@/lib/phone-normalize";
import { adminCount, formatNumber } from "@/lib/utils";

/* ══ THE TIER ═════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The most people a confirmation may LIST one by one. ⛔ This is the only place the number is written; the
 *  modal imports it and never types its own. */
export const CONFIRM_ENUMERATE_MAX = 5;

export type ConfirmTier = "enumerate" | "typed";

/** A count this module will reason about: a whole number, 0 or more. Anything else fails closed. */
const isCount = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/**
 * Which confirmation an audience needs. `unfiltered` means no predicate narrows the population (the officer chose
 * "everybody"), and the server decides it from U24's filter. ⛔ A count that is not a whole number, or an
 * `unfiltered` that is anything but `false`, is TYPED. A count of 0 is not a tier question: `decideConfirm` refuses it
 * as `audience_empty`.
 */
export function confirmTier(count: number, unfiltered: boolean): ConfirmTier {
  return unfiltered !== false || !isCount(count) || count > CONFIRM_ENUMERATE_MAX ? "typed" : "enumerate";
}

/* ══ THE TYPED NUMBER ═════════════════════════════════════════════════════════════════════════════ */

/** ⭐ At most seven digits: 9,999,999 people, over sixty times the book the plan is sized for. A larger audience
 *  can never be confirmed (it fails closed), and it is never misread. No leading zero, no sign, no decimal. */
const TYPED_COUNT = /^(0|[1-9][0-9]{0,6})$/;

/** The grouping a person may type between digits: a space, a comma, a no-break space or a narrow no-break space
 *  (the last two come from a phone keyboard or a pasted "5 912"). Spelled by code point, so the source shows
 *  which space each one is. */
const GROUPING: ReadonlySet<string> = new Set([" ", ",", String.fromCharCode(0x00a0), String.fromCharCode(0x202f)]);

/**
 * What an officer typed, read as a count, or `null` when it cannot be read.
 * ⛔ NO `Number()` LENIENCY. `Number()` reads "5912.0", "0x10", "1e3" and " " as numbers, and the gate would then
 * compare a number nobody typed. Only ASCII digits pass: no Arabic-Indic or full-width digits, so the gate never
 * accepts a number the officer did not see written. Grouping is decoration: the DIGITS are what must equal the
 * server's count.
 */
export function parseTypedCount(raw: string | null | undefined): number | null {
  if (typeof raw !== "string") return null;
  let digits = "";
  for (const ch of raw.trim()) if (!GROUPING.has(ch)) digits += ch;
  return TYPED_COUNT.test(digits) ? Number(digits) : null;
}

/**
 * The word the hard-tier modal arms on: the bare count, with no grouping. ConfirmModal compares exact text, so
 * "5,912" would make the officer type a comma. The figures beside it are grouped; this word is not.
 */
export function confirmTypedWord(count: number): string {
  return String(count);
}

/* ══ THE FENCE CLAIM (X9 · X13) ══════════════════════════════════════════════════════════════════ */

export const FENCE_CLAIM_VERSION = 1;

/** The members key's shape: a keyed digest written as lowercase hex (`audience-fence.ts` makes it). */
export const MEMBERS_KEY_HEX_CHARS = 32;
const MEMBERS_KEY = new RegExp(`^[0-9a-f]{${MEMBERS_KEY_HEX_CHARS}}$`);
const isMembersKey = (k: unknown): k is string => typeof k === "string" && MEMBERS_KEY.test(k);

/**
 * What the server counted, at one moment, for one draft. The server signs it and the browser holds it (the
 * `watermark` the modal posts back). ⛔ It is never stored (X13).
 * `count` is the CAMPAIGN population (X9). `membersKey` is non-null ONLY on the enumerate tier.
 */
export type FenceClaim = {
  v: typeof FENCE_CLAIM_VERSION;
  campaignId: string;
  draftRevision: number;
  count: number;
  tier: ConfirmTier;
  membersKey: string | null;
};

/**
 * The INPUT to the members key: the people an enumerate confirmation lists, in one spelling. The keys are sorted
 * and each number is counted ONCE, because a number that is both in the book and on a player account is one person
 * (X9, OD6). The server HMACs this string. The confirmation and U42's Start both call this function, so they cannot
 * build two different keys for the same people.
 * ⛔ Returns `null` unless the walk named EXACTLY `count` distinct bare keys, with `count` between 1 and
 * `CONFIRM_ENUMERATE_MAX`. A walk that disagrees with the count, a "+255" or "07…" spelling, or a sixth person all
 * give no key, and `buildFenceClaim` then makes the claim typed.
 * ⭐ A bare key is `isGatewayMsisdn` (`phone-normalize.ts`): 255, then 6 or 7, then eight digits. That is the shape
 * the book stores and the gateway dials, so there is ONE rule for it. ⛔ Never write a second pattern here.
 * ⛔ THE RETURN VALUE IS RAW PHONE NUMBERS. It is the HMAC's input and nothing else, computed on the server. It must
 * never be stored, logged, written into an audit row, signed into a claim or sent to the browser. Only the keyed
 * digest (`MEMBERS_KEY_HEX_CHARS` hex characters) may leave `audience-fence.ts` (U40 spec 4.17: no raw key leaves the
 * server; X13).
 */
export function canonicalMembers(keys: readonly string[], count: number): string | null {
  if (!isCount(count) || count < 1 || count > CONFIRM_ENUMERATE_MAX) return null;
  const distinct = new Set<string>();
  for (const k of keys) {
    if (typeof k !== "string" || !isGatewayMsisdn(k)) return null;
    distinct.add(k);
    if (distinct.size > CONFIRM_ENUMERATE_MAX) return null;
  }
  if (distinct.size !== count) return null;
  return [...distinct].sort().join(",");
}

/**
 * The claim the server signs, with the tier rule applied once.
 * ⛔ X13: a TYPED claim never carries a members key, even when one is handed in.
 * ⛔ A fence that could not name its members (no key, or a key of the wrong shape) is TYPED. A list is never shown
 * for people nobody listed.
 */
export function buildFenceClaim(a: {
  campaignId: string;
  draftRevision: number;
  count: number;
  unfiltered: boolean;
  membersKey: string | null;
}): FenceClaim {
  const key = isMembersKey(a.membersKey) ? a.membersKey : null;
  const listed = confirmTier(a.count, a.unfiltered) === "enumerate" && a.count >= 1 && key !== null;
  return {
    v: FENCE_CLAIM_VERSION,
    campaignId: a.campaignId,
    draftRevision: a.draftRevision,
    count: a.count,
    tier: listed ? "enumerate" : "typed",
    membersKey: listed ? key : null,
  };
}

/**
 * A claim read back after the server has verified its signature, or `null` for anything malformed. Only the six
 * fields come back, so nothing extra rides along.
 * ⛔ The shape must agree with the tier rule: an enumerate claim holds 1–5 people and a well-formed key, and a typed
 * claim holds no key.
 */
export function parseFenceClaim(raw: unknown): FenceClaim | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { v, campaignId, draftRevision, count, tier, membersKey } = raw as Record<string, unknown>;
  if (v !== FENCE_CLAIM_VERSION) return null;
  if (typeof campaignId !== "string" || campaignId === "") return null;
  if (!isCount(draftRevision) || !isCount(count)) return null;
  if (tier === "typed") {
    if (membersKey !== null) return null;
    return { v: FENCE_CLAIM_VERSION, campaignId, draftRevision, count, tier, membersKey: null };
  }
  if (tier === "enumerate" && count >= 1 && count <= CONFIRM_ENUMERATE_MAX && isMembersKey(membersKey)) {
    return { v: FENCE_CLAIM_VERSION, campaignId, draftRevision, count, tier, membersKey };
  }
  return null;
}

/* ══ THE DECISION (OD27) ══════════════════════════════════════════════════════════════════════════ */

export const CONFIRM_REFUSAL_REASONS = [
  "audience_moved",
  "typed_mismatch",
  "typed_required",
  "audience_empty",
  "stale_view",
  "draft_changed",
  "not_draft",
] as const;
export type ConfirmRefusalReason = (typeof CONFIRM_REFUSAL_REASONS)[number];

/** ⭐ `not_draft` is never `decideConfirm`'s answer. The status is read and written in ONE conditional statement
 *  (the DAL's confirm), and a pure check made beforehand would be a second reading that can race. */
export type DecideRefusalReason = Exclude<ConfirmRefusalReason, "not_draft">;

/** Every way a confirmation can come back refused, including a campaign that no longer exists. */
export type ConfirmOutcomeReason = ConfirmRefusalReason | "not_found";

/** What a confirmation freezes that THIS rule decides: the count, tier, watermark and revision columns (X12, X13).
 *  ⛔ `count` is ALWAYS the server's fresh count.
 *  ⚠️ It is NOT the whole freeze. The service also freezes `estimateSegments`/`estimateTzs` (X15), U39's
 *  `campaignEstimate` over the STORED segment counts (`savedVariantSizes`) × `freeze.count`. That estimate is the
 *  spend ceiling. It is not decided here because it needs the stored row. */
export type ConfirmFreeze = {
  count: number;
  tier: ConfirmTier;
  /** X13: the keyed members key on the enumerate tier, NULL on the typed tier. */
  audienceWatermark: string | null;
  draftRevision: number;
};

export type ConfirmDecision =
  | { ok: true; freeze: ConfirmFreeze }
  | { ok: false; reason: DecideRefusalReason; freshCount: number; freshTier: ConfirmTier; shownCount: number | null };

/**
 * The tier a claim is HELD to. ⛔ It can only be raised. A claim that says "enumerate" for more than 5 people, or
 * says it without a well-formed members key, is held to the typed test. Otherwise `null === null` would pass the
 * members comparison for people nobody listed.
 */
function heldTier(c: FenceClaim): ConfirmTier {
  return c.tier === "enumerate" && isCount(c.count) && c.count >= 1 && c.count <= CONFIRM_ENUMERATE_MAX && isMembersKey(c.membersKey)
    ? "enumerate"
    : "typed";
}

/**
 * ⭐ THE GATE (OD27). `fresh` is the claim the server has just recomputed. `shown` is the signed claim the
 * officer's modal was opened on (null when it is missing or fails verification). `typed` is the text the modal armed
 * on. The checks run in this ORDER:
 *   ① nobody in the audience → `audience_empty`;
 *   ② no view, another campaign's view, or a claim in another format version (`v`) → `stale_view`;
 *   ③ a view of another draft revision → `draft_changed`;
 *   ④ enumerate: accepted only if the SAME people are there (count and members key), else `audience_moved`;
 *   ⑤ typed: accepted only if the typed number equals `fresh.count`. That is the ONLY acceptance test, and the
 *      count inside `shown` plays no part in it. Otherwise `audience_moved` if the audience moved since the view,
 *      else `typed_required` if nothing readable was typed, else `typed_mismatch`.
 * Confirmation is EQUALITY: an audience that shrank is refused as well. OD28's "fewer goes ahead" belongs to Start.
 */
export function decideConfirm(a: { fresh: FenceClaim; shown: FenceClaim | null; typed: string | null }): ConfirmDecision {
  const { fresh, shown } = a;
  const tier = heldTier(fresh);
  const refuse = (reason: DecideRefusalReason): ConfirmDecision => ({
    ok: false,
    reason,
    freshCount: fresh.count,
    freshTier: tier,
    shownCount: shown === null ? null : shown.count,
  });

  if (fresh.count === 0) return refuse("audience_empty");
  if (shown === null || shown.v !== FENCE_CLAIM_VERSION || shown.campaignId !== fresh.campaignId) return refuse("stale_view");
  if (shown.draftRevision !== fresh.draftRevision) return refuse("draft_changed");

  const freeze: ConfirmFreeze = {
    count: fresh.count,
    tier,
    audienceWatermark: tier === "enumerate" ? fresh.membersKey : null,
    draftRevision: fresh.draftRevision,
  };

  if (tier === "enumerate") {
    return shown.count === fresh.count && shown.membersKey === fresh.membersKey ? { ok: true, freeze } : refuse("audience_moved");
  }

  const typed = parseTypedCount(a.typed);
  if (typed !== null && typed === fresh.count) return { ok: true, freeze };
  if (shown.count !== fresh.count) return refuse("audience_moved");
  return refuse(typed === null ? "typed_required" : "typed_mismatch");
}

/**
 * The conditional write found nothing to change, so the row is read again to say why. No row means `not_found`. A
 * row no longer in DRAFT means `not_draft` (another officer confirmed it first). A row still in DRAFT means its
 * revision moved (`draft_changed`).
 */
export function confirmWriteRefusal(reread: { status: string } | null): "not_found" | "not_draft" | "draft_changed" {
  if (reread === null) return "not_found";
  return reread.status === "DRAFT" ? "draft_changed" : "not_draft";
}

/* ══ START (OD28) ═════════════════════════════════════════════════════════════════════════════════ */

export type StartAudienceVerdict =
  | { ok: true; shrunkBy: number }
  | { ok: false; reason: "audience_moved"; freshCount: number; confirmedCount: number };

/**
 * ⭐ OD28, for U42 to call before its first recipient row. `confirmed*` are the frozen columns (`audienceCount`,
 * `confirmTier`, `audienceWatermark`). `fresh` is the campaign population counted now, through the same walk, with
 * its members key whenever the confirmation was enumerated.
 *   · MORE people than were confirmed → `audience_moved`, and nothing is sent. That is money nobody approved.
 *   · the same or fewer → go ahead, reporting `shrunkBy`. A typed confirmation approved a ceiling.
 *   · ENUMERATE → ANY change of people refuses, even to fewer. The list approved THOSE people, and a keyed set cannot
 *     show that the new people are a subset of them.
 * ⛔ It fails closed: an unreadable count refuses, and so does an enumerated confirmation stored without its watermark
 * (`null === null` must never pass). A tier that is not exactly `"typed"` is held to the enumerate test.
 */
export function startAudienceVerdict(a: {
  confirmedCount: number;
  confirmedTier: ConfirmTier;
  confirmedWatermark: string | null;
  fresh: { count: number; membersKey: string | null };
}): StartAudienceVerdict {
  const moved = (): StartAudienceVerdict => ({
    ok: false,
    reason: "audience_moved",
    freshCount: a.fresh.count,
    confirmedCount: a.confirmedCount,
  });
  if (!isCount(a.confirmedCount) || !isCount(a.fresh.count)) return moved();
  if (a.fresh.count > a.confirmedCount) return moved();
  if (a.confirmedTier !== "typed") {
    if (!isMembersKey(a.confirmedWatermark) || a.fresh.membersKey !== a.confirmedWatermark) return moved();
  }
  return { ok: true, shrunkBy: a.confirmedCount - a.fresh.count };
}

/* ══ THE STORED TIER ══════════════════════════════════════════════════════════════════════════════ */

export type ConfirmTierColumn = "ENUMERATE" | "TYPED";

/** How `SmsCampaign.confirmTier` spells each tier. U40a writes it and U42 reads it back through `confirmTierFromColumn`.
 *  ⚠️ A TEXT column (U35b), deliberately not a Postgres enum: a tier added later is then not a 55P04 two-step, and this
 *  reader already refuses anything else. */
export const CONFIRM_TIER_COLUMN: Readonly<Record<ConfirmTier, ConfirmTierColumn>> = {
  enumerate: "ENUMERATE",
  typed: "TYPED",
};

/** The column read back as a tier, or `null` for anything else. ⛔ A caller that gets `null` refuses. */
export function confirmTierFromColumn(v: unknown): ConfirmTier | null {
  if (v === CONFIRM_TIER_COLUMN.enumerate) return "enumerate";
  if (v === CONFIRM_TIER_COLUMN.typed) return "typed";
  return null;
}

/* ══ THE SENTENCES ════════════════════════════════════════════════════════════════════════════════ */

const people = (n: number) => adminCount(n, "person", "people");

/**
 * ONE sentence per refusal, in English (the console's chrome). ⭐ Every one says that nothing was confirmed, sent or
 * changed: a refused confirmation must never read as a half-done one. `fresh` is the server's count now, and `shown`
 * the count the officer's view carried.
 * The number to type is written as the modal arms on it, `confirmTypedWord` with bare digits. Every other figure is
 * grouped.
 */
export const CONFIRM_REFUSAL_COPY: Readonly<Record<ConfirmOutcomeReason, (n: { fresh: number | null; shown: number | null }) => string>> = {
  audience_moved: ({ fresh, shown }) => {
    const lead = "The audience changed while you were confirming.";
    const tail = "Nothing was confirmed or sent.";
    if (fresh === null) return `${lead} ${tail}`;
    if (shown === null) return `${lead} It is now ${people(fresh)}. ${tail}`;
    if (shown === fresh) return `${lead} It is still ${people(fresh)}, but not the same ones. ${tail}`;
    return `${lead} It is now ${people(fresh)} (was ${formatNumber(shown)}). ${tail}`;
  },
  typed_mismatch: ({ fresh }) =>
    fresh === null
      ? "That isn't the number of people on this campaign. Nothing was confirmed."
      : `That isn't the number of people on this campaign. Type ${confirmTypedWord(fresh)} to confirm. Nothing was confirmed.`,
  typed_required: ({ fresh }) =>
    fresh === null
      ? "Type the number of people on this campaign to confirm. Nothing was confirmed."
      : `Type ${confirmTypedWord(fresh)} to confirm, the number of people on this campaign. Nothing was confirmed.`,
  audience_empty: () => "Nobody matches this audience now, so there is nothing to confirm. Nothing was sent.",
  stale_view: () => "This confirmation is out of date. Open it again to see the current audience. Nothing was confirmed.",
  draft_changed: () => "This draft was edited since you opened it. Review it again. Nothing was confirmed.",
  not_draft: () => "This campaign is no longer a draft. It has already been confirmed or closed. Nothing was changed.",
  not_found: () => "This campaign no longer exists. Nothing was confirmed.",
};
