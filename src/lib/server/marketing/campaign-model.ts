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
 * ⭐ UNCONFIRMED (U43-0, ENGINE-SPEC E4) is in that order — last, where its ADD VALUE puts it — one deploy BEFORE anything
 * writes it: the counts REFUSE a status this code does not know (P8), so the knowledge ships first and alone.
 * ⭐ U16a · erasure's ONE recipient write (`unlinkUser`, the account link and only the link) and the access export's ONE
 * recipient read (`listByMsisdn`, one number from a date) ask this file first too: Prisma reads a `where` key holding
 * `undefined` as NO CONDITION, so a caller that lost its account id or its number would unlink — or export — every row
 * in the table on Postgres while the memory twin matched nobody. Both refuse that before either twin is asked.
 *
 * ── U43a · THE ENGINE'S RECIPIENT DOORS (ENGINE-SPEC §4.10 — the slice, U43b, is their caller) ─────────────────────────
 * A slice CLAIMS rows with a token (`assertClaim`, `claimWrite`), SETTLES each one by its id and the claim it expects
 * (`assertSettle`, `settleWrite`, the table `SMS_RECIPIENT_SETTLE_KEYS`), and the reaper reads stranded claims and their
 * evidence (`assertStrandedRead`, `assertTargetsRead`, `newestPerTarget`); Resume re-queues HELD rows (`requeueWrite`).
 * ⭐ ONE WRITE, TWO TWINS: every door's columns are computed HERE as an `SmsRecipientWrite` — the memory twin applies it
 * by name, the Prisma twin drives it through its column map — so the two can never write different columns, and a
 * column added to a settle that the map does not know throws instead of vanishing on Postgres.
 * ⛔ A settle writes only where the row still holds the claim it names AND is PENDING (both twins' WHERE): so a reaped
 * row's late settle is lost, never forced, and NOTHING here moves a row out of a settled status — UNCONFIRMED never goes
 * back to PENDING (the requeue takes HELD and only HELD); a late receipt is U46a's door. ⛔ Free text a settle writes —
 * a skip detail, an error, a gate trail's words — never holds a phone number (§5.14, `holdsPhoneRun`). ⛔ A claim token
 * is fresh for each claim (`refuseHeldToken`); a settle writes exactly its row of the table — never the account link
 * (`userId`), never a send instant from its own clock. What a caller owes and what these doors never do is written ONCE,
 * on the settle's type, `SmsCampaignRecipientSettle` (store.ts).
 *
 * ── U46a · THE RECEIPT DOOR (ENGINE-SPEC §4.14, E28 — the DLR route's campaign arm is its caller) ─────────────────────────
 * A delivery receipt settles its recipient through ONE door (`assertReceipt`, `receiptWrite`, `receiptMiss` and the one
 * list `SMS_RECEIPT_FROM`): only the row the message named, only while that row holds the message's number and the
 * message's reference (or none yet), and only out of PENDING, SENT or UNCONFIRMED — to DELIVERED or FAILED. ⛔ MONOTONIC:
 * a late or out-of-order receipt never moves a settled row, and a receipt only ever moves a row OUT of UNCONFIRMED (so it
 * is no UNCONFIRMED writer — `test:campaign-models` §3.2's pin stays empty for it). Its write is computed here, as every
 * door's is, and keeps the claim. `test:campaign-models` §2.29–§2.31 execute it; `test:dal-parity` §26.u46a holds both
 * twins' shape; `test:sms-dlr` §12 drives it through the route.
 *
 * ── U43b-2 · DC-4 · THE SEND RECORD (ENGINE-SPEC §4.13 decision 6 — the slice is its one caller) ──────────────────────────
 * When a receipt beats the slice's settle, the row is DELIVERED or FAILED under the slice's claim and the SENT patch is
 * `lost`; ONE narrow door (`assertSendRecord`, `sendRecordWrite`, the list `SMS_SEND_RECORD_FROM`) writes what the patch
 * carried — the trail, the token, the variant, the size, the length, the hand-over instant — and NEVER the status, only
 * where the row still holds THAT claim, is DELIVERED or FAILED and its trail is still null. `test:campaign-models` §2.32
 * executes it; `test:dal-parity` §26.u43b holds both twins' shape; `test:marketing-engine` S16 drives it through a slice.
 *
 * ── U48a · THE RESULTS' TWO READS (ENGINE-SPEC §4.16 — the live page's results card is their one caller) ───────────────────
 * `countSentBefore` (E5: how many SENT rows were handed over before an instant) and `handedOverPage` (E30: a keyset page of
 * the people a campaign handed a message to, by number) ask this file first too (`assertSentBeforeRead`,
 * `assertHandedOverRead`): a missing campaign id is NO CONDITION on Postgres. Both only read. `test:campaign-models` §2.33
 * executes them; `test:dal-parity` §26.u48a holds both twins' shape.
 *
 * ⛔ PURE, AND NOTHING AT RUNTIME COMES FROM THE STORE OR THE CONSOLE'S UI LIBRARIES. `store.ts` and `prisma-dal.ts`
 * both import this file, so a runtime import back into `store.ts` would be a cycle through the DAL switch: types only
 * (erased). `campaign-confirm.ts` is reached for its TYPE only, and `test:campaign-models` 2.11 holds the watermark
 * length here equal to its `MEMBERS_KEY_HEX_CHARS`. The ONE phone-run rule (`holdsPhoneRun`) is imported from
 * `contact-fields.ts` — a pure rules module whose own imports are pure (`test:client-graph-safe` pins them), and which
 * never imports the store.
 * ⛔ No message thrown here ever carries a phone number (§5.14) — a seed is named by its position.
 *
 * Guards: `npm run test:campaign-models` (§2) · `npm run test:dal-parity` (§26).
 */
import type {
  StoredSmsCampaign, SmsCampaignStatus, SmsCampaignRecipientStatus, SmsCampaignDraftPatch, SmsCampaignDraftGuard,
  SmsCampaignTransition, SmsCampaignTransitionPatch, SmsCampaignRecipientSeed, SmsCampaignRecipientCount,
  StoredSmsCampaignRecipient, SmsCampaignRecipientSettle, SmsCampaignGateTrail, StoredSmsMessage, MessagingLocale,
  SmsRecipientReceipt, SmsRecipientReceiptResult, SmsRecipientSendRecord,
} from "@/lib/server/store";
import type { SmsEncoding } from "@/lib/sms-compose";
import type { ConfirmTierColumn } from "@/lib/marketing/campaign-confirm";
import { isGatewayMsisdn } from "@/lib/phone-normalize";
import { holdsPhoneRun } from "@/lib/contacts/contact-fields";

/* ══ THE STATUSES AND THEIR MOVES ════════════════════════════════════════════════════════════════════════════ */

/** Every campaign status, in the schema's order. A Record, so a status added to the union and forgotten here is a
 *  compile error rather than a value the transition check silently refuses. */
const CAMPAIGN_STATUS_SET: Readonly<Record<SmsCampaignStatus, true>> = {
  DRAFT: true, CONFIRMED: true, PREPARING: true, RUNNING: true, PAUSED: true, DONE: true, CANCELLED: true,
};
export const SMS_CAMPAIGN_STATUSES = Object.freeze(Object.keys(CAMPAIGN_STATUS_SET)) as readonly SmsCampaignStatus[];

/** Every recipient status, in the schema's order — the order `fillRecipientCounts` returns them in, and the order
 *  Postgres holds after every migration (UNCONFIRMED appended last by its own ADD VALUE, U43-0). A Record, so a status
 *  added to the union and forgotten here is a compile error rather than a count that refuses it. */
const RECIPIENT_STATUS_SET: Readonly<Record<SmsCampaignRecipientStatus, true>> = {
  PENDING: true, HELD: true, SENT: true, DELIVERED: true, FAILED: true, SKIPPED: true, UNCONFIRMED: true,
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
 * U16a · the most recipient rows the access export LISTS for ONE number — one row per campaign that number was on.
 * ⭐ D10 (the review's MINOR-2): 5,000, and both twins read ONE ROW MORE (`SMS_RECIPIENTS_BY_NUMBER_MAX + 1`), so a
 * person whose number holds more is told so in words in their file — never a silent cut of their oldest messages.
 * ONE constant: both twins and the export import it, so the three cannot drift apart.
 */
export const SMS_RECIPIENTS_BY_NUMBER_MAX = 5000;

/**
 * U16a · `unlinkUser` · ERASURE'S ONE WRITE TO A RECIPIENT ROW: the account link is cleared, and nothing else is.
 * ⛔ The account id must be a non-empty string. Prisma reads `where: { userId: undefined }` as NO CONDITION, so a caller
 * that lost its id would strip the account link from every recipient row in the table on Postgres — while the memory
 * twin, comparing against `undefined`, unlinked nobody and every suite stayed green. `at` is the instant both twins stamp
 * as `updatedAt` (decision C25: never left to `@updatedAt`, which would stamp another instant than the memory twin's).
 */
export function assertRecipientUnlink(userId: string, at: string): void {
  const where = "smsCampaignRecipient.unlinkUser";
  if (!isNonEmpty(userId)) refuse(where, "an account id is required — a missing one would match every row on Postgres");
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
}

/**
 * U16a · `listByMsisdn` · THE ACCESS EXPORT'S ONE READ OF RECIPIENT ROWS: one number, from one instant. ⛔ The number must
 * be the ONE bare key (`isGatewayMsisdn`) — the only spelling a recipient row holds, so any other matches nothing and
 * would hand back an export silently missing its rows; and `undefined` would be NO CONDITION on Postgres, every number's
 * rows in one person's file. ⛔ The bound is an instant in `toISOString()`'s spelling, never another spelling of it: the
 * memory twin compares instants and Postgres compares timestamps, and a text that only one of them could read would be
 * a bound that holds in one twin. A refusal never repeats the number (§5.14).
 */
export function assertRecipientNumberRead(msisdn: string, sinceIso: string): void {
  const where = "smsCampaignRecipient.listByMsisdn";
  if (typeof msisdn !== "string" || !isGatewayMsisdn(msisdn)) refuse(where, "the number is not the bare 255 key a recipient row holds");
  if (!isInstant(sinceIso)) refuse(where, "the lower bound is an instant in toISOString's spelling");
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

/* ══ U43a · THE ENGINE'S RECIPIENT DOORS — claim, settle, the reaper's reads, the requeue (ENGINE-SPEC §4.10) ══════════ */

/**
 * ⭐ THE MOST ROWS ONE CLAIM TAKES. A slice is ONE `sendBatch` chunk — E11: never above `BATCH_MAX` (sms-blackball.ts) — so
 * the data layer refuses a wider claim rather than strand more rows than one send can carry. `test:campaign-models` 2.27
 * holds it equal to `BATCH_MAX`.
 */
export const SMS_RECIPIENT_CLAIM_MAX = 50;
/** The most rows one settle, one stranded read or one evidence read handles — the reaper's page (E6: 200 a step). A larger
 *  call is REFUSED, never cut off: a cut evidence read answers "never sent" for a message that went. */
export const SMS_RECIPIENT_BATCH_MAX = 200;
/** E20's gate trail: at most this many checks per recipient, each of its strings at most this long. */
export const SMS_RECIPIENT_TRAIL_MAX = 24;
export const SMS_RECIPIENT_TRAIL_TEXT_MAX = 200;
/** The longest free text a settle writes (`skipDetail`, `error`) and the longest code (`skipReason`, `failureClass`). The
 *  engine trims to these before it settles; the rule set refuses anything longer, never trims. */
export const SMS_RECIPIENT_TEXT_MAX = 500;
export const SMS_RECIPIENT_CODE_MAX = 100;

/** A claim's token — minted fresh by the claimant for THIS claim (a UUID, a ledger stamp): letters, digits, low line, dash. */
const CLAIM_TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const isClaimToken = (v: unknown): v is string => typeof v === "string" && CLAIM_TOKEN.test(v);
/** OD42's variants, as `MessagingLocale` spells them. A Record, so a variant added to the union is a compile error here. */
const LOCALE_SET: Readonly<Record<MessagingLocale, true>> = { EN: true, SW: true, ZH: true };
const isLocale = (v: unknown): v is MessagingLocale => typeof v === "string" && own(LOCALE_SET, v);
/** A key the system minted — an SMS reference, an opt-out token: printable, no space, bounded. */
const isKeyText = (v: unknown): v is string => typeof v === "string" && /^[!-~]{1,100}$/.test(v);
/** A code — a gate reason, a failure class: printable, trimmed, bounded, and never a phone number. */
const isCode = (v: unknown): v is string =>
  typeof v === "string" && v.length <= SMS_RECIPIENT_CODE_MAX && /^[!-~]([ -~]*[!-~])?$/.test(v) && !holdsPhoneRun(v);
/** Free words — a gate's detail, a gateway's message: bounded, and ⛔ never a phone number (§5.14). May be empty. */
const isWords = (v: unknown): v is string => typeof v === "string" && v.length <= SMS_RECIPIENT_TEXT_MAX && !holdsPhoneRun(v);
const isDelta = (v: unknown): v is 0 | 1 => v === 0 || v === 1;
const TRAIL_KEYS: readonly string[] = ["check", "verdict", "wording", "source"];
const isTrailWord = (v: unknown): boolean =>
  typeof v === "string" && v.length > 0 && v.length <= SMS_RECIPIENT_TRAIL_TEXT_MAX && !holdsPhoneRun(v);
const isTrailWording = (v: unknown): boolean =>
  v === null || (typeof v === "string" && v.length <= SMS_RECIPIENT_TRAIL_TEXT_MAX && !holdsPhoneRun(v));
/**
 * A trail entry's `source` holds REFERENCES — an id, an SMS reference, an instant, a bound — and an SMS reference is 24 hex
 * characters, which hold a phone-shaped digit run by chance often enough that the words rule would refuse a lawful settle
 * now and then. So a source is read PIECE BY PIECE: every word that holds a letter or an underscore (an id, a reference,
 * an instant's `T…Z`) is taken out whole, and ⛔ what stands between those words — digits with their spaces, dashes, dots
 * and plus signs — may not hold a phone number in any spelling (the phone-run rule reads separators): `msisdn:255712345678`,
 * `msisdn 0712 345 678`, `+255 712-345-678` are refused; `sms_0712…ab`, an instant and `08:00–20:00 EAT` are not. A number
 * glued to letters inside one word (`n255712345678`) is a word, and passes — as it did when sources were split on symbols.
 */
const holdsPhoneToken = (text: string): boolean =>
  text.replace(/[A-Za-z0-9_]*[A-Za-z_][A-Za-z0-9_]*/g, "|").split("|").some((piece) => holdsPhoneRun(piece));
const isTrailSource = (v: unknown): boolean =>
  v === null || (typeof v === "string" && v.length <= SMS_RECIPIENT_TRAIL_TEXT_MAX && !holdsPhoneToken(v));
/** E20 · an ordered list of 1 to 24 checks, each EXACTLY { check, verdict, wording, source }. */
const isTrail = (v: unknown): boolean => {
  if (!Array.isArray(v) || v.length === 0 || v.length > SMS_RECIPIENT_TRAIL_MAX) return false;
  return v.every((g: unknown) => {
    if (g === null || typeof g !== "object" || Array.isArray(g)) return false;
    const e = g as Record<string, unknown>;
    return Object.keys(e).length === TRAIL_KEYS.length && TRAIL_KEYS.every((k) => own(e, k))
      && isTrailWord(e.check) && isTrailWord(e.verdict) && isTrailWording(e.wording) && isTrailSource(e.source);
  });
};

/**
 * ⭐ THE SETTLE TABLE — ENGINE-SPEC §4.10 decision 3: for each status a settle moves a claimed row to, EXACTLY the columns
 * its patch carries (no other key — a "forbidden" one is refused by name — and none missing), each with the values its
 * column may take. ⚠️ Two widenings, both for the REAPER (E6), which settles a stranded claim from the `SmsMessage`
 * EVIDENCE and never saw what the slice prepared: SENT's token, variant, segments and length may be null (the slice always
 * fills them — U43b's own suite holds that), and DELIVERED is a target (§3.2: "DELIVERED — receipt; reap"). PENDING is
 * the RELEASE: the claim's token cleared (its `claimedAt` kept — `settleWrite`), `attempts` moved on by 0 or 1 — nothing
 * else. A compile-time check below holds every row of this table equal to its variant of `SmsCampaignRecipientSettle`
 * (store.ts), and `settleWrite` reads the columns it writes off THIS table, never off the patch.
 */
export const SMS_RECIPIENT_SETTLE_KEYS = {
  SENT: {
    smsReference: isKeyText, sentAt: isInstant, optOutToken: orNull(isKeyText), locale: orNull(isLocale),
    segments: orNull(isPositive), bodyLen: orNull(isPositive), gateTrail: isTrail,
  },
  SKIPPED: { skipReason: isCode, skipDetail: isWords, gateTrail: isTrail },
  FAILED: { failureClass: isCode, error: orNull(isWords), failedAt: isInstant, smsReference: orNull(isKeyText), gateTrail: isTrail },
  UNCONFIRMED: {
    smsReference: orNull(isKeyText), optOutToken: orNull(isKeyText), locale: orNull(isLocale), segments: orNull(isPositive),
    bodyLen: orNull(isPositive), gateTrail: isTrail,
  },
  DELIVERED: {
    smsReference: isKeyText, sentAt: orNull(isInstant), deliveredAt: isInstant, optOutToken: orNull(isKeyText),
    locale: orNull(isLocale), segments: orNull(isPositive), bodyLen: orNull(isPositive), gateTrail: isTrail,
  },
  HELD: { failureClass: isCode, attempts: isCount },
  PENDING: { attemptsDelta: isDelta },
} as const satisfies Record<SmsCampaignRecipientStatus, Readonly<Record<string, ValueRule>>>;

/* ── compile-time: the table above and the store's patch union are ONE partition, and every column a settle writes is a
 *    stored column (the release's `attemptsDelta` is a move, not a column) ── */
type SettleOf<T extends SmsCampaignRecipientStatus> = Extract<SmsCampaignRecipientSettle, { to: T }>;
type SettleColumns<T extends SmsCampaignRecipientStatus> = Exclude<keyof SettleOf<T>, "id" | "claimToken" | "to">;
type TableKeys<T extends SmsCampaignRecipientStatus> = keyof (typeof SMS_RECIPIENT_SETTLE_KEYS)[T];
type AllColumns<T> = T extends SmsCampaignRecipientStatus ? SettleColumns<T> : never;
/** ⛔ A compile error the day a variant of `SmsCampaignRecipientSettle` and its row of the table disagree about a key. */
export type SmsRecipientSettleTypesAgree = [
  Assert<Same<SmsCampaignRecipientSettle["to"], SmsCampaignRecipientStatus>>,
  Assert<Same<SettleColumns<"SENT">, TableKeys<"SENT">>>,
  Assert<Same<SettleColumns<"SKIPPED">, TableKeys<"SKIPPED">>>,
  Assert<Same<SettleColumns<"FAILED">, TableKeys<"FAILED">>>,
  Assert<Same<SettleColumns<"UNCONFIRMED">, TableKeys<"UNCONFIRMED">>>,
  Assert<Same<SettleColumns<"DELIVERED">, TableKeys<"DELIVERED">>>,
  Assert<Same<SettleColumns<"HELD">, TableKeys<"HELD">>>,
  Assert<Same<SettleColumns<"PENDING">, TableKeys<"PENDING">>>,
  Assert<Same<Exclude<AllColumns<Exclude<SmsCampaignRecipientStatus, "PENDING">>, keyof StoredSmsCampaignRecipient>, never>>,
];

/** The keys of a patch that ADDRESS a row rather than write one: which row, the claim it expects, the status it moves to. */
const SETTLE_GUARDS: ReadonlySet<string> = new Set(["id", "claimToken", "to"]);

/**
 * `settle` · ⭐ THE WHOLE BATCH OR NOTHING, checked before either twin writes a row (`assertSeeds`' rule): at most
 * `SMS_RECIPIENT_BATCH_MAX` patches; each names its row and the claim it expects; each moves to a status of the table
 * carrying EXACTLY that row's columns, each a value its column may take; no row twice and no SMS reference twice (the
 * column is unique — Postgres would roll the whole transaction back); `at` an instant in `toISOString()`'s spelling.
 * ⛔ A refusal names a patch by its POSITION and a key by its name — never a value (a value could be a phone number).
 */
export function assertSettle(patches: readonly SmsCampaignRecipientSettle[], at: string): void {
  const where = "smsCampaignRecipient.settle";
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
  const list: unknown = patches; // an alias, so `patches` keeps its type (`Array.isArray` would narrow it to any[])
  if (!Array.isArray(list)) refuse(where, "the patches are not a list");
  if (patches.length > SMS_RECIPIENT_BATCH_MAX) {
    refuse(where, `at most ${SMS_RECIPIENT_BATCH_MAX} patches per call (this batch has ${patches.length})`);
  }
  const ids = new Set<string>();
  const references = new Set<string>();
  patches.forEach((p, i) => {
    const at_ = `patch ${i + 1} of ${patches.length}`;
    if (p === null || typeof p !== "object") refuse(where, `${at_} is not an object`);
    if (!isNonEmpty(p.id)) refuse(where, `${at_} names no row`);
    if (ids.has(p.id)) refuse(where, `${at_} names a row another patch in this batch settles — one settle per row`);
    ids.add(p.id);
    if (!isClaimToken(p.claimToken)) refuse(where, `${at_} names no claim — a settle lands only where the row still holds the claim it names`);
    const target: unknown = p.to;
    if (typeof target !== "string" || !own(SMS_RECIPIENT_SETTLE_KEYS, target)) refuse(where, `${at_} moves to a status the settle table does not hold`);
    const rules = SMS_RECIPIENT_SETTLE_KEYS[p.to] as Readonly<Record<string, ValueRule>>;
    const o = p as unknown as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      if (!SETTLE_GUARDS.has(k) && !own(rules, k)) refuse(where, `${at_} (${p.to}) carries "${k}" — not a column a ${p.to} settle writes`);
    }
    for (const [k, rule] of Object.entries(rules)) {
      if (!own(o, k) || o[k] === undefined) refuse(where, `${at_} (${p.to}) is missing "${k}"`);
      if (!rule(o[k])) refuse(where, `${at_} (${p.to}): "${k}" holds a value its column cannot take (a phone number in free text is one — §5.14)`);
    }
    const reference = o.smsReference;
    if (typeof reference === "string") {
      if (references.has(reference)) refuse(where, `${at_} carries an SMS reference another patch carries — the column is unique`);
      references.add(reference);
    }
  });
}

/**
 * ⭐ WHAT ONE DOOR WRITES TO ONE RECIPIENT ROW — computed here, ONCE, and applied by both twins: the memory twin assigns
 * every key of `set` by name, the Prisma twin drives `set` through `SMS_CAMPAIGN_RECIPIENT_COLUMN` (an unmapped key
 * THROWS), so the twins can never write different columns. `attemptsBy` is how far `attempts` moves on — the Prisma twin's
 * `{ increment }`, so a release adds to what Postgres holds at the write and never reads it first.
 */
export type SmsRecipientWrite = { set: Partial<StoredSmsCampaignRecipient>; attemptsBy: 0 | 1 };

/** The claim's write: the token, the instant and the stamp — and nothing else (not the status, not `attempts`). */
export function claimWrite(token: string, at: string): SmsRecipientWrite {
  return { set: { claimToken: token, claimedAt: at, updatedAt: at }, attemptsBy: 0 };
}

/**
 * The settle's write, from a patch the table has passed (`assertSettle` first): the status it moves to, the caller's
 * stamp and EXACTLY the columns its row of `SMS_RECIPIENT_SETTLE_KEYS` names — read off the TABLE, never off the patch, so
 * a key a patch carried beyond its row can never reach a column: ⛔ never `userId`, the account link only erasure clears
 * (U16a PE-01 — a send that raced an erasure must not re-link the erased account), never the number, the contact or the
 * campaign. Every value is the patch's own: ⛔ `sentAt` (like `deliveredAt` and `failedAt`) is the instant the patch
 * carries — the hand-over instant copied from `SmsMessage` — and NEVER this settle's clock, which stamps `updatedAt`
 * alone (U16a PE-08). The gate trail is copied, so the stored row never shares an array with its caller.
 * ⭐ A RELEASE (to PENDING) clears the claim's TOKEN — the row is free for the next slice — and moves `attempts` on by its
 * delta; it KEEPS `claimedAt`, the instant of the row's last claim, so `lastActivity` never forgets a claim that ended in
 * a release (D15: "nobody is driving" must never be read off a page that is driving and releasing). A HELD or settled
 * row keeps its token too: the token and `claimedAt` are the record of which slice handled it.
 */
export function settleWrite(p: SmsCampaignRecipientSettle, at: string): SmsRecipientWrite {
  if (p.to === "PENDING") return { set: { status: p.to, claimToken: null, updatedAt: at }, attemptsBy: p.attemptsDelta };
  const o = p as unknown as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  for (const k of Object.keys(SMS_RECIPIENT_SETTLE_KEYS[p.to])) {
    set[k] = k === "gateTrail" ? (o[k] as SmsCampaignGateTrail).map((g) => ({ ...g })) : o[k];
  }
  set.status = p.to;
  set.updatedAt = at;
  return { set: set as Partial<StoredSmsCampaignRecipient>, attemptsBy: 0 };
}

/**
 * The requeue's write (E8 — Resume): a HELD row starts over — PENDING, `attempts` 0, the claim's token and the hold's
 * class cleared, the caller's stamp; `claimedAt` kept, as a release keeps it (D15). ⛔ Its door applies it to HELD rows
 * and to NOTHING else (never UNCONFIRMED).
 */
export function requeueWrite(at: string): SmsRecipientWrite {
  return { set: { status: "PENDING", attempts: 0, claimToken: null, failureClass: null, updatedAt: at }, attemptsBy: 0 };
}

/**
 * `claim` · the rule set first: a campaign named (Prisma reads `where: { campaignId: undefined }` as NO CONDITION — every
 * campaign's rows), 1 to `SMS_RECIPIENT_CLAIM_MAX` rows, a fresh token of the token's shape, and an instant.
 */
export function assertClaim(campaignId: string, limit: number, token: string, at: string): void {
  const where = "smsCampaignRecipient.claim";
  if (!isNonEmpty(campaignId)) refuse(where, "a claim names its campaign — a missing id would take every campaign's rows on Postgres");
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > SMS_RECIPIENT_CLAIM_MAX) {
    refuse(where, `a claim takes 1 to ${SMS_RECIPIENT_CLAIM_MAX} rows — one sendBatch chunk`);
  }
  if (!isClaimToken(token)) refuse(where, "the claim token is 8 to 64 letters, digits, low lines or dashes, minted fresh for this claim");
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
}

/**
 * `claim` · ⛔ A TOKEN IS FRESH FOR EACH CLAIM (D10, enforced — D16): a token ANY recipient row already holds is refused
 * before anything is written. A settled or held row keeps its claim's token (D7), so a reused token would fold an
 * earlier claim's rows into this claim's answer — more than `limit`, rows this slice never prepared — and into every
 * later `claimedBy`. The twins ask whether a row holds the token (one indexed read on Postgres) and refuse through this
 * ONE sentence.
 */
export function refuseHeldToken(): never {
  refuse("smsCampaignRecipient.claim", "a recipient row already holds this claim token — a token is minted fresh for each claim and never reused");
}

/** `claimedBy` · the campaign and the token, both named — a missing token would read every claimed row on Postgres. */
export function assertClaimRead(campaignId: string, token: string): void {
  const where = "smsCampaignRecipient.claimedBy";
  if (!isNonEmpty(campaignId)) refuse(where, "a claim read names its campaign");
  if (!isClaimToken(token)) refuse(where, "a claim read names the token it reads by");
}

/** `findStranded` · the campaign named, the cutoff an instant (strictly older claims are stranded), 1 to 200 rows. */
export function assertStrandedRead(campaignId: string, cutoff: string, limit: number): void {
  const where = "smsCampaignRecipient.findStranded";
  if (!isNonEmpty(campaignId)) refuse(where, "a stranded read names its campaign");
  if (!isInstant(cutoff)) refuse(where, "the cutoff is an instant in toISOString's spelling");
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > SMS_RECIPIENT_BATCH_MAX) {
    refuse(where, `a stranded read takes 1 to ${SMS_RECIPIENT_BATCH_MAX} rows`);
  }
}

/** `requeueHeld` · the campaign named (a missing id would requeue every campaign's HELD rows on Postgres) and an instant. */
export function assertRequeueHeld(campaignId: string, at: string): void {
  const where = "smsCampaignRecipient.requeueHeld";
  if (!isNonEmpty(campaignId)) refuse(where, "a requeue names its campaign");
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
}

/** `lastActivity` · the campaign named. */
export function assertActivityRead(campaignId: string): void {
  if (!isNonEmpty(campaignId)) refuse("smsCampaignRecipient.lastActivity", "an activity read names its campaign");
}

/**
 * U48a · `countSentBefore` · THE RESULTS' "NO RECEIPT AFTER 15 MINUTES" (ENGINE-SPEC E5, §4.16): the campaign named — Prisma
 * reads `where: { campaignId: undefined }` as NO CONDITION, so a caller that lost its id would count every campaign's SENT
 * rows as this one's while the memory twin matched nobody — and the bound an instant in `toISOString()`'s spelling (the
 * memory twin compares instants, Postgres timestamps; a text only one of them could read is a bound that holds in one twin).
 */
export function assertSentBeforeRead(campaignId: string, before: string): void {
  const where = "smsCampaignRecipient.countSentBefore";
  if (!isNonEmpty(campaignId)) refuse(where, "a sent-before count names its campaign");
  if (!isInstant(before)) refuse(where, "the bound is an instant in toISOString's spelling");
}

/**
 * U48a · THE MOST PEOPLE ONE `handedOverPage` ANSWERS — what §25's bulk keyed reads take in one call (`BULK_KEYED_READ_MAX`,
 * store.ts, which this file may not import at runtime: a page IS a bulk read's key set, and `findActiveAmong` refuses more).
 * `test:campaign-models` §2.33 holds the two equal.
 */
export const SMS_HANDED_OVER_PAGE_MAX = 2000;

/**
 * U48a · `handedOverPage` · THE STOPPED-BY-LINK WALK'S ONE READ OF A CAMPAIGN'S PEOPLE (ENGINE-SPEC E30, §4.16): the campaign
 * named (a missing id would page every campaign's rows on Postgres), the cursor null — the first page — or the bare 255 key of
 * the last person read (a recipient row holds no other spelling, so any other matches nothing and would end the walk early as
 * if it were done), and 1 to `SMS_HANDED_OVER_PAGE_MAX` people. A refusal never repeats the number (§5.14).
 */
export function assertHandedOverRead(campaignId: string, after: string | null, limit: number): void {
  const where = "smsCampaignRecipient.handedOverPage";
  if (!isNonEmpty(campaignId)) refuse(where, "a handed-over read names its campaign");
  if (after !== null && (typeof after !== "string" || !isGatewayMsisdn(after))) refuse(where, "the cursor is null or the bare 255 key of the last person read");
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > SMS_HANDED_OVER_PAGE_MAX) {
    refuse(where, `a handed-over read takes 1 to ${SMS_HANDED_OVER_PAGE_MAX} people`);
  }
}

/**
 * `smsMessage.findByTargets` · THE REAPER'S EVIDENCE READ: a target type and at most `SMS_RECIPIENT_BATCH_MAX` target
 * ids, each an id. ⛔ Refused above the bound, never cut off: a target whose message fell outside a cut would read "never
 * sent", go back to PENDING and be sent again. ⚠️ The answer is the newest message EVER for each target — the claim's
 * bound is the reaper's (`newestPerTarget`, DC-1).
 */
export function assertTargetsRead(targetType: string, targetIds: readonly string[]): void {
  const where = "smsMessage.findByTargets";
  if (!isNonEmpty(targetType)) refuse(where, "an evidence read names its target type");
  const idList: unknown = targetIds;
  if (!Array.isArray(idList)) refuse(where, "the target ids are not a list");
  if (targetIds.length > SMS_RECIPIENT_BATCH_MAX) refuse(where, `at most ${SMS_RECIPIENT_BATCH_MAX} targets per read (this one has ${targetIds.length})`);
  if (!targetIds.every((t) => isNonEmpty(t))) refuse(where, "every target id is an id");
}

/**
 * ⭐ THE NEWEST MESSAGE FOR EACH TARGET — the ONE rule both twins' `findByTargets` answer through (E6: "the newest
 * SmsMessage with that recipient as target"). Newest by `createdAt` compared as INSTANTS, a tie broken by the higher
 * reference; one per target; a row with no target dropped; the answer ordered by target id — so it is read by the target
 * id it carries, never by its place in the list.
 * ⚠️ NOT BOUNDED BY THE CLAIM, AND THAT IS THE REAPER'S TO DO (DC-1). The newest message of a target can belong to an
 * EARLIER attempt of the same row: a chunk the gateway refused (sms.ts marks its rows FAILED, or UNKNOWN on an ambiguous
 * reply) whose rows E7 released, then a later claim that died before its own `sendBatch` wrote QUEUED rows. Read as
 * evidence for THAT claim, the old FAILED settles a person who was never sent to as FAILED, with no retry. Only the
 * reaper holds the row, so ⛔ U43b's `reapVerdict` MUST compare the evidence's `createdAt` with the row's `claimedAt` —
 * a message created BEFORE the claim is an earlier attempt's, NO evidence for this claim (an earlier refused chunk
 * charged nothing, E7) — and `ReapEvidence` must therefore keep `createdAt`. Both instants are the app's own clock (the
 * claim's `at`, sms.ts's `createdAt`); a suite must never compare an injected clock with sms.ts's real one. The bound
 * is not taken here because its failure is a VERDICT E6 must own: a read that dropped the claim's own message (a clock
 * stepped back between the claim and the send) reads "never sent" and sends a second time.
 */
export function newestPerTarget(rows: readonly StoredSmsMessage[]): StoredSmsMessage[] {
  const newest = new Map<string, StoredSmsMessage>();
  for (const m of rows) {
    if (m.targetId === null) continue;
    const held = newest.get(m.targetId);
    const gap = held === undefined ? 1 : Date.parse(m.createdAt) - Date.parse(held.createdAt);
    if (held === undefined || gap > 0 || (gap === 0 && m.reference > held.reference)) newest.set(m.targetId, m);
  }
  return [...newest.values()].sort((a, b) => ((a.targetId ?? "") < (b.targetId ?? "") ? -1 : (a.targetId ?? "") > (b.targetId ?? "") ? 1 : 0));
}

/* ══ U46a · THE RECEIPT DOOR — a delivery receipt settles its recipient (ENGINE-SPEC §4.14, E28) ══════════════════════════ */

/**
 * ⭐ THE STATUSES A RECEIPT MOVES A ROW OUT OF — §3.2: "Receipts move PENDING (claimed) · SENT · UNCONFIRMED → DELIVERED |
 * FAILED and nothing else." ONE list: the Prisma twin spreads it into its WHERE and the memory twin asks it, so the two can
 * never disagree about which rows a receipt reaches. SENT is a receipt's usual row. UNCONFIRMED is the row whose answer
 * never came, and a late receipt IS that answer (E4) — so a receipt only ever moves a row OUT of UNCONFIRMED (decision 5: no
 * UNCONFIRMED writer). PENDING is a row a slice still holds: the receipt beat the slice's settle, which is then `lost` (D5).
 * ⚠️ PENDING WHETHER OR NOT A CLAIM IS ON IT, as decision 1's WHERE is written: the one way a free PENDING row meets a
 * receipt is E6's residual race — the reaper returned a claim to PENDING after its send had already left — and then the
 * receipt is the evidence the reaper lacked, so settling the row is what spares the person a second message (the next
 * slice's `beforeSend` re-read no longer finds it).
 * ⛔ NEVER BACKWARDS: not DELIVERED or FAILED (a late or out-of-order receipt never rewrites a settled row), and not SKIPPED
 * or HELD (nothing was handed over for that claim; a receipt for an earlier attempt's message changes neither).
 */
export const SMS_RECEIPT_FROM: readonly SmsCampaignRecipientStatus[] = Object.freeze(["PENDING", "SENT", "UNCONFIRMED"] as SmsCampaignRecipientStatus[]);
/** A FAILED receipt's class is the vendor's token behind this prefix, so "the network refused it" (the wire's own class)
 *  and "not delivered" (a receipt's) stay two answers (U48a). */
export const SMS_RECEIPT_CLASS_PREFIX = "receipt:";
/** The longest token a FAILED receipt names: its class (`receipt:` and the token) is a code, at most
 *  `SMS_RECIPIENT_CODE_MAX` characters in all. */
export const SMS_RECEIPT_TOKEN_MAX = SMS_RECIPIENT_CODE_MAX - SMS_RECEIPT_CLASS_PREFIX.length;
/** The longest description a FAILED receipt writes as the row's `error` — the route scrubs the vendor's text, then cuts it
 *  to this. */
export const SMS_RECEIPT_DESC_MAX = 200;
/** A receipt's keys, EXACTLY — `satisfies` the store's type, so a key added there and not here is a compile error. */
const RECEIPT_KEY_SET = {
  reference: true, msisdn: true, status: true, rawStatus: true, desc: true, at: true,
} as const satisfies Record<keyof SmsRecipientReceipt, true>;

/**
 * `recordReceipt` · THE RULE SET FIRST, before either twin reads or writes: the row named (Prisma reads `where: { id:
 * undefined }` as NO CONDITION — one receipt would settle every open row in the table); the receipt carrying exactly its
 * six keys, every one of them present; the reference a key the system minted; the number the ONE bare key (a missing one
 * would drop the identity check on Postgres the same way); a verdict of DELIVERED or FAILED (the arm never runs on a token
 * nobody recognised); an instant in `toISOString()`'s spelling. A FAILED receipt WRITES its token and its description, so
 * both are held to the settle's own rules: the token a code — printable, trimmed, 1 to `SMS_RECEIPT_TOKEN_MAX` characters
 * (its class `receipt:<token>` then fits the 100 a code may hold) — and the description at most `SMS_RECEIPT_DESC_MAX`
 * characters; ⛔ neither ever a phone number (§5.14). The route normalises the token, scrubs the description and cuts it
 * first; this refuses, never scrubs and never trims. A DELIVERED receipt writes neither, so neither can refuse it.
 * ⛔ A refusal names a key, never a value.
 */
export function assertReceipt(id: string, r: SmsRecipientReceipt): void {
  const where = "smsCampaignRecipient.recordReceipt";
  if (!isNonEmpty(id)) refuse(where, "a receipt names its row — a missing id would reach every open row on Postgres");
  if (r === null || typeof r !== "object") refuse(where, "the receipt is not an object");
  for (const k of Object.keys(r)) if (!own(RECEIPT_KEY_SET, k)) refuse(where, `the receipt carries "${k}" — not a key a receipt has`);
  if (!isKeyText(r.reference)) refuse(where, "a receipt names the SMS reference it echoes");
  if (typeof r.msisdn !== "string" || !isGatewayMsisdn(r.msisdn)) {
    refuse(where, "the number is not the bare 255 key a recipient row holds — a missing one would drop the identity check on Postgres");
  }
  if (r.status !== "DELIVERED" && r.status !== "FAILED") refuse(where, "a receipt settles a row DELIVERED or FAILED, and nothing else");
  if (typeof r.rawStatus !== "string") refuse(where, "the vendor's token is text");
  if (r.desc !== null && typeof r.desc !== "string") refuse(where, "the description is text, or null");
  if (!isInstant(r.at)) refuse(where, "at is an instant in toISOString's spelling");
  if (r.status === "FAILED") {
    if (!isCode(r.rawStatus) || r.rawStatus.length > SMS_RECEIPT_TOKEN_MAX) {
      refuse(where, `a FAILED receipt's token is printable, trimmed, 1 to ${SMS_RECEIPT_TOKEN_MAX} characters and never a phone number (§5.14) — it becomes the row's class`);
    }
    if (r.desc !== null && (r.desc.length > SMS_RECEIPT_DESC_MAX || holdsPhoneRun(r.desc))) {
      refuse(where, `a FAILED receipt's description is at most ${SMS_RECEIPT_DESC_MAX} characters and never holds a phone number (§5.14) — the route scrubs it first`);
    }
  }
}

/**
 * The receipt's write, from a receipt the rule set has passed (`assertReceipt` first): the verdict, its instant, the
 * reference the receipt was matched on and the stamp — and for a FAILED, the class `receipt:<token>` and the description
 * as the row's `error`. Built key by key from the receipt's own fields, never spread from it, so nothing a caller handed in
 * beside them can reach a column.
 * ⭐ THE REFERENCE IS WRITTEN: a row a receipt reached before its settle (PENDING, D5), or one that never learnt its
 * reference (UNCONFIRMED), holds none yet — and a FAILED row without one reads "not handed to the network" in the person's
 * own file (`dsar.ts`), though the receipt proves the network had it. Both WHEREs let only the row's own reference, or
 * none, through, so it is never another message's.
 * ⭐ THE RECEIPT'S INSTANT is `deliveredAt` / `failedAt` — the message's own (`recordDlr` stamps the same `at`) — and the
 * stamp. ⛔ NEVER THE CLAIM: a row a receipt reached first keeps its claim's token and instant, the record of which slice held
 * it (the settle's D7 and D15) and how U43b's send record finds it (DC-4, store.ts). ⛔ Never `sentAt`, the hand-over instant
 * only the slice and the reaper know (PE-08), never `attempts`, never the account link, the number or the contact.
 */
export function receiptWrite(r: SmsRecipientReceipt): SmsRecipientWrite {
  if (r.status === "DELIVERED") {
    return { set: { status: "DELIVERED", deliveredAt: r.at, smsReference: r.reference, updatedAt: r.at }, attemptsBy: 0 };
  }
  return {
    set: {
      status: "FAILED", failedAt: r.at, failureClass: `${SMS_RECEIPT_CLASS_PREFIX}${r.rawStatus}`, error: r.desc,
      smsReference: r.reference, updatedAt: r.at,
    },
    attemptsBy: 0,
  };
}

/**
 * Why a receipt wrote nothing — the ONE reading both twins answer a miss through: no row of that id (`not_found`); a row of
 * another number, or one already holding another message's reference (`mismatch` — a vendor's error, a slice that named the
 * wrong row, or a forgery; the route audits it as SECURITY); otherwise a row in a status no receipt moves (`settled` — a
 * late receipt, or one another writer, the reaper among them, settled first). Identity is read before status, so a row of
 * another person is always a `mismatch`, whatever its status.
 */
export function receiptMiss(row: StoredSmsCampaignRecipient | null, r: SmsRecipientReceipt): Exclude<SmsRecipientReceiptResult["reason"], "applied"> {
  if (row === null) return "not_found";
  if (row.msisdn !== r.msisdn || (row.smsReference !== null && row.smsReference !== r.reference)) return "mismatch";
  return "settled";
}

/* ══ U43b-2 · DC-4 · THE SEND RECORD — what a slice still owes a row a receipt settled first (ENGINE-SPEC §4.13 decision 6) ══ */

/**
 * ⭐ THE STATUSES A SEND RECORD WRITES INTO — a receipt's two (§3.2). A receipt that lands between the wire and the slice's
 * settle moves the still-claimed PENDING row to DELIVERED or FAILED and KEEPS the claim (`receiptWrite`); the slice's SENT
 * patch then comes back `lost`, and this narrow door writes what that patch carried. ONE list: the Prisma twin spreads it
 * into its WHERE and the memory twin asks it.
 */
export const SMS_SEND_RECORD_FROM: readonly SmsCampaignRecipientStatus[] = Object.freeze(["DELIVERED", "FAILED"] as SmsCampaignRecipientStatus[]);
/** A send record's keys, EXACTLY — `satisfies` the store's type, so a key added there and not here is a compile error. */
const SEND_RECORD_KEY_SET = {
  claimToken: true, gateTrail: true, optOutToken: true, locale: true, segments: true, bodyLen: true, sentAt: true,
} as const satisfies Record<keyof SmsRecipientSendRecord, true>;

/**
 * `recordSend` · THE RULE SET FIRST, before either twin reads or writes: the row named (Prisma reads `where: { id:
 * undefined }` as NO CONDITION — one record would be written into every row a receipt settled); the record carrying
 * exactly its seven keys, every one present; the claim the row must still hold, of a claim token's shape; the gate trail
 * E20's 1 to 24 checks, never a phone number (§5.14); the token a key the system minted, the variant OD42's, the size and
 * the length positive whole numbers — each or null; the hand-over instant and `at` in `toISOString()`'s spelling (the
 * instant may be null: an unanswered message has none). ⛔ It refuses, never scrubs: the engine scrubs first (DC-5).
 * ⛔ A refusal names a key, never a value.
 */
export function assertSendRecord(id: string, s: SmsRecipientSendRecord, at: string): void {
  const where = "smsCampaignRecipient.recordSend";
  if (!isNonEmpty(id)) refuse(where, "a send record names its row — a missing id would reach every settled row on Postgres");
  if (s === null || typeof s !== "object") refuse(where, "the send record is not an object");
  for (const k of Object.keys(s)) if (!own(SEND_RECORD_KEY_SET, k)) refuse(where, `the send record carries "${k}" — not a column it writes`);
  const o = s as unknown as Record<string, unknown>;
  for (const k of Object.keys(SEND_RECORD_KEY_SET)) if (!own(o, k) || o[k] === undefined) refuse(where, `the send record is missing "${k}"`);
  if (!isClaimToken(s.claimToken)) refuse(where, "a send record names the claim the row must still hold");
  if (!isTrail(s.gateTrail)) refuse(where, "the gate trail is 1 to 24 checks, each { check, verdict, wording, source } and never a phone number (§5.14)");
  if (!orNull(isKeyText)(s.optOutToken)) refuse(where, "the opt-out token is a key the system minted, or null");
  if (!orNull(isLocale)(s.locale)) refuse(where, "the variant is OD42's, or null");
  if (!orNull(isPositive)(s.segments) || !orNull(isPositive)(s.bodyLen)) refuse(where, "the size and the length are positive whole numbers, or null");
  if (!orNull(isInstant)(s.sentAt)) refuse(where, "the hand-over instant is an instant in toISOString's spelling, or null");
  if (!isInstant(at)) refuse(where, "at is an instant in toISOString's spelling");
}

/**
 * The send record's write, from a record the rule set has passed (`assertSendRecord` first): EXACTLY the six columns the
 * lost patch carried — the trail (copied), the token, the variant, the size, the length, the hand-over instant — and the
 * stamp. ⛔ NEVER the status, the reference or the receipt's own instant and class (the receipt's, and right), never the
 * claim (kept: it is how the door found the row), never `attempts`, the account link, the number or the contact.
 */
export function sendRecordWrite(s: SmsRecipientSendRecord, at: string): SmsRecipientWrite {
  return {
    set: {
      gateTrail: s.gateTrail.map((g) => ({ ...g })), optOutToken: s.optOutToken, locale: s.locale, segments: s.segments,
      bodyLen: s.bodyLen, sentAt: s.sentAt, updatedAt: at,
    },
    attemptsBy: 0,
  };
}
