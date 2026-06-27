import { LegalHeader, LegalSection } from "../_components";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <LegalHeader
        title="Privacy Policy"
        subtitle="Sera ya Faragha"
        meta="Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles."
      />

      <LegalSection n="1" title="Data controller">
        <p>
          50pick Ltd, Dar es Salaam, Tanzania. Contact:{" "}
          <span className="font-mono text-text-muted">privacy@50pick.tz</span>. Our data protection
          officer (DPO) is reachable at the same address.
        </p>
      </LegalSection>

      <LegalSection n="2" title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Identity</strong>: full name, date of birth, NIDA number, photographic ID</li>
          <li><strong className="text-text">Contact</strong>: phone number (E.164), region</li>
          <li><strong className="text-text">Financial</strong>: deposit and withdrawal records, mobile-money MSISDN, prediction activity</li>
          <li><strong className="text-text">Technical</strong>: IP address, device and browser fingerprint, session timestamps</li>
          <li><strong className="text-text">Behavioural</strong>: time on platform, reality-check responses, limit changes</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Lawful basis">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Performance of contract</strong>: account, wallet, bet placement, settlement</li>
          <li><strong className="text-text">Legal obligation</strong>: KYC under the Gaming Act, AML/CFT under POCA, tax under the Income Tax Act</li>
          <li><strong className="text-text">Legitimate interest</strong>: fraud prevention, market-integrity monitoring, security alerting</li>
          <li><strong className="text-text">Consent</strong>: marketing communications (revocable any time)</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Sharing">
        <p>We share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NIDA (identity verification, mTLS)</li>
          <li>Mobile-money aggregator (Selcom or Azampay) for payment routing</li>
          <li>Source registry partners for resolution data</li>
          <li>Gaming Board of Tanzania, Tanzania Revenue Authority, FIU when legally compelled</li>
          <li>Cloud infrastructure (encrypted at rest, TZ region preferred; failover in EU AWS Frankfurt)</li>
        </ul>
        <p className="text-text">We never sell personal data.</p>
      </LegalSection>

      <LegalSection n="5" title="Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account + KYC records: 7 years after closure (AML statutory)</li>
          <li>Prediction and transaction history: 7 years</li>
          <li>Audit log entries: 7 years</li>
          <li>Marketing preferences: until withdrawn or 2 years of inactivity</li>
        </ul>
      </LegalSection>

      <LegalSection n="6" title="Your rights">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Access</strong>: request a copy of your data (delivered within 30 days)</li>
          <li><strong className="text-text">Rectification</strong>: correct inaccurate data</li>
          <li><strong className="text-text">Erasure</strong>: subject to AML retention requirements</li>
          <li><strong className="text-text">Portability</strong>: receive your data in a machine-readable format</li>
          <li><strong className="text-text">Objection</strong>: opt out of profiling for marketing</li>
          <li><strong className="text-text">Complaint</strong>: with the Personal Data Protection Commission of Tanzania</li>
        </ul>
      </LegalSection>

      <LegalSection n="7" title="Cookies">
        <p>
          We use a minimum-necessary set: session authentication (HMAC-signed HttpOnly cookies, 7-day TTL),
          theme preference, language preference. No third-party advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Security">
        <p>
          Sessions signed with HMAC-SHA-256. OTP codes hashed with scrypt + per-OTP salt + global pepper.
          Passwords (when introduced) will use Argon2id. All data in transit over TLS 1.2+. At-rest
          encryption via AES-256 in the database tier. Annual ISO 27001 audit cadence; pentest twice a year.
        </p>
      </LegalSection>
    </>
  );
}
