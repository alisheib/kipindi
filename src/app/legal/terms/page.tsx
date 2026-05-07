import { LegalHeader, LegalSection } from "../_components";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <LegalHeader
        title="Terms of Service"
        subtitle="Masharti ya Huduma"
        meta="Version 2026-04-01 · Effective on account registration."
      />

      <LegalSection n="1" title="Operator + licence">
        <p>
          The 50pick service is operated by 50pick Ltd, registered in the United Republic of Tanzania
          (TIN pending), under licence from the Gaming Board of Tanzania (licence number to be confirmed
          at launch). Players must be 18 years or older and physically present in Tanzania at the time of play.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Account eligibility">
        <ul className="list-disc pl-5 space-y-1">
          <li>Tanzanian resident with a valid NIDA national identification number</li>
          <li>Aged 18 or older at the time of registration</li>
          <li>One account per natural person; duplicate accounts will be closed and balances forfeited per AML rules</li>
          <li>You must keep your registered phone number, email, and address up to date</li>
        </ul>
      </LegalSection>

      <LegalSection n="3" title="Identity verification (KYC)">
        <p>
          Before withdrawing winnings you must complete identity verification against the National Identification
          Authority (NIDA). We may request additional documents (proof of address, source-of-funds declaration) if
          your activity triggers anti-money-laundering thresholds.
        </p>
      </LegalSection>

      <LegalSection n="4" title="How prediction markets work">
        <p>
          50pick operates a <strong className="text-text">whole-pool pari-mutuel</strong> prediction-market model.
          All stakes — YES and NO — are pooled. After applying the published platform tax and operator commission,
          the remaining net pool is distributed to the winning side, pro-rata to each correct stake&apos;s share of
          the winning side&apos;s pool. The current rates are displayed on every market, in your placement preview,
          and on the public <a href="/admin/config" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">market config</a>.
        </p>
        <p>
          The probabilities shown on the dial are <em>implied</em> by the current pool composition and update with
          every new bet — they are not guaranteed odds. Cash-out is available before resolution at a value derived
          from the same pool maths plus a small slippage buffer.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Settlement and payout">
        <p>
          Payouts are credited to your wallet immediately on market resolution. Withdrawals to mobile money or
          bank complete within 60 seconds for amounts under TZS 1,000,000; larger amounts may be held for AML
          review for up to 24 hours. A withholding tax applies to gross winnings at the rate prescribed by the
          Income Tax Act (Cap 332). The current rate is shown on the withdrawal screen at the time of withdrawal.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Voids and disputes">
        <p>
          Bets may be voided where the underlying event is abandoned, the wrong outcome is initially settled,
          or the result is corrected by the source authority within 24 hours of resolution. Disputes must be
          raised in writing to <span className="font-mono text-text-muted">support@50pick.com</span> within
          30 days of placement.
        </p>
      </LegalSection>

      <LegalSection n="7" title="Responsible gambling">
        <p>
          You can set deposit limits, take a break, or self-exclude in
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline ml-1">Responsible Gambling</a>.
          See the dedicated <a href="/legal/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">Responsible Gambling Policy</a>.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Account closure">
        <p>
          You may close your account at any time. We retain transaction history for the period required by
          law (currently 7 years for AML records).
        </p>
      </LegalSection>

      <LegalSection n="9" title="Liability">
        <p>
          To the maximum extent permitted by law, our liability is limited to the balance held in your wallet
          at the time of any disputed event. We are not liable for losses arising from match fixing or third-party
          fraud, which are handled per the Match Integrity Annex (B).
        </p>
      </LegalSection>

      <LegalSection n="10" title="Changes">
        <p>
          We will notify you in writing (in-app + SMS) at least 14 days before any material change to these
          Terms. Continued use after the change constitutes acceptance.
        </p>
      </LegalSection>
    </>
  );
}
