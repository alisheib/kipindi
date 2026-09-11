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
/* ⛔ THE CLIENT-SAFE MODULE, and it must stay that way — this file is `"use client"` (below).
   `@/lib/server/support-config` reaches `defineConfig` → prisma, which cannot be pulled into a
   browser bundle. Only the PINNED constants live here; the operator-editable address arrives
   as a prop, for the reason `agentDoorVisible` already documents. */
import { HELPLINE, HELPLINE_TEL, LICENCE_NUMBER } from "@/lib/support-config";
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
  /**
   * ⛔ A PROP FOR THE SAME REASON `agentDoorVisible` IS ONE (E-226). This footer called
   * `SUPPORT_EMAIL()` directly, and in a browser bundle that returns the module DEFAULT — so
   * the address in the footer of EVERY player-facing page could never be the one an officer
   * saved, no matter how well the server hydrated it.
   */
  supportEmail,
  /**
   * ⛔ PROPS FOR THE SAME REASON `supportEmail` IS ONE (E-226) — and the reason is worth
   * repeating rather than assumed, because it is why the footer had no phone at all.
   * This file is `"use client"`. A `SUPPORT_PHONE()` call here reads the BROWSER bundle's
   * module default, which no server-side hydration can ever reach, so the number in the
   * footer of every player page could never be the one an officer saved.
   *
   * ⚠️ TWO VALUES, DELIBERATELY. `supportPhone` is what a player READS (`0769777877`, the
   * local form a Tanzanian dials); `supportPhoneTel` is what a TAP dials (`+255769777877`),
   * so the same line works from a Tanzanian handset and from abroad. Row 4.3 built that
   * split; collapsing them here would undo it.
   */
  supportPhone,
  supportPhoneTel,
}: {
  proposalsState: ProposalsState;
  agentDoorVisible: boolean;
  supportEmail: string;
  supportPhone: string;
  supportPhoneTel: string;
}) {
  const { t } = useT();
  /**
   * 🔴 WAS `process.env.NEXT_PUBLIC_LICENSE_REF ?? "TZ-GBT-2026-XXXX (pending)"`, AND BOTH
   * HALVES OF THAT WERE WRONG ON PRODUCTION.
   *
   * The variable WAS set — to `TZ-GBT-2026-XXXX` — so every player page footer rendered
   * `License: TZ-GBT-2026-XXXX`, a literal XXXX placeholder, on a live licensed platform
   * taking real money. Measured 2026-09-10 with `curl https://50pick.tz/`. And the fallback
   * was no safer than the value: an unset variable published `TZ-GBT-2026-XXXX (pending)`,
   * which is a fabricated licence reference presented as this operator's own.
   *
   * ⭐ A LICENCE NUMBER IS NOT DEPLOYMENT CONFIG. It does not vary by environment, it is not
   * an operator preference, and there is no correct value for it to fall back to — so it is a
   * pinned constant beside the statutory helpline, where nothing can unset it and no default
   * can invent one. Ali supplied the real number 2026-09-10.
   */
  const license = LICENCE_NUMBER();
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
              /* ⛔ WAS A HAND-BUILT UTILITY STRING, AND IT RENDERED THE 18+ MARK AT A
                 DIFFERENT SIZE FROM THE DESIGN SYSTEM'S OWN. `w-7 h-7` looks like 28px
                 and is not: tailwind.config.ts:220 overrides spacing "7" to 40px, so this
                 badge was 40×40 while `.kp-rg__18` (globals.css:4802) is 28×28 — same
                 border, ink and type size, different diameter, both visible on `/` in one
                 scroll.
                 ⭐ The fix is ONE DEFINITION SITE, not two numbers kept in step. A
                 synchronised pair is a thing to remember; a single class is a thing that
                 cannot disagree with itself. The class is self-sufficient (display,
                 alignment, size, border, radius, family, weight, colour) and its
                 `flex: none` is correct inside this row's `flex items-center gap-2.5`. */
              className="kp-rg__18"
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
          {/* ⭐ OUR OWN DESK COMES FIRST, AND IT IS LABELLED AS OURS — Ali, 2026-09-11.
              The footer published the statutory helpline and our EMAIL, and no phone at
              all: a player who wanted to CALL us had to find `/help` first. It is on
              every page now.
              ⛔ IT SITS ABOVE THE HELPLINE AND IS NAMED "Contact us", NOT "Helpline",
              and that separation is the whole point. `HELPLINE()` is the INDEPENDENT
              problem-gambling line — free, not ours, a pinned constant with no setter.
              `supportPhone` is 50pick's own desk. Unit 2 exists because those two were
              conflated: `/help` showed our number under "Free helpline · 24/7", and the
              chatbot was instructed to hand it to a self-identifying problem gambler.
              ⚠️ So this line carries NO tariff and NO "free" claim — we publish no tariff
              for the desk, and any figure here would be invented (A-5). */}
          <li>
            <a href={`tel:${supportPhoneTel}`} className="text-text-muted hover:text-text transition-colors">
              {t.footer.contactUs} · {supportPhone}
            </a>
          </li>
          <li>
            <a href={`tel:${HELPLINE_TEL()}`} className="text-text-muted hover:text-text transition-colors">
              {t.footer.helpline} · {HELPLINE()}
            </a>
          </li>
          <li>
            <a href={`mailto:${supportEmail}`} className="text-text-muted hover:text-text transition-colors">
              {/* ⛔ WAS A HARDCODED ENGLISH LITERAL, one line below the translated
                  `t.footer.helpline`, rendering on EVERY page in all three locales.
                  ⭐ `test:i18n` could not see it and never could: it walks the DICTIONARY
                  for missing or untranslated keys, and a string that was never a key is
                  outside its population by construction. An absent key is invisible to a
                  parity check — which is why row 10.4 is a guard-shaped finding and not
                  just a typo. */}
              {t.footer.email} · {supportEmail}
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
          {/* ⭐ REPOINTED 2026-09-10, AND NO NEW FOOTER KEY WAS NEEDED. This link's own label is
              "Game RTP & rules" (`t.footer.gameRtp`) in all three languages, and it pointed at
              `/legal/terms` — the Terms of Service, which is a different document and is already
              linked from the Privacy column below. Now that the two products have actual rules
              documents, the label finally reaches what it promises. */}
          <FooterLink href="/legal/rules">{t.footer.gameRtp}</FooterLink>
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
