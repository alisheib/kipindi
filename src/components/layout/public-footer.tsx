/**
 * Unified public footer. Visible on every player-facing page.
 * Carries the regulator-required disclosures: 18+ badge, license stub,
 * problem-gambling helpline, GDPR/PDPA rights links, and a link to the
 * provably-fair verifier.
 *
 * LCCP §SR Code 5.1.5 (visible age + RG messaging on every page).
 */
import Link from "next/link";
import { FiftyMark } from "@/components/brand";

export function PublicFooter() {
  const license = process.env.NEXT_PUBLIC_LICENSE_REF ?? "TZ-GBT-2026-XXXX (pending)";
  return (
    <footer className="mt-12 bg-bg-elevated/40">
      {/* Heraldic claret rule with gilt midpoint — regulator/footer chrome. */}
      <div aria-hidden className="claret-rule mx-auto max-w-[1480px]" />
      <div className="mx-auto max-w-[1480px] px-3 lg:px-6 pt-2 pb-7 grid grid-cols-1 md:grid-cols-4 gap-6 text-[12px]">
        {/* Brand + license */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-label="18 plus only"
              className="inline-flex items-center justify-center w-7 h-7 rounded-pill border-2 border-no-700 text-no-300 font-display font-bold text-[11px]"
            >
              18+
            </span>
            <FiftyMark size={20} />
            <span className="font-display font-bold text-[14px] text-text">50pick</span>
          </div>
          <p className="text-text-muted leading-relaxed text-[12px]">
            Licensed by the Gaming Board of Tanzania.
          </p>
          <p className="font-mono text-[11px] text-text-subtle tabular-nums">
            License: {license}
          </p>
          <p className="font-mono text-[11px] text-text-subtle">
            © {new Date().getFullYear()} 50pick · Tanzania
          </p>
        </div>

        <FooterCol heading="Play safe" sw="Cheza salama">
          <FooterLink href="/profile/responsible-gambling">Set limits</FooterLink>
          <FooterLink href="/legal/responsible-gambling">Take a break / Self-exclude</FooterLink>
          <li>
            <a href="tel:0800110011" className="text-text-muted hover:text-text transition-colors">
              Helpline · 0800 11 0011
            </a>
          </li>
          <li className="italic text-text-subtle text-[11.5px]">
            If gambling stops being fun, stop.
          </li>
        </FooterCol>

        <FooterCol heading="Fairness" sw="Uadilifu">
          <FooterLink href="/fairness">Provably-fair Mapigo</FooterLink>
          <FooterLink href="/proposals">Propose markets &amp; get paid</FooterLink>
          <FooterLink href="/legal/terms">Game RTP &amp; rules</FooterLink>
          <FooterLink href="/help">Help &amp; support</FooterLink>
        </FooterCol>

        <FooterCol heading="Privacy" sw="Faragha">
          <FooterLink href="/legal/privacy">Privacy notice</FooterLink>
          <FooterLink href="/legal/aml">AML / KYC policy</FooterLink>
          <FooterLink href="/legal/terms">Terms of service</FooterLink>
          <FooterLink href="/profile/account">Export / close my account</FooterLink>
        </FooterCol>
      </div>
    </footer>
  );
}

function FooterCol({
  heading, sw, children,
}: { heading: string; sw: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
        {heading} <span className="opacity-70 font-normal italic normal-case tracking-normal">· {sw}</span>
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href as never}
        className="text-text-muted hover:text-text transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
