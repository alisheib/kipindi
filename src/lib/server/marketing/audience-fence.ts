/**
 * ⭐ U40a · THE AUDIENCE FENCE — what the server counted, for one draft, at one moment: the population, the tier, and for
 * a listed audience a KEYED name for exactly those people (ENGINE-SPEC §4.5 decision 1; OD27, X9, X13).
 *
 * ── WHAT IT COUNTS (X9) ─────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ THE ONE WALK, NEVER A SECOND COUNT. The population is `campaignAudienceCount` — how many rows `walkCampaignAudience`
 * yields: the book ∪ the players, one row per number, a number the book holds walked once by its book row. That is what
 * the audience card counts, what the officer types, and what U42 will enqueue. ⛔ This file names no `db.` and never
 * `contactAudience`: a fence over the BOOK's count alone would confirm fewer people than the enqueue writes once the
 * player arm is on (the U29–U40 critic's X9), and every Start would then refuse, or players would go unconfirmed.
 * ⭐ The members are the walk's FIRST keys (at most `CONFIRM_ENUMERATE_MAX` + 1, so a sixth person is seen), named once
 * by the pure rule (`canonicalMembers`), which gives no name unless the walk named EXACTLY the people counted. A walk that
 * disagrees with the count (somebody joined between the two reads) therefore gives a TYPED claim — the bar only rises.
 *
 * ── WHAT LEAVES THIS FILE (X13) ─────────────────────────────────────────────────────────────────────────────────
 * ⛔ NEVER A PHONE NUMBER. The raw keys exist only inside `audienceFence`. Out go: the claim (counts, the tier, the
 * members key — 32 hex characters), the instant, and a sample of at most five rows, each the registry's mask
 * (`maskPhone`) and the operator by prefix. The sample is taken from the SAME walk as the members key, so the people an
 * officer is shown on a listed confirmation are the people the key names — never a second read that could disagree.
 * ⛔ THE MEMBERS KEY IS KEYED, NEVER A BARE DIGEST. An unkeyed hash of a one-person audience, sent to the browser, could be
 * brute-forced back to the number: about ten million candidates once the masked tail and the operator are known. So it is
 * an HMAC under a key only this server holds, domain-separated (`kp-audience-members:`), cut to 32 hex characters.
 * ⛔ AND IT IS BOUND TO ITS DRAFT (the U40a review's MAJOR). A key of the people alone is the same on every draft holding the
 * same people, and the watermark carries it in readable base64: a one-contact tag on one draft and a one-minute window of
 * player accounts on another would show the SAME key exactly when that contact is that player — "is this book contact a
 * player?", the question OD66 closed. So the HMAC also takes the draft's id and revision (`membersKeyOf`): two drafts never
 * share a key, while a re-view of the same draft at the same revision always gives the same one (OD27's list comparison).
 * And a viewer who may not read a number never receives a key at all (OD67 — the service holds their claim to typed).
 *
 * ── THE KEY AND THE SEAL ────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ KEYED FROM THE SESSION SECRET THROUGH `crypto.ts`. That module exports no raw secret, only its one sealing primitive,
 * so the fence's key is DERIVED through it: the MAC `signSession` makes over a purpose no other record carries
 * (`FENCE_KEY_PURPOSE`). Every rule of the secret is crypto.ts's own, never a second copy here: it is read lazily, a
 * production box without it throws, the build phase gets its placeholder. The key never leaves the server, and the two
 * HMACs made under it are prefixed by their domains (`kp-audience-members:`, `kp-audience-fence:`) — so a fence token is
 * not a session token, a session token is not a fence token, and a members key is neither (the `kp-preview:` precedent,
 * `journey-preview.ts`).
 * ⚠️ ROTATING `SESSION_SECRET` CHANGES EVERY MEMBERS KEY. A campaign confirmed by its list before the rotation is refused at
 * Start (OD28 compares the keys): it fails SAFE, and the officer confirms again. The operator's guide says so.
 * ⭐ THE BROWSER HOLDS A SIGNED CLAIM, never a stored one: `aw1.<base64url(json)>.<HMAC("kp-audience-fence:" + json)>`.
 * `verifyFence` answers the claim or null — the seal compared in constant time, the payload held to ONE spelling (base64
 * decodes some altered strings to the same bytes), the shape held to the pure rule (`parseFenceClaim`). It never throws.
 *
 * ⛔ IT COUNTS AND NOTHING ELSE: no audit row, no token, no message, no recipient row. It runs OUTSIDE any lock (OD21 —
 * `withLock`'s transaction has a 30 s timeout, and a 150,000-person count is a walk).
 *
 * Guard: `npm run test:campaign-gates` (§1 the tier, §2 the seal and the key, 4.16 the count, 4.18 the list, 6.1 the
 * source) · Red: `npm run red:campaign-gates` (in memory).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { signSession } from "@/lib/server/crypto";
import type { StoredSmsCampaign } from "@/lib/server/store";
import {
  parseContactAudienceJson, isUnfilteredCampaignAudience, campaignAudienceCount, walkCampaignAudience,
} from "@/lib/server/marketing/audience";
import type { AudienceParse, CampaignAudiencePage, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import {
  CONFIRM_ENUMERATE_MAX, MEMBERS_KEY_HEX_CHARS, buildFenceClaim, canonicalMembers, parseFenceClaim,
} from "@/lib/marketing/campaign-confirm";
import type { FenceClaim } from "@/lib/marketing/campaign-confirm";
import { audienceWalkCount } from "@/lib/server/marketing/audience-split";
import { maskPhone } from "@/lib/phone-normalize";
import { parseTzNumber } from "@/lib/tz-msisdn";

/* ══ THE KEY ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The token's first part — its format version. A token in any other format is refused, never read. */
export const FENCE_TOKEN_PREFIX = "aw1";
/** The two domains made under the fence's key. ⛔ Each HMAC input starts with its own, so neither can stand for the other. */
const MEMBERS_DOMAIN = "kp-audience-members:";
const FENCE_DOMAIN = "kp-audience-fence:";
/** The purpose `signSession` seals to derive the fence's key. ⛔ No other record carries it, and the key is never sent. */
const FENCE_KEY_PURPOSE = Object.freeze({ p: "kp-audience-fence-key", v: 1 });
/** A claim's JSON is ~200 characters; anything far longer is not a token this file wrote. */
const TOKEN_MAX_LEN = 1024;

