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
  return (
    <li>
      <Link href={row.href as never} className="kp-hub__row">
        <span className="kp-hub__glyph" aria-hidden><Glyph s={20} /></span>
        <span className="kp-hub__text">
          <span className="kp-hub__label">{hubWord(t, row.label)}</span>
          {row.sub && <span className="kp-hub__sub">{hubWord(t, row.sub)}</span>}
        </span>
        {row.extra === "balance" && viewer.signedIn && viewer.balance !== null && (
          <Cash className="kp-hub__money">{formatTzs(viewer.balance)}</Cash>
        )}
        {row.extra === "proposals" && viewer.signedIn && (
          <ProposalsStateBadge state={viewer.proposalsState} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
        )}
        <I.chevronRight s={18} className="kp-hub__chev" aria-hidden />
      </Link>
    </li>
  );
}
