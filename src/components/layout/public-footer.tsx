/**
 * Unified public footer. Visible on every player-facing page.
 * Carries the regulator-required disclosures: 18+ badge, license stub,
 * problem-gambling helpline, GDPR/PDPA rights links, and a link to the
 * resolution attestation page.
 *
 * LCCP §SR Code 5.1.5 (visible age + RG messaging on every page).
 */
"use client";

import Link from "next/link";
import { FiftyMark } from "@/components/brand";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { HELPLINE, HELPLINE_TEL, SUPPORT_EMAIL } from "@/lib/support-config";
import { useT } from "@/lib/i18n";
import type { ProposalsState } from "@/lib/server/proposals-config";

export function PublicFooter({
  proposalsState,
  /**
   * ⛔ A PROP, NOT A CONFIG READ. This file is `"use client"`, and it used to call
   * `getAgentConfig()` — which in a browser bundle returns the module DEFAULT rather than the
   * persisted row, so the link ignored the operator's switch entirely. The shell resolves it
   * on the server and threads the ANSWER down, exactly as `proposalsState` is threaded.
   */
  agentDoorVisible,
}: {
  proposalsState: ProposalsState;
  agentDoorVisible: boolean;
}) {
  const { t } = useT();
  const license = process.env.NEXT_PUBLIC_LICENSE_REF ?? "TZ-GBT-2026-XXXX (pending)";
  return (
    <footer className="mt-12 bg-bg-elevated/40">
      {/* Heraldic claret rule with gilt midpoint — regulator/footer chrome. */}
      <div aria-hidden className="claret-rule mx-auto max-w-board" />
      <div className="mx-auto max-w-board px-3 lg:px-6 pt-2 pb-7 grid grid-cols-1 md:grid-cols-4 gap-6 text-[12px]">
        {/* Brand + license */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-label={t.footer.eighteenPlus}
              className="inline-flex items-center justify-center w-7 h-7 rounded-pill border-2 border-no-700 text-no-300 font-display font-bold text-[11px]"
            >
              {t.footer.eighteenPlus}
            </span>
            <FiftyMark size={20} />
            <span className="font-display font-bold text-[14px] text-text">50pick</span>
          </div>
          <p className="text-text-muted leading-relaxed text-body-sm">
            {t.footer.licensedByGbt}
          </p>
          <p className="font-mono text-[11px] text-text-subtle tabular-nums">
            {t.footer.license}: {license}
          </p>
          <p className="font-mono text-[11px] text-text-subtle">
            © {new Date().getFullYear()} 50pick · Tanzania
          </p>
        </div>

        <FooterCol heading={t.footer.playSafe}>
          <FooterLink href="/profile/responsible-gambling">{t.footer.setLimits}</FooterLink>
          <FooterLink href="/legal/responsible-gambling">{t.footer.takeABreak} / {t.footer.selfExclude}</FooterLink>
          <li>
            <a href={`tel:${HELPLINE_TEL()}`} className="text-text-muted hover:text-text transition-colors">
              {t.footer.helpline} · {HELPLINE()}
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL()}`} className="text-text-muted hover:text-text transition-colors">
              Email · {SUPPORT_EMAIL()}
            </a>
          </li>
          <li className="italic text-text-subtle text-body-sm">
            {t.footer.stopGambling}
          </li>
        </FooterCol>

        <FooterCol heading={t.footer.fairness}>
          <FooterLink href="/fairness">{t.footer.resolutionAttestation}</FooterLink>
          {/* Proposals: dropped from the footer entirely when DISABLED; otherwise
              the current state flag rides the link (gilt / amber / none). */}
          {proposalsState !== "DISABLED" && (
            <FooterLink href="/proposals">
              {t.footer.proposeGetPaid}
              <ProposalsStateBadge state={proposalsState} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" className="ml-1.5" />
            </FooterLink>
          )}
          <FooterLink href="/legal/terms">{t.footer.gameRtp}</FooterLink>
          {/* ⭐ THE AGENT PROGRAMME'S ONE DOOR. Site chrome, visible signed out, a plain directory
              line — no badge, no gilt, no number, no earnings verb. ⛔ Never in the account menu:
              the footer is not the account, and an ordinary player is not solicited. */}
          {/* The public door closes with the programme — a link to a 404 is not a door — but
              it stays open for anyone already inside it. Resolved in `app-shell.tsx`. */}
          {agentDoorVisible && <FooterLink href="/agent">{t.agent.footerLink}</FooterLink>}
          <FooterLink href="/help">{t.footer.helpSupport}</FooterLink>
        </FooterCol>

        <FooterCol heading={t.footer.privacy}>
          <FooterLink href="/legal/privacy">{t.footer.privacyNotice}</FooterLink>
          <FooterLink href="/legal/aml">{t.footer.amlKyc}</FooterLink>
          <FooterLink href="/legal/terms">{t.footer.terms}</FooterLink>
          <FooterLink href="/profile/account">{t.footer.exportClose}</FooterLink>
        </FooterCol>
      </div>
    </footer>
  );
}

function FooterCol({
  heading, children,
}: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
        {heading}
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
        className="text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 group"
      >
        <span className="border-b border-transparent group-hover:border-text-subtle transition-colors">{children}</span>
      </Link>
    </li>
  );
}
