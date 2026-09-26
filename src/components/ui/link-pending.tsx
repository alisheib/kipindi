"use client";

import { useLinkStatus } from "next/link";

/**
 * ⭐ A LINK THAT IS STILL NAVIGATING SAYS SO — the kit's one pending mark, placed inside every
 * kit `<Link>` that changes the page: the section rail (`tabs.tsx`), the sortable header
 * (`admin-sort.tsx`), the pager (`pagination.tsx`) and the filter chip (`filter-pill.tsx`) — and,
 * as `PendingMark`, on the date filter's Custom chip, whose Apply navigates from code.
 *
 * 🔴 WHY IT EXISTS (house-bots build step 10, the owner's ask of 2026-09-26: *"when jumoing from
 * tba to anothe rmake sur eu ahve th erigh tloading states … to not to think it sstucl"*). Every one
 * of those controls changes ONLY the query of the page it sits on, and the page's `loading.tsx` does
 * not take over for a query-only change (measured on a served build by `qa:nav-pending`): the old
 * panel stood unchanged, with nothing on screen saying the press had landed, for as long as the
 * server took to answer. On a slow line that reads as a frozen page.
 *
 * ⭐ WHAT IT PAINTS. While the navigation is outstanding — the router's own answer, `useLinkStatus`
 * for a link or the caller's `useTransition` for a navigation made in code, never a timer or a guess
 * — it renders one empty, `aria-hidden` span that `globals.css` draws as a 2px travelling bar along
 * the bottom of the pressed control, after a short delay so a fast answer never flickers. The same
 * attribute is what the CSS keys on to dim what is about to be replaced: the panels after a section
 * rail, and the rows of the card whose header, pager or chip was pressed. Nothing else changes, and
 * nothing is announced: the new content arriving is the announcement, as it was before.
 *
 * ⛔ IT RENDERS NOTHING AT REST. A control's markup is byte-identical until it is pressed, so no
 * geometry, tap-target or snapshot gate can see a difference, and the span is absolutely placed
 * (out of flow, so it takes no flex gap) when it does exist. The control it sits in becomes the
 * containing block only for that moment, in CSS, so no guarded class string was edited to add it.
 * ⛔ AND IT CARRIES NO WORDS, so the one mark serves the English-only console and every
 * translated player list alike.
 */
export function PendingMark({ on }: { on: boolean }) {
  return on ? <span data-link-pending="" aria-hidden="true" className="link-pending" /> : null;
}

/** The mark for a `<Link>`: render it as the link's own child, where `useLinkStatus` can see the link. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <PendingMark on={pending} />;
}
