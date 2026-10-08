/**
 * /admin/campaigns/[id] — the LIVE SMS campaign page (U47b-2: the status, the five controls, the figures, and the driver
 * that steps a campaign while this page is open).
 *
 * WHAT THIS PAGE IS, so nobody reads more into it: the one place a campaign is started, paused, resumed, stopped or copied,
 * and the place it is WATCHED. A confirmed campaign sends nothing until an officer presses Start here and keeps this page
 * open: sending continues only while a page like this one is open (`live-driver.tsx` calls the step every few seconds). The
 * figures — people waiting, handed over, failed, not sent and why, no answer — are the server's, from ONE groupBy over the
 * campaign's rows (`campaign-live.ts`); nothing on this page counts, and nothing moves on a timer (OD34).
 * ⭐ THE FIRST RENDER AND EVERY UPDATE ARE ONE FUNCTION (`campaignLiveView`), asked with the viewer the officer's STORED role
 * makes (`liveViewerFor`): E23's floor, OD24's money and OD66's audience are decided there, once, for the page and for the
 * step and the poll alike. A role that may only LOOK sees everything it may see, every control disabled with its reason,
 * and a page that updates by itself.
 * ⭐ THE GATES: the section layout's `AdminSectionGate` ("SMS campaigns", growth), and this page's OWN `AdminPageGate`
 * below — a flight request can skip a layout, never the page. All seven actions re-check (`softRequireStaff`,
 * `softCheckStaff`, `softViewStaff`), and each service refuses a role that may not act again.
 * ⭐ A DRAFT HAS NO PAGE HERE: it is written in the composer, so a draft's id opened at this address goes there — to the
 * composer's own canonical address for the viewer (`draftAddressFor`, STD-1). A campaign that is not there is said in words,
 * with one way on — never a blank page; a read that fails is `AdminLoadError`, never a zero.
 * ⛔ NO MONEY on this page but the Start dialog's, and only for a viewer who may read it (OD24). ⛔ No phone number anywhere
 * (§5.14). ⛔ NO SMS LEAVES FROM A RENDER: the only way to the wire is the engine's, through the step.
 *
 * Growth domain (`roles.ts`, the `/admin/campaigns` prefix).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminCrumbLabel } from "@/components/admin/admin-crumbs";
import { Callout } from "@/components/ui/callout";
import { campaignsHref } from "../campaigns-rail";
import { CAMPAIGNS_UNTITLED } from "../campaigns-copy";
import { loadLive } from "./live-loader";
import type { LiveLoad } from "./live-loader";
import { LiveControls, LiveProgress, LiveProvider, LiveStatus, LiveWhenListed } from "./live-client";
import { LIVE_BACK, LIVE_MISSING } from "./live-copy";

export const metadata = { title: "SMS campaign · Admin" };
export const dynamic = "force-dynamic";

type LivePageProps = { params: Promise<{ id: string }> };

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. ⛔ One `return`, one
 *  self-closing child, a literal title: `admin-section-gate.test.mjs` §0b′ refuses anything else. The last URL segment here
 *  is a campaign id (C7-SPEC ruling 301), which is why the title is explicit. */
export default async function AdminCampaignLivePage(props: LivePageProps) {
  return <AdminPageGate title="SMS campaign"><AdminCampaignLiveContent params={props.params} /></AdminPageGate>;
}

async function AdminCampaignLiveContent({ params }: LivePageProps) {
  const { id } = await params;
  let load: LiveLoad | null = null;
  try {
    load = await loadLive(id);
  } catch (err) {
    // ⛔ A failed read is AdminLoadError below — never a zero, and never "not found". The log line names the error's TYPE alone.
    console.error("[admin/campaigns/[id]] read failed:", (err as Error)?.name ?? "error");
  }
  // ⛔ Outside the try: a redirect is never swallowed as a failed read. ⭐ To the composer's own canonical address (STD-1).
  if (load !== null && load.kind === "draft") redirect(load.href as never);

  return (
    <>
      {/* The gloss is COPIED, never invented (§5.13): "Kampeni" is the list's own. ⛔ A literal, like the gate's title:
          the ghost draws the same head, so nothing above the first card can move when the page swaps in. */}
      <AdminPageHead title="SMS campaign" sw="Kampeni" />
      <AdminBody>
        {load === null ? (
          <div data-block="live-status"><AdminCard><AdminLoadError what="this SMS campaign" /></AdminCard></div>
        ) : load.kind === "ready" ? (
          <LiveProvider initial={load.view} mayAct={load.mayAct}>
            {/* The trail reads the campaign's name, never its `cmp_…` id (the review's NIT). */}
            <AdminCrumbLabel segment={load.view.id} label={load.view.name.trim() === "" ? CAMPAIGNS_UNTITLED : load.view.name} />
            <div data-block="live-status"><AdminCard><LiveStatus /></AdminCard></div>
            <div data-block="live-controls"><AdminCard><LiveControls /></AdminCard></div>
            <LiveWhenListed>
              <div data-block="live-progress"><AdminCard><LiveProgress /></AdminCard></div>
            </LiveWhenListed>
          </LiveProvider>
        ) : (
          // A campaign that is not there. (A draft never gets here: it was redirected to the composer above.)
          <div data-block="live-status">
            <AdminCard>
              <div className="space-y-3">
                <Callout tone="warning" role="note">
                  <span className="block" data-live-missing>{LIVE_MISSING}</span>
                </Callout>
                <Link href={campaignsHref({}) as Route} className="btn btn-ghost btn-sm" data-live-back>{LIVE_BACK}</Link>
              </div>
            </AdminCard>
          </div>
        )}
      </AdminBody>
    </>
  );
}
