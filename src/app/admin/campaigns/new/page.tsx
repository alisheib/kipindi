/**
 * /admin/campaigns/new — the SMS campaign composer (U37b: the Message card, the save, the officer's own test send).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: an officer writes a campaign's Swahili message (and, if they
 * want, an English one), saves it as a DRAFT, and sends the saved text to their OWN phone as a test. The audience card
 * (U38b) chooses who it goes to — the contact book, player accounts or both, narrowed on its rail — says it in words, and
 * counts who will receive it NOW by asking the send gate about every number (a forecast: the gate is asked again at
 * send). Nothing here starts a campaign.
 * ⭐ U40b · THE FOURTH CARD, "Confirm", under the Test card (`campaign-confirm.tsx`) — and ⛔ THIS PAGE COUNTS NOTHING FOR
 * IT (the U40b review's MAJOR): the card reads only the composer's own state at rest, and its trigger ASKS for the
 * confirmation's view on the press (`confirm-view-actions.ts` — the stored role; OD65's count alone and OD67's typed tier
 * for a viewer who may not read a number; the estimate's money as words for a money reader only), so no render — no rail
 * pick, save, test or "Count again" — waits on a confirmation's walk. CONFIRMED sends nothing: Start is a separate act on
 * the campaign's own page. (This page's one Suspense stays the audience count's — `test:campaign-audience` B5.)
 * ⭐ U38b · THE COUNT IS KEYED BY THE FILTER (`countKey`, its ONE key): a new filter mounts a new Suspense, which shows its
 * own fallback — never the old numbers under the new words. The card is an async SERVER component that renders the
 * view-model and nothing else; a saved draft opened with no audience in its address is sent to the address that carries
 * its stored filter (`canonicalHref`), so the rail and the window control start from it.
 *
 * ⭐ ONE COUNTER, THE RENDERER'S (U37a): the live counter, the server's save and the test send all size and render
 * through `campaign-template.ts` — the worst-case name, the source line or its reserved room, and the statutory footer.
 * ⛔ OD45: the sender is the server's `SMS_SENDER_ID`, a line of text, never a control. ⛔ OD24: no money on this page.
 * ⛔ X14: a test is refused `live_sends_closed` while the ONE live switch (`marketing.sms.live`) is absent — before any
 * token, row or transport call; opening it is the owner's act (G1).
 * ⭐ THE GATES: the section layout's `AdminSectionGate` ("SMS campaigns", growth), and this page's OWN `AdminPageGate`
 * below — a flight request can skip a layout, never the page. Both actions re-check (`softRequireStaff`).
 * ⭐ THE CARDS ARE RENDERED HERE (their chrome reaches the store, which a client module must never import) and their
 * bodies share one client state (`ComposerProvider`). A draft that cannot be read is `AdminLoadError`; a draft that
 * does not exist is said in words with one way on — never a blank form posing as the draft that was asked for.
 *
 * Growth domain (`roles.ts`, the `/admin/campaigns` prefix).
 */
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Callout } from "@/components/ui/callout";
import { CAMPAIGN_SCREEN_ROUTES } from "@/lib/marketing/campaign-status";
import { loadComposer } from "./composer-loader";
import type { ComposeParams, ComposeView } from "./composer-loader";
import { ComposerProvider, ComposerMessage, ComposerAudience, ComposerTest } from "./composer-client";
import { CampaignConfirm } from "./campaign-confirm";
import { AudienceRail } from "./audience-rail";
import { AudienceSplitCard, AudienceCountFallback } from "./audience-split-card";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import {
  COMPOSE_AUDIENCE_TITLE, COMPOSE_CONFIRM_TITLE, COMPOSE_MESSAGE_SW, COMPOSE_MESSAGE_TITLE, COMPOSE_MISSING, COMPOSE_START,
  COMPOSE_TEST_TITLE,
} from "./composer-copy";

