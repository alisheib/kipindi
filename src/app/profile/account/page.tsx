import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { BrandTopo } from "@/components/brand-topo";
import { Chip } from "@/components/ui/chip";
import { FilterPill } from "@/components/ui/filter-pill";
import { ScrollX } from "@/components/ui/scroll-x";
import { Pagination, PLAYER_PER_PAGE, parsePage, buildBaseHref } from "@/components/ui/pagination";
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
 * How much of their own history a player may read. The activity feed is an in-memory
 * audit ring, so this is a slice of an array, not a query — the old value of 50 was not
 * buying anything (G-1).
 */
const OWN_ACTIVITY_MAX = 100_000;

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ reason?: string; act?: string; page?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/account");

  let user: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful */ }
  let allActivity: ReturnType<typeof getOwnActivity> = [];
  // ⛔ WAS `50`, RENDERED `.slice(0, 30)`, WITH NO PAGER (campaign finding G-1).
  // A player could not see their own activity past the newest 30 rows by any means —
  // and the category chips below filtered INSIDE that truncated window, so a player with
  // 200 wallet events who tapped "WALLET" saw however few of them happened to fall in
  // the newest 50. The count was not shown either, so nothing on the page suggested the
  // rest existed. This is the player-facing half of Ali's no-grid-without-paging rule,
  // and it is the one a customer meets rather than an operator.
  try { allActivity = getOwnActivity(session.userId, OWN_ACTIVITY_MAX); } catch { /* graceful */ }
  const sp = (await searchParams) ?? {};
  const banner = bannerFor(sp.reason, t.error as unknown as Record<string, string>);
  const actFilter = sp.act ?? "all";
  const activityCategories = [...new Set(allActivity.map((e) => e.category))].sort();
  // Filter across the WHOLE history, then page the result — the other order is the bug.
  const activity = actFilter === "all" ? allActivity : allActivity.filter((e) => e.category === actFilter);
  const actPage = parsePage(sp.page, activity.length, PLAYER_PER_PAGE);
  const activityPage = activity.slice((actPage - 1) * PLAYER_PER_PAGE, actPage * PLAYER_PER_PAGE);
  // `act` is carried so turning a page keeps the chosen category, and the page param is
  // dropped so changing category returns to page 1 rather than to a page that may not
  // exist in the new set.
  const actBaseHref = buildBaseHref("/profile/account", { act: actFilter === "all" ? undefined : actFilter });

  const statusTone =
    user?.status === "ACTIVE" ? "yes"
    : user?.status === "PENDING_KYC" ? "warning"
    : "no";

  return (
    <PageContainer tier="reading" className="space-y-5">
      {banner && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
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
        {/* ⚠️ This rail was `h-7` — 40px on this repo's overridden scale — while its four
            siblings were `h-8` (48px). So it was already a divergence INSIDE the divergent
            idiom, and the batch-5 scan listed neither. `rank="secondary"` keeps its quieter
            mono voice, which is a real hierarchy (this is a sub-filter inside a panel), while
            the geometry joins the one language. */}
        {activityCategories.length > 1 && (
          <nav className="flex flex-wrap items-center gap-1.5" aria-label={t.profile.activityFilter} data-filter-rail>
            {[{ id: "all", label: t.common.all }, ...activityCategories.map((c) => ({ id: c, label: c }))].map((f) => (
              <FilterPill
                key={f.id}
                href={`/profile/account${f.id === "all" ? "" : `?act=${f.id}`}`}
                label={f.label}
                on={actFilter === f.id}
                semantics="tab"
                rank="secondary"
              />
            ))}
          </nav>
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
                <tr key={e.id} className="border-b border-border last:border-b-0 transition-colors">
                  <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap text-text-muted">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-subtle">{e.category}</td>
                  <td className="px-3 py-2 font-display font-semibold text-text">{e.action}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center">
                    <p className="font-display text-[13px] font-semibold text-text-muted">
                      {actFilter === "all" ? t.profile.noActivityYet : t.profile.noFilteredActivity.replace("{cat}", actFilter.toLowerCase())}
                    </p>
                    <p className="mt-1 text-body-sm text-text-subtle">
                      {actFilter === "all" ? t.profile.activityHint : t.profile.tryDifferentFilter}
                    </p>
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
      <section className="relative isolate overflow-hidden rounded-xl border border-no-700/60 bg-no-500/[0.06] p-5">
        <BrandTopo opacity={0.08} />
        <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <I.alertOctagon s={15} className="text-no-300" />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.profile.closeAccount}
          </h2>
          <Chip variant="no" className="ml-auto">
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