/** The fence's key: derived from the session secret by crypto.ts's own seal — read every call, so a rotation is seen. */
function fenceKey(): string {
  const mac = signSession(FENCE_KEY_PURPOSE).split(".")[1];
  if (typeof mac !== "string" || mac.length < 32) throw new Error("audience fence: the session secret could not key the fence");
  return mac;
}

/** The draft a members key names people FOR: the campaign's id and the draft revision the officer was shown. */
export type MembersKeyScope = { campaignId: string; draftRevision: number };

/**
 * ⭐ THE KEYED NAME OF A LISTED AUDIENCE, FOR ONE DRAFT — the first 32 hex characters of HMAC-SHA256(the fence's key,
 * `"kp-audience-members:<campaignId>:<draftRevision>:<canonical>"`). `canonical` is `canonicalMembers`' output (the sorted
 * bare keys, each once, joined by commas — digits and commas only, so the colons cannot be read two ways): the
 * confirmation, Start and U42's enqueue all call THIS with THAT, so they can never build two different names for the same
 * people.
 * ⛔ BOUND TO THE DRAFT (see the header): two drafts never share a key; the same draft at the same revision always does.
 * ⭐ Start (U49a, ENGINE-SPEC E19) and U42's enqueue (§4.9 decision 4) recompute it from the CONFIRMED row's own `id` and
 * its frozen `draftRevision` — no save moves a revision once the row has left DRAFT — so the key either computes names the
 * draft the confirmation stored a key for.
 * ⛔ Its input is raw phone numbers: it is computed here, on the server, and only its output ever leaves.
 */
export function membersKeyOf(scope: MembersKeyScope, canonical: string): string {
  return createHmac("sha256", fenceKey())
    .update(`${MEMBERS_DOMAIN}${scope.campaignId}:${scope.draftRevision}:${canonical}`, "utf8")
    .digest("hex")
    .slice(0, MEMBERS_KEY_HEX_CHARS);
}

/* ══ THE SEAL ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const fenceMac = (json: string): string =>
  createHmac("sha256", fenceKey()).update(`${FENCE_DOMAIN}${json}`, "utf8").digest("base64url");

/** The claim's six fields in ONE order — the JSON a token carries. */
const claimJson = (c: FenceClaim): string =>
  JSON.stringify({ v: c.v, campaignId: c.campaignId, draftRevision: c.draftRevision, count: c.count, tier: c.tier, membersKey: c.membersKey });

/**
 * ⭐ THE WATERMARK the modal posts back: `aw1.<base64url(json)>.<HMAC("kp-audience-fence:" + json)>`.
 * ⛔ Only a claim the pure rule reads as well-formed is sealed — anything else THROWS, so no malformed claim is ever handed
 * to a browser as if the server had counted it.
 */
