import { Suspense } from "react";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { BrandTopo } from "@/components/brand-topo";
import { Chip } from "@/components/ui/chip";
import { FilterPill } from "@/components/ui/filter-pill";
import { ScrollX } from "@/components/ui/scroll-x";
import { Pagination, PLAYER_PER_PAGE, parsePage } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, ACCOUNT_ACTIVITY_SEARCH } from "@/lib/search";
import { AccountActivityBar, type ActivityCounts } from "./account-bar";
import { auditCategoryLabel } from "@/lib/account/category-label";
import {
  activityCounts,
  activityEmptyCause,
  activityExits,
  buildActivityHref,
  filterActivity,
  parseActivityParams,
  sortActivity,
  type ActivityRow,
} from "@/lib/account/activity";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getOwnActivity } from "@/lib/server/user-service";
import { CloseAccountForm } from "./close-account-form";
import { FormColumn } from "@/components/ui/form-column";
import { EmailEditor } from "@/components/profile/email-editor";
import { PasswordSection } from "@/components/profile/password-section";
import { formatDateTimeSafe, formatDateTime } from "@/lib/utils";
import { ExportDataButton } from "./export-data-button";
import { PrivacyRequestForm } from "./privacy-request-form";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";
import { bannerFor } from "@/lib/failure-banner";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "My account", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.profile.myAccount };
}
export const dynamic = "force-dynamic";

/**
 * How much of their own history a player may read in the page.
 *
 * ⚠️ IT IS A REAL BOUND NOW, AND THE OLD ONE WAS NOT. `OWN_ACTIVITY_MAX` was `100_000` above an
 * in-memory ring capped at `MAX_IN_MEM = 10_000` — a number that could never bind, describing a
 * limit the page did not own and could not see. The read is a durable, indexed query now
 * (`getAuditForActorDurable`), so this figure is the one that actually decides what is fetched.
 *
 * ⛔ 2,000 IS CHOSEN, NOT INHERITED. It is the whole population for effectively every player, it
 * keeps one indexed range scan small, and — crucially — the read returns a real `COUNT`, so when
 * it DOES bind the page can say so rather than presenting a truncated history as a complete one.
 */
