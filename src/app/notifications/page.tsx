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
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { getSession } from "@/lib/server/session";
import { pageForUser } from "@/lib/server/notification-service";
import { getServerT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { iconFor, tintFor } from "@/lib/notification-appearance";
import {
  NOTIFICATION_FILTERS, NOTIFICATION_SORTS, parseFilter, parseSort,
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
  searchParams: Promise<{ filter?: string; sort?: string; page?: string }>;
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

  const { items, total, counts } = await pageForUser({
    userId: session.userId,
    filter,
    sort,
    page,
    perPage: PLAYER_PER_PAGE,
  });

  const pickTitle = (n: (typeof items)[number]) =>
    locale === "sw" ? (n.titleSw || n.titleEn) : locale === "zh" ? (n.titleZh || n.titleEn) : n.titleEn;
  const pickBody = (n: (typeof items)[number]) =>
    locale === "sw" ? (n.bodySw || n.bodyEn) : locale === "zh" ? (n.bodyZh || n.bodyEn) : n.bodyEn;

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

  /** A link that keeps every other lens setting and resets paging — changing a filter must
   *  never leave the reader on page 4 of a list that now has one page. */
  const hrefWith = (next: Partial<{ filter: NotificationFilter; sort: NotificationSort; page: number }>) => {
    const q = new URLSearchParams();
    const f = next.filter ?? filter;
    const s = next.sort ?? sort;
    if (f !== "all") q.set("filter", f);
    if (s !== "newest") q.set("sort", s);
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const qs = q.toString();
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

      {/* ── Lenses. ⛔ Every count is a real count over the same predicate its page uses
          (`FilterPill`: "Omit where no honest count exists. Never invent one — A-5"). */}
      <div className="space-y-2">
        {/* ⛔ `flex-wrap`, NOT a horizontal scroller — the pattern `/results` uses, and it
            removed a scroller from exactly this spot with a comment saying why: a rail that
            wraps never engages the scroller, and the bleed it needs pushes the wrapper past
            its own container at 360.
            🔴 AND HERE IT WOULD HAVE HIDDEN THE SAFETY LENS. At 360 the first draft scrolled,
            so **Account & security** and **Cleared** were off-screen with no affordance that
            anything followed — and `Cleared` is the only route back to a notification that
            `CLEAR ALL` hid. A filter a player cannot see is a filter they do not have. */}
        <nav aria-label={t.notif.showLabel} className="flex flex-wrap items-center gap-1.5">
          <FilterGroupKey>{t.notif.showLabel}</FilterGroupKey>
          {NOTIFICATION_FILTERS.map((f) => (
            <FilterPill
              key={f}
              href={hrefWith({ filter: f, page: 1 })}
              label={FILTER_LABEL[f]}
              count={counts[f]}
              on={filter === f}
              testId={`notif-filter-${f}`}
            />
          ))}
        </nav>
        <nav aria-label={t.notif.sortLabel} className="flex flex-wrap items-center gap-1.5">
          <FilterGroupKey>{t.notif.sortLabel}</FilterGroupKey>
          {NOTIFICATION_SORTS.map((s) => (
            <FilterPill
              key={s}
              href={hrefWith({ sort: s, page: 1 })}
              label={SORT_LABEL[s]}
              on={sort === s}
              rank="secondary"
              testId={`notif-sort-${s}`}
            />
          ))}
        </nav>
      </div>

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
        <EmptyState
          title={EMPTY[filter].title}
          body={EMPTY[filter].body}
          illustration={<I.bellRing s={30} />}
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
