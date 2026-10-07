/**
 * /admin/campaigns — the SMS campaign list (U36: the six doors, the status rail, each campaign's progress, and the
 * "SMS campaigns" nav badge in admin-shell.tsx).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: a list of the campaigns in the table, server-paged, sortable
 * by name, creation and last activity, filterable by status from one rail. Nothing can be written, started, paused or
 * opened from here yet — writing a campaign is U37 and a campaign's own page is U47 — and the page links to neither
 * until it exists (`CAMPAIGN_SCREENS`, ruling 432(h)).
 *
 * ⭐ THE SIX DOORS (U17 measured six, not five): the Growth nav item "SMS campaigns", its ROUTE_KEYS row, the
 * ROUTE_DOMAINS row (THE section's visibility — `test:rbac` §7b holds it equal to the nav item's domain), the section
 * layout's literal gate, the ghost, the rail declared in ADMIN_SURFACES — and this page's OWN gate below.
 * ⭐ THE RAIL'S COUNTS ARE THE WHOLE TABLE and the rail is gated on the whole table ALONE (`emptyTable`), never on the
 * page's rows: a filter that matches nothing keeps the rail — the one control that can undo it — and so does a failed
 * read, drawn from the address with no counts.
 * ⭐ PROGRESS IS THE SERVER'S COUNT (`campaignProgress` over one groupBy of the page's recipients): a determinate bar,
 * never a timer, never an animation that moves on its own (OD34, OD38). A campaign with nothing to measure shows "—",
 * never a 0 % bar. The list is a snapshot, and a row in flight says when it was read, beside a Refresh.
 * ⛔ NO MONEY ON THE LIST (OD24): no TZS, no budget, no estimate — GROWTH reads this page. ⛔ No raw audience filter
 * and no raw stop-reason key (`stopReasonLabel`). ⛔ No pulse anywhere (OD38).
 * ⭐ U38b · M8 · EACH ROW SAYS ITS AUDIENCE IN WORDS under its name (`campaignRowAudience` — the ONE describer, role-shaped
 * exactly as the composer shapes it: a viewer who may not read a number gets the words only when the campaign door's role
 * rule passes the filter, else "Audience hidden for your role."). The line never widens its column: it wraps inside the
 * width the name gives it, so the seven columns still fit the card at 1280.
 *
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses, contacts and invites.
 */
import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminPagination, PER_PAGE } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { RefreshButton } from "@/components/admin/refresh-button";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScrollX } from "@/components/ui/scroll-x";
import type { StoredSmsCampaign, SmsCampaignRecipientStatusCounts, SmsCampaignRecipientCountsById } from "@/lib/server/store";
import {
  CAMPAIGN_SCREENS, CAMPAIGN_SCREEN_ROUTES, CAMPAIGN_STATUS_VIEW, campaignDetailHref, campaignProgress, campaignTotal,
  stopReasonLabel, zeroRecipientStatusCounts,
} from "@/lib/marketing/campaign-status";
import { formatClock, formatDate } from "@/lib/utils";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import { loadCampaigns, campaignsSort, campaignRowAudience } from "./campaigns-loader";
import { draftAddressFor } from "./new/composer-loader";
import type { CampaignsParams, CampaignsView, CampaignRowAudience } from "./campaigns-loader";
import { campaignRail, campaignsHref, campaignsLinkSp } from "./campaigns-rail";
import { CampaignStatusRail } from "./campaign-status-rail";
import {
  CAMPAIGNS_EMPTY, CAMPAIGNS_NO_MATCH, CAMPAIGNS_SHOW_ALL, CAMPAIGNS_NEW, CAMPAIGNS_NOT_CONFIRMED, CAMPAIGNS_UNTITLED,
  audienceLine, segmentsLine, progressCaption, progressLabel, campaignsAsOf, campaignAudienceWords,
} from "./campaigns-copy";

export const metadata = { title: "SMS campaigns · Admin" };
export const dynamic = "force-dynamic";

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. ⛔ One
 *  `return`, one self-closing child, a literal title: `admin-section-gate.test.mjs` §0b′ refuses anything else. */
export default async function AdminCampaignsPage(props: { searchParams: Promise<CampaignsParams> }) {
  return <AdminPageGate title="SMS campaigns"><AdminCampaignsContent searchParams={props.searchParams} /></AdminPageGate>;
}

