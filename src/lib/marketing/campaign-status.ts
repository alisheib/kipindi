/**
 * U36 · THE ONE VOCABULARY OVER A CAMPAIGN'S STATUS (decision X12) — what the list says about each campaign, which
 * pill of the status rail it sits under, how far along it is, whether it wants an officer, and which campaign screens
 * exist yet. The list page, its rail, both DAL twins and the nav badge read THIS module; U47's live page and its
 * plan suite must read it too, never a second bucket module.
 *
 * ⭐ EVERY MAP IS A TOTAL RECORD over the store's own unions (`SmsCampaignStatus`, `SmsCampaignRecipientStatus`), so a
 * status added to the schema and forgotten here is a COMPILE error, never a row that silently drops off the rail or
 * out of a count.
 *
 * ── THE RECIPIENT SPLIT ─────────────────────────────────────────────────────────────────────────────────────────
 * OUTSTANDING = PENDING + HELD — ⛔ HELD STILL OWES SOMEBODY A MESSAGE: a shop-wide refusal (the credit floor, the
 * rail not configured) returns a claimed row to wait, it does not settle it. SETTLED = SENT + DELIVERED + FAILED +
 * SKIPPED + UNCONFIRMED — the five places a row can end. Counted as settled, a held row would make a campaign that
 * still owes people a message read as complete.
 * ⭐ UNCONFIRMED IS SETTLED (U43-0, ENGINE-SPEC E4): the message was handed to the wire and the network's answer never
 * came, so it is never sent again by itself — a second send could be a second charge and a second message. A late
 * receipt may still move it to DELIVERED or FAILED. Counted as outstanding, one unanswered message would keep a
 * campaign from ever finishing and its badge from ever clearing. (Its words on a screen are U48's; today the list
 * shows it only inside "N of M processed".)
 *
 * ── PROGRESS ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * Two phases, never shown at once (the plan's U47 line): PREPARING is rows WRITTEN over the confirmed audience;
 * from the moment the list is finished (`enqueuedAt`) it is rows SETTLED over rows written. ⛔ A campaign with nothing
 * to measure (no rows, or no confirmed audience) has NO progress — null, so no 0 % bar is ever painted as progress.
 * ⛔ The figures are the server's counts (a groupBy over the rows, OD26); nothing here runs on a timer (OD34).
 *
 * ── ATTENTION (the nav badge, OD39) ───────────────────────────────────────────────────────────────────────────────
 * A campaign wants an officer while it is PREPARING or RUNNING, or PAUSED with work left: an outstanding row, or a
 * list that never finished (`enqueuedAt` still null — a pause during the enqueue has no rows yet, and would otherwise
 * drop off the badge while most of its audience waits). A badge that never clears stops being read, so DRAFT,
 * CONFIRMED, DONE and CANCELLED never count.
 *
 * ── THE SCREENS (house-bots ruling 432(h)) ────────────────────────────────────────────────────────────────────────
 * A flag is true EXACTLY when the page at its route exists, and the list renders a link only behind its flag:
 * `test:campaigns-page` 5f reads the page files off disk and holds each flag to them in BOTH directions. U37 flips
 * `compose` in the commit that lands /admin/campaigns/new; U47 flips `detail` with /admin/campaigns/[id].
 *
 * ⛔ PURE AND CLIENT-SAFE: no runtime import at all — the store is reached for TYPES only (erased), so `store.ts` and
 * `prisma-dal.ts` may import this file without a cycle, and a client component may import it without the server
 * graph (pinned in `test:client-graph-safe`).
 *
 * ── THE D19 FLOOR (U38b, E23) ─────────────────────────────────────────────────────────────────────────────────────
 * `MASKED_BREAKDOWN_MIN` and `breakdownVisible`: the one rule for how small an audience may be before a viewer who may
 * not read a number is shown its count alone.
 *
 * Guard: `npm run test:campaigns-page` (§3 the split and progress, §4 attention, §5f the screens) · the floor:
 * `npm run test:campaign-audience` §B6.
 */
import type {
  StoredSmsCampaign, SmsCampaignStatus, SmsCampaignRecipientStatus, SmsCampaignStatusCounts,
  SmsCampaignRecipientStatusCounts, SmsCampaignRecipientCountsById, SmsCampaignRecipientOutcomeCount,
} from "@/lib/server/store";

