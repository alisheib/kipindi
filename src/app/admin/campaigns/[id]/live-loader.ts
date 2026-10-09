/**
 * U47b-2 · WHAT THE LIVE PAGE'S FIRST RENDER IS HANDED — the campaign as the viewer may see it, or why there is none
 * (ENGINE-SPEC §4.15 decisions 2 and 5, and the Files table's "missing → words + Back to SMS campaigns").
 *
 * ⭐ ONE VIEW-MODEL FOR THE FIRST RENDER AND EVERY CALL AFTER IT: `campaignLiveView`, asked with the viewer the officer's
 * STORED role makes (`liveViewerFor`, read once, failing closed) — the same function the step and the poll answer from, so
 * the page's first paint and its tenth update can never disagree about a figure, a sentence or a control.
 * ⛔ A READ THAT FAILS THROWS (the page says "Couldn't load this SMS campaign" — never a zero, never "not found"): only a
 * campaign that is truly not there is `missing`.
 * ⛔ A DRAFT HAS NO PAGE OF ITS OWN: it is written in the composer, so it is told apart here (`draft`) and the page sends
 * the officer there — to the composer's own canonical address for this viewer (`draftAddressFor`, STD-1: the one that carries
 * the stored audience, so the composer's page never redirects it again), the bare `?draft=` only when none can be built.
 * Nothing about the draft is rendered.
 * ⛔ IT DECIDES WHAT THE PAGE SHOWS, NEVER WHETHER IT MAY BE SHOWN: the page's own `AdminPageGate` refuses the viewer first.
 * SERVER-ONLY (the store, the grant table).
 *
 * Guard: `npm run test:campaign-visuals` §page (V11) · Red: `npm run red:campaign-visuals`.
 */
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { campaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { CampaignLiveView, LiveViewer } from "@/lib/server/marketing/campaign-live";
import { campaignDraftHref } from "@/lib/marketing/campaign-status";
import { draftAddressFor } from "@/app/admin/campaigns/new/composer-loader";
import { liveViewerFor } from "./live-viewer";

/** What the first render shows. `ready` carries whether the viewer may act (the driver's mode, and the controls). A `draft`
 *  carries the composer's own address for it (STD-1, the review's NIT) — where the page sends the officer. */
export type LiveLoad =
  | { kind: "ready"; view: CampaignLiveView; mayAct: boolean }
  | { kind: "draft"; href: string }
  | { kind: "missing" };

/** Every read the load makes — swappable for the suite's stand-ins; production passes none. */
export type LiveLoadDeps = {
  /** The signed-in officer's id, or null (the page's gate has refused such a viewer already). */
  userId: () => Promise<string | null>;
  viewer: (userId: string | null) => Promise<LiveViewer>;
  view: (id: string, viewer: LiveViewer) => Promise<CampaignLiveView | null>;
  /** A draft's address for this viewer — the composer's canonical one (`draftAddressFor`); the bare `?draft=` when it cannot be built. */
  draftAddress: (id: string, reads: boolean) => Promise<string>;
};

/** Frozen: production's reads — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_LOAD_DEPS: Readonly<LiveLoadDeps> = Object.freeze({
  userId: async () => (await currentSession())?.userId ?? null,
  viewer: (userId: string | null) => liveViewerFor(userId),
  view: (id: string, viewer: LiveViewer) => campaignLiveView(id, viewer),
  draftAddress: async (id: string, reads: boolean) => {
    try {
      const row = await Promise.resolve(db.smsCampaign.find(id));
      return row === null ? campaignDraftHref(id) : draftAddressFor(row, reads);
    } catch {
      return campaignDraftHref(id);
    }
  },
});

/** ⭐ THE LOAD — see the header. A campaign id is text anyone can put in an address: it is only ever looked up. */
export async function loadLive(campaignId: string, deps: LiveLoadDeps = LIVE_LOAD_DEPS): Promise<LiveLoad> {
  const viewer = await deps.viewer(await deps.userId());
  const id = typeof campaignId === "string" ? campaignId : "";
  const view = await deps.view(id, viewer);
  if (view === null) return { kind: "missing" };
  if (view.status === "DRAFT") {
    // ⛔ The address can never fail the load: a draft that cannot be addressed canonically is sent to the bare address.
    let href: string;
    try {
      href = await deps.draftAddress(id, viewer.reads === true);
    } catch {
      href = campaignDraftHref(id);
    }
    return { kind: "draft", href: typeof href === "string" && href !== "" ? href : campaignDraftHref(id) };
  }
  return { kind: "ready", view, mayAct: viewer.mayAct };
}
