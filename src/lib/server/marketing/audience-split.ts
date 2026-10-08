/**
 * U38a · THE AUDIENCE SPLIT — matching · reachable · will receive · not receiving, each figure an answer of THE GATE.
 *
 * ⭐ WHAT IT IS. The engine under the campaign's audience card (U38b paints it; U39b quotes it; U40 confirms the
 * population it walked). It walks the campaign audience — the ONE walk, `walkCampaignAudience` — and asks the REAL send
 * gate, `mayReceiveMarketingSms`, about every number. ⛔ ONE DECISION DEFINITION: only the gate's three single-key READS
 * are batched (a chunk's suppressions, accounts and latest consents, through §25's bulk reads — `MarketingGateReads`);
 * the decision is the gate's own code. A split that decided from the book's consent cache, or from pre-read rows with a
 * logic of its own, would be a second definition of "may receive" — and the two would only have to disagree once.
 *
 * THE FIGURES, AND WHY THEY ADD UP BY CONSTRUCTION (`assertAudienceSplitAdds` refuses a split that does not):
 *   · matching   — every row the walk yields: the campaign population (X9), what U40 confirms and U42 enqueues.
 *   · unsendable — the gate's `bad_msisdn` (a 064, a landline, a foreign number). matching = unsendable + reachable.
 *   · reachable  — a sendable Tanzanian mobile number. reachable = will receive + not receiving + unchecked.
 *   · will receive — the gate said yes, NOW. A forecast: the gate is asked again at send (§5.6).
 *   · not receiving — the gate's refusals in FIVE buckets, plus `unanswered` (a gate that could not answer — asked again
 *     at send). ⛔ PROTECTED STANDING IS ONE LINE FOR EVERY ROLE: self-exclusion, a break, a harm marker, the under-25
 *     promise, a minor and the account's status all read `protected`, never itemised (U20's REACH ruling; D19).
 *   · unchecked — past the time budget the gate is asked WITHOUT reads: it still names an unsendable number, and every
 *     other is `unchecked` — shown "≥ N", never guessed, never counted as will receive.
 *
 * ⛔ IT NEVER WRITES AND NEVER SENDS: no audit row (the send loop writes the RG line when it ACTS on a refusal —
 * `dispatch.ts`), no token, no SmsMessage, no `dispatchSlice`, no `sendBatch`. `test:campaign-audience` proves the
 * store and the chain unchanged across a split over RG-refused players.
 * ⛔ X25 / D19 · THE DOOR ASKS THE ROLE RULE FIRST (`campaignAudienceRefusal`): a viewer who may not read a number is
 * refused a search, and is handed a sample with no per-row detail — no contact or account id, no name, no verdict —
 * because a "will receive" row is today a player's (every contact-only number is refused until U33).
 * ⭐ THE POOL IS SHARED WITH BETS: one split runs per filter key at a time (a second asker joins it), and at most
 * `AUDIENCE_SPLITS_PER_PROCESS` run at once — a third waits for a slot (an asker may bound that wait and be answered
 * "busy": the confirmation's own count and its read — U40b). Each split's reads run one after another.
 *
 * Guard: `test:campaign-audience` (in `predeploy`, in-process `--prove-red`).
 */
