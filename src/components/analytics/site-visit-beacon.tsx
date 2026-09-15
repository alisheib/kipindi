"use client";

/**
 * SiteVisitBeacon — our own, first-party visit counter. Runs for EVERY visitor; no consent is asked because it
 * collects nothing that identifies anyone (Ali, 2026-09-15: "count all, full detail with OK").
 *
 * On each page view it sends `visitPayload(...)` to `/api/pv` with `navigator.sendBeacon`:
 *   · no cookie, no browser storage, no identifier — the payload is six fields (`src/lib/site-visits.ts`);
 *   · the first page of a document load is the visit's ENTRY and carries the referrer HOST and campaign tags;
 *     an in-app navigation is a page view only;
 *   · automation (HeadlessChrome/Playwright) is not counted — the QA fleet must not become traffic;
 *   · `sendBeacon` is same-origin and survives navigation; `GoogleTag`'s transport guard passes it through untouched,
 *     because `/api/pv` is not an analytics host.
 * A query-only change (a tab, a filter) is the same page and is not a new view.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { visitPayload } from "@/lib/site-visits";

export const SITE_VISIT_ENDPOINT = "/api/pv";

export function SiteVisitBeacon() {
  const pathname = usePathname();
  const entered = useRef(false);

  useEffect(() => {
    if (/HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;
    const entry = !entered.current;
    entered.current = true;
    const payload = visitPayload(window.location.href, entry ? document.referrer : "", entry);
    if (!payload || typeof navigator.sendBeacon !== "function") return;
    try {
      navigator.sendBeacon(SITE_VISIT_ENDPOINT, JSON.stringify(payload));
    } catch { /* a lost count is not worth an error */ }
  }, [pathname]);

  return null;
}
