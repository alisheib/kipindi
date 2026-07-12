import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PushSettings } from "@/components/settings/push-settings";
import { getSession } from "@/lib/server/session";
import { listWatchedMarketIds } from "@/lib/server/watchlist-service";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/notifications");
  const watched = await listWatchedMarketIds(session.userId).catch(() => [] as string[]);

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader tone="info" icon={<I.bellRing s={22} />} eyebrow={t.push.eyebrow} title={t.push.pageTitle} />

      <PushSettings />

      {/* Watchlist summary — what these alerts are actually about. */}
      <section className="rounded-xl glass-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
              <I.star s={17} />
            </span>
            <div>
              <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.watchlist.title}</p>
              <p className="mt-0.5 text-[12px] text-text-subtle leading-snug">{t.watchlist.alertsHint}</p>
            </div>
          </div>
          <Link href={"/watchlist" as never} className="inline-flex items-center gap-1 shrink-0 font-mono text-[11px] text-accent-400 hover:text-text underline">
            {watched.length}
            <I.chevronRight s={12} />
          </Link>
        </div>
      </section>
    </main>
  );
}
