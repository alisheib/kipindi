/**
 * ⭐ U42 · THE ENQUEUE — a confirmed campaign's recipient rows, written over the ONE walk, capped at the confirmed count,
 * safe to restart (ENGINE-SPEC §4.9; decisions E1 · E19 · E21 · E22 · E24 · X8 · X9 · X13 · OD26 · OD28 · OD67).
 *
 * ── ONE STEP = ONE CHUNK (§4.9 decisions 1 and 5) ─────────────────────────────────────────────────────────────────
 * `enqueueStep(campaignId)` is what one driver call does while the campaign is PREPARING (§3.3): it walks at most
 * `ENQUEUE_CHUNK` people from the stored `enqueueCursor` through `walkCampaignAudience` — the ONE walk U38a counts, U40a
 * confirms and Start counts again (X9: the book by contact id, then the players by account id; a number the book holds is
 * walked once, by its book row) — turns each into a seed, writes them with `createMany` (duplicates skipped on the
 * campaign's unique key), and only THEN moves the cursor, with ONE conditional `transition(from: PREPARING, to: null)`.
 * When the walk says `done`, or the confirmed count is reached, the same step moves the campaign PREPARING → RUNNING
 * (`enqueuedAt`, the cursor `done`) and writes `marketing.campaign_enqueued`.
 * ⛔ RESTART-SAFE BY ORDER — the rows first, the cursor second. An interruption between the two (a crash; a Pause landing in
 * between, so the conditional move finds the campaign gone from PREPARING and the step answers `not_preparing`) leaves the
 * cursor BEHIND the rows, never ahead of them: the next step walks that page again and writes nobody twice. The other order
 * would skip a page for ever.
 *
 * ── WHO IS SEEDED, AND HOW (decisions 2 and 3; E1, E21) ─────────────────────────────────────────────────────────────
 * A seed's key is the GATE's key, `parseTzNumber(row.msisdn).msisdn`. A number that does not parse is NOT seeded — one bad
 * key refuses a whole batch (`assertSeeds`) — and is counted `unusable`. A book row carries its contact id and the book's
 * account link (`linkedUserId`, a link that erasure sets null); a player row carries its account id.
 * ⛔ `optOutToken` IS ALWAYS NULL (E1): the token is ensured at SEND, only after the gate clears, so a person the gate refuses
 * never gets a permanent link. Nothing here mints one, and nothing here sends.
 * ⭐ ids are `rcp_` + `ledgerStamp().id` (fixed-width hex, the clock first, a counter inside the millisecond), minted in walk
 * order, so `ORDER BY id` is the walk's order (E21).
 *
 * ── THE CAP (decision 4, E19) ─────────────────────────────────────────────────────────────────────────────────────
 * The rows on the campaign (`countByStatus`, a groupBy — OD26) never exceed the confirmed `audienceCount`. ⭐ The cap is
 * spent by rows ADDED, never by people walked: a page walked again after an interruption holds people already on the list,
 * and counting them again would end the enqueue early and leave out everyone after that page. So the page that meets the
 * cap is written a room at a time — the room counted afresh before each write, at most that many seeds per write — and a
 * person already on the list costs no room. Whoever the cap leaves out is reported as `overflow`, and the enqueue finishes.
 * ⚠️ `overflow` counts what the step that met the cap SAW: the walk is not continued past the cap (the audit row's
 * `walkComplete` says whether the walk had ended), and in a page walked again after an interruption it can count people
 * already on the list (that step's `duplicates` say so). A step that finds the cap already met — an earlier step met it and
 * its finish never landed — finishes without walking at all, `overflow` 0.
 *
 * ── A LISTED CONFIRMATION (decision 4, X13, OD67) ────────────────────────────────────────────────────────────────────
 * A confirmation that LISTED its people (ENUMERATE: at most `CONFIRM_ENUMERATE_MAX`, the members key in `audienceWatermark`)
 * is enqueued in ONE step: the walk from its start, up to one person more than were confirmed; the members key re-derived
 * over the people about to be written — `canonicalMembers` of the walk's own keys (the fence's input, so a number that
 * cannot be messaged is still one of the people), keyed by `membersKeyOf` with the CONFIRMED row's own scope, its id and
 * its frozen `draftRevision` (no save moves a revision once the row has left DRAFT) — and held to the watermark through
 * `startAudienceVerdict`, the one comparison Start makes. A different key (somebody changed in the moments after Start's
 * check) writes NOTHING and pauses the campaign `audience_moved`. A TYPED confirmation carries no members key (X13, OD67):
 * the cap alone holds it.
 * ⛔ OD28's first check is NOT here — it is Start's (U49a, E19). This step is the CONTINUOUS cap.
 *
 * ── FAIL CLOSED (decision 7) ──────────────────────────────────────────────────────────────────────────────────────
 * A stored audience that cannot be read — a filter the campaign's door refuses, a confirmation without a readable count or
 * tier (or a listed one without its key), a stored cursor the walk refuses — pauses the campaign `audience_unreadable`:
 * never read as "start again" (a restart re-sends) and never as "done". A read that FAILS (the database) throws instead,
 * with nothing written: the next step tries again.
 *
 * ── THE BACKSTOP (decision 6) ─────────────────────────────────────────────────────────────────────────────────────
 * `ENQUEUE_BACKSTOP` rows end the enqueue whatever was confirmed — never silently: its audit row says `backstop: true`, with
 * `confirmed` beside `rows`, so the people left are on the record.
 *
 * ── AUDIT (E24: one row per event — SYSTEM, actor null) ─────────────────────────────────────────────────────────────
 * `marketing.campaign_enqueued` once, when the list is finished: `{ rows, confirmed, duplicates, unusable, overflow,
 * backstop, walkComplete }` — `rows` is the whole list (a groupBy) and `confirmed` the frozen count; `duplicates`,
 * `unusable` and `overflow` are the finishing step's own (no counter is kept, OD26 — every step's figures are in its
 * result). `marketing.campaign_paused` `{ reason }` when this step pauses the campaign. ⛔ No phone number in either row,
 * nor in any result, nor in any error this throws.
 *
 * ── WHO CALLS IT ──────────────────────────────────────────────────────────────────────────────────────────────────
 * ⛔ NOTHING YET. U47b's Start (`campaign-control.ts`, its step dispatcher) is the first caller, driven by the live page
 * (E22). Until then NO src file imports this module or names `enqueueStep` — `test:marketing-engine` E13 holds every importer
 * to its `ENQUEUE_CALLERS` (empty; U47b declares its file there in its own commit), so no graph, a client's included,
 * reaches it. It is SERVER-ONLY: never import it into a client component (a type-only import is erased, and allowed).
 * ⚠️ RESIDUAL: two steps of ONE campaign running AT ONCE (two drivers, or a deploy's overlap) are safe for the rows — a
 * person already on the list is skipped — but near the cap each counts the room before the other's write lands, so
 * together they could pass the cap by at most that room. U47b runs one step of a campaign at a time (E22), and §5 rule 8
 * pauses every campaign before a push.
 *
 * Guard: `npm run test:marketing-engine` §E · Red: `npm run red:marketing-engine` (in memory).
 */