export function signFence(f: FenceClaim): string {
  const claim = parseFenceClaim(f);
  if (claim === null) throw new Error("signFence: not a well-formed fence claim — nothing was sealed");
  const json = claimJson(claim);
  return `${FENCE_TOKEN_PREFIX}.${Buffer.from(json, "utf8").toString("base64url")}.${fenceMac(json)}`;
}

/**
 * The claim a watermark carries, or null. ⛔ NULL FOR EVERYTHING THIS FILE DID NOT SEAL, and it never throws: not a string,
 * too long, another format, a part missing or extra, a payload that does not re-encode to exactly what was sent, a seal
 * that differs (compared in constant time), JSON that is not a claim (`parseFenceClaim`, which keeps the six fields only).
 * ⚠️ Another campaign's token, or an earlier view's, verifies — it was sealed here. `decideConfirm` refuses it
 * (`stale_view`, `draft_changed`, `audience_moved`); this answers only whether the server wrote it.
 */
export function verifyFence(token: string | null | undefined): FenceClaim | null {
  try {
    if (typeof token !== "string" || token.length === 0 || token.length > TOKEN_MAX_LEN) return null;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== FENCE_TOKEN_PREFIX || parts[1] === "" || parts[2] === "") return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    // ⛔ ONE SPELLING: the decoder skips characters it does not know and the last character's spare bits.
    if (Buffer.from(json, "utf8").toString("base64url") !== parts[1]) return null;
    const sent = Buffer.from(parts[2], "utf8");
    const made = Buffer.from(fenceMac(json), "utf8");
    if (sent.length !== made.length || !timingSafeEqual(sent, made)) return null;
    return parseFenceClaim(JSON.parse(json));
  } catch {
    return null;
  }
}

/* ══ THE FENCE ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** One row of the confirmation's list: the registry's mask and the operator by prefix ("Operator (by prefix)" — numbers
 *  are portable). ⛔ No id, no name, no player flag (D19), and never the number. */
export type FenceSampleRow = { masked: string; operator: string | null };

/** What the server counted: the claim it signs, when, and the walk's first rows (masked) — for a listed audience, all
 *  of them. ⛔ The fence answers for the AUDIENCE, whoever asks: what a viewer may see of it is the service's to decide
 *  (`fenceForViewer` — OD67: a viewer who may not read a number gets no list and no members key).
 *  ⭐ U40b · `waitedMs` — how long its count WAITED for one of the split door's slots (never its walk): what the trigger's
 *  read charges against `CONFIRM_SLOT_WAIT_MS` before a reader's split asks for one (the third pass). Server-side only. */
export type AudienceFence = { claim: FenceClaim; countedAt: string; sample: FenceSampleRow[]; waitedMs?: number };

/**
 * ⭐ U40b · THE MOST A CONFIRMATION WAITS FOR ONE OF THE SPLIT DOOR'S SLOTS — ONE constant, for the trigger's read (its count,
 * and what is left of it for a reader's split) and for the confirmation's own count (the U40b re-review's MINOR 3). Past it
 * nothing is counted: `AudienceSlotBusy`, said as "busy" — never a zero, and never a dialog that cannot be closed while the
 * line moves.
 */
export const CONFIRM_SLOT_WAIT_MS = 15_000;

/** ⭐ U40b · how the fence's count takes its slot: its OWN count, never joined (MINOR 2 — a count already running for this
 *  audience, an officer's or another draft's, may have begun before a contact was added, and the old typed number would
 *  confirm the old count: OD27's own case), its slot waited for at most `CONFIRM_SLOT_WAIT_MS` (MINOR 3). */
export type FenceSlot = { join: boolean; waitMs: number };
export const FENCE_SLOT: Readonly<FenceSlot> = Object.freeze({ join: false, waitMs: CONFIRM_SLOT_WAIT_MS });

