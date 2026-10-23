/**
 * ⭐ IS THIS BELL ROW A MILLIONEA NOTICE? (MASWALI-BUILD FLOW 16b; Ali's ruling on FL.5, 2026-10-23: "two-line Millionea
 * titles").
 *
 * The classic bell draws a title on one truncated line. A Millionea title leads with its event and ends with its week
 * (FLOW 15, `millioneaTitle`), and at 360 the longest (an objection decision, in Swahili and English) wraps to three
 * lines. So a Millionea row's title takes up to THREE lines (`line-clamp-3`, the lead's pick); every other row stays one
 * line, as it was.
 *
 * The row's link is the notice's key (`millioneaNoticeHref`, notification-service.ts): a player's Millionea notices open
 * /millionea…, and an officer's filed objection opens the integrity queue's anchor. Pure: it reads the link alone.
 */
export function isMillioneaNoticeHref(href: string | null | undefined): boolean {
  if (typeof href !== "string") return false;
  return href === "/millionea" || href.startsWith("/millionea/") || href.startsWith("/millionea#")
    || href.startsWith("/admin/maswali/integrity#objection-");
}
