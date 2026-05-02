import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Legal", href: "/legal/terms" }, { label: "Terms" }]} />
      <h1 className="font-display font-bold text-title-lg text-text">Terms of Service</h1>
      <p className="text-caption text-text-tertiary">Version 2026-04-01 · Effective on account registration.</p>

      <Section n="1" title="Operator + licence">
        <p>
          The Kipindi service is operated by Kipindi Ltd, registered in the United Republic of Tanzania (TIN pending),
          under licence from the Gaming Board of Tanzania (licence number to be confirmed at launch). Players must be
          18 years or older and physically present in Tanzania at the time of play.
        </p>
      </Section>

      <Section n="2" title="Account eligibility">
        <ul className="list-disc pl-5 space-y-1">
          <li>Tanzanian resident with a valid NIDA national identification number</li>
          <li>Aged 18 or older at the time of registration</li>
          <li>One account per natural person; duplicate accounts will be closed and balances forfeited per AML rules</li>
          <li>You must keep your registered phone number, email, and address up to date</li>
        </ul>
      </Section>

      <Section n="3" title="Identity verification (KYC)">
        <p>
          Before withdrawing winnings you must complete identity verification against the National Identification
          Authority (NIDA). We may request additional documents (proof of address, source-of-funds declaration) if
          your activity triggers anti-money-laundering thresholds.
        </p>
      </Section>

      <Section n="4" title="How betting works">
        <p>
          Kipindi operates a <strong>pool-based</strong> betting model. Stakes for a given match window are pooled.
          When the window closes, the winning pool is shared pro-rata among players who picked the right side.
          The pay-rate shown at placement is the rate at that instant; final pay-rate is determined when the
          window closes. The operator's published payout structure is filed with the Gaming Board of Tanzania
          and available on request.
        </p>
        <p>
          Mapigo is an in-play short-form prediction game with rounds of 60 seconds. Rounds settle to one of three
          outcomes (SPIKE, DRIFT, CALM) determined by a deterministic algorithm seeded from the round identifier
          (see Game Rules in Annex A).
        </p>
      </Section>

      <Section n="5" title="Settlement and payout">
        <p>Payouts are credited to your wallet immediately on round settlement. Withdrawals to mobile money or bank
        complete within 60 seconds for amounts under TZS 1,000,000; larger amounts may be held for AML review for up
        to 24 hours. A withholding tax applies to gross winnings at the rate prescribed by the Income Tax Act
        (Cap 332). The current rate is shown on the withdrawal screen at the time of withdrawal.</p>
      </Section>

      <Section n="6" title="Voids and disputes">
        <p>Bets may be voided where the underlying match is abandoned, the wrong outcome is initially settled, or the
        result is corrected by the league or governing body within 24 hours of full-time. Disputes must be raised in
        writing to support@kipindi.co.tz within 30 days of the bet placement.</p>
      </Section>

      <Section n="7" title="Responsible gambling">
        <p>You can set deposit limits, take a break, or self-exclude in
        <a href="/profile/responsible-gambling" className="text-royal hover:underline ml-1">Responsible Gambling</a>.
        See the dedicated <a href="/legal/responsible-gambling" className="text-royal hover:underline">Responsible Gambling Policy</a>.</p>
      </Section>

      <Section n="8" title="Account closure">
        <p>You may close your account at any time. We retain transaction history for the period required by law
        (currently 7 years for AML records).</p>
      </Section>

      <Section n="9" title="Liability">
        <p>To the maximum extent permitted by law, our liability is limited to the balance held in your wallet at the
        time of any disputed event. We are not liable for losses arising from match fixing or third-party fraud,
        which are handled per the Match Integrity Annex (B).</p>
      </Section>

      <Section n="10" title="Changes">
        <p>We will notify you in writing (in-app + SMS) at least 14 days before any material change to these Terms.
        Continued use after the change constitutes acceptance.</p>
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
