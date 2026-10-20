/** The bell lists only the newest thirty rows, so an unread count from that list
 * cannot identify a new arrival once it is full. Keep the previous page's IDs
 * and its newest creation time. A newly exposed older row after a dismissal is
 * not an arrival, and neither is a changed read state or a reordered page. */
type ArrivalRow = { id: string; readAt: string | null; createdAt: string };

export type NotificationArrivalState = {
  ids: ReadonlySet<string>;
  newestAtMs: number;
  unreadCount: number;
};

export function advanceNotificationArrival(
  previous: NotificationArrivalState | null,
  rows: readonly ArrivalRow[],
  unreadCount: number,
): { state: NotificationArrivalState; ring: boolean } {
  const ids = new Set<string>();
  let newestAtMs = previous?.newestAtMs ?? -Infinity;
  let ring = false;
  for (const row of rows) {
    ids.add(row.id);
    const createdAtMs = Date.parse(row.createdAt);
    // A new ID with the same timestamp as the old head is still an arrival when
    // the server's full unread total rises. Count alone is insufficient: an
    // existing row could change read state without being a new notification.
    if (previous && !row.readAt && !previous.ids.has(row.id)
      && (createdAtMs > previous.newestAtMs
        || (createdAtMs === previous.newestAtMs && unreadCount > previous.unreadCount))) {
      ring = true;
    }
    if (Number.isFinite(createdAtMs)) newestAtMs = Math.max(newestAtMs, createdAtMs);
  }
  return { state: { ids, newestAtMs, unreadCount }, ring };
}
