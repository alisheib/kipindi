"use client";

/**
 * U47b-2 · THE FIVE PRESSES' STATE — Start, Pause, Resume, Stop, Make a copy: which are in flight, the last refusal, and the
 * link a copy leaves behind (ENGINE-SPEC §4.15 decision 4). A hook with its doors handed in (`calls`, `toast`, `navigate`), so
 * `test:campaign-visuals` V14 runs the REAL hook on a minimal hooks host — the wiring is executed, not grepped.
 *
 * ⭐ PER-CONTROL PENDING (the review's MAJOR): a press in flight disables ITS OWN control and no other. The brake — Stop — is
 * never held off by a Pause that has not answered; the single `acting` flag the first build used held every control, so an
 * officer who pressed Pause could not press Stop until it answered. (Next 16 still sends the actions one at a time, in the
 * order they were pressed; what the page owes is that the officer CAN press, and that no press waits behind the driver's step —
 * the step is a `fetch` now.)
 * ⛔ NO DOUBLE PRESS: a control whose press is in flight answers no second click. The guard is a REF, not state — two clicks
 * in one tick both read the same render's state, and a state-only guard lets both through.
 * ⛔ A press that landed says so (the toast — `toastFor`: a warning stays until dismissed), a refusal stays beside the controls
 * until the next press (`refusal`, cleared when ANY press starts), and an act that threw is `unfinished` — it may or may not
 * have happened, so the page asks for the campaign and never offers a blind retry.
 * ⭐ MAKE A COPY never takes a DRIVING tab away (the review's MINOR 2): the new draft is a link (`copyLink`) for a new tab.
 *
 * Guard: `npm run test:campaign-visuals` §page (V14) · Red: `npm run red:campaign-visuals`.
 */
import { useCallback, useRef, useState } from "react";
import { runAdminAction } from "@/lib/client/run-admin-action";
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { DriverMode } from "./live-driver";
import type { LiveActAnswer } from "./live-run";
import { LIVE_ACT_UNFINISHED_NO_VIEW } from "./live-copy";
import { NO_PENDING, settlePress } from "./live-decide";
import type { ActName, Refusal, ToastSpec } from "./live-decide";

/** What the hook is handed: who may press, what the page is doing, and every door it reaches out of itself through. */
export type LivePressHost = {
  id: string;
  /** The server's decision AND the console's act gate (`liveMay`). */
  may: boolean;
  /** The driver's mode NOW — a copy is a link while the page drives. */
  mode: DriverMode;
  calls: Readonly<Record<ActName, (campaignId: string) => Promise<LiveActAnswer>>>;
  setView: (view: CampaignLiveView) => void;
  /** Ask for the campaign at once (an answer that carried none). */
  refresh: () => void;
  toast: (t: ToastSpec) => void;
  navigate: (href: string) => void;
  /** A press has been answered (a dialog closes). */
  onSettled: (act: ActName) => void;
};

export type LivePresses = {
  /** The presses in flight — each disables its own control (`loading`), never another. */
  pending: ReadonlySet<ActName>;
  refusal: Refusal | null;
  /** The new draft's address, while this page keeps sending. */
  copyLink: string | null;
  press: (act: ActName) => void;
};

/** A thrown action comes back from `runAdminAction` as `{ ok: false, error }` — it may or may not have happened, and the page
 *  has no view of the campaign: reload (`LIVE_ACT_UNFINISHED_NO_VIEW`). */
function answerOf(r: LiveActAnswer | { ok: false; error: string }): LiveActAnswer {
  return "error" in r ? { ok: false, reason: "unfinished", message: LIVE_ACT_UNFINISHED_NO_VIEW, view: null, href: null } : r;
}

export function useLivePresses(host: LivePressHost): LivePresses {
  const [pending, setPending] = useState<ReadonlySet<ActName>>(NO_PENDING);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [copyLink, setCopyLink] = useState<string | null>(null);
  const inFlight = useRef<Set<ActName>>(new Set());
  // The latest host, read when an answer LANDS (the mode may have changed while the press was in flight).
  const hostRef = useRef(host);
  hostRef.current = host;

  const press = useCallback((act: ActName) => {
    const h = hostRef.current;
    if (!h.may || inFlight.current.has(act)) return;
    inFlight.current.add(act);
    setPending(new Set(inFlight.current));
    setRefusal(null);
    setCopyLink(null);
    void (async () => {
      try {
        const settled = settlePress(act, answerOf(await runAdminAction(() => hostRef.current.calls[act](hostRef.current.id))), hostRef.current.mode);
        const now = hostRef.current;
        // The answer carries the campaign as it is now; one that could not be read is asked for at once.
        if (settled.view !== null) now.setView(settled.view);
        else now.refresh();
        if (settled.toast !== null) now.toast(settled.toast);
        if (settled.refusal !== null) setRefusal(settled.refusal);
        if (settled.copy !== null) {
          if (settled.copy.kind === "navigate") now.navigate(settled.copy.href);
          else setCopyLink(settled.copy.href);
        }
        now.onSettled(act);
      } finally {
        inFlight.current.delete(act);
        setPending(new Set(inFlight.current));
      }
    })();
  }, []);

  return { pending, refusal, copyLink, press };
}
