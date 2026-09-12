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
/* ⭐ IMPORTED DIRECTLY, AND THAT IS THE POINT OF PINNING IT. Every other operator-facing
   value in this file is a prop because a `defineConfig` read in a `"use client"` bundle
   returns the module default (E-226). `SOCIAL` has no persisted row to disagree with, so
   the browser and the server agree by construction and there is nothing to thread. */
import { SOCIAL } from "@/lib/social";
import { SOCIAL_MARK } from "@/components/ui/social-marks";
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
  /**
   * 🔴 THE BOTTOM RAIL WAS EATING THE LAST ROW OF THIS FOOTER, AND HAD BEEN ALL ALONG.
   * `app-shell.tsx` clears the fixed 88px `BottomNav` with
   * `pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0` — but that padding is on `<main>`,
   * and this footer is main's SIBLING, not its child. So below `lg` the document ended flush
   * against a fixed bar and whatever landed last was un-tappable.
   *
   * ⛔ MEASURED 2026-09-12 with `elementFromPoint` at each link's own centre, scrolled to
   * `document.body.scrollHeight`: at 360 the LAST footer link — `Export / close my account`,
   * the data-subject-rights door — returned the nav element instead of itself, in EN and SW.
   * That is a GDPR/PDPA control a phone user could not reach, and it was live.
   *
   * ⚠️ A SCREENSHOT CANNOT SEE THIS. A `position: fixed` bar paints over the link and the
   * image looks identical whether the link is reachable or buried; only a hit test at real
   * coordinates tells the two apart. Guard: `npm run qa:footer-reachable`.
   * ⭐ The clearance is COPIED from `app-shell.tsx`, not re-derived — one bar, one number.
   */
  return (
    <footer className="mt-12 bg-bg-elevated/40 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
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
          {/* ⭐ LAST IN THE IDENTITY COLUMN, AND THE ORDER IS THE RULING. Nothing is
              inserted above the 18+ badge, the Gaming Board sentence, the licence number
              or the copyright — a social link ranks BELOW every regulator disclosure on
              the page, and it sits in the brand column rather than taking a fifth one,
              so the `md:grid-cols-4` chrome is unchanged on every player page.
              ⛔ A PLAIN DIRECTORY LINE — no badge, no gilt, no follower count, no verb.
              The same shape, and the same reason, as the agent door below: `/legal/
              responsible-gambling` §4 publishes "no marketing to self-excluded players",
              and a static platform name in site chrome is a directory entry, not a
              marketing communication. An offer or a nudge would be one. Recorded in
              `docs/COMPLIANCE-DECISIONS.md`; enforced by `npm run test:social-links`. */}
          {/* ⚠️ `flex-wrap` IS LOAD-BEARING, NOT DEFENSIVE. Two items fitted 360 with room;
              three do not reliably — "Chaneli ya WhatsApp" is the long one, and Swahili runs
              ~35-40% longer than English by §A5, which is the rule that predicts exactly this.
              Without wrapping the third link is pushed off the left edge of a 360 phone, which
              is the failure `qa:landmark-seal` measures and a desktop eyeball never sees. */}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {SOCIAL.map((s) => (
              <SocialLink
                key={s.labelKey}
                href={s.url}
                markKey={s.labelKey}
                label={t.footer[s.labelKey]}
                ariaLabel={t.footer[s.ariaKey]}
              />
            ))}
          </ul>
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

/**
 * A social account, as a directory line. Same ink and same hover-underline recipe as
 * `FooterLink` below — this is the kit's external-link variant of it, not a new look.
 *
 * ⭐ THE SIZING, DERIVED RATHER THAN PICKED. The mark is 16 — `GLYPH.row`, the named
 * constant for a row's lead glyph, already the 2nd-commonest size on the player surface,
 * and already inside the frozen set in `scripts/icon-size-ratchet.test.mts`, so it adds no
 * twentieth value to a spread the ratchet exists to shrink. Not 14 (`GLYPH.inline`, for a
 * glyph inside a line of text), not 18 (`GLYPH.card`, a section head), not 20 (the
 * bottom-rail pip, which reads as primary navigation — this is not that).
 *
 * The row is `min-h-[44px]`: the preferred WCAG 2.5.5 target and Ali's 2026-08-14 ruling,
 * so `test:tap-target` passes with no exemption argued. That puts the mark at 36% of its
 * target against the rail pip's 45% — deliberately quieter, because this is chrome.
 * ⛔ Never `h-9 w-9` here: this repo OVERRIDES Tailwind's spacing scale and `9` is 64px.
 *
 * ⚠️ THE MARK DOES NOT DIM WITH ITS LABEL, AND THAT IS THE COST OF THE OWNER'S CHOICE.
 * Instagram's gradient and TikTok's three inks are the vendors' own and are not ours to
 * re-hue, so they cannot ride `currentColor` the way every other footer icon does — the
 * word brightens on hover and the logo beside it holds. Measured against the alternative
 * on a real render 2026-09-12 and accepted: a one-ink version of the same geometry dimmed
 * correctly but gave up the instant recognition that is the whole reason the row exists.
 *
 * ⛔ NO HOVER ANIMATION ON THE MARK (§M5 — "icons respond, they do not perform"). The only
 * motion is the colour crossfade the global `:where(a)` rule already applies to the label
 * at `--t-quick` / `linear`, and the focus ring is the platform catch-all.
 */
function SocialLink({
  href, markKey, label, ariaLabel,
}: { href: string; markKey: keyof typeof SOCIAL_MARK; label: string; ariaLabel: string }) {
  const Mark = SOCIAL_MARK[markKey];
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="text-text-muted hover:text-text transition-colors inline-flex items-center gap-1.5 min-h-[44px] group"
      >
        <Mark s={16} />
        <span className="border-b border-transparent group-hover:border-text-subtle transition-colors">{label}</span>
      </a>
    </li>
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
