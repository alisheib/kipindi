import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PushSettings } from "@/components/settings/push-settings";
import { getSession } from "@/lib/server/session";
import { listWatchedMarketIds } from "@/lib/server/watchlist-service";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { db } from "@/lib/server/store";
import { marketingToggleState } from "@/lib/server/marketing/consent";
import type { MarketingToggleState } from "@/lib/server/marketing/consent";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/server/support-config";
import type { Dict } from "@/lib/i18n-server";
import { formatHeldUntil } from "./held-until";
import { MarketingConsent, MarketingTitle } from "./marketing-consent";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Notifications", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.push.pageTitle };
}
export const dynamic = "force-dynamic";

/**
 * ⚠️ DEV ONLY — `?qa_consent=unreadable` renders the card a failed read produces, so it can be photographed:
 * the in-memory store cannot be made to fail a read from a browser. ⛔ A no-op in production, whatever the
 * query says — the same rule as `/s/[token]`'s QA hold and every `api/dev-test` route.
 */
function qaUnreadable(sp: Record<string, string | string[] | undefined>): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = Array.isArray(sp.qa_consent) ? sp.qa_consent[0] : sp.qa_consent;
  return v === "unreadable";
}

export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/notifications");
  const [watched, user] = await Promise.all([
    listWatchedMarketIds(session.userId).catch(() => [] as string[]),
    Promise.resolve(db.user.findById(session.userId)).catch(() => null),
  ]);
  // D4 · the switch shows the EFFECTIVE consent (`marketingToggleState`), never the bare boolean.
  // ⛔ A failed read is null, and null renders the card WITHOUT a switch (never a guessed state).
  const marketing: MarketingToggleState | null = user && !qaUnreadable(await searchParams)
    ? await marketingToggleState(user).catch(() => null)
    : null;

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader tone="info" icon={<I.bellRing s={22} />} eyebrow={t.push.eyebrow} title={t.push.pageTitle} />

      <PushSettings />

      {/* E-409 · marketing consent, withdrawable at any time (Privacy §3). 🔴 It used to be LEFT OFF the page
          when a read failed, and /s and Privacy §3 both send people here to withdraw: they found no control and
          no reason. ⭐ Now the card stays, without a switch (a guessed state would be a lie about a consent),
          saying so and naming our desk. D4b · `held` = a break or self-exclusion is in force, and its end
          date is written in the page's language (held-until.ts). */}
      {marketing ? (
        <MarketingConsent
          initialOn={marketing.on}
          initialPaused={marketing.paused}
          held={marketing.held}
          heldUntil={marketing.heldUntil ? formatHeldUntil(marketing.heldUntil, locale, t.common.monthsShort) : null}
        />
      ) : (
        <MarketingConsentUnavailable t={t} />
      )}

      {/* Watchlist summary — what these alerts are actually about. ⭐ The WHOLE ROW is the link (consent-08):
          its only target used to be a bare 11px "0 >" at the far right, under the reading floor and covered
          by the floating chat button at 360. The count stays, as the row's value. */}
      <Link
        href={"/watchlist" as never}
        className="group block rounded-xl glass-panel p-5 transition-colors hover:border-brand-400"
        data-testid="notifications-watchlist"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215)
                and `h-10` renders 80px. */}
            <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
              <I.star s={17} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.watchlist.title}</p>
              <p className="mt-0.5 text-body-sm text-text-subtle leading-snug text-pretty break-keep [overflow-wrap:anywhere]">{t.watchlist.alertsHint}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 font-mono text-body-sm tabular-nums text-accent-400 group-hover:text-text">
            {watched.length}
            <I.chevronRight s={12} />
          </span>
        </div>
      </Link>
    </PageContainer>
  );
}

/**
 * The consent card when its state could not be read: the same tile and title, no switch, what to do, and
 * our own desk read on the SERVER from `support-config` — ⛔ never the independent helpline, which is not
 * ours to route a marketing request to (the `/s/[token]` refusal's rule).
 */
function MarketingConsentUnavailable({ t }: { t: Dict }) {
  const phone = SUPPORT_PHONE();
  const email = SUPPORT_EMAIL();
  const link = "inline-flex min-h-[44px] flex-wrap items-center gap-x-[0.28em] text-body-sm text-text-muted hover:text-text transition-colors";
  return (
    <section className="rounded-xl glass-panel p-5" data-testid="marketing-consent-unavailable">
      <div className="flex items-start gap-3 min-w-0">
        <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-300">
          <I.megaphone s={17} />
        </span>
        <div className="min-w-0">
          <MarketingTitle text={t.push.marketingTitle} />
          {/* break-keep: zh breaks only at the phrase hints its string carries (consent-02 split 联系|我们). */}
          <p className="mt-0.5 text-body-sm text-text-subtle leading-snug text-pretty break-keep [overflow-wrap:anywhere]">{t.push.marketingUnavailable}</p>
          <div className="mt-1 flex flex-col items-start">
            <a href={`tel:${SUPPORT_PHONE_TEL()}`} className={link}>
              <span className="whitespace-nowrap">{t.footer.contactUs} ·</span>{" "}<span className="whitespace-nowrap">{phone}</span>
            </a>
            <a href={`mailto:${email}`} className={link}>
              <span className="whitespace-nowrap">{t.footer.email} ·</span>{" "}<span className="whitespace-nowrap">{email}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
