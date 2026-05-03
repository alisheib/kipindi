/**
 * Unified public footer. Visible on every player-facing page.
 * Carries the regulator-required disclosures: 18+ badge, license stub,
 * problem-gambling helpline, GDPR/PDPA rights links, and a link to the
 * provably-fair verifier so anyone can audit Mapigo round outcomes.
 *
 * LCCP §SR Code 5.1.5 (visible age + RG messaging on every page).
 */
import Link from "next/link";

export function PublicFooter() {
  const license = process.env.NEXT_PUBLIC_LICENSE_REF ?? "TZ-GBT-2026-XXXX (pending)";
  return (
    <footer className="mt-10 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-[1240px] px-3 lg:px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-5 text-caption">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span aria-label="18 plus only" className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-danger text-danger font-display font-bold text-body-sm">
              18+
            </span>
            <span className="font-display font-bold text-body-sm text-text">Kipindi</span>
          </div>
          <p className="text-text-tertiary leading-relaxed">
            Licensed by the Gaming Board of Tanzania.
            <br />
            <span className="font-mono text-text-secondary">License: {license}</span>
          </p>
          <p className="text-text-tertiary">© {new Date().getFullYear()} Kipindi · Tanzania</p>
        </div>

        <div className="space-y-1.5">
          <p className="font-bold uppercase tracking-[0.16em] text-text-secondary">Play safe · Cheza salama</p>
          <ul className="space-y-1 text-text-tertiary">
            <li><Link href={"/profile/responsible-gambling" as never} className="hover:text-text">Set limits</Link></li>
            <li><Link href={"/legal/responsible-gambling" as never} className="hover:text-text">Take a break / Self-exclude</Link></li>
            <li>
              <a href="tel:0800110011" className="hover:text-text">Helpline · 0800 11 0011</a>
            </li>
            <li className="text-text-secondary italic">If gambling stops being fun, stop.</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-bold uppercase tracking-[0.16em] text-text-secondary">Fairness · Uadilifu</p>
          <ul className="space-y-1 text-text-tertiary">
            <li><Link href={"/fairness" as never} className="hover:text-text">Provably-fair Mapigo</Link></li>
            <li><Link href={"/legal/terms" as never} className="hover:text-text">Game RTP &amp; rules</Link></li>
            <li><Link href={"/help" as never} className="hover:text-text">Help &amp; support</Link></li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-bold uppercase tracking-[0.16em] text-text-secondary">Privacy · Faragha</p>
          <ul className="space-y-1 text-text-tertiary">
            <li><Link href={"/legal/privacy" as never} className="hover:text-text">Privacy notice</Link></li>
            <li><Link href={"/legal/aml" as never} className="hover:text-text">AML / KYC policy</Link></li>
            <li><Link href={"/legal/terms" as never} className="hover:text-text">Terms of service</Link></li>
            <li><Link href={"/profile/account" as never} className="hover:text-text">Export / close my account</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
