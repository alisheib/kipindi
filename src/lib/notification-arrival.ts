/** The bell lists only the newest thirty rows, so an unread count from that list
 * cannot identify a new arrival once it is full. Keep the previous page's IDs
 * and its newest creation time. A newly exposed older row after a dismissal is
 * not an arrival, and neither is a changed read state or a reordered page. */
type ArrivalRow = { id: string; readAt: string | null; createdAt: string };

export type NotificationArrivalState = {
  ids: ReadonlySet<string>;
  newestAtMs: number;
};

export function advanceNotificationArrival(
  previous: NotificationArrivalState | null,
  rows: readonly ArrivalRow[],
): { state: NotificationArrivalState; ring: boolean } {
  const ids = new Set<string>();
  let newestAtMs = previous?.newestAtMs ?? -Infinity;
  let ring = false;
  for (const row of rows) {
    ids.add(row.id);
    const createdAtMs = Date.parse(row.createdAt);
    if (previous && !row.readAt && !previous.ids.has(row.id) && createdAtMs > previous.newestAtMs) {
      ring = true;
    }
    if (Number.isFinite(createdAtMs)) newestAtMs = Math.max(newestAtMs, createdAtMs);
  }
  return { state: { ids, newestAtMs }, ring };
}
