import { LegalHeader, LegalSection } from "../_components";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/support-config";

export const metadata = { title: "Responsible Gambling Policy" };

export default function ResponsibleGamblingPolicyPage() {
  return (
    <>
      <LegalHeader
        title="Responsible Gambling Policy"
        subtitle="Sera ya Mchezo Salama"
        meta="Aligned with the UK Gambling Commission LCCP and CEN Workshop Agreement 16221."
      />

      <LegalSection n="1" title="Our commitment">
        <p>
          Most people gamble for fun. A small minority experience harm. 50pick designs the product,
          the marketing, and the customer journey to keep play recreational and to spot harm early.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Tools we provide">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Deposit limits</strong> — daily, weekly, monthly. Decreases take effect immediately. Increases to the daily limit are deferred 24 hours.</li>
          <li><strong className="text-text">Loss limit</strong> — daily.</li>
          <li><strong className="text-text">Session time limit</strong> — automatic logout after the chosen duration.</li>
          <li><strong className="text-text">Reality check</strong> — a banner every 30 minutes (configurable 5–120 min) showing time on platform, net win/loss for the session, and a clear path to break or self-exclude.</li>
          <li><strong className="text-text">Take a break</strong> (cooling-off): 1 hour, 24 hours, or 1 week. One-way until expiry.</li>
          <li><strong className="text-text">Self-exclusion</strong>: 24h, 1 week, 1 month, 6 months, or permanent. One-way; permanent requires documented review to reopen.</li>
        </ul>
        <p>
          All controls are accessible from your{" "}
          <a href="/profile/responsible-gambling" className="text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline">
            Responsible Gambling settings
          </a>.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Markers of harm">
        <p>
          We monitor for: rapid deposit escalation, chasing losses (multiple deposits within a losing
          session), late-night extended play (00:00–06:00 EAT), declined card cycling, breaching
          previous self-imposed limits, and unusual transaction patterns. Any single marker triggers
          an in-app prompt; multiple markers trigger a contact from our Player Safety team within 24 hours.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Operator responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>No marketing to self-excluded players or players under 25 in vulnerability segments</li>
          <li>No bonus offers tied to deposit increases</li>
          <li>No sign-up nudges in the late-night window</li>
          <li>Free helpline displayed on every page footer</li>
        </ul>
      </LegalSection>

      <LegalSection n="5" title="Get help">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-text">Tanzania</strong>: National Helpline <a href={`tel:${SUPPORT_PHONE_TEL()}`} className="font-mono text-accent-400 underline-offset-2 hover:underline">{SUPPORT_PHONE()}</a> (free)</li>
          <li><strong className="text-text">International</strong>: <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="font-mono text-accent-400 underline-offset-2 hover:underline">begambleaware.org</a>, <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="font-mono text-accent-400 underline-offset-2 hover:underline">gamcare.org.uk</a></li>
          <li><strong className="text-text">Email us</strong>: <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-mono text-accent-400 underline-offset-2 hover:underline">{SUPPORT_EMAIL()}</a></li>
        </ul>
      </LegalSection>
    </>
  );
}
