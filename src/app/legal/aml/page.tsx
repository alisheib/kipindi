import { LegalHeader, LegalSection } from "../_components";

export const metadata = { title: "AML / KYC Policy" };

export default function AmlPage() {
  return (
    <>
      <LegalHeader
        title="AML & KYC Policy"
        subtitle="Sera ya Kuzuia Uoshaji wa Fedha"
        meta="Aligned with Tanzania AML Act (Cap 423) and the FATF Recommendations."
      />

      <LegalSection n="1" title="Customer due diligence (CDD)">
        <p>
          Identity is verified at registration via the National Identification Authority (NIDA) using
          a 20-digit national ID number, supported by photographic ID and selfie. Withdrawals are
          blocked until KYC status is <span className="font-mono text-yes-300">APPROVED</span>.
          We capture: full name, date of birth, region, NIDA number, and photographic evidence.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Enhanced due diligence (EDD)">
        <p>EDD is triggered automatically when:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A single transaction exceeds <strong className="text-text">TZS 1,000,000</strong> (deposit or withdrawal)</li>
          <li>Cumulative deposits in 30 days exceed TZS 5,000,000</li>
          <li>The player profile flags as a Politically Exposed Person (PEP) or is on a sanctions list</li>
          <li>Behavioural anomalies are detected (rapid deposit-then-withdraw, multiple MSISDN sources, structuring)</li>
        </ul>
        <p>
          EDD requires a source-of-funds declaration and may require supporting documentation
          (bank statement, salary slip, business registration). Withdrawals are placed in
          <span className="font-mono text-warning-fg mx-1">AML_REVIEW</span> status until cleared.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Suspicious-activity reporting (SAR)">
        <p>
          Designated AML officers review flagged activity within 1 business day. SARs are filed with
          the Financial Intelligence Unit (FIU) of Tanzania within 7 days of identification, regardless
          of customer relationship. We do not tip off players that an SAR has been filed.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Sanctions screening">
        <p>
          All registered users and beneficial owners are screened against the UN consolidated list,
          OFAC SDN list, the EU sanctions list, and the UK HMT list at registration and weekly
          thereafter. Matches block transactions and trigger immediate review.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Record retention">
        <p>
          CDD, transaction, and audit-trail records are retained for 7 years from account closure
          or transaction date, whichever is later. Logs are immutable, append-only, and signed.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Training + governance">
        <p>
          All staff complete AML training annually with a refresher course every 6 months. The AML
          Officer reports directly to the Board. The Board reviews the AML risk register quarterly.
        </p>
      </LegalSection>
    </>
  );
}
