/**
 * ONE ROW OF THE AKAUNTI HUB — how a `HubRow` (`hub-rows.ts`) is drawn (the Vodacom plan S6, SJ-17; S6-PLAN WP5).
 *
 * Rendered on the server with the page's own dictionary; only the controls that act in the browser are client islands
 * — the Arifa count, the language, the card size and the Needle's drawer (and Tafuta's field, the kit Input: its row and
 * its form are this file's own server markup). Every row is one list item of its card, at least the 56px rung tall, and
 * a second line makes it taller rather than clipped.
 * ⛔ No helpline row since the owner's ruling of 2026-10-06 (docs/COMPLIANCE-DECISIONS.md); nothing here types a phone number.
 * ⛔ Every figure is neutral ink: gold is money that was earned, and a balance in a list of doors is not that.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Cash } from "@/components/ui/cash";
import { DotSeq } from "@/components/ui/dot-seq";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { NeedleControlsDrawer } from "@/components/layout/needle-drawer";
import { formatTzs, fill } from "@/lib/utils";
import { firstDateSentence, formatBreakEnd } from "@/lib/break-end";
import { keepConnectives, keepText } from "@/components/ui/keep-run";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_QUERY_LEN } from "@/lib/search/query";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { hubWord, type HubRow, type HubSearch, type HubViewer } from "@/components/journey/account/hub-rows";
import { UnreadRow } from "@/components/journey/account/unread-row";
import { LanguageRow } from "@/components/journey/account/language-row";
import { CardSizeRow } from "@/components/journey/account/card-size-row";

export function HubRowItem({ row, t, viewer, locale }: { row: HubRow; t: Dict; viewer: HubViewer; locale?: Locale }) {
  if (row.kind === "language") return <LanguageRow />;
  if (row.kind === "cardSize") return <CardSizeRow />;
  if (row.kind === "needle") {
    // The hub's own row (the drawer's `hub-row` trigger), not the account menu's in a padded item (round 3, 2026-10-09).
    return (
      <li>
        <NeedleControlsDrawer variant="hub-row" />
      </li>
    );
  }
  if (row.kind === "unread") {
    return <UnreadRow userId={viewer.signedIn ? viewer.userId : null} href={row.href} label={hubWord(t, row.label)} />;
  }
  if (row.kind === "search") return <SearchRow row={row} t={t} />;
  const Glyph = I[row.glyph];
  // Round 7 (2026-10-10, the owner's item 37): a label never ends a line on a connective — "Mapendekezo" / "ya Masoko",
  // never "Mapendekezo ya" / "Masoko" (`keepConnectives`; the words unchanged).
  const label = <span className="kp-hub__label">{keepConnectives(hubWord(t, row.label))}</span>;
  /* ⭐ R4-I (2026-10-09; edges E58, tile 092 · 026 059) · A RUNNING BREAK IS STATED ON ITS OWN ROW. "Pumzika" was offered
     during an active break with no word that one was running, or until when. Its second line is now the first sentence of
     the break's own approved paragraph, `rg.breakActive` — "Mapumziko yanaendelea hadi 9 Okt, 06:02." — its end said by
     the one formatter and kept one run; an exclusion states `rg.exclusionActive`'s on its own row. The row still lands on
     the break section, which carries the whole paragraph. */
  const running = viewer.signedIn && viewer.breakEnd && locale
    && ((row.id === "break" && !viewer.breakEnd.exclusion) || (row.id === "exclude" && viewer.breakEnd.exclusion))
    ? viewer.breakEnd : null;
  const statusTemplate = running ? firstDateSentence(running.exclusion ? t.rg.exclusionActive : t.rg.breakActive) : null;
  const statusDate = running && statusTemplate && locale ? formatBreakEnd(Date.parse(running.until), Date.now(), t.common.monthsShort, locale) : null;
  const status = statusTemplate && statusDate ? keepText(fill(statusTemplate, { date: statusDate }), [statusDate]) : null;
  return (
    <li>
      <Link href={row.href as never} className={row.extra === "proposals" && viewer.signedIn ? "kp-hub__row kp-hub__row--proposals" : "kp-hub__row"}>
        <span className="kp-hub__glyph" aria-hidden><Glyph s={20} /></span>
        <span className="kp-hub__text">
          {/* The programme's flag rides its label (WP12's tiles 124, 255, 297, 2026-10-08): beside it where both fit,
              under it where they do not — it no longer takes the label's width from the row and folds
              "Pendekeza na upate zawadi" in two at 390. `.kp-hub__head`. */}
          {/* Round 7 (R7-C, 2026-10-10; tiles 255 297 331): the flag's box a whole 18px (`kp-flag-xs`), and stacked under the
              label the pair centred in the row by its ink — the flag carries the label's air (`.kp-hub__head`, globals.css). */}
          {row.extra === "proposals" && viewer.signedIn ? (
            <span className="kp-hub__head">
              {label}
              <ProposalsStateBadge state={viewer.proposalsState} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" className="kp-flag-xs" />
            </span>
          ) : label}
          {row.sub && <HubSub text={hubWord(t, row.sub)} />}
          {status && <span className="kp-hub__sub" data-testid={`hub-status-${row.id}`}>{status}</span>}
        </span>
        {row.extra === "balance" && viewer.signedIn && viewer.balance !== null && (
          <Cash className="kp-hub__money">{formatTzs(viewer.balance)}</Cash>
        )}
        {/* R9-A4 (2026-10-11; tile 264): the chevron's ink ends on the row's end edge, where the card-size switch ends — it
            stood 6px inside it. Every row end of the hub does the same (`edge`, glyphs.tsx). */}
        <I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * A row's second line. One that names several things — "Maswali ya kawaida · Simu · Barua pepe" — is drawn as those
 * things, so it breaks only BETWEEN them and never on a dangling "·" (WP12's tiles 276, 277, 2026-10-08). The mechanism
 * is `DotSeq` (dot-seq.tsx) since round 3 (2026-10-09), when the legal header and the invite page needed it too. The
 * words are the dictionary's own, split at its own " · "; the dots are drawn, not read.
 */
function HubSub({ text }: { text: string }) {
  return <DotSeq text={text} className="kp-hub__sub" />;
}

/**
 * TAFUTA — the settings card's search (the Vodacom plan S7 WP9, S7-PLAN A20; SJ-6: "search lives in Akaunti").
 * ⭐ AT REST IT IS THE BOARD'S ROW (s4-8-akaunti): the search glyph, "Tafuta" and the chevron, drawn as every row here.
 * ⭐ IT OPENS IN PLACE, AS LUGHA DOES (`language-row.tsx`): a disclosure whose summary is the row, its chevron turned a
 * quarter by Lugha's own rule, and beneath it, in the flow, a GET form to the journey home: the kit Input (`q`) and the
 * kit Button on one line, on the inset Lugha's choices open on (`.kp-hub__form`). The home states the search (WP7).
 * ⭐ NO SCRIPT: a details element and a native GET form, both server markup, so it opens and sends with JavaScript off.
 * A send is a document load of the home, which the journey home answers.
 * ⛔ One field and one submit, nothing hidden: the address it builds is the home with `q` alone. ⛔ The field is a text
 *    field, never the search type: SearchBox is the product's one search box (`test:search-adoption`), and this field
 *    searches nothing here — it hands the words to the home, which reads them with the platform's grammar, capped as the
 *    home caps them (`MAX_QUERY_LEN`).
 */
function SearchRow({ row, t }: { row: HubSearch; t: Dict }) {
  const SearchGlyph = I[row.glyph];
  const label = hubWord(t, row.label);
  return (
    <li>
      <details className="kp-hub__find">
        <summary className="kp-hub__row">
          <span className="kp-hub__glyph" aria-hidden><SearchGlyph s={20} /></span>
          <span className="kp-hub__text"><span className="kp-hub__label">{keepConnectives(label)}</span></span>
          <I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />
        </summary>
        <form method="get" action={row.action} className="kp-hub__form">
          <Input
            name="q"
            aria-label={label}
            placeholder={hubWord(t, row.placeholder)}
            maxLength={MAX_QUERY_LEN}
            enterKeyHint="search"
            autoComplete="off"
            containerClassName="kp-hub__field"
          />
          <Button type="submit" variant="primary" size="md">{label}</Button>
        </form>
      </details>
    </li>
  );
}
