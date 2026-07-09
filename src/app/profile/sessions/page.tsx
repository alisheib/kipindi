import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { IpReveal } from "@/components/profile/ip-reveal";
import { getSession } from "@/lib/server/session";
import { formatDateTime } from "@/lib/utils";
import { getServerT, type Dict } from "@/lib/i18n-server";

export const metadata = { title: "Active sessions" };
export const dynamic = "force-dynamic";

// Relative "2h ago" using the shared generic ago-suffixes (proposals.*Ago).
function timeAgo(ms: number, t: Dict): string {
  const diff = Math.max(0, Date.now() - ms);
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d} ${t.proposals.dAgo}`;
  const h = Math.floor(diff / 3_600_000);
  if (h > 0) return `${h} ${t.proposals.hAgo}`;
  const m = Math.floor(diff / 60_000);
  return `${m} ${t.proposals.mAgo}`;
}

export default async function SessionsPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/sessions");

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const expires = formatDateTime(new Date(session.exp).toISOString());

  const ua = userAgent.toLowerCase();
  const isMobile = /iphone|android|ipad|mobile/.test(ua);
  const browser = /edg\//.test(ua) ? "Edge"
    : /chrome\//.test(ua) ? "Chrome"
    : /firefox\//.test(ua) ? "Firefox"
    : /safari\//.test(ua) && !/chrome/.test(ua) ? "Safari"
    : null;
  const os = /android/.test(ua) ? "Android"
    : /iphone|ipad|ipod/.test(ua) ? "iOS"
    : /windows/.test(ua) ? "Windows"
    : /mac os x|macintosh/.test(ua) ? "macOS"
    : /linux/.test(ua) ? "Linux"
    : null;
  // Honest device label — "Chrome on Android" when both parse, else the coarse
  // Mobile/Desktop bucket. We do NOT geolocate the IP, so no city is shown
  // (fabricating "Dar es Salaam" would be a trust breach — same discipline as
  // the never-faked regulator seal).
  const deviceLine = browser && os ? `${browser} on ${os}`
    : browser ?? os ?? (isMobile ? t.profile.deviceMobile : t.profile.deviceDesktop);

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />

      <PageHero glow="info">
        <PageHeader
          tone="info"
          icon={<I.device s={14} className="text-info-fg" />}
          eyebrow={t.profile.activeSessions}
          title={t.profile.activeSessions}
        />
        <p className="mt-1 text-[13px] text-text-muted">
          {t.profile.sessionsDescription}
        </p>
      </PageHero>

      {/* Device card — the current (and, by the single-active-session model, the
          only) session. 2px aqua left rule + "This device" chip mark it as live. */}
      <section className="rounded-xl border border-border bg-bg-elevated p-5 border-l-2" style={{ borderLeftColor: "var(--aqua-400)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-500/15 text-aqua-300">
              <I.smartphone s={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-[15px] font-semibold text-text leading-tight">{deviceLine}</p>
                <Chip variant="info" size="sm">{t.profile.thisDevice}</Chip>
              </div>
              <p className="mt-1 font-mono text-[11.5px] text-text-subtle tabular-nums">
                {t.profile.issued} {timeAgo(session.iat, t)} · {t.profile.expires} {expires}
              </p>
            </div>
          </div>
          {/* Destructive: ends this (the only) session → ghost button with claret
              text. Inline colour beats .btn-ghost's own `color: var(--text)`. */}
          <form action="/auth/logout" method="POST" className="inline-flex shrink-0">
            <button type="submit" className="btn btn-ghost btn-sm" style={{ color: "var(--no-300)" }}>
              <I.logOut s={13} />
              {t.common.signOut}
            </button>
          </form>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-subtle">
            {t.profile.ipAddress}
          </p>
          <IpReveal ip={ip} />
        </div>
      </section>

      <section className="flex items-start gap-2.5 rounded-xl border border-info-border bg-info-bg/[0.10] p-4">
        <I.shieldcheck s={16} className="shrink-0 text-info-fg" />
        <div className="text-[12px] text-text-muted leading-snug space-y-1">
          <p className="font-display font-semibold text-text">{t.profile.sessionSecurity}</p>
          <p>
            {t.profile.sessionSecurityBody}
          </p>
        </div>
      </section>
    </main>
  );
}
