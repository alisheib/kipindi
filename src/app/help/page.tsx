import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { isChatbotEnabled } from "@/lib/server/ai-controls";
import { fill, fmtRate, pctNum } from "@/lib/utils";
import { durationHours } from "@/lib/duration-phrase";
import { PageContainer } from "@/components/layout/page-container";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.help };
}

// C2i — per-FAQ topic glyphs (help is support, not earned money → info/neutral,
// never gold).
const FAQ_ITEMS = [
  { key: "faq1", glyph: "percent" },          // how markets work
  { key: "faq2", glyph: "activity" },         // odds move
  { key: "faq3", glyph: "arrowUpFromLine" },  // withdraw
  { key: "faq4", glyph: "idCard" },           // verify identity
  { key: "faq5", glyph: "pause" },            // gambling problem / take a break
  { key: "faq6", glyph: "cashOut" },          // cash out
  { key: "faq7", glyph: "alertCircle" },      // voided
  { key: "faq8", glyph: "shieldcheck" },      // fairness
] as const;

export default async function HelpPage() {
  const { t, locale } = await getServerT();
  // The FAQ quotes the LIVE rates — i.e. what a poll created right now would be
  // priced at. The numbers are interpolated, never written into the copy: a
  // hardcoded "9%" in an FAQ was true the day it shipped and false ever after.
  const cfg = await getEffectiveConfig();
  // ⛔ THE SAME READ THE ROOT LAYOUT USES TO MOUNT THE WIDGET (`layout.tsx:101`),
  // including its `.catch(() => true)`. Two surfaces answering "is live chat
  // available?" from two sources is how they came to disagree in the first place;
  // if the read fails, both fail the same way rather than one advertising a
  // channel the other did not mount. E-123.
  const chatEnabled = await isChatbotEnabled().catch(() => true);
  return (
    <PageContainer tier="reading" className="space-y-5">
      <PageHero glow="info">
        <PageHeader tone="info" eyebrow={t.help.pageTitle} title={t.help.heading} />
      </PageHero>

      {/* 🔴 E-123 — THE LIVE-CHAT CARD FOLLOWS THE SWITCH THAT MOUNTS THE WIDGET.
          It used to be unconditional, so this page offered *"LIVE CHAT · In-app ·
          Tap the chat bubble"* as one of three support channels while
          `layout.tsx:101` gated the whole widget behind `isChatbotEnabled()` —
          and that flag is OFF in production. Measured 2026-08-06: `.cm-bubble`
          count is **0** on `/`, `/help` and `/markets`, and the ChatRoot chunk is
          never even fetched, while its non-gated sibling FirstVisitPrimer renders
          normally on the same load. So a player in trouble was told to tap a
          control that does not exist, on the one page they reach when stuck.
          ⛔ The remedy is the CARD FOLLOWING THE FLAG, not deleting the card: the
          day an operator switches the chatbot back on, the channel re-advertises
          itself. A deletion would have to be remembered.
          ⚠️ The grid drops to two columns with it, or two cards stretch across
          three and the row reads as a missing tile. */}
      <section className={`grid grid-cols-1 gap-3 ${chatEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
        {chatEnabled && (
          <ContactCard
            icon={<I.comment s={15} />}
            tone="aqua"
            title={t.help.liveChat}
            value={t.help.inApp}
            sub={t.help.tapChatBubble}
          />
        )}
      </section>

      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-2">
        <h2 className="font-display text-[15px] font-semibold text-text">
          {t.help.faqTitle}
        </h2>
        <div>
          {FAQ_ITEMS.map(({ key, glyph }) => {
            const Glyph = I[glyph];
            return (
              <details
                key={key}
                className="group border-t border-border first:border-t-0 py-3"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-display text-[13.5px] font-semibold text-text">
                  <span className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 shrink-0 text-brand-300"><Glyph s={15} /></span>
                    <span>{t.help[`${key}q` as keyof typeof t.help]}</span>
                  </span>
                  <span className="mt-1 shrink-0 text-text-subtle transition-transform group-open:rotate-180">
                    <I.chevronDown s={13} />
                  </span>
                </summary>
                <p className="mt-2 pl-[25px] text-body-sm text-text-muted leading-relaxed">
                  {/* The fee FAQ (faq1) is model-specific: loser-share polls charge a
                      % of the losing side, not a capped commission on the pool. */}
                  {key === "faq1" && cfg.feeModel === "loser-share"
                    ? fill(t.help.faq1aLoser, { pct: pctNum((cfg.platformFeeRate ?? 0) + (cfg.operatorFeeRate ?? 0)) })
                    : fill(t.help[`${key}a` as keyof typeof t.help], { pct: pctNum(cfg.commissionRate), ceiling: fmtRate(cfg.feeCeilingRate), hours: durationHours(locale, cfg.objectionWindowHours) })}
                  {key === "faq5" && ` ${SUPPORT_PHONE()} (${t.common.free}).`}
                </p>
              </details>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLinkCard
          icon={<I.shieldcheck s={15} />}
          tone="yes"
          title={t.help.responsibleGambling}
          sub={t.help.limitsBreakExclude}
          href="/profile/responsible-gambling"
        />
        <QuickLinkCard
          icon={<I.wallet s={15} />}
          tone="info"
          title={t.help.walletHelp}
          sub={t.help.depositWithdrawHolds}
          href="/wallet"
        />
        <QuickLinkCard
          icon={<I.portfolio s={15} />}
          tone="aqua"
          title={t.help.myPositions}
          sub={t.help.openSettledCashOut}
          href="/positions"
        />
      </section>

      <p className="pt-2 text-center font-mono text-[11px] tabular-nums text-text-subtle">
        {t.help.disclaimer}
      </p>
    </PageContainer>
  );
}

function ContactCard({
  icon, tone, title, value, sub, href,
}: {
  icon: React.ReactNode;
  tone: "yes" | "info" | "aqua";
  title: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const tintCls =
    tone === "yes"   ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "info"  ? "border-info-border bg-info-bg text-info-fg"
    :                    "border-aqua-500/50 bg-aqua-500/10 text-aqua-300";
  const card = (
    <div className="rounded-xl glass-panel p-4 space-y-2 hover:border-brand-400 transition-colors h-full">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${tintCls}`}>
          {icon}
        </span>
        <span className="font-mono text-micro uppercase eyebrow font-semibold text-text-subtle">
          {title}
        </span>
      </div>
      <p className="font-display font-bold text-[15px] text-text break-all">{value}</p>
      <p className="text-body-sm text-text-subtle">{sub}</p>
    </div>
  );
  return href ? <a href={href} className="block">{card}</a> : card;
}

function QuickLinkCard({
  icon, title, sub, href, tone,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string;
  tone: "yes" | "info" | "aqua";
}) {
  // C2i — tone-coded quick links (never gold; help isn't earned money).
  const tint =
    tone === "yes"  ? "bg-yes-500/10 text-yes-300"
    : tone === "info" ? "bg-info-bg text-info-fg"
    :                   "bg-aqua-500/10 text-aqua-300";
  return (
    <Link
      href={href as never}
      className="flex items-center gap-3 rounded-xl glass-panel p-4 hover:border-brand-400 transition-colors"
    >
      {/* ⚠️ LITERALS, not `h-9 w-9` — spacing is overridden (tailwind.config.ts:200-215), so
          `h-9` was 64px: 24px larger than the 40px badge on this very same page. */}
      <span className={`inline-flex h-[40px] w-[40px] items-center justify-center rounded-md shrink-0 ${tint}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13px] font-semibold text-text truncate">{title}</p>
        <p className="mt-0.5 text-body-sm text-text-subtle">{sub}</p>
      </div>
    </Link>
  );
}
