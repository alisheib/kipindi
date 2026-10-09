"use client";

/**
 * THE NOT-FOUND MARK — an empty, hidden span that says "this is a not-found page" to what stands outside the page
 * (2026-10-09, the Vodacom visual pass round 4, R4-J). `lib/not-found-mark.ts` has the why and the readers.
 *
 * ⭐ The span is in the server's HTML, so a document load is answered before any script runs; the effect announces the
 * mark when it mounts on a move inside the app, and again when it goes — the cleanup of an unmounted mark runs after
 * React has taken its span out of the page, so the answer read then is already "no".
 * ⛔ Rendered by the shared not-found view only (`components/ui/not-found-view.tsx`), so every not-found answer carries
 * it and no other page can: `test:visual-pass-r4j` §5 holds both.
 */
import { useEffect } from "react";
import { NOT_FOUND_MARK, announceNotFound } from "@/lib/not-found-mark";

export function NotFoundMark() {
  useEffect(() => {
    announceNotFound();
    return announceNotFound;
  }, []);
  return <span hidden id={NOT_FOUND_MARK} />;
}
