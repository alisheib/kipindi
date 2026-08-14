"use client";

/**
 * §1h — THE RESPONSIBLE-GAMBLING LINE, above the footer.
 *
 * ⚠️ EVERY STRING IS VERBATIM FROM `public-footer.tsx`, READ FROM THE SAME KEYS. No new RG copy
 * was written anywhere in this work, and the footer itself is untouched. That is not a stylistic
 * choice: RG wording is assessed, so inventing a paraphrase of it would be a new claim to assess.
 * Reading the same keys also means a future correction to the footer's RG copy corrects this line
 * in the same edit.
 *
 * ⚠️ PLACEMENT IS A REGULATORY QUESTION, NOT A DESIGN ONE. LCCP §SR 5.1.5 governs where RG
 * messaging must appear, and moving it above the footer may change an assessment. It is built as
 * the kit designed it and flagged for compliance sign-off; if the answer is "footer only", this
 * component is ONE deletion and the page still works. Recorded in ACCEPTANCE §10 and PLAN §5.6.
 *
 * 🔴 IT CARRIED THE FOOTER'S THREE LINKS AND WAS REDUNDANT — corrected in batch 4, on Ali reading
 * the live page. This line used to render `setLimits`, `takeABreak`/`selfExclude` and `helpline`,
 * which is EXACTLY what the footer's own "PLAY SAFE" column renders a few hundred pixels below
 * (`public-footer.tsx:49-56`). Measured on the live composition: each of the three destinations
 * appeared **twice** on one page, at all 12 width×locale combinations, and both copies were
 * visible in a single 1280 frame.
 *
 * What stays is the part that is not restated anywhere above the footer: the 18+ badge and the
 * motto. That keeps the duty-of-care message where §5.6 decided it should be (more RG visibility
 * is the conservative direction) without restating navigation the footer already owns one scroll
 * away. ⛔ Do not re-add the links here: the footer is their one home. If RG navigation is ever
 * wanted above the footer, that is a NEW decision — and it means REMOVING it from the footer, not
 * rendering it in both places.
 *
 * Client component only because the footer's own strings come through `useT()`, exactly as the
 * footer reads them.
 */
import { useT } from "@/lib/i18n";

export function RgLine() {
  const { t } = useT();
  return (
    <div className="kp-rg" data-band="rg">
      <span aria-label={t.footer.eighteenPlus} className="kp-rg__18">{t.footer.eighteenPlus}</span>
      <span className="kp-rg__say">{t.footer.stopGambling}</span>
    </div>
  );
}