import { db } from "@/lib/server/store";
import type {
  SmsCampaignRecipientCount, SmsCampaignRecipientInsert, SmsCampaignRecipientSeed, SmsCampaignStatus, SmsCampaignTransition,
  StoredSmsCampaign,
} from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { walkCampaignAudience } from "@/lib/server/marketing/audience";
import type { CampaignAudiencePage, CampaignAudienceRow, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { membersKeyOf, readCampaignAudience } from "@/lib/server/marketing/audience-fence";
import {
  CONFIRM_ENUMERATE_MAX, MEMBERS_KEY_HEX_CHARS, canonicalMembers, confirmTierFromColumn, startAudienceVerdict,
} from "@/lib/marketing/campaign-confirm";
import type { ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { parseTzNumber } from "@/lib/tz-msisdn";

/* ══ THE NUMBERS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The most people one step walks and seeds — the walk's own page (`CAMPAIGN_WALK_MAX`) and the seed door's batch
 *  (`SMS_CAMPAIGN_SEED_CHUNK_MAX`); `test:marketing-engine` holds the three equal. */
export const ENQUEUE_CHUNK = 1000;
/** ⛔ The most rows one campaign's enqueue ever writes, whatever was confirmed (decision 6). */
export const ENQUEUE_BACKSTOP = 200_000;

export const CAMPAIGN_ENQUEUED_ACTION = "marketing.campaign_enqueued";
export const CAMPAIGN_PAUSED_ACTION = "marketing.campaign_paused";

/* ══ THE SHAPES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Why this step paused a campaign — `campaign-status.ts`' `STOP_REASON_SENTENCE` holds each key's words (§3.4). */
export type EnqueuePauseReason = "audience_unreadable" | "audience_moved";

/**
 * What one step did. `wrote` — a chunk written and the cursor moved on (`next`); `done` — the list is finished and the
 * campaign RUNNING (`total`: every row on it; `unusable` and `overflow`: this step's own); `paused` — this step paused the
 * campaign; `not_preparing` — the campaign is not (or no longer) PREPARING: nothing was written by this answer's step,
 * except a chunk a Pause or a Stop overtook between its write and its cursor.
 */
export type EnqueueStepResult =
  | { kind: "wrote"; inserted: number; duplicates: number; unusable: number; next: string }
  | { kind: "done"; total: number; unusable: number; overflow: number }
  | { kind: "paused"; reason: EnqueuePauseReason }
  | { kind: "not_preparing"; status: SmsCampaignStatus };

/** The audit door as this step uses it. */
export type AuditFn = (entry: Parameters<typeof audit>[0]) => unknown;

/** Every read and write one step makes — swappable for the suite's in-process plants; production never passes them. */
export type EnqueueDeps = {
  /** The campaign door's two members this needs: the read, and the ONE conditional write (cursor, finish, pause). */
  campaigns: {
    find: (id: string) => Promise<StoredSmsCampaign | null>;
    transition: (id: string, t: SmsCampaignTransition) => Promise<StoredSmsCampaign | null>;
  };
  /** The recipient door's seed write (duplicates skipped) and its one count (a groupBy). */
  recipients: {
    createMany: (seeds: SmsCampaignRecipientSeed[]) => Promise<SmsCampaignRecipientInsert>;
    countByStatus: (campaignId: string) => Promise<SmsCampaignRecipientCount[]>;
  };
  /** THE ONE WALK (`walkCampaignAudience`). */
  walk: typeof walkCampaignAudience;
  /** The keyed members key, for a listed confirmation (`membersKeyOf`). */
  membersKeyOf: typeof membersKeyOf;
  audit: AuditFn;
  now: () => Date;
  /** A recipient id: `rcp_` + `ledgerStamp().id` (E21). */
  newId: () => string;
};

/* ══ THE RULES — pure ═════════════════════════════════════════════════════════════════════════════════════════════ */

/** What a confirmation froze, as this step reads it back. */
export type FrozenAudience = {
  filter: ContactAudienceFilter;
  /** `audienceCount` — the cap. */
  count: number;
  tier: ConfirmTier;
  /** The members key on the enumerate tier; null on the typed tier. */
  watermark: string | null;
};

const isMembersKey = (v: unknown): v is string =>
  typeof v === "string" && v.length === MEMBERS_KEY_HEX_CHARS && /^[0-9a-f]+$/.test(v);

/**
 * ⛔ THE CONFIRMATION, READ BACK — or null when ANY part of it cannot be read: the filter at the campaign's door
 * (`readCampaignAudience`), a whole positive count, a tier this code knows, and on the enumerate tier at most
 * `CONFIRM_ENUMERATE_MAX` people and a well-formed members key. Null pauses the campaign `audience_unreadable`.
 */
export function frozenAudienceOf(
  row: Pick<StoredSmsCampaign, "audienceFilter" | "audienceCount" | "confirmTier" | "audienceWatermark">,
): FrozenAudience | null {
  const read = readCampaignAudience(row.audienceFilter);
  if (!read.ok) return null;
  const count = row.audienceCount;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) return null;
  const tier = confirmTierFromColumn(row.confirmTier);
  if (tier === null) return null;
  if (tier === "enumerate") {
    if (count > CONFIRM_ENUMERATE_MAX || !isMembersKey(row.audienceWatermark)) return null;
    return { filter: read.filter, count, tier, watermark: row.audienceWatermark };
  }
  return { filter: read.filter, count, tier, watermark: null };
}

/**
 * The walked people → the seeds, in walk order (the ids minted in that order — E21). ⛔ The key is the GATE's
 * (`parseTzNumber`); a number that does not parse is not seeded, it is counted. ⛔ `optOutToken` is null (E1).
 */
export function seedsOf(
  rows: readonly CampaignAudienceRow[],
  campaignId: string,
  createdAt: string,
  newId: () => string,
): { seeds: SmsCampaignRecipientSeed[]; unusable: number } {
  const seeds: SmsCampaignRecipientSeed[] = [];
  let unusable = 0;
  for (const r of rows) {
    const key = parseTzNumber(r.msisdn).msisdn;
    if (key === null) {
      unusable++;
      continue;
    }
    seeds.push(r.kind === "contact"
      ? { id: newId(), campaignId, msisdn: key, contactId: r.contactId, userId: r.linkedUserId, optOutToken: null, createdAt }
      : { id: newId(), campaignId, msisdn: key, contactId: null, userId: r.userId, optOutToken: null, createdAt });
  }
  return { seeds, unusable };
}

/**
 * ⭐ A LISTED CONFIRMATION, HELD TO ITS PEOPLE: the members key re-derived over the people about to be written — the walk's
 * own keys, named once (`canonicalMembers`), keyed with the CONFIRMED row's own scope — and compared through
 * `startAudienceVerdict`, the comparison Start makes. ⛔ Fails closed: people the pure rule cannot name (none, a sixth, a
 * key of another shape) have no key, and no key is never the watermark.
 */
export function listedPeopleHold(
  row: Pick<StoredSmsCampaign, "id" | "draftRevision">,
  frozen: FrozenAudience,
  people: readonly CampaignAudienceRow[],
  keyOf: typeof membersKeyOf,
): boolean {
  const canonical = canonicalMembers(people.map((p) => p.msisdn), people.length);
  const key = canonical === null ? null : keyOf({ campaignId: row.id, draftRevision: row.draftRevision }, canonical);
  return startAudienceVerdict({
    confirmedCount: frozen.count,
    confirmedTier: frozen.tier,
    confirmedWatermark: frozen.watermark,
    fresh: { count: people.length, membersKey: key },
  }).ok;
}

/**
 * The walk's OWN refusals of what is stored — a cursor it did not write, a cursor naming an arm the filter lacks, a filter
 * whose arms it cannot build (`audience.ts`: each refusal names its function first). ⭐ Those pause `audience_unreadable`;
 * any other throw (the database) is a failed read and is thrown on.
 */
const WALK_REFUSALS: readonly string[] = ["walkCampaignAudience:", "audienceArms:", "contactAudience:"];
export function walkRefusedStored(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return WALK_REFUSALS.some((p) => message.startsWith(p));
}

/* ══ THE DOORS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Frozen: production's step — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const ENQUEUE_DEPS: Readonly<EnqueueDeps> = Object.freeze({
  campaigns: Object.freeze({
    find: async (id: string) => db.smsCampaign.find(id),
    transition: async (id: string, t: SmsCampaignTransition) => db.smsCampaign.transition(id, t),
  }),
  recipients: Object.freeze({
    createMany: async (seeds: SmsCampaignRecipientSeed[]) => db.smsCampaignRecipient.createMany(seeds),
    countByStatus: async (campaignId: string) => db.smsCampaignRecipient.countByStatus(campaignId),
  }),
  walk: walkCampaignAudience,
  membersKeyOf,
  audit,
  now: () => new Date(),
  newId: () => `rcp_${ledgerStamp().id}`,
});

/* ══ THE STEP ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every row on the campaign — the ONE count (a groupBy over the rows, OD26). */
async function rowsOn(campaignId: string, deps: EnqueueDeps): Promise<number> {
  return (await deps.recipients.countByStatus(campaignId)).reduce((n, c) => n + c.count, 0);
}

/** One audit row; an audit that throws never turns a write that landed into a failed step. */
async function record(deps: EnqueueDeps, entry: Parameters<typeof audit>[0]): Promise<void> {
  try {
    await deps.audit(entry);
  } catch {
    // ⚠️ `audit()` itself never rejects (ruling 543); a stand-in that throws records nothing, and the step stands.
  }
}

/** A conditional write that found the campaign gone from PREPARING: say where it is now. */
async function notPreparing(campaignId: string, deps: EnqueueDeps): Promise<EnqueueStepResult> {
  const now = await deps.campaigns.find(campaignId);
  if (now === null) throw new Error("enqueueStep: the campaign is no longer there — nothing more was written");
  return { kind: "not_preparing", status: now.status };
}

/** ⛔ PAUSE — one conditional move, PREPARING → PAUSED, with the reason; recorded only when this move landed. */
async function pauseFor(row: StoredSmsCampaign, reason: EnqueuePauseReason, at: string, deps: EnqueueDeps): Promise<EnqueueStepResult> {
  const paused = await deps.campaigns.transition(row.id, {
    from: ["PREPARING"], to: "PAUSED", patch: { pausedAt: at, stopReason: reason }, draftRevision: null, at,
  });
  if (paused === null) return notPreparing(row.id, deps);
  await record(deps, {
    category: "SYSTEM", action: CAMPAIGN_PAUSED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: row.id,
    payload: { reason },
  });
  return { kind: "paused", reason };
}

type Finish = {
  /** Every row on the campaign before the move — counted, never added up. */
  rows: number;
  confirmed: number;
  duplicates: number;
  unusable: number;
  overflow: number;
  backstop: boolean;
  walkComplete: boolean;
};

/** ⭐ THE LIST IS FINISHED — one conditional move, PREPARING → RUNNING (`enqueuedAt`, the cursor `done`), then its one row. */
async function finish(row: StoredSmsCampaign, f: Finish, at: string, deps: EnqueueDeps): Promise<EnqueueStepResult> {
  const moved = await deps.campaigns.transition(row.id, {
    from: ["PREPARING"], to: "RUNNING", patch: { enqueuedAt: at, enqueueCursor: "done" }, draftRevision: null, at,
  });
  if (moved === null) return notPreparing(row.id, deps);
  await record(deps, {
    category: "SYSTEM", action: CAMPAIGN_ENQUEUED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: row.id,
    payload: {
      rows: f.rows, confirmed: f.confirmed, duplicates: f.duplicates, unusable: f.unusable, overflow: f.overflow,
      backstop: f.backstop, walkComplete: f.walkComplete,
    },
  });
  return { kind: "done", total: f.rows, unusable: f.unusable, overflow: f.overflow };
}

type WalkRead = { ok: true; page: CampaignAudiencePage } | { ok: false };

/** One page of the ONE walk — or a refusal of what is stored (`walkRefusedStored`). A failed read throws. */
async function walkPage(deps: EnqueueDeps, filter: ContactAudienceFilter, cursor: string | null): Promise<WalkRead> {
  try {
    return { ok: true, page: await deps.walk(filter, cursor, ENQUEUE_CHUNK) };
  } catch (err) {
    if (walkRefusedStored(err)) return { ok: false };
    throw err;
  }
}

/** ⭐ A LISTED CONFIRMATION — its people walked from the start, held to the members key, written in ONE write, finished. */
async function listedStep(row: StoredSmsCampaign, frozen: FrozenAudience, at: string, deps: EnqueueDeps): Promise<EnqueueStepResult> {
  const walked: CampaignAudienceRow[] = [];
  let cursor: string | null = null;
  let walkComplete = false;
  for (;;) {
    // ⚠️ Typed, as every cursor loop over the walk is (`campaignAudienceCount`): the cursor is fed back from the page.
    const read: WalkRead = await walkPage(deps, frozen.filter, cursor);
    if (!read.ok) return pauseFor(row, "audience_unreadable", at, deps);
    const page: CampaignAudiencePage = read.page;
    walked.push(...page.rows);
    if (page.next === "done") {
      walkComplete = true;
      break;
    }
    // One person more than were confirmed is enough: the cap leaves the rest out either way.
    if (walked.length > frozen.count) break;
    if (page.next === cursor) throw new Error("enqueueStep: the walk did not move — refusing to loop");
    cursor = page.next;
  }
  const people = walked.slice(0, frozen.count);
  // ⛔ Somebody changed in the moments after Start's check: nothing is written.
  if (!listedPeopleHold(row, frozen, people, deps.membersKeyOf)) return pauseFor(row, "audience_moved", at, deps);
  const { seeds, unusable } = seedsOf(people, row.id, at, deps.newId);
  const wrote = seeds.length === 0 ? { inserted: 0, duplicates: 0 } : await deps.recipients.createMany(seeds);
  return finish(row, {
    rows: await rowsOn(row.id, deps), confirmed: frozen.count, duplicates: wrote.duplicates, unusable,
    overflow: walked.length - people.length, backstop: false, walkComplete,
  }, at, deps);
}

/** ⭐ A TYPED CONFIRMATION — one chunk from the cursor, written within the cap, then the cursor moved on (or finished). */
async function typedStep(row: StoredSmsCampaign, frozen: FrozenAudience, at: string, deps: EnqueueDeps): Promise<EnqueueStepResult> {
  const limit = Math.min(frozen.count, ENQUEUE_BACKSTOP);
  const backstopped = (onList: number): boolean => frozen.count > ENQUEUE_BACKSTOP && onList >= ENQUEUE_BACKSTOP;
  let rows = await rowsOn(row.id, deps);
  if (rows >= limit) {
    // ⛔ The cap was met by an earlier step whose finish never landed: walk nothing — a page walked again here would be
    // people already on the list, read as people left out.
    return finish(row, {
      rows, confirmed: frozen.count, duplicates: 0, unusable: 0, overflow: 0, backstop: backstopped(rows), walkComplete: false,
    }, at, deps);
  }
  const cursor = row.enqueueCursor;
  const read = await walkPage(deps, frozen.filter, cursor);
  if (!read.ok) return pauseFor(row, "audience_unreadable", at, deps);
  const page = read.page;
  const { seeds, unusable } = seedsOf(page.rows, row.id, at, deps.newId);
  let inserted = 0;
  let duplicates = 0;
  let tried = 0;
  if (rows + seeds.length <= limit) {
    // The whole chunk fits, even were every seed a new person.
    if (seeds.length > 0) {
      const wrote = await deps.recipients.createMany(seeds);
      inserted = wrote.inserted;
      duplicates = wrote.duplicates;
    }
    tried = seeds.length;
    rows += inserted;
  } else {
    // ⭐ THE CAP'S PAGE — a room at a time, the room counted afresh before each write: never more seeds in one write than
    // the room left, and a person already on the list costs none of it.
    let room = limit - rows;
    while (room > 0 && tried < seeds.length) {
      const take = seeds.slice(tried, tried + room);
      const wrote = await deps.recipients.createMany(take);
      inserted += wrote.inserted;
      duplicates += wrote.duplicates;
      tried += take.length;
      rows = await rowsOn(row.id, deps);
      room = limit - rows;
    }
  }
  const overflow = seeds.length - tried;
  if (page.next === "done" || rows >= limit) {
    const total = await rowsOn(row.id, deps);
    return finish(row, {
      rows: total, confirmed: frozen.count, duplicates, unusable, overflow, backstop: backstopped(total),
      walkComplete: page.next === "done",
    }, at, deps);
  }
  if (page.next === cursor) throw new Error("enqueueStep: the walk did not move — refusing to loop");
  // ⛔ The cursor moves only AFTER the rows: a step that dies before this line is walked again, never skipped.
  const moved = await deps.campaigns.transition(row.id, {
    from: ["PREPARING"], to: null, patch: { enqueueCursor: page.next }, draftRevision: null, at,
  });
  if (moved === null) return notPreparing(row.id, deps);
  return { kind: "wrote", inserted, duplicates, unusable, next: page.next };
}

/**
 * ⭐ ONE ENQUEUE STEP for one campaign (the header). `not_preparing` writes nothing; a stored audience it cannot read pauses
 * the campaign `audience_unreadable`; a listed confirmation whose people changed pauses it `audience_moved`; otherwise one
 * chunk is written within the cap and the cursor moved on — or the list is finished and the campaign RUNNING.
 * ⛔ A read or a write that FAILS throws, and the next step starts again from the stored cursor.
 */
export async function enqueueStep(campaignId: string, deps: EnqueueDeps = ENQUEUE_DEPS): Promise<EnqueueStepResult> {
  const row = await deps.campaigns.find(campaignId);
  if (row === null) throw new Error("enqueueStep: no such campaign — nothing was written");
  if (row.status !== "PREPARING") return { kind: "not_preparing", status: row.status };
  const at = deps.now().toISOString();
  const frozen = frozenAudienceOf(row);
  if (frozen === null) return pauseFor(row, "audience_unreadable", at, deps);
  return frozen.tier === "enumerate" ? listedStep(row, frozen, at, deps) : typedStep(row, frozen, at, deps);
}
