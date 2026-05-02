import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Phone, Mail, MessageCircle, ShieldCheck, Wallet, Trophy } from "lucide-react";

export const metadata = { title: "Help · Msaada" };

const FAQS = [
  {
    q: "How does pool betting work? · Bwawa hulipa vipi?",
    a: "Stakes from every player on the same time-window join one pool. When the window closes, the winning side shares the pool — the bigger your stake relative to the winning pool, the bigger your share. The pay-rate shown at placement is the rate at that instant; the final rate is determined when the pool closes.",
  },
  {
    q: "What's a window? · Kipindi ni nini?",
    a: "A window is a slice of the match: 0–15 minutes, 15–30, 30–45, 45–60, or full-time. Each window is its own pool. Pick the window you want to bet on, then pick home, away, or draw within that window.",
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
    q: "Mapigo · how does it work? · Mapigo inavyofanya kazi?",
    a: "Mapigo is an in-play prediction game. Every 60 seconds a new round opens with three calls: SPIKE (a peak in match intensity), DRIFT (a gentle shift), or CALM (no notable events). Pick one before the round closes. Winners share the round's pool.",
  },
  {
    q: "What if a match is abandoned? · Mechi ikifutwa?",
    a: "Bets on abandoned matches are voided and stakes refunded to your wallet. Settlement corrections by the league within 24 hours of full-time are honored — see Terms §6.",
  },
  {
    q: "Can I cash out before the window closes? · Nitatoa dau mapema?",
    a: "Yes. On every active match bet, an offer to cash out is shown in My Bets. The offer reflects current pool dynamics. Once accepted, the bet flips to CASHED_OUT and funds return to your wallet.",
  },
];

export default function HelpPage() {
  return (
    <div className="relative">
      <Pattern kind="sokoni" opacity={0.025} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative mx-auto max-w-3xl px-3 lg:px-6 py-6 lg:py-8 space-y-5">
        <Breadcrumbs items={[{ label: "Help", labelSw: "Msaada" }]} />

        <header>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Help · Msaada</p>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">How can we help? · Tunaweza kukusaidiaje?</h1>
        </header>

        {/* CONTACT */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ContactCard
            icon={<Phone size={18} className="text-success" />}
            title="Call us"
            value="+255 22 211 5811"
            sub="Free helpline · 24/7"
            href="tel:+255222115811"
          />
          <ContactCard
            icon={<Mail size={18} className="text-royal" />}
            title="Email"
            value="support@kipindi.co.tz"
            sub="Reply within 4h on business days"
            href="mailto:support@kipindi.co.tz"
          />
          <ContactCard
            icon={<MessageCircle size={18} className="text-gold" />}
            title="Live chat"
            value="In-app"
            sub="Coming soon"
          />
        </div>

        {/* FAQ */}
        <Card>
          <CardBody className="p-5 lg:p-6 space-y-3">
            <h2 className="font-display font-bold text-title-sm text-text">Frequently asked · Maswali yanayoulizwa</h2>
            <div className="divide-y divide-border-subtle">
              {FAQS.map((f, i) => (
                <details key={i} className="group py-3">
                  <summary className="cursor-pointer flex items-start justify-between gap-3 text-body-sm font-semibold text-text list-none">
                    <span>{f.q}</span>
                    <span aria-hidden className="text-text-tertiary group-open:rotate-180 transition-transform shrink-0 mt-0.5">▾</span>
                  </summary>
                  <p className="text-body-sm text-text-secondary leading-relaxed mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLinkCard icon={<ShieldCheck size={16} />} title="Responsible gambling" sub="Limits · break · self-exclude" href="/profile/responsible-gambling" />
          <QuickLinkCard icon={<Wallet size={16} />}      title="Wallet help"          sub="Deposit · withdraw · holds"   href="/wallet" />
          <QuickLinkCard icon={<Trophy size={16} />}      title="My bets"               sub="Active · settled · cash-out"  href="/bets" />
        </div>

        <p className="text-caption text-text-tertiary text-center pt-4">
          18+. Play responsibly. Mainland Tanzania + Zanzibar only.
        </p>
      </div>
    </div>
  );
}

function ContactCard({ icon, title, value, sub, href }: { icon: React.ReactNode; title: string; value: string; sub: string; href?: string }) {
  const inner = (
    <Card interactive={!!href}>
      <CardBody className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-text-tertiary">{icon}<span className="text-caption uppercase tracking-wide">{title}</span></div>
        <p className="font-display font-bold text-body text-text break-all">{value}</p>
        <p className="text-caption text-text-tertiary">{sub}</p>
      </CardBody>
    </Card>
  );
  return href ? <a href={href} className="block">{inner}</a> : inner;
}

function QuickLinkCard({ icon, title, sub, href }: { icon: React.ReactNode; title: string; sub: string; href: string }) {
  return (
    <a href={href} className="block">
      <Card interactive>
        <CardBody className="p-4 flex items-center gap-3">
          <span className="h-9 w-9 rounded-md bg-royal-subtle text-royal inline-flex items-center justify-center shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-text truncate">{title}</p>
            <p className="text-caption text-text-tertiary">{sub}</p>
          </div>
        </CardBody>
      </Card>
    </a>
  );
}
