/**
 * /admin/campaigns/new — the SMS campaign composer (U37b: the Message card, the save, the officer's own test send).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: an officer writes a campaign's Swahili message (and, if they
 * want, an English one), saves it as a DRAFT, and sends the saved text to their OWN phone as a test. Nothing here
 * counts an audience, prices a send, confirms or starts a campaign: the audience card says in words which contacts the
 * draft is addressed to (U38 adds its controls and its counts), and the estimate and the confirmation are U39 and U40.
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
import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Callout } from "@/components/ui/callout";
import { CAMPAIGN_SCREEN_ROUTES } from "@/lib/marketing/campaign-status";
import { loadComposer } from "./composer-loader";
import type { ComposeParams, ComposeView } from "./composer-loader";
import { ComposerProvider, ComposerMessage, ComposerAudience, ComposerTest } from "./composer-client";
import {
  COMPOSE_AUDIENCE_TITLE, COMPOSE_MESSAGE_SW, COMPOSE_MESSAGE_TITLE, COMPOSE_MISSING, COMPOSE_START, COMPOSE_TEST_TITLE,
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
              <AdminCard title={COMPOSE_AUDIENCE_TITLE}><ComposerAudience /></AdminCard>
            </div>
            <div data-block="compose-test">
              <AdminCard title={COMPOSE_TEST_TITLE}><ComposerTest /></AdminCard>
            </div>
          </ComposerProvider>
        )}
      </AdminBody>
    </>
  );
}
