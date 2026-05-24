/**
 * RG-redirect card — surfaces when the bot detects at-risk language.
 *
 * Never a free-text reply: at-risk language always renders this card so
 * the player is one tap from concrete RG tools and one tap from a human
 * support specialist. Pearl left-edge (the kit's emphasis color) keeps
 * it distinct from a neutral AI reply without using YES/NO semantics.
 */

import Link from "next/link";
import { BotAvatar } from "../BotMark";
import type { Lang } from "../types";

export function RgRedirectCard({ lang = "en" }: { lang?: Lang }) {
  const t =
    lang === "sw"
      ? {
          title: "Tunaweza kupunguza kasi pamoja.",
          body:
            "Ukihisi kucheza kunakuathiri, una zana za kuweka kikomo cha amana, kuweka kikomo cha muda wa kipindi, au kujiondoa kwa muda. Hatua yoyote unayoichagua, ni nzuri.",
          primary: "Fungua mipangilio ya kucheza kwa busara",
          secondary: "Ongea na msaada",
        }
      : {
          title: "We can slow things down together.",
          body:
            "If betting is starting to weigh on you, you can set a deposit limit, a session-time limit, or take a break. Any step you choose is a good one — and a support specialist can walk through it with you if you'd rather not do it alone.",
          primary: "Open Responsible Gambling settings",
          secondary: "Speak to support",
        };
  return (
    <div className="cm-row cm-row-ai">
      <BotAvatar size="sm" />
      <div
        className="cm-bubble-ai"
        style={{ padding: 0, background: "transparent", border: "none", maxWidth: "88%" }}
      >
        <div className="cm-rg-card" role="group" aria-label="Responsible gambling redirect">
          <div className="cm-rg-label">Responsible gambling · Kucheza kwa busara</div>
          <div className="cm-rg-title">{t.title}</div>
          <div className="cm-rg-body">{t.body}</div>
          <div className="cm-rg-actions">
            <Link href={"/profile/responsible-gambling" as never} className="cm-rg-primary">
              {t.primary}
            </Link>
            <Link href={"/help" as never} className="cm-rg-secondary">
              {t.secondary}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
