/**
 * `/notifications` — the whole inbox, not the newest thirty.
 *
 * ── WHY THIS PAGE EXISTS ─────────────────────────────────────────────────────
 *
 * The bell reads the newest **30** rows, ordered purely by time, with **no priority by
 * kind** (`_actions/notifications.ts` → `listForUser(userId, 30)`). That was fine while
 * notifications were rare. It stopped being fine when Up & Down began writing a row per
 * settled round (E-178): measured on production at **20 rows to one player in an hour**,
 * ~21 on the busiest day, and **360/day** if anyone runs a 3-minute chain.
 *
 * At that rate a player can push a **SECURITY alert or a KYC decision out of the only door
 * that shows it**, and nothing anywhere would say so. This page is the door with no window.
 *
 * 🔴 AND THE SECOND HALF, WHICH IS WORSE. `CLEAR ALL` stamps `dismissedAt`, and every read
 * door in the product filters `dismissedAt: null`. Before this page, one tap permanently
 * hid every money record a player had, with no way back. The **Cleared** lens is that way
 * back, and `Restore` is the undo. Clearing is meant to tidy a bell, not destroy a receipt.
 *
 * ── SHAPE ────────────────────────────────────────────────────────────────────
 * Server component, URL-driven (`?filter=`, `?sort=`, `?page=`) so a view is shareable and
 * survives the back button — the same contract `/results` uses, and the reason the shared
 * `Pagination` atom needs no client JS.
 *
 * ⛔ Rows render through `@/lib/notification-appearance`, the SAME module the bell reads. A
 * second icon/tint map here is how a win comes to be gold in one surface and grey in the
 * other; notification COPY already lived in two places once and the Chinese loss string was
 * fixed in one and left wrong in the other for three weeks (E-179).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
// ⛔ B7 — a page states its width through <PageContainer tier> and NOTHING else. A
// hand-typed `max-w-[…]` is the exact string that law exists to delete, and `test:measure`
// fails on a new one ≥500px. `reading` is the detail/content/profile tier.
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconPlate } from "@/components/ui/icon-plate";
import { Suspense } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, NOTIFICATION_SEARCH } from "@/lib/search";
import { NotificationsBar } from "./notifications-bar";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { getSession } from "@/lib/server/session";
import { pageForUser } from "@/lib/server/notification-service";
import { getServerT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { iconFor, tintFor } from "@/lib/notification-appearance";
import {
  parseFilter, parseSort,
  type NotificationFilter, type NotificationSort,
} from "@/lib/notification-filters";
import { NotificationRowActions } from "./row-actions";
import { NotificationsBulkBar } from "./bulk-bar";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.notif.title };
}
export const dynamic = "force-dynamic";

/** Relative age, mirroring the bell's `relTime` so one row does not age differently in two places. */
function relTime(iso: string, t: Awaited<ReturnType<typeof getServerT>>["t"]): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t.common.relNow;
  if (m < 60) return `${m}${t.common.relMinutes}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t.common.relHours}`;
  return `${Math.floor(h / 24)}${t.common.relDays}`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; page?: string; q?: string }>;
}) {
  const { t, locale } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/notifications");

  const sp = await searchParams;
  // ⛔ Narrowed, never trusted. An unknown `?filter=` falls back to the default rather than
  // reaching the DAL — a query param is user input on a surface that lists money events.
  const filter = parseFilter(sp.filter);
  const sort = parseSort(sp.sort);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  /**
   * ⭐ THE SEARCH GOES INTO THE SQL, WHICH IS WHY IT IS PASSED DOWN RATHER THAN APPLIED HERE.
   * Every other player surface in this campaign reads its rows and filters them in JS; this one
   * cannot. `notification-service.ts` records the measurement: Up & Down writes a row per settled
   * round — *"20 rows to one player in an hour, and 360/day if a 3-minute chain runs"* — so an
   * inbox is unbounded and reading all of it to find one receipt is not a search, it is an outage.
   * ⛔ `clampText` is applied by the shared parser inside the DAL; the raw value never reaches a
   * query builder untrimmed.
   */
  const q = typeof sp.q === "string" ? sp.q : "";

  const { items, total, counts } = await pageForUser({
    userId: session.userId,
    filter,
    sort,
    page,
    perPage: PLAYER_PER_PAGE,
    q,
  });

  const pickTitle = (n: (typeof items)[number]) =>
    locale === "sw" ? (n.titleSw || n.titleEn) : locale === "zh" ? (n.titleZh || n.titleEn) : n.titleEn;
  const pickBody = (n: (typeof items)[number]) =>
    locale === "sw" ? (n.bodySw || n.bodyEn) : locale === "zh" ? (n.bodyZh || n.bodyEn) : n.bodyEn;

  /* ⛔ `FILTER_LABEL` / `SORT_LABEL` MOVED TO `notifications-bar.tsx` RATHER THAN BEING COPIED
     THERE. Both were declared here and consumed only by the two pill rails the bar replaced;
     leaving them would have put one fact in two homes (§0a) — the shape `notification-filters.ts`
     opens by warning about: *"Three copies of a kind list is how one of them quietly stops
     matching a kind that was added later."* */

  /** A link that keeps every other lens setting and resets paging — changing a filter must
   *  never leave the reader on page 4 of a list that now has one page. */
  const hrefWith = (next: Partial<{ filter: NotificationFilter; sort: NotificationSort; page: number; q: string }>) => {
    const params = new URLSearchParams();
    const f = next.filter ?? filter;
    const s = next.sort ?? sort;
    if (f !== "all") params.set("filter", f);
    if (s !== "newest") params.set("sort", s);
    // ⛔ THE SEARCH SURVIVES EVERY PILL PRESS. A lens link that dropped `?q=` would silently widen
    //    the result the moment a player changed lens — and its own pill count, folded WITH the
    //    search, would then disagree with what arrived. That is the exact defect `qa:count-truth`
    //    exists to catch, introduced by an omission in a URL builder rather than in a count.
    // ⛔ `next.q` MAY BE THE EMPTY STRING, WHICH MEANS "CLEAR THE SEARCH" — so this reads
    //    `?? q`, never `|| q`. Clearing is a value in the grammar, not a string edit on a URL:
    //    the first draft of the empty-state exit stripped `q=` with a regex, which is a SECOND
    //    definition of this builder and would drift from it the day a param is added.
    const searchText = next.q ?? q;
    if (searchText) params.set("q", searchText);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    return `/notifications${qs ? `?${qs}` : ""}`;
  };
  /** Base for the shared pager: the current lens, minus `page`. */
  const baseHref = hrefWith({});

  const EMPTY: Record<NotificationFilter, { title: string; body?: string }> = {
    all: { title: t.notif.noNotifications, body: t.notif.noNotificationsHint },
    unread: { title: t.notif.emptyUnread },
    money: { title: t.notif.emptyMoney },
    account: { title: t.notif.emptyAccount },
    cleared: { title: t.notif.emptyCleared, body: t.notif.clearedHint },
  };

  return (
    <PageContainer tier="reading" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader
        tone="info"
        icon={<I.bellRing s={22} />}
        eyebrow={t.notif.eyebrow}
        title={t.notif.title}
      />

      {/* ⭐ SEARCH — the last player lens surface without one, and the one that needed it most:
          this is where a player comes to find ONE receipt among a year of round results. */}
      <Suspense>
        <SearchBox
          placeholder={t.notif.searchNotifications}
          ariaLabel={t.notif.searchNotifications}
          helpFields={fieldNames(NOTIFICATION_SEARCH)}
        />
      </Suspense>

      {/* 🔴 THE RAIL CARRIES `data-filter-rail` NOW, AND IT NEVER HAS. §6 of the campaign names
          this page as one of two that render a real `FilterPill` rail while being invisible to
          `test:filter-language` — *"not a missing feature, a gate reporting on a smaller
          population than it claims"*. Both declared lists gain it in this same commit.
          ⭐ THE LENSES ARE UNCHANGED, DELIBERATELY. Their counts were already real and already
          cross-filtered, and the wrap-not-scroll ruling below is preserved by `QueryStrip`, which
          wraps above `lg` and scrolls below it. What moved is the SORT: it was a second rail of
          pills, identical in shape to the lens rail, ORDERING rather than filtering. */}
      <NotificationsBar
        filter={filter}
        sort={sort}
        counts={counts}
        resultCount={total}
        hrefWith={hrefWith}
        t={t}
      />

      {/* ⛔ Says out loud that clearing HIDES rather than deletes. Without this sentence a
          player reads "Clear all" as destructive and never taps it — or taps it and believes
          their money history is gone. */}
      {filter === "cleared" && items.length > 0 && (
        <p className="text-label text-text-muted leading-snug">{t.notif.clearedHint}</p>
      )}

      {/* The one bulk control. ⛔ There is deliberately no CLEAR ALL here — see `bulk-bar.tsx`:
          a bulk hide over a PAGINATED list would act on rows the player has never seen. */}
      <NotificationsBulkBar
        unread={counts.unread}
        label={t.common.readAll}
        countLabel={counts.unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace("{n}", String(counts.unread))}
      />

      {items.length === 0 ? (
        /**
         * 🔴 A SEARCH MISS IS NOT AN EMPTY INBOX, AND SAYING SO WOULD BE A LIE THIS PAGE MADE
         * WORSE BY GAINING A SEARCH. Measured on the fixture before this branch existed:
         * `?q=zzzznomatch` rendered *"No notifications yet — We'll buzz here when a bet settles
         * or a market resolves"* over an inbox holding **71 rows**. The five `EMPTY[filter]`
         * sentences are each correct about a LENS and each wrong about a search.
         *
         * ⭐ AND THE WAY OUT IS THE POINT, NOT THE WORDING. A player who cannot find the receipt
         * they searched for needs the search cleared, not an explanation — so the action keeps
         * every other setting and drops only `q`.
         */
        <EmptyState
          title={q ? `${t.results.noResultsMatch} "${q}"` : EMPTY[filter].title}
          body={q ? t.results.tryDifferentKeywords : EMPTY[filter].body}
          illustration={<I.bellRing s={30} />}
          action={
            q ? (
              <Link href={hrefWith({ q: "", page: 1 }) as never} className="btn btn-ghost btn-sm">
                {t.common.clearSearch}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2" data-notif-total={total}>
          {items.map((n) => {
            const Icon = iconFor(n.kind);
            const isUnread = !n.readAt;
            return (
              <li
                key={n.id}
                className="rounded-xl glass-panel overflow-hidden"
                /* ⛔ `data-row-id` — the third leg of the instrumentation contract. The two
                   `data-notif-*` attributes below stay: `qa:notifications-page` reads them, and
                   they say what KIND a row is, which is a different question from which row it
                   is. Three attributes, three claims, no overlap. */
                data-row-id={n.id}
                data-notif-kind={n.kind ?? "NONE"}
                data-notif-unread={isUnread ? "1" : "0"}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* ⛔ THE SAME ATOM, THE SAME SIZE, THE SAME GLYPH as the bell renders.
                      A row is one object; it must not be 32px in the panel and 36px here,
                      or the page reads as a different product than the bell that opened it. */}
                  <IconPlate size={32} className={cn("mt-0.5 border", tintFor(n.kind))}>
                    <Icon s={16} />
                  </IconPlate>
                  <div className="min-w-0 flex-1">
                    {/* ⛔ A REAL ANCHOR, not a click handler. The bell must close its panel
                        first so it uses a button; a page has nothing to close, and an anchor
                        middle-clicks, opens in a new tab, and announces as a link. */}
                    {n.href ? (
                      <Link href={n.href as never} className="block group">
                        <p className="font-display text-body-sm font-semibold text-text leading-tight group-hover:underline underline-offset-2">
                          {pickTitle(n)}
                          {/* §A4 — colour is never the only signal, so the unread state is
                              also a word a screen reader can reach. */}
                          {isUnread && <span className="sr-only"> · {t.notif.unread}</span>}
                        </p>
                      </Link>
                    ) : (
                      <p className="font-display text-body-sm font-semibold text-text leading-tight">
                        {pickTitle(n)}
                        {isUnread && <span className="sr-only"> · {t.notif.unread}</span>}
                      </p>
                    )}
                    <p className="mt-1 text-label text-text-muted leading-snug break-words">{pickBody(n)}</p>
                    <p className="mt-1.5 font-mono text-micro text-text-subtle tabular-nums">
                      {relTime(n.createdAt, t)}
                    </p>
                  </div>
                  <NotificationRowActions
                    id={n.id}
                    unread={isUnread}
                    cleared={!!n.dismissedAt}
                    restoreLabel={t.notif.restore}
                    readLabel={t.common.readAll}
                    dismissLabel={t.notif.dismissNotification}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ⚠️ FOUND WHILE ADDING first/last, 2026-08-25, and PRE-EXISTING: this
          player-facing pager passed `ofLabel` and nothing else, so its prev/next controls
          fell back to the component's English defaults and a Swahili or Chinese reader's
          screen reader announced "Previous page". Every other player pager already passed
          them. Leaving it would have made it worse — four English labels instead of two. */}
      {total > PLAYER_PER_PAGE && (
        <Pagination
          total={total}
          page={page}
          perPage={PLAYER_PER_PAGE}
          baseHref={baseHref}
          ofLabel={t.common.of}
          prevLabel={t.common.previousPage}
          nextLabel={t.common.nextPage}
          firstLabel={t.common.firstPage}
          lastLabel={t.common.lastPage}
        />
      )}
    </PageContainer>
  );
}
