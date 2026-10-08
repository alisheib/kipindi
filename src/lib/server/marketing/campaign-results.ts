/**
 * ⭐ U48a · THE RESULTS ON THE LIVE CAMPAIGN PAGE — what became of the messages a campaign handed over, and the honesty that
 * keeps "handed over" from ever passing for "delivered" (ENGINE-SPEC §4.16; E5 · E23 · E28 · E30 · OD24 · OD26 · OD40 · OD41).
 * `campaignLiveView` (campaign-live.ts) fills its `results` field from here, with the SAME rows it has already counted.
 *
 * ── NO SECOND COUNT OF THE ROWS (OD26) ───────────────────────────────────────────────────────────────────────────────────
 * Every figure about the people on the campaign — delivered, handed over with no receipt, failed (and which way), not sent,
 * no answer, still to be messaged — is read off the view's ONE groupBy (`countByOutcome`) and the counts summed from it,
 * handed in; this file asks for it again nowhere. Two figures on one page can never disagree: "Handed over" in the figures
 * card IS "Delivered" + "Handed over, no receipt yet" here. The "not sent" reasons are the view's own list (the one function
 * that words it, `AUDIENCE_BUCKET_OF` → U38b's five labels, protected ONE line), handed in too.
 * Only THREE figures need a read of their own, because the groupBy cannot answer them — and each is a fixed, bounded cost:
 *   · E5 · "no receipt after 15 minutes" — ONE count of the rows still SENT and handed over before the cutoff
 *     (`countSentBefore`), asked only when some row is SENT;
 *   · E30 · "stopped by their link since this campaign" — a keyset walk of the campaign's handed-over people in chunks of
 *     1,000 (`handedOverPage`), each chunk's active stops in ONE query (§25's `findActiveAmong`, no new member), then the
 *     attribution below for the few that stopped. It is the one expensive figure, so production asks it through a
 *     single-flight memory of `STOPPED_BY_LINK_TTL_MS` per campaign (a 150,000-person campaign is not walked on every
 *     step and every watcher's poll; a read that failed is never kept) — and a view waits for it at most
 *     `RESULTS_READ_BUDGET_MS`: a walk still running says "couldn't be counted just now" this once and goes on without the
 *     view, so the next view finds it done (the page never hangs on the biggest list);
 *   · the configured price — for a viewer who may read money only.
 * ⛔ A READ THAT FAILS IS SAID, NEVER A ZERO: the two counts above come back `null` and the card says "couldn't be counted
 * just now" — an auxiliary figure never stops the page or its driver (a thrown call stops the driver for good).
 *
 * ── DELIVERED IS WHAT A RECEIPT SAID (OD41, E28) ─────────────────────────────────────────────────────────────────────────
 * "Delivered" is the DELIVERED rows and nothing else: the network taking a message (`accepted`, the recipient's SENT) is
 * "handed over", and no sum, relabelling or fallback turns it into delivery. A receipt reaches a recipient only through
 * U46a's arm (`recordReceipt`, the DLR route), which moves the row to DELIVERED — or FAILED, whose class carries the vendor's
 * token as `receipt:<TOKEN>`. So the failed are split by it: no `receipt:` class = the network refused it when it was handed
 * over (the wire); a `receipt:` class = the network took it and then reported it undelivered. Only `DELIVRD` has ever arrived
 * live (BLACKBALL-SMS §3) — every failure token is the vendor's word, not yet evidence.
 * THE HONESTY LINES ARE RENDERED FROM THE DATA, never written down: while some message was handed over and NO receipt of any
 * kind (delivered, or a failure) has reached this campaign, "no delivery receipt has arrived yet — 'handed over' is not
 * 'delivered'"; gone by itself the moment one does. And when this server could not take a receipt at all
 * (`receiptsSetUp` — the DLR route's own rule, below), "Delivered will stay at zero" is said as well. Neither is said about a
 * campaign that handed nothing over, and neither is ever said to a viewer below E23's floor.
 *
 * ── STOPPED BY THEIR LINK (E30) ─────────────────────────────────────────────────────────────────────────────────────────
 * A number counts when it is among this campaign's handed-over people AND holds an ACTIVE stop whose reason is WITHDRAWN,
 * whose evidence starts `optout:` (what the opt-out link writes, `optout-service.ts`; an officer's bulk withdrawal or a
 * complaint carries other evidence) and which was created at or after this campaign's message to it (`sentAt`).
 * ⭐ ATTRIBUTED TO THE MOST RECENT CAMPAIGN BEFORE THE STOP: one number holds one link whatever campaign messaged it, so a
 * stop made after a NEWER campaign's message to the same number is that campaign's, not this one's — counted here only when
 * no other campaign handed the number a message between this one's and the stop. A stop BEFORE this campaign's message is not
 * this campaign's; a lifted stop is not active; a message that was never handed over (SKIPPED, FAILED) carries no link.
 * ⚠️ KNOWN LIMITS, said rather than hidden: a stop's `createdAt` is when the person FIRST said no (a stop lifted and made
 * again keeps its first instant, only its evidence moves on), so someone who stopped, resumed and stopped again by this
 * campaign's link may not be counted; and a stop by the link of a TEST send or an invite is not told apart from a campaign's.
 * Both err toward fewer, never toward a stop this campaign did not earn.
 *
 * ── WHO SEES WHAT ───────────────────────────────────────────────────────────────────────────────────────────────────────
 * ⛔ E23 · THE FLOOR — a viewer below it (`hidden`: may not read a number, fewer than 10 rows) gets NO results at all, so
 * nothing in them can name a split, a reason, or whether anybody was messaged: the page's floor sentence (the figures card's,
 * `view.floor`) stands alone. ⛔ OD24 · the estimated spend only for a viewer who may read money (`money`), never below the
 * floor (it is handed-over × price — the split in another form), and never as a measured figure: it says what it is.
 * ⛔ No phone number in the view: the people are counts; the walk reads numbers and keeps none.
 *
 * ⛔ IT READS AND WRITES NOTHING ELSE: no transition, no audit row, no claim, no send.
 * Guard: `npm run test:campaign-visuals` §R (R1–R12) · Red: `npm run red:campaign-visuals` (in memory).
 */
