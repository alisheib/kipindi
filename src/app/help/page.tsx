import { Phone, Mail, MessageCircle, ShieldCheck, Wallet, Trophy, ChevronDown } from "lucide-react";
import { FiftyMark } from "@/components/brand";

export const metadata = { title: "Help · Msaada" };

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do price-competition markets work? · Soko la ushindani wa bei linafanyaje?",
    a: "Stakes from every player on the same market join one pool — YES + NO together. After applying tax + commission (currently 9% combined), the net pool is paid out only to whichever side is correct, pro-rata to each correct stake's share of the winning side. The dial probability is implied by the current pool composition and updates with every new bet.",
  },
  {
    q: "Will my odds change after I place? · Bei zinabadilika baada ya kuweka dau?",
    a: "Your stake and the pool composition at the moment of placement are locked in for your payout calculation, but the implied probability you see on the dial is live and moves with every new bet. The bet-confirm popup locks the price for 5 seconds so you can confirm at the rate you saw.",
  },
  {
    q: "How do I withdraw winnings? · Nitatoa pesa zangu vipi?",
    a: "Open Wallet → Withdraw. Enter your mobile-money number, the amount, and an OTP code. Withdrawals under TZS 1,000,000 settle within 60 seconds. Larger amounts may be held for AML review for up to 24 hours.",
  },
  {
    q: "Why do I have to verify my identity? · Kwa nini nathibitisha kitambulisho?",
    a: "The Tanzania Gaming Act + Anti-Money-Laundering Act require us to verify every player's NIDA before any withdrawal. We do this once. After verification you can withdraw freely.",
  },
  {
    q: "I think I have a problem with gambling. What can I do? · Nina shida ya kucheza kupita kiasi.",
    a: "Open Profile → Responsible gambling. You can set deposit and time limits, take a break, or self-exclude. If you need to talk to someone, call the Tanzania Helpline +255 22 211 5811 (free).",
  },
  {
    q: "Can I cash out before resolution? · Nitatoa dau mapema?",
    a: "Yes. On every open position on a LIVE market, a Sell-now button shows the current sell-back value (with a small slippage buffer applied). Once accepted, the position flips to CASHED_OUT and funds return to your wallet.",
  },
  {
    q: "What if a market is voided? · Soko likifutwa?",
    a: "Bets on voided markets have their stakes refunded to your wallet. Settlement corrections by the source authority within 24 hours of resolution are honoured — see Terms §6.",
  },
  {
    q: "Is the platform fair? · Mfumo huu uko sawa?",
    a: "Every market move is recorded into a HMAC-chained audit trail. Resolutions cite a public source URL. The whole-pool math is published in the Terms and surfaced on the admin /admin/config page; tax + commission rates are visible to everyone.",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      <header className="relative overflow-hidden rounded-xl border border-border-strong bg-bg-elevated">
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
            Help · Msaada
          </p>
          <h1 className="mt-1 font-display text-[26px] lg:text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            How can we help?
          </h1>
          <p className="mt-1 text-[14px] italic text-text-subtle">Tunaweza kukusaidiaje?</p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactCard
          icon={<Phone size={15} />}
          tone="yes"
          title="Call us"
          titleSw="Tupigie"
          value="+255 22 211 5811"
          sub="Free helpline · 24/7"
          subSw="Mstari wa msaada bure · 24/7"
          href="tel:+255222115811"
        />
        <ContactCard
          icon={<Mail size={15} />}
          tone="info"
          title="Email"
          titleSw="Barua pepe"
          value="support@50pick.com"
          sub="Reply within 4h on business days"
          subSw="Tunajibu ndani ya saa 4 siku za kazi"
          href="mailto:support@50pick.com"
        />
        <ContactCard
          icon={<MessageCircle size={15} />}
          tone="gold"
          title="Live chat"
          titleSw="Mazungumzo ya moja kwa moja"
          value="In-app"
          sub="Coming soon"
          subSw="Inakuja hivi karibuni"
        />
      </section>

      <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-2">
        <h2 className="font-display text-[15px] font-semibold text-text">
          Frequently asked <span className="text-text-subtle italic font-normal">· Maswali</span>
        </h2>
        <div>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group border-t border-border first:border-t-0 py-3"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-display text-[13.5px] font-semibold text-text">
                <span>{f.q}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className="mt-1 shrink-0 text-text-subtle transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-[12.5px] text-text-muted leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLinkCard
          icon={<ShieldCheck size={15} />}
          title="Responsible gambling"
          titleSw="Kucheza kwa busara"
          sub="Limits · break · self-exclude"
          href="/profile/responsible-gambling"
        />
        <QuickLinkCard
          icon={<Wallet size={15} />}
          title="Wallet help"
          titleSw="Msaada wa pochi"
          sub="Deposit · withdraw · holds"
          href="/wallet"
        />
        <QuickLinkCard
          icon={<Trophy size={15} />}
          title="My positions"
          titleSw="Madau yangu"
          sub="Open · settled · cash-out"
          href="/positions"
        />
      </section>

      <p className="pt-2 text-center font-mono text-[11px] tabular-nums text-text-subtle">
        18+ · Play responsibly · Cheza kwa busara · Mainland Tanzania + Zanzibar only
      </p>
    </main>
  );
}

function ContactCard({
  icon, tone, title, titleSw, value, sub, subSw, href,
}: {
  icon: React.ReactNode;
  tone: "yes" | "info" | "gold";
  title: string;
  titleSw?: string;
  value: string;
  sub: string;
  subSw?: string;
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
          {title}{titleSw ? ` · ${titleSw}` : ""}
        </span>
      </div>
      <p className="font-display font-bold text-[15px] text-text break-all">{value}</p>
      <p className="text-[11.5px] text-text-subtle">{sub}</p>
      {subSw && <p className="text-[11px] italic text-text-tertiary">{subSw}</p>}
    </div>
  );
  return href ? <a href={href} className="block">{card}</a> : card;
}

function QuickLinkCard({
  icon, title, titleSw, sub, href,
}: {
  icon: React.ReactNode;
  title: string;
  titleSw?: string;
  sub: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl glass-panel p-4 hover:border-gold-700 transition-colors"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold-500/10 text-gold-300 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13px] font-semibold text-text truncate">{title}</p>
        {titleSw && <p className="text-[11px] italic text-text-tertiary truncate">{titleSw}</p>}
        <p className="mt-0.5 text-[11px] text-text-subtle">{sub}</p>
      </div>
    </a>
  );
}
