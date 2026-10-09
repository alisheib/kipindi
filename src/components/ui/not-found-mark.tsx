"use client";

/**
 * THE NOT-FOUND MARK — an empty, hidden span that says "this is a not-found page" to what stands outside the page
 * (2026-10-09, the Vodacom visual pass round 4, R4-J). `lib/not-found-mark.ts` has the why and the readers.
 *
 * ⭐ The span names the path it was drawn for (`data-path`, round 5, review F4), so the answer is about the page being
 * drawn, never the one being left: while the router draws the next page the old span is still in the document, and its
 * path is not the new one. It is in the server's HTML wherever the server draws the not-found page itself (an address no
 * route matches), so that document load is answered before any script runs; a record found missing inside a loading
 * boundary is drawn by the scripts (`lib/not-found-mark.ts` has why).
 * ⭐ ARRIVING IS ANNOUNCED IN A LAYOUT EFFECT: it runs in the commit that inserts the span, and the chrome's re-render it
 * causes is flushed before the browser paints — so no painted frame shows the not-found page with a tab lit. Re-run when
 * the path changes, should React keep this span across a move from one not-found address to another.
 * ⭐ GOING IS ANNOUNCED ONCE THE COMMIT IS DONE, BEFORE ITS PAINT (round 5's follow-up, R5-H · G-3 — the journey flag's
 * phases): the layout cleanup runs while the span is still there and would read the old path, so it queues the
 * announcement for after the commit (`announceNotFoundAfterCommit`). It was a passive cleanup, which a transition's
 * commit runs after the paint: a refresh that found the record at the same address painted one frame of "not found".
 * ⛔ Rendered by the shared not-found view only (`components/ui/not-found-view.tsx`), so every not-found answer carries
 * it and no other page can: `test:visual-pass-r4j` §5 holds both.
 */
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { NOT_FOUND_MARK, announceNotFound, announceNotFoundAfterCommit } from "@/lib/not-found-mark";

export function NotFoundMark() {
  const path = usePathname() ?? "";
  useLayoutEffect(() => { announceNotFound(); }, [path]);
  useLayoutEffect(() => announceNotFoundAfterCommit, []);
  return <span hidden id={NOT_FOUND_MARK} data-path={path} />;
}