import { db } from "@/lib/server/store";
import type {
  MessagingKeyBatch, SmsCampaignHandedOver, SmsCampaignRecipientOutcomeCount, SmsCampaignRecipientStatusCounts, SmsCampaignStatus,
  StoredSmsCampaignRecipient, StoredSuppression,
} from "@/lib/server/store";
import { smsProviderResolution } from "@/lib/server/sms";
import type { SmsProviderResolution } from "@/lib/server/sms";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import { WEBHOOK_SECRET_MIN_CHARS } from "@/lib/server/webhook-secret-floor";
import { RECEIPT_CLASS_PREFIX } from "@/lib/marketing/engine-rules";
import { outstandingRows, recipientRows } from "@/lib/marketing/campaign-status";
import type { CampaignResultsView } from "@/lib/server/marketing/campaign-live";

/* ══ THE NUMBERS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** E5 · a message handed over this long ago with no receipt is worth saying (receipts usually come in seconds — BLACKBALL-SMS
 *  §3a measured eleven). STRICTLY older: at exactly this age it is not yet "after 15 minutes". */
export const NO_RECEIPT_AFTER_MS = 15 * 60_000;
/** E30 · the people read per chunk of the stop walk — and so the keys one `findActiveAmong` takes (it refuses above 2,000). */
export const STOP_WALK_CHUNK = 1000;
/** A walk that has not ended after this many chunks (two million people) is not a walk: it refuses, and the figure is unread. */
export const STOP_WALK_PAGES_MAX = 2000;
/** How long production keeps a campaign's stopped-by-link count before it walks again (the header). */
export const STOPPED_BY_LINK_TTL_MS = 30_000;
/** Memory entries kept per process before settled ones past their time are swept. */
const MEMO_MAX = 500;
/** The longest ONE view waits for the stop walk. A walk that is slower is not abandoned — the single-flight memory keeps
 *  running it, and a later view reads its answer — the view just does not hang on it (a first look at a very large list). */
export const RESULTS_READ_BUDGET_MS = 4_000;

/** What the opt-out link writes as a stop's reason and the start of its evidence (`stopMarketing`, optout-service.ts) — the
 *  suite's R4 makes a stop through the REAL service and holds these to it. */
export const LINK_STOP_REASON = "WITHDRAWN";
export const LINK_STOP_EVIDENCE_PREFIX = "optout:";

/* ══ WHETHER A RECEIPT CAN ARRIVE AT ALL — the DLR route's own rule ═════════════════════════════════════════════════════ */

/** What the receipt route decides on: the two secrets as set (empty when unset), whether this is production, the rail. */
export type ReceiptRoute = { secret: string; previous: string; production: boolean; provider: SmsProviderResolution };

