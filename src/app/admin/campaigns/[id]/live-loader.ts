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
 * the officer there (`campaignDraftHref`). Nothing about the draft is rendered.
 * ⛔ IT DECIDES WHAT THE PAGE SHOWS, NEVER WHETHER IT MAY BE SHOWN: the page's own `AdminPageGate` refuses the viewer first.
 * SERVER-ONLY (the store, the grant table).
 *
 * Guard: `npm run test:campaign-visuals` §page (V11) · Red: `npm run red:campaign-visuals`.
 */
import { currentSession } from "@/lib/server/auth-service";
import { campaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { CampaignLiveView, LiveViewer } from "@/lib/server/marketing/campaign-live";
import { liveViewerFor } from "./live-viewer";

/** What the first render shows. `ready` carries whether the viewer may act (the driver's mode, and the controls). */
export type LiveLoad =
  | { kind: "ready"; view: CampaignLiveView; mayAct: boolean }
  | { kind: "draft" }
  | { kind: "missing" };

/** Every read the load makes — swappable for the suite's stand-ins; production passes none. */
export type LiveLoadDeps = {
  /** The signed-in officer's id, or null (the page's gate has refused such a viewer already). */
  userId: () => Promise<string | null>;
  viewer: (userId: string | null) => Promise<LiveViewer>;
  view: (id: string, viewer: LiveViewer) => Promise<CampaignLiveView | null>;
};

/** Frozen: production's reads — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_LOAD_DEPS: Readonly<LiveLoadDeps> = Object.freeze({
  userId: async () => (await currentSession())?.userId ?? null,
  viewer: (userId: string | null) => liveViewerFor(userId),
  view: (id: string, viewer: LiveViewer) => campaignLiveView(id, viewer),
});

/** ⭐ THE LOAD — see the header. A campaign id is text anyone can put in an address: it is only ever looked up. */
export async function loadLive(campaignId: string, deps: LiveLoadDeps = LIVE_LOAD_DEPS): Promise<LiveLoad> {
  const viewer = await deps.viewer(await deps.userId());
  const view = await deps.view(typeof campaignId === "string" ? campaignId : "", viewer);
  if (view === null) return { kind: "missing" };
  if (view.status === "DRAFT") return { kind: "draft" };
  return { kind: "ready", view, mayAct: viewer.mayAct };
}
