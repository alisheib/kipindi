import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "AML / KYC Policy" };

export default function AmlPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Legal", href: "/legal/terms" }, { label: "AML / KYC" }]} />
      <h1 className="font-display font-bold text-title-lg text-text">Anti-Money-Laundering &amp; KYC Policy</h1>
      <p className="text-caption text-text-tertiary">Aligned with the Tanzania Anti-Money-Laundering Act (Cap 423) and the Financial Action Task Force (FATF) Recommendations.</p>

      <Section n="1" title="Customer due diligence (CDD)">
        <p>Identity is verified at registration via the National Identification Authority (NIDA) using a 20-digit
        national ID number, supported by photographic ID and selfie. Withdrawals are blocked until KYC status is
        APPROVED. We capture: full name, date of birth, region, NIDA number, and photographic evidence.</p>
      </Section>

      <Section n="2" title="Enhanced due diligence (EDD)">
        <p>EDD is triggered automatically when:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A single transaction exceeds <strong>TZS 1,000,000</strong> (deposit or withdrawal)</li>
          <li>Cumulative deposits in 30 days exceed TZS 5,000,000</li>
          <li>The player profile flags as a Politically Exposed Person (PEP) or is on a sanctions list</li>
          <li>Behavioural anomalies are detected (rapid deposit-then-withdraw, multiple MSISDN sources, structuring)</li>
        </ul>
        <p>EDD requires a source-of-funds declaration and may require supporting documentation (bank statement,
        salary slip, business registration). Withdrawals are placed in <code>AML_REVIEW</code> status until cleared.</p>
      </Section>

      <Section n="3" title="Suspicious-activity reporting (SAR)">
        <p>Designated AML officers review flagged activity within 1 business day. SARs are filed with the Financial
        Intelligence Unit (FIU) of Tanzania within 7 days of identification, regardless of customer relationship.
        We do not tip off players that an SAR has been filed.</p>
      </Section>

      <Section n="4" title="Sanctions screening">
        <p>All registered users and beneficial owners are screened against the UN consolidated list, OFAC SDN list,
        the EU sanctions list, and the UK HMT list at registration and weekly thereafter. Matches block
        transactions and trigger immediate review.</p>
      </Section>

      <Section n="5" title="Record retention">
        <p>CDD, transaction, and audit-trail records are retained for 7 years from account closure or transaction
        date, whichever is later. Logs are immutable, append-only, and signed.</p>
      </Section>

      <Section n="6" title="Training + governance">
        <p>All staff complete AML training annually with a refresher course every 6 months. The AML Officer reports
        directly to the Board. The Board reviews the AML risk register quarterly.</p>
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