const COLS = 7;

/** The bar, from the server's counts — or "—" when there is nothing to measure. */
function ProgressCell({ c, counts }: { c: StoredSmsCampaign; counts: SmsCampaignRecipientStatusCounts }) {
  const p = campaignProgress(c, counts);
  if (p === null) return <span className="text-text-tertiary">—</span>;
  const caption = progressCaption(p);
  // ⚖️ 152, not 180 (measured 2026-10-02 at 1280, the console's narrowest desktop): at 180 the seven columns ran 26px
  // past the card and sixteen of twenty names wrapped. 152 still holds "1,847 of 5,912 processed" on one line; a
  // longer caption wraps between its words, never inside a figure.
  return (
    <div className="w-[152px] max-w-full">
      <ProgressBar value={p.value} max={p.max} label={progressLabel(c.name)} caption={caption} captionText={caption} />
    </div>
  );
}

function CampaignRow({ c, counts, audience, draftHref }: { c: StoredSmsCampaign; counts: SmsCampaignRecipientStatusCounts; audience: CampaignRowAudience; draftHref: string }) {
  const view = CAMPAIGN_STATUS_VIEW[c.status];
  const name = c.name.trim() === ""
    ? <span className="text-text-tertiary">{CAMPAIGNS_UNTITLED}</span>
    : <span className="text-text">{c.name}</span>;
  return (
    <tr data-campaign-row data-campaign-id={c.id}>
      {/* ⛔ A LINK ONLY TO A PAGE THAT EXISTS (432(h)): plain text until U47 lands /admin/campaigns/[id] and flips the flag. */}
      {/* ⭐ A SAVED DRAFT REOPENS FROM HERE: a DRAFT row links to the composer at its own ?draft= address (behind the
          compose flag); every other row stays plain text until U47 lands its page and flips `detail`. */}
      <td>
        {CAMPAIGN_SCREENS.detail ? <Link href={campaignDetailHref(c.id) as Route} className="hover:underline">{name}</Link> : c.status === "DRAFT" && CAMPAIGN_SCREENS.compose ? <Link href={draftHref as Route} className="hover:underline">{name}</Link> : name}
        {/* ⭐ U38b · M8 · the audience in words, role-shaped. A zero width with a full minimum: it wraps inside the column
            the name sets and never widens it. */}
        <span className="mt-0.5 block w-0 min-w-full break-words text-body-sm text-text-tertiary" data-campaign-audience={audience.kind}>
          {campaignAudienceWords(audience)}
        </span>
      </td>
      <td>
        <Chip size="sm" variant={view.chip}><span className="whitespace-nowrap">{view.label}</span></Chip>
        {/* ⛔ The engine's reason in words — an unknown key reads "Engine reason: <key>", never the key alone. */}
        {c.status === "PAUSED" && c.stopReason !== null && (
          <p data-stop-reason className="mt-1 text-body-sm text-text-tertiary">{stopReasonLabel(c.stopReason)}</p>
        )}
      </td>
      <td className="tabular-nums">
        {c.audienceCount === null ? <span className="text-text-tertiary">{CAMPAIGNS_NOT_CONFIRMED}</span> : audienceLine(c.audienceCount)}
      </td>
      <td><ProgressCell c={c} counts={counts} /></td>
      <td className="whitespace-nowrap">{segmentsLine(c.segmentsSw, c.segmentsEn)}</td>
      <td className="whitespace-nowrap">{formatDate(c.createdAt)}</td>
      {/* The day over its clock, so the column is no wider than "Created" beside it (one line of both was the widest
          cell in the row) and the year is never dropped to save room. */}
      <td className="whitespace-nowrap">
        <span className="block">{formatDate(c.updatedAt)}</span>
        <span className="block text-body-sm text-text-tertiary tabular-nums">{formatClock(c.updatedAt)}</span>
      </td>
    </tr>
  );
}