/** The reads and rules the fence asks — swappable for the suite's in-process red plants; production never passes them. */
export type FenceDeps = {
  /** The population (X9): `campaignAudienceCount` — the ONE walk's row count. */
  count: (f: ContactAudienceFilter) => Promise<number>;
  /** The ONE walk, for the first keys. */
  walk: typeof walkCampaignAudience;
  /** Is this the whole of its population? (`isUnfilteredCampaignAudience`) — then it is typed at every size. */
  unfiltered: (f: ContactAudienceFilter) => boolean;
  /** The keyed name of a listed audience, for its draft (`membersKeyOf`). */
  membersKey: (scope: MembersKeyScope, canonical: string) => string;
  now: () => Date;
  /** U40b · how the count takes its slot (`FENCE_SLOT` when absent). */
  slot?: FenceSlot;
};
/** Frozen: production's fence — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const FENCE_DEPS: Readonly<FenceDeps> = Object.freeze({
  count: campaignAudienceCount,
  walk: walkCampaignAudience,
  unfiltered: isUnfilteredCampaignAudience,
  membersKey: membersKeyOf,
  now: () => new Date(),
  slot: FENCE_SLOT,
});

/**
 * A campaign's STORED audience, read at the campaign's door (U38b decision 2): its JSON through the ONE parser at the
 * campaign scope — a population the composer saved reads back. The service asks this before it counts, so an unreadable
 * filter is a refusal in words; the fence asks it again and THROWS on one (it never counts a filter it cannot read).
 */
export function readCampaignAudience(stored: string): AudienceParse {
  let raw: unknown;
  try {
    raw = JSON.parse(stored);
  } catch {
    return { ok: false, param: "filter", reason: "The saved audience is not JSON." };
  }
  return parseContactAudienceJson(raw, "campaign");
}

/** The walk's first keys, in its own order — at most `CONFIRM_ENUMERATE_MAX` + 1, so a sixth person is seen. A page may
 *  hold fewer rows than asked (even none), and only `done` ends the walk. */
async function firstKeys(f: ContactAudienceFilter, walk: FenceDeps["walk"]): Promise<string[]> {
  const want = CONFIRM_ENUMERATE_MAX + 1;
  const keys: string[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page: CampaignAudiencePage = await walk(f, cursor, want);
    for (const row of page.rows) keys.push(row.msisdn);
    if (keys.length >= want || page.next === "done") return keys.slice(0, want);
    if (page.next === cursor) throw new Error("audience fence: the walk did not move — refusing to loop");
    cursor = page.next;
  }
}

/**
 * ⭐ THE FENCE — counted fresh, every call. The population through the ONE walk's count (X9); the first keys through the
 * ONE walk; a members key only for a FILTERED audience of 1–5 whose walk named exactly the people counted, keyed for THIS
 * draft at THIS revision; the claim built by the pure rule (`buildFenceClaim`: typed unless listed, and a typed claim
 * never carries a key). The sample is the walk's first rows, masked: every person on a listed audience, the first five in
 * sending order otherwise.
 * ⛔ A filter it cannot read, or a read that fails, THROWS — never a zero, never a guess.
 */
export async function audienceFence(
  c: Pick<StoredSmsCampaign, "id" | "draftRevision" | "audienceFilter">,
  deps: FenceDeps = FENCE_DEPS,
): Promise<AudienceFence> {
  const read = readCampaignAudience(c.audienceFilter);
  if (!read.ok) throw new Error(`audience fence: the saved audience could not be read (${read.param})`);
  const filter = read.filter;
  // ⭐ U40b · THE COUNT TAKES THE SPLIT DOOR'S SLOTS (`audienceWalkCount`): at most AUDIENCE_SPLITS_PER_PROCESS walks at
  // once — the pool is shared with bets. Its OWN count, never joined, its slot waited for at most CONFIRM_SLOT_WAIT_MS
  // (`FENCE_SLOT`): past it `AudienceSlotBusy` THROWS — nothing counted. Still the ONE walk's count.
  const slot = deps.slot ?? FENCE_SLOT;
  // How long the count WAITED for its slot (the door tells it) — the read's budget is charged this, never the walk.
  let waitedMs = 0;
  const count = await audienceWalkCount(filter, deps.count, { join: slot.join, waitMs: slot.waitMs, waited: (ms) => { waitedMs = ms; } });
  const keys = await firstKeys(filter, deps.walk);
  const unfiltered = deps.unfiltered(filter);
  const canonical = unfiltered ? null : canonicalMembers(keys, count);
  const claim = buildFenceClaim({
    campaignId: c.id,
    draftRevision: c.draftRevision,
    count,
    unfiltered,
    membersKey: canonical === null ? null : deps.membersKey({ campaignId: c.id, draftRevision: c.draftRevision }, canonical),
  });
  // ⭐ From the same walk as the key, each number once, masked here — the raw keys never leave this function.
  const sample = [...new Set(keys)].slice(0, CONFIRM_ENUMERATE_MAX).map((k): FenceSampleRow => ({
    masked: maskPhone(k),
    operator: parseTzNumber(k).operator?.brand ?? null,
  }));
  return { claim, countedAt: deps.now().toISOString(), sample, waitedMs };
}
