/**
 * U38b · THE AUDIENCE CARD'S ONE VIEW-MODEL — a split, as one viewer may see it (ENGINE-SPEC §4.4 decision 5).
 *
 * ⭐ PURE: formatting and ordering only. Every figure the card prints is a string made HERE from a COUNT the split made
 * (`audience-split.ts` counts each answer of the gate; nothing derives one figure from others) — the card renders these
 * fields and nothing else, and no `.tsx` under `campaigns/new` does arithmetic on a figure (`test:campaign-audience` §B4).
 * There is no browser arithmetic at all: the card is a server component, and what reaches the browser is its HTML.
 *
 * ⛔ D19 · OD65 · THE COUNT ALONE: for a viewer who may not read a number — at EVERY size, before a campaign sends — the
 * view-model is `kind: "floor"` (`audienceCountView`): the count on the campaign and the sentence why, and NOTHING else:
 * no will-receive figure, no reason, no sample. The object simply has no such field, so no render can leak one, and the
 * count comes from the ONE walk, never from the gate (`composeAudienceCount`). A reader always gets the full view. A
 * sample row's detail (which row, its name, where the gate put it) is printed only for a reader, whatever the split
 * carries (`sampleView` asks `viewerReads` too — a second, independent check beside `audienceSplitForViewer`).
 * ⭐ PROTECTED IS ONE LINE: the five buckets are labelled from ONE full Record (`AUDIENCE_REASON_LABEL`), dominant first,
 * ties in the split's own bucket order; `unanswered` joins them as its own row only when there is one.
 * ⭐ `floor` is a parameter for in-process red plants only (`test:campaign-audience` R-B6, R-B6b, R-B6c) — production
 * never passes it.
 */
import type { AudienceBucket, AudienceSampleRow, AudienceSplit } from "@/lib/server/marketing/audience-split";
import { breakdownVisible } from "@/lib/marketing/campaign-status";
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { formatNumber } from "@/lib/utils";
import {
  AUDIENCE_EMPTY, AUDIENCE_FLOOR, AUDIENCE_NO_OPERATOR, AUDIENCE_REASON_LABEL, AUDIENCE_ROW_KIND, AUDIENCE_SLOT_WORDS,
  AUDIENCE_UNANSWERED_LABEL,
} from "./audience-copy";

/** One sample row, as the card prints it. `who` and `status` are a READER's: null for anyone else, and null on every
 *  row of a masked viewer's split (it carries no detail). */
export type AudienceSampleView = { masked: string; operator: string; who: string | null; status: string | null };

/** One reason row: its words, its count as printed, and the count itself (the bar's length — the kit's `AdminBarList`). */
export type AudienceReasonView = { label: string; count: string; n: number };

export type AudienceSplitView =
  | {
      kind: "full";
      filterKey: string;
      onCampaign: string;
      /** "≥ 1,204" when some numbers were not checked in time — a floor, never a guess. */
      willReceive: string;
      notReceiving: string;
      unsendable: string;
      /** null unless the time budget ran out. */
      unchecked: string | null;
      /** True when nobody matches — the card says so above real zeros. */
      empty: boolean;
      reasons: AudienceReasonView[];
      sample: AudienceSampleView[];
      /** "14:03:22" on the EAT clock. */
      countedAt: string;
      /** "2.1" — seconds, one decimal. */
      tookSeconds: string;
    }
  | {
      kind: "floor";
      filterKey: string;
      onCampaign: string;
      /** Why there is nothing more: the floor's sentence — or, for nobody at all, that nobody matches. */
      sentence: string;
    };

/** The five buckets in the split's own order — the tiebreak for two equal reasons. Read from the full Record's keys, so it
 *  cannot hold a bucket the split does not have, nor miss one (the Record is typed over `AudienceBucket`). */
const BUCKET_ORDER = Object.keys(AUDIENCE_REASON_LABEL) as AudienceBucket[];

