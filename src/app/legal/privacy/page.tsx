import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Legal", href: "/legal/terms" }, { label: "Privacy" }]} />
      <h1 className="font-display font-bold text-title-lg text-text">Privacy Policy</h1>
      <p className="text-caption text-text-tertiary">Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles.</p>

      <Section n="1" title="Data controller">
        <p>50pick Ltd, Dar es Salaam, Tanzania. Contact: <span className="font-mono">privacy@50pick.com</span>. Our data protection officer (DPO) is reachable at the same address.</p>
      </Section>

      <Section n="2" title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Identity</strong>: full name, date of birth, NIDA number, photographic ID</li>
          <li><strong>Contact</strong>: phone number (E.164), region</li>
          <li><strong>Financial</strong>: deposit and withdrawal records, mobile-money MSISDN, betting activity</li>
          <li><strong>Technical</strong>: IP address, device and browser fingerprint, session timestamps</li>
          <li><strong>Behavioural</strong>: time on platform, reality-check responses, limit changes</li>
        </ul>
      </Section>

      <Section n="3" title="Lawful basis">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Performance of contract</strong>: account, wallet, bet placement, settlement</li>
          <li><strong>Legal obligation</strong>: KYC under the Gaming Act, AML/CFT under POCA, tax under the Income Tax Act</li>
          <li><strong>Legitimate interest</strong>: fraud prevention, match-integrity monitoring, security alerting</li>
          <li><strong>Consent</strong>: marketing communications (revocable any time)</li>
        </ul>
      </Section>

      <Section n="4" title="Sharing">
        <p>We share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NIDA (identity verification, mTLS)</li>
          <li>Mobile-money aggregator (Selcom or Azampay) for payment routing</li>
          <li>Sportradar Integrity Services (suspicious-betting alerts)</li>
          <li>Gaming Board of Tanzania, Tanzania Revenue Authority, FIU when legally compelled</li>
          <li>Cloud infrastructure (encrypted at rest, TZ region preferred; failover in EU AWS Frankfurt)</li>
        </ul>
        <p>We never sell personal data.</p>
      </Section>

      <Section n="5" title="Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account + KYC records: 7 years after closure (AML statutory)</li>
          <li>Betting and transaction history: 7 years</li>
          <li>Audit log entries: 7 years</li>
          <li>Marketing preferences: until withdrawn or 2 years of inactivity</li>
        </ul>
      </Section>

      <Section n="6" title="Your rights">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access</strong>: request a copy of your data (delivered within 30 days)</li>
          <li><strong>Rectification</strong>: correct inaccurate data</li>
          <li><strong>Erasure</strong>: subject to AML retention requirements</li>
          <li><strong>Portability</strong>: receive your data in a machine-readable format</li>
          <li><strong>Objection</strong>: opt out of profiling for marketing</li>
          <li><strong>Complaint</strong>: with the Personal Data Protection Commission of Tanzania</li>
        </ul>
      </Section>

      <Section n="7" title="Cookies">
        <p>We use a minimum-necessary set: session authentication (HMAC-signed HttpOnly cookies, 7-day TTL),
        theme preference, language preference. No third-party advertising or tracking cookies.</p>
      </Section>

      <Section n="8" title="Security">
        <p>Sessions signed with HMAC-SHA-256. OTP codes hashed with scrypt + per-OTP salt + global pepper.
        Passwords (when introduced) will use Argon2id. All data in transit over TLS 1.2+. At-rest encryption via
        AES-256 in the database tier. Annual ISO 27001 audit cadence; pentest twice a year.</p>
      </Section>
    </>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 pt-4">
      <h2 className="font-display font-bold text-title-sm text-text">
        <span className="text-text-tertiary font-mono mr-2">{n}.</span>{title}
      </h2>
      <div className="text-body-sm text-text-secondary leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