/* ══ THE STATUS RAIL ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** The rail's four keys (the plan's "drafts · sending · paused · finished"), as the address spells them. */
export type CampaignRailKey = "drafts" | "sending" | "paused" | "finished";

/** The kit Chip variants a campaign status may wear — a subset of `ui/chip.tsx`'s own (none of them gold: gold is
 *  money, and a finished campaign is not). */
export type CampaignChipVariant = "neutral" | "info" | "pending" | "active" | "paused" | "success";

/**
 * ⭐ EVERY STATUS: its words on the list, its chip, and the ONE rail pill it sits under. A confirmed campaign that
 * has not started sits with the drafts (nothing has gone out); PREPARING sits with sending (work in flight); a
 * stopped campaign is finished.
 */
export const CAMPAIGN_STATUS_VIEW: Readonly<Record<SmsCampaignStatus, { label: string; chip: CampaignChipVariant; rail: CampaignRailKey }>> = {
  DRAFT: { label: "Draft", chip: "neutral", rail: "drafts" },
  CONFIRMED: { label: "Ready to start", chip: "info", rail: "drafts" },
  PREPARING: { label: "Preparing", chip: "pending", rail: "sending" },
  RUNNING: { label: "Sending", chip: "active", rail: "sending" },
  PAUSED: { label: "Paused", chip: "paused", rail: "paused" },
  DONE: { label: "Finished", chip: "success", rail: "finished" },
  CANCELLED: { label: "Stopped", chip: "neutral", rail: "finished" },
};

/** Every campaign status, in the schema's order — the keys of the total Record above. */
export const CAMPAIGN_STATUSES = Object.freeze(Object.keys(CAMPAIGN_STATUS_VIEW)) as readonly SmsCampaignStatus[];

/** The rail's pills, in order: All first (key ""), then the four keys. `title` is the pill's hover text. */
export const CAMPAIGN_RAIL: ReadonlyArray<{ key: CampaignRailKey | ""; label: string; title: string }> = [
  { key: "", label: "All", title: "Every SMS campaign" },
  { key: "drafts", label: "Drafts", title: "Drafts, and campaigns confirmed but not started" },
  { key: "sending", label: "Sending", title: "Preparing the list or sending now" },
  { key: "paused", label: "Paused", title: "Paused by an officer or by the engine" },
  { key: "finished", label: "Finished", title: "Finished or stopped" },
];

const RAIL_KEYS: readonly CampaignRailKey[] = ["drafts", "sending", "paused", "finished"];

/** The statuses one rail key lists, or null for every status — an empty, missing or unknown key means All, which is
 *  the pill the rail then shows in force (the list shows what the rail says it shows). */
export function statusesForRail(key: string | undefined): SmsCampaignStatus[] | null {
  const k = (key ?? "").trim();
  if (!(RAIL_KEYS as readonly string[]).includes(k)) return null;
  return CAMPAIGN_STATUSES.filter((s) => CAMPAIGN_STATUS_VIEW[s].rail === k);
}

/** How many campaigns a rail key holds, out of the WHOLE table's counts ("" = All). */
export function railCount(counts: SmsCampaignStatusCounts, key: CampaignRailKey | ""): number {
  // Typed once: `.reduce` on a union of a readonly and a mutable array type is a call TypeScript may refuse.
  const statuses: readonly SmsCampaignStatus[] = key === "" ? CAMPAIGN_STATUSES : statusesForRail(key) ?? [];
  return statuses.reduce((n, s) => n + counts[s], 0);
}

/** Every campaign in the table, from its status counts. */
export function campaignTotal(counts: SmsCampaignStatusCounts): number {
  return railCount(counts, "");
}

/* ══ THE RECIPIENT SPLIT ═══════════════════════════════════════════════════════════════════════════════════════ */

/** ⛔ The split, as a total Record: a recipient status added later must be given a side here or nothing compiles.
 *  In the schema's order — UNCONFIRMED last, where its ADD VALUE migration put it (U43-0). */