/**
 * ⭐ CAN THIS SERVER TAKE A VENDOR'S RECEIPT? — exactly when `api/webhooks/blackball/route.ts`'s `authorized` can say yes to a
 * caller carrying the right secret (`test:campaign-visuals` R7 holds the two equal over a matrix of environments, the route's
 * real function on one side):
 *   · no secret set — the route is OPEN only where nothing real can arrive (not production, and not the live rail), so a
 *     local drive's receipts work and production without a secret takes none;
 *   · a secret set — it counts only at `WEBHOOK_SECRET_MIN_CHARS` or more, the floor boot warns below, and so does the
 *     rotation's previous secret: a short secret takes no receipt either.
 * ⚠️ This is the spec's "whether the secret is set" made exact: presence alone would call a too-short secret "set up".
 */
export function receiptsSetUp(r: ReceiptRoute): boolean {
  if (r.secret === "") return !r.production && r.provider !== "blackball";
  return r.secret.length >= WEBHOOK_SECRET_MIN_CHARS || r.previous.length >= WEBHOOK_SECRET_MIN_CHARS;
}

/** The route's inputs as this process reads them now. */
export function receiptRouteNow(): ReceiptRoute {
  return {
    secret: process.env.BLACKBALL_WEBHOOK_SECRET ?? "",
    previous: process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS ?? "",
    production: process.env.NODE_ENV === "production",
    provider: smsProviderResolution(),
  };
}

/* ══ THE RULES — pure, exported, and handed in, so the suite can plant each one's absence ═══════════════════════════════ */

/** ⛔ OD41 · "Delivered" is the rows a receipt moved to DELIVERED. Never SENT: the network taking a message is "handed over". */
export function deliveredRows(counts: SmsCampaignRecipientStatusCounts): number {
  return counts.DELIVERED;
}

/** The failed, split by where they failed: no `receipt:` class = the network refused them when they were handed over (the
 *  wire); a `receipt:` class = the network took them and then reported them undelivered. Every FAILED row is one or the other. */
export function failedSplitOf(groups: readonly SmsCampaignRecipientOutcomeCount[]): { total: number; wire: number; receipt: number } {
  let wire = 0;
  let receipt = 0;
  for (const g of groups) {
    if (g.status !== "FAILED") continue;
    if (typeof g.failureClass === "string" && g.failureClass.startsWith(RECEIPT_CLASS_PREFIX)) receipt += g.count;
    else wire += g.count;
  }
  return { total: wire + receipt, wire, receipt };
}

/** What the honesty lines need, decided from the data (OD41) — see `ResultsHonesty`. */
export type HonestyInput = {
  /** DELIVERED rows. */
  delivered: number;
  /** FAILED rows a receipt moved (`receipt:` class). */
  receiptFailed: number;
  /** Rows handed to the wire that no receipt has settled: SENT and UNCONFIRMED. */
  handedToWire: number;
  /** Whether this server can take a receipt (`receiptsSetUp`). */
  setUp: boolean;
};
export type ResultsHonesty = { noReceiptYet: boolean; notSetUp: boolean };

/**
 * ⭐ THE HONESTY LINES, FROM THE DATA (OD41): "no delivery receipt has arrived yet" while something was handed over and no
 * receipt of ANY kind — delivered, or a failure — has reached the campaign (gone by itself once one does); and "receipts are
 * not set up" only while that holds AND this server could not take one (so "Delivered will stay at zero" is true when said).
 */
export function honestyOf(i: HonestyInput): ResultsHonesty {
  const arrived = i.delivered > 0 || i.receiptFailed > 0;
  const noReceiptYet = !arrived && i.handedToWire > 0;
  return { noReceiptYet, notSetUp: noReceiptYet && !i.setUp };
}

/** E30 · is this stop a person's own link stop, made at or after this campaign's message to them? An active stop whose
 *  reason is the link's (WITHDRAWN) and whose evidence is the link's (`optout:`), created no earlier than `sentAt`. */
export function isLinkStop(stop: Pick<StoredSuppression, "reason" | "evidence" | "createdAt">, sentAt: string): boolean {
  if (stop.reason !== LINK_STOP_REASON) return false;
  if (typeof stop.evidence !== "string" || !stop.evidence.startsWith(LINK_STOP_EVIDENCE_PREFIX)) return false;
  const stopMs = Date.parse(stop.createdAt);
  const sentMs = Date.parse(sentAt);
  return Number.isFinite(stopMs) && Number.isFinite(sentMs) && stopMs >= sentMs;
}