async function AdminCampaignsContent({ searchParams }: { searchParams: Promise<CampaignsParams> }) {
  const sp = await searchParams;
  let view: CampaignsView | null = null;
  try {
    view = await loadCampaigns(sp);
  } catch (err) {
    // ⛔ A failed read is AdminLoadError below, never a zero (`campaigns-loader.ts`).
    console.error("[admin/campaigns] read failed:", (err as Error)?.message ?? err);
  }
  const failed = view === null;
  // ⭐ U38b · M8 · D19 · the viewer's read cell, decided on the server (failing closed) — each row's audience words are
  // shaped by it, exactly as the composer's card is.
  const reads = await viewerReadsContacts().catch(() => false);
  // ⭐ A WHOLE-TABLE FACT, never the page: the rail and the empty row both read it.
  const emptyTable = view !== null && campaignTotal(view.counts) === 0;
  const rows = view?.result.rows ?? [];
  const recipients: SmsCampaignRecipientCountsById = view?.recipients ?? {};
  const { sort, dir } = view ?? campaignsSort(sp);
  // ⭐ ONE href builder (`campaignsHref`): the rail, the pager and Show all keep the sort and never carry `page`.
  const linkSp = campaignsLinkSp(sp);
  const rail = campaignRail({ sp, counts: view?.counts ?? null });
  const noMatch = view !== null && view.rail !== "" ? CAMPAIGNS_NO_MATCH[view.rail] : null;
  const inFlight = rows.some((c) => c.status === "PREPARING" || c.status === "RUNNING");

  return (
    <>
      {/* The gloss is COPIED, never invented (§5.13): "Kampeni" is the shipped Swahili beside "Campaigns" on
          /admin/invites. ⛔ The head's action exists only once the composer does (U37). */}
      <AdminPageHead
        title="SMS campaigns"
        sw="Kampeni"
        actions={CAMPAIGN_SCREENS.compose ? <Link href={CAMPAIGN_SCREEN_ROUTES.compose as Route} className="btn btn-primary btn-sm">{CAMPAIGNS_NEW}</Link> : undefined}
      />

      <AdminBody>
        <div data-block="campaigns-card"><AdminCard padding="p-0">
          {/* ⛔ NEVER THE PAGE'S ROWS: a filter that matches nothing, and a failed read, both keep the rail. */}
          {!emptyTable && <CampaignStatusRail rail={rail} />}
          {failed && <div className="p-4"><AdminLoadError what="the SMS campaigns" /></div>}
          {view !== null && inFlight && (
            <div data-block="campaigns-asof" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle px-3 py-2 text-body-sm text-text-secondary">
              <span>{campaignsAsOf(view.readAt)}</span>
              <RefreshButton />
            </div>
          )}
          {!failed && <ScrollX label="SMS campaigns">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <SortTh field="name" label="Campaign" current={sort} dir={dir} sp={linkSp} baseHref="/admin/campaigns" />
                  <th className="text-left">Status</th>
                  <th className="text-left">Audience</th>
                  <th className="text-left">Progress</th>
                  <th className="text-left">Segments per SMS</th>
                  <SortTh field="created" label="Created" current={sort} dir={dir} sp={linkSp} baseHref="/admin/campaigns" />
                  <SortTh field="updated" label="Last activity" current={sort} dir={dir} sp={linkSp} baseHref="/admin/campaigns" />
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {emptyTable ? (
                  <AdminTableEmpty
                    colSpan={COLS}
                    title={CAMPAIGNS_EMPTY.title}
                    body={CAMPAIGN_SCREENS.compose ? CAMPAIGNS_EMPTY.bodyComposeOn : CAMPAIGNS_EMPTY.bodyComposeOff}
                  />
                ) : rows.length === 0 ? (
                  <AdminTableEmpty
                    colSpan={COLS}
                    title={noMatch?.title ?? CAMPAIGNS_EMPTY.title}
                    body={noMatch?.body}
                    action={<a href={campaignsHref(sp, { status: null })} className="btn btn-ghost btn-sm">{CAMPAIGNS_SHOW_ALL}</a>}
                  />
                ) : (
                  rows.map((c) => <CampaignRow key={c.id} c={c} counts={recipients[c.id] ?? zeroRecipientStatusCounts()} audience={campaignRowAudience(c, reads)} draftHref={draftAddressFor(c, reads)} />)
                )}
              </tbody>
            </table>
          </ScrollX>}
        </AdminCard></div>

        {view !== null && view.result.total > PER_PAGE && <AdminPagination total={view.result.total} page={view.page} baseHref={campaignsHref(sp)} />}
      </AdminBody>
    </>
  );
}
