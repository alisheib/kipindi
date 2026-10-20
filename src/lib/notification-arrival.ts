/** The bell lists only the newest thirty rows, so an unread count from that list
 * cannot identify a new arrival once it is full. Keep the previous page's IDs
 * and its newest creation time. A newly exposed older row after a dismissal is
 * not an arrival, and neither is a changed read state or a reordered page. */
type ArrivalRow = { id: string; readAt: string | null; createdAt: string };

export type NotificationArrivalState = {
  ids: ReadonlySet<string>;
  unreadIds: ReadonlySet<string>;
  newestAtMs: number;
  unreadCount: number;
};

export function advanceNotificationArrival(
  previous: NotificationArrivalState | null,
  rows: readonly ArrivalRow[],
  unreadCount: number,
): { state: NotificationArrivalState; ring: boolean } {
  const ids = new Set<string>();
  const unreadIds = new Set<string>();
  let newestAtMs = previous?.newestAtMs ?? -Infinity;
  let ring = false;
  // A read and a new arrival can cancel in the full unread total. The rows
  // still show the read transition, so retain their prior unread IDs.
  const readTransition = previous !== null && rows.some((row) =>
    !!row.readAt && previous.unreadIds.has(row.id));
  for (const row of rows) {
    ids.add(row.id);
    if (!row.readAt) unreadIds.add(row.id);
    const createdAtMs = Date.parse(row.createdAt);
    // A new ID with the same timestamp as the old head is still an arrival when
    // the full unread total rises or a visible read cancels its rise. Count
    // alone is insufficient: an existing row could change read state.
    if (previous && !row.readAt && !previous.ids.has(row.id)
      && (createdAtMs > previous.newestAtMs
        || (createdAtMs === previous.newestAtMs
          && (unreadCount > previous.unreadCount || readTransition)))) {
      ring = true;
    }
    if (Number.isFinite(createdAtMs)) newestAtMs = Math.max(newestAtMs, createdAtMs);
  }
  return { state: { ids, unreadIds, newestAtMs, unreadCount }, ring };
}
