"use client";

/**
 * U47b-2 (the review's MINOR 8) · THE PAGE'S ONE LIVE REGION — what a screen reader is told when the campaign's STATUS changes.
 *
 * The first build marked its callouts `role="status"`, and they come and go (and rewrite themselves every two seconds while a
 * step answers): a region that mounts, unmounts and changes under a listener is read out every time. One region, always
 * mounted, polite, saying the headline when the status moves — the campaign started, paused, finished — and nothing else.
 * ⛔ NEVER ON MOUNT (the first paint is the page, not news) and never for a view that changed in any way but its status.
 * The decision is `announcementFor` (`live-decide.ts`); this is the one hook that holds the last status, so V15 runs it.
 *
 * Guard: `npm run test:campaign-visuals` §page (V15) · Red: `npm run red:campaign-visuals`.
 */
import { useEffect, useRef, useState } from "react";
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import { announcementFor } from "./live-decide";

export function useStatusAnnouncement(view: Pick<CampaignLiveView, "status" | "headline" | "stopSentence">): string {
  const [said, setSaid] = useState("");
  const previous = useRef<string>(view.status);
  useEffect(() => {
    const next = announcementFor(previous.current, view);
    previous.current = view.status;
    if (next !== null) setSaid(next);
    // The status is the trigger; the words are read when it moves (the headline of the render that moved it).
  }, [view.status]);
  return said;
}