/** What the attribution reads of another message to the same number: which campaign, whether it reached the wire, when. */
export type MessageRef = Pick<StoredSmsCampaignRecipient, "campaignId" | "status" | "sentAt">;

/**
 * ⭐ E30 · IS THIS STOP ANOTHER CAMPAIGN'S? — true when a DIFFERENT campaign handed this number a message strictly after this
 * campaign's (`sentAt`) and no later than the stop (`stopAt`): the stop then follows that newer message, and is attributed to
 * the most recent campaign sent to the number before it. Only a message that reached the wire counts (SENT or DELIVERED, with
 * its instant) — a newer campaign's failed or skipped message carried no link to tap.
 */
export function attributedElsewhere(rows: readonly MessageRef[], o: { campaignId: string; sentAt: string; stopAt: string }): boolean {
  const sentMs = Date.parse(o.sentAt);
  const stopMs = Date.parse(o.stopAt);
  if (!Number.isFinite(sentMs) || !Number.isFinite(stopMs)) return false;
  return rows.some((r) => {
    if (r.campaignId === o.campaignId || (r.status !== "SENT" && r.status !== "DELIVERED") || typeof r.sentAt !== "string") return false;
    const at = Date.parse(r.sentAt);
    return Number.isFinite(at) && at > sentMs && at <= stopMs;
  });
}

/* ══ THE STOP WALK (E30) ════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every read and rule the walk makes — swappable for the suite's in-process plants; production passes none. */
export type StopWalkDeps = {
  /** A keyset page of the campaign's handed-over people (`handedOverPage`, both twins). */
  page: (campaignId: string, after: string | null, limit: number) => Promise<SmsCampaignHandedOver[]>;
  /** §25 · the stops still in force among one chunk's numbers — ONE query (`findActiveAmong`). */
  stops: (batch: MessagingKeyBatch) => Promise<StoredSuppression[]>;
  /** The campaigns' messages to ONE number from an instant on (U16a's `listByMsisdn`), newest first. */
  messages: (msisdn: string, sinceIso: string) => Promise<MessageRef[]>;
  /** The people per chunk. */
  chunk: number;
  rules: { isLinkStop: typeof isLinkStop; attributedElsewhere: typeof attributedElsewhere };
};

/** Frozen: production's walk — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const STOP_WALK_DEPS: Readonly<StopWalkDeps> = Object.freeze({
  page: async (campaignId: string, after: string | null, limit: number) => db.smsCampaignRecipient.handedOverPage(campaignId, after, limit),
  stops: async (batch: MessagingKeyBatch) => db.suppression.findActiveAmong(batch),
  messages: async (msisdn: string, sinceIso: string) => db.smsCampaignRecipient.listByMsisdn(msisdn, sinceIso),
  chunk: STOP_WALK_CHUNK,
  rules: Object.freeze({ isLinkStop, attributedElsewhere }),
});

/**
 * ⭐ HOW MANY OF THIS CAMPAIGN'S PEOPLE STOPPED BY THEIR LINK SINCE ITS MESSAGE (E30, the header): walk the handed-over people
 * by number in chunks, ask each chunk's active stops in one query, keep the link stops made at or after the message, and drop
 * those another campaign's newer message to the same number explains. A read that fails THROWS (the caller says "unread");
 * a walk that does not move refuses rather than loop. Reads numbers, keeps none, returns a count.
 */
export async function stoppedByLinkOf(campaignId: string, deps: StopWalkDeps = STOP_WALK_DEPS): Promise<number> {
  let after: string | null = null;
  let stopped = 0;
  for (let pages = 0; ; pages++) {
    if (pages >= STOP_WALK_PAGES_MAX) throw new Error("[campaign-results] the stop walk did not end — refusing to go on");
    const page = await deps.page(campaignId, after, deps.chunk);
    if (page.length === 0) return stopped;
    const sentAt = new Map<string, string>(page.map((p) => [p.msisdn, p.sentAt] as const));
    const stops = await deps.stops({ channel: "SMS", category: "MARKETING", identifiers: [...sentAt.keys()] });
    for (const stop of stops) {
      const messagedAt = sentAt.get(stop.identifier);
      if (messagedAt === undefined || !deps.rules.isLinkStop(stop, messagedAt)) continue;
      const rows = await deps.messages(stop.identifier, messagedAt);
      if (deps.rules.attributedElsewhere(rows, { campaignId, sentAt: messagedAt, stopAt: stop.createdAt })) continue;
      stopped++;
    }
    if (page.length < deps.chunk) return stopped;
    const last = page[page.length - 1].msisdn;
    if (after !== null && last <= after) throw new Error("[campaign-results] the stop walk did not move — refusing to loop");
    after = last;
  }
}

