/**
 * RG-redirect card — surfaces when the bot detects at-risk language.
 *
 * Never a free-text reply: at-risk language always renders this card so
 * the player is one tap from concrete RG tools and one tap from the
 * support team. Pearl left-edge (the kit's emphasis color) keeps
 * it distinct from a neutral AI reply without using YES/NO semantics.
 */

import Link from "next/link";
import { FiftyMark } from "@/components/brand";
import type { Lang } from "../types";
import { useT } from "@/lib/i18n";

export function RgRedirectCard({ lang: _lang = "en" }: { lang?: Lang }) {
  const { t: i18n } = useT();
  return (
    <div className="cm-row cm-row-ai">
      <FiftyMark size={22} />
      <div
        className="cm-bubble-ai"
        style={{ padding: 0, background: "transparent", border: "none", maxWidth: "88%" }}
      >
        <div className="cm-rg-card" role="group" aria-label={i18n.chat.rgRedirectAria}>
          <div className="cm-rg-label">{i18n.common.responsibleGambling}</div>
          <div className="cm-rg-title">{i18n.rg.mostPlayForFun}</div>
          <div className="cm-rg-body">{i18n.rg.pageDescription}</div>
          <div className="cm-rg-actions">
            <Link href={"/profile/responsible-gambling" as never} className="cm-rg-primary">
              {i18n.rg.setLimits}
            </Link>
            <Link href={"/help" as never} className="cm-rg-secondary">
              {i18n.profile.helpSupport}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