/** "14:03:22", on the EAT wall clock whatever the server's zone. */
function eatClockSeconds(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms + EAT_OFFSET_MS).toISOString().slice(11, 19) : "—";
}

/** Seconds with one decimal ("2.1"), never negative. */
function seconds(durationMs: number): string {
  return (Math.max(0, durationMs) / 1000).toFixed(1);
}

function sampleView(row: AudienceSampleRow, viewerReads: boolean): AudienceSampleView {
  const d = row.detail;
  // ⛔ A masked viewer's row: the number masked and the operator by prefix, nothing else — even if a split handed in with
  // its detail (D19-3: the door shapes it, and this view-model checks again).
  if (d === null || !viewerReads) return { masked: row.masked, operator: row.operator ?? AUDIENCE_NO_OPERATOR, who: null, status: null };
  const slot = d.slot;
  const status = slot === "willReceive" || slot === "unchecked" || slot === "unanswered" ? AUDIENCE_SLOT_WORDS[slot] : AUDIENCE_REASON_LABEL[slot];
  const kind = d.subject.field === "contactPhone" ? AUDIENCE_ROW_KIND.contact : AUDIENCE_ROW_KIND.player;
  const name = d.name !== null && d.name.trim() !== "" ? d.name.trim() : null;
  return { masked: row.masked, operator: row.operator ?? AUDIENCE_NO_OPERATOR, who: name === null ? kind : `${kind} · ${name}`, status };
}

/**
 * ⛔ D19 · OD65 · THE COUNT ALONE — what a viewer who may not read a number is shown before a campaign sends, at every
 * size: how many people match (the ONE walk's count) and the sentence why; nobody at all says so. Built field by field.
 */
export function audienceCountView(filterKey: string, matching: number): Extract<AudienceSplitView, { kind: "floor" }> {
  return { kind: "floor", filterKey, onCampaign: formatNumber(matching), sentence: matching === 0 ? AUDIENCE_EMPTY : AUDIENCE_FLOOR };
}

/**
 * ⭐ THE ONE VIEW-MODEL. `split` is the split as the door shaped it for this viewer (`audienceSplit` — a masked viewer's
 * sample already has no detail); `viewerReads` decides: a reader gets the full view, anyone else the count alone (OD65).
 */
export function audienceSplitView(
  split: AudienceSplit,
  viewerReads: boolean,
  floor: (viewerReads: boolean, matching: number) => boolean = breakdownVisible,
): AudienceSplitView {
  const onCampaign = formatNumber(split.matching);
  // ⛔ THE COUNT ALONE — built field by field, so nothing of the split rides along.
  if (!floor(viewerReads, split.matching)) return audienceCountView(split.filterKey, split.matching);
  const rows: AudienceReasonView[] = BUCKET_ORDER.map((b) => ({
    label: AUDIENCE_REASON_LABEL[b], count: formatNumber(split.notReceiving[b]), n: split.notReceiving[b],
  }));
  if (split.unanswered > 0) rows.push({ label: AUDIENCE_UNANSWERED_LABEL, count: formatNumber(split.unanswered), n: split.unanswered });
  // Dominant first (OD40); a stable sort keeps the bucket order for a tie.
  const reasons = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.n - a.r.n || a.i - b.i)
    .map(({ r }) => r);
  return {
    kind: "full",
    filterKey: split.filterKey,
    onCampaign,
    willReceive: split.unchecked > 0 ? `≥ ${formatNumber(split.willReceive)}` : formatNumber(split.willReceive),
    notReceiving: formatNumber(split.notReceivingTotal),
    unsendable: formatNumber(split.unsendable),
    unchecked: split.unchecked > 0 ? formatNumber(split.unchecked) : null,
    empty: split.matching === 0,
    reasons,
    sample: split.sample.map((row) => sampleView(row, viewerReads)),
    countedAt: eatClockSeconds(split.computedAt),
    tookSeconds: seconds(split.durationMs),
  };
}