export const metadata = { title: "New SMS campaign · Admin" };
export const dynamic = "force-dynamic";

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. ⛔ One `return`, one self-closing child, a
 *  literal title: `admin-section-gate.test.mjs` §0b′ refuses anything else. */
export default async function AdminCampaignComposePage(props: { searchParams: Promise<ComposeParams> }) {
  return <AdminPageGate title="New SMS campaign"><AdminComposeContent searchParams={props.searchParams} /></AdminPageGate>;
}

async function AdminComposeContent({ searchParams }: { searchParams: Promise<ComposeParams> }) {
  const sp = await searchParams;
  let view: ComposeView | null = null;
  try {
    view = await loadComposer(sp);
  } catch (err) {
    // ⛔ A failed read is AdminLoadError below — never a blank form.
    console.error("[admin/campaigns/new] read failed:", (err as Error)?.message ?? err);
  }
  // ⭐ U38b · a saved DRAFT opened with no audience in its address goes to the address that carries its stored filter — so
  // the rail's links and the window control, which build from the address, start from the audience the draft holds.
  // ⛔ Outside the try: a redirect is never swallowed as a failed read.
  if (view !== null && view.kind === "ready" && view.audience.canonicalHref !== null) redirect(view.audience.canonicalHref as never);
  // ⛔ OD65 · the keyed fallback is THIS viewer's: the count alone's ghost for a viewer who may not read a number (failing
  // closed — an unreadable cell is a masked one), the figures' ghost for a reader. The card itself asks the cell again.
  const reads = await viewerReadsContacts().catch(() => false);

  return (
    <>
      {/* The gloss is COPIED, never invented (§5.13): "Kampeni mpya" sits beside "New campaign" on /admin/invites. */}
      <AdminPageHead title="New SMS campaign" sw="Kampeni mpya" />
      <AdminBody>
        {view === null ? (
          <div data-block="compose-message"><AdminCard><AdminLoadError what="this SMS campaign" /></AdminCard></div>
        ) : view.kind === "missing" ? (
          <div data-block="compose-message">
            <AdminCard>
              <div className="space-y-3">
                <Callout tone="warning" role="note">
                  <span className="block" data-compose-missing>{COMPOSE_MISSING}</span>
                </Callout>
                <Link href={CAMPAIGN_SCREEN_ROUTES.compose as Route} className="btn btn-ghost btn-sm" data-compose-start>{COMPOSE_START}</Link>
              </div>
            </AdminCard>
          </div>
        ) : (
          <ComposerProvider view={view}>
            <div data-block="compose-message">
              <AdminCard title={COMPOSE_MESSAGE_TITLE} sw={COMPOSE_MESSAGE_SW}><ComposerMessage /></AdminCard>
            </div>
            <div data-block="compose-audience">
              <AdminCard title={COMPOSE_AUDIENCE_TITLE}>
                {/* ⭐ U38b · the rail and the count are SERVER children handed to the card's client body. The Suspense is
                    KEYED by the filter's ONE key: a new filter mounts a new boundary, which shows its own fallback — never
                    the old numbers under the new words. No key, no count: nothing chosen, refused or hidden is counted. */}
                <ComposerAudience
                  rail={view.readOnly ? null : <AudienceRail sp={sp} />}
                  count={view.audience.countKey === null ? null : (
                    <Suspense key={view.audience.countKey} fallback={<AudienceCountFallback countOnly={!reads} />}>
                      <AudienceSplitCard countKey={view.audience.countKey} />
                    </Suspense>
                  )}
                />
              </AdminCard>
            </div>
            <div data-block="compose-test">
              <AdminCard title={COMPOSE_TEST_TITLE}><ComposerTest /></AdminCard>
            </div>
            {/* ⭐ U40b · the fourth card: the composer's own state at rest, its view asked for on the press — never here. */}
            <div data-block="compose-confirm">
              <AdminCard title={COMPOSE_CONFIRM_TITLE}><CampaignConfirm /></AdminCard>
            </div>
          </ComposerProvider>
        )}
      </AdminBody>
    </>
  );
}
