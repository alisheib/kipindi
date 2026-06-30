import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.help };
}

const FAQ_KEYS = ["faq1", "faq2", "faq3", "faq4", "faq5", "faq6", "faq7", "faq8"] as const;

export default async function HelpPage() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(900px 360px at 100% 0%, oklch(58% 0.13 80 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
            {t.help.pageTitle}
          </p>
          <h1 className="mt-1 font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.help.heading}
          </h1>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactCard
          icon={<I.phone s={15} />}
          tone="yes"
          title={t.help.callUs}
          value={SUPPORT_PHONE()}
          sub={t.help.freeHelpline}
          href={`tel:${SUPPORT_PHONE_TEL()}`}
        />
        <ContactCard
          icon={<I.mail s={15} />}
          tone="info"
          title={t.help.emailLabel}
          value={SUPPORT_EMAIL()}
          sub={t.help.emailReply}
          href={`mailto:${SUPPORT_EMAIL()}`}
        />
        <ContactCard
          icon={<I.comment s={15} />}
          tone="gold"
          title={t.help.liveChat}
          value={t.help.inApp}
          sub={t.help.tapChatBubble}
        />
      </section>

      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-2">
        <h2 className="font-display text-[15px] font-semibold text-text">
          {t.help.faqTitle}
        </h2>
        <div>
          {FAQ_KEYS.map((key) => (
            <details
              key={key}
              className="group border-t border-border first:border-t-0 py-3"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-display text-[13.5px] font-semibold text-text">
                <span>{t.help[`${key}q` as keyof typeof t.help]}</span>
                <span className="mt-1 shrink-0 text-text-subtle transition-transform group-open:rotate-180">
                  <I.chevronDown s={13} />
                </span>
              </summary>
              <p className="mt-2 text-[12.5px] text-text-muted leading-relaxed">
                {t.help[`${key}a` as keyof typeof t.help]}
                {key === "faq5" && ` ${SUPPORT_PHONE()} (${t.common.free}).`}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLinkCard
          icon={<I.shieldcheck s={15} />}
          title={t.help.responsibleGambling}
          sub={t.help.limitsBreakExclude}
          href="/profile/responsible-gambling"
        />
        <QuickLinkCard
          icon={<I.wallet s={15} />}
          title={t.help.walletHelp}
          sub={t.help.depositWithdrawHolds}
          href="/wallet"
        />
        <QuickLinkCard
          icon={<I.trophy s={15} />}
          title={t.help.myPositions}
          sub={t.help.openSettledCashOut}
          href="/positions"
        />
      </section>

      <p className="pt-2 text-center font-mono text-[11px] tabular-nums text-text-subtle">
        {t.help.disclaimer}
      </p>
    </main>
  );
}

function ContactCard({
  icon, tone, title, value, sub, href,
}: {
  icon: React.ReactNode;
  tone: "yes" | "info" | "gold";
  title: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const tintCls =
    tone === "yes"   ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "info"  ? "border-info-border bg-info-bg/30 text-info-fg"
    :                    "border-gold-700 bg-gold-500/10 text-gold-300";
  const card = (
    <div className="rounded-xl glass-panel p-4 space-y-2 hover:border-gold-700 transition-colors h-full">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${tintCls}`}>
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-subtle">
          {title}
        </span>
      </div>
      <p className="font-display font-bold text-[15px] text-text break-all">{value}</p>
      <p className="text-[11.5px] text-text-subtle">{sub}</p>
    </div>
  );
  return href ? <a href={href} className="block">{card}</a> : card;
}

function QuickLinkCard({
  icon, title, sub, href,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href as never}
      className="flex items-center gap-3 rounded-xl glass-panel p-4 hover:border-gold-700 transition-colors"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold-500/10 text-gold-300 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13px] font-semibold text-text truncate">{title}</p>
        <p className="mt-0.5 text-[11px] text-text-subtle">{sub}</p>
      </div>
    </Link>
  );
}
