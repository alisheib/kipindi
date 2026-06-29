import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getOwnActivity } from "@/lib/server/user-service";
import { CloseAccountForm } from "./close-account-form";
import { EmailEditor } from "@/components/profile/email-editor";
import { PasswordSection } from "@/components/profile/password-section";
import { formatDateTimeSafe, formatDateTime } from "@/lib/utils";
import { ExportDataButton } from "./export-data-button";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ error?: string; act?: string }> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/account");

  const user = await db.user.findById(session.userId);
  const allActivity = getOwnActivity(session.userId, 50);
  const sp = (await searchParams) ?? {};
  const actFilter = sp.act ?? "all";
  const activityCategories = [...new Set(allActivity.map((e) => e.category))].sort();
  const activity = actFilter === "all" ? allActivity : allActivity.filter((e) => e.category === actFilter);

  const statusTone =
    user?.status === "ACTIVE" ? "yes"
    : user?.status === "PENDING_KYC" ? "warning"
    : "no";

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.common.profile}
      </Link>

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <I.user s={14} className="text-info-fg" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              {t.profile.myAccount}
            </p>
          </div>
          <h1 className="font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.profile.myAccount}
          </h1>
        </div>
      </header>

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
              <Pill tone={statusTone as "yes" | "no" | "warning"}>
                {user?.status ?? "—"}
              </Pill>
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
        <EmailEditor currentEmail={user?.email ?? null} currentName={user?.displayName ?? ""} verified={!!user?.emailVerifiedAt} />
        <div className="border-t border-border pt-3">
          <PasswordSection hasPassword={!!(user?.passwordHash)} />
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
        {activityCategories.length > 1 && (
          <nav className="flex flex-wrap items-center gap-1.5" aria-label={t.profile.activityFilter}>
            {[{ id: "all", label: t.common.all }, ...activityCategories.map((c) => ({ id: c, label: c }))].map((f) => {
              const on = actFilter === f.id;
              return (
                <Link
                  key={f.id}
                  href={`/profile/account${f.id === "all" ? "" : `?act=${f.id}`}` as never}
                  className={
                    "inline-flex h-7 items-center rounded-md border px-3 font-mono text-[11px] font-semibold whitespace-nowrap transition-all " +
                    (on
                      ? "border-brand-500 text-text"
                      : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                  }
                  style={on ? { background: "oklch(40% 0.12 262 / 0.35)" } : undefined}
                >
                  {f.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="admin-tbl">
            <thead>
              <tr className="border-b border-border bg-bg-overlay/50 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                <th className="text-left px-3 py-2 font-semibold">{t.common.when}</th>
                <th className="text-left px-3 py-2 font-semibold">{t.common.category}</th>
                <th className="text-left px-3 py-2 font-semibold">{t.common.action}</th>
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 30).map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-bg-overlay/40 transition-colors">
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
                    <p className="mt-1 text-[12px] text-text-subtle">
                      {actFilter === "all" ? t.profile.activityHint : t.profile.tryDifferentFilter}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DATA EXPORT — GDPR Art 15 / PDPA */}
      <section className="rounded-xl glass-panel p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <I.download s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.footer.exportClose.split("/")[0].trim() /* "Export" */}
          </h2>
        </div>
        <p className="text-[12.5px] text-text-muted leading-snug">
          {t.profile.exportDescription}
        </p>
        <div className="pt-1">
          <ExportDataButton />
        </div>
      </section>

      {/* CLOSE ACCOUNT — GDPR Art 17 */}
      <section className="rounded-xl border border-no-700/60 bg-no-500/[0.06] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <I.alertOctagon s={15} className="text-no-300" />
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t.profile.closeAccount}
          </h2>
          <span className="ml-auto inline-flex items-center rounded-pill border border-no-700 bg-no-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-no-300">
            {t.common.oneWay}
          </span>
        </div>
        <p className="text-[12.5px] text-text-muted leading-snug">
          {t.profile.closeAccountDescription}
        </p>
        <CloseAccountForm />
        <p className="font-mono text-[11px] text-text-subtle">
          {t.common.help}? {t.common.email} <span className="text-text-muted">{SUPPORT_EMAIL()}</span>{" "}
          {t.common.or} <span className="text-text-muted">{SUPPORT_PHONE()}</span>.
        </p>
      </section>
    </main>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-overlay/40 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-subtle">
        {label}
      </p>
      <p className="mt-0.5 font-display text-[13px] font-semibold text-text">{value}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "yes" | "no" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "yes"     ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "no"      ? "border-no-700 bg-no-500/10 text-no-300"
    :                      "border-warning-border bg-warning-bg/40 text-warning-fg";
  return (
    <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${cls}`}>
      {children}
    </span>
  );
}
