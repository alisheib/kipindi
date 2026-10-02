/**
 * U35b · THE CAMPAIGN TABLES' RULES — the ONE rule set both DAL twins ask before they write a campaign or a
 * recipient (`db.smsCampaign`, `db.smsCampaignRecipient` in `store.ts` and `prisma-dal.ts`). Decisions X8, X12–X15,
 * M5, M6; the plan's §9 "U35 · Campaign models".
 *
 * ⭐ WHY A MODULE OF ITS OWN. Every behavioural suite runs on the MEMORY twin, so a rule written twice is a rule that
 * holds in tests and drifts in production. Each twin calls these functions BEFORE its first write (`test:dal-parity`
 * §26 holds the call and its place); `test:campaign-models` §2.9–§2.11 execute the refusals below one input at a time
 * (the load-bearing ones each with a red plant that deletes it), and §2.1–§2.8 drive the twins over them.
 *
 * ── THE FOUR DOORS A CAMPAIGN KEY CAN HAVE (`SMS_CAMPAIGN_KEY_RULE`) ──────────────────────────────────────────
 *   · fixed   — written once at birth, or only by the DAL itself: the id, the provenance, the status (it moves only as
 *               a transition's `to`), `draftRevision` (the draft save moves it) and `updatedAt` (the caller's `at`).
 *   · draft   — what the officer composes. Changed ONLY by `update`, ONLY while the row is a DRAFT, and ONLY on the
 *               `draftRevision` the officer was looking at — the ONE optimistic mechanism (X12).
 *   · confirm — what the confirmation fixes (U40, X13, X15). Written ONLY by the move DRAFT → CONFIRMED, on the
 *               revision the officer saw, all of it at once — and never again.
 *   · engine  — the send's own progress and stamps (U42, U43, U47). Written by a transition, always conditional on the
 *               status the writer expects, never on a finished campaign.
 * ⛔ THE FROZEN KEYS are `draft` ∪ `confirm`: no door reaches them once the row has left DRAFT, so a confirmed scope
 * can never be widened and the estimate a confirmation froze is the one the campaign spends against.
 *
 * ── THE STATUS MOVES ONLY BY A CONDITIONAL TRANSITION (ONE WINNER) ────────────────────────────────────────────
 * A transition names the statuses it moves FROM, and the twins apply it only to a row still in one of them (the Prisma
 * twin in ONE conditional `updateMany`). `to` may never be in `from` — two racing writers would then BOTH win, the
 * second finding the row already where it wanted it. Every move is in `SMS_CAMPAIGN_MOVES`: a DRAFT only becomes
 * CONFIRMED or CANCELLED (no campaign skips its confirmation), nothing returns to DRAFT, and nothing at all is
 * written to a DONE or CANCELLED campaign. ⚠️ A later unit that needs another move adds it here, with its test.
 *
 * ── VALUES ───────────────────────────────────────────────────────────────────────────────────────────────────────
 * Every key's value is checked (`SMS_CAMPAIGN_VALUE`), because the memory twin keeps whatever it is handed while
 * Postgres refuses or reshapes it: an instant is exactly `toISOString()`'s spelling (what Prisma hands back), money
 * has at most two decimals (Decimal(18,2)), counts are whole numbers within INTEGER, the tier is U40's spelling, the
 * watermark is U40's keyed hex, and the cursor is X8's `b:<id>` · `p:<id>` · `done` — an id never made of digits
 * alone, so no phone number ever forms a cursor. (Its MEANING is parsed in `audience.ts` only.)
 *
 * ── RECIPIENTS ───────────────────────────────────────────────────────────────────────────────────────────────────
 * A batch is refused WHOLE before anything is written when it holds more than `SMS_CAMPAIGN_SEED_CHUNK_MAX` seeds, a
 * number that is not the ONE bare key (`isGatewayMsisdn`), two seeds sharing an id, or a key outside the seed. A seed
 * carries nothing that settles a row — no status, no `smsReference` — because the Prisma twin writes with
 * `skipDuplicates`, whose ON CONFLICT DO NOTHING has no target: a settle key colliding would drop a person silently.
 * Counts are a groupBy, zero-filled here into every status in the schema's order (OD26: no counters).
 *
 * ⛔ PURE, AND NOTHING AT RUNTIME COMES FROM THE STORE OR THE CONSOLE'S UI LIBRARIES. `store.ts` and `prisma-dal.ts`
 * both import this file, so a runtime import back into `store.ts` would be a cycle through the DAL switch: types only
 * (erased). `campaign-confirm.ts` is reached for its TYPE only, and `test:campaign-models` 2.11 holds the watermark
 * length here equal to its `MEMBERS_KEY_HEX_CHARS`.
 * ⛔ No message thrown here ever carries a phone number (§5.14) — a seed is named by its position.
 *
 * Guards: `npm run test:campaign-models` (§2) · `npm run test:dal-parity` (§26).
 */
