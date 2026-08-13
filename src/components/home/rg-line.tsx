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
 * Client component only because the footer's own strings come through `useT()` and the helpline
 * comes from `support-config`, exactly as the footer reads them.
 */
import Link from "next/link";
import { HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { useT } from "@/lib/i18n";

export function RgLine() {
  const { t } = useT();
  return (
    <div className="kp-rg" data-band="rg">
      <span aria-label={t.footer.eighteenPlus} className="kp-rg__18">{t.footer.eighteenPlus}</span>
      <span className="kp-rg__say">{t.footer.stopGambling}</span>
      <span className="kp-rg__links">
        <Link href={"/profile/responsible-gambling" as never} className="kp-rg__link">{t.footer.setLimits}</Link>
        <Link href={"/legal/responsible-gambling" as never} className="kp-rg__link">
          {t.footer.takeABreak} / {t.footer.selfExclude}
        </Link>
        {/* A tel: link, like the footer's — on a phone the helpline should be one tap. */}
        <a href={`tel:${HELPLINE_TEL()}`} className="kp-rg__link">
          {t.footer.helpline} · {HELPLINE()}
        </a>
      </span>
    </div>
  );
}
