import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Responsible Gambling Policy" };

export default function ResponsibleGamblingPolicyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Legal", href: "/legal/terms" }, { label: "Responsible gambling" }]} />
      <h1 className="font-display font-bold text-title-lg text-text">Responsible Gambling Policy</h1>
      <p className="text-caption text-text-tertiary">Aligned with the UK Gambling Commission LCCP and the European Committee for Standardization CEN Workshop Agreement 16221.</p>

      <Section n="1" title="Our commitment">
        <p>Most people gamble for fun. A small minority experience harm. 50pick designs the product, the
        marketing, and the customer journey to keep play recreational and to spot harm early.</p>
      </Section>

      <Section n="2" title="Tools we provide">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Deposit limits</strong> — daily, weekly, monthly. Decreases take effect immediately. Increases to
              the daily limit are deferred 24 hours.</li>
          <li><strong>Loss limit</strong> — daily.</li>
          <li><strong>Session time limit</strong> — automatic logout after the chosen duration.</li>
          <li><strong>Reality check</strong> — a banner every 30 minutes (configurable 5–120 min) showing time on
              platform, net win/loss for the session, and a clear path to break or self-exclude.</li>
          <li><strong>Take a break</strong> (cooling-off): 1 hour, 24 hours, or 1 week. One-way until expiry.</li>
          <li><strong>Self-exclusion</strong>: 24h, 1 week, 1 month, 6 months, or permanent. One-way; permanent
              requires documented review to reopen.</li>
        </ul>
        <p>All controls are accessible from your <a href="/profile/responsible-gambling" className="text-royal hover:underline">Responsible Gambling settings</a>.</p>
      </Section>

      <Section n="3" title="Markers of harm">
        <p>We monitor for: rapid deposit escalation, chasing losses (multiple deposits within a losing session),
        late-night extended play (00:00–06:00 EAT), declined card cycling, breaching previous self-imposed limits,
        and unusual transaction patterns. Any single marker triggers an in-app prompt; multiple markers trigger
        a contact from our Player Safety team within 24 hours.</p>
      </Section>

      <Section n="4" title="Operator responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>No marketing to self-excluded players or players under 25 in vulnerability segments</li>
          <li>No bonus offers tied to deposit increases</li>
          <li>No sign-up nudges in the late-night window</li>
          <li>Free helpline displayed on every page footer</li>
        </ul>
      </Section>

      <Section n="5" title="Get help">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Tanzania</strong>: National Helpline +255 22 211 5811 (free)</li>
          <li><strong>International</strong>: <span className="font-mono">begambleaware.org</span>, <span className="font-mono">gamcare.org.uk</span></li>
          <li><strong>Email us</strong>: <span className="font-mono">support@50pick.com</span></li>
        </ul>
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