import { db } from "@/lib/server/store";
import type {
  BookStandingEntry, MessagingKey, MessagingKeyBatch, StoredMessagingConsent, StoredSuppression, StoredUser,
} from "@/lib/server/store";
// U33a-G · the record the split prices ONCE per chunk, and its type.
import { licenceOutreach, type LicenceOutreach } from "@/lib/server/marketing/outreach-record";
import { mayReceiveMarketingSms, userPhoneKeyFor, DB_GATE_READS } from "@/lib/server/marketing/consent";
import type { MarketingGateReads, MarketingGateVerdict, MarketingSkipReason } from "@/lib/server/marketing/consent";
import { walkCampaignAudience, contactAudienceKey, campaignAudienceRefusal, campaignAudienceCount, CAMPAIGN_WALK_MAX } from "@/lib/server/marketing/audience";
import type { CampaignAudiencePage, CampaignAudienceRow, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";

/* ═══ THE CONSTANTS — each to be re-derived from production latency at U52 ═══════════════════════════════════ */

/** Rows a walk page holds, and so the keys one bulk read takes — inside §25's 2,000 and the walk's own clamp. */
export const AUDIENCE_SPLIT_CHUNK = 1000;
/** How long a split may ask the gate before the rest is `unchecked`. */
export const AUDIENCE_SPLIT_BUDGET_MS = 10_000;
/** Splits running at once in one process — the DB pool is shared with bet admission. */
export const AUDIENCE_SPLITS_PER_PROCESS = 2;
/** The sample: the first reachable rows, in the walk's own order. */
export const AUDIENCE_SAMPLE_SIZE = 5;

/* ═══ THE VOCABULARY — one bucket for every refusal the gate can give ════════════════════════════════════════ */

export type AudienceBucket = "suppressed" | "no_consent" | "withdrawn" | "age_unknown" | "protected";
/** The five, in display order. ⛔ `protected` is ONE line: the reasons inside it are never a key of the split. */
export const AUDIENCE_BUCKETS: readonly AudienceBucket[] = ["suppressed", "no_consent", "withdrawn", "age_unknown", "protected"];
/** Where one number lands. */
export type AudienceSlot = "willReceive" | "unsendable" | "unchecked" | "unanswered" | AudienceBucket;

/** ⭐ A FULL Record over the gate's reasons, so a reason the gate gains (U14's cap) is a compile error here until it is
 *  given a bucket — never a number that silently falls out of the split. */
export const AUDIENCE_BUCKET_OF: Readonly<Record<MarketingSkipReason, "unsendable" | AudienceBucket>> = {
  bad_msisdn: "unsendable",
  suppressed: "suppressed",
  no_consent: "no_consent",
  /* U33a-G · "no basis" lands in the SAME line as "no consent". They are different facts for an officer reading one
     number's refusal, but the split is a count of who will not be reached and why in one word — and to the person
     holding the phone the two are the same thing: nothing authorises a message to them. */
  no_basis: "no_consent",
  consent_withdrawn: "withdrawn",
  age_unknown: "age_unknown",
  rg_self_excluded: "protected",
  rg_cooling_off: "protected",
  rg_harm_marker: "protected",
  rg_under25_history: "protected",
  age_minor: "protected",
  account_status: "protected",
};

/** What asking the gate about one number produced: its verdict, or no verdict (past the budget; the gate threw). */
export type AudienceGateOutcome =
  | { kind: "verdict"; verdict: MarketingGateVerdict }
  | { kind: "unchecked" }
  | { kind: "unanswered" };

/** The ONE mapping from the gate's answer to a slot of the split. */
export function audienceSlotOf(o: AudienceGateOutcome): AudienceSlot {
  if (o.kind === "unchecked") return "unchecked";
  if (o.kind === "unanswered") return "unanswered";
  return o.verdict.ok ? "willReceive" : AUDIENCE_BUCKET_OF[o.verdict.skipReason];
}

/* ═══ THE SHAPE ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⛔ ONLY FOR A VIEWER WHO MAY READ A NUMBER: which row it is (for `<Sensitive>` — a contact id or an account id, never
 *  the number), the book row's name (an account's is never copied here), and where the gate put it. */
export type AudienceSampleDetail = {
  subject: { field: "contactPhone" | "phone"; id: string };
  name: string | null;
  slot: Exclude<AudienceSlot, "unsendable">;
};
/** One sample row. The number is MASKED for every role (`maskPhone`, the registry's mask at rest); the operator is the
 *  range holder's brand ("Operator (by prefix)" — numbers are portable). `detail` is null for a masked viewer. */
export type AudienceSampleRow = { masked: string; operator: string | null; detail: AudienceSampleDetail | null };

export type AudienceSplit = {
  /** The filter's ONE key (`contactAudienceKey`) — U38b keys its Suspense by it. */
  filterKey: string;
  matching: number;
  unsendable: number;
  reachable: number;
  willReceive: number;
  /** ⛔ Exactly the five buckets — no `rg_*`, `age_minor` or `account_status` key, ever. */
  notReceiving: Record<AudienceBucket, number>;
  unanswered: number;
  /** Σ notReceiving + unanswered — counted from the answers, never matching − will receive. */
  notReceivingTotal: number;
  unchecked: number;
  sample: AudienceSampleRow[];
  computedAt: string;
  durationMs: number;
};

export type AudienceSplitResult = { ok: true; split: AudienceSplit } | { ok: false; param: string; reason: string };

export type AudienceSplitOptions = {
  /** May this viewer read a number (identity.contact `read`)? ⛔ No default — the door decides the role, every time. */
  viewerReads: boolean;
  /** The gate's clock — one instant for the whole split, so the age and RG boundaries are read alike. */
  now?: Date;
  budgetMs?: number;
  /** The budget's clock (milliseconds). */
  clock?: () => number;
  chunk?: number;
  /** A suite's window onto each number's slot, in walk order. Production never passes it. */
  observe?: (row: CampaignAudienceRow, slot: AudienceSlot) => void;
  /** ⭐ U40b · the most this asker waits for a slot, in ms — past it `AudienceSlotBusy`, nothing walked (a reader's split in
   *  the confirmation's view: the U40b re-review's MINOR 3). A bounded asker computes its OWN split, never joining one
   *  nor lending its own: its line may end in "busy", which no joiner asked for. */
  waitMs?: number;
};

/** Every slot's count, as the walk tallies it. */
export type AudienceTally = {
  matching: number;
  unsendable: number;
  reachable: number;
  willReceive: number;
  unanswered: number;
  unchecked: number;
  /** Starts with the five buckets at zero, so a bucket nobody fell into still reads 0. */
  notReceiving: Record<string, number>;
};
export type AudienceSplitFigures = Pick<AudienceSplit,
  "matching" | "unsendable" | "reachable" | "willReceive" | "notReceiving" | "unanswered" | "notReceivingTotal" | "unchecked">;

/** The figures, from the tally — every one a COUNT of answers; `notReceivingTotal` is their sum, never a subtraction. */
export function audienceSplitFigures(t: AudienceTally): AudienceSplitFigures {
  let refusals = 0;
  for (const n of Object.values(t.notReceiving)) refusals += n;
  return {
    matching: t.matching,
    unsendable: t.unsendable,
    reachable: t.reachable,
    willReceive: t.willReceive,
    notReceiving: { ...t.notReceiving } as Record<AudienceBucket, number>,
    unanswered: t.unanswered,
    notReceivingTotal: refusals + t.unanswered,
    unchecked: t.unchecked,
  };
}

/**
 * ⛔ A SPLIT THAT DOES NOT ADD UP IS NEVER SHOWN — this throws unless matching = unsendable + reachable,
 * reachable = will receive + not receiving + unchecked, not receiving = Σ the buckets + unanswered, every figure a whole
 * number, the buckets EXACTLY the five (a protected reason itemised fails here, in production too), and the sample at
 * most `AUDIENCE_SAMPLE_SIZE`.
 */
export function assertAudienceSplitAdds(s: AudienceSplit): void {
  const keys = Object.keys(s.notReceiving).sort().join(",");
  if (keys !== [...AUDIENCE_BUCKETS].sort().join(",")) throw new Error(`audience split: the buckets are not exactly the five (${keys})`);
  const figures = [s.matching, s.unsendable, s.reachable, s.willReceive, s.unanswered, s.notReceivingTotal, s.unchecked, ...Object.values(s.notReceiving)];
  if (!figures.every((n) => Number.isInteger(n) && n >= 0)) throw new Error("audience split: a figure is not a whole number");
  let refusals = 0;
  for (const n of Object.values(s.notReceiving)) refusals += n;
  if (s.matching !== s.unsendable + s.reachable) throw new Error("audience split: matching is not unsendable + reachable");
  if (s.notReceivingTotal !== refusals + s.unanswered) throw new Error("audience split: not receiving is not the buckets + unanswered");
  if (s.reachable !== s.willReceive + s.notReceivingTotal + s.unchecked) throw new Error("audience split: reachable is not will receive + not receiving + unchecked");
  if (s.sample.length > AUDIENCE_SAMPLE_SIZE) throw new Error("audience split: the sample is larger than its size");
}

/** ⛔ X25 / D19 · the split as a viewer sees it — a viewer who may not read a number gets the sample with no detail. */
export function audienceSplitForViewer(split: AudienceSplit, viewerReads: boolean): AudienceSplit {
  if (viewerReads) return split;
  return { ...split, sample: split.sample.map((r) => ({ masked: r.masked, operator: r.operator, detail: null })) };
}

/* ═══ THE DEPENDENCIES — swappable for the suite's in-process red plants; production never passes them ═════════ */

export type AudienceSplitDeps = {
  walk: typeof walkCampaignAudience;
  gate: typeof mayReceiveMarketingSms;
  /** §25 · the bulk reads behind the gate's three single reads. */
  suppressions: (b: MessagingKeyBatch) => Promise<StoredSuppression[]>;
  users: (phones: string[]) => Promise<StoredUser[]>;
  consents: (b: MessagingKeyBatch) => Promise<StoredMessagingConsent[]>;
  /** U33a-G · the book standing of the chunk's ACCOUNTLESS keys, one query (§27's `standingAmong`). */
  standings: (msisdns: string[]) => Promise<BookStandingEntry[]>;
  /** U33a-G · the licence-outreach record, read once per chunk. No query — this process's config cache. */
  outreach: () => Promise<LicenceOutreach> | LicenceOutreach;
  slotOf: typeof audienceSlotOf;
  figures: typeof audienceSplitFigures;
  shape: typeof audienceSplitForViewer;
  refusal: typeof campaignAudienceRefusal;
};
/** Frozen: production's split — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const AUDIENCE_SPLIT_DEPS: Readonly<AudienceSplitDeps> = Object.freeze({
  walk: walkCampaignAudience,
  gate: mayReceiveMarketingSms,
  suppressions: async (b: MessagingKeyBatch) => db.suppression.findActiveAmong(b),
  users: async (phones: string[]) => db.user.findByPhones(phones),
  consents: async (b: MessagingKeyBatch) => db.messagingConsent.latestAmong(b),
  standings: async (msisdns: string[]) => db.contactListBasis.standingAmong(msisdns),
  outreach: () => licenceOutreach(),
  slotOf: audienceSlotOf,
  figures: audienceSplitFigures,
  shape: audienceSplitForViewer,
  refusal: campaignAudienceRefusal,
});

/* ═══ THE READS — a chunk's answers, handed to the gate ════════════════════════════════════════════════════════ */

/**
 * The gate's three reads for one chunk, answered from three bulk reads (one query each, one after another). A key the
 * chunk did not ask about falls back to the store's own single read — so a mismatch costs a query, never a wrong answer.
 * ⛔ The keys are the gate's own (`parseTzNumber(...).msisdn`, and `+` that for the account); an unsendable number is
 * not asked about — the gate refuses it before any read.
 */
export async function prefetchGateReads(msisdns: readonly string[], deps: Pick<AudienceSplitDeps, "suppressions" | "users" | "consents" | "standings" | "outreach"> = AUDIENCE_SPLIT_DEPS): Promise<MarketingGateReads> {
  const keys: string[] = [];
  for (const m of msisdns) {
    const parsed = parseTzNumber(m);
    if (parsed.verdict === "ok" && parsed.msisdn) keys.push(parsed.msisdn);
  }
  const unique = Array.from(new Set(keys));
  if (unique.length === 0) return DB_GATE_READS;
  const batch: MessagingKeyBatch = { channel: "SMS", category: "MARKETING", identifiers: unique };
  const stops = await deps.suppressions(batch);
  const accounts = await deps.users(unique.map(userPhoneKeyFor));
  const consents = await deps.consents(batch);
  const known = new Set(unique);
  const phones = new Set(unique.map(userPhoneKeyFor));
  const stopOf = new Map(stops.map((s) => [s.identifier, s] as const));
  const accountOf = new Map(accounts.map((u) => [u.phoneE164, u] as const));
  const latestOf = new Map(consents.map((c) => [c.identifier, c] as const));
  /* ⭐ U33a-G · THE RECORD IS READ ONCE PER CHUNK, not once per number. It is this process's config cache, so the read
     is free — but it must also be CONSISTENT across a chunk: a split whose first half priced an open record and whose
     second half priced a closed one would report a count that was never true at any instant. */
  const outreachOnce = await Promise.resolve(deps.outreach());
  /* ⭐ And the book is asked ONLY about the keys with no account — the player branch never reaches the book, so asking
     about a number an account holds would be a query bought for an answer nobody reads. */
  const accountless = unique.filter((m) => !accountOf.has(userPhoneKeyFor(m)));
  const standingOf = new Map((accountless.length > 0 ? await deps.standings(accountless) : []).map((e) => [e.msisdn, e.standing] as const));
  const ours = (k: MessagingKey) => k.channel === "SMS" && k.category === "MARKETING" && known.has(k.identifier);
  return {
    suppression: (k) => (ours(k) ? stopOf.get(k.identifier) ?? null : DB_GATE_READS.suppression(k)),
    userByPhone: (phone) => (phones.has(phone) ? accountOf.get(phone) ?? null : DB_GATE_READS.userByPhone(phone)),
    latestConsent: (k) => (ours(k) ? latestOf.get(k.identifier) ?? null : DB_GATE_READS.latestConsent(k)),
    outreach: () => outreachOnce,
    // ⛔ A key missing from the map falls back to the single read: it costs a query and can never give a wrong answer.
    bookStanding: (m) => standingOf.get(m) ?? DB_GATE_READS.bookStanding(m),
  };
}

/** The budget's sentinel: the reads a number past the budget is asked with throw it, so the gate answers only what it
 *  can WITHOUT a read (an unsendable number) and every other number is `unchecked`. */
const BUDGET_SPENT = new Error("audience split: past the time budget — not checked here, checked at send");
const refuseRead = (): never => {
  throw BUDGET_SPENT;
};
/* ⛔ `outreach` DOES NOT THROW (S13), and that is deliberate: it is this process's config cache, so it costs no database
   read, and the budget exists to stop READS — not to stop thinking. The gate asks it only after consent has already
   refused, so a number past the budget still lands in `unchecked` through the first read that does throw. */
const BUDGET_READS: MarketingGateReads = {
  suppression: refuseRead, userByPhone: refuseRead, latestConsent: refuseRead,
  outreach: () => licenceOutreach(), bookStanding: refuseRead,
};

async function askGate(row: CampaignAudienceRow, now: Date, reads: MarketingGateReads, deps: AudienceSplitDeps): Promise<AudienceGateOutcome> {
  try {
    return { kind: "verdict", verdict: await deps.gate(row.msisdn, now, reads) };
  } catch (err) {
    return err === BUDGET_SPENT ? { kind: "unchecked" } : { kind: "unanswered" };
  }
}

function sampleRowOf(row: CampaignAudienceRow, slot: Exclude<AudienceSlot, "unsendable">): AudienceSampleRow {
  return {
    masked: maskPhone(row.msisdn),
    operator: parseTzNumber(row.msisdn).operator?.brand ?? null,
    detail: row.kind === "contact"
      ? { subject: { field: "contactPhone", id: row.contactId }, name: row.name, slot }
      : { subject: { field: "phone", id: row.userId }, name: null, slot },
  };
}

/* ═══ THE ENGINE ═════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The split itself — one walk, the gate asked about every number, nothing written. ⚠️ Not shaped for a viewer and not
 * coalesced: the door is `audienceSplit`. Exported for the suite.
 */
export async function computeAudienceSplit(
  f: ContactAudienceFilter,
  opts: AudienceSplitOptions,
  deps: AudienceSplitDeps = AUDIENCE_SPLIT_DEPS,
): Promise<AudienceSplit> {
  const clock = opts.clock ?? Date.now;
  const now = opts.now ?? new Date();
  const chunk = Math.min(CAMPAIGN_WALK_MAX, AUDIENCE_SPLIT_CHUNK, Math.max(1, Math.floor(opts.chunk ?? AUDIENCE_SPLIT_CHUNK)));
  const started = clock();
  const deadline = started + (opts.budgetMs ?? AUDIENCE_SPLIT_BUDGET_MS);
  const inBudget = (): boolean => clock() < deadline;
  const tally: AudienceTally = {
    matching: 0, unsendable: 0, reachable: 0, willReceive: 0, unanswered: 0, unchecked: 0,
    notReceiving: Object.fromEntries(AUDIENCE_BUCKETS.map((b) => [b, 0])),
  };
  const sample: AudienceSampleRow[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page: CampaignAudiencePage = await deps.walk(f, cursor, chunk);
    if (page.rows.length > 0) {
      // One chunk's three bulk reads — only while the budget lasts; past it the gate is asked with no reads at all.
      const reads = inBudget() ? await prefetchGateReads(page.rows.map((r) => r.msisdn), deps) : null;
      for (const row of page.rows) {
        const slot = deps.slotOf(await askGate(row, now, reads !== null && inBudget() ? reads : BUDGET_READS, deps));
        tally.matching++;
        if (slot === "unsendable") tally.unsendable++;
        else {
          tally.reachable++;
          if (slot === "willReceive") tally.willReceive++;
          else if (slot === "unchecked") tally.unchecked++;
          else if (slot === "unanswered") tally.unanswered++;
          else tally.notReceiving[slot] = (tally.notReceiving[slot] ?? 0) + 1;
          if (sample.length < AUDIENCE_SAMPLE_SIZE) sample.push(sampleRowOf(row, slot));
        }
        opts.observe?.(row, slot);
      }
    }
    if (page.next === "done") break;
    if (page.next === cursor) throw new Error("audience split: the walk did not move — refusing to loop");
    cursor = page.next;
  }
  const split: AudienceSplit = {
    filterKey: contactAudienceKey(f),
    ...deps.figures(tally),
    sample,
    computedAt: new Date().toISOString(),
    durationMs: Math.max(0, clock() - started),
  };
  assertAudienceSplitAdds(split);
  return split;
}

/* ═══ THE DOOR — the role rule, one split per filter key, at most two at once ════════════════════════════════════ */

type SplitState = { flights: Map<string, Promise<AudienceSplit>>; running: number; waiting: Array<() => void> };
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AUDIENCE_SPLITS: SplitState | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIENCE_COUNTS: Map<string, Promise<number>> | undefined;
}
/** On globalThis, so a hot reload cannot start a second set of slots beside the first. */
const SPLITS: SplitState = globalThis.__50PICK_AUDIENCE_SPLITS ?? (globalThis.__50PICK_AUDIENCE_SPLITS = {
  flights: new Map(), running: 0, waiting: [],
});