/* ══ THE MEMORY OF A WALK — single-flight, short, never a failure ═══════════════════════════════════════════════════════ */

/** One kept read: when it settled (null while it is still running) and its answer. */
export type Memo<T> = { settledAt: number | null; promise: Promise<T> };

/**
 * ⭐ A READ KEPT PER KEY FOR A SHORT TIME, SHARED WHILE IT RUNS — so many pages, many watchers and a driver's step every two
 * seconds ask the stop walk of one campaign once per `ttlMs`, not once each. A read still running is joined by every asker (one
 * flight); one that settled is answered from memory until `ttlMs` after it settled; ⛔ one that FAILED is dropped at once —
 * a failure is never kept, so the next view tries again — and a read that throws before it starts is a failed read, not a
 * throw to the asker. Settled entries past their time are swept when the memory grows past `MEMO_MAX`.
 */
export function memoByKey<T>(
  read: (key: string) => Promise<T>,
  o: { ttlMs: number; now: () => number; held: Map<string, Memo<T>> },
): (key: string) => Promise<T> {
  return (key) => {
    const t = o.now();
    const was = o.held.get(key);
    if (was !== undefined && (was.settledAt === null || t - was.settledAt < o.ttlMs)) return was.promise;
    const entry: Memo<T> = { settledAt: null, promise: Promise.resolve().then(() => read(key)) };
    o.held.set(key, entry);
    entry.promise.then(
      () => { entry.settledAt = o.now(); },
      () => { if (o.held.get(key) === entry) o.held.delete(key); },
    );
    if (o.held.size > MEMO_MAX) {
      for (const [k, m] of o.held) {
        if (m.settledAt !== null && t - m.settledAt >= o.ttlMs) o.held.delete(k);
      }
    }
    return entry.promise;
  };
}

/**
 * A read given at most `ms` to answer: its answer, or null when the time ran out. ⛔ The read is NOT stopped — it goes on, and its
 * memory (`memoByKey`) keeps what it finds — so the view that gave up and the next one that finds the answer are asking the one
 * walk. A read that fails inside the time fails the same way (the caller says "unread").
 */
export function withinBudget<T>(read: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    read.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RESULTS_LINK: Map<string, Memo<number>> | undefined;
}

/* ══ THE DOORS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every read and rule the results make — swappable for the suite's in-process plants; production passes none. */
export type ResultsDeps = {
  /** E5 · the campaign's rows still SENT and handed over strictly before the instant (`countSentBefore`, both twins). */
  sentBefore: (campaignId: string, before: string) => Promise<number>;
  /** E30 · the people who stopped by their link since this campaign's message (production: kept for `STOPPED_BY_LINK_TTL_MS`). */
  stoppedByLink: (campaignId: string) => Promise<number>;
  /** Can this server take a receipt? (`receiptsSetUp` over the process's environment.) */
  receiptsSetUp: () => boolean;
  /** The owner's price per SMS as configured (the settings, read fresh), or null when it cannot be read in full — asked for a
   *  viewer who may read money ONLY. */
  priceTzs: () => Promise<number | null>;
  /** The longest a view waits for the stop walk, in ms (`RESULTS_READ_BUDGET_MS`). */
  budgetMs: number;
  rules: {
    delivered: typeof deliveredRows;
    failedSplit: typeof failedSplitOf;
    honesty: typeof honestyOf;
  };
};

/** Frozen: production's results — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const RESULTS_DEPS: Readonly<ResultsDeps> = Object.freeze({
  sentBefore: async (campaignId: string, before: string) => db.smsCampaignRecipient.countSentBefore(campaignId, before),
  stoppedByLink: memoByKey<number>((campaignId) => stoppedByLinkOf(campaignId), {
    ttlMs: STOPPED_BY_LINK_TTL_MS,
    now: () => Date.now(),
    held: (globalThis.__50PICK_RESULTS_LINK ??= new Map<string, Memo<number>>()),
  }),
  receiptsSetUp: () => receiptsSetUp(receiptRouteNow()),
  priceTzs: async () => {
    const r = await reloadMarketingSmsSettings();
    return r.ok && r.readable ? r.settings.pricePerSegmentTzs : null;
  },
  budgetMs: RESULTS_READ_BUDGET_MS,
  rules: Object.freeze({ delivered: deliveredRows, failedSplit: failedSplitOf, honesty: honestyOf }),
});

/* ══ THE VIEW ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** What `campaignLiveView` hands in: the rows it has already counted, whether this viewer is below the floor, may read money,
 *  and the one list of "not sent" reasons it words. */
