/**
 * U36 · WHAT /admin/campaigns READS — one function, so the page and `test:campaigns-page` run the SAME reads.
 *
 * ⭐ THE RAIL'S COUNTS ARE THE WHOLE TABLE (`statusCounts`), never the filtered page — a filter must not make the
 * other statuses look empty — and they are read FIRST, so a page read that fails takes no count with it that the
 * rail could show.
 * ⭐ PAGE 9 OF A 3-ROW RESULT IS PAGE 1, never "no matches": the page is read as asked, clamped by the total it came
 * back with, and read again when the clamp moved it (U20's loader, the same rule).
 * ⭐ EVERY TIE BREAKS ON THE ID, in the sort's own direction, in both twins — so a page boundary falls in the same
 * place on Postgres and in memory, and no row is shown twice or skipped between pages.
 * ⭐ ONE RECIPIENT READ FOR THE WHOLE PAGE: `countsByCampaign` is asked ONCE with exactly the page's ids — never once
 * per row (an N+1 that grows with the page), never for the whole table (150,000 rows a campaign, §3c).
 * ⛔ A READ THAT FAILS THROWS to the caller, which renders `AdminLoadError` with the rail still drawn and no counts —
 * never a zero, which on this list would read as "nothing has ever been sent".
 * ⛔ IT READS NOTHING THE LIST MAY NOT SHOW: no money (OD24 — the rows go to a server component that renders no
 * budget or estimate), and no audience resolver at all (the audience figure is the population frozen at confirm).
 * ⭐ U38b · M8 · EACH ROW'S AUDIENCE IN WORDS (`campaignRowAudience`): the stored filter read at the CAMPAIGN scope and
 * said by the ONE describer (`describeAudience`), role-shaped EXACTLY as the composer shapes it — the words only when the
 * campaign door's role rule passes the filter (its ticked selection aside), else "Audience hidden for your role". It
 * reads nothing: the filter is on the row.
 */
import { db } from "@/lib/server/store";
import type { SmsCampaignListSort, SmsCampaignPage, SmsCampaignRecipientCountsById, SmsCampaignStatusCounts, StoredSmsCampaign } from "@/lib/server/store";
import { parseContactAudienceJson, describeAudience, campaignAudienceRefusal } from "@/lib/server/marketing/audience";
import { statusesForRail } from "@/lib/marketing/campaign-status";
import type { CampaignRailKey } from "@/lib/marketing/campaign-status";
import { PER_PAGE, parsePage } from "@/components/admin/admin-pagination";
import { parseSort } from "@/components/admin/admin-sort";
import { CAMPAIGN_SORTS, campaignRailKeyOf } from "./campaigns-rail";
import type { CampaignsSp } from "./campaigns-rail";

/** Next's own shape: a repeated param arrives as an array. */
export type CampaignsParams = CampaignsSp;

export type CampaignsView = {
  /** The WHOLE table's counts by status — whatever the filter or the page. */
  counts: SmsCampaignStatusCounts;
  /** One page of the filtered list, and the size of the whole filtered list. */
  result: SmsCampaignPage;
  /** Each listed campaign's recipient tally, zero-filled — read once, for exactly the listed ids. */
  recipients: SmsCampaignRecipientCountsById;
  /** The rail key in force ("" = All). */
  rail: CampaignRailKey | "";
  /** The page actually shown, after the clamp. */
  page: number;
  sort: SmsCampaignListSort;
  dir: "asc" | "desc";
  /** When the list was read — the "As of" line beside a row in flight. */
  readAt: string;
};

const firstParam = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** The sort the address asks for — newest first by default. Also asked by the page when the read failed.
 *  ⛔ TRIMMED EXACTLY AS `campaignsLinkSp` TRIMS (U36 review F2): untrimmed, `?dir=asc%20` read newest first while every
 *  pill, the pager and Show all carried `dir=asc` — page 2 was read in the other order, rows repeating or vanishing
 *  across the boundary. A link built from this page must re-read the order this page read (`test:campaigns-page` 2g). */
export function campaignsSort(sp: CampaignsParams): { sort: SmsCampaignListSort; dir: "asc" | "desc" } {
  return parseSort({ sort: firstParam(sp.sort)?.trim(), dir: firstParam(sp.dir)?.trim() }, CAMPAIGN_SORTS, "created", "desc");
}

export async function loadCampaigns(sp: CampaignsParams): Promise<CampaignsView> {
  const rail = campaignRailKeyOf(sp);
  const statuses = statusesForRail(rail);
  const { sort, dir } = campaignsSort(sp);
  // ⭐ The whole table, first — the rail's counts never come from the page below.
  const counts = await db.smsCampaign.statusCounts();
  const read = (p: number) => db.smsCampaign.page({ statuses, sort, dir, offset: (p - 1) * PER_PAGE, limit: PER_PAGE });
  const requested = parsePage(firstParam(sp.page), Number.MAX_SAFE_INTEGER);
  let result = await read(requested);
  const page = parsePage(firstParam(sp.page), result.total);
  if (page !== requested) result = await read(page);
  // ⭐ ONE read for the page's recipients — exactly its ids (an empty page asks for none and is answered {}).
  const recipients = await db.smsCampaignRecipient.countsByCampaign(result.rows.map((c) => c.id));
  return { counts, result, recipients, rail, page, sort, dir, readAt: new Date().toISOString() };
}

/* ═══ U38b · M8 · A ROW'S AUDIENCE, IN WORDS ═════════════════════════════════════════════════════════════════════ */

/** What one row says about its audience: the describer's phrases (none = the whole contact book), hidden for this
 *  viewer's role, or a stored filter this build cannot read. */
export type CampaignRowAudience = { kind: "words"; lines: string[] } | { kind: "hidden" } | { kind: "unreadable" };

/**
 * ⛔ D19 / A1.1 / X25 · role-shaped exactly as the composer shapes its card (`composeAudienceView`): the stored filter is
 * read at the CAMPAIGN scope (a population included), and described only when the campaign door's role rule passes it for
 * THIS viewer with the ticked selection set aside — so a viewer who may not read a number never gets a phrase naming a
 * consent, a source, a player, a stop or a search. Pure: the filter is on the row, and nothing is read.
 */
export function campaignRowAudience(c: Pick<StoredSmsCampaign, "audienceFilter">, viewerReads: boolean): CampaignRowAudience {
  let raw: unknown;
  try {
    raw = JSON.parse(c.audienceFilter);
  } catch {
    return { kind: "unreadable" };
  }
  const parsed = parseContactAudienceJson(raw, "campaign");
  if (!parsed.ok) return { kind: "unreadable" };
  if (campaignAudienceRefusal({ ...parsed.filter, ids: null }, viewerReads) !== null) return { kind: "hidden" };
  return { kind: "words", lines: describeAudience(parsed.filter) };
}