/**
 * ⭐ U40b · NO SLOT IN TIME — what an asker that bounds its wait (`waitMs`) is answered instead of being left in the line:
 * nothing was walked or counted, and the caller says "busy" (the confirmation's read and its own count — the U40b
 * re-review's MINOR 3). Recognised by its code (`isAudienceSlotBusy`), so it survives being caught and thrown again.
 */
export class AudienceSlotBusy extends Error {
  readonly code = "AUDIENCE_SLOT_BUSY";
  readonly waitedMs: number;
  constructor(waitedMs: number) {
    super(`audience slot: none free within ${waitedMs} ms — nothing was counted`);
    this.name = "AudienceSlotBusy";
    this.waitedMs = waitedMs;
  }
}
export function isAudienceSlotBusy(err: unknown): err is AudienceSlotBusy {
  return err !== null && typeof err === "object" && (err as { code?: unknown }).code === "AUDIENCE_SLOT_BUSY";
}

/** At most `AUDIENCE_SPLITS_PER_PROCESS` splits at once: a full house waits, and a finished split hands its slot
 *  STRAIGHT to the next in line (no gap a newcomer could take, so the count never exceeds the limit).
 *  ⭐ U40b · A BOUNDED WAIT for the asker that names one (`waitMs`): past it the asker leaves the line — its place is taken
 *  out, so no slot is ever handed to an asker that gave up — and is answered `AudienceSlotBusy`; 0 takes a slot only if one
 *  is free now. Without `waitMs` the wait is as it was: unbounded.
 *  ⭐ U40b · `waited` is told, once the asker holds its slot, how long it waited for it — the confirmation's read budgets
 *  only its WAITING, never a walk (the third pass).
 *  ⚠️ No deadline on a slot once held: a split holds its slot until its reads settle, and a failed read releases it
 *  (`finally`). Two splits stuck on reads that never settle would hold both slots — with the database itself hung, which
 *  bets would feel first. The other constants are U52's to size. */
