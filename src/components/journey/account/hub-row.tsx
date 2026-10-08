/**
 * ONE ROW OF THE AKAUNTI HUB — how a `HubRow` (`hub-rows.ts`) is drawn (the Vodacom plan S6, SJ-17; S6-PLAN WP5).
 *
 * Rendered on the server with the page's own dictionary; only the controls that act in the browser are client islands
 * — the Arifa count, the language, the card size and the Needle's drawer. Every row is one list item of its card, at
 * least the 56px rung tall, and a second line makes it taller rather than clipped.
 * ⛔ No helpline row since the owner's ruling of 2026-10-06 (docs/COMPLIANCE-DECISIONS.md); nothing here types a phone number.
 * ⛔ Every figure is neutral ink: gold is money that was earned, and a balance in a list of doors is not that.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Cash } from "@/components/ui/cash";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { NeedleControlsDrawer } from "@/components/layout/needle-drawer";
import { formatTzs } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import { hubWord, type HubRow, type HubViewer } from "@/components/journey/account/hub-rows";
import { UnreadRow } from "@/components/journey/account/unread-row";
import { LanguageRow } from "@/components/journey/account/language-row";
import { CardSizeRow } from "@/components/journey/account/card-size-row";

export function HubRowItem({ row, t, viewer }: { row: HubRow; t: Dict; viewer: HubViewer }) {
  if (row.kind === "language") return <LanguageRow />;
  if (row.kind === "cardSize") return <CardSizeRow />;
  if (row.kind === "needle") {
    return (
      <li className="kp-hub__needle">
        <NeedleControlsDrawer variant="menu-row" />
      </li>
    );
  }
  if (row.kind === "unread") {
    return <UnreadRow userId={viewer.signedIn ? viewer.userId : null} href={row.href} label={hubWord(t, row.label)} />;
  }
  const Glyph = I[row.glyph];
  const label = <span className="kp-hub__label">{hubWord(t, row.label)}</span>;
  return (
    <li>
      <Link href={row.href as never} className="kp-hub__row">
        <span className="kp-hub__glyph" aria-hidden><Glyph s={20} /></span>
        <span className="kp-hub__text">
          {/* The programme's flag rides its label (WP12's tiles 124, 255, 297, 2026-10-08): beside it where both fit,
              under it where they do not — it no longer takes the label's width from the row and folds
              "Pendekeza na upate zawadi" in two at 390. `.kp-hub__head`. */}
          {row.extra === "proposals" && viewer.signedIn ? (
            <span className="kp-hub__head">
              {label}
              <ProposalsStateBadge state={viewer.proposalsState} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
            </span>
          ) : label}
          {row.sub && <HubSub text={hubWord(t, row.sub)} />}
        </span>
        {row.extra === "balance" && viewer.signedIn && viewer.balance !== null && (
          <Cash className="kp-hub__money">{formatTzs(viewer.balance)}</Cash>
        )}
        <I.chevronRight s={18} className="kp-hub__chev" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * A row's second line. One that names several things — "Maswali ya kawaida · Simu · Barua pepe" — is drawn as those
 * things, so it breaks only BETWEEN them and never on a dangling "·" (WP12's tiles 276, 277, 2026-10-08;
 * `.kp-hub__seq`). The words are the dictionary's own, split at its own " · "; the dots are drawn, not read.
 */
function HubSub({ text }: { text: string }) {
  const parts = text.split(" · ");
  if (parts.length < 2) return <span className="kp-hub__sub">{text}</span>;
  return (
    <span className="kp-hub__sub kp-hub__seq">
      {parts.map((part, i) => (
        <span key={i} className="kp-hub__seq-item">
          {i > 0 && <span className="kp-hub__seq-dot" aria-hidden>·</span>}
          {part}
        </span>
      ))}
    </span>
  );
}