export type ResultsInput = {
  campaignId: string;
  status: SmsCampaignStatus;
  /** The ONE groupBy's groups, and the counts summed from them. */
  groups: readonly SmsCampaignRecipientOutcomeCount[];
  counts: SmsCampaignRecipientStatusCounts;
  /** ⛔ E23 · true when this viewer may not see the split — then there are no results. */
  hidden: boolean;
  /** OD24 · true for a viewer who may read money. */
  money: boolean;
  /** "Not sent" by reason — the live view's own list (U38b's five words, protected one line, dominant first), handed in. */
  notSentReasons: ReadonlyArray<{ label: string; count: number }>;
  /** Everybody a stopped campaign did not message — the headline's own figure (`resumeOutstanding`). */
  stoppedBeforeSending: number;
  /** The view's clock (the cutoff of E5 is this minus `NO_RECEIPT_AFTER_MS`). */
  nowMs: number;
};

/** Logs the read that failed — its NAME alone (§5.14: a database error's text can quote what it was asked). */
function readFailed(which: string, err: unknown): null {
  console.error(`[campaign-results] ${which} could not be read:`, (err as { name?: unknown } | null)?.name ?? "error");
  return null;
}

/**
 * ⭐ THE RESULTS FOR ONE CAMPAIGN, AS THIS VIEWER MAY SEE THEM — null for a viewer below the floor and for a campaign with
 * nobody on its list (the figures card has nothing to count either); otherwise every figure the header names. Never throws on
 * the three reads of its own (the header): a count that could not be made is `null`.
 */
export async function campaignResults(i: ResultsInput, deps: ResultsDeps): Promise<CampaignResultsView | null> {
  const c = i.counts;
  if (i.hidden || recipientRows(c) === 0) return null;
  const delivered = deps.rules.delivered(c);
  const failed = deps.rules.failedSplit(i.groups);
  const handedOver = c.SENT;

  // ── the three reads of its own, side by side — none of them needed when there is nobody to ask about ──
  const noReceiptAfter15 = handedOver === 0
    ? Promise.resolve<number | null>(0)
    : Promise.resolve()
      .then(() => deps.sentBefore(i.campaignId, new Date(i.nowMs - NO_RECEIPT_AFTER_MS).toISOString()))
      .catch((err) => readFailed("the count of messages with no receipt after 15 minutes", err));
  const stoppedByLink = c.SENT + c.DELIVERED === 0
    ? Promise.resolve<number | null>(0)
    : withinBudget(Promise.resolve().then(() => deps.stoppedByLink(i.campaignId)), deps.budgetMs)
      .catch((err) => readFailed("the count of people who stopped by their link", err));
  const price = i.money && c.SENT + c.DELIVERED > 0
    ? Promise.resolve()
      .then(() => deps.priceTzs())
      .catch((err) => readFailed("the configured price", err))
    : Promise.resolve<number | null>(null);
  const [noReceipt, stopped, perSms] = await Promise.all([noReceiptAfter15, stoppedByLink, price]);

  const stoppedCampaign = i.status === "CANCELLED";
  const honesty = deps.rules.honesty({
    delivered, receiptFailed: failed.receipt, handedToWire: c.SENT + c.UNCONFIRMED, setUp: deps.receiptsSetUp() === true,
  });
  return {
    delivered,
    handedOver,
    noReceiptAfter15: noReceipt,
    failed,
    notSent: { total: c.SKIPPED, reasons: i.notSentReasons.map((r) => ({ label: r.label, count: r.count })) },
    noAnswer: c.UNCONFIRMED,
    left: { count: stoppedCampaign ? i.stoppedBeforeSending : outstandingRows(c), stopped: stoppedCampaign },
    stoppedByLink: stopped,
    honesty,
    // ⛔ OD24 · an estimate, and said as one: handed over (SENT + DELIVERED, the figures card's own "Handed over") × the price
    // the owner configured. Whole shillings and pence both survive — the sentence formats it.
    spend: typeof perSms === "number" && Number.isFinite(perSms) && perSms >= 0
      ? { tzs: Math.round((c.SENT + c.DELIVERED) * perSms * 100) / 100, handedOver: c.SENT + c.DELIVERED, perSmsTzs: perSms }
      : null,
  };
}