import type {
  StoredSmsCampaign, SmsCampaignStatus, SmsCampaignRecipientStatus, SmsCampaignDraftPatch, SmsCampaignDraftGuard,
  SmsCampaignTransition, SmsCampaignTransitionPatch, SmsCampaignRecipientSeed, SmsCampaignRecipientCount,
} from "@/lib/server/store";
import type { SmsEncoding } from "@/lib/sms-compose";
import type { ConfirmTierColumn } from "@/lib/marketing/campaign-confirm";
import { isGatewayMsisdn } from "@/lib/phone-normalize";

/* ══ THE STATUSES AND THEIR MOVES ════════════════════════════════════════════════════════════════════════════ */

/** Every campaign status, in the schema's order. A Record, so a status added to the union and forgotten here is a
 *  compile error rather than a value the transition check silently refuses. */
const CAMPAIGN_STATUS_SET: Readonly<Record<SmsCampaignStatus, true>> = {
  DRAFT: true, CONFIRMED: true, PREPARING: true, RUNNING: true, PAUSED: true, DONE: true, CANCELLED: true,
};
export const SMS_CAMPAIGN_STATUSES = Object.freeze(Object.keys(CAMPAIGN_STATUS_SET)) as readonly SmsCampaignStatus[];

/** Every recipient status, in the schema's order — the order `fillRecipientCounts` returns them in. */
const RECIPIENT_STATUS_SET: Readonly<Record<SmsCampaignRecipientStatus, true>> = {
  PENDING: true, HELD: true, SENT: true, DELIVERED: true, FAILED: true, SKIPPED: true,
};
export const SMS_CAMPAIGN_RECIPIENT_STATUSES = Object.freeze(Object.keys(RECIPIENT_STATUS_SET)) as readonly SmsCampaignRecipientStatus[];

/** ⛔ Nothing leaves these, and nothing is written to a row in them: history, not a state to resume from. */
export const SMS_CAMPAIGN_TERMINAL: readonly SmsCampaignStatus[] = Object.freeze(["DONE", "CANCELLED"] as SmsCampaignStatus[]);

/**
 * ⭐ EVERY MOVE A CAMPAIGN MAY MAKE — the plan's lifecycle (Start: CONFIRMED → PREPARING; the enqueue done: → RUNNING;
 * Pause, Resume, Stop; the slice finishing: → DONE). A DRAFT is only confirmed or cancelled; nothing returns to DRAFT;
 * the terminal statuses go nowhere. A Record, so a new status has to be given its moves.
 */