async function withSplitSlot<T>(work: () => Promise<T>, waitMs?: number, waited?: (ms: number) => void): Promise<T> {
  const asked = Date.now();
  if (SPLITS.running < AUDIENCE_SPLITS_PER_PROCESS) SPLITS.running++;
  else if (!bounded(waitMs)) await new Promise<void>((resolve) => SPLITS.waiting.push(resolve));
  else await slotWithin(waitMs);
  try {
    waited?.(Date.now() - asked);
    return await work();
  } finally {
    const next = SPLITS.waiting.shift();
    if (next) next();
    else SPLITS.running--;
  }
}

/** ⭐ U40b · is this a BOUND on the wait for a slot? Any number but +∞ — none, or an infinite one, is the plain line. */
function bounded(waitMs: number | undefined): waitMs is number {
  return waitMs !== undefined && waitMs !== Number.POSITIVE_INFINITY;
}

/** ⭐ U40b · a place in line for at most `waitMs`: handed a slot (the releaser hands it over, `running` unchanged), or out of
 *  the line and `AudienceSlotBusy` — whichever comes first. Zero, less, or no number waits not at all; a finite wait past a
 *  timer's longest (2³¹ − 1 ms) is that longest (an infinite one is the plain line, `withSplitSlot`). */
function slotWithin(waitMs: number): Promise<void> {
  if (!(waitMs > 0)) return Promise.reject(new AudienceSlotBusy(0));
  const ms = Math.min(waitMs, 2_147_483_647);
  return new Promise<void>((resolve, reject) => {
    const take = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      const at = SPLITS.waiting.indexOf(take);
      if (at < 0) return;
      SPLITS.waiting.splice(at, 1);
      reject(new AudienceSlotBusy(ms));
    }, ms);
    SPLITS.waiting.push(take);
  });
}

