/**
 * THE `/notifications` QUERY BAR — the five lenses, the sort, and the result count.
 *
 * ⭐ THIS PAGE'S LENSES WERE ALREADY RIGHT, AND THEY ARE KEPT VERBATIM. Unlike every other route
 * this campaign has touched, its counts were already real and already cross-filtered, its rail
 * already wrapped rather than scrolled (with a note recording that a scroller had hidden the
 * safety lens at 360), and `notification-filters.ts` had already reasoned about overlap in
 * writing. ⛔ Nothing here re-plans that. What was missing was the HOOK, the SEARCH, and a sort
 * that is a sort.
 *
 * ⛔ THE LENSES ARE DELIBERATELY NOT A PARTITION, AND THAT IS DOCUMENTED UPSTREAM. `unread` is a
 * read-state, `money`/`account` are kinds, `cleared` is a visibility — so an unread money row is
 * in two of them at once. `notification-filters.ts` states the one disjointness that IS enforced
 * (*"a money row appearing under two lenses reads as two events"* — `money ∩ account = ∅`, and
 * `all ∩ cleared = ∅`). ⚠️ That is why this route declares NO partition to `qa:player-filters`:
 * declaring a false one would be worse than declaring none, and `qa:count-truth` is what proves
 * these numbers.
 *
 * 🔴 THE SORT WAS A SECOND PILL RAIL, AND THAT IS THE ONE §A5/§7g FAULT HERE. Two `<nav>`s of
 * pills stacked above each other, identical in shape, one filtering and one ORDERING — the same
 * confusion `/proposals` shipped, and exactly what `COMPONENTS §21` and this campaign's bar exist
 * to separate. It is the shared `QuerySort` now, and it gains a direction control it never had.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QueryResultCount,
  QuerySort,
  QueryStrip,
} from "@/components/ui/query-bar";
import type { Dict } from "@/lib/i18n-dict";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_SORTS,
  type NotificationFilter,
  type NotificationSort,
} from "@/lib/notification-filters";

export function NotificationsBar({
  filter,
  sort,
  counts,
  resultCount,
  hrefWith,
  t,
}: {
  filter: NotificationFilter;
  sort: NotificationSort;
  counts: Record<NotificationFilter, number>;
  resultCount: number;
  /** ⛔ The page's own builder, passed in — one URL grammar, not a second one written here. */
  hrefWith: (next: Partial<{ filter: NotificationFilter; sort: NotificationSort; page: number }>) => string;
  t: Dict;
}) {
  const FILTER_LABEL: Record<NotificationFilter, string> = {
    all: t.notif.filterAll,
    unread: t.notif.filterUnread,
    money: t.notif.filterMoney,
    account: t.notif.filterAccount,
    cleared: t.notif.filterCleared,
  };
  const SORT_LABEL: Record<NotificationSort, string> = {
    newest: t.notif.sortNewest,
    oldest: t.notif.sortOldest,
  };
  const resultPhrase =
    resultCount === 1 ? t.notif.oneNotification : t.notif.nNotifications.replace("{n}", String(resultCount));

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.notif.showLabel}>
          {NOTIFICATION_FILTERS.map((f) => (
            <FilterPill
              key={f}
              semantics="toggle"
              replace
              scroll={false}
              href={hrefWith({ filter: f, page: 1 })}
              label={FILTER_LABEL[f]}
              count={counts[f]}
              on={filter === f}
              // ⛔ THE TEST ID IS UNCHANGED. `qa:notifications-page` addresses these pills by
              //    `notif-filter-<id>`; renaming it to this campaign's `lens:` convention would
              //    feed that driver garbage rather than failing loudly. The convention is a
              //    convention, not a law that outranks a working instrument.
              testId={`notif-filter-${f}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        {/* ⭐ TWO SORTS, ONE CONTROL. `newest` and `oldest` were two pills in a rail identical to
            the lens rail above them — so the page offered ten controls of one visual kind
            answering two different questions. A menu with a direction toggle says which is a
            FILTER and which is an ORDER without the reader having to learn it. */}
        <QuerySort
          label={t.common.sort}
          value={SORT_LABEL[sort]}
          ariaLabel={t.notif.sortLabel}
          options={NOTIFICATION_SORTS.map((s) => ({
            id: s,
            label: SORT_LABEL[s],
            href: hrefWith({ sort: s, page: 1 }),
            on: sort === s,
            // ⚠️ Both sorts read the SAME key (`createdAt`) in opposite directions, so the
            //    direction button and the menu are two ways to say one thing. `naturalDir` is
            //    what keeps them agreeing: choosing `oldest` from the menu points the arrow up.
            naturalDir: s === "oldest" ? "asc" : "desc",
          }))}
          dir={sort === "oldest" ? "asc" : "desc"}
          dirHref={hrefWith({ sort: sort === "oldest" ? "newest" : "oldest", page: 1 })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />
      </div>
    </div>
  );
}