const RECIPIENT_SIDE: Readonly<Record<SmsCampaignRecipientStatus, "outstanding" | "settled">> = {
  PENDING: "outstanding",
  HELD: "outstanding",
  SENT: "settled",
  DELIVERED: "settled",
  FAILED: "settled",
  SKIPPED: "settled",
  UNCONFIRMED: "settled",
};
const RECIPIENT_STATUSES = Object.keys(RECIPIENT_SIDE) as SmsCampaignRecipientStatus[];

/** Rows that still owe somebody a message: PENDING and HELD. */
export const OUTSTANDING_RECIPIENT_STATUSES = Object.freeze(RECIPIENT_STATUSES.filter((s) => RECIPIENT_SIDE[s] === "outstanding")) as readonly SmsCampaignRecipientStatus[];
/** Rows the engine is done with: SENT, DELIVERED, FAILED and SKIPPED — and UNCONFIRMED, whose answer may never come and
 *  which is never sent again by itself (E4). */
export const SETTLED_RECIPIENT_STATUSES = Object.freeze(RECIPIENT_STATUSES.filter((s) => RECIPIENT_SIDE[s] === "settled")) as readonly SmsCampaignRecipientStatus[];

const sum = (counts: SmsCampaignRecipientStatusCounts, statuses: readonly SmsCampaignRecipientStatus[]): number =>
  statuses.reduce((n, s) => n + counts[s], 0);
/** Every row the campaign has written. */
export const recipientRows = (counts: SmsCampaignRecipientStatusCounts): number => sum(counts, RECIPIENT_STATUSES);
export const outstandingRows = (counts: SmsCampaignRecipientStatusCounts): number => sum(counts, OUTSTANDING_RECIPIENT_STATUSES);
export const settledRows = (counts: SmsCampaignRecipientStatusCounts): number => sum(counts, SETTLED_RECIPIENT_STATUSES);

/* ══ THE COUNTS, ZERO-FILLED (both twins answer through these) ═════════════════════════════════════════════════ */

export function zeroCampaignStatusCounts(): SmsCampaignStatusCounts {
  return { DRAFT: 0, CONFIRMED: 0, PREPARING: 0, RUNNING: 0, PAUSED: 0, DONE: 0, CANCELLED: 0 };
}
export function zeroRecipientStatusCounts(): SmsCampaignRecipientStatusCounts {
  return { PENDING: 0, HELD: 0, SENT: 0, DELIVERED: 0, FAILED: 0, SKIPPED: 0, UNCONFIRMED: 0 };
}

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** A groupBy (or a tally) by campaign status, zero-filled. ⛔ A status this code does not know REFUSES: a rail that
 *  dropped those rows would read the table as smaller than it is. */
export function tallyCampaignStatuses(raw: ReadonlyArray<{ status: string; count: number }>): SmsCampaignStatusCounts {
  const out = zeroCampaignStatusCounts();
  for (const r of raw) {
    if (!own(out, r.status)) throw new Error(`[campaign-status] "${r.status}" is a campaign status this code does not know`);
    out[r.status as SmsCampaignStatus] += r.count;
  }
  return out;
}

/** A groupBy (or a tally) by campaign and recipient status, zero-filled for EVERY id asked for — and only for those.
 *  ⛔ An unknown status, or a count for a campaign nobody asked about, REFUSES (a page would otherwise read
 *  another campaign's rows, or lose some of its own). */
export function tallyRecipientsByCampaign(
  ids: readonly string[],
  raw: ReadonlyArray<{ campaignId: string; status: string; count: number }>,
): SmsCampaignRecipientCountsById {
  const out: SmsCampaignRecipientCountsById = {};
  for (const id of ids) out[id] = zeroRecipientStatusCounts();
  for (const r of raw) {
    const t = own(out, r.campaignId) ? out[r.campaignId] : undefined;
    if (t === undefined) throw new Error(`[campaign-status] a count for campaign ${r.campaignId}, which was not asked for`);
    if (!own(t, r.status)) throw new Error(`[campaign-status] "${r.status}" is a recipient status this code does not know`);
    t[r.status as SmsCampaignRecipientStatus] += r.count;
  }
  return out;
}

/* ══ U47b-1 · THE LIVE PAGE'S ONE GROUPBY — a campaign's rows by (status, skipReason, failureClass) ═══════════════ */

