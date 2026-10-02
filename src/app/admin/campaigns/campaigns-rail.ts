/**
 * U36 · THE SMS CAMPAIGN LIST'S STATUS RAIL — ITS MODEL, AND THE ONE HREF BUILDER. Built in ONE function, so the page
 * and `test:campaigns-page` build the same rail.
 *
 * ⭐ THE DESK IDIOM, AS THE CONTACT BOOK USES IT (`contacts-rail.ts` builds, `contact-filters.tsx` draws): this file
 * decides every label, every href and which pill is in force; `campaign-status-rail.tsx` draws it without a decision
 * of its own. What is APPLIED is read by the same function the loader asks (`statusesForRail`), so the pill an
 * officer sees in force can never disagree with the rows the loader returned.
 *
 * ⭐ ONE AXIS, FIVE PILLS: All, then the plan's four keys (drafts · sending · paused · finished), each covering its
 * statuses exactly once (`CAMPAIGN_STATUS_VIEW`). An unknown `?status=` is not a filter: All is in force and the list
 * shows every row, so what the rail says and what the table shows agree.
 * ⭐ A COUNT ONLY WHERE IT IS TRUE: each pill's count is the WHOLE table's (`statusCounts`, never the filtered page —
 * a filter must not make the other statuses look empty), and a failed read hands the rail no counts at all, so the
 * pills are drawn bare rather than with an invented number (FilterPill: "never invent one").
 * ⛔ EVERY HREF IS `campaignsHref`'s: a pill changes its own axis and keeps the sort; it never carries `page` (a
 * filter change lands on page 1, never on a page the new list may not have) and never a parameter this page does not
 * read.
 *
 * Guard: `npm run test:campaigns-page` §2 and §5j (the model, every href, the counts) · red: `npm run red:campaigns-page`.
 */
import { CAMPAIGN_RAIL, railCount, statusesForRail } from "@/lib/marketing/campaign-status";
import type { CampaignRailKey } from "@/lib/marketing/campaign-status";
import type { SmsCampaignListSort, SmsCampaignStatusCounts } from "@/lib/server/store";
import { CAMPAIGNS_RAIL_KEY, CAMPAIGNS_RAIL_LABEL } from "./campaigns-copy";

/** Next's own shape: a repeated param arrives as an array. */
export type CampaignsSp = Record<string, string | string[] | undefined>;

/** The list's sortable columns, as the address spells them. The first is the default (newest first). */
export const CAMPAIGN_SORTS: readonly SmsCampaignListSort[] = ["created", "name", "updated"];

const firstParam = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** The rail key the address applies, or "" (All) when it applies none — or one this page does not know. */
export function campaignRailKeyOf(sp: CampaignsSp): CampaignRailKey | "" {
  const raw = (firstParam(sp.status) ?? "").trim();
  return statusesForRail(raw) === null ? "" : (raw as CampaignRailKey);
}

/**
 * The page's link params as ONE value per key — what `SortTh` takes (it copies every key but sort/dir/page). ⛔ Only
 * the keys this page reads, and only values it accepts: a rail key it knows, a sort it offers, a direction.
 */
export function campaignsLinkSp(sp: CampaignsSp): Record<string, string> {
  const out: Record<string, string> = {};
  const rail = campaignRailKeyOf(sp);
  if (rail !== "") out.status = rail;
  const sort = (firstParam(sp.sort) ?? "").trim();
  if ((CAMPAIGN_SORTS as readonly string[]).includes(sort)) out.sort = sort;
  const dir = (firstParam(sp.dir) ?? "").trim();
  if (dir === "asc" || dir === "desc") out.dir = dir;
  return out;
}

/**
 * ⭐ THE ONE HREF BUILDER for /admin/campaigns — every pill, the pager's base and the no-match row's Show all go
 * through it. It carries the page's link params, then applies `patch`: a string sets a key, null removes it.
 * ⛔ `page` only when patched.
 */
export function campaignsHref(sp: CampaignsSp, patch: { status?: string | null; page?: string | null } = {}): string {
  const flat = campaignsLinkSp(sp);
  const params = new URLSearchParams();
  const status = patch.status !== undefined ? patch.status : flat.status;
  if (typeof status === "string" && status !== "") params.set("status", status);
  if (flat.sort !== undefined) params.set("sort", flat.sort);
  if (flat.dir !== undefined) params.set("dir", flat.dir);
  if (typeof patch.page === "string" && patch.page !== "") params.set("page", patch.page);
  const qs = params.toString();
  return qs ? `/admin/campaigns?${qs}` : "/admin/campaigns";
}

/** One pill: a finished label, a finished href, whether it is the one in force, and its count when one is known. */
export type CampaignRailOption = {
  /** The rail key this pill writes ("" = All). With the param it forms FilterPill's `testId` ("status:paused"). */
  key: CampaignRailKey | "";
  label: string;
  title: string;
  href: string;
  on: boolean;
  /** The WHOLE table's count under this pill — absent when the read failed. */
  count?: number;
};
export type CampaignRail = {
  /** The rail's accessible name. */
  label: string;
  /** The visible group key ("Status"). */
  groupKey: string;
  options: CampaignRailOption[];
};
export type CampaignRailInput = {
  /** The page's address, as Next hands it. */
  sp: CampaignsSp;
  /** The WHOLE table's status counts — null when the read failed, so no pill carries a count. */
  counts: SmsCampaignStatusCounts | null;
};

/** ⭐ THE RAIL, for every state: the counts when the read arrived, the address alone when it failed. */
export function campaignRail(input: CampaignRailInput): CampaignRail {
  const applied = campaignRailKeyOf(input.sp);
  return {
    label: CAMPAIGNS_RAIL_LABEL,
    groupKey: CAMPAIGNS_RAIL_KEY,
    options: CAMPAIGN_RAIL.map((o) => ({
      key: o.key,
      label: o.label,
      title: o.title,
      href: campaignsHref(input.sp, { status: o.key === "" ? null : o.key }),
      on: o.key === applied,
      ...(input.counts === null ? {} : { count: railCount(input.counts, o.key) }),
    })),
  };
}
