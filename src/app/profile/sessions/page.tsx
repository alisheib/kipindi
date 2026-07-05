import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { BackLink } from "@/components/ui/back-link";
import { FiftyMark } from "@/components/brand";
import { getSession } from "@/lib/server/session";
import { formatDateTime } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Active sessions" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/sessions");

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const issued = formatDateTime(new Date(session.iat).toISOString());
  const expires = formatDateTime(new Date(session.exp).toISOString());

  const ua = userAgent.toLowerCase();
  const device = /iphone|android|ipad|mobile/.test(ua) ? t.profile.deviceMobile : t.profile.deviceDesktop;
  const browser = /chrome\//.test(ua) ? "Chrome"
    : /safari\//.test(ua) && !/chrome/.test(ua) ? "Safari"
    : /firefox\//.test(ua) ? "Firefox"
    : /edg\//.test(ua) ? "Edge"
    : "Unknown";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />

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
            <I.device s={14} className="text-info-fg" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              {t.profile.activeSessions}
            </p>
          </div>
          <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.profile.activeSessions}
          </h1>
          <p className="mt-1 text-[13px] text-text-muted">
            {t.profile.sessionsDescription}
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-info-border bg-info-bg/[0.10] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <I.device s={16} className="text-info-fg" />
            <p className="font-display text-[14.5px] font-semibold text-text">{device} · {browser}</p>
            <Chip variant="yes" size="sm">{t.profile.thisDevice}</Chip>
          </div>
          <form action="/auth/logout" method="POST" className="inline-flex">
            <button
              type="submit"
              className="btn btn-ghost btn-sm"
            >
              <I.logOut s={13} />
              {t.common.signOut}
            </button>
          </form>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Item label={t.profile.sessionId} value={<span className="font-mono break-all">{session.sessionId.slice(0, 22)}…</span>} />
          <Item label={t.profile.ipAddress} value={<span className="font-mono">{ip}</span>} />
          <Item label={t.profile.issued}     value={issued} />
          <Item label={t.profile.expires}    value={expires} />
          <Item label={t.profile.roleLabel}       value={session.role} />
          <Item label={t.profile.kycLabel}        value={session.kycStatus} />
        </div>
      </section>

      <section className="flex items-start gap-2.5 rounded-xl border border-info-border bg-info-bg/[0.10] p-4">
        <I.shieldcheck s={16} />
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

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-overlay/40 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-subtle">
        {label}
      </p>
      <p className="mt-0.5 font-display text-[13px] font-semibold text-text break-all">{value}</p>
    </div>
  );
}