/** The text order of two group keys — none first, then byte order (never the locale's, so both twins sort alike). */
const keyOrder = (a: string | null, b: string | null): number => (a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1);

/**
 * ⭐ U47b-1 · ONE campaign's recipient rows grouped by (status, skipReason, failureClass) — what both twins'
 * `countByOutcome` answer through, the live page's ONE groupBy (ENGINE-SPEC §4.15 decision 8; OD26: counted from the rows,
 * never a counter). Groups of one key are merged, a group of none is dropped, and the answer is in ONE order — the
 * schema's status order, then the skip reason, then the failure class (none first) — so the two twins answer alike.
 * ⛔ A status this code does not know REFUSES, as every tally here does: a page that dropped those rows would read the
 * campaign as smaller than it is.
 */
export function tallyRecipientOutcomes(
  raw: ReadonlyArray<{ status: string; skipReason: string | null; failureClass: string | null; count: number }>,
): SmsCampaignRecipientOutcomeCount[] {
  const by = new Map<string, SmsCampaignRecipientOutcomeCount>();
  for (const r of raw) {
    if (!own(RECIPIENT_SIDE, r.status)) throw new Error(`[campaign-status] "${r.status}" is a recipient status this code does not know`);
    const skipReason = typeof r.skipReason === "string" ? r.skipReason : null;
    const failureClass = typeof r.failureClass === "string" ? r.failureClass : null;
    const key = JSON.stringify([r.status, skipReason, failureClass]);
    const was = by.get(key);
    if (was !== undefined) was.count += r.count;
    else by.set(key, { status: r.status as SmsCampaignRecipientStatus, skipReason, failureClass, count: r.count });
  }
  const rank = (s: SmsCampaignRecipientStatus): number => RECIPIENT_STATUSES.indexOf(s);
  return [...by.values()]
    .filter((g) => g.count > 0)
    .sort((a, b) => rank(a.status) - rank(b.status) || keyOrder(a.skipReason, b.skipReason) || keyOrder(a.failureClass, b.failureClass));
}

/** U47b-1 · the rows by status, zero-filled, summed from the ONE groupBy's groups — never a second read. ⛔ An unknown
 *  status REFUSES. */
export function outcomeStatusCounts(groups: readonly SmsCampaignRecipientOutcomeCount[]): SmsCampaignRecipientStatusCounts {
  const out = zeroRecipientStatusCounts();
  for (const g of groups) {
    if (!own(out, g.status)) throw new Error(`[campaign-status] "${String(g.status)}" is a recipient status this code does not know`);
    out[g.status] += g.count;
  }
  return out;
}

/* ══ PROGRESS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

export type CampaignProgress = { phase: "preparing" | "sending"; value: number; max: number };

/**
 * How far a campaign has got, or null when there is nothing to measure.
 *   · DRAFT, CONFIRMED — null: nothing has started.
 *   · PREPARING, and a PAUSED or CANCELLED campaign whose list never finished (`enqueuedAt` null) — rows WRITTEN over
 *     the confirmed audience; null without a confirmed audience, and null until the first row is written. ⛔ U36's
 *     review (F1): with only the audience asked, a campaign confirmed and then cancelled before it started read "0 of
 *     300 prepared" — a preparation that never began, painted as one, one status after CONFIRMED painted nothing.
 *   · RUNNING, DONE, and a PAUSED or CANCELLED campaign after its list finished — rows SETTLED over rows written;
 *     null with no rows (⛔ never "0 of 0", never a 0 % bar for an empty campaign).
 * ⛔ HELD is outstanding: 4 SENT and 6 HELD read 4 of 10, never 10 of 10.
 * ⭐ UNCONFIRMED is settled (U43-0): 4 SENT, 1 UNCONFIRMED and 5 PENDING read 5 of 10.
 */
