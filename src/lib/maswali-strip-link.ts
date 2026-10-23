/**
 * THE FRONT PAGE'S MILLIONEA CARD — WHERE ITS LINK GOES (MASWALI-BUILD S6-SHIP 6; the build lead's ruling of 2026-10-23).
 *
 * ⭐ The card on `/admin` shows a viewer the Millionea alerts meant for them (`millioneaStripAlerts`), and its link names a
 *    page that viewer may open — asked with each target page's own gate question (`viewerMayOpen`), in this order: the
 *    weeks (whose page lists every console alert, so "and N more on the weeks page" is said there alone), then Integrity
 *    (Compliance's alerts), then Pools (Finance's). A viewer who may open none of the three gets no link.
 * ⛔ Before the ruling the card linked every viewer to the weeks and said the rest were "on the weeks page" — a page
 *    Finance and Compliance cannot open. `test:maswali-admin-plain` §9.5 holds the link for each role.
 * Pure: the gate question is handed in.
 */

/** The card's links, in the order they are offered. */
export const MILLIONEA_STRIP_LINKS = [
  { href: "/admin/maswali", label: "Open the weeks", morePlace: "on the weeks page" },
  { href: "/admin/maswali/integrity", label: "Open Integrity", morePlace: null },
  { href: "/admin/maswali/pools", label: "Open Pools", morePlace: null },
] as const;

export type MillioneaStripLink = (typeof MILLIONEA_STRIP_LINKS)[number];

/** The first of the card's pages this viewer may open, or none. Never throws: an answer that cannot be read is a no. */
export async function millioneaStripLink(mayOpen: (path: string) => Promise<boolean>): Promise<MillioneaStripLink | null> {
  for (const link of MILLIONEA_STRIP_LINKS) {
    if (await mayOpen(link.href).catch(() => false)) return link;
  }
  return null;
}

/** The card's last line when it holds more alerts than it shows: where the rest are read is said for the weeks page alone. */
export function millioneaStripMore(count: number, link: MillioneaStripLink | null): string {
  return link?.morePlace ? `and ${count} more ${link.morePlace}` : `and ${count} more`;
}