export const SMS_CAMPAIGN_MOVES: Readonly<Record<SmsCampaignStatus, readonly SmsCampaignStatus[]>> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["RUNNING", "PAUSED", "CANCELLED"],
  RUNNING: ["PAUSED", "DONE", "CANCELLED"],
  PAUSED: ["PREPARING", "RUNNING", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

/** The two character sets, as `sms-compose.ts` spells them. A Record, so a third would be a compile error here. */
const CODING_SET: Readonly<Record<SmsEncoding, true>> = { GSM7: true, UCS2: true };
/** U40's tier spelling (`CONFIRM_TIER_COLUMN`), held to its TYPE so a new tier is a compile error here. */
const TIER_SET: Readonly<Record<ConfirmTierColumn, true>> = { ENUMERATE: true, TYPED: true };
/** U40's keyed members key: lowercase hex of this length (`MEMBERS_KEY_HEX_CHARS`, campaign-confirm.ts — equal by test). */
export const SMS_CAMPAIGN_WATERMARK_HEX_CHARS = 32;

/* ══ THE KEYS AND THEIR DOORS ════════════════════════════════════════════════════════════════════════════════ */

export type SmsCampaignKeyRule = "fixed" | "draft" | "confirm" | "engine";

/**
 * ⭐ EVERY CAMPAIGN KEY, AND THE ONE DOOR THAT MAY WRITE IT. `satisfies` a Record over the whole stored shape, so a
 * column added to `StoredSmsCampaign` and not given a door here is a compile error — never a key that one twin writes
 * and the other refuses.
 */
export const SMS_CAMPAIGN_KEY_RULE = {
  id: "fixed",
  status: "fixed",
  draftRevision: "fixed",
  createdBy: "fixed",
  createdAt: "fixed",
  updatedAt: "fixed",
  name: "draft",
  bodySw: "draft",
  bodyEn: "draft",
  codingSw: "draft",
  segmentsSw: "draft",
  codingEn: "draft",
  segmentsEn: "draft",
  nameFallbackSw: "draft",
  nameFallbackEn: "draft",
  sourcePhrase: "draft",
  audienceFilter: "draft",
  audienceCount: "confirm",
  confirmTier: "confirm",
  audienceWatermark: "confirm",
  estimateSegments: "confirm",
  estimateTzs: "confirm",
  budgetTzs: "confirm",
  confirmedBy: "confirm",
  confirmedAt: "confirm",
  enqueueCursor: "engine",
  enqueuedAt: "engine",
  stopReason: "engine",
  startedAt: "engine",
  pausedAt: "engine",
  finishedAt: "engine",
} as const satisfies Record<keyof StoredSmsCampaign, SmsCampaignKeyRule>;

type CampaignKey = keyof typeof SMS_CAMPAIGN_KEY_RULE;
const ALL_KEYS = Object.keys(SMS_CAMPAIGN_KEY_RULE) as CampaignKey[];
const ruleOf = (k: string): SmsCampaignKeyRule | undefined =>
  Object.prototype.hasOwnProperty.call(SMS_CAMPAIGN_KEY_RULE, k) ? SMS_CAMPAIGN_KEY_RULE[k as CampaignKey] : undefined;
const keysWithRule = (r: SmsCampaignKeyRule): CampaignKey[] => ALL_KEYS.filter((k) => SMS_CAMPAIGN_KEY_RULE[k] === r);

/** What the officer composes — `update`'s keys, and nothing else. */
export const SMS_CAMPAIGN_DRAFT_KEYS: readonly CampaignKey[] = Object.freeze(keysWithRule("draft"));
/** What the confirmation fixes — written by the move DRAFT → CONFIRMED, once. */
export const SMS_CAMPAIGN_CONFIRM_KEYS: readonly CampaignKey[] = Object.freeze(keysWithRule("confirm"));
/** The send's own progress and stamps — a transition's keys, never on a finished campaign. */
export const SMS_CAMPAIGN_ENGINE_KEYS: readonly CampaignKey[] = Object.freeze(keysWithRule("engine"));
/** ⛔ THE FROZEN KEYS: they change only while the campaign is a DRAFT (the plan's "frozen keys change only in DRAFT"). */
export const SMS_CAMPAIGN_FROZEN: readonly CampaignKey[] = Object.freeze([...SMS_CAMPAIGN_DRAFT_KEYS, ...SMS_CAMPAIGN_CONFIRM_KEYS]);
const FROZEN_SET: ReadonlySet<string> = new Set<string>(SMS_CAMPAIGN_FROZEN);
const CONFIRM_SET: ReadonlySet<string> = new Set<string>(SMS_CAMPAIGN_CONFIRM_KEYS);

/* ── compile-time: the store's two named patch types name EXACTLY the keys this table gives their door ── */
type KeysWith<R extends SmsCampaignKeyRule> = {
  [K in CampaignKey]: (typeof SMS_CAMPAIGN_KEY_RULE)[K] extends R ? K : never;
}[CampaignKey];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
/** ⛔ A compile error the day `SmsCampaignDraftPatch` or `SmsCampaignTransitionPatch` (store.ts) and the table above
 *  disagree about a key — the types callers see and the rules the twins enforce are one partition. */
export type SmsCampaignPatchTypesAgree = [
  Assert<Same<keyof SmsCampaignDraftPatch, KeysWith<"draft">>>,
  Assert<Same<keyof SmsCampaignTransitionPatch, KeysWith<"confirm" | "engine">>>,
];

/* ══ THE VALUES ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every refusal goes through here, so each one names the member it guards. A refused write changes NOTHING. */
function refuse(where: string, why: string): never {
  throw new Error(`[campaign-model] ${where}: ${why} — nothing was written.`);
}
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isText = (v: unknown): v is string => typeof v === "string";
const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
/** ⭐ EXACTLY `toISOString()`'s spelling — what Prisma hands back — so the two twins hold one string for one instant.
 *  ("1" or a date without its time would be read by `Date.parse` and come back from Postgres changed.) */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const isInstant = (v: unknown): v is string =>
  typeof v === "string" && ISO_INSTANT.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
/** Postgres INTEGER's ceiling. Every whole-number campaign column is INTEGER: a larger number is kept by the memory
 *  twin and refused (22003) by Postgres, so it is refused here, in both. */
const INT4_MAX = 2147483647;
const isRevision = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= INT4_MAX;
const isCount = isRevision;
const isPositive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= INT4_MAX;
/** Decimal(18,2): finite, not negative, within the column, and at most two decimals — or Postgres would round it. */
const isMoney = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e16 && Math.round(v * 100) / 100 === v;
const isCoding = (v: unknown): v is SmsEncoding => typeof v === "string" && own(CODING_SET, v);
const isTier = (v: unknown): v is ConfirmTierColumn => typeof v === "string" && own(TIER_SET, v);
const WATERMARK = new RegExp(`^[0-9a-f]{${SMS_CAMPAIGN_WATERMARK_HEX_CHARS}}$`);
const isWatermark = (v: unknown): v is string => typeof v === "string" && WATERMARK.test(v);
const isCampaignStatus = (v: unknown): v is SmsCampaignStatus => typeof v === "string" && own(CAMPAIGN_STATUS_SET, v);
/** X8's cursor SHAPE: `done`, or `b:` / `p:` and an id of the store's id shape that is not digits alone (a phone
 *  number is never a cursor). ⚠️ The MEANING is `audience.ts`'s alone. */
const isCursor = (v: unknown): v is string =>
  typeof v === "string" && (v === "done" || (/^[bp]:[A-Za-z0-9_-]{1,64}$/.test(v) && !/^\d+$/.test(v.slice(2))));
type ValueRule = (v: unknown) => boolean;
const orNull = (r: ValueRule): ValueRule => (v) => v === null || r(v);

/** ⭐ EVERY KEY'S VALUE. `audienceFilter` has its own reader below (its refusals say why). */
export const SMS_CAMPAIGN_VALUE = {
  id: isNonEmpty,
  status: isCampaignStatus,
  draftRevision: isRevision,
  createdBy: isNonEmpty,
  createdAt: isInstant,
  updatedAt: isInstant,
  name: isText,
  bodySw: isNonEmpty,
  bodyEn: orNull(isNonEmpty),
  codingSw: isCoding,
  segmentsSw: isPositive,
  codingEn: orNull(isCoding),
  segmentsEn: orNull(isPositive),
  nameFallbackSw: orNull(isText),
  nameFallbackEn: orNull(isText),
  sourcePhrase: orNull(isText),
  audienceFilter: isText,
  audienceCount: orNull(isPositive),
  confirmTier: orNull(isTier),
  audienceWatermark: orNull(isWatermark),
  estimateSegments: orNull(isCount),
  estimateTzs: orNull(isMoney),
  budgetTzs: orNull(isMoney),
  confirmedBy: orNull(isNonEmpty),
  confirmedAt: orNull(isInstant),
  enqueueCursor: orNull(isCursor),
  enqueuedAt: orNull(isInstant),
  stopReason: orNull(isNonEmpty),
  startedAt: orNull(isInstant),
  pausedAt: orNull(isInstant),
  finishedAt: orNull(isInstant),
} as const satisfies Record<keyof StoredSmsCampaign, ValueRule>;

/** The keys a patch actually SETS. A key holding `undefined` sets nothing — in either twin (Prisma ignores it). */
function setKeys(patch: object): string[] {
  return Object.entries(patch).filter(([, v]) => v !== undefined).map(([k]) => k);
}
function assertValues(where: string, o: Record<string, unknown>, keys: readonly string[]): void {
  for (const k of keys) {
    const rule = (SMS_CAMPAIGN_VALUE as Record<string, ValueRule>)[k];
    if (rule === undefined || !rule(o[k])) refuse(where, `"${k}" holds a value its column cannot take`);
  }
}

/** ⛔ Does this patch reach a frozen key? No door writes one outside DRAFT. */
export function touchesFrozen(patch: Partial<StoredSmsCampaign>): boolean {
  return setKeys(patch).some((k) => FROZEN_SET.has(k));
}

/* ══ THE AUDIENCE COLUMN ═════════════════════════════════════════════════════════════════════════════════════ */

/**
 * `audienceFilter` holds U24's canonical key (`contactAudienceKey`, X13): a compact JSON OBJECT. ⛔ Never a list, and
 * never a filter with an `ids` arm — a ticked selection is a list of people in disguise, and a campaign's audience is
 * a FILTER, re-resolved at send time (the plan: "a filter, never a list of ids").
 * ⚠️ This checks the column's SHAPE only. What a filter MEANS, and the ONE key order, are `audience.ts`'s alone
 * (`parseContactAudienceJson`, `contactAudienceKey`) — U37's save stores the canonical key it returns; this module
 * never imports it (it reads the store).
 */
export function assertAudienceFilter(text: unknown, where: string): void {
  if (typeof text !== "string") refuse(where, "audienceFilter is U24's canonical key, a string");
  let parsed: unknown = undefined;
  try {
    parsed = JSON.parse(text);
  } catch {
    refuse(where, "audienceFilter is not JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    refuse(where, "audienceFilter is a filter object (U24's canonical key), never a list");
  }
  if (JSON.stringify(parsed) !== text) refuse(where, "audienceFilter is stored in its ONE spelling — contactAudienceKey's compact output");
  if (own(parsed, "ids")) refuse(where, "a campaign's audience is a FILTER, never a list of ids (X13) — an ids arm is refused");
}

/** ⭐ A BODY TRAVELS WITH ITS SAVED VERDICT. The estimate is priced from the stored coding and segment count (X15),
 *  so a body written without them — or with them for another body — prices a message nobody will send. English is
 *  present or absent as a whole: all three null, or all three set. */
function assertVariantPairs(where: string, o: Record<string, unknown>, whole: boolean): void {
  const triple = (b: string, c: string, s: string) => [b, c, s].filter((k) => whole || o[k] !== undefined);
  const sw = triple("bodySw", "codingSw", "segmentsSw");
  if (sw.length !== 0 && sw.length !== 3) refuse(where, "bodySw, codingSw and segmentsSw are saved together");
  const en = triple("bodyEn", "codingEn", "segmentsEn");
  if (en.length !== 0 && en.length !== 3) refuse(where, "bodyEn, codingEn and segmentsEn are saved together");
  if (en.length === 3) {
    const nulls = ["bodyEn", "codingEn", "segmentsEn"].filter((k) => o[k] === null).length;
    if (nulls !== 0 && nulls !== 3) refuse(where, "an English body and its coding and segments are all set or all null");
  }
}

/* ══ THE CAMPAIGN DOORS ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * `create` · a campaign is BORN A BLANK DRAFT: exactly the stored keys (none extra, none missing), status DRAFT,
 * revision 0, every value its column can take — and nothing a later step writes: no confirmation, no estimate, no
 * budget, no cursor, no stamp. A row born confirmed would be a scope nobody confirmed.
 */
export function assertNewCampaign(row: StoredSmsCampaign): void {
  const where = "smsCampaign.create";
  if (row === null || typeof row !== "object") refuse(where, "the row is not an object");
  const keys = Object.keys(row);
  const extra = keys.filter((k) => ruleOf(k) === undefined);
  const missing = ALL_KEYS.filter((k) => !own(row, k) || row[k] === undefined);
  if (extra.length) refuse(where, `"${extra[0]}" is not a campaign column`);
  if (missing.length) refuse(where, `"${missing[0]}" is missing — every column is written at birth`);
  if (row.status !== "DRAFT") refuse(where, "a campaign is born a DRAFT");
  if (row.draftRevision !== 0) refuse(where, "a new draft starts at draftRevision 0");
  for (const k of [...SMS_CAMPAIGN_CONFIRM_KEYS, ...SMS_CAMPAIGN_ENGINE_KEYS]) {
    if (row[k] !== null) refuse(where, `"${k}" is written by a later step, never at birth`);
  }
  const o = row as unknown as Record<string, unknown>;
  assertValues(where, o, ALL_KEYS);
  assertVariantPairs(where, o, true);
  assertAudienceFilter(row.audienceFilter, where);
}

/**
 * `update` · U37's DRAFT SAVE — the only door for the officer's composition. ⛔ It carries the `draftRevision` it was
 * made on (the twins write only while the row is still a DRAFT on that revision, and move it on by one), it names draft
 * keys ONLY (a status, a confirmation field or an engine field is refused by name — those are transitions), each value
 * is one its column can take (a NOT NULL column cannot be emptied), a body travels with its saved verdict, and `at`
 * — stamped as `updatedAt` by both twins — is an instant in `toISOString()`'s spelling.
 */
export function assertDraftPatch(patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string): void {
  const where = "smsCampaign.update";
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
  if (patch === null || typeof patch !== "object") refuse(where, "the patch is not an object");
  const keys = setKeys(patch);
  if (keys.length === 0) refuse(where, "a draft save with nothing in it");
  for (const k of keys) {
    const rule = ruleOf(k);
    if (rule === undefined) refuse(where, `"${k}" is not a campaign column`);
    if (k === "status") refuse(where, "a status moves only through transition(), conditionally");
    if (rule === "fixed") refuse(where, `"${k}" is never patched`);
    if (rule !== "draft") refuse(where, `"${k}" is written by transition(), never by a draft save`);
  }
  if (guard === null || typeof guard !== "object" || !isRevision(guard.draftRevision)) {
    refuse(where, "a draft save carries the draftRevision it was made on — the ONE optimistic mechanism");
  }
  const o = patch as Record<string, unknown>;
  assertValues(where, o, keys);
  assertVariantPairs(where, o, false);
  if (o.audienceFilter !== undefined) assertAudienceFilter(o.audienceFilter, where);
}

/**
 * `transition` · THE ONLY WAY A STATUS MOVES, and the door for the confirmation and every engine field.
 * ⛔ `from` is the condition: the twins write only a row still in it, so of two racing writers ONE wins — which is why
 * `to` may never be in `from`. Every move is in `SMS_CAMPAIGN_MOVES`; nothing is written to a terminal campaign.
 * ⛔ THE CONFIRMATION IS ONE MOVE: the confirmation keys are written only by DRAFT → CONFIRMED, on the revision the
 * officer saw, and that move writes ALL of them — who and when, the population, the tier and its watermark, the
 * frozen segment estimate and the money estimate (null when the price is not yet measured, never left out).
 * A draft key is never a transition's: that is `update`.
 */
export function assertTransitionShape(t: SmsCampaignTransition): void {
  const where = "smsCampaign.transition";
  if (t === null || typeof t !== "object") refuse(where, "the transition is not an object");
  // ⚠️ Asked through an `unknown` alias: `Array.isArray` on the typed `t.from` would narrow it to any[] (TypeScript
  // #17002), and `SMS_CAMPAIGN_MOVES[s]` below would then be indexed with an `any` (TS7053).
  const fromList: unknown = t.from;
  if (!Array.isArray(fromList) || fromList.length === 0) {
    refuse(where, "a transition names the statuses it moves FROM — the condition IS the transition");
  }
  for (const s of t.from) if (!isCampaignStatus(s)) refuse(where, `"${String(s)}" is not a campaign status`);
  if (new Set(t.from).size !== t.from.length) refuse(where, "a status is named twice in from");
  if (t.from.some((s) => SMS_CAMPAIGN_TERMINAL.includes(s))) refuse(where, "DONE and CANCELLED are terminal — nothing is written to them");
  const fromDraftOnly = t.from.length === 1 && t.from[0] === "DRAFT";
  if (t.to !== null) {
    if (!isCampaignStatus(t.to)) refuse(where, `"${String(t.to)}" is not a campaign status`);
    if (t.to === "DRAFT") refuse(where, "nothing returns to DRAFT — a confirmed scope would reopen for widening");
    if (t.from.includes(t.to)) refuse(where, `"${t.to}" is both from and to — two racing writers would BOTH win`);
    for (const s of t.from) {
      if (!SMS_CAMPAIGN_MOVES[s].includes(t.to)) refuse(where, `${s} → ${t.to} is not a move a campaign makes`);
    }
  }
  if (t.patch === null || typeof t.patch !== "object") refuse(where, "the patch is not an object");
  const keys = setKeys(t.patch);
  for (const k of keys) {
    const rule = ruleOf(k);
    if (rule === undefined) refuse(where, `"${k}" is not a campaign column`);
    if (rule === "fixed") refuse(where, k === "status" ? "the status is the transition's `to`, never its patch" : `"${k}" is never patched`);
    if (rule === "draft") refuse(where, `"${k}" is a draft field — it changes only through update(), on the draftRevision`);
  }
  const p = t.patch as Record<string, unknown>;
  assertValues(where, p, keys);
  if (keys.some((k) => CONFIRM_SET.has(k)) && t.to !== "CONFIRMED") {
    refuse(where, "a confirmation field is written only by the move to CONFIRMED — a confirmed scope cannot be widened");
  }
  if (t.to === "CONFIRMED") {
    if (!fromDraftOnly) refuse(where, "only a DRAFT is confirmed");
    if (!isRevision(t.draftRevision)) refuse(where, "a confirmation compares the draftRevision the officer saw");
    if (!isInstant(p.confirmedAt) || !isNonEmpty(p.confirmedBy)) refuse(where, "a confirmation records who confirmed and when");
    if (!isPositive(p.audienceCount)) refuse(where, "a confirmation freezes the population it confirmed (at least one person)");
    if (!isTier(p.confirmTier)) refuse(where, "a confirmation records its tier");
    if (p.confirmTier === "TYPED" ? p.audienceWatermark !== null : !isWatermark(p.audienceWatermark)) {
      refuse(where, "the watermark is U40's keyed members key on the enumerate tier and null on the typed tier (X13)");
    }
    if (!isPositive(p.estimateSegments) || p.estimateTzs === undefined) {
      refuse(where, "a confirmation freezes its estimate (X15): the segments, and the money or null when unmeasured");
    }
  }
  if (t.draftRevision !== null && !isRevision(t.draftRevision)) refuse(where, "draftRevision is a whole number, or null");
  if (t.to === null && keys.length === 0) refuse(where, "a transition that moves nothing and writes nothing");
  if (!isInstant(t.at)) refuse(where, "at is an instant in toISOString's spelling");
}

/* ══ THE RECIPIENT DOORS ═════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The most seeds one `createMany` call takes — also U42's chunk. Postgres' bind-parameter ceiling sits near nine
 *  thousand rows at this width, so the cap keeps a 150k-recipient enqueue from finding that limit in production. */
export const SMS_CAMPAIGN_SEED_CHUNK_MAX = 1000;

/** The seed's keys, EXACTLY — nothing that settles a row (see the header). */
const SEED_KEYS: ReadonlySet<string> = new Set(["id", "campaignId", "msisdn", "contactId", "userId", "optOutToken", "createdAt"]);

/**
 * `createMany` · THE WHOLE BATCH OR NOTHING. Checked before either twin writes a row, so a refused batch leaves the
 * store exactly as it was — never a partial batch, and never the second spelling of one person (`+255…` beside `255…`
 * is two rows the unique index cannot see).
 */
export function assertSeeds(seeds: readonly SmsCampaignRecipientSeed[]): void {
  const where = "smsCampaignRecipient.createMany";
  const seedList: unknown = seeds; // an alias, so `seeds` keeps its type (`Array.isArray` would narrow it to any[])
  if (!Array.isArray(seedList)) refuse(where, "the seeds are not a list");
  if (seeds.length > SMS_CAMPAIGN_SEED_CHUNK_MAX) {
    refuse(where, `at most ${SMS_CAMPAIGN_SEED_CHUNK_MAX} seeds per call (this batch has ${seeds.length})`);
  }
  const ids = new Set<string>();
  seeds.forEach((s, i) => {
    const at = `seed ${i + 1} of ${seeds.length}`;
    if (s === null || typeof s !== "object") refuse(where, `${at} is not an object`);
    for (const k of Object.keys(s)) if (!SEED_KEYS.has(k)) refuse(where, `${at} carries "${k}" — a seed never settles a row`);
    if (!isNonEmpty(s.id)) refuse(where, `${at} has no id`);
    if (ids.has(s.id)) refuse(where, `${at} repeats an id — skipDuplicates would drop the second person silently`);
    ids.add(s.id);
    if (!isNonEmpty(s.campaignId)) refuse(where, `${at} names no campaign`);
    if (typeof s.msisdn !== "string" || !isGatewayMsisdn(s.msisdn)) {
      refuse(where, `${at} holds a number that is not the bare 255 key — the whole batch is refused`);
    }
    if (s.contactId !== null && !isNonEmpty(s.contactId)) refuse(where, `${at}'s contactId is an id or null`);
    if (s.userId !== null && !isNonEmpty(s.userId)) refuse(where, `${at}'s userId is an id or null`);
    if (s.optOutToken !== null && !isNonEmpty(s.optOutToken)) refuse(where, `${at}'s optOutToken is a token or null`);
    if (!isInstant(s.createdAt)) refuse(where, `${at}'s createdAt is not an instant in toISOString's spelling`);
  });
}

/**
 * `countByStatus` · every recipient status in the schema's order, zeros included — so a screen never has to guess
 * whether a missing status means none or unknown. ⛔ A status this code does not know REFUSES: a rail that silently
 * dropped those rows would read a campaign as further along than it is.
 */
export function fillRecipientCounts(raw: readonly SmsCampaignRecipientCount[]): SmsCampaignRecipientCount[] {
  const by = new Map<SmsCampaignRecipientStatus, number>();
  for (const r of raw) {
    if (!own(RECIPIENT_STATUS_SET, r.status)) {
      throw new Error(`[campaign-model] countByStatus: "${String(r.status)}" is a recipient status this code does not know`);
    }
    by.set(r.status, (by.get(r.status) ?? 0) + r.count);
  }
  return SMS_CAMPAIGN_RECIPIENT_STATUSES.map((status) => ({ status, count: by.get(status) ?? 0 }));
}