export function campaignProgress(
  c: Pick<StoredSmsCampaign, "status" | "enqueuedAt" | "audienceCount">,
  counts: SmsCampaignRecipientStatusCounts,
): CampaignProgress | null {
  if (c.status === "DRAFT" || c.status === "CONFIRMED") return null;
  const rows = recipientRows(counts);
  const preparing = c.status === "PREPARING" || ((c.status === "PAUSED" || c.status === "CANCELLED") && c.enqueuedAt === null);
  if (preparing) {
    const max = c.audienceCount ?? 0;
    return max > 0 && rows > 0 ? { phase: "preparing", value: Math.min(rows, max), max } : null;
  }
  return rows > 0 ? { phase: "sending", value: settledRows(counts), max: rows } : null;
}

/* ══ ATTENTION ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The statuses that always want an officer — the Prisma twin's count spreads this very list. */
export const ATTENTION_ALWAYS: readonly SmsCampaignStatus[] = Object.freeze(["PREPARING", "RUNNING"] as SmsCampaignStatus[]);
/** The status that wants an officer only while work is left (an outstanding row, or a list never finished). */
export const ATTENTION_WHEN_OWED: SmsCampaignStatus = "PAUSED";

/** ⭐ THE ONE DEFINITION of "wants attention" — the memory twin's `attentionCount` asks it per campaign. */
export function wantsAttention(
  c: Pick<StoredSmsCampaign, "status" | "enqueuedAt">,
  counts: SmsCampaignRecipientStatusCounts,
): boolean {
  if (ATTENTION_ALWAYS.includes(c.status)) return true;
  if (c.status !== ATTENTION_WHEN_OWED) return false;
  return c.enqueuedAt === null || outstandingRows(counts) > 0;
}

/* ══ WHY A CAMPAIGN STOPPED ═════════════════════════════════════════════════════════════════════════════════════ */

/** U49a · the floor's one sentence, whichever line caught it (`STOP_REASON_SENTENCE`, below). */
const MARKETING_FLOOR_SENTENCE = "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume.";

/**
 * The engine's own reasons, in words an officer can act on. The first three are the shop-wide refusals `sendBatch`
 * returns before a request is made (`SmsFailureCode` in `sms.ts`) and `gate_unanswered` is `dispatchSlice`'s own: the
 * reasons a slice HOLDS rows for (`dispatch.ts`), which the engine turns into ONE pause (§9 U43). ⭐ U42's enqueue
 * (`enqueue.ts`, ENGINE-SPEC §3.4) adds the ones it pauses a campaign for: `audience_unreadable` (the saved audience can no
 * longer be read — never read as "start again" or "done"), `audience_moved` (a listed confirmation's people changed after
 * Start; nothing was written), and — failing closed, U42's review — `list_over_confirmed` (the list came out longer than
 * the confirmed count before it ever ran; nothing was sent) and `list_over_confirmed_sending` (the same, found after another
 * step had moved it to sending). None says Resume. The three paused before anything ran (the enqueue pauses only a
 * PREPARING campaign) say Stop and confirm a new copy — `audience_unreadable` also the way out when the copy is refused, as
 * a copy carries the same unreadable filter. ⛔ `list_over_confirmed_sending` prescribes NO copy (U42's re-review): some
 * people may already have been messaged, a copy has the same filter and nothing de-duplicates across campaigns, so a copy
 * would message them again — it says that, and Stop. ⚠️ U41, U43 and U49 each add the keys they write — an unknown key is
 * still shown, labelled as the engine's own words.
 * ⭐ U49a (ENGINE-SPEC §3.4, §4.12 decision 5): the credit kept for login and withdrawal codes — `MARKETING_FLOOR` is
 * `sendBatch`'s own refusal (its last line), `marketing_floor` and `credit_unreadable` are the slice's own checks before it
 * claims anyone (U43b writes all three; one sentence for the floor, whichever line caught it).
 * ⭐ U43b-2 (ENGINE-SPEC §3.4, §4.13): the slice's own — `live_switch_closed` (the owner's switch off, lapsed or unreadable,
 * found before the claim or just before the wire), `gateway_refused` (the network refused a batch with its own "no" —
 * nothing was charged, so Resume sends it again), `template_invalid` (the saved message no longer passes its own check),
 * `held_rows` (only people the engine could not check or prepare are left) — and, as built, `gateway_unanswered` (a batch
 * the network never clearly answered: its people are "no answer" and are never sent again by themselves) and
 * `before_send_unanswered` (the engine could not re-check its own claims just before the wire, three slices running). The
 * slice also pauses with U42's `list_over_confirmed_sending` when it finds a list longer than confirmed itself (the U42
 * re-review). ⭐ The U43b-2 review made every engine sentence TRUE of every way its key is written: `confirmation_unreadable`
 * (a confirmed count that is not a count, MID-campaign — the word Resume refuses it with, never `audience_unreadable`,
 * whose cause and remedy are the enqueue's), `send_error` (a send that failed on our side: whoever it certainly missed goes
 * back on the list, whoever it may have reached is "no answer"), and the credit check's causes each in its own words —
 * `settings_unreadable`, `sizes_unreadable`, `price_unknown`, `credit_unreadable` (now the credit read alone). ⛔ A pause
 * that can land after people were messaged never prescribes a copy as if it reached nobody: a copy has the same filter
 * and nothing de-duplicates across campaigns (`template_invalid`, `confirmation_unreadable`, as U42's own).
 * ⭐ U47b-1 (ENGINE-SPEC §3.4): an officer's own two — `officer_paused` (Pause) and `officer_stopped` (Stop), written by
 * `campaign-control.ts`. The live page names who and when from the act's audit row (`campaign-live.ts`); the list says
 * these words.
 */