/** One walk count per filter key, shared by every asker — on globalThis beside the split's own flights. */
const COUNTS: Map<string, Promise<number>> = globalThis.__50PICK_AUDIENCE_COUNTS ?? (globalThis.__50PICK_AUDIENCE_COUNTS = new Map());

/** ⭐ U40b · how one asker takes the walk's count. */
export type WalkCountOptions = {
  /** `false` — count afresh: never JOIN a count already running for this filter key (it may have begun before a contact
   *  was added, and a confirmation would freeze the old number: OD27, the U40b re-review's MINOR 2), and never lend this
   *  one to a later asker. */
  join?: boolean;
  /** The most this asker waits for a slot of its own, in ms — past it `AudienceSlotBusy`, nothing counted (MINOR 3).
   *  ⛔ A BOUND MEANS ITS OWN COUNT (the third pass): a bounded asker neither joins a count nor lends its own, so an
   *  unbounded asker can never inherit a "busy" it did not ask for. */
  waitMs?: number;
  /** Told, once this asker holds its own slot, how long it waited for it (ms) — what the confirmation's read charges
   *  against its bound, never the walk. A count joined tells nothing: it waited for no slot of its own. */
  waited?: (ms: number) => void;
};

/**
 * ⭐ OD65 · THE COUNT ALONE, UNDER THE SPLIT'S OWN LIMITS (the U38b review's #6) — what a viewer who may not read a number is
 * counted with (`composeAudienceCount`): the ONE walk's count, never the gate, inside the SAME per-process slots as the
 * split (`AUDIENCE_SPLITS_PER_PROCESS` — the pool is shared with bets), and ONE count per filter key that every asker joins.
 * The role rule is the caller's (`campaignAudienceRefusal`). `count` exists for in-process spies: a count other than the
 * real one computes its own, still inside the slots.
 * ⭐ U40b · `opts` — the confirmation's own count (`audience-fence.ts`) takes it with `join: false` and a bounded wait.
 */