const OWN_ACTIVITY_MAX = 2_000;

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ reason?: string; act?: string; page?: string; when?: string; sort?: string; dir?: string; q?: string }> }) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/account");

  let user: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful */ }
  let own: Awaited<ReturnType<typeof getOwnActivity>> = { entries: [], total: 0, truncated: false };
  // ⛔ WAS `50`, RENDERED `.slice(0, 30)`, WITH NO PAGER (campaign finding G-1).
  // A player could not see their own activity past the newest 30 rows by any means —
  // and the category chips below filtered INSIDE that truncated window, so a player with
  // 200 wallet events who tapped "WALLET" saw however few of them happened to fall in
  // the newest 50. The count was not shown either, so nothing on the page suggested the
  // rest existed. This is the player-facing half of Ali's no-grid-without-paging rule,
  // and it is the one a customer meets rather than an operator.
  // 🔴 AND IT WAS SERVED FROM THE IN-MEMORY RING UNTIL TASK 4.6 — a 10,000-row, platform-WIDE,
  // per-container sliding window that empties on every deploy. `audit.ts` had already ruled that
  // shape out for a "who did what, when" panel in writing, and this is that panel; the counts this
  // task adds would otherwise have been an accident of uptime (`WALLET 40` warm, `WALLET 3` after
  // a restart, same player, same minute). It is one indexed read now.
  try { own = await getOwnActivity(session.userId, OWN_ACTIVITY_MAX); } catch { /* graceful */ }
  const allActivity = own.entries;
  const sp = (await searchParams) ?? {};
  const banner = bannerFor(sp.reason, t.error as unknown as Record<string, string>);

  /**
   * ⭐ PLAYER QUERY, TASK 4.6. The rail was here already; what it never had was a count on any
   * pill, a date window, an order, or a search. A player with four thousand audit rows could reach
   * every one of them by paging and still could not answer *"when did I change my password"*.
   *
   * 🔴 AND `?act=` WAS PASSED THROUGH RAW — `sp.act ?? "all"` went straight into a `.filter()`, so
   * `?act=lol` matched nothing, emptied the table, and drew no control that could clear it: the
   * rail only renders pills for categories that EXIST, so the value that emptied the page was not
   * among them. That is `/updown/history`'s `?day=lol` defect on a second page, and it is what
   * `lib/query/parse.ts` exists to make impossible — *"an unknown value FALLS BACK, it never
   * throws and it is never passed through."*
   *
   * ⛔ THE CLOSED SET IS THE PLAYER'S OWN CATEGORIES, NOT `AuditCategory`. See the contract's
   * header: `getAuditForActor` can never return an `ADMIN`, `SECURITY` or `SYSTEM` row for a
   * player, so rendering all eight arms would offer most accounts five pills that read 0 forever.
   */
  const activityCategories = [...new Set(allActivity.map((e) => e.category))].sort();
  const categoryIds = ["all", ...activityCategories] as const;
  const state = parseActivityParams(sp, categoryIds);
  const nowMs = Date.now();

  const rows: ActivityRow[] = allActivity.map((e) => ({
    id: e.id,
    category: e.category,
    action: e.action,
    createdAtMs: Date.parse(e.createdAt) || 0,
  }));

  /**
   * ⛔ THROUGH THE SHARED GRAMMAR, NEVER A HAND-ROLLED `.toLowerCase().includes()` —
   * `test:search-adoption` refuses one, and it is right to: `ACCOUNT_ACTIVITY_SEARCH` is what gives
   * this table `category:wallet` and quoted phrases, and it is a `viewModel` schema because these
   * rows come from the in-memory audit ring rather than a table a `where` could reach.
   */
  const parsed = parseQuery(state.q, { fields: fieldNames(ACCOUNT_ACTIVITY_SEARCH) });
  const matchesRow = (row: ActivityRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, ACCOUNT_ACTIVITY_SEARCH);

  // ⚠️ ONE COLLATOR, BUILT ONCE — `sort.ts` refuses to construct one because collation is a fact
  //    about the PLAYER'S locale, and a comparator would build it O(n log n) times.
  const collate = new Intl.Collator(locale).compare;

  const counts = activityCounts(rows, state, nowMs, matchesRow, categoryIds) as ActivityCounts;
  // Filter across the WHOLE history, then page the result — the other order is the bug (G-1).
  const activity = sortActivity(filterActivity(rows, state, nowMs, matchesRow), state, collate);
  const actPage = parsePage(sp.page, activity.length, PLAYER_PER_PAGE);
  const activityPage = activity.slice((actPage - 1) * PLAYER_PER_PAGE, actPage * PLAYER_PER_PAGE);
  // ⛔ EVERY axis is carried now, not just `act` — a page turn used to drop a window, a sort and a
  //    search on the floor. `buildQueryHref` omits defaults, so an untouched page keeps a clean URL
  //    and drops `page` itself whenever a filter changes.
  const actBaseHref = buildActivityHref(state);

  /**
   * ⭐ FIVE CAUSES, FIVE SENTENCES. The table had TWO — "No activity yet" and "No {cat} activity" —
   * and once a window and a search exist, both become wrong in a new way: a player who searched
   * `zzzz` was told they had no activity at all. That is the exact lie task 4.5 found on
   * `/notifications`, and adding a filter is what adds an empty CAUSE.
   */
  const cause = activityEmptyCause(state, nowMs, matchesRow, activity.length, rows.length);
  const exits = cause && cause !== "no-rows" ? activityExits(rows, state, nowMs, matchesRow) : [];
  const EXIT_LABEL: Record<string, string> = {
    when: t.common.rangeAll,
    q: t.common.clearSearch,
    act: t.common.all,
  };
  const emptyTitle =
    cause === "no-rows" ? t.profile.noActivityYet
    : cause === "search-miss" ? `${t.results.noResultsMatch} "${state.q}"`
    : cause === "window-miss" ? t.market.filterMissTitle
    /* ⛔ THE LABEL, NOT `state.act.toLowerCase()`. Interpolating the stored token gave a Swahili
       reader "Hakuna shughuli za wallet" and a Chinese reader "没有 wallet 活动" — an English enum
       inside a translated sentence, which is §L3's named failure. */
    : cause === "filter-miss" ? t.profile.noFilteredActivity.replace("{cat}", auditCategoryLabel(t, state.act))
    : t.profile.noActivityYet;
  const emptyBody =
    cause === "no-rows" ? t.profile.activityHint
    : cause === "search-miss" ? t.results.tryDifferentKeywords
    : cause === "window-miss" ? t.market.filterMissBody
    : t.profile.tryDifferentFilter;

  const statusTone =
    user?.status === "ACTIVE" ? "yes"
    : user?.status === "PENDING_KYC" ? "warning"
    : "no";

  return (
    <PageContainer tier="reading" className="space-y-5">
      {banner && (
        <div role="alert" className="rounded-xl border border-danger-border bg-danger-500/10 px-4 py-3 text-[13px] text-danger-fg">
          {banner.body}
        </div>
      )}
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      <PageHero glow="info">
        <PageHeader
          tone="info"
          icon={<I.user s={14} className="text-info-fg" />}
          eyebrow={t.profile.myAccount}
          title={t.profile.myAccount}
        />
      </PageHero>

      {/* PROFILE SUMMARY */}
      <section className="rounded-xl glass-panel p-5 space-y-3">
        <h2 className="font-display text-[15px] font-semibold text-text">{t.common.profile}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Item label={t.profile.setYourName} value={user?.displayName ?? "—"} />
          <Item
            label={t.auth.phone}
            value={user?.phoneE164
              ? `${user.phoneE164.slice(0, 4)}*****${user.phoneE164.slice(-2)}`
              : "—"}
          />
          <Item label={t.profile.region} value={user?.region ?? "—"} />
          <Item
            label={t.common.status}
            value={
              <Chip variant={statusTone as "yes" | "no" | "warning"}>
                {user?.status ?? "—"}
              </Chip>
            }
          />
          <Item
            label={t.profile.accountOpened}
            value={formatDateTimeSafe(user?.createdAt)}
          />
          <Item
            label={t.profile.lastLogin}
            value={formatDateTimeSafe(user?.lastLoginAt)}
          />
        </div>
        {/* Contact email — opt-in; once set, transactional receipts are emailed. */}
        <FormColumn measure="field"><EmailEditor currentEmail={user?.email ?? null} verified={!!user?.emailVerifiedAt} /></FormColumn>
        <div className="border-t border-border pt-3">
          <FormColumn measure="field"><PasswordSection hasPassword={!!(user?.passwordHash)} /></FormColumn>
        </div>
      </section>

      {/* OWN ACTIVITY FEED */}
      <section className="rounded-xl glass-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <I.activity s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">{t.profile.myAccountSub.split("·")[0].trim() /* "Activity" */}</h2>
          <span className="ml-auto font-mono text-[11px] text-text-subtle tabular-nums">
            {activity.length} {t.common.events}
          </span>
        </div>

        {/* ⛔ THE CONTROLS ARE WITHHELD ON A GENUINELY EMPTY HISTORY, and only then — the rule
            `/watchlist` states: a bar of pills all reading 0 above "no activity yet" is a row of
            controls that cannot do anything. Every OTHER empty state keeps the bar, because there
            the bar is the way out of the empty state. ⚠️ The old rail hid itself on
            `activityCategories.length > 1`, which hid the whole control on a history that had
            plenty of rows in a single category — a page with 300 WALLET events and no way to
            search them. The test is now whether there are ROWS, not whether there are two kinds. */}
        {rows.length > 0 && (
          <>
            {/* ⛔ NOT STICKY. `QUERY_BAR_CLASS` already sticks at `top-[56px]`, and two sticky
                surfaces cannot share one offset — that is the 91px overlap `qa:bar-geometry` found
                on three routes at once. */}
            <div className="py-1">
              <Suspense>
                <SearchBox
                  placeholder={t.profile.searchActivity}
                  ariaLabel={t.profile.searchActivity}
                  helpFields={fieldNames(ACCOUNT_ACTIVITY_SEARCH)}
                />
              </Suspense>
            </div>
            <AccountActivityBar
              state={state}
              categoryIds={categoryIds}
              counts={counts}
              resultCount={activity.length}
              t={t}
            />
          </>
        )}

        {/* ⛔ THE CAP, STATED ONLY WHEN IT BITES. `truncated` comes from a real `COUNT` beside the
            read, not from `rows.length === CAP` — the shape that tells a player with exactly the
            cap that their history was cut when it was complete. `/updown/history` is the precedent
            for saying it at all; what it did not have is a count to say it WITH. */}
        {own.truncated && (
          <p className="font-mono text-[11px] text-text-subtle">
            {t.profile.activityCapped
              .replace("{n}", String(allActivity.length))
              .replace("{total}", String(own.total))}
          </p>
        )}

        {/* Per-cause exit, each carrying a REAL cross-filtered count — so no exit offered here can
            lead to another empty table. */}
        {activity.length === 0 && exits.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {exits.map((e) => (
              <FilterPill
                key={e.id}
                href={buildActivityHref(state, e.patch)}
                label={EXIT_LABEL[e.id] ?? e.id}
                count={e.count}
                on={false}
                semantics="toggle"
                rank="secondary"
                replace
                scroll={false}
                testId={`exit:${e.id}`}
              />
            ))}
          </div>
        )}
        <ScrollX label="Account activity" className="rounded-md border border-border">
          <table className="admin-tbl">
            <thead>
              <tr className="border-b border-border bg-bg-overlay/50 font-mono text-micro uppercase eyebrow text-text-subtle">
                <th className="text-left px-3 py-2 font-semibold">{t.common.when}</th>
                <th className="text-left px-3 py-2 font-semibold">{t.common.category}</th>
                <th className="text-left px-3 py-2 font-semibold">{t.common.action}</th>
              </tr>
            </thead>
            <tbody>
                {/* ⭐ DG-A-09 · §B8 — dead duplicate of the canon row hover; see the note on
                    `leaderboard/page.tsx`. This table is `.admin-tbl` too (:158), so the canon
                    at (0,2,2) has always won and the `/40` never rendered. `transition-colors`
                    stays — it eases the canon's change. */}
              {activityPage.map((e) => (
                /* ⛔ `data-row-id` IS THE INSTRUMENTATION CONTRACT'S THIRD ATTRIBUTE, and a row
                   type that omits it makes `qa:count-truth` refuse to run this surface: it proves
                   disjointness and no-double-counting over SETS of ids rather than by parsing a
                   visible word, which is the only way those properties can be checked in three
                   languages at once. */
                <tr key={e.id} data-row-id={e.id} className="border-b border-border last:border-b-0 transition-colors">
                  <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap text-text-muted">
                    {formatDateTime(new Date(e.createdAtMs).toISOString())}
                  </td>
                  {/* ⛔ THE LEXICON, NEVER THE TOKEN — this cell printed the raw enum in all three
                      languages until task 4.6. The pill and the cell resolve through the SAME
                      function, so a filter and the rows it filters to cannot use two words for one
                      category. ⚠️ `font-mono` goes with it: these are words now, not identifiers. */}
                  <td className="px-3 py-2 text-text-subtle">{auditCategoryLabel(t, e.category)}</td>
                  <td className="px-3 py-2 font-display font-semibold text-text">{e.action}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center">
                    <p className="font-display text-[13px] font-semibold text-text-muted">{emptyTitle}</p>
                    <p className="mt-1 text-body-sm text-text-subtle">{emptyBody}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollX>
        {/* The shared platform pager, at the player page size — so a player can reach
            every entry the audit ring still holds, not just the newest handful. */}
        <Pagination
          total={activity.length}
          page={actPage}
          perPage={PLAYER_PER_PAGE}
          baseHref={actBaseHref}
          ofLabel={t.common.of}
          prevLabel={t.common.previousPage}
          nextLabel={t.common.nextPage}
firstLabel={t.common.firstPage}
lastLabel={t.common.lastPage}
        />
      </section>

      {/* DATA EXPORT — GDPR Art 15 / PDPA */}
      <section className="rounded-xl glass-panel p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <I.download s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.footer.exportClose.split("/")[0].trim() /* "Export" */}
          </h2>
        </div>
        <p className="text-body-sm text-text-muted leading-snug">
          {t.profile.exportDescription}
        </p>
        <div className="pt-1">
          <ExportDataButton />
        </div>
      </section>

      {/* ERASURE / CORRECTION REQUEST — PDPA 2022 §31 / §30, GDPR Art. 17 / 16.
          ⭐ DELIBERATELY BELOW THE EXPORT, because the export is the answer to two of the
          four rights and this form is the answer to the other two. Ali's decision
          2026-08-21: the player files it themselves on their authenticated session, which
          is already the standard for handing over the whole bundle one section up. */}
      <section className="rounded-xl glass-panel p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <I.shield s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.profile.privacyRequestTitle}
          </h2>
        </div>
        <p className="text-body-sm text-text-muted leading-snug">
          {t.profile.privacyRequestBody}
        </p>
        <FormColumn measure="field"><PrivacyRequestForm /></FormColumn>
      </section>

      {/* CLOSE ACCOUNT — GDPR Art 17. C2g: warning-topo backdrop (BrandTopo over
          the claret danger panel) so the one-way zone reads as weightier. */}
      <section className="relative isolate overflow-hidden rounded-xl border border-danger-border bg-danger-500/[0.06] p-5">
        <BrandTopo opacity={0.08} />
        <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <I.alertOctagon s={15} className="text-danger-fg" />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.profile.closeAccount}
          </h2>
          <Chip variant="danger" className="ml-auto">
            {t.common.oneWay}
          </Chip>
        </div>
        <p className="text-body-sm text-text-muted leading-snug">
          {t.profile.closeAccountDescription}
        </p>
        <FormColumn measure="field"><CloseAccountForm /></FormColumn>
        <p className="font-mono text-[11px] text-text-subtle">
          {t.common.help}? {t.common.email} <span className="text-text-muted">{SUPPORT_EMAIL()}</span>{" "}
          {t.common.or} <span className="text-text-muted">{SUPPORT_PHONE()}</span>.
        </p>
        </div>
      </section>
    </PageContainer>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-overlay/40 px-3 py-2.5">
      <p className="font-mono text-micro uppercase eyebrow font-semibold text-text-subtle">
        {label}
      </p>
      <p className="mt-0.5 font-display text-[13px] font-semibold text-text">{value}</p>
    </div>
  );
}