const STOP_REASON_SENTENCE: Readonly<Record<string, string>> = {
  officer_paused: "Paused by an officer.",
  officer_stopped: "Stopped by an officer.",
  BALANCE_FLOOR: "The SMS credit is below its floor. Top it up, then resume.",
  NOT_CONFIGURED: "SMS sending is not set up on the server.",
  PROVIDER_UNRECOGNISED: "The SMS provider setting is not one this platform knows.",
  gate_unanswered: "The consent check could not answer, so nobody more was messaged.",
  MARKETING_FLOOR: MARKETING_FLOOR_SENTENCE,
  marketing_floor: MARKETING_FLOOR_SENTENCE,
  credit_unreadable: "Paused — the SMS credit couldn't be read, so sending stopped to protect login codes. Resume when Admin → System shows the credit again.",
  audience_unreadable: "Paused — the saved audience can't be read any more. Stop this campaign and confirm a new copy — or write a new campaign if the copy is refused.",
  audience_moved: "Paused — the people on this campaign changed after it was started. Nothing was sent. Stop it and confirm a new copy.",
  list_over_confirmed: "Paused — more people are on this campaign's list than were confirmed. Nothing was sent. Stop it and confirm a new copy.",
  list_over_confirmed_sending:
    "Paused — more people are on this campaign's list than were confirmed, found after sending had started, so nobody more is messaged. Some people may already have been messaged, and a copy would message them again. Stop this campaign.",
  live_switch_closed:
    "Paused — marketing SMS are not switched on: the owner switched them off, the time they were switched on for ran out, or the switch couldn't be read. Once Admin → System shows them on, press Resume.",
  gateway_refused: "Paused — the SMS network refused the last batch, and nothing in it was charged. Check Admin → System, then Resume.",
  gateway_unanswered:
    "Paused — the SMS network gave no clear answer for the last batch (no reply, or an error page instead of its answer), so those people are counted as no answer and are never sent again by themselves. Check Admin → System, then Resume.",
  send_error:
    "Paused — sending the last batch failed on our side. Everyone it certainly did not reach goes back on the list, and nothing was charged for them; anyone it may have reached is counted as no answer and is never sent again by themselves. Ask the developer to check the server log, then press Resume.",
  template_invalid:
    "Paused — the saved message no longer passes its own check, so nobody more is messaged. Some people may already have been messaged, and a copy would message them again. Stop this campaign, and send a corrected copy only if that is what you want.",
  confirmation_unreadable:
    "Paused — this campaign's confirmation can't be read in full, so nobody more is messaged. Some people may already have been messaged, and a copy would message them again. Stop it, or ask the developer.",
  settings_unreadable:
    "Paused — the Marketing SMS settings couldn't be read in full, so what this campaign may spend can't be checked against the credit kept for login codes. Resume once Admin → System shows them; if it happens again, ask the developer.",
  sizes_unreadable:
    "Paused — this campaign's saved message size can't be read, so what is left to send can't be priced against the credit kept for login codes. Stop it, or ask the developer.",
  price_unknown:
    "Paused — the price per SMS isn't known, so what is left to send can't be priced against the credit kept for login codes. The owner sets it on Admin → System → Marketing SMS, then Resume.",
  held_rows: "Paused — some people could not be checked or prepared. Resume to try them again, or Stop.",
  before_send_unanswered:
    "Paused — the last check before sending could not be made three times running, so nothing more was sent. Resume to try again.",
  // ⭐ The U43b-2 re-review · the send-age bound met three slices in a row (at the smallest group, the check before each
  // message is slower than the time a group may take).
  slice_too_slow:
    "Paused — checking people just before their message took too long three times running, so nothing more was sent and those people were put back unsent. Resume to try again; if it happens again, ask the developer.",
};