export async function audienceWalkCount(
  f: ContactAudienceFilter,
  count: (f: ContactAudienceFilter) => Promise<number> = campaignAudienceCount,
  opts: WalkCountOptions = {},
): Promise<number> {
  const shared = count === campaignAudienceCount && opts.join !== false && !bounded(opts.waitMs);
  const key = contactAudienceKey(f);
  let flight = shared ? COUNTS.get(key) : undefined;
  if (flight === undefined) {
    const mine = withSplitSlot(() => count(f), opts.waitMs, opts.waited);
    if (shared) {
      COUNTS.set(key, mine);
      const clear = (): void => {
        if (COUNTS.get(key) === mine) COUNTS.delete(key);
      };
      void mine.then(clear, clear);
    }
    flight = mine;
  }
  return flight;
}

/** The slots as they stand — for the suite and for a health read. */
export function audienceSplitSlots(): { running: number; waiting: number; flights: number } {
  return { running: SPLITS.running, waiting: SPLITS.waiting.length, flights: SPLITS.flights.size };
}

/**
 * ⭐ THE DOOR — what U38b's card, U39b's estimate and U40's confirmation call.
 *   1 · The role rule FIRST (`campaignAudienceRefusal`, X25): a refused filter is answered before any read.
 *   2 · ONE split per filter key: a second asker for the same audience JOINS the one running — each gets it shaped for
 *       their own role. (A call with injected options — a suite's clock, budget, chunk or observer, its own
 *       dependencies, or a bounded wait — computes its own, still inside the per-process limit.)
 *   3 · At most `AUDIENCE_SPLITS_PER_PROCESS` at once; an asker that bounds its wait (`waitMs`) is answered
 *       `AudienceSlotBusy` past it (U40b).
 *   4 · The sample shaped for the viewer (`audienceSplitForViewer`).
 * ⛔ A read that fails THROWS to the caller — the card shows an error with "Count again", never a zero.
 */
export async function audienceSplit(
  f: ContactAudienceFilter,
  opts: AudienceSplitOptions,
  deps: AudienceSplitDeps = AUDIENCE_SPLIT_DEPS,
): Promise<AudienceSplitResult> {
  const refused = deps.refusal(f, opts.viewerReads);
  if (refused !== null) return { ok: false, param: refused.param, reason: refused.reason };
  const shared = deps === AUDIENCE_SPLIT_DEPS && opts.now === undefined && opts.budgetMs === undefined
    && opts.clock === undefined && opts.chunk === undefined && opts.observe === undefined && !bounded(opts.waitMs);
  const key = contactAudienceKey(f);
  let flight = shared ? SPLITS.flights.get(key) : undefined;
  if (flight === undefined) {
    const mine = withSplitSlot(() => computeAudienceSplit(f, opts, deps), opts.waitMs);
    if (shared) {
      SPLITS.flights.set(key, mine);
      const clear = (): void => {
        if (SPLITS.flights.get(key) === mine) SPLITS.flights.delete(key);
      };
      void mine.then(clear, clear);
    }
    flight = mine;
  }
  return { ok: true, split: deps.shape(await flight, opts.viewerReads) };
}