/** A stop reason in words. ⛔ Never the raw key alone: an unknown key reads "Engine reason: <key>". */
export function stopReasonLabel(key: string): string {
  const k = key.trim();
  if (k === "") return "Engine reason: not recorded";
  return own(STOP_REASON_SENTENCE, k) ? STOP_REASON_SENTENCE[k] : `Engine reason: ${k}`;
}

/* ══ THE CAMPAIGN SCREENS (432(h)) ══════════════════════════════════════════════════════════════════════════════ */

export type CampaignScreens = { readonly compose: boolean; readonly detail: boolean };

/** Where each campaign screen lives when it exists — routes, so the tie is a page file and not a class of files. */
export const CAMPAIGN_SCREEN_ROUTES = {
  compose: "/admin/campaigns/new",
  detail: "/admin/campaigns/[id]",
} as const satisfies Record<keyof CampaignScreens, string>;

/** ⛔ Flip a value here ONLY in the change that lands its page; `test:campaigns-page` 5f refuses either one alone.
 *  ⭐ compose is ON since U37b (2026-10-02), which landed /admin/campaigns/new in the same change (M8). */
export const CAMPAIGN_SCREENS: CampaignScreens = { compose: true, detail: false };

/** One campaign's page, for the row link that exists only once `CAMPAIGN_SCREENS.detail` does. */
export function campaignDetailHref(id: string): string {
  return `/admin/campaigns/${encodeURIComponent(id)}`;
}

/** A saved DRAFT reopens in the composer at its own address (`?draft=<id>`) — the one door back to a draft until U47's
 *  detail page exists (the validation audit, 2026-10-03: a saved draft could not be found again from the list). */
export function campaignDraftHref(id: string): string {
  return `${CAMPAIGN_SCREEN_ROUTES.compose}?draft=${encodeURIComponent(id)}`;
}

/* ══ U38b · THE D19 RULE BEFORE A CAMPAIGN SENDS (ENGINE-SPEC E23, as OD65 amends it) ══════════════════════════════ */

/**
 * ⛔ BEFORE A CAMPAIGN SENDS, A VIEWER WHO MAY NOT READ A NUMBER IS TOLD HOW MANY PEOPLE MATCH — AND NOTHING ELSE, AT
 * EVERY SIZE (OD65, 2026-10-07: S14's ruling on the U38b pre-review's D19-1, on Ali's delegation). The breakdown — the
 * will-receive figure, the reasons, the sample — is the gate's verdict on the very people a filter holds, and an officer
 * who may not read numbers can still fill a filter with people of their choosing: a tag or a list padded with numbers
 * whose verdicts they know leaves the one remaining verdict, protected standing included, as the difference. A size
 * floor cannot hold against that, so the composer's card and the confirmation (U40) use none: such a viewer's count is
 * the ONE walk's count (`campaignAudienceCount`) and the gate is never asked for them at all. A reader sees everything.
 * `MASKED_BREAKDOWN_MIN` — E23's floor of 10 — stays for the surfaces that count messages actually SENT (U47b's live
 * page, U48a's results), where every probe costs a real campaign: the owner's live switch, a typed confirmation and an
 * audit row (OD65 records that residual for them).
 */
export const MASKED_BREAKDOWN_MIN = 10;

/** May this viewer see an audience's breakdown before the campaign sends? A reader only (OD65) — the size never matters. */
export function breakdownVisible(viewerReads: boolean): boolean {
  return viewerReads;
}
